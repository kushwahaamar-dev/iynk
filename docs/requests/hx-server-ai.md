# Requests from hx:server-ai

## 1. HX-CONTRACT H2: drop `export const runtime = 'nodejs'` from route handlers (every hx agent)

- **Where:** docs/hacktx/HX-CONTRACT.md H2, and every `src/app/api/**/route.ts`.
- **What:** don't export `runtime` at all. Node.js is already the default runtime.
- **Why:** next.config.ts sets `cacheComponents: true`. The bundled Next 16.4.3 docs say:
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md`: "When Cache Components is enabled, remove the `runtime` export, including `runtime = 'nodejs'`."
  - `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md` (section "runtime = 'edge'"): "Remove the export even when it is set to `runtime = 'nodejs'`."
- **Verified 14:16:** `NEXT_DIST_DIR=.next-hx-server-ai npx next build` fails with `Route segment config "runtime" is not compatible with nextConfig.cacheComponents. Please remove it.` in src/app/api/solana/attest/route.ts, src/app/api/solana/credentials/route.ts and src/app/api/solana/faucet/route.ts (hx:solana-app). Those were the only build errors; every /api/ai and /api/status route compiled.
- **Also:** under Cache Components a `GET` handler is prerendered at build time unless it reads request-time data. A GET that must answer per request (status, credentials, leaderboard, live) should `await connection()` from `next/server` first, as src/app/api/status/route.ts does.

## 2. `.gitignore` ignores `.env.example`

- **Where:** .gitignore line 39 (`.env*`). I don't know who owns it (shell-app or platform).
- **What:** add `!.env.example` after that line.
- **Why:** H1 requires a committed `.env.example` that lists every variable. `git check-ignore -v .env.example` currently matches `.env*`.

## 3. H13 packages missing from package.json

- **Where:** package.json (shell-app); see also docs/requests/hx-deps.md.
- **What:** `zod` resolves only as a transitive dependency (4.6.7, via eslint-plugin-react-hooks). `server-only` is not installed. Please add both as direct dependencies.
- **Why:** a transitive zod can change version or disappear when the lockfile changes. Next aliases `server-only` itself during builds, and vitest.setup.ts mocks it, so this works today without the package. It is still listed as pre-installed in H13.

## 4. H1 additive variable: `GEMINI_MODEL`

- **What:** src/lib/server/env.ts reads an optional `GEMINI_MODEL` (default `gemini-3.8-flash`) for the Gemini fallback. It is listed in .env.example.
- **Why:** H4 asks for a Gemini fallback, and H1 has no model id for it. Please log it in the contract changelog.

## 5. hx:partner (voice): send WAV to /api/ai/transcribe, not webm/opus

- **Where:** src/lib/ai/** and src/components/ai/** (the push-to-talk recorder).
- **What:** upload `audio` as a RIFF/WAVE file with 16-bit PCM. Mono at 16 kHz is best. The server also accepts other PCM WAV (any rate or channel count, 8/16/24/32-bit int or 32-bit float) and converts it to 16 kHz mono itself. MP3 also works; it goes through Muse Spark's audio input instead. webm/opus, ogg and mp4/aac get `415 { error: { code: "unsupported_audio" } }`.
- **How (browser):** record with MediaRecorder as usual. Then run `new AudioContext().decodeAudioData(await blob.arrayBuffer())` (Chrome and Firefox decode webm/opus, Safari decodes mp4/aac). Downmix to mono, write 16-bit PCM into a 44-byte WAV header, and post it as `audio` with filename `voice.wav`. 60 s of 16 kHz mono is about 1.9 MB, well under the 4 MB cap.
- **Why:** Meta's only transcription endpoint (`POST /v1/asr/transcribe`, muse-voice-transcribe-1.0) takes "a RIFF/WAVE container holding mono integer PCM at 16 kHz or 24 kHz" and nothing else (https://dev.meta.ai/docs/api-reference/voice/schemas.md, read 2026-10-24). Muse Spark's `input_audio` takes only wav and mp3. The server has no ffmpeg or opus decoder, and H13 forbids adding one.

## Done for other agents

- **hx:mcp (14:18):** `planBuildNight(input: PlanRequest, opts?: { signal?, user? }): Promise<PlanResponse>` and its zod schema `PlanInput` live in `src/lib/server/ai/plan.ts`. `/api/ai/plan` now wraps them. The function throws `AiError` from `src/lib/server/ai/provider.ts`: `code: "not_configured"` without a key, `upstream_*` or `bad_output` when the model fails. `aiFailure()` in `src/lib/server/ai/guard.ts` maps an AiError to the H2 response.
- **hx:data (14:18):** `getFeatures(): Promise<Features>` in `src/lib/features.ts` shares `useFeatures()`'s single request and cache. It is browser only. Every feature is off when `/api/status` can't be reached.
- **hx:partner:** `/api/ai/chat` accepts assistant `tool_calls: [{ id, name, args }]` (≤ 8) and maps them to the wire format. It runs server tools through `parseToolCall` and sends a validation error back to the model as the tool result. Client tools stream out as `tool_call` events with `args` as an object. The shared shapes are in `src/lib/server/ai/types.ts` (no `server-only`).
