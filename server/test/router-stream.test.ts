import assert from "node:assert/strict";
import { createServer, request, type Server } from "node:http";
import { after, before, test } from "node:test";
import { loadConfig } from "../src/config.ts";
import type { Deps } from "../src/deps.ts";
import { defineRoutes, type Authed } from "../src/http/classes.ts";
import { createLimiter, DEFAULT_RULES } from "../src/http/limits.ts";
import { createRouter } from "../src/http/router.ts";
import { createLogger } from "../src/ops/log.ts";

const ORIGIN = "https://iynk.example";
const config = loadConfig(
  { IYNK_PUBLIC_URL: ORIGIN, IYNK_ALLOWED_ORIGINS: ORIGIN, IYNK_MIN_CLIENT: "0.2.0" },
  { statMode: () => null, isWritable: () => true, uid: () => 1000 },
);
const authed: Authed = { deviceId: "dev_1", identityId: "id_1", role: "owner", sessionId: "ses_1", name: "Ana", deleting: false };
const deps: Deps = { clock: { now: () => 5_000 }, ids: { random: (bytes) => Uint8Array.from({ length: bytes }, (_, i) => i) }, sleep: async () => {} };

const CHUNK = 64 * 1024;
const TOTAL = 3 * 1024 * 1024;
const chunkAt = (i: number) => new Uint8Array(CHUNK).fill(i % 251);

let produced = 0;
let finish: { bytes: number; aborted: boolean } | null = null;
let signalAborted: boolean | null = null;
let hangingSignal: AbortSignal | null = null;

async function* source(count: number): AsyncGenerator<Uint8Array> {
  for (let i = 0; i < count; i++) {
    produced++;
    yield chunkAt(i);
  }
}

const routes = defineRoutes([
  {
    method: "POST",
    path: "/v1/ai/relay",
    operation: "relay",
    cls: "device",
    bucket: "ai.relay",
    handler: (ctx) => ({
      status: 200,
      headers: { "content-type": "application/octet-stream", "x-iynk-upstream-status": "200" },
      stream: (async function* () {
        yield* source(TOTAL / CHUNK);
        signalAborted = ctx.signal.aborted;
      })(),
      onFinish: (info) => void (finish = info),
    }),
  },
  {
    method: "GET",
    path: "/v1/slow",
    operation: "slow",
    cls: "device",
    bucket: "read",
    handler: (ctx) => {
      hangingSignal = ctx.signal;
      return {
        status: 200,
        stream: (async function* () {
          for (;;) {
            yield new Uint8Array(1024);
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        })(),
        onFinish: (info) => void (finish = info),
      };
    },
  },
  { method: "GET", path: "/v1/plain", operation: "plain", cls: "device", bucket: "tools", handler: () => ({ status: 200, body: { ok: true } }) },
]);

let server: Server;
let port = 0;
const auth = { authorization: "Bearer good-token" };

before(async () => {
  const limiter = createLimiter(deps, { ...DEFAULT_RULES, tools: [{ limit: 2, windowMs: 60_000 }] });
  server = createServer(createRouter({ routes, config, deps, log: createLogger({ level: "silent" }), limiter, authenticate: (token) => (token === "good-token" ? authed : null) }));
  for (let candidate = 47000 + Math.floor(Math.random() * 1000); ; candidate = 47000 + ((candidate - 46999) % 1000)) {
    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(candidate, "127.0.0.1", () => {
          server.off("error", reject);
          resolve();
        });
      });
      port = candidate;
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EADDRINUSE") throw error;
    }
  }
});

after(() => {
  server.closeAllConnections();
  server.close();
});

const until = async (check: () => boolean, ms = 1000) => {
  const end = Date.now() + ms;
  while (!check() && Date.now() < end) await new Promise((resolve) => setTimeout(resolve, 10));
};

test("a 3 MiB stream arrives complete and the signal stays quiet", async () => {
  produced = 0;
  finish = null;
  signalAborted = null;
  const received = await new Promise<{ headers: Record<string, unknown>; bytes: Buffer }>((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, method: "POST", path: "/v1/ai/relay", headers: auth, agent: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve({ headers: res.headers, bytes: Buffer.concat(chunks) }));
    });
    req.on("error", reject);
    req.end();
  });
  assert.equal(received.bytes.length, TOTAL);
  for (let i = 0; i < TOTAL / CHUNK; i++) assert.ok(received.bytes.subarray(i * CHUNK, (i + 1) * CHUNK).equals(chunkAt(i)), `chunk ${i}`);
  assert.equal(signalAborted, false);
  assert.equal(received.headers["x-iynk-upstream-status"], "200");
  assert.equal(received.headers["access-control-allow-origin"], undefined);
  await until(() => finish !== null);
  assert.deepEqual(finish, { bytes: TOTAL, aborted: false });
});

test("a stopped reader pauses the producer", async () => {
  produced = 0;
  await new Promise<void>((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, method: "POST", path: "/v1/ai/relay", headers: auth, agent: false }, (res) => {
      res.pause();
      setTimeout(() => {
        const whileStopped = produced;
        assert.ok(whileStopped < TOTAL / CHUNK, `producer ran ahead: ${whileStopped}`);
        req.destroy();
        resolve();
      }, 300);
    });
    req.on("error", () => {});
    req.on("close", () => {});
    req.end();
    void reject;
  });
});

test("the signal aborts within a second when the client leaves", async () => {
  finish = null;
  hangingSignal = null;
  await new Promise<void>((resolve) => {
    const req = request({ host: "127.0.0.1", port, method: "GET", path: "/v1/slow", headers: auth, agent: false }, (res) => {
      res.once("data", () => {
        req.destroy();
        resolve();
      });
    });
    req.on("error", () => {});
    req.end();
  });
  const watched = () => (hangingSignal as AbortSignal | null)?.aborted;
  await until(() => watched() === true);
  assert.equal(watched(), true);
  await until(() => finish !== null);
  assert.equal((finish as unknown as { aborted: boolean }).aborted, true);
});

test("a plain reply and the new bucket limits behave as configured", async () => {
  const get = () =>
    new Promise<number>((resolve, reject) => {
      const req = request({ host: "127.0.0.1", port, method: "GET", path: "/v1/plain", headers: auth, agent: false }, (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode ?? 0));
      });
      req.on("error", reject);
      req.end();
    });
  assert.equal(await get(), 200);
  assert.equal(await get(), 200);
  assert.equal(await get(), 429);
});
