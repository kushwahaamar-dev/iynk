import { newId } from "../../core/ids.ts";
import type { Group, Op, Project as ProjectState, View } from "../../project/generated/types.ts";

export type GroupError = { error: "need-two" | "nesting" | "already-grouped"; ids?: string[] };

const viewOf = (state: ProjectState, viewId: string): View | undefined => state.views.find((v) => v.id === viewId);

/** A group of two or more members. Refused when a member is itself a group or already sits in another one. */
export function groupOps(
  state: ProjectState,
  viewId: string,
  members: readonly string[],
  name?: string,
  groupId: () => string = () => newId("grp"),
): Op[] | GroupError {
  const unique = [...new Set(members)];
  if (unique.length < 2) return { error: "need-two" };
  const groups = viewOf(state, viewId)?.groups ?? [];
  const nested = unique.filter((m) => groups.some((g) => g.id === m));
  if (nested.length > 0) return { error: "nesting", ids: nested };
  const taken = unique.filter((m) => groups.some((g) => g.members.includes(m)));
  if (taken.length > 0) return { error: "already-grouped", ids: taken };
  const group: Group = { id: groupId(), members: unique as Group["members"] };
  if (name !== undefined) group.name = name;
  return [{ k: "group.set", view: viewId, group }];
}

export function ungroupOps(viewId: string, groupId: string): Op[] {
  return [{ k: "group.remove", view: viewId, id: groupId }];
}

/** The selection plus every member of any group it touches. */
export function expandSelection(state: ProjectState, viewId: string, selected: readonly string[]): string[] {
  const groups = viewOf(state, viewId)?.groups ?? [];
  const out = new Set(selected);
  for (const group of groups) {
    if (group.members.some((m) => out.has(m))) for (const m of group.members) out.add(m);
  }
  return [...out];
}

/** Moves every member of the group by the same offset, in one batch. Wires move only when they carry a drawn route. */
export function moveGroupOps(state: ProjectState, viewId: string, groupId: string, dx_mm: number, dy_mm: number): Op[] {
  const view = viewOf(state, viewId);
  const group = view?.groups?.find((g) => g.id === groupId);
  if (!view || !group) return [];
  const members = new Set<string>(group.members);
  const round2 = (n: number): number => Math.round(n * 100) / 100;
  const ops: Op[] = [];
  for (const placement of view.placements) {
    if (members.has(placement.c)) {
      ops.push({ k: "view.place", view: viewId, placement: { ...placement, x_mm: round2(placement.x_mm + dx_mm), y_mm: round2(placement.y_mm + dy_mm) } });
    }
  }
  for (const junction of view.junctions ?? []) {
    if (members.has(junction.id)) {
      ops.push({ k: "junction.add", view: viewId, junction: { ...junction, x_mm: round2(junction.x_mm + dx_mm), y_mm: round2(junction.y_mm + dy_mm) } });
    }
  }
  for (const label of view.labels ?? []) {
    if (members.has(label.id)) {
      ops.push({ k: "label.set", view: viewId, label: { ...label, x_mm: round2(label.x_mm + dx_mm), y_mm: round2(label.y_mm + dy_mm) } });
    }
  }
  for (const wire of view.wires) {
    if (members.has(wire.id) && wire.route_mm?.length) {
      const route = wire.route_mm.map(([x, y, ...rest]) => [round2(x + dx_mm), round2(y + dy_mm), ...rest]);
      ops.push({ k: "wire.route", view: viewId, id: wire.id, route_mm: route as Extract<Op, { k: "wire.route" }>["route_mm"] });
    }
  }
  return ops;
}
