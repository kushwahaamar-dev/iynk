# App shell, routing, i18n, design system, catalogue pages, sound, settings, SEO

**Paths:** `src/app/[lang]/{layout,page,not-found}.tsx`, `src/app/[lang]/about`, `src/app/[lang]/[...rest]`, `src/app/globals.css`, `next.config.ts`, `src/components/{shell,ui,catalogue,marketing,editorial,data,settings}/**`, `src/lib/sound/**`, `src/lib/settings/**` (boot script), `src/i18n/**` (code, `messages/`, `content/`, `figures/`)
**Entry points:** `src/app/[lang]/layout.tsx` (root layout, the only `<html>`), `next.config.ts` (redirects, headers), `src/i18n/server.ts` (`getT`, `getMessages`, `getContentProse`), `src/i18n/client.tsx` (`I18nProvider`)
**LOC:** TS/TSX in scope, tests included: shell 1059, ui 2168, catalogue 231, marketing 89 (+85 CSS), editorial 132, data 610, settings 138, sound 939, lib/settings 182, i18n code 715, scope pages 508 (layout 74, page 249, about 118, rest 12, not-found 55), globals.css 604, next.config.ts 59. Sum about 7,500 lines of code. Commands: `find <dir> -type f \( -name '*.ts' -o -name '*.tsx' \) | xargs cat | wc -l`. i18n JSON: `find src/i18n -name '*.json' | xargs cat | wc -l` = 190,627 lines. Whole `src` TS/TSX = 104,102 lines.
**Owner today:** docs/ARCHITECTURE.md §2 (line 115-116, 125): "shell-app" owns layout, dashboard, about, [...rest], not-found, next.config.ts, src/i18n/*.ts(x), common.json, lib/settings; "design-system" owns components/ui, components/shell, globals.css, shell.json; "sound" owns lib/sound. These were parallel agent work packages in the hackathon, not people.

Labels: VERIFIED = I read the source or ran the command. DOCUMENTED = a doc says so. ESTIMATED = my calculation.

## Purpose

One Next.js 16.4.3 App Router shell for a three-lab learning site (boards, robotics, drones) plus `/together`, `/passport`, `/verify`, `/about`. It supplies: the `/[lang]` URL model for six languages, the header/footer/skip link/settings, a design system (paper/ink palette, Tailwind v4 tokens, UI primitives), the catalogue index layout used by the three lab indexes, a Web Audio sound layer, a settings document, and hreflang SEO. VERIFIED (`package.json` next 16.4.3; `src/app/[lang]/layout.tsx`).

## Dependencies (imports in, imports out; third-party packages)

- Third-party used by this subsystem: `next` 16.4.3, `react` 19.3.0, `tailwindcss` 4 + `@tailwindcss/turbopack`, `next/font/google` (Geist, Geist Mono, Instrument Serif, Noto Sans Devanagari; `layout.tsx:2,16-19`). No UI library (no Radix, no shadcn): Dialog, Popover, Tooltip, Tabs, Sheet and focus trap are hand-written (`src/components/ui/useModal.ts`). VERIFIED.
- Imports out of the shell into other subsystems: `@/components/figure` (hero iframe, `page.tsx:7`), `@/content/ids` and `@/content/index.generated` (counts, lab data; `shell/dashboard/data.ts:5-6`), `@/lib/progress/*` (settings are stored in the progress document), `@/lib/features` (client fetch of `/api/status`; `components/shell/NavLinks.tsx:6`), `@/lib/server/env` type (`lib/features.ts:5`).
- Imports in: every lab component imports `@/components/ui` and `@/i18n/client`; every page imports `@/i18n/server` and `alternatesFor`. This is the layer everything else leans on.
- Heavy packages (codemirror, solana wallet adapter, anchor) are not imported by shell, ui, settings, i18n or sound. Checked with `grep -rn "solana\|wallet-adapter\|codemirror" components/shell lib/settings i18n` which only hit the string "solana" in `nav.ts` and `namespaces.ts`. VERIFIED.

## Public interfaces (exported functions/types/components/messages, with path:line)

| Interface | Where | Notes |
|---|---|---|
| `LOCALES`, `Locale`, `DEFAULT_LOCALE`, `LANG_COOKIE`, `isLocale`, `htmlLang`, `pickLocale`, `parseAcceptLanguage`, `acceptLanguagePattern`, `localizedPath` | `src/i18n/config.ts:4-` | Single source of truth for languages; also imported by `next.config.ts:2`. |
| `NAMESPACES` (11), `Messages`, `CONTENT_LABS` | `src/i18n/namespaces.ts:4,6,25` | `Messages` types are derived from the English JSON. Typed keys come from `MessageKey<T>` in `translate.ts:12`. |
| `getT`, `getMessages`, `getDictionary`, `getContentText`, `getContentProse` | `src/i18n/server.ts` | Dynamic `import()` of one JSON per language/namespace/item; `getContentProse` falls back to English prose with `{text, lang}`. |
| `I18nProvider`, `useLocale`, `useCommonT`, `useT` | `src/i18n/client.tsx` | Client gets only `common.client` plus whatever a server page passes as props. |
| `alternatesFor`, `siteUrl` | `src/i18n/seo.ts` | Canonical + hreflang for all six + `x-default`. |
| `NAV`, `showNavEntry`, `isActive`, `NavId` | `src/components/shell/nav.ts:8-` | Hard-coded 8-entry union. Adding a page means editing the union plus `nav.<id>` in 6 shell.json files. |
| `SiteHeader`, `SiteFooter`, `SettingsMenu`, `LanguagePicker`, `ThemeControl`, `UntranslatedNotice`, `WorkspaceFrame` | `src/components/shell/index.ts` | |
| `CataloguePage`, `CatalogueHead`, `CatalogueGroup`, `CatalogueGrid`, card pieces | `src/components/catalogue/Catalogue.tsx` | Used by the three lab index pages. |
| UI kit: Button, Callout, Card, Chip, CodeBlock, Dialog, Select/TextInput, Icon, IconButton, Kbd, Meter, Panel, Popover, ProgressBadge, SegmentedControl, Sheet, SkipLink, Stat, Stepper, Tabs, Toggle, Tooltip, VisuallyHidden | `src/components/ui/index.ts:1-26` | 31 files, 2168 LOC incl. tests. |
| `playSound`, `setTone`, `startSound`, `silence`, `soundOn` | `src/lib/sound/index.ts` | Synchronous, safe on server. |
| `SettingsBootScript`, `SettingsSync`, `getSettings`, `setSetting`, `applySettingsToDocument` | `src/lib/settings/theme.tsx`, `settings.ts` | |
| Redirects `/` and `/{boards,robotics,drones,about,together,passport,verify}/:rest*` to a language | `next.config.ts:36-52` | Order: `iynk-lang` cookie, then Accept-Language regex, then `/en`. Non-permanent (307). |
| Figures header rule (`frame-ancestors 'self'`, 5 min cache) | `next.config.ts:23-31` | Only security header set in the repo config. |

## State ownership and persistence (stores, localStorage keys, server state, DB tables)

- Language: URL segment is truth. Cookie `iynk-lang` (1 year, `samesite=lax`, JS-written, not HttpOnly) is written by `LanguagePicker.tsx:25` and `FooterNav.tsx:66`; read only by the `/` redirect. VERIFIED.
- Settings: one localStorage key `iynk:v1` shared with learner progress (`src/lib/progress/storage.ts:5`). Settings object: `theme, sound, lofi, labels, reduceMotion, telemetry` (`storage.ts:31-39`). Defaults: theme `light`, sound off, telemetry **true**. VERIFIED.
- Theme is applied through `<html data-theme>` and `data-reduce-motion`, by an inline boot script (`lib/settings/theme.tsx:10-12`) before paint and then `SettingsSync` (`:36`). First visit is light even on a dark OS. Covered by `e2e/shell.spec.ts:123,137`.
- Feature flags: client fetches `/api/status` once per page load (`lib/features.ts`). Server render and first client render see every feature off, so Solana nav items (passport, verify) appear only after hydration. VERIFIED (`FEATURE_KEYS`, `NO_FEATURES` at `features.ts:19-33`).
- No database tables owned by this subsystem. Progress and settings are browser-local, so they are lost with cleared storage and never reach a server (progress sync is outside this audit).
- Sound engine: module singleton in `lib/sound/index.ts:10` created lazily on the client.

## Current functionality (what VERIFIED works, how you know)

1. Routing model. VERIFIED by reading every `generateStaticParams`:
   - Root: `LOCALES.map(lang)` = 6 (`layout.tsx:26`). Boards: `BOARD_IDS` = 12. Lessons: `lessonParams()` reads each board's `lessons` (`boards/_lib/load.ts:52`). I imported each board module with `node --experimental-strip-types`: lesson counts uno-r3 16, uno-r4 7, pico 6, basys3 5, de10-lite 5, esp32-devkitc 5, microbit-v2 5, nucleo-f401re 5, pi4-pi5 5, nano 4, nodemcu 4, esp32-s3 4 = **71 lessons**. Robotics benches 13, drones 13, drone fly pages 13.
   - Per language: 1 landing + about + boards/robotics/drones index + together + passport + verify (8) + 12 boards + 71 lessons + 13 benches + 13 drones + 13 fly = **130 pages**. ESTIMATED total: 130 x 6 = **780 prerendered pages**, plus 6 catch-all 404 shells. I did not build; the `.next` directory in the tree is a stale Oct 24 build from an older non-`[lang]` layout (its manifest lists `/boards/[slug]`), so it cannot confirm the count.
   - Catch-all `[...rest]/page.tsx` returns one dummy static param and calls `notFound()` so unknown URLs render the localized 404 (`[...rest]/page.tsx:6-12`; e2e `shell.spec.ts:158`).
   - 23 `route.ts` handlers under `src/app/api/**` (out of scope).
2. Caching. `next.config.ts:5-6` sets `cacheComponents: true` and `partialPrefetching: true`. The language layout exports `ensureStatic = "navigation"` (`layout.tsx:24`), valid in Next 16.4 per `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md:226-238`. Landing wraps its async body in `<Suspense>` (`page.tsx:38-44`). There are no `"use cache"` directives in scope; staticness comes from `generateStaticParams` + JSON imports. The build was not run here, so "every route is static" is DOCUMENTED by the layout comment and enforced by `ensureStatic`, not tested by me.
3. i18n completeness, VERIFIED by `node` scripts (`scratchpad/audit/shell-i18n/k.js`, `c.js`):

   UI messages, leaf keys per namespace, identical in all six languages (0 missing, 0 extra, every namespace file present in every language):

   | ns | keys | ns | keys |
   |---|---|---|---|
   | common | 36 | together | 192 |
   | shell | 104 | search | 190 |
   | boardlab | 376 | solana | 177 |
   | robotics | 250 | ai | 108 |
   | dronelab | 297 | hw | 64 |
   | flight | 270 | | |

   Total 2,064 keys per language, 12,384 across six. Untranslated leakage (string identical to English, 4+ letters; includes proper nouns and part numbers so it is an upper bound on copy-through): ai de5/es2/fr3/hi1/zh1; boardlab de33/es21/fr24/hi19/zh16; dronelab de27/es27/fr26/hi19/zh15; robotics de19/es20/fr23/hi13/zh11; search de16/es11/fr13/hi7/zh6. Others under 10 each.

   Item prose (`src/i18n/content/<lang>/<lab>/<id>.json`): English has 38 files (12 boards, 13 robotics, 13 drones) and 12,311 leaf keys. Each of es, fr, de, zh, hi has all 38 files, 12,311 leaves, 0 missing. Strings over 20 characters identical to English: es 32, fr 32, de 30, zh 24, hi 49. Command: `node c.js` (compares leaf paths per file).

   Figure strings (`src/i18n/figures/<lang>.json`): 4,087 English source strings (`figure-keys.json`), each of es/fr/de/zh/hi has 4,087 keys. Identical to the key (untranslated or proper noun) in es: 554 of 4,087 (13.6%); I did not compute the other four.

   Caveat: counts prove structure and presence, not translation quality. I did not read the translations; HYPOTHESIS that they are machine-generated (the repo has `/api/ai/translate`), unreviewed by native speakers.
4. Tests. `npx vitest run src/i18n src/components/shell src/components/ui src/components/settings src/components/data src/lib/sound src/lib/settings` = 24 files, 509 passed, 1 skipped, 4.2 s. VERIFIED (ran it, read-only).
5. Accessibility basics, VERIFIED in source:
   - Landmarks: `header`, `nav` with `aria-label`, `main id="main-<lang>" tabIndex=-1`, `footer`, footer `nav` labelled by an sr-only `h2` (`layout.tsx:62-67`, `SiteHeader.tsx:42,50`, `SiteFooter.tsx:14`). One `h1` per page seen in landing/404/catalogue head.
   - Skip link is the first focusable and per-language id (`SkipLink.tsx`, `layout.tsx:55`); e2e `shell.spec.ts:71`.
   - Focus: global `:focus-visible` 2.5px outline + 7px halo (`globals.css:362-367`). Modals: `useModal` makes siblings `inert`, traps focus, locks scroll, restores focus (`ui/useModal.ts:21-48`). e2e `shell.spec.ts:202` checks Settings Escape/focus return.
   - Reduced motion: both `@media (prefers-reduced-motion: reduce)` and a user setting `data-reduce-motion` kill animation and transitions (`globals.css:585-600`). The setting is applied by the boot script.
   - Colour contrast (computed with a WCAG formula): light muted `#625b4f` on paper `#f2efe7` 5.84:1, on surface 6.32:1; good 5.47, bad 5.32, warn 5.56 (all text colours pass AA). The accent fill `#ef6a4c` on paper is 2.67:1, so it must never carry text; I did not audit each use. Dark theme muted `#b3aa98` on paper `#1b1813` not computed.
   - axe runs on dashboard and 404 only (`e2e/shell.spec.ts:216`). Not run by me.
   - No `forced-colors` or `prefers-contrast` rules (`grep -n "forced-colors\|prefers-contrast" globals.css` returned nothing).
   - Tap targets: `.touch-target` 44px utility, header links `min-h-11`.
6. Design tokens. VERIFIED in `globals.css`: Tailwind v4 `@theme` with 6 accent hues each in -l/-m/-d tones (tomato, mustard, mint, cobalt, blush, metal; `:27-63`), semantic aliases (`--paper, --surface, --sunken, --ink, --muted, --rule, --line, --good/--bad/--warn/--info` + `-bg`, console and code-highlight sets; `:96-119`, `:134-168`), shadows (`--shadow-ink*`), "ink" radii, animation tokens, 4 font roles, layout vars (`--shell-max 1440px`, `--header-h 58px`, `:187-194`). Dark theme overrides the same names (`:257-267`) under three selectors (explicit, system, forced light excluded). Tokens are CSS variables, not exported to JS or a design-token file.
7. Bundle composition on the landing page (ESTIMATED from imports, not measured; no fresh build):
   - Always on the client: `I18nProvider`, `SettingsSync`, header client islands (NavLinks, SettingsMenu with UsageToggle, MobileNav, LanguagePicker), FooterNav, `useFeatures` fetch, sound module (imported by `SettingsMenu.tsx:11`, so the engine class ships on every page, but is instantiated lazily).
   - Landing adds `DashboardProgress` (reads localStorage progress), `FigureFrame` (an `<iframe loading="lazy">`, `FigureFrame.tsx:351-356`), `HeroArt` SVG.
   - The heavy payload is the hero iframe `/figures/boards/uno-r3.html?bare=1&view=breadboard&circuit=blink`, which loads figure JS from `public/figures` (24 MB on disk across the whole folder, `du -sh public/figures`; cache 300 s, `next.config.ts:25`). Codemirror, Solana adapters and the AVR emulator are not imported by the shell, so they load only on lab pages. Not measured: transfer size of the hero figure.
   - Fonts: Geist, Geist Mono and Instrument Serif (latin) preloaded; Devanagari `preload: false`; Chinese uses system fonts (`layout.tsx:12-15`, `globals.css:290-320`).
8. SEO. VERIFIED: `generateMetadata` on layout and landing; canonical + hreflang for 6 languages + x-default (`seo.ts:23-27`); OpenGraph and Twitter card; per-language `opengraph-image.png`; `<html lang>` uses BCP47 (`zh-Hans`). Not present: `app/sitemap.ts`, `app/robots.ts`, `manifest` (`ls src/app` shows only `[lang] api apple-icon.png globals.css icon.svg`; `public/` holds only `figures` and `thumbs`). No JSON-LD found in scope.

## Known defects (with repro or evidence)

| # | Defect | Evidence | Severity |
|---|---|---|---|
| 1 | No `sitemap.xml` and no `robots.txt`. 780 localized pages are discoverable only by crawling links. | `ls src/app public` as above; `find src/app -name 'sitemap*' -o -name 'robots*'` empty | medium |
| 2 | `siteUrl()` falls back to `http://localhost:3000` when neither `SITE_URL` nor `VERCEL_PROJECT_PRODUCTION_URL` is set, so canonical and hreflang would point to localhost on any non-Vercel host (e.g. the Vultr box). | `i18n/seo.ts:9-14` | medium |
| 3 | `dir="ltr"` is hard-coded, so adding Arabic/Hebrew/Urdu needs a rewrite of this line and an audit of physical CSS. | `layout.tsx:57` | low today, blocker for RTL |
| 4 | Feature-gated nav (passport, verify) renders empty on the server and appears after an `/api/status` fetch; layout shifts on every page load and crawlers never see these links. | `lib/features.ts` doc comment; `nav.ts:23-24` | low |
| 5 | Telemetry setting defaults to ON (opt-out). The footer privacy copy is the only disclosure. | `lib/progress/storage.ts:38`; `footer.privacy` in shell.json | medium (legal, see Security) |
| 6 | No `forced-colors` support; the offset-shadow card style leans on box-shadow, which Windows high-contrast drops. | grep above; `globals.css:157` `--card-shadow` | low |
| 7 | The `/` and lab redirects are 307 and only cover 7 section names; any new top-level section needs an edit to the `next.config.ts` regex. | `next.config.ts:49-50` | low |
| 8 | Accept-Language matcher is a hand-built regex; q-values ignored (documented at `config.ts:79-86`). `zh-TW` users get Simplified. | `config.ts:87-90` | low |

## Technical debt (table: item, path, evidence, severity, effort guess)

| Item | Path | Evidence | Severity | Effort |
|---|---|---|---|---|
| Nav is a closed union of 8 ids tied to 6 translated files | `components/shell/nav.ts:8` | `NavId` literal union | medium | S |
| Lab list (boards/robotics/drones) hard-wired in nav, redirects, footer, 404, dashboard `LAB_STILL` and `ProgressLab` | `nav.ts`, `next.config.ts:49`, `not-found.tsx:21-24`, `dashboard/labs.ts:6`, `lib/progress/keys.ts:15` | grep | high for a builder | M |
| Item id lists are generated into a static array; adding content needs a code change and rebuild | `content/ids.ts`, `content/index.generated.ts:55-59` | `AVAILABLE` const | high for a builder | L |
| Hackathon build knobs left in prod config (`IYNK_BUILD_SKIP_TYPECHECK`, `NEXT_DIST_DIR` for "~40 agents") | `next.config.ts:8-17` | comments | low | S |
| Content tests check shape not quality; "is translated" threshold allows up to 10% copy-through | `i18n/content.test.ts:49-56` | `toBeLessThan(0.1)` | low | S |
| Duplicate cookie-write code in two components | `LanguagePicker.tsx:25`, `FooterNav.tsx:66` | same string | low | S |
| Settings stored inside the progress document (one blob, version 1) | `progress/storage.ts` | couples theme to learner data | low | S |
| 190k lines of JSON in repo; every added language multiplies by ~6x of 12k prose leaves + 4k figure strings + 2k UI | counts above | | medium | ongoing |
| Marketing styles in a separate `marketing.css` plus Tailwind plus `globals.css` (604 lines) with ad-hoc `.ink-*` classes | `components/marketing/marketing.css`, `globals.css:376-` | | low | M |
| Generated tsbuildinfo, `.next` and `test-results` sit in the working tree | `ls` | check `.gitignore` | low | S |

## Test coverage (which test files, what they really check: hardware-derived reference values vs self-consistency with the implementation)

- Unit (24 files in scope, 509 pass): `i18n/{client,config,content,figure-strings,messages,server,translate}.test.ts(x)`, `shell/nav.test.ts`, `shell/dashboard/DashboardProgress.test.tsx`, UI tests for Dialog, ProgressBadge, SegmentedControl, Stat, Tabs, Tooltip, `ui/highlight.test.ts`, `settings/toggles.test.tsx`, `data/{components,format,messages}.test`, `sound/{sound,moments,react}.test`, `lib/settings/settings.test.tsx`.
- They check self-consistency: key parity and placeholder parity of every language against English (`messages.test.ts:29-45`, `content.test.ts:42-57`), parser behaviour, ARIA wiring. No hardware reference values are involved in this subsystem.
- E2E `e2e/shell.spec.ts` (Playwright): per-language render, `/` redirect, language switch keeps path/theme, light-by-default, theme persistence, 404, phone overflow, Settings focus return, axe on dashboard and 404, hydration error watcher (`:16`). I did not run Playwright.
- Gaps: no automated check that translated text is correct or readable; axe not run on catalogue indexes, about, or lab pages in this spec (other specs import axe: boardlab, dronelab, fly, robotics); no visual regression; no test that RTL or `dir` works; no test for sitemap/robots (they do not exist).

## Performance characteristics

- Rendering is static per language and page (ESTIMATED, not built). Each page imports only its language's JSON chunks (`server.ts` header comment, dynamic import per ns/lang/item).
- Hero figure is an iframe `loading="lazy"` with a SVG poster, so first paint does not wait for the figure. UNKNOWN: LCP, JS transferred, figure weight. No Lighthouse or bundle analyzer is wired into `package.json` scripts.
- Dashboard `loadLabs` loads every board, bench and drone module plus prose in parallel at build (`dashboard/data.ts:35-60`); a build-time cost that grows with catalogue size, UNKNOWN in seconds.
- Build cost: 780+ prerenders, each reading several JSON files. UNKNOWN wall time (agent comments mention shared-tree builds).

## Security risks

- Telemetry default on, plus a cookie and localStorage with no consent banner (DOCUMENTED privacy copy only). GDPR/ePrivacy exposure if the product serves the EU. See defect 5.
- `dangerouslySetInnerHTML` appears once in scope for the theme boot script (`theme.tsx`), with a constant string and a JSON-stringified key; no user input reaches it. VERIFIED.
- Only `/figures/*` carries security headers (`next.config.ts:22-31`). No CSP, HSTS, X-Frame-Options, Referrer-Policy or Permissions-Policy for pages are set in this config (they may be set at the Vercel or edge layer; UNKNOWN). Figures are same-origin HTML running JS, so any user-supplied figure content would be an XSS surface; today they are repo-authored.
- Cookie `iynk-lang` is non-HttpOnly and not Secure, but only holds a locale code validated by the redirect regex.
- Footer links to an external site with `rel="noopener noreferrer"` (`SiteFooter.tsx:42`). Fine.

## Reusability for an original-project builder (can this run on arbitrary user projects, or only on catalogue items? why?)

The visual layer (ui kit, tokens, catalogue layout, header/footer, settings, sound, i18n runtime, theme boot) is reusable as is: nothing in `components/ui` knows about boards or drones, and `i18n/translate.ts`, `client.tsx`, `config.ts` are generic. It cannot serve user-created projects today, for these reasons:

1. Routes are prerendered from compile-time ID lists (`BOARD_IDS`, `ROBOTICS_IDS`, `DRONE_IDS` in `src/content/ids.ts`; `AVAILABLE` in `index.generated.ts:55`) via `generateStaticParams`. Unknown slugs are real 404s by design (`layout.tsx:23` comment). A user project would need a dynamic route (`/[lang]/projects/[id]`) rendered at request time or with cached components, which collides with `ensureStatic = "navigation"` on the layout.
2. Item prose is JSON files in the repo, one per language, loaded by `import()` of a path built from ids. User text would come from a DB and need on-demand translation (an `/api/ai/translate` route exists, outside scope).
3. Progress keys assume `board|robotics|drone` labs and fixed entry kinds (`lib/progress/keys.ts:15`; `dashboard/data.ts:13`).
4. Nav, footer, 404, redirects and dashboard enumerate the three labs explicitly.
5. Catalogue components take props, so a "My projects" index can reuse `CatalogueHead/Grid/Card` directly; this part is ready.

## Required refactoring to get there

1. Introduce a lab/section registry (id, path, label key, id source, progress lab) read by `nav.ts`, `next.config.ts` redirects, `not-found.tsx`, `FooterNav`, `dashboard/labs.ts`. Remove the closed unions. (M)
2. Add a runtime content source interface (`getContentProse` already returns `{text, lang}`; give it a DB-backed implementation behind the same signature) and a dynamic project route that is not covered by `ensureStatic`. Decide the caching split: static catalogue, `use cache` or PPR for user pages. (L)
3. Separate settings from the progress blob so settings can sync with an account; keep the boot-script contract. (S)
4. Add `app/sitemap.ts`, `app/robots.ts`, JSON-LD, and make `siteUrl()` throw in production when no origin is configured. (S)
5. Make `dir` a function of locale in `layout.tsx:57`; convert the remaining physical utilities to logical ones (counts: `ml-`/`mr-`/`pl-`/`pr-` 4 total, `text-right` 1, `left-`/`right-` 5, `rounded-l` 4, `border-l`/`border-r` 199 matches that may include non-directional usage; versus 100+ logical uses of `ms-/me-/ps-/pe-/text-start/text-end`). The codebase is already mostly logical, so RTL readiness is a few hours, not a rewrite. Figures are iframes with their own CSS and would need their own audit. (S to M)
6. Add forced-colors and prefers-contrast rules; run axe over every page type. (S)
7. Move consent/telemetry default to opt-in or add a consent control if the product targets the EU. (S)
8. Add a per-language review gate for translations before launch; consider moving string storage from repo JSON to a TMS. (M)

## Recommendation: preserve | extend | replace | deprecate | investigate

**extend**: the UI kit, tokens, i18n runtime, settings and sound layers are clean, tested and generic; the work is to generalise the closed three-lab assumptions (nav, redirects, ids, progress keys) and add the missing SEO files, not to rewrite.

## Open questions

1. Is the production origin set through `SITE_URL` on Vercel and on the Vultr host? (`seo.ts` fallback would otherwise emit localhost.)
2. Are page-level security headers (CSP, HSTS) set at Vercel/edge outside this repo?
3. What is the real landing-page JS and hero-figure transfer size and LCP? A fresh `next build` plus analyzer is needed; the tree's `.next` is stale.
4. Who reviewed the five non-English translations, and what quality bar does the founder want for launch (2,064 UI keys, 12,311 prose leaves and 4,087 figure strings per language)?
5. Do user projects need all six languages, or one language plus on-demand translation?
6. Should telemetry stay opt-out for the target markets?
7. Is the 780-page prerender acceptable once the catalogue grows, or should item pages move to on-demand rendering with cache?
