// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, delta, fakeFetch, readEvents, sseOf, usageChunk } from "@/lib/server/ai/__test__/upstream";

const search = vi.hoisted(() => ({
  web: vi.fn(),
  offers: vi.fn(),
}));

vi.mock("@/lib/server/search/serpapi", () => ({
  SearchError: class SearchError extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
  web: search.web,
  offers: search.offers,
}));

const TOKEN = "t".repeat(40);
let ip = 0;

async function load(vars: Record<string, string> = { META_API_KEY: "k", SERPAPI_KEY: "s" }) {
  vi.resetModules();
  vi.stubEnv("IYNK_AI_ENABLE", "1");
  vi.stubEnv("IYNK_SEARCH_ENABLE", "1");
  vi.stubEnv("IYNK_TRUST_PROXY", "1");
  vi.stubEnv("IYNK_SERVER_TOKEN", TOKEN);
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return (await import("./route")).POST;
}

function post(body: unknown, headers: Record<string, string> = {}) {
  ip += 1;
  return new Request("http://localhost/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-iynk-server-token": TOKEN, "x-real-ip": `10.0.0.${ip}`, ...headers },
    body: JSON.stringify(body),
  });
}

const ask = { messages: [{ role: "user", content: "My LED stays dark." }], locale: "es", lab: "board", itemId: "uno-r3", bench: "led1: anode->D13" };

const toolChunk = (index: number, id: string, name: string, args: string) =>
  delta({ tool_calls: [{ index, id, type: "function", function: { name, arguments: args } }] });

