// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Net, Op, PinRef, Project } from "../generated/types.ts";
import { blink, drawnBlink, expectValid, viewOf, wireOf } from "./drawn.testing.ts";
import { accept, deepFreeze, loadExample, refuse, roundTrip } from "./fixtures.testing.ts";
import { IMPLEMENTED_KINDS } from "./index.ts";

const ref = (c: string, p: string): PinRef => ({ c, p });
const connections = (state: Project, id: string) =>
  (state.nets.find((net) => net.id === id) as Net).connections.map((c) => `${c.c}/${c.p}`);

const solo: Op = { k: "net.create", net: { id: "net_solo", connections: [ref("brd_uno", "D11")] } };

/** The blink project plus `net_solo` holding only the board's D11, with a wire and a junction drawn on it. */
function withSolo(): Project {
  return accept(blink(), [
    solo,
    { k: "junction.add", view: "vw_sch", junction: { id: "jct_s", net: "net_solo", x_mm: 5, y_mm: 5 } },
    {
      k: "wire.add",
      view: "vw_sch",
      wire: {
        id: "wir_solo",
        net: "net_solo",
        from: { kind: "pin", c: "brd_uno", p: "D11" },
        to: { kind: "junction", id: "jct_s" },
      },
    },
  ]).state;
}

/** What the inverse can replay today: the kinds that have a handler. */
const registered = (ops: Op[]): Op[] => ops.filter((op) => IMPLEMENTED_KINDS.includes(op.k));

describe("net.create", () => {
  it("adds the net in order with its pins sorted, and undoes with a delete", () => {
    const state = deepFreeze(blink());
    const op: Op = {
      k: "net.create",
      net: { id: "net_x", connections: [ref("brd_uno", "D13"), ref("brd_uno", "D11")] },
    };
    const out = accept(state, [op]);
    expect(out.state.nets.map((n) => n.id)).toEqual(["net_d12", "net_gnd", "net_led", "net_x"]);
    expect(connections(out.state, "net_x")).toEqual(["brd_uno/D11", "brd_uno/D13"]);
    expect(roundTrip(state, [op])).toEqual([{ k: "net.delete", id: "net_x" }]);
  });

  it("refuses an id in use, a missing part, a missing pin, a pin in use and a pin listed twice", () => {
    const state = deepFreeze(blink());
    const net = (id: string, ...pins: PinRef[]): Op => ({
      k: "net.create",
      net: { id, connections: pins as Net["connections"] },
    });
    refuse(state, [net("net_gnd", ref("brd_uno", "D11"))], "duplicate_id");
    refuse(state, [net("net_x", ref("cmp_none", "A"))], "missing_target");
    refuse(state, [net("net_x", ref("cmp_led1", "Z"))], "missing_pin");
    refuse(state, [net("net_x", ref("brd_uno", "D12"))], "pin_in_use");
    refuse(state, [net("net_x", ref("brd_uno", "D11"), ref("brd_uno", "D11"))], "malformed");
  });

  it("refuses a 5,001st net", () => {
    const state = blink();
    state.nets = Array.from({ length: 5000 }, (_, i) => ({ id: `net_n${i}`, connections: [ref("cmp_none", `P${i}`)] }));
    refuse(deepFreeze(state), [solo], "quota");
  });
});

