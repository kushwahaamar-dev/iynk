// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createInterpEngine } from "@/sim-host/engines/interp-engine";
import { builtinRegistry } from "@/parts/builtin";
import { blankProject } from "@/project/blank";
import type { Project } from "@/project/generated/types";
import { seededRandom } from "@/project/session.testing";
import { validateValue } from "@/project/validate";
import { NS_PER_MS } from "@/sim/core/clock";
import { createDigitalNets } from "@/sim/digital/nets";
import type { SliceBudget } from "@/sim/engine";
import { buildSimNetlist } from "@/sim/netlist";
import { createOrchestrator } from "@/sim/orchestrator";
import { LOCAL_ACTOR, loadStarter, newUnoProject, STARTERS } from "./templates";

const NOW = "2026-10-28T10:00:00.000Z";
const registry = builtinRegistry();
const RUN_NS = 5_000 * NS_PER_MS;
const BUDGET: SliceBudget = { shouldYield: () => false, work: { statements: Infinity, events: Infinity, outputBytes: Infinity } };

const blank = () => blankProject({ board: "uno", title: "Blink", locale: "en", actor: LOCAL_ACTOR, now: NOW, id: "prj_unotest" });
const starter = (id: string) => loadStarter(id, { rnd: seededRandom(), now: NOW, actor: LOCAL_ACTOR });

function runFiveSeconds(project: Project) {
  const firmware = project.sources.find((s) => s.role === "firmware" && s.language === "arduino-cpp")!;
  const { net } = buildSimNetlist(project, registry);
  if (net.ground === "") {
    net.nets.push({ id: "gnd" });
    net.ground = "gnd";
  }
  const mcu = createInterpEngine({ id: "mcu", board: "uno-r3", language: "arduino", seed: project.simulation.seed });
  const image = { kind: "source" as const, language: "arduino-cpp" as const, files: [{ path: firmware.path, text: firmware.content }], entry: firmware.path };
  const loaded = mcu.load(image);
  const orch = createOrchestrator({ engines: [mcu], digital: createDigitalNets() });
  const opts = { seed: net.settings.seed, speed: 1, limits: { statements: 4_000_000, events: 100_000, outputBytes: 65_536 }, tier: "T1" as const, endNs: RUN_NS };
  const netOk = orch.load(net, opts).ok;
  orch.runUntil(RUN_NS, BUDGET);
  return { loaded: loaded.ok, netOk, now: orch.now, errors: mcu.diagnostics.filter((d) => d.severity === "error") };
}

describe("newUnoProject", () => {
  const project = newUnoProject(blank(), { registry, rnd: seededRandom() });

  it("holds the Uno, the breadboard and the Blink source and nothing else", () => {
    expect(project.boards.map((b) => [b.id, b.definition.ref])).toEqual([["brd_uno", "core.uno-r3"]]);
    expect(project.components.map((c) => [c.refdes, c.definition.ref])).toEqual([["BB1", "core.breadboard-half"]]);
    expect(project.nets).toEqual([]);
    expect(project.sources).toHaveLength(1);
    expect(project.sources[0]).toMatchObject({ path: "main.ino", language: "arduino-cpp", role: "firmware", board: "brd_uno" });
    expect(project.simulation.seed).toBe(blank().simulation.seed);
    expect(project.schemaVersion).toBe(blank().schemaVersion);
  });

  it("sets the breadboard as the surface of the breadboard view and places both boards", () => {
    const bb = project.views.find((v) => v.id === "vw_bb")!;
    expect(bb.surface).toBe(project.components[0]!.id);
    expect(bb.placements.map((p) => p.c).sort()).toEqual(["brd_uno", project.components[0]!.id].sort());
    expect(project.views.some((v) => v.id === "vw_sch" && v.kind === "schematic")).toBe(true);
  });

  it("validates", () => {
    expect(validateValue(project).ok).toBe(true);
  });
});

describe("starters", () => {
  it("lists ten with a title and a description key each", () => {
    expect(STARTERS).toHaveLength(10);
    expect(new Set(STARTERS.map((s) => s.id)).size).toBe(10);
    for (const s of STARTERS) expect(s).toMatchObject({ titleKey: `starters.${s.id}.title`, descriptionKey: `starters.${s.id}.description` });
  });

  it("has a committed file for every starter and none besides", () => {
    const files = readdirSync(join(__dirname, "starters")).map((f) => f.replace(".project.json", ""));
    expect(files.sort()).toEqual(STARTERS.map((s) => s.id).sort());
  });

  it("refuses an id it does not know", async () => {
    await expect(starter("nope")).rejects.toThrow("no starter named nope");
  });

  describe.each(STARTERS.map((s) => s.id))("%s", (id) => {
    it("forks as a new project that validates, keeps its licence and carries no solution", async () => {
      const project = await starter(id);
      expect(validateValue(project).ok).toBe(true);
      expect(project.id).toMatch(/^prj_/);
      expect(project.revision).toBe(0);
      expect(project.history.ops).toEqual([]);
      expect(project.provenance.origin).toEqual({ kind: "template", template: id });
      expect(project.meta.kind).toBe("project");
      expect(project.license.spdx).toBeTruthy();
      expect(JSON.stringify(project)).not.toContain("x-iynk-solution");
    });

    it("runs 5 virtual seconds with no error", async () => {
      const run = runFiveSeconds(await starter(id));
      expect(run).toMatchObject({ loaded: true, netOk: true, errors: [] });
      expect(run.now).toBeGreaterThanOrEqual(RUN_NS);
    });
  });

  it("gives each fork its own id", async () => {
    const a = await loadStarter("blink", { rnd: seededRandom(), now: NOW, actor: LOCAL_ACTOR });
    const b = await loadStarter("blink", { rnd: { bytes: (n) => new Uint8Array(n).fill(9) }, now: NOW, actor: LOCAL_ACTOR });
    expect(a.id).not.toBe(b.id);
  });
});

describe("module graph", () => {
  it("never reaches the catalogue converter or lesson content", () => {
    const source = readFileSync(join(__dirname, "templates.ts"), "utf8");
    expect(source).not.toMatch(/project\/convert/);
    expect(source).not.toMatch(/src\/content|@\/content|\/content\//);
  });
});
