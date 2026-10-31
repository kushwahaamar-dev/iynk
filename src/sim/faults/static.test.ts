// @vitest-environment node
import { describe, expect, it } from "vitest";
import { codeOf, mode, read, viewOf, type PartSpec } from "./circuit.fixture.ts";
import { runRules } from "./rules.ts";
import { STATIC_RULES } from "./static.ts";
import type { CodeFacts } from "./types.ts";

const run = (specs: PartSpec[], code?: CodeFacts, ids?: string[]) =>
  runRules(
    STATIC_RULES.filter((r) => ids === undefined || ids.includes(r.id)),
    { view: viewOf(specs), code },
  );

const uno = (wires: Record<string, string>): PartSpec => ({ id: "uno", ref: "uno-r3", wires });
const display = (wires: Record<string, string>): PartSpec => ({ id: "oled", ref: "ssd1306", wires });
const led = (wires: Record<string, string>): PartSpec => ({ id: "d1", ref: "led-5mm", wires });
const resistor = (id: string, p1: string, p2: string): PartSpec => ({ id, ref: "resistor", wires: { P1: p1, P2: p2 } });

const okDisplay = { VCC: "n_5v", GND: "gnd", SDA: "n_sda", SCL: "n_scl" };
const board = uno({ P5V: "n_5v", GND: "gnd", SDA: "n_sda", SCL: "n_scl" });

describe("rule:open-pin@1", () => {
  const id = ["rule:open-pin@1"];

  it("finds a display with VCC unconnected", () => {
    const { VCC: _, ...wires } = okDisplay;
    const { findings } = run([board, display(wires)], undefined, id);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      causeId: "open-connection",
      symptomId: "part-dead",
      targets: [{ kind: "pin", id: "oled", pin: "VCC" }],
    });
  });

  it("finds an unconnected bus pin of a modelled protocol", () => {
    const { SDA: _, ...wires } = okDisplay;
    expect(run([board, display(wires)], undefined, id).findings.map((f) => f.targets[0]?.pin)).toEqual(["SDA"]);
  });

  it("ignores board pins, unplaced parts and passive legs", () => {
    expect(run([board, display(okDisplay)], undefined, id).findings).toEqual([]);
    expect(run([board, display({})], undefined, id).findings).toEqual([]);
    expect(run([board, led({ A: "n_5v" })], undefined, id).findings).toEqual([]);
  });
});

describe("rule:missing-ground@1", () => {
  const id = ["rule:missing-ground@1"];

  it("fires when GND is open while a power pin is connected", () => {
    const { GND: _, ...wires } = okDisplay;
    const { findings } = run([board, display(wires)], undefined, id);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ causeId: "missing-ground", targets: [{ kind: "pin", id: "oled", pin: "GND" }] });
  });

  it("fires when GND sits on a net that never reaches the ground net", () => {
    expect(run([board, display({ ...okDisplay, GND: "n_island" })], undefined, id).findings).toHaveLength(1);
  });

  it("is quiet with ground wired, with no power pin connected, and for a part without a ground pin", () => {
    expect(run([board, display(okDisplay)], undefined, id).findings).toEqual([]);
    expect(run([board, display({ SDA: "n_sda" })], undefined, id).findings).toEqual([]);
    expect(run([board, led({ A: "n_5v", K: "n_x" })], undefined, id).findings).toEqual([]);
  });
});

describe("rule:rail-short@1", () => {
  const id = ["rule:rail-short@1"];

  it("fires on a wire between 5V and GND", () => {
    const { findings } = run([uno({ P5V: "gnd", GND: "gnd" })], undefined, id);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ causeId: "supply-shorted-to-ground", symptomId: "supply-collapses" });
  });

  it("is quiet with a part between the rails, including a jumper that joins two grounds", () => {
    const loaded = [uno({ P5V: "n_5v", GND: "gnd" }), resistor("r1", "n_5v", "gnd")];
    expect(run(loaded, undefined, id).findings).toEqual([]);
    const jumper = [uno({ P5V: "n_5v", GND: "gnd", POWER_6: "n_g2" }), resistor("j1", "gnd", "n_g2")];
    expect(run(jumper, undefined, id).findings).toEqual([]);
  });
});

