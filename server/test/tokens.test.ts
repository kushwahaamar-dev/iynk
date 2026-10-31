import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { registerDevice, revokeDevice } from "../src/identity/devices.ts";
import { loginDevice, mintToken, revokeAllSessions, revokeSession, TOKEN_PREFIX, touchSession, verifyToken } from "../src/identity/tokens.ts";
import { openStore } from "../src/store/sqlite.ts";
import { fakeDeps, memoryStore, MIGRATIONS_DIR, tempDir } from "./helpers.ts";
import { makeDeviceKey } from "./keys.ts";

const HOUR = 3_600_000;
const TTL = 12 * HOUR;

function setup() {
  const deps = fakeDeps();
  const store = memoryStore(deps);
  const key = makeDeviceKey();
  store.transaction((tx) => registerDevice(tx, deps, { spki: key.spki, displayName: "Ada", maxIdentities: 100 }));
  const mint = () => store.transaction((tx) => mintToken(tx, deps, key.deviceId, TTL, "test"));
  const verify = (token: string | null) => store.read((tx) => verifyToken(tx, deps, token));
  return { deps, store, key, mint, verify };
}

describe("mintToken and verifyToken", () => {
  test("a minted token has the documented shape and verifies", () => {
    const { deps, key, mint, verify } = setup();
    const minted = mint();
    assert.match(minted.token, /^iynk_at_[A-Za-z0-9_-]{43}$/);
    assert.ok(minted.token.startsWith(TOKEN_PREFIX));
    assert.match(minted.sessionId, /^ses_[a-z2-7]{16}$/);
    assert.equal(minted.expiresAt, deps.clock.now() + TTL);
    assert.deepEqual(verify(minted.token), {
      authed: { deviceId: key.deviceId, identityId: key.identityId, role: "owner", sessionId: minted.sessionId, name: "Ada", deleting: false },
      touch: false,
    });
  });

  test("the token expires at its time", () => {
    const { deps, mint, verify } = setup();
    const { token } = mint();
    deps.advance(TTL - 1);
    assert.notEqual(verify(token).authed, null);
    deps.advance(1);
    assert.equal(verify(token).authed, null);
  });

  test("all five failure causes give the same result", () => {
    const { deps, store, mint, verify } = setup();
    const valid = mint().token;
    const expired = mint();
    const revoked = mint();
    store.transaction((tx) => tx.run("UPDATE sessions SET expires_at = ? WHERE id = ?", deps.clock.now() - 1, expired.sessionId));
    store.transaction((tx) => tx.run("UPDATE sessions SET revoked_at = 1 WHERE id = ?", revoked.sessionId));
    const forged = `${TOKEN_PREFIX}${"B".repeat(43)}`;
    assert.notEqual(verify(valid).authed, null);
    const results = [verify(null), verify(`${valid} `), verify(expired.token), verify(forged), verify(revoked.token)];
    for (const result of results) assert.deepEqual(result, { authed: null, touch: false });
  });

  test("malformed values never match", () => {
    const { mint, verify } = setup();
    const { token } = mint();
    const wrongPrefix = `iynk_xx_${token.slice(TOKEN_PREFIX.length)}`;
    for (const bad of ["", "Bearer", token.slice(0, -1), `${token}A`, ` ${token}`, token.toUpperCase(), wrongPrefix, "x".repeat(100_000)]) {
      assert.deepEqual(verify(bad), { authed: null, touch: false });
    }
  });

  test("a revoked device's old token stops working", () => {
    const { deps, store, key, mint, verify } = setup();
    const { token } = mint();
    store.transaction((tx) => revokeDevice(tx, key.deviceId, deps.clock.now()));
    assert.equal(verify(token).authed, null);
  });

  test("the failure causes take about the same time", () => {
    const { deps, store, mint, verify } = setup();
    const expired = mint();
    const revoked = mint();
    store.transaction((tx) => tx.run("UPDATE sessions SET expires_at = ? WHERE id = ?", deps.clock.now() - 1, expired.sessionId));
    store.transaction((tx) => tx.run("UPDATE sessions SET revoked_at = 1 WHERE id = ?", revoked.sessionId));
    const cases = [null, "iynk_at_short", expired.token, `${TOKEN_PREFIX}${"C".repeat(43)}`, revoked.token];
    const medians = cases.map((presented) => {
      const samples: number[] = [];
      for (let i = 0; i < 1000; i += 1) {
        const start = process.hrtime.bigint();
        verify(presented);
        samples.push(Number(process.hrtime.bigint() - start) / 1e6);
      }
      return samples.sort((a, b) => a - b)[500];
    });
    assert.ok(Math.max(...medians) - Math.min(...medians) < 2, `medians ${medians.join(", ")}`);
  });

  test("verifyToken inside a read-only transaction works and touch turns true after 60 seconds", () => {
    const { deps, store, mint, verify } = setup();
    const { token } = mint();
    deps.advance(59_999);
    assert.equal(verify(token).touch, false);
    deps.advance(1);
    assert.equal(store.read((tx) => verifyToken(tx, deps, token)).touch, true);
  });

  test("touchSession updates both columns and clears touch", () => {
    const { deps, store, key, mint, verify } = setup();
    const minted = mint();
    deps.advance(5 * 60_000);
    store.transaction((tx) => touchSession(tx, deps, minted.sessionId));
    const session = store.read((tx) => tx.get<{ last_used_at: number }>("SELECT last_used_at FROM sessions WHERE id = ?", minted.sessionId));
    const device = store.read((tx) => tx.get<{ last_seen_at: number }>("SELECT last_seen_at FROM devices WHERE id = ?", key.deviceId));
    assert.equal(session?.last_used_at, deps.clock.now());
    assert.equal(device?.last_seen_at, deps.clock.now());
    assert.equal(verify(minted.token).touch, false);
  });

  test("a scheduled deletion still verifies and flags deleting; a purged one does not", () => {
    const { deps, store, key, mint, verify } = setup();
    const { token } = mint();
    const now = deps.clock.now();
    store.transaction((tx) => tx.run("UPDATE devices SET deletion_requested_at = ?, deletion_at = ? WHERE id = ?", now, now + HOUR, key.deviceId));
    assert.equal(verify(token).authed?.deleting, true);
    deps.advance(HOUR);
    assert.deepEqual(verify(token), { authed: null, touch: false });
  });

  test("revoking one session leaves the others, revoking all ends them", () => {
    const { deps, store, key, mint, verify } = setup();
    const a = mint();
    const b = mint();
    const c = mint();
    assert.equal(store.transaction((tx) => revokeSession(tx, key.deviceId, a.sessionId, deps.clock.now())), true);
    assert.equal(store.transaction((tx) => revokeSession(tx, key.deviceId, a.sessionId, deps.clock.now())), false);
    assert.equal(store.transaction((tx) => revokeSession(tx, "dev_other", b.sessionId, deps.clock.now())), false);
    assert.equal(verify(a.token).authed, null);
    assert.notEqual(verify(b.token).authed, null);
    assert.equal(store.transaction((tx) => revokeAllSessions(tx, key.deviceId, deps.clock.now())), 2);
    assert.equal(verify(b.token).authed, null);
    assert.equal(verify(c.token).authed, null);
  });

  test("the 21st live session revokes the oldest", () => {
    const { deps, mint, verify } = setup();
    const minted = [];
    for (let i = 0; i < 21; i += 1) {
      minted.push(mint());
      deps.advance(1);
    }
    assert.equal(verify(minted[0].token).authed, null);
    assert.notEqual(verify(minted[1].token).authed, null);
    assert.notEqual(verify(minted[20].token).authed, null);
  });
});

