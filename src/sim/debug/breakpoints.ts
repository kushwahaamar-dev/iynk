import type { SimTime } from "../core/clock.ts";
import { WatchList } from "./watch.ts";

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
  /** The bytes behind the value, as hex, when the engine has them. */
  raw?: string;
  address?: number;
}

export interface FrameInfo {
  frame: number;
  function: string;
  file: string;
  line: number;
  locals: VarInfo[];
  globals: VarInfo[];
  /** Set instead of `locals` when the engine cannot name them; the value is an i18n key. */
  localsUnavailable?: string;
}

/** What the interpreter lets the debugger read: the variables of the statement it is stopped at or running. */
export interface VariableReader {
  functionName(): string;
  globals(): VarInfo[];
  locals(): VarInfo[];
}

export interface DebugPort {
  setBreakpoints(file: string, lines: number[]): void;
  step(unit: "line" | "over" | "out"): void;
  resume(): void;
  inspect(frame: number): FrameInfo;
  readonly watches: WatchList;
  /** Raw memory, where the engine has some. */
  readMemory?(addr: number, len: number): Uint8Array | null;
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
  readonly watches = new WatchList();
  private vars: VariableReader | null = null;
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
    const vars = this.vars;
    return {
      frame,
      function: vars?.functionName() ?? "",
      file: at?.file ?? "",
      line: at?.line ?? 0,
      locals: at && vars ? vars.locals() : [],
      globals: vars?.globals() ?? [],
    };
  }

  onPause(cb: (e: PauseEvent) => void): void {
    this.pauseListeners.push(cb);
  }

  /** Called once, the first time a breakpoint sits in code that cannot pause (an interrupt handler or a function used inside an expression). */
  onSkipped(cb: (file: string, line: number) => void): void {
    this.skipListeners.push(cb);
  }

  /** True when the statement at `p` should pause before it runs; `pausable` is false inside code that runs to completion in one go. */
  check(p: { line: number; col: number }, depth: number, pausable = true, vars?: VariableReader): boolean {
    if (vars) this.vars = vars;
    const watching = this.watches.armed;
    if (this.mode === "run" && this.breakpoints.size === 0 && !watching) return false;
    const at = this.map(p.line);
    const atBreakpoint = this.breakpoints.has(at.file, at.line);
    if (!pausable) {
      if (atBreakpoint && !this.skipNoted) {
        this.skipNoted = true;
        for (const cb of this.skipListeners) cb(at.file, at.line);
      }
      return false;
    }
    const watched = watching && this.watches.changedSincePause(this).length > 0;
    const stepped =
      this.mode === "line" || (this.mode === "over" && depth <= this.startDepth) || (this.mode === "out" && depth < this.startDepth);
    if (!stepped && !atBreakpoint && !watched) return false;
    this.mode = "run";
    const reason = atBreakpoint ? "breakpoint" : watched ? "watch" : "step";
    this.current = { reason, file: at.file, line: at.line, column: p.col, atNs: this.now(), depth };
    this.watches.snapshot(this);
    for (const cb of this.pauseListeners) cb(this.current);
    return true;
  }
}
