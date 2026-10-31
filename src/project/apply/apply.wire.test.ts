// @vitest-environment node
import { describe, expect, it } from "vitest";
import { diag } from "../../core/result.ts";
import type { Diagnostic } from "../../core/result.ts";
import type { Op, Project, Wire } from "../generated/types.ts";
import { blink, drawnBlink, expectValid, viewOf, wireOf } from "./drawn.testing.ts";
import { OWNER, accept, ctxFor, deepFreeze, loadExample, refuse, roundTrip } from "./fixtures.testing.ts";
import { IMPLEMENTED_KINDS } from "./index.ts";
import type { ApplyContext } from "./types.ts";

const pinEnd = (c: string, p: string) => ({ kind: "pin", c, p }) as const;

const extra: Wire = { id: "wir_x", net: "net_led", from: pinEnd("cmp_res1", "P2"), to: pinEnd("cmp_led1", "A") };

/** The wire rules W1 to W4 and W7, written out as a batch-end check; the real ones arrive with T-B2-08b. */
const wireRules: NonNullable<ApplyContext["invariants"]> = (next) => {
  const found: Diagnostic[] = [];
  for (const view of next.views) {
    for (const wire of view.wires) {
      const net = next.nets.find((n) => n.id === wire.net);
      if (!net) found.push(diag("V3-WIRE-NET", "error", "", `${wire.id} names a net that does not exist`));
      for (const end of [wire.from, wire.to]) {
        if (end.kind === "pin" && net && !net.connections.some((c) => c.c === end.c && c.p === end.p)) {
          found.push(diag("V3-WIRE-END", "error", "", `${wire.id} ends on a pin outside ${wire.net}`));
        }
        if (end.kind === "junction" && !view.junctions?.some((j) => j.id === end.id && j.net === wire.net)) {
          found.push(diag("V3-WIRE-JCT", "error", "", `${wire.id} ends on a junction that is not on its net`));
        }
        if (end.kind === "hole" && end.surface !== view.surface) {
          found.push(diag("V3-WIRE-SURFACE", "error", "", `${wire.id} ends on another surface`));
        }
      }
      if (
        wire.from.kind === "pin" &&
        wire.to.kind === "pin" &&
        wire.from.c === wire.to.c &&
        wire.from.p === wire.to.p
      ) {
        found.push(diag("V3-WIRE-SELF", "error", "", `${wire.id} joins a pin to itself`));
      }
    }
  }
  return found;
};

it("registers all 22 kinds of this task", () => {
  const kinds: Op["k"][] = [
    "net.create",
    "net.connect",
    "net.disconnect",
    "net.merge",
    "net.split",
    "net.rename",
    "net.delete",
    "view.add",
    "view.remove",
    "view.set",
    "view.place",
    "view.unplace",
    "wire.add",
    "wire.route",
    "wire.remove",
    "wire.set",
    "group.set",
    "group.remove",
    "junction.add",
    "junction.remove",
    "label.set",
    "label.remove",
  ];
  expect(kinds).toHaveLength(22);
  for (const kind of kinds) expect(IMPLEMENTED_KINDS).toContain(kind);
});

