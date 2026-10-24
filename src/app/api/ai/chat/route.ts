import { z } from "zod";
import { parseToolCall } from "@/lib/ai/tools";
import { LOCALES } from "@/i18n/config";
import { LABS } from "@/lib/server/ai/catalog";
import { aiUser, guardAi } from "@/lib/server/ai/guard";
import { PARTNER_RULES, partnerContext } from "@/lib/server/ai/prompts/partner";
import { AiError, chat, type ProviderMessage, type ToolCallOut, type WireToolCall } from "@/lib/server/ai/provider";
import { sseResponse } from "@/lib/server/ai/sse";
import { partnerToolSpecs, runServerTool, runsOnServer, type ToolOutcome } from "@/lib/server/ai/tools";
import type { ChatErrorCode, ChatEvent, ChatUsage } from "@/lib/server/ai/types";
import { parseBody } from "@/lib/server/http";

// No `runtime` export: cacheComponents rejects it, and Node.js is the default.
export const maxDuration = 120;

/** Server tool rounds per request; the last round gets no tools, so it must answer in text. */
const MAX_ROUNDS = 4;

const id = z.string().min(1).max(64);
const toolCall = z.object({ id, name: z.string().min(1).max(64), args: z.unknown() });

const Message = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), content: z.string().min(1).max(8000) }),
  z.object({ role: z.literal("assistant"), content: z.string().max(16_000), tool_calls: z.array(toolCall).max(8).optional() }),
  z.object({ role: z.literal("tool"), content: z.string().max(16_000), tool_call_id: id }),
]);

type Message = z.output<typeof Message>;

/** Meta rejects a tool result that doesn't answer the assistant turn right before it, so check that here. */
function wellFormed(messages: Message[]): boolean {
  let open = new Set<string>();
  for (const m of messages) {
    if (m.role === "tool") {
      if (!open.delete(m.tool_call_id)) return false;
      continue;
    }
    if (open.size) return false;
    open = new Set(m.role === "assistant" ? (m.tool_calls ?? []).map((c) => c.id) : []);
  }
  const last = messages.at(-1);
  return open.size === 0 && (last?.role === "user" || last?.role === "tool");
}

const Body = z.object({
  messages: z
    .array(Message)
    .min(1)
    .max(60)
    .refine(wellFormed, "each tool result must answer the assistant turn before it, and the chat must end with the user or a tool"),
  lab: z.enum(LABS).optional(),
  itemId: z.string().min(1).max(64).optional(),
  bench: z.string().max(12 * 1024).optional(),
  locale: z.enum(LOCALES),
  peers: z
    .array(
      z.object({
        id,
        name: z.string().trim().min(1).max(24),
        lang: z.enum(LOCALES),
        done: z.array(z.string().max(120)).max(300),
      }),
    )
    .max(8)
    .optional(),
});

type Body = z.output<typeof Body>;

function wire(call: { id: string; name: string; arguments: string }): WireToolCall {
  return { id: call.id, type: "function", function: { name: call.name, arguments: call.arguments } };
}

function toProvider(m: Message): ProviderMessage {
  if (m.role === "user") return { role: "user", content: m.content };
  if (m.role === "tool") return { role: "tool", tool_call_id: m.tool_call_id, content: m.content };
  const calls = (m.tool_calls ?? []).map((c) => wire({ id: c.id, name: c.name, arguments: JSON.stringify(c.args ?? {}) }));
  return { role: "assistant", content: m.content || null, ...(calls.length ? { tool_calls: calls } : {}) };
}

function errorCode(error: unknown): ChatErrorCode {
  if (!(error instanceof AiError)) return "internal";
  if (error.code === "bad_output" || error.code === "aborted") return "upstream_failed";
  return error.code;
}

async function* converse(body: Body, req: Request): AsyncGenerator<ChatEvent> {
  const messages: ProviderMessage[] = [
    { role: "system", content: PARTNER_RULES },
    { role: "system", content: partnerContext(body) },
    ...body.messages.map(toProvider),
  ];
  const tools = partnerToolSpecs();
  const usage: ChatUsage = { provider: "meta", inTokens: 0, outTokens: 0 };
  let wrote = false;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const last = round === MAX_ROUNDS;
    const calls: ToolCallOut[] = [];
    let text = "";
    try {
      for await (const event of chat({
        messages,
        tools: last ? undefined : tools,
        stream: true,
        signal: req.signal,
        // Hints should start streaming fast; reasoning tokens count against maxTokens.
        reasoning: "low",
        maxTokens: 6000,
        cacheKey: "simlab-partner",
        user: aiUser(req),
      })) {
        if (event.type === "text") {
          // Rounds are one reply to the learner: keep a paragraph break between them.
          if (!text && wrote) yield { type: "text", delta: "\n\n" };
          text += event.delta;
          wrote = true;
          yield { type: "text", delta: event.delta };
        } else if (event.type === "tool_call") {
          calls.push(event.call);
        } else {
          usage.provider = event.usage.provider;
          usage.inTokens += event.usage.inTokens;
          usage.outTokens += event.usage.outTokens;
        }
      }
    } catch (error) {
      if (req.signal.aborted) return;
      yield { type: "error", code: errorCode(error) };
      return;
    }
    if (!calls.length || last) break;

    const checked = calls.map((raw) => ({ raw, parsed: parseToolCall(raw.id, raw.name, raw.arguments) }));
    const forClient = checked.flatMap(({ raw, parsed }) => (parsed.ok && !runsOnServer(raw.name) ? [parsed.call] : []));
    if (forClient.length) {
      // The browser runs these and continues the chat with their results. Server
      // calls from the same turn are dropped, so the history it replays stays paired.
      for (const call of forClient) yield { type: "tool_call", id: call.id, name: call.name, args: call.args };
      break;
    }

    messages.push({ role: "assistant", content: text || null, tool_calls: calls.map(wire) });
    const outcomes = await Promise.all(
      checked.map(({ parsed }): Promise<ToolOutcome> =>
        parsed.ok
          ? runServerTool(parsed.call, req.signal)
          : Promise.resolve({ content: JSON.stringify({ error: parsed.error }), citations: [] }),
      ),
    );
    if (req.signal.aborted) return;
    for (const [i, outcome] of outcomes.entries()) {
      for (const citation of outcome.citations) yield { type: "citation", ...citation };
      messages.push({ role: "tool", tool_call_id: calls[i].id, content: outcome.content });
    }
  }
  yield { type: "done", usage };
}

/** Anything unexpected still ends the stream with an error event instead of a broken connection. */
async function* safely(events: AsyncGenerator<ChatEvent>): AsyncGenerator<ChatEvent> {
  try {
    yield* events;
  } catch (error) {
    console.error("[ai] chat failed:", error instanceof Error ? `${error.name}: ${error.message}` : typeof error);
    yield { type: "error", code: "internal" };
  }
}

export async function POST(req: Request) {
  const refused = guardAi(req, "chat", 20);
  if (refused) return refused;
  const parsed = await parseBody(req, Body);
  if (!parsed.ok) return parsed.response;
  return sseResponse(safely(converse(parsed.data, req)));
}
