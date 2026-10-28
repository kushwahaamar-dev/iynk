import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, test } from "node:test";
import { COMMANDS, run, type Io } from "../src/cli/commands.ts";
import { registerDevice } from "../src/identity/devices.ts";
import { openStore } from "../src/store/sqlite.ts";
import { fakeDeps, MIGRATIONS_DIR, tempDir } from "./helpers.ts";
import { makeDeviceKey } from "./keys.ts";

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const remove of cleanups.splice(0)) remove();
});

function setup() {
  const scratch = tempDir();
  cleanups.push(scratch.remove);
  const dataDir = join(scratch.dir, "data");
  const deps = fakeDeps();
  const env: NodeJS.ProcessEnv = {
    IYNK_DATA_DIR: dataDir,
    IYNK_PUBLIC_URL: "http://localhost:8787",
    IYNK_ALLOWED_ORIGINS: "http://localhost:3001",
  };
  const out: string[] = [];
  const err: string[] = [];
  const io: Io = { out: (line) => out.push(line), err: (line) => err.push(line), now: () => deps.clock.now() };
  const exec = (argv: string[], over: NodeJS.ProcessEnv = {}) => run(argv, { ...env, ...over }, io, deps);
  const store = () =>
    openStore(
      { path: join(dataDir, "iynk.db"), sync: "normal", migrationsDir: MIGRATIONS_DIR, backupsDir: join(dataDir, "backups"), serverVersion: "test" },
      deps,
    );
  return { scratch, dataDir, deps, env, out, err, exec, store };
}

