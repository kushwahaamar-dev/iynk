# Gate 1, local run

Amar chose a local gate at 18:31: no Vercel link, no preview deploy, keys stay placeholders, no Vultr relay. So
this is the local half of BUILD-PLAN §6 on one production build (`NEXT_DIST_DIR=.next-gate1`, typecheck on),
Node v24.8.0, Next.js 16.4.3.

- First run, 18:47–18:57 CDT at `6da9aac`: **red** on 4 e2e tests, 99 pages that scrolled sideways at 390 px, and
  `content:check`.
- Rerun, 19:14–19:21 CDT at `06ac3f0`, after the fixes below: **green apart from `content:check`**, which fails
  only on English prose that phase 2 writes. Nothing below is hidden or rounded.

## What ran (rerun)

| §6 | Check | Result |
|---|---|---|
| 1 | `npm run typecheck` | exit 0 |
| 1 | `npx eslint . --quiet` | exit 0 |
| 1 | `npm run content:check` | **exit 1**: no English prose for `uno-r4`, `whoop`, `cinewhoop`, `longrange`, `wing` (phase 2) |
| 1 | `npm run build`, typecheck on | exit 0 in 13 s, 645 of 645 pages, one warning (`src/i18n/figures/<locale>.json` missing, phase 3) |
| 2 | full vitest | 1347 passed, 0 failed, 4 skipped (TimescaleDB integration: no database), 8 todo |
| 3 | app-path table (`src/lib/interp/lessons.test.ts`) | 59 of 59 tests: 59 of 59 references pass, 59 of 59 starters fail. Same as `phase1-lessons.md` |
| 4 | bench probe `node figures/engine/probe.mjs esp32-s3-build` | PASS: 17 of 17 steps, 0 bridge, console or data errors, 32.9 s |
| 4 | `cfshoot.py boards/uno-r3`, `cfshoot.py drones/quad5` | both OK: 23 shots + embed check each (the one bridge `error` is the probe's deliberate bad press) |
| 5 | route crawl `scripts/crawl-routes.mjs`, 606 pages at 390 × 844 | **0 failed**, 101 clean, 253 with known later-phase problems only, 252 expected 404. Full table: `gate1-routes.md` |
| 6 | `npx playwright test` (desktop + phone) | 57 of 57 passed |
| 7 | live smokes, relay, Tiger, Muse over MCP | not run: keys are placeholders and Vultr is not approved (D4) |

## Red in the first run, and the fix

| Failure | Cause | Fix |
|---|---|---|
| `robotics.spec.ts` quiz test: `bench.quizzes` undefined | Playwright loads `src/` as CommonJS, so the loader's `default` was `{ default: bench }` | the test unwraps it (`fb0cc92`) |
| `dronelab.spec.ts:49`: the over-spin sentence found twice | the quad5 verdict line repeated the over-spin check word for word | only the "ok" verdict shows; a failing build's checks say why (`7860244`) |
| axe `color-contrast` on `.bg-good-bg` (Uno workspace, lesson page) | `text-good` on `good-bg` 3.65:1, `text-bad` on `bad-bg` 3.02:1, and dark-mode text about 1.4:1 on both fills | `.on-fill` puts on-colour text (8:1 or better) on every pastel fill, 8 components (`a9ca415`) |
| axe `scrollable-region-focusable` on the pinout scroller, `listitem` in the serial log | the scroller took no focus; `role="log"` on an `ol` dropped the list role and orphaned its items | the pinout scroller is a focusable named region, the log a focusable `div` of rows (`181b8fe`) |
| 99 pages scrolled sideways at 390 px, every language | SegmentedControl could not wrap (four Pico names); prev/next lesson links kept long titles on one line; the lobby grid had no phone column, so French select options widened it | wrap, wrap, `grid-cols-1` (`06ac3f0`) |

## Still red: `content:check` (phase 2)

`uno-r4`, `whoop`, `cinewhoop`, `longrange` and `wing` have data modules but no English prose, so they 404 in every
language. Phase 2 writes them (boards and drones prose rows).

## Known, owned by a later phase (counted, not failed)

- Figure strings: every non-English page with a figure logs `SimLab i18n: missing figure strings
  src/i18n/figures/<lang>.json` and the figure stays English (250 pages). Phase 3.
- `transistor-switch`, `tb6612fng`, `pi5-ros2` bench pages render, but `/figures/robotics/<id>.html` is not built (18
  pages), and `pi5-ros2` links to `/<lang>/boards/pi4-pi5`, which is not built (6 pages). Phase 2 (robotics rows).
- Expected 404s (252): items with no data module yet (9 drones, 9 benches) or no English prose (above), and the
  6 `/<lang>/not-found` pages.

## Demo path (BUILD-PLAN §1)

| Step | Pages | Local result |
|---|---|---|
| 1 | `/en`, `/en/boards/uno-r3`, `/en/boards/uno-r3/blink` | clean in the crawl, e2e and axe pass |
| 2 | `/es/boards/uno-r3`, `/es/together` | 200, English prose under the "Aún sin traducir" note, fits 390 px. Figure strings are English (phase 3). Two-device room needs the relay (not approved) |
| 3 | `/en/drones/quad5` | clean. Live SerpApi prices need `SERPAPI_KEY` (placeholder) |
| 4 | `/en/drones/quad5/fly` | clean. Ghost racing between devices needs the relay |
| 5 | `/en/together`, `/api/mcp` | clean. MCP answers `initialize` and `tools/list` (DEPLOY.md smoke). Muse Image cover needs `META_API_KEY` |

## How to rerun

```bash
env -u SIMLAB_BUILD_SKIP_TYPECHECK NEXT_DIST_DIR=.next-gate1 npm run build
NEXT_DIST_DIR=.next-gate1 npx next start -H 127.0.0.1 -p 3420 &
node scripts/crawl-routes.mjs --base http://127.0.0.1:3420 --dist .next-gate1 --workers 3 --out docs/verify/gate1-routes.md
E2E_SKIP_BUILD=1 NEXT_DIST_DIR=.next-gate1 npx playwright test
```

Keep the crawl at 3 workers: at 6, the app's own per-IP rate limit answers some page requests with 429. Delete
`.next-gate1` after and remove the `.next-gate1` lines the build adds to `tsconfig.json`.
