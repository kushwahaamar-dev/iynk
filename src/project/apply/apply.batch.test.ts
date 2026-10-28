// @vitest-environment node
import { describe, expect, it } from "vitest";
import { diag } from "../../core/result.ts";
import type { Op } from "../generated/types.ts";
import { AT, accept, contentOf, ctxFor, deepFreeze, monitorAt140, refuse } from "./fixtures.testing.ts";
import { HANDLERS, IMPLEMENTED_KINDS, apply, applyBatch } from "./index.ts";

const base = () => deepFreeze(monitorAt140());
const rename = (title: string): Op => ({ k: "meta.set", set: { title } });

describe("applyBatch", () => {
  it("refuses an empty batch", () => {
    expect(refuse(base(), [], "malformed").message).toMatch(/at least one/);
  });

  it("takes 480 ops and refuses 481", () => {
    const ops = Array.from({ length: 481 }, (_, i) => rename(`t${i}`));
    expect(refuse(base(), ops, "malformed").message).toMatch(/at most 480/);
    expect(accept(base(), ops.slice(0, 480)).state.revision).toBe(620);
  });

  it("grows the revision by the op count and stamps the update time", () => {
    const out = accept(base(), [rename("a"), rename("b"), rename("c")]);
    expect(out.state.revision).toBe(143);
    expect(out.state.meta.updatedAt).toBe(AT);
    expect(out.state.meta.title).toBe("c");
  });

  it("never touches the history", () => {
    const state = base();
    expect(accept(state, [rename("a")]).state.history).toBe(state.history);
  });

  it("is an atomic step: a failing last op changes nothing", () => {
    const state = base();
    const before = JSON.stringify(state);
    const ops: Op[] = [rename("a"), { k: "access.set", visibility: "link" }, { k: "actor.remove", id: "usr_amar" }];
    refuse(state, ops, "referenced_by");
    expect(JSON.stringify(state)).toBe(before);
  });

  it("runs each op on the state the one before left", () => {
    const state = base();
    const out = accept(state, [
      { k: "actor.set", actor: { id: "usr_cara", name: "Cara" } },
      { k: "actor.remove", id: "usr_cara" },
    ]);
    expect(contentOf(out.state)).toEqual(contentOf(state));
  });

  it("returns the inverses in reverse op order, each list in its own order", () => {
    const state = base();
    const out = accept(state, [rename("A"), { k: "access.set", visibility: "link" }, rename("B")]);
    expect(out.inverse).toEqual([
      { k: "meta.set", set: { title: "A" } },
      { k: "access.set", visibility: "buddies" },
      { k: "meta.set", set: { title: "Environmental monitor" } },
    ]);
    const back = accept(out.state, out.inverse);
    expect(contentOf(back.state)).toEqual(contentOf(state));
    expect(back.state.revision).toBe(146);
  });

  it("answers a hook error with invariant and ignores warnings", () => {
    const error = () => [diag("V3-ACTOR", "error", "/access", "usr_x is not an actor")];
    const warning = () => [diag("V3-DEP-UNUSED", "warning", "/dependencies", "unused")];
    expect(refuse(base(), [rename("a")], "invariant", ctxFor(undefined, error)).message).toBe(
      "V3-ACTOR: usr_x is not an actor",
    );
    expect(accept(base(), [rename("a")], ctxFor(undefined, warning)).state.meta.title).toBe("a");
  });

  it("hands the hook the state before and after the batch", () => {
    const state = base();
    let seen: [string, string] | undefined;
    accept(
      state,
      [rename("a"), rename("b")],
      ctxFor(undefined, (next, prev) => {
        seen = [next.meta.title, prev.meta.title];
        return [];
      }),
    );
    expect(seen).toEqual(["b", "Environmental monitor"]);
  });

  it("answers an op over 65,536 bytes with quota, before the schema is consulted", () => {
    const huge = { k: "meta.set", set: { description: "x".repeat(70_000) } } as Op;
    refuse(base(), [huge], "quota");
  });

  it("answers a value with no canonical form with malformed", () => {
    refuse(base(), [{ k: "meta.set", set: { title: Number.NaN } } as unknown as Op], "malformed");
  });

  it("names the failing field of the op's own kind", () => {
    const op = { k: "actor.set", actor: { id: "usr_a", name: "A", keyThumbprint: "short" } } as Op;
    expect(refuse(base(), [op], "malformed").message).toContain("/actor/keyThumbprint");
  });

  it("refuses an unknown kind", () => {
    refuse(base(), [{ k: "net.explode" } as unknown as Op], "malformed");
  });

  it("refuses a kind that has no handler yet", () => {
    const candidates: Op[] = [
      { k: "net.delete", id: "net_x" },
      { k: "view.remove", id: "vw_x" },
      { k: "param.remove", id: "par_x" },
    ];
    const pending = candidates.find((op) => !IMPLEMENTED_KINDS.includes(op.k));
    if (!pending) return;
    expect(refuse(base(), [pending], "malformed").message).toBe(`op kind not implemented: ${pending.k}`);
  });

  it("registers the thirteen kinds of this task", () => {
    expect(IMPLEMENTED_KINDS).toEqual(
      expect.arrayContaining([
        "meta.set",
        "access.grant",
        "access.revoke",
        "access.set",
        "actor.set",
        "actor.remove",
        "board.add",
        "board.remove",
        "board.set",
        "component.add",
        "component.remove",
        "component.set",
        "component.swap",
      ]),
    );
    expect(Object.keys(HANDLERS).sort()).toEqual([...IMPLEMENTED_KINDS].sort());
  });
});

describe("apply", () => {
  it("is a batch of one", () => {
    const out = apply(base(), rename("solo"), ctxFor());
    expect(out.ok && out.state.revision).toBe(141);
  });
});
