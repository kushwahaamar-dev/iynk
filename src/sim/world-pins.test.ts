// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { WorldInput } from "../project/generated/types.ts";
import type { PartKind, SimNetlist, SimPart } from "./engine.ts";
import { deriveInputPins } from "./world-pins.ts";

const part = (id: string, kind: PartKind, pins: SimPart["pins"]): SimPart => ({ id, descriptor: `test.${kind}@1.0.0`, params: {}, pins, kind });

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

const input = (component: string, device: WorldInput["device"], pins?: WorldInput["pins"]): WorldInput => ({
  id: "in1",
  quantity: device.kind === "hc-sr04" ? "distance-cm" : "button",
  device,
  component,
  ...(pins ? { pins } : {}),
  min: 0,
  max: 1,
  step: 1,
  default: 0,
  gesture: "tap",
  label: { en: "Input" },
});

const BUTTON: WorldInput["device"] = { kind: "button", pull: "internal-up", bounceMs: 0 };

describe("deriveInputPins", () => {
  it("finds the board pin a button sits on, once, and skips ground", () => {
    const net = netlist(
      part("brd", "board", { D2: "n2", D3: "n3", GND: "gnd" }),
      part("sw", "button", { P1: "n2", P2: "n2", P3: "gnd", P4: "gnd" }),
    );
    expect(deriveInputPins(net, input("sw", BUTTON))).toEqual({ pins: ["D2"], diagnostics: [] });
  });

  it("follows the wire when it moves", () => {
    const net = netlist(
      part("brd", "board", { D2: "n2", D3: "n3", GND: "gnd" }),
      part("sw", "button", { P1: "n3", P2: "n3", P3: "gnd", P4: "gnd" }),
    );
    expect(deriveInputPins(net, input("sw", BUTTON)).pins).toEqual(["D3"]);
  });

  it("gives trig then echo for an HC-SR04, in the part's pin order", () => {
    const net = netlist(
      part("brd", "board", { D7: "n7", D8: "n8", GND: "gnd", P5V: "vcc" }),
      part("sonar", "other", { VCC: "vcc", TRIG: "n8", ECHO: "n7", GND: "gnd" }),
    );
    expect(deriveInputPins(net, input("sonar", { kind: "hc-sr04" })).pins).toEqual(["D8", "D7"]);
  });

  it("uses the pins an input lists instead of every pin of the part", () => {
    const net = netlist(
      part("brd", "board", { D7: "n7", D8: "n8", GND: "gnd" }),
      part("sonar", "other", { TRIG: "n8", ECHO: "n7" }),
    );
    expect(deriveInputPins(net, input("sonar", { kind: "hc-sr04" }, [{ c: "sonar", p: "ECHO" }])).pins).toEqual(["D7"]);
  });

  it("reports two board pins on one net and takes none from it", () => {
    const net = netlist(
      part("brd", "board", { D2: "n2", D3: "n2" }),
      part("sw", "button", { P1: "n2", P2: "n2", P3: "gnd", P4: "gnd" }),
    );
    const { pins, diagnostics } = deriveInputPins(net, input("sw", BUTTON));
    expect(pins).toEqual([]);
    expect(diagnostics).toMatchObject([{ id: "ambiguous-input-pin", ref: { part: "sw", net: "n2" } }]);
  });

  it("reports a component the netlist does not have", () => {
    const net = netlist(part("brd", "board", { D2: "n2" }));
    expect(deriveInputPins(net, input("ghost", BUTTON))).toMatchObject({ pins: [], diagnostics: [{ id: "unknown-part", ref: { part: "ghost" } }] });
  });
});
