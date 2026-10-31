// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describePart, netlistOf, viewOf } from "./circuit.fixture.ts";
import { buildNetView } from "./netlist-view.ts";

const ledOnD13 = [
  { id: "uno", ref: "uno-r3", wires: { D13: "n_sig", GND: "gnd", P5V: "n_5v" } },
  { id: "r1", ref: "resistor", wires: { P1: "n_sig", P2: "n_led" } },
  { id: "d1", ref: "led-5mm", wires: { A: "n_led", K: "gnd" } },
] as const;

describe("buildNetView", () => {
  it("classifies ground, power, signal and unknown nets", () => {
    const view = viewOf([...ledOnD13]);
    expect(view.netClass("gnd")).toBe("ground");
    expect(view.netClass("n_5v")).toBe("power");
    expect(view.netClass("n_sig")).toBe("signal");
    expect(view.netClass("n_led")).toBe("unknown");
  });

  it("answers per part and per pin", () => {
    const view = viewOf([...ledOnD13]);
    expect(view.parts()).toEqual(["uno", "r1", "d1"]);
    expect(view.isBoard("uno")).toBe(true);
    expect(view.isBoard("d1")).toBe(false);
    expect(view.category("d1")).toBe("semiconductor");
    expect(view.pin("d1", "A")).toMatchObject({ net: "n_led", type: "passive", cls: "passive", polarity: "anode" });
    expect(view.pin("d1", "nope")).toBeUndefined();
    expect(view.pinsOn("n_sig").map((p) => `${p.part}.${p.pin}`)).toEqual(["uno.D13", "uno.ICSP_3", "r1.P1"]);
    expect(view.resistorsOn("n_sig").map((p) => p.part)).toEqual(["r1"]);
  });

  it("treats nets joined by an internal-short group as one net", () => {
    const view = viewOf([
      { id: "uno", ref: "uno-r3", wires: { GND: "gnd", POWER_6: "n_b" } },
      { id: "sw", ref: "push-button-6mm", wires: { P1: "n_a", P3: "n_c" } },
      { id: "r1", ref: "resistor", wires: { P1: "n_b", P2: "n_c" } },
    ]);
    expect(view.pin("uno", "POWER_6")?.net).toBe("gnd");
    expect(view.pin("r1", "P1")?.net).toBe("gnd");
    expect(view.wireOnly("uno", "r1")).toBe(true);
    expect(view.wireOnly("sw", "r1")).toBe(true);
    expect(view.wireOnly("sw", "uno")).toBe(false);
  });

  it("gives a group pin with no net the net of its group", () => {
    const view = viewOf([{ id: "sw", ref: "push-button-6mm", wires: { P1: "n_a" } }]);
    expect(view.pin("sw", "P2")?.net).toBe("n_a");
    expect(view.pin("sw", "P3")?.net).toBeNull();
  });

  it("reads nominal volts from the power outputs of the source part", () => {
    const net = netlistOf([...ledOnD13]);
    const withSupply = buildNetView(net, (id) => {
      const d = describePart(id);
      return d?.id === "core.uno-r3"
        ? { ...d, power: { outputs: [{ id: "o5", pin: "P5V", nominal: { unit: "V" as const, value: 5 } }] } }
        : d;
    });
    expect(withSupply.nominalVolts("n_5v")).toBe(5);
    expect(withSupply.netClass("n_5v")).toBe("power");
    expect(withSupply.nominalVolts("n_sig")).toBeUndefined();
    expect(buildNetView(net, describePart).nominalVolts("n_5v")).toBeUndefined();
  });

  it("returns no descriptor for a part nobody described", () => {
    const view = buildNetView(netlistOf([...ledOnD13]), (id) => (id.startsWith("core.led") ? undefined : describePart(id)));
    expect(view.descriptor("d1")).toBeUndefined();
    expect(view.pin("d1", "A")).toMatchObject({ net: "n_led" });
    expect(view.pin("d1", "A")?.type).toBeUndefined();
    expect(view.descriptor("r1")).toBeDefined();
  });
});
