// @vitest-environment node
import { describe, expect, it } from "vitest";
import { diag } from "../../core/result.ts";
import type { Op, Project } from "../generated/types.ts";
import { AT, accept, ctxFor, deepFreeze, monitorAt140, refuse, roundTrip } from "./fixtures.testing.ts";
import { applyBatch } from "./index.ts";
import type { ApplyContext } from "./types.ts";

const base = () => deepFreeze(monitorAt140());

/** A small stand-in for V3-ACTOR, which T-B2-08b supplies for real. */
const actorsKnown: ApplyContext["invariants"] = (next) => {
  const known = new Set(next.actors.map((actor) => actor.id));
  const named = [...next.access.owners, ...next.access.grants.map((grant) => grant.actor)];
  const missing = named.find((id) => !known.has(id));
  return missing === undefined ? [] : [diag("V3-ACTOR", "error", "/access", `${missing} is not in actors`)];
};

const withTemp = (): Project => {
  const state = monitorAt140();
  state.actors = [...state.actors, { id: "usr_temp", name: "Temp" }];
  return deepFreeze(state);
};

describe("meta.set", () => {
  it("merges the fields and undoes with the old values", () => {
    const state = base();
    const op: Op = { k: "meta.set", set: { title: "Weather box", kind: "template", tags: ["esp32"] } };
    const out = accept(state, [op]);
    expect(out.state.meta).toMatchObject({ title: "Weather box", kind: "template", tags: ["esp32"] });
    expect(out.state.meta.description).toBe(state.meta.description);
    expect(roundTrip(state, [op])).toEqual([
      { k: "meta.set", set: { title: "Environmental monitor", kind: "project", tags: state.meta.tags } },
    ]);
  });

  it("removes description and tags when they are emptied, and restores them", () => {
    const state = base();
    const op: Op = { k: "meta.set", set: { description: "", tags: [] } };
    const out = accept(state, [op]);
    expect("description" in out.state.meta).toBe(false);
    expect("tags" in out.state.meta).toBe(false);
    expect(roundTrip(state, [op])).toEqual([
      { k: "meta.set", set: { description: state.meta.description, tags: state.meta.tags } },
    ]);
  });

  it("undoes a first description with an empty one", () => {
    const state = accept(base(), [{ k: "meta.set", set: { description: "" } }]).state;
    expect(roundTrip(state, [{ k: "meta.set", set: { description: "Now there is one" } }])).toEqual([
      { k: "meta.set", set: { description: "" } },
    ]);
  });

  it("refuses an empty title", () => {
    refuse(base(), [{ k: "meta.set", set: { title: "" } }], "malformed");
  });
});

describe("permissions", () => {
  const ops: Op[] = [
    { k: "access.grant", actor: "usr_temp", role: "viewer" },
    { k: "access.revoke", actor: "usr_friend1" },
    { k: "access.set", visibility: "link" },
    { k: "actor.set", actor: { id: "usr_friend1", name: "Friend One" } },
    { k: "actor.remove", id: "usr_temp" },
  ];
  const owner = { actor: "usr_amar", kind: "user" } as const;
  const system = { actor: "usr_server", kind: "system" } as const;
  const editor = { actor: "usr_friend1", kind: "user" } as const;
  const stranger = { actor: "usr_stranger", kind: "user" } as const;

  it.each(ops.map((op) => [op.k, op] as const))("%s: an owner and the system may", (_kind, op) => {
    for (const author of [owner, system]) expect(applyBatch(withTemp(), [op], ctxFor(author)).ok).toBe(true);
  });

  it.each(ops.map((op) => [op.k, op] as const))("%s: an editor and a stranger may not", (_kind, op) => {
    for (const author of [editor, stranger]) {
      const state = withTemp();
      const refused = refuse(state, [op], "permission", ctxFor(author));
      expect(refused.message).toContain(author.actor);
    }
  });

  it("does not gate other kinds", () => {
    expect(applyBatch(base(), [{ k: "meta.set", set: { title: "Edited by a friend" } }], ctxFor(editor)).ok).toBe(true);
  });
});

