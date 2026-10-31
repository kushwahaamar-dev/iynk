import { canonicalize } from "../../core/canonical.ts";
import type { Board, Component, Net, Project, Source, TestCase } from "../../project/generated/types.ts";

/** A pin as `component/pin`, the form `net.connections` is compared in. */
export type PinRefString = string;

export interface DiffItem {
  id: string;
  refdes?: string;
  label: string;
}

export interface NetDiff {
  netId: string;
  name?: string;
  added: PinRefString[];
  removed: PinRefString[];
}

export interface Hunk {
  /** 1-based first line in the old text. With no old lines it is the line the new ones go after, plus one. */
  oldStart: number;
  newStart: number;
  removed: string[];
  added: string[];
}

export interface FileDiff {
  path: string;
  added: number;
  removed: number;
  hunks: Hunk[];
}

export interface ParamDiff {
  id: string;
  change: "added" | "removed" | "changed";
}

interface Changes {
  added: DiffItem[];
  removed: DiffItem[];
  changed: DiffItem[];
}

export interface RevisionDiff {
  parts: Changes;
  nets: { differing: NetDiff[] };
  wires: { added: number; removed: number };
  /** Placements present in both whose position, rotation or legs differ. */
  moved: number;
  files: FileDiff[];
  params: ParamDiff[];
  tests: Changes;
}

const same = (a: unknown, b: unknown): boolean => a === b || canonicalize(a) === canonicalize(b);

const byId = <T extends { id: string }>(items: readonly T[] | undefined): Map<string, T> =>
  new Map((items ?? []).map((item) => [item.id, item]));

function changes<T extends { id: string }>(a: readonly T[], b: readonly T[], describe: (item: T) => DiffItem): Changes {
  const before = byId(a);
  const after = byId(b);
  const result: Changes = { added: [], removed: [], changed: [] };
  for (const [id, item] of before) {
    const next = after.get(id);
    if (!next) result.removed.push(describe(item));
    else if (!same(item, next)) result.changed.push(describe(next));
  }
  for (const [id, item] of after) if (!before.has(id)) result.added.push(describe(item));
  return result;
}

const describePart = (part: Board | Component): DiffItem => ({
  id: part.id,
  refdes: part.refdes,
  label: part.label ?? part.definition.ref,
});

const pinKey = (ref: { c: string; p: string }): PinRefString => ref.c + "/" + ref.p;

function diffNets(a: readonly Net[], b: readonly Net[]): NetDiff[] {
  const before = byId(a);
  const after = byId(b);
  const out: NetDiff[] = [];
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const old = before.get(id);
    const next = after.get(id);
    const oldPins = new Set(old?.connections.map(pinKey));
    const newPins = new Set(next?.connections.map(pinKey));
    const added = [...newPins].filter((p) => !oldPins.has(p)).sort();
    const removed = [...oldPins].filter((p) => !newPins.has(p)).sort();
    const renamed = old !== undefined && next !== undefined && (old.name !== next.name || old.class !== next.class);
    if (added.length === 0 && removed.length === 0 && !renamed) continue;
    const name = next?.name ?? old?.name;
    out.push(name === undefined ? { netId: id, added, removed } : { netId: id, name, added, removed });
  }
  return out;
}

const linesOf = (text: string): string[] => (text === "" ? [] : text.split("\n"));

/**
 * Line diff by Myers' O(ND) algorithm. The common head and tail are cut first, so a small edit in a large file stays
 * cheap. Hunks carry no context lines.
 */
export function diffLines(oldText: string, newText: string): Hunk[] {
  const a = linesOf(oldText);
  const b = linesOf(newText);
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  const x = a.slice(head, a.length - tail);
  const y = b.slice(head, b.length - tail);

  const { gone, fresh } = shortestEdit(x, y);
  const hunks: Hunk[] = [];
  let i = 0;
  let j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && !gone[i] && !fresh[j]) {
      i++;
      j++;
      continue;
    }
    const hunk: Hunk = { oldStart: head + i + 1, newStart: head + j + 1, removed: [], added: [] };
    while ((i < x.length && gone[i]) || (j < y.length && fresh[j])) {
      if (i < x.length && gone[i]) hunk.removed.push(x[i++]!);
      if (j < y.length && fresh[j]) hunk.added.push(y[j++]!);
    }
    hunks.push(hunk);
  }
  return hunks;
}

