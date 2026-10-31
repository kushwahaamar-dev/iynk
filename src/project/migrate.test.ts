// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalize } from "../core/canonical.ts";
import type { Project } from "./generated/types.ts";
import { chainNext } from "./hash.ts";
import { CURRENT_SCHEMA_VERSION, MIGRATIONS, migrate, parseSchemaVersion } from "./migrate.ts";
import type { Migration } from "./migrate.ts";

const ctx = { at: "2026-12-01T10:00:00.000Z", app: "iynk 1.2.0" };
const example = JSON.parse(
  readFileSync(join(process.cwd(), "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/env-monitor-esp32.project.json"), "utf8"),
) as Project;

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

const at = (version: string, extra: Record<string, unknown> = {}) =>
  ({ ...JSON.parse(JSON.stringify(example)), schemaVersion: version, ...extra }) as Record<string, unknown>;

/** A pure step that leaves a mark in the description, so a run is visible in the output. */
const addNote = (from: string, to: string): Migration => ({
  from,
  to,
  run: (doc) => {
    const d = doc as Project;
    return { ...d, meta: { ...d.meta, description: (d.meta.description ?? "") + `[${to}]` } };
  },
});

const MINOR_CHAIN = [addNote("1.0", "1.1"), addNote("1.1", "1.2")];
const MAJOR_CHAIN = [addNote("1.2", "2.0")];

/** M4: every migration ships a fixture pair under `src/project/migrations/fixtures/<from>-<to>/`. */
function assertFixturesComplete(chain: readonly Migration[], fs: { existsSync(path: string): boolean }, root: string) {
  const missing = chain.flatMap((m) =>
    ["input.json", "expected.json"]
      .map((file) => join(root, `${m.from}-${m.to}`, file))
      .filter((path) => !fs.existsSync(path)),
  );
  if (missing.length > 0) throw new Error(`missing migration fixtures: ${missing.join(", ")}`);
}

describe("parseSchemaVersion", () => {
  it("reads MAJOR.MINOR", () => {
    expect(parseSchemaVersion("1.1")).toEqual({ major: 1, minor: 1 });
    expect(parseSchemaVersion("12.0")).toEqual({ major: 12, minor: 0 });
  });

  it.each(["1", "1.1.0", "01.1", "1.x", "", " 1.1", "-1.0"])("refuses %j", (v) => {
    expect(parseSchemaVersion(v)).toBeNull();
  });

  it("refuses what is not a string", () => {
    for (const v of [1.1, null, undefined, {}, ["1", "1"]]) expect(parseSchemaVersion(v)).toBeNull();
  });
});

