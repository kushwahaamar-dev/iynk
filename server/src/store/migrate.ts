import { createHash } from "node:crypto";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { Clock } from "../deps.ts";
import { StoreError } from "./port.ts";

export type MigrateOptions = {
  dir: string;
  backupsDir: string;
  backup: (to: string) => void;
  clock: Clock;
  serverVersion: string;
};

type MigrationFile = { version: number; name: string; sql: string; checksum: Buffer };

type AppliedRow = { version: number; checksum: Uint8Array };

const FILE_PATTERN = /^(\d{4})_([a-z0-9_]+)\.sql$/;
const BACKUP_PATTERN = /^pre-(\d{4})-(\d+)\.db$/;
const BACKUPS_KEPT = 3;

function listFiles(dir: string): MigrationFile[] {
  const files: MigrationFile[] = [];
  for (const entry of readdirSync(dir).sort()) {
    const match = FILE_PATTERN.exec(entry);
    if (!match) continue;
    const sql = readFileSync(join(dir, entry), "utf8");
    files.push({
      version: Number(match[1]),
      name: match[2] ?? "",
      sql,
      checksum: createHash("sha256").update(sql).digest(),
    });
  }
  return files;
}

function readApplied(db: DatabaseSync): AppliedRow[] {
  const table = db.prepare("SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'").get();
  if (!table) return [];
  return db.prepare("SELECT version, checksum FROM schema_migrations ORDER BY version").all() as AppliedRow[];
}

export function assertNotNewer(db: DatabaseSync, dir: string, serverVersion: string): void {
  const known = new Set(listFiles(dir).map((file) => file.version));
  const unknown = readApplied(db).find((row) => !known.has(row.version));
  if (unknown) {
    throw new StoreError(
      "db_newer_than_server",
      `The database is at schema version ${unknown.version}, which iynk-server ${serverVersion} does not know. Run a newer server or restore a backup.`,
    );
  }
}

function pruneBackups(backupsDir: string): void {
  const backups = readdirSync(backupsDir)
    .map((entry) => ({ entry, match: BACKUP_PATTERN.exec(entry) }))
    .flatMap(({ entry, match }) => (match ? [{ entry, version: Number(match[1]), at: Number(match[2]) }] : []))
    .sort((x, y) => y.at - x.at || y.version - x.version);
  for (const old of backups.slice(BACKUPS_KEPT)) rmSync(join(backupsDir, old.entry));
}

export function migrate(db: DatabaseSync, opts: MigrateOptions): { applied: number[] } {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, checksum BLOB NOT NULL, applied_at INTEGER NOT NULL)",
  );
  assertNotNewer(db, opts.dir, opts.serverVersion);

  const files = listFiles(opts.dir);
  const applied = readApplied(db);
  for (const row of applied) {
    const file = files.find((candidate) => candidate.version === row.version);
    if (file && !file.checksum.equals(row.checksum)) {
      throw new StoreError(
        "migration_checksum_changed",
        `Migration ${String(row.version).padStart(4, "0")} was edited after it was applied. Migrations are forward-only.`,
      );
    }
  }

  const done = new Set(applied.map((row) => row.version));
  const pending = files.filter((file) => !done.has(file.version));
  const first = pending[0];
  if (!first) return { applied: [] };

  if (done.size > 0) {
    opts.backup(join(opts.backupsDir, `pre-${String(first.version).padStart(4, "0")}-${opts.clock.now()}.db`));
    pruneBackups(opts.backupsDir);
  }

  for (const file of pending) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(file.sql);
      db.prepare("INSERT INTO schema_migrations (version, name, checksum, applied_at) VALUES (?, ?, ?, ?)").run(
        file.version,
        file.name,
        file.checksum,
        opts.clock.now(),
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  return { applied: pending.map((file) => file.version) };
}
