// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fallbackSpec, placeholderSpec } from "./fallback.ts";
import type { FallbackRenderer, FallbackSpec } from "./fallback.ts";
import type { Component as Descriptor } from "./generated/types.ts";
import { interfaceOf } from "./pins.ts";

const DIR = "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/components";
const descriptors = readdirSync(DIR)
  .filter((f) => f.endsWith(".component.json"))
  .map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8")) as Descriptor);

const RENDERERS: FallbackRenderer[] = [
  "generic-two-lead",
  "generic-dip",
  "generic-header-module",
  "generic-terminal-module",
  "generic-box",
];

function distinct(spec: FallbackSpec): boolean {
  return new Set(spec.pins.map((p) => `${p.x_mm},${p.y_mm}`)).size === spec.pins.length;
}

function withPins(n: number, renderer: FallbackRenderer, withPositions = false): Descriptor {
  const d = structuredClone(descriptors[0]);
  d.pins = Array.from({ length: n }, (_, i) => ({
    id: `P${i}`,
    type: "passive",
    class: "passive",
    ...(withPositions ? { position: { x: i * 3, y: 1 } } : {}),
  })) as Descriptor["pins"];
  delete d.groups;
  d.visual.fallback.renderer = renderer;
  delete d.visual.schematic;
  delete d.dimensions;
  return d;
}

describe("fallbackSpec", () => {
  it.each(descriptors.map((d) => [d.id, d] as const))("places every pin of %s at its own point", (_id, d) => {
    const spec = fallbackSpec(d);
    expect(spec.pins.map((p) => p.id)).toEqual(d.pins.map((p) => p.id));
    expect(distinct(spec)).toBe(true);
    expect(spec.body_mm.w).toBeGreaterThan(0);
    expect(spec.body_mm.h).toBeGreaterThan(0);
  });

  it("keeps explicit positions", () => {
    const led = descriptors.find((d) => d.id === "core.led-5mm")!;
    const spec = fallbackSpec(led);
    expect(spec.pins).toEqual([
      { id: "A", x_mm: 0, y_mm: 0 },
      { id: "K", x_mm: 2.54, y_mm: 0 },
    ]);
    expect(spec).toMatchObject({ renderer: "generic-two-lead", label: "LED", bodyColour: "#e8392e", showPinLabels: true });
    expect(spec.body_mm).toEqual({ w: 5.8, h: 5.8 });
  });

  it("takes pin sides from the schematic block", () => {
    const l298 = fallbackSpec(descriptors.find((d) => d.id === "core.l298n-module")!);
    expect(l298.pins.find((p) => p.id === "VS")?.side).toBe("left");
    expect(l298.pins.find((p) => p.id === "OUT3")?.side).toBe("right");
  });

  it("uses the board size when the part has no body", () => {
    const d = withPins(3, "generic-box");
    d.dimensions = { board: { w: 51, h: 28, thickness: 1.6 } };
    expect(fallbackSpec(d).body_mm).toEqual({ w: 51, h: 28 });
  });

  it.each(RENDERERS)("lays out %s without positions", (renderer) => {
    for (const n of [1, 2, 3, 8, 15]) {
      const spec = fallbackSpec(withPins(n, renderer));
      expect(spec.pins).toHaveLength(n);
      expect(distinct(spec)).toBe(true);
    }
  });

  it("follows the stated pitches", () => {
    const two = fallbackSpec(withPins(2, "generic-two-lead")).pins;
    expect(two[1].x_mm - two[0].x_mm).toBe(2.54);
    const dip = fallbackSpec(withPins(8, "generic-dip")).pins;
    expect(new Set(dip.map((p) => p.x_mm))).toEqual(new Set([0, 7.62]));
    expect(dip[1].y_mm - dip[0].y_mm).toBeCloseTo(-2.54, 6);
    const terminal = fallbackSpec(withPins(3, "generic-terminal-module")).pins;
    expect(terminal[1].x_mm - terminal[0].x_mm).toBe(5.08);
    const header = fallbackSpec(withPins(3, "generic-header-module")).pins;
    expect(header[1].x_mm - header[0].x_mm).toBe(2.54);
  });

  it("keeps every auto-laid pin on the body edge for a box", () => {
    const spec = fallbackSpec(withPins(9, "generic-box"));
    const { w, h } = spec.body_mm;
    for (const p of spec.pins) {
      expect([0, w].includes(p.x_mm) || [0, h].includes(p.y_mm)).toBe(true);
    }
  });

  it("sizes the body to the pins when nothing states it", () => {
    const spec = fallbackSpec(withPins(3, "generic-two-lead", true));
    expect(spec.body_mm.w).toBeGreaterThanOrEqual(6);
  });

  it("leaves bodyColour off when the descriptor has none", () => {
    const d = withPins(2, "generic-two-lead");
    delete d.visual.fallback.body_colour;
    expect(fallbackSpec(d)).not.toHaveProperty("bodyColour");
  });

  it("defaults pin labels to off", () => {
    const d = withPins(2, "generic-two-lead");
    delete d.visual.fallback.show_pin_labels;
    expect(fallbackSpec(d).showPinLabels).toBe(false);
  });
});

describe("placeholderSpec", () => {
  it("places 44 distinct pins from a 44-pin snapshot", () => {
    const iface = interfaceOf(withPins(44, "generic-box"));
    const spec = placeholderSpec(iface);
    expect(spec.pins).toHaveLength(44);
    expect(distinct(spec)).toBe(true);
    expect(spec).toMatchObject({ renderer: "generic-box", label: "Unknown part", showPinLabels: true });
  });

  it("draws a two-pin snapshot as a two-lead part with the given label", () => {
    const spec = placeholderSpec(interfaceOf(descriptors.find((d) => d.id === "core.resistor")!), "core.resistor");
    expect(spec.renderer).toBe("generic-two-lead");
    expect(spec.label).toBe("core.resistor");
    expect(spec.pins).toEqual([
      { id: "P1", x_mm: 0, y_mm: 0 },
      { id: "P2", x_mm: 10.16, y_mm: 0 },
    ]);
  });

  it("matches the descriptor layout when the snapshot carries positions", () => {
    const d = descriptors.find((d) => d.id === "core.ssd1306")!;
    const real = fallbackSpec(d).pins.map(({ id, x_mm, y_mm }) => ({ id, x_mm, y_mm }));
    expect(placeholderSpec(interfaceOf(d)).pins.map(({ id, x_mm, y_mm }) => ({ id, x_mm, y_mm }))).toEqual(real);
  });
});
