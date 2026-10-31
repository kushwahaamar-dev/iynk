// @vitest-environment node
import { describe, expect, test } from "vitest";
import { familyHeaders, isPassThrough, parseRelayRequest, RELAY_MAX_REQUEST_BYTES, upstreamTarget, validProviderKey } from "./ai-relay.ts";

const open = (baseUrl: string) => ({ family: "openai-compat" as const, baseUrl });
const claude = (baseUrl: string) => ({ family: "anthropic" as const, baseUrl });

describe("upstreamTarget", () => {
  test("openai-compat paths", () => {
    expect(upstreamTarget(open("https://api.example.com/v1"), "chat")).toMatchObject({ method: "POST", url: { href: "https://api.example.com/v1/chat/completions" } });
    expect(upstreamTarget(open("https://api.example.com/v1/"), "models")).toMatchObject({ method: "GET", url: { href: "https://api.example.com/v1/models" } });
  });
  test("anthropic paths and the duplicate v1", () => {
    expect(upstreamTarget(claude("https://api.anthropic.com"), "chat").url.href).toBe("https://api.anthropic.com/v1/messages");
    expect(upstreamTarget(claude("https://api.anthropic.com/v1"), "models").url.href).toBe("https://api.anthropic.com/v1/models");
    expect(upstreamTarget(claude("https://proxy.example.com/anthropic//"), "chat").url.href).toBe("https://proxy.example.com/anthropic/v1/messages");
  });
  test("host forms", () => {
    expect(upstreamTarget(open("https://API.Example.COM:8443/v1"), "models").url.host).toBe("api.example.com:8443");
    expect(upstreamTarget(open("https://bücher.example/v1"), "models").url.hostname).toBe("xn--bcher-kva.example");
    expect(upstreamTarget(open("http://[::1]:11434/v1"), "models").url.host).toBe("[::1]:11434");
  });
});

describe("parseRelayRequest", () => {
  const good = { profile: { family: "anthropic", baseUrl: "https://api.anthropic.com" }, path: "chat", body: { model: "m" } };
  test("accepts a strict request", () => {
    expect(parseRelayRequest(good)).toEqual({ ok: true, value: good });
  });
  test.each([
    ["extra key", { ...good, extra: 1 }],
    ["array body", { ...good, body: [] }],
    ["bad path", { ...good, path: "embeddings" }],
    ["bad family", { ...good, profile: { family: "x", baseUrl: "https://a.example" } }],
    ["extra profile key", { ...good, profile: { ...good.profile, key: "k" } }],
    ["credentials", { ...good, profile: { ...good.profile, baseUrl: "https://u:p@a.example" } }],
    ["query", { ...good, profile: { ...good.profile, baseUrl: "https://a.example/v1?x=1" } }],
    ["empty query mark", { ...good, profile: { ...good.profile, baseUrl: "https://a.example/v1?" } }],
    ["fragment", { ...good, profile: { ...good.profile, baseUrl: "https://a.example/#a" } }],
    ["relative", { ...good, profile: { ...good.profile, baseUrl: "/v1" } }],
    ["too long", { ...good, profile: { ...good.profile, baseUrl: `https://a.example/${"a".repeat(300)}` } }],
    ["not an object", "text"],
  ])("refuses %s", (_name, raw) => {
    const result = parseRelayRequest(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problem).not.toContain("text");
  });
});

describe("keys, headers and statuses", () => {
  test("provider key charset and length", () => {
    expect(validProviderKey("sk-12345")).toBe(true);
    expect(validProviderKey("short")).toBe(false);
    expect(validProviderKey("has space 123")).toBe(false);
    expect(validProviderKey("é".repeat(10))).toBe(false);
    expect(validProviderKey("a".repeat(512))).toBe(true);
    expect(validProviderKey("a".repeat(513))).toBe(false);
  });
  test("family headers", () => {
    expect(familyHeaders("openai-compat", "sk-12345", { browser: false })).toMatchObject({ authorization: "Bearer sk-12345" });
    expect(familyHeaders("openai-compat", null, { browser: false })).not.toHaveProperty("authorization");
    const relayed = familyHeaders("anthropic", "sk-12345", { browser: false });
    expect(relayed).toMatchObject({ "x-api-key": "sk-12345", "anthropic-version": "2023-06-01" });
    expect(relayed).not.toHaveProperty("anthropic-dangerous-direct-browser-access");
    expect(familyHeaders("anthropic", "sk-12345", { browser: true })).toHaveProperty("anthropic-dangerous-direct-browser-access", "true");
  });
  test("pass-through table", () => {
    for (const status of [200, 204, 299, 400, 401, 403, 404, 413, 422, 429]) expect(isPassThrough(status), String(status)).toBe(true);
    for (const status of [199, 300, 302, 402, 405, 500, 502, 503]) expect(isPassThrough(status), String(status)).toBe(false);
  });
  test("request cap", () => {
    expect(RELAY_MAX_REQUEST_BYTES).toBe(256 * 1024);
  });
});
