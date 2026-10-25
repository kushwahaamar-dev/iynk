# Deploying SimLab

P1-deploy, 2026-10-24 17:23 CDT. The local smoke was rerun by the driver at 18:24 CDT. The app is a Next.js 16.4.3 App Router project. Vercel is not linked, nothing has been deployed, and no environment variables have been uploaded. Those three wait for a yes (BUILD-PLAN §9, D4).

## Where it stands (2026-10-25 02:45 CDT)

The smoke further down is from 18:24 on Oct 24, when the content index had 7 boards, 4 benches and 5 drones and
`/es/boards/uno-r3` was a 404. Both are history: all 38 items are in, every item has prose in all six languages, and
gate 2's production build and crawl (`docs/verify/gate2-routes.md`: 786 pages, 780 clean, 6 expected 404, 0 failed)
replace that smoke for routes. Still not linked, deployed or given env vars; that waits for Amar's yes.

After a deploy with keys, the live smokes are, against the real URL:

```bash
node scripts/smoke-ai.mjs                                # Meta: chat, translate, transcribe, image
node scripts/smoke-search.mjs --base https://<the site>  # SerpApi: offers, web, nearby, events, videos
curl -s https://<the site>/api/status                    # which features the deployment has on
```

Both scripts read the keys from the environment or `.env.local`, never print them, and say SKIP without one.
`smoke-search.mjs` spends at most one SerpApi search per route (web up to three); a cached answer spends none.

## Local smoke with keys, 2026-10-25 07:51 CDT

Amar's keys are in `.env.local` (Meta, Gemini, SerpApi, `NEXT_PUBLIC_REALTIME_URL=ws://127.0.0.1:43117/ws`; no
`DATABASE_URL`). Build `.next-keys` from 07:33 (same code as `0974475`), served at http://127.0.0.1:3000, with the
relay `server/realtime` on port 43117.

| Check | Result |
|---|---|
| `curl /api/status` | `ai`, `image`, `voice`, `search`, `realtime`, `gemini` true; `solana` and `db` false |
| `node scripts/smoke-ai.mjs` | 7 of 7: models, chat, streaming, tool call, translate, image (490 KB webp), transcribe |
| `node scripts/smoke-search.mjs --base http://127.0.0.1:3001` | 5 of 5: offers (best USD 28.09), web, nearby, events, videos, 8 results each |
| `POST /api/ai/chat` (board, uno-r3, en) | streamed answer from Meta, 2682 in / 291 out tokens |
| `/healthz` on 43117 | `{"ok":true}` |
| Two browser profiles in one room (Playwright, `/en` and `/es` Blink, `?room=`) | both on `ws://127.0.0.1:43117/ws`, status "Live", each sees the other with their language, no console errors |
| Demo routes (`/en`, en and es Blink, quad5, fly, together) | 200 |

## What is already set

| File | State |
|---|---|
| `package.json` `engines.node` | `24.x`. Vercel uses this over the dashboard Node setting and deploys the latest 24.x it supports. |
| `.nvmrc` | `24`, for local nvm. Vercel does not read it. |
| `.vercelignore` | Root file from `0cc0a7e`. Reviewed this pass; left as it is. |
| `vercel.json` | Not added. `next build` / `next start` are already the scripts, and Node comes from `engines`. A `vercel.json` `env` block would bake a URL into every build. |
| `.env.example` | Documents `NEXT_PUBLIC_SITE_URL`. The only env file that belongs in git. |

This machine's `node` on `PATH` is v24.8.0 (`/opt/homebrew/bin/node`). `~/.nvm/nvm.sh` is not installed here.

## What a deploy sends

Two paths, and they do not filter the same way.

**Git.** A connected project clones the commit. `.vercelignore` does not strip that clone. Secrets stay out because they are never committed (`.env*` except `.env.example`, keypairs, `.next*/`). `public/figures/` is tracked, so the built figures are in the clone.

**CLI (`vercel` / `vercel deploy`).** The upload is the working tree minus Vercel's default exclusions (`.env.local`, `.env.*.local`, `node_modules`, `.next`, `.git`, …) and `.vercelignore`. That is the list that matters before anyone runs the CLI.

