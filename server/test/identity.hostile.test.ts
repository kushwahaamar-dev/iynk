import assert from "node:assert/strict";
import { randomBytes, sign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { fromBase64Url, keyThumbprint, toBase64Url } from "../../src/protocol/identity.ts";
import { revokeDevice } from "../src/identity/devices.ts";
import { openStore } from "../src/store/sqlite.ts";
import { bearer, challengeFor, enrol, newCode, send, signIn, type Answer } from "./enrol-flow.ts";
import { fakeDeps, MIGRATIONS_DIR, tempDir } from "./helpers.ts";
import { startApp, TEST_ORIGIN, type Running } from "./http-helpers.ts";
import { makeDeviceKey } from "./keys.ts";

const MINUTE = 61_000;
const HOUR = 3_600_000;
const FIXED_ID = "req_fixed_0001";

const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.();
});

async function boot(env: Record<string, string> = {}, onDisk = false): Promise<Running & { dir: string }> {
  const scratch = tempDir();
  cleanups.push(() => scratch.remove());
  const deps = fakeDeps();
  const store = onDisk
    ? openStore({ path: join(scratch.dir, "iynk.db"), sync: "normal", migrationsDir: MIGRATIONS_DIR, backupsDir: join(scratch.dir, "backups"), serverVersion: "test" }, deps)
    : undefined;
  const run = await startApp({ env, ...(store && { store }) });
  cleanups.push(() => run.stop());
  return Object.assign(run, { dir: scratch.dir });
}

const refused = (status: number) => status === 400 || status === 401 || status === 403 || status === 409 || status === 429;

const deviceCount = (run: Running) => run.app.store.read((tx) => tx.get<{ n: number }>("SELECT COUNT(*) AS n FROM devices")?.n);

const me = (run: Running, headers: Record<string, string>) => send(run, "GET", "/v1/identities/me", undefined, { "x-request-id": FIXED_ID, ...headers });

async function snapshot(run: Running, headers: Record<string, string>) {
  run.deps.advance(MINUTE);
  const res = await fetch(`${run.base}/v1/identities/me`, { headers: { "x-request-id": FIXED_ID, ...headers } });
  const entries = [...res.headers.entries()].filter(([name]) => name !== "date");
  return { status: res.status, headers: entries.sort(([a], [b]) => a.localeCompare(b)), body: await res.text() };
}

