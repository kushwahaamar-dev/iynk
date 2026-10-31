import type { Op } from "../../project/generated/types.ts";
import type { OpGroup, RiskClass } from "./types.ts";

export interface RiskCtx {
  knownDef(ref: string): boolean;
  sourceText(id: string): string | undefined;
  testExists(id: string): boolean;
  /** Ids created by earlier ops of the same proposal. */
  addedInProposal: ReadonlySet<string>;
}

type OpOf<K extends Op["k"]> = Extract<Op, { k: K }>;
type Rule<K extends Op["k"]> = RiskClass | ((op: OpOf<K>, ctx: RiskCtx) => RiskClass);
type Table = { [K in Op["k"]]: { group: OpGroup | null; risk: Rule<K> } };

const MAX_REMOVED_LINES = 40;

const added = (id: string, ctx: RiskCtx) => ctx.addedInProposal.has(id);

function sourceEditRisk(op: OpOf<"source.edit">, ctx: RiskCtx): RiskClass {
  const text = ctx.sourceText(op.id);
  if (text === undefined) return added(op.id, ctx) ? 1 : 2;
  const removed = text.slice(op.pos, op.pos + op.del);
  const lines = removed === "" ? 0 : removed.split("\n").length;
  return lines <= MAX_REMOVED_LINES && removed.length * 2 < text.length ? 1 : 2;
}

function metaSetRisk(op: OpOf<"meta.set">): RiskClass {
  const keys = Object.keys(op.set);
  if (keys.includes("kind")) return 3;
  return keys.every((key) => key === "tags" || key === "description") ? 0 : 1;
}

const SIM_KEYS_OPEN: readonly string[] = ["seed", "duration_ms", "environment"];

const TABLE: Table = {
  "meta.set": { group: "core", risk: metaSetRisk },
  "access.grant": { group: null, risk: 3 },
  "access.revoke": { group: null, risk: 3 },
  "access.set": { group: null, risk: 3 },
  "actor.set": { group: null, risk: 3 },
  "actor.remove": { group: null, risk: 3 },
  "board.add": { group: "board", risk: (op, ctx) => (ctx.knownDef(op.board.definition.ref) ? 1 : 2) },
  "board.remove": { group: "board", risk: 2 },
  "board.set": { group: "board", risk: 1 },
  "component.add": { group: "core", risk: 1 },
  "component.remove": { group: "core", risk: 2 },
  "component.set": { group: "core", risk: 1 },
  "component.swap": { group: "board", risk: 2 },
  "net.create": { group: "core", risk: 1 },
  "net.connect": { group: "core", risk: (op) => (op.move === true ? 2 : 1) },
  "net.disconnect": { group: "core", risk: 2 },
  "net.merge": { group: "core", risk: 2 },
  "net.split": { group: "core", risk: 2 },
  "net.rename": { group: "core", risk: 1 },
  "net.delete": { group: "core", risk: 2 },
  "view.add": { group: "core", risk: 1 },
  "view.remove": { group: "core", risk: 2 },
  "view.set": { group: "core", risk: 0 },
  "view.place": { group: "core", risk: 0 },
  "view.unplace": { group: "core", risk: 2 },
  "wire.add": { group: "core", risk: 1 },
  "wire.route": { group: "core", risk: 0 },
  "wire.remove": { group: "core", risk: 2 },
  "wire.set": { group: "core", risk: 1 },
  "group.set": { group: "core", risk: 1 },
  "group.remove": { group: "core", risk: 2 },
  "junction.add": { group: "core", risk: 0 },
  "junction.remove": { group: "core", risk: 0 },
  "label.set": { group: "core", risk: 0 },
  "label.remove": { group: "core", risk: 0 },
  "mech.set": { group: "mech", risk: 1 },
  "mech.remove": { group: "mech", risk: 2 },
  "source.add": { group: "core", risk: 1 },
  "source.remove": { group: "core", risk: 2 },
  "source.rename": { group: "core", risk: 1 },
  "source.edit": { group: "core", risk: sourceEditRisk },
  "sim.set": { group: "sim", risk: (op) => (SIM_KEYS_OPEN.includes(op.key) ? 1 : 3) },
  "runtime.set": { group: "board", risk: 2 },
  "runtime.remove": { group: "board", risk: 2 },
  "input.set": { group: "sim", risk: 1 },
  "input.remove": { group: "sim", risk: 2 },
  "script.set": { group: "sim", risk: 2 },
  "fault.set": { group: "sim", risk: 1 },
  "fault.remove": { group: "sim", risk: 2 },
  "instrument.set": { group: "sim", risk: 1 },
  "instrument.remove": { group: "sim", risk: 2 },
  "param.set": { group: "core", risk: 1 },
  "param.remove": { group: "core", risk: 2 },
  "test.set": { group: "core", risk: (op, ctx) => (ctx.testExists(op.test.id) && !added(op.test.id, ctx) ? 2 : 1) },
  "test.remove": { group: "core", risk: 2 },
  "asset.add": { group: null, risk: 3 },
  "asset.remove": { group: "meta", risk: 2 },
  "dep.set": { group: "board", risk: (op, ctx) => (ctx.knownDef(op.dependency.ref) ? 1 : 3) },
  "dep.remove": { group: "board", risk: 2 },
  "guide.set": { group: "meta", risk: 2 },
  "provenance.set": { group: null, risk: 3 },
  "license.set": { group: null, risk: 3 },
  "domain.set": { group: null, risk: 3 },
  "domain.patch": { group: null, risk: 3 },
};

export const OP_KINDS = Object.keys(TABLE) as Op["k"][];

export const OP_GROUPS: Record<OpGroup, readonly Op["k"][]> = {
  core: [],
  board: [],
  mech: [],
  sim: [],
  meta: [],
};
for (const kind of OP_KINDS) {
  const group = TABLE[kind].group;
  if (group) (OP_GROUPS[group] as Op["k"][]).push(kind);
}

export function groupOf(kind: Op["k"]): OpGroup | null {
  return TABLE[kind].group;
}

export function classifyOp(op: Op, ctx: RiskCtx): RiskClass {
  const rule = TABLE[op.k].risk as Rule<Op["k"]>;
  return typeof rule === "number" ? rule : rule(op, ctx);
}

/** The ids an op brings into the proposal, so a later op on the same id is not judged as touching existing work. */
export function createdIds(op: Op): string[] {
  switch (op.k) {
    case "test.set":
      return [op.test.id];
    case "source.add":
      return [op.source.id];
    default:
      return [];
  }
}

export function classifyStep(ops: readonly Op[], ctx: RiskCtx): RiskClass {
  const seen = new Set(ctx.addedInProposal);
  let worst: RiskClass = 0;
  for (const op of ops) {
    worst = Math.max(worst, classifyOp(op, { ...ctx, addedInProposal: seen })) as RiskClass;
    for (const id of createdIds(op)) seen.add(id);
  }
  return worst;
}
