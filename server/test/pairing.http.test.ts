import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { bearer, enrol, send, type Json } from "./enrol-flow.ts";
import { startApp, type Running } from "./http-helpers.ts";
import { makeDeviceKey } from "./keys.ts";

let run: Running | undefined;

afterEach(async () => {
  await run?.stop();
  run = undefined;
});

type Person = { name: string; deviceId: string; identityId: string; headers: Record<string, string> };

async function join(r: Running, name: string): Promise<Person> {
  const key = makeDeviceKey();
  const answer = await enrol(r, key, { displayName: name });
  assert.equal(answer.status, 201);
  return { name, deviceId: key.deviceId, identityId: key.identityId, headers: bearer(answer.body.accessToken.token) };
}

const create = (r: Running, who: Person, body?: object): Promise<{ status: number; body: Json }> => send(r, "POST", "/v1/pairings", body, who.headers);
const peek = (r: Running, ref: object): Promise<{ status: number; body: Json }> => send(r, "POST", "/v1/pairings/peek", ref, { "x-request-id": "req_fixed_0001" });
const redeem = (r: Running, who: Person, ref: object): Promise<{ status: number; body: Json }> => send(r, "POST", "/v1/pairings/redeem", { pairing: ref }, who.headers);
const attempts = (r: Running, id: string) => r.app.store.read((tx) => tx.get<{ attempts: number }>("SELECT attempts FROM pairings WHERE id = ?", id)?.attempts);
const wrong = (code: string) => `${code.slice(0, 4)}-${code[5] === "0" ? "111111" : "000000"}`;

describe("the flow", () => {
  test("A creates, B peeks and sees a name only, B redeems, both list each other, C sees nothing", async () => {
    run = await startApp();
    const a = await join(run, "Ada");
    const b = await join(run, "Bob");
    const c = await join(run, "Cy");
    const made = await create(run, a, { label: "for Bob" });
    assert.equal(made.status, 201);
    assert.equal(made.body.status, "open");
    assert.equal(made.body.from, a.identityId);
    assert.equal(made.body.label, "for Bob");
    assert.equal(made.body.url, `https://iynk.test/together#/pair/${made.body.token}`);
    assert.match(made.body.code, /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{6}$/);

    const seen = await peek(run, { token: made.body.token });
    assert.equal(seen.status, 200);
    assert.deepEqual(Object.keys(seen.body).sort(), ["expiresAt", "from"]);
    assert.deepEqual(seen.body.from, { displayName: "Ada" });
    assert.equal((await peek(run, { code: made.body.code.toLowerCase() })).body.expiresAt, made.body.codeExpiresAt);

    const done = await redeem(run, b, { code: made.body.code });
    assert.equal(done.status, 200);
    assert.equal(done.body.buddy.identityId, a.identityId);
    assert.equal(done.body.buddy.displayName, "Ada");
    assert.equal(done.body.buddy.activity, null);

    const fromA = await send(run, "GET", "/v1/buddies", undefined, a.headers);
    const fromB = await send(run, "GET", "/v1/buddies", undefined, b.headers);
    assert.deepEqual(fromA.body.items.map((x: Json) => x.identityId), [b.identityId]);
    assert.deepEqual(fromB.body.items.map((x: Json) => x.identityId), [a.identityId]);
    assert.equal(fromA.body.nextCursor, null);
    assert.deepEqual((await send(run, "GET", "/v1/buddies", undefined, c.headers)).body.items, []);

    const listed = await send(run, "GET", "/v1/pairings", undefined, a.headers);
    assert.equal(listed.body.items[0].status, "redeemed");
    assert.equal(listed.body.items[0].redeemedBy, b.identityId);
    assert.deepEqual((await send(run, "GET", "/v1/pairings", undefined, c.headers)).body.items, []);
  });

  test("redeeming needs a token, pairing yourself or twice is 409, a bad body is 400", async () => {
    run = await startApp();
    const a = await join(run, "Ada");
    const b = await join(run, "Bob");
    const made = await create(run, a);
    assert.equal((await send(run, "POST", "/v1/pairings/redeem", { pairing: { token: made.body.token } })).status, 401);
    const self = await redeem(run, a, { token: made.body.token });
    assert.equal(self.status, 409);
    assert.equal(self.body.error.code, "already_paired");
    assert.equal((await redeem(run, b, { token: made.body.token })).status, 200);
    const again = await create(run, a);
    assert.equal((await redeem(run, b, { token: again.body.token })).body.error.code, "already_paired");
    assert.equal((await redeem(run, b, { token: "short" })).status, 400);
    assert.equal((await redeem(run, b, { token: again.body.token, code: again.body.code })).status, 400);
    assert.equal((await send(run, "POST", "/v1/pairings/redeem", { token: again.body.token }, b.headers)).status, 400);
    assert.equal((await create(run, a, { ttlSeconds: 10 })).status, 400);
    assert.equal((await create(run, a, { label: "x".repeat(61) })).status, 400);
    assert.equal((await create(run, a, { surprise: true })).status, 400);
  });

  test("only the creator revokes, and a revoked link answers the generic 404", async () => {
    run = await startApp();
    const a = await join(run, "Ada");
    const b = await join(run, "Bob");
    const made = await create(run, a);
    assert.equal((await send(run, "DELETE", `/v1/pairings/${made.body.id}`, undefined, b.headers)).status, 404);
    assert.equal((await send(run, "DELETE", `/v1/pairings/${made.body.id}`, undefined, a.headers)).status, 204);
    assert.equal((await peek(run, { token: made.body.token })).status, 404);
    assert.equal((await redeem(run, b, { token: made.body.token })).status, 404);
  });

  test("an identity with a scheduled deletion gets 403 forbidden", async () => {
    run = await startApp();
    const a = await join(run, "Ada");
    run.app.store.transaction((tx) => tx.run("UPDATE devices SET deletion_requested_at = ? WHERE id = ?", run!.deps.clock.now(), a.deviceId));
    const refused = await create(run, a);
    assert.equal(refused.status, 403);
    assert.equal(refused.body.error.code, "forbidden");
  });
});

