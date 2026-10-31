import { CORE_CAUSE_IDS, type CoreCauseId } from "./cause-ids.ts";
import { allRules } from "./rules.ts";
import type { SymptomId } from "./symptoms.ts";
import type { CauseId, RuleLayer } from "./types.ts";

export type CauseFamily = "wiring" | "power" | "code" | "bus" | "value" | "mechanical" | "flight";
export type CauseSeat = "SIM" | "ROB" | "DRN";
export type CauseLayer = "L3" | "L4" | "L5" | "L6" | "L7" | "L8" | "L9" | "static";

export interface CauseMeta {
  id: CoreCauseId;
  family: CauseFamily;
  seat: CauseSeat;
  /** The first layer SIMULATION 13.4 lists for the cause. */
  layer: CauseLayer;
  /** Causes a learner can mistake this one for (EDUCATION 6.7). Always symmetric. */
  confusableWith: CoreCauseId[];
  symptomIds: SymptomId[];
  /** False for the robot and drone causes until B16 to B19 add their models. */
  modelled: boolean;
  /** The i18n namespace of the cause's hint texts. Defaults to `faults`. */
  textNs?: "faults" | "robot";
}

type Row = Omit<CauseMeta, "id" | "confusableWith">;

const row = (family: CauseFamily, seat: CauseSeat, layer: CauseLayer, symptomIds: SymptomId[], modelled = true): Row => ({
  family,
  seat,
  layer,
  symptomIds,
  modelled,
});

const sim = (family: CauseFamily, layer: CauseLayer, symptomIds: SymptomId[]): Row => row(family, "SIM", layer, symptomIds);
const rob = (family: CauseFamily, layer: CauseLayer, symptomIds: SymptomId[] = []): Row => ({
  ...row(family, "ROB", layer, symptomIds, symptomIds.length > 0),
  textNs: "robot",
});
const drn = (family: CauseFamily, layer: CauseLayer): Row => row(family, "DRN", layer, [], false);

const ROWS: Record<CoreCauseId, Row> = {
  "led-no-series-resistor": sim("value", "L4", ["led-burnt", "pin-overloaded"]),
  "led-reversed": sim("wiring", "L4", ["led-dark"]),
  "output-contention": sim("wiring", "L3", ["pin-level-wrong", "part-hot"]),
  "supply-shorted-to-ground": sim("wiring", "L4", ["supply-collapses", "part-hot"]),
  "floating-input": sim("wiring", "L3", ["reading-erratic", "button-erratic", "pin-level-wrong"]),
  "part-not-powered": sim("power", "L4", ["part-dead", "led-dark"]),
  "button-no-pulldown": sim("wiring", "L3", ["button-erratic"]),
  "open-connection": sim("wiring", "static", ["part-dead", "led-dark"]),
  "swapped-pins": sim("wiring", "static", ["i2c-no-ack", "part-dead"]),
  "wrong-value": sim("value", "L4", ["led-dim", "pin-level-wrong"]),
  "missing-ground": sim("power", "static", ["part-dead", "led-dark"]),
  "wrong-pin-in-code": sim("code", "L5", ["code-no-effect", "led-dark"]),
  "i2c-missing-pullup": sim("bus", "L6", ["i2c-no-ack"]),
  "bus-device-not-modelled": sim("bus", "L6", ["i2c-no-ack"]),
  "library-not-modelled": sim("code", "L5", ["code-no-effect"]),
  "pin-overcurrent": sim("value", "L4", ["pin-overloaded", "part-hot"]),
  brownout: sim("power", "L4", ["mcu-resets", "supply-collapses"]),
  "motor-stall": rob("mechanical", "L4", ["robot-wont-move"]),
  "reverse-polarity": sim("power", "L4", ["part-dead", "part-hot"]),
  "motor-direction-reversed": rob("mechanical", "L7", ["robot-turns-wrong-way"]),
  "encoder-channel-swapped": rob("mechanical", "L7", ["encoder-count-wrong"]),
  "wheel-slip": rob("mechanical", "L7", ["wheel-spins-no-motion"]),
  "driver-undersized": rob("power", "L4", ["robot-wont-move", "mcu-resets"]),
  "battery-sag-reset": rob("power", "L4", ["robot-resets-at-start", "mcu-resets"]),
  "sensor-too-high": rob("mechanical", "L7", ["line-not-detected"]),
  "sensor-saturated": rob("value", "L9", ["line-not-detected"]),
  "ranger-beam-blocked": rob("mechanical", "L7", ["ranger-always-near"]),
  "tip-over": rob("mechanical", "L7", ["robot-tips-over"]),
  "loop-too-slow": rob("code", "L5", ["speed-oscillates"]),
  "servo-jitter-supply": rob("power", "L4"),
  "stepper-lost-steps": rob("mechanical", "L7"),
  "hover-throttle-too-high": drn("flight", "L8"),
  "thrust-to-weight-low": drn("flight", "L8"),
  "esc-overcurrent": drn("power", "L4"),
  "battery-overcurrent": drn("power", "L4"),
  "prop-clash": drn("flight", "L8"),
  "cg-offset": drn("flight", "L8"),
  "props-swapped": drn("flight", "L8"),
  "fc-orientation-wrong": drn("flight", "L8"),
  "esc-desync": drn("flight", "L8"),
  "motor-out": drn("flight", "L8"),
  "controller-oscillation": drn("flight", "L8"),
  "gps-lost": drn("flight", "L8"),
  "link-lost": drn("flight", "L8"),
  "sensor-drift": drn("flight", "L8"),
};

