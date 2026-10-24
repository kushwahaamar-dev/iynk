// One partner conversation per lab item: the turns the panel shows, the chat
// loop (stream a reply, run the client tools it calls, continue with their
// results, at most MAX_ROUNDS times) and the learner's decisions on proposed
// changes. The API history is derived from the turns, never kept beside them.

import type { LabKind, LabStore } from "@/components/dock/types";
import type { Locale } from "@/i18n/config";
import { AiError, streamChat, streamErrorCode, type AiErrorCode } from "./client";
import type { ChatMessage, ChatPeer, ChatRequest } from "./protocol";
import { runClientTool, type ToolCard, type ToolContext } from "./run-tools";
import type { SessionLog } from "./session-log";
import { parseToolCall, toolRuns, type ProposedChange } from "./tools";

/** Client-tool rounds per question: the model may act, look, then answer. */
export const MAX_ROUNDS = 4;
/** Messages of history sent with each turn. */
const HISTORY = 24;

export type Citation = { url: string; title: string; snippet: string };

export type ToolRecord = { id: string; name: string; args: unknown; result: Record<string, unknown>; card: ToolCard | null };

export type UserVia = "text" | "voice" | "hint" | "show" | "suggestion";

export type Turn =
  | { id: string; role: "user"; text: string; via: UserVia }
  | {
      id: string;
      role: "assistant";
      text: string;
      citations: Citation[];
      tools: ToolRecord[];
      status: "streaming" | "done" | "error" | "stopped";
      error: AiErrorCode | null;
    }
  | { id: string; role: "note"; decision: "accepted" | "rejected"; kind: ProposedChange["kind"] };

export type ConversationState = { turns: Turn[]; busy: boolean };

export type SendEnv = {
  lab: LabKind;
  itemId: string;
  locale: Locale;
  store: LabStore;
  bench(): string;
  peers(): ChatPeer[];
  tools(): ToolContext;
  log: SessionLog;
  me: string;
  fetch?: typeof fetch;
};

let counter = 0;
const nextId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

function noteText(turn: Extract<Turn, { role: "note" }>): string {
  return `[The learner ${turn.decision} your proposed ${turn.kind} change.]`;
}

