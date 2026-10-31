import { mergeEdits } from "../studio/code/sources.ts";
import type { Timers } from "./client.ts";

/** One text change to one file in UTF-16 code units, the shape of a `source.edit` op without its base. */
export type SourceEdit = { id: string; pos: number; del: number; ins: string };

const MAX_BURST_MS = 1000;

/** `b`, made on the text `a` produced, folded into `a` when it touches or lies inside what `a` inserted; else null. */
export function composeEdits(a: SourceEdit, b: SourceEdit): SourceEdit | null {
  if (a.id !== b.id) return null;
  const merged = mergeEdits(a, b);
  return merged && { id: a.id, ...merged };
}

export type SourceBatcher = { push(e: SourceEdit): void; flush(): void; cancel(): void };

/**
 * Gathers keystrokes into edits and hands them over together: after `flushMs` of quiet, after one second of
 * continuous typing, or when `flush` is called. Edits that cannot be composed stay separate, in typing order.
 */
export function createSourceBatcher(o: { flushMs: number; timers: Timers; emit: (edits: SourceEdit[]) => void }): SourceBatcher {
  let edits: SourceEdit[] = [];
  let quiet: unknown;
  let cap: unknown;

  const clear = () => {
    o.timers.clearTimeout(quiet);
    o.timers.clearTimeout(cap);
    quiet = undefined;
    cap = undefined;
  };

  const flush = () => {
    clear();
    const out = edits.filter((e) => e.del > 0 || e.ins !== "");
    edits = [];
    if (out.length > 0) o.emit(out);
  };

  return {
    push(e) {
      const last = edits.at(-1);
      const merged = last && composeEdits(last, e);
      if (merged) edits[edits.length - 1] = merged;
      else edits.push(e);
      o.timers.clearTimeout(quiet);
      quiet = o.timers.setTimeout(flush, o.flushMs);
      cap ??= o.timers.setTimeout(flush, MAX_BURST_MS);
    },
    flush,
    cancel() {
      clear();
      edits = [];
    },
  };
}
