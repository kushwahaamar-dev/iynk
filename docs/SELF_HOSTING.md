# Self-hosting iynk

This is a stub. The full server (rooms, shares, one container for everything) arrives in phase B6. Until then iynk is one Next.js app that you build and run yourself.

The app needs no key to run. With every setting below left empty, the labs, the editor and the lessons all work. The AI partner and live search switch on only when you set them up, and each is off by default.

## Run it

```
npm install
npm run build
npm start
```

`npm start` listens on port 3000 unless you pass `-- --port <n>`. Put it behind a reverse proxy that serves HTTPS if other people will use it.

## Settings

Copy `.env.example` to `.env.local` and fill in only what you need. An empty line means "not set". A value that cannot be read falls back to its default and the module that needs it stays off. Nothing in this file is ever a key for the AI or search provider: callers bring their own key (see `docs/DATA_HANDLING.md`).

<!-- env-names: the copy check compares the first column below with src/lib/server/env.ts -->

| Name | Default | What it does |
|---|---|---|
| `IYNK_AI_ENABLE` | `0` | `1` turns the AI partner on. Without it every AI route answers "feature disabled". |
| `IYNK_AI_PROVIDER` | `meta` | Which provider the server talks to for AI: `meta` or `gemini`. Voice transcription works only with `meta`. The operator picks the provider and its address, so a caller cannot aim the server at another host. |
| `IYNK_AI_DAILY_TOKENS` | `200000` | Tokens one key may spend per UTC day. `0` allows none. Past the cap the server answers 429 `quota_exhausted` until 00:00 UTC. |
| `IYNK_SEARCH_ENABLE` | `0` | `1` turns search (web, nearby, events, videos, offers) on. |
| `IYNK_SEARCH_MONTHLY` | `200` | Searches one key may run per UTC month. `0` allows none. |
| `IYNK_DATA_DIR` | `.iynk-data` | Folder where the server keeps `usage.json`, the usage count. It is git-ignored. The server creates it when it first needs it. |
| `IYNK_CONNECT_ORIGINS` | empty | Extra origins the browser may connect to, written into the Content-Security-Policy `connect-src` list. Comma separated, each a bare origin such as `https://rt.example.org`. It feeds the policy only. It does not change who may call the API. |
| `IYNK_SERVER_TOKEN` | not set | A secret of at least 32 random bytes, for example `openssl rand -base64 48`. Routes that spend your provider quota need it in the `X-Iynk-Server-Token` header. Not set means those routes stay closed. |
| `IYNK_TRUST_PROXY` | `0` | `1` only when the app sits behind one proxy you control. Then the caller address comes from `X-Forwarded-For`. At `0` that header is ignored, so nobody can fake an address to dodge the rate limits. |
| `IYNK_SERVER_URL` | not set | Address of a separate iynk server. The app serves it at `/config.json` so the browser knows where to connect. Not set means "no separate server". |

The provider address and model names (`META_API_BASE`, `META_MODEL`, `META_TRANSCRIBE_MODEL`, `GEMINI_MODEL`) and the public address (`NEXT_PUBLIC_SITE_URL`, `SITE_URL`) are listed in `.env.example` as well. `NEXT_PUBLIC_SITE_URL` is baked in at build time, so set it before `npm run build`.

## Turning the AI partner on

1. Set `IYNK_AI_ENABLE=1` and, if you want Gemini, `IYNK_AI_PROVIDER=gemini`.
2. Set `IYNK_SERVER_TOKEN` to a long random string.
3. Restart the app. `/config.json` now shows `"ai": true` under `modules`.
4. In the app, open Settings, then Keys and usage, and paste the provider key and the server token. They stay in that browser.

Search works the same way with `IYNK_SEARCH_ENABLE=1`.

## What the server writes

One file: `<IYNK_DATA_DIR>/usage.json`. It holds a short hash of each key and the counts that go with it, so a restart does not reset the caps. It never holds a key. To reset all counts, stop the app and delete the file.

## Back up and update

Nothing here needs a backup except, if you care about the counts, `usage.json`. To update, pull, run `npm install` and `npm run build`, and restart.