describe("migrate", () => {
  it("ships with no migrations, so the app version is where the chain ends", () => {
    expect(MIGRATIONS).toHaveLength(0);
    expect(CURRENT_SCHEMA_VERSION).toBe(example.schemaVersion);
  });

  it("returns a current document as it is", () => {
    const input = deepFreeze(at(CURRENT_SCHEMA_VERSION));
    const result = migrate(input, ctx);
    expect(result).toEqual({ kind: "current", doc: input });
  });

  it.each(["2.0", "1.2", "1.10", "3.7"])("refuses version %s as newer and leaves the input alone", (version) => {
    const input = deepFreeze(at(version));
    const before = canonicalize(input);
    const result = migrate(input, ctx);
    expect(result).toEqual({ kind: "newer", version, message: `made by a newer iynk, version ${version}` });
    expect(canonicalize(input)).toBe(before);
    expect(Object.isFrozen(input)).toBe(true);
  });

  it("does not look at anything else in a newer document", () => {
    expect(migrate({ format: "iynk.project", schemaVersion: "2.0" }, ctx).kind).toBe("newer");
  });

  it.each([
    ["null", null],
    ["a string", "iynk"],
    ["an array", []],
    ["no format", { schemaVersion: "1.1" }],
    ["another format", { format: "iynk.component", schemaVersion: "1.1" }],
    ["no version", { format: "iynk.project" }],
    ["a bad version", { format: "iynk.project", schemaVersion: "one" }],
  ])("calls %s invalid", (_name, input) => {
    expect(migrate(input, ctx).kind).toBe("invalid");
  });

  it("calls an older version with no path to the current one invalid", () => {
    const result = migrate(at("1.0"), ctx);
    expect(result).toMatchObject({ kind: "invalid", failure: { code: "no_migration" } });
  });

  it("runs the steps in order from the document's version", () => {
    const input = deepFreeze(at("1.0", { meta: { ...example.meta, description: "" } }));
    const result = migrate(input, ctx, MINOR_CHAIN);
    expect(result.kind).toBe("migrated");
    if (result.kind !== "migrated") return;
    expect(result.steps).toEqual([
      { from: "1.0", to: "1.1" },
      { from: "1.1", to: "1.2" },
    ]);
    const doc = result.doc as Project;
    expect(doc.schemaVersion).toBe("1.2");
    expect(doc.meta.description).toBe("[1.1][1.2]");
    expect(result.original).toBe(input);
  });

  it("starts in the middle of the chain", () => {
    const result = migrate(at("1.1", { meta: { ...example.meta, description: "" } }), ctx, MINOR_CHAIN);
    expect(result.kind === "migrated" && (result.doc as Project).meta.description).toBe("[1.2]");
  });

  it("never alters its input", () => {
    const input = deepFreeze(at("1.0"));
    expect(migrate(input, ctx, MINOR_CHAIN).kind).toBe("migrated");
  });

  it("gives the same bytes on every run (M3)", () => {
    const input = at("1.0");
    const a = migrate(input, ctx, MINOR_CHAIN);
    const b = migrate(input, ctx, MINOR_CHAIN);
    if (a.kind !== "migrated" || b.kind !== "migrated") throw new Error("expected both to migrate");
    expect(canonicalize(a.doc)).toBe(canonicalize(b.doc));
  });

  it("is a no-op when a migration runs on its own output (M3)", () => {
    const step: Migration = {
      from: "1.0",
      to: "1.1",
      run: (doc) => ({ ...(doc as Project), meta: { ...(doc as Project).meta, title: "T" } }),
    };
    const once = step.run(at("1.0"));
    expect(canonicalize(step.run(once))).toBe(canonicalize(once));
  });

  it("records each step in provenance.migrations (M6)", () => {
    const result = migrate(at("1.0"), ctx, MINOR_CHAIN);
    const doc = (result.kind === "migrated" ? result.doc : null) as Project;
    expect(doc.provenance.migrations).toEqual([
      { from: "1.0", to: "1.1", at: ctx.at, app: ctx.app },
      { from: "1.1", to: "1.2", at: ctx.at, app: ctx.app },
    ]);
  });

  it("keeps at most 64 records and drops the oldest (M6)", () => {
    const earlier = Array.from({ length: 64 }, (_, i) => ({ from: "0.0", to: "0.1", at: `2026-01-01T00:00:${String(i).padStart(2, "0")}.000Z`, app: "old" }));
    const input = at("1.1");
    (input.provenance as Record<string, unknown>).migrations = earlier;
    const result = migrate(input, ctx, MINOR_CHAIN);
    const records = ((result.kind === "migrated" ? result.doc : null) as Project).provenance.migrations ?? [];
    expect(records).toHaveLength(64);
    expect(records[0]).toEqual(earlier[1]);
    expect(records[63]).toEqual({ from: "1.1", to: "1.2", at: ctx.at, app: ctx.app });
  });

  it("drops history.ops on a MAJOR step, keeps checkpoints and carries the chain forward (M7)", () => {
    const input = at("1.2");
    const history = input.history as Project["history"];
    expect(history.ops.length).toBeGreaterThan(0);
    const result = migrate(input, ctx, MAJOR_CHAIN);
    const doc = (result.kind === "migrated" ? result.doc : null) as Project;
    expect(doc.history.ops).toEqual([]);
    expect(doc.history.checkpoints).toEqual(history.checkpoints);
    expect(doc.history.baseRevision).toBe(doc.revision);
    expect(doc.history.baseChain).toBe(history.ops.reduce((chain, op) => chainNext(chain, op), history.baseChain));
  });

  it("keeps history.ops on a MINOR step", () => {
    const input = at("1.0");
    const result = migrate(input, ctx, MINOR_CHAIN);
    const doc = (result.kind === "migrated" ? result.doc : null) as Project;
    expect(doc.history.ops).toEqual((input.history as Project["history"]).ops);
  });

  it("hands domain data to the migration that owns it (M9)", () => {
    const step: Migration = {
      ...addNote("1.1", "1.2"),
      migrateDomains: (domains) => ({ ...(domains as object), migrated: true }),
    };
    const input = at("1.1", { domains: { robotics: {} } });
    const result = migrate(input, ctx, [step]);
    expect((result.kind === "migrated" ? result.doc : null) as unknown).toMatchObject({
      domains: { robotics: {}, migrated: true },
    });
  });

  it("refuses a chain that loops", () => {
    const result = migrate(at("1.0"), ctx, [addNote("1.0", "1.1"), addNote("1.1", "1.0"), addNote("1.5", "1.2")]);
    expect(result.kind).toBe("invalid");
  });

  it("starts the provenance list when the document has none", () => {
    const input = at("1.0");
    delete input.provenance;
    const result = migrate(input, ctx, MINOR_CHAIN);
    const doc = (result.kind === "migrated" ? result.doc : null) as Record<string, unknown>;
    expect((doc.provenance as { migrations: unknown[] }).migrations).toHaveLength(2);
  });
});

describe("assertFixturesComplete (M4)", () => {
  const root = join(process.cwd(), "src/project/migrations/fixtures");

  it("passes with no migrations", () => {
    expect(() => assertFixturesComplete(MIGRATIONS, { existsSync }, root)).not.toThrow();
  });

  it("fails when a migration has no fixture", () => {
    expect(() => assertFixturesComplete(MINOR_CHAIN, { existsSync }, root)).toThrow(/1\.0-1\.1\/input\.json/);
  });

  it("passes when every fixture exists", () => {
    expect(() => assertFixturesComplete(MINOR_CHAIN, { existsSync: () => true }, root)).not.toThrow();
  });

  it("names the one file that is missing", () => {
    const fs = { existsSync: (path: string) => !path.endsWith("1.1-1.2/expected.json") };
    expect(() => assertFixturesComplete(MINOR_CHAIN, fs, root)).toThrow(/^missing migration fixtures: [^,]*1\.1-1\.2\/expected\.json$/);
  });
});
