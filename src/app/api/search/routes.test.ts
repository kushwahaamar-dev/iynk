// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const flags = vi.hoisted(() => ({ search: true }));
const dataDir = vi.hoisted(() => ({ path: "" }));

vi.mock("@/lib/server/env", async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  dataDir.path = mkdtempSync(join(tmpdir(), "iynk-search-routes-"));
  return {
    env: {
      IYNK_DATA_DIR: dataDir.path,
      IYNK_AI_DAILY_TOKENS: 1000,
      IYNK_SEARCH_MONTHLY: 500,
      IYNK_SERVER_TOKEN: "t".repeat(40),
      IYNK_TRUST_PROXY: true,
    },
    features: flags,
  };
});
// connection() needs a request scope that a unit test doesn't have.
vi.mock("next/server", () => ({ connection: async () => {} }));

import { ledger } from "@/lib/server/ai/ledger";
import * as eventsRoute from "./events/route";
import * as nearbyRoute from "./nearby/route";
import * as offersRoute from "./offers/route";
import * as videosRoute from "./videos/route";
import * as webRoute from "./web/route";

const TOKEN = "t".repeat(40);
const KEY = "iynk-canary-KEY-0001-do-not-use";
let counter = 0;
// A fresh IP per request keeps the per-IP rate limiter out of the way, except where a test wants it.
const get = (path: string, ip = `10.0.0.${++counter % 250}`, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${path}`, { headers: { "x-iynk-server-token": TOKEN, "x-iynk-provider-key": KEY, "x-real-ip": ip, ...headers } });
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-iynk-server-token": TOKEN, "x-iynk-provider-key": KEY, "x-real-ip": `10.1.0.${++counter % 250}`, ...headers },
    body: JSON.stringify(body),
  });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  flags.search = true;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
afterAll(() => rmSync(dataDir.path, { recursive: true, force: true }));

const engineOf = (input: string | URL | Request) => new URL(String(input)).searchParams;

describe("/api/search/offers", () => {
  it("prices every part across the stores", async () => {
    fetchMock.mockImplementation(async (input) => {
      const p = engineOf(input);
      if (p.get("engine") === "google_shopping") {
        return Response.json({
          shopping_results: [{ title: "SG90 9g micro servo", extracted_price: 3.2, price: "$3.20", product_link: "https://g.example/1", source: "RobotShop" }],
        });
      }
      if (p.get("engine") === "amazon") {
        return Response.json({ organic_results: [{ title: "SG90 servo 4pcs", extracted_price: 9.99, price: "$9.99", link_clean: "https://www.amazon.com/dp/X/" }] });
      }
      return Response.json({ organic_results: [] });
    });
    const res = await offersRoute.POST(post("/api/search/offers", { parts: [{ key: "servo", query: "SG90 servo", qty: 4 }] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fetchedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(body.partial).toBeUndefined();
    expect(body.parts).toHaveLength(1);
    const [part] = body.parts;
    expect(part.key).toBe("servo");
    // Four singles at $3.20 = $12.80 lose to one 4-pack at $9.99.
    expect(part.offers[part.best]).toMatchObject({ source: "amazon", price: 9.99, pack: 4 });
    expect(new Set(fetchMock.mock.calls.map(([u]) => engineOf(u).get("engine")))).toEqual(new Set(["google_shopping", "amazon", "ebay"]));
  });

  it("accepts the one-part GET form", async () => {
    fetchMock.mockResolvedValue(Response.json({ shopping_results: [] }));
    const res = await offersRoute.GET(get("/api/search/offers?q=XT60+connector&qty=2&sources=google_shopping"));
    expect(res.status).toBe(200);
    expect((await res.json()).parts).toEqual([{ key: "q", offers: [] }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects bad input with 400 and never calls SerpApi", async () => {
    const cases = [
      {},
      { parts: [] },
      { parts: [{ key: "a", query: "x", qty: 1 }] },
      { parts: [{ key: "a b", query: "servo", qty: 1 }] },
      { parts: [{ key: "a", query: "servo", qty: 0 }] },
      { parts: [{ key: "a", query: "servo", qty: 1, sources: ["bing"] }] },
      { parts: [{ key: "a", query: "servo", qty: 1 }, { key: "a", query: "led", qty: 1 }] },
      { parts: Array.from({ length: 26 }, (_, i) => ({ key: `p${i}`, query: "servo", qty: 1 })) },
      { parts: [{ key: "a", query: "servo", qty: 1 }], country: "uk" },
    ];
    for (const body of cases) {
      const res = await offersRoute.POST(post("/api/search/offers", body));
      expect(res.status, JSON.stringify(body).slice(0, 60)).toBe(400);
      expect((await res.json()).error.code).toBe("bad_request");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 501 feature_disabled when search is off", async () => {
    flags.search = false;
    const res = await offersRoute.POST(post("/api/search/offers", { parts: [{ key: "a", query: "servo", qty: 1 }] }));
    expect(res.status).toBe(501);
    expect((await res.json()).error).toMatchObject({ code: "feature_disabled", message: expect.stringMatching(/turned off/) });
  });

  it("refuses other origins", async () => {
    const res = await offersRoute.POST(post("/api/search/offers", { parts: [] }, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });

  it("maps upstream failure to 502 without leaking SerpApi's answer", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockImplementation(async () => Response.json({ error: `Invalid API key ${KEY}` }, { status: 401 }));
    const res = await offersRoute.POST(post("/api/search/offers", { parts: [{ key: "a", query: "unique 502 part", qty: 1 }] }));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).toContain("upstream_failed");
    expect(text).not.toContain(KEY);
  });
});

describe("the caller's key", () => {
  const body = (query: string) => ({ parts: [{ key: "a", query, qty: 1, sources: ["google_shopping"] }] });

  it("answers 422 key_required without the header and never reaches SerpApi", async () => {
    const res = await offersRoute.POST(post("/api/search/offers", body("no key part"), { "x-iynk-provider-key": "" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("key_required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 400 bad_key for a key that does not look right", async () => {
    const res = await offersRoute.POST(post("/api/search/offers", body("bad key part"), { "x-iynk-provider-key": "short" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad_key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the caller's key to SerpApi and keeps it out of the answer and the logs", async () => {
    const logs = [vi.spyOn(console, "warn"), vi.spyOn(console, "error"), vi.spyOn(console, "log")].map((spy) => spy.mockImplementation(() => {}));
    fetchMock.mockResolvedValue(Response.json({ shopping_results: [] }));
    const res = await offersRoute.POST(post("/api/search/offers", body("canary key part")));
    expect(res.status).toBe(200);
    expect(engineOf(fetchMock.mock.calls[0][0]).get("api_key")).toBe(KEY);
    expect(JSON.stringify(await res.json())).not.toContain(KEY);
    expect(logs.flatMap((spy) => spy.mock.calls).flat().join(" ")).not.toContain(KEY);
    vi.restoreAllMocks();
  });

  it("answers 429 quota_exhausted once the key has used its month", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const capped = "iynk-canary-KEY-0002-do-not-use";
    await ledger.recordSearch(ledger.keyId(capped), 500);
    const res = await offersRoute.POST(post("/api/search/offers", body("capped part"), { "x-iynk-provider-key": capped }));
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("quota_exhausted");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("/api/search/nearby", () => {
  it("finds places around a point", async () => {
    fetchMock.mockResolvedValue(Response.json({ local_results: [{ title: "ATX Hackerspace", address: "9701 Dessau Rd", rating: 4.8, reviews: 120 }] }));
    const res = await nearbyRoute.GET(get("/api/search/nearby?kind=makerspace&ll=%4030.2672,-97.7431,13z&hl=es"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.places[0]).toMatchObject({ title: "ATX Hackerspace", rating: 4.8, mapsUrl: expect.stringContaining("google.com/maps") });
    expect(engineOf(fetchMock.mock.calls[0][0]).get("hl")).toBe("es");
  });

  it("needs a kind and a place or a point", async () => {
    for (const q of ["?near=Austin", "?kind=makerspace", "?kind=bakery&near=Austin", "?kind=hobby&ll=@200,0,13z"]) {
      expect((await nearbyRoute.GET(get(`/api/search/nearby${q}`))).status, q).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("takes POST bodies too", async () => {
    fetchMock.mockResolvedValue(Response.json({ local_results: [] }));
    const res = await nearbyRoute.POST(post("/api/search/nearby", { kind: "electronics", near: "Round Rock, TX" }));
    expect(await res.json()).toEqual({ places: [] });
  });
});

describe("/api/search/events, videos, web", () => {
  it("lists events near a place", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ events_results: [{ title: "Drone race night", date: { when: "Sat, Oct 31, 7 PM" }, venue: { name: "Hall" }, link: "https://e.example/1" }] }),
    );
    const res = await eventsRoute.GET(get("/api/search/events?near=Austin,+TX&q=drone+racing"));
    expect((await res.json()).events[0]).toMatchObject({ title: "Drone race night", venue: "Hall" });
    expect(engineOf(fetchMock.mock.calls[0][0]).get("q")).toBe("drone racing events in Austin, TX");
  });

  it("finds videos", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ video_results: [{ title: "Build a 5 inch quad", link: "https://www.youtube.com/watch?v=1", channel: { name: "Maker" }, thumbnail: { static: "https://i.ytimg.com/1.jpg" } }] }),
    );
    const res = await videosRoute.GET(get("/api/search/videos?q=build+5+inch+quad"));
    expect((await res.json()).videos).toHaveLength(1);
  });

  it("searches the web and reads pages on request", async () => {
    fetchMock.mockImplementation(async (input) => {
      const p = engineOf(input);
      if (p.get("engine") === "google") return Response.json({ organic_results: [{ title: "L298N datasheet", link: "https://st.example/l298.pdf", snippet: "Dual full bridge" }] });
      return Response.json({ page_information: { title: "L298" }, text_content: { full: "Supply voltage up to 46 V" } });
    });
    const res = await webRoute.GET(get("/api/search/web?q=L298N+datasheet&extract=1"));
    const body = await res.json();
    expect(body.results[0].title).toBe("L298N datasheet");
    expect(body.extracts[0].text).toContain("46 V");
    expect((await webRoute.GET(get("/api/search/web?q=L298N&extract=maybe"))).status).toBe(400);
  });

  it("rate-limits one caller", async () => {
    fetchMock.mockResolvedValue(Response.json({ video_results: [] }));
    let last = 0;
    for (let i = 0; i < 31; i++) last = (await videosRoute.GET(get("/api/search/videos?q=solder+tips", "10.9.9.9"))).status;
    expect(last).toBe(429);
  });
});

describe("the server token", () => {
  const routes = [
    () => eventsRoute.GET(get("/api/search/events?near=Austin", undefined, { "x-iynk-server-token": "" })),
    () => nearbyRoute.GET(get("/api/search/nearby?kind=makerspace&near=Austin", undefined, { "x-iynk-server-token": "" })),
    () => offersRoute.GET(get("/api/search/offers?q=servo", undefined, { "x-iynk-server-token": "" })),
    () => videosRoute.GET(get("/api/search/videos?q=quad", undefined, { "x-iynk-server-token": "" })),
    () => webRoute.GET(get("/api/search/web?q=l298n", undefined, { "x-iynk-server-token": "" })),
  ];

  it("answers 401 with an empty message on every search route, and never reaches SerpApi", async () => {
    for (const call of routes) {
      const res = await call();
      expect(res.status).toBe(401);
      expect((await res.json()).error).toEqual({ code: "unauthorized", message: "" });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers a wrong token with the same bytes as a missing one", async () => {
    const missing = await webRoute.GET(get("/api/search/web?q=l298n", undefined, { "x-iynk-server-token": "" }));
    const wrong = await webRoute.GET(get("/api/search/web?q=l298n", undefined, { "x-iynk-server-token": "w".repeat(40) }));
    expect(wrong.status).toBe(401);
    expect(await wrong.text()).toBe(await missing.text());
  });

  it("checks the token before search is switched off", async () => {
    flags.search = false;
    expect((await webRoute.GET(get("/api/search/web?q=l298n", undefined, { "x-iynk-server-token": "" }))).status).toBe(401);
  });
});
