// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { ComponentDependency, Component, Op, Project, View } from "../generated/types.ts";
import { validateOp } from "../generated/validate.mjs";
import { accept, contentOf, deepFreeze, loadExample, refuse, roundTrip } from "./fixtures.testing.ts";

const blink = (): Project => loadExample("uno-blink-d12");
const view = (state: Project, id: string): View => state.views.find((v) => v.id === id) as View;

const resistor: Component = { id: "cmp_res2", definition: { ref: "core.resistor", version: "1.0.0" }, refdes: "R2" };

describe("component.add", () => {
  it("adds a part in order and undoes with a remove", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "component.add", component: resistor };
    expect(accept(state, [op]).state.components.map((c) => c.id)).toEqual([
      "cmp_bb1",
      "cmp_led1",
      "cmp_res1",
      "cmp_res2",
    ]);
    expect(roundTrip(state, [op])).toEqual([{ k: "component.remove", id: "cmp_res2" }]);
  });

  it("takes a surface as well as a part", () => {
    const op: Op = {
      k: "component.add",
      component: {
        ...resistor,
        id: "cmp_bb2",
        definition: { ref: "core.breadboard-half", version: "1.0.0" },
        refdes: "BB2",
      },
    };
    roundTrip(deepFreeze(blink()), [op]);
  });

  it("refuses an id in use, a board definition and an unpinned definition", () => {
    const state = deepFreeze(blink());
    refuse(state, [{ k: "component.add", component: { ...resistor, id: "cmp_led1" } }], "duplicate_id");
    refuse(
      state,
      [{ k: "component.add", component: { ...resistor, definition: { ref: "core.uno-r3", version: "1.0.0" } } }],
      "unknown_definition",
    );
    refuse(
      state,
      [{ k: "component.add", component: { ...resistor, definition: { ref: "core.resistor", version: "2.0.0" } } }],
      "unknown_definition",
    );
  });

  it("refuses a 2,001st component", () => {
    const state = blink();
    state.components = Array.from({ length: 2000 }, (_, i) => ({ ...resistor, id: `cmp_r${i}`, refdes: `R${i}` }));
    refuse(deepFreeze(state), [{ k: "component.add", component: resistor }], "quota");
  });
});

describe("component.set", () => {
  it("patches label, refdes and locked, and undoes with null for the absent ones", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "component.set", id: "cmp_res1", set: { label: "Limit", refdes: "R9", locked: true } };
    expect(accept(state, [op]).state.components[2]).toMatchObject({ label: "Limit", refdes: "R9", locked: true });
    expect(roundTrip(state, [op])).toEqual([
      { k: "component.set", id: "cmp_res1", set: { label: null, refdes: "R1", locked: null } },
    ]);
  });

  it("merges params with null removal", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "component.set", id: "cmp_res1", params: { ohms: 330, tolerance: 5 } };
    expect(accept(state, [op]).state.components[2].params).toEqual({ ohms: 330, tolerance: 5 });
    expect(roundTrip(state, [op])).toEqual([
      { k: "component.set", id: "cmp_res1", params: { ohms: 220, tolerance: null } },
    ]);
    roundTrip(state, [{ k: "component.set", id: "cmp_res1", params: { ohms: null } }]);
  });

  it("binds a parameter to a project parameter and back", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "component.set", id: "cmp_led1", params: { color: { param: "par_color" } } };
    expect(roundTrip(state, [op])).toEqual([{ k: "component.set", id: "cmp_led1", params: { color: "red" } }]);
  });

  it("refuses fields it does not own and values the schema rejects", () => {
    const state = deepFreeze(blink());
    refuse(state, [{ k: "component.set", id: "cmp_res1", set: { definition: null } }], "malformed");
    refuse(state, [{ k: "component.set", id: "cmp_res1", set: { refdes: null } }], "malformed");
    refuse(state, [{ k: "component.set", id: "cmp_res1", set: { locked: "yes" } }], "malformed");
    refuse(state, [{ k: "component.set", id: "cmp_none", set: { label: "x" } }], "missing_target");
  });

  it("shares every entity it did not touch", () => {
    const state = deepFreeze(blink());
    const next = accept(state, [{ k: "component.set", id: "cmp_res1", set: { label: "Limit" } }]).state;
    expect(next.components[0]).toBe(state.components[0]);
    expect(next.components[1]).toBe(state.components[1]);
    expect(next.components[2]).not.toBe(state.components[2]);
    state.nets.forEach((net, i) => expect(next.nets[i]).toBe(net));
    state.views.forEach((v, i) => expect(next.views[i]).toBe(v));
    expect(next.boards[0]).toBe(state.boards[0]);
  });
});

