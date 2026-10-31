import type { Op } from "./generated/types.ts";

export type OpImpact = "none" | "param" | "source" | "structural";

const ORDER: readonly OpImpact[] = ["none", "param", "source", "structural"];

const DISPLAY_FIELDS = new Set(["label", "locked"]);
const COMPONENT_DISPLAY_FIELDS = new Set([...DISPLAY_FIELDS, "refdes"]);

const hasKeys = (patch: object | undefined) =>
  patch !== undefined && Object.keys(patch).length > 0;

function patchImpact(
  op: { set?: object; params?: object },
  display: ReadonlySet<string>,
): OpImpact {
  if (Object.keys(op.set ?? {}).some((key) => !display.has(key)))
    return "structural";
  return hasKeys(op.params) ? "param" : "none";
}

const IMPACT: Record<Op["k"], OpImpact | ((op: Op) => OpImpact)> = {
  "meta.set": "none",
  "access.grant": "none",
  "access.revoke": "none",
  "access.set": "none",
  "actor.set": "none",
  "actor.remove": "none",
  "view.add": "none",
  "view.remove": "none",
  "view.set": "none",
  "view.place": "none",
  "view.unplace": "none",
  "wire.add": "none",
  "wire.route": "none",
  "wire.remove": "none",
  "wire.set": "none",
  "group.set": "none",
  "group.remove": "none",
  "junction.add": "none",
  "junction.remove": "none",
  "label.set": "none",
  "label.remove": "none",
  "test.set": "none",
  "test.remove": "none",
  "asset.add": "none",
  "asset.remove": "none",
  "guide.set": "none",
  "provenance.set": "none",
  "license.set": "none",
  "input.set": "param",
  "input.remove": "param",
  "fault.set": "param",
  "fault.remove": "param",
  "param.set": "param",
  "param.remove": "param",
  "source.add": "source",
  "source.remove": "source",
  "source.rename": "source",
  "source.edit": "source",
  "board.add": "structural",
  "board.remove": "structural",
  "component.add": "structural",
  "component.remove": "structural",
  "component.swap": "structural",
  "net.create": "structural",
  "net.connect": "structural",
  "net.disconnect": "structural",
  "net.merge": "structural",
  "net.split": "structural",
  "net.rename": "structural",
  "net.delete": "structural",
  "mech.set": "structural",
  "mech.remove": "structural",
  "sim.set": "structural",
  "runtime.set": "structural",
  "runtime.remove": "structural",
  "script.set": "structural",
  "instrument.set": "structural",
  "instrument.remove": "structural",
  "dep.set": "structural",
  "dep.remove": "structural",
  "domain.set": "structural",
  "domain.patch": "structural",
  "board.set": (op) => {
    if (op.k !== "board.set") return "structural";
    if (op.firmware !== undefined) return "source";
    return patchImpact(op, DISPLAY_FIELDS);
  },
  "component.set": (op) =>
    op.k === "component.set"
      ? patchImpact(op, COMPONENT_DISPLAY_FIELDS)
      : "structural",
};

export function classifyOp(op: Op): OpImpact {
  const rule = (
    IMPACT as Partial<Record<string, OpImpact | ((op: Op) => OpImpact)>>
  )[op.k];
  if (rule === undefined) return "structural";
  return typeof rule === "function" ? rule(op) : rule;
}

export function classifyImpact(ops: readonly Op[]): OpImpact {
  let worst = 0;
  for (const op of ops) worst = Math.max(worst, ORDER.indexOf(classifyOp(op)));
  return ORDER[worst];
}
