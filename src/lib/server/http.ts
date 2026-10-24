import "server-only";
import type { z } from "zod";

/**
 * Response and request helpers for every route handler (HX-CONTRACT H2).
 * Errors always have the shape `{ error: { code, message } }`. The message is
 * a short English hint for developers; the UI picks its localised text by code.
 */

export type ApiError = { error: { code: string; message: string } };

export type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response };

export const DEFAULT_MAX_BODY = 256 * 1024;

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return Response.json(data, { ...init, headers });
}

const HINTS: Record<number, string> = {
  400: "The request is not valid.",
  403: "This origin may not call the API.",
  404: "Not found.",
  409: "Already done.",
  413: "The request body is too large.",
  415: "Unsupported content type.",
  429: "Too many requests. Try again shortly.",
  500: "Something went wrong on the server.",
  502: "The upstream service failed.",
  503: "This feature is not set up on this deployment.",
  504: "The upstream service timed out.",
};

export function fail(status: number, code: string, message?: string, headers?: HeadersInit): Response {
  const body: ApiError = { error: { code, message: message ?? HINTS[status] ?? "Request failed." } };
  return json(body, { status, headers });
}

export const notConfigured = (what: string) => fail(503, "not_configured", `${what} is not set up on this deployment.`);

/** Reads at most `maxBytes` of the body; null when it is larger. */
async function readCapped(req: Request, maxBytes: number): Promise<Uint8Array | null> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!req.body) return new Uint8Array(0);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => (issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ");
}

/**
 * Parses a JSON body against a zod schema. Only `application/json` is accepted,
 * which also keeps other sites from posting "simple" cross-origin requests.
 */
export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
  { maxBytes = DEFAULT_MAX_BODY }: { maxBytes?: number } = {},
): Promise<Parsed<z.output<S>>> {
  if (!/^application\/json\b/i.test(req.headers.get("content-type") ?? "")) {
    return { ok: false, response: fail(415, "unsupported_media_type", "Send JSON with content-type: application/json.") };
  }
  const bytes = await readCapped(req, maxBytes);
  if (!bytes) return { ok: false, response: fail(413, "too_large", `The body is larger than ${maxBytes} bytes.`) };
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return { ok: false, response: fail(400, "bad_json", "The body is not valid JSON.") };
  }
  const result = schema.safeParse(value);
  if (!result.success) return { ok: false, response: fail(400, "bad_request", describeIssues(result.error)) };
  return { ok: true, data: result.data };
}

/** Reads a multipart body of at most `maxBytes`. */
export async function parseForm(req: Request, { maxBytes }: { maxBytes: number }): Promise<Parsed<FormData>> {
  const type = req.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\b/i.test(type)) {
    return { ok: false, response: fail(415, "unsupported_media_type", "Send multipart/form-data.") };
  }
  const bytes = await readCapped(req, maxBytes);
  if (!bytes) return { ok: false, response: fail(413, "too_large", `The body is larger than ${maxBytes} bytes.`) };
  try {
    const form = await new Response(bytes as BodyInit, { headers: { "content-type": type } }).formData();
    return { ok: true, data: form };
  } catch {
    return { ok: false, response: fail(400, "bad_form", "The multipart body could not be read.") };
  }
}

/** An abort signal for an upstream call: fires after `ms`, or when `parent` aborts. */
export function withTimeout(ms: number, parent?: AbortSignal | null): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  return parent ? AbortSignal.any([parent, timeout]) : timeout;
}

/**
 * The caller's IP as the platform's proxy reports it. Behind Vercel these
 * headers are set by the edge; without a proxy they are only a rate-limit hint.
 */
export function clientIp(req: Request): string {
  const h = req.headers;
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? h.get("cf-connecting-ip");
  return ip?.trim().slice(0, 64) || "unknown";
}

/**
 * H11: browsers may call the API only from our own origin. Requests without an
 * Origin header (same-origin GETs, scripts, MCP clients) pass.
 */
export function checkOrigin(req: Request): Response | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host === host) return null;
  } catch {
    // A malformed Origin header falls through to the refusal.
  }
  return fail(403, "forbidden_origin");
}
