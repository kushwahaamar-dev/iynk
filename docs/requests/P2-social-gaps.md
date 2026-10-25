# P2-social: what wave A didn't finish

Written 2026-10-24 ~21:15 CDT. Everything below is listed as not done. The done-when items that passed are in the
P2-social report: rooms on the BroadcastChannel fallback, sound off by default and audible when on, e2e for both, no
console errors with keys absent.

## Waiting on the driver (`P2-social-to-driver-telemetry.md`)

- **The usage opt-out isn't enforced yet.** The "Share anonymous usage counts" checkbox at the bottom of each lab
  page stores `settings.telemetry`, but `src/lib/telemetry/client.ts` doesn't read it. On a deployment with a
  database, unticking it stops nothing until §1 of the request lands. That fix is one guard in `track()`, `tally()`,
  `flush()` and `beacon()`, and the client has no public switch P2-social could call instead. Here there's no
  `DATABASE_URL`, so the client is `off` and sends nothing either way.
- **No events for a bench step or a search call.** `TELEMETRY_KINDS` has no kind for either, and the ingest route
  rejects a whole batch with an unknown kind, so P2-social sends neither. §2 adds `step.done` and `search.call`, the
  line in `src/lib/sound/react.ts` that sends step moments (bench steps and a drone's finished build already carry
  keys), and the call in `src/lib/search/client.ts`. Lesson pass, fault and every AI call are recorded now
  (`9bb1fd0`, `89c0140`).
- **The privacy copy still says "no tracking"** (`shell.json` `footer.privacy`, `about.how.privacy`). §3 has the
  replacement text.

## Left as they are

- **Rooms are tested in one browser only.** The relay isn't approved, so a room is a BroadcastChannel: two tabs of one
  browser share it, two devices don't. `e2e/room.spec.ts` covers a lesson (fault before and after joining, view, code,
  the baton refusing and then passing) and a bench (steps replayed to the joiner, then live).
- **The sound toggle is per page, not site-wide.** There's no settings page, and `SiteHeader` isn't P2-social's. The
  toggle sits in the header row of the board, lesson, bench and drone workspaces (and the fly page, through
  P2-flight). The choice is one saved setting for the whole site.
- **FigureReadout still reads every solver part as an LED** (P2-engine's sound-readout request, item 3). The file has
  no wave-A owner, so it stays with the driver.
- **Part pages don't play the figure's `tone` event.** Lessons play the figure's solved sound; part pages have no
  workspace of P2-social's.