/** Which lines of `x` are deleted and which lines of `y` are inserted by a shortest edit script. */
function shortestEdit(x: readonly string[], y: readonly string[]): { gone: boolean[]; fresh: boolean[] } {
  const n = x.length;
  const m = y.length;
  const gone = new Array<boolean>(n).fill(false);
  const fresh = new Array<boolean>(m).fill(false);
  if (n === 0 || m === 0) return { gone: gone.fill(true), fresh: fresh.fill(true) };

  const max = n + m;
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  let steps = 0;
  search: for (let d = 0; d <= max; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let px = k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!) ? v[offset + k + 1]! : v[offset + k - 1]! + 1;
      let py = px - k;
      while (px < n && py < m && x[px] === y[py]) {
        px++;
        py++;
      }
      v[offset + k] = px;
      if (px >= n && py >= m) {
        steps = d;
        break search;
      }
    }
  }

  let px = n;
  let py = m;
  for (let d = steps; d > 0; d--) {
    const before = trace[d]!;
    const k = px - py;
    const down = k === -d || (k !== d && before[offset + k - 1]! < before[offset + k + 1]!);
    const prevK = down ? k + 1 : k - 1;
    const prevX = before[offset + prevK]!;
    const prevY = prevX - prevK;
    if (down) fresh[prevY] = true;
    else gone[prevX] = true;
    px = prevX;
    py = prevY;
  }
  return { gone, fresh };
}

function diffFiles(a: readonly Source[], b: readonly Source[]): FileDiff[] {
  const before = new Map(a.map((s) => [s.path, s]));
  const after = new Map(b.map((s) => [s.path, s]));
  const out: FileDiff[] = [];
  for (const path of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const old = before.get(path)?.content ?? "";
    const next = after.get(path)?.content ?? "";
    if (old === next && before.has(path) && after.has(path)) continue;
    const hunks = diffLines(old, next);
    out.push({
      path,
      added: hunks.reduce((sum, h) => sum + h.added.length, 0),
      removed: hunks.reduce((sum, h) => sum + h.removed.length, 0),
      hunks,
    });
  }
  return out;
}

function diffParams(a: Project["parameters"], b: Project["parameters"]): ParamDiff[] {
  const before = byId(a);
  const after = byId(b);
  const out: ParamDiff[] = [];
  for (const [id, param] of before) {
    const next = after.get(id);
    if (!next) out.push({ id, change: "removed" });
    else if (!same(param, next)) out.push({ id, change: "changed" });
  }
  for (const id of after.keys()) if (!before.has(id)) out.push({ id, change: "added" });
  return out;
}

function wireIds(state: Project): Set<string> {
  return new Set(state.views.flatMap((view) => view.wires.map((w) => w.id)));
}

function movedCount(a: Project, b: Project): number {
  const old = byId(a.views);
  let moved = 0;
  for (const view of b.views) {
    const before = new Map(old.get(view.id)?.placements.map((p) => [p.c, p]));
    for (const placement of view.placements) {
      const prev = before.get(placement.c);
      if (prev && !same(prev, placement)) moved++;
    }
  }
  return moved;
}

const describeTest = (test: TestCase): DiffItem => ({ id: test.id, label: typeof test.name === "string" ? test.name : test.name.en });

/** What changed from `a` to `b`, keyed by id. Both sides are plain data; nothing is read from a clock or a store. */
export function compareStates(a: Project, b: Project): RevisionDiff {
  const oldWires = wireIds(a);
  const newWires = wireIds(b);
  return {
    parts: changes([...a.boards, ...a.components], [...b.boards, ...b.components], describePart),
    nets: { differing: diffNets(a.nets, b.nets) },
    wires: {
      added: [...newWires].filter((id) => !oldWires.has(id)).length,
      removed: [...oldWires].filter((id) => !newWires.has(id)).length,
    },
    moved: movedCount(a, b),
    files: diffFiles(a.sources, b.sources),
    params: diffParams(a.parameters, b.parameters),
    tests: changes(a.tests, b.tests, describeTest),
  };
}
