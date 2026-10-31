import type { IncomingMessage, ServerResponse } from "node:http";
import type { ServerConfig } from "../config.ts";
import type { Deps } from "../deps.ts";
import type { Logger } from "../ops/log.ts";
import type { Authed, Ctx, Reply, RouteDef } from "./classes.ts";
import { ApiError, errorBody, unauthorized } from "./errors.ts";
import { addressKey, type Limiter } from "./limits.ts";

export type RouterOptions = {
  routes: RouteDef[];
  config: ServerConfig;
  deps: Deps;
  log: Logger;
  limiter: Limiter;
  authenticate: (token: string) => Authed | null;
};

const DEFAULT_BODY_BYTES = 64 * 1024;
const MAX_JSON_DEPTH = 32;
const MAX_TOKEN_LENGTH = 512;
const ID_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;
const CLIENT_PATTERN = /^[^/\s]+\/(\d+)\.(\d+)\.(\d+)/;
const PROBES = new Set(["GET /v1/server", "GET /v1/healthz", "GET /healthz", "GET /v1/readyz", "GET /readyz"]);
const ALLOW_HEADERS = "authorization, content-type, idempotency-key, if-none-match, iynk-client, x-request-id, x-iynk-provider-key";
const EXPOSE_HEADERS = "etag, retry-after, ratelimit-limit, ratelimit-remaining, ratelimit-reset, x-request-id, iynk-api-version, idempotent-replay, x-iynk-upstream-status";
const ALLOW_METHODS = "GET, POST, PATCH, PUT, DELETE, OPTIONS";

type Compiled = { def: RouteDef; segments: string[] };

function compile(def: RouteDef): Compiled {
  return { def, segments: def.path.split("/") };
}

function matchPath(route: Compiled, parts: string[]): Record<string, string> | null {
  if (route.segments.length !== parts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < parts.length; i++) {
    const want = route.segments[i] as string;
    const got = parts[i] as string;
    if (want.startsWith("{") && want.endsWith("}")) {
      if (got === "") return null;
      params[want.slice(1, -1)] = got;
    } else if (want !== got) {
      return null;
    }
  }
  return params;
}

function splitPath(raw: string | undefined): string[] | null {
  if (raw === undefined || !raw.startsWith("/")) return null;
  const pathname = raw.split(/[?#]/, 1)[0] as string;
  if (pathname.includes("//") || /%2f|%5c/i.test(pathname)) return null;
  try {
    return pathname.split("/").map((part) => decodeURIComponent(part));
  } catch {
    return null;
  }
}

function minClientOk(header: string | undefined, minClient: string): boolean {
  const match = CLIENT_PATTERN.exec(header ?? "");
  if (match === null) return true;
  const have = [Number(match[1]), Number(match[2]), Number(match[3])];
  const want = minClient.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((have[i] as number) !== (want[i] as number)) return (have[i] as number) > (want[i] as number);
  }
  return true;
}

function scanJson(text: string): void {
  const stack: (Set<string> | null)[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i] as string;
    if (ch === "{" || ch === "[") {
      stack.push(ch === "{" ? new Set() : null);
      if (stack.length > MAX_JSON_DEPTH) throw new Error("too deep");
    } else if (ch === "}" || ch === "]") {
      stack.pop();
    } else if (ch === '"') {
      let end = i + 1;
      while (text[end] !== '"') end += text[end] === "\\" ? 2 : 1;
      const keys = stack[stack.length - 1];
      if (keys && /^\s*:/.test(text.slice(end + 1, end + 64))) {
        const key = JSON.parse(text.slice(i, end + 1)) as string;
        if (keys.has(key)) throw new Error("duplicate key");
        keys.add(key);
      }
      i = end;
    }
    i++;
  }
}

function parseJson(bytes: Buffer): unknown {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const value: unknown = JSON.parse(text);
    scanJson(text);
    return value;
  } catch {
    throw new ApiError(400, "bad_json", "The request body is not valid JSON.");
  }
}

