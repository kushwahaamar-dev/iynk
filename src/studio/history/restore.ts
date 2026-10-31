import { canonicalize, utf8Length } from "../../core/canonical.ts";
import type { RandomSource } from "../../core/ids.ts";
import type { Board, Checkpoint, Component, Op, Project, Source, View } from "../../project/generated/types.ts";
import { stateHash } from "../../project/hash.ts";
import { createSession } from "../../project/session.ts";
import type { ProjectSession } from "../../project/session.ts";

/** The op envelope cap (PDM 7.5): a batch is cut so its JSON stays under it. */
const MAX_BATCH_BYTES = 65_536;
const MAX_BATCH_OPS = 480;
/** Largest slice of source text one edit carries, so an op stays under the envelope even when escaped. */
const EDIT_CHUNK = 8192;

type Bag = Record<string, unknown>;

export type RestoreErrorCode = "hash_mismatch" | "referenced_by" | "rejected";

/** Why a snapshot cannot be restored: the op the document refused, or the part of the document restore does not cover. */
export class RestoreError extends Error {
  readonly code: RestoreErrorCode;
  /** Position of the refused op in the flattened plan. */
  readonly index: number | undefined;
  constructor(code: RestoreErrorCode, message: string, index?: number) {
    super(message);
    this.name = "RestoreError";
    this.code = code;
    this.index = index;
  }
}

export interface RestoreOptions {
  maxBytes?: number;
}

/** True when the snapshot still hashes to what its checkpoint recorded. */
export function verifySnapshot(snap: Project, cp: Checkpoint): boolean {
  return stateHash(snap) === cp.stateHash;
}

const same = (a: unknown, b: unknown): boolean =>
  a === b || (a !== undefined && b !== undefined && canonicalize(a) === canonicalize(b));

const byId = <T extends { id: string }>(items: readonly T[] | undefined): Map<string, T> =>
  new Map((items ?? []).map((item) => [item.id, item]));

const counter = (): RandomSource => {
  let n = 0;
  return { bytes: (count) => Uint8Array.from({ length: count }, () => (n = (n * 31 + 7) % 251)) };
};

/** Merge patch that turns `from` into `to`, and the keys of `from` holding an object that must be cleared before it can be replaced. */
function patchOf(from: Bag | undefined, to: Bag | undefined, keys?: readonly string[]) {
  const patch: Bag = {};
  const clear: Bag = {};
  for (const key of keys ?? new Set([...Object.keys(from ?? {}), ...Object.keys(to ?? {})])) {
    const before = from?.[key];
    const after = to?.[key];
    if (same(before, after)) continue;
    patch[key] = after ?? null;
    if (typeof before === "object" && before !== null && after !== undefined) clear[key] = null;
  }
  return { patch, clear };
}

const hasKeys = (bag: Bag): boolean => Object.keys(bag).length > 0;

const SETTABLE: Record<"board" | "component", readonly string[]> = {
  board: ["label", "variant", "powerInput", "refdes"],
  component: ["label", "refdes", "locked"],
};

/** Everything an instance holds that `board.set` or `component.set` cannot change. */
const fixedPart = (instance: Board | Component, kind: "board" | "component"): Bag => {
  const rest: Bag = { ...instance };
  for (const key of [...SETTABLE[kind], "params", "firmware"]) delete rest[key];
  return rest;
};

const sourceShape = (source: Source): Bag => {
  const rest: Bag = { ...source };
  delete rest.content;
  return rest;
};

const viewShape = (view: View): Bag => {
  const shape: Bag = { id: view.id, kind: view.kind };
  if (view.surface !== undefined) shape.surface = view.surface;
  return shape;
};

/**
 * Splits the plan into batches under both caps. A text edit always opens a batch: the edits that undo it are based on
 * the revision before the batch, so one later in the batch would be shifted by itself.
 */
function batches(ops: readonly Op[], maxBytes: number): Op[][] {
  const out: Op[][] = [];
  let batch: Op[] = [];
  let bytes = 2;
  for (const op of ops) {
    const size = utf8Length(canonicalize(op)) + 1;
    if (batch.length > 0 && (op.k === "source.edit" || batch.length >= MAX_BATCH_OPS || bytes + size > maxBytes)) {
      out.push(batch);
      batch = [];
      bytes = 2;
    }
    batch.push(op);
    bytes += size;
  }
  if (batch.length > 0) out.push(batch);
  return out;
}

