import { stateHash } from "../project/hash.ts";
import type { Project } from "../project/generated/types.ts";
import { netlist } from "../project/netlist.ts";
import type { InterfaceSnapshot } from "../parts/pins.ts";
import { interfaceOf } from "../parts/pins.ts";
import type { PartRegistry } from "../parts/registry.ts";
import type { Descriptor } from "../parts/descriptor.ts";
import { type SimDiagnostic, simDiag } from "./core/diagnostic.ts";
import type { PartKind, SimNetlist, SimPart } from "./engine.ts";

const MAX_PARTS = 2000;
const STEP_NS = 1000;

const KIND_OF_ELEMENT: Record<string, PartKind> = {
  led: "led",
  res: "resistor",
  button: "button",
  buzzer: "buzzer",
  pot: "pot",
};

function kindOf(d: Descriptor): PartKind {
  if (d.identity.kind === "board") return "board";
  for (const layer of d.behaviour.layers) {
    if (layer.model.kind === "element") return KIND_OF_ELEMENT[layer.model.element] ?? "other";
  }
  return "other";
}

/**
 * The simulator's view of a document: electrical nodes from `netlist(doc)` and one part per board and component. A
 * wiring surface such as a breadboard is left out. A reference the registry cannot resolve still counts as a surface
 * when the document pinned it as one; any other becomes a part of kind `other` with `unknown-part`.
 */
export function buildSimNetlist(doc: Project, reg: Pick<PartRegistry, "get">): { net: SimNetlist; diagnostics: SimDiagnostic[] } {
  const nl = netlist(doc);
  const diagnostics: SimDiagnostic[] = [];
  const pinned = new Map<string, InterfaceSnapshot>();
  for (const dep of doc.dependencies.components) pinned.set(`${dep.ref}@${dep.version}`, dep.interface);

  const groundNet = doc.nets.find((n) => n.class === "ground");
  const groundPin = groundNet?.connections[0];
  const ground = groundPin ? (nl.pinNode[`${groundPin.c}/${groundPin.p}`] ?? "") : "";
  if (!groundNet) diagnostics.push(simDiag("no-ground", "warning", {}));

  const parts: SimPart[] = [];
  const instances = [...doc.boards, ...doc.components];
  if (instances.length > MAX_PARTS) {
    diagnostics.push(simDiag("netlist-too-large", "error", {}, { parts: instances.length, max: MAX_PARTS }));
  } else {
    for (const inst of instances) {
      const { ref, version } = inst.definition;
      const descriptor = reg.get(ref, version);
      const iface = pinned.get(`${ref}@${version}`) ?? (descriptor ? interfaceOf(descriptor) : undefined);
      if (iface?.role === "surface") continue;
      if (!descriptor) diagnostics.push(simDiag("unknown-part", "warning", { part: inst.id }, { ref: `${ref}@${version}` }));

      const params: SimPart["params"] = {};
      for (const p of iface?.params ?? []) params[p.id] = p.default;
      Object.assign(params, inst.params);

      const pins: SimPart["pins"] = {};
      for (const p of iface?.pins ?? []) pins[p.id] = nl.pinNode[`${inst.id}/${p.id}`] ?? null;
      parts.push({ id: inst.id, descriptor: `${ref}@${version}`, params, pins, kind: descriptor ? kindOf(descriptor) : "other" });
    }
  }

  const net: SimNetlist = {
    version: 1,
    docHash: stateHash(doc),
    nets: nl.nodes.map((node) => (node.names[0] === undefined ? { id: node.id } : { id: node.id, name: node.names[0] })),
    ground,
    parts: diagnostics.some((d) => d.id === "netlist-too-large") ? [] : parts,
    settings: { seed: doc.simulation.seed, toleranceMode: "nominal", analog: { mode: "dc-event", stepNs: STEP_NS }, speed: 1 },
  };
  return { net, diagnostics };
}
