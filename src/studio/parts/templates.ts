import type { GoldenFixture } from "../../parts/golden.ts";
import type { Unit } from "../../parts/generated/types.ts";
import type { LogicLayerModel } from "../../sim/models/logic.ts";
import type { ModelEnv } from "../../sim/models/kinds.ts";
import { DRAFT_LIMITS } from "./draft.ts";
import type { DraftPin, PartDraft, TemplateId } from "./draft.ts";

type Json = Record<string, unknown>;

export type LogicRow = LogicLayerModel["table"][number];

export interface TemplateParams {
  "resistor-like": { ohms: number };
  switch: { momentary: boolean };
  "led-like": { vf: number; imaxA: number };
  "truth-table": { inputs: string[]; outputs: string[]; rows: LogicRow[]; delayNs: number; driveOhms: number };
  "analog-sensor": { channelUnit: Unit; min: number; max: number };
  "not-modelled": { reason: string };
}

export type TemplateChoice = { [K in TemplateId]: { id: K; params: TemplateParams[K] } }[TemplateId];

export type ParamProblem =
  | { code: "range"; field: string; min: number; max: number }
  | { code: "pins"; need: number }
  | { code: "empty"; field: "inputs" | "outputs" | "rows" }
  | { code: "tooMany"; field: "inputs" | "outputs" | "rows"; max: number }
  | { code: "overlap" }
  | { code: "order" }
  | { code: "reason" };

export const TEMPLATE_IDS: readonly TemplateId[] = ["resistor-like", "switch", "led-like", "truth-table", "analog-sensor", "not-modelled"];
export const SENSOR_UNITS: readonly Unit[] = ["degC", "lux", "g0", "rad_per_s", "mm", "percent", "Hz", "V"];
export const SET_BY_YOU = "set by you, not checked against a datasheet";
export const LOGIC_PINS_MAX = 8;

const RANGES = {
  ohms: [0.001, 1e9],
  vf: [0.1, 10],
  imaxA: [1e-6, 10],
  delayNs: [0, 1e9],
  driveOhms: [0.1, 1e6],
  min: [-1e6, 1e6],
  max: [-1e6, 1e6],
} as const;

const TEST_ID = "template_check";
const TEST_FILE = "tests/template.json";
const INPUT_CHANNEL = "input";
const DRIVE_KEY = "drive_resistance";
const NOT_SET = "Anything this form does not set.";
const SUPPLY_V = 5;
const SERIES_OHM = 1000;
const LED_SLOPE_OHM = 0.5;

const ELEMENT_OF: Partial<Record<TemplateId, string>> = {
  "resistor-like": "res",
  switch: "button",
  "led-like": "led",
  "analog-sensor": "sensor",
};

const OWNED_RATINGS: ReadonlySet<string> = new Set(["resistance_nominal", "forward_voltage", "forward_current_max", DRIVE_KEY]);
const OWNED_PARAMETERS: ReadonlySet<string> = new Set(["ohms", "momentary"]);
const OWNED_GAPS: ReadonlySet<string> = new Set(["fixed_led_slope", "fixed_sensor_output"]);

export function defaultParams(): TemplateParams {
  return {
    "resistor-like": { ohms: 220 },
    switch: { momentary: true },
    "led-like": { vf: 2, imaxA: 0.02 },
    "truth-table": { inputs: [], outputs: [], rows: [], delayNs: 0, driveOhms: 25 },
    "analog-sensor": { channelUnit: "degC", min: -40, max: 125 },
    "not-modelled": { reason: "" },
  };
}

/** The form's values for a draft: what its template holds, over the defaults. */
export function paramsFrom(template: PartDraft["template"]): TemplateParams {
  const params = defaultParams();
  if (template && typeof template.params === "object" && template.params !== null) {
    Object.assign(params[template.id], template.params);
  }
  return params;
}

export function availableTemplates(env: ModelEnv): TemplateId[] {
  return TEMPLATE_IDS.filter((id) => {
    const element = ELEMENT_OF[id];
    return element === undefined || env.solverElements.has(element);
  });
}

const finite = (n: number): boolean => Number.isFinite(n);

function rangeProblem(field: keyof typeof RANGES, value: number): ParamProblem[] {
  const [min, max] = RANGES[field];
  return finite(value) && value >= min && value <= max ? [] : [{ code: "range", field, min, max }];
}

export function pinsNeeded(t: TemplateChoice): number {
  switch (t.id) {
    case "resistor-like":
    case "switch":
    case "led-like":
      return 2;
    case "analog-sensor":
      return 3;
    default:
      return 0;
  }
}

