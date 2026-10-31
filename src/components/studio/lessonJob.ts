import { getProfile, resolvePin, type BoardId, type BoardProfile, type CheckJob } from "@/lib/interp";
import { getAppRegistry } from "@/parts/builtin";
import type { Descriptor } from "@/parts/descriptor";
import type { Project } from "@/project/generated/types";
import { checkJobFor, plainPin, type CheckJobError } from "./checkJob";

export type JobError = CheckJobError | "unknown-test";

export interface LessonJobOpts {
  testId?: string;
  /** Replaces the entry source, for the empty-program run. */
  source?: string;
}

/** Pin classes that carry no interpreter pin number. */
const NO_NET: ReadonlySet<string> = new Set(["power", "ground", "nc", "passive"]);

/** The interpreter's pin number for each digital pin of the board's descriptor, named as the catalogue pinout names it. */
function descriptorNets(profile: BoardProfile, descriptor: Descriptor): Record<number, string> {
  const nets: Record<number, string> = {};
  for (const pin of descriptor.pins) {
    if (NO_NET.has(pin.class)) continue;
    const label = pin.designator ?? pin.id;
    const n = resolvePin(profile, pin.id) ?? resolvePin(profile, label) ?? plainPin(pin.id) ?? plainPin(label);
    if (n !== undefined && nets[n] === undefined) nets[n] = pin.id;
  }
  return nets;
}

/** The check job that runs a lesson project's test the way the old lesson page ran its lesson. */
export function lessonJobFor(project: Project, opts: LessonJobOpts = {}): CheckJob | { error: JobError } {
  const board = project.boards[0];
  if (!board) return { error: "no-board" };
  const testId = opts.testId ?? project.tests[0]?.id ?? "";
  if (opts.testId !== undefined && !project.tests.some((t) => t.id === opts.testId)) return { error: "unknown-test" };

  const entry = board.firmware?.entry;
  const state = opts.source === undefined ? project : { ...project, sources: project.sources.map((s) => (s.id === entry ? { ...s, content: opts.source ?? s.content } : s)) };
  const job = checkJobFor(state, testId, board.id);
  if ("error" in job) return job;

  const profile = getProfile(job.board as BoardId, board.variant);
  const descriptor = getAppRegistry().get(board.definition.ref, board.definition.version);
  const parameters = job.language === "verilog" ? project.parameters.flatMap((p) => (typeof p.value === "number" ? [[p.id, p.value] as const] : [])) : [];
  return {
    ...job,
    logicV: profile.logicV,
    nets: descriptor && descriptorNets(profile, descriptor),
    params: parameters.length > 0 ? Object.fromEntries(parameters) : undefined,
  };
}
