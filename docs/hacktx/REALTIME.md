# iynk realtime relay

Owner: hx:realtime-server. Code: `server/realtime/` (Node 24 + `ws`), deploy: `deploy/realtime/`, scripts: `scripts/realtime-*.sh`. The wire protocol is HX-CONTRACT H7; this page pins down everything H7 leaves open. hx:realtime-client (`src/lib/realtime/`) speaks it.

## Run it locally

```sh
cd server/realtime
npm ci                       # first time only; installs ws into server/realtime/node_modules
node server.js --port 43117  # or PORT=43117 node server.js
```

- WebSocket: `ws://127.0.0.1:43117/ws` (set `NEXT_PUBLIC_REALTIME_URL` to that for local tests).
- Health: `GET http://127.0.0.1:43117/healthz` gives `{"ok":true,...}`; metrics: `GET /metrics`.
- With `REALTIME_ALLOWED_ORIGINS` unset, the relay accepts browser origins on `localhost` and `127.0.0.1` (any port) and clients that send no `Origin` (Node tests, wscat). Set it to a comma list for anything else (see Configuration).
- `LOG_LEVEL=silent` keeps the console quiet in tests; Ctrl-C (SIGINT) or SIGTERM shuts down gracefully.
- From a test you can also start it in-process: `import { createRelay } from '<repo>/server/realtime/src/relay.js'`, then `const relay = createRelay({ logLevel: 'silent' }); await relay.listen(43117, '127.0.0.1'); …; await relay.close()`.

## Protocol details beyond H7

All frames are JSON text. Binary frames are refused with an `error`. Fields not listed are ignored and never relayed.

### Joining

