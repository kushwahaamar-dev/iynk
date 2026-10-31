import type { Descriptor } from "../descriptor.ts";
import type { Pin } from "../generated/types.ts";

export type PinType = Pin["type"];
export type PinClass = Pin["class"];

/** The fields of a `PinRow` (src/content/schema.ts) the builder reads. */
export interface PinRowLike {
  header: string;
  pin: string;
  label: string;
  caps: readonly string[];
  volts: number | null;
  net?: string;
}

export interface PinFacts {
  id: string;
  designator: string;
  type: PinType;
  klass: PinClass;
  connector: string;
  /** Logic level of the row; null when the row gives none. */
  volts: number | null;
  note?: string;
}

export interface FpgaPortLike {
  name: string;
  dir: "in" | "out";
  width: number;
}

/** What the builder fills in; art, sources, simulation text and provenance are the board task's. */
export type ComponentDescriptorDraft = Pick<
  Descriptor,
  "schema" | "id" | "version" | "identity" | "sources" | "pins" | "connectors" | "groups" | "software"
>;

export type BoardGenErrorCode = "duplicate-pin" | "unnamed-pin";

export class BoardGenError extends Error {
  readonly code: BoardGenErrorCode;
  readonly detail: string;

  constructor(code: BoardGenErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "BoardGenError";
    this.code = code;
    this.detail = detail;
  }
}

const MAX_ID = 48;
const BUS_CAPS = ["i2c", "spi", "uart", "i2s", "can", "usb", "swd", "jtag"];
const LANGUAGES: Readonly<Record<string, "arduino-cpp" | "python" | "verilog">> = {
  arduino: "arduino-cpp",
  python: "python",
  verilog: "verilog",
};

const cleanId = (raw: string): string => raw.trim().replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, MAX_ID);

function typeOf(caps: readonly string[]): PinType {
  if (caps.includes("nc")) return "nc";
  if (caps.includes("gnd")) return "ground";
  if (caps.includes("power")) return "power_io";
  if (caps.includes("reset")) return "digital_in";
  if (caps.includes("analog-in") && caps.includes("input-only")) return "analog_in";
  if (caps.length === 0) return "analog_in";
  return "digital_io";
}

function classOf(type: PinType, caps: readonly string[]): PinClass {
  if (type === "nc") return "nc";
  if (type === "ground") return "ground";
  if (type === "power_io") return "power";
  if (type === "analog_in" || caps.includes("analog-in")) return "analog";
  if (!caps.includes("digital") && caps.some((c) => BUS_CAPS.includes(c))) return "bus";
  return "digital";
}

const comparePosition = (a: string, b: string): number => {
  const [x, y] = [Number(a), Number(b)];
  if (Number.isInteger(x) && Number.isInteger(y)) return x - y;
  return a < b ? -1 : a > b ? 1 : 0;
};

const compareRows = (a: PinRowLike, b: PinRowLike): number =>
  a.header === b.header ? comparePosition(a.pin, b.pin) : a.header < b.header ? -1 : 1;

/** One fact record per row, sorted by connector and position, with ids made unique. */
export function pinsFromPinout(rows: readonly PinRowLike[]): PinFacts[] {
  const used = new Set<string>();
  return [...rows].sort(compareRows).map((row) => {
    const name = (row.net ?? "").trim() || row.label.trim();
    if (!name) throw new BoardGenError("unnamed-pin", `${row.header}${row.pin}`);
    const type = typeOf(row.caps);
    let id = cleanId(name);
    if (type === "power_io" && /^[0-9]/.test(id)) id = `P${id}`;
    if (!id || used.has(id)) id = cleanId(`${row.header}_${row.pin}`);
    if (!id || used.has(id)) throw new BoardGenError("duplicate-pin", id || `${row.header}${row.pin}`);
    used.add(id);
    const facts: PinFacts = { id, designator: row.label.trim() || name, type, klass: classOf(type, row.caps), connector: cleanId(row.header), volts: row.volts };
    if (row.caps.includes("input-only")) facts.note = "Input only";
    return facts;
  });
}

function pinsFromPorts(ports: readonly FpgaPortLike[]): PinFacts[] {
  const used = new Set<string>();
  return ports.flatMap((port) =>
    Array.from({ length: port.width }, (_, bit) => {
      const label = port.width === 1 ? port.name : `${port.name}[${bit}]`;
      const id = cleanId(port.width === 1 ? port.name : `${port.name}${bit}`);
      if (!id || used.has(id)) throw new BoardGenError("duplicate-pin", id || label);
      used.add(id);
      const type: PinType = port.dir === "in" ? "digital_in" : "digital_out";
      return { id, designator: label, type, klass: "digital" as const, connector: "FPGA", volts: null };
    }),
  );
}

function logicFamily(volts: number): Pin["logic_family"] {
  if (volts === 3.3) return "lvcmos-3v3";
  if (volts === 5) return "cmos-5v";
  return undefined;
}

const SIGNAL_TYPES: readonly PinType[] = ["digital_io", "digital_in", "digital_out"];

export function buildBoardDescriptor(input: {
  id: string;
  maker: string;
  model: string;
  languages: readonly string[];
  pinout: readonly PinRowLike[];
  logicV: number;
  fpgaPorts?: readonly FpgaPortLike[];
}): ComponentDescriptorDraft {
  const { fpgaPorts } = input;
  const facts = input.pinout.length === 0 && fpgaPorts ? pinsFromPorts(fpgaPorts) : pinsFromPinout(input.pinout);
  const pins = facts.map((fact): Pin => {
    const pin: Pin = { id: fact.id, designator: fact.designator, type: fact.type, class: fact.klass, connector: fact.connector };
    const family = SIGNAL_TYPES.includes(fact.type) ? logicFamily(fact.volts ?? input.logicV) : undefined;
    if (family) pin.logic_family = family;
    if (fact.note) pin.note = { en: fact.note };
    return pin;
  });

  const connectorIds = [...new Set(pins.map((p) => p.connector ?? ""))];
  const ground = pins.filter((p) => p.type === "ground").map((p) => p.id);
  const environments = input.languages.flatMap((lang) => (lang in LANGUAGES ? [{ language: LANGUAGES[lang] }] : []));

  return {
    schema: "iynk.component/1",
    id: `core.${input.id}`,
    version: "1.0.0",
    identity: {
      manufacturer: input.maker,
      model: input.model,
      generic: false,
      refdes_prefix: "U",
      kind: "board",
      category: input.languages.includes("verilog") ? "fpga" : "dev-board",
      legacy_ids: [input.id],
    },
    sources: [],
    pins: pins as Descriptor["pins"],
    connectors: connectorIds.map((id) => ({
      id,
      kind: "header" as const,
      pins: pins.filter((p) => p.connector === id).map((p) => p.id) as [string, ...string[]],
    })),
    ...(ground.length >= 2 ? { groups: [{ id: "g_GND", kind: "internal-short" as const, pins: ground as [string, string, ...string[]] }] } : {}),
    software: { environments },
  };
}