`.vercelignore` is root-anchored on purpose. `public/figures` is not listed, so the built figures upload. `/figures/*` is the source tree; the negation under it keeps only `figures/vendor/colorfigures/LICENSE`, which `src/app/[lang]/about/page.tsx` reads at build time. Also excluded, and safe for a production build: `/docs` (that includes `docs/research`; nothing at runtime reads it), `/scratch`, `/tmp`, `/e2e`, `**/*.test.ts`, `**/*.test.tsx`, `**/*.test.js`, `**/*.test.mjs`, and `/scripts/*` except `scripts/gen-content-index.mjs` (the `prebuild` step). Production modules do not import the test files. The two database tests that import `scripts/db-migrate.mjs` are themselves excluded, so a CLI upload does not typecheck a missing script.

A Git build still typechecks committed tests. Do not expect `.vercelignore` to hide a test error on a Git deployment.

## `NEXT_PUBLIC_SITE_URL`

Unset or blank means `http://localhost:3000`.

- Server code goes through `readEnv` in `src/lib/server/env.ts`. An empty line counts as unset. The parsed value is the MCP connector's base URL, the OpenAPI server list, and the origin check. A trailing slash is stripped.
- A share link built in the browser uses `window.location.origin` (`src/lib/realtime/config.ts`). A share link built off the browser uses `NEXT_PUBLIC_SITE_URL`, then the same `http://localhost:3000`.

`NEXT_PUBLIC_*` is copied into the client bundle at `next build` and does not change when `next start` runs. On a public deploy, set the https origin with no trailing slash in the project environment before the build. Do not upload it until asked.

Canonical, hreflang and `metadataBase` do not read this name. `siteUrl()` in `src/i18n/seo.ts` uses `SITE_URL`, then `https://$VERCEL_PROJECT_PRODUCTION_URL`, then `http://localhost:3000`. On Vercel production the canonical URL is the project's production host even while `NEXT_PUBLIC_SITE_URL` is still unset. Share links built on the server, and the MCP connector, keep using localhost until the public origin is set.

Every other key in `.env.example` is optional. A missing key is "not set up on this deployment". `.env.local` exists on this machine and is loaded by `next build`. It is not printed and not committed.

## When there is a yes

1. The production build below has to be green first. It was green at 18:23 (see the smoke).
2. Link the Vercel project from this repo (`/Users/amar/Codes/ak/simlab`, not the parent `ak` repo). Framework: Next.js. Root directory: the repo root. No install override; leave Vercel on its own install. Do not run `npm ci` from this runbook.
3. Set Node only if a dashboard value is fighting `engines`. `24.x` in `package.json` already wins.
4. Set `NEXT_PUBLIC_SITE_URL` to the public https origin, then the sponsor keys you actually have (`META_API_KEY`, `SERPAPI_KEY`, and the rest of `.env.example`). Set them in the dashboard. Do not put them in git.
5. Deploy from the Git integration or the CLI. A CLI deploy picks up `.vercelignore`. Then smoke the table below on the real URL.

## Local production build

Same script Vercel runs (`prebuild` writes the content index, then `next build`, typecheck on). The dist dir is per agent so it does not collide with `.next`.

```bash
cd /Users/amar/Codes/ak/simlab
env -u SIMLAB_BUILD_SKIP_TYPECHECK NEXT_DIST_DIR=.next-deploy npm run build
NEXT_DIST_DIR=.next-deploy npx next start -H 127.0.0.1 -p <free-port>
```

`next start` only works after a finished build. `-H` and `-p` are the Next 16.4 CLI flags. Delete `.next-deploy` when the smoke is over. If the build adds `.next-deploy` lines to `tsconfig.json`, remove only those lines. `tsconfig.json` belongs to P1-health. Do not commit it, and do not revert other include lines.

`SIMLAB_BUILD_SKIP_TYPECHECK=1` skips typecheck only when `VERCEL` is unset (`next.config.ts`). A deploy build always typechecks. These runs did not set the skip.