describe("CM-03 typed code guesses", () => {
  test("five wrong secrets delete the code, the right one then fails, the link still works, and every answer is the same", async () => {
    run = await startApp();
    const a = await join(run, "Ada");
    const b = await join(run, "Bob");
    const made = (await create(run, a)).body;
    const failures = [];
    for (let i = 0; i < 5; i++) failures.push(await peek(run, { code: wrong(made.code) }));
    failures.push(await peek(run, { code: made.code }));
    failures.push(await peek(run, { code: "ZZZZ-ZZZZZZ" }));
    for (const failure of failures) {
      assert.equal(failure.status, 404);
      assert.equal(failure.body.error.code, "not_found");
      assert.deepEqual(failure.body, failures[0]?.body);
    }
    assert.equal(attempts(run, made.id), 5);
    assert.equal((await peek(run, { token: made.token })).status, 200);
    assert.equal((await redeem(run, b, { token: made.token })).status, 200);
  });

  test("a failure takes at least 200 ms on the injected clock, a success none", async () => {
    run = await startApp();
    const a = await join(run, "Ada");
    const made = (await create(run, a)).body;
    const before = run.deps.clock.now();
    assert.equal((await peek(run, { code: made.code })).status, 200);
    assert.equal(run.deps.clock.now() - before, 0);
    assert.equal((await peek(run, { code: wrong(made.code) })).status, 404);
    assert.ok(run.deps.clock.now() - before >= 200);
  });

  test("the 11th call in a minute is 429 and is not counted as a strike", async () => {
    run = await startApp();
    const a = await join(run, "Ada");
    const made = (await create(run, a)).body;
    for (let i = 0; i < 10; i++) assert.equal((await peek(run, { code: made.code })).status, 200);
    const limited = await peek(run, { code: wrong(made.code) });
    assert.equal(limited.status, 429);
    assert.equal(attempts(run, made.id), 0);
  });
});

describe("CM-05 expiry", () => {
  test("after its lifetime an unredeemed link peeks and redeems as the generic 404 and nothing is stored about the redeemer", async () => {
    run = await startApp();
    const a = await join(run, "Ada");
    const b = await join(run, "Bob");
    const made = (await create(run, a, { ttlSeconds: 300 })).body;
    run.deps.advance(300_000);
    const peeked = await peek(run, { token: made.token });
    const redeemed = await redeem(run, b, { token: made.token });
    for (const answer of [peeked, redeemed]) {
      assert.equal(answer.status, 404);
      assert.equal(answer.body.error.code, "not_found");
    }
    const stored = run.app.store.read((tx) => tx.get<{ used_by: string | null; used_at: number | null; buddies: number }>("SELECT used_by, used_at, (SELECT COUNT(*) FROM buddies) AS buddies FROM pairings WHERE id = ?", made.id));
    assert.deepEqual(stored, { used_by: null, used_at: null, buddies: 0 });
    assert.equal((await send(run, "GET", "/v1/pairings", undefined, a.headers)).body.items[0].status, "expired");
  });
});
