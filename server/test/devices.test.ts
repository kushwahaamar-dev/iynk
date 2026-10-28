import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { deriveDeviceId, deriveIdentityId, keyThumbprint } from "../../src/protocol/identity.ts";
import { getDevice, listDevices, registerDevice, revokeDevice } from "../src/identity/devices.ts";
import { mintToken, verifyToken } from "../src/identity/tokens.ts";
import { fakeDeps, memoryStore } from "./helpers.ts";
import { makeDeviceKey } from "./keys.ts";

function setup() {
  const deps = fakeDeps();
  const store = memoryStore(deps);
  const register = (name: string, maxIdentities = 100) => {
    const key = makeDeviceKey();
    const result = store.transaction((tx) => registerDevice(tx, deps, { spki: key.spki, displayName: name, maxIdentities }));
    return { key, result };
  };
  return { deps, store, register };
}

describe("registerDevice", () => {
  test("the first device is the owner and the second a member", () => {
    const { register } = setup();
    const first = register("Ada");
    const second = register("Bo");
    assert.deepEqual(first.result, { deviceId: first.key.deviceId, identityId: first.key.identityId, role: "owner" });
    assert.deepEqual(second.result, { deviceId: second.key.deviceId, identityId: second.key.identityId, role: "member" });
  });

  test("ids and thumbprint are derived from the key", () => {
    const { store, register } = setup();
    const { key } = register("Ada");
    const row = store.read((tx) => getDevice(tx, key.identityId));
    assert.equal(row?.id, deriveDeviceId(key.spki));
    assert.equal(row?.identityId, deriveIdentityId(key.spki));
    assert.equal(row?.thumbprint, keyThumbprint(key.spki));
    assert.deepEqual(row?.publicKey, key.spki);
    assert.equal(row?.locale, "en");
    assert.equal(row?.showOnline, true);
    assert.equal(row?.showActivity, false);
  });

  test("locale and colour are stored", () => {
    const { deps, store } = setup();
    const key = makeDeviceKey();
    store.transaction((tx) => registerDevice(tx, deps, { spki: key.spki, displayName: "Ada", locale: "hi", color: "#aabbcc", maxIdentities: 5 }));
    const row = store.read((tx) => getDevice(tx, key.deviceId));
    assert.equal(row?.locale, "hi");
    assert.equal(row?.color, "#aabbcc");
  });

  test("the same key twice reports exists", () => {
    const { deps, store, register } = setup();
    const { key } = register("Ada");
    const again = store.transaction((tx) => registerDevice(tx, deps, { spki: key.spki, displayName: "Ada again", maxIdentities: 100 }));
    assert.equal(again, "exists");
    assert.equal(store.read((tx) => listDevices(tx)).length, 1);
  });

  test("a revoked key and a purged-but-not-swept key still report exists", () => {
    const { deps, store, register } = setup();
    const revoked = register("Ada").key;
    const purged = register("Bo").key;
    store.transaction((tx) => revokeDevice(tx, revoked.deviceId, deps.clock.now()));
    store.transaction((tx) => tx.run("UPDATE devices SET deletion_requested_at = ?, deletion_at = ? WHERE id = ?", 1, 2, purged.deviceId));
    for (const key of [revoked, purged]) {
      const result = store.transaction((tx) => registerDevice(tx, deps, { spki: key.spki, displayName: "Again", maxIdentities: 100 }));
      assert.equal(result, "exists");
    }
  });

  test("a full server refuses new identities", () => {
    const { register } = setup();
    assert.notEqual(register("Ada", 2).result, "full");
    assert.notEqual(register("Bo", 2).result, "full");
    assert.equal(register("Cy", 2).result, "full");
  });

  test("two registrations in a row never produce two owners", () => {
    const { store, register } = setup();
    register("Ada");
    register("Bo");
    register("Cy");
    const owners = store.read((tx) => listDevices(tx)).filter((d) => d.role === "owner");
    assert.equal(owners.length, 1);
  });
});

describe("revokeDevice", () => {
  test("marks the device and every session revoked together", () => {
    const { deps, store, register } = setup();
    const { key } = register("Ada");
    const sessions = [1, 2].map(() => store.transaction((tx) => mintToken(tx, deps, key.deviceId, 3_600_000, null)));
    assert.equal(store.transaction((tx) => revokeDevice(tx, key.identityId, deps.clock.now())), true);
    const device = store.read((tx) => getDevice(tx, key.deviceId));
    assert.equal(device?.revokedAt, deps.clock.now());
    const open = store.read((tx) => tx.get<{ n: number }>("SELECT COUNT(*) AS n FROM sessions WHERE revoked_at IS NULL"));
    assert.equal(open?.n, 0);
    for (const s of sessions) assert.equal(store.read((tx) => verifyToken(tx, deps, s.token)).authed, null);
  });

  test("an unknown or already revoked device returns false", () => {
    const { deps, store, register } = setup();
    const { key } = register("Ada");
    assert.equal(store.transaction((tx) => revokeDevice(tx, "dev_unknown", deps.clock.now())), false);
    assert.equal(store.transaction((tx) => revokeDevice(tx, key.deviceId, deps.clock.now())), true);
    assert.equal(store.transaction((tx) => revokeDevice(tx, key.deviceId, deps.clock.now())), false);
  });

  test("getDevice finds by device id or identity id and misses otherwise", () => {
    const { store, register } = setup();
    const { key } = register("Ada");
    assert.equal(store.read((tx) => getDevice(tx, key.deviceId))?.name, "Ada");
    assert.equal(store.read((tx) => getDevice(tx, key.identityId))?.name, "Ada");
    assert.equal(store.read((tx) => getDevice(tx, "usr_missing")), null);
  });
});
