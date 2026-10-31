import type { Family } from "../../protocol/ai-relay.ts";
import type { AiErrorCode } from "../errors.ts";
import type { ProviderProfile } from "../profiles.ts";
import type { Quirks } from "./openai.ts";

export type AdapterCaps = {
  tools: "native" | "json-text" | "none";
  parallelTools: boolean;
  usageInStream: boolean;
  promptCache: "explicit" | "implicit" | "none";
  structuredOutput: boolean;
  contextTokens: number;
  maxOutputTokens: number;
  browserDirect: "yes" | "no" | "unknown";
  privacy: "local" | "cloud";
};

export type ToolSpec = { name: string; description: string; parameters: Record<string, unknown> };

export type ToolCallRef = { id: string; name: string; argsJson: string };

export type Msg =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; toolCalls?: ToolCallRef[] }
  | { role: "tool"; callId: string; text: string };

export type ModelRequest = {
  /** Stable parts first. */
  system: { text: string; cacheBreakpoint?: boolean }[];
  messages: Msg[];
  tools: ToolSpec[];
  toolChoice: "auto" | "none";
  maxOutputTokens: number;
  reasoning?: "off" | "low" | "medium" | "high";
  requestId: string;
};

export type ModelEvent =
  | { t: "text"; delta: string }
  | { t: "tool_call"; id: string; name: string; argsJson: string }
  | { t: "usage"; inTokens: number; cacheReadTokens: number; cacheWriteTokens: number; outTokens: number }
  | { t: "done"; reason: "stop" | "tool" | "length" | "filter" }
  | { t: "error"; code: AiErrorCode; status?: number; retryAfterMs?: number };

export interface ModelAdapter {
  readonly family: Family;
  readonly caps: AdapterCaps;
  stream(req: ModelRequest, signal: AbortSignal): AsyncIterable<ModelEvent>;
}

export interface WireAdapter {
  readonly family: Family;
  buildBody(req: ModelRequest, o: { stream: boolean; quirks: Quirks }): Record<string, unknown>;
  parse(res: Response, signal: AbortSignal): AsyncIterable<ModelEvent>;
}

export interface Transport {
  readonly kind: "direct" | "relay";
  send(a: {
    profile: ProviderProfile;
    path: "chat" | "models";
    body: object;
    keyOverride?: string;
    signal: AbortSignal;
  }): Promise<Response>;
}

/** What a probe saw of a provider: the raw material the conformance run judges. */
export type ConformanceInput = {
  reachable: boolean;
  status?: number;
  modelIds: string[];
};

export interface AiClient {
  stream(req: ModelRequest, profileId: string, signal: AbortSignal): AsyncIterable<ModelEvent>;
  probe(profileId: string, signal: AbortSignal): Promise<ConformanceInput>;
}
