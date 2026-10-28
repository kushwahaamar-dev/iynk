import type { Diagnostic } from "../core/result.ts";
import type { Project } from "./generated/types.ts";
import { CROSS_RULES, historyRules } from "./semantic.cross.ts";
import { ENTITY_RULES, defKey, each, entityIndex, isRecord, makeCtx, tokenRules } from "./semantic.entity.ts";
import type { Changed } from "./semantic.entity.ts";

export interface RuleInfo {
  id: string;
  severity: "error" | "warning";
  /** The module that implements it. */
  file: "entity" | "cross" | "history";
  /** True when `checkBatch` runs it at the end of a batch. */
  batch: boolean;
  /** True when the prototype validator of PDM 9.2 already had it. */
  proto: boolean;
  text: string;
}

const rule = (
  id: string,
  severity: RuleInfo["severity"],
  file: RuleInfo["file"],
  batch: boolean,
  proto: boolean,
  text: string,
): RuleInfo => ({ id: `V3-${id}`, severity, file, batch, proto, text });

/**
 * The V3 rules of PDM 9.2, as data. A test holds this table and the code to each other: every rule here is raised by
 * a negative case, and nothing raises a code that is not here.
 */
export const RULES: readonly RuleInfo[] = [
  rule("ID-DUP", "error", "cross", true, true, "An id appears once across all entity kinds"),
  rule("ACTOR", "error", "cross", true, true, "Owners, grants, contributors, the creator and checkpoint authors name actors"),
  rule("DEF", "error", "entity", true, true, "Every board and component definition has a dependencies entry"),
  rule("DEP-DUP", "error", "cross", false, true, "One dependency entry per ref and version"),
  rule("DEP-UNUSED", "warning", "entity", false, true, "A dependency that nothing uses"),
  rule("REFDES", "error", "cross", true, true, "Refdes unique across boards and components"),
  rule("PARAM", "error", "entity", true, true, "A component sets only parameter keys its interface declares"),
  rule("PARAM-REF", "error", "entity", true, true, "A {param} binding names an existing parameter"),
  rule("PARAM-RANGE", "error", "entity", true, false, "A parameter value lies in its range and on its step"),
  rule("PIN", "error", "cross", true, true, "Every pin in a net exists on its instance's interface"),
  rule("PIN-TWICE", "error", "cross", true, true, "A pin is in at most one net"),
  rule("NET-NAME", "error", "cross", true, true, "Net names are unique"),
  rule("PLACE", "error", "entity", true, true, "Every placement names an existing instance"),
  rule("LEGS", "error", "entity", true, true, "Legs only in breadboard views"),
  rule("LEG", "error", "entity", true, true, "A leg names an existing pin"),
  rule("HOLE", "error", "entity", true, true, "A hole name is a pin id of the surface's interface"),
  rule("HOLE-TWICE", "error", "cross", true, true, "One leg per hole"),
  rule("GROUP", "error", "cross", true, false, "Group members exist in the same view, are in one group, and a group has two or more"),
  rule("VIEW-BOARD", "error", "cross", true, false, "A board view has one board placement and nothing else; only breadboard views have a surface"),
  rule("ROT", "warning", "entity", false, false, "Rotations are multiples of 90 degrees"),
  rule("FAULT-SHAPE", "error", "entity", true, false, "A fault's cause id has the pattern and its injectable component exists"),
  rule("WIRE-NET", "error", "cross", true, true, "A wire's net exists"),
  rule("WIRE-END", "error", "entity", true, true, "A pin end is a member of the wire's net"),
  rule("WIRE-JCT", "error", "cross", true, true, "A junction end exists in the view on the same net"),
  rule("WIRE-SURFACE", "error", "entity", true, true, "A hole end names the view's surface"),
  rule("WIRE-SELF", "error", "entity", true, false, "A wire does not join an end to itself"),
  rule("STRIP-SHORT", "error", "cross", true, true, "One strip, one net"),
  rule("STRIP-IMPLIED", "warning", "cross", false, true, "Two legs share a strip but no net joins them"),
  rule("PATH", "error", "entity", true, true, "Source and asset paths are valid and unique ignoring case"),
  rule("SRC-BOARD", "error", "entity", false, true, "A source's board exists"),
  rule("FW", "error", "entity", true, true, "A board's firmware entry and sources exist and the entry is in the list"),
  rule("RT", "error", "entity", true, true, "A runtime names an existing board"),
  rule("INPUT-DUP", "error", "entity", true, true, "World input ids are unique"),
  rule("INPUT", "error", "entity", true, true, "A world input is bound to an existing component"),
  rule("INPUT-PIN", "error", "entity", true, true, "A world input names existing pins"),
  rule("SCRIPT", "error", "entity", false, true, "Every script event names an input"),
  rule("FAULT", "error", "entity", true, true, "A fault target names existing components, pins or nets"),
  rule("CHECK-DUP", "error", "entity", true, true, "A check id is unique in its test"),
  rule("CHECK-PIN", "error", "entity", true, true, "A check's pin exists on the named or only board"),
  rule("CHECK-NET", "error", "entity", true, true, "A check's net exists"),
  rule("CHECK-SRC", "error", "entity", true, true, "A check's source exists"),
  rule("CHECK-INPUT", "error", "entity", true, true, "A responds check names a world input"),
  rule("GUIDE", "error", "entity", false, true, "guide.starter.source exists"),
  rule("TOKEN", "error", "entity", false, true, "No {{p: or {{t: token outside guide.starter"),
  rule("FRAME", "error", "entity", true, true, "A frame's parent is world or a frame"),
  rule("FRAME-CYCLE", "error", "entity", true, true, "Frames form a forest"),
  rule("BODY", "error", "entity", false, true, "Body, joint and drive references resolve"),
  rule("MOUNT", "error", "entity", false, true, "A mount's frame and component exist"),
  rule("LIMITS", "error", "entity", false, true, "A joint's limits do not carry both effort and effort_n"),
  rule("HIST-SEQ", "error", "history", false, true, "Retained ops are consecutive from baseRevision + 1"),
  rule("HIST-HEAD", "error", "history", false, true, "The last retained op equals the revision"),
  rule("HIST-CP", "error", "history", false, true, "No checkpoint is ahead of the revision"),
];

