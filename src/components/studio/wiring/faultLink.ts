import { builtinRegistry } from "@/parts/builtin";
import type { PartRegistry } from "@/parts/registry";
import type { SimHost, StaticCheckResult } from "@/sim-host/host";
import { buildSimNetlist } from "@/sim-host";
import type { Finding } from "@/sim/faults/types";
import type { DiagnoseStore } from "@/studio/stores/diagnose";
import type { DocStore } from "@/studio/stores/doc";
import { createStore, type Store } from "@/studio/stores/select";

export type FaultsView = {
  findings: Finding[];
  skipped: StaticCheckResult["skipped"];
  errors: StaticCheckResult["errors"];
  checking: boolean;
  /** False while the worker is starting or has died. */
  ready: boolean;
};

export type CheckBlock = "sealed" | "running" | "worker";

/** The key of the `faults` namespace that says why Check is off. */
export const CHECK_BLOCK_TEXT = { sealed: "check.disabledSealed", running: "check.disabledRunning", worker: "check.disabledWorker" } as const;

/** Why Check cannot run now, or false. A sealed item comes first: its reason does not go away by waiting. */
export function checkBlock(sealed: boolean, view: Pick<FaultsView, "checking" | "ready">): false | CheckBlock {
  if (sealed) return "sealed";
  if (view.checking) return "running";
  return view.ready ? false : "worker";
}

export type Idle = { schedule(fn: () => void): void; cancel(): void };

export type FaultLinkDeps = {
  doc: DocStore;
  sim: Pick<SimHost, "staticCheck" | "onEvent" | "state">;
  diagnose: DiagnoseStore;
  reg?: Pick<PartRegistry, "get">;
  idle?: Idle;
};

export interface FaultLink {
  readonly store: Store<FaultsView>;
  /** Checks now. A sealed item that is not revealed is never checked, because the findings would name its cause. */
  check(): Promise<void>;
  dispose(): void;
}

const IDLE_TIMEOUT_MS = 200;

/** One pending task: a newer `schedule` drops the one before it. */
export function browserIdle(): Idle {
  let cancel = () => {};
  return {
    schedule(fn) {
      cancel();
      if (typeof requestIdleCallback === "function") {
        const handle = requestIdleCallback(fn, { timeout: IDLE_TIMEOUT_MS });
        cancel = () => cancelIdleCallback(handle);
      } else {
        const handle = setTimeout(fn, IDLE_TIMEOUT_MS);
        cancel = () => clearTimeout(handle);
      }
    },
    cancel: () => cancel(),
  };
}

export function linkFaults({ doc, sim, diagnose, reg = builtinRegistry(), idle = browserIdle() }: FaultLinkDeps): FaultLink {
  const store = createStore<FaultsView>({ findings: [], skipped: {}, errors: [], checking: false, ready: sim.state === "ready" });
  // A newer check makes the answer of an older one irrelevant.
  let generation = 0;

  async function check(): Promise<void> {
    idle.cancel();
    if (diagnose.isSealedUnrevealed()) return;
    const mine = ++generation;
    store.setState((s) => ({ ...s, checking: true }));
    const state = doc.getState().state;
    const { net } = buildSimNetlist(state, reg);
    const sources = Object.fromEntries(state.sources.map((s) => [s.path, s.content]));
    const result = await sim.staticCheck(net, sources);
    if (mine !== generation) return;
    const ran = result.note === undefined;
    store.setState((s) => ({
      findings: ran ? result.findings : s.findings,
      skipped: ran ? result.skipped : s.skipped,
      errors: ran ? result.errors : s.errors,
      checking: false,
      ready: sim.state === "ready",
    }));
  }

  const offDoc = doc.onChange(() => idle.schedule(() => void check()));
  const offSim = sim.onEvent((ev) => {
    if (ev.t !== "event" || ev.event.kind !== "findings") return;
    const { findings } = ev.event;
    store.setState((s) => ({ ...s, findings }));
    diagnose.setFindings(findings);
  });
  idle.schedule(() => void check());

  return {
    store,
    check,
    dispose() {
      generation++;
      idle.cancel();
      offDoc();
      offSim();
    },
  };
}
