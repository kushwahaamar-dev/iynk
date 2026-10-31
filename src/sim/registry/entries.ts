import busI2c1 from "./data/bus-i2c-1.json" with { type: "json" };
import busSpi1 from "./data/bus-spi-1.json" with { type: "json" };
import busSpiUnmodelled1 from "./data/bus-spi.unmodelled-1.json" with { type: "json" };
import busUart1 from "./data/bus-uart-1.json" with { type: "json" };
import busUartUnmodelled1 from "./data/bus-uart.unmodelled-1.json" with { type: "json" };
import deviceBme280Regs1 from "./data/device-bme280.regs-1.json" with { type: "json" };
import deviceLcd16021 from "./data/device-lcd1602-1.json" with { type: "json" };
import deviceMpu60501 from "./data/device-mpu6050-1.json" with { type: "json" };
import deviceMpu6050Regs1 from "./data/device-mpu6050.regs-1.json" with { type: "json" };
import devicePca96851 from "./data/device-pca9685-1.json" with { type: "json" };
import deviceSsd13061 from "./data/device-ssd1306-1.json" with { type: "json" };
import engineAvr100 from "./data/engine-avr-1.0.0.json" with { type: "json" };
import engineMnaDcPwl from "./data/engine-mna-dc-pwl.json" with { type: "json" };
import engineMnaNewton100 from "./data/engine-mna-newton-1.0.0.json" with { type: "json" };
import failureDiodeOvercurrent1 from "./data/failure-diode-overcurrent-1.json" with { type: "json" };
import failureLedOvercurrent1 from "./data/failure-led-overcurrent-1.json" with { type: "json" };
import failureNpnOverheat1 from "./data/failure-npn-overheat-1.json" with { type: "json" };
import failurePinOvercurrent1 from "./data/failure-pin-overcurrent-1.json" with { type: "json" };
import failurePotTrackOverpower1 from "./data/failure-pot-track-overpower-1.json" with { type: "json" };
import failureTmp36Overvoltage1 from "./data/failure-tmp36-overvoltage-1.json" with { type: "json" };
import flightGame from "./data/flight-game.json" with { type: "json" };
import ledPwl from "./data/led-pwl.json" with { type: "json" };
import libraryAdafruitBme2801 from "./data/library-adafruit-bme280-1.json" with { type: "json" };
import modelButtonSwitch1 from "./data/model-button.switch-1.json" with { type: "json" };
import modelBuzzerRule1 from "./data/model-buzzer.rule-1.json" with { type: "json" };
import modelDiodePwl1 from "./data/model-diode.pwl-1.json" with { type: "json" };
import modelMotorSteady1 from "./data/model-motor.steady-1.json" with { type: "json" };
import modelNpnPwl1 from "./data/model-npn.pwl-1.json" with { type: "json" };
import modelPotLinear1 from "./data/model-pot.linear-1.json" with { type: "json" };
import modelResistorLinear1 from "./data/model-resistor.linear-1.json" with { type: "json" };
import modelServoRule1 from "./data/model-servo.rule-1.json" with { type: "json" };
import modelSourceThevenin1 from "./data/model-source.thevenin-1.json" with { type: "json" };
import modelStepperCoilResistive1 from "./data/model-stepper-coil.resistive-1.json" with { type: "json" };
import modelTmp36Rule1 from "./data/model-tmp36.rule-1.json" with { type: "json" };
import opticalPowerLawBrightness1 from "./data/optical-power-law-brightness-1.json" with { type: "json" };
import partBreadboardHalf1 from "./data/part-breadboard-half-1.json" with { type: "json" };
import partUnoR31 from "./data/part-uno-r3-1.json" with { type: "json" };
import ruleBrownoutThreshold1 from "./data/rule-brownout-threshold-1.json" with { type: "json" };
import ruleRegulatorDropout1 from "./data/rule-regulator-dropout-1.json" with { type: "json" };
import ruleUsbDroop1 from "./data/rule-usb-droop-1.json" with { type: "json" };
import ruleUsbSag1 from "./data/rule-usb-sag-1.json" with { type: "json" };
import runtimeArduinoSubset from "./data/runtime-arduino-subset.json" with { type: "json" };
import runtimeDmath1 from "./data/runtime-dmath-1.json" with { type: "json" };
import runtimeMicrobitRuntime1 from "./data/runtime-microbit-runtime-1.json" with { type: "json" };
import runtimeMicropythonSubset1 from "./data/runtime-micropython-subset-1.json" with { type: "json" };
import runtimePiApiMock1 from "./data/runtime-pi-api-mock-1.json" with { type: "json" };
import runtimeVerilog2state1 from "./data/runtime-verilog-2state-1.json" with { type: "json" };
import boardPowerData from "./data/board-power.json" with { type: "json" };
import { BJT_PARAMS, MOS_PARAMS } from "../analog/devices/params.ts";
import type { CitedParams } from "../analog/devices/params.ts";
import { SENSORS } from "../env/sensors.ts";
import type { BoardPowerModel } from "./power-models.ts";
import { checkEntry } from "./tiers.ts";
import { KINDS, LAYERS, STATUSES, TIERS } from "./types.ts";
import type { FidelityEntry, Kind, ParameterSource, Registry } from "./types.ts";