describe("rule:contention@1", () => {
  const id = ["rule:contention@1"];
  const joined = [uno({ D8: "n_x", D9: "n_x", GND: "gnd" })];

  it("fires when two pins the code sets to OUTPUT share a net", () => {
    const { findings } = run(joined, codeOf({ pinModes: [mode("8", "OUTPUT"), mode("9", "OUTPUT")] }), id);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ causeId: "output-contention", symptomId: "pin-level-wrong" });
    expect(findings[0]?.targets).toContainEqual({ kind: "pin", id: "uno", pin: "D9" });
  });

  it("does not count a pin whose mode is unknown or an input", () => {
    expect(run(joined, undefined, id).findings).toEqual([]);
    expect(run(joined, codeOf({ pinModes: [mode("8", "OUTPUT"), mode("9", "INPUT")] }), id).findings).toEqual([]);
  });

  it("does not count one pin twice through its ICSP twin", () => {
    const one = [uno({ D13: "n_x", ICSP_3: "n_x" })];
    expect(run(one, codeOf({ pinModes: [mode("13", "OUTPUT")] }), id).findings).toEqual([]);
  });

  it("ignores open-drain pins", () => {
    const bus = [board, display(okDisplay), { id: "oled2", ref: "ssd1306", wires: okDisplay } as PartSpec];
    expect(run(bus, undefined, id).findings).toEqual([]);
  });
});

describe("rule:floating-input@1", () => {
  const id = ["rule:floating-input@1"];
  const reads = codeOf({ pinReads: [read("2")], pinModes: [mode("2", "INPUT")] });

  it("fires on a pin that is read and not connected, or on a stub", () => {
    const { findings } = run([uno({ GND: "gnd" })], reads, id);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ causeId: "floating-input", symptomId: "reading-erratic" });
    expect(run([uno({ D2: "n_stub" })], reads, id).findings).toHaveLength(1);
  });

  it("is quiet with INPUT_PULLUP, a resistor, a rail, a driver or a potentiometer", () => {
    const pullup = codeOf({ pinReads: [read("2")], pinModes: [mode("2", "INPUT_PULLUP")] });
    expect(run([uno({ GND: "gnd" })], pullup, id).findings).toEqual([]);
    expect(run([uno({ D2: "n_a", P5V: "n_5v" }), resistor("r1", "n_a", "n_5v")], reads, id).findings).toEqual([]);
    expect(run([uno({ D2: "gnd" })], reads, id).findings).toEqual([]);
    const sensor = { id: "s1", ref: "ssd1306", wires: { VCC: "n_5v", GND: "gnd" } } as PartSpec;
    expect(run([uno({ D2: "n_a", P5V: "n_5v", GND: "gnd" }), sensor], reads, id).findings).toHaveLength(1);
    const pot: PartSpec = { id: "p1", ref: "potentiometer-10k", wires: { P1: "n_5v", W: "n_a", P3: "gnd" } };
    expect(run([uno({ D2: "n_a", P5V: "n_5v", GND: "gnd" }), pot], reads, id).findings).toEqual([]);
  });

  it("leaves a button with no pull to rule:button-no-pull@1", () => {
    const button: PartSpec = { id: "sw", ref: "push-button-6mm", wires: { P1: "n_a", P3: "gnd" } };
    expect(run([uno({ D2: "n_a", GND: "gnd" }), button], reads, id).findings).toEqual([]);
  });
});

