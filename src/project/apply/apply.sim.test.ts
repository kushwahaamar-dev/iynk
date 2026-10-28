// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LIMITS } from "../../core/limits.ts";
import type { Fault, Instrument, Op, Project, Runtime, WorldInput } from "../generated/types.ts";
import { validateOp } from "../generated/validate.mjs";
import { accept, deepFreeze, loadExample, refuse, roundTrip } from "./fixtures.testing.ts";

const blink = (): Project => loadExample("uno-blink-d12");
const lesson = (): Project => loadExample("lesson-uno-r3-button");
const monitor = (): Project => loadExample("env-monitor-esp32");

describe("sim.set", () => {
  it("changes the seed, the duration and the solver and undoes each", () => {
    const state = deepFreeze(blink());
    for (const [key, value] of [
      ["seed", 99],
      ["duration_ms", 8000],
      ["solver", { engine: "iynk-mna", options: { gmin: 1e-12 } }],
    ] as const) {
      const op: Op = { k: "sim.set", key, value };
      expect(accept(state, [op]).state.simulation[key]).toEqual(value);
      expect(roundTrip(state, [op])).toEqual([{ k: "sim.set", key, value: state.simulation[key] }]);
    }
  });

  it("adds and removes physics and the environment, with null standing for absent", () => {
    const state = deepFreeze(blink());
    const physics: Op = { k: "sim.set", key: "physics", value: { engine: "rapier", step_hz: 240 } };
    expect(roundTrip(state, [physics])).toEqual([{ k: "sim.set", key: "physics", value: null }]);
    const withEnv = deepFreeze(monitor());
    const drop: Op = { k: "sim.set", key: "environment", value: null };
    expect("environment" in accept(withEnv, [drop]).state.simulation).toBe(false);
    expect(roundTrip(withEnv, [drop])).toEqual([
      { k: "sim.set", key: "environment", value: withEnv.simulation.environment },
    ]);
  });

  it("refuses a seed over 32 bits, a duration the schema forbids and a null solver", () => {
    const state = deepFreeze(blink());
    refuse(state, [{ k: "sim.set", key: "seed", value: 4294967296 }], "malformed");
    refuse(state, [{ k: "sim.set", key: "seed", value: -1 }], "malformed");
    refuse(state, [{ k: "sim.set", key: "duration_ms", value: "long" }], "malformed");
    refuse(state, [{ k: "sim.set", key: "solver", value: null }], "malformed");
  });
});

describe("runtime.set and runtime.remove", () => {
  const second: Runtime = { id: "rtm_two", board: "brd_uno", engine: "iynk-interp" };

  it("adds, replaces and removes a runtime, each with its inverse", () => {
    const state = deepFreeze(blink());
    const add: Op = { k: "runtime.set", runtime: second };
    expect(accept(state, [add]).state.simulation.runtimes.map((r) => r.id)).toEqual(["rtm_main", "rtm_two"]);
    expect(roundTrip(state, [add])).toEqual([{ k: "runtime.remove", id: "rtm_two" }]);
    const replace: Op = { k: "runtime.set", runtime: { ...state.simulation.runtimes[0], engine: "avr8js" } };
    expect(roundTrip(state, [replace])).toEqual([{ k: "runtime.set", runtime: state.simulation.runtimes[0] }]);
    expect(roundTrip(state, [{ k: "runtime.remove", id: "rtm_main" }])).toEqual([
      { k: "runtime.set", runtime: state.simulation.runtimes[0] },
    ]);
  });

  it("refuses a runtime for a board that does not exist, a 17th runtime and a missing runtime", () => {
    const state = deepFreeze(blink());
    refuse(state, [{ k: "runtime.set", runtime: { ...second, board: "brd_none" } }], "missing_target");
    const full = blink();
    full.simulation.runtimes = Array.from({ length: 16 }, (_, i) => ({ ...second, id: `rtm_r${i}` }));
    refuse(deepFreeze(full), [{ k: "runtime.set", runtime: second }], "quota");
    refuse(state, [{ k: "runtime.remove", id: "rtm_none" }], "missing_target");
  });
});

