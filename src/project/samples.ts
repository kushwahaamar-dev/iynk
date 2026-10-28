import blinkD12 from "./samples/uno-blink-d12.project.json" with { type: "json" };

export const SAMPLE_BLINK_D12_ID = "prj_uno-blink-d12";

/** Uno, a 220 ohm resistor and an LED on D12. Callers pass it through `validateValue` before use. */
export function sampleBlinkD12(): unknown {
  return JSON.parse(JSON.stringify(blinkD12)) as unknown;
}
