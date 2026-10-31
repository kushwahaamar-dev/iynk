import { describe, expect, it } from "vitest";
import { BUILTIN_DESCRIPTORS } from "../../parts/builtin.ts";
import type { Descriptor } from "../../parts/descriptor.ts";
import { placeholderSpec } from "../../parts/fallback.ts";
import { interfaceOf } from "../../parts/pins.ts";
import type { LodLevel } from "../engine/types.ts";
import { fallbackArt, unknownPartArt } from "./fallback.ts";
import { ALL_SHAPES, BOX, TWO_LEAD } from "./testing/shapes.ts";

const LEVELS: LodLevel[] = [0, 1, 2];

describe("fallbackArt", () => {
  it.each(ALL_SHAPES.map((s) => [s.renderer, s] as const))("%s draws something at every level", (_name, spec) => {
    for (const lod of LEVELS) expect(fallbackArt(spec, lod).length).toBeGreaterThan(0);
  });

  it.each(ALL_SHAPES.map((s) => [s.renderer, s] as const))("%s stays within 12 elements at levels 0 and 1", (_name, spec) => {
    expect(fallbackArt(spec, 0).length).toBeLessThanOrEqual(12);
    expect(fallbackArt(spec, 1).length).toBeLessThanOrEqual(12);
  });

  it.each(ALL_SHAPES.map((s) => [s.renderer, s] as const))("%s is deterministic", (_name, spec) => {
    for (const lod of LEVELS) expect(fallbackArt(spec, lod)).toEqual(fallbackArt(spec, lod));
  });

  it.each(ALL_SHAPES.map((s) => [s.renderer, s] as const))("%s puts a pad on every pin at level 2, top-down", (_name, spec) => {
    const pads = fallbackArt(spec, 2).filter((e) => e.t === "circle" && e.r > 0.7);
    expect(pads).toHaveLength(spec.pins.length);
    spec.pins.forEach((pin, i) => {
      const pad = pads[i];
      if (pad.t !== "circle") throw new Error("not a circle");
      expect(Math.abs(pad.cx - pin.x_mm)).toBeLessThan(0.001);
      expect(Math.abs(pad.cy - (spec.body_mm.h - pin.y_mm))).toBeLessThan(0.001);
    });
  });

  it("adds more detail as the level rises", () => {
    for (const spec of ALL_SHAPES) {
      expect(fallbackArt(spec, 1).length).toBeGreaterThanOrEqual(fallbackArt(spec, 0).length);
      expect(fallbackArt(spec, 2).length).toBeGreaterThan(fallbackArt(spec, 1).length);
    }
  });

  it("names the pins only when the spec asks", () => {
    const texts = (spec: typeof BOX) => fallbackArt(spec, 2).filter((e) => e.t === "text").map((e) => (e.t === "text" ? e.s : ""));
    expect(texts(BOX)).toEqual(["Display", "SDA", "SCL", "VCC", "GND"]);
    expect(texts(TWO_LEAD)).toEqual(["R"]);
  });

  it("draws a part with no pins as its body", () => {
    const bare = { ...BOX, pins: [] };
    expect(fallbackArt(bare, 1)).toHaveLength(1);
  });

  it("keeps a custom body colour", () => {
    const art = fallbackArt({ ...BOX, bodyColour: "#336699" }, 0);
    expect(art[0]).toMatchObject({ t: "rect", fill: "#336699" });
  });
});

describe("unknownPartArt", () => {
  const ssd = (BUILTIN_DESCRIPTORS as Descriptor[]).find((d) => d.id === "core.ssd1306")!;
  const spec = placeholderSpec(interfaceOf(ssd));

  it("draws a dashed box, a question mark path and the label", () => {
    const art = unknownPartArt(spec, "Unknown part");
    expect(art.filter((e) => e.t === "path")).toHaveLength(2);
    expect(art.some((e) => e.t === "text" && e.s === "Unknown part")).toBe(true);
    expect(art.filter((e) => e.t === "text")).toHaveLength(1);
  });

  it("puts a pad on every pin of the placeholder", () => {
    const pads = unknownPartArt(spec, "Unknown part").filter((e) => e.t === "circle");
    expect(pads).toHaveLength(spec.pins.length);
  });
});
