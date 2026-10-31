import { eventsInput, LL_PATTERN, nearbyInput, offersInput, videosInput, webInput } from "../../../../src/lib/search/schema.ts";
import type { EventsResponse, NearbyResponse, OffersResponse, VideosResponse, WebResponse } from "../../../../src/lib/search/types.ts";
import type { RouteDeps } from "../../app.ts";
import { defineRoutes, type BucketName, type Ctx, type Reply, type RouteDef } from "../../http/classes.ts";
import { ApiError, errorBody } from "../../http/errors.ts";
import { StoreError } from "../../store/port.ts";
import { countSearch, type Counted } from "../ai/usage.ts";
import { providerKey, requireEnabled } from "../guard.ts";
import { createSearchCache, createSerpApi, SearchError, type SerpApi } from "./serpapi.ts";

export type SearchRouteOptions = { baseUrl?: string; fetch?: typeof fetch };

const OFFERS_MAX_BODY = 65_536;

type Schema<T> = { safeParse(raw: unknown): { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } };
type Run<T, R> = (api: SerpApi, input: T, signal: AbortSignal) => Promise<R>;

/** `?a=1` -> "1"; a missing or blank parameter -> undefined. */
function param(params: URLSearchParams, name: string): string | undefined {
  const value = params.get(name)?.trim();
  return value ? value : undefined;
}

/** A whole number from the query string, or the raw text so validation names it. */
function intParam(params: URLSearchParams, name: string): number | string | undefined {
  const value = param(params, name);
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : value;
}

function flagParam(params: URLSearchParams, name: string): boolean | string | undefined {
  const value = param(params, name);
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return value;
}

/** Nearby coordinates leave the server at about 100 m. */
function roundLl(ll: string): string {
  const [, lat, lng, zoom] = LL_PATTERN.exec(ll) ?? [];
  return `@${Number(lat).toFixed(3)},${Number(lng).toFixed(3)},${zoom}z`;
}

export function searchRoutes(ctx: RouteDeps, options: SearchRouteOptions = {}): RouteDef[] {
  const { config, store, deps, log } = ctx;
  const cache = createSearchCache(() => deps.clock.now());

  async function serve<T, R>(
    name: string,
    c: Ctx,
    schema: Schema<T>,
    raw: unknown,
    run: Run<T, R>,
  ): Promise<Reply> {
    const started = deps.clock.now();
    const deviceId = (c.authed as NonNullable<typeof c.authed>).deviceId;
    let charged = 0;
    let refused: Extract<Counted, { ok: false }> | undefined;
    const done = (status: number) => log.info(name, { req: c.requestId, dev: deviceId, status, ms: deps.clock.now() - started, searches: charged });
    try {
      requireEnabled(config, "search");
      const key = providerKey(c.headers);
      if (!key.ok) throw new ApiError(422, "provider_key_missing", "Send your search key with this call.");
      const parsed = schema.safeParse(raw);
      if (!parsed.success) throw new ApiError(400, "bad_request", parsed.error.issues[0]?.message ?? "The request is not valid.");
      const api = createSerpApi({
        key: key.key,
        cache,
        baseUrl: options.baseUrl,
        fetch: options.fetch,
        sleep: deps.sleep,
        random: () => deps.ids.random(1)[0]! / 256,
        charge() {
          const counted = store.transaction((tx) => countSearch(tx, deps.clock, deviceId, config.searchMonthly));
          if (!counted.ok) {
            refused = counted;
            return false;
          }
          charged++;
          return true;
        },
      });
      const body = await run(api, parsed.data, c.signal);
      done(200);
      return { status: 200, body };
    } catch (error) {
      if (error instanceof SearchError) {
        if (error.code === "quota_exhausted" && refused) {
          done(429);
          const body = errorBody(new ApiError(429, "quota_exhausted", "The search limit on this server is used up."), c.requestId);
          body.error["retryAfterSeconds"] = refused.retryAfterSeconds;
          return { status: 429, body, headers: { "retry-after": String(refused.retryAfterSeconds) } };
        }
        const mapped = upstreamError(error);
        done(mapped.status);
        throw mapped;
      }
      if (error instanceof StoreError && error.code === "store_unavailable") {
        done(503);
        throw new ApiError(503, "store_unavailable", "The server is busy. Try again shortly.");
      }
      done(error instanceof ApiError ? error.status : 500);
      throw error;
    }
  }

  const get = <T, R>(
    path: string,
    operation: string,
    bucket: BucketName,
    schema: Schema<T>,
    fromQuery: (p: URLSearchParams) => unknown,
    run: Run<T, R>,
  ): RouteDef => ({
    method: "GET",
    path,
    operation,
    cls: "device",
    bucket,
    handler: (c) => serve(`search.${operation}`, c, schema, fromQuery(c.query), run),
  });

  return defineRoutes([
    get("/v1/search/web", "searchWeb", "search.web", webInput, (p) => ({ q: param(p, "q"), extract: flagParam(p, "extract"), hl: param(p, "hl") }), async (api, input, signal): Promise<WebResponse> => api.web(input, signal)),
    get("/v1/search/videos", "searchVideos", "search.other", videosInput, (p) => ({ q: param(p, "q"), hl: param(p, "hl") }), async (api, input, signal): Promise<VideosResponse> => ({ videos: await api.videos(input, signal) })),
    get(
      "/v1/search/nearby",
      "searchNearby",
      "search.other",
      nearbyInput,
      (p) => ({ kind: param(p, "kind"), ll: param(p, "ll"), near: param(p, "near"), hl: param(p, "hl") }),
      async (api, input, signal): Promise<NearbyResponse> => ({ places: await api.nearby(input.ll ? { ...input, ll: roundLl(input.ll) } : input, signal) }),
    ),
    get("/v1/search/events", "searchEvents", "search.other", eventsInput, (p) => ({ q: param(p, "q"), near: param(p, "near") }), async (api, input, signal): Promise<EventsResponse> => ({ events: await api.events(input, signal) })),
    {
      method: "POST",
      path: "/v1/search/offers",
      operation: "searchOffers",
      cls: "device",
      bucket: "search.offers",
      maxBodyBytes: OFFERS_MAX_BODY,
      handler: (c) =>
        serve("search.searchOffers", c, offersInput, c.body, async (api, input, signal): Promise<OffersResponse> => ({
          ...(await api.offers(input.parts, signal)),
          fetchedAt: new Date(deps.clock.now()).toISOString(),
        })),
    },
  ]);
}

function upstreamError(error: SearchError): ApiError {
  if (error.code === "quota_exhausted") return new ApiError(429, "quota_exhausted", "The search provider refused the search: out of searches or over its hourly limit.");
  if (error.code === "upstream_timeout") return new ApiError(504, "upstream_timeout", "The search provider did not answer in time.");
  return new ApiError(502, "upstream_failed", "The search provider could not run this search.");
}
