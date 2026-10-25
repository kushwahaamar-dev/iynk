# Gate 3, local run in all six languages

The same local gate as gates 1 and 2 (Amar, 18:31: no Vercel link, keys stay placeholders, no Vultr relay), now with
the whole catalogue in every language: prose and UI from phase 3's waves, and all 4087 figure strings after the
fourth figure-string delta. One production build (`NEXT_DIST_DIR=.next-gate3`, typecheck on), Node v24.8.0, Next.js
16.4.3.

- Run 05:46–06:11 CDT on Oct 25 at `569b205`: **green**. The checks that need no build (unit tests, relay, figures)
  ran on the same tree.
- Two things were fixed after the run, from what the gate's page checks showed: the Lab tools drawer squeezing a
  lesson's code (`f43d420`, below), and the pitch and video clicks (`b015738`).

## What ran

| §6 | Check | Result |
|---|---|---|
| 1 | `npm run typecheck` | exit 0 |
| 1 | `npx eslint . --quiet` | exit 0 |
| 1 | `npm run content:check` | exit 0: 12 boards, 13 robotics, 13 drones, index unchanged |
| 1 | `npm run build`, typecheck on | exit 0, 826 of 826 pages |
| 2 | full vitest | 2788 passed, 0 failed, 5 skipped, 170 of 171 files: TimescaleDB integration (4, no database) and the English-fallback test in `src/i18n/server.test.ts` (no language is missing prose any more) |
| 2 | relay (`server/realtime/`): `npm test` and `npm run typecheck` | 39 of 39 passed, typecheck exit 0 |
| 2 | `src/i18n/figure-strings.test.ts` | 11 of 11: 4087 keys, each translated in es, fr, de, zh and hi with its placeholders. `node scripts/figure-strings.mjs --static`: 2736 strings found in the figure sources, 0 missing from the key list |
| 3 | app-path table (`src/lib/interp/lessons.test.ts`) | 102 of 102 references pass, 102 of 102 starters fail. Full table: `gate3-lessons.md` |
| 3 | drone calculator, `npx vitest run src/lib/drone` | 445 of 445, including the 342 reference builds |
| 4 | every bench through `figures/engine/probe.mjs` | 13 of 13 PASS, 0 bridge, console or data errors (table below) |
| 4 | every built figure through `cfshoot.py` | 79 of 79 OK (boards, robotics, modules, parts, drones) |
| 5 | figures in every language, `node scripts/figure-langs.mjs` | 120 views (10 lab pages × 6 languages × laptop 1440 and phone 390): 0 with text overflowing its box or the figure, 0 English-fallback warnings |
| 5 | route crawl `scripts/crawl-routes.mjs`, 786 pages at 390 × 844 | **0 failed**, 780 clean, 6 expected 404 (`/<lang>/not-found`). Full table: `gate3-routes.md` |
| 6 | `npx playwright test` (desktop + phone) | 114 passed, 2 skipped (below) |
| 7 | live smokes, relay, Tiger, Muse over MCP | not run: keys are placeholders and Vultr is not approved. `smoke-ai.mjs` and `smoke-search.mjs` are ready (DEPLOY.md) |

The 2 skipped e2e tests are `boardlab.spec.ts`'s "a board whose prose is not translated yet" pair: they skip
because every board has prose in every language, which is what they wait for.

The figure-language pages are the Blink lesson, basys3, pi4-pi5, the a4988, esp32-s3-build and pca9685 benches,
quad5, and the wiring sheets of quad5, octo and racer: the busiest labels, the longest HUDs and the three sheets
whose boxes are sized to their text.

### Bench probes

| Bench | Steps | Time |
|---|---|---|
| a4988 | 22 of 22 | 12.7 s |
| esp32-s3-build | 17 of 17 | 26.1 s |
| hc-sr04 | 19 of 19 | 7.2 s |
| l298n | 24 of 24 | 15.7 s |
| led-resistor | 19 of 19 | 8.5 s |
| lm2596 | 22 of 22 | 16.0 s |
| mpu6050 | 18 of 18 | 7.1 s |
| pca9685 | 23 of 23 | 15.6 s |
| pi5-ros2 | 17 of 17 | 9.4 s |
| qtr-8rc | 22 of 22 | 15.4 s |
| tb6612fng | 22 of 22 | 7.5 s |
| transistor-switch | 22 of 22 | 14.1 s |
| uno-r3-build | 25 of 25 | 16.5 s |

## Found at gate 3, fixed after the run