## Smoke, 2026-10-24 18:24 CDT

Rerun by the driver after the build went green. Node v24.8.0, Next.js 16.4.3, `NEXT_DIST_DIR=.next-deploy`, typecheck on. `.env.local` was loaded; its keys are still placeholders (D4). Content index: 7 boards, 4 robotics, 5 drones, unchanged. The server listened on `127.0.0.1:3417` and was stopped after the smoke. `.next-deploy` was deleted, and the two `.next-deploy` include lines the build added to `tsconfig.json` were reverted. Nothing from the build was committed.

| When (CDT) | Command | Result |
|---|---|---|
| 18:23 | `env -u SIMLAB_BUILD_SKIP_TYPECHECK NEXT_DIST_DIR=.next-deploy npm run build` | Exit 0 in 13 s. Compiled in 6.1s. TypeScript finished in 4.5s. 645 of 645 static pages. |
| 18:24 | `NEXT_DIST_DIR=.next-deploy npx next start -H 127.0.0.1 -p 3417` | Ready in 65ms. No errors in the server log. |

The build still prints one warning and goes on past it: `src/i18n/figure-strings.ts` cannot resolve `src/i18n/figures/<locale>.json`. No phase-1 row owns figure strings (platform audit M4). Phase 3 adds `src/i18n/figures/`.

The two failures from 17:21 and 17:23 are gone. The fixture-preview route was deleted in `28d8564` (P1-health). The DevKitC pin rows point at their own lesson's prose since `70d019d`.

### Demo-path routes

`curl` against the local server at 18:24. Every 200 page has its own `<title>`, and none has a `NEXT_HTTP_ERROR_FALLBACK` (not-found) or `SimLab i18n` marker in its HTML. These are status codes only. No browser ran, so console errors and the figures at runtime were not checked here. Gate 1 does that.

| Route | Demo step | HTTP |
|---|---|---|
| `/` | entry redirect | 307 to `/en` |
| `/en` | dashboard | 200 |
| `/en/boards/uno-r3` | 1, open the board | 200 |
| `/en/boards/uno-r3/blink` | 1, Blink | 200 |
| `/es/boards/uno-r3` | 2, friend in Spanish | **404** |
| `/en/drones/quad5` | 3, Build it for real | 200 |
| `/en/drones/quad5/fly` | 4, Fly | 200 |
| `/en/together` | 2 and 5, room and Build Night | 200 |
| `/api/mcp` | 5, Muse connector | GET 405, by design (`{"error":{"code":"method_not_allowed"}}`, JSON-RPC goes over POST). POST `initialize` 200. POST `tools/list` 200 with 7 tools: `search_catalog`, `get_item`, `drone_calc`, `price_parts`, `plan_build_night`, `create_room`, `get_passport`. |
| `/figures/boards/uno-r3.html` | 1, the inked board | 200 |

**`/es/boards/uno-r3` is a 404.** Only `src/i18n/content/en/` exists, and `loadBoardPage` in `src/app/[lang]/boards/_lib/load.ts` returns null when the language's prose is missing, so the page calls `notFound()`. Every item page outside English 404s the same way. The fix is BUILD-PLAN §3.2 item 5 (English prose with a "not yet translated" notice), which no phase-1 row owned. Demo step 2 needs that fallback, or Spanish judge-path prose (phase 3).

The MCP `initialize` answer reports `websiteUrl` as `http://localhost:3000`, because `NEXT_PUBLIC_SITE_URL` is unset. That is expected locally. Set it before a public build.

Also seen: the `/en` tab title is "Dashboard", with no "· SimLab". The `%s · SimLab` template lives in `src/app/[lang]/layout.tsx`, and Next applies a layout's `title.template` only to child segments, not to the page in the same segment (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`). Every other page in the table gets the suffix.

## Not done

- Vercel project is not linked.
- No preview or production deploy.
- No environment variables uploaded, including `NEXT_PUBLIC_SITE_URL` on a public host.
- No browser pass over these routes (console errors, the figure bridge, the 390×844 viewport). That is gate 1.
