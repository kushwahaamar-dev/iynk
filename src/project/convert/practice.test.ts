// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { extractBench, extractPartLegs } from "../../../scripts/figure-extract.mjs";
import { listItems, loadItem, loadTexts } from "../../../scripts/convert-io.mjs";
import type { Project } from "../generated/types.ts";
import { stateHash } from "../hash.ts";
import { toFileText } from "../normalize.ts";
import { validateText, validateValue } from "../validate.ts";
import { boardIds, loadBoard } from "./convert.testing.ts";
import type { BoardItem, LoadedBoard } from "./convert.testing.ts";
import { convertLesson } from "./lesson.ts";
import type { ConvertContext, ConvertResult } from "./lesson.ts";
import { convertPracticeTask } from "./practice.ts";
import { resolveText } from "./text.ts";
import type { CatalogueItem, ConvertCheck, FigureBench, FigureCircuit, Texts } from "./types.ts";

type BenchItem = CatalogueItem & { lab: "robotics" };

const boards = new Map<string, LoadedBoard>();
const benches = new Map<string, { item: BenchItem; texts: Texts }>();
const tasks = new Map<string, ConvertResult>();
const lessons = new Map<string, ConvertResult>();
let elapsedMs = 0;

/** The circuits a task can name: those of its board and those the bench figure adds, with the legs of their parts. */
async function circuitsOf(benchId: string, board: LoadedBoard): Promise<{ circuits: Record<string, FigureCircuit>; ctx: ConvertContext }> {
  const circuits = { ...board.circuits, ...((await extractBench(benchId)) as FigureBench).circuits };
  const legs = { ...board.ctx.legs };
  for (const circuit of Object.values(circuits)) {
    for (const { part } of circuit.parts) legs[part] ??= (await extractPartLegs(`figures/parts/${part}.js`)) as string[];
  }
  return { circuits, ctx: { ...board.ctx, legs } };
}

async function convertTask(bench: BenchItem, texts: Texts, taskId: string): Promise<ConvertResult> {
  const board = boards.get(bench.data.tasks.find((t) => t.id === taskId)!.board)!;
  const { circuits, ctx } = await circuitsOf(bench.id, board);
  return convertPracticeTask(bench, taskId, texts, board.item, circuits, ctx);
}

beforeAll(async () => {
  const t0 = performance.now();
  for (const id of boardIds()) {
    const board = await loadBoard(id);
    boards.set(id, board);
    for (const lesson of board.item.data.lessons) {
      lessons.set(`${id}/${lesson.id}`, convertLesson(board.item, lesson.id, board.texts, board.circuits, board.ctx));
    }
  }
  for (const { lab, id } of listItems() as { lab: string; id: string }[]) {
    if (lab !== "robotics") continue;
    const bench = { item: loadItem("robotics", id) as BenchItem, texts: loadTexts("robotics", id) as Texts };
    benches.set(id, bench);
    for (const task of bench.item.data.tasks) tasks.set(`${id}/${task.id}`, await convertTask(bench.item, bench.texts, task.id));
  }
  elapsedMs = performance.now() - t0;
});

const projects = (results: Map<string, ConvertResult>): Project[] => [...results.values()].map((r) => r.project);
const stripped = (project: Project): string => JSON.stringify({ ...project, ext: undefined });