describe("tokens", () => {
  test("R-077 forged token", async () => {
    const run = await boot();
    const forged = `iynk_at_${toBase64Url(randomBytes(32))}`;
    assert.equal((await me(run, bearer(forged))).status, 401);
  });

  test("R-077 expired token", async () => {
    const run = await boot();
    const token = (await enrol(run, makeDeviceKey())).body.accessToken.token as string;
    assert.equal((await me(run, bearer(token))).status, 200);
    run.deps.advance(12 * HOUR + 1000);
    assert.equal((await me(run, bearer(token))).status, 401);
  });

  test("R-077 revoked token", async () => {
    const run = await boot();
    const token = (await enrol(run, makeDeviceKey())).body.accessToken.token as string;
    assert.equal((await send(run, "DELETE", "/v1/auth/tokens/current", undefined, bearer(token))).status, 204);
    assert.equal((await me(run, bearer(token))).status, 401);
  });

  test("R-077 revoked device", async () => {
    const run = await boot();
    const key = makeDeviceKey();
    const token = (await enrol(run, key)).body.accessToken.token as string;
    run.app.store.transaction((tx) => revokeDevice(tx, key.deviceId, run.deps.clock.now()));
    assert.equal((await me(run, bearer(token))).status, 401);
    run.deps.advance(MINUTE);
    assert.equal((await signIn(run, key)).status, 401);
  });

  test("R-077 malformed authorization headers", async () => {
    const run = await boot();
    const token = (await enrol(run, makeDeviceKey())).body.accessToken.token as string;
    const headers = ["Bearer", "Bearer ", "bearer x", `Basic ${token}`, token, `Bearer iynk_pat_${token.slice(8)}`, `Bearer ${token.slice(0, -1)}`, `Bearer ${token}x`, `Bearer ${token} ${token}`];
    for (const authorization of headers) {
      run.deps.advance(1000);
      assert.equal((await me(run, { authorization })).status, 401, authorization);
    }
  });

  test("BA-03 five failure causes answer with the same bytes", async () => {
    const run = await boot();
    const key = makeDeviceKey();
    const expiring = (await enrol(run, key)).body.accessToken.token as string;
    run.deps.advance(MINUTE);
    const revoking = (await signIn(run, key)).body.token as string;
    assert.equal((await send(run, "DELETE", "/v1/auth/tokens/current", undefined, bearer(revoking))).status, 204);
    run.deps.advance(13 * HOUR);

    const causes = {
      missing: {},
      malformed: bearer("not-a-token"),
      expired: bearer(expiring),
      forged: bearer(`iynk_at_${toBase64Url(randomBytes(32))}`),
      revoked: bearer(revoking),
    };
    const answers = new Map<string, Awaited<ReturnType<typeof snapshot>>>();
    for (const [name, headers] of Object.entries(causes)) answers.set(name, await snapshot(run, headers));
    const first = answers.get("missing");
    assert.equal(first?.status, 401);
    for (const [name, answer] of answers) assert.deepEqual(answer, first, name);
  });

  test("BA-03 median latency of the five causes differs by under 2 ms", async () => {
    const run = await boot();
    const key = makeDeviceKey();
    const expiring = (await enrol(run, key)).body.accessToken.token as string;
    run.deps.advance(MINUTE);
    const revoking = (await signIn(run, key)).body.token as string;
    await send(run, "DELETE", "/v1/auth/tokens/current", undefined, bearer(revoking));
    run.deps.advance(13 * HOUR);

    const causes: Record<string, Record<string, string>> = {
      missing: {},
      malformed: bearer("not-a-token"),
      expired: bearer(expiring),
      forged: bearer(`iynk_at_${toBase64Url(randomBytes(32))}`),
      revoked: bearer(revoking),
    };
    const names = Object.keys(causes);

    async function measure(): Promise<number> {
      const samples = new Map(names.map((name) => [name, [] as number[]]));
      for (let round = 0; round < 1000; round += 1) {
        for (let i = 0; i < names.length; i += 1) {
          const name = names[(round + i) % names.length] as string;
          run.deps.advance(1000);
          const started = performance.now();
          const res = await fetch(`${run.base}/v1/identities/me`, { headers: causes[name] as Record<string, string> });
          await res.text();
          samples.get(name)?.push(performance.now() - started);
          assert.equal(res.status, 401, name);
        }
      }
      const medians = [...samples.values()].map((values) => values.sort((a, b) => a - b)[500] as number);
      return Math.max(...medians) - Math.min(...medians);
    }

    let spread = await measure();
    if (spread >= 2) spread = await measure();
    assert.ok(spread < 2, `medians differ by ${spread.toFixed(3)} ms`);
  });

  test("BA-03 a 1 MB Authorization header is cut off before any handler and the server stays up", async () => {
    const run = await boot();
    const outcome = await new Promise<number | "closed">((resolve) => {
      const req = request(`${run.base}/v1/identities/me`, { headers: { authorization: `Bearer ${"A".repeat(1024 * 1024)}` } }, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      });
      req.on("error", () => resolve("closed"));
      req.end();
    });
    assert.ok(outcome === 431 || outcome === "closed", String(outcome));
    assert.equal((await send(run, "GET", "/v1/server")).status, 200);
  });

  test("BA-03 an issued token is not in iynk.db or its write-ahead log", async () => {
    const run = await boot({}, true);
    const key = makeDeviceKey();
    const first = (await enrol(run, key)).body.accessToken.token as string;
    run.deps.advance(MINUTE);
    const second = (await signIn(run, key)).body.token as string;
    const wal = join(run.dir, "iynk.db-wal");
    assert.ok(existsSync(wal), "the write-ahead log should exist while the store is open");
    for (const file of [join(run.dir, "iynk.db"), wal]) {
      const bytes = readFileSync(file);
      assert.ok(bytes.length > 0, file);
      for (const token of [first, second]) {
        assert.equal(bytes.includes(Buffer.from(token)), false, `${file} holds a token as text`);
        assert.equal(bytes.includes(Buffer.from(fromBase64Url(token.slice(8)) as Uint8Array)), false, `${file} holds a token as bytes`);
      }
    }
  });
});

