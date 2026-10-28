# B0 task packages: Foundation, green, safe, smaller

Written 2026-10-27 for the build-plan step. Plan only: no file in `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed, and nothing was committed. Scratch probes live in `/Users/amar/iynk-master-plan-scratch/buildplan/B0/`.

Labels: VERIFIED (read in code or measured in this step), DOCUMENTED (a plan file says it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN.

Binding inputs: `00_EXECUTIVE/DECISION_REGISTER.md` (D-013 to D-017), `05_ENGINEERING/IMPLEMENTATION_ROADMAP.md` (phase card B0 and its 25 task rows), `03_PRODUCT/PRODUCT_REQUIREMENTS.md` (R-001 to R-008, R-017, R-018), `03_PRODUCT/COMMUNITY.md` section 4 (removal map and the 4.6 residual grep), `04_ARCHITECTURE/RECONCILIATION.md` (RC-16, RC-27, RC-28, RC-68), `04_ARCHITECTURE/BACKEND_ARCHITECTURE.md` section 13.1 (`IYNK_SERVER_TOKEN`), `01_AUDIT/` (SECURITY_BASELINE sections 8 to 10, TEST_COVERAGE section 4, runs/COMMANDS.md, runs/BUILD_OUTPUT.md, runs/E2E.md).

Scope: F-001, F-002, F-004, F-006, F-180, F-195, F-202; R-001 to R-008, R-017, R-018. Not in B0: bring-your-own keys, CSP, README rewrite, bundle work (all B1).

Exit: `npm run check` green keyless; BUILD ok; LOAD passes three times; COMMUNITY 4.6 residual grep empty; `npm audit --omit=dev` shows 0 high; `scripts/ci-local.sh` exit 0. Then Amar's OK.

## 0. What this step found that changes the roadmap rows

The roadmap lists 25 rows (T-B0-01 to T-B0-25). This file keeps those ids and adds seven (T-B0-26 to T-B0-32). Every difference is listed here so nothing is silent.

| # | Finding | Evidence | Effect |
|---|---|---|---|
| 1 | The kept routes number 12, not 13. | `find src/app/api -name route.ts` lists 23; minus solana 3, `ai/{story,image,plan,match}` 4, buddies, leaderboard, live, telemetry 4 = 12 (VERIFIED). The roadmap card names 3 + 2 + 1 + 5 + 1 = 12 routes and says 13. | T-B0-22 lists 12 files. |
| 2 | Per-frame render, not wall-clock polling alone, makes the drone tests slow. | Probe `probe5.mjs` (scratch): octo `build`, `plugIn`, `gear` took 14,011 ms on real frames and 365 ms when stepped with a new `advanceUntil` seam; the two `report()` JSON strings were identical (828 bytes). One `ui.render()` costs about 75 ms with no canvas (VERIFIED, load 3.9). Calling `render()` after every 0.05 s step makes the stepped run as slow as real frames (11.6 s, `probe3.mjs`). | T-B0-01 needs an engine seam in `figures/engine/drone.js`, not only `_checks.ts` and `testkit.mjs`. |
| 3 | Six drone files carry their own `Date.now()` pollers (`until`) besides `settle()`. | `grep -n "const until\|Date.now()" src/content/drones/*.test.ts`: agrihex 185, 227; delivery 152; gpscam 97; tricopter 173; swarm 198, 221; vtol 196 (VERIFIED). | T-B0-01 replaces them with one `fig.until`. |
| 4 | The built figure pages are byte-identical to a fresh `cfbuild` today. | `cfbuild.py drones/octo --out ...` then `cmp` against `public/figures/drones/octo.html`: identical (VERIFIED). | Editing `drone.js` means rebuilding 13 generated pages in the same commit. |
| 5 | The 4.6 residual grep as written also hits untracked local files. | `.gitignore` lines 51 to 67 ignore `/HANDOFF.md`, `/scripts/workflows/`, `/scripts/handoff-status.sh`, `/docs/DECISIONS.md`, `/docs/hacktx/` (VERIFIED, `git ls-files` returns 0 for each). 13 of the 151 plain-grep hits are in `scripts/workflows/`. | The gate uses `git grep` (tracked files only). 138 tracked files hit today (VERIFIED). |
| 6 | `README.md` is in the 4.6 grep but README work is B1. | `git grep` hits README.md lines 55, 56, 64, 65, 67, 76, 82, 90, 95, 112, 115, 117, 133, 142, 146. | New T-B0-27 strikes only the lines that name removed features. The rewrite stays B1. |
| 7 | `docs/DECISIONS.md` is not tracked. | See 5. | A "dated line per removal" cannot ride in a task commit. Each removal task appends its line to the local file; it is not part of the commit. |
| 8 | `nav.ts` and `showNavEntry` need `NavLinks.tsx`, and `types.ts` needs nothing. | `NavLinks.tsx:25` calls `showNavEntry(entry, features, layout)`; `dock/types.ts` has no dock tab type (`DockTab` is in `src/lib/ai/tools.ts:10`) (VERIFIED). | T-B0-10 swaps `types.ts` for `NavLinks.tsx`. |
| 9 | `guardAi` branches on the `image` feature. | `src/lib/server/ai/guard.ts:12,23,24,27`. | T-B0-14 edits `guard.ts`. |
| 10 | `backends.ts` has no user once `plan_build_night` goes. | `grep -rn "backends\|postRoute" src`: only `tools/together.ts:7`. | T-B0-09 deletes it. |
| 11 | `maxDuration` and comments in the two MCP routes name `plan_build_night`. | `src/app/api/mcp/route.ts:6-7`, `src/app/api/mcp/tools/[name]/route.ts:5-6`. | T-B0-23 edits them (it edits those files anyway). |
| 12 | `api.tsx` and `catalog.ts` are half dead after Planner and Buddies go. | `api.tsx`: `postJson`, `ApiResult`, `FeatureGate` have importers only in `Planner.tsx:15` and `Buddies.tsx:17`. `catalog.ts`: only `LABS` is used outside planner and matcher (`chat/route.ts:4`). | T-B0-16 trims both. |
| 13 | The PRD names four route classes; the roadmap names three. | R-007 lists `removed`, `local-only`, `needs-server-token`, `needs-user-key`. | `removed` is expressed by deleting the route (the test fails on a listed file that is gone). `needs-user-key` stays in the type for B1. |
| 14 | R-004 says buddy server code stays "unrouted" for R-081. The roadmap deletes the Postgres layer. | PRD R-004 last bullet; roadmap B0 card "Database changes"; BACKEND BE-0. | Follow the roadmap and BE-0 (SQLite later, ADR-0004). Git history keeps the SQL. Amar can overrule. |
| 15 | Express `ip` is gone from Next 16. | `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-request.md:123`: "`v15.0.0` `ip` and `geo` removed" (DOCUMENTED). | A route handler has no socket address. T-B0-24 uses one fixed shared key `direct` when no trusted proxy header exists, and says so. |
| 16 | `git rm -r solana` leaves 1.1 GB on disk. | `du -sh solana` = 1.1G; 22 files are tracked (VERIFIED). `node_modules` and `target` are untracked. | T-B0-18 removes tracked files only. Deleting the rest is "For Amar". |
| 17 | `about/page.tsx` links three older sibling apps on `*.vercel.app`. | `src/app/[lang]/about/page.tsx:20-22` (VERIFIED). | R-005's "search for vercel" gate cannot be empty there. T-B0-20 greps for the platform (env names, `.vercel`, config) and leaves the three links. Open question 3. |
| 18 | History holds no Google, `sk-`, GitHub, AWS, PEM or Slack key shape. Five commits match the Postgres URL shape. | `git log --all -G'postgres(ql)?://[^:/[:space:]]+:[^@[:space:]]+@'` lists `dab0587 16a3d09 ca09a95 d5bdf44 74e41ce`; `git log --all -G'AIza[0-9A-Za-z_-]{35}'` lists none (VERIFIED). 808 commits (`git rev-list --all --count`). | T-B0-07 needs an allow-list with a reason per entry. |
| 19 | `npm audit --omit=dev` today: 15 findings, 2 high, 13 moderate. Both highs come through `@coral-xyz/anchor` (`toml`). | Run in this step (VERIFIED). | T-B0-18 should clear both (ESTIMATED until the run). |
| 20 | With server keys set and `IYNK_AI_ENABLE` unset, B0 makes AI answer 501. The browser has no way to send the token until B1. | Roadmap risk R3. | Accepted by the roadmap. Surfaced in "For Amar" because it also affects production if `build/v1` is merged. |

## 1. Conventions every task uses

| Item | Rule |
|---|---|
| Branch | Orchestrator cuts `build/v1` from `main` once, before G1. Nothing is pushed. A push to `main` deploys production (DOCUMENTED, `HANDOFF.md`). |
| Commit | One commit per task. Author is Amar Kushwaha (`bash scripts/handoff-status.sh` prints the identity). No `Co-Authored-By` line, no "Generated with" line. Message: `B0 T-B0-nn: <what>`. |
| Off limits | Production services, `.env.local` values, ports 3000 and 43117. A task never reads `.env.local`. Never run `scripts/smoke-*.mjs` (they read `.env.local`). Never deploy. |
| Next.js | Next 16.4.3 (VERIFIED, `package.json`). Read `node_modules/next/dist/docs/01-app/...` before naming a Next API. B0 uses: `headers()` and `poweredByHeader` in `next.config.ts` (`03-api-reference/05-config/01-next-config-js/headers.md`, `poweredByHeader.md`), route handlers (`03-file-conventions/route.md`), `connection()` from `next/server` as the status route already does. Same-key headers: "the last header key will override the first" (`headers.md:47`). |
| 5-file rule | At most 5 source files edited or created per task. Not counted: test files, deleted files, generated files, docs, the six copies of one i18n JSON file (1), `package.json` with its lockfile (1). Each card states its count. |
| Parallel agents | Files in one group are disjoint (section 4), so a group's commits cherry-pick onto `build/v1` without conflict. Run each agent in its own `git worktree` and `npm ci` there, or run the group in order if a shared tree is used. UNKNOWN whether Turbopack accepts a symlinked `node_modules`; do not rely on it. |
| Standard fields | Status of every task is "not started". Permissions: the agent edits only the files its card names and reads no secret. Release blockers: any listed proof command fails, or a file outside the card changes. A row marked "Not applicable" names the fields it covers so the omission is visible. |
| Words | Plain, no em dashes. Copy changes update all six languages in the same commit. |

### Proof commands (exact)

| Name | Command |
|---|---|
| `TL` | `npm run typecheck && npm run lint` |
| `V <paths>` | `npx vitest run <paths>` |
| `KL` | `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_REALTIME_URL= IYNK_SERVER_TOKEN= IYNK_AI_ENABLE= IYNK_SEARCH_ENABLE= NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL=` (the first seven are the names that survive B0; the rest are blanked until T-B0-18 removes the code that read them). `KL` is a prefix a person or agent types; no file under the RESIDUAL paths holds the legacy names |
| `BUILD <label>` | `KL NEXT_DIST_DIR=.next-<label> npm run build` |
| `E <label> <specs>` | `KL NEXT_DIST_DIR=.next-<label> npx playwright test <specs>`; Playwright picks a random port (`playwright.config.ts:5`) and builds unless `E2E_SKIP_BUILD=1` |
| `LOAD <cmd>` | `for i in $(seq 14); do node -e "const e=Date.now()+900000;while(Date.now()<e);" & done; <cmd>; kill $(jobs -p)` (14 busy loops on a 14-core machine, `sysctl -n hw.ncpu` = 14, VERIFIED) |
| `RESIDUAL` | `git grep -niE "solana\|passport\|StoryCard\|useBuildLog\|session-log\|story-png\|plan_build_night\|get_passport\|api/ai/(story\|plan\|match\|image)\|api/buddies\|api/leaderboard\|api/live\|LiveCounter\|Build Night\|Build Story\|Proof of Build" -- src server e2e scripts db deploy README.md package.json .env.example next.config.ts` (prints nothing at B0 exit; `git grep` reads tracked files only, finding 5) |
| Residual rule | `RESIDUAL` runs exactly as written, with no `:!` excludes, so no file that survives B0 may contain a banned word, tests and scripts included. A test that asserts a removed thing is gone builds the word at run time (for example `["sol","ana"].join("")`, `["pass","port"].join("")`) and keeps the word out of its test names and comments. `scripts/ci-local.sh` blanks only the seven names that survive B0. The legacy names live only in docs, in the `KL` prefix above, and in the `BLANK` list of `playwright.config.ts` (a root file, outside the RESIDUAL paths). Each card that adds such a test says so. Dry run of the planned end state: section 4.3. |

Playwright's own `forbidOnly` and `retries` stay as they are (`playwright.config.ts:19-20`: retries 2 only when `CI` is set). Task proofs run with `CI` unset so `retries` is 0.

## 2. Task index

Source count is the number of source files edited or created (rule in section 1). Ids T-B0-01 to T-B0-25 are the roadmap's; T-B0-26 to T-B0-32 are new.

| Id | Title | Subsystem | Pri | Depends on | Group | Src |
|---|---|---|---|---|---|---|
| T-B0-26 | Spike: what makes the `]` shortcut miss | tests | P0 | none | G1 | 0 |
| T-B0-01 | Drone figure tests step simulated time, not the wall clock | tests, figures | P0 | none | G1 | 3 |
| T-B0-02 | Split the basys3 display sweep; one shared test timeout | tests | P0 | none | G1 | 1 |
| T-B0-03 | Playwright isolation: blank keys, skip port 43117, no request leaves localhost | tests | P0 | none | G1 | 2 |
| T-B0-05 | Under `CI=true` a missing service fails the test and names it | tests | P0 | none | G1 | 1 |
| T-B0-07 | Secret scanner: history once, then the diff | tooling | P0 | none | G1 | 2 |
| T-B0-08 | Telemetry: default off, no network call | client | P0 | none | G1 | 2 |
| T-B0-09 | MCP drops `get_passport` and `plan_build_night` | server | P0 | none | G1 | 4 |
| T-B0-25 | Interpreter caps: 1,000,000 elements, 1 MB serial | interp | P0 | none | G1 | 3 |
| T-B0-04 | Fix the `]` shortcut race without a retry | client, tests | P0 | 03, 26 | G2 | 2 |
| T-B0-06 | CI workflow and `scripts/ci-local.sh` | tooling | P0 | 03, 05, 07 | G2 | 2 |
| T-B0-10 | Dock, nav, footer stop offering Passport and Verify; dock stops feeding the story log | client | P0 | 03 | G2 | 5 |
| T-B0-20 | Remove Vercel and Vultr from the repo; `/metrics` off the proxy | config | P0 | none | G2 | 5 |
| T-B0-11 | Remove Solana server code, the `solana` flag and its env | server | P0 | 10 | G3 | 4 |
| T-B0-13 | Remove Build Stories, client side | client | P0 | 10 | G3 | 5 |
| T-B0-15 | Remove Build Night | client, server | P0 | 09 | G3 | 1 |
| T-B0-12 | Remove Solana client code and pages | client | P0 | 10, 11 | G4 | 2 |
| T-B0-14 | Remove Build Stories, server side, and the image route | server | P0 | 13, 11 | G4 | 5 |
| T-B0-16 | Remove the public buddy pool, matcher, board and live counter | client, server | P0 | 15, 03 | G4 | 5 |
| T-B0-17 | Remove the telemetry route and the Postgres layer | server | P0 | 08, 11, 14, 16 | G5 | 4 |
| T-B0-19 | Delete orphan i18n keys in six languages | i18n | P0 | 10, 12, 13, 15, 16 | G5 | 4 |
| T-B0-21 | Security headers on every route; `poweredByHeader: false` | config | P0 | 03, 11, 20 | G5 | 1 |
| T-B0-18 | Delete `solana/`, drop dependencies, rewrite `.env.example`, drop the `.vercel` ignore line | repo | P0 | 12, 17 | G6 | 3 |
| T-B0-22 | Route classes, one access helper, env switches | server | P0 | 14, 17 | G6 | 3 |
| T-B0-28 | Telemetry leftovers: drop dead exports and constants | client | P1 | 08, 16, 17 | G6 | 5 |
| T-B0-23 | Apply the classes: server token (401) and `feature_disabled` (501) on the kept routes | server | P0 | 09, 14, 22 | G7 | 5 |
| T-B0-24 | `IYNK_TRUST_PROXY` gates forwarded headers; no shared `unknown` key | server | P0 | 22 | G7 | 1 |
| T-B0-27 | Strike removed-feature lines from README | docs | P0 | 12, 13, 15, 16, 17, 18 | G7 | 1 |
| T-B0-29 | Remove CORS `*` from MCP and OpenAPI; drop the image smoke call | server, tooling | P0 | 23 | G8 | 4 |
| T-B0-31 | Slow-test report script and the `.only` guard in `scripts/ci-local.sh` (TS-2) | tooling | P1 | 06 | G8 | 2 |
| T-B0-32 | One `randomTestPort()` that never draws 43117, used by the relay tests (TS-1) | tests | P1 | 05 | G8 | 4 |
| T-B0-30 | Phase exit gate (no file changes) | verification | P0 | all, including 31 and 32 | G9 | 0 |

## 3. Parallel groups

Groups run in order. Tasks inside a group touch disjoint files (section 4) and can be built by separate agents at once. "Why this order" names the file or type that forces it.

| Group | Tasks | Why this order |
|---|---|---|
| G1 | 26, 01, 02, 03, 05, 07, 08, 09, 25 | Disjoint sets: spike notes, `figures/engine` and drone tests, vitest config and board tests, `playwright.config.ts` with every `e2e/*.spec.ts` import line, `src/test-support`, `scripts/secret-scan*`, telemetry client, `src/lib/server/mcp`, `src/lib/interp`. T-B0-03 edits all 13 spec files, so every later task that edits a spec waits for it. |
| G2 | 04, 06, 10, 20 | 04 needs the spike (26) and the new spec imports (03). 06 calls the scanner (07), the e2e config (03) and the service rule (05). 10 edits `e2e/dock*.ts` (03). 20 edits `next.config.ts` first so 11 and 21 follow it. |
| G3 | 11, 13, 15 | 11 and 13 need the dock no longer importing `PassportPanel` or the story log (10). 15 needs the MCP planner tool gone (09), since `plan_build_night` calls `/api/ai/plan`. |
| G4 | 12, 14, 16 | 12 deletes `src/lib/verify`, imported only by Solana code (11 removed the server importers). 14 edits `env.ts` and `features.ts` after 11, and needs `PartnerPanel` no longer reading `features.image` (13). 16 edits `Lobby.tsx` after 15 and `e2e/fly-fun.spec.ts` after 03. |
| G5 | 17, 19, 21 | 17 deletes the Postgres layer, which the buddy, leaderboard and live routes used (16), and edits `env.ts` after 14. 19 removes i18n keys only after no code reads them (10, 12, 13, 15, 16). 21 edits `next.config.ts` after 20 and 11. |
| G6 | 18, 22, 28 | 18 drops `postgres` after its last importer is gone (17) and `@solana/*` after 12. 22 edits `env.ts` and `http.ts` after 17. 28 edits telemetry files after 08, 16, 17. |
| G7 | 23, 24, 27 | 23 and 24 need the helper from 22. 24 edits only `http.ts` and its two tests; the route tests that need `IYNK_TRUST_PROXY=1` get that stub from 22 (stubEnv tests) and 23 (env-mock tests), so 23 and 24 share no file. 27 edits README after every removal, so its text is final. |
| G8 | 29, 31, 32 | 29 deletes `withCors` and the preflight helpers after 23 removed their route callers (the route files and the helpers cannot change in one task without passing 5 files). 31 edits `scripts/ci-local.sh` and `scripts/ci-local.test.mjs` after 06 wrote them (G2) and after 18 and 19 settled the residual rule for scripts. 32 edits `relay.integration.test.ts` after 05 (G1). The three share no file with each other. |
| G9 | 30 | Runs the exit gate on the finished tree, after 31 gave it the slow-test script and the `.only` step and 32 fixed the port draw. |

Longest chain: 03 to 10 to 11 to 14 to 17 to 22 to 23 to 29 to 30.

## 4. File ownership

Rule: no file appears twice in one group. Files edited by several tasks are in the first table in the order the tasks run. Every other edited file belongs to one task and is listed in that task's card.

### 4.1 Files with more than one owner (always in different groups)

| File | Tasks in order |
|---|---|
| `next.config.ts` | 20 (G2), 11 (G3), 21 (G5) |
| `src/lib/server/env.ts`, `src/lib/server/env.test.ts` | 11 (G3), 14 (G4), 17 (G5), 22 (G6) |
| `src/lib/features.ts`, `src/lib/features.test.tsx` | 11, 14, 17 |
| `src/app/api/status/route.ts`, `route.test.ts` | 11 (G3), 17 (G5); the test only: 22 (G6, env stubs) |
| `src/components/dock/LabDock.tsx`, `LabDock.test.tsx` | 10 (G2), 14 (test literal only, G4) |
| `src/lib/ai/tools.ts` | 10 |
| `src/components/ai/PartnerPanel.test.tsx` | 13 (G3), 14 (G4) |
| `src/app/[lang]/together/Lobby.tsx` | 15 (G3), 16 (G4) |
| `src/lib/server/ai/guard.ts` | 14 (G4), 23 (G7) |
| `src/lib/server/http.ts`, `http.test.ts` | 22 (G6), 24 (G7) |
| `src/lib/server/mcp/transport.ts`, `rest.ts`, `http.ts` | 29 only (G8) |
| `src/lib/server/mcp/{openapi,e2e,transport}.test.ts` | 09 (G1), 23 (G7: token header, env mock, drop `OPTIONS` and the `*` and preflight assertions), 29 (G8: assert no `access-control-*`) |
| `src/app/api/ai/{chat,transcribe,translate}/route.test.ts` | 22 (G6: `IYNK_AI_ENABLE`, `IYNK_SEARCH_ENABLE`, `IYNK_TRUST_PROXY` stubs), 23 (G7: token header and the 401, 501 cases) |
| `src/app/api/search/routes.test.ts` | 23 only (env mock gains the switches, token and `IYNK_TRUST_PROXY`) |
| `scripts/ci-local.sh`, `scripts/ci-local.test.mjs` | 06 (G2), 31 (G8: `no-only` step, Python check, expected step list) |
| `src/lib/realtime/relay.integration.test.ts` | 05 (G1: `serviceMissing`), 32 (G8: port draw) |
| `e2e/shell.spec.ts` | 03 (G1: import line and new case), 16 (G4: drops the `aiOff` assertion) |
| `src/lib/telemetry/client.ts`, `client.test.ts` | 08 (G1), 28 (G6) |
| `src/lib/telemetry/index.ts` | 17 (G5), 28 (G6) |
| `src/lib/server/ai/provider.test.ts`, `types.ts`, `provider.ts` | 14 only |
| `package.json`, `package-lock.json` | 18 only |
| `.env.example` | 18 only |
| `e2e/*.spec.ts` import line | 03 (G1), then the owner of each spec: boardlab 04, dock 10, redirects 12, fly-fun 16, room 15 (G3) |
| `.gitignore` | 18 only |

### 4.2 Single-owner files

| Task | Files (source first, then tests, then deletes) |
|---|---|
| 26 | `docs/MASTER_PLAN/08_RESEARCH_SPIKES/B0-S1-shortcut-race/REPORT.md` |
| 01 | `figures/engine/drone.js`, `figures/engine/testkit.mjs`, `src/content/drones/_checks.ts`; tests `src/content/drones/{agrihex,cinewhoop,delivery,gpscam,longrange,octo,quad5,racer,swarm,tricopter,vtol,whoop,wing}.test.ts`; generated `public/figures/drones/*.html` (13) |
| 02 | `vitest.config.mts`; tests `src/content/boards/{basys3,de10-lite,nucleo-f401re,uno-r3,uno-r4}.test.ts`, `src/lib/interp/lessons.test.ts` |
| 03 | `playwright.config.ts`, `e2e/support/no-egress.ts`; tests all 13 `e2e/*.spec.ts` (import line only), `e2e/shell.spec.ts` (new case) |
| 05 | `src/test-support/require-service.ts`; tests `src/test-support/require-service.test.ts`, `src/lib/realtime/relay.integration.test.ts` |
| 07 | `scripts/secret-scan.mjs`, `scripts/secret-scan.allow.json`; test `scripts/secret-scan.test.mjs` |
| 08 | `src/lib/progress/storage.ts`, `src/lib/telemetry/client.ts`; tests `src/lib/telemetry/client.test.ts`, `src/lib/progress/progress.test.ts` |
| 09 | `src/lib/server/mcp/tools/index.ts`, `tools/together.ts`, `registry.ts`, `openapi.ts`; tests `tools.test.ts`, `e2e.test.ts` (`:11`, `:50`, `:57`, `:89`), `openapi.test.ts`, `transport.test.ts`; deletes `tools/passport.ts`, `backends.ts` |
| 25 | `src/lib/interp/python/runtime.ts`, `src/lib/interp/arduino/interp.ts`, `src/lib/interp/run.ts`; tests `python/python.test.ts`, `arduino/arduino.test.ts`, `src/lib/interp/headless.test.ts` |
| 04 | `src/components/boardlab/shortcuts.ts`, `src/components/boardlab/LessonWorkspace.tsx`; tests `e2e/boardlab.spec.ts`, `src/components/boardlab/shortcuts.test.ts` (new) |
| 06 | `.github/workflows/ci.yml`, `scripts/ci-local.sh`; test `scripts/ci-local.test.mjs` |
| 10 | `src/components/dock/LabDock.tsx`, `src/lib/ai/tools.ts`, `src/components/shell/nav.ts`, `FooterNav.tsx`, `NavLinks.tsx`; tests `LabDock.test.tsx`, `nav.test.ts`, `e2e/dock.spec.ts`, `e2e/dock-shared.ts`, `e2e/dock.phone.spec.ts` |
| 20 | `deploy/realtime/Caddyfile`, `deploy/realtime/compose.yaml` (line 1 comment), `next.config.ts`, `src/i18n/seo.ts`, `src/lib/realtime/ws-transport.ts`; deletes `.vercelignore`, `scripts/realtime-vultr-create.sh`, `scripts/realtime-deploy.sh`; test `src/i18n/seo.test.ts` (new) |
| 11 | `src/app/api/status/route.ts`, `src/lib/server/env.ts`, `src/lib/features.ts`, `next.config.ts`; tests `env.test.ts`, `features.test.tsx`, `status/route.test.ts`; deletes `src/app/api/solana/`, `src/lib/server/solana/`, `src/lib/server/solana-ready.ts` and test |
| 13 | `src/components/ai/PartnerPanel.tsx`, `src/components/ai/index.ts`, `src/lib/ai/conversation.ts`, `src/lib/ai/protocol.ts`, `src/lib/ai/client.ts`; tests `PartnerPanel.test.tsx` (+ `conversation` test if it names the log); deletes `StoryCard.tsx` (+test), `useBuildLog.ts`, `src/lib/ai/session-log.ts` (+test), `src/lib/ai/story-png.ts` |
| 15 | `src/app/[lang]/together/Lobby.tsx`; test `e2e/room.spec.ts`; deletes `Planner.tsx`, `src/app/api/ai/plan/`, `src/lib/server/ai/plan.ts`, `prompts/plan.ts` |
| 12 | `src/i18n/namespaces.ts`, `scripts/crawl-routes.mjs`; tests `e2e/redirects.spec.ts`, `src/i18n/messages.test.ts`; deletes `src/components/solana/`, `src/lib/solana/`, `src/lib/verify/`, `src/app/[lang]/passport/`, `src/app/[lang]/verify/`, `src/i18n/messages/*/solana.json` |
| 14 | `src/lib/server/ai/types.ts`, `provider.ts`, `guard.ts`, `src/lib/server/env.ts`, `src/lib/features.ts`; tests `provider.test.ts`, `env.test.ts`, `features.test.tsx`, `LabDock.test.tsx`, `PartnerPanel.test.tsx`; deletes `src/app/api/ai/story/`, `src/app/api/ai/image/`, `prompts/story.ts`, `prompts/image.ts` |
| 16 | `src/app/[lang]/together/Lobby.tsx`, `src/app/[lang]/together/api.tsx`, `src/components/dronelab/FlyWorkspace.tsx`, `src/app/[lang]/drones/[drone]/fly/page.tsx`, `src/lib/server/ai/catalog.ts`; tests `e2e/fly-fun.spec.ts`, `e2e/shell.spec.ts`, `catalog.test.ts`; deletes `Buddies.tsx`, `src/app/api/{buddies,leaderboard,live}/`, `src/app/api/ai/match/`, `prompts/match.ts`, `src/components/data/` |
| 17 | `src/lib/server/env.ts`, `src/lib/features.ts`, `src/app/api/status/route.ts`, `src/lib/telemetry/index.ts`; tests `env.test.ts`, `features.test.tsx`, `status/route.test.ts`; deletes `src/app/api/telemetry/`, `src/lib/server/db/`, `db/`, `scripts/db-migrate.mjs`, `src/lib/telemetry/responses.ts` |
| 19 | `src/i18n/messages/*/{ai,together,shell,common}.json` (four sets); test `src/i18n/messages.test.ts` |
| 21 | `next.config.ts`; test `e2e/headers.spec.ts` (new) |
| 18 | `package.json` with `package-lock.json`, `.env.example`, `.gitignore`; test `scripts/env-example.test.mjs` (new); deletes tracked `solana/` |
| 22 | `src/lib/server/access.ts` (new), `src/lib/server/http.ts`, `src/lib/server/env.ts`; tests `src/app/api/routes.test.ts` (new), `http.test.ts`, `env.test.ts`, `src/lib/server/access.test.ts` (new), `src/app/api/ai/{chat,transcribe,translate}/route.test.ts`, `src/app/api/status/route.test.ts` (env stubs only) |
| 28 | `src/lib/telemetry/client.ts`, `kinds.ts`, `index.ts`, `src/lib/realtime/provider.tsx`, `src/lib/sound/react.ts`; tests `client.test.ts`, `src/lib/sound/react.test.tsx` |
| 23 | `src/lib/server/ai/guard.ts`, `src/app/api/mcp/route.ts`, `src/app/api/mcp/tools/[name]/route.ts`, `src/app/api/openapi.json/route.ts`, `src/lib/server/search/route.ts`; tests `src/app/api/search/routes.test.ts`, `src/app/api/ai/{chat,transcribe,translate}/route.test.ts`, `src/lib/server/mcp/{transport,openapi,e2e}.test.ts`, `src/app/api/mcp/routes.test.ts` (new) |
| 24 | `src/lib/server/http.ts`; tests `http.test.ts`, `ratelimit.test.ts` (the route tests that rely on `IYNK_TRUST_PROXY=1` are edited by 22 and 23, not here) |
| 27 | `README.md` |
| 29 | `src/lib/server/mcp/http.ts`, `transport.ts`, `rest.ts`, `scripts/smoke-ai.mjs`; tests `transport.test.ts`, `openapi.test.ts`, `src/lib/server/mcp/rest.test.ts` if present |
| 31 | `scripts/slow-tests.mjs`; tests `scripts/slow-tests.test.mjs`; and the 06 files above (edited, see 4.1) |
| 32 | `src/test-support/ports.ts`, `server/realtime/test/helpers.js`, `server/realtime/test/load.js`; tests `src/test-support/ports.test.ts`, `server/realtime/test/ports.test.js`, and `src/lib/realtime/relay.integration.test.ts` (see 4.1) |
| 30 | none |

### 4.3 The 138 tracked residual files and who clears them

`git grep -l` of the 4.6 pattern lists 138 tracked files (VERIFIED). Each goes to a task, so the gate is reachable.

| Files | Task |
|---|---|
| `src/lib/server/mcp/**` (12 files, 3 deleted or edited), `src/app/api/mcp/**` | 09, 23 |
| `src/components/dock/LabDock*`, `src/components/shell/{nav,FooterNav}*`, `e2e/dock*`, `src/lib/ai/tools.ts` (9) | 10 |
| `src/app/api/solana/**`, `src/lib/server/solana*`, `src/app/api/status/**`, `src/lib/server/env*`, `src/lib/features*`, `next.config.ts` (17) | 11 |
| `src/components/solana/**`, `src/lib/solana/**`, `src/lib/verify/**`, the passport and verify pages, `*/solana.json`, `namespaces.ts`, `crawl-routes.mjs` (42) | 12 |
| `StoryCard*`, `useBuildLog`, `session-log*`, `story-png`, `PartnerPanel*`, `components/ai/index.ts`, `conversation.ts`, `protocol.ts` (11) | 13 |
| `src/lib/ai/client.ts`, the story and image routes (3) | 13, 14 |
| `Planner.tsx`, plan route and tests, `plan.ts`, `prompts/plan.ts`, `Lobby.tsx` (5) | 15 |
| `Buddies.tsx`, buddies, leaderboard, live, match routes, `components/data/**` (12) | 16 |
| `db/**`, `src/lib/server/db/**`, `src/lib/telemetry/responses.ts` (5) | 17 |
| `package.json`, `.env.example` (2) | 18 |
| `src/i18n/messages/*/{ai,common,shell}.json`, `en/together.json` (19) | 19 |
| `README.md` (1) | 27 |

Dry run of `RESIDUAL` against the planned end state (run in this step on the current tree, then every file under a path that a card deletes was dropped): 67 tracked files remain, and each is edited or deleted by a card in the table above (`.env.example`, `README.md`, `e2e/dock*`, `next.config.ts`, `package.json`, `scripts/crawl-routes.mjs`, `src/app/[lang]/together/{Buddies,Lobby,Planner}.tsx`, `src/app/api/mcp/**`, `src/app/api/status/*`, the shell, dock and ai components, `src/i18n/**`, `src/lib/{ai,features,server/env,server/mcp,telemetry}/**`). The new and kept test and script files that would reintroduce a banned word are the ones the residual rule in section 1 governs: `e2e/redirects.spec.ts` and `src/i18n/messages.test.ts` (T-B0-12, T-B0-19), `scripts/env-example.test.mjs` (T-B0-18), `scripts/ci-local.sh` (T-B0-06), `src/components/dock/LabDock.test.tsx` (T-B0-10), `src/lib/features.test.tsx` and `src/lib/server/env.test.ts` (T-B0-11), and any removed-tool test in `src/lib/server/mcp` (T-B0-09). Each builds the word at run time or does not use it. VERIFIED for the list of remaining files (command above); ESTIMATED for the empty result, which T-B0-30 step 5 confirms.

## 5. For Amar (not agent tasks)

| # | Item | Why only a person can do it |
|---|---|---|
| 1 | Decide whether `build/v1` merges into `main` after B0. | `main` deploys production on Vercel (DOCUMENTED). B0 removes Passport, Build Night and the public board from the live site and turns AI off until B1 gives the browser a token field. |
| 2 | Decide whether removing the hackathon extras affects the HackTX entry. | `MEMORY.md`: only code after 11:30 on Oct 24 counts. UNKNOWN. Ask before merging. |
| 3 | Delete the untracked `solana/node_modules` and `solana/target` (about 1.1 GB) if wanted. | T-B0-18 removes tracked files only. Deleting local build output is Amar's call. |
| 4 | Check that the three `*.vercel.app` links on the About page (`src/app/[lang]/about/page.tsx:20-22`) should stay. | They are his other projects. |
| 5 | Confirm the budgets he wants at the B0 gate. | R-019 says Amar confirms or changes PROPOSAL budgets at the B0 gate; B0 records none (that is B1, T-B1-25). |
| 6 | Rotate the ElevenLabs key pasted in chat (HANDOFF.md, 2026-10-25 checkpoint). | A credential on his account. Not repo work. |
| 7 | Check any simulated fault on a real board with a multimeter. | Not in B0 (fault work is a later phase). Listed so nobody schedules it here. |

## 6. Open questions for the orchestrator or Amar

| # | Question | Default taken in this plan |
|---|---|---|
| 1 | The 4.6 grep includes README.md, but README work is B1. | T-B0-27 deletes only the lines that name removed features. |
| 2 | Without a proxy a route handler cannot see the peer address (`next-request.md:123`). Is one shared rate-limit bucket (`direct`) acceptable for a few friends? | Yes. Callers that matter hold the server token. |
| 3 | The R-005 gate "search for vercel" cannot be empty while the About page links `*.vercel.app` apps. | T-B0-20 greps for platform use, not the word. |
| 4 | PRD R-004 keeps buddy server code "unrouted"; BE-0 deletes the Postgres layer. | Delete (roadmap, BE-0, ADR-0004). |
| 5 | `Settings.telemetry` stays but does nothing in B0, and the toggle copy still says "Share anonymous usage counts". | B1 (F-016, `UsageToggle`) rewrites the copy and adds the local log. |
| 6 | Third-party GitHub Actions versions. | T-B0-06 reads the current stable majors from the actions' own README at build time (EXTERNAL, cannot be checked offline). |
| 7 | Do TS-4 (`e2e/support/axe.ts`) and TS-5 (`e2e/a11y-routes.spec.ts`) go into B1? | No. Not planned until Amar says yes; if he does, they become B1 cards in `tasks/B1-foundation-keys-oss-honest.md`. TEST_STRATEGY 12.4 step 8 then keeps the clause; without it, the clause goes (see "Cross-review fixes"). |

## 7. Task cards

Each card has the same rows: identity, intent, implementation, verification, delivery. Cards run in id order inside a group only where the group table says so; otherwise any order.

---

### T-B0-26. Spike: what makes the `]` shortcut miss

| Field | Content |
|---|---|
| **Identity** | Id T-B0-26. Subsystem tests (boardlab shortcuts). Phase B0. Priority P0. Dependencies none. Status not started. Group G1. Kind: spike. |
| **Problem** | `e2e/boardlab.spec.ts:171` failed once: after `Escape` closed the shortcuts dialog, `]` did not leave `/en/boards/uno-r3/blink` within the 5,000 ms `toHaveURL` timeout (`runs/E2E.md`, load about 110). Fifteen retests passed at load 9 to 75. The cause is unknown. |
| **Target user** | Amar running `npm run check` on a busy laptop. |
| **User story** | As Amar, I want to know why a keystroke test failed once, so the fix removes the cause and does not hide it behind a retry (R-002). |
| **Expected behaviour** | A report names which of three causes is real, with evidence from a failing run. |
| **Falsifiable question** | Under 14 busy-loop processes, in 120 runs of the `]` step, does at least one run fail, and in that run is the cause (H1) focus left inside a typing target after the dialog closes (`shortcuts.ts:48-55` returns true), (H2) the key event reaches no handler, or (H3) the key works but the route change takes longer than 5,000 ms? |
| **Method** | Copy `e2e/boardlab.spec.ts:144-172` to a scratch spec under `/Users/amar/iynk-master-plan-scratch/buildplan/B0/s1/` (not committed). Before pressing `]`, log `document.activeElement` tag, class and whether `closest(".cm-editor")` is set. After pressing, wait up to 30,000 ms for the URL and log the elapsed time. Build once keyless with `NEXT_DIST_DIR=.next-b0-s1`; run `E2E_SKIP_BUILD=1 NEXT_DIST_DIR=.next-b0-s1 npx playwright test <scratch spec> --repeat-each=40 --workers=4 --retries=0` three times with the `LOAD` busy loops running. Never use port 43117; the config picks 40000 to 49999 (T-B0-03 fixes the 43117 case; until then re-run if the random port is 43117). |
| **Exit condition** | Report `docs/MASTER_PLAN/08_RESEARCH_SPIKES/B0-S1-shortcut-race/REPORT.md` states one of: H1, H2 or H3 with the logged evidence of at least one failing run; or "no failure in 120 runs", in which case T-B0-04 applies the defensive fix in its card (wait for the dialog to be hidden, assert focus is not a typing target, wait up to 15,000 ms for the URL) and says so. Time-box 2 hours. |
| **Existing files** | `src/components/boardlab/shortcuts.ts:48-55` (`typingTarget`), `:90-91` (`]` mapping), `src/components/boardlab/LessonWorkspace.tsx:239-244` (global handler guard), `:273-275` (`router.push` for `lesson`), `e2e/boardlab.spec.ts:144-172`. |
| **New files** | `docs/MASTER_PLAN/08_RESEARCH_SPIKES/B0-S1-shortcut-race/REPORT.md` (committed). Scratch spec and logs stay in the scratch folder. |
| **Not applicable** | Modules, data model, schemas, API contracts, algorithms, state transitions, validation, errors, edge cases, permissions, performance, migration: no product code changes. |
| **Verification** | Unit none. Integration none. Playwright: the scratch spec only. Fixtures none. Acceptance: Given 120 runs under load, When the report is written, Then it contains the run counts, the load average before and after, and for each failure the logged `activeElement` and elapsed times. Observability: the logs in the scratch folder. Release blockers: a report with no counts. |
| **Definition of done** | Report committed. Commit `B0 T-B0-26: spike report on the ] shortcut miss`. |
| **Verify commands** | `ls docs/MASTER_PLAN/08_RESEARCH_SPIKES/B0-S1-shortcut-race/REPORT.md` and `git status --short` shows only that file. |
| **Documentation** | The report. |
| **Rollback** | `git revert` the commit. |
| **Later tasks need** | T-B0-04 reads the verdict. |

---

### T-B0-01. Drone figure tests step simulated time, not the wall clock

| Field | Content |
|---|---|
| **Identity** | Id T-B0-01. Subsystem tests and figure engine. Phase B0. Priority P0 (F-180, R-002). Dependencies none. Status not started. Group G1. Source files: 3 (`figures/engine/drone.js`, `figures/engine/testkit.mjs`, `src/content/drones/_checks.ts`). |
| **Problem** | 13 tests time out at load 38 to 117 (`runs/COMMANDS.md` rows 6 to 8). `settle()` polls `Date.now()` for 50,000 ms (`src/content/drones/_checks.ts:358-364`) and six files add their own pollers (finding 3). The figure animates in real jsdom frames (`figures/vendor/colorfigures/core.js:497`, dt capped at 0.05 s) and each frame draws the scene, about 75 ms with no canvas. |
| **Target user** | Amar and any contributor running `npm test`. |
| **User story** | As Amar, I run `npm test` on a busy laptop and get the same answer (R-002). |
| **Expected behaviour** | A drone test advances simulated time in code. The result does not depend on CPU share. The assertions are unchanged. |
| **Success metric** | Measured (probe, octo `build`, `plugIn`, `gear`): 14,011 ms real frames, 365 ms stepped, `report()` identical. Target: `npx vitest run src/content/drones` finishes in under 120 s on a quiet machine, and 3 of 3 runs pass under `LOAD`. |
| **Existing files** | `src/content/drones/_checks.ts:344-367` (`openFigure`, `busy`, `settle`, `press`, `run`, `add`, `remove`); `figures/engine/testkit.mjs:36-63` (`loadFigure`, `beforeParse` stubs at `:45-50`); `figures/engine/drone.js:142-151` (`kick` registers `ui.animate`), `:153` (`SD.settle`), `:371` (placement speed `pl.t + 2.2 * dt`), step function from `:366`; tests with their own pollers: `agrihex.test.ts:185-188,227-228`, `delivery.test.ts:152-154`, `gpscam.test.ts:97-99`, `tricopter.test.ts:173-175`, `swarm.test.ts:198-200,221-222`, `vtol.test.ts:196-198`; `describe` timeouts: racer 87, cinewhoop 81, whoop 74 (30,000), longrange 93, wing 110 (40,000), gpscam 86, agrihex 177, delivery 141, tricopter 166, vtol 189, swarm 191, octo 183 (300,000); the per-test `120_000` argument at `quad5.test.ts:164` (a closing `}, 120_000);`, not a describe option); `fig.settle(180000)` calls, which pass milliseconds today, at agrihex 251 and 253, delivery 188 and 190, swarm 270 and 272. |
| **New files** | None. Generated: rebuild the 13 `public/figures/drones/*.html` with `python3 -I figures/tools/cfbuild.py drones/<id>` for each id in `src/content/ids` DRONE_IDS (the build is byte-identical to the committed page today, finding 4). |
| **Modules and signatures** | In `figures/engine/drone.js`, next to `SD.kick`: `function tick(dt)` (the body `kick` already passes to `ui.animate`: `const more = step(ui.st, dt); if (!more) { looping = false; flush settled callbacks } return more;`). New `SD.advanceUntil = (done: () => boolean, maxSeconds: number, dt = 0.05) => boolean`: steps `tick` until `done()` is true or `maxSeconds` of simulated time pass, calls `ui.render()` once at the end, returns `done()`. `kick` becomes `ui.animate(tick)`. In `testkit.mjs`: `loadFigure(html, { path, query, host, frozenClock = false })`; when `frozenClock` is true, `beforeParse` also sets `w.performance.now = () => 0` and `w.requestAnimationFrame = () => 0` (assignment works in jsdom 30.1.2, VERIFIED with `probe2.mjs`), so only `SD.advanceUntil` moves time. In `_checks.ts`: `openFigure(id)` passes `frozenClock: true`; `settle(maxSimSeconds = 120)` becomes `async () => { if (!SD.advanceUntil(() => !busy(), maxSimSeconds)) throw new Error(`${id}: still busy after ${maxSimSeconds} simulated seconds`); }`; new `until(ok: () => boolean, maxSimSeconds = 120): boolean` (calls `SD.advanceUntil(ok, maxSimSeconds)`) returned from `openFigure`. |
| **Algorithm** | `advanceUntil`: `let ok = done(); for (t = 0; !ok && t < max - 1e-9; t += dt) { tick(min(dt, max - t)); ok = done(); } ui.render(); return ok;`. dt stays 0.05, the frame loop's own cap, so a step in test equals a step in the browser. |
| **Test edits** | Delete each local `until` and its `Date.now()` loops; call `fig!.until(() => fig!.status(test(id)) === want)` and keep the assertions and the `expect(...).toBe(...)` shape. Delete the 12 describe timeout options (racer, cinewhoop, whoop, longrange, wing, gpscam, agrihex, delivery, tricopter, vtol, swarm, octo) and quad5's per-test `120_000` argument (`quad5.test.ts:164`), so the shared `testTimeout` (T-B0-02) applies. Drop the millisecond argument of the six `fig.settle(180000)` calls: the parameter is simulated seconds now and the default of 120 applies (if a test needs more, pass simulated seconds and say so in the commit). |
| **Data model, schemas, API contracts, state transitions, permissions, migration** | Not applicable. `SD.advanceUntil` is a test seam; no production page calls it. |
| **Validation and errors** | `maxSeconds` must be positive; a test that never settles fails with the simulated-seconds message and the drone id. |
| **Edge cases** | The real frame loop is still registered when `looping` is true: with `frozenClock`, a fallback frame computes dt = 0, so it cannot move time. A test that never sets `frozenClock` (the bench and robotics engine tests) is unchanged. If any assertion in a drone test needs real time, stop and report; do not weaken it (roadmap risk R2). |
| **Performance** | `ui.render()` once per `advanceUntil` call (about 75 ms), not per step. |
| **Unit tests** | New cases in `figures/engine/drone.test.mjs` (exists, VERIFIED; vitest includes `figures/**/*.test.mjs`): (1) `advanceUntil` returns true and leaves `st.test` null after `press('gear')` on octo; (2) it returns false and does not throw when `maxSeconds` is 0.1 and the test needs 7; (3) two runs of the same scenario give equal `report()` JSON; (4) with `frozenClock`, waiting 100 ms of real time moves `st.t` by 0. The 13 drone test files are the equivalence check: every existing assertion must still pass. |
| **Integration and Playwright** | None. |
| **Fixtures** | The built figure pages (`buildFigure('drones/<id>')`). |
| **Acceptance (Given/When/Then)** | Given the 13 drone files, When `LOAD npx vitest run src/content/drones` runs three times, Then all three pass. Given `grep -n "Date.now()" src/content/drones/*.test.ts src/content/drones/_checks.ts`, When it runs, Then it prints nothing. Given `git grep -nE "timeout: [0-9]+|, [0-9_]{5,}\)|settle\([0-9]{4,}" -- src/content/drones`, Then it prints nothing. Given `cmp` of each rebuilt `public/figures/drones/<id>.html` against `cfbuild --out`, Then they match. |
| **Observability** | The failure message names the drone and the simulated seconds. |
| **Release blockers** | Any assertion removed or loosened; any drone test failing under `LOAD`. |
| **Definition of done** | The three source files and 13 tests changed; 13 pages rebuilt; `docs/FIGURES-DRONE.md` section 10 (the host-driving notes) gains one line naming `SD.advanceUntil`. |
| **Verify commands** | `TL`; `V src/content/drones figures/engine`; `LOAD npx vitest run src/content/drones` (three times); rebuild with `for f in public/figures/drones/*.html; do python3 -I figures/tools/cfbuild.py drones/$(basename $f .html); done`; check each page is what the source builds: `for f in public/figures/drones/*.html; do id=$(basename $f .html); python3 -I figures/tools/cfbuild.py drones/$id --out /Users/amar/iynk-master-plan-scratch/buildplan/B0/rebuild-$id.html >/dev/null && cmp $f /Users/amar/iynk-master-plan-scratch/buildplan/B0/rebuild-$id.html \|\| echo DIFF $id; done` prints nothing; `git grep -n "Date.now()" -- src/content/drones` prints nothing; `git grep -nE "timeout: [0-9]+|, [0-9_]{5,}\)|settle\([0-9]{4,}" -- src/content/drones` prints nothing. |
| **Rollback** | `git revert` the commit (restores the engine, the pages and the tests together). |
| **Later tasks need** | T-B0-06 and T-B0-30 rely on a deterministic `npx vitest run`. T-B0-02 assumes no drone test sets its own timeout. |

---

### T-B0-02. Split the basys3 display sweep; one shared test timeout

| Field | Content |
|---|---|
| **Identity** | Id T-B0-02. Subsystem tests. Phase B0. Priority P0 (F-180, R-002). Dependencies none. Status not started. Group G1. Source files: 1 (`vitest.config.mts`, a comment). |
| **Problem** | `basys3.test.ts:241-251` runs 95 interpreter runs in one synchronous body with a `120_000` override. Alone it needs about 67 s of CPU (ESTIMATED from `user` time, `runs/COMMANDS.md`) and times out under load because vitest cannot interrupt a synchronous body. `de10-lite.test.ts:255` has the same `120_000`; `src/lib/interp/lessons.test.ts:84` has `60_000`, equal to the config value (`vitest.config.mts:15`). |
| **Target user** | Amar. |
| **User story** | As Amar, I want one timeout for every test and no single test long enough to need a special one. |
| **Expected behaviour** | The display sweep runs as chunks of 10 values, one `it` each. No test file sets its own timeout. `testTimeout` stays 60,000. |
| **Success metric** | Longest `basys3` test under 20 s at `LOAD` (ESTIMATED: 10 values x 0.7 s x 2.3 = 16 s). |
| **Existing files** | `vitest.config.mts:13-15` (comment says tests "drive figures in jsdom ... up to 50 s to settle": out of date after T-B0-01), `src/content/boards/basys3.test.ts:240-251`, `src/content/boards/de10-lite.test.ts:255` (5 values, passed in the full run), `src/lib/interp/lessons.test.ts:69` and `:84` (both `60_000`); other explicit timeouts: `uno-r3.test.ts:100,127` (60_000), `uno-r4.test.ts:308` (60_000) and `:278` (30_000), `nucleo-f401re.test.ts:307` (30_000) (VERIFIED by `grep -nE "\}, [0-9_]{5,}\)"`). |
| **Algorithm** | In `basys3.test.ts` replace the `for (const v of values)` body with `chunk(values, 10).forEach((part, i) => it(`lesson ${l.id} passes at every value each chip offers, part ${i + 1}`, () => { for (const p ... ) ... }))`. `chunk<T>(a: readonly T[], n: number): T[][]` is a local helper in the test file. Remove every explicit timeout argument in the six files: `120_000` (basys3:250, de10-lite:255), `60_000` (uno-r3:100,127; uno-r4:308; lessons:69,84), which equals the config value, and the two `30_000` (nucleo-f401re:307, uno-r4:278), which only shortened the limit. The shared 60,000 now applies to those two; if either needs more than 30 s at `LOAD`, report the number rather than keep a special value. |
| **Not applicable** | New files, data model, schemas, API, state transitions, validation, permissions, migration. |
| **Edge cases** | A lesson with several params: chunk per param so names stay unique (`lesson blink hz part 1`). If `lessons.test.ts` `esp32-s3-build / web-led` still exceeds 60 s under `LOAD` (8.6 s alone, VERIFIED now at load 3.9), stop and report the number; raising the shared value is Amar's decision (D-014). |
| **Performance** | Total CPU unchanged; the longest test is shorter. |
| **Unit tests** | The edited files themselves. Case count must stay equal in coverage: print the generated test names before and after and check every `(lesson, param, value)` is still run exactly once (add a one-off assertion in the test that sums chunk lengths to `values.length`). |
| **Acceptance** | Given `LOAD npx vitest run src/content/boards src/lib/interp/lessons.test.ts`, When run three times, Then all pass and no test is reported above 30 s. Given `git grep -nE "\}, [0-9_]{5,}\)|timeout: [0-9_]+" -- src/content/boards src/lib/interp`, Then it prints nothing. |
| **Observability, release blockers** | Vitest's verbose reporter shows per-test time. Blocker: a value no longer run. |
| **Definition of done** | Comment in `vitest.config.mts` says what is true: figure tests step simulated time (T-B0-01) and chunks keep synchronous bodies short. |
| **Verify commands** | `TL`; `V src/content/boards src/lib/interp/lessons.test.ts`; `LOAD npx vitest run src/content/boards src/lib/interp` three times; the `git grep` above prints nothing. |
| **Documentation, rollback** | None / `git revert`. |
| **Later tasks need** | T-B12-09 reuses the split (roadmap row). |

---

### T-B0-03. Playwright isolation: blank keys, skip port 43117, no request leaves localhost

| Field | Content |
|---|---|
| **Identity** | Id T-B0-03. Subsystem tests. Phase B0. Priority P0 (F-180, R-003). Dependencies none. Status not started. Group G1. Source files: 2 (`playwright.config.ts`, `e2e/support/no-egress.ts`). |
| **Problem** | `npm run e2e` loads `.env.local`, so rooms can point at the production relay and provider keys are live (`TEST_COVERAGE.md` finding 8). The random port range 40000 to 49999 (`playwright.config.ts:5`) includes 43117, which is off limits. Nothing fails if a page calls a third party. |
| **Target user** | Amar. |
| **User story** | As Amar, I run `npm run e2e` with my real `.env.local` and nothing reaches a real service. |
| **Expected behaviour** | The web server starts with every provider and relay variable empty. The random port is never 43117 or 3000. Any request to a non-loopback host, or any non-loopback WebSocket, fails the test and is named. |
| **Existing files** | `playwright.config.ts:5-6` (port), `:9` (`distDir`), `:12-14` (command), `:28-36` (`webServer`, `env: { NEXT_DIST_DIR }`); all 13 `e2e/*.spec.ts` import `test` from `@playwright/test` (`grep -n "@playwright/test" e2e/*.ts`, VERIFIED); `e2e/dock-shared.ts` imports only `expect`. |
| **New files** | `e2e/support/no-egress.ts`. |
| **Modules and signatures** | `playwright.config.ts`: `const BLANK = ["META_API_KEY","GEMINI_API_KEY","SERPAPI_KEY","NEXT_PUBLIC_REALTIME_URL","IYNK_SERVER_TOKEN","IYNK_AI_ENABLE","IYNK_SEARCH_ENABLE","NEXT_PUBLIC_SOLANA_PROGRAM_ID","SOLANA_ISSUER_KEYPAIR","SOLANA_RPC_URL","VULTR_API_KEY","VULTR_HOST","TIMESCALE_SERVICE_URL","DATABASE_URL","PGPASSWORD","PGHOST"]`; `webServer.env = { NEXT_DIST_DIR: distDir, ...Object.fromEntries(BLANK.map((n) => [n, ""])) }` (an empty value overrides `.env.local`: VERIFIED in `runs/BUILD_OUTPUT.md`); `pickPort(): number` redraws while the result is 43117; also `E2E_PORT` set by the caller is refused when it equals 43117 or 3000 (throws a clear error). `e2e/support/no-egress.ts`: `export const test = base.extend<{ noEgress: void }>({ noEgress: [async ({ context }, use, info) => {...}, { auto: true }] }); export { expect } from "@playwright/test";`. |
| **Algorithm** | In the fixture: `context.route("**/*", route => { const u = new URL(route.request().url()); if (!/^(https?\|wss?):$/.test(u.protocol) \|\| isLoopback(u.hostname)) return route.fallback(); blocked.push(`${route.request().method()} ${u.origin}`); return route.abort("blockedbyclient"); })`; `context.routeWebSocket(url => !isLoopback(new URL(url).hostname), ws => { blocked.push(`WS ${new URL(ws.url()).origin}`); ws.close(); })`; after `use()`, `expect(blocked, "requests that left localhost").toEqual([])`. `isLoopback(h)` is true for `localhost`, `127.0.0.1`, `[::1]`, `::1`. The list is names only (origin, never a query string). |
| **Spec edits** | In each of the 13 specs change `import { expect, test, ... } from "@playwright/test"` to import `expect` and `test` from `./support/no-egress` and the types (`Page`, `Locator`, `BrowserContext`) from `@playwright/test`. No other line changes. |
| **Edge cases** | A spec that opens a second browser context (`room.spec.ts`, `fly-fun.spec.ts`) uses `browser.newContext()`, which the `context` fixture does not cover: wrap by adding the same routes in a helper `guardContext(context)` exported from `no-egress.ts` and call it where those specs create contexts (test edits only). Chromium may still resolve a font or analytics host before routing: such a request must show up in `blocked` and be fixed at its source, not allow-listed. |
| **Validation and errors** | Port override of 43117 or 3000 throws `Refusing to run Playwright on a reserved port`. |
| **Performance** | One route handler per request; negligible. |
| **Unit tests** | None (config). |
| **Playwright** | New case in `e2e/shell.spec.ts`: "a page that calls out fails the test": uses `test.fail()` with `page.evaluate(() => fetch("https://example.com"))` and expects the fixture to report `https://example.com`. Existing 119 tests must pass unchanged. |
| **Acceptance** | Given a `.env.local` that sets `NEXT_PUBLIC_REALTIME_URL` (name only checked, value never printed), When `E b0-03 e2e/shell.spec.ts` runs, Then no request leaves localhost. Given `E2E_PORT=43117`, When Playwright starts, Then it exits with the reserved-port message. |
| **Observability** | The fixture's failure message lists blocked origins. |
| **Release blockers** | Any spec still importing `test` from `@playwright/test`: `grep -L "support/no-egress" e2e/*.spec.ts` must print nothing. |
| **Definition of done** | Config and fixture in place; 13 specs switched; the new case passes. |
| **Verify commands** | `TL`; `E b0-03 e2e/shell.spec.ts`; `grep -L "support/no-egress" e2e/*.spec.ts`; `E2E_PORT=43117 npx playwright test --list` exits non-zero. |
| **Documentation** | One comment block at the top of `no-egress.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Every task that adds or edits a spec imports from `./support/no-egress` (T-B0-04, 10, 12, 15, 16, 21). T-B0-06 relies on the blanking. |

---

### T-B0-05. Under `CI=true` a missing service fails the test and names it

| Field | Content |
|---|---|
| **Identity** | Id T-B0-05. Subsystem tests. Phase B0. Priority P0 (F-001, R-001). Dependencies none. Status not started. Group G1. Source files: 1 (`src/test-support/require-service.ts`). |
| **Problem** | A missing service turns a red gate green: `relay.integration.test.ts:23` prints `console.warn` and `describe.skipIf` skips (`:114`); `timescale.test.ts:26,28` does the same with `console.info` and Docker. Five tests skip silently today (`TEST_COVERAGE.md` section 4). The roadmap names `vitest.setup.ts`; a setup file cannot export a helper to tests, so the helper is a new module. |
| **Target user** | Contributor reading CI results. |
| **User story** | As a contributor, when CI lacks the relay, the test fails and says "relay", not "skipped". |
| **Expected behaviour** | `CI=true` and service missing: the test file throws `Error: required service "relay" is missing: <reason>`. Without `CI`, it skips with the reason, as today. |
| **Existing files** | `src/lib/realtime/relay.integration.test.ts:16-23,114`; `src/lib/server/db/timescale.test.ts:26-28` (deleted by T-B0-17; this task leaves it alone); `vitest.setup.ts` unchanged. |
| **New files** | `src/test-support/require-service.ts`; `src/test-support/require-service.test.ts`. |
| **Modules and signatures** | `export function serviceMissing(service: string, reason: string \| null, env: Record<string, string \| undefined> = process.env): boolean` returns false when `reason` is null; when `reason` is set and `env.CI` is truthy, throws `new Error(`required service "${service}" is missing: ${reason}`)`; otherwise logs `service "${service}" skipped: ${reason}` with `console.warn` and returns true. |
| **Edit** | `relay.integration.test.ts`: `const skip = serviceMissing("relay", missing);` and `describe.skipIf(skip)(...)`; delete the old `console.warn` line. |
| **Not applicable** | Data model, schemas, API, state transitions, permissions, performance, migration. |
| **Edge cases** | `CI=""` or `CI=0` counts as unset: use `Boolean(env.CI && env.CI !== "0" && env.CI !== "false")`. |
| **Unit tests** | `require-service.test.ts`: (1) null reason returns false; (2) reason without CI returns true and warns; (3) reason with `CI=true` throws and the message names the service; (4) `CI=0` behaves as unset. |
| **Acceptance** | Given `server/realtime/node_modules` is absent, When `CI=true npx vitest run src/lib/realtime/relay.integration.test.ts` runs, Then it fails with `required service "relay"`. Given the dependencies are present, Then 5 relay tests pass. |
| **Release blockers** | A `console.info` skip left in a file that exists after this task. |
| **Definition of done** | Helper, test, one call site. |
| **Verify commands** | `TL`; `V src/test-support`; `CI=true npx vitest run src/lib/realtime/relay.integration.test.ts` (with `server/realtime/node_modules` present, VERIFIED present locally). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-06 runs the unit suite with `CI=true`. |

---

### T-B0-07. Secret scanner: history once, then the diff

| Field | Content |
|---|---|
| **Identity** | Id T-B0-07. Subsystem tooling. Phase B0. Priority P0 (F-001, R-017). Dependencies none. Status not started. Group G1. Source files: 2 (`scripts/secret-scan.mjs`, `scripts/secret-scan.allow.json`). |
| **Problem** | The repo is public (EXTERNAL, `SECURITY_BASELINE.md` section 9) and there is no scanner. History is clean today by hand-run `git log -G` checks over 797 commits; the count is now 808. |
| **Target user** | Amar and CI. |
| **User story** | As Amar, a pushed key shape fails the check before anyone can read it. |
| **Expected behaviour** | `node scripts/secret-scan.mjs --history` scans every added line of every commit on every ref; `--diff <range>` scans the added lines of a range; `--tree` scans tracked files. Exit 1 on any unexplained hit. Output names rule, path, line and commit, never the matched text. |
| **New files** | `scripts/secret-scan.mjs`, `scripts/secret-scan.allow.json`, `scripts/secret-scan.test.mjs` (vitest includes `scripts/**/*.test.{js,mjs,ts}`, `vitest.config.mts:12`). |
| **Modules and signatures** | `export const RULES: readonly { name: string; re: RegExp }[]`; `export function scanText(text: string, file?: string): { rule: string; line: number }[]`; `export function loadAllow(path: string): AllowEntry[]`; CLI `main(argv: string[]): number` run only when the file is the entry point (`import.meta.url === pathToFileURL(process.argv[1]).href`). `type AllowEntry = { rule: string; path: string; commit?: string; reason: string }`. |
| **Rules** | `google-api-key` `AIza[0-9A-Za-z_-]{35}`; `sk-key` `\bsk-[A-Za-z0-9_-]{20,}`; `github-token` `\bgh[pousr]_[A-Za-z0-9]{36,}`; `aws-access-key` `\bAKIA[0-9A-Z]{16}\b`; `pem-private-key` `-----BEGIN [A-Z ]*PRIVATE KEY-----`; `slack-token` `\bxox[abprs]-[A-Za-z0-9-]{10,}`; `keypair-array` a JSON array of exactly 64 integers 0 to 255; `postgres-url-password` `postgres(ql)?://[^:/\s@]+:[^@\s]{4,}@(?!localhost\b\|127\.0\.0\.1\b)`. These are the shapes `SECURITY_BASELINE.md` section 9 checked by hand. A Vercel token has no fixed prefix (EXTERNAL, UNKNOWN), so it has no rule. |
| **Algorithm** | History: stream `git log --all -p -U0 --no-color --format=@@%H` and read only `+` lines with the last `+++ b/<path>` as the file. Diff: the same stream over `git log -p -U0 <range>`. Tree: `git ls-files -z` then read each file. A hit is dropped only when an allow entry matches rule and path (and commit when given). Print `RULE path:line commit` and a count; exit 1 if any remain. |
| **Allow entries** | The agent first runs `--history` and inspects the five commits that match the Postgres shape (`d5bdf44 74e41ce ca09a95` are a `const DB = "postgres://...@localhost..."` test constant; `dab0587 16a3d09` are master-plan docs). Each real placeholder gets one entry with a reason. A hit that is not a placeholder stops the task and is reported to Amar (rotate the key, EXTERNAL). |
| **Validation and errors** | Not a git repo: exit 2 with a message. Unreadable file: skip with a warning to stderr. |
| **Edge cases** | The scanner's own tests must not contain key-shaped literals (the scanner would flag itself in history). Build samples at run time: `"AI" + "za" + "x".repeat(35)`. 64-hex content hashes in figure HTML must not match (VERIFIED they exist, section 9). Lines over 20,000 characters (generated pages) are scanned in 20,000-character windows. |
| **Performance** | Target under 60 s for 808 commits (ESTIMATED). If longer, CI keeps `--history` only on `push` to the default branch and uses `--diff` elsewhere. |
| **Unit tests** | `scripts/secret-scan.test.mjs`: one positive per rule (run-time built); 64 hex characters and a 63-integer array do not match; the 64-integer array does; allow entry silences exactly its rule and path; output never contains the sample text; `--diff` on a temp repo (created with `git init` in `os.tmpdir()`) fails on a planted shape and passes after the commit that removes it is excluded by range. |
| **Acceptance** | Given the current history, When `node scripts/secret-scan.mjs --history` runs, Then exit 0 and the allow list holds only documented placeholders. Given a temp repo with a planted Google-key shape in a commit, When `--history` runs there, Then exit 1 and the output names the rule and commit but not the key. |
| **Observability** | Summary line `scanned <n> commits, <m> files, <k> hits (<a> allowed)`. |
| **Release blockers** | A matched value printed anywhere; a literal key shape in the test file. |
| **Definition of done** | Script, allow file and tests committed. |
| **Verify commands** | `TL`; `V scripts/secret-scan.test.mjs`; `node scripts/secret-scan.mjs --history`; `node scripts/secret-scan.mjs --tree`. |
| **Documentation** | Header comment lists the rules and how to add an allow entry. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-06 calls `--history`; T-B0-30 runs it. |

