# Requests and notes from hx:realtime-client

The client API (H7.1) is in `src/lib/realtime/index.ts`: `RoomProvider`, `useRoom`, `createRoom`,
plus `useTogether`, `probeRoom`, `parseRoomInput`. Everything below is additive to H7.

## For hx:realtime-server (server/realtime)

1. **Welcome names the room's item.** Keep the `lab` and `itemId` of the first join that named them
   and send `welcome.room` as `{ id, lab, itemId }` (a bare id string still works). The lobby's
   "join by code" uses it to open the right lab page.
2. **Relay extra presence fields as they are:** `name` (string, ≤ 24 chars) and `done` (string[],
   ≤ 200 keys, each ≤ 80 chars), in `presence` frames and inside `join.peer`. Peers also send
   `peer.status` in join; `status: "lobby"` marks a short lookup by the lobby (the client hides
   those peers and does not send them snapshots).
3. **`{t:'kick', id}` from the host** (H11 "the host can remove a peer"): send the target
   `{t:'error', code:'removed'}`, close it, and tell the others `{t:'leave', id}`. Ignore it from
   anyone who isn't the host.
4. **Error codes the client acts on:** `room_full` (also `full`) and `removed` end the session;
   anything else is shown and the socket keeps going.
5. **Optional resume:** `join.since` is the last seq the peer applied. If you still hold actions
   after it, you may replay them instead of asking the host for a snapshot. Without it the client
   simply takes the snapshot.
6. Chat echo to the sender is optional; the client dedupes by `id`.
7. Cursor frames with `x = y = -1` mean "pointer left the figure".

## For ui:boardlab, ui:robotics, ui:dronelab (store.ts)

1. **`{ type: "sync/hydrate", state }`**: please handle it in your reducer by taking every shared
   field from `state` (keep purely local fields such as tabs, hover, camera). The room dispatches
   it on a joiner with the host's state. Until a store handles it, the room rebuilds the snapshot
   through your own actions (`rebuild()` in `src/lib/realtime/shared-actions.ts`), which can't
   restore a drone's or bench's figure build state.
2. **Keep calling `store.dispatch(action)` on the store object** (not a destructured copy): the room
   swaps that property while a room is open, which is how shared actions get ordered without any
   change to your pages.
3. Robotics and Drone Lab: tell me if my allow-lists in `shared-actions.ts` are wrong (each
   person's quiz, tabs and figure reports are local there).
4. While in a room, a code editor should be read-only for everyone but the keyboard holder:
   `useRoom()?.batonHolder === useRoom()?.you.id`. Edits from anyone else are dropped and
   `batonDenied` is bumped (the Together panel then offers "ask for the keyboard").

## For hx:dock (wave 2)

- Wrap each lab page's figure, controls and LabDock in one
  `<RoomProvider lab itemId store>` (from `@/lib/realtime`); everything else is automatic.
- Mount `<TogetherPanel {...labDockProps} />` from `@/components/realtime` as the Together tab, and
  open that tab when the URL has `?room=`.
- Put `<PresenceCursors />` (from `@/components/realtime`) inside the figure's positioned box.
