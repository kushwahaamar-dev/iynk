// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Op, Project, TestCase } from "../generated/types.ts";
import { stateHash } from "../hash.ts";
import { drawnBlink } from "./drawn.testing.ts";
import { accept, ctxFor, deepFreeze, loadExample } from "./fixtures.testing.ts";

/** Applies `ops`, then the inverse the apply returned, and checks that the hash is back and the revision is not. */
function cycle(state: Project, ops: Op[]): Op[] {
  const forward = accept(state, ops);
  expect(stateHash(forward.state)).not.toBe(stateHash(state));
  const back = accept(forward.state, forward.inverse, ctxFor());
  expect(stateHash(back.state)).toBe(stateHash(state));
  expect(back.state.revision).not.toBe(state.revision);
  return forward.inverse;
}

const lesson = (): Project => loadExample("lesson-uno-r3-button");

describe("component.remove", () => {
  it("restores the lesson after cmp_led1 goes", () => {
    const state = deepFreeze(accept(lesson(), [{ k: "test.remove", id: "main" }]).state);
    const inverse = cycle(state, [{ k: "component.remove", id: "cmp_led1" }]);
    expect(inverse.length).toBeGreaterThan(1);
  });

  it("restores a component with a world input, a fault, an instrument and a mount", () => {
    const base = accept(loadExample("robot-line-follower"), [
      { k: "fault.remove", id: "flt_sensor_high" },
      {
        k: "fault.set",
        fault: {
          id: "flt_motor",
          cause_id: "motor-dead",
          symptom_ids: [],
          kind: "missing-part",
          target: { component: "cmp_motor_l" },
          enabled: true,
        },
      },
      { k: "instrument.set", instrument: { id: "ins_i", kind: "ammeter", target: { component: "cmp_motor_l" } } },
      { k: "mech.remove", collection: "joints", id: "jnt_wheel_l" },
    ]).state;
    cycle(deepFreeze(base), [{ k: "component.remove", id: "cmp_motor_l" }]);
  });
});

describe("board.remove", () => {
  /** The lesson with a fault and an instrument aimed at the board, a second source, and no test naming its pins. */
  function boardFixture(): Project {
    return deepFreeze(
      accept(lesson(), [
        { k: "test.remove", id: "main" },
        {
          k: "fault.set",
          fault: {
            id: "flt_pin",
            cause_id: "pin-stuck",
            symptom_ids: [],
            kind: "stuck-level",
            target: { component: "brd_uno", pin: "D13" },
            enabled: false,
          },
        },
        { k: "instrument.set", instrument: { id: "ins_s", kind: "serial-monitor", target: { component: "brd_uno" } } },
        {
          k: "source.add",
          source: {
            id: "src_util",
            path: "util.h",
            language: "cpp",
            role: "firmware",
            board: "brd_uno",
            content: "int x;\n",
          },
        },
      ]).state,
    );
  }

  it("restores the board with its runtime, input, fault, instrument and sources", () => {
    const state = boardFixture();
    const inverse = cycle(state, [{ k: "board.remove", id: "brd_uno" }]);
    expect(inverse.map((op) => op.k)).toEqual(
      expect.arrayContaining(["board.add", "runtime.set", "input.set", "fault.set", "instrument.set", "source.add"]),
    );
  });

  it("keeps the sources when the board goes, with the board cleared", () => {
    const out = accept(boardFixture(), [{ k: "board.remove", id: "brd_uno" }]);
    expect(out.state.sources.map((s) => [s.id, s.board])).toEqual([
      ["src_sketch", undefined],
      ["src_util", undefined],
    ]);
  });
});

describe("net ops", () => {
  const withNetUsers = (): Project =>
    deepFreeze(
      accept(lesson(), [
        { k: "label.set", view: "vw_bb", label: { id: "lbl_d2", text: "D2", x_mm: 1, y_mm: 2, net: "net_d2" } },
        {
          k: "fault.set",
          fault: {
            id: "flt_short",
            cause_id: "short",
            symptom_ids: [],
            kind: "short",
            target: { nets: ["net_d2", "net_gnd"] },
            enabled: false,
          },
        },
        {
          k: "test.set",
          test: {
            id: "volts",
            name: "Rail",
            runMs: 1000,
            checks: [
              {
                id: "v1",
                kind: "node-voltage",
                atMs: 100,
                net: "net_d2",
                volts: [4.5, 5.5],
                visibility: "visible",
                label: "d2",
              },
            ],
          } as TestCase,
        },
      ]).state,
    );

  it("net.merge with a wire, a label, a fault and a check on the merged net", () => {
    cycle(withNetUsers(), [{ k: "net.merge", into: "net_d13", from: "net_d2" }]);
  });

  it("net.delete with a label and a fault", () => {
    const state = deepFreeze(accept(withNetUsers(), [{ k: "test.remove", id: "volts" }]).state);
    cycle(state, [{ k: "net.delete", id: "net_d2" }]);
  });

  it("net.disconnect", () => {
    cycle(deepFreeze(lesson()), [{ k: "net.disconnect", pin: { c: "cmp_led1", p: "A" } }]);
  });

  it("net.rename and a disconnect that leaves the net standing", () => {
    const state = deepFreeze(lesson());
    cycle(state, [{ k: "net.rename", id: "net_d2", name: "Button line" }]);
    cycle(state, [{ k: "net.disconnect", pin: { c: "cmp_btn1", p: "P1" } }]);
  });
});

describe("view.remove", () => {
  it("restores a view with its wires, junctions, labels and groups", () => {
    const state = deepFreeze(drawnBlink());
    cycle(state, [{ k: "view.remove", id: "vw_sch" }]);
  });
});
