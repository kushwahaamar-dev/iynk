import { newId } from "../../core/ids.ts";
import type { Instrument, Op, PinRef, Project } from "../../project/generated/types.ts";
import type { ToleranceMode } from "../../sim/analog/tolerance.ts";

export interface ProbePoint {
  id: string;
  label: string;
  target: NonNullable<Instrument["target"]>;
}

export type InstrumentKind = Instrument["kind"];

export const MAX_INSTRUMENTS = 64;

const pinKey = ({ c, p }: PinRef): string => `${c}\u0000${p}`;

/** Every electrical pin and every named net of the project, as a label a person can pick from a list. */
export function listProbePoints(doc: Project): ProbePoint[] {
  const netOf = new Map<string, Project["nets"][number]>();
  for (const net of doc.nets) for (const pin of net.connections) netOf.set(pinKey(pin), net);

  const pins = [...doc.boards, ...doc.components].flatMap((item) => {
    const iface = doc.dependencies.components.find((d) => d.ref === item.definition.ref && d.version === item.definition.version)?.interface;
    if (!iface) return [];
    return iface.pins
      .filter((pin) => pin.type !== "mechanical" && pin.class !== "mechanical")
      .map((pin): ProbePoint => {
        const at: PinRef = { c: item.id, p: pin.id };
        const net = netOf.get(pinKey(at));
        const name = `${item.refdes} ${pin.designator ?? pin.id}`;
        return {
          id: `pin:${item.id}.${pin.id}`,
          label: net?.name ? `${name} (${net.name})` : name,
          target: { pin: at, ...(net && { net: net.id }), component: item.id },
        };
      });
  });
  const nets = doc.nets.flatMap((net): ProbePoint[] => (net.name ? [{ id: `net:${net.id}`, label: net.name, target: { net: net.id } }] : []));

  return [...pins, ...nets].map((point) => ({ ...point, label: point.label.normalize("NFC") })).sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
}

export function makeInstrumentOp(kind: InstrumentKind, target: ProbePoint["target"], settings?: Record<string, unknown>): Op {
  return { k: "instrument.set", instrument: { id: newId("ins"), kind, target, ...(settings && { settings }) } };
}

export function removeInstrumentOp(id: string): Op {
  return { k: "instrument.remove", id };
}

/** `sim.set` has no key for the tolerance mode, so the whole solver value goes back with one option changed. */
export function setToleranceOp(doc: Project, mode: ToleranceMode): Op {
  const { solver } = doc.simulation;
  return { k: "sim.set", key: "solver", value: { ...solver, options: { ...solver.options, toleranceMode: mode } } };
}
