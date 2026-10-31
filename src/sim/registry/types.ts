export const TIERS = ["T0", "T1", "T2", "T3"] as const;
export type Tier = (typeof TIERS)[number];

export const LAYERS = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11", "L12"] as const;
export type Layer = (typeof LAYERS)[number];

export const KINDS = ["engine", "part-model", "failure-model", "runtime", "device", "bus", "sensor", "environment", "rule"] as const;
export type Kind = (typeof KINDS)[number];

export const STATUSES = ["active", "planned", "deprecated"] as const;
export type EntryStatus = (typeof STATUSES)[number];

/** `text` is an i18n key or English source. */
export interface Phenomenon {
  id: string;
  text: string;
}

export interface ParameterSource {
  param: string;
  value: number | string;
  unit?: string;
  type: "datasheet" | "fit" | "measurement" | "assumption" | "numerical";
  ref?: string;
  page?: string;
  note?: string;
}

export interface ValidationRecord {
  id: string;
  kind: "oracle" | "bench" | "differential" | "analytic" | "self-consistency";
  oracle?: { name: string; version: string };
  dataset: string;
  flavour?: string;
  result: { n: number; passed: number; metric: string; worst: number; unit: string };
  date: string;
  engineVersion: string;
  status: "pass" | "fail" | "partial" | "none";
  report?: string;
}

export interface ErrorMetric {
  name: string;
  value: number;
  unit: string;
  condition: string;
}

export interface RangeSpec {
  quantity: string;
  min: number;
  max: number;
  unit: string;
  evidence: string;
}

export interface PerfRecord {
  benchId: string;
  metric: string;
  value: number;
  unit: string;
  machine: string;
  load?: string;
  date: string;
  label: "MEASURED" | "ESTIMATED";
}

export interface FidelityEntry {
  id: string;
  version: string;
  kind: Kind;
  title: string;
  tier: Tier;
  layers: Layer[];
  implements: Phenomenon[];
  mocked: Phenomenon[];
  unsupported: Phenomenon[];
  parameterSources: ParameterSource[];
  validation: ValidationRecord[];
  errorMetrics: ErrorMetric[];
  operatingRange: RangeSpec[];
  knownFailureCases: string[];
  performance: PerfRecord[];
  /** i18n keys. */
  labels: { chip: string; summary: string };
  status: EntryStatus;
  supersedes?: string;
}

export interface Registry {
  get(id: string): FidelityEntry | undefined;
  all(): readonly FidelityEntry[];
  byKind(kind: Kind): readonly FidelityEntry[];
}
