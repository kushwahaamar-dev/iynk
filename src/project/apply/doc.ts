import type { Project } from "../generated/types.ts";
import { asBag, findById, pointer, reject, removeById, upsertBy, upsertById } from "./types.ts";
import type { ApplyContext, Handler, OpOf, Reject } from "./types.ts";

/** Access and actor ops come from an owner, or from the system acting for a request the server already checked. */
function requireOwner(state: Project, ctx: ApplyContext): Reject | null {
  if (ctx.author.kind === "system" || state.access.owners.includes(ctx.author.actor)) return null;
  return reject("permission", `${ctx.author.actor} is not an owner`);
}

const metaSet: Handler<"meta.set"> = (state, op) => {
  const before = asBag(state.meta);
  const meta = { ...before };
  const undo: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(op.set)) {
    undo[key] = before[key] ?? (key === "tags" ? [] : "");
    if (value === "" || (Array.isArray(value) && value.length === 0)) delete meta[key];
    else meta[key] = value;
  }
  return {
    state: { ...state, meta: meta as unknown as Project["meta"] },
    inverse: [{ k: "meta.set", set: undo }],
  };
};

const accessGrant: Handler<"access.grant"> = (state, op, ctx) => {
  const refused = requireOwner(state, ctx);
  if (refused) return refused;
  const previous = state.access.grants.find((grant) => grant.actor === op.actor);
  const grants = upsertBy(state.access.grants, (grant) => grant.actor, { actor: op.actor, role: op.role });
  return {
    state: { ...state, access: { ...state.access, grants } },
    inverse: [
      previous ? { k: "access.grant", actor: op.actor, role: previous.role } : { k: "access.revoke", actor: op.actor },
    ],
  };
};

const accessRevoke: Handler<"access.revoke"> = (state, op, ctx) => {
  const refused = requireOwner(state, ctx);
  if (refused) return refused;
  const { owners, grants } = state.access;
  if (owners.length === 1 && owners[0] === op.actor) return reject("invariant", "the last owner cannot be revoked");
  const previous = grants.find((grant) => grant.actor === op.actor);
  if (!previous) return reject("missing_target", `${op.actor} has no grant`);
  return {
    state: { ...state, access: { ...state.access, grants: grants.filter((grant) => grant !== previous) } },
    inverse: [{ k: "access.grant", actor: previous.actor, role: previous.role }],
  };
};

const accessSet: Handler<"access.set"> = (state, op, ctx) => {
  const refused = requireOwner(state, ctx);
  if (refused) return refused;
  const access = { ...state.access };
  const inverse: OpOf<"access.set"> = { k: "access.set" };
  if (op.visibility !== undefined) {
    inverse.visibility = access.visibility;
    access.visibility = op.visibility;
  }
  if (op.owners !== undefined) {
    inverse.owners = access.owners;
    access.owners = op.owners;
  }
  return { state: { ...state, access }, inverse: [inverse] };
};

const actorSet: Handler<"actor.set"> = (state, op, ctx) => {
  const refused = requireOwner(state, ctx);
  if (refused) return refused;
  const previous = findById(state.actors, op.actor.id);
  return {
    state: { ...state, actors: upsertById(state.actors, op.actor) as Project["actors"] },
    inverse: [previous ? { k: "actor.set", actor: previous } : { k: "actor.remove", id: op.actor.id }],
  };
};

const actorRemove: Handler<"actor.remove"> = (state, op, ctx) => {
  const refused = requireOwner(state, ctx);
  if (refused) return refused;
  const previous = findById(state.actors, op.id);
  if (!previous) return reject("missing_target", `${op.id} is not an actor`);
  const refs: string[] = [];
  state.access.owners.forEach((owner, i) => owner === op.id && refs.push(pointer("access", "owners", i)));
  state.access.grants.forEach((grant, i) => grant.actor === op.id && refs.push(pointer("access", "grants", i)));
  if (state.provenance.createdBy === op.id) refs.push(pointer("provenance", "createdBy"));
  state.provenance.contributors?.forEach(
    (entry, i) => entry.actor === op.id && refs.push(pointer("provenance", "contributors", i)),
  );
  state.history.checkpoints.forEach(
    (checkpoint, i) => checkpoint.author === op.id && refs.push(pointer("history", "checkpoints", i)),
  );
  if (refs.length > 0) return reject("referenced_by", `${op.id} is still named in the document`, refs);
  return {
    state: { ...state, actors: removeById(state.actors, op.id) as Project["actors"] },
    inverse: [{ k: "actor.set", actor: previous }],
  };
};

export const DOC_HANDLERS = {
  "meta.set": metaSet,
  "access.grant": accessGrant,
  "access.revoke": accessRevoke,
  "access.set": accessSet,
  "actor.set": actorSet,
  "actor.remove": actorRemove,
};
