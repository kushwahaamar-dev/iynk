import type { Msg, ToolSpec } from "./adapters/types.ts";

export interface RequestParts {
  system: string;
  tools: ToolSpec[];
  digest: string;
  history: Msg[];
  volatile: string;
}

/** `cacheAfter` holds indexes into `messages`; -1 stands for the system text and tools before the first message. */
export function layout(parts: RequestParts, family: "anthropic" | "openai"): { messages: Msg[]; cacheAfter: number[] } {
  const messages: Msg[] = [
    { role: "user", text: parts.digest },
    ...parts.history,
    { role: "user", text: parts.volatile },
  ];
  if (family === "openai") return { messages, cacheAfter: [] };
  const cacheAfter = [-1, 0];
  if (parts.history.length > 0) cacheAfter.push(parts.history.length);
  return { messages, cacheAfter };
}

export function cacheRatio(u: { inTokens: number; cacheReadTokens: number }): number {
  const total = u.inTokens + u.cacheReadTokens;
  return total > 0 ? u.cacheReadTokens / total : 0;
}
