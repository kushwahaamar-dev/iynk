import { LIMITS } from "../../core/limits.ts";
import type { Group, Junction, Label, Op, Placement, Project, View, Wire, WireEnd } from "../generated/types.ts";
import { allEntityIds, findById, reject, upsertById } from "./types.ts";
import type { Handler, Reject } from "./types.ts";

export const noView = (id: string): Reject => reject("missing_target", `${id} does not exist`);

export const replaceView = (state: Project, view: View): Project => ({
  ...state,
  views: state.views.map((other) => (other.id === view.id ? view : other)),
});

/** The view with a list set, or without the key when the list is empty: the document never stores an empty one. */
export function withList<K extends "junctions" | "labels" | "groups">(
  view: View,
  key: K,
  items: NonNullable<View[K]>,
): View {
  if (items.length > 0) return { ...view, [key]: items };
  const next = { ...view };
  delete next[key];
  return next;
}

export const junctionEnds = (wire: Wire): string[] =>
  [wire.from, wire.to].flatMap((end) => (end.kind === "junction" ? [end.id] : []));

export const isPinEnd = (end: WireEnd, c: string, p: string): boolean =>
  end.kind === "pin" && end.c === c && end.p === p;

/** The ids of drawn things to delete from one view. */
export interface Gone {
  placements?: ReadonlySet<string>;
  wires?: ReadonlySet<string>;
  junctions?: ReadonlySet<string>;
  labels?: ReadonlySet<string>;
}

export interface ViewEdit {
  view: View;
  restore: Op[];
}

/** Ops that draw the given things again, in dependency order, then put the groups back as they were. */
export function drawOps(
  view: string,
  drawn: { placements?: Placement[]; junctions?: Junction[]; labels?: Label[]; wires?: Wire[]; groups?: Group[] },
): Op[] {
  return [
    ...(drawn.placements ?? []).map((placement): Op => ({ k: "view.place", view, placement })),
    ...(drawn.junctions ?? []).map((junction): Op => ({ k: "junction.add", view, junction })),
    ...(drawn.labels ?? []).map((label): Op => ({ k: "label.set", view, label })),
    ...(drawn.wires ?? []).map((wire): Op => ({ k: "wire.add", view, wire })),
    ...(drawn.groups ?? []).map((group): Op => ({ k: "group.set", view, group })),
  ];
}

const dropFrom = <T>(items: T[], doomed: T[]): T[] => {
  if (doomed.length === 0) return items;
  const gone = new Set(doomed);
  return items.filter((item) => !gone.has(item));
};

/**
 * Deletes drawn things from a view. A deleted thing leaves its group in the same step, and a group left with fewer
 * than two members goes too (G2). `restore` draws everything again and puts the groups back.
 */
export function cut(view: View, gone: Gone): ViewEdit {
  const placements = view.placements.filter((p) => gone.placements?.has(p.c));
  const wires = view.wires.filter((w) => gone.wires?.has(w.id));
  const junctions = (view.junctions ?? []).filter((j) => gone.junctions?.has(j.id));
  const labels = (view.labels ?? []).filter((l) => gone.labels?.has(l.id));
  const ids = new Set([
    ...placements.map((p) => p.c),
    ...wires.map((w) => w.id),
    ...junctions.map((j) => j.id),
    ...labels.map((l) => l.id),
  ]);
  if (ids.size === 0) return { view, restore: [] };

  let next: View = {
    ...view,
    placements: dropFrom(view.placements, placements),
    wires: dropFrom(view.wires, wires),
  };
  if (junctions.length > 0) next = withList(next, "junctions", dropFrom(view.junctions ?? [], junctions));
  if (labels.length > 0) next = withList(next, "labels", dropFrom(view.labels ?? [], labels));

  const touched = (view.groups ?? []).filter((group) => group.members.some((member) => ids.has(member)));
  if (touched.length > 0) {
    const kept = (view.groups ?? []).flatMap((group): Group[] => {
      if (!touched.includes(group)) return [group];
      const members = group.members.filter((member) => !ids.has(member));
      return members.length >= 2 ? [{ ...group, members: members as Group["members"] }] : [];
    });
    next = withList(next, "groups", kept);
  }
  return { view: next, restore: drawOps(view.id, { placements, junctions, labels, wires, groups: touched }) };
}

/** Junctions that lost every wire to the deleted ones: nothing is left to join, so they go too. */
export function orphanedJunctions(view: View, deadWires: ReadonlySet<string>): Set<string> {
  const stillWired = new Set(view.wires.filter((w) => !deadWires.has(w.id)).flatMap(junctionEnds));
  const hadWire = view.wires.filter((w) => deadWires.has(w.id)).flatMap(junctionEnds);
  return new Set(hadWire.filter((id) => !stillWired.has(id)));
}

