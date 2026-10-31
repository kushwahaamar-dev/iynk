import type { Descriptor } from "@/parts/descriptor";
import type { Op, Project } from "@/project/generated/types";

export type InstanceRole = "motor" | "prop" | "esc" | "battery" | "fc" | "frame";

const TAG: Record<InstanceRole, string> = { motor: "M", prop: "P", esc: "ESC", battery: "BAT", fc: "FC", frame: "FR" };

/** The project's instance of this exact part, or the op that adds one. */
export function instanceFor(project: Project, role: InstanceRole, part: Descriptor): { id: string; add: Op[] } {
  const pool = role === "fc" ? project.boards : project.components;
  const found = pool.find((c) => c.definition.ref === part.id && c.definition.version === part.version);
  if (found) return { id: found.id, add: [] };

  const taken = new Set([...project.components, ...project.boards].flatMap((c) => [c.id, c.refdes]));
  let n = 1;
  while (taken.has(`${TAG[role]}${n}`) || taken.has(`${role === "fc" ? "brd" : "cmp"}_${role}${n}`)) n++;
  const instance = { id: `${role === "fc" ? "brd" : "cmp"}_${role}${n}`, definition: { ref: part.id, version: part.version }, refdes: `${TAG[role]}${n}` };
  return { id: instance.id, add: [role === "fc" ? { k: "board.add", board: instance } : { k: "component.add", component: instance }] };
}
