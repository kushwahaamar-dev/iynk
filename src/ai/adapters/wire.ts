import { aiError, toAiError } from "../errors.ts";

/** One server-sent event: its `event:` name ("message" when unnamed) and its joined `data:` lines. */
export type SseEvent = { event: string; data: string };

const DEFAULT_RETRY_MS = 800;
const MAX_RETRY_AFTER_S = 4;

/**
 * Parses a text/event-stream body (WHATWG HTML, "Parsing an event stream").
 * Chunks may split lines, CRLF pairs and multi-byte characters anywhere; the
 * decoder drops a leading BOM. Unlike the spec, a last event that the stream
 * ends without a blank line is still delivered, so a truncated final usage
 * chunk is not lost.
 */
export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "";
  let data: string[] = [];

  function* lines(final: boolean): Generator<string> {
    for (;;) {
      const match = /\r\n|\r|\n/.exec(buffer);
      // A trailing "\r" might be the first half of "\r\n": wait for the next chunk.
      if (!match || (!final && match[0] === "\r" && match.index === buffer.length - 1)) break;
      yield buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);
    }
    if (final && buffer) {
      yield buffer;
      buffer = "";
    }
  }

  function take(line: string): SseEvent | null {
    if (line === "") {
      const out = data.length ? { event: event || "message", data: data.join("\n") } : null;
      event = "";
      data = [];
      return out;
    }
    if (line.startsWith(":")) return null;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "data") data.push(value);
    else if (field === "event") event = value;
    return null;
  }

  let finished = false;
  try {
    while (!finished) {
      const { done, value } = await reader.read();
      finished = done;
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      for (const line of lines(done)) {
        const out = take(line);
        if (out) yield out;
      }
    }
    const out = take("");
    if (out) yield out;
  } finally {
    // A consumer that stops early (or a closed tab) also stops the upstream body.
    if (!finished) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** The wait before the one retry: the provider's `retry-after` when it is short, else 800 ms. */
export function retryDelayMs(res?: Response): number {
  const after = Number(res?.headers.get("retry-after"));
  if (Number.isFinite(after) && after > 0 && after <= MAX_RETRY_AFTER_S) return after * 1000;
  return DEFAULT_RETRY_MS;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(aiError("aborted"));
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(aiError("aborted"));
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Sends once and, on 429 or 5xx, once more. It hands back a response before
 * any of its body is read, so a retry never follows output.
 */
export async function withRetry(send: () => Promise<Response>, signal: AbortSignal): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await send();
    } catch (error) {
      throw toAiError(error, signal);
    }
    if (attempt === 1 || (res.status !== 429 && res.status < 500)) return res;
    const delay = retryDelayMs(res);
    await res.body?.cancel().catch(() => {});
    await sleep(delay, signal);
  }
}
