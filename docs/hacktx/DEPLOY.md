# Deploying SimLab

P1-deploy, 2026-10-24 17:23 CDT. The app is a Next.js 16.4.3 App Router project. Vercel is not linked, nothing has been deployed, and no environment variables have been uploaded. Those three wait for a yes (BUILD-PLAN §9, D4).

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

1. The production build below has to be green first. It is not, today.
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

## Smoke, 2026-10-24 17:23 CDT

`next start` did not run. Both builds exited 1, so there is no server and no HTTP status. Node v24.8.0, Next.js 16.4.3, `NEXT_DIST_DIR=.next-deploy`. Content index: 7 boards, 4 robotics, 5 drones, unchanged. `.next-deploy` was deleted after. `tsconfig.json` had picked up `.next-deploy` include lines; a later edit (P1-health's `.next-health` lines) replaced them, and the file no longer mentions `.next-deploy`. Those lines were not committed.

| When (CDT) | Command | Result |
|---|---|---|
| 17:21 | `env -u SIMLAB_BUILD_SKIP_TYPECHECK NEXT_DIST_DIR=.next-deploy npm run build` | Exit 1. Compiled in 3.1s. Typecheck failed. |
| 17:23 | same command, after the stale route types were gone | Exit 1. Compiled in 2.5s. Typecheck finished in 4.3s. Prerender failed at 483/645 pages. |

**17:21 typecheck.** `.next/types/validator.ts` still imported `src/app/[lang]/robotics/fixture-preview/page.js`. That page is deleted in the working tree (`git status` shows `D` on `src/app/[lang]/robotics/fixture-preview/page.tsx`). P1-health owns removing the route. The follow-on error was `__InvalidParamMatchingKeys` in the same generated file. The validator was regenerated before the retry and no longer names that page. This failure did not recur.

**17:23 prerender.** This is the failure that stops a deploy.

```
Error occurred prerendering page "/en/boards/esp32-devkitc/touch"
Error: SimLab i18n: no string "lessons.blink.pins.GPIO23.to" in en/boards.
  src/i18n/translate.ts:67
  src/components/boardlab/LessonInfo.tsx:118
Export encountered an error on /[lang]/boards/[board]/[lesson]/page: /en/boards/esp32-devkitc/touch
```

The touch lesson's pin table points at the blink lesson's prose (`src/content/boards/esp32-devkitc.ts`, the `GPIO23` and `GND` rows). The string exists under `lessons.blink` in `src/i18n/content/en/boards/esp32-devkitc.json`. The lesson page passes `lessonText()`, which keeps only the open lesson's body (`src/app/[lang]/boards/_lib/load.ts`), and `src/components/boardlab/text.tsx` builds `tc` from that stripped tree with scope `en/boards`. The blink keys are gone, and a missing key throws. The same borrow shows up on the boot-button, fade and web-switch lessons in that file. No phase-1 row owns `esp32-devkitc`. P1-health's prerender row is `lessons.dimmer.*` on the esp32-s3 bench, a different page. P1-checks owns a lesson's own code disagreeing with its own text, not this cross-lesson pin label.

Both builds also printed one warning, and the build continued past it: `src/i18n/figure-strings.ts` cannot resolve `src/i18n/figures/<locale>.json`. No phase-1 row owns figure strings (platform audit M4).

### Demo-path routes

Not requested. The server never started.

| Route | Demo step | HTTP |
|---|---|---|
| `/` | entry redirect | not requested |
| `/en` | dashboard | not requested |
| `/en/boards/uno-r3` | 1, open the board | not requested |
| `/en/boards/uno-r3/blink` | 1, Blink | not requested |
| `/es/boards/uno-r3` | 2, friend in Spanish | not requested |
| `/en/drones/quad5` | 3, Build it for real | not requested |
| `/en/drones/quad5/fly` | 4, Fly | not requested |
| `/en/together` | 2 and 5, room and Build Night | not requested |
| `/api/mcp` | 5, Muse connector | not requested |
| `/figures/boards/uno-r3.html` | 1, the inked board | not requested |

### 404s this build did not measure

Read from the loaders, not from a response. `loadBoardPage` returns null when `src/i18n/content/<lang>/boards/<id>.json` is missing, and the page calls `notFound()`.

| Path | Why | Phase-1 row |
|---|---|---|
| `/en/boards/uno-r3` | `src/content/boards/uno-r3.ts` is in the registry. There is no `src/i18n/content/en/boards/uno-r3.json`, and no other language's file either. | P1-uno |
| `/en/boards/uno-r3/blink` | Same missing prose. The lesson id `blink` is lesson 2 in `uno-r3.ts`. `generateStaticParams` still lists the pair, and the page 404s. | P1-uno |
| `/es/boards/uno-r3` | The loader 404s when that language's prose is missing. An English fallback is BUILD-PLAN §3.2 item 5, and no phase-1 row owns it. Judge-path translation is phase 3. | none |
| `/en/robotics/fixture-preview` | Not on the demo path. The page file is deleted in the working tree. P1-health owns that deletion. The old page also called `notFound()` when `NODE_ENV` was `production`. | P1-health |

`src/i18n/content/en/drones/quad5.json` is present, so the quad5 loader is not missing English prose. That was not confirmed over HTTP.

## Not done

- Vercel project is not linked.
- No preview or production deploy.
- No environment variables uploaded, including `NEXT_PUBLIC_SITE_URL` on a public host.
- Local `next start` smoke did not run, because the production build exits 1 on `/en/boards/esp32-devkitc/touch`.