describe("input.set and input.remove", () => {
  const knob: WorldInput = {
    id: "knob",
    quantity: "button",
    device: { kind: "button", pull: "external-down", bounceMs: 5 },
    component: "cmp_res1",
    pins: [{ c: "brd_uno", p: "D2" }],
    min: 0,
    max: 1,
    step: 1,
    default: 0,
    gesture: "press",
    label: "Button",
  };

  it("adds, replaces and removes an input", () => {
    const state = deepFreeze(blink());
    const add: Op = { k: "input.set", input: knob };
    expect(accept(state, [add]).state.simulation.world.inputs).toEqual([knob]);
    expect(roundTrip(state, [add])).toEqual([{ k: "input.remove", id: "knob" }]);
    const set = deepFreeze(accept(state, [add]).state);
    const replace: Op = { k: "input.set", input: { ...knob, default: 0.25 } };
    expect(roundTrip(set, [replace])).toEqual([{ k: "input.set", input: knob }]);
  });

  it("takes the script events of a removed input and puts them back", () => {
    const state = deepFreeze(lesson());
    const op: Op = { k: "input.remove", id: "button" };
    const out = accept(state, [op]);
    expect(out.state.simulation.world).toEqual({ inputs: [], script: [] });
    expect(out.inverse).toEqual([
      { k: "input.set", input: state.simulation.world.inputs[0] },
      { k: "script.set", script: state.simulation.world.script },
    ]);
    roundTrip(state, [op]);
  });

  it("refuses a missing component or pin, a 129th input and a missing input", () => {
    const state = deepFreeze(blink());
    refuse(state, [{ k: "input.set", input: { ...knob, component: "cmp_none" } }], "missing_target");
    refuse(state, [{ k: "input.set", input: { ...knob, pins: [{ c: "brd_none", p: "D2" }] } }], "missing_target");
    refuse(state, [{ k: "input.set", input: { ...knob, pins: [{ c: "brd_uno", p: "Z9" }] } }], "missing_pin");
    const full = blink();
    full.simulation.world.inputs = Array.from({ length: LIMITS.worldInputs }, (_, i) => ({ ...knob, id: `in${i}` }));
    refuse(deepFreeze(full), [{ k: "input.set", input: knob }], "quota");
    refuse(state, [{ k: "input.remove", id: "none" }], "missing_target");
  });
});

describe("script.set", () => {
  it("sorts by time, then input, keeping the order given for equal keys", () => {
    const state = deepFreeze(lesson());
    const script = [
      { t: 900, input: "button", value: 1 },
      { t: 100, input: "button", value: 0 },
      { t: 100, input: "button", value: 1 },
      { t: 100, input: "button", value: 0 },
    ];
    const out = accept(state, [{ k: "script.set", script }]);
    expect(out.state.simulation.world.script).toEqual([script[1], script[2], script[3], script[0]]);
    expect(out.inverse).toEqual([{ k: "script.set", script: state.simulation.world.script }]);
    roundTrip(state, [{ k: "script.set", script }]);
  });

  it("refuses an event for an input that does not exist and a script over the 64 KiB envelope", () => {
    const state = deepFreeze(lesson());
    refuse(state, [{ k: "script.set", script: [{ t: 0, input: "ghost", value: 1 }] }], "missing_target");
    const script = Array.from({ length: LIMITS.scriptEvents + 1 }, (_, t) => ({ t, input: "button", value: 1 }));
    refuse(state, [{ k: "script.set", script }], "quota");
  });

  it("clears the script with an empty list", () => {
    const state = deepFreeze(lesson());
    expect(accept(state, [{ k: "script.set", script: [] }]).state.simulation.world.script).toEqual([]);
  });
});

