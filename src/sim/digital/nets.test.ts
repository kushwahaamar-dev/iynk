// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { PartKind, SimNetlist, SimPart } from "../engine.ts";
import { createDigitalNets } from "./nets.ts";

const part = (id: string, kind: PartKind, pins: SimPart["pins"]): SimPart => ({ id, descriptor: `test.${kind}@1.0.0`, params: {}, pins, kind });

const BOARD = part("brd", "board", { D2: "n_d2", D12: "n_d12", GND: "gnd", P5V: "vcc" });
const RES = part("r1", "resistor", { P1: "n_d12", P2: "n_led" });
const LED = part("led", "led", { A: "n_led", K: "gnd" });

function netlist(...parts: SimPart[]): SimNetlist {
  const ids = new Set(parts.flatMap((p) => Object.values(p.pins).filter((n): n is string => n !== null)));
  return {
    version: 1,
    docHash: "0",
    nets: [...ids].map((id) => ({ id })),
    ground: "gnd",
    parts,
    settings: { seed: 1, toleranceMode: "nominal", analog: { mode: "dc-event", stepNs: 1000 }, speed: 1 },
  };
}

function loaded(...parts: SimPart[]) {
  const nets = createDigitalNets();
  nets.load(netlist(...parts));
  return nets;
}

const ledOf = (nets: ReturnType<typeof loaded>) => nets.partStates().find((s) => s.part === "led");

describe("DP-1 LED", () => {
  it("lights while the pin is high and not while it is low", () => {
    const nets = loaded(BOARD, RES, LED);
    expect(ledOf(nets)).toMatchObject({ lit: false, brightness: 0 });
    nets.onPin("D12", 1, undefined, 0);
    expect(ledOf(nets)).toEqual({ part: "led", kind: "led", lit: true, brightness: 1, provenance: "approximation", tier: "T0" });
    nets.onPin("D12", 0, undefined, 500);
    expect(ledOf(nets)).toMatchObject({ lit: false, brightness: 0 });
  });

  it("takes its brightness from the PWM duty", () => {
    const nets = loaded(BOARD, RES, LED);
    nets.onPin("D12", 1, 0.25, 0);
    expect(ledOf(nets)).toMatchObject({ lit: true, brightness: 0.25 });
  });

  it("stays dark when reversed", () => {
    const nets = loaded(BOARD, RES, part("led", "led", { A: "gnd", K: "n_led" }));
    nets.onPin("D12", 1, undefined, 0);
    expect(ledOf(nets)).toMatchObject({ lit: false });
  });

  it("stays dark with one leg open and says so", () => {
    const nets = createDigitalNets();
    const diagnostics = nets.load(netlist(BOARD, RES, part("led", "led", { A: "n_led", K: null })));
    nets.onPin("D12", 1, undefined, 0);
    expect(ledOf(nets)).toMatchObject({ lit: false });
    expect(diagnostics).toMatchObject([{ id: "open-connection", ref: { part: "led" } }]);
  });

  it("passes the level through a chain of resistors and ends on a loop", () => {
    const loop = [part("r2", "resistor", { P1: "n_led", P2: "n_d12" }), part("r3", "resistor", { P1: "n_led", P2: "n_mid" }), part("r4", "resistor", { P1: "n_mid", P2: "n_d12" })];
    const nets = loaded(BOARD, RES, LED, ...loop);
    nets.onPin("D12", 1, undefined, 0);
    expect(ledOf(nets)).toMatchObject({ lit: true });
  });
});

describe("DP-1 button", () => {
  const button = part("sw", "button", { P1: "n_d2", P2: "n_d2", P3: "gnd", P4: "gnd" });
  const pullUp = part("r9", "resistor", { P1: "n_d2", P2: "vcc" });

  it("reads low when pressed and high through the pull-up when released", () => {
    const nets = loaded(BOARD, pullUp, button);
    expect(nets.levelOf("n_d2")).toBe(1);
    nets.press("sw", true);
    expect(nets.levelOf("n_d2")).toBe(0);
    expect(nets.partStates()).toContainEqual({ part: "sw", kind: "button", pressed: true });
    nets.press("sw", false);
    expect(nets.levelOf("n_d2")).toBe(1);
  });

  it("reads Z with no pull-up and nothing pressed", () => {
    expect(loaded(BOARD, button).levelOf("n_d2")).toBe("Z");
  });

  it("has no effect between two nets that nothing drives, and notes it", () => {
    const nets = createDigitalNets();
    const lone = part("sw", "button", { P1: "x", P2: "x", P3: "y", P4: "y" });
    expect(nets.load(netlist(BOARD, lone))).toMatchObject([{ id: "inert-button", severity: "note" }]);
    nets.press("sw", true);
    expect(nets.levelOf("x")).toBe("Z");
    expect(nets.levelOf("y")).toBe("Z");
  });
});

describe("DP-1 contention and other parts", () => {
  it("gives X and output-contention when two strong drivers disagree", () => {
    const nets = loaded(BOARD, part("sw", "button", { P1: "n_d12", P2: "n_d12", P3: "gnd", P4: "gnd" }));
    nets.press("sw", true);
    nets.onPin("D12", 1, undefined, 0);
    expect(nets.levelOf("n_d12")).toBe("X");
    expect(nets.diagnostics()).toMatchObject([{ id: "output-contention", ref: { net: "n_d12" } }]);
    nets.onPin("D12", 0, undefined, 10);
    nets.onPin("D12", 1, undefined, 20);
    expect(nets.diagnostics()).toHaveLength(1);
  });

  it("marks a pot as not modelled", () => {
    const nets = loaded(BOARD, part("pot", "pot", { P1: "vcc", W: "n_d2", P3: "gnd" }));
    expect(nets.partStates()).toEqual([{ part: "pot", kind: "not-modelled", reason: "needs the solver" }]);
  });

  it("turns a buzzer on for a high pin or a toggling pin and reports the pitch", () => {
    const buzzer = part("bz", "buzzer", { PLUS: "n_d12", MINUS: "gnd" });
    const nets = loaded(BOARD, buzzer);
    expect(nets.partStates()).toMatchObject([{ kind: "buzzer", on: false, hz: 0 }]);
    nets.onPin("D12", 1, undefined, 0);
    expect(nets.partStates()).toMatchObject([{ on: true, hz: 0 }]);
    nets.onPin("D12", 0, undefined, 500_000);
    nets.onPin("D12", 1, undefined, 1_000_000);
    nets.onPin("D12", 0, undefined, 1_500_000);
    expect(nets.partStates()).toMatchObject([{ on: true, hz: 1000, provenance: "approximation", tier: "T0" }]);
  });

  it("hashes the same for the same history and differently after a change", () => {
    const run = (level: 0 | 1) => {
      const nets = loaded(BOARD, RES, LED);
      nets.onPin("D12", level, undefined, 0);
      return nets.stateHash();
    };
    expect(run(1)).toBe(run(1));
    expect(run(1)).not.toBe(run(0));
  });
});