describe("net.connect", () => {
  it("adds a free pin in order and undoes with a disconnect", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "net.connect", net: "net_gnd", pin: ref("brd_uno", "AREF") };
    expect(connections(accept(state, [op]).state, "net_gnd")).toEqual(["brd_uno/AREF", "brd_uno/GND", "cmp_led1/K"]);
    expect(roundTrip(state, [op])).toEqual([{ k: "net.disconnect", pin: ref("brd_uno", "AREF") }]);
  });

  it("shares every net and view it did not touch", () => {
    const state = deepFreeze(blink());
    const next = accept(state, [{ k: "net.connect", net: "net_gnd", pin: ref("brd_uno", "AREF") }]).state;
    expect(next.nets[0]).toBe(state.nets[0]);
    expect(next.nets[1]).not.toBe(state.nets[1]);
    expect(next.nets[2]).toBe(state.nets[2]);
    expect(next.views).toBe(state.views);
  });

  it("is a no-op with an empty inverse when the pin is already there", () => {
    const state = deepFreeze(blink());
    const same: Op = { k: "net.connect", net: "net_gnd", pin: ref("brd_uno", "GND") };
    const out = accept(state, [same]);
    expect(out.inverse).toEqual([]);
    expect(out.state.nets).toBe(state.nets);
    expect(accept(state, [{ ...same, move: true }]).inverse).toEqual([]);
  });

  it("refuses a pin in another net, a missing net, part or pin, and a 2,001st pin", () => {
    const state = deepFreeze(blink());
    refuse(state, [{ k: "net.connect", net: "net_gnd", pin: ref("brd_uno", "D12") }], "pin_in_use");
    refuse(state, [{ k: "net.connect", net: "net_none", pin: ref("brd_uno", "D11") }], "missing_target");
    refuse(state, [{ k: "net.connect", net: "net_gnd", pin: ref("cmp_none", "A") }], "missing_target");
    refuse(state, [{ k: "net.connect", net: "net_gnd", pin: ref("cmp_led1", "Z") }], "missing_pin");
    const full = blink();
    full.nets[1].connections = Array.from({ length: 2000 }, (_, i) => ref("cmp_none", `P${i}`)) as Net["connections"];
    refuse(deepFreeze(full), [{ k: "net.connect", net: "net_gnd", pin: ref("brd_uno", "D11") }], "quota");
  });

  it("moves a pin out of a net that stays, deleting the wires that ended on it", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "net.connect", net: "net_gnd", pin: ref("brd_uno", "D12"), move: true };
    const out = accept(state, [op]);
    expect(connections(out.state, "net_d12")).toEqual(["cmp_res1/P1"]);
    expect(connections(out.state, "net_gnd")).toEqual(["brd_uno/D12", "brd_uno/GND", "cmp_led1/K"]);
    expect(out.state.views.map((v) => v.wires.map((w) => w.id))).toEqual([["wir_b2"], ["wir_s2", "wir_s3"]]);
    expect(out.inverse).toEqual([
      { k: "net.connect", net: "net_d12", pin: ref("brd_uno", "D12"), move: true },
      { k: "wire.add", view: "vw_bb", wire: wireOf(state, "vw_bb", "wir_b1") },
      { k: "wire.add", view: "vw_sch", wire: wireOf(state, "vw_sch", "wir_s1") },
    ]);
    expectValid(out.inverse);
    roundTrip(state, [op]);
  });

  it("moves the last pin of a net, which deletes the net with its wires and junctions", () => {
    const state = deepFreeze(withSolo());
    const op: Op = { k: "net.connect", net: "net_gnd", pin: ref("brd_uno", "D11"), move: true };
    const out = accept(state, [op]);
    expect(out.state.nets.map((n) => n.id)).not.toContain("net_solo");
    expect(viewOf(out.state, "vw_sch").junctions).toBeUndefined();
    expect(out.inverse).toEqual([
      { k: "net.disconnect", pin: ref("brd_uno", "D11") },
      { k: "net.create", net: state.nets.find((n) => n.id === "net_solo") },
      { k: "junction.add", view: "vw_sch", junction: viewOf(state, "vw_sch").junctions?.[0] },
      { k: "wire.add", view: "vw_sch", wire: wireOf(state, "vw_sch", "wir_solo") },
    ]);
    roundTrip(state, [op]);
  });

  it("refuses a move that would empty a net a check names", () => {
    const state = deepFreeze(blink());
    const ops: Op[] = [
      { k: "net.disconnect", pin: ref("cmp_led1", "A") },
      { k: "net.connect", net: "net_gnd", pin: ref("cmp_res1", "P2"), move: true },
    ];
    expect(refuse(state, ops, "referenced_by").refs).toEqual(["/tests/0/checks/1"]);
  });
});

