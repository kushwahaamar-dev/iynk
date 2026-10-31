import engineMna from "./data/engine-mna-dc-pwl.json" with { type: "json" };
import flightGame from "./data/flight-game.json" with { type: "json" };
import ledPwl from "./data/led-pwl.json" with { type: "json" };
import runtimeArduino from "./data/runtime-arduino-subset.json" with { type: "json" };
import { checkEntry } from "./tiers.ts";
import { KINDS, LAYERS, STATUSES, TIERS } from "./types.ts";
import type { FidelityEntry, Kind, Registry } from "./types.ts";

export { ID_ENGINE, ID_MODEL } from "./tiers.ts";

const SEED: readonly unknown[] = [engineMna, ledPwl, runtimeArduino, flightGame];

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
export function loadRegistry(raw: readonly unknown[] = SEED, o: { knownKeys?: ReadonlySet<string> } = {}): Registry {
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
