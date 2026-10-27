# ADR-0402: Three stores by lifetime, DocStore as the adapter over ProjectSession, and one command layer

Status: proposed, 2026-10-27, revised after review the same day. Author: frontend and backend architecture seat.
Upstream: D5, B4-02, B4-04, B4-05, RS-09, ADR-0104, SYSTEM_ARCHITECTURE 6.9. Downstream: F-083, F-110, F-121, F-122, R-033, R-034. Spec: FRONTEND_ARCHITECTURE section 6.

## Problem

Today each lab has its own reducer store, two room modules overwrite `store.dispatch` (B4-04), UI state sits outside the store and is invisible to rooms (B4-05), and AI proposals are full-text replacements (B6-04). SYSTEM 6.9 already declares `ProjectSession.apply` the only mutator; the editor needs a React-friendly face on it without a second writer.

## Constraints

1. Every document change goes through `ProjectSession.apply` (ADR-0104); no second place assigns document state.
2. Selection, viewport and drag previews must not enter the op log.
3. Simulation frames arrive at up to 30 Hz and must not re-render unrelated panels.
4. No new state library for one maintainer.
5. The same path must serve local editing, rooms, undo, AI proposals and import.
6. `OpEnvelope.seq` is assigned by the ordering authority, never by the UI.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. One big store | All state in one reducer | Rejected: a 30 Hz frame stream would touch the document subscribers |
| B. Redux, Zustand or similar | New dependency | Rejected: the repo already uses `useSyncExternalStore` stores (`useLab.ts`) |
| C. Three external stores plus commands, `DocStore` adapting `ProjectSession` | `DocStore`, `SessionStore`, `RunStore`; commands plan op batches | **Chosen** |
| D. CRDT-backed store | Yjs document | Rejected for the graph (ADR-0104, RS-09) |

## Decision

1. `DocStore` is the React-facing adapter over `ProjectSession`. `commit(batch, { author })` calls `session.apply(batch, author)` and nothing else mutates state. It keeps no copy of `state`.
2. `DocChange.touched` is computed by the pure `computeTouched(before, after)` in `src/project/touched.ts`, by reference comparison of immutable entities, because SYSTEM's `ApplyResult` does not return a cascade.
3. `SessionStore` holds ephemeral editor state; `RunStore` mirrors simulation frames.
4. `Command.plan` is pure and returns an op batch; tools turn engine intents into commands.
5. The UI wiring modules join `DocStore` to an `Authority` (`LocalAuthority` or `RoomAuthority`), to the repository and to the simulation. `DocStore` never imports `local`, `collab` or `sim-host`.
6. The `dispatch` monkey patches are deleted with `LabRoom` and `store-sync` in COLLAB; legacy lab actions map to ops, session or run state by the table in section 6.6.

## Technical justification

RS-09 (PASS: no divergence in 40 randomised runs of about 10,900 ops each, with drops, resends and the snapshot path, VERIFIED in its report) validates the optimistic-client model that `RoomAuthority` implements. `useSyncExternalStore` stores are already the repo's pattern. Keeping the session as the single writer means FA-01 can check mutation with one grep.

## Performance data

UNKNOWN: time per `apply` for a local gesture (SYSTEM AR-09) and cost of `computeTouched`. Targets: ESTIMATED under 1 ms at 500 parts for `computeTouched`; FA-04 fails a panel that re-renders on an unrelated op over a 200-op script. `RunStore` takes at most 30 snapshot frames per simulated second (FRONTEND section 6.2). ADR reversal condition: a profile where `DocStore` notifications dominate the frame budget.

## Cost implications

No new dependency. Boilerplate: every command has an id, label, `enabled` and `plan`; the three wiring modules are each under 100 lines. Test cost is lower because `plan` is pure and the store can be recorded.

## Licensing

Nothing added. RS-09's `fast-check` is MIT (EXTERNAL; not installed yet) and is a test dependency only.

## Security implications

Remote ops, AI proposals and pasted content enter by the same `apply`, after the op validator (FRONTEND section 8.4), so no side door skips quotas or permission checks. Each batch carries an author (`user`, `ai`, `system`, `import`; AI batches carry the proposal id). In a room the server stamps the author on the ack, so a client cannot forge another author's envelope.

## Reversibility

High. `DocStore` is an adapter: replacing it touches `studio` and the wiring modules, not the op model, the schema or the server. The `Authority` seam hides whether a room exists.

## Migration plan

The legacy `LabStore` shape stays as an adapter until each lab is moved in (FE-5). The table in section 6.6 maps every `BoardLabAction` to a destination, and the robotics and drone stores follow the same rule. `LabRoom.tsx:50,59` and `store-sync.ts:143,153` are deleted in COLLAB, not before.

## Known limitations

- Undo across authors keeps the RS-09 limit: undoing a move after someone else moved the same part moves it back to the old spot.
- Concurrent edits to one source file are single-writer through the baton (R-094); the range transform converges but does not keep intent on overlap.
- SYSTEM 6.9 `undo()` has no author argument; per-author stacks (R-034) need that signature settled (FRONTEND Objection 7).
- `computeTouched` depends on `apply` preserving reference identity for untouched entities; if that fails, the editor redraws more than needed but stays correct (FA-01 tests it).
