import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { listBuddies } from "../src/buddies/list.ts";
import { createPairing, findPairing, listPairings, redeem, revokePairing, strike, type PairingRef } from "../src/buddies/pairing.ts";
import { registerDevice } from "../src/identity/devices.ts";
import type { Authed } from "../src/http/classes.ts";
import { ApiError } from "../src/http/errors.ts";
import type { ServerStore } from "../src/store/port.ts";
import { openStore } from "../src/store/sqlite.ts";
import { fakeDeps, MIGRATIONS_DIR, memoryStore, tempDir, type FakeDeps } from "./helpers.ts";
import { makeDeviceKey } from "./keys.ts";

const HOUR = 3_600_000;

let deps: FakeDeps;
let store: ServerStore;

function person(name: string, extra: Partial<Authed> = {}): Authed {
  const key = makeDeviceKey();
  const added = store.transaction((tx) => registerDevice(tx, deps, { spki: key.spki, displayName: name, maxIdentities: 500 }));
  assert.ok(added !== "full" && added !== "exists");
  return { deviceId: key.deviceId, identityId: key.identityId, role: "member", sessionId: "ses_x", name, deleting: false, ...extra };
}

const make = (who: Authed, o: { label?: string; ttlSeconds?: number } = {}) => store.transaction((tx) => createPairing(tx, deps, who, o));
const tryRedeem = (who: Authed, ref: PairingRef) => store.transaction((tx) => redeem(tx, deps, who, ref));
const wrongCode = (code: string) => `${code.slice(0, 4)}-${code[5] === "0" ? "111111" : "000000"}`;

afterEach(() => {
  store?.close();
});

describe("creating", () => {
  test("shapes: 22 character token, XXXX-XXXXXX code, default lifetimes", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    const made = make(person("Ada"));
    assert.match(made.token, /^[A-Za-z0-9_-]{22}$/);
    assert.match(made.code, /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{6}$/);
    assert.match(made.id, /^pair_[a-z2-7]+$/);
    assert.equal(made.expiresAt - made.createdAt, 86_400_000);
    assert.equal(made.codeExpiresAt - made.createdAt, 600_000);
  });

  test("a short link lifetime shortens the code to match", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    const made = make(person("Ada"), { ttlSeconds: 300 });
    assert.equal(made.codeExpiresAt, made.expiresAt);
  });

  test("the 21st open pairing is refused, a revoked one frees a place", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    const ada = person("Ada");
    const first = make(ada);
    for (let i = 1; i < 20; i++) make(ada);
    assert.throws(() => make(ada), (e) => e instanceof ApiError && e.status === 409 && e.code === "quota");
    store.transaction((tx) => revokePairing(tx, ada.deviceId, first.id, deps.clock.now()));
    assert.doesNotThrow(() => make(ada));
  });

  test("an identity with a scheduled deletion creates nothing", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    assert.throws(() => make(person("Ada", { deleting: true })), (e) => e instanceof ApiError && e.status === 403 && e.code === "forbidden");
  });
});