---

### T-B0-08. Telemetry: default off, no network call

| Field | Content |
|---|---|
| **Identity** | Id T-B0-08. Subsystem client telemetry. Phase B0. Priority P0 (F-006, R-009 first half). Dependencies none. Status not started. Group G1. Source files: 2 (`src/lib/progress/storage.ts`, `src/lib/telemetry/client.ts`). |
| **Problem** | `DEFAULT_SETTINGS.telemetry` is `true` (`storage.ts:38`). The client posts to `/api/telemetry` (`client.ts:21,251`), asks `/api/status` (`:22,182`), uses `sendBeacon` (`:278`) and stamps the room code (`:123-125`). |
| **Target user** | A buddy who opens iynk and expects nothing to leave the browser. |
| **User story** | As a buddy, nothing about me leaves my browser (R-009). |
| **Expected behaviour** | `telemetry` defaults to `false`. `track`, `tally` and `flush` make no network call and keep no queue. No room code is stored. The functions keep their names and signatures so their 13 importers compile (`src/lib/ai/client.ts`, `hw/session.ts`, `realtime/{provider,store-sync,translate}`, `search/client.ts`, `sound/react.ts`, `FlyWorkspace.tsx`, and the buddy and planner pages that T-B0-15 and T-B0-16 delete). |
| **Existing files** | `src/lib/progress/storage.ts:17` (comment "On unless the learner opts out"), `:38` (default), `:105` (read back; a saved `true` stays true); `src/lib/telemetry/client.ts` (280 lines) lines named above; `src/lib/telemetry/index.ts:1-3` unchanged here; `src/lib/telemetry/client.test.ts` (151 lines); `src/lib/progress/progress.test.ts:89-94` expects `telemetry: true`. |
| **Design** | `client.ts` shrinks to: `track(kind, data?)` and `tally(kind, n?)` return immediately; `flush(): Promise<void>` returns `Promise.resolve()`; `onFlushed(listener)` returns an unsubscribe and never calls the listener; `setTelemetryContext(next)` stores nothing; `telemetrySession(): string` returns `""`. A header comment says: events go nowhere in B0; B1 T-B1 (F-016) adds the local log and the opt-in write. `STORAGE_VERSION` stays 1: the default only changes for new documents; a document that already saved `telemetry: true` keeps it and still sends nothing. |
| **Not applicable** | Data model changes beyond the default, schemas, API, algorithms, state transitions, validation, permissions, migration. |
| **Edge cases** | Importers of `TelemetryKind` and `KnownPayloads` stay valid because `kinds.ts` is untouched. The toggle copy still says "Share anonymous usage counts" (open question 5). |
| **Performance** | Removes a 10 s timer, a status fetch and the beacon listeners. |
| **Unit tests** | Rewrite `client.test.ts` (case list): (1) `track` with `telemetry: true` makes zero `fetch` and zero `navigator.sendBeacon` calls (spies); (2) `tally` and `flush` the same; (3) `telemetrySession()` is `""`; (4) no `document.addEventListener("visibilitychange")` registered. `progress.test.ts:94` expects `telemetry: false` for a defaulted document and still true for a document that saved `true`. |
| **Acceptance** | Given a defaulted settings document, When `track`, `tally` and `flush` run with `telemetry: true`, Then the unit tests count zero `fetch` and zero `sendBeacon` calls. Given `getSettings().telemetry`, Then it is false. No spec is added or edited here: `e2e/shell.spec.ts` belongs to T-B0-03 in the same group and needs its fixture. The endpoint itself is deleted in T-B0-17, which makes `POST /api/telemetry` answer 404. |
| **Observability** | None by design. |
| **Release blockers** | Any `fetch(` or `sendBeacon(` left in `src/lib/telemetry/client.ts`: `grep -n "fetch(\|sendBeacon" src/lib/telemetry/client.ts` prints nothing. |
| **Definition of done** | Two files and two tests changed; dated line appended to `docs/DECISIONS.md` (local, untracked): "2026-.. telemetry off by default and local only (D-015, R-009)". |
| **Verify commands** | `TL`; `V src/lib/telemetry src/lib/progress src/lib/sound src/components/settings`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-17 deletes the route this client used to call. T-B0-28 removes the shims. B1 adds the local log on top of the same `track` call sites. |

