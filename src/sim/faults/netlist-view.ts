import type { Descriptor } from "../../parts/descriptor.ts";
import type { SimNetlist } from "../engine.ts";
import type { NetView, PinInfo } from "./types.ts";

type NetClass = ReturnType<NetView["netClass"]>;

const hasElement = (d: Descriptor | undefined, element: string): boolean =>
  d?.behaviour.layers.some((l) => l.model.kind === "element" && l.model.element === element) ?? false;

/**
 * Reads a simulator netlist once and answers the questions the fault rules ask. Nets joined by an `internal-short`
 * group of a part are one net here, and a group pin with no net of its own takes the net of its group.
 */
export function buildNetView(
  net: SimNetlist,
  describe: (descriptorId: string) => Descriptor | undefined,
): NetView {
  const descriptors = new Map<string, Descriptor | undefined>();
  for (const part of net.parts) descriptors.set(part.id, describe(part.descriptor));

  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const up = parent.get(id);
    if (up === undefined || up === id) return id;
    const root = find(up);
    parent.set(id, root);
    return root;
  };
  // The ground net always stays the representative of whatever joins it; otherwise the smaller id wins.
  const union = (a: string, b: string): void => {
    const [ra, rb] = [find(a), find(b)];
    if (ra === rb) return;
    const [keep, drop] = ra === net.ground || (rb !== net.ground && ra < rb) ? [ra, rb] : [rb, ra];
    parent.set(drop, keep);
  };

  const shorts = new Map<string, string[][]>();
  for (const part of net.parts) {
    const groups = (descriptors.get(part.id)?.groups ?? []).filter((g) => g.kind === "internal-short").map((g) => g.pins);
    shorts.set(part.id, groups);
    for (const pins of groups) {
      const [first, ...rest] = pins.map((p) => part.pins[p]).filter((n): n is string => typeof n === "string");
      if (first !== undefined) for (const other of rest) union(first, other);
    }
  }

  const byPart = new Map<string, Map<string, PinInfo>>();
  const byNet = new Map<string, PinInfo[]>();
  for (const part of net.parts) {
    const d = descriptors.get(part.id);
    const meta = new Map(d?.pins.map((p) => [p.id, p]));
    const pins = new Map<string, PinInfo>();
    byPart.set(part.id, pins);
    for (const [pin, own] of Object.entries(part.pins)) {
      const mate = (shorts.get(part.id) ?? []).find((g) => g.includes(pin));
      const raw = own ?? mate?.map((p) => part.pins[p]).find((n) => typeof n === "string") ?? null;
      const m = meta.get(pin);
      const info: PinInfo = { part: part.id, pin, net: raw === null ? null : find(raw) };
      if (m) Object.assign(info, { type: m.type, cls: m.class, ...(m.polarity ? { polarity: m.polarity } : {}) });
      pins.set(pin, info);
      if (info.net !== null) byNet.set(info.net, [...(byNet.get(info.net) ?? []), info]);
    }
  }

  const groundNet = net.ground === "" ? "" : find(net.ground);
  const netIds = [...new Set(net.nets.map((n) => find(n.id)))];
  const isBoard = (part: string): boolean => {
    const d = descriptors.get(part);
    return d ? d.identity.kind === "board" : net.parts.find((p) => p.id === part)?.kind === "board";
  };
  const pinsOn = (id: string): PinInfo[] => byNet.get(id) ?? [];
  const drivesRail = (p: PinInfo): boolean =>
    p.cls === "power" && (p.type === "power_out" || (p.type === "power_io" && isBoard(p.part)));
  const outputPin = (p: PinInfo): boolean =>
    descriptors.get(p.part)?.power?.outputs?.some((o) => o.pin === p.pin) ?? false;

  const classes = new Map<string, NetClass>();
  const classify = (id: string): NetClass => {
    const pins = pinsOn(id);
    const sourcePart = (part: string): boolean => descriptors.get(part)?.pins.some((q) => q.type === "power_out") ?? false;
    if (id === groundNet || pins.some((p) => p.cls === "ground" && sourcePart(p.part))) return "ground";
    if (pins.some((p) => drivesRail(p) || outputPin(p))) return "power";
    if (pins.some((p) => p.cls === "power" || p.cls === "ground")) return "unknown";
    return pins.some((p) => p.cls === "digital" || p.cls === "analog" || p.cls === "bus") ? "signal" : "unknown";
  };

  return {
    groundNet,
    nets: () => netIds,
    parts: () => net.parts.map((p) => p.id),
    pinsOn,
    pin: (part, pin) => byPart.get(part)?.get(pin),
    descriptor: (part) => descriptors.get(part),
    isBoard,
    category: (part) => descriptors.get(part)?.identity.category,
    netClass(id) {
      let cls = classes.get(id);
      if (cls === undefined) {
        cls = classify(id);
        classes.set(id, cls);
      }
      return cls;
    },
    nominalVolts(id) {
      for (const p of pinsOn(id)) {
        const out = descriptors.get(p.part)?.power?.outputs?.find((o) => o.pin === p.pin);
        const volts = out?.nominal.unit === "V" ? (out.nominal.value ?? out.nominal.typ) : undefined;
        if (volts !== undefined) return volts;
      }
      return undefined;
    },
    wireOnly(a, b) {
      const nets = new Set([...(byPart.get(a)?.values() ?? [])].map((p) => p.net));
      return [...(byPart.get(b)?.values() ?? [])].some((p) => p.net !== null && nets.has(p.net));
    },
    resistorsOn: (id) => pinsOn(id).filter((p) => hasElement(descriptors.get(p.part), "res")),
  };
}
