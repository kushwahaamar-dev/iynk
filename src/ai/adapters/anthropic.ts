import { AiError, aiError, mapUpstream, toAiError } from "../errors.ts";
import type { Msg, ModelEvent, ModelRequest, WireAdapter } from "./types.ts";
import { parseSse } from "./wire.ts";

const MAX_CACHE_BREAKPOINTS = 4;

type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

type WireMessage = { role: "user" | "assistant"; content: string | Block[] };

function parseArgs(argsJson: string): unknown {
  try {
    return JSON.parse(argsJson);
  } catch {
    return {};
  }
}

function toMessages(messages: Msg[]): WireMessage[] {
  const out: WireMessage[] = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      out.push({ role: "user", content: msg.text });
    } else if (msg.role === "tool") {
      const result: Block = { type: "tool_result", tool_use_id: msg.callId, content: msg.text };
      const last = out[out.length - 1];
      if (last && last.role === "user" && Array.isArray(last.content) && last.content.every((block) => block.type === "tool_result")) {
        last.content.push(result);
      } else {
        out.push({ role: "user", content: [result] });
      }
    } else {
      const content: Block[] = [];
      if (msg.text) content.push({ type: "text", text: msg.text });
      for (const call of msg.toolCalls ?? []) content.push({ type: "tool_use", id: call.id, name: call.name, input: parseArgs(call.argsJson) });
      out.push({ role: "assistant", content: content.length ? content : msg.text });
    }
  }
  return out;
}

function buildBody(req: ModelRequest, o: { stream: boolean }): Record<string, unknown> {
  // Anthropic allows four breakpoints: when there are more, the earliest ones go.
  let surplus = req.system.filter((part) => part.cacheBreakpoint).length - MAX_CACHE_BREAKPOINTS;
  const system = req.system.map((part) => {
    const marked = part.cacheBreakpoint && surplus-- <= 0;
    return { type: "text", text: part.text, ...(marked ? { cache_control: { type: "ephemeral" } } : {}) };
  });
  const body: Record<string, unknown> = {
    max_tokens: req.maxOutputTokens,
    messages: toMessages(req.messages),
  };
  if (system.length) body["system"] = system;
  if (req.tools.length) {
    body["tools"] = req.tools.map((tool) => ({ name: tool.name, description: tool.description, input_schema: tool.parameters }));
    body["tool_choice"] = { type: req.toolChoice === "auto" ? "auto" : "none" };
  }
  if (o.stream) body["stream"] = true;
  return body;
}

type Reason = Extract<ModelEvent, { t: "done" }>["reason"];

function reasonOf(stop: string | null | undefined): Reason {
  if (stop === "tool_use") return "tool";
  if (stop === "max_tokens") return "length";
  if (stop === "refusal") return "filter";
  return "stop";
}

type WireUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

function usageEvent(usage: WireUsage): ModelEvent {
  return {
    t: "usage",
    inTokens: usage.input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    outTokens: usage.output_tokens ?? 0,
  };
}

type WireContent = { type?: string; text?: string; id?: string; name?: string; input?: unknown };

type WireEvent = {
  type?: string;
  index?: number;
  message?: { usage?: WireUsage; content?: WireContent[]; stop_reason?: string | null };
  content_block?: WireContent;
  delta?: { type?: string; text?: string; partial_json?: string; stop_reason?: string | null };
  usage?: WireUsage;
  error?: { type?: string; message?: string };
};

function streamError(error: WireEvent["error"]): AiError {
  switch (error?.type) {
    case "overloaded_error":
    case "rate_limit_error":
      return aiError("upstream_busy");
    case "authentication_error":
    case "permission_error":
      return aiError("auth");
    case "not_found_error":
      return aiError("bad_model");
    case "timeout_error":
      return aiError("upstream_timeout");
    case "invalid_request_error":
      return mapUpstream(400, `${error.message ?? ""}`, "anthropic");
    default:
      return aiError("upstream_failed");
  }
}

