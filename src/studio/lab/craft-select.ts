import type { Parameter, Project } from "../../project/generated/types.ts";

export type CraftPick = { batt: string; motor: string; prop: string };
export type PickKey = keyof CraftPick;

export const PICK_PARAMETERS: Record<PickKey, string> = { batt: "par_batt", motor: "par_motor", prop: "par_prop" };

export function pickParameter(project: Project, key: PickKey): Parameter | undefined {
  return project.parameters.find((p) => p.id === PICK_PARAMETERS[key]);
}

/** The battery, motor and propeller the design currently holds, or null when the document lacks one of them. */
export function currentPick(project: Project): CraftPick | null {
  const batt = pickParameter(project, "batt")?.value;
  const motor = pickParameter(project, "motor")?.value;
  const prop = pickParameter(project, "prop")?.value;
  if (typeof batt !== "string" || typeof motor !== "string" || typeof prop !== "string") return null;
  return { batt, motor, prop };
}

export function craftContentId(project: Project): string | null {
  return project.domains?.drone?.data.legacy?.contentId ?? null;
}

export function isLegacyCraft(project: Project): boolean {
  return project.domains?.drone?.data.kind === "legacy-craft";
}
