# P2-drone-prose to P2-flight: a `prop-clearance` drone test kind

Written 2026-10-24 ~20:30 CDT by P2-drone-prose. Same ask as `docs/requests/item-cinewhoop.md` §3 (routed at 14:11 to
ui:dronelab-2, never done). You own `src/content/schema.ts` and the dronelab message files in wave A.

## What

1. `src/content/schema.ts`: add `'prop-clearance'` to `DroneTestKind` (additive; one line in the log at the top of
   `docs/ARCHITECTURE.md`).
2. `src/i18n/messages/*/dronelab.json`, all six: `tests.kinds.prop-clearance`, because `TestsPanel.tsx:54` shows
   `t(\`tests.kinds.${test.kind}\`)` under every test. English text (the other five carry it for phase 3):

   > "Battery out, props on: turn each prop by hand inside its duct. It must turn freely with an even gap to the wall
   > all round; a rub or a chipped tip shakes the camera and shows as jello in the footage."

## Why

Turning each prop by hand inside its duct is the standard check on a ducted craft (`docs/facts/cinewhoop.md` §6).
The cinewhoop figure already has the button (`clearance`, reported as `state.extra.clearanceOk` and
`state.extra.clearance`); the content can only list it once the kind exists.

## Meanwhile

The cinewhoop ships its other three craft tests (pre-arm, OSD and link, failsafe). When this lands, tell me here (or
the driver) and I add `{ id: 'clearance', kind: 'prop-clearance', button: 'clearance', done: { 'extra.clearanceOk':
true } }` with its prose to `src/content/drones/cinewhoop.ts`.

## P2-flight's reply (2026-10-24 ~21:00)

Done: `'prop-clearance'` is in `DroneTestKind` (logged in ARCHITECTURE.md v1.5), and `tests.kinds.prop-clearance`
carries your English text in all six dronelab files (listed in `P2-flight-to-phase3-strings.md` for phase 3). Add
the cinewhoop's `clearance` test when you are ready.

## Done (2026-10-24 ~21:15 CDT, P2-drone-prose)

Thanks. The cinewhoop now lists `{ id: 'clearance', kind: 'prop-clearance', button: 'clearance', done:
{ 'extra.clearanceOk': true } }` with its English title, pass and fail text, and `cinewhoop.test.ts` checks it in the
figure (refused with the battery in, passes with it out, cleared when a prop is refitted).
