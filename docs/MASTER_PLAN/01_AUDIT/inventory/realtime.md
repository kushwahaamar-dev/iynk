# Realtime rooms (relay server, client, protocol, Together pages, deployment)

**Paths:** `server/realtime/**`, `deploy/realtime/**`, `scripts/realtime-deploy.sh`, `scripts/realtime-vultr-create.sh`, `src/lib/realtime/**`, `src/components/realtime/**`, `src/app/[lang]/together/**`, `docs/hacktx/REALTIME.md`
**Entry points:** relay `server/realtime/server.js` (`node server.js --port N`); client `src/lib/realtime/index.ts` (`RoomProvider`, `useRoom`, `probeRoom`); mount point `src/components/dock/LabRoom.tsx`; page `src/app/[lang]/together/page.tsx`
**LOC:** VERIFIED by `wc -l` over every file in scope except `package-lock.json` and `node_modules`: **7,938 lines**. Split: relay source 1,289 (`cat server/realtime/server.js server/realtime/src/*.js | wc -l`), relay tests 1,119, client lib source 2,220, client lib tests plus fixture 867, components 1,201, together pages 805, deploy plus scripts 291, plus `REALTIME.md` 97.
**Owner today:** `docs/ARCHITECTURE.md:131` lists it under the "hackathon layer (D14d)" (`src/lib/realtime/**`, `src/components/realtime/**`, `/[lang]/together`). `REALTIME.md:3` names the owners `hx:realtime-server` and `hx:realtime-client` (agent roles, not people). No human maintainer is named. Amar operates the VM.

## Purpose

Lets two to eight people look at the same lab page (a board, a robotics bench or a drone) and work on it together: shared build actions in one order, a keyboard "baton", chat with machine translation, cursors, presence and (for drones) flight poses. A relay in Node + `ws` orders the actions. With no relay URL configured, tabs of one browser run the same protocol over `BroadcastChannel`. The `/together` page is the lobby: start a room on a catalogue item, join by code, plus two AI features (Build Buddies, Build Night planner) that call `/api/*` routes and are not part of the relay.

## Dependencies (imports in, imports out; third-party packages)

- **Relay** (VERIFIED, `server/realtime/package.json`): one runtime dependency, `ws@8.22.0`; Node >= 24 (`engines`); dev: `typescript`, `@types/*`. It imports nothing from the Next app. Self-contained.
- **Client lib imports out** (VERIFIED by reading): `@/i18n/config`, `@/components/dock/types` (LabKind, LabStore), `@/lib/telemetry`, `@/lib/progress`, `@/lib/features`, `@/i18n/client`. `shared-actions.ts` has type-only imports of the three lab stores' action unions (`@/lib/boardlab/store`, `@/lib/robotics/store`, `@/lib/dronelab/store`).
- **Imports in** (who uses it): `src/components/dock/LabRoom.tsx` (wraps lab pages), `LabDock.tsx`, `src/lib/ai/session-log.ts`, `src/components/ai/useBuildLog.ts`, `src/lib/sound/react.tsx` (via `isHydrating`), the `/together` pages. `LabRoom` is used on the board, board lesson, robotics bench and drone fly pages (`grep -rn LabRoom src`).
- **Stores must cooperate:** each lab store handles an action `sync/hydrate` (`src/lib/boardlab/store.ts:307`, `src/lib/robotics/store.ts:296`, `src/lib/dronelab/store.ts:114`). Without it a store cannot take a snapshot.
- **External routes:** `/api/ai/translate` (chat translation), `/api/ai/transcribe` (push-to-talk voice, `VoiceButton.tsx`), `/api/buddies`, `/api/ai/match`, `/api/ai/plan` (lobby).
- **Infra:** Docker, `caddy:2.11.7-alpine`, `node:24.22.1-alpine`, Vultr API v2, Ubuntu 24.04.

## Public interfaces (exported functions/types/components/messages, with path:line)

**Wire protocol** (JSON text frames over WebSocket path `/ws`; spec in `docs/hacktx/REALTIME.md`, validator `server/realtime/src/protocol.js`, client types `src/lib/realtime/protocol.ts:36-77`). VERIFIED by reading both.

