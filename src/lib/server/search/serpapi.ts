import "server-only";
import type { Locale } from "@/i18n/config";
import { ledger as spendLedger, type Ledger } from "@/lib/server/ai/ledger";
import { withTimeout } from "@/lib/server/http";
import type { EventsInput, NearbyInput, OfferPartInput, VideosInput, WebInput } from "@/lib/search/schema";
import { LL_PATTERN } from "@/lib/search/schema";
import type {
  MakerEvent,
  NearbyKind,
  Offer,
  OfferSource,
  OffersGap,
  PageExtract,
  PartOffers,
  Place,
  SearchErrorCode,
  Video,
  WebResponse,
} from "@/lib/search/types";
import { currentSearchKey } from "./key-context";
import { TtlLru } from "./lru";
import * as normalize from "./normalize";
import { rankOffers } from "./rank";

// The SerpApi client (HX-CONTRACT H5; parameters and fields in docs/hacktx/SEARCH.md).
// Every call goes through search(): engine whitelist, our 6 h LRU in front of
// SerpApi's own 1 h cache (we never send no_cache), the caller's own key and
// monthly search cap (from the spend ledger), a timeout, and one retry with
// jitter on 429 and 5xx.

export const ENGINES = [
  "google",
  "google_shopping",
  "amazon",
  "ebay",
  "walmart",
  "google_maps",
  "google_events",
  "youtube",
  "google_lens",
  "extract",
] as const;
export type Engine = (typeof ENGINES)[number];

const ENDPOINT = "https://serpapi.com/search.json";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_ENTRIES = 1000;
const TIMEOUT_MS = 20_000;
const EXTRACT_TIMEOUT_MS = 25_000;
const MAX_CONCURRENT = 8;

export class SearchError extends Error {
  constructor(
    readonly code: SearchErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SearchError";
  }
}

type Params = Record<string, string>;

export type SerpApiOptions = {
  /** Counts each caller's searches; the server-wide ledger unless a test passes its own. */
  ledger?: Ledger;
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
};

const NO_RESULTS = /hasn't returned any results|no results found|returned no results/i;

function cacheKey(engine: Engine, params: Params): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return `${engine}?${sorted}`;
}

function semaphore(limit: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    // A finished task hands its slot straight to the next waiter.
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    else active++;
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}

const NEARBY_QUERIES: Record<NearbyKind, string> = {
  makerspace: "makerspace",
  electronics: "electronics components store",
  hobby: "RC hobby shop",
  "flying-field": "RC model aircraft flying field",
};

const OFFER_ENGINES: Record<OfferSource, (q: string) => Params> = {
  google_shopping: (q) => ({ q, gl: "us", hl: "en" }),
  amazon: (q) => ({ k: q, amazon_domain: "amazon.com" }),
  // New, Buy It Now: an auction's current bid is not a price.
  ebay: (q) => ({ _nkw: q, ebay_domain: "ebay.com", LH_ItemCondition: "1000", buying_format: "BIN" }),
  walmart: (q) => ({ query: q }),
};

const OFFER_NORMALIZERS: Record<OfferSource, (raw: unknown) => Offer[]> = {
  google_shopping: normalize.googleShoppingOffers,
  amazon: normalize.amazonOffers,
  ebay: normalize.ebayOffers,
  walmart: normalize.walmartOffers,
};

export const DEFAULT_SOURCES: readonly OfferSource[] = ["google_shopping", "amazon", "ebay"];

/** Google's language codes: Simplified Chinese is zh-cn. */
const googleHl = (locale: Locale): string => (locale === "zh" ? "zh-cn" : locale);

const RESULT_LIMIT = 8;
const EXTRACT_PAGES = 2;