describe("init", () => {
  test("creates the data directory with mode 0700, migrates, prints the link and the typed code", async () => {
    const t = setup();
    assert.equal(await t.exec(["init"]), 0);
    assert.equal(statSync(t.dataDir).mode & 0o777, 0o700);
    assert.ok(existsSync(join(t.dataDir, "iynk.db")));
    assert.equal(t.out.filter((line) => line.startsWith("Enrolment link: http://localhost:8787/together#enrol=")).length, 1);
    assert.equal(t.out.filter((line) => /^Typed code: [0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(line)).length, 1);
    const db = new DatabaseSync(join(t.dataDir, "iynk.db"), { readOnly: true });
    assert.equal((db.prepare("SELECT MAX(version) AS v FROM schema_migrations").get() as { v: number }).v, 1);
    db.close();
  });

  test("twice prints another code", async () => {
    const t = setup();
    await t.exec(["init"]);
    const first = t.out.find((line) => line.startsWith("Typed code"));
    t.out.length = 0;
    t.deps.advance(1000);
    assert.equal(await t.exec(["init"]), 0);
    assert.notEqual(t.out.find((line) => line.startsWith("Typed code")), first);
  });

  test("enrol before init runs the same setup, and enroll is an alias", async () => {
    const t = setup();
    assert.equal(await t.exec(["enroll", "--name", "Ada"]), 0);
    assert.equal(t.out[0], "Enrolment code for Ada");
    assert.ok(existsSync(join(t.dataDir, "iynk.db")));
  });

  test("the code goes to io.out only", async () => {
    const t = setup();
    await t.exec(["init"]);
    assert.deepEqual(t.err, []);
  });
});

describe("refusals", () => {
  const cases: [string, NodeJS.ProcessEnv, (dir: string) => void][] = [
    ["a wildcard origin", { IYNK_ALLOWED_ORIGINS: "*" }, () => {}],
    ["a removed variable", { IYNK_SECRET: "x" }, () => {}],
    ["no public address", { IYNK_PUBLIC_URL: "" }, () => {}],
    ["an open listening host", { IYNK_HOST: "0.0.0.0" }, () => {}],
    [
      "a data directory with mode 0755",
      {},
      (dir) => {
        mkdirSync(dir, { mode: 0o755 });
        chmodSync(dir, 0o755);
      },
    ],
  ];
  for (const [name, over, prepare] of cases) {
    test(`${name} exits 2 and creates nothing`, async () => {
      const t = setup();
      prepare(t.dataDir);
      assert.equal(await t.exec(["init"], over), 2);
      assert.equal(t.err.length, 1);
      assert.equal(t.out.length, 0);
      assert.equal(existsSync(join(t.dataDir, "iynk.db")), false);
    });
  }

  test("a newer database exits 1 with one line", async () => {
    const t = setup();
    await t.exec(["init"]);
    const db = new DatabaseSync(join(t.dataDir, "iynk.db"));
    db.exec("INSERT INTO schema_migrations (version, name, checksum, applied_at) VALUES (99, 'future', x'00', 0)");
    db.close();
    t.err.length = 0;
    assert.equal(await t.exec(["devices"]), 1);
    assert.equal(t.err.length, 1);
  });
});

describe("enrol --json", () => {
  test("prints one parsable object", async () => {
    const t = setup();
    assert.equal(await t.exec(["enrol", "--json"]), 0);
    assert.equal(t.out.length, 1);
    const parsed = JSON.parse(t.out[0] ?? "") as { link: string; code: string; expiresAt: number };
    assert.match(parsed.link, /^http:\/\/localhost:8787\/together#enrol=[A-Za-z0-9_-]{22}$/);
    assert.match(parsed.code, /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    assert.equal(parsed.expiresAt, t.deps.clock.now() + 24 * 3_600_000);
  });
});

describe("devices and revoke", () => {
  async function withDevice() {
    const t = setup();
    await t.exec(["init"]);
    const key = makeDeviceKey();
    const store = t.store();
    store.transaction((tx) => {
      registerDevice(tx, t.deps, { spki: key.spki, displayName: "Ada", maxIdentities: 100 });
      for (const n of [1, 2]) {
        tx.run(
          "INSERT INTO sessions (id, device_id, token_hash, created_at, expires_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?)",
          `ses_${n}`,
          key.deviceId,
          new Uint8Array(32).fill(n),
          0,
          Number.MAX_SAFE_INTEGER,
          0,
        );
      }
    });
    store.close();
    t.out.length = 0;
    return { t, key };
  }

  test("devices lists a table without keys", async () => {
    const { t, key } = await withDevice();
    assert.equal(await t.exec(["devices"]), 0);
    const text = t.out.join("\n");
    assert.match(text, /^id\s+identity\s+name\s+role\s+created\s+last seen\s+revoked/);
    assert.ok(text.includes(key.deviceId));
    assert.ok(text.includes("owner"));
    assert.ok(!/public/i.test(text));
  });

  test("revoke ends the sessions and reports how many", async () => {
    const { t, key } = await withDevice();
    assert.equal(await t.exec(["revoke", key.identityId]), 0);
    assert.match(t.out[0] ?? "", /ended 2 sessions/);
    const store = t.store();
    assert.equal(store.read((tx) => tx.get<{ n: number }>("SELECT COUNT(*) AS n FROM sessions WHERE revoked_at IS NULL")?.n), 0);
    store.close();
  });

  test("revoke of an unknown id exits 1 with no such device", async () => {
    const { t } = await withDevice();
    assert.equal(await t.exec(["revoke", "dev_nope"]), 1);
    assert.deepEqual(t.err, ["no such device"]);
  });

  test("revoke without an id is a usage error", async () => {
    const { t } = await withDevice();
    assert.equal(await t.exec(["revoke"]), 64);
  });
});

describe("backup and restore", () => {
  test("backup keeps the last 7 iynk files and leaves pre- files alone", async () => {
    const t = setup();
    await t.exec(["init"]);
    const backups = join(t.dataDir, "backups");
    const pre = readdirSync(backups).filter((name) => name.startsWith("pre-"));
    for (let i = 0; i < 9; i += 1) {
      t.deps.advance(1000);
      assert.equal(await t.exec(["backup"]), 0);
    }
    const kept = readdirSync(backups).filter((name) => name.startsWith("iynk-"));
    assert.equal(kept.length, 7);
    assert.ok(kept.includes(`iynk-${t.deps.clock.now()}.db`));
    assert.deepEqual(readdirSync(backups).filter((name) => name.startsWith("pre-")), pre);
  });

  test("restore round trip keeps devices", async () => {
    const t = setup();
    await t.exec(["init"]);
    const key = makeDeviceKey();
    let store = t.store();
    store.transaction((tx) => registerDevice(tx, t.deps, { spki: key.spki, displayName: "Ada", maxIdentities: 100 }));
    store.close();
    await t.exec(["backup"]);
    const file = t.out.at(-1)?.replace("Backup written to ", "") ?? "";
    store = t.store();
    store.transaction((tx) => tx.run("DELETE FROM devices"));
    store.close();

    assert.equal(await t.exec(["restore", file]), 0);
    assert.equal(existsSync(join(t.dataDir, "iynk.db-wal")), false);
    store = t.store();
    assert.equal(store.read((tx) => tx.get<{ name: string }>("SELECT name FROM devices")?.name), "Ada");
    store.close();
  });

  test("restore refuses while a server holds the database", async () => {
    const t = setup();
    await t.exec(["init"]);
    await t.exec(["backup"]);
    const file = t.out.at(-1)?.replace("Backup written to ", "") ?? "";
    const running = t.store();
    t.err.length = 0;
    assert.equal(await t.exec(["restore", file]), 1);
    assert.match(t.err[0] ?? "", /in use/);
    assert.equal(running.ping(), true);
    running.close();
  });

  test("restore refuses a file that is not a database and a newer schema", async () => {
    const t = setup();
    await t.exec(["init"]);
    const junk = join(t.scratch.dir, "junk.db");
    writeFileSync(junk, "not a database at all, just text".repeat(20));
    assert.equal(await t.exec(["restore", junk]), 1);

    const newer = join(t.scratch.dir, "newer.db");
    const db = new DatabaseSync(newer);
    db.exec("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT, checksum BLOB, applied_at INTEGER)");
    db.exec("INSERT INTO schema_migrations VALUES (99, 'future', x'00', 0)");
    db.close();
    t.err.length = 0;
    assert.equal(await t.exec(["restore", newer]), 1);
    assert.match(t.err[0] ?? "", /does not know/);
  });
});

describe("other commands", () => {
  test("check-config exits 2 and names every problem", async () => {
    const t = setup();
    assert.equal(await t.exec(["check-config"], { IYNK_ALLOWED_ORIGINS: "*", IYNK_SECRET: "x" }), 2);
    assert.equal(t.err.length, 2);
    assert.equal(await t.exec(["check-config"]), 0);
    assert.equal(existsSync(t.dataDir), false);
  });

  test("compact reports sizes before and after", async () => {
    const t = setup();
    await t.exec(["init"]);
    t.out.length = 0;
    assert.equal(await t.exec(["compact"]), 0);
    assert.match(t.out[0] ?? "", /bytes before/);
  });

  test("diagnostics writes a tar that holds no key value", async () => {
    const t = setup();
    await t.exec(["init"]);
    t.out.length = 0;
    assert.equal(await t.exec(["diagnostics"], { IYNK_OPS_KEY_X: "canary-value" }), 0);
    const file = (t.out[0] ?? "").replace("Diagnostics written to ", "");
    assert.ok(!readFileSync(file).includes("canary-value"));
  });

  test("--help lists exactly COMMANDS and creates no file", async () => {
    const t = setup();
    for (const flag of ["--help", "-h"]) {
      t.out.length = 0;
      assert.equal(await t.exec([flag]), 0);
      assert.deepEqual(t.out, COMMANDS);
    }
    assert.equal(existsSync(t.dataDir), false);
  });

  test("an unknown command and a missing command exit 64", async () => {
    const t = setup();
    assert.equal(await t.exec(["frobnicate"]), 64);
    assert.equal(await t.exec([]), 64);
    assert.equal(await t.exec(["init", "--bogus"]), 64);
    assert.equal(existsSync(t.dataDir), false);
  });
});
