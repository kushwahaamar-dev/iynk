# ADR-0507: Presence, cursors and chat are ephemeral channels, batched by the server

Status: proposed, 2026-10-27. Author: realtime-architecture seat.
Upstream: BRIEF 14 (cursors, presence); SECURITY_BASELINE R7, R8; R-075, R-092; F-116, F-117, F-108. Spec: REALTIME_ARCHITECTURE 10.

## Problem

Cursors go to every peer at up to 20 Hz (`config.js:11`), 1,120 frames per second in an 8-person room (ESTIMATED). Cursor coordinates are page fractions that break under pan and zoom. Chat `kind` is chosen by the client (R7) and has no per-chat limit (R8).

## Constraints

1. Presence must never change the document.
2. Low-end devices and slow links (D-011).
3. Chat is for friends; no retention beyond a short backlog.

## Considered options

| Option | Verdict |
|---|---|
| A. Ephemeral frames; server batches cursors at 15 Hz; cursor in view millimetres | Chosen |
| B. Presence inside the document or the op log | Rejected: pollutes history and audit |
| C. Peer to peer WebRTC data channel | Rejected: NAT traversal and a TURN server are more setup than a friends server allows |

## Decision

`presence` patches (5 per second), `cursor` up (15 Hz, burst 10) and `cursors` batch down (15 Hz), chat 2 per second with a server-set kind (`text` or `system`), last 50 lines in memory. Spectator cursors off by default. Coordinates are mm per view quantised to 0.1 mm. Lossy frames are dropped above 256 KiB queued.

## Technical justification

Batching cuts frames by about 9x (1,120 to 120 per second per room, ESTIMATED) and bytes to about 19 KB/s outbound.

## Performance data

ESTIMATED only; RA-11 measures.

## Cost implications

S6, a few days with the UI.

## Licensing

None.

## Security implications

Closes R7 and R8. Text is rendered as text. Names and statuses pass the existing junk stripping.

## Reversibility

High.

## Migration plan

S6.

## Known limitations

No voice (LATER). A member alone sees no cursors. Presence is not replayed after reconnect; the current list is resent.
