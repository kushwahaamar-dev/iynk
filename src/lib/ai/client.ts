// Typed client for /api/ai/* (HX-CONTRACT H4): an SSE reader for the chat
// stream, plain JSON calls for the rest, and one error type whose code the UI
// turns into a state ("not set up here", "busy", "offline", ...).

import type { Locale } from "@/i18n/config";
import type {
  ApiErrorBody,
  ChatEvent,
  ChatRequest,
  TranscribeResponse,
} from "./protocol";
import { withAiAuth } from "@/lib/keys/headers";
import { track } from "@/lib/telemetry";
import { blobToVoiceWav, VoiceWavError } from "./voice-wav";

export type AiErrorCode = "no_key" | "not_configured" | "rate_limited" | "bad_input" | "upstream" | "offline" | "aborted";

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly status: number | undefined;

  constructor(code: AiErrorCode, status?: number, message: string = code) {
    super(message);
    this.name = "AiError";
    this.code = code;
    this.status = status;
  }
}

/** Maps an HTTP status and the server's `error.code` to what the UI shows. */
export function errorCode(status: number, serverCode?: string): AiErrorCode {
  if (serverCode === "key_required" || status === 422) return "no_key";
  if (serverCode === "not_configured" || serverCode === "feature_disabled" || status === 503 || status === 501) {
    return "not_configured";
  }
  if (serverCode === "rate_limited" || status === 429) return "rate_limited";
  if (status >= 400 && status < 500) return "bad_input";
  return "upstream";
}

/** The code of an in-stream `{type:'error', code}` event. */
export function streamErrorCode(code: string): AiErrorCode {
  if (code === "not_configured") return code;
  if (code === "upstream_busy" || code === "rate_limited") return "rate_limited";
  return "upstream";
}

function toAiError(error: unknown, signal?: AbortSignal): AiError {
  if (error instanceof AiError) return error;
  if (signal?.aborted) return new AiError("aborted");
  if (error instanceof DOMException && error.name === "AbortError") return new AiError("aborted");
  if (error instanceof DOMException && error.name === "TimeoutError") return new AiError("upstream");
  // fetch rejects with a TypeError when the network or the server is unreachable.
  return new AiError("offline");
}

async function failure(res: Response): Promise<AiError> {
  let code: string | undefined;
  try {
    const body = (await res.json()) as Partial<ApiErrorBody>;
    code = typeof body.error?.code === "string" ? body.error.code : undefined;
  } catch {
    // Not JSON (a proxy error page): the status alone decides.
  }
  return new AiError(errorCode(res.status, code), res.status);
}

const LINE_END = /\r\n|\r|\n/;