| Direction | Frame `t` | Fields (validated at) | Notes |
|---|---|---|---|
| C to S | `join` | `room` (6 chars of a 31-char alphabet), `peer{id,name,color,lang,role?,status?,baton?,done?}`, `lab?`, `itemId?`, `since?`, `epoch?` (`protocol.js:157-170`) | must be first, within 10 s |
| C to S | `action` | `action{type: string 1-64, ...anything}` (`protocol.js:172-180`) | only `type` is checked; the rest is relayed unvalidated, up to 64 KB |
| C to S | `state` | `to`, `seq`, `snapshot` (any JSON) (`protocol.js:181-187`) | answer to `snapshot-request`; up to 512 KB + 1 KB |
| C to S | `chat` | `id,text(<=500),lang,kind` (`protocol.js:188`) | kind is `text/voice/ai/system`, client-claimed |
| C to S | `cursor`, `pose`, `presence`, `kick`, `ping` | `protocol.js:196-230` | `pose` = 3-vector `p`, 4-vector `q`, optional `v`, `gate` |
| S to C | `welcome` | `you,room,peers,host,seq,lab,itemId,epoch,sync('none'/'snapshot'/'replay')` (`relay.js:279-293`) | |
| S to C | `peer`, `leave`, `host`, `action{from,seq}`, `snapshot-request`, `state`, `chat{ts,name}`, `cursor`, `presence`, `pose`, `pong`, `error{code}` | | `from` and `seq` are stamped by the server, so they cannot be spoofed in an action |

- **Versioning:** there is no protocol version field in any frame. Evolution is by "additive" optional fields (`since`, `epoch`, `sync` are marked additive, `protocol.ts:37`, `types.ts:1-2`). The only version number is `RoomSnapshot.v: 1` inside the snapshot payload (`room.ts:28`, checked at `room.ts:558`). The relay's parsers rebuild each frame from known fields (unknown fields dropped) and reject unknown `t` with `bad_type`. There is no negotiation for a mixed-version deploy. VERIFIED.
- **Close codes:** 1008, 1009, 1012, 1013, 4000, 4001, 4003, 4004, 4009, 4010 (table in `REALTIME.md:80-97`).
- **HTTP:** `GET /healthz`, `GET /metrics` (`relay.js:215-232`), 426 on `/ws` without upgrade.
- **Client API:** `RoomProvider`, `useRoom()`, `useTogether()`, `useIdentity()` (`provider.tsx:68-120`); `createRoom`, `roomLink`, `parseRoomInput`, `withRoom`, `transportKind` (`config.ts`); `probeRoom` (`probe.ts:18`); `isHydrating` (`store-sync.ts:29`); `attachStore` (`store-sync.ts:45`); `RoomClient` (`room.ts:97`); `RoomApi` (`types.ts:56-85`); `Transport` (`transport.ts:11`); `labSync` (`shared-actions.ts:129`).
- **Env:** `NEXT_PUBLIC_REALTIME_URL` (build-time inlined, `config.ts:9`, `src/lib/server/env.ts:47`). Relay: `PORT`, `HOST`, `LOG_LEVEL`, `REALTIME_ALLOWED_ORIGINS`, `TRUST_PROXY`, `MAX_ROOMS`, `MAX_CONNECTIONS`, `MAX_CONNECTIONS_PER_IP` (`config.js:76-93`).

## State ownership and persistence (stores, localStorage keys, server state, DB tables)

