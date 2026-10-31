// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BoardGenError, buildBoardDescriptor, pinsFromPinout } from "./testing/board-gen.ts";
import type { PinRowLike } from "./testing/board-gen.ts";

const row = (header: string, pin: string, label: string, caps: string[], volts: number | null, net?: string): PinRowLike => ({
  header,
  pin,
  label,
  caps,
  volts,
  net,
});

const ROWS: PinRowLike[] = [
  row("J2", "2", "3V3", ["power"], 3.3, "3V3"),
  row("J1", "2", "GND", ["gnd"], null, "GND"),
  row("J1", "10", "5V", ["power"], 5, "5V"),
  row("J1", "1", "GND", ["gnd"], null, "GND"),
  row("J2", "1", "IO4", ["digital", "pwm"], 3.3, "GPIO4"),
  row("J2", "3", "IO34", ["digital", "input-only"], 3.3, "GPIO34"),
  row("J2", "4", "AREF", [], null, "AREF"),
  row("J2", "5", "EN", ["reset"], 3.3),
];

const build = (pinout: PinRowLike[] = ROWS) =>
  buildBoardDescriptor({ id: "test-board", maker: "Acme", model: "Test", languages: ["arduino"], pinout, logicV: 3.3 });

describe("pinsFromPinout", () => {
  it("sorts by connector then numeric position and renames clashes and leading digits", () => {
    expect(pinsFromPinout(ROWS).map((p) => `${p.connector}:${p.id}`)).toEqual([
      "J1:GND",
      "J1:J1_2",
      "J1:P5V",
      "J2:GPIO4",
      "J2:P3V3",
      "J2:GPIO34",
      "J2:AREF",
      "J2:EN",
    ]);
  });

  it("maps capabilities to pin types", () => {
    const types = Object.fromEntries(pinsFromPinout(ROWS).map((p) => [p.id, p.type]));
    expect(types).toMatchObject({ GND: "ground", P3V3: "power_io", GPIO4: "digital_io", AREF: "analog_in", EN: "digital_in" });
  });

  it("throws when a row has no name", () => {
    expect(() => pinsFromPinout([row("J1", "1", "", ["digital"], 3.3)])).toThrow(BoardGenError);
  });

  it("throws when the clash name is taken too", () => {
    const rows = [row("J1", "1", "A", ["digital"], 3.3, "J1_2"), row("J1", "2", "B", ["digital"], 3.3, "J1_2")];
    expect(() => pinsFromPinout(rows)).toThrow(expect.objectContaining({ code: "duplicate-pin", detail: "J1_2" }));
  });
});

describe("buildBoardDescriptor", () => {
  it("joins every ground pin into one internal-short group", () => {
    expect(build().groups).toEqual([{ id: "g_GND", kind: "internal-short", pins: ["GND", "J1_2"] }]);
  });

  it("sets logic family from the row and notes input-only pins", () => {
    const pins = Object.fromEntries(build().pins.map((p) => [p.id, p]));
    expect(pins.GPIO4?.logic_family).toBe("lvcmos-3v3");
    expect(pins.GPIO34?.note?.en).toMatch(/input only/i);
    expect(pins.P5V?.logic_family).toBeUndefined();
  });

  it("lists the pins of each connector in order", () => {
    expect(build().connectors?.map((c) => [c.id, c.pins.length])).toEqual([["J1", 3], ["J2", 5]]);
  });

  it("makes one pin per bit from FPGA ports when there are no pinout rows", () => {
    const draft = buildBoardDescriptor({
      id: "fpga",
      maker: "Acme",
      model: "F",
      languages: ["verilog"],
      pinout: [],
      logicV: 3.3,
      fpgaPorts: [{ name: "clk", dir: "in", width: 1 }, { name: "led", dir: "out", width: 2 }],
    });
    expect(draft.pins.map((p) => `${p.id}:${p.type}`)).toEqual(["clk:digital_in", "led0:digital_out", "led1:digital_out"]);
    expect(draft.identity.category).toBe("fpga");
  });

  it("gives identical bytes on two runs and on a shuffled pinout", () => {
    const a = JSON.stringify(build());
    expect(JSON.stringify(build())).toBe(a);
    expect(JSON.stringify(build([...ROWS].reverse()))).toBe(a);
  });
});
