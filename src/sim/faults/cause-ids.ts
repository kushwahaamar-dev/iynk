import { EXTENSION_CAUSE_ID } from "../../project/diagnosis.ts";

/** The closed list of core cause ids: the table in SIMULATION 13.4, in its order. */
export const CORE_CAUSE_IDS = [
  "led-no-series-resistor",
  "led-reversed",
  "output-contention",
  "supply-shorted-to-ground",
  "floating-input",
  "part-not-powered",
  "button-no-pulldown",
  "open-connection",
  "swapped-pins",
  "wrong-value",
  "missing-ground",
  "wrong-pin-in-code",
  "i2c-missing-pullup",
  "bus-device-not-modelled",
  "library-not-modelled",
  "pin-overcurrent",
  "brownout",
  "motor-stall",
  "reverse-polarity",
  "motor-direction-reversed",
  "encoder-channel-swapped",
  "wheel-slip",
  "driver-undersized",
  "battery-sag-reset",
  "sensor-too-high",
  "sensor-saturated",
  "ranger-beam-blocked",
  "tip-over",
  "loop-too-slow",
  "servo-jitter-supply",
  "stepper-lost-steps",
  "hover-throttle-too-high",
  "thrust-to-weight-low",
  "esc-overcurrent",
  "battery-overcurrent",
  "prop-clash",
  "cg-offset",
  "props-swapped",
  "fc-orientation-wrong",
  "esc-desync",
  "motor-out",
  "controller-oscillation",
  "gps-lost",
  "link-lost",
  "sensor-drift",
] as const;

export type CoreCauseId = (typeof CORE_CAUSE_IDS)[number];

const CORE: ReadonlySet<string> = new Set(CORE_CAUSE_IDS);

export function isCoreCauseId(id: string): id is CoreCauseId {
  return CORE.has(id);
}

/** A core id, or an extension id `x-<kebab>`. */
export function isCauseId(id: string): boolean {
  return CORE.has(id) || EXTENSION_CAUSE_ID.test(id);
}
