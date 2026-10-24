# Gate 1, local run

2026-10-24 18:47–18:57 CDT, driver (Amar's session), code at `6da9aac`. Amar chose a local gate at 18:31: no Vercel
link, no preview deploy, keys stay placeholders, no Vultr relay. So this is the local half of BUILD-PLAN §6 on one
production build (`NEXT_DIST_DIR=.next-gate1`, typecheck on), Node v24.8.0, Next.js 16.4.3.

**Result: red.** The demo path's own pages pass. The gate fails on 4 e2e tests, on phone layout (99 pages scroll
sideways at 390 px), and on `content:check`. Nothing below is hidden or rounded.

## What ran

| §6 | Check | Result |
|---|---|---|
| 1 | `npm run typecheck` | exit 0 |
| 1 | `npx eslint . --quiet` | exit 0 |
| 1 | `npm run content:check` | **exit 1**: no English prose for `uno-r4`, `whoop`, `cinewhoop`, `longrange`, `wing` |
| 1 | `next build`, typecheck on | exit 0 in 13 s, 645 of 645 pages, one warning (`src/i18n/figures/<locale>.json` missing) |
| 2 | full vitest | 1347 passed, 0 failed, 4 skipped (TimescaleDB integration: no database), 8 todo |
| 3 | app-path table (`src/lib/interp/lessons.test.ts`) | 59 of 59 references pass, 59 of 59 starters fail (Uno R3's 16 lessons included). Same as `phase1-lessons.md` apart from run times |
| 4 | bench probe `node figures/engine/probe.mjs esp32-s3-build` | PASS: 17 of 17 steps, 0 bridge, console or data errors, 32.6 s |
| 4 | `cfshoot.py boards/uno-r3`, `cfshoot.py drones/quad5` | both OK: 23 shots + embed check each (the one bridge `error` is the probe's deliberate bad press) |
| 5 | route crawl `scripts/crawl-routes.mjs`, 606 pages at 390 × 844 | **99 failed**, 84 clean, 171 with known later-phase problems only, 252 expected 404. Full table: `gate1-routes.md` |
| 6 | `npx playwright test` (desktop + phone) | **53 passed, 4 failed** of 57 |
| 7 | live smokes, relay, Tiger, Muse over MCP | not run: keys are placeholders and Vultr is not approved (D4) |

## Red: what fails, and who should own it

1. **e2e, 4 tests.** No failing selector was changed this session. `.bg-good-bg` is ViewBar's "running" status pill.
   `6f51a80` touched only the power picker next to it. Whether these failed before the session was not measured.
   - `boardlab.spec.ts:63` (Uno workspace) and `:158` (lesson page): axe `color-contrast` on `.bg-good-bg`; plus
     `scrollable-region-focusable` on `.max-h-[560px]` (workspace) and `listitem` on `.overflow-y-auto > .text-muted`
     (lesson). Board Lab UI.
   - `dronelab.spec.ts:49`: the "2,450 KV on 6S spins the props…" warning now renders twice (a `<p>` and a
     `<span>`), so the strict locator finds two. Drone Lab UI or the test.
   - `robotics.spec.ts:96`: `bench.quizzes` is undefined for the bench the test picks, and the test reads
     `.length` on it. Robotics content or the test.
2. **Phone layout, 99 pages scroll sideways at 390 px**, in every language: Pico (board page and 6 lessons, 434–497
   px), NodeMCU blink/button/dimmer/webserver (405–531), ESP32-S3 blink/boot-button/dimmer/web-server (405–581),
   ESP32-DevKitC boot-button (396–405, and blink in Spanish), Nano fade in Spanish (422), `/fr/together` (406).
   The Uno R3 pages fit in all six languages (fixed in `6f51a80`). Board Lab UI, plus Together for French.
3. **`content:check`**: the five items above have data modules but no English prose, so they 404 in every
   language. Phase 2 (boards and drones prose rows).

## Known, owned by a later phase (counted, not failed)

- Figure strings: every non-English page with a figure logs `SimLab i18n: missing figure strings
  src/i18n/figures/<lang>.json` and the figure stays English (153 pages). Phase 3.
- `transistor-switch`, `tb6612fng`, `pi5-ros2` bench pages render, but `/figures/robotics/<id>.html` is not built (18
  pages), and `pi5-ros2` links to `/<lang>/boards/pi4-pi5`, which is not built. Phase 2 (robotics rows).
- Expected 404s (252): items with no data module yet (9 drones, 9 benches) or no English prose (above), and the
  6 `/<lang>/not-found` pages.

## Demo path (BUILD-PLAN §1)

| Step | Pages | Local result |
|---|---|---|
| 1 | `/en`, `/en/boards/uno-r3`, `/en/boards/uno-r3/blink` | clean in the crawl. The Uno workspace and lesson e2e tests fail on axe only (above) |
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
