# Solana Proof of Build (iynk_passport program, attest flow, wallet UI, verify page)

**Paths:** `solana/programs/iynk_passport/src/**`, `solana/tests/**`, `solana/scripts/**`, `solana/Anchor.toml`, `src/lib/solana/**`, `src/lib/server/solana/**` (server half, outside the named scope but required), `src/lib/verify/**` (the "re-run" logic, same), `src/components/solana/**`, `src/app/api/solana/**`, `src/app/[lang]/passport`, `src/app/[lang]/verify`, `docs/hacktx/SOLANA.md`, `src/i18n/messages/*/solana.json`.
**Entry points:** on-chain `initialize | set_issuer | issue_credential | create_bounty | cancel_bounty` (`solana/programs/iynk_passport/src/lib.rs:19-63`); HTTP `POST /api/solana/attest`, `POST /api/solana/faucet`, `GET /api/solana/credentials`; pages `/[lang]/passport`, `/[lang]/verify`; dock tab `PassportPanel` (`src/components/dock/LabDock.tsx:11,85`); MCP tool `get_passport` (`src/lib/server/mcp/tools/passport.ts`); feature gate `src/lib/server/solana-ready.ts` used by `src/app/api/status/route.ts:15`.
**LOC:** VERIFIED. Command: `find solana/programs solana/tests solana/scripts src/lib/solana src/components/solana src/app/api/solana src/lib/server/solana "src/app/[lang]/passport" "src/app/[lang]/verify" -type f (rs|ts|tsx|mjs|sh) | xargs wc -l` plus `src/lib/verify` and `Anchor.toml` gives 5,451 lines hand-written (Rust 456, on-chain tests 469, route tests 272, rest TS/TSX), plus 1,593 lines of generated IDL (`find src/lib/solana/idl -type f | xargs wc -l`) and 1,239 lines of i18n JSON (`wc -l src/i18n/messages/*/solana.json`, six languages).
**Owner today:** `docs/ARCHITECTURE.md:131` lists it under the "hackathon layer (D14d)": `src/lib/{server,ai,search,solana,realtime,hw}/**`, `src/components/{ai,search,solana,realtime,hw}/**`, `/[lang]/{together,passport,verify}`. No named human owner. Written 2026-10-24/25 (`git log --format='%h %ad' -- solana src/lib/solana`: first commit d5bdf44 on 2026-10-24; 9 commits touch these paths).

## Purpose

Let a learner who passes a drone bench-safety check get a non-transferable "credential" account on Solana devnet, and let anyone escrow SOL "bounties" that are paid to the next learner who earns that skill, in the same transaction (`lib.rs:1-6`). A public `/verify` page reads credentials straight from the chain. A "tip a helper" button exists for realtime rooms but nothing renders it. DOCUMENTED (`docs/hacktx/SOLANA.md`), checked against source.

## Dependencies (imports in, imports out; third-party packages)

- **Rust program:** `anchor-lang =0.31.1`, `solana-sdk-ids =2.2.1` (`solana/programs/iynk_passport/Cargo.toml`). Toolchain pinned in `solana/Anchor.toml:1-3` (Anchor 0.31.1, Solana CLI 4.2.2). VERIFIED.
- **Web app (root `package.json:33-40`):** `@solana/web3.js 1.99.0`, `@solana/wallet-adapter-base 0.9.28`, `@solana/wallet-adapter-react 0.15.40`, `@solana/wallet-adapter-react-ui 0.9.40`, `@coral-xyz/anchor 0.31.1`, `bs58 6.0.0`.
  - `@solana/wallet-adapter-react-ui` is **unused**: it appears only in `package.json`, the lockfile and `docs/hacktx/HX-CONTRACT.md`; `grep -rn "wallet-adapter-react-ui" src` finds 0 hits. VERIFIED. Dead dependency.
  - `@coral-xyz/anchor` is imported only by `solana/tests` and `solana/scripts` (`grep -rln "coral-xyz" src solana/tests solana/scripts`), which have their own `solana/package.json` with the same pin. `src/` has 0 imports. VERIFIED.
  - The app hand-writes Borsh encoders and decoders (`src/lib/solana/passport.ts`) instead of using Anchor.
