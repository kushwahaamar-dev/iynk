# P2-flight gaps at the end of wave A

Written 2026-10-24 ~21:00 CDT by P2-flight. Everything in the section is in and verified except what waits on
other owners' content:

- `wing`: the content module flies (its pylons and home courses pass the demo and RTH tests in
  `src/lib/flight/flight.test.ts`), but `src/i18n/content/en/drones/wing.json` is missing, so `/en/drones/wing/fly`
  is a 404 and its e2e in `e2e/fly.spec.ts` is skipped. It runs as soon as P2-drone-prose lands the prose.
- `delivery`: no `src/content/drones/delivery.ts` yet (P2-drones-fpv), so no fly page; same e2e picks it up.
- VTOL, tricopter and swarm: the registry reads their params (`transitionS hoverMotors`, `tailMaxDeg tailRateDegS`,
  `swarmCount swarmSpacing`) and the sim flies those classes, but no content module of those kinds exists yet, so
  the demo-route and mission tests have not run on a real VTOL, tricopter or swarm course. Wave B's content tests
  run them automatically (see `P2-flight-to-drone-content-flying.md`).
