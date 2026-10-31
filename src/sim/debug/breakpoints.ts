import type { SimTime } from "../core/clock.ts";

export type PauseReason = "breakpoint" | "step" | "watch";

export interface PauseEvent {
  reason: PauseReason;
  file: string;
  line: number;
  column?: number;
  atNs: SimTime;
  depth: number;
}

export interface VarInfo {
  name: string;
  type: string;
  value: string;
  address?: number;
}

export interface FrameInfo {
  frame: number;
  function: string;
  file: string;
  line: number;
  locals: VarInfo[];
  globals: VarInfo[];
}

export interface DebugPort {
  setBreakpoints(file: string, lines: number[]): void;
  step(unit: "line" | "over" | "out"): void;
  resume(): void;
  inspect(frame: number): FrameInfo;
  watch(addr: number, len: number): void;
  readonly paused: PauseEvent | null;
  onPause(cb: (e: PauseEvent) => void): void;
}

export const MAX_BREAKPOINTS_PER_FILE = 256;
export const MAX_BREAKPOINTS = 1024;

export class BreakpointSet {
  private readonly files = new Map<string, Set<number>>();
  private total = 0;

  /** Replaces the breakpoints of one file; lines that are not positive integers are dropped, extra lines past the limits too. */
  set(file: string, lines: number[]): void {
    this.total -= this.files.get(file)?.size ?? 0;
    const next = new Set<number>();
    for (const line of lines) {
      if (!Number.isInteger(line) || line < 1) continue;
      if (next.size >= MAX_BREAKPOINTS_PER_FILE || this.total + next.size >= MAX_BREAKPOINTS) break;
      next.add(line);
    }
    this.total += next.size;
    if (next.size) this.files.set(file, next);
    else this.files.delete(file);
  }

  has(file: string, line: number): boolean {
    return this.files.get(file)?.has(line) ?? false;
  }

  clear(): void {
    this.files.clear();
    this.total = 0;
  }

  get size(): number {
    return this.total;
  }
}

type Mode = "run" | "line" | "over" | "out";

/**
 * Decides before each statement whether the interpreter pauses. The interpreter calls `check` and yields
 * when it returns true; time is frozen because nothing ticks while the generator is parked.
 */
export class StatementDebugger implements DebugPort {
  readonly breakpoints = new BreakpointSet();
  private mode: Mode = "run";
  private startDepth = 0;
  private current: PauseEvent | null = null;
  private skipNoted = false;
  private readonly pauseListeners: Array<(e: PauseEvent) => void> = [];
  private readonly skipListeners: Array<(file: string, line: number) => void> = [];

  /** `map` turns a line of the combined source into the file and line the user wrote. */
  private readonly map: (line: number) => { file: string; line: number };
  private readonly now: () => SimTime;

  constructor(map: (line: number) => { file: string; line: number }, now: () => SimTime) {
    this.map = map;
    this.now = now;
  }

  get paused(): PauseEvent | null {
    return this.current;
  }

  setBreakpoints(file: string, lines: number[]): void {
    this.breakpoints.set(file, lines);
  }

  step(unit: "line" | "over" | "out"): void {
    if (!this.current) return;
    this.startDepth = this.current.depth;
    this.mode = unit;
    this.current = null;
  }

  resume(): void {
    this.mode = "run";
    this.current = null;
  }

  /** Back to running after the engine was reset; breakpoints stay. */
  clearPause(): void {
    this.resume();
    this.skipNoted = false;
  }

  inspect(frame: number): FrameInfo {
    const at = this.current;
    return { frame, function: "", file: at?.file ?? "", line: at?.line ?? 0, locals: [], globals: [] };
  }

  watch(): void {}

  onPause(cb: (e: PauseEvent) => void): void {
    this.pauseListeners.push(cb);
  }

  /** Called once, the first time a breakpoint sits in code that cannot pause (an interrupt handler or a function used inside an expression). */
  onSkipped(cb: (file: string, line: number) => void): void {
    this.skipListeners.push(cb);
  }

  /** True when the statement at `p` should pause before it runs; `pausable` is false inside code that runs to completion in one go. */
  check(p: { line: number; col: number }, depth: number, pausable = true): boolean {
    if (this.mode === "run" && this.breakpoints.size === 0) return false;
    const at = this.map(p.line);
    const atBreakpoint = this.breakpoints.has(at.file, at.line);
    if (!pausable) {
      if (atBreakpoint && !this.skipNoted) {
        this.skipNoted = true;
        for (const cb of this.skipListeners) cb(at.file, at.line);
      }
      return false;
    }
    const stepped =
      this.mode === "line" || (this.mode === "over" && depth <= this.startDepth) || (this.mode === "out" && depth < this.startDepth);
    if (!stepped && !atBreakpoint) return false;
    this.mode = "run";
    this.current = { reason: atBreakpoint ? "breakpoint" : "step", file: at.file, line: at.line, column: p.col, atNs: this.now(), depth };
    for (const cb of this.pauseListeners) cb(this.current);
    return true;
  }
}
