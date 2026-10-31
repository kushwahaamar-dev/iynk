import type { Evidence } from "../../project/diagnosis.ts";
import type { Fault, Op } from "../../project/generated/types.ts";
import {
  reduce,
  startSession,
  type DiagnoseAction,
  type DiagnoseSession,
  type PickRecord,
  type Effect,
} from "../../sim/faults/diagnose.ts";
import type { DiagnoseSpec } from "../../sim/faults/seal.ts";
import type { CauseId, Finding, RunFacts } from "../../sim/faults/types.ts";
import { createStore } from "./select.ts";
import type { Store } from "./select.ts";

/** Structural, so the `EventLog` of `src/local/events.ts` is assignable without this file importing it. */
export interface EventSink {
  append(kind: string, payload: Record<string, unknown>): Promise<void>;
}

export interface DiagnoseState {
  session: DiagnoseSession | null;
  findings: Finding[];
  lastRun: RunFacts | null;
  lastRemedy: { id: string; correct: boolean } | null;
  /** The validator message of the last fix that was refused. */
  error: string | null;
}

export interface DiagnoseStore extends Store<DiagnoseState> {
  start(item: { spec: DiagnoseSpec; projectId: string }): void;
  /** Runs the reducer, then carries out the effects it returns. */
  dispatch(a: DiagnoseAction): void;
  /** A pick of one option, stamped with the clock. */
  pick(cause: CauseId, confidence?: PickRecord["confidence"]): void;
  note(e: Evidence): void;
  /** Hands over the results of a finished run; a fix that makes the answer's finding disappear closes the item. */
  setFindings(f: Finding[], run?: RunFacts): void;
  /** Disables the hidden fault when the remedy is the right one. The next run decides whether the symptom is gone. */
  chooseRemedy(id: string): void;
  isSealedUnrevealed(): boolean;
}

export interface DiagnoseDeps {
  log: EventSink;
  setReadOnly(reason: "diagnose" | null): void;
  clock(): number;
  applyOps(ops: Op[]): { ok: true } | { ok: false; message: string };
  fault(id: string): Fault | undefined;
}

/** The keys the local event log accepts for each kind. */
const LOGGED_KEYS: Record<string, readonly string[]> = {
  "hint.open": ["level", "via"],
  "diagnose.answer": ["cause_id", "correct", "confidence"],
  reveal: [],
};

const EMPTY: DiagnoseState = { session: null, findings: [], lastRun: null, lastRemedy: null, error: null };

function logged(kind: string, payload: Record<string, unknown>, projectId: string): Record<string, unknown> {
  const allowed = LOGGED_KEYS[kind] ?? [];
  return { projectId, ...Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.includes(key))) };
}

export function createDiagnoseStore(deps: DiagnoseDeps): DiagnoseStore {
  const store = createStore<DiagnoseState>(EMPTY);

  const send = (kind: string, payload: Record<string, unknown>) => {
    deps.log.append(kind, payload).catch(() => {});
  };

  function carryOut(effects: Effect[], projectId: string) {
    for (const effect of effects) {
      switch (effect.t) {
        case "event":
          send(effect.kind, logged(effect.kind, effect.payload, projectId));
          break;
        case "lockEdits":
          deps.setReadOnly("diagnose");
          break;
        case "unlockEdits":
          deps.setReadOnly(null);
          break;
        case "record":
          send("diagnosis.record", { projectId, diagnosis: effect.diagnosis, outcome: effect.outcome });
          break;
        // revealCause: the reduced session already has causeVisible set, and readers ask isSealedUnrevealed.
      }
    }
  }

  function dispatch(a: DiagnoseAction) {
    const { session } = store.getState();
    if (session === null) return;
    const next = reduce(session, a);
    store.setState((s) => ({ ...s, session: next.session }));
    carryOut(next.effects, session.projectId);
  }

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    start({ spec, projectId }) {
      store.setState({ ...EMPTY, session: startSession(spec, projectId) });
      deps.setReadOnly(spec.kind === "built-wrong" ? "diagnose" : null);
    },
    dispatch,
    pick(cause, confidence) {
      dispatch({ t: "pick", cause, atMs: deps.clock(), ...(confidence && { confidence }) });
    },
    note(evidence) {
      dispatch({ t: "note", evidence });
    },
    setFindings(findings, run) {
      if (store.getState().session === null) return;
      dispatch({ t: "run" });
      store.setState((s) => ({ ...s, findings, lastRun: run ?? s.lastRun }));
      const { session } = store.getState();
      if (session === null || findings.some((f) => f.causeId === session.spec.answer.cause_id)) return;
      dispatch(session.state === "revealed" ? { t: "applyFixAfterReveal" } : { t: "cleared", symptomCleared: true });
    },
    chooseRemedy(id) {
      const { session } = store.getState();
      const remedy = session?.spec.remedies?.find((r) => r.id === id);
      if (session === null || remedy === undefined || session.state !== "fixing") return;
      store.setState((s) => ({ ...s, lastRemedy: { id, correct: remedy.correct }, error: null }));
      const target = session.spec.answer.fault;
      const fault = target === undefined ? undefined : deps.fault(target);
      if (!remedy.correct || fault === undefined) return;
      const result = deps.applyOps([{ k: "fault.set", fault: { ...fault, enabled: false } }]);
      if (!result.ok) store.setState((s) => ({ ...s, error: result.message }));
    },
    isSealedUnrevealed() {
      const { session } = store.getState();
      return session !== null && session.state !== "verified" && session.state !== "revealed";
    },
  };
}