export { ID_ENGINE, ID_MODEL } from "./tiers.ts";

const DATA: readonly unknown[] = [
  busI2c1,
  busSpi1,
  busSpiUnmodelled1,
  busUart1,
  busUartUnmodelled1,
  deviceBme280Regs1,
  deviceLcd16021,
  deviceMpu60501,
  deviceMpu6050Regs1,
  devicePca96851,
  deviceSsd13061,
  engineAvr100,
  engineMnaDcPwl,
  engineMnaNewton100,
  failureDiodeOvercurrent1,
  failureLedOvercurrent1,
  failureNpnOverheat1,
  failurePinOvercurrent1,
  failurePotTrackOverpower1,
  failureTmp36Overvoltage1,
  flightGame,
  ledPwl,
  libraryAdafruitBme2801,
  modelButtonSwitch1,
  modelBuzzerRule1,
  modelDiodePwl1,
  modelMotorSteady1,
  modelNpnPwl1,
  modelPotLinear1,
  modelResistorLinear1,
  modelServoRule1,
  modelSourceThevenin1,
  modelStepperCoilResistive1,
  modelTmp36Rule1,
  opticalPowerLawBrightness1,
  partBreadboardHalf1,
  partUnoR31,
  ruleBrownoutThreshold1,
  ruleRegulatorDropout1,
  ruleUsbDroop1,
  ruleUsbSag1,
  runtimeArduinoSubset,
  runtimeDmath1,
  runtimeMicrobitRuntime1,
  runtimeMicropythonSubset1,
  runtimePiApiMock1,
  runtimeVerilog2state1,
];

const DATE = "2026-10-30";
const TIER_LABEL = { chip: "fidelity.tier.T0", summary: "fidelity.summary" };

const phenomenon = (id: string, text: string) => ({ id, text });

function boardPowerEntry(m: BoardPowerModel): FidelityEntry {
  const assumed = m.parameterSources.some((p) => p.type === "assumption");
  return {
    id: m.id,
    version: "1.0.0",
    kind: "rule",
    title: "ESP32 DevKitC power: USB, regulator and brown-out",
    tier: "T1",
    layers: ["L3"],
    implements: [
      phenomenon("sources", `Supply from ${m.sources.map((s) => s.id).join(", ")}`),
      phenomenon("regulator", `Linear regulator to ${m.regulator.voutVolts} V with ${m.regulator.dropoutVolts} V dropout`),
      phenomenon("brownout", `The chip resets below ${m.brownout.thresholdVolts} V, with ${m.brownout.hysteresisVolts} V hysteresis`),
    ],
    mocked: [],
    unsupported: m.notModelled.map((text) => phenomenon(text.replace(/\W+/g, "-"), text)),
    parameterSources: m.parameterSources,
    validation: [
      {
        id: "power-models-tests",
        kind: "self-consistency",
        dataset: "src/sim/registry/power-models.test.ts",
        result: { n: 5, passed: 5, metric: "tests", worst: 0, unit: "count" },
        date: DATE,
        engineVersion: "src/sim/registry@68b0cf8",
        status: "pass",
      },
    ],
    errorMetrics: [],
    operatingRange: m.sources.flatMap((s) =>
      s.minV !== undefined && s.maxV !== undefined ? [{ quantity: `${s.id} voltage`, min: s.minV, max: s.maxV, unit: "V", evidence: m.source }] : [],
    ),
    knownFailureCases: ["The source levels and thresholds come from the board figure and are not cited to a datasheet"],
    performance: [],
    labels: { chip: "fidelity.tier.T1", summary: assumed ? "fidelity.summary.assumed" : "fidelity.summary" },
    status: "active",
  };
}

function sensorEntries(): FidelityEntry[] {
  return Object.values(SENSORS).map((s) => ({
    id: `sensor:${s.id}@1`,
    version: "1.0.0",
    kind: "sensor",
    title: `${s.quantity} sensor model: ${s.id}`,
    tier: "T0",
    layers: ["L9"],
    implements: [phenomenon("transfer", s.text)],
    mocked: [],
    unsupported: [phenomenon("variation", "Part-to-part spread, ageing and temperature effects")],
    parameterSources: [],
    validation: [],
    errorMetrics: [],
    operatingRange: [{ quantity: s.quantity, min: s.range[0], max: s.range[1], unit: s.unit, evidence: "src/sim/env/sensors.ts" }],
    knownFailureCases: ["No test in the repository compares this transfer curve with a datasheet"],
    performance: [],
    labels: TIER_LABEL,
    status: "active",
  }));
}

const SOURCE_TYPE = { datasheet: "datasheet", "spice-model": "datasheet", measured: "measurement", assumed: "assumption" } as const;

