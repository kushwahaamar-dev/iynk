# Tooling, test infrastructure, e2e suite, scripts, build and deploy config

**Paths:** package.json, tsconfig.json, eslint.config.mjs, vitest.config.mts, vitest.setup.ts, playwright.config.ts, next.config.ts, .vercelignore, .nvmrc, e2e/, scripts/, src/lib/verify/, deploy/realtime/, .vercel/ (project name only), plus every *.test.* file in the tree.
**Entry points:** `npm run check` (package.json:26), `npm test` (vitest run), `npm run e2e` (playwright test), `npm run content[:check]`, `scripts/*.mjs`, `scripts/realtime-deploy.sh`, `vercel deploy --prod` (DOCUMENTED, docs/hacktx/DEPLOY.md:27).
**LOC (VERIFIED, `cat ... | wc -l`):** e2e 1,644; scripts (mjs + sh) 1,472; scripts/workflows 2,773 (agent orchestration, not tooling); src/lib/verify 837; deploy/realtime 86; root configs 324; all unit-test files 23,905 lines across 173 vitest files (`git ls-files | grep -E '^(src|figures|scripts)/.*\.test\.' | xargs cat | wc -l`).
**Owner today:** docs/ARCHITECTURE.md §2 lists "verification, README" under `tests/e2e/*.spec.ts` (that path no longer exists; the suite is in `e2e/`). No named human owner. Audited commit bb546d6, 2026-10-26.

## Purpose

Everything that proves the app works or ships it: type-check, lint, content-registry generation, unit/content/API tests (Vitest), browser flows (Playwright), crawl and smoke scripts, the realtime relay's Docker/Caddy deploy, and the `src/lib/verify` replay checker behind Solana credentials. There is no CI. All verification is run by hand on one laptop and the results are written into docs/verify/*.md and HANDOFF.md.

## Dependencies (imports in, imports out; third-party packages)

- Tests import app code through the `@/` alias (vitest `resolve.tsconfigPaths`, vitest.config.mts:8) and read figure sources and i18n JSON straight from disk.
- Figure-engine tests build real figure pages by calling `python3 -I figures/tools/cfbuild.py` (figures/engine/testkit.mjs:19) and load them in jsdom. So `npm test` needs Python 3 on PATH. VERIFIED by reading; my passing run confirms it is present here.
- `timescale.test.ts` starts `timescale/timescaledb:latest-pg17` in Docker if `IYNK_TEST_DATABASE_URL` is unset and Docker answers (src/lib/server/db/timescale.test.ts:1-30). Otherwise it skips (4 cases skipped in my run).
- `relay.integration.test.ts` spawns `server/realtime/server.js` on a random port (src/lib/realtime/relay.integration.test.ts:15-20).
- Third party (package.json): vitest 5.0.3, jsdom 30.1.2, @testing-library/react 16.3.3, @playwright/test 1.64.0, @axe-core/playwright 4.13.0, eslint 9 + eslint-config-next 16.4.3, typescript ^5, vite 8.3.4.
- Undeclared dependencies (VERIFIED: `grep -n '"sharp"\|"acorn"' package.json` finds nothing; they appear in package-lock.json only as transitive entries, lines 7471, 12794, 13818): scripts import `playwright` (crawl-routes.mjs:12, figure-thumbs.mjs:10, figure-strings.mjs:24), `sharp` (figure-thumbs.mjs:15) and `acorn` (figure-strings.mjs:25). They work only because other packages install them.
- The realtime relay is a second package (server/realtime/package.json, `ws` 8.22.0, own lockfile and tests); solana/ is a third (Anchor workspace, own lockfile). Three lockfiles, no workspace config.

## Public interfaces (exported functions/types/components/messages, with path:line)

