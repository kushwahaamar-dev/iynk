// @vitest-environment node
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pinIdFromLeg } from "../project/legacy-names.ts";
import { BUILTIN_DESCRIPTORS } from "./builtin.ts";
import { BANNED_WORDS, validateDescriptor } from "./descriptor.ts";
import type { Descriptor } from "./descriptor.ts";

const root = new URL("../../", import.meta.url);
const descriptors = BUILTIN_DESCRIPTORS as Descriptor[];

const PIN_TYPES = [
  "power_in", "power_out", "power_io", "ground", "digital_in", "digital_out", "digital_io", "open_drain",
  "analog_in", "analog_out", "passive", "mechanical", "nc",
];

describe.each(descriptors.map((d) => [d.id, d] as const))("%s", (_id, d) => {
  it("passes the descriptor checks with origin core", () => {
    expect(validateDescriptor(d, { origin: "core" })).toEqual({ ok: true, diagnostics: [] });
  });

  it("points at a figure page that exists", () => {
    const path = d.visual.breadboard?.figure.path ?? "";
    expect(path).not.toBe("");
    expect(existsSync(new URL(path, root))).toBe(true);
  });

  it("has a fallback drawing", () => {
    expect(d.visual.fallback.renderer).toBeTruthy();
    expect(d.visual.fallback.label).toBeTruthy();
  });

  it("names breadboard legs that are pins", () => {
    const pins = new Set(d.pins.map((p) => p.id));
    for (const leg of d.visual.breadboard?.legs ?? []) expect(pins.has(pinIdFromLeg(leg))).toBe(true);
  });

  it("uses only pin types the schema knows", () => {
    for (const pin of d.pins) expect(PIN_TYPES).toContain(pin.type);
  });

  it("keeps banned words out of the model copy", () => {
    const copy = [...d.simulation.what_it_models, ...d.simulation.not_modelled].flatMap((t) => Object.values(t));
    for (const line of copy) for (const word of BANNED_WORDS) expect(line).not.toMatch(word);
  });

  it("claims a modelled status only with a test that exists", () => {
    if (d.simulation.status === "not-modelled-yet") return;
    const tests = d.simulation.tests ?? [];
    expect(tests.length).toBeGreaterThan(0);
    for (const t of tests) {
      expect(t.state).not.toBe("to-write");
      expect(existsSync(new URL(t.file, root))).toBe(true);
    }
  });
});
