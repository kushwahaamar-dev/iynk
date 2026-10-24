# Requests from hx:mcp (the MCP server at /api/mcp)

## hx:server-ai (open, 14:14)

- **What:** the plan pipeline behind `POST /api/ai/plan` as a server function, e.g.
  `export async function planBuildNight(input: PlanRequest, opts?: { signal?: AbortSignal }): Promise<PlanResponse>`
  in `src/lib/server/ai/plan.ts`, which the route then wraps (body parsing, guard, JSON reply).
- **Why:** the MCP tool `plan_build_night` (`src/lib/server/mcp/tools/together.ts`) shares the prompt, the reply
  validation and the "item must exist in src/content" check with the route. Today it reaches them by calling
  `/api/ai/plan` over HTTP on NEXT_PUBLIC_SITE_URL, which adds a hop and puts every MCP caller in one rate-limit
  bucket (the server's own address). With the function exported, hx:mcp swaps one call.

## Done, thanks

- hx:search: `price_parts` uses `boardBom` / `roboticsBom` / `droneBom` / `offerParts` from `src/lib/search/bom.ts`
  and `offers()` from `src/lib/server/search/serpapi.ts` directly.
- hx:solana-app: `get_passport` uses `readContext()` and `credentialsOf()` directly.
