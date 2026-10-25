import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/server/env";
import { withTimeout } from "@/lib/server/http";
import { parseSse } from "./sse";
import type { AiProvider } from "./types";

/**
 * The Meta Model API gateway (HX-CONTRACT H4; endpoints and fields in docs/hacktx/AI.md).
 * Chat goes to the OpenAI-compatible /chat/completions of Muse Spark, and to
 * Gemini's OpenAI-compatible endpoint only when GEMINI_API_KEY is set and Meta
 * failed (or has no key). Every call has a timeout and retries once on
 * 429/5xx/network errors. Errors are AiError codes; upstream detail stays in
 * the server log and never reaches the client.
 */

export const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

export type AiErrorCode =
  | "not_configured"
  | "upstream_failed"
  | "upstream_timeout"
  | "upstream_busy"
  | "bad_output"
  | "aborted";

export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    readonly detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "AiError";
  }

  /** The HTTP status a route answers with for this error. */
  get status(): number {
    switch (this.code) {
      case "not_configured":
        return 503;
      case "upstream_timeout":
        return 504;
      case "aborted":
        return 499;
      default:
        return 502;
    }
  }
}

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } }
  | { type: "input_audio"; input_audio: { data: string; format: "wav" | "mp3" } };

export type WireToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export type ProviderMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | ContentPart[] }
  | { role: "assistant"; content: string | null; tool_calls?: WireToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolSpec = { name: string; description: string; parameters: Record<string, unknown> };

export type Reasoning = "minimal" | "low" | "medium" | "high";

export type ChatOptions = {
  messages: ProviderMessage[];
  tools?: readonly ToolSpec[];
  /** Constrains the reply to this JSON Schema (response_format json_schema). */
  json?: { name: string; schema: Record<string, unknown> };
  maxTokens?: number;
  reasoning?: Reasoning;
  /** The caller's request signal, so a closed tab stops the upstream call. */
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Groups requests that share a long prefix (prompt_cache_key). */
  cacheKey?: string;
  /** A hashed, stable end-user id (safety_identifier); see safetyId(). */
  user?: string;
};

export type Usage = { provider: AiProvider; inTokens: number; outTokens: number; cachedTokens: number };

export type ToolCallOut = { id: string; name: string; arguments: string };

export type ChatResult = {
  text: string;
  toolCalls: ToolCallOut[];
  finishReason: string;
  usage: Usage;
};

export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool_call"; call: ToolCallOut }
  | { type: "done"; finishReason: string; usage: Usage };

type Target = { provider: AiProvider; base: string; key: string; model: string };

function chatTargets(): Target[] {
  const out: Target[] = [];
  if (env.META_API_KEY) out.push({ provider: "meta", base: env.META_API_BASE, key: env.META_API_KEY, model: env.META_MODEL });
  if (env.GEMINI_API_KEY) {
    out.push({ provider: "gemini", base: GEMINI_BASE, key: env.GEMINI_API_KEY, model: env.GEMINI_MODEL });
  }
  return out;
}

/** A privacy-preserving end-user id for Meta's safety_identifier: a salted hash, never the raw value. */
export function safetyId(value: string): string {
  return createHash("sha256").update(`iynk:${value}`).digest("hex").slice(0, 32);
}

function log(provider: string, what: string) {
  console.warn(`[ai] ${provider}: ${what}`);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AiError("aborted"));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new AiError("aborted"));
      },
      { once: true },
    );
  });
}

function retryDelay(res?: Response): number {
  const after = Number(res?.headers.get("retry-after"));
  if (Number.isFinite(after) && after > 0 && after <= 4) return after * 1000;
  return 250 + Math.random() * 500;
}

/** Reads a short, safe description of an upstream error body for the server log. */
async function upstreamDetail(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { type?: unknown; code?: unknown; param?: unknown } };
    const e = body.error ?? {};
    return [res.status, e.type, e.code, e.param && `param=${String(e.param)}`].filter(Boolean).join(" ");
  } catch {
    return String(res.status);
  }
}

function toAiError(error: unknown, signal?: AbortSignal): AiError {
  if (error instanceof AiError) return error;
  if (signal?.aborted) return new AiError("aborted");
  if (error instanceof Error && error.name === "TimeoutError") return new AiError("upstream_timeout");
  return new AiError("upstream_failed", error instanceof Error ? error.name : "unknown");
}

