import type { Ctx, Reply } from "../../http/classes.ts";
import {
  DEFAULT_LEGACY_VERSION,
  ErrorCode,
  LEGACY_VERSIONS,
  META_SERVER_INFO_KEY,
  MODERN_VERSION,
  SUPPORTED_VERSIONS,
  classify,
  decodeHeaderValue,
  fail,
  metaVersion,
  ok,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from "./protocol.ts";
import { SERVER_INSTRUCTIONS, describeTool, registeredTools, runTool, serverInfo, toolNamed, type ToolContext } from "./registry.ts";

/**
 * Streamable HTTP for /v1/mcp: one JSON-RPC message per POST, one JSON answer, nothing kept in between.
 * Protocol errors answer in JSON-RPC; the router answers refusals at the HTTP level (origin, size, rate).
 */

export const MAX_BODY_BYTES = 256 * 1024;

const answer = (status: number, body?: JsonRpcResponse): Reply => ({ status, body });

type Handled = [status: number, body: JsonRpcResponse];

async function callTool(msg: JsonRpcRequest, ctx: ToolContext, wrap: (r: Record<string, unknown>) => Record<string, unknown>): Promise<Handled> {
  const name = msg.params?.name;
  const tool = typeof name === "string" ? toolNamed(name) : undefined;
  if (!tool) return [200, fail(msg.id, ErrorCode.invalidParams, `Unknown tool: ${String(name).slice(0, 64)}. Call tools/list for iynk's ${registeredTools().length} tools.`)];
  const outcome = await runTool(tool, msg.params?.arguments, ctx);
  const result = outcome.ok
    ? { content: [{ type: "text", text: JSON.stringify(outcome.data) }], structuredContent: outcome.data }
    : { content: [{ type: "text", text: `${outcome.message} [${outcome.code}]` }], isError: true };
  return [200, ok(msg.id, wrap(result))];
}

const listTools = () => ({ tools: registeredTools().map(describeTool) });
const same = (r: Record<string, unknown>) => r;
const complete = (r: Record<string, unknown>) => ({ resultType: "complete", ...r });

/** Legacy era: `initialize` once, then plain requests (2025-03-26 .. 2025-11-25). */
async function legacy(msg: JsonRpcRequest, ctx: ToolContext): Promise<Handled> {
  switch (msg.method) {
    case "initialize": {
      const asked = msg.params?.protocolVersion;
      const version = LEGACY_VERSIONS.find((v) => v === asked) ?? LEGACY_VERSIONS[0];
      const result = { protocolVersion: version, capabilities: { tools: { listChanged: false } }, serverInfo: serverInfo(ctx), instructions: SERVER_INSTRUCTIONS };
      return [200, ok(msg.id, result)];
    }
    case "ping":
      return [200, ok(msg.id, {})];
    case "tools/list":
      return [200, ok(msg.id, listTools())];
    case "tools/call":
      return callTool(msg, ctx, same);
    default:
      return [200, fail(msg.id, ErrorCode.methodNotFound, `Method not found: ${msg.method}`)];
  }
}

/** Modern era (2026-07-28): the headers must mirror the body, and every request stands alone. */
async function modern(msg: JsonRpcRequest, headers: Headers, ctx: ToolContext): Promise<Handled> {
  const version = metaVersion(msg.params);
  const mismatch = (detail: string): Handled => [400, fail(msg.id, ErrorCode.headerMismatch, `Header mismatch: ${detail}`)];
  const header = headers.get("mcp-protocol-version");
  if (header === null) return mismatch("the MCP-Protocol-Version header is missing");
  if (header !== version) return mismatch(`MCP-Protocol-Version header '${header}' does not match body value '${String(version)}'`);
  if (version !== MODERN_VERSION) {
    return [400, fail(msg.id, ErrorCode.unsupportedVersion, "Unsupported protocol version", { supported: SUPPORTED_VERSIONS, requested: version })];
  }
  const method = headers.get("mcp-method");
  if (method === null) return mismatch("the Mcp-Method header is missing");
  if (method !== msg.method) return mismatch(`Mcp-Method header '${method}' does not match body value '${msg.method}'`);
  if (msg.method === "tools/call") {
    const raw = headers.get("mcp-name");
    const name = raw === null ? null : decodeHeaderValue(raw);
    if (name === null) return mismatch("the Mcp-Name header is missing or malformed");
    if (name !== msg.params?.name) return mismatch(`Mcp-Name header '${name}' does not match body value '${String(msg.params?.name)}'`);
  }
  switch (msg.method) {
    case "server/discover": {
      const result = {
        supportedVersions: SUPPORTED_VERSIONS,
        capabilities: { tools: {} },
        _meta: { [META_SERVER_INFO_KEY]: serverInfo(ctx) },
        instructions: SERVER_INSTRUCTIONS,
      };
      return [200, ok(msg.id, complete(result))];
    }
    case "ping":
      return [200, ok(msg.id, complete({}))];
    case "tools/list":
      return [200, ok(msg.id, complete(listTools()))];
    case "tools/call":
      return callTool(msg, ctx, complete);
    default:
      return [404, fail(msg.id, ErrorCode.methodNotFound, `Method not found: ${msg.method}`)];
  }
}

export async function handleMcpPost(c: Ctx, ctx: ToolContext): Promise<Reply> {
  const incoming = classify(c.body);
  if (incoming.kind === "invalid") return answer(400, fail(incoming.id, incoming.error.code, incoming.error.message));
  // Notifications (initialized, cancelled) and stray responses need no answer.
  if (incoming.kind !== "request") return answer(202);

  const msg = incoming.message;
  if (msg.method !== "initialize" && metaVersion(msg.params) !== undefined) {
    const [status, body] = await modern(msg, c.headers, ctx);
    return answer(status, body);
  }

  const header = c.headers.get("mcp-protocol-version") ?? DEFAULT_LEGACY_VERSION;
  if (msg.method !== "initialize" && !LEGACY_VERSIONS.some((v) => v === header)) {
    const refusal =
      header === MODERN_VERSION
        ? fail(msg.id, ErrorCode.headerMismatch, `Header mismatch: MCP-Protocol-Version is ${MODERN_VERSION} but params._meta names no protocol version`)
        : fail(msg.id, ErrorCode.unsupportedVersion, "Unsupported protocol version", { supported: SUPPORTED_VERSIONS, requested: header });
    return answer(400, refusal);
  }
  const [status, body] = await legacy(msg, ctx);
  return answer(status, body);
}
