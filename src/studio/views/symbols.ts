import type { Descriptor } from "../../parts/descriptor.ts";
import type { InterfaceSnapshot } from "../../parts/pins.ts";

export type SymbolId =
  | "generated"
  | "resistor"
  | "led"
  | "diode"
  | "capacitor"
  | "inductor"
  | "switch"
  | "transistor-npn"
  | "motor"
  | "ic-box"
  | "module-box";

export type SymbolSide = "left" | "right" | "top" | "bottom";

/** Positions are millimetres from the top-left corner of the symbol, +y down. */
export interface SymbolPin {
  pin: string;
  x_mm: number;
  y_mm: number;
  side: SymbolSide;
  label: string;
}

export interface SymbolShape {
  w_mm: number;
  h_mm: number;
  paths: string[];
  pins: SymbolPin[];
  label: { x_mm: number; y_mm: number };
}

type PinInfo = { id: string; type?: string; class?: string; polarity?: string; designator?: string };

const PITCH = 2.54;
const TWO_LEAD_W = 10.16;
const TWO_LEAD_H = PITCH;
const TRANSISTOR = 7.62;
const BOX_MIN_W = 15.24;
const BOX_MIN_H = 10.16;
const MODULE_MIN_W = 20.32;

const round2 = (n: number): number => Math.round(n * 100) / 100;

const pinAt = (pin: PinInfo, side: SymbolSide, x: number, y: number): SymbolPin => ({
  pin: pin.id,
  x_mm: round2(x),
  y_mm: round2(y),
  side,
  label: pin.designator ?? pin.id,
});

const TWO_LEAD_BODY: Partial<Record<SymbolId, string[]>> = {
  resistor: ["M0 1.27H2.54L3.18 0L4.45 2.54L5.72 0L6.99 2.54L7.62 1.27H10.16"],
  led: ["M0 1.27H3.81M3.81 -1.27V3.81L6.35 1.27L3.81 -1.27M6.35 -1.27V3.81M6.35 1.27H10.16M5.08 -1.5L6.6 -3M7.1 -0.9L8.6 -2.4"],
  diode: ["M0 1.27H3.81M3.81 -1.27V3.81L6.35 1.27L3.81 -1.27M6.35 -1.27V3.81M6.35 1.27H10.16"],
  capacitor: ["M0 1.27H4.45M4.45 -1.27V3.81M5.72 -1.27V3.81M5.72 1.27H10.16"],
  inductor: ["M0 1.27H1.27A1.27 1.27 0 0 1 3.81 1.27A1.27 1.27 0 0 1 6.35 1.27A1.27 1.27 0 0 1 8.89 1.27H10.16"],
  switch: ["M0 1.27H3.18M7.62 1.27H10.16M3.18 1.27L7.1 -1.1"],
};

const TWO_LEAD_IDS = new Set<SymbolId>(["resistor", "led", "diode", "capacitor", "inductor", "switch"]);
const POLAR_FIRST = new Set(["anode", "positive"]);

function twoLead(id: SymbolId, pins: PinInfo[]): SymbolShape | null {
  if (pins.length !== 2) return null;
  const [a, b] = POLAR_FIRST.has(pins[1]!.polarity ?? "") ? [pins[1]!, pins[0]!] : [pins[0]!, pins[1]!];
  return {
    w_mm: TWO_LEAD_W,
    h_mm: TWO_LEAD_H,
    paths: TWO_LEAD_BODY[id] ?? [],
    pins: [pinAt(a, "left", 0, TWO_LEAD_H / 2), pinAt(b, "right", TWO_LEAD_W, TWO_LEAD_H / 2)],
    label: { x_mm: TWO_LEAD_W / 2, y_mm: TWO_LEAD_H + PITCH },
  };
}

const BASE = /^(b|base|g|gate)/i;
const COLLECTOR = /^(c|collector|d|drain)/i;
const EMITTER = /^(e|emitter|s|source)/i;

