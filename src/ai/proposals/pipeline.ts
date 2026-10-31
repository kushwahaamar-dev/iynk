import type { RandomSource } from "../../core/ids.ts";
import type { Op, Project, Proposal } from "../../project/generated/types.ts";
import type { AiClient } from "../adapters/types.ts";
import type { TurnDeps, TurnEvent, TurnInput } from "../host/turn.ts";
import type { Ladder } from "../hints.ts";
import type { Mode } from "../modes.ts";
import { ladderBlock } from "../hints.ts";
import { createProposalHook } from "../tools/ops.ts";
import type { ProposalHook } from "../tools/ops.ts";
import { checkScaffold, problemsForModel } from "../tools/scaffold.ts";
import { acceptProposal } from "./accept.ts";
import type { AcceptResult } from "./accept.ts";
import { dryRun } from "./dryrun.ts";
import type { DryRunDeps } from "./dryrun.ts";
import { emptyDiff, hashDiff } from "./diffsummary.ts";
import { InvalidCounter, explainOnlyInstruction, gate } from "./guard.ts";
import type { GateInput, GateResult } from "./guard.ts";
import type { ClockPort, HintPort, LogPort, ProjectPort, ProposalStore } from "./ports.ts";
import { newProposalId, checkStatic } from "./propose.ts";
import type { StaticCtx } from "./propose.ts";
import { captureBaseSources, checkStale, sourceSpansOf } from "./stale.ts";
import type {
  DryRunReport,
  OpGroup,
  ProposalRecord,
  ProposeOpsArgs,
  SourceSpan,
  StageReject,
  TaintInfo,
} from "./types.ts";

const MAX_RESULT_MESSAGE = 500;
const MAX_FAILING_LINES = 6;
const WHOLE_FILE_END = 1_000_000;

export interface PipelineTurn {
  threadId: string;
  mode: Mode;
  provider: string;
  model: string;
  promptVersion: string;
  contextHash: string;
  packRevision: number;
  loaded: ReadonlySet<OpGroup>;
  readSet: { id: string; rev: number }[];
  taint: TaintInfo;
  gate: Omit<GateInput, "role" | "sealedOpen" | "mode">;
  messageId: string;
}

export interface PipelineDeps {
  project: ProjectPort;
  dry: DryRunDeps;
  store: ProposalStore;
  clock: ClockPort;
  rand: RandomSource;
  log: LogPort;
  hint: HintPort;
  static: Omit<StaticCtx, "mode" | "loaded" | "role" | "sealedOpen">;
  /** One counter per message, keyed by `PipelineTurn.messageId`. */
  counters: Map<string, InvalidCounter>;
  touchedOf(op: Op): string[];
}

/** Held in memory until the person confirms a proposal made after reading outside text. */
export interface PendingProposal {
  record: ProposalRecord;
  report: DryRunReport;
}

/** Feedback for the model that is not a stage reject: failing checks and scaffold problems. */
export interface Note {
  code: string;
  message: string;
}

export type PipelineOutcome =
  | { kind: "card"; record: ProposalRecord }
  | { kind: "repair"; rejects: StageReject[]; notes: Note[]; attempt: 1 | 2 }
  | { kind: "explain_only"; instruction: string }
  | { kind: "needs_taint_confirm"; pending: PendingProposal }
  | { kind: "no_change" }
  | { kind: "not_offered"; reason: string };

interface Entry {
  origin: ProposalRecord["origin"];
  base: number;
  author: Proposal["author"];
  taint: TaintInfo;
  /** False for a proposal from a peer: the ladder and the click gates belong to the person's own partner. */
  gated: boolean;
}

function counterFor(turn: PipelineTurn, deps: PipelineDeps, key: string): InvalidCounter {
  const id = `${turn.messageId}${key}`;
  let counter = deps.counters.get(id);
  if (!counter) {
    counter = new InvalidCounter();
    deps.counters.set(id, counter);
  }
  return counter;
}

