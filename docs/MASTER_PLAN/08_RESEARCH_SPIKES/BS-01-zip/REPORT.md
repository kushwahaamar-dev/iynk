# BS-01: zip approach for `.iynkz`

Task T-B3-S1, phase B3. Run on 2026-10-28. Verdict first.

## Verdict

**PASS-own.** All four clauses hold with no new dependency. T-B3-05 writes `src/export/zip.ts` itself. `fflate` is not needed and is not tried.

| Clause | Result |
|---|---|
| (a) identical bytes from two writes, in Node 24, Chromium and WebKit | Holds. Six entries (129,310 bytes) written twice in each engine: all six outputs have SHA-256 `2e607184ad899c6f5fc3a9707ab3c2130c23f197df4ff5ea9f3a812226a6b1d4`. The writer is store-only, so there is no deflate output to drift |
| (b) zips made by Python `zipfile` (deflate level 1 and 9) and by `zip -X` open | Holds, with `zip -X -r -9` (writes directory entries, which the reader skips) and `zip -X -r - .` piped (data descriptors). All four give five files whose bytes equal the source files, in all three engines. The writer's own output passes `python3 -m zipfile -t` and `unzip -t` |
| (c) limits | Holds, see the table. One caveat on the 100 to 1 ratio, below |
| (d) under 600 lines | Holds. The throwaway module is 288 lines (3.2 KB gzip, including the CRC table, the writer, the inflate and the checks) |

## What was built

One ES module, `zip.mjs`, in the scratch folder `/Users/amar/iynk-master-plan-scratch/build/B3-S1/` (full text in the appendix). It has `crc32`, `writeZip`, `inflate` and `readZip`. It uses only `Uint8Array`, `DataView`, `TextEncoder` and `TextDecoder`, with no `DecompressionStream`, no Node import and no DOM type.

- Writer: entries sorted by path (code-unit order), method 0, flags `0x0800` (UTF-8 names), DOS time 00:00:00 and date 1980-01-01, no extra field, no comment, no zip64.
- Inflate: RFC 1951 (stored, fixed and dynamic blocks) written to a buffer of the declared size. A write past that size throws `too_large` at once, so memory never passes the declared size and the output never passes the cap.
- Reader: finds the end record, checks the entry count, reads the central directory (it ignores the local header sizes, so zips with data descriptors work), checks every name, adds up the declared sizes and applies all size and ratio checks before it extracts the first entry. Then it extracts, checks the length and the CRC-32.
- Refused: more than 1,000 entries, an entry over 16 MiB, a total over 128 MiB, `usize > 100 * csize`, `../`, `.` and empty path segments, a leading `/`, a backslash, a drive letter, control characters, invalid UTF-8, duplicate names, names that differ only in case, encryption, zip64, methods other than 0 and 8, truncation, a size or CRC mismatch.

## The ten cases, per engine

Each cell is the error code (or `ok`) and the read time. "Expected" is what the clause demands. Every engine matched the expected code in every row.

