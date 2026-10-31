import { AiError, aiError, mapUpstream, toAiError } from "../errors.ts";
import type { ModelEvent, ModelRequest, WireAdapter } from "./types.ts";
import { parseSse } from "./wire.ts";

export type Quirks = { maxTokensField: "max_tokens" | "max_completion_tokens"; streamUsage: boolean };

export const DEFAULT_QUIRKS: Quirks = { maxTokensField: "max_tokens", streamUsage: true };

const MAX_BAD_CHUNKS_IN_A_ROW = 3;

type WireToolCallChunk = {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: unknown };
};

type WireUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number } | null;
};

type WireChoice = {
  delta?: { content?: string | null; tool_calls?: WireToolCallChunk[] };
  message?: { content?: string | null; tool_calls?: WireToolCallChunk[] };
  finish_reason?: string | null;
};

type WireChunk = { choices?: WireChoice[]; usage?: WireUsage | null; error?: unknown };

type CompletedCall = { id: string; name: string; arguments: string };

/**
 * Assembles streamed tool calls. Fragments of one call share its `index`;
 * parallel calls arrive under different indexes, in any interleaving.
 */
export class ToolCallAssembler {
  private calls = new Map<number, CompletedCall>();

  add(chunks: WireToolCallChunk[]): void {
    chunks.forEach((chunk, position) => {
      // Some compatible APIs omit `index` and send each call whole.
      let index = typeof chunk.index === "number" ? chunk.index : position;
      if (typeof chunk.index !== "number" && chunk.id) {
        const existing = [...this.calls.entries()].find(([, call]) => call.id === chunk.id);
        index = existing ? existing[0] : this.calls.size;
      }
      const call = this.calls.get(index) ?? { id: "", name: "", arguments: "" };
      if (chunk.id) call.id = chunk.id;
      if (chunk.function?.name) call.name = chunk.function.name;
      const args = chunk.function?.arguments;
      if (typeof args === "string") call.arguments += args;
      else if (args && typeof args === "object") call.arguments = JSON.stringify(args);
      this.calls.set(index, call);
    });
  }

  done(): CompletedCall[] {
    return [...this.calls.entries()]
      .sort(([a], [b]) => a - b)
      .map(([index, call]) => ({ ...call, id: call.id || `call_${index}` }))
      .filter((call) => call.name);
  }
}

function buildBody(req: ModelRequest, o: { stream: boolean; quirks: Quirks }): Record<string, unknown> {
  const messages: Record<string, unknown>[] = [];
  const system = req.system.map((part) => part.text).join("\n\n");
  if (system) messages.push({ role: "system", content: system });
  for (const msg of req.messages) {
    if (msg.role === "user") messages.push({ role: "user", content: msg.text });
    else if (msg.role === "tool") messages.push({ role: "tool", tool_call_id: msg.callId, content: msg.text });
    else {
      messages.push({
        role: "assistant",
        content: msg.text || null,
        ...(msg.toolCalls?.length
          ? { tool_calls: msg.toolCalls.map((call) => ({ id: call.id, type: "function", function: { name: call.name, arguments: call.argsJson } })) }
          : {}),
      });
    }
  }
  const body: Record<string, unknown> = { messages };
  if (req.tools.length) {
    body["tools"] = req.tools.map((tool) => ({
      type: "function",
      function: { name: tool.name, description: tool.description, parameters: tool.parameters },
    }));
    if (req.toolChoice === "auto") body["parallel_tool_calls"] = true;
    else body["tool_choice"] = "none";
  }
  if (o.stream) {
    body["stream"] = true;
    if (o.quirks.streamUsage) body["stream_options"] = { include_usage: true };
  }
  body[o.quirks.maxTokensField] = req.maxOutputTokens;
  return body;
}

type Reason = Extract<ModelEvent, { t: "done" }>["reason"];

function reasonOf(finish: string | null | undefined, sawToolCalls: boolean): Reason {
  if (finish === "length") return "length";
  if (finish === "content_filter") return "filter";
  if (finish === "tool_calls" || finish === "function_call" || sawToolCalls) return "tool";
  return "stop";
}

function usageEvent(usage: WireUsage): ModelEvent {
  return {
    t: "usage",
    inTokens: usage.prompt_tokens ?? 0,
    cacheReadTokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
    cacheWriteTokens: 0,
    outTokens: usage.completion_tokens ?? 0,
  };
}

function* finish(calls: ToolCallAssembler, usage: WireUsage | null, finishReason: string | null): Generator<ModelEvent> {
  const done = calls.done();
  for (const call of done) yield { t: "tool_call", id: call.id, name: call.name, argsJson: call.arguments || "{}" };
  if (usage) yield usageEvent(usage);
  yield { t: "done", reason: reasonOf(finishReason, done.length > 0) };
}

async function* wholeAnswer(res: Response): AsyncGenerator<ModelEvent> {
  let body: WireChunk;
  try {
    body = (await res.json()) as WireChunk;
  } catch {
    throw aiError("upstream_failed");
  }
  const choice = body.choices?.[0];
  if (!choice?.message) throw aiError("upstream_failed");
  if (choice.message.content) yield { t: "text", delta: choice.message.content };
  const calls = new ToolCallAssembler();
  if (choice.message.tool_calls) calls.add(choice.message.tool_calls);
  yield* finish(calls, body.usage ?? null, choice.finish_reason ?? null);
}

async function* events(res: Response, signal: AbortSignal): AsyncGenerator<ModelEvent> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const error = mapUpstream(res.status, text, "openai-compat");
    const after = Number(res.headers.get("retry-after"));
    throw new AiError(error.code, error.message, Number.isFinite(after) && after > 0 ? { ...error.detail, retryAfterMs: after * 1000 } : error.detail);
  }
  if (!res.body) throw aiError("upstream_failed");
  if (res.headers.get("content-type")?.includes("application/json")) {
    yield* wholeAnswer(res);
    return;
  }
  const calls = new ToolCallAssembler();
  let usage: WireUsage | null = null;
  let finishReason: string | null = null;
  let badChunks = 0;
  for await (const { data } of parseSse(res.body)) {
    if (signal.aborted) throw aiError("aborted");
    if (data === "[DONE]") break;
    let chunk: WireChunk;
    try {
      chunk = JSON.parse(data) as WireChunk;
      badChunks = 0;
    } catch {
      if (++badChunks >= MAX_BAD_CHUNKS_IN_A_ROW) throw aiError("upstream_failed");
      continue;
    }
    if (chunk.error) throw aiError("upstream_failed");
    if (chunk.usage) usage = chunk.usage;
    const choice = chunk.choices?.[0];
    if (!choice) continue;
    const delta = choice.delta ?? choice.message;
    if (delta?.content) yield { t: "text", delta: delta.content };
    if (delta?.tool_calls?.length) calls.add(delta.tool_calls);
    if (choice.finish_reason) finishReason = choice.finish_reason;
  }
  if (signal.aborted) throw aiError("aborted");
  yield* finish(calls, usage, finishReason);
}

async function* parse(res: Response, signal: AbortSignal): AsyncGenerator<ModelEvent> {
  try {
    yield* events(res, signal);
  } catch (error) {
    const { code, detail } = toAiError(error, signal);
    yield { t: "error", code, ...(detail?.status !== undefined ? { status: detail.status } : {}), ...(detail?.retryAfterMs !== undefined ? { retryAfterMs: detail.retryAfterMs } : {}) };
  }
}

export const openaiWire: WireAdapter = { family: "openai-compat", buildBody, parse };
