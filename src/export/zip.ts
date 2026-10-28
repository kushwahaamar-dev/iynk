import { utf8Encode } from "../core/canonical.ts";
import { LIMITS } from "../core/limits.ts";
import { fail, ok } from "../core/result.ts";
import type { Result } from "../core/result.ts";

export const ZIP_LIMITS = Object.freeze({
  entries: 1000,
  entryBytes: 16_777_216,
  totalBytes: LIMITS.containerBytes,
  ratio: 100,
  ratioFloorBytes: 1_048_576,
});

export type ZipErrorCode =
  | "not_a_zip"
  | "truncated"
  | "zip64"
  | "encrypted"
  | "unsupported_method"
  | "bad_deflate"
  | "size_mismatch"
  | "bad_crc"
  | "bad_path"
  | "duplicate_path"
  | "case_collision"
  | "too_many_entries"
  | "entry_too_large"
  | "total_too_large"
  | "ratio"
  | "inflate_overrun";

export interface ZipFailure {
  code: ZipErrorCode;
  message: string;
  path?: string;
  limit?: string;
}

export interface ZipFile {
  path: string;
  data: Uint8Array;
}

class ZipAbort extends Error {
  readonly failure: ZipFailure;

  constructor(code: ZipErrorCode, message: string, extra: { path?: string; limit?: string } = {}) {
    super(message);
    this.name = "ZipAbort";
    this.failure = { code, message, ...extra };
  }
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Strict UTF-8 to string, written by hand because the portable lib has no `TextDecoder`. Returns null for invalid
 * bytes: overlong forms, surrogates, code points above U+10FFFF and truncated sequences. A leading BOM is kept.
 */
export function utf8Decode(bytes: Uint8Array): string | null {
  const parts: string[] = [];
  let chunk: number[] = [];
  const flush = () => {
    parts.push(String.fromCharCode(...chunk));
    chunk = [];
  };
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let cp: number;
    let extra: number;
    let min: number;
    if (b < 0x80) {
      cp = b;
      extra = 0;
      min = 0;
    } else if (b >= 0xc2 && b <= 0xdf) {
      cp = b & 0x1f;
      extra = 1;
      min = 0x80;
    } else if (b >= 0xe0 && b <= 0xef) {
      cp = b & 0x0f;
      extra = 2;
      min = 0x800;
    } else if (b >= 0xf0 && b <= 0xf4) {
      cp = b & 0x07;
      extra = 3;
      min = 0x10000;
    } else return null;
    if (i + extra >= bytes.length) return null;
    for (let k = 1; k <= extra; k++) {
      const next = bytes[i + k];
      if ((next & 0xc0) !== 0x80) return null;
      cp = (cp << 6) | (next & 0x3f);
    }
    if (cp < min || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return null;
    i += extra + 1;
    if (cp >= 0x10000) {
      const v = cp - 0x10000;
      chunk.push(0xd800 + (v >> 10), 0xdc00 + (v & 0x3ff));
    } else chunk.push(cp);
    if (chunk.length >= 4096) flush();
  }
  flush();
  return parts.join("");
}

const sortKey = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Store-only zip: entries sorted by path, UTF-8 names, timestamp 1980-01-01 00:00, no extra fields, no comment.
 * Equal input gives equal bytes, in every engine, because no compressor is involved.
 */
export function writeZip(files: readonly ZipFile[]): Uint8Array {
  const entries = files
    .map((f) => ({ path: f.path, name: utf8Encode(f.path), data: f.data, crc: crc32(f.data) }))
    .sort((a, b) => sortKey(a.path, b.path));
  let size = 22;
  for (const e of entries) size += 30 + 46 + 2 * e.name.length + e.data.length;
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  const offsets: number[] = [];
  let pos = 0;
  for (const e of entries) {
    offsets.push(pos);
    view.setUint32(pos, 0x04034b50, true);
    view.setUint16(pos + 4, 20, true);
    view.setUint16(pos + 6, 0x0800, true);
    view.setUint16(pos + 12, 0x0021, true);
    view.setUint32(pos + 14, e.crc, true);
    view.setUint32(pos + 18, e.data.length, true);
    view.setUint32(pos + 22, e.data.length, true);
    view.setUint16(pos + 26, e.name.length, true);
    out.set(e.name, pos + 30);
    out.set(e.data, pos + 30 + e.name.length);
    pos += 30 + e.name.length + e.data.length;
  }
  const dirStart = pos;
  entries.forEach((e, i) => {
    view.setUint32(pos, 0x02014b50, true);
    view.setUint16(pos + 4, 20, true);
    view.setUint16(pos + 6, 20, true);
    view.setUint16(pos + 8, 0x0800, true);
    view.setUint16(pos + 14, 0x0021, true);
    view.setUint32(pos + 16, e.crc, true);
    view.setUint32(pos + 20, e.data.length, true);
    view.setUint32(pos + 24, e.data.length, true);
    view.setUint16(pos + 28, e.name.length, true);
    view.setUint32(pos + 42, offsets[i], true);
    out.set(e.name, pos + 46);
    pos += 46 + e.name.length;
  });
  view.setUint32(pos, 0x06054b50, true);
  view.setUint16(pos + 8, entries.length, true);
  view.setUint16(pos + 10, entries.length, true);
  view.setUint32(pos + 12, pos - dirStart, true);
  view.setUint32(pos + 16, dirStart, true);
  return out;
}

const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

interface Huffman {
  count: Uint16Array;
  symbol: Uint16Array;
}

const badDeflate = (): ZipAbort => new ZipAbort("bad_deflate", "the compressed data is damaged");

function huffman(lengths: Uint8Array): Huffman {
  const count = new Uint16Array(16);
  for (const l of lengths) count[l]++;
  count[0] = 0;
  let left = 1;
  for (let len = 1; len < 16; len++) {
    left = (left << 1) - count[len];
    if (left < 0) throw badDeflate();
  }
  const offsets = new Uint16Array(16);
  for (let len = 1; len < 15; len++) offsets[len + 1] = offsets[len] + count[len];
  const symbol = new Uint16Array(lengths.length);
  lengths.forEach((l, s) => {
    if (l) symbol[offsets[l]++] = s;
  });
  return { count, symbol };
}

let fixedTables: [Huffman, Huffman] | undefined;

function fixed(): [Huffman, Huffman] {
  if (!fixedTables) {
    const lit = new Uint8Array(288);
    lit.fill(8, 0, 144);
    lit.fill(9, 144, 256);
    lit.fill(7, 256, 280);
    lit.fill(8, 280, 288);
    fixedTables = [huffman(lit), huffman(new Uint8Array(30).fill(5))];
  }
  return fixedTables;
}

/**
 * RFC 1951 inflate into a buffer of exactly `size` bytes. A write past `size` throws at once, so the output never
 * passes the size the entry declared, whatever the stream holds.
 */
function inflate(src: Uint8Array, start: number, end: number, size: number, path: string): Uint8Array {
  const out = new Uint8Array(size);
  const overrun = () =>
    new ZipAbort("inflate_overrun", `${path} inflates past its declared ${size} bytes`, { path, limit: `${size} bytes` });
  let o = 0;
  let p = start;
  let bitBuf = 0;
  let bitCount = 0;
  const bits = (n: number): number => {
    while (bitCount < n) {
      if (p >= end) throw badDeflate();
      bitBuf |= src[p++] << bitCount;
      bitCount += 8;
    }
    const v = bitBuf & ((1 << n) - 1);
    bitBuf >>>= n;
    bitCount -= n;
    return v;
  };
  const decode = (h: Huffman): number => {
    let code = 0;
    let first = 0;
    let index = 0;
    for (let len = 1; len < 16; len++) {
      code |= bits(1);
      const c = h.count[len];
      if (code - c < first) return h.symbol[index + (code - first)];
      index += c;
      first = (first + c) << 1;
      code <<= 1;
    }
    throw badDeflate();
  };
  const dynamicTables = (): [Huffman, Huffman] => {
    const nlen = bits(5) + 257;
    const ndist = bits(5) + 1;
    const ncode = bits(4) + 4;
    if (nlen > 286 || ndist > 30) throw badDeflate();
    const codeLengths = new Uint8Array(19);
    for (let i = 0; i < ncode; i++) codeLengths[CODE_LENGTH_ORDER[i]] = bits(3);
    const clh = huffman(codeLengths);
    const lengths = new Uint8Array(nlen + ndist);
    for (let i = 0; i < lengths.length; ) {
      const sym = decode(clh);
      if (sym < 16) {
        lengths[i++] = sym;
        continue;
      }
      let prev = 0;
      let rep: number;
      if (sym === 16) {
        if (i === 0) throw badDeflate();
        prev = lengths[i - 1];
        rep = 3 + bits(2);
      } else rep = sym === 17 ? 3 + bits(3) : 11 + bits(7);
      if (i + rep > lengths.length) throw badDeflate();
      lengths.fill(prev, i, i + rep);
      i += rep;
    }
    if (!lengths[256]) throw badDeflate();
    return [huffman(lengths.subarray(0, nlen)), huffman(lengths.subarray(nlen))];
  };
  for (let last = 0; !last; ) {
    last = bits(1);
    const type = bits(2);
    if (type === 0) {
      bitBuf = 0;
      bitCount = 0;
      if (p + 4 > end) throw badDeflate();
      const len = src[p] | (src[p + 1] << 8);
      if ((len ^ (src[p + 2] | (src[p + 3] << 8))) !== 0xffff) throw badDeflate();
      p += 4;
      if (p + len > end) throw badDeflate();
      if (o + len > size) throw overrun();
      out.set(src.subarray(p, p + len), o);
      o += len;
      p += len;
      continue;
    }
    if (type === 3) throw badDeflate();
    const [lit, dist] = type === 1 ? fixed() : dynamicTables();
    for (;;) {
      const sym = decode(lit);
      if (sym < 256) {
        if (o >= size) throw overrun();
        out[o++] = sym;
      } else if (sym === 256) break;
      else {
        const li = sym - 257;
        if (li >= 29) throw badDeflate();
        const len = LEN_BASE[li] + bits(LEN_EXTRA[li]);
        const di = decode(dist);
        if (di >= 30) throw badDeflate();
        const d = DIST_BASE[di] + bits(DIST_EXTRA[di]);
        if (d > o) throw badDeflate();
        if (o + len > size) throw overrun();
        for (let i = 0; i < len; i++, o++) out[o] = out[o - d];
      }
    }
  }
  if (o !== size) throw new ZipAbort("size_mismatch", `${path} inflates to ${o} bytes, not the declared ${size}`, { path });
  return out;
}

const badPath = (name: string, why: string): ZipAbort =>
  new ZipAbort("bad_path", `${JSON.stringify(name)} ${why}`, { path: name });

/**
 * Names that two readers could resolve differently are refused. Case collisions are found with `toLowerCase`, which
 * is not full Unicode case folding; the container only writes `assets/<sha256>` and fixed names, so that is enough.
 */
function checkName(name: string, seen: Map<string, string>): void {
  if (!name) throw badPath(name, "is empty");
  if (name.startsWith("/")) throw badPath(name, "is absolute");
  if (name.includes("\\")) throw badPath(name, "has a backslash");
  if (/^[A-Za-z]:/.test(name)) throw badPath(name, "starts with a drive letter");
  if (/[\u0000-\u001f]/.test(name)) throw badPath(name, "has a control character");
  for (const part of name.replace(/\/$/, "").split("/")) {
    if (part === "" || part === "." || part === "..") throw badPath(name, "has an empty, . or .. segment");
  }
  const key = name.toLowerCase();
  const earlier = seen.get(key);
  if (earlier !== undefined) {
    throw new ZipAbort(
      earlier === name ? "duplicate_path" : "case_collision",
      earlier === name ? `${name} appears twice` : `${earlier} and ${name} differ only in case`,
      { path: name },
    );
  }
  seen.set(key, name);
}

interface Meta {
  name: string;
  method: number;
  crc: number;
  csize: number;
  usize: number;
  local: number;
}

function readEntries(bytes: Uint8Array): ZipFile[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ZipAbort("not_a_zip", "this is not a zip file, or it is cut short");
  const count = view.getUint16(eocd + 10, true);
  const dirSize = view.getUint32(eocd + 12, true);
  const dirStart = view.getUint32(eocd + 16, true);
  if (count === 0xffff || dirSize === 0xffffffff || dirStart === 0xffffffff) {
    throw new ZipAbort("zip64", "zip64 archives are not supported");
  }
  if (count > ZIP_LIMITS.entries) {
    throw new ZipAbort("too_many_entries", `${count} entries; the limit is ${ZIP_LIMITS.entries}`, {
      limit: `${ZIP_LIMITS.entries} entries`,
    });
  }
  if (dirStart + dirSize > eocd) throw new ZipAbort("truncated", "the directory runs past the end of the file");

  const seen = new Map<string, string>();
  const metas: Meta[] = [];
  let total = 0;
  let pos = dirStart;
  for (let n = 0; n < count; n++) {
    if (pos + 46 > eocd || view.getUint32(pos, true) !== 0x02014b50) {
      throw new ZipAbort("truncated", "a directory record is missing or damaged");
    }
    const flags = view.getUint16(pos + 8, true);
    const method = view.getUint16(pos + 10, true);
    const crc = view.getUint32(pos + 16, true);
    const csize = view.getUint32(pos + 20, true);
    const usize = view.getUint32(pos + 24, true);
    const nameLength = view.getUint16(pos + 28, true);
    const skip = nameLength + view.getUint16(pos + 30, true) + view.getUint16(pos + 32, true);
    const local = view.getUint32(pos + 42, true);
    if (pos + 46 + skip > eocd) throw new ZipAbort("truncated", "a directory record runs past the directory");
    const name = utf8Decode(bytes.subarray(pos + 46, pos + 46 + nameLength));
    if (name === null) throw badPath("", "is not valid UTF-8");
    pos += 46 + skip;
    checkName(name, seen);
    if (name.endsWith("/")) continue;
    if (flags & 1) throw new ZipAbort("encrypted", "encrypted entries are not supported", { path: name });
    if (method !== 0 && method !== 8) {
      throw new ZipAbort("unsupported_method", `${name} uses compression method ${method}`, { path: name });
    }
    if (usize > ZIP_LIMITS.entryBytes) {
      throw new ZipAbort("entry_too_large", `${name} is ${usize} bytes; the limit is ${ZIP_LIMITS.entryBytes}`, {
        path: name,
        limit: "16 MiB per entry",
      });
    }
    if (usize > ZIP_LIMITS.ratioFloorBytes && usize > ZIP_LIMITS.ratio * csize) {
      throw new ZipAbort("ratio", `${name} would inflate ${usize} bytes from ${csize}; the limit is ${ZIP_LIMITS.ratio} to 1`, {
        path: name,
        limit: `${ZIP_LIMITS.ratio} to 1`,
      });
    }
    total += usize;
    if (total > ZIP_LIMITS.totalBytes) {
      throw new ZipAbort("total_too_large", `the entries add up to more than ${ZIP_LIMITS.totalBytes} bytes`, {
        limit: "128 MiB in total",
      });
    }
    metas.push({ name, method, crc, csize, usize, local });
  }

  const files: ZipFile[] = [];
  for (const m of metas) {
    const { local, csize, usize } = m;
    if (local + 30 > dirStart || view.getUint32(local, true) !== 0x04034b50) {
      throw new ZipAbort("truncated", `the data of ${m.name} is missing`, { path: m.name });
    }
    const data = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    if (data + csize > dirStart) throw new ZipAbort("truncated", `the data of ${m.name} is cut short`, { path: m.name });
    let content: Uint8Array;
    if (m.method === 0) {
      if (csize !== usize) throw new ZipAbort("size_mismatch", `${m.name} is stored with two different sizes`, { path: m.name });
      content = bytes.slice(data, data + csize);
    } else content = inflate(bytes, data, data + csize, usize, m.name);
    if (crc32(content) !== m.crc) throw new ZipAbort("bad_crc", `${m.name} does not match its checksum`, { path: m.name });
    files.push({ path: m.name, data: content });
  }
  return files;
}

/**
 * Reads a zip made by this writer, Python `zipfile` or Info-ZIP. Every limit is checked on the directory before the
 * first byte is inflated, and the inflate itself stops at the size the entry declared. Directory entries are skipped.
 */
export function readZip(bytes: Uint8Array): Result<ZipFile[], ZipFailure> {
  try {
    return ok(readEntries(bytes));
  } catch (error) {
    if (error instanceof ZipAbort) return fail(error.failure);
    throw error;
  }
}