| Case | Zip bytes | Expected | Node 24.8 | Chromium 156 | WebKit 27.2 |
|---|---|---|---|---|---|
| valid | 235 | ok | ok (0.4 ms) | ok (0.5 ms) | ok (4.0 ms) |
| nested | 1,378 | ok | ok (0.4 ms) | ok (0.5 ms) | ok (1.0 ms) |
| bomb | 10,307 | ratio | ratio (0.0 ms) | ratio (0.1 ms) | ratio (0.0 ms) |
| bomb_lying | 10,307 | too_large | too_large (0.1 ms) | too_large (0.2 ms) | too_large (0.0 ms) |
| bomb_64mib_declares_1mib | 65,336 | too_large | too_large (2.6 ms) | too_large (2.2 ms) | too_large (4.0 ms) |
| traversal | 113 | bad_path | bad_path (0.0 ms) | bad_path (0.2 ms) | bad_path (0.0 ms) |
| absolute | 121 | bad_path | bad_path (0.0 ms) | bad_path (0.0 ms) | bad_path (0.0 ms) |
| drive | 107 | bad_path | bad_path (0.0 ms) | bad_path (0.0 ms) | bad_path (0.0 ms) |
| duplicate | 180 | duplicate_path | duplicate_path (0.0 ms) | duplicate_path (0.0 ms) | duplicate_path (0.0 ms) |
| case_collision | 208 | case_collision | case_collision (0.0 ms) | case_collision (0.0 ms) | case_collision (0.0 ms) |
| entries_1000 | 84,802 | ok | ok (1.4 ms) | ok (0.8 ms) | ok (1.0 ms) |
| entries_1001 | 84,889 | too_many_entries | too_many_entries (0.0 ms) | too_many_entries (0.0 ms) | too_many_entries (0.0 ms) |
| entry_16mib | 16,777,320 | ok | ok (42 ms) | ok (43 ms) | ok (36 ms) |
| entry_17mib | 17,825,896 | entry_too_large | entry_too_large (0.1 ms) | entry_too_large (0.1 ms) | entry_too_large (0.0 ms) |
| total_144mib | 150,995,686 | total_too_large | total_too_large (0.1 ms) | total_too_large (0.2 ms) | total_too_large (0.0 ms) |
| truncated | 205 | not_a_zip | not_a_zip (0.0 ms) | not_a_zip (0.1 ms) | not_a_zip (0.0 ms) |
| bad_crc | 235 | bad_crc | bad_crc (0.1 ms) | bad_crc (0.1 ms) | bad_crc (0.0 ms) |
| py_deflate1 | 564,913 | ok | ok (10.0 ms) | ok (9.0 ms) | ok (10 ms) |
| py_deflate9 | 543,565 | ok | ok (10 ms) | ok (8.6 ms) | ok (9.0 ms) |
| zip_X | 543,895 | ok | ok (9.8 ms) | ok (7.6 ms) | ok (7.0 ms) |
| zip_stream | 543,979 | ok | ok (6.6 ms) | ok (7.3 ms) | ok (6.0 ms) |
| py_zeros2mib | 2,165 | ratio | ratio (0.0 ms) | ratio (0.0 ms) | ratio (0.0 ms) |


Notes on the rows:

- `bomb` is the clause-(c) bomb: 10 MiB of zeros, deflated to 10,307 bytes, honest header. Refused by the ratio check in under 1 ms with nothing inflated.
- `bomb_lying` has the same data with a header that says 4,096 bytes. The ratio check passes, so the inflate runs and stops when it reaches 4,096 bytes written: 0.2 ms at most.
- `bomb_64mib_declares_1mib` inflates to 64 MiB but declares 1 MiB. It stops at 1 MiB (the declared size, the cap for that entry): 2 to 4 ms. The peak output buffer is the declared size, so no run came near 20 MiB.
- `entry_16mib` (stored, exactly at the limit) reads in 36 to 46 ms, almost all of it the CRC loop.
- `total_144mib` (nine stored 16 MiB entries) is refused from the central directory in under 1 ms. The first version of the reader extracted as it went and needed 316 ms to refuse; the version tested here sums first.
- `truncated` loses the end record, so the code is `not_a_zip`. A cut inside the file with the end record intact would be `truncated`.
- `traversal`, `absolute` and `drive` all give `bad_path`. A `nested` zip with `assets/ab/cd/blob` and `definitions/led@1.json` is accepted.
- Python and `zip` rows: `py_deflate1` 9 to 12 ms, `py_deflate9` 9 to 15 ms, `zip_X` 8 to 14 ms, `zip_stream` 6 to 9 ms for 883,156 bytes inflated, in all engines.

Inflate speed, measured in Node only: 16 MiB of text deflated at level 1 (7.3 MB compressed) inflates in 263 ms; at level 9 (6.7 MB) in 348 ms. Round trips of incompressible data at levels 0, 1 and 9 are byte exact. The bit-at-a-time Huffman decoder (the zlib `puff` method) is fast enough for the 128 MiB ceiling in a worker: about 3 s for the worst case of 128 MiB of deflated text, ESTIMATED from the 16 MiB rate.

## Findings T-B3-05 must act on