describe("loginDevice", () => {
  const INPUT = "iynk.auth.v1\nlogin\naud\nchl\nnonce\nthumb";

  function login(s: ReturnType<typeof setup>, over: { signer?: ReturnType<typeof makeDeviceKey>; identityId?: string; thumbprint?: string } = {}) {
    const signer = over.signer ?? s.key;
    return s.store.transaction((tx) =>
      loginDevice(tx, s.deps, {
        identityId: over.identityId ?? s.key.identityId,
        thumbprint: over.thumbprint ?? s.key.thumbprint,
        signingInput: INPUT,
        signature: signer.sign(INPUT),
        ttlMs: TTL,
        client: null,
      }),
    );
  }

  test("a valid signature mints a token that verifies", () => {
    const s = setup();
    const result = login(s);
    assert.equal(result?.deviceId, s.key.deviceId);
    assert.notEqual(s.verify(result?.token ?? null).authed, null);
  });

  test("a wrong key, an unknown identity and a wrong thumbprint all fail", () => {
    const s = setup();
    assert.equal(login(s, { signer: makeDeviceKey() }), null);
    assert.equal(login(s, { identityId: "usr_unknown" }), null);
    assert.equal(login(s, { thumbprint: "other" }), null);
  });

  test("a revoked device cannot log in", () => {
    const s = setup();
    s.store.transaction((tx) => revokeDevice(tx, s.key.deviceId, s.deps.clock.now()));
    assert.equal(login(s), null);
  });

  test("a scheduled deletion may log in, a purged identity may not", () => {
    const s = setup();
    const now = s.deps.clock.now();
    s.store.transaction((tx) => tx.run("UPDATE devices SET deletion_requested_at = ?, deletion_at = ?", now, now + HOUR));
    assert.notEqual(login(s), null);
    s.deps.advance(HOUR);
    assert.equal(login(s), null);
  });
});

describe("token storage", () => {
  test("an issued token is nowhere in the database file or its log", () => {
    const dir = tempDir();
    const deps = fakeDeps();
    const path = join(dir.dir, "data", "iynk.db");
    const store = openStore({ path, sync: "normal", migrationsDir: MIGRATIONS_DIR, backupsDir: join(dir.dir, "backups"), serverVersion: "test" }, deps);
    try {
      const key = makeDeviceKey();
      store.transaction((tx) => registerDevice(tx, deps, { spki: key.spki, displayName: "Ada", maxIdentities: 100 }));
      const { token } = store.transaction((tx) => mintToken(tx, deps, key.deviceId, TTL, null));
      const secret = token.slice(TOKEN_PREFIX.length);
      for (const file of [path, `${path}-wal`]) {
        if (!existsSync(file)) continue;
        const bytes = readFileSync(file).toString("latin1");
        assert.ok(!bytes.includes(token));
        assert.ok(!bytes.includes(secret));
      }
      assert.ok(existsSync(`${path}-wal`));
    } finally {
      store.close();
      dir.remove();
    }
  });
});
