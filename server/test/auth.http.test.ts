import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { toBase64Url } from "../../src/protocol/identity.ts";
import { bearer, challengeFor, enrol, send, signIn } from "./enrol-flow.ts";
import { startApp, type Running } from "./http-helpers.ts";
import { makeDeviceKey } from "./keys.ts";

let run: Running;

beforeEach(async () => {
  run = await startApp();
});

afterEach(async () => {
  await run.stop();
});

async function enrolled() {
  const key = makeDeviceKey();
  const res = await enrol(run, key);
  assert.equal(res.status, 201);
  return { key, token: res.body.accessToken.token as string };
}

const lastUsed = (sessionId: string) => run.app.store.read((tx) => tx.get<{ last_used_at: number }>("SELECT last_used_at FROM sessions WHERE id = ?", sessionId)?.last_used_at);

describe("challenges", () => {
  test("a register challenge for a fresh key carries the signing input", async () => {
    const key = makeDeviceKey();
    const res = await send(run, "POST", "/v1/auth/challenges", { purpose: "register", keyThumbprint: key.thumbprint });
    assert.equal(res.status, 201);
    assert.match(res.body.challengeId, /^chl_[a-z0-9]+$/);
    assert.equal(res.body.purpose, "register");
    assert.equal(res.body.audience, "iynk.test");
    assert.ok(res.body.signingInput.endsWith(`\n${key.thumbprint}`));
    assert.equal(res.body.expiresAt, new Date(run.deps.clock.now() + 60_000).toISOString());
  });

  test("an unknown identity gets a challenge shaped like a known one", async () => {
    const { key } = await enrolled();
    const known = await send(run, "POST", "/v1/auth/challenges", { purpose: "login", identityId: key.identityId });
    const unknown = await send(run, "POST", "/v1/auth/challenges", { purpose: "login", identityId: "usr_aaaaaaaaaaaaaaaa" });
    assert.equal(unknown.status, known.status);
    assert.deepEqual(Object.keys(unknown.body), Object.keys(known.body));
    assert.match(unknown.body.signingInput, /\n[A-Za-z0-9_-]{43}$/);
  });

  test("a body with extra or missing fields is a 400", async () => {
    const extra = await send(run, "POST", "/v1/auth/challenges", { purpose: "login", identityId: "usr_aaaaaaaaaaaaaaaa", keyThumbprint: "x" });
    assert.equal(extra.status, 400);
    assert.equal(extra.body.error.code, "bad_request");
    assert.equal((await send(run, "POST", "/v1/auth/challenges", { purpose: "register" })).status, 400);
    assert.equal((await send(run, "POST", "/v1/auth/challenges", { purpose: "other" })).status, 400);
  });
});

describe("tokens", () => {
  test("the sign-in flow mints a token that works", async () => {
    const { key } = await enrolled();
    const res = await signIn(run, key, { "iynk-client": "iynk-web/1.0.0" });
    assert.equal(res.status, 201);
    assert.match(res.body.token, /^iynk_at_[A-Za-z0-9_-]{43}$/);
    assert.equal(res.body.tokenType, "Bearer");
    assert.equal(res.body.identityId, key.identityId);
    const me = await send(run, "GET", "/v1/identities/me", undefined, bearer(res.body.token));
    assert.equal(me.status, 200);
    assert.equal(me.body.id, key.identityId);
  });

  test("a challenge works once", async () => {
    const { key } = await enrolled();
    const challenge = await challengeFor(run, { purpose: "login", identityId: key.identityId });
    const body = { challengeId: challenge.challengeId, signature: key.sign(challenge.signingInput) };
    assert.equal((await send(run, "POST", "/v1/auth/tokens", body)).status, 201);
    assert.equal((await send(run, "POST", "/v1/auth/tokens", body)).status, 401);
  });

  test("a register challenge cannot be used to sign in", async () => {
    const { key } = await enrolled();
    const challenge = await challengeFor(run, { purpose: "register", keyThumbprint: key.thumbprint });
    const res = await send(run, "POST", "/v1/auth/tokens", { challengeId: challenge.challengeId, signature: key.sign(challenge.signingInput) });
    assert.equal(res.status, 401);
  });

  test("five bad credentials answer byte for byte the same", async () => {
    const { key, token } = await enrolled();
    const other = makeDeviceKey();
    const headers = { "x-request-id": "req_fixed_0001" };

    const wrongKey = await challengeFor(run, { purpose: "login", identityId: key.identityId });
    const unknownChallenge = await challengeFor(run, { purpose: "login", identityId: "usr_aaaaaaaaaaaaaaaa" });
    const expired = await challengeFor(run, { purpose: "login", identityId: key.identityId });
    const attempts = [
      () => send(run, "POST", "/v1/auth/tokens", { challengeId: wrongKey.challengeId, signature: other.sign(wrongKey.signingInput) }, headers),
      () => send(run, "POST", "/v1/auth/tokens", { challengeId: unknownChallenge.challengeId, signature: key.sign(unknownChallenge.signingInput) }, headers),
      () => send(run, "POST", "/v1/auth/tokens", { challengeId: "chl_nothing", signature: key.sign("x") }, headers),
      async () => {
        run.deps.advance(61_000);
        return send(run, "POST", "/v1/auth/tokens", { challengeId: expired.challengeId, signature: key.sign(expired.signingInput) }, headers);
      },
      () => send(run, "GET", "/v1/identities/me", undefined, { ...headers, ...bearer(`${token.slice(0, -1)}A`) }),
    ];
    const answers = [];
    for (const attempt of attempts) {
      const res = await attempt();
      answers.push({ status: res.status, challenge: res.headers.get("www-authenticate"), type: res.headers.get("content-type"), body: res.body });
    }
    for (const answer of answers) assert.deepEqual(answer, answers[0]);
    assert.equal(answers[0]?.status, 401);
    assert.equal(answers[0]?.challenge, 'Bearer realm="iynk"');
  });

  test("the sixth failed sign-in for one identity is a 429 and another identity is untouched", async () => {
    const { key } = await enrolled();
    const second = await enrolled();
    const stranger = makeDeviceKey();
    const fail = async (target: typeof key) => {
      const challenge = await challengeFor(run, { purpose: "login", identityId: target.identityId });
      return send(run, "POST", "/v1/auth/tokens", { challengeId: challenge.challengeId, signature: stranger.sign(challenge.signingInput) });
    };
    for (let i = 0; i < 5; i += 1) assert.equal((await fail(key)).status, 401);
    const sixth = await fail(key);
    assert.equal(sixth.status, 429);
    assert.equal(sixth.body.error.code, "rate_limited");
    assert.equal((await fail(second.key)).status, 401);
    run.deps.advance(61_000);
    assert.equal((await fail(key)).status, 401);
  });

  test("revoking the current token ends it", async () => {
    const { token } = await enrolled();
    assert.equal((await send(run, "DELETE", "/v1/auth/tokens/current", undefined, bearer(token))).status, 204);
    assert.equal((await send(run, "GET", "/v1/identities/me", undefined, bearer(token))).status, 401);
  });
});

