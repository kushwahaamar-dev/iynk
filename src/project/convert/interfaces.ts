import type { InterfaceGroup, InterfacePin } from "../generated/types.ts";
import type { InterfaceSnapshot } from "../holes.ts";
import { boardGroups, boardPinIds, pinIdFromLeg } from "../legacy-names.ts";
import type { BoardPinRow } from "../legacy-names.ts";
import type { CatalogueItem, FigureHeader } from "./types.ts";

export { surfaceInterface } from "../holes.ts";

type PinKind = Pick<InterfacePin, "type" | "class">;

/** Figure part id to the descriptor it becomes. Ids not listed here map to `core.<id>` and have no descriptor yet. */
export const PART_REFS: Record<string, { ref: string; version: "1.0.0" }> = {
  led: { ref: "core.led-5mm", version: "1.0.0" },
  resistor: { ref: "core.resistor", version: "1.0.0" },
  "push-button": { ref: "core.push-button-6mm", version: "1.0.0" },
  potentiometer: { ref: "core.potentiometer-10k", version: "1.0.0" },
  "piezo-buzzer": { ref: "core.buzzer-piezo", version: "1.0.0" },
  ssd1306: { ref: "core.ssd1306", version: "1.0.0" },
};

/** The descriptor a figure part pins, and whether a descriptor for it exists in the part library. */
export function partRef(figurePart: string): { ref: string; version: "1.0.0"; descriptor: boolean } {
  const known = PART_REFS[figurePart];
  return known ? { ...known, descriptor: true } : { ref: `core.${figurePart}`, version: "1.0.0", descriptor: false };
}

/** Internal joins of a figure part, by leg pin id. The push button's legs 1-2 and 3-4 are one switch contact each. */
export const PART_GROUPS: Record<string, { id: string; pins: string[] }[]> = {
  "push-button": [
    { id: "g_a", pins: ["P1", "P2"] },
    { id: "g_b", pins: ["P3", "P4"] },
  ],
};

const GROUND: PinKind = { type: "ground", class: "ground" };
const NC: PinKind = { type: "nc", class: "nc" };
const POWER: PinKind = { type: "power_io", class: "power" };
const DIGITAL: PinKind = { type: "digital_io", class: "digital" };
const ANALOG_IN: PinKind = { type: "analog_in", class: "analog" };
const ANALOG_OUT: PinKind = { type: "analog_out", class: "analog" };

/** First match wins, so a pin that is both digital and analog-in is digital, as the lesson example has it. */
function kindOfCaps(caps: readonly string[]): PinKind {
  if (caps.includes("gnd")) return GROUND;
  if (caps.includes("nc")) return NC;
  if (caps.includes("power")) return POWER;
  if (caps.includes("digital")) return DIGITAL;
  if (caps.includes("analog-in")) return ANALOG_IN;
  if (caps.includes("analog-out")) return ANALOG_OUT;
  return DIGITAL;
}

export interface BoardInterface {
  snapshot: InterfaceSnapshot;
  ids: string[];
  refToPin(ref: string): string | null;
}

const HEADER_REF = /^(.+)\.(\d+)$/;

/**
 * The pinned interface of a catalogue board (rule C-PIN) and the lookup from a figure reference to one of its pins.
 * `headers` are the figure board's header parts: a reference `IOH.5` is the fifth entry of the figure's `IOH`, which
 * names a net, and the pin is the first pin of that net. Without the figure part, `<header>.<n>` is read as the
 * catalogue row with that header and pin number.
 */
export function boardInterface(item: CatalogueItem & { lab: "board" }, headers: readonly FigureHeader[] = []): BoardInterface {
  const rows: BoardPinRow[] = item.data.pinout.map((row) => ({ header: row.header, pin: row.pin, net: row.net }));
  const ids = boardPinIds(rows);

  const pins: InterfacePin[] = item.data.pinout.map((row, i) => ({
    id: ids[i]!,
    designator: row.label,
    header: row.header,
    net: row.net,
    ...kindOfCaps(row.caps),
  }));
  const groups = boardGroups(rows, ids).map(
    (g): InterfaceGroup => ({ id: g.id, kind: g.kind, pins: g.pins as InterfaceGroup["pins"] }),
  );
  const snapshot: InterfaceSnapshot = { role: "board", pins, groups, params: [] };

  const byNet = new Map<string, string>();
  const byRow = new Map<string, string>();
  item.data.pinout.forEach((row, i) => {
    if (!byNet.has(row.net)) byNet.set(row.net, ids[i]!);
    byRow.set(`${row.header}.${row.pin}`, ids[i]!);
  });
  const headerById = new Map(headers.map((h) => [h.id, h.pins]));

  const refToPin = (ref: string): string | null => {
    const header = HEADER_REF.exec(ref);
    if (header) {
      const figurePins = headerById.get(header[1]!);
      if (figurePins) {
        const net = figurePins[Number(header[2]) - 1];
        if (net === undefined || net === null) return null;
        return net === "" ? (byRow.get(ref) ?? null) : (byNet.get(net) ?? null);
      }
      const row = byRow.get(ref);
      if (row !== undefined) return row;
    }
    return byNet.get(ref) ?? null;
  };

  return { snapshot, ids, refToPin };
}

/** The pinned interface of a figure part from its legs (rule C-LEG). */
export function partInterface(figurePart: string, legs: readonly string[]): InterfaceSnapshot {
  const pins: InterfacePin[] = legs.map((leg) => ({
    id: pinIdFromLeg(leg),
    designator: leg,
    type: "passive",
    class: "passive",
  }));
  const snapshot: InterfaceSnapshot = { role: "part", pins, params: [] };
  const groups = PART_GROUPS[figurePart];
  if (groups) {
    snapshot.groups = groups.map((g): InterfaceGroup => ({ id: g.id, kind: "internal-short", pins: g.pins as InterfaceGroup["pins"] }));
  }
  return snapshot;
}
