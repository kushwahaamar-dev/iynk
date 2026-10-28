import "server-only";
import { z } from "zod";
import { env } from "@/lib/server/env";
import { clientIp, fail, json, parseBody } from "@/lib/server/http";
import { rateLimit, tooManyRequests } from "@/lib/server/ratelimit";
import { STATUS_OF, runTool } from "./registry";
import { toolNamed } from "./tools";
import { originAllowed } from "./http";

/** POST /api/mcp/tools/<name>: the MCP tools as plain JSON endpoints, for raw-API connectors (see openapi.ts). */

const LIMIT = { limit: 60, windowMs: 60_000 };

export async function handleToolPost(req: Request, name: string): Promise<Response> {
  if (!originAllowed(req)) return fail(403, "forbidden_origin", "Browsers may call this endpoint only at iynk's own address.");
  const tool = toolNamed(name);
  if (!tool) return fail(404, "unknown_tool", `iynk has no tool called "${name.slice(0, 64)}". The list is in /api/openapi.json.`);
  const limited = rateLimit(`mcp-rest:${clientIp(req)}`, LIMIT);
  if (!limited.ok) return tooManyRequests(limited);
  const body = await parseBody(req, z.unknown(), { maxBytes: 64 * 1024 });
  if (!body.ok) return body.response;
  const outcome = await runTool(tool, body.data, { siteUrl: env.NEXT_PUBLIC_SITE_URL });
  return outcome.ok ? json(outcome.data) : fail(STATUS_OF[outcome.code], outcome.code, outcome.message);
}
