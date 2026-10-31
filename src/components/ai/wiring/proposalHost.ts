import { acceptProposal, undoAccept, withDependencies } from "@/ai/proposals/accept";
import type { AcceptResult, AcceptSelection } from "@/ai/proposals/accept";
import { dryRun } from "@/ai/proposals/dryrun";
import { confirmTainted } from "@/ai/proposals/pipeline";
import type { PendingProposal, PipelineDeps, PipelineOutcome } from "@/ai/proposals/pipeline";
import type { ClockPort, ProposalStore } from "@/ai/proposals/ports";
import { parseRecord } from "@/ai/proposals/propose";
import { checkStale } from "@/ai/proposals/stale";
import type { DryRunReport, ProposalRecord, ProposeOpsArgs } from "@/ai/proposals/types";
import type { AiT } from "@/ai/messages";
import { PROPOSAL_LIMITS, type Retention } from "@/ai/retention";
import type { createProposalRows } from "@/local/proposals";
import { validateProposal } from "@/project/generated/validate.mjs";
import type { DocStore } from "@/studio/stores/doc";

const WATCH_DEBOUNCE_MS = 300;
const WATCHED_RECORDS = 3;

export interface ProposalView {
  record: ProposalRecord;
  report?: DryRunReport;
  notice: "refreshed" | "stale" | null;
  /** The revision the project has moved to since the proposal was made, when none of it overlaps. */
  changedSince: number | null;
  undoable: boolean;
  pendingTaint: boolean;
}

export interface ProposalHost {
  list(threadId: string): readonly ProposalView[];
  subscribe(l: () => void): () => void;
  accept(id: string, sel: AcceptSelection): Promise<AcceptResult>;
  reject(id: string): Promise<void>;
  undo(id: string): { ok: boolean };
  redoRequest(id: string): void;
  confirmTaint(id: string): Promise<void>;
  preview(id: string, stepIds: string[]): Promise<DryRunReport>;
  /** The turn's tool hook reports here, so a new card or a taint question shows without a reload. */
  onOutcome(outcome: PipelineOutcome): void;
  dispose(): void;
}

export interface ProposalHostDeps {
  doc: DocStore;
  pipeline: PipelineDeps;
  appendNote(text: string): void;
  /** Sends a normal user message in the open thread. */
  send(text: string): void;
  t: AiT;
  clock: ClockPort;
  retention(): Retention;
}

type Rows = ReturnType<typeof createProposalRows>;

/** The `ProposalStore` port over the local rows. A row that fails the shape check is not a proposal and is left out. */
export function createProposalStore(rows: Rows): ProposalStore {
  const parse = (body: unknown) => parseRecord(body, validateProposal);
  return {
    put: (record) =>
      rows.put({
        id: record.proposal.id,
        projectId: record.projectId,
        state: record.state,
        createdAt: record.createdAt,
        ...(record.decidedAt === undefined ? {} : { decidedAt: record.decidedAt }),
        body: record,
      }),
    get: async (projectId, id) => parse((await rows.get(projectId, id))?.body) ?? undefined,
    list: async (projectId) => (await rows.list(projectId)).flatMap((row) => parse(row.body) ?? []),
    remove: (projectId, id) => rows.remove(projectId, id),
    sweep: (projectId, now, retention) => rows.sweep(projectId, now, retention, PROPOSAL_LIMITS),
  };
}

const joinIds = (ids: readonly string[]): string =>
  ids.length < 2 ? ids.join("") : `${ids.slice(0, -1).join(", ")} and ${ids[ids.length - 1]}`;

/** What the model hears next turn. It is keyed by the proposal id so the model can tell which one was decided. */
export function proposalNote(rec: ProposalRecord): string {
  const id = rec.proposal.id;
  if (rec.state === "rejected") return `[The learner rejected your proposal ${id}.]`;
  const accepted = rec.decision?.accepted ?? [];
  const steps = accepted.length === 1 ? "step" : "steps";
  return `[The learner accepted your proposal ${id}, ${steps} ${joinIds(accepted)}.]`;
}

/** The record keeps no title or kind, and the dry run reads neither. */
function argsOf({ proposal }: ProposalRecord): ProposeOpsArgs {
  return {
    title: proposal.id,
    kind: "fix",
    rationale: typeof proposal.rationale === "string" ? proposal.rationale : "",
    steps: proposal.steps.map((step) => ({ ...step, label: step.label ?? step.id })),
  };
}

const live = (rec: ProposalRecord): boolean => rec.state === "open" || rec.state === "stale";

interface Entry {
  record: ProposalRecord;
  report?: DryRunReport;
  notice: ProposalView["notice"];
  changedSince: number | null;
}

