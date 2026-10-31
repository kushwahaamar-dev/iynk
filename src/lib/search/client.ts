// Browser-side calls to the person's own server under /v1/search. Every failure
// becomes one of a few codes the panels have words for; nothing upstream is shown raw.

import { readSearchKey } from "@/ai/search-key";
import { track } from "@/lib/telemetry";
import { NeedsEnrolment } from "@/server-client/types";
import type { ServerClient } from "@/server-client/client";
import type { EventsInput, NearbyInput, OffersInput, VideosInput, WebInput } from "./schema";
import type { EventsResponse, NearbyResponse, OffersResponse, VideosResponse, WebResponse } from "./types";

const PROVIDER_KEY_HEADER = "X-Iynk-Provider-Key";

export type FailCode = "needs_server" | "not_configured" | "no_key" | "rate_limited" | "quota_exhausted" | "failed";

export type Result<T> = { ok: true; data: T } | { ok: false; code: FailCode };

export type SearchServer = Pick<ServerClient, "authedFetch">;

function queryString(input: object): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(input)) if (value !== undefined) params.set(name, String(value));
  return `?${params}`;
}

async function failure(res: Response): Promise<FailCode> {
  const code = await res
    .json()
    .then((b: { error?: { code?: string } }) => b.error?.code)
    .catch(() => undefined);
  if (res.status === 422 || code === "provider_key_missing") return "no_key";
  if (res.status === 501 || code === "feature_disabled" || (res.status === 503 && code === "not_configured")) return "not_configured";
  if (res.status === 429) return code === "quota_exhausted" ? "quota_exhausted" : "rate_limited";
  return "failed";
}

export function createSearchClient(server: SearchServer | null) {
  async function send<T>(engine: string, path: string, init: RequestInit): Promise<Result<T>> {
    if (!server) return { ok: false, code: "needs_server" };
    const key = readSearchKey();
    if (key === null) return { ok: false, code: "no_key" };
    const headers = new Headers({ accept: "application/json", [PROVIDER_KEY_HEADER]: key });
    if (init.body !== undefined) headers.set("content-type", "application/json");
    // which engine was asked, never what was searched for
    track("search.call", { engine });
    let res: Response;
    try {
      res = await server.authedFetch(path, { ...init, headers });
    } catch (error) {
      if ((error as { name?: string } | null)?.name === "AbortError") throw error;
      return { ok: false, code: error instanceof NeedsEnrolment ? "needs_server" : "failed" };
    }
    if (!res.ok) return { ok: false, code: await failure(res) };
    try {
      return { ok: true, data: (await res.json()) as T };
    } catch {
      return { ok: false, code: "failed" };
    }
  }

  const get = <T>(engine: string, input: object, signal?: AbortSignal) =>
    send<T>(engine, `/search/${engine}${queryString(input)}`, { method: "GET", signal });

  return {
    fetchWeb: (input: WebInput, signal?: AbortSignal) => get<WebResponse>("web", input, signal),
    fetchVideos: (input: VideosInput, signal?: AbortSignal) => get<VideosResponse>("videos", input, signal),
    fetchNearby: (input: NearbyInput, signal?: AbortSignal) => get<NearbyResponse>("nearby", input, signal),
    fetchEvents: (input: EventsInput, signal?: AbortSignal) => get<EventsResponse>("events", input, signal),
    fetchOffers: (input: OffersInput, signal?: AbortSignal) =>
      send<OffersResponse>("offers", "/search/offers", { method: "POST", body: JSON.stringify(input), signal }),
  };
}

export type SearchClient = ReturnType<typeof createSearchClient>;

let current = createSearchClient(null);

/** Points the shared functions below at the signed-in server, or at none. */
export const bindSearchServer = (server: SearchServer | null) => {
  current = createSearchClient(server);
};

export const fetchWeb = (input: WebInput, signal?: AbortSignal) => current.fetchWeb(input, signal);
export const fetchOffers = (input: OffersInput, signal?: AbortSignal) => current.fetchOffers(input, signal);
export const fetchNearby = (input: NearbyInput, signal?: AbortSignal) => current.fetchNearby(input, signal);
export const fetchEvents = (input: EventsInput, signal?: AbortSignal) => current.fetchEvents(input, signal);
export const fetchVideos = (input: VideosInput, signal?: AbortSignal) => current.fetchVideos(input, signal);