describe("net.disconnect", () => {
  it("deletes the wire that ended on the pin and brings it back with the pin", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "net.disconnect", pin: ref("cmp_led1", "A") };
    const out = accept(state, [op]);
    expect(connections(out.state, "net_led")).toEqual(["cmp_res1/P2"]);
    expect(viewOf(out.state, "vw_sch").wires.map((w) => w.id)).toEqual(["wir_s1", "wir_s3"]);
    expect(out.inverse).toEqual([
      { k: "net.connect", net: "net_led", pin: ref("cmp_led1", "A") },
      { k: "wire.add", view: "vw_sch", wire: wireOf(state, "vw_sch", "wir_s2") },
    ]);
    roundTrip(state, [op]);
  });

  it("drops an orphaned junction and a group left with one member, and restores both", () => {
    const state = deepFreeze(drawnBlink());
    const op: Op = { k: "net.disconnect", pin: ref("cmp_led1", "K") };
    const out = accept(state, [op]);
    const sch = viewOf(out.state, "vw_sch");
    expect(sch.junctions).toBeUndefined();
    expect(sch.groups?.map((g) => [g.id, g.members])).toEqual([["grp_h", ["wir_s1", "wir_s2"]]]);
    expect(out.inverse).toEqual([
      { k: "net.connect", net: "net_gnd", pin: ref("cmp_led1", "K") },
      { k: "junction.add", view: "vw_sch", junction: viewOf(state, "vw_sch").junctions?.[0] },
      { k: "wire.add", view: "vw_sch", wire: wireOf(state, "vw_sch", "wir_g1") },
      { k: "wire.add", view: "vw_sch", wire: wireOf(state, "vw_sch", "wir_s3") },
      { k: "group.set", view: "vw_sch", group: viewOf(state, "vw_sch").groups?.[0] },
      { k: "group.set", view: "vw_sch", group: viewOf(state, "vw_sch").groups?.[1] },
    ]);
    expectValid(out.inverse);
    roundTrip(state, [op]);
  });

  it("deletes a net it empties, with its wires, junctions and groups (N9, nothing names it)", () => {
    const state = deepFreeze(drawnBlink());
    const ops: Op[] = [
      { k: "net.disconnect", pin: ref("cmp_led1", "K") },
      { k: "net.disconnect", pin: ref("brd_uno", "GND") },
    ];
    const out = accept(state, ops);
    expect(out.state.nets.map((n) => n.id)).toEqual(["net_d12", "net_led"]);
    expect(out.state.views.flatMap((v) => v.wires.map((w) => w.net))).not.toContain("net_gnd");
    roundTrip(state, ops);
  });

  it("deletes a single-pin net with its drawing and undoes with a create", () => {
    const state = deepFreeze(withSolo());
    const op: Op = { k: "net.disconnect", pin: ref("brd_uno", "D11") };
    const out = accept(state, [op]);
    expect(out.inverse[0]).toEqual({ k: "net.create", net: state.nets.find((n) => n.id === "net_solo") });
    expect(out.inverse).toHaveLength(3);
    roundTrip(state, [op]);
  });

  it("refuses to empty a net that a check, a fault or a label names (N9)", () => {
    const check = deepFreeze(blink());
    const both: Op[] = [
      { k: "net.disconnect", pin: ref("cmp_led1", "A") },
      { k: "net.disconnect", pin: ref("cmp_res1", "P2") },
    ];
    expect(refuse(check, both, "referenced_by").refs).toEqual(["/tests/0/checks/1"]);

    const fault = loadExample("env-monitor-esp32");
    const sda = fault.nets.find((n) => n.id === "net_sda") as Net;
    const emptySda: Op[] = sda.connections.map((pin): Op => ({ k: "net.disconnect", pin }));
    expect(refuse(deepFreeze(fault), emptySda, "referenced_by").refs).toEqual(["/simulation/faults/0"]);

    const named = accept(withSolo(), [
      { k: "label.set", view: "vw_sch", label: { id: "lbl_s", text: "Sig", x_mm: 1, y_mm: 1, net: "net_solo" } },
    ]).state;
    expect(
      refuse(deepFreeze(named), [{ k: "net.disconnect", pin: ref("brd_uno", "D11") }], "referenced_by").refs,
    ).toEqual(["/views/1/labels/0"]);
  });

  it("refuses a pin that is in no net", () => {
    refuse(deepFreeze(blink()), [{ k: "net.disconnect", pin: ref("brd_uno", "D11") }], "missing_target");
  });
});

