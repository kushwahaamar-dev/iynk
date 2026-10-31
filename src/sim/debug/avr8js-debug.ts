import type { SourceMap } from "../../export/dwarf-lines.ts";
import type { ElfImage } from "../../export/elf.ts";
import type { AvrAdapter, AvrContext, AvrEngine } from "../mcu/avr8js.ts";
import { MAX_BREAKPOINTS, MAX_BREAKPOINTS_PER_FILE, type DebugPort, type FrameInfo, type PauseEvent, type VarInfo } from "./breakpoints.ts";
import { WatchList } from "./watch.ts";

const FLASH_WORDS = 16384;
const RAM_START = 0x100;
const RAM_END = 0x8ff;
const SHOWN_ELEMENTS = 16;

export interface AvrDebugSymbols {
  symbols: ElfImage["symbols"];
  /** Declared type text by global name, from the interpreter's parse of the same sketch. */
  types?: ReadonlyMap<string, string>;
}

function bytesHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Reads a little-endian integer; `signed` sign-extends it. */
function readInt(bytes: Uint8Array, signed: boolean): number {
  let v = 0;
  for (let i = bytes.length - 1; i >= 0; i--) v = v * 256 + (bytes[i] as number);
  return signed && v >= 2 ** (bytes.length * 8 - 1) ? v - 2 ** (bytes.length * 8) : v;
}

/** Text for the bytes of one value, using the declared type when there is one. */
function decode(bytes: Uint8Array, type: string): string {
  const array = /^(.+)\[(\d+)\]$/.exec(type);
  if (array) {
    const count = Number(array[2]);
    const width = count ? Math.floor(bytes.length / count) : 0;
    if (width > 0) {
      const items: string[] = [];
      for (let i = 0; i < Math.min(count, SHOWN_ELEMENTS); i++) items.push(decode(bytes.subarray(i * width, (i + 1) * width), array[1] as string));
      const more = count - items.length;
      return `[${items.join(", ")}${more > 0 ? `, ... ${more} more` : ""}]`;
    }
  }
  if (bytes.length === 4 && type === "float") return String(new DataView(bytes.buffer, bytes.byteOffset, 4).getFloat32(0, true));
  if (bytes.length === 1 || bytes.length === 2 || bytes.length === 4) {
    const signed = !/^(unsigned|uint|bool|byte)/.test(type);
    const v = readInt(bytes, signed);
    if (type === "char") return `'${String.fromCharCode(v & 0xff)}' (${v})`;
    return `${v} (0x${bytesHex(bytes.slice().reverse())})`;
  }
  return bytes.length > SHOWN_ELEMENTS ? `${bytesHex(bytes.subarray(0, SHOWN_ELEMENTS))}...` : bytesHex(bytes);
}

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
  readonly watches = new WatchList();
  private readonly symbols: AvrDebugSymbols;
  private hooked: number[] = [];
  private watchHit = false;

  constructor(engine: AvrEngine, map: SourceMap, symbols: AvrDebugSymbols) {
    this.engine = engine;
    this.map = map;
    this.symbols = symbols;
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
    return {
      frame,
      function: "",
      file: at?.file ?? "",
      line: at?.line ?? 0,
      locals: [],
      localsUnavailable: "fidelity.debug.noSymbols",
      globals: this.globals(),
    };
  }

  readMemory(addr: number, len: number): Uint8Array | null {
    const ctx = this.ctx;
    if (!ctx || addr < RAM_START || addr + len - 1 > RAM_END) return null;
    return ctx.cpu.data.slice(addr, addr + len);
  }

  private globals(): VarInfo[] {
    const out: VarInfo[] = [];
    for (const sym of this.symbols.symbols) {
      if (sym.section !== ".data" && sym.section !== ".bss") continue;
      const address = sym.addr & 0xffff;
      const bytes = this.readMemory(address, sym.size);
      if (!bytes || sym.size === 0) continue;
      const type = this.symbols.types?.get(sym.name) ?? `${sym.size} bytes`;
      out.push({ name: sym.name, type, value: decode(bytes, type), raw: bytesHex(bytes), address });
    }
    return out;
  }

  /** The address ranges the pause-on-change watches cover. */
  private watchedRanges(): Array<{ addr: number; len: number }> {
    const ranges: Array<{ addr: number; len: number }> = [];
    for (const w of this.watches.targets) {
      if (!w.pauseOnChange) continue;
      if (w.target.kind === "mem") ranges.push({ addr: w.target.addr, len: w.target.len });
      else {
        const name = w.target.name;
        const sym = this.symbols.symbols.find((x) => x.name === name && (x.section === ".data" || x.section === ".bss"));
        if (sym) ranges.push({ addr: sym.addr & 0xffff, len: sym.size });
      }
    }
    return ranges;
  }

  /** Writes to watched bytes flag a hit; the pause comes at the next line, where the engine can stop. */
  private hookWrites(): void {
    const hooks = this.ctx?.cpu.writeHooks;
    if (!hooks) return;
    for (const addr of this.hooked) delete hooks[addr];
    this.hooked = [];
    for (const { addr, len } of this.watchedRanges()) {
      for (let a = addr; a < addr + len; a++) {
        hooks[a] = (value, old) => {
          if (value !== old) this.watchHit = true;
        };
        this.hooked.push(a);
      }
    }
  }

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
    this.hookWrites();
    const everyLine = this.mode !== "run" || this.hooked.length > 0;
    const addresses = everyLine ? new Set([...this.breakPcs, ...this.byPc.keys()]) : this.breakPcs;
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
    const watched = this.watchHit;
    if (!atBreakpoint && !watched && !this.stepDone(file, start.line, ctx.cpu.SP)) return;
    this.watchHit = false;
    this.mode = "run";
    this.arm();
    const reason = atBreakpoint ? "breakpoint" : watched ? "watch" : "step";
    this.current = { reason, file, line: start.line, atNs: ctx.cyclesToNs(ctx.cpu.cycles), depth: RAM_END - ctx.cpu.SP };
    this.watches.snapshot(this);
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

export function createAvrDebugger(engine: AvrEngine, map: SourceMap, symbols: AvrDebugSymbols = { symbols: [] }): AvrDebugger {
  return new AvrDebuggerImpl(engine, map, symbols);
}
