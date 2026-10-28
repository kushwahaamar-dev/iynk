// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LOCAL_ID_PATTERN, PIN_ID_PATTERN } from "../core/ids.ts";
import { LIMITS } from "../core/limits.ts";
import { surfaceInterface } from "../project/holes.ts";
import { builtinRegistry } from "./builtin.ts";
import { validateDescriptor } from "./descriptor.ts";
import type { Descriptor } from "./descriptor.ts";
import { interfaceOf } from "./pins.ts";

const bb = builtinRegistry().get("core.breadboard-half", "1.0.0") as Descriptor;

describe("core.breadboard-half", () => {
  it("passes the descriptor checks", () => {
    expect(validateDescriptor(bb, { origin: "core" })).toEqual({ ok: true, diagnostics: [] });
  });

  it("has 400 holes and 64 strips", () => {
    expect(bb.pins).toHaveLength(400);
    expect(bb.groups).toHaveLength(64);
    expect(bb.groups!.every((g) => g.kind === "strip" && g.pins.length <= LIMITS.pinsPerGroup)).toBe(true);
  });

  it("has 30 columns by 10 rows plus four rails of 25 holes", () => {
    const grid = bb.pins.filter((p) => !p.id.startsWith("RAIL_"));
    expect(grid).toHaveLength(300);
    expect(new Set(grid.map((p) => p.id.slice(1))).size).toBe(30);
    expect(new Set(grid.map((p) => p.id[0])).size).toBe(10);
    for (const rail of ["RAIL_TP", "RAIL_TN", "RAIL_BP", "RAIL_BN"]) {
      expect(bb.pins.filter((p) => p.id.startsWith(rail))).toHaveLength(25);
    }
  });

  it("names every pin and strip so it matches the local id rules", () => {
    for (const p of bb.pins) {
      expect(p.id).toMatch(PIN_ID_PATTERN);
      expect(p.id).toMatch(LOCAL_ID_PATTERN);
    }
    for (const g of bb.groups!) expect(g.id).toMatch(LOCAL_ID_PATTERN);
  });

  it("puts each hole in exactly one strip", () => {
    const seen = new Map<string, number>();
    for (const g of bb.groups!) for (const p of g.pins) seen.set(p, (seen.get(p) ?? 0) + 1);
    expect(seen.size).toBe(400);
    expect([...seen.values()].every((n) => n === 1)).toBe(true);
  });

  it("places hole a1 and the rail holes where the figure does", () => {
    const at = (id: string) => bb.pins.find((p) => p.id === id)!.position;
    expect(at("a1")).toEqual({ x: 4.42, y: 40.44 });
    expect(at("j30")).toEqual({ x: 78.08, y: 12.5 });
    expect(at("RAIL_TP2")).toEqual({ x: 6.96, y: 48.56 });
  });

  it("has the pin ids and strips of the converter's surface snapshot", () => {
    const own = interfaceOf(bb);
    const converter = surfaceInterface("half");
    expect(own.role).toBe("surface");
    expect(own.pins.map((p) => p.id)).toEqual(converter.pins.map((p) => p.id));
    expect(own.groups).toEqual(converter.groups);
  });
});
