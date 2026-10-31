import type { Chat, ServerFrame } from "../protocol/index.ts";
import type { RoomClient } from "./client.ts";
import type { PresenceStore } from "./presence.ts";

export const MAX_CHAT_GRAPHEMES = 500;

const LINES_KEPT = 200;
const SENT_WINDOW_MS = 1000;
const SENT_PER_WINDOW = 5;
const ID_CHARS = 12;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export type ChatLine = { id: string; m: number; name: string; text: string; kind: "text" | "system"; at: string; mine: boolean };

export type ChatSnapshot = { lines: readonly ChatLine[]; muted: boolean; retryAfterMs: number | null };

export type SendResult = { ok: true; id: string } | { ok: false; reason: "empty" | "too_long" | "rate" | "muted" };

const segmenter = new Intl.Segmenter();

function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), (s) => s.segment);
}

export function countGraphemes(text: string): number {
  return graphemes(text).length;
}

export function clipGraphemes(text: string, max: number = MAX_CHAT_GRAPHEMES): string {
  const parts = graphemes(text);
  return parts.length <= max ? text : parts.slice(0, max).join("");
}

/** The room's chat as this client sees it: memory only, the last 200 lines, nothing kept after the room ends. */
export class ChatStore {
  private lines: ChatLine[] = [];
  private known = new Set<string>();
  private awaiting: string[] = [];
  private sentAt: number[] = [];
  private muted = false;
  private retryAfterMs: number | null = null;
  private retryUntil = 0;
  private snapshot: ChatSnapshot | null = null;
  private readonly listeners = new Set<() => void>();
  private presence: PresenceStore | null = null;
  private client: RoomClient | null = null;
  private lang = "en";

  constructor(
    private readonly clock: () => number,
    private readonly random: () => number,
  ) {}

  attach(client: RoomClient, presence: PresenceStore): () => void {
    this.client = client;
    this.presence = presence;
    const off = client.on((e) => {
      if (e.t === "room") this.apply(e.frame);
    });
    return () => {
      off();
      if (this.client === client) {
        this.client = null;
        this.presence = null;
      }
    };
  }

  /** The language the next message is tagged with; the page's language. */
  setLang(lang: string): void {
    this.lang = lang;
  }

  getSnapshot(): ChatSnapshot {
    this.snapshot ??= { lines: this.lines, muted: this.muted, retryAfterMs: this.retryAfterMs };
    return this.snapshot;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  send(raw: string): SendResult {
    const text = raw.trim();
    if (text === "") return { ok: false, reason: "empty" };
    if (countGraphemes(text) > MAX_CHAT_GRAPHEMES) return { ok: false, reason: "too_long" };
    if (this.muted) return { ok: false, reason: "muted" };
    const now = this.clock();
    if (now < this.retryUntil) return { ok: false, reason: "rate" };
    this.sentAt = this.sentAt.filter((at) => now - at < SENT_WINDOW_MS);
    if (this.sentAt.length >= SENT_PER_WINDOW) return this.limited(SENT_WINDOW_MS - (now - this.sentAt[0]!));
    this.sentAt.push(now);
    const id = this.newId();
    this.awaiting = [...this.awaiting, id].slice(-SENT_PER_WINDOW);
    this.client?.send({ t: "chat", id, text, lang: this.lang });
    if (this.retryAfterMs !== null) {
      this.retryAfterMs = null;
      this.changed();
    }
    return { ok: true, id };
  }

  private limited(retryAfterMs: number): { ok: false; reason: "rate" } {
    this.retryUntil = this.clock() + retryAfterMs;
    this.retryAfterMs = retryAfterMs;
    this.changed();
    return { ok: false, reason: "rate" };
  }

  private newId(): string {
    let id = "cht_";
    for (let i = 0; i < ID_CHARS; i++) id += ALPHABET[Math.floor(this.random() * ALPHABET.length)];
    return id;
  }

  private apply(frame: ServerFrame): void {
    if (frame.t === "chat") return this.add(frame);
    if (frame.t !== "error" || frame.ref !== undefined || this.awaiting.length === 0) return;
    if (frame.code === "rate_limited") {
      this.awaiting.shift();
      this.limited(frame.retryAfterMs ?? SENT_WINDOW_MS);
    } else if (frame.code === "permission") {
      this.awaiting.shift();
      this.muted = true;
      this.changed();
    }
  }

  private add(frame: Chat): void {
    this.awaiting = this.awaiting.filter((id) => id !== frame.id);
    if (this.known.has(frame.id)) return;
    const snap = this.presence?.getSnapshot();
    const name = frame.kind === "system" ? "" : (snap?.members.find((member) => member.m === frame.m)?.name ?? "");
    const line: ChatLine = {
      id: frame.id,
      m: frame.m,
      name,
      text: frame.text,
      kind: frame.kind,
      at: frame.at,
      mine: frame.kind === "text" && snap?.me?.m === frame.m,
    };
    this.known.add(frame.id);
    this.lines = [...this.lines, line];
    if (this.lines.length > LINES_KEPT) {
      const dropped = this.lines.slice(0, this.lines.length - LINES_KEPT);
      this.lines = this.lines.slice(-LINES_KEPT);
      for (const { id } of dropped) this.known.delete(id);
    }
    this.changed();
  }

  private changed(): void {
    this.snapshot = null;
    for (const fn of [...this.listeners]) fn();
  }
}
