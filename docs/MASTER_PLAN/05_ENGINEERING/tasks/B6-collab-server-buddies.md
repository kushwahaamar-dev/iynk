# B6 task packages: Collaboration, server, identity, buddies

Written 2026-10-27 for the build plan step. Plan only: no file in `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed, and nothing was committed. Scratch checks are under `/Users/amar/iynk-master-plan-scratch/buildplan/B6/`.

Phase: B6 in `/Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/05_ENGINEERING/IMPLEMENTATION_ROADMAP.md` (the B6 card and its 14 task rows). Depends on B1 and B2 (roadmap), and on T-B3-02 (see finding F4).
Labels: VERIFIED (I ran it or read it in this step), DOCUMENTED (a plan file says it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN. Line numbers are at HEAD `4d11dc5`. Earlier phases will shift some of them, so an agent re-greps the quoted text before it edits.

Binding inputs read for this file: `00_EXECUTIVE/DECISION_REGISTER.md` (D-013 to D-019), `03_PRODUCT/PRODUCT_REQUIREMENTS.md` (R-076 to R-083, R-097, R-098), `03_PRODUCT/COMMUNITY.md` (3.2 to 3.4, CM-01 to CM-07, CM-30, CM-31), `04_ARCHITECTURE/BACKEND_ARCHITECTURE.md` (BE 5.1, 6, 7, 9, 13, 14, 15, 16), `API_CONTRACTS.md` (4.1 to 4.3, 4.9, 5, 7), `schemas/openapi.yaml`, `RECONCILIATION.md` (RC-01, 02, 03, 14, 15, 17, 18, 19, 22, 23, 24, 30, 69), `SYSTEM_ARCHITECTURE.md` (10.3, 12.1), `ADR-0004`, `ADR-0007`, `ADR-0014`, `ADR-0106`, `ADR-0811`, `ADR-0812`, and the code named per task. Earlier phase task files (B0 to B5) do not exist yet, so ids and files of earlier phases come from the roadmap rows.

## 1. What this phase builds

A self-hostable `server/` package. One SQLite file behind a `ServerStore` port. A friend redeems an operator code, the browser makes a non-extractable P-256 key, signs a challenge, and gets an opaque 12-hour token. Two enrolled people pair with a typed code or a link and become buddies. A stranger sees nothing. A compose file, a Caddy file and `docs/SELF_HOSTING.md` let Amar run it. With the server stopped, every server control says "needs a server".

Not in this phase: rooms, shares, scores, assets, the WebSocket (all B7), AI, search and compile modules (B14, B9), Postgres (never planned), idempotency-key replay (see O-8).

## 2. Findings from this step that change the roadmap rows

| # | Finding | Label | Effect on the plan |
|---|---|---|---|
| F1 | A `#core/*` subpath import used from `server/src/*.ts` does not resolve once `server/package.json` exists. Node looks only at the nearest `package.json`; with none defining `imports` it throws `ERR_PACKAGE_IMPORT_NOT_DEFINED`, and a target of `../src/core/*.ts` throws `ERR_INVALID_PACKAGE_TARGET`. Without `server/package.json` the root map works. (scratch `imp/`, Node 24.8.0) | VERIFIED | ADR-0014 decision 5 and BE 14 cannot work as written. The server imports shared code by relative `.ts` path (`../../src/protocol/identity.ts`). Spike T-B6-15 settles the remaining question. |
| F2 | A relative import from `server/src/r.ts` to `src/core/a.ts` runs with no flag, but prints `MODULE_TYPELESS_PACKAGE_JSON` when the root `package.json` has no `"type"` (it has none, `package.json:1-4`). A stub `{"type":"module"}` in the shared folder removes the warning. | VERIFIED | BA-02 says no warning but SQLite's. T-B6-15 adds the stubs and proves `next build` and vitest still pass. |
| F3 | Root `tsconfig.json:31-37` includes `**/*.ts`, so new `server/**/*.ts` files would be typechecked with the app options (no `allowImportingTsExtensions`) and fail. `vitest.config.mts:11` includes only `src/**`, `figures/**`, `scripts/**`, so server tests are not picked up by vitest (good: they use `node:test`, ADR-0014 decision 7). | VERIFIED | T-B6-01a excludes `server` from the root tsconfig; T-B6-01b adds `server:typecheck` and `server:test` scripts to `npm run check`. |
| F4 | ADR-0106 puts the device key in IndexedDB store `identity` and the profile in store `server`, inside the database `iynk` that T-B3-02 creates (`src/local/db.ts`). The roadmap lists B6 dependencies as B0, B1, B2 only. | DOCUMENTED | T-B6-11 and T-B6-10 (the UI tasks) depend on T-B3-02, because `ServerPanel` and `BuddiesPage` pass its opener into the injected `idbKeyStore(open)` and `idbProfileStore(open)`. `src/server-client` itself never imports `src/local` (SYSTEM 5.3). If Amar moves B6 before B3, open question O-1 applies. |
| F5 | `node:sqlite` in Node 24.8.0: `DatabaseSync`, `backup` and `VACUUM INTO` all work; `PRAGMA synchronous=FULL` reads back as `2`; blobs round-trip as `Uint8Array`. It prints one `ExperimentalWarning`. | VERIFIED | Matches ADR-0004. The one warning is the known one. |
| F6 | WebCrypto ECDSA P-256: `exportKey("spki")` is 91 bytes (122 base64url characters, matching the openapi `publicKey` pattern); `sign` returns 64 bytes; `node:crypto` verifies it with `dsaEncoding: "ieee-p1363"`; `structuredClone` of a non-extractable private key works (what IndexedDB needs). | VERIFIED | Removes the build-time doubt in REALTIME 4.3 and API 5.2 rule 1 for Node 24.8. |
| F7 | The openapi `IdentityRegister.enrollmentCode` pattern matches only the 12-character typed form, but API 5.1 says the server accepts the 128-bit link form in the same field. | VERIFIED | Server accepts both. Doc fix listed in O-4. |
| F8 | BE 6.4 `buddies` has no alias column, `devices` has no colour, locale, online or deletion fields, `sessions` has no `last_used_at` or `client`, but openapi `Buddy`, `Identity` and `Session` need them. | VERIFIED | Migration `0001_identity.sql` adds them (T-B6-02). |
| F9 | The legacy relay is referenced by `src/lib/realtime/relay.integration.test.ts:2,15-19` (`RELAY_DIR`, comment, messages), `src/lib/realtime/protocol.ts:2` (comment), `deploy/realtime/compose.yaml:8` (`context: ../../server/realtime`), `deploy/realtime/Dockerfile:1-2`, and `README.md:92,122,145`. `scripts/realtime-deploy.sh` is deleted by T-B0-20. | VERIFIED | T-B6-01a fixes the test path and the two comments (`relay.integration.test.ts:2`, `protocol.ts:2`). T-B6-12 replaces the deploy files. T-B6-20 fixes README paths. Until T-B6-12 the old compose build context is stale (no proof command builds it). |
| F10 | `qrcode` 1.5.4 is already a dependency and `src/components/realtime/InviteDialog.tsx:22` exports `QrCode({ text, label, t })`. | VERIFIED | PairDialog reuses it. B13 must move it before deleting `InviteDialog.tsx` (listed in each "later tasks need" row that matters). |
| F11 | Docker 2.40 compose is installed on this machine (`docker compose version`). | VERIFIED | `docker compose config` is a runnable proof. Building images stays optional. |

### Differences from the roadmap B6 table

| Roadmap | This file | Why |
|---|---|---|
| 14 tasks, T-B6-01 to T-B6-14 | 25 tasks. The 14 ids keep their meaning. T-B6-15 to T-B6-23 are added. T-B6-01 is split into 01a and 01b, and T-B6-19 into 19a and 19b (review fixes 7 and 9). | The 5-file rule: T-B6-01, 04 and 13 would exceed it; deletion, sweep, app wiring and e2e harness had no owner. |
| T-B6-01 includes `main.ts`, `server-info.ts`, health | These move to T-B6-17 | `main.ts` needs the router (07) and logger (13). |
| T-B6-04 includes `http/auth.ts` | Moves to T-B6-18 | Router and app wiring must exist first. |
| T-B6-13 includes the identity hostile tests | Hostile tests are T-B6-22 (tests only) | The log module is needed early; the tests need the auth routes. |
| T-B6-10 before T-B6-11 | T-B6-11 first | The UI needs the stored server address and the "needs a server" states. |
| `server/src/store/schema.sql` | `server/migrations/0001_identity.sql` | BE 7.3 fixes the path and the forward-only rule. |
| Server tests `*.test.js` | `*.test.ts` run by `node --test` | They are typechecked by `server/tsconfig.json`. Same runner. |
| Dependency `ws` in `server/package.json` | No runtime dependency in B6; B7 adds `ws` | B6 opens no socket. |
| `#core/*` imports | Relative `.ts` imports | F1. |
| `PORT` covers `server/` (T-B2-01 puts `server` in `tsconfig.portable.json`) | `server` leaves the portable include; `SRVT` types it | The portable config has `types: []` and no DOM, so `node:` imports cannot type-check there (T-B6-01b). |
| No deletion grace setting | `IYNK_DELETION_GRACE_HOURS` (default 24, `0` = now), PROPOSAL | openapi and API 5.4 say "the operator's grace" but `ServerConfig` and BE 13.1 have no variable (O-4). |
| `enrol` link `https://host/#enrol=<code>` | `${origin}/together#enrol=<code>` | `/together` is the only path with a hash handler and `next.config.ts:54` redirects it to the language (VERIFIED). |

## 3. Task index

| ID | Title | Group | Depends on | Source files | Priority |
|---|---|---|---|---|---|
| T-B6-01a | Legacy relay moved to `server/legacy`, root tsconfig exclude | G1 | B1, B2 | 2 (plus 1 test file and a directory move) | P0 |
| T-B6-01b | Server package, config and `check-config` refusals | G1 | 01a | 5 | P0 |
| T-B6-15 | Spike: shared TypeScript imports from the server | G2 | 01b | 2 (1 JSON stub, 1 ADR note) | P0 |
| T-B6-16 | Shared identity module (ids, codes, signing input, names) and `src/protocol` stub | G3 | B2 (T-B2-03), 15 | 2 | P0 |
| T-B6-02 | `ServerStore` port, `node:sqlite` adapter, migrations, backup | G2 | 01b | 5 | P0 |
| T-B6-13 | Structured log with redaction | G2 | 01b | 1 | P0 |
| T-B6-07 | Router, route classes, limiter, CORS, error envelope | G2 | 01b | 4 | P0 |
| T-B6-03 | Store durability harness (kill -9) | G3 | 02 | 1 | P1 |
| T-B6-04 | Identity core: enrolment codes, challenges, tokens | G3b | 02, 16, 15 | 4 | P0 |
| T-B6-17 | App assembly, `main.ts`, `GET /v1/server`, health | G3 | 01b, 02, 07, 13, 15, T-B2-09 | 4 | P0 |
| T-B6-05 | Browser side: device key, sign-in, client | G3b | 16, T-B1-11 | 5 | P0 |
| T-B6-19a | Strings for the Buddies page (`buddies.*`), six `together.json` | G3 | B1, T-B0-19 | 1 (six copies of one file) | P0 |
| T-B6-19b | Strings for the server panel (`server.*`), six `common.json` | G3 | B1, T-B0-19 | 1 (six copies of one file) | P0 |
| T-B6-18 | Auth and identity routes | G4 | 04, 17 | 3 | P0 |
| T-B6-06 | Operator CLI | G4 | 04, 02, 13 | 3 | P0 |
| T-B6-11 | Server settings, probe states, Leave server | G4 | 05, 19b, T-B3-02, B1 (T-B1-11) | 5 | P0 |
| T-B6-08 | Pairing | G5 | 18, 16 | 4 | P0 |
| T-B6-21 | Playwright server harness | G5 | 06, 17, 11 | 3 | P0 |
| T-B6-22 | Identity hostile suite (tests only) | G5 | 18, 13 | 0 | P0 |
| T-B6-12 | Compose, Caddy, Next standalone | G5 | 17, 06, 20 | 5 | P0 |
| T-B6-20 | Deploy extras: `.dockerignore`, `deploy/.env.example`, README paths | G3 | 01a | 3 | P1 |
| T-B6-09 | Visibility: buddy data only to buddies; remove | G6 | 08 | 2 | P0 |
| T-B6-23 | Sweep and identity deletion (Leave server on the server) | G6 | 18, 08 | 5 | P0 |
| T-B6-10 | Buddies page | G7 | 11, 19a, 21, 09, T-B3-02 | 5 | P0 |
| T-B6-14 | Drills and `docs/SELF_HOSTING.md` | G8 | all server tasks, 12, 20 | 4 | P0 |

## 4. Conventions every B6 task obeys

### 4.1 Proof shorthand

| Name | Expands to |
|---|---|
| `TL` | `npm run typecheck && npm run lint` (roadmap 2.3). |
| `V <path>` | `npx vitest run <path>`. |
| `E <spec>` | `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= NEXT_PUBLIC_REALTIME_URL= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL= NEXT_DIST_DIR=.next-build npx playwright test <spec>` (roadmap `KL` and `E`). |
| `SRVT` | `npm run server:typecheck` (added by T-B6-01b; runs `tsc -p server/tsconfig.json`). It types `server/` with `types ["node"]` and also reads the `src/core` and `src/protocol` files the server imports. |
| `SRV` | `npm run server:test` (added by T-B6-01b; runs `node --test --test-concurrency=1 "test/**/*.test.ts"` in `server/`, then the 39 legacy tests in `server/legacy/`). |
| `SRV1 <file>` | `cd server && node --test test/<file>` for one server test file. |
| `PORT` | `npx tsc -p tsconfig.portable.json` (created by T-B2-01). After T-B6-01b its include no longer lists `server`: `PORT` proves the portable folders only (`src/core`, `src/protocol`, ...) and `SRVT` proves `server/`. |
| `GATE` | `npm run check` (root script; after T-B6-01b it also runs `server:typecheck` and `server:test`). |

### 4.2 Server code rules

| Rule | Detail |
|---|---|
| Runtime | `node server/src/main.ts` on Node 24.x, no flag, no build (ADR-0014). Erasable syntax only: no `enum`, `namespace` or parameter properties (`erasableSyntaxOnly`). `import type` for types. Relative imports end in `.ts`. |
| Shared code | Only `src/core/*` and `src/protocol/identity.ts`, by relative path (F1). `server/` never uses `@/`. |
| Browser side | `src/server-client` imports only `core` and `protocol` (SYSTEM 5.3 matrix row `server-client`, enforced by the T-B2-01 architecture test). It never imports `src/local`. The IndexedDB opener is injected by the UI (`BuddiesPage`, `ServerPanel`), which may import `local`. |
| Transactions | `ServerStore.read` is a read-only transaction: a write inside it throws. Anything that writes uses `transaction` (`BEGIN IMMEDIATE`). Authentication reads in `read`; the `last_used_at` touch is a separate `transaction` (T-B6-04, T-B6-18). |
| Dependencies | None at run time. Dev: `@types/node@24.19.2`, `typescript@5.9.3` (as `server/realtime/package.json`). |
| Time, ids, randomness | Injected through `Deps` (`Clock`, `Ids`, `Rng`, `Sleep`) defined in T-B6-02. No test waits on wall-clock time. |
| Tests | `node:test`, file `server/test/<name>.test.ts`, in-memory database (`:memory:`) per test unless the test needs a file. Ephemeral ports from 40000 to 49999 skipping 43117 (`server/test/helpers.ts`, T-B6-02). |
| Error body | `{ "error": { "code", "message", "requestId", "details"? } }`, codes from API 4.2. A credential failure is always `401 unauthorized`, fixed message, no `details`, header `WWW-Authenticate: Bearer realm="iynk"`. |
| Secrets in storage | Only SHA-256 hashes (32-byte blobs) of random values; the value is shown once. |
| Timestamps | Integer Unix milliseconds in SQLite; ISO UTC with milliseconds and `Z` in JSON. |
| i18n | A copy change updates all six languages in the same commit (K-I18N). Plain words, no em dashes. |

### 4.3 Shared contract tables

Every task below points to these instead of repeating them.

**Route table for B6** (class per BE 5.1; bucket names API 4.3; `public.read` is 120 per minute per address from API 4.3 because BE 5.1 says 60 and API owns bucket names, R4):

| Route | Operation | Class | Bucket | Task |
|---|---|---|---|---|
| `GET /v1/server` | getServerInfo | public | public.read | 17 |
| `GET /v1/healthz`, `GET /healthz` | getHealth | public | public.read | 17 |
| `GET /v1/readyz`, `GET /readyz` | getReadiness | public | public.read | 17 |
| `POST /v1/auth/challenges` | createChallenge | public | auth.challenge | 18 |
| `POST /v1/identities` | registerIdentity | capability | identity.register | 18 |
| `POST /v1/auth/tokens` | createAccessToken | public | auth.token | 18 |
| `DELETE /v1/auth/tokens/current` | revokeCurrentToken | device | write | 18 |
| `GET /v1/auth/sessions` | listSessions | device | read | 18 |
| `DELETE /v1/auth/sessions/{sessionId}` | revokeSession | device | write | 18 |
| `GET /v1/identities/me` | getMyIdentity | device | read | 18 |
| `PATCH /v1/identities/me` | updateMyIdentity | device | write | 18 |
| `POST /v1/identities/me/deletion` | requestDeletion | device | write | 23 |
| `DELETE /v1/identities/me/deletion` | cancelDeletion | device | write | 23 |
| `POST /v1/pairings` | createPairing | device | pairing.create | 08 |
| `GET /v1/pairings` | listPairings | device | read | 08 |
| `DELETE /v1/pairings/{pairingId}` | revokePairing | device | write | 08 |
| `POST /v1/pairings/peek` | peekPairing | capability | pairing.guess | 08 |
| `POST /v1/pairings/redeem` | redeemPairing | device | pairing.guess | 08 |
| `GET /v1/buddies` | listBuddies | device | read | 08 |
| `GET /v1/buddies/{identityId}` | getBuddy | device | read | 09 |
| `PATCH /v1/buddies/{identityId}` | updateBuddy | device | write | 09 |
| `DELETE /v1/buddies/{identityId}` | removeBuddy | device | write | 09 |

`POST /v1/pairings/peek` is class capability in BE 5.1 and `Auth none` in API 7; peek therefore needs no token, and a stranger holding the token or code can peek. Redeem needs a token (a pairing never enrols, RC-14).

**Rate buckets** (key = `dev:<deviceId>` when authenticated, else address; IPv6 reduced to /64, IPv4-mapped IPv6 keyed as IPv4; API 4.3):

| Bucket | Limit |
|---|---|
| `public.read` | 120 per minute per address |
| `auth.challenge` | 20 per minute per address |
| `auth.token` | 20 per minute per address |
| `auth.token.identity` | 5 failures per minute per identity (key `id:<identityId>`); a separate bucket because one bucket has one rule set (review fix 15) |
| `identity.register` | 5 per minute per address |
| `pairing.create` | 20 per hour per device |
| `pairing.guess` | 10 per minute and 100 per hour per address; 5 wrong secrets per typed code |
| `read`, `write` | 300 and 120 per minute per device |

**Limits reported by `GET /v1/server`:** `documentBytes` 5242880, `assetBytes` 16777216, `peersPerRoom` 8, `buddiesPerIdentity` 64. Identities per server 100 (`IYNK_MAX_IDENTITIES`, PROPOSAL, see O-6). Open pairings per identity 20. Sessions per device 20.

**Tables after migration 0001** (names from BE 6.4; additions marked +, F8):

| Table | Columns |
|---|---|
| `schema_migrations` | `version INTEGER PRIMARY KEY`, `name TEXT NOT NULL`, `checksum BLOB NOT NULL`, `applied_at INTEGER NOT NULL` |
| `devices` | `id TEXT PK`, `identity_id TEXT NOT NULL UNIQUE`, `public_key BLOB NOT NULL`, `thumbprint TEXT NOT NULL UNIQUE`, `name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 24)`, `server_role TEXT NOT NULL CHECK IN ('owner','member')`, `created_at`, `last_seen_at`, `revoked_at`, + `color TEXT`, + `locale TEXT NOT NULL DEFAULT 'en'`, + `show_online INTEGER NOT NULL DEFAULT 1`, + `show_activity INTEGER NOT NULL DEFAULT 0`, + `deletion_requested_at INTEGER`, + `deletion_at INTEGER` |
| `sessions` | `id TEXT PK` (`ses_`+16 base32), `device_id TEXT NOT NULL REFERENCES devices ON DELETE CASCADE`, `token_hash BLOB NOT NULL UNIQUE`, `created_at`, `expires_at`, `revoked_at`, + `last_used_at INTEGER NOT NULL`, + `client TEXT` |
| `enrollment_codes` | `id TEXT PK`, `secret_hash BLOB NOT NULL`, `typed_hash BLOB NOT NULL UNIQUE`, `expires_at`, `used_by TEXT REFERENCES devices(id) ON DELETE SET NULL`, `used_at`, `revoked_at`, + `created_at INTEGER NOT NULL` |
| `pairings` | `id TEXT PK` (`pair_`+base32), `creator REFERENCES devices ON DELETE CASCADE`, `token_hash BLOB UNIQUE`, `channel TEXT UNIQUE`, `code_hash BLOB UNIQUE`, `label TEXT`, `grant_project TEXT`, `grant_role TEXT`, `expires_at`, `code_expires_at INTEGER` (nullable: NULL means the code is deleted), `attempts INTEGER NOT NULL DEFAULT 0`, `used_at`, `revoked_at`, `used_by TEXT REFERENCES devices(id) ON DELETE SET NULL`, `created_at INTEGER NOT NULL` |
| `buddies` | `a`, `b` (both `REFERENCES devices ON DELETE CASCADE`), `since INTEGER NOT NULL`, + `alias_a TEXT`, + `alias_b TEXT` (a's name for b, b's name for a), `PRIMARY KEY(a,b)`, `CHECK(a < b)` |

`used_by` on both tables is `ON DELETE SET NULL`, not the BE 6.4 line 270 default (no action): with `foreign_keys=ON` a plain reference would make `purgeDue` fail with `FOREIGN KEY constraint failed` for every device that redeemed a code or a pairing (review fix 3, VERIFIED by reading BE 6.4:270). The `used_at` column keeps the fact that the code was used.

**Deletion contract** (openapi `DeletionRequest`, `DeletionStatus`; VERIFIED `schemas/openapi.yaml:3335-3358`): request body `{ "confirm": "delete <displayName>" }` (one required field, `additionalProperties: false`); response 202 `{ "status": "scheduled", "requestedAt", "effectiveAt" }`. The grace is not in the body: it is `config.deletionGraceHours` (`IYNK_DELETION_GRACE_HOURS`, default 24, `0` means now; PROPOSAL, O-4). While scheduled the owner can still sign in and cancel (openapi, API 9).

The `grant_*` columns stay empty in B6 (room grants are B7). `room_invites` is created by a B7 migration.

## 5. Task packages

