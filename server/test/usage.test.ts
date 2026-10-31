import assert from "node:assert/strict";
import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { addTokens, countRelayCall, countSearch, pruneUsage } from "../src/modules/ai/usage.ts";
import type { ServerStore } from "../src/store/port.ts";
import { openStore } from "../src/store/sqlite.ts";
import { fakeDeps, memoryStore, MIGRATIONS_DIR, tempDir } from "./helpers.ts";

const MIDNIGHT = Date.UTC(2026, 9, 30, 0, 0, 0);

function addDevice(store: ServerStore, id: string): void {
  store.transaction((tx) =>
    tx.run(
      "INSERT INTO devices (id, identity_id, public_key, thumbprint, name, server_role, created_at, last_seen_at) VALUES (?, ?, ?, ?, 'Ada', 'member', 1, 1)",
      id,
      `usr_${id}`,
      new Uint8Array([1]),
      `thumb_${id}`,
    ),
  );
}

function setup(start = MIDNIGHT + 12 * 3_600_000) {
  const deps = fakeDeps(start);
  const store = memoryStore(deps);
  addDevice(store, "dev_a");
  return { deps, store };
}

test("counts per device and refuses at the cap without incrementing", () => {
  const { deps, store } = setup();
  const call = (provider = "relay:openai-compat") => store.transaction((tx) => countRelayCall(tx, deps.clock, "dev_a", provider, 3));
  assert.deepEqual(call(), { ok: true, used: 1 });
  assert.deepEqual(call("relay:anthropic"), { ok: true, used: 2 });
  assert.deepEqual(call(), { ok: true, used: 3 });
  const refused = call();
  assert.equal(refused.ok, false);
  assert.equal(refused.used, 3);
  assert.equal(store.read((tx) => tx.get("SELECT SUM(requests) AS n FROM usage")?.n), 3);
  store.close();
});

test("cap 0 refuses every call", () => {
  const { deps, store } = setup();
  const result = store.transaction((tx) => countRelayCall(tx, deps.clock, "dev_a", "relay:anthropic", 0));
  assert.deepEqual(result, { ok: false, used: 0, cap: 0, retryAfterSeconds: 43_200 });
  store.close();
});

test("the count resets at 00:00 UTC and the retry hint points there", () => {
  const { deps, store } = setup(MIDNIGHT + 86_399_000);
  const call = () => store.transaction((tx) => countRelayCall(tx, deps.clock, "dev_a", "relay:anthropic", 1));
  assert.equal(call().ok, true);
  const refused = call();
  assert.equal(refused.ok, false);
  assert.equal(refused.ok === false && refused.retryAfterSeconds, 1);
  deps.advance(1000);
  assert.deepEqual(call(), { ok: true, used: 1 });
  store.close();
});

test("search sums the month and ignores relay rows", () => {
  const { deps, store } = setup(Date.UTC(2026, 9, 2));
  const search = (cap: number | null) => store.transaction((tx) => countSearch(tx, deps.clock, "dev_a", cap));
  store.transaction((tx) => countRelayCall(tx, deps.clock, "dev_a", "relay:anthropic", 10));
  assert.deepEqual(search(2), { ok: true, used: 1 });
  deps.advance(20 * 86_400_000);
  assert.deepEqual(search(2), { ok: true, used: 2 });
  const refused = search(2);
  assert.equal(refused.ok, false);
  assert.equal(refused.ok === false && refused.retryAfterSeconds, Math.ceil((Date.UTC(2026, 10, 1) - deps.clock.now()) / 1000));
  assert.equal(search(null).ok, true);
  deps.advance(15 * 86_400_000);
  assert.deepEqual(search(2), { ok: true, used: 1 });
  store.close();
});