describe("net.merge", () => {
  it("moves the members and rewrites a wire and a check, and the inverse splits them out again", () => {
    const state = deepFreeze(loadExample("env-monitor-esp32"));
    const out = accept(state, [{ k: "net.merge", into: "net_5v", from: "net_3v3" }]);
    expect(out.state.nets.map((n) => n.id)).toEqual(["net_5v", "net_gnd", "net_scl", "net_sda"]);
    expect(connections(out.state, "net_5v")).toHaveLength(8);
    expect(wireOf(out.state, "vw_sch", "wir_3").net).toBe("net_5v");
    expect(out.state.tests[0].checks[0]).toMatchObject({ id: "c1", net: "net_5v" });

    const from = state.nets.find((n) => n.id === "net_3v3") as Net;
    expect(out.inverse).toEqual([
      { k: "net.split", net: "net_5v", into: "net_3v3", pins: from.connections },
      { k: "net.rename", id: "net_3v3", name: "3V3", class: "power" },
      { k: "test.set", test: state.tests[0] },
    ]);
    expectValid(out.inverse);

    const back = accept(out.state, registered(out.inverse)).state;
    expect(back.nets).toEqual(state.nets);
    expect(back.views).toEqual(state.views);
  });

  it("rewrites a fault and a label as well", () => {
    const base = accept(loadExample("env-monitor-esp32"), [
      { k: "label.set", view: "vw_sch", label: { id: "lbl_scl", text: "clock", x_mm: 1, y_mm: 2, net: "net_scl" } },
    ]).state;
    const state = deepFreeze(base);
    const out = accept(state, [{ k: "net.merge", into: "net_gnd", from: "net_scl" }]);
    expect(out.state.simulation.faults[0].target).toEqual({ nets: ["net_gnd", "net_sda"] });
    expect(viewOf(out.state, "vw_sch").labels?.[0].net).toBe("net_gnd");
    expect(out.inverse.map((op) => op.k)).toEqual(["net.split", "net.rename", "label.set", "fault.set"]);
    expect(out.inverse[2]).toEqual({ k: "label.set", view: "vw_sch", label: viewOf(state, "vw_sch").labels?.[0] });
    expect(out.inverse[3]).toEqual({ k: "fault.set", fault: state.simulation.faults[0] });

    const back = accept(out.state, registered(out.inverse)).state;
    expect(back.nets).toEqual(state.nets);
    expect(back.views).toEqual(state.views);
  });

  it("refuses a net merged into itself, a missing net and a net over the pin limit", () => {
    const state = deepFreeze(blink());
    refuse(state, [{ k: "net.merge", into: "net_gnd", from: "net_gnd" }], "malformed");
    refuse(state, [{ k: "net.merge", into: "net_gnd", from: "net_none" }], "missing_target");
    refuse(state, [{ k: "net.merge", into: "net_none", from: "net_gnd" }], "missing_target");
    const full = blink();
    full.nets[0].connections = Array.from({ length: 1999 }, (_, i) => ref("cmp_none", `P${i}`)) as Net["connections"];
    refuse(deepFreeze(full), [{ k: "net.merge", into: "net_d12", from: "net_gnd" }], "quota");
  });
});

