// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiError, completion, delta, fakeFetch, sse, sseOf, usageChunk } from "./__test__/upstream";

async function load(vars: Record<string, string> = { META_API_KEY: "meta-key" }) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return import("./provider");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function drain<T>(events: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const e of events) out.push(e);
  return out;
}

const messages = [{ role: "user" as const, content: "Why won't my LED light?" }];

describe("chat streaming", () => {
  it("streams text deltas and reports usage from the final chunk", async () => {
    const { calls } = fakeFetch(sseOf([delta({ role: "assistant", content: "Check " }), delta({ content: "the polarity." }, "stop"), usageChunk(42, 7)]));
    const { chat } = await load();
    const events = await drain(chat({ messages, stream: true, maxTokens: 500, cacheKey: "k", user: "u" }));
    expect(events).toEqual([
      { type: "text", delta: "Check " },
      { type: "text", delta: "the polarity." },
      { type: "done", finishReason: "stop", usage: { provider: "meta", inTokens: 42, outTokens: 7, cachedTokens: 0 } },
    ]);
    expect(calls[0].url).toBe("https://api.meta.ai/v1/chat/completions");
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe("Bearer meta-key");
    expect(calls[0].body).toMatchObject({
      model: "muse-spark-1.3",
      stream: true,
      stream_options: { include_usage: true },
      max_completion_tokens: 500,
      prompt_cache_key: "k",
      safety_identifier: "u",
    });
  });

  it("assembles parallel tool calls whose fragments interleave across chunks", async () => {
    fakeFetch(
      sse([
        `data: ${JSON.stringify(delta({ tool_calls: [{ index: 0, id: "call_a", type: "function", function: { name: "highlight_part", arguments: "" } }] }))}\n\n`,
        `data: ${JSON.stringify(delta({ tool_calls: [{ index: 0, function: { arguments: '{"partId":' } }] }))}\n\n`,
        `data: ${JSON.stringify(delta({ tool_calls: [{ index: 1, id: "call_b", type: "function", function: { name: "search_datasheet", arguments: '{"que' } }] }))}\n`,
        `\ndata: ${JSON.stringify(delta({ tool_calls: [{ index: 0, function: { arguments: '"led1"}' } }] }))}\n\n`,
        `data: ${JSON.stringify(delta({ tool_calls: [{ index: 1, function: { arguments: 'ry":"LED forward voltage"}' } }] }, "tool_calls"))}\n\n`,
        "data: [DONE]\n\n",
      ]),
    );
    const { chat } = await load();
    const events = await drain(chat({ messages, stream: true }));
    expect(events.filter((e) => e.type === "tool_call")).toEqual([
      { type: "tool_call", call: { id: "call_a", name: "highlight_part", arguments: '{"partId":"led1"}' } },
      { type: "tool_call", call: { id: "call_b", name: "search_datasheet", arguments: '{"query":"LED forward voltage"}' } },
    ]);
    expect(events.at(-1)).toMatchObject({ type: "done", finishReason: "tool_calls" });
  });

  it("accepts whole tool calls without an index, as some compatible APIs send them", async () => {
    fakeFetch(
      sseOf([
        delta({ tool_calls: [{ id: "x1", function: { name: "open_panel", arguments: { tab: "real" } } }] }),
        delta({ tool_calls: [{ id: "x2", function: { name: "open_panel", arguments: '{"tab":"together"}' } }] }, "tool_calls"),
      ]),
    );
    const { chat } = await load();
    const calls = (await drain(chat({ messages, stream: true }))).filter((e) => e.type === "tool_call");
    expect(calls.map((e) => e.type === "tool_call" && e.call)).toEqual([
      { id: "x1", name: "open_panel", arguments: '{"tab":"real"}' },
      { id: "x2", name: "open_panel", arguments: '{"tab":"together"}' },
    ]);
  });

  it("turns an error chunk mid-stream into an AiError", async () => {
    fakeFetch(sse([`data: ${JSON.stringify(delta({ content: "Hi" }))}\n\n`, 'data: {"error":{"type":"server_error","code":"server_shutting_down"}}\n\n']));
    const { chat, AiError } = await load();
    const seen: unknown[] = [];
    await expect(
      (async () => {
        for await (const e of chat({ messages, stream: true })) seen.push(e);
      })(),
    ).rejects.toBeInstanceOf(AiError);
    expect(seen).toEqual([{ type: "text", delta: "Hi" }]);
  });

  it("retries once on a 5xx, then succeeds", async () => {
    const { calls } = fakeFetch(apiError(503), sseOf([delta({ content: "ok" }, "stop")]));
    const { chat } = await load();
    const events = await drain(chat({ messages, stream: true }));
    expect(calls).toHaveLength(2);
    expect(events[0]).toEqual({ type: "text", delta: "ok" });
  });

  it("does not retry a 400 and never leaks the upstream message", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { calls } = fakeFetch(apiError(400, "invalid_request_error"));
    const { chat, AiError } = await load();
    const error = await drain(chat({ messages, stream: true })).catch((e: unknown) => e);
    expect(calls).toHaveLength(1);
    expect(error).toBeInstanceOf(AiError);
    expect((error as InstanceType<typeof AiError>).code).toBe("upstream_failed");
    expect((error as Error).message).not.toContain("nope");
  });

  it("reports a 429 that persists after the retry as upstream_busy", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fakeFetch(apiError(429, "rate_limit_error"), apiError(429, "rate_limit_error"));
    const { chat } = await load();
    const error = await drain(chat({ messages, stream: true })).catch((e: { code: string }) => e);
    expect(error).toMatchObject({ code: "upstream_busy", status: 502 });
  });

  it("falls back to Gemini's OpenAI-compatible endpoint when Meta keeps failing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { calls } = fakeFetch(apiError(500), apiError(500), sseOf([delta({ content: "hola" }, "stop"), usageChunk(3, 1)]));
    const { chat } = await load({ META_API_KEY: "m", GEMINI_API_KEY: "g" });
    const events = await drain(chat({ messages, stream: true, maxTokens: 100, user: "u", cacheKey: "k" }));
    expect(calls[2].url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect((calls[2].init.headers as Record<string, string>).authorization).toBe("Bearer g");
    expect(calls[2].body).toMatchObject({ model: "gemini-3.5-flash", max_tokens: 100 });
    expect(calls[2].body).not.toHaveProperty("safety_identifier");
    expect(calls[2].body).not.toHaveProperty("prompt_cache_key");
    expect(events.at(-1)).toMatchObject({ type: "done", usage: { provider: "gemini", inTokens: 3, outTokens: 1 } });
  });

  it("uses Gemini alone when only its key is set", async () => {
    const { calls } = fakeFetch(completion("ok"));
    const { chat } = await load({ GEMINI_API_KEY: "g" });
    const result = await chat({ messages });
    expect(calls[0].url).toContain("generativelanguage.googleapis.com");
    expect(result.usage.provider).toBe("gemini");
  });

  it("refuses with not_configured when no key is set", async () => {
    const { mock } = fakeFetch();
    const { chat } = await load({});
    await expect(chat({ messages })).rejects.toMatchObject({ code: "not_configured", status: 503 });
    await expect(drain(chat({ messages, stream: true }))).rejects.toMatchObject({ code: "not_configured" });
    expect(mock).not.toHaveBeenCalled();
  });

  it("times out a call that never answers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason))),
      ),
    );
    const { chat } = await load();
    await expect(chat({ messages, timeoutMs: 20 })).rejects.toMatchObject({ code: "upstream_timeout", status: 504 });
  });

  it("stops when the caller goes away, without retrying", async () => {
    const controller = new AbortController();
    const mock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason))),
    );
    vi.stubGlobal("fetch", mock);
    const { chat } = await load();
    const pending = chat({ messages, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "aborted" });
    expect(mock).toHaveBeenCalledTimes(1);
  });
});

