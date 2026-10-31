import { diag } from "@/core/result";
import type { Diagnostic } from "@/core/result";
import { validateDescriptor } from "@/parts/descriptor";
import type { Descriptor as ComponentDescriptor } from "@/parts/descriptor";
import { readMotor } from "@/parts/mechanics";
import { fitDatasheet } from "@/sim/flight/fit";
import type { FitRecord, FitResult, FitRow } from "@/sim/flight/fit";
import { isOutOfRange } from "@/sim/flight/guards";
import { SEA_LEVEL_AIR } from "@/sim/flight/propulsion";

export interface MotorEntry {
  name: string;
  kv_rpm_per_v: number;
  r_ohm: number;
  i_noload_a: number;
  v_max?: number;
  i_max_a?: number;
  mass_g: number;
}

export interface PropEntry {
  name: string;
  diameter_in: number;
  pitch_in: number;
  blades: number;
  mass_g: number;
}

export interface EscEntry {
  name: string;
  i_cont_a: number;
  i_burst_a?: number;
  channels: number;
  protocol: string;
  efficiency?: number;
  v_max?: number;
  mass_g: number;
}

export interface PackEntry {
  name: string;
  cells: number;
  parallel?: number;
  capacity_mah: number;
  c_continuous?: number;
  r_cell_mohm?: number;
  chemistry: "lipo" | "lihv" | "liion";
  mass_g: number;
}

export interface SourceEntry {
  title: string;
  url?: string;
  kind: "manufacturer-datasheet" | "own-measurement" | "community";
  note?: string;
}

export interface PartEntry {
  motor?: MotorEntry;
  prop?: PropEntry;
  pack?: PackEntry;
  esc?: EscEntry;
  source: SourceEntry;
  rows?: FitRow[];
  license?: string;
  version?: string;
  /** The day the part is made, as YYYY-MM-DD. Defaults to today. */
  date?: string;
}

export interface PartIssue extends Diagnostic {
  /** The id of the part the finding is about, or its role when the name gave no id. Empty for the source. */
  part: string;
}

export interface EntryResult {
  descriptors: ComponentDescriptor[];
  fit: FitResult | null;
  issues: PartIssue[];
}

export type RowError =
  | { kind: "tooMany"; count: number }
  | { kind: "columns"; line: number }
  | { kind: "notNumber"; line: number };

/** Findings of this entry form (not of the descriptor checks) carry one of these codes, so the form can word them in the person's language. */
export type EntryCode = "P-ENTRY-NUMBER" | "P-ENTRY-SOURCE" | "P-ENTRY-NAME" | "P-ENTRY-DUPLICATE" | "P-ENTRY-FIT";

export const MAX_ROWS = 32;
export const PROTOCOLS = ["pwm", "oneshot", "dshot150", "dshot300", "dshot600"] as const;
export const DEFAULT_LICENSE = "LicenseRef-user-supplied";

const MM_PER_IN = 25.4;
const PIN_PITCH_MM = 2.54;
const COLUMNS = 4;
const DEFAULT_ESC_EFFICIENCY = 0.95;
const R_CELL_MOHM_AH = 4;
const SLUG_MAX = 40;
const SOURCE_ID = "entry";
const DEFAULT_VERSION = "1.0.0";
const PROP_FIT_PATH = "/mechanics/prop/ct0";

const SOURCE_KINDS = {
  "manufacturer-datasheet": { kind: "datasheet", reliability: "primary" },
  "own-measurement": { kind: "measurement", reliability: "primary" },
  community: { kind: "fact-sheet", reliability: "secondary" },
} as const;

const SEPARATORS = ["\t", ";", ","] as const;

const isNumeric = (cell: string): boolean => cell !== "" && Number.isFinite(Number(cell));

/** Tab and semicolon tables may use comma decimals; a comma separated table cannot. */
function cellsOf(line: string): string[] {
  const sep = SEPARATORS.find((s) => line.includes(s)) ?? ",";
  return line.split(sep).map((c) => (sep === "," ? c.trim() : c.trim().replace(",", ".")));
}