1. **The 100 to 1 ratio refuses legitimate files.** A 2 MiB all-zero asset (`py_zeros2mib`, made by Python) and a 5 KB entry of one repeated character both fail it. Real project JSON and assets will usually sit under 20 to 1 (the random-word text asset here is about 2.4 to 1, the random one 1.0 to 1), but a sparse binary such as a blank firmware image can pass 100 to 1. The card says 100 to 1, so the spike enforces it. Recommendation: apply the ratio only to entries whose declared size is over 1 MiB, or leave the decision to Amar; the declared-size cap of 16 MiB and the write-stops-at-declared-size rule already bound memory without it. This is a product decision, not a technical limit.
2. **Directory entries.** `zip -r` writes `assets/`. The reader skips names ending in `/` after the name check; they count toward the 1,000.
3. **Case collision uses `toLowerCase()`**, which is not full Unicode case folding. Names that collide only under folding (for example `ß` and `SS`) are not caught. Good enough because the container's own writer only emits `assets/<sha256>` and fixed names; say so in the code if T-B3-05 keeps it.
4. **Types.** `TextEncoder` and `TextDecoder` are not in the `esnext` lib. If the portable tsconfig (ADR-0014) has no DOM lib, T-B3-05 either adds `@types/node` to that project or writes the 20-line UTF-8 encode and decode by hand. Not tested here because no `src/` file was written.
5. **The file name order** is by UTF-16 code unit (`<` on strings). Python and Node agree with it for the cases tested; if non-BMP names ever matter, sort by encoded bytes instead.
6. **Not tested:** zip64 (refused by design), Firefox (not installed here), zips with a trailing comment longer than 65,535 bytes, 7-Zip and Windows Explorer output, macOS Archive Utility output, a data-descriptor zip with a signature-less descriptor made by another tool.

## Method

Scratch folder `/Users/amar/iynk-master-plan-scratch/build/B3-S1/`. `mk.mjs` builds the hostile zips with a raw builder (lying sizes, bad CRC, 64 MiB deflate stream from `node:zlib`). Python 3.12.6 (`zipfile`, levels 1 and 9) and Info-ZIP `zip` (macOS) built the external ones from a folder holding a 300 KB random file, a 583 KB word-text file, a non-ASCII name, an empty file and a small JSON. `run-node.mjs` and `run-browsers.mjs` (Playwright Chromium 156.0.8078.4 and WebKit 27.2, a static server on port 47311, `page.evaluate` importing the same module) ran every case; the engines' error codes and the writer hash were compared against Node's. No product file was touched and no dependency was added.

## Appendix: the module

