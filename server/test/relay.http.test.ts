import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { bearer, enrol, type Answer } from "./enrol-flow.ts";
import { startApp, type Running } from "./http-helpers.ts";
import { makeDeviceKey } from "./keys.ts";
import { startStub, type Stub } from "./stub-upstream.ts";

const KEY = "iynk-canary-KEY-0001-do-not-use";
const BODY_CANARY = "iynk-canary-BODY-0002-do-not-log";
const MIB = 1024 * 1024;

let run: Running | undefined;
let stub: Stub | undefined;

afterEach(async () => {
  await run?.stop();
  await stub?.stop();
  run = undefined;
  stub = undefined;
});

async function setup(answer: Parameters<typeof startStub>[0], env: Record<string, string> = {}): Promise<{ token: string; call(body?: unknown): Promise<Response> }> {
  stub = await startStub(answer);
  run = await startApp({ env: { IYNK_AI_ENABLE: "1", IYNK_AI_RELAY_ALLOW_PRIVATE: "1", IYNK_AI_ALLOWED_HOSTS: `127.0.0.1:${stub.port}`, ...env } });
  const joined: Answer = await enrol(run, makeDeviceKey());
  const token = joined.body.accessToken.token as string;
  const base = run.base;
  const baseUrl = `http://127.0.0.1:${stub.port}/v1`;
  return {
    token,
    call: (body = { profile: { family: "openai-compat", baseUrl }, path: "chat", body: { note: BODY_CANARY } }) =>
      fetch(`${base}/v1/ai/relay`, { method: "POST", headers: { ...bearer(token), "content-type": "application/json", "x-iynk-provider-key": KEY }, body: JSON.stringify(body) }),
  };
}

describe("relay over HTTP", () => {
  test("SSE arrives in order with the upstream status and only the family headers go upstream", async () => {
    const { call } = await setup((_req, res) => {
      res.writeHead(200, { "content-type": "text/event-stream", "set-cookie": "a=b" });
      res.write("data: 1\n\n");
      setTimeout(() => res.end("data: 2\n\n"), 20);
    });
    const res = await call();
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-iynk-upstream-status"), "200");
    assert.equal(res.headers.get("content-type"), "text/event-stream");
    assert.equal(res.headers.get("set-cookie"), null);
    assert.equal(await res.text(), "data: 1\n\ndata: 2\n\n");
    const seen = (stub as Stub).seen[0];
    assert.equal(seen?.url, "/v1/chat/completions");
    assert.equal(seen?.headers["authorization"], `Bearer ${KEY}`);
    assert.equal(seen?.headers["host"], `127.0.0.1:${(stub as Stub).port}`);
    assert.equal(seen?.headers["cookie"], undefined);
  });

  test("a 9 MiB answer is cut at 8 MiB", async () => {
    const { call } = await setup((_req, res) => {
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.end(Buffer.alloc(9 * MIB, 1));
    });
    const res = await call();
    assert.equal((await res.arrayBuffer()).byteLength, 8 * MIB);
  });

  test("provider 401, 404 and 429 pass through with the upstream status", async () => {
    for (const status of [401, 404, 429]) {
      const { call } = await setup((_req, res) => {
        res.writeHead(status, { "content-type": "application/json", "retry-after": "7" });
        res.end('{"error":"nope"}');
      });
      const res = await call();
      assert.equal(res.status, status);
      assert.equal(res.headers.get("x-iynk-upstream-status"), String(status));
      assert.equal(res.headers.get("retry-after"), "7");
      assert.equal(await res.text(), '{"error":"nope"}');
      await run?.stop();
      await stub?.stop();
    }
    run = undefined;
    stub = undefined;
  });

  test("a provider 500 becomes 502 with no provider text", async () => {
    const { call } = await setup((_req, res) => {
      res.writeHead(500);
      res.end("secret provider internals");
    });
    const res = await call();
    const text = await res.text();
    assert.equal(res.status, 502);
    assert.equal(res.headers.get("x-iynk-upstream-status"), null);
    assert.equal(JSON.parse(text).error.code, "upstream_failed");
    assert.ok(!text.includes("secret provider internals"));
  });

  test("a redirect is 502 and nothing follows it", async () => {
    const { call } = await setup((_req, res) => {
      res.writeHead(302, { location: "http://169.254.169.254/latest" });
      res.end();
    });
    const res = await call();
    assert.equal(res.status, 502);
    assert.equal((stub as Stub).seen.length, 1);
  });

  test("a client that leaves closes the upstream socket within a second", async () => {
    const { token } = await setup((_req, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write("data: first\n\n");
    });
    const controller = new AbortController();
    const baseUrl = `http://127.0.0.1:${(stub as Stub).port}/v1`;
    const res = await fetch(`${(run as Running).base}/v1/ai/relay`, {
      method: "POST",
      headers: { ...bearer(token), "content-type": "application/json", "x-iynk-provider-key": KEY },
      body: JSON.stringify({ profile: { family: "openai-compat", baseUrl }, path: "chat", body: {} }),
      signal: controller.signal,
    });
    await (res.body as ReadableStream<Uint8Array>).getReader().read();
    const started = Date.now();
    controller.abort();
    while ((stub as Stub).sockets.size > 0 && Date.now() - started < 1000) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal((stub as Stub).sockets.size, 0);
  });

  test("the key and the body never reach the log", async () => {
    const { call } = await setup((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });
    const res = await call();
    await res.text();
    const lines = (run as Running).app.log.lines().join("\n");
    assert.match(lines, /ai\.relay/);
    assert.ok(!lines.includes(KEY));
    assert.ok(!lines.includes(BODY_CANARY));
    const rows = (run as Running).app.store.read((tx) => tx.all("SELECT * FROM usage"));
    assert.ok(!JSON.stringify(rows).includes(KEY));
  });

  test("a private target is refused when the operator has not allowed private addresses", async () => {
    const { call } = await setup((_req, res) => res.end(), { IYNK_AI_RELAY_ALLOW_PRIVATE: "0" });
    const res = await call();
    assert.equal(res.status, 422);
    assert.equal((stub as Stub).seen.length, 0);
  });
});
