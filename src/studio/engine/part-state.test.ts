// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { Project } from "../../project/generated/types.ts";
import { netlist } from "../../project/netlist.ts";
import type { PartStateEntry, PartStateFrame } from "../stores/run.ts";
import { blinkCircuit } from "../testing/blink-circuit.ts";
import type { BlinkCircuit } from "../testing/blink-circuit.ts";
import { derivePartStates, pinLevels } from "./part-state.ts";

let circuit: BlinkCircuit;
let d13: string;
let d2: string;

beforeAll(() => {
  circuit = blinkCircuit();
  const nl = netlist(circuit.project);
  d13 = nl.pinNode["brd_uno/D13"]!;
  d2 = nl.pinNode["brd_uno/D2"]!;
});

const frame = (pins: PartStateFrame["pins"], parts: PartStateEntry[] = []): PartStateFrame => ({ tNs: 1e9, pins, parts });

function withParts(): Project {
  const project = structuredClone(circuit.project);
  project.components.push(
    { id: "cmp_bz", definition: { ref: "core.buzzer-piezo", version: "1.0.0" }, refdes: "BZ1" },
    { id: "cmp_vr", definition: { ref: "core.potentiometer-10k", version: "1.0.0" }, refdes: "RV1", params: { pos: 0.25 } },
    { id: "cmp_x", definition: { ref: "core.mystery", version: "1.0.0" }, refdes: "X1" },
  );
  return project;
}

describe("derivePartStates", () => {
  it("lights an LED whose pin is high, through the series resistor, and darkens it when the pin is low", () => {
    expect(derivePartStates(circuit.project, frame({ [d13]: 1 })).get(circuit.led)).toEqual({ kind: "led", on: true, duty: 1 });
    expect(derivePartStates(circuit.project, frame({ [d13]: 0 })).get(circuit.led)).toEqual({ kind: "led", on: false, duty: 0 });
    expect(derivePartStates(circuit.project, frame({})).get(circuit.led)).toEqual({ kind: "led", on: false, duty: 0 });
  });

  it("takes PWM duty from the simulator's entry for the part", () => {
    const entry: PartStateEntry = { part: circuit.led, kind: "led", lit: true, brightness: 0.4 };
    expect(derivePartStates(circuit.project, frame({ [d13]: 1 }, [entry])).get(circuit.led)).toEqual({ kind: "led", on: true, duty: 0.4 });
    const dark: PartStateEntry = { part: circuit.led, kind: "led", lit: false, brightness: 0 };
    expect(derivePartStates(circuit.project, frame({ [d13]: 1 }, [dark])).get(circuit.led)).toEqual({ kind: "led", on: false, duty: 0 });
  });

  it("reports a button as pressed from its entry and released without one", () => {
    const pressed: PartStateEntry = { part: circuit.button, kind: "button", pressed: true };
    expect(derivePartStates(circuit.project, frame({}, [pressed])).get(circuit.button)).toEqual({ kind: "button", pressed: true });
    expect(derivePartStates(circuit.project, frame({})).get(circuit.button)).toEqual({ kind: "button", pressed: false });
  });

  it("marks a buzzer the simulator does not model as none, and reads its tone when it does", () => {
    const states = derivePartStates(withParts(), frame({}, [{ part: "cmp_bz", kind: "not-modelled", reason: "digital slice" }]));
    expect(states.get("cmp_bz")).toEqual({ kind: "none", reason: "not-modelled-yet" });
    const sounding = derivePartStates(withParts(), frame({}, [{ part: "cmp_bz", kind: "buzzer", on: true, hz: 440 }]));
    expect(sounding.get("cmp_bz")).toEqual({ kind: "buzzer", tone: 440 });
    expect(derivePartStates(withParts(), frame({}, [{ part: "cmp_bz", kind: "buzzer", on: false, hz: 440 }])).get("cmp_bz")).toEqual({
      kind: "buzzer",
      tone: null,
    });
  });

  it("gives a part with an unknown definition the not modelled mark", () => {
    expect(derivePartStates(withParts(), frame({})).get("cmp_x")).toEqual({ kind: "none", reason: "not-modelled-yet" });
  });

  it("reads the potentiometer position from its entry, else from its parameter", () => {
    expect(derivePartStates(withParts(), frame({})).get("cmp_vr")).toEqual({ kind: "pot", position: 0.25 });
    expect(derivePartStates(withParts(), frame({}, [{ part: "cmp_vr", kind: "pot", position: 0.8 }])).get("cmp_vr")).toEqual({
      kind: "pot",
      position: 0.8,
    });
  });

  it("leaves out boards, the breadboard and resistors, and drops entries for parts that are gone", () => {
    const states = derivePartStates(circuit.project, frame({}, [{ part: "cmp_gone", kind: "button", pressed: true }]));
    expect([...states.keys()].sort()).toEqual([circuit.button, circuit.led].sort());
  });
});

describe("pinLevels", () => {
  it("maps every pin on a net to its node's level, with null for what the frame does not drive", () => {
    const levels = pinLevels(circuit.project, frame({ [d13]: 1, [d2]: "Z" }));
    expect(levels.get("brd_uno/D13")).toBe(1);
    expect(levels.get(`${circuit.r1}/P1`)).toBe(1);
    expect(levels.get("brd_uno/D2")).toBeNull();
    expect(levels.get("brd_uno/GND")).toBeNull();
  });
});
