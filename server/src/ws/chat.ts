import type { Chat, ChatUp, ErrorCode } from "../../../src/protocol/frames.ts";
import { sanitizeChat } from "../../../src/protocol/validate.ts";
import type { CollabLimits } from "../collab-config.ts";
import { authorizeChat, type Subject } from "../rooms/permissions.ts";
import { TokenBucket } from "./bucket.ts";

const BACKLOG = 50;

export class ChatRing {
  readonly dropped = { count: 0 };
  private readonly lines: Chat[] = [];
  private readonly buckets = new Map<number, TokenBucket>();
  private systemLines = 0;

  private readonly limits: CollabLimits;
  private readonly clock: () => number;

  constructor(limits: CollabLimits, clock: () => number) {
    this.limits = limits;
    this.clock = clock;
  }

  send(subject: Subject, m: number, f: ChatUp): { frame: Chat } | { error: ErrorCode; retryAfterMs?: number } {
    if (!authorizeChat(subject).ok) return { error: "permission" };
    const now = this.clock();
    let bucket = this.buckets.get(m);
    if (bucket === undefined) {
      bucket = new TokenBucket(this.limits.chatPerSec, this.limits.chatBurst, now);
      this.buckets.set(m, bucket);
    }
    if (!bucket.take(now)) {
      this.dropped.count += 1;
      return { error: "rate_limited", retryAfterMs: bucket.retryAfterMs(now) };
    }
    const text = sanitizeChat(f.text);
    if (text === null) return { error: "bad_frame" };
    const frame: Chat = { t: "chat", id: f.id, m, text, lang: f.lang, kind: "text", at: new Date(now).toISOString() };
    this.keep(frame);
    return { frame };
  }

  system(text: string): Chat {
    this.systemLines += 1;
    const frame: Chat = {
      t: "chat",
      id: `sys_${this.systemLines}`,
      m: 0,
      text,
      lang: "en",
      kind: "system",
      at: new Date(this.clock()).toISOString(),
    };
    this.keep(frame);
    return frame;
  }

  backlog(): Chat[] {
    return [...this.lines];
  }

  leave(m: number): void {
    this.buckets.delete(m);
  }

  private keep(frame: Chat): void {
    this.lines.push(frame);
    if (this.lines.length > BACKLOG) this.lines.shift();
  }
}
