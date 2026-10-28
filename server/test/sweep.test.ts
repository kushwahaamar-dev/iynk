import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { sha256Bytes } from "../../src/core/sha256.ts";
import { utf8Encode } from "../../src/core/canonical.ts";
import { createEnrolmentCode } from "../src/identity/enrol.ts";
import { createLogger } from "../src/ops/log.ts";
import { startSweep, sweepOnce } from "../src/ops/sweep.ts";
import { bearer, enrol, send } from "./enrol-flow.ts";
import { startApp, type Running } from "./http-helpers.ts";
import { makeDeviceKey } from "./keys.ts";

const DAY = 86_400_000;

let run: Running | undefined;

afterEach(async () => {
  await run?.stop();
  run = undefined;
});

const rows = (r: Running, table: string) => r.app.store.read((tx) => tx.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`)?.n);

function addSession(r: Running, deviceId: string, id: string, expiresAt: number, revokedAt: number | null): void {
  r.app.store.transaction((tx) =>
    tx.run(
      "INSERT INTO sessions (id, device_id, token_hash, created_at, expires_at, revoked_at, last_used_at) VALUES (?, ?, ?, 0, ?, ?, 0)",
      id,
      deviceId,
      sha256Bytes(utf8Encode(id)),
      expiresAt,
      revokedAt,
    ),
  );
}

function addPairing(r: Running, creator: string, id: string, expiresAt: number): void {
  r.app.store.transaction((tx) =>
    tx.run("INSERT INTO pairings (id, creator, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, 0)", id, creator, sha256Bytes(utf8Encode(id)), expiresAt),
  );
}

describe("sweepOnce", () => {
  test("a session goes seven days after it expired or was revoked, not before", async () => {
    run = await startApp();
    const key = makeDeviceKey();
    await enrol(run, key);
    const now = run.deps.clock.now();
    addSession(run, key.deviceId, "ses_expired_old", now - 7 * DAY - 1, null);
    addSession(run, key.deviceId, "ses_expired_edge", now - 7 * DAY, null);
    addSession(run, key.deviceId, "ses_revoked_old", now + DAY, now - 7 * DAY - 1);
    addSession(run, key.deviceId, "ses_revoked_edge", now + DAY, now - 7 * DAY);
    const live = rows(run, "sessions");
    assert.equal(sweepOnce(run.app.store, run.deps).sessions, 2);
    assert.equal(rows(run, "sessions"), (live as number) - 2);
    const left = run.app.store.read((tx) => tx.all<{ id: string }>("SELECT id FROM sessions WHERE id LIKE 'ses_%_%'").map((row) => row.id));
    assert.ok(left.includes("ses_expired_edge") && left.includes("ses_revoked_edge"));
  });

  test("a code or pairing is kept one day past its expiry, then deleted", async () => {
    run = await startApp();
    const key = makeDeviceKey();
    await enrol(run, key);
    const { expiresAt } = run.app.store.transaction((tx) => createEnrolmentCode(tx, run!.deps));
    addPairing(run, key.deviceId, "pair_edge", run.deps.clock.now() - DAY);
    addPairing(run, key.deviceId, "pair_old", run.deps.clock.now() - DAY - 1);
    const codes = rows(run, "enrollment_codes") as number;

    assert.deepEqual(sweepOnce(run.app.store, run.deps), { sessions: 0, codes: 0, pairings: 1, identities: 0 });
    run.deps.advance(expiresAt + DAY - run.deps.clock.now());
    assert.equal(sweepOnce(run.app.store, run.deps).codes, 0);
    run.deps.advance(1);
    assert.equal(sweepOnce(run.app.store, run.deps).codes, codes);
    assert.equal(rows(run, "enrollment_codes"), 0);
  });

  test("live rows are never touched", async () => {
    run = await startApp();
    const ada = makeDeviceKey();
    const answer = await enrol(run, ada);
    const bob = makeDeviceKey();
    await enrol(run, bob);
    const made = await send(run, "POST", "/v1/pairings", {}, bearer(answer.body.accessToken.token));
    assert.equal(made.status, 201);
    const before = [rows(run, "devices"), rows(run, "sessions"), rows(run, "pairings"), rows(run, "enrollment_codes")];
    assert.deepEqual(sweepOnce(run.app.store, run.deps), { sessions: 0, codes: 0, pairings: 0, identities: 0 });
    assert.deepEqual([rows(run, "devices"), rows(run, "sessions"), rows(run, "pairings"), rows(run, "enrollment_codes")], before);
  });

  test("a device due for deletion that redeemed a code and a pairing goes without a foreign key error", async () => {
    run = await startApp();
    const ada = makeDeviceKey();
    const bob = makeDeviceKey();
    const first = await enrol(run, ada);
    const second = await enrol(run, bob);
    const made = await send(run, "POST", "/v1/pairings", {}, bearer(first.body.accessToken.token));
    await send(run, "POST", "/v1/pairings/redeem", { pairing: { code: made.body.code } }, bearer(second.body.accessToken.token));
    const now = run.deps.clock.now();
    run.app.store.transaction((tx) => tx.run("UPDATE devices SET deletion_requested_at = ?, deletion_at = ? WHERE id = ?", now - 1, now, bob.deviceId));

    assert.equal(sweepOnce(run.app.store, run.deps).identities, 1);
    assert.equal(run.app.store.read((tx) => tx.get<{ n: number }>("SELECT COUNT(*) AS n FROM devices WHERE id = ?", bob.deviceId)?.n), 0);
    assert.equal(rows(run, "buddies"), 0);
    assert.equal(run.app.store.read((tx) => tx.get<{ n: number }>("SELECT COUNT(*) AS n FROM pairings WHERE used_by IS NULL AND used_at IS NOT NULL")?.n), 1);
    assert.equal(run.app.store.read((tx) => tx.get<{ n: number }>("SELECT COUNT(*) AS n FROM enrollment_codes WHERE used_by IS NULL AND used_at IS NOT NULL")?.n), 1);
  });
});

describe("startSweep", () => {
  test("sweeps on the timer, logs a swept line, and stops", async () => {
    run = await startApp();
    const lines: string[] = [];
    const log = createLogger({ level: "info", write: (line) => lines.push(line) });
    const sweep = startSweep(run.app.store, run.deps, log, 5);
    await new Promise((resolve) => setTimeout(resolve, 40));
    sweep.stop();
    const seen = lines.length;
    assert.ok(seen > 0);
    assert.ok(lines.every((line) => JSON.parse(line).msg === "swept"));
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(lines.length, seen);
  });
});
