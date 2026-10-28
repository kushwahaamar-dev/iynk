import assert from "node:assert/strict";
import { createServer, request, type Server } from "node:http";
import { after, before, beforeEach, describe, test } from "node:test";
import { loadConfig } from "../src/config.ts";
import type { Deps } from "../src/deps.ts";
import { defineRoutes, type Authed } from "../src/http/classes.ts";
import { ApiError } from "../src/http/errors.ts";
import { createLimiter, type Limiter } from "../src/http/limits.ts";
import { createRouter } from "../src/http/router.ts";
import { createLogger } from "../src/ops/log.ts";

const ORIGIN = "https://iynk.example";
const config = loadConfig(
  { IYNK_PUBLIC_URL: ORIGIN, IYNK_ALLOWED_ORIGINS: ORIGIN, IYNK_MIN_CLIENT: "0.2.0", IYNK_TRUST_PROXY: "1" },
  { statMode: () => null, isWritable: () => true, uid: () => 1000 },
);
const authed: Authed = { deviceId: "dev_1", identityId: "id_1", role: "owner", sessionId: "ses_1", name: "Ana", deleting: false };

const deps: Deps = { clock: { now: () => 5_000 }, ids: { random: (bytes) => Uint8Array.from({ length: bytes }, (_, i) => i) }, sleep: async () => {} };

const routes = defineRoutes([
  { method: "GET", path: "/v1/ping", operation: "ping", cls: "public", bucket: "public.read", handler: (ctx) => ({ status: 200, body: { pong: true, address: ctx.address, req: ctx.requestId } }) },
  { method: "GET", path: "/v1/server", operation: "getServerInfo", cls: "public", bucket: "public.read", handler: () => ({ status: 200, body: { ok: true } }) },
  { method: "GET", path: "/healthz", operation: "getHealth", cls: "public", bucket: "public.read", handler: () => ({ status: 200, body: { ok: true } }) },
  { method: "GET", path: "/v1/things/{id}", operation: "getThing", cls: "public", bucket: "public.read", handler: (ctx) => ({ status: 200, body: { id: ctx.params["id"], q: ctx.query.get("q") } }) },
  { method: "POST", path: "/v1/echo", operation: "echo", cls: "capability", bucket: "write", handler: (ctx) => ({ status: 200, body: ctx.body ?? null }) },
  { method: "PATCH", path: "/v1/small", operation: "small", cls: "capability", bucket: "write", maxBodyBytes: 16, handler: (ctx) => ({ status: 200, body: ctx.body ?? null }) },
  { method: "GET", path: "/v1/me", operation: "getMe", cls: "device", bucket: "read", handler: (ctx) => ({ status: 200, body: { device: ctx.authed?.deviceId } }) },
  { method: "GET", path: "/v1/boom", operation: "boom", cls: "public", bucket: "public.read", handler: () => { throw new Error("secret detail"); } },
  { method: "GET", path: "/v1/nope", operation: "nope", cls: "public", bucket: "public.read", handler: () => { throw new ApiError(409, "conflict", "Already done.", [{ path: "/x" }]); } },
  { method: "GET", path: "/v1/old", operation: "old", cls: "removed", bucket: "public.read" },
  { method: "GET", path: "/v1/guess", operation: "guess", cls: "public", bucket: "pairing.guess", handler: () => ({ status: 204 }) },
]);

type Answer = { status: number; headers: Record<string, string | string[] | undefined>; text: string };
type Call = { method?: string; path: string; headers?: Record<string, string>; body?: string | Buffer };

let server: Server;
let port = 0;
let limiter: Limiter;
const logger = createLogger({ level: "silent" });

function call(c: Call): Promise<Answer> {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, method: c.method ?? "GET", path: c.path, headers: c.headers, agent: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, text: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    req.end(c.body);
  });
}

const json = { "content-type": "application/json" };

