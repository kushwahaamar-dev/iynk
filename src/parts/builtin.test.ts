// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { builtinRegistry } from "./builtin.ts";
import { interfaceOf } from "./pins.ts";

const lesson = JSON.parse(
  readFileSync(
    new URL("../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/lesson-uno-r3-button.project.json", import.meta.url),
    "utf8",
  ),
);
const pinnedInterface = (ref: string) => lesson.dependencies.components.find((c: { ref: string }) => c.ref === ref).interface;

describe("builtinRegistry", () => {
  const registry = builtinRegistry();

  it("holds the sixteen shipped parts", () => {
    expect(registry.list().map((p) => p.ref)).toEqual([
      "core.uno-r3",
      "core.nano",
      "core.uno-r4",
      "core.esp32-devkitc",
      "core.esp32-s3-devkitc-1",
      "core.nodemcu",
      "core.pico",
      "core.microbit-v2",
      "core.nucleo-f401re",
      "core.led-5mm",
      "core.resistor",
      "core.push-button-6mm",
      "core.buzzer-piezo",
      "core.potentiometer-10k",
      "core.ssd1306",
      "core.breadboard-half",
    ]);
  });

  it.each([
    ["uno-r3", "core.uno-r3"],
    ["led", "core.led-5mm"],
    ["resistor", "core.resistor"],
    ["push-button", "core.push-button-6mm"],
    ["piezo-buzzer", "core.buzzer-piezo"],
    ["potentiometer", "core.potentiometer-10k"],
    ["ssd1306", "core.ssd1306"],
    ["breadboard", "core.breadboard-half"],
  ])("resolves the figure part %s", (legacy, ref) => {
    expect(registry.resolveLegacy(legacy)).toBe(ref);
  });

  it("gives the breadboard the surface role", () => {
    expect(interfaceOf(registry.get("core.breadboard-half", "1.0.0")!).role).toBe("surface");
  });

  it.each(["core.led-5mm", "core.resistor", "core.push-button-6mm"])("%s has the interface the lesson example pins", (ref) => {
    const part = registry.get(ref, "1.0.0")!;
    const snapshot = interfaceOf(part);
    const pinned = pinnedInterface(ref);
    expect(snapshot.role).toBe(pinned.role);
    expect(snapshot.params).toEqual(pinned.params);
    expect(snapshot.groups).toEqual(pinned.groups);
    expect(snapshot.pins.map(({ id, designator, type }) => ({ id, designator, type }))).toEqual(
      pinned.pins.map(({ id, designator, type }: { id: string; designator: string; type: string }) => ({ id, designator, type })),
    );
  });
});
