// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sse } from "./__test__/upstream";
import { parseSse, sseResponse, type SseEvent } from "./sse";

async function collect(chunks: string[]): Promise<SseEvent[]> {
  const out: SseEvent[] = [];
  for await (const event of parseSse(sse(chunks).body!)) out.push(event);
  return out;
}

/** Every way of cutting `text` into two chunks. */
function splits(text: string): string[][] {
  return Array.from({ length: text.length + 1 }, (_, i) => [text.slice(0, i), text.slice(i)]);
}

describe("parseSse", () => {
  const stream = 'data: {"a":1}\n\nevent: ping\ndata: x\n\n: comment\ndata: line one\ndata: line two\n\n';
  const expected = [
    { event: "message", data: '{"a":1}' },
    { event: "ping", data: "x" },
    { event: "message", data: "line one\nline two" },
  ];

  it("reads events, names, comments and multi-line data", async () => {
    expect(await collect([stream])).toEqual(expected);
  });

  it("gives the same events however the chunks are cut", async () => {
    for (const parts of splits(stream)) expect(await collect(parts)).toEqual(expected);
    // One byte at a time.
    expect(await collect([...stream])).toEqual(expected);
  });

  it("handles CRLF and lone CR, even when CRLF is split across chunks", async () => {
    const crlf = "data: a\r\n\r\ndata: b\r\r";
    for (const parts of splits(crlf)) {
      expect(await collect(parts)).toEqual([
        { event: "message", data: "a" },
        { event: "message", data: "b" },
      ]);
    }
  });

  it("keeps multi-byte characters split across chunks intact", async () => {
    const bytes = new TextEncoder().encode("data: héllo 世界 🔌\n\n");
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    });
    const out: SseEvent[] = [];
    for await (const event of parseSse(body)) out.push(event);
    expect(out).toEqual([{ event: "message", data: "héllo 世界 🔌" }]);
  });

  it("strips one leading space and a BOM, and flushes a final event with no blank line", async () => {
    expect(await collect(["﻿data:  two spaces\n\ndata:none\ndata"])).toEqual([
      { event: "message", data: " two spaces" },
      { event: "message", data: "none\n" },
    ]);
  });

  it("ignores events without data", async () => {
    expect(await collect(["event: lonely\n\nretry: 10\n\n"])).toEqual([]);
  });
});

describe("sseResponse", () => {
  it("streams each value as a data line with SSE headers", async () => {
    async function* events() {
      yield { type: "text", delta: "hi" };
      yield { type: "done" };
    }
    const res = sseResponse(events());
    expect(res.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");
    expect(res.headers.get("cache-control")).toContain("no-store");
    const text = await res.text();
    expect(text).toBe(': open\n\ndata: {"type":"text","delta":"hi"}\n\ndata: {"type":"done"}\n\n');
  });
});