const BATCH_CODES: ReadonlySet<string> = new Set(RULES.filter((r) => r.batch).map((r) => r.id));

/**
 * The entities of `next` that differ from `prev`: new or replaced objects, which structural sharing makes the same
 * thing as changed. Entities that read what changed are added too: instances of a changed dependency, nets that
 * connect them, placements of them, wires of a changed net or junction, and every breadboard view when a net or its
 * surface changed (its strips depend on both). A deleted entity leaves nothing behind to check; `apply` refuses to
 * delete one that is still referenced.
 */
export function changedEntities(next: Project, prev: Project): Changed {
  const before = new Set(entityIndex(prev).keys());
  const changed = new Set<object>();
  for (const entity of entityIndex(next).keys()) if (!before.has(entity)) changed.add(entity);
  if (changed.size === 0) return changed;

  const depKeys = new Set<string>();
  each<{ ref: string; version: string }>(next.dependencies?.components, (dep) => {
    if (changed.has(dep)) depKeys.add(defKey(dep));
  });
  const instances = new Set<string>();
  for (const group of [next.boards, next.components]) {
    each<{ id: string; definition: { ref: string; version: string } }>(group, (entity) => {
      if (changed.has(entity) || (isRecord(entity.definition) && depKeys.has(defKey(entity.definition)))) {
        changed.add(entity);
        instances.add(entity.id);
      }
    });
  }
  let netChanged = false;
  const nets = new Set<string>();
  each<{ id: string; connections: unknown }>(next.nets, (net) => {
    const touches = changed.has(net) || (Array.isArray(net.connections) && net.connections.some((m) => instances.has(m?.c)));
    if (touches) {
      changed.add(net);
      nets.add(net.id);
      netChanged = true;
    }
  });
  const junctions = new Set<string>();
  each<{ placements: unknown; junctions: unknown; wires: unknown; surface?: string }>(next.views, (view) => {
    each<{ id: string }>(view.junctions, (j) => {
      if (changed.has(j)) junctions.add(j.id);
    });
    each<{ c: string }>(view.placements, (pl) => {
      if (instances.has(pl.c)) changed.add(pl);
    });
    each<{ net: string; from: { kind?: string; id?: string }; to: { kind?: string; id?: string } }>(view.wires, (wire) => {
      const ends = [wire.from, wire.to];
      if (nets.has(wire.net) || ends.some((e) => e?.kind === "junction" && junctions.has(e.id as string))) changed.add(wire);
    });
  });
  each<{ kind: string; surface?: string }>(next.views, (view) => {
    if (view.kind === "breadboard" && (netChanged || (view.surface !== undefined && instances.has(view.surface)))) changed.add(view);
  });
  return changed;
}

function run(doc: Project, changed?: Changed): Diagnostic[] {
  const ctx = makeCtx(doc, changed);
  return [...ENTITY_RULES, ...CROSS_RULES].flatMap((r) => r(ctx));
}

/** Every V3 rule on a whole document. A document that failed the schema is read as far as it goes. */
export function checkAll(doc: Project): Diagnostic[] {
  if (!isRecord(doc)) return [];
  const ctx = makeCtx(doc);
  return [...run(doc), ...tokenRules(ctx), ...historyRules(ctx)];
}

/**
 * The rules the apply hook runs at the end of a batch (PDM 9.2 marks which), on the entities that differ between
 * `prev` and `next`. Uniqueness rules read the whole document through indexes built once, and report only the
 * changed side.
 */
export function checkBatch(next: Project, prev: Project): Diagnostic[] {
  const changed = changedEntities(next, prev);
  return changed.size === 0 ? [] : run(next, changed).filter((d) => BATCH_CODES.has(d.code));
}