async function* wholeAnswer(res: Response): AsyncGenerator<ModelEvent> {
  let body: NonNullable<WireEvent["message"]>;
  try {
    body = (await res.json()) as NonNullable<WireEvent["message"]>;
  } catch {
    throw aiError("upstream_failed");
  }
  let sawTool = false;
  for (const block of body.content ?? []) {
    if (block.type === "text" && block.text) yield { t: "text", delta: block.text };
    if (block.type === "tool_use" && block.id && block.name) {
      sawTool = true;
      yield { t: "tool_call", id: block.id, name: block.name, argsJson: JSON.stringify(block.input ?? {}) };
    }
  }
  if (body.usage) yield usageEvent(body.usage);
  yield { t: "done", reason: sawTool && !body.stop_reason ? "tool" : reasonOf(body.stop_reason) };
}

async function* events(res: Response, signal: AbortSignal): AsyncGenerator<ModelEvent> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const error = mapUpstream(res.status, text, "anthropic");
    const after = Number(res.headers.get("retry-after"));
    throw new AiError(error.code, error.message, Number.isFinite(after) && after > 0 ? { ...error.detail, retryAfterMs: after * 1000 } : error.detail);
  }
  if (!res.body) throw aiError("upstream_failed");
  if (res.headers.get("content-type")?.includes("application/json")) {
    yield* wholeAnswer(res);
    return;
  }
  const tools = new Map<number, { id: string; name: string; json: string }>();
  const usage: WireUsage = {};
  let stopReason: string | null = null;
  let sawUsage = false;
  let finished = false;
  for await (const { data } of parseSse(res.body)) {
    if (signal.aborted) throw aiError("aborted");
    let event: WireEvent;
    try {
      event = JSON.parse(data) as WireEvent;
    } catch {
      throw aiError("upstream_failed");
    }
    switch (event.type) {
      case "message_start":
        if (event.message?.usage) {
          Object.assign(usage, event.message.usage);
          sawUsage = true;
        }
        break;
      case "content_block_start": {
        const block = event.content_block;
        if (block?.type === "tool_use" && typeof event.index === "number") {
          tools.set(event.index, { id: block.id ?? "", name: block.name ?? "", json: "" });
        } else if (block?.type === "text" && block.text) {
          yield { t: "text", delta: block.text };
        }
        break;
      }
      case "content_block_delta":
        if (event.delta?.type === "text_delta" && event.delta.text) {
          yield { t: "text", delta: event.delta.text };
        } else if (event.delta?.type === "input_json_delta" && typeof event.index === "number") {
          const tool = tools.get(event.index);
          if (tool) tool.json += event.delta.partial_json ?? "";
        }
        break;
      case "content_block_stop": {
        const tool = typeof event.index === "number" ? tools.get(event.index) : undefined;
        if (tool && typeof event.index === "number") {
          tools.delete(event.index);
          yield { t: "tool_call", id: tool.id, name: tool.name, argsJson: tool.json || "{}" };
        }
        break;
      }
      case "message_delta":
        stopReason = event.delta?.stop_reason ?? stopReason;
        if (event.usage) {
          Object.assign(usage, Object.fromEntries(Object.entries(event.usage).filter(([, value]) => value !== null && value !== undefined)));
          sawUsage = true;
        }
        if (sawUsage) yield usageEvent(usage);
        break;
      case "message_stop":
        finished = true;
        break;
      case "error":
        throw streamError(event.error);
      default:
        break;
    }
    if (finished) break;
  }
  if (signal.aborted) throw aiError("aborted");
  if (!finished) throw aiError("upstream_failed");
  yield { t: "done", reason: reasonOf(stopReason) };
}

async function* parse(res: Response, signal: AbortSignal): AsyncGenerator<ModelEvent> {
  try {
    yield* events(res, signal);
  } catch (error) {
    const { code, detail } = toAiError(error, signal);
    yield { t: "error", code, ...(detail?.status !== undefined ? { status: detail.status } : {}), ...(detail?.retryAfterMs !== undefined ? { retryAfterMs: detail.retryAfterMs } : {}) };
  }
}

export const anthropicWire: WireAdapter = { family: "anthropic", buildBody, parse };
