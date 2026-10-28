// @vitest-environment node
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PIN_ID_PATTERN } from "../core/ids.ts";
import { boardGroups, boardPinIds, cleanName, pinIdFromLeg } from "./legacy-names.ts";
import type { BoardPinRow } from "./legacy-names.ts";

const root = new URL("../../", import.meta.url);

describe("cleanName", () => {
  it.each([
    ["5V", "P5V"],
    ["3V3", "P3V3"],
    ["J2.16", "J2_16"],
    ["  A-B  ", "A_B"],
    ["GPIO 4 (SDA)", "GPIO_4_SDA"],
  ])("%s becomes %s", (from, to) => {
    expect(cleanName(from)).toBe(to);
  });
});

describe("pinIdFromLeg (rule C-LEG)", () => {
  it.each([
    ["+", "PLUS"],
    ["-", "MINUS"],
    ["V+", "VPLUS"],
    ["+VS", "PLUS_VS"],
    ["T+", "RAIL_TP"],
    ["T-", "RAIL_TN"],
    ["B+", "RAIL_BP"],
    ["B-", "RAIL_BN"],
    ["T+12", "RAIL_TP12"],
    ["B-3", "RAIL_BN3"],
    ["IN-1", "IN_1"],
    ["1", "P1"],
    ["A", "A"],
    ["GND", "GND"],
    ["a14", "a14"],
  ])("%s becomes %s", (from, to) => {
    expect(pinIdFromLeg(from)).toBe(to);
  });
});

describe("boardPinIds and boardGroups (rule C-PIN)", () => {
  const rows: BoardPinRow[] = [
    { header: "POWER", pin: "5", net: "5V" },
    { header: "POWER", pin: "6", net: "GND" },
    { header: "ICSP", pin: "2", net: "5V" },
    { header: "ICSP", pin: "9" },
    { header: "ICSP", pin: "6", net: "GND" },
  ];

  it("names the first row of a net by the net and later rows by header and pin", () => {
    expect(boardPinIds(rows)).toEqual(["P5V", "GND", "ICSP_2", "ICSP_9", "ICSP_6"]);
  });

  it("groups the pins that share a net name", () => {
    const groups = boardGroups(rows, boardPinIds(rows));
    expect(groups).toEqual([
      { id: "g_P5V", kind: "internal-short", pins: ["P5V", "ICSP_2"] },
      { id: "g_GND", kind: "internal-short", pins: ["GND", "ICSP_6"] },
    ]);
  });
});

const BOARDS = [
  "basys3", "de10-lite", "esp32-devkitc", "esp32-s3-devkitc-1", "microbit-v2", "nano",
  "nodemcu", "nucleo-f401re", "pi4-pi5", "pico", "uno-r3", "uno-r4",
];

function pinoutOf(id: string): BoardPinRow[] {
  const out = execFileSync(process.execPath, ["scripts/gen-content-index.mjs", "--emit", `board/${id}`], {
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
  });
  return (JSON.parse(out.toString()) as { data: { pinout: BoardPinRow[] } }).data.pinout;
}

describe("C-PIN over the catalogue boards", () => {
  const counts: Record<string, [number, number]> = {
    "uno-r3": [44, 6],
    "esp32-devkitc": [38, 1],
    "nucleo-f401re": [114, 27],
    "de10-lite": [144, NaN],
  };

  it.each(BOARDS)("%s has unique valid pin ids", (id) => {
    const rows = pinoutOf(id);
    const ids = boardPinIds(rows);
    expect(new Set(ids).size).toBe(rows.length);
    for (const pin of ids) expect(pin, pin).toMatch(PIN_ID_PATTERN);
    const groups = boardGroups(rows, ids);
    expect(new Set(groups.map((g) => g.id)).size).toBe(groups.length);
    for (const g of groups) expect(g.id).toMatch(PIN_ID_PATTERN);
    const expected = counts[id];
    if (expected) {
      expect(rows.length).toBe(expected[0]);
      if (!Number.isNaN(expected[1])) expect(groups.length).toBe(expected[1]);
    }
  });

  it("matches the Uno groups of PDM 3.4", () => {
    const rows = pinoutOf("uno-r3");
    const groups = boardGroups(rows, boardPinIds(rows));
    const sizes = Object.fromEntries(groups.map((g) => [g.id, g.pins.length]));
    expect(sizes).toMatchObject({ g_GND: 5, g_P5V: 3, g_D11: 2, g_D12: 2, g_D13: 2, g_RESET: 2 });
  });
});

function legsOf(source: string): string[] {
  const code = source.split("\n").filter((line) => !/^\s*\/\//.test(line)).join("\n");
  const found = /\blegs:\s*(\[[^\]]*\]|[A-Za-z_]\w*)/.exec(code);
  if (!found) throw new Error("no legs: field");
  let list = found[1]!;
  if (!list.startsWith("[")) {
    const declared = new RegExp(`const ${list}\\s*=\\s*(\\[[^\\]]*\\])`).exec(code);
    if (!declared) throw new Error(`cannot resolve ${list}`);
    list = declared[1]!;
  }
  return [...list.matchAll(/'([^']*)'/g)].map((m) => m[1]!);
}

describe("C-LEG over figures/parts", () => {
  const dir = new URL("figures/parts/", root);
  const files = readdirSync(dir).filter((f) => f.endsWith(".js"));

  it("reads every part", () => {
    expect(files.length).toBe(29);
  });

  it("converts every leg without a collision or an invalid id", () => {
    let withLegs = 0;
    for (const file of files) {
      const legs = legsOf(readFileSync(new URL(file, dir), "utf8"));
      if (legs.length === 0) continue;
      withLegs++;
      const ids = legs.map(pinIdFromLeg);
      for (const id of ids) expect(id, `${file}: ${id}`).toMatch(PIN_ID_PATTERN);
      expect(new Set(ids).size, file).toBe(ids.length);
    }
    console.log(`parts with non-empty legs: ${withLegs} of ${files.length}`);
    expect(withLegs).toBe(28);
  });

  it("converts the four rails and their holes without a collision", () => {
    const ids = ["T+", "T-", "B+", "B-"].map(pinIdFromLeg);
    expect(new Set(ids).size).toBe(4);
  });
});
