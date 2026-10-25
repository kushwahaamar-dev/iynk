# Gate 2, local run

The same local gate as gate 1 (Amar, 18:31: no Vercel link, keys stay placeholders, no Vultr relay), now on the
whole catalogue: 12 boards, 13 benches, 13 drones, English prose for all 38 and the other five languages' prose and
UI strings from phase 3's T2 waves. One production build (`NEXT_DIST_DIR=.next-gate2`, typecheck on), Node v24.8.0,
Next.js 16.4.3.

- First run, 02:00 CDT on Oct 25 at `88b0248`: **red** on 2 pages that scrolled sideways at 390 px.
- Rerun, 02:15–02:20 CDT at `926cc6b` with the fix that went in as `282f15d`: **green**. The figure checks ran
  after it, 02:36–02:52 CDT, on the same tree plus `2f9402a`'s three rebuilt figures.

## What ran (rerun)

| §6 | Check | Result |
|---|---|---|
| 1 | `npm run typecheck` | exit 0 |
| 1 | `npx eslint . --quiet` | exit 0 |
| 1 | `npm run content:check` | exit 0: 12 boards, 13 robotics, 13 drones, index unchanged |
| 1 | `npm run build`, typecheck on | exit 0, 825 of 825 pages |
| 2 | full vitest | 2719 passed, 0 failed, 5 skipped (TimescaleDB integration: no database), 159 of 160 files |
| 2 | relay (`relay/`): `node --test` and its typecheck | 39 of 39 passed, typecheck exit 0 |
| 3 | app-path table (`src/lib/interp/lessons.test.ts`) | 102 of 102 references pass, 102 of 102 starters fail. Full table: `gate2-lessons.md` |
| 4 | every bench through `figures/engine/probe.mjs` | 13 of 13 PASS, 0 bridge, console or data errors (table below) |
| 4 | every built figure through `cfshoot.py` | 79 of 79 OK (boards, robotics, modules, parts, drones) |
| 5 | route crawl `scripts/crawl-routes.mjs`, 786 pages at 390 × 844 | **0 failed**, 780 clean, 6 expected 404 (`/<lang>/not-found`). Full table: `gate2-routes.md` |
| 6 | `npx playwright test` (desktop + phone) | 77 passed, 2 skipped (below) |
| 7 | live smokes, relay, Tiger, Muse over MCP | not run: keys are placeholders and Vultr is not approved. `smoke-ai.mjs` and `smoke-search.mjs` are ready (DEPLOY.md) |

The 2 skipped e2e tests are `boardlab.spec.ts`'s "a board whose prose is not translated yet" pair: they skip
because every board now has prose in every language, which is what they wait for.

### Bench probes

| Bench | Steps | Time |
|---|---|---|
| a4988 | 22 of 22 | 11.9 s |
| esp32-s3-build | 17 of 17 | 26.1 s |
| hc-sr04 | 19 of 19 | 7.1 s |
| l298n | 24 of 24 | 15.4 s |
| led-resistor | 19 of 19 | 8.5 s |
| lm2596 | 22 of 22 | 15.9 s |
| mpu6050 | 18 of 18 | 7.1 s |
| pca9685 | 23 of 23 | 14.7 s |
| pi5-ros2 | 17 of 17 | 9.6 s |
| qtr-8rc | 22 of 22 | 16.7 s |
| tb6612fng | 22 of 22 | 11.4 s |
| transistor-switch | 22 of 22 | 15.9 s |
| uno-r3-build | 25 of 25 | 16.6 s |

## Red in the first run, and the fix

| Failure | Cause | Fix |
|---|---|---|
| `/de/drones/octo/fly` 406 px wide at 390 | a German waypoint readout in a `text-3xl` Stat value had no break point, so the mobile layout viewport grew (the fixed dock only looked like the culprit) | Stat values hyphenate and break long words (`282f15d`) |
| `/fr/robotics/pi5-ros2` 400 px wide at 390 | a French bench button kept its label on one line (`whitespace-nowrap`) and pushed out of its card | Buttons wrap and never grow past their row (`282f15d`) |

## Fixed around gate 2

The first two just before the first run, the third after the figure checks.

- The lesson runner sent a sketch's pins only when they changed, so a figure that loaded or reloaded after the first
  frame never got pins that stay put: the Light and Distance lessons showed the built-in Blink instead of the sketch
  (`df87063`, with a test that fails before it).
- The Nucleo cold-D13 test counted LD2 instead of the breadboard LED (`eea3352`).
- Bench statuses and stat values with live numbers could never be translated: the engine took a template with its
  values, and the collector now reads every bench model, which found 96 status and stat strings no browser pass had
  reached (`c845e79`, `2f9402a`).

## Still open

- **Figure strings, non-English:** `src/i18n/figure-strings.test.ts` passed 11 of 11 at 02:55, after the five
  P3-figs-delta agents (`wf_7bcff872-581`). The collector change in `2f9402a` adds the 96 bench strings above, so the
  test fails for the five languages until they are translated. Gate 3 reruns it.
- Gate 2 ran in English only for the figures. The crawl covers all six languages for routes and sideways scroll;
  the figures in other languages are screenshotted at gate 3, after the final UI pass.

## How to rerun

```bash
env -u SIMLAB_BUILD_SKIP_TYPECHECK NEXT_DIST_DIR=.next-gate2 npm run build
NEXT_DIST_DIR=.next-gate2 npx next start -H 127.0.0.1 -p 3420 &
node scripts/crawl-routes.mjs --base http://127.0.0.1:3420 --dist .next-gate2 --workers 3 --out docs/verify/gate2-routes.md
E2E_SKIP_BUILD=1 NEXT_DIST_DIR=.next-gate2 npx playwright test
SIMLAB_LESSON_TABLE=docs/verify/gate2-lessons.md npx vitest run src/lib/interp/lessons.test.ts
for b in $(ls src/content/robotics/*.ts | grep -v -e test -e '/_' | xargs -n1 basename | sed 's/\.ts$//'); do node figures/engine/probe.mjs $b; done
python3 -I figures/tools/cfshoot.py boards/uno-r3   # and each other page under public/figures
```

Keep the crawl at 3 workers (the per-IP rate limit answers some requests with 429 at 6). Delete `.next-gate2` after
and remove the `.next-gate2` lines the build adds to `tsconfig.json`.