describe("wire.add", () => {
  it("adds a wire in order and undoes with a remove, without touching a net", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "wire.add", view: "vw_sch", wire: extra };
    const out = accept(state, [op]);
    expect(viewOf(out.state, "vw_sch").wires.map((w) => w.id)).toEqual(["wir_s1", "wir_s2", "wir_s3", "wir_x"]);
    expect(out.state.nets).toBe(state.nets);
    expect(out.state.views[0]).toBe(state.views[0]);
    expect(roundTrip(state, [op])).toEqual([{ k: "wire.remove", view: "vw_sch", id: "wir_x" }]);
  });

  it("refuses an id used in any view, a missing view and a 5,001st wire", () => {
    const state = deepFreeze(blink());
    refuse(state, [{ k: "wire.add", view: "vw_sch", wire: { ...extra, id: "wir_b1" } }], "duplicate_id");
    refuse(state, [{ k: "wire.add", view: "vw_none", wire: extra }], "missing_target");
    const full = blink();
    full.views[1].wires = Array.from({ length: 5000 }, (_, i) => ({ ...extra, id: `wir_f${i}` }));
    refuse(deepFreeze(full), [{ k: "wire.add", view: "vw_sch", wire: extra }], "quota");
  });

  it("is judged at the end of the batch: W2 and W1 may be broken in between", () => {
    const state = deepFreeze(blink());
    const stray: Wire = {
      ...extra,
      id: "wir_y",
      net: "net_d12",
      from: pinEnd("brd_uno", "D11"),
      to: pinEnd("cmp_res1", "P1"),
    };
    const ctx = ctxFor(OWNER, wireRules);
    accept(
      state,
      [
        { k: "wire.add", view: "vw_sch", wire: stray },
        { k: "net.connect", net: "net_d12", pin: { c: "brd_uno", p: "D11" } },
      ],
      ctx,
    );
    const fresh: Wire = { ...stray, id: "wir_z", net: "net_new", to: pinEnd("brd_uno", "D10") };
    accept(
      state,
      [
        { k: "wire.add", view: "vw_sch", wire: fresh },
        {
          k: "net.create",
          net: {
            id: "net_new",
            connections: [
              { c: "brd_uno", p: "D11" },
              { c: "brd_uno", p: "D10" },
            ],
          },
        },
      ],
      ctx,
    );
  });

  it("fails the batch for W1, W2, W3, W4 and W7, and the state stays as it was", () => {
    const state = deepFreeze(drawnBlink());
    const ctx = ctxFor(OWNER, wireRules);
    const bad = (wire: Wire): Op[] => [{ k: "wire.add", view: "vw_sch", wire }];
    const w1 = refuse(state, bad({ ...extra, net: "net_none" }), "invariant", ctx);
    expect(w1.message).toContain("V3-WIRE-NET");
    const w2 = refuse(state, bad({ ...extra, from: pinEnd("brd_uno", "D11") }), "invariant", ctx);
    expect(w2.message).toContain("V3-WIRE-END");
    const w3 = refuse(state, bad({ ...extra, to: { kind: "junction", id: "jct_none" } }), "invariant", ctx);
    expect(w3.message).toContain("V3-WIRE-JCT");
    const w4 = refuse(state, bad({ ...extra, to: { kind: "hole", surface: "cmp_bb1", hole: "a1" } }), "invariant", ctx);
    expect(w4.message).toContain("V3-WIRE-SURFACE");
    const w7 = refuse(state, bad({ ...extra, to: extra.from }), "invariant", ctx);
    expect(w7.message).toContain("V3-WIRE-SELF");
  });
});

describe("wire.route", () => {
  it("sets a route and undoes with an empty one", () => {
    const state = deepFreeze(blink());
    const op: Op = {
      k: "wire.route",
      view: "vw_sch",
      id: "wir_s2",
      route_mm: [
        [1, 2],
        [3, 4],
      ],
    };
    expect(wireOf(accept(state, [op]).state, "vw_sch", "wir_s2").route_mm).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(roundTrip(state, [op])).toEqual([{ k: "wire.route", view: "vw_sch", id: "wir_s2", route_mm: [] }]);
  });

  it("clears the field with an empty route and undoes with the old one", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "wire.route", view: "vw_sch", id: "wir_s1", route_mm: [] };
    const out = accept(state, [op]);
    expect("route_mm" in wireOf(out.state, "vw_sch", "wir_s1")).toBe(false);
    expect(out.inverse).toEqual([
      { k: "wire.route", view: "vw_sch", id: "wir_s1", route_mm: wireOf(state, "vw_sch", "wir_s1").route_mm },
    ]);
    roundTrip(state, [op]);
  });

  it("refuses a missing wire", () => {
    refuse(deepFreeze(blink()), [{ k: "wire.route", view: "vw_sch", id: "wir_none", route_mm: [] }], "missing_target");
  });
});