/**
 * POSTs to an upstream endpoint with a timeout, retrying once on 429, 5xx and
 * network errors. Resolves with the OK response, whose body the caller reads
 * under the same timeout.
 */
export async function upstream(
  provider: string,
  url: string,
  init: { key: string; body: BodyInit; contentType?: string; accept?: string; signal?: AbortSignal; timeoutMs: number },
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const signal = withTimeout(init.timeoutMs, init.signal);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${init.key}`,
          ...(init.contentType ? { "content-type": init.contentType } : {}),
          accept: init.accept ?? "application/json",
        },
        body: init.body,
        signal,
      });
    } catch (error) {
      const e = toAiError(error, init.signal);
      if (e.code === "upstream_failed" && attempt === 0) {
        log(provider, `network error (${e.detail}), retrying`);
        await sleep(retryDelay(), init.signal);
        continue;
      }
      throw e;
    }
    if (res.ok) return res;
    const detail = await upstreamDetail(res);
    if ((res.status === 429 || res.status >= 500) && attempt === 0) {
      log(provider, `${detail}, retrying`);
      await sleep(retryDelay(res), init.signal);
      continue;
    }
    log(provider, detail);
    throw new AiError(res.status === 429 ? "upstream_busy" : "upstream_failed", detail);
  }
}

function requestBody(target: Target, opts: ChatOptions, stream: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = { model: target.model, messages: opts.messages };
  if (opts.tools?.length) {
    body.tools = opts.tools.map((tool) => ({ type: "function", function: tool }));
    body.parallel_tool_calls = true;
  }
  if (opts.json) body.response_format = { type: "json_schema", json_schema: opts.json };
  if (opts.reasoning) body.reasoning_effort = opts.reasoning;
  if (stream) {
    body.stream = true;
    body.stream_options = { include_usage: true };
  }
  if (target.provider === "meta") {
    if (opts.maxTokens) body.max_completion_tokens = opts.maxTokens;
    if (opts.cacheKey) body.prompt_cache_key = opts.cacheKey;
    if (opts.user) body.safety_identifier = opts.user;
  } else if (opts.maxTokens) {
    body.max_tokens = opts.maxTokens;
  }
  return body;
}

type WireUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number } | null;
};

function usageOf(provider: AiProvider, usage: WireUsage | null | undefined): Usage {
  return {
    provider,
    inTokens: usage?.prompt_tokens ?? 0,
    outTokens: usage?.completion_tokens ?? 0,
    cachedTokens: usage?.prompt_tokens_details?.cached_tokens ?? 0,
  };
}

type WireToolCallChunk = {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: unknown };
};

/**
 * Assembles streamed tool calls. Fragments of one call share its `index`;
 * parallel calls arrive under different indexes, in any interleaving.
 */
export class ToolCallAssembler {
  private calls = new Map<number, { id: string; name: string; arguments: string }>();

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

  done(): ToolCallOut[] {
    return [...this.calls.entries()]
      .sort(([a], [b]) => a - b)
      .map(([index, call]) => ({ ...call, id: call.id || `call_${index}` }))
      .filter((call) => call.name);
  }
}

type WireChoice = {
  delta?: { content?: string | null; tool_calls?: WireToolCallChunk[] };
  message?: { content?: string | null; tool_calls?: WireToolCallChunk[] };
  finish_reason?: string | null;
};

type WireChunk = { choices?: WireChoice[]; usage?: WireUsage | null; error?: { type?: string; code?: string } };

async function* streamOnce(target: Target, opts: ChatOptions): AsyncGenerator<StreamEvent> {
  const res = await upstream(target.provider, `${target.base}/chat/completions`, {
    key: target.key,
    body: JSON.stringify(requestBody(target, opts, true)),
    contentType: "application/json",
    accept: "text/event-stream",
    signal: opts.signal,
    timeoutMs: opts.timeoutMs ?? 90_000,
  });
  if (!res.body) throw new AiError("upstream_failed", "empty body");
  const calls = new ToolCallAssembler();
  let usage: WireUsage | null | undefined;
  let finishReason = "stop";
  try {
    for await (const { data } of parseSse(res.body)) {
      if (data === "[DONE]") break;
      let chunk: WireChunk;
      try {
        chunk = JSON.parse(data) as WireChunk;
      } catch {
        log(target.provider, "skipped a malformed stream chunk");
        continue;
      }
      if (chunk.error) {
        throw new AiError("upstream_failed", `stream error ${chunk.error.type ?? ""} ${chunk.error.code ?? ""}`.trim());
      }
      if (chunk.usage) usage = chunk.usage;
      const choice = chunk.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta ?? choice.message;
      if (delta?.content) yield { type: "text", delta: delta.content };
      if (delta?.tool_calls?.length) calls.add(delta.tool_calls);
      if (choice.finish_reason) finishReason = choice.finish_reason;
    }
  } catch (error) {
    throw toAiError(error, opts.signal);
  }
  for (const call of calls.done()) yield { type: "tool_call", call };
  yield { type: "done", finishReason, usage: usageOf(target.provider, usage) };
}

async function completeOnce(target: Target, opts: ChatOptions): Promise<ChatResult> {
  const res = await upstream(target.provider, `${target.base}/chat/completions`, {
    key: target.key,
    body: JSON.stringify(requestBody(target, opts, false)),
    contentType: "application/json",
    signal: opts.signal,
    timeoutMs: opts.timeoutMs ?? 60_000,
  });
  let body: { choices?: WireChoice[]; usage?: WireUsage };
  try {
    body = await res.json();
  } catch (error) {
    throw toAiError(error, opts.signal);
  }
  const choice = body.choices?.[0];
  if (!choice?.message) throw new AiError("upstream_failed", "no choices");
  const calls = new ToolCallAssembler();
  if (choice.message.tool_calls) calls.add(choice.message.tool_calls);
  return {
    text: choice.message.content ?? "",
    toolCalls: calls.done(),
    finishReason: choice.finish_reason ?? "stop",
    usage: usageOf(target.provider, body.usage),
  };
}

/** Streams a chat completion; falls back to Gemini only before anything was sent on. */
async function* streamChat(opts: ChatOptions): AsyncGenerator<StreamEvent> {
  const targets = chatTargets();
  if (!targets.length) throw new AiError("not_configured");
  for (const [i, target] of targets.entries()) {
    let started = false;
    try {
      for await (const event of streamOnce(target, opts)) {
        started = true;
        yield event;
      }
      return;
    } catch (error) {
      const e = toAiError(error, opts.signal);
      if (started || e.code === "aborted" || i === targets.length - 1) throw e;
      log(target.provider, `failed (${e.code}), falling back to ${targets[i + 1].provider}`);
    }
  }
}

async function completeChat(opts: ChatOptions): Promise<ChatResult> {
  const targets = chatTargets();
  if (!targets.length) throw new AiError("not_configured");
  for (const [i, target] of targets.entries()) {
    try {
      return await completeOnce(target, opts);
    } catch (error) {
      const e = toAiError(error, opts.signal);
      if (e.code === "aborted" || i === targets.length - 1) throw e;
      log(target.provider, `failed (${e.code}), falling back to ${targets[i + 1].provider}`);
    }
  }
  throw new AiError("not_configured");
}

export function chat(opts: ChatOptions & { stream: true }): AsyncGenerator<StreamEvent>;
export function chat(opts: ChatOptions & { stream?: false }): Promise<ChatResult>;
export function chat(opts: ChatOptions & { stream?: boolean }): AsyncGenerator<StreamEvent> | Promise<ChatResult> {
  return opts.stream ? streamChat(opts) : completeChat(opts);
}

/** JSON Schema for response_format, from a zod schema. */
export function jsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  const { $schema, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  void $schema;
  return rest;
}

/**
 * A chat whose reply must be JSON matching `schema`. The API constrains
 * decoding to the schema; the reply is still validated here.
 */
export async function chatJson<S extends z.ZodType>(
  schema: S,
  name: string,
  opts: Omit<ChatOptions, "json" | "tools">,
): Promise<{ data: z.output<S>; usage: Usage }> {
  const result = await completeChat({ ...opts, json: { name, schema: jsonSchemaOf(schema) } });
  let value: unknown;
  try {
    value = JSON.parse(result.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new AiError("bad_output", `${name}: reply is not JSON`);
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AiError("bad_output", `${name}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
  return { data: parsed.data, usage: result.usage };
}