describe("sessions", () => {
  test("the list marks the current session and revoking another one ends it", async () => {
    const { key, token } = await enrolled();
    const second = (await signIn(run, key, { "iynk-client": "iynk-web/1.2.3" })).body;
    const list = await send(run, "GET", "/v1/auth/sessions", undefined, bearer(token));
    assert.equal(list.status, 200);
    assert.equal(list.body.nextCursor, null);
    assert.equal(list.body.items.length, 2);
    const current = list.body.items.filter((item: { current: boolean }) => item.current);
    assert.equal(current.length, 1);
    const other = list.body.items.find((item: { id: string }) => item.id === second.sessionId);
    assert.equal(other.current, false);
    assert.equal(other.client, "iynk-web/1.2.3");

    assert.equal((await send(run, "DELETE", `/v1/auth/sessions/${second.sessionId}`, undefined, bearer(token))).status, 204);
    assert.equal((await send(run, "GET", "/v1/identities/me", undefined, bearer(second.token))).status, 401);
    assert.equal((await send(run, "DELETE", `/v1/auth/sessions/${second.sessionId}`, undefined, bearer(token))).status, 404);
  });

  test("another device's session is a 404", async () => {
    const { token } = await enrolled();
    const other = await enrolled();
    const theirs = (await send(run, "GET", "/v1/auth/sessions", undefined, bearer(other.token))).body.items[0].id;
    assert.equal((await send(run, "DELETE", `/v1/auth/sessions/${theirs}`, undefined, bearer(token))).status, 404);
  });

  test("the client header is stored cut to 120 characters", async () => {
    const { key } = await enrolled();
    const res = await signIn(run, key, { "iynk-client": `iynk-web/1.0.0 ${"x".repeat(200)}` });
    const stored = run.app.store.read((tx) => tx.get<{ client: string }>("SELECT client FROM sessions WHERE id = ?", res.body.sessionId)?.client);
    assert.equal(stored?.length, 120);
  });
});

describe("last used", () => {
  test("a session is touched at most once per 60 seconds", async () => {
    const { token } = await enrolled();
    const sessionId = (await send(run, "GET", "/v1/auth/sessions", undefined, bearer(token))).body.items[0].id as string;
    const start = lastUsed(sessionId);

    run.deps.advance(10_000);
    await send(run, "GET", "/v1/identities/me", undefined, bearer(token));
    run.deps.advance(10_000);
    await send(run, "GET", "/v1/identities/me", undefined, bearer(token));
    assert.equal(lastUsed(sessionId), start);

    run.deps.advance(41_000);
    await send(run, "GET", "/v1/identities/me", undefined, bearer(token));
    assert.equal(lastUsed(sessionId), run.deps.clock.now());
  });

  test("a busy store during the touch does not fail the request", async () => {
    const { token } = await enrolled();
    run.deps.advance(61_000);
    const original = run.app.store.transaction;
    run.app.store.transaction = () => {
      throw new Error("database is locked");
    };
    try {
      const res = await send(run, "GET", "/v1/identities/me", undefined, bearer(token));
      assert.equal(res.status, 200);
    } finally {
      run.app.store.transaction = original;
    }
  });
});

test("a malformed signature in a sign-in body is a plain 400", async () => {
  const res = await send(run, "POST", "/v1/auth/tokens", { challengeId: "chl_x", signature: toBase64Url(new Uint8Array(3)) });
  assert.equal(res.status, 400);
});
