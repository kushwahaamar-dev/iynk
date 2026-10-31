import type { SourceMap } from "../../export/dwarf-lines.ts";
import type { AvrAdapter, AvrContext, AvrEngine } from "../mcu/avr8js.ts";
import { MAX_BREAKPOINTS, MAX_BREAKPOINTS_PER_FILE, type DebugPort, type FrameInfo, type PauseEvent } from "./breakpoints.ts";

const FLASH_WORDS = 16384;
const RAM_END = 0x8ff;

interface LineStart {
  pc: number;
  file: number;
  line: number;
}

export interface BoundBreakpoint {
  file: string;
  line: number;
}

export interface AvrDebugger extends DebugPort, AvrAdapter {
  /** Lines without code bind to the next line that has some; `bound` lists where each requested line ended up. */
  setBreakpoints(file: string, lines: number[]): { bound: BoundBreakpoint[] };
}

/** The byte address where each run of instructions for one source line begins, in address order. */
function lineStarts(map: SourceMap): LineStart[] {
  const entries = map.entries.filter((e) => e.isStmt).sort((a, b) => a.pc - b.pc);
  const starts: LineStart[] = [];
  for (const e of entries) {
    const last = starts[starts.length - 1];
    if (last && last.pc === e.pc) {
      last.file = e.file;
      last.line = e.line;
    } else if (!last || last.file !== e.file || last.line !== e.line) starts.push({ pc: e.pc, file: e.file, line: e.line });
  }
  return starts;
}

function fileIndexes(map: SourceMap, file: string): Set<number> {
  const found = new Set<number>();
  map.files.forEach((name, i) => {
    if (name === file || name.endsWith(`/${file}`)) found.add(i);
  });
  return found;
}

/** Byte addresses at the start of each range of code for a line. */
export function lineToPcs(map: SourceMap, file: string, line: number): number[] {
  const files = fileIndexes(map, file);
  return lineStarts(map)
    .filter((s) => s.line === line && files.has(s.file))
    .map((s) => s.pc);
}

/** The line the byte address belongs to, or null before the first line entry. */
export function pcToLine(map: SourceMap, pc: number): { file: string; line: number } | null {
  let best: LineStart | null = null;
  for (const s of lineStarts(map)) {
    if (s.pc > pc) break;
    best = s;
  }
  return best ? { file: map.files[best.file] as string, line: best.line } : null;
}

type Mode = "run" | "line" | "over" | "out";

class AvrDebuggerImpl implements AvrDebugger {
  readonly id = "debug:avr";
  private ctx: AvrContext | null = null;
  private current: PauseEvent | null = null;
  private mode: Mode = "run";
  private from: { file: string; line: number } | null = null;
  private fromSp = 0;
  private readonly requested = new Map<string, number[]>();
  private readonly listeners: Array<(e: PauseEvent) => void> = [];
  private readonly engine: AvrEngine;
  private readonly map: SourceMap;
  private readonly starts: LineStart[];
  private readonly byPc = new Map<number, LineStart>();
  private breakPcs = new Set<number>();

  constructor(engine: AvrEngine, map: SourceMap) {
    this.engine = engine;
    this.map = map;
    this.starts = lineStarts(map);
    for (const s of this.starts) this.byPc.set(s.pc, s);
    engine.onBreak = (pc) => this.onBreak(pc);
    engine.addAdapter(this);
  }

  get paused(): PauseEvent | null {
    return this.current;
  }

  attach(ctx: AvrContext): void {
    this.ctx = ctx;
    this.current = null;
    this.mode = "run";
    this.arm();
  }

  setBreakpoints(file: string, lines: number[]): { bound: BoundBreakpoint[] } {
    const wanted = [...new Set(lines.filter((l) => Number.isInteger(l) && l > 0))].slice(0, MAX_BREAKPOINTS_PER_FILE);
    this.requested.set(file, wanted);
    if (!wanted.length) this.requested.delete(file);
    const bound: BoundBreakpoint[] = [];
    this.rebuild(file, bound);
    return { bound };
  }

  step(unit: "line" | "over" | "out"): void {
    const at = this.current;
    if (!at || !this.ctx) return;
    this.from = { file: at.file, line: at.line };
    this.fromSp = this.ctx.cpu.SP;
    this.mode = unit;
    this.current = null;
    this.arm();
  }

  resume(): void {
    this.mode = "run";
    this.current = null;
    this.arm();
  }

  inspect(frame: number): FrameInfo {
    const at = this.current;
    return { frame, function: "", file: at?.file ?? "", line: at?.line ?? 0, locals: [], globals: [] };
  }

  watch(): void {}

  onPause(cb: (e: PauseEvent) => void): void {
    this.listeners.push(cb);
  }

  /** Recomputes the break addresses of every requested file; `bound` collects where the lines of `report` landed. */
  private rebuild(report: string, bound: BoundBreakpoint[]): void {
    const pcs = new Set<number>();
    let total = 0;
    for (const [file, lines] of this.requested) {
      const files = fileIndexes(this.map, file);
      for (const line of lines) {
        if (total >= MAX_BREAKPOINTS) break;
        const target = this.nextLineWithCode(files, line);
        if (target === null) continue;
        total++;
        if (file === report) bound.push({ file, line: target });
        for (const s of this.starts) if (s.line === target && files.has(s.file)) pcs.add(s.pc);
      }
    }
    this.breakPcs = pcs;
    this.arm();
  }

  private nextLineWithCode(files: Set<number>, line: number): number | null {
    let best: number | null = null;
    for (const s of this.starts) if (files.has(s.file) && s.line >= line && (best === null || s.line < best)) best = s.line;
    return best;
  }

  /** The engine checks the bitmap only when one is set, so it stays null with nothing to stop on. */
  private arm(): void {
    const addresses = this.mode === "run" ? this.breakPcs : new Set([...this.breakPcs, ...this.byPc.keys()]);
    if (addresses.size === 0) {
      this.engine.breakBitmap = null;
      return;
    }
    const bitmap = new Uint8Array(FLASH_WORDS >> 3);
    for (const byte of addresses) {
      const word = byte >> 1;
      if (word < FLASH_WORDS) bitmap[word >> 3] |= 1 << (word & 7);
    }
    this.engine.breakBitmap = bitmap;
  }

  private onBreak(word: number): void {
    const ctx = this.ctx;
    const start = this.byPc.get(word * 2);
    if (!ctx || !start) return;
    const file = this.map.files[start.file] as string;
    const atBreakpoint = this.breakPcs.has(start.pc);
    if (!atBreakpoint && !this.stepDone(file, start.line, ctx.cpu.SP)) return;
    this.mode = "run";
    this.arm();
    this.current = { reason: atBreakpoint ? "breakpoint" : "step", file, line: start.line, atNs: ctx.cyclesToNs(ctx.cpu.cycles), depth: RAM_END - ctx.cpu.SP };
    for (const cb of this.listeners) cb(this.current);
  }

  private stepDone(file: string, line: number, sp: number): boolean {
    const from = this.from;
    const moved = !from || from.file !== file || from.line !== line;
    if (this.mode === "line") return moved;
    if (this.mode === "over") return moved && sp >= this.fromSp;
    return this.mode === "out" && sp > this.fromSp;
  }
}

export function createAvrDebugger(engine: AvrEngine, map: SourceMap): AvrDebugger {
  return new AvrDebuggerImpl(engine, map);
}
