# Audit: Drone Lab, calculator and flight sim

Written 2026-10-24 15:30 CDT by the drones auditor; read-only. vitest drone/flight paths 471 pass, 8 todo; 0 tsc
errors in drone paths; eslint clean; all 8 built figures driven in Playwright (no errors, ~1.3 s load); quad5 reversed
capacitor → "SHORT detected", plug anyway → "POP: input capacitor vented"; range.html 60 fps chase + FPV at 1200×800
and 390×844.

## Bottom line

One craft works end to end, quad5, English only (design, build, safety tests, CLI, quiz, fly). 8 figures built,
5 content modules, but 4 of those have no prose JSON → 404. Only quad5 flies. Nothing outside English. No ghosts.

## Per drone

| id | Figure (src/built) | Content | Prose | Page | Safety tests | Craft tests | CLI | Flies |
|---|---|---|---|---|---|---|---|---|
| quad5 | yes/yes current | 603 LOC | en | en | 3 work incl. cap fault | failsafe requested | BF 2026.6.2, 10 snippets + emulator | yes: 6 modes, 5-gate race, 5 checkpoints |
| whoop | yes/stale | 656 | none | 404, placeholder card | 3 pass | rxtest/failsafe use `checks.*` never reported | BF | no |
| cinewhoop | yes/stale | 650 | none | 404 | 3 pass | arm/osd/failsafe `extra.*` no hook | BF | no |
| longrange | yes/stale (114-line diff) | 764 (saved 14:19:42, maybe mid-write) | none | 404 | 3 pass | compass/GPS/failsafe `extra.*` | BF + GPS Rescue | no |
| racer | yes/stale | none | none | placeholder | 3 pass | rx/failsafe buttons | none | no |
| gpscam | yes/stale | none | none | placeholder | 3 pass | compass/GPS/failsafe/gimbal | none | no |
| delivery | yes/stale | none | none | placeholder | 3 pass | compass/GPS/winch/failsafe | none | no |
| agrihex | no | no | no | placeholder | – | – | – | no |
| wing | yes/yes current | 615 | none | 404 | 3 pass ("wing level") | elevons/CG/compass `extra.*` | INAV 9.1.0 | no (wing physics exists) |
| vtol, swarm, tricopter, octo | no | no | no | placeholder | – | – | – | no |

quad5 build follows the brief's order in 12 steps. All 13 crafts have calc models and catalogues in the fixtures.
Wiring sheet blocks clickable and focusable on quad5 and wing; not focusable on the 6 stale builds. Only quad5 has a
drone prompt record.

## Calculator

Finished: src/lib/drone/calc.ts + design.ts reproduce all 342 golden rows; content.test.ts checks the 5 crafts;
DesignPanel shows AUW, T:W, hover %, max A, hover and aggressive minutes (+ cruise for wing/VTOL), cost split, warnings;
fixes AUD-119…124 (hover = √(AUW/(motors×thrust)), per-craft fixed parts, wing model).

| craft | AUW | T:W | hover | max A | hover min | aggr min | default warning |
|---|---|---|---|---|---|---|---|
| quad5 | 514 g | 12.5 | 28% | 144 | 12.3 | 5.2 | – |
| whoop | 26 g | 4.0 | 50% | 14 | 7.3 | 3.1 | – |
| cinewhoop | 441 g | 4.3 | 48% | 75 | 6.0 | 5.1 | – |
| longrange | 925 g | 5.8 | 42% | 120 | 36.9 | 15.5 | battery over-current |
| racer | 443 g | 13.8 | 27% | 217 | 7.1 | 3.0 | ESC over-current |
| gpscam | 1600 g | 2.5 | 63% | 80 | 20 | 16 | hover too high |
| delivery | 5177 g | 1.95 | 72% | 126 | 19.6 | 16.6 | hover too high |
| agrihex | 33.3 kg | 1.96 | 72% | 458 | 12.7 | 10.1 | hover too high |
| wing | 825 g | 1.3 | 36% cruise | 33 | 30.6 | 24.4 | – |
| vtol | 1585 g | 2.8 | 60% | 116 | 25.1 | 75.9 cruise | – |
| swarm | 28 g | 1.9 | 73% | 5 | 6.9 | 6.3 | hover too high |
| tricopter | 655 g | 5.1 | 44% | 113 | 16.2 | 6.8 | ESC over-current |
| octo | 15.4 kg | 1.8 | 74% | 160 | 19.8 | 15.4 | hover too high |

