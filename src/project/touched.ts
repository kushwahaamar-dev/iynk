import type { Op, Project } from "./generated/types.ts";

/** The ids of the entities a change added, removed or altered. Boards count as components. */
export interface Touched {
  components: Set<string>;
  nets: Set<string>;
  wires: Set<string>;
  views: Set<string>;
  sources: Set<string>;
}

export interface DocChange {
  from: number;
  to: number;
  ops: Op[];
  touched: Touched;
  origin: "local" | "remote" | "undo" | "redo" | "load" | "ai";
}

type Entity = { id: string };

function indexById<T extends Entity>(...lists: readonly (readonly T[])[]): Map<string, T> {
  const index = new Map<string, T>();
  for (const list of lists) for (const entity of list) index.set(entity.id, entity);
  return index;
}

/** Ids present on one side only, or present on both with a different object. Relies on `apply` sharing what it did not change. */
function differing<T extends Entity>(before: Map<string, T>, after: Map<string, T>): Set<string> {
  const ids = new Set<string>();
  for (const [id, entity] of before) if (after.get(id) !== entity) ids.add(id);
  for (const id of after.keys()) if (!before.has(id)) ids.add(id);
  return ids;
}

const components = (p: Project) => indexById(p.boards, p.components);
const wires = (p: Project) => indexById(...p.views.map((view) => view.wires));

export function computeTouched(before: Project, after: Project): Touched {
  return {
    components: differing(components(before), components(after)),
    nets: differing(indexById(before.nets), indexById(after.nets)),
    wires: differing(wires(before), wires(after)),
    views: differing(indexById(before.views), indexById(after.views)),
    sources: differing(indexById(before.sources), indexById(after.sources)),
  };
}
