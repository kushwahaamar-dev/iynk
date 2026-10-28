import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { StoreError } from "../src/store/port.ts";
import { openStore } from "../src/store/sqlite.ts";
import { fakeDeps, MIGRATIONS_DIR, tempDir } from "./helpers.ts";

function setup() {
  const scratch = tempDir();
  const migrationsDir = join(scratch.dir, "migrations");
  cpSync(MIGRATIONS_DIR, migrationsDir, { recursive: true });
  const dbPath = join(scratch.dir, "data", "iynk.db");
  const backupsDir = join(scratch.dir, "data", "backups");
  const open = (deps = fakeDeps()) =>
    openStore({ path: dbPath, sync: "normal", migrationsDir, backupsDir, serverVersion: "test" }, deps);
  return { scratch, migrationsDir, dbPath, backupsDir, open };
}

function sha(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function expectCode(fn: () => unknown, code: string): void {
  assert.throws(fn, (error) => error instanceof StoreError && error.code === code);
}

test("a fresh file migrates to version 1 and a second open applies nothing", () => {
  const { scratch, open, backupsDir } = setup();
  try {
    const first = open();
    assert.equal(first.schemaVersion(), 1);
    assert.equal(first.integrityCheck(), "ok");
    first.close();
    const second = open();
    assert.equal(second.schemaVersion(), 1);
    second.close();
    assert.equal(readdirSync(backupsDir).length, 0);
  } finally {
    scratch.remove();
  }
});

test("a database one version ahead is refused and its bytes stay", () => {
  const { scratch, migrationsDir, dbPath, open } = setup();
  try {
    writeFileSync(join(migrationsDir, "0002_more.sql"), "CREATE TABLE extra (id INTEGER PRIMARY KEY);\n");
    open().close();
    const before = sha(dbPath);
    const mtime = statSync(dbPath).mtimeMs;
    mkdirSync(join(scratch.dir, "old"));
    const older = join(scratch.dir, "old");
    cpSync(join(MIGRATIONS_DIR, "0001_identity.sql"), join(older, "0001_identity.sql"));
    expectCode(
      () => openStore({ path: dbPath, sync: "normal", migrationsDir: older, backupsDir: join(scratch.dir, "b"), serverVersion: "old" }, fakeDeps()),
      "db_newer_than_server",
    );
    assert.equal(sha(dbPath), before);
    assert.equal(statSync(dbPath).mtimeMs, mtime);
  } finally {
    scratch.remove();
  }
});

test("an edited migration is refused", () => {
  const { scratch, migrationsDir, open } = setup();
  try {
    open().close();
    writeFileSync(join(migrationsDir, "0001_identity.sql"), `${readFileSync(join(migrationsDir, "0001_identity.sql"), "utf8")}\n-- edited\n`);
    expectCode(() => open(), "migration_checksum_changed");
  } finally {
    scratch.remove();
  }
});

test("a pending migration is backed up first and only the last three backups stay", () => {
  const { scratch, migrationsDir, backupsDir, open } = setup();
  try {
    const deps = fakeDeps();
    open(deps).close();
    assert.equal(readdirSync(backupsDir).length, 0);
    for (let version = 2; version <= 6; version += 1) {
      const id = String(version).padStart(4, "0");
      writeFileSync(join(migrationsDir, `${id}_step.sql`), `CREATE TABLE step_${version} (id INTEGER PRIMARY KEY);\n`);
      deps.advance(1000);
      const store = open(deps);
      assert.equal(store.schemaVersion(), version);
      store.close();
    }
    const backups = readdirSync(backupsDir).sort();
    assert.equal(backups.length, 3);
    assert.deepEqual(
      backups.map((name) => name.slice(0, 9)),
      ["pre-0004-", "pre-0005-", "pre-0006-"],
    );
  } finally {
    scratch.remove();
  }
});
