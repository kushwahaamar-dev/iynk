# ADR-0501: Wire protocol version 2: JSON frames, gzip above 4 KiB, closed frame set, versions and codes

Status: proposed, 2026-10-27. Author: realtime-architecture seat.
Upstream: BRIEF 19.5 (WebSocket schemas and reconnection documented separately); R-082; R-087; RS-09; ADR-0104. Spec: REALTIME_ARCHITECTURE 7.

## Problem

The v1 relay accepts any JSON action under 64 KB, a snapshot of up to 512 KiB supplied by another peer, a lab enum in `join`, and client-chosen chat kinds. It has no version negotiation beyond the string `H7`. RS-09 showed that a 10,000-op tail is 1.4 MB raw, too big for a slow link.

## Constraints

1. Browsers and Node only; `ws` stays the server library.
2. Frames validated and rebuilt from known fields (existing rule).
3. Long tails and snapshots must fit BUD-10 on slow links.
4. Additive evolution without breaking old clients.

## Considered options

| Option | Verdict |
|---|---|
| A. JSON text frames, gzip as a per-frame binary variant above 4 KiB | Chosen |
| B. `permessage-deflate` | Rejected: disabled today (`relay.js:59`); documented memory fragmentation in `ws` (EXTERNAL) |
| C. MessagePack or protobuf | Rejected: no measurement shows JSON cost matters; harder to debug; ops are already JSON in the schema |
| D. HTTP long poll plus POST | Rejected: more latency, no server push |

## Decision

JSON text frames with a string `t`. Binary frames start with byte `0x01` and carry gzip of the JSON. Hard inflate caps (512 KiB client to server, 6 MiB snapshots, 256 KiB others). `protocol` major (2), `caps` for optional features, `opSchema` equal MAJOR.MINOR. A closed error-code list and close codes (REALTIME_ARCHITECTURE 7.4). Unknown client frame type is an error, unknown server frame type is ignored.

## Technical justification

RS-09: tail 10,000 ops 1,425 KB raw and 268 KB gzipped; snapshot plus tail 84 KB. At 5 Mbit/s: about 2.3 s raw, 0.4 s gzipped, 0.13 s snapshot (arithmetic). PROJECT_DATA_MODEL 9.6: the largest allowed document gzips to 159 KB.

## Performance data

Gzip ratio 5.3x on RS-09's tail (VERIFIED, 1,425 to 268 KB). Browser inflate cost on phones is UNKNOWN (RT-3, RA-10).

## Cost implications

About 2 to 3 days inside S4. No dependency: Node `zlib`, browser `DecompressionStream`.

## Licensing

None.

## Security implications

A decompression bomb is bounded by the output cap and closes the socket with 4413. Every inbound frame is rebuilt from known fields. Binary frames from clients are allowed only with the gzip marker.

## Reversibility

High. Compression is a capability; JSON stays the base. A later binary encoding is a new capability.

## Migration plan

Slice S4. The v1 `join`, `action`, `state` and `pose` frames are removed; v1 clients receive `upgrade_required` (4426). Lab pages keep v1 until LABS.

## Known limitations

`DecompressionStream` support on older Safari is EXTERNAL and unchecked; a fallback to uncompressed tails would raise reconnect time on slow links.