before(async () => {
  limiter = createLimiter(deps);
  const handler = createRouter({ routes, config, deps, log: logger, limiter, authenticate: (token) => (token === "good-token" ? authed : null) });
  server = createServer(handler);
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

beforeEach(() => {
  limiter.reset();
});

describe("headers", () => {
  for (const [name, c, status] of [
    ["200", { path: "/v1/ping" }, 200],
    ["404", { path: "/v1/missing" }, 404],
    ["500", { path: "/v1/boom" }, 500],
  ] as [string, Call, number][]) {
    test(`a ${name} answer carries the standard headers`, async () => {
      const answer = await call(c);
      assert.equal(answer.status, status);
      assert.equal(answer.headers["iynk-api-version"], "1.0");
      assert.equal(answer.headers["x-content-type-options"], "nosniff");
      assert.equal(answer.headers["cache-control"], "no-store");
      assert.equal(answer.headers["cross-origin-resource-policy"], "same-site");
      assert.match(String(answer.headers["x-request-id"]), /^req_[0-9a-z]{10}$/);
      assert.equal(answer.headers["server"], undefined);
      assert.equal(answer.headers["x-powered-by"], undefined);
      assert.equal(answer.headers["access-control-allow-origin"], undefined);
    });
  }

  test("a 429 carries the standard headers", async () => {
    for (let i = 0; i < 10; i++) await call({ path: "/v1/guess" });
    const answer = await call({ path: "/v1/guess" });
    assert.equal(answer.status, 429);
    assert.equal(answer.headers["iynk-api-version"], "1.0");
  });

  test("a valid X-Request-Id is kept and a junk one replaced", async () => {
    const kept = await call({ path: "/v1/ping", headers: { "x-request-id": "client-req-1234" } });
    assert.equal(kept.headers["x-request-id"], "client-req-1234");
    const replaced = await call({ path: "/v1/ping", headers: { "x-request-id": "no spaces allowed" } });
    assert.match(String(replaced.headers["x-request-id"]), /^req_/);
  });
});

describe("matching", () => {
  test("a path template fills params and the query is parsed", async () => {
    const answer = await call({ path: "/v1/things/a%20b?q=1" });
    assert.deepEqual(JSON.parse(answer.text), { id: "a b", q: "1" });
  });

  test("an unknown path is 404 not_found with the envelope", async () => {
    const answer = await call({ path: "/v2/ping" });
    assert.equal(answer.status, 404);
    const error = JSON.parse(answer.text).error;
    assert.equal(error.code, "not_found");
    assert.equal(error.requestId, answer.headers["x-request-id"]);
  });

  test("a wrong method is 405 with Allow", async () => {
    const answer = await call({ method: "DELETE", path: "/v1/ping" });
    assert.equal(answer.status, 405);
    assert.equal(answer.headers["allow"], "GET, HEAD, OPTIONS");
  });

  test("HEAD is answered like GET without a body", async () => {
    const answer = await call({ method: "HEAD", path: "/v1/ping" });
    assert.equal(answer.status, 200);
    assert.equal(answer.text, "");
  });

  test("double slashes, encoded slashes, bad escapes and a trailing slash do not match", async () => {
    for (const path of ["//v1/ping", "/v1//ping", "/v1/things/a%2Fb", "/v1/things/a%5cb", "/v1/things/%zz", "/v1/ping/", "/v1/things/"]) {
      assert.equal((await call({ path })).status, 404, path);
    }
  });

  test("a removed route answers 410", async () => {
    const answer = await call({ path: "/v1/old" });
    assert.equal(answer.status, 410);
    assert.equal(JSON.parse(answer.text).error.code, "gone");
  });

  test("an ApiError from a handler keeps its status, code and details", async () => {
    const answer = await call({ path: "/v1/nope" });
    assert.equal(answer.status, 409);
    assert.deepEqual(JSON.parse(answer.text).error.details, [{ path: "/x" }]);
  });

  test("a throw becomes 500 internal and hides the text", async () => {
    const answer = await call({ path: "/v1/boom" });
    assert.equal(answer.status, 500);
    assert.equal(JSON.parse(answer.text).error.code, "internal");
    assert.ok(!answer.text.includes("secret detail"));
  });
});

describe("origins", () => {
  test("an allowed origin is echoed exactly, with Vary and no credentials", async () => {
    const answer = await call({ path: "/v1/ping", headers: { origin: ORIGIN } });
    assert.equal(answer.status, 200);
    assert.equal(answer.headers["access-control-allow-origin"], ORIGIN);
    assert.equal(answer.headers["vary"], "Origin");
    assert.match(String(answer.headers["access-control-expose-headers"]), /retry-after/);
    assert.equal(answer.headers["access-control-allow-credentials"], undefined);
  });

  test("an unlisted origin is 403 forbidden_origin on any request", async () => {
    for (const origin of ["https://evil.example", "null", "https://iynk.example.evil.example", "http://iynk.example"]) {
      for (const path of ["/v1/ping", "/v1/missing"]) {
        const answer = await call({ path, headers: { origin } });
        assert.equal(answer.status, 403, origin);
        assert.equal(JSON.parse(answer.text).error.code, "forbidden_origin");
        assert.equal(answer.headers["access-control-allow-origin"], undefined);
      }
    }
  });

  test("a preflight from a listed origin answers 204 with the allow headers", async () => {
    const answer = await call({ method: "OPTIONS", path: "/v1/echo", headers: { origin: ORIGIN, "access-control-request-method": "POST" } });
    assert.equal(answer.status, 204);
    assert.equal(answer.headers["access-control-allow-origin"], ORIGIN);
    assert.equal(answer.headers["vary"], "Origin");
    assert.equal(answer.headers["access-control-allow-headers"], "authorization, content-type, idempotency-key, if-none-match, iynk-client, x-request-id, x-iynk-provider-key");
    assert.match(String(answer.headers["access-control-allow-methods"]), /PATCH/);
    assert.equal(answer.headers["access-control-allow-credentials"], undefined);
  });

  test("a preflight from an unlisted origin is refused", async () => {
    const answer = await call({ method: "OPTIONS", path: "/v1/echo", headers: { origin: "https://evil.example", "access-control-request-method": "POST" } });
    assert.equal(answer.status, 403);
    assert.equal(answer.headers["access-control-allow-origin"], undefined);
  });

  test("no response ever carries a wildcard origin", async () => {
    const wildcard = [] as string[];
    for (const c of [
      { path: "/v1/ping" },
      { path: "/v1/ping", headers: { origin: ORIGIN } },
      { path: "/v1/ping", headers: { origin: "https://evil.example" } },
      { method: "OPTIONS", path: "/v1/ping", headers: { origin: ORIGIN } },
      { path: "/v1/me" },
    ] as Call[]) {
      const answer = await call(c);
      if (answer.headers["access-control-allow-origin"] === "*") wildcard.push(c.path);
    }
    assert.deepEqual(wildcard, []);
  });
});

describe("bodies", () => {
  test("a JSON body reaches the handler", async () => {
    const answer = await call({ method: "POST", path: "/v1/echo", headers: json, body: '{"a":[1,{"b":2}]}' });
    assert.deepEqual(JSON.parse(answer.text), { a: [1, { b: 2 }] });
  });

  test("a content type with a charset is accepted", async () => {
    const answer = await call({ method: "POST", path: "/v1/echo", headers: { "content-type": "application/json; charset=utf-8" }, body: "{}" });
    assert.equal(answer.status, 200);
  });

  test("a body that is not JSON by content type is 415", async () => {
    const answer = await call({ method: "POST", path: "/v1/echo", headers: { "content-type": "text/plain" }, body: "{}" });
    assert.equal(answer.status, 415);
    assert.equal(JSON.parse(answer.text).error.code, "unsupported_media_type");
    assert.equal((await call({ method: "POST", path: "/v1/echo", body: "{}" })).status, 415);
  });

  test("no body needs no content type", async () => {
    const answer = await call({ method: "POST", path: "/v1/echo" });
    assert.equal(answer.status, 200);
    assert.equal(answer.text, "null");
  });

  test("bad JSON is 400 bad_json", async () => {
    for (const body of ["{", "not json", '{"a":1,"a":2}', '{"x":{"y":1,"\\u0079":2}}', "\xff\xfe", "[" .repeat(33) + "]".repeat(33)]) {
      const answer = await call({ method: "POST", path: "/v1/echo", headers: json, body: Buffer.from(body, "latin1") });
      assert.equal(answer.status, 400, body);
      assert.equal(JSON.parse(answer.text).error.code, "bad_json");
    }
  });

  test("nesting at the limit passes and repeated keys in different objects pass", async () => {
    const deep = "[".repeat(32) + "]".repeat(32);
    assert.equal((await call({ method: "POST", path: "/v1/echo", headers: json, body: deep })).status, 200);
    assert.equal((await call({ method: "POST", path: "/v1/echo", headers: json, body: '[{"a":1},{"a":2},{"b":"a"}]' })).status, 200);
  });

  test("a key text inside a string value is not mistaken for a key", async () => {
    const body = '{"a":"\\"a\\":1","b":"x"}';
    assert.equal((await call({ method: "POST", path: "/v1/echo", headers: json, body })).status, 200);
  });

  test("a body over the default cap is 413", async () => {
    const answer = await call({ method: "POST", path: "/v1/echo", headers: json, body: JSON.stringify({ pad: "x".repeat(64 * 1024) }) });
    assert.equal(answer.status, 413);
    assert.equal(JSON.parse(answer.text).error.code, "too_large");
  });

  test("a route can lower the cap", async () => {
    assert.equal((await call({ method: "PATCH", path: "/v1/small", headers: json, body: '{"a":"12345"}' })).status, 200);
    assert.equal((await call({ method: "PATCH", path: "/v1/small", headers: json, body: '{"a":"1234567890"}' })).status, 413);
  });

  test("a chunked body is capped while it streams", async () => {
    const answer = await new Promise<Answer>((resolve, reject) => {
      const req = request({ host: "127.0.0.1", port, method: "POST", path: "/v1/echo", headers: { ...json, "transfer-encoding": "chunked" }, agent: false }, (res) => {
        let text = "";
        res.on("data", (chunk: Buffer) => (text += chunk.toString()));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, text }));
      });
      req.on("error", reject);
      req.write('{"pad":"');
      req.write("x".repeat(40 * 1024));
      req.write("y".repeat(40 * 1024));
      req.end('"}');
    });
    assert.equal(answer.status, 413);
  });
});