### T-B6-01a Legacy relay moved to `server/legacy`

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-01a, Server (BE-1), B6 |
| Priority | P0 |
| Dependencies | B1, B2 |
| Status | not started |
| **INTENT** | |
| Problem | The old relay sits at `server/realtime` and would collide with the new `server/` package (F9). Root `tsconfig.json:31-37` includes `**/*.ts`, so new server files would be typechecked with the app options (F3). Three places name the old path: `relay.integration.test.ts` (lines 2, 15, 17, 19) and `protocol.ts:2`. |
| Target user | Every later server task. |
| User story | As a maintainer, I move the relay once, with its history and its 39 tests intact. |
| Expected behaviour | `server/legacy/` holds the old relay, untouched. The legacy tests pass from the new place. The root typecheck ignores `server/`. No file under `src/` names `server/realtime`. |
| Success metric | Legacy tests 39 of 39; `V src/lib/realtime` runs the integration test (not skipped); root `npm run typecheck` green; `grep -rn "server/realtime" src` prints nothing. |
| **IMPLEMENTATION** | |
| Existing files changed (2 source files and 1 test file) | `tsconfig.json:39-43` (`exclude`: add `"server"`); `src/lib/realtime/relay.integration.test.ts` (a test file, counts 0): `:2` (comment), `:15` (`RELAY_DIR` becomes `server/legacy`), `:17` and `:19` (message strings); `src/lib/realtime/protocol.ts:2` (comment: `server/realtime` becomes `server/legacy`); nothing else. The `git mv server/realtime server/legacy` moves `src/`, `test/`, `package.json`, `package-lock.json`, `server.js`, `tsconfig.json`, `.dockerignore`, `.gitignore`; the untracked `node_modules` moves with it. A move and a deletion count 0 files (roadmap 2.2). Nothing inside legacy changes. Count: `tsconfig.json` 1, `protocol.ts` 1 = 2 source files plus one test file. |
| New files | None. |
| Modules, data model, schemas, API | None. |
| Algorithm | 1. `git mv server/realtime server/legacy`. 2. Fix the four strings in the test and the comment in `protocol.ts`. 3. Add `"server"` to the root `exclude`. 4. Re-run the grep below. |
| Validation, errors | The move must not leave `server/realtime`. If `node_modules` does not move (untracked), run `npm ci` in `server/legacy`. |
| Edge cases | A reader of Phase gate row 16 sees the same grep this task runs. `scripts/realtime-deploy.sh` is already deleted by T-B0-20, so no script needs the old path. `deploy/realtime/*` still names the old path until T-B6-12 deletes it; row 16 greps `deploy` at the gate, not here. |
| Permissions, performance, migration | None. `git mv` keeps history. |
| **VERIFICATION** | |
| Unit tests | None new. |
| Integration tests | `npm --prefix server/legacy test` prints 39 passing. `src/lib/realtime/relay.integration.test.ts` runs, not skipped, under `V src/lib/realtime`. |
| Playwright, fixtures | None. |
| Acceptance (G/W/T) | Given the move, when `grep -rn "server/realtime" src` runs, then it prints nothing. Given the exclude, when `npm run typecheck` runs, then it does not read `server/`. |
| Observability | None. |
| Release blockers | Legacy test count below 39; the integration test skipped; a `server/realtime` string left in `src`. |
| **DELIVERY** | |
| Definition of done | The four rows above; the commit message is `B6 T-B6-01a: ...`. |
| Verify commands | `TL`; `npm --prefix server/legacy test` (39); `V src/lib/realtime`; `grep -rn "server/realtime" src` (empty). |
| Documentation | None (README is T-B6-20). |
| Rollback | `git revert` the commit. The move reverses. |
| Later tasks need | `server/legacy/`; the root `exclude`. |

### T-B6-01b Server package, config and `check-config` refusals

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-01b, Server (BE-1), B6 |
| Priority | P0 |
| Dependencies | T-B6-01a; B2 (`tsconfig.portable.json` from T-B2-01 exists) |
| Status | not started |
| **INTENT** | |
| Problem | There is no `server/` package. The server must refuse unsafe settings instead of running open (R-078, BA-01). |
| Target user | The self-hoster (Amar); a contributor who runs `npm run check`. |
| User story | As Amar, I start the server with a bad setting and read one line saying what to fix. |
| Expected behaviour | `loadConfig(env)` returns a typed config or throws one `ConfigError` listing every problem. `npm run check` also typechecks and tests `server/` and the legacy relay. |
| Success metric | 5 of the 6 BA-01 refusals here (the sixth, a newer database, is T-B6-02); `npm run server:typecheck` and `server:test` pass; root `npm run typecheck` and `PORT` still green. |
| **IMPLEMENTATION** | |
| Existing files changed (2 source files) | `package.json:19-23` (scripts: add `server:typecheck` = `tsc -p server/tsconfig.json`, `server:test` = `npm --prefix server test && npm --prefix server/legacy test`, and append both to `check` at line 23; they live here, not in T-B6-01a, because a script that points at a missing `server/tsconfig.json` would break `check` between the two commits); `tsconfig.portable.json` (created by T-B2-01: remove `server` from `include`, see the portable decision below). |
| New files (3 source files plus the lockfile) | `server/package.json` (name `iynk-server`, `"type":"module"`, `engines.node ">=24"`, `bin.iynk-server: "./bin/iynk-server.ts"`, scripts `test`, `typecheck`, `start`) with `server/package-lock.json` (count 1 together, roadmap 2.2), `server/tsconfig.json`, `server/src/config.ts`. Test: `server/test/config.test.ts`. Total source files: `package.json` 1, `tsconfig.portable.json` 1, `server/package.json`+lock 1, `server/tsconfig.json` 1, `config.ts` 1 = 5. |
| Portable decision | `tsconfig.portable.json` has `types: []` and no DOM, so a `node:` import in `server/` cannot type-check there. Decision: `server` leaves the portable `include`. The server is a Node program and is typechecked by `SRVT` (`types ["node"]`). The shared folders it imports (`src/core`, `src/protocol`) stay in the portable include and are also seen by `SRVT` through the relative imports, so a Node import in them is caught twice. T-B2-01's architecture test still globs `server/**/*.ts` for import-matrix rules; that does not depend on this config. The `PORT` shorthand in 4.1 follows this decision and means "the portable folders only". |
| Modules and signatures | `export type ServerConfig = { dataDir: string; publicUrl: URL; audience: string; host: string; port: number; allowedOrigins: readonly string[]; trustProxy: number; allowDirect: boolean; enrol: "code" \| "closed"; tokenTtlMs: number; storeSync: "full" \| "normal"; logLevel: "debug"\|"info"\|"warn"\|"error"; metricsAddr: string; allowRoot: boolean; maxIdentities: number; deletionGraceHours: number; serverName: string; minClient: string }`. `export class ConfigError extends Error { readonly problems: readonly string[] }`. `export function loadConfig(env: Record<string, string \| undefined>, probe?: FsProbe): ServerConfig`. `export type FsProbe = { statMode(path: string): number \| null; isWritable(path: string): boolean; uid(): number }` (default uses `node:fs` and `process.getuid`; tests pass a fake). `export function checkConfig(env, probe?): string[]` (all problems, empty when fine). `server/tsconfig.json`: `module nodenext`, `moduleResolution nodenext`, `target es2023`, `lib ["es2023"]`, `types ["node"]`, `strict`, `noUncheckedIndexedAccess`, `noEmit`, `allowImportingTsExtensions`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `include ["src","bin","test","scripts"]`, `exclude ["legacy"]`. |
| Data model | None. |
| Input schema | Environment: `IYNK_DATA_DIR` (default `./data`), `IYNK_PUBLIC_URL` (required, `http`/`https` URL, no path, no credentials), `IYNK_HOST` (`127.0.0.1`), `IYNK_PORT` (`8787`, 1 to 65535), `IYNK_ALLOWED_ORIGINS` (required, comma list of exact `scheme://host[:port]`), `IYNK_TRUST_PROXY` (`0`, integer 0 to 8), `IYNK_ALLOW_DIRECT` (`0`), `IYNK_ENROL` (`code` or `closed`), `IYNK_TOKEN_TTL_HOURS` (`12`, 1 to 720), `IYNK_STORE_SYNC` (`full` or `normal`), `IYNK_LOG_LEVEL`, `IYNK_METRICS_ADDR`, `IYNK_ALLOW_ROOT` (`0`), `IYNK_MAX_IDENTITIES` (`100`), `IYNK_DELETION_GRACE_HOURS` (`24`, integer 0 to 720, `0` deletes at once; PROPOSAL name, API 5.4 and openapi `requestDeletion` say "the operator's grace" but BE 13.1 has no variable; add it to BE 13.1 through O-4), `IYNK_SERVER_NAME` (`iynk`, at most 60 characters), `IYNK_MIN_CLIENT` (`0.0.0`). All other BE 13.1 names (`IYNK_MAX_LIVE_ROOMS` and the rest) are accepted and ignored in B6 so a later phase adds no refusal. |
| Output schema | `ServerConfig` above. |
| API contracts | None. |
| Algorithm | Collect every problem, then throw once. Refusals (BA-01): (1) any `*` in `IYNK_ALLOWED_ORIGINS`, or an entry that is not an exact origin, or an empty list; (2) data dir exists and is not writable; (3) data dir mode has any group or other bit (`mode & 0o077`); (4) running as uid 0 without `IYNK_ALLOW_ROOT=1`; (5) a removed variable present: `IYNK_SECRET`, `IYNK_SERVER_TOKEN`, `LOG_LEVEL`, `TRUST_PROXY`, `MAX_ROOMS`, `MAX_CONNECTIONS`, `MAX_CONNECTIONS_PER_IP`, any `REALTIME_*`; (6) newer database: T-B6-02. Also refused: a non-loopback `IYNK_HOST` without `IYNK_ALLOWED_ORIGINS` and without (`IYNK_TRUST_PROXY` > 0 or `IYNK_ALLOW_DIRECT=1`) (BE 13.1); bare `PORT` and `HOST` are not refused (PROPOSAL: PaaS hosts set them). `audience` = `publicUrl.hostname`. |
| State transitions | None. |
| Validation rules | As Algorithm. Each message is one line: `IYNK_ALLOWED_ORIGINS: "*" is not allowed; list exact origins like https://iynk.example.` |
| Error conditions | `ConfigError` with `problems`. Exit code 2 is the CLI's job (T-B6-06). |
| Edge cases | Data dir missing (not an error: `init` creates it). `IYNK_PORT=0` (refused). Trailing slash on an origin (refused, message names the fix). Origin with a path (refused). IPv6 host literal. Case differences in scheme and host (normalised to lower case). `IYNK_DELETION_GRACE_HOURS=-1` or `721` (refused). |
| Permissions | Mode check only reads `stat`. |
| Performance | Runs once at start. |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `server/test/config.test.ts`: defaults (including `deletionGraceHours` 24); each of the five refusals alone; all five together list five problems; a good config passes; each removed variable is named in its message; `IYNK_TRUST_PROXY=9` refused; non-loopback host rules (3 cases); origin normalisation; grace 0 accepted, grace -1 refused. |
| Integration tests | `npm run server:test` runs the server tests and then the legacy 39. |
| Playwright | None. |
| Fixtures | `FsProbe` fakes in the test file. |
| Acceptance (G/W/T) | Given `IYNK_ALLOWED_ORIGINS=*`, when `loadConfig` runs, then it throws and the message names the variable. Given a data directory with mode 0755, when `loadConfig` runs, then it throws and says to run `chmod 700`. Given a good environment, when it runs, then it returns a config whose `audience` is the host of the public URL. |
| Observability | None yet. |
| Release blockers | A refusal that passes silently; root typecheck failing on `server/`; `PORT` failing. |
| **DELIVERY** | |
| Definition of done | All rows above; `npm run server:typecheck` and `npm run server:test` exist and pass; the commit message is `B6 T-B6-01b: ...` and its body states the portable decision. |
| Verify commands | `TL`; `SRVT`; `SRV` (config tests plus legacy 39); `PORT` (green with `server` removed from its include). |
| Documentation | None. |
| Rollback | `git revert` the commit. |
| Later tasks need | `loadConfig`, `ServerConfig` (with `deletionGraceHours`), `server/package.json` scripts, `server/tsconfig.json`, the `FsProbe` seam, the portable decision (no `PORT` run covers `server/`; use `SRVT`). |

### T-B6-15 Spike: shared TypeScript imports from the server

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-15, Build toolchain (spike), B6 |
| Priority | P0 (blocks T-B6-04) |
| Dependencies | T-B6-01b; T-B2-01 (portable toolchain and Turbopack proof); T-B2-03 (`src/core/sha256.ts`) |
| Status | not started |
| **INTENT** | |
| Problem | F1 and F2: the planned `#core/*` import cannot work, and relative imports print a module-type warning. BA-02 wants the same `src/core` files to build in the web app and run in the server with no warning but SQLite's. |
| Target user | Every later server task. |
| User story | As an agent, I import `../../src/core/sha256.ts` from the server and it just runs. |
| Expected behaviour | A recorded PASS or FAIL with the chosen import form. |
| Success metric | Falsifiable question: after adding `{"type":"module"}` to `src/core/package.json`, does `node server/test/fixtures/import-core.ts`, which imports only `../../../src/core/sha256.ts`, run with empty stderr on Node 24.8.0 AND does `BUILD` still pass AND does `V src` still pass? (The `src/protocol` stub and the proof that `src/protocol/identity.ts` runs under plain `node` belong to T-B6-16: that file does not exist yet, and a directory import such as `../../src/protocol/` is not valid ESM.) Exit condition PASS = all three yes. If no: try root `package.json` `"type":"module"` and repeat the same three checks. If that also fails (the same three checks with the root file): switch to the bundled server build in BE 14 (esbuild, one new dev dependency, output `server/dist/server.mjs`), record it, and tell the orchestrator because T-B6-12's Dockerfile and `package.json` change. Time box: one day. |
| **IMPLEMENTATION** | |
| Existing files changed | `04_ARCHITECTURE/ADR/ADR-0014-repository-layout-and-portable-code-toolchain.md`: append a "Review fixes" row stating F1 and the relative-import rule (decision 5 replaced for `server/`), and the spike result. |
| New files | `src/core/package.json`, exactly `{"type":"module"}` (PROPOSAL; removed if the root-level fix wins). Test: `server/test/shared-import.test.ts` (it spawns plain `node` with no flags on a probe file under `server/test/fixtures/` and asserts empty stderr). The fixture is a test support file. |
| Modules and signatures | None. Fixture `server/test/fixtures/import-core.ts`: `import { sha256 } from "../../../src/core/sha256.ts"` and prints the hash of `abc`. |
| Data model, schemas, API | None. |
| Algorithm | 1. Run the probe without stubs: record the warning text. 2. Add the stub: run again: expect no warning. 3. `BUILD` (a page already imports a shared module per T-B2-01). 4. `V src/core`. 5. `SRVT` (nodenext resolution sees the shared files as ESM). 6. Write the result. |
| Validation, errors, edge cases | Edge: the stub file must not become a `package.json` scope for `imports` lookups used by T-B2-01's root map (`#core/*` is used by app code only if the web app uses it; check `grep -rn '#core/' src` first). |
| Permissions, performance | None. |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `shared-import.test.ts`: stderr empty; stdout equals the SHA-256 of `abc`. |
| Integration | The `BUILD` and `V src` runs above, copied into the ADR note. |
| Playwright, fixtures | None. |
| Acceptance | Given the stub, when the server imports a `src/core` file, then Node prints no `MODULE_TYPELESS_PACKAGE_JSON` line. |
| Observability | None. |
| Release blockers | A FAIL with no fallback chosen. |
| **DELIVERY** | |
| Definition of done | Result recorded in ADR-0014; the chosen form named in the commit body. |
| Verify commands | `TL`; `SRVT`; `SRV1 shared-import.test.ts`; `BUILD`; `V src/core`; `PORT`. |
| Documentation | ADR-0014 note. |
| Rollback | Delete the stub. |
| Later tasks need | The import form (relative `.ts`) and the `src/core` stub. T-B6-16 adds the `src/protocol` stub and proves it. |

### T-B6-16 Shared identity module

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-16, Protocol (portable), B6 |
| Priority | P0 |
| Dependencies | T-B2-03 (`src/core/sha256.ts`, synchronous SHA-256); T-B6-15 (the `src/core` stub, so the plain-`node` proof below prints nothing) |
| Status | not started |
| **INTENT** | |
| Problem | The browser and the server must compute the same ids, thumbprints, code forms, signing input and name clean-up. Two copies would drift. |
| Target user | T-B6-04 (server), T-B6-05 (browser), T-B6-08. |
| User story | As a maintainer, I change a code rule once. |
| Expected behaviour | Pure functions, no DOM, no Node import. |
| Success metric | Test vectors match `node:crypto` on 1,000 random keys. |
| **IMPLEMENTATION** | |
| Existing files | `server/realtime/src/protocol.js:26` `NAME_JUNK` is the model for the name rule (read it at `server/legacy/src/protocol.js:26`). |
| New files | `src/protocol/identity.ts`; `src/protocol/package.json`, exactly `{"type":"module"}` (moved here from T-B6-15; 2 source files). Test: `src/protocol/identity.test.ts`. Import `sha256` from `../core/sha256.ts` (read the file for the exact export name). |
| Modules and signatures | `export const AUTH_CONTEXT = "iynk.auth.v1"`. `export type ChallengePurpose = "login" \| "register"`. `export function signingInput(p: { purpose: ChallengePurpose; audience: string; challengeId: string; nonce: string; keyThumbprint: string }): string` (context, purpose, audience, challengeId, nonce, thumbprint joined by `\n`). `export function toBase64Url(b: Uint8Array): string`, `fromBase64Url(s: string): Uint8Array \| null`. `export function base32Lower(b: Uint8Array): string` (RFC 4648, lower case, no padding). `export function keyThumbprint(spki: Uint8Array): string`. `export function deriveDeviceId(spki: Uint8Array): string` (`dev_` + 26 characters). `export function deriveIdentityId(spki: Uint8Array): string` (`usr_` + 16 characters). `export const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"`. `export function canonicalCode(s: string): string` (upper case, strip spaces and hyphens, O to 0, I and L to 1). `export function parseEnrolmentCode(s: string): { kind: "typed"; canonical: string } \| { kind: "link"; canonical: string } \| null` (typed = 12 Crockford characters; link = 22 base64url characters). `export function parsePairingCode(s: string): { channel: string; secret: string } \| null` (4 + 6 Crockford characters, hyphen optional). `export function cleanDisplayName(s: string, o?: { truncate?: boolean }): string \| null` (strip control, DEL, C1, zero-width, bidi override and isolate characters as `NAME_JUNK`; collapse spaces; trim; 1 to 24 grapheme clusters via `Intl.Segmenter` when present, else code points; null when empty). `export function isSpkiP256(b: Uint8Array): boolean` (length 91 and the fixed 26-byte P-256 SPKI prefix). |
| Data model | Id shapes: `dev_[a-z2-7]{26}`, `usr_[a-z2-7]{16}`. |
| Input and output schemas | As signatures. |
| API contracts | Mirrors openapi `Challenge.signingInput`, `Identity.id`, `Identity.deviceId`. |
| Algorithm | Thumbprint = base64url(SHA-256(SPKI)), 43 characters. Device id = `dev_` + base32Lower(first 16 bytes). Identity id = `usr_` + base32Lower(first 10 bytes). |
| State transitions, permissions | None. |
| Validation rules | `canonicalCode` is idempotent. `cleanDisplayName("  ")` is null. A name over 24 graphemes returns null (the server refuses it); with `{ truncate: true }` (UI input) it is cut to 24 instead. |
| Error conditions | Returns null, never throws. |
| Edge cases | Emoji with joiners count as one grapheme; Devanagari clusters; Arabic marks; names made only of bidi characters; a name with a tab. |
| Performance | Under 0.1 ms per call (ESTIMATED). |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `identity.test.ts` (vitest, `// @vitest-environment node`): thumbprint, device id and identity id equal values computed with `node:crypto` for 1,000 generated P-256 keys; lengths 43, 30, 20; `signingInput` equals the openapi example string; code canonicalisation (O/0, I/L/1, case, hyphens); `parsePairingCode("ab12-cd34ef")`; 12 typed, 22 link and bad lengths; `isSpkiP256` true for real keys and false for 90 and 92 bytes; name cases from Edge cases. Plain-node proof: the test spawns `node` with no flags (`execFileSync(process.execPath, ["--input-type=module", "-e", "import('./src/protocol/identity.ts').then(m => console.log(m.AUTH_CONTEXT))"], { cwd: repoRoot })`) and asserts stdout `iynk.auth.v1` and empty stderr, which proves the `src/protocol/package.json` stub and the `src/core` stub together. |
| Integration | `PORT` proves no DOM or Node import. |
| Playwright, fixtures | Fixture keys generated in the test. |
| Acceptance | Given a P-256 key, when browser and server derive ids, then they are equal. |
| Observability | None. |
| Release blockers | Any divergence from `node:crypto`. |
| **DELIVERY** | |
| Definition of done | Tests green (including the plain-node spawn); `PORT` green. |
| Verify commands | `TL`; `V src/protocol/identity.test.ts`; `PORT`; `SRVT`. |
| Documentation | None. |
| Rollback | Revert. |
| Later tasks need | The exported names above; the `src/protocol` stub. |

### T-B6-02 ServerStore port, node:sqlite adapter, migrations, backup

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-02, Server store (F-165), B6 |
| Priority | P0 |
| Dependencies | T-B6-01b |
| Status | not started |
| **INTENT** | |
| Problem | The server must remember devices, sessions, codes, pairings and buddies across restarts, with one file to back up (R-083, ADR-0004). |
| Target user | Self-hoster; later tasks. |
| User story | As Amar, I stop the server, start it, and my friends are still enrolled. |
| Expected behaviour | `openStore(config, deps)` opens `iynk.db`, applies migrations in transactions, refuses a newer database, backs up before a migration, and offers `transaction`, `backupTo`, `integrityCheck`, `ping`. |
| Success metric | Contract tests pass on the adapter (AR-11); `PRAGMA integrity_check` is `ok` after migration; a database one version ahead is refused with `db_newer_than_server` and its bytes unchanged. |
| **IMPLEMENTATION** | |
| Existing files | None (the Postgres layer `src/lib/server/db/*` and `db/migrations/0001..0003` are deleted in B0, T-B0-16). Facts: `node:sqlite` works on 24.8.0 (F5). |
| New files | `server/src/deps.ts`, `server/src/store/port.ts`, `server/src/store/sqlite.ts`, `server/src/store/migrate.ts`, `server/migrations/0001_identity.sql`. Tests: `server/test/store.contract.test.ts`, `server/test/migrate.test.ts`, `server/test/helpers.ts` (temp dir, `memoryStore()`, `fakeDeps()`, `freePort()` in 40000 to 49999 skipping 43117 and 3000). |
| Modules and signatures | `deps.ts`: `export type Clock = { now(): number }`; `export type Ids = { random(bytes: number): Uint8Array }` (wraps `crypto.getRandomValues`; tests seed it); `export type Sleep = (ms: number) => Promise<void>`; `export type Deps = { clock: Clock; ids: Ids; sleep: Sleep }`; `export function realDeps(): Deps`. `port.ts`: `export type Row = Record<string, unknown>`; `export interface Tx { run(sql: string, ...params: SqlValue[]): { changes: number }; get<T extends Row = Row>(sql: string, ...params: SqlValue[]): T \| undefined; all<T extends Row = Row>(sql: string, ...params: SqlValue[]): T[] }`; `export type SqlValue = string \| number \| bigint \| Uint8Array \| null`; `export interface ServerStore { transaction<T>(fn: (tx: Tx) => T): T; read<T>(fn: (tx: Tx) => T): T /* deferred, read-only: a write inside throws */; backupTo(path: string): void; integrityCheck(): string; ping(): boolean; schemaVersion(): number; close(): void }`; `export class StoreError extends Error { readonly code: "db_newer_than_server" \| "migration_checksum_changed" \| "store_unavailable" }`. `sqlite.ts`: `export function openStore(opts: { path: string; sync: "full" \| "normal"; migrationsDir: string; backupsDir: string; serverVersion: string }, deps: Deps): ServerStore`; `":memory:"` is a valid path. `migrate.ts`: `export function migrate(db: DatabaseSync, opts: { dir: string; backupsDir: string; backup: (to: string) => void; clock: Clock; serverVersion: string }): { applied: number[] }`. |
| Data model | Tables in 4.3. `0001_identity.sql` declares `used_by TEXT REFERENCES devices(id) ON DELETE SET NULL` on `enrollment_codes` and `pairings` (4.3). Indexes: `sessions_by_device(device_id)`, `sessions_by_expiry(expires_at)`, `pairings_by_creator(creator)`, `buddies_by_b(b)`, `enrollment_codes_by_expiry(expires_at)`. |
| Input and output schemas | As signatures. |
| API contracts | None. |
| Algorithm | Open: create `dirname(path)` mode 0700 (if missing); pragmas `journal_mode=WAL`, `synchronous=FULL` (or `NORMAL` when `sync==="normal"`), `foreign_keys=ON`, `busy_timeout=5000`. Migrate: read `server/migrations/NNNN_name.sql` sorted; compare `max(version)` in `schema_migrations` with the highest file: if the database holds a version with no file, throw `db_newer_than_server` and touch nothing (read-only open check before any pragma that writes); for each applied row compare `checksum = SHA-256(file)`, a mismatch throws `migration_checksum_changed`; before applying any pending file call `backupTo(backups/pre-<version>-<ts>.db)` and keep the last 3 `pre-` files; each file runs in `BEGIN IMMEDIATE ... COMMIT`. `transaction` uses `BEGIN IMMEDIATE`; nested calls join the outer one. `read` runs `BEGIN` (deferred) with `PRAGMA query_only = ON` for its duration and turns it off in `finally`, so a write inside `read` throws instead of upgrading a read lock (an upgrade can fail with `SQLITE_BUSY` or be skipped) and no request takes the write lock just to authenticate. `backupTo` runs `VACUUM INTO` (the only code that touches the file besides the adapter). Empty file is a valid empty server (no seeding). |
| State transitions | Migration: none -> v1. |
| Validation rules | Path of `backupTo` must not exist; its parent mode is 0700. |
| Error conditions | `StoreError`. A busy database after 5 s raises `store_unavailable`. |
| Edge cases | Two processes (server plus CLI) on one file (WAL, `busy_timeout`); migration file edited after apply; backups directory missing; disk full during `VACUUM INTO` (error surfaces, no partial file left: write to `.tmp` then rename). |
| Permissions | Files mode 0600 where the platform allows; directory 0700. |
| Performance | Commit with `synchronous=FULL` measured in T-B6-03; migrations under 100 ms. |
| Migration | `0001_identity.sql` per 4.3. No data to carry over. |
| **VERIFICATION** | |
| Unit tests | `migrate.test.ts`: fresh file migrates to 1; second open applies 0; newer database refused and file hash unchanged; edited checksum refused; pre-migration backup written and only the last 3 kept. |
| Integration | `store.contract.test.ts` is a function `runStoreContract(name, makeStore)` so a `better-sqlite3` adapter can run the same cases nightly (AR-11, later, not built here): foreign keys cascade on device delete; a device that redeemed an enrolment code and a pairing can be deleted with no error, and both rows stay with `used_by` NULL and `used_at` kept (`ON DELETE SET NULL`); `read` throws on an `INSERT` and a following `transaction` still works; `a < b` check on `buddies`; unique `thumbprint`; transaction rollback on throw; nested join; `backupTo` file opens and has equal row counts; `integrityCheck()` is `ok`; `ping()` true; all of it against `:memory:` and a temp file. |
| Playwright, fixtures | None. |
| Acceptance | Given a file written by version N, when the server of version N-1 opens it, then it refuses with `db_newer_than_server` and the file is byte-identical. |
| Observability | `StoreError.code` is logged by callers. |
| Release blockers | Any acknowledged commit lost (T-B6-03); a changed file on refusal. |
| **DELIVERY** | |
| Definition of done | Contract and migrate tests green; SQL reviewed against 4.3. |
| Verify commands | `TL`; `SRVT`; `SRV1 store.contract.test.ts`; `SRV1 migrate.test.ts`; `PORT`. |
| Documentation | None. |
| Rollback | Revert; delete `iynk.db`. |
| Later tasks need | `Tx`, `ServerStore`, `Deps`, `openStore`, helpers, the table list. |