describe("component.remove", () => {
  it("takes the net membership, placements, wires and faults with it", () => {
    const state = deepFreeze(blink());
    const out = accept(state, [{ k: "component.remove", id: "cmp_led1" }]);
    const next = out.state;

    expect(next.components.map((c) => c.id)).toEqual(["cmp_bb1", "cmp_res1"]);
    expect(next.nets.map((net) => net.connections.map((c) => `${c.c}/${c.p}`))).toEqual([
      ["brd_uno/D12", "cmp_res1/P1"],
      ["brd_uno/GND"],
      ["cmp_res1/P2"],
    ]);
    expect(next.views.map((v) => v.placements.map((p) => p.c))).toEqual([
      ["brd_uno", "cmp_bb1", "cmp_res1"],
      ["brd_uno", "cmp_res1"],
    ]);
    expect(next.views[1].wires.map((w) => w.id)).toEqual(["wir_s1"]);
    expect(next.simulation.faults).toEqual([]);
    expect(next.revision).toBe(state.revision + 1);

    expect(next.nets[0]).toBe(state.nets[0]);
    expect(next.views[0].wires).toEqual(state.views[0].wires);
    expect(next.boards[0]).toBe(state.boards[0]);

    expect(out.inverse).toEqual([
      { k: "component.add", component: state.components[1] },
      { k: "net.connect", net: "net_gnd", pin: { c: "cmp_led1", p: "K" } },
      { k: "net.connect", net: "net_led", pin: { c: "cmp_led1", p: "A" } },
      { k: "fault.set", fault: state.simulation.faults[0] },
      { k: "view.place", view: "vw_bb", placement: view(state, "vw_bb").placements[2] },
      { k: "view.place", view: "vw_sch", placement: view(state, "vw_sch").placements[1] },
      { k: "wire.add", view: "vw_sch", wire: view(state, "vw_sch").wires[1] },
      { k: "wire.add", view: "vw_sch", wire: view(state, "vw_sch").wires[2] },
    ]);
    for (const op of out.inverse) expect(validateOp(op)).toBe(true);
  });

  it("removes a part that is in no net as a plain removal", () => {
    const state = blink();
    state.components = [...state.components, resistor];
    const frozen = deepFreeze(state);
    expect(roundTrip(frozen, [{ k: "component.remove", id: "cmp_res2" }])).toEqual([
      { k: "component.add", component: resistor },
    ]);
  });

  it("is refused when the part is the surface of a view", () => {
    const refused = refuse(deepFreeze(blink()), [{ k: "component.remove", id: "cmp_bb1" }], "referenced_by");
    expect(refused.refs).toEqual(["/views/0/surface"]);
  });

  it("is refused when it does not exist", () => {
    refuse(deepFreeze(blink()), [{ k: "component.remove", id: "cmp_none" }], "missing_target");
  });

  it("takes the world input bound to it and the script events of that input", () => {
    const state = deepFreeze(loadExample("lesson-uno-r3-button"));
    const out = accept(state, [{ k: "component.remove", id: "cmp_btn1" }]);
    expect(out.state.simulation.world.inputs).toEqual([]);
    expect(out.state.simulation.world.script).toEqual([]);
    expect(out.inverse).toContainEqual({ k: "input.set", input: state.simulation.world.inputs[0] });
    expect(out.inverse).toContainEqual({ k: "script.set", script: state.simulation.world.script });
    const inputAt = out.inverse.findIndex((op) => op.k === "input.set");
    expect(out.inverse.findIndex((op) => op.k === "script.set")).toBeGreaterThan(inputAt);
  });

  describe("with a stub part wired into its own net", () => {
    function withStub(): Project {
      const state = blink();
      state.components = [
        ...state.components,
        { id: "cmp_x", definition: { ref: "core.resistor", version: "1.0.0" }, refdes: "RX" },
      ];
      state.nets = [...state.nets, { id: "net_x", connections: [{ c: "cmp_x", p: "P1" }] }];
      const sch = view(state, "vw_sch");
      sch.placements = [...sch.placements, { c: "cmp_x", x_mm: 5, y_mm: 5 }];
      sch.junctions = [{ id: "jct_x", net: "net_x", x_mm: 9, y_mm: 9 }];
      sch.wires = [
        ...sch.wires,
        {
          id: "wir_x",
          net: "net_x",
          from: { kind: "pin", c: "cmp_x", p: "P1" },
          to: { kind: "junction", id: "jct_x" },
        },
      ];
      sch.groups = [
        { id: "grp_x", members: ["cmp_x", "jct_x"] },
        { id: "grp_y", members: ["cmp_led1", "cmp_res1", "cmp_x"] },
      ];
      return state;
    }

    it("deletes the emptied net with its wire and junction, and trims the groups", () => {
      const state = deepFreeze(withStub());
      const out = accept(state, [{ k: "component.remove", id: "cmp_x" }]);
      const sch = view(out.state, "vw_sch");

      expect(out.state.nets.map((net) => net.id)).toEqual(["net_d12", "net_gnd", "net_led"]);
      expect(sch.junctions).toEqual([]);
      expect(sch.wires.map((w) => w.id)).toEqual(["wir_s1", "wir_s2", "wir_s3"]);
      expect(sch.groups).toEqual([{ id: "grp_y", members: ["cmp_led1", "cmp_res1"] }]);
      expect(view(out.state, "vw_bb")).toBe(view(state, "vw_bb"));

      const before = view(state, "vw_sch");
      expect(out.inverse).toEqual([
        { k: "component.add", component: state.components[3] },
        { k: "net.create", net: state.nets[3] },
        { k: "view.place", view: "vw_sch", placement: before.placements[3] },
        { k: "junction.add", view: "vw_sch", junction: before.junctions?.[0] },
        { k: "wire.add", view: "vw_sch", wire: before.wires[3] },
        { k: "group.set", view: "vw_sch", group: before.groups?.[0] },
        { k: "group.set", view: "vw_sch", group: before.groups?.[1] },
      ]);
      for (const op of out.inverse) expect(validateOp(op)).toBe(true);
    });

    it("is refused while a check, a fault or a label names the emptied net", () => {
      const byCheck = withStub();
      byCheck.tests[0].checks = [
        ...byCheck.tests[0].checks,
        { kind: "node-voltage", id: "c3", label: "x", net: "net_x", volts: [1, 2], atMs: 10 },
      ];
      expect(refuse(deepFreeze(byCheck), [{ k: "component.remove", id: "cmp_x" }], "referenced_by").refs).toEqual([
        "/tests/0/checks/2",
      ]);

      const byFault = withStub();
      byFault.simulation.faults = [
        ...byFault.simulation.faults,
        {
          id: "flt_x",
          cause_id: "short-x",
          symptom_ids: ["a"],
          kind: "short",
          target: { nets: ["net_x", "net_led"] },
          enabled: false,
        },
      ];
      expect(refuse(deepFreeze(byFault), [{ k: "component.remove", id: "cmp_x" }], "referenced_by").refs).toEqual([
        "/simulation/faults/1",
      ]);

      const byLabel = withStub();
      view(byLabel, "vw_sch").labels = [{ id: "lbl_x", text: "X", x_mm: 0, y_mm: 0, net: "net_x" }];
      expect(refuse(deepFreeze(byLabel), [{ k: "component.remove", id: "cmp_x" }], "referenced_by").refs).toEqual([
        "/views/1/labels/0",
      ]);
    });

    it("lets a net that survives keep its labels and checks", () => {
      const state = withStub();
      view(state, "vw_sch").labels = [{ id: "lbl_led", text: "LED", x_mm: 0, y_mm: 0, net: "net_led" }];
      accept(deepFreeze(state), [{ k: "component.remove", id: "cmp_x" }]);
    });
  });

  it("finds no dangling wire after a removal, and finds one after a removal that skips the cascade", () => {
    const dangling = (state: Project): string[] => {
      const live = new Set([...state.boards, ...state.components].map((item) => item.id));
      return state.views.flatMap((v) =>
        v.wires.filter((w) => [w.from, w.to].some((end) => end.kind === "pin" && !live.has(end.c))).map((w) => w.id),
      );
    };
    const state = deepFreeze(blink());
    const skipped: Project = { ...state, components: state.components.filter((c) => c.id !== "cmp_led1") };
    expect(dangling(skipped)).toEqual(["wir_s2", "wir_s3"]);
    expect(dangling(accept(state, [{ k: "component.remove", id: "cmp_led1" }]).state)).toEqual([]);
  });
});