- `join` must be the first frame, within 10 s of connecting, or the socket closes with 4000.
- `peer.id`: 1–64 chars of `A-Z a-z 0-9 _ -`. `peer.name`: control characters stripped, whitespace collapsed, capped at 24 characters (grapheme clusters), must not be empty. `peer.color`: `#rgb`/`#rrggbb`/`#rrggbbaa` or a palette token such as `tomato` (lowercase, ≤ 24 chars). `peer.lang`: `en es fr de zh hi`. Optional in `peer`: `role`, `status` (≤ 80 chars), `baton`, `done` (≤ 256 progress keys, each ≤ 128 chars).
- `lab` (`board|robotics|drone`) and `itemId` (kebab-case, ≤ 64) bind the room to one lab item. The first join that names a lab binds it. A later join naming a different item gets `error wrong_item` (with the room's `lab` and `itemId` in the error frame) and is closed with 4009, unless nobody else is in the room: then the room rebinds and starts a new history (new `epoch`). Joins without `lab` (the /together lobby) are allowed in any room.
- Same `peer.id` while that id is still in the room (a reconnect before the old socket timed out): the new socket takes over the old one's place, so it keeps its join order and stays host if it was. The old socket gets `error replaced` and closes with 4001. The others get a `peer` frame with the new record, not a leave and a join.
- Optional reconnect replay: send `since` (the last action seq you applied) and `epoch` (from your previous welcome). When the epoch matches and the relay still has every action after `since`, it replays them instead of asking the host for a snapshot.

### Welcome

```
{t:'welcome', you, room, peers, host, seq, lab, itemId, epoch, sync}
```

- `you`: your peer id. `room`: the room id (string). `peers`: every peer in the room, **you included**, in join order. `host`: the host's id. `seq`: the room's last action seq.
- `lab`, `itemId`: the room's binding (`null` when unbound). `epoch`: id of this room history (changes when the room is created again after expiry or a relay restart, or rebinds).
- `sync` says what happens next:
  - `'none'`: nobody else holds the room state. Your local state *is* the room state at `seq`. Apply actions with seq > `seq` as they come.
  - `'snapshot'`: wait. The relay asks the host and holds every action for you until the snapshot arrives; then you get `state`, then every action after the snapshot's seq, in order, then live actions. You never receive an action before your `state`.
  - `'replay'`: the relay sends every action after your `since`, in order, then live ones.
- Right after the welcome, the relay sends the room's last 50 chat messages as ordinary `chat` frames (same `id`s as before; dedupe by `id`).

### Actions and the total order

- `{t:'action', action}`: `action` must be an object with a string `type` (1–64 chars). The relay stamps `seq` (1, 2, 3, … per room, no gaps) and sends `{t:'action', from, seq, action}` to every synced peer, the sender included.
- A peer still waiting for its snapshot can't send actions (`error not_synced`); its UI should say "syncing" for that moment.
- The client rule is one line: keep `base` (the seq your state reflects); on `action`, ignore it if `seq <= base`, else apply it and set `base = seq`. The relay guarantees no gaps after `base`.

### Snapshots

- The relay sends `{t:'snapshot-request', from: joinerId}` to the earliest synced peer (normally the host). Reply with `{t:'state', to: joinerId, snapshot, seq}` where `seq` is the last action seq your snapshot includes. The joiner receives `{t:'state', from: yourId, snapshot, seq}`.
- Only the asked peer may answer (`error not_asked` otherwise). `seq` must not be ahead of the room. A `state` frame may be 512 KB plus a 1 KB envelope; other frames 64 KB.
- If the asked peer leaves, or does not answer within 5 s, the relay asks the next synced peer. If every synced peer has been asked, the joiner gets `error snapshot_unavailable` and is closed with 4010 (rejoin to retry).
- If no synced peer is left at all (the host left while everyone else was still joining), the earliest waiting peer is promoted: it gets `{t:'state', from: <its own id>, snapshot: null, seq}`, meaning "keep your local state; it is the room state at `seq`". Every other waiting peer is then asked from it.

### Chat, presence, cursors, poses

- `chat`: `text` has control characters (except newlines and tabs) stripped and is capped at 500 characters; empty text is refused. The relay sends `{t:'chat', from, name, id, text, lang, kind, ts}` to everyone, **the sender included**, in one order. `ts` is the relay's clock (ms since epoch); `name` is the sender's display name when it was sent.
- `presence`: any of `role` (or `null` to clear), `status` (≤ 80 chars, or `null`), `baton`, `name`, `done`. The relay merges it into the peer record (new joiners see it in `welcome.peers`) and sends `{t:'presence', from, …fields}` to everyone, the sender included. **Baton:** at most one holder. `baton:true` takes it; the previous holder gets `{t:'presence', from: <holder>, baton:false}` sent to everyone.
- `cursor`: `x`, `y` finite numbers, clamped to 0–1, sent to everyone else as `{t:'cursor', from, x, y}`.
- `pose`: `p` = 3 finite numbers, `q` = 4; optional `v` (a number or 3 numbers) and `gate` (an integer ≥ 0 or a string ≤ 32 chars). Sent to everyone else as `{t:'pose', from, p, q, v?, gate?}`.
- Cursor and pose frames above 20 per second per peer are dropped silently. Under backpressure (a slow phone), cursor and pose frames to that peer are skipped first.

### Kick (H11: the host can remove a peer)

- `{t:'kick', id}` from the host only (`error not_host` otherwise). The peer gets `error kicked`, is closed with 4003 and can't rejoin that room with the same id. Everyone gets `leave`.

### Heartbeat and expiry

- Send `{t:'ping'}` every 15 s; the relay answers `{t:'pong'}`. The relay also sends WebSocket ping frames every 15 s (browsers answer them by themselves). Any frame or pong counts as a heartbeat; after 45 s of silence the peer is dropped and everyone gets `leave`.
- A room lives on for 30 minutes after its last peer leaves: its `seq`, `epoch`, action log and chat history survive a short outage of everyone. Then it is deleted.

### Errors and close codes

`{t:'error', code, message}`; `message` is English for logs. Show text by `code` from your own i18n.

| code | when | socket |
|---|---|---|
| `bad_json` | the frame isn't JSON | stays open |
| `bad_message` | a field is missing or wrong (the message names it) | stays open; closes with 4000 if it was the join |
| `bad_type` | unknown `t` | stays open |
| `too_large` | over 64 KB (512 KB + 1 KB for `state`) | stays open |
| `rate_limited` | over 60 frames/s; frames are dropped (sent at most once a second) | closes with 1008 after a sustained flood |
| `not_joined` / `already_joined` | frame before `join` / a second `join` | stays open |
| `not_synced` | an action while waiting for a snapshot | stays open |
| `not_asked` | a `state` nobody asked you for | stays open |
| `not_host` / `bad_target` | kick by a non-host / kick of an unknown peer | stays open |
| `room_full` | the room already has 8 peers | 4004 |
| `wrong_item` | the room is bound to another lab item | 4009 |
| `kicked` | the host removed you | 4003 |
| `replaced` | the same peer id joined from another socket | 4001 |
| `snapshot_unavailable` | nobody answered the snapshot request | 4010 |
| `server_full` | the relay's room or connection cap is reached | 1013 |

Other closes: 1012 when the relay restarts (reconnect with backoff), 4000 join timeout or a bad join, 1009 a frame over 640 KB. An upgrade from a disallowed origin is refused with HTTP 403 before any WebSocket exists; too many connections from one IP get HTTP 429.