describe("BA-04", () => {
  test("five wrong secrets delete the code, the sixth try with the right secret fails, the link still redeems", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    const ada = person("Ada");
    const bob = person("Bob");
    const made = make(ada);
    const channel = made.code.slice(0, 4);
    const strikes = Array.from({ length: 5 }, () => store.transaction((tx) => strike(tx, channel)));
    assert.deepEqual(strikes, [false, false, false, false, true]);
    assert.equal(tryRedeem(bob, { code: made.code }), "gone");
    assert.equal(store.read((tx) => findPairing(tx, { code: made.code }, deps.clock.now())), null);
    const result = tryRedeem(bob, { token: made.token });
    assert.ok(typeof result === "object");
    assert.equal(result.buddy.displayName, "Ada");
  });

  test("expired code, used code, revoked code and wrong code are the same null", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    const ada = person("Ada");
    const bob = person("Bob");
    const expired = make(ada);
    const used = make(ada);
    const revoked = make(ada);
    const live = make(ada);
    assert.ok(typeof tryRedeem(bob, { code: used.code }) === "object");
    store.transaction((tx) => revokePairing(tx, ada.deviceId, revoked.id, deps.clock.now()));
    deps.advance(601_000);
    const tail = make(ada);
    const answers = [expired, used, revoked].map((m) => store.read((tx) => findPairing(tx, { code: m.code }, deps.clock.now())));
    answers.push(store.read((tx) => findPairing(tx, { code: wrongCode(tail.code) }, deps.clock.now())));
    answers.push(store.read((tx) => findPairing(tx, { code: "ZZZZ-ZZZZZZ" }, deps.clock.now())));
    for (const answer of answers) assert.equal(answer, null);
    assert.equal(store.read((tx) => findPairing(tx, { token: live.token }, deps.clock.now()))?.id, live.id);
  });

  test("a link works once", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    const made = make(person("Ada"));
    assert.ok(typeof tryRedeem(person("Bob"), { token: made.token }) === "object");
    assert.equal(tryRedeem(person("Cy"), { token: made.token }), "gone");
  });

  test("the code dies at second 600 exactly while the link lives", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    const made = make(person("Ada"));
    deps.advance(599_999);
    assert.ok(store.read((tx) => findPairing(tx, { code: made.code }, deps.clock.now())));
    deps.advance(1);
    assert.equal(store.read((tx) => findPairing(tx, { code: made.code }, deps.clock.now())), null);
    assert.ok(store.read((tx) => findPairing(tx, { token: made.token }, deps.clock.now())));
  });

  test("lower case and look-alike letters in a typed code are accepted", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    const made = make(person("Ada"));
    const sloppy = made.code.toLowerCase().replace(/0/g, "o").replace(/1/g, "l");
    assert.ok(store.read((tx) => findPairing(tx, { code: sloppy }, deps.clock.now())));
  });

  test("a strike on an unknown, used or deleted channel changes nothing", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    const made = make(person("Ada"));
    assert.equal(store.transaction((tx) => strike(tx, "QQQQ")), false);
    assert.ok(typeof tryRedeem(person("Bob"), { token: made.token }) === "object");
    assert.equal(store.transaction((tx) => strike(tx, made.code.slice(0, 4))), false);
    const attempts = store.read((tx) => tx.get<{ attempts: number }>("SELECT attempts FROM pairings WHERE id = ?", made.id)?.attempts);
    assert.equal(attempts, 0);
  });
});

describe("redeeming", () => {
  test("the creator cannot redeem their own pairing, nor can a buddy redeem twice", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    const ada = person("Ada");
    const bob = person("Bob");
    const own = make(ada);
    assert.equal(tryRedeem(ada, { token: own.token }), "self");
    assert.ok(typeof tryRedeem(bob, { token: own.token }) === "object");
    const again = make(ada);
    assert.equal(tryRedeem(bob, { token: again.token }), "already");
    const reverse = make(bob);
    assert.equal(tryRedeem(ada, { token: reverse.token }), "already");
  });

  test("the pair is stored with a < b whichever side redeems, and each side sees the other", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    for (let round = 0; round < 6; round++) {
      const ada = person(`Ada${round}`);
      const bob = person(`Bob${round}`);
      assert.ok(typeof tryRedeem(bob, { token: make(ada).token }) === "object");
      const row = store.read((tx) => tx.get<{ a: string; b: string }>("SELECT a, b FROM buddies WHERE a IN (?, ?) AND b IN (?, ?)", ada.deviceId, bob.deviceId, ada.deviceId, bob.deviceId));
      assert.ok(row && row.a < row.b);
      assert.deepEqual(store.read((tx) => listBuddies(tx, ada.deviceId)).map((b) => b.deviceId), [bob.deviceId]);
      assert.deepEqual(store.read((tx) => listBuddies(tx, bob.deviceId)).map((b) => b.deviceId), [ada.deviceId]);
    }
  });

  test("an alias is the owner's own name for the other side", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    const ada = person("Ada");
    const bob = person("Bob");
    tryRedeem(bob, { token: make(ada).token });
    const [a, b] = ada.deviceId < bob.deviceId ? [ada, bob] : [bob, ada];
    store.transaction((tx) => tx.run("UPDATE buddies SET alias_a = 'for a', alias_b = 'for b' WHERE a = ? AND b = ?", a.deviceId, b.deviceId));
    assert.equal(store.read((tx) => listBuddies(tx, a.deviceId))[0]?.alias, "for a");
    assert.equal(store.read((tx) => listBuddies(tx, b.deviceId))[0]?.alias, "for b");
  });

  test("the 64 buddy limit holds on either side", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    const ada = person("Ada");
    for (let i = 0; i < 64; i++) assert.ok(typeof tryRedeem(person(`P${i}`), { token: make(ada).token }) === "object");
    assert.equal(tryRedeem(person("Late"), { token: make(ada).token }), "quota");
    const full = person("Full");
    for (let i = 0; i < 64; i++) assert.ok(typeof tryRedeem(person(`Q${i}`), { token: make(full).token }) === "object");
    assert.equal(tryRedeem(full, { token: make(person("Fresh")).token }), "quota");
  });

  test("a pairing by a revoked or deleting creator is dead", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    const ada = person("Ada");
    const cy = person("Cy");
    const fromAda = make(ada);
    const fromCy = make(cy);
    store.transaction((tx) => tx.run("UPDATE devices SET revoked_at = ? WHERE id = ?", deps.clock.now(), ada.deviceId));
    store.transaction((tx) => tx.run("UPDATE devices SET deletion_requested_at = ? WHERE id = ?", deps.clock.now(), cy.deviceId));
    const bob = person("Bob");
    assert.equal(tryRedeem(bob, { token: fromAda.token }), "gone");
    assert.equal(tryRedeem(bob, { token: fromCy.token }), "gone");
  });
});