describe("chat (non-streaming) and chatJson", () => {
  it("returns text, tool calls and usage", async () => {
    fakeFetch(
      Response.json({
        choices: [
          {
            message: { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "find_parts", arguments: '{"parts":["SG90"]}' } }] },
            finish_reason: "tool_calls",
          },
        ],
        usage: { prompt_tokens: 9, completion_tokens: 4, prompt_tokens_details: { cached_tokens: 8 } },
      }),
    );
    const { chat } = await load();
    expect(await chat({ messages })).toEqual({
      text: "",
      toolCalls: [{ id: "c1", name: "find_parts", arguments: '{"parts":["SG90"]}' }],
      finishReason: "tool_calls",
      usage: { provider: "meta", inTokens: 9, outTokens: 4, cachedTokens: 8 },
    });
  });

  it("asks for a JSON schema and validates the reply", async () => {
    const { calls } = fakeFetch(completion('{"answer":"42"}'));
    const { chatJson } = await load();
    const { data } = await chatJson(z.object({ answer: z.string() }), "probe", { messages, reasoning: "low" });
    expect(data).toEqual({ answer: "42" });
    expect(calls[0].body).toMatchObject({
      reasoning_effort: "low",
      response_format: { type: "json_schema", json_schema: { name: "probe", schema: { type: "object" } } },
    });
    expect(JSON.stringify(calls[0].body)).not.toContain("$schema");
  });

  it("rejects a reply that is not the asked-for JSON", async () => {
    fakeFetch(completion("Sure! Here you go."), completion('{"answer":3}'));
    const { chatJson } = await load();
    const schema = z.object({ answer: z.string() });
    await expect(chatJson(schema, "probe", { messages })).rejects.toMatchObject({ code: "bad_output" });
    await expect(chatJson(schema, "probe", { messages })).rejects.toMatchObject({ code: "bad_output" });
  });
});

