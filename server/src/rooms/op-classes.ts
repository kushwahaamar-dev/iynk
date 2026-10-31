export type OpKind = string;
export type OpClass = "graph" | "sim" | "source" | "owner";

const KINDS_BY_CLASS: Record<OpClass, readonly OpKind[]> = {
  graph: [
    "meta.set",
    "board.add", "board.remove", "board.set",
    "component.add", "component.remove", "component.set", "component.swap",
    "net.create", "net.connect", "net.disconnect", "net.merge", "net.split", "net.rename", "net.delete",
    "view.add", "view.remove", "view.set", "view.place", "view.unplace",
    "wire.add", "wire.route", "wire.remove", "wire.set",
    "group.set", "group.remove",
    "junction.add", "junction.remove",
    "label.set", "label.remove",
    "mech.set", "mech.remove",
    "param.set", "param.remove",
    "test.set", "test.remove",
    "asset.add", "asset.remove",
    "dep.set", "dep.remove",
    "guide.set",
    "domain.set", "domain.patch",
  ],
  sim: [
    "sim.set",
    "runtime.set", "runtime.remove",
    "input.set", "input.remove",
    "script.set",
    "fault.set", "fault.remove",
    "instrument.set", "instrument.remove",
  ],
  source: ["source.add", "source.remove", "source.rename", "source.edit"],
  owner: [
    "access.grant", "access.revoke", "access.set",
    "actor.set", "actor.remove",
    "license.set", "provenance.set",
  ],
};

export const OP_CLASS: Readonly<Record<OpKind, OpClass>> = Object.freeze(
  Object.fromEntries(
    (Object.entries(KINDS_BY_CLASS) as [OpClass, readonly OpKind[]][]).flatMap(([cls, kinds]) =>
      kinds.map((kind) => [kind, cls] as const),
    ),
  ),
);
