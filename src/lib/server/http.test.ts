// @vitest-environment node
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { checkOrigin, clientIp, fail, json, parseBody, parseForm, withTimeout } from "./http";

const Body = z.object({ name: z.string().max(5), n: z.number().int() });

function post(body: BodyInit | null, headers: Record<string, string> = { "content-type": "application/json" }) {
  return new Request("http://localhost/api/x", { method: "POST", body, headers });
}

describe("json and fail", () => {
  it("never lets responses be cached by default", async () => {
    const res = json({ a: 1 });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ a: 1 });
    expect(json({}, { headers: { "cache-control": "public, max-age=60" } }).headers.get("cache-control")).toBe(
      "public, max-age=60",
    );
  });

  it("uses the contract's error shape", async () => {
    const res = fail(503, "not_configured");
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: { code: "not_configured", message: "This feature is not set up on this deployment." },
    });
  });
});

describe("parseBody", () => {
  it("returns the parsed data", async () => {
    const parsed = await parseBody(post(JSON.stringify({ name: "ab", n: 2 })), Body);
    expect(parsed).toEqual({ ok: true, data: { name: "ab", n: 2 } });
  });

  it("rejects bodies that are not JSON-typed, malformed, too large or invalid", async () => {
    const cases: [Request, number, string][] = [
      [post("{}", { "content-type": "text/plain" }), 415, "unsupported_media_type"],
      [post("{nope"), 400, "bad_json"],
      [post(JSON.stringify({ name: "x".repeat(400), n: 1 })), 413, "too_large"],
      [post(JSON.stringify({ name: "toolong", n: 1.5 })), 400, "bad_request"],
    ];
    for (const [req, status, code] of cases) {
      const parsed = await parseBody(req, Body, { maxBytes: 200 });
      expect(parsed.ok).toBe(false);
      if (parsed.ok) continue;
      expect(parsed.response.status).toBe(status);
      expect((await parsed.response.json()).error.code).toBe(code);
    }
  });

  it("names the failing fields without echoing values", async () => {
    const parsed = await parseBody(post(JSON.stringify({ name: "secret-value", n: "x" })), Body);
    if (parsed.ok) throw new Error("expected failure");
    const { message } = (await parsed.response.json()).error;
    expect(message).toMatch(/^name: .*; n: /);
    expect(message).not.toContain("secret-value");
  });

  it("stops reading a streamed body past the cap even without content-length", async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(100).fill(32));
      },
    });
    const req = new Request("http://localhost/api/x", {
      method: "POST",
      body: stream,
      headers: { "content-type": "application/json" },
      duplex: "half",
    } as RequestInit);
    const parsed = await parseBody(req, Body, { maxBytes: 1000 });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.response.status).toBe(413);
  });
});

describe("parseForm", () => {
  it("reads multipart bodies and enforces the cap", async () => {
    const form = new FormData();
    form.set("lang", "es");
    form.set("audio", new Blob([new Uint8Array(10)], { type: "audio/wav" }), "a.wav");
    const req = new Request("http://localhost/api/x", { method: "POST", body: form });
    const parsed = await parseForm(req, { maxBytes: 4096 });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.get("lang")).toBe("es");

    const big = new FormData();
    big.set("audio", new Blob([new Uint8Array(5000)]), "a.wav");
    const tooBig = await parseForm(new Request("http://localhost/api/x", { method: "POST", body: big }), {
      maxBytes: 4096,
    });
    expect(tooBig.ok).toBe(false);
  });

  it("refuses JSON where a form is expected", async () => {
    const parsed = await parseForm(post("{}"), { maxBytes: 100 });
    if (parsed.ok) throw new Error("expected failure");
    expect(parsed.response.status).toBe(415);
  });
});

describe("withTimeout", () => {
  it("aborts after the timeout or with its parent", async () => {
    const signal = withTimeout(5);
    await new Promise((r) => setTimeout(r, 20));
    expect(signal.aborted).toBe(true);

    const parent = new AbortController();
    const child = withTimeout(10_000, parent.signal);
    parent.abort();
    expect(child.aborted).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefers the proxy's headers and falls back to unknown", () => {
    const ip = (headers: Record<string, string>) => clientIp(new Request("http://localhost/", { headers }));
    expect(ip({ "x-real-ip": "1.2.3.4" })).toBe("1.2.3.4");
    expect(ip({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" })).toBe("5.6.7.8");
    expect(ip({})).toBe("unknown");
  });
});

describe("checkOrigin", () => {
  const req = (origin?: string) =>
    new Request("http://localhost:3000/api/x", {
      method: "POST",
      headers: { host: "localhost:3000", ...(origin ? { origin } : {}) },
    });

  it("lets same-origin and origin-less requests through", () => {
    expect(checkOrigin(req())).toBeNull();
    expect(checkOrigin(req("http://localhost:3000"))).toBeNull();
  });

  it("refuses other sites", () => {
    expect(checkOrigin(req("https://evil.example"))?.status).toBe(403);
    expect(checkOrigin(req("null"))?.status).toBe(403);
  });
});
