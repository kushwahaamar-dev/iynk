import { describe, expect, it, vi } from "vitest";
import { createSessionStore } from "./session.ts";
import type { Selectable } from "./session.ts";

const part = (id: string): Selectable => ({ kind: "part", view: "vw_bb", id });

describe("SessionStore", () => {
  it("starts on the select tool with nothing selected", () => {
    expect(createSessionStore("vw_bb").getState()).toMatchObject({ tool: "select", selection: [], viewId: "vw_bb", status: null });
  });

  it("ignores a hover that equals the current one", () => {
    const store = createSessionStore("vw_bb");
    store.setHover({ kind: "pin", c: "cmp_a", p: "1" });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setHover({ kind: "pin", c: "cmp_a", p: "1" });
    expect(listener).not.toHaveBeenCalled();
  });

  it("drops selected items that no longer exist and reports the count left", () => {
    const store = createSessionStore("vw_bb");
    store.setSelection([part("cmp_a"), part("cmp_b"), part("cmp_c")]);
    const removed = store.pruneSelection((item) => item.id !== "cmp_b");
    expect(removed).toBe(1);
    expect(store.getState().selection.map((s) => s.id)).toEqual(["cmp_a", "cmp_c"]);
    expect(store.getState().status).toEqual({ key: "selection.pruned", params: { count: 2 } });
  });

  it("leaves the selection and status alone when everything still exists", () => {
    const store = createSessionStore("vw_bb");
    store.setSelection([part("cmp_a")]);
    const before = store.getState();
    expect(store.pruneSelection(() => true)).toBe(0);
    expect(store.getState()).toBe(before);
  });
});
