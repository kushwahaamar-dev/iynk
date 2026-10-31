import type { Build } from "../sim/flight/build.ts";

export interface DroneBomLine {
  qty: number;
  ref: string;
  name: string;
  mpn: string | null;
  /** Mass of the whole line, quantity included. */
  mass_g: number;
  source: "maker" | "assumption" | "measured";
  price: { amount: number; currency: string; asOf: string; estimate: boolean } | null;
}

export interface PartInfo {
  name: string;
  mpn?: string;
  priceTag?: DroneBomLine["price"];
  basis: DroneBomLine["source"];
}

export const BOM_COLUMNS = ["qty", "ref", "name", "mpn", "mass_g", "source", "price", "currency", "asOf", "estimate"] as const;

export type BomColumn = (typeof BOM_COLUMNS)[number];

export interface CsvHeader {
  /** The SN-8 text, shown as the first line. */
  sn8: string;
  /** The date of the export as an ISO string; the caller reads the clock. */
  made: string;
  columns: Readonly<Record<BomColumn, string>>;
}

interface Group {
  ref: string;
  qty: number;
  mass_g: number;
}

function add(groups: Map<string, Group>, ref: string, qty: number, mass_g: number): void {
  const g = groups.get(ref);
  if (g) {
    g.qty += qty;
    g.mass_g += mass_g;
  } else groups.set(ref, { ref, qty, mass_g });
}

/** Counts of the slots' motors and props, and the ESC units needed for the slots that share a ref. */
function slotGroups(b: Build): Group[][] {
  const motors = new Map<string, Group>();
  const props = new Map<string, Group>();
  const escSlots = new Map<string, { channels: number; mass_g: number; slots: number }>();
  for (const s of b.slots) {
    add(motors, s.motorRef, 1, s.motor.mass_g);
    add(props, s.propRef, 1, s.prop.mass_g);
    const esc = escSlots.get(s.escRef);
    if (esc) esc.slots += 1;
    else escSlots.set(s.escRef, { channels: Math.max(1, s.esc.channels), mass_g: s.esc.mass_g, slots: 1 });
  }
  const escs = [...escSlots].map(([ref, e]): Group => {
    const qty = Math.ceil(e.slots / e.channels);
    return { ref, qty, mass_g: qty * e.mass_g };
  });
  return [[...motors.values()], [...props.values()], escs];
}

/** The parts list of a build: frame, flight controller, ESCs, pack, motors, props. */
export function droneBom(b: Build, describe: (ref: string) => PartInfo): DroneBomLine[] {
  const [motors, props, escs] = slotGroups(b);
  const single = (ref: string, mass_g: number | undefined): Group[] => (mass_g === undefined ? [] : [{ ref, qty: 1, mass_g }]);
  const groups = [
    ...single(b.frameRef, b.frame?.mass_g),
    ...single(b.fcRef, b.fc?.mass_g),
    ...escs,
    ...single(b.packRef, b.pack?.mass_g),
    ...motors,
    ...props,
  ];
  return groups.map((g) => {
    const info = describe(g.ref);
    return {
      qty: g.qty,
      ref: g.ref,
      name: info.name,
      mpn: info.mpn ?? null,
      mass_g: g.mass_g,
      source: info.basis,
      price: info.priceTag ?? null,
    };
  });
}

const INJECTION_LEADS = new Set(["=", "+", "-", "@", "\t", "\r"]);

/** RFC 4180 quoting, with a leading quote on cells a spreadsheet would read as a formula. */
function cell(value: string): string {
  const text = INJECTION_LEADS.has(value[0] ?? "") ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const oneLine = (text: string): string => text.replace(/\s*[\r\n]+\s*/g, " ").trim();

export function toCsv(lines: readonly DroneBomLine[], header: CsvHeader): string {
  const rows = lines.map((l) =>
    [
      String(l.qty),
      l.ref,
      l.name,
      l.mpn ?? "",
      String(l.mass_g),
      l.source,
      l.price ? String(l.price.amount) : "",
      l.price?.currency ?? "",
      l.price?.asOf ?? "",
      l.price?.estimate ? "estimate" : "",
    ].map(cell),
  );
  return [
    `# ${oneLine(header.sn8)}`,
    `# made ${oneLine(header.made)}`,
    BOM_COLUMNS.map((c) => cell(header.columns[c])).join(","),
    ...rows.map((r) => r.join(",")),
  ].join("\r\n");
}
