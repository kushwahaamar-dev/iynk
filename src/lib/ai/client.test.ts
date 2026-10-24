import { describe, expect, test, vi } from "vitest";
import { AiError, drawCover, errorCode, parseChatEvent, readSse, streamChat, transcribe } from "./client";
import type { ChatEvent, ChatRequest } from "./protocol";

const encoder = new TextEncoder();

function body(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect<T>(source: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of source) out.push(item);
  return out;
}

const request: ChatRequest = { messages: [{ role: "user", content: "Why is the LED off?" }], locale: "en" };

const sse = (events: object[]) => events.map((event) => `data: ${JSON.stringify(event)}\n\n`);

describe("readSse", () => {
  test("joins data lines, skips comments and other fields, and survives any chunking", async () => {
    const text = ': keep-alive\n\nevent: message\ndata: {"a":1}\n\ndata: line one\ndata: line two\nid: 7\n\n';
    const whole = await collect(readSse(body([text])));
    expect(whole).toEqual(['{"a":1}', "line one\nline two"]);
    // One byte at a time must give the same events.
    const bytes = await collect(readSse(body(text.split(""))));
    expect(bytes).toEqual(whole);
  });

  test("handles CRLF split across chunks and discards an event cut off by the end of the stream", async () => {
    const events = await collect(readSse(body(["data: one\r", "\n\r\ndata:two", "\r\n\r\ndata: tail"])));
    expect(events).toEqual(["one", "two"]);
  });

  test("keeps multi-byte characters split between chunks", async () => {
    const bytes = encoder.encode('data: {"delta":"日本"}\n\n');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 17));
        controller.enqueue(bytes.slice(17));
        controller.close();
      },
    });
    expect(await collect(readSse(stream))).toEqual(['{"delta":"日本"}']);
  });
});

describe("parseChatEvent", () => {
  test("accepts the H4 events and drops malformed ones", () => {
    expect(parseChatEvent('{"type":"text","delta":"Hi"}')).toEqual({ type: "text", delta: "Hi" });
    expect(parseChatEvent('{"type":"tool_call","id":"c1","name":"highlight_part","args":{"partId":"led1"}}')).toEqual({
      type: "tool_call",
      id: "c1",
      name: "highlight_part",
      args: { partId: "led1" },
    });
    expect(parseChatEvent('{"type":"citation","url":"javascript:alert(1)","title":"x"}')).toBeNull();
    expect(parseChatEvent('{"type":"citation","url":"https://example.com/ds.pdf","title":"","snippet":"5 V"}')).toEqual({
      type: "citation",
      url: "https://example.com/ds.pdf",
      title: "https://example.com/ds.pdf",
      snippet: "5 V",
    });
    expect(parseChatEvent('{"type":"done","usage":{"provider":"meta","inTokens":10,"outTokens":"x"}}')).toEqual({
      type: "done",
      usage: { provider: "meta", inTokens: 10, outTokens: 0 },
    });
    expect(parseChatEvent("not json")).toBeNull();
    expect(parseChatEvent('{"type":"text"}')).toBeNull();
    expect(parseChatEvent('{"type":"mystery"}')).toBeNull();
  });
});

describe("errorCode", () => {
  test("maps statuses and server codes to UI states", () => {
    expect(errorCode(503, "not_configured")).toBe("not_configured");
    expect(errorCode(503)).toBe("not_configured");
    expect(errorCode(429)).toBe("rate_limited");
    expect(errorCode(400, "bad_input")).toBe("bad_input");
    expect(errorCode(413)).toBe("bad_input");
    expect(errorCode(502, "upstream")).toBe("upstream");
    expect(errorCode(500)).toBe("upstream");
  });
});

describe("streamChat", () => {
  test("posts the request and yields events in order", async () => {
    const fetch = vi.fn(async () => new Response(body(sse([{ type: "text", delta: "Look " }, { type: "text", delta: "here." }, { type: "done", usage: { provider: "meta", inTokens: 3, outTokens: 2 } }])), { status: 200, headers: { "content-type": "text/event-stream" } }));
    const events: ChatEvent[] = await collect(streamChat(request, { fetch }));
    expect(events.map((e) => e.type)).toEqual(["text", "text", "done"]);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/ai/chat");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(request);
  });

  test("throws AiError with the mapped code for HTTP errors", async () => {
    const fetch = vi.fn(async () => Response.json({ error: { code: "not_configured", message: "no key" } }, { status: 503 }));
    await expect(collect(streamChat(request, { fetch }))).rejects.toMatchObject({ code: "not_configured", status: 503 });
    const limited = vi.fn(async () => new Response("<html>busy</html>", { status: 429 }));
    await expect(collect(streamChat(request, { fetch: limited }))).rejects.toMatchObject({ code: "rate_limited" });
  });

  test("reports offline when fetch rejects and aborted when the caller aborts", async () => {
    const offline = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(collect(streamChat(request, { fetch: offline }))).rejects.toMatchObject({ code: "offline" });

    const controller = new AbortController();
    const hanging = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const run = collect(streamChat(request, { fetch: hanging as unknown as typeof fetch, signal: controller.signal }));
    controller.abort();
    await expect(run).rejects.toMatchObject({ code: "aborted" });
  });

  test("passes in-stream errors through as events", async () => {
    const fetch = vi.fn(async () => new Response(body(sse([{ type: "text", delta: "Partial" }, { type: "error", code: "upstream" }]))));
    const events = await collect(streamChat(request, { fetch }));
    expect(events).toEqual([
      { type: "text", delta: "Partial" },
      { type: "error", code: "upstream" },
    ]);
  });
});

describe("transcribe and drawCover", () => {
  test("transcribe sends multipart audio and the language", async () => {
    const fetch = vi.fn(async () => Response.json({ text: "the led is off", lang: "en" }));
    const audio = new Blob([new Uint8Array(32)], { type: "audio/webm" });
    expect(await transcribe(audio, "es", { fetch })).toEqual({ text: "the led is off", lang: "en" });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/ai/transcribe");
    const form = init.body as FormData;
    expect(form.get("lang")).toBe("es");
    expect((form.get("audio") as File).name).toBe("voice.webm");
  });

  test("transcribe refuses audio over 4 MB without calling the server", async () => {
    const fetch = vi.fn();
    const big = new Blob([new Uint8Array(4 * 1024 * 1024 + 1)], { type: "audio/webm" });
    await expect(transcribe(big, "en", { fetch })).rejects.toBeInstanceOf(AiError);
    expect(fetch).not.toHaveBeenCalled();
  });

  test("drawCover caps the prompt and only accepts image data URLs", async () => {
    const fetch = vi.fn(async () => Response.json({ image: "data:image/png;base64,AAAA" }));
    await drawCover("x".repeat(900), { fetch });
    const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(init.body as string)).toEqual({ prompt: "x".repeat(600), style: "colorfigures" });
    const bad = vi.fn(async () => Response.json({ image: "https://evil.example/x.png" }));
    await expect(drawCover("a cover", { fetch: bad })).rejects.toMatchObject({ code: "upstream" });
  });
});
