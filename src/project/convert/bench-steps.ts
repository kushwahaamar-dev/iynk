import type { Guide } from "../generated/types.ts";
import { buildAssembly, buildQuizzes } from "./guide.ts";
import type { Translate } from "./text.ts";
import type { ConvertRoboticsContent } from "./types.ts";

/** The build steps and quizzes of a bench as guide data. A quiz with no step to follow is written without `afterStep`. */
export function convertSteps(
  c: Pick<ConvertRoboticsContent, "id" | "steps" | "quizzes" | "faults">,
  t: Translate,
): { assembly: Record<string, unknown>[]; quizzes: NonNullable<Guide["quizzes"]> } {
  const stepIds = new Set(c.steps.map((s) => s.id));
  const faultIds = new Set(c.faults.map((f) => f.id));
  for (const step of c.steps) {
    if (step.fault !== undefined && !faultIds.has(step.fault)) throw new Error(`robotics/${c.id}: step ${step.id} names the unknown fault ${step.fault}`);
  }
  for (const quiz of c.quizzes) {
    if (quiz.afterStep !== null && !stepIds.has(quiz.afterStep)) throw new Error(`robotics/${c.id}: quiz ${quiz.id} follows the unknown step ${quiz.afterStep}`);
  }
  return { assembly: buildAssembly(c.steps, t), quizzes: buildQuizzes(c.quizzes, t) };
}
