import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { bearer, enrol, send, type Answer } from "./enrol-flow.ts";
import { startApp, type Running } from "./http-helpers.ts";
import { makeDeviceKey } from "./keys.ts";

let run: Running | undefined;

afterEach(async () => {
  await run?.stop();
  run = undefined;
});

type Person = { deviceId: string; identityId: string; thumbprint: string; headers: Record<string, string> };

async function join(r: Running, name: string): Promise<Person> {
  const key = makeDeviceKey();
  const answer = await enrol(r, key, { displayName: name });
  assert.equal(answer.status, 201);
  return { deviceId: key.deviceId, identityId: key.identityId, thumbprint: key.thumbprint, headers: bearer(answer.body.accessToken.token) };
}

async function paired(r: Running, a: Person, b: Person): Promise<void> {
  const made = await send(r, "POST", "/v1/pairings", {}, a.headers);
  const done = await send(r, "POST", "/v1/pairings/redeem", { pairing: { token: made.body.token } }, b.headers);
  assert.equal(done.status, 200);
}

const ask = (r: Running, method: string, who: Person, id: string, body?: unknown): Promise<Answer> =>
  send(r, method, `/v1/buddies/${id}`, body, { ...who.headers, "x-request-id": "req_fixed_0001" });

describe("buddy routes over HTTP", () => {
  test("CM-04 a stranger gets the same 404 as for a random id, byte for byte", async () => {
    run = await startApp();
    const [a, b, c] = [await join(run, "Ada"), await join(run, "Bob"), await join(run, "Cy")];
    await paired(run, a, b);
    const random = await ask(run, "GET", c, "usr_nobodyatall");
    assert.equal(random.status, 404);
    for (const id of [a.identityId, a.deviceId, a.thumbprint]) {
      const stranger = await ask(run, "GET", c, id);
      assert.equal(stranger.status, 404);
      assert.deepEqual(stranger.body, random.body);
    }
    const patched = await ask(run, "PATCH", c, a.identityId, { alias: "mine" });
    assert.equal(patched.status, 404);
    assert.deepEqual(patched.body, random.body);
    assert.equal((await ask(run, "GET", b, a.identityId)).status, 200);
  });

  test("get shows the buddy, patch sets and clears the alias, a bad body is 400", async () => {
    run = await startApp();
    const [a, b] = [await join(run, "Ada"), await join(run, "Bob")];
    await paired(run, a, b);
    const got = await ask(run, "GET", b, a.identityId);
    assert.equal(got.body.displayName, "Ada");
    assert.equal(got.body.keyThumbprint, a.thumbprint);
    assert.equal(got.body.activity, null);
    const set = await ask(run, "PATCH", b, a.identityId, { alias: "  Ada​   Lovelace " });
    assert.equal(set.status, 200);
    assert.equal(set.body.alias, "Ada Lovelace");
    assert.equal((await ask(run, "GET", a, b.identityId)).body.alias, undefined);
    assert.equal((await send(run, "GET", "/v1/buddies", undefined, b.headers)).body.items[0].alias, "Ada Lovelace");
    assert.equal((await ask(run, "PATCH", b, a.identityId, { alias: "" })).body.alias, undefined);
    for (const body of [{}, { alias: 5 }, { alias: "x".repeat(61) }, { alias: "ok", extra: 1 }]) {
      const bad = await ask(run, "PATCH", b, a.identityId, body);
      assert.equal(bad.status, 400, JSON.stringify(body));
    }
  });

  test("CM-06 removing drops both lists and is 204 whether or not the pair existed", async () => {
    run = await startApp();
    const [a, b, c] = [await join(run, "Ada"), await join(run, "Bob"), await join(run, "Cy")];
    await paired(run, a, b);
    assert.equal((await ask(run, "DELETE", a, b.identityId)).status, 204);
    assert.equal((await ask(run, "DELETE", b, a.identityId)).status, 204);
    assert.equal((await ask(run, "DELETE", c, a.identityId)).status, 204);
    assert.equal((await ask(run, "DELETE", c, "usr_nobodyatall")).status, 204);
    for (const who of [a, b]) assert.deepEqual((await send(run, "GET", "/v1/buddies", undefined, who.headers)).body.items, []);
    assert.equal((await ask(run, "GET", b, a.identityId)).status, 404);
    await paired(run, b, a);
    assert.equal((await ask(run, "GET", b, a.identityId)).status, 200);
  });
});