const CONFUSABLE_SEEDS: readonly (readonly [CoreCauseId, CoreCauseId])[] = [
  ["floating-input", "button-no-pulldown"],
  ["floating-input", "open-connection"],
  ["led-no-series-resistor", "pin-overcurrent"],
  ["output-contention", "supply-shorted-to-ground"],
  ["part-not-powered", "missing-ground"],
  ["part-not-powered", "brownout"],
  ["swapped-pins", "open-connection"],
  ["wrong-pin-in-code", "open-connection"],
  ["motor-stall", "driver-undersized"],
  ["motor-stall", "wheel-slip"],
  ["motor-direction-reversed", "encoder-channel-swapped"],
  ["driver-undersized", "battery-sag-reset"],
  ["battery-sag-reset", "brownout"],
  ["sensor-too-high", "sensor-saturated"],
];

function confusableMap(): Map<CoreCauseId, CoreCauseId[]> {
  const map = new Map<CoreCauseId, CoreCauseId[]>(CORE_CAUSE_IDS.map((id) => [id, []]));
  for (const [a, b] of CONFUSABLE_SEEDS) {
    map.get(a)?.push(b);
    map.get(b)?.push(a);
  }
  return map;
}

const CONFUSABLE = confusableMap();

export const CAUSES: readonly CauseMeta[] = CORE_CAUSE_IDS.map((id) => ({
  id,
  ...ROWS[id],
  confusableWith: CONFUSABLE.get(id) ?? [],
}));

const BY_ID: ReadonlyMap<string, CauseMeta> = new Map(CAUSES.map((meta) => [meta.id, meta]));

export const causeMeta = (id: string): CauseMeta | undefined => BY_ID.get(id);

export type DetectorStatus =
  | { status: RuleLayer; rules: string[] }
  | { status: "diagnostic"; source: string }
  | { status: "not-modelled-yet"; reason: string; phase: string };

const DIAGNOSTIC_SOURCE: Partial<Record<CoreCauseId, string>> = {
  "bus-device-not-modelled": "T-B8-01",
  "library-not-modelled": "T-B8-02",
};

const NOT_MODELLED: Record<Exclude<CauseSeat, "SIM">, { reason: string; phase: string }> = {
  ROB: { reason: "needs the robot physics engine", phase: "B16" },
  DRN: { reason: "needs the drone flight model", phase: "B18" },
};

const LAYER_ORDER: readonly RuleLayer[] = ["static", "code", "solved"];

/** The cheapest layer that detects the cause, or the reason nothing does yet. */
export function detectorStatus(id: CauseId): DetectorStatus {
  const rules = allRules().filter((rule) => rule.enabled && rule.causeId === id);
  for (const layer of LAYER_ORDER) {
    if (rules.some((rule) => rule.layer === layer)) {
      return { status: layer, rules: rules.map((rule) => rule.id).sort() };
    }
  }
  const source = DIAGNOSTIC_SOURCE[id as CoreCauseId];
  if (source !== undefined) return { status: "diagnostic", source };
  const meta = causeMeta(id);
  if (meta !== undefined && meta.seat !== "SIM") return { status: "not-modelled-yet", ...NOT_MODELLED[meta.seat] };
  throw new Error(`cause ${id} has no detector and is not a robot or drone cause`);
}
