import { diag } from "./result.ts";
import type { Diagnostic } from "./result.ts";

/** Size and count limits from the schemas (PDM 9.4, 5.3, 4.2; COMPONENT_SCHEMA 4.1). */
export const LIMITS = Object.freeze({
  canonicalBytes: 5_242_880,
  boards: 16,
  components: 2000,
  nets: 5000,
  connectionsPerNet: 2000,
  views: 16,
  placementsPerView: 2000,
  wiresPerView: 5000,
  junctionsPerView: 5000,
  labelsPerView: 1000,
  sources: 20,
  sourceBytes: 262_144,
  assets: 256,
  assetBytes: 16_777_216,
  containerBytes: 134_217_728,
  parameters: 256,
  tests: 64,
  checksPerTest: 200,
  worldInputs: 128,
  scriptEvents: 10_000,
  faults: 200,
  instruments: 64,
  historyOps: 1000,
  checkpoints: 256,
  opEnvelopeBytes: 65_536,
  jsonDepth: 32,
  interfacePins: 1024,
  interfaceGroups: 256,
  pinsPerGroup: 256,
  interfaceParams: 64,
  descriptorBytes: 262_144,
  layoutAbsMm: 1_000_000,
});

export type LimitName = keyof typeof LIMITS;

const upperSnake = (name: string): string => name.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase();

/** Returns a `V4-<NAME>` error when `value` is above the named limit, else null. */
export function overLimit(name: LimitName, value: number): Diagnostic | null {
  const limit = LIMITS[name];
  if (value <= limit) return null;
  return diag(`V4-${upperSnake(name)}`, "error", "", `${name} is ${value}; the limit is ${limit}`);
}
