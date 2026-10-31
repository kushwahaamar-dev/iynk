import { canonicalize } from "../../core/canonical.ts";
import type { Component, Op, PinRef, Project } from "../../project/generated/types.ts";
import { diffLines } from "../diff.ts";
import type { DiffSummary, PartLine } from "./types.ts";

const MAX_LABEL = 120;

export function emptyDiff(): DiffSummary {
  return {
    parts: { added: [], removed: [], changed: [] },
    nets: [],
    wires: { added: 0, removed: 0 },
    sources: [],
    tests: { added: [], removed: [], changed: [] },
    faults: { added: [], removed: [], changed: [] },
    params: [],
    cascade: { components: 0, wires: 0, pins: 0, sources: 0 },
  };
}

const same = (a: unknown, b: unknown): boolean => a === b || canonicalize(a) === canonicalize(b);

const cap = (text: string): string => (text.length > MAX_LABEL ? text.slice(0, MAX_LABEL - 1) + "…" : text);

interface Changes<T> {
  added: T[];
  removed: T[];
  changed: T[];
}

/** Entities that appear, vanish or differ between two lists. Untouched entities are shared, so `===` settles most. */
function compareById<T extends { id: string }>(before: readonly T[], after: readonly T[]): Changes<T> {
  const out: Changes<T> = { added: [], removed: [], changed: [] };
  if (before === after) return out;
  const old = new Map(before.map((item) => [item.id, item]));
  for (const item of after) {
    const prior = old.get(item.id);
    if (prior === undefined) out.added.push(item);
    else if (!same(prior, item)) out.changed.push(item);
    old.delete(item.id);
  }
  out.removed.push(...old.values());
  return out;
}

function partLine(component: Component): PartLine {
  return {
    id: component.id,
    refdes: component.refdes,
    label: cap(component.label ?? component.refdes),
    definition: component.definition.ref,
  };
}

const pinKey = (pin: PinRef): string => `${pin.c}.${pin.p}`;

function netChanges(before: Project, after: Project): DiffSummary["nets"] {
  const out: DiffSummary["nets"] = [];
  const compared = compareById(before.nets, after.nets);
  const prior = new Map(before.nets.map((net) => [net.id, net]));
  for (const net of [...compared.added, ...compared.changed]) {
    const was = new Set((prior.get(net.id)?.connections ?? []).map(pinKey));
    const now = new Set(net.connections.map(pinKey));
    const added = [...now].filter((key) => !was.has(key));
    const removed = [...was].filter((key) => !now.has(key));
    if (added.length > 0 || removed.length > 0 || prior.get(net.id)?.name !== net.name) {
      out.push({
        id: net.id,
        ...(net.name === undefined ? {} : { name: net.name }),
        added,
        removed,
      });
    }
  }
  for (const net of compared.removed) {
    out.push({
      id: net.id,
      ...(net.name === undefined ? {} : { name: net.name }),
      added: [],
      removed: net.connections.map(pinKey),
    });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function wireIds(state: Project): Set<string> {
  return new Set(state.views.flatMap((view) => (view.wires ?? []).map((wire) => wire.id)));
}

function wireChanges(before: Project, after: Project): DiffSummary["wires"] {
  if (before.views === after.views) return { added: 0, removed: 0 };
  const was = wireIds(before);
  const now = wireIds(after);
  return {
    added: [...now].filter((id) => !was.has(id)).length,
    removed: [...was].filter((id) => !now.has(id)).length,
  };
}

function sourceChanges(before: Project, after: Project): DiffSummary["sources"] {
  const compared = compareById(before.sources, after.sources);
  const prior = new Map(before.sources.map((source) => [source.id, source]));
  const out: DiffSummary["sources"] = [];
  const push = (id: string, path: string, from: string, to: string) => {
    const lines = diffLines(from, to);
    out.push({
      id,
      path,
      added: lines.filter((line) => line.op === "add").length,
      removed: lines.filter((line) => line.op === "del").length,
      lines,
    });
  };
  for (const source of compared.added) push(source.id, source.path, "", source.content);
  for (const source of compared.changed)
    push(source.id, source.path, prior.get(source.id)?.content ?? "", source.content);
  for (const source of compared.removed) push(source.id, source.path, source.content, "");
  return out;
}

function idLists<T extends { id: string }>(before: readonly T[], after: readonly T[]) {
  const { added, removed, changed } = compareById(before, after);
  const ids = (items: T[]) => items.map((item) => item.id);
  return { added: ids(added), removed: ids(removed), changed: ids(changed) };
}

function paramChanges(before: Project, after: Project): DiffSummary["params"] {
  const { added, removed, changed } = compareById(before.parameters, after.parameters);
  const prior = new Map(before.parameters.map((param) => [param.id, param]));
  return [
    ...added.map((param) => ({ id: param.id, to: param.value })),
    ...removed.map((param) => ({ id: param.id, from: param.value })),
    ...changed.map((param) => ({
      id: param.id,
      from: prior.get(param.id)?.value,
      to: param.value,
    })),
  ];
}

/** What undoing the batch would have to bring back, less what the proposal itself created. */
function cascadeOf(inverse: readonly Op[], created: ReadonlySet<string>): DiffSummary["cascade"] {
  const cascade = { components: 0, wires: 0, pins: 0, sources: 0 };
  for (const op of inverse) {
    if (op.k === "component.add" && !created.has(op.component.id)) cascade.components++;
    else if (op.k === "wire.add" && !created.has(op.wire.id)) cascade.wires++;
    else if (op.k === "net.connect" && !created.has(op.pin.c)) cascade.pins++;
    else if (op.k === "source.add" && !created.has(op.source.id)) cascade.sources++;
  }
  return cascade;
}

/** Undoing an add is a remove, so these are the ids the proposal itself brought in. */
function createdIn(inverse: readonly Op[]): Set<string> {
  const created = new Set<string>();
  for (const op of inverse) {
    if (op.k === "component.remove" || op.k === "wire.remove" || op.k === "source.remove") created.add(op.id);
  }
  return created;
}

export function summariseDiff(before: Project, after: Project, inverse: Op[]): DiffSummary {
  const parts = compareById(before.components, after.components);
  return {
    parts: {
      added: parts.added.map(partLine),
      removed: parts.removed.map(partLine),
      changed: parts.changed.map(partLine),
    },
    nets: netChanges(before, after),
    wires: wireChanges(before, after),
    sources: sourceChanges(before, after),
    tests: idLists(before.tests, after.tests),
    faults: idLists(before.simulation.faults, after.simulation.faults),
    params: paramChanges(before, after),
    cascade: cascadeOf(inverse, createdIn(inverse)),
  };
}

/** One line per pin that joined or left a net, for example `net_d12: + cmp_r1.P1`. */
export function netLines(d: DiffSummary): string[] {
  return d.nets.flatMap((net) => [
    ...net.added.map((pin) => `${net.id}: + ${pin}`),
    ...net.removed.map((pin) => `${net.id}: - ${pin}`),
  ]);
}

export function hashDiff(d: DiffSummary, sha256: (t: string) => string): string {
  return sha256(canonicalize({ diff: d, netLines: netLines(d) }));
}