describe("rule:button-no-pull@1", () => {
  const id = ["rule:button-no-pull@1"];
  const reads = codeOf({ pinReads: [read("2")], pinModes: [mode("2", "INPUT")] });
  const button: PartSpec = { id: "sw", ref: "push-button-6mm", wires: { P1: "n_a", P3: "n_5v" } };
  const wired = uno({ D2: "n_a", P5V: "n_5v", GND: "gnd" });

  it("fires on a button between the pin and a rail with nothing to pull the pin back", () => {
    const { findings } = run([wired, button], reads, id);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ causeId: "button-no-pulldown", symptomId: "button-erratic" });
    expect(findings[0]?.targets).toContainEqual({ kind: "part", id: "sw" });
  });

  it("is quiet when a resistor reaches the other rail", () => {
    expect(run([wired, button, resistor("r1", "n_a", "gnd")], reads, id).findings).toEqual([]);
  });

  it("is quiet for INPUT_PULLUP and when the other contact is not on a rail", () => {
    const pullup = codeOf({ pinReads: [read("2")], pinModes: [mode("2", "INPUT_PULLUP")] });
    expect(run([wired, button], pullup, id).findings).toEqual([]);
    const loose: PartSpec = { id: "sw", ref: "push-button-6mm", wires: { P1: "n_a", P3: "n_other" } };
    expect(run([wired, loose], reads, id).findings).toEqual([]);
  });

  it("is skipped without code", () => {
    const result = run([wired, button], undefined, id);
    expect(result.findings).toEqual([]);
    expect(result.skipped["rule:button-no-pull@1"]).toEqual({ "no-code": 1 });
  });
});

describe("a clean set", () => {
  const reads = (pin: string, m: "INPUT" | "INPUT_PULLUP") => codeOf({ pinReads: [read(pin)], pinModes: [mode(pin, m)] });
  const power = { P5V: "n_5v", GND: "gnd" };
  const circuits: Array<{ name: string; specs: PartSpec[]; code?: CodeFacts }> = [
    { name: "blink", specs: [uno({ ...power, D13: "n_s" }), resistor("r1", "n_s", "n_l"), led({ A: "n_l", K: "gnd" })], code: codeOf({ pinModes: [mode("13", "OUTPUT")] }) },
    { name: "led on 5V", specs: [uno(power), resistor("r1", "n_5v", "n_l"), led({ A: "n_l", K: "gnd" })] },
    { name: "button pull-down", specs: [uno({ ...power, D2: "n_a" }), { id: "sw", ref: "push-button-6mm", wires: { P1: "n_a", P3: "n_5v" } }, resistor("r1", "n_a", "gnd")], code: reads("2", "INPUT") },
    { name: "button pull-up", specs: [uno({ ...power, D2: "n_a" }), { id: "sw", ref: "push-button-6mm", wires: { P1: "n_a", P3: "gnd" } }, resistor("r1", "n_a", "n_5v")], code: reads("2", "INPUT") },
    { name: "button input pullup", specs: [uno({ ...power, D2: "n_a" }), { id: "sw", ref: "push-button-6mm", wires: { P1: "n_a", P3: "gnd" } }], code: reads("2", "INPUT_PULLUP") },
    { name: "potentiometer", specs: [uno({ ...power, A0: "n_w" }), { id: "p1", ref: "potentiometer-10k", wires: { P1: "n_5v", W: "n_w", P3: "gnd" } }], code: codeOf({ pinReads: [read("A0", "analogRead")] }) },
    { name: "buzzer", specs: [uno({ ...power, D8: "n_b" }), { id: "bz", ref: "buzzer-piezo", wires: { PLUS: "n_b", MINUS: "gnd" } }], code: codeOf({ pinModes: [mode("8", "OUTPUT")] }) },
    { name: "oled", specs: [board, display(okDisplay)] },
    { name: "two leds", specs: [uno({ ...power, D12: "n_s1", D13: "n_s2" }), resistor("r1", "n_s1", "n_l1"), led({ A: "n_l1", K: "gnd" }), resistor("r2", "n_s2", "n_l2"), { id: "d2", ref: "led-5mm", wires: { A: "n_l2", K: "gnd" } }], code: codeOf({ pinModes: [mode("12", "OUTPUT"), mode("13", "OUTPUT")] }) },
    { name: "oled and button", specs: [uno({ P5V: "n_5v", GND: "gnd", SDA: "n_sda", SCL: "n_scl", D2: "n_a" }), display(okDisplay), { id: "sw", ref: "push-button-6mm", wires: { P1: "n_a", P3: "gnd" } }], code: reads("2", "INPUT_PULLUP") },
  ];

  it.each(circuits)("reports nothing on $name", ({ specs, code }) => {
    const result = run(specs, code);
    expect(result.errors).toEqual([]);
    expect(result.findings).toEqual([]);
  });
});