const wireAdd: Handler<"wire.add"> = (state, op) => {
  const view = findById(state.views, op.view);
  if (!view) return noView(op.view);
  if (view.wires.length >= LIMITS.wiresPerView) {
    return reject("quota", `a view holds at most ${LIMITS.wiresPerView} wires`);
  }
  if (state.views.some((other) => findById(other.wires, op.wire.id))) {
    return reject("duplicate_id", `${op.wire.id} is already used`);
  }
  return {
    state: replaceView(state, { ...view, wires: upsertById(view.wires, op.wire) }),
    inverse: [{ k: "wire.remove", view: view.id, id: op.wire.id }],
  };
};

const wireRoute: Handler<"wire.route"> = (state, op) => {
  const view = findById(state.views, op.view);
  if (!view) return noView(op.view);
  const wire = findById(view.wires, op.id);
  if (!wire) return reject("missing_target", `${op.id} does not exist`);
  const routed: Wire = { ...wire };
  if (op.route_mm.length === 0) delete routed.route_mm;
  else routed.route_mm = op.route_mm as Wire["route_mm"];
  return {
    state: replaceView(state, { ...view, wires: upsertById(view.wires, routed) }),
    inverse: [{ k: "wire.route", view: view.id, id: op.id, route_mm: wire.route_mm ?? [] }],
  };
};

const wireRemove: Handler<"wire.remove"> = (state, op) => {
  const view = findById(state.views, op.view);
  if (!view) return noView(op.view);
  if (!findById(view.wires, op.id)) return reject("missing_target", `${op.id} does not exist`);
  const edit = cut(view, { wires: new Set([op.id]) });
  return { state: replaceView(state, edit.view), inverse: edit.restore };
};

const wireSet: Handler<"wire.set"> = (state, op) => {
  const view = findById(state.views, op.view);
  if (!view) return noView(op.view);
  const wire = findById(view.wires, op.id);
  if (!wire) return reject("missing_target", `${op.id} does not exist`);
  const painted: Wire = { ...wire };
  if (op.color === undefined) delete painted.color;
  else painted.color = op.color;
  const inverse: Op = { k: "wire.set", view: view.id, id: op.id };
  if (wire.color !== undefined) inverse.color = wire.color;
  return { state: replaceView(state, { ...view, wires: upsertById(view.wires, painted) }), inverse: [inverse] };
};

const junctionAdd: Handler<"junction.add"> = (state, op) => {
  const view = findById(state.views, op.view);
  if (!view) return noView(op.view);
  const junctions = view.junctions ?? [];
  if (junctions.length >= LIMITS.junctionsPerView) {
    return reject("quota", `a view holds at most ${LIMITS.junctionsPerView} junctions`);
  }
  if (allEntityIds(state).has(op.junction.id)) return reject("duplicate_id", `${op.junction.id} is already used`);
  return {
    state: replaceView(state, withList(view, "junctions", upsertById(junctions, op.junction))),
    inverse: [{ k: "junction.remove", view: view.id, id: op.junction.id }],
  };
};

const junctionRemove: Handler<"junction.remove"> = (state, op) => {
  const view = findById(state.views, op.view);
  if (!view) return noView(op.view);
  if (!findById(view.junctions ?? [], op.id)) return reject("missing_target", `${op.id} does not exist`);
  const attached = view.wires.filter((wire) => junctionEnds(wire).includes(op.id));
  const edit = cut(view, { junctions: new Set([op.id]), wires: new Set(attached.map((wire) => wire.id)) });
  return { state: replaceView(state, edit.view), inverse: edit.restore };
};

const labelSet: Handler<"label.set"> = (state, op) => {
  const view = findById(state.views, op.view);
  if (!view) return noView(op.view);
  const labels = view.labels ?? [];
  const previous = findById(labels, op.label.id);
  if (!previous) {
    if (labels.length >= LIMITS.labelsPerView) {
      return reject("quota", `a view holds at most ${LIMITS.labelsPerView} labels`);
    }
    if (allEntityIds(state).has(op.label.id)) return reject("duplicate_id", `${op.label.id} is already used`);
  }
  return {
    state: replaceView(state, withList(view, "labels", upsertById(labels, op.label))),
    inverse: [
      previous
        ? { k: "label.set", view: view.id, label: previous }
        : { k: "label.remove", view: view.id, id: op.label.id },
    ],
  };
};

const labelRemove: Handler<"label.remove"> = (state, op) => {
  const view = findById(state.views, op.view);
  if (!view) return noView(op.view);
  if (!findById(view.labels ?? [], op.id)) return reject("missing_target", `${op.id} does not exist`);
  const edit = cut(view, { labels: new Set([op.id]) });
  return { state: replaceView(state, edit.view), inverse: edit.restore };
};

export const WIRE_HANDLERS = {
  "wire.add": wireAdd,
  "wire.route": wireRoute,
  "wire.remove": wireRemove,
  "wire.set": wireSet,
  "junction.add": junctionAdd,
  "junction.remove": junctionRemove,
  "label.set": labelSet,
  "label.remove": labelRemove,
};