Matches the originals exactly; optimistic for small crafts (5.4 g/W, 80% usable): whoop 7.3 min vs ~3–4 real; quad5
T:W 12.5 vs 8–10 typical. CLI spot check correct (aux syntax/mode ids, ACTUAL rates, OSD encodings, failsafe, INAV
smix/mmix, align_board_yaw); unverified: Betaflight `serial UART2 …` vs `serial 1 …`, INAV mode id 53 for NAV CRUISE
(45 cruise / 53 course hold?), version strings. CLI emulator (BF, INAV, cflib, MAVProxy) tested.

## Flight sim

src/lib/flight/sim.ts (877 LOC) fixed-step deterministic: multirotor, tricopter tail servo lag, wing hand launch and
stall, VTOL transition, swarm followers, motor failure (octo flies, quad falls), battery sag, build mistakes flip on
take-off, hovers at the calculator's hover throttle and current. Controls: W/S throttle, A/D yaw, arrows pitch/roll,
Space arm (key-down), R reset, V FPV, gamepad with learnable mapping, touch sticks on touch screens only, mode selector,
wind, spoken status, arming refusals. **Per drone: quad5 only** (src/lib/flight/crafts/, courses/ hold only quad5;
FlyWorkspace.tsx:38 hard-coded list). whoop, cinewhoop, longrange, wing have flight params + courses in content; a
small adapter would make them flyable (wing/VTOL need wing params). FPV corner readouts cut off in portrait. **No race
ghosts** (replay() exists, so cheap).

## Gaps

BLOCKER: 12/13 index cards say "Still on the workbench…" (placeholder; drones/page.tsx, dronelab/data.ts loadCards);
whoop/cinewhoop/longrange/wing 404 (no prose; loadCraft returns null); no non-en prose; racer/gpscam/delivery no
content; agrihex, swarm (brief names agricultural and nano/Crazyflie), vtol, tricopter, octo never started; only quad5
flies; 6 stale figures (rebuild: `python3 -I figures/tools/cfbuild.py --kind drones`).
MAJOR: no craft hook in the engine report (drone.js:385), paths inconsistent (`checks.*` vs `extra.*`); **palette bug**
(`G.pal` never set, drone-geo.js:19 → every craft tomato; one line in scene()); quad5 failsafe test; `prop-clearance`
kind missing (schema.ts:622); dronelab.json key drift; figure strings; flight numbers stored twice (content.flight.params
and crafts/<id>.ts); other engine requests (message/log overrides, whoop-scale shaft/hub, edge end points, XT90,
battery plug); README stale; range prompt not in figures/prompts; cfbuild --all doesn't build the range
(`node figures/flight/build.mjs`).
MINOR: quiz buttons overflow (quad5 Q3); wiring sheet overlaps CHECKS/BATTERY counter; FPV readouts cut off; racer and
tricopter defaults open with ESC over-current warnings; optimistic small-craft numbers; 2 CLI facts unverified; no
on-screen sticks for mouse users.

## Estimate

en prose for 4 crafts 2; content + prose racer/gpscam/delivery 4.5; agrihex + swarm 7; vtol, tricopter, octo 10.5;
engine fixes 1.5; rebuild 0.3; flight adapter + registry + params + a course per craft 2.5; prose translation 6–8;
prop-clearance 0.3; ghosts 2.5; UI polish 1; README/prompts 0.5; e2e 1. Minimum brief (10 flyable, 6 languages, no
placeholders) ≈ 27 agent-hours ≈ 5 h wall with 6–8 agents.

## Most Entertaining levers

1. Ghost racing (own best lap + a developer ghost, bronze/silver/gold par times; `parS` exists on whoop courses).
2. Break it and watch it fail (reversed FC flips on take-off, slow-mo replay, "here's why", one click to fix).
3. Swap and fly (4S/6S, motor) with live current and remaining time vs the calculator.
4. A scored mission per craft (delivery drop, agrihex spray coverage, swarm light show, longrange GPS Rescue, wing
   hand-launch and landing).
5. Daily challenge share link (course + design + time) feeding /api/leaderboard.
6. Feel: prop-wash shake, crash particles, FPV static on hits, turtle mode. 7. Fullscreen FPV goggles + gamepad.

## Risks

Translation is the long pole (~1.1 MB for 10 crafts × 5); missing prose silently 404s (fall back to English);
figures drift unless the figure build runs at deploy; five new figures in 6 h is the riskiest drawing work; whole fly
page untested on a phone; wing/VTOL flight only unit-tested with throwaway params.