---

### T-B0-09. MCP drops `get_passport` and `plan_build_night`

| Field | Content |
|---|---|
| **Identity** | Id T-B0-09. Subsystem server (MCP). Phase B0. Priority P0 (F-195). Dependencies none. Status not started. Group G1. Source files: 4 (`tools/index.ts`, `tools/together.ts`, `registry.ts`, `openapi.ts`); 2 deleted. |
| **Problem** | Two of the seven MCP tools belong to removed features: `plan_build_night` calls `/api/ai/plan` (`tools/together.ts:47`) and `get_passport` reads Solana (`tools/passport.ts`). |
| **Target user** | An agent or connector reading iynk's tool list; the contributor reading code. |
| **User story** | As a contributor, the tool list names only things that exist. |
| **Expected behaviour** | `TOOLS` has five tools: `search_catalog`, `get_item`, `drone_calc`, `price_parts`, `create_room`. The server instructions name no removed feature. |
| **Existing files** | `src/lib/server/mcp/tools/index.ts:6-7` (imports), `:10` (`TOOLS`), `:29` (instruction sentences naming `plan_build_night` and Proof of Build); `tools/together.ts:7` (`postRoute`), `:12-51` (`participant`, `planShape`, `planBuildNight`), `:61` (description text "or plan_build_night"); `tools/passport.ts` (66 lines); `backends.ts` (50 lines, only `postRoute`, whose only user is `together.ts:7`); `registry.ts:34` (comment "Solana devnet"); `openapi.ts:27` (text "Meta, Solana"). |
| **Edits** | `index.ts`: drop both imports and both entries; rewrite the sentence at `:29` to name `create_room` only. `together.ts`: delete `participant`, `planShape`, `planBuildNight`, the `postRoute` import, and unused imports (`LOCALES`, `MAX_NAME_LENGTH`, `LABS` if unused); fix the `id` description to "Item id from search_catalog." `registry.ts:34`: "(SerpApi, Meta's model API)". `openapi.ts:27`: "(SerpApi, Meta) failed." Delete `tools/passport.ts` and `backends.ts`. |
| **Data model, schemas, API** | `GET /api/openapi.json` loses two paths; `POST /api/mcp/tools/{name}` for the two names returns the existing unknown-tool 404 (`rest.ts`). `SERVER_VERSION` bumps from `1.0.0` to `1.1.0` (the comment above it says to bump when a tool changes). |
| **Edge cases** | `docs/requests/hx-mcp.md` is untracked; ignore. The `maxDuration` comments in the two MCP route files are cleared by T-B0-23. |
| **Unit tests** | `tools.test.ts`: delete the `plan_build_night` block (`:225-262`) and the `get_passport` block (`:287-331`), the `@/lib/solana` mocks (`:13,49-50,56,59-60`) and the `solana` key in `flags` (`:11`); `e2e.test.ts`: `:11` (the `features` literal in the env mock: remove `solana`; the untyped `image` and `db` keys are dropped by T-B0-23, which rewrites this mock), `:50` instruction regex, `:57` tool-name list (five names), `:89` the call that uses `plan_build_night` (switch to `create_room`); `openapi.test.ts:8` flags, `:37,:39` expected paths; `transport.test.ts:7` flags, `:51` tool-name list. Any new case that checks a removed tool name answers 404 builds the name at run time (`["get","passport"].join("_")`), so `RESIDUAL` stays empty (section 1). |
| **Acceptance** | Given `tools/list`, When called, Then it returns the five names in that order. Given `POST /api/mcp/tools/get_passport`, Then 404 with the existing error code. Given `git grep -n "plan_build_night\|get_passport\|Proof of Build\|Solana" -- src/lib/server/mcp`, Then it prints nothing. |
| **Observability** | None. |
| **Release blockers** | A deleted file still imported (typecheck). |
| **Definition of done** | Two files deleted, four edited, tests updated; dated line in local `docs/DECISIONS.md`. |
| **Verify commands** | `TL`; `V src/lib/server/mcp`; `git grep -n "backends\|passport" -- src/lib/server/mcp` prints nothing. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-15 deletes `/api/ai/plan` after this. T-B0-23 edits the same tests' neighbours (`transport.test.ts`) later. |

