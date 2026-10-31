import { describe, expect, it } from "vitest";
import type { WireablesExt } from "@/project/guided/plan";
import { wireRows } from "./wire";

const ext: WireablesExt = {
  v: 1,
  items: [
    {
      part: "led",
      supplyVolts: 5,
      note: { en: "Through a resistor", es: "Con resistencia" },
      caution: "Mind the polarity",
      connections: [
        { from: "anode", to: "D13", color: "green" },
        { from: "cathode", to: "GND", color: "black" },
      ],
    },
    { part: "dht", supplyVolts: 3.3, note: "Reads humidity", connections: [{ from: "data", to: "D7", color: "yellow" }] },
  ],
};

describe("wireRows", () => {
  it("is empty without wireables", () => {
    expect(wireRows(undefined, ["D13"], "en")).toEqual([]);
  });

  it("marks the rows whose signal pins the lesson uses and ignores power pins", () => {
    const rows = wireRows(ext, ["D13"], "en");
    expect(rows.map((r) => [r.part, r.forLesson])).toEqual([
      ["led", true],
      ["dht", false],
    ]);
  });

  it("resolves the texts in the locale", () => {
    const [led, dht] = wireRows(ext, [], "es");
    expect(led.note).toBe("Con resistencia");
    expect(led.caution).toBe("Mind the polarity");
    expect(dht.caution).toBeNull();
  });
});