- **Relay state is memory only** (`relay.js:29` "Nothing is stored outside memory"). Per room (`room.js:19-45`): ordered peer map (first = host), `seq` counter, `epoch` id, bound `lab`/`itemId`, an action log (max 2048 entries or 1 MB of frame text), last 50 chat frames, a ban set (64), `emptySince`. Process-wide: `rooms` map, `conns` set, per-IP counters. No database, no file, no volume. A process restart or `docker compose up --build` drops every room. VERIFIED: `close()` calls `rooms.clear()` (`relay.js:597`); the relay service in `deploy/realtime/compose.yaml:9-26` mounts no volume (only Caddy has volumes).
- **Room expiry:** a room with zero peers is deleted after 30 min (`PROTOCOL.roomTtlMs`, `config.js:14`; `sweep()` at `relay.js:506`). A room with at least one connected peer never expires.
- **What is shared:** a hand-written whitelist of lab-store actions per lab (`shared-actions.ts:56-83`): board 18 types, robotics 11, drone 11 (counted from the arrays). Plus `room/baton` and `room/baton-request` pseudo-actions that the room client interprets itself (`room.ts:588-603`). Not shared: camera, tabs, hover, quiz, interpreter ticks, figure reports, check results (`shared-actions.ts:1-9`). A snapshot is the whole lab-store state wrapped as `{v:1, lab, itemId, state:{scope,state}, baton}` (`room.ts:535-541`, `store-sync.ts:114`), produced by whichever synced peer the relay asks (normally the host). So the sync unit is "store actions in total order, plus full-state snapshot for late joiners". It is not document diffing.
- **Scope:** one room spans one lab item; each action and snapshot carries the page path with the language stripped, and a client drops other pages' actions (`store-sync.ts:127`, `pageScope` in `config.ts:51`).
- **Client persistence:** `localStorage["iynk:together:v1"]` = `{v:1,name,color}` (`identity.ts:6,61`). The room id lives in the URL `?room=` only (`provider.tsx:18-46`). The peer id is a fresh random 12-char id per page mount (`provider.tsx:160`), not stored. Chat history is in `RoomClient` memory (cap 200, `room.ts:58`). Translation cache is module memory (`translate.ts:10`).
- **Tabs fallback state:** per tab only; channel name `iynk-room-<id>` (`broadcast-transport.ts:157`).

## Current functionality (what VERIFIED works, how you know)

- **Relay test suite passes.** `cd server/realtime && npm test` gave 39 tests, 39 pass, 0 fail, 5.8 s on this Mac (Node v24.8.0). VERIFIED (ran it). `npx tsc -p tsconfig.json` (checkJs, strict) exits 0. VERIFIED.
- **Client tests pass.** `npx vitest run src/lib/realtime` gave 4 files, 18 tests, all pass. VERIFIED.
- **Ordering model** (VERIFIED, `relay.js:381-386`, `room.js:62-79`): one relay process is the sequencer. Every `action` frame gets `++room.seq` and goes to all synced peers including the sender. Clients apply only in seq order (`room.ts:570-586`), and the sender does not apply its own action until the echo returns (code edits are the exception, below). There is no per-document concurrency control: the single total order is the conflict resolution. Two peers acting at once get whichever order the relay received them in; both are applied by everyone.
- **Host authority:** the host is the first peer in the Map (`room.js:47`). It matters for three things: `kick` is allowed only from the host (`relay.js:417`), it is the default snapshot provider, and it is the default baton holder when nobody holds it (`room.ts:338-341`). It does not order or validate actions. On host leave the next-oldest peer becomes host (`relay.js:439-441`; tested in `host.test.js`).
- **Keyboard baton** (VERIFIED, `store-sync.ts:94-110, 126-138`): non-free build actions are refused locally unless you hold the baton, and on apply only actions from the holder at that point in the order count. The baton moves by a sequenced `room/baton` action, so all clients agree on the holder at each seq. Free actions (view, select, serial send, input) work for everyone. Code edits are applied locally at once by the holder, then sent as a full-text `code/replace` after a 200 ms debounce (max wait 800 ms), and everyone else replaces their text with it. That is last-writer-wins on whole text, safe only because one peer at a time may type.
- **Join, snapshot, reconnect semantics** (VERIFIED by reading `relay.js:219-299`, `pump` 306-332, `onState` 365-381; matched by `snapshot.test.js`, which passes):
  - A new joiner gets `welcome.sync = "snapshot"`; the relay sends `snapshot-request` to the earliest synced peer, holds all actions for the joiner, then sends `state` followed by every logged action after the snapshot's `seq`. 5 s timeout per provider, then the next provider; if all fail the joiner is closed with 4010.
  - If nobody holds state, the earliest waiting joiner is "promoted" and keeps its own state (`state` frame with `snapshot:null`).
  - Reconnect: the client sends `since` (last applied seq) and `epoch`; if the epoch matches and the log still reaches back to `since+1`, the relay replays missed actions with no snapshot (`room.js:100-105`). Otherwise the snapshot path. After a relay restart the epoch differs, so all clients take the snapshot path; the first to reconnect is promoted and its local state becomes the room's state.
  - The WebSocket client reconnects with exponential backoff 500 ms to 15 s with jitter, re-sends `join` with the same peer id, and re-sends its queued outbox (`ws-transport.ts:58-67`, `room.ts:165-173, 529`).
  - The same peer id on a new socket replaces the old one and keeps its place and host role (`relay.js:248-257`).