export function createProposalHost(d: ProposalHostDeps): ProposalHost {
  const { doc, pipeline } = d;
  const { store } = pipeline;
  const entries = new Map<string, Entry>();
  const pending = new Map<string, PendingProposal>();
  const previews = new Map<string, number>();
  const listeners = new Set<() => void>();
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const changed = () => {
    for (const listener of [...listeners]) listener();
  };

  const projectId = () => pipeline.project.snapshot().state.id;

  function adopt(record: ProposalRecord, report: DryRunReport | undefined = record.dryRun) {
    const kept = entries.get(record.proposal.id);
    entries.set(record.proposal.id, {
      record,
      report: kept?.report ?? report,
      notice: record.state === "stale" ? "stale" : null,
      changedSince: kept?.changedSince ?? null,
    });
  }

  /** Writes a decided record; the card stays correct even when the store is down. */
  async function write(record: ProposalRecord): Promise<void> {
    adopt(record);
    await store.put(record).catch(() => pipeline.log.record({ kind: "proposal.persist_failed", proposal: record.proposal.id, data: {} }));
  }

  async function load(): Promise<void> {
    const id = projectId();
    await store.sweep(id, d.clock.now(), d.retention()).catch(() => 0);
    const records = await store.list(id).catch(() => []);
    if (disposed) return;
    for (const record of records) if (!entries.has(record.proposal.id)) adopt(record);
    changed();
  }

  function watch() {
    const open = [...entries.values()]
      .filter((entry) => entry.record.state === "open")
      .sort((a, b) => b.record.createdAt - a.record.createdAt)
      .slice(0, WATCHED_RECORDS);
    for (const entry of open) {
      const verdict = checkStale(entry.record, pipeline.project, pipeline.touchedOf);
      if (verdict.kind === "stale") {
        pipeline.log.record({ kind: "proposal.stale", proposal: entry.record.proposal.id, data: { reason: verdict.reason, at: verdict.at } });
        void write({ ...entry.record, state: "stale", proposal: { ...entry.record.proposal, status: "stale" } });
      } else if (verdict.kind === "moved") {
        entries.set(entry.record.proposal.id, { ...entry, changedSince: verdict.since });
      } else {
        entries.set(entry.record.proposal.id, { ...entry, changedSince: null });
      }
    }
    if (open.length > 0) changed();
  }

  // The undo button follows the top of the undo stack, which moves with every edit.
  const stopDoc = doc.onChange(() => {
    clearTimeout(timer);
    timer = setTimeout(watch, WATCH_DEBOUNCE_MS);
  });
  void load();

  const undoable = (record: ProposalRecord): boolean =>
    (record.state === "accepted" || record.state === "partial") && doc.session.undoStackTop()?.batch === record.proposal.id;

  function entryOf(id: string): Entry {
    const entry = entries.get(id);
    if (!entry) throw new Error(`unknown proposal ${id}`);
    return entry;
  }

  return {
    list(threadId) {
      const views: ProposalView[] = [...entries.values()]
        .filter((entry) => entry.record.threadId === threadId)
        .map((entry) => ({ ...entry, undoable: undoable(entry.record), pendingTaint: false }));
      for (const held of pending.values()) {
        if (held.record.threadId === threadId) {
          views.push({ record: held.record, report: held.report, notice: null, changedSince: null, undoable: false, pendingTaint: true });
        }
      }
      return views.sort((a, b) => b.record.createdAt - a.record.createdAt);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async accept(id, sel) {
      const entry = entryOf(id);
      const result = await acceptProposal(entry.record, sel, {
        project: pipeline.project,
        dry: pipeline.dry,
        store,
        clock: pipeline.clock,
        log: pipeline.log,
        touchedOf: pipeline.touchedOf,
      });
      if (result.ok) {
        const saved = await store.get(entry.record.projectId, id).catch(() => undefined);
        if (saved) {
          entries.set(id, { record: saved, report: saved.dryRun, notice: null, changedSince: null });
          d.appendNote(proposalNote(saved));
        }
      } else if (result.reason === "stale") {
        adopt({ ...entry.record, state: "stale", proposal: { ...entry.record.proposal, status: "stale" } });
      } else if (result.reason === "refreshed") {
        entries.set(id, { ...entry, record: { ...entry.record, dryRun: result.report }, report: result.report, notice: "refreshed", changedSince: null });
      }
      changed();
      return result;
    },

    async reject(id) {
      const { record } = entryOf(id);
      if (!live(record)) return;
      const ids = record.proposal.steps.map((step) => step.id);
      const decided: ProposalRecord = {
        ...record,
        state: "rejected",
        proposal: { ...record.proposal, status: "rejected" },
        decidedAt: d.clock.now(),
        decision: { accepted: [], rejected: ids, reason: "person", by: pipeline.project.actor() },
      };
      pipeline.log.record({ kind: "proposal.rejected", proposal: id, data: { steps: ids.length } });
      await write(decided);
      d.appendNote(proposalNote(decided));
      changed();
    },

    undo(id) {
      const { record } = entryOf(id);
      const outcome = undoAccept(pipeline.project, record, doc.session.undoStackTop());
      changed();
      return { ok: outcome.ok };
    },

    redoRequest(id) {
      entryOf(id);
      d.send(d.t("proposal.redo"));
    },

    async confirmTaint(id) {
      const held = pending.get(id);
      if (!held) return;
      pending.delete(id);
      const outcome = await confirmTainted(held, pipeline);
      if (outcome.kind === "card") adopt(outcome.record);
      changed();
    },

    async preview(id, stepIds) {
      const entry = entryOf(id);
      const ticket = (previews.get(id) ?? 0) + 1;
      previews.set(id, ticket);
      const { stepIds: wanted } = withDependencies(argsOf(entry.record), stepIds);
      const report = await dryRun(argsOf(entry.record), pipeline.dry, { stepIds: wanted });
      if (previews.get(id) === ticket) {
        entries.set(id, { ...entryOf(id), report, notice: null });
        changed();
      }
      return report;
    },

    onOutcome(outcome) {
      if (outcome.kind === "card") {
        adopt(outcome.record);
      } else if (outcome.kind === "needs_taint_confirm") {
        pending.set(outcome.pending.record.proposal.id, outcome.pending);
      } else return;
      changed();
    },

    dispose() {
      disposed = true;
      clearTimeout(timer);
      stopDoc();
      listeners.clear();
    },
  };
}
