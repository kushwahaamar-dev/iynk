// @vitest-environment node
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listMigrations, migrate, readDatabaseUrl } from "../../../../scripts/db-migrate.mjs";

/** A stand-in for postgres.js that remembers which versions were recorded. */
type Tag = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>) & {
  unsafe: (text: string) => { simple: () => Promise<unknown[]> };
  begin: (cb: (tx: Tag) => Promise<unknown>) => Promise<unknown>;
};

function fakeSql(applied = new Map<unknown, unknown>()) {
  const ran: string[] = [];
  const tag = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("$");
    if (text.includes("SELECT checksum FROM simlab_migrations")) {
      const checksum = applied.get(values[0]);
      return Promise.resolve(checksum ? [{ checksum }] : []);
    }
    if (text.includes("INSERT INTO simlab_migrations")) applied.set(values[0], values[2]);
    return Promise.resolve([]);
  }) as Tag;
  tag.unsafe = (text: string) => ({ simple: () => (ran.push(text), Promise.resolve([])) });
  tag.begin = async (cb: (tx: Tag) => Promise<unknown>) => cb(tag);
  return { sql: tag, ran, applied };
}

describe("db-migrate", () => {
  it("lists the repo's migrations in order with checksums", () => {
    const migrations = listMigrations();
    expect(migrations.map((m) => m.file)).toEqual(["0001_events.sql", "0002_aggregates.sql", "0003_profiles.sql"]);
    for (const m of migrations) expect(m.checksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("applies pending files once and skips them afterwards", async () => {
    const db = fakeSql();
    const migrations = listMigrations();
    expect(await migrate(db.sql, migrations, { log: () => {} })).toEqual(["0001", "0002", "0003"]);
    expect(db.ran).toHaveLength(3);
    expect(await migrate(db.sql, migrations, { log: () => {} })).toEqual([]);
    expect(db.ran).toHaveLength(3);
  });

  it("only reports in status mode, and stops on an edited migration", async () => {
    const db = fakeSql();
    const lines: string[] = [];
    await migrate(db.sql, listMigrations(), { statusOnly: true, log: (line: string) => lines.push(line.trim()) });
    expect(db.ran).toHaveLength(0);
    expect(lines[0]).toMatch(/^pending\s+0001_events\.sql$/);

    const edited = fakeSql(new Map([["0001", "0".repeat(64)]]));
    await expect(migrate(edited.sql, listMigrations(), { log: () => {} })).rejects.toThrow(/changed after it was applied/);
  });

  it("reads DATABASE_URL from the environment first, then .env.local", () => {
    const dir = mkdtempSync(join(tmpdir(), "simlab-migrate-"));
    const file = join(dir, ".env.local");
    writeFileSync(file, 'META_API_KEY=x\nexport DATABASE_URL="postgres://u:p@h:5432/db?sslmode=require"\n');
    expect(readDatabaseUrl({}, file)).toBe("postgres://u:p@h:5432/db?sslmode=require");
    expect(readDatabaseUrl({ DATABASE_URL: "postgres://env/db" }, file)).toBe("postgres://env/db");
    writeFileSync(file, "DATABASE_URL=\n");
    expect(readDatabaseUrl({}, file)).toBeUndefined();
    expect(readDatabaseUrl({}, join(dir, "missing"))).toBeUndefined();
  });
});
