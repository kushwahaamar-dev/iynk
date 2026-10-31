import { parseFailure } from "./hex.ts";
import type { ParseResult } from "./hex.ts";

export interface SourceMap {
  files: string[];
  entries: { pc: number; file: number; line: number; column?: number; isStmt: boolean }[];
}

const MAX_SECTION_BYTES = 16 * 1024 * 1024;
const MAX_ROWS = 4_000_000;
const MAX_TABLE_ENTRIES = 4096;
const YIELD_POLL_OPCODES = 4096;
const MAX_ULEB_BYTES = 10;
const MAX_CSTRING_CHARS = 1024;
const MAX_LINE = 0xffffffff;

class LineProgramError extends Error {
  readonly kind: string;
  readonly offset: number;

  constructor(kind: string, message: string, offset: number) {
    super(message);
    this.kind = kind;
    this.offset = offset;
  }
}

class Reader {
  pos = 0;
  readonly bytes: Uint8Array;
  readonly end: number;

  constructor(bytes: Uint8Array, end: number) {
    this.bytes = bytes;
    this.end = end;
  }

  private need(count: number): void {
    if (this.pos + count > this.end) throw new LineProgramError("dwarf-bad-line-program", "The line program reads past its end.", this.pos);
  }

  u8(): number {
    this.need(1);
    return this.bytes[this.pos++] as number;
  }

  i8(): number {
    return (this.u8() << 24) >> 24;
  }

  u16(): number {
    const lo = this.u8();
    return lo | (this.u8() << 8);
  }

  u32(): number {
    this.need(4);
    const b = this.bytes;
    const p = this.pos;
    this.pos += 4;
    return ((b[p] as number) | ((b[p + 1] as number) << 8) | ((b[p + 2] as number) << 16) | ((b[p + 3] as number) << 24)) >>> 0;
  }

  uleb(): number {
    let value = 0;
    for (let i = 0; i < MAX_ULEB_BYTES; i++) {
      const b = this.u8();
      value += (b & 0x7f) * 2 ** (7 * i);
      if (b < 0x80) return value;
    }
    throw new LineProgramError("dwarf-bad-line-program", "A LEB128 number is too long.", this.pos);
  }

  sleb(): number {
    let value = 0;
    for (let i = 0; i < MAX_ULEB_BYTES; i++) {
      const b = this.u8();
      value += (b & 0x7f) * 2 ** (7 * i);
      if (b < 0x80) return b & 0x40 ? value - 2 ** (7 * (i + 1)) : value;
    }
    throw new LineProgramError("dwarf-bad-line-program", "A LEB128 number is too long.", this.pos);
  }

  cstring(): string {
    let out = "";
    for (;;) {
      const c = this.u8();
      if (c === 0) return out;
      if (out.length < MAX_CSTRING_CHARS) out += String.fromCharCode(c);
    }
  }
}

function tooLarge(what: string, at: number): LineProgramError {
  return new LineProgramError("dwarf-too-large", `${what} is larger than the import limit.`, at);
}

function fileName(name: string, dir: number, dirs: string[]): string {
  const prefix = dir > 0 ? dirs[dir - 1] : undefined;
  return prefix ? `${prefix}/${name}` : name;
}