---

### T-B0-25. Interpreter caps: 1,000,000 elements, 1 MB serial

| Field | Content |
|---|---|
| **Identity** | Id T-B0-25. Subsystem interpreters. Phase B0. Priority P0 (R-018, security quick win 3). Dependencies none. Status not started. Group G1. Source files: 3 (`python/runtime.ts`, `arduino/interp.ts`, `run.ts`). |
| **Problem** | Python string and list repeat have no size cap (`runtime.ts:1071-1077`); C array sizes have none (`arduino/interp.ts:275`, `:393-405`); serial output is unbounded (`run.ts:151` emits every chunk). Re-check in Node 24 (`SECURITY_BASELINE.md` X2): `[0] * 50_000_000` froze the main thread 2.7 s; a peer can push such code to every member of a room. |
| **Target user** | A buddy who types `"x" * 100000000` and should get a message, not a dead tab. |
| **User story** | As a buddy, a runaway program stops with a message (R-018). |
| **Expected behaviour** | Python: if `len(s) * k`, `len(list) * k` or `len(tuple) * k` would exceed 1,000,000, raise `MemoryError: cannot repeat to <n> items (limit 1,000,000)`. C: a declared array with `n > 1,000,000` is a compile error `array size <n> is over the limit of 1,000,000 elements` with the hint "use a smaller array". Serial: after 1,048,576 characters in one run, one marker line `\r\n[output truncated at 1 MB]\r\n` is emitted and later output is dropped until the next reset. |
| **Existing files** | `src/lib/interp/python/runtime.ts:1069-1077` (`*` branch; `MemoryError` already exists, `:152`; `this.err(cls, msg, p)` at `:495`); `src/lib/interp/arduino/interp.ts:264-277` (`arrayType`, where `n` is known; the error helper is `this.err(msg, p, hint)` at `:172`), `:387-405` (`arrayInit`); `src/lib/interp/run.ts:151` (`w.serialOut = (t) => this.emit('serial', t)` inside `boot()`, `:144-160`); `src/lib/interp/world.ts:406-410` (`print` calls `serialOut`). |
| **Modules and signatures** | `python/runtime.ts`: `const MAX_ELEMENTS = 1_000_000;` and `private checkRepeat(len: number, k: number, p?: SourcePos): void`; called before `s.repeat(k)` and the two array builds. `arduino/interp.ts`: `const MAX_ARRAY = 1_000_000;` check in `arrayType` after `n` is known (covers `int a[N]`, `{...}` and string sizes). `run.ts`: `const SERIAL_CAP = 1_048_576; const MARKER = "\r\n[output truncated at 1 MB]\r\n";` and in `boot()` `let sent = 0; let marked = false;` with `w.serialOut = (t) => { if (marked) return; const room = SERIAL_CAP - sent; if (t.length <= room) { sent += t.length; this.emit('serial', t); return; } if (room > 0) this.emit('serial', t.slice(0, room)); marked = true; this.emit('serial', MARKER); };` (`boot()` runs on every reset, so the counter restarts with the run). |
| **Edge cases** | Negative or zero `k` stays an empty result. `k` as a big integer: use `Number(toBig(n))` as now, compare before building. Nested repeat (`[[0]*1000]*1000`) is caught at the second multiply (1,000 x 1,000 = 1,000,000 passes; 1,001 x 1,000 fails). A 2-D C array checks each dimension's product: `n` of the outer dimension times the inner count must stay under the cap (compute the product in `arrayType`). The headless runner (`headless.ts:132`) consumes the same `serial` event, so lesson checks inherit the cap. |
| **Performance** | One integer compare per repeat, one per array declaration, one counter per print. |
| **Validation and errors** | Exact texts above. C throws `new InterpError('limit', msg, p, hint)` from `arrayType` (the private `err` helper throws kind `compile`, `arduino/interp.ts:172-174`, so the cap throws directly to get kind `limit`). Python raises the existing `MemoryError`. The serial marker is text, not an error. |
| **Unit tests** | `python/python.test.ts` new `describe('size caps')`: (1) `"x" * 100000000` raises `MemoryError` naming 1,000,000; (2) `[0] * 50000000` raises it; (3) `[0] * 1000000` works; (4) `[[0]*1000]*1001` raises. `arduino/arduino.test.ts`: (5) `int big[200000000];` gives the array-size error with a line number; (6) `int ok[1000000];` compiles. `headless.test.ts`: (7) a loop printing 2 MB yields a trace whose last serial line is the marker and whose total length is at most 1 MB plus the marker. These are the three OOM repros of R-018 (string, list, C array) plus the buffer. |
| **Acceptance** | Given `print("x" * 100000000)` in MicroPython, When it runs, Then the serial monitor shows `MemoryError` and the page stays responsive (the call returns in under 1 s: assert `performance.now()` delta in the test). |
| **Observability** | The error text is the signal. |
| **Release blockers** | Any existing interpreter test changing its expectation. |
| **Definition of done** | Three files and three test files; dated line in local `docs/DECISIONS.md`. |
| **Verify commands** | `TL`; `V src/lib/interp`; `LOAD npx vitest run src/lib/interp` once. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Worker isolation and kill (R-043) build on the same error kinds. |

---

### T-B0-04. Fix the `]` shortcut race without a retry

| Field | Content |
|---|---|
| **Identity** | Id T-B0-04. Subsystem client (boardlab) and tests. Phase B0. Priority P0 (F-180, R-002). Dependencies T-B0-03 (spec imports), T-B0-26 (the cause). Status not started. Group G2. Source files: 2 (`shortcuts.ts`, `LessonWorkspace.tsx`). |
| **Problem** | The spec at `e2e/boardlab.spec.ts:171` failed once and passed 15 of 15 on retest. Retries are 0 outside CI (`playwright.config.ts:20`), so a flake fails `npm run check`. R-002 says fix the race, do not retry. |
| **Target user** | Amar. |
| **User story** | As Amar, `]` opens the next lesson every time, and the spec says so with `retries: 0`. |
| **Expected behaviour** | After the shortcuts dialog closes, a shortcut key reaches the global handler, and the test waits on the visible state it depends on, not on timing. |
| **Existing files** | `src/components/boardlab/shortcuts.ts:48-55`, `:90-91`; `src/components/boardlab/LessonWorkspace.tsx:239-244` (`onKey` guard `typingTarget(document.activeElement, e.key)`), `:273-275` (`lesson` branch pushes `/${lang}/boards/${board.id}/${target.id}`); `e2e/boardlab.spec.ts:144-172`. |
| **Decision table (from T-B0-26)** | H1 (focus stays in a typing target after the dialog closes): make the dialog return focus to the element that opened it or to `document.body`; edit the dialog owner in `LessonWorkspace.tsx`; add a unit case. H2 (key lost): register the handler once with a ref to current state so a re-render cannot leave a gap. H3 (slow navigation): the product is right and the test waits too little; replace the fixed 5,000 ms by `await expect(page).toHaveURL(..., { timeout: 15_000 })` after `await expect(dialog).toBeHidden()` and a check that `document.activeElement` is not a typing target. No-failure verdict: apply the H3 form plus the focus check. |
| **New files** | `src/components/boardlab/shortcuts.test.ts` (unit cases for `shortcutFor` and `typingTarget`). |
| **Unit tests** | `shortcuts.test.ts`: `]` maps to `{kind:"lesson", delta:1}`; `[` to `-1`; `typingTarget` is true inside `.cm-editor`, for `INPUT`, and false for `BODY` and for a `BUTTON` with key `]`, and true for a `BUTTON` with key space (`shortcuts.ts:52`). |
| **Playwright** | `e2e/boardlab.spec.ts:144-172` keeps every assertion and gains the `toBeHidden` and focus lines. |
| **Acceptance** | Given Blink open, When the sequence in the spec runs 20 times with `--retries=0 --repeat-each=20 --workers=4` under `LOAD`, Then 20 of 20 pass. |
| **Observability** | On failure the spec attaches `document.activeElement` description (test-side only). |
| **Release blockers** | `retries` raised anywhere, or a `test.retry` call. |
| **Definition of done** | Cause named in the commit message; spec stable. |
| **Verify commands** | `TL`; `V src/components/boardlab`; `LOAD E b0-04 e2e/boardlab.spec.ts --repeat-each=20 --retries=0`. |
| **Documentation** | One sentence in the spike report links the fix. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-30 runs the full e2e suite once more. |

---

### T-B0-06. CI workflow and `scripts/ci-local.sh`