describe("enrolment", () => {
  test("R-097 1000 attempts without a code create nobody", async () => {
    const run = await boot();
    const key = makeDeviceKey();
    for (let i = 0; i < 1000; i += 1) {
      run.deps.advance(13_000);
      const challenge = await challengeFor(run, { purpose: "register", keyThumbprint: key.thumbprint });
      const res = await send(run, "POST", "/v1/identities", {
        challengeId: challenge.challengeId,
        signature: key.sign(challenge.signingInput),
        publicKey: toBase64Url(key.spki),
        displayName: "Mallory",
      });
      assert.ok(res.status === 401 || res.status === 429, `attempt ${i}: ${res.status}`);
    }
    assert.equal(deviceCount(run), 0);
  });

  test("R-097 a spent code cannot enrol a second key", async () => {
    const run = await boot();
    const code = newCode(run);
    assert.equal((await enrol(run, makeDeviceKey(), { enrollmentCode: code })).status, 201);
    run.deps.advance(MINUTE);
    assert.equal((await enrol(run, makeDeviceKey(), { enrollmentCode: code })).status, 401);
    assert.equal(deviceCount(run), 1);
  });

  test("R-097 an expired code is refused", async () => {
    const run = await boot();
    const code = newCode(run);
    run.deps.advance(25 * HOUR);
    assert.equal((await enrol(run, makeDeviceKey(), { enrollmentCode: code })).status, 401);
    assert.equal(deviceCount(run), 0);
  });

  test("R-097 closed mode refuses a valid code", async () => {
    const run = await boot({ IYNK_ENROL: "closed" });
    assert.equal((await enrol(run, makeDeviceKey())).status, 401);
    assert.equal(deviceCount(run), 0);
  });

  test("R-097 a second enrolment of the same key is refused and mints no token", async () => {
    const run = await boot();
    const key = makeDeviceKey();
    assert.equal((await enrol(run, key)).status, 201);
    run.deps.advance(MINUTE);
    const again = await enrol(run, key);
    assert.equal(again.status, 409);
    assert.equal(again.body.accessToken, undefined);
    assert.equal(deviceCount(run), 1);
  });
});