- npm scripts (package.json:9-27): `content`, `content:check`, `predev`, `prebuild`, `pretypecheck`, `pretest` (all run `npm run content`, which rewrites the tracked src/content/index.generated.ts when item files change), `typecheck` (`next typegen && tsc --noEmit`), `test`, `e2e`, `check` (content:check, typecheck, lint, test, e2e in order).
- `npm run content` is a `node -e` one-liner that prints "skipped" if the generator is missing (package.json:10). The guard is dead code now; the file exists.
- Env knobs: `E2E_PORT` (random 40000-49999, playwright.config.ts:5), `E2E_SKIP_BUILD=1`, `NEXT_DIST_DIR` (default `.next-e2e`, playwright.config.ts:9; read by next.config.ts:9), `IYNK_BUILD_SKIP_TYPECHECK=1` (next.config.ts:12, ignored when `VERCEL` is set), `IYNK_TEST_DATABASE_URL`, `IYNK_LESSON_TABLE`.
- `src/lib/verify/index.ts`: `verifyRun(kind, itemId, sub, run)`, `droneTestsFor`, `VERIFIABLE = ["drone-safety"]` (index.ts:12), `runLogSchema` (runlog.ts), `skillIdFor` / `parseSkillId` / `skillHash` (skill.ts), `canonicalJson` / `replayHash` / `sha256` (hash.ts), `replayDroneSafety` + `benchEventSchema` (drone-safety.ts), a recorder (drone-recorder.ts).
- Script CLIs: gen-content-index.mjs (`--check`, `--emit board/<id>`), crawl-routes.mjs (`--base --dist --out --only --workers`), db-migrate.mjs (`--status`), figure-strings.mjs (`--check --static --why`), figure-langs.mjs, figure-thumbs.mjs, smoke-ai.mjs, smoke-search.mjs, realtime-deploy.sh, realtime-vultr-create.sh, handoff-status.sh.

## State ownership and persistence (stores, localStorage keys, server state, DB tables)

