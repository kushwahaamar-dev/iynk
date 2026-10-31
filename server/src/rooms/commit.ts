import { apply as applyOp } from "../../../src/project/apply/index.ts";
import type { Op, OpEnvelope, Project } from "../../../src/project/generated/types.ts";
import { chainNext } from "../../../src/project/hash.ts";
import { checkBatch } from "../../../src/project/semantic.ts";
import type { RejectCode, Submit } from "../../../src/protocol/frames.ts";
import type { CommitWrite as RepoWrite, MemberRow, RoomRole } from "../store/rooms.ts";
import { authorizeOp } from "./permissions.ts";
import type { Subject } from "./permissions.ts";

export type CommitWrite = { write: RepoWrite; envs: OpEnvelope[] };

export type BatchInput = Pick<Submit, "batch" | "ops">;

export type BatchReject = { code: RejectCode; index?: number; rule?: string; message: string };

export type BatchResult =
  | { ok: true; doc: Project; envs: OpEnvelope[]; chains: string[]; inverse: Op[] }
  | { ok: false; reject: BatchReject };

export type BatchOrigin = "client" | "server";

const PROPOSAL = /^prp_/;
const ACCESS_KINDS: ReadonlySet<string> = new Set(["access.grant", "access.revoke", "access.set", "actor.remove"]);

const refuse = (code: RejectCode, message: string, index?: number, rule?: string): BatchResult => ({
  ok: false,
  reject: { code, message, ...(index === undefined ? {} : { index }), ...(rule === undefined ? {} : { rule }) },
});

export function applyBatch(
  doc: Project,
  subject: Subject,
  f: BatchInput,
  base: { seq: number; chain: string },
  now: Date,
  hasBlob: (sha256: string) => boolean,
  origin: BatchOrigin = "client",
  apply: typeof applyOp = applyOp,
): BatchResult {
  const at = now.toISOString();
  const first = f.ops[0];
  const batch = f.batch ?? (f.ops.length > 1 ? first?.opId : undefined);
  const envs: OpEnvelope[] = [];
  const inverses: Op[][] = [];
  let working = doc;
  const chains: string[] = [];

  for (const [index, item] of f.ops.entries()) {
    const op = item.op as Op;
    const kind = origin === "server" ? "system" : (item.kind ?? "user");
    const verdict = authorizeOp(subject, op.k, origin);
    if (!verdict.ok) return refuse(verdict.code, `${subject.role} may not apply ${op.k}`, index);
    if (kind === "ai" && !PROPOSAL.test(item.proposal ?? "")) {
      return refuse("malformed", "an ai op needs a proposal id", index);
    }
    if (op.k === "asset.add" && !hasBlob(op.asset.sha256)) {
      return refuse("missing_target", `asset ${op.asset.id} has not been uploaded`, index, "asset-not-uploaded");
    }

    const author: OpEnvelope["author"] = { actor: subject.actor, kind };
    if (kind === "ai" && item.proposal !== undefined) author.proposal = item.proposal;
    const outcome = apply(working, op, { author, at });
    if (!outcome.ok) return refuse(outcome.reject.code, outcome.reject.message, index);

    working = outcome.state;
    inverses.push(outcome.inverse);
    const env: OpEnvelope = { opId: item.opId, seq: base.seq + index + 1, base: item.base, author, at, op };
    if (batch !== undefined) env.batch = batch;
    chains.push(chainNext(chains[index - 1] ?? base.chain, env));
    envs.push(env);
  }

  const broken = checkBatch(working, doc).find((diagnostic) => diagnostic.severity === "error");
  if (broken) return refuse("invariant", `${broken.code}: ${broken.message}`);

  return { ok: true, doc: working, envs, chains, inverse: inverses.reverse().flat() };
}

export function roleIn(doc: Project, actor: string): RoomRole | null {
  if (doc.access.owners.includes(actor)) return "owner";
  return doc.access.grants.find((grant) => grant.actor === actor)?.role ?? null;
}

function actorsTouched(envs: readonly OpEnvelope[], before: Project): Set<string> {
  const actors = new Set<string>();
  for (const { op } of envs) {
    if (!ACCESS_KINDS.has(op.k)) continue;
    if (op.k === "access.grant" || op.k === "access.revoke") actors.add(op.actor);
    else if (op.k === "actor.remove") actors.add(op.id);
    else if (op.k === "access.set" && op.owners) {
      for (const owner of [...before.access.owners, ...op.owners]) actors.add(owner);
    }
  }
  return actors;
}

/** The member rows an `access.*` or `actor.remove` batch changes, read from the document it produced. */
export function aclFor(before: Project, after: Project, envs: readonly OpEnvelope[], members: readonly MemberRow[]): NonNullable<RepoWrite["acl"]> {
  const touched = actorsTouched(envs, before);
  const patches: NonNullable<RepoWrite["acl"]> = [];
  for (const member of members) {
    if (!touched.has(member.actor)) continue;
    const role = roleIn(after, member.actor);
    if (role === null) patches.push({ device: member.device_id, remove: true });
    else if (role !== member.role) patches.push({ device: member.device_id, patch: { role } });
  }
  return patches;
}

export const touchesAccess = (envs: readonly OpEnvelope[]): boolean => envs.some(({ op }) => ACCESS_KINDS.has(op.k));