describe("net.split", () => {
  it("moves a pin out, deletes the wire that crosses the cut and follows the rest", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "net.split", net: "net_d12", into: "net_new", pins: [ref("brd_uno", "D12")] };
    const out = accept(state, [op]);
    expect(connections(out.state, "net_d12")).toEqual(["cmp_res1/P1"]);
    expect(connections(out.state, "net_new")).toEqual(["brd_uno/D12"]);
    expect(wireOf(out.state, "vw_bb", "wir_b1").net).toBe("net_new");
    expect(viewOf(out.state, "vw_sch").wires.map((w) => w.id)).toEqual(["wir_s2", "wir_s3"]);
    expect(out.inverse).toEqual([
      { k: "net.merge", into: "net_d12", from: "net_new" },
      { k: "wire.add", view: "vw_sch", wire: wireOf(state, "vw_sch", "wir_s1") },
    ]);
    roundTrip(state, [op]);
  });

  it("keeps a wire whose pins stay put on the old net", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "net.split", net: "net_d12", into: "net_new", pins: [ref("cmp_res1", "P1")] };
    const out = accept(state, [op]);
    expect(wireOf(out.state, "vw_bb", "wir_b1").net).toBe("net_d12");
    roundTrip(state, [op]);
  });

  it("moves a junction with its wire and deletes an orphan junction", () => {
    const orphan: Op = {
      k: "junction.add",
      view: "vw_sch",
      junction: { id: "jct_o", net: "net_gnd", x_mm: 1, y_mm: 1 },
    };
    const state = deepFreeze(accept(drawnBlink(), [orphan]).state);
    const op: Op = { k: "net.split", net: "net_gnd", into: "net_new", pins: [ref("cmp_led1", "K")] };
    const out = accept(state, [op]);
    const sch = viewOf(out.state, "vw_sch");
    expect(sch.junctions?.map((j) => [j.id, j.net])).toEqual([["jct_g", "net_new"]]);
    expect(sch.wires.map((w) => [w.id, w.net])).toEqual([
      ["wir_g1", "net_new"],
      ["wir_s1", "net_d12"],
      ["wir_s2", "net_led"],
    ]);
    expect(out.inverse.map((o) => o.k)).toEqual(["net.merge", "junction.add", "wire.add", "group.set"]);
    roundTrip(state, [op]);
  });

  it("cuts a whole drawing that meets at a junction when its pins are on both sides", () => {
    const joined = accept(drawnBlink(), [
      {
        k: "wire.add",
        view: "vw_sch",
        wire: {
          id: "wir_g2",
          net: "net_gnd",
          from: { kind: "junction", id: "jct_g" },
          to: { kind: "pin", c: "brd_uno", p: "GND" },
        },
      },
    ]).state;
    const state = deepFreeze(joined);
    const op: Op = { k: "net.split", net: "net_gnd", into: "net_new", pins: [ref("cmp_led1", "K")] };
    const out = accept(state, [op]);
    const sch = viewOf(out.state, "vw_sch");
    expect(sch.wires.map((w) => w.id)).toEqual(["wir_s1", "wir_s2"]);
    expect(sch.junctions).toBeUndefined();
    roundTrip(state, [op]);
  });

  it("refuses an id in use, a pin outside the net, a split that empties the net, a repeated pin and a missing net", () => {
    const state = deepFreeze(blink());
    refuse(state, [{ k: "net.split", net: "net_gnd", into: "net_led", pins: [ref("cmp_led1", "K")] }], "duplicate_id");
    refuse(state, [{ k: "net.split", net: "net_gnd", into: "net_new", pins: [ref("brd_uno", "D12")] }], "missing_pin");
    refuse(
      state,
      [{ k: "net.split", net: "net_gnd", into: "net_new", pins: [ref("cmp_led1", "K"), ref("brd_uno", "GND")] }],
      "invariant",
    );
    refuse(
      state,
      [{ k: "net.split", net: "net_gnd", into: "net_new", pins: [ref("cmp_led1", "K"), ref("cmp_led1", "K")] }],
      "malformed",
    );
    refuse(
      state,
      [{ k: "net.split", net: "net_none", into: "net_new", pins: [ref("cmp_led1", "K")] }],
      "missing_target",
    );
  });
});

