// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Group, Op, Project, View } from "../generated/types.ts";
import { blink, drawnBlink, expectValid, viewOf } from "./drawn.testing.ts";
import { accept, deepFreeze, refuse, roundTrip } from "./fixtures.testing.ts";

const second: View = { id: "vw_two", kind: "schematic", name: "Second", placements: [], wires: [] };

const bb2: Op = {
  k: "component.add",
  component: { id: "cmp_bb2", definition: { ref: "core.breadboard-half", version: "1.0.0" }, refdes: "BB2" },
};

describe("view.add", () => {
  it("adds a view in order and undoes with a remove", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "view.add", view: second };
    expect(accept(state, [op]).state.views.map((v) => v.id)).toEqual(["vw_bb", "vw_sch", "vw_two"]);
    expect(roundTrip(state, [op])).toEqual([{ k: "view.remove", id: "vw_two" }]);
  });

  it("takes a breadboard view whose surface is a surface", () => {
    const op: Op = { k: "view.add", view: { ...second, kind: "breadboard", surface: "cmp_bb1" } };
    roundTrip(deepFreeze(blink()), [op]);
  });

  it("refuses a surface that is not one, a surface on another kind, an id in use and a 17th view", () => {
    const state = deepFreeze(blink());
    const breadboard = { ...second, kind: "breadboard" } as const;
    refuse(state, [{ k: "view.add", view: { ...breadboard, surface: "cmp_led1" } }], "unknown_definition");
    refuse(state, [{ k: "view.add", view: { ...breadboard, surface: "cmp_none" } }], "missing_target");
    refuse(state, [{ k: "view.add", view: { ...second, surface: "cmp_bb1" } }], "invariant");
    refuse(state, [{ k: "view.add", view: { ...second, id: "vw_bb" } }], "duplicate_id");
    const full = blink();
    full.views = Array.from({ length: 16 }, (_, i) => ({ ...second, id: `vw_v${i}` }));
    refuse(deepFreeze(full), [{ k: "view.add", view: second }], "quota");
  });
});

describe("view.remove", () => {
  it("deletes the drawing and the inverse draws it again, groups included", () => {
    const state = deepFreeze(drawnBlink());
    const sch = viewOf(state, "vw_sch");
    const op: Op = { k: "view.remove", id: "vw_sch" };
    const out = accept(state, [op]);
    expect(out.state.views.map((v) => v.id)).toEqual(["vw_bb"]);
    expect(out.inverse).toEqual([
      { k: "view.add", view: { id: "vw_sch", kind: "schematic", name: sch.name, placements: [], wires: [] } },
      ...sch.placements.map((placement): Op => ({ k: "view.place", view: "vw_sch", placement })),
      { k: "junction.add", view: "vw_sch", junction: sch.junctions?.[0] },
      { k: "label.set", view: "vw_sch", label: sch.labels?.[0] },
      ...sch.wires.map((wire): Op => ({ k: "wire.add", view: "vw_sch", wire })),
      ...(sch.groups ?? []).map((group): Op => ({ k: "group.set", view: "vw_sch", group })),
    ]);
    expectValid(out.inverse);
    roundTrip(state, [op]);
  });

  it("keeps the surface and the legs of a breadboard view", () => {
    const state = deepFreeze(blink());
    const out = accept(state, [{ k: "view.remove", id: "vw_bb" }]);
    expect(out.inverse[0]).toMatchObject({ k: "view.add", view: { id: "vw_bb", surface: "cmp_bb1" } });
    roundTrip(state, [{ k: "view.remove", id: "vw_bb" }]);
  });

  it("refuses a missing view", () => {
    refuse(deepFreeze(blink()), [{ k: "view.remove", id: "vw_none" }], "missing_target");
  });
});