test("addTokens adds to the day row and keeps the request count", () => {
  const { deps, store } = setup();
  store.transaction((tx) => countRelayCall(tx, deps.clock, "dev_a", "relay:anthropic", 5));
  store.transaction((tx) => addTokens(tx, deps.clock, "dev_a", "relay:anthropic", { input: 10, output: 4 }));
  store.transaction((tx) => addTokens(tx, deps.clock, "dev_a", "relay:anthropic", { input: 5, output: 1 }));
  store.transaction((tx) => addTokens(tx, deps.clock, "dev_a", "relay:openai-compat", { input: 1, output: 1 }));
  const row = store.read((tx) => tx.get("SELECT requests, input_tokens, output_tokens FROM usage WHERE provider = 'relay:anthropic'"));
  assert.deepEqual({ ...row }, { requests: 1, input_tokens: 15, output_tokens: 5 });
  assert.equal(store.read((tx) => tx.all("SELECT * FROM usage")).length, 2);
  store.close();
});

test("pruneUsage removes rows older than 62 days", () => {
  const { deps, store } = setup();
  store.transaction((tx) => countRelayCall(tx, deps.clock, "dev_a", "relay:anthropic", 5));
  deps.advance(61 * 86_400_000);
  assert.equal(store.transaction((tx) => pruneUsage(tx, deps.clock)), 0);
  deps.advance(2 * 86_400_000);
  assert.equal(store.transaction((tx) => pruneUsage(tx, deps.clock)), 1);
  store.close();
});

test("deleting a device removes its usage", () => {
  const { deps, store } = setup();
  addDevice(store, "dev_b");
  store.transaction((tx) => countRelayCall(tx, deps.clock, "dev_a", "relay:anthropic", 5));
  store.transaction((tx) => countRelayCall(tx, deps.clock, "dev_b", "relay:anthropic", 5));
  store.transaction((tx) => tx.run("DELETE FROM devices WHERE id = 'dev_a'"));
  assert.deepEqual(
    store.read((tx) => tx.all("SELECT device_id FROM usage")).map((r) => r.device_id),
    ["dev_b"],
  );
  store.close();
});

test("a spent cap survives closing and reopening the file store", () => {
  const scratch = tempDir();
  try {
    const deps = fakeDeps(MIDNIGHT + 1000);
    const open = () =>
      openStore(
        { path: join(scratch.dir, "iynk.db"), sync: "normal", migrationsDir: MIGRATIONS_DIR, backupsDir: join(scratch.dir, "backups"), serverVersion: "test" },
        deps,
      );
    const first = open();
    addDevice(first, "dev_a");
    for (let i = 0; i < 3; i += 1) assert.equal(first.transaction((tx) => countRelayCall(tx, deps.clock, "dev_a", "relay:anthropic", 3)).ok, true);
    first.close();
    const second = open();
    assert.equal(second.transaction((tx) => countRelayCall(tx, deps.clock, "dev_a", "relay:anthropic", 3)).ok, false);
    second.close();
  } finally {
    scratch.remove();
  }
});

test("the migration applies on a database made by the previous last migration", () => {
  const scratch = tempDir();
  try {
    const deps = fakeDeps();
    const older = join(scratch.dir, "older");
    mkdirSync(older);
    cpSync(join(MIGRATIONS_DIR, "0001_identity.sql"), join(older, "0001_identity.sql"));
    const options = { path: join(scratch.dir, "iynk.db"), sync: "normal" as const, backupsDir: join(scratch.dir, "backups"), serverVersion: "test" };
    const before = openStore({ ...options, migrationsDir: older }, deps);
    assert.equal(before.schemaVersion(), 1);
    addDevice(before, "dev_a");
    before.close();
    const after = openStore({ ...options, migrationsDir: MIGRATIONS_DIR }, deps);
    assert.equal(after.schemaVersion(), 2);
    assert.equal(after.transaction((tx) => countRelayCall(tx, deps.clock, "dev_a", "relay:anthropic", 1)).ok, true);
    assert.throws(() => after.transaction((tx) => tx.run("INSERT INTO api_tokens (id, kind, token_hash, scopes, created_at) VALUES ('t', 'other', x'01', '', 1)")));
    after.close();
  } finally {
    scratch.remove();
  }
});
