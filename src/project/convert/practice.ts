import type { Guide, Project } from "../generated/types.ts";
import { chainStart } from "../hash.ts";
import { convertLesson } from "./lesson.ts";
import type { ConvertContext, ConvertResult } from "./lesson.ts";
import { resolveText } from "./text.ts";
import type { CatalogueItem, ConvertLesson, FigureCircuit, ReportItem, Texts } from "./types.ts";

type BoardItem = CatalogueItem & { lab: "board" };
type BenchItem = CatalogueItem & { lab: "robotics" };

const SERIAL_BAUD = 9600;
const KEPT_FROM_LESSON: readonly (keyof Guide)[] = ["kind", "title", "lede", "hints", "starter", "legacyFigure"];

/** A practice task as the lesson it resembles, so the lesson converter builds its code, circuit, world and checks. */
function asLesson(task: BenchItem["data"]["tasks"][number]): ConvertLesson {
  return {
    id: task.id,
    n: 0,
    level: "project",
    language: task.language,
    code: task.starter,
    params: [],
    circuit: task.circuit,
    world: task.world,
    serial: { baud: SERIAL_BAUD, sample: [] },
    runMs: task.runMs,
    checks: task.checks,
    variants: [],
    pins: [],
    callouts: [],
    specs: [],
    features: [],
    title: task.title,
    lede: task.brief,
    steps: [],
    hints: task.hints,
  };
}

/**
 * One practice task of a robotics bench as a challenge project. The reference solution is kept in
 * `ext["x-iynk-solution"]`, with its comments in English, and nowhere in the guide or the sources.
 */
export function convertPracticeTask(
  item: BenchItem,
  taskId: string,
  texts: Texts,
  boardItem: BoardItem,
  circuits: Readonly<Record<string, FigureCircuit>>,
  ctx: ConvertContext,
): ConvertResult {
  const task = item.data.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`robotics/${item.id} has no task "${taskId}"`);
  if (task.board !== boardItem.id) throw new Error(`robotics/${item.id}/${task.id} runs on "${task.board}", not on board/${boardItem.id}`);

  const id = `prj_task-${item.id}-${task.id}`;
  const name = `robotics/${item.id}/${task.id}`;
  const lessonBoard: BoardItem = { ...boardItem, data: { ...boardItem.data, lessons: [asLesson(task)] } };
  const { project: lessonProject, report: lessonReport } = convertLesson(lessonBoard, task.id, texts, circuits, ctx);

  const report: ReportItem[] = lessonReport
    .filter((r) => r.code !== "third-party-unchecked")
    .map((r) => ({ ...r, item: name, project: id }));
  report.push({
    item: name,
    project: id,
    code: "third-party-unchecked",
    message: "Task wording, checks and timings may follow a third-party exercise site; review is pending (F-197)",
  });
  report.push({
    item: name,
    project: id,
    code: "hidden-solution",
    message: "The reference solution is kept in ext x-iynk-solution and is not part of the guide or the sources",
  });

  const { origin } = lessonProject.provenance;
  if (origin.kind !== "migration") throw new Error(`${name}: the lesson converter wrote an origin of kind "${origin.kind}"`);
  const guide = Object.fromEntries(KEPT_FROM_LESSON.map((key) => [key, lessonProject.guide?.[key]]).filter(([, v]) => v !== undefined)) as unknown as Guide;
  const project: Project = {
    ...lessonProject,
    id,
    meta: { ...lessonProject.meta, kind: "challenge", tags: [item.id, "challenge", task.board] },
    history: { ...lessonProject.history, baseChain: chainStart(id) },
    provenance: {
      ...lessonProject.provenance,
      origin: { ...origin, catalogue: { lab: "robotics", id: item.id, child: task.id } },
      thirdParty: lessonProject.provenance.thirdParty?.map((entry) => ({
        ...entry,
        what: "Task wording, checks and timings may follow a third-party exercise site (F-197 review pending)",
      })),
    },
    guide: { ...guide, kind: "challenge" },
    ext: { "x-iynk-solution": resolveText(task.solution, (key) => texts.en[key] ?? key) },
  };
  return { project, report };
}