describe("signatures", () => {
  test("R-097 a replayed registration challenge is refused", async () => {
    const run = await boot();
    const key = makeDeviceKey();
    const challenge = await challengeFor(run, { purpose: "register", keyThumbprint: key.thumbprint });
    const body = (enrollmentCode: string) => ({
      challengeId: challenge.challengeId,
      signature: key.sign(challenge.signingInput),
      publicKey: toBase64Url(key.spki),
      displayName: "Ada",
      enrollmentCode,
    });
    assert.equal((await send(run, "POST", "/v1/identities", body(newCode(run)))).status, 201);
    const replay = await send(run, "POST", "/v1/identities", body(newCode(run)));
    assert.equal(replay.status, 401);
    assert.equal(deviceCount(run), 1);
  });

  test("R-097 a replayed login challenge is refused", async () => {
    const run = await boot();
    const key = makeDeviceKey();
    await enrol(run, key);
    const challenge = await challengeFor(run, { purpose: "login", identityId: key.identityId });
    const body = { challengeId: challenge.challengeId, signature: key.sign(challenge.signingInput) };
    assert.equal((await send(run, "POST", "/v1/auth/tokens", body)).status, 201);
    assert.equal((await send(run, "POST", "/v1/auth/tokens", body)).status, 401);
  });

  test("R-097 a login signed by another key is refused", async () => {
    const run = await boot();
    const key = makeDeviceKey();
    await enrol(run, key);
    const challenge = await challengeFor(run, { purpose: "login", identityId: key.identityId });
    const res = await send(run, "POST", "/v1/auth/tokens", { challengeId: challenge.challengeId, signature: makeDeviceKey().sign(challenge.signingInput) });
    assert.equal(res.status, 401);
    assert.equal(res.body.token, undefined);
  });

  test("R-097 a registration signed by another key is refused", async () => {
    const run = await boot();
    const key = makeDeviceKey();
    const challenge = await challengeFor(run, { purpose: "register", keyThumbprint: key.thumbprint });
    const res = await send(run, "POST", "/v1/identities", {
      challengeId: challenge.challengeId,
      signature: makeDeviceKey().sign(challenge.signingInput),
      publicKey: toBase64Url(key.spki),
      displayName: "Ada",
      enrollmentCode: newCode(run),
    });
    assert.equal(res.status, 401);
    assert.equal(deviceCount(run), 0);
  });

  test("R-097 a DER encoded signature is refused", async () => {
    const run = await boot();
    const key = makeDeviceKey();
    await enrol(run, key);
    run.deps.advance(MINUTE);
    const challenge = await challengeFor(run, { purpose: "login", identityId: key.identityId });
    const der = toBase64Url(new Uint8Array(sign("sha256", Buffer.from(challenge.signingInput, "utf8"), key.privateKey)));
    const res = await send(run, "POST", "/v1/auth/tokens", { challengeId: challenge.challengeId, signature: der });
    assert.ok(refused(res.status) && res.status !== 409, String(res.status));
    assert.equal(res.body.token, undefined);
  });

  test("R-097 an off-curve public key is refused", async () => {
    const run = await boot();
    const signer = makeDeviceKey();
    const bad = Uint8Array.from(signer.spki);
    bad[bad.length - 1] = (bad[bad.length - 1] as number) ^ 0xff;
    const challenge = await challengeFor(run, { purpose: "register", keyThumbprint: keyThumbprint(bad) });
    const res = await send(run, "POST", "/v1/identities", {
      challengeId: challenge.challengeId,
      signature: signer.sign(challenge.signingInput),
      publicKey: toBase64Url(bad),
      displayName: "Ada",
      enrollmentCode: newCode(run),
    });
    assert.ok(res.status === 400 || res.status === 401, String(res.status));
    assert.equal(deviceCount(run), 0);
  });
});

describe("network edge", () => {
  test("C7 spoofed forwarded address", async () => {
    const run = await boot({ IYNK_TRUST_PROXY: "0" });
    const statuses: number[] = [];
    for (let i = 0; i < 25; i += 1) {
      const res = await send(run, "POST", "/v1/auth/challenges", { purpose: "register", keyThumbprint: makeDeviceKey().thumbprint }, { "x-forwarded-for": `203.0.113.${i + 1}` });
      statuses.push(res.status);
    }
    assert.deepEqual(statuses.slice(0, 20), Array(20).fill(201));
    assert.deepEqual(statuses.slice(20), Array(5).fill(429));
  });

  test("C7 CORS never answers with a wildcard", async () => {
    const run = await boot();
    const seen: Answer[] = [];
    seen.push(await send(run, "GET", "/v1/server"));
    seen.push(await send(run, "GET", "/v1/server", undefined, { origin: TEST_ORIGIN }));
    seen.push(await send(run, "GET", "/v1/server", undefined, { origin: "*" }));
    seen.push(await send(run, "GET", "/v1/server", undefined, { origin: "null" }));
    const preflight = await fetch(`${run.base}/v1/identities/me`, { method: "OPTIONS", headers: { origin: TEST_ORIGIN, "access-control-request-method": "GET" } });
    for (const answer of seen) assert.notEqual(answer.headers.get("access-control-allow-origin"), "*");
    assert.equal(preflight.headers.get("access-control-allow-origin"), TEST_ORIGIN);
    assert.equal(seen[1]?.headers.get("access-control-allow-origin"), TEST_ORIGIN);
  });

  test("C7 a foreign origin is refused", async () => {
    const run = await boot();
    const res = await send(run, "GET", "/v1/server", undefined, { origin: "https://evil.example" });
    assert.equal(res.status, 403);
    assert.equal(res.headers.get("access-control-allow-origin"), null);
    const post = await send(run, "POST", "/v1/auth/challenges", { purpose: "register", keyThumbprint: makeDeviceKey().thumbprint }, { origin: "https://evil.example" });
    assert.equal(post.status, 403);
    assert.equal(post.headers.get("access-control-allow-origin"), null);
  });
});
