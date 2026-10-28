Answers plan item: T-B1-23 (FA-03)

# FA-03: late editor chunk and the prefetch setting

## Question

Does `/en` fetch JavaScript it does not need (CodeMirror, dock panels) in its first 3 seconds? Is the cause `partialPrefetching: true` (`next.config.ts:16`) or the `Link` prefetch of lesson routes? Does turning either off cut JS transferred on `/en` by at least 20 percent without slowing the first click to a lesson by more than 300 ms at 4x CPU?

## Method

Tool: `scripts/perf-prefetch.mjs` (this commit). Production build of build/v1 (keyless env, Next 16.4.3, Turbopack), served with `next start` on a random port from 47000 to 47999. Playwright Chromium, a fresh context per run, 5 runs per variant, median reported. Script bytes are CDP `encodedDataLength` of `Script` requests from navigation to 3 s after `load`, taken before any click. The click row slows the page to 4x CPU, clicks the first `a[href^="/en/boards/uno-r3"]` and times the click until the new page's first `h1` shows. The machine was shared with other agents, so the click times carry noise of about 100 ms between repeats.

Variants (scratch edits, all reverted; only `scripts/perf-prefetch.mjs` and its test are committed):

| Id | Change |
|---|---|
| A | none (baseline) |
| B | `partialPrefetching: false` in `next.config.ts` |
| C | `prefetch={false}` on the links in `NavLinks.tsx` and `SiteHeader.tsx` (the card's option) |
| D | `prefetch={false}` on every `<Link>` in `src/` |
| E | `prefetch={false}` on the `<Link>` in `src/app/[lang]/page.tsx` and `src/components/marketing/index.tsx` |
| F | `prefetch={false}` on `NavLinks.tsx`, `SiteHeader.tsx` and `FooterNav.tsx` |

## Results

| Variant | Scripts | JS transferred on `/en` | Change | CodeMirror chunk on `/en` | Click to lesson at 4x (median) |
|---|---|---|---|---|---|
| A | 20 | 570.9 KB | | yes, 187,329 B (`35ya76-4stw__.js`) | 1397 ms |
| B | 20 | 570.9 KB | 0% | yes | 1450 ms |
| C | 17 | 552.6 KB | -3% | yes | 1365 ms |
| D | 10 | 165.1 KB | -71% | no | 1196 ms |
| E | 15 | 205.7 KB | -64% | no | 1224 ms |
| F | 17 | 552.6 KB | -3% | yes | 1346 ms |

## Findings

1. The hypothesis holds in part. The landing page does fetch the CodeMirror chunk (and other lab chunks) it does not need. It is a `Script` request started by the Turbopack chunk loader (`loadChunkCached`), which is what a `Link` prefetch of a linked route does under this build.
2. `partialPrefetching` is not the cause. Turning it off changes nothing (B equals A byte for byte).
3. The nav and footer links are not the cause either. The card's option (C) and the footer variant (F) cut about 3 percent.
4. The cause is the links in the landing page body: the lab cards and calls to action in `src/app/[lang]/page.tsx` and `src/components/marketing/index.tsx` (E). They point at the lab routes that import the editor.
5. The click to a lesson did not get slower. All three variants that cut JS are faster at 4x CPU (1196 to 1224 ms against 1397 ms), because the main thread is not busy with the prefetched chunks when the click happens. The difference is inside the noise for C and F; for D and E it is about 170 to 200 ms in favour.

## Decision

Exit condition "act" is met: E cuts JS transferred on `/en` by 64 percent and the click delay stays well inside 300 ms (it is shorter).

For T-B1-23: the option is `prefetch={false}` on the `Link`s in `src/app/[lang]/page.tsx` and `src/components/marketing/index.tsx`, not on `NavLinks.tsx` and `SiteHeader.tsx` as the card assumed. Leave `partialPrefetching: true` as it is. The task should check whether `ArrowLink` and `CtaLink` (both in `marketing/index.tsx`) are used on other pages where prefetch is wanted; D shows that disabling everything gives 71 percent, so the remaining 7 points are in other components (`Button.tsx`, `Catalogue.tsx`, `Editorial.tsx`) and are not needed to pass the 20 percent bar.

Caveats: the landing page's remaining 205.7 KB was not split by cause; the click test used one lesson link; headless Chromium on a loaded laptop is not a phone.

## Applied (T-B1-23)

Decision: act. `prefetch={false}` is on the lab-card `Link`, the `ArrowLink` to Together and the `CtaLink` start button in `src/app/[lang]/page.tsx`. `marketing/index.tsx` is unchanged, because `ArrowLink` and `CtaLink` also serve the dashboard, where prefetch is wanted. `partialPrefetching: true` stays.

After, same tool and settings (5 runs, median): `/en` 22 scripts, 384.2 KB transferred against 570.9 KB before (-33 percent); click to a lesson at 4x CPU 475 to 531 ms. The 64 percent of variant E was not reached: the remaining links (locale switcher, nav, footer) were tried and the locale links changed nothing.
