# Audit: the hackathon sponsor layer (hx)

Written 2026-10-24 ~15:40 CDT by the sponsor-layer auditor; read-only.

## Bottom line

Well built and well tested, but invisible: hx vitest 471/482 pass (7 fail, 4 skipped), relay 39/39, Anchor 34/34
(local validator), eslint clean. **LabDock returns null**, no lab page is wrapped in RoomProvider, no nav entries.
**Nothing is live**: the Solana program is not on devnet, only the Solana env vars are set, no relay, no Vercel.
Broken: **voice fails end to end** (client uploads webm, server returns 415 for anything but WAV/MP3); 16 hx type
errors (plus 18 core) fail a Vercel build.

## Global checks

- tsc: 34 errors; hx ones are together/strings.ts (3) and realtime/messages.ts (3) from de/zh/hi together.json key
  drift (`lobby.buddies.builtNote.{one,other}` missing, stale `built`/`builtHint`), and RealBuildPanel.test.tsx (10).
- `solana program show BYFLDTLNi946Z8jT4JnxgE8Cpzkr9ud7tSrnThFTv31w --url devnet`: not found. Deployer `3sU7fw…P9PZb`
  0 SOL, issuer `7GbNpd…845XR` 0 SOL. **The user's CLI wallet `Cxt17a9c…bW1S` (~/.config/solana/devnet.json) holds
  4.998 devnet SOL**: enough for the deploy (~2.05) plus ~1 for the issuer.
- No `runtime`/`dynamic`/`revalidate` exports under src/app/api; all 12 GET handlers call `await connection()`.
  Incident leftover: solana-routes.test.ts doesn't mock `connection` (2 failures).
- No `.vercel/` link.

## Per agent

| Agent | Works | Not wired / broken | Left |
|---|---|---|---|
| server-ai | Gateway (SSE chat loop up to 4 rounds, tools, translate masking, WAV resampler, story/plan/match JSON, Gemini fallback), 7 routes + /api/status, getFeatures, .env.example, smoke-ai.mjs, AI.md. Mock-tested only. | never called against real Meta | run smoke-ai with a key; set META_MODEL |
| partner | PartnerPanel with off/loading/error; tool loop (highlight_part, propose_change → store, ask_peer, open_panel); Story card (PNG, Web Share, Muse Image); ai.json ×6 | **not mounted**; **voice 415** (recorder.ts webm, client.ts:268 `voice.webm`, transcribe/route.ts:80); no track("ai.call"); no Facebook share | WAV upload; dock mount; `iynk:dock-tab` listener |
| mcp | /api/mcp (both protocol versions, 7 tools), tools/[name], openapi.json, SDK e2e test | plan_build_night calls /api/ai/plan over HTTP instead of planBuildNight(); never tested from Muse | switch call; test from Muse on public URL (Origin header vs 403 rule); privacy/terms URLs |
| search | 9 engines + Extract, 6 h cache, budget guard, normalizers (doc fixtures), optimiser, RealBuildPanel, NearbyPanel, VideoHelp, SourcesList, search_datasheet in chat | not mounted; **SEARCH.md and smoke-search.mjs missing**; 2 test failures (use getAllByText) | live call; doc; smoke script |
| solana-program | Anchor 0.31.1, 5 instructions, 13 errors, 34/34 tests, full deploy rehearsal on local validator, IDL exported | **not deployed** (airdrops rate-limited 13:52–14:17) | fund, `npm run deploy:devnet`, `npm run setup:devnet -- --smoke` |
| solana-app | encoders, reads, devnet wallet, Wallet Standard, attest/faucet/credentials, Passport + Verify apps, BountyForm, CredentialCard, Confetti | **verifyRun only handles drone-safety** (others 422); **TipButton never rendered**; SOLANA-APP.md missing; **features.solana is true while the program doesn't exist** (mint → 502); 4 test failures (connection mock ×2, PassportPanel Suspense ×2) + verify.test.ts:188 stale whoop expectation | fix tests; mount; more verifiable kinds; gate the feature on the Config account |
| realtime-server | relay.js 630 lines, 39/39 tests, Dockerfile/compose/Caddyfile, vultr scripts, load test 8 peers × 60 fps | **not deployed** (Docker daemon was off); REALTIME.md unfinished | Vultr VM, Caddy TLS, .tech subdomain, origins |
| realtime-client | WS + BroadcastChannel transports, room state machine, chat translation, TogetherPanel, Chat, RoomBar, Invite QR, cursors, VoiceButton, /together (Lobby, Buddies, Planner); integration test vs real relay passes | **not mounted; no RoomProvider**; **lab stores ignore sync/hydrate**; **baton not enforced**; **race ghosts not wired** (no caller of sendPose/onPose); VoiceButton also webm → 415 | all of those |
| data | migrations (hypertable, columnstore, retention, 2 continuous aggregates, 24 h profiles), routes, Leaderboard, LiveCounter, db-migrate.mjs, DATA.md | never run on Timescale; **track() has one caller** (hw) so leaderboards stay empty; components unmounted | wire telemetry (hx-data.md §3); migrate; mount |
| hw | Web Serial + Firmata codec, twin bridge, sim adapter, fake port tests, sim test vs real board store, track("hw.connect") | **never tried on a real Uno**; not mounted; HARDWARE.md §10 stale | rehearse; mount |

