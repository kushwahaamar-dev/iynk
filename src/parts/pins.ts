import { PIN_ID_PATTERN } from "../core/ids.ts";
import { LIMITS } from "../core/limits.ts";
import { diag } from "../core/result.ts";
import type { Diagnostic } from "../core/result.ts";
import type { ComponentDependency, InterfaceGroup, InterfaceParam, InterfacePin } from "../project/generated/types.ts";
import type { Component as Descriptor, Group } from "./generated/types.ts";

/** The interface a project pins for a part (`dependencies.components[].interface`). */
export type InterfaceSnapshot = ComponentDependency["interface"];

const MAX_DIAGNOSTICS = 20;

/**
 * The component schema has no role field, so the role comes from this table: a board kind or a dev board or
 * microcontroller category is a `board`, the `surface` tag marks a breadboard or any other wiring surface, and every
 * other part is a `part`.
 */
function roleOf(d: Descriptor): InterfaceSnapshot["role"] {
  if (d.identity.tags?.includes("surface")) return "surface";
  if (d.identity.kind === "board" || d.identity.category === "dev-board" || d.identity.category === "microcontroller") {
    return "board";
  }
  return "part";
}

function snapshotPin(p: Descriptor["pins"][number]): InterfacePin {
  const pin: InterfacePin = { id: p.id, type: p.type, class: p.class };
  if (p.designator !== undefined) pin.designator = p.designator;
  if (p.polarity !== undefined) pin.polarity = p.polarity;
  if (p.position !== undefined) {
    pin.position = p.position.z === undefined ? { x: p.position.x, y: p.position.y } : { ...p.position };
  }
  return pin;
}

function snapshotParam(p: NonNullable<Descriptor["parameters"]>[number]): InterfaceParam {
  const param: InterfaceParam = { id: p.id, type: p.type, default: p.default };
  if (p.unit !== undefined) param.unit = p.unit;
  if (p.values !== undefined) param.values = [...p.values];
  if (p.min !== undefined) param.min = p.min;
  if (p.max !== undefined) param.max = p.max;
  return param;
}

/**
 * The snapshot a project pins when it adds the part. The legacy catalogue fields `net` and `header` are not in the
 * component schema, so they are left out. A part without pins gives an empty `pins` list.
 */
export function interfaceOf(d: Descriptor): InterfaceSnapshot {
  const snapshot: InterfaceSnapshot = {
    role: roleOf(d),
    pins: d.pins.map(snapshotPin),
    params: (d.parameters ?? []).map(snapshotParam),
  };
  if (d.groups?.length) {
    snapshot.groups = d.groups.map(
      (g): InterfaceGroup => ({ id: g.id, kind: g.kind, pins: [...g.pins] as InterfaceGroup["pins"] }),
    );
  }
  return snapshot;
}

/** The first group that lists the pin, or undefined. */
export function groupOfPin(d: Descriptor, pinId: string): Group | undefined {
  return d.groups?.find((g) => g.pins.includes(pinId));
}

/** Every other pin that shares a group with the pin (internal short, strip or plane), in group order, once each. */
export function shortedPins(d: Descriptor, pinId: string): string[] {
  const out = new Set<string>();
  for (const g of d.groups ?? []) {
    if (!g.pins.includes(pinId)) continue;
    for (const other of g.pins) if (other !== pinId) out.add(other);
  }
  return [...out];
}

/** Pin caps and group rules (COMPONENT_SCHEMA 4.1, 4.5). Returns at most the first 20 findings. */
export function checkPinRules(d: Descriptor): Diagnostic[] {
  const out: Diagnostic[] = [];
  const err = (code: string, path: string, message: string) => out.push(diag(`P-PIN-${code}`, "error", path, message));

  if (d.pins.length > LIMITS.interfacePins) {
    err("COUNT", "/pins", `${d.pins.length} pins; the limit is ${LIMITS.interfacePins}`);
  }
  d.pins.forEach((p, i) => {
    if (!PIN_ID_PATTERN.test(p.id)) err("ID", `/pins/${i}/id`, `pin id "${p.id}" is not a valid pin id`);
  });

  const groups = d.groups ?? [];
  if (groups.length > LIMITS.interfaceGroups) {
    err("GROUPS", "/groups", `${groups.length} groups; the limit is ${LIMITS.interfaceGroups}`);
  }
  const known = new Set(d.pins.map((p) => p.id));
  const shortedBy = new Map<string, string>();
  groups.forEach((g, gi) => {
    if (g.pins.length > LIMITS.pinsPerGroup) {
      err("GROUP-SIZE", `/groups/${gi}/pins`, `group "${g.id}" has ${g.pins.length} pins; the limit is ${LIMITS.pinsPerGroup}`);
    }
    g.pins.forEach((pinId, pi) => {
      if (!known.has(pinId)) {
        err("GROUP-PIN", `/groups/${gi}/pins/${pi}`, `group "${g.id}" lists "${pinId}", which is not a pin`);
      }
      if (g.kind !== "internal-short") return;
      const first = shortedBy.get(pinId);
      if (first !== undefined && first !== g.id) {
        err("SHORT-TWICE", `/groups/${gi}/pins/${pi}`, `pin "${pinId}" is in internal-short groups "${first}" and "${g.id}"`);
      }
      shortedBy.set(pinId, g.id);
    });
  });
  return out.slice(0, MAX_DIAGNOSTICS);
}
