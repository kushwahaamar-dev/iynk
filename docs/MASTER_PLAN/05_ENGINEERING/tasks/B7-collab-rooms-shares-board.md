# B7 task packages: Collaboration, rooms, shares and the buddies-only board

Written 2026-10-27 for the build-plan step. Plan only: no file in `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed to write it, and nothing was committed.
Phase goal: server-ordered op-log rooms on user projects, invite-only, a baton for code, a hostile-client suite, read-only shares and a buddies-only lap board.
Scope: F-116 to F-122, F-089, F-117, F-140, F-143, F-144; R-075, R-076, R-082 to R-095, R-097. Not in it: voice, public boards, old lab rooms, the shared simulation run (B8).
Exit: `npm run check`; RA-01 (40 runs, zero divergence), the hostile suite and the crash test green; M1 steps 9 to 11 walked with a friend. Then Amar's OK.
Depends on phases: B3, B4, B6 (and B2 through them).
Labels: VERIFIED (read in a file or the code in this step), DOCUMENTED (a plan file says it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN. PROPOSAL marks a default with no measurement behind it.

## 1. Binding inputs and how this file relates to them

| Input | Used for |
|---|---|
| `00_EXECUTIVE/DECISION_REGISTER.md` D-013 to D-017 | Complete app for Amar and friends; local-first; no public boards (D-016); licence later (D-017) |
| `05_ENGINEERING/IMPLEMENTATION_ROADMAP.md` section 2 and B7 (lines 535 to 583) | Conventions, the 20-row task table this file refines, `TL`, `V`, `E`, `KL`, `SRV` |
| `04_ARCHITECTURE/RECONCILIATION.md` | Wins where design files disagree: RC-01 (`synchronous=FULL`), RC-02 (one `ServerStore`), RC-04, RC-06, RC-07, RC-13, RC-14, RC-20, RC-21 (`/v1`), RC-22 (`/ws`), RC-24, RC-25, RC-26, RC-35, RC-40, RC-65, RC-69, RC-71 |
| `04_ARCHITECTURE/REALTIME_ARCHITECTURE.md` (RT), ADR-0500 to ADR-0511 | Wire protocol, `RoomCore`, roles, limits, hostile suite, RA-01 to RA-18 |
| `04_ARCHITECTURE/BACKEND_ARCHITECTURE.md` 7.2, 11; `schemas/openapi.yaml`; `schemas/project.schema.json` | Table names, route names, field names (binding) |
| `03_PRODUCT/PRODUCT_REQUIREMENTS.md` R-075 to R-097; `COMMUNITY.md` 3.5, 3.10, 3.12 | Acceptance text for rooms, shares, board |
| `08_RESEARCH_SPIKES/RS-09-op-log-collab/REPORT.md` and `src/` | The model the property test ports (about 700 lines: `doc.js`, `server.js`, `client.js`, `sim.js`, `mutants.js`, `dedup-unit.js`) |
| `01_AUDIT/SECURITY_BASELINE.md` R1 to R9 (2.2), section 10 | What the hostile suite must name in its test titles |

## 2. Conventions for every B7 task

Everything in `IMPLEMENTATION_ROADMAP.md` section 2 applies. The parts that matter here:

| Rule | Detail |
|---|---|
| Branch and commits | Local branch `build/v1`. One commit per task, message `B7 T-B7-<nn>: <what>`, authored as Amar Kushwaha, no `Co-Authored-By` and no "Generated with" line. Never push, never deploy. |
| Off limits | Production services, `.env.local` values, ports 3000 and 43117. Every server a test starts listens on `127.0.0.1` on a port from 40000 to 49999 that is not 43117 and not `E2E_PORT`, with a temporary data directory. |
| 5-file rule | At most 5 source files edited or created per task. Test files, a deleted file and the six language copies of one i18n namespace (counted as one) are not counted (roadmap 2.2). The `Files:` line of each task is the count. |
| Next.js | 16.4.3. B7 names no Next API. The Studio page is a static client page (ADR-0401); all collaboration code is client components or plain modules. A builder who needs a Next API reads `node_modules/next/dist/docs/01-app/` first (`AGENTS.md`). |
| Portable code | `src/protocol` is portable (ADR-0014): relative imports ending in `.ts`, `import type`, no `enum`, no DOM or Node import, checked by `npx tsc -p tsconfig.portable.json`. `server/` runs `.ts` through Node type stripping with `node src/main.ts` (ADR-0014 decision 1; Node 24.8.0 ran it with no flag, VERIFIED in that ADR). Shared code: the `#core/*`, `#protocol/*` and `#project/*` subpath imports do not resolve once `server/package.json` exists (B6 finding F1, VERIFIED on Node 24.8.0, `tasks/B6-collab-server-buddies.md` line 20), so the server reaches shared code by relative `.ts` paths only, for example `../../src/project/apply/index.ts`. B6 rule 4.2 allows `src/core/*` and `src/protocol/identity.ts`; B7 widens it to `src/protocol/{frames,validate,close-codes}.ts` and `src/project/{apply/index,validate,hash,limits}.ts` (SYSTEM 5.3: `server` may import `core`, `protocol`, `project` and `parts`; FA-01 in `src/architecture.test.ts` already allows `server/` to import `src/project/apply`, T-B2-10). Plain Node needs a `{"type":"module"}` `package.json` in each shared folder: T-B6-15 added `src/core`, T-B6-16 added `src/protocol`, T-B7-38 adds `src/project`. Browser code in `src/collab` imports no `src/studio` file and `src/studio` imports no `src/collab` file (SYSTEM 5.3). |
| Server tests | `node:test` files `server/test/<name>.test.ts` (B6 rule 4.2) that import the `.ts` sources by relative path. Support files are `.ts` too: `server/test/helpers.ts` (T-B6-02), `server/test/keys.ts` (T-B6-04), `server/test/http-helpers.ts` (T-B6-17). Proof commands are `SRV`, `SRV1`, `SRVG` and `SRVT` below. The whole-suite glob is `test/**/*.test.ts`, so a test not named `.test.ts` would never run under `SRV` and `SRV` would prove nothing about it. |
| Client tests | `npx vitest run <path>`. |
| Language | A copy change updates all six languages in the same commit (K-I18N). No em dashes. The word "validated" is banned in copy (D-007). |
| Test rules | No wall-clock polling; time is injected (`clock: () => number`, `Timers`) and tests step it (R-002). Under `CI=true` a missing service fails (R-001). No test touches a third party (R-003). |
| Keyless | `KL` = `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= NEXT_PUBLIC_REALTIME_URL= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL=` (`01_AUDIT/runs/BUILD_OUTPUT.md`), minus names T-B0-12 has dropped. |

Command shorthand, with the exact commands:

| Name | Exact command |
|---|---|
| `TL` | `npm run typecheck && npm run lint` |
| `PORT` | `npx tsc -p tsconfig.portable.json` (after T-B6-01b it covers the portable folders only; `server/` is typed by `SRVT`) |
| `V <path>` | `npx vitest run <path>` |
| `SRVT` | `npm run server:typecheck` (T-B6-01b) |
| `SRV` | `npm run server:test`: in `server/` it runs `node --test --test-concurrency=1 "test/**/*.test.ts"`, then the 39 legacy tests (B6 section 4.1) |
| `SRV1 <file>` | `cd server && node --test test/<file>.test.ts` |
| `SRVG "<glob>"` | `cd server && node --test --test-concurrency=1 "<glob>"`. Node 24.8.0 does not take a directory argument: `node --test --test-concurrency=1 p/` fails with "test failed" and runs nothing (VERIFIED in the 2026-10-27 review), so a folder is always a quoted glob |
| `E <spec>` | `KL NEXT_DIST_DIR=.next-build npx playwright test <spec>` (random port, `playwright.config.ts:5`; builds unless `E2E_SKIP_BUILD=1`) |
| `GATE` | `npm run check` (content check, typecheck, lint, vitest, playwright) |

Every task's "Verify commands" line spells out which of these it runs. Typecheck and lint are always among them (CLAUDE.md "Forced Verification").

## 3. What this plan takes from earlier phases

The task files of B2 to B6 are written (`05_ENGINEERING/tasks/B2-core-document-netlist.md` to `B6-collab-server-buddies.md`, VERIFIED by `ls`). Every name below was read from them, not from the roadmap. Where this file used another name before the 2026-10-27 review, it now follows the task file. These are still plans, so each B7 task starts by reading the real file once it exists; a signature difference that changes another B7 task's interface goes to the orchestrator, not into a silent fix.

Naming notes. This file writes `ProjectDocument` for the type B2 calls `Project` (`src/project/generated/types.ts`, T-B2-04). It writes `DeviceRow` for the authenticated device; the real value a route handler receives is B6's `Authed` (`deviceId`, `identityId`, `role`, `sessionId`, `name`, `deleting`), and the `devices` row is read from the store when the public key is needed. Paths that start with `0N_` are under `docs/MASTER_PLAN/`.

| Name used in B7 | Real name and place | From | Used by |
|---|---|---|---|
| `apply(state, op)`, pure, with an inverse, one function for all 64 kinds; reject codes `malformed, duplicate_id, missing_target, missing_pin, pin_in_use, unknown_definition, missing_pin_map, referenced_by, invariant, stale_base, schema_mismatch` | `src/project/apply/index.ts` | T-B2-05 to T-B2-07 | T-B7-06, 20, 24 |
| Validation V1 to V5 and limits | `src/project/validate.ts`, `semantic.ts`, `limits.ts`; shared constants in `src/core/limits.ts`; standalone validators (`validateProject`, `validateOp`, ...) in `src/project/generated/validate.mjs` | T-B2-08, T-B2-02, T-B2-04 | T-B7-09, 18 |
| `stateHash`, `canonicalBytes`, `chainStart(projectId)`, `chainNext(prev, envelope)`, `foldChain` | `src/project/hash.ts`; canonical JSON, synchronous SHA-256 and the seeded PRNG in `src/core/canonical.ts`, `sha256.ts`, `prng.ts` | T-B2-09, T-B2-03 | T-B7-06, 13, 15 (B7 defines no chain function of its own, D23) |
| `ProjectSession`, `computeTouched`, `Authority { submit(PendingBatch), onRemote, onResync(h: (snapshot: Project) => void), mode }`, `createLocalAuthority`; `PendingBatch` carries `inverse` | `src/project/session.ts`, `touched.ts`, `authority.ts` | T-B2-10 | T-B7-15, 19 |
| Generators and headless harness | `src/project/testing/generators.ts`, `harness.ts` | T-B2-16 | T-B7-06, 13, 20 |
| `forkProject(src, { id, now, actor, title? })` (new id, revision 0, history reset, `provenance.origin { kind: "fork", project, revision, stateHash }`); `Library` (create, rename, duplicate, delete) | `src/project/fork.ts`; `src/local/library.ts` | T-B3-06 | T-B7-19, 28 |
| Project worker (untrusted-file load path) | `src/local/project-host.ts`, `project.worker.ts` | T-B3-03 | T-B7-28 |
| `src/protocol/errors.ts`, `version.ts`, `index.ts`; the plain-Node stubs `src/core/package.json` and `src/protocol/package.json`; `src/protocol/identity.ts` (`deriveDeviceId`, `keyThumbprint`, `signingInput`, `cleanDisplayName`) | as named | T-B3-01, T-B6-15, T-B6-16 | T-B7-01, 12 |
| `ServerStore { transaction(fn), read(fn), backupTo, integrityCheck, ping, schemaVersion, close }`, `Tx { run, get, all }` (a nested `transaction` joins the outer one), `openStore(opts, deps)` with `migrationsDir`, `Deps { clock, ids, sleep }` | `server/src/store/{port,sqlite,migrate}.ts`, `server/src/deps.ts` | T-B6-02 | T-B7-03 and every server task |
| Migrations are `server/migrations/NNNN_name.sql` (`0001_identity.sql` exists); `migrate()` takes a `dir` | `server/migrations/` | T-B6-02 | T-B7-03, 09, 10 |
| Server test helpers: `server/test/helpers.ts` (`memoryStore()`, `fakeDeps()`, `freePort()`), `server/test/keys.ts` (`makeDeviceKey()`), `server/test/http-helpers.ts` (starts `createApp` on a free port) | as named | T-B6-02, T-B6-04, T-B6-17 | every server test |
| `RouteDef { method, path, operation, cls, bucket, maxBodyBytes?, handler(ctx) }`, `defineRoutes`, closed unions `RouteClass` and `BucketName`, `Ctx`, `Authed`, `ApiError`, `Limiter` (`take(bucket, key)`) | `server/src/http/{classes,router,limits,errors}.ts` | T-B6-07 | T-B7-04, 08, 09, 10, 18, 25 |
| `createApp(config, deps, opts?: { store?, log? }): App`, `allRoutes(ctx: RouteDeps)` (the single registration point), `main.ts` only listens and handles SIGTERM, `serverInfoRoutes` in `server-info.ts` | `server/src/app.ts`, `main.ts`, `http/server-info.ts` | T-B6-17 | T-B7-32, 39 |
| `server/src/identity/{enrol,challenge,tokens,devices}.ts` (`verifySignature` is the helper the socket handshake reuses); `devices` columns `id, identity_id, public_key (SPKI), thumbprint, name, server_role, revoked_at, show_online, ...`; `sessions`, `buddies (a, b, since, alias_a, alias_b)` with `a < b` | as named | T-B6-04, T-B6-02 | T-B7-03, 12, 25 |
| `areBuddies(tx, a, b)`, `visibleBuddy`, `removeBuddy(tx, viewer, identityId)`; `buddyRoutes` in `server/src/http/buddies.ts` | `server/src/buddies/{pairing,list,visibility}.ts`, `http/buddies.ts` | T-B6-08, T-B6-09 | T-B7-09, 10, 25, 39 |
| `server/src/ops/log.ts` (redacting logger) | as named | T-B6-13 | every server task |
| `src/server-client/{keys,auth,client,types,links,profile,probe}.ts`. The device key lives in IndexedDB database `iynk`, object store `identity`, as `StoredKey { privateKey (non-extractable CryptoKey), publicSpki, createdAt }` behind `DeviceKeyStore`. `ServerClient` has fixed methods (`probe`, `enrol`, `signIn`, `me`, `listBuddies`, ...) and no generic request; T-B7-38 adds `fetchAuthed(path, init)` and `fetchAnon(path, init)` | as named | T-B6-05, T-B6-11, T-B7-38 | T-B7-16, 17, 22, 28 |
| `createDocStore(session, link?)`, `DocStore.commit(batch, { label, author? }): CommitResult` where a failure is `{ ok: false, reject, message }`, `DocView.readOnly`; `registerCommand(c): () => void` (a function call, so no edit to `commands.ts` is needed); `Workspace.tsx` builds the per-project graph and calls `createSceneController` with `OverlayProviders { net, state, air }`; `StudioEntry.tsx` renders Home or Workspace; wiring files `repositoryLink.ts`, `openProject.ts`, `simLink.ts` (there is no `authorityLink.ts`, VERIFIED by grep of B4) | `src/studio/stores/doc.ts`, `commands.ts`, `router.ts`, `engine/controller.ts`; `src/components/studio/{StudioEntry,Workspace,CanvasView}.tsx`, `wiring/` | T-B4-01, 02, 11, 24, 25 | T-B7-19, 23, 26, 41 |
| Import matrix: `studio` never imports `collab`; `collab` imports `core, protocol, project, local, server-client` and never `studio`; `protocol` imports `core` only; `server` imports `core, protocol, project, parts`; `UI` (`src/components`, `src/app`) may import all | SYSTEM 5.3, enforced by `src/architecture.test.ts` | T-B2-01 | T-B7-01, 22, 23, 26, 41 |
| Playwright: `E2E_SERVER_PORT` and `E2E_DEAD_PORT` (random, skipping 3000, 43117 and `E2E_PORT`), `webServer` as an array, `IYNK_CONNECT_ORIGINS` feeds the CSP `connect-src` (D-B1-1), temp data directory in `E2E_SERVER_DATA`, `e2e/server-harness.ts` (`serverUrl()`, `newEnrolmentCode()`, `firstOwnerCode()`). `fullyParallel: true` is set today (`playwright.config.ts:18`) | `playwright.config.ts`, `e2e/server-harness.ts` | T-B6-21, T-B1 | T-B7-40, 35, 36 |
| Server scripts `server:typecheck` and `server:test`; `server/legacy/` unmounted with its 39 tests | `package.json`, `server/package.json` | T-B6-01a, T-B6-01b | every server task |
| WebKit Playwright project and the acceptance walk | `playwright.config.ts`, `e2e/` | T-B3-24 | T-B7-02, 35 |

Paths this plan quotes from today's code (all VERIFIED to exist at HEAD `4d11dc5`; B0 and B6 move or delete some, as noted per task):

| Path:line | Fact |
|---|---|
| `server/realtime/src/relay.js:219-299`, `:231,248-264` | A join to an unknown code creates the room; a second join with an existing peer id replaces the member and inherits host (R3, R4) |
| `server/realtime/src/relay.js:383-388` | `onAction` appends any action: no validation, no dedup, no rejection |
| `server/realtime/src/room.js:47-50` | `hostId` is the first key of the peers Map |
| `server/realtime/src/room.js:121-128` | Bans are by client-chosen peer id |
| `server/realtime/src/protocol.js:6,26,29,68,81,87,191,235` | Chat `kind` set by the client; `NAME_JUNK`, `CHAT_JUNK`, `capText`, `line`, `name`, `parseClientFrame` |
| `server/realtime/src/bucket.js:1-22` | `TokenBucket` |
| `server/realtime/src/config.js:4-14,22,29,33-34,153` | Limits, `joinTimeoutMs: 10_000`, `maxRooms: 500`, backpressure 4 MiB and 256 KiB, `originAllowed` |
| `src/lib/realtime/room.ts:586-598` | `room/baton` accepted from any sender (R6) |
| `src/components/realtime/InviteDialog.tsx:52-134` | Reusable QR, copy and share dialog; props `link`, `title`, `hint`, `code`, `action`, `t: TogetherT` |
| `src/components/dronelab/FlyWorkspace.tsx:5,46,54-55,108-130,206` | Public `Leaderboard` import, `board` prop, `onBoard` bounds, lap `track("flight.lap")` at lines 123 and 125, board panel (T-B0-16 removes the public board and edits lines `5,205-215`) |
| `src/lib/flight/challenge.ts:20-21` | Daily challenge `board` id such as `daily-20261024` |
| `src/lib/telemetry/kinds.ts:56` | `LAP_MS = { min: 1_000, max: 3_600_000 }` |
| `playwright.config.ts:5,17-35` | Random port 40000 to 49999, one `webServer` (the Next app), `fullyParallel: true` |

## 4. Where this plan departs from the roadmap rows, and why

The roadmap lists 20 rows. They cannot all stay at 5 files, and several pieces of the scope had no row. The final count is 41 tasks: the 37 of the first draft plus four added by the 2026-10-27 review (T-B7-38 to T-B7-41, see D22).

| # | Departure | Reason |
|---|---|---|
| D1 | Roadmap T-B7-05 (`ws/server.ts`, `auth.ts`) is split into T-B7-12 (authentication), T-B7-21 (dispatch and lobby) and T-B7-32 (mounting) | One task could not hold the handshake, the dispatcher, the lobby and the wiring in 5 files |
| D2 | Roadmap T-B7-07 edits `permissions.ts` to add the baton rule; here the baton gate is inside `authorizeOp` from the start (T-B7-04) and T-B7-14 holds only the baton state machine | A permission table that omits `not_baton` would have to be rewritten |
| D3 | New T-B7-07 (presence, cursors, server chat), T-B7-08 (assets), T-B7-14 (host commands) | The roadmap names the cursor UI and chat but no server code for cursors; `PUT /v1/assets/{sha256}?room=` is in the roadmap API list (RC-26) but has no row; kick, mute, lock, close, pass and claim (F-120, R-093) have no server row |
| D4 | `src/studio/overlays/cursors.ts` is created, not edited (roadmap T-B7-12 says "edit") | T-B4 tasks create `overlays/netlist.ts` and `overlays/state.ts` only (VERIFIED in the roadmap B4 table) |
| D5 | `codeMode: "open"` is not built. `room.settings` refuses it with `bad_frame` and the text "Open code mode is not built yet" | RT 9 and 8.4 make it conditional on the two-typist trial RA-13, which needs two people. The contract keeps the enum value, so adding it later is additive. Amar may overrule (section 11, Q1) |
| D6 | Wire `opSchema` is `"1.1"`, not the `"1.0"` that RT 7.3 still prints | PDM 7.2 and RC-34, RC-35: 64 kinds including `actor.set` are `opSchema` 1.1 |
| D7 | `superseded` closes with 4001 | RT 4.4 says 4409 and RT 7.4 and BACKEND 5.2 say 4001; 7.4 is the table the validator is generated from, and BACKEND names 4001 (VERIFIED, BACKEND line 206) |
| D8 | Live shares per identity: 20 (openapi `createShare` description) | COMMUNITY 3.13 says 200 shares per device. The openapi route text wins (RC rule R4: API_CONTRACTS and openapi own routes). 200 stays as the stored-rows ceiling including revoked tombstones |
| D9 | `provenance.set` is owner-only | RT 6.2 lists no row for it; RA-12 requires every one of the 64 kinds to be classified. PROPOSAL; Amar may overrule (Q2) |
| D10 | The client builds the share link as `/<lang>/studio#share=<token>` and ignores `ShareCreated.url`; the server returns the same fragment form with `/en/` | ADR-0426 decision 2 and BACKEND 11 say fragment form; openapi `ShareCreated.url` still says `{origin}/s/{token}` and is marked "to be changed" in BACKEND 11 |
| D11 | F-143 is built as the `buddies` share audience only. The "Shared with me" list is not built | COMMUNITY 3.5 lists a "Shared with me" view, but no route returns shares made by other people: openapi `listShares` is "My share links" (VERIFIED) and COMMUNITY 3.12 adds no route. A new route is a contract change and is Amar's call (Q3) |
| D12 | F-144 (challenges among buddies) is not built. The score store accepts the `solved.{shareId}` key shape because it is a generic key, nothing more | F-144 depends on F-133 (the challenge model), which is not built in B7 or any earlier phase. FEATURE_PRIORITIZATION rates it LATER |
| D13 | The `room_invites.kind` column stores `direct` (BACKEND DDL) and the API says `buddy` (openapi `RoomInvite.kind`) | The repository maps between them in one place (T-B7-03). openapi is the contract |
| D14 | `ErrorCode` gains `server_error` (retryable) | RT 7.4's closed list has no code for "the store failed while committing". Without one, a failed commit would be reported as a rejection of the user's op. Additive, no protocol bump (RT 7.2) |
| D15 | Migration `0003_shares.sql` creates `shares` and `share_blobs` with the columns openapi `Share` needs (`audience`, `allow_fork`, `label`, `revision`, `opens`, `last_opened_at`) and `0004_scores.sql` creates `scores` keyed `(device_id, key)` with `unit`, `better`, `note`, `project_id` | BACKEND 7.2's DDL lacks those columns, and its `scores(kind, value, at, detail)` has no unique key; COMMUNITY 3.10 says "the schema seat maps them". openapi wins (R4) |
| D16 | The owner-signature check on a share (COMMUNITY CD-3, CM-10, "Could not verify who sent this") is not built | openapi `Share` has no `signature` field and COMMUNITY 3.5 says the contract wins. A tampering server could change document and hash together; the data-handling note says the operator can read and change what the server stores (RT 15.2). Adding a signature is a contract change (Q4) |
| D17 | `POST /v1/rooms/{id}/reopen` also restores a `corrupt` room from its last good checkpoint (new epoch) | RT 5.1 says "owner restores the last good checkpoint" and openapi has no restore route. Reusing `reopen` for another state adds no route; adding `/restore` would be a contract change (Q4) |
| D18 | `room_invites` gains `target_device` | openapi `RoomInvite.buddy` needs a place to live; BACKEND's DDL has none |
| D19 | `blobs` and `uploads` are created by `server/migrations/0002_rooms.sql` with the room tables | The asset route and the share store both need them and must not depend on each other |
| D20 | A member's local copy is not kept "under the same project id marked as shared" after a room closes or when its chain differs: it is forked (R-085 against RT 12.3 and objection O-6) | Two diverging copies under one id make the library ambiguous and fast-forward unsafe (PDM 3.2: a fork gets a new id). The creator's library keeps the id; every other member's last state becomes a new project with `provenance.origin` kind `fork` (RC-40) |
| D21 | B7 sends `runner: null` and `run: null` in `welcome`, leaves `"run"` out of `CLIENT_CAPS`, and refuses `run.*` frames and the commands `runner.set` and `run.detach` | The shared run is B8 (roadmap section 1, dotted edge); the frame shapes in T-B7-01 leave room for it without a protocol bump |
| D22 | Four tasks are added: T-B7-38 (plain-Node stub for `src/project`, the `ws` dependency, image copy lines, `ServerClient.fetchAuthed` and `fetchAnon`), T-B7-39 (the unpair hook), T-B7-40 (Playwright server support) and T-B7-41 (lobby client, join route, commands, Studio wiring). T-B7-22 and T-B7-32 each give half of their old scope to the new task next to them | The review found no task owned these seams, and T-B7-22 and T-B7-32 each held several unrelated builds |
| D23 | `src/protocol` has no `chainNext` or `chainStart`. The hash chain is `chainStart` and `chainNext` of `src/project/hash.ts` (T-B2-09). Wire frames carry the structural `WireOp` and `WireEnvelope` | One source of truth. SYSTEM 5.3 says `protocol` imports `core` only, so it cannot import the project types |
| D24 | `forkDocument` (T-B7-19) wraps `forkProject` of `src/project/fork.ts` (T-B3-06) | One fork code path; two would drift |
| D25 | A route handler receives B6's `Authed`, not a `DeviceRow`. A B7 `RouteDef` carries `operation`, `cls` and `bucket` (T-B6-07). The "class" names `asset.write`, `share.read`, `room.create`, `room.write`, `room.read` and `room.invite.redeem` are buckets, and T-B7-04 adds them to `BucketName` | B6's `RouteClass` and `BucketName` are closed unions; a route using an unknown bucket does not typecheck |
| D26 | The bucket `room.invite.redeem` counts attempts (5 per hour per device) through the shared `Limiter`, not failures only, and T-B7-25's own `TryLimiter` is dropped | `Limiter.take` only counts. A second limiter is a second mechanism BA-11 cannot see. openapi says "5 failures per hour"; counting attempts is stricter (PROPOSAL; Amar may overrule) |

Roadmap row to task mapping, so ids line up with `IMPLEMENTATION_ROADMAP.md`:

| Roadmap row (its own numbering) | Task here |
|---|---|
| T-B7-01 protocol | T-B7-01 |
| T-B7-02 room tables | T-B7-03 |
| T-B7-03 `RoomCore` | T-B7-06 |
| T-B7-04 checkpoints and resume | T-B7-13 |
| T-B7-05 socket authentication | T-B7-12, T-B7-21 |
| T-B7-06 lifecycle, invites, roles | T-B7-18, T-B7-25, T-B7-04 |
| T-B7-07 baton | T-B7-04 (gate), T-B7-14 (state), T-B7-27 (code dock) |
| T-B7-08 property test | T-B7-20, T-B7-24 |
| T-B7-09 crash test | T-B7-33 |
| T-B7-10 `RoomClient` | T-B7-11, T-B7-15 |
| T-B7-11 `RoomAuthority`, banner | T-B7-19, T-B7-26 |
| T-B7-12 members, cursors, baton UI, host controls, invite dialog | T-B7-23, T-B7-29, T-B7-31, T-B7-41 |
| T-B7-13 chat | T-B7-07 (server), T-B7-29 (client) |
| T-B7-14 fork and keep a copy | T-B7-19 (logic), T-B7-30 (dialogs) |
| T-B7-15 shares, server | T-B7-09 |
| T-B7-16 shares, client | T-B7-16, T-B7-28 |
| T-B7-17 scores, server | T-B7-10 |
| T-B7-18 buddies board | T-B7-17 |
| T-B7-19 hostile suite and capacity | T-B7-34 |
| T-B7-20 two-room acceptance | T-B7-35 |
| (no row) assets, spike, i18n, mount, docs, share and board e2e | T-B7-08, T-B7-02, T-B7-05, T-B7-32, T-B7-37, T-B7-36 |
| (no row) shared-code seam, unpair hook, e2e server support, lobby and Studio wiring | T-B7-38, T-B7-39, T-B7-40, T-B7-41 |


## 5. Task index

Priority: P0 blocks the exit gate; P1 is in scope and should land in this phase. "Depends on" lists B7 task numbers (B-phase dependencies are in each task). "Files" counts source files; tests are extra. The table is in group order.

| ID | Task | Group | Depends on (T-B7-) | Priority | Files |
|---|---|---|---|---|---|
| T-B7-01 | Wire protocol v2: frames, close codes, validators | 1 | B-phases only | P0 | 4 |
| T-B7-02 | Spike RS-21: browser primitives for rooms | 1 | B-phases only | P0 | 3 |
| T-B7-03 | Room tables, repositories and the store seam | 1 | B-phases only | P0 | 2 |
| T-B7-04 | Permission matrix, collaboration limits and route buckets | 1 | B-phases only | P0 | 5 |
| T-B7-38 | Shared-code, dependency and client seams | 1 | B-phases only | P0 | 4 |
| T-B7-39 | Unpair hook: one seam for rooms, invites and the lobby | 1 | B-phases only | P0 | 3 |
| T-B7-05 | Room, share and board strings in six languages | 2 | 02 | P1 | 2 |
| T-B7-06 | RoomCore: submit, group commit, reject, dedup, inverse, chain | 2 | 01, 03, 04, 38 | P0 | 4 |
| T-B7-07 | Presence, cursors and chat on the server | 2 | 01, 04 | P1 | 4 |
| T-B7-08 | Asset upload, query and download for rooms | 2 | 03, 04 | P1 | 2 |
| T-B7-09 | Shares, server side | 2 | 03, 04, 38 | P0 | 5 |
| T-B7-10 | Scores and the buddies-only board, server side | 2 | 03, 04 | P0 | 3 |
| T-B7-11 | Client transport: WebSocket, gzip, reconnect, memory transport | 2 | 01, 02 | P0 | 4 |
| T-B7-12 | Socket authentication and the session registry | 2 | 01, 02, 03 | P0 | 3 |
| T-B7-13 | Checkpoints, compaction and resume | 3 | 03, 06 | P0 | 2 |
| T-B7-14 | Baton, host commands and succession | 3 | 04, 06, 07 | P0 | 4 |
| T-B7-15 | RoomClient: optimistic view, pending queue, rebase report | 3 | 01, 11 | P0 | 3 |
| T-B7-16 | Shares, client: API, asset sync and share dialog | 3 | 05, 08, 09, 38 | P0 | 2 |
| T-B7-17 | Buddies board in the fly workspace | 3 | 05, 10, 38 | P0 | 3 |
| T-B7-18 | Room lifecycle, registry, quotas and room routes | 4 | 03, 04, 06, 09, 13, 14 | P0 | 3 |
| T-B7-19 | RoomAuthority, document link, edit-access gate and fork helpers | 4 | 05, 15 | P0 | 4 |
| T-B7-20 | Convergence harness on RoomCore: RA-01 and RA-02 with a model client | 4 | 06, 13 | P0 | 0 (tests) |
| T-B7-21 | Socket dispatch, frame codec and the lobby | 5 | 06, 07, 12, 13, 14, 18 | P0 | 4 |
| T-B7-22 | Rooms API client and the join flow | 5 | 05, 11, 16, 19, 38 | P0 | 2 |
| T-B7-23 | Presence store and the cursor overlay | 5 | 05, 15, 19 | P1 | 3 |
| T-B7-24 | Convergence with the real client: FA-13, RA-02 and RA-07 | 5 | 06, 13, 15, 19, 20 | P0 | 0 (tests) |
| T-B7-25 | Room invites and redemption | 6 | 03, 04, 18, 21 | P0 | 2 |
| T-B7-41 | Lobby client, join route, commands and Studio wiring | 6 | 05, 11, 16, 22 | P0 | 4 |
| T-B7-27 | Code dock obeys the baton | 6 | 19, 23 | P0 | 3 |
| T-B7-26 | Room dock shell: banner, side panel and toolbar areas | 7 | 05, 19, 22, 23, 41 | P0 | 5 |
| T-B7-32 | Mount rooms, assets, shares, scores and the socket | 7 | 04, 08, 09, 10, 12, 18, 21, 25, 39 | P0 | 4 |
| T-B7-28 | Shares, client: read-only open and "Make my copy" | 8 | 16, 19, 22, 26, 38, 41 | P0 | 3 |
| T-B7-29 | Members, presence and chat panels | 8 | 05, 23, 26 | P1 | 4 |
| T-B7-30 | Rebase report and room-ended notices | 8 | 15, 19, 26 | P0 | 3 |
| T-B7-31 | Baton, host controls and the room menu | 8 | 05, 22, 23, 26, 41 | P0 | 5 |
| T-B7-33 | Crash test between COMMIT and ack | 8 | 20, 32 | P0 | 1 |
| T-B7-34 | Hostile-client suite and capacity test | 8 | 32 | P0 | 0 (tests) |
| T-B7-40 | End-to-end server support for Playwright | 8 | 32 | P0 | 1 |
| T-B7-35 | Two-browser room acceptance (M1 steps 9 to 11) | 9 | 22, 23, 26, 27, 29, 30, 31, 32, 40, 41 | P0 | 0 (tests) |
| T-B7-36 | Share and board acceptance in the browser | 9 | 17, 28, 32, 40 | P1 | 0 (tests) |
| T-B7-37 | Documentation and results records | 10 | 20, 24, 33, 34, 35 | P1 | 3 |

Count: 41 tasks, 34 at P0. The roadmap estimated the phase at 6 / 9 / 13 weeks for 20 rows; the split adds task boundaries, not work (ESTIMATED). No task is a P2: F-143 and F-144 are cut down, not deferred past the gate (decisions D11 and D12).

## 6. Parallel groups

Tasks in one group touch disjoint files (the ownership table in section 8 proves it) and can be built by separate agents at once. Groups run in order. A task starts only when everything it depends on has landed; every dependency of a task is in an earlier group (checked when this table was written, and again after the 2026-10-27 review). Within a group, two tasks never edit the same file.

| Group | Tasks | Files touched (disjoint) |
|---|---|---|
| 1 | T-B7-01, 02, 03, 04, 38, 39 | `src/protocol/{frames,close-codes,validate,index}.ts`; a spike under `docs/MASTER_PLAN/08_RESEARCH_SPIKES/`; `server/migrations/0002_rooms.sql` and `server/src/store/rooms.ts`; `server/src/rooms/{op-classes,permissions}.ts`, `server/src/collab-config.ts`, `server/src/http/{classes,limits}.ts`; `src/project/package.json`, `server/package.json`, `deploy/Dockerfile.server`, `src/server-client/client.ts`; `server/src/buddies/visibility.ts`, `server/src/http/buddies.ts`, `server/src/app.ts` |
| 2 | T-B7-05, 06, 07, 08, 09, 10, 11, 12 | i18n JSON; `server/src/rooms/{core,commit,dedup,types}`; `server/src/ws/{bucket,presence,cursors,chat}`; `server/src/assets`; `server/src/shares` plus `src/project/secret-scan.ts` and `server/migrations/0003_shares.sql`; `server/src/scores` plus `server/migrations/0004_scores.sql`; `src/collab/{ws-transport,memory-transport,backoff,gzip}`; `server/src/ws/{auth,nonces,sessions}` |
| 3 | T-B7-13, 14, 15, 16, 17 | `server/src/rooms/{checkpoint,resume}`; `server/src/rooms/{baton,host,succession,commands}`; `src/collab/{client,queue,rebase}`; `src/collab/share.ts` and `ShareDialog.tsx`; `src/server-client/scores.ts`, `BuddyBoard.tsx`, `FlyWorkspace.tsx` |
| 4 | T-B7-18, 19, 20 | `server/src/rooms/{lifecycle,registry}` and `server/src/http/rooms.ts`; `src/collab/{authority,fork}.ts`, `src/components/studio/wiring/authorityLink.ts`, `src/studio/stores/doc.ts`; tests only |
| 5 | T-B7-21, 22, 23, 24 | `server/src/ws/{server,dispatch,codec,lobby}`; `src/collab/{rooms-api,join}`; `src/collab/presence.ts`, `src/studio/overlays/cursors.ts`, `src/studio/engine/controller.ts`; tests only |
| 6 | T-B7-25, 41, 27 | `server/src/rooms/invites.ts`, `server/src/http/room-invites.ts`; `src/collab/{lobby,install}.ts`, `src/studio/router.ts`, `src/components/studio/StudioEntry.tsx`; `src/collab/source-batch.ts`, `CodeDock.tsx`, `src/studio/code/sources.ts` |
| 7 | T-B7-26, 32 | `src/components/studio/room/{RoomDock,BannerArea,SidePanel,Toolbar}.tsx` and `StudioEntry.tsx`; `server/src/{app,main,collab-app}.ts`, `server/src/http/server-info.ts` |
| 8 | T-B7-28, 29, 30, 31, 33, 34, 40 | `src/collab/share-open.ts`, `router.ts`, `StudioEntry.tsx`; `Members.tsx`, `Chat.tsx`, `chat.ts`, `SidePanel.tsx`; `RebaseReport.tsx`, `RoomEndedNotice.tsx`, `BannerArea.tsx`; `BatonControl.tsx`, `HostControls.tsx`, `RoomMenu.tsx`, `InviteDialog.tsx`, `Toolbar.tsx`; `server/scripts/kill-loop.mjs`; server tests; `playwright.config.ts` and e2e support |
| 9 | T-B7-35, 36 | `e2e` specs |
| 10 | T-B7-37 | docs |

Critical path (ESTIMATED): 01, 06, 13, 18, 21, 25, 32, 40, 35, 37. T-B7-02 gates T-B7-05, 11 and 12 only through its verdict, never through files. Groups 5 to 8 hold the client work that waits for `RoomAuthority` (T-B7-19); the server and client halves meet only in group 9's end-to-end tests and in T-B7-24.

## 7. Task packages

Common rules for the "Delivery" block of every task, so they are not repeated:

- Rollback: `git revert <commit>` of the task. A task that adds a migration also leaves the migration file in place until the phase tag is removed, because a migration is never edited after it is applied (BACKEND 7.3); reverting the commit removes the file before any release, so no rollback step touches data.
- Documentation: `docs/ROOMS.md` and the self-hosting additions are written once, in T-B7-37. A task updates a doc only where it says so.
- Results files: `docs/MASTER_PLAN/05_ENGINEERING/results/` does not exist yet (VERIFIED by `ls` on 2026-10-27). The first task that writes a results file, T-B7-20, creates it with `mkdir -p`; later tasks assume it exists.
- Observability: server tasks log through `server/src/ops/log.ts` (T-B6-13) with the redaction rules of BA-09. No log line holds a token, an invite secret, source text, chat text or an address; an address appears only as the salted tag of `relay.js:74`.

---

### T-B7-01 Wire protocol v2: frames, close codes, validators

| Field | Value |
|---|---|
| Subsystem | `src/protocol` (portable) |
| Phase, priority | B7, P0 |
| Dependencies | B3 (T-B3-01 created `src/protocol`), B6 (T-B6-16 added `src/protocol/package.json`), B2 (T-B2-03 canonical JSON and SHA-256) |
| Status | not started |
| Features, requirements | F-118, F-119; R-075, R-082, R-089, R-090; ADR-0501 |

**Intent**
- Problem: the v1 relay protocol has client-chosen peer ids, a client-chosen chat `kind`, peer-supplied snapshots and an opaque `LABS` enum (`server/realtime/src/protocol.js:6,7`). Browser and server must share one frame grammar so a hostile frame is refused by the same code on both sides.
- Target user: the server and the client code of every later task; indirectly Amar and a friend in a room.
- User story: as Amar, nothing a hostile client sends reaches a friend unvalidated.
- Expected behaviour: every client frame is parsed by rebuilding it from known fields; unknown types, oversize, bad JSON and over-deep JSON are refused with a closed error code; server frames have typed shapes the client can narrow.
- Success metric: 100 percent of the frames in RT 7.3 have a type and a parser case; the fuzz test of 10,000 random JSON strings never throws and never returns a frame with an unknown key.

**Implementation**
- Existing files: `src/protocol/errors.ts`, `version.ts`, `index.ts` (T-B3-01: read them, reuse their error type and version constants, do not redefine). Ported rules, not imported: `server/realtime/src/protocol.js:26` (`NAME_JUNK`), `:29` (`CHAT_JUNK`), `:68` (`capText`, grapheme-safe), `:81,87` (`line`, `name`), `:235` (`parseClientFrame`, rebuild from known fields).
- Files: new `src/protocol/frames.ts`, `src/protocol/close-codes.ts`, `src/protocol/validate.ts`; edit `src/protocol/index.ts` (exports only). There is no `chain.ts`: the hash chain is `chainStart` and `chainNext` of `src/project/hash.ts` (T-B2-09, D23), and `protocol` imports `core` only (SYSTEM 5.3), so the frames use the structural `WireOp` and `WireEnvelope` below instead of the project types. The server and `src/collab` pass project `Op` and `OpEnvelope` values where these are expected; `npm run server:typecheck` and `npm run typecheck` prove they fit.
- Modules and signatures:

```ts
// frames.ts
export const WIRE_PROTOCOL = 2 as const;
export const OP_SCHEMA = "1.1" as const;            // D6
export type RoomId = `rm_${string}`; export type Actor = `usr_${string}`; export type DeviceId = `dev_${string}`;
export type Seq = number; export type Time = string;
export type Role = "owner" | "editor" | "commenter" | "viewer";
export type CmdName = "baton.request" | "baton.grant" | "baton.release" | "baton.take" | "host.pass" | "host.claim"
  | "member.kick" | "member.mute" | "room.lock" | "room.settings" | "room.close" | "room.pin";   // runner.set, run.detach: B8
export type ServerFrame = Challenge | Welcome | Snapshot | Tail | Ready | Commit | Reject | Check | Presence
  | Cursors | Chat | RoomEvent | ErrorFrame | Pong | LobbyBuddies | LobbyBuddy | LobbyInvite;
export type ClientFrame = Hello | Submit | Resync | PresenceUp | CursorUp | ChatUp | Cmd | Ping | Bye;
export const CAPS = { clientInflated: 524288, clientWire: 131072, envelope: 65536, snapshotInflated: 6291456,
  snapshotWire: 1048576, otherServer: 262144, gzipAbove: 4096 } as const;     // RT 7.1
export const CLIENT_CAPS = ["gzip", "cursors", "chat", "lobby"] as const;      // "run" is B8
// close-codes.ts
export const CLOSE = { restarting: 1012, busy: 1013, helloTimeout: 4000, superseded: 4001, kicked: 4003, roomFull: 4004,
  unauthorized: 4401, roomUnavailable: 4403, tooLarge: 4413, upgradeRequired: 4426, rateLimited: 4429, roomCorrupt: 4500 } as const;
export type RejectCode = "malformed" | "duplicate_id" | "missing_target" | "missing_pin" | "pin_in_use" | "unknown_definition"
  | "missing_pin_map" | "referenced_by" | "invariant" | "stale_base" | "schema_mismatch" | "permission" | "not_baton" | "quota";   // the codes a `reject` frame carries
export type ErrorCode = "bad_json" | "bad_frame" | "bad_type" | "too_large" | "unauthorized" | "room_unavailable" | "room_full" | "locked"
  | "kicked" | "superseded" | "upgrade_required" | "schema_mismatch" | "not_ready" | "permission" | "not_baton" | "rate_limited" | "quota" | "server_error" | RejectCode;   // server_error: D14
export function closeCodeFor(code: ErrorCode): number | null;     // null: the socket stays open
export function isRetryable(code: ErrorCode): boolean;
// validate.ts
export type Parsed = { ok: true; frame: ClientFrame } | { ok: false; code: ErrorCode; message: string };
export function parseClientFrame(text: string): Parsed;           // never throws
export function parseServerFrame(text: string): ServerFrame | null; // client side; null = ignore and log once
export function sanitizeName(v: unknown): string | null;          // 24 graphemes
export function sanitizeStatus(v: unknown): string | null;        // 80
export function sanitizeChat(v: unknown): string | null;          // 500, CHAT_JUNK stripped, trimmed, null when empty
export function exceedsDepth(text: string, max: number): boolean;  // string scan, no recursion
// wire shapes the project types satisfy (protocol may not import src/project)
export type WireOp = Readonly<Record<string, unknown>>;      // the op body; apply() validates it
export type WireEnvelope = { opId: string; seq: number; base: number; author: { actor: Actor; kind: "user" | "ai" | "system"; proposal?: string }; at: string; batch?: string; op: WireOp };
// chain links: chainStart(projectId) and chainNext(prev, envelope) come from src/project/hash.ts (T-B2-09), not from here
```
- Data model: field names are RT 7.3. `Welcome.room` carries `id, project, title, epoch, seq, chain, state, settings`; `you` carries `actor, m, role, spectator, host`. `Commit.ack` is `{ sub, inverse, dup? }`. `Submit.ops[]` is `{ opId, base, op, kind?: "user" | "ai", proposal? }`. `Cursors.c` is `[m, view, x_mm, y_mm][]`. `Chat.kind` exists on server frames only; `ChatUp` has no `kind`. `Commit.envs` is `WireEnvelope[]` and `Submit.ops[].op` is `WireOp`.
- Input and output schemas: client frames in, `Parsed` out. A frame is rebuilt: only known fields are copied, in a fixed order, never by iterating the input's keys, so `__proto__`, `constructor` and extra keys cannot survive.
- Algorithm: (1) length check against the cap for the frame class; (2) `exceedsDepth(text, 40)`; (3) `JSON.parse` in try; (4) `t` must be a string in the set, else `bad_type`; (5) per-type rebuild. Limits: `submit.ops` 1 to 40 entries (PROPOSAL, matches the 40-op step cap of PDM 7.5); `opId` matches `^op_[a-z0-9][a-z0-9_-]{0,63}$`; `sub` is an integer from 1; `sel` at most 16 ids; `view` at most 72 chars; `x_mm` and `y_mm` finite with absolute value under 1,000,000, quantised to 0.1; `chat.id` at most 64; `lang` 2 to 8 characters; `cmd.args` only the keys that command allows (`to`, `on`, `settings`, `actor`).
- State transitions: none. Pure functions.
- Validation rules and error conditions: `bad_json` (parse), `bad_frame` (a known type with a bad field), `bad_type`, `too_large`. A client frame carrying `author`, `seq`, `at`, `kind: "system"` or `kind: "ai"` on chat is rebuilt without it. `submit.ops[].kind` other than `user` or `ai` is `bad_frame`.
- Edge cases: ZWJ emoji and combining marks count as one grapheme (`Intl.Segmenter`); a lone surrogate is stripped; `ins` text inside a `source.edit` op is not trimmed here (the op validator owns it); an empty `ops` array is `bad_frame`.
- Permissions: none (shape only; roles are T-B7-04).
- Performance: parse and rebuild of a 64 KiB `submit` under 0.5 ms p95 on the CI machine (ESTIMATED; measured in the test and printed).
- Migration: none.

**Verification**
- Unit tests, `src/protocol/frames.test.ts`: `CLOSE` equals the table in RT 7.4 value for value; every `ErrorCode` has a `closeCodeFor` answer and an `isRetryable` answer; `CAPS` values equal RT 7.1. `src/protocol/validate.test.ts`: one valid and one invalid case per client frame type (9 types); `__proto__`, `constructor` and `toString` keys at every level are dropped; depth 41 refused, depth 40 accepted; 128 KiB+1 refused as `too_large`; chat with `kind: "ai"` parses to a frame with no `kind`; name of 25 graphemes is cut at 24 and a ZWJ family emoji counts as one; bidi override characters stripped; 10,000 seeded random strings (fast-check is not required; a seeded PRNG from `src/core/prng.ts`) never throw. The chain functions are tested in T-B2-09; the recomputation with `node:crypto` over 1,000 generated envelopes is in T-B7-06.
- Integration: none (consumed by T-B7-06 and T-B7-11).
- Playwright: none.
- Fixtures: `src/protocol/__fixtures__/frames.json` (one valid frame per type, written by hand from RT 7.3).
- Acceptance, Given/When/Then: Given a `submit` frame whose second op has a `__proto__` key, When `parseClientFrame` runs, Then the result has no `__proto__` own key and `ok` is true or `bad_frame` is returned, never a polluted object. Given a text of 41 nested arrays, When parsed, Then the result is `bad_json` (depth is reported as `bad_json`, not `too_large`).
- Observability: none; the `ErrorCode` set is the vocabulary the server logs and counts.
- Release blockers: a frame type in RT 7.3 without a parser case; `tsc -p tsconfig.portable.json` failing.

**Delivery**
- Definition of done: all tests above pass; no import of `node:*` or DOM in `src/protocol` (checked by `PORT` and by `src/architecture.test.ts` from T-B2-01).
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/protocol`; `npx tsc -p tsconfig.portable.json`.
- Documentation: header comment cites RT 7.3 and 7.4 and lists D6 and D7.
- Rollback: common rule.
- Later tasks need: `ServerFrame`, `ClientFrame`, `CLOSE`, `ErrorCode`, `CAPS`, `parseClientFrame`, `parseServerFrame`, `WireOp`, `WireEnvelope`, `sanitize*`.

---

### T-B7-02 Spike RS-21: browser primitives for rooms

| Field | Value |
|---|---|
| Subsystem | Research (outside `src/`) |
| Phase, priority | B7, P0 (gates the choice made in T-B7-11 and T-B7-12) |
| Dependencies | B3 (T-B3-24 added the WebKit Playwright project and the acceptance walk) |
| Status | not started |
| Features, requirements | RT 21 row RT-3 (renumbered RS-21 here); ADR-0501, ADR-0502 |

**Intent**
- Problem: RT-3 is PENDING. Rooms need three browser features whose behaviour on WebKit and Firefox nobody has measured: a non-extractable P-256 key that signs for a Node verifier, `DecompressionStream("gzip")` read with a byte count, and IndexedDB key storage in a private window (RT 21).
- Target user: the builder of T-B7-11 and T-B7-12, then Amar on a Mac or phone Safari.
- User story: as Amar, I do not find out on a friend's iPad that rooms cannot sign in.
- Expected behaviour: a written report with one verdict per question and numbers.
- Success metric: the three falsifiable questions below each have PASS, FAIL or INCONCLUSIVE with the engine versions.

**Implementation**
- Existing files: `playwright.config.ts:17-35` (engines; B3 adds WebKit), `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-09-op-log-collab/REPORT.md` (the 268 KB gzipped, 1,425 KB raw, 10,000-op tail figures this spike reuses).
- Files: new `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-21-browser-primitives/REPORT.md`, `run.mjs`, `page.html`. Nothing under `src/` or `server/`.
- Falsifiable questions and exit conditions:

| Q | Question | Pass | Fail rule (what T-B7-11 and T-B7-12 do) |
|---|---|---|---|
| Q1 | In Chromium, WebKit and Firefox, does a key made with `crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"}, false, ["sign"])`, stored in IndexedDB and read back, sign `"iynk.ws.v2\n" + aud + "\n" + nonce + "\n" + room` so that Node `crypto.verify("sha256", data, {key, dsaEncoding:"ieee-p1363"}, sig)` returns true, 1,000 times in a row? | 1,000 of 1,000 in all three engines | Engine that fails: `src/server-client` shows "Rooms need Chrome, Edge or Safari" for that engine and T-B7-12 stays unchanged. If Node rejects the P1363 form, T-B7-12 converts with `dsaEncoding: "ieee-p1363"` as RT 4.3 says; if that fails, record it as a blocker and stop |
| Q2 | Does `DecompressionStream("gzip")` read through a counting loop abort a 1 KB gzip that inflates to 1 GiB after at most 8 MiB were read, and inflate a real 1.4 MB tail (the RS-09 10,000-op shape) correctly; and does the output of `CompressionStream("gzip")` for a 100 KB string inflate in Node `zlib.gunzipSync` to the same bytes? | Abort at or before 8 MiB read; output byte-identical to Node `zlib.gunzipSync`; compressed output accepted by Node | The engine that fails gets `caps` without `gzip` in `hello`; the server then sends the same frames as plain text (a snapshot is under the 6 MiB cap by the document limit, and a 1,000-op tail is about 143 KB raw, RS-09) and the 1,000-op / 200 KB resume rule is applied to the plain size |
| Q3 | Do Q1's key storage and Q2 work inside a private (non-persistent) Playwright context in the three engines, and what does each engine do when IndexedDB is blocked? | Works, or throws a catchable error | The app shows "Rooms need a normal window" on a catchable error (RT 21 RT-3 text) |

- Algorithm: `run.mjs` starts a static server for `page.html` on a free port in 40000 to 49999 (not 43117), launches each engine through `@playwright/test`'s browser types (Firefox runs only if it is already installed. `~/Library/Caches/ms-playwright` holds `chromium-*`, `chromium_headless_shell-*`, `ffmpeg-*` and `webkit-*` and no Firefox, VERIFIED by `ls` on 2026-10-27, so on this Mac every Firefox cell is recorded INCONCLUSIVE. The task never runs `npx playwright install` and downloads nothing: keyless rule), runs Q1 to Q3 in the page, posts results to the Node side and prints a JSON table. The Node side verifies Q1 signatures.
- Edge cases: Playwright WebKit on macOS may lack `DecompressionStream` in older builds (EXTERNAL): record the engine version.
- Performance: record the time of 1,000 signatures per engine and the inflate time of the 1.4 MB tail (RS-09 measured Node at 22 ms for the 10,000-op tail, VERIFIED).
- Migration: none.
- Data model and API contract: none (no schema or route is touched). Output schema: `run.mjs` prints one JSON object per engine, `{engine, version, q1: {runs, ok, ms}, q2: {abortedAtBytes, tailEqual, compressedAccepted}, q3: {indexedDbBlocked, keyStored, gzipWorks}}`.
- State transitions: none. Validation: every question has a numeric pass rule (1,000 of 1,000; at most 8 MiB read; byte-identical output). Permissions: none; the run touches only localhost.

**Verification**
- Unit tests: none (a spike).
- Integration: `node docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-21-browser-primitives/run.mjs` exits 0 and prints the table; its output is pasted into `REPORT.md`.
- Playwright: not part of the suite.
- Fixtures: the gzip bomb is generated in `run.mjs` (1 KiB of gzip of zeros); the tail is generated from a seeded PRNG.
- Acceptance: Given the report, When T-B7-11 starts, Then it can say which engines send `gzip` in `caps`; Given Q1 failed in an engine, When T-B7-12 is read, Then the refusal text above is the one used.
- Observability: none.
- Release blockers: none for the gate; an INCONCLUSIVE Firefox is listed in the phase report, not hidden.

**Delivery**
- Definition of done: `REPORT.md` has the three verdicts, engine versions, the command, and the labels VERIFIED or INCONCLUSIVE per cell.
- Verify commands: `node docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-21-browser-primitives/run.mjs`. No `TL` is needed (no source file changed); the builder still runs `npm run typecheck && npm run lint` to show nothing else moved.
- Documentation: the report is the document.
- Rollback: delete the folder.
- Later tasks need: the per-engine `gzip` capability decision (T-B7-11), the Q1 verdict (T-B7-12), the Q3 refusal text (T-B7-05 key `unsupported`; T-B7-05 depends on this task).

---

### T-B7-03 Room tables, repositories and the store seam

| Field | Value |
|---|---|
| Subsystem | `server/src/store`, `server/migrations` |
| Phase, priority | B7, P0 |
| Dependencies | B6 (T-B6-02 `ServerStore`, T-B6-04 `devices`, T-B6-08 `buddies`) |
| Status | not started |
| Features, requirements | F-165, F-116, F-121; R-083; ADR-0004, ADR-0505; RC-02, RC-04, RC-07 |

**Intent**
- Problem: rooms, members, the op log, checkpoints, dedup records, the audit trail and invites must commit together or not at all (RT 11.1). The old relay keeps them in memory and loses them on restart (`server/realtime/src/room.js`).
- Target user: `RoomCore` and the HTTP and socket layers.
- User story: as Amar, a server restart does not end my room.
- Expected behaviour: one migration creates the room tables; repositories expose typed methods over the one `ServerStore` port; every multi-row write runs in one transaction.
- Success metric: the contract tests pass against the SQLite adapter; an append of a group of submissions plus their dedup rows plus one room row update is one transaction (a thrown error in the middle leaves nothing).

**Implementation**
- Existing files (read first, T-B6-02): `server/src/store/port.ts` (`ServerStore { transaction, read, backupTo, ... }`, `Tx { run, get, all }`), `sqlite.ts` (`openStore`, `synchronous=FULL`), `migrate.ts` (reads `server/migrations/NNNN_name.sql`; `migrate()` takes a `dir` option, so it needs no edit), `server/migrations/0001_identity.sql`, `server/test/helpers.ts`. This task edits none of the three store files: `ServerStore.transaction` joins a nested call to the outer transaction, so every repository method is `store.transaction(tx => ...)` and `appendCommits` is one transaction. There is no second transaction API (RC-02: one `ServerStore`).
- Files: new `server/migrations/0002_rooms.sql`, `server/src/store/rooms.ts` (2 source files). `server/test/helpers.ts` is extended as test support (not counted).
- Data model (BACKEND 7.2, DDL copied, integer milliseconds): tables `rooms`, `room_members`, `room_invites`, `ops`, `checkpoints`, `submissions`, `events`, and `blobs(sha256 BLOB PK, bytes BLOB, size, mime, created_at)` and `uploads(device_id, sha256, room_id, at, PK(device_id, sha256))` for T-B7-08. `room_invites` is created here, after `rooms`, with the columns of BACKEND lines 281 to 288 (`id, room_id, creator, secret_hash, kind ('direct' | 'link'), role ('editor' | 'commenter' | 'viewer'), max_uses (1 to 20), uses, expires_at, revoked_at`) plus `target_device TEXT NULL REFERENCES devices(id) ON DELETE CASCADE` for a direct invite (D18: openapi `RoomInvite.buddy` needs a place to live, and the DDL has none). Indexes: `ops(room_id, seq)` is the primary key; `room_members(device_id)`; `room_invites(room_id)`; `events(room_id, n)` is the primary key; `rooms(state, last_active_at)` for the sweep.
- Modules and signatures:

```ts
// rooms.ts
export interface RoomsRepo {
  createRoom(r: NewRoom, genesis: CheckpointRow, creator: MemberRow): RoomRow;      // rooms + room_members + checkpoint 0 + event room.open, one tx
  getRoom(id: RoomId): RoomRow | null;
  listRoomsFor(device: DeviceId): RoomRow[];                                         // only rooms where the device is a member
  countStored(): number; countStoredBy(device: DeviceId): number;
  setState(id: RoomId, state: RoomState, at: number): void;
  patchRoom(id: RoomId, patch: Partial<Pick<RoomRow, "host_actor" | "baton_actor" | "settings" | "pinned" | "epoch">>): void;
  appendCommits(ws: CommitWrite[]): void;       // group commit (each write may carry `acl` patches for `room_members`, applied in the same tx): for each write, ops + one submission (trim to last 8 per device) + events; then rooms.seq/chain/state_hash/last_active_at once; ALL in one tx
  loadTail(id: RoomId, fromExclusive: number, limit: number): OpRow[];
  chainAt(id: RoomId, seq: number): string | null;
  putCheckpoint(c: CheckpointRow): void; latestCheckpoint(id: RoomId, atOrBefore?: number): CheckpointRow | null; pruneCheckpoints(id: RoomId, keep: number): number;
  nullOldPayloads(id: RoomId, keepLatest: number): number;                           // env = NULL, summary columns stay
  member(id: RoomId, device: DeviceId): MemberRow | null; members(id: RoomId): MemberRow[];
  upsertMember(m: MemberRow): void; patchMember(id: RoomId, device: DeviceId, p: Partial<Pick<MemberRow, "role" | "spectator" | "muted" | "banned" | "name" | "color">>): void; removeMember(id: RoomId, device: DeviceId): void;
  findSubmission(id: RoomId, device: DeviceId, firstOpId: string): SubmissionRow | null;
  addInvite(i: InviteRow): void; inviteBySecret(hash: Uint8Array): InviteRow | null; inviteById(id: string): InviteRow | null; useInvite(id: string, now: number): boolean; unuseInvite(id: string): void; revokeInvite(id: string, now: number): void; listInvites(room: RoomId): InviteRow[]; countActiveInvites(room: RoomId, now: number): number;
  addEvent(id: RoomId, at: number, kind: string, actor: Actor | null, data: object): void; events(id: RoomId, afterN: number, limit: number): EventRow[];
  deleteRoom(id: RoomId): void;                                                      // cascade rows; blobs by T-B7-08's sweep
  removeCrossMembers(a: DeviceId, b: DeviceId): RoomId[];                            // unpair: delete b's member rows in rooms a created and a's rows in rooms b created; returns the rooms touched
  deleteInvitesBetween(a: DeviceId, b: DeviceId): number;                            // direct invites from one to the other, both directions; link invites stay
  sweep(now: number, closedRetentionMs: number, idleExpireMs: number): { closed: number; erased: number };
}
export function createRoomsRepo(store: ServerStore): RoomsRepo;
```
- Input and output schemas: row types mirror the DDL. `settings` is JSON text validated on read against `RoomSettings` (openapi). `doc` in `checkpoints` is gzip of canonical JSON (`zlib.gzipSync`).
- Algorithm and state transitions: room states `open`, `locked`, `idle`, `closed`, `corrupt` (RT 5.1). `setState` rejects a transition not in the diagram (closed to open only through `reopen` within 30 days; corrupt to open only through a restore). `sweep` moves `idle` rooms with no activity for 30 days to `closed`, and erases `closed` rooms older than `closedRetentionMs` (30 days).
- Validation and errors: foreign-key and CHECK failures throw `StoreError("constraint", table)`; the repo never swallows them. `appendCommits` throws if the first `seq0 !== rooms.seq + 1` or a later write does not continue the previous (a gap would break the chain).
- Edge cases: `useInvite` is one `UPDATE ... WHERE uses < max_uses AND revoked_at IS NULL AND expires_at > ?` returning the changed-row count, so two simultaneous redemptions cannot exceed `max_uses`. A device that is both `banned` and holding a valid invite is refused by the caller, not the repo.
- Permissions: none here; callers check.
- Performance: `appendCommits` of one 40-op batch under 2 ms on `:memory:` and under 10 ms p99 on a file with `synchronous=FULL` on this Mac (RT-1/BA-05 target; the Linux number is UNKNOWN and is For Amar).
- Migration: `server/migrations/0002_rooms.sql` runs after B6's `0001_identity.sql` (BACKEND 7.3 numbering is B6's `NNNN_name.sql`). It also creates `blobs` and `uploads` (BACKEND 7.2), because the asset route (T-B7-08) and the share store (T-B7-09) both need them and they must not depend on each other. `0003_shares.sql` (`shares`, `share_blobs`, T-B7-09) and `0004_scores.sql` (`scores`, T-B7-10) are reserved. No data is migrated (no rooms exist today).
- State transitions: room state changes only through `setState` with the transition table of RT 5.1; an invite goes `open` to `used_up`, `revoked` or `expired` (computed on read).

**Verification**
- Unit tests, `server/test/store-rooms.test.ts` (the repository contract): create and read a room; checkpoint 0 exists and `seq = 0`; `appendCommits` with three writes commits all three or none; a forced throw inside the transaction (a CHECK violation on the 3rd op) leaves `rooms.seq` and `ops` unchanged; `submissions` keeps only the last 8 per device; `nullOldPayloads(…, 20000)` nulls `env` but keeps `author_actor`, `kind`, `target`, `at`, `chain`; `useInvite` called 5 times on `max_uses = 1` succeeds once; `sweep` closes and erases per the 30-day rule using an injected `now`; `listRoomsFor` never returns a room the device is not in; deleting a device cascades its `room_members` and `submissions`; `removeCrossMembers(a, b)` deletes b's rows in rooms a created and a's rows in rooms b created and nothing else, and called inside a `store.transaction` that then throws it leaves every row; `deleteInvitesBetween` removes direct invites both ways and keeps link invites.
- `server/test/migrate-rooms.test.ts` (B6 owns `migrate.test.ts`): applying 0001 then 0002 on an empty file works and the table list equals the DDL; the rows of 0001 survive; a changed checksum of 0002 is refused by the `migrate()` of T-B6-02; applying twice is a no-op.
- Integration: `server/test/helpers.ts` (T-B6-02 owns it; this task extends it, and later tasks import it and do not edit it): `createTestStore()` is `memoryStore()` with every migration in `server/migrations/`; `enrolFake(store, name)` returns `{ device, keyPair, token }` by calling the T-B6-04 functions in `server/src/identity/` in process (keys from `server/test/keys.ts` `makeDeviceKey()`); `pairFake(store, a, b)` inserts the `buddies` row with `a < b`.
- Playwright: none. Fixtures: none.
- Acceptance: Given a created room, When the process restarts (close and reopen the file), Then `getRoom`, the checkpoint and the tail are identical. Given `max_uses = 1`, When two redemptions race, Then exactly one returns true.
- Observability: the repo does not time itself; T-B7-06 times each `appendCommits` call and feeds `iynk_commit_seconds`.
- Release blockers: any query that can return another device's room; an `appendCommits` that is not one transaction.

**Delivery**
- Definition of done: tests pass on the SQLite adapter; the file header lists the reserved migration numbers.
- Verify commands: `npm run typecheck && npm run lint`; `npm run server:typecheck`; `cd server && node --test test/store-rooms.test.ts test/migrate-rooms.test.ts`; `npm run server:test` (whole suite including B6 contract tests).
- Documentation: none.
- Rollback: common rule.
- Later tasks need: `RoomsRepo`, `createRoomsRepo`, the extended `server/test/helpers.ts`.

---

### T-B7-04 Permission matrix, collaboration limits and route buckets

| Field | Value |
|---|---|
| Subsystem | `server/src/rooms`, `server/src/http`, `server/src` |
| Phase, priority | B7, P0 |
| Dependencies | B2 (generated op types, `project.schema.json` kinds), B6 (T-B6-07 `classes.ts` and `limits.ts`) |
| Status | not started |
| Features, requirements | F-119, F-120, F-122; R-075, R-093, R-094, R-097; ADR-0504, ADR-0510; RA-12 |

**Intent**
- Problem: the old relay enforces no role (`server/realtime/src/relay.js:383-388`); the baton is a client-side flag (`src/lib/realtime/room.ts:586-598`, R6). Every op and command needs one permission decision, in one place, tested against the schema.
- Target user: `RoomCore`, the command handlers, the socket dispatcher.
- User story: as Amar, a viewer cannot delete my parts and a non-holder cannot type in my code.
- Expected behaviour: `authorizeOp` answers ok, `permission` or `not_baton` for each of the 64 op kinds; `authorizeCmd` answers per RT 6.2; limits come from one typed config with RT 16.1 defaults.
- Success metric: the generated test classifies all 64 kinds from `project.schema.json` and fails the build if a kind is unclassified (RA-12).

**Implementation**
- Existing files: `04_ARCHITECTURE/schemas/project.schema.json` (`$defs/Op`, 64 `oneOf` branches, VERIFIED by count), RT 6.2 table, `server/src/http/classes.ts` and `limits.ts` (T-B6-07).
- Files: new `server/src/rooms/op-classes.ts`, `server/src/rooms/permissions.ts`, `server/src/collab-config.ts`; edit `server/src/http/classes.ts` and `server/src/http/limits.ts` (5 files). The bucket edit sits here, in group 1, because the route tasks of groups 2 to 6 export `RouteDef`s that name these buckets and must typecheck when they land.
- Modules and signatures:

```ts
// op-classes.ts
export type OpKind = /* the 64 kinds, generated type from T-B2-04 */ string;
export type OpClass = "graph" | "sim" | "source" | "owner";
export const OP_CLASS: Readonly<Record<OpKind, OpClass>>;
// graph: meta.set board.* component.* net.* view.* wire.* group.* junction.* label.* mech.* param.* test.* asset.* dep.* guide.set domain.*
// sim: sim.set runtime.* input.* script.set fault.* instrument.*
// source: source.add source.remove source.rename source.edit
// owner: access.grant access.revoke access.set actor.set actor.remove license.set provenance.set   (provenance.set: D9)
// permissions.ts
export type Subject = { role: Role; spectator: boolean; actor: Actor; host: boolean; creator: boolean; baton: Actor | null; codeMode: "baton"; muted: boolean };
export type Verdict = { ok: true } | { ok: false; code: "permission" | "not_baton" };
export function authorizeOp(s: Subject, kind: OpKind, origin: "client" | "server"): Verdict;
export function authorizeCmd(s: Subject, name: CmdName, target?: { actor: Actor; role: Role }): Verdict;
export function authorizeChat(s: Subject): Verdict;            // muted: permission
export function authorizeCursor(s: Subject, spectatorCursors: boolean): Verdict;
// collab-config.ts
export type CollabLimits = { maxLiveRooms: number; maxStoredRooms: number; maxMembers: number; maxSpectators: number; maxProjectBytes: number;
  roomsPerMinute: number; roomsPerHour: number; storedRoomsPerDevice: number; activeInvitesPerRoom: number; inviteTriesPerHour: number;
  submitPerSec: number; submitBurst: number; pendingPerSocket: number; chatPerSec: number; chatBurst: number; chatMax: number;
  cursorHz: number; cursorBurst: number; presencePerSec: number; framesPerSec: number; floodDrops: number; floodWindowMs: number;
  helloTimeoutMs: number; heartbeatMs: number; deadPeerMs: number; lossyBufferedBytes: number; maxBufferedBytes: number;
  authFailuresPerMin: number; authLockoutMs: number; checkEveryOps: number; checkEveryMs: number;
  checkpointEveryOps: number; checkpointEveryMs: number; keepCheckpoints: number; keepPayloadOps: number; resumeTailOps: number; resumeTailGzipBytes: number;
  idleEvictMs: number; closedRetentionDays: number; shareDefaultDays: number; shareMaxDays: number | null; maxShareBytes: number; liveSharesPerIdentity: number;
  sharesStoredPerDevice: number; deviceQuotaBytes: number; assetBytes: number; allowLinks: boolean };
export function loadCollabLimits(env: Record<string, string | undefined>): CollabLimits;   // throws ConfigError naming the variable
```
- Route buckets: `BucketName` in `classes.ts` (T-B6-07, a closed union) gains `asset.write`, `share.read`, `room.write`, `room.create`, `room.invite.redeem` and `room.read`. `RouteClass` is unchanged: B7 routes are `device`, except `openShare` and `getSharedAsset`, which are `capability` (they take an optional bearer, read by the handler). The default table in `limits.ts` is a `Record<BucketName, Rule[]>`, so it changes in the same commit with the rules of API_CONTRACTS 4.3 and `x-iynk-rate-limit-buckets` in openapi (VERIFIED at `schemas/openapi.yaml:4646-4669`): `asset.write` 60 per minute per device (the 512 MiB per hour part is counted in T-B7-08 from stored sizes, because the limiter counts requests); `share.read` 120 per minute per address; `room.write` 30 per minute per device; `room.create` 6 per minute and 30 per hour per device plus 6 per minute per address; `room.invite.redeem` 5 per hour per device, taken once per attempt (D26); `room.read` 60 per minute per device. T-B7-32 only registers routes.
- Data model: defaults are RT 16.1 and RT 17.2 exactly: 20 live rooms, 100 stored, 8 members, 8 spectators, 5,242,880 bytes, 6 rooms per minute, 30 per hour, 10 stored per device, 20 active invites, 5 tries per hour, submissions 20 per second burst 40, pending 4, chat 2 per second burst 5 and 500 graphemes, cursors 15 Hz burst 10, presence 5 per second, 60 frames per second, 600 drops in 5 s, hello 10 s, heartbeat 15 s, dead peer 45 s, lossy 262,144 and cut 4,194,304 bytes, 5 auth failures per minute then 5 minutes, check every 100 ops or 30 s, checkpoint every 500 ops or 10 minutes, keep 8, payloads for 20,000 ops, resume tail 1,000 ops and 204,800 bytes, evict idle rooms after 10 minutes, closed rooms kept 30 days, share default 30 days, share maximum 365 days (`IYNK_SHARE_TTL_DAYS`, `0` means no maximum, so `null`), 16 MiB per share, 20 live shares per identity (D8), 200 stored shares per device, 256 MiB per device, 16,777,216 bytes per asset.
- Environment variables read: `IYNK_MAX_LIVE_ROOMS`, `IYNK_MAX_STORED_ROOMS`, `IYNK_MAX_MEMBERS`, `IYNK_MAX_SPECTATORS`, `IYNK_MAX_PROJECT_BYTES`, `IYNK_SHARE_TTL_DAYS`, `IYNK_MAX_SHARE_BYTES`, `IYNK_ALLOW_LINKS`, `IYNK_STORE_SYNC` is B6's. A non-integer, a value below its floor or above its ceiling (members above 8, project bytes above 5,242,880) throws `ConfigError("IYNK_MAX_MEMBERS must be an integer from 2 to 8")`.
- Algorithm: `authorizeOp`: `origin === "server"` skips the role check only for the classes the server emits (`owner` class `actor.set`, `access.grant`, with author kind `system`); a client `owner`-class op needs role `owner`; `graph` and `sim` need `owner` or `editor` and not `spectator`; `source` needs `owner` or `editor`, and `s.baton === s.actor` (otherwise `not_baton`). Commenter and viewer get `permission` for every op class. `authorizeCmd` follows RT 6.2: kick, lock, mute, settings, close, `baton.grant` by non-holder host, `baton.take`: host only; `host.pass`: host; `host.claim`: creator; `room.pin`: host; `baton.request`: editor or owner; `baton.grant`: holder or host; `baton.release`: holder. A command that targets the host's actor (kick) is refused for any non-creator.
- Edge cases: a kind the table does not know returns `permission` (fail closed). A spectator who is also role `editor` cannot exist (spectator means role `viewer`); the function still returns `permission`.
- Performance: constant-time lookup.
- Migration: none.
- State transitions: none (pure functions). Validation: an unknown op kind or command fails closed with `permission`; a config value below its floor or above its ceiling throws. Permissions: this task is the permission table; the rules are in the algorithm above.

**Verification**
- Unit tests, `server/test/permissions.test.ts` (RA-12): reads `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/project.schema.json` and builds the kind list; fails if `OP_CLASS` lacks a kind or has a kind the schema lacks; for each of 64 kinds and each of owner, editor, commenter, viewer, spectator, non-holder editor and `origin: "server"`, compares with a hand-written expectation table of the 4 classes; `actor.set`: owner and server accepted, editor, commenter, viewer `permission`; `source.edit` by baton holder accepted, by another editor `not_baton`, by viewer `permission`. `authorizeCmd` over every `CmdName` and role against the RT 6.2 table. `server/test/collab-config.test.ts`: defaults equal the list above; `IYNK_MAX_MEMBERS=9` throws naming the variable; `IYNK_SHARE_TTL_DAYS=0` gives `null`. `server/test/collab-buckets.test.ts`: every bucket added here is in `BucketName` and has a default rule equal to the list above; B6's `limits.test.ts` and `router.test.ts` still pass.
- Integration: none yet. Playwright: none.
- Fixtures: none.
- Acceptance: Given a viewer, When `authorizeOp(viewer, "component.add", "client")` runs, Then `permission`. Given an editor who is not the holder, When `source.edit`, Then `not_baton`. Given a new op kind added to the schema, When the test runs, Then it fails until the kind is classified.
- Observability: none (pure).
- Release blockers: an unclassified kind; any default that differs from RT 16.1 without a line in this file.

**Delivery**
- Definition of done: tests pass.
- Verify commands: `npm run typecheck && npm run lint`; `npm run server:typecheck`; `cd server && node --test test/permissions.test.ts test/collab-config.test.ts test/collab-buckets.test.ts`; `npm run server:test`.
- Documentation: none.
- Rollback: common rule.
- Later tasks need: `authorizeOp`, `authorizeCmd`, `authorizeChat`, `authorizeCursor`, `Subject`, `CollabLimits`, `loadCollabLimits`, the six new `BucketName` values.

---

### T-B7-05 Room, share and board strings in six languages

| Field | Value |
|---|---|
| Subsystem | `src/i18n` |
| Phase, priority | B7, P1 |
| Dependencies | B4 (T-B4-01 created `studio.json` in six languages), B0 (`flight.json` exists), T-B7-02 (the Q1 and Q3 refusal texts for `studio.rooms.unsupported`) |
| Status | not started |
| Features, requirements | F-116, F-117, F-120, F-122, F-089, F-140; R-084, R-088, R-092, R-093, R-094; K-I18N, K-A11Y |

**Intent**
- Problem: seven UI tasks need strings. If each adds keys, the same six-language files would be edited by several tasks at once.
- Target user: a friend who reads German, Spanish, French, Hindi or Chinese.
- User story: as a friend, the room banner and baton text are in my language, and states are words, not only colour.
- Expected behaviour: every key the room and share UI uses exists in `studio.json` under a `rooms` object; every key the lap board uses exists in `flight.json` under a `board` object. English defines the keys; the other five languages have the same keys.
- Success metric: `src/i18n/messages.test.ts` (it iterates the namespaces, line 21) passes; the new copy test passes.

**Implementation**
- Existing files: `src/i18n/messages.test.ts:6,21` (parity over `NAMESPACES`), `src/i18n/messages/en/together.json` (key style; its `bar.*` keys stay and the invite dialog keeps using them), `src/i18n/messages/en/flight.json` (already passed to `FlyWorkspace` as the `flight` prop and read with `createTranslator(lang, flight, "flight")`, `FlyWorkspace.tsx:ft`), `studio.json` (T-B4-01). Studio components get strings as props from the static page (ADR-0408), so no new namespace and no new provider is needed: this is why the keys go into two existing namespaces.
- Files: edit `src/i18n/messages/{en,de,es,fr,hi,zh}/studio.json` (counted as one) and `src/i18n/messages/{en,de,es,fr,hi,zh}/flight.json` (counted as one). New test `src/i18n/rooms-copy.test.ts`.
- Key groups. Each later task uses only its group, so nothing is added later:

| Group (object) | Keys |
|---|---|
| `studio.rooms.banner` | `live`, `connecting`, `syncing`, `reconnecting`, `offlineKept` ("Room is offline, your changes are kept"), `queueFull` ("{count} changes are waiting. Room editing is paused; your local copy is safe."), `ended`, `kicked`, `closed`, `readOnlyShare`, `readOnlyRole`, `unsupported`, `serverRestarted`, `behind` |
| `studio.rooms.members` | `title`, `count.one/other`, `you`, `host`, `holder`, `online`, `offline`, `spectator`, `role.owner/editor/commenter/viewer`, `appVersion`, `cursorOf` ("{name}'s pointer") |
| `studio.rooms.baton` | `youHold`, `heldBy`, `free`, `request`, `grant`, `take`, `release`, `asked`, `denied`, `freeIn` ("{name} left. The keyboard is free in {seconds} s.") |
| `studio.rooms.host` | `kick`, `kickConfirm`, `mute`, `unmute`, `lock`, `unlock`, `close`, `closeConfirm`, `pass`, `claim`, `settings`, `runControl`, `spectatorCursors` |
| `studio.rooms.invite` | `open`, `titleFor`, `hint`, `roleEditor`, `roleViewer`, `uses`, `expires`, `revoke`, `sent`, `join`, `decline`, `expired` (one generic text, no reason), `workTogether`, `pickBuddy`, `noBuddies` |
| `studio.rooms.chat` | `title`, `placeholder`, `send`, `rateLimited`, `muted`, `system` |
| `studio.rooms.rebase` | `title`, `dropped` ("{who} deleted {what} while you were offline, so your change to {what} was dropped"), `droppedGeneric`, `keepCopy`, `copyKept`, `none` |
| `studio.rooms.fork` | `closedTitle`, `keepCopy`, `kept`, `ffNote`, `separateCopy` |
| `studio.rooms.share` | `title`, `audienceLink`, `audienceBuddies`, `expiry30`, `expiryNone`, `expiryDays`, `linkWarning`, `create`, `copy`, `revoke`, `needsServer`, `makeCopy`, `copyDone`, `withdrawn`, `tooLarge`, `secretWarning`, `liveLimit`, `opened` |
| `studio.rooms.unsupported` | the T-B7-02 refusal texts (engine, private window) |
| `flight.board` | `title`, `optIn`, `optInHint`, `empty`, `needsServer`, `signedOut`, `you`, `rank`, `bestOnly`, `claimed`, `remove`, `retry` |

- Rules for the copy: plain words, no "validated", no em dashes; every state is words (R-084: "who is present, who holds the baton, connection state"; K-A11Y: not colour only); counts use `{count}`; no sentence is built by joining translated pieces (ADR-0408 decision 4).
- Data model, schemas, API contracts, algorithm: none. Validation: the parity test.
- Edge cases: plural forms use the `one` and `other` object form of `together.json` `bar.people`; Hindi and Chinese keep both keys so parity holds.
- Permissions: none. Performance: ESTIMATED under 4 KB gzipped added per language (ADR-0408 budgets 15 KB for `studio`). Migration: none.
- Modules and algorithm: none (data only). State transitions: none.

**Verification**
- Unit tests: `src/i18n/messages.test.ts` (existing) passes; `src/i18n/rooms-copy.test.ts` (new): no value under `studio.rooms` or `flight.board` in any language contains an em dash or the word "validated" (case-insensitive); every `{param}` in the English value appears in each translation; every key listed in the table exists in English.
- Integration, Playwright, fixtures: none.
- Acceptance: Given the six `studio.json` files, When the parity test runs, Then the key sets are identical. Given `invite.expired`, When read in any language, Then it is one text that does not say why (a stranger learns nothing, R-076).
- Observability: none. Release blockers: a missing key in any language.

**Delivery**
- Definition of done: tests pass; the table above is copied into the commit body so each later task can find its keys.
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/i18n`.
- Documentation: none. Rollback: common rule.
- Later tasks need: the key groups above; they read them through the translator the B4 components already use.

---

### T-B7-38 Shared-code, dependency and client seams for B7

| Field | Value |
|---|---|
| Subsystem | `src/project`, `src/server-client`, `server`, `deploy` |
| Phase, priority | B7, P0 |
| Dependencies | B6 (T-B6-15 `src/core` stub, T-B6-16 `src/protocol` stub, T-B6-05 `ServerClient`, T-B6-12 `Dockerfile.server`), B2 (`src/project/apply`, `validate`, `hash`, `limits`) |
| Status | not started |
| Features, requirements | F-165, F-198; R-082, R-095; BA-02; ADR-0014 |

Added by the 2026-10-27 review (finding 2, plus the `ws`, image and `fetchAuthed` gaps found while fixing it). It holds the four small seams the other B7 tasks need before group 2.

**Intent**
- Problem: (1) the server must run `src/protocol/{frames,validate,close-codes}.ts` and `src/project/{apply,validate,hash,limits}` under plain Node; B6 proved only `src/core` and `src/protocol/identity.ts`, and `src/project` has no `package.json` stub, so Node prints `MODULE_TYPELESS_PACKAGE_JSON` (B6 finding F2). (2) The socket server needs the `ws` package, but B6 rule 4.2 says the server has no run-time dependency. (3) `Dockerfile.server` copies only `src/core` and `src/protocol`. (4) `ServerClient` has no generic request method, so rooms, shares and scores cannot call their routes.
- Target user: every later B7 task.
- User story: as an agent, I import `../../src/project/apply/index.ts` from the server and it runs.
- Expected behaviour: the stubs, the dependency, the image copy lines and two client methods exist, each with a test that fails when it is missing.
- Success metric: the probe test below passes with empty stderr; `npm run server:typecheck` passes with the new imports; the Docker copy list equals the import closure.

**Implementation**
- Existing files: `src/core/package.json` and `src/protocol/package.json` (T-B6-15, T-B6-16: exactly `{"type":"module"}`), `server/test/shared-import.test.ts` and `server/test/fixtures/import-core.ts` (T-B6-15: the pattern to copy), `server/package.json` (T-B6-01b), `deploy/Dockerfile.server` (T-B6-12: copies `server/package.json`, `server/package-lock.json`, runs `npm ci --omit=dev`, copies `server/src`, `server/bin`, `server/migrations`, `src/core`, `src/protocol`), `src/server-client/client.ts` (T-B6-05), `server/realtime/package.json` (VERIFIED: `ws` 8.22.0).
- Files: new `src/project/package.json` (exactly `{"type":"module"}`); edit `server/package.json` (with its lockfile, one file: add `ws` 8.22.0 as an exact-version run-time dependency and no other), `deploy/Dockerfile.server`, `src/server-client/client.ts`. Four source files. If the probe below reaches `src/parts`, the same task adds `src/parts/package.json` (the stub is a fifth file, decided by the test, not by the builder's judgement: the test fails until the stub exists).
- Modules and signatures:

```ts
// src/server-client/client.ts (additions to ServerClient)
fetchAuthed(path: string, init?: RequestInit): Promise<Response>;   // bearer from memory, one re-sign on 401 as the other methods do, then NeedsEnrolment; path is relative to the server base
fetchAnon(path: string, init?: RequestInit): Promise<Response>;     // no Authorization header; used by the share open path
```
- Algorithm:
  1. `server/test/fixtures/import-project.ts` imports, by relative `.ts` path, `src/project/apply/index.ts`, `src/project/validate.ts`, `src/project/hash.ts` and `src/project/limits.ts` and prints one line. `server/test/shared-import-project.test.ts` spawns plain `node` (no flags) on it and asserts empty stderr and the expected stdout. Before the stubs it fails with the `MODULE_TYPELESS_PACKAGE_JSON` warning; that is the red step. (`src/protocol/{frames,validate,close-codes}.ts` are created by T-B7-01 in the same group, so T-B7-06, the first server consumer, adds those three imports to the fixture in its own commit.)
  2. The same test scans the fixture's import closure with a small regular-expression import walker (relative specifiers only) and asserts that the set of `src/` top folders equals the list in `COPY_FOLDERS` inside the test (`core`, `project`, `protocol`, plus `parts` if reached), and that `deploy/Dockerfile.server` contains a `COPY` line for each of them. One list, two checks.
  3. `server/package.json` gains `"dependencies": { "ws": "8.22.0" }`; the lockfile is regenerated with `npm install --package-lock-only` inside `server/` (no network is needed beyond the registry the lock already names; the builder runs it once, offline mode is not required). `server/test/deps.test.ts` asserts `dependencies` has exactly the key `ws` with that version and no `^`.
  4. `fetchAuthed` and `fetchAnon` are added to `ServerClient` and to its fake in the existing client tests.
- Edge cases: `src/project/apply` may import `src/parts`; the closure test decides. `fetchAnon` must not send `Authorization` even if a session exists.
- Validation and errors, permissions, performance, migration, data model, API contract: none.

**Verification**
- Unit tests: `server/test/shared-import-project.test.ts`, `server/test/deps.test.ts`, `src/server-client/client.test.ts` (extend: `fetchAuthed` sends the bearer and retries once on 401; `fetchAnon` sends none; both resolve a relative path against the base).
- Integration: `npm run server:typecheck` with the fixture's imports; `npx vitest run src/architecture.test.ts` (the matrix allows `server` to import `project`, and FA-01 allows `server/` to import `src/project/apply`, T-B2-10).
- Playwright: none. Fixtures: `server/test/fixtures/import-project.ts`.
- Acceptance: Given the stubs, When plain `node` runs the fixture, Then stderr is empty. Given a new shared folder imported by the fixture, When the Dockerfile lacks its `COPY`, Then the test fails.
- Observability: none. Release blockers: a `MODULE_TYPELESS_PACKAGE_JSON` line; a shared folder missing from the image.

**Delivery**
- Definition of done: tests pass; `KL NEXT_DIST_DIR=.next-build npm run build` still passes (a `package.json` inside `src/project` must not change how Next builds the app, the same check T-B6-15 made for `src/core`).
- Verify commands: `npm run typecheck && npm run lint`; `npm run server:typecheck`; `cd server && node --test test/shared-import-project.test.ts test/deps.test.ts`; `npx vitest run src/server-client src/architecture.test.ts`; `npx tsc -p tsconfig.portable.json`; the build command above.
- Documentation: none (T-B6-15 owns the ADR-0014 note on relative imports). Rollback: common rule. Later tasks need: the stubs, `ws`, `fetchAuthed`, `fetchAnon`, the image copy lines.

---

### T-B7-39 Unpair hook: one seam for rooms, invites and the lobby

| Field | Value |
|---|---|
| Subsystem | `server/src/buddies`, `server/src/http`, `server/src` |
| Phase, priority | B7, P0 |
| Dependencies | B6 (T-B6-09 `removeBuddy`, T-B6-17 `RouteDeps`) |
| Status | not started |
| Features, requirements | F-138, F-206; R-080, R-081; CM-06 |

Added by the 2026-10-27 review (finding 16): the earlier draft said unpair "calls registered hooks inside its transaction when it has one, else right after". That is decided here.

**Intent**
- Problem: CM-06 says removing a buddy ends the removed person's rooms, shares and board rows. B6's `removeBuddy(tx, viewer, identityId)` deletes the pair and does nothing else, and its caller `http/buddies.ts` has no way to run more code.
- Target user: Amar and a friend who is removed.
- User story: as Amar, when I remove a buddy they lose my rooms and invitations at once, or nothing changes at all.
- Expected behaviour: `removeBuddy` takes an optional hook. The hook runs inside the same transaction, after the pair row is deleted; whatever it throws rolls the whole removal back. The hook may return a function; the route runs that function after COMMIT (close sockets, tell the lobby).
- Success metric: with a hook that throws, the `buddies` row is still there and the answer is a server error; with a hook that works, the pair, the cross memberships and the direct invites are gone together.

**Implementation**
- Existing files: `server/src/buddies/visibility.ts` (T-B6-09: `removeBuddy(tx, viewer, identityId): boolean`, idempotent), `server/src/http/buddies.ts` (T-B6-09: the `removeBuddy` route), `server/src/app.ts` (T-B6-17: `RouteDeps`).
- Files: edit `server/src/buddies/visibility.ts`, `server/src/http/buddies.ts`, `server/src/app.ts` (`RouteDeps` only).
- Modules and signatures:

```ts
// visibility.ts
export type BuddyRemovalHook = (tx: Tx, a: string /* device id */, b: string /* device id */) => void | (() => void);
export function removeBuddy(tx: Tx, viewer: Authed, identityId: string, onRemoved?: BuddyRemovalHook): { removed: boolean; after: (() => void) | null };
// app.ts: RouteDeps gains `buddyRemoval?: BuddyRemovalHook`  (set by T-B7-32; absent in B6 tests)
// http/buddies.ts: the DELETE route calls store.transaction(tx => removeBuddy(tx, viewer, id, ctx.buddyRemoval)), then runs `after` once, outside the transaction
```
- Algorithm: `removeBuddy` resolves the two device ids from the `buddies` row; if a row existed it deletes it, then calls `onRemoved(tx, a, b)` once and returns its function as `after`. If no row existed it calls nothing and answers as before (still 204, no oracle). `removed` is true only when a row was deleted. The route answers 204 in both cases and runs `after` only when set. A throw inside `onRemoved` propagates out of `store.transaction`, which rolls back, and the route answers 500 `internal`.
- State transitions: active to removed. Validation, permissions, performance, migration: unchanged from B6.
- Edge cases: both sides remove at once (the second call finds no row and calls no hook); `after` throwing is logged and does not change the 204.
- Data model, API contract: none new (openapi `removeBuddy`).

**Verification**
- Unit tests: `server/test/unpair-hook.test.ts`: a hook is called once with the two device ids, inside the transaction (a write by the hook is rolled back when the hook then throws, and the `buddies` row is still present); the hook is not called for a stranger or a repeat removal; `after` runs after COMMIT (a read in `after` sees the pair gone); the response bytes for a real buddy and a random id stay identical (CM-04 unchanged). The existing `visibility.test.ts` and `buddies.http.test.ts` still pass.
- Integration: the full CM-06 case (rooms, invites, sockets) runs in T-B7-32. Playwright: none. Fixtures: none.
- Acceptance: Given a throwing hook, When a buddy is removed, Then the buddy row is unchanged. Given a working hook, When a buddy is removed, Then `after` runs once.
- Observability: `buddy_removed` line unchanged (no ids). Release blockers: a hook that runs outside the transaction; an `after` that runs before COMMIT.

**Delivery**
- Definition of done: tests pass; B6's visibility tests unchanged and green.
- Verify commands: `npm run typecheck && npm run lint`; `npm run server:typecheck`; `cd server && node --test test/unpair-hook.test.ts test/visibility.test.ts test/buddies.http.test.ts`; `npm run server:test`.
- Documentation: none. Rollback: common rule. Later tasks need: `BuddyRemovalHook`, `RouteDeps.buddyRemoval` (filled by T-B7-32 with the registry and lobby, built in T-B7-18 and T-B7-21).

---

### T-B7-06 `RoomCore`: submit, group commit, reject, dedup, inverse, chain

| Field | Value |
|---|---|
| Subsystem | `server/src/rooms` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-01, T-B7-03, T-B7-04, T-B7-38; B2 `apply` |
| Status | not started |
| Features, requirements | F-119, F-121; R-075, R-086, R-089, R-090; ADR-0423, ADR-0500; RA-03 |

**Intent**
- Problem: `onAction` appends any JSON up to 64 KB with no validation, no dedup and no rejection (`server/realtime/src/relay.js:383-388`). The room must be the one place that orders, validates and records edits.
- Target user: every member of a room.
- User story: as Amar, when my buddy and I edit the same part, the server decides the order, refuses what no longer makes sense, and we both end with the same document.
- Expected behaviour: a pure, transport-free class. Input is `(member, frame)`; output is a list of `(recipient, frame)`. A submission is deduplicated, authorised, applied on a working copy, checked for invariants, written in one group transaction, and acknowledged only after COMMIT.
- Success metric: server cost of one accepted op p99 under 5 ms with 8 members on `:memory:` (RB-1; the RS-09 core did 52,000 to 57,700 ops/s, VERIFIED); T-B7-20 and T-B7-33 pass.

**Implementation**
- Existing files: `src/project/apply/index.ts` (T-B2-05 to 07), `validate.ts` (T-B2-08), `hash.ts` (T-B2-09), `src/protocol/*` (T-B7-01), all reached from `server/` by relative `.ts` paths (section 2; T-B7-38 added the `src/project` stub; this task adds `src/protocol/{frames,validate,close-codes}.ts` to the probe fixture `server/test/fixtures/import-project.ts` and its test `shared-import-project.test.ts`, T-B7-38), `server/src/rooms/permissions.ts` (T-B7-04), `server/src/store/rooms.ts` (T-B7-03). Model to port: `08_RESEARCH_SPIKES/RS-09-op-log-collab/src/server.js` (91 lines) and `dedup-unit.js` (32 lines).
- Files: new `server/src/rooms/core.ts`, `commit.ts`, `dedup.ts`, `types.ts`.
- Modules and signatures:

```ts
// types.ts
export type MemberRef = { m: number; device: DeviceId; actor: Actor; role: Role; spectator: boolean; name: string; color: string; muted: boolean; ready: boolean };
export type Target = { kind: "member"; m: number } | { kind: "room"; except?: number };
export type Outbound = { to: Target; frame: ServerFrame } | { to: { kind: "member"; m: number }; close: number; frame?: ServerFrame };
export type RoomInit = { id: RoomId; projectId: string; epoch: string; doc: ProjectDocument; seq: number; chain: string; host: Actor | null; baton: Actor | null;
  settings: RoomSettings; state: "open" | "locked" };
export interface Checkpointer { afterCommit(core: RoomCore, group: CommitWrite[]): void }       // T-B7-13 implements
export interface CommandRegistry { handle(core: RoomCore, m: MemberRef, cmd: Cmd): Outbound[] }  // T-B7-14 implements
export interface CoreDeps { repo: RoomsRepo; limits: CollabLimits; clock: () => number; metrics: CoreMetrics;
  hasBlob(room: RoomId, sha256: string): boolean; checkpointer?: Checkpointer; commands?: CommandRegistry;
  apply?: typeof import("../../../src/project/apply/index.ts").apply;   // test seam only: T-B7-20 passes mutated `apply` functions (ADR-0409)
  afterCommit?: (group: CommitWrite[]) => void }          // test seam only: runs after COMMIT and before any frame is returned; T-B7-33 kills the process here
// core.ts
export class RoomCore {
  constructor(init: RoomInit, deps: CoreDeps);
  readonly id: RoomId; get seq(): number; get chain(): string; get doc(): ProjectDocument; get epoch(): string; get settings(): RoomSettings;
  members(): readonly MemberRef[]; member(m: number): MemberRef | undefined;
  addMember(ref: Omit<MemberRef, "m" | "ready">): MemberRef;   // assigns m from 1; m 0 is the server
  markReady(m: number): void; removeMember(m: number): void;
  submit(m: number, f: Submit): Outbound[];                     // immediate refusals only; accepted work waits for flush()
  flush(): Outbound[];                                          // group commit; ack after COMMIT
  commitSystem(by: Actor, ops: Op[], why: string): Outbound[];  // server-made batch (actor.set + access.grant); author.kind "system"
  tick(): Outbound[];                                           // check frames every checkEveryOps / checkEveryMs
  resync(m: number, f: Resync): Outbound[];                     // answers with a Snapshot, reason "resync"
  snapshot(reason: Snapshot["reason"]): Snapshot;
  command(m: number, c: Cmd): Outbound[];                       // delegates to deps.commands
}
// commit.ts
export type AclPatch = { device: DeviceId; role: Role | null;                         // null: access revoked, member row deleted
  join?: { actor: Actor; name: string; color: string; spectator: boolean; joinedAt: number } };   // present when the device becomes a member in this commit (invite redemption)
export type CommitWrite = { room: RoomId; device: DeviceId; envs: OpEnvelope[]; submission: SubmissionRow; events: EventRow[]; acl: AclPatch[]; stateHash?: string };
export function applyBatch(doc: ProjectDocument, subject: Subject, f: Submit, base: { seq: number; chain: string }, now: Date, hasBlob: ...):
  { ok: true; doc: ProjectDocument; envs: OpEnvelope[]; chain: string; inverse: Op[] } | { ok: false; reject: Reject };
// dedup.ts
export class DedupWindow { constructor(repo: RoomsRepo, room: RoomId, keep: 8); lookup(device: DeviceId, firstOpId: string): SubmissionRow | null; remember(row: SubmissionRow): void }
```
- Data model and schemas: envelope fields are `OpEnvelope` (`opId, seq, base, author{actor, kind, proposal?}, at, batch?, op`). `seq` of op i in a batch is `core.seq + i + 1`; the room `seq` equals `doc.revision`. `at` is the server clock in UTC with milliseconds and `Z`. `author.actor` is the member's actor, never from the frame; `author.kind` is `user` or `ai` (an `ai` op needs a `proposal` matching `^prp_...`), and `system` only through `commitSystem`. `chain_n = chainNext(chain_{n-1}, env_n)` (`src/project/hash.ts`).
- Algorithm (submission):
  1. Not ready: `error not_ready`. Rate: per-member `TokenBucket` `submitPerSec` 20, burst 40; empty bucket: `error rate_limited` with `retryAfterMs`.
  2. Dedup: `lookup(device, ops[0].opId)` finds a stored row: reply `commit {seq0, seq1, chain: repo.chainAt(seq1), ack: {sub, inverse, dup: true}}`, no write (RT 8.1 rule 4). This test comes before authorisation so a resend after a role change still gets its stored answer.
  3. For each op: `authorizeOp`; the first refusal rejects the whole submission with `permission` or `not_baton` and `index`. `asset.add` whose `sha256` has no blob (`hasBlob`) is rejected `missing_target`, rule `asset-not-uploaded`.
  4. Apply every op in order to a working copy of the document (structural sharing if `apply` is immutable; otherwise `structuredClone` once per submission). The first `apply` error rejects the submission with the error's code, `index` and `rule`. Nothing is shared with the authoritative document until commit.
  5. Run the deferred invariants of T-B2-08 on the result (dangling wire, pin in use, net rules). Failure: `reject invariant`.
  6. Build envelopes and chain. The submission's inverse is the per-op inverses in reverse order. If the batch holds `access.grant`, `access.revoke`, `access.set` or `actor.remove`, the new role of every affected actor is read from the resulting document (`access.owners` gives `owner`, a `grants` entry gives its role, neither gives `null`) and mapped to a device through `room_members.actor`; the result is `CommitWrite.acl`, written in the same transaction, so the server ACL and the document cannot drift (RT 11.1: the ACL changes only with a committed `access.*` op or a kick). After the commit the in-memory `MemberRef.role` is updated and a member whose role became `null` is closed with 4403.
  7. Queue a `CommitWrite`. `flush()` takes at most 256 queued submissions or 4 MiB of envelope bytes, re-checks the head (`seq` and `chain` of the previous accepted write in the group, so two submissions in one group build on each other), calls `repo.appendCommits(writes)` once, and only then replaces the authoritative document, `seq` and `chain`, and returns the frames: author gets `commit {seq0, seq1, chain, ack {sub, inverse}}` without `envs`; every other member gets `commit {seq0, seq1, chain, envs}`. A thrown store error discards the working state of the whole group, leaves `seq` unchanged and returns `error server_error` (retryable) to each author.
  8. `tick()`: every `checkEveryOps` ops or `checkEveryMs` of activity, `check {seq, chain}` to all; every fifth check carries `stateHash` (computed with `src/project/hash.ts`, 3.8 ms at 500 parts on an M4 Pro, VERIFIED in PDM 6.4; ESTIMATED 4x on a small server).
- State transitions: a member is `added` then `ready` (after `Ready`); a submission is `queued`, then `committed` or `rejected`. `flush()` is idempotent when the queue is empty.
- Validation rules and error conditions: as steps 1 to 7. Reject codes: `malformed, duplicate_id, missing_target, missing_pin, pin_in_use, unknown_definition, missing_pin_map, referenced_by, invariant, stale_base, schema_mismatch` (from `apply`), `permission`, `not_baton`, `quota` (document limit exceeded, PDM 9.4), `rate_limited`.
- Edge cases: a batch larger than 40 ops is refused by T-B7-01. A resend whose first `opId` is in the dedup window but whose later ops differ is still answered from the stored row (the first `opId` identifies the submission). A member removed while its submission is queued: the submission is dropped at `flush()` with no frame. `commitSystem` ignores the rate bucket. Two submissions in one group where the second depends on the first (add part, then connect) commit in order.
- Permissions: `authorizeOp` with the member's current role; the role is read from `MemberRef`, which `access.*` commits update in the same `flush()`.
- Performance: p99 under 5 ms per accepted op with 8 members and a 500-part document on `:memory:` (RB-1); `flush()` of 256 one-op submissions under 60 ms on `:memory:` (ESTIMATED from 52,000 ops/s).
- Migration: none.

**Verification**
- Unit tests, `server/test/room-core.test.ts`: accept and ack ordering (no frame leaves before `appendCommits` returns, proved with a store double whose `appendCommits` records the call order); reject leaves `seq`, `chain` and the repo unchanged (RS-09 counted 129,024 rejections without divergence); atomic batch (third op invalid, first two not applied); `author` is the member's actor even if the frame claims another; `system` kind from a client is refused at parse time (T-B7-01) and `commitSystem` is the only source; group commit with two dependent submissions; store failure returns `server_error` and the next submission still works; `check` every 100 ops and every fifth carries `stateHash`; `asset.add` before upload is rejected; `ai` op without `proposal` rejected. `server/test/dedup.test.ts` (RA-03, the hand-built test RS-09 says random testing cannot replace): submit, drop the ack, push the op out of the live tail with 20 other commits, resend the same first `opId`, expect `commit` with `ack.dup === true`, the stored inverse and an unchanged log; the same with a restart between (new `RoomCore` over the same repo); a resend by a different device with the same `opId` is NOT a dup.
- Integration: with the T-B7-03 repo on a file store, 1,000 submissions from 5 fake members, then reload and compare `chain` with a recomputation (link by link with `node:crypto` over the canonical envelope bytes, an independent check of `chainNext` over 1,000 generated envelopes).
- Playwright: none.
- Fixtures: `server/test/fixtures/room-doc-500.json`, generated once by the T-B2-16 generators (500 parts, 1,000 wires), committed.
- Acceptance: Given two members submit `component.remove R3` and `net.connect R3.pin1` in that server order, When both commit, Then the second is rejected `missing_target` and the log has one entry for R3. Given a lost ack, When the client resends, Then it gets `ack.dup` and the log has exactly one copy.
- Observability: counters `iynk_ops_accepted_total`, `iynk_ops_rejected_total{code}`, `iynk_dedup_hits_total`, histogram `iynk_commit_seconds` (BA-05), gauge `iynk_room_queue_depth`; a log line `room.reject_burst` when one member has more than 20 rejections in a minute (RT 15.1).
- Release blockers: an ack sent before COMMIT; any path where `author.actor` comes from a frame.

**Delivery**
- Definition of done: tests pass; the RS-09 `server.js` rules each map to a numbered step above (the PR note lists the mapping).
- Verify commands: `npm run typecheck && npm run lint`; `cd server && node --test test/room-core.test.ts test/dedup.test.ts`; `npm run server:test`; `npm run server:typecheck`.
- Documentation: none (T-B7-37).
- Rollback: common rule.
- Later tasks need: `RoomCore`, `Outbound`, `MemberRef`, `CoreDeps`, `Checkpointer`, `CommandRegistry`, `CommitWrite`, `commitSystem`, `snapshot`.

---

### T-B7-07 Presence, cursors and chat on the server

| Field | Value |
|---|---|
| Subsystem | `server/src/ws` |
| Phase, priority | B7, P1 |
| Dependencies | T-B7-01, T-B7-04 |
| Status | not started |
| Features, requirements | F-116, F-117; R-075 (R7, R8), R-092; ADR-0507; RA-11, RB-8 |

**Intent**
- Problem: today each cursor is a frame to every peer at up to 20 Hz (8 x 7 x 20 = 1,120 frames per second per room, ESTIMATED arithmetic from `server/realtime/src/config.js:11`); chat `kind` is chosen by the client (`protocol.js:6`, R7); chat has no limit of its own (R8).
- Target user: members of a room.
- User story: as a friend in a room, I see where Amar is pointing, in millimetres on the same view, and nobody can post a fake system or AI line.
- Expected behaviour: ephemeral channels. Presence patches at most 5 per second per member; cursor samples coalesced to one frame per room at 15 Hz; chat text only, `kind` set by the server, 2 lines per second, last 50 lines replayed.
- Success metric: with 8 members moving cursors, outbound under 25 KB/s per room (RB-8); a member alone gets no cursor frames.

**Implementation**
- Existing files to port, not import (the legacy folder is deleted in B13): `server/realtime/src/bucket.js:1-22`, `server/realtime/src/protocol.js:26,29,68` (junk strips are already in T-B7-01).
- Files: new `server/src/ws/bucket.ts`, `presence.ts`, `cursors.ts`, `chat.ts`.
- Modules and signatures:

```ts
// bucket.ts
export class TokenBucket { constructor(ratePerSec: number, burst: number, nowMs: number); take(nowMs: number): boolean; retryAfterMs(nowMs: number): number }
// presence.ts
export class PresenceHub {
  constructor(limits: CollabLimits, clock: () => number);
  join(m: number, who: { name: string; color: string; app?: string }): void; leave(m: number): void;
  patch(m: number, p: PresencePatch): { frame: Presence } | { error: ErrorCode; retryAfterMs?: number };
  view(m: number): Readonly<PresenceState> | undefined;
}
// cursors.ts
export class CursorBatcher {
  constructor(limits: CollabLimits, clock: () => number);
  push(subject: Subject, m: number, c: CursorUp, spectatorCursors: boolean): "ok" | "dropped" | "permission";
  drain(memberCount: number): Cursors | null;     // null when 0 or 1 member, or nothing new; keeps only the newest sample per member
}
// chat.ts
export class ChatRing {
  constructor(limits: CollabLimits, clock: () => number);
  send(subject: Subject, m: number, f: ChatUp): { frame: Chat } | { error: ErrorCode; retryAfterMs?: number };
  system(text: string): Chat;                      // kind "system", m 0
  backlog(): Chat[];                               // at most 50, oldest first
}
```
- Data model: chat frame `{t: "chat", id, m, text, lang, kind: "text" | "system", at}`; `m` 0 is the server; the ring is in memory only and a restart empties it (R-083). Cursor entry `[m, view, x_mm, y_mm]`, coordinates quantised to 0.1 mm (RT 10). `PresencePatch` keys: `name` (24 graphemes), `status` (80), `view`, `sel` (at most 16 ids), `focus`, `typing`, `vp`.
- Algorithm: presence: a bucket of 5 per second; over the limit returns `rate_limited` with `retryAfterMs`; accepted patches merge into the member's state and produce a `presence` frame for the room (the dispatcher (T-B7-21) sends it). Cursors: `push` keeps one latest sample per member (an older sample is overwritten, not queued); a bucket of 15 Hz burst 10 per member drops excess silently (lossy); `drain` is called by the dispatcher every 66 ms and returns one frame for the whole room. Spectators send none unless `spectatorCursors`. Chat: `authorizeChat` (muted gives `permission`), a bucket of 2 per second burst 5 (`rate_limited` when empty), text through `sanitizeChat`, `id` kept for client de-duplication, `kind` always `text`.
- State transitions: none beyond join and leave.
- Validation and errors: `permission` (muted, spectator cursor), `rate_limited`, `bad_frame` (empty text after stripping). Dropped cursor samples increment `iynk_cursor_dropped_total` and count toward the dispatcher's flood counter (T-B7-21).
- Edge cases: a member leaving between `push` and `drain` is skipped; a cursor for a `view` that is not in the document is passed through (the server does not read the document for ephemeral data); a single-member room never builds a frame.
- Permissions: T-B7-04 functions.
- Performance: `drain` for 8 members builds one frame of about 160 bytes (ESTIMATED, RT 10); 15 frames per second per room, about 19 KB/s outbound for the room (ESTIMATED).
- Migration: none.
- Input and output schemas, API contract: no HTTP route. The frames are `presence`, `cursor`, `cursors` and `chat` of T-B7-01; return values are the typed unions above.

**Verification**
- Unit tests, `server/test/ws-ephemeral.test.ts` (virtual clock): chat `kind` is `text` whatever the frame says; system lines have `m` 0; 3 chat lines in 100 ms from one member pass (burst 5), the 6th is `rate_limited`; a muted member gets `permission`; backlog holds 50 and drops the oldest; text of 501 graphemes is cut at 500; bidi override characters are stripped; cursor coalescing keeps only the newest of 20 samples; `drain` returns null for one member; a viewer's cursor is `permission` unless allowed; 8 members at 15 Hz for 10 virtual seconds give at most 150 frames and under 25 KB/s (RA-11); presence 6 patches in 1 s: the 6th is `rate_limited`.
- Integration: wired and exercised through the socket in T-B7-21 and T-B7-34.
- Playwright: none. Fixtures: none.
- Acceptance: Given a client frame `{t:"chat", text:"hi", kind:"ai"}`, When the ring stores it, Then it is `kind: "text"`. Given 60 chat lines in a second, When processed, Then at most 5 are accepted.
- Observability: `iynk_chat_dropped_total`, `iynk_cursor_dropped_total`, `iynk_presence_dropped_total`.
- Release blockers: a client-writable `kind`; chat text in any log line.

**Delivery**
- Definition of done: tests pass.
- Verify commands: `npm run typecheck && npm run lint`; `cd server && node --test test/ws-ephemeral.test.ts`; `npm run server:typecheck`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `TokenBucket`, `PresenceHub`, `CursorBatcher`, `ChatRing`.

---

### T-B7-08 Asset upload, query and download for rooms

| Field | Value |
|---|---|
| Subsystem | `server/src/assets` |
| Phase, priority | B7, P1 |
| Dependencies | T-B7-03 (migration 0002 with `blobs` and `uploads`), T-B7-04 (bucket `asset.write`) |
| Status | not started |
| Features, requirements | F-121, F-089; R-086 (`asset.add`), R-095; RC-07, RC-26; BACKEND 5.1 |

**Intent**
- Problem: an `asset.add` op names a blob by hash and must never carry bytes (RT 8.1 rule 8). Without an upload route a project with an image or a model cannot enter a room. The roadmap's API list has the route and no task builds it.
- Target user: a member whose project has art, a datasheet or a replay.
- User story: as Amar, my project with a PNG opens in the room with the PNG.
- Expected behaviour: `PUT /v1/assets/{sha256}?room=rm_...` stores bytes after checking size, hash and type; `GET /v1/assets/{sha256}` serves them to a member of a room whose document lists the hash. `POST /v1/assets/query` tells the client which of up to 256 hashes the server lacks, so it uploads only those; `HEAD /v1/assets/{sha256}` answers like `GET` without a body.
- Success metric: a 16,777,216-byte upload succeeds; a 16,777,217-byte upload is refused before the body is read; a wrong hash is refused.

**Implementation**
- Existing files: `server/src/http/router.ts`, `limits.ts`, `classes.ts` (T-B6-07, and the buckets T-B7-04 added). Buckets: `asset.write` for put, `read` for get, head and query (openapi `x-iynk-rate-limit`; BACKEND 5.1's `assets.put` and `assets.get` names lose to API_CONTRACTS 4.3, rule R4). Each route is a B6 `RouteDef { method, path, operation, cls: "device", bucket, handler }`. This task exports route definitions; T-B7-32 registers them in `allRoutes` (so BA-11 can see them in one place).
- Files: new `server/src/assets/store.ts`, `server/src/assets/routes.ts`.
- Data model (BACKEND 7.2; the tables are created by migration 002 in T-B7-03): `blobs(sha256 BLOB PK, bytes BLOB, size, mime, created_at)` and `uploads(device_id, sha256, room_id, at, PK(device_id, sha256))`. Hashes are 32-byte BLOB; the URL carries 64 hex characters.
- Modules and signatures:

```ts
// store.ts
export interface AssetsRepo {
  put(device: DeviceId, sha256: Uint8Array, bytes: Uint8Array, mime: string, room: RoomId | null, now: number): "created" | "exists";   // throws QuotaError
  get(sha256: Uint8Array): { bytes: Uint8Array; mime: string } | null;
  has(room: RoomId, sha256Hex: string): boolean;           // uploaded for this room, or already referenced by the room
  usage(device: DeviceId): number;
  sweepUnreferenced(now: number, olderThanMs: number): number;   // 24 h
}
export function createAssetsRepo(store: ServerStore): AssetsRepo;
// routes.ts
export type AssetRouteDeps = { repo: AssetsRepo; roleOf(room: RoomId, device: DeviceId): Role | null; roomsOf(device: DeviceId): RoomId[]; roomListsAsset(room: RoomId, sha256Hex: string): boolean; limits: CollabLimits };
export function assetRoutes(deps: AssetRouteDeps): RouteDef[];   // RouteDef is the T-B6-07 type: method, path, operation, cls, bucket, handler
```
- API contract (openapi `putAsset`, `getAsset`): PUT needs a bearer token, `Content-Length` (required, at most 16,777,216, else `413` before reading), `Content-Type` on the allow-list of PDM 5.10 (`image/png`, `image/jpeg`, `image/svg+xml`, `image/webp`, `model/gltf-binary`, `model/stl`, `application/pdf`, `application/octet-stream`, `application/json`, `text/plain`) and agreeing with a magic-byte sniff for png, jpeg, webp, pdf, gltf-binary, otherwise `415`; the server hashes the bytes: mismatch is `422 hash_mismatch`; `?room=` requires the caller to be `owner` or `editor` of that room (else the same `404` as a missing room); per-device quota 256 MiB (`409 quota`); `201` created, `200` already stored. SVG is stored as given, never sanitised by the server (PDM 13), and served with `Content-Security-Policy: sandbox; default-src 'none'`, `X-Content-Type-Options: nosniff`.
  GET needs a bearer token; the caller must be at least `viewer` of a room whose document lists the hash (`roomListsAsset`); `Cache-Control: private, max-age=31536000, immutable`, `ETag` (the hash), `Range` supported (single range). Missing and forbidden both answer `404`.
- API contract (openapi `queryAssets`, `headAsset`): `POST /v1/assets/query` (bucket `read`) takes `AssetQuery {sha256: string[]}` (1 to 256 unique hashes, else `400`) and answers `AssetQueryResult {present, missing}` that partitions the input. A hash is `present` only if the caller uploaded it (an `uploads` row) or is a member of a room whose document lists it (`roomsOf` and `roomListsAsset`); anything else is `missing`, so the call cannot probe other people's files. `HEAD /v1/assets/{sha256}` (bucket `read`) has the access rule of `getAsset`: `200` with `Content-Length` and `Content-Type` and no body, or the same `404` as `getAsset` for a hash that is missing and for one the caller may not see (byte-identical).
- Algorithm: streaming read with a running byte counter and a running SHA-256; abort at the declared length plus one byte; write once after the hash matches; `uploads` row ties the blob to the device and room. `sweepUnreferenced` deletes uploads no document lists after 24 hours (BACKEND 7.2), then blobs with no upload, share or room reference. The bucket `asset.write` limits requests (60 per minute per device); the 512 MiB per hour part of API_CONTRACTS 4.3 is the sum of `blobs.size` over the device's `uploads` rows of the last hour, refused as `429`.
- Validation and errors: `413`, `415`, `422 hash_mismatch`, `409 quota`, `404`, `401`. The allow-list and the sniff table are constants with a test.
- Edge cases: a second upload of the same hash by another device is `200 exists` and adds an `uploads` row (so quota counts per uploader, bytes stored once); a client that lies in `Content-Length` and sends more is cut at the declared length; a zero-byte body is refused `422`.
- Permissions: described above. Performance: 16 MiB hash and write under 150 ms on this Mac (ESTIMATED).
- Migration: none (migration 002 holds `blobs` and `uploads`; `share_blobs` is created by 003 in T-B7-09 because it references `shares`).
- State transitions: an upload is `received`, `verified`, `stored`; a stored blob is `referenced` or, after 24 hours without a reference, swept.

**Verification**
- Unit tests, `server/test/assets.test.ts`: allow-list and sniff table; hash mismatch; size limit by header and by actual bytes; quota; idempotent second PUT; GET to a viewer of a room that lists the hash, 404 to a non-member and to a member when the room does not list it (the two answers are byte-identical); `Range: bytes=0-9`; headers present; SVG served with the sandbox CSP; `queryAssets` returns `present` and `missing` that partition a batch of 256 hashes, reports a hash only another device uploaded as `missing`, and refuses 257 hashes or duplicates with `400`; `headAsset` answers `200` with `Content-Length` and `Content-Type` and no body for a stored asset, and its `404` bytes for a missing hash and for a hash the caller may not see equal `getAsset`'s.
- Integration: after T-B7-32, `server/test/assets.http.test.ts` runs through the real router (that test file is owned by T-B7-32).
- Playwright: none. Fixtures: `server/test/fixtures/{1x1.png,evil.svg,empty.bin}`.
- Acceptance: Given a room editor, When they PUT a PNG with the right hash and then submit `asset.add`, Then the op commits; Given no upload, Then `asset.add` is rejected `missing_target`.
- Observability: `iynk_asset_bytes_total`, log `asset.put {room, bytes}`.
- Release blockers: the server sanitising or transforming SVG bytes; serving an asset without `nosniff`.

**Delivery**
- Definition of done: tests pass; the route table lists bucket names that exist in `BucketName` (T-B7-04).
- Verify commands: `npm run typecheck && npm run lint`; `cd server && node --test test/assets.test.ts`; `npm run server:typecheck`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `createAssetsRepo`, `assetRoutes`, `AssetRouteDeps` (wired by T-B7-32), `repo.has` for `CoreDeps.hasBlob`, `repo.get` for `getSharedAsset` (T-B7-09), `queryAssets` for `syncAssets` (T-B7-16).

---

### T-B7-09 Shares, server side

| Field | Value |
|---|---|
| Subsystem | `server/src/shares` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-03, T-B7-04, T-B7-38 |
| Status | not started |
| Features, requirements | F-089, F-143 (buddies audience); R-095; ADR-0426, ADR-0817; BA-10, CM-08, CM-11 |

**Intent**
- Problem: there is no way to show a friend the exact work without a live room (audit: no save or share at all). Links must not leak through logs or a database copy.
- Target user: Amar and a friend, or a friend with a link.
- User story: as Amar, I send a read-only link; my friend runs it and can make their own copy; I revoke it and it dies at once.
- Expected behaviour: `POST /v1/shares` stores a validated, history-free snapshot under a 128-bit token whose SHA-256 only is stored; `GET /v1/shares/{token}` returns it; `DELETE /v1/shares/{shareId}` revokes; missing, expired, revoked and not-a-buddy answers are byte-identical `404`.
- Success metric: BA-10: after create, a byte search of `iynk.db` and its WAL for the token finds nothing; the 404 bodies for missing and revoked are byte-identical.

**Implementation**
- Existing files: `src/project/validate.ts` and `limits.ts` (T-B2-08) for V1 to V5, `src/core/canonical.ts`, `sha256.ts`, all by relative `.ts` path (T-B7-38 made them runnable); `server/src/buddies/visibility.ts` (T-B6-09: `areBuddies(tx, a, b)`, wrapped here as `isBuddy` over `store.read`); `server/src/http/*` (T-B6-07).
- Files: new `server/migrations/0003_shares.sql`, `server/src/shares/store.ts`, `routes.ts`, `validate-worker.ts`, `src/project/secret-scan.ts` (portable, so the browser warns with the very same rules the server enforces: one source of truth).
- Data model: `shares(id TEXT PK 'shr_'+13 base32, token_hash BLOB UNIQUE, owner → devices, created_at, expires_at NULL, revoked_at NULL, doc BLOB (gzip canonical), state_hash, bytes, audience CHECK IN ('link','buddies'), allow_fork INTEGER, label TEXT, revision INTEGER, opens INTEGER DEFAULT 0, last_opened_at INTEGER)` (D15) and `share_blobs(share_id → shares ON DELETE CASCADE, sha256 → blobs, PK(share_id, sha256))`. The token is `base64url` of 16 random bytes (22 characters). The public id `shr_` plus 64 random bits is not a credential.
- Modules and signatures:

```ts
// store.ts
export interface SharesRepo {
  create(s: NewShare): ShareRow;                                   // quotas checked inside the tx
  byTokenHash(h: Uint8Array): ShareRow | null;                     // includes revoked/expired rows; caller decides
  byId(id: string, owner: DeviceId): ShareRow | null;
  listOwned(owner: DeviceId, limit: number, cursor: string | null): { items: ShareRow[]; next: string | null };
  revoke(id: string, owner: DeviceId, now: number): boolean;       // sets revoked_at and empties doc
  touch(id: string, now: number): void;                            // opens += 1
  sweep(now: number, tombstoneMs: number): number;
}
export function createSharesRepo(store: ServerStore): SharesRepo;
// src/project/secret-scan.ts (portable)
export function scanSecrets(doc: ProjectDocument): { field: string; rule: string }[];   // free-text fields only
// validate-worker.ts
export function validateInWorker(doc: unknown, timeoutMs: number): Promise<{ ok: true; doc: ProjectDocument; canonicalBytes: number; stateHash: string } | { ok: false; code: string; message: string }>;
// routes.ts
export type ShareRouteDeps = { repo: SharesRepo; ownsBlob(owner: DeviceId, sha256Hex: string): boolean /* from AssetsRepo at mount */; isBuddy(a: DeviceId, b: DeviceId): boolean; blob(sha256: Uint8Array): { bytes: Uint8Array; mime: string } | null /* AssetsRepo.get */; authenticateBearer(header: string | null): Authed | null /* the optional bearer of the buddies audience */; limits: CollabLimits; now: () => number; publicUrl: string };
export function shareRoutes(deps: ShareRouteDeps): RouteDef[];
```
- API contract (openapi `createShare`, `openShare`, `revokeShare`, `listShares`): create body `ShareCreate {snapshot, audience = "link", expiresAt?, allowFork = true, label?}`; reply `201 ShareCreated` (a `Share` plus `token` and `url`; D10: `url` is `{publicUrl}/en/studio#share={token}`; the client builds its own). List returns the owner's shares, never tokens. Open returns `SharedProject {share{id, allowFork, revision, expiresAt}, owner{displayName}, stateHash, document, assets[], definitions[]}` where `assets` comes from `share_blobs` and `definitions` from `document.dependencies`. Headers on open: `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.
- Routes (B6 `RouteDef`): `createShare` and `revokeShare` bucket `write`, `listShares` bucket `read`, all `cls: "device"`; `openShare` and `getSharedAsset` bucket `share.read` with `cls: "capability"` (the buddies audience reads the optional bearer through `authenticateBearer`).
- API contract (openapi `getSharedAsset`): `GET /v1/shares/{shareRef}/assets/{sha256}` uses the same lookup and audience rules as open. Only a hash listed in `share_blobs` for that share is served, with the headers of `getAsset` (`Cache-Control: private, max-age=31536000, immutable`, `ETag`, `X-Content-Type-Options: nosniff`, SVG with `Content-Security-Policy: sandbox; default-src 'none'`, single `Range`). Every miss (unknown share, revoked, expired, not a buddy, hash not in the share) is the same `404` bytes as `openShare`. This is how a shared project shows its images read-only (T-B7-28).
- Algorithm (create): reject a body over `maxShareBytes` (16 MiB) before parsing; `validateInWorker` runs the five passes with a 5 second limit (PROPOSAL) in a `worker_threads` worker that is terminated at the limit (a hostile document cannot hold the server); strip `history` and every `access.grants` entry beyond the owners; set `access.visibility` to `link` or `buddies`; canonical bytes at most `maxProjectBytes`; `scanSecrets` hits refuse the share with `422 secret_in_document` naming the field (not the value); expiry: omitted means now plus `shareDefaultDays`; `null` means never and is allowed only when `shareMaxDays === null`; a date beyond `min(365 days, shareMaxDays)` is `422 invalid_expiry`; quotas: 20 live shares per identity (D8, `409 quota`), 200 stored rows per device, 256 MiB per device including blobs; audience `link` with `allowLinks === false` is `403 links_disabled` (`IYNK_ALLOW_LINKS=0`). Every `asset.sha256` the document lists must already be a stored blob owned by the creator, else `422 asset_missing` (no partial share). The server recomputes `stateHash` and returns it.
- Algorithm (open): hash the path token, look up. For `buddies`: needs a valid bearer token and `isBuddy(owner, caller)`; the owner may also open their own. Any miss (unknown, revoked, expired, not a buddy, no token for a buddies share) returns the same `404` body. `touch` only on success.
- Algorithm (revoke): owner only, idempotent `204`, sets `revoked_at`, replaces `doc` with an empty blob in the same statement (the bytes go now, not at the sweep), keeps the row 30 days (tombstone), `sweep` deletes it.
- State transitions: `live` then `revoked` or `expired` then deleted by sweep.
- Validation and errors: `400` malformed, `401` (create/list/revoke without a token), `403 links_disabled`, `404`, `409 quota`, `413`, `422` (`secret_in_document`, `invalid_expiry`, `asset_missing`, validation codes). The error envelope is whatever T-B6-07 defines.
- Edge cases: a project of exactly 5,242,880 canonical bytes passes, one byte more is `422 quota`; the same token string can never be issued twice (UNIQUE and a retry); an `expiresAt` in the past is `422 invalid_expiry`; a share opened at the instant of expiry follows `now < expires_at`.
- Permissions: create, list, revoke: any enrolled identity (owner of the share); open: capability or buddy.
- Performance: create of a 500-part project under 150 ms (validation dominates; ESTIMATED); open is one indexed lookup plus one blob read (ADR-0426).
- Migration: `server/migrations/0003_shares.sql`.

**Verification**
- Unit tests, `server/test/shares.test.ts` (BA-10, CM-08, CM-11): create then open returns the same `stateHash` the test computes locally; **a byte scan of the SQLite file and its `-wal` for the token string finds zero occurrences**; missing, revoked, expired and not-a-buddy bodies and headers are byte-identical (compared as buffers); revoke empties the stored blob (`length(doc) = 0`) at once; `history` and extra grants are gone; expiry rules (default 30 days, `null` with and without an operator maximum, 366 days refused); 21st live share refused; secret scan: `sk-` key, `AIza` key, PEM header and a 64-hex string in a source comment are refused, while every example in `04_ARCHITECTURE/schemas/examples/` and the converter corpus (T-B2-14) produce zero hits (false-positive test); hostile document (deeply nested, 6 MiB) refused and the worker is terminated; `IYNK_ALLOW_LINKS=0`; `getSharedAsset` serves a hash in `share_blobs` with the `getAsset` headers, and a hash outside the share, a revoked share, a non-buddy on a `buddies` share and a random token give byte-identical `404`s.
  `src/project/secret-scan.test.ts` (vitest) covers `scanSecrets` alone, including the zero-false-positive run over the examples and the converter corpus.
- Integration: after T-B7-32 the same cases run through the real router in `server/test/shares.http.test.ts` (owned by T-B7-32).
- Playwright: T-B7-36. Fixtures: `server/test/fixtures/hostile-share-*.json` (nested, oversize, with a planted key).
- Acceptance: Given a created `link` share, When anyone opens the token, Then they get the snapshot read-only. Given the owner revokes, When the token is opened again, Then the answer is the same `404` as for a random token and the stored bytes are gone. Given a `buddies` share, When a stranger opens it, Then `404`.
- Observability: log `share.create {id, bytes, audience}` (id only); counters `iynk_share_opens_total`, `iynk_share_404_total`. The route log line records the route template, never the token (ADR-0426).
- Release blockers: the token or its prefix in any log or table; distinguishable 404 bodies.

**Delivery**
- Definition of done: tests pass; migration 0003 applies on top of 0002.
- Verify commands: `npm run typecheck && npm run lint`; `cd server && node --test test/shares.test.ts`; `npx vitest run src/project/secret-scan.test.ts`; `npx tsc -p tsconfig.portable.json`; `npm run server:typecheck`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `createSharesRepo`, `shareRoutes`, `ShareRouteDeps`, `scanSecrets` (the client dialog of T-B7-16 imports it); the `SharedProject` shape and `getSharedAsset` for T-B7-16 and T-B7-28.

---

### T-B7-10 Scores and the buddies-only board, server side

| Field | Value |
|---|---|
| Subsystem | `server/src/scores` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-03, T-B7-04; B6 `buddies` |
| Status | not started |
| Features, requirements | F-140; R-091; D-016; RC-65; CM-20 to CM-24; COMMUNITY 3.10 |

**Intent**
- Problem: the old board is public with free-text names and client-claimed times (`src/app/api/leaderboard/route.ts`, deleted by T-B0-16; flight defect 2).
- Target user: Amar and his buddies.
- User story: as Amar, I see my best lap and my friends' best laps, nobody else, no counts of how often anyone flew.
- Expected behaviour: one row per person per key holding their best; the board returns the caller and the caller's buddies only; ties share a rank; removing a buddy removes their rows from the view at once.
- Success metric: CM-22: after 1,000 submissions to one key, the board shows one row for the caller with the best time and no count.

**Implementation**
- Existing files: `src/lib/telemetry/kinds.ts:56` (`LAP_MS`: 1,000 to 3,600,000, the bounds to reuse as constants; that file is deleted or kept by B0, so the server copies the two numbers into its own constant), `server/src/buddies/visibility.ts` (T-B6-09).
- Files: new `server/migrations/0004_scores.sql`, `server/src/scores/store.ts`, `server/src/scores/routes.ts`.
- Data model (D15): `scores(device_id → devices ON DELETE CASCADE, key TEXT, value REAL, unit TEXT CHECK IN ('ms','s','points','count'), better TEXT CHECK IN ('lower','higher'), at INTEGER, project_id TEXT NULL, note TEXT NULL, PRIMARY KEY (device_id, key))`. No attempt counter, no name column (the name shown is the device's current display name, so the free-text name of D2 cannot exist). Index `scores(key)`.
- Modules and signatures:

```ts
export const TRACKS = ["lap", "diagnosis", "built", "solved"] as const;           // lap is the only track the app submits in B7 (RC-65)
export const LAP_BOUNDS_MS = { min: 1_000, max: 3_600_000 } as const;
export interface ScoresRepo {
  submit(device: DeviceId, key: string, s: ScoreSubmit, now: number): { row: ScoreRow; changed: boolean };   // keeps the better value
  remove(device: DeviceId, key: string): void;
  boardFor(device: DeviceId, key: string, visible: DeviceId[]): ScoreRow[];      // caller + buddies, at most 65
  countKeys(device: DeviceId, track: string): number;
}
export function createScoresRepo(store: ServerStore): ScoresRepo;
export type ScoreRouteDeps = { repo: ScoresRepo; buddiesOf(device: DeviceId): DeviceId[]; deviceInfo(ids: DeviceId[]): Map<DeviceId, { identityId: Actor; displayName: string }>; now: () => number };
export function scoreRoutes(deps: ScoreRouteDeps): RouteDef[];
export function rankRows(rows: ScoreRow[], better: "lower" | "higher"): LeaderboardRow[];   // ties share a rank
```
- API contract (openapi `submitScore`, `deleteScore`, `getLeaderboard`): `PUT /v1/scores/{key}` body `ScoreSubmit {value, unit, better, projectId?, replayAssetSha256?, note?}` returns `LeaderboardRow` for the caller; `DELETE /v1/scores/{key}` `204`, idempotent; `GET /v1/leaderboards/{key}` returns `Leaderboard {key, better, rows}`. Key pattern `^[a-z0-9][a-z0-9._-]{0,63}$`; the part before the first dot must be in `TRACKS`. Buckets: `PUT` and `DELETE` use `write`, `GET` uses `read`; all `cls: "device"`.
- Algorithm: `lap`: `unit` must be `ms`, `better` must be `lower`, value an integer in `LAP_BOUNDS_MS`, else `422`. Other tracks: finite value at least 0. `submit` keeps the better of stored and submitted (`min` for lower, `max` for higher); a worse value returns the stored row with `changed: false`. The first submission by a device fixes its `unit` and `better` for that key; a later disagreement is `409 score_key_mismatch`. 200 keys per track per device (`409 quota`). `replayAssetSha256` is refused `422 replay_not_supported` (the ghost race is F-070, not B7). `note` at most 140 graphemes, junk stripped.
  `boardFor`: rows of `[caller, ...buddiesOf(caller)]` for the key; the reference `better` is the caller's own row or else the first buddy row by `at`; rows whose `unit` or `better` differ from the reference are omitted. `404` when there are no rows at all (a stranger and a person with no data get the same answer, CM-21). `rankRows`: sort by value in the right direction, ties broken by earlier `at` for order only; rank is 1 plus the number of rows strictly better, so equal values share a rank. `verification` is always `"claimed"`.
- State transitions: none. Validation and errors: `400`, `401`, `404`, `409 score_key_mismatch`, `409 quota`, `422`.
- Edge cases: a buddy removed between two reads vanishes on the next read; the caller's own row is always present when it exists; a `lap` value of 999 ms or 3,600,001 ms is `422`; `value` NaN or Infinity is `400`; a key like `lap.daily-20261024` is accepted.
- Permissions: bearer token; reads see only self and buddies.
- Performance: board read is one indexed query over at most 65 devices; under 5 ms.
- Migration: `server/migrations/0004_scores.sql`. The old `laps_best_daily` Postgres aggregate is not migrated (it is deleted with the telemetry cleanup, COMMUNITY 3.10).

**Verification**
- Unit tests, `server/test/scores.test.ts` (CM-20 to CM-24): a worse lap leaves the row unchanged and `changed` false (CM-20); 1,000 submissions leave one row with no count field anywhere in the response (CM-22); a stranger's board is `404`, and a stranger who submitted to the same key never appears in a buddy's board (CM-21); removing the buddy pair removes their rows from the next read (CM-24); ties share a rank (values 10, 10, 12 give ranks 1, 1, 3); unit mismatch gives `409 score_key_mismatch`; lap bounds; `replayAssetSha256` refused; 201st key in a track refused; response bodies contain no `name` field other than `displayName`.
- Integration: through the router after T-B7-32 (`server/test/scores.http.test.ts`, owned by T-B7-32).
- Playwright: T-B7-36. Fixtures: none.
- Acceptance: Given Amar and Mina are buddies and Mina has 41.2 s and Amar 43.9 s on `lap.hawk-canyon-run`, When Amar reads the board, Then two rows, Mina rank 1. Given Mina removes Amar, When Amar reads, Then one row.
- Observability: counter `iynk_scores_submitted_total{changed}`.
- Release blockers: any response that includes a non-buddy's row; any stored counter of attempts.

**Delivery**
- Definition of done: tests pass.
- Verify commands: `npm run typecheck && npm run lint`; `cd server && node --test test/scores.test.ts`; `npm run server:typecheck`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `createScoresRepo`, `scoreRoutes`, `ScoreRouteDeps`; the key shape `lap.<craftId>-<courseId>` for T-B7-17.

---

### T-B7-11 Client transport: WebSocket, gzip, reconnect, memory transport

| Field | Value |
|---|---|
| Subsystem | `src/collab` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-01, T-B7-02 (verdict) |
| Status | not started |
| Features, requirements | F-118, F-121; R-082, R-087, R-088; ADR-0501, ADR-0502; RB-4 |

**Intent**
- Problem: the old transport (`src/lib/realtime/ws-transport.ts`) speaks protocol v1 with client-chosen ids. The new client needs a transport that signs the handshake, inflates with a hard cap, and drops cleanly.
- Target user: `RoomClient` (T-B7-15) and the tests.
- User story: as a friend on a phone, a lost connection comes back without me noticing, and a hostile server cannot make my tab inflate a gigabyte.
- Expected behaviour: one interface, two implementations: a real WebSocket and a deterministic in-memory network for tests. Backoff helper with the RT 11.6 schedule.
- Success metric: the memory network reproduces drops, delay and resends from a seeded PRNG so T-B7-24 is repeatable; `inflateCapped` aborts a 1 KB bomb at or below 8 MiB read.

**Implementation**
- Existing files: `src/lib/realtime/ws-transport.ts` and `transport.ts` (the v1 interface; read for the shape of `connect/send/close`, then do not import them: the v1 layer is deleted in B13), `src/server-client/keys.ts` (T-B6-05: `DeviceKeyStore` and `StoredKey.privateKey`, a non-extractable `CryptoKey`; the signer that uses it is `createHelloSigner` in T-B7-22), `src/server-client/client.ts` (base URL from `probe()`; the socket is `/ws` on the server origin, RC-22).
- Files: new `src/collab/ws-transport.ts`, `src/collab/memory-transport.ts`, `src/collab/backoff.ts`, `src/collab/gzip.ts`.
- Modules and signatures:

```ts
// ws-transport.ts
export type TransportState = "idle" | "connecting" | "open" | "closed";
export interface RoomTransport {
  readonly state: TransportState;
  connect(): void;
  send(frame: ClientFrame): void;                       // gzip binary when the JSON text exceeds CAPS.gzipAbove and gzip is negotiated
  close(code?: number): void;
  onFrame(h: (f: ServerFrame) => void): () => void;
  onClose(h: (e: { code: number; retryAfterMs?: number }) => void): () => void;
}
export type HelloSigner = (c: Challenge, room: RoomId | null) => Promise<Hello>;   // built in T-B7-22 from `server-client/keys.ts`
export function createWsTransport(o: { url: string; room: RoomId | null; sign: HelloSigner; WebSocketCtor?: typeof WebSocket; clock?: () => number }): RoomTransport;
// gzip.ts
export function inflateCapped(bytes: Uint8Array, capBytes: number): Promise<string>;   // DecompressionStream, counted reads, throws InflateCapError
export function deflateText(text: string): Promise<Uint8Array>;                         // CompressionStream; byte 0 = 0x01
export function supportsGzip(): boolean;
// backoff.ts
export function backoffMs(attempt: number, rand: () => number, hidden: boolean): number;   // 500, 1000, 2000, 4000, 8000, then 15000; +-30 percent; hidden tab 30000
// memory-transport.ts
export type NetworkOptions = { seed: number; latencyMs: [min: number, max: number]; dropRate: number };
export function createMemoryNetwork(o: NetworkOptions): { connect(server: MemoryServerPort): RoomTransport; step(ms: number): void; drop(conn: RoomTransport): void; dropAll(): void };
export interface MemoryServerPort { onOpen(conn: MemoryConn): void; onFrame(conn: MemoryConn, f: ClientFrame): void; onClose(conn: MemoryConn): void }
```
- Data model: none. Algorithm: `createWsTransport`: open the socket, wait for `challenge`, call `sign`, send `hello` within 10 s, then pass every parsed server frame to listeners. Binary frame: byte 0 must be `0x01` else close 4413; the rest goes through `inflateCapped` with the cap for the frame class (snapshot 6 MiB, other 256 KiB); a cap breach closes with 4413 and surfaces `InflateCapError`. Text frames above the cap are not parsed. Unknown server frame types are dropped after one console warning per type (RT 7.2). A close frame carrying `retryAfterMs` in the preceding `error` is surfaced to `onClose`. `gzip` is added to `hello.caps` only if `supportsGzip()` and the T-B7-02 verdict allows it for the engine; otherwise the server sends plain text frames (T-B7-21 honours `caps`).
  `backoffMs(attempt, rand, hidden)`: base = `[500, 1000, 2000, 4000, 8000][attempt]` else 15000; multiply by `1 + (rand() * 0.6 - 0.3)`; a hidden tab returns 30000 jittered.
  Memory network: a min-heap of `(deliverAt, conn, frame)`; `step(ms)` advances a virtual clock and delivers in order per connection (TCP order, so no reordering inside a connection); `dropAll` closes every connection as `1006`; frames sent on a closed connection are lost; `dropRate` applies to connection death events, not to individual frames (a TCP stream does not lose single frames).
- State transitions: `idle` to `connecting` to `open` to `closed`; a closed transport is never reopened (the client makes a new one).
- Validation and errors: `InflateCapError`, `BadBinaryFrame`; close codes surfaced untouched.
- Edge cases: Safari or Firefox without `DecompressionStream` (per T-B7-02): `supportsGzip()` false; a frame split across no WebSocket fragments needs no reassembly (the browser delivers whole messages); `send` before `open` queues nothing and throws (the client waits for `Ready`).
- Permissions: none. Performance: inflate of a 1.4 MB tail under 60 ms on this Mac (RS-09 measured Node at 22 ms, VERIFIED; browser unmeasured).
- Migration: none.
- Input and output schemas, API contract: the socket path `/ws` (RC-22) and the frames of T-B7-01; no HTTP route.

**Verification**
- Unit tests: `src/collab/gzip.test.ts` (in vitest's Node environment, `DecompressionStream` is a Node global): round trip; a 1 KB gzip of 1 GiB of zeros aborts with `InflateCapError` having read at most 8 MiB; a 6 MiB snapshot passes the 6 MiB cap and a 6 MiB + 1 byte one fails. `src/collab/backoff.test.ts`: the schedule with `rand = () => 0.5`; bounds with `rand = 0` and `1`; hidden tab. `src/collab/ws-transport.test.ts` with a fake `WebSocketCtor`: hello sent after `challenge`; hello not sent twice; binary frame with wrong first byte closes 4413; unknown frame type ignored; large `send` goes binary. `src/collab/memory-transport.test.ts`: same seed gives the same delivery trace (hash of the trace); `dropAll` closes with 1006; per-connection order preserved.
- Integration: T-B7-24 and T-B7-35 drive it.
- Playwright: none. Fixtures: `src/collab/__fixtures__/bomb.gz.json` (base64 of a 1 KB gzip bomb, generated by a script in the test).
- Acceptance: Given a server that sends a gzip bomb, When the client reads it, Then the socket closes with 4413 and the tab's memory stays under the cap. Given a seed, When the network runs twice, Then the traces are equal.
- Observability: `console.warn` once per unknown frame type (client log, the local error log of R-009 if present). Release blockers: no cap on inflate.

**Delivery**
- Definition of done: tests pass; the module has no import from `src/lib/realtime`.
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/collab`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `RoomTransport`, `createWsTransport`, `createMemoryNetwork`, `backoffMs`, `inflateCapped`, `HelloSigner`.

---

### T-B7-12 Socket authentication and the session registry

| Field | Value |
|---|---|
| Subsystem | `server/src/ws` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-01, T-B7-02 (verdict), T-B7-03; B6 `devices` |
| Status | not started |
| Features, requirements | F-119, F-206; R-075, R-077; ADR-0502; RA-05; SECURITY_BASELINE R4, R5 |

**Intent**
- Problem: the client picks its peer id and the relay trusts it, so a third socket with the host's id becomes host and kicks the guest (`server/realtime/src/relay.js:231,248-264`; reproduced 2026-10-27, SECURITY_BASELINE "Gap fixes"). Bans are by that id (`room.js:121-128`), so a new id rejoins.
- Target user: every member.
- User story: as Amar, nobody can sit in my room as me, and a banned device stays out.
- Expected behaviour: the server issues a nonce; the client signs `iynk.ws.v2 LF aud LF nonce LF room-or-lobby` with its device key; the server derives the member from the key; a second socket from the same device and room supersedes the first; revoking a device closes its sockets within 5 seconds.
- Success metric: RA-05: forged, replayed, wrong-audience, wrong-room, unknown-device, revoked-device and late hellos are all refused; verification p95 under 2 ms on the CI machine (HYPOTHESIS until measured).

**Implementation**
- Existing files: B6 `devices` table (id is `dev_` plus base32 of the first 16 bytes of SHA-256 of the SPKI, BACKEND 6.4), `server/src/identity/challenge.ts` (T-B6-04: `verifySignature`, the verify helper this task reuses; not edited), `deriveDeviceId` in `src/protocol/identity.ts` (T-B6-16), `server/realtime/src/relay.js:74` (`tagOf` salted address tag) and `:77` (`clientIp`), `server/realtime/src/config.js:153` (`originAllowed`), `relay.js:59` (`perMessageDeflate: false`). B6's `config.ts` carries the origin policy (BA-01); if it does not export an `originAllowed`-equivalent, this task ports `config.js:153` into `auth.ts`.
- Files: new `server/src/ws/auth.ts`, `nonces.ts`, `sessions.ts`.
- Modules and signatures:

```ts
// nonces.ts
export class NonceStore { constructor(clock: () => number, ttlMs: number);
  issue(): { nonce: string; at: number };                // 32 random bytes, base64url
  consume(nonce: string): boolean }                      // single use, expires with the hello window
// auth.ts
export const SIGN_PREFIX = "iynk.ws.v2";
export type DeviceLookup = (id: DeviceId) => { id: DeviceId; identityId: Actor; publicKey: Uint8Array; name: string; revokedAt: number | null } | null;
export function signedBytes(aud: string, nonce: string, room: RoomId | null): Uint8Array;
export function verifyHello(h: Hello, ctx: { aud: string; nonce: string; room: RoomId | null; lookup: DeviceLookup }):
  { ok: true; device: DeviceRow } | { ok: false; code: "unauthorized" };       // one answer for every failure
export class AuthLimiter { constructor(limits: CollabLimits, clock: () => number);
  failure(addrTag: string): void; blocked(addrTag: string): boolean }           // 5 per minute, then 5 minutes
export function addressTag(salt: Uint8Array, ip: string): string;
// sessions.ts
export interface SocketHandle { close(code: number, reason?: string): void; readonly tag: string }
export class SessionRegistry {
  attach(scope: RoomId | "lobby", device: DeviceId, s: SocketHandle): { superseded: SocketHandle | null };   // old gets error superseded, close 4001
  detach(scope: RoomId | "lobby", device: DeviceId, s: SocketHandle): void;
  closeDevice(device: DeviceId, code: number): number;                            // revoke
  closeMember(room: RoomId, device: DeviceId, code: number): number;              // kick, unpair
  startRevocationWatch(poll: () => DeviceId[], everyMs: number): () => void;      // revoked devices since the last poll
}
```
- Algorithm (`verifyHello`): look up the device by `h.device`; refuse if missing or `revokedAt` set; recompute the id from the stored public key with `deriveDeviceId` and refuse a mismatch (self-certifying); `crypto.verify("sha256", signedBytes(...), { key: createPublicKey({ key: spki, format: "der", type: "spki" }), dsaEncoding: "ieee-p1363" }, base64urlDecode(h.sig))`. All failures return the same result and take the same code path. The nonce is consumed before the signature check, so a replayed `hello` fails (the nonce is gone). `aud` is the host name of `IYNK_PUBLIC_URL` (BACKEND 13.1), so a signature made for another server is refused. `room` in the signed bytes must equal `hello.room` (or `"lobby"`).
  Flow owned by the caller (T-B7-21): Origin check at upgrade against `IYNK_ALLOWED_ORIGINS` (`*` never starts, BA-01); on connection send `challenge {protocol: 2, nonce, aud, serverTime}`; hello within 10 s or close 4000; failure closes 4401; `AuthLimiter.failure(tag)` on every failure and `blocked(tag)` refuses at upgrade with 4429.
  `SessionRegistry.attach` supersedes by sending `error superseded` then closing 4001 (D7). `startRevocationWatch` polls `poll()` every 5 seconds (the operator's `iynk-server revoke` may run in another process, UNKNOWN until T-B6-06 is read) and calls `closeDevice(id, 4401)`.
- State transitions: socket `connected` to `challenged` to `authenticated` to `closed`. Validation and errors: as above; the error frame code `unauthorized` with close 4401, never a reason that distinguishes unknown from revoked.
- Edge cases: a device with a valid key but not a member of the room is authenticated here and refused in T-B7-21 with `room_unavailable` and 4403 after a fixed 200 ms minimum delay (RT 5.2); signature bytes longer than 64 are refused before any crypto; a `hello` frame with `sig` as a number is `bad_frame`.
- Permissions: authentication only. Performance: `verifyHello` p95 under 2 ms (RA-05 target; measured and printed by the test, HYPOTHESIS until then).
- Migration: none.
- Data model: reads `devices` (`id`, `identity_id`, `public_key`, `name`, `revoked_at`); writes nothing; nonces live in memory for the hello window. Input and output schemas: `Hello` in, `{ok, device}` or `{ok: false, code: "unauthorized"}` out. API contract: the handshake of RT 4.3 on `/ws`.

**Verification**
- Unit tests, `server/test/ws-auth.test.ts` (RA-05; keys made with `crypto.generateKeyPairSync("ec", {namedCurve: "P-256"})`, signatures in the P1363 form like WebCrypto's): valid hello accepted; replay of the same hello rejected (nonce consumed); signature for another `aud` rejected; for another room rejected; unknown device; revoked device; device id that does not match the key; hello after the window (virtual clock) rejected; `AuthLimiter` blocks after 5 failures in a minute for 5 minutes and unblocks after; supersede closes the old handle with 4001 and keeps the new; `closeDevice` closes every handle of the device and returns the count; revocation watch with a fake poll closes within one poll interval; p95 of 1,000 verifications printed and asserted under 2 ms.
  If T-B7-02 Q1 shows Node rejecting the P1363 form, this test is the first to fail and the task stops (blocker).
- Integration: socket-level cases run in T-B7-34. Playwright: none.
- Fixtures: none (keys generated per run).
- Acceptance: Given a captured valid `hello`, When it is sent on a new socket, Then `unauthorized`, 4401, host unchanged (SECURITY_BASELINE R4). Given a revoked device with an open socket, When the watch ticks, Then the socket closes.
- Observability: log `ws.auth_fail {tag}` with the salted address tag only; counter `iynk_ws_auth_fail_total`; histogram `iynk_ws_verify_seconds`.
- Release blockers: any failure path that differs observably between unknown and revoked.

**Delivery**
- Definition of done: tests pass.
- Verify commands: `npm run typecheck && npm run lint`; `cd server && node --test test/ws-auth.test.ts`; `npm run server:typecheck`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `NonceStore`, `verifyHello`, `AuthLimiter`, `SessionRegistry`, `addressTag`.

---

### T-B7-13 Checkpoints, compaction and resume

| Field | Value |
|---|---|
| Subsystem | `server/src/rooms` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-03, T-B7-06 |
| Status | not started |
| Features, requirements | F-121, F-165; R-083, R-087, R-098; ADR-0505; RC-04, RC-06; RA-04, RA-06 (store part) |

**Intent**
- Problem: a rejoining client must get its missing edits without the server replaying 10,000 ops over a slow link, and a restart must not lose or silently corrupt a room. RS-09 found that a retention shorter than the checkpoint interval makes resume impossible and rejects stale text edits (18,554 rejections at retention 150 and 400, REPORT).
- Target user: a member whose phone slept, a member who joins late, Amar after a server restart.
- User story: as a friend, I come back after 40 seconds and I am current in under 2 seconds.
- Expected behaviour: a checkpoint every 500 ops or 10 minutes with activity (keep 8 plus named); payloads for the latest 20,000 ops; a tail is sent only if the gap is at most 1,000 ops and at most 200 KB gzipped, otherwise the latest checkpoint plus the tail since it; a room loads lazily and its chain is verified; a failed check marks the room `corrupt`.
- Success metric: RA-04's six paths all end in equal state; reconnect to `ready` after a 1,000-op gap under 2 s on loopback and on a 10 Mbit/s, 80 ms shaped link (BA-07, recorded in T-B7-34).

**Implementation**
- Existing files: `server/src/rooms/core.ts`, `types.ts` (T-B7-06: `Checkpointer`, `RoomInit`), `server/src/store/rooms.ts` (T-B7-03), `src/project/hash.ts` (T-B2-09: canonical bytes, `stateHash`, `chainStart`, `chainNext`).
- Files: new `server/src/rooms/checkpoint.ts`, `server/src/rooms/resume.ts`.
- Modules and signatures:

```ts
// checkpoint.ts
export class CheckpointPolicy implements Checkpointer {
  constructor(repo: RoomsRepo, limits: CollabLimits, clock: () => number);
  afterCommit(core: RoomCore, group: CommitWrite[]): void;   // every checkpointEveryOps ops or checkpointEveryMs with activity: gzip(canonical doc) -> putCheckpoint kind "auto"; pruneCheckpoints(keep, named kept); nullOldPayloads(keepPayloadOps)
}
export type LoadResult = { ok: true; init: RoomInit; members: MemberRow[]; fromCheckpoint: number; replayed: number }
  | { ok: false; reason: "missing" | "corrupt"; atSeq?: number };
export function loadRoomState(repo: RoomsRepo, id: RoomId): LoadResult;     // latest checkpoint + tail through apply, chain checked at the head
export function verifyChainFull(repo: RoomsRepo, id: RoomId): { ok: true } | { ok: false; atSeq: number };   // every retained envelope, for diagnostics and tests
export function restoreFromCheckpoint(repo: RoomsRepo, id: RoomId, random: (n: number) => Uint8Array): { epoch: string; seq: number } | null;   // newest checkpoint whose chain verifies; new epoch; state back to open
// resume.ts
export type ResumePlan = { kind: "none" | "tail" | "snapshot" | "ff"; reason: Snapshot["reason"] | null; epochBreak: boolean; frames: ServerFrame[] };
export function decideResume(repo: RoomsRepo, room: { id: RoomId; epoch: string; seq: number; chain: string }, hello: Pick<Hello, "resume" | "local">,
  limits: CollabLimits, gzipSize?: (envs: OpEnvelope[]) => number): ResumePlan;
```
- Data model: `checkpoints(room_id, seq, state_hash, chain, doc gzip, at, kind IN ('auto','named','genesis'))`; checkpoint 0 is `genesis`. Nothing in B7 creates `named` rows (named versions are a history feature, F-093, B5); `pruneCheckpoints` simply never deletes them. The epoch is 8 random base32 characters.
- Algorithm (`decideResume`, RT 11.4, in this order):
  1. `resume.epoch !== room.epoch` or `resume.seq > room.seq`: `snapshot`, reason `epoch`, `epochBreak: true`.
  2. `resume.seq === room.seq`: `none`.
  3. Else if the retained tail from `resume.seq + 1` exists (no NULL `env` in the range) and has at most `resumeTailOps` envelopes and `gzipSize(envs) <= resumeTailGzipBytes`: `tail` with one `Tail` frame. `gzipSize` defaults to `zlib.gzipSync(JSON.stringify(envs)).length` (about 2.8 ms for 1,000 ops, RS-09).
  4. Else `snapshot` (reason `resume`): the latest checkpoint as a `Snapshot` (`doc` at the checkpoint's `seq`) followed by a `Tail` from there to the head.
  5. No `resume` but `hello.local {rev, chain}` with `repo.chainAt(room, rev) === chain`: `ff` with a `Tail` from `rev + 1` (or snapshot plus tail if the tail is over the limit); a chain mismatch: `snapshot`, reason `join`.
  6. No `resume`, no `local`: `snapshot`, reason `join`.
  `loadRoomState` loads the newest checkpoint, then replays every retained envelope after it through `apply`, recomputing the chain with `chainNext`; the result must equal `rooms.chain` and `rooms.seq`, else `{ok:false, reason:"corrupt"}`. A checkpoint document that fails V1 to V5 is also `corrupt`. `restoreFromCheckpoint` walks checkpoints newest first, takes the first whose own chain verifies against the retained ops after the previous good one, truncates `ops` above it, sets `rooms.seq` and `chain`, writes a new `epoch`, event `room.restore`.
  `afterCommit` computes the document from `core.doc` (already in memory). The cost is 18.5 ms at the largest allowed document on an M4 Pro (ESTIMATED 4x on a small server, about 75 ms every 500 ops, RT 11.2); if T-B7-34 shows a stall over 100 ms the work moves to a `worker_threads` worker, which changes only this file.
- State transitions: room `open` or `idle` to `corrupt` on a failed load; `corrupt` to `open` only through `restoreFromCheckpoint` called by an owner (T-B7-18 exposes it).
- Validation and errors: `ResumePlan.frames` never contains a document the server did not validate on load. A `resume.seq` of a negative number is `bad_frame` upstream.
- Edge cases: payloads nulled for the requested range falls through to step 4; a checkpoint at the head means the snapshot needs no tail; a client ahead of the server after a power-loss restore with `IYNK_STORE_SYNC=normal` gets `epochBreak` and the client re-queues its acked-beyond ops (T-B7-15); two checkpoints due in one `flush` produce one.
- Permissions: none here. Performance: `decideResume` for a 1,000-op gap under 10 ms (RS-09 Node: 2.8 ms for the tail), `loadRoomState` for 500 ops after a checkpoint under 150 ms (ESTIMATED).
- Migration: none.
- Input and output schemas, API contract: no route; the output is the frames `Snapshot`, `Tail`, `Ready` and the `welcome.resume` value of T-B7-01.

**Verification**
- Unit tests, `server/test/resume.test.ts` (RA-04, table driven over the six paths with a real repo and a seeded room of 3,000 ops: expected `kind`, `reason`, `epochBreak`, and that applying the frames to the client's state gives the server's `stateHash` and `chain`); the gap of exactly 1,000 ops is a `tail`, 1,001 a `snapshot`; a tail whose gzip is over 204,800 bytes (generated with 64 KiB `source.edit` inserts) is a `snapshot`; nulled payloads force `snapshot`.
  `server/test/checkpoint.test.ts` (RA-06 store part): 1,200 ops produce checkpoints at 500 and 1,000 plus genesis; with 10 checkpoints only 8 remain; `nullOldPayloads` keeps summary columns; a restart (fresh `RoomCore` via `loadRoomState`) gives the same chain; **flipping one byte of a retained `ops.env` after the latest checkpoint makes `loadRoomState` return `corrupt`**; `verifyChainFull` finds a flipped byte anywhere in retained ops; `restoreFromCheckpoint` returns to the previous checkpoint with a new epoch and the room accepts new ops; a client with the old epoch then gets `epochBreak`.
- Integration: socket-level resume runs in T-B7-34 (BA-07) and T-B7-24.
- Playwright: none. Fixtures: `server/test/fixtures/room-3000-ops.json` generated once by the T-B2-16 generators (as `room-doc-500.json` in T-B7-06) and committed; T-B7-20 comes later in group 4 and is not needed.
- Acceptance: Given a client 40 ops behind, When it reconnects, Then it receives one `Tail`, then `ready`. Given a client 5,000 ops behind, Then a `Snapshot` and a short `Tail`.
- Observability: log `room.checkpoint {room, seq, bytes, ms}`, `room.corrupt {room, atSeq}` (error level), `room.restore`; histogram `iynk_checkpoint_seconds`; counter `iynk_resume_total{kind}`.
- Release blockers: a room that loads with a chain mismatch; a snapshot sent that has not passed validation.

**Delivery**
- Definition of done: tests pass.
- Verify commands: `npm run typecheck && npm run lint`; `cd server && node --test test/resume.test.ts test/checkpoint.test.ts`; `npm run server:typecheck`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `CheckpointPolicy`, `loadRoomState`, `decideResume`, `restoreFromCheckpoint`, `verifyChainFull`.

---

### T-B7-14 Baton, host commands and succession

| Field | Value |
|---|---|
| Subsystem | `server/src/rooms` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-04, T-B7-06 |
| Status | not started |
| Features, requirements | F-120, F-122; R-075 (R5, R6), R-093, R-094; ADR-0504, ADR-0509; SECURITY_BASELINE R5, R6 |

**Intent**
- Problem: any peer can send `room/baton` (`src/lib/realtime/room.ts:586-598`); host is the first key of a Map (`server/realtime/src/room.js:47-50`); bans are by client-chosen id (`room.js:121-128`); there is no lock or mute.
- Target user: the host, the baton holder, and the buddy helping with code.
- User story: as a buddy helping Amar, I ask for the keyboard, he hands it over, I type, I give it back; if I walk away it comes back to him.
- Expected behaviour: baton and host are database facts changed only by commands from the right member. The baton gates `source.*` ops (T-B7-04) and nothing else. Kick, mute, lock, settings, close, pass host, claim host. A holder who disconnects keeps the baton 30 seconds; a host who disconnects keeps the role for 60 seconds.
- Success metric: every denial case of RT 16.2 rows `R6 baton theft` and `R5` is refused and the room continues.

**Implementation**
- Existing files: `server/src/rooms/core.ts`, `types.ts` (`CommandRegistry`), `permissions.ts` (T-B7-04), `store/rooms.ts` (T-B7-03: `patchRoom`, `patchMember`, `addEvent`), `src/protocol/frames.ts` (`Cmd`, `CmdName`, `RoomEvent`).
- Files: new `server/src/rooms/baton.ts`, `host.ts`, `succession.ts`, `commands.ts`.
- Modules and signatures:

```ts
export interface Timers { set(fn: () => void, ms: number): () => void }       // returns cancel; tests pass a virtual one
// baton.ts
export class Baton { constructor(holder: Actor | null, timers: Timers, holdMs: number);
  get holder(): Actor | null;
  request(by: Actor): { granted: boolean; askedOf: Actor | null };   // no holder: granted at once
  grant(to: Actor): void; release(): void; take(by: Actor): void;
  disconnected(actor: Actor, onFree: () => void): void; reconnected(actor: Actor): void }
// succession.ts
export class HostSuccession { constructor(timers: Timers, graceMs: number);
  hostLeft(onExpire: () => void): void; hostBack(): void;
  pick(present: readonly { actor: Actor; role: Role; presentSince: number; spectator: boolean }[]): Actor | null }   // longest-present owner, else editor, else null
// host.ts
export function kick(core: RoomCore, by: MemberRef, target: Actor): Outbound[];
export function mute(core: RoomCore, by: MemberRef, target: Actor, on: boolean): Outbound[];
export function lock(core: RoomCore, by: MemberRef, on: boolean): Outbound[];
export function changeSettings(core: RoomCore, by: MemberRef, patch: Partial<RoomSettings>): Outbound[];
export function closeRoom(core: RoomCore, by: MemberRef): Outbound[];
export function passHost(core: RoomCore, by: MemberRef, to: Actor): Outbound[];
export function claimHost(core: RoomCore, by: MemberRef): Outbound[];
// commands.ts
export function createCommandRegistry(d: { repo: RoomsRepo; limits: CollabLimits; clock: () => number; timers: Timers }): CommandRegistry & {
  memberLeft(core: RoomCore, m: MemberRef): Outbound[]; memberBack(core: RoomCore, m: MemberRef): Outbound[] }
```
- Data model: `rooms.host_actor`, `rooms.baton_actor`, `rooms.settings` (JSON `RoomSettings`), `room_members.muted`, `room_members.banned`, `rooms.state`. Each command writes an `events` row (kinds `baton.request`, `baton.grant`, `baton.release`, `baton.take`, `baton.free`, `host.pass`, `host.claim`, `host.expire`, `member.kick`, `member.mute`, `room.lock`, `room.settings`, `room.close`) and sends an `event` frame to the room with `by` and small `data` (target actor, new value). The frame never carries a device id.
- Algorithm and rules (RT 6.2 and 6.3):
  - `baton.request`: editor or owner present; no holder: granted to the requester, event `baton.grant`; else event `baton.request` to the room (the UI shows the holder and host).
  - `baton.grant {to}`: by holder or host; the target must be a present owner or editor.
  - `baton.release`: holder. `baton.take`: host only, any time.
  - Holder disconnect: start a 30 s timer; reconnect within it cancels it; on expiry the baton is free, event `baton.free`, host told.
  - `member.kick {actor}`: host only; target cannot be the creator or the host or the caller; the member row gets `banned = 1`; outbound `error kicked` and close 4003; a banned device can never rejoin, even with a valid invite (checked in T-B7-21 and T-B7-25).
  - `member.mute`: host only; `muted` flag; chat gets `permission` (T-B7-07). `room.lock {on}`: host only; new joins get `locked`; members stay. `room.close`: host or any owner; state `closed`; event `room.close` with `{seq, chain}`; then close 1000 for every socket.
  - `room.settings`: host only; `codeMode` `"open"` is refused `bad_frame` with the text "Open code mode is not built yet" (D5); `maxMembers` and `maxSpectators` can only go down and not below the current count; `runControl` is stored (B8 reads it).
  - `host.pass {to}`: host to a present owner or editor. `host.claim`: the creator, any time, if present. Host succession: host's last socket ends, 60 s timer; expiry picks `pick(present)`; no one present means `host_actor = null` (roles still enforced; baton and settings stay).
  - Every command is rate-limited as a frame; a `permission` answer carries `ref: cmd.id`.
- State transitions: baton `free` / `held(actor)` / `held-away(actor, expires)`; host `present` / `away(expires)` / `none`; room `open` / `locked` / `closed`.
- Validation and errors: unknown `CmdName` is `bad_type` upstream; target not a member: `permission` (same answer as not allowed); settings out of range: `bad_frame`.
- Edge cases: the holder is kicked: baton freed in the same step; the host is the only owner and leaves: `HostSuccession.pick` returns null after the grace and the creator can still `host.claim` on return; `baton.grant` to someone who left: refused; two simultaneous `baton.request` with no holder: the first in server order gets it, the second becomes a normal request; closing an already closed room: idempotent `event` only to the caller.
- Permissions: `authorizeCmd` (T-B7-04). Performance: constant. Migration: none.
- Input and output schemas, API contract: input is a `Cmd {id, name, args}` frame; output is `RoomEvent` frames, `error` frames with `ref = cmd.id` and close directives. No HTTP route.

**Verification**
- Unit tests, `server/test/baton-host.test.ts` (virtual `Timers` and clock): request with no holder grants; request with a holder asks; grant by non-holder editor is `permission`; take by non-host is `permission` and the baton is unchanged (R6); holder disconnect, 29 s then back keeps it, 31 s frees it and tells the host; kick of the creator refused; kick bans and the next `hello` for that device is refused; mute then chat `permission`; lock then join `locked`; settings `codeMode: "open"` refused; `maxMembers` raised refused; pass host to a viewer refused; succession picks the longest-present owner, else editor, else none; host back within 60 s changes nothing; close writes the event and closes sockets; every command writes its `events` row with no device id.
- Integration: through the socket in T-B7-34 (hostile rows `R6 baton theft`, `R6 role escalation`).
- Playwright: T-B7-35. Fixtures: none.
- Acceptance: Given a non-holder editor, When they send `source.edit`, Then `not_baton` and the log is unchanged. Given Amar (host) is away 61 s, When the timer expires, Then the longest-present owner becomes host and the room is told.
- Observability: counters `iynk_cmd_total{name,result}`; events table; log `room.host_changed`.
- Release blockers: any baton or host change without a command from an allowed member.

**Delivery**
- Definition of done: tests pass.
- Verify commands: `npm run typecheck && npm run lint`; `cd server && node --test test/baton-host.test.ts`; `npm run server:typecheck`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `createCommandRegistry`, `Timers`, `HostSuccession`, `Baton`.

---

### T-B7-15 `RoomClient`: optimistic view, pending queue, rebase report

| Field | Value |
|---|---|
| Subsystem | `src/collab` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-01, T-B7-11; B2 `apply`, B4 stores (read only) |
| Status | not started |
| Features, requirements | F-121; R-086, R-087, R-088, R-089, R-090; ADR-0508; FRONTEND 6.4; RA-02, RA-07 |

**Intent**
- Problem: the v1 client replays raw actions through two `dispatch` monkey-patches (`src/lib/realtime/store-sync.ts`, `shared-actions.ts`) with no confirmation, rejection or rebase.
- Target user: every member; the person whose Wi-Fi drops.
- User story: as Amar, when the link drops I keep wiring, and when it returns my edits go in, and if a friend deleted a part I was editing I am told which change was dropped and why.
- Expected behaviour: a confirmed document (server order only) plus a queue of pending submissions replayed on top as the visible view; one submission in flight; rejections drop the submission and rebuild the view; reconnect resumes from the last confirmed `seq`; the queue holds 1,000.
- Success metric: T-B7-20 (model client) and T-B7-24 (this client) show zero divergence in 40 runs; the queue never exceeds 1,000.

**Implementation**
- Existing files: `src/project/apply/index.ts`, `src/project/hash.ts`, `src/project/authority.ts` (`Authority`, T-B2-10), `src/protocol/*` (T-B7-01), `src/collab/ws-transport.ts`, `backoff.ts`, `memory-transport.ts` (T-B7-11). The module must not touch `window`, `document`, `localStorage` or React (checked by `src/collab/purity.test.ts`), so the same code runs in Node under the T-B7-24 property test.
- Files: new `src/collab/client.ts`, `src/collab/queue.ts`, `src/collab/rebase.ts`.
- Modules and signatures:

```ts
// queue.ts
export type PendingSub = { sub: number; batch: string | null; ops: { opId: string; base: number; op: Op }[]; kind: "user" | "ai"; proposal?: string; sentAt: number | null };
export class PendingQueue { constructor(max: number);
  push(s: Omit<PendingSub, "sub" | "sentAt">): { ok: true; sub: number } | { ok: false; reason: "queue_full" };
  head(): PendingSub | undefined; markSent(sub: number, at: number): void; ack(sub: number): PendingSub | undefined;
  drop(sub: number): PendingSub | undefined; all(): readonly PendingSub[]; readonly length: number;
  mergeTail(): void }       // consecutive unsent view.place of one component, or component.set of one parameter, collapse; never across a batch or another op on the same id
// rebase.ts
export type DropReason = { code: ErrorCode; rule?: string; byActor: Actor | null; targetId: string | null; index: number };
export type RebaseReport = { dropped: { sub: number; reason: DropReason; ops: Op[] }[]; at: number;
  localBefore: ProjectDocument };    // the local view just before the replay; "Keep a copy" forks this (RT 12.2). An immutable reference, so no copy is made
export function explainReject(rej: Reject, sub: PendingSub, tail: readonly OpEnvelope[]): DropReason;   // finds the committed op that caused it (the remove of the part, the use of the pin), author from the envelope
export function rebuildView(confirmed: ProjectDocument, pending: readonly PendingSub[], applyFn: typeof apply): { view: ProjectDocument; locallyInvalid: PendingSub[] };
// client.ts
export type ClientState = "connecting" | "authenticating" | "syncing" | "live" | "reconnecting" | "ended" | "failed";
export type ClientEvent =
  | { t: "state"; state: ClientState; detail?: string } | { t: "view"; confirmedSeq: number }
  | { t: "remote"; envs: OpEnvelope[] } | { t: "acked"; sub: number; seq0: number; seq1: number; inverse: Op[]; dup: boolean } | { t: "rejected"; sub: number; reason: DropReason }
  | { t: "rebase"; report: RebaseReport } | { t: "room"; frame: ServerFrame }          // welcome, event, presence, cursors, chat, check
  | { t: "ended"; why: "kicked" | "closed" | "unavailable" | "superseded" };
export type RoomClientOptions = { room: RoomId; me: { device: DeviceId }; connect: () => RoomTransport; applyFn: typeof apply;
  clock: () => number; random: () => number; timers: Timers; hidden: () => boolean;
  start?: { epoch: string; seq: number; chain: string; doc: ProjectDocument } | { local: { rev: number; chain: string; doc: ProjectDocument } } | null;
  maxPending?: number /* 1000 */; onDivergence?: (d: { reason: "chain" | "hash" | "apply"; seq: number }) => void };
export class RoomClient {
  constructor(o: RoomClientOptions);
  start(): void; stop(): void;
  readonly state: ClientState; readonly confirmedSeq: number; readonly confirmed: ProjectDocument | null; readonly pendingCount: number;
  /** Computed on demand from `confirmed` plus the pending queue; never stored, so `ProjectSession` stays the one visible state. */
  getView(): ProjectDocument | null;
  submit(ops: Op[], meta?: { batch?: string; kind?: "user" | "ai"; proposal?: string }): { ok: true; sub: number } | { ok: false; reason: "queue_full" | "not_ready" | "ended" };
  send(frame: ClientFrame): void;    // presence, cursor, chat, cmd: ephemeral, never queued
  on(h: (e: ClientEvent) => void): () => void;
}
```
- Algorithm (RS-09 client plus RT 11 and 12):
  - `start`: build a transport, `state = connecting`; on `welcome` set `authenticating` then `syncing`; the `hello` carries `resume {epoch, seq, chain}` from the last confirmed state (if any) and `local` when the caller supplied a local copy of the same project id.
  - Resume handling by `welcome.resume`: `none` keep; `tail` apply each envelope to `confirmed` with `applyFn` and verify `chainNext` against `Tail.chain`; `snapshot` replace `confirmed` (validate `stateHash` of the snapshot against `Snapshot.stateHash` using `src/project/hash.ts`); `ff` apply the tail onto the local copy. An `epochBreak` rebuilds `confirmed` from the snapshot and re-queues, before the other pending work and with their original `opId`s, the submissions the client had seen acknowledged beyond the snapshot's `seq` (it keeps the last 1,000 acked submissions since the last snapshot for exactly this).
  - On `ready`: set `live`, send the head pending submission (a submission that was in flight when the socket died is sent first with the same `opId`).
  - Own ack (`commit` with `ack.sub`): the submission leaves the queue; `confirmed = applyFn` of its ops; `confirmedSeq = seq1`; the chain adopted is the server's `commit.chain` (the author's copy has no envelopes and no `at`, so the client cannot recompute it, HYPOTHESIS that this is safe: remote commits and `stateHash` checks still detect a divergent server); the inverse is emitted in an `acked` event (the `DocStore` keeps the undo stacks, ADR-0805; the client keeps none, so there is one source of truth); the next pending submission is sent.
  - Remote `commit` (with `envs`): apply each to `confirmed`, verify `chainNext` equals `commit.chain` (mismatch: `resync {reason: "chain"}`), then `rebuildView`; pending submissions that are now locally invalid are dropped (not the one in flight) and listed in the report as `droppedLocal`.
  - `reject`: drop the in-flight submission, build a `DropReason` with `explainReject` from the tail envelopes it holds, emit `rejected`, rebuild the view, send the next.
  - `check {seq, chain, stateHash?}`: if `confirmedSeq === seq` compare chains (and every fifth, `stateHash` when the queue is empty); if behind, compare against the chain recorded at that `seq` when it is in the last 256 recorded; mismatch: `resync` and `onDivergence`.
  - `error`: `not_ready` and `rate_limited` wait and resend; `server_error` resends with the same `opId` after backoff; `permission` and `not_baton` drop the submission and emit `rejected`; `superseded`, `kicked`, `room_unavailable`: `ended`; `upgrade_required`, `schema_mismatch`: `failed`.
  - Socket loss or `1012`: `reconnecting`; reconnect after `backoffMs(attempt, random, hidden())` (T-B7-11); editing continues (the view is `confirmed` plus pending); the offline banner is the UI's job at 3 seconds (T-B7-26).
  - `submit` when `pending.length >= maxPending`: `queue_full` (the UI pauses room editing; the local copy is safe, R-088).
  - After the first `ready` of a session the client sends `rebase` events once per reconnect with the collected report (empty reports are not emitted).
- State transitions: RT 11.3 diagram exactly; `ended` and `failed` are terminal.
- Validation and errors: server frames come through `parseServerFrame` (T-B7-01); an `apply` failure on a server-ordered envelope sends `resync {reason: "apply"}` and `onDivergence`; the client never trusts a snapshot's `stateHash` field without recomputing it.
- Edge cases: two `submit` calls before `ready` queue in order; a batch whose first op was merged away still keeps one `opId`; a reconnect while a `Snapshot` is arriving restarts the sync; `stop()` closes the transport and cancels timers.
- Permissions: the client does not check roles; the server does. The UI (T-B7-19 and T-B7-26) blocks edits for viewers to avoid flicker.
- Performance: applying a `commit` of one op to a 500-part document under 2 ms p95 on desktop (RB-10, measured in T-B7-24); no allocation per frame beyond the parsed object.
- Migration: none.
- Data model: the confirmed `ProjectDocument`, a `PendingQueue` of submissions, a ring of the last 256 recorded chains and the last 1,000 acknowledged submissions since the last snapshot; nothing is persisted. Input and output schemas, API contract: server frames in; `Submit`, `Resync` and ephemeral frames out, per T-B7-01; the socket only.

**Verification**
- Unit tests: `src/collab/queue.test.ts` (limit 1,000, merge rules, `drop` and `ack` ordering); `src/collab/rebase.test.ts` (`explainReject` names the author of the remove that caused `missing_target`; `rebuildView` drops exactly the locally invalid submissions; report text parameters); `src/collab/client.test.ts` over `createMemoryNetwork` with a stub server speaking the T-B7-01 frames (not `RoomCore`; the real pairing is T-B7-24): handshake and resume paths none, tail, snapshot, ff, epochBreak; ack then next send; reject drops and rebuilds; 1,001st submit is `queue_full`; a transport drop mid-flight resends the same `opId`; `check` mismatch sends `resync`; `kicked` ends; backoff schedule used; `acked` carries the inverse and `dup` for a resent submission. `src/collab/purity.test.ts`: the module graph of `client.ts`, `queue.ts`, `rebase.ts` imports no DOM or React symbol (greps the imported files for `window`, `document`, `localStorage`, `react`).
- Integration: T-B7-24. Playwright: T-B7-35.
- Fixtures: `src/collab/__fixtures__/script-offline-3-drops.json` (the RA-07 script: offline edits where three submissions will be dropped).
- Acceptance: Given three pending submissions and a friend who deleted R3 meanwhile, When the client reconnects, Then the report lists exactly the submissions that touched R3, each with the friend's actor id as `byActor`.
- Observability: client-side counters in a local diagnostics object (`resyncs`, `drops`, `reconnects`), shown in the local error log of R-009 when `onDivergence` fires; nothing is sent anywhere.
- Release blockers: a client that applies a snapshot it did not hash-check.

**Delivery**
- Definition of done: tests pass; `purity.test.ts` passes.
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/collab`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `RoomClient`, `ClientEvent`, `RebaseReport`, `DropReason`, `PendingQueue`.

---

### T-B7-16 Shares, client: API, asset sync and share dialog

| Field | Value |
|---|---|
| Subsystem | `src/collab`, `src/components/studio` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-05, T-B7-08 (asset query and upload), T-B7-09, T-B7-38 (`fetchAuthed`); B6 `src/server-client` |
| Status | not started |
| Features, requirements | F-089; R-095; ADR-0426; CM-08, CM-11 |

**Intent**
- Problem: the app has no way to produce a link or to revoke one; a link is a capability and the person must be told so before it exists.
- Target user: Amar sharing a project with one friend or a few.
- User story: as Amar, I choose "Read-only link", set it to expire, copy it, and later revoke it.
- Expected behaviour: a Share dialog with an audience (link or buddies only), an expiry (30 days by default, a chosen number of days up to 365, or none), allow-fork toggle, a plain warning before a link is made, a secret-shape warning, and a list of my shares with revoke. With no server it says "needs a server" and offers nothing else (R-095: a share link is never made from the browser alone; no project is ever put in a URL).
- Success metric: a share created in the dialog opens in a second browser (T-B7-36); a revoked share answers 404 at once.

**Implementation**
- Existing files: `src/server-client/client.ts` and `probe.ts` (T-B6-05, T-B6-11: authenticated requests, `features.shares`), `src/components/realtime/index.ts:4` (exports `QrCode`, reused for the link), `src/components/ui/Dialog.tsx` (`Dialog`, used by `InviteDialog.tsx:2`), `src/project/secret-scan.ts` (T-B7-09). The dialog is opened by the `share.open` command that `installCollab` registers (T-B7-41) and is rendered by `StudioEntry.tsx` (T-B7-41); this task edits neither file.
- Files: new `src/collab/share.ts`, `src/components/studio/ShareDialog.tsx`.
- Modules and signatures:

```ts
// share.ts
export type ShareRequest = { audience: "link" | "buddies"; expiry: { kind: "default" } | { kind: "days"; days: number } | { kind: "never" }; allowFork: boolean; label?: string };
export type ShareView = { id: string; audience: "link" | "buddies"; revision: number; stateHash: string; allowFork: boolean; label?: string; createdAt: string; expiresAt: string | null; opens: number; revokedAt: string | null };
export function stripForShare(doc: ProjectDocument): ProjectDocument;                       // removes history; the server strips too
export function expiryToIso(e: ShareRequest["expiry"], now: Date): string | null | undefined;   // undefined = omit field (server default 30 days)
export function shareLink(lang: string, origin: string, token: string): string;               // `${origin}/${lang}/studio#share=${token}` (D10)
export function createShare(c: ServerClient, doc: ProjectDocument, r: ShareRequest, now?: Date): Promise<{ share: ShareView; link: string; localHash: string; hashMatches: boolean }>;
export function listShares(c: ServerClient): Promise<ShareView[]>;                              // follows nextCursor to the end, at most 20 live
export function revokeShare(c: ServerClient, id: string): Promise<void>;
export function describeShareError(e: unknown): "needs_server" | "tooLarge" | "secret" | "liveLimit" | "expiry" | "network";
export function syncAssets(c: ServerClient, hashes: readonly string[], readBlob: (sha256: string) => Promise<Uint8Array | null>, room?: RoomId): Promise<{ uploaded: number }>;   // POST /v1/assets/query in batches of 256, then PUT /v1/assets/{sha256}[?room=] for each missing hash; throws when a blob cannot be read locally; also used by T-B7-22
// ShareDialog.tsx
export function ShareDialog(props: { open: boolean; onClose: () => void; doc: ProjectDocument; lang: string; t: Translate<StudioRooms> }): JSX.Element;
```
- Algorithm: before the first request the dialog runs `scanSecrets(doc)`; hits are listed by field name only (never the value) and the person must tick "I checked" to continue. For audience `link` the dialog shows, before the Create button is enabled, the text of `rooms.share.linkWarning` ("Anyone with the link can view and copy this project. Revoking stops it at once."). `createShare` first runs `syncAssets` over every `asset.sha256` the document lists, so the server's `asset_missing` rule does not fire for an honest client; it then sends `POST /v1/shares` with an `Idempotency-Key` header (random per dialog open), takes `token` from the reply, builds `shareLink`, computes the local `stateHash` with `src/project/hash.ts` and sets `hashMatches` (CM-08: it must equal the server's `stateHash`; a mismatch is shown as a plain error, nothing is hidden). The token exists only in component state and in the clipboard action; it is never written to storage or to a log. The link block uses `QrCode` and a Copy button like `InviteDialog.tsx`. The list shows label, audience, expiry in words, opens and a Revoke button with a confirm step.
- State transitions: `closed` to `form` to `creating` to `done(link)` to `closed`; list loads on open.
- Validation and errors: `describeShareError` maps HTTP `409 quota` to `liveLimit`, `422 secret_in_document` to `secret`, `422 invalid_expiry` to `expiry`, `413` or `422 quota` to `tooLarge`, a missing server to `needs_server`; each has a `rooms.share.*` string.
- Edge cases: a document over 5 MiB canonical is refused before upload with `tooLarge`; the dialog disables Create while a request is in flight; `never` is offered only if the probe's `limits` allow it (the server answers `invalid_expiry` otherwise, and the message says the server limits the lifetime); with `features.shares` false the dialog says "needs a server".
- Permissions: any enrolled identity. Performance: the dialog code is loaded lazily with the Studio's share command; it adds under 6 KB gzipped (ESTIMATED).
- Migration: none.
- Data model: a `ShareView` in memory; the token only in component state. API contract: `POST /v1/shares`, `GET /v1/shares`, `DELETE /v1/shares/{shareId}` (openapi `createShare`, `listShares`, `revokeShare`), and `POST /v1/assets/query` and `PUT /v1/assets/{sha256}` through `syncAssets` (openapi `queryAssets`, `putAsset`).

**Verification**
- Unit tests: `src/collab/share.test.ts` (fake `ServerClient`): `expiryToIso` for default, 7 days, never; `shareLink` fragment form and no `?`; `createShare` sends the stripped document, an `Idempotency-Key`, and returns `hashMatches`; `describeShareError` table; token never appears in `JSON.stringify` of any value the module returns except the `link`; `syncAssets` queries once per 256 hashes and uploads only the missing ones. `src/components/studio/ShareDialog.test.tsx` (RTL): warning visible before Create; secret hit blocks until ticked; `needs a server` state; revoke asks to confirm; the six-language copy renders with long German text without overflow classes missing (smoke).
- Integration: against the real server in T-B7-36. Playwright: T-B7-36.
- Fixtures: `src/collab/__fixtures__/doc-with-key.json` (a planted `sk-` key in a source comment).
- Acceptance: Given the warning text is not shown, When Create is pressed, Then nothing is sent (the button is disabled). Given a revoke, When confirmed, Then the row shows "withdrawn".
- Observability: none client side beyond the local error log on a failed call.
- Release blockers: a token written to storage; Create enabled without the warning.

**Delivery**
- Definition of done: tests pass; strings exist in six languages (T-B7-05).
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/collab/share.test.ts src/components/studio/ShareDialog.test.tsx`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `createShare`, `listShares`, `revokeShare`, `syncAssets`, `ShareDialog`, `shareLink`.

---

### T-B7-17 Buddies board in the fly workspace

| Field | Value |
|---|---|
| Subsystem | `src/server-client`, `src/components/flight`, `src/components/dronelab` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-05, T-B7-10, T-B7-38 (`fetchAuthed`); B0 (T-B0-16 removed the public board), B6 |
| Status | not started |
| Features, requirements | F-140; R-091; D-016; RC-65; CM-20 to CM-24; COMMUNITY 3.10 |

**Intent**
- Problem: T-B0-16 deletes the public leaderboard and live counter, so the fly workspace shows no board. D-016 wants a friendly one that shows only buddies.
- Target user: Amar and the friends he flies against.
- User story: as Amar, after a lap I see my best time and Mina's, and nobody else's.
- Expected behaviour: a panel under the course list shows the buddies' board for the course being flown. One opt-in for the leaderboard (not per track). A finished lap that is a personal best goes to the board only if opted in and signed in to a server. With no server or no sign-in the panel says so in words. No lap counts, no streaks.
- Success metric: CM-20 and CM-22 hold through the UI; with the server stopped the page has no console error and shows "needs a server".

**Implementation**
- Existing files: `src/components/dronelab/FlyWorkspace.tsx` (after T-B0-16; before it, lines `5,46,54-55,108-130,206` hold the public board, the `onBoard` bounds and `track("flight.lap")`; the builder re-reads the file because B0 changes it), `src/lib/flight/challenge.ts:20-21` (daily `board` id such as `daily-20261024`), `src/server-client/client.ts`, `probe.ts` (T-B6-05, T-B6-11), `flight.json` `board.*` keys (T-B7-05).
- Files: new `src/server-client/scores.ts`, `src/components/flight/BuddyBoard.tsx`; edit `src/components/dronelab/FlyWorkspace.tsx`.
- Modules and signatures:

```ts
// scores.ts
export function lapKey(craftId: string, courseOrBoardId: string): string;   // `lap.${craftId}-${course}` lower-cased, characters outside [a-z0-9._-] become "-", cut to 64; the daily challenge uses `lap.daily-<yyyymmdd>`
export const LAP_BOUNDS_MS: { readonly min: 1000; readonly max: 3600000 };
export function submitLap(c: ServerClient, key: string, timeMs: number): Promise<"sent" | "skipped" | "failed">;   // PUT /v1/scores/{key} {value, unit:"ms", better:"lower"}; skipped when out of bounds
export function getBoard(c: ServerClient, key: string): Promise<{ rows: BoardRow[]; better: "lower" | "higher" } | "none">;   // 404 -> "none"
export function removeScore(c: ServerClient, key: string): Promise<void>;
export type BoardRow = { rank: number; identityId: string; displayName: string; value: number; unit: string; submittedAt: string; you: boolean };
export function readOptIn(): boolean; export function writeOptIn(on: boolean): void;   // one flag, try/catch around storage
// BuddyBoard.tsx
export function BuddyBoard(props: { craftId: string; courseId: string; courseLabel: string; lang: string; t: Translate<FlightMessages>; refreshKey: number }): JSX.Element;
```
- Algorithm: the component probes the server (via `probe.ts`); states: `no-server` ("needs a server"), `signed-out`, `not-opted-in` (explains in one sentence that only buddies see names and times; a toggle sets the flag), `empty`, `rows`. Rows show rank, display name, time formatted with the existing `formatNumber` (`./text`), and "you". Ties show the same rank. There is no count and no "laps flown" anywhere. A "Remove my time" button calls `removeScore`. `FlyWorkspace.onEvent` (after `recordBest`, inside the existing `if (broken) return;` gate, so a lap flown with something broken on purpose never goes) calls `submitLap(client, lapKey(id, flightCourse.id), timeMs)` when `readOptIn()` and the client is signed in, fire and forget with a catch that writes to the local error log; the daily challenge lap uses `lapKey(id, challenge.board)`. After a successful submit the panel's `refreshKey` increments.
- State transitions: as the states above.
- Validation and errors: out-of-bounds time `skipped`; `409 score_key_mismatch` or `422` shown as one plain retry text, never a stack; network failure leaves the lap in local best (`recordBest` already ran).
- Edge cases: a key longer than 64 characters is cut before submit and the board uses the same cut; a buddy who has not opted in does not appear (they have no row); a craft or course id with an uppercase letter or underscore maps deterministically (unit test); opt-in storage blocked: the toggle works for the session only and says nothing alarming.
- Permissions: bearer token. Performance: one GET per course change and one after a successful submit.
- Migration: none. The old `/api/leaderboard` route and `laps_best_daily` are already gone (T-B0-16).
- Data model: one local flag `optIn`; board rows in memory. API contract: `PUT /v1/scores/{key}`, `DELETE /v1/scores/{key}`, `GET /v1/leaderboards/{key}` (openapi `submitScore`, `deleteScore`, `getLeaderboard`).

**Verification**
- Unit tests: `src/server-client/scores.test.ts` (fake client): `lapKey` for `hawk` + `canyon-run`, a name with uppercase and underscore, a 70-character name, and `daily-20261024`; bounds skip; 404 maps to `none`; submit body fields exactly `value`, `unit`, `better`. `src/components/flight/BuddyBoard.test.tsx` (RTL): each state renders its text; a tie renders equal ranks; no element contains a count; the toggle writes the flag; remove calls `removeScore`.
- Integration: server round trip in T-B7-36.
- Playwright: `e2e/fly.spec.ts` (existing, run unchanged) must still pass with no server: the panel shows `board.needsServer` and the page has no console error. The with-server case is T-B7-36.
- Fixtures: none.
- Acceptance: Given opt-in and a server, When a lap of 41.2 s is a personal best, Then `PUT /v1/scores/lap.hawk-canyon-run` is sent once. Given a lap flown with `broken` set, Then nothing is sent.
- Observability: none beyond the local error log.
- Release blockers: a name or count from a non-buddy on screen; submit without opt-in.

**Delivery**
- Definition of done: tests pass; `e2e/fly.spec.ts` passes.
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/server-client/scores.test.ts src/components/flight src/components/dronelab`; `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/fly.spec.ts` (written out: `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= NEXT_PUBLIC_REALTIME_URL= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL= NEXT_DIST_DIR=.next-build npx playwright test e2e/fly.spec.ts`).
- Documentation: none. Rollback: common rule.
- Later tasks need: `lapKey`, `submitLap`, `getBoard`, `BuddyBoard` (T-B7-36 drives them).

---

### T-B7-18 Room lifecycle, registry, quotas and room routes

| Field | Value |
|---|---|
| Subsystem | `server/src/rooms`, `server/src/http` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-03, T-B7-04, T-B7-06, T-B7-09 (validation worker), T-B7-13, T-B7-14 |
| Status | not started |
| Features, requirements | F-116, F-121, F-165; R-075 (R3, R2), R-083, R-084, R-085, R-098; ADR-0503, ADR-0505; RC-25, RC-71; RA-06 |

**Intent**
- Problem: any join to an unknown code creates a room and one address fills all 500 rooms for 30 minutes (SECURITY_BASELINE R3; `server/realtime/src/relay.js:219-229`, `config.js:14,29`). Rooms must be created by an enrolled device, counted, persistent and invisible to strangers.
- Target user: Amar opening a room on a project; the operator.
- User story: as Amar, "Work together" makes a room that survives a restart and that only my invited friends can find.
- Expected behaviour: `POST /v1/rooms` creates a room from a project snapshot and returns the `Room`. Rooms load lazily into memory (at most `maxLiveRooms`), are evicted 10 minutes after the last member leaves, close on request, reopen within 30 days, and are erased after that. A member sees only their own rooms; a stranger gets the same 404 whatever the reason.
- Success metric: 11 creations by one device give `quota` on the 11th (R3 junk rooms); a restart keeps every room; `GET /v1/rooms/{id}` for a missing room and for a room the caller is not in are byte-identical.

**Implementation**
- Existing files: `server/src/rooms/{core,types,checkpoint,commands}.ts` (T-B7-06, 13, 14), `server/src/store/rooms.ts` (T-B7-03), `server/src/shares/validate-worker.ts` (T-B7-09: `validateInWorker`), `server/src/http/{router,limits,classes}.ts` (T-B6-07), `openapi.yaml` operations `listRooms`, `createRoom`, `getRoom`, `closeRoom`, `reopenRoom`, `listRoomEvents`.
- Files: new `server/src/rooms/lifecycle.ts`, `server/src/rooms/registry.ts`, `server/src/http/rooms.ts`.
- Modules and signatures:

```ts
// registry.ts
export type OpenResult = { status: "ok"; core: RoomCore } | { status: "missing" | "closed" | "corrupt" | "live_cap" };
export class RoomRegistry {
  constructor(d: { repo: RoomsRepo; limits: CollabLimits; clock: () => number; timers: Timers; commands: ReturnType<typeof createCommandRegistry>;
    checkpoints: CheckpointPolicy; hasBlob: (room: RoomId, sha: string) => boolean; random: (n: number) => Uint8Array; metrics: CoreMetrics });
  open(id: RoomId): OpenResult;                         // lazy load via loadRoomState; counts toward maxLiveRooms
  live(): readonly RoomCore[]; liveCount(): number;
  evictIdle(): number;                                  // rooms with no member for idleEvictMs: flush, drop from memory, state "idle"
  roleOf(id: RoomId, device: DeviceId): Role | null;    // from room_members; banned means null
  listsAsset(id: RoomId, sha256Hex: string): boolean;   // from the live or checkpointed document's assets[]
  removeSharedAccess(a: DeviceId, b: DeviceId): { rooms: RoomId[]; after(): void };   // the body of the T-B7-39 BuddyRemovalHook: inside the unpair transaction it calls repo.removeCrossMembers and repo.deleteInvitesBetween (they join the outer transaction); after() closes the removed member's sockets with 4403 and drops them from live cores, and runs once after COMMIT
  dropDevice(device: DeviceId): RoomId[];               // revoked device: delete its member rows; a room left with no owner member closes
  sweep(): { closed: number; erased: number };
  shutdown(): void;                                     // flush every live room
}
// lifecycle.ts
export type CreateOutcome = { ok: true; room: RoomView } | { ok: false; status: 400 | 403 | 409 | 413 | 422 | 429; code: string; message: string };
export function createRoom(d: LifecycleDeps, device: DeviceRow, body: unknown): Promise<CreateOutcome>;
export function closeRoomByHttp(d: LifecycleDeps, device: DeviceRow, id: RoomId): { ok: true } | { ok: false; status: 404 };
export function reopenRoom(d: LifecycleDeps, device: DeviceRow, id: RoomId): { ok: true; room: RoomView } | { ok: false; status: 404 | 409 | 410 };
export function roomView(d: LifecycleDeps, id: RoomId, device: DeviceId): RoomView | null;      // null: not a member
export function listRoomsFor(d: LifecycleDeps, device: DeviceId): RoomView[];
export function listEvents(d: LifecycleDeps, device: DeviceRow, id: RoomId, after: number, limit: number): { items: RoomEventView[]; next: number | null } | null;   // owners only
// http/rooms.ts
export function roomRoutes(d: LifecycleDeps): RouteDef[];     // GET /v1/rooms, POST /v1/rooms, GET /v1/rooms/{id}, DELETE /v1/rooms/{id}, POST /v1/rooms/{id}/reopen, GET /v1/rooms/{id}/events
```
- API contract (openapi): buckets `read` (list, get), `room.create` (create), `room.write` (close, reopen), `room.read` (events), all in `BucketName` since T-B7-04; each `RouteDef` has `cls: "device"`. `RoomCreate {title (1 to 120), project, settings?}`; reply `201 Room {id, title, hostId, status, epoch, seq, opSchema, settings, members[], createdAt, closesAt?, closedAt?}` where `hostId` and each member's `identityId` are `usr_` actor ids and the response never carries a device id.
- Algorithm (create): (1) body size check against `maxProjectBytes` plus 10 percent for the envelope, `413` with code `quota`; (2) per-device buckets 6 per minute and 30 per hour (`429`); (3) stored rooms: 10 per device and `maxStoredRooms` per server (`409 quota`, messages "You have 10 rooms. Close one first." and "This server is full."); live cap does not apply at creation; (4) `validateInWorker(project, 5000)` runs V1 to V5 and the limits; failure `422` with the validation code; (5) strip `history`; (6) the owner binding: `project.access.owners` must include an actor X whose `actors[X].keyThumbprint` equals the caller's device thumbprint, else `422 owner_not_bound` (the client prepares this with a local `actor.set` and `access.set`, T-B7-22, so the stored document is byte-identical to the creator's local one and fast-forward works); (7) `repo.createRoom` writes the room, the creator as owner member (`actor` = X, `name` = device name, a colour from a fixed 8-colour palette by member index), checkpoint 0 kind `genesis` with `seq = project.revision` and `chain = chainStart(project.id)` at that revision, event `room.open`, in one transaction; `host_actor = X`; epoch from 8 random base32 characters; settings default `{codeMode: "baton", runControl: "editors", spectatorCursors: false, locked: false, maxMembers: 8, maxSpectators: 8}` merged with the body (refusing `codeMode: "open"`, D5).
  Room id: `rm_` plus 16 random base32 characters (80 bits), drawn from `crypto.getRandomValues`-grade randomness (`node:crypto`).
  `RoomRegistry.open`: `repo.getRoom`; missing is `missing`; state `closed` is `closed`; `corrupt` is `corrupt`; already live returns it; `liveCount() >= maxLiveRooms` is `live_cap` (the dispatcher closes 1013); else `loadRoomState`, build `RoomCore` with `deps`, cache. `evictIdle` is called by the sweep job every minute; an evicted room's state becomes `idle` and a later `open` returns it to `open`.
  `sweep` runs `repo.sweep(now, 30 days, 30 days)`: `idle` for 30 days without activity (and not pinned) becomes `closed`; `closed` for 30 days is erased with its rows (blobs by T-B7-08's sweep).
  `reopenRoom`: any owner; `closed` within 30 days becomes `open` keeping its epoch; a `corrupt` room is restored with `restoreFromCheckpoint` (new epoch, event `room.restore`) and returns `200` (D17: openapi has no restore route, and `reopen` is the owner's "bring it back" action, so corrupt uses it); not closed and not corrupt: `409`; erased: `410`.
  `closeRoomByHttp`: a host or any owner; delegates to `closeRoom` (T-B7-14) when the room is live, else sets the state directly with the event; `204`, idempotent.
  `listEvents`: owners only, `after` is the last `n` seen, at most 1,000 per page, ordered by `n`; non-owner gets the same 404.
- State transitions: RT 5.1 diagram: `open` / `locked` / `idle` / `closed` / `corrupt`.
- Validation and errors: `400` bad body; `403` never used for rooms (strangers get 404); `404` unknown or not a member (identical bodies and a fixed 200 ms floor on the response time so timing does not distinguish them, RT 5.2); `409 quota`; `413`; `422`; `429`.
- Edge cases: a project at exactly 5,242,880 canonical bytes is accepted, one more is refused; the same project can be opened in two rooms (different rooms, same `project_id`; the stored-room quota is the only limit); closing a room while a flush is queued commits the queue first; `removeSharedAccess(a, b)` only touches rooms where one is creator and the other a member, and leaves rooms both joined through a third person's room alone (UNKNOWN whether Amar wants those closed too; Q5); `dropDevice` of the only owner closes the room read-only (RT Q-R9 default: any other owner continues, else it closes).
- Permissions: bearer token for every route; membership for get; owner for events and reopen; owner or host for close.
- Performance: create of a 500-part project under 150 ms (validation dominates, ESTIMATED); `open` of a 20,000-op room under 400 ms (ESTIMATED). Registry memory under 3 MB per live room at 500 parts (RB-6, ESTIMATED).
- Migration: none beyond 002.
- Data model: rows of `rooms`, `room_members`, `checkpoints` and `events` (T-B7-03); in memory the map of live `RoomCore` objects.

**Verification**
- Unit tests, `server/test/room-lifecycle.test.ts` (RA-06 first half, R3): create then get then list; the 11th room for one device is `409 quota`; the 101st on the server is `409` "server full"; 7 creations in a minute give `429` on the 7th; an invalid project is `422` and leaves no row; a project with 5,242,881 bytes is `413`; a project without the owner binding is `422 owner_not_bound`; `codeMode: "open"` refused; stranger and member-less get/events/close return byte-identical 404; **a registry restart (new `RoomRegistry` over the same file) serves the same room with the same chain**; `maxLiveRooms = 2` makes the third `open` `live_cap`; `evictIdle` after 10 virtual minutes frees the slot; `sweep` closes at 30 days of idle and erases 30 days after close; reopen by a non-owner is 404; reopen of a corrupt room restores and changes the epoch; `dropDevice` and `removeSharedAccess` delete rows and report the rooms; `removeSharedAccess` called inside a `store.transaction` that then throws leaves every member row and invite in place, and `after()` closes only the removed member's sockets.
- Integration: HTTP-level through the router in T-B7-32 (`server/test/rooms.http.test.ts`, owned there); socket-level in T-B7-34.
- Playwright: T-B7-35. Fixtures: `server/test/fixtures/room-doc-500.json` (T-B7-06).
- Acceptance: Given an enrolled device, When it creates a room, Then it is host and owner and nobody else can fetch the room. Given a stranger probes 10,000 random room ids, Then every answer is the same 404 (R1, R2; the timing floor is asserted in T-B7-34).
- Observability: gauges `iynk_rooms_live`, `iynk_rooms_stored`; log `room.open`, `room.close`, `room.evict`, `room.erase` with the room id; counter `iynk_room_create_refused_total{reason}`.
- Release blockers: a route that returns a room to a non-member; creation by join anywhere.

**Delivery**
- Definition of done: tests pass.
- Verify commands: `npm run typecheck && npm run lint`; `cd server && node --test test/room-lifecycle.test.ts`; `npm run server:typecheck`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `RoomRegistry`, `createRoom`, `roomRoutes`, `LifecycleDeps`, `roomView`, the owner-binding rule (T-B7-22 builds the matching client step).

---

### T-B7-19 `RoomAuthority`, document link, edit-access gate and fork helpers

| Field | Value |
|---|---|
| Subsystem | `src/collab`, `src/studio`, `src/components/studio/wiring` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-05, T-B7-15; B2 `Authority`, B4 `DocStore` |
| Status | not started |
| Features, requirements | F-121; R-085, R-086, R-088; FRONTEND 6.4, ADR-0402; BA-12; RA-18 |

**Intent**
- Problem: `DocStore` must not know whether it is in a room (ADR-0402), yet a room needs it to submit batches, accept remote ones, rebuild after a rejection and refuse edits a viewer cannot make.
- Target user: every member editing in the Studio.
- User story: as Amar, I edit exactly as I do alone; the room is a property of the project, not a different editor.
- Expected behaviour: `RoomAuthority` implements the `Authority` interface over a `RoomClient`; `authorityLink` wires it to the `DocStore`; `DocStore` exposes `confirmedSeq` and an `access` value that makes `commit` refuse when the member cannot edit.
- Success metric: a 200-op script in the existing store test gives the same render count in local and room mode (FA-04: selector stability); BA-12: with the server stopped the browser keeps editing and queues up to 1,000.

**Implementation**
- Existing files: `src/project/authority.ts` (`Authority`, `PendingBatch`, `LocalAuthority`, T-B2-10), `src/studio/stores/doc.ts` (T-B4-02, T-B4-11: `createDocStore(session, link?)`, `commit(batch, { label, author? })`, `replaceSession`, `DocView.readOnly`; remote envelopes reach the visible state through `ProjectSession` as T-B2-10 defines), `src/components/studio/wiring/authorityLink.ts` (FRONTEND 4.3; it does not exist: B4's wiring files are `repositoryLink.ts`, `openProject.ts` and `simLink.ts`, VERIFIED by grep of the B4 task file, so this task creates it), `src/collab/client.ts` (T-B7-15).
- Files: new `src/collab/authority.ts`, `src/collab/fork.ts`; new `src/components/studio/wiring/authorityLink.ts`; edit `src/studio/stores/doc.ts`.
- Modules and signatures:

```ts
// authority.ts
export type EditAccess = { mode: "edit" } | { mode: "readonly"; reason: "role" | "queue_full" | "ended" | "share" | "closed"; action?: { id: "makeCopy" | "keepCopy"; run: () => Promise<void> } };
export type RoomStatus = { state: ClientState; offlineSince: number | null; pending: number; confirmedSeq: number; access: EditAccess;
  you: { actor: Actor; role: Role; spectator: boolean; host: boolean } | null; members: readonly MemberView[]; host: Actor | null; baton: Actor | null; settings: RoomSettings | null };
export class RoomAuthority implements Authority {
  readonly mode: "room";
  constructor(client: RoomClient, clock: () => number);
  submit(batch: PendingBatch): Promise<{ ok: true; envelopes: OpEnvelope[]; inverse: Op[] } | { ok: false; reject: RejectCode }>;
  onRemote(h: (envs: OpEnvelope[]) => void): () => void;
  onResync(h: (snapshot: ProjectDocument) => void): () => void;      // snapshot = confirmed plus pending, from client.getView()
  getStatus(): RoomStatus; subscribe(fn: () => void): () => void;    // for useSyncExternalStore
  leave(): void;
}
// doc.ts additions
//   type DocAccess = { mode: "edit" } | { mode: "readonly"; reason: string }   (declared in doc.ts, structural, so studio never imports collab; collab's EditAccess is assignable to it)
//   readonly confirmedSeq: number
//   setAccess(a: DocAccess): void; readonly access: DocAccess; DocView.readOnly (B4) is true while access.mode is "readonly" (one flag, not a second one)
//   commit(batch, opts) returns { ok: false, reject: "permission", message } when access.mode is "readonly" (no session change, no notification)
// fork.ts (logic only; the dialogs are T-B7-30)
export type ForkOrigin = { project: string; revision: number; stateHash: string };
export function forkDocument(doc: ProjectDocument, origin: ForkOrigin, newId: string, me: Actor): ProjectDocument;      // new project id, provenance.origin = { kind: "fork", project, revision, stateHash } (RC-40); history dropped
export function keepCopy(lib: Library, doc: ProjectDocument, origin: ForkOrigin): Promise<string>;                    // library.fork (T-B3-06); returns the new project id
export function planOnClose(isCreator: boolean): { keepId: boolean };                                                // creator keeps the project id; every other member forks (RT 12.3, Q-R3 default)
export function reconcileLocalCopy(local: { rev: number; chain: string } | null, roomChainAt: (rev: number) => string | null): "ff" | "separate" | "none";
```
- Algorithm (fork helpers): `forkDocument` calls `forkProject` (`src/project/fork.ts`, T-B3-06), so there is one fork code path (D24): it sets a new `id`, revision 0, empty history and `provenance.origin = {kind: "fork", project, revision, stateHash}` (the room id and chain are not stored in the file, RC-40; the server keeps them in the room record), and keeps the actors so the source's authors remain credited (COMMUNITY 3.7). `planOnClose`: the creator's library keeps the project id; every other member's last state becomes a new project (O-6: two copies never share an id). `reconcileLocalCopy` answers `ff` when the local copy's chain at its revision equals the room's, `separate` when a local copy under the same id exists but differs (the old copy is kept as its own project and the room copy takes the id), `none` when there is no local copy.
- Algorithm: `submit` maps `PendingBatch {batchId, base, author, ops}` to `client.submit(ops, {batch: batchId, kind: author.kind})`; the returned promise resolves on the matching `acked` event with envelopes rebuilt from the batch (`seq` from `seq0`, `author.actor` from the ack's member, `at` from the local clock: the author's copy has no server time, so these envelopes are for the local history only and are never used for chain checks, RoomClient keeps its own chain records), and resolves `{ok:false, reject}` on `rejected` with the reject code. `onRemote` fires when a remote `commit` arrives and the pending queue is empty (apply to the visible state directly); with pending work it fires `onResync` with `client.getView()` so the `DocStore` calls `replaceSession` (the confirmed state plus the remaining pending, RS-09). `getStatus` is derived: `access` is `edit` for owner or editor who is not a spectator while the state is not `ended` and the queue is not full; otherwise `readonly` with the reason (`queue_full` pauses room editing only; the person's local project keeps saving through `repositoryLink`, R-088). `offlineSince` is set when the state becomes `reconnecting` and cleared on `live`. The link module subscribes to the authority, copies `access` into `DocStore.setAccess` and `confirmedSeq` into the store, and calls `authority.submit` after `session.apply` (ADR-0402). No view is stored in the authority: `ProjectSession` stays the one visible state.
- State transitions: `RoomStatus.state` follows `ClientState`; `access` follows the rules above.
- Validation and errors: a `submit` after `ended` resolves `{ok:false, reject:"permission"}`. A batch of more than 40 ops is split by the caller (the T-B7-01 limit); the authority returns `{ok:false, reject:"quota"}` if given more.
- Edge cases: a rejected batch rebuilds the view and the person sees their change vanish; the banner text (T-B7-26) says why from `RebaseReport`. A remote commit arriving between `session.apply` and `submit` is handled in `RoomClient` order (the batch is queued after it). `leave()` stops the client and the link restores `LocalAuthority`.
- Permissions: the gate here is for comfort; the server is the authority (T-B7-04).
- Performance: no extra render per remote commit when pending is empty; `replaceSession` only on conflict.
- Migration: none. `DocStore` gains fields; its public method set is otherwise unchanged.
- Data model: `RoomStatus` and `EditAccess` in memory; no new persisted field. API contract: none (the socket is used through `RoomClient`).

**Verification**
- Unit tests: `src/collab/authority.test.ts` (memory network and a stub server): `submit` resolves with the inverse on ack; resolves `reject` with the code on a server reject; remote commit with no pending calls `onRemote`; with pending calls `onResync` with a snapshot equal to confirmed plus pending; `access` readonly for viewer, for `queue_full` at 1,000 and for `ended`; `offlineSince` set and cleared; `subscribe` fires once per change. `src/collab/fork.test.ts` (RA-18: `forkDocument` sets `origin.kind` `fork` with the room project's last revision and `stateHash`, a new id and keeps `actors`; `planOnClose(true)` keeps the id, `planOnClose(false)` does not; `reconcileLocalCopy` returns `ff` for a matching chain, `separate` for a mismatch, `none` without a copy; `keepCopy` of the pre-rebase document produces a project whose `stateHash` equals the recorded one). `src/studio/stores/doc.test.ts` (extend): `commit` while readonly returns `{ok:false, reject:"permission", message}` and notifies nobody; `confirmedSeq` follows the authority; the 200-op script gives the same number of subscriber calls with `LocalAuthority` and with `RoomAuthority` (FA-04).
- Integration: T-B7-24 runs the real client against `RoomCore`. Playwright: T-B7-35.
- Fixtures: none.
- Acceptance: Given the server stops, When the person keeps wiring, Then edits apply locally, `status.state` is `reconnecting`, `offlineSince` is set, and on return the queue is sent in order. Given a viewer, When they try to place a part, Then nothing changes and `access.reason` is `role`.
- Observability: none beyond the status object (the banner reads it).
- Release blockers: `DocStore` importing `src/collab` (the module matrix test `src/architecture.test.ts` must pass).

**Delivery**
- Definition of done: tests pass; `npx vitest run src/architecture.test.ts` passes (studio does not import collab).
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/collab src/studio/stores src/architecture.test.ts`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `RoomAuthority`, `RoomStatus`, `EditAccess`, `DocStore.setAccess`, `useSyncExternalStore`-ready `subscribe`.

---

### T-B7-20 Convergence harness on `RoomCore`: RA-01 and RA-02 with a model client

| Field | Value |
|---|---|
| Subsystem | `server/test` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-06, T-B7-13; B2 generators |
| Status | not started |
| Features, requirements | F-121; R-086, R-089; REF-4, DET-3, DET-4; RA-01, RA-02, RA-03 |

**Intent**
- Problem: RS-09 proved convergence on a toy document of parts and wires, not on nets, batches, cascades or `component.swap` (RT 8.3 gap table). The roadmap and RT make RA-01 a gate before rooms ship.
- Target user: Amar's trust that two people editing never end with different circuits.
- User story: as Amar, my buddy and I can wire at the same time for an hour and our circuits stay equal.
- Expected behaviour: a seeded property test runs 5 model clients against the real `RoomCore` and the real `apply`, with dropped connections, resends, undo, offline periods and snapshot resume, and checks four properties; three mutants must be caught.
- Success metric: 40 runs of at least 10,000 generated ops with zero divergence; the missing-cascade, skipped-op and net-cascade mutants are each caught in at least one run (RA-01).

**Implementation**
- Existing files: `08_RESEARCH_SPIKES/RS-09-op-log-collab/src/sim.js` (255 lines: virtual network, step generator, the four checks), `client.js` (147), `mutants.js` (20), `dedup-unit.js` (32); `src/project/testing/generators.ts`, `harness.ts` (T-B2-16); `server/src/rooms/*` (T-B7-06, T-B7-13).
- Files: tests only. New `server/test/property/harness.ts`, `server/test/property/model-client.ts`, `server/test/property/mutants.ts`, `server/test/property/rooms.property.test.ts`, `server/test/property/offline.property.test.ts`. No `server/package.json` edit: `RA01_RUNS` is read from the environment, and the `server:test` glob `test/**/*.test.ts` already reaches `test/property/`.
- Modules and signatures:

```ts
// harness.ts
export function createWorld(o: { seed: number; clients?: number /* 5 */; store?: "memory" | "file"; apply?: typeof realApply; limits?: Partial<CollabLimits> }): World   // RoomCore + repo + virtual network
export function generateStep(rng, world)        // weighted over: component.add/remove/set/swap, net.create/connect/disconnect/merge/split/rename/delete, view.place/unplace, wire.add/route/remove, board.add/remove/set, junction.*, label.*, param.set, source.edit (baton holder only), asset-free; batches of 1 to 6 ops; 1 in 30 adds reuses an id; 1 in 8 wires aims at a pin the client may not have
export function drive(world, steps)             // network events: drop, delay, resend, reconnect, undo, offline for up to 24 simulated hours
export function check(world)                    // the four properties below
// model-client.ts: a 150-line port of RS-09 client.js over the real apply and the T-B7-01 frames
// mutants.ts: wrap apply to (a) skip the wire cascade of component.remove, (b) skip every 997th accepted op (acked but not appended), (c) skip the pin-connection cascade of component.remove / board.remove
```
- Properties checked after quiescence (RS-09 method, extended):
  1. Every replica's `confirmed` state has the same canonical bytes and `stateHash` as the server's, and the same `chain` at the final `seq`.
  2. Each replica's view equals its confirmed state when its queue is empty.
  3. The final document passes the V3 invariants of `src/project/validate.ts` (no dangling wire, no net member on a missing pin, no pin used twice).
  4. No lost acknowledged op: every submission a client saw acked is in the server log once at the acked `seq`; generated = applied + rejected + locally invalid.
  Also every 1,000 steps: each client's chain at its own `seq` equals the server's chain at that `seq`.
  RA-02 additions: clients go offline for random periods up to 24 simulated hours, keep editing, and the pending queue never exceeds 1,000; after reconnect all replicas equal the server and the dropped submissions are exactly those the server rejected.
  RA-03 extra: one run per mode with `IYNK_STORE_SYNC` full and normal on a file store, and a restart of the `RoomCore` mid-run (new instance over the same file) with no divergence.
- Edge cases: seeds are 1 to 40; a failure prints the seed, the step number and writes the step log to `os.tmpdir()`; re-running with `RA01_SEED=<n>` reproduces it bit for bit (no wall clock, no `Math.random`). `RA01_RUNS` default 5 (so `SRV` stays quick); the exit gate sets 40.
- Permissions, performance: the 40-run gate takes a few minutes (ESTIMATED 3 to 10; RS-09 ran 36 runs in the same shape). Migration: none.
- Data model, schemas, API contract: none; the harness drives `RoomCore` in process over the repo of T-B7-03. State transitions: client `live`, `offline`, `reconnecting`; room `open`. Validation: the four properties above. Performance: minutes for 40 seeds (see Edge cases).

**Verification**
- Tests: `rooms.property.test.ts`: runs `RA01_RUNS` seeds, each at least 10,000 generated steps, asserts the four properties and prints per-run counts (generated, applied, rejected, rejections by code). Mutant tests: for each of the three mutants, run seeds until detected (at most 10 seeds) and assert detection; assert the unmutated server passes the same seeds. `offline.property.test.ts`: RA-02. A hand-built dedup test lives in `server/test/dedup.test.ts` (T-B7-06); this harness also resends 1 in 20 acked submissions to exercise it under load.
- Integration: this is the integration test of T-B7-06 and T-B7-13. Playwright: none.
- Fixtures: none (generated).
- Acceptance: Given 40 seeds of 10,000 or more steps, When the harness runs, Then zero divergence, zero lost acked ops, zero dangling wires, and each mutant detected. Given a mutant that skips the net cascade, Then property 3 fails.
- Observability: the run summary is written to `docs/MASTER_PLAN/05_ENGINEERING/results/B7-ra01.md` by the builder as part of the commit (numbers, seeds, machine, date; this task creates the `results/` folder with `mkdir -p`, see section 7): this is the "recorded in the PR" item of the roadmap, since nothing is pushed.
- Release blockers: any divergence; a mutant not detected.

**Delivery**
- Definition of done: 40 runs green on this Mac; results file committed.
- Verify commands: `npm run typecheck && npm run lint`; `npm run server:typecheck`; `cd server && RA01_RUNS=40 node --test "test/property/**/*.test.ts"`; `npm run server:test` (default 5 runs).
- Documentation: the results file. Rollback: common rule.
- Later tasks need: `createWorld`, `generateStep`, `drive`, `check` (T-B7-24 reuses them with the real client), the mutants.

---

### T-B7-21 Socket dispatch, frame codec and the lobby

| Field | Value |
|---|---|
| Subsystem | `server/src/ws` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-06, T-B7-07, T-B7-12, T-B7-13, T-B7-14, T-B7-18 |
| Status | not started |
| Features, requirements | F-116, F-118, F-119, F-138; R-075, R-076, R-081, R-082, R-097; ADR-0501, ADR-0502, ADR-0510; SECURITY_BASELINE R1 to R9 |

**Intent**
- Problem: `relay.js` (630 lines) mixes socket plumbing and room logic and trusts every frame. The new server needs a thin dispatcher: it owns sockets, limits and encoding; `RoomCore` owns the room.
- Target user: every member and the lobby of every enrolled device.
- User story: as Amar, I open the app, see which buddies are online, accept a room invite with one tap, and nothing a hostile client sends can touch my room.
- Expected behaviour: `/ws` accepts a socket only from an allowed origin; challenge, signed hello within 10 s; a room scope joins a room as the authenticated member; a lobby scope delivers buddy presence and invites only. Frames are validated, rate-limited and routed; every hostile row of RT 16.2 is refused with the room continuing.
- Success metric: the hostile suite of T-B7-34 passes; one socket costs under 100 KB of memory (RB-6, ESTIMATED).

**Implementation**
- Existing files to port or keep: `server/realtime/src/relay.js:59` (`perMessageDeflate: false`), `:74` (`tagOf`), `:77` (`clientIp`), `:93` (origin check), `:468-469` (backpressure: lossy frames dropped over 256 KiB queued, socket cut over 4 MiB), the drain with close 1012 (`close`); `ws` 8.22.0 (`server/realtime/package.json`; T-B7-38 adds it to `server/package.json` as the server's only run-time dependency).
- Files: new `server/src/ws/server.ts`, `server/src/ws/dispatch.ts`, `server/src/ws/codec.ts`, `server/src/ws/lobby.ts`.
- Modules and signatures:

```ts
// codec.ts
export function encodeFrame(f: ServerFrame, gzipOk: boolean): string | Buffer;       // text; above CAPS.gzipAbove and gzipOk: Buffer [0x01, ...zlib.gzipSync(utf8 text)]
export function decodeFrame(data: Buffer | string, isBinary: boolean): { ok: true; text: string } | { ok: false; code: "bad_frame" | "too_large"; close: number | null };
//   binary: byte 0 must be 0x01; zlib.gunzipSync(rest, { maxOutputLength: CAPS.clientInflated }); a RangeError is too_large with close 4413
// lobby.ts
export class LobbyHub {
  constructor(d: { buddiesOf(device: DeviceId): BuddyInfo[]; clock: () => number });
  attach(device: DeviceId, send: (f: ServerFrame) => void): () => void;     // sends `buddies`; announces `buddy {online: true}` to buddies unless the identity chose "appear offline"
  pushInvite(toDevice: DeviceId, inv: { room: RoomId; from: Actor; title: string; role: Role; expires: string }): boolean;   // false: not connected
  isOnline(device: DeviceId): boolean;
  buddyRemoved(a: DeviceId, b: DeviceId): void;                              // each side gets a `buddy` patch and a fresh list
}
// dispatch.ts
export type WsDeps = { registry: RoomRegistry; lobby: LobbyHub; sessions: SessionRegistry; nonces: NonceStore; limiter: AuthLimiter; lookup: DeviceLookup;
  limits: CollabLimits; clock: () => number; timers: Timers; aud: string; origins: OriginPolicy; salt: Uint8Array; log: Logger; metrics: WsMetrics;
  presence(core: RoomCore): PresenceHub; cursors(core: RoomCore): CursorBatcher; chat(core: RoomCore): ChatRing };
export class SocketSession { constructor(sock: WsLike, req: { tag: string }, d: WsDeps); onMessage(data: Buffer | string, isBinary: boolean): void; onClose(code: number): void; onPong(): void }
// server.ts
export function createWsServer(d: WsDeps): { upgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void; sockets(): number; drain(retryAfterMs: number): Promise<void>; close(): Promise<void> };
```
- API contract: the socket path is `/ws` (RC-22), outside `/v1`. Frames are RT 7.3 exactly.
- Algorithm (per socket):
  1. Upgrade: path `/ws`; `Origin` against `IYNK_ALLOWED_ORIGINS` (no origin or a disallowed one: `403`); total sockets 200 and 16 per address tag (PROPOSAL, RT 16.1; `503` beyond); `limiter.blocked(tag)`: refuse with `429`. `new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: CAPS.clientWire })`.
  2. On open: `challenge {protocol: 2, nonce, aud, serverTime}`; start the hello timer (10 s, close 4000).
  3. First frame must be `hello`. `protocol !== 2`: `error upgrade_required`, close 4426. `opSchema` major.minor differs from `OP_SCHEMA`: `error schema_mismatch`, close 4426. `verifyHello`; failure: `limiter.failure(tag)`, `error unauthorized`, close 4401.
  4. Lobby scope (`hello.room` absent): `sessions.attach("lobby", device, …)`, `lobby.attach`, `ready`. Only the frames `ping`, `bye` are valid afterwards; anything else is `bad_type`.
  5. Room scope: wait a minimum of 200 ms since the upgrade (a timer, so every refusal takes the same time), then `registry.open(room)`: `missing`, `closed`, no member row, `banned`, or any other reason: `error room_unavailable`, close 4403, one answer for all; `corrupt`: `error` and close 4500; `live_cap`: `error` retryable and close 1013. Member limits: connected owners, editors and commenters at most `maxMembers`, connected spectators at most `maxSpectators`: otherwise `room_full`, close 4004. `locked` never refuses an existing member.
  6. Supersede: `sessions.attach(room, device, sock)` closes an older socket of the same device (error `superseded`, close 4001); the new session keeps the member's role, baton and host status.
  7. Join: `core.addMember` from the `room_members` row (name and colour from the row), `welcome` (`room`, `you`, `members`, `host`, `baton`, `runner: null`, `run: null`, `resume`, `chat: n`, `limits {submitPerSec, maxEnvelopeBytes, maxPending}`), the frames of `decideResume` (T-B7-13), the chat backlog, `ready`; then `core.markReady`; the room gets `event member.join {m, name, color, role, spectator, app}` (also written to the audit table).
  8. Message loop: frame bucket 60 per second; a dropped frame counts, 600 drops in 5 s close 4429; unknown `t` counts, 20 in a minute close 4429. `submit`: at most `pendingPerSocket` (4) submissions unanswered, more gets `rate_limited`; `core.submit` then a `setImmediate` flush (one group commit per event-loop turn) and the outputs are routed. `cursor`, `presence`, `chat` go to T-B7-07 classes; `cmd` to `core.command`; `resync` to `core.resync`; a client `hello`, `snapshot`, `state` or any server-only type is `bad_type` (R9: no frame accepts a document from a client).
  9. Fan-out: `Outbound` is encoded once per distinct (`gzipOk`) and sent; presence and cursor frames are lossy: dropped when the socket has more than `lossyBufferedBytes` queued; any frame when more than `maxBufferedBytes` is queued closes the socket (`terminate`), the client resumes (kept from `relay.js:468-469`).
  10. Timers per live room: cursors `drain` every 66 ms when two or more members are connected; `core.tick()` every second; heartbeat ping every 15 s and terminate after 45 s of silence.
  11. Leave: `sessions.detach`, `core.removeMember`, `commands.memberLeft` (starts the baton hold and the host grace), event `member.leave {m, reason}`.
  12. `drain(retryAfterMs)`: stop accepting, send retryable `error` with `retryAfterMs: 2000` and close 1012 on every socket, flush rooms; `close()` closes the HTTP upgrade handler.
- Lobby frames: `buddies {list: [{actor, name, color, online}]}` (the `activity` field is not sent in B7: the "show what I'm working on" setting does not exist in B6), `buddy {actor, patch}`, `invite {room, from, title, role, expires}`. Nothing else, and never a device id.
- State transitions: socket `connected`, `challenged`, `authenticated`, `joined`, `ready`, `closed`.
- Validation and errors: all codes of RT 7.4. The error frame for 4403 carries no reason text beyond the code.
- Edge cases: a hello that arrives as binary is `bad_frame`; two `submit` frames in one packet are handled in order; a member removed by an `access.revoke` commit is closed 4403 by the registry hook (T-B7-06); a socket that is both banned and holding a valid invite gets 4403; the lobby of a device with "appear offline" still receives invites and its own buddy list but is not announced online.
- Permissions: authenticated device; room membership from the ACL; commands and ops through T-B7-04. Performance: p99 of the dispatch overhead per frame under 0.3 ms excluding the commit; memory per socket under 100 KB.
- Migration: none.
- Data model: socket state in memory only; the audit rows `member.join` and `member.leave` go to `events`.

**Verification**
- Unit tests: `server/test/ws-codec.test.ts` (text and gzip round trip, 1 KB bomb inflating to 1 GiB is `too_large` with close 4413 and the process RSS grows by less than 64 MB, wrong first byte). `server/test/ws-dispatch.test.ts` over a real `ws` server on a free port in 40000 to 49999 with in-memory store and fake devices: full handshake to `ready`; wrong protocol 4426; hello timeout 4000 (virtual timers); unknown, missing, forbidden and banned rooms all give identical frames and 4403 and each takes at least 200 ms (virtual clock); `locked` still admits a member; member and spectator caps give 4004; supersede 4001; flood of 61 frames in a second drops, 600 in 5 s closes 4429; 21 unknown types close 4429; `snapshot` frame from a client is `bad_type`; submit and commit round trip between two sockets with the `ack` only on the author's copy; cursors batch; chat `kind`; pending limit 4; slow reader (never reads) is cut at 4 MiB and the other member is unaffected; drain closes 1012 with `retryAfterMs`. `server/test/lobby.test.ts`: `buddies` list on attach; `buddy` patch when a buddy connects; invite push reaches only the target; "appear offline" is not announced; `buddyRemoved` updates both sides.
- Integration: the full hostile suite is T-B7-34; mounting is T-B7-32.
- Playwright: T-B7-35. Fixtures: none.
- Acceptance: Given a third socket that presents the host's `hello` bytes, When it connects, Then 4401 and the host keeps the room. Given 1,000 joins to random room ids, Then each is 4403 after at least 200 ms and no room exists afterwards.
- Observability: `/metrics` gauges `iynk_ws_sockets`, counters `iynk_ws_closed_total{code}`, `iynk_frames_in_total{t}`, `iynk_frames_dropped_total`, histogram `iynk_dispatch_seconds`; log `ws.open`, `ws.close {code, tag}` with the salted tag only.
- Release blockers: a refusal path that differs by reason; a client-supplied document accepted.

**Delivery**
- Definition of done: tests pass.
- Verify commands: `npm run typecheck && npm run lint`; `cd server && node --test test/ws-codec.test.ts test/ws-dispatch.test.ts test/lobby.test.ts`; `npm run server:typecheck`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `createWsServer`, `LobbyHub` (T-B7-25 pushes invites through it, T-B7-32 mounts it), `WsDeps`.

---

### T-B7-22 Rooms API client and the join flow

| Field | Value |
|---|---|
| Subsystem | `src/collab` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-05, T-B7-11, T-B7-16 (asset sync), T-B7-19, T-B7-38 (`fetchAuthed`); B3 library, B6 `server-client` |
| Status | not started |
| Features, requirements | F-116, F-121, F-138; R-081, R-084, R-085; COMMUNITY 3.6; M1 steps 10 and 11 |

Split by the 2026-10-27 review: this task holds the REST client and the open and join logic. The lobby client, the join route, the command registration and the Studio wiring are T-B7-41.

**Intent**
- Problem: nothing in the Studio can create a room or redeem an invite. The old lobby (`src/app/[lang]/together/Lobby.tsx`) joins by a six-character code.
- Target user: Amar and a buddy.
- User story: as Amar, I press "Work together", choose Mina, and she gets an invite; she taps Join and we are in the same project.
- Expected behaviour: plain functions that prepare the project (bind the creator's actor to the device key, locally, as ordinary ops), upload what the room needs, create the room, open the socket and hand back a `RoomAuthority`; and the mirror image for joining by link or by buddy invite.
- Success metric: from "Work together" to both browsers showing the same parts in under 3 s on this Mac (RB-5 target, ESTIMATED); a link opened by an un-enrolled browser reaches the enrolment step of B6, not an error (the wiring is T-B7-41).

**Implementation**
- Existing files: `src/server-client/client.ts` (`fetchAuthed`, T-B7-38), `keys.ts` (`DeviceKeyStore`, `StoredKey`), `src/local/library.ts` (T-B3-06: `Library`), `src/project/fork.ts` (`forkProject`), `src/collab/{ws-transport,authority,client,share,fork}.ts` (T-B7-11, 19, 15, 16), `src/components/realtime/InviteDialog.tsx:52-134`.
- Files: new `src/collab/rooms-api.ts`, `src/collab/join.ts`. Nothing else: no store, router, command or component is edited here (collab must not import studio, SYSTEM 5.3).
- Modules and signatures:

```ts
// rooms-api.ts
export type RoomView = { id: RoomId; title: string; hostId: Actor; status: "open" | "locked" | "idle" | "closed" | "corrupt"; epoch: string; seq: number; opSchema: string;
  settings: RoomSettings; members: { identityId: Actor; displayName: string; role: Role; connected: boolean }[]; createdAt: string };
export function prepareOwnerBinding(doc: ProjectDocument, me: { actorHint: Actor | null; name: string; thumbprint: string; identityId: Actor }): Op[];   // [] when already bound; else actor.set (+ access.set if the actor is not an owner)
export function createRoom(c: ServerClient, doc: ProjectDocument, title: string, settings?: Partial<RoomSettings>): Promise<RoomView>;
export function getRoom(c: ServerClient, id: RoomId): Promise<RoomView>; export function closeRoom(c: ServerClient, id: RoomId): Promise<void>;
export function createInvite(c: ServerClient, room: RoomId, body: { link: true; role: "editor" | "viewer"; maxUses?: number; ttlSeconds?: number } | { buddy: Actor; role: "editor" | "commenter" | "viewer" }): Promise<{ invite: RoomInvite; token?: string }>;
export function revokeInvite(c: ServerClient, room: RoomId, inviteId: string): Promise<void>;
export function redeemInvite(c: ServerClient, room: RoomId, token: string): Promise<RoomView>;      // POST /v1/room-invites/redeem
export function acceptInvite(c: ServerClient, room: RoomId, inviteId: string): Promise<RoomView>;   // POST /v1/rooms/{id}/invites/{inviteId}/accept (buddy invites)
// join.ts
export function parseJoinFragment(hash: string): { room: RoomId; token: string } | null;           // "#/join/rm_xxxxxxxxxxxxxxxx.<22 base64url>"
export function inviteLink(origin: string, lang: string, room: RoomId, token: string): string;    // `${origin}/${lang}/studio#/join/${room}.${token}` (RT 5.4)
export function createHelloSigner(keys: DeviceKeyStore, origin: string, aud: string): HelloSigner;   // signs with StoredKey.privateKey; WebCrypto gives the P1363 form
export type RoomHandle = { room: RoomView; authority: RoomAuthority; client: RoomClient; leave(): void };
export type RoomOpenDeps = { client: ServerClient; keys: DeviceKeyStore; library: Library; connect: (room: RoomId) => RoomTransport; readBlob: (sha256: string) => Promise<Uint8Array | null>;
  clock: () => number; random: () => number; timers: Timers; hidden: () => boolean; me: { name: string; identityId: Actor; thumbprint: string } };
export function openRoomFor(d: RoomOpenDeps, session: ProjectSession, title: string): Promise<RoomHandle>;     // bind, sync assets, create, connect
export function joinRoom(d: RoomOpenDeps, room: RoomId, token: string | null, inviteId?: string): Promise<RoomHandle>;
```
- Algorithm:
  - `prepareOwnerBinding`: if the document already has an owner actor whose `keyThumbprint` equals the device thumbprint, return `[]`. Else take the document's first owner actor X (or `me.identityId` for a project with a purely local actor), emit `actor.set {actor: {id: X, name: me.name, keyThumbprint}}` and, if X is not in `access.owners`, `access.set {owners: [...owners, X]}`. The ops are applied to the local `ProjectSession` like any edit (undoable, saved), so the project that is uploaded is byte-identical to the local one and fast-forward works.
  - `openRoomFor`: refuse when the probe says no server or `features.rooms` is off ("needs a server"); bind (above); `syncAssets` (T-B7-16, `share.ts`) asks `POST /v1/assets/query` for the hashes the document lists and uploads the missing ones with `PUT /v1/assets/{sha256}` (no `?room=`, because the room does not exist yet); `createRoom` with the session's current document (history stripped by the server); start a `RoomClient` with `start: {epoch, seq, chain, doc}` from the reply (the creator needs no snapshot); return the handle. One room per tab (ADR-0806 tab lock): a second `openRoomFor` while a handle exists returns the handle. The invite UI is opened by T-B7-31 through T-B7-41's command, not here.
  - `joinRoom`: sign in if needed (B6), `redeemInvite` (link) or `acceptInvite` (buddy invite from the lobby), then a `RoomClient` with `start: {local}` when the library has a project of the same id whose chain at its revision matches (fast-forward) else null (snapshot join). `reconcileLocalCopy` (T-B7-19) decides: `ff` passes `local`; `separate` first calls `keepCopy` so the old local copy survives as its own project, then joins by snapshot and the room copy takes the id; `none` joins by snapshot. The caller (T-B7-41) opens the result at `#/<prj_id>`.
  - The room id of a project is kept for the tab only: `sessionStorage` key `iynk.room.<prj_id>` inside try/catch (decided now; no change to the library `index` record). A new tab does not find it and the person uses the lobby invitation or "Work together" again.
- State transitions: `idle` to `binding` to `syncing` to `creating` to `connecting` to `live`; `leave` returns to `idle`.
- Validation and errors: `createRoom` errors map to texts: `409 quota` ("You have 10 rooms. Close one first." or "This server is full."), `413`, `422`; a failed binding or upload leaves the local project unchanged except for the binding ops, which are ordinary edits. A failed upload stops before `createRoom`, so nothing is half-created.
- Edge cases: a buddy invite for a room already closed gives the generic text (`rooms.invite.expired`); two tabs of one browser: the second finds the tab lock (ADR-0806) and opens read-only; a hash with a wrong prefix or length returns `null` from `parseJoinFragment`.
- Permissions: bearer token; membership through the invite. Performance: this module is loaded when a room command first runs (dynamic import from T-B7-41), under 20 KB gzipped, first load only for those who use rooms (RA-10 target; BUD-05 400 KB budget is untouched).
- Migration: none.
- Data model: a `RoomView` (openapi `Room`); the invite token exists only in the fragment and in memory for one call. API contract: openapi `createRoom`, `getRoom`, `closeRoom`, `createRoomInvite`, `revokeRoomInvite`, `redeemRoomInvite`, `acceptRoomInvite`, `queryAssets`, `putAsset`.

**Verification**
- Unit tests: `src/collab/rooms-api.test.ts` (fake `ServerClient` with `fetchAuthed`: request paths, bodies, error mapping); `prepareOwnerBinding` cases (already bound returns `[]`; local-only actor gets `actor.set`; owner list updated; the result applied through `apply` validates); `src/collab/join.test.ts` (`parseJoinFragment` accepts a valid fragment and rejects 21- and 23-character tokens and a wrong room prefix; `inviteLink` round trips; the signer signs the bytes of T-B7-12 `signedBytes`; `openRoomFor` uploads only the hashes `queryAssets` reports missing and calls `createRoom` after the last upload; a failed upload never calls `createRoom`; `joinRoom` picks `ff`, `separate` and `none` as `reconcileLocalCopy` says).
- Integration: the real server in T-B7-35. Playwright: T-B7-35. Fixtures: none.
- Acceptance: Given an enrolled device and a project, When `openRoomFor` runs, Then a room exists and the project is unchanged apart from the binding ops. Given a link, When `joinRoom` redeems it, Then the handle is live and the token is not in any value the module keeps.
- Observability: local error log entries `room.open_failed {status}`; no secrets.
- Release blockers: an invite token written to storage.

**Delivery**
- Definition of done: tests pass; `npx vitest run src/architecture.test.ts` passes (collab imports no studio file).
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/collab/rooms-api.test.ts src/collab/join.test.ts src/architecture.test.ts`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `openRoomFor`, `joinRoom`, `createInvite`, `revokeInvite`, `inviteLink`, `parseJoinFragment`, `createHelloSigner`, `RoomHandle`, `RoomOpenDeps`.

---

### T-B7-41 Lobby client, join route, commands and Studio wiring

| Field | Value |
|---|---|
| Subsystem | `src/collab`, `src/studio`, `src/components/studio` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-05, T-B7-11, T-B7-22, T-B7-16 (`ShareDialog`); B4 router and commands |
| Status | not started |
| Features, requirements | F-116, F-121, F-138; R-081, R-084, R-085; COMMUNITY 3.6; M1 steps 10 and 11 |

**Intent**
- Problem: the open and join logic (T-B7-22) has no entry point: no command, no `#/join/...` route, no list of online buddies or incoming invitations.
- Target user: Amar and a buddy.
- User story: as Amar, I open a link a friend sent and I am in the room; I see which buddies are online and a waiting invitation.
- Expected behaviour: commands `room.open`, `room.join`, `room.leave`, `room.close` and `share.open` are registered; the router knows `#/join/<room>.<token>`; a lobby socket delivers buddy presence and direct invites; the Studio entry mounts the dialogs.
- Success metric: opening a join link as an enrolled browser lands in the room and the address bar no longer holds the token; with no server every room command says "needs a server".

**Implementation**
- Existing files: `src/studio/router.ts` (T-B4-01: hash router with `StudioRoute`, routes today `home` and `project`), `src/studio/commands.ts` (T-B4-02: `registerCommand(c): () => void`, a function call, so this file is not edited), `src/components/studio/StudioEntry.tsx` (T-B4-01, edited by T-B4-25: renders Home or Workspace), `src/collab/{join,rooms-api}.ts` (T-B7-22), `src/collab/backoff.ts` (T-B7-11), `src/components/studio/ShareDialog.tsx` (T-B7-16).
- Files: new `src/collab/lobby.ts`, `src/collab/install.ts`; edit `src/studio/router.ts`, `src/components/studio/StudioEntry.tsx`.
- Modules and signatures:

```ts
// lobby.ts
export type LobbySnapshot = { online: ReadonlyMap<Actor, boolean>; invites: readonly LobbyInvite[]; buddies: readonly { actor: Actor; name: string; color: string; online: boolean }[] };
export class LobbyClient { constructor(connect: () => RoomTransport, clock: () => number, timers: Timers);
  start(): void; stop(): void; getSnapshot(): LobbySnapshot; subscribe(fn: () => void): () => void; dismiss(room: RoomId): void }
// install.ts (collab may not import studio, so the registry function is injected)
export type CollabCommand = { id: string; labelKey: string; keys?: string[]; scope: "global"; enabled(): boolean; run(): void };
export type CollabInstallDeps = RoomOpenDeps & { registerCommand: (c: CollabCommand) => () => void; navigate: (hash: string) => void; replaceHash: (hash: string) => void;
  onShare: (open: boolean) => void; onHandle: (h: RoomHandle | null) => void };
export function installCollab(d: CollabInstallDeps): () => void;      // registers the commands, starts the lobby, handles the join fragment; returns an uninstall function
// router.ts addition
//   StudioRoute gains { kind: "join"; room: string; token: string }; parseHash recognises "#/join/rm_<16 base32>.<22 base64url>"; routeHash never prints the token
```
- Algorithm:
  - `router.ts`: `parseHash` returns the `join` route for a well-formed fragment and `home` for anything malformed. `routeHash` for a `join` route returns `#/join/<room>.<token>` only for the initial parse; every later `navigate` replaces it.
  - `installCollab` calls `d.registerCommand` for `room.open` (title defaults to the project name), `room.join` (from an invite in the lobby snapshot), `room.leave` (stops the client, restores `LocalAuthority`, keeps the local project), `room.close` (host or owner: `DELETE /v1/rooms/{id}`) and `share.open` (calls `d.onShare(true)`). Each command's `enabled()` reads the probe and the room state, so a disabled button says why ("needs a server"). It returns one function that unregisters all of them and stops the lobby.
  - Fragment handler: when the route is `join`, the token is read once, passed to `joinRoom`, and the hash is replaced with `#/<prj_id>` through `d.replaceHash` (`history.replaceState`) so the secret does not stay in the address bar, history or a bookmark. A wrong or expired token shows one generic text (`rooms.invite.expired`) and counts toward the server's 5 tries per hour. A browser without an enrolment is sent to the B6 enrolment step first and returns to the join route afterwards.
  - `LobbyClient`: opens the lobby socket after sign-in (`hello` without `room`), applies `buddies`, `buddy` and `invite` frames, reconnects with `backoffMs`, and closes when the tab has been hidden for 5 minutes (saves the connection; PROPOSAL).
  - `StudioEntry.tsx` (UI, so it may import `src/studio` and `src/collab`): calls `installCollab` with the real `registerCommand` from `src/studio/commands.ts`, owns the state `{ handle, shareOpen }`, renders `ShareDialog` while `shareOpen` is true (with `doc` from the open project's `DocStore`), and passes `handle` to the `RoomProvider` that T-B7-26 adds. T-B7-26 and T-B7-28 later edit the same file in their own groups.
- State transitions: lobby `idle` to `connecting` to `online` to `reconnecting`; route `home` or `project` to `join` to `project`.
- Validation and errors: as T-B7-22. A `join` route while a handle exists joins a second room only after `room.leave`.
- Edge cases: a join link opened in a tab that already holds a room shows the generic text and keeps the first room; the lobby never sends a device id; with the tab hidden no lobby traffic after 5 minutes.
- Permissions: bearer token. Performance: the code is loaded when a room command first runs (dynamic import), under 20 KB gzipped.
- Migration: none. Data model: `LobbySnapshot` in memory. API contract: the lobby frames of T-B7-01.

**Verification**
- Unit tests: `src/collab/lobby.test.ts` (memory network: snapshot, `buddy` patch, invite arrives, dismiss, reconnect, 5-minute hide); `src/collab/install.test.ts` (fake `registerCommand`: five commands registered, uninstall removes them, `enabled()` false with no server, the fragment is replaced after use, a bad token shows the generic text); `src/studio/router.test.ts` (extend: join route parses; a malformed fragment is `home`; the token is not in the next route); `src/components/studio/StudioEntry.test.tsx` (extend: the `share.open` command makes `ShareDialog` render and closing it hides it; a join route calls `joinRoom` once).
- Integration: the real server in T-B7-35. Playwright: T-B7-35. Fixtures: none.
- Acceptance: Given a link, When it is opened by an enrolled browser, Then the fragment is gone from the address bar after redemption. Given the `share.open` command, When it runs, Then the Share dialog opens.
- Observability: local error log entries only; no secrets.
- Release blockers: the invite token left in the address bar, history or storage.

**Delivery**
- Definition of done: tests pass; `src/architecture.test.ts` passes (studio imports no collab file; collab imports no studio file).
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/collab/lobby.test.ts src/collab/install.test.ts src/studio/router.test.ts src/components/studio/StudioEntry.test.tsx src/architecture.test.ts`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `installCollab`, `LobbyClient`, the `join` route, the `{ handle, shareOpen }` state in `StudioEntry.tsx`.

---

### T-B7-23 Presence store and the cursor overlay

| Field | Value |
|---|---|
| Subsystem | `src/collab`, `src/studio/overlays` |
| Phase, priority | B7, P1 |
| Dependencies | T-B7-05, T-B7-15, T-B7-19; B4 overlays |
| Status | not started |
| Features, requirements | F-116; R-084; ADR-0507; RA-11, RB-8 |

**Intent**
- Problem: people in a room cannot see each other. The old pointer overlay used 0..1 page fractions that do not survive a pan (`src/components/realtime/PresenceCursors.tsx`, RT 10).
- Target user: members of a room.
- User story: as Amar, I see Mina's pointer on the part she is looking at, with her name, whatever my zoom.
- Expected behaviour: a client store holds members, host, baton, presence and the latest cursors; a canvas overlay draws other members' pointers in millimetres with a name label. Sending is throttled to 15 Hz and skipped when alone.
- Success metric: pointer position error under 1 px after a pan and zoom (millimetres are view space); RA-11 holds.

**Implementation**
- Existing files: `src/components/realtime/PresenceCursors.tsx` and `pointing.ts` (old overlay, left for the lab rooms), `src/studio/overlays/netlist.ts` and `state.ts` (T-B4-10, T-B4-14: overlay builders returning `Overlay[]`), `src/studio/engine/controller.ts` (T-B4-24: `createSceneController` takes `OverlayProviders = { net, state, air }`, each `() => Overlay[]`, refreshed at most 30 times per second), `src/studio/engine/viewport.ts` (T-B4-04: mm to screen).
- Files: new `src/collab/presence.ts`, `src/studio/overlays/cursors.ts`; edit `src/studio/engine/controller.ts` (T-B4-24).
- Where the overlay is registered (decided from T-B4-24 and T-B4-25): there is no registry file. `Workspace.tsx` (T-B4-25) builds `OverlayProviders` and hands it to `createSceneController`. This task adds to `controller.ts` `registerOverlayProvider(p: (ctx: { viewport: Viewport; viewId: string }) => Overlay[]): () => void`; the controller appends the registered providers' items after `air` in its 30 Hz refresh and calls them with the active viewport and view id. `src/studio` never imports `src/collab` (SYSTEM 5.3), so `cursors.ts` reads a structural `CursorSource` that `PresenceStore` satisfies, and the registration call is made by `RoomProvider` in `src/components/studio/room/RoomDock.tsx` (T-B7-26, UI layer, which may import both).
- Modules and signatures:

```ts
// presence.ts
export type MemberView = { m: number; actor: Actor; name: string; color: string; role: Role; spectator: boolean; online: boolean; host: boolean; baton: boolean; app?: string; status?: string | null; view?: string; sel?: readonly string[]; focus?: string | null; typing?: string | null };
export type CursorView = { m: number; view: string; x_mm: number; y_mm: number; at: number };
export type PresenceSnapshot = { me: MemberView | null; members: readonly MemberView[]; host: Actor | null; baton: Actor | null; cursors: ReadonlyMap<number, CursorView>; events: readonly RoomEventView[] };
export class PresenceStore {
  constructor(clock: () => number, timers: Timers);
  attach(client: RoomClient): () => void;                      // listens to `room` events: welcome, event (member.join/leave, baton.*, host.*, member.mute, room.lock, room.settings), presence, cursors
  getSnapshot(): PresenceSnapshot; subscribe(fn: () => void): () => void;
  sendCursor(view: string, x_mm: number, y_mm: number): void;   // 15 Hz, burst 10, quantised to 0.1 mm, never sent when alone
  sendPresence(patch: PresencePatch): void;                     // 5 per second, coalesced
}
// overlays/cursors.ts
export type CursorSource = { getSnapshot(): { me: { m: number } | null; members: readonly { m: number; name: string; color: string }[]; cursors: ReadonlyMap<number, { m: number; view: string; x_mm: number; y_mm: number; at: number }> }; subscribe(fn: () => void): () => void };
export function cursorsProvider(source: CursorSource, now: () => number): (ctx: { viewport: Viewport; viewId: string }) => Overlay[];   // Overlay and Viewport are the types of src/studio/engine/types.ts
// engine/controller.ts addition
export function registerOverlayProvider(p: (ctx: { viewport: Viewport; viewId: string }) => Overlay[]): () => void;
```
- Algorithm: `welcome.members` seeds the member list; `event` frames update flags (`member.join` adds, `member.leave` marks offline and removes after 30 s, `baton.grant` and `baton.take` set the holder, `host.pass` and `host.claim` set the host); the event list keeps the last 50 for the announcer. A cursor older than 3 seconds fades out (it is deleted at 10 s). `sendCursor` stores the newest sample and sends at most once per 66 ms; a store with one member sends nothing. The overlay draws, for each cursor whose `view` equals the active view, a pointer glyph in the member's colour at the screen position from `viewport.mmToScreen(x_mm, y_mm)` plus a text label with the name (`rooms.members.cursorOf`), with a text outline for contrast; the overlay is `aria-hidden` because the members list and the announcer carry the same information in text (K-A11Y). The viewport-follow and focus marks (`focus`, `typing`) draw a thin ring around the element id.
- State transitions: member `online` / `offline` / removed. Validation and errors: frames come through `parseServerFrame`; a cursor with non-finite numbers is dropped.
- Edge cases: the same actor from a superseding socket keeps one `m`; a view that does not exist locally draws nothing; a hidden tab stops sending.
- Permissions: spectators send no cursor unless `spectatorCursors` (the server enforces; the store also checks `settings`). Performance: overlay redraw only when `cursors` changes, at most 15 per second; outbound under 25 KB/s per room (RB-8).
- Migration: none.
- Data model: the in-memory `PresenceSnapshot`. API contract: socket frames `presence`, `cursor`, `cursors` and `event` of T-B7-01.

**Verification**
- Unit tests: `src/collab/presence.test.ts` (virtual clock: join, leave removal after 30 s, baton and host events, cursor fade at 3 s, `sendCursor` 15 Hz cap (100 calls in 1 s send at most 15 plus burst), nothing sent when alone, quantisation to 0.1 mm); `src/studio/overlays/cursors.test.ts` (mm to screen after a pan and a zoom, other view hidden, label text present, self not drawn, `aria-hidden`); `src/studio/engine/controller.test.ts` (extend: a registered provider's items appear in the overlay layer at the 30 Hz gate, receive the active viewport and view id, and disappear after the returned disposer runs; the controller still builds with no provider).
- Integration: two clients over the memory network in T-B7-24; browsers in T-B7-35. Playwright: T-B7-35.
- Fixtures: none.
- Acceptance: Given Mina's cursor at (120.0, 45.5) mm on `vw_bb`, When Amar pans and zooms, Then the drawn pointer stays on the same part. Given a room of one, When the pointer moves, Then no frame is sent.
- Observability: none beyond counters in the local diagnostics object.
- Release blockers: a cursor sent from a hidden tab.

**Delivery**
- Definition of done: tests pass.
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/collab/presence.test.ts src/studio/overlays src/studio/engine/controller.test.ts src/architecture.test.ts`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `PresenceStore`, `MemberView`, `PresenceSnapshot` (Members and baton UI, code dock), `cursorsProvider` and `registerOverlayProvider` (T-B7-26 registers it).

---

### T-B7-24 Convergence with the real client: FA-13, RA-02 and RA-07

| Field | Value |
|---|---|
| Subsystem | `server/test` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-15, T-B7-19, T-B7-20, T-B7-06, T-B7-13 |
| Status | not started |
| Features, requirements | F-121; R-087, R-088, R-089, R-090; REF-4; FA-13, RA-01, RA-02, RA-07, RB-10 |

**Intent**
- Problem: T-B7-20 proves the server against a model client. The shipped client is another piece of code (`RoomClient`, `RoomAuthority`); only a run of that code shows the product converges.
- Target user: Amar's trust, again.
- User story: as Amar, the editor I actually use converges as well as the model did.
- Expected behaviour: the T-B7-20 world runs with 5 real `RoomClient`s over `createMemoryNetwork`, a `RoomCore` behind a `MemoryServerPort` adapter, drops, resends, offline periods, snapshot resume and epoch breaks.
- Success metric: FA-13: zero divergence in 40 runs of about 10,900 ops; both RS-09 mutants and the net-cascade mutant caught; RA-07 report and RB-10 numbers recorded.

**Implementation**
- Existing files: `server/test/property/harness.ts` (T-B7-20: world, generator, checks, mutants), `src/collab/{client,queue,rebase,memory-transport,authority}.ts`.
- Files: tests only. New `server/test/property/real-client.test.ts`, `server/test/property/rebase-report.test.ts`, `server/test/property/server-port.ts` (the adapter from `RoomCore` to `MemoryServerPort`).
- Algorithm: for seeds 1 to `RA01_RUNS`: build the world with real clients (`RoomClient` constructed with `createMemoryNetwork` transports, the real `apply`, a virtual `Timers`), drive the same step generator, run the four checks of T-B7-20. Extra cases:
  - RA-07: a scripted offline session (`src/collab/__fixtures__/script-offline-3-drops.json`): the client goes offline, edits parts R3, R4, R5, a friend deletes R3 and R4's pin target meanwhile; on return the report lists three dropped submissions, each with the friend's actor as `byActor` and a `code`; "Keep a copy" (`keepCopy` of T-B7-19, called with a library stub) is exercised once: the forked project's `stateHash` equals the hash of `report.localBefore`.
  - Epoch break: restore the room from an older checkpoint mid-run (`restoreFromCheckpoint`), clients re-queue the acked-beyond ops and converge; those that no longer validate are reported.
  - RB-10: time 10,000 `commit` applications at 500 parts; print p50 and p95; assert p95 under 2 ms on this Mac (the 4x-throttle number is measured by Amar in a browser, For Amar).
  - Queue limit: a client offline for 24 simulated hours with 1,200 submissions queues exactly 1,000 and reports `queue_full` for the rest; local state keeps the first 1,000 only (the UI keeps its own copy through `ProjectSession`, not through the room queue).
- Edge cases: seeds identical to T-B7-20 so a failure can be compared with the model client's result for the same seed.
- Permissions, performance: the run is a few minutes at 40 seeds (ESTIMATED 5 to 15). Migration: none.
- Data model, schemas, API contract: none (in process). State transitions: as T-B7-15. Validation: the four properties of T-B7-20 plus the RA-07 report content. Performance: the RB-10 number is measured here.

**Verification**
- Tests: the three files above. Assertions: the four properties for every run; mutant detection (at most 10 seeds each); RA-07 report contents; epoch break convergence; queue cap; RB-10 p95.
- Integration: this is the integration test of T-B7-15 and T-B7-19. Playwright: none. Fixtures: the RA-07 script.
- Acceptance: Given 40 seeds, When the real client runs, Then zero divergence and every acked op present once. Given the RA-07 script, Then the report lists exactly the three expected submissions.
- Observability: results written to `docs/MASTER_PLAN/05_ENGINEERING/results/B7-fa13.md` (seeds, counts, p95, machine, date).
- Release blockers: any divergence; a mutant not caught.

**Delivery**
- Definition of done: 40 seeds green; results file committed.
- Verify commands: `npm run typecheck && npm run lint`; `cd server && RA01_RUNS=40 node --test test/property/real-client.test.ts test/property/rebase-report.test.ts`; `npx vitest run src/collab`.
- Documentation: the results file. Rollback: common rule.
- Later tasks need: nothing (a gate).

---

### T-B7-25 Room invites and redemption

| Field | Value |
|---|---|
| Subsystem | `server/src/rooms`, `server/src/http` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-03, T-B7-04, T-B7-18, T-B7-21 |
| Status | not started |
| Features, requirements | F-116, F-138; R-076, R-081, R-084; ADR-0503; RC-20; SECURITY_BASELINE R1, R2; CM-12 |

**Intent**
- Problem: room codes of six characters carry 29.7 bits and let anyone who guesses one in (R1, `server/realtime/src/protocol.js:9`). An invite must be a capability: unguessable, limited, revocable, redeemed by an enrolled device.
- Target user: Amar inviting Mina, or sending a link to a friend.
- User story: as Amar, I invite Mina from my buddy list with one tap, or I copy a link that works once.
- Expected behaviour: two kinds. A direct invite to a paired buddy carries no secret and arrives on the buddy's lobby socket. A link invite is a 128-bit token in a URL fragment, redeemed once per use over HTTP. Redeeming adds the device to the room, writes the matching `actor.set` and `access.grant` ops, and returns the room.
- Success metric: 1,000 random tokens never redeem; the sixth wrong try in an hour is `429`; two simultaneous redemptions of a one-use invite admit exactly one.

**Implementation**
- Existing files: `server/src/rooms/{registry,lifecycle,core}.ts` (T-B7-18, T-B7-06), `server/src/store/rooms.ts` (T-B7-03: `addInvite`, `inviteBySecret`, `useInvite`, `unuseInvite`, `countActiveInvites`), `server/src/ws/lobby.ts` (T-B7-21: `pushInvite`), `server/src/buddies/visibility.ts` (T-B6-09), `src/protocol/frames.ts` (`LobbyInvite`).
- Files: new `server/src/rooms/invites.ts`, `server/src/http/room-invites.ts`. (The routes under `/v1/rooms/{id}/invites` are registered by this file, not by `http/rooms.ts`.)
- Modules and signatures:

```ts
// invites.ts
export type InviteDeps = { repo: RoomsRepo; registry: RoomRegistry; lobby: LobbyHub; isBuddy(a: DeviceId, b: DeviceId): boolean; identityOf(device: DeviceId): Actor | null;
  limits: CollabLimits; clock: () => number; random: (n: number) => Uint8Array; limiter: Limiter; publicUrl: string };
export function createInvite(d: InviteDeps, by: DeviceRow, room: RoomId, body: RoomInviteCreate): { ok: true; invite: RoomInviteView; token?: string; url?: string } | { ok: false; status: 400 | 404 | 409 | 422; code: string };
export function listInvites(d: InviteDeps, by: DeviceRow, room: RoomId): RoomInviteView[] | null;
export function revokeInvite(d: InviteDeps, by: DeviceRow, room: RoomId, inviteId: string): boolean;
export function redeemLink(d: InviteDeps, who: DeviceRow, body: { room: RoomId; token: string }): Promise<{ ok: true; room: RoomView } | { ok: false; status: 404 | 409 | 429 }>;
export function acceptDirect(d: InviteDeps, who: DeviceRow, room: RoomId, inviteId: string): Promise<{ ok: true; room: RoomView } | { ok: false; status: 404 | 409 | 410 }>;
// attempts are counted with the shared limiter (T-B6-07): bucket `room.invite.redeem` (T-B7-04), key `dev:<deviceId>`, 5 per hour, taken once per redeem attempt (D26); there is no TryLimiter class
// room-invites.ts
export function inviteRoutes(d: InviteDeps): RouteDef[];   // POST/GET /v1/rooms/{id}/invites, DELETE /v1/rooms/{id}/invites/{inviteId}, POST /v1/rooms/{id}/invites/{inviteId}/accept, POST /v1/room-invites/redeem
```
- API contract (openapi): `createRoomInvite` (bucket `room.write`), `listRoomInvites` (`room.read`), `revokeRoomInvite` (`room.write`), `acceptRoomInvite` and `redeemRoomInvite` (`room.invite.redeem`); every `RouteDef` has `cls: "device"`. Body `RoomInviteCreate` is one of `{buddy: usr_..., role}` or `{link: true, role, maxUses?, ttlSeconds?}`; reply `RoomInviteCreated` (an invite plus, for a link, `token` and `url`). `url` is `{publicUrl-origin-of-app}/#/join/{roomId}.{token}` per openapi; the client builds its own `/{lang}/studio#/join/...` (`inviteLink`, T-B7-22) and ignores `url`, as with shares (D10).
- Algorithm (create): the caller must be an `owner` member or the current host (else the same 404 as a missing room). Role is `editor`, `commenter` or `viewer`; never `owner`. Link: `maxUses` defaults to 1 for `editor`, 5 for `viewer` and `commenter` (PROPOSAL: RC-20 names editor and viewer; commenter is read-only like viewer), at most 20; `ttlSeconds` default 86,400, from 300 to 604,800 (7 days). More than `activeInvitesPerRoom` (20) live invites: `409 quota`. Token: 16 bytes from `node:crypto`, `base64url` (22 characters); only `SHA-256(token)` is stored in `secret_hash`; the token is returned once. Direct: `buddy` must be a paired buddy of the caller (`isBuddy`) else the same 404; the row has `kind = 'direct'`, `target_device`, 24 hours, one use, a random unused secret (the column is NOT NULL UNIQUE; the secret is never returned); `lobby.pushInvite(target, {room, from, title, role, expires})`; if the buddy is offline the invite waits and is delivered at their next lobby attach (the lobby sends pending invites with `buddies`).
- Algorithm (redeem): A `limiter.take("room.invite.redeem", key)` that is refused gives `429`. Hash the token, `inviteBySecret`; any of unknown, expired, revoked, used up, wrong room, room closed or locked, device banned in that room answers the same `404` and counts a failure. Then: member count check (`maxMembers` owners, editors and commenters; `maxSpectators` for viewers): `409 room_full` (the caller holds a valid token, so this leaks nothing). Then `useInvite` (atomic `uses < max_uses`); then `registry.open(room)` (a `live_cap` is `503` retryable and calls `unuseInvite`); then `core.commitSystem(inviterActor, [actor.set, access.grant], "invite.redeem")` with `acl: [{device, role, join: {actor, name, color, spectator: role === "viewer", joinedAt}}]`. The `actor.set` reuses an existing document actor whose `keyThumbprint` equals the device's thumbprint, else uses the device's `identity_id` as the actor id with the device name; a name collision in the document is resolved by the client's `name` rules, not here. Colour: the first colour of the fixed 8-colour palette not used by a current member. If the commit fails, `unuseInvite` and `503`. The event `invite.redeem {inviteId}` and `role.change` go to the audit table. Reply: `RoomView`.
  Revocation: sets `revoked_at`; a member already redeemed stays (removing a member is a kick). A kicked (banned) device cannot redeem again even with a fresh invite until an owner clears the ban (no UI for that in B7; a ban is for the life of the room).
- State transitions: invite `open` to `used_up`, `revoked` or `expired` (status is computed on read).
- Validation and errors: `400` malformed, `404` generic, `409 quota` / `room_full`, `410` an accepted direct invite that is gone, `422` role not allowed, `429` too many tries.
- Edge cases: a direct invite to a buddy who is already a member is a `409`; a buddy removed after the invite was sent can no longer accept (the accept checks `isBuddy` again); the token appears nowhere in logs (the route template is logged); two owners revoking at once is idempotent.
- Permissions: bearer token; create and revoke by owner or host; redeem by any enrolled device holding a valid secret. Performance: redeem under 20 ms excluding the commit.
- Migration: none.
- Data model: `room_invites` rows (T-B7-03), `room_members`, and the document's `actors` and `access.grants` through the system batch.

**Verification**
- Unit tests, `server/test/invites.test.ts` (RA-06, R1, R2, CM-12; virtual clock; fake devices from `server/test/helpers.ts`): defaults 1 for editor, 5 for viewer, cap 20, ttl bounds; a token redeems once, then the same `404`; 5 wrong tries then `429` and a correct token still `429` until the hour passes; expiry by clock; revoke then redeem is `404`; two parallel redemptions of a one-use invite admit one and the other gets `404`; a banned device is `404`; `locked` room is `404`; `room_full` at 8 members; direct invite requires a buddy and arrives through the lobby stub; buddy removal before accept gives `404`; the stored `secret_hash` is 32 bytes and a byte scan of the SQLite file and WAL finds no token (as BA-10 does for shares); redemption writes `actor.set` and `access.grant` as one batch whose `author.kind` is `system`, and the member row and the document agree (read both and compare); commit failure leaves `uses` unchanged; the redeemer's device id appears in no response body.
- Integration: HTTP and socket in T-B7-32 and T-B7-34. Playwright: T-B7-35. Fixtures: none.
- Acceptance: Given a link for an editor with one use, When Mina redeems it, Then she is an editor member and the second redemption fails with the same text as a random token. Given 1,000 random 22-character tokens, Then none redeems and no room data is returned.
- Observability: audit events `invite.create`, `invite.redeem`, `invite.revoke`, `role.change`; counters `iynk_invite_redeem_total{result}`; no token in any log.
- Release blockers: distinguishable failure answers; a token stored in plain.

**Delivery**
- Definition of done: tests pass.
- Verify commands: `npm run typecheck && npm run lint`; `cd server && node --test test/invites.test.ts`; `npm run server:typecheck`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `inviteRoutes`, `InviteDeps`.

---

### T-B7-26 Room dock shell: banner, side panel and toolbar areas

| Field | Value |
|---|---|
| Subsystem | `src/components/studio/room` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-05, T-B7-19, T-B7-22, T-B7-23, T-B7-41 |
| Status | not started |
| Features, requirements | F-116, F-121; R-084, R-088; K-A11Y; UXA-01 to UXA-10 |

**Intent**
- Problem: several tasks add room UI to the same Studio shell. If each edits `StudioEntry.tsx`, they collide.
- Target user: every member, and the next four UI tasks.
- User story: as a member, I always see whether I am live, offline, read-only or removed, in words.
- Expected behaviour: one provider and three areas. The banner area shows the connection and access state as text with a live region. The side panel area and the toolbar area are empty shells that later tasks fill by editing only their own area file. Nothing renders outside a room except the read-only notice of a share.
- Success metric: axe finds zero serious or critical violations on every banner state; the 3-second offline rule holds under a virtual clock.

**Implementation**
- Existing files: `src/components/studio/StudioEntry.tsx` (T-B4-01, T-B4-25, T-B7-41), `src/collab/authority.ts` (`RoomStatus`, `subscribe`), `src/components/ui/{Callout,Chip}.tsx` (existing UI parts).
- Files: new `src/components/studio/room/RoomDock.tsx`, `BannerArea.tsx`, `SidePanel.tsx`, `Toolbar.tsx`; edit `src/components/studio/StudioEntry.tsx`.
- Sub-steps, each with its own test file and a commit-sized change: (1) `RoomDock.tsx`: the provider, the three hooks and the overlay registration (`RoomProvider` creates the `PresenceStore` of T-B7-23, attaches it to `handle.client`, calls `registerOverlayProvider(cursorsProvider(presence, clock))` from `src/studio/engine/controller.ts` and removes it on unmount), tested in `RoomDock.test.tsx`; (2) `BannerArea.tsx` with `BannerArea.test.tsx`; (3) the `SidePanel.tsx` and `Toolbar.tsx` shells, covered by `RoomDock.test.tsx`; (4) `StudioEntry.tsx`: wrap the workspace in `RoomProvider` with the `{ handle }` state T-B7-41 added and render the three areas, with a case in `StudioEntry.test.tsx`.
- Modules and signatures:

```tsx
// RoomDock.tsx: provider and hooks only; area components import hooks from here, StudioEntry imports every area, so there is no import cycle
export function RoomProvider(props: { handle: RoomHandle | null; access: EditAccess; children: React.ReactNode }): JSX.Element;
export function useRoomStatus(): RoomStatus | null;       // useSyncExternalStore over RoomAuthority.subscribe
export function useRoomHandle(): RoomHandle | null;
export function useEditAccess(): EditAccess;
// BannerArea.tsx
export function BannerArea(props: { t: StudioRoomsT }): JSX.Element | null;      // role="status", aria-live="polite"
// SidePanel.tsx and Toolbar.tsx: shells returning null outside a room; T-B7-29 fills SidePanel, T-B7-31 fills Toolbar
export function SidePanel(props: { t: StudioRoomsT }): JSX.Element | null;
export function Toolbar(props: { t: StudioRoomsT }): JSX.Element | null;
```
- Algorithm (banner): states and texts (all from `studio.rooms.banner.*`, each with a text label and an icon, never colour alone): `connecting`, `syncing`, `live` (with "N people here"), `reconnecting` (the text "Room is offline, your changes are kept" appears 3 seconds after `offlineSince`, PROPOSAL, RT 11.3; before that "Reconnecting"), pending count when above 0 ("N changes waiting"), `queueFull` (editing in the room is paused; local copy safe), `ended` with the reason (kicked, closed, room not found; the texts reveal nothing more), `unsupported` (private window or engine from T-B7-02), `serverRestarted`. The share read-only notice shows when `EditAccess.reason === "share"` with the action button from `access.action` (`makeCopy`, wired in T-B7-28). The role notice for viewers and commenters ("You can watch; you cannot edit"). Announcements: the live region changes only on a state change, not on every pending count tick (the count updates silently).
- State transitions: as `ClientState`. Validation, errors: none. Edge cases: no room and no share: renders nothing; a room that ends while the dock is mounted keeps the notice until dismissed or the project closes.
- Permissions: none. Performance: the dock subscribes with `useSyncExternalStore`; no render unless `RoomStatus` changes; code is lazy with the room commands (dynamic import from `installCollab`).
- Migration: none.
- Data model: none (reads `RoomStatus` and `EditAccess`). API contract: none.

**Verification**
- Unit tests: `src/components/studio/room/BannerArea.test.tsx` (RTL, fake authority, fake timers): every state renders its text; "offline, your changes are kept" appears at 3 s and not at 2.9 s; pending count shown without a second announcement; `queueFull`; `ended` texts for kicked and closed carry no extra detail; share notice shows the action and calls it; viewer notice; nothing renders without a room; `role="status"`. `src/components/studio/room/RoomDock.test.tsx`: the provider and hooks follow `subscribe` updates (one render per status change).
- Integration: mounted in the e2e of T-B7-35. Playwright: axe on the banner states in `e2e/rooms.spec.ts` (T-B7-35).
- Fixtures: none.
- Acceptance: Given the link drops, When 3 seconds pass, Then the banner says the room is offline and changes are kept. Given a kicked member, Then the banner says they were removed and the editor is read-only.
- Observability: none. Release blockers: a state shown by colour only.

**Delivery**
- Definition of done: tests pass.
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/components/studio/room src/components/studio`.
- Documentation: none. Rollback: common rule.
- Later tasks need: the provider, hooks and the three area files (T-B7-29, 30, 31 edit one each).

---

### T-B7-27 Code dock obeys the baton

| Field | Value |
|---|---|
| Subsystem | `src/components/studio`, `src/studio/code`, `src/collab` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-19, T-B7-23; B4 `CodeDock` |
| Status | not started |
| Features, requirements | F-122; R-094; ADR-0504; FRONTEND 6.4 last bullet; M1 step 10 |

**Intent**
- Problem: today a room member without the keyboard edits locally and nothing warns them (FRONTEND 6.4, B4-14 VERIFIED in the walk). In a room only the baton holder's `source.*` ops are accepted.
- Target user: the buddy helping with code, and the owner watching.
- User story: as a buddy helping Amar, I ask for the keyboard, he hands it over, I type, and he sees my text appear.
- Expected behaviour: when in a room in `baton` mode the code dock is writable only for the holder; others see the file read-only with the holder's name and a request button. The holder's keystrokes become one `source.edit` per 250 ms burst or on blur. Outside a room nothing changes.
- Success metric: at 10 submissions per second the server load is trivial (RS-09 measured 5,700 applied per second); a non-holder can type nothing.

**Implementation**
- Existing files: `src/components/studio/CodeDock.tsx` and `src/studio/code/sources.ts` (T-B4-12: bind CodeMirror to `sources[]` through `source.edit`), `src/components/boardlab/CodeEditor.tsx` (edited by T-B4-12), `src/collab/presence.ts` (T-B7-23: baton holder), `src/collab/authority.ts` (T-B7-19: `RoomStatus.access`).
- Files: new `src/collab/source-batch.ts`; edit `src/components/studio/CodeDock.tsx`, `src/studio/code/sources.ts`.
- Modules and signatures:

```ts
// source-batch.ts
export type SourceEdit = { id: string; pos: number; del: number; ins: string };
export function composeEdits(a: SourceEdit, b: SourceEdit): SourceEdit | null;       // one range when b touches or lies inside a's inserted text, else null
export function createSourceBatcher(o: { flushMs: number /* 250 */; timers: Timers; emit: (edits: SourceEdit[]) => void }): { push(e: SourceEdit): void; flush(): void; cancel(): void };
// sources.ts addition
export type WriteGate = { writable: boolean; reason: "none" | "viewer" | "not-holder" | "ended"; holderName: string | null };
//   bindSources(..., gate: () => WriteGate): when !writable the editor is read-only and no op is made
// CodeDock.tsx: props { gate: WriteGate; onRequestBaton(): void; t }
```
- Algorithm: `composeEdits(a, b)` merges edits of one file in typing order: if `b.pos` is within `[a.pos, a.pos + a.ins.length]` the result replaces `a`'s range with the combined text (`del` extended when `b` deletes beyond `a`'s inserted text); otherwise `null` and the batcher flushes `a` and starts `b`. A burst flushes at 250 ms of quiet, at 1 s of continuous typing, on blur and before `baton.release`. All edits of one flush go as one batch (`DocStore.commit` with a `batch` id) so no foreign op lands inside. Offsets are UTF-16 code units, the same unit CodeMirror and the shared `apply` use (RT 9). `baseSeq` is `DocStore.confirmedSeq` when the first edit of the burst was made. In `CodeDock`, a non-holder gets `readOnly` on the CodeMirror view, a line "Held by {name}" (or "Nobody has the keyboard") and a button "Ask for the keyboard" that sends `baton.request`; the holder sees "You have the keyboard" and a "Give it back" button that flushes then sends `baton.release`. When the server answers `not_baton` to a flush (the baton moved while the burst was in flight), the batch is dropped by the rebase machinery and the editor shows the holder's text (the person's unsent keystrokes are in the rebase report). The panel announces holder changes in the live region; the state is words, not colour.
- State transitions: `writable` / `read-only(viewer | not-holder | ended)`.
- Validation and errors: a file removed by the holder while someone else views it: the view switches to the next file; a `stale_base` is not produced because `codeMode` is `baton` only (D5).
- Edge cases: the holder disconnects: for 30 s the dock says "{name} left. The keyboard is free in 30 s" using the presence event; a paste is one edit; undo in the editor while in a room is the per-author undo of ADR-0805 (the inverse op from the ack), not CodeMirror's history; IME composition is not flushed mid-composition (flush on `compositionend`).
- Permissions: the gate follows `RoomStatus.access` and the baton holder; the server enforces (T-B7-04). Performance: one `source.edit` per burst, under 10 per second.
- Migration: none.
- Data model: none persisted; `SourceEdit` in memory. API contract: op `source.edit` (`id`, `baseSeq`, `pos`, `del`, `ins`) and commands `baton.request`, `baton.release`.

**Verification**
- Unit tests: `src/collab/source-batch.test.ts` (composition equals sequential application: a seeded random edit script of 500 edits applied one by one and via the batcher gives the same text; adjacent, inside and disjoint cases; non-BMP characters; flush on timer, on size, on blur; `cancel`); `src/studio/code/sources.test.ts` (extend: a read-only gate makes no op); `src/components/studio/CodeDock.test.tsx` (extend: each gate state shows its text and button; clicking request sends the command; holder sees give back).
- Integration: baton hand-over through the socket in T-B7-35. Playwright: T-B7-35. Fixtures: none.
- Acceptance: Given Mina is not the holder, When she types in the code dock, Then no character appears and no op is sent. Given Mina is granted the baton, When she types "delay(500);", Then Amar sees it within one round trip and the two source texts are equal.
- Observability: none. Release blockers: a non-holder keystroke that changes the local text.

**Delivery**
- Definition of done: tests pass; `src/components/boardlab/CodeEditor.tsx` unchanged by this task.
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/collab/source-batch.test.ts src/studio/code src/components/studio/CodeDock.test.tsx`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `createSourceBatcher`, `WriteGate`.

---

### T-B7-28 Shares, client: read-only open and "Make my copy"

| Field | Value |
|---|---|
| Subsystem | `src/collab`, `src/studio`, `src/components/studio` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-16, T-B7-19, T-B7-22, T-B7-26, T-B7-38 (`fetchAnon`), T-B7-41 (router and `StudioEntry.tsx`) |
| Status | not started |
| Features, requirements | F-089, F-143 (buddies audience); R-095; CM-09, CM-11; ADR-0426 |

**Intent**
- Problem: a share link does nothing yet. A friend must be able to open it, run it, and make their own copy, and must be unable to change the original.
- Target user: a friend with a link.
- User story: as a friend, I click the link and see Amar's circuit running; if I want to change it I press Make my copy.
- Expected behaviour: the route `#share=<token>` fetches the snapshot, validates it as an untrusted file, and opens it in an in-memory read-only session (not in my library). Run, pan and inspect work; edits are refused with a visible reason. "Make my copy" creates a fork in my library and opens it. A revoked or expired link shows one generic text.
- Success metric: CM-09: the project runs read-only and "Make my copy" creates a fork with `provenance.origin.kind = "fork"`; CM-11: after the owner revokes, the same link shows the generic text.

**Implementation**
- Existing files: `src/studio/router.ts` (edited by T-B7-41), `src/components/studio/StudioEntry.tsx` (edited by T-B7-41 and T-B7-26; how it opens `#/<prj_id>` from the library), `src/local/project-host.ts` and `project.worker.ts` (T-B3-03: untrusted-file load path used by `.iynk` import), `src/local/library.ts` (T-B3-06: fork), `src/collab/fork.ts` (T-B7-19: `forkDocument`), `src/collab/share.ts` (T-B7-16).
- Files: new `src/collab/share-open.ts`; edit `src/studio/router.ts`, `src/components/studio/StudioEntry.tsx`.
- Modules and signatures:

```ts
// share-open.ts
export function parseShareFragment(hash: string): { token: string } | null;                 // "#share=<22 base64url>"
export type OpenedShare = { doc: ProjectDocument; share: { id: string; allowFork: boolean; revision: number; expiresAt: string | null }; owner: { displayName: string }; stateHash: string };
export function openShare(c: ServerClient, token: string): Promise<{ ok: true; opened: OpenedShare } | { ok: false; reason: "gone" | "needs_server" | "invalid" | "network" }>;
export function fetchSharedAsset(c: ServerClient, token: string, sha256: string): Promise<Uint8Array | null>;      // GET /v1/shares/{token}/assets/{sha256} (openapi getSharedAsset); null on 404
export function makeMyCopy(d: { lib: Library; me: Actor }, opened: OpenedShare): Promise<string>;          // forkDocument + library; returns the new project id
export function readOnlyAccess(opened: OpenedShare, makeCopy: () => Promise<void>): EditAccess;                 // { mode: "readonly", reason: "share", action: { id: "makeCopy", run } }
```
- Algorithm: the fragment handler reads the token once and replaces the hash with `#share-open` (so the secret is gone from the address bar, history and bookmarks; if the page is reloaded the person reopens from the link). `openShare` calls `GET /v1/shares/{token}` (`c.fetchAnon` for `link`; `c.fetchAuthed` for `buddies` when signed in), with `Referrer-Policy: no-referrer` in effect (the app sets `<meta name="referrer" content="no-referrer">` on the studio page via T-B1; if not set, `fetch(..., { referrerPolicy: "no-referrer" })`). The body goes through the untrusted-file path (the `project` worker: V1 to V5, size limits), recomputes `stateHash` and compares it with the server's value (a mismatch shows the generic text). The document opens in an ephemeral `ProjectSession` that never writes to the library and never autosaves; `DocStore.setAccess(readOnlyAccess(...))` makes `commit` refuse; run controls, pan and zoom, the inspector (read), the code dock (read-only) work. The shared assets are fetched with `fetchSharedAsset` (openapi `getSharedAsset`), one request per `assets[]` entry of the `SharedProject` reply, and held in memory for the ephemeral session; a 404 for one asset shows its part with the fallback art and does not fail the open. "Make my copy" (shown in the banner by T-B7-26 through `access.action`) calls `makeMyCopy`: `forkDocument` with `origin = {project: doc.id, revision, stateHash}`, a new project id, the opener as the only owner (`actor.set` of the opener, COMMUNITY CM-14 lists authors in `actors` and `contributors`), saved by the library, then the Studio navigates to `#/<new id>`. If `allowFork` is false the button is absent and the banner says copying is off for this share.
  Not built (D16): the owner-signature check.
- State transitions: `idle` to `fetching` to `open-readonly` to (`copied` | `closed`).
- Validation and errors: `404` and any unknown reason map to `gone` ("This link does not work any more"); a document the worker rejects maps to `invalid` with the validation code in the local error log only; no server configured maps to `needs_server`.
- Edge cases: a `buddies` share opened by someone who is not signed in gets `gone`; third-party parts with `review: "unchecked"` show the note COMMUNITY 3.5 describes (the note text is the existing provenance note component, UNKNOWN name; if none exists the task shows nothing and lists it in the commit body); opening the same token twice replaces the previous ephemeral session.
- Permissions: link audience needs no token; buddies audience needs a signed-in buddy. Performance: open of a 500-part share under 2 s on a 5 Mbit/s link (ESTIMATED: 159 KB at the largest allowed document, PDM 9.6, plus validation).
- Migration: none.
- Data model: `OpenedShare` in memory only. API contract: `GET /v1/shares/{token}` and `GET /v1/shares/{token}/assets/{sha256}` (openapi `openShare`, `getSharedAsset`).

**Verification**
- Unit tests: `src/collab/share-open.test.ts` (fake client): fragment parsing; `gone` for 404; hash mismatch gives `invalid`; the hash is replaced after the first read; `makeMyCopy` result has `origin.kind` `fork`, a new id, `origin.project` the shared project's id, and keeps authors; `allowFork: false` has no action; `fetchSharedAsset` returns bytes for 200 and null for 404, and the open still succeeds when one asset is 404. `src/studio/router.test.ts` (extend): the share route does not leak the token into later routes.
- Integration: server round trip in T-B7-36. Playwright: T-B7-36 (CM-09, CM-11 in two browsers).
- Fixtures: `src/collab/__fixtures__/shared-project.json` (a small `SharedProject` reply).
- Acceptance: Given a link, When a friend opens it and tries to place a part, Then the part is refused with the visible read-only reason and the original is unchanged. Given Make my copy, Then a new project appears in the library with a `fork` origin.
- Observability: local error log on `invalid`. Release blockers: the token left in the address bar; an ephemeral share written to the library without the person's action.

**Delivery**
- Definition of done: tests pass.
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/collab/share-open.test.ts src/studio/router.test.ts src/components/studio`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `openShare`, `makeMyCopy`, `readOnlyAccess`.

---

### T-B7-29 Members, presence and chat panels

| Field | Value |
|---|---|
| Subsystem | `src/components/studio/room`, `src/collab` |
| Phase, priority | B7, P1 |
| Dependencies | T-B7-05, T-B7-23, T-B7-26 |
| Status | not started |
| Features, requirements | F-116, F-117; R-084, R-092; ADR-0507; K-A11Y |

**Intent**
- Problem: R-084 asks the room to show who is present, who holds the baton and the connection state; R-092 asks for chat with a cap, a rate limit and a 50-line replay.
- Target user: members of a room.
- User story: as a friend, I see who is here and what each person is allowed to do, and I can talk without leaving the editor.
- Expected behaviour: a Members list (name, role in words, host and baton marks in words, online or away, the app version a person runs) and a Chat panel (text only, 500 graphemes, server-typed lines, rate-limit message, muted state). Lines from other people are shown as text, never as HTML.
- Success metric: axe zero serious or critical; a 500-grapheme message sends; the 6th message in a second shows the rate-limit text instead of failing silently.

**Implementation**
- Existing files: `src/components/studio/room/SidePanel.tsx`, `RoomDock.tsx` (T-B7-26), `src/collab/presence.ts` (`PresenceStore`), `src/components/realtime/ChatPanel.tsx` (old chat for lab rooms: read for the log markup, do not import), `src/lib/realtime/translate.ts` (kept for later; per-reader translation is LATER, F-108, so B7 does not call it).
- Files: new `src/components/studio/room/Members.tsx`, `src/components/studio/room/Chat.tsx`, `src/collab/chat.ts`; edit `src/components/studio/room/SidePanel.tsx`.
- Modules and signatures:

```ts
// chat.ts
export type ChatLine = { id: string; m: number; name: string; text: string; kind: "text" | "system"; at: string; mine: boolean };
export class ChatStore { constructor(clock: () => number, random: () => number);
  attach(client: RoomClient, presence: PresenceStore): () => void;       // welcome.chat backlog, chat frames, error rate_limited / permission
  send(text: string): { ok: true; id: string } | { ok: false; reason: "empty" | "too_long" | "rate" | "muted" };
  getSnapshot(): { lines: readonly ChatLine[]; muted: boolean; retryAfterMs: number | null }; subscribe(fn: () => void): () => void }
// Members.tsx: Members(props: { t }) reads PresenceStore; Chat.tsx: Chat(props: { t }) reads ChatStore
```
- Algorithm: `ChatStore.send` trims, refuses empty text, counts graphemes with `Intl.Segmenter` (500 max), makes a client id (`cht_` plus random), sends `{t:"chat", id, text, lang}` with `lang` from the UI language; the line appears when the server's frame comes back (the server echoes to the sender; lines are de-duplicated by `id`). A `rate_limited` error sets `retryAfterMs` and the input shows `chat.rateLimited`; `permission` sets `muted`. Backlog: the `chat` frames that follow `welcome` (at most 50). System lines (kind `system`, `m` 0) are styled as notices. The list is `role="log"` with `aria-live="polite"`; each line is `<name>: <text>` as text nodes (React escapes; no `dangerouslySetInnerHTML` anywhere, R-028, lint rule). `Members` lists each member as a row: name, role word (`rooms.members.role.*`), "host", "has the keyboard", "away", the app version string when it differs from mine, and a visually hidden description for screen readers; spectators are grouped under "Watching". The panel is a `Tabs` (`@/components/ui/Tabs`) with Members and Chat; an unread count badge on Chat is text ("3 new").
- State transitions: chat input `idle` / `rate-limited(until)` / `muted`.
- Validation and errors: as above; a message over 500 graphemes cannot be typed (counter shows `n/500`).
- Edge cases: 600 members never happen (cap 8 + 8); a very long unbroken word wraps (CSS `overflow-wrap: anywhere`); a name with bidi characters was stripped by the server; chat is not stored after the room expires (memory only, R-092).
- Permissions: muted members see the muted text. Performance: the log keeps the last 200 lines in memory. Migration: none.
- Data model: a `ChatLine` list in memory (last 200); nothing persisted. API contract: socket frames `chat` and `presence`.

**Verification**
- Unit tests: `src/collab/chat.test.ts` (virtual clock): empty and over-long refusals; id de-duplication of the echo; `rate_limited` sets `retryAfterMs`; `muted`; backlog order; system lines. `src/components/studio/room/Members.test.tsx` and `Chat.test.tsx` (RTL): roles and marks in words; spectators grouped; `<script>` in a line renders as text; a line with `<img onerror>` renders as text; counter; unread badge text; the six-language smoke render.
- Integration: socket round trip in T-B7-35. Playwright: axe and a two-browser chat line in T-B7-35. Fixtures: none.
- Acceptance: Given a line `<b>hi</b>` from a buddy, When shown, Then the angle brackets appear as text. Given 6 messages in a second, Then the sixth is refused with the rate-limit text.
- Observability: none. Release blockers: any HTML injection path.

**Delivery**
- Definition of done: tests pass.
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/collab/chat.test.ts src/components/studio/room`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `ChatStore`, `Members`, `Chat`.

---

### T-B7-30 Rebase report and room-ended notices

| Field | Value |
|---|---|
| Subsystem | `src/components/studio/room` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-15, T-B7-19, T-B7-26 |
| Status | not started |
| Features, requirements | F-121; R-085, R-087, R-088; ADR-0508; RA-07, RA-18 |

**Intent**
- Problem: when a rejoin drops some of the person's edits, or a room closes, the person needs plain words and a way to keep their version.
- Target user: a member who was offline, or whose room was closed.
- User story: as Amar, after my laptop slept, I see which of my changes were dropped and why, and I can keep a copy of my version.
- Expected behaviour: after a rebase with dropped submissions a dialog lists each one in words ("Mina deleted R3 while you were offline, so your change to R3's value was dropped") with a "Keep a copy of my version" button. When a room closes, each non-creator member is offered "Keep a copy" (a fork with `provenance.origin` kind `fork`) and the creator keeps the project.
- Success metric: RA-07: three dropped submissions produce three lines naming cause and author; "Keep a copy" gives a project whose hash equals the pre-rebase local state.

**Implementation**
- Existing files: `src/components/studio/room/BannerArea.tsx` (T-B7-26), `src/collab/rebase.ts` (`RebaseReport`, `DropReason`), `src/collab/fork.ts` (T-B7-19: `keepCopy`, `planOnClose`), `src/components/ui/Dialog.tsx`.
- Files: new `src/components/studio/room/RebaseReport.tsx`, `src/components/studio/room/RoomEndedNotice.tsx`; edit `src/components/studio/room/BannerArea.tsx`.
- Modules and signatures:

```tsx
export function describeDrop(d: DropReason, doc: ProjectDocument, actors: readonly Actor[]): { code: string; who: string | null; what: string | null };   // resolves ids to names; falls back to the id
export function RebaseReport(props: { report: RebaseReport; onKeepCopy: () => Promise<void>; onClose: () => void; t: StudioRoomsT }): JSX.Element;
export function RoomEndedNotice(props: { why: "closed" | "kicked" | "unavailable"; isCreator: boolean; onKeepCopy: () => Promise<string>; t: StudioRoomsT }): JSX.Element;
```
- Algorithm: `describeDrop` maps a `DropReason` to parameters for a `rooms.rebase.dropped` string: `who` from `actors[].name` for `byActor`, `what` from the component's reference designator or the net name via the document (`touched` ids); when either is missing the generic text `droppedGeneric` is used. The dialog lists drops in submission order. "Keep a copy" calls `keepCopy(lib, report.localBefore, origin)` (T-B7-19) and then shows `copyKept` with the new project's name; it never switches the current project. On `closed`: the creator sees "The room is closed. This project stays in your library." (the room project keeps its id); a non-creator sees "The room is closed" and "Keep a copy" (a fork with a new id); a kicked member sees the kicked text without a copy offer for the room's current state (they keep their last local state under the room's id until they choose; `kicked` still offers `keepCopy` of their last local document because it is theirs). The dialog is focus-trapped and announces itself.
- State transitions: `shown` to `copying` to `done`. Validation and errors: a failed copy shows the library error text and keeps the dialog open. Edge cases: zero drops shows nothing; a drop of a submission with ops from many components lists the first three named components and "and N more". Permissions: none. Performance: the dialog opens lazily.
- Migration: none.
- Data model: `RebaseReport` (T-B7-15) in memory. API contract: none.

**Verification**
- Unit tests: `src/components/studio/room/RebaseReport.test.tsx` (RTL): the RA-07 script's report renders three lines with the friend's name and the component name; generic text when ids are missing; "Keep a copy" calls the library with the pre-rebase document; focus trap; six-language smoke. `RoomEndedNotice.test.tsx`: creator, non-creator and kicked texts; "Keep a copy" returns an id and shows it; no extra detail in the kicked text.
- Integration: end-to-end close and fork in T-B7-35 (RA-18). Playwright: T-B7-35. Fixtures: the RA-07 script (T-B7-15).
- Acceptance: Given a room closed by the host, When the buddy presses Keep a copy, Then their library has a new project whose `provenance.origin.kind` is `fork` and whose `stateHash` equals the room's final state.
- Observability: none. Release blockers: copy offered silently without telling the person.

**Delivery**
- Definition of done: tests pass.
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/components/studio/room`.
- Documentation: none. Rollback: common rule.
- Later tasks need: nothing (T-B7-35 drives it).

---

### T-B7-31 Baton, host controls and the room menu

| Field | Value |
|---|---|
| Subsystem | `src/components/studio/room`, `src/components/realtime` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-05, T-B7-22, T-B7-23, T-B7-26, T-B7-41 |
| Status | not started |
| Features, requirements | F-116, F-120, F-122; R-076, R-084, R-093, R-094; K-A11Y |

**Intent**
- Problem: the server has the commands (T-B7-14) and the open flow exists (T-B7-22); nothing in the UI lets a person start a room, invite someone, pass the keyboard, mute or remove a person, lock or close.
- Target user: the host, the owner, the buddy.
- User story: as Amar, I press "Work together", pick Mina, and later I pass her the keyboard and, if needed, lock the room.
- Expected behaviour: a room menu (start a room, invite, leave, close), a baton control (ask, give, take, release), host controls (kick, mute, lock, pass host, claim, settings) and the existing invite dialog extended to show role, use limit and expiry. Destructive actions ask to confirm. The menu says "needs a server" when there is none.
- Success metric: every command of RT 6.2 is reachable by keyboard and works from the UI; axe zero serious or critical.

**Implementation**
- Existing files: `src/components/realtime/InviteDialog.tsx:52-134` (reused: props `open, onClose, link, title, hint, code, action, t: TogetherT`; `code` is shown in the share text and QR label), `src/components/studio/room/Toolbar.tsx` (T-B7-26), `src/collab/join.ts` (`openRoomFor`, `inviteLink`), `src/collab/rooms-api.ts` (`createInvite`, `revokeInvite`), `src/collab/lobby.ts` (`LobbyClient` buddies), `src/collab/presence.ts`, `src/components/ui/{Dialog,Button,Popover}.tsx`.
- Files: new `src/components/studio/room/BatonControl.tsx`, `src/components/studio/room/HostControls.tsx`, `src/components/studio/room/RoomMenu.tsx`; edit `src/components/realtime/InviteDialog.tsx`, `src/components/studio/room/Toolbar.tsx`.
- Sub-steps, each with its own test file: (1) `InviteDialog.tsx` gains the optional `note` prop, covered by `InviteDialog.test.tsx` (the lab callers compile unchanged); (2) `BatonControl.tsx` with `BatonControl.test.tsx`; (3) `HostControls.tsx` with `HostControls.test.tsx`; (4) `RoomMenu.tsx` with `RoomMenu.test.tsx`; (5) `Toolbar.tsx` mounts (2) to (4) and is covered by `RoomMenu.test.tsx`.
- Modules and signatures:

```tsx
export function RoomMenu(props: { t: StudioRoomsT; tt: TogetherT }): JSX.Element;      // start: pick a buddy or copy a link; in a room: Invite, Leave, Close
export function BatonControl(props: { t: StudioRoomsT }): JSX.Element | null;          // request / give to / take / release by role
export function HostControls(props: { t: StudioRoomsT }): JSX.Element | null;          // host or owner only
// InviteDialog.tsx change: add optional `note?: string` shown under the link ("Editor, 1 use, until Oct 28, 14:00") and keep every existing prop; `code` receives the room title
```
- Algorithm: `RoomMenu` also lists the lobby snapshot's incoming invitations ("Amar invites you to Blink") with Join (`acceptInvite` then `joinRoom`, T-B7-22) and Decline (`LobbyClient.dismiss`), with the count in text on the menu button. `RoomMenu` (not in a room): "Work together" lists the online and offline buddies from the lobby snapshot (offline ones are listed as "away" and can still be invited: the invite waits) and "Copy an invite link"; choosing a buddy runs `openRoomFor` then `createInvite({buddy, role: "editor"})` (Q-R5 default: direct invite is `editor`); choosing the link asks for a role (`viewer` by default per Q-R5, `editor` offered) then shows `InviteDialog` with the fragment link, QR code, copy and share. In a room, "Invite" opens the same dialog; the invite list shows each live invite with a Revoke button. `BatonControl`: shows who holds the keyboard in words; for an editor with no holder "Take the keyboard"; with a holder "Ask for the keyboard"; the holder and the host get a "Give it to" select of present editors and "Give it back"; the host also gets "Take it back". `HostControls`: a member list with Mute/Unmute and Remove (with confirm and the `host.kickConfirm` text) per member, Lock/Unlock room, Pass host to, Claim host (creator), Room settings (`runControl`; `codeMode` is shown as "Keyboard passing" with no `open` choice, D5; `spectatorCursors`), Close room (confirm; creates the `RoomEndedNotice` flow for others). Every command sends `{t:"cmd", id, name, args}` through `RoomClient.send` and shows the server's answer (`permission` text) in a live region.
- State transitions: menu `closed` / `picking` / `creating` / `inviting`. Validation and errors: `409 quota` texts from T-B7-22; offline server: the menu shows `needsServer` and nothing else.
- Edge cases: a person who is only a viewer sees no baton or host controls, only Leave; the creator reconnecting reclaims host with one button; the invite dialog never shows a secret for a direct invite (none exists); copying fails (permissions): the link field is selectable (existing behaviour).
- Permissions: UI hides what the role cannot do; the server enforces. Performance: lazy chunk with the room commands.
- Migration: none. `InviteDialog.tsx` stays compatible with its two lab callers.
- Data model: none persisted. API contract: socket `cmd` frames `baton.*`, `host.*`, `member.*`, `room.*`; HTTP `createRoomInvite`, `revokeRoomInvite`, `closeRoom` through T-B7-22.

**Verification**
- Unit tests: `RoomMenu.test.tsx`, `BatonControl.test.tsx`, `HostControls.test.tsx` (RTL with a fake handle that records sent commands): each control sends exactly the right command and args; role-based visibility; confirm steps; "needs a server"; buddy list states; the invite link has the fragment form and no `?`; the six-language smoke render. `src/components/realtime/InviteDialog` existing tests (if any) and `src/app/[lang]/together` callers still compile and pass (`TL`).
- Integration: socket round trip in T-B7-35. Playwright: T-B7-35 (keyboard-only path through the menu plus axe). Fixtures: none.
- Acceptance: Given Amar is host, When he chooses Remove on Mina and confirms, Then `member.kick` is sent and Mina's editor shows the kicked notice. Given Mina is not the holder, When she presses "Ask for the keyboard", Then Amar sees the request.
- Observability: none. Release blockers: a destructive action without confirmation.

**Delivery**
- Definition of done: tests pass; lab callers of `InviteDialog` unchanged in behaviour.
- Verify commands: `npm run typecheck && npm run lint`; `npx vitest run src/components/studio/room src/components/realtime`.
- Documentation: none. Rollback: common rule.
- Later tasks need: nothing (T-B7-35 drives it).

---

### T-B7-32 Mount rooms, assets, shares, scores and the socket

| Field | Value |
|---|---|
| Subsystem | `server/src` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-04, 08, 09, 10, 12, 18, 21, 25, 39 |
| Status | not started |
| Features, requirements | F-165, F-198, F-199; R-078, R-007; BA-11; ADR-0420, ADR-0430 |

Split by the 2026-10-27 review: this task mounts the server pieces. The Playwright support is T-B7-40. The route buckets are added by T-B7-04, the unpair hook by T-B7-39, so this task only registers.

**Intent**
- Problem: the pieces exist but nothing serves them. A route added without a bucket must fail a test (BA-11).
- Target user: the operator (one command) and the test suite.
- User story: as the operator, `node server/src/main.ts` serves rooms, assets, shares, scores and the socket, and shuts down without losing an acknowledged op.
- Expected behaviour: B6's `createApp` also builds the repositories, registry, lobby and socket server, adds the B7 route modules to `allRoutes`, starts the jobs and drains on SIGTERM. `GET /v1/server` reports the new features. B6's `createApp(config, deps, opts?)` signature stays; B7 adds fields to `opts` and to the returned `App`.
- Success metric: BA-11 passes with the new routes; a fresh server answers `GET /v1/server` with `features.rooms`, `shares` and `assets` true.

**Implementation**
- Existing files: `server/src/app.ts` (T-B6-17: `createApp`, `App`, `allRoutes(ctx: RouteDeps)`; T-B7-39 already added `RouteDeps.buddyRemoval`), `server/src/main.ts` (listen and SIGTERM only), `server/src/http/server-info.ts` (T-B6-17: `features` and `limits`), `server/src/http/{router,limits,classes}.ts` (T-B6-07), `server/src/ops/log.ts` (T-B6-13), and every B7 server module. `API_CONTRACTS.md` 4.3 holds the bucket table; T-B7-04 already added the buckets.
- Files: new `server/src/collab-app.ts`; edit `server/src/app.ts`, `server/src/main.ts`, `server/src/http/server-info.ts`. `server/src/config.ts` is not edited: collab limits come from `loadCollabLimits(process.env)`, called in `main.ts` next to `loadConfig` and passed in through `opts.collab`. `http/classes.ts` is not edited (T-B7-04).
- Tests and support (not counted): `server/test/mount.test.ts`, `server/test/{rooms,assets,shares,scores,invites}.http.test.ts`, `server/test/shutdown.test.ts`.
- Modules and signatures:

```ts
// app.ts (edit)
export type TestHooks = { afterCommit?: (group: CommitWrite[]) => void };      // test seam; T-B7-33 kills the process here
export type CreateAppOptions = { store?: ServerStore; log?: Logger; collab?: CollabLimits; hooks?: TestHooks };
export function createApp(config: ServerConfig, deps: Deps, opts?: CreateAppOptions): App;      // B6 signature plus two optional fields
export type App = /* B6 fields */ & { onUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void; registry: RoomRegistry };
//   drain(): void keeps B6's meaning (health 503) and also starts ws.drain(2000); close(): Promise<void> awaits it, then registry.shutdown(), WAL TRUNCATE, store close
// collab-app.ts (new)
export function mountCollab(ctx: RouteDeps, o: { limits: CollabLimits; hooks?: TestHooks }): { routes: RouteDef[]; onUpgrade: App["onUpgrade"]; registry: RoomRegistry; jobs: { start(): void; stop(): void }; drain(): Promise<void>; shutdown(): void };
// allRoutes(ctx) in app.ts: [...B6 routes, ...mountCollab(ctx).routes]
// main.ts: server.on("upgrade", app.onUpgrade); loadCollabLimits errors exit 2 with one line per problem, like ConfigError
// server-info.ts: features.rooms, shares, assets true; limits gain the openapi names (maxLiveRooms, maxMembers, maxProjectBytes, ...) as ServerInfo lists them
```
- Algorithm: `mountCollab` wiring order: migrations 0001 to 0004 (already applied by `openStore`), repositories (`createRoomsRepo`, `createAssetsRepo`, `createSharesRepo`, `createScoresRepo`), `RoomRegistry` (with `hasBlob` from the assets repo and `hooks.afterCommit` into `CoreDeps.afterCommit`), `LobbyHub`, `SessionRegistry`, `NonceStore`, `AuthLimiter`, command registry, `CheckpointPolicy`, then the route modules (`roomRoutes`, `inviteRoutes`, `assetRoutes`, `shareRoutes`, `scoreRoutes`), each `RouteDef` carrying the `cls` and `bucket` its task named, and `createWsServer` for path `/ws` only on the HTTP server's `upgrade` event. The `buddyRemoval` hook of T-B7-39 is filled with `(tx, a, b) => { const r = registry.removeSharedAccess(a, b); return () => { r.after(); lobby.buddyRemoved(a, b); }; }`, so unpair (CM-06) has one seam: rows are removed inside the unpair transaction, and the returned function closes sockets and tells the lobby after COMMIT. Jobs (the mechanism of ADR-0011: timers, no queue): every minute `registry.evictIdle` and the ws heartbeat; every 5 minutes `registry.sweep`, shares sweep, invite expiry, `wal_checkpoint(PASSIVE)` (RC-05); every hour `assets.sweepUnreferenced`; every 5 seconds the revocation watch (`sessions.startRevocationWatch`), which also calls `registry.dropDevice`. SIGTERM and SIGINT handling stays in B6's `main.ts`; B7 only makes `drain()` and `close()` do the extra work (RC-05: WAL `TRUNCATE` at shutdown only). `listen` binds `127.0.0.1` unless the operator sets a host.
- State transitions: server `starting` to `listening` to `draining` to `closed`.
- Validation and errors: a route without a class or bucket fails `server/test/mount.test.ts` (and `defineRoutes` at load); a bucket without a default rule fails it; the `Access-Control-Allow-Origin: *` header never appears (BA-11).
- Edge cases: a second `createApp` in one process uses its own registry (tests rely on it); `drain` is idempotent; a store that fails to migrate stops the start with the migration name.
- Permissions: as each route. Performance: boot under 1 s on this Mac excluding Node start. Migration: runs 0002 to 0004 (applied by `openStore`).
- Data model: no new table. API contract: the whole B7 route set registered with buckets; `GET /v1/server` `ServerInfo` features and limits.

**Verification**
- Tests: `server/test/mount.test.ts` (BA-11): every registered route has a class and bucket and every bucket a rule; unknown path 404; no wildcard CORS; `GET /v1/server` features. The five `*.http.test.ts` files run the unit cases of T-B7-18, 08, 09, 10 and 25 end to end through the real router and a fake-device client (bearer tokens from the T-B6 flow, `server/test/http-helpers.ts`): create room then get; asset PUT, GET, HEAD and query with the sandbox CSP; share create, open, shared-asset read and revoke with byte-identical 404s and the token byte scan (BA-10); score submit and board with buddies only (CM-20 to CM-24); invite create and redeem (CM-12). CM-06 through the router: A and B paired, B joined A's room, A has a direct invite for B; `DELETE /v1/buddies/{id}` closes B's socket with 4403, deletes B's member row and the invite, and the buddy row, in one transaction (a hook that throws leaves the buddy row, the member row and the invite in place). `server/test/shutdown.test.ts`: SIGTERM during a stream of commits leaves no acknowledged op missing (the full kill test is T-B7-33).
- Integration: this is the integration step for the server tasks. Playwright: T-B7-40.
- Fixtures: none.
- Acceptance: Given a clean data directory, When the server starts, Then `GET /v1/server` shows rooms, shares and assets on. Given SIGTERM, Then sockets close with 1012 and `retryAfterMs`.
- Observability: `/metrics` exposes every `iynk_*` series named in tasks 06 to 25; startup logs the migration versions and the limits (no secrets).
- Release blockers: a route with no class; the server listening on all interfaces by default.

**Delivery**
- Definition of done: tests pass; `SRV` green.
- Verify commands: `npm run typecheck && npm run lint`; `npm run server:typecheck`; `npm run server:test`; `cd server && node --test test/mount.test.ts test/shutdown.test.ts`.
- Documentation: none (T-B7-37). Rollback: common rule.
- Later tasks need: `createApp` with `opts.hooks`, `App.onUpgrade`, `mountCollab`.

---

### T-B7-40 End-to-end server support for Playwright

| Field | Value |
|---|---|
| Subsystem | `e2e`, `playwright.config.ts` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-32; B6 (T-B6-21 harness, T-B6-10 Buddies page, T-B6-11 server panel) |
| Status | not started |
| Features, requirements | R-007; BA-12; ADR-0430 |

**Intent**
- Problem: the room, share and board specs need a real server they can enrol against, and the crash step of the room spec needs a server it can kill and restart. B6 already provides one config-managed server (T-B6-21); B7 must not build a second harness beside it.
- Target user: the authors of T-B7-35 and T-B7-36.
- User story: as a test, I get a server URL, enrolment codes, two paired browsers and, when I need it, a server I can kill.
- Expected behaviour: `e2e/server-harness.ts` (T-B6-21) is extended; no new `startServer` or port logic exists elsewhere.
- Success metric: `e2e/server-support.spec.ts` boots, enrols and pairs two contexts, kills and restarts a spawned server, and the browsers reconnect.

**Implementation**
- Existing files: `playwright.config.ts` (T-B6-21: `E2E_SERVER_PORT`, `E2E_DEAD_PORT`, `webServer` array, `IYNK_CONNECT_ORIGINS`, temp dir in `E2E_SERVER_DATA`), `e2e/server-harness.ts` (`serverUrl()`, `newEnrolmentCode()`, `firstOwnerCode()`), `fullyParallel: true` at `playwright.config.ts:18`.
- Files: edit `playwright.config.ts` (source file, 1). New or edited test support, not counted: `e2e/server-harness.ts`, `e2e/idb-helpers.ts`, `e2e/server-support.spec.ts`.
- How the two ways of running a server coexist (decided now):
  - Specs that never kill the server (`share.spec.ts`, `buddy-board.spec.ts`, the Buddies specs of B6) use the config-managed server: `serverUrl()` and `E2E_SERVER_DATA`. Several specs and repeats may share it at once because each enrols its own devices and score keys.
  - The room spec kills and restarts the server, and Playwright owns the config-managed process, so that spec spawns its own: `spawnServer()` in `e2e/server-harness.ts` picks a free port in 40000 to 49999 that is not 43117, not 3000, not `E2E_PORT`, `E2E_SERVER_PORT` or `E2E_DEAD_PORT` (it binds the port to test it, so parallel repeats cannot collide), makes its own temp data directory, and starts `node server/src/main.ts` with the same environment names B6 uses (`IYNK_DATA_DIR`, `IYNK_PUBLIC_URL=http://localhost:<port>`, `IYNK_ALLOWED_ORIGINS=http://localhost:${E2E_PORT}`, `IYNK_HOST=127.0.0.1`, `IYNK_PORT`, `IYNK_ENROL=code`, `IYNK_LOG_LEVEL=warn`, `IYNK_STORE_SYNC`). Because the web build's CSP `connect-src` is fixed when `next start` begins, `playwright.config.ts` adds `http://localhost:*` and `ws://localhost:*` to the web entry's `IYNK_CONNECT_ORIGINS` (the test build only; the sources are still `localhost`).
- Modules and signatures:

```ts
// e2e/server-harness.ts (additions)
export type SpawnedServer = { url: string; port: number; dataDir: string; pid: number; stop(): Promise<void>; kill(): Promise<void>; restart(): Promise<void>; enrolCode(): Promise<string> };
export function spawnServer(o?: { sync?: "full" | "normal"; env?: Record<string, string> }): Promise<SpawnedServer>;     // kill: SIGKILL; restart: same port and directory; enrolCode: runs the operator CLI against the same directory
export function connectBrowser(page: Page, serverUrl: string, enrolCode: string, displayName: string): Promise<void>;     // drives the Settings server panel (T-B6-11) and enrolment
export function pairBrowsers(a: Page, b: Page): Promise<void>;                                                             // drives the Buddies page (T-B6-10)
// e2e/idb-helpers.ts
export function readSavedHash(page: Page, projectId: string): Promise<string | null>;      // reads the `projects` store of database `iynk` (T-B3-02) and returns the saved stateHash
```
- Algorithm: `spawnServer` waits for `/healthz`; `stop()` sends SIGTERM and waits for exit 0; `kill()` sends SIGKILL; `restart()` starts a new process on the same port and directory and waits for `/healthz`. Temp directories are removed in the test's `afterAll`.
- Validation and errors: the helper refuses ports 3000 and 43117. Edge cases: a leftover process from a failed run is killed by pid in `afterAll`. Permissions, performance, migration: none.
- Data model, API contract, state transitions: none.

**Verification**
- Tests: `e2e/server-support.spec.ts`: `spawnServer()` boots; `connectBrowser` and `pairBrowsers` give two enrolled, paired contexts; the server is killed and restarted and `GET /v1/server` answers again; `E2E_PORT`, `E2E_SERVER_PORT` and the spawned port are all different.
- Integration: this is the integration test of the support. Playwright: `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/server-support.spec.ts e2e/server-harness.spec.ts` (written out in T-B7-17); the B6 spec `e2e/server-harness.spec.ts` must still pass.
- Fixtures: none.
- Acceptance: Given a clean machine, When the spec runs, Then two paired browsers exist and a killed server comes back on the same address.
- Observability: the helper attaches server stdout to the test on failure. Release blockers: the helper touching port 3000 or 43117.

**Delivery**
- Definition of done: the spec passes three times in a row (`--repeat-each=3 --retries=0`).
- Verify commands: `npm run typecheck && npm run lint`; the Playwright command above with `--repeat-each=3 --retries=0`.
- Documentation: none. Rollback: common rule.
- Later tasks need: `spawnServer`, `connectBrowser`, `pairBrowsers`, `readSavedHash`.

---

### T-B7-33 Crash test between COMMIT and ack

| Field | Value |
|---|---|
| Subsystem | `server/scripts`, `server/test` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-20, T-B7-32 |
| Status | not started |
| Features, requirements | F-165; R-078, R-083, R-089, R-098; ADR-0505; RA-03, BA-06, AR-08, AR-12, RT-1 (macOS part) |

**Intent**
- Problem: an acknowledged op must survive `kill -9`, and an op committed but not acknowledged must come back as a duplicate-free resend. Random testing cannot prove the second half (RS-09); a kill in exactly that window can.
- Target user: Amar, whose friends' edits must not vanish or double.
- User story: as Amar, if the server dies mid-edit, nothing my friend and I saw confirmed is lost, and nothing is applied twice.
- Expected behaviour: a loop starts a real server process, streams submissions from a scripted client, kills the process at random moments and at the exact COMMIT-to-ack point, restarts it, resumes, resends the unacknowledged submission, and checks the log.
- Success metric: 50 kills with `IYNK_STORE_SYNC=full` and 50 with `normal`: zero lost acknowledged ops, zero half-applied batches, every resend after a post-COMMIT kill returns `ack.dup`, and the chain verifies (BA-06).

**Implementation**
- Existing files: `server/src/app.ts` `createApp(config, deps, opts)` with `opts.hooks.afterCommit` (T-B7-32), `server/src/rooms/checkpoint.ts` (`verifyChainFull`), `server/scripts/bench-store.mjs` and `server/test/store-crash.test.ts` (T-B6-03: the store-level kill harness this extends).
- Files: new `server/scripts/kill-loop.mjs`. Tests (not counted): `server/test/crash-rooms.test.ts`, `server/test/support/crash-main.ts` (a test-only entry that calls `createApp(config, deps, { hooks: { afterCommit } })`, listens like `main.ts` (`http.createServer(app.handler)` plus `server.on("upgrade", app.onUpgrade)`) and has `afterCommit` kill the process with SIGKILL on the n-th commit, `n` from an environment variable; this file is not shipped and production code reads no such variable).
- Algorithm: `kill-loop.mjs --runs 50 --sync full|normal --seed N` loops: start `crash-main.ts` on a temp directory with a room of 200 ops seeded; connect two fake members over `ws` with real signed hellos; a client stream submits one op every 5 ms with sequential `opId`s and records every `ack`; at a seeded random time or on the seeded n-th commit the process is killed; restart; both clients resume (`hello.resume`), the unacknowledged submission is resent; after 200 more ops the loop stops. Checks per run: (1) every `opId` that had an `ack` is in `ops.env` exactly once at its acked `seq`; (2) no submission is half applied (a batch of 3 ops is present as 3 consecutive seqs or not at all); (3) a submission committed but unacknowledged, when resent, returns `ack.dup` (the `submissions` row was written in the commit transaction) and the log has one copy; (4) `verifyChainFull` is ok and `rooms.chain` equals the last op's chain; (5) with `sync = normal` and a simulated power loss (kill during a `PRAGMA wal_checkpoint` is not a power loss, so this is not simulated; the epoch-break path is covered by a unit test in T-B7-13) nothing more is claimed.
- AR-08 scenario (SYSTEM_ARCHITECTURE line 1291): five model clients from `server/test/property/model-client.ts` over a `ws` adapter run at least 10,000 generated ops against the real server process; the process is killed with SIGKILL once mid-run and restarted; every acknowledged op is present and every client converges to the server's `stateHash` and `chain`.
- AR-12 scenario: `iynk-server backup` (T-B6-06) runs under the same write load; the file opens, `PRAGMA integrity_check` returns `ok`, and a server started on it serves the rooms and buddies.
- State transitions, validation: n/a. Edge cases: a kill before the first commit leaves checkpoint 0 only; a kill during the checkpoint write leaves the previous checkpoint valid (the checkpoint is part of a transaction); WAL files are present at restart (SQLite recovers them).
- Permissions: none. Performance: each run takes about 2 s; 100 runs about 4 minutes (ESTIMATED). Migration: none.
- Data model: reads `ops`, `submissions` and `rooms` directly (read-only `node:sqlite`). API contract: the socket. Validation: the five checks per run.

**Verification**
- Tests: `server/test/crash-rooms.test.ts` runs 10 kills per sync mode by default and 50 per mode when `KILL_RUNS=50`; `server/test/crash-ar08.test.ts` is the AR-08 scenario and `server/test/backup-load.test.ts` the AR-12 scenario. The script prints a JSON summary.
- Integration: this is the integration test. Playwright: none. Fixtures: none.
- Acceptance: Given a kill after COMMIT and before any frame is sent, When the author resends, Then `commit` carries `ack.dup = true` and the log has exactly one copy. Given 50 kills, Then zero violations.
- Observability: results written to `docs/MASTER_PLAN/05_ENGINEERING/results/B7-crash.md` (counts per check, seeds, machine, date, macOS note).
- Release blockers: any lost acknowledged op; any duplicate.

**Delivery**
- Definition of done: 50 + 50 kills green on this Mac; results file committed. The Linux run is For Amar (RC-01).
- Verify commands: `npm run typecheck && npm run lint`; `cd server && KILL_RUNS=50 node --test test/crash-rooms.test.ts test/crash-ar08.test.ts test/backup-load.test.ts`; `node server/scripts/kill-loop.mjs --runs 50 --sync full --seed 1`.
- Documentation: the results file. Rollback: common rule.
- Later tasks need: nothing (a gate).

---

### T-B7-34 Hostile-client suite and capacity test

| Field | Value |
|---|---|
| Subsystem | `server/test` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-32 |
| Status | not started |
| Features, requirements | F-119; R-075, R-076, R-097; ADR-0510; RA-05, RA-08, RA-17, BA-07, BA-08; SECURITY_BASELINE R1 to R9 |

**Intent**
- Problem: SECURITY_BASELINE R1 to R9 were reproduced against the old relay (R3 and R4 on 2026-10-27). They must be shown closed on the new server and must stay closed.
- Target user: Amar and anyone who reads the repository.
- User story: as Amar, a stranger who finds my server cannot fill it, sit in my room, or edit my code.
- Expected behaviour: a script plays a hostile client against a fresh server in CI. Every attack is refused and the room continues with honest members unaffected. A capacity test measures the server under the RA-08 load.
- Success metric: every row of RT 16.2 passes with the R-ids in the test title; capacity: p99 op handling under 5 ms and RSS under 400 MB at 20 rooms x 8 members (RA-08; UNKNOWN until run).

**Implementation**
- Existing files: `server/legacy/test/load.js` (T-B6-01 moved the old load harness; read for the shape), `server/test/helpers.ts` (T-B7-03), `createApp` (T-B7-32), `SECURITY_BASELINE.md` "Gap fixes" (the commands that reproduced R3 and R4).
- Files: tests only. New `server/test/hostile/{identity,rooms,frames,chat,assets,shares}.test.ts`, `server/test/hostile/support.ts`, `server/test/load.test.ts` (skipped unless `LOAD=1`), `server/test/support/shaped-proxy.ts`.
- The suite (each test title contains the id, and each test ends by asserting an honest pair of members can still commit an op):

| Test title | Attack | Expected |
|---|---|---|
| `R4 host takeover` | a third socket presents the host's exact `hello`; a second with the host's device id and another key | `unauthorized`, 4401; host and baton unchanged |
| `R4 forged hello` | valid key, wrong device id; revoked device; wrong `aud`; wrong room in the signature; hello after 10 s | 4401, 4000 for the late one |
| `R3 room flood` | 1,000 joins to unknown room ids in a minute; 501 create attempts | each join `room_unavailable` 4403 after at least 200 ms and no room created; creations stop at `quota` and `429`; an honest user can still create afterwards |
| `R3 junk rooms from one device` | create 11 rooms | the 11th is `409 quota` |
| `R1 R2 guess` | 10,000 room ids, 10,000 random invite tokens | identical answers and timing floor; 5 wrong tries then `429` |
| `R6 baton theft` | non-holder `source.edit`; non-host `baton.take`, kick, lock, close | `not_baton` or `permission`; state unchanged |
| `R6 role escalation` | viewer `component.add`; editor `access.grant`; editor `actor.set` | `permission` |
| `R7 spoofed system chat` | chat with `kind: "system"` and `"ai"` | stored and shown as `text` |
| `R8 chat flood` | 60 chat lines in a second | `rate_limited`; 600 drops in 5 s closes 4429 |
| `R9 hostile snapshot` | client sends `state`, `snapshot`, a snapshot-shaped payload | `bad_type`; nothing stored |
| `R9 hostile op` | unknown kind, `__proto__` key, 5 MB body, nesting of 41, dangling wire | `bad_frame` / `too_large` / `bad_json` / reject `missing_target`; no log entry |
| `flood frames` | 600 frames in 5 s | closed 4429 |
| `gzip bomb` | 1 KB gzip inflating to 1 GB | closed 4413 and RSS growth under 64 MB |
| `forged or expired token` | invite after expiry, after revoke, reused single-use; forged, expired and revoked bearer tokens on every B7 route | generic `404` or `401`, identical bodies |
| `oversize snapshot` | create a room from a 5,242,881-byte document; a client frame over 512 KiB inflated | `413 quota`; 4413 |
| `replay of an acked op` | resend an old submission | `commit` with `ack.dup`, log unchanged |
| `slow reader` | a member that never reads | socket cut at 4 MiB, room unaffected |
| `R-078 enrol without code` | 1,000 `POST /v1/identities` without a valid code | all refused (B6 route; asserted here because R-097 lists it) |
| `R5 kick evasion` | a kicked device rejoins with a new random id and with a fresh valid invite | refused (device-keyed ban) |
| `shares enumeration` | 10,000 random share tokens; a revoked token; an expired one | byte-identical `404` |
| `scores stranger` | a non-buddy reads and writes boards | `404`; never appears in a buddy's board |

- Capacity (`load.test.ts`, RA-08): 20 rooms x 8 members; each member 2 ops per second and a cursor at 15 Hz for 10 minutes; reports p50/p95/p99 op handling, RSS, frames per second in and out, any cut member. Run natively on this Mac; if `docker info` succeeds, also in a container with `--cpus=1 --memory=512m` using the image of T-B6-12. The container run on the host Amar will use is For Amar. BA-07 reconnect: `shaped-proxy.js` (a Node TCP proxy with fixed delay and a token-bucket bandwidth cap) shapes a link to 10 Mbit/s and 80 ms; a client with a 1,000-op gap and one with a 10,000-op gap reconnect to `ready`; both under 2 s is the target (RB-4; UNKNOWN until run).
- Legacy relay: VERIFIED `src/lib/realtime/relay.integration.test.ts:15` starts the old relay from `server/realtime` (moved to `server/legacy` by T-B6-01), so this task does not delete it; B13 does when the lab rooms move.
- Edge cases: tests use fake devices and the real router and socket (no mocks of the code under test); the 200 ms floor is asserted with a tolerance of 20 ms.
- Permissions, performance: the suite takes about 3 minutes without the 10-minute load (ESTIMATED). Migration: none.
- Modules and algorithm: the table above is the algorithm; each row is a test in its file. Data model and API contract: none new. State transitions: none. Validation: the room continues after every attack. Performance: the targets are in the capacity paragraph.

**Verification**
- Tests: the files above; `SRV` runs them (the load test only with `LOAD=1`).
- Integration: this is the security integration test. Playwright: none. Fixtures: `server/test/fixtures/hostile-*.json`.
- Acceptance: as the table. Plus: Given the load run, Then the numbers are written to `docs/MASTER_PLAN/05_ENGINEERING/results/B7-load.md` with the machine, the Node version and whether a container was used; RB-6 and RB-7 in `REALTIME_ARCHITECTURE.md` are corrected in the results note if the run contradicts them (a doc edit proposal, not made here).
- Observability: results files. Release blockers: any hostile row failing; a refusal path that differs by reason.

**Delivery**
- Definition of done: all rows pass; results written; legacy relay untouched.
- Verify commands: `npm run typecheck && npm run lint`; `npm run server:typecheck`; `cd server && node --test --test-concurrency=1 "test/hostile/**/*.test.ts"`; `cd server && LOAD=1 node --test test/load.test.ts`; `cd server/legacy && npm test` (still 39 green).
- Documentation: results files. Rollback: common rule.
- Later tasks need: nothing (a gate; T-B7-37 quotes the numbers).

---

### T-B7-35 Two-browser room acceptance (M1 steps 9 to 11)

| Field | Value |
|---|---|
| Subsystem | `e2e` |
| Phase, priority | B7, P0 |
| Dependencies | T-B7-22, 23, 26, 27, 29, 30, 31, 32, 40, 41 |
| Status | not started |
| Features, requirements | F-116, F-117, F-120, F-121, F-122; R-084 to R-088, R-092 to R-094; M1 steps 10 and 11; RA-10, RA-11, RA-18; BA-12; K-A11Y |

**Intent**
- Problem: unit tests prove the parts; the exit gate needs two real browsers and a real server doing what Amar will do with a friend.
- Target user: Amar's M1 walk, steps 9 to 11.
- User story: as Amar, I can run the room walk as a test before I run it by hand with a friend.
- Expected behaviour: one spec drives two separate browser contexts (two profiles, so two device keys) against a server process started by the support module.
- Success metric: the spec passes headless on Chromium on this Mac; axe finds no serious or critical violation on the room UI.

**Implementation**
- Existing files: `e2e/server-harness.ts` (T-B6-21, extended by T-B7-40: `spawnServer`, `connectBrowser`, `pairBrowsers`), `e2e/idb-helpers.ts` (T-B7-40), `e2e/studio-m1.spec.ts` (T-B4-22: helpers for starting a project, placing and wiring), `e2e/room.spec.ts` (old lab rooms on BroadcastChannel; stays and must still pass), `@axe-core/playwright` 4.13.0 (VERIFIED in `package.json`), `playwright.config.ts:5` (random port).
- Files: tests only. New `e2e/rooms.spec.ts`.
- Scenario (one `test.describe.serial`, contexts A = Amar, B = Mina):
  1. Start `spawnServer()` (T-B7-40; this spec kills and restarts the server, so it cannot use the process Playwright owns for `E2E_SERVER_PORT`); `connectBrowser` and `pairBrowsers` (M1 step 9, B6 flows).
  2. A opens a starter project and places an LED and a resistor; presses "Work together", picks Mina. B's menu shows the invitation; B presses Join. Both Outline panes list the same parts (M1 step 10); the saved `stateHash` from IndexedDB equals on both after autosave (`readSavedHash`).
  3. A places a button: B sees it within 2 s (R-086; `expect.poll` with a 2 s ceiling). B wires LED to resistor: A sees the wire. Both hashes equal again.
  4. Baton: B tries to type in the code dock and cannot (read-only, "Held by Amar"). B presses "Ask for the keyboard"; A grants; B types `delay(500);`; A sees it; B releases.
  5. Cursors: B moves the pointer over the board; A's overlay shows "Mina's pointer" at the matching part (label text present).
  6. Chat: B sends "hello"; A sees it; A sends 6 lines quickly and the sixth shows the rate-limit text.
  7. Offline (BA-12): the server is killed (`kill()`); both see "Room is offline, your changes are kept" within 4 s; A places two more parts; the server is restarted; both resume; the two parts reach B; hashes equal.
  8. Hostile (M1 step 11): a Node `ws` client (outside the browsers) presents A's captured `hello` bytes, a forged hello, chat with `kind: "ai"` and a 600-frame burst: all refused (4401, `text`, 4429); the browsers' room keeps working (A places a part, B sees it).
  9. Host controls: A mutes B (B's chat input shows the muted text), unmutes, locks the room, removes B (B sees the kicked notice and the editor becomes read-only; B's local copy is still in the library); A closes the room.
  10. Close and fork (RA-18): re-run steps 2 and 3 with a second room; A closes it; B presses "Keep a copy"; B's library has a new project with `provenance.origin.kind = "fork"`; A keeps the original id.
  11. Axe: `AxeBuilder` on A's page with the banner in `live`, `reconnecting` and `queueFull`-simulated states (via the test seam of the authority status store), the members list, chat, baton control, host controls and the invite dialog: zero serious or critical.
  12. Keyboard only: open the room menu, invite, pass the baton and mute using the keyboard alone.
- Algorithm and edge cases: every wait is an `expect.poll` against visible state or a server event, never `waitForTimeout`; all network goes to `localhost`; the spec sets `test.slow()`; if WebKit is installed (T-B3-21) the same spec runs in the WebKit project, and a WebKit failure is reported, not hidden (RS-21 verdict).
- Permissions, performance: the cursor and commit latency asserted loosely (2 s) because the machine may be busy (UNKNOWN load); tighter numbers are measured by T-B7-24 and T-B7-34. Migration: none.
- Data model and API contract: none. State transitions: the steps are the sequence. Validation: each step asserts visible state. Edge cases: a flaky step is fixed in the product or the test, never retried (`--retries=0`). Performance: loose ceilings only (2 s).

**Verification**
- Tests: `e2e/rooms.spec.ts`. Also run `e2e/room.spec.ts` (old) to show the lab rooms are unaffected.
- Integration: this is the user-level integration test. Playwright command: `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/rooms.spec.ts e2e/room.spec.ts` (spelled out in T-B7-17). Fixtures: none.
- Acceptance (Given/When/Then): Given two enrolled, paired browsers, When A opens a room and B joins, Then both show the same parts and equal saved hashes. Given the server is killed, When it returns, Then offline edits arrive and hashes are equal. Given a hostile client, Then every attack is refused and the honest pair keeps editing.
- Observability: Playwright trace on first retry; the spec attaches the server's stdout on failure.
- Release blockers: any step failing; any serious axe violation.

**Delivery**
- Definition of done: the spec passes three times in a row (`--repeat-each=3 --retries=0`).
- Verify commands: `npm run typecheck && npm run lint`; the Playwright command above with `--repeat-each=3 --retries=0`; `npm run check`.
- Documentation: none. Rollback: common rule.
- Later tasks need: nothing (a gate). The same steps are walked by Amar with a friend (For Amar 1).

---

### T-B7-36 Share and board acceptance in the browser

| Field | Value |
|---|---|
| Subsystem | `e2e` |
| Phase, priority | B7, P1 |
| Dependencies | T-B7-17, T-B7-28, T-B7-32, T-B7-40 |
| Status | not started |
| Features, requirements | F-089, F-140; R-091, R-095; CM-08, CM-09, CM-11, CM-20 to CM-24; BA-10 |

**Intent**
- Problem: shares and the lap board have unit and HTTP tests; the exit needs them in a browser.
- Target user: Amar and a friend, and a friend with only a link.
- User story: as Amar, I send a link, the friend runs it, I revoke it and it stops; our lap times show only to us.
- Expected behaviour: one spec for shares and one for the board, on the support module of T-B7-40.
- Success metric: both specs pass headless; with no server the fly page shows "needs a server" and no console error.

**Implementation**
- Existing files: `e2e/server-harness.ts` (T-B6-21, T-B7-40: `serverUrl()`, `newEnrolmentCode()`, `connectBrowser`, `pairBrowsers`; these specs use the config-managed server and read its data directory from `E2E_SERVER_DATA`, so they never kill it), `e2e/fly.spec.ts` (existing; T-B0-16 edits it), `e2e/studio-m1.spec.ts` (helpers), `e2e/fly-fun.spec.ts`.
- Files: tests only. New `e2e/share.spec.ts`, `e2e/buddy-board.spec.ts`; edit `e2e/fly.spec.ts` only to add the no-server board assertion.
- Scenarios:
  - `share.spec.ts`: A creates a project, opens the Share dialog, sees the warning, creates a `link` share (30 days default), copies the link text; B (a fresh anonymous context, no enrolment) opens the link, sees the project run read-only, tries to place a part and is refused with the visible reason; B presses "Make my copy" (local, no server needed); the copy is a new project in B's library with origin `fork`. A revokes; B reloads the link: the generic text; a request for the token to the API returns the same 404 bytes as a random token (CM-11). A `buddies` share: opened by a non-buddy context gives the generic text, by the buddy context works. BA-10: the spec scans `iynk.db` and `-wal` in `E2E_SERVER_DATA` for the token string: zero occurrences.
  - `buddy-board.spec.ts`: A and B paired; both opt in on the fly page; the spec submits laps through the API with each device's token (flying a real lap in a test is flaky and out of scope: the lap code path is unit-tested in T-B7-17); A's board shows A and B; a stranger context C sees "needs a server" or an empty state and never A's name (CM-21); A submits 1,000 worse laps through the API and the board still shows one row (CM-22); A removes B as a buddy and B's row disappears at the next refresh (CM-24).
  - `fly.spec.ts` addition: with no server configured the page has no console error and the board panel shows `board.needsServer`.
- Edge cases: tokens are read from the clipboard text or the dialog field and never logged; the spec scrubs them from attached traces. Permissions, performance: none. Migration: none.
- Modules and algorithm: the scenarios above. Data model, API contract, state transitions, validation, performance: none new; each scenario asserts visible state and server answers.

**Verification**
- Tests: the specs above. Integration: user-level. Playwright command: `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/share.spec.ts e2e/buddy-board.spec.ts e2e/fly.spec.ts` (spelled out in T-B7-17).
- Fixtures: none.
- Acceptance: Given a revoked link, When the friend reloads it, Then they see one generic text and the API answers the same bytes as for a random token. Given a lap board, When a stranger reads it, Then it shows nothing of A.
- Observability: the support module attaches server logs on failure. Release blockers: a token visible in a trace or log.

**Delivery**
- Definition of done: specs pass with `--repeat-each=3 --retries=0`.
- Verify commands: `npm run typecheck && npm run lint`; the Playwright command above; `npm run check`.
- Documentation: none. Rollback: common rule.
- Later tasks need: nothing (a gate).

---

### T-B7-37 Documentation and results records

| Field | Value |
|---|---|
| Subsystem | `docs` |
| Phase, priority | B7, P1 |
| Dependencies | T-B7-20, T-B7-24, T-B7-33, T-B7-34, T-B7-35 (numbers are read from their results files in `docs/MASTER_PLAN/05_ENGINEERING/results/`, a folder T-B7-20 creates) |
| Status | not started |
| Features, requirements | F-008, F-198, F-199; R-079, R-098; RA-16 (the document half) |

**Intent**
- Problem: a friend who runs the server must be told what it stores and what the operator can read; the self-hosting guide must cover rooms, shares and the board.
- Target user: Amar, his friends, anyone who runs the server.
- User story: as a friend, I know that the person who runs the server can read my room's project text, and I know how to back it up.
- Expected behaviour: `docs/ROOMS.md` explains roles, the baton, invites, what the server can read, limits, close and fork; the self-hosting guide gains the rooms, shares and board parts; the data-handling note says what the server stores.
- Success metric: every limit named in the docs equals the default in `server/src/collab-config.ts` (a script checks it).

**Implementation**
- Existing files: `docs/SELF_HOSTING.md` (T-B6-14), `docs/DATA_HANDLING.md` (T-B1-18), `docs/MASTER_PLAN/05_ENGINEERING/results/B7-*.md` (from T-B7-20, 24, 33, 34).
- Files: new `docs/ROOMS.md`; edit `docs/SELF_HOSTING.md`, `docs/DATA_HANDLING.md`. A check script is a test: `scripts/docs-limits.test.mjs` (not counted).
- Content of `docs/ROOMS.md`: what a room is; roles (owner, editor, commenter, viewer) and what each can do (the RT 6.2 table in plain words); host, baton and spectators; how to invite (buddy, link) and what the limits are (editor 1 use, viewer 5, at most 7 days and 20 uses); keyboard passing; offline behaviour (rebase, the report, "Keep a copy"); closing and forking; shares (what a link is, expiry, revoke, the token is shown once, the server stores only its hash, anyone with the link can view and copy); the lap board (buddies only, opt-in, best time only); what the server stores and what the operator can read (project text of every room it hosts, shares, scores, the audit trail; not keys, chat beyond 50 lines in memory, addresses, or run state); what is not built (voice, public boards, open code mode, shared run until B8, owner signature on shares, "Shared with me" list); the known limit that a member with edit rights can still make valid but unwelcome edits and the answer (undo my last change, checkpoints, kick). No marketing words, no em dashes.
- `docs/SELF_HOSTING.md` additions: the new environment variables (`IYNK_MAX_LIVE_ROOMS`, `IYNK_MAX_STORED_ROOMS`, `IYNK_MAX_MEMBERS`, `IYNK_MAX_SPECTATORS`, `IYNK_MAX_PROJECT_BYTES`, `IYNK_SHARE_TTL_DAYS`, `IYNK_MAX_SHARE_BYTES`, `IYNK_ALLOW_LINKS`) with defaults; the secure-context note (a bare LAN address over HTTP breaks the device key; use a domain with Caddy or Caddy `tls internal`, RT 17.3); backup of the one data directory; the 30-day room retention; what a restart does (rooms resume, runs end).
- `docs/DATA_HANDLING.md`: the server table (devices, buddy pairs, rooms with ops and checkpoints, invites as hashes, shares as snapshots with token hashes, scores, assets) and the line "the operator can read room and share contents".
- Edge cases: numbers come from the results files and are labelled with the machine; an UNKNOWN stays UNKNOWN in the text. Permissions, performance, migration: none.
- Modules and algorithm: documents and one check script. Data model, API contract, state transitions, validation, performance, migration: none.

**Verification**
- Tests: `scripts/docs-limits.test.mjs`: reads the defaults from `loadCollabLimits({})` and checks that each number the docs quote appears with the same value; a banned-word check that greps `docs/ROOMS.md`, the added `Rooms, shares and the board` section of `docs/SELF_HOSTING.md`, the added `Rooms and shares` section of `docs/DATA_HANDLING.md`, and the `rooms` object of each of the six `studio.json` files and the `board` object of each of the six `flight.json` files for "validated" (case-insensitive) and em dashes, and fails with the file and line.
- Integration: none. Playwright: none. Fixtures: none.
- Acceptance: Given the docs, When the check script runs, Then every quoted default matches the code.
- Observability: none. Release blockers: a doc that says the operator cannot read rooms.

**Delivery**
- Definition of done: docs written; check passes. RA-16 (fresh VM, HTTPS, two browsers, following only the guide) is For Amar.
- Verify commands: `npm run typecheck && npm run lint`; `node --test scripts/docs-limits.test.mjs`; the banned-word check is part of `scripts/docs-limits.test.mjs`, so no other script is needed.
- Documentation: this task is the documentation. Rollback: common rule.
- Later tasks need: nothing.

---

## 8. File ownership

Every source file a B7 task creates or edits, with the task that owns it. A file with two owners is edited by them in different groups, in group order, never at the same time. Test files, results files, `e2e` specs and test support (`server/test/helpers.ts`, `e2e/server-harness.ts`, `e2e/idb-helpers.ts`) are listed in each task and are owned by the task that names them (they are not source files for the 5-file rule). The 2026-10-27 review removed `server/src/config.ts`, `server/src/store/{port,sqlite,migrate}.ts` and the `server/src/store/migrations/` folder from this table (B6's store and `migrate()` need no edit) and added the files of T-B7-38 to T-B7-41.

| File | Task (group) |
|---|---|
| `deploy/Dockerfile.server` | T-B7-38 (g1) |
| `docs/DATA_HANDLING.md` | T-B7-37 (g10) |
| `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-21-browser-primitives/REPORT.md` | T-B7-02 (g1) |
| `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-21-browser-primitives/page.html` | T-B7-02 (g1) |
| `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-21-browser-primitives/run.mjs` | T-B7-02 (g1) |
| `docs/ROOMS.md` | T-B7-37 (g10) |
| `docs/SELF_HOSTING.md` | T-B7-37 (g10) |
| `playwright.config.ts` | T-B7-40 (g8) |
| `server/migrations/0002_rooms.sql` | T-B7-03 (g1) |
| `server/migrations/0003_shares.sql` | T-B7-09 (g2) |
| `server/migrations/0004_scores.sql` | T-B7-10 (g2) |
| `server/package.json (with its lockfile)` | T-B7-38 (g1) |
| `server/scripts/kill-loop.mjs` | T-B7-33 (g8) |
| `server/src/app.ts` | T-B7-39 (g1), T-B7-32 (g7) |
| `server/src/assets/routes.ts` | T-B7-08 (g2) |
| `server/src/assets/store.ts` | T-B7-08 (g2) |
| `server/src/buddies/visibility.ts` | T-B7-39 (g1) |
| `server/src/collab-app.ts` | T-B7-32 (g7) |
| `server/src/collab-config.ts` | T-B7-04 (g1) |
| `server/src/http/buddies.ts` | T-B7-39 (g1) |
| `server/src/http/classes.ts` | T-B7-04 (g1) |
| `server/src/http/limits.ts` | T-B7-04 (g1) |
| `server/src/http/room-invites.ts` | T-B7-25 (g6) |
| `server/src/http/rooms.ts` | T-B7-18 (g4) |
| `server/src/http/server-info.ts` | T-B7-32 (g7) |
| `server/src/main.ts` | T-B7-32 (g7) |
| `server/src/rooms/baton.ts` | T-B7-14 (g3) |
| `server/src/rooms/checkpoint.ts` | T-B7-13 (g3) |
| `server/src/rooms/commands.ts` | T-B7-14 (g3) |
| `server/src/rooms/commit.ts` | T-B7-06 (g2) |
| `server/src/rooms/core.ts` | T-B7-06 (g2) |
| `server/src/rooms/dedup.ts` | T-B7-06 (g2) |
| `server/src/rooms/host.ts` | T-B7-14 (g3) |
| `server/src/rooms/invites.ts` | T-B7-25 (g6) |
| `server/src/rooms/lifecycle.ts` | T-B7-18 (g4) |
| `server/src/rooms/op-classes.ts` | T-B7-04 (g1) |
| `server/src/rooms/permissions.ts` | T-B7-04 (g1) |
| `server/src/rooms/registry.ts` | T-B7-18 (g4) |
| `server/src/rooms/resume.ts` | T-B7-13 (g3) |
| `server/src/rooms/succession.ts` | T-B7-14 (g3) |
| `server/src/rooms/types.ts` | T-B7-06 (g2) |
| `server/src/scores/routes.ts` | T-B7-10 (g2) |
| `server/src/scores/store.ts` | T-B7-10 (g2) |
| `server/src/shares/routes.ts` | T-B7-09 (g2) |
| `server/src/shares/store.ts` | T-B7-09 (g2) |
| `server/src/shares/validate-worker.ts` | T-B7-09 (g2) |
| `server/src/store/rooms.ts` | T-B7-03 (g1) |
| `server/src/ws/auth.ts` | T-B7-12 (g2) |
| `server/src/ws/bucket.ts` | T-B7-07 (g2) |
| `server/src/ws/chat.ts` | T-B7-07 (g2) |
| `server/src/ws/codec.ts` | T-B7-21 (g5) |
| `server/src/ws/cursors.ts` | T-B7-07 (g2) |
| `server/src/ws/dispatch.ts` | T-B7-21 (g5) |
| `server/src/ws/lobby.ts` | T-B7-21 (g5) |
| `server/src/ws/nonces.ts` | T-B7-12 (g2) |
| `server/src/ws/presence.ts` | T-B7-07 (g2) |
| `server/src/ws/server.ts` | T-B7-21 (g5) |
| `server/src/ws/sessions.ts` | T-B7-12 (g2) |
| `src/collab/authority.ts` | T-B7-19 (g4) |
| `src/collab/backoff.ts` | T-B7-11 (g2) |
| `src/collab/chat.ts` | T-B7-29 (g8) |
| `src/collab/client.ts` | T-B7-15 (g3) |
| `src/collab/fork.ts` | T-B7-19 (g4) |
| `src/collab/gzip.ts` | T-B7-11 (g2) |
| `src/collab/install.ts` | T-B7-41 (g6) |
| `src/collab/join.ts` | T-B7-22 (g5) |
| `src/collab/lobby.ts` | T-B7-41 (g6) |
| `src/collab/memory-transport.ts` | T-B7-11 (g2) |
| `src/collab/presence.ts` | T-B7-23 (g5) |
| `src/collab/queue.ts` | T-B7-15 (g3) |
| `src/collab/rebase.ts` | T-B7-15 (g3) |
| `src/collab/rooms-api.ts` | T-B7-22 (g5) |
| `src/collab/share-open.ts` | T-B7-28 (g8) |
| `src/collab/share.ts` | T-B7-16 (g3) |
| `src/collab/source-batch.ts` | T-B7-27 (g6) |
| `src/collab/ws-transport.ts` | T-B7-11 (g2) |
| `src/components/dronelab/FlyWorkspace.tsx` | T-B7-17 (g3) |
| `src/components/flight/BuddyBoard.tsx` | T-B7-17 (g3) |
| `src/components/realtime/InviteDialog.tsx` | T-B7-31 (g8) |
| `src/components/studio/CodeDock.tsx` | T-B7-27 (g6) |
| `src/components/studio/ShareDialog.tsx` | T-B7-16 (g3) |
| `src/components/studio/StudioEntry.tsx` | T-B7-41 (g6), T-B7-26 (g7), T-B7-28 (g8) |
| `src/components/studio/room/BannerArea.tsx` | T-B7-26 (g7), T-B7-30 (g8) |
| `src/components/studio/room/BatonControl.tsx` | T-B7-31 (g8) |
| `src/components/studio/room/Chat.tsx` | T-B7-29 (g8) |
| `src/components/studio/room/HostControls.tsx` | T-B7-31 (g8) |
| `src/components/studio/room/Members.tsx` | T-B7-29 (g8) |
| `src/components/studio/room/RebaseReport.tsx` | T-B7-30 (g8) |
| `src/components/studio/room/RoomDock.tsx` | T-B7-26 (g7) |
| `src/components/studio/room/RoomEndedNotice.tsx` | T-B7-30 (g8) |
| `src/components/studio/room/RoomMenu.tsx` | T-B7-31 (g8) |
| `src/components/studio/room/SidePanel.tsx` | T-B7-26 (g7), T-B7-29 (g8) |
| `src/components/studio/room/Toolbar.tsx` | T-B7-26 (g7), T-B7-31 (g8) |
| `src/components/studio/wiring/authorityLink.ts` | T-B7-19 (g4) |
| `src/i18n/messages/{en,de,es,fr,hi,zh}/flight.json` | T-B7-05 (g2) |
| `src/i18n/messages/{en,de,es,fr,hi,zh}/studio.json` | T-B7-05 (g2) |
| `src/parts/package.json (only if the T-B7-38 import-closure test reaches `src/parts`)` | T-B7-38 (g1) |
| `src/project/package.json` | T-B7-38 (g1) |
| `src/project/secret-scan.ts` | T-B7-09 (g2) |
| `src/protocol/close-codes.ts` | T-B7-01 (g1) |
| `src/protocol/frames.ts` | T-B7-01 (g1) |
| `src/protocol/index.ts` | T-B7-01 (g1) |
| `src/protocol/validate.ts` | T-B7-01 (g1) |
| `src/server-client/client.ts` | T-B7-38 (g1) |
| `src/server-client/scores.ts` | T-B7-17 (g3) |
| `src/studio/code/sources.ts` | T-B7-27 (g6) |
| `src/studio/engine/controller.ts` | T-B7-23 (g5) |
| `src/studio/overlays/cursors.ts` | T-B7-23 (g5) |
| `src/studio/router.ts` | T-B7-41 (g6), T-B7-28 (g8) |
| `src/studio/stores/doc.ts` | T-B7-19 (g4) |

Files that more than one task edits, and why that is safe: `server/src/app.ts` by T-B7-39 (group 1, the `RouteDeps` field) and T-B7-32 (group 7); `src/components/studio/StudioEntry.tsx` by T-B7-41 (group 6), T-B7-26 (group 7) and T-B7-28 (group 8); `src/studio/router.ts` by T-B7-41 (group 6) and T-B7-28 (group 8); `BannerArea.tsx` by T-B7-26 (creates it, group 7) and T-B7-30 (group 8); `SidePanel.tsx` by T-B7-26 and T-B7-29; `Toolbar.tsx` by T-B7-26 and T-B7-31. T-B7-26 exists so that the three area files have one creator and then one editor each. Group 5 is disjoint: T-B7-22 owns `rooms-api.ts` and `join.ts`, T-B7-23 owns `presence.ts`, `cursors.ts` and `controller.ts`, T-B7-21 owns the four `ws` files. The overlay registration file that an earlier draft left unnamed is `src/studio/engine/controller.ts`.

## 9. Acceptance coverage

Every acceptance id the roadmap and the design files assign to this phase, and the task that proves it. "For Amar" means a person must do it (section 10).

| Id | What | Proved by |
|---|---|---|
| RA-01 | Convergence over the full vocabulary, 40 runs, three mutants caught | T-B7-20 (model client), T-B7-24 (real client) |
| RA-02 | Offline edits converge, queue at most 1,000 | T-B7-20, T-B7-24 |
| RA-03 | Dedup unit test; crash between COMMIT and ack | T-B7-06, T-B7-33 |
| RA-04 | Six resume paths | T-B7-13 |
| RA-05 | Socket authentication cases, verify time reported | T-B7-12, T-B7-34 |
| RA-06 | Restart, backup, corruption and restore | T-B7-13, T-B7-18, T-B7-25, T-B7-33 |
| RA-07 | Rebase report and "Keep a copy" | T-B7-15, T-B7-24, T-B7-30 |
| RA-08 | Capacity, 20 rooms x 8 members | T-B7-34 (macOS; the 1 vCPU, 512 MB container on his host is For Amar) |
| RA-09 | Real-network reconnect | T-B7-34 records the shaped-link number; the real network is For Amar |
| RA-10 | Client cost and code size | T-B7-24 (commit p95); the Studio first-load gzip size before and after is recorded in the T-B7-35 commit body from the keyless build; the 4x throttle number is For Amar |
| RA-11 | Presence traffic | T-B7-07, T-B7-23 |
| RA-12 | Permission matrix generated from the schema | T-B7-04 |
| RA-13 | Two-typist trial | Not built (D5, Q1); For Amar if overruled |
| RA-14, RA-15 | Run lockstep | B8 |
| RA-16 | Fresh VM guide | T-B7-37 writes the guide; the VM run is For Amar |
| RA-17 | Hostile suite | T-B7-34 |
| RA-18 | Forks and fast-forward | T-B7-13, T-B7-19, T-B7-30, T-B7-35 |
| BA-05 | Commit p99 | T-B7-34 (macOS number); Linux is For Amar |
| BA-06 | Kill -9 during ops | T-B7-33 |
| BA-07 | Reconnect on a shaped link | T-B7-34 |
| BA-08 | Hostile suite | T-B7-34 |
| BA-10 | Share token not in the database, 404 bytes equal | T-B7-09, T-B7-32, T-B7-36 |
| BA-11 | Every route has a class and a bucket | T-B7-04, T-B7-32 |
| BA-12 | Server stopped mid-session | T-B7-19, T-B7-35 (server killed through T-B7-40's `spawnServer`) |
| AR-05 | One-command setup, two browsers, room, baton | T-B7-35; the clean-VM run is For Amar |
| AR-07 | Hostile client | T-B7-34 |
| AR-08 | Crash durability with 5 clients and 10,000 ops | T-B7-33 |
| AR-10 | Store on Linux | For Amar (RC-01) |
| AR-12 | Backup under write load | T-B7-33 |
| CM-06 | Unpairing closes shared rooms and drops rows | T-B7-18, T-B7-39, T-B7-32 |
| CM-08, CM-09, CM-11 | Share create, open read-only and copy, revoke | T-B7-09, T-B7-16, T-B7-28, T-B7-36 |
| CM-10 | Tamper check by owner signature | Not built (D16, Q4) |
| CM-12, CM-13 | Direct invite; fork at close | T-B7-25, T-B7-35 |
| CM-20 to CM-24 | Board rows | T-B7-10, T-B7-17, T-B7-36 |
| R-075 | Relay authority | T-B7-12, T-B7-14, T-B7-21, T-B7-34 |
| R-076 | Invites and secrets | T-B7-25 |
| R-082 to R-085 | Transport, store, rooms, rooms on projects | T-B7-03, T-B7-11, T-B7-18, T-B7-21, T-B7-22, T-B7-41 |
| R-086 to R-090 | Edits sync, late join, offline, ordering, divergence | T-B7-06, T-B7-13, T-B7-15, T-B7-20, T-B7-24 |
| R-091 | Buddies-only board | T-B7-10, T-B7-17 |
| R-092, R-093, R-094 | Chat, host controls, baton | T-B7-07, T-B7-14, T-B7-27, T-B7-29, T-B7-31 |
| R-095 | Share by invite, file or link | T-B7-09, T-B7-16, T-B7-28 (file export is B3) |
| R-097 | Hostile suite | T-B7-34 |
| openapi `queryAssets`, `headAsset`, `putAsset`, `getAsset` | Query splits a batch into present and missing; HEAD and GET give byte-identical 404 for missing and forbidden; upload needs a matching hash | T-B7-08, T-B7-16, T-B7-22, T-B7-32 |
| openapi `getSharedAsset` | A shared project shows its images read-only; a hash outside the share is 404 | T-B7-09, T-B7-28, T-B7-36 |
| M1 steps 9 to 11 | Enrol and pair (B6), room with baton, hostile client refused | T-B7-35; Amar walks it with a friend (For Amar 1) |

R-096 (gallery and challenges) is split: the `buddies` audience of a share is built (T-B7-09, 16, 28); the gallery list and challenges are not (D11, D12).

## 10. For Amar

Work only a person can do. None of this is an agent task.

| # | Item | Why only Amar | When |
|---|---|---|---|
| 1 | Walk M1 steps 9 to 11 with a friend: enrol, pair, open a room, pass the keyboard, see a hostile client refused (the T-B7-35 spec is the dry run) | Needs a friend, a second device and judgement | The phase stop |
| 2 | Run the Linux store benchmark and the container capacity run on the host he will use (`bench-store.mjs`, `LOAD=1 node --test test/load.test.ts` in a 1 vCPU, 512 MB container) and choose `IYNK_STORE_SYNC` full or normal (RC-01, AR-10, RA-08) | Needs his host | Before relying on rooms on that host |
| 3 | Measure reconnect on his own network and on a phone, and commit cost on a 4x throttled laptop (RA-09, RA-10) | Needs his network and devices | After the phase stop |
| 4 | Follow `docs/SELF_HOSTING.md` alone on a clean VM with HTTPS, and once on a LAN with Caddy `tls internal` (RA-16, AR-05) | Needs a VM and a domain | Before inviting friends |
| 5 | Open a room on Safari and an iPad or phone, and a screen reader pass of the room UI | Needs the devices and assistive tech (extends the roadmap's For Amar item 8) | After the phase stop |
| 6 | Decide the open questions Q1 to Q8 in section 11 | His product calls | Before the phase stop |
| 7 | If Q1 is overruled and `open` code mode is wanted: run the two-typist trial RA-13 | Needs two people typing for 10 minutes | Only then |
| 8 | Read `docs/ROOMS.md` and decide if the line "the person who runs the server can read the room's project text" is acceptable to his friends | A trust call | Before inviting friends |

## 11. Spikes and open questions

Spike tasks in this phase: T-B7-02 (RS-21). Its three questions are falsifiable and each has a fail rule (section 7).

The other open research items of REALTIME 21 are not agent tasks here: RT-1 on Linux is For Amar (item 2); RT-2 (lockstep) belongs to B8; RS-20 (Yjs offline merge) stays unrun because D-013 does not require multi-user offline merge (RT 8.4).

| # | Question | Default taken | Who decides |
|---|---|---|---|
| Q1 | Build `codeMode: "open"` (two people typing at once)? | No: baton only (D5). `room.settings` refuses `open` | Amar |
| Q2 | Who may change `provenance` in a room? | Owner only (D9) | Amar |
| Q3 | Add a route that lists shares made for me ("Shared with me", F-143)? | No: a `buddies` share is a link only a buddy can open (D11) | Amar (a contract change) |
| Q4 | Add an owner signature on shares (CM-10) and a `/restore` route for corrupt rooms? | No: neither is in the contract (D16, D17) | Amar (contract changes) |
| Q5 | When a pair is removed, also close rooms that both joined through a third person's room? | No: only rooms one of them created (T-B7-18) | Amar |
| Q6 | Default uses for a commenter link | 5, like a viewer (T-B7-25) | Amar |
| Q7 | Who may create invites: owners and the host only, or any editor? | Owners and host (T-B7-25) | Amar |
| Q8 | Should B7 offer per-reader chat translation (F-117 text says so)? | No: `lang` is carried so it can be added; translation is LATER with voice (RT 10) | Amar |

## 12. Risks and release blockers

| # | Risk | Label | Mitigation in this plan |
|---|---|---|---|
| 1 | Divergence on net ops, cascades or `component.swap` that RS-09's smaller document did not cover | HYPOTHESIS | RA-01 over the full vocabulary with three mutants (T-B7-20, T-B7-24) |
| 2 | Commit cost on Linux with `synchronous=FULL` misses p99 10 ms | UNKNOWN | macOS number in T-B7-34; the Linux run is For Amar; group commit is in T-B7-06 |
| 3 | Reconnect on a home or mobile link is slower than the loopback numbers | UNKNOWN | Shaped link in T-B7-34; real network is For Amar |
| 4 | Section 3 is now written from the B2 to B6 task files, but those are plans too, so a built signature may still differ | HYPOTHESIS | Every task starts by reading the real file; a change to another B7 task's interface is reported to the orchestrator, not silently fixed |
| 5 | A B4 file shape forces a task over five files (the command registry, the overlay registration point, `authorityLink.ts`) | HYPOTHESIS, answered by reading B4 | Decided in this file: commands are registered by a function call (`registerCommand`, injected into `installCollab`, T-B7-41); the overlay point is `controller.ts` (T-B7-23); `authorityLink.ts` is a new file (T-B7-19). No task has a "stop and report" branch |
| 6 | `DecompressionStream` or key storage missing on WebKit or Firefox | UNKNOWN | RS-21 with fail rules (T-B7-02) |
| 7 | Secret scan false positives block legitimate shares | HYPOTHESIS | Free-text fields only; zero-hit test over every example and the converter corpus (T-B7-09) |
| 8 | The 40-run property test is slow | ESTIMATED | Default 5 runs in `SRV`; 40 in the exit gate via `RA01_RUNS` |
| 9 | Old lab rooms break when the old relay or its client files change | VERIFIED risk | Nothing of the old relay or `src/lib/realtime` is edited or deleted in B7; B13 does it; `e2e/room.spec.ts` runs in T-B7-35 |
| 10 | The operator can read room contents | VERIFIED design fact | Said plainly in `docs/ROOMS.md` and `docs/DATA_HANDLING.md` (T-B7-37) |

Release blockers for the phase (any one stops the phase tag): a divergence in RA-01; an acknowledged op lost or doubled in the crash tests; a hostile row failing; a refusal path that tells a stranger why; a token or invite secret in a log, table or address bar; a client-chosen `kind` or `author`; a route without a rate class; an unclassified op kind; `npm run check` red.

## 13. Exit checklist

The orchestrator runs these after the last task and writes the numbers into the phase report. Amar's OK follows. Nothing is pushed or deployed.

| # | Command or action | Expect |
|---|---|---|
| 1 | `npm run check` | green |
| 2 | `npx tsc -p tsconfig.portable.json` and `npm run server:typecheck` | no errors |
| 3 | `npm run server:test` | green (the whole `test/**/*.test.ts` glob plus the 39 legacy tests; every B7 server test is named `.test.ts`, so it is in this run) |
| 4 | `cd server && RA01_RUNS=40 node --test "test/property/**/*.test.ts"` | 40 runs, zero divergence, three mutants caught |
| 5 | `cd server && node --test --test-concurrency=1 "test/hostile/**/*.test.ts"` | every row passes |
| 6 | `cd server && KILL_RUNS=50 node --test test/crash-rooms.test.ts test/crash-ar08.test.ts test/backup-load.test.ts` | zero lost or doubled ops |
| 7 | `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/server-support.spec.ts e2e/rooms.spec.ts e2e/share.spec.ts e2e/buddy-board.spec.ts e2e/fly.spec.ts e2e/room.spec.ts --repeat-each=3 --retries=0` (KL spelled out in section 2) | green |
| 8 | `cd server/legacy && npm test` | 39 pass |
| 9 | `cd server && LOAD=1 node --test test/load.test.ts` | numbers recorded in `results/B7-load.md` |
| 10 | `node --test scripts/docs-limits.test.mjs` | every limit quoted in `docs/ROOMS.md` equals the code default; no banned word |
| 11 | Amar walks M1 steps 9 to 11 with a friend | his OK |
| 12 | After his OK: local tag `phase-B7` | rollback point |

Rollback for the phase: `git reset --hard phase-B6` on `build/v1`, or `git revert` of the B7 commits in reverse order. Both are local and Amar's call. Rooms ship only with a server, so users without one are unaffected.

## Review fixes (2026-10-27)

Sixteen review issues were checked against the B2 to B6 task files, `schemas/openapi.yaml` and the repository. All sixteen are applied. Where the fix asked for a choice, the choice is made in the text; no task keeps a "the builder stops and reports" branch.

| # | Issue | What changed | Evidence |
|---|---|---|---|
| 1 | Server tests named `.test.js`, `SRV` proved nothing | Every B7 server test and helper is `.ts`. Section 2 defines `SRV` as `npm run server:test`, `SRV1`, `SRVG` (quoted glob) and `SRVT`. The sentence about "after B5" is gone. Exit items 3 to 6 and the verify lines of every server task use the new forms. Server tasks now also run `npm run server:typecheck`, because `tsconfig.portable.json` no longer covers `server/` | B6 4.1 and 4.2 (`tasks/B6-collab-server-buddies.md` lines 88 to 104) |
| 2 | `#core/*` imports | Replaced by relative `.ts` paths (section 2, T-B7-06). New task T-B7-38 adds `src/project/package.json`, a probe test `server/test/shared-import-project.test.ts` for `src/project/{apply/index,validate,hash,limits}`, and the Dockerfile copy lines; T-B7-06 adds the three `src/protocol` files to the same probe. The "Shared code" rule is widened to `src/protocol/{frames,validate,close-codes}.ts` and the four `src/project` files | B6 F1 (line 20), T-B6-15 and T-B6-16 stubs only for `src/core` and `src/protocol`; `tasks/B2-core-document-netlist.md` line 936 (FA-01 lets `server/` import `src/project/apply`); SYSTEM 5.3 matrix row `server` |
| 3 | Migration path and numbers | `server/migrations/0002_rooms.sql`, `0003_shares.sql`, `0004_scores.sql`. `migrate.ts` is no longer edited. T-B7-32 no longer mentions "001 to 004". Ownership table fixed | T-B6-02 (`migrationsDir`, `server/migrations/NNNN_name.sql`, `migrate(db, { dir, ... })`) |
| 4 | Store API hedge | Hedge deleted. `createRoomsRepo(store: ServerStore)` uses `store.transaction` and `Tx`. `port.ts`, `sqlite.ts`, `migrate.ts` removed from Files (no gap found after reading T-B6-02: nested `transaction` joins, `Tx.run` returns `changes`, BLOB parameters are allowed). T-B7-03 has 2 source files. `server/test/helpers.ts` is extended instead of `support/app.js` | T-B6-02 signatures |
| 5 | Mounting in `main.ts`, second `createApp` | T-B7-32 keeps `createApp(config, deps, opts?)` and `allRoutes(ctx)` in `app.ts`; the test hook is `opts.hooks.afterCommit`; `main.ts` gains only the `upgrade` listener and the `loadCollabLimits` error path; `server-info.ts` carries the features. A new `server/src/collab-app.ts` holds the wiring so `app.ts` stays small. `config.ts` is not edited. T-B7-33 and T-B7-34 call the same signature | T-B6-17 |
| 6 | Closed `RouteClass` and `BucketName` | The bucket edit moved to T-B7-04 (group 1): `classes.ts` and `limits.ts` (the default table is a `Record<BucketName, Rule[]>`, so it must change in the same commit). T-B7-04 has 5 files. The "classes" in T-B7-08, 09, 10, 18, 25 are buckets (D25). T-B7-32 only registers | T-B6-07 types; `schemas/openapi.yaml:4646-4669` |
| 7 | Unnamed overlay file | `src/studio/engine/controller.ts` (T-B7-23): adds `registerOverlayProvider`. The call is made by `RoomProvider` (T-B7-26, UI layer) because `studio` may not import `collab`. Ownership table names the file; no regrouping needed | T-B4-24 (`OverlayProviders`), T-B4-25 (`Workspace.tsx` builds the graph) |
| 8 | Section 3 hedge | Section 3 rewritten from the real task files (names, `Tx`, `RouteDef`, `createApp`, `registerCommand`, `E2E_SERVER_PORT`, the IndexedDB store `identity` instead of `keys`, `Project` type, `chainStart`/`chainNext`, `forkProject`). The sentence that B2 to B6 task files do not exist is gone | B2 to B6 task files |
| 9 | Directory arguments to `node --test` | Quoted globs everywhere: `"test/property/**/*.test.ts"`, `"test/hostile/**/*.test.ts"` | Verified by the reviewer on Node 24.8.0; recorded in `SRVG` |
| 10 | Second Playwright server harness | `e2e/support/server.ts` and `idb.ts` removed. T-B7-40 extends `e2e/server-harness.ts` and adds `e2e/idb-helpers.ts`. Specs that never kill the server (share, board) use the config-managed server and `E2E_SERVER_DATA`. The room spec, which kills and restarts, calls `spawnServer()`: a free port from 40000 to 49999 chosen at call time, because `fullyParallel: true` and `--repeat-each=3` could otherwise collide. `playwright.config.ts` adds `http://localhost:*` and `ws://localhost:*` to the web entry's `IYNK_CONNECT_ORIGINS` so the fixed CSP allows it | T-B6-21; `playwright.config.ts:18`; D-B1-1 |
| 11 | Missing openapi operations | T-B7-08: `queryAssets` and `headAsset` with tests. T-B7-09: `getSharedAsset`. T-B7-28: `fetchSharedAsset` in the read-only open path. T-B7-16 and T-B7-22 call `syncAssets` (query then upload) before a share or a room. Two rows in section 9 | `schemas/openapi.yaml` lines 1212, 1247, 1385, `AssetQuery` 3846 |
| 12 | T-B7-02 path, dependency, Firefox download | Paths now start with `docs/MASTER_PLAN/08_RESEARCH_SPIKES/`. Dependency is T-B3-24. Firefox is run only if installed; `~/Library/Caches/ms-playwright` holds `chromium-1208/1248`, `chromium_headless_shell`, `ffmpeg`, `webkit-2248/2370`, so Firefox cells are INCONCLUSIVE and nothing is downloaded. T-B7-05 now depends on T-B7-02 and moved to group 2 | `ls` of the cache; T-B3 index line 95 |
| 13 | T-B7-37 verify and docs ownership | The `copy-check.mjs` line is gone; the banned-word check is in `scripts/docs-limits.test.mjs` (docs/ROOMS.md, the added sections of two guides, the `rooms` and `board` objects of the six languages). Docs are "written once, in T-B7-37". T-B7-37 depends on 20, 24, 33, 34, 35 and is group 10. T-B7-20 creates `results/` | `ls` of `05_ENGINEERING` shows no `results/` |
| 14 | `share.open` and `commands.ts` | T-B7-16 no longer claims `commands.ts`. `installCollab` (T-B7-41, `src/collab/install.ts`) calls an injected `registerCommand`; `StudioEntry.tsx` renders `ShareDialog` for the `share.open` state, tested in `StudioEntry.test.tsx`. `registerCommand` is a function call, so `commands.ts` is not edited | T-B4-02 signature |
| 15 | Oversized T-B7-22 and T-B7-32 | T-B7-22 is `rooms-api.ts` and `join.ts`. New T-B7-41 is `lobby.ts`, `install.ts`, `router.ts`, `StudioEntry.tsx`. T-B7-32 is the mount (4 files). New T-B7-40 is the e2e support. T-B7-26 and T-B7-31 got numbered sub-steps with their own tests. Groups, index, ownership table and section 9 updated (10 groups now). Every "stops and reports" branch is decided | sections 5, 6, 8 |
| 16 | Unpair hook either/or | Decided in new T-B7-39: `removeBuddy(tx, viewer, id, onRemoved?)` calls the hook inside the same transaction and returns an `after()` that the route runs after COMMIT; the hook is passed through `RouteDeps.buddyRemoval`. T-B7-18 supplies `removeSharedAccess(a, b)` (rows, in the transaction; sockets, in `after()`), T-B7-03 the two repo methods, T-B7-32 wires them. Test: a throwing hook leaves the buddy row, the member rows and the invites | T-B6-09 signatures |

Findings made while applying the fixes (not in the review list), all applied:

| Finding | Fix | Evidence |
|---|---|---|
| `src/protocol` may import `core` only, but T-B7-01 typed frames with project `Op` and `OpEnvelope` | Frames use structural `WireOp` and `WireEnvelope` (D23) | SYSTEM 5.3, line 220 |
| T-B7-01 defined `genesisChain` and `nextChain`, which T-B2-09 already ships as `chainStart` and `chainNext` | `chain.ts` removed, calls renamed (D23). T-B7-01 has 4 files | `tasks/B2-core-document-netlist.md` line 658 |
| `forkDocument` duplicated `forkProject` | `forkDocument` wraps it (D24) | `tasks/B3-core-storage-runtime-replay.md` lines 777 and 785 |
| The server has no run-time dependency in B6, but the socket needs `ws` | T-B7-38 adds `ws` 8.22.0 and the `Dockerfile.server` copy lines for `src/project` | B6 4.2 "Dependencies"; T-B6-12 Dockerfile text |
| `ServerClient` has a fixed method list and no generic request | T-B7-38 adds `fetchAuthed` and `fetchAnon` | T-B6-05 signatures |
| `collab` may not import `studio`, `studio` may not import `collab` | `installCollab` takes `registerCommand` as a parameter; `cursors.ts` reads a structural `CursorSource`; `DocStore` declares a structural `DocAccess` | SYSTEM 5.3 |
| T-B7-13 used a fixture from T-B7-20, a later group | It uses the T-B2-16 generators, as T-B7-06 does | group table |
| `authorityLink.ts` does not exist in B4 | T-B7-19 creates it | grep of B4 |
| The optional bearer of a `buddies` share has no router class | `openShare` and `getSharedAsset` are `capability` routes whose handler calls `authenticateBearer` | T-B6-07 class table |
| `room.invite.redeem` needed a counter and T-B7-25 had its own | One shared `Limiter` bucket counting attempts (D26) | T-B6-07 `Limiter` |

Issues not applied: none. One detail differs from the review text: issue 3 expected T-B7-03 to have 4 files; after issue 4 removed `port.ts` and `sqlite.ts` it has 2.

For Amar, added by this review: none. Open questions: D26 (attempts instead of failures for the invite bucket) and whether the `playwright.config.ts` wildcard connect origin for local tests is acceptable.
