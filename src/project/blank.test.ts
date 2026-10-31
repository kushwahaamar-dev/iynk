// @vitest-environment node
import { describe, expect, it } from "vitest";
import { newProjectId } from "../core/ids.ts";
import { builtinRegistry } from "../parts/builtin.ts";
import { interfaceOf } from "../parts/pins.ts";
import { blankProject } from "./blank.ts";
import type { BlankOptions } from "./blank.ts";
import { stateHash } from "./hash.ts";
import { seededRandom } from "./testing/harness.ts";
import { validateValue } from "./validate.ts";

const NOW = "2026-10-28T09:00:00.000Z";

function options(): BlankOptions {
  return {
    board: "uno",
    title: "My project",
    locale: "en",
    actor: "usr_owner",
    now: NOW,
    id: newProjectId(Date.parse(NOW), seededRandom(7)),
  };
}

describe("blankProject", () => {
  it("validates", () => {
    const report = validateValue(blankProject(options()));
    expect(report.errors).toEqual(0);
    expect(report.ok).toBe(true);
  });

  it("has one Uno board, a main.ino source and both views, and nothing else", () => {
    const doc = blankProject(options());
    expect(doc.revision).toBe(0);
    expect(doc.boards).toHaveLength(1);
    expect(doc.boards[0]?.id).toBe("brd_uno");
    expect(doc.boards[0]?.definition.ref).toBe("core.uno-r3");
    expect(doc.sources.map((s) => s.path)).toEqual(["main.ino"]);
    expect(doc.sources[0]?.content).toContain("LED_BUILTIN");
    expect(doc.sources[0]?.content).toContain('Serial.println("blink")');
    expect(doc.views.map((v) => v.id)).toEqual(["vw_bb", "vw_sch"]);
    expect(doc.components).toEqual([]);
    expect(doc.nets).toEqual([]);
    expect(doc.simulation.seed).toBe(0x2545f491);
    expect(doc.provenance.origin).toEqual({ kind: "blank" });
  });

  it("pins the same board interface the registry builds", () => {
    const uno = builtinRegistry().get("core.uno-r3", "1.0.0");
    expect(uno).toBeDefined();
    expect(blankProject(options()).dependencies.components[0]?.interface).toEqual(interfaceOf(uno!));
  });

  it("hashes the same for the same inputs", () => {
    expect(stateHash(blankProject(options()))).toBe(stateHash(blankProject(options())));
  });
});
