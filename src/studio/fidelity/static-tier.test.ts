// @vitest-environment node
import { describe, expect, it } from "vitest";
import { blankProject } from "../../project/blank.ts";
import type { Project } from "../../project/generated/types.ts";
import { builtinRegistry } from "../../parts/builtin.ts";
import { loadRegistry } from "../../sim/registry/entries.ts";
import { engineLine, lowestTier, modelRows, staticTier, UNKNOWN_PART } from "./static-tier.ts";
import type { ModelRow } from "./static-tier.ts";

const registry = builtinRegistry();

function project(): Project {
  return blankProject({ board: "uno", title: "t", locale: "en", actor: "act_a", now: "2026-10-28T00:00:00.000Z", id: "prj_t" });
}

const row = (tier: ModelRow["tier"]): ModelRow => ({ c: "x", name: "x", tier, status: "modelled", models: [], notModelled: [] });

describe("lowestTier", () => {
  it("takes the weakest tier", () => {
    expect(lowestTier([row("T3"), row("T1"), row("T2")])).toBe("T1");
    expect(lowestTier([row("T3"), row("T0")])).toBe("T0");
  });

  it("skips rows without a tier unless all lack one", () => {
    expect(lowestTier([row("none"), row("T2")])).toBe("T2");
    expect(lowestTier([row("none"), row("none")])).toBe("none");
  });

  it("is none for an empty project", () => {
    expect(lowestTier([])).toBe("none");
  });
});

describe("modelRows", () => {
  it("lists the board of a blank project from the registry", () => {
    const rows = modelRows(project(), registry);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Arduino UNO Rev3", tier: "T1", status: "partly-modelled" });
    expect(rows[0].models.length).toBeGreaterThan(0);
    expect(rows[0].notModelled.length).toBeGreaterThan(0);
  });

  it("adds a row per component and names an unknown definition", () => {
    const p = project();
    p.components.push(
      { id: "cmp_1", definition: { ref: "core.led-5mm", version: "1.0.0" }, refdes: "D1" },
      { id: "cmp_2", definition: { ref: "core.mystery", version: "1.0.0" }, refdes: "X1" },
    );
    const rows = modelRows(p, registry);
    expect(rows.map((r) => r.c)).toEqual([p.boards[0].id, "cmp_1", "cmp_2"]);
    expect(rows[1].name).toBe("5 mm through-hole LED");
    expect(rows[2]).toMatchObject({ name: UNKNOWN_PART, tier: "none", status: "not-modelled-yet", models: [], notModelled: [] });
  });
});

describe("engineLine", () => {
  it("names the engine and carries the Uno notes", () => {
    const line = engineLine(project());
    expect(line.engineKey).toBe("arduino-subset-digital");
    expect(line.boardNotes.some((n) => n.startsWith("int is 16 bits"))).toBe(true);
  });

  it("has no notes for a board without a profile", () => {
    const p = project();
    p.boards[0].definition = { ref: "core.mystery", version: "1.0.0" };
    expect(engineLine(p).boardNotes).toEqual([]);
  });
});

describe("staticTier", () => {
  it("gives the engine and circuit layers of a blank project and the lowest as the summary", () => {
    const fidelity = staticTier(project(), loadRegistry());
    expect(fidelity.layers.map((l) => l.layer)).toEqual(["execution", "circuit"]);
    expect(fidelity.summary).toBe("T1");
  });
});