describe("access.grant", () => {
  it("adds a grant in order, and undoes it with a revoke", () => {
    const state = withTemp();
    const op: Op = { k: "access.grant", actor: "usr_temp", role: "commenter" };
    expect(accept(state, [op]).state.access.grants).toEqual([
      { actor: "usr_friend1", role: "editor" },
      { actor: "usr_temp", role: "commenter" },
    ]);
    expect(roundTrip(state, [op])).toEqual([{ k: "access.revoke", actor: "usr_temp" }]);
  });

  it("changes a role, and undoes it with the old role", () => {
    const state = base();
    const op: Op = { k: "access.grant", actor: "usr_friend1", role: "viewer" };
    expect(roundTrip(state, [op])).toEqual([{ k: "access.grant", actor: "usr_friend1", role: "editor" }]);
  });

  it("needs the actor by the end of the batch, not before", () => {
    const state = base();
    const grant: Op = { k: "access.grant", actor: "usr_newcomer", role: "editor" };
    refuse(state, [grant], "invariant", ctxFor(undefined, actorsKnown));
    const joined = accept(
      state,
      [{ k: "actor.set", actor: { id: "usr_newcomer", name: "New" } }, grant],
      ctxFor(undefined, actorsKnown),
    );
    expect(joined.inverse).toEqual([
      { k: "access.revoke", actor: "usr_newcomer" },
      { k: "actor.remove", id: "usr_newcomer" },
    ]);
  });
});

describe("access.revoke", () => {
  it("removes the grant and undoes with it", () => {
    const state = base();
    const op: Op = { k: "access.revoke", actor: "usr_friend1" };
    expect(accept(state, [op]).state.access.grants).toEqual([]);
    expect(roundTrip(state, [op])).toEqual([{ k: "access.grant", actor: "usr_friend1", role: "editor" }]);
  });

  it("refuses a missing grant", () => {
    refuse(withTemp(), [{ k: "access.revoke", actor: "usr_temp" }], "missing_target");
  });

  it("refuses to strip the last owner", () => {
    expect(refuse(base(), [{ k: "access.revoke", actor: "usr_amar" }], "invariant").message).toMatch(/last owner/);
  });
});

describe("access.set", () => {
  it("sets visibility and owners and undoes both", () => {
    const state = base();
    const op: Op = { k: "access.set", visibility: "link", owners: ["usr_amar", "usr_friend1"] };
    const out = accept(state, [op], ctxFor(undefined, actorsKnown));
    expect(out.state.access).toMatchObject({ visibility: "link", owners: ["usr_amar", "usr_friend1"] });
    expect(roundTrip(state, [op])).toEqual([{ k: "access.set", visibility: "buddies", owners: ["usr_amar"] }]);
  });

  it("undoes only the field it touched", () => {
    expect(roundTrip(base(), [{ k: "access.set", visibility: "private" }])).toEqual([
      { k: "access.set", visibility: "buddies" },
    ]);
  });

  it("refuses an owner who is not an actor", () => {
    refuse(base(), [{ k: "access.set", owners: ["usr_ghost"] }], "invariant", ctxFor(undefined, actorsKnown));
  });

  it("refuses an empty owner list", () => {
    refuse(base(), [{ k: "access.set", owners: [] as unknown as ["usr_x"] }], "malformed");
  });
});

describe("actor.set and actor.remove", () => {
  it("adds an actor and undoes with a remove", () => {
    const state = base();
    const op: Op = { k: "actor.set", actor: { id: "usr_cara", name: "Cara" } };
    expect(accept(state, [op]).state.actors.map((actor) => actor.id)).toEqual(["usr_amar", "usr_cara", "usr_friend1"]);
    expect(roundTrip(state, [op])).toEqual([{ k: "actor.remove", id: "usr_cara" }]);
  });

  it("renames an actor and undoes with the old record", () => {
    const state = base();
    const op: Op = { k: "actor.set", actor: { id: "usr_friend1", name: "Friend One", keyThumbprint: "A".repeat(43) } };
    expect(roundTrip(state, [op])).toEqual([{ k: "actor.set", actor: { id: "usr_friend1", name: "Friend 1" } }]);
  });

  it("removes an actor nothing names, and undoes with the record", () => {
    const state = withTemp();
    expect(roundTrip(state, [{ k: "actor.remove", id: "usr_temp" }])).toEqual([
      { k: "actor.set", actor: { id: "usr_temp", name: "Temp" } },
    ]);
  });

  it("refuses a missing actor", () => {
    refuse(base(), [{ k: "actor.remove", id: "usr_ghost" }], "missing_target");
  });

  it("lists every referrer of an actor", () => {
    expect(refuse(base(), [{ k: "actor.remove", id: "usr_friend1" }], "referenced_by").refs).toEqual([
      "/access/grants/0",
      "/provenance/contributors/1",
    ]);
    expect(refuse(base(), [{ k: "actor.remove", id: "usr_amar" }], "referenced_by").refs).toEqual([
      "/access/owners/0",
      "/provenance/createdBy",
      "/provenance/contributors/0",
      "/history/checkpoints/0",
    ]);
  });
});

describe("a rejected op", () => {
  it("leaves the revision and the update time alone", () => {
    const state = base();
    const refused = applyBatch(state, [{ k: "actor.remove", id: "usr_amar" }], ctxFor());
    expect(refused.ok).toBe(false);
    expect(state.revision).toBe(140);
    expect(state.meta.updatedAt).not.toBe(AT);
  });
});
