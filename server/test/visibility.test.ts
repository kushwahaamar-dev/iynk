import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { listBuddies } from "../src/buddies/list.ts";
import { areBuddies, removeBuddy, setAlias, visibleBuddy } from "../src/buddies/visibility.ts";
import type { Authed } from "../src/http/classes.ts";
import { revokeDevice } from "../src/identity/devices.ts";
import { enrol } from "./enrol-flow.ts";
import { startApp, type Running } from "./http-helpers.ts";
import { makeDeviceKey } from "./keys.ts";

let run: Running | undefined;

afterEach(async () => {
  await run?.stop();
  run = undefined;
});

type Person = Authed & { thumbprint: string };

async function join(r: Running, name: string): Promise<Person> {
  const key = makeDeviceKey();
  assert.equal((await enrol(r, key, { displayName: name })).status, 201);
  return { deviceId: key.deviceId, identityId: key.identityId, role: "member", sessionId: "ses_test", name, deleting: false, thumbprint: key.thumbprint };
}

function pair(r: Running, x: Person, y: Person): void {
  const [a, b] = x.deviceId < y.deviceId ? [x.deviceId, y.deviceId] : [y.deviceId, x.deviceId];
  r.app.store.transaction((tx) => tx.run("INSERT INTO buddies (a, b, since) VALUES (?, ?, ?)", a, b, r.deps.clock.now()));
}

async function trio(r: Running): Promise<{ a: Person; b: Person; c: Person }> {
  const [a, b, c] = [await join(r, "Ada"), await join(r, "Bob"), await join(r, "Cy")];
  pair(r, a, b);
  return { a, b, c };
}

const view = (r: Running, viewer: Person, id: string) => r.app.store.read((tx) => visibleBuddy(tx, viewer, id, r.deps.clock.now()));

describe("visibility", () => {
  test("CM-04 a stranger sees nothing of A, whatever they ask with", async () => {
    run = await startApp();
    const { a, b, c } = await trio(run);
    assert.equal(view(run, c, a.identityId), null);
    assert.equal(view(run, c, a.deviceId), null);
    assert.equal(view(run, c, a.thumbprint), null);
    assert.equal(view(run, c, a.name), null);
    assert.equal(view(run, c, "usr_random"), null);
    assert.deepEqual(run.app.store.read((tx) => listBuddies(tx, c.deviceId, run!.deps.clock.now())), []);
    assert.equal(view(run, b, a.identityId)?.displayName, "Ada");
  });

  test("a buddy does not see the buddies of a buddy", async () => {
    run = await startApp();
    const { a, b, c } = await trio(run);
    pair(run, a, c);
    assert.equal(view(run, b, c.identityId), null);
    assert.deepEqual(run.app.store.read((tx) => listBuddies(tx, b.deviceId, run!.deps.clock.now())).map((x) => x.identityId), [a.identityId]);
  });

  test("oneself, a revoked device and a deleting identity are invisible", async () => {
    run = await startApp();
    const { a, b } = await trio(run);
    const c = await join(run, "Cy");
    pair(run, a, c);
    assert.equal(view(run, a, a.identityId), null);
    run.app.store.transaction((tx) => tx.run("UPDATE devices SET deletion_requested_at = ? WHERE id = ?", run!.deps.clock.now(), c.deviceId));
    assert.equal(view(run, a, c.identityId), null);
    run.app.store.transaction((tx) => revokeDevice(tx, b.deviceId, run!.deps.clock.now()));
    assert.equal(view(run, a, b.identityId), null);
    assert.deepEqual(run.app.store.read((tx) => listBuddies(tx, a.deviceId, run!.deps.clock.now())), []);
  });

  test("online follows show_online and last_seen_at within two minutes", async () => {
    run = await startApp();
    const { a, b } = await trio(run);
    const now = run.deps.clock.now();
    const setSeen = (ms: number) => run!.app.store.transaction((tx) => tx.run("UPDATE devices SET last_seen_at = ? WHERE id = ?", ms, a.deviceId));
    setSeen(now - 60_000);
    assert.equal(view(run, b, a.identityId)?.online, true);
    setSeen(now - 121_000);
    assert.equal(view(run, b, a.identityId)?.online, false);
    run.app.store.transaction((tx) => tx.run("UPDATE devices SET show_online = 0 WHERE id = ?", a.deviceId));
    assert.equal(view(run, b, a.identityId)?.online, null);
  });

  test("CM-06 removing drops the pair from both lists, twice is fine", async () => {
    run = await startApp();
    const { a, b } = await trio(run);
    const r = run;
    assert.equal(r.app.store.transaction((tx) => removeBuddy(tx, a, b.identityId)), true);
    assert.equal(r.app.store.transaction((tx) => removeBuddy(tx, a, b.identityId)), false);
    assert.equal(r.app.store.read((tx) => areBuddies(tx, a.deviceId, b.deviceId)), false);
    assert.equal(view(r, a, b.identityId), null);
    assert.equal(view(r, b, a.identityId), null);
  });

  test("an alias is kept per side and null clears it", async () => {
    run = await startApp();
    const { a, b } = await trio(run);
    const r = run;
    const set = (who: Person, other: Person, alias: string | null) => r.app.store.transaction((tx) => setAlias(tx, who, other.identityId, alias, r.deps.clock.now()));
    assert.equal(set(a, b, "Bobby")?.alias, "Bobby");
    assert.equal(view(r, b, a.identityId)?.alias, undefined);
    assert.equal(set(b, a, "Ads")?.alias, "Ads");
    assert.equal(view(r, a, b.identityId)?.alias, "Bobby");
    assert.equal(set(a, b, null)?.alias, undefined);
    assert.equal(set(a, { ...b, identityId: "usr_nobody" }, "x"), null);
  });
});
