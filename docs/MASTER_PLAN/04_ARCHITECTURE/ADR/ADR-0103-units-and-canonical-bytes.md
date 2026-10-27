# ADR-0103: Base units with named exceptions; RFC 8785 canonical JSON and one state hash

Status: proposed, 2026-10-27. Author: project-data-model seat.
Upstream: BRIEF 8.3 ("canonical units, deterministic serialization"); audit A12 (float drift across engines, VERIFIED); R-026; DET-3, DET-4; the component schema's `unit` list. Spec: PROJECT_DATA_MODEL 4 and 6.

## Problem

Two separate questions with one shared goal, "same content, same bytes":

1. Which units do stored numbers use, so a resistor of `220` is never read as 0.22 kilo-ohm and a 2.54 mm pitch is never read as 2.54 m?
2. How is the document turned into bytes so that two tabs, two buddies and two tools get the same hash for the same content?

The audit measured that `Math.sin`, `cos`, `atan2` and `exp` give different last-bit results in Node, Chromium and WebKit, and a simulation state drifted by 1 ulp within 12 steps (A12, VERIFIED). So no stored value may be the output of a trig call.

## Constraints

1. Use the same units as the component schema (`component.schema.json` `unit` enum), so documents and parts never convert.
2. Keep `Check` and `WorldEvent` reusable: the catalogue writes times in milliseconds (audit D1).
3. Hand-editable and diffable (plain decimals).
4. One hash function for store, file, room snapshot and tests (R-026).
5. Cheap: BUD-08 asks for under 50 ms autosave at 500 parts.

## Considered options

Units:

| Option | Verdict |
|---|---|
| A. Plain numbers in base units, unit named by the field or by the part descriptor; five named exceptions (mm, degree, degC, gram, ms) | Chosen |
| B. Tagged values `{value, unit}` everywhere | Rejected: 3x the bytes, every reader must convert |
| C. Strings with prefixes (`"10k"`, `"2.2u"`) | Rejected: ambiguous (`m` milli or mega), parse cost, and the component spec forbids prefixes |
| D. Integers in a fixed micro-unit | Rejected for the stored form (Q1 in PROJECT_DATA_MODEL 14.2 asks Amar); equal determinism, worse readability |

Bytes:

| Option | Verdict |
|---|---|
| E. RFC 8785 JCS: sorted keys, ECMAScript numbers, minimal escapes | Chosen |
| F. Deterministic CBOR (RFC 8949 4.2) | Rejected: binary, not diffable |
| G. Home-made sorted JSON | Rejected: undefined number and escape rules; two implementations would disagree |
| H. Hash a structural walk with no text form | Rejected: cannot reproduce the hash with `sha256sum` on a file |

## Decision

1. Stored quantities are plain numbers in the component schema's base units. Named exceptions, each with a reason: millimetre (breadboard pitch, figures, component schema), degree, degC (all catalogue ambient values are Celsius), gram (component schema), millisecond for authored timelines (catalogue checks). Engine time is integer nanoseconds (`tNs`) and appears only in replay logs and traces.
2. Numbers are finite; `-0` becomes `0`; writers quantise lengths to 0.001 mm and angles to 0.01 degree before printing, and never store a value computed by trigonometry.
3. Canonical form is RFC 8785. The on-disk form is the same value indented. Sets are sorted by a stated key; sequences keep order (PROJECT_DATA_MODEL 6.2). No `null`. NFC for names, ids and paths, not for source code. UTF-8, no BOM.
4. `stateHash = SHA-256(canonical(document without history, exports, meta.updatedAt, revision))`. The chain hash for ops is `sha256(previous + canonical(envelope))`.

## Technical justification

- Quantising before printing makes the printed decimal short and exact: `Math.round(v * 1000) / 1000` is the nearest double to a three-decimal number, whose shortest round-trip form is that decimal. The test vector in PROJECT_DATA_MODEL 6.3 shows `0.1 + 0.2` printing `0.30000000000000004` and the quantised `0.3` printing `0.3`.
- The same JCS output is reproducible by any standard implementation, which matters for the self-hosted server and for tools outside the app.
- Excluding `history` and `exports` removes a circularity (a checkpoint stores the hash of the state it follows) and makes a trimmed and an untrimmed copy of one state hash equal.
- Excluding `revision` (review fix of 2026-10-27) is what makes "undo, restore and checkpoint restore return to the earlier hash" true: each of them appends ops, so `revision` always differs. The hash identifies content; order is compared with `revision` separately (API `If-Match` carries the hash, `revision_regression` guards order). The first draft included `revision` and its examples only reproduced with it; the example hashes and the canonical test vector in PROJECT_DATA_MODEL 6.3 and 9.6 were recomputed.

## Performance data

VERIFIED on Apple M4 Pro, Node 24.8.0, median of 20, scratch `design/data-model/validate/bench.mjs`. The implementation is a 20-line recursive function; a library would not change the order of magnitude.

| Components / nets | Canonical bytes | Canonicalise | Canonicalise + SHA-256 |
|---|---|---|---|
| 500 / 1,000 | 340,175 | 3.42 ms | 3.84 ms |
| 2,000 / 5,000 | 1,642,929 | 16.45 ms | 18.50 ms |

R-026 proposes under 20 ms at 500 parts and 1,000 wires: met with about 5x headroom here. ESTIMATED by 4x scaling (RS-01 and RS-03 only throttle CPU as a proxy): about 15 ms and 74 ms on a slow device, so hashing runs in the worker at save, checkpoint, file write and room snapshot, not per keystroke. SHA-256 itself is about 0.4 ms of the 3.84 ms at 500 components; the rest is canonicalisation.

## Cost implications

None. Option held in reserve: per-section hashing (hash each top-level section, then the list of hashes) to recompute only touched sections. It changes the hash definition, so it is a MAJOR bump; adopt only if a real-device measurement misses BUD-08.

## Licensing

RFC 8785 is an open specification (EXTERNAL). SHA-256 comes from WebCrypto in browsers and `node:crypto` on the server; no package.

## Security implications

Canonical bytes make signing and comparison unambiguous. The hash detects accidents, not tampering (anyone can recompute it), and the docs say so. Quantisation removes float noise as a covert channel for differences between replicas. The parser rejects duplicate keys, which `JSON.parse` would silently resolve (two readers could otherwise disagree about content).

## Reversibility

Units: a change of unit convention is a MAJOR bump with a numeric migration per field (mechanical). Canonical form: a MAJOR bump that rewrites all hashes; old checkpoints keep their own `schemaVersion` and are migrated on restore. Both are contained because every writer goes through one serialiser.

## Migration plan

1. One module exports `canonical()`, `pretty()` and `stateHash()`, used by the store, the file writer, the room and the tests (R-026).
2. The conversion script quantises catalogue values on the way in (figure coordinates are already in millimetres).
3. CI runs the order-independence property test (1,000 random documents) and the test vectors.

## Known limitations

- Decimal quantisation differs from R-026's "numbers as integers" (Objection O-3, Q1).
- `1e23` prints as `1e+23`, per ECMAScript; other languages must follow RFC 8785, not their default float format.
- Authored times in milliseconds mean two time units exist (ms authored, ns in replay); the field names say which (`Ms`, `tNs`).
- JCS sorts keys by UTF-16 code unit; ids and keys are ASCII so this never differs from byte order here, but free-text keys (`LocalizedText` locale tags) are ASCII by pattern too.
- A hash match across different engine builds is only promised for stored data; simulation hashes need the same engine build (PROJECT_DATA_MODEL 7.6).
