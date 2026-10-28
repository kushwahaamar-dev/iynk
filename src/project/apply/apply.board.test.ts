// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Board, Op, Project } from "../generated/types.ts";
import { validateOp } from "../generated/validate.mjs";
import { accept, deepFreeze, loadExample, refuse, roundTrip } from "./fixtures.testing.ts";

const blink = (): Project => loadExample("uno-blink-d12");
const frozen = (state: Project = blink()) => deepFreeze(state);

const second: Board = { id: "brd_two", definition: { ref: "core.uno-r3", version: "1.0.0" }, refdes: "U2" };

describe("board.add", () => {
  it("adds a board in order and undoes with a remove", () => {
    const state = frozen();
    const op: Op = { k: "board.add", board: second };
    expect(accept(state, [op]).state.boards.map((board) => board.id)).toEqual(["brd_two", "brd_uno"]);
    expect(roundTrip(state, [op])).toEqual([{ k: "board.remove", id: "brd_two" }]);
  });

  it("refuses an id in use", () => {
    refuse(frozen(), [{ k: "board.add", board: { ...second, id: "brd_uno" } }], "duplicate_id");
  });

  it("refuses a definition that is not a pinned board", () => {
    const part = { ...second, definition: { ref: "core.led-5mm", version: "1.0.0" } };
    refuse(frozen(), [{ k: "board.add", board: part }], "unknown_definition");
    const unpinned = { ...second, definition: { ref: "core.uno-r3", version: "9.9.9" } };
    refuse(frozen(), [{ k: "board.add", board: unpinned }], "unknown_definition");
  });

  it("refuses a seventeenth board", () => {
    const state = blink();
    state.boards = Array.from({ length: 16 }, (_, i) => ({ ...second, id: `brd_b${i}`, refdes: `U${i + 2}` }));
    refuse(deepFreeze(state), [{ k: "board.add", board: second }], "quota");
  });

  it("accepts an id that an earlier op in the batch freed", () => {
    const out = accept(frozen(), [
      { k: "board.add", board: second },
      { k: "board.remove", id: "brd_two" },
      { k: "board.add", board: second },
    ]);
    expect(out.state.boards).toHaveLength(2);
  });
});

describe("board.set", () => {
  it("patches the fields and undoes with null for the ones that were absent", () => {
    const state = frozen();
    const op: Op = { k: "board.set", id: "brd_uno", set: { label: "Main", powerInput: "usb" } };
    expect(accept(state, [op]).state.boards[0]).toMatchObject({ label: "Main", powerInput: "usb" });
    expect(roundTrip(state, [op])).toEqual([{ k: "board.set", id: "brd_uno", set: { label: null, powerInput: null } }]);
  });

  it("removes a key with null and restores it", () => {
    const state = accept(frozen(), [{ k: "board.set", id: "brd_uno", set: { label: "Main" } }]).state;
    const op: Op = { k: "board.set", id: "brd_uno", set: { label: null } };
    expect("label" in accept(state, [op]).state.boards[0]).toBe(false);
    expect(roundTrip(state, [op])).toEqual([{ k: "board.set", id: "brd_uno", set: { label: "Main" } }]);
  });

  it("merges params, and drops the field when the last key goes", () => {
    const state = frozen();
    const add: Op = { k: "board.set", id: "brd_uno", params: { clock: 16, mode: "fast" } };
    expect(accept(state, [add]).state.boards[0].params).toEqual({ clock: 16, mode: "fast" });
    expect(roundTrip(state, [add])).toEqual([{ k: "board.set", id: "brd_uno", params: { clock: null, mode: null } }]);
    const withParams = accept(state, [add]).state;
    const drop: Op = { k: "board.set", id: "brd_uno", params: { clock: null, mode: null } };
    expect("params" in accept(withParams, [drop]).state.boards[0]).toBe(false);
    expect(roundTrip(withParams, [drop])).toEqual([
      { k: "board.set", id: "brd_uno", params: { clock: 16, mode: "fast" } },
    ]);
  });

  it("replaces the firmware, and undoes with the old one", () => {
    const state = frozen();
    const firmware = { language: "micropython" as const, entry: "src_blink", sources: ["src_blink"] as [string] };
    const op: Op = { k: "board.set", id: "brd_uno", firmware };
    expect(accept(state, [op]).state.boards[0].firmware).toEqual(firmware);
    expect(roundTrip(state, [op])).toEqual([{ k: "board.set", id: "brd_uno", firmware: state.boards[0].firmware }]);
  });

  it("removes the firmware with a null, and adds it back", () => {
    const state = frozen();
    const op: Op = { k: "board.set", id: "brd_uno", set: { firmware: null } };
    const bare = accept(state, [op]).state;
    expect("firmware" in bare.boards[0]).toBe(false);
    expect(roundTrip(state, [op])).toEqual([{ k: "board.set", id: "brd_uno", firmware: state.boards[0].firmware }]);
    const give: Op = { k: "board.set", id: "brd_uno", firmware: state.boards[0].firmware };
    expect(roundTrip(bare, [give])).toEqual([{ k: "board.set", id: "brd_uno", set: { firmware: null } }]);
  });

  it("refuses what it may not change", () => {
    const state = frozen();
    refuse(state, [{ k: "board.set", id: "brd_uno", set: { definition: null } }], "malformed");
    refuse(state, [{ k: "board.set", id: "brd_uno", set: { id: "brd_x" } }], "malformed");
    refuse(state, [{ k: "board.set", id: "brd_uno", set: { firmware: { entry: "x" } } }], "malformed");
    refuse(state, [{ k: "board.set", id: "brd_uno", set: { refdes: null } }], "malformed");
    refuse(state, [{ k: "board.set", id: "brd_uno", set: { label: "x".repeat(61) } }], "malformed");
  });

  it("refuses a board that is not there", () => {
    refuse(frozen(), [{ k: "board.set", id: "brd_none", set: { label: "x" } }], "missing_target");
  });
});