describe("wire.set", () => {
  it("paints a wire and undoes by clearing the colour", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "wire.set", view: "vw_sch", id: "wir_s1", color: "green" };
    expect(wireOf(accept(state, [op]).state, "vw_sch", "wir_s1").color).toBe("green");
    expect(roundTrip(state, [op])).toEqual([{ k: "wire.set", view: "vw_sch", id: "wir_s1" }]);
  });

  it("clears a colour by leaving it out, and undoes with the old one", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "wire.set", view: "vw_bb", id: "wir_b1" };
    expect("color" in wireOf(accept(state, [op]).state, "vw_bb", "wir_b1")).toBe(false);
    expect(roundTrip(state, [op])).toEqual([{ k: "wire.set", view: "vw_bb", id: "wir_b1", color: "orange" }]);
  });

  it("refuses a missing wire and a missing view", () => {
    const state = deepFreeze(blink());
    refuse(state, [{ k: "wire.set", view: "vw_sch", id: "wir_none" }], "missing_target");
    refuse(state, [{ k: "wire.set", view: "vw_none", id: "wir_s1" }], "missing_target");
  });
});

describe("wire.remove", () => {
  it("keeps every member of the net (W5) and the inverse puts the wire back", () => {
    const lesson = deepFreeze(loadExample("lesson-uno-r3-button"));
    const op: Op = { k: "wire.remove", view: "vw_bb", id: "wir_4" };
    const out = accept(lesson, [op]);
    expect(out.state.nets).toBe(lesson.nets);
    expect(out.state.nets.find((n) => n.id === "net_d13")?.connections).toHaveLength(2);
    expect(out.inverse).toEqual([{ k: "wire.add", view: "vw_bb", wire: wireOf(lesson, "vw_bb", "wir_4") }]);
    roundTrip(lesson, [op]);
  });

  it("leaves its group, and the group goes when one member is left (G2)", () => {
    const state = deepFreeze(drawnBlink());
    const first: Op = { k: "wire.remove", view: "vw_sch", id: "wir_s3" };
    const out = accept(state, [first]);
    expect(viewOf(out.state, "vw_sch").groups?.find((g) => g.id === "grp_h")?.members).toEqual(["wir_s1", "wir_s2"]);
    expect(out.inverse).toEqual([
      { k: "wire.add", view: "vw_sch", wire: wireOf(state, "vw_sch", "wir_s3") },
      { k: "group.set", view: "vw_sch", group: viewOf(state, "vw_sch").groups?.[1] },
    ]);
    expectValid(out.inverse);
    roundTrip(state, [first]);

    const both: Op[] = [first, { k: "wire.remove", view: "vw_sch", id: "wir_s2" }];
    expect(viewOf(accept(state, both).state, "vw_sch").groups?.map((g) => g.id)).toEqual(["grp_g"]);
    roundTrip(state, both);
  });

  it("refuses a missing wire", () => {
    refuse(deepFreeze(blink()), [{ k: "wire.remove", view: "vw_sch", id: "wir_none" }], "missing_target");
  });
});