describe("fault.set and fault.remove", () => {
  const stuck: Fault = {
    id: "flt_stuck",
    cause_id: "pin-stuck",
    symptom_ids: [],
    kind: "stuck-level",
    target: { component: "brd_uno", pin: "D12" },
    enabled: false,
  };

  it("adds a fault, toggles it and removes it, each with its inverse", () => {
    const state = deepFreeze(blink());
    const add: Op = { k: "fault.set", fault: stuck };
    expect(roundTrip(state, [add])).toEqual([{ k: "fault.remove", id: "flt_stuck" }]);
    const armed = deepFreeze(accept(state, [add]).state);
    const toggle: Op = { k: "fault.set", fault: { ...stuck, enabled: true } };
    expect(accept(armed, [toggle]).state.simulation.faults.find((f) => f.id === "flt_stuck")?.enabled).toBe(true);
    expect(roundTrip(armed, [toggle])).toEqual([{ k: "fault.set", fault: stuck }]);
    expect(roundTrip(armed, [{ k: "fault.remove", id: "flt_stuck" }])).toEqual([{ k: "fault.set", fault: stuck }]);
  });

  it("accepts a fault that names nets", () => {
    const state = deepFreeze(blink());
    const fault: Fault = { ...stuck, kind: "short", target: { nets: ["net_d12", "net_gnd"] } };
    roundTrip(state, [{ k: "fault.set", fault }]);
  });

  it("refuses a missing component, pin or net, and a missing injectable part", () => {
    const state = deepFreeze(blink());
    refuse(state, [{ k: "fault.set", fault: { ...stuck, target: { component: "cmp_none" } } }], "missing_target");
    refuse(
      state,
      [{ k: "fault.set", fault: { ...stuck, target: { component: "brd_uno", pin: "Z9" } } }],
      "missing_pin",
    );
    refuse(state, [{ k: "fault.set", fault: { ...stuck, target: { net: "net_none" } } }], "missing_target");
    refuse(
      state,
      [{ k: "fault.set", fault: { ...stuck, injectable: { component: "cmp_none", id: "x" } } }],
      "missing_target",
    );
  });

  it("refuses a 201st fault and a missing fault", () => {
    const full = blink();
    full.simulation.faults = Array.from({ length: LIMITS.faults }, (_, i) => ({ ...stuck, id: `flt_f${i}` }));
    refuse(deepFreeze(full), [{ k: "fault.set", fault: stuck }], "quota");
    refuse(deepFreeze(blink()), [{ k: "fault.remove", id: "flt_none" }], "missing_target");
  });
});

describe("instrument.set and instrument.remove", () => {
  const meter: Instrument = { id: "ins_v", kind: "voltmeter", target: { net: "net_led" } };

  it("creates the list, replaces an entry and leaves no empty list behind", () => {
    const state = deepFreeze(blink());
    const add: Op = { k: "instrument.set", instrument: meter };
    expect(accept(state, [add]).state.simulation.instruments).toEqual([meter]);
    expect(roundTrip(state, [add])).toEqual([{ k: "instrument.remove", id: "ins_v" }]);
    const armed = deepFreeze(accept(state, [add]).state);
    const out = accept(armed, [{ k: "instrument.remove", id: "ins_v" }]);
    expect("instruments" in out.state.simulation).toBe(false);
    roundTrip(armed, [{ k: "instrument.set", instrument: { ...meter, kind: "ammeter" } }]);
  });

  it("refuses a 65th instrument and a missing instrument", () => {
    const full = monitor();
    full.simulation.instruments = Array.from({ length: LIMITS.instruments }, (_, i) => ({ ...meter, id: `ins_i${i}` }));
    refuse(deepFreeze(full), [{ k: "instrument.set", instrument: meter }], "quota");
    refuse(deepFreeze(blink()), [{ k: "instrument.remove", id: "ins_none" }], "missing_target");
  });
});

describe("the inverses are ops the schema accepts", () => {
  it("passes validateOp", () => {
    const state = deepFreeze(lesson());
    const out = accept(state, [
      { k: "input.remove", id: "button" },
      { k: "sim.set", key: "seed", value: 5 },
    ]);
    for (const op of out.inverse) expect(validateOp(op)).toBe(true);
  });
});