/** Datasheet rows as `v_pack, throttle, thrust_g, current_a`, separated by tab, semicolon or comma. A header line is skipped. */
export function parseRows(text: string): { rows: FitRow[]; errors: RowError[] } {
  const lines = text.split(/\r?\n/).flatMap((raw, i) => (raw.trim() === "" ? [] : [{ cells: cellsOf(raw), line: i + 1 }]));
  const body = lines.length > 0 && !lines[0]!.cells.some(isNumeric) ? lines.slice(1) : lines;
  if (body.length > MAX_ROWS) return { rows: [], errors: [{ kind: "tooMany", count: body.length }] };

  const rows: FitRow[] = [];
  const errors: RowError[] = [];
  for (const { cells, line } of body) {
    if (cells.length < COLUMNS) errors.push({ kind: "columns", line });
    else if (!cells.slice(0, COLUMNS).every(isNumeric)) errors.push({ kind: "notNumber", line });
    else {
      const [v_pack, throttle, thrust_g, current_a] = cells.slice(0, COLUMNS).map(Number) as [number, number, number, number];
      rows.push({ v_pack, throttle, thrust_g, current_a });
    }
  }
  return { rows, errors };
}

export function slugOf(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
  return /^[a-z]/.test(slug) || slug === "" ? slug : `part-${slug}`;
}

type Role = "motor" | "prop" | "esc" | "battery";

type Pin = ComponentDescriptor["pins"][number];

interface PinSpec {
  id: string;
  name: string;
  designator: string;
  type: Pin["type"];
  class: Pin["class"];
  polarity?: Pin["polarity"];
}

interface Shape {
  kind: ComponentDescriptor["identity"]["kind"];
  prefix: string;
  tags: string[];
  models: string;
  summary: string;
  pins: [PinSpec, ...PinSpec[]];
  connector: "wire-lead" | "other";
  renderer: ComponentDescriptor["visual"]["fallback"]["renderer"];
  colour: string;
}

const SHAPES: Record<Role, Shape> = {
  motor: {
    kind: "actuator",
    prefix: "M",
    tags: ["motor", "bldc"],
    models: "Back-EMF and winding resistance with a constant no-load current: Q = ke (I - I0), V = ke omega + R I.",
    summary: "Three-phase motor. The flight solver reads kv, resistance and no-load current.",
    pins: [
      { id: "A", name: "Phase A", designator: "A", type: "passive", class: "passive" },
      { id: "B", name: "Phase B", designator: "B", type: "passive", class: "passive" },
      { id: "C", name: "Phase C", designator: "C", type: "passive", class: "passive" },
    ],
    connector: "wire-lead",
    renderer: "generic-box",
    colour: "#3a3f4a",
  },
  prop: {
    kind: "mechanical",
    prefix: "P",
    tags: ["propeller", "prop"],
    models: "Thrust T = ct0 rho n^2 D^4 and shaft power P = cp0 rho n^3 D^5 with fixed coefficients.",
    summary: "Fixed-pitch propeller. The flight solver reads the diameter and the two coefficients.",
    pins: [{ id: "MOUNT", name: "Motor mount", designator: "MOUNT", type: "passive", class: "passive" }],
    connector: "other",
    renderer: "generic-box",
    colour: "#c9ced6",
  },
  esc: {
    kind: "module",
    prefix: "ESC",
    tags: ["esc", "drone"],
    models: "A fixed efficiency between the pack and the motors, with continuous and burst current limits per channel.",
    summary: "Electronic speed controller. The drone solver reads the mechanics block.",
    pins: [
      { id: "VBAT", name: "Battery positive", designator: "VBAT", type: "power_in", class: "power" },
      { id: "GND", name: "Ground", designator: "GND", type: "ground", class: "ground" },
      { id: "S1", name: "Signal 1", designator: "S1", type: "digital_in", class: "digital" },
    ],
    connector: "wire-lead",
    renderer: "generic-header-module",
    colour: "#2f3438",
  },
  battery: {
    kind: "mechanical",
    prefix: "BT",
    tags: ["battery", "drone"],
    models: "Open-circuit voltage from the cell table and sag from the series resistance, as functions of charge and current.",
    summary: "Battery pack. The drone solver reads the mechanics block.",
    pins: [
      { id: "PLUS", name: "Positive lead", designator: "+", type: "power_out", class: "power", polarity: "positive" },
      { id: "MINUS", name: "Negative lead", designator: "-", type: "ground", class: "ground", polarity: "negative" },
    ],
    connector: "wire-lead",
    renderer: "generic-two-lead",
    colour: "#3d6cb2",
  },
};

