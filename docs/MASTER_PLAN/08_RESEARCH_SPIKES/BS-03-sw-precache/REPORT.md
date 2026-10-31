Answers plan item: T-B3-S3 (BS-03)

# BS-03: service worker precache source and offline reload

## Question

After one online visit, can a hand-written service worker answer a reload of a prerendered page while offline, in Chromium and WebKit, on a production build with `cacheComponents: true`? Which source gives the URL list: (A) files derived from the build output, or (B) URLs found by scanning the page HTML at `install`? Does a client-side navigation offline get its RSC payload from the cache, or does it fall back to a hard navigation?

## Method

Production build of `build/v1` (`746b750`) with Next 16.4.3, Turbopack, keyless env, `NEXT_DIST_DIR=.next-T-B3-S3`, served with `next start` on port 47311. Page under test: `/en/about` (a prerendered page, stand-in for `/en/studio`). Playwright 1.64 Chromium and WebKit (Playwright's WebKit build, not Safari). The worker is a scratch file served from `public/` for the run and moved into `src/` here; the product tree is unchanged.

Steps per engine and variant: open the page, register the worker, wait until it controls the page, reload once online, then `context.setOffline(true)` and reload. Count `requestfailed` events and responses with status 400 or more (the worker answers a cache miss with a synthetic 504 carrying `x-sw-miss`). Then go to `/en/about` offline again and click a `Link` to `/en/boards` and to `/en/together`; a `window` marker set before the click tells a soft navigation (marker survives) from a hard one.

| Variant | Precache list at `install` | Runtime caching |
|---|---|---|
| B | Fetch `/en/about`, cache it, regex every same-origin asset URL out of the HTML (including the escaped RSC payload inside it) and every `url()` in the linked CSS | none |
| A-manifest | `build-manifest.json` (`polyfillFiles`, `rootMainFiles`) plus `entryJSFiles`, `entryCSSFiles` and every `clientModules[].chunks` entry of `server/app/[lang]/about/page_client-reference-manifest.js`, plus two page HTML urls | none |
| A-all | Every file under `.next/static` except `.map` and `.ts`, plus two page HTML urls | none |
| B-rt, A-manifest-rt | As B and A-manifest | every same-origin GET that succeeds is put in the cache (key is the full URL, `ignoreVary`), so the RSC prefetches Next sends are stored |

Scripts: `src/sw-spike.js` (worker, mode and runtime caching come from its query string), `src/genlist.mjs` (builds the A lists from the build output), `src/run.mjs` (Playwright driver).

## Results

Offline reload of `/en/about`, same result in both engines:

| Variant | Page shows, hydrates | `requestfailed` | Synthetic 504s | Which URLs missed |
|---|---|---|---|---|
| B | yes | 0 | 6 | the 6 RSC prefetches (`/en?_rsc=...`, `/en/boards?_rsc=...`, and so on) |
| A-manifest | yes | 0 | 7 | the 6 RSC prefetches and `/thumbs/boards/uno-r3.webp` |
| A-all | yes | 0 | 7 | the same 7 (the image is in `public/`, not in `.next/static`) |
| B-rt | yes | 0 | 0 | none (the warm visit stored the prefetches) |
| A-manifest-rt | yes | 0 | 0 | none |

Nothing the page needs to render was missing in any variant. The 504s are the `Link` prefetches for the five nav targets and the page itself; Next treats a failed prefetch as no prefetch and shows nothing.

Offline click on a `Link` (from `/en/about`):

| Variant | `/en/boards` | `/en/together` |
|---|---|---|
| B | hard navigation, offline error page (HTML not cached) | hard navigation, offline error page |
| A-manifest, A-all | hard navigation; the cached HTML shows; in WebKit with A-manifest the page loads Next's "This page couldn't load" because the list has no chunks of the `/en/boards` route | hard navigation, offline error page |
| B-rt, A-manifest-rt | soft navigation, `Board Lab` | soft navigation, `Nobody has to build alone` (its HTML was never cached) |

Size of the lists:

| List | URLs | Gzip of the list itself | Gzip of the assets it names |
|---|---|---|---|
| A-manifest (one route) | 15 | 230 B | 252,625 B |
| A-all (every route) | 150 | 1,900 B | 2,463,346 B (over the 1.5 MB ceiling) |
| B (one route, regex scan) | 27 | not stored | 833,455 B: 245 KB JS, 83 KB fonts, 44 KB webp, 20 KB CSS, 426 KB PNG |

The 426 KB PNG in B is a metadata image (Open Graph) the regex picked up because its path is in the HTML; excluding `opengraph-image` brings B to about 410 KB, close to A-manifest plus fonts and the image.

## Findings

1. A hand-written worker with a precached HTML page and its assets reloads the page offline in both engines, with zero failed requests. This holds with `cacheComponents: true`; the prerendered HTML is a plain `GET` and caches like any file.
2. Both sources work for one known route. B needs no build step and sees everything the HTML names (images in `public/`, fonts, chunks); A-manifest needs a post-build script that reads Next's internal `client-reference-manifest` format (unstable between Next versions) and still missed the `public/` image. A-all is complete for JS and CSS but whole-site and 2.46 MB gzip, so it breaks the 1.5 MB ceiling.
3. Neither source can see the chunks of other routes or lazy chunks loaded after a user action (the editor, workers). Scanning another route needs its HTML fetched too, so the list for the studio shell must name the studio route, and any lazy chunk must be found some other way (runtime caching, or a manifest of the lazy chunks).
4. Pure precache cannot give soft navigation. The `Link` request carries `RSC` headers and a `_rsc` query, so it never matches a precached HTML file; Next then falls back to a hard navigation, which works only if that page's HTML and chunks are precached. Caching every same-origin GET as it passes (the `-rt` variants) stores the RSC prefetches during an online visit, and the offline click is then a soft navigation in both engines, even for a page whose HTML was never cached.
5. Not tested, from reading the worker lifecycle: the browser re-installs a worker only when its bytes change. A new build with the same `sw.js` text would keep the old cache, so the build id must be in the worker file or its registration URL, and old caches must be deleted on `activate`.

## Decision

- Source: (B), scan the HTML of the routes at `install`, restricted to `/_next/static/`, `/figures/`, fonts and the images the page names (skip metadata images), plus runtime caching of same-origin GETs for the RSC prefetches and for lazy chunks. Pure precache gives the offline reload but not soft navigation.
- Soft navigation offline: yes, when the RSC prefetches were cached during an online visit. A route that was not prefetched online falls back to a hard navigation, which needs its HTML and chunks in the cache.
- The studio list stays well under the ceiling (about 410 KB gzip for the about page; the real studio shell is not measured here).

## For T-B3-09

- Cache key is the full URL with `ignoreVary: true`; the HTML (`Vary: rsc, ...`) and the RSC responses have different URLs so they do not collide.
- Put the build id in the worker URL or text, and delete caches of other ids on `activate`.
- Answer an uncached request with a network error or 504 and let Next fall back; do not return HTML for an RSC request.
- Re-run this experiment against the real `/en/studio` once it exists; the lazy editor chunks are the open risk.
- WebKit here is Playwright's build; a real Safari check is left for Amar.