export function offerFor(turn: PipelineTurn, deps: PipelineDeps): GateResult {
  const sealedOpen = deps.hint.sealedItems().some((item) => !item.revealed);
  return gate({ ...turn.gate, mode: turn.mode, role: deps.project.role(), sealedOpen });
}

/** For a caller that has already asked `offerFor`. */
export function staticContext(turn: PipelineTurn, deps: PipelineDeps): StaticCtx {
  return {
    ...deps.static,
    mode: turn.mode,
    loaded: turn.loaded,
    role: deps.project.role(),
    sealedOpen: deps.hint.sealedItems().some((item) => !item.revealed),
    offered: true,
  };
}

const needsConfirm = (turn: PipelineTurn): boolean => turn.taint.classes.includes("X") && !turn.gate.taintConfirmed;

function failingLines(report: DryRunReport): string[] {
  const lines: string[] = [];
  if (report.compile && "ok" in report.compile && !report.compile.ok) {
    lines.push(...report.compile.messages.slice(0, 3).map((message) => `compile: ${message}`));
  }
  for (const finding of report.rules?.added ?? []) {
    if (finding.severity === "error") lines.push(`rule ${finding.ruleId}: ${finding.text}`);
  }
  for (const test of report.tests ?? []) {
    if (test.before === "pass" && test.after === "fail") lines.push(`test ${test.id} passed before and fails now`);
  }
  return lines.slice(0, MAX_FAILING_LINES);
}

function sourceBase(ops: readonly Op[], state: Project, atBase: boolean) {
  const text = (id: string) => state.sources.find((source) => source.id === id)?.content;
  if (atBase) return { spans: sourceSpansOf(ops, text), baseSources: captureBaseSources(ops, text) };
  // The project moved while the model was thinking: the text it saw is gone, so any later edit of the file counts as overlap.
  const ids = [...new Set(ops.flatMap((op) => (op.k === "source.edit" ? [op.id] : [])))];
  const spans: SourceSpan[] = ids.map((sourceId) => ({ sourceId, fromLine: 1, toLine: WHOLE_FILE_END }));
  return { spans, baseSources: null };
}

/** Stores the new record first, so a failed write never leaves the thread without its open proposal. */
async function persist(record: ProposalRecord, deps: PipelineDeps): Promise<void> {
  const earlier = await deps.store.list(record.projectId);
  await deps.store.put(record);
  for (const old of earlier) {
    if (old.threadId !== record.threadId || old.proposal.id === record.proposal.id) continue;
    if (old.state !== "open" && old.state !== "stale") continue;
    await deps.store.put({ ...old, state: "superseded", proposal: { ...old.proposal, status: "superseded" } });
  }
}

async function open(
  draft: ProposalRecord,
  report: DryRunReport,
  deps: PipelineDeps,
  counter?: InvalidCounter,
): Promise<PipelineOutcome> {
  const record: ProposalRecord = {
    ...draft,
    state: "open",
    proposal: { ...draft.proposal, status: "open" },
    dryRun: report,
  };
  await persist(record, deps).catch(() =>
    deps.log.record({ kind: "proposal.persist_failed", proposal: record.proposal.id, data: {} }),
  );
  counter?.onOpen();
  deps.log.record({
    kind: "proposal.open",
    proposal: record.proposal.id,
    data: { diffHash: report.diffHash, failing: report.failing },
  });
  return { kind: "card", record };
}

