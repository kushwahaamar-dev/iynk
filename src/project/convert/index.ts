import type { Project } from "../generated/types.ts";
import { canonicalBytes, stateHash } from "../hash.ts";
import { netlist } from "../netlist.ts";
import { toFileText } from "../normalize.ts";
import { validateText } from "../validate.ts";
import { convertBench } from "./bench.ts";
import type { BenchFigure } from "./bench.ts";
import { convertCraft } from "./craft.ts";
import { convertBoardTour, convertLesson } from "./lesson.ts";
import type { ConvertContext, ConvertResult } from "./lesson.ts";
import { convertPracticeTask } from "./practice.ts";
import type { CatalogueItem, FigureCircuit, FigureHeader, ReportCode, ReportItem, Texts } from "./types.ts";

export type ProjectKind = "tour" | "lesson" | "bench" | "task" | "craft";
export type ItemStatus = "whole" | "legacy" | "failed";

/** Everything the converters read from files, behind lookups so this module stays portable. */
export interface ConvertSources {
  item(lab: CatalogueItem["lab"], id: string): CatalogueItem;
  texts(lab: CatalogueItem["lab"], id: string): Texts;
  /** The circuits of a catalogue board's figure. */
  circuits(boardId: string): Record<string, FigureCircuit>;
  /** The header parts of a catalogue board's figure. */
  headers(boardId: string): FigureHeader[];
  bench(id: string): BenchFigure;
}

export interface ConvertedProject {
  id: string;
  kind: ProjectKind;
  item: string;
  project: Project;
}

export interface ConvertReport {
  items: { lab: string; id: string; projects: number; status: ItemStatus; reasons: ReportItem[] }[];
  totals: {
    items: number;
    whole: number;
    legacy: number;
    failed: number;
    projects: number;
    withNets: number;
    noDescriptor: string[];
  };
}

export interface ManifestEntry {
  id: string;
  kind: ProjectKind;
  item: string;
  stateHash: string;
  canonicalBytes: number;
  nets: number;
  warnings: number;
}

interface Inspection {
  problems: string[];
  warnings: number;
}

type BoardItem = CatalogueItem & { lab: "board" };
type RoboticsItem = CatalogueItem & { lab: "robotics" };

const LEGACY_CODES: ReadonlySet<ReportCode> = new Set(["legacy-circuit", "bench-circuit-unresolved"]);
const SHOWN_CODES: ReadonlySet<ReportCode> = new Set(["legacy-circuit", "bench-circuit-unresolved", "skipped"]);
const FIRST_PROBLEMS = 3;

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const inspections = new WeakMap<Project, Inspection>();

/** V1 to V5 on the file text, the round trip to the same hash, and the netlist. */
function inspect(project: Project): Inspection {
  const known = inspections.get(project);
  if (known) return known;
  const problems: string[] = [];
  const report = validateText(toFileText(project));
  for (const d of report.diagnostics.filter((x) => x.severity === "error").slice(0, FIRST_PROBLEMS)) {
    problems.push(`${d.code} ${d.path}: ${d.message}`);
  }
  if (report.errors > FIRST_PROBLEMS) problems.push(`and ${report.errors - FIRST_PROBLEMS} more errors`);
  if (report.doc && stateHash(report.doc) !== stateHash(project)) problems.push("the file text does not round-trip to the same hash");
  try {
    netlist(project);
  } catch (e) {
    problems.push(`the netlist cannot be computed (${e instanceof Error ? e.message : String(e)})`);
  }
  const found = { problems, warnings: report.warnings };
  inspections.set(project, found);
  return found;
}

function* convertItem(item: CatalogueItem, sources: ConvertSources, ctx: ConvertContext): Generator<{ kind: ProjectKind; result: ConvertResult }> {
  const texts = sources.texts(item.lab, item.id);
  if (item.lab === "board") {
    const withHeaders = { ...ctx, headers: sources.headers(item.id) };
    const circuits = sources.circuits(item.id);
    yield { kind: "tour", result: convertBoardTour(item, texts, withHeaders) };
    for (const lesson of item.data.lessons) {
      yield { kind: "lesson", result: convertLesson(item, lesson.id, texts, circuits, withHeaders) };
    }
  } else if (item.lab === "robotics") {
    const figure = sources.bench(item.id);
    const boardOf = (id: string): BoardItem => sources.item("board", id) as BoardItem;
    const board = item.data.board === null ? null : boardOf(item.data.board);
    yield { kind: "bench", result: convertBench(item as RoboticsItem, texts, figure, { ...ctx, headers: [], board }) };
    for (const task of item.data.tasks) {
      const taskBoard = boardOf(task.board);
      const circuits = { ...sources.circuits(task.board), ...figure.circuits };
      yield {
        kind: "task",
        result: convertPracticeTask(item as RoboticsItem, task.id, texts, taskBoard, circuits, { ...ctx, headers: sources.headers(task.board) }),
      };
    }
  } else {
    yield { kind: "craft", result: convertCraft(item, texts, ctx) };
  }
}

