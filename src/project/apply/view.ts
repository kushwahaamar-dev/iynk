import { LIMITS } from "../../core/limits.ts";
import type { Group, Op, Project, View } from "../generated/types.ts";
import { dependencyOf } from "./component.ts";
import { allEntityIds, findById, pointer, reject, removeById, sortBy, upsertBy, upsertById } from "./types.ts";
import type { Handler, Reject } from "./types.ts";
import { cut, drawOps, noView, replaceView, withList } from "./wire.ts";

/** Schema ceiling for `views[].groups`. */
const MAX_GROUPS = 256;

/** A surface is a component whose pinned interface has the role `surface`. */
function surfaceProblem(state: Project, id: string): Reject | null {
  const component = findById(state.components, id);
  if (!component) return reject("missing_target", `${id} does not exist`);
  if (dependencyOf(state, component.definition)?.interface.role !== "surface") {
    return reject("unknown_definition", `${id} is not a breadboard surface`);
  }
  return null;
}

function surfaceRules(state: Project, view: Pick<View, "kind" | "surface">): Reject | null {
  if (view.surface === undefined) return null;
  if (view.kind !== "breadboard") return reject("invariant", "only a breadboard view has a surface");
  return surfaceProblem(state, view.surface);
}

const viewAdd: Handler<"view.add"> = (state, op) => {
  const { view } = op;
  if (state.views.length >= LIMITS.views) return reject("quota", `a project holds at most ${LIMITS.views} views`);
  if (allEntityIds(state).has(view.id)) return reject("duplicate_id", `${view.id} is already used`);
  const refused = surfaceRules(state, view);
  if (refused) return refused;
  return {
    state: { ...state, views: upsertById(state.views, view) },
    inverse: [{ k: "view.remove", id: view.id }],
  };
};

const viewRemove: Handler<"view.remove"> = (state, op) => {
  const view = findById(state.views, op.id);
  if (!view) return noView(op.id);
  const empty: View = { id: view.id, kind: view.kind, name: view.name, placements: [], wires: [] };
  if (view.surface !== undefined) empty.surface = view.surface;
  return {
    state: { ...state, views: removeById(state.views, op.id) },
    inverse: [
      { k: "view.add", view: empty },
      ...drawOps(view.id, {
        placements: view.placements,
        junctions: view.junctions,
        labels: view.labels,
        wires: view.wires,
        groups: view.groups,
      }),
    ],
  };
};

/** JSON Pointers to everything in the view that is tied to its current surface. */
function surfaceUsers(state: Project, view: View): string[] {
  const at = state.views.indexOf(view);
  const refs: string[] = [];
  view.placements.forEach((placement, i) => {
    if (placement.legs !== undefined && Object.keys(placement.legs).length > 0) {
      refs.push(pointer("views", at, "placements", i));
    }
  });
  view.wires.forEach((wire, i) => {
    if (wire.from.kind === "hole") refs.push(pointer("views", at, "wires", i, "from"));
    if (wire.to.kind === "hole") refs.push(pointer("views", at, "wires", i, "to"));
  });
  return refs;
}

const viewSet: Handler<"view.set"> = (state, op) => {
  const view = findById(state.views, op.id);
  if (!view) return noView(op.id);
  const next: View = { ...view };
  const inverse: Op = { k: "view.set", id: op.id };
  if (op.name !== undefined) {
    next.name = op.name;
    inverse.name = view.name;
  }
  if (op.surface !== undefined && op.surface !== view.surface) {
    const refused = surfaceRules(state, { kind: view.kind, surface: op.surface });
    if (refused) return refused;
    const users = surfaceUsers(state, view);
    if (users.length > 0) {
      return reject("referenced_by", `${op.id} still has legs or hole wire ends on its surface`, users);
    }
    next.surface = op.surface;
    if (view.surface !== undefined) inverse.surface = view.surface;
  }
  return { state: replaceView(state, next), inverse: [inverse] };
};

const viewPlace: Handler<"view.place"> = (state, op) => {
  const view = findById(state.views, op.view);
  if (!view) return noView(op.view);
  const { placement } = op;
  if (!findById(state.boards, placement.c) && !findById(state.components, placement.c)) {
    return reject("missing_target", `${placement.c} does not exist`);
  }
  const previous = view.placements.find((p) => p.c === placement.c);
  if (!previous && view.placements.length >= LIMITS.placementsPerView) {
    return reject("quota", `a view holds at most ${LIMITS.placementsPerView} placements`);
  }
  return {
    state: replaceView(state, { ...view, placements: upsertBy(view.placements, (p) => p.c, placement) }),
    inverse: [
      previous
        ? { k: "view.place", view: view.id, placement: previous }
        : { k: "view.unplace", view: view.id, c: placement.c },
    ],
  };
};

const viewUnplace: Handler<"view.unplace"> = (state, op) => {
  const view = findById(state.views, op.view);
  if (!view) return noView(op.view);
  if (!view.placements.some((p) => p.c === op.c)) return reject("missing_target", `${op.c} is not placed`);
  const edit = cut(view, { placements: new Set([op.c]) });
  return { state: replaceView(state, edit.view), inverse: edit.restore };
};

const groupSet: Handler<"group.set"> = (state, op) => {
  const view = findById(state.views, op.view);
  if (!view) return noView(op.view);
  const groups = view.groups ?? [];
  const previous = findById(groups, op.group.id);
  if (!previous) {
    if (groups.length >= MAX_GROUPS) return reject("quota", `a view holds at most ${MAX_GROUPS} groups`);
    if (allEntityIds(state).has(op.group.id)) return reject("duplicate_id", `${op.group.id} is already used`);
  }
  const group: Group = { ...op.group, members: sortBy(op.group.members, (m) => m) as Group["members"] };
  return {
    state: replaceView(state, withList(view, "groups", upsertById(groups, group))),
    inverse: [
      previous
        ? { k: "group.set", view: view.id, group: previous }
        : { k: "group.remove", view: view.id, id: op.group.id },
    ],
  };
};

const groupRemove: Handler<"group.remove"> = (state, op) => {
  const view = findById(state.views, op.view);
  if (!view) return noView(op.view);
  const previous = findById(view.groups ?? [], op.id);
  if (!previous) return reject("missing_target", `${op.id} does not exist`);
  return {
    state: replaceView(state, withList(view, "groups", removeById(view.groups ?? [], op.id))),
    inverse: [{ k: "group.set", view: view.id, group: previous }],
  };
};

export const VIEW_HANDLERS = {
  "view.add": viewAdd,
  "view.remove": viewRemove,
  "view.set": viewSet,
  "view.place": viewPlace,
  "view.unplace": viewUnplace,
  "group.set": groupSet,
  "group.remove": groupRemove,
};
