import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { bearer, enrol } from "./enrol-flow.ts";
import { startApp, type Running } from "./http-helpers.ts";
import { makeDeviceKey } from "./keys.ts";
import { startStub, type Stub } from "./stub-upstream.ts";

const KEY = "iynk-canary-KEY-0001-do-not-use";
const PROFILE = { family: "openai-compat", baseUrl: "https://api.openai.com/v1" };

let run: Running | undefined;
let stub: Stub | undefined;

afterEach(async () => {
  await run?.stop();
  await stub?.stop();
  run = undefined;
  stub = undefined;
});

async function start(env: Record<string, string> = {}): Promise<{ post(body: string, headers?: Record<string, string>): Promise<Response>; token: string }> {
  run = await startApp({ env: { IYNK_AI_ENABLE: "1", ...env } });
  const joined = await enrol(run, makeDeviceKey());
  const token = joined.body.accessToken.token as string;
  const base = run.base;
  return {
    token,
    post: (body, headers = {}) =>
      fetch(`${base}/v1/ai/relay`, { method: "POST", headers: { ...bearer(token), "content-type": "application/json", "x-iynk-provider-key": KEY, ...headers }, body }),
  };
}

const valid = JSON.stringify({ profile: PROFILE, path: "chat", body: {} });

describe("POST /v1/ai/relay", () => {
  test("no token is 401", async () => {
    await start();
    const res = await fetch(`${(run as Running).base}/v1/ai/relay`, { method: "POST", headers: { "content-type": "application/json" }, body: valid });
    assert.equal(res.status, 401);
  });

  test("the module off answers 501 and the probe says so", async () => {
    const { post } = await start({ IYNK_AI_ENABLE: "0" });
    const res = await post(valid);
    assert.equal(res.status, 501);
    assert.equal(((await res.json()) as { error: { code: string } }).error.code, "feature_disabled");
    const info = (await (await (run as Running).get("/v1/server")).json()) as { features: { aiRelay: boolean } };
    assert.equal(info.features.aiRelay, false);
  });

  test("a missing key is 422, a bad body is 400, a wrong content type is 415", async () => {
    const { post } = await start();
    assert.equal((await post(valid, { "x-iynk-provider-key": "short" })).status, 422);
    assert.equal((await post(JSON.stringify({ profile: PROFILE, path: "chat" }))).status, 400);
    assert.equal((await post(valid, { "content-type": "text/plain" })).status, 415);
  });

  test("a body over 262,144 bytes is 413", async () => {
    const { post } = await start();
    const big = JSON.stringify({ profile: PROFILE, path: "chat", body: { text: "x".repeat(262_145) } });
    assert.equal((await post(big)).status, 413);
  });

  test("an unlisted host and a metadata address are refused before any connection", async () => {
    const { post } = await start({ IYNK_AI_RELAY_ALLOW_PRIVATE: "1" });
    for (const baseUrl of ["https://evil.example/v1", "http://169.254.169.254/v1", "http://127.0.0.1:9/v1"]) {
      const res = await post(JSON.stringify({ profile: { ...PROFILE, baseUrl }, path: "chat", body: {} }));
      assert.equal(res.status, 422, baseUrl);
      assert.equal(((await res.json()) as { error: { code: string } }).error.code, "relay_target_refused");
    }
  });

  test("a fifth concurrent call from one device is 429", async () => {
    stub = await startStub(() => {});
    const { post } = await start({ IYNK_AI_RELAY_ALLOW_PRIVATE: "1", IYNK_AI_ALLOWED_HOSTS: `127.0.0.1:${stub.port}` });
    const body = JSON.stringify({ profile: { family: "openai-compat", baseUrl: `http://127.0.0.1:${stub.port}/v1` }, path: "chat", body: {} });
    const held = Array.from({ length: 4 }, () => post(body));
    while (stub.seen.length < 4) await new Promise((resolve) => setTimeout(resolve, 10));
    const fifth = await post(body);
    assert.equal(fifth.status, 429);
    assert.equal(((await fifth.json()) as { error: { code: string } }).error.code, "rate_limited");
    stub.sockets.forEach((socket) => socket.destroy());
    await Promise.allSettled(held);
  });

  test("the call after the daily cap is 429 quota_exhausted with Retry-After", async () => {
    stub = await startStub((_req, res) => res.end("{}"));
    const env = { IYNK_AI_RELAY_ALLOW_PRIVATE: "1", IYNK_AI_ALLOWED_HOSTS: `127.0.0.1:${stub.port}`, IYNK_AI_DAILY_REQUESTS: "2" };
    const { post } = await start(env);
    const body = JSON.stringify({ profile: { family: "openai-compat", baseUrl: `http://127.0.0.1:${stub.port}/v1` }, path: "chat", body: {} });
    for (let i = 0; i < 2; i++) assert.equal((await post(body)).status, 200);
    const third = await post(body);
    assert.equal(third.status, 429);
    assert.equal(((await third.json()) as { error: { code: string } }).error.code, "quota_exhausted");
    assert.ok(Number(third.headers.get("retry-after")) > 0);
  });
});