const failure = (item: string, message: string, project?: string): ReportItem => ({ item, ...(project ? { project } : {}), code: "skipped", message });

/** Converts every item and says, for each, whether it is whole, kept as legacy data in part, or failed. */
export function convertAll(
  items: readonly CatalogueItem[],
  sources: ConvertSources,
  ctx: ConvertContext,
): { projects: ConvertedProject[]; report: ConvertReport } {
  const projects: ConvertedProject[] = [];
  const report: ConvertReport = {
    items: [],
    totals: { items: 0, whole: 0, legacy: 0, failed: 0, projects: 0, withNets: 0, noDescriptor: [] },
  };
  const noDescriptor = new Set<string>();

  for (const item of items) {
    const name = `${item.lab}/${item.id}`;
    const reasons: ReportItem[] = [];
    let count = 0;
    let failed = false;
    try {
      for (const { kind, result } of convertItem(item, sources, ctx)) {
        count++;
        projects.push({ id: result.project.id, kind, item: name, project: result.project });
        reasons.push(...result.report);
        const { problems } = inspect(result.project);
        if (problems.length > 0) failed = true;
        for (const problem of problems) reasons.push(failure(name, `invalid: ${problem}`, result.project.id));
      }
    } catch (e) {
      failed = true;
      reasons.push(failure(name, `the conversion stopped (${e instanceof Error ? e.message : String(e)})`));
    }
    for (const r of reasons) if (r.code === "no-descriptor") for (const ref of r.refs ?? []) noDescriptor.add(ref);

    const status: ItemStatus = failed ? "failed" : reasons.some((r) => LEGACY_CODES.has(r.code)) ? "legacy" : "whole";
    report.items.push({ lab: item.lab, id: item.id, projects: count, status, reasons });
    report.totals[status]++;
  }

  report.totals.items = report.items.length;
  report.totals.projects = projects.length;
  report.totals.withNets = projects.filter((p) => p.project.nets.length > 0).length;
  report.totals.noDescriptor = [...noDescriptor].sort(byText);
  return { projects, report };
}

/** The report as plain markdown: the totals, the items that are not whole, and the parts with no descriptor. */
export function renderReport(r: ConvertReport): string {
  const { totals } = r;
  const lines = [
    "# Catalogue conversion report",
    "",
    "| Count | Value |",
    "| --- | --- |",
    `| Items | ${totals.items} |`,
    `| Whole | ${totals.whole} |`,
    `| Kept as legacy data | ${totals.legacy} |`,
    `| Failed | ${totals.failed} |`,
    `| Projects | ${totals.projects} |`,
    `| Projects with nets | ${totals.withNets} |`,
    "",
    "## Items that are not whole",
    "",
  ];
  const rest = r.items.filter((i) => i.status !== "whole");
  if (rest.length === 0) {
    lines.push("None. Every item is whole.");
  } else {
    lines.push("| Item | Status | Code | Reason |", "| --- | --- | --- | --- |");
    for (const i of rest) {
      const shown = i.reasons.filter((x) => SHOWN_CODES.has(x.code));
      for (const x of shown) lines.push(`| ${i.lab}/${i.id} | ${i.status} | ${x.code} | ${cell(x.message)}${x.project ? ` (${x.project})` : ""} |`);
      if (shown.length === 0) lines.push(`| ${i.lab}/${i.id} | ${i.status} | | |`);
    }
  }
  lines.push("", "## Parts with no descriptor", "");
  if (totals.noDescriptor.length === 0) lines.push("None.");
  else for (const ref of totals.noDescriptor) lines.push(`- ${ref}`);
  lines.push("", "## All items", "", "| Item | Projects | Status |", "| --- | --- | --- |");
  for (const i of r.items) lines.push(`| ${i.lab}/${i.id} | ${i.projects} | ${i.status} |`);
  return `${lines.join("\n")}\n`;
}

const cell = (text: string): string => text.replace(/\|/g, "/").replace(/\s+/g, " ");

/** One row per project, sorted by id: what `--check` compares against the committed manifest. */
export function manifestOf(projects: readonly ConvertedProject[]): ManifestEntry[] {
  return projects
    .map(({ id, kind, item, project }) => ({
      id,
      kind,
      item,
      stateHash: stateHash(project),
      canonicalBytes: canonicalBytes(project),
      nets: project.nets.length,
      warnings: inspect(project).warnings,
    }))
    .sort((a, b) => byText(a.id, b.id));
}
