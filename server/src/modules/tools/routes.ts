import type { RouteDeps } from "../../app.ts";
import { defineRoutes, type Ctx, type Reply, type RouteDef } from "../../http/classes.ts";
import { ApiError, errorBody, unauthorized } from "../../http/errors.ts";
import { authenticateMcp } from "./auth.ts";
import { STATUS_OF, describeTool, registeredTools, runTool, toolNamed } from "./registry.ts";
import { MAX_BODY_BYTES, handleMcpPost } from "./transport.ts";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * DNS rebinding makes a browser send a page's requests here under the attacker's host name, so a browser
 * request (one with an Origin header) must name a host this server really answers to in its Host header,
 * which page scripts cannot set. Agents and servers (SDK clients, curl) send no Origin and pass.
 */
function originAllowed(headers: Headers, publicHost: string): boolean {
  if (!headers.has("origin")) return true;
  const host = (headers.get("host") ?? "").toLowerCase().replace(/:\d+$/, "");
  return LOOPBACK.has(host) || host === publicHost;
}

export function toolsRoutes(ctx: RouteDeps): RouteDef[] {
  const { config, log } = ctx;
  const toolCtx = { siteUrl: config.publicUrl.origin };

  const unauthenticated = (c: Ctx): Reply => ({
    status: 401,
    body: errorBody(unauthorized(), c.requestId),
    headers: { "www-authenticate": 'Bearer realm="iynk"' },
  });

  return defineRoutes([
    {
      method: "POST",
      path: "/v1/mcp",
      operation: "mcp",
      cls: "capability",
      bucket: "tools",
      maxBodyBytes: MAX_BODY_BYTES,
      handler(c) {
        if (!authenticateMcp(c, ctx).ok) return unauthenticated(c);
        if (!originAllowed(c.headers, config.publicUrl.hostname)) throw new ApiError(403, "forbidden_origin", "Browsers may call this endpoint only at this server's own address.");
        return handleMcpPost(c, toolCtx);
      },
    },
    {
      method: "GET",
      path: "/v1/tools",
      operation: "listTools",
      cls: "capability",
      bucket: "tools",
      handler(c) {
        if (!authenticateMcp(c, ctx).ok) return unauthenticated(c);
        return { status: 200, body: { tools: registeredTools().map(describeTool) } };
      },
    },
    {
      method: "POST",
      path: "/v1/tools/{name}",
      operation: "callTool",
      cls: "capability",
      bucket: "tools",
      async handler(c) {
        if (!authenticateMcp(c, ctx).ok) return unauthenticated(c);
        const name = c.params["name"] as string;
        const tool = toolNamed(name);
        if (!tool) throw new ApiError(404, "not_found", `This server has no tool called "${name.slice(0, 64)}".`);
        const outcome = await runTool(tool, c.body, toolCtx);
        log.info("tools.call", { req: c.requestId, tool: tool.name, ok: outcome.ok });
        if (!outcome.ok) throw new ApiError(STATUS_OF[outcome.code], outcome.code, outcome.message);
        return { status: 200, body: outcome.data };
      },
    },
  ]);
}