export function createSerpApi(options: SerpApiOptions = {}) {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  const cache = new TtlLru<unknown>(CACHE_ENTRIES, CACHE_TTL_MS, now);
  const inflight = new Map<string, Promise<unknown>>();
  const limit = semaphore(MAX_CONCURRENT);

  async function send(engine: Engine, params: Params, apiKey: string, signal?: AbortSignal): Promise<unknown> {
    const url = new URL(ENDPOINT);
    url.searchParams.set("engine", engine);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("api_key", apiKey);
    const doFetch = options.fetch ?? fetch;
    const timeout = engine === "extract" ? EXTRACT_TIMEOUT_MS : TIMEOUT_MS;

    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await doFetch(url, { signal: withTimeout(timeout, signal), headers: { accept: "application/json" } });
      } catch (error) {
        const name = (error as { name?: unknown } | null)?.name;
        const timedOut = name === "TimeoutError" || name === "AbortError";
        if (timedOut) throw new SearchError("upstream_timeout", `${engine} did not answer in time.`);
        if (attempt === 0) {
          await sleep(250 + random() * 500);
          continue;
        }
        throw new SearchError("upstream_failed", `${engine} could not be reached.`);
      }
      if ((res.status === 429 || res.status >= 500) && attempt === 0) {
        // Not awaited: a cancelled body only settles once every reader lets go.
        void res.body?.cancel().catch(() => {});
        await sleep(250 + random() * 500);
        continue;
      }
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        throw new SearchError("upstream_failed", `${engine} answered ${res.status} without JSON.`);
      }
      const error = typeof (body as { error?: unknown })?.error === "string" ? (body as { error: string }).error : undefined;
      if (res.status === 429) throw new SearchError("quota_exhausted", "SerpApi refused the search: out of searches or over the hourly limit.");
      if (!res.ok) {
        // Never echo SerpApi's message: it can quote the request.
        console.warn(`[search] ${engine} answered ${res.status}`);
        throw new SearchError("upstream_failed", `${engine} answered ${res.status}.`);
      }
      if (error && !NO_RESULTS.test(error)) {
        console.warn(`[search] ${engine} returned an error status`);
        throw new SearchError("upstream_failed", `${engine} could not run this search.`);
      }
      return body;
    }
  }

  /** One SerpApi search with the caller's key, through the cache and that key's monthly cap. */
  async function search(engine: Engine, params: Params, signal?: AbortSignal): Promise<unknown> {
    if (!ENGINES.includes(engine)) throw new Error(`SerpApi engine "${engine}" is not on the whitelist.`);
    const caller = currentSearchKey();
    if (!caller) throw new SearchError("not_configured", "Search needs a key from the caller.");
    const key = cacheKey(engine, params);
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const pending = inflight.get(key);
    if (pending) return pending;
    const spend = options.ledger ?? spendLedger;
    if (!spend.checkSearch(caller.keyId).ok) {
      throw new SearchError("quota_exhausted", "This key's monthly search limit is used up; cached results still work.");
    }
    // Counted before the call goes out, so two searches racing past the check cannot both slip under the cap.
    const task = spend
      .recordSearch(caller.keyId)
      .then(() => {
        console.warn(`[usage] search key=${caller.keyId} total=${spend.summary(caller.keyId).search.month}`);
        return limit(() => send(engine, params, caller.key, signal));
      })
      .then((body) => {
        cache.set(key, body);
        return body;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, task);
    return task;
  }

  async function offers(
    parts: readonly OfferPartInput[],
    signal?: AbortSignal,
  ): Promise<{ parts: PartOffers[]; partial?: OffersGap }> {
    const failures: SearchError[] = [];
    let calls = 0;
    const results = await Promise.all(
      parts.map(async (part) => {
        const sources = part.sources ?? DEFAULT_SOURCES;
        const lists = await Promise.all(
          sources.map(async (source) => {
            calls++;
            try {
              return OFFER_NORMALIZERS[source](await search(source, OFFER_ENGINES[source](part.query), signal));
            } catch (error) {
              if (!(error instanceof SearchError)) throw error;
              failures.push(error);
              return [];
            }
          }),
        );
        return rankOffers(part.key, part.query, part.qty, lists.flat(), part.pack);
      }),
    );
    if (failures.length === calls) throw failures.find((f) => f.code === "not_configured") ?? failures[0];
    if (!failures.length) return { parts: results };
    return { parts: results, partial: failures.some((f) => f.code === "quota_exhausted") ? "quota" : "upstream" };
  }

  async function nearby(input: NearbyInput, signal?: AbortSignal): Promise<Place[]> {
    const what = NEARBY_QUERIES[input.kind];
    const params: Params = { type: "search" };
    let origin: { lat: number; lng: number } | undefined;
    if (input.ll) {
      const [, lat, lng] = LL_PATTERN.exec(input.ll) ?? [];
      origin = { lat: Number(lat), lng: Number(lng) };
      params.q = what;
      params.ll = input.ll;
    } else {
      params.q = `${what} near ${input.near}`;
    }
    if (input.hl) params.hl = googleHl(input.hl);
    return normalize.places(await search("google_maps", params, signal), origin).slice(0, RESULT_LIMIT);
  }

  async function events(input: EventsInput, signal?: AbortSignal): Promise<MakerEvent[]> {
    const topic = input.q ?? "maker robotics electronics";
    const raw = await search("google_events", { q: `${topic} events in ${input.near}` }, signal);
    return normalize.events(raw).slice(0, RESULT_LIMIT);
  }

  async function videos(input: VideosInput, signal?: AbortSignal): Promise<Video[]> {
    const params: Params = { search_query: input.q };
    if (input.hl) params.hl = googleHl(input.hl);
    return normalize.videos(await search("youtube", params, signal)).slice(0, RESULT_LIMIT);
  }

  async function extract(url: string, signal?: AbortSignal): Promise<PageExtract | undefined> {
    const raw = await search("extract", { url, timeout: "15000", include_markdown: "true" }, signal);
    return normalize.pageExtract(raw, url);
  }

  async function web(input: WebInput, signal?: AbortSignal): Promise<WebResponse> {
    const params: Params = { q: input.q, gl: "us" };
    if (input.hl) params.hl = googleHl(input.hl);
    const results = normalize.webResults(await search("google", params, signal)).slice(0, RESULT_LIMIT);
    if (!input.extract) return { results };
    // A page that can't be read is left out; the search results still stand.
    const pages = await Promise.all(
      results.slice(0, EXTRACT_PAGES).map((r) => extract(r.url, signal).catch(() => undefined)),
    );
    return { results, extracts: pages.filter((p): p is PageExtract => p !== undefined) };
  }

  return { search, offers, nearby, events, videos, web, extract };
}

export type SerpApi = ReturnType<typeof createSerpApi>;

const serp = createSerpApi();

/** Offers for up to 25 parts from Google Shopping, Amazon, eBay and Walmart (find_parts). */
export const offers = serp.offers;
/** Makerspaces, electronics and hobby shops, flying fields near a point or a place. */
export const nearby = serp.nearby;
/** Maker meetups and events near a place. */
export const events = serp.events;
/** Tutorial videos. */
export const videos = serp.videos;
/** Google results, optionally with the text of the top pages (search_datasheet). */
export const web = serp.web;
/** One page's text through the Extract API. */
export const extract = serp.extract;