async function run(raw: unknown, turn: PipelineTurn, deps: PipelineDeps, entry: Entry): Promise<PipelineOutcome> {
  const id = newProposalId(deps.rand);
  const counter = counterFor(turn, deps, "");
  const peer = entry.origin === "peer";

  const reject = (rejects: StageReject[], notes: Note[] = []): PipelineOutcome => {
    if (peer) return { kind: "repair", rejects, notes, attempt: 1 };
    const next = counter.onInvalid();
    const first = rejects[0];
    deps.log.record({
      kind: "proposal.invalid",
      proposal: id,
      data: { stage: first?.stage ?? "P7", code: first?.code ?? notes[0]?.code ?? "unknown", retry: counter.count },
    });
    if (next.action === "explain_only") {
      deps.log.record({ kind: "proposal.explain_only", proposal: id, data: { rejects: rejects.length + notes.length } });
      return { kind: "explain_only", instruction: explainOnlyInstruction(rejects) };
    }
    return { kind: "repair", rejects, notes, attempt: next.attempt };
  };

  if (entry.gated) {
    const verdict = offerFor(turn, deps);
    if (!verdict.offer) return { kind: "not_offered", reason: verdict.reason };
  }

  const checked = checkStatic(raw, staticContext(turn, deps));
  if (!checked.ok) return reject(checked.rejects);
  const { args, stepRisk } = checked;
  const ops = args.steps.flatMap((step) => step.ops);

  const { state, revision } = deps.project.snapshot();
  const { spans, baseSources } = sourceBase(ops, state, revision === entry.base);
  const steps = args.steps.map(({ id: stepId, label, ops: stepOps, dependsOn }) => ({
    id: stepId,
    label,
    ops: stepOps,
    ...(dependsOn ? { dependsOn } : {}),
  }));
  const draft: ProposalRecord = {
    proposal: {
      id,
      base: entry.base,
      author: entry.author,
      rationale: args.rationale,
      status: "draft",
      promptVersion: turn.promptVersion,
      contextHash: turn.contextHash,
      steps: steps as Proposal["steps"],
    },
    projectId: state.id,
    state: "draft",
    stepMeta: Object.fromEntries(args.steps.map((step) => [step.id, { risk: stepRisk[step.id]!, confirmed: false }])),
    threadId: turn.threadId,
    mode: turn.mode,
    provider: turn.provider,
    model: turn.model,
    origin: entry.origin,
    readSet: turn.readSet,
    touched: [...new Set(ops.flatMap(deps.touchedOf))],
    sourceSpans: spans,
    baseSources,
    taint: entry.taint,
    retries: 0,
    createdAt: deps.clock.now(),
  };
  deps.log.record({
    kind: "proposal.created",
    proposal: id,
    data: { mode: turn.mode, steps: args.steps.length, ops: ops.length, risk: Math.max(...Object.values(stepRisk)) },
  });

  const verdict = checkStale(draft, deps.project, deps.touchedOf);
  if (verdict.kind === "stale") {
    return reject([
      {
        stage: "P6",
        code: "stale_base",
        message: `the project changed at revision ${verdict.at} in what this touches; read it again and propose on the current project`,
      },
    ]);
  }

  const report = await dryRun(args, deps.dry);
  if (!report.ok) return reject(report.rejects);
  if (report.diffHash === hashDiff(emptyDiff(), deps.dry.sha256)) return { kind: "no_change" };

  if (args.kind === "scaffold") {
    const scaffold = checkScaffold(args, stepRisk, report);
    if (!scaffold.ok) return reject([], [{ code: "scaffold", message: problemsForModel(scaffold) }]);
  }

  const checks = counterFor(turn, deps, ":checks");
  if (report.failing && !peer && checks.count === 0 && counter.count < 2) {
    checks.onInvalid();
    const retry = counter.count + checks.count;
    deps.log.record({ kind: "proposal.invalid", proposal: id, data: { stage: "P7", code: "checks_failed", retry } });
    return {
      kind: "repair",
      rejects: [],
      notes: [{ code: "checks_failed", message: `the checks fail after this change: ${failingLines(report).join("; ")}` }],
      attempt: retry === 1 ? 1 : 2,
    };
  }
  draft.retries = Math.min(counter.count + checks.count, 2) as 0 | 1 | 2;

  if (needsConfirm(turn)) return { kind: "needs_taint_confirm", pending: { record: draft, report } };
  return open(draft, report, deps, counter);
}

export function handleProposeOps(raw: unknown, turn: PipelineTurn, deps: PipelineDeps): Promise<PipelineOutcome> {
  return run(raw, turn, deps, {
    origin: "model",
    base: turn.packRevision,
    author: { actor: deps.project.actor(), model: turn.model },
    taint: turn.taint,
    gated: true,
  });
}

