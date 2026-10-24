#!/usr/bin/env node
// Applies db/migrations/*.sql to DATABASE_URL in file-name order and records each
// version in simlab_migrations. Each file runs in its own transaction under an
// advisory lock, so two deploys can't apply the same file twice. A file that was already
// applied is skipped; one that changed since it was applied stops the run.
//
//   node scripts/db-migrate.mjs            apply pending migrations
//   node scripts/db-migrate.mjs --status   list applied and pending, change nothing
//
// DATABASE_URL comes from the environment, else from .env.local. It is never printed.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "db", "migrations");
const LOCK_KEY = 7_340_211; // any constant; shared by every runner of this script

/**
 * @param {Record<string, string | undefined>} [env]
 * @param {string} [envFile]
 * @returns {string | undefined}
 */
export function readDatabaseUrl(env = process.env, envFile = join(root, ".env.local")) {
  if (env.DATABASE_URL?.trim()) return env.DATABASE_URL.trim();
  if (!existsSync(envFile)) return undefined;
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const value = match[1].replace(/^(['"])(.*)\1$/, "$2").trim();
    return value || undefined;
  }
  return undefined;
}

export function listMigrations(dir = migrationsDir) {
  return readdirSync(dir)
    .filter((file) => /^\d{4}_[a-z0-9_]+\.sql$/.test(file))
    .sort()
    .map((file) => {
      const text = readFileSync(join(dir, file), "utf8");
      return { version: file.slice(0, 4), file, text, checksum: createHash("sha256").update(text).digest("hex") };
    });
}

export async function migrate(sql, migrations, { statusOnly = false, log = console.log } = {}) {
  await sql`
    CREATE TABLE IF NOT EXISTS simlab_migrations (
      version    text PRIMARY KEY,
      file       text NOT NULL,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`;

  const done = [];
  for (const m of migrations) {
    // The lock is taken per file and the applied check repeated under it, so a
    // second runner waits, then sees the version and skips it.
    const outcome = await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
      const [row] = await tx`SELECT checksum FROM simlab_migrations WHERE version = ${m.version}`;
      if (row) {
        if (row.checksum !== m.checksum) {
          throw new Error(`${m.file} changed after it was applied. Add a new migration instead of editing it.`);
        }
        return "applied";
      }
      if (statusOnly) return "pending";
      await tx.unsafe(m.text).simple();
      await tx`INSERT INTO simlab_migrations (version, file, checksum) VALUES (${m.version}, ${m.file}, ${m.checksum})`;
      return "new";
    });
    log(`  ${outcome === "new" ? "applied" : outcome}  ${m.file}${outcome === "new" ? " (new)" : ""}`);
    if (outcome === "new") done.push(m.version);
  }
  return done;
}

async function main() {
  const statusOnly = process.argv.includes("--status");
  const url = readDatabaseUrl();
  if (!url) {
    console.log("db-migrate: DATABASE_URL is not set (environment or .env.local); nothing to do.");
    return;
  }
  const sql = postgres(url, { max: 1, onnotice: () => {}, connect_timeout: 15, connection: { application_name: "simlab-migrate" } });
  try {
    const migrations = listMigrations();
    console.log(`db-migrate: ${migrations.length} migration file(s)${statusOnly ? " (status only)" : ""}`);
    const done = await migrate(sql, migrations, { statusOnly });
    console.log(statusOnly ? "db-migrate: status done." : `db-migrate: ${done.length} applied, database is current.`);
  } catch (error) {
    // Postgres errors carry the server message, never the connection string.
    console.error(`db-migrate: failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
