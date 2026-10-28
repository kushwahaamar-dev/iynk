import "server-only";
import { env } from "@/lib/server/env";

/** What /api/mcp, /api/mcp/tools/* and /api/openapi.json share at the HTTP level. */

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
