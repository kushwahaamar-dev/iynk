// @vitest-environment node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { boardPinIds } from "../project/legacy-names.ts";
import { BUILTIN_DESCRIPTORS } from "./builtin.ts";
import { validateDescriptor } from "./descriptor.ts";
import type { Descriptor } from "./descriptor.ts";
import { interfaceOf } from "./pins.ts";

const root = new URL("../../", import.meta.url);
const uno = BUILTIN_DESCRIPTORS.find((d) => (d as Descriptor).id === "core.uno-r3") as Descriptor;

const PIN_TYPES = [
  "power_in", "power_out", "power_io", "ground", "digital_in", "digital_out", "digital_io", "open_drain",
  "analog_in", "analog_out", "passive", "mechanical", "nc",
];

const lesson = JSON.parse(
  readFileSync(
    new URL("docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/lesson-uno-r3-button.project.json", root),
    "utf8",
  ),
);
const pinned = lesson.dependencies.components.find((c: { ref: string }) => c.ref === "core.uno-r3").interface;

const pick = (pins: { id: string; designator?: string; type: string; polarity?: string; position?: unknown }[]) =>
  pins.map(({ id, designator, type, polarity, position }) => ({ id, designator, type, polarity, position }));

describe("core.uno-r3", () => {
  it("passes the descriptor checks with origin core", () => {
    expect(validateDescriptor(uno, { origin: "core" })).toEqual({ ok: true, diagnostics: [] });
  });

  it("points at a figure page that exists and has a fallback", () => {
    const path = uno.visual.breadboard?.figure.path ?? "";
    expect(existsSync(new URL(path, root))).toBe(true);
    expect(uno.visual.fallback.renderer).toBeTruthy();
  });

  it("uses only pin types the schema knows", () => {
    for (const pin of uno.pins) expect(PIN_TYPES).toContain(pin.type);
  });

  it("claims no more than the interpreter does", () => {
    expect(uno.simulation.status).toBe("partly-modelled");
    expect(uno.simulation.tier).toBe("T1");
    const tests = uno.simulation.tests ?? [];
    expect(tests.length).toBeGreaterThan(0);
    for (const t of tests) {
      expect(t.state).not.toBe("to-write");
      expect(existsSync(new URL(t.file, root))).toBe(true);
    }
  });

  it("names its pins as rule C-PIN names the catalogue rows", () => {
    const emitted = JSON.parse(
      execFileSync("node", ["scripts/gen-content-index.mjs", "--emit", "board/uno-r3"], {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 1 << 26,
      }),
    );
    expect(uno.pins.map((p) => p.id)).toEqual(boardPinIds(emitted.data.pinout));
    expect(uno.pins).toHaveLength(44);
    expect(uno.groups).toHaveLength(6);
  });

  it("has the interface the lesson example pins", () => {
    const snapshot = interfaceOf(uno);
    expect(snapshot.role).toBe(pinned.role);
    expect(pick(snapshot.pins)).toEqual(pick(pinned.pins));
    expect(snapshot.groups).toEqual(pinned.groups);
  });
});
