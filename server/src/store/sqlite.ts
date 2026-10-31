import { chmodSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import type { Deps } from "../deps.ts";
import { assertNotNewer, migrate } from "./migrate.ts";
import { StoreError, type Row, type ServerStore, type SqlValue, type Tx } from "./port.ts";

export type StoreOptions = {
  path: string;
  sync: "full" | "normal";
  migrationsDir: string;
  backupsDir: string;
  serverVersion: string;
};

const MEMORY = ":memory:";
const SQLITE_BUSY = 5;
const SQLITE_LOCKED = 6;

function asStoreError(error: unknown): unknown {
  if (error instanceof StoreError) return error;
  const code = typeof error === "object" && error !== null && "errcode" in error ? Number(error.errcode) & 0xff : 0;
  if (code === SQLITE_BUSY || code === SQLITE_LOCKED) {
    return new StoreError("store_unavailable", "The database is busy.", { cause: error });
  }
  return error;
}

function ensurePrivateDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
}

function makeTx(db: DatabaseSync): Tx {
  const cache = new Map<string, StatementSync>();
  const prepare = (sql: string): StatementSync => {
    let statement = cache.get(sql);
    if (!statement) {
      statement = db.prepare(sql);
      cache.set(sql, statement);
    }
    return statement;
  };
  return {
    run: (sql, ...params: SqlValue[]) => ({ changes: Number(prepare(sql).run(...params).changes) }),
    get: <T extends Row>(sql: string, ...params: SqlValue[]) => {
      const row = prepare(sql).get(...params);
      return row && ({ ...row } as T);
    },
    all: <T extends Row>(sql: string, ...params: SqlValue[]) => prepare(sql).all(...params).map((row) => ({ ...row }) as T),
  };
}

export function openStore(opts: StoreOptions, deps: Deps): ServerStore {
  const inMemory = opts.path === MEMORY;
  if (!inMemory) {
    ensurePrivateDir(dirname(opts.path));
    if (existsSync(opts.path)) {
      const probe = new DatabaseSync(opts.path, { readOnly: true });
      try {
        assertNotNewer(probe, opts.migrationsDir, opts.serverVersion);
      } finally {
        probe.close();
      }
    }
  }

  let db: DatabaseSync;
  try {
    db = new DatabaseSync(opts.path, { timeout: 5000 });
    db.exec("PRAGMA journal_mode = WAL");
    db.exec(`PRAGMA synchronous = ${opts.sync === "full" ? "FULL" : "NORMAL"}`);
    db.exec("PRAGMA foreign_keys = ON");
  } catch (error) {
    throw asStoreError(error);
  }
  if (!inMemory) chmodSync(opts.path, 0o600);

  const tx = makeTx(db);
  let depth = 0;

  const run = <T>(begin: string, end: string, fn: (tx: Tx) => T): T => {
    if (depth > 0) return fn(tx);
    try {
      db.exec(begin);
    } catch (error) {
      throw asStoreError(error);
    }
    depth = 1;
    let result: T;
    try {
      result = fn(tx);
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    } finally {
      depth = 0;
    }
    try {
      db.exec(end);
    } catch (error) {
      db.exec("ROLLBACK");
      throw asStoreError(error);
    }
    return result;
  };

  const store: ServerStore = {
    transaction: (fn) => run("BEGIN IMMEDIATE", "COMMIT", fn),
    read: (fn) => {
      if (depth > 0) return fn(tx);
      db.exec("PRAGMA query_only = ON");
      try {
        return run("BEGIN", "ROLLBACK", fn);
      } finally {
        db.exec("PRAGMA query_only = OFF");
      }
    },
    backupTo(path) {
      if (existsSync(path)) throw new Error(`Backup target already exists: ${path}`);
      ensurePrivateDir(dirname(path));
      const partial = `${path}.tmp`;
      rmSync(partial, { force: true });
      try {
        db.prepare("VACUUM INTO ?").run(partial);
        chmodSync(partial, 0o600);
        renameSync(partial, path);
      } catch (error) {
        rmSync(partial, { force: true });
        throw asStoreError(error);
      }
    },
    integrityCheck() {
      const row = db.prepare("PRAGMA integrity_check").get() as { integrity_check: string } | undefined;
      return row?.integrity_check ?? "unknown";
    },
    ping() {
      try {
        return db.prepare("SELECT 1 AS ok").get() !== undefined;
      } catch {
        return false;
      }
    },
    schemaVersion() {
      const row = db.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations").get() as { version: number };
      return row.version;
    },
    close: () => db.close(),
  };

  try {
    ensurePrivateDir(opts.backupsDir);
    migrate(db, {
      dir: opts.migrationsDir,
      backupsDir: opts.backupsDir,
      backup: (to) => store.backupTo(to),
      clock: deps.clock,
      serverVersion: opts.serverVersion,
    });
  } catch (error) {
    db.close();
    throw error;
  }
  return store;
}
