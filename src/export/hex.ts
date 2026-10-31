export interface HexImage {
  flash: Uint8Array;
  usedRanges: [number, number][];
  bytes: number;
}

export type ParseError = { kind: string; offset?: number; message: string };

export type ParseResult<T> = { ok: true; value: T; workUnits: number } | { ok: false; error: ParseError };

export interface ParseOptions {
  flashBytes: number;
  shouldYield?: () => boolean;
}

/** The logical heap an import may account for, in bytes. */
export const IMPORT_HEAP_BYTES = 64 * 1024 * 1024;

const HEX_EXTRA_TEXT_BYTES = 1_048_576;
const MAX_LINE_CHARS = 523;
const YIELD_POLL_CHARS = 64 * 1024;
const MIN_RECORD_CHARS = 11;

export function parseFailure(kind: string, message: string, offset?: number): { ok: false; error: ParseError } {
  return { ok: false, error: offset === undefined ? { kind, message } : { kind, offset, message } };
}

function hexDigit(code: number): number {
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 65 && code <= 70) return code - 55;
  if (code >= 97 && code <= 102) return code - 87;
  return -1;
}

/** Decodes one record line (without the colon) into bytes, or returns undefined on a bad digit. */
function decodeRecord(line: string): Uint8Array | undefined {
  const bytes = new Uint8Array((line.length - 1) >> 1);
  for (let i = 0; i < bytes.length; i++) {
    const hi = hexDigit(line.charCodeAt(1 + i * 2));
    const lo = hexDigit(line.charCodeAt(2 + i * 2));
    if (hi < 0 || lo < 0) return undefined;
    bytes[i] = (hi << 4) | lo;
  }
  return bytes;
}

function usedRangesOf(written: Uint8Array): [number, number][] {
  const ranges: [number, number][] = [];
  let start = -1;
  for (let i = 0; i <= written.length; i++) {
    const set = i < written.length && written[i] === 1;
    if (set && start < 0) start = i;
    if (!set && start >= 0) {
      ranges.push([start, i]);
      start = -1;
    }
  }
  return ranges;
}

export function parseHex(text: string, o: ParseOptions): ParseResult<HexImage> {
  const { flashBytes } = o;
  if (text.length > flashBytes + HEX_EXTRA_TEXT_BYTES) {
    return parseFailure("hex-too-large", `The hex file has ${text.length} characters, more than the limit of ${flashBytes + HEX_EXTRA_TEXT_BYTES}.`);
  }
  if (flashBytes * 2 > IMPORT_HEAP_BYTES) {
    return parseFailure("hex-too-large", "The flash size does not fit the import heap limit.");
  }
  const flash = new Uint8Array(flashBytes).fill(0xff);
  const written = new Uint8Array(flashBytes);
  let base = 0;
  let total = 0;
  let sawEof = false;
  let nextPoll = YIELD_POLL_CHARS;
  let lineStart = 0;
  let work = 0;

  while (lineStart < text.length && !sawEof) {
    let lineEnd = text.indexOf("\n", lineStart);
    if (lineEnd < 0) lineEnd = text.length;
    const next = lineEnd + 1;
    if (lineEnd > lineStart && text.charCodeAt(lineEnd - 1) === 13) lineEnd--;
    const line = text.slice(lineStart, lineEnd);
    const at = lineStart;
    lineStart = next;
    work++;
    if (lineStart >= nextPoll) {
      o.shouldYield?.();
      nextPoll = lineStart + YIELD_POLL_CHARS;
    }
    if (line.length === 0) continue;
    if (line.length > MAX_LINE_CHARS) return parseFailure("hex-bad-record", "A line is longer than 523 characters.", at);
    if (line.charCodeAt(0) !== 58 || line.length < MIN_RECORD_CHARS || line.length % 2 === 0) {
      return parseFailure("hex-bad-record", "A line is not an Intel HEX record.", at);
    }
    const rec = decodeRecord(line);
    if (!rec) return parseFailure("hex-bad-record", "A record has a character that is not a hex digit.", at);
    const len = rec[0] as number;
    if (rec.length !== len + 5) return parseFailure("hex-bad-record", "A record length does not match its byte count.", at);
    let sum = 0;
    for (const b of rec) sum = (sum + b) & 0xff;
    if (sum !== 0) return parseFailure("hex-bad-checksum", "A record checksum is wrong.", at);

    const addr = ((rec[1] as number) << 8) | (rec[2] as number);
    const type = rec[3] as number;
    if (type === 0) {
      const start = base + addr;
      if (start + len > flashBytes) return parseFailure("hex-out-of-flash", `A data record writes past the ${flashBytes} bytes of flash.`, at);
      for (let i = 0; i < len; i++) {
        if (written[start + i] === 1) return parseFailure("hex-overlap", "Two records write the same address.", at);
        written[start + i] = 1;
        flash[start + i] = rec[4 + i] as number;
      }
      total += len;
    } else if (type === 1) {
      if (len !== 0) return parseFailure("hex-bad-record", "The end-of-file record has data.", at);
      sawEof = true;
    } else if (type === 2 || type === 4) {
      if (len !== 2) return parseFailure("hex-bad-record", "An address record must hold two bytes.", at);
      const value = ((rec[4] as number) << 8) | (rec[5] as number);
      base = type === 2 ? value * 16 : value * 65536;
    } else if (type === 3 || type === 5) {
      if (len !== 4) return parseFailure("hex-bad-record", "A start-address record must hold four bytes.", at);
    } else {
      return parseFailure("hex-bad-record", `Unknown record type ${type}.`, at);
    }
  }

  if (!sawEof) return parseFailure("hex-no-eof", "The hex file has no end-of-file record.");
  return { ok: true, value: { flash, usedRanges: usedRangesOf(written), bytes: total }, workUnits: work };
}