describe("client version", () => {
  const old = { "iynk-client": "iynk-web/0.1.0" };

  test("an old client gets 426 on a normal route", async () => {
    const answer = await call({ path: "/v1/ping", headers: old });
    assert.equal(answer.status, 426);
    assert.equal(JSON.parse(answer.text).error.code, "upgrade_required");
  });

  test("the probe routes answer an old client", async () => {
    for (const path of ["/v1/server", "/healthz"]) assert.equal((await call({ path, headers: old })).status, 200, path);
  });

  test("a current client, a missing header and a header without a semver pass", async () => {
    for (const headers of [{ "iynk-client": "iynk-web/0.2.0" }, { "iynk-client": "iynk-web/1.0.0" }, { "iynk-client": "iynk-web/0.10.0" }, {}, { "iynk-client": "curl" }, { "iynk-client": "iynk-web/dev" }] as Record<string, string>[]) {
      assert.equal((await call({ path: "/v1/ping", headers })).status, 200, JSON.stringify(headers));
    }
    assert.equal((await call({ path: "/v1/ping", headers: { "iynk-client": "iynk-web/0.1.9" } })).status, 426);
  });
});

describe("authentication", () => {
  test("a device route with a good token runs the handler", async () => {
    const answer = await call({ path: "/v1/me", headers: { authorization: "Bearer good-token" } });
    assert.deepEqual(JSON.parse(answer.text), { device: "dev_1" });
  });

  test("every failure is the same 401", async () => {
    const seen = new Set<string>();
    for (const authorization of [undefined, "Bearer wrong", "Basic good-token", "Bearer", "Bearer a b", `Bearer ${"x".repeat(600)}`]) {
      const answer = await call({ path: "/v1/me", headers: authorization ? { authorization } : {} });
      assert.equal(answer.status, 401);
      assert.equal(answer.headers["www-authenticate"], 'Bearer realm="iynk"');
      const error = JSON.parse(answer.text).error;
      assert.equal(error.code, "unauthorized");
      assert.equal(error.details, undefined);
      seen.add(error.message);
    }
    assert.equal(seen.size, 1);
  });

  test("an authenticated caller is limited per device, not per address", async () => {
    for (let i = 0; i < 300; i++) assert.equal((await call({ path: "/v1/me", headers: { authorization: "Bearer good-token" } })).status, 200);
    assert.equal((await call({ path: "/v1/me", headers: { authorization: "Bearer good-token" } })).status, 429);
    assert.equal((await call({ path: "/v1/me", headers: { authorization: "Bearer bad" } })).status, 401);
  });
});