function readUnit(data: Uint8Array, start: number, map: SourceMap, o: { shouldYield?: () => boolean }): { next: number; work: number } {
  const header = new Reader(data, data.length);
  header.pos = start;
  const unitLength = header.u32();
  if (unitLength === 0xffffffff) throw new LineProgramError("dwarf-bad-line-program", "64-bit DWARF is not supported.", start);
  const unitEnd = header.pos + unitLength;
  if (unitEnd > data.length) {
    throw unitLength > MAX_SECTION_BYTES
      ? tooLarge("A line program", start)
      : new LineProgramError("dwarf-bad-line-program", "A line program is longer than the section.", start);
  }
  const r = new Reader(data, unitEnd);
  r.pos = header.pos;
  const version = r.u16();
  if (version < 2 || version > 4) throw new LineProgramError("dwarf-bad-line-program", `DWARF line version ${version} is not supported.`, start);
  const headerLength = r.u32();
  const programStart = r.pos + headerLength;
  if (programStart > unitEnd) throw new LineProgramError("dwarf-bad-line-program", "The line header is longer than its program.", start);
  const minInst = r.u8();
  if (version >= 4) r.u8();
  const defaultIsStmt = r.u8() !== 0;
  const lineBase = r.i8();
  const lineRange = r.u8();
  const opcodeBase = r.u8();
  if (lineRange === 0) throw new LineProgramError("dwarf-bad-line-program", "The line range is zero.", r.pos);
  const opLengths: number[] = [0];
  for (let i = 1; i < opcodeBase; i++) opLengths.push(r.u8());

  const dirs: string[] = [];
  for (let dir = r.cstring(); dir !== ""; dir = r.cstring()) {
    if (dirs.length >= MAX_TABLE_ENTRIES) throw tooLarge("The directory table", r.pos);
    dirs.push(dir);
  }
  const fileBase = map.files.length;
  const fileCount = () => map.files.length - fileBase;
  for (let name = r.cstring(); name !== ""; name = r.cstring()) {
    if (fileCount() >= MAX_TABLE_ENTRIES) throw tooLarge("The file table", r.pos);
    const dir = r.uleb();
    r.uleb();
    r.uleb();
    map.files.push(fileName(name, dir, dirs));
  }
  r.pos = programStart;

  let work = 0;
  let nextPoll = YIELD_POLL_OPCODES;
  let address = 0;
  let file = 1;
  let line = 1;
  let column = 0;
  let isStmt = defaultIsStmt;

  const emit = () => {
    if (file < 1 || file > fileCount()) throw new LineProgramError("dwarf-bad-line-program", "A row names a file that is not in the file table.", r.pos);
    if (map.entries.length >= MAX_ROWS) throw tooLarge("The line table", r.pos);
    map.entries.push({ pc: address, file: fileBase + file - 1, line, column, isStmt });
  };
  const advanceLine = (delta: number) => {
    line += delta;
    if (line < 0 || line > MAX_LINE) throw new LineProgramError("dwarf-bad-line-program", "A line number is out of range.", r.pos);
  };

  while (r.pos < unitEnd) {
    work++;
    if (work >= nextPoll) {
      o.shouldYield?.();
      nextPoll += YIELD_POLL_OPCODES;
    }
    const op = r.u8();
    if (op >= opcodeBase) {
      const adjusted = op - opcodeBase;
      address = (address + Math.floor(adjusted / lineRange) * minInst) >>> 0;
      advanceLine(lineBase + (adjusted % lineRange));
      emit();
    } else if (op === 0) {
      const len = r.uleb();
      const extEnd = r.pos + len;
      if (len === 0 || extEnd > unitEnd) throw new LineProgramError("dwarf-bad-line-program", "An extended opcode has a bad length.", r.pos);
      const sub = r.u8();
      if (sub === 1) {
        address = 0;
        file = 1;
        line = 1;
        column = 0;
        isStmt = defaultIsStmt;
      } else if (sub === 2) {
        const width = len - 1;
        if (width < 1 || width > 4) throw new LineProgramError("dwarf-bad-line-program", "An address operand has an unsupported width.", r.pos);
        address = 0;
        for (let i = 0; i < width; i++) address += r.u8() * 2 ** (8 * i);
      } else if (sub === 3) {
        if (fileCount() >= MAX_TABLE_ENTRIES) throw tooLarge("The file table", r.pos);
        const name = r.cstring();
        const dir = r.uleb();
        r.uleb();
        r.uleb();
        map.files.push(fileName(name, dir, dirs));
      }
      r.pos = extEnd;
    } else if (op === 1) {
      emit();
    } else if (op === 2) {
      address = (address + r.uleb() * minInst) >>> 0;
    } else if (op === 3) {
      advanceLine(r.sleb());
    } else if (op === 4) {
      file = r.uleb();
    } else if (op === 5) {
      column = r.uleb();
    } else if (op === 6) {
      isStmt = !isStmt;
    } else if (op === 8) {
      address = (address + Math.floor((255 - opcodeBase) / lineRange) * minInst) >>> 0;
    } else if (op === 9) {
      address = (address + r.u16()) >>> 0;
    } else if (op === 7 || op === 10 || op === 11) {
      continue;
    } else if (op === 12) {
      r.uleb();
    } else {
      for (let i = 0; i < (opLengths[op] as number); i++) r.uleb();
    }
  }
  return { next: unitEnd, work };
}

export function parseLines(debugLine: Uint8Array, o: { shouldYield?: () => boolean }): ParseResult<SourceMap> {
  if (debugLine.length > MAX_SECTION_BYTES) return parseFailure("dwarf-too-large", "The .debug_line section is larger than 16 MiB.");
  const map: SourceMap = { files: [], entries: [] };
  let work = 0;
  try {
    for (let at = 0; at < debugLine.length; ) {
      const unit = readUnit(debugLine, at, map, o);
      at = unit.next;
      work += unit.work;
    }
  } catch (e) {
    if (e instanceof LineProgramError) return parseFailure(e.kind, e.message, e.offset);
    throw e;
  }
  return { ok: true, value: map, workUnits: work };
}
