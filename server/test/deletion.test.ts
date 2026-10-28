import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { bearer, enrol, send, signIn, type Json } from "./enrol-flow.ts";
import { startApp, type Running } from "./http-helpers.ts";
import { makeDeviceKey, type DeviceKey } from "./keys.ts";

let run: Running | undefined;

afterEach(async () => {
  await run?.stop();
  run = undefined;
});

type Person = { key: DeviceKey; name: string; headers: Record<string, string> };

async function join(r: Running, name: string): Promise<Person> {
  const key = makeDeviceKey();
  const answer = await enrol(r, key, { displayName: name });
  assert.equal(answer.status, 201);
  return { key, name, headers: bearer(answer.body.accessToken.token) };
}

async function pair(r: Running, a: Person, b: Person): Promise<void> {
  const made = await send(r, "POST", "/v1/pairings", {}, a.headers);
  const done = await send(r, "POST", "/v1/pairings/redeem", { pairing: { code: made.body.code } }, b.headers);
  assert.equal(done.status, 200);
}

const leave = (r: Running, who: Person, confirm = `delete ${who.name}`) => send(r, "POST", "/v1/identities/me/deletion", { confirm }, who.headers);
const buddyIds = async (r: Running, who: Person): Promise<string[]> =>
  ((await send(r, "GET", "/v1/buddies", undefined, who.headers)).body.items as Json[]).map((item) => item.identityId);
const count = (r: Running, table: string, where = "1 = 1", ...params: string[]) =>
  r.app.store.read((tx) => tx.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`, ...params)?.n);

describe("requesting", () => {
  test("a wrong or malformed confirm is 400 with the path, and nothing is scheduled", async () => {
    run = await startApp();
    const ada = await join(run, "Ada");
    for (const body of [{ confirm: "delete Bob" }, { confirm: "Delete Ada" }, {}, { confirm: "delete Ada", extra: 1 }, { confirm: 5 }]) {
      const answer = await send(run, "POST", "/v1/identities/me/deletion", body, ada.headers);
      assert.equal(answer.status, 400);
      assert.equal(answer.body.error.code, "bad_request");
    }
    const wrong = await leave(run, ada, "delete Bob");
    assert.equal(wrong.body.error.details[0].path, "/confirm");
    assert.equal(count(run, "devices", "deletion_at IS NOT NULL"), 0);
  });

  test("the 202 body is exactly status, requestedAt and effectiveAt, 24 hours apart by default", async () => {
    run = await startApp();
    const ada = await join(run, "Ada");
    const answer = await leave(run, ada);
    assert.equal(answer.status, 202);
    assert.deepEqual(Object.keys(answer.body).sort(), ["effectiveAt", "requestedAt", "status"]);
    assert.equal(answer.body.status, "scheduled");
    assert.equal(Date.parse(answer.body.effectiveAt) - Date.parse(answer.body.requestedAt), 86_400_000);
  });

  test("the grace comes from config", async () => {
    run = await startApp({ env: { IYNK_DELETION_GRACE_HOURS: "2" } });
    const ada = await join(run, "Ada");
    const answer = await leave(run, ada);
    assert.equal(Date.parse(answer.body.effectiveAt) - Date.parse(answer.body.requestedAt), 7_200_000);
  });

  test("asking twice returns the first schedule", async () => {
    run = await startApp();
    const ada = await join(run, "Ada");
    const first = await leave(run, ada);
    run.deps.advance(3_600_000);
    const second = await leave(run, ada);
    assert.equal(second.status, 202);
    assert.deepEqual(second.body, first.body);
  });
});

describe("while scheduled", () => {
  test("buddies stop seeing the identity, the owner can still sign in, and cancel brings it back", async () => {
    run = await startApp();
    const ada = await join(run, "Ada");
    const bob = await join(run, "Bob");
    await pair(run, ada, bob);
    assert.deepEqual(await buddyIds(run, bob), [ada.key.identityId]);

    await leave(run, ada);
    assert.deepEqual(await buddyIds(run, bob), []);
    assert.equal((await send(run, "GET", "/v1/identities/me", undefined, ada.headers)).status, 200);
    assert.equal((await signIn(run, ada.key)).status, 201);

    assert.equal((await send(run, "DELETE", "/v1/identities/me/deletion", undefined, ada.headers)).status, 204);
    assert.deepEqual(await buddyIds(run, bob), [ada.key.identityId]);
    assert.equal((await send(run, "DELETE", "/v1/identities/me/deletion", undefined, ada.headers)).status, 404);
  });

  test("creating a pairing is 403", async () => {
    run = await startApp();
    const ada = await join(run, "Ada");
    await leave(run, ada);
    const made = await send(run, "POST", "/v1/pairings", {}, ada.headers);
    assert.equal(made.status, 403);
    assert.equal(made.body.error.code, "forbidden");
  });
});

describe("purging", () => {
  test("grace 0 removes the identity in the same request and the token stops working", async () => {
    run = await startApp({ env: { IYNK_DELETION_GRACE_HOURS: "0" } });
    const ada = await join(run, "Ada");
    const bob = await join(run, "Bob");
    await pair(run, ada, bob);
    const answer = await leave(run, ada);
    assert.equal(answer.status, 202);
    assert.equal(answer.body.effectiveAt, answer.body.requestedAt);
    assert.equal(count(run, "devices", "id = ?", ada.key.deviceId), 0);
    assert.equal(count(run, "sessions", "device_id = ?", ada.key.deviceId), 0);
    assert.equal(count(run, "buddies"), 0);
    assert.equal((await send(run, "GET", "/v1/identities/me", undefined, ada.headers)).status, 401);
  });

  test("after 24 hours the sweep removes every row, even for a device that redeemed a code and a pairing", async () => {
    run = await startApp();
    const ada = await join(run, "Ada");
    const bob = await join(run, "Bob");
    await pair(run, ada, bob);
    await send(run, "POST", "/v1/pairings", {}, bob.headers);
    await leave(run, bob);

    run.deps.advance(86_400_000 - 1);
    const again = await signIn(run, bob.key);
    assert.equal(again.status, 201);
    const fresh = bearer(again.body.token);
    assert.equal((await send(run, "GET", "/v1/identities/me", undefined, fresh)).status, 200);
    run.deps.advance(1);
    assert.equal((await send(run, "GET", "/v1/identities/me", undefined, fresh)).status, 401);

    const { sweepOnce } = await import("../src/ops/sweep.ts");
    assert.equal(sweepOnce(run.app.store, run.deps).identities, 1);
    assert.equal(count(run, "devices", "id = ?", bob.key.deviceId), 0);
    assert.equal(count(run, "sessions", "device_id = ?", bob.key.deviceId), 0);
    assert.equal(count(run, "pairings", "creator = ?", bob.key.deviceId), 0);
    assert.equal(count(run, "buddies"), 0);
    assert.equal(count(run, "enrollment_codes", "used_by IS NULL AND used_at IS NOT NULL"), 1);
    assert.equal(count(run, "pairings", "used_by IS NULL AND used_at IS NOT NULL"), 1);
    assert.equal((await signIn(run, ada.key)).status, 201);
  });
});