- Tooling holds no runtime state. Generated or tracked artefacts: src/content/index.generated.ts (tracked, regenerated by hooks), src/i18n/figure-keys.json (written by figure-strings.mjs), public/figures/** (80 tracked built HTML files, 24 MB; `git ls-files public/figures | wc -l`, `du -sh`), built by `figures/tools/cfbuild.py`, which no npm script calls; public/thumbs/** (tracked WebP from figure-thumbs.mjs).
- Staleness check I ran: rebuilding uno-r3, quad5 and a4988 with cfbuild into a scratch folder gave byte-identical output to public/figures (3 of 3, VERIFIED with `cmp`). Nothing in `npm run check` rebuilds or compares the other 77, so a figure source edit without a rebuild would ship the old page.
- E2E touches browser storage only: `iynk:v1` (settings and theme; e2e/shell.spec.ts:137) and `iynk:together:v1` (identity; e2e/room.spec.ts:44).
- .vercel/project.json links the project named `simlab-hacktx` (ids not printed). Vercel configuration exists only in the dashboard and `.vercelignore`; there is no vercel.json.
- test-results/ and tsconfig.tsbuildinfo sit in the working tree and are git-ignored.

## Current functionality (what VERIFIED works, how you know)

Commands I ran on 2026-10-26 on a machine at load average 20-25 (other agents were running). Nothing was written to the repo (`git status` showed only docs/MASTER_PLAN/ afterwards).

| Check | Command | Result |
|---|---|---|
| ESLint | `npx eslint . --quiet` | exit 0, 64 s wall (VERIFIED) |
| TypeScript | `npx tsc --noEmit --incremental false` | exit 0, 9 s wall (VERIFIED) |
| Content registry | `node scripts/gen-content-index.mjs --check` | "12 boards, 13 robotics, 13 drones (unchanged)" (VERIFIED) |
| Vitest, all | `npx vitest run --reporter=json` | 173 files, 2,802 tests: 2,794 passed, 3 failed, 5 skipped; 225 s wall, 1,252 s CPU (VERIFIED) |
| Relay tests | `cd server/realtime && node --test --test-concurrency=1 "test/*.test.js"` | 39 of 39 pass, 5 s (VERIFIED) |
| Playwright inventory | `npx playwright test --list` | 119 tests in 12 spec files, 8 of them in the phone project; `--list` does not start the server (VERIFIED). I did not run the suite: it would build with the real .env.local (defect 2) |
| `npm audit --omit=dev --json` | | 15 findings: 13 moderate, 2 high, 0 critical (VERIFIED, detail under Security) |

Prior runs recorded by the team (DOCUMENTED, not re-run): docs/verify/gate3.md rows 1-7 and HANDOFF.md:102 and :181 give full vitest 2,788 passed / 5 skipped, Playwright 114 passed / 2 skipped on a keyless build and 116 passed / 2 skipped on 2026-10-25, a crawl of 786 pages with 0 failed, a build of 826-827 pages. For wall-clock suite timings see FEATURE_VERIFICATION (the Validate agent's numbers).

Counts:
- Test files tracked: `git ls-files | grep -E '\.test\.' | wc -l` = 180. 173 match vitest's include globs (vitest.config.mts:12). 6 are the relay's `node:test` files (server/realtime/test/*.test.js) and 1 is the Anchor test (solana/tests/iynk_passport.test.ts, needs `anchor test` and a Rust toolchain). So `npm test` runs 173 of 180.
- Vitest cases by area (JSON report): src/lib 1,227; src/content 813; src/i18n 442; src/components 129; figures/engine 103; src/app 88.
- Plain `it(`/`test(` call sites: 1,608 (`git ls-files '*.test.*' | xargs grep -cE "^\s*(it|test)(\.each)?\("`). The 2,802 reported cases are higher because cases are generated in loops (per language, lesson, craft).
- E2E: 72 static `test(` declarations, expanded to 119 by loops over LOCALES, CRAFTS and LAB_PAGES.
- Escape hatches: 11 `eslint-disable` and 2 `@ts-ignore/@ts-expect-error/@ts-nocheck` in src and figures (`grep -rn`), 5 `test.skip` in e2e, 1 `it.todo` (src/lib/drone/content.test.ts:101), 2 `describe.skipIf` (timescale.test.ts:28, relay.integration.test.ts:114).

### Test taxonomy (what each layer really asserts)

| Layer | Files / cases | What it asserts | Oracle |
|---|---|---|---|
| Content self-consistency | src/content/{boards,robotics,drones}/*.test.ts (37 files incl. `_checks.ts`) plus src/i18n/*.test.ts (7) | A content module names only parts its figure draws; pinout rows match the figure's header arrays; every lesson's reference code passes its own checks and an empty sketch fails them; every i18n key exists in all six languages with matching placeholders; 4,087 figure keys translated | Figure and content were written by the same team. Figure facts are scraped from `figures/*/<id>.js` with regexes (src/content/boards/uno-r3.test.ts:15-25, src/content/drones/_checks.ts:30-45). Self-consistency, not hardware truth |
| Interpreter semantics | src/lib/interp/** (9 files), src/lib/hw/* (5) | Arduino, Python and Verilog subsets run sample programs; errors carry line and column; Firmata and the board twin respond as designed | Hand-written expected outputs. No comparison with a real Arduino, MicroPython or Verilog simulator |
| Reference tables | src/lib/drone/*.test.ts with `__fixtures__/golden-a.json`, `golden-b.json` | Drone calculator matches 342 reference builds (4 crafts x 27 combinations plus 234) | Numbers extracted from the team's own research notes and original figure code (header of `__fixtures__/extract.py`), compared at the printed precision. Regression against a prior implementation, not a physical measurement |
| Figure DOM behaviour | figures/engine/*.test.mjs (4 files, 103 cases); per-craft "tests in the figure" blocks in src/content/drones/*.test.ts | A figure page built by cfbuild runs in jsdom; buttons press, parts mount, bench tests settle | jsdom with `getContext` unimplemented. Animation runs on real frames, so one case can take 50-140 s |
| Component tests | src/components/** (30 files, 129 cases) | React Testing Library render and interaction | jsdom |
| API route contracts | src/app/api/**/route.test.ts (13 files) and src/lib/server/** | Routes called as functions with `Request` objects, env via `vi.stubEnv`, providers mocked. /api/status returns booleans never values (src/app/api/status/route.test.ts:15-22) | Mocks. No test calls a real provider |
| Database | src/lib/server/db/*.test.ts | Migrations and queries against real TimescaleDB, only when Docker or `IYNK_TEST_DATABASE_URL` exists | Real DB, but skipped in my run |
| Relay | server/realtime/test/*.test.js (39) and src/lib/realtime/relay.integration.test.ts | Ordering, snapshots, limits, expiry; three RoomClients converge against a spawned relay | Real WebSocket server on localhost |
| Verify / Solana | src/lib/verify/*.test.ts (2 files), src/lib/solana/*.test.* (4), src/app/api/solana/solana-routes.test.ts | Replay hashing, drone-safety rule replay, route validation | Logic only. No cluster interaction in vitest |
| E2E flows | e2e/*.spec.ts, 119 cases | Production build in Chromium: language redirects, theme persistence, 404s, Blink lesson runs the learner's code and the LED toggles, drone workshop calculation and CLI, fly demo passes the first gate for 13 crafts, two-tab room sync over BroadcastChannel, Web Audio probes, phone overflow | Real browser and build; figures run as real iframes |
| Axe | inside e2e: shell (dashboard, 404, Settings), boardlab (index, board, lesson), dronelab (index, workshop), robotics (index, bench), fly (cockpit) | WCAG 2.0/2.1 A and AA via @axe-core/playwright | Host pages only; boardlab and robotics specs call `.exclude("iframe")` (boardlab.spec.ts:23, robotics.spec.ts:24), so figures are not covered |
| Operational scripts (outside `npm run check`) | crawl-routes.mjs, figure-langs.mjs, figure-strings.mjs, smoke-ai.mjs, smoke-search.mjs | Crawl of every prerendered page at 390x844 for errors and sideways scroll; text overflow in six languages; live provider calls | Real browser or providers; manual |

E2E observations (VERIFIED by reading all 12 specs and the helper dock-shared.ts):
- Per file: shell 16 declarations, boardlab 13, dronelab 10, robotics 9, redirects 5, dock 4, fly 4, fly-fun 3, room 2, sound 2, dock.phone 2, fly.phone 2. The task counted 13 specs; there are 12 specs plus the helper `e2e/dock-shared.ts`.
- Common pattern: `watchErrors` collects `pageerror` and hydration-mismatch console errors, and tests end with `expect(errors).toEqual([])`. The room and sound specs treat every console error as a failure.
- Selectors use `data-testid`, ARIA roles and English message JSON imported from src/i18n/messages, so tests follow copy changes. That makes copy self-consistent, not correct.
- Hard-coded content counts: 16 lessons (boardlab.spec.ts:68), "0/16" progress (boardlab.spec.ts:57-59), 13 crafts (dronelab.spec.ts:40, 155).
- Content-dependent skipping: `test.skip(!landed(id))` in fly.spec.ts:28, `test.skip(!benchId)` in robotics.spec.ts:78 and 135, `test.skip(!untranslated)` in boardlab.spec.ts:207. A deleted content file becomes a quiet skip, not a failure.
- Rooms: the two-tab tests use BroadcastChannel in one browser context (room.spec.ts:6-8). The WebSocket relay path is never exercised by Playwright; only relay.integration.test.ts covers it.

## Known defects (with repro or evidence)

1. **Three vitest cases fail under load (flaky, VERIFIED).** In my run: `basys3 ... lesson display passes at every value each chip offers` timed out at 120,000 ms; `octo ... works the landing gear only with a pack in` threw `octo: still busy after 50000 ms` (src/content/drones/_checks.ts:362); `wing ... passes the elevon check` timed out at 40,000 ms. Load average was 20-25. The suite's own comment says figure cases "animate in real frames (up to 50 s to settle)" and "slow down while every other suite, or a build, shares the CPU" (vitest.config.mts:13-14). Repro: run `npx vitest run` while another build runs. High for any CI (red on shared runners), medium locally.
2. **E2E results depend on the developer's .env.local (HYPOTHESIS, strongly supported).** playwright.config.ts passes only `NEXT_DIST_DIR` to the server (line 33), and `npm run build` inherits `.env.local`. Here .env.local defines `META_API_KEY`, `NEXT_PUBLIC_REALTIME_URL` and `DATABASE_URL` (checked as set/unset only, no values read). shell.spec.ts:231 asserts "The test server has no AI key"; room.spec.ts:6-8 assumes "no relay configured". HANDOFF.md:181 (DOCUMENTED) says "with Amar's keys, 6 tests that assume no keys fail by design" and the gates were run on a keyless build. With keys present, an e2e run could also send traffic to the production relay, database and AI provider. I did not run it for that reason. High.
3. **`npm run check` is not hermetic.** `e2e` builds with `npm run build && next start` unless `E2E_SKIP_BUILD` is set (playwright.config.ts:13-15), with a 600 s startup timeout. `pretest`, `pretypecheck` and `prebuild` each regenerate the content index, so a plain `npm test` can modify a tracked file. Medium.
4. **Scripts rely on undeclared packages** (`playwright`, `sharp`, `acorn`). A change in npm hoisting or a trimmed install breaks figure-thumbs, figure-strings and crawl-routes. Low-medium.
5. **Docs lag the code.** ARCHITECTURE.md:128-130 points to `tests/e2e/*.spec.ts`. docs/verify/repo-health.md is a 14:18 CDT snapshot listing 29 type errors and 5 failing tests; tsc exits 0 now, so a reader gets a wrong picture. Low.
6. **Caddy proxies `/metrics` to the internet** (deploy/realtime/Caddyfile:4, `@relay path /ws /healthz /metrics`). Whether the relay's /metrics exposes anything sensitive is UNKNOWN (server/realtime is outside my scope). Medium until checked.
7. **Possible stale compose project on the VM.** HANDOFF.md:181 says the VM stack is still `simlab-realtime` in `/opt/simlab-realtime`, while the script deploys to `/opt/iynk-realtime` (realtime-deploy.sh:17) with compose project `iynk-realtime`. Re-running without `docker compose down` first could start two stacks competing for ports 80 and 443. DOCUMENTED, not tested. Medium.

## Technical debt (table: item, path, evidence, severity, effort guess)

| Item | Path | Evidence | Severity | Effort |
|---|---|---|---|---|
| No CI of any kind | repo root | `ls .github` fails; `ls .git/hooks` shows only samples; `git config core.hooksPath` empty | high | 1-2 days for typecheck, lint, sharded vitest, keyless e2e |
| Production deploys from a laptop | docs/hacktx/DEPLOY.md:27 (`vercel deploy --prod --yes`) | no Git integration evidence in repo; no vercel.json | high | 0.5 day to connect Git and preview deploys, export settings |
| Tests depend on wall-clock animation in jsdom | figures/engine/testkit.mjs; src/content/drones/_checks.ts:362 | 3 timeouts above; vtol.test.ts 222 s | high | 3-5 days for a fake-clock engine driver |
| Tests regex-scrape figure JS | src/content/boards/uno-r3.test.ts:15-25; src/content/drones/_checks.ts:30-45 | reformatting a figure file breaks content tests | medium | 2-3 days |
| Figure build not in the pipeline | figures/tools/cfbuild.py; 80 built files tracked | I verified 3 of 80 match; nothing checks the rest | medium | 0.5 day for `figures:check` |
| Python is a hidden test dependency | figures/engine/testkit.mjs:19 | `execFileSync('python3', ...)` | medium | 0.5 day to document or port |
| Three package roots, three lockfiles, no workspace | package-lock.json, server/realtime/, solana/ | separate installs; relay tests outside `npm test` | medium | 1 day |
| Relay and Anchor tests outside `npm run check` | package.json:26 | `check` runs root suites only | medium | 0.5 day |
| E2E skips real relay, AI, search, DB, Solana | e2e/ | rooms use BroadcastChannel; AI spec asserts the "off" state | medium | 2-4 days with fakes |
| Hard-coded counts in e2e | boardlab.spec.ts:57-68; dronelab.spec.ts:40,155 | 16 and 13 | low | 0.5 day |
| `test.skip` on missing content | fly.spec.ts:28; robotics.spec.ts:78 | hides deletions | low | 0.5 day |
| Agent-orchestration scripts in the product repo | scripts/workflows/*.js (2,773 lines) | not product code | low | delete or move |
| Hackathon-era env switches | next.config.ts:9-12 | `NEXT_DIST_DIR`, `IYNK_BUILD_SKIP_TYPECHECK` exist for "~40 agents sharing one tree" | low | 0.5 day |
| Docker images pinned by tag, not digest | deploy/realtime/Dockerfile:3; compose.yaml:28 | `node:24.22.1-alpine`, `caddy:2.11.7-alpine` | low | minutes |
| Root SSH with trust-on-first-use | scripts/realtime-deploy.sh:56 | `StrictHostKeyChecking=accept-new`, `SSH_USER` default root | low | minutes |
| Dead guard in `content` script | package.json:10 | "not written yet" branch | low | minutes |

## Test coverage (which test files, what they really check: hardware-derived reference values vs self-consistency with the implementation)

- Almost everything is self-consistency or regression against earlier versions of the team's own code. I found no test whose expected values come from hardware measurement, a vendor simulator or an independent reference implementation (VERIFIED by sampling uno-r3, quad5, lessons, status route and the e2e specs; I did not read all 173 files). The closest to external are the drone calculator goldens (from the team's research notes and original figure code) and the Betaflight CLI strings asserted in e2e/dronelab.spec.ts:92-112, whose origin against real Betaflight output I did not verify (UNKNOWN).
- Lesson tests (src/lib/interp/lessons.test.ts): per docs/verify/gate3.md, 102 of 102 references pass and 102 of 102 starters fail. This shows each lesson is solvable by its author's reference under the interpreter's own rules. It does not show the interpreter matches real Arduino, Python or Verilog on arbitrary learner programs.
- Coverage tooling: none (no coverage package in package.json, no script). Percent coverage is UNKNOWN.

### What is NOT tested (list)

- Anything on a clean machine, another OS, or another Node version. I exercised Node v24.8.0 on macOS only; there is no CI.
- The real relay over WebSocket from a browser; Vultr, Caddy, TLS and rt.iynk.tech.
- Real AI provider responses, SerpApi, Gemini fallback. smoke-ai.mjs and smoke-search.mjs are manual, skip without keys, and were not run (I must not call providers; gate3.md row 7 says they were never run with live keys at gate time).
- Solana on chain: no localnet or devnet transaction in vitest; the Anchor test is outside `npm run check`.
- Vercel runtime behaviour (function limits, cache components, `partialPrefetching`, next.config.ts:5-6) beyond what a local `next start` shows.
- Security: no CSP or header tests (none exist), no abuse or concurrency tests of rate limiting, no origin/CSRF test on a live deployment, no dependency scan.
- Performance: no Lighthouse, bundle-size or web-vitals budget, no load test of the app (the relay has `test/load.js`, outside `npm test`).
- Browsers: Chromium only (Desktop Chrome and Pixel 7 profiles). No Firefox or WebKit, so Safari behaviour for Web Audio and CodeMirror is unknown.
- Real hardware: WebSerial and WebUSB code (src/lib/hw/serial.ts, usb.ts) has no hardware-in-the-loop test.
- Accessibility inside figure iframes; screen readers; visual regression (screenshots are manual).
- Migration of a database holding real data (db-migrate.mjs is covered only by the optional Timescale test).

## Performance characteristics (measured if you can, else ESTIMATED/UNKNOWN)

- Vitest full run: 225 s wall, 1,252 s CPU on this machine under load (VERIFIED). Slowest files by wall time in that run: vtol.test.ts 222 s, octo 213 s, agrihex 197 s, basys3 193 s, gpscam 176 s, delivery 176 s, figures/engine/bench.test.mjs 141 s, lessons.test.ts 103 s (includes queueing under load). Slowest single case 141 s (basys3 chip sweep). Unloaded timing: UNKNOWN; the team notes content tests "under 3 s alone" (vitest.config.mts:13) and sets a 60 s global timeout (line 15) with some per-test overrides of 40-120 s.
- ESLint 64 s wall, tsc 9 s wall (VERIFIED, loaded machine).
- Playwright: 9 `test.setTimeout` calls of 90-120 s in e2e (e.g. fly.spec.ts:29, room.spec.ts:60). Server startup budget 600 s because it builds first. Suite wall time: see FEATURE_VERIFICATION; docs/verify records pass counts only. `fullyParallel: true`, no `workers` cap.
- `retries` is 0 locally and 2 only when `CI` is set (playwright.config.ts:20), but no CI exists, so retries never apply.
- Build: 826-827 pages (DOCUMENTED, HANDOFF). Build time not measured.
- Flakiness risks in order: (1) real-frame animation in jsdom under CPU contention (defect 1); (2) `.env.local` bleeding into e2e (defect 2); (3) hydration races, already patched with `toPass` retry loops (fly.spec.ts:44-47, fly-fun.spec.ts:33-38: "a pick made before the page has hydrated is put back by React"); (4) 60-90 s waits for `Gate \d+ of \d+` in fly specs; (5) random port from a 10,000-port range can collide, rarely.

## Security risks

- **Dependency audit (VERIFIED, `npm audit --omit=dev --json`, 2026-10-26):** 15 findings, 2 high, 13 moderate, 0 critical. High: `@coral-xyz/anchor` 0.31.1 (direct, via `toml`: uncontrolled recursion GHSA-82x6-q7mm-w9cf, prototype pollution GHSA-v5mp-jgw5-2x6j, quadratic-time DoS, CPU DoS) and `toml` itself. Moderate: `@solana/web3.js` 1.99.0 and `@solana/wallet-adapter-*` (via `jayson` to `stream-json`: GHSA-528h-pc64-c93x, GHSA-hqr4-qq8f-hg3x, GHSA-mjw6-4jj6-33hc; and `uuid` GHSA-w5hq-g745-h8pq). npm reports no non-breaking fix for the direct ones. Whether the vulnerable code runs on user-controlled input in the deployed app is UNKNOWN (not traced).
- **Outdated (VERIFIED, `npm outdated`):** deps are mostly exact-pinned and only patch versions behind (react 19.3.0 vs 19.3.1, vitest 5.0.3 vs 5.0.5, playwright 1.64.0 vs 1.64.1, vite 8.3.4 vs 8.3.5). Major gaps: typescript 5.9.3 vs 7.0.2, eslint 9.39.5 vs 10.13.0, @types/node 24 vs 26, @solana/web3.js 1.99.0 vs 3.1.1, @coral-xyz/anchor 0.31.1 vs 0.32.1. For jsdom the registry's `latest` (29.1.1) is below the installed 30.1.2.
- **Pinning:** runtime and test deps are exact versions (package.json:15-60). Caret ranges: `@tailwindcss/turbopack ^4`, `tailwindcss ^4`, `@types/react ^19`, `@types/react-dom ^19`, `eslint ^9`, `typescript ^5`; the lockfile freezes them. No `overrides`. No Renovate or Dependabot; no audit step anywhere.
- **Node 24 requirement:** `engines.node: "24.x"` (package.json:5), `.nvmrc` is `24`, the relay needs `>=24`, the Dockerfile uses `node:24.22.1-alpine`. gen-content-index.mjs loads `.ts` content with Node's built-in type stripping ("Node >= 22.18 / 24", file header), so builds fail on older Node, and content modules may use only erasable TypeScript syntax (no enums, no parameter properties). The Vercel project's Node setting is not visible from the repo (UNKNOWN).
- **No security headers on the app.** next.config.ts:23-35 sets headers only for `/figures/:path*` (frame-ancestors 'self', nosniff, cache). `grep -rlE "Content-Security-Policy|X-Frame-Options|Strict-Transport" src next.config.ts` finds only next.config.ts. No CSP, HSTS, Referrer-Policy or Permissions-Policy for pages or API routes. Vercel adds HSTS on its own domains; the app sets none. Medium for a product with a wallet adapter and user-written code.
- **Verify layer replays client-supplied events (VERIFIED).** `verifyRun` replays `run.inputs` (src/lib/verify/index.ts, `verifyRun`). The `init` event carries `smokeOk`, `motorOk`, `accOk`, `placed`, `plugged` as client-asserted values (drone-safety.ts:25-31, 68). A forged but internally consistent log passes and yields a score. Only `drone-safety` is verifiable (`VERIFIABLE`, index.ts:12); the other four kinds return "unsupported". The server "never trusts `result`" (runlog.ts comment), but it trusts the inputs equally. The Solana credential therefore attests "this event log obeys the rules", not "this person did the work". High if credentials are sold as proof of skill.
- **Secrets in scripts:** smoke-ai.mjs, smoke-search.mjs and db-migrate.mjs read .env.local and say they never print values; I read their loaders, not every `console.log`. `.env.local` is git-ignored and excluded from Vercel uploads (`.vercelignore`: `.env*`, `!.env.example`). Real keys live in a plaintext .env.local on the laptop, including variables named `VULTR_API_KEY` and `SOLANA_ISSUER_KEYPAIR` (names only, no values read). Medium: the issuer keypair signs credentials.
- **Deploy script and VM:** root SSH, `StrictHostKeyChecking=accept-new`, `rsync --delete` (realtime-deploy.sh:56 and the RSYNC line). The relay container is hardened (`read_only`, `cap_drop: [ALL]`, `no-new-privileges`, 512 MB; compose.yaml:19-23). Caddy publishes 80/443 and `/metrics` (defect 6).
- **.vercelignore** correctly keeps /docs, /scripts (except the generator), /e2e, /server, /deploy, /solana, /db and /HANDOFF.md out of uploads.

## Reusability for an original-project builder (can this run on arbitrary user projects, or only on catalogue items? why?)

- The test and build tooling runs only on catalogue items. The generator scans `src/content/{boards,robotics,drones}/*.ts` (scripts/gen-content-index.mjs, `scan`) and emits typed loaders and an `AVAILABLE` list. Per-item tests are hand-written files (`quad5.test.ts` etc.) that import the item module and its figure file. A user project would have no registry entry, no `figures/<kind>/<id>.js`, no six-language prose JSON, no golden table and no test file.
- Reusable parts: `checkCraft()` in src/content/drones/_checks.ts (a function over any `DroneContent`), the lesson runner `runChecks` / `lessonJob` in src/lib/interp, the hashing in src/lib/verify/hash.ts (canonical JSON plus SHA-256, item-agnostic), `benchEventSchema` / `replayDroneSafety` (craft-agnostic given a `DroneTestSet`), and `crawl-routes.mjs` (reads the prerender manifest). The e2e specs are written against the three labs' current routes and copy.
- Blockers: (1) a build-time registry plus static prerender of 826 pages; user content needs a runtime registry and a storage path; (2) figures are compiled by a Python script into tracked HTML, so a user cannot add one at runtime; (3) tests need Python, minutes of jsdom animation per craft, and regexes over figure source; (4) verification covers one kind; (5) no CI to run a user project's checks.

## Required refactoring to get there

1. Add CI first: `content:check`, `typecheck`, `lint`, sharded vitest, relay tests, an `npm audit` gate, and Playwright on a keyless build. Blank `META_API_KEY`, `NEXT_PUBLIC_REALTIME_URL`, `DATABASE_URL`, `SERPAPI_KEY`, `GEMINI_API_KEY` and `SOLANA_*` explicitly in `webServer.env` so a local .env.local cannot leak in (fixes defect 2).
2. Make figure-engine tests clock-driven (fake timers or a `step(ms)` hook), drop the 40-120 s timeouts, and split the slowest files (vtol, octo, agrihex, gpscam, delivery, basys3).
3. Replace regex scraping with exports: each figure publishes `{ parts, headers, circuits }` that the build and the tests both import.
4. Put cfbuild behind `npm run figures` and `figures:check` (rebuild to temp, diff against public/figures) and run it in CI. Declare `playwright`, `sharp`, `acorn` as devDependencies.
5. Add npm workspaces (or at least `test:relay` and `test:all`) and `vitest --coverage` with a floor.
6. Move per-item boilerplate into a data-driven suite that accepts any content module from a runtime registry; keep hand-written files only for item-specific logic.
7. Add security headers (CSP with `frame-ancestors`, `connect-src` for relay and RPC, HSTS, Referrer-Policy) in next.config.ts, and a test asserting them.
8. Triage the audit findings (Anchor and web3.js chain), pin `typescript`, `eslint`, `tailwindcss` exactly, add Renovate.
9. Verify trust model: server-issued seed and server-observed events, or state in product copy that the credential means "rule-consistent log".
10. Connect Vercel to Git, record settings in vercel.json, and add a preview deploy per PR.

## Recommendation: extend

The checks are broad and mostly green (tsc and eslint exit 0, 2,794 of 2,802 vitest cases and 39 of 39 relay tests pass), so keep them; add CI, a hermetic e2e environment, deterministic figure tests and a real verification model before a product depends on them.

## Open questions

- What Node version, build command and install command does the Vercel project use, and is a Git integration connected? (Dashboard only.)
- Does the relay's `/metrics` expose anything sensitive, and does Caddy need to proxy it? (server/realtime not read.)
- Are the toml, stream-json and uuid findings reachable in the deployed server or client bundles? (Not traced.)
- How long does the e2e suite take on an idle machine, and does it pass with every key blanked? I did not run it; quote FEATURE_VERIFICATION.
- Is the compose project on the Vultr VM still `simlab-realtime`? (Needs an SSH look; not done.)
- Should Firefox and WebKit projects be added, given Web Audio and CodeMirror differences?
- Are the "original figure sources" behind the drone goldens still available for re-derivation?
