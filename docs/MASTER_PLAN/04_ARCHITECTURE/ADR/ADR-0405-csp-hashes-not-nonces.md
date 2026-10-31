# ADR-0405: CSP by hashes from Next's SRI, not nonces; the SYSTEM 7.4 header set

Status: proposed, 2026-10-27, revised after review the same day. Author: frontend and backend architecture seat.
Upstream: X4, P4, R-006, SYSTEM_ARCHITECTURE 7.4 and 12.2, Next docs `content-security-policy.md` lines 38, 181, 397 and 456-520. Downstream: F-002, F-159. Spec: FRONTEND_ARCHITECTURE section 9.

## Problem

R-006 asks for a strict CSP with no `unsafe-inline` for scripts. A nonce needs dynamic rendering of every page and is incompatible with Partial Prerendering; the app is static with `cacheComponents` on. The page must still reach the optional server, AI providers called straight from the browser, and a local model server, and must not block Web Serial.

## Constraints

1. Keep the static shell (D-011: fast first load on weak devices).
2. No `unsafe-eval` and no `unsafe-inline` for scripts.
3. WebAssembly must compile (engines).
4. A self-hoster can add a connect origin without a rebuild (R-079).
5. The header must equal SYSTEM 7.4, so there is one policy in the plan.
6. `IYNK_ALLOWED_ORIGINS` means "origins allowed to call the server" and keeps only that meaning.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Nonce in `proxy.ts` | Per-request nonce | Rejected as default: forces dynamic rendering, breaks PPR |
| B. Hashes through `experimental.sri` plus a static header | Documented as keeping static generation | **Chosen**, experimental |
| C. `unsafe-inline` |  | Rejected by R-006 |
| D. `connect-src` fed by `IYNK_ALLOWED_ORIGINS` | The first draft | Rejected on review: wrong meaning, and no AI provider, local model or typed-in server origin |

## Decision

1. A `Content-Security-Policy` header for `/(.*)` from `headers()` in `next.config.ts`: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'` plus build-emitted hashes; `worker-src 'self' blob:`; `connect-src 'self' <server origin> <shipped adapter origins> <IYNK_CONNECT_ORIGINS>`; `img-src 'self' data: blob:`; `style-src 'self'; style-src-attr 'unsafe-inline'`; `frame-src 'self'; frame-ancestors 'self'`; `object-src 'none'`; `base-uri 'none'`; `form-action 'self'`.
2. `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), serial=(self)`.
3. The theme boot script becomes `/boot.js`. `poweredByHeader: false`.
4. `IYNK_CONNECT_ORIGINS` feeds the page's `connect-src`; `IYNK_ALLOWED_ORIGINS` feeds only the server (CORS, WebSocket origin check, BACKEND 13.1).
5. Check FA-05 decides whether Next's inline scripts pass; if not, a hash allow-list, else nonces on `/[lang]` and `/[lang]/studio` only.

## Technical justification

The docs say SRI hashes keep static generation (lines 456-520, VERIFIED) while nonces force dynamic rendering (lines 38, 181, 397). `style-src-attr 'unsafe-inline'` lets React set `style` attributes without allowing inline `<style>` elements. `serial=(self)` states the policy Web Serial (F-159) needs instead of relying on a browser default; microphone is denied because voice is LATER (F-108).

## Performance data

No measurement of the policy's cost exists. What it avoids: a request-time render of every page. A lesson page's first load is 701 KB gzip today (PERFORMANCE_BASELINE section 1), and the static shell is part of how the budgets in ADR-0407 are reached. UNKNOWN: whether hashing adds build time (FA-05 build).

## Cost implications

A header block in `next.config.ts`, the `/boot.js` file, and FA-05. For a self-hoster: one environment variable and a restart of the `web` container to add an origin; rooms are unaffected (they live in the `server` container).

## Licensing

Nothing added. Next.js is MIT (VERIFIED).

## Security implications

Removes the single first-party inline script (SECURITY_BASELINE P2). Blocks scripts from any other origin, `eval`, plugins and base-tag rewrites, and limits where the page may send data (`connect-src`), which is the main defence for keys held in IndexedDB. A server origin the policy does not list is blocked and the app says so; it is never widened at runtime. `style-src-attr 'unsafe-inline'` remains a recorded gap. Figures are same-origin and trusted (X3); their inlined CSS may need an exemption (FA-05).

## Reversibility

Medium to high. The header is one block in one file, and each fallback in decision 5 is a step down in strictness, not a redesign.

## Migration plan

B0 (FE-0): move the boot script to `/boot.js`, give `settings` its own `localStorage` key (`iynk:settings`) with a one-time copy from `iynk:v1`, add the header block and the build flag, run FA-05. No stored data other than that key changes. Operators set `IYNK_CONNECT_ORIGINS` in `deploy/.env` (SYSTEM 12.2).

## Known limitations

- Next's SRI support is experimental: the docs say "This feature is experimental and available in App Router applications" (`content-security-policy.md` line 460, VERIFIED), it is App Router only, and it "cannot handle dynamically generated scripts". It may change or be removed in a Next 16.x release.
- Whether Next's own inline flight-data scripts pass `script-src 'self'` with hashes is UNKNOWN until FA-05.
- Whether Next or the app emits inline `<style>` elements that `style-src 'self'` blocks is UNKNOWN until FA-05; the fallback is `'unsafe-inline'` for styles.
- A static header means adding an origin needs a restart of the web container.
- `Permissions-Policy` does not stop first-party code from asking for a feature that is allowed to `self`.
