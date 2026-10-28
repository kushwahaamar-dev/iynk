import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { removeAllKeys, setKey } from "@/lib/keys/store";

const tracked = vi.hoisted(() => [] as [string, unknown][]);
vi.mock("@/lib/telemetry", () => ({ track: (kind: string, data: unknown) => tracked.push([kind, data]) }));

import { fetchNearby, fetchOffers } from "./client";
import type { OffersInput } from "./schema";

const KEY = "iynk-canary-SEARCH-0001-do-not-use";
const TOKEN = "iynk-canary-TOKEN-0001";
const offersInput: OffersInput = { parts: [{ key: "motor", query: "2207 1750kv motor", qty: 4 }], country: "us" };

function answer(status: number, code: string) {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { code } }, { status })));
}

beforeEach(() => {
  localStorage.clear();
  setKey("search", KEY);
  tracked.length = 0;
  answer(503, "not_configured");
});

afterEach(() => {
  removeAllKeys();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("search client", () => {
  it("counts each call by its engine, never by what was searched for", async () => {
    const offers = await fetchOffers(offersInput);
    expect(offers).toEqual({ ok: false, code: "not_configured" });
    await fetchNearby({ kind: "makerspace", near: "Austin, TX" });
    expect(tracked).toEqual([
      ["search.call", { engine: "offers" }],
      ["search.call", { engine: "nearby" }],
    ]);
  });

  it("sends the search key, and the server token only when one is set", async () => {
    await fetchOffers(offersInput);
    const fetchMock = vi.mocked(fetch);
    let [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    let headers = new Headers(init.headers);
    expect(headers.get("x-iynk-provider-key")).toBe(KEY);
    expect(headers.get("x-iynk-server-token")).toBeNull();
    expect(url).not.toContain(KEY);
    expect(init.body).not.toContain(KEY);
    expect(JSON.stringify(tracked)).not.toContain(KEY);

    setKey("server", TOKEN);
    await fetchOffers(offersInput);
    [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    headers = new Headers(init.headers);
    expect(headers.get("x-iynk-server-token")).toBe(TOKEN);
  });

  it("with no search key returns no_key and sends nothing", async () => {
    removeAllKeys();
    expect(await fetchOffers(offersInput)).toEqual({ ok: false, code: "no_key" });
    expect(fetch).not.toHaveBeenCalled();
    expect(tracked).toEqual([]);
  });

  it("maps 422 key_required to no_key and 501 feature_disabled to not_configured", async () => {
    answer(422, "key_required");
    expect(await fetchOffers(offersInput)).toEqual({ ok: false, code: "no_key" });
    answer(501, "feature_disabled");
    expect(await fetchOffers(offersInput)).toEqual({ ok: false, code: "not_configured" });
  });
});
