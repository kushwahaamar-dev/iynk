// @vitest-environment node
import { describe, expect, it } from "vitest";
import { builtinRegistry } from "@/parts/builtin";
import { loadExample } from "@/project/apply/fixtures.testing";
import type { WorldInput } from "@/project/generated/types";
import { getProfile } from "@/lib/interp/profiles";
import { createDigitalNets } from "@/sim/digital/nets";
import type { PartKind, ProgramImage, SimNetlist, SimPart, SimRunOptions, SliceBudget } from "@/sim/engine";
import { buildSimNetlist } from "@/sim/netlist";
import { createOrchestrator } from "@/sim/orchestrator";
import { bindWorld } from "./bind";
import { createInterpEngine } from "./interp-engine";

const MS = 1_000_000;
const BUDGET: SliceBudget = { shouldYield: () => false, work: { statements: Infinity, events: Infinity, outputBytes: Infinity } };
const OPTS: SimRunOptions = { seed: 1, speed: 1, limits: { statements: 4_000_000, events: 100_000, outputBytes: 65_536 }, tier: "T1" };

const image = (text: string): ProgramImage => ({ kind: "source", language: "arduino-cpp", files: [{ path: "main", text }], entry: "main" });

const part = (id: string, kind: PartKind, pins: SimPart["pins"]): SimPart => ({ id, descriptor: `test.${kind}@1.0.0`, params: {}, pins, kind });

function withButtonOn(pin: "D2" | "D3"): SimNetlist {
  const parts = [part("brd", "board", { D2: "n2", D3: "n3", GND: "gnd" }), part("sw", "button", { P1: pin === "D2" ? "n2" : "n3", P2: pin === "D2" ? "n2" : "n3", P3: "gnd", P4: "gnd" })];
  return {
    version: 1,
    docHash: "0",
    nets: ["n2", "n3", "gnd"].map((id) => ({ id })),
    ground: "gnd",
    parts,
    settings: { seed: 1, toleranceMode: "nominal", analog: { mode: "dc-event", stepNs: 1000 }, speed: 1 },
  };
}

const BUTTON: WorldInput = {
  id: "in_button",
  quantity: "button",
  device: { kind: "button", pull: "internal-up", bounceMs: 0 },
  component: "sw",
  min: 0,
  max: 1,
  step: 1,
  default: 0,
  gesture: "press",
  label: { en: "Button" },
};

const READ_PINS = `void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(3, INPUT_PULLUP);
}
void loop() {}
`;

describe("bindWorld", () => {
  function bound(pin: "D2" | "D3") {
    const engine = createInterpEngine({ id: "mcu", board: "uno-r3", language: "arduino", seed: 1 });
    expect(engine.load(image(READ_PINS)).ok).toBe(true);
    const { binding, inputs } = bindWorld(engine, withButtonOn(pin), [BUTTON], getProfile("uno-r3"));
    expect(inputs[0].pins).toEqual([pin]);
    return { engine, press: () => binding.apply(inputs[0], 1) };
  }

  it("presses the pin the button's wire reaches", () => {
    const { engine, press } = bound("D2");
    engine.advanceTo(2 * MS, BUDGET);
    expect(engine.pins.read(2).level).toBe(1);
    press();
    expect(engine.pins.read(2).level).toBe(0);
    expect(engine.pins.read(3).level).toBe(1);
  });

  it("presses another pin when the wire is moved", () => {
    const { engine, press } = bound("D3");
    engine.advanceTo(2 * MS, BUDGET);
    press();
    expect(engine.pins.read(3).level).toBe(0);
    expect(engine.pins.read(2).level).toBe(1);
  });
});

const BLINK_D13 = `void setup() { pinMode(13, OUTPUT); }
void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}
`;

describe("Blink through the document", () => {
  function runBlink(wire: "D12" | "D13") {
    const doc = loadExample("uno-blink-d12");
    doc.nets.find((n) => n.id === "net_d12")!.connections.find((c) => c.c === "brd_uno")!.p = wire;
    const { net, diagnostics } = buildSimNetlist(doc, builtinRegistry());
    expect(diagnostics).toEqual([]);
    const engine = createInterpEngine({ id: "mcu", board: "uno-r3", language: "arduino", seed: 1 });
    expect(engine.load(image(BLINK_D13)).ok).toBe(true);
    const digital = createDigitalNets();
    const orch = createOrchestrator({ engines: [engine], digital });
    expect(orch.load(net, OPTS).ok).toBe(true);
    const litAt = (ms: number): boolean => {
      orch.runUntil(ms * MS, BUDGET);
      const led = digital.partStates().find((s) => s.part === "cmp_led1");
      return led?.kind === "led" && led.lit;
    };
    return [litAt(250), litAt(750), litAt(1250)];
  }

  it("lights the LED in the high half when the wire is on the pin the sketch writes", () => {
    expect(runBlink("D13")).toEqual([true, false, true]);
  });

  it("leaves the LED dark when the wire is on another pin", () => {
    expect(runBlink("D12")).toEqual([false, false, false]);
  });
});