| Field | Content |
|---|---|
| **Identity** | Id T-B0-06. Subsystem tooling. Phase B0. Priority P0 (F-001, R-001, R-017). Dependencies T-B0-03, T-B0-05, T-B0-07. Status not started. Group G2. Source files: 2 (`.github/workflows/ci.yml`, `scripts/ci-local.sh`). |
| **Problem** | There is no CI (`.github/` does not exist, VERIFIED). `npm run check` skips the 39 relay tests (`server/realtime`) and has no secret or dependency scan. |
| **Target user** | Amar locally; contributors on GitHub after Amar pushes. |
| **User story** | As a contributor, I push and learn in minutes whether I broke anything, without a secret from Amar's accounts. |
| **Expected behaviour** | The workflow runs one command, `bash scripts/ci-local.sh`, so the local gate and the hosted gate cannot drift. The script runs these steps in order and stops at the first failure. |
| **Steps** | `content` (`npm run content:check`), `typecheck` (`npm run typecheck`), `lint` (`npm run lint`), `relay-deps` (`npm ci --prefix server/realtime`; `relay.integration.test.ts` throws under `CI=true` when `server/realtime/node_modules/ws` is missing, T-B0-05, so this runs before `unit`), `unit` (`CI=true npx vitest run`), `relay` (`npm test --prefix server/realtime`), `build` (`KL`-blanked `NEXT_DIST_DIR=.next-ci npm run build`), `e2e` (`E2E_SKIP_BUILD=1 NEXT_DIST_DIR=.next-ci npx playwright test`), `secrets` (`node scripts/secret-scan.mjs --history`), `audit` (`npm audit --omit=dev --audit-level=high`). |
| **New files** | `.github/workflows/ci.yml`, `scripts/ci-local.sh`, `scripts/ci-local.test.mjs`. |
| **Script interface** | `bash scripts/ci-local.sh [--list] [--only a,b] [--skip a,b]`. Exit 0 all steps passed; 1 a step failed (prints the step name and seconds); 2 wrong Node major (`node -v` must start with `v24`, `.nvmrc` says 24). `CI_SKIP_AUDIT=1` skips `audit` for offline use. It blanks the seven variable names that survive B0 (the first seven of `KL`) in its own environment, so a local `.env.local` cannot leak in. It does not name the legacy variables (residual rule, section 1). It prints a final table `step, seconds, result`. |
| **Workflow** | Triggers `push` and `pull_request`. `permissions: contents: read`. One job on `ubuntu-latest`, `timeout-minutes: 45`, `concurrency` cancels older runs of the same ref. The workflow has no separate install step for the relay; the script's `relay-deps` step does it, so the local and hosted gates run the same ten steps. Steps: `actions/checkout` with `fetch-depth: 0` (history scan needs it); `actions/setup-node` with `node-version-file: .nvmrc` and npm cache; `npm ci`; `npx playwright install --with-deps chromium`; `bash scripts/ci-local.sh`. No `secrets.*` reference, no deploy step, no write permission. Python 3 comes with the runner image (the figure tests call `python3 -I figures/tools/cfbuild.py`, `figures/engine/testkit.mjs:18`). Action versions: read each action's README for the current stable major at build time (EXTERNAL; recorded in the commit message). |
| **Data model, schemas, API** | Not applicable. |
| **Edge cases** | `e2e` needs the build of `build`; both use `.next-ci` (git-ignored by `.next-*/`). A run on a fork has no secrets: the script needs none. `audit` needs the registry; offline runs use `CI_SKIP_AUDIT=1`, and T-B0-30 runs it online. Before T-B0-18, `audit` fails with 2 high; this task's own proof therefore skips it. Until T-B0-11, T-B0-17 and T-B0-18 remove the code that reads the legacy variables, the person or agent running `build` types the `KL` prefix by hand so a developer's `.env.local` cannot switch those features on; the script itself never names them. A fresh checkout has no `server/realtime/node_modules`; `relay-deps` installs it (needs the registry, like `npm ci`). |
| **Performance** | ESTIMATED 10 to 15 minutes on a hosted runner (unit 2 to 3 min, build 1 to 2, e2e 3 to 5; measured locally: unit 117 s, build 73 s, e2e 143 s under load, `runs/`). |
| **Unit tests** | `scripts/ci-local.test.mjs` (vitest picks up `scripts/**/*.test.mjs`): (1) `--list` prints the ten step names in order (`content`, `typecheck`, `lint`, `relay-deps`, `unit`, `relay`, `build`, `e2e`, `secrets`, `audit`); (2) the workflow file contains `scripts/ci-local.sh` and contains no `secrets.` and no `permissions: write`; (3) the YAML parses (use `js-yaml`, present in `node_modules`, VERIFIED, or `python3 -c "import yaml"`, PyYAML 6.0.3 VERIFIED; if `js-yaml` is only transitive, parse with python in the test via `execFileSync`); (4) `bash -n scripts/ci-local.sh` passes; (5) `--only nosuchstep` exits 1 and names the valid steps. The test runs no real step: `unit` runs this file under `CI=true`, and a history scan (ESTIMATED up to 60 s) would not fit the 60,000 ms test timeout. The history scan is covered by T-B0-07's own tests and the gate (T-B0-30 steps 8 and 9). |
| **Acceptance** | Given a clean checkout of `build/v1` with `server/realtime/node_modules` removed, When `bash scripts/ci-local.sh --skip e2e,audit` runs at this point of the phase, Then it exits 0 (`relay-deps` installs the relay before `unit`). The full `bash scripts/ci-local.sh` exit 0 is the phase gate (T-B0-30). Given `grep -n "secrets\." .github/workflows/ci.yml`, Then nothing. |
| **Observability** | The result table. |
| **Release blockers** | Any step that needs a credential; any `deploy` or `vercel` word in the workflow. |
| **Definition of done** | Both files and the test committed; the workflow has not run on GitHub (no push, Amar's call). |
| **Verify commands** | `TL`; `V scripts/ci-local.test.mjs`; `bash -n scripts/ci-local.sh`; `bash scripts/ci-local.sh --list`; `bash scripts/ci-local.sh --only content,secrets` (run by the agent, outside vitest); `git grep -niE "solana|vultr|timescale" -- scripts/ci-local.sh scripts/ci-local.test.mjs` prints nothing. |
| **Documentation** | Header comment in the script; one line added to the local `docs/DECISIONS.md`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-31 adds an eleventh step (`no-only`) and a Python check, and changes test 1 to eleven names. T-B0-30 runs the whole script. B1 adds the performance job (R-019). |

---

### T-B0-10. Dock, nav and footer stop offering Passport and Verify; the dock stops feeding the story log

| Field | Content |
|---|---|
| **Identity** | Id T-B0-10. Subsystem client shell. Phase B0. Priority P0 (F-195). Dependencies T-B0-03 (spec imports). Status not started. Group G2. Source files: 5 (`LabDock.tsx`, `src/lib/ai/tools.ts`, `nav.ts`, `FooterNav.tsx`, `NavLinks.tsx`). |
| **Problem** | The dock imports the wallet panel (`LabDock.tsx:11`) and renders it (`:85`). Nav and footer carry `passport` and `verify` entries gated on `feature: "solana"` (`nav.ts:5,13,22-23,28`; `FooterNav.tsx:11,14`). The Passport dock tab exists in the shared tab list (`tools.ts:10`, `:83`). `LabDock.tsx:5,119` runs `useBuildLog`, which only feeds Build Stories. |
| **Target user** | Every visitor. |
| **User story** | As a buddy, the menu lists only what exists. |
| **Expected behaviour** | Dock tabs: partner, together, real, hardware. Nav entries: dashboard, boards, robotics, drones, together, about. No component reads `features.solana`. The dock no longer calls `useBuildLog`. |
| **Existing files** | `src/components/dock/LabDock.tsx:5` (`useBuildLog` import), `:11` (`PassportPanel`), `:25-30` (`TAB_FLAG`, type `"solana" \| "hw" \| null`), `:32-38` (`TAB_LABEL`), `:85` (render), `:91` (comment), `:119` (`useBuildLog({ lab, itemId, store })`); `src/lib/ai/tools.ts:10` (`DOCK_TABS`), `:83` (describe text); `src/components/shell/nav.ts:2-3,5,13,22-23,28-29`; `FooterNav.tsx:11,14,46`; `NavLinks.tsx:6,24-25` (`:25` calls `showNavEntry(entry, features, layout)`); `FooterNav.tsx:46` makes the same three-argument call; `src/components/shell/index.ts:3` exports `showNavEntry` (name stays). |
| **Edits** | `tools.ts`: `DOCK_TABS = ["partner","together","real","hardware"]`; describe text "partner, together (the room), real (parts and prices) or hardware." `LabDock.tsx`: remove the `PassportPanel` import and branch, `passport` from `TAB_FLAG` and `TAB_LABEL`, narrow the flag type to `"hw" \| null`, drop the `useBuildLog` import and call and `store`/`itemId`/`lab` destructuring if now unused, fix the comment at `:91`. `nav.ts`: `NavId` without `passport` and `verify`; delete `feature?`; signature `showNavEntry(entry: NavEntry, where: "bar" \| "sheet" \| "footer"): boolean { return where === "bar" ? entry.bar : true; }`; fix the file comment. `NavLinks.tsx` and `FooterNav.tsx`: drop `useFeatures` and call `showNavEntry(entry, layout)` and `(entry, "footer")`; `FooterNav` ids `["together","about"]`. |
| **Test edits** | `LabDock.test.tsx`: remove `solana: false` (`:16`), `flags.features.solana` (`:80,139`), the Passport tab assertions (`:103,138-144,156-158`); the "hidden tab event" test drops the passport case (no case with that word survives; the other `iynk:dock-tab` cases stay). `nav.test.ts` (`:4-5` define `off`/`on` as `{ solana: ... }` objects): delete both constants and the passport and verify cases, and call `showNavEntry(entry, layout)` with two arguments and no features object; keep "Together stays in the nav". `e2e/dock.spec.ts:3,17-34`, `e2e/dock-shared.ts:53,66-68` (`expectSolanaNavHidden` is deleted), `e2e/dock.phone.spec.ts:20-25`: delete the Passport and Verify absence assertions that read `dockCopy.tabs.passport` and `shell.nav.passport` (those keys go in T-B0-19, so nothing may read them). |
| **Not applicable** | Data model, schemas, API, algorithms, state transitions, validation, permissions, migration. |
| **Edge cases** | `shell.nav.passport` and `common.dock.tabs.passport` strings stay in the JSON until T-B0-19. `/together` stays in the nav (RC-68). The remaining `useFeatures` import in `LabDock.tsx` is still used by `tabShown`. |
| **Performance** | The wallet stack leaves the dock bundle (139 KB gzip on 5 page types, PERFORMANCE_BASELINE; the full effect is measured in T-B0-12). |
| **Acceptance** | Given any lab page, When the dock opens, Then it lists Partner, Together, Build it for real (and Hardware only when its flag is on). Given the footer, Then it lists Together and About under the site heading. Given `git grep -n "passport\|solana" -- src/components/dock src/components/shell src/lib/ai/tools.ts e2e/dock*`, Then nothing (this includes the test files). |
| **Observability** | None. |
| **Release blockers** | `useFeatures` still importing `solana`. |
| **Definition of done** | Five files plus tests; dated line in local `docs/DECISIONS.md`. |
| **Verify commands** | `TL`; `V src/components/dock src/components/shell src/lib/ai`; `E b0-10 e2e/dock.spec.ts e2e/dock.phone.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-11 and T-B0-12 delete what these files used to import. T-B0-13 and T-B0-19 rely on `passport` no longer being read anywhere. |

---

### T-B0-20. Remove Vercel and Vultr from the repo; `/metrics` off the proxy

| Field | Content |
|---|---|
| **Identity** | Id T-B0-20. Subsystem config. Phase B0. Priority P0 (F-202, R-005, security quick win 14). Dependencies none. Status not started. Group G2. Source files: 5 (`deploy/realtime/Caddyfile`, `deploy/realtime/compose.yaml`, `next.config.ts`, `src/i18n/seo.ts`, `src/lib/realtime/ws-transport.ts`). The `.gitignore` line moved to T-B0-18 to keep the count at 5. |
| **Problem** | The repo names a paid host in code and config: `next.config.ts:12` (`!process.env.VERCEL`), `src/i18n/seo.ts:6,10-11` (`VERCEL_PROJECT_PRODUCTION_URL`), `.vercelignore`, two Vultr scripts, `deploy/realtime/compose.yaml:1` (comment names `scripts/realtime-deploy.sh`, deleted below), `ws-transport.ts:24` (comment "The relay on Vultr"), and the Caddy matcher proxies `/metrics` to the world (`Caddyfile:4`, R10). |
| **Target user** | A self-hoster. |
| **User story** | As a self-hoster, `npm run build && npm start` works on any Node host with no platform variable (R-005). |
| **Expected behaviour** | `siteUrl()` is `SITE_URL` or `http://localhost:3000`. `typescript.ignoreBuildErrors` depends only on `IYNK_BUILD_SKIP_TYPECHECK`. Caddy proxies `/ws` and `/healthz` only. |
| **Edits** | `next.config.ts:9-12`: comment and condition become `ignoreBuildErrors: process.env.IYNK_BUILD_SKIP_TYPECHECK === "1"` (the comment says deploy builds type-check; reword to "unset it for a release build"). `seo.ts`: delete `vercel` lines and fix the doc comment. `Caddyfile:4`: `@relay path /ws /healthz`. `compose.yaml:1-2`: reword the comment so it no longer names `scripts/realtime-deploy.sh` ("copy this folder and server/realtime to the VM, write .env next to this file and run `docker compose up -d --build`"). `.gitignore:42` (`.vercel`) is deleted by T-B0-18. `ws-transport.ts:24`: "The relay (H7)". Delete `.vercelignore`, `scripts/realtime-vultr-create.sh`, `scripts/realtime-deploy.sh`. |
| **Edge cases** | The local `.vercel/` folder stays on disk, untracked. `NEXT_PUBLIC_SITE_URL` vs `SITE_URL`: `seo.ts` reads `SITE_URL`, `env.ts` reads `NEXT_PUBLIC_SITE_URL` (two names for one idea; unchanged here, B1's README documents both). The three `*.vercel.app` links in `about/page.tsx:20-22` stay (open question 3). `.env.example` vercel lines go with its rewrite in T-B0-18. The comment in `http.ts:125` ("Behind Vercel these headers...") is rewritten in T-B0-22, which owns that file; the acceptance grep below excludes it for that reason. |
| **Unit tests** | New `src/i18n/seo.test.ts`: `siteUrl()` returns `SITE_URL` when set, `http://localhost:3000` when not, and ignores `VERCEL_PROJECT_PRODUCTION_URL` when set. |
| **Acceptance** | Given `git grep -niE "VERCEL\|\.vercel\b\|vercelignore\|vultr\|realtime-deploy" -- src next.config.ts scripts deploy ':!src/app/[lang]/about/page.tsx' ':!src/lib/server/http.ts'`, Then nothing (VERIFIED on the current tree: the only hits are in the files this card edits or deletes, plus the two excluded paths; `.gitignore` and `.env.example` are cleared by T-B0-18). Given the Caddyfile, Then `/metrics` is not a proxied path. |
| **Observability** | None. |
| **Release blockers** | A remaining reference outside the two excluded paths (`about/page.tsx`, `http.ts`). |
| **Definition of done** | Five files edited, three deleted, one test added; dated line in local `docs/DECISIONS.md`. |
| **Verify commands** | `TL`; `V src/i18n`; `BUILD b0-20`; the `git grep` above; `git grep -n "realtime-deploy" -- deploy` prints nothing. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-21 edits `next.config.ts` after this. T-B0-18 finishes `.env.example` and the `.gitignore` line. Amar's production host setup is his own affair (R-005 note). |

---

### T-B0-11. Remove Solana server code, the `solana` flag and its env

| Field | Content |
|---|---|
| **Identity** | Id T-B0-11. Subsystem server. Phase B0. Priority P0 (F-195, R-004). Dependencies T-B0-10. Status not started. Group G3. Source files: 4 (`status/route.ts`, `env.ts`, `features.ts`, `next.config.ts`). |
| **Problem** | Server code for Proof of Build: three routes, a context, an attest module, a faucet, a readiness probe, the `solana` feature flag and six env variables. |
| **Target user** | A contributor reading the repo; a friend running it without a wallet. |
| **User story** | As a contributor, I find no wallet, mint or faucet code (R-004). |
| **Expected behaviour** | `GET /api/status` returns `{ features }` with no `solana` key. `/passport` and `/verify` get no redirect (they were redirected to a language path by `next.config.ts:54`); `/passport` answers the standard 404. |
| **Existing files** | `src/app/api/status/route.ts:5` (`solanaReady` import), `:14-15` (comment and `{ ...features, solana: await solanaReady() }`); `src/lib/server/env.ts:16-29` (`base58`, `keypair`), `:41-45` (six `SOLANA_*` and `NEXT_PUBLIC_SOLANA_*` schema entries), `:60` (`Features.solana`), `:66` (`URL_VARS` names two Solana URLs), `:97` (`solana: Boolean(...)`); `src/lib/features.ts:17` (`FEATURE_KEYS`), `:24` (`NO_FEATURES`), `:56` (comment "solana is already confirmed"); `next.config.ts:54` (`passport\|verify` in the section pattern). |
| **Deletes** | `src/app/api/solana/` (`attest`, `credentials`, `faucet`, `solana-routes.test.ts`), `src/lib/server/solana/` (`attest.ts`, `common.ts`, `context.ts`, `faucet.ts`), `src/lib/server/solana-ready.ts`, `solana-ready.test.ts`. |
| **Edits** | `status/route.ts`: `return json({ features }, { headers: { "cache-control": "public, max-age=60" } })`; drop the Solana import and comment. `env.ts`: delete the items above; `URL_VARS = new Set<EnvName>(["META_API_BASE", "NEXT_PUBLIC_SITE_URL"])`. `features.ts`: drop `"solana"` from the key list and the default object and the comment. `next.config.ts`: `/:section(boards\|robotics\|drones\|about\|together)/:rest*`. |
| **Edge cases** | `src/lib/solana/` and `src/lib/verify/` still exist and import nothing from the deleted server files (VERIFIED: server `attest.ts` imports `verify`, not the reverse). `src/components/solana/PassportPanel` no longer renders (T-B0-10). The client `useFeatures()` consumers that read `.solana` were removed in T-B0-10; `grep -rn "features.solana\|\.solana\b" src` must print only files T-B0-12 deletes. |
| **Not applicable** | Data model, schemas, algorithms, state transitions, validation, permissions, migration. |
| **Unit tests** | `env.test.ts`: remove the Solana variable cases (`:20,81` style literals; `:97-98` assert the old variables give `solana` false: delete those two lines) and keep the others; any case that asserts the old variables are ignored builds their names at run time; `features.test.tsx`: no `solana` key in `NO_FEATURES`; the case that `normalize` ignores an unknown key in a payload builds the key at run time (`{ [["sol","ana"].join("")]: true }`) so no banned word stays in the file; `status/route.test.ts:6,36,39`: delete the two Solana cases, keep the rate-limit and shape cases. |
| **Acceptance** | Given `GET /api/status`, Then the body's `features` has keys `ai, image, voice, search, db, realtime, gemini` (the server `features` object; `hw` is added client-side in `src/lib/features.ts`, so it is not a status key; image and db go in T-B0-14 and T-B0-17). Given `/en/passport`, Then 404 (checked in T-B0-12's e2e once the page is gone). |
| **Observability** | None. |
| **Release blockers** | A deleted module still imported. |
| **Definition of done** | Four files, tests, deletes; dated line in local `docs/DECISIONS.md`. |
| **Verify commands** | `TL`; `V src/lib/server src/app/api/status src/lib/features.test.tsx`; `git grep -n "server/solana\|solana-ready" -- src` prints nothing. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-12 deletes the client half. T-B0-14, 17, 22 edit `env.ts` and `features.ts` after this. |

---

### T-B0-13. Remove Build Stories, client side

| Field | Content |
|---|---|
| **Identity** | Id T-B0-13. Subsystem client AI. Phase B0. Priority P0 (F-195, F-139). Dependencies T-B0-10. Status not started. Group G3. Source files: 5 (`PartnerPanel.tsx`, `components/ai/index.ts`, `lib/ai/conversation.ts`, `lib/ai/protocol.ts`, `lib/ai/client.ts`). |
| **Problem** | The partner panel carries a second view, "story", fed by a session log (`useBuildLog`, `session-log.ts`) and drawn by `StoryCard` with a PNG exporter (`story-png.ts`). The conversation writes four log lines (`conversation.ts:119,197,208,226`). `client.ts` has `writeStory` and `drawCover`. |
| **Target user** | A buddy using the partner. |
| **User story** | As a buddy, the partner panel is the chat and nothing else. |
| **Expected behaviour** | `PartnerPanel` shows chat only; no "Build Story" button. `SendEnv` has no `log` or `me`. |
| **Existing files** | `src/components/ai/PartnerPanel.tsx:21` (`SessionLog` import), `:27` (`StoryCard`), `:29` (`useBuildLog`), `:37` (`const log = useBuildLog(...)`), `:41` (`log={log}` and `image={features.image}`), `:89` (`ChatProps` has `log` and `image`), `:91` (destructure), `:99` (`view` state), `:115-116` (`log`, `me` in `env()`), `:185-192` (story toggle button), `:205-207` (story branch); `src/components/ai/index.ts:2`; `src/lib/ai/conversation.ts:11` (import), `:48` (`log` in `SendEnv`), `:49` (`me`), `:119,197,208,226` (`env.log.add`), `:214` (`decide` env pick of `"store" \| "log" \| "me"`); `src/lib/ai/protocol.ts:10-12` (`ImageResponse`, `StoryRequest`, `StoryResponse`), `:16-21` (`StoryEvent` types); `src/lib/ai/client.ts:10-12` (type imports), `:249-262` (`writeStory`, `drawCover`). |
| **Deletes** | `src/components/ai/StoryCard.tsx` and `StoryCard.test.tsx`, `useBuildLog.ts`, `src/lib/ai/session-log.ts` and `session-log.test.ts`, `src/lib/ai/story-png.ts`. |
| **Edits** | `PartnerPanel.tsx`: remove the view state, the toggle, the story branch, `log`, `me`, `image`; `PartnerChat` props lose `log` and `image`. The `book` icon use goes; leave `PartnerIcon` alone. `conversation.ts`: delete `log` and `me` from `SendEnv`, the four `env.log.add` calls, and narrow `decide`'s env to `Pick<SendEnv, "store">`. `protocol.ts` and `client.ts`: remove the story and image types and the two functions. |
| **Edge cases** | `features.image` is still in `Features` until T-B0-14; `PartnerPanel` simply stops reading it. `track("ai.call", { kind: "story" })` goes with `writeStory`. The i18n keys `story.*` and `panel.chat` stay until T-B0-19. `src/lib/ai/client.test.ts` imports `drawCover` (`:2`) and tests it (`:138` "transcribe and drawCover", `:178`): keep the `transcribe` cases, delete the cover and story cases. |
| **Not applicable** | Data model, schemas, API (server half is T-B0-14), algorithms, state transitions, validation, permissions, migration. |
| **Unit tests** | `PartnerPanel.test.tsx`: delete story-view cases, remove `solana` from `FULL` (`:68`); keep chat, tool, suggestion cases. `src/lib/ai/client.test.ts`: delete the `drawCover` and story cases (`:138-190` region) and the `drawCover` import. Any conversation test that builds a `SendEnv` drops `log` and `me`. |
| **Acceptance** | Given the partner panel with AI on, Then there is no "Build Story" button (`getByRole('button', { name: /story/i })` count 0). Given `git grep -n "useBuildLog\|session-log\|story-png\|StoryCard\|writeStory\|drawCover" -- src`, Then nothing. |
| **Observability** | None. |
| **Release blockers** | A turn that no longer streams (the chat tests must stay green). |
| **Definition of done** | Five files edited, seven deleted; dated line in local `docs/DECISIONS.md`. |
| **Verify commands** | `TL`; `V src/components/ai src/lib/ai src/components/dock`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-14 deletes the routes these calls used. T-B0-19 deletes the `story` strings. |

---

### T-B0-15. Remove Build Night

| Field | Content |
|---|---|
| **Identity** | Id T-B0-15. Subsystem client and server. Phase B0. Priority P0 (F-195, F-137). Dependencies T-B0-09. Status not started. Group G3. Source files: 1 (`src/app/[lang]/together/Lobby.tsx`). |
| **Problem** | The lobby renders `Planner` (`Lobby.tsx:15,173`) and the route `/api/ai/plan` runs a server planner (`src/lib/server/ai/plan.ts`, `prompts/plan.ts`). |
| **Target user** | A buddy on `/together`. |
| **User story** | As a buddy, `/together` starts or joins a room and shows nothing about a removed planner. |
| **Expected behaviour** | `/together` keeps its shell (RC-68): Start and Join sections. The Planner section is gone. |
| **Existing files** | `src/app/[lang]/together/Lobby.tsx:15` (import), `:143` (comment), `:173` (`<Planner t={t} titles={titles} index="04" />`); `Planner.tsx` (222 lines); `src/app/api/ai/plan/route.ts` and `route.test.ts` (imports `planBuildNight` from `@/lib/server/ai/plan`); `src/lib/server/ai/plan.ts`; `src/lib/server/ai/prompts/plan.ts`. |
| **Deletes** | The four items above plus `route.test.ts`. |
| **Edits** | `Lobby.tsx`: remove the import, the line and fix the doc comment at `:143` to "start or join a room and Build Buddies" (Buddies goes in T-B0-16). |
| **Edge cases** | `titles` and `aiOff` are still read by `Buddies` until T-B0-16, so they stay. `catalog.ts` still serves `buddies` (matcher) until T-B0-16. `plan_build_night` MCP tool is already gone (T-B0-09). |
| **Not applicable** | Data model, schemas, API (route deletion), algorithms, state transitions, validation, permissions, performance, migration. |
| **Tests** | `e2e/room.spec.ts` keeps its cases; check the file for Planner text (`grep -n -i "plan" e2e/room.spec.ts` prints nothing today, VERIFIED, so no edit is expected). Unit tests of the deleted route are deleted with it. |
| **Acceptance** | Given `/en/together`, When it loads, Then two sections show (start, join) and no section numbered 04. Given `POST /api/ai/plan`, Then 404. |
| **Observability, release blockers** | None / a dangling import. |
| **Definition of done** | One file edited, five deleted; dated line in local `docs/DECISIONS.md`. |
| **Verify commands** | `TL`; `V src/lib/server/ai`; `E b0-15 e2e/room.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-16 edits `Lobby.tsx` next. |

---

### T-B0-12. Remove Solana client code and pages

| Field | Content |
|---|---|
| **Identity** | Id T-B0-12. Subsystem client. Phase B0. Priority P0 (F-195, R-004). Dependencies T-B0-10, T-B0-11. Status not started. Group G4. Source files: 2 (`src/i18n/namespaces.ts`, `scripts/crawl-routes.mjs`). |
| **Problem** | The wallet stack still ships: `src/components/solana/` (13 files), `src/lib/solana/` (wallet adapter, program client, IDL), `src/lib/verify/` (run logs hashed for attestation; its only importers outside itself are Solana files, VERIFIED in COMMUNITY 4.5), two pages and a `solana` i18n namespace in six languages. The wallet library is 139 KB gzip on 5 page types (PERFORMANCE_BASELINE). |
| **Target user** | Every visitor (first load); a contributor. |
| **User story** | As a buddy, no page loads a wallet library (R-004). |
| **Expected behaviour** | `/en/passport` and `/en/verify` return the standard not-found page. No redirect keeps them alive (R-004). `git grep -n "@solana\|wallet-adapter" -- src` prints nothing. |
| **Existing files** | `src/i18n/namespaces.ts:4` (`NAMESPACES` list holds `"solana"`), `:17` (`solana: typeof import("./messages/en/solana.json")`); `scripts/crawl-routes.mjs:27-28` (comment and `BY_DESIGN` regex `(passport\|verify)`); `src/app/[lang]/passport/page.tsx`, `src/app/[lang]/verify/page.tsx`; `e2e/redirects.spec.ts`. |
| **Deletes** | `src/components/solana/`, `src/lib/solana/` (including `idl/`), `src/lib/verify/`, `src/app/[lang]/passport/`, `src/app/[lang]/verify/`, `src/i18n/messages/{en,es,fr,de,zh,hi}/solana.json`. |
| **Edits** | `namespaces.ts`: drop the name and the type line. `crawl-routes.mjs`: `BY_DESIGN = [/^\/[a-z]{2}\/not-found$/]` and the comment. |
| **Playwright** | `e2e/redirects.spec.ts`: add two cases: `GET /en/passport` and `GET /en/verify` answer status 404; `GET /passport` (no language) answers 404 as well (the redirect pattern no longer lists it, T-B0-11). The paths are built at run time (`const gone = ["pass","port"].join("")` and `["ver","ify"].join("")`, and the test titles say "a removed page"), so `e2e/redirects.spec.ts` holds no banned word. |
| **Unit tests** | `src/i18n/messages.test.ts` (iterates the languages and `NAMESPACES`) must pass unchanged; add one assertion that `NAMESPACES` does not include the removed namespace, with the name built at run time (`["sol","ana"].join("")`). |
| **Edge cases** | A leftover `solana` key read by `getMessages(lang, "solana")` fails typecheck (good). Any file outside the delete list that imports `@/lib/solana` or `@/lib/verify` is a hidden importer: stop and report (roadmap risk R1). The sitemap has no passport entry (`git grep -n passport -- src/app` after the delete prints nothing). |
| **Performance** | The wallet library leaves every bundle. Measure: `BUILD b0-12` then `grep -rlE "wallet-adapter\|@solana\|web3\.js" .next-b0-12/static` prints nothing. |
| **Not applicable** | Data model, schemas, API, algorithms, state transitions, validation, permissions, migration. |
| **Acceptance** | Given `E b0-12 e2e/redirects.spec.ts`, Then the three 404 cases pass. Given the build, Then the bundle grep above is empty. |
| **Observability, release blockers** | None / a hidden importer. |
| **Definition of done** | Directories deleted, two files edited, e2e cases added; dated line in local `docs/DECISIONS.md`. |
| **Verify commands** | `TL`; `V src/i18n`; `BUILD b0-12`; `grep -rlE "wallet-adapter\|@solana\|web3\.js" .next-b0-12/static`; `E b0-12 e2e/redirects.spec.ts`. |
| **Rollback** | `git revert` (the delete is one commit). |
| **Later tasks need** | T-B0-18 drops the dependencies this code used. T-B0-19 deletes the `passport` keys in other namespaces. |

---

### T-B0-14. Remove Build Stories, server side, and the image route

| Field | Content |
|---|---|
| **Identity** | Id T-B0-14. Subsystem server AI. Phase B0. Priority P0 (F-195, F-139). Dependencies T-B0-13, T-B0-11. Status not started. Group G4. Source files: 5 (`server/ai/types.ts`, `server/ai/provider.ts`, `server/ai/guard.ts`, `server/env.ts`, `lib/features.ts`). |
| **Problem** | `POST /api/ai/story` and `/api/ai/image` serve a removed feature, with prompts, types, an image call to Muse Image, an `image` feature flag and an image budget. |
| **Target user** | A contributor; an operator with a Meta key. |
| **User story** | As an operator, a Meta key buys chat, translate and voice, and nothing else. |
| **Expected behaviour** | The two routes answer 404. `Features` has no `image`. `guardAi` has one budget. |
| **Existing files** | `src/lib/server/ai/types.ts:49-63` (`StoryEvent`, `StoryRequest`, `StoryResponse`, `ImageRequest`, `ImageResponse`); `provider.ts:425-473` (`generateImage` with its doc comment); `guard.ts:9` (`IMAGE_BUDGET`), `:12` (the `feature` parameter), `:23-24` (image branches); `env.ts:35` (`META_IMAGE_MODEL`), `:57` (`Features.image`), `:94` (`image: meta`); `features.ts:17,21` (`"image"` in keys and defaults); `src/app/api/ai/story/{route.ts,route.test.ts}`, `src/app/api/ai/image/{route.ts,route.test.ts}`, `prompts/story.ts`, `prompts/image.ts`. |
| **Deletes** | The files above. |
| **Edits** | `types.ts`: delete the five types. `provider.ts`: delete `generateImage` and its comment; remove imports that become unused. `guard.ts`: one `AI_BUDGET`, `rateLimit("ai:budget", AI_BUDGET)`; `feature: keyof Features = "ai"` stays (transcribe passes `"voice"`). `env.ts` and `features.ts`: delete the image entries. |
| **Edge cases** | `scripts/smoke-ai.mjs` calls the image endpoint of the provider: handled in T-B0-29. `src/lib/server/ai/__test__/upstream.ts` stays. i18n `ai.json` `story` object stays until T-B0-19. |
| **Not applicable** | Data model, schemas, algorithms, state transitions, validation, permissions, performance, migration. |
| **Unit tests** | `provider.test.ts:221-240` (`describe("generateImage"`) deleted; `env.test.ts:20,81,93`: remove `image`; `features.test.tsx`: no `image` key; `LabDock.test.tsx:13` and `PartnerPanel.test.tsx:68` literals drop `image`. |
| **Acceptance** | Given `POST /api/ai/story`, Then 404. Given `GET /api/status`, Then `features` has no `image`. Given `git grep -n "generateImage\|META_IMAGE_MODEL\|IMAGE_BUDGET\|ImageRequest\|ImageResponse\|StoryRequest\|StoryResponse" -- src`, Then nothing. |
| **Observability, release blockers** | None / typecheck. |
| **Definition of done** | Five files, tests, deletes; dated line in local `docs/DECISIONS.md`. |
| **Verify commands** | `TL`; `V src/lib/server/ai src/lib/ai src/lib/features.test.tsx src/lib/server/env.test.ts src/components/dock src/components/ai`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-17 and T-B0-22 edit `env.ts` and `features.ts` next; T-B0-23 edits `guard.ts` next. |

---

### T-B0-16. Remove the public buddy pool, matcher, board and live counter

| Field | Content |
|---|---|
| **Identity** | Id T-B0-16. Subsystem client and server. Phase B0. Priority P0 (F-195, F-141, F-006, R-004, R-007). Dependencies T-B0-15, T-B0-03. Status not started. Group G4. Source files: 5 (`Lobby.tsx`, `together/api.tsx`, `FlyWorkspace.tsx`, `fly/page.tsx`, `server/ai/catalog.ts`). |
| **Problem** | Anonymous callers can list other people's names and free text (`GET /api/buddies`), read the public board and the live counter. These are release blockers 3 and 7 of `SECURITY_BASELINE.md` section 8 (D1, D2). The matcher (`/api/ai/match`) feeds the pool. |
| **Target user** | Every visitor; Amar (privacy). |
| **User story** | As Amar, no route returns other people's names or free text to a stranger (R-007). |
| **Expected behaviour** | The routes `/api/buddies`, `/api/leaderboard`, `/api/live`, `/api/ai/match` answer 404. The fly page shows no leaderboard. `/together` shows Start and Join only. |
| **Existing files** | `src/app/[lang]/together/Lobby.tsx:14` (`Buddies` import), `:172` (use), `:136-145` (`aiOff`, `titles`, the `aiOff` note), `LobbyLede` stays; `src/app/[lang]/together/api.tsx:7-66` (`postJson`, `ApiResult`, `FeatureGate` have importers only in the deleted `Buddies.tsx` and `Planner.tsx`; `roomPath` stays); `src/components/dronelab/FlyWorkspace.tsx:5` (`Leaderboard`, `DataMessages`), `:33` (`track`), `:46` (`board` prop), `:54-55` (`onBoard`), `:57` (destructure), `:109` (comment naming the live counter), `:115` (`track("flight.start")`), `:123,125` (two `track("flight.lap")` calls), `:205-215` (`<Leaderboard ... />`); `src/app/[lang]/drones/[drone]/fly/page.tsx:4` (`getDataMessages`), `:53` (in `Promise.all`), `:65` (`board={data.leaderboard}`); `src/lib/server/ai/catalog.ts:1-38` (only `LABS` has a user, `chat/route.ts:4`); `e2e/fly-fun.spec.ts:152-154` (asserts the board title and the "off" title); `e2e/shell.spec.ts:231-236` ("without the AI service, the Together lede doesn't promise translated chat" asserts `together.lobby.aiOff` visible at `:233`; this card deletes the block that renders it, `Lobby.tsx` `aiOff`, and T-B0-19 deletes the key; `e2e/` is in the `tsconfig` include and the JSON is imported, so the spec would also stop typechecking). |
| **Deletes** | `src/app/[lang]/together/Buddies.tsx`; `src/app/api/buddies/`, `src/app/api/leaderboard/`, `src/app/api/live/`, `src/app/api/ai/match/` (each with its test); `src/lib/server/ai/prompts/match.ts`; `src/components/data/` (`Leaderboard.tsx`, `LiveCounter.tsx`, `useFeed.ts`, `format.ts`, `messages.ts`, `messages/`, `index.ts`, tests). |
| **Edits** | `Lobby.tsx`: remove `Buddies`, the whole `aiOff ? ... : ...` block, `titles`, `useMemo` and the `useAiOff` wrapper if only the lede uses it (it stays used by `LobbyLede`). `api.tsx`: keep `roomPath` only; drop unused imports. `FlyWorkspace.tsx`: remove the `Leaderboard` import, the `board` prop, `onBoard`, all three `track` calls (`flight.start` fed only the live counter and `flight.lap` only the board, per the comment at `:107-109`), the `track` import at `:33` (`grep -n "track(" FlyWorkspace.tsx` shows no other call, VERIFIED) and fix that comment. `fly/page.tsx`: remove `getDataMessages` and `board`. `catalog.ts`: keep `LABS` and its imports, delete `catalog`, `catalogLines`, `itemKey`, `parseItemKey`, `CatalogItem` and the planner-and-matcher comment; trim `catalog.test.ts` to match (or delete it if nothing is left to test). `e2e/fly-fun.spec.ts`: delete the two leaderboard assertions and the comment line before them. `e2e/shell.spec.ts` (test edit): delete the `getByText(together.lobby.aiOff)` assertion (`:233`), keep the `ledePlain` and `lede` assertions, and change the comment at `:232` to "The test server has no AI key, so the lobby lede leaves out the translated-chat promise." T-B0-19 then needs no `shell.spec.ts` change. |
| **Edge cases** | `src/lib/telemetry/kinds.ts` still lists `flight.lap`, `flight.start`, `led.blink`: T-B0-28 prunes kinds that have no caller. `led.blink` tally callers in other files stay (no-op after T-B0-08). `progress` best times (`recordBest`) are local and stay. |
| **Not applicable** | Data model (the SQL goes in T-B0-17), schemas, new API, algorithms, state transitions, validation, permissions, migration. |
| **Unit tests** | `catalog.test.ts` trimmed; deleted tests go with their routes. `FlyWorkspace` has no unit test (VERIFIED: `src/components/dronelab/` holds only `DesignPanel.test.tsx`). |
| **Playwright** | `e2e/fly.spec.ts` and `e2e/room.spec.ts` must pass unchanged; `e2e/fly-fun.spec.ts` and `e2e/shell.spec.ts` after the edits. |
| **Acceptance** | Given `GET /api/buddies`, `/api/leaderboard`, `/api/live` and `POST /api/ai/match`, Then each answers 404. Given the fly page, Then no element with text "Leaderboard" exists. Given `git grep -n "components/data\|Leaderboard\|LiveCounter\|useFeed" -- src e2e`, Then nothing. |
| **Observability, release blockers** | None / any route above still answering 200 or 503. |
| **Definition of done** | Five files edited, directories deleted; dated line in local `docs/DECISIONS.md`. |
| **Verify commands** | `TL`; `V src/lib/server/ai src/app/api`; `E b0-16 e2e/fly.spec.ts e2e/fly-fun.spec.ts e2e/room.spec.ts e2e/shell.spec.ts`; `git grep -n "aiOff" -- e2e` prints nothing. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-17 deletes the SQL layer these routes used. COLLAB (R-081, R-091) rebuilds the buddies board behind pairing. |

---

### T-B0-17. Remove the telemetry route and the Postgres layer

| Field | Content |
|---|---|
| **Identity** | Id T-B0-17. Subsystem server data. Phase B0. Priority P0 (F-006, F-195, R-004, R-009). Dependencies T-B0-08, T-B0-11, T-B0-14, T-B0-16. Status not started. Group G5. Source files: 4 (`server/env.ts`, `lib/features.ts`, `api/status/route.ts`, `lib/telemetry/index.ts`). |
| **Problem** | `POST /api/telemetry` ingests events into Postgres/Timescale; `src/lib/server/db/` (9 files), `db/migrations/0001..0003`, `scripts/db-migrate.mjs` and a `db` feature flag exist for it, for the leaderboard, the live counter and the buddy pool. All their route callers are gone after T-B0-16 (VERIFIED: every importer of `server/db` is a route listed for deletion). |
| **Target user** | A friend running iynk with no database. |
| **User story** | As a friend, nothing in the repo expects a database. |
| **Expected behaviour** | `POST /api/telemetry` answers 404. No `db` flag. No `DATABASE_URL`. |
| **Existing files** | `src/lib/server/env.ts:15` (`pgUrl`), `:46` (`DATABASE_URL`), `:61` (`Features.db`), `:98` (`db: Boolean(e.DATABASE_URL)`); `src/lib/features.ts:17,25` (`"db"`); `src/app/api/status/route.ts` (no db reference; the test mentions it); `src/lib/telemetry/index.ts:3` (`export type { BuddiesResponse, ... } from "./responses"`); `src/app/api/telemetry/{route.ts,route.test.ts}`; `src/lib/server/db/{client,ingest,live,migrate.test,queries,schema,timescale.test,ingest.test,queries.test}.ts`; `db/migrations/*.sql`; `scripts/db-migrate.mjs`; `src/lib/telemetry/responses.ts`. |
| **Deletes** | `src/app/api/telemetry/`, `src/lib/server/db/`, `db/`, `scripts/db-migrate.mjs`, `src/lib/telemetry/responses.ts`. This also removes the 4 Docker-only `timescale.test.ts` cases that skip silently (TEST_COVERAGE section 4). |
| **Edits** | `env.ts`: delete `pgUrl`, `DATABASE_URL`, `Features.db`, `db:`; `features.ts`: drop `"db"`; `telemetry/index.ts`: delete line 3; `status/route.ts`: no code change expected, only its test. |
| **Edge cases** | The `postgres` dependency stays in `package.json` until T-B0-18 (one `package.json` edit). `docs/` mentions of the migrations are history. `DATABASE_URL` in a developer's `.env.local` is ignored. |
| **Migration** | Git history keeps `db/migrations/0001..0003`. No data is migrated (no production data is in scope). |
| **Not applicable** | Data model, schemas, API (deletion), algorithms, state transitions, validation, permissions, performance. |
| **Unit tests** | `env.test.ts`, `features.test.tsx`, `status/route.test.ts`: remove `db`. |
| **Acceptance** | Given `GET /api/status`, Then `features` keys are `ai, voice, search, realtime, gemini` (the server object; `hw` is client-side only). Given `git grep -n "server/db\|DATABASE_URL\|timescale" -- src scripts`, Then nothing. |
| **Observability, release blockers** | None / a hidden importer. |
| **Definition of done** | Four files edited, directories deleted; dated line in local `docs/DECISIONS.md` ("Postgres layer removed; SQLite arrives with the server, ADR-0004"). |
| **Verify commands** | `TL`; `V src/lib`; `BUILD b0-17`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-18 drops `postgres`. T-B0-22 adds env switches to the slimmer `env.ts`. T-B0-28 prunes telemetry leftovers. |

---

### T-B0-19. Delete orphan i18n keys in six languages

| Field | Content |
|---|---|
| **Identity** | Id T-B0-19. Subsystem i18n. Phase B0. Priority P0 (F-195, R-004). Dependencies T-B0-10, T-B0-12, T-B0-13, T-B0-15, T-B0-16. Status not started. Group G5. Source files: 4 sets (`ai.json`, `together.json`, `shell.json`, `common.json`, each in six languages, counted as 1 per set). |
| **Problem** | R-004 asks for no "i18n key (all six languages)" for the removed features. After the code is gone these strings are dead. |
| **Target user** | A translator; a contributor. |
| **User story** | As a contributor, every string in the files is used. |
| **Expected behaviour** | The keys below are absent in all six languages; every language file keeps the same key set as English (`src/i18n/messages.test.ts` checks this). |
| **Keys (English paths, VERIFIED by walking the JSON)** | `ai.json`: the whole `story` object (starts at `:108`), `tools.tabs.passport` (`:77`), and `panel.chat` if `git grep -n "panel.chat" -- src` shows no reader after T-B0-13. `common.json`: `client.dock.tabs.passport` (`:44`). `shell.json`: `nav.passport` and `nav.verify` (`:12` and the next line) and the `together.partner` string at `:117` that advertises a build buddy and a build night (the agent finds its parent key and either removes the block, if no page reads it, or rewrites the sentence to describe the lab partner only). `together.json`: `lobby.buddies` (whole object, from `:181`), `lobby.plan` (whole object, from `:208`), `lobby.aiOff` (`:159`), and `lobby.notSetUp` and `lobby.retry` if no reader remains (their reader was `FeatureGate` in `api.tsx`, removed in T-B0-16); `lobby.metaDescription` (`:153`) loses "find a build buddy and plan a build night with Muse Spark" in all six languages. |
| **Method** | For each candidate key run `git grep -n "<key leaf>" -- src e2e` and delete only keys with no reader. A key read through a dynamic prefix (for example `t(`lobby.plan.levels.${x}`)`) belongs to a removed component and goes with it. Edit the six files of a set in one pass with `node` (parse, delete, `JSON.stringify(..., null, 2)` with the file's existing indent and trailing newline) and diff to confirm only intended lines changed. |
| **Copy rule** | `metaDescription` is the only sentence that changes; write it in five languages in plain words, as the other strings do. Everything else is a deletion. Do not touch `shell.json:138` (the privacy sentence about usage counts); B1 rewrites it with the local log. |
| **Not applicable** | Modules, data model, schemas, API, algorithms, state transitions, validation, permissions, performance, migration. |
| **Unit tests** | `src/i18n/messages.test.ts` (parity, translation check at `:44`). Add one case: for each deleted top-level key name the English file has no such key. A key name that `RESIDUAL` matches (`passport`) is built at run time from fragments (`["pass","port"].join("")`), so `messages.test.ts` holds no banned word. `e2e/shell.spec.ts` needs no edit here: T-B0-16 already removed its only `lobby.aiOff` reader. |
| **Acceptance** | Given `git grep -niE "build story\|build night\|passport\|proof of build" -- src/i18n`, Then nothing (the 4.6 pattern hits 19 i18n files today, VERIFIED). Given `V src/i18n`, Then parity holds. |
| **Observability** | None. |
| **Release blockers** | A key deleted while a component still reads it (typecheck fails on `t("...")` types if `Messages` is typed from the JSON; otherwise the e2e run shows the raw key: scan `E b0-19 e2e/shell.spec.ts e2e/dock.spec.ts e2e/room.spec.ts` output for raw dotted keys). |
| **Definition of done** | Four sets edited. |
| **Verify commands** | `TL`; `V src/i18n`; `E b0-19 e2e/shell.spec.ts e2e/dock.spec.ts e2e/room.spec.ts`; the grep above. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-30's residual grep. |

---

### T-B0-21. Security headers on every route; `poweredByHeader: false`

| Field | Content |
|---|---|
| **Identity** | Id T-B0-21. Subsystem config. Phase B0. Priority P0 (F-002, R-006 without the CSP). Dependencies T-B0-03, T-B0-11, T-B0-20. Status not started. Group G5. Source files: 1 (`next.config.ts`). |
| **Problem** | Only `/figures/:path*` sets headers (`next.config.ts:21-33`, VERIFIED). Pages and API routes send none, and `X-Powered-By` is on (Next default). |
| **Target user** | Every visitor. |
| **User story** | As a buddy, the browser gets the cheapest protections without any page changing. |
| **Expected behaviour** | Every response, including `/_next/static`, API routes and 404s, carries `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(self), geolocation=(self), serial=(self), usb=(), payment=()`, and `Content-Security-Policy: frame-ancestors 'self'`. `X-Powered-By` is absent. |
| **Existing files** | `next.config.ts:4-8` (config object), `:21-33` (`headers()` with one `/figures/:path*` rule). Next docs read: `headers.md` (same key on two matching rules: the last rule wins, `headers.md:47`), `poweredByHeader.md`. |
| **Design** | `poweredByHeader: false`. `headers()` returns the global rule `{ source: "/:path*", headers: SECURITY }` first and the existing `/figures/:path*` rule second, so the figure rule's own `Content-Security-Policy: frame-ancestors 'self'` and `Cache-Control` win on figures. The permissions list comes from use in code: microphone (`VoiceButton.tsx:75`, `lib/ai/recorder.ts:43`), geolocation (`search/NearbyPanel.tsx`), Web Serial (`lib/hw/serial.ts`); no camera or USB use exists (VERIFIED by grep). The full CSP, with a nonce or hash for the theme boot script (`src/lib/settings/theme.tsx:11,25`), is B1; B1's CSP replaces the `frame-ancestors`-only value. |
| **Edge cases** | `cacheComponents: true` makes a nonce CSP awkward (guide `02-guides/content-security-policy.md`): not attempted here. Strict-Transport-Security belongs to whatever TLS proxy fronts the app; the repo's Caddyfile fronts only the relay and sets it there (`Caddyfile:12`). Do not set it in the app: a plain `http://localhost` run must work. If a later phase scans QR codes with the camera it must relax `camera=()`. |
| **Not applicable** | Data model, schemas, API contracts, algorithms, state transitions, validation, permissions, performance (a few bytes per response), migration. |
| **New test** | `e2e/headers.spec.ts` (imports `test` from `./support/no-egress`): requests `/en`, `/en/about`, `/en/boards/uno-r3/blink`, `/api/status`, `/api/openapi.json`, `/figures/boards/uno-r3.html`, a `/_next/static/...` file read from the page's own `<script src>`, and `/en/does-not-exist`; for each asserts the four headers and `x-powered-by` undefined; for the figure asserts `cache-control` still `public, max-age=300, must-revalidate`. |
| **Acceptance** | Given any of the eight URLs, When fetched, Then the four headers are present with the exact values above and `x-powered-by` is absent. Given the lab page loads, Then no console error mentions a blocked feature policy (the mic and serial buttons still ask for permission: covered by existing hardware and voice specs). |
| **Observability, release blockers** | None / any existing e2e test failing because of a policy (microphone, geolocation, serial). |
| **Definition of done** | One file, one spec; dated line in local `docs/DECISIONS.md`. |
| **Verify commands** | `TL`; `E b0-21 e2e/headers.spec.ts`; `E b0-21 e2e/shell.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B1 CSP task extends the same `headers()` entry. |

---

### T-B0-18. Delete `solana/`, drop dependencies, rewrite `.env.example`

| Field | Content |
|---|---|
| **Identity** | Id T-B0-18. Subsystem repo. Phase B0. Priority P0 (F-195, F-202, R-004, R-017). Dependencies T-B0-12, T-B0-17. Status not started. Group G6. Source files: 3 (`package.json` with `package-lock.json`, `.env.example`, `.gitignore`). |
| **Problem** | `solana/` (Anchor program, 34 tests, 22 tracked files) is dead after T-B0-12. `package.json:33,36-39` declares `@coral-xyz/anchor`, `@solana/wallet-adapter-base`, `-react`, `-react-ui`, `@solana/web3.js`; `bs58` and `postgres` have no importer left (VERIFIED: `bs58` only in Solana files; `postgres` only in `server/db` and `scripts/db-migrate.mjs`). `npm audit --omit=dev` shows 2 high and 13 moderate; both highs come through `@coral-xyz/anchor` (`toml`). `.env.example` names Solana, Vultr, Timescale. `.gitignore:42` ignores `.vercel` (moved here from T-B0-20 to keep that card at 5 files). |
| **Target user** | A friend cloning the repo; CI. |
| **User story** | As a friend, `npm ci` installs only what iynk uses and `.env.example` lists only what it reads (R-017). |
| **Expected behaviour** | No Solana, Postgres or bs58 dependency. `npm audit --omit=dev` reports 0 high. `.env.example` holds names with empty values only. |
| **Commands** | `git rm -r -q solana`; `npm uninstall @coral-xyz/anchor @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/web3.js bs58 postgres` (updates the lockfile; reads the registry, EXTERNAL). |
| **`.env.example` content** | A short header (copy to `.env.local`, every variable optional, names only, never commit keys), then one commented group per area with `NAME=` and no value: `META_API_KEY`, `META_API_BASE`, `META_MODEL`, `META_TRANSCRIBE_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `SERPAPI_KEY`, `SERPAPI_MONTHLY_BUDGET`, `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `IYNK_SERVER_TOKEN` (comment: at least 32 random bytes, for example `openssl rand -base64 48`; B0 only), `IYNK_AI_ENABLE` and `IYNK_SEARCH_ENABLE` (comment: `1` turns the module on; default off), `IYNK_TRUST_PROXY` (comment: `1` only behind a proxy you control), `IYNK_BUILD_SKIP_TYPECHECK` (comment: development only). No Solana, Vultr, Timescale, Postgres or Vercel name. |
| **`.gitignore`** | Delete the `.vercel` line and its blank (the local `.vercel/` folder stays on disk, untracked). |
| **New test** | `scripts/env-example.test.mjs`: every non-comment, non-blank line of `.env.example` matches `^[A-Z][A-Z0-9_]*=$`; no name matches the banned list; the names are unique. The banned list is assembled at run time from fragments (`["SOL","ANA"].join("")`, `["VUL","TR"].join("")`, and so on) so the test file holds no banned word (residual rule, section 1). |
| **Edge cases** | Untracked `solana/node_modules` and `solana/target` (about 1.1 GB) stay on disk: leftover `.ts` under `solana/target` could enter `tsc` (`tsconfig.json` includes `**/*.ts`; nested `node_modules` is skipped by default). If `npm run typecheck` fails on them, stop and ask Amar to delete them ("For Amar" 3); do not delete untracked files. `tsconfig.json`, `eslint.config.mjs` and `.gitignore` contain no `solana` text (VERIFIED by grep), so they need no edit. |
| **Not applicable** | Data model, schemas, API, algorithms, state transitions, validation, permissions, performance beyond the bundle (T-B0-12 measures it), migration. |
| **Acceptance** | Given `npm audit --omit=dev`, Then 0 high and 0 critical (ESTIMATED to clear both; this is the run that confirms it). Given `npm ls @solana/web3.js @coral-xyz/anchor`, Then neither is found (CM-41). Given `git ls-files solana`, Then nothing. Given `git grep -niE "vercel" -- .gitignore .env.example`, Then nothing. |
| **Observability, release blockers** | The audit output / any high advisory left: stop and list it for Amar. |
| **Definition of done** | Three files, one test, one directory removed; audit and `ls` outputs pasted in the commit message. |
| **Verify commands** | `TL`; `V scripts/env-example.test.mjs`; `BUILD b0-18`; `npm audit --omit=dev`; `npm ls @solana/web3.js @coral-xyz/anchor`; `git ls-files solana`; `git grep -niE "vercel" -- .gitignore .env.example` prints nothing. |
| **Documentation** | Dated line in local `docs/DECISIONS.md`. |
| **Rollback** | `git revert` (restores `solana/` from history, the lockfile and `.env.example`). |
| **Later tasks need** | T-B0-30's audit step. B1 rewrites `.env.example` again for bring-your-own keys. |

---

### T-B0-22. Route classes, one access helper, env switches

| Field | Content |
|---|---|
| **Identity** | Id T-B0-22. Subsystem server. Phase B0. Priority P0 (F-004, R-007, RC-16, RC-28). Dependencies T-B0-14, T-B0-17. Status not started. Group G6. Source files: 3 (`src/lib/server/access.ts` new, `http.ts`, `env.ts`). |
| **Problem** | Nothing says which routes may answer a stranger. The 12 remaining route files have no class, no token and no off switch. |
| **Target user** | Amar leaving a server running. |
| **User story** | As Amar, a route nobody classified fails a test (R-007). |
| **Expected behaviour** | One table lists every file under `src/app/api` with a class. A test fails on an unlisted route or a listed route that is gone. A helper checks the server token in constant time. |
| **New files** | `src/lib/server/access.ts`, `src/lib/server/access.test.ts`, `src/app/api/routes.test.ts`. |
| **Modules and signatures** | `access.ts`: `export type RouteClass = "local-only" \| "needs-server-token" \| "needs-user-key";` `export const ROUTE_CLASSES: Readonly<Record<string, RouteClass>>` keyed by path under `src/app/api` (`"status/route.ts"`, `"openapi.json/route.ts"` are `local-only`; `"ai/chat/route.ts"`, `"ai/transcribe/route.ts"`, `"ai/translate/route.ts"`, `"mcp/route.ts"`, `"mcp/tools/[name]/route.ts"`, `"search/events/route.ts"`, `"search/nearby/route.ts"`, `"search/offers/route.ts"`, `"search/videos/route.ts"`, `"search/web/route.ts"` are `needs-server-token`; 12 rows). `export function serverTokenOk(req: Request, expected: string \| undefined = env.IYNK_SERVER_TOKEN): boolean`. `export function requireServerToken(req: Request): Response \| null` (null when allowed, else `unauthorized()`). `needs-user-key` has no member yet; B1 moves the AI and search rows to it. `http.ts`: `export function unauthorized(): Response` (status 401, body `{"error":{"code":"unauthorized","message":""}}`, `cache-control: no-store`; same bytes for a missing and a wrong token) and `export function featureDisabled(what: string): Response` (501, code `feature_disabled`, message `"<what> is turned off on this server."`). `env.ts` new schema entries: `IYNK_SERVER_TOKEN: text.min(32).optional()`, `IYNK_AI_ENABLE`, `IYNK_SEARCH_ENABLE`, `IYNK_TRUST_PROXY` each `z.enum(["0","1"]).default("0").transform((v) => v === "1")`. `featuresOf` changes: `ai = IYNK_AI_ENABLE && (meta \|\| gemini)`, `voice = IYNK_AI_ENABLE && meta`, `gemini = IYNK_AI_ENABLE && gemini`, `search = IYNK_SEARCH_ENABLE && Boolean(SERPAPI_KEY)`, so the client sees a module only when the operator turned it on. |
| **Algorithm** | `serverTokenOk`: `const given = createHash("sha256").update(req.headers.get("x-iynk-server-token") ?? "").digest(); const want = createHash("sha256").update(expected ?? "").digest(); const same = timingSafeEqual(given, want); return Boolean(expected) && same;`. Digests of equal length make the compare constant-time and hide token length (BACKEND 13.1). An unset token closes every `needs-server-token` route. |
| **Validation and errors** | A token under 32 characters is an invalid setting: `readEnv` reports it in `issues` and treats it as unset (routes stay closed). `IYNK_AI_ENABLE=yes` is invalid and reads as `0`. |
| **Edge cases** | `X-Iynk-Server-Token` is never logged: `console.error` calls in routes print names only (VERIFIED in `guard.ts`). The header name is defined here and in BACKEND 13.1, not in API_CONTRACTS (RC-16). This helper and the token are deleted when the COLLAB bearer token exists (BE-1). |
| **Permissions** | Class table above. `/api/status` and `/api/openapi.json` answer anyone. |
| **Unit tests** | `access.test.ts`: (1) right token passes; (2) missing, wrong and empty token return the same 401 body bytes; (3) unset `IYNK_SERVER_TOKEN` returns 401 even for an empty header; (4) a 31-character token in `readEnv` is an issue and closes the route. `env.test.ts`: the four new variables, the `featuresOf` rules (`ai` false without the switch even with a key). `http.test.ts`: `unauthorized` and `featureDisabled` shapes. `routes.test.ts` (`// @vitest-environment node`): walks `src/app/api` with `fs.readdirSync`, collects `route.ts` paths, expects the set equal to `Object.keys(ROUTE_CLASSES)` (message names the unlisted or missing file), and expects every value to be a known class. |
| **Route tests this change would break** | `featuresOf` now needs the switches, so a route test that sets only `META_API_KEY` or `SERPAPI_KEY` sees the feature off and gets 503 or 501. This card therefore edits the `load()` helper of `src/app/api/ai/chat/route.test.ts`, `ai/transcribe/route.test.ts`, `ai/translate/route.test.ts` and `src/app/api/status/route.test.ts` to stub `IYNK_AI_ENABLE=1` and `IYNK_SEARCH_ENABLE=1` (chat also uses `SERPAPI_KEY`) before the per-test variables, and `IYNK_TRUST_PROXY=1` so their incrementing `x-real-ip` buckets keep working after T-B0-24 (the current `clientIp` ignores the variable, so this is harmless now). The search route tests mock `@/lib/server/env` with fixed `features` and are edited in T-B0-23. |
| **Comment fix** | `http.ts:124-127`: reword the `clientIp` doc comment to "The caller's IP as the proxy in front of the app reports it. Without a proxy these headers are only a rate-limit hint." so no platform name is left there; T-B0-24 rewrites the function and the comment again. |
| **Acceptance** | Given a new file `src/app/api/x/route.ts`, When `routes.test.ts` runs, Then it fails and names `x/route.ts`. Given 12 route files, Then it passes. |
| **Observability, release blockers** | The test message / a route file with no class. |
| **Definition of done** | Three source files, three new or edited test files plus the four route tests above; dated line in local `docs/DECISIONS.md`. |
| **Verify commands** | `TL`; `V src/app/api src/lib/server`; `git grep -niE "vercel" -- src ':!src/app/[lang]/about/page.tsx'` prints nothing. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-23 applies `requireServerToken` and `featureDisabled`. T-B0-24 reads `env.IYNK_TRUST_PROXY`. B1 reads `ROUTE_CLASSES` to add `needs-user-key`. |

---

### T-B0-28. Telemetry leftovers: drop dead exports and constants

| Field | Content |
|---|---|
| **Identity** | Id T-B0-28. Subsystem client telemetry. Phase B0. Priority P1 (no ghosts, CLAUDE.md step 0). Dependencies T-B0-08, T-B0-16, T-B0-17. Status not started. Group G6. Source files: 5 (`telemetry/client.ts`, `kinds.ts`, `index.ts`, `realtime/provider.tsx`, `sound/react.ts`). |
| **Problem** | After T-B0-08, T-B0-16 and T-B0-17 the shims `flush`, `onFlushed`, `telemetrySession`, `setTelemetryContext` have no useful caller, and `kinds.ts` holds server-only constants (`MAX_EVENTS_PER_BATCH`, `MAX_DATA_BYTES`, `MAX_BODY_BYTES`, `SESSION_PATTERN`, `ROOM_PATTERN`, `ITEM_PATTERN`, `COURSE_PATTERN`, `LAP_MS`, `NAME_MAX`, `TelemetryBatch`) for a route that is deleted. |
| **Target user** | A contributor. |
| **User story** | As a contributor, every export is used. |
| **Expected behaviour** | `index.ts` exports `track`, `tally`, `TELEMETRY_KINDS` and the kind and payload types only. |
| **Existing files** | `src/lib/telemetry/index.ts:1-3`; `client.ts` shims; `kinds.ts:33-57`; `src/lib/realtime/provider.tsx:8,171,185` (`setTelemetryContext({ room })` and its reset); `src/lib/sound/react.ts:9,67-68` (`setTelemetryContext({ item })` and its cleanup); `src/lib/sound/react.test.tsx:19` mock. |
| **Method** | For each export run `git grep -n "<name>" -- src`; delete it only when the only hits are its definition and tests. Keep `KnownPayloads` and `TallyKind` while `tally` is typed by them. Do not prune event kinds here; B1 decides which kinds the local log keeps. |
| **Not applicable** | Data model, schemas, API, algorithms, state transitions, validation, permissions, performance, migration. |
| **Unit tests** | `client.test.ts` keeps the no-network cases and drops shim cases; `react.test.tsx` mock loses `setTelemetryContext`. |
| **Acceptance** | Given `git grep -n "setTelemetryContext\|telemetrySession\|onFlushed\|MAX_BODY_BYTES\|ROOM_PATTERN\|LAP_MS" -- src/lib/telemetry src/lib/realtime src/lib/sound`, Then nothing. `src/lib/server/mcp/transport.ts:31,118` defines and uses its own, different `MAX_BODY_BYTES` (256 KB) and stays, so the grep is scoped away from it. |
| **Observability, release blockers** | None / typecheck. |
| **Definition of done** | Five files, two tests. |
| **Verify commands** | `TL`; `V src/lib/telemetry src/lib/sound src/lib/realtime`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | B1's local log (F-016) builds on `track` and `tally`. |

---

### T-B0-23. Apply the classes: server token (401) and `feature_disabled` (501) on the kept routes

| Field | Content |
|---|---|
| **Identity** | Id T-B0-23. Subsystem server. Phase B0. Priority P0 (F-004, R-007, R-008 switches, RC-16, RC-28). Dependencies T-B0-09, T-B0-14, T-B0-22. Status not started. Group G7. Source files: 5 (`server/ai/guard.ts`, `server/search/route.ts`, `app/api/mcp/route.ts`, `app/api/mcp/tools/[name]/route.ts`, `app/api/openapi.json/route.ts`). |
| **Problem** | The AI, search and MCP routes answer anyone: `guardAi` checks origin, feature and rate only (`guard.ts:17-26`), `handleSearch` the same (`search/route.ts:34-37`), and the MCP route has no check (`api/mcp/route.ts`, `tools/[name]/route.ts`). A public repo plus a public URL must not mean a free model endpoint (F-004). |
| **Target user** | Amar leaving a server running. |
| **User story** | As Amar, a stranger with curl gets 401 on every route that spends money (R-007). |
| **Expected behaviour** | Order of checks for `ai/*`: origin (403) then server token (401, empty detail) then module off, or on without its key (501 `feature_disabled` for both, RC-28 and API_CONTRACTS section 4.2 501 row; `not_configured` 503 is retired) then per-IP limit then hourly budget. `search/*` the same with `IYNK_SEARCH_ENABLE`. `POST /api/mcp` and `POST /api/mcp/tools/[name]` need the token (401). `GET /api/mcp` and `DELETE` keep their 405. `/api/status` and `/api/openapi.json` answer anyone. The three route files drop their `OPTIONS` handlers (Next adds a plain `OPTIONS` itself, DOCUMENTED, `route.md:39`). |
| **Existing files** | `src/lib/server/ai/guard.ts:17-26` (`guardAi`); `src/lib/server/search/route.ts:34-37` (`handleSearch` first lines); `src/app/api/mcp/route.ts:6-8` (comment and `maxDuration = 60`, both about the planner), `:10-12` (`POST`), `:21-23` (`OPTIONS`); `src/app/api/mcp/tools/[name]/route.ts:5-7` (same comment and `maxDuration`), `:9-12` (`POST`), `:14-16` (`OPTIONS`); `src/app/api/openapi.json/route.ts:9-17` (`withCors`, `OPTIONS`). |
| **Edits** | `guardAi`: `const refused = checkOrigin(req) ?? requireServerToken(req); if (refused) return refused; if (!features[feature]) return featureDisabled(feature === "ai" ? "The AI partner" : `AI ${feature}`)`, then the limits as now (`features` already folds the switch and the key, T-B0-22, so one check covers both states). `handleSearch`: `checkOrigin(req) ?? requireServerToken(req)` first, then `if (!features.search) return featureDisabled("Search")`, then `checkRateLimit`, so an unauthenticated caller never touches the limiter. MCP routes: `const denied = requireServerToken(req); if (denied) return denied;` before `handleMcpPost(req)` and `handleToolPost(req, name)`; delete `maxDuration` and its comment; delete `OPTIONS`. `openapi.json/route.ts`: return `json(openApiDocument(...), { headers })` without `withCors`, delete `OPTIONS`. |
| **API contract** | 401 body `{"error":{"code":"unauthorized","message":""}}`, identical for a missing and a wrong token. 501 body `{"error":{"code":"feature_disabled","message":"... is turned off on this server."}}`. Header `X-Iynk-Server-Token`. Both bodies are new entries to record in the openapi trailer only when the server package defines them (RC-16: the header is B0 only and is not part of the v1 contract). |
| **Edge cases** | `notConfigured` in `http.ts` has no caller after this card; T-B0-24 (which owns `http.ts` in G7) deletes it. The app's own browser code cannot send the header until B1's Settings panel: AI and search are unusable from the UI in B0 unless the operator sets the token and a proxy adds it (accepted, roadmap R3, "For Amar" 1). CORS headers still ride on MCP tool and transport POST responses until T-B0-29 removes the helpers; the tests stop asserting them here and T-B0-29 asserts their absence. `scripts/smoke-*.mjs` call providers directly and are unaffected. |
| **Permissions** | The class table in `access.ts`. |
| **Unit tests** | Every test that reaches these routes changes, because every POST needs the token now. `src/app/api/ai/chat/route.test.ts`, `src/app/api/ai/transcribe/route.test.ts`, `src/app/api/ai/translate/route.test.ts`: send `x-iynk-server-token` (the `load()` helper stubs `IYNK_SERVER_TOKEN` to a 40-character string; `IYNK_AI_ENABLE` and `IYNK_TRUST_PROXY` are already stubbed by T-B0-22); add (1) no header gives 401 with empty message, (2) wrong header gives the same bytes, (3) switch off with a good token gives 501 `feature_disabled`, (4) switch on and key missing gives 501 `feature_disabled`; the existing 503 `not_configured` cases (`chat/route.test.ts:58-62`, `transcribe/route.test.ts:89`) become the 501 case. `src/app/api/search/routes.test.ts`: its env mock gains `IYNK_SERVER_TOKEN` and `IYNK_TRUST_PROXY: true`; requests send the header; the same four cases for the search routes; `:94-98` (503 `not_configured` when search is off) becomes 501 `feature_disabled`. `src/lib/server/mcp/openapi.test.ts`, `transport.test.ts`, `e2e.test.ts` (all three mock `@/lib/server/env` with `env: { NEXT_PUBLIC_SITE_URL }` only, so without a token every POST would return 401): add `IYNK_SERVER_TOKEN` (40 characters) and `IYNK_TRUST_PROXY: true` to the env mock and drop the untyped `image` and `db` keys from the `features` literal; send the header on every request (`e2e.test.ts`: `new StreamableHTTPClientTransport(url, { requestInit: { headers: { "x-iynk-server-token": TOKEN } } })`); remove the `OPTIONS` imports (`openapi.test.ts:4`, `transport.test.ts:3`) and delete the `access-control-allow-origin` equals `*` assertions (`openapi.test.ts:27,55`, `transport.test.ts:32`) and the preflight cases (`openapi.test.ts:80-82`, `transport.test.ts:159-161`). T-B0-29 adds the absence checks. New `src/app/api/mcp/routes.test.ts`: `POST /api/mcp` and `POST /api/mcp/tools/search_catalog` give 401 without the token and 200-class answers with it; `GET /api/openapi.json` answers 200 with no `access-control-allow-origin` header (the route file no longer adds it). |
| **Playwright** | None. |
| **Acceptance** | Given no token, When curl-style `POST /api/ai/chat`, `POST /api/search/web`, `POST /api/mcp` are sent, Then each answers 401 with an empty message. Given the token and `IYNK_AI_ENABLE` unset, or set with no provider key, Then `/api/ai/chat` answers 501 `feature_disabled` (never 503 `not_configured`). Given `/api/status`, Then it answers without a token. |
| **Observability** | The 401 and 501 counts are visible in route logs only through the platform; no new logging (the token is never logged). |
| **Release blockers** | Different bytes for missing and wrong tokens; the limiter reached before the token check. |
| **Definition of done** | Five source files, eight test files (chat, transcribe, translate, search routes, transport, openapi, e2e, and the new MCP routes test); dated line in local `docs/DECISIONS.md`. |
| **Verify commands** | `TL`; `V src/app/api src/lib/server`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-29 removes the CORS helpers. B1 replaces the token with the person's own key header (RC-27). |

---

### T-B0-24. `IYNK_TRUST_PROXY` gates forwarded headers; no shared `unknown` key

| Field | Content |
|---|---|
| **Identity** | Id T-B0-24. Subsystem server. Phase B0. Priority P0 (F-003 slice, R-008, SECURITY_BASELINE C7). Dependencies T-B0-22. Status not started. Group G7. Source files: 1 (`src/lib/server/http.ts`). |
| **Problem** | `clientIp` reads `x-real-ip`, else the first `x-forwarded-for` value, else `cf-connecting-ip` (`http.ts:128-132`). The first `x-forwarded-for` value is client-controlled on any host that appends, so a caller can pick a fresh limiter key per request (C7). A request with no header maps to the shared key `unknown`. `checkOrigin` trusts `x-forwarded-host` the same way (`http.ts:141`). |
| **Target user** | Amar. |
| **User story** | As Amar, a caller cannot dodge the rate limit by writing a header (R-008). |
| **Expected behaviour** | With `IYNK_TRUST_PROXY=0` (default) forwarded headers are ignored and the key is `direct`. With `1`, one trusted proxy is assumed: the last `x-forwarded-for` entry, else `x-real-ip`, else `cf-connecting-ip`, accepted only when it is a valid IP address. Anything else is `direct`. |
| **Existing files** | `src/lib/server/http.ts:124-132` (`clientIp`, doc comment names Vercel), `:134-148` (`checkOrigin`); `src/lib/server/ratelimit.ts:39-41` (`checkRateLimit` builds `${bucket}:${clientIp(req)}`, no change needed); `src/lib/server/http.test.ts:119-126`; `src/lib/server/ratelimit.test.ts`. |
| **Modules and signatures** | `export function clientIp(req: Request, trustProxy: boolean = env.IYNK_TRUST_PROXY): string` using `isIP` from `node:net`; `checkOrigin(req: Request, trustProxy: boolean = env.IYNK_TRUST_PROXY)` reads `x-forwarded-host` only when `trustProxy` is true. |
| **Decision and evidence** | A Next 16 route handler has no socket address: `NextRequest.ip` was removed in v15 (`next-request.md:123`, DOCUMENTED). So without a trusted proxy every caller shares the one key `direct`. That is deliberate: a shared bucket cannot be bypassed by a header, and callers who matter hold the server token (T-B0-23). BACKEND 9.1 uses the socket address; the server package (B5) has it, a Next route does not. The word `unknown` is gone, and the doc comment says what `direct` means. Open question 2. |
| **Edge cases** | IPv6 is accepted as given (no /64 reduction in B0). A proxy that appends to `x-forwarded-for` and also forwards a client-sent `x-real-ip` makes `1` unsafe if `x-forwarded-for` is absent: the doc comment says to set `1` only behind a proxy that overwrites the headers it names. `aiUser(req)` (`guard.ts`) hashes the key into Meta's safety id: all direct callers share one id (acceptable). |
| **Not applicable** | Data model, schemas, API, state transitions, permissions, performance, migration. |
| **Unit tests** | `http.test.ts` (replace the `clientIp` case): with `trustProxy=false` every header combination returns `direct`; with `true`: `x-forwarded-for: "1.1.1.1, 2.2.2.2"` returns `2.2.2.2`; a lone `x-real-ip: 3.3.3.3` returns it; a value that is not an IP (`"evil, <script>"`) returns `direct`; no headers returns `direct`; `checkOrigin` ignores `x-forwarded-host` when false and honours it when true. `ratelimit.test.ts`: two requests with different `x-forwarded-for` values and the default setting share one bucket (the 3rd call is limited). |
| **Route tests that depend on per-test IP headers** | With `IYNK_TRUST_PROXY` unset every caller shares the key `direct`, so a route test that isolates its rate-limit bucket by sending an incrementing `x-real-ip` or `x-forwarded-for` would start returning 429. VERIFIED by `grep -rlE "x-forwarded-for\|x-real-ip" src`: `ai/chat`, `ai/transcribe`, `ai/translate`, `search/routes.test.ts`, `status/route.test.ts`, `mcp/openapi.test.ts`, `mcp/transport.test.ts`, plus `http.test.ts` and `ratelimit.test.ts` (the other hits are in files deleted earlier). They keep working because they set `IYNK_TRUST_PROXY=1`: stubEnv-based files get it in T-B0-22, env-mock files in T-B0-23 (to keep G7 disjoint, this card edits none of them). Each counter value stays a valid IPv4 address (the counters wrap below 256). This card only proves them with the wider verify command. |
| **Dead helper** | `notConfigured` has no caller after T-B0-23; delete it from `http.ts` and its case from `http.test.ts` here. |
| **Acceptance** | Given default settings, When 21 requests arrive with 21 different `x-forwarded-for` values at a route limited to 20 a minute, Then the 21st is 429. |
| **Observability, release blockers** | None / the string `unknown` left in `clientIp`. |
| **Definition of done** | One source file (`notConfigured` also deleted), two test files; dated line in local `docs/DECISIONS.md`. |
| **Verify commands** | `TL`; `V src/app/api src/lib/server` (the wider path runs the seven route tests above); `git grep -n '"unknown"\|notConfigured' -- src/lib/server/http.ts` prints nothing. |
| **Rollback** | `git revert`. |
| **Later tasks need** | B5's server package implements 9.1 with the socket address. |

---

### T-B0-27. Strike removed-feature lines from README

| Field | Content |
|---|---|
| **Identity** | Id T-B0-27. Subsystem docs. Phase B0. Priority P0 (needed for the 4.6 grep; the rewrite is B1). Dependencies T-B0-12, 13, 15, 16, 17, 18. Status not started. Group G7. Source files: 1 (`README.md`). |
| **Problem** | `README.md` is in the 4.6 grep and advertises Build Night, Build Stories, Proof of Build and the leaderboards. |
| **Target user** | A visitor reading the repo. |
| **User story** | As a visitor, the README does not describe features that are gone. |
| **Expected behaviour** | Only lines naming removed features change; the README still renders (the mermaid block stays valid). |
| **Existing files** | `README.md:55-56` (Build Night, Build Buddies, Build Stories bullet), `:64-66` (Proof of Build bullet), `:67-68` (Leaderboards bullet), `:76` and `:82` (diagram edge `/api/solana` and the `SOL` node), `:90` (server bullet naming Solana), `:95` (Chain bullet), `:112,115,117` (env table rows for the image, database and Solana variables), `:133` (`cd solana && npm test`), `:142` (`src/lib` list ends with "Solana"), `:146` (`solana` row). Line numbers are from `git grep -n` in this step and shift by the edit. |
| **Edits** | Delete the Solana, Proof of Build, Leaderboards and Chain bullets, the `SOL` node and its edge, the three env rows and the `solana` rows; reword the Build Night/Build Buddies/Build Stories bullet to the surviving part (Build Buddies stays as a name until COLLAB; remove the stories and night words); remove "Solana" from the `src/lib` list. Do not rewrite the page, add sections or change tone (B1, T-B1 README). |
| **Not applicable** | Everything but the file: modules, data, schemas, API, algorithms, state, validation, permissions, performance, migration. |
| **Acceptance** | Given `git grep -niE "solana\|passport\|Build Night\|Build Story\|Proof of Build\|api/buddies\|api/leaderboard\|api/live" -- README.md`, Then nothing. Given the mermaid block, Then it parses (render it with `npx --yes @mermaid-js/mermaid-cli` is not required; check by eye that every edge names a defined node). |
| **Observability, release blockers** | None / a broken mermaid block. |
| **Definition of done** | One file. |
| **Verify commands** | The grep above; `git diff --stat README.md` shows only deletions and the reworded bullet. |
| **Rollback** | `git revert`. |
| **Later tasks need** | B1 rewrites the README. |

---

### T-B0-29. Remove CORS `*` from MCP and OpenAPI; drop the image smoke call

| Field | Content |
|---|---|
| **Identity** | Id T-B0-29. Subsystem server and tooling. Phase B0. Priority P0 (R-007, SECURITY_BASELINE M1). Dependencies T-B0-23. Status not started. Group G8. Source files: 4 (`mcp/http.ts`, `mcp/transport.ts`, `mcp/rest.ts`, `scripts/smoke-ai.mjs`). |
| **Problem** | Three routes send `Access-Control-Allow-Origin: *` (`mcp/http.ts:6-17`, applied at `transport.ts:144,152,155` and `rest.ts:28,31`). After T-B0-23 the routes no longer import the helpers, but the POST responses still carry the header. `scripts/smoke-ai.mjs` still exercises the removed image endpoint of the provider. |
| **Target user** | Amar. |
| **User story** | As Amar, no web page on another origin can read my MCP or OpenAPI answers (R-007). |
| **Expected behaviour** | No response from `/api/mcp`, `/api/mcp/tools/*` or `/api/openapi.json` has an `access-control-*` header. Browsers keep the existing DNS-rebinding guard `originAllowed` (`http.ts:34-39`). |
| **Existing files** | `src/lib/server/mcp/http.ts:6-24` (`CORS_HEADERS`, `withCors`), `:26-39` (`LOOPBACK`, `originAllowed`, stay); `transport.ts:21` (import), `:141-155` (`MCP_METHODS`, `handleMcpPost`, `mcpMethodNotAllowed`, `mcpPreflight`); `rest.ts:8,13,28,31` (`METHODS`, `handleToolPost`, `toolPreflight`); `scripts/smoke-ai.mjs` (image call and the `--no-image` flag). |
| **Edits** | `http.ts`: delete `CORS_HEADERS` and `withCors`. `transport.ts` and `rest.ts`: return responses unwrapped; delete `mcpPreflight`, `toolPreflight`, `MCP_METHODS`, `METHODS`. `smoke-ai.mjs`: delete the image request and the flag (the agent reads the file's structure; it does not run it, since it reads `.env.local`). |
| **Not applicable** | Data model, schemas, algorithms, state transitions, validation, permissions, performance, migration. |
| **Unit tests** | `transport.test.ts`, `openapi.test.ts` and a `rest` test: responses (POST on `/api/mcp`, POST on `/api/mcp/tools/*`, GET `/api/openapi.json`) carry no `access-control-*` header (T-B0-23 removed the `*` and preflight assertions and the `OPTIONS` imports from these files; this task adds the absence checks); an `OPTIONS` request to the route gets Next's default answer (checked in the route test of T-B0-23). `originAllowed` cases stay. |
| **Acceptance** | Given `POST /api/mcp` with the token, Then the response headers contain no `access-control-` key. Given `git grep -n "withCors\|Preflight\|access-control" -- src scripts`, Then nothing. |
| **Observability, release blockers** | None / any `access-control-*` header left. |
| **Definition of done** | Four files; dated line in local `docs/DECISIONS.md`. |
| **Verify commands** | `TL`; `V src/lib/server/mcp src/app/api`; the grep above. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Agents reach MCP from other machines with the token header, not from browser pages (B14). |

---

### T-B0-31. Slow-test report script and the `.only` guard in `scripts/ci-local.sh` (TS-2)

| Field | Content |
|---|---|
| **Identity** | Id T-B0-31. Subsystem tooling. Phase B0. Priority P1 (R-001, R-002; TEST_STRATEGY 4.2, 12.4 steps 6 and 10, section 14 TS-2). Dependencies T-B0-06. Status not started. Group G8. Source files: 2 (`scripts/slow-tests.mjs`, `scripts/ci-local.sh`). |
| **Problem** | TEST_STRATEGY 12.4 step 6 runs `node scripts/slow-tests.mjs` and 4.2 says a test over 20 s is a fix task. The script exists nowhere (`ls scripts` lists no such file, VERIFIED). TEST_STRATEGY 12.4 step 10 greps for `.only(`; `ci-local.sh` has no such step, and `playwright.config.ts:19` sets `forbidOnly` only for Playwright, not for Vitest. T-B0-06 lists ten steps. |
| **Target user** | Contributor and the phase gate. |
| **User story** | As a contributor, I run one command after the unit suite and get the list of tests over 20 s, and CI fails if someone leaves a focused test in. |
| **Expected behaviour** | `node scripts/slow-tests.mjs <report.json> [--limit-ms 20000]` reads a Vitest JSON report, prints one line per test over the limit (`<seconds> s  <file>  <full name>`), slowest first, and exits 1 if any; otherwise prints `no test over 20 s` and exits 0. A missing or unreadable file exits 2 with the path. `ci-local.sh` gains step `no-only` between `lint` and `relay-deps`: `! git grep -nE "[.]only[(]" --untracked -- src figures scripts e2e server`, so any hit prints and fails. It also checks `python3 --version` first (TEST_STRATEGY 3.4 table, "Python" row) and exits 2 with `python3 is required (figure tests run figures/tools/cfbuild.py)`. |
| **Existing files** | `scripts/ci-local.sh` and `scripts/ci-local.test.mjs` (T-B0-06); `figures/engine/testkit.mjs:18` (the `python3 -I` call); `node_modules/vitest/dist/chunks/index.DpLw24bj.js:17897-17915` (JSON reporter; each `assertionResults` entry has `fullName`, `status` and `duration` in ms, VERIFIED); `vitest.config.mts:12` (`scripts/**/*.test.{js,mjs,ts}` is included). |
| **New files** | `scripts/slow-tests.mjs`; `scripts/slow-tests.test.mjs`. |
| **Modules and signatures** | `export function slowTests(report, limitMs = 20000): { file: string, name: string, ms: number }[]` (pure; skips entries with no `duration` or status `skipped`); a `main()` guarded by `import.meta.url === pathToFileURL(process.argv[1]).href` so the test can import the function. |
| **Why the grep is written `[.]only[(]`** | A literal `.only(` in `ci-local.sh` or its test would match its own grep. The bracket form does not match its own text. `git grep` skips `node_modules` and ignored files; `--untracked` adds new files so the negative test can use a fixture. The pattern does not match `--only` (a flag of `ci-local.sh`). Run on the current tree it prints nothing (VERIFIED in this step, exit 1 from `git grep`). |
| **Data model, schemas, API** | Not applicable. |
| **Edge cases** | `duration` is undefined for skipped tests: ignore them. A describe-level timeout is not a test duration: only `assertionResults` are read. The default limit is a constant `SLOW_MS = 20_000` in the script, TEST_STRATEGY 4.2's number; the gate does not edit it (D-014). A `.only(` in a string inside a test fixture counts as a hit: tests build the word at run time. |
| **Edit to `ci-local.sh`** | Add `no-only` to the step table, `--list` output and the usage header; add the Python check beside the Node check. T-B0-06's `CI_SKIP_AUDIT` and `--skip` logic stay as they are. The script still names none of the removed-feature words (residual rule, section 1). |
| **Unit tests** | `scripts/slow-tests.test.mjs`: (1) `slowTests` returns only entries over the limit, slowest first; (2) skipped and duration-less entries are ignored; (3) a report written to the OS temp directory with one 21,000 ms test makes the CLI exit 1 and print its name; (4) a report with none exits 0; (5) a missing path exits 2. In `scripts/ci-local.test.mjs`: test 1 now expects eleven names in order (`content`, `typecheck`, `lint`, `no-only`, `relay-deps`, `unit`, `relay`, `build`, `e2e`, `secrets`, `audit`); new test 6 runs `bash scripts/ci-local.sh --only no-only` and expects exit 0; new test 7 writes `scripts/.only-fixture.tmp.mjs` holding the word built as `["it", "only"].join(".") + "()"`, runs the same command, expects exit 1 and the fixture name in the output, and deletes the fixture in `finally`. |
| **Acceptance** | Given the tree after G7, When `bash scripts/ci-local.sh --list` runs, Then eleven steps print with `no-only` fourth. Given a focused test is added, When `bash scripts/ci-local.sh --only no-only` runs, Then it exits 1 and prints the file and line. Given a report with a 25 s test, When `node scripts/slow-tests.mjs report.json` runs, Then it exits 1 and names the test. |
| **Performance** | `no-only` takes under 1 s (ESTIMATED; `git grep` over the 1,189 tracked files under those five directories, VERIFIED count). `slow-tests.mjs` reads one JSON file. |
| **Observability** | The printed lines and the `ci-local.sh` result table. |
| **Release blockers** | A literal focused-test token in either script or test file (it would fail its own step); the script editing the 20 s limit from an argument default in CI. |
| **Definition of done** | Two source files and two test files committed; `ci-local.test.mjs` passes with eleven steps. |
| **Verify commands** | `TL`; `V scripts/ci-local.test.mjs scripts/slow-tests.test.mjs`; `bash -n scripts/ci-local.sh`; `bash scripts/ci-local.sh --list`; `bash scripts/ci-local.sh --only no-only`; `git grep -niE "solana|vultr|timescale" -- scripts/ci-local.sh scripts/ci-local.test.mjs scripts/slow-tests.mjs scripts/slow-tests.test.mjs` prints nothing. |
| **Documentation** | Header comment in each script. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-30 steps 8 and 13. Later phases run the same two commands at their gates (TEST_STRATEGY 12.4). |

---

### T-B0-32. One `randomTestPort()` that never draws 43117, used by the relay tests (TS-1)

| Field | Content |
|---|---|
| **Identity** | Id T-B0-32. Subsystem tests. Phase B0. Priority P1 (R-002, R-003; TEST_STRATEGY 3.3 and section 14 TS-1). Dependencies T-B0-05. Status not started. Group G8. Source files: 4 (`src/test-support/ports.ts`, `server/realtime/test/helpers.js`, `server/realtime/test/load.js`, and the edited `src/lib/realtime/relay.integration.test.ts`); TEST_STRATEGY TS-1 names three, the fourth is a one-line find from this step. |
| **Problem** | Port 43117 is off limits. Three places draw `40000 + random(10000)`, which is 43117 once in 10,000 draws: `src/lib/realtime/relay.integration.test.ts:73`, `server/realtime/test/helpers.js:24` (retries only on `EADDRINUSE`) and `server/realtime/test/load.js:22` (not in TEST_STRATEGY; it already imports `helpers.js`). `playwright.config.ts:5` also draws; T-B0-03 owns that fix. `src/lib/server/db/timescale.test.ts:35` has a fourth draw and T-B0-17 deletes it. |
| **Target user** | Contributor and agents running tests on the build machine. |
| **User story** | As an agent, my relay test never binds a port the rules forbid, and a taken port makes it try again, not fail. |
| **Expected behaviour** | `randomTestPort(random = Math.random): number` returns an integer in 40000 to 49999 and redraws while the value is in `RESERVED_PORTS` (`43117`). Port 3000 is outside the range, so it needs no entry. `relay.integration.test.ts` takes its port from the helper and, if the child exits before `/healthz` answers (bind failure), draws again, up to 3 attempts; it accepts a health answer only while the child is still running, so another process on that port cannot pass for the relay. `helpers.js` and `load.js` use their own copy of the function (below). |
| **Why two copies** | `server/realtime` is a separate package (`server/realtime/package.json`) and `deploy/realtime/Dockerfile:10-13` copies only `package.json`, `server.js` and `src` from it. A file there cannot import `src/test-support/ports.ts`. So `helpers.js` exports the same function in plain JavaScript, `load.js` imports it from `./helpers.js`, and `ports.test.ts` fails if the two reserved lists differ (it reads `helpers.js` as text and compares the number list). One value, checked in two places, is the cheapest way to keep one rule. |
| **Existing files** | The three draw sites above; `server/realtime/test/helpers.js:18-32` (`startRelay` loop of 30 attempts, kept); `src/lib/realtime/relay.integration.test.ts:16-23,73-95` (T-B0-05 changed lines 16-23 and 114). |
| **New files** | `src/test-support/ports.ts`; `src/test-support/ports.test.ts`; `server/realtime/test/ports.test.js`. |
| **Modules and signatures** | `export const RESERVED_PORTS: ReadonlySet<number>`; `export function randomTestPort(random?: () => number): number` in `ports.ts`. Same names in `helpers.js` with JSDoc types. |
| **Data model, schemas, API** | Not applicable. |
| **Edge cases** | A stub `random` that returns the 43117 slot forever would loop; the tests give a sequence (first value the reserved slot, second a normal one). The slot value is `(3117 + 0.5) / 10000` to avoid float rounding. The helper does not check that the port is free; the callers' retry does. |
| **Unit tests** | `ports.test.ts`: (1) the reserved slot is skipped and the next draw is used; (2) 2,000 real draws stay in 40000 to 49999 and never equal 43117; (3) the `RESERVED_PORTS` numbers equal the numbers in `helpers.js`. `server/realtime/test/ports.test.js` (node test runner, runs under `npm test --prefix server/realtime`): same cases 1 and 2 against `helpers.js`. |
| **Acceptance** | Given `grep -rnE "40_?000 \+ Math\.floor" src server/realtime/test`, Then nothing outside `ports.ts` and `helpers.js`. Given the relay tests run, Then 5 vitest relay tests and the relay package tests pass. |
| **Observability** | None. |
| **Release blockers** | A draw of port 43117 left in any test file that exists after B0; the relay test treating a health answer from a foreign process as success. |
| **Definition of done** | Helper, three call sites, three test files. |
| **Verify commands** | `TL`; `V src/test-support src/lib/realtime`; `CI=true npx vitest run src/lib/realtime/relay.integration.test.ts`; `npm test --prefix server/realtime`; `npm run typecheck --prefix server/realtime`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-B0-30 step 8 runs both suites through `ci-local.sh`. B6 relay and server tests reuse `randomTestPort`. |

---

### T-B0-30. Phase exit gate (no file changes)

| Field | Content |
|---|---|
| **Identity** | Id T-B0-30. Subsystem verification. Phase B0. Priority P0. Dependencies all other B0 tasks, including T-B0-31 (slow-test script, `no-only` step) and T-B0-32 (port draw). Status not started. Group G9. Source files: 0. |
| **Purpose** | Prove the phase exit criteria on the finished `build/v1` and report to the orchestrator. The orchestrator stops for Amar's OK and then tags `phase-B0`. No commit unless a proof fails and a fix task is opened. |
| **Preconditions** | Clean tree on `build/v1` (`git status --short` empty). No other process uses the machine heavily except the `LOAD` loops. |
| **Steps and commands** | 1. `npm run content:check && npm run typecheck && npm run lint`. 2. Keyless full check: `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_REALTIME_URL= IYNK_SERVER_TOKEN= IYNK_AI_ENABLE= IYNK_SEARCH_ENABLE= npm run check`. 3. `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_REALTIME_URL= IYNK_SERVER_TOKEN= IYNK_AI_ENABLE= IYNK_SEARCH_ENABLE= NEXT_DIST_DIR=.next-b0-gate npm run build` exits 0 (BUILD ok). 4. LOAD three times: save the block below as `/Users/amar/iynk-master-plan-scratch/buildplan/B0/load3.sh` and run `bash` on it; it must print `LOAD 1 ok`, `LOAD 2 ok`, `LOAD 3 ok`. 5. Residual grep (`RESIDUAL` in section 1, unmodified, no excludes) prints nothing. A hit in a test or script means that file broke the residual rule: fix it with a run-time-built string, not an exclude. 6. `npm audit --omit=dev` reports `high` 0 and `critical` 0. 7. `npm ls @solana/web3.js @coral-xyz/anchor` finds neither. 8. `bash scripts/ci-local.sh` exits 0 (all eleven steps, audit online; the `no-only` step is the TEST_STRATEGY 12.4 step 10 `.only` check). 9. `node scripts/secret-scan.mjs --history` exits 0. 10. Route count: `find src/app/api -name route.ts \| wc -l` prints 12 and `npx vitest run src/app/api/routes.test.ts` passes. 11. Start `next start` on a random port other than 43117 from the gate build and run `curl -s -o /dev/null -w "%{http_code}\n"` against `/api/ai/chat` (POST, no token, expect 401), `/api/status` (200), `/api/buddies` (404), `/en/passport` (404); `curl -sI` against `/en` shows the four headers and no `x-powered-by`. 12. `git log --format='%an <%ae>%n%b' build/v1 ^main` shows only Amar Kushwaha and no `Co-Authored-By` or "Generated with" line. 13. Slow tests (TEST_STRATEGY 12.4 step 6): `npx vitest run --reporter=json --outputFile=/Users/amar/iynk-master-plan-scratch/buildplan/B0/vitest.json && node scripts/slow-tests.mjs /Users/amar/iynk-master-plan-scratch/buildplan/B0/vitest.json` exits 0, meaning no test over 20 s. A hit is a fix task, not a note (TEST_STRATEGY 4.2). 14. Accessibility (TEST_STRATEGY 12.4 step 8): B0 runs only the axe calls already inside the existing specs, through step 8 above. There is no `a11y-routes` clause at B0 (see "Cross-review fixes", item 1). |
| **LOAD block** | `#!/usr/bin/env bash` / `set -u` / `pids=()` / `for i in $(seq 14); do node -e "const e=Date.now()+2400000;while(Date.now()<e);" & pids+=($!); done` / `trap 'kill "${pids[@]}" 2>/dev/null' EXIT` / `for n in 1 2 3; do npx vitest run \|\| { echo "LOAD $n failed"; exit 1; }; echo "LOAD $n ok"; done`. (One line per bullet; the file is created in scratch, not in the repo.) |
| **Evidence to return** | A table: step, command, exit code, key numbers (tests passed, e2e passed, audit counts, seconds). Include the load average before and after the LOAD runs (`uptime`). |
| **Pass rule** | Every step passes. A failed step opens a fix task (new id, same rules) in the right group; do not edit gate thresholds (D-014). |
| **Acceptance** | Given the tree after G8, When all fourteen steps run, Then all fourteen pass and the orchestrator can ask Amar for his OK. |
| **Observability** | The evidence table is the record. |
| **Release blockers** | Any failed step. |
| **Definition of done** | Evidence table returned; nothing pushed; nothing deployed. |
| **Rollback** | `git reset --hard main` on `build/v1`, or revert per task (section 2.8 of the roadmap). |
| **Later tasks need** | B1 starts from the `phase-B0` tag. |

## 8. Exit check against the phase goal

| Goal item | Task |
|---|---|
| Stable tests | 01, 02, 03, 04, 05, 25 (and 26), 31 (slow-test report, `.only` guard), 32 (no draw of port 43117) |
| CI file | 06, 07, 31 |
| D-016 removals: Solana | 09, 10, 11, 12, 18 |
| D-016 removals: Build Stories | 13, 14 |
| D-016 removals: Build Night | 09, 15 |
| D-016 removals: public pool, board, counter | 16, 17 |
| D-016 removals: Postgres | 17, 18 |
| Telemetry local-only and off | 08, 17, 28 |
| Security headers | 21 |
| Closed and classed routes | 22, 23, 29 |
| Rate-limit keys | 24 |
| Interpreter caps | 25 |
| Vercel and Vultr gone | 20, 18 |
| Honest README lines | 27 |
| Exit proof | 30 |

Requirements covered: R-001 (06, 05, 31), R-002 (01, 02, 04, 32), R-003 (03), R-004 (09 to 19), R-005 (20), R-006 headers part (21), R-007 (22, 23, 29), R-008 limiter part (24) and switches (22, 23), R-009 first half (08, 17), R-017 (07, 18), R-018 (25). Features: F-001 (05, 06, 07, 31), F-002 (21), F-004 (22, 23), F-006 (08, 16, 17), F-180 (01 to 05, 32), F-195 (09 to 19, 27), F-202 (20).

Counts: 32 tasks in 9 groups (G8 now holds 29, 31 and 32). Seven tasks edit exactly 5 source files (10, 13, 14, 16, 20, 23, 28); none edits more.

## Review fixes (2026-10-27)

Sixteen review issues. Each was checked against the code or the plan before editing. All sixteen were right; two needed a different fix than the one suggested (marked).

| # | Issue | Evidence checked | Change |
|---|---|---|---|
| 1 | `RESIDUAL` could not print nothing | `git grep` of the pattern today lists the test and script files named; the plan's new tests would add more | Chose the preferred rule: no excludes; absence tests build the word at run time; `ci-local.sh` blanks only the seven surviving names. Stated in section 1 ("Residual rule"), applied in T-B0-06, 09, 10, 11, 12, 18, 19. Dry run of the end state in 4.3 (67 files remain, each owned) |
| 2 | T-B0-10 acceptance vs test edits | `NavLinks.tsx:25`, `FooterNav.tsx:46`, `nav.test.ts:4-5` | Dropped the `passport` event case; `nav.test.ts` calls `showNavEntry(entry, layout)` with no features object; grep kept as written |
| 3 | `e2e/shell.spec.ts:233` reads `lobby.aiOff` | `grep -rn aiOff e2e src`: shell.spec.ts is the only reader outside the deleted components | T-B0-16 edits the spec (drops the assertion, fixes the comment) and runs it; T-B0-19 needs no spec change; ownership tables updated |
| 4 | MCP tests break in T-B0-23 | `openapi.test.ts:4,27,55,80-82`, `transport.test.ts:3,32,159-161`, `e2e.test.ts:10` env mocks hold no token | T-B0-23 now edits openapi, transport and e2e tests (token in the mock and header, `OPTIONS` imports and `*` and preflight assertions removed), names the three `ai/*` tests; T-B0-29 adds the absence checks (incl. `openapi.test.ts`) |
| 5 | `featuresOf` change breaks route tests at G6 | `chat`, `transcribe`, `translate` and `status` tests use `stubEnv` of keys only | Took the second option: T-B0-22 stubs the switches in those four tests and verifies with `V src/app/api src/lib/server` (the search tests mock fixed `features`, so they are unaffected until 23) |
| 6 | `direct` bucket breaks seven route tests | `grep -rlE "x-forwarded-for\|x-real-ip" src` | Different from the suggestion in one point: to keep 23 and 24 (same group) on disjoint files, the `IYNK_TRUST_PROXY=1` stub is added by 22 (stubEnv tests) and 23 (env-mock tests); 24 lists the files, relies on them and verifies with `V src/app/api src/lib/server` |
| 7 | `e2e.test.ts:11` holds `solana: false` | Read the file | Added to T-B0-09 (`solana` now; untyped `image` and `db` dropped by T-B0-23) |
| 8 | `unit` runs before the relay install | `relay.integration.test.ts:19-20` and T-B0-05 throw under `CI=true` without `ws` | New step `relay-deps` (`npm ci --prefix server/realtime`) before `unit`; ten steps in the table, the `--list` test, the workflow note and T-B0-30 |
| 9 | History scan inside a 60 s test | `unit` runs `ci-local.test.mjs` | Test 5 is now `--only nosuchstep` exits 1; no real step runs in vitest; the scan stays with T-B0-07 and the gate |
| 10 | `hw` is not a status key | `hw` is added client-side in `src/lib/features.ts` | Removed from T-B0-11 and T-B0-17 |
| 11 | T-B0-20 grep hits `http.ts:125`; `compose.yaml:1` names the deleted script | `git grep` run on the current tree; `head -3 deploy/realtime/compose.yaml` | Added `':!src/lib/server/http.ts'`; T-B0-22 rewrites that comment and checks `vercel` over `src`. `compose.yaml` is now the fifth file of T-B0-20, so the `.gitignore` line moved to T-B0-18 (3 files). Also added `realtime-deploy` to the grep |
| 12 | `MAX_BODY_BYTES` grep never empty | `transport.ts:31,118` | Grep scoped to `src/lib/telemetry src/lib/realtime src/lib/sound` |
| 13 | T-B0-08 edits `shell.spec.ts` owned by T-B0-03 | Same group | Removed; proof is the unit tests (zero `fetch` and `sendBeacon`) |
| 14 | Incomplete timeout cleanup | `quad5.test.ts:164` is `}, 120_000);` | Reworded to 12 describe timeouts plus quad5's argument; new acceptance grep. Extra find: six `fig.settle(180000)` calls pass milliseconds and now mean simulated seconds, so their argument is dropped |
| 15 | T-B0-02 acceptance false | `grep -nE "\}, [0-9_]{5,}\)"` lists nine hits in six files | Delete every explicit timeout argument in the six files (the two `30_000` ones included, noted as a deliberate relaxation); grep acceptance covers all of `src/content/boards` and `src/lib/interp`; `lessons.test.ts:69` named |
| 16 | 503 `not_configured` vs RC-28 | RECONCILIATION RC-28; API_CONTRACTS 4.2 501 row | T-B0-23 returns 501 `feature_disabled` for a missing key; the 503 tests become 501; T-B0-24 deletes the now unused `notConfigured` |

Not applicable here: no issue was rejected. Unchanged counts at that time: 30 tasks, 9 groups, seven tasks at exactly 5 source files (10, 13, 14, 16, 20, 23, 28). The cross-review below makes it 32 tasks.

## Cross-review fixes (2026-10-27)

One cross-document issue (TEST_STRATEGY section 14 asks for six additions and the plan carried none). Each part was checked against the code before editing.

| # | Part | Evidence checked | Change |
|---|---|---|---|
| 1a | TS-2: `scripts/slow-tests.mjs` and the `.only` step are in no task | `ls scripts` lists no `slow-tests.mjs`; `ci-local.sh` step list in T-B0-06 has ten steps and no grep; `git grep -nE "[.]only[(]" -- src figures scripts e2e server` prints nothing today (VERIFIED); the Vitest JSON reporter writes `assertionResults[].duration` (`node_modules/vitest/dist/chunks/index.DpLw24bj.js:17897-17915`) | New card T-B0-31 in G8 (2 source files, depends on 06). Changed from the suggestion in one point: the grep is written `[.]only[(]` and uses `git grep --untracked`, because TEST_STRATEGY 12.4's `\.only\(` form would match `ci-local.sh` itself and, with `grep -r`, `node_modules`. The Python check TEST_STRATEGY 3.4 asks to add "with TS-2" rides in the same card. `ci-local.sh` now has eleven steps; T-B0-06 and T-B0-30 text updated |
| 1b | TS-1: `randomTestPort()` is in no task | Draws at `relay.integration.test.ts:73`, `helpers.js:24` (VERIFIED); a third at `server/realtime/test/load.js:22`; `playwright.config.ts:5` (T-B0-03 owns it); `timescale.test.ts:35` (deleted by T-B0-17) | New card T-B0-32 in G8 (depends on 05, which edits the same test file). Changed from the suggestion in two points: `load.js` is included (one line, it already imports `helpers.js`), and `helpers.js` carries its own copy of the function because `server/realtime` ships alone (`deploy/realtime/Dockerfile:10-13`); a test pins the two reserved lists together. Port 3000 is outside 40000 to 49999, so only 43117 is reserved |
| 1c | T-B0-30 could not run as written | Steps 6, 8 and 10 of TEST_STRATEGY 12.4 name the script, `a11y-routes` and the grep | T-B0-30 depends on 31 and 32 explicitly, step 8 now says eleven steps, and new steps 13 (slow tests) and 14 (accessibility, B0 scope) are added; acceptance says fourteen |
| 1d | TS-4 and TS-5 (`e2e/support/axe.ts`, `e2e/a11y-routes.spec.ts`) | Amar has not asked for them (no mention in `DECISION_REGISTER.md`, `HANDOFF.md`); TEST_STRATEGY marks them PROPOSAL | Not planned. Open question 7 records the default. Because they are unplanned, TEST_STRATEGY 12.4 step 8 must drop "the a11y route crawl spec after TS-5" (that file is outside this task; the orchestrator or its owner edits it). T-B0-30 step 14 already runs without the clause |
| 1e | TS-3 and TS-6 | TEST_STRATEGY marks both optional | Left unplanned, as the issue allows |

Counts after this fix: 32 tasks in 9 groups. G8 holds 29, 31 and 32 (disjoint files; 4.1 lists the two files they share with earlier groups). T-B0-31 has 2 source files, T-B0-32 has 4. No task exceeds 5.

For the orchestrator: the roadmap rows for B0 still list 25 or 30 tasks. `IMPLEMENTATION_ROADMAP.md` is outside this edit; it needs rows T-B0-31 and T-B0-32 when next reconciled (UNKNOWN whether it lists T-B0-26 to T-B0-30 yet).
