# P2-fun gaps at the end of wave B

Written 2026-10-24 by P2-fun. The section is in and verified (unit, component and e2e tests, own build, crawl of
every `/fly` route). What is not covered, and why:

- **Your best-lap ghost has no e2e.** It is cut from a replay of the session log (`ghostFromLog`), and
  `src/lib/flight/ghost.test.ts` checks the replay gives exactly the poses the live flight passed through. An e2e would
  have to fly a full lap by keys: the autopilot demo's laps never count as a best, by design. The e2e ghost test uses a
  friend's craft in a room plus the autopilot's line, which go through the same drawing path.
- **Leaderboards are verified only as "not set up".** There is no `DATABASE_URL` on this machine, so the fly page's
  board shows its "Leaderboards aren't set up here" note (e2e checks it). `flight.lap` goes out as
  `{ course: "<craft>-<course>" | "daily-<yyyymmdd>", timeMs }`, which the ingest schema accepts; the SQL side is
  P2-social's.
- **Room poses ran only over BroadcastChannel.** The relay is not approved yet. The pose sent is
  `{ p: [x, y, z], q: [yaw, pitch, roll, 0], gate: <course id> }`, which passes the relay's validator
  (`server/realtime/src/protocol.js`: q has 4 numbers, gate a string of 32 or fewer).
- **swarm, vtol and octo** have no content module yet, so their `e2e/fly.spec.ts` runs are skipped; they run as
  soon as the modules land. Break it and the crash replay work for every craft class the sim flies.
- **Strings**: every new `flight.json` key is English in fr, de, es, zh and hi, listed in
  `P2-fun-to-phase3-strings.md`.
- **Daily challenge pool** is built when the site is built: a craft that lands after a deploy joins the pool at the
  next build. The pick is rendezvous-hashed, so a new craft only changes the days it wins.