describe("component.swap", () => {
  const smd: ComponentDependency = {
    ref: "core.resistor-smd",
    version: "1.0.0",
    origin: "builtin",
    interface: {
      role: "part",
      pins: [
        { id: "A", type: "passive" },
        { id: "B", type: "passive" },
      ],
      params: [],
    },
  };
  const swapped = (): Project => {
    const state = blink();
    state.dependencies.components = [...state.dependencies.components, smd];
    return deepFreeze(state);
  };
  const swap = (pinMap: Record<string, string>, id = "cmp_res1"): Op => ({
    k: "component.swap",
    id,
    definition: { ref: "core.resistor-smd", version: "1.0.0" },
    pinMap,
  });

  it("rewrites the pin in nets, legs and wire ends, and drops what the new part lacks", () => {
    const state = swapped();
    const out = accept(state, [swap({ P1: "A", P2: "B" })]);
    const next = out.state;
    expect(next.components[2]).toEqual({
      id: "cmp_res1",
      definition: { ref: "core.resistor-smd", version: "1.0.0" },
      refdes: "R1",
    });
    expect(next.nets[0].connections).toEqual([
      { c: "brd_uno", p: "D12" },
      { c: "cmp_res1", p: "A" },
    ]);
    expect(next.nets[2].connections).toEqual([
      { c: "cmp_led1", p: "A" },
      { c: "cmp_res1", p: "B" },
    ]);
    expect(view(next, "vw_bb").placements[3].legs).toEqual({ A: "b10", B: "b14" });
    expect(view(next, "vw_sch").wires[0].to).toEqual({ kind: "pin", c: "cmp_res1", p: "A" });
    expect(view(next, "vw_sch").wires[1].from).toEqual({ kind: "pin", c: "cmp_res1", p: "B" });
    expect(next.nets[1]).toBe(state.nets[1]);

    expect(out.inverse).toEqual([
      {
        k: "component.swap",
        id: "cmp_res1",
        definition: { ref: "core.resistor", version: "1.0.0" },
        pinMap: { A: "P1", B: "P2" },
      },
      { k: "component.set", id: "cmp_res1", params: { ohms: 220 } },
    ]);
    roundTrip(state, [swap({ P1: "A", P2: "B" })]);
  });

  it("swaps back to the same hash when nothing is dropped", () => {
    const state = swapped();
    const forward = accept(state, [swap({ P1: "B", P2: "A" })]);
    const back = accept(forward.state, forward.inverse);
    expect(contentOf(back.state)).toEqual(contentOf(state));
  });

  it("refuses a pin in use that the map leaves out", () => {
    expect(refuse(swapped(), [swap({ P1: "A" })], "missing_pin_map").message).toContain("P2");
  });

  it("refuses a mapping to a pin the new part lacks, or from a pin the old part lacks", () => {
    refuse(swapped(), [swap({ P1: "A", P2: "Z" })], "missing_pin");
    refuse(swapped(), [swap({ P1: "A", P2: "B", Q9: "A" })], "missing_pin");
  });

  it("refuses a map that sends two pins to one", () => {
    refuse(swapped(), [swap({ P1: "A", P2: "A" })], "invariant");
  });

  it("refuses a definition that is not pinned, or is a board, and a part that is not there", () => {
    const state = swapped();
    refuse(
      state,
      [{ k: "component.swap", id: "cmp_res1", definition: { ref: "core.nope", version: "1.0.0" }, pinMap: {} }],
      "unknown_definition",
    );
    refuse(
      state,
      [{ k: "component.swap", id: "cmp_res1", definition: { ref: "core.uno-r3", version: "1.0.0" }, pinMap: {} }],
      "unknown_definition",
    );
    refuse(state, [swap({}, "cmp_none")], "missing_target");
  });

  it("needs no map for a part that nothing connects", () => {
    const state = swapped();
    const out = accept(state, [{ k: "component.add", component: resistor }, swap({}, "cmp_res2")]);
    expect(out.state.components.find((c) => c.id === "cmp_res2")?.definition.ref).toBe("core.resistor-smd");
  });
});