- **Limits** (VERIFIED, `config.js:3-39`; each has a test in `limits.test.js`, which passes): 8 peers per room; 64 KB per frame, 512 KB snapshot; 60 frames/s/peer token bucket (`bucket.js`, 22 lines, `take(now)`); cursor and pose 20 Hz with burst 10, dropped silently; 600 drops in 5 s closes the socket (1008); 500 rooms, 2000 connections, 64 connections per IP; send buffer: lossy frames skipped above 256 KB, peer cut off above 4 MB; heartbeat 15 s, dead after 45 s; join timeout 10 s; action log 2048 entries or 1 MB; chat backlog 50.
- **Tabs fallback** (VERIFIED by reading `broadcast-transport.ts`; tested by `transports.test.ts` "three tabs agree on one host and one order"): when `NEXT_PUBLIC_REALTIME_URL` is empty, `transportKind()` returns `"broadcast"` (`config.ts:16-19`). Each tab runs a mini relay on a channel named after the room id; the tab with the oldest join timestamp is host and stamps `seq`; non-hosts send `up` frames to the host. Limits: same browser profile and origin only, 8 members, no rate limits, no history log (a late tab gets the host's snapshot only), host tab loss drops unsequenced actions, re-election on `bye` or 70 s timeout. It is a demo/offline mode, not a cross-device path.
- **Load test** (`server/realtime/test/load.js`; I ran it twice, VERIFIED): one process spawns the relay and 8 raw WebSocket peers in ONE room, each sending `load/tick` actions at a fixed rate. At 60 actions/s per peer for 10 s: 4,800 sent, 38,400 of 38,400 expected deliveries, 0 gaps, 0 rate-limit errors, send-to-echo latency p50 0.88 ms, p90 7.3 ms, p99 41.1 ms, max 69.8 ms; relay RSS 63 MB at the midpoint. At 50/s: p50 0.75, p99 7.8, max 23.7 ms, RSS 81 MB. What it does NOT show: it is loopback on a 14-core Mac (`sysctl -n hw.ncpu` = 14), not a 1 vCPU VM over a WAN; it uses a single room (not many rooms, no log memory pressure); payloads are about 50 bytes, not up to 64 KB; no reconnect storm; no chat or cursors in the mix; no soak. It proves correctness of the total order at 480 actions/s inbound in one room and nothing about the production VM.
- **Together page:** SSR page with the lobby (start a room on a catalogue item, join by code via a probe join, `Lobby.tsx`). Buddies and Planner call AI routes and are hidden when the AI feature is off (`Lobby.tsx:131-135`). I did not run the UI in a browser. End-to-end behaviour of the React layer is UNKNOWN to me; that rooms work on iynk.tech is DOCUMENTED in HANDOFF.md, not tested by me.

## Known defects (with repro or evidence)

| # | Defect | Where | Evidence | Severity |
|---|---|---|---|---|
| 1 | **Peer-id takeover: anyone with the room code can become host and kick people.** Peer ids are client-chosen, are sent to every member in `welcome.peers`, and a `join` with an id already in the room silently replaces that peer and inherits its place and host role. No proof of possession. | `relay.js:231,248-257`; `protocol.js:11` | VERIFIED by running an in-process relay (script `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/audit/realtime/hijack.mjs`): host and guest join; a third socket joins with `peer.id = "hostid"`; the old host socket receives `error:replaced`; the attacker's welcome says `host: "hostid"`; the attacker sends `kick` for the guest; the guest receives `error:kicked`. | high |
| 2 | **Kick is trivially evaded.** The ban list is keyed by peer id, and the client generates a new random id on every page mount, so a reload gets a new id. | `room.js:122-127` (`ban`), `relay.js:230`, `provider.tsx:160` | VERIFIED by reading: the ban check compares `msg.peer.id` only; no IP or token. | medium |
| 3 | **Hidden listeners.** A peer joining with `status:"lobby"` is hidden from every client's peer list and ignored for snapshot requests (`PROBE_STATUS` filter), but the relay treats it as a full member: it receives chat, actions and presence and occupies one of the 8 seats. The join-by-code probe is therefore a stealth-observer primitive. | `room.ts:425,499`; `probe.ts:41`; `relay.js:219-299` (no special case) | VERIFIED: in the repro for #1 the `lobby`-status socket was accepted, got the host's welcome and was allowed to `kick`. Chat visibility follows from `broadcast()` sending to all peers (`relay.js:157`). | medium |
| 4 | **`room/baton` is not authorized by the receiver.** Anyone can sequence `{type:"room/baton", to:<self>}`; `applyOne` sets the baton without checking the sender. The holder check exists only in the sender-side `passBaton()` (`room.ts:224-229`). A modified client can seize the keyboard. | `room.ts:588-596` | VERIFIED by reading; not run in a browser (needs a modified client; the relay sequences any `type`). | medium |
| 5 | **Oversized frame wedges the outbox.** `flush()` stops at the first frame the transport refuses. The WS transport refuses anything over 64 KB (`ws-transport.ts:144-145`) and nothing removes that frame, so later actions, chat and presence queue behind it until 500 more frames push it out (`OUTBOX_LIMIT`, `room.ts:391`). Example: a `code/replace` with more than 64 KB of text silently kills that peer's sharing, with no error shown. | `room.ts:396-411`, `ws-transport.ts:141-147` | VERIFIED by reading; `transports.test.ts:192` confirms `send` returns false over 64 KB; the outbox consequence has no test. | medium |
| 6 | **Snapshot over 512 KB fails silently.** `answerSnapshot` ignores the `false` from `transport.send`. The joiner waits 5 s, the relay asks the next peer, and finally closes the joiner with 4010 `snapshot_unavailable`. A big enough lab state makes the room impossible to join. | `room.ts:533-543`, `relay.js:333-345` | VERIFIED by reading. Real state sizes are UNKNOWN (not measured). | medium |
| 7 | **Divergence is never detected.** Clients apply the same action stream to their own reducers, and several actions drive local simulation (`run/start`, `bench/run`, `test/run`, `cli/run`). There is no state hash, periodic resync or divergence check. `grep -rniE "checksum\|digest\|resync\|diverg" src/lib/realtime server/realtime/src` finds only the IP-tag hash. `drain()` also silently skips a sequence hole (`room.ts:573-577`). | `room.ts:570-586` | VERIFIED that no check exists. Whether the stores diverge in practice is a HYPOTHESIS. | medium |
| 8 | **Takeover fight loop in the client.** After `replaced` (4001) the client does not end the session (`replaced` is not in `END_CODES`, `room.ts:61-68`), and the WS transport reconnects on any close (`ws-transport.ts:115-120`), taking the seat back; two sockets with one id then alternate with backoff. | `room.ts:61-68`, `ws-transport.ts:115` | VERIFIED by reading; not run. | low |
| 9 | **Two baton mechanisms.** The relay implements a presence-based baton (`onPresence`/`clearBatons`, `relay.js:390-413`, `protocol.js:206`) that the client never uses (`setPresence` strips `baton`, `room.ts:203-213`; the baton travels as an action). The server one is dead weight and a second source of truth. | as listed | VERIFIED by reading. | low |
| 10 | **Deploy naming drift:** the VM's compose project is still `simlab-realtime` in `/opt/simlab-realtime` while the repo uses `iynk-realtime` and `/opt/iynk-realtime`; HANDOFF requires a manual `docker compose down` before the next deploy. | `deploy/realtime/compose.yaml:3`, `scripts/realtime-deploy.sh:21`, `HANDOFF.md:183` | DOCUMENTED, not checked on the VM. | low |

## Technical debt (table: item, path, evidence, severity, effort guess)

| Item | Path | Evidence | Severity | Effort |
|---|---|---|---|---|
| Protocol has no version field or capability negotiation | `protocol.js`, `protocol.ts` | additive-only comments; no `version` in any frame | high (blocks safe evolution) | S |
| Protocol defined twice (JS validator + TS types), no shared schema or contract test beyond the integration test | `server/realtime/src/protocol.js` vs `src/lib/realtime/protocol.ts` | constants duplicated (`MAX_PEERS`, alphabet, limits) | medium | M |
| Relay is JS + JSDoc, client is TS; two test runners (node:test vs vitest) | `server/realtime/package.json` | scripts | low | M |
| Relay is one 630-line `createRelay` closure holding rooms, join, snapshot pump, backpressure and HTTP | `relay.js` | `wc -l` = 630 | medium | M |
| Lab names hard-coded in relay (`LABS`) and client (`LabKind`) | `protocol.js:7`, `shared-actions.ts:127` | adding a project kind needs edits in both | high for a builder | S-M |
| Shared-action whitelists are hand-maintained strings per lab | `shared-actions.ts:56-83` | a new store action needs a manual entry | medium | S |
| `store.dispatch` is monkey-patched (`target.dispatch = intercept`) and wrapped again in `LabRoom.stableStore` | `store-sync.ts:143`, `LabRoom.tsx:46-70` | two layers of dispatch wrapping | medium | M |
| Server-side presence baton is dead code | `relay.js:390-413` | defect 9 | low | S |
| AI calls (translate, transcribe) live inside the realtime client/components | `translate.ts`, `VoiceButton.tsx` | cross-concern | low | S |
| `NEXT_PUBLIC_REALTIME_URL` inlined at build time, so moving the relay needs a site rebuild | `config.ts:9` | `process.env.NEXT_PUBLIC_*` | low | S |
| Deploy builds the image on the 1 vCPU production VM via rsync + `docker compose up --build` | `realtime-deploy.sh:91-97` | script | medium | M |

## Test coverage (which test files, what they really check: hardware-derived reference values vs self-consistency with the implementation)

No hardware is involved in this subsystem. All tests are behavioural self-consistency tests of the protocol, which is the right kind here. VERIFIED by reading names and running.

| File | Tests | What it checks |
|---|---|---|
| `server/realtime/test/protocol.test.js` (298 lines) | part of 39 | frame validation, join rules, binary and oversize frames, errors, name sanitising, log hygiene (no chat text in logs) |
| `snapshot.test.js` | 8 | snapshot then replay, resume with since/epoch, stale or ahead snapshot, host leaving mid-request, silent host timeout, 4010 |
| `limits.test.js` | 7 | 9th peer 4004, 64 KB and 512 KB caps, 60 fps bucket, flood 1008, 20 Hz stream drop, join timeout, room/connection caps |
| `host.test.js`, `ordering.test.js`, `expiry.test.js` | 3, 2, 4 | host succession, takeover keeps host (the behaviour behind defect 1 is tested as a feature), concurrent actions gapless, room TTL, peer timeout, graceful drain |
| `test/load.js` | script | see load test above; not run by `npm test`; whether CI runs it is UNKNOWN (not checked) |
| `src/lib/realtime/room.test.ts` (328 lines) | 9 | ordering and convergence of 3 clients, snapshot join, host handover, reconnect, baton, chat, kick |
| `relay.integration.test.ts` | 2 | real relay plus real `RoomClient` plus WS transport via `__fixtures__/relay.ts` |
| `transports.test.ts` | 4 | BroadcastChannel agreement, WS reconnect and backoff, 64 KB refusal |
| `config.test.ts` | 2 | `withRoom` link round trip |

Total: 39 relay tests (46 test or describe calls by grep), 18 client tests. **Not covered:** the React layer (`provider.tsx`, `TogetherPanel`, `ChatPanel`, `RoomBar`, `PresenceCursors`) has no tests in this scope (`find src/components/realtime -name "*.test.*"` returns nothing; e2e coverage is UNKNOWN, not checked). No test for hostile peers (id takeover, baton spoof, hidden listener), the outbox wedge, 512 KB snapshot failure, soak, multi-room load, or the deploy scripts.

## Performance characteristics (measured if you can, else ESTIMATED/UNKNOWN)

- **Measured** (load test above): in-room fan-out is O(peers) per action, one `JSON.stringify` per action and one `ws.send` per recipient. 8 peers x 60 actions/s: p99 41 ms, RSS 63-81 MB, on a 14-core laptop over loopback. VERIFIED.
- **Per-room memory ceiling** (ESTIMATED from constants `config.js:26-29`): the action log is capped at 1 MB of frame text, plus 50 chat frames and peer records, so about 1-1.5 MB per room at the cap. At the 500-room cap that is about 500-750 MB worst case, against `mem_limit: 512m` (`compose.yaml:19`). Reaching it needs an abuser or many busy rooms; HYPOTHESIS that an OOM kill is reachable. Docker would restart the container (`restart: unless-stopped`), dropping all rooms.
- **1 vCPU** (ESTIMATED): Node is single-threaded. The load test reached about 3.8k frames/s outbound with no CPU figure recorded. A fully active 8-person room with 20 Hz cursors from everyone is about 8 x 20 x 7 = 1,120 frames/s. That suggests roughly 3 fully active rooms use up the throughput measured on a fast laptop core, and the VM core is slower. UNKNOWN until measured on the VM (not done; production is off limits for this audit).
- **Capacity limits:** 500 rooms, 2000 sockets, 64 sockets per IP, 8 peers per room. A room lives in one process; there is no horizontal scaling.

## Security risks

1. **Authentication: none.** Possession of the 6-character room id is the only credential. The alphabet has 31 symbols (`protocol.js:9`), so 31^6 = 887,503,681 ids, about 29.8 bits (ESTIMATED by arithmetic; `node -e "console.log(31**6)"`). Ids are generated with `crypto.getRandomValues` and rejection sampling (`protocol.ts:105-120`), so unbiased. The relay limits frames per socket and sockets per IP, but there is no per-IP join-attempt limit, and a probe of an existing room returns its lab, item and peer count (`probe.ts`), so the join path is an enumeration oracle. Anyone with the link is a full participant; no accounts, tokens, room password or lock.
2. **Identity is self-asserted and takeover-able** (defect 1). Names are arbitrary text (zero-width and bidi characters stripped, `protocol.js:26`); duplicates are allowed.
3. **Hostile peers can send any action `type` and any JSON body** up to 64 KB; the relay does not know which actions a lab allows. Safety rests on each lab reducer being defensive (the board `hydrate` clamps odd values, tested at `boardlab/store.test.ts:46`). I did not audit the other reducers. Snapshots are accepted from whichever peer the relay asked and parsed by each store's `hydrate`.
4. **Room-creation DoS:** any join to an unknown id creates a room (`relay.js:220-229`); empty rooms live 30 min; the cap is 500. A client with many source addresses (the per-IP key is the full address, `clientIp` `relay.js:77-85`; an IPv6 /64 would give unlimited keys, HYPOTHESIS) can fill all 500 and return `server_full` to everyone. The lobby probe itself creates a room for each mistyped code. The room-creation path is VERIFIED.
5. **Origin allow-list protects browsers only** (stated in `config.js:147-149`); any script can omit `Origin`.
6. **`/metrics` is public through Caddy** (`Caddyfile:6` proxies `/ws /healthz /metrics`): room, peer and connection counts and frame rates. Low sensitivity, unauthenticated.
7. **Transport and container hardening is good:** TLS via Caddy with automatic certificates and HSTS; relay container `read_only`, `cap_drop: ALL`, `no-new-privileges`, runs as `node` (`compose.yaml`, `Dockerfile:17`). The Vultr create script passes the API key through a 0600 header file so it stays out of `ps` (`realtime-vultr-create.sh:48-52`). The deploy script uses `StrictHostKeyChecking=accept-new` and root SSH by default.
8. **Privacy:** logs hold metadata only and IPs are salted-hashed (`relay.js:74`; test "logs hold metadata only"). Chat text goes to `/api/ai/translate` (a third-party AI) for each reader, and voice goes to `/api/ai/transcribe`; room members do not consent individually (DOCUMENTED design; `provider.tsx:206-225`).
9. **Single operator box:** one VM, one SSH key, no monitoring or alerting in the repo beyond `/healthz` (UNKNOWN whether anything outside the repo watches it).

## Reusability for an original-project builder (can this run on arbitrary user projects, or only on catalogue items? why?)

**Verdict: the relay transport is reusable; the client sync layer is reusable for reducer-style stores; the product wiring is catalogue-only today.**

- **Relay (reusable core):** it never interprets actions or snapshots. `action` is any JSON object with a `type`; `state.snapshot` is any JSON up to 512 KB. It would sequence a user project's actions the same way. What blocks real use: (a) `lab` must be one of `board|robotics|drone` and `itemId` must match `^[a-z0-9]+(-[a-z0-9]+)*$` and be at most 64 chars (`protocol.js:7,14,157-170`); (b) a room is bound to ONE `lab`+`itemId` pair and a second item gets `wrong_item` (`relay.js:235-241`), so a room cannot span a project of several documents; (c) no persistence, so a session cannot outlive the process or the 30-minute empty-room window; (d) 512 KB snapshot and 64 KB action ceilings are small for a real project; (e) no authentication or ownership, so no notion of project members.
- **Client (partly reusable):** `attachStore` is generic over `LabStore<S,A>` (`getState/subscribe/dispatch`), and any store that handles a `sync/hydrate` action and registers a shared-action whitelist can plug in. But `LabKind` is a closed union (`components/dock/types.ts`), `labSync` is a closed record of three labs (`shared-actions.ts:127`), `RoomSnapshot` assumes lab plus item, and `LabRoom` is mounted only on catalogue pages.
- **Collaboration semantics fit lessons, not authoring.** The baton model (one editor at a time, whole-text replacement) is correct for a teacher/student or driver/navigator exercise. It does not give simultaneous editing of one document: no OT or CRDT, no merge, no shared undo, no per-user text cursors. For an original-project builder either keep the baton model for an MVP or move documents to a CRDT (for example Yjs) and keep this relay for presence, chat and cursors.
- **Conflicting actions:** there is no rejection or rebasing. The sequencer imposes one order and every reducer applies it, so conflicts resolve as "later in seq wins" (two `param/set` on one parameter: the last wins). Build actions from non-holders are dropped at apply time (`store-sync.ts:131`). Whether each store handles semantically conflicting actions gracefully (remove a part another peer just edited) is UNKNOWN.

## Required refactoring to get there

1. Add a protocol version to `join`/`welcome` plus a server hello listing supported versions, so rolling restarts and old tabs degrade cleanly.
2. Replace the closed `lab`/`itemId` binding with an opaque document namespace (`kind`, `docId`, relaxed patterns, or several documents per room); keep the relay agnostic.
3. Add identity: server-issued peer tokens (HMAC over room + peer id returned in `welcome`, required on rejoin) so a takeover needs the token; tie bans to the token; mint signed room tickets from the Next app (user, project, role) so saved-project rooms are authorized rather than guessed. Authorize `room/baton` at the receiver or the relay.
4. Persistence: durable action log or periodic snapshots (Postgres/Redis/object storage) with room re-hydration after restart; today every deploy drops all rooms. Decide that saved projects are the system of record and the relay is a session layer.
5. Restructure size limits: snapshots by reference to object storage, an action size policy per document kind, loud errors for oversized frames (defects 5 and 6).
6. Add state-hash exchange to detect divergence and trigger a resnapshot (defect 7).
7. Move the shared-action whitelists out of the realtime lib: each store registers its own sync spec.
8. Scaling plan: sticky routing by room id (consistent hashing at the proxy) or one actor per room, at minimum two instances with a draining blue/green deploy.
9. Build the image in CI and pull on the VM instead of building on the 1 vCPU box.

## Recommendation: preserve | extend | replace | deprecate | investigate

**extend**: the sequencer design, limits, tests and snapshot/replay logic are sound and verified, but identity, persistence, versioning and the closed lab binding must be added before it can serve user projects.

## Open questions

- Is CPU, not memory, the first limit on the 1 vCPU VM? Run `test/load.js` against a staging copy of the VM (needs owner approval; this audit did not touch production) and record CPU.
- How large are real lab snapshots (board with long code, drone with a long bench history)? How close do real sessions get to 512 KB and 64 KB?
- Do the three lab reducers stay in lockstep across clients for `run/start`, `bench/run`, `test/run`, `cli/run`? A randomised multi-client fuzz test with state-hash comparison would answer it.
- Is one relay VM acceptable (no failover; a restart drops rooms), or must the product target an SLA? Who owns the VM and monitoring after the hackathon? The VM's compose project is still `simlab-realtime` (HANDOFF.md:183).
- Do the lobby AI features (`/api/buddies`, `/api/ai/match`, `/api/ai/plan`) belong to this subsystem or to the AI/community one? `/api/buddies` may hold persistent user profiles in the database (not audited here).
- Does the Playwright suite run two browsers in one room against a real relay? Not checked.
- What abuse policy does the product want: public rooms with moderation, invite-only rooms, or class rooms owned by a teacher account?