```js
const MAX_ENTRIES = 1000
const MAX_ENTRY = 16 * 1024 * 1024
const MAX_TOTAL = 128 * 1024 * 1024
const MAX_RATIO = 100

export class ZipError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c >>> 0
}

export function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function writeZip(files) {
  const enc = new TextEncoder()
  const entries = files
    .map((f) => ({ name: enc.encode(f.path), path: f.path, data: f.data }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  let size = 22
  for (const e of entries) size += 30 + 46 + 2 * e.name.length + e.data.length
  const out = new Uint8Array(size)
  const view = new DataView(out.buffer)
  let pos = 0
  const offsets = []
  for (const e of entries) {
    offsets.push(pos)
    view.setUint32(pos, 0x04034b50, true)
    view.setUint16(pos + 4, 20, true)
    view.setUint16(pos + 6, 0x0800, true)
    view.setUint16(pos + 10, 0, true)
    view.setUint16(pos + 12, 0x0021, true)
    view.setUint32(pos + 14, crc32(e.data), true)
    view.setUint32(pos + 18, e.data.length, true)
    view.setUint32(pos + 22, e.data.length, true)
    view.setUint16(pos + 26, e.name.length, true)
    out.set(e.name, pos + 30)
    out.set(e.data, pos + 30 + e.name.length)
    pos += 30 + e.name.length + e.data.length
  }
  const dirStart = pos
  entries.forEach((e, i) => {
    view.setUint32(pos, 0x02014b50, true)
    view.setUint16(pos + 4, 20, true)
    view.setUint16(pos + 6, 20, true)
    view.setUint16(pos + 8, 0x0800, true)
    view.setUint16(pos + 12, 0, true)
    view.setUint16(pos + 14, 0x0021, true)
    view.setUint32(pos + 16, crc32(e.data), true)
    view.setUint32(pos + 20, e.data.length, true)
    view.setUint32(pos + 24, e.data.length, true)
    view.setUint16(pos + 28, e.name.length, true)
    view.setUint32(pos + 42, offsets[i], true)
    out.set(e.name, pos + 46)
    pos += 46 + e.name.length
  })
  view.setUint32(pos, 0x06054b50, true)
  view.setUint16(pos + 8, entries.length, true)
  view.setUint16(pos + 10, entries.length, true)
  view.setUint32(pos + 12, pos - dirStart, true)
  view.setUint32(pos + 16, dirStart, true)
  return out
}

const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258]
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577]
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
const CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]

function huffman(lengths) {
  const count = new Uint16Array(16)
  for (const l of lengths) count[l]++
  count[0] = 0
  let left = 1
  for (let len = 1; len < 16; len++) {
    left = (left << 1) - count[len]
    if (left < 0) throw new ZipError('bad_deflate')
  }
  const offs = new Uint16Array(16)
  for (let len = 1; len < 15; len++) offs[len + 1] = offs[len] + count[len]
  const symbol = new Uint16Array(lengths.length)
  lengths.forEach((l, s) => {
    if (l) symbol[offs[l]++] = s
  })
  return { count, symbol }
}

let fixedTables
function fixed() {
  if (!fixedTables) {
    const lit = new Uint8Array(288)
    lit.fill(8, 0, 144)
    lit.fill(9, 144, 256)
    lit.fill(7, 256, 280)
    lit.fill(8, 280, 288)
    fixedTables = [huffman(lit), huffman(new Uint8Array(30).fill(5))]
  }
  return fixedTables
}

export function inflate(src, start, end, size) {
  const out = new Uint8Array(size)
  let o = 0
  let p = start
  let bitBuf = 0
  let bitCnt = 0
  const bits = (n) => {
    while (bitCnt < n) {
      if (p >= end) throw new ZipError('bad_deflate')
      bitBuf |= src[p++] << bitCnt
      bitCnt += 8
    }
    const v = bitBuf & ((1 << n) - 1)
    bitBuf >>>= n
    bitCnt -= n
    return v
  }
  const decode = (h) => {
    let code = 0
    let first = 0
    let index = 0
    for (let len = 1; len < 16; len++) {
      code |= bits(1)
      const c = h.count[len]
      if (code - c < first) return h.symbol[index + (code - first)]
      index += c
      first = (first + c) << 1
      code <<= 1
    }
    throw new ZipError('bad_deflate')
  }
  for (let last = 0; !last; ) {
    last = bits(1)
    const type = bits(2)
    if (type === 0) {
      bitBuf = 0
      bitCnt = 0
      if (p + 4 > end) throw new ZipError('bad_deflate')
      const len = src[p] | (src[p + 1] << 8)
      if ((len ^ (src[p + 2] | (src[p + 3] << 8))) !== 0xffff) throw new ZipError('bad_deflate')
      p += 4
      if (p + len > end) throw new ZipError('bad_deflate')
      if (o + len > size) throw new ZipError('too_large')
      out.set(src.subarray(p, p + len), o)
      o += len
      p += len
    } else if (type === 1 || type === 2) {
      let lit, dist
      if (type === 1) [lit, dist] = fixed()
      else {
        const nlen = bits(5) + 257
        const ndist = bits(5) + 1
        const ncode = bits(4) + 4
        if (nlen > 286 || ndist > 30) throw new ZipError('bad_deflate')
        const cl = new Uint8Array(19)
        for (let i = 0; i < ncode; i++) cl[CL_ORDER[i]] = bits(3)
        const clh = huffman(cl)
        const lengths = new Uint8Array(nlen + ndist)
        for (let i = 0; i < lengths.length; ) {
          const sym = decode(clh)
          if (sym < 16) lengths[i++] = sym
          else {
            let prev = 0
            let rep
            if (sym === 16) {
              if (i === 0) throw new ZipError('bad_deflate')
              prev = lengths[i - 1]
              rep = 3 + bits(2)
            } else rep = sym === 17 ? 3 + bits(3) : 11 + bits(7)
            if (i + rep > lengths.length) throw new ZipError('bad_deflate')
            lengths.fill(prev, i, i + rep)
            i += rep
          }
        }
        if (!lengths[256]) throw new ZipError('bad_deflate')
        lit = huffman(lengths.subarray(0, nlen))
        dist = huffman(lengths.subarray(nlen))
      }
      for (;;) {
        const sym = decode(lit)
        if (sym < 256) {
          if (o >= size) throw new ZipError('too_large')
          out[o++] = sym
        } else if (sym === 256) break
        else {
          const li = sym - 257
          if (li >= 29) throw new ZipError('bad_deflate')
          const len = LEN_BASE[li] + bits(LEN_EXTRA[li])
          const di = decode(dist)
          if (di >= 30) throw new ZipError('bad_deflate')
          const d = DIST_BASE[di] + bits(DIST_EXTRA[di])
          if (d > o) throw new ZipError('bad_deflate')
          if (o + len > size) throw new ZipError('too_large')
          for (let i = 0; i < len; i++, o++) out[o] = out[o - d]
        }
      }
    } else throw new ZipError('bad_deflate')
  }
  if (o !== size) throw new ZipError('size_mismatch')
  return out
}

function checkName(name, seen) {
  if (!name || name.startsWith('/') || name.includes('\\') || /^[A-Za-z]:/.test(name) || /[\u0000-\u001f]/.test(name))
    throw new ZipError('bad_path')
  for (const part of name.replace(/\/$/, '').split('/')) if (!part || part === '.' || part === '..') throw new ZipError('bad_path')
  const key = name.toLowerCase()
  if (seen.has(key)) throw new ZipError(seen.get(key) === name ? 'duplicate_path' : 'case_collision')
  seen.set(key, name)
}

export function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new ZipError('not_a_zip')
  const count = view.getUint16(eocd + 10, true)
  const dirSize = view.getUint32(eocd + 12, true)
  const dirStart = view.getUint32(eocd + 16, true)
  if (count === 0xffff || dirSize === 0xffffffff || dirStart === 0xffffffff) throw new ZipError('zip64')
  if (count > MAX_ENTRIES) throw new ZipError('too_many_entries')
  if (dirStart + dirSize > eocd) throw new ZipError('truncated')
  const decoder = new TextDecoder('utf-8', { fatal: true })
  const seen = new Map()
  const files = []
  const metas = []
  let total = 0
  let pos = dirStart
  for (let n = 0; n < count; n++) {
    if (pos + 46 > eocd || view.getUint32(pos, true) !== 0x02014b50) throw new ZipError('truncated')
    const flags = view.getUint16(pos + 8, true)
    const method = view.getUint16(pos + 10, true)
    const crc = view.getUint32(pos + 16, true)
    const csize = view.getUint32(pos + 20, true)
    const usize = view.getUint32(pos + 24, true)
    const nameLen = view.getUint16(pos + 28, true)
    const skip = nameLen + view.getUint16(pos + 30, true) + view.getUint16(pos + 32, true)
    const local = view.getUint32(pos + 42, true)
    if (pos + 46 + skip > eocd) throw new ZipError('truncated')
    let name
    try {
      name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLen))
    } catch {
      throw new ZipError('bad_path')
    }
    pos += 46 + skip
    checkName(name, seen)
    if (name.endsWith('/')) continue
    if (flags & 1) throw new ZipError('encrypted')
    if (method !== 0 && method !== 8) throw new ZipError('unsupported_method')
    if (usize > MAX_ENTRY) throw new ZipError('entry_too_large')
    if (usize > MAX_RATIO * csize) throw new ZipError('ratio')
    total += usize
    if (total > MAX_TOTAL) throw new ZipError('total_too_large')
    metas.push({ name, method, crc, csize, usize, local })
  }
  for (const m of metas) {
    const { local, csize, usize } = m
    if (local + 30 > dirStart || view.getUint32(local, true) !== 0x04034b50) throw new ZipError('truncated')
    const data = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
    if (data + csize > dirStart) throw new ZipError('truncated')
    let content
    if (m.method === 0) {
      if (csize !== usize) throw new ZipError('size_mismatch')
      content = bytes.slice(data, data + csize)
    } else content = inflate(bytes, data, data + csize, usize)
    if (crc32(content) !== m.crc) throw new ZipError('bad_crc')
    files.push({ path: m.name, data: content })
  }
  return files
}
```
