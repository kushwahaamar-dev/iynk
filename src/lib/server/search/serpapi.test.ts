// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLedger, type Ledger } from "@/lib/server/ai/ledger";
import shopping from "./__fixtures__/google_shopping.docs.json";
import { withSearchKey } from "./key-context";
import { createSerpApi, SearchError, type SerpApiOptions } from "./serpapi";

type Call = { url: URL; init?: RequestInit };

function fakeFetch(...replies: (Response | (() => Response) | Error | DOMException)[]) {
  const calls: Call[] = [];
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: new URL(String(input)), init });
    const next = replies.length > 1 ? replies.shift()! : replies[0];
    if (next instanceof Response) return next.clone();
    if (typeof next === "function") return next();
    throw next;
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

const ok = (body: unknown) => Response.json(body);

const KEY = "test-key";
const dirs: string[] = [];

function newLedger(searchMonthly = 50, dir = mkdtempSync(path.join(tmpdir(), "iynk-search-"))): Ledger {
  dirs.push(dir);
  return createLedger({ dir, aiDailyTokens: 1000, searchMonthly });
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A client whose searches run as the caller holding KEY, counted in a throwaway ledger. */
function client(fetch: typeof globalThis.fetch, extra: Partial<SerpApiOptions> & { searchMonthly?: number } = {}) {
  const { searchMonthly, ...options } = extra;
  const ledger = options.ledger ?? newLedger(searchMonthly);
  const serp = createSerpApi({ ledger, fetch, sleep: async () => {}, random: () => 0, ...options });
  const as = <T>(fn: () => Promise<T>, key = KEY) => withSearchKey({ key, keyId: ledger.keyId(key) }, fn);
  return {
    ledger,
    as,
    search: (...args: Parameters<typeof serp.search>) => as(() => serp.search(...args)),
    offers: (...args: Parameters<typeof serp.offers>) => as(() => serp.offers(...args)),
    nearby: (...args: Parameters<typeof serp.nearby>) => as(() => serp.nearby(...args)),
    events: (...args: Parameters<typeof serp.events>) => as(() => serp.events(...args)),
    videos: (...args: Parameters<typeof serp.videos>) => as(() => serp.videos(...args)),
    web: (...args: Parameters<typeof serp.web>) => as(() => serp.web(...args)),
    raw: serp,
  };
}

describe("search()", () => {
  it("sends the engine, the params and the key, and never no_cache", async () => {
    const { fn, calls } = fakeFetch(ok(shopping));
    await client(fn).search("google_shopping", { q: "2306 motor", gl: "us" });
    const url = calls[0].url;
    expect(url.origin + url.pathname).toBe("https://serpapi.com/search.json");
    expect(url.searchParams.get("engine")).toBe("google_shopping");
    expect(url.searchParams.get("q")).toBe("2306 motor");
    expect(url.searchParams.get("api_key")).toBe("test-key");
    expect(url.searchParams.has("no_cache")).toBe(false);
    expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("refuses engines off the whitelist", async () => {
    const { fn } = fakeFetch(ok({}));
    await expect(client(fn).search("bing" as never, { q: "x" })).rejects.toThrow(/whitelist/);
  });

  it("answers not_configured outside a search context and sends nothing", async () => {
    const { fn, calls } = fakeFetch(ok({}));
    const serp = client(fn);
    await expect(serp.raw.search("google", { q: "x" })).rejects.toMatchObject({ code: "not_configured" });
    expect(calls).toHaveLength(0);
    expect(serp.ledger.summary(serp.ledger.keyId(KEY)).search.month).toBe(0);
  });

  it("sends the key of the caller whose search it is", async () => {
    const { fn, calls } = fakeFetch(ok({ organic_results: [] }));
    const serp = client(fn);
    await serp.as(() => serp.raw.search("google", { q: "a" }), "first-key-0001");
    await serp.as(() => serp.raw.search("google", { q: "b" }), "second-key-0002");
    expect(calls.map((c) => c.url.searchParams.get("api_key"))).toEqual(["first-key-0001", "second-key-0002"]);
  });

  it("shares the cache between callers and counts only the caller who paid", async () => {
    const { fn, calls } = fakeFetch(ok({ organic_results: [] }));
    const serp = client(fn);
    await serp.as(() => serp.raw.search("google", { q: "a" }), "first-key-0001");
    await serp.as(() => serp.raw.search("google", { q: "a" }), "second-key-0002");
    expect(calls).toHaveLength(1);
    expect(serp.ledger.summary(serp.ledger.keyId("first-key-0001")).search.month).toBe(1);
    expect(serp.ledger.summary(serp.ledger.keyId("second-key-0002")).search.month).toBe(0);
  });

  it("serves repeats from its cache for 6 hours, with params in any order", async () => {
    let now = 0;
    const { fn, calls } = fakeFetch(ok({ organic_results: [] }));
    const serp = client(fn, { now: () => now });
    await serp.search("google", { q: "a", gl: "us" });
    await serp.search("google", { gl: "us", q: "a" });
    expect(calls).toHaveLength(1);
    now = 6 * 60 * 60 * 1000 - 1;
    await serp.search("google", { q: "a", gl: "us" });
    expect(calls).toHaveLength(1);
    now = 6 * 60 * 60 * 1000 + 1;
    await serp.search("google", { q: "a", gl: "us" });
    expect(calls).toHaveLength(2);
    expect(serp.ledger.summary(serp.ledger.keyId(KEY)).search.month).toBe(2);
  });

  it("never caches or shares a search that carries coordinates", async () => {
    const { fn, calls } = fakeFetch(ok({ organic_results: [] }));
    const serp = client(fn);
    const params = { q: "makerspace", ll: "@30.2672,-97.7431,13z" };
    await serp.search("google_maps", params);
    await serp.search("google_maps", params);
    await Promise.all([serp.search("google_maps", params), serp.search("google_maps", params)]);
    expect(calls).toHaveLength(4);
    expect(serp.ledger.summary(serp.ledger.keyId(KEY)).search.month).toBe(4);
  });

  it("nearby() by place name is cached, by coordinates is not", async () => {
    const { fn, calls } = fakeFetch(ok({ local_results: [] }));
    const serp = client(fn);
    await serp.nearby({ kind: "makerspace", near: "Austin, TX" });
    await serp.nearby({ kind: "makerspace", near: "Austin, TX" });
    expect(calls).toHaveLength(1);
    await serp.nearby({ kind: "makerspace", ll: "@30.2672,-97.7431,13z" });
    await serp.nearby({ kind: "makerspace", ll: "@30.2672,-97.7431,13z" });
    expect(calls).toHaveLength(3);
  });

  it("shares one request between identical concurrent searches", async () => {
    const { fn, calls } = fakeFetch(ok({ organic_results: [] }));
    const serp = client(fn);
    await Promise.all([serp.search("google", { q: "a" }), serp.search("google", { q: "a" })]);
    expect(calls).toHaveLength(1);
    expect(serp.ledger.summary(serp.ledger.keyId(KEY)).search.month).toBe(1);
  });

  it("stops at the key's monthly cap but keeps serving cached searches", async () => {
    const { fn, calls } = fakeFetch(ok({ organic_results: [] }));
    const serp = client(fn, { searchMonthly: 2 });
    await serp.search("google", { q: "a" });
    await serp.search("google", { q: "b" });
    await expect(serp.search("google", { q: "c" })).rejects.toMatchObject({ code: "quota_exhausted" });
    await expect(serp.search("google", { q: "a" })).resolves.toEqual({ organic_results: [] });
    expect(calls).toHaveLength(2);
  });

  it("still refuses after a restart", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "iynk-search-"));
    const { fn, calls } = fakeFetch(ok({ organic_results: [] }));
    const before = client(fn, { ledger: newLedger(1, dir) });
    await before.search("google", { q: "a" });
    const after = client(fn, { ledger: newLedger(1, dir) });
    await expect(after.search("google", { q: "b" })).rejects.toMatchObject({ code: "quota_exhausted" });
    expect(calls).toHaveLength(1);
  });

  it("counts a key's searches apart from another key's", async () => {
    const { fn } = fakeFetch(ok({ organic_results: [] }));
    const serp = client(fn, { searchMonthly: 1 });
    await serp.as(() => serp.raw.search("google", { q: "a" }), "first-key-0001");
    await expect(serp.as(() => serp.raw.search("google", { q: "b" }), "first-key-0001")).rejects.toMatchObject({ code: "quota_exhausted" });
    await expect(serp.as(() => serp.raw.search("google", { q: "b" }), "second-key-0002")).resolves.toEqual({ organic_results: [] });
  });

  it("logs the key id and the count, never the key", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { fn } = fakeFetch(ok({ organic_results: [] }));
    const serp = client(fn);
    await serp.search("google", { q: "a" });
    const lines = warn.mock.calls.flat().join(" ");
    expect(lines).toContain(`[usage] search key=${serp.ledger.keyId(KEY)} total=1`);
    expect(lines).not.toContain(KEY);
    warn.mockRestore();
  });

  it("retries once on 5xx and 429, then gives up", async () => {
    const { fn, calls } = fakeFetch(new Response("busy", { status: 503 }), ok({ organic_results: [] }));
    await expect(client(fn).search("google", { q: "a" })).resolves.toEqual({ organic_results: [] });
    expect(calls).toHaveLength(2);

    const twice = fakeFetch(Response.json({ error: "Your account has run out of searches." }, { status: 429 }));
    await expect(client(twice.fn).search("google", { q: "a" })).rejects.toMatchObject({ code: "quota_exhausted" });
    expect(twice.calls).toHaveLength(2);

    const down = fakeFetch(new Response("down", { status: 500 }));
    await expect(client(down.fn).search("google", { q: "a" })).rejects.toMatchObject({ code: "upstream_failed" });
    expect(down.calls).toHaveLength(2);
  });

  it("does not retry a rejected key and never repeats SerpApi's message", async () => {
    const { fn, calls } = fakeFetch(Response.json({ error: "Invalid API key test-key" }, { status: 401 }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = await client(fn).search("google", { q: "a" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SearchError);
    expect((error as SearchError).code).toBe("upstream_failed");
    expect((error as SearchError).message).not.toContain("test-key");
    expect(warn.mock.calls.flat().join(" ")).not.toContain("test-key");
    expect(calls).toHaveLength(1);
    warn.mockRestore();
  });

  it("treats 'no results' as an empty answer and other errors as failures", async () => {
    const empty = fakeFetch(ok({ search_metadata: { status: "Success" }, error: "Google hasn't returned any results for this query." }));
    await expect(client(empty.fn).search("google", { q: "zzz" })).resolves.toMatchObject({ error: expect.any(String) });

    const failed = fakeFetch(ok({ search_metadata: { status: "Error" }, error: "Proxy timeout" }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(client(failed.fn).search("google", { q: "a" })).rejects.toMatchObject({ code: "upstream_failed" });
    warn.mockRestore();
  });

  it("maps timeouts and network errors", async () => {
    const slow = fakeFetch(new DOMException("timed out", "TimeoutError"));
    await expect(client(slow.fn).search("google", { q: "a" })).rejects.toMatchObject({ code: "upstream_timeout" });
    expect(slow.calls).toHaveLength(1);

    const offline = fakeFetch(new TypeError("fetch failed"));
    await expect(client(offline.fn).search("google", { q: "a" })).rejects.toMatchObject({ code: "upstream_failed" });
    expect(offline.calls).toHaveLength(2);
  });

  it("does not cache failures", async () => {
    const { fn, calls } = fakeFetch(new Response("x", { status: 500 }), new Response("x", { status: 500 }), ok({ organic_results: [] }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const serp = client(fn);
    await expect(serp.search("google", { q: "a" })).rejects.toBeInstanceOf(SearchError);
    await expect(serp.search("google", { q: "a" })).resolves.toEqual({ organic_results: [] });
    expect(calls).toHaveLength(3);
    warn.mockRestore();
  });
});

const listing = (title: string, price: number, link: string) => ({ title, extracted_price: price, price: `$${price}`, product_link: link });

describe("typed searches", () => {
  it("offers() asks each store with its own parameters and ranks the listings", async () => {
    const { fn, calls } = fakeFetch(() => ok({ shopping_results: [], organic_results: [] }));
    const serp = client(fn);
    await serp.offers([{ key: "motor", query: "2306 1750KV motor", qty: 4, sources: ["google_shopping", "amazon", "ebay", "walmart"] }]);
    const byEngine = Object.fromEntries(calls.map((c) => [c.url.searchParams.get("engine"), c.url.searchParams]));
    expect(byEngine.google_shopping.get("q")).toBe("2306 1750KV motor");
    expect(byEngine.google_shopping.get("gl")).toBe("us");
    expect(byEngine.amazon.get("k")).toBe("2306 1750KV motor");
    expect(byEngine.amazon.get("amazon_domain")).toBe("amazon.com");
    expect(byEngine.ebay.get("_nkw")).toBe("2306 1750KV motor");
    expect(byEngine.ebay.get("LH_ItemCondition")).toBe("1000");
    expect(byEngine.ebay.get("buying_format")).toBe("BIN");
    expect(byEngine.walmart.get("query")).toBe("2306 1750KV motor");
  });

  it("offers() defaults to Google Shopping, Amazon and eBay", async () => {
    const { fn, calls } = fakeFetch(() => ok({}));
    await client(fn).offers([{ key: "a", query: "SG90 servo", qty: 1 }]);
    expect(calls.map((c) => c.url.searchParams.get("engine")).sort()).toEqual(["amazon", "ebay", "google_shopping"]);
  });

  it("offers() reports a partial answer when some stores fail, and fails when all do", async () => {
    const fn = vi.fn(async (input: string | URL | Request) => {
      const engine = new URL(String(input)).searchParams.get("engine");
      if (engine === "amazon") return new Response("x", { status: 500 });
      return ok({ shopping_results: [listing("SG90 servo", 3, "https://s.example/1")] });
    }) as unknown as typeof fetch;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await client(fn).offers([{ key: "servo", query: "SG90 servo", qty: 1, sources: ["google_shopping", "amazon"] }]);
    expect(result.partial).toBe("upstream");
    expect(result.parts[0]).toMatchObject({ key: "servo", best: 0, offers: [{ price: 3 }] });

    const none = fakeFetch(new Response("x", { status: 500 }));
    await expect(client(none.fn).offers([{ key: "servo", query: "SG90 servo", qty: 1 }])).rejects.toMatchObject({ code: "upstream_failed" });
    warn.mockRestore();
  });

  it("offers() says the budget ran out when that is why prices are missing", async () => {
    const { fn } = fakeFetch(() => ok({ shopping_results: [listing("SG90 servo", 3, "https://s.example/1")] }));
    const result = await client(fn, { searchMonthly: 1 }).offers([{ key: "servo", query: "SG90 servo", qty: 1 }]);
    expect(result.partial).toBe("quota");
    expect(result.parts[0].offers).toHaveLength(1);
  });

  it("nearby() searches around a point and measures distances", async () => {
    const { fn, calls } = fakeFetch(ok({ local_results: [{ title: "Hack Lab", address: "1 St", gps_coordinates: { latitude: 30.28, longitude: -97.74 } }] }));
    const [place] = await client(fn).nearby({ kind: "makerspace", ll: "@30.2672,-97.7431,13z", hl: "zh" });
    const p = calls[0].url.searchParams;
    expect([p.get("engine"), p.get("q"), p.get("ll"), p.get("type"), p.get("hl")]).toEqual(["google_maps", "makerspace", "@30.2672,-97.7431,13z", "search", "zh-cn"]);
    expect(place.distanceKm).toBeGreaterThan(0);
  });

  it("nearby() searches near a typed place", async () => {
    const { fn, calls } = fakeFetch(ok({ local_results: [] }));
    await client(fn).nearby({ kind: "flying-field", near: "Austin, TX" });
    expect(calls[0].url.searchParams.get("q")).toBe("RC model aircraft flying field near Austin, TX");
    expect(calls[0].url.searchParams.has("ll")).toBe(false);
  });

  it("events() puts the place in the query, as Google Events wants", async () => {
    const { fn, calls } = fakeFetch(ok({ events_results: [] }));
    await client(fn).events({ near: "Austin, TX" });
    expect(calls[0].url.searchParams.get("q")).toBe("maker robotics electronics events in Austin, TX");
  });

  it("videos() uses YouTube's search_query", async () => {
    const { fn, calls } = fakeFetch(ok({ video_results: [] }));
    await client(fn).videos({ q: "solder an XT60" });
    expect(calls[0].url.searchParams.get("engine")).toBe("youtube");
    expect(calls[0].url.searchParams.get("search_query")).toBe("solder an XT60");
  });

  it("web() extracts the top two pages and skips the ones that fail", async () => {
    const fn = vi.fn(async (input: string | URL | Request) => {
      const p = new URL(String(input)).searchParams;
      if (p.get("engine") === "google") {
        return ok({
          organic_results: [
            { title: "A4988 datasheet", link: "https://a.example/a4988.pdf", snippet: "Stepper driver" },
            { title: "Pololu A4988", link: "https://b.example/a4988" },
            { title: "Third", link: "https://c.example/" },
          ],
        });
      }
      if (p.get("url") === "https://a.example/a4988.pdf") {
        return ok({ page_information: { title: "A4988" }, text_content: { full: "VMOT 8-35 V" } });
      }
      return new Response("x", { status: 500 });
    }) as unknown as typeof fetch;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = await client(fn).web({ q: "A4988 datasheet", extract: true });
    expect(out.results).toHaveLength(3);
    expect(out.extracts).toEqual([{ url: "https://a.example/a4988.pdf", title: "A4988", text: "VMOT 8-35 V" }]);
    const extractCall = (fn as unknown as ReturnType<typeof vi.fn>).mock.calls
      .map(([u]) => new URL(String(u)).searchParams)
      .find((p) => p.get("engine") === "extract");
    expect(extractCall?.get("include_markdown")).toBe("true");
    warn.mockRestore();
  });
});