/** Why the form's values cannot be written yet. Empty when they can. */
export function templateProblems(d: PartDraft, t: TemplateChoice): ParamProblem[] {
  const out: ParamProblem[] = [];
  if (d.pins.length < pinsNeeded(t)) out.push({ code: "pins", need: pinsNeeded(t) });
  switch (t.id) {
    case "resistor-like":
      out.push(...rangeProblem("ohms", t.params.ohms));
      break;
    case "led-like":
      out.push(...rangeProblem("vf", t.params.vf), ...rangeProblem("imaxA", t.params.imaxA));
      break;
    case "analog-sensor": {
      const { min, max } = t.params;
      out.push(...rangeProblem("min", min), ...rangeProblem("max", max));
      if (finite(min) && finite(max) && min >= max) out.push({ code: "order" });
      break;
    }
    case "truth-table": {
      const { inputs, outputs, rows, delayNs, driveOhms } = t.params;
      if (inputs.length === 0) out.push({ code: "empty", field: "inputs" });
      if (outputs.length === 0) out.push({ code: "empty", field: "outputs" });
      if (inputs.length > LOGIC_PINS_MAX) out.push({ code: "tooMany", field: "inputs", max: LOGIC_PINS_MAX });
      if (outputs.length > LOGIC_PINS_MAX) out.push({ code: "tooMany", field: "outputs", max: LOGIC_PINS_MAX });
      if (inputs.some((id) => outputs.includes(id))) out.push({ code: "overlap" });
      if (rows.length === 0) out.push({ code: "empty", field: "rows" });
      if (rows.length > DRAFT_LIMITS.tableRows) out.push({ code: "tooMany", field: "rows", max: DRAFT_LIMITS.tableRows });
      out.push(...rangeProblem("delayNs", delayNs), ...rangeProblem("driveOhms", driveOhms));
      break;
    }
    case "not-modelled":
      if (t.params.reason.trim() === "") out.push({ code: "reason" });
      break;
    case "switch":
      break;
  }
  return out;
}

/** Hands out pins by polarity first, then in the order the part lists them. */
function assignPins(pins: readonly DraftPin[], polarities: readonly (DraftPin["polarity"] | undefined)[]): string[] {
  const taken = new Set<string>();
  const chosen = polarities.map((polarity) => {
    const hit = polarity === undefined ? undefined : pins.find((p) => p.polarity === polarity && !taken.has(p.id));
    if (hit) taken.add(hit.id);
    return hit?.id;
  });
  return chosen.map((id) => {
    if (id !== undefined) return id;
    const next = pins.find((p) => !taken.has(p.id));
    if (!next) return "";
    taken.add(next.id);
    return next.id;
  });
}

const text = (en: string): Json => ({ en });

function assumed(unit: Unit, value: number, measure: string, role: string, description: string): Json {
  return {
    measure,
    role,
    description: text(description),
    scope: { part: true },
    simulation: { unit, value, rationale: text(SET_BY_YOU), confidence: "low" },
    used_by_model: "simulation",
  };
}

const fromRating = (key: string): Json => ({ from_rating: key, pick: "value" });

interface Built {
  layer: Json;
  ratings: Record<string, Json>;
  parameters: Json[];
  channels: Json[];
  models: string[];
  notModelled: string[];
  gaps: Json[];
  requires: string[];
  runnable: boolean;
}

