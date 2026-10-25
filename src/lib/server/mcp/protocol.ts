import "server-only";

/**
 * The slice of the Model Context Protocol iynk speaks. Two eras share one endpoint
 * (modelcontextprotocol.io/specification/2026-07-28/basic/versioning, read 2026-10-24):
 * - modern (2026-07-28): no handshake, every request names its version in params._meta and
 *   mirrors method and tool name into headers;
 * - legacy (2025-03-26 .. 2025-11-25): an `initialize` handshake, then plain requests.
 * Nothing is kept between requests, so both eras are served statelessly.
 */

export const MODERN_VERSION = "2026-07-28";
/** Newest first: `initialize` answers with the client's version when it is here, else the first. */
export const LEGACY_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"] as const;
export const SUPPORTED_VERSIONS: readonly string[] = [MODERN_VERSION, ...LEGACY_VERSIONS];
/** What a legacy request without MCP-Protocol-Version is taken to speak (2025-06-18 transport rules). */
export const DEFAULT_LEGACY_VERSION = "2025-03-26";

const META_VERSION_KEY = "io.modelcontextprotocol/protocolVersion";
export const META_SERVER_INFO_KEY = "io.modelcontextprotocol/serverInfo";

export const ErrorCode = {
  parse: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internal: -32603,
  headerMismatch: -32020,
  unsupportedVersion: -32022,
} as const;

type JsonRpcId = string | number;

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcError = { code: number; message: string; data?: unknown };

export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: JsonRpcId; result: Record<string, unknown> }
  | { jsonrpc: "2.0"; id: JsonRpcId | null; error: JsonRpcError };

/** A POST body sorted into what the transport must do with it. */
type Incoming =
  | { kind: "request"; message: JsonRpcRequest }
  | { kind: "notification"; method: string }
  | { kind: "response" }
  | { kind: "invalid"; id: JsonRpcId | null; error: JsonRpcError };

const isId = (v: unknown): v is JsonRpcId => typeof v === "string" || (typeof v === "number" && Number.isFinite(v));
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function classify(body: unknown): Incoming {
  if (Array.isArray(body)) {
    return { kind: "invalid", id: null, error: { code: ErrorCode.invalidRequest, message: "JSON-RPC batches are not supported; send one message per POST." } };
  }
  if (!isRecord(body) || body.jsonrpc !== "2.0") {
    return { kind: "invalid", id: null, error: { code: ErrorCode.invalidRequest, message: 'Expected a JSON-RPC 2.0 object with "jsonrpc": "2.0".' } };
  }
  const id = isId(body.id) ? body.id : null;
  if (typeof body.method !== "string") {
    if ("result" in body || "error" in body) return { kind: "response" };
    return { kind: "invalid", id, error: { code: ErrorCode.invalidRequest, message: "A request needs a string method." } };
  }
  if (body.params !== undefined && !isRecord(body.params)) {
    return { kind: "invalid", id, error: { code: ErrorCode.invalidRequest, message: "params must be an object." } };
  }
  if (!("id" in body)) return { kind: "notification", method: body.method };
  if (id === null) return { kind: "invalid", id: null, error: { code: ErrorCode.invalidRequest, message: "id must be a string or a number." } };
  return { kind: "request", message: { jsonrpc: "2.0", id, method: body.method, params: body.params as Record<string, unknown> | undefined } };
}

/** The protocol version a modern request names in params._meta, if any. */
export function metaVersion(params: Record<string, unknown> | undefined): unknown {
  const meta = params?._meta;
  return isRecord(meta) ? meta[META_VERSION_KEY] : undefined;
}

export const ok = (id: JsonRpcId, result: Record<string, unknown>): JsonRpcResponse => ({ jsonrpc: "2.0", id, result });

export const fail = (id: JsonRpcId | null, code: number, message: string, data?: unknown): JsonRpcResponse => ({
  jsonrpc: "2.0",
  id,
  error: data === undefined ? { code, message } : { code, message, data },
});

/**
 * Header values that cannot travel as plain ASCII arrive as `=?base64?…?=` (Streamable HTTP
 * "Value Encoding"). Returns null when the value is malformed.
 */
export function decodeHeaderValue(raw: string): string | null {
  const m = /^=\?base64\?([A-Za-z0-9+/=]*)\?=$/.exec(raw);
  if (!m) return /^[\x20-\x7e\t]*$/.test(raw) ? raw : null;
  try {
    const bytes = Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}