/** The chat history the API sees, built from the turns. */
export function toMessages(turns: readonly Turn[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  let notes: string[] = [];
  for (const turn of turns) {
    if (turn.role === "note") {
      notes.push(noteText(turn));
    } else if (turn.role === "user") {
      out.push({ role: "user", content: notes.length ? `${notes.join(" ")}\n\n${turn.text}` : turn.text });
      notes = [];
    } else if (turn.text || turn.tools.length) {
      out.push(
        turn.tools.length
          ? { role: "assistant", content: turn.text, tool_calls: turn.tools.map(({ id, name, args }) => ({ id, name, args })) }
          : { role: "assistant", content: turn.text },
      );
      for (const tool of turn.tools) out.push({ role: "tool", tool_call_id: tool.id, content: JSON.stringify(tool.result) });
    }
  }
  // Start the window at a user message so no tool result loses its call.
  let start = Math.max(0, out.length - HISTORY);
  while (start > 0 && out[start].role !== "user") start--;
  return out.slice(start);
}

export class Conversation {
  private state: ConversationState = { turns: [], busy: false };
  private listeners = new Set<() => void>();
  private controller: AbortController | null = null;

  snapshot = (): ConversationState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(next: Partial<ConversationState>) {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }

  private update(id: string, patch: (turn: Turn) => Turn) {
    this.set({ turns: this.state.turns.map((turn) => (turn.id === id ? patch(turn) : turn)) });
  }

  stop() {
    this.controller?.abort();
  }

  clear() {
    this.stop();
    this.set({ turns: [], busy: false });
  }

  async send(text: string, via: UserVia, env: SendEnv): Promise<void> {
    const question = text.trim();
    if (!question || this.state.busy) return;
    this.set({ turns: [...this.state.turns, { id: nextId("u"), role: "user", text: question, via }] });
    env.log.add(env.me, "chat", `asked the partner: ${question}`);
    await this.run(env);
  }

  /** Drops the replies to the last question and asks it again. */
  async retry(env: SendEnv): Promise<void> {
    if (this.state.busy) return;
    const last = this.state.turns.findLastIndex((turn) => turn.role === "user");
    if (last === -1) return;
    this.set({ turns: this.state.turns.slice(0, last + 1) });
    await this.run(env);
  }

  private async run(env: SendEnv): Promise<void> {
    const controller = new AbortController();
    this.controller = controller;
    this.set({ busy: true });
    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const ran = await this.round(env, controller.signal);
        if (!ran || controller.signal.aborted) break;
      }
    } finally {
      if (this.controller === controller) this.controller = null;
      this.set({ busy: false });
    }
  }

  /** Streams one reply. Returns true when it ran client tools and the model should continue. */
  private async round(env: SendEnv, signal: AbortSignal): Promise<boolean> {
    const id = nextId("a");
    const request: ChatRequest = {
      messages: toMessages(this.state.turns),
      lab: env.lab,
      itemId: env.itemId,
      bench: env.bench(),
      locale: env.locale,
      peers: env.peers(),
    };
    this.set({
      turns: [
        ...this.state.turns,
        { id, role: "assistant", text: "", citations: [], tools: [], status: "streaming", error: null },
      ],
    });
    const patch = (fn: (turn: Extract<Turn, { role: "assistant" }>) => Partial<Extract<Turn, { role: "assistant" }>>) =>
      this.update(id, (turn) => (turn.role === "assistant" ? { ...turn, ...fn(turn) } : turn));

    let ranTools = false;
    let status: "done" | "error" | "stopped" = "done";
    try {
      for await (const event of streamChat(request, { signal, fetch: env.fetch })) {
        if (event.type === "text") {
          patch((turn) => ({ text: turn.text + event.delta }));
        } else if (event.type === "citation") {
          patch((turn) =>
            turn.citations.some((c) => c.url === event.url)
              ? {}
              : { citations: [...turn.citations, { url: event.url, title: event.title, snippet: event.snippet }] },
          );
        } else if (event.type === "tool_call") {
          const record = this.runTool(event.id, event.name, event.args, env);
          if (record) {
            ranTools = true;
            patch((turn) => ({ tools: [...turn.tools, record] }));
          }
        } else if (event.type === "error") {
          status = "error";
          patch(() => ({ error: streamErrorCode(event.code) }));
        }
      }
    } catch (error) {
      const code = error instanceof AiError ? error.code : "upstream";
      status = code === "aborted" ? "stopped" : "error";
      if (code !== "aborted") patch(() => ({ error: code }));
    }
    patch(() => ({ status }));
    const turn = this.state.turns.find((t) => t.id === id);
    if (turn?.role === "assistant" && turn.text) env.log.add("partner", "ai", turn.text.slice(0, 280));
    return status === "done" && ranTools;
  }

  private runTool(id: string, name: string, args: unknown, env: SendEnv): ToolRecord | null {
    const parsed = parseToolCall(id, name, args);
    if (!parsed.ok) return { id, name, args, result: { ok: false, error: parsed.error }, card: null };
    // Server tools ran inside /api/ai/chat already; only their citations reach the client.
    if (toolRuns(parsed.call.name) === "server") return null;
    const outcome = runClientTool(parsed.call, env.tools());
    if (outcome.card?.kind === "peer" && outcome.card.sent) {
      env.log.add(env.me, "help", `the partner asked ${outcome.card.peer} to explain: ${outcome.card.question}`, outcome.card.peer);
    }
    return { id, name, args: parsed.call.args, result: outcome.result, card: outcome.card };
  }

  /** Accept dispatches the change's store actions; either way the model hears the decision next turn. */
  decide(turnId: string, toolId: string, accept: boolean, env: Pick<SendEnv, "store" | "log" | "me">) {
    const turn = this.state.turns.find((t) => t.id === turnId);
    if (turn?.role !== "assistant") return;
    const tool = turn.tools.find((t) => t.id === toolId);
    if (tool?.card?.kind !== "change" || tool.card.status !== "pending") return;
    const card = tool.card;
    if (accept) for (const action of card.actions) env.store.dispatch(action);
    const decision: "accepted" | "rejected" = accept ? "accepted" : "rejected";
    const decided = (record: ToolRecord): ToolRecord =>
      record.id === toolId && record.card?.kind === "change" ? { ...record, card: { ...record.card, status: decision } } : record;
    const turns = this.state.turns.map((t): Turn => (t.id === turnId && t.role === "assistant" ? { ...t, tools: t.tools.map(decided) } : t));
    this.set({ turns: [...turns, { id: nextId("n"), role: "note", decision, kind: card.change.kind }] });
    env.log.add(env.me, "action", `${decision} the partner's ${card.change.kind} change`);
  }
}

const conversations = new Map<string, Conversation>();

/** The conversation survives the panel unmounting (dock tab switches, Activity). */
export function conversationFor(lab: LabKind, itemId: string): Conversation {
  const key = `${lab}:${itemId}`;
  let conversation = conversations.get(key);
  if (!conversation) {
    conversation = new Conversation();
    conversations.set(key, conversation);
  }
  return conversation;
}