- **Imports in (Solana code depends on):** `src/lib/server/{http,ratelimit,env}.ts`, `src/lib/verify/**`, `src/components/ui`, `src/components/editorial`, `src/i18n`, `src/lib/features`, `src/content/{ids,index.generated}` (drone test sets), `src/components/figure/protocol` (FigureHandle).
- **Imports out (who depends on Solana):** `src/components/dock/LabDock.tsx` (static import of `PassportPanel`), `src/app/api/status/route.ts`, `src/lib/server/mcp/tools/passport.ts` (+ `tools.test.ts`), the two pages. `TipButton` is imported by nothing (`grep -rl TipButton src` returns only its own file). VERIFIED: dead component, plus `sendTip`/`tipMemo`/`roomOfTip`/`MEMO_PROGRAM_ID` in `actions.ts` that only it uses.
- **External service:** `api.devnet.solana.com` public RPC for every read and write (default in `env.ts:41,44` and `config.ts:8`). No paid RPC.

## Public interfaces (exported functions/types/components/messages, with path:line)

On-chain (IDL `src/lib/solana/idl/iynk_passport.json`, program id `BYFLDTLNi946Z8jT4JnxgE8Cpzkr9ud7tSrnThFTv31w`, `lib.rs:14`):

| Instruction | Signers | Source |
|---|---|---|
| `initialize(issuer)` | admin = program upgrade authority | `instructions/initialize.rs:7-42` |
| `set_issuer(issuer)` | `config.admin` | `instructions/set_issuer.rs` |
| `issue_credential(skill_id, skill_hash, replay_hash, score)` + bounties in remaining_accounts | `config.issuer` + payer | `instructions/issue_credential.rs:8-67` |
| `create_bounty(skill_id, skill_hash, learner?, amount, nonce)` | sponsor (anyone) | `instructions/create_bounty.rs:8-65` |
| `cancel_bounty()` | `bounty.sponsor` | `instructions/cancel_bounty.rs` |

Events `CredentialIssued`, `BountyPaid` (`events.rs`). Errors 6000-6012 (`error.rs`).

HTTP:

| Route | Guard | Source |
|---|---|---|
| `POST /api/solana/attest` `{kind, itemId, sub?, learner, run}` | origin check + 10/min/IP (in memory) | `src/app/api/solana/attest/route.ts:6-14`, schema `src/lib/server/solana/attest.ts:10-17` |
| `POST /api/solana/faucet` `{to}` | origin check + 5/min/IP, plus 1 drip/hour per address and per IP | `faucet/route.ts`, `src/lib/server/solana/faucet.ts` |
| `GET /api/solana/credentials?learner=` | origin check + 30/min/IP | `credentials/route.ts` |

TS library: `src/lib/solana/passport.ts` (PDA helpers `configAddress/credentialAddress/bountyAddress`, `issueCredentialIx/createBountyIx/cancelBountyIx`, `decodeCredential/decodeBounty/decodeConfigIssuer`, `parseEvents`, `DISCRIMINATORS`, `OFFSETS`); `reads.ts` (`credentialsOf`, `credentialAt`, `bountiesBySponsor`, `bountiesForSkill`, `openBountiesFor`, `claimableBy`); `actions.ts` (`sendTip`, `createBounty`, `cancelBounty`); `provider.tsx` (`SolanaProvider`, `useWalletError`); `devnet-wallet.ts`, `devnet-adapter.ts` (in-browser keypair wallet).

Components: `PassportPanel` (dock tab), `PassportApp`, `VerifyApp`, `WalletBar`, `BountyForm`, `SponsoredBounties`, `SkillBounties`, `CredentialCard`, `TipButton` (unused).

Verification: `verifyRun` at `src/lib/verify/index.ts:36`; `replayDroneSafety` in `src/lib/verify/drone-safety.ts`.

## State ownership and persistence (stores, localStorage keys, server state, DB tables)

