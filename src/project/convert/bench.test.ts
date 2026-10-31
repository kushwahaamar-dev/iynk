// @vitest-environment node
import { readdirSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { extractBench, extractFigure, extractPartLegs } from "../../../scripts/figure-extract.mjs";
import { listItems, loadItem, loadTexts } from "../../../scripts/convert-io.mjs";
import schema from "../../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/project.schema.json" with { type: "json" };
import type { Project } from "../generated/types.ts";
import { stateHash } from "../hash.ts";
import { toFileText } from "../normalize.ts";
import { validateText, validateValue } from "../validate.ts";
import { convertBench } from "./bench.ts";
import type { BenchContext, BenchFigure } from "./bench.ts";
import { loadBoard } from "./convert.testing.ts";
import { partRef } from "./interfaces.ts";
import type { ConvertResult } from "./lesson.ts";
import type { CatalogueItem, Texts } from "./types.ts";

type RoboticsItem = CatalogueItem & { lab: "robotics" };

const AT = "2026-10-28T12:00:00.000Z";
const benchIds = (): string[] =>
  listItems()
    .filter((i: { lab: string }) => i.lab === "robotics")
    .map((i: { id: string }) => i.id);

interface Loaded {
  item: RoboticsItem;
  texts: Texts;
  bench: BenchFigure;
  ctx: BenchContext;
}

const loaded = new Map<string, Loaded>();
const converted = new Map<string, ConvertResult>();
let elapsedMs = 0;

async function loadBench(id: string, shared: Pick<BenchContext, "params" | "descriptors" | "legs">): Promise<Loaded> {
  const item = loadItem("robotics", id) as RoboticsItem;
  const bench = (await extractBench(id)) as BenchFigure;
  const board = item.data.board === null ? null : (loadItem("board", item.data.board) as CatalogueItem & { lab: "board" });
  const ctx: BenchContext = { at: AT, version: "0.1.0", headers: [], board, ...shared };
  return { item, texts: loadTexts("robotics", id) as Texts, bench, ctx };
}

beforeAll(async () => {
  const t0 = performance.now();
  const { params, descriptors } = (await loadBoard("uno-r3")).ctx;
  const legs: Record<string, readonly string[]> = {};
  for (const file of readdirSync("figures/parts").filter((f) => f.endsWith(".js"))) {
    legs[file.replace(/\.js$/, "")] = (await extractPartLegs(`figures/parts/${file}`)) as string[];
  }
  for (const id of benchIds()) {
    const bench = await loadBench(id, { params, descriptors, legs });
    loaded.set(id, bench);
    converted.set(id, convertBench(bench.item, bench.texts, bench.bench, bench.ctx));
  }
  elapsedMs = performance.now() - t0;
});

const all = (): ConvertResult[] => [...converted.values()];
const pick = (id: string): ConvertResult => converted.get(id)!;
interface Texted {
  [key: string]: unknown;
  power: { label: Record<string, string> };
  modes: unknown[];
  status: unknown[];
  current: { loads: unknown[] };
  faultText: object;
}

const legacyOf = <T = Record<string, unknown>>(project: Project, key: string): T => (project.ext as Record<string, T>)[key]!;
const faultKinds = new Set<string>(schema.$defs.Fault.properties.kind.enum);

describe("the 13 converted benches", () => {
  it("are 13 projects with distinct ids, converted in well under 10 s", () => {
    expect(converted.size).toBe(13);
    expect(new Set(all().map((r) => r.project.id)).size).toBe(13);
    expect(elapsedMs).toBeLessThan(10_000);
  });

  it("validate with no error", () => {
    for (const { project } of all()) {
      const errors = validateValue(project).diagnostics.filter((d) => d.severity === "error");
      expect(errors.map((d) => `${project.id} ${d.code} ${d.path} ${d.message}`)).toEqual([]);
    }
  });

  it("keep all 106 faults, each with a schema kind and the legacy params", () => {
    const faults = all().flatMap((r) => r.project.simulation.faults);
    expect(faults).toHaveLength(106);
    for (const fault of faults) {
      expect(faultKinds.has(fault.kind), fault.id).toBe(true);
      expect(Object.keys(fault.params ?? {}).sort()).toEqual(["effect", "figure", "legacy", "trigger"]);
      expect(fault.enabled).toBe(false);
    }
    for (const [id, { item }] of loaded) {
      expect(pick(id).project.simulation.faults).toHaveLength(item.data.faults.length);
    }
  });

  it("carry the legacy bench data under x-iynk-bench", () => {
    for (const [id, { item }] of loaded) {
      const legacy = legacyOf<Texted>(pick(id).project, "x-iynk-bench");
      expect(Object.keys(legacy).sort()).toEqual(["concept", "current", "defaultMode", "faultText", "figureParts", "modes", "power", "status", "tasks", "unplaced"]);
      expect(legacy.concept).toBe(id === "pi5-ros2");
      expect(legacy.tasks).toHaveLength(item.data.tasks.length);
      expect(legacy.power.label.en).toBeTypeOf("string");
      expect(legacy.modes).toHaveLength(item.data.modes.length);
      expect(legacy.status).toHaveLength(item.data.status.length);
      expect(legacy.current.loads).toHaveLength(item.data.current.loads.length);
      expect(Object.keys(legacy.faultText)).toHaveLength(item.data.faults.length);
      expect(legacyOf(pick(id).project, "x-iynk-legacy").fig).toBe(item.data.fig);
    }
  });

  it("have one source per mode and the default mode as the firmware entry", () => {
    for (const [id, { item }] of loaded) {
      const { project } = pick(id);
      expect(project.sources).toHaveLength(item.data.modes.length);
      const entry = project.sources.find((s) => s.id === `src_${id}-${item.data.defaultMode}`);
      expect(entry, id).toBeDefined();
      if (item.data.board === null) expect(project.boards).toEqual([]);
      else expect(project.boards[0]!.firmware!.entry).toBe(entry!.id);
    }
  });

  it("keep every build step and quiz in the guide", () => {
    for (const [id, { item }] of loaded) {
      const guide = pick(id).project.guide!;
      expect(guide.kind).toBe("bench");
      expect(guide.assembly).toHaveLength(item.data.steps.length);
      expect(guide.quizzes).toHaveLength(item.data.quizzes.length);
    }
  });

  it("have one component for every module and part of the catalogue", () => {
    for (const [id, { item }] of loaded) {
      const refs = new Set(pick(id).project.components.map((c) => c.definition.ref));
      for (const figure of [...item.data.modules, ...item.data.parts]) expect(refs.has(partRef(figure).ref), `${id} ${figure}`).toBe(true);
    }
  });

  it("derive nets for all 13 benches and drop no wire (AX-B2-02)", () => {
    for (const [id, { bench }] of loaded) {
      const { project, report } = pick(id);
      const codes = report.map((r) => r.code);
      expect(codes, id).not.toContain("unresolved-endpoint");
      expect(codes, id).not.toContain("bench-circuit-unresolved");
      const circuit = bench.circuit ? bench.circuits[bench.circuit] : undefined;
      expect(project.views[0]!.wires, id).toHaveLength(bench.wires.length + (circuit?.wires.length ?? 0));
    }
    const matWires = [...loaded.values()].reduce((sum, { bench }) => sum + bench.wires.length, 0);
    expect(matWires).toBe(92);
  });

  it("report a wire to nowhere instead of inventing a net", () => {
    const { item, texts, bench, ctx } = loaded.get("hc-sr04")!;
    const broken = { ...bench, wires: [{ from: "J1.1", to: "NANO.D99" }, ...bench.wires.slice(1)] };
    const { project, report } = convertBench(item, texts, broken, ctx);
    expect(report.filter((r) => r.code === "unresolved-endpoint")).toHaveLength(1);
    expect(project.views[0]!.wires).toHaveLength(bench.wires.length - 1);
  });

  it("convert to the same bytes twice", () => {
    const { item, texts, bench, ctx } = loaded.get("pca9685")!;
    expect(toFileText(convertBench(item, texts, bench, ctx).project)).toBe(toFileText(pick("pca9685").project));
  });

  it("round trip through the file text with the same state hash", () => {
    for (const { project } of all()) {
      const report = validateText(toFileText(project));
      expect(report.ok, project.id).toBe(true);
      expect(stateHash(report.doc!), project.id).toBe(stateHash(project));
    }
  });
});

describe("the l298n bench", () => {
  it("has 8 faults, 24 steps, 5 sources and a localized power label", () => {
    const { project } = pick("l298n");
    expect(project.simulation.faults).toHaveLength(8);
    expect(project.guide!.assembly).toHaveLength(24);
    expect(project.sources).toHaveLength(5);
    const power = legacyOf<Texted>(project, "x-iynk-bench").power;
    expect(Object.keys(power.label)).toContain("de");
  });

  it("joins the driver inputs to the Nano pins by the mat wires", () => {
    const { project } = pick("l298n");
    const net = project.nets.find((n) => n.name === "D8")!;
    expect(net.connections.some((c) => c.c === "brd_main" && c.p === "D8")).toBe(true);
    expect(net.connections.some((c) => c.c === "cmp_l298n")).toBe(true);
  });

  it("gives a fault no netlist target, so the netlist applier skips it", () => {
    for (const fault of pick("hc-sr04").project.simulation.faults) expect(fault.target).toEqual({});
  });
});

describe("the benches without a board or with a circuit of their own", () => {
  it("convert led-resistor and lm2596 with no board", () => {
    for (const id of ["led-resistor", "lm2596"]) {
      expect(pick(id).project.boards, id).toEqual([]);
      expect(pick(id).project.simulation.runtimes, id).toEqual([]);
    }
  });

  it("read the default circuit of transistor-switch as a breadboard view", () => {
    const { project } = pick("transistor-switch");
    expect(project.views[0]!.kind).toBe("breadboard");
    expect(project.nets.length).toBeGreaterThan(0);
    expect(legacyOf(project, "x-iynk-legacy").circuits).toHaveProperty("stage-drive");
  });

  it("keep the figure's default circuit key for every bench that has one", async () => {
    for (const id of ["transistor-switch", "uno-r3-build"]) {
      const { def } = await extractFigure(`figures/robotics/${id}.js`);
      expect(loaded.get(id)!.bench.circuit).toBe(def.circuit);
    }
  });

  it("apply the variant of the base board", () => {
    expect(pick("pi5-ros2").project.boards[0]!.variant).toBe("pi5");
  });
});