## Env (.env.local, names only)

Set: NEXT_PUBLIC_SOLANA_PROGRAM_ID, SOLANA_ISSUER_KEYPAIR, NEXT_PUBLIC_SOLANA_CLUSTER. Missing: META_API_KEY,
SERPAPI_KEY, DATABASE_URL, NEXT_PUBLIC_REALTIME_URL, VULTR_API_KEY/HOST, NEXT_PUBLIC_SITE_URL (defaults to localhost).

## Gaps

BLOCKER: hx:dock never ran (LabDock tabs Partner/Together/Real/Passport/Hardware, RoomProvider on 5 workspaces,
cursors, `?room=`, dock-tab event, phone sheet, nav + strings); Solana undeployed; META/SERPAPI keys; no hosted relay;
type errors; voice 415 on both paths (decodeAudioData → 16 kHz mono WAV, hx-server-ai.md §5); no deployment.
MAJOR: verifyRun drone-safety only while DEVPOST-WRITEUP.md:59 claims board lessons; features.solana gating;
telemetry barely wired; stores ignore hydrate; baton; race ghosts; TipButton; 7 failing tests; no hackathon e2e; no
real upstream call has ever succeeded.
MINOR: MCP direct planBuildNight; SEARCH.md, SOLANA-APP.md, smoke-search.mjs; REALTIME.md, HARDWARE.md §10;
NAMESPACES; telemetry getFeatures; Facebook share; track ai.call / credential.issued; hx:data changelog; google_lens.

## Estimate

~21–28 agent-hours; critical path to a demoable build ~8–10 h, which fits 6 h with 4–5 parallel agents if keys and
Solana funding arrive early. hx:dock 3–4; types 0.25; WAV 0.75; Solana deploy 0.5; relay + Vercel 1.5–2; live
smokes 1–1.5; tests 0.75; telemetry 1.5–2; ghosts 2–3; tips + gating 0.75; hydrate + baton 2–2.5; verifyRun for
lessons 2–3; hx e2e 2–3; minor 1.5.

## Track scoring

- **Meta:** design scores once mounted and keyed (peer-first Socratic partner crediting helpers, 6-language live
  translation, Build Night, Build Stories, buddies, MCP for Muse). Today a judge sees none of it. Leverage: key →
  dock + RoomProvider → deployed relay → WAV → rehearsed two-device demo (partner → ask_peer → translated voice reply
  → story) → Muse calling /api/mcp live (test early).
- **SerpApi:** strong "meaningful role" (offers drive an optimiser that changes the drone design; datasheet
  citations in AI answers; nearby, events, videos). Scores zero today. Leverage: key → mount → validate normalizers
  against real responses → demo "under $150" with the swap visible.
- **Solana:** a real program (replay-hash credentials, bounty escrow paid in the issuing transaction, memo tips,
  one-click devnet wallet, /verify). Scores zero today. Leverage: deploy → mount Passport → tips in the room →
  live Explorer link; optional micro-tips per helpful answer for "high-frequency".
- **Best Overall:** Technology and Learning strong; Completion weak. One deployed, rehearsed path is the lever.
- **Most Entertaining:** race ghosts (relay already relays poses; 2–3 h client) + a populated leaderboard.

## Risks

Muse key must be a US developer account and has never been called from this code (params and transcribe format from
docs only); Gemini alone gives text only. Muse connector auth/Origin unknown. SerpApi free plan small; budget guard is
per process and resets on cold start; a 12-part drone costs ~36 searches cold. Devnet faucet throttling; in-app
faucet drains the issuer 0.02 SOL per request; public RPC rate-limits account scans (use a free Helius/QuickNode
devnet RPC). Vercel can't hold sockets → relay on Vultr behind Caddy on 443; rooms are in memory. Rate limits are
per instance. Write-up overclaims board-lesson credentials and a deployed program.