function transistor(pins: PinInfo[]): SymbolShape | null {
  if (pins.length !== 3) return null;
  const named = [BASE, COLLECTOR, EMITTER].map((re) => pins.find((p) => re.test(p.id)));
  const [base, collector, emitter] = new Set(named).size === 3 && !named.includes(undefined) ? (named as PinInfo[]) : pins;
  const mid = TRANSISTOR / 2;
  return {
    w_mm: TRANSISTOR,
    h_mm: TRANSISTOR,
    paths: ["M0 3.81H2.54M2.54 1.27V6.35M2.54 2.54L5.08 1.27V0M2.54 5.08L5.08 6.35V7.62"],
    pins: [pinAt(base!, "left", 0, mid), pinAt(collector!, "top", TRANSISTOR - 2.54, 0), pinAt(emitter!, "bottom", TRANSISTOR - 2.54, TRANSISTOR)],
    label: { x_mm: mid, y_mm: TRANSISTOR + PITCH },
  };
}

function motor(pins: PinInfo[]): SymbolShape | null {
  if (pins.length !== 2) return null;
  return {
    w_mm: TRANSISTOR,
    h_mm: TRANSISTOR,
    paths: ["M3.81 0V1.27M3.81 6.35V7.62M3.81 1.27A2.54 2.54 0 1 1 3.81 6.35A2.54 2.54 0 1 1 3.81 1.27"],
    pins: [pinAt(pins[0]!, "top", TRANSISTOR / 2, 0), pinAt(pins[1]!, "bottom", TRANSISTOR / 2, TRANSISTOR)],
    label: { x_mm: TRANSISTOR / 2, y_mm: TRANSISTOR / 2 },
  };
}

function defaultSide(pin: PinInfo): SymbolSide {
  if (pin.type === "ground" || pin.class === "ground") return "bottom";
  if (pin.type === "power_in" || pin.class === "power") return "top";
  if (pin.type?.endsWith("_in")) return "left";
  return "right";
}

/** A rectangle with the pins on its sides, 2.54 mm apart, sized by the busier side. Used by every symbol that is not a fixed glyph. */
function box(pins: PinInfo[], sides: Record<string, SymbolSide | undefined>, minW: number): SymbolShape {
  const sideOf = pins.map((p) => sides[p.id] ?? defaultSide(p));
  const count = (s: SymbolSide) => sideOf.filter((x) => x === s).length;
  const w = round2(Math.max(minW, (Math.max(count("top"), count("bottom")) + 1) * PITCH));
  const h = round2(Math.max(BOX_MIN_H, (Math.max(count("left"), count("right")) + 1) * PITCH));
  const used = { left: 0, right: 0, top: 0, bottom: 0 };
  const placed = pins.map((pin, i) => {
    const side = sideOf[i]!;
    const step = ++used[side] * PITCH;
    switch (side) {
      case "left":
        return pinAt(pin, side, 0, step);
      case "right":
        return pinAt(pin, side, w, step);
      case "top":
        return pinAt(pin, side, step, 0);
      case "bottom":
        return pinAt(pin, side, step, h);
    }
  });
  return { w_mm: w, h_mm: h, paths: [`M0 0H${w}V${h}H0Z`], pins: placed, label: { x_mm: round2(w / 2), y_mm: round2(h / 2) } };
}

function shapeFor(id: SymbolId, pins: PinInfo[], sides: Record<string, SymbolSide | undefined>): SymbolShape {
  const fixed = TWO_LEAD_IDS.has(id) ? twoLead(id, pins) : id === "transistor-npn" ? transistor(pins) : id === "motor" ? motor(pins) : null;
  if (fixed) return fixed;
  return box(pins, sides, id === "module-box" ? MODULE_MIN_W : BOX_MIN_W);
}

/** The symbol a descriptor asks for; boards and modules default to a module box, every other part to an IC box. */
export function symbolFor(d: Descriptor): SymbolShape {
  const asked = d.visual.schematic?.symbol;
  const isModule = d.identity.kind === "board" || d.identity.kind === "module";
  const id: SymbolId = !asked || asked === "generated" ? (isModule ? "module-box" : "ic-box") : asked;
  return shapeFor(id, d.pins, d.visual.schematic?.pin_sides ?? {});
}

/** The symbol for a part the registry does not hold, from the interface the project pinned. */
export function symbolForInterface(iface: InterfaceSnapshot): SymbolShape {
  return shapeFor(iface.role === "board" ? "module-box" : "ic-box", iface.pins, {});
}