describe("board.remove", () => {
  it("is refused while a check names one of its pins", () => {
    const refused = refuse(frozen(), [{ k: "board.remove", id: "brd_uno" }], "referenced_by");
    expect(refused.refs).toEqual(["/tests/0/checks/0"]);
  });

  it("is refused when it does not exist", () => {
    refuse(frozen(), [{ k: "board.remove", id: "brd_none" }], "missing_target");
  });

  it("takes its pins, placements, wires and runtime with it and clears the source link", () => {
    const start = blink();
    start.tests = [];
    const state = frozen(start);
    const out = accept(state, [{ k: "board.remove", id: "brd_uno" }]);
    const next = out.state;

    expect(next.boards).toEqual([]);
    expect(next.nets.map((net) => net.connections.map((c) => c.c))).toEqual([
      ["cmp_res1"],
      ["cmp_led1"],
      ["cmp_led1", "cmp_res1"],
    ]);
    expect(next.views.map((view) => view.placements.map((p) => p.c))).toEqual([
      ["cmp_bb1", "cmp_led1", "cmp_res1"],
      ["cmp_led1", "cmp_res1"],
    ]);
    expect(next.views.map((view) => view.wires.map((w) => w.id))).toEqual([[], ["wir_s2"]]);
    expect(next.simulation.runtimes).toEqual([]);
    expect(next.sources[0]).not.toHaveProperty("board");
    expect(next.nets[0]).not.toBe(state.nets[0]);
    expect(next.components).toBe(state.components);

    const [sketch] = state.sources;
    const [bb, sch] = state.views;
    expect(out.inverse).toEqual([
      { k: "source.remove", id: sketch.id },
      { k: "source.add", source: sketch },
      { k: "board.add", board: state.boards[0] },
      { k: "net.connect", net: "net_d12", pin: { c: "brd_uno", p: "D12" } },
      { k: "net.connect", net: "net_gnd", pin: { c: "brd_uno", p: "GND" } },
      { k: "runtime.set", runtime: state.simulation.runtimes[0] },
      { k: "view.place", view: "vw_bb", placement: bb.placements[0] },
      { k: "wire.add", view: "vw_bb", wire: bb.wires[0] },
      { k: "wire.add", view: "vw_bb", wire: bb.wires[1] },
      { k: "view.place", view: "vw_sch", placement: sch.placements[0] },
      { k: "wire.add", view: "vw_sch", wire: sch.wires[0] },
      { k: "wire.add", view: "vw_sch", wire: sch.wires[2] },
    ]);
    for (const op of out.inverse) expect(validateOp(op)).toBe(true);
  });
});
