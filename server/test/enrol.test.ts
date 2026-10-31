import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { canonicalCode } from "../../src/protocol/identity.ts";
import { createEnrolmentCode, listOpenCodes, redeemEnrolmentCode, revokeCode } from "../src/identity/enrol.ts";
import { registerDevice } from "../src/identity/devices.ts";
import { fakeDeps, memoryStore } from "./helpers.ts";
import { makeDeviceKey } from "./keys.ts";

const DAY = 24 * 60 * 60 * 1000;

function setup() {
  const deps = fakeDeps();
  const store = memoryStore(deps);
  const enrol = (name: string) => {
    const key = makeDeviceKey();
    store.transaction((tx) => registerDevice(tx, deps, { spki: key.spki, displayName: name, maxIdentities: 100 }));
    return key.deviceId;
  };
  return { deps, store, enrol };
}

describe("enrolment codes", () => {
  test("the typed form is 12 Crockford characters shown in groups of four and the link is 22 characters", () => {
    const { deps, store } = setup();
    const code = store.transaction((tx) => createEnrolmentCode(tx, deps));
    assert.match(code.typed, /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    assert.match(code.link, /^[A-Za-z0-9_-]{22}$/);
    assert.equal(code.expiresAt, deps.clock.now() + DAY);
  });

  test("the link form redeems", () => {
    const { deps, store, enrol } = setup();
    const code = store.transaction((tx) => createEnrolmentCode(tx, deps));
    const device = enrol("Ada");
    assert.equal(store.transaction((tx) => redeemEnrolmentCode(tx, code.link, device, deps)), "ok");
  });

  test("the typed form redeems with confusable letters, hyphens and lower case", () => {
    const { deps, store, enrol } = setup();
    const code = store.transaction((tx) => createEnrolmentCode(tx, deps));
    const sloppy = code.typed.toLowerCase().replace(/0/g, "o").replace(/1/g, "l");
    const device = enrol("Ada");
    assert.equal(store.transaction((tx) => redeemEnrolmentCode(tx, sloppy, device, deps)), "ok");
    assert.equal(canonicalCode(sloppy), canonicalCode(code.typed));
  });

  test("a code works once, in either form", () => {
    const { deps, store, enrol } = setup();
    const code = store.transaction((tx) => createEnrolmentCode(tx, deps));
    const first = enrol("Ada");
    const second = enrol("Bo");
    assert.equal(store.transaction((tx) => redeemEnrolmentCode(tx, code.typed, first, deps)), "ok");
    assert.equal(store.transaction((tx) => redeemEnrolmentCode(tx, code.typed, second, deps)), "invalid");
    assert.equal(store.transaction((tx) => redeemEnrolmentCode(tx, code.link, second, deps)), "invalid");
    const used = store.read((tx) => tx.get<{ used_by: string }>("SELECT used_by FROM enrollment_codes WHERE id = ?", code.id));
    assert.equal(used?.used_by, first);
  });

  test("a code expires after 24 hours", () => {
    const { deps, store, enrol } = setup();
    const code = store.transaction((tx) => createEnrolmentCode(tx, deps));
    const device = enrol("Ada");
    deps.advance(DAY);
    assert.equal(store.transaction((tx) => redeemEnrolmentCode(tx, code.typed, device, deps)), "invalid");
    assert.deepEqual(store.read((tx) => listOpenCodes(tx, deps.clock.now())), []);
  });

  test("the last millisecond before expiry still redeems", () => {
    const { deps, store, enrol } = setup();
    const code = store.transaction((tx) => createEnrolmentCode(tx, deps));
    const device = enrol("Ada");
    deps.advance(DAY - 1);
    assert.equal(store.transaction((tx) => redeemEnrolmentCode(tx, code.link, device, deps)), "ok");
  });

  test("a revoked code no longer redeems and leaves the open list", () => {
    const { deps, store, enrol } = setup();
    const code = store.transaction((tx) => createEnrolmentCode(tx, deps));
    assert.deepEqual(store.read((tx) => listOpenCodes(tx, deps.clock.now())), [{ id: code.id, expiresAt: code.expiresAt }]);
    assert.equal(store.transaction((tx) => revokeCode(tx, code.id, deps.clock.now())), true);
    assert.equal(store.transaction((tx) => revokeCode(tx, code.id, deps.clock.now())), false);
    const device = enrol("Ada");
    assert.equal(store.transaction((tx) => redeemEnrolmentCode(tx, code.typed, device, deps)), "invalid");
    assert.deepEqual(store.read((tx) => listOpenCodes(tx, deps.clock.now())), []);
  });

  test("garbage, a wrong code and a used code give the same answer", () => {
    const { deps, store, enrol } = setup();
    store.transaction((tx) => createEnrolmentCode(tx, deps));
    const device = enrol("Ada");
    for (const input of ["", "nope", "AAAA-AAAA-AAAA", "A".repeat(22), "A".repeat(200)]) {
      assert.equal(store.transaction((tx) => redeemEnrolmentCode(tx, input, device, deps)), "invalid");
    }
  });

  test("the database holds neither secret", () => {
    const { deps, store } = setup();
    const code = store.transaction((tx) => createEnrolmentCode(tx, deps));
    const row = store.read((tx) => tx.get<{ secret_hash: Uint8Array; typed_hash: Uint8Array }>("SELECT secret_hash, typed_hash FROM enrollment_codes"));
    assert.equal(row?.secret_hash.length, 32);
    assert.equal(row?.typed_hash.length, 32);
    for (const blob of [row?.secret_hash, row?.typed_hash]) {
      const text = Buffer.from(blob ?? []).toString("latin1");
      assert.ok(!text.includes(code.link));
      assert.ok(!text.includes(canonicalCode(code.typed)));
    }
    const dump = JSON.stringify(store.read((tx) => tx.all("SELECT id, expires_at, created_at FROM enrollment_codes")));
    assert.ok(!dump.includes(code.link));
  });
});
