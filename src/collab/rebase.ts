import type { Actor, ErrorCode, Reject, RejectCode } from "../protocol/index.ts";
import type { Op, OpEnvelope, Project } from "../project/generated/types.ts";
import type { PendingSub } from "./queue.ts";

export type Author = OpEnvelope["author"];

export type ApplyReject = { code: RejectCode; message: string };

/** The shape of `apply` the client needs; only the project session may import the real one (FA-01), so it is passed in. */
export type ApplyFn = (
  state: Project,
  op: Op,
  ctx: { author: Author; at: string },
) => { ok: true; state: Project; inverse: Op[] } | { ok: false; reject: ApplyReject };

export type DropReason = {
  code: ErrorCode;
  rule?: string;
  byActor: Actor | null;
  targetId: string | null;
  index: number;
};

export type RebaseReport = {
  dropped: { sub: number; reason: DropReason; ops: Op[] }[];
  at: number;
  /** The local view just before the replay; "Keep a copy" forks this. An immutable reference, so no copy is made. */
  localBefore: Project;
};

export type SubOutcome = { ok: true; state: Project } | { ok: false; reject: ApplyReject; index: number };

const REMOVAL = /\.(remove|unplace|delete)$/;
/** Refusals that another member's committed op can explain; the rest come from the server's own rules. */
const CAUSED_BY_AN_OP: ReadonlySet<ErrorCode> = new Set([
  "missing_target",
  "duplicate_id",
  "missing_pin",
  "pin_in_use",
  "unknown_definition",
  "missing_pin_map",
  "referenced_by",
]);
const TARGET_KEYS = ["id", "c", "view"] as const;

function targetOf(op: Op | undefined): string | null {
  if (!op) return null;
  const bag = op as Record<string, unknown>;
  for (const key of TARGET_KEYS) {
    const value = bag[key];
    if (typeof value === "string") return value;
  }
  return null;
}

function mentions(value: unknown, id: string, depth: number): boolean {
  if (value === id) return true;
  if (depth === 0 || typeof value !== "object" || value === null) return false;
  return Object.values(value).some((inner) => mentions(inner, id, depth - 1));
}

/** The author of the newest committed op that explains the refusal: for a missing target, the one that removed it. */
function causeOf(code: ErrorCode, targetId: string | null, tail: readonly OpEnvelope[]): Actor | null {
  if (targetId === null || !CAUSED_BY_AN_OP.has(code)) return null;
  for (let i = tail.length - 1; i >= 0; i--) {
    const env = tail[i]!;
    if (code === "missing_target" && !REMOVAL.test(env.op.k)) continue;
    if (mentions(env.op, targetId, 2)) return env.author.actor as Actor;
  }
  return null;
}

export function explainReject(rej: Reject, sub: PendingSub, tail: readonly OpEnvelope[]): DropReason {
  const index = rej.index ?? 0;
  const targetId = targetOf(sub.ops[index]?.op);
  return {
    code: rej.code,
    ...(rej.rule !== undefined && { rule: rej.rule }),
    byActor: causeOf(rej.code, targetId, tail),
    targetId,
    index,
  };
}

/** Applies a submission as one step: every op lands, or the state is untouched. */
export function applySub(state: Project, sub: PendingSub, applyFn: ApplyFn, ctx: { author: Author; at: string }): SubOutcome {
  let working = state;
  for (const [index, { op }] of sub.ops.entries()) {
    const result = applyFn(working, op, ctx);
    if (!result.ok) return { ok: false, reject: result.reject, index };
    working = result.state;
  }
  return { ok: true, state: working };
}

export function rebuildView(
  confirmed: Project,
  pending: readonly PendingSub[],
  applyFn: ApplyFn,
  authorOf: (sub: PendingSub) => Author,
  at: string,
): { view: Project; locallyInvalid: { sub: PendingSub; reject: ApplyReject; index: number }[] } {
  let view = confirmed;
  const locallyInvalid: { sub: PendingSub; reject: ApplyReject; index: number }[] = [];
  for (const sub of pending) {
    const outcome = applySub(view, sub, applyFn, { author: authorOf(sub), at });
    if (outcome.ok) view = outcome.state;
    else locallyInvalid.push({ sub, reject: outcome.reject, index: outcome.index });
  }
  return { view, locallyInvalid };
}
