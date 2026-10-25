import "server-only";
import { env } from "@/lib/server/env";

/** What /api/mcp, /api/mcp/tools/* and /api/openapi.json share at the HTTP level. */

const CORS_HEADERS: Readonly<Record<string, string>> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "content-type, accept, authorization, mcp-protocol-version, mcp-method, mcp-name, mcp-session-id, last-event-id",
  "access-control-max-age": "86400",
};

/** Adds the open CORS headers H11 allows for these routes (every other /api route serves only our origin). */
export function withCors(res: Response, methods: string): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  headers.set("access-control-allow-methods", methods);
  return new Response(res.body, { status: res.status, headers });
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * DNS rebinding makes a browser send a page's requests here under the attacker's host name, so a browser
 * request (one with an Origin header) must name a host this site really answers to in its Host header,
 * which page scripts cannot set. Agents and servers (Muse, SDK clients, curl) send no Origin and pass,
 * and any web origin may call iynk at its real address (MCP transport "Security", read 2026-10-24).
 */
export function originAllowed(req: Request): boolean {
  if (!req.headers.has("origin")) return true;
  const host = (req.headers.get("host") ?? "").toLowerCase().replace(/:\d+$/, "");
  return LOOPBACK.has(host) || host === new URL(env.NEXT_PUBLIC_SITE_URL).hostname;
}