function build(d: PartDraft, t: TemplateChoice): Built {
  const base = { ratings: {}, parameters: [], channels: [], gaps: [], runnable: true };
  switch (t.id) {
    case "resistor-like": {
      const [a, b] = assignPins(d.pins, [undefined, undefined]);
      return {
        ...base,
        layer: { id: "main", domain: "analog", reads: [a, b], model: { kind: "element", element: "res", terminals: { a, b }, params: { ohms: fromRating("resistance_nominal") } } },
        ratings: { resistance_nominal: assumed("ohm", t.params.ohms, "resistance", "characteristic", "The resistance between the two pins.") },
        parameters: [{ id: "ohms", name: text("Resistance"), kind: "setting", type: "number", default: t.params.ohms, min: RANGES.ohms[0], max: RANGES.ohms[1], unit: "ohm", affects: ["main"] }],
        models: ["A linear resistance between the two pins, set from the resistance you gave."],
        notModelled: ["Tolerance, temperature drift, power rating and burn-out."],
        requires: ["res"],
      };
    }
    case "switch": {
      const [a, b] = assignPins(d.pins, [undefined, undefined]);
      return {
        ...base,
        layer: { id: "main", domain: "analog", reads: [a, b], model: { kind: "element", element: "button", terminals: { a1: a, a2: a, b1: b, b2: b } } },
        parameters: [{ id: "momentary", name: text("Springs back when released"), kind: "build-option", type: "boolean", default: t.params.momentary, affects: ["main"] }],
        models: [t.params.momentary ? "A switch that joins its two pins while it is pressed." : "A switch that joins its two pins while it is on."],
        notModelled: ["Contact bounce, contact resistance and current limits."],
        requires: ["button"],
      };
    }
    case "led-like": {
      const [anode, cathode] = assignPins(d.pins, ["anode", "cathode"]);
      return {
        ...base,
        layer: {
          id: "main",
          domain: "analog",
          reads: [anode, cathode],
          model: {
            kind: "element",
            element: "led",
            terminals: { anode, cathode },
            params: {
              vf: fromRating("forward_voltage"),
              rd: { value: LED_SLOPE_OHM, unit: "ohm", rationale: text("The solver gives every diode the same slope above its forward voltage.") },
              imax: fromRating("forward_current_max"),
            },
          },
        },
        ratings: {
          forward_voltage: assumed("V", t.params.vf, "voltage", "characteristic", "The voltage across the part when it conducts."),
          forward_current_max: assumed("A", t.params.imaxA, "current", "abs_max", "The highest steady current the part is meant to carry."),
        },
        models: ["A diode that conducts above the forward voltage you gave, with a small series resistance."],
        notModelled: ["Brightness, colour, temperature drift and part-to-part spread."],
        gaps: [{ id: "fixed_led_slope", text: text("The solver gives every LED a fixed 0.5 ohm slope above its forward voltage."), evidence: "figures/engine/bench-solve.js:102" }],
        requires: ["led"],
      };
    }
    case "truth-table": {
      const { inputs, outputs, rows, delayNs, driveOhms } = t.params;
      const table = rows.map((row) => ({
        when: Object.fromEntries(inputs.map((name) => [name, row.when[name] ?? "x"])),
        then: Object.fromEntries(outputs.map((name) => [name, row.then[name] ?? "z"])),
      }));
      return {
        ...base,
        layer: {
          id: "main",
          domain: "digital",
          reads: inputs,
          drives: outputs,
          model: { kind: "logic", inputs, outputs, table, ...(delayNs > 0 && { delay: { unit: "s", value: delayNs / 1e9 } }), output_drive: DRIVE_KEY },
        },
        ratings: { [DRIVE_KEY]: assumed("ohm", driveOhms, "resistance", "characteristic", "The resistance each output drives with.") },
        models: ["Outputs that follow the inputs by the rows of your table, the first matching row winning."],
        notModelled: ["Memory: a table has no stored state, so flip-flops and counters are not covered.", "Timing beyond the one fixed delay."],
        requires: [],
      };
    }
    case "analog-sensor": {
      const [supplyPos, supplyNeg, out] = assignPins(d.pins, ["positive", "negative", undefined]);
      return {
        ...base,
        layer: {
          id: "main",
          domain: "analog",
          reads: [supplyPos, supplyNeg, INPUT_CHANNEL],
          drives: [out],
          model: { kind: "element", element: "sensor", terminals: { supply_pos: supplyPos, supply_neg: supplyNeg, out } },
        },
        channels: [{ id: INPUT_CHANNEL, name: text("Value at the sensor"), unit: t.params.channelUnit, range: { min: t.params.min, max: t.params.max } }],
        models: ["A sensor with a supply pair and one output pin, held at the solver's fixed output while the supply is in range."],
        notModelled: ["An output that follows the value of the channel you named."],
        gaps: [{ id: "fixed_sensor_output", text: text("The solver holds a fixed output voltage; it does not follow the channel yet.") }],
        requires: ["sensor"],
      };
    }
    case "not-modelled":
      return {
        ...base,
        layer: { id: "main", domain: "analog", model: { kind: "none", reason: text(t.params.reason.trim()) } },
        models: [],
        notModelled: ["Everything about how this part behaves."],
        requires: [],
        runnable: false,
      };
  }
}

