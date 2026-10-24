// Fakes for the Meta Model API in unit tests: SSE bodies, JSON replies and a recording fetch.
import { vi } from "vitest";

const encoder = new TextEncoder();

/** A text/event-stream response that delivers `chunks` exactly as split here. */
export function sse(chunks: string[]): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
}

/** `data:` lines for each chunk object, then [DONE]. */
export function sseOf(objects: unknown[]): Response {
  return sse([...objects.map((o) => `data: ${JSON.stringify(o)}\n\n`), "data: [DONE]\n\n"]);
}

export const delta = (d: Record<string, unknown>, finish: string | null = null) => ({
  object: "chat.completion.chunk",
  choices: [{ index: 0, delta: d, finish_reason: finish }],
});

export const usageChunk = (prompt: number, completion: number) => ({
  object: "chat.completion.chunk",
  choices: [],
  usage: { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion },
});

export function completion(content: string, usage = { prompt_tokens: 10, completion_tokens: 5 }): Response {
  return Response.json({
    object: "chat.completion",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    usage,
  });
}

export const apiError = (status: number, type = "server_error") =>
  Response.json({ error: { message: "nope", type, param: null, code: null } }, { status });

export type Call = { url: string; init: RequestInit; body: unknown };

/** Stubs global fetch with responses handed out in order, recording each request. */
export function fakeFetch(...responses: Array<Response | (() => Response | Promise<Response>)>) {
  const calls: Call[] = [];
  const mock = vi.fn(async (url: string | URL, init: RequestInit = {}) => {
    const raw = init.body;
    let body: unknown = raw;
    if (typeof raw === "string") {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }
    calls.push({ url: String(url), init, body });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected fetch ${String(url)}`);
    return typeof next === "function" ? next() : next;
  });
  vi.stubGlobal("fetch", mock);
  return { calls, mock };
}

/** Reads a /api/ai/chat response into its JSON events. */
export async function readEvents(res: Response): Promise<Array<Record<string, unknown>>> {
  const text = await res.text();
  return text
    .split("\n\n")
    .filter((block) => block.startsWith("data: "))
    .map((block) => JSON.parse(block.slice(6)));
}
