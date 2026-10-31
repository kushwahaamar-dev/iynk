import type { DebugPort } from "./breakpoints.ts";

export const MAX_WATCHES = 32;
export const MAX_WATCH_BYTES = 64;
const SRAM_START = 0x100;
const SRAM_END = 0x8ff;

export type WatchTarget = { kind: "global"; name: string } | { kind: "mem"; addr: number; len: number };

export interface WatchValue {
  target: WatchTarget;
  type: string;
  text: string;
  raw?: string;
  /** Differs from the value at the pause before this one. */
  changed: boolean;
  unavailable?: string;
}

interface Entry {
  id: number;
  target: WatchTarget;
  pauseOnChange: boolean;
  /** The text at the previous pause, and at the latest one. */
  before?: string;
  now?: string;
}

type Reader = Pick<DebugPort, "inspect" | "readMemory">;
type Reading = Omit<WatchValue, "target" | "changed">;

function valid(t: WatchTarget): boolean {
  if (t.kind === "global") return t.name.length > 0;
  const { addr, len } = t;
  return Number.isInteger(addr) && Number.isInteger(len) && len >= 1 && len <= MAX_WATCH_BYTES && addr >= SRAM_START && addr + len - 1 <= SRAM_END;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");
}

export class WatchList {
  private readonly entries: Entry[] = [];
  private nextId = 1;
  private armedCount = 0;

  /** The id of the new watch, or -1 when the target is invalid or the list is full. */
  add(target: WatchTarget, pauseOnChange = false): number {
    if (this.entries.length >= MAX_WATCHES || !valid(target)) return -1;
    const id = this.nextId++;
    this.entries.push({ id, target, pauseOnChange });
    if (pauseOnChange) this.armedCount++;
    return id;
  }

  remove(id: number): void {
    const at = this.entries.findIndex((e) => e.id === id);
    if (at < 0) return;
    if (this.entries[at]!.pauseOnChange) this.armedCount--;
    this.entries.splice(at, 1);
  }

  /** True while some watch asks to pause when its value changes. */
  get armed(): boolean {
    return this.armedCount > 0;
  }

  get targets(): ReadonlyArray<{ id: number; target: WatchTarget; pauseOnChange: boolean }> {
    return this.entries;
  }

  evaluate(dbg: Reader): WatchValue[] {
    const globals = this.globalsFor(dbg);
    return this.entries.map((e) => {
      const r = this.read(e.target, dbg, globals);
      return { target: e.target, ...r, changed: e.before !== undefined && r.text !== e.before };
    });
  }

  /** Records the values at a pause, so the next pause can say what changed. */
  snapshot(dbg: Reader): void {
    const globals = this.globalsFor(dbg);
    for (const e of this.entries) {
      e.before = e.now;
      e.now = this.read(e.target, dbg, globals).text;
    }
  }

  /** Ids of pause-on-change watches whose value differs from the last pause. */
  changedSincePause(dbg: Reader): number[] {
    const globals = this.globalsFor(dbg);
    const hit: number[] = [];
    for (const e of this.entries) {
      if (!e.pauseOnChange) continue;
      const text = this.read(e.target, dbg, globals).text;
      if (e.now === undefined) e.now = text;
      else if (text !== e.now) hit.push(e.id);
    }
    return hit;
  }

  private globalsFor(dbg: Reader) {
    return this.entries.some((e) => e.target.kind === "global") ? dbg.inspect(0).globals : [];
  }

  private read(target: WatchTarget, dbg: Reader, globals: ReturnType<DebugPort["inspect"]>["globals"]): Reading {
    if (target.kind === "mem") {
      const bytes = dbg.readMemory?.(target.addr, target.len);
      if (!bytes) return { type: `${target.len} bytes`, text: "", unavailable: "memory can only be read on the AVR engine" };
      const text = hex(bytes);
      return { type: `${target.len} bytes`, text, raw: text };
    }
    const found = globals.find((v) => v.name === target.name);
    if (!found) return { type: "", text: "", unavailable: "no such global" };
    return { type: found.type, text: found.value, raw: found.raw };
  }
}