describe("rate limits and addresses", () => {
  test("a 429 has Retry-After, retryAfterSeconds and RateLimit headers", async () => {
    let last = await call({ path: "/v1/guess" });
    assert.equal(last.headers["ratelimit-limit"], "10");
    assert.equal(last.headers["ratelimit-remaining"], "9");
    for (let i = 0; i < 9; i++) last = await call({ path: "/v1/guess" });
    assert.equal(last.headers["ratelimit-remaining"], "0");
    const refused = await call({ path: "/v1/guess" });
    assert.equal(refused.status, 429);
    assert.equal(refused.headers["retry-after"], "60");
    assert.equal(refused.headers["ratelimit-remaining"], "0");
    const error = JSON.parse(refused.text).error;
    assert.equal(error.code, "rate_limited");
    assert.equal(error.retryAfterSeconds, 60);
  });

  test("X-Forwarded-For picks the caller's bucket when a proxy is trusted", async () => {
    for (let i = 0; i < 10; i++) await call({ path: "/v1/guess", headers: { "x-forwarded-for": "9.9.9.9, 1.1.1.1" } });
    assert.equal((await call({ path: "/v1/guess", headers: { "x-forwarded-for": "9.9.9.9, 1.1.1.1" } })).status, 429);
    assert.equal((await call({ path: "/v1/guess", headers: { "x-forwarded-for": "9.9.9.9, 2.2.2.2" } })).status, 204);
  });

  test("the context carries the address the limiter used", async () => {
    const answer = await call({ path: "/v1/ping", headers: { "x-forwarded-for": "6.6.6.6, 3.3.3.3" } });
    assert.equal(JSON.parse(answer.text).address, "3.3.3.3");
  });
});
