// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PIN_ID_PATTERN } from "../core/ids.ts";
import { holeToPin, stripOfHole, surfaceGeometry, surfaceInterface } from "./holes.ts";
import type { SurfaceKind } from "./holes.ts";

describe("surfaceGeometry", () => {
  it("lists the first rail columns of the half board", () => {
    expect(surfaceGeometry("half").railCols.slice(0, 6)).toEqual([2, 3, 4, 5, 6, 8]);
    expect(surfaceGeometry("half").railCols).toHaveLength(25);
  });

  it("gives the mini board no rails", () => {
    expect(surfaceGeometry("mini")).toEqual({ cols: 17, rails: false, railCols: [] });
  });
});

describe("surfaceInterface", () => {
  it.each<[SurfaceKind, number, number]>([
    ["half", 400, 64],
    ["full", 838, 130],
    ["mini", 170, 34],
  ])("%s has %i pins and %i groups", (kind, pins, groups) => {
    const iface = surfaceInterface(kind);
    expect(iface.role).toBe("surface");
    expect(iface.pins).toHaveLength(pins);
    expect(iface.groups).toHaveLength(groups);
    expect(new Set(iface.pins.map((p) => p.id)).size).toBe(pins);
    for (const pin of iface.pins) expect(pin.id).toMatch(PIN_ID_PATTERN);
    const ids = new Set(iface.pins.map((p) => p.id));
    for (const group of iface.groups!) for (const pin of group.pins) expect(ids.has(pin)).toBe(true);
  });

  it("has rail holes only when the surface has rails", () => {
    expect(surfaceInterface("half").pins.some((p) => p.id === "RAIL_TP12")).toBe(true);
    expect(surfaceInterface("half").pins.some((p) => p.id === "RAIL_TP13")).toBe(false);
    expect(surfaceInterface("mini").pins.some((p) => p.id.startsWith("RAIL_"))).toBe(false);
  });
});

describe("holeToPin", () => {
  it("keeps grid holes and drops those off the board", () => {
    expect(holeToPin("half", "b10")).toBe("b10");
    expect(holeToPin("half", "j30")).toBe("j30");
    expect(holeToPin("half", "a31")).toBeNull();
    expect(holeToPin("mini", "a18")).toBeNull();
    expect(holeToPin("half", "a0")).toBeNull();
  });

  it("moves a rail hole to the nearest rail column", () => {
    expect(holeToPin("half", "T+12")).toBe("RAIL_TP12");
    expect(holeToPin("half", "T+13")).toBe("RAIL_TP12");
    expect(holeToPin("half", "B-1")).toBe("RAIL_BN2");
    expect(holeToPin("half", "T+7")).toBe("RAIL_TP6");
    expect(holeToPin("half", "T+30")).toBe("RAIL_TP30");
  });

  it("refuses rails on the mini board and anything else", () => {
    expect(holeToPin("mini", "T+3")).toBeNull();
    expect(holeToPin("half", "X1")).toBeNull();
    expect(holeToPin("half", "T+")).toBeNull();
  });
});

describe("stripOfHole", () => {
  const strips = stripOfHole(surfaceInterface("half"));

  it("puts the two halves of a column in different strips", () => {
    expect(strips.get("e8")).not.toBe(strips.get("f8"));
    expect(strips.get("a8")).toBe(strips.get("e8"));
    expect(strips.get("f8")).toBe(strips.get("j8"));
  });

  it("puts a rail in one strip", () => {
    expect(strips.get("RAIL_TP2")).toBe("RAIL_TP");
    expect(strips.get("RAIL_TP30")).toBe("RAIL_TP");
  });
});
