import type { Op, Project } from "../../project/generated/types.ts";
import { pickParameter } from "./craft-select.ts";
import type { PickKey } from "./craft-select.ts";

/** The op that moves a design pick to `value`; empty when the parameter is missing or does not offer that value. */
export function pickOps(project: Project, key: PickKey, value: string): Op[] {
  const parameter = pickParameter(project, key);
  if (!parameter?.options?.some((option) => option.value === value)) return [];
  return [{ k: "param.set", parameter: { ...parameter, value } }];
}
