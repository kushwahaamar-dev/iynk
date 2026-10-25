# Requests and notes from shell-app

The app frame, i18n, progress/settings and FigureFrame are in place. These are
the contracts other owners need, plus what I need from them.

## For every page owner (ui:boardlab, ui:robotics, ui:dronelab, flight, design-system)

- The root layout `src/app/[lang]/layout.tsx` already renders `<main id="main-<lang>" tabIndex={-1}>`
  around every page (the skip link targets it; the id carries the language because Activity keeps
  the previous language's layout in the DOM). **Pages must not render their own `<main>`**; use
  `<section>`/`<div>`/`<article>`. A nested `<main>` is an axe violation.
- Metadata: `import { alternatesFor } from "@/i18n/seo"` and return
  `{ title, alternates: alternatesFor(lang, "/boards/uno-r3") }` from every `generateMetadata`
  (path = what follows the language, `""` for the dashboard). `metadataBase` and the
  `%s · iynk` title template are set once in the layout.
- Server strings: `const t = await getT(lang, "boardlab")` from `@/i18n/server` (typed keys from
  the English JSON, `{name}` placeholders, plural objects `{ "one": …, "other": … }` with `count`).
  `getMessages(lang, ns)` returns a raw namespace to pass a slice to Client Components as props;
  in the Client Component, `const t = useT(props.messages)` from `@/i18n/client` (same typing).
  A missing key or parameter throws (no silent English fallback); `src/i18n/messages.test.ts`
  checks that every language has exactly the English keys and placeholders.
- Content prose: `getContentText<YourShape>(lang, "boards" | "robotics" | "drones", id)` loads
  `src/i18n/content/<lang>/<lab>/<id>.json`; a missing file fails the build with its path.
- Client Components that need the page language: `useLocale()` from `@/i18n/client`.
- Progress: `import { progressKey, markDone, useCount, useCountKeys, recordQuiz, recordBest } from "@/lib/progress"`
  (keys follow D7: `progressKey.boardLesson(id, lessonId)`, …; `useCount(prefix, total)` /
  `useCountKeys(keys)` give `{ done, total }` for "done/total"). Settings: `useSettings()`,
  `setSetting(name, value)`, `useResolvedTheme()` from `@/lib/settings`. Never write
  localStorage directly; everything lives in `"iynk:v1"`.
- Figures: `import { FigureFrame, type FigureHandle } from "@/components/figure"`.
  `<FigureFrame ref={handleRef} src="/figures/boards/uno-r3.html" title="…" initial={figureState} onEvent={…} />`.
  After every `ready` (a figure can reload when Activity moves it) FigureFrame re-sends
  `initial` merged with every `set` you sent since, newest value per key, so either pass the
  store's current figure state as `initial` or a constant plus `set` patches.
  `handle.send(type, payload)` queues until ready; `handle.sendCustom(name, payload)` posts a
  command a figure registered with `CF_BRIDGE.on`; `handle.observe(fn)` sees all traffic both ways
  (for the hackathon layer). `onEvent` gets typed events (`ready`, `part`, `button`, `state`,
  `labels`, `flash`, `focus`, `error`, `sfx`) plus `{ type: "custom", name, payload }` for the rest.
  FigureFrame itself forwards theme, language and the `labels` setting, appends `?lang=xx`, and
  lists the figure's buttons, switches and parts as real buttons under it (`controls={false}` to hide).
- `LabDock`: `import { LabDock } from "@/components/dock"`; props `{ lab, itemId, store, figure }`
  where `figure` is the FigureHandle (or null before mount).

## For platform (figure bridge, figures/engine/embed.js)

FigureFrame follows "What the host must do" in docs/FIGURES.md: `hello` on load and on every show,
queue until `ready` (readiness is never reset on load), source/origin/`iynk-figure`/`v` checks,
`location.origin` as target, `theme` + `locale` (+ the user's `labels` setting) after every `ready`,
`?lang=` in `src`, no sandbox, `color-scheme: light` on a plate background, 4:3 / 10:11 box, and the
accessible list built from `ready.parts` / `state.parts` (driven with `act {name, data: {id}}`),
`buttons` (press) and `switches` (press, `aria-pressed`). `sfx {name}` arrives as a typed event;
any other `CF_BRIDGE.send(type, data)` arrives as `{ type: "custom", name: type, payload: data }`,
and `handle.sendCustom(name, payload)` posts commands registered with `CF_BRIDGE.on`.

1. **Please add `pause` and `resume` to the bridge's built-in commands** (stop and restart the
   animation loop). FigureFrame sends `pause` when Activity hides the page and `resume` + `hello`
   when it shows it again (D11, primer rule 10). Today `embed.js` answers both with
   `error: unknown message "pause"`; FigureFrame drops exactly those two errors so labs do not see
   them, but the hidden figure keeps animating.
2. After every `ready`, FigureFrame sends in this order: `theme {mode}`, `locale {lang, strings?}`,
   `labels {on}`, `set {state}` (the `initial` prop merged with every `set` sent since), then the
   queued commands. `strings` is absent for English, and absent until that language's figure
   strings have loaded from `src/i18n/figures/<lang>.json` (one client chunk per language).
3. Whoever owns `src/i18n/figures/`: FigureFrame imports `./figures/<lang>.json` for es, fr, de, zh
   and hi. Until those files exist the build warns `Can't resolve './figures/' <dynamic>` and a
   non-English figure logs `missing figure strings src/i18n/figures/<lang>.json`.

## For the sound agent (src/lib/sound, src/components/sound)

ARCHITECTURE.md says shell-app mounts the sound provider in the layout. `src/components/sound`
does not exist yet, so nothing is mounted. When it lands, render it in `src/app/[lang]/layout.tsx`
inside `<I18nProvider>` (next to `<SettingsSync />`), so it survives navigation; it can read
`useSettings()` (`sound`, `lofi`) from `@/lib/settings` and `useLocale()` from `@/i18n/client`.
Figures' `sfx` events reach lab pages through FigureFrame's `onEvent` (`{ type: "sfx", name }`).

## For the hackathon layer (src/app/api/solana)

`next build` fails on `export const runtime = ...` in `src/app/api/solana/attest/route.ts`,
`credentials/route.ts` and `faucet/route.ts`: "Route segment config "runtime" is not compatible
with nextConfig.cacheComponents". Node.js is already the default runtime for route handlers, so
the export can simply go. (`src/app/[lang]/drones/[drone]/page.tsx` also imports
`@/components/dronelab/DroneWorkspace`, which does not exist yet.)

## Tooling (D12) for every agent

- `npm run typecheck` = content index + `next typegen && tsc --noEmit`; `npm run test` = Vitest
  (`vitest.config.mts`, jsdom, `src/**/*.test.{ts,tsx}`, `figures/**/*.test.*`, `scripts/**/*.test.*`);
  `npm run e2e` = Playwright against a production build; `npm run check` runs all of them.
- `next build` type-checks the whole tree, so one agent's half-written file fails everyone's build.
  While the tree is shared, build your routes with
  `IYNK_BUILD_SKIP_TYPECHECK=1 NEXT_DIST_DIR=.next-<label> npx next build` and type-check with
  `npx tsc --noEmit -p .` (read only your errors). The flag is ignored on Vercel, so the deploy
  build always type-checks.
- e2e against your own build: `E2E_SKIP_BUILD=1 NEXT_DIST_DIR=.next-<label> npx playwright test e2e/<yours>.spec.ts`
  (random port 40000-49999 per run). Without `E2E_SKIP_BUILD` the run builds first. Specs named
  `*.phone.spec.ts` run on a Pixel 7 profile instead of desktop Chrome.
- Activity keeps hidden copies of earlier pages in the DOM: scope locators to visible elements
  (`page.locator("header:visible")`, `.filter({ visible: true })`).