const NOT_MODELLED = "Heating, ESC timing, stall, ground effect and the change of the coefficients with forward speed.";

const defined = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

interface Built {
  role: Role;
  name: string;
  mechanics: Record<string, unknown>;
  description: string;
  gaps?: { id: string; text: string; evidence: string }[];
  extra?: Record<string, unknown>;
}

function describePart(e: PartEntry, b: Built, id: string): ComponentDescriptor {
  const shape = SHAPES[b.role];
  const src = SOURCE_KINDS[e.source.kind];
  const date = e.date ?? new Date().toISOString().slice(0, 10);
  const version = e.version ?? DEFAULT_VERSION;
  const [first, ...rest] = shape.pins;
  const placed = (p: PinSpec, i: number): Pin => ({ ...p, name: { en: p.name }, position: { x: i * PIN_PITCH_MM, y: 0 }, connector: "leads" });
  return {
    schema: "iynk.component/1",
    id,
    version,
    identity: {
      manufacturer: "generic",
      model: b.name,
      generic: true,
      refdes_prefix: shape.prefix,
      kind: shape.kind,
      category: "drone",
      description: { en: b.description },
      primary_source: SOURCE_ID,
      tags: shape.tags,
    },
    sources: [
      defined({
        id: SOURCE_ID,
        kind: src.kind,
        title: e.source.title,
        url: e.source.url,
        reliability: src.reliability,
        note: e.source.note,
      }),
    ],
    pins: [placed(first, 0), ...rest.map((p, i) => placed(p, i + 1))],
    connectors: [{ id: "leads", kind: shape.connector, gender: "none", pins: [first.id, ...rest.map((p) => p.id)] }],
    ratings: {},
    mechanics: { [b.role]: { ...b.mechanics, source: { src: SOURCE_ID } } },
    behaviour: {
      summary: { en: shape.summary },
      layers: [
        {
          id: "plant",
          domain: "mechanical",
          summary: { en: shape.models },
          model: { kind: "none", reason: { en: "The flight solver reads the mechanics block directly; there is no circuit element." } },
        },
      ],
    },
    simulation: {
      tier: "T1",
      status: "partly-modelled",
      what_it_models: [{ en: shape.models }],
      not_modelled: [{ en: NOT_MODELLED }],
      known_gaps: (b.gaps ?? []).map((g) => ({ id: g.id, text: { en: g.text }, evidence: g.evidence })),
      solver_requires: [],
      tests: [{ id: "entry_numbers", kind: "datasheet-point", file: "tests/entry.json", source: { src: SOURCE_ID }, state: "to-write" }],
    },
    visual: { fallback: { renderer: shape.renderer, label: b.name.slice(0, 24), body_colour: shape.colour, show_pin_labels: b.role === "esc" || b.role === "battery" } },
    ...b.extra,
    provenance: {
      license: e.license?.trim() || DEFAULT_LICENSE,
      origin: "local-user",
      created: date,
      third_party_content: e.source.kind !== "own-measurement",
      review: { status: "unreviewed" },
      changelog: [{ version, date, note: "Entered by hand.", behaviour_change: false }],
    },
  };
}

