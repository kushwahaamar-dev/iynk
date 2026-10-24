// Browser-side calls to /api/search/*. Every failure becomes one of a few
// codes the panels have words for; nothing upstream is shown raw.

import type { EventsInput, NearbyInput, OffersInput, VideosInput } from "./schema";
import type { EventsResponse, NearbyResponse, OffersResponse, VideosResponse } from "./types";

export type FailCode = "not_configured" | "rate_limited" | "failed";

export type Result<T> = { ok: true; data: T } | { ok: false; code: FailCode };

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<Result<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if ((error as { name?: string } | null)?.name === "AbortError") throw error;
    return { ok: false, code: "failed" };
  }
  if (res.ok) {
    try {
      return { ok: true, data: (await res.json()) as T };
    } catch {
      return { ok: false, code: "failed" };
    }
  }
  const code = await res
    .json()
    .then((b: { error?: { code?: string } }) => b.error?.code)
    .catch(() => undefined);
  if (res.status === 503 && code === "not_configured") return { ok: false, code: "not_configured" };
  if (res.status === 429) return { ok: false, code: "rate_limited" };
  return { ok: false, code: "failed" };
}

export const fetchOffers = (input: OffersInput, signal?: AbortSignal) => post<OffersResponse>("/api/search/offers", input, signal);
export const fetchNearby = (input: NearbyInput, signal?: AbortSignal) => post<NearbyResponse>("/api/search/nearby", input, signal);
export const fetchEvents = (input: EventsInput, signal?: AbortSignal) => post<EventsResponse>("/api/search/events", input, signal);
export const fetchVideos = (input: VideosInput, signal?: AbortSignal) => post<VideosResponse>("/api/search/videos", input, signal);