beforeEach(() => {
  search.web.mockReset();
  search.offers.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/ai/chat", () => {
  it("answers 401 with an empty message when the token is missing or wrong", async () => {
    const POST = await load();
    const missing = await POST(post(ask, { "x-iynk-server-token": "" }));
    const wrong = await POST(post(ask, { "x-iynk-server-token": "w".repeat(40) }));
    expect(missing.status).toBe(401);
    expect((await missing.json()).error).toEqual({ code: "unauthorized", message: "" });
    expect(wrong.status).toBe(401);
    expect((await wrong.json()).error).toEqual({ code: "unauthorized", message: "" });
  });

  it("answers 501 feature_disabled when the switch is off", async () => {
    const POST = await load({ META_API_KEY: "k", IYNK_AI_ENABLE: "0" });
    const res = await POST(post(ask));
    expect(res.status).toBe(501);
    expect((await res.json()).error.code).toBe("feature_disabled");
  });

  it("answers 501 feature_disabled when the switch is on and the key is missing", async () => {
    const POST = await load({});
    const res = await POST(post(ask));
    expect(res.status).toBe(501);
    expect((await res.json()).error).toMatchObject({ code: "feature_disabled", message: expect.stringMatching(/turned off/) });
  });

  it("validates the body and the tool-call history", async () => {
    const POST = await load();
    expect((await POST(post({ ...ask, locale: "xx" }))).status).toBe(400);
    const orphan = { ...ask, messages: [{ role: "tool", tool_call_id: "c1", content: "{}" }] };
    expect((await POST(post(orphan))).status).toBe(400);
    const unanswered = {
      ...ask,
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "", tool_calls: [{ id: "c1", name: "highlight_part", args: { partId: "led1" } }] },
        { role: "user", content: "and?" },
      ],
    };
    expect((await POST(post(unanswered))).status).toBe(400);
    const req = new Request("http://localhost/api/ai/chat", { method: "POST", headers: { "x-iynk-server-token": TOKEN }, body: JSON.stringify(ask) });
    expect((await POST(req)).status).toBe(415);
  });

  it("refuses other origins", async () => {
    const POST = await load();
    const res = await POST(post(ask, { origin: "https://elsewhere.example", host: "localhost" }));
    expect(res.status).toBe(403);
  });

  it("streams text and usage, with the fixed rules first and the learner's context second", async () => {
    const { calls } = fakeFetch(sseOf([delta({ content: "¿Qué " }), delta({ content: "pata va a GND?" }, "stop"), usageChunk(100, 9)]));
    const POST = await load();
    const res = await POST(post(ask));
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(await readEvents(res)).toEqual([
      { type: "text", delta: "¿Qué " },
      { type: "text", delta: "pata va a GND?" },
      { type: "done", usage: { provider: "meta", inTokens: 100, outTokens: 9 } },
    ]);
    const body = calls[0].body as { messages: Array<{ role: string; content: string }>; tools: Array<{ function: { name: string } }> };
    expect(body.messages[0].content).toContain("You are the iynk lab partner");
    expect(body.messages[1].content).toContain("Spanish (es)");
    expect(body.messages[1].content).toContain("led1: anode->D13");
    expect(body.messages[2]).toEqual({ role: "user", content: "My LED stays dark." });
    expect(body.tools.map((t) => t.function.name)).toContain("search_datasheet");
  });

  it("leaves the search tools out when SerpApi is not set up", async () => {
    const { calls } = fakeFetch(sseOf([delta({ content: "ok" }, "stop")]));
    const POST = await load({ META_API_KEY: "k" });
    await readEvents(await POST(post(ask)));
    const names = (calls[0].body as { tools: Array<{ function: { name: string } }> }).tools.map((t) => t.function.name);
    expect(names).not.toContain("search_datasheet");
    expect(names).toContain("highlight_part");
  });

  it("runs server tools in a loop, emits citations and feeds results back", async () => {
    search.web.mockResolvedValue({
      results: [{ title: "LED datasheet", url: "https://ds.example/led", snippet: "Vf 2.0 V" }],
      extracts: [{ url: "https://ds.example/led", title: "LED datasheet", text: "Forward voltage 2.0 V at 20 mA" }],
    });
    const { calls } = fakeFetch(
      sseOf([delta({ content: "Let me check." }), toolChunk(0, "c1", "search_datasheet", '{"query":"red LED forward voltage"}'), delta({}, "tool_calls"), usageChunk(50, 5)]),
      sseOf([delta({ content: "About 2 V, per the datasheet." }, "stop"), usageChunk(80, 7)]),
    );
    const POST = await load();
    const events = await readEvents(await POST(post(ask)));
    expect(search.web).toHaveBeenCalledWith({ q: "red LED forward voltage", extract: true }, expect.any(AbortSignal));
    expect(events).toEqual([
      { type: "text", delta: "Let me check." },
      { type: "citation", url: "https://ds.example/led", title: "LED datasheet", snippet: "Vf 2.0 V" },
      { type: "text", delta: "\n\n" },
      { type: "text", delta: "About 2 V, per the datasheet." },
      { type: "done", usage: { provider: "meta", inTokens: 130, outTokens: 12 } },
    ]);
    const second = calls[1].body as { messages: Array<Record<string, unknown>> };
    expect(second.messages.at(-2)).toEqual({
      role: "assistant",
      content: "Let me check.",
      tool_calls: [{ id: "c1", type: "function", function: { name: "search_datasheet", arguments: '{"query":"red LED forward voltage"}' } }],
    });
    expect(second.messages.at(-1)).toMatchObject({ role: "tool", tool_call_id: "c1" });
    expect(String(second.messages.at(-1)?.content)).toContain("Forward voltage 2.0 V");
  });

  it("sends invalid server-tool arguments back to the model as the tool result", async () => {
    const { calls } = fakeFetch(
      sseOf([toolChunk(0, "c1", "search_datasheet", '{"query":"x"}'), delta({}, "tool_calls")]),
      sseOf([delta({ content: "Sorry." }, "stop")]),
    );
    const POST = await load();
    await readEvents(await POST(post(ask)));
    expect(search.web).not.toHaveBeenCalled();
    const result = (calls[1].body as { messages: Array<{ role: string; content: string }> }).messages.at(-1);
    expect(result?.role).toBe("tool");
    expect(result?.content).toContain("search_datasheet");
  });

  it("passes client tools through as tool_call events and ends the turn", async () => {
    const { calls } = fakeFetch(
      sseOf([
        toolChunk(0, "h1", "highlight_part", '{"partId":"led1","note":"Mira la pata larga"}'),
        toolChunk(1, "s1", "search_datasheet", '{"query":"LED polarity"}'),
        delta({}, "tool_calls"),
        usageChunk(60, 6),
      ]),
    );
    const POST = await load();
    const events = await readEvents(await POST(post(ask)));
    expect(events).toEqual([
      { type: "tool_call", id: "h1", name: "highlight_part", args: { partId: "led1", note: "Mira la pata larga" } },
      { type: "done", usage: { provider: "meta", inTokens: 60, outTokens: 6 } },
    ]);
    expect(calls).toHaveLength(1);
    expect(search.web).not.toHaveBeenCalled();
  });

  it("maps a replayed assistant turn with tool calls to the wire format", async () => {
    const { calls } = fakeFetch(sseOf([delta({ content: "Great." }, "stop")]));
    const POST = await load();
    const history = {
      ...ask,
      messages: [
        { role: "user", content: "Fix it" },
        { role: "assistant", content: "", tool_calls: [{ id: "p1", name: "propose_change", args: { kind: "code", reason: "r", patch: { replace: "x" } } }] },
        { role: "tool", tool_call_id: "p1", content: '{"accepted":true}' },
      ],
    };
    await readEvents(await POST(post(history)));
    const messages = (calls[0].body as { messages: Array<Record<string, unknown>> }).messages;
    expect(messages[3]).toEqual({
      role: "assistant",
      content: null,
      tool_calls: [{ id: "p1", type: "function", function: { name: "propose_change", arguments: '{"kind":"code","reason":"r","patch":{"replace":"x"}}' } }],
    });
    expect(messages[4]).toEqual({ role: "tool", tool_call_id: "p1", content: '{"accepted":true}' });
  });

  it("stops after four rounds; the last round gets no tools", async () => {
    search.web.mockResolvedValue({ results: [] });
    const again = () => sseOf([toolChunk(0, `c${Math.random()}`, "search_datasheet", '{"query":"again and again"}'), delta({}, "tool_calls")]);
    const { calls } = fakeFetch(again(), again(), again(), sseOf([delta({ content: "Here is what I know." }, "stop")]));
    const POST = await load();
    const events = await readEvents(await POST(post(ask)));
    expect(calls).toHaveLength(4);
    expect(calls[2].body).toHaveProperty("tools");
    expect(calls[3].body).not.toHaveProperty("tools");
    expect(events.at(-1)).toMatchObject({ type: "done" });
  });

  it("ends the stream with an error event when the upstream fails", async () => {
    fakeFetch(apiError(500), apiError(500));
    const POST = await load();
    const res = await POST(post(ask));
    expect(res.status).toBe(200);
    expect(await readEvents(res)).toEqual([{ type: "error", code: "upstream_failed" }]);
  });

  it("rate-limits each caller", async () => {
    const POST = await load({});
    const req = () =>
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-iynk-server-token": TOKEN, "x-real-ip": "10.9.9.9" },
        body: JSON.stringify(ask),
      });
    // Without a key every call is refused before the limiter, so set one up and fail upstream instead.
    expect((await POST(req())).status).toBe(501);
    const keyed = await load({ META_API_KEY: "k" });
    fakeFetch(...Array.from({ length: 40 }, () => apiError(400)));
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) statuses.push((await keyed(req())).status);
    expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(statuses[20]).toBe(429);
  });
});
