import type { Project } from "../generated/types.ts";
import { PLAN_KEY, WIRES_KEY } from "../guided/plan.ts";
import type { GuidedPlan, StepGate, WireableItem, WireablesExt } from "../guided/plan.ts";
import { substanceHash, tokenStream } from "../guided/substance.ts";
import type { SubstanceDeps } from "../guided/substance.ts";
import type { Translate } from "./text.ts";
import type { ConvertWireable } from "./types.ts";

export type PlanDeps = SubstanceDeps;

const POWER_PIN = /^(GND\d*|5V|3V3|3\.3V|VIN|VCC|VBUS|VSYS|IOREF|AREF)$/i;

function starterHashes(project: Project, deps: PlanDeps): Pick<GuidedPlan, "starterTokensSha256" | "starterSubstanceHash"> {
  const entry = project.sources.find((s) => s.role === "firmware");
  if (!entry) return {};
  return {
    starterTokensSha256: deps.sha256(tokenStream(entry.content, deps)),
    starterSubstanceHash: substanceHash(project, deps),
  };
}

/** A lesson is done when its checks pass, the learner has changed the starter and the quiz is answered. Prose steps get no gates. */
export function lessonPlan(project: Project, lesson: { level: string; board: string }, deps: PlanDeps): GuidedPlan {
  return {
    v: 1,
    mode: "guided",
    rung: "lesson",
    skill: [lesson.level, lesson.board],
    gates: [],
    complete: ["checks", "edit", "quiz"],
    tests: project.tests.map((t) => t.id),
    ...starterHashes(project, deps),
  };
}

/** A tour gates the assembly steps that the catalogue can judge from the figure's state; the others stay manual. */
export function tourPlan(project: Project): GuidedPlan {
  const assembly = (project.guide?.assembly ?? []) as { kind?: string; done?: Record<string, string | number | boolean | null> }[];
  const gates: StepGate[] = [];
  assembly.forEach((step, i) => {
    if (step.kind === "break") gates.push({ step: i, kind: "fault", state: "injected" });
    else if (step.done && Object.keys(step.done).length > 0) gates.push({ step: i, kind: "legacy-state", cond: step.done });
  });
  return { v: 1, mode: "guided", rung: "demo", skill: ["tour", project.meta.tags?.[0] ?? ""], gates, complete: ["steps"], tests: [] };
}

export function withPlan(project: Project, plan: GuidedPlan): Project {
  return { ...project, ext: { ...project.ext, [PLAN_KEY]: plan } };
}

export function withWireables(project: Project, ext: WireablesExt): Project {
  return { ...project, ext: { ...project.ext, [WIRES_KEY]: ext } };
}

/**
 * The board's wire-it lists with their texts resolved. With `pins` (a lesson's pins) only the parts whose signal pins
 * are all among them are kept, as in `lessonWireables` of the board lab; without, all of them. Null when none remain.
 */
export function wireablesOf(wireables: readonly ConvertWireable[], pins: readonly string[] | null, t: Translate): WireablesExt | null {
  const used = pins === null ? null : new Set(pins);
  const kept = wireables.filter((w) => {
    if (used === null) return true;
    const signals = w.connections.map((c) => c.to).filter((to) => !POWER_PIN.test(to));
    return signals.length > 0 && signals.every((to) => used.has(to));
  });
  if (kept.length === 0) return null;
  const items: WireableItem[] = kept.map((w) => ({
    part: w.part,
    supplyVolts: w.supplyVolts,
    ...(w.caution === undefined ? {} : { caution: t(w.caution) }),
    note: t(w.note),
    connections: w.connections.map((c) => ({ from: c.from, to: c.to, color: c.color as WireableItem["connections"][number]["color"] })),
  }));
  return { v: 1, items };
}
