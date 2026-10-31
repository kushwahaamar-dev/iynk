// @vitest-environment node
import { describe, expect, it } from "vitest";
import { accept, loadExample } from "./apply/fixtures.testing.ts";
import type { Op } from "./generated/types.ts";
import { lessonSession, USER } from "./session.testing.ts";
import { computeTouched } from "./touched.ts";
import type { DocChange } from "./touched.ts";

const lesson = () => loadExample("lesson-uno-r3-button");

const touchedBy = (ops: Op[]) => {
  const before = lesson();
  return computeTouched(before, accept(before, ops).state);
};

describe("computeTouched", () => {
  it("is empty for the same state", () => {
    const state = lesson();
    const touched = computeTouched(state, state);
    expect(Object.values(touched).every((set) => set.size === 0)).toBe(true);
  });

  it("touches one component for a component change", () => {
    const touched = touchedBy([{ k: "component.set", id: "cmp_res1", set: { label: "Limit" } }]);
    expect([...touched.components]).toEqual(["cmp_res1"]);
    expect(touched.nets.size + touched.wires.size + touched.views.size + touched.sources.size).toBe(0);
  });

  it("touches the component, its nets and its view when it is removed", () => {
    const touched = touchedBy([{ k: "component.remove", id: "cmp_led1" }]);
    expect(touched.components.has("cmp_led1")).toBe(true);
    expect(touched.nets.has("net_gnd")).toBe(true);
    expect(touched.nets.has("net_led1a_res2p2")).toBe(true);
    expect(touched.views.has("vw_bb")).toBe(true);
    expect(touched.components.has("cmp_res2")).toBe(false);
    expect(touched.nets.has("net_5v")).toBe(false);
  });

  it("counts a board as a component", () => {
    const touched = touchedBy([{ k: "board.set", id: "brd_uno", set: { label: "Main" } }]);
    expect([...touched.components]).toEqual(["brd_uno"]);
  });

  it("touches an added wire", () => {
    const touched = touchedBy([
      {
        k: "wire.add",
        view: "vw_bb",
        wire: {
          id: "wir_new",
          net: "net_5v",
          from: { kind: "pin", c: "brd_uno", p: "P5V" },
          to: { kind: "hole", hole: "a9", surface: "cmp_bb1" },
        },
      },
    ]);
    expect([...touched.wires]).toEqual(["wir_new"]);
  });

  it("touches a source", () => {
    const state = lesson();
    const id = state.sources[0]!.id;
    const touched = computeTouched(state, accept(state, [{ k: "source.rename", id, path: "renamed.ino" }]).state);
    expect([...touched.sources]).toEqual([id]);
  });
});

describe("DocChange", () => {
  it("has the revisions, the ops, the touched ids and the origin", () => {
    const session = lessonSession();
    const seen: DocChange[] = [];
    session.subscribe((change) => seen.push(change));
    const op: Op = { k: "component.set", id: "cmp_res1", set: { label: "Limit" } };
    session.apply(op, USER);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ from: 0, to: 1, ops: [op], origin: "local" });
    expect([...seen[0]!.touched.components]).toEqual(["cmp_res1"]);
  });
});