const needsPositive = (path: string, value: number | undefined, required: boolean): string | null =>
  value === undefined ? (required ? path : null) : Number.isFinite(value) ? null : path;

function motorBuilt(m: MotorEntry): { built: Built; bad: string[] } {
  const bad = [
    needsPositive("/mechanics/motor/kv_rpm_per_v", m.kv_rpm_per_v, true),
    needsPositive("/mechanics/motor/r_ohm", m.r_ohm, true),
    needsPositive("/mechanics/motor/i_noload_a", m.i_noload_a, true),
    needsPositive("/mechanics/motor/mass_g", m.mass_g, true),
    needsPositive("/mechanics/motor/v_max", m.v_max, false),
    needsPositive("/mechanics/motor/i_max_a", m.i_max_a, false),
  ].filter((p): p is string => p !== null);
  const mechanics = defined({ kv_rpm_per_v: m.kv_rpm_per_v, r_ohm: m.r_ohm, i_noload_a: m.i_noload_a, v_max: m.v_max, i_max_a: m.i_max_a, mass_g: m.mass_g });
  return { built: { role: "motor", name: m.name, mechanics, description: `A brushless motor with ${m.kv_rpm_per_v} kv, entered by hand.` }, bad };
}

function escBuilt(x: EscEntry): { built: Built; bad: string[] } {
  const bad = [
    needsPositive("/mechanics/esc/i_cont_a", x.i_cont_a, true),
    needsPositive("/mechanics/esc/channels", x.channels, true),
    needsPositive("/mechanics/esc/mass_g", x.mass_g, true),
    needsPositive("/mechanics/esc/i_burst_a", x.i_burst_a, false),
    needsPositive("/mechanics/esc/efficiency", x.efficiency, false),
    needsPositive("/mechanics/esc/v_max", x.v_max, false),
  ].filter((p): p is string => p !== null);
  const mechanics = defined({ i_cont_a: x.i_cont_a, i_burst_a: x.i_burst_a, channels: x.channels, protocol: x.protocol, efficiency: x.efficiency, v_max: x.v_max, mass_g: x.mass_g });
  return { built: { role: "esc", name: x.name, mechanics, description: `An electronic speed controller rated ${x.i_cont_a} A, entered by hand.` }, bad };
}

function packBuilt(p: PackEntry): { built: Built; bad: string[] } {
  const bad = [
    needsPositive("/mechanics/battery/cells", p.cells, true),
    needsPositive("/mechanics/battery/capacity_mah", p.capacity_mah, true),
    needsPositive("/mechanics/battery/mass_g", p.mass_g, true),
    needsPositive("/mechanics/battery/parallel", p.parallel, false),
    needsPositive("/mechanics/battery/c_continuous", p.c_continuous, false),
    needsPositive("/mechanics/battery/r_cell_ohm", p.r_cell_mohm, false),
  ].filter((x): x is string => x !== null);
  const typed = p.r_cell_mohm !== undefined;
  const r_cell_ohm = typed ? p.r_cell_mohm! / 1000 : R_CELL_MOHM_AH / p.capacity_mah;
  const mechanics = defined({ cells: p.cells, parallel: p.parallel, capacity_mah: p.capacity_mah, c_continuous: p.c_continuous, r_cell_ohm, chemistry: p.chemistry, mass_g: p.mass_g });
  const gaps = typed ? [] : [{ id: "r_cell_assumed", text: "The cell resistance was not given; it is set from the capacity.", evidence: "typical for a pack of this size" }];
  return { built: { role: "battery", name: p.name, mechanics, description: `A ${p.cells}S ${p.capacity_mah} mAh pack, entered by hand.`, gaps }, bad };
}

