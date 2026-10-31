import { describe, expect, it } from "vitest";
import { blink2, scene } from "./pack.testing.ts";
import { digestLines, neighbourhood } from "./digest.ts";

describe("neighbourhood", () => {
  it("is deterministic and bounded", () => {
    const doc = scene(300, 600);
    const seeds = [doc.components[5]!.id, doc.components[10]!.id];
    const first = neighbourhood(doc, seeds, 2, 60);
    expect(neighbourhood(doc, [...seeds].reverse(), 2, 60)).toEqual(first);
    expect(first.length).toBeLessThanOrEqual(60);
    expect(new Set(first).size).toBe(first.length);
  });

  it("walks nets outward from a component and from a net id", () => {
    const doc = blink2();
    expect(neighbourhood(doc, ["cmp_d1"], 1)).toEqual(["cmp_d1", "cmp_r1"]);
    expect(neighbourhood(doc, ["cmp_d1"], 0)).toEqual(["cmp_d1"]);
    expect(neighbourhood(doc, ["net_d12"], 0).sort()).toEqual(["brd_main", "cmp_r1"]);
    expect(neighbourhood(doc, ["nope"], 2)).toEqual([]);
  });
});

describe("digestLines", () => {
  const doc = blink2();

  it("D2 lists every component and net with members", () => {
    const { components, nets } = digestLines(doc, "D2", []);
    expect(components.find((l) => l.startsWith("cmp_d1 "))).toMatch(/ D1 color="red"$/);
    expect(nets).toContain("net_a1 \"A1\" signal : cmp_d1.anode cmp_r1.P2");
  });

  it("D1 outlines and gives full rows only near the selection", () => {
    const { components, nets } = digestLines(doc, "D1", ["cmp_r1"]);
    expect(components[0]).toContain("outline");
    expect(components).toContain("cmp_r2 R2");
    expect(components.some((l) => l.startsWith("cmp_r1 ") && l.includes("ohms=220"))).toBe(true);
    expect(components.some((l) => l.startsWith("cmp_r2 ") && l.includes("ohms"))).toBe(false);
    expect(nets.some((l) => l.startsWith("net_a1 ") && l.includes(" : "))).toBe(true);
  });

  it("D0 keeps counts", () => {
    const { components, nets } = digestLines(doc, "D0", []);
    expect(components[0]).toBe("[COMPONENTS] count=4");
    expect(nets).toEqual(["[NETS] count=2"]);
  });
});