function fixtureFor(d: PartDraft, t: TemplateChoice): GoldenFixture | null {
  const common = { id: TEST_ID };
  switch (t.id) {
    case "resistor-like": {
      const { ohms } = t.params;
      return {
        ...common,
        kind: "golden-trace",
        shape: "series2",
        description: `${SUPPLY_V} V across the part in series with ${SERIES_OHM} ohm.`,
        circuit: { supply_v: SUPPLY_V, series_ohm: SERIES_OHM },
        expect: [{ quantity: "i_a", value: SUPPLY_V / (ohms + SERIES_OHM), tol: { rel: 0.01 } }],
        derivation: `I = V / (R + Rs) = ${SUPPLY_V} / (${ohms} + ${SERIES_OHM})`,
      };
    }
    case "led-like": {
      const { vf, imaxA } = t.params;
      const supply = Math.max(SUPPLY_V, vf + 2);
      const series = Number(((supply - vf) / imaxA).toPrecision(6));
      return {
        ...common,
        kind: "golden-trace",
        shape: "series2",
        description: `${supply} V across the part in series with ${series} ohm.`,
        circuit: { supply_v: supply, series_ohm: series },
        expect: [{ quantity: "i_a", value: (supply - vf) / (series + LED_SLOPE_OHM), tol: { rel: 0.01 } }],
        derivation: `I = (V - vf) / (Rs + ${LED_SLOPE_OHM}) = (${supply} - ${vf}) / (${series} + ${LED_SLOPE_OHM}), within 1 percent so the fixed slope does not matter`,
      };
    }
    case "truth-table":
      return {
        ...common,
        kind: "conformance",
        shape: "none",
        description: `The layer of ${d.name || "this part"} resolves, its terminals are pins, and every row gives the outputs it lists.`,
        checks: ["layers-resolve", "terminals-are-pins", "logic-rows"],
        derivation: "The rows of the table the form holds.",
      };
    case "switch":
    case "analog-sensor":
      return {
        ...common,
        kind: "conformance",
        shape: "none",
        description: `The layer of ${d.name || "this part"} resolves and its terminals are pins of the part.`,
        checks: ["layers-resolve", "terminals-are-pins"],
        derivation: "The layer the template wrote and the pins the part lists.",
      };
    case "not-modelled":
      return null;
  }
}

/** The golden test the template writes beside the part. `null` for a part that is not modelled. */
export function templateFixture(d: PartDraft, t: TemplateChoice): { file: string; fixture: GoldenFixture } | null {
  const fixture = fixtureFor(d, t);
  return fixture && { file: TEST_FILE, fixture };
}

/**
 * What the draft becomes when the template is chosen. The layer, the test and the ratings the templates own are replaced;
 * ratings and tests the person added by hand stay.
 */
export function applyTemplate(d: PartDraft, t: TemplateChoice): Partial<PartDraft> {
  const built = build(d, t);
  const fixture = templateFixture(d, t);
  const keptFiles = Object.fromEntries(Object.entries(d.testFiles).filter(([file]) => file !== TEST_FILE));
  const extra: Record<string, unknown> = { ...d.extra };
  const channels = Array.isArray(extra.physical_inputs) ? extra.physical_inputs.filter((c) => !(typeof c === "object" && c !== null && (c as Json).id === INPUT_CHANNEL)) : [];
  const allChannels = [...channels, ...built.channels];
  if (allChannels.length > 0) extra.physical_inputs = allChannels;
  else delete extra.physical_inputs;

  const idOf = (item: unknown): unknown => (typeof item === "object" && item !== null ? (item as Json).id : undefined);
  return {
    ratings: { ...Object.fromEntries(Object.entries(d.ratings).filter(([key]) => !OWNED_RATINGS.has(key))), ...built.ratings },
    parameters: [...d.parameters.filter((p) => !OWNED_PARAMETERS.has(String(idOf(p)))), ...built.parameters],
    layers: [built.layer],
    tests: [
      ...d.tests.filter((x) => idOf(x) !== TEST_ID),
      ...(fixture ? [{ id: TEST_ID, kind: fixture.fixture.kind, file: fixture.file, state: "present" }] : []),
    ],
    testFiles: fixture ? { ...keptFiles, [fixture.file]: JSON.stringify(fixture.fixture, null, 2) } : keptFiles,
    simulation: {
      ...d.simulation,
      tier: built.runnable ? "T1" : "none",
      status: built.runnable ? "partly-modelled" : "not-modelled-yet",
      whatItModels: built.models,
      notModelled: [...built.notModelled, NOT_SET],
      knownGaps: [...d.simulation.knownGaps.filter((g) => !OWNED_GAPS.has(String(idOf(g)))), ...built.gaps],
      solverRequires: built.requires,
    },
    extra,
    template: { id: t.id, params: t.params },
  };
}

const matches = (row: LogicRow, inputs: readonly string[], combo: number): boolean =>
  inputs.every((name, i) => {
    const wanted = row.when[name] ?? "x";
    return wanted === "x" || wanted === ((combo >> (inputs.length - 1 - i)) & 1);
  });

/** Adds a row, with outputs `z`, for every input combination no row matches. Stops at the row limit. */
export function completeTable(inputs: readonly string[], outputs: readonly string[], rows: readonly LogicRow[]): LogicRow[] {
  const out = [...rows];
  for (let combo = 0; combo < 2 ** inputs.length && out.length < DRAFT_LIMITS.tableRows; combo++) {
    if (rows.some((row) => matches(row, inputs, combo))) continue;
    out.push({
      when: Object.fromEntries(inputs.map((name, i) => [name, ((combo >> (inputs.length - 1 - i)) & 1) as 0 | 1])),
      then: Object.fromEntries(outputs.map((name) => [name, "z" as const])),
    });
  }
  return out;
}