describe("view.set", () => {
  it("renames and undoes with the old name", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "view.set", id: "vw_sch", name: "Circuit" };
    expect(accept(state, [op]).state.views[1].name).toBe("Circuit");
    expect(roundTrip(state, [op])).toEqual([{ k: "view.set", id: "vw_sch", name: viewOf(state, "vw_sch").name }]);
  });

  it("changes the surface while nothing is placed on it", () => {
    const empty: View = { ...second, id: "vw_two", kind: "breadboard", surface: "cmp_bb1" };
    const state = deepFreeze(accept(blink(), [bb2, { k: "view.add", view: empty }]).state);
    const op: Op = { k: "view.set", id: "vw_two", surface: "cmp_bb2" };
    expect(viewOf(accept(state, [op]).state, "vw_two").surface).toBe("cmp_bb2");
    expect(roundTrip(state, [op])).toEqual([{ k: "view.set", id: "vw_two", surface: "cmp_bb1" }]);
  });

  it("refuses a surface change while legs or hole wire ends use the surface", () => {
    const state = deepFreeze(accept(blink(), [bb2]).state);
    const rejected = refuse(state, [{ k: "view.set", id: "vw_bb", surface: "cmp_bb2" }], "referenced_by");
    expect(rejected.refs).toEqual([
      "/views/0/placements/2",
      "/views/0/placements/3",
      "/views/0/wires/0/to",
      "/views/0/wires/1/to",
    ]);
    accept(state, [{ k: "view.set", id: "vw_bb", surface: "cmp_bb1" }]);
  });

  it("refuses a surface on another kind, a part that is no surface and a missing view", () => {
    const state = deepFreeze(blink());
    refuse(state, [{ k: "view.set", id: "vw_sch", surface: "cmp_bb1" }], "invariant");
    refuse(state, [{ k: "view.set", id: "vw_bb", surface: "cmp_led1" }], "unknown_definition");
    refuse(state, [{ k: "view.set", id: "vw_none", name: "x" }], "missing_target");
  });
});

describe("view.place", () => {
  it("places a part in order and undoes with an unplace", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "view.place", view: "vw_sch", placement: { c: "cmp_bb1", x_mm: 5, y_mm: 6 } };
    const out = accept(state, [op]);
    expect(viewOf(out.state, "vw_sch").placements.map((p) => p.c)).toEqual([
      "brd_uno",
      "cmp_bb1",
      "cmp_led1",
      "cmp_res1",
    ]);
    expect(out.state.views[0]).toBe(state.views[0]);
    expect(roundTrip(state, [op])).toEqual([{ k: "view.unplace", view: "vw_sch", c: "cmp_bb1" }]);
  });

  it("moves a placed part and undoes with the old placement", () => {
    const state = deepFreeze(blink());
    const old = viewOf(state, "vw_bb").placements[2];
    const op: Op = {
      k: "view.place",
      view: "vw_bb",
      placement: { c: "cmp_led1", x_mm: 99, y_mm: 1, legs: { A: "c14", K: "c15" } },
    };
    expect(roundTrip(state, [op])).toEqual([{ k: "view.place", view: "vw_bb", placement: old }]);
  });

  it("refuses a part that does not exist, a missing view and a 2,001st placement", () => {
    const state = deepFreeze(blink());
    refuse(
      state,
      [{ k: "view.place", view: "vw_sch", placement: { c: "cmp_none", x_mm: 0, y_mm: 0 } }],
      "missing_target",
    );
    refuse(
      state,
      [{ k: "view.place", view: "vw_none", placement: { c: "cmp_led1", x_mm: 0, y_mm: 0 } }],
      "missing_target",
    );
    const full = blink();
    full.views[1].placements = Array.from({ length: 2000 }, (_, i) => ({ c: `cmp_p${i}`, x_mm: i, y_mm: 0 }));
    refuse(
      deepFreeze(full),
      [{ k: "view.place", view: "vw_sch", placement: { c: "cmp_bb1", x_mm: 0, y_mm: 0 } }],
      "quota",
    );
  });
});

