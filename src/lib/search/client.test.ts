import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { removeAllKeys, setKey } from "@/lib/keys/store";

const tracked = vi.hoisted(() => [] as [string, unknown][]);
vi.mock("@/lib/telemetry", () => ({ track: (kind: string, data: unknown) => tracked.push([kind, data]) }));

import { bindSearchServer, createSearchClient, fetchNearby, fetchOffers } from "./client";
import type { OffersInput } from "./schema";

const KEY = "iynk-canary-SEARCH-0001-do-not-use";
const TOKEN = "iynk-canary-TOKEN-0001";
const offersInput: OffersInput = { parts: [{ key: "motor", query: "2207 1750kv motor", qty: 4 }], country: "us" };

const fetchAuthed = vi.fn<(path: string, init?: RequestInit) => Promise<Response>>();

function answer(status: number, code: string) {
  fetchAuthed.mockImplementation(async () => Response.json({ error: { code } }, { status }));
}

beforeEach(() => {
  localStorage.clear();
  setKey("search", KEY);
  tracked.length = 0;
  fetchAuthed.mockReset();
  answer(503, "not_configured");
  bindSearchServer({ fetchAuthed });
});

afterEach(() => {
  bindSearchServer(null);
  removeAllKeys();
  localStorage.clear();
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

  it("sends the search key in its header only, on the v1 verbs and paths", async () => {
    await fetchOffers(offersInput);
    await fetchNearby({ kind: "makerspace", near: "Austin, TX" });
    await createSearchClient({ fetchAuthed }).fetchWeb({ q: "lm317 datasheet", extract: true });
    const [post, get, web] = fetchAuthed.mock.calls as [string, RequestInit][];
    expect(post[0]).toBe("/search/offers");
    expect(post[1].method).toBe("POST");
    expect(new Headers(post[1].headers).get("x-iynk-provider-key")).toBe(KEY);
    expect(post[1].body).not.toContain(KEY);
    expect(get[0]).toBe("/search/nearby?kind=makerspace&near=Austin%2C+TX");
    expect(get[1].method).toBe("GET");
    expect(get[0]).not.toContain(KEY);
    expect(web[0]).toBe("/search/web?q=lm317+datasheet&extract=true");
    expect(JSON.stringify(tracked)).not.toContain(KEY);
  });

  it("with no search key returns no_key and sends nothing", async () => {
    removeAllKeys();
    expect(await fetchOffers(offersInput)).toEqual({ ok: false, code: "no_key" });
    expect(fetchAuthed).not.toHaveBeenCalled();
    expect(tracked).toEqual([]);
  });

  it("with no server returns needs_server and sends nothing", async () => {
    bindSearchServer(null);
    expect(await fetchOffers(offersInput)).toEqual({ ok: false, code: "needs_server" });
    expect(fetchAuthed).not.toHaveBeenCalled();
  });

  it("maps 422 provider_key_missing to no_key and 501 feature_disabled to not_configured", async () => {
    answer(422, "provider_key_missing");
    expect(await fetchOffers(offersInput)).toEqual({ ok: false, code: "no_key" });
    answer(501, "feature_disabled");
    expect(await fetchOffers(offersInput)).toEqual({ ok: false, code: "not_configured" });
  });

  it("tells a spent monthly cap from a burst of requests", async () => {
    answer(429, "quota_exhausted");
    expect(await fetchOffers(offersInput)).toEqual({ ok: false, code: "quota_exhausted" });
    answer(429, "rate_limited");
    expect(await fetchOffers(offersInput)).toEqual({ ok: false, code: "rate_limited" });
    answer(502, "upstream_failed");
    expect(await fetchOffers(offersInput)).toEqual({ ok: false, code: "failed" });
  });
});