describe("generateImage", () => {
  it("posts to /images/generations and returns a data URL", async () => {
    const { calls } = fakeFetch(Response.json({ created: 1, data: [{ b64_json: "AAAA" }], output_format: "webp" }));
    const { generateImage } = await load();
    expect(await generateImage({ prompt: "a red LED" })).toEqual({ dataUrl: "data:image/webp;base64,AAAA" });
    expect(calls[0].url).toBe("https://api.meta.ai/v1/images/generations");
    expect(calls[0].body).toMatchObject({ model: "muse-image-1.0", prompt: "a red LED", n: 1, response_format: "b64_json" });
  });

  it("downloads the image when the API answers with a URL", async () => {
    fakeFetch(
      Response.json({ created: 1, data: [{ url: "https://cdn.example/x.png" }] }),
      new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/png" } }),
    );
    const { generateImage } = await load();
    expect(await generateImage({ prompt: "x" })).toEqual({ dataUrl: "data:image/png;base64,AQID" });
  });
});

describe("transcribeWav", () => {
  it("sends the documented multipart body: a JSON request part and a WAV audio part", async () => {
    const { calls } = fakeFetch(Response.json({ sessionId: "s", transcript: " hola ", audioDurationMs: 900, turns: [] }));
    const { transcribeWav } = await load();
    const result = await transcribeWav({ wav: new Uint8Array([82, 73, 70, 70]), languages: ["Spanish"] });
    expect(result).toEqual({ text: "hola", durationMs: 900 });
    expect(calls[0].url).toBe("https://api.meta.ai/v1/asr/transcribe");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["content-type"]).toMatch(/^multipart\/form-data; boundary=/);
    const body = Buffer.from(calls[0].init.body as Uint8Array).toString("latin1");
    expect(body).toContain('Content-Disposition: form-data; name="request"\r\nContent-Type: application/json');
    expect(body).toContain('"model":"muse-voice-transcribe-1.0","audioEncoding":"WAV","mode":"PUSH_TO_TALK","languageBias":["Spanish"]');
    expect(body).toContain('name="audio"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\nRIFF');
  });
});