describe("listing and revoking", () => {
  test("statuses, the 30 day window and who redeemed", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    const ada = person("Ada");
    const bob = person("Bob");
    const redeemed = make(ada);
    const revoked = make(ada);
    const expired = make(ada, { ttlSeconds: 300 });
    const open = make(ada, { label: "for Bob" });
    tryRedeem(bob, { token: redeemed.token });
    store.transaction((tx) => revokePairing(tx, ada.deviceId, revoked.id, deps.clock.now()));
    deps.advance(HOUR);
    const status = (id: string) => store.read((tx) => listPairings(tx, ada, deps.clock.now())).find((item) => item.id === id);
    assert.equal(status(redeemed.id)?.status, "redeemed");
    assert.equal(status(redeemed.id)?.redeemedBy, bob.identityId);
    assert.equal(status(revoked.id)?.status, "revoked");
    assert.equal(status(expired.id)?.status, "expired");
    assert.equal(status(open.id)?.status, "open");
    assert.equal(status(open.id)?.label, "for Bob");
    deps.advance(31 * 24 * HOUR);
    const later = store.read((tx) => listPairings(tx, ada, deps.clock.now()));
    assert.deepEqual(later.map((item) => item.status), []);
  });

  test("only the creator revokes, a redeemed one cannot be revoked, twice is fine", () => {
    deps = fakeDeps();
    store = memoryStore(deps);
    const ada = person("Ada");
    const bob = person("Bob");
    const open = make(ada);
    const used = make(ada);
    tryRedeem(bob, { token: used.token });
    const revoke = (who: Authed, id: string) => store.transaction((tx) => revokePairing(tx, who.deviceId, id, deps.clock.now()));
    assert.equal(revoke(bob, open.id), false);
    assert.equal(revoke(ada, used.id), false);
    assert.equal(revoke(ada, open.id), true);
    assert.equal(revoke(ada, open.id), true);
    assert.equal(tryRedeem(bob, { token: open.token }), "gone");
  });
});

describe("storage", () => {
  let scratch: ReturnType<typeof tempDir> | undefined;
  afterEach(() => scratch?.remove());

  test("the file holds no code, secret or token", () => {
    deps = fakeDeps();
    scratch = tempDir();
    store = openStore(
      { path: join(scratch.dir, "iynk.db"), sync: "normal", migrationsDir: MIGRATIONS_DIR, backupsDir: join(scratch.dir, "backups"), serverVersion: "test" },
      deps,
    );
    const made = make(person("Ada"));
    const channel = made.code.slice(0, 4);
    const secret = made.code.slice(5);
    const files = ["iynk.db", "iynk.db-wal"].map((name) => join(scratch!.dir, name)).filter(existsSync);
    assert.ok(files.length > 0);
    const contents = files.map((file) => readFileSync(file));
    for (const bytes of contents) {
      for (const needle of [made.token, secret, made.code, made.code.replace("-", "")]) assert.equal(bytes.includes(needle), false, needle);
    }
    assert.ok(contents.some((bytes) => bytes.includes(channel)), "the channel is stored in the clear");
  });
});
