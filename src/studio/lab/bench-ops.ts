import type { Fault, Op, Project } from "../../project/generated/types.ts";
import { faultIdOf, isLegacyFault } from "./bench-select.ts";

const setEnabled = (fault: Fault, enabled: boolean): Op => ({ k: "fault.set", fault: { ...fault, enabled } });

/** Enables the bench fault and disables any other one, so the whole click is one batch and one undo step. */
export function faultTriggerOps(project: Project, faultId: string): Op[] {
  const target = project.simulation.faults.find((f) => isLegacyFault(f) && f.id === faultIdOf(faultId));
  if (!target || target.enabled) return [];
  const others = project.simulation.faults.filter((f) => isLegacyFault(f) && f.enabled && f.id !== target.id);
  return [...others.map((f) => setEnabled(f, false)), setEnabled(target, true)];
}

export const faultClearOps = (project: Project): Op[] =>
  project.simulation.faults.filter((f) => isLegacyFault(f) && f.enabled).map((f) => setEnabled(f, false));