/** Builds the part files for a form's entry and checks each as the person's own part. */
export function entryToDescriptors(e: PartEntry): EntryResult {
  const issues: PartIssue[] = [];
  const descriptors: ComponentDescriptor[] = [];
  let fit: FitResult | null = null;
  const refuse = (code: EntryCode, part: string, path: string, message: string) => issues.push({ ...diag(code, "error", path, message), part });

  if (e.source.title.trim() === "") refuse("P-ENTRY-SOURCE", "", "/sources/0/title", "the part needs a source");
  const date = e.date ?? new Date().toISOString().slice(0, 10);
  const stamped: PartEntry = { ...e, date };

  const add = (built: Built, bad: string[], extra?: Record<string, unknown>) => {
    const id = `local.${slugOf(built.name)}`;
    if (slugOf(built.name) === "") return refuse("P-ENTRY-NAME", built.role, "/identity/model", "the name needs letters or digits");
    if (descriptors.some((d) => d.id === id)) return refuse("P-ENTRY-DUPLICATE", id, "/identity/model", "another part of this entry has the same name");
    for (const path of bad) refuse("P-ENTRY-NUMBER", id, path, "enter a number");
    if (bad.length > 0) return;
    const d = describePart(stamped, { ...built, extra }, id);
    const check = validateDescriptor(d, { ctx: { trust: "local" } });
    for (const x of check.diagnostics) issues.push({ ...x, part: id });
    descriptors.push(d);
  };

  const escEff = e.esc?.efficiency ?? DEFAULT_ESC_EFFICIENCY;

  if (e.motor) {
    const { built, bad } = motorBuilt(e.motor);
    add(built, bad);
  }
  if (e.prop) {
    const p = e.prop;
    const motor = descriptors.find((d) => d.mechanics?.motor !== undefined);
    const rows = e.rows ?? [];
    const id = `local.${slugOf(p.name)}`;
    const bad = [
      needsPositive("/mechanics/prop/diameter_mm", p.diameter_in, true),
      needsPositive("/mechanics/prop/pitch_mm", p.pitch_in, true),
      needsPositive("/mechanics/prop/mass_g", p.mass_g, true),
    ].filter((x): x is string => x !== null);
    const read = motor ? readMotor(motor) : null;
    if (!motor || !read?.ok) {
      refuse("P-ENTRY-FIT", id, PROP_FIT_PATH, "a propeller is fitted against its motor; enter a valid motor too");
    } else if (bad.length > 0) {
      for (const path of bad) refuse("P-ENTRY-NUMBER", id, path, "enter a number");
    } else {
      const result = fitDatasheet(rows, read.value, (p.diameter_in * MM_PER_IN) / 1000, escEff, SEA_LEVEL_AIR);
      if (isOutOfRange(result)) {
        refuse("P-ENTRY-FIT", id, PROP_FIT_PATH, rows.length === 0 ? "paste the datasheet rows to fit the propeller" : "the rows do not fit; check the values and the row count");
      } else {
        fit = result;
        if (result.band === null) {
          refuse("P-ENTRY-FIT", id, PROP_FIT_PATH, "the fit did not settle; check the rows");
        } else {
          const record: FitRecord = {
            motor: motor.id,
            rows: [...rows],
            ct0: result.ct0,
            cp0: result.cp0,
            rms_thrust: result.rms_thrust,
            rms_current: result.rms_current,
            band: result.band,
            v_range: [...result.v_range],
            throttle_range: [...result.throttle_range],
            made: date,
          };
          const mechanics = { diameter_mm: p.diameter_in * MM_PER_IN, pitch_mm: p.pitch_in * MM_PER_IN, blades: p.blades, ct0: result.ct0, cp0: result.cp0, mass_g: p.mass_g };
          add({ role: "prop", name: p.name, mechanics, description: `A ${p.diameter_in} inch propeller fitted to ${motor.identity.model}.` }, [], { x_fit: [record] });
        }
      }
    }
  }
  if (e.esc) {
    const { built, bad } = escBuilt(e.esc);
    add(built, bad);
  }
  if (e.pack) {
    const { built, bad } = packBuilt(e.pack);
    add(built, bad);
  }
  return { descriptors, fit, issues };
}