/** Muse Image: one image as a data URL (POST /images/generations). */
export async function generateImage(opts: {
  prompt: string;
  size?: string;
  signal?: AbortSignal;
  user?: string;
}): Promise<{ dataUrl: string }> {
  if (!env.META_API_KEY) throw new AiError("not_configured");
  const timeoutMs = 110_000;
  const res = await upstream("meta", `${env.META_API_BASE}/images/generations`, {
    key: env.META_API_KEY,
    contentType: "application/json",
    body: JSON.stringify({
      model: env.META_IMAGE_MODEL,
      prompt: opts.prompt,
      n: 1,
      size: opts.size ?? "1536x1024",
      response_format: "b64_json",
      output_format: "webp",
      // The prompt carries the whole style; references from the web would only dilute it.
      tool_enablement: { enable_web_search: false, enable_image_search: false, enable_shell: false },
      ...(opts.user ? { user: opts.user } : {}),
    }),
    signal: opts.signal,
    timeoutMs,
  });
  let body: { data?: Array<{ b64_json?: string; url?: string }>; output_format?: string };
  try {
    body = await res.json();
  } catch (error) {
    throw toAiError(error, opts.signal);
  }
  const image = body.data?.[0];
  const format = body.output_format ?? "webp";
  if (image?.b64_json) return { dataUrl: `data:image/${format};base64,${image.b64_json}` };
  if (image?.url) {
    let file: Response;
    try {
      file = await fetch(image.url, { signal: withTimeout(30_000, opts.signal) });
    } catch (error) {
      throw toAiError(error, opts.signal);
    }
    if (!file.ok) throw new AiError("upstream_failed", `image download ${file.status}`);
    const type = file.headers.get("content-type")?.split(";")[0] || `image/${format}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    return { dataUrl: `data:${type};base64,${bytes.toString("base64")}` };
  }
  throw new AiError("upstream_failed", "no image in the response");
}

function multipart(parts: Array<{ name: string; type: string; filename?: string; data: Uint8Array | string }>) {
  const boundary = `----iynk${createHash("sha256").update(String(Math.random())).digest("hex").slice(0, 24)}`;
  const chunks: Uint8Array[] = [];
  const text = (s: string) => chunks.push(new TextEncoder().encode(s));
  for (const part of parts) {
    const file = part.filename ? `; filename="${part.filename}"` : "";
    text(`--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"${file}\r\nContent-Type: ${part.type}\r\n\r\n`);
    if (typeof part.data === "string") text(part.data);
    else chunks.push(part.data);
    text("\r\n");
  }
  text(`--${boundary}--\r\n`);
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

/**
 * Muse Voice Transcribe on a 16-bit mono PCM WAV (POST /asr/transcribe).
 * `languages` are language names such as "Spanish" (languageBias).
 */
export async function transcribeWav(opts: {
  wav: Uint8Array;
  languages?: string[];
  keywords?: string[];
  signal?: AbortSignal;
}): Promise<{ text: string; durationMs: number }> {
  if (!env.META_API_KEY) throw new AiError("not_configured");
  const request = {
    model: env.META_TRANSCRIBE_MODEL,
    audioEncoding: "WAV",
    mode: "PUSH_TO_TALK",
    ...(opts.languages?.length ? { languageBias: opts.languages } : {}),
    ...(opts.keywords?.length ? { keywords: opts.keywords } : {}),
  };
  const { body, contentType } = multipart([
    { name: "request", type: "application/json", data: JSON.stringify(request) },
    { name: "audio", type: "audio/wav", filename: "audio.wav", data: opts.wav },
  ]);
  const res = await upstream("meta", `${env.META_API_BASE}/asr/transcribe`, {
    key: env.META_API_KEY,
    body,
    contentType,
    signal: opts.signal,
    timeoutMs: 45_000,
  });
  let json: { transcript?: unknown; audioDurationMs?: unknown };
  try {
    json = await res.json();
  } catch (error) {
    throw toAiError(error, opts.signal);
  }
  if (typeof json.transcript !== "string") throw new AiError("upstream_failed", "no transcript");
  return { text: json.transcript.trim(), durationMs: Number(json.audioDurationMs) || 0 };
}