describe("view.unplace", () => {
  it("removes the placement with its legs and restores both", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "view.unplace", view: "vw_bb", c: "cmp_led1" };
    const out = accept(state, [op]);
    expect(viewOf(out.state, "vw_bb").placements.map((p) => p.c)).toEqual(["brd_uno", "cmp_bb1", "cmp_res1"]);
    expect(out.inverse).toEqual([{ k: "view.place", view: "vw_bb", placement: viewOf(state, "vw_bb").placements[2] }]);
    roundTrip(state, [op]);
  });

  it("leaves its group, and a group of one disappears (G2)", () => {
    const group: Group = { id: "grp_p", members: ["brd_uno", "cmp_led1"] };
    const state = deepFreeze(accept(blink(), [{ k: "group.set", view: "vw_sch", group }]).state);
    const op: Op = { k: "view.unplace", view: "vw_sch", c: "cmp_led1" };
    const out = accept(state, [op]);
    expect(viewOf(out.state, "vw_sch").groups).toBeUndefined();
    expect(out.inverse).toEqual([
      { k: "view.place", view: "vw_sch", placement: viewOf(state, "vw_sch").placements[1] },
      { k: "group.set", view: "vw_sch", group },
    ]);
    roundTrip(state, [op]);
  });

  it("refuses a part that is not placed", () => {
    refuse(deepFreeze(blink()), [{ k: "view.unplace", view: "vw_sch", c: "cmp_bb1" }], "missing_target");
  });
});

describe("group.set and group.remove", () => {
  const group: Group = { id: "grp_a", name: "Pair", members: ["cmp_res1", "brd_uno"] };

  it("adds a group with its members sorted and undoes with a remove", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "group.set", view: "vw_sch", group };
    expect(accept(state, [op]).state.views[1].groups).toEqual([{ ...group, members: ["brd_uno", "cmp_res1"] }]);
    expect(roundTrip(state, [op])).toEqual([{ k: "group.remove", view: "vw_sch", id: "grp_a" }]);
  });

  it("replaces a group and undoes with the old one", () => {
    const state = deepFreeze(accept(blink(), [{ k: "group.set", view: "vw_sch", group }]).state);
    const next: Group = { id: "grp_a", members: ["cmp_led1", "cmp_res1"] };
    const old = viewOf(state, "vw_sch").groups?.[0];
    expect(roundTrip(state, [{ k: "group.set", view: "vw_sch", group: next }])).toEqual([
      { k: "group.set", view: "vw_sch", group: old },
    ]);
  });

  it("removes only the group, and stores no empty list", () => {
    const state = deepFreeze(accept(blink(), [{ k: "group.set", view: "vw_sch", group }]).state);
    const op: Op = { k: "group.remove", view: "vw_sch", id: "grp_a" };
    const out = accept(state, [op]);
    expect(viewOf(out.state, "vw_sch").groups).toBeUndefined();
    expect(viewOf(out.state, "vw_sch").placements).toBe(viewOf(state, "vw_sch").placements);
    expect(out.inverse).toEqual([{ k: "group.set", view: "vw_sch", group: viewOf(state, "vw_sch").groups?.[0] }]);
    roundTrip(state, [op]);
  });

  it("refuses an id another entity uses, a 257th group and missing targets", () => {
    const state = deepFreeze(drawnBlink());
    refuse(state, [{ k: "group.set", view: "vw_bb", group: { ...group, id: "grp_h" } }], "duplicate_id");
    refuse(state, [{ k: "group.set", view: "vw_none", group }], "missing_target");
    refuse(state, [{ k: "group.remove", view: "vw_sch", id: "grp_none" }], "missing_target");
    refuse(state, [{ k: "group.remove", view: "vw_none", id: "grp_g" }], "missing_target");
    const full: Project = blink();
    full.views[1].groups = Array.from({ length: 256 }, (_, i) => ({
      id: `grp_f${i}`,
      members: ["brd_uno", "cmp_res1"],
    }));
    refuse(deepFreeze(full), [{ k: "group.set", view: "vw_sch", group }], "quota");
  });
});
