import "server-only";

/** One server-sent event: its `event:` name ("message" when unnamed) and its joined `data:` lines. */
export type SseEvent = { event: string; data: string };

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

const encoder = new TextEncoder();

/**
 * Streams JSON events as `data:` lines. A comment every `heartbeatMs` keeps
 * proxies from closing the connection while a tool call runs.
 */
export function sseResponse(events: AsyncIterable<unknown>, { heartbeatMs = 10_000 } = {}): Response {
  let timer: ReturnType<typeof setInterval> | undefined;
  const iterator = events[Symbol.asyncIterator]();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(": open\n\n"));
      timer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          clearInterval(timer);
        }
      }, heartbeatMs);
    },
    async pull(controller) {
      try {
        const { done, value } = await iterator.next();
        if (done) {
          clearInterval(timer);
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
      } catch (error) {
        clearInterval(timer);
        controller.error(error);
      }
    },
    async cancel() {
      clearInterval(timer);
      await iterator.return?.();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
