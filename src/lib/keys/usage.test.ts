import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fetchUsage, formatTokens } from "./usage";
import { removeAllKeys, setKey } from "./store";

const AI = "iynk-canary-KEY-0001-do-not-use";

beforeEach(() => localStorage.clear());
afterEach(() => {
  removeAllKeys();
  localStorage.clear();
  vi.unstubAllGlobals();
});

test("no_key makes no request", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expect(await fetchUsage("ai")).toEqual({ ok: false, code: "no_key" });
  setKey("ai", AI);
  expect(await fetchUsage("search")).toEqual({ ok: false, code: "no_key" });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("sends the key for that kind and returns the reading", async () => {
  setKey("ai", AI);
  const reading = { kind: "ai", today: { tokens: 120, requests: 2 }, monthTotal: { tokens: 400, requests: 5 }, cap: 200000 };
  const fetchMock = vi.fn(async () => Response.json(reading));
  vi.stubGlobal("fetch", fetchMock);
  expect(await fetchUsage("ai")).toEqual({ ok: true, data: reading });
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("/api/usage?kind=ai");
  expect(new Headers(init.headers).get("x-iynk-provider-key")).toBe(AI);
});

test("maps 501 to off and other failures to failed", async () => {
  setKey("ai", AI);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 501 })));
  expect(await fetchUsage("ai")).toEqual({ ok: false, code: "off" });
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 429 })));
  expect(await fetchUsage("ai")).toEqual({ ok: false, code: "failed" });
  vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
  expect(await fetchUsage("ai")).toEqual({ ok: false, code: "failed" });
});

test("formatTokens shortens big numbers", () => {
  expect(formatTokens(1234567)).toBe("1.2M");
  expect(formatTokens(950)).toBe("950");
  expect(formatTokens(12_400)).toBe("12.4K");
});