| Finding | Cause | Fix |
|---|---|---|
| With Lab tools open, a lesson's code panel was 352 px wide at any desk size, so even at 1920 "Try it yourself" was cut off, the Serial status wrapped to four lines and the last rail tab was clipped | the drawer's push rule shrank the rail to 22rem before the figure gave up anything | The figure gives up its room first, down to 34rem, then the rail, down to 22rem: 608 px of code at 1920, 416 at 1440. The code title hides where the drawer narrows the rail under 27rem. `e2e/dock.spec.ts` checks 1440 and 1920 (`f43d420`; dock, phone dock, Board Lab and shell specs 53 passed on that build) |
| The pitch and the video said "the dock", "scroll to Break it" and "the Sound switch in the workspace header", and filmed quad5 on an empty mat | the final pass moved the dock into Lab tools and Break it into a tab under the code; the drone bench starts empty on every load | Every click re-read against the pages at 1920 × 1080; "Build it for me" goes in just before the drone beat (`b015738`) |

## Found after gate 3, in the polish pass

| Finding | Cause | Fix |
|---|---|---|
| Picking a variant (Uno R4 WiFi, Pico W, Pico 2, Pi 4, ESP32-S3 v1.0) changed the pin table and the simulator but the figure kept drawing the default board, so the R4's LED matrix and Wi-Fi lessons showed the Minima | the app sent `variant` in a `set` patch, but a figure builds its board once, from `?variant=`, and the engine dropped keys it doesn't read without a word | The figure page loads with the variant (`figureSrc`, `6f52be5`) and the engine reports a key it doesn't read (`d851653`). An e2e test switches the R4 and opens the matrix lesson. All 493 `set` states in the content use known keys; the 12 board pages and 71 lessons load with no figure notes; 13 of 13 probes, 0 bridge errors |
| On the Uno, "16 MHz CRYSTAL" covered "POWER JACK" | board labels sat at fixed offsets | A label steps past the ones already placed (`c33432c`). No overlaps or clipped labels on 12 boards, 13 benches and 12 modules at 1296 and 390 px, nor in fr and es |
| The fr and es figures said "adaptateur de niveau" and "adaptador de nivel" where the prose says "convertisseur de niveau" and "adaptador de niveles" | two translation passes chose different words | The figures follow the prose (`00139d6`) |

## Fixed between gate 2 and gate 3

183 commits, all after gate 2's rerun at `926cc6b`. The main ones:

- The final pass (`docs/verify/ui-review.md`) and its review-fixes wave: board pages no longer scroll sideways on a
  phone (`bb9093a`), a lesson can't pass while Break it has the board broken (`26ad367`), breadboard labels no longer
  cover each other (`32eb174`), and the shell, drone and robotics findings in four parallel fix agents.
- Figure strings: four deltas took the five languages from 1391 untranslated strings at 02:00 to none, with the
  collector reading every bench model and every figure variant (`266610e`).
- After the wave: the landing hero is the live Uno running Blink (`ada2a24`); phone-sized embedded figures draw no
  number badges whose legend is hidden (`9898660`); a board with no circuit measures nothing (`bf2efd9`); a fault left
  on makes a passing run sound and count as a fail (`4c7dea3`); the fly range's notes sit clear of the touch sticks
  (`569b205`); Proof of Build's readiness is read on the server, so no page sends the browser to the public Solana RPC
  (`4ed0e42`).

## Still open

- Live smokes need the keys, the deploy and the relay host: Amar's morning list in `HANDOFF.md`.
- quad5's bench (and every drone's) is empty again after a reload; the workshop's progress keeps the build as done.
  The scripts press "Build it for me" just before the drone beat.
- The "Right now at HackTX" counter (`src/components/data/LiveCounter.tsx`) is built but not on a page.

## How to rerun

```bash
env -u IYNK_BUILD_SKIP_TYPECHECK NEXT_DIST_DIR=.next-gate3 npm run build
NEXT_DIST_DIR=.next-gate3 npx next start -H 127.0.0.1 -p 3420 &
node scripts/crawl-routes.mjs --base http://127.0.0.1:3420 --dist .next-gate3 --workers 3 --out docs/verify/gate3-routes.md
E2E_SKIP_BUILD=1 NEXT_DIST_DIR=.next-gate3 npx playwright test
node scripts/figure-langs.mjs http://127.0.0.1:3420 <out dir>
IYNK_LESSON_TABLE=docs/verify/gate3-lessons.md npx vitest run
(cd server/realtime && npm test && npm run typecheck)
for b in $(ls src/content/robotics/*.ts | grep -v -e test -e '/_' | xargs -n1 basename | sed 's/\.ts$//'); do node figures/engine/probe.mjs $b; done
python3 -I figures/tools/cfshoot.py boards/uno-r3   # and each other page under public/figures
```

Keep the crawl at 3 workers (the per-IP rate limit answers some requests with 429 at 6). Delete `.next-gate3` after
and remove the `.next-gate3` lines the build adds to `tsconfig.json`.
