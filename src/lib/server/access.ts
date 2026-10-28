import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "./env";
import { unauthorized } from "./http";

/**
 * Who may call each route file under `src/app/api`. `routes.test.ts` fails on a
 * route that is not listed here.
 */
export type RouteClass = "local-only" | "needs-server-token" | "needs-user-key";

export const ROUTE_CLASSES: Readonly<Record<string, RouteClass>> = {
  "openapi.json/route.ts": "local-only",
  "ai/chat/route.ts": "needs-server-token",
  "ai/transcribe/route.ts": "needs-server-token",
  "ai/translate/route.ts": "needs-server-token",
  "usage/route.ts": "needs-user-key",
  "mcp/route.ts": "needs-server-token",
  "mcp/tools/[name]/route.ts": "needs-server-token",
  "search/events/route.ts": "needs-server-token",
  "search/nearby/route.ts": "needs-server-token",
  "search/offers/route.ts": "needs-server-token",
  "search/videos/route.ts": "needs-server-token",
  "search/web/route.ts": "needs-server-token",
};

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Compares sha256 digests, so the compare takes the same time whatever the token length. */
export function serverTokenOk(req: Request, expected: string | undefined = env.IYNK_SERVER_TOKEN): boolean {
  const same = timingSafeEqual(digest(req.headers.get("x-iynk-server-token") ?? ""), digest(expected ?? ""));
  return Boolean(expected) && same;
}

/** Null when the caller may pass; an unset server token closes every route that calls this. */
export function requireServerToken(req: Request): Response | null {
  return serverTokenOk(req) ? null : unauthorized();
}
