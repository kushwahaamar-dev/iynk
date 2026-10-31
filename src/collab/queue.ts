import type { Op } from "../project/generated/types.ts";

export type PendingSub = {
  sub: number;
  batch: string | null;
  ops: { opId: string; base: number; op: Op }[];
  kind: "user" | "ai";
  proposal?: string;
  sentAt: number | null;
};

type PushResult = { ok: true; sub: number } | { ok: false; reason: "queue_full" };

/** What two ops must share to be collapsed into the later one: the same view placement or the same single parameter. */
function mergeKey(op: Op): string | null {
  if (op.k === "view.place") return `place ${op.view} ${op.placement.c}`;
  if (op.k === "component.set" && Object.keys(op.set ?? {}).length === 0) {
    const names = Object.keys(op.params ?? {});
    if (names.length === 1) return `param ${op.id} ${names[0]}`;
  }
  return null;
}

function soleKey(s: PendingSub): string | null {
  if (s.sentAt !== null || s.batch !== null || s.ops.length !== 1) return null;
  return mergeKey(s.ops[0]!.op);
}

export class PendingQueue {
  private items: PendingSub[] = [];
  private nextSub = 1;

  constructor(private readonly max: number) {}

  get length(): number {
    return this.items.length;
  }

  push(s: Omit<PendingSub, "sub" | "sentAt">): PushResult {
    if (this.items.length >= this.max) return { ok: false, reason: "queue_full" };
    const sub = this.nextSub++;
    this.items.push({ ...s, sub, sentAt: null });
    return { ok: true, sub };
  }

  head(): PendingSub | undefined {
    return this.items[0];
  }

  all(): readonly PendingSub[] {
    return this.items;
  }

  markSent(sub: number, at: number): void {
    const item = this.items.find((s) => s.sub === sub);
    if (item) item.sentAt = at;
  }

  /** Removes the head when it is `sub`; acknowledgements arrive in order. */
  ack(sub: number): PendingSub | undefined {
    return this.items[0]?.sub === sub ? this.items.shift() : undefined;
  }

  drop(sub: number): PendingSub | undefined {
    const at = this.items.findIndex((s) => s.sub === sub);
    return at === -1 ? undefined : this.items.splice(at, 1)[0];
  }

  /** Puts submissions back in front of everything pending, unsent and under new numbers, with their op ids kept. */
  requeue(subs: readonly PendingSub[]): void {
    const fresh = subs.map((s): PendingSub => ({ ...s, sub: this.nextSub++, sentAt: null }));
    this.items.unshift(...fresh);
  }

  /** Collapses the unsent end of the queue into the earlier submission, which keeps its number and op id. */
  mergeTail(): void {
    for (;;) {
      const later = this.items.at(-1);
      const earlier = this.items.at(-2);
      if (!later || !earlier) return;
      const key = soleKey(earlier);
      if (key === null || key !== soleKey(later) || earlier.kind !== later.kind || earlier.proposal !== later.proposal) {
        return;
      }
      const first = earlier.ops[0]!;
      const last = later.ops[0]!;
      this.items.splice(-2, 2, { ...earlier, ops: [{ opId: first.opId, base: last.base, op: last.op }] });
    }
  }
}
