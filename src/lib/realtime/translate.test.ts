import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { removeAllKeys, setKey } from "@/lib/keys/store";
import { translateTexts } from "./translate";

const KEY = "iynk-canary-KEY-0001-do-not-use";

beforeEach(() => {
  localStorage.clear();
  setKey("ai", KEY);
});
afterEach(() => {
  removeAllKeys();
  localStorage.clear();
  vi.unstubAllGlobals();
});

test("sends the key in a header and the same body as before", async () => {
  const fetchMock = vi.fn(async () => Response.json({ texts: ["hola"] }));
  vi.stubGlobal("fetch", fetchMock);
  expect(await translateTexts(["hello"], "es", "en")).toEqual({ ok: true, texts: ["hola"] });
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  const headers = new Headers(init.headers);
  expect(url).toBe("/api/ai/translate");
  expect(headers.get("x-iynk-provider-key")).toBe(KEY);
  expect(headers.get("content-type")).toBe("application/json");
  expect(JSON.parse(init.body as string)).toEqual({ texts: ["hello"], to: "es", from: "en" });
  expect(init.body).not.toContain(KEY);
});

test("with no key it returns no_key without calling fetch", async () => {
  removeAllKeys();
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expect(await translateTexts(["hello"], "es", "en")).toEqual({ ok: false, code: "no_key" });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("maps a 422 key_required answer to no_key", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { code: "key_required" } }, { status: 422 })));
  expect(await translateTexts(["hello"], "es", "en")).toEqual({ ok: false, code: "no_key" });
});