describe("net.rename", () => {
  it("sets, changes and removes a name and undoes each", () => {
    const state = deepFreeze(blink());
    const named = accept(state, [{ k: "net.rename", id: "net_led", name: "LED" }]);
    expect(named.inverse).toEqual([{ k: "net.rename", id: "net_led", name: "" }]);
    roundTrip(state, [{ k: "net.rename", id: "net_led", name: "LED" }]);

    const again = deepFreeze(named.state);
    expect(roundTrip(again, [{ k: "net.rename", id: "net_led", name: "Anode" }])).toEqual([
      { k: "net.rename", id: "net_led", name: "LED" },
    ]);
    const cleared = accept(again, [{ k: "net.rename", id: "net_led", name: "" }]);
    expect("name" in cleared.state.nets[2]).toBe(false);
    expect(cleared.inverse).toEqual([{ k: "net.rename", id: "net_led", name: "LED" }]);
  });

  it("changes the class and puts the old one back", () => {
    const state = deepFreeze(loadExample("env-monitor-esp32"));
    const op: Op = { k: "net.rename", id: "net_scl", class: "analog" };
    expect(accept(state, [op]).state.nets[3].class).toBe("analog");
    expect(roundTrip(state, [op])).toEqual([{ k: "net.rename", id: "net_scl", class: "signal" }]);
  });

  it("refuses a name another net has and a missing net", () => {
    const state = deepFreeze(loadExample("env-monitor-esp32"));
    refuse(state, [{ k: "net.rename", id: "net_scl", name: "SDA" }], "invariant");
    refuse(state, [{ k: "net.rename", id: "net_none", name: "X" }], "missing_target");
    accept(state, [
      { k: "net.rename", id: "net_scl", name: "tmp" },
      { k: "net.rename", id: "net_sda", name: "SCL" },
      { k: "net.rename", id: "net_scl", name: "SDA" },
    ]);
  });
});

describe("net.delete", () => {
  it("takes the wires, the label and the group members with it, and the inverse restores the hash", () => {
    const state = deepFreeze(drawnBlink());
    const op: Op = { k: "net.delete", id: "net_d12" };
    const out = accept(state, [op]);
    expect(out.state.nets.map((n) => n.id)).toEqual(["net_gnd", "net_led"]);
    expect(viewOf(out.state, "vw_bb").wires.map((w) => w.id)).toEqual(["wir_b2"]);
    expect(viewOf(out.state, "vw_sch").labels).toBeUndefined();
    expect(viewOf(out.state, "vw_sch").groups?.find((g) => g.id === "grp_h")?.members).toEqual(["wir_s2", "wir_s3"]);
    expect(out.inverse).toEqual([
      { k: "net.create", net: state.nets[0] },
      { k: "wire.add", view: "vw_bb", wire: wireOf(state, "vw_bb", "wir_b1") },
      { k: "label.set", view: "vw_sch", label: viewOf(state, "vw_sch").labels?.[0] },
      { k: "wire.add", view: "vw_sch", wire: wireOf(state, "vw_sch", "wir_s1") },
      { k: "group.set", view: "vw_sch", group: viewOf(state, "vw_sch").groups?.[1] },
    ]);
    expectValid(out.inverse);
    roundTrip(state, [op]);
  });

  it("deletes the faults that name the net and puts them back", () => {
    const state = deepFreeze(loadExample("env-monitor-esp32"));
    const out = accept(state, [{ k: "net.delete", id: "net_scl" }]);
    expect(out.state.simulation.faults).toEqual([]);
    expect(out.inverse.map((op) => op.k)).toEqual(["net.create", "wire.add", "wire.add", "fault.set"]);
    expect(out.inverse.at(-1)).toEqual({ k: "fault.set", fault: state.simulation.faults[0] });
    const back = accept(out.state, registered(out.inverse)).state;
    expect(back.nets).toEqual(state.nets);
    expect(back.views).toEqual(state.views);
  });

  it("refuses while a check names the net, and for a missing net", () => {
    const state = deepFreeze(loadExample("env-monitor-esp32"));
    expect(refuse(state, [{ k: "net.delete", id: "net_3v3" }], "referenced_by").refs).toEqual(["/tests/0/checks/0"]);
    refuse(state, [{ k: "net.delete", id: "net_none" }], "missing_target");
  });
});