function readBody(req: IncomingMessage, cap: number): Promise<Buffer> {
  const tooLarge = () => new ApiError(413, "too_large", "The request body is too large.");
  const declared = Number(req.headers["content-length"]);
  if (declared > cap) return Promise.reject(tooLarge());
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > cap) {
        chunks.length = 0;
        req.pause();
        reject(tooLarge());
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export function createRouter(o: RouterOptions): (req: IncomingMessage, res: ServerResponse) => void {
  const { config, deps, log, limiter } = o;
  const routes = o.routes.map(compile);
  const origins = new Set(config.allowedOrigins);

  const requestId = (header: string | undefined): string => {
    if (header !== undefined && REQUEST_ID_PATTERN.test(header)) return header;
    const bytes = deps.ids.random(10);
    let id = "req_";
    for (let i = 0; i < 10; i++) id += ID_ALPHABET[(bytes[i] as number) & 31];
    return id;
  };

  async function handle(req: IncomingMessage, res: ServerResponse, started: number): Promise<void> {
    const reqId = requestId(req.headers["x-request-id"] as string | undefined);
    const headers: Record<string, string> = {
      "iynk-api-version": "1.0",
      "x-request-id": reqId,
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
      "cross-origin-resource-policy": "same-site",
    };
    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });
    let route: RouteDef | null = null;
    let deviceId: string | undefined;

    const logRequest = (status: number): void => {
      log.info("request", { route: route ? `${route.method} ${route.path}` : "unmatched", status, ms: deps.clock.now() - started, req: reqId, dev: deviceId });
    };

    const send = (status: number, extra: Record<string, string> = {}, body?: unknown): void => {
      const out = { ...headers, ...extra };
      let payload: string | undefined;
      if (body !== undefined && status !== 204) {
        payload = JSON.stringify(body);
        out["content-type"] = "application/json; charset=utf-8";
      }
      out["content-length"] = String(payload === undefined ? 0 : Buffer.byteLength(payload));
      res.writeHead(status, out);
      res.end(payload);
      logRequest(status);
    };

    const sendStream = async (reply: Reply, stream: AsyncIterable<Uint8Array>): Promise<void> => {
      res.writeHead(reply.status, { ...headers, ...reply.headers });
      let bytes = 0;
      try {
        for await (const chunk of stream) {
          if (aborter.signal.aborted) break;
          bytes += chunk.length;
          if (!res.write(chunk) && !aborter.signal.aborted) {
            await new Promise<void>((resolve) => {
              const done = (): void => {
                res.off("drain", done);
                res.off("close", done);
                resolve();
              };
              res.once("drain", done);
              res.once("close", done);
            });
          }
          if (aborter.signal.aborted) break;
        }
      } catch (error) {
        log.error("stream", { req: reqId, error: error instanceof Error ? error.message : String(error) });
        res.destroy();
      }
      const aborted = aborter.signal.aborted || res.destroyed;
      if (!aborted) res.end();
      logRequest(reply.status);
      reply.onFinish?.({ bytes, aborted });
    };
    const fail = (e: ApiError, extra?: Record<string, string>): void => send(e.status, extra, errorBody(e, reqId));

    try {
      const origin = req.headers.origin;
      if (origin !== undefined) {
        if (!origins.has(origin)) return fail(new ApiError(403, "forbidden_origin", "This origin may not call the API."));
        headers["access-control-allow-origin"] = origin;
        headers["vary"] = "Origin";
        headers["access-control-expose-headers"] = EXPOSE_HEADERS;
        if (req.method === "OPTIONS") {
          return send(204, {
            "access-control-allow-methods": ALLOW_METHODS,
            "access-control-allow-headers": ALLOW_HEADERS,
            "access-control-max-age": "600",
          });
        }
      }

      const method = req.method === "HEAD" ? "GET" : (req.method ?? "");
      const parts = splitPath(req.url);
      let params: Record<string, string> | null = null;
      const allowed = new Set<string>();
      if (parts !== null) {
        for (const candidate of routes) {
          const found = matchPath(candidate, parts);
          if (found === null) continue;
          allowed.add(candidate.def.method);
          if (candidate.def.method === method) {
            route = candidate.def;
            params = found;
          }
        }
      }
      if (route === null || params === null) {
        if (allowed.size === 0) return fail(new ApiError(404, "not_found", "Not found."));
        if (allowed.has("GET")) allowed.add("HEAD");
        return fail(new ApiError(405, "method_not_allowed", "That method is not allowed here."), { allow: [...allowed, "OPTIONS"].join(", ") });
      }

      if (route.cls === "removed") return fail(new ApiError(410, "gone", "This endpoint no longer exists."));

      if (!PROBES.has(`${route.method} ${route.path}`) && !minClientOk(req.headers["iynk-client"] as string | undefined, config.minClient)) {
        return fail(new ApiError(426, "upgrade_required", "Update the app to keep using this server."));
      }

      let authed: Authed | null = null;
      if (route.cls !== "public" && route.cls !== "capability") {
        const bearer = /^Bearer (\S+)$/.exec(req.headers.authorization ?? "");
        const token = bearer?.[1];
        authed = token !== undefined && token.length <= MAX_TOKEN_LENGTH ? o.authenticate(token) : null;
        deviceId = authed?.deviceId;
      }

      const address = addressKey(req.socket.remoteAddress ?? "", (req.headers["x-forwarded-for"] as string | undefined) ?? null, config.trustProxy);
      const taken = limiter.take(route.bucket, authed ? `dev:${authed.deviceId}` : address);
      headers["ratelimit-limit"] = String(taken.limit);
      headers["ratelimit-remaining"] = String(taken.remaining);
      headers["ratelimit-reset"] = String(taken.resetSeconds);
      if (!taken.ok) {
        const body = errorBody(new ApiError(429, "rate_limited", "Too many requests. Try again shortly."), reqId);
        body.error["retryAfterSeconds"] = taken.retryAfter;
        return send(429, { "retry-after": String(taken.retryAfter) }, body);
      }
      if (route.cls !== "public" && route.cls !== "capability" && authed === null) {
        return fail(unauthorized(), { "www-authenticate": 'Bearer realm="iynk"' });
      }

      let body: unknown;
      const length = req.headers["content-length"];
      if ((length !== undefined && length !== "0") || req.headers["transfer-encoding"] !== undefined) {
        const bytes = await readBody(req, route.maxBodyBytes ?? DEFAULT_BODY_BYTES);
        if (bytes.length > 0) {
          if (!/^application\/json\s*(;|$)/i.test(req.headers["content-type"] ?? "")) {
            return fail(new ApiError(415, "unsupported_media_type", "Send the body as application/json."));
          }
          body = parseJson(bytes);
        }
      }

      const url = new URL(req.url as string, "http://localhost");
      const ctx: Ctx = { method: route.method, path: url.pathname, params, query: url.searchParams, headers: toHeaders(req), body, address, authed, requestId: reqId, signal: aborter.signal };
      const reply: Reply = await (route.handler as NonNullable<RouteDef["handler"]>)(ctx);
      if (reply.stream !== undefined) await sendStream(reply, reply.stream);
      else send(reply.status, reply.headers, reply.body);
    } catch (error) {
      if (error instanceof ApiError) return fail(error, error.status === 413 ? { connection: "close" } : undefined);
      log.error("unhandled", { req: reqId, error: error instanceof Error ? error.message : String(error) });
      fail(new ApiError(500, "internal", "Something went wrong on the server."));
    }
  }

  return (req, res) => {
    handle(req, res, deps.clock.now()).catch(() => {
      res.destroy();
    });
  };
}

function toHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    for (const entry of Array.isArray(value) ? value : [value]) headers.append(name, entry);
  }
  return headers;
}