describe("the 31 converted practice tasks", () => {
  it("have distinct ids and the origin of their bench", () => {
    expect(tasks.size).toBe(31);
    expect(new Set(projects(tasks).map((p) => p.id)).size).toBe(31);
    for (const [key, { project }] of tasks) {
      const [bench, task] = key.split("/");
      expect(project.id).toBe(`prj_task-${bench}-${task}`);
      expect(project.meta.kind).toBe("challenge");
      expect(project.guide?.kind).toBe("challenge");
      expect(project.provenance.origin).toMatchObject({ kind: "migration", catalogue: { lab: "robotics", id: bench, child: task } });
    }
  });

  it("convert in well under 30 s together with the lessons", () => {
    expect(elapsedMs).toBeLessThan(30_000);
  });

  it("validate with no error", () => {
    for (const project of projects(tasks)) {
      const errors = validateValue(project).diagnostics.filter((d) => d.severity === "error");
      expect(errors.map((d) => `${project.id} ${d.code} ${d.path} ${d.message}`)).toEqual([]);
    }
  });

  it("keep the solution in ext and in no guide or source text", () => {
    for (const [key, { project, report }] of tasks) {
      const [bench, task] = key.split("/");
      const { item, texts } = benches.get(bench!)!;
      const solution = resolveText(item.data.tasks.find((t) => t.id === task)!.solution, (k) => texts.en[k] ?? k);
      expect((project.ext as Record<string, unknown>)["x-iynk-solution"], key).toBe(solution);
      expect(stripped(project), key).not.toContain(JSON.stringify(solution).slice(1, -1));
      expect(project.sources.some((s) => s.content === solution), key).toBe(false);
      expect(report.filter((r) => r.code === "hidden-solution"), key).toHaveLength(1);
    }
  });

  it("have one source, one test and a board that is always set", () => {
    for (const { project } of tasks.values()) {
      expect(project.boards).toHaveLength(1);
      expect(project.sources).toHaveLength(1);
      expect(project.tests).toHaveLength(1);
      expect(project.simulation.duration_ms).toBe(project.tests[0]!.runMs);
      expect(project.guide?.starter?.source).toBe(project.sources[0]!.id);
    }
  });

  it("carry the circuit of the task as nets, and none when the task has no circuit", () => {
    for (const [key, { project }] of tasks) {
      const [bench, task] = key.split("/");
      const source = benches.get(bench!)!.item.data.tasks.find((t) => t.id === task)!;
      if (source.circuit === null) expect(project.nets, key).toEqual([]);
      else expect(project.nets.length, key).toBeGreaterThan(0);
    }
  });

  it("round trip through the file text with the same state hash", () => {
    for (const { project } of tasks.values()) {
      const report = validateText(toFileText(project));
      expect(report.ok, project.id).toBe(true);
      expect(stateHash(report.doc!), project.id).toBe(stateHash(project));
    }
  });

  it("convert to the same bytes twice", async () => {
    for (const [key, first] of [...tasks].slice(0, 3)) {
      const [bench, task] = key.split("/");
      const { item, texts } = benches.get(bench!)!;
      expect(toFileText((await convertTask(item, texts, task!)).project), key).toBe(toFileText(first.project));
    }
  });

  it("refuse a task that does not exist or that runs on another board", () => {
    const [{ item, texts }] = [...benches.values()];
    const board = boards.get(item.data.tasks[0]!.board)!;
    expect(() => convertPracticeTask(item, "nope", texts, board.item, board.circuits, board.ctx)).toThrow(/no task/);
    const other = [...boards.values()].find((b) => b.item.id !== board.item.id)!;
    expect(() => convertPracticeTask(item, item.data.tasks[0]!.id, texts, other.item as BoardItem, other.circuits, other.ctx)).toThrow(/not on board/);
  });
});

describe("the 71 lessons and 31 tasks together", () => {
  const catalogueChecks = (): { key: string; checks: ConvertCheck[]; texts: Texts }[] => [
    ...[...boards.values()].flatMap((b) => b.item.data.lessons.map((l) => ({ key: `${b.item.id}/${l.id}`, checks: l.checks, texts: b.texts }))),
    ...[...benches.values()].flatMap((b) => b.item.data.tasks.map((t) => ({ key: `${b.item.id}/${t.id}`, checks: t.checks, texts: b.texts }))),
  ];

  it("have the 461 checks of the catalogue, unchanged apart from the resolved label", () => {
    expect(lessons.size).toBe(71);
    const converted = new Map([...lessons, ...tasks].map(([key, r]) => [key, r.project.tests[0]?.checks ?? []]));
    let total = 0;
    for (const { key, checks, texts } of catalogueChecks()) {
      const out = converted.get(key)!;
      expect(out, key).toHaveLength(checks.length);
      checks.forEach((check, i) => {
        const { id, visibility, label, ...rest } = out[i]! as unknown as Record<string, unknown>;
        expect(rest, `${key} check ${i + 1}`).toEqual(Object.fromEntries(Object.entries(check).filter(([k]) => k !== "label")));
        expect(visibility).toBe("visible");
        expect(id).toBe(`c${i + 1}`);
        expect((label as { en: string }).en, key).toBe(texts.en[check.label]);
      });
      total += checks.length;
    }
    expect(total).toBe(461);
  });

  it("have the parameter chips counted in the catalogue", () => {
    const all = projects(lessons);
    const parameters = all.flatMap((p) => p.parameters);
    expect(parameters.filter((p) => p.kind === "number")).toHaveLength(65);
    expect(parameters.filter((p) => p.kind === "choice")).toHaveLength(35);
    expect(parameters.filter((p) => p.kind === "toggle")).toHaveLength(1);
    expect(parameters.filter((p) => p.kind === "number" && p.keepApart)).toHaveLength(6);
    const chips = [...boards.values()].flatMap((b) => b.item.data.lessons.flatMap((l) => l.params));
    expect(chips.filter((c) => c.figure)).toHaveLength(13);
  });

  it("have the text and parameter tokens and the libraries counted in the catalogue", () => {
    const sources = [
      ...[...boards.values()].flatMap((b) => b.item.data.lessons.map((l) => l.code)),
      ...[...benches.values()].flatMap((b) => b.item.data.tasks.map((t) => t.starter)),
    ];
    const count = (re: RegExp): number => sources.reduce((n, c) => n + (c.source.match(re)?.length ?? 0), 0);
    expect(count(/\{\{t:/g)).toBe(388);
    expect(count(/\{\{p:/g)).toBe(105);
    const libraries = new Set([...projects(lessons), ...projects(tasks)].flatMap((p) => p.dependencies.libraries.map((l) => l.name)));
    expect(libraries.size).toBe(19);
  });
});