| State | Where | Notes |
|---|---|---|
| Config, Credential, Bounty accounts | Solana devnet, owned by the program | sizes below |
| Server issuer keypair | env `SOLANA_ISSUER_KEYPAIR`, JSON array of 64 bytes, parsed into a module-level variable (`src/lib/server/solana/context.ts:46-56`, `src/lib/server/env.ts:18-30`) | a plain environment variable on the host |
| Deployer / upgrade authority / admin key | file `~/.config/solana/iynk/deployer.json` on one Mac | DOCUMENTED (`SOLANA.md` Keys) |
| Faucet grants | in-memory `Map`, max 10,000 keys, per server instance (`faucet.ts:16-30`) | lost on every cold start |
| Rate limiter | in-memory `Map` (`src/lib/server/ratelimit.ts:12-34`) | per instance, its own header says so |
| Feature flag cache | module variables in `solana-ready.ts` | 60 s while missing, 10 min once found |
| Browser: devnet wallet secret | `localStorage["iynk:wallet:v1"]`, plaintext base58 secret key (`devnet-wallet.ts:15,81`) | by design, labelled devnet |
| Browser: wallet choice | `localStorage["iynk:wallet-choice:v1"]` (`provider.tsx:55`) | wallet-adapter autoConnect |
| Database tables | none | VERIFIED: no `postgres` import in `src/lib/solana` or `src/lib/server/solana` |

iynk stores no credential, run log or attempt. The only trace of what the server verified is the on-chain `replay_hash`; the inputs that produced it are not kept, so the hash cannot be re-checked later. VERIFIED (`attest.ts` writes nothing but the transaction).

## Current functionality (what VERIFIED works, how you know)

