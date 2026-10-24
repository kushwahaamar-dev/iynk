import "server-only";
import type { z } from "zod";
import { features } from "@/lib/server/env";
import { checkOrigin, fail, json, notConfigured, parseBody } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/ratelimit";
import { SearchError } from "./serpapi";

// What every /api/search/* route does around its one search: our origin only,
// a rate limit per IP, the "not set up" answer when there is no key, the input
// from the query string (GET) or a JSON body (POST), and SearchError codes
// mapped to statuses. Raw upstream errors never reach the client.

const STATUS: Record<SearchError["code"], number> = {
  not_configured: 503,
  quota_exhausted: 429,
  upstream_failed: 502,
  upstream_timeout: 504,
};

export type SearchRoute<S extends z.ZodType> = {
  bucket: string;
  /** Requests per minute per IP. */
  perMinute: number;
  schema: S;
  /** The GET form of the input, from the query string. */
  fromQuery: (params: URLSearchParams) => unknown;
  run: (input: z.output<S>, signal: AbortSignal) => Promise<unknown>;
};

const MAX_BODY = 16 * 1024;

export async function handleSearch<S extends z.ZodType>(req: Request, route: SearchRoute<S>): Promise<Response> {
  const refused = checkOrigin(req) ?? checkRateLimit(req, `search:${route.bucket}`, { limit: route.perMinute, windowMs: 60_000 });
  if (refused) return refused;
  if (!features.search) return notConfigured("Search");

  let input: z.output<S>;
  if (req.method === "GET") {
    const parsed = route.schema.safeParse(route.fromQuery(new URL(req.url).searchParams));
    if (!parsed.success) return fail(400, "bad_request", parsed.error.issues[0]?.message);
    input = parsed.data;
  } else {
    const parsed = await parseBody(req, route.schema, { maxBytes: MAX_BODY });
    if (!parsed.ok) return parsed.response;
    input = parsed.data;
  }

  try {
    return json(await route.run(input, req.signal));
  } catch (error) {
    if (error instanceof SearchError) return fail(STATUS[error.code], error.code, error.message);
    console.error("[search] unexpected failure", error instanceof Error ? error.name : typeof error);
    return fail(500, "internal_error");
  }
}

/** `?a=1` -> "1"; a missing or blank parameter -> undefined. */
export function param(params: URLSearchParams, name: string): string | undefined {
  const value = params.get(name)?.trim();
  return value ? value : undefined;
}

/** A whole number from the query string, or the raw text so validation names it. */
export function intParam(params: URLSearchParams, name: string): number | string | undefined {
  const value = param(params, name);
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : value;
}