export function confirmTainted(p: PendingProposal, deps: PipelineDeps): Promise<PipelineOutcome> {
  return open(p.record, p.report, deps);
}

/** A proposal that arrives from outside, such as a buddy's. It runs the same stages and never gets a repair round. */
export function ingestProposal(p: Proposal, turn: PipelineTurn, deps: PipelineDeps): Promise<PipelineOutcome> {
  const raw: ProposeOpsArgs = {
    title: "Proposal from a buddy",
    kind: "explore",
    rationale: typeof p.rationale === "string" && p.rationale !== "" ? p.rationale.slice(0, 600) : "From a buddy",
    steps: p.steps.map((step) => ({ ...step, label: step.label ?? step.id })),
  };
  return run(raw, turn, deps, {
    origin: "peer",
    base: p.base,
    author: p.author,
    taint: { classes: ["X"], sources: turn.taint.sources },
    gated: false,
  });
}

const describe = (r: StageReject): Note => {
  const at = r.stepId === undefined ? "" : `${r.stepId}${r.opIndex === undefined ? "" : `#${r.opIndex}`}: `;
  const near = r.nearest && r.nearest.length > 0 ? ` Nearest: ${r.nearest.join(", ")}.` : "";
  return { code: r.code, message: `${at}${r.message}${near}` };
};

const NOT_OFFERED: Record<string, string> = {
  role: "permission",
  sealed_item: "sealed_item",
};

/** What the model sees. Never the ops, the rationale or the labels. */
export function toolResultFor(o: PipelineOutcome): {
  ok: boolean;
  error?: { code: string; message: string };
  shown?: boolean;
  note?: string;
} {
  switch (o.kind) {
    case "card":
      return { ok: true, shown: true, note: "The person sees the proposal as a card. Say in a sentence what it does; do not repeat the ops." };
    case "needs_taint_confirm":
      return { ok: true, shown: false, note: "The person is asked to confirm first, because this turn read text from outside the project." };
    case "no_change":
      return { ok: false, error: { code: "no_change", message: "These ops change nothing in the project. Check the current state and propose something that does." } };
    case "explain_only":
      return { ok: false, error: { code: "explain_only", message: o.instruction } };
    case "not_offered":
      return { ok: false, error: { code: NOT_OFFERED[o.reason] ?? "mode_blocked", message: `Proposals are not available now (${o.reason}). Explain in words instead.` } };
    case "repair": {
      const all = [...o.rejects.map(describe), ...o.notes];
      const first = all[0] ?? { code: "bad_args", message: "" };
      const text = all.map((n) => `${n.code}: ${n.message}`).join(" | ");
      const message = `Attempt ${o.attempt} of 2. ${text}`;
      return { ok: false, error: { code: first.code, message: message.slice(0, MAX_RESULT_MESSAGE) } };
    }
  }
}

export interface EvalReply {
  text: string;
  toolCalls?: { name: string; args: unknown }[];
}

export interface EvalHost {
  newSession(project: Project): { session: ProjectPort; stateHash(): string };
  runTurn(args: {
    mode: Mode;
    ladder: Ladder;
    userText: string;
    client: AiClient;
    xTaint?: boolean;
    fixIt?: boolean;
  }): Promise<{ reply: EvalReply; text: string; flags: string[]; proposal?: ProposalRecord; outcome?: PipelineOutcome }>;
  decide(rec: ProposalRecord, action: "accept" | "reject"): Promise<AcceptResult | { ok: true }>;
}

export interface EvalSession {
  project: ProjectPort;
  dry: DryRunDeps;
  stateHash(): string;
}

/** The wiring a test side supplies: sessions over a project, and turn dependencies over a session. */
export interface EvalExtras {
  openSession(project: Project): EvalSession;
  turnDeps(c: { session: EvalSession; client: AiClient; hook: ProposalHook; threadId: string }): TurnDeps;
  /** Passed in so this file does not import the turn engine, which imports the tool registry that imports the tools here. */
  runTurn(d: TurnDeps, i: TurnInput): AsyncGenerator<TurnEvent>;
  identity: { provider: string; model: string; promptVersion: string; threadId: string };
}