**What the program stores.** Sizes recomputed from `state.rs` with Anchor `InitSpace` rules; rent = (bytes + 128) x 6,960 lamports (ESTIMATED from the standard rent rate; it matches the doc's figures):

| Account | PDA seeds | Bytes (8 disc + body) | Rent-exempt | Source |
|---|---|---|---|---|
| Config | `["config"]` | 73 (32+32+1+8) | 0.0014 SOL | `state.rs:11-17` |
| Credential | `["cred", learner, sha256(skill_id)]` | 215 (32+32+68+32+2+8+32+1+8) | 0.00239 SOL (343 x 6960 = 2,387,280 lamports) | `state.rs:20-32` |
| Bounty | `["bounty", sponsor, skill_hash, nonce u64 LE]` | 231 | 0.0025 SOL | `state.rs:36-50` |

A Credential holds: learner, skill hash, skill id string, replay hash, score u16, timestamp, issuer pubkey. One per (learner, skill), enforced by `init` on the PDA (`issue_credential.rs:19-26`). No transfer or close instruction exists, so credentials are permanent and their rent is locked forever.

**Who can issue.** Only the pubkey in `Config.issuer` (`has_one = issuer`, `issue_credential.rs:11-17`). Rotation by `Config.admin` via `set_issuer`. `initialize` is gated on the program's upgrade authority through the ProgramData account (`initialize.rs:23-31`), which is correct and tested (`solana/tests/iynk_passport.test.ts:122-146`).

**Tests I ran.** `npx vitest run src/lib/solana src/lib/verify src/app/api/solana src/components/solana` on bb546d6: 8 files, 52 tests, all passed (2026-10-26). VERIFIED. The 34 on-chain tests (`grep -c '^  it(' solana/tests/iynk_passport.test.ts` = 34) need a local validator and the Solana 4.2.2 toolchain; I did not run them. UNKNOWN whether they pass today; DOCUMENTED as passing.

**Deployment.** DOCUMENTED as deployed on devnet 2026-10-25, initialized, with one smoke credential (`SOLANA.md` Deploy record). I did not query RPC. UNKNOWN whether it is still live.

### How "the server re-runs your exact run" actually works

This is the central claim and it is weaker than the wording.

1. The browser records bench events from the 3D figure's `state` messages (`src/lib/verify/drone-recorder.ts:49-65`), builds a log `{v, kind, itemId, seed: 0, inputs[], result, client}` and POSTs it with the learner's wallet address (`src/components/solana/PassportPanel.tsx:113-119`).
2. The server (`verifyRun`, `src/lib/verify/index.ts:36-62`) does not re-execute a simulation or anything physical. It folds the client-supplied event list through a pure state machine (`benchStep`, `drone-safety.ts`) and checks rules: no live work, no props before checks, test sequencing. It ignores the client's `result` (correct, `runlog.ts:5-6`).
3. It is deterministic: no randomness, no clock, a pure function of `(inputs, tests)`. `seed` is always 0 and unused. Score = `100 - 20*pops - 10*reversedCalibrations` (`scoreOf`).
4. `replay_hash = sha256(canonicalJson(inputs))` (`src/lib/verify/hash.ts:39-42`) is stored on-chain. It identifies which log was submitted. It does not prove anyone performed it.

**Forgery (VERIFIED by reproduction).** The log is whatever the client sends. I copied `drone-safety.ts` to the scratch dir and ran a seven-event log without touching the app: `init {placed:{FC:0,XT60:0,ESC:0,WIRES:0}, plugged:false, fault:null, all ok flags false}`, then `test/test-end` for smoke, motors, calibrate. Command: `node --experimental-strip-types forge.mts` in `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/audit/solana/`. Output: `{"pass":true,"score":100,"steps":{"smoke":true,"motors":true,"calibrate":true},"violations":[],"pops":0,"fault":null}`. Four parts and six events pass with a perfect score. Nothing checks that the craft was fully built, that timestamps `t` are plausible (only non-decreasing), or that the figure produced the events. Anyone with curl can mint. (I ran the replay function only; I did not call the live endpoint.)

**Replay across wallets.** `attestBody` carries the learner address but no signature from that wallet and no server-issued challenge (`attest.ts:10-17`). The same valid log can be submitted for any number of wallets, one credential each. Anyone can also issue a credential to a wallet they do not control. VERIFIED by reading.

**Only 1 of 5 run kinds is verifiable.** `RUN_KINDS` = board-lessons, board-lesson, drone-safety, robotics-bench, flight-course (`runlog.ts:7`); `VERIFIABLE = ["drone-safety"]` (`verify/index.ts:11`); the rest return 422 `not_verifiable`. The panel mints only for `lab === "drone"` (`PassportPanel.tsx:261`); other labs show a link to the passport page. VERIFIED. Skill-id grammar and parser for the other kinds exist (`skill.ts`) but nothing produces their logs.

### Bounty flow (VERIFIED in code and tests)

1. A sponsor wallet signs `create_bounty` in the browser (`actions.ts:77-86`, `BountyForm.tsx`). The form minimum is 0.001 SOL; the program minimum is 890,880 lamports (`create_bounty.rs:44-47`). Lamports move into a PDA that also holds its own rent.
2. At attest time the server reads all bounties for the skill with `getProgramAccounts` and a memcmp filter (`reads.ts:35-40`), keeps unclaimed ones that are open or reserved for this learner, takes the first 6 oldest (`MAX_BOUNTIES`, `attest.ts:22,72`) and lists them as writable remaining accounts.
3. `issue_credential` pays each from the bounty PDA to the learner and sets `claimed_by` (`issue_credential.rs:77-93`). A bounty listed twice fails (tested). The whole transaction reverts if any listed bounty is invalid.
4. A paid bounty account stays on-chain with its rent (no close after claim). The sponsor can cancel only unclaimed bounties and gets everything back (`cancel_bounty.rs`).

### Cost per credential

ESTIMATED from the sizes above; devnet and mainnet share the rent schedule:
- Rent for the Credential account: 2,387,280 lamports (0.00239 SOL), paid by the issuer key (issuer = payer, `attest.ts:75-76`), **never recoverable** because no close instruction exists.
- Fee: one signature, 5,000 lamports base fee (standard; no priority fee set). Compute about 18k CU with no bounty, 53k with ten (DOCUMENTED).
- Total about 0.0024 SOL per credential. At an ASSUMED 100 to 250 USD per SOL that is 0.24 to 0.60 USD. 100,000 credentials is about 240 SOL of permanently locked rent. Bounty payouts are paid by sponsors.
- One-off: program deploy rent about 1.994 SOL, recoverable by closing the program (DOCUMENTED).

## Known defects (with repro or evidence)

| # | Defect | Evidence | Severity |
|---|---|---|---|
| 1 | Credentials are forgeable with a hand-written 7-event JSON log; "verified" means internally consistent, not performed | repro above | high |
| 2 | No wallet ownership proof: the server issues to any address in the body; the same log works for unlimited wallets | `attest.ts:10-17` has no signature field | high |
| 3 | Bounty farming: defects 1 and 2 plus free offline keypairs claim up to 6 bounties per request and forward the payout. The only throttle is 10/min/IP in memory, and `clientIp` trusts `x-real-ip` then `x-forwarded-for` (`src/lib/server/http.ts:128-132`), spoofable unless the host overwrites them | code | high (on mainnet this loses sponsor funds) |
| 4 | Only drone-safety can be minted; 4 of 5 declared run kinds are inert | `verify/index.ts:11,66` | medium |
| 5 | Attest collapses every chain failure to 502 "try again" (`attest.ts:95-100`). A bounty cancelled between the read and the send makes the transaction fail and the client just retries. A hostile sponsor could stall a skill by creating open bounties and cancelling them just before issuance (HYPOTHESIS, not reproduced) | code | medium |
| 6 | `getProgramAccounts` over the whole program runs on every attest and every skill panel view against the public RPC; cost grows with account count and public RPCs rate-limit it | `reads.ts`, `SkillBounties.tsx` | medium (scaling) |
| 7 | After `set_issuer`, every old credential shows the red "other issuer" chip (`CredentialCard.tsx:69-71` compares with the current issuer) | code | low |
| 8 | Claimed-bounty rent and credential rent are stranded forever | no close instructions | low (design) |
| 9 | 12 s RPC timeout with no recovery on `confirmTransaction`: a transaction that lands after the timeout reports failure and the next call returns 409 "already issued" | `context.ts:19-24`, `attest.ts:38-46` | low |

## Technical debt (table: item, path, evidence, severity, effort guess)

| Item | Path | Evidence | Severity | Effort |
|---|---|---|---|---|
| Unused dependency `@solana/wallet-adapter-react-ui` | `package.json:38` | 0 imports in src | low | 5 min |
| `@coral-xyz/anchor` in root deps, used only under `solana/` | `package.json:33` | grep | low | 5 min |
| Dead `TipButton` + tip helpers + memo constants | `src/components/solana/TipButton.tsx`, `src/lib/solana/actions.ts:8-52` | 0 importers | low | 30 min |
| Hand-written Borsh codec duplicates the IDL | `src/lib/solana/passport.ts` (271 lines) vs generated `idl/iynk_passport.ts` (800 lines, only tests read it) | `passport.test.ts` keeps them in sync | medium | 1-2 days to use a generated client |
| Issuer key = fee payer = faucet treasury = credential signer | `src/lib/server/solana/context.ts`, `faucet.ts` | one `Keypair` | high (custody) | 1-2 days to split |
| Admin = upgrade authority = single local file key | `SOLANA.md` Keys | no multisig | high for mainnet | days |
| Everything hard-coded to devnet | `src/lib/solana/config.ts:6`, `env.ts:43` (`z.literal("devnet")`), `config.ts` `parseProgramId` returns null unless devnet | code | medium | 1 day |
| `PassportPanel` imported statically into every lab page | `LabDock.tsx:11` | no `dynamic()` | medium (bundle) | 1 hour |
| In-memory faucet and limiter state | `faucet.ts`, `ratelimit.ts` | per-instance Map | medium | 1 day (needs shared store) |
| SBPF v0 binary; SIMD-0500 may block upgrades | `SOLANA.md` | DOCUMENTED | medium | 1 day rebuild with `--arch v3` |

## Test coverage (which test files, what they really check: hardware-derived reference values vs self-consistency with the implementation)

No test uses hardware-derived values; this subsystem has no hardware dimension. Everything is self-consistency or spec-from-docs.

| File | Count | What it checks | Independence |
|---|---|---|---|
| `solana/tests/iynk_passport.test.ts` (469 lines) | 34 | Real compiled program on a local validator: auth, PDA uniqueness, hash/charset rules, bounty pay/cancel, double-list, read-only bounty, ten bounties within CU | Strong. Not run by me. CI use UNKNOWN (no CI config inspected) |
| `src/lib/solana/passport.test.ts` (130) | in the 52 | Hand-written discriminators recomputed with sha256; field layouts vs exported IDL | Good: cross-checks codec against the program's IDL |
| `src/lib/verify/verify.test.ts` (190) | in the 52 | Replay rules (live work, props early, etc.) | Self-consistency: asserts the implementation's own rules, not any physical bench. No test for forged-log acceptance |
| `src/app/api/solana/solana-routes.test.ts` (272) | in the 52 | Routes against a fake `Connection`: rate limits, 409, faucet rules | Mocked chain |
| `PassportPanel.test.tsx`, `devnet-wallet.test.tsx`, `devnet-adapter.test.ts`, `config-ready.test.ts` | in the 52 | UI states, wallet storage | Mocked |

Gaps: no test says a trivially forged log must be rejected (it passes); no end-to-end attest against a real program; no tests for `solana/scripts`; no test of `/verify` against a live RPC.

## Performance characteristics (measured if you can, else ESTIMATED/UNKNOWN)

- **Client bundle (MEASURED with caveat).** `rolldown --minify --platform browser` in the scratch dir (not the Next pipeline, so tree-shaking may differ): `@solana/web3.js` alone (PublicKey, Connection, Transaction) = 276 KB min / 80 KB gzip. web3.js + wallet-adapter-react + wallet-adapter-base + bs58 = 437 KB min / 131 KB gzip, which includes a bundled copy of React (subtract roughly 6-10 KB gzip, ESTIMATED). `LabDock.tsx:11` imports `PassportPanel` statically, so this is plausibly in the JS of every lab route even when the Passport tab is closed or the feature is off. UNKNOWN until measured with a real `next build` analysis; the repo's `.next` predates Solana (BUILD_ID dated 2026-10-24 01:54) and I was not allowed to rebuild.
- **Disk (not shipped):** `du -sk node_modules/@solana/web3.js` 11.7 MB; `@coral-xyz/anchor` 3.3 MB; adapter packages 0.1 to 0.6 MB each.
- **Chain:** program binary 286 KB (DOCUMENTED). 18,024 CU with no bounty, 53,451 with ten (DOCUMENTED).
- **Latency:** attest = replay (microseconds) + `getAccountInfo` + `getProgramAccounts` + blockhash + send + confirm over public devnet RPC, 12 s timeout, one 250-750 ms retry on 429/5xx (`context.ts:19-27`). UNKNOWN measured distribution.
- **Scaling:** `getProgramAccounts` per attest and per Passport view is O(accounts of the program).

## Security risks

1. **Issuer key custody (high).** One hot key in an env var is the only authority that can mint credentials, and it also pays fees and holds the faucet treasury. Anyone who reads the host's env, or finds an RCE in any route, can mint unlimited credentials. There is no revoke instruction, so forged credentials cannot be invalidated except by rotating the issuer and having verifiers filter on the stored `issuer` field (which the Credential keeps). The key is never logged or returned (`grep -c "console\." src/lib/server/solana/*.ts` = 0 in all four files).
2. **Upgrade authority and admin are one key on one laptop** (`SOLANA.md` Keys). Its compromise lets an attacker upgrade the program to drain every bounty escrow (they sit in PDAs the program controls) and rewrite credential logic.
3. **Forgeable attestation** (defects 1-3). The trust anchor is "the server checked it", but the check validates a self-reported log.
4. **Faucet abuse.** `faucet.ts`: 0.02 SOL per drip, only wallets under 0.05 SOL, once per address and per IP per hour, 5 requests/min/IP, treasury floor 0.2 SOL. Limits are in memory per instance (reset on cold start, not shared across instances); the IP comes from a client-controllable header on some hosts; addresses are free. Abuse drains the issuer's devnet SOL until `faucet_dry` (503), which also removes the SOL that pays credential rent because it is the same wallet. Devnet: nuisance. Mainnet: a faucet must not exist.
5. **Uncapped issuance spend.** Each attest costs the server about 0.0024 SOL. The per-IP limit is the only cap. Whether a host overwrites forwarded-IP headers is UNKNOWN for the real deployment.
6. **Origin check is not an abuse control.** Requests without an Origin header pass by design (`http.ts:132-147`).
7. **Browser wallet secret in plaintext localStorage** (`devnet-wallet.ts`). Acceptable for a labelled devnet wallet; any XSS reads it; unacceptable if the same UI ever handles mainnet funds.
8. **Program review.** I read all five instructions: PDA seeds, `has_one`, signer checks, learner `owner = System::id()`, on-chain `sha256(skill_id)` check, Anchor checked lamport arithmetic, `bounty.exit` before the next remaining account. I found no way for a non-issuer to mint or for anyone to steal a bounty. No external audit exists. Any wallet can be made the target of a credential (spam at iynk's cost, not theft).
9. **Legal (HYPOTHESIS, not legal advice).** SOL bounties paid on an iynk-controlled pass/fail resemble prize or contest and payment flows; holding sponsor escrow, running a faucet, and writing wallet-linked records to an immutable chain (GDPR erasure) need counsel before mainnet. No KYC; credentials are pseudonymous.

## Reusability for an original-project builder (can this run on arbitrary user projects, or only on catalogue items? why?)

**Today: catalogue items only, in practice the 12 drone crafts (`DRONES` in `src/content/ids.ts:151-163`).** Reasons, VERIFIED:
- `skillIdFor` builds ids only for the fixed kinds board/drone/robotics/flight (`src/lib/verify/skill.ts:12-33`); `verifyRun` rejects unknown drones (`verify/index.ts:44`).
- The verifier is a hand-written state machine for one procedure (the drone bench) fed by the figure engine's `state` report (`readDroneReport`). Another project needs its own recorder and its own pure replay.
- Skill ids are 64 bytes of printable ASCII, no spaces (`skill.rs:12-23`). Nothing namespaces by project owner.
- The on-chain program is generic: any `skill_id` with a matching sha256 is accepted from the issuer. A skill like `proj:<id>:milestone-3` would work on-chain with no program change. The generic parts are the program and the Borsh codec; the non-generic part is the verifier.
- Trust model: an original project has no reference procedure, so "passing" has no definition. It would need a human or AI reviewer attestation, a hardware measurement, or peer sign-off. None exists.

## Required refactoring to get there

1. Decide what a credential asserts (finished a lesson, passed a review of a user's build, hardware measurement) and make the evidence server-observed or signed, not client-reported (server-issued challenge/session, signed device data, or reviewer signature).
2. Replace the drone-only switch in `verifyRun` with a verifier registry per skill namespace; add a project-owner namespace and a metadata hash or URI on the credential.
3. Bind issuance to the learner: wallet signature over `{skill, replay_hash, nonce}`, or a signed-in account that owns the wallet.
4. Split keys: issuer (KMS/HSM or a signing service), fee payer, admin (multisig); no faucet in production; add `revoke_credential` or a revocation list.
5. Move rate limits and faucet state to a shared store.
6. Make the cluster configurable; lazy-load the Solana bundle behind the Passport tab; delete the two dead deps and `TipButton`.
7. Reconsider accounts: a signed off-chain verifiable credential (Ed25519 signature checked on `/verify`), optionally anchored in batches, avoids the 0.0024 SOL locked rent per credential and wallet friction.

## Recommendation: preserve | extend | replace | deprecate | investigate

**investigate** (leaning detachable and frozen): the program is small and correct as far as I read it, but the product claim "the server re-runs your run" does not hold for a client-recorded log (forged in 7 events), so do not extend it as a trust feature until the founder says what a credential must prove.

**Core or detachable?** Detachable (VERIFIED). `features.solana` is false unless the issuer key, program id and on-chain Config all exist (`env.ts:97`, `solana-ready.ts`). `/passport` and `/verify` then render a "not set up" note, the dock tab is hidden (`LabDock.tsx:25-43`), and the rest of the app imports Solana code in only three places: `LabDock.tsx`, `api/status/route.ts` and the MCP `get_passport` tool. Removal means deleting `solana/`, the listed `src/` folders and i18n namespace, three call sites, and about five npm packages; ESTIMATED 1 to 2 days. The one deeper hook is the drone recorder observing the figure stream (`drone-recorder.ts`), which is only used here.

## Open questions

1. What must a credential prove: a skill, completion, or authorship of an original build? This decides replace vs extend.
2. Does the founder want on-chain at all (locked rent, wallet friction, devnet only) versus a signed off-chain credential with an optional anchor?
3. Is the devnet program still deployed and initialized as SOLANA.md says, and is `features.solana` true on iynk.tech today? (UNKNOWN, no RPC or production call made.)
4. Which host serves the API routes (Vercel or Vultr), and does it overwrite `x-forwarded-for`/`x-real-ip`? That decides whether the rate limits mean anything.
5. Is the Solana bundle really in every lab page's JS? Needs a `next build` with analyzer, which I could not run without writing `.next`.
6. Do the 34 on-chain tests pass on a fresh machine with Anchor 0.31.1 / Solana 4.2.2, and are they in CI?
7. Legal position on prize-style bounties, faucets and wallet-linked credentials in target markets.
8. SIMD-0500 status: if SBPF v0 deploys are disabled on the target cluster, the program needs a rebuild before any upgrade.
