import type { Op } from "../../project/generated/types.ts";
import type { Reject } from "../../project/apply/types.ts";
import { dryRun } from "./dryrun.ts";
import type { DryRunDeps } from "./dryrun.ts";
import type { ClockPort, LogPort, ProjectPort, ProposalStore } from "./ports.ts";
import { checkStale } from "./stale.ts";
import type { StaleVerdict } from "./stale.ts";
import type { DryRunReport, ProposalRecord, ProposeOpsArgs, RejectCode } from "./types.ts";

export interface AcceptSelection {
  stepIds: string[];
  /** Ids of the risk 2 steps the person ticked. */
  confirmed: string[];
  anyway: boolean;
  /** The `diffHash` of the card the person is looking at. */
  shownDiffHash: string;
}

export type AcceptResult =
  | { ok: true; state: "accepted" | "partial"; revision: number; batch: string }
  | { ok: false; reason: "stale"; verdict: Extract<StaleVerdict, { kind: "stale" }> }
  | { ok: false; reason: "refreshed"; report: DryRunReport }
  | { ok: false; reason: "needs_confirm"; stepIds: string[] }
  | { ok: false; reason: "failing" }
  | { ok: false; reason: "apply_rejected"; reject: Reject }
  | { ok: false; reason: "bad_selection"; message: string };

export interface AcceptDeps {
  project: ProjectPort;
  dry: DryRunDeps;
  store: ProposalStore;
  clock: ClockPort;
  log: LogPort;
  touchedOf(op: Op): string[];
}

/** The picked steps plus everything they depend on, transitively, in the original order. */
export function withDependencies(
  args: ProposeOpsArgs,
  picked: readonly string[],
): { stepIds: string[]; added: string[] } {
  const byId = new Map(args.steps.map((step) => [step.id, step]));
  const wanted = new Set<string>();
  const visit = (id: string): void => {
    if (wanted.has(id)) return;
    wanted.add(id);
    byId.get(id)?.dependsOn?.forEach(visit);
  };
  picked.forEach(visit);
  const stepIds = args.steps.filter((step) => wanted.has(step.id)).map((step) => step.id);
  return { stepIds, added: stepIds.filter((id) => !picked.includes(id)) };
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

const refuse = (code: RejectCode, message: string): AcceptResult => ({
  ok: false,
  reason: "apply_rejected",
  reject: { code, message },
});

export async function acceptProposal(
  rec: ProposalRecord,
  sel: AcceptSelection,
  deps: AcceptDeps,
): Promise<AcceptResult> {
  const { proposal } = rec;
  const bad = (message: string): AcceptResult => ({ ok: false, reason: "bad_selection", message });
  if (rec.state !== "open") return bad(`the proposal is ${rec.state}, not open`);
  if (sel.stepIds.length === 0) return bad("pick at least one step");
  const known = new Set(proposal.steps.map((step) => step.id));
  const unknown = sel.stepIds.filter((id) => !known.has(id));
  if (unknown.length > 0) return bad(`unknown steps: ${unknown.join(", ")}`);

  const args = argsOf(rec);
  const { stepIds } = withDependencies(args, sel.stepIds);
  const unconfirmed = stepIds.filter((id) => rec.stepMeta[id]?.risk === 2 && !sel.confirmed.includes(id));
  if (unconfirmed.length > 0) return { ok: false, reason: "needs_confirm", stepIds: unconfirmed };

  const role = deps.project.role();
  if (role !== "owner" && role !== "editor") return refuse("permission", `a ${role} cannot apply changes`);

  const verdict = checkStale(rec, deps.project, deps.touchedOf);
  if (verdict.kind === "stale") {
    const stale: ProposalRecord = { ...rec, state: "stale", proposal: { ...proposal, status: "stale" } };
    await deps.store.put(stale);
    deps.log.record({
      kind: "proposal.stale",
      proposal: proposal.id,
      data: { reason: verdict.reason, at: verdict.at },
    });
    return { ok: false, reason: "stale", verdict };
  }

  const { revision } = deps.project.snapshot();
  const whole = stepIds.length === args.steps.length;
  const report =
    whole && rec.dryRun?.atRevision === revision && revision === proposal.base
      ? rec.dryRun
      : await dryRun(args, deps.dry, { stepIds });
  if (!report.ok) {
    const [first] = report.rejects;
    // A dry run that fails at P6 carries the code the apply refused with.
    return { ok: false, reason: "apply_rejected", reject: { code: first.code as RejectCode, message: first.message } };
  }
  if (report.diffHash !== sel.shownDiffHash) {
    await deps.store.put({ ...rec, dryRun: report });
    deps.log.record({ kind: "proposal.refreshed", proposal: proposal.id, data: { revision } });
    return { ok: false, reason: "refreshed", report };
  }
  if (report.failing && !sel.anyway) return { ok: false, reason: "failing" };

  const actor = deps.project.actor();
  const picked = args.steps.filter((step) => stepIds.includes(step.id));
  const committed = deps.project.commit({
    id: proposal.id,
    ops: picked.flatMap((step) => step.ops),
    author: { actor, kind: "ai", proposal: proposal.id, model: rec.model },
    label: picked.map((step) => step.label).join(", "),
  });
  if (!committed.ok) return refuse(committed.reject, committed.message);

  const state = whole ? "accepted" : "partial";
  await deps.store.put({
    ...rec,
    state,
    proposal: { ...proposal, status: state },
    dryRun: report,
    decidedAt: deps.clock.now(),
    decision: {
      accepted: stepIds,
      rejected: args.steps.map((step) => step.id).filter((id) => !stepIds.includes(id)),
      by: actor,
    },
  });
  deps.log.record({
    kind: state === "accepted" ? "proposal.accepted" : "proposal.partial",
    proposal: proposal.id,
    data: { steps: stepIds.length, revision: committed.revision },
  });
  return { ok: true, state, revision: committed.revision, batch: proposal.id };
}

/** Only the last thing done to the document can be taken back from the card. */
export function undoAccept(
  project: Pick<ProjectPort, "undo">,
  rec: ProposalRecord,
  top: { batch?: string } | undefined,
): { ok: true } | { ok: false; reason: "not_last" } {
  if (top?.batch !== rec.proposal.id || !project.undo().ok) return { ok: false, reason: "not_last" };
  return { ok: true };
}
