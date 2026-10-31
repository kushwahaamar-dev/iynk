// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ART_DATA } from "./data/art-data.ts";

const KEYS = ["led", "resistor", "push-button", "piezo-buzzer", "potentiometer", "uno-r3"];
const PAGES: Record<string, string> = {
  led: "parts/led.html",
  resistor: "parts/resistor.html",
  "push-button": "parts/push-button.html",
  "piezo-buzzer": "parts/piezo-buzzer.html",
  potentiometer: "parts/potentiometer.html",
  "uno-r3": "boards/uno-r3.html",
};
const MAX_ELEMENTS = 150;
const PATH = /^[MLZ0-9.,\s-]+$/;
const COLOUR = /^(#[0-9a-f]{3,8}|var\(--(?:color|studio)-[a-z0-9-]+\))$/;
const UNSAFE = /filter|script|foreignobject|href|url\(|\bon[a-z]+\s*=|javascript:/i;

describe("ART_DATA", () => {
  it("has the six extracted parts", () => {
    expect(Object.keys(ART_DATA).sort()).toEqual([...KEYS].sort());
  });

  it("prints the element count per entry", () => {
    for (const [key, a] of Object.entries(ART_DATA)) console.log(`${key}: ${a.elements.length} elements`);
  });

  describe.each(KEYS)("%s", (key) => {
    const art = ART_DATA[key];

    it("holds at most 150 elements", () => {
      expect(art.elements.length).toBeGreaterThan(0);
      expect(art.elements.length).toBeLessThanOrEqual(MAX_ELEMENTS);
    });

    it("uses only path, circle, rect and ellipse", () => {
      for (const e of art.elements) expect(["path", "circle", "rect", "ellipse"]).toContain(e.t);
    });

    it("carries no reference, script or event attribute in any string", () => {
      expect(UNSAFE.test(JSON.stringify(art))).toBe(false);
    });

    it("has path data and colours of the expected shape", () => {
      for (const e of art.elements) {
        if (e.t === "text") throw new Error("text in extracted art");
        if (e.t === "path") expect(e.d).toMatch(PATH);
        if (e.fill) expect(e.fill).toMatch(COLOUR);
        if (e.stroke) expect(e.stroke).toMatch(COLOUR);
      }
    });

    it("has a viewBox in millimetres", () => {
      expect(art.viewBox).toMatch(/^0 0 [\d.]+ [\d.]+$/);
    });

    it("was extracted from the current figure page", () => {
      const page = readFileSync(new URL(`../../../public/figures/${PAGES[key]}`, import.meta.url));
      expect(art.sourceSha256).toBe(createHash("sha256").update(page).digest("hex"));
    });
  });
});