### T-B6-13 Structured log with redaction

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-13, Server operations (R-078, R-098), B6 |
| Priority | P0 |
| Dependencies | T-B6-01b |
| Status | not started |
| **INTENT** | |
| Problem | Tokens, codes and keys must never reach a log line (BA-09). |
| Target user | Self-hoster who attaches logs to a bug report. |
| User story | As Amar, I paste my logs in an issue without reading them first. |
| Expected behaviour | One JSON object per line on stdout; secrets replaced before write. |
| Success metric | 0 canary occurrences across a scripted request run (completed by T-B6-22). |
| **IMPLEMENTATION** | |
| Existing files | `server/legacy/src/log.js:1-40` is the base: JSON lines, levels. |
| New files | `server/src/ops/log.ts`. Test: `server/test/log.test.ts`. |
| Modules and signatures | `export type LogLevel = "debug"\|"info"\|"warn"\|"error"\|"silent"`; `export type Logger = { level: LogLevel; debug/info/warn/error(msg: string, fields?: Fields): void; child(base: Fields): Logger; lines(): string[] }`; `export function createLogger(opts: { level: LogLevel; write?: (line: string) => void; clock?: Clock; keep?: number }): Logger`. `lines()` returns the last `keep` (default 1,000) redacted lines for `diagnostics` (T-B6-06). `export const REDACT_KEYS: readonly string[]` = `authorization`, `x-iynk-provider-key`, `x-iynk-server-token`, `cookie`, `token`, `signature`, `code`, `secret`, `enrollmentcode`, `publickey`. `export function redact(value: unknown): unknown`. |
| Data model | Line shape: `{ ts, level, msg, req?, route?, status?, ms?, dev? , ...fields }` (BE 13.5). `dev` is the first 8 hex characters of SHA-256 of the device id. |
| Algorithm | Fields whose key is in `REDACT_KEYS` (case-insensitive) become `"<redacted>"`. String values that look like secrets are masked wherever they appear: `iynk_at_` plus 43 characters, `iynk_pat_...`, 22-character base64url tokens after `#/pair/` or `enrol=`, 26+ character Crockford runs after `code`. Bodies, chat and project text are never passed in (callers log sizes). IP addresses appear only on `warn` lines as a hash of the /64. |
| Validation, errors | A write failure never throws into a request. |
| Edge cases | Nested objects; arrays; circular structures (cut at depth 4); an `Error` with a token in its message (message masked). |
| Permissions, performance | Under 20 microseconds per line (ESTIMATED). |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `log.test.ts`: every `REDACT_KEYS` key; token-shaped values inside `msg` and nested fields; level filter; `child` merges; `lines()` keeps only `keep`; IP only on warn. |
| Integration, Playwright | None here; T-B6-22 re-checks through HTTP. |
| Acceptance | Given a field named `authorization`, when logged, then the line holds `<redacted>`. |
| Observability | This is it. |
| Release blockers | A token shape in a line. |
| **DELIVERY** | |
| Definition of done | Tests green. |
| Verify commands | `TL`; `SRVT`; `SRV1 log.test.ts`; `PORT`. |
| Documentation | None. |
| Rollback | Revert. |
| Later tasks need | `createLogger`, `Logger.lines()`, `redact`. |

### T-B6-07 Router, route classes, limiter, CORS, error envelope

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-07, Server HTTP (R-007, BA-11), B6 |
| Priority | P0 |
| Dependencies | T-B6-01b |
| Status | not started |
| **INTENT** | |
| Problem | Today three routes send CORS `*` and the client address is a spoofable header (`src/lib/server/http.ts:128-131`, VERIFIED; SECURITY_BASELINE section 4). A route with no auth class must be impossible. |
| Target user | Every route author; the self-hoster behind a proxy. |
| User story | As a maintainer, adding a route with no class fails a test. |
| Expected behaviour | A small router on `node:http`. Every route is declared with a class and a bucket. Origins are checked. Bodies are capped. |
| Success metric | BA-11 passes: every route registered has class and bucket; no response carries `Access-Control-Allow-Origin: *`. |
| **IMPLEMENTATION** | |
| Existing files | `src/lib/server/ratelimit.ts` (41 lines, the sliding-window idea, read before copying the shape), `src/lib/server/http.ts:13` (error envelope), `:128-131` (`clientIp`), `:147` (`forbidden_origin`). Not changed. |
| New files | `server/src/http/classes.ts`, `server/src/http/router.ts`, `server/src/http/limits.ts`, `server/src/http/errors.ts`. Tests: `server/test/router.test.ts`, `server/test/limits.test.ts`, `server/test/route-registry.test.ts`. |
| Modules and signatures | `classes.ts`: `export type RouteClass = "public"\|"capability"\|"device"\|"needs-user-key"\|"operator"\|"removed"`; `export type BucketName = "public.read"\|"auth.challenge"\|"auth.token"\|"auth.token.identity"\|"identity.register"\|"pairing.create"\|"pairing.guess"\|"read"\|"write"`; `export type Authed = { deviceId: string; identityId: string; role: "owner"\|"member"; sessionId: string; name: string; deleting: boolean }` (`deleting` is true while `deletion_requested_at` is set; create-type routes refuse it, T-B6-08); `export type Ctx = { method: string; path: string; params: Record<string,string>; query: URLSearchParams; headers: Headers; body: unknown; address: string; authed: Authed \| null; requestId: string }`; `export type Reply = { status: number; body?: unknown; headers?: Record<string,string> }`; `export type RouteDef = { method: "GET"\|"POST"\|"PATCH"\|"PUT"\|"DELETE"; path: string; operation: string; cls: RouteClass; bucket: BucketName; maxBodyBytes?: number; handler: (ctx: Ctx) => Promise<Reply> \| Reply }`; `export function defineRoutes(defs: RouteDef[]): RouteDef[]` (throws if `cls` or `bucket` missing or the pair method+path repeats). `errors.ts`: `export class ApiError extends Error { constructor(readonly status: number, readonly code: string, message: string, readonly details?: unknown[]) }`; `export const unauthorized: () => ApiError`; `export function errorBody(e: ApiError, requestId: string): object`. `limits.ts`: `export type Limiter = { take(bucket: BucketName, key: string): { ok: boolean; remaining: number; resetSeconds: number; retryAfter: number }; reset(): void }` (exported so `RouteDeps` and handlers can call `limiter.take(...)`); `export function createLimiter(deps: Deps, table?: Record<BucketName, Rule[]>): Limiter`; the default table has one rule set per bucket, including `auth.token.identity` = 5 per minute (4.3); `export function addressKey(socketAddr: string, xff: string \| null, trustProxy: number): string`. `router.ts`: `export type RouterOptions = { routes: RouteDef[]; config: ServerConfig; deps: Deps; log: Logger; limiter: Limiter; authenticate: (token: string) => Authed \| null }` (the function returns `Authed` or `null` and hides the touch write, T-B6-18); `export function createRouter(o: RouterOptions): (req: IncomingMessage, res: ServerResponse) => void`. |
| Data model | None. |
| Input schema | JSON bodies, UTF-8, `Content-Type: application/json` required on POST and PATCH with a body (415 `unsupported_media_type`), default cap 64 KiB (`ctx.maxBodyBytes` can lower it; pairing bodies 8 KiB), read with a hard byte limit (413 `too_large`). Duplicate keys and nesting over 32 give 400 `bad_json`. |
| Output schema | Error envelope `{ error: { code, message, requestId, details? } }`. Headers on every response: `Iynk-Api-Version: 1.0`, `X-Request-Id`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, `Cross-Origin-Resource-Policy: same-site`, no `Server`, no `X-Powered-By`; `RateLimit-Limit/Remaining/Reset` on limited buckets; `Retry-After` and `error.retryAfterSeconds` on 429. |
| API contracts | API 4.1 (envelope), 4.2 (codes), 4.3 (buckets), 4.9 (CORS). Allowed request headers `authorization, content-type, idempotency-key, if-none-match, iynk-client, x-request-id, x-iynk-provider-key`; exposed `etag, retry-after, ratelimit-*, x-request-id, iynk-api-version, idempotent-replay`; never `Allow-Credentials`. |
| Algorithm | 1. Request id (`req_` + 10 base32) or accept a valid `X-Request-Id`. 2. Origin: if `Origin` present and not in `allowedOrigins`, 403 `forbidden_origin`; preflight answers 204 with the allow headers only for a listed origin and `Vary: Origin`; no `Origin` passes. 3. Match route by method and path template (`/v1` prefix; root `/healthz` and `/readyz` are also mounted by T-B6-17 as aliases). Unknown path: 404 `not_found`. Wrong method: 405 with `Allow`. 3b. Client version (API 4.x, openapi 426): read `Iynk-Client` (`name/semver`, for example `iynk-web/0.4.1`); if it carries a semver below `config.minClient`, answer 426 `upgrade_required`, except for the three probe routes (`GET /v1/server`, `GET /v1/healthz` and `/healthz`, `GET /v1/readyz` and `/readyz`), which always answer so the app can tell the person to update. A missing header or one without a semver passes. 4. Rate limit by bucket and key: `dev:<deviceId>` after authentication, else `addressKey`. 5. Class `device`: read `Authorization: Bearer`, call `authenticate`; any failure runs the same code path and returns the one `unauthorized()` reply (T-B6-04 owns timing). 6. Read body within cap. 7. Call handler; map `ApiError` to the envelope; any other throw becomes 500 `internal` with the request id and no text. `addressKey`: take `socket.remoteAddress`; if `trustProxy` is N > 0 take the N-th entry from the right of `X-Forwarded-For`; a missing or short header falls back to the socket address (never a shared `unknown`); IPv6 reduced to /64; IPv4-mapped IPv6 treated as IPv4. Limiter: sliding window per (bucket, key), `Map` capped at 10,000 keys with least-recently-used eviction. |
| State transitions | None. |
| Validation rules | `defineRoutes` refuses a missing class or bucket, a `removed` class with a handler, and duplicates. |
| Error conditions | 400 `bad_json`, 403 `forbidden_origin`, 404 `not_found`, 405, 413 `too_large`, 415, 426 `upgrade_required`, 429 `rate_limited`, 500 `internal`. |
| Edge cases | `X-Forwarded-For` spoof with `trustProxy=0` (ignored); header with 40 entries; IPv6 `::ffff:1.2.3.4`; `Origin: null`; HEAD request; path with `//` or encoded slash; body with wrong length header. |
| Permissions | By class as above. |
| Performance | Router overhead under 0.2 ms (ESTIMATED); limiter memory bounded. |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `limits.test.ts`: window refill with the fake clock; burst; LRU eviction at 10,001 keys; `addressKey` for trust 0, 1, 2, short header, IPv6 /64, mapped IPv4. `router.test.ts`: body cap; content type; bad JSON; unknown path; method not allowed; origin allowed, refused, preflight; no `*` ever; headers present (including `Iynk-Api-Version: 1.0` on 200, 404, 429 and 500 answers); 426 for `Iynk-Client: iynk-web/0.1.0` against `minClient` `0.2.0` on a normal route, and 200 on the three probe routes with the same header; no 426 when the header is absent or has no semver; 500 hides the error text. `limits.test.ts` also: `auth.token.identity` allows 5 then refuses the 6th while `auth.token` for the same address still has room. `route-registry.test.ts`: BA-11, imports the real route list (T-B6-17 provides `allRoutes()`; until then the test builds a list with one deliberately class-less entry and expects `defineRoutes` to throw, and T-B6-17 extends it) and asserts every entry has class and bucket and that every path in the 4.3 route table is registered once the owning task lands (the table lives in the test as data; a route whose task has not landed is listed as `pending` so the test is green per commit). |
| Integration | Started server answers a request from an allowed origin with the exact `Access-Control-Allow-Origin`. |
| Playwright, fixtures | None. |
| Acceptance | Given a route defined without a class, when the module loads, then it throws. Given `Origin: https://evil.example`, when any request arrives, then the answer is 403 `forbidden_origin`. |
| Observability | Router logs `route` (template), `status`, `ms`, `req`, `dev`. |
| Release blockers | Any response with `Access-Control-Allow-Origin: *`; a route reachable without a class. |
| **DELIVERY** | |
| Definition of done | Tests green. |
| Verify commands | `TL`; `SRVT`; `SRV1 router.test.ts`; `SRV1 limits.test.ts`; `SRV1 route-registry.test.ts`; `PORT`. |
| Documentation | None. |
| Rollback | Revert. |
| Later tasks need | `defineRoutes`, `RouteDef`, `Ctx`, `ApiError`, `createRouter`, `createLimiter`, `Limiter`, `BucketName` (with `auth.token.identity`). |

### T-B6-03 Store durability harness

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-03, Server store (AR-10), B6 |
| Priority | P1 |
| Dependencies | T-B6-02 |
| Status | not started |
| **INTENT** | |
| Problem | `synchronous=FULL` is chosen on macOS numbers only (FULL 16,472/s, NORMAL 97,999/s, DOCUMENTED, SYS 8.4). Linux cost is UNKNOWN (AX-05). A power-loss-like kill must not lose an acknowledged write. |
| Target user | Amar choosing FULL or NORMAL (RC-01). |
| User story | As Amar, I run one command on my server host and see commit latency and a kill test result. |
| Expected behaviour | `node server/scripts/bench-store.mjs` prints p50, p99, max commit latency and runs N kill -9 cycles. The test runs 10 cycles on macOS. |
| Success metric | 0 acknowledged writes lost in 10 cycles in the test and 50 in the script's default; commit p99 under 10 ms at 400 writes per second aggregate on this machine (recorded, not asserted in the test). |
| **IMPLEMENTATION** | |
| Existing files | None. |
| New files | `server/scripts/bench-store.mjs`. Tests: `server/test/store-crash.test.ts`. |
| Modules and signatures | Script flags `--cycles 50 --sync full\|normal --rate 400 --duration 5`. The child process writes rows `(n, payload)` into a table the script creates (`bench_log`, not a migration) using the adapter imported from `../src/store/sqlite.ts` (plain `node`, type stripping); after each COMMIT it prints `ack <n>` on stdout. The parent kills with SIGKILL at a random moment, reopens the file, runs `integrityCheck()` and checks every acked `n` exists and no row is half written (payload checksum column). |
| Data model | Scratch table only. |
| Algorithm | As above; latency measured around `transaction()`. |
| Validation, errors | Non-zero exit on any lost ack or integrity failure. |
| Edge cases | Kill between COMMIT and print (the row exists but was not acked: allowed); kill during WAL checkpoint. |
| Permissions, performance | Uses a temp dir. Test target under 60 s. |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `store-crash.test.ts`: 10 cycles at `--duration 1`; asserts 0 lost, integrity `ok`. |
| Integration | The script run by hand: `node server/scripts/bench-store.mjs --cycles 50`, output pasted into the commit body (macOS). |
| Playwright, fixtures | None. |
| Acceptance | Given 50 kill cycles, when the file is reopened each time, then every acknowledged write is present. |
| Observability | Prints a table. |
| Release blockers | Any lost acknowledged write. |
| **DELIVERY** | |
| Definition of done | Test green; macOS result recorded in the commit body. The Linux run is For Amar (item A1). |
| Verify commands | `TL`; `SRVT`; `SRV1 store-crash.test.ts`; `node server/scripts/bench-store.mjs --cycles 50`. |
| Documentation | Result goes into `docs/SELF_HOSTING.md` in T-B6-14. |
| Rollback | Revert. |
| Later tasks need | A recorded latency for choosing `IYNK_STORE_SYNC`. |

