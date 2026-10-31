Answers plan item: T-B1-13 (FA-05)

# FA-05 / S-B1-01: CSP by SRI hashes on this app

Run 2026-10-28 on `build/v1` at `bc5bd2c` (Next 16.4.3, Turbopack, `cacheComponents: true`), headless Chromium via Playwright, a production build served by `next start` on port 47311 (stopped afterwards), keyless env. Scratch scripts and logs: `/Users/amar/iynk-build/scratch/b1-spikes/S-B1-01/`. No product file was changed (the config edits were made in a worktree and reverted).

## Verdict: FAIL

The policy in the card does not work. SRI only adds `integrity` to external script tags. Next also emits 25 to 30 inline `<script>` tags per page, and a `script-src` without `unsafe-inline` or a hash for each one blocks them all. React never hydrates. T-B1-13 stays "not started" and the orchestrator asks Amar (section "What to decide").

## Config tested

`next.config.ts`: `experimental: { sri: { algorithm: "sha256" } }` and the page header exactly as in the card (`default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; style-src-attr 'unsafe-inline'; worker-src 'self' blob:; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-src 'self'; frame-ancestors 'self'`) on `/:path*`, plus on `/figures/:path*` the figure policy of D-B1-3 (`default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-ancestors 'self'`).

## Results

### 1. The card's policy, unmodified (5 pages)

| Page | `securitypolicyviolation` events | Page errors | Hydrated |
|---|---|---|---|
| `/en` | 30 (`script-src-elem inline`) | 0 | no |
| `/en/boards/uno-r3/blink` | 25 | 0 | no |
| `/en/robotics/uno-r3-build` | 29 | 0 | no |
| `/en/drones/quad5/fly` | 25 | 0 | no |
| `/en/about` | 25 | 0 | no |

On `/en` and the blink lesson `self.__next_f` is `undefined` and no element carries a React fiber key, so the page is server HTML only. Page errors stay at 0 because the blocked scripts never run.

The tags in `/en` (41 `<script>`): 11 external, all with `integrity="sha256-..."` and allowed by `'self'`; 30 inline: the theme boot script, the Turbopack bootstrap, the `$RB/$RV/$RT` suspense helpers, `(self.__next_f=...).push` and 25 `self.__next_f.push([1,"..."])` flight payload chunks (135,889 characters in all). The flight chunks carry the page's content, so they differ per page.

### 2. Could a hash list fix it (the "partial" route)?

Per-request hashing of the inline scripts, injected into `script-src` by a test proxy (Playwright `route.fulfill`), makes every page hydrate with 0 page errors. So hashes work in a browser. They cannot come from `next.config.ts`:

- Inline script counts per page are 30, 25, 29, 25, 25; unique hashes across the five pages are 107; only 5 are common to all (bootstrap helpers). The rest are page content.
- The hashes were stable across two requests of the same page on this build, but they change with every content change and every rebuild.
- `headers()` runs when the config loads, before any HTML exists, and its result is written into the routes manifest. A hash list from the built HTML would need a post-build step that rewrites `.next/routes-manifest.json`, a path Next does not document. Dynamic and partially prerendered routes (`ƒ` and `◐` in the build table) would still stream inline payloads that no build step sees.

So the card's "partial" condition (a hash list `next.config.ts` can read at build time) is not met. I did not build the manifest patch: it is outside the card and unsupported.

### 3. Two findings that hold for any strict policy, hashes or not

Measured with the hash list injected, so they are separate from the inline-script failure:

- `style-src 'self'` breaks the code editor. CodeMirror creates `<style>` elements at run time (`style-mod`), which are blocked (`style-src-elem inline`). The Try it yourself panel renders with its gutter numbers stacked and no theme (screenshot: `/Users/amar/iynk-build/scratch/b1-spikes/S-B1-01/csp-lesson.png`). `LabDock.tsx:290` also renders an inline `<style>{PUSH_PAGE}</style>` that is blocked. `style-src-attr 'unsafe-inline'` does not cover elements. Fix needs `style-src 'self' 'unsafe-inline'` (style injection is low risk next to script injection) or a nonce, which static pages do not have.
- One `script-src eval` violation on three pages (blink, robotics, drones) from chunk `0i8f31w02d86u.js`: zod's `allowsEval` probes `new Function("")` inside a try/catch. It is harmless at run time (0 page errors) but it counts as a violation, so a "0 violations" test needs zod set to `jitless` or the probe tolerated.

### 4. Figure policy (D-B1-3): passes

With the page policy relaxed as in section 5 (so the parent allows the frame), `/figures/boards/uno-r3.html`, `/figures/robotics/uno-r3-build.html` and `/figures/flight/range.html` loaded in their iframes under the figure policy with 0 violations in the iframe and their SVG drawn. The `postMessage` bridge is not affected by CSP. Home, blink, robotics and drones each have one figure iframe; `/en/about` has none.

### 5. Fallback measured: scripts and styles with `unsafe-inline`

Page policy with `script-src 'self' 'unsafe-inline'` and `style-src 'self' 'unsafe-inline'` (rest unchanged): 0 page errors on all five pages and the five figure frames 0 violations; the only event is the zod `eval` probe from section 3 on three pages. Every other directive in the card (`default-src`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors`, `connect-src`, `img-src`, `worker-src`) held without a violation. This contradicts R-006 ("no `unsafe-inline` for scripts") and needs Amar's approval.

### 6. Not done

- Step 5 (theme boot script moved to `public/boot.js`) was not built. It removes 1 of the 25 to 30 inline scripts, so it cannot change the verdict; the counts above are the evidence.
- The nonce fallback (`proxy.ts`) was not run, only read about in `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`; it makes `/[lang]` render per request and gives up the static shell.
- No device or real browser other than headless Chromium.

### Build time

`next build` wall time, two runs each, same machine, other agents running: without SRI 12.9 s and 14.9 s; with SRI 19.4 s and 18.5 s. About 4 to 5 s more (ESTIMATED from two noisy runs).

## What to decide (for Amar)

The three fallbacks from risk R1, with what this run showed:

1. Page CSP with `script-src 'self' 'unsafe-inline'` (and `style-src 'unsafe-inline'`): works today (section 5), keeps the static shell, drops the script protection R-006 wanted. SRI can stay on: it still guards the external chunks. Needs Amar's approval.
2. Nonce policy from `proxy.ts` on `/[lang]`: keeps strict `script-src`, costs the static shell and CDN caching, and needs a nonce for CodeMirror styles too. Not measured.
3. No page CSP in B1, B0 headers only: nothing breaks, nothing gained.

T-B1-13 must also: allow `style-src 'unsafe-inline'` (or nonce) for CodeMirror and `LabDock`, and handle the zod `eval` probe, whichever option is chosen. The figure policy of D-B1-3 can go in as written.
