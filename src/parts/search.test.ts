// @vitest-environment node
import { describe, expect, it } from "vitest";
import { builtinRegistry } from "./builtin.ts";
import { buildPartIndex, searchParts } from "./search.ts";
import type { PartEntry } from "./search.ts";

const entry = (ref: string, name: string, category: string, keywords: string[] = []): PartEntry => ({
  ref,
  name,
  category,
  keywords,
  model: "partly-modelled",
  widthMm: 5,
  heightMm: 5,
});

const index: PartEntry[] = [
  entry("core.led-5mm", "5 mm through-hole LED", "semiconductor", ["led", "diode", "indicator"]),
  entry("core.resistor", "Resistor", "passive", ["resistor", "ohm"]),
  entry("core.resistor-array", "Resistor array", "passive", ["network"]),
  entry("core.push-button", "Push button", "switch", ["button", "tact"]),
  entry("core.buzzer", "Piezo buzzer", "output", ["buzzer", "sound", "beep"]),
  entry("core.pot", "10 kΩ potentiometer", "passive", ["pot", "knob", "dial"]),
  entry("core.oled", "SSD1306 OLED display", "display", ["oled", "i2c", "screen"]),
  entry("core.uno", "Arduino UNO Rev3", "dev-board", ["uno", "arduino", "board"]),
  entry("core.cafe", "Café sensor", "sensor", ["cafe"]),
];

const first = (query: string, lang = "en") => searchParts(index, query, lang)[0]?.ref;
const refs = (query: string, lang = "en") => searchParts(index, query, lang).map((e) => e.ref);

describe("searchParts ranking", () => {
  const table: [string, string | undefined][] = [
    ["led", "core.led-5mm"],
    ["LED", "core.led-5mm"],
    ["  led  ", "core.led-5mm"],
    ["5 mm", "core.led-5mm"],
    ["through", "core.led-5mm"],
    ["hole led", "core.led-5mm"],
    ["diode", "core.led-5mm"],
    ["resistor", "core.resistor"],
    ["res", "core.resistor"],
    ["ohm", "core.resistor"],
    ["push", "core.push-button"],
    ["button", "core.push-button"],
    ["tact", "core.push-button"],
    ["buzz", "core.buzzer"],
    ["beep", "core.buzzer"],
    ["pot", "core.pot"],
    ["knob", "core.pot"],
    ["oled", "core.oled"],
    ["i2c", "core.oled"],
    ["ssd1306", "core.oled"],
    ["uno", "core.uno"],
    ["arduino", "core.uno"],
    ["dev-board", "core.uno"],
    ["cafe", "core.cafe"],
    ["zzz", undefined],
  ];

  it.each(table)("%j finds %s first", (query, expected) => {
    expect(first(query)).toBe(expected);
  });

  it("puts an exact name before a prefix and a prefix before a word match", () => {
    expect(refs("resistor")).toEqual(["core.resistor", "core.resistor-array"]);
    expect(refs("array")).toEqual(["core.resistor-array"]);
  });

  it("ranks a name match above a keyword match", () => {
    const local = [entry("a", "Zebra", "x", ["lamp"]), entry("b", "Lamp holder", "x")];
    expect(searchParts(local, "lamp", "en").map((e) => e.ref)).toEqual(["b", "a"]);
  });

  it("breaks ties by name", () => {
    const local = [entry("b", "Beta lamp", "x"), entry("a", "Alpha lamp", "x")];
    expect(searchParts(local, "lamp", "en").map((e) => e.ref)).toEqual(["a", "b"]);
  });
});

describe("searchParts folding", () => {
  it("ignores case and Latin accents in the query and the name", () => {
    expect(first("CAFÉ")).toBe("core.cafe");
    expect(first("café")).toBe("core.cafe");
    expect(first("cafe sensor")).toBe("core.cafe");
    expect(first("potentiometer")).toBe("core.pot");
  });

  it("keeps Devanagari letters whole", () => {
    const hindi = [entry("a", "प्रतिरोधक", "x"), entry("b", "पोटेंशियोमीटर", "x")];
    expect(searchParts(hindi, "प्रति", "hi").map((e) => e.ref)).toEqual(["a"]);
  });
});

describe("searchParts edge cases", () => {
  it("lists everything by category for an empty or blank query", () => {
    const all = searchParts(index, "", "en");
    expect(all).toHaveLength(index.length);
    const categories = all.map((e) => e.category);
    expect(categories).toEqual([...categories].sort((a, b) => a.localeCompare(b, "en")));
    expect(searchParts(index, "   ", "en")).toHaveLength(index.length);
  });

  it("returns nothing for a query of punctuation only or with no match", () => {
    expect(searchParts(index, "---", "en")).toEqual([]);
    expect(searchParts(index, "quantum", "en")).toEqual([]);
  });

  it("does not change the index", () => {
    const copy = [...index];
    searchParts(index, "res", "en");
    searchParts(index, "", "en");
    expect(index).toEqual(copy);
  });
});

describe("buildPartIndex", () => {
  const built = buildPartIndex(builtinRegistry());

  it("lists the shipped parts and leaves the breadboard out", () => {
    expect(built.map((e) => e.ref).sort()).toEqual([
      "core.buzzer-piezo",
      "core.led-5mm",
      "core.potentiometer-10k",
      "core.push-button-6mm",
      "core.resistor",
      "core.ssd1306",
      "core.uno-r3",
    ]);
  });

  it("puts the LED first for led and carries its model label and size", () => {
    const [led] = searchParts(built, "led", "en");
    expect(led?.ref).toBe("core.led-5mm");
    expect(led?.model).toBe("partly-modelled");
    expect(led?.widthMm).toBeGreaterThan(0);
  });

  it("finds a part by its old figure id", () => {
    expect(searchParts(built, "piezo", "en")[0]?.ref).toBe("core.buzzer-piezo");
  });
});