### T-B6-04 Identity core: enrolment, challenges, tokens

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-04, Server identity (F-005, F-206, R-077), B6 |
| Priority | P0 |
| Dependencies | T-B6-02, T-B6-16, T-B6-15 |
| Status | not started |
| **INTENT** | |
| Problem | There is no identity. Peers choose their own ids and a second join takes over a seat (`server/realtime/src/relay.js:246-258`, VERIFIED in the roadmap). The server needs enrolment by operator code, a signature check, and opaque tokens with one identical failure. |
| Target user | A friend of Amar; Amar as owner. |
| User story | As a friend, I type a code, my browser makes a key, and I am signed in with no email or password. |
| Expected behaviour | Pure server logic over `Tx`: create and redeem enrolment codes, issue and consume challenges, verify signatures, register a device, mint and verify tokens. No HTTP here (T-B6-18). |
| Success metric | BA-03: five failure causes give the same result object and, over 1,000 calls each, medians within 2 ms; a byte search of `iynk.db` and its `-wal` for an issued token finds nothing. |
| **IMPLEMENTATION** | |
| Existing files | None changed. |
| New files | `server/src/identity/enrol.ts`, `server/src/identity/challenge.ts`, `server/src/identity/tokens.ts`, `server/src/identity/devices.ts`. Tests: `server/test/enrol.test.ts`, `server/test/challenge.test.ts`, `server/test/tokens.test.ts`, `server/test/devices.test.ts`. |
| Modules and signatures | `enrol.ts`: `export type NewCode = { id: string; link: string; typed: string; expiresAt: number }` (`link` is the 22-character base64url secret; `typed` is 12 Crockford characters shown as `XXXX-XXXX-XXXX`); `export function createEnrolmentCode(tx: Tx, deps: Deps): NewCode` (24 h, 128-bit link secret plus an independent 60-bit typed secret, both hashed: `secret_hash = SHA-256(link bytes)`, `typed_hash = SHA-256(canonical typed)`); `export function redeemEnrolmentCode(tx: Tx, input: string, deviceId: string, deps: Deps): "ok" \| "invalid"` (marks `used_by`, `used_at` in the same transaction as the insert; accepts either form via `parseEnrolmentCode`); `export function listOpenCodes(tx: Tx, now: number): { id: string; expiresAt: number }[]`; `export function revokeCode(tx: Tx, id: string, now: number): boolean`. `challenge.ts`: `export type Challenge = { challengeId: string; purpose: ChallengePurpose; nonce: string; audience: string; expiresAt: number; signingInput: string }`; `export function createChallengeStore(deps: Deps, audience: string, cap?: number): { issue(req: { purpose: "register"; keyThumbprint: string } \| { purpose: "login"; identityId: string }, lookupThumbprint: (identityId: string) => string \| null): Challenge; consume(challengeId: string): { purpose: ChallengePurpose; thumbprint: string; signingInput: string } \| null }` (bounded map of 10,000, 60 s life, single use; an unknown `identityId` gets a normal-looking challenge with a random dummy thumbprint). `export function verifySignature(spki: Uint8Array, signingInput: string, signatureB64: string): boolean` (`node:crypto` `verify("sha256", ..., { key, dsaEncoding: "ieee-p1363" })`; rejects a point not on the curve; never throws). `tokens.ts`: `export const TOKEN_PREFIX = "iynk_at_"`; `export function mintToken(tx: Tx, deps: Deps, deviceId: string, ttlMs: number, client: string \| null): { token: string; sessionId: string; expiresAt: number }`; `export function verifyToken(tx: Tx, deps: Deps, presented: string \| null): { authed: Authed \| null; touch: boolean }` (never writes; runs inside `ServerStore.read`; `touch` is true when `last_used_at` is older than 60 s); `export function touchSession(tx: Tx, deps: Deps, sessionId: string): void` (the only writer of `sessions.last_used_at` and `devices.last_seen_at`; called by T-B6-18 inside `store.transaction`); `export function revokeSession(tx: Tx, deviceId: string, sessionId: string, now: number): boolean`; `export function revokeAllSessions(tx: Tx, deviceId: string, now: number): number`. `devices.ts`: `export function registerDevice(tx: Tx, deps: Deps, a: { spki: Uint8Array; displayName: string; locale?: string; color?: string; maxIdentities: number }): { deviceId: string; identityId: string; role: "owner"\|"member" } \| "full" \| "exists"`; `export function getDevice`, `listDevices`, `revokeDevice(tx, idOrIdentity, now)` (sets `devices.revoked_at` and every session's `revoked_at` in one transaction). |
| Data model | Tables in 4.3. First device on an empty `devices` table (no `owner` row) becomes `owner`; everyone else `member`. |
| Input schema | See openapi `IdentityRegister`, `TokenRequest`, `ChallengeRequest`. |
| Output schema | `AccessToken`: `iynk_at_` + 43 base64url characters from 32 random bytes; `sessionId` `ses_` + 16 base32; `expiresAt = createdAt + ttl`. |
| API contracts | API 5.1, 5.2; BE 6.2. |
| Algorithm | Register: consume the challenge (purpose must be `register`, thumbprint must equal the thumbprint of `publicKey`), `isSpkiP256`, `verifySignature`, redeem the code (in `code` mode; `closed` mode returns "invalid" for everyone), derive `deviceId` and `identityId` from the key (the server re-derives and never trusts client ids), insert device, mint a token. All in one `transaction`. Login: consume the challenge (purpose `login`), find device by `identity_id`, verify with its stored key, refuse a revoked device and a purged one (`deletion_at <= now`; a scheduled deletion may sign in), mint a token. Token verify: SHA-256 of the presented string; a missing, wrongly prefixed or wrongly sized value hashes a fixed dummy string and runs the same `SELECT` on `sessions JOIN devices`; accept only if `sessions.revoked_at IS NULL`, `expires_at > now`, `devices.revoked_at IS NULL` and (`devices.deletion_at IS NULL` or `devices.deletion_at > now`). A scheduled deletion does not reject the token: openapi `DeletionStatus` says the owner can still sign in and cancel, and `DELETE /identities/me/deletion` is a device-class route that needs a token. Only a purged identity (`deletion_at <= now`, not yet swept) is rejected. The function only reads: it returns `{ authed, touch }`, where `touch` is true when `now - last_used_at >= 60000`; it never writes `last_used_at` or `last_seen_at` (T-B6-18 calls `touchSession` in a separate `transaction`). `Authed.deleting` is `deletion_requested_at IS NOT NULL`. The role is read from the device row. Unknown identity on login runs a verification against a fixed dummy public key before failing, so work is equal. A typed enrolment code has no strike counter: the `identity.register` bucket (5 per minute per address) is the guard (60 bits, ESTIMATED infeasible; RC-18 leaves the strike rule open, O-5). |
| State transitions | Code: open -> used or expired or revoked. Challenge: issued -> consumed or expired. Session: live -> revoked or expired. Device: active -> revoked. |
| Validation rules | Display name through `cleanDisplayName` (null means 422 in T-B6-18). Locale per openapi pattern. Colour `#rrggbb`. At most 20 live sessions per device (the oldest is revoked on the 21st). `maxIdentities` reached gives `"full"`. |
| Error conditions | Every credential problem returns `null` or `"invalid"`; the HTTP layer maps all to the one 401. A key already registered returns `"exists"` (409 `already_exists` in T-B6-18; it needs a valid code so it leaks nothing to strangers). |
| Edge cases | Same code redeemed twice in parallel (second sees `used_at`); a code redeemed after expiry; typed form with `O`, `l`, hyphens, lower case; signature of the right length but wrong key; challenge reused; token with trailing space; clock moves; first device races (two owners): `BEGIN IMMEDIATE` serialises; a revoked device's old token. |
| Permissions | None here. |
| Performance | Token verify one indexed lookup plus SHA-256, under 0.5 ms (ESTIMATED). Signature verify under 2 ms (ESTIMATED). |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `enrol.test.ts`: link and typed forms both redeem; single use; 24 h expiry with the fake clock; revoked; the database holds neither secret (byte search of the row blobs and of `:memory:` serialisation). `challenge.test.ts`: 60 s expiry; single use; cap eviction; unknown identity looks normal; `verifySignature` true for a WebCrypto signature (generated with `crypto.subtle`), false for wrong data, wrong key, 63-byte signature, DER-encoded signature. `tokens.test.ts`: mint and verify; five failure causes (missing, malformed, expired, forged, revoked) return the same `{ authed: null, touch: false }`; `verifyToken` called inside `store.read` succeeds (it never writes) and returns `touch: true` only after 60 s; `touchSession` updates both columns; a device with `deletion_at` in the future still verifies and logs in, one with `deletion_at <= now` does not; revoke one and all; 12 h default; token never appears in the file bytes (BA-03 byte search over a file database and its `-wal`). `devices.test.ts`: first is owner, second member; `registerDevice` on a purged-and-not-swept key still reports `exists`; ids re-derived; duplicate key; `full`; `revokeDevice` kills sessions in the same transaction. |
| Integration | Covered by T-B6-18 and T-B6-22. |
| Playwright, fixtures | Fixtures: a `makeDeviceKey()` test helper (generates P-256, exports SPKI, signs) in `server/test/helpers.ts` (T-B6-02 owns the file; this task adds the helper in a new `server/test/keys.ts`). |
| Acceptance | Given an unused code and a valid signature, when a device registers, then it gets a token and the code is used. Given a used code, when another device tries, then the result is `"invalid"`. Given an issued token, when the database file is searched, then 0 matches. |
| Observability | Callers log outcome codes (`enrolled`, `login`, `refused`) without values. |
| Release blockers | A distinguishable failure cause; a token found in the file. |
| **DELIVERY** | |
| Definition of done | Tests green. |
| Verify commands | `TL`; `SRVT`; `SRV1 enrol.test.ts`; `SRV1 challenge.test.ts`; `SRV1 tokens.test.ts`; `SRV1 devices.test.ts`; `PORT`. |
| Documentation | None. |
| Rollback | Revert. |
| Later tasks need | All exports above; `server/test/keys.ts`. B7 reuses `verifySignature` for the socket handshake (`iynk.ws.v2`). |

### T-B6-17 App assembly, `main.ts`, probe and health

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-17, Server HTTP (F-012, F-016, F-199), B6 |
| Priority | P0 |
| Dependencies | T-B6-01b, T-B6-02, T-B6-07, T-B6-13, T-B6-15, T-B2-09 (`src/project/migrate.ts` holds `CURRENT_SCHEMA_VERSION`) |
| Status | not started |
| **INTENT** | |
| Problem | Nothing starts the server, and the app has no probe (`src/app/api/status/route.ts` is deleted by T-B1-11). |
| Target user | Self-hoster; the web app's probe. |
| User story | As Amar, `node server/src/main.ts` starts the server and `curl /v1/server` tells the app what is on. |
| Expected behaviour | `createApp(config, deps)` builds store, limiter, router and routes; `main.ts` listens, handles `SIGTERM` (health answers 503 `draining: true`, wait for open requests, close store, exit within 15 s), and exits 2 on config errors. |
| Success metric | `GET /v1/server` validates against openapi `ServerInfo`; `/healthz` 200 then 503 while draining; process exits 0 on SIGTERM within the grace. |
| **IMPLEMENTATION** | |
| Existing files | Contract only: `schemas/openapi.yaml` `ServerInfo`. |
| New files | `server/src/app.ts`, `server/src/main.ts`, `server/src/http/server-info.ts`, `server/src/http/health.ts`. Tests: `server/test/server-info.test.ts`, `server/test/health.test.ts`, `server/test/http-helpers.ts`. |
| Modules and signatures | `app.ts`: `export type App = { handler: RequestListener; routes: RouteDef[]; store: ServerStore; log: Logger; draining(): boolean; drain(): void; close(): Promise<void> }`; `export function createApp(config: ServerConfig, deps: Deps, opts?: { store?: ServerStore; log?: Logger }): App`; `export function allRoutes(ctx: RouteDeps): RouteDef[]` (each task adds its `xRoutes(ctx)` to this list; the list is the single registration point). `server-info.ts`: `export function serverInfoRoutes(ctx: RouteDeps): RouteDef[]`. `health.ts`: `export function healthRoutes(ctx: RouteDeps): RouteDef[]` (mounts `/v1/healthz`, `/healthz`, `/v1/readyz`, `/readyz`). `RouteDeps = { config; store; deps; log; limiter: Limiter; app: { draining(): boolean } }` (defined in `app.ts`; `limiter` lets handlers call `limiter.take(...)`, for example T-B6-18 for `auth.token.identity`). Until T-B6-18 lands, `createApp` passes `authenticate: () => null` to the router. |
| Data model | None. |
| Input schema | None. |
| Output schema | `ServerInfo` (openapi), body per RC-23: `audience`, `name`, `software: { name: "iynk-server" }`, `apiVersions: [1]`, `apiVersion: "1.0"`, `schemas: { project: ["1.1"], component: [1], opSchema: "1.1" }` (`opSchema` is a document MAJOR.MINOR string, equal to the project `schemaVersion`; `project` is the constant `PROJECT_SCHEMAS = ["1.1"]` in `server-info.ts`, hard-coded because `src/project` has no `package.json` stub and may import generated code the server cannot load under plain Node. `server-info.test.ts` reads the text of `src/project/migrate.ts` with `node:fs` (no import) and fails unless it contains `CURRENT_SCHEMA_VERSION = '1.1'`, so the constant cannot drift silently), `minClient`, `enrollment`, `features: { identities: true, buddies: true, shares: false, rooms: false, assets: false, aiRelay: false, searchProxy: false, compile: false, tools: false }`, `limits: { documentBytes, assetBytes, peersPerRoom, buddiesPerIdentity }`. No `version`, no `commit`, no `wsUrl` (B7), no counts. Health body `{ ok: boolean, draining: boolean, store: "ok"\|"error" }` (BE 5.1 wins over openapi `Health`, O-7); readiness 200 when `SELECT 1` works and migrations are current, else 503. |
| API contracts | `getServerInfo`, `getHealth`, `getReadiness`. |
| Algorithm | `main.ts`: `loadConfig(process.env)`; on `ConfigError` print each problem on its own line and exit 2; `openStore`; listen on `config.host:config.port`; handle `SIGTERM` and `SIGINT` once (second signal exits 1); startup prints one `info` line `listening` with the port (no address). |
| State transitions | running -> draining -> stopped. |
| Validation, errors | `store_unavailable` 503 when `ping()` fails. |
| Edge cases | Port in use (exit 1 with one line); health during a migration; second `drain()`. |
| Permissions | Public. |
| Performance | Probe under 5 ms. |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `server-info.test.ts`: body matches the `ServerInfo` shape (validated with a small structural check written in the test from the openapi required list; no new dependency); `schemas.project` equals `["1.1"]`, `schemas.opSchema` equals `"1.1"`, and the drift check on `src/project/migrate.ts` passes; no `version`/`commit` keys; `enrollment` follows config; features as above. `health.test.ts`: ok; store failure gives 503 `store: "error"`; draining gives 503 `draining: true`; root and `/v1` aliases agree. |
| Integration | `http-helpers.ts` starts `createApp` on a free port with `:memory:`; one test sends `SIGTERM` to a child `node server/src/main.ts` and checks exit 0. |
| Playwright, fixtures | None. |
| Acceptance | Given a fresh data dir, when `main.ts` starts, then `/readyz` answers 200 within 2 s. Given SIGTERM, then `/healthz` answers 503 `draining: true` until exit. |
| Observability | `listening`, `draining`, `stopped` lines. |
| Release blockers | Probe leaking version or counts. |
| **DELIVERY** | |
| Definition of done | Tests green; `route-registry.test.ts` (T-B6-07) now imports `allRoutes`. |
| Verify commands | `TL`; `SRVT`; `SRV1 server-info.test.ts`; `SRV1 health.test.ts`; `SRV1 route-registry.test.ts`; `PORT`. |
| Documentation | None. |
| Rollback | Revert. |
| Later tasks need | `createApp`, `allRoutes` (edited by 18, 08, 23), `RouteDeps` (with `limiter`), `http-helpers.ts`. |

### T-B6-05 Browser side: device key, sign-in, client

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-05, Server client (F-206, R-077, R-080, CM-01, CM-02), B6 |
| Priority | P0 |
| Dependencies | T-B6-16, T-B1-11 (`src/server-client/probe.ts`). No dependency on T-B3-02: the IndexedDB handle is injected (see below). |
| Status | not started |
| **INTENT** | |
| Problem | The browser has no identity. Peer names live in localStorage and are self-asserted (`src/lib/realtime/identity.ts:1-4`). |
| Target user | Amar and his friends. |
| User story | As a friend, I enter a code and I am enrolled; after a reload I am signed in without a prompt. |
| Expected behaviour | `enrol(code, name)` makes a non-extractable P-256 key, stores it in the IndexedDB store `identity` (one per server origin, ADR-0106), signs, registers, keeps the token in memory only. `signIn()` after reload or on a 401. A client object wraps every B6 endpoint. |
| Success metric | CM-01 and CM-02 as unit cases; token never written to any storage. |
| **IMPLEMENTATION** | |
| Existing files | `src/server-client/probe.ts` (T-B1-11): read, not changed. `src/lib/hw/serial.ts:28-33` is the pattern for `isSecureContext` checks. `src/server-client` may import only `core` and `protocol` (SYSTEM 5.3 matrix row `server-client`, VERIFIED `SYSTEM_ARCHITECTURE.md:215`; enforced by `V src/architecture.test.ts`), so it does not read or import `src/local/db.ts`; a private opener here would race T-B3-02 on the `iynk` database version and store list. |
| New files | `src/server-client/keys.ts`, `src/server-client/auth.ts`, `src/server-client/client.ts`, `src/server-client/types.ts`, `src/server-client/links.ts`. Tests: `keys.test.ts`, `auth.test.ts`, `client.test.ts`, `links.test.ts` beside them. |
| Modules and signatures | `keys.ts`: `export type KeySupport = "ok" \| "insecure" \| "unsupported"`; `export function keySupport(scope?: { isSecureContext?: boolean; crypto?: { subtle?: unknown } }): KeySupport`; `export interface DeviceKeyStore { get(origin: string): Promise<StoredKey \| null>; put(origin: string, k: StoredKey): Promise<void>; delete(origin: string): Promise<void> }`; `export type StoredKey = { privateKey: CryptoKey; publicSpki: Uint8Array; createdAt: number }`; `export function idbKeyStore(open: () => Promise<IDBDatabase>): DeviceKeyStore` (uses object store `identity`; the caller passes the T-B3-02 opener: `BuddiesPage` and `ServerPanel`, which are UI and may import `local`, do that); `export function memoryKeyStore(): DeviceKeyStore`; `export async function createDeviceKey(): Promise<StoredKey>` (ECDSA P-256, `extractable: false` for the private key; public key exported as SPKI). `types.ts`: TypeScript types for the B6 openapi shapes (`Identity`, `Buddy`, `Pairing`, `PairingCreated`, `PairingPeek`, `Session`, `ServerInfo`, `DeletionStatus`, `ApiErrorBody`), written by hand from `schemas/openapi.yaml`. `auth.ts`: `export type Session = { token: string; expiresAt: number; identityId: string }`; `export async function enrol(api: Api, keys: DeviceKeyStore, a: { code: string; displayName: string; locale: string }): Promise<{ identity: Identity; session: Session }>`; `export async function signIn(api: Api, keys: DeviceKeyStore, identityId: string): Promise<Session>`; the client rebuilds `signingInput` with `signingInput()` from `src/protocol/identity.ts` and refuses to sign when the server's string differs. `client.ts`: `export type Api = { base: string; fetch: typeof fetch }`; `export function createClient(o: { base: string; keys: DeviceKeyStore; fetch?: typeof fetch; onSession?: (s: Session \| null) => void }): ServerClient` where `ServerClient` has `probe()`, `enrol()`, `signIn()`, `signOut()`, `me()`, `updateMe(patch)`, `listSessions()`, `revokeSession(id)`, `createPairing(opts)`, `listPairings()`, `revokePairing(id)`, `peekPairing(ref)`, `redeemPairing(ref)`, `listBuddies()`, `getBuddy(id)`, `renameBuddy(id, alias)`, `removeBuddy(id)`, `requestDeletion(confirm: string)` (body `{ confirm }`, returns `DeletionStatus`), `cancelDeletion()`. Every call: sends `Authorization: Bearer` from memory; on a 401 signs a new challenge once and retries once; a second 401 calls `onSession(null)` and throws `NeedsEnrolment`. Errors become `ClientError { code, status, requestId }` using the envelope `code`. `links.ts`: `export type HashAction = { kind: "enrol"; code: string } \| { kind: "pair"; token: string } \| null`; `export function parseHash(hash: string): HashAction`; `export function enrolHash(code: string): string`; `export function pairLink(origin: string, token: string): string` (`${origin}/together#/pair/${token}`). |
| Data model | IndexedDB `iynk` store `identity` (created by the T-B3-02 opener), key = server origin, value `StoredKey`. The access token is never stored (ADR-0106). |
| Input and output schemas | openapi bodies. |
| API contracts | All B6 routes in 4.3. |
| Algorithm | Enrol: `keySupport()`; if not `ok`, return that state and create no key (CM-02). `probe()` first (audience, enrollment mode). If `enrollment` is `closed`, throw `EnrolmentClosed` before any key is made. Create key, `POST /v1/auth/challenges {purpose:"register", keyThumbprint}`, sign, `POST /v1/identities`. On failure after the key was created, delete the key (no orphan). Sign-in: `purpose:"login", identityId`. |
| State transitions | no key -> key + identity -> signed in (token in memory) -> signed out. |
| Validation rules | Display name through `cleanDisplayName(..., { truncate: true })` before sending; code through `parseEnrolmentCode`. |
| Error conditions | `NeedsEnrolment`, `EnrolmentClosed`, `InsecureContext`, `ClientError`, network failure as `ServerUnreachable` (distinct, so the UI can show the offline list). |
| Edge cases | Site data cleared (key gone: next sign-in fails, UI offers enrol again); two tabs signing in at once (each keeps its own memory token; the key is shared); private window where IndexedDB throws (state `unsupported`); a code pasted with spaces or the full link; server clock skew (challenge expiry is server-side only). |
| Permissions | Browser only. |
| Performance | Key generation under 100 ms; sign under 20 ms (ESTIMATED). |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `keys.test.ts`: `idbKeyStore(open)` works against a small in-file fake `IDBDatabase` (get, put, delete on store `identity`; no new dependency); private key `extractable === false`; `exportKey` on it rejects; `keySupport` returns `insecure` when `isSecureContext` is false and the key store is never written (CM-02). `auth.test.ts` with a fake server built from `server/src` is not allowed (portable boundary); instead a scripted fake `fetch` that verifies the signature with `crypto.subtle.verify`: enrol sends the 122-character `publicKey`; signing input equals the server string; refuses a server string that differs; `closed` mode makes no key; token not in the key store. `client.test.ts`: 401 then re-sign then success; second 401 gives `NeedsEnrolment`; error envelope mapping; `Authorization` header present only when signed in. `links.test.ts`: both hash forms and junk. |
| Integration | Real server round trip is the e2e in T-B6-10 and the integration test in T-B6-08. |
| Playwright, fixtures | `memoryKeyStore()` and a scripted `fetch`. |
| Acceptance | CM-01: given a fresh browser, an HTTPS or localhost server and a code, when I enrol, then a key exists, a challenge is signed, an identity is registered and no email or password was asked. CM-02: given a non-secure context, then no key is created. |
| Observability | None (no telemetry). |
| Release blockers | An extractable private key; a token in storage. |
| **DELIVERY** | |
| Definition of done | Tests green. |
| Verify commands | `TL`; `V src/server-client`; `V src/architecture.test.ts` (no `src/local` import from `server-client`); `PORT` (only `src/protocol/identity.ts` is portable here). |
| Documentation | None. |
| Rollback | Revert; delete the `identity` store rows through site data. |
| Later tasks need | `createClient`, `ServerClient`, `DeviceKeyStore`, `idbKeyStore(open)`, `parseHash`, `pairLink`. B7 reuses the key for the socket handshake. |

### T-B6-19a Strings for the Buddies page: `buddies.*`

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-19a, i18n (K-I18N), B6 |
| Priority | P0 |
| Dependencies | B1; T-B0-19 (removes the old `buddies` keys) |
| Status | not started |
| **INTENT** | |
| Problem | The Buddies page needs text in six languages before the UI lands. The original T-B6-19 touched twelve files (six `together.json`, six `common.json`); it is split by key group so each task is one namespace. |
| Target user | All users. |
| User story | As a friend in Delhi, I read the pairing steps in Hindi. |
| Expected behaviour | New `buddies.*` keys exist in all six `together.json` copies with equal key sets. |
| Success metric | `V src/i18n` parity tests green. |
| **IMPLEMENTATION** | |
| Existing files | `src/i18n/messages/en/together.json` (top-level keys today: `panel, identity, bar, chat, cursors, languages, labs, lobby`, VERIFIED). Type source: `src/components/realtime/messages.ts:12` (`typeof import(...together.json)`) so new keys type-check without code. |
| File count | The six language copies of one namespace file count as 1 source file (roadmap 2.2, `IMPLEMENTATION_ROADMAP.md` line 60; K-I18N requires all six languages in the same commit). This task touches 1 counted file. |
| New files | None. Edits: the six copies of `together.json`. |
| Modules and signatures | `together.json` gets top-level `buddies`: `title`, `needsServer.{title,body,guide}`, `insecure.{title,body}`, `empty.{title,add,enter}`, `list.{online,offline,asOf,inRoom,rename,remove,block,removeConfirm,blockConfirm}`, `enrol.{title,code,name,submit,closed,wrongCode,help}`, `pair.{title,code,link,qr,copy,copied,expires,cancel,enterCode,enterLabel,peekFrom,accept,wrong,tooMany,already,full}`, `joined`, `unknown.{title,body}`, `unreachable`, `errors.generic`. English is the source; the other five are translated with the same placeholders. Copy rules: plain words, no "validated", no em dashes. Wording for "needs a server" says "needs a server" exactly (R-079, AR-16). |
| Data, schemas, API, algorithm | None. |
| Validation rules | `src/i18n/messages.test.ts` (parity, placeholders) is the check. |
| Edge cases | The deleted `lobby.buddies` subtree must not be reintroduced; placeholders like `{name}` and `{time}` identical in all languages; right-to-left is not needed (no Arabic or Hebrew locale). |
| Permissions, performance, migration | None. |
| **VERIFICATION** | |
| Unit tests | Existing `src/i18n/messages.test.ts` and `src/components/realtime/messages` loaders: every key present in all six. |
| Integration, Playwright, fixtures | None. |
| Acceptance | Given the six files, when parity runs, then 0 missing keys. |
| Observability | None. |
| Release blockers | A key present in `en` and missing elsewhere; machine-translation errors in meaning (see For Amar A6). |
| **DELIVERY** | |
| Definition of done | Parity green. |
| Verify commands | `TL`; `V src/i18n`. |
| Documentation | None. |
| Rollback | Revert. |
| Later tasks need | Key names above (T-B6-10 uses them). |

### T-B6-19b Strings for the server panel: `server.*`

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-19b, i18n (K-I18N), B6 |
| Priority | P0 |
| Dependencies | B1; T-B0-19 |
| Status | not started |
| **INTENT** | |
| Problem | The server panel in Settings and the "needs a server" states need text in six languages before T-B6-11. |
| Target user | All users, including those with no server. |
| User story | As a user with no server, I read "needs a server" in my language. |
| Expected behaviour | New `server.*` keys exist in all six `common.json` copies with equal key sets. |
| Success metric | `V src/i18n` parity tests green. |
| **IMPLEMENTATION** | |
| Existing files | `src/i18n/messages/en/common.json`. |
| File count | The six copies of `common.json` count as 1 source file (roadmap 2.2, line 60, K-I18N). This task touches 1 counted file. T-B6-19a edits `together.json` only, so the two tasks share no file. |
| New files | None. Edits: the six copies of `common.json`. |
| Modules and signatures | `common.json` gets `server.{title,address,status.{off,unreachable,unreachableHint,ready,needsEnrol,closed},enrolled,signOut,leave.{title,body,confirm,grace},guide}`. `server.status.unreachableHint` reads like "If this address is on another origin, is it listed in IYNK_CONNECT_ORIGINS?" (a blocked fetch looks the same as a dead server, see T-B6-11). `server.leave.grace` takes `{hours}`. Same copy rules as T-B6-19a; "needs a server" exactly. |
| Data, schemas, API, algorithm | None. |
| Validation rules | `src/i18n/messages.test.ts`. |
| Edge cases | Placeholders `{hours}`, `{time}` identical in all languages; `IYNK_CONNECT_ORIGINS` is not translated. |
| Permissions, performance, migration | None. |
| **VERIFICATION** | |
| Unit tests | `src/i18n/messages.test.ts` parity. |
| Integration, Playwright, fixtures | None. |
| Acceptance | Given the six files, when parity runs, then 0 missing keys. |
| Observability | None. |
| Release blockers | A key present in `en` and missing elsewhere; machine-translation errors (A6). |
| **DELIVERY** | |
| Definition of done | Parity green. |
| Verify commands | `TL`; `V src/i18n`. |
| Documentation | None. |
| Rollback | Revert. |
| Later tasks need | Key names above (T-B6-11 uses them). |

### T-B6-18 Auth and identity routes

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-18, Server HTTP (F-005, F-206, R-077), B6 |
| Priority | P0 |
| Dependencies | T-B6-04, T-B6-17 |
| Status | not started |
| **INTENT** | |
| Problem | The identity core has no door. |
| Target user | The browser client (T-B6-05). |
| User story | As a friend, `POST /v1/identities` with a valid code gives me a token. |
| Expected behaviour | Routes of 4.3 for auth and identities, wired into `allRoutes`. |
| Success metric | A scripted client enrols, signs in, lists and revokes sessions; every failure is the identical 401. |
| **IMPLEMENTATION** | |
| Existing files changed | `server/src/app.ts` (`allRoutes`: add `authRoutes`, `identityRoutes`). |
| New files | `server/src/http/auth.ts`, `server/src/http/identities.ts`. Test: `server/test/auth.http.test.ts`, `server/test/identities.http.test.ts`. |
| Modules and signatures | `auth.ts`: `export function authRoutes(ctx: RouteDeps & { challenges: ChallengeStore }): RouteDef[]` with `createChallenge`, `createAccessToken`, `revokeCurrentToken`, `listSessions`, `revokeSession`. `identities.ts`: `export function identityRoutes(ctx: RouteDeps & { challenges: ChallengeStore }): RouteDef[]` with `registerIdentity`, `getMyIdentity`, `updateMyIdentity`. `app.ts` builds the `ChallengeStore` once and passes it, and builds `authenticate` for the router: `(t) => { const r = store.read(tx => verifyToken(tx, deps, t)); if (r.authed && r.touch) { try { store.transaction(tx => touchSession(tx, deps, r.authed.sessionId)) } catch { /* a busy store never fails the request */ } } return r.authed }`. Authentication reads in a read-only `read`; the two-column touch is a separate write at most once per 60 s per session. |
| Data model | Tables in 4.3. |
| Input schemas | openapi `ChallengeRequest`, `IdentityRegister`, `TokenRequest`, `IdentityPatch`. Body validation is a hand-written checker per schema in the route file (field presence, types, patterns, `additionalProperties: false`). UNKNOWN whether generated Ajv validators from `server/schemas/*.json` (BE 14) are wanted for B6; hand checks are the smaller step (O-9). |
| Output schemas | `Challenge` (201), `IdentityRegistered` (201), `AccessToken` (201), `Page of Session` (200, `{ items, nextCursor: null }`), `Identity` (200). |
| API contracts | `createChallenge` 201; `registerIdentity` 201 (400 `bad_request`, 409 `already_exists`, 422 `invalid_document` is not used; a bad display name is 400 with `details[0].path`); `createAccessToken` 201 (every failure 401); `revokeCurrentToken` 204; `revokeSession` 204 or 404; `listSessions`; `getMyIdentity`; `updateMyIdentity`. Identity response omits the instance role (openapi `Identity` has none; O-3). `IdentityRegistered` identity and token both returned. `Identity.deletion` is null in this task. |
| Algorithm | Register: `store.transaction`: `registerDevice` + `redeemEnrolmentCode` + `mintToken`, all-or-nothing; any credential failure (code, signature, challenge) answers the same 401 as a bad token; `closed` mode answers 401 (not a distinct code, so a stranger cannot tell the mode apart; the mode is public in `GET /v1/server` anyway). `409 already_exists` only after the code and signature were valid. `auth.token` failures are counted per identity with the separate bucket `auth.token.identity` (5 per minute, key `id:<identityId>`, T-B6-07 4.3): the handler calls `ctx.limiter.take("auth.token.identity", "id:" + identityId)` on each failed login and answers the same 401 until the window empties, then 429. The address limit stays in `auth.token` (20 per minute). |
| State transitions | See T-B6-04. |
| Validation rules | Body keys exact; `publicKey` pattern `^[A-Za-z0-9_-]{122}$` then `isSpkiP256`; `signature` 86 characters; `displayName` through `cleanDisplayName` and 1 to 24 graphemes; `PATCH` needs at least one field. |
| Error conditions | 400, 401, 409, 415, 429. |
| Edge cases | `Iynk-Client` header stored truncated to 120 characters; `PATCH` of `showActivity`; revoking the current session then using the token (401); listing sessions marks `current`. |
| Permissions | Classes in 4.3. |
| Performance | Register under 20 ms. |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `auth.http.test.ts`: challenge for a fresh key; token flow; unknown identity challenge has the same shape; second use of a challenge is 401; five bad-token cases are byte-identical (status, headers except `X-Request-Id`, body); 6 failed logins for one identity inside a minute give 429 on the 6th while another identity from the same address still gets 401 (bucket separation); `last_used_at` changes at most once per 60 s (fake clock: two requests 10 s apart touch once, a third 61 s later touches again); a busy store during the touch does not fail the request. `identities.http.test.ts`: first enrolment is owner (via a direct store read), second member; used code 401; expired code 401; `closed` 401; display name rules; `PATCH`; `GET /identities/me`; duplicate key 409 only with a valid code. |
| Integration | Uses `http-helpers.ts` with a real listening server and `fetch`. |
| Playwright, fixtures | `server/test/keys.ts`. |
| Acceptance | Given an operator code, when a new key registers, then the answer is 201 with a token matching `^iynk_at_[A-Za-z0-9_-]{43}$`. |
| Observability | `route`, `status`, `ms`; outcome lines `enrolled` and `signed_in` with `dev` hash only. |
| Release blockers | Two different bodies for two failure causes. |
| **DELIVERY** | |
| Definition of done | Tests green; route registry lists these routes as landed. |
| Verify commands | `TL`; `SRVT`; `SRV1 auth.http.test.ts`; `SRV1 identities.http.test.ts`; `SRV1 route-registry.test.ts`; `PORT`. |
| Documentation | None. |
| Rollback | Revert. |
| Later tasks need | `authenticate` wiring; the `409 already_exists` shape. |

### T-B6-06 Operator CLI

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-06, Server operations (R-078, R-098, RC-15), B6 |
| Priority | P0 |
| Dependencies | T-B6-04, T-B6-02, T-B6-13 |
| Status | not started |
| **INTENT** | |
| Problem | Administration is the CLI on the host; there is no admin HTTP API (BE 13.4, API section 7.1). |
| Target user | Amar on the server host. |
| User story | As Amar, `iynk-server init` prints the first code; `iynk-server enrol` prints one per friend. |
| Expected behaviour | Commands `init`, `enrol` (alias `enroll`), `devices`, `revoke <id>`, `backup`, `restore <file>`, `check-config`, `compact`, `diagnostics`. `rooms`, `close`, `mcp-key` arrive with their phases. |
| Success metric | BA-01: `init` on a fresh directory creates it with mode 0700, runs `check-config`, migrates, prints a code and the URL; the six refusals each print one line and exit non-zero. |
| **IMPLEMENTATION** | |
| Existing files | None. |
| New files | `server/bin/iynk-server.ts`, `server/src/cli/commands.ts`, `server/src/cli/diagnostics.ts`. Tests: `server/test/cli.test.ts`, `server/test/diagnostics.test.ts`. |
| Modules and signatures | `bin/iynk-server.ts`: shebang `#!/usr/bin/env node`; `main(argv, env, io)` from `commands.ts`; exit codes: 0 ok, 1 runtime error, 2 config problem, 64 usage. `commands.ts`: `export const COMMANDS: readonly string[]` (every command name and alias: `init`, `enrol`, `enroll`, `devices`, `revoke`, `backup`, `restore`, `check-config`, `compact`, `diagnostics`; the single list that `--help` prints and that `guide-commands.test.ts` checks the guide against); `run(argv, ...)` with `--help` or `-h` prints `COMMANDS` one per line and returns 0 without touching any file or store; an unknown command returns 64. `export type Io = { out(line: string): void; err(line: string): void; now(): number }`; `export async function run(argv: string[], env: NodeJS.ProcessEnv, io: Io, deps?: Deps): Promise<number>`. Commands: `init` (create `dataDir` mode 0700, `checkConfig`, `openStore` which migrates, `createEnrolmentCode`, print `Enrolment link: <origin>/together#enrol=<link>` and `Typed code: XXXX-XXXX-XXXX` to `io.out` only, never to the log stream; the device that redeems it on an empty server becomes `owner`); `enrol [--name n] [--json]` and `init [--json]` (same output; `--json` prints `{"link":"...","code":"...","expiresAt":...}` for scripts and e2e); `devices` (table: id, identity, name, role, created, last seen, revoked; no keys); `revoke <deviceId\|identityId>` (T-B6-04 `revokeDevice`; prints how many sessions ended); `backup` (`backupTo(backups/iynk-<ts>.db)`, keep the last 7 `iynk-` files, count separately from `pre-` files); `restore <file>` (refuses while a server holds the lock: tries `BEGIN EXCLUSIVE` on the live file; copies the backup over `iynk.db`, deletes `-wal` and `-shm`); `check-config` (prints every problem, exit 2); `compact` (`VACUUM`, refuses unless free disk is at least the file size); `diagnostics` (see `diagnostics.ts`). `diagnostics.ts`: `export function collectDiagnostics(config: ServerConfig, store: ServerStore, log: Logger): { files: Record<string, string> }` and `export function writeTarball(files, to: string): void` (writes an uncompressed tar by hand, no dependency): `versions.txt` (Node, SQLite, server package version), `config.txt` (every variable, secrets and all values for `*_KEY*` replaced by `<set>` or `<unset>`), `migrations.txt`, `tables.txt` (row counts only), `log.txt` (last 1,000 redacted lines; empty for a CLI run unless the running server wrote a file: B6 has no log file, so the bundle says `no log file; stdout is captured by the container runtime`), `integrity.txt` (`PRAGMA integrity_check`). |
| Data model | Reads and writes tables in 4.3 through the store. |
| Input schema | `process.argv`. |
| Output schema | Plain text lines. |
| API contracts | None. |
| Algorithm | CLI opens the same file the server uses (WAL permits both). Every command that needs the store first runs `checkConfig`; any problem prints and exits 2 (BA-01). |
| State transitions | None. |
| Validation rules | `revoke` with an unknown id exits 1 with `no such device`. `restore` verifies the file with `integrity_check` before copying and refuses a newer schema. |
| Error conditions | As exit codes. |
| Edge cases | `init` twice (second prints another code, does not change the owner rule); `enrol` before `init` (runs the same setup); data dir exists with mode 0755 (refused by BA-01); `restore` while the server runs; `backup` on a full disk. |
| Permissions | Whoever owns the data directory. Never run as root without `IYNK_ALLOW_ROOT=1`. |
| Performance | `init` under 1 s. |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `cli.test.ts` on a temp dir with fake `Io`: BA-01 in full (init creates 0700 dir, prints code and URL, runs migrations; the six refusals each non-zero with a one-line message); `enrol --json` parses; code printed only to `io.out`; `devices` hides keys; `revoke` ends sessions; `backup` keeps 7; `restore` round trip keeps devices; `check-config` exit 2; `--help` lists exactly `COMMANDS` and creates no file; an unknown command exits 64. `diagnostics.test.ts`: tarball lists the six files; a canary placed in `IYNK_*_KEY_X` and in an `Authorization` log line appears 0 times (BA-09 part). |
| Integration | CLI run as a child process against a temp dir while `createApp` serves the same file: `enrol` code redeems over HTTP (after T-B6-18). |
| Playwright, fixtures | Temp dirs. |
| Acceptance | BA-01 as stated. |
| Observability | CLI does not log secrets; codes go to stdout only. |
| Release blockers | A code in any log or diagnostics file. |
| **DELIVERY** | |
| Definition of done | Tests green; `package.json` `bin` works via `node server/bin/iynk-server.ts check-config`. |
| Verify commands | `TL`; `SRVT`; `SRV1 cli.test.ts`; `SRV1 diagnostics.test.ts`; `PORT`. |
| Documentation | Text goes into `docs/SELF_HOSTING.md` in T-B6-14. |
| Rollback | Revert. |
| Later tasks need | `run`, `COMMANDS`, `--help`, `--json`, `diagnostics`, `backup`/`restore` (drills in T-B6-14); `rooms`, `close` added in B7. |

### T-B6-11 Server settings, probe states, Leave server

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-11, Frontend settings (R-012, R-079, AR-16, CM-07, CM-31), B6 |
| Priority | P0 |
| Dependencies | T-B6-05, T-B6-19b, T-B3-02 (`ServerPanel` passes its IndexedDB opener), T-B1-11, T-B1-02 |
| Status | not started |
| **INTENT** | |
| Problem | With no server, server controls must say "needs a server" and cause no console error (AR-16). The server address must be a setting, not a rebuild (R-079). |
| Target user | Everyone, including users with no server. |
| User story | As a user with no server, Buddies says "needs a server" and links to the guide. As Amar, I paste my server address once. |
| Expected behaviour | `profile.ts` stores the address and last-known state in the `server` store; `probe.ts` gains states; `ServerPanel` shows address, status, enrolment, sign out, Leave server. |
| Success metric | With the server stopped: 0 page errors and 0 failed-request messages shown (AR-16, Playwright); states match the CM-07 table. |
| **IMPLEMENTATION** | |
| Existing files changed | `src/server-client/probe.ts` (T-B1-11): add a probe state `ServerState = "none" \| "checking" \| "ready" \| "unreachable" \| "insecure"` and `probeServer(base)`; stop reporting a failed probe as an error. `src/components/settings/index.ts:1-2`: export `ServerPanel`. `src/components/shell/SettingsMenu.tsx:40-42`: render `ServerPanel` below the toggles (the line with `<UsageToggle className="pt-2" />` is `:41`). |
| New files | `src/server-client/profile.ts`, `src/components/settings/ServerPanel.tsx`. Tests: `profile.test.ts`, `probe.test.ts` (extend), `ServerPanel.test.tsx`; spec `e2e/keyless.spec.ts` (extend the T-B1-12 file). |
| Modules and signatures | `profile.ts`: `export type ServerProfile = { url: string \| null; identityId: string \| null; deviceId: string \| null; displayName: string \| null; blocked: string[]; buddyCache: { at: number; items: CachedBuddy[] } \| null }` (the `server` store of ADR-0106; no secret); `export interface ProfileStore { read(): Promise<ServerProfile>; write(p: ServerProfile): Promise<void> }`; `export function idbProfileStore(open: () => Promise<IDBDatabase>): ProfileStore` (store `server`; the opener is injected because `src/server-client` may import only `core` and `protocol`; `ServerPanel` and `BuddiesPage`, which are UI and may import `local`, pass the T-B3-02 opener); `export function memoryProfileStore(): ProfileStore`; `export function resolveServerUrl(configJson: { server?: string \| null } \| null, profile: ServerProfile): string \| null` (reads `.server`, the field `/config.json` returns as `{ server, protocol, modules }` per T-B1-11 and FRONTEND 5.1; the profile address wins over it; the result must be an `http` or `https` URL, else `null`); `export async function blockBuddy(client: ServerClient, store: ProfileStore, identityId: string): Promise<void>` (CM-30: `removeBuddy`, then `listPairings` and `revokePairing` for each open pairing, then add the id to `blocked`); `export async function leaveServer(client: ServerClient, store: ProfileStore, keys: DeviceKeyStore, now: () => number): Promise<void>` (CM-31: reads `displayName` from the profile and calls `client.requestDeletion("delete " + displayName)`; the server answers 202 `{ status: "scheduled", requestedAt, effectiveAt }`, the grace is the operator's, not sent by the client. The profile is cleared and the session dropped after the 202. The device key is kept until `effectiveAt` has passed (stored as `profile.leaving = { effectiveAt }`), so the person can still sign in and press Cancel during the grace; with `effectiveAt <= now` it is deleted at once. Local projects are untouched.) `ServerPanel.tsx`: props none; uses `useCommonT()` keys `server.*`. |
| Data model | `server` IndexedDB store per ADR-0106. |
| Input and output schemas | As above. |
| API contracts | `requestDeletion` is T-B6-23 (body `{ confirm }`, response `{ status: "scheduled", requestedAt, effectiveAt }`; 4.3 deletion contract). |
| Algorithm | State table (CM-07, COMMUNITY 3.4): no address -> `none` ("needs a server" + guide link); address and probe failing -> `unreachable` (last list from the cache, labelled "offline, as of <time>"; actions disabled with a reason); not a secure context and the address is `http:` on a non-localhost host -> `insecure`; probe ready and no key -> `needs enrolment`; ready and 401 after re-sign -> "This server does not know this browser. Ask the operator for an enrolment code."; `enrollment: "closed"` -> says so. A failed probe is caught and becomes a state; nothing is logged to the console and no toast shows. Probe runs on page load and on window focus, never on a timer. |
| State transitions | As the table. |
| Validation rules | Address must parse as `http(s)` URL without path, query or credentials; `http:` allowed only for localhost, 127.0.0.1 and [::1] unless the person confirms. A pasted address works only if it is the same origin as the app or the operator listed it in `IYNK_CONNECT_ORIGINS` (the CSP `connect-src` list, D-B1-1 / ADR-0405). A blocked fetch throws the same `TypeError` as a network failure, so the panel cannot tell a CSP block from a dead server. When the address origin differs from `location.origin`, the `unreachable` state adds the hint `server.status.unreachableHint` ("is this address in IYNK_CONNECT_ORIGINS?"). The `none` and `unreachable` states stay errors-free in the console. |
| Error conditions | Shown as states, not errors. |
| Edge cases | `/config.json` absent (static host); address with trailing slash; IPv6 literal; `Leave server` while offline (disabled, reason shown); server returns `minClient` above the app (426 `upgrade_required`: shows "update the app"). |
| Permissions | Local. |
| Performance | One probe request per load. |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `profile.test.ts`: URL resolution (a body `{ server: "https://a.example", protocol: 1, modules: {} }` resolves to that address; `{ server: null }` and a non-URL give `null`; a profile address wins); block flow calls `removeBuddy` then revokes every open pairing then stores the id; `leaveServer` (CM-31) sends exactly `{ confirm: "delete Amar" }` for display name `Amar`, clears the profile only after the 202, keeps the key while `effectiveAt` is in the future and deletes it when `effectiveAt <= now`; a failed request clears nothing. `probe.test.ts`: each state from a scripted fetch (200, network error, 403, 426). `ServerPanel.test.tsx` (jsdom): each state's text and disabled controls; the unreachable hint shows only for a cross-origin address; axe has no violation. |
| Integration | None. |
| Playwright | `e2e/keyless.spec.ts` (extend): with no server configured, open Settings and `/en/together`; assert the "needs a server" text, 0 `pageerror`, 0 console errors, and 0 `requestfailed` events surfaced in the UI. The closed-port case moves to T-B6-21, because it needs the dead origin in `IYNK_CONNECT_ORIGINS`, which `playwright.config.ts` (T-B6-21) owns; without that entry the fetch is blocked by CSP and the test would pass for the wrong reason. |
| Fixtures | Scripted fetch. |
| Acceptance | AR-16: given the server stopped, when I open Buddies or Settings, then "needs a server" shows and the console has no error. CM-31: given Leave server confirmed, then the server-side listing is empty after the grace (server half in T-B6-23). |
| Observability | None. |
| Release blockers | Any uncaught error with the server stopped. |
| **DELIVERY** | |
| Definition of done | Tests green; e2e green. |
| Verify commands | `TL`; `V src/server-client src/components/settings`; `E e2e/keyless.spec.ts`. |
| Documentation | None. |
| Rollback | Revert. |
| Later tasks need | `ProfileStore`, `blockBuddy`, `leaveServer`, `resolveServerUrl`, `ServerState`, `idbProfileStore(open)` (T-B6-10). |

### T-B6-08 Pairing

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-08, Server buddies (F-206, F-138, R-076, R-080, CM-03, CM-05), B6 |
| Priority | P0 |
| Dependencies | T-B6-18, T-B6-16 |
| Status | not started |
| **INTENT** | |
| Problem | Two enrolled people need a way to become buddies without a search or directory (D-016, R-081). |
| Target user | Amar and a friend. |
| User story | As Amar, I show a code; my friend types it; we are buddies. |
| Expected behaviour | Create, list, revoke pairings; peek and redeem by token or typed code; a redeem links the two identities in one transaction. |
| Success metric | BA-04: 5 wrong secrets kill the code; expired, used and wrong give the same answer; a link works once. |
| **IMPLEMENTATION** | |
| Existing files changed | `server/src/app.ts` (`allRoutes`: add `buddyRoutes`). |
| New files | `server/src/buddies/pairing.ts`, `server/src/buddies/list.ts`, `server/src/http/buddies.ts`. Tests: `server/test/pairing.test.ts`, `server/test/pairing.http.test.ts`. |
| Modules and signatures | `pairing.ts`: `export function createPairing(tx: Tx, deps: Deps, creator: Authed, o: { label?: string; ttlSeconds?: number }): { id: string; token: string; code: string; createdAt: number; expiresAt: number; codeExpiresAt: number }` (token 16 random bytes base64url = 22 characters; channel 4 Crockford characters; secret 6; shown `XXXX-XXXXXX`; `token_hash = SHA-256(token string)`, `code_hash = SHA-256(canonical secret)`; ttl default 86,400 s, min 300, max 604,800; code lives `min(600, ttl)` s; channel collision retries 5 times; throws a `forbidden` `ApiError` (403) when `creator.deleting` is true: an identity with a scheduled deletion creates nothing, T-B6-23); `export function findPairing(tx: Tx, ref: { token: string } \| { code: string }, now: number): PairingRow \| null`; `export function strike(tx: Tx, channel: string): void` (increments `attempts`; at 5 sets `code_expires_at = NULL`: the code is deleted and the link stays valid, API 5.3 rule 2 and CM-03); `export function redeem(tx: Tx, deps: Deps, redeemer: Authed, ref): { buddy: BuddyView } \| "gone" \| "self" \| "already" \| "quota"`; `export function revokePairing`, `listPairings`. `list.ts`: `export function listBuddies(tx: Tx, me: string): BuddyView[]`, `export type BuddyView = { identityId; deviceId; displayName; color?; keyThumbprint; alias?; pairedAt; online: boolean \| null; activity: null }`. `buddies.ts`: `export function buddyRoutes(ctx: RouteDeps): RouteDef[]` with `createPairing`, `listPairings`, `revokePairing`, `peekPairing`, `redeemPairing`, `listBuddies`. |
| Data model | `pairings`, `buddies` in 4.3. `buddies` row is stored with `a < b` by device id; `alias_a` is a's name for b. |
| Input schemas | openapi `PairingCreate`, `PairingRef`, `PairingRedeem` (body `{ pairing: PairingRef }`). Bodies at most 8 KiB. |
| Output schemas | `PairingCreated` (201: `Pairing` fields plus `token`, `url`, `code`), `Page of Pairing`, `PairingPeek` (`from.displayName`, `from.color?`, `expiresAt`; no id, no key), `PairingRedeemed` (`{ buddy }`), `Page of Buddy`. `url` = `${origin of IYNK_PUBLIC_URL}/together#/pair/${token}` (O-4). |
| API contracts | 4.3 rows; errors 400, 404 `not_found` (one generic body for wrong, expired, used, revoked and deleted code), 409 `already_paired` (self or twice), 409 `quota` (20 open pairings, 64 buddies on either side). |
| Algorithm | Peek and redeem by code: parse `XXXX-XXXXXX`; look up by `channel`; compare `code_hash` with `timingSafeEqual` over fixed-size hashes; on a wrong secret on a live channel call `strike` in a separate committed statement (so the failure is counted even though the request fails); an unknown channel counts only against the address bucket. After any failure sleep so the total answer time is at least 200 ms (`deps.sleep`). By token: look up `token_hash`. A pairing is live when not revoked, not used, `expires_at > now` (code additionally needs `code_expires_at > now` and non-null). Redeem: require device auth; refuse self (409 `already_paired`); refuse an existing buddy (409 `already_paired`); count both sides against 64; one transaction: set `used_at`, `used_by`, insert the buddy row, return the creator as `Buddy`. A pairing never enrols (RC-14). Listing pairings returns status `open`, `redeemed`, `revoked` or `expired`. |
| State transitions | open -> redeemed, revoked, expired; code: live -> deleted (5 strikes or code expiry) while the link stays live. |
| Validation rules | `label` at most 60 characters, stripped like names; `ttlSeconds` integer in range. |
| Error conditions | As API contracts. |
| Edge cases | Redeem by the creator; two redeems racing for one link (second sees `used_at`); typed code with `O` or lower case; channel shared by two live pairings (prevented by `UNIQUE`); code redeemed at second 600 exactly; redeemer's device revoked mid-way; a pairing created by a revoked or deleting device (dead). |
| Permissions | `createPairing`, `listPairings`, `revokePairing` (creator only; another device gets 404), `redeemPairing`: device. `peekPairing`: capability. |
| Performance | Failure answers take at least 200 ms by design; success under 20 ms. |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `pairing.test.ts`: BA-04 all cases (five wrong secrets delete the code, the sixth try with the right secret also fails, the link still redeems; expired code, used code and wrong code return indistinguishable results; link works once); only hashes stored (byte search of `iynk.db` and `-wal` for the code, the secret and the token finds nothing); quota 21st pairing; self pairing; buddy limit; `a < b` ordering for both directions; failure delay uses `deps.sleep` (fake). CM-03 and CM-05 as named tests. CM-03 counts the `pairing.guess` bucket (10 per minute and 100 per hour per address): 5 wrong typed secrets, 1 right secret on the deleted code, then the link peek and redeem is 8 calls, under 10, so the test runs inside one fake minute and never meets a 429; a separate case sends 11 in one minute and expects 429 on the 11th, which is not counted as a strike. `createPairing` by an identity with `deleting` true is refused with 403 `forbidden`. |
| Integration | `pairing.http.test.ts`: two enrolled keys A and B over real HTTP: A creates, B peeks (sees A's name only), B redeems, both `GET /v1/buddies` show each other; third device C unpaired sees an empty list. |
| Playwright, fixtures | `server/test/keys.ts`. |
| Acceptance | CM-03: given a typed code, when 5 wrong secrets are sent, then the code is deleted, the link still works until it expires, and the answer is the same generic 404. CM-05: given an unredeemed link, when its lifetime passes, then peek and redeem answer the generic 404 and nothing is stored about the would-be redeemer. |
| Observability | Lines `pairing_created`, `pairing_redeemed`, `pairing_strike` (channel never logged). Warn line when a code is deleted, with a hash of the /64. |
| Release blockers | Distinguishable failure causes; a secret in the file. |
| **DELIVERY** | |
| Definition of done | Tests green. |
| Verify commands | `TL`; `SRVT`; `SRV1 pairing.test.ts`; `SRV1 pairing.http.test.ts`; `SRV1 route-registry.test.ts`; `PORT`. |
| Documentation | None. |
| Rollback | Revert. |
| Later tasks need | `buddyRoutes`, `listBuddies`, `BuddyView`; B7 adds the room `grant` on redeem. |

### T-B6-21 Playwright server harness

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-21, Test infrastructure, B6 |
| Priority | P0 |
| Dependencies | T-B6-06, T-B6-17, T-B6-11 (the keyless closed-port case needs `ServerPanel`), T-B0-03 (random-port rule that skips 43117) |
| Status | not started |
| **INTENT** | |
| Problem | The Buddies e2e needs a real server beside the production build, on a random safe port with a throwaway data directory. |
| Target user | Test authors. |
| User story | As a test, I get a server URL and two enrolment codes. |
| Expected behaviour | Playwright starts the web build and one server process; the web build is told the server address at run time and allows it in its CSP; the server allows the web origin, trusts a forwarded address, and can be stopped by a test. |
| Success metric | `E e2e/buddies.spec.ts` (T-B6-10) can use the harness; ports never include 3000 or 43117. |
| **IMPLEMENTATION** | |
| Existing files changed | `playwright.config.ts:5-6` (add `E2E_SERVER_PORT` and `E2E_DEAD_PORT`, chosen the same way as `E2E_PORT`, skipping `43117`, `3000` and each other), `:28-36` (turn `webServer` into an array). The web entry gains `env.IYNK_SERVER_URL=http://localhost:${E2E_SERVER_PORT}` and `env.IYNK_CONNECT_ORIGINS=http://localhost:${E2E_SERVER_PORT},http://localhost:${E2E_DEAD_PORT}`. The CSP `connect-src` comes from `IYNK_CONNECT_ORIGINS` (D-B1-1, ADR-0405); `IYNK_ALLOWED_ORIGINS` has only the server-side meaning in the web app, so it is not set on the web entry (it stays on the server entry). Without the connect origin the browser blocks every call to the e2e server with a CSP violation. The dead port is listed so the closed-port keyless case really meets a refused connection, not a CSP block. The second entry runs `node e2e/server-run.mjs`. |
| New files | `e2e/server-harness.ts` (test support), `e2e/server-run.mjs` (a 6-line wrapper: writes `process.pid` to `${E2E_SERVER_DATA}/pid`, then `await import("../server/src/main.ts")`, so the server runs in the same process and killing that pid stops it). Tests: `e2e/server-harness.spec.ts`; the closed-port case in `e2e/keyless.spec.ts`. Total source files: `playwright.config.ts`, `server-harness.ts`, `server-run.mjs` = 3. |
| Modules and signatures | Server entry env: `IYNK_DATA_DIR` = a new `mkdtempSync` path (mode 0700), `IYNK_PUBLIC_URL=http://localhost:${E2E_SERVER_PORT}`, `IYNK_ALLOWED_ORIGINS=http://localhost:${E2E_PORT}`, `IYNK_HOST=127.0.0.1`, `IYNK_PORT=${E2E_SERVER_PORT}`, `IYNK_ENROL=code`, `IYNK_LOG_LEVEL=warn`, `IYNK_TRUST_PROXY=1`; `url: http://127.0.0.1:${E2E_SERVER_PORT}/healthz`; `reuseExistingServer: false`. Harness: `export function serverUrl(): string`; `export function newEnrolmentCode(): { link: string; code: string }` (runs `node server/bin/iynk-server.ts enrol --json` with the same env via `execFileSync`); `export function firstOwnerCode()` (runs `init --json`; T-B6-06 supports `--json` on both `init` and `enrol`); `export async function distinctAddress(context: BrowserContext): Promise<void>`; `export function stopServer(): void`. |
| Rate limits in e2e | Every browser connects from `127.0.0.1`, so the `identity.register` bucket (5 per minute per address) and `pairing.guess` (10 per minute) would be shared by all contexts, and Playwright is `fullyParallel`; specs would hit 429. The server runs with `IYNK_TRUST_PROXY=1`, so the limiter key is the last `X-Forwarded-For` entry. `distinctAddress(context)` calls `context.route("**/v1/**", r => r.continue({ headers: { ...r.request().headers(), "x-forwarded-for": <unique per context, 10.0.<n>.<m> from a counter seeded by the worker index and a per-process counter> } }))`. A route `continue` is not a browser fetch with a custom header, so it skips CORS and the header need not be in the allow list (`authorization, content-type, idempotency-key, if-none-match, iynk-client, x-request-id, x-iynk-provider-key`). Each spec calls it right after `browser.newContext()`. `server-harness.spec.ts` asserts that two contexts each enrol five times in a minute without a 429. |
| Stopping the server | `stopServer()` reads `${E2E_SERVER_DATA}/pid` and sends `SIGKILL` (`process.kill(pid, "SIGKILL")`). Playwright owns the process, so it logs the exit but does not restart it; `reuseExistingServer: false` stays. T-B6-10 step 7 uses it. |
| Data model, schemas, API | None. |
| Algorithm | The temp directory is created in `playwright.config.ts` at load and reused by the harness through `process.env.E2E_SERVER_DATA` (the config is loaded again by workers, as the existing `E2E_PORT` comment says). |
| Validation, errors | Config refuses ports 3000 and 43117. |
| Edge cases | Port collision between web and server (retry choose); leftover temp dirs (OS cleans; the global teardown removes it). |
| Permissions | Local. |
| Performance | Server starts in under 2 s. |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `e2e/server-harness.test.ts` is not possible under vitest; the proof is the first spec that uses it (T-B6-10). A tiny spec `e2e/server-harness.spec.ts` asserts `/v1/server` answers from the browser context with the right CORS headers (`Access-Control-Allow-Origin` equals the web origin, never `*`), asserts 0 `securitypolicyviolation` events on the page while it fetches (proves `IYNK_CONNECT_ORIGINS` is right), asserts two contexts with `distinctAddress` can each enrol five times in a minute with no 429, and asserts `stopServer()` makes the next fetch fail while the page has 0 `pageerror`. The keyless closed-port case (`e2e/keyless.spec.ts`): the test types `http://localhost:${E2E_DEAD_PORT}` into Settings, expects the `unreachable` state and the cross-origin hint, 0 `pageerror`, 0 console errors, 0 `securitypolicyviolation` (the port is listed, so the failure is a refused connection). |
| Integration | As above. |
| Playwright | `e2e/server-harness.spec.ts`. |
| Fixtures | Temp data dir. |
| Acceptance | Given the harness, when a spec fetches `/v1/server` from the web origin, then it receives 200 and the exact origin header. |
| Observability | Server warn-level logs only. |
| Release blockers | The harness touching port 3000 or 43117. |
| **DELIVERY** | |
| Definition of done | Spec green. |
| Verify commands | `TL`; `E e2e/server-harness.spec.ts`; `E e2e/keyless.spec.ts`. |
| Documentation | None. |
| Rollback | Revert. |
| Later tasks need | `serverUrl`, `newEnrolmentCode`, `firstOwnerCode`, `distinctAddress(context)`, `stopServer()`. |

### T-B6-22 Identity hostile suite

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-22, Server security tests (R-097, BA-03, BA-09), B6 |
| Priority | P0 |
| Dependencies | T-B6-18, T-B6-13 |
| Status | not started |
| **INTENT** | |
| Problem | The identity rules must be proven by attacks, one test per row, not by reading code. |
| Target user | Amar; every later reviewer. |
| User story | As Amar, a failing hostile test names the SECURITY_BASELINE row it covers. |
| Expected behaviour | A scripted client against a real listening server. |
| Success metric | Every case refused; BA-03 timing within 2 ms; BA-09 canary count 0. |
| **IMPLEMENTATION** | |
| Existing files | None changed. |
| New files | Tests only: `server/test/identity.hostile.test.ts`, `server/test/leak.test.ts`. No source file. |
| Modules and signatures | None. |
| Cases | Forged token (random 256 bits); expired token (fake clock + 12 h); revoked token; revoked device; malformed (`Bearer`, wrong prefix); BA-03 five causes (missing, malformed, expired, forged, revoked; no 1 MB header among them): same status, same headers except request id, same body bytes, median latency of each over 1,000 requests differs by under 2 ms; a 1 MB `Authorization` header is a separate assertion: Node's parser (default max header 16 KB) answers 431 or closes the socket before any handler runs, so it cannot be byte-identical to the five causes; the test accepts 431 or a closed socket and then checks that the next normal request succeeds (the server stays up); token byte search in `iynk.db` and `-wal` after issuing (0); enrolment: 1,000 attempts without a code (all 401 or 429, `identities` stays empty), code reuse, expired code, `closed` mode; signature replay (challenge reused), signature from another key, DER signature, off-curve key; `X-Forwarded-For` spoof with `IYNK_TRUST_PROXY=0` does not change the limiter key; CORS `*` never sent; origin `https://evil.example` refused; a second enrolment of the same key; BA-09: a canary sent as a token, as `X-Iynk-Provider-Key`, as `enrollmentCode`, as a pairing code and as `displayName`, then every log line, the `diagnostics` bundle files and the response bodies are searched: 0 occurrences. Titles carry the row id, for example `C7 spoofed forwarded address`, `R-077 forged token`. |
| Data model, schemas, API | None. |
| Algorithm | As cases. Timing test uses real clock and the median, 1,000 requests per case, loopback. If the machine is busy the test retries once with the median of a second run (documented, not silent). |
| Validation, errors, edge cases | Timing test skipped never; under `CI=true` a missing service fails (roadmap 2.5). |
| Permissions, performance | Test run under 90 s (ESTIMATED). |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | These are the tests. |
| Integration | Real server via `http-helpers.ts`. |
| Playwright, fixtures | `server/test/keys.ts`. |
| Acceptance | BA-03 and BA-09 as above. |
| Observability | Asserts on logs. |
| Release blockers | Any case that passes with a distinguishable answer. |
| **DELIVERY** | |
| Definition of done | Green three times in a row on this machine (timing). |
| Verify commands | `SRVT`; `SRV1 identity.hostile.test.ts`; `SRV1 leak.test.ts`. |
| Documentation | None. |
| Rollback | Revert. |
| Later tasks need | The suite grows in B7 (rooms). |

### T-B6-12 Compose, Caddy, Next standalone

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-12, Deployment (F-198, R-079), B6 |
| Priority | P0 |
| Dependencies | T-B6-17, T-B6-06, T-B6-20 (`.dockerignore` is needed by the `context: ..` build) |
| Status | not started |
| **INTENT** | |
| Problem | Deploy files describe the old relay and the founders' VM. Self-hosting needs one command. |
| Target user | Amar and anyone who clones the repo. |
| User story | As Amar, `docker compose -f deploy/compose.yaml up` starts web, server and Caddy. |
| Expected behaviour | Three services: `web` (Next standalone), `server`, `caddy`. One origin. |
| Success metric | `docker compose -f deploy/compose.yaml config` exits 0 with `IYNK_DOMAIN` set; both images build (optional proof, F11). |
| **IMPLEMENTATION** | |
| Existing files changed | `next.config.ts:4-5` (add `output: "standalone"` in `nextConfig`; read `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md` first, VERIFIED present: it produces `.next/standalone/server.js`, needs `public` and `.next/static` copied by hand, honours `PORT` and `HOSTNAME`). `deploy/realtime/Caddyfile:4-7` moves to `deploy/Caddyfile` and changes: matcher `path /v1/* /ws /healthz /readyz`, proxy to `server:8787`; everything else to `web:3000`; `Cache-Control: no-store` on `/v1/*`; headers per SYS 12.1 (HSTS, nosniff, `Referrer-Policy`, `-Server`). `deploy/realtime/compose.yaml` and `deploy/realtime/Dockerfile` are deleted in this commit (the legacy relay is retired from deploy; its production host at rt.iynk.tech stays Amar's affair and is not touched). |
| New files | `deploy/compose.yaml`, `deploy/Dockerfile.web`, `deploy/Dockerfile.server`, `deploy/Caddyfile`. Edit: `next.config.ts`. Five source files. |
| Modules and signatures | `compose.yaml` per SYS 12.1: `name: iynk`; services `web` (build context `..`, `IYNK_SERVER_URL: https://${IYNK_DOMAIN}`, `expose: ["3000"]`; the value must be an absolute URL because T-B1-11 types `IYNK_SERVER_URL` as `url.optional()` and falls back to unset on a non-URL, so `/` would make `/config.json` return `server: null` and the app would never find its server; the web CSP needs no `IYNK_CONNECT_ORIGINS` because the server is same-origin behind Caddy), `server` (env `IYNK_DATA_DIR=/data`, `IYNK_ALLOWED_ORIGINS=https://${IYNK_DOMAIN}`, `IYNK_PUBLIC_URL=https://${IYNK_DOMAIN}`, `IYNK_HOST=0.0.0.0`, `IYNK_TRUST_PROXY=1`, `IYNK_ENROL=${IYNK_ENROL:-code}`, volume `iynk-data:/data`, `expose: ["8787"]`, `stop_grace_period: 15s`, healthcheck on `/healthz`), `caddy` (`caddy:2.11.7-alpine`; ports `${IYNK_HTTP_PORT:-80}:80`, `${IYNK_HTTPS_PORT:-443}:443`, `${IYNK_HTTPS_PORT:-443}:443/udp` for HTTP/3; volumes `caddy_data:/data` and `caddy_config:/config`, because the root filesystem is read-only and certificates and config would otherwise be lost or fail to write, as in the old compose lines 33-35). Top-level `volumes:` lists `iynk-data`, `caddy_data`, `caddy_config`. All three: `read_only: true`, `cap_drop: [ALL]`, `security_opt: ["no-new-privileges:true"]`, `mem_limit: 512m`, `tmpfs` (`server` and `caddy`: `[/tmp]`; `web`: `[/tmp, /app/.next/cache]`, because the read-only standalone server writes its Next cache under `.next/cache`), json-file log rotation as the old file (`deploy/realtime/compose.yaml:23-26`). No service listens on host ports 3000 or 43117. The engines volume of SYS 12.1 is omitted (engines arrive in B9; noted in a comment). `Dockerfile.server`: `node:24.22.1-alpine` (the tag the old Dockerfile pins, `deploy/realtime/Dockerfile:3`), copy `server/package.json`, `server/package-lock.json`, run `npm ci --omit=dev`, copy `server/src`, `server/bin`, `server/migrations`, `src/core`, `src/protocol`, then `RUN mkdir -m 700 /data && chown node:node /data` before `USER node` (a fresh named volume inherits the image directory's owner, so `/data` is writable by `node` and passes the mode 0700 check in config), `USER node`, `CMD ["node","server/src/main.ts"]` with `WORKDIR /app`; the image has no compiler. `Dockerfile.web`: multi-stage; build stage `npm ci` and `npm run build` with no keys; run stage copies `.next/standalone`, `public`, `.next/static`, `USER node`, `CMD ["node","server.js"]`, `HOSTNAME=0.0.0.0`. |
| Data model, schemas, API | None. |
| Algorithm | Caddy: `{$IYNK_DOMAIN}` site block; for a LAN or localhost test the guide shows `IYNK_DOMAIN=localhost` (Caddy issues a local certificate) and the override ports. |
| Validation rules | `IYNK_DOMAIN` is required (`:?` message). |
| Error conditions | `compose config` fails with a clear message when `IYNK_DOMAIN` is unset. |
| Edge cases | `output: "standalone"` and `NEXT_DIST_DIR` (`next.config.ts:8`): the Dockerfile builds with the default `.next`; `E2E` builds keep working because `distDir` is unchanged. The B1 CSP code in `next.config.ts` (T-B1-13) is edited by that earlier task; re-read the file before editing. A read-only root needs `/tmp` and `/app/.next/cache` as tmpfs for the `web` service. The `web` image has no secrets. |
| Permissions | Non-root users. |
| Performance | Image sizes recorded, not gated. |
| Migration | The old `deploy/realtime` directory goes. |
| **VERIFICATION** | |
| Unit tests | `deploy/compose.test.mjs` is not added (no new tooling); the config check is the proof. A vitest `scripts/deploy-config.test.mjs` is allowed: it parses `deploy/compose.yaml` text and asserts no `3000:` or `43117` host port, `read_only: true` on three services, the Caddy matcher line, that `IYNK_SERVER_URL` for `web` starts with `https://`, that caddy lists `caddy_data:/data` and `caddy_config:/config`, that `web` lists `/app/.next/cache` in `tmpfs`, and that the udp port line uses `${IYNK_HTTPS_PORT:-443}`; it also asserts `Dockerfile.server` has the `mkdir -m 700 /data` line before `USER node`. |
| Integration | `IYNK_DOMAIN=localhost docker compose -f deploy/compose.yaml config` exits 0. Optional by an agent, required by Amar at the gate: `docker compose -f deploy/compose.yaml build`. |
| Playwright | `E e2e/shell.spec.ts` (confirms `output: "standalone"` does not break the production build the e2e uses). |
| Fixtures | None. |
| Acceptance | Given `IYNK_DOMAIN` set, when `docker compose config` runs, then it exits 0 and prints three services. |
| Observability | Healthchecks. |
| Release blockers | A host port 3000 or 43117 in the file; a secret in an image layer. |
| **DELIVERY** | |
| Definition of done | Config validates; web build with standalone passes. |
| Verify commands | `TL`; `BUILD`; `E e2e/shell.spec.ts`; `IYNK_DOMAIN=localhost docker compose -f deploy/compose.yaml config`; `V scripts/deploy-config.test.mjs`; optional `docker compose -f deploy/compose.yaml build` (needs T-B6-20's `.dockerignore`). |
| Documentation | T-B6-14. |
| Rollback | Revert; the old deploy files return with the revert. |
| Later tasks need | Service names `web`, `server`, `caddy`; Caddy matcher; B7 adds `/ws` upgrade (already matched); B9 adds the engines mount and the compile service. |

### T-B6-20 Deploy extras

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-20, Deployment support, B6 |
| Priority | P1 |
| Dependencies | T-B6-01a |
| Status | not started |
| **INTENT** | |
| Problem | A build context of `..` would send `node_modules` and `.next` to Docker; compose needs an example env file; README paths still say `server/realtime` (F9). |
| Target user | Self-hoster. |
| User story | As Amar, I copy `deploy/.env.example`, set a domain, and go. |
| Expected behaviour | `.dockerignore`, `deploy/.env.example` (names and safe defaults only, no secret), README path fixes. |
| Success metric | `grep -rn "server/realtime" README.md deploy` prints nothing. |
| **IMPLEMENTATION** | |
| Existing files changed | `README.md:92` (Realtime line), `:122` (`cd server/realtime && npm ci && node server.js --port 43117`: becomes the new start command `node server/src/main.ts` with the env from `deploy/.env.example`, and a pointer to `docs/SELF_HOSTING.md`; port 43117 must not appear), `:145` (directory list). Re-grep first: T-B1-15 rewrites the README. |
| New files | `.dockerignore` (excludes `node_modules`, `.next*`, `.git`, `docs`, `e2e`, `test-results`, `playwright-report`, `data*`, `.env*`), `deploy/.env.example` (`IYNK_DOMAIN`, `IYNK_ENROL`, `IYNK_LOG_LEVEL`, `IYNK_HTTP_PORT`, `IYNK_HTTPS_PORT`, with comments). |
| Data, schemas, API, algorithm | None. |
| Validation | `.dockerignore` keeps `server`, `src/core`, `src/protocol`, `src`, `public`, `package*.json`. |
| Edge cases | `.env.example` at root is owned by earlier phases and untouched. |
| Permissions, performance, migration | None. |
| **VERIFICATION** | |
| Unit tests | None. |
| Integration | `grep` check above; `docker build --no-cache` is not required. |
| Playwright, fixtures | None. |
| Acceptance | As success metric. |
| Observability, blockers | A secret-looking value in `.env.example`. |
| **DELIVERY** | |
| Definition of done | Grep clean. |
| Verify commands | `TL`; `grep -rn "server/realtime" README.md deploy`. |
| Documentation | README. |
| Rollback | Revert. |
| Later tasks need | `deploy/.env.example` names (T-B6-14 documents them). |

### T-B6-09 Visibility: buddy data only to buddies; remove

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-09, Server buddies (R-081, CM-04, CM-06), B6 |
| Priority | P0 |
| Dependencies | T-B6-08 |
| Status | not started |
| **INTENT** | |
| Problem | A stranger must learn nothing about a person: no id, name, key or rows (D1, CM-04). |
| Target user | Everyone. |
| User story | As Amar, someone who is not my buddy gets the same 404 for my id as for a random id. |
| Expected behaviour | One function decides visibility from the current `buddies` rows. `GET`, `PATCH`, `DELETE /buddies/{identityId}` use it. Removing a buddy deletes the pair. |
| Success metric | CM-04 and CM-06 as tests; response bytes for a real stranger id and a random id are identical except `X-Request-Id`. |
| **IMPLEMENTATION** | |
| Existing files changed | `server/src/http/buddies.ts` (add `getBuddy`, `updateBuddy`, `removeBuddy` to `buddyRoutes`). |
| New files | `server/src/buddies/visibility.ts`. Tests: `server/test/visibility.test.ts`, `server/test/buddies.http.test.ts`. |
| Modules and signatures | `export function areBuddies(tx: Tx, a: string, b: string): boolean`; `export function visibleBuddy(tx: Tx, viewer: Authed, identityId: string): BuddyView \| null` (null for a stranger, for a random id, for oneself, for a revoked device and for an identity with `deletion_requested_at` set); `export function removeBuddy(tx: Tx, viewer: Authed, identityId: string): boolean` (deletes the row; idempotent: 204 whether or not it existed, so the call is no oracle); `export function setAlias(tx: Tx, viewer: Authed, identityId: string, alias: string \| null): BuddyView \| null`. |
| Data model | `buddies`, `alias_a`/`alias_b`. |
| Input schema | `BuddyPatch` (`alias` at most 60 characters, at least one field). |
| Output schema | `Buddy`; `online` is `true` or `false` from `last_seen_at` within 2 minutes when the buddy has `show_online=1`, else `null`; `activity` always `null` in B6 (rooms are B7); the buddy list of someone else is never exposed (no "friends of friends"). |
| API contracts | `getBuddy` 200 or 404; `updateBuddy` 200, 400, 404; `removeBuddy` 204. |
| Algorithm | Stranger and unknown id go through the same SQL shape and the same 404 body. Removal: delete the pair in a transaction. Hooks for B7 (rooms close, shares become unreadable, board rows vanish) are not built; the function is the single place B7 extends (CM-06 is completed in B7; the B6 part is "both lists drop the pair"). |
| State transitions | active -> removed. A new pairing can re-link them. |
| Validation rules | Alias stripped like names. |
| Error conditions | 400, 404. |
| Edge cases | Viewer asks about own id (404); buddy whose device was revoked (404 and dropped from the list); both sides remove at once; alias set to empty string clears it. |
| Permissions | Device. |
| Performance | One indexed lookup. |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `visibility.test.ts`: three devices A, B (paired), C (stranger): C asks for A's id, A's name, A's key thumbprint: all 404 equal to a random id (CM-04); list of C is empty; B sees A but not A's other buddies; revoked and deleting identities invisible. CM-06 B6 half: A removes B, both lists drop the pair; B's `GET /buddies/A` is now 404. |
| Integration | `buddies.http.test.ts` over HTTP, three real keys. |
| Playwright, fixtures | `server/test/keys.ts`. |
| Acceptance | CM-04 as written in COMMUNITY. |
| Observability | `buddy_removed` line (no ids). |
| Release blockers | Any byte difference between stranger and random-id answers. |
| **DELIVERY** | |
| Definition of done | Tests green. |
| Verify commands | `TL`; `SRVT`; `SRV1 visibility.test.ts`; `SRV1 buddies.http.test.ts`; `SRV1 route-registry.test.ts`; `PORT`. |
| Documentation | None. |
| Rollback | Revert. |
| Later tasks need | `visibleBuddy`, `removeBuddy`; B7 extends removal with room and share cascades, and block handling stays client-side (CM-30, T-B6-11). |

### T-B6-23 Sweep and identity deletion

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-23, Server lifecycle (F-168, CM-31, BE 7.4), B6 |
| Priority | P0 |
| Dependencies | T-B6-18, T-B6-08 |
| Status | not started |
| **INTENT** | |
| Problem | Expired sessions, codes and pairings pile up. "Leave server" must really remove a person after the grace. No roadmap task owned either. |
| Target user | Self-hoster; a friend who leaves. |
| User story | As a friend, I press Leave server and the server forgets me. |
| Expected behaviour | An hourly sweep deletes expired rows; a deletion request hides the identity from buddies at once, keeps the owner able to sign in and cancel, and deletes it after the grace. |
| Success metric | CM-31: after the grace, the server holds no row for the identity. |
| **IMPLEMENTATION** | |
| Existing files changed | `server/src/app.ts` (`allRoutes`: add `deletionRoutes`), `server/src/main.ts` (start the sweep timer after listen, stop it on drain). |
| New files | `server/src/identity/deletion.ts`, `server/src/http/deletion.ts`, `server/src/ops/sweep.ts`. Tests: `server/test/sweep.test.ts`, `server/test/deletion.test.ts`. |
| Modules and signatures | `deletion.ts`: `export function requestDeletion(tx: Tx, deps: Deps, who: Authed, graceHours: number): { status: "scheduled"; requestedAt: number; effectiveAt: number }` (the route passes `config.deletionGraceHours`; `effectiveAt = requestedAt + graceHours * 3_600_000`); `export function cancelDeletion(tx: Tx, who: Authed): boolean`; `export function purgeDue(tx: Tx, now: number): number` (deletes `devices` rows whose `deletion_at <= now`; foreign keys cascade sessions, pairings and buddies, and `ON DELETE SET NULL` on `enrollment_codes.used_by` and `pairings.used_by` keeps the code and pairing rows of other people intact, 4.3). `http/deletion.ts`: `export function deletionRoutes(ctx: RouteDeps): RouteDef[]` (`requestDeletion` 202 `DeletionStatus`, `cancelDeletion` 204). The handler checks that `body.confirm === "delete " + who.name`, else 400 `bad_request` with `details[0].path` `/confirm`; the body has exactly one key. `sweep.ts`: `export function sweepOnce(store: ServerStore, deps: Deps): { sessions: number; codes: number; pairings: number; identities: number }`; `export function startSweep(store, deps, log, everyMs = 3_600_000): { stop(): void }`. |
| Data model | `devices.deletion_requested_at`, `devices.deletion_at` (4.3). |
| Input schema | openapi `DeletionRequest` (VERIFIED `schemas/openapi.yaml:3335-3343`): `{ "confirm": string }`, one required field, `additionalProperties: false`; `confirm` must equal `delete {displayName}` exactly. There is no grace field in the body: the grace is `config.deletionGraceHours` (`IYNK_DELETION_GRACE_HOURS`, default 24, `0` means now; T-B6-01b). |
| Output schema | `DeletionStatus` (VERIFIED `openapi.yaml:3344-3358`): `{ "status": "scheduled", "requestedAt": Timestamp, "effectiveAt": Timestamp }`, all three required, no other key (not `deleteAt`). Timestamps are ISO UTC strings in JSON. |
| API contracts | `requestDeletion` 202, `cancelDeletion` 204. |
| Algorithm | Request: set `deletion_requested_at = now` and `deletion_at = now + grace`; do not revoke sessions (openapi `DeletionStatus`: the owner can still sign in and cancel, and `DELETE /identities/me/deletion` is a device-class route that needs a token; T-B6-04 rejects a token only when `deletion_at <= now`). The identity disappears from buddies at once because T-B6-09 reads `deletion_requested_at`. `Authed.deleting` is true, so create-type routes (`POST /pairings`, T-B6-08) answer 403 `forbidden`. Grace 0 sets `deletion_at = now` and purges in the same transaction (the response still reports `effectiveAt = now`). Sweep deletes: `sessions` 7 days after `expires_at` or `revoked_at` (RC-13), `enrollment_codes` and `pairings` past `expires_at` (kept 1 day for the `expired` status, then deleted), identities with `deletion_at <= now`. `VACUUM` is never run by the sweep. |
| State transitions | active -> deletion requested -> purged, or -> active on cancel. |
| Validation, errors | 400 `bad_request` when `confirm` is missing or wrong; 409 if already requested (idempotent: returns the existing status). |
| Edge cases | Cancel after the grace (404); sweep during a request; owner deletes themselves (allowed; the next first device on an empty `owner`-less table becomes owner: documented in the guide); clock moves backwards. |
| Permissions | Device. |
| Performance | Sweep under 50 ms for hundreds of rows. |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `sweep.test.ts` with the fake clock: each table's rule at the boundary; sweep never touches live rows. `deletion.test.ts`: request body is `{ confirm: "delete <displayName>" }` (a wrong confirm is 400, extra keys 400) and the 202 body is exactly `{ status: "scheduled", requestedAt, effectiveAt }`; the grace comes from config (24 h gives `effectiveAt - requestedAt` = 86,400,000 ms; 0 purges at once); request hides at once (a buddy's `GET /buddies/{id}` is 404); the token still works after the request (`GET /identities/me` is 200), then `DELETE /identities/me/deletion` returns 204 and the buddy sees the identity again; `POST /pairings` while scheduled is 403; purge after grace removes device, sessions, pairings, buddy rows and the token stops working (CM-31 server half, grace 0 and grace 24 h); a device that redeemed an enrolment code and a pairing is purged with no `FOREIGN KEY constraint failed`, and both rows stay with `used_by` NULL; cancel restores. |
| Integration | Over HTTP with two paired keys. `sweep.test.ts` also purges a due device that redeemed a code and a pairing (the same `used_by` case). |
| Playwright, fixtures | `server/test/keys.ts`. |
| Acceptance | CM-31: given Leave server confirmed, when the grace passes, then a listing of the identity's id, pairs and rows is empty. |
| Observability | `swept` line with counts; `identity_deleted` (no ids). |
| Release blockers | Orphan rows after purge (foreign keys on). |
| **DELIVERY** | |
| Definition of done | Tests green. |
| Verify commands | `TL`; `SRVT`; `SRV1 sweep.test.ts`; `SRV1 deletion.test.ts`; `SRV1 route-registry.test.ts`; `PORT`. |
| Documentation | Guide text in T-B6-14. |
| Rollback | Revert. |
| Later tasks need | `sweepOnce` (B7 adds room, share and blob sweeps). |

### T-B6-10 Buddies page

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-10, Frontend (F-138, R-080, R-081, CM-01 to CM-07), B6 |
| Priority | P0 |
| Dependencies | T-B6-11, T-B6-19a, T-B6-21, T-B6-09, T-B6-05, T-B3-02 (the opener `BuddiesPage` passes to `idbKeyStore` and `idbProfileStore`) |
| Status | not started |
| **INTENT** | |
| Problem | Friends need a page to enrol, pair and see each other. The old public buddy pool is gone (T-B0-16). |
| Target user | Amar and his friends. |
| User story | As a friend, I open Buddies, type the code Amar gave me, and see him in my list. |
| Expected behaviour | The eight states of COMMUNITY 3.4. Pair by typed code, by link or by QR. Rename, remove, block. |
| Success metric | CM-01 to CM-07 in Playwright with two browser contexts; axe zero serious or critical on the page. |
| **IMPLEMENTATION** | |
| Existing files changed | `src/app/[lang]/together/page.tsx:56` (`<Lobby items={items} />`: add `<BuddiesPage />` as its own section); `src/app/[lang]/together/Lobby.tsx` (after T-B0-16 the `<Buddies>` slot at `:172` is gone; mount point and section index; re-read the file). The page shell, `PageHead` and `Lobby` stay (RC-68). |
| New files | `src/components/buddies/BuddiesPage.tsx`, `BuddyList.tsx`, `PairDialog.tsx`. Tests: `BuddyList.test.tsx`, `PairDialog.test.tsx`, `BuddiesPage.test.tsx`; spec `e2e/buddies.spec.ts`. |
| Modules and signatures | `BuddiesPage(): JSX.Element` (client component; reads `ServerState` and the client from a small provider created inside the file; uses `useTogetherT()` keys `buddies.*`; builds `idbKeyStore(openIynkDb)` and `idbProfileStore(openIynkDb)` with the T-B3-02 opener, since `src/server-client` may not import `src/local`). `BuddyList({ buddies, offlineAsOf, onRename, onRemove, onBlock }: Props)`. `PairDialog({ client, onPaired }: Props)` with two tabs: Show a code (calls `createPairing`, shows `XXXX-XXXXXX` in large type, a copy-link button using `pairLink(location.origin, token)`, the `QrCode` from `src/components/realtime/InviteDialog.tsx:22` for the link, an expiry countdown, Cancel pairing) and Enter a code (field accepts the typed form or a pasted link; calls `peekPairing`, shows "<name> wants to be your buddy" with the person's name only, then `redeemPairing`). Enrolment form: `Enrol` fields code and name (reads `#enrol=` from `parseHash`). |
| Data model | `ServerProfile.buddyCache` updated on every successful list. |
| Input and output schemas | As client. |
| API contracts | 4.3. |
| Algorithm | States: no server; insecure context; not enrolled (enrol form); empty ("Add a buddy", "Enter a code"); list; pairing open; new buddy ("<name> joined" with the key fingerprint, the first 8 characters of `keyThumbprint`); unreachable (cached list labelled offline, actions disabled with a reason); unknown browser (token revoked). The list polls `listBuddies` every 15 s only while the tab is visible and the page is open (no timer when hidden). A pairing in progress polls `listPairings` every 3 s to show "<name> joined". Block calls `blockBuddy` after a confirm dialog. No search field anywhere. |
| State transitions | As above. |
| Validation rules | Code field uses `parsePairingCode` and shows `buddies.pair.wrong` for any server 404 (one generic text; the UI never says which cause). After the server's 5th strike the UI shows the same generic text. |
| Error conditions | Network failure becomes the unreachable state. |
| Edge cases | Hash `#enrol=` present with a server not set (state says set the server first); hash `#/pair/<token>` while signed out (enrol first, then redeem); reload during a pairing; two tabs; a buddy with the same name as another (show alias, then name, then the short thumbprint); long names; 64-buddy limit message; phone width 360 px. |
| Permissions | Local. |
| Performance | No polling when hidden. |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | Component tests with a fake `ServerClient`: each of the eight states renders its text and controls (CM-07); buddy list shows alias before name; remove asks for confirmation; PairDialog shows the code, the QR, the countdown from the fake clock; wrong code shows one generic message; labels and keyboard operation (Tab, Enter, Escape). |
| Integration | None. |
| Playwright | `e2e/buddies.spec.ts` with the T-B6-21 harness: Amar context (owner code from `init`) and friend context (`enrol` code) on `http://localhost:${E2E_PORT}/en/together`. Every context is created with `browser.newContext()` and immediately `await distinctAddress(context)` (T-B6-21), so each has its own limiter address and the `identity.register` (5 per minute) and `pairing.guess` (10 per minute) buckets are never shared. (1) CM-01 both enrol, no email or password field exists; (2) Amar opens Add a buddy, reads the typed code, friend enters it, both lists show each other with names; (3) CM-03 friend 2 tries 5 wrong codes on a third pairing, then the right secret fails and the link works; friend 2's context makes 8 `pairing.guess` calls in the minute (5 wrong peeks, 1 peek with the right secret on the deleted code, link peek, link redeem), under the limit of 10, so no 429 appears; the test asserts no 429 on those 8; (4) Amar removes the friend and both lists drop the pair (CM-06 B6 half); (5) CM-04: a third context enrolled but unpaired sees an empty list; (6) CM-02: a context loaded over a non-secure origin is not feasible on `localhost` (secure), so CM-02 is covered by the unit test; (7) call `stopServer()` (T-B6-21: kills the pid in `${E2E_SERVER_DATA}/pid`) mid-test: the page shows the cached list labelled offline and `pageerror` count is 0; (8) `@axe-core/playwright` on the page in the list, empty and pairing-open states: 0 serious or critical. Viewport 360 px for states 2 and 8. |
| Fixtures | Harness helpers. |
| Acceptance | M1 step 9 first half: Given a server and two browsers, when Amar enrols, the friend enrols and they pair, then each sees the other. |
| Observability | None. |
| Release blockers | A stranger-visible list; a console error with the server stopped. |
| **DELIVERY** | |
| Definition of done | Unit and e2e green. |
| Verify commands | `TL`; `V src/components/buddies src/server-client`; `E e2e/buddies.spec.ts`; `E e2e/keyless.spec.ts`. |
| Documentation | None. |
| Rollback | Revert. |
| Later tasks need | `BuddiesPage` section for "Work together" in B7; the buddy menu has the entries "Work together" and "Shared with me" hidden until B7. B13 must move `QrCode` out of `InviteDialog.tsx` before it deletes that file. |

### T-B6-14 Drills and the self-hosting guide

| Field | Content |
|---|---|
| **IDENTITY** | |
| ID, subsystem, phase | T-B6-14, Operations and docs (F-198, R-079, R-098, BA-13), B6 |
| Priority | P0 |
| Dependencies | T-B6-01a to T-B6-13, T-B6-17 to T-B6-23 (including 19a and 19b), T-B6-20 |
| Status | not started |
| **INTENT** | |
| Problem | `docs/SELF_HOSTING.md` is a stub (T-B1-18: "the server arrives in B6"). Backup, restore, upgrade and shutdown have never been run. |
| Target user | Amar on a clean machine. |
| User story | As Amar, I follow only the guide and finish with two paired browsers. |
| Expected behaviour | A drill script runs backup, restore, upgrade with a migration and rollback, and graceful shutdown on a temp directory. The guide is real text. |
| Success metric | `bash server/scripts/drill.sh` exits 0; BA-13 is Amar's run of the guide. |
| **IMPLEMENTATION** | |
| Existing files changed | `docs/SELF_HOSTING.md` (replace the stub), `server/src/cli/commands.ts` (small fixes the drills expose, for example `restore` messages; no new command). |
| New files | `server/scripts/drill.sh`. Tests: none beyond the script. |
| Modules and signatures | `drill.sh` (bash, `set -euo pipefail`, temp dir with `mktemp -d`, mode 0700, picks a free port in 40000 to 49999 skipping 43117): 1. `init`, start the server in the background, enrol two scripted devices (a shell script cannot use `server/test/keys.ts`, so the script runs `node server/scripts/drill-client.mjs` for the HTTP steps; the new files are `drill.sh` and `drill-client.mjs`); pair them. 2. `backup` while running, stop, `restore` into a second temp dir, start there: both identities and the buddy pair are present. 3. Upgrade drill: the server has no setting for the migrations directory (`ServerConfig` has none; `openStore` gets `migrationsDir` from code), so the script copies `server/src`, `server/bin`, `server/migrations` and `src/core`, `src/protocol` into a temp root keeping their relative layout (relative imports keep working), drops `9999_drill.sql` into that copy's `server/migrations/`, and starts `node <temp>/server/src/main.ts` from there: the pre-migration backup exists and the new migration applied; roll back: stop, copy the backup over `iynk.db`, delete `-wal` and `-shm`, start the old directory: it runs. A database newer than the binary is refused. 4. `SIGTERM`: `/healthz` returns 503 `draining: true`, process exits 0 within 15 s. Prints a table of PASS and FAIL lines and exits non-zero on any FAIL. |
| `docs/SELF_HOSTING.md` outline | Requirements (Docker or Node 24, a domain or localhost, ports); one command (`cp deploy/.env.example deploy/.env`, edit, `docker compose -f deploy/compose.yaml up -d`); first run (`docker compose exec server node server/bin/iynk-server.ts init`); point the app at the server (Settings, Server address); enrol a friend; pair; HTTPS requirement for keys (CM-02) and localhost exception; operating (`devices`, `revoke`, `backup`, `restore`, `compact`, `diagnostics`); backup and restore steps; upgrade and rollback; graceful shutdown; exposed-to-the-internet checklist (TLS only, `IYNK_ENROL=closed` after friends enrolled, metrics unreachable, scheduled backups, three cron checks from BE 13.5); `IYNK_STORE_SYNC` and the macOS numbers from T-B6-03; `IYNK_DELETION_GRACE_HOURS` (default 24, `0` = at once) and what Leave server does during the grace (hidden from buddies, can still sign in and cancel); a sentence on addresses: "A server address pasted into Settings works only if it is the same origin as the app or is listed in `IYNK_CONNECT_ORIGINS` on the web app; otherwise the browser blocks the call and the app says the server is unreachable"; data handling pointer to `docs/DATA_HANDLING.md`; uninstall; a "what the operator can read" paragraph (names, pairs; no chat or project text in B6) per COMMUNITY 3.3. |
| Data, schemas, API | None. |
| Validation | The guide uses only commands that exist; a test greps each `iynk-server` command in the guide against `COMMANDS` (exported by `commands.ts`, T-B6-06). |
| Edge cases | macOS versus Linux `stat` flags in the script; `kill -TERM` timing; leftover processes (trap EXIT kills them). |
| Permissions | Temp dir only. |
| Performance | Drill under 60 s. |
| Migration | None. |
| **VERIFICATION** | |
| Unit tests | `server/test/guide-commands.test.ts`: every `iynk-server <command>` mentioned in `docs/SELF_HOSTING.md` is an element of `COMMANDS` (T-B6-06). The test never calls `run()` with a command, because that would execute it; at most it calls `run(["--help"])`, which prints `COMMANDS` and touches nothing. |
| Integration | `bash server/scripts/drill.sh` all PASS. |
| Playwright | None. |
| Acceptance | BA-13 (Amar's run): Given a clean machine and only the guide, when backup, restore, upgrade, rollback and shutdown are done, then all pass. |
| Observability | Drill output table. |
| Release blockers | A guide step that fails when copied verbatim. |
| **DELIVERY** | |
| Definition of done | Drill green; guide reviewed against M1 step 9 (start the server, enrol, pair). |
| Verify commands | `TL`; `SRVT`; `SRV1 guide-commands.test.ts`; `bash server/scripts/drill.sh`. |
| Documentation | This task is the documentation. |
| Rollback | Revert. |
| Later tasks need | The guide skeleton; B7 adds rooms and the reconnect drill; B14 adds AI relay settings. |

Note on T-B6-14's file count: `drill.sh`, `drill-client.mjs`, `SELF_HOSTING.md`, `commands.ts` = 4 source files.

## 6. Parallel groups

Groups run in order. Inside a group the tasks touch disjoint files (checked against section 7). A task starts only when its dependencies are committed.

| Group | Tasks | Why they are disjoint | Gate before the next group |
|---|---|---|---|
| G1 | T-B6-01a, then T-B6-01b (01b depends on 01a) | Moves the relay and edits root configs; nothing else may run | `TL`, `SRVT`, `SRV`, legacy 39 green, `grep -rn "server/realtime" src` empty |
| G2 | T-B6-15, T-B6-02, T-B6-13, T-B6-07 | Separate folders: `src/core` stub and ADR, `server/src/store` and `migrations`, `server/src/ops/log.ts`, `server/src/http/{classes,router,limits,errors}.ts` | Spike result recorded; `SRV` green |
| G3 | T-B6-16, T-B6-03, T-B6-17, T-B6-19a, T-B6-19b, T-B6-20 | `src/protocol/{identity.ts,package.json}` (16 needs the G2 `src/core` stub), `server/scripts`, `server/src/{app,main}.ts` + `http/{server-info,health}.ts`, `together.json` x6, `common.json` x6, `.dockerignore` + `deploy/.env.example` + `README.md` | `SRV`, `V src/protocol`, `V src/i18n` green |
| G3b | T-B6-04, T-B6-05 | `server/src/identity`, `server/test/keys.ts`; `src/server-client/{keys,auth,client,types,links}.ts`. Both need T-B6-16 (G3) | `SRV`, `V src/server-client` green |
| G4 | T-B6-18, T-B6-06, T-B6-11 | `server/src/http/{auth,identities}.ts` + `app.ts`, `server/{bin,src/cli}`, `src/server-client/{profile,probe}.ts` + settings components | A scripted client can enrol over HTTP |
| G5 | T-B6-08, T-B6-21, T-B6-22, T-B6-12 | `server/src/buddies`, `http/buddies.ts` + `app.ts`; `playwright.config.ts` + `e2e/server-harness.ts` + `e2e/server-run.mjs` (and a test-only edit of `e2e/keyless.spec.ts`); tests only; `deploy/*` + `next.config.ts` (T-B6-12 needs T-B6-20 from G3) | `SRV` green; `docker compose config` valid |
| G6 | T-B6-09, T-B6-23 | `server/src/buddies/visibility.ts` + `http/buddies.ts`; `server/src/identity/deletion.ts`, `http/deletion.ts`, `ops/sweep.ts`, `app.ts`, `main.ts` | CM-04, CM-06, CM-31 server tests green |
| G7 | T-B6-10 | UI and e2e | `E e2e/buddies.spec.ts` green |
| G8 | T-B6-14 | Docs and drills; reads everything | `drill.sh` green |
| Gate | Phase gate (section 8) | Orchestrator | Then Amar's OK |

`server/test/helpers.ts` (T-B6-02), `server/test/keys.ts` (T-B6-04) and `server/test/http-helpers.ts` (T-B6-17) are created once and only read afterwards. `e2e/keyless.spec.ts` is extended by T-B6-11 (G4, the no-address case) and T-B6-21 (G5, the closed-port case); the cases are separate `test()` blocks.

## 7. File ownership

A file has one owner per group. Where a later task edits an earlier task's file, the later group is listed.

| File | Task (group) |
|---|---|
| `server/legacy/**` (moved), `tsconfig.json` (root, `exclude`), `src/lib/realtime/relay.integration.test.ts`, `src/lib/realtime/protocol.ts:2` (comment) | T-B6-01a (G1) |
| `server/package.json`, `server/package-lock.json`, `server/tsconfig.json`, `server/src/config.ts`, `package.json` (root scripts), `tsconfig.portable.json` (remove `server` from `include`) | T-B6-01b (G1) |
| `src/core/package.json`, `ADR-0014` note, `server/test/shared-import.test.ts`, `server/test/fixtures/import-core.ts` | T-B6-15 (G2) |
| `src/protocol/identity.ts`, `src/protocol/package.json` | T-B6-16 (G3) |
| `server/src/deps.ts`, `server/src/store/{port,sqlite,migrate}.ts`, `server/migrations/0001_identity.sql`, `server/test/helpers.ts` | T-B6-02 (G2) |
| `server/src/ops/log.ts` | T-B6-13 (G2) |
| `server/src/http/{classes,router,limits,errors}.ts` | T-B6-07 (G2) |
| `server/scripts/bench-store.mjs` | T-B6-03 (G3) |
| `server/src/identity/{enrol,challenge,tokens,devices}.ts`, `server/test/keys.ts` | T-B6-04 (G3b) |
| `server/src/app.ts` | T-B6-17 (G3), T-B6-18 (G4), T-B6-08 (G5), T-B6-23 (G6) |
| `server/src/main.ts` | T-B6-17 (G3), T-B6-23 (G6) |
| `server/src/http/{server-info,health}.ts`, `server/test/http-helpers.ts` | T-B6-17 (G3) |
| `src/server-client/{keys,auth,client,types,links}.ts` | T-B6-05 (G3b) |
| `src/i18n/messages/*/together.json` | T-B6-19a (G3) |
| `src/i18n/messages/*/common.json` | T-B6-19b (G3) |
| `server/src/http/{auth,identities}.ts` | T-B6-18 (G4) |
| `server/bin/iynk-server.ts`, `server/src/cli/diagnostics.ts` | T-B6-06 (G4) |
| `server/src/cli/commands.ts` | T-B6-06 (G4), T-B6-14 (G8) |
| `src/server-client/probe.ts`, `src/server-client/profile.ts`, `src/components/settings/ServerPanel.tsx`, `src/components/settings/index.ts`, `src/components/shell/SettingsMenu.tsx` | T-B6-11 (G4) |
| `e2e/keyless.spec.ts` | T-B6-11 (G4), T-B6-21 (G5) |
| `server/src/buddies/{pairing,list}.ts` | T-B6-08 (G5) |
| `server/src/http/buddies.ts` | T-B6-08 (G5), T-B6-09 (G6) |
| `playwright.config.ts`, `e2e/server-harness.ts`, `e2e/server-run.mjs`, `e2e/server-harness.spec.ts` | T-B6-21 (G5) |
| `server/test/identity.hostile.test.ts`, `server/test/leak.test.ts` | T-B6-22 (G5) |
| `deploy/compose.yaml`, `deploy/Dockerfile.web`, `deploy/Dockerfile.server`, `deploy/Caddyfile`, `next.config.ts`, deleted `deploy/realtime/*` | T-B6-12 (G5) |
| `.dockerignore`, `deploy/.env.example`, `README.md` | T-B6-20 (G3) |
| `server/src/buddies/visibility.ts` | T-B6-09 (G6) |
| `server/src/identity/deletion.ts`, `server/src/http/deletion.ts`, `server/src/ops/sweep.ts` | T-B6-23 (G6) |
| `src/components/buddies/{BuddiesPage,BuddyList,PairDialog}.tsx`, `src/app/[lang]/together/page.tsx`, `src/app/[lang]/together/Lobby.tsx`, `e2e/buddies.spec.ts` | T-B6-10 (G7) |
| `server/scripts/drill.sh`, `server/scripts/drill-client.mjs`, `docs/SELF_HOSTING.md` | T-B6-14 (G8) |

Files other phases own and this phase only reads: `src/server-client/probe.ts` creation (T-B1-11), `src/local/db.ts` (T-B3-02; only UI files import it), `src/core/sha256.ts` (T-B2-03), `src/project/migrate.ts` (T-B2-09; read as text by one server test), `tsconfig.portable.json` (T-B2-01; T-B6-01b edits one line), `src/components/realtime/InviteDialog.tsx` (existing, read).

## 8. Phase gate

The orchestrator runs these after G8, then stops for Amar's OK.

| # | Check | Command or action | Pass |
|---|---|---|---|
| 1 | Whole check | `npm run check` (after T-B6-01b it includes `server:typecheck` and `server:test`) | green, keyless |
| 2 | Server tests | `npm run server:test` | all green; legacy 39 of 39 |
| 3 | Portable typecheck | `npx tsc -p tsconfig.portable.json` (portable folders only; `server/` is typed by row 1's `server:typecheck`) | green |
| 4 | BA-01 | `SRV1 cli.test.ts` | 6 of 6 refusals |
| 5 | BA-02 | `SRV1 shared-import.test.ts`, `V src/protocol/identity.test.ts` and `BUILD` | no warning from plain `node` on `src/core` and `src/protocol` files; build passes |
| 6 | BA-03 | `SRV1 identity.hostile.test.ts` | 5 of 5; medians within 2 ms; 0 token matches in file bytes |
| 7 | BA-04 | `SRV1 pairing.test.ts` | all cases |
| 8 | BA-09 | `SRV1 leak.test.ts` and `SRV1 diagnostics.test.ts` | 0 canary matches |
| 9 | BA-11 | `SRV1 route-registry.test.ts` | pass; no `*` origin |
| 10 | CM-01 to CM-07, CM-31 | `E e2e/buddies.spec.ts`, `E e2e/keyless.spec.ts`, unit tests above | green |
| 11 | AR-16 | `E e2e/keyless.spec.ts` with the server stopped | 0 page errors |
| 12 | AR-11 | `SRV1 store.contract.test.ts` | pass (the nightly `better-sqlite3` run is not built in this phase) |
| 13 | Durability | `node server/scripts/bench-store.mjs --cycles 50` on macOS | 0 lost |
| 14 | Compose | `IYNK_DOMAIN=localhost docker compose -f deploy/compose.yaml config` | exit 0 |
| 15 | Drills | `bash server/scripts/drill.sh` | all PASS |
| 16 | No leftovers | `grep -rn "server/realtime" README.md deploy src docs/SELF_HOSTING.md` (VERIFIED today: hits in `README.md:92,122,145`, `deploy/realtime/*`, `src/lib/realtime/protocol.ts:2`, `relay.integration.test.ts:2,15,17,19`; T-B6-01a clears `src`, T-B6-20 clears the README, T-B6-12 deletes `deploy/realtime`) | empty |
| 17 | Amar | A1 and A2 in section 9 | his OK |

## 9. For Amar

These are not agent tasks.

| # | Item | Why it needs him |
|---|---|---|
| A1 | Run `node server/scripts/bench-store.mjs --cycles 50 --sync full` and `--sync normal` on the Linux host he will use, and choose `synchronous=FULL` or `normal` (RC-01, AX-05, AR-10). | Needs his host. The macOS number is not a Linux number. |
| A2 | Follow `docs/SELF_HOSTING.md` on his own machine only from the text: start the server, enrol two browsers (his own and a second profile or a friend's), pair them (BA-13, the gate). | The guide must work for a person who did not write it. |
| A3 | Accept or overrule D-018 to D-021 and the RC items in `RECONCILIATION.md` before B6 starts (roadmap section 6 item 11). | They are orchestrator decisions. |
| A4 | Give a real HTTPS name (or confirm localhost-only) for any friend on another machine. A plain `http://` address on a LAN cannot make a key (CM-02, roadmap risk R3). | Needs his domain or network. |
| A5 | Decide whether to build the two Docker images (`docker compose -f deploy/compose.yaml build`) at the gate. Agents only validate the config. | Time and disk on his machine. |
| A6 | Skim the Hindi and Chinese strings of the Buddies page and server panel. | Machine translation of short interface text can change meaning; he reads or knows the people who do. |
| A7 | Production relay at rt.iynk.tech is unchanged by this phase. Retire or keep it when B13 deletes the old relay. | Production is his affair. |

## 10. Open questions and unknowns

| # | Question | Label | Proposed handling |
|---|---|---|---|
| O-1 | B6 needs `src/local/db.ts` from T-B3-02 for the `identity` and `server` stores. If Amar moves B6 before B3 (roadmap section 4 allows it) there is no database. | UNKNOWN | Then T-B6-11 first builds a minimal opener for database `iynk` version 1 with only those two stores, and T-B3-02 adopts it. The orchestrator decides at the stop before B6. |
| O-2 | T-B6-15 may fail (stub packages break Turbopack or vitest). | HYPOTHESIS that it passes | Fallbacks are in the task. |
| O-3 | BE 5.1 says registration returns the instance role; openapi `Identity` has no role field and forbids extra properties. | VERIFIED | openapi wins (R4). The role is not returned. The owner sees it with `iynk-server devices`. |
| O-4 | Contract text to fix: (a) `IdentityRegister.enrollmentCode` pattern should also allow the 22-character link form; (b) enrolment and pairing links use `/together#...` here, the docs say `/#...`; (c) `PairingCreated.url` host; (d) add `IYNK_DELETION_GRACE_HOURS` (PROPOSAL, default 24, `0` = now) to BE 13.1 and to API 5.4 as the operator's grace; (e) BE 6.4 line 270 and the `pairings` table: `used_by` gets `ON DELETE SET NULL`. | VERIFIED | A doc fixer edits openapi, API 5.1, BE 6.3, BE 13.1 and BE 6.4. The code follows the plan text above. |
| O-5 | Strike rule for typed enrolment codes (RC-18 leaves it to ADR-0424). | UNKNOWN | B6 relies on the `identity.register` bucket (5 per minute per address) over 60 bits. ESTIMATED sufficient for friends-sized use. |
| O-6 | `IYNK_MAX_IDENTITIES` is not in BE 13.1; R-078 names `IYNK_MAX_DEVICES` and `IYNK_MAX_DATA_BYTES` as PROPOSAL names and a `server_full` error. | UNKNOWN | B6 uses `IYNK_MAX_IDENTITIES` (default 100, API 4.8) and answers 409 `quota`. `server_full` and the data-bytes cap arrive with B7 storage limits. |
| O-7 | openapi `Health` and BE 5.1 disagree. | VERIFIED | BE 5.1 body (`ok`, `draining`, `store`) per its own note. |
| O-8 | Idempotency-Key replay (API 4.6) has no table in BE 6.4. | UNKNOWN | Not built in B6. Duplicate `POST /pairings` makes two pairings (bounded by quota); duplicate `POST /identities` with a used code is 401. Decide in B7 whether to add the table. |
| O-9 | BE 14 plans generated Ajv validators from `server/schemas/*.json`; B6 uses hand checks per route. | UNKNOWN | Hand checks keep the server dependency-free. Revisit when B7 adds large op schemas. |
| O-10 | CM-30 says a server-side block is not claimed; block is client-enforced. | DOCUMENTED | Built that way in T-B6-11. |
| O-11 | BA-04 wording says a wrong code five times "deletes the pairing"; API 5.3 rule 2 and CM-03 say the code is deleted and the link stays. | VERIFIED | The code is deleted, the link stays (R4). Test asserts both. |
| O-12 | `docker compose build` and the Linux commit numbers are not run by agents. | UNKNOWN | A1, A5. |
| O-13 | `ws` is not added in B6; the roadmap B6 card lists it as a dependency. | VERIFIED | B7's first server task adds it. |
| O-14 | After Leave server the browser keeps its device key until `effectiveAt`, so the person can sign in and cancel (review fix 2). CM-31 says local data is cleared "after the grace" for the server side only. | HYPOTHESIS that this is what Amar wants | T-B6-11 `leaveServer` keeps the key until `effectiveAt`; with grace 0 it deletes the key at once. |
| O-15 | `maxHeaderSize` is Node's default (16 KB). The hostile suite asserts 431 or a closed socket for a 1 MB header, not a byte-identical 401. | VERIFIED by reading the Node default | No `main.ts` setting added. |

## 11. Traceability

| Item | Where |
|---|---|
| F-005 | T-B6-04, 05, 18 |
| F-138 | T-B6-08, 09, 10 |
| F-165 (SQLite part) | T-B6-02, 03 |
| F-198 | T-B6-12, 14, 20 |
| F-199 | T-B6-01b, 06, 17 |
| F-206 | T-B6-04, 05, 08, 16 |
| R-077 | T-B6-04, 05, 18, 22 |
| R-078 | T-B6-01b, 06, 13, 17 |
| R-079 | T-B6-11, 12, 14 |
| R-080 | T-B6-08, 09, 10 |
| R-081 | T-B6-09, 10 |
| R-083 | T-B6-02, 03 |
| R-097 (identity rows) | T-B6-22 |
| R-098 | T-B6-06, 13, 14, 17 |
| BA-01 | T-B6-01b, 02, 06 |
| BA-02 | T-B6-15 |
| BA-03 | T-B6-04, 22 |
| BA-04 | T-B6-08 |
| BA-09 | T-B6-13, 22, 06 |
| BA-11 | T-B6-07, 17 |
| BA-13 | T-B6-14 and A2 |
| CM-01, CM-02 | T-B6-05, 10 |
| CM-03, CM-05 | T-B6-08, 10 |
| CM-04, CM-06 | T-B6-09, 10 |
| CM-07 | T-B6-10, 11 |
| CM-30 | T-B6-11 |
| CM-31 | T-B6-11, 23 |
| AR-11 | T-B6-02 |
| AR-16 | T-B6-11 |
| AR-10 | T-B6-03 and A1 |
| RC-01, 02, 03 | T-B6-02, 03 |
| RC-14, 15, 17, 18, 19 | T-B6-01b, 04, 06, 08 |
| RC-22, 23, 24, 30 | T-B6-12, 17 |
| RC-69 order (enrolment, key, token, pairing) | G3 to G5 order |

Totals: 25 tasks (the 23 of the first pass, with T-B6-01 and T-B6-19 each split in two), 9 groups (G3b added) plus the gate. Effort: the roadmap says best 3, expected 5, adverse 8 weeks for 14 tasks. The 9 added tasks are small (ESTIMATED +0.5 week), so the expected figure stays about 5 to 5.5 weeks; adverse risks stay the same (`node:sqlite` stability, Linux commit cost, the T-B6-15 spike).

## Review fixes (2026-10-27)

All 21 review issues were checked against the plan text and the cited files. All 21 apply; three are applied with a different mechanism than the review proposed (marked).

| # | Issue | Evidence checked | What changed |
|---|---|---|---|
| 1 | Deletion contract wrong | VERIFIED `schemas/openapi.yaml:3335-3358`: `DeletionRequest` has one required `confirm`; `DeletionStatus` is `{status:"scheduled", requestedAt, effectiveAt}`. `ServerConfig` and BE 13.1 have no grace variable. | 4.3 gets a "Deletion contract" paragraph. T-B6-23 and T-B6-11 use `{confirm: "delete <displayName>"}` and the three-field response. `requestDeletion(tx, deps, who, graceHours)` takes `config.deletionGraceHours`. T-B6-01b adds `deletionGraceHours` and `IYNK_DELETION_GRACE_HOURS` (PROPOSAL, default 24, `0` = now), O-4(d) adds it to BE 13.1. CM-31 test rewritten. T-B6-05 `requestDeletion(confirm)`. |
| 2 | Scheduled deletion blocks cancel | VERIFIED openapi `DeletionStatus` text and API 9: "can still sign in". | T-B6-04: `verifyToken` and login reject only `deletion_at <= now`. T-B6-23 no longer revokes sessions; create-type routes refuse via `Authed.deleting` (T-B6-07, T-B6-08, 403 `forbidden`). Test: request, token works, cancel returns 204. New O-14: the browser keeps its key until `effectiveAt`. |
| 3 | `used_by` foreign keys | VERIFIED BE 6.4:270 has no ON DELETE action; `foreign_keys=ON`. | 4.3 tables and `0001_identity.sql`: `used_by ... ON DELETE SET NULL` on both tables. Contract test (T-B6-02), `deletion.test.ts` and `sweep.test.ts` cover a device that redeemed a code and a pairing. O-4(e). |
| 4 | Compose `IYNK_SERVER_URL: /` | VERIFIED B1 line 379 (`url.optional()`) and 609. | `https://${IYNK_DOMAIN}`; `deploy-config.test.mjs` asserts the `https://` prefix. |
| 5 | `resolveServerUrl` field | VERIFIED B1 line 600: `{ server, protocol, modules }`. | Type `{ server?: string \| null }`, reads `.server`, test with `server` set. |
| 6 | `server-client` imports `local` | VERIFIED `SYSTEM_ARCHITECTURE.md:215`: row `server-client` imports `core` and `protocol` only. | `idbKeyStore(open)` and `idbProfileStore(open)` take an injected handle. T-B6-05 loses the `src/local/db.ts` read and the T-B3-02 dependency; T-B6-11 and T-B6-10 (UI) keep it. 4.2 gets a "Browser side" rule; T-B6-05 verifies with `V src/architecture.test.ts`. |
| 7 | T-B6-01 too big, PORT undecided | VERIFIED `tsconfig.portable.json` has `types: []` (B2 line 225) and includes `server`. | Split into T-B6-01a (move, root exclude, test path, `protocol.ts` comment: 2 source files plus a test) and T-B6-01b (`server/package.json`+lock, `server/tsconfig.json`, `config.ts`, `tsconfig.portable.json`, root `package.json`: 5). Decision: `server` leaves the portable include; `SRVT` types it. `PORT` shorthand and gate row 3 follow. Deviation: the root `package.json` scripts moved to 01b (the review put them in 01a), because scripts pointing at a missing `server/tsconfig.json` would break `npm run check` between the two commits. |
| 8 | Gate 16 cannot pass | VERIFIED by running the grep: hits in `protocol.ts:2`, `relay.integration.test.ts:2,15,17,19`, `README.md:92,122,145`, `deploy/realtime/*`. | T-B6-01a changes `relay.integration.test.ts:2` and `protocol.ts:2`; T-B6-20 clears the README; T-B6-12 deletes `deploy/realtime`. Gate row 16 lists who clears what. |
| 9 | T-B6-19 files | Roadmap 2.2 line 60 counts six copies of one namespace file as 1, so the old count was within the rule. | Split anyway by key group: T-B6-19a `buddies.*` (six `together.json`), T-B6-19b `server.*` (six `common.json`). Both cite roadmap 2.2 line 60 and K-I18N. Section 3 Source files column fixed. Dependents updated (T-B6-10 uses 19a, T-B6-11 uses 19b). |
| 10 | Register bucket in e2e | VERIFIED 4.3: `identity.register` 5 per minute per address; Playwright is `fullyParallel`. | T-B6-21: server runs with `IYNK_TRUST_PROXY=1`; `distinctAddress(context)` via `context.route` continue with a unique `x-forwarded-for`; `server-harness.spec.ts` asserts no 429. T-B6-10 uses it for every context and counts the 8 `pairing.guess` calls of the CM-03 case; T-B6-08 adds the same count to its unit test and an 11th-call 429 case. |
| 11 | CSP `connect-src` env | VERIFIED B1 D-B1-1: `IYNK_CONNECT_ORIGINS` drives CSP. | T-B6-21 web env: `IYNK_SERVER_URL` and `IYNK_CONNECT_ORIGINS` (server port and dead port); `IYNK_ALLOWED_ORIGINS` removed from the web entry. `server-harness.spec.ts` asserts 0 `securitypolicyviolation`. |
| 12 | Stopping the server | VERIFIED: the harness exported no stop function. | Mechanism chosen (not the closed-port alternative): `e2e/server-run.mjs` writes its pid to `${E2E_SERVER_DATA}/pid` and imports `main.ts`; `stopServer()` kills it. Listed in "Later tasks need"; T-B6-10 step 7 uses it. T-B6-21 grows to 3 source files. |
| 13 | `read` vs `verifyToken` writes | VERIFIED: `ServerStore.read` had no stated mode. | T-B6-02: `read` is deferred with `query_only`, a write throws, test added. T-B6-04: `verifyToken` returns `{ authed, touch }`, never writes; new `touchSession`. T-B6-18: `authenticate` runs `touchSession` in `transaction` at most once per 60 s, errors swallowed. 4.2 gets a "Transactions" rule. |
| 14 | 426 and `Iynk-Api-Version` | VERIFIED API_CONTRACTS lines 95-96 and 176. | T-B6-07: algorithm step 3b (426 unless the three probe routes), header `Iynk-Api-Version: 1.0` on every response, tests in `router.test.ts`, 426 in the error list. |
| 15 | `auth.token` second key | VERIFIED: one rule set per `BucketName`. | `auth.token.identity` (5 per minute) added to `BucketName`, the 4.3 rate table and `limits.test.ts`; `Limiter` exported; `RouteDeps` carries `limiter`; T-B6-18 uses it. |
| 16 | Compose gaps | Old compose lines 33-35 hold the caddy volumes (as the review states). | `caddy_data:/data`, `caddy_config:/config`; `RUN mkdir -m 700 /data && chown node:node /data` before `USER node`; `${IYNK_HTTPS_PORT:-443}:443/udp`; `web` tmpfs `[/tmp, /app/.next/cache]`; T-B6-20 is a dependency of T-B6-12 and moves to G3. Config test asserts each. |
| 17 | Drill and guide test | VERIFIED: `ServerConfig` has no migrations-dir setting. | `drill.sh` copies `server/{src,bin,migrations}` and `src/{core,protocol}` to a temp root and drops `9999_drill.sql` there. T-B6-06 exports `COMMANDS` and `--help`; `guide-commands.test.ts` checks against `COMMANDS` and never runs a command. The "4th file" sentence is removed. |
| 18 | T-B6-15 proves a missing file | VERIFIED: `src/protocol/identity.ts` does not exist before T-B6-16. | T-B6-15 fixture imports only `src/core/sha256.ts`; `src/protocol/package.json` moves to T-B6-16 with a plain-`node` spawn test. T-B6-16 now depends on T-B6-15 and moves to G3; T-B6-04 and T-B6-05 move to the new group G3b because they depend on T-B6-16. |
| 19 | `schemas.project` source | VERIFIED: `src/project/migrate.ts` is owned by T-B2-09 (B2 line 659), no stub exists. | Chose the hard-code option: `PROJECT_SCHEMAS = ["1.1"]`, `opSchema: "1.1"`, plus a test that reads `migrate.ts` as text and fails if `CURRENT_SCHEMA_VERSION` differs. T-B6-17 now depends on T-B6-01b, T-B6-15 and T-B2-09. No `src/project/package.json` stub is added. |
| 20 | CSP block looks like unreachable | VERIFIED: B1 D-B1-1 ties `connect-src` to `IYNK_CONNECT_ORIGINS`. | T-B6-11 states the same-origin or listed-origin rule and shows `server.status.unreachableHint` for cross-origin addresses (key added in T-B6-19b). The closed-port keyless case moves to T-B6-21 so the dead port is listed in the web env and the test really meets a refused connection. T-B6-14 documents the rule in `SELF_HOSTING.md`. |
| 21 | 1 MB header | Node's default max header is 16 KB (EXTERNAL knowledge, Node docs). | Removed from the five-cause identity set. Separate assertion: 431 or a closed socket, then the next request succeeds. O-15. |

Group and file ownership tables (sections 6 and 7) were rewritten to match: G1 runs 01a then 01b; G2 is 15, 02, 13, 07; G3 is 16, 03, 17, 19a, 19b, 20; G3b is 04, 05; T-B6-20 left G5; `e2e/keyless.spec.ts` is shared by T-B6-11 and T-B6-21 as separate test blocks.