describe("junction.add and junction.remove", () => {
  it("adds a junction and undoes with a remove", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "junction.add", view: "vw_sch", junction: { id: "jct_a", net: "net_led", x_mm: 3, y_mm: 4 } };
    expect(viewOf(accept(state, [op]).state, "vw_sch").junctions).toHaveLength(1);
    expect(roundTrip(state, [op])).toEqual([{ k: "junction.remove", view: "vw_sch", id: "jct_a" }]);
  });

  it("refuses an id in use, a missing view and a 5,001st junction", () => {
    const state = deepFreeze(drawnBlink());
    const junction = { id: "jct_g", net: "net_gnd", x_mm: 0, y_mm: 0 };
    refuse(state, [{ k: "junction.add", view: "vw_bb", junction }], "duplicate_id");
    refuse(state, [{ k: "junction.add", view: "vw_none", junction }], "missing_target");
    const full = blink();
    full.views[1].junctions = Array.from({ length: 5000 }, (_, i) => ({ ...junction, id: `jct_f${i}` }));
    refuse(deepFreeze(full), [{ k: "junction.add", view: "vw_sch", junction }], "quota");
  });

  it("deletes the wires attached to it and leaves its group", () => {
    const state = deepFreeze(drawnBlink());
    const op: Op = { k: "junction.remove", view: "vw_sch", id: "jct_g" };
    const out = accept(state, [op]);
    const sch = viewOf(out.state, "vw_sch");
    expect(sch.wires.map((w) => w.id)).toEqual(["wir_s1", "wir_s2", "wir_s3"]);
    expect(sch.junctions).toBeUndefined();
    expect(sch.groups?.map((g) => g.id)).toEqual(["grp_h"]);
    expect(out.inverse).toEqual([
      { k: "junction.add", view: "vw_sch", junction: viewOf(state, "vw_sch").junctions?.[0] },
      { k: "wire.add", view: "vw_sch", wire: wireOf(state, "vw_sch", "wir_g1") },
      { k: "group.set", view: "vw_sch", group: viewOf(state, "vw_sch").groups?.[0] },
    ]);
    roundTrip(state, [op]);
  });

  it("refuses a missing junction", () => {
    refuse(deepFreeze(blink()), [{ k: "junction.remove", view: "vw_sch", id: "jct_none" }], "missing_target");
  });
});

describe("label.set and label.remove", () => {
  const label = { id: "lbl_a", text: "Hello", x_mm: 1, y_mm: 2 };

  it("adds a label, replaces it and undoes each", () => {
    const state = deepFreeze(blink());
    const add: Op = { k: "label.set", view: "vw_sch", label };
    expect(roundTrip(state, [add])).toEqual([{ k: "label.remove", view: "vw_sch", id: "lbl_a" }]);

    const withLabel = deepFreeze(accept(state, [add]).state);
    const edit: Op = { k: "label.set", view: "vw_sch", label: { ...label, text: "Bye", net: "net_led" } };
    expect(roundTrip(withLabel, [edit])).toEqual([{ k: "label.set", view: "vw_sch", label }]);
  });

  it("refuses an id in use, a missing view and a 1,001st label", () => {
    const state = deepFreeze(drawnBlink());
    refuse(state, [{ k: "label.set", view: "vw_bb", label: { ...label, id: "lbl_d12" } }], "duplicate_id");
    refuse(state, [{ k: "label.set", view: "vw_none", label }], "missing_target");
    const full = blink();
    full.views[1].labels = Array.from({ length: 1000 }, (_, i) => ({ ...label, id: `lbl_f${i}` }));
    refuse(deepFreeze(full), [{ k: "label.set", view: "vw_sch", label }], "quota");
  });

  it("removes a label from its group and puts it back", () => {
    const grouped: Project = accept(drawnBlink(), [
      { k: "label.set", view: "vw_bb", label },
      { k: "group.set", view: "vw_bb", group: { id: "grp_b", members: ["lbl_a", "wir_b1", "wir_b2"] } },
    ]).state;
    const state = deepFreeze(grouped);
    const op: Op = { k: "label.remove", view: "vw_bb", id: "lbl_a" };
    const out = accept(state, [op]);
    expect(viewOf(out.state, "vw_bb").groups?.[0].members).toEqual(["wir_b1", "wir_b2"]);
    expect(viewOf(out.state, "vw_bb").labels).toBeUndefined();
    expect(out.inverse).toEqual([
      { k: "label.set", view: "vw_bb", label },
      { k: "group.set", view: "vw_bb", group: viewOf(state, "vw_bb").groups?.[0] },
    ]);
    roundTrip(state, [op]);
  });

  it("refuses a missing label", () => {
    refuse(deepFreeze(blink()), [{ k: "label.remove", view: "vw_sch", id: "lbl_none" }], "missing_target");
  });
});
