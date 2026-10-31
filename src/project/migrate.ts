// How to write a migration (PDM 10.2):
// 1. Add { from: "1.1", to: "1.2", run } to MIGRATIONS, after the last one, and set CURRENT_SCHEMA_VERSION to its `to`.
// 2. `run` is pure: no clock, no random numbers, no I/O, no part library. Return a new document and leave the
//    input alone; `migrate` sets `schemaVersion`, records the step in `provenance.migrations` and, on a MAJOR step,
//    drops `history.ops` (checkpoints stay).
// 3. Running `run` on its own output must change nothing.
// 4. Put a document written by the previous version and the expected output in
//    src/project/migrations/fixtures/<from>-<to>/input.json and expected.json. The test fails without them.
// 5. `domains.*` migrate by their own chain: give the migration a `migrateDomains` when the domain data changes.
import type { Failure } from "../core/result.ts";
import { foldChain } from "./hash.ts";

export const CURRENT_SCHEMA_VERSION = "1.1";

const MAX_MIGRATION_RECORDS = 64;

export interface Migration {
  from: string;
  to: string;
  run(doc: unknown): unknown;
  migrateDomains?(domains: unknown): unknown;
}

/** No migration exists before the first public release (PDM 10.1). */
export const MIGRATIONS: readonly Migration[] = [];

export type MigrateResult =
  | { kind: "current"; doc: unknown }
  | { kind: "migrated"; doc: unknown; steps: { from: string; to: string }[]; original: unknown }
  | { kind: "newer"; version: string; message: string }
  | { kind: "invalid"; failure: Failure };

interface Version {
  major: number;
  minor: number;
}

type Doc = Record<string, unknown>;

/** `"1.1"` as numbers, or null for anything that is not `MAJOR.MINOR`. */
export function parseSchemaVersion(v: unknown): Version | null {
  const match = typeof v === "string" ? /^(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})$/.exec(v) : null;
  return match ? { major: Number(match[1]), minor: Number(match[2]) } : null;
}

const isRecord = (v: unknown): v is Doc => typeof v === "object" && v !== null && !Array.isArray(v);

const compareVersions = (a: Version, b: Version): number => a.major - b.major || a.minor - b.minor;

const invalid = (code: string, message: string): MigrateResult => ({ kind: "invalid", failure: { code, message } });

function dropOps(doc: Doc): Doc {
  const history = doc.history;
  if (!isRecord(history) || !Array.isArray(history.ops)) return doc;
  const baseChain = typeof history.baseChain === "string" ? foldChain(history.baseChain, history.ops) : history.baseChain;
  return { ...doc, history: { ...history, baseRevision: doc.revision, baseChain, ops: [] } };
}

function recordStep(doc: Doc, entry: Record<string, string>): Doc {
  const provenance = isRecord(doc.provenance) ? doc.provenance : {};
  const earlier = Array.isArray(provenance.migrations) ? provenance.migrations : [];
  return { ...doc, provenance: { ...provenance, migrations: [...earlier, entry].slice(-MAX_MIGRATION_RECORDS) } };
}

/**
 * Brings a document read from a file or the store to the current schema version, without touching `input`.
 * The version is judged first: the schema's `^1\.` pattern would reject a `2.0` file with a misleading message.
 * `chain` is for the test; the target is where the chain ends, or the current version when it is empty.
 */
export function migrate(
  input: unknown,
  ctx: { at: string; app: string },
  chain: readonly Migration[] = MIGRATIONS,
): MigrateResult {
  if (!isRecord(input) || input.format !== "iynk.project") return invalid("not_a_project", "This is not an iynk project");
  const found = parseSchemaVersion(input.schemaVersion);
  if (!found) return invalid("bad_version", "The project has no readable schema version");

  const target = chain.length > 0 ? chain[chain.length - 1].to : CURRENT_SCHEMA_VERSION;
  const order = compareVersions(found, parseSchemaVersion(target) as Version);
  if (order > 0) {
    const version = input.schemaVersion as string;
    return { kind: "newer", version, message: `made by a newer iynk, version ${version}` };
  }
  if (order === 0) return { kind: "current", doc: input };

  let doc: Doc = input;
  const steps: { from: string; to: string }[] = [];
  while (doc.schemaVersion !== target) {
    const migration = chain.find((m) => m.from === doc.schemaVersion);
    if (!migration || steps.length >= chain.length) {
      return invalid("no_migration", `No migration from version ${String(doc.schemaVersion)}`);
    }
    let next = migration.run(doc) as Doc;
    if (migration.migrateDomains && isRecord(next.domains)) {
      next = { ...next, domains: migration.migrateDomains(next.domains) };
    }
    next = { ...next, schemaVersion: migration.to };
    if (parseSchemaVersion(migration.from)?.major !== parseSchemaVersion(migration.to)?.major) next = dropOps(next);
    doc = recordStep(next, { from: migration.from, to: migration.to, at: ctx.at, app: ctx.app });
    steps.push({ from: migration.from, to: migration.to });
  }
  return { kind: "migrated", doc, steps, original: input };
}