/**
 * Reads a text/event-stream body and yields each event's data (the `data:`
 * lines joined with "\n"), following the HTML spec's event stream rules:
 * CRLF, LF or CR line ends, comments and other fields skipped, one space after
 * the colon dropped, and an event the stream ends before its blank line is
 * discarded.
 */
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let data: string[] = [];

  const line = (text: string): string | null => {
    if (text === "") {
      const event = data.length ? data.join("\n") : null;
      data = [];
      return event;
    }
    if (text.startsWith(":")) return null;
    const colon = text.indexOf(":");
    const field = colon === -1 ? text : text.slice(0, colon);
    if (field !== "data") return null;
    let value = colon === -1 ? "" : text.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    data.push(value);
    return null;
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      for (;;) {
        const match = LINE_END.exec(buffer);
        if (!match) break;
        // A lone "\r" at the end may be the first half of "\r\n": wait for the next chunk.
        if (!done && match[0] === "\r" && match.index === buffer.length - 1) break;
        const event = line(buffer.slice(0, match.index));
        buffer = buffer.slice(match.index + match[0].length);
        if (event !== null) yield event;
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";

/** Parses one data payload of the chat stream; anything malformed is dropped. */
export function parseChatEvent(data: string): ChatEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  switch (value.type) {
    case "text":
      return isString(value.delta) ? { type: "text", delta: value.delta } : null;
    case "tool_call":
      return isString(value.id) && isString(value.name)
        ? { type: "tool_call", id: value.id, name: value.name, args: value.args ?? {} }
        : null;
    case "citation":
      return isString(value.url) && /^https?:\/\//.test(value.url)
        ? {
            type: "citation",
            url: value.url,
            title: isString(value.title) && value.title ? value.title : value.url,
            snippet: isString(value.snippet) ? value.snippet : "",
          }
        : null;
    case "done": {
      const usage = isRecord(value.usage) ? value.usage : {};
      return {
        type: "done",
        usage: {
          provider: usage.provider === "gemini" ? "gemini" : "meta",
          inTokens: Number(usage.inTokens) || 0,
          outTokens: Number(usage.outTokens) || 0,
        },
      };
    }
    case "error":
      return { type: "error", code: (isString(value.code) ? value.code : "internal") as Extract<ChatEvent, { type: "error" }>["code"] };
    default:
      return null;
  }
}

type CallOptions = { signal?: AbortSignal; fetch?: typeof fetch };

/** No bytes for this long while streaming means the upstream is stuck. */
export const CHAT_IDLE_MS = 30_000;

/**
 * POSTs a chat turn and yields its events as they arrive. Throws an AiError
 * for HTTP failures, network loss, a stalled stream or an abort. In-stream
 * `error` events are yielded, not thrown, so the caller keeps any partial text.
 */
export async function* streamChat(request: ChatRequest, options: CallOptions = {}): AsyncGenerator<ChatEvent> {
  const headers = withAiAuth({ "content-type": "application/json", accept: "text/event-stream" });
  if (!headers) throw new AiError("no_key");
  const doFetch = options.fetch ?? fetch;
  const controller = new AbortController();
  const outer = options.signal;
  const forward = () => controller.abort(outer?.reason);
  if (outer?.aborted) forward();
  outer?.addEventListener("abort", forward, { once: true });
  let stalled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      stalled = true;
      controller.abort();
    }, CHAT_IDLE_MS);
  };

  try {
    arm();
    track("ai.call", { kind: "chat" });
    let res: Response;
    try {
      res = await doFetch("/api/ai/chat", {
        method: "POST",
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });
    } catch (error) {
      throw stalled ? new AiError("upstream") : toAiError(error, outer);
    }
    if (!res.ok) throw await failure(res);
    if (!res.body) throw new AiError("upstream", res.status);
    try {
      for await (const data of readSse(res.body)) {
        arm();
        const event = parseChatEvent(data);
        if (event) yield event;
      }
    } catch (error) {
      throw stalled ? new AiError("upstream") : toAiError(error, outer);
    }
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", forward);
    controller.abort();
  }
}

/** The transcribe route takes at most 4 MB of audio. */
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

export async function transcribe(audio: Blob, lang: Locale, options: CallOptions = {}): Promise<TranscribeResponse> {
  const headers = withAiAuth();
  if (!headers) throw new AiError("no_key");
  if (audio.size > MAX_AUDIO_BYTES) throw new AiError("bad_input");
  let wav: Blob;
  try {
    wav = await blobToVoiceWav(audio);
  } catch (error) {
    if (error instanceof VoiceWavError) throw new AiError("bad_input");
    throw error;
  }
  if (wav.size > MAX_AUDIO_BYTES) throw new AiError("bad_input");
  const doFetch = options.fetch ?? fetch;
  const form = new FormData();
  form.append("audio", wav, "voice.wav");
  form.append("lang", lang);
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(30_000)])
    : AbortSignal.timeout(30_000);
  track("ai.call", { kind: "transcribe" });
  let res: Response;
  try {
    res = await doFetch("/api/ai/transcribe", { method: "POST", headers, body: form, signal });
  } catch (error) {
    throw toAiError(error, options.signal);
  }
  if (!res.ok) throw await failure(res);
  const body = (await res.json().catch(() => null)) as Partial<TranscribeResponse> | null;
  if (!body || typeof body.text !== "string") throw new AiError("upstream", res.status);
  return { text: body.text, lang: typeof body.lang === "string" ? body.lang : lang };
}