/** Edits that replace `from` with `to` in `id`, cut so none splits a surrogate pair. */
function textEdits(id: string, from: string, to: string, baseSeq: () => number): Op[] {
  const edits: Op[] = [];
  let at = 0;
  do {
    let end = Math.min(at + EDIT_CHUNK, to.length);
    const code = to.charCodeAt(end - 1);
    if (end < to.length && code >= 0xd800 && code <= 0xdbff) end -= 1;
    edits.push({ k: "source.edit", id, baseSeq: baseSeq() + edits.length, pos: at, del: at === 0 ? from.length : 0, ins: to.slice(at, end) });
    at = end;
  } while (at < to.length);
  return edits;
}

/**
 * Op batches that bring `current` to the content of `target`. The ops are ordinary edits, so the restore is one more
 * step in the history and undo reverses it. Each op is tried on a scratch copy of the document as it is planned, so a
 * removal that cascades is never followed by an op for something already gone.
 */
export function restoreOps(current: Project, target: Project, opts: RestoreOptions = {}): Op[][] {
  if (stateHash(current) === stateHash(target)) return [];

  const scratch: ProjectSession = createSession({ state: current, clock: () => 0, rnd: counter() });
  const author = { actor: current.access.owners[0], kind: "user" } as const;
  const plan: Op[] = [];

  const emit = (...ops: Op[]) => {
    for (const op of ops) {
      const result = scratch.apply(op, author);
      if (!result.ok) {
        const code = result.reject === "referenced_by" ? "referenced_by" : "rejected";
        throw new RestoreError(code, `${op.k}: ${result.message}`, plan.length);
      }
      plan.push(op);
    }
  };
  const now = (): Project => scratch.state;

  const targetViews = byId(target.views);
  const targetNets = byId(target.nets);
  const targetBoards = byId(target.boards);
  const targetComponents = byId(target.components);
  const targetSources = byId(target.sources);

  const differs = <T>(
    items: readonly T[] | undefined,
    other: readonly T[] | undefined,
    keyOf: (item: T) => string = (item) => (item as { id: string }).id,
  ): T[] => {
    const wanted = new Map((other ?? []).map((item) => [keyOf(item), item]));
    return (items ?? []).filter((item) => !same(item, wanted.get(keyOf(item))));
  };
  const missingFrom = <T extends { id: string }>(items: readonly T[] | undefined, other: readonly T[] | undefined): T[] => {
    const have = byId(items);
    return (other ?? []).filter((item) => !have.has(item.id));
  };

  // A net that loses its class cannot be edited into the target, so it is dissolved and drawn again.
  const rebuiltNets = new Set(
    current.nets.flatMap((net) => {
      const wanted = targetNets.get(net.id);
      return wanted && net.class !== undefined && wanted.class === undefined ? [net.id] : [];
    }),
  );
  const rebuiltViews = new Set(
    current.views.flatMap((view) => {
      const wanted = targetViews.get(view.id);
      return !wanted || !same(viewShape(view), viewShape(wanted)) ? [view.id] : [];
    }),
  );

  // 1. Checks, faults and instruments that differ go first, so nothing they name can block a removal.
  for (const test of differs(now().tests, target.tests)) emit({ k: "test.remove", id: test.id });
  for (const fault of differs(now().simulation.faults, target.simulation.faults)) emit({ k: "fault.remove", id: fault.id });
  for (const ins of differs(now().simulation.instruments, target.simulation.instruments)) {
    emit({ k: "instrument.remove", id: ins.id });
  }

  // 2. Board firmware that differs is cleared before the sources it names can be removed.
  for (const board of now().boards) {
    const wanted = targetBoards.get(board.id);
    if (board.firmware && wanted && !same(board.firmware, wanted.firmware)) {
      emit({ k: "board.set", id: board.id, set: { firmware: null } });
    }
  }

  // 3. Drawn things go: whole views first, then wires, junctions, labels and placements, then pins and instances.
  for (const id of rebuiltViews) emit({ k: "view.remove", id });
  const kept = (view: View) => !rebuiltViews.has(view.id);
  const wantedIn = (view: View) => targetViews.get(view.id)!;
  const stale = <T extends { id: string; net?: string }>(items: readonly T[] | undefined, wanted: readonly T[] | undefined) =>
    differs(items, wanted).concat((items ?? []).filter((item) => item.net !== undefined && rebuiltNets.has(item.net)));
  const viewNow = (id: string): View => now().views.find((v) => v.id === id)!;

  for (const view of now().views.filter(kept)) {
    for (const wire of stale(view.wires, wantedIn(view).wires)) {
      if (viewNow(view.id).wires.some((w) => w.id === wire.id)) emit({ k: "wire.remove", view: view.id, id: wire.id });
    }
  }
  for (const view of now().views.filter(kept)) {
    for (const j of stale(viewNow(view.id).junctions, wantedIn(view).junctions)) {
      if (viewNow(view.id).junctions?.some((x) => x.id === j.id)) emit({ k: "junction.remove", view: view.id, id: j.id });
    }
  }
  for (const view of now().views.filter(kept)) {
    for (const label of stale(viewNow(view.id).labels, wantedIn(view).labels)) {
      emit({ k: "label.remove", view: view.id, id: label.id });
    }
  }
  for (const view of now().views.filter(kept)) {
    const wanted = new Set(wantedIn(view).placements.map((p) => p.c));
    for (const placement of viewNow(view.id).placements) {
      if (!wanted.has(placement.c)) emit({ k: "view.unplace", view: view.id, c: placement.c });
    }
  }

  for (const net of now().nets) {
    const wanted = rebuiltNets.has(net.id) ? undefined : targetNets.get(net.id);
    const keep = new Set(wanted?.connections.map((c) => c.c + "/" + c.p));
    for (const ref of net.connections) {
      if (keep.has(ref.c + "/" + ref.p)) continue;
      if (now().nets.some((n) => n.connections.some((c) => c.c === ref.c && c.p === ref.p))) {
        emit({ k: "net.disconnect", pin: ref });
      }
    }
  }

  const rebuilt = <T extends Board | Component>(item: T, wanted: T | undefined, kind: "board" | "component") =>
    !wanted || !same(fixedPart(item, kind), fixedPart(wanted, kind));
  for (const part of now().components) {
    if (rebuilt(part, targetComponents.get(part.id), "component")) emit({ k: "component.remove", id: part.id });
  }
  for (const part of now().boards) {
    if (rebuilt(part, targetBoards.get(part.id), "board")) emit({ k: "board.remove", id: part.id });
  }

  for (const input of differs(now().simulation.world.inputs, target.simulation.world.inputs)) {
    emit({ k: "input.remove", id: input.id });
  }
  for (const runtime of differs(now().simulation.runtimes, target.simulation.runtimes)) {
    emit({ k: "runtime.remove", id: runtime.id });
  }
  for (const source of now().sources) {
    const wanted = targetSources.get(source.id);
    if (!wanted || !same(sourceShape(source), sourceShape(wanted))) emit({ k: "source.remove", id: source.id });
  }
  for (const asset of differs(now().assets, target.assets)) emit({ k: "asset.remove", id: asset.id });

  // 4. Adds, in dependency order.
  for (const dep of target.dependencies.components) {
    const have = now().dependencies.components.find((d) => d.ref === dep.ref && d.version === dep.version);
    if (!same(have, dep)) emit({ k: "dep.set", dependency: dep });
  }
  for (const parameter of differs(target.parameters, now().parameters)) emit({ k: "param.set", parameter });
  for (const board of missingFrom(now().boards, target.boards)) {
    const bare: Board = { ...board };
    delete bare.firmware;
    emit({ k: "board.add", board: bare });
  }
  for (const component of missingFrom(now().components, target.components)) emit({ k: "component.add", component });
  for (const view of target.views) {
    if (!now().views.some((v) => v.id === view.id)) {
      const empty: View = { id: view.id, kind: view.kind, name: view.name, placements: [], wires: [] };
      if (view.surface !== undefined) empty.surface = view.surface;
      emit({ k: "view.add", view: empty });
    }
  }
  for (const source of target.sources) {
    const have = byId(now().sources).get(source.id);
    if (!have) emit({ k: "source.add", source: { ...source, content: "" } });
    if ((have?.content ?? "") !== source.content) {
      emit(...textEdits(source.id, have?.content ?? "", source.content, () => scratch.revision));
    }
  }
  for (const asset of missingFrom(now().assets, target.assets)) emit({ k: "asset.add", asset });

  // 5. Settings of the instances that stay.
  const patchInstance = (kind: "board" | "component", list: readonly (Board | Component)[], wanted: Map<string, Board | Component>) => {
    for (const item of list) {
      const goal = wanted.get(item.id);
      if (!goal) continue;
      const fields = patchOf(item as unknown as Bag, goal as unknown as Bag, SETTABLE[kind]);
      const params = patchOf(item.params, goal.params);
      const ops = (set: Bag, ps: Bag): Op[] =>
        hasKeys(set) || hasKeys(ps)
          ? [{ k: kind === "board" ? "board.set" : "component.set", id: item.id, ...(hasKeys(set) ? { set } : {}), ...(hasKeys(ps) ? { params: ps } : {}) } as Op]
          : [];
      emit(...ops({}, params.clear), ...ops(fields.patch, params.patch));
    }
  };
  patchInstance("component", now().components, targetComponents);
  patchInstance("board", now().boards, targetBoards);

  // 6. Nets: free the names that change hands, then create, connect and name.
  for (const net of target.nets) {
    const have = byId(now().nets).get(net.id);
    if (have?.name !== undefined && have.name !== net.name) emit({ k: "net.rename", id: net.id, name: "" });
  }
  for (const net of target.nets) {
    const have = byId(now().nets).get(net.id);
    if (!have) {
      emit({ k: "net.create", net });
      continue;
    }
    const held = new Set(have.connections.map((c) => c.c + "/" + c.p));
    for (const ref of net.connections) if (!held.has(ref.c + "/" + ref.p)) emit({ k: "net.connect", net: net.id, pin: ref });
    if (net.name !== undefined || net.class !== undefined) {
      if (have.name !== net.name || have.class !== net.class) {
        emit({ k: "net.rename", id: net.id, ...(net.name === undefined ? {} : { name: net.name }), ...(net.class === undefined ? {} : { class: net.class }) });
      }
    }
  }

  // 7. Drawn content of every view.
  for (const view of target.views) {
    const have = now().views.find((v) => v.id === view.id)!;
    if (have.name !== view.name) emit({ k: "view.set", id: view.id, name: view.name });
    for (const placement of differs(view.placements, have.placements, (p) => p.c)) emit({ k: "view.place", view: view.id, placement });
    for (const junction of differs(view.junctions, have.junctions)) emit({ k: "junction.add", view: view.id, junction });
    for (const label of differs(view.labels, have.labels)) emit({ k: "label.set", view: view.id, label });
    for (const wire of differs(view.wires, have.wires)) emit({ k: "wire.add", view: view.id, wire });
  }
  for (const view of target.views) {
    const goal = byId(view.groups);
    for (const group of now().views.find((v) => v.id === view.id)?.groups ?? []) {
      if (!goal.has(group.id)) emit({ k: "group.remove", view: view.id, id: group.id });
    }
  }
  for (const view of target.views) {
    const have = now().views.find((v) => v.id === view.id)!;
    for (const group of differs(view.groups, have.groups)) emit({ k: "group.set", view: view.id, group });
  }

  // 8. Firmware, then the simulation, checks and the rest of the header.
  for (const board of target.boards) {
    const have = byId(now().boards).get(board.id);
    if (board.firmware && !same(have?.firmware, board.firmware)) emit({ k: "board.set", id: board.id, firmware: board.firmware });
  }
  for (const key of ["seed", "duration_ms", "solver", "physics", "environment"] as const) {
    const wanted = target.simulation[key];
    if (!same(now().simulation[key], wanted)) emit({ k: "sim.set", key, value: wanted ?? null });
  }
  for (const runtime of differs(target.simulation.runtimes, now().simulation.runtimes)) emit({ k: "runtime.set", runtime });
  for (const input of differs(target.simulation.world.inputs, now().simulation.world.inputs)) emit({ k: "input.set", input });
  if (!same(target.simulation.world.script, now().simulation.world.script)) {
    emit({ k: "script.set", script: target.simulation.world.script });
  }
  for (const fault of differs(target.simulation.faults, now().simulation.faults)) emit({ k: "fault.set", fault });
  for (const instrument of differs(target.simulation.instruments, now().simulation.instruments)) {
    emit({ k: "instrument.set", instrument });
  }
  for (const test of differs(target.tests, now().tests)) emit({ k: "test.set", test });

  const meta: Bag = {};
  for (const key of ["title", "description", "kind", "tags"] as const) {
    if (!same(now().meta[key], target.meta[key])) meta[key] = target.meta[key] ?? (key === "tags" ? [] : "");
  }
  if (hasKeys(meta)) emit({ k: "meta.set", set: meta });

  // 9. What the target no longer holds.
  for (const parameter of missingFrom(target.parameters, now().parameters)) emit({ k: "param.remove", id: parameter.id });
  for (const dep of now().dependencies.components) {
    if (!target.dependencies.components.some((d) => d.ref === dep.ref && d.version === dep.version)) {
      emit({ k: "dep.remove", ref: dep.ref, version: dep.version });
    }
  }

  if (stateHash(now()) !== stateHash(target)) {
    throw new RestoreError("hash_mismatch", "the snapshot differs in a part of the document restore does not cover");
  }
  return batches(plan, opts.maxBytes ?? MAX_BATCH_BYTES);
}