const parseArgs = (json: string): unknown => {
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
};

export function createEvalHost(deps: PipelineDeps & EvalExtras): EvalHost {
  let current: EvalSession | null = null;
  let messages = 0;
  const session = (): EvalSession => {
    if (!current) throw new Error("call newSession before runTurn");
    return current;
  };
  const pipelineDeps = (): PipelineDeps => ({ ...deps, project: session().project, dry: session().dry });

  return {
    newSession(project) {
      current = deps.openSession(project);
      deps.counters.clear();
      return { session: current.project, stateHash: current.stateHash };
    },

    async runTurn({ mode, ladder, userText, client, xTaint = false, fixIt = false }) {
      const s = session();
      const d = pipelineDeps();
      const messageId = `eval-${++messages}`;
      const loaded = new Set<OpGroup>(["core"]);
      const topic = d.hint.sealedItems()[0];
      const level = ladder.level(topic ? { kind: "fault", faultId: topic.faultId } : { kind: "concept", label: "eval" });
      const taint: TaintInfo = { classes: xTaint ? ["X"] : [], sources: xTaint ? ["eval"] : [] };
      const base = { showMe: level === 3, fixIt, applyIt: false, xTaint, taintConfirmed: false, ladderLevel: level };
      let contextHash = "";
      let outcome: PipelineOutcome | undefined;

      const startRevision = s.project.snapshot().revision;
      const teaching = mode === "socratic" || mode === "beginner";
      const hook = createProposalHook({
        deps: d,
        turn: () => ({
          ...deps.identity,
          mode,
          contextHash,
          packRevision: startRevision,
          loaded,
          readSet: [],
          taint,
          gate: base,
          messageId,
        }),
        loaded,
        onOutcome: (o) => void (outcome = o),
        ladderBlock: () => (teaching ? ladderBlock(level) : ""),
      });

      let text = "";
      let flags: string[] = [];
      const toolCalls: { name: string; args: unknown }[] = [];
      const turnDeps = deps.turnDeps({ session: s, client, hook, threadId: deps.identity.threadId });
      const input: TurnInput = { mode, text: userText, thread: [], signal: new AbortController().signal };
      for await (const ev of deps.runTurn(turnDeps, input)) {
        if (ev.t === "pack") contextHash = ev.pack.hash8;
        else if (ev.t === "text") text += ev.delta;
        else if (ev.t === "tool") toolCalls.push({ name: ev.record.name, args: parseArgs(ev.record.argsText) });
        else if (ev.t === "done") flags = ev.turn.flags;
        else if (ev.t === "error") throw ev.error;
      }
      return {
        reply: { text, ...(toolCalls.length > 0 ? { toolCalls } : {}) },
        text,
        flags,
        ...(outcome ? { outcome } : {}),
        ...(outcome?.kind === "card" ? { proposal: outcome.record } : {}),
      };
    },

    async decide(rec, action) {
      const d = pipelineDeps();
      const stepIds = rec.proposal.steps.map((step) => step.id);
      if (action === "accept") {
        return acceptProposal(
          rec,
          {
            stepIds,
            confirmed: stepIds.filter((stepId) => rec.stepMeta[stepId]?.risk === 2),
            anyway: rec.dryRun?.failing ?? false,
            shownDiffHash: rec.dryRun?.diffHash ?? "",
          },
          { project: d.project, dry: d.dry, store: d.store, clock: d.clock, log: d.log, touchedOf: d.touchedOf },
        );
      }
      await d.store.put({
        ...rec,
        state: "rejected",
        proposal: { ...rec.proposal, status: "rejected" },
        decidedAt: d.clock.now(),
        decision: { accepted: [], rejected: stepIds, reason: "person", by: d.project.actor() },
      });
      d.log.record({ kind: "proposal.rejected", proposal: rec.proposal.id, data: { steps: stepIds.length } });
      return { ok: true };
    },
  };
}