function paramSetEntries(family: "bjt" | "mos", sets: Record<string, CitedParams<object>>): FidelityEntry[] {
  return Object.values(sets).map((set) => {
    const parameterSources: ParameterSource[] = Object.entries(set.params).map(([param, value]) => ({
      param,
      value: value as number | string,
      type: SOURCE_TYPE[set.source.kind],
      ref: set.source.title,
    }));
    return {
      id: `model:${family}.${set.id}@1`,
      version: "1.0.0",
      kind: "part-model",
      title: `${set.id} ${family === "bjt" ? "bipolar transistor" : "MOSFET"} parameter set`,
      tier: "T0",
      layers: ["L4"],
      implements: [phenomenon("params", `The ${family === "bjt" ? "Gummel-Poon" : "MOSFET"} numbers the Newton solver uses for this part`)],
      mocked: [],
      unsupported: [phenomenon("temperature", "Temperature dependence of the parameters")],
      parameterSources,
      validation: [],
      errorMetrics: [],
      operatingRange: [],
      knownFailureCases: ["No test in the repository compares this part with a reference yet"],
      performance: [],
      labels: { chip: "fidelity.tier.T0", summary: parameterSources.some((p) => p.type === "assumption") ? "fidelity.summary.assumed" : "fidelity.summary" },
      status: "active",
    };
  });
}

/** The data rows plus the rows derived from board power, sensor and parameter tables, which stay the single source for their numbers. */
export function allEntries(): FidelityEntry[] {
  return [
    ...(DATA as FidelityEntry[]),
    ...(boardPowerData as BoardPowerModel[]).map(boardPowerEntry),
    ...sensorEntries(),
    ...paramSetEntries("bjt", BJT_PARAMS),
    ...paramSetEntries("mos", MOS_PARAMS),
  ];
}

const LIST_FIELDS = ["implements", "mocked", "unsupported", "parameterSources", "validation", "errorMetrics", "operatingRange", "knownFailureCases", "performance"] as const;

export class RegistryError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`fidelity registry has ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n${problems.join("\n")}`);
    this.name = "RegistryError";
    this.problems = problems;
  }
}

const isText = (value: unknown): value is string => typeof value === "string" && value !== "";
const oneOf = (list: readonly string[], value: unknown): boolean => typeof value === "string" && list.includes(value);

/** What `checkEntry` and the index rely on; anything else in the entry is the author's to get right. */
function shapeProblems(raw: unknown, at: number): string[] {
  if (typeof raw !== "object" || raw === null) return [`entry ${at}: not an object`];
  const e = raw as Record<string, unknown>;
  const name = isText(e.id) ? e.id : `entry ${at}`;
  const problems: string[] = [];
  for (const field of ["id", "version", "title"] as const) if (!isText(e[field])) problems.push(`${name}: ${field} must be a non-empty string`);
  if (!oneOf(TIERS, e.tier)) problems.push(`${name}: tier must be one of ${TIERS.join(", ")}`);
  if (!oneOf(KINDS, e.kind)) problems.push(`${name}: kind must be one of ${KINDS.join(", ")}`);
  if (!oneOf(STATUSES, e.status)) problems.push(`${name}: status must be one of ${STATUSES.join(", ")}`);
  if (!Array.isArray(e.layers) || !e.layers.every((layer) => oneOf(LAYERS, layer))) problems.push(`${name}: layers must be a list of ${LAYERS[0]} to ${LAYERS[LAYERS.length - 1]}`);
  for (const field of LIST_FIELDS) if (!Array.isArray(e[field])) problems.push(`${name}: ${field} must be a list`);
  const labels = e.labels as Record<string, unknown> | null | undefined;
  if (!isText(labels?.chip) || !isText(labels?.summary)) problems.push(`${name}: labels.chip and labels.summary must be non-empty strings`);
  if (e.supersedes !== undefined && !isText(e.supersedes)) problems.push(`${name}: supersedes must be a non-empty string`);
  return problems;
}

function referenceProblems(entries: readonly FidelityEntry[], knownKeys: ReadonlySet<string> | undefined): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const e of entries) {
    if (ids.has(e.id)) problems.push(`${e.id}: id is used twice`);
    ids.add(e.id);
  }
  for (const e of entries) {
    if (e.supersedes !== undefined && !ids.has(e.supersedes)) problems.push(`${e.id}: supersedes ${e.supersedes}, which is not an entry`);
    if (!knownKeys) continue;
    for (const key of [e.labels.chip, e.labels.summary]) if (!knownKeys.has(key)) problems.push(`${e.id}: label key ${key} is not in the copy`);
  }
  return problems;
}

/** Validates the entries and returns a read-only index. Label keys are checked only when `knownKeys` is given. */
export function loadRegistry(raw: readonly unknown[] = allEntries(), o: { knownKeys?: ReadonlySet<string> } = {}): Registry {
  const shape = raw.flatMap(shapeProblems);
  if (shape.length > 0) throw new RegistryError(shape);
  const entries = raw as readonly FidelityEntry[];
  const problems = [...entries.flatMap(checkEntry), ...referenceProblems(entries, o.knownKeys)];
  if (problems.length > 0) throw new RegistryError(problems);
  const byId = new Map(entries.map((e) => [e.id, e]));
  return {
    get: (id) => byId.get(id),
    all: () => entries,
    byKind: (kind: Kind) => entries.filter((e) => e.kind === kind),
  };
}
