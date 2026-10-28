# BU task packages: UI foundation

Written 2026-10-28 for the build-plan step. Plan only: nothing in `/Users/amar/iynk-build/v1` was edited, committed or created. The only files written are this one and scratch under `/Users/amar/iynk-build/state/bu-scratch/` (scan scripts `scan.sh`, `scan2.sh`, `perfile.sh`, `lines.sh`, `ev.py`, and their outputs `perfile.txt`, `files.txt`). The scans read `v1` at `build/v1` HEAD `f018746` (B0 is still running there, so some counts move when B0 lands; section 0.1 says which).

Labels: VERIFIED (read in code or measured in this step), DOCUMENTED (a plan file or the Next docs say it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN.

Binding inputs, in this order of authority:
1. `/Users/amar/iynk-build/state/UI_RULES.md` (the iynk adaptation; where it disagrees with a visual value in the older plan, it wins).
2. `/Users/amar/iynk-build/vendor/ai-design-skills/skills/landing-page-design/SKILL.md` (Part A for the home page, Part B for every visual value).
3. `/Users/amar/iynk-build/vendor/redesign-skill/skills/redesign-existing-projects/SKILL.md` (the audit and its Design values section).
4. `03_PRODUCT/UX_DESIGN_SYSTEM.md` (older plan; used for behaviour and accessibility, not for visual values).
5. `05_ENGINEERING/tasks/B0-foundation-green-safe.md` and `B1-foundation-keys-oss-honest.md` (format, and what BU must not collide with).
6. The Next.js docs in `v1/node_modules/next/dist/docs/` (this is not the Next.js of older versions). `/Users/amar/iynk-build/v1/AGENTS.md` does not exist (VERIFIED: `ls` of the `v1` root shows no such file); the `simlab` repo has one with the same warning, and this phase follows it by citing the local docs for every Next API it names: `01-app/03-api-reference/03-file-conventions/not-found.md` (`global-not-found`), `.../01-metadata/` (`robots`, `sitemap`, `manifest`), `.../04-functions/generate-viewport.md`, `01-app/02-guides/local-development.md` (icon library imports).

Scope: Amar's request of 2026-10-28, "the UI should be kick ass", built with Elaya's design skills. In order: design tokens in Tailwind v4; fonts; Phosphor icons; a base component set and moving the existing chrome onto it; the floating nav and full height mobile panel; theme choice; the home page rebuilt with landing skill Part A; ship items; states across existing screens; a motion pass; a copy pass in six languages; a screenshot and axe Playwright spec. Kept as they are: the hand drawn Colorfigures figures (`public/figures/**`, `figures/**`) and the simulation canvas.

Phase position (from `state/BUILD_LOG.md`, VERIFIED): BU runs on its own branch `build/ui` in `/Users/amar/iynk-build/ui`, cut from `build/v1` at the end of B1, and merges into `build/v1` before B4. So BU starts from a tree where B0 and B1 are done. Every `path:line` below is read at `f018746`, which is before B0 finishes and before B1 starts; B1 moves lines in the files it edits (it rewrites the home page, adds the keys dialog, `NotSetUp`, the usage meter). A builder therefore re-greps the quoted text before editing and runs `node scripts/ui-check.mjs <paths>` (T-BU-03) to list the exact lines. Counts are the size of the job, not a promise.

Exit: `npm run check` green keyless with the UI guard (`npm run ui:check`) in it; `BUILD bu-gate` ok; the visual spec (screenshots and axe, light and dark, 1440x900 and 390x844) passes with 0 serious or critical axe findings; `node scripts/ui-check.mjs` exits 0 on `src/`; every screen in the screenshot set was opened and looked at (section 1.5); no italic, no Instrument Serif, no hand drawn `ink-*` leftovers in chrome. Then Amar's OK and the merge into `build/v1`.

## 0. Diagnosis (the redesign skill's Scan and Diagnose steps, run on the real UI)

### 0.1 Scan

| Item | Finding | Evidence |
|---|---|---|
| Framework | Next.js 16.4.3 with Cache Components, React 19.3.0, Turbopack with the Tailwind loader rule. | `package.json`, `next.config.ts:5-17` (VERIFIED). |
| Styling | Tailwind 4.3.3, CSS first. No `tailwind.config`; the whole theme is `@theme` blocks in one 604 line `src/app/globals.css`. Palette, radius and animation tokens are in `@theme static` (`:27-93`) and the semantic colours, shadows and font aliases in `@theme inline` (`:95-132`). Light tokens are in `:root, .ink-plate` (`:134-169`) and `:root` (`:171-196`); dark tokens are written twice (media query `:218-254`, `[data-theme="dark"]` `:255-292`). | `node_modules/tailwindcss/package.json` version 4.3.3 (VERIFIED). |
| Fonts | `layout.tsx:2` imports Geist, Geist Mono, Instrument Serif and Noto Sans Devanagari; the serif is "the rare italic accent word". | `src/app/[lang]/layout.tsx:2,15,18` (VERIFIED). |
| Existing kit | `src/components/ui/` has 25 components: Button, ButtonLink, IconButton, Tooltip, Field (Select, TextInput), Toggle, SegmentedControl, Tabs, Panel, Card (unused: `grep` finds no importer except the barrel), Chip, Callout, Dialog, Sheet, Popover, CodeBlock, Kbd, Meter, Stat, Stepper, ProgressBadge, SkipLink, icons, VisuallyHidden, useModal. Missing: Skeleton, EmptyState, inline status, menu, command menu, text area. | `ls src/components/ui`; `components/ui/index.ts` (VERIFIED). |
| Look | A hand inked "Colorfigures" system: wobbly radii (`--radius-ink`), offset ink shadows (`shadow-ink*`), 2 px ink borders, a mustard primary button, five pastel palette tones used as chrome colours, a grain image on `body`, the header and the sticky stage, and an Instrument Serif italic accent word in headlines. | `globals.css:67-68,121-123,330,379-441`, `ui/Button.tsx:14-27` (VERIFIED). |
| Shell | `<header class="sticky top-0 ...">` 57 px tall with a bottom hairline, flush to the edge (`SiteHeader.tsx:27-28`). Desktop bar from `lg`. Phone menu is a 22 rem end drawer (`Sheet side="end"`) in `MobileNav.tsx:30`. The current page is marked by a 5 px LED dot. | VERIFIED. |
| Settings and theme | Theme is a three word segmented control in the Settings popover: "Match system", "Light", "Dark" (`ThemeControl.tsx`). There is no sun and moon switch. | `grep -rniE "sun|moon"` finds nothing (VERIFIED). |
| What B0 deletes first | `components/solana/*` (9 files), `components/data/*`, `StoryCard`, `useBuildLog`, `together/Planner.tsx`, `together/Buddies.tsx`, `/passport` and `/verify` pages. | B0 section 4.2 (DOCUMENTED). Counts below are with those files left out; the counts "with them" are in brackets in 0.3. |
| What B1 adds that BU must restyle | `src/components/settings/{KeysDialog,KeysPanel,UsageMeter,NotSetUp}.tsx`; a rewritten home page (two sentence lede, "Open source" section, fidelity statement, `e2e/home.spec.ts`); `/boot.js` and a page CSP with `style-src 'self'` and `style-src-attr 'unsafe-inline'`. | B1 T-B1-02, 13, 21, 26, 30 (DOCUMENTED). |

### 0.2 Counts by audit item

Method: `grep -rE` over `src/**/*.{ts,tsx,css}` with tests, `src/content/`, `src/i18n/figure*`, generated files and the B0 deletions left out (script `bu-scratch/scan2.sh`). "Lines" counts matching lines; "occ" counts matches.

| # | Audit item (redesign skill section) | Count | Where it bites |
|---|---|---|---|
| 1 | Italic or serif accent (Typography) | 6 files: `app/[lang]/layout.tsx:2,15,18`, `globals.css:127-129,470-476,572`, `marketing/marketing.css:38-45`, `marketing/index.tsx:19-29` (the `*word*` parser), `boardlab/CodeEditor.tsx:48`, `ai/TurnView.tsx:183`. Two message strings carry the star markers: `shell.json:50` and `:125`, in all six languages. | UI_RULES: no italics anywhere. |
| 2 | Arbitrary text sizes (Typography) | 36 `text-[...]` matches in 14 files, of which 24 are real sizes: `text-[17px]` x9, `text-[15px]` x6, `text-[11px]` x4, `text-[0.85em]` x2, `text-[22px]`, `text-[19px]`, `text-[12px]`, and 7 `clamp()` sizes (Editorial, home, Catalogue, about, not-found, drones page). Plus 20 `leading-[...]` and 17 `tracking-[...]` arbitrary values, 10 `font-size` declarations in CSS (`globals.css:332,344-347,406,416,426,456,465,476,554`, `marketing.css:52,61`) and one `fontSize: "14px"` (`CodeEditor.tsx:60`). | Snap down to the Tailwind step (section 1.2). |
| 3 | Ultra bold weights | 5 lines, 4 files use `font-extrabold`: `robotics/QuizPanel.tsx:116`, `search/RealBuildPanel.tsx:497`, `ai/Markdown.tsx:31,76`, `hw/HardwareTwinPanel.tsx:308` (4 more lines sit in files B0 deletes). | Cap at bold. |
| 4 | Mono used for labels (Typography; UI_RULES: Geist Mono only for code, serial, numbers, tables) | `font-ui` on 106 lines in 50 files; 81 of 130 lines (before B0) carry no `tabular`, so they are labels, not numbers. `.ink-kicker` x39, `.ink-label` x13, `.shell-meta` x2, `.mk-eyebrow` x1 are all uppercase mono. 13 `uppercase` lines. | Labels move to Geist, sentence case. |
| 5 | Spacing off the scale | 163 occurrences in 68 files use a Tailwind step that is not in the scale: `1.5` x94 (6 px), `5` x32 (20 px), `2.5` x24 (10 px), `7` x7, `3.5` x5, `9`, `14`. Plus 32 `clamp()` paddings and margins (`mt-[clamp(48px,6vw,96px)]` x10, `pb-[clamp(72px,10vw,160px)]` x6, and others). Worst files: `app/[lang]/page.tsx` (19), `DesignPanel.tsx` (13), `PinoutTable.tsx` (7), `Catalogue.tsx` (7). | Section 1.2 snap table. |
| 6 | Radius chosen by feel | `rounded-ink` / `rounded-ink-sm` on 62 lines in 36 files (a custom 8 value wobbly radius, `globals.css:67-68`), 5 `rounded-[...]` in 4 files, 60 `rounded-full` on 46 files (pills on buttons, fields, tabs, chips). No nested formula anywhere. | Role table, section 1.2. |
| 7 | Borders | Heavy ink borders: `border-2` or `border-[1.5px]` on 80 lines. Single sided borders: 75 lines in 42 files, of which about 88 percent are row dividers and header hairlines (`border-b border-rule`) and stay. Cards with a one sided bar (the real violations): `ui/Callout.tsx:52` (`border-s-4`), `boardlab/AssemblyPanel.tsx:100`, `boardlab/FailurePanel.tsx:25`, `dronelab/TestsPanel.tsx:68,69,71`, `flight/BreakIt.tsx:55`, `dock/LabDock.tsx:281` (`border-s-2`), `editorial/Editorial.tsx:124-133` (`Note`, `border-s-2`). | Full border or none. |
| 8 | Gradients | Only 6 lines. Three are scroll fade masks (`Tabs.tsx:104-106`, `ScrollRow.tsx:52`), which are `mask-image`, not backgrounds, and stay. One is the native select arrow drawn with two `linear-gradient`s (`globals.css:436`), which goes. No hero text gradient exists yet. | Add the hero text gradient (tokens). |
| 9 | Background colours and gray families | Dark surfaces in `globals.css:218-292`: `#1b1813`, `#26221b`, `#14120e`, `#17211e` (console, green tinted) and the plate `#e4ddcf`; none is in the allowed set `#000000 #181818 #1F1F1F #272727 #313131 #131209`. Light grays are warm (one family) but the dark ones are another. 161 hex lines in 13 files; 130 are `globals.css`, the rest are data colours (wire colours `WireInPanel.tsx:15-24`, `WiringPanel.tsx:10-15`, ghost colours `FlightRange.tsx:143-144`, peer colour fallback) and stay. | Dark mapping, section 1.2. |
| 10 | More than one accent | Five palette colours drive chrome: `bg-mustard` (primary button, user bubble, change card header, chat), `tomato` (danger, recording, live), `mint` (on, success), `cobalt`, `blush`: 69 lines (`mustard` 21, `tomato` 19, `mint` 18, `cobalt` 8, `blush` 3). The accent proper (`--accent` `#ef6a4c`) is HSL saturation 83 percent, over the 80 percent limit. | One accent, status tokens for state. |
| 11 | Shadows | `shadow-ink*` on 30 lines in 22 files: hard offset 3 px or 5 px ink shadows (`globals.css:121-123`); `shadow-[...]` arbitrary on 9 more. The dock casts `shadow-[-4px_0_0_var(--shadow-c)]` (`LabDock.tsx:281`), a different light source from the cards. | Tinted soft shadows, one light. |
| 12 | Grain | `background-image: var(--grain)` on `body` (`globals.css:330`), on `.ink-plate` (`:390`), on the header (`SiteHeader.tsx:27`) and on the sticky phone stage (`globals.css:518`). | Light theme body only, subtle. |
| 13 | z-index | 11 values in 11 files, no scale: `z-10` x3 (`FigureFrame.tsx:309`, `Catalogue.tsx:184`, `PresenceCursors.tsx:89`), `z-20` (`FlightRange.tsx:747`), `z-30` x2 (`SiteHeader.tsx:27`, `LabDock.tsx:281`), `z-40` x2 (`Tooltip.tsx:91`, `UntranslatedNotice.tsx:32`), `z-50` x2 (`Dialog.tsx:35`, `Sheet.tsx:41`), `z-[100]` (`SkipLink.tsx:9`), and `z-index: 10` and `9` in `globals.css:514,526`. | Named scale, section 1.2. |
| 14 | Motion | 56 lines in 29 files with `ease-out`, `duration-75/100/150`, `ease-linear` or no easing named; only 5 `cubic-bezier` (all different: `globals.css:70-74`, `marketing.css:61`). Durations in use: 200 x9, 150 x7, 700 x2, 500 x2, 400 x2, 300 x2, 100 x2, 75 x1. Properties other than transform and opacity are animated: `transition-[width]` x3 (`ui/Meter.tsx:43`, `ui/ProgressBadge.tsx:30`, `dronelab/CraftProgress.tsx:51`), `transition-[left,top]` (`realtime/PresenceCursors.tsx:109`), `transition-[inset-inline-start]` (`ui/Toggle.tsx:50`), `transition-[border-color]` (Editorial). Reduced motion kills all animation to 0.01 ms (`globals.css:585-600`) instead of swapping movement for a fade. No `IntersectionObserver` reveals exist. No `scroll` listeners drive animation (VERIFIED: `grep -rn "addEventListener(\"scroll\"" src`: `Tabs.tsx:63` passive overflow measure, `Popover.tsx:74` reposition; both stay, neither animates). | Section 1.2 motion rows. |
| 15 | Icons | Hand drawn path set, 30 names, in `ui/icons.tsx`; a second set of 11 more in `ai/icons.tsx` (`PartnerIcon`: spark, mic, send, stop, share, download, link, book, chat, refresh, people); `<Icon` on 47 lines in 28 files, `<IconButton` on 22 lines in 15 files, 20 inline `<svg` lines in 17 files (7 are icons, the rest are drawings: `Logo`, `PresenceCursors`, `PeerAvatar`, hero art), 51 lines with unicode glyph icons (`→ ✓ × …`, for example `BoardProgress.tsx:27`, `ChecksPanel.tsx:75`, `WiringPanel.tsx:92`, `page.tsx:166`). No Lucide, Feather or Material (VERIFIED: `grep` finds none). No Phosphor yet (`@phosphor-icons/react` is not in `package.json`). | Phosphor behind the same `<Icon name>` API. |
| 16 | Components: raw controls | `<button` raw on 24 files (26 lines), `<input` on 18 files (23), `<select` on 8 files (11), `<textarea` on 5 files (5) (counted before B0 removes the Solana files; about a tenth fewer after), none of which use the kit's Field. `<Dialog` on 9 files, `<Sheet` 2, `<Popover` 2, `<Tabs` 8, `<Callout` 33 files (71 lines), `<Chip` 22 files. Chip tones in use: `mint` x5, `cobalt` x4, `ink` x3, `tomato` x2, `mustard` x2. | Move onto the new base. |
| 17 | Components: modals, toggles, avatars | Dialog is the only overlay pattern for 9 screens (ShortcutsDialog, InviteDialog, KeyboardHelp, and others); Sheet is used for the phone dock and the phone menu. Avatars are circles (`PeerAvatar.tsx`, `rounded-full`). | Slide over where it fits; rounded squares for avatars. |
| 18 | States: loading | No skeleton for routes: 15 `Suspense` fallbacks (11 after B0 removes `/passport` and `/verify`) are an empty `<div className="min-h-[70vh]" aria-busy="true" />` (`page.tsx:38`, `about/page.tsx:36`, `boards/page.tsx:22`, `boards/[board]/page.tsx:34` and the rest), so the screen is blank while the server renders. Panel level skeletons exist in 3 places (`search/shared.tsx:47-52`, `TogetherPanel.tsx:122`, `PartnerPanel.tsx:35`) and each is hand written with `animate-pulse rounded-ink`. One true spinner pattern: none (`FigureFrame.tsx:381` says "no spinner"). `CodePanel.tsx:100` pulses the Run button while busy. | One `Skeleton` and `PageSkeleton`. |
| 19 | States: empty and error | 73 lines mention "empty"; composed empty states are a one line `Note` (`Editorial.tsx:123-133`) or a bare `<p>`. No `loading.tsx`, `error.tsx`, `global-error.tsx` or `global-not-found.tsx` in `src/app` (VERIFIED: `find src/app -name "loading.tsx" -o -name "error.tsx" ...` prints only `not-found.tsx`). No `window.alert`, `confirm` or `prompt` (VERIFIED: `grep` count 0). Form errors are 51 lines with `role="alert"` or `aria-live` across 36 files, shown as plain text; no field level `aria-invalid` and no inline error component. | Field with inline error; `EmptyState`; `error.tsx`. |
| 20 | Navigation | Header welded to the top (`sticky top-0`, 57 px, `border-b`); links `text-sm font-medium`; the menu icon swaps (`Icon name="menu"` then a sheet with its own close X); mobile menu is a 22 rem side drawer, not full height; links appear all at once; the current page is marked with a dot and `aria-current` (good). | Floating bar, full height panel, staggered links. |
| 21 | Hover, active, focus | `:focus-visible` ring exists globally (`globals.css:362-367`: 2.5 px outline plus a 7 px halo in `--halo`, 6 px radius). `active:` appears on 14 lines in 9 files (buttons press by `translate-0.5` into a shadow, not `scale(0.98)`); `hover:` on 46 lines in 38 files. `transition-all` is not used (0). | Common press and hover recipe. |
| 22 | Ship items | Skip link: exists (`ui/SkipLink.tsx`, mounted in `layout.tsx:64`). Favicon: `src/app/icon.svg` and `apple-icon.png` exist. OG image: `src/app/[lang]/opengraph-image.png` 1200x630 exists. Title, description, `openGraph`, `twitter`: set in `layout.tsx:36-45`. `robots`, `sitemap`, `manifest`, `viewport`/`themeColor`: none. Branded 404: `not-found.tsx` exists but only for language routes; an unmatched URL outside `/[lang]` gets the Next default (the root layout is the top level dynamic segment, which is the case the `global-not-found` doc describes: `not-found.md:49-53`). Footer: a privacy sentence, no privacy link, no licence status, no terms (`SiteFooter.tsx:18`). Landmarks: `header`, `nav`, `main`, `footer` present; `Section`/`PageHead` use `section`/`header`. A way back: `WorkspaceBar` has a back link; the 404 links home. | Section 7 ship tasks. |
| 23 | Links and images | `href="#"`: 0. `target="_blank"`: 3 files (all with `rel="noopener noreferrer"`; the 5 that open Solana explorers go with B0). `<img>`: 3 files (`NearbyPanel.tsx:66`, `VideoHelp.tsx:90`, `FigureStill.tsx:21`) with `alt=""` because they are decorative thumbnails (stay). | Only check, no change. |
| 24 | Copy (English `messages/en/*.json`, without `solana.json`) | 6 exclamation marks, all in `flight.json` (`:105` "Hand launch!", `:121` "{line}. {medal} medal!" and four more). 152 hyphenated compound words in running text (`boardlab` 35, `dronelab` 48, `robotics` 26, `flight` 18, `search` 14, `shell` 7: for example "part-by-part", "hand-inked", "self-contained", "See-through"). Title Case labels: `shell.json:8-10` "Board Lab", "Robotics Lab", "Drone Lab". 2 starred accent words (item 1). Filler words (`revolutionize`, `supercharge`, `effortless`, `world class`, `seamless`, `cutting edge`, `next level`): 0 found (`unlock` appears twice in `robotics.json:309,312` as the quiz lock verb; stays). Em dashes: 0 in messages; 2 lines in `.ts` strings. The same six file sets must change together. | Section 7 copy tasks. |
| 25 | Code quality | Inline `<style>` in `LabDock.tsx:290` (the `PUSH_PAGE` rule, `:96-99`) which B1's page CSP (`style-src 'self'`) would block. `!important` x9, all in `globals.css` (reduced motion, `[hidden]`). Commented dead code: none found in the swept files. Imports all resolve (`tsc` is green at HEAD per BUILD_LOG baseline). Arbitrary pixel widths `w-[` `h-[` `size-[` on 78 lines in 44 files (about half are `min-h-[calc(100dvh-var(--header-h))]` layout rules and stay). | Move `PUSH_PAGE` into CSS. |
| 26 | Already right (keep) | Geist is the one text face; Geist Mono only as `--font-ui`; Noto Sans Devanagari for Hindi; `tabular` on 82 lines; `aria-current` on nav; focus-visible ring; skip link; reduced motion exists; `text-wrap: balance` on headings and `pretty` on paragraphs (`globals.css:337-349`); 44 px touch targets; no `window.alert`; no sun and moon switch; the logo is drawn. | Do not regress. |

### 0.3 Where the work is (counts of the rule hits per file group)

Files with at least one hit, B0 deletions left out: 121 files before leaving out the B0 set, 110 after (`bu-scratch/files.txt`, `perfile.txt`). By area: `ui` 25, `shell` 11, `boardlab` 22, `robotics` 10, `dronelab` 10, `flight` 5, `realtime` 8, `search` 5, `ai` 6, `settings` 1, `dock` 1, `editorial` 1, `marketing` 1, `catalogue` 1, `figure` 2, `hw` 1, `app` pages 11. With the B0 set included the totals are 207 off scale spacing hits, 25 arbitrary text size files, 70 ink-class hits, 37 radius hits, 27 shadow hits (`perfile.txt` totals row). Each sweep card in section 7 quotes its own files' counts.

### 0.4 What the diagnosis changes in the plan

| # | Finding | Effect on this phase |
|---|---|---|
| 1 | The look is a coherent but different system (hand inked), and 110 files use it through a few shared names (`ink-card`, `rounded-ink`, `shadow-ink`, `border-line`, `ink-kicker`). | Do tokens first and keep those names as compatibility aliases that now render the new look (T-BU-04 to T-BU-07), so the app is already close to right after G2 and no screen is half old. Sweeps then rename usage file by file, and the last cleanup (T-BU-56) deletes the aliases. The guard script fails if any alias remains. |
| 2 | `globals.css` is one 604 line file edited by every token concern. | T-BU-01 splits it into four layer files first, so G2 tasks own disjoint files. |
| 3 | The kit already has Button, IconButton, Field, Tabs, Sheet, Dialog, Popover, Callout, Chip. Only skeleton, empty state, inline status, menu, text area and command menu are missing. | "A small set of base components" means restyle 20 and add 7 (Skeleton, PageSkeleton, EmptyState, InlineStatus, Reveal, Menu, TextArea), plus the command menu. No new library. |
| 4 | The header's height is a CSS variable (`--header-h`) used by the workspace grid, the sticky phone stage and the dock (`globals.css:191,508-533`, `LabDock.tsx:281`). | The floating nav keeps a `sticky` wrapper that reserves the space and only the bar floats, so the variable stays the single source and nothing else moves. |
| 5 | `Callout` (71 uses) has the one sided bar; `Chip` uses palette tones; both have wide use. | Re-skin them in place with the same props (T-BU-10), so 33 files need no edit for the look. |
| 6 | B1 rewrites the home page and adds components after this plan's line numbers. | Home is built from section components with a new `home` i18n namespace (T-BU-31) and composed in one task (T-BU-43) that keeps B1's open source section, links, fidelity statement and `e2e/home.spec.ts` contract. |
| 7 | B3 edits `layout.tsx` and `about/page.tsx` (three mentions each in `B3-core-storage-runtime-replay.md`) while BU works on another branch. | Section 6 question 12 and section 5 item 2: the merge into `build/v1` after B3 will conflict in those two files; the merge task keeps both sides. |
| 8 | A page CSP is coming (B1 T-B1-13): `style-src 'self'`, `script-src 'self'`. | BU adds no inline `<style>`, no inline script and no `style` element; the one inline block (`LabDock` `PUSH_PAGE`) moves to CSS. Fonts come from `next/font` (self hosted). JSON-LD for the FAQ is a data block, which CSP does not execute. |

## 1. Conventions every task uses

| Item | Rule |
|---|---|
| Branch | `build/ui`, cut by the orchestrator from `build/v1` after the B1 gate. Nothing is pushed. |
| Commit | One commit per task. Author is Amar Kushwaha (`bash scripts/handoff-status.sh` prints the identity). No `Co-Authored-By` line, no "Generated with" line. Message: `BU T-BU-nn: <what>`. |
| Off limits | `.env.local`, production services, ports 3000 and 43117. Port for a UI check is 47000 to 47999 (UI_RULES). A task never reads a secret. |
| Next.js | 16.4.3. Before naming a Next API read `node_modules/next/dist/docs/01-app/`. BU uses: `next/font/google` (already), `global-not-found` and `experimental.globalNotFound` (`not-found.md:49-77`), `error.js` (`03-file-conventions/error.md`), `loading.js`, `robots.ts`, `sitemap.ts`, `manifest.ts` (`01-metadata/`), `generateViewport` (`04-functions/generate-viewport.md`). Icons: import from the package's deep path as `local-development.md:131-143` says. |
| Tailwind | v4. Tokens are CSS variables inside `@theme` / `@theme inline`; utilities use `@utility`; no config file. Tailwind's spacing is a multiplier of 4 px, so it cannot forbid off scale steps; `scripts/ui-check.mjs` does. |
| 5 file rule | At most 5 source files edited or created per task. Not counted: test files, deleted files, generated files, docs, the six copies of one i18n JSON file (1 together), `package.json` with its lockfile (1). Each card states its count. |
| Parallel agents | Files in one group are disjoint (section 4). Each agent works in its own `git worktree` with an APFS cloned `node_modules` (`cp -cR`, as BUILD_LOG says). The orchestrator cherry-picks a group onto `build/ui` in the listed order and runs `TL`, the full `V`, then the next group. |
| Words | Plain, no em dashes. English copy: sentence case, no filler words, no exclamation marks, no hyphens inside sentences except part names and standard terms (I2C, op amp as "op amp"). Every copy change updates the six languages in the same commit. |
| Contract with other phases | These stay true after every BU task, because specs and B1 depend on them: `data-testid` values (`lab-dock-trigger`, `lab-dock`, `run-button`, `serial-lines`, `not-set-up`, `usage-toggle`, `sound-toggle`, and the 40 more found by `grep -rhoE "getByTestId\(...\)" e2e`); one visible `<header>` landmark (`shell.spec.ts:172`); the Settings button named `shell.settings.label` inside that header and a `dialog` named the same (`shell.spec.ts:28-34`); a `[role="radiogroup"]` for the theme inside the settings dialog (`shell.spec.ts:40`); `aria-current="page"` on the current nav link; `.ink-kicker` count 0 in the about page header (`shell.spec.ts:234`: after BU the class is gone anyway); the skip link is the first tab stop and lands on `main` (`shell.spec.ts:72`); keyboard shortcuts in the labs; `OPEN_KEYS_EVENT` (B1). A task that must break one of these edits the spec in the same commit and says so. |

### 1.1 Proof commands (exact)

| Name | Command |
|---|---|
| `TL` | `npm run typecheck && npm run lint` |
| `V <paths>` | `npx vitest run <paths>` |
| `KL` | `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_REALTIME_URL= IYNK_SERVER_TOKEN= IYNK_AI_ENABLE= IYNK_SEARCH_ENABLE=` (the names that survive B0; B1 adds more blank names to `playwright.config.ts`, which wins). A prefix a person or agent types. |
| `BUILD <label>` | `KL NEXT_DIST_DIR=.next-<label> npm run build` |
| `E <label> <specs>` | `KL NEXT_DIST_DIR=.next-<label> npx playwright test <specs>`; Playwright picks a random port (`playwright.config.ts:5-14`) and builds unless `E2E_SKIP_BUILD=1`. Run with `CI` unset so retries stay 0. |
| `KL`, `E` for UI work | Same, plus the screenshot check below. |
| `UIC <paths>` | `node scripts/ui-check.mjs <paths>`: lists `file:line RULE text`, exit 1 on any hit. Exists from T-BU-03; until T-BU-58 wires it into `npm run check`, each task runs it on its own files. |
| `SHOTS <label> <routes>` | The screenshot check of UI_RULES, made repeatable by T-BU-57 (`UI_SHOTS=1 E <label> e2e/visual.spec.ts`). Before T-BU-57 exists, use the manual form in 1.5. |

### 1.2 Design values (binding for every card; sources in brackets)

These resolve UI_RULES and the two skills into concrete values for this repo. A card may only use these. If a case is not covered the builder stops and asks (redesign skill rule: never invent a value).

**Type** [UI_RULES Type; landing B1]

| Item | Value |
|---|---|
| Faces | Geist (`--font-sans`) for all text; Geist Mono (`--font-mono`) only for code, serial output, numeric readouts and data tables; Noto Sans Devanagari first for Hindi; platform CJK after Geist for Chinese (kept from `globals.css:293-317`). Instrument Serif removed. |
| Weights | 400, 500, 600, 700 only. `font-extrabold` and `font-black` become `font-bold`. |
| Scale | Tailwind default only: xs 12/16, sm 14/20, base 16/24, lg 18/28, xl 20/28, 2xl 24/32, 3xl 30/36, 4xl 36/40, 5xl 48/1, 6xl 60/1, 7xl 72/1. Snap a size down to the step below: 11 px to `text-xs` (the smallest step; no step below exists), 12 `text-xs`, 15 `text-sm`, 17 `text-base`, 19 `text-lg`, 22 `text-xl`, `0.85em` in prose code to `text-sm`. A `clamp()` size becomes a stepped responsive pair (`text-2xl md:text-4xl`). |
| Line height, tracking | The step's own line height. No `leading-[x]`. `tracking-tight` allowed from `text-3xl` up; no arbitrary `tracking-[x]`. Exception kept because function wins (UI_RULES intro): Hindi and Han headings get `line-height: 1.3` through a `:lang(hi)` and `:lang(zh-Hans)` rule, because matras and strokes clip at the step's `1` or `40px`; the card for T-BU-05 says so. |
| Buttons | Main `text-base font-semibold`; header and toolbar `text-sm font-semibold`. |
| Wrap and measure | `text-wrap: balance` on headings, `pretty` on paragraphs (base layer). Body measure `max-w-prose` (65ch). Hero heading and subheading `max-w-[680px]` (B5). The arbitrary widths and heights allowed anywhere are exactly these: `max-w-[680px]` (heading and lede), `max-w-[1440px]` (page frame), `max-w-[calc(100%-2rem)]` (nav bar), the overlay widths `w-[min(21rem,calc(100vw-2rem))]` (settings popover) and `w-[min(24rem,88vw)]` (sheet), the dock `min(var(--dock-w), calc(100vw - 3rem))`, `min-h-[calc(100dvh-var(--header-h))]` (workspace layout) and the hero figure `min-h-[min(50svh,460px)]`. Any other `w-[`, `max-w-[`, `min-h-[` value needs a reason in the allow list. |
| Numbers | `tabular-nums` on every number that changes (volts, amps, ms, scores, counts). |
| Labels | Sentence case in Geist `text-xs font-semibold text-muted`, class `kicker`; no uppercase, no letter spacing. |

**Spacing** [UI_RULES Spacing; landing B2]

| Item | Value |
|---|---|
| Allowed px | 0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96. |
| Tailwind steps | `0`, `0.5`, `1`, `2`, `3`, `4`, `6`, `8`, `10`, `12`, `16`, `20`, `24` (and negatives of them). |
| Snap | `1.5` to `2`, `2.5` to `3`, `3.5` to `4`, `5` to `6`, `7` to `8`, `9` to `10`, `14` to `16`. A tie goes up (6 to 8, 10 to 12). Where going up would break a fixed height row (a rail row, a toolbar) the card says "round down". `clamp()` spacing becomes steps at breakpoints (`py-12 md:py-16 lg:py-24`). |
| Buttons | Main: `py-2 px-3` (8 by 12). Both sizes. Touch (`pointer: coarse`) adds `min-h-11` (44 px, an accessibility floor, not a spacing value). Control heights and widths (`h-9`, `size-10`) are sizes, not spacing, and are not governed by this table. |
| Layout vars | `--header-h: 64px` (bar 48 + 8 top + 8 bottom), `--shell-pad`, `--frame-pad` snap to 16, 24, 40. |

**Radius** [UI_RULES Radius; landing B3]

| Role | Class |
|---|---|
| Buttons, fields, tabs, menu items, segmented | `rounded-lg` (8) |
| Chips, kbd, small tags, code spans | `rounded-md` (6) |
| Panels, dialogs, popovers, the nav bar, dock | `rounded-2xl` (16) |
| Figure plates | `rounded-xl` (12) |
| Avatars | `rounded-lg` squares (never circles) |
| Dots, the switch track and thumb | `rounded-full` (only here) |
| Nested rule | inner = outer minus the gap, if the gap is under 32 and the result is above 2. Outer 16: gap 8 gives `rounded-lg` (8), gap 12 gives `rounded-sm` (4), gap 16 or more gives result 0 or less, so leave the inner at `rounded-md`. Outer 8 (a button) with a 4 gap gives `rounded-sm`. |
| Edge attached | A sheet flush to the screen edge has no radius on the edge side; a bottom sheet has `rounded-t-2xl`. |

**Colour** [UI_RULES Color; redesign Design values]

| Token | Light | Dark |
|---|---|---|
| `--paper` page | `#f2efe7` | `#131209` |
| `--alt` section and tab strip | `#ece7da` | `#181818` |
| `--surface` panel | `#faf8f2` | `#1F1F1F` |
| `--raised` popover, dialog, menu | `#faf8f2` | `#272727` |
| `--hover` hover fill, dark rules | `#ece7da` | `#313131` |
| `--sunken` fields, code, wells | `#e9e4d8` | `#000000` |
| `--ink` text | `#231e16` | `#ece6d8` |
| `--muted` text | `#625b4f` | `#b3aa98` |
| `--rule` hairline | `#d9d1c1` | `#313131` |
| `--accent` the one accent (HSL 11, 74 percent, 60 percent; the old `#ef6a4c` is 83 percent) | `#e4694e` | `#e4694e` |
| `--accent-hover` (`--on-accent` on it: 4.64 to 1 light, 6.82 to 1 dark) | `#dc6248` | `#ec7c63` |
| `--accent-ink` accent as text | `#a8402b` | `#f08a70` |
| `--on-accent` text on accent (contrast 5.1 to 1 light, checked in the card) | `#231e16` | `#131209` |
| `--focus` ring | `#231e16` | `#ece6d8` |
| `--good` `--bad` `--warn` `--info` (state only, text and icon) | `#2e6b52` `#a8402b` `#7a5a00` `#2f4f8f` | `#93d3b0` `#f08a70` `#f4b829` `#9dbcef` |
| `--good-bg` etc. (state fills) | `color-mix(in oklab, <state> 12%, var(--surface))` | `#272727` (a fill from the allowed list; the icon and text carry the state) |
| `--console-bg` `--console-well` | `#181818` `#000000` | same |
| `--console-ink` (14.49 on bg, 17.14 on well) | `#e8e8e8` | same |
| `--console-muted` (7.04, 8.33) | `#a3a3a3` | same |
| `--console-accent` (12.81, 15.16) | `#8af0ae` | same |
| `--console-warn` (9.92, 11.73) | `#f4b829` | same |
| `--console-err` (7.75, 9.17) | `#ff8a7a` | same |
| `--code-bg` | `#faf8f2` | `#000000` |
| `--plate-bg` figure paper | `#f2efe7` | `#e4ddcf` (kept: figures stay paper plates in both themes, the art exception) |
| `--scrim` | `rgb(19 18 9 / 0.55)` | same |
| Hero heading text gradient (the only gradient) | `#000000` to `#666666` | `#FFFFFF` to `#9B9B9B` |

Dark surfaces are only `#000000 #181818 #1F1F1F #272727 #313131 #131209`; the guard checks the dark block of `tokens.css` against that list. One gray family: light is warm (hue about 40), `#131209` is the matching warm black, the neutral `#181818` to `#313131` ladder is the skill's list and is used as it is. Palette tones (`tomato mustard mint cobalt blush` and their `-l/-m/-d`) stay as tokens for the figures and for data colours; chrome stops using them. The console tokens exist today with green tinted values (`globals.css:174-180`, dark `--console-bg` `#17211e`); they become the same neutral values in both themes, each at least 4.5 to 1 on `--console-bg` and `--console-well`. Control fills: `--accent` is 2.84 to 1 on `--paper` and 2.57 to 1 on `--sunken` in light, under the 3 to 1 of WCAG 1.4.11, so a control that is drawn only by an accent fill (the Toggle on track, the Meter fill) sits on a track with a 1 px `--muted` border (5.84 to 1 on `--paper`); dark `--accent` is 5.05 to 1 on `#1F1F1F` and needs none.

**Elevation and shadow** [UI_RULES Color]: one light source above. `--shadow-rgb` is `35 30 22` (light) and `19 18 9` (dark), so shadows are tinted toward the page. `shadow-sm` `0 1px 2px rgb(var(--shadow-rgb) / var(--shadow-a1))`; `shadow-md` `0 4px 12px rgb(var(--shadow-rgb) / var(--shadow-a2))`; `shadow-lg` `0 12px 32px rgb(var(--shadow-rgb) / var(--shadow-a3))`, where `--shadow-a1/a2/a3` are .08, .12, .18 in light and .5, .6, .7 in dark. Shadows only on floating layers (nav, popover, menu, dialog, sheet, dock). Panels are fill plus a 1 px `--rule` border, no shadow. Never border plus shadow plus white on one card. No border on one side of a card.

**z-index** [redesign: no arbitrary z]: `--z-sticky 10`, `--z-header 30`, `--z-dock 40`, `--z-overlay 50`, `--z-popover 60`, `--z-tooltip 70`, `--z-skip 80`, as utilities `z-sticky z-header z-dock z-overlay z-popover z-tooltip z-skip`.

**Motion** [UI_RULES Motion; landing B7]: `--ease-iynk: cubic-bezier(0.22, 1, 0.36, 1)` (utility `ease-iynk`). Utilities: `motion-move` (transform, translate, scale, opacity; 500 ms), `motion-fade` (color, background-color, border-color, opacity, text-decoration-color; 300 ms), `motion-press` (transform; 200 ms, the floor). Press is `active:scale-98`. Reveals rise 32 px and fade over 600 to 800 ms (`--dur-reveal: 700ms`), once, with `IntersectionObserver`. Nav links rise 24 px, 60 ms apart, last start at or before 360 ms. Never animate width, height, top, left, inset. Under `prefers-reduced-motion` and `data-reduce-motion="true"` the travel variables become 0 and only opacity changes. Simulation animation inside figures and canvases follows the simulation clock and is not touched.

**Icons** [UI_RULES Icons]: `@phosphor-icons/react` 2.1.10 (npm `latest` at planning time, EXTERNAL; pinned exactly like the other dependencies), weight `regular` only, sizes by context: 16 inline with text, 20 in buttons and toolbars (default), 24 in nav and page headers, 32 in empty states. No cliche metaphors (no rocket for launch, no shield for safety).

**Borders**: 1 px `--rule` hairline; `border-2` and `border-[1.5px]` leave chrome. A selected or focused control may use `outline-2`.

**Components** [UI_RULES Components]: cards only where elevation means hierarchy. Prefer inline editing, slide over panels and the command menu to modals; a `Dialog` stays only for confirmations and the keys dialog (B1). Theme choice stays in Settings (already compliant) and is also a command menu action.

### 1.3 Sweep rules (each sweep card applies these to its files)

| Code | Rule |
|---|---|
| W1 | Type: the scale above; no `text-[x]`, `leading-[x]`, `tracking-[x]`, no `italic`, no weight over 700; the `font-head` class is dropped (headings are Geist from the base layer). |
| W2 | Spacing: the snap table; `clamp()` spacing becomes breakpoint steps. |
| W3 | Radius by role; `rounded-ink*` and pill buttons go; nested formula. |
| W4 | Borders: 1 px `--rule`; no `border-2`, `border-[1.5px]`, `border-line` in chrome; no one sided card border (a left bar becomes a tinted fill with an icon, or a dot). |
| W5 | Shadow: remove `shadow-ink*` and `shadow-[x]`; floating layers use `shadow-md` or `shadow-lg`. |
| W6 | Colour: chrome uses `ink muted rule accent` and the state tokens. Mapping: `mustard` as a fill or highlight becomes `accent` (primary) or `sunken` (quiet); `tomato` for danger, recording or live becomes `bad`; `mint` for on or success becomes `good`; `cobalt` for info becomes `info`; `blush` becomes neutral. Hex or rgb in chrome becomes a token. Data colours (wires, peer colours, ghost lines, figure colours) stay. |
| W7 | Icons: `<Icon name>` (Phosphor) at 16, 20, 24 or 32; no inline `<svg>` for an icon; no `→ ✓ × …` glyph as an icon. |
| W8 | Motion: `motion-move`, `motion-fade`, `motion-press`; no `ease-out`, `ease-linear`, `duration-75/100/150`; no transition on width, height, top, left, inset (progress bars use `scale-x`). |
| W9 | Controls: raw `<button>`, `<input>`, `<select>`, `<textarea>` become `Button`, `IconButton`, `TextInput`, `Select`, `TextArea`, `Toggle`, unless the card names an exception (a terminal input, a range slider, a native file input). |
| W10 | States: the changed screen has loading (a `Skeleton` shaped like the layout), empty (`EmptyState`), error (inline, specific, next to the field or in an `InlineStatus`) and disabled looks disabled; no `window.alert`; no dead link. |
| W11 | Mono: `font-ui` and `font-mono` only on code, serial, tabular readouts and data tables. A label or kicker becomes `kicker` or `text-xs font-semibold text-muted`. |
| W12 | z-index: only the named scale. |
| W13 | Copy touched in code (not in JSON): sentence case, no exclamation marks, no hyphenated phrase added. |
| W14 | Keep every test id, accessible name, role and keyboard path (the contract in section 1). Update a unit test only when it quotes a class name or a string that changed, in the same commit. |
| W15 | Sweeps add no message keys (parallel sweeps would collide in one JSON file). A loading, empty or error line reuses the file's existing keys or the generic `client.state.*` keys from T-BU-11. If a screen truly needs new wording, the task's report lists it (screen, string, language) for the orchestrator to schedule; BU does not block on it. |

### 1.4 The 5 file rule and the guard

The guard `scripts/ui-check.mjs` (T-BU-03) turns W1 to W15 into checks on `src/`: codes `R1 italic`, `R2 text size`, `R3 weight`, `R4 spacing`, `R5 radius`, `R6 shadow`, `R7 easing and animated property`, `R8 z-index`, `R9 icon library or inline svg icon`, `R10 alert/confirm/prompt`, `R11 gradient`, `R12 palette colour in chrome`, `R13 font-ui or font-mono used for a label (no tabular, not code)`, `R14 copy` (exclamation mark, spaced hyphen, em dash, hyphenated compound, filler word, in `src/i18n/messages/en`), `R15 one sided card border`, `R16 colour literal outside tokens and the allow list`, `R17 scroll listener`. An allow list file (`scripts/ui-check.allow.json`, each entry has a reason) holds the data colours and the figure frame exceptions. Sweep tasks run `UIC` on their own files and must reach 0 hits there.

### 1.5 The screenshot check (UI_RULES, "How to verify UI work")

For every task that changes what a person sees: build keyless (`BUILD <label>`), serve `next start` on a port from 47000 to 47999 with `NEXT_DIST_DIR=.next-<label>`, and with Playwright take a screenshot of each screen the task changed at 1440x900 and 390x844, in light and dark (set `localStorage` `iynk:v1` theme, or `page.emulateMedia({ colorScheme })` with the theme on system), save to `/Users/amar/iynk-build/state/bu-scratch/shots/<task-id>/` (scratch, never in the repo), open each image with the image reader and look. Fix anything cheap, cramped, misaligned or generic before the commit. Keep keyboard paths and AA contrast. Stop the server. The agent states in its result which images it opened. From T-BU-57 on the same check is `SHOTS`.

## 2. Task index

Source count is the number of source files edited or created (rule in section 1). Every task is P0. An earlier draft marked T-BU-13, 15, 35 and 52 to 55 as P1, but none of them can be dropped without failing a P0 task or the gate: the P0 nav bar (19) mounts the command menu (15), which shares `menu-nav.ts` with the Menu (13), and T-BU-48 and 57 use the command menu; the files of 35 must reach 0 guard hits for T-BU-56; and R14 (English hyphens, filler words, exclamation marks) is an error in `npm run check` from T-BU-58 and in the exit gate, which needs the copy passes 52 to 55. The column stays so a later phase can add P1 polish. The Dependencies, Group and Src columns below are generated from the Identity row of each card, so they cannot drift.

| Id | Title | Subsystem | Pri | Depends on | Group | Src |
|---|---|---|---|---|---|---|
| T-BU-01 | Split `globals.css` into four layer files, no visual change | styles | P0 | none | G1 | 5 |
| T-BU-02 | Phosphor installed; `Icon` on the same API | ui | P0 | none | G1 | 3 |
| T-BU-03 | UI guard script `scripts/ui-check.mjs` | tooling | P0 | none | G1 | 2 |
| T-BU-04 | Colour, surface, shadow and z-index tokens | styles | P0 | 01 | G2 | 1 |
| T-BU-05 | Type tokens; fonts (drop Instrument Serif and italics) | styles, fonts | P0 | 01 | G2 | 3 |
| T-BU-06 | Motion tokens and reduced motion | styles | P0 | 01 | G2 | 1 |
| T-BU-07 | Radius, spacing, frame and surface classes (aliases) | styles | P0 | 01 | G2 | 1 |
| T-BU-08 | Button, IconButton, Tooltip | ui | P0 | 02, 04, 05, 06, 07 | G3 | 3 |
| T-BU-09 | Field (TextInput, Select, TextArea, inline error), Toggle, SegmentedControl | ui | P0 | 02, 04, 05, 06, 07 | G3 | 3 |
| T-BU-10 | Tabs, Panel, Chip, Callout re-skinned; Card removed | ui | P0 | 02, 04, 05, 06, 07 | G3 | 5 |
| T-BU-11 | Skeleton, PageSkeleton, EmptyState, InlineStatus, Reveal | ui | P0 | 02, 04, 05, 06, 07 | G3 | 5 |
| T-BU-12 | Dialog, Sheet (slide over), Popover, CodeBlock | ui | P0 | 02, 04, 05, 06, 07 | G3 | 4 |
| T-BU-13 | Menu (action menu) | ui | P0 | 02, 04, 05, 06, 07 | G3 | 2 |
| T-BU-14 | Kbd, Meter, Stat, Stepper, ProgressBadge | ui | P0 | 02, 04, 05, 06, 07 | G3 | 5 |
| T-BU-15 | Command menu | shell | P0 | 08, 09, 12, 13 | G4 | 4 |
| T-BU-16 | Workspace chrome and the dock | shell | P0 | 08, 10, 11, 12 | G4 | 5 |
| T-BU-17 | Settings menu, theme, language, sound, usage toggles | settings | P0 | 08, 09, 12; B1 (T-B1-02) | G4 | 5 |
| T-BU-18 | Keys dialog, usage meter and NotSetUp on the base | settings | P0 | 08, 09, 10, 11, 12, 14; B1 (T-B1-02, 26, 27, 30) | G4 | 5 |
| T-BU-19 | Floating nav bar and the current page mark | shell | P0 | 08, 15, 17 | G5 | 4 |
| T-BU-20 | Sweep: board lab 1 (workspace, view bar) | boardlab | P0 | 08 to 14 | G5 | 5 |
| T-BU-21 | Sweep: board lab 2 (lesson) | boardlab | P0 | 08 to 14 | G5 | 5 |
| T-BU-22 | Sweep: board lab 3 (code, serial, checks) | boardlab | P0 | 08 to 14 | G5 | 5 |
| T-BU-23 | Sweep: board lab 4 (pinout, wiring, world, shortcuts) | boardlab | P0 | 08 to 14 | G5 | 4 |
| T-BU-24 | Full height mobile panel and the animated menu icon | shell | P0 | 19 | G6 | 3 |
| T-BU-25 | Footer, legal links, privacy page | shell, ship | P0 | 08, 11, 19, 26 | G6 | 4 |
| T-BU-26 | Editorial page grammar | pages | P0 | 08, 10, 11 | G6 | 2 |
| T-BU-27 | Catalogue, dashboard progress, figure frame chrome | pages, figure | P0 | 08, 10, 11, 26 | G6 | 4 |
| T-BU-28 | Sweep: robotics lab 1 (workspace, steps, faults) | robotics | P0 | 08 to 14 | G6 | 5 |
| T-BU-29 | Sweep: robotics lab 2 (quiz, status, tasks) | robotics | P0 | 08 to 14 | G6 | 3 |
| T-BU-30 | Sweep: hardware twin and drone lab 1 (panels) | hw, dronelab | P0 | 08 to 14 | G6 | 5 |
| T-BU-31 | Home copy: `home` namespace in six languages | i18n | P0 | 11, 26 (B1 done) | G7 | 3 |
| T-BU-32 | Sweep: drone lab 2 (workspace, build, console) | dronelab | P0 | 08 to 14 | G7 | 4 |
| T-BU-33 | Sweep: drone lab 3 (fly workspace, design) | dronelab | P0 | 08 to 14 | G7 | 2 |
| T-BU-34 | Sweep: flight range, break it, daily challenge | flight | P0 | 08 to 14 | G7 | 3 |
| T-BU-35 | Sweep: gamepad and touch sticks | flight | P0 | 08 to 14 | G7 | 2 |
| T-BU-36 | Home: hero | home | P0 | 11, 26, 27, 31 | G8 | 3 |
| T-BU-37 | Home: tagline reveal | home | P0 | 11, 26, 31 | G8 | 3 |
| T-BU-38 | Home: labs shelf and how it works | home | P0 | 11, 26, 27, 31 | G8 | 3 |
| T-BU-39 | Home: what runs, what is simulated, and the FAQ | home | P0 | 11, 26, 31 | G8 | 3 |
| T-BU-40 | Home: open source and the closing call | home | P0 | 11, 26, 31 | G8 | 2 |
| T-BU-41 | Sweep: AI partner | ai | P0 | 08 to 14, 18 | G8 | 5 |
| T-BU-42 | Sweep: search panels | search | P0 | 08 to 14, 18 | G8 | 5 |
| T-BU-43 | Home: compose the page and metadata | home | P0 | 36 to 40 | G9 | 3 |
| T-BU-44 | Sweep: room bar, together panel, chat, voice | realtime | P0 | 08 to 14 | G9 | 4 |
| T-BU-45 | Sweep: identity, invite, avatars, cursors, lobby | realtime | P0 | 08 to 14 | G9 | 5 |
| T-BU-46 | Sweep: list pages and about (skeletons, copy of states) | pages | P0 | 11, 26, 27 | G9 | 5 |
| T-BU-47 | Sweep: detail pages (skeletons) | pages | P0 | 11, 26, 27 | G9 | 5 |
| T-BU-48 | Branded 404 (language and global), error boundary | ship | P0 | 08, 11, 19, 26 | G10 | 5 |
| T-BU-49 | Meta, og, robots, sitemap, manifest, viewport, skip link | ship | P0 | 05, 25 | G10 | 5 |
| T-BU-50 | States spec: no alert, skeletons, empty and error states | tests | P0 | 11, 20 to 47 | G10 | 0 |
| T-BU-51 | Motion pass: reveals on pages, reduced motion proof | motion | P0 | 06, 11, 26, 43, 44 to 47 | G10 | 1 |
| T-BU-52 | Copy pass 1: common, shell, hw | i18n | P0 | 31 | G11 | 3 |
| T-BU-53 | Copy pass 2: boardlab, robotics | i18n | P0 | 31 | G11 | 2 |
| T-BU-54 | Copy pass 3: dronelab, flight, together | i18n | P0 | 31 | G11 | 3 |
| T-BU-55 | Copy pass 4: ai, search | i18n | P0 | 31 | G11 | 2 |
| T-BU-56 | Remove the compatibility aliases and `marketing/` | styles, ui | P0 | all sweeps, 43, 48 | G12 | 5 |
| T-BU-57 | Screenshot and axe Playwright spec | tests | P0 | 56 | G13 | 4 |
| T-BU-58 | Wire the guard into `check`; contributor UI doc; the ui barrel | tooling | P0 | 56 | G13 | 5 |
| T-BU-59 | Phase exit gate (no file changes) | verification | P0 | all | G14 | 0 |

59 tasks in 14 groups. Counts: 21 tasks edit exactly 5 source files; none edits more.

## 3. Parallel groups

Groups run in order. Tasks inside a group touch disjoint files (section 4) and can be built by separate agents at once. "Why this order" names the file or type that forces it.

| Group | Tasks | Why this order |
|---|---|---|
| G1 | 01, 02, 03 | Disjoint: CSS layers, the icon wrapper with `package.json`, and a script. No task depends on another. |
| G2 | 04, 05, 06, 07 | Each owns one layer file made in 01 (`tokens.css`, `type.css`, `motion.css`, `layout.css`); 05 also owns `layout.tsx` fonts and `CodeEditor.tsx`. |
| G3 | 08 to 14 | Base components read the tokens (G2) and the Phosphor `Icon` (02). Disjoint files in `src/components/ui/`. Menu (13) uses `Popover`'s native popover API directly so it does not wait for 12. |
| G4 | 15, 16, 17, 18 | 15 builds on Dialog (12) and Button, Field (08, 09). 16 restyles the dock with Sheet and Panel. 17 and 18 use Field, Toggle, Dialog. They share no file. |
| G5 | 19, 20, 21, 22, 23 | 19 mounts the command menu trigger (15) and the settings button (17). The four board lab sweeps are disjoint files and need only the base kit. |
| G6 | 24 to 30 | 24 edits `MobileNav.tsx` after 19 settled `NavLinks.tsx` (its sheet layout). 26 is the page grammar and moves the helpers out of `marketing/` into `editorial/Editorial.tsx`, so it lands before 25 (uses `PageHead`, `Section`) and 27 (imports `typeClass`, `CtaLink`, `ArrowLink`); the home sections import the same helpers. 28 to 30 are sweeps. |
| G7 | 31 to 35 | 31 is the copy source for the home sections (G8) and creates `home/primitives.tsx` (`WORKBENCH_HREF`, `REPO_URL`, `HomeSection`) they import, so it lands first; it needs `Reveal` (11) and `Wrap` (26) from earlier groups. 32 to 35 are sweeps. |
| G8 | 36 to 42 | Home sections are separate new files in `src/components/home/` that read `home.json` and `home/primitives.tsx` (31) and the page grammar in `editorial/Editorial.tsx` (26, 27). 41, 42 are sweeps. |
| G9 | 43 to 47 | 43 composes `page.tsx` after all sections exist (it no longer deletes `marketing/`; 56 does). 44 to 47 are sweeps; 46 and 47 use `PageSkeleton` (11) and the grammar (26, 27). |
| G10 | 48 to 51 | Ship, states spec and motion pass run on the finished screens. 50 is a spec only. |
| G11 | 52 to 55 | Copy passes own different namespaces. They run after the screens are final so the screenshots show final text. |
| G12 | 56 | Deletes aliases and the `marketing/` folder only when every sweep, the home page and the 404 stopped using them (`UIC` is 0, `git grep components/marketing` prints nothing). |
| G13 | 57, 58 | 57 (spec, Playwright config) and 58 (scripts, package.json, docs) are disjoint and both need the clean tree. |
| G14 | 59 | The exit gate. |

Longest chain: 01 to 07 to 11 to 26 to 31 to 36 to 43 to 56 to 58 to 59.

## 4. File ownership

Rule: no file appears twice in one group. Files edited by several tasks are in 4.1 in the order the tasks run. Every other edited file belongs to one task and is listed in 4.2.

### 4.1 Files with more than one owner (always in different groups)

| File | Tasks in order |
|---|---|
| `src/app/globals.css` | 01 (G1) only |
| `src/styles/tokens.css` | 01 (G1), 04 (G2), 56 (G12) |
| `src/styles/type.css` | 01 (G1), 05 (G2), 56 (G12) |
| `src/styles/motion.css` | 01 (G1), 06 (G2), 56 (G12) |
| `src/styles/layout.css` | 01 (G1), 07 (G2), 16 (G4: dock push rule), 56 (G12) |
| `src/app/[lang]/layout.tsx` | 05 (G2: fonts), 49 (G10: metadata, viewport, skip link) |
| `src/components/shell/NavLinks.tsx` | 19 (G5: both layouts) |
| `src/components/shell/SettingsMenu.tsx` | 17 (G4) |
| `src/components/editorial/Editorial.tsx` | 26 (G6: the helpers from `marketing/` move in), 51 (G10: reveals; drops `quietField`, `enter`, `Accent`) |
| `src/components/marketing/index.tsx` | 26 (G6: becomes a one line re-export of `Editorial.tsx`), 56 (G12: the folder is deleted) |
| `src/components/home/primitives.tsx` | 31 (G7: created), 43 (G9: aligned with `page.tsx`) |
| `src/components/ui/icons.tsx` | 02 (G1), 58 (G13: `size` type narrowed to `16 \| 20 \| 24 \| 32`) |
| `src/components/marketing/marketing.css` | 26 (G6: deleted) |
| `.gitignore` | 57 (G13) only |
| `src/app/[lang]/page.tsx` | 43 (G9) only |
| `src/app/[lang]/not-found.tsx` | 48 (G10) only |
| `src/i18n/messages/*/shell.json` | 15 (G4: command menu), 19 (G5: search label), 25 (G6: footer and privacy), 52 (G11) |
| `src/i18n/messages/*/common.json` | 11 (G3: `client.state`, five keys including `saved`), 48 (G10), 52 (G11) |
| `src/i18n/namespaces.ts`, `messages/*/home.json` | 31 (G7) only; if a home section needs a key that 31 did not write, the section task stops and reports it, and the orchestrator opens a follow up task in a later group, so two tasks never edit the file at once |
| `src/i18n/messages/*/{boardlab,robotics}.json` | 53 (G11) |
| `src/i18n/messages/*/{dronelab,flight,together}.json` | 54 (G11) |
| `src/i18n/messages/*/{ai,search}.json` | 55 (G11) |
| `package.json`, `package-lock.json` | 02 (G1), 58 (G13) |
| `next.config.ts` | 48 (G10: `experimental.globalNotFound`) only |
| `playwright.config.ts` | 57 (G13) only |
| `src/components/ui/index.ts` | 10 (G3: drop the `Card` line), 58 (G13: add the new components) |
| `src/components/ui/Button.tsx` | 08 (G3), 56 (G12: drop the `ink` and `lg` aliases) |
| `src/components/ai/icons.tsx` | 02 (G1: re-export), 56 (G12: deleted, after 41 moved its users) |

### 4.2 Single-owner files

Paths are under `src/` unless they start with `e2e/`, `scripts/`, `docs/` or `.github/`. In rows 20 to 23, 28 to 30, 32 to 35, 41, 42, 44 and 45 a path that starts with a folder name such as `boardlab/` or `realtime/` is under `src/components/`; `together/` and `app/` paths in those rows are under `src/app/[lang]/` and `src/app/`.

| Task | Files (source first, then tests, then deletes) |
|---|---|
| 01 | `src/app/globals.css`, `src/styles/{tokens,type,motion,layout}.css`; test `src/styles/styles.test.ts` (new) |
| 02 | `package.json` + lockfile, `src/components/ui/icons.tsx`, `src/components/ai/icons.tsx`; test `src/components/ui/icons.test.tsx` (new) |
| 03 | `scripts/ui-check.mjs`, `scripts/ui-check.allow.json`; test `scripts/ui-check.test.mjs` (new) |
| 04 | `src/styles/tokens.css`; test `src/styles/tokens.test.ts` (new) |
| 05 | `src/styles/type.css`, `src/app/[lang]/layout.tsx`, `src/components/boardlab/CodeEditor.tsx`; test `src/styles/type.test.ts` (new) |
| 06 | `src/styles/motion.css`; test `src/styles/motion.test.ts` (new) |
| 07 | `src/styles/layout.css`; test `src/styles/layout.test.ts` (new) |
| 08 | `src/components/ui/{Button,IconButton,Tooltip}.tsx`; tests `Tooltip.test.tsx`, `Button.test.tsx` (new) |
| 09 | `src/components/ui/{Field,Toggle,SegmentedControl}.tsx`; tests `SegmentedControl.test.tsx`, `Field.test.tsx` (new), `Toggle.test.tsx` (new) |
| 10 | `src/components/ui/{Tabs,Panel,Chip,Callout}.tsx`, `src/components/ui/index.ts` (drops the `Card` and `Tone` export line only); deletes `Card.tsx`; tests `Tabs.test.tsx`, `Callout.test.tsx` (new) |
| 11 | `src/components/ui/{Skeleton,EmptyState,InlineStatus,Reveal}.tsx` (`Skeleton.tsx` also holds `SkeletonGroup` and `PageSkeleton`; `Reveal.tsx` also holds `useRevealOnce`), `src/i18n/messages/*/common.json` (the `client.state.*` keys); tests `Skeleton.test.tsx`, `EmptyState.test.tsx`, `Reveal.test.tsx` (new) |
| 12 | `src/components/ui/{Dialog,Sheet,Popover,CodeBlock}.tsx`; tests `Dialog.test.tsx` |
| 13 | `src/components/ui/Menu.tsx`, `src/components/ui/menu-nav.ts`; test `menu-nav.test.ts` (new), `Menu.test.tsx` (new) |
| 14 | `src/components/ui/{Kbd,Meter,Stat,Stepper,ProgressBadge}.tsx`; tests `Stat.test.tsx`, `ProgressBadge.test.tsx` |
| 15 | `src/components/ui/CommandMenu.tsx`, `src/components/shell/command-items.ts`, `src/components/shell/CommandMenuHost.tsx`, `src/i18n/messages/*/shell.json`; test `command-items.test.ts` (new) |
| 16 | `src/components/shell/{WorkspaceBar,StageDrawer,UntranslatedNotice}.tsx`, `src/components/dock/LabDock.tsx`, `src/styles/layout.css`; test `LabDock.test.tsx` |
| 17 | `src/components/shell/{SettingsMenu,ThemeControl,LanguagePicker}.tsx`, `src/components/settings/{SoundToggle,UsageToggle}.tsx`; test `src/lib/settings/settings.test.tsx` only if it quotes a class |
| 18 | `src/components/settings/{KeysDialog,KeysPanel,UsageMeter,NotSetUp,LocalLog}.tsx` (the B1 files; `settings/index.ts` is B1's and does not change); their tests |
| 19 | `src/components/shell/{SiteHeader,NavLinks,NavBar}.tsx`, `src/i18n/messages/*/shell.json` (nav search label); test `NavBar.test.tsx` (new), `nav.test.ts` |
| 20 | `boardlab/{BoardWorkspace,BoardProgress,ViewBar,ScrollRow,FigureReadout}.tsx` |
| 21 | `boardlab/{LessonWorkspace,LessonPicker,LessonInfo,ParamPanel,PinReadout}.tsx` |
| 22 | `boardlab/{CodePanel,SerialMonitor,ChecksPanel,FailurePanel,AssemblyPanel}.tsx` |
| 23 | `boardlab/{PinoutTable,WireInPanel,WorldPanel,ShortcutsDialog}.tsx` |
| 24 | `src/components/shell/{MobileNav,MenuIcon}.tsx`, `src/components/shell/nav-stagger.ts`; test `nav-stagger.test.ts` (new) |
| 25 | `src/components/shell/{SiteFooter,FooterNav}.tsx`, `src/app/[lang]/privacy/page.tsx`, `src/i18n/messages/*/shell.json` |
| 26 | `src/components/editorial/Editorial.tsx`, `src/components/marketing/index.tsx` (one line re-export); deletes `src/components/marketing/marketing.css`; test `src/components/editorial/Editorial.test.tsx` (new) |
| 27 | `src/components/catalogue/Catalogue.tsx`, `src/components/shell/dashboard/DashboardProgress.tsx`, `src/components/figure/{FigureStill,FigureFrame}.tsx` |
| 28 | `robotics/{BenchWorkspace,Fold,FaultsPanel,SerialPanel,StepsPanel}.tsx` |
| 29 | `robotics/{QuizPanel,StatusPanel,TasksPanel}.tsx` |
| 30 | `hw/HardwareTwinPanel.tsx`, `dronelab/{CraftProgress,TestsPanel,QuizPanel,WiringPanel}.tsx` |
| 31 | `src/i18n/namespaces.ts`, `src/i18n/messages/*/home.json` (new set), `src/components/home/primitives.tsx` (new); tests `src/i18n/messages.test.ts` (already covers every namespace), `src/i18n/home-copy.test.ts` (new), `src/components/home/primitives.test.tsx` (new) |
| 32 | `dronelab/{DroneWorkspace,BuildPanel,KeyboardHelp,CliConsole}.tsx` |
| 33 | `dronelab/{FlyWorkspace,DesignPanel}.tsx` |
| 34 | `flight/{FlightRange,BreakIt,DailyChallenge}.tsx` |
| 35 | `flight/{GamepadPanel,TouchSticks}.tsx` |
| 36 | `src/components/home/{Hero.tsx,hero.css}`, `src/components/home/HeroFigure.tsx` |
| 37 | `src/components/home/{TaglineReveal.tsx,tagline-words.ts,tagline.css}`; test `tagline-words.test.ts` (new) |
| 38 | `src/components/home/{LabsShelf,HowItWorks}.tsx`, `src/components/home/labs-data.ts` |
| 39 | `src/components/home/{Proof,Faq}.tsx`, `src/components/home/faq-schema.ts`; test `faq-schema.test.ts` (new) |
| 40 | `src/components/home/{OpenSource,FinalCta}.tsx` |
| 41 | `ai/{PartnerPanel,TurnView,ChangeCard,Markdown,MicButton}.tsx` |
| 42 | `search/{RealBuildPanel,shared,SourcesList,VideoHelp,NearbyPanel}.tsx` |
| 43 | `src/app/[lang]/page.tsx`, `src/components/home/primitives.tsx` (edited, created by 31), `src/components/home/index.ts` (new); test `e2e/home.spec.ts` (B1's, edited) |
| 44 | `realtime/{RoomBar,TogetherPanel,ChatPanel,VoiceButton}.tsx` |
| 45 | `realtime/{IdentityForm,InviteDialog,PeerAvatar,PresenceCursors}.tsx`, `src/app/[lang]/together/Lobby.tsx` |
| 46 | `src/app/[lang]/about/page.tsx`, `boards/page.tsx`, `drones/page.tsx`, `robotics/page.tsx`, `together/page.tsx` |
| 47 | `src/app/[lang]/boards/[board]/page.tsx`, `boards/[board]/[lesson]/page.tsx`, `drones/[drone]/page.tsx`, `drones/[drone]/fly/page.tsx`, `robotics/[bench]/page.tsx` |
| 48 | `src/app/[lang]/not-found.tsx`, `src/app/global-not-found.tsx`, `src/app/[lang]/error.tsx`, `next.config.ts`, `src/i18n/messages/*/common.json` |
| 49 | `src/app/[lang]/layout.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/manifest.ts`, `src/components/ui/SkipLink.tsx`; test `src/app/sitemap.test.ts` (new) |
| 50 | none (tests: `e2e/states.spec.ts`) |
| 51 | `src/components/editorial/Editorial.tsx`; test `e2e/motion.spec.ts` (new) |
| 52 | `messages/*/{common,shell,hw}.json` (three sets) |
| 53 | `messages/*/{boardlab,robotics}.json` |
| 54 | `messages/*/{dronelab,flight,together}.json` |
| 55 | `messages/*/{ai,search}.json` |
| 56 | `src/styles/{tokens,type,motion,layout}.css`, `src/components/ui/Button.tsx`; deletes `src/components/ai/icons.tsx` and the folder `src/components/marketing/` |
| 57 | `e2e/visual.spec.ts`, `e2e/support/visual.ts`, `playwright.config.ts`, `.gitignore` |
| 58 | `package.json`, `scripts/ci-local.sh`, `.github/workflows/ci.yml`, `src/components/ui/index.ts`, `src/components/ui/icons.tsx` (size type narrowed); `docs/UI.md` (docs, not counted) |
| 59 | none |

The favicon `src/app/icon.svg` and `apple-icon.png` stay as drawn: the dark square in them is an icon image, not a UI surface, and `icon.svg` is the same drawing as the logo's `i` (`Logo.tsx:2-3`). Section 5 item 6 lists it for Amar.

## 5. For Amar (not agent tasks)

| # | Item | Why only a person can do it |
|---|---|---|
| 1 | Look at the screenshots at the gate and say yes or no to the new look: the accent `#e4694e`, the dark theme ladder (`#131209` page, `#1F1F1F` panels, `#272727` menus), the floating nav, the home page. | Taste. The plan follows the skills' values; only you can say it feels right. |
| 2 | Plan the merge of `build/ui` into `build/v1` after B3. | B3 edits `src/app/[lang]/layout.tsx` and `src/app/[lang]/about/page.tsx` (3 mentions each in `B3-core-storage-runtime-replay.md`), and B2 adds New and Open buttons to the home page (R-050, named in B1 T-B1-21 "later tasks need"). BU rewrites the same three places. The merge keeps both sides by hand; it is not a clean cherry pick. |
| 3 | Have a native reader check `home.json` in Hindi, Chinese, German, French and Spanish before the page is public. | The agents translate it (Sonnet), and a translation of marketing prose is the part machines get subtly wrong. The tagline reveal splits words per language (`Intl.Segmenter`), which only a reader can judge. |
| 4 | Choose the licence (D-017). | The footer says "Licence: not chosen yet" until you pick (honest status); one string per language changes after the choice. |
| 5 | Confirm the GitHub URL the home page and footer link to. | B1 T-B1-21 uses `https://github.com/kushwahaamar-dev/iynk` from `git remote -v`. It is your account and public name. |
| 6 | Decide whether to redraw the favicon, `apple-icon.png` and `opengraph-image.png` in the new accent. | They are artwork, not UI. The plan leaves them as drawn (the dark square is an icon image). Regenerating the OG image needs the Colorfigures tool and your eye. |
| 7 | Run `UI_SHOTS=compare npx playwright test e2e/visual.spec.ts --update-snapshots` once on your Mac when you accept the look. | Baselines are per operating system, so they are not committed; yours become the reference for later phases (question 9). |
| 8 | Say whether the experimental `global-not-found` flag is acceptable. | It is documented as experimental in Next 16.4.3 (`not-found.md:47`). T-BU-48 falls back to the language 404 only if the build rejects it (question 8). |
| 9 | Read the privacy page text once (T-BU-25). | It says what the app stores and sends. It is a short note, not legal advice, and a lawyer would write it differently. |

## 6. Open questions for the orchestrator or Amar

| # | Question | Default taken in this plan |
|---|---|---|
| 1 | The accent `#ef6a4c` has HSL saturation 83 percent, over the 80 percent limit in UI_RULES. | `#e4694e` (74 percent), same hue. Dark text `#231e16` on it has contrast 5.1 to 1 (computed in the T-BU-04 test). |
| 2 | UI_RULES allows one accent; the app uses five palette tones as chrome colours and green, red, amber, blue for state. | Chrome uses ink and the one accent. State keeps four semantic tokens (they carry meaning, not decoration), shown as icon plus text on a neutral or a 12 percent tint. The five palette tones stay as tokens for figures and data colours only. |
| 3 | The figure plate is paper with a dark frame; in dark mode its paper is `#e4ddcf`, which is not in the allowed dark list. | Kept. UI_RULES says the figures stay as they are; the plate is the art's page. The guard has an allow list entry with this reason. The frame becomes a 1 px hairline and `rounded-xl`. |
| 4 | Grain. The old look sets a noise image on body, header and plates. UI_RULES: flat paper, "no noise unless subtle". | Kept only on `body` in light theme at the existing low alpha (0.15 of a 280 px noise tile), removed from dark (exact hex surfaces), header, stage and plates. |
| 5 | Dark ladder mapping with one warm black and a neutral gray ladder. | Section 1.2 table. If it looks muddy at the gate, the swap is one block in `tokens.css`. |
| 6 | Primary button colour and shape. | Accent fill with dark text (`--on-accent`), `rounded-lg`, not a pill. The old mustard raised button goes. |
| 7 | Geist Mono for labels. The old look sets every kicker in mono capitals. | Labels use Geist sentence case; Mono stays for code, serial output, numbers and data tables. |
| 8 | `global-not-found` is experimental (`experimental.globalNotFound`). | Use it. If `BUILD` fails with it, T-BU-48 drops the flag and the global file, keeps the language 404, and records that `/xyz` without a language shows Next's default page. |
| 9 | Should screenshot baselines be committed? | No. `toHaveScreenshot` baselines differ per OS and font rasterisation. The spec always takes the screenshots and runs axe; it compares to a local baseline only when `UI_SHOTS=compare`. Baselines live in `e2e/visual.spec.ts-snapshots/` and are git-ignored. |
| 10 | The home page primary action "Open the workbench" needs a target. The Studio (B4) does not exist yet. | `WORKBENCH_HREF` in `home/primitives.tsx` (created by T-BU-31) is the path `/boards/uno-r3`; `workbenchHref(lang, uno)` builds the link from it with the first lesson entry, as today's `startHref` does (`page.tsx:62`). B4 changes one constant. |
| 11 | Lab teaching prose (`src/i18n/content/**`, `figure-strings`, about 19,000 lines per language) is content, not chrome. | Out of the copy pass. B1's copy check covers banned phrases there. Chrome strings in `messages/*` are in scope. |
| 12 | The merge with B3 (layout, about) and B2 (home buttons). | Section 5 item 2. |
| 13 | Phosphor has no drone glyph. | `drone` maps to `Fan` and `board` to `Cpu`: the packed 2.1.10 has no `Propeller` or `CircuitBoard` (checked in `dist/ssr`). The T-BU-02 test lists the mapping and fails on a missing export. No rocket, no shield. |
| 14 | Hindi and Han headings need more line height than the scale's `1` at `text-5xl`. | `:lang(hi)` and `:lang(zh-Hans)` set `line-height: 1.3` for display headings only. UI_RULES intro: where a skill rule would break a language, keep the language and say so. |
| 15 | Does BU touch `src/content/**` (board, bench and drone data)? | No. Only `src/components`, `src/app`, `src/styles`, `src/i18n/messages`, `scripts`, `e2e`, `docs/UI.md`. |
| 16 | Tailwind cannot forbid off scale spacing. | The guard script does, and it runs in `npm run check` after T-BU-58. |
| 17 | The CSP from B1 (`style-src 'self'`). | BU adds no inline style element or script. The FAQ JSON-LD is `<script type="application/ld+json">`, a data block the CSP does not execute; the CSP e2e must show 0 violations. |
| 18 | Phosphor weight. | `regular` everywhere, one size per context. No `duotone`, no `fill` state swaps. The current page in the nav is shown by a background and `aria-current`, not a filled icon. |

## 7. Task cards

Each card has the same rows. Cards run in id order inside a group only where the group table says so; otherwise any order. "Design values" always means section 1.2 and 1.3; a card repeats the values it uses so a builder does not have to hunt. Every card carries the standard fields: status "not started"; permissions "edits only the files named, reads no secret"; release blockers "any listed proof command fails, a file outside the card changes, a test id or accessible name from the section 1 contract changes without a spec edit in the same commit".

---

### T-BU-01. Split `globals.css` into four layer files, no visual change

| Field | Content |
|---|---|
| **Identity** | Id T-BU-01. Subsystem styles. Phase BU. Priority P0. Dependencies none. Group G1. Source files: 5 (`src/app/globals.css`, `src/styles/tokens.css`, `type.css`, `motion.css`, `layout.css`). |
| **Problem** | One 604 line file holds tokens, fonts, the base layer, component classes, frames and reduced motion (`globals.css`). Four G2 tasks must edit different concerns at once and cannot if it is one file. |
| **Expected behaviour** | `globals.css` becomes five lines: `@import "tailwindcss";` then `@import "../styles/tokens.css";`, `type.css`, `motion.css`, `layout.css` in that order. Content moves unchanged. The built CSS has the same rules as before. |
| **Existing files** | `src/app/globals.css`: `:14-25` `@custom-variant dark`; `:27-93` `@theme static` (palette `:28-65`, `--radius-ink` `:67-68`, `--animate-*` and `@keyframes` `:70-93`); `:95-132` `@theme inline`; `:134-169` `:root, .ink-plate` colour tokens; `:171-217` `:root` plate, accent, shell and header variables and the workspace `:has()` override; `:218-292` the two dark blocks; `:293-317` Hindi and Chinese font rules; `:318-375` `@layer base`; `:377-578` `@layer components`; `:580-583` `@layer utilities`; `:585-600` reduced motion; `:602-604` print. |
| **New files** | `tokens.css` gets `:14-292` except the animation entries. `type.css` gets `:293-317`, the typographic parts of the base layer (`html`, `body`, `h1` to `h4`, `p`, `a`, `code`, `::selection`: `:319-360`), `.ink-kicker` `:404-412`, `.ink-label` `:414-420`, `.shell-meta` `:454-469`, `.accent-serif` `:471-478`, the `.tok-*` rules `:567-574` and `.tabular`. `motion.css` gets the `--animate-*` entries and `@keyframes` (`:70-93`, wrapped in their own `@theme static { }`) and `:585-600`. `layout.css` gets the rest: `:focus-visible` `:362-367`, `[hidden]`, the input accent, `iframe`, `.ink-card`, `.ink-plate`, `.ink-field`, `.site-footer`, `.shell-frame`, `.frame`, `.ws*`, `.ink-prose`, `.ink-hand`, `.touch-target`, print. |
| **Design values** | None change. This task moves text. |
| **States** | Not applicable (no visible change). |
| **i18n** | Not applicable. |
| **Tests** | vitest `src/styles/styles.test.ts` (node env): `globals.css` has the four imports in order after `@import "tailwindcss"`; each file exists; no file declares `@theme` variables the others also declare (parse `--name:` per block and assert each appears once per selector across the four files); the dark selectors exist twice (media and attribute). Build equality: `BUILD bu-01-before` on the parent commit, `BUILD bu-01-after` on this one; concatenate `.next-<label>/static/chunks/*.css`, strip comments and whitespace, split on `}`, sort, `sha1sum`; the two hashes match. If Turbopack's Tailwind loader does not resolve the relative `@import` (UNKNOWN until built) the builder tries `@import "../../styles/tokens.css"` from `src/app` and, failing that, `@reference`; the task is not done until the hash matches. |
| **Acceptance** | Given the parent commit and this commit, When both are built, Then the sorted rule sets are identical. Given `/en` in a browser, Then it looks the same (open one before and after screenshot at 1440x900 light). |
| **Proof commands** | `TL`; `V src/styles`; the two `BUILD` runs and hash compare above. |
| **Rollback** | `git revert`; the old file returns whole. |
| **Later tasks need** | T-BU-04 to T-BU-07 each own one of the four files. |

---

### T-BU-02. Phosphor installed; `Icon` on the same API

| Field | Content |
|---|---|
| **Identity** | Id T-BU-02. Subsystem ui. Phase BU. Priority P0. Dependencies none. Group G1. Source files: 3 (`package.json` with lockfile counted as 1, `src/components/ui/icons.tsx`, `src/components/ai/icons.tsx`). |
| **Problem** | The icons are 30 hand drawn path strings (`ui/icons.tsx:35-72`) with a 2 px round ink stroke, plus 11 more in `ai/icons.tsx` (37 lines, the `PartnerIcon` component). `<Icon` is used on 47 lines in 28 files and `<IconButton icon=` on 22 lines in 15 files. UI_RULES: Phosphor, one weight, one size per context. No Phosphor dependency exists. |
| **Expected behaviour** | `npm install --save-exact @phosphor-icons/react@2.1.10`. `Icon` keeps `{ name: IconName; size?: number }` and its `aria-hidden` default, and renders the Phosphor component for `name` at weight `regular` (so no caller changes). Sizes: the default is 20; any other number a caller passes is rounded to the nearest of 16, 20, 24, 32 (a tie goes up) and the unit test lists the rounding (18 to 20, 12 to 16, 14 to 16). The prop type stays `number` on purpose: the tree has 6 `size={12}`, 13 `size={14}` and 11 `size={18}` call sites (`ChecksPanel.tsx:75`, `UntranslatedNotice.tsx:28`, `LabDock.tsx:241`, and `PartnerIcon` size 14 in `ai/`) and this task owns 3 files, so a union type would fail `tsc` here. Each sweep snaps the sizes in its own files to 16, 20, 24 or 32; T-BU-58 narrows the type to `16 \| 20 \| 24 \| 32`, and `tsc` is the proof that every sweep did it. `ai/icons.tsx` keeps exporting `PartnerIcon` and `PartnerIconName`, now as a thin wrapper over `Icon` for its 11 names (they join `IconName`: `spark`, `mic`, `send`, `stop`, `share`, `download`, `link`, `book`, `chat`, `refresh`, `people`), so its users keep compiling until T-BU-41 moves them. The set of `IconName` strings stays a superset of today's, so a missing name is a type error. |
| **Existing files** | `src/components/ui/icons.tsx:1-33` (`IconName`), `:35-72` (`PATHS`), `:74-88` (`Icon`); `src/components/ai/icons.tsx` (37 lines, its own set); `package.json` dependencies; Next's guidance on icon imports `node_modules/next/dist/docs/01-app/02-guides/local-development.md:131-143`. |
| **New files** | `src/components/ui/icons.test.tsx`. |
| **Design values** | Mapping (name to Phosphor component): `close X`, `menu List`, `check Check`, `copy Copy`, `chevron-right CaretRight`, `chevron-left CaretLeft`, `chevron-down CaretDown`, `info Info`, `tip Lightbulb`, `warn Warning`, `danger WarningOctagon`, `globe Globe`, `board Cpu`, `robot Robot`, `drone Fan` (question 13), `play Play`, `external ArrowUpRight`, `keyboard Keyboard`, `settings GearSix`, `tools Wrench`, `sound-on SpeakerHigh`, `sound-off SpeakerSlash`, `rotate-left ArrowCounterClockwise`, `rotate-right ArrowClockwise`, `target Crosshair`, `reset ArrowsCounterClockwise`, `expand ArrowsOut`, `lock Lock`, `undo ArrowUUpLeft`, `panel-right SidebarSimple`, `spark Sparkle`, `people UsersThree`, `share ShareNetwork`, `mic Microphone`, `link LinkSimple`, `download DownloadSimple`, `book BookOpen`, `refresh ArrowsClockwise`, `send PaperPlaneRight`, `stop Stop`, `chat ChatCircle`. Names added for the new components and the home page: `key Key`, `search MagnifyingGlass`, `command Command`, `arrow-right ArrowRight`, `github GithubLogo`, `warn-circle WarningCircle`, `check-circle CheckCircle`, `empty Tray`, `eye Eye`, `code Code`, `bolt Lightning`, `fly AirplaneTilt`, `house House`, `sliders SlidersHorizontal`. Checked against the packed `@phosphor-icons/react@2.1.10`: `dist/ssr/Propeller.es.js` and `dist/ssr/CircuitBoard.es.js` do not exist, while `Cpu`, `Fan` and every other name in this list do. Imports use the deep ssr path so the component works in Server Components and tree shakes: `@phosphor-icons/react/dist/ssr/<Name>`; the builder checks the real folder names with `ls node_modules/@phosphor-icons/react/dist` (the `./dist/ssr/*` export is VERIFIED in the packed 2.1.10; the doc example in `local-development.md:137-141` shows `dist/csr/`; `csr` needs `"use client"` and `Icon` is rendered by server components such as `SiteFooter`, `not-found.tsx` and `about/page.tsx`, so `ssr` is required). Weight `regular`. |
| **States** | An icon has no states; `IconButton` and `Button` own hover and focus. |
| **i18n** | None (icons are `aria-hidden`; the control has the name). |
| **Tests** | vitest `icons.test.tsx`: every `IconName` renders one `svg` with `aria-hidden="true"`; size rounding table; the mapping table above is the test's expectation (import each module path named in the table and assert it resolves); a source scan asserts the files import only from `@phosphor-icons/react/dist/ssr/`. |
| **Acceptance** | Given any page, When it renders, Then every icon is a Phosphor glyph at 16, 20, 24 or 32 and no caller changed. Given `npm ls @phosphor-icons/react`, Then 2.1.10. Given `git grep -nE "lucide\|feather\|material"` in `src`, Then nothing. |
| **Proof commands** | `TL`; `V src/components/ui`; `BUILD bu-02`; open `/en/boards/uno-r3/blink` and look at the toolbar icons (screenshot check, 1.5). `npm audit --omit=dev` shows no new finding. |
| **Rollback** | `git revert` (the package and the old paths return together). |
| **Later tasks need** | Every UI task imports `Icon` from `@/components/ui/icons`. T-BU-56 deletes `ai/icons.tsx` after T-BU-41 moves its users. |

---

### T-BU-03. UI guard script `scripts/ui-check.mjs`

| Field | Content |
|---|---|
| **Identity** | Id T-BU-03. Subsystem tooling. Phase BU. Priority P0. Dependencies none. Group G1. Source files: 2 (`scripts/ui-check.mjs`, `scripts/ui-check.allow.json`). |
| **Problem** | Tailwind cannot forbid an off scale step, an italic, a `z-[100]` or a lucide import, and 110 files carry the old look. Without a check the sweeps drift and later phases (B4 onward) bring the old habits back. B1 added a copy check for docs; nothing checks the UI rules. |
| **Expected behaviour** | `node scripts/ui-check.mjs [paths...]` scans the default set below (or the paths) and prints `file:line CODE text` for every hit, then a count per code, and exits 1 if any. `--json` prints the hits as JSON. Codes (section 1.4): R1 italic (`italic`, `font-style: italic`, `fontStyle`, `font-accent`, `accent-serif`, `Instrument_Serif`, `Instrument Serif`; never the bare word `Instrument`, which is in `Texas Instruments` at `src/content/boards/nano.ts:582`, `src/content/robotics/lm2596.ts:349` and `uno-r3-build.ts:417`); R2 text size (`text-[<digit>`, `font-size:` or `fontSize` with a px or rem number outside `src/styles/`); R3 weight (`font-black`, `font-extrabold`, `font-thin`, `font-light`); R4 spacing (a spacing utility with `1.5 2.5 3.5 5 7 9 11 14 18 22 28` or any `[...]` value, `clamp(` in a spacing utility); R5 radius (`rounded-ink`, `rounded-[`, `rounded-full` on a `<button` / `Button` / `IconButton` line); R6 shadow (`shadow-ink`, `shadow-[`, `--card-shadow`); R7 easing and property (`ease-in`, `ease-out`, `ease-linear`, bare `ease`, `linear` as a timing function, `duration-75`, `duration-100`, `duration-150`, `transition-all`, `transition-[` containing `width`, `height`, `top`, `left`, `inset`; a bare `transition`, `transition-colors`, `transition-opacity` or `transition-transform` is accepted because T-BU-06 sets the theme defaults to 300 ms on the base curve); R8 z-index (`z-` followed by a number or `[`, `z-index:` with a number outside `src/styles/tokens.css`); R9 icons (an import from `lucide`, `feather`, `react-icons`, `@mui`, or a `<svg` outside the allow list); R10 `window.alert`, `window.confirm`, `window.prompt`, and a bare `alert(` or `confirm(` call only when it is not preceded by a quote, a colon or a letter (so the string `javascript:alert(1)` in `src/lib/ai/client.test.ts:63` and `src/lib/server/search/normalize.test.ts:80` is never a hit); R11 `gradient(` outside the allow list (mask fades `mask-image:linear-gradient` are allowed by a pattern, the hero text gradient by allow list); R12 `bg-`, `text-`, `border-`, `ring-`, `fill-`, `stroke-` with `mustard tomato mint cobalt blush` outside the allow list; R13 `font-ui` or `font-mono` on a line with no `tabular` and not on a `<code`, `<pre`, `<kbd`, `<td`, `<th` or console line (a warning code `W13` until T-BU-58, then an error); R14 copy in `src/i18n/messages/en/*.json` values: `!`, ` - ` (a spaced hyphen), the em dash, a hyphenated word made of letters on both sides (`part-by-part`, `hand-inked`; part names with digits such as `ESP32-S3` do not match, and `scripts/ui-check.allow.json` lists the standard terms that pass, such as `Wi-Fi` and `USB-C`), and the filler words (`revolutionize supercharge cutting edge effortless transform your workflow next level harness world class seamless`); R15 a one sided border (`border-s-`/`border-e-`/`border-l-`/`border-r-` with a width digit) on a line that also has `rounded` or `bg-`; R17 `addEventListener("scroll"` or an `onScroll` prop outside the allow list (`ui/Tabs.tsx` and `ui/Popover.tsx`, both passive measures that animate nothing); R16 a hex or `rgb(` colour in `.tsx` or in a CSS file other than `tokens.css`, outside the allow list; and in the dark blocks of `tokens.css` any hex `#xxxxxx` used as a background that is not one of `#000000 #181818 #1F1F1F #272727 #313131 #131209` (the dark surface variables are named `--paper --alt --surface --raised --hover --sunken --console-bg --console-well --code-bg`, and `--plate-bg` is the one allowed exception, by allow list). The default scan is `src/components src/app src/styles src/lib` (`*.{ts,tsx,css}`) plus `src/i18n/messages/en` for R14; it skips `*.test.*`, `src/content/`, `src/i18n/figure*` and generated files, so the content data and the test fixtures never hit. |
| **Existing files** | `scripts/` holds `crawl-routes.mjs`, `gen-content-index.mjs` and (from B0/B1) `secret-scan.mjs`, `copy-check.mjs`, `ci-local.sh`; their style (plain Node ESM, no dependency) is the pattern. `eslint.config.mjs` is not extended (a custom ESLint rule would need a plugin; a script is simpler and runs without a build). |
| **New files** | `scripts/ui-check.mjs`, `scripts/ui-check.allow.json` (array of `{ file, code, pattern, reason }`, first entries: the data colours in `boardlab/WireInPanel.tsx`, `dronelab/WiringPanel.tsx`, `flight/FlightRange.tsx:143-144`, `realtime/identity.ts`, the figure plate tokens in `tokens.css`, the hero gradient file `home/hero.css`, the mask fades in `Tabs.tsx` and `ScrollRow.tsx`, the drawings with inline `<svg` (`Logo.tsx`, `PeerAvatar.tsx`, `PresenceCursors.tsx`, `home/` art)). Each entry needs a non empty `reason`; the script fails on an entry without one. |
| **Design values** | The rule list above is the contract; values in section 1.2 are the source. |
| **States** | CLI: `0` clean, `1` hits, `2` bad usage or a malformed allow list. Output is stable (sorted by file then line). |
| **i18n** | None (the script is English; it checks English message values only, because the six languages share the keys and a hyphen rule means little in Chinese). |
| **Tests** | vitest `scripts/ui-check.test.mjs`: one fixture string per code that must hit and one near miss that must not (for example `gap-2` passes, `gap-1.5` fails; `mask-image:linear-gradient(...)` passes; `Instrument Serif` in a comment hits R1 but `Texas Instruments` does not; `javascript:alert(1)` does not hit R10 but `window.alert(1)` does; `transition-colors` passes R7 and `transition-all` hits; `font-mono` on a label line hits R13 and passes with `tabular`); the allow list suppresses a hit and a missing `reason` exits 2; `--json` parses. A snapshot run on the real tree records today's count per code in the test as a comment (the baseline the sweeps burn down), but the test asserts only the shape. |
| **Acceptance** | Given the tree at BU start, When `node scripts/ui-check.mjs` runs, Then it exits 1 and prints about 480 hits (R4 163 plus clamp, R5 about 60, R6 about 40, R7 about 60, R12 about 70, R2 about 40 and so on, ESTIMATED from the section 0.2 counts). Given one file fixed, Then its lines disappear. |
| **Proof commands** | `TL`; `V scripts/ui-check.test.mjs`; `node scripts/ui-check.mjs src/components/ui/Button.tsx` prints the Button hits (R5 R6 R7 R12) and exits 1. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Every sweep runs `UIC` on its files. T-BU-58 wires the whole run into `npm run check`, `scripts/ci-local.sh` and CI. |

---

### T-BU-04. Colour, surface, shadow and z-index tokens

| Field | Content |
|---|---|
| **Identity** | Id T-BU-04. Subsystem styles. Phase BU. Priority P0. Dependencies T-BU-01. Group G2. Source files: 1 (`src/styles/tokens.css`). |
| **Problem** | Tokens are the hand inked set (section 0.2 items 9 to 12): dark surfaces `#1b1813 #26221b #14120e #17211e` are outside the allowed list; five palette tones drive chrome; the accent is 83 percent saturated; shadows are hard offsets; there is no z scale; grain sits on the header and in dark mode. |
| **Expected behaviour** | `tokens.css` carries the new token set (below) in the existing three places (`:root`, the dark media query, `[data-theme="dark"]`), so the theme boot script (`lib/settings/theme.tsx`) and `SettingsSync` keep working untouched. The old names keep resolving so unswept files already look right: `--line` now equals `--rule`; `--card-line` equals `--rule`; `--card-shadow` is `none`; `--shadow-c` equals the new `--shadow-rgb` colour; `--radius-ink` and `--radius-ink-sm` become Tailwind steps (T-BU-07 owns the class side); `shadow-ink`, `shadow-ink-sm`, `shadow-ink-lg` utilities now point at `shadow-sm`, `shadow-md`, `shadow-lg` values; `--halo` is removed from `:focus-visible` by T-BU-07. Mustard, tomato, mint, cobalt, blush tokens stay (figures read them, `@theme static`). `@theme inline` gains `--color-raised --color-hover --color-alt --color-accent --color-accent-hover --color-accent-ink --color-on-accent --color-focus`, each pointing at the var of the same name; `--color-line` and `--color-on-color` stay as aliases until T-BU-56. Today `@theme inline` (`globals.css:95-132`) has none of the eight, and Tailwind v4 emits nothing and raises no error for an unknown utility, so about 20 cards that use `bg-raised`, `bg-hover`, `bg-accent`, `bg-alt`, `text-on-accent` and `text-accent-ink` would render unstyled. The console tokens (`--console-ink --console-muted --console-accent --console-warn --console-err`, which T-BU-22 and 32 use) are set to the neutral values of section 1.2, the same in both themes; the green tinted values (`#1d2a26`, `#14201c`, `#17211e`) go. |
| **Existing files** | `src/styles/tokens.css` (from T-BU-01): light `:root, .ink-plate` block (old `globals.css:134-169`), `:root` block (`:171-196`), dark media (`:218-254`) and attribute (`:255-292`) blocks, `@theme inline` (`:95-132`). |
| **New files** | `src/styles/tokens.test.ts`. |
| **Design values** | Section 1.2 Colour table, verbatim. Shadows: `--shadow-rgb` `35 30 22` light, `19 18 9` dark; `@theme inline { --shadow-sm: 0 1px 2px rgb(var(--shadow-rgb) / var(--shadow-a1)); --shadow-md: 0 4px 12px rgb(var(--shadow-rgb) / var(--shadow-a2)); --shadow-lg: 0 12px 32px rgb(var(--shadow-rgb) / var(--shadow-a3)); }` with `--shadow-a1/a2/a3` set to `0.08 0.12 0.18` in `:root` and `0.5 0.6 0.7` in both dark blocks, so the alphas are read by the shadows and dark shadows really change. z scale: `--z-sticky: 10; --z-header: 30; --z-dock: 40; --z-overlay: 50; --z-popover: 60; --z-tooltip: 70; --z-skip: 80;` and `@utility z-sticky { z-index: var(--z-sticky); }` for each. Hero gradient tokens `--hero-from`, `--hero-to` (light `#000000`, `#666666`; dark `#FFFFFF`, `#9B9B9B`). `--scrim: rgb(19 18 9 / 0.55)`. State fills: light `color-mix(in oklab, var(--good) 12%, var(--surface))` for `--good-bg`, `--bad-bg`, `--warn-bg`, `--info-bg`; dark `#272727` for all four. `--console-bg: #181818`, `--console-well: #000000`, `--console-ink: #e8e8e8`, `--console-muted: #a3a3a3`, `--console-accent: #8af0ae`, `--console-warn: #f4b829`, `--console-err: #ff8a7a`, all the same in both themes. `--code-bg`/`--code-line` per the table (`#000000`, `#1F1F1F` dark). `--grain` only in light and with the existing alpha; in dark it is `none`. `--header-h` becomes 64px (T-BU-07 reads it). The accent contrast `#231e16` on `#e4694e` is 5.1 to 1 (relative luminance 0.271 vs 0.013); the test computes it and asserts at least 4.5, and does the same for `--on-accent` in dark, for `--on-accent` on `--accent-hover` in both themes (4.64 to 1 light with `#dc6248`, 6.82 to 1 dark; the earlier `#d95f45` was 4.47 and failed) and for `--muted` on `--paper`, `--surface`, `--sunken` in both themes. |
| **States** | Hover and press fills exist as tokens: `--hover` and `--accent-hover`. Focus ring token `--focus`. Disabled is opacity 0.5 (a class, not a token). |
| **i18n** | None. |
| **Tests** | vitest `tokens.test.ts` (node env): parse the dark blocks; every `--paper --alt --surface --raised --hover --sunken --console-bg --console-well --code-bg` value is in the allowed set (the plate is excluded by name); all contrast pairs at least 4.5 (text) or 3 (the focus ring against `--paper` and `--surface`); `--accent` HSL saturation under 80 percent (convert hex to HSL in the test); `--shadow-sm/md/lg` read `--shadow-a1/a2/a3` and the light and dark values of those are `.08 .12 .18` and `.5 .6 .7`; every semantic name of section 1.2 has a `--color-<name>` entry in `@theme inline` pointing at its var (`--color-console` points at `--console-bg`); each `--console-*` text token is at least 4.5 to 1 on `--console-bg` and `--console-well`; a control fill token (`--accent`) that is under 3 to 1 on `--surface` or `--sunken` appears in the test's `OUTLINED` list, whose members (Toggle, Meter) have their border asserted in their own tests (T-BU-09, T-BU-14); each of `--z-*` is unique and ascending. Playwright is run by the later tasks. |
| **Acceptance** | Given dark mode, When any page is open, Then the page is `#131209` and panels `#1F1F1F` with no green or navy tint. Given the accent, Then HSL saturation is 74 percent. Given a page with a `shadow-ink` card, Then the shadow is soft and tinted, not a hard offset. |
| **Proof commands** | `TL`; `V src/styles`; `UIC src/styles/tokens.css` (R16 on the dark block); `BUILD bu-04`; screenshots of `/en`, `/en/boards/uno-r3/blink`, `/en/robotics` in light and dark (1.5). |
| **Rollback** | `git revert`. |
| **Later tasks need** | Every component task uses these names. T-BU-56 removes the compatibility names. |

---

### T-BU-05. Type tokens; fonts (drop Instrument Serif and italics)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-05. Subsystem styles, fonts. Phase BU. Priority P0. Dependencies T-BU-01. Group G2. Source files: 3 (`src/styles/type.css`, `src/app/[lang]/layout.tsx`, `src/components/boardlab/CodeEditor.tsx`). |
| **Problem** | Instrument Serif is loaded with an italic style (`layout.tsx:2,15,18`) for one accent word per headline (`.accent-serif` `globals.css:471-478`, `mk-accent` `marketing.css:36-47`). Base headings use `clamp()` sizes (`globals.css:344-347`). The kicker and field label are mono capitals (`:404-420`). Code comments are italic (`:572`, `CodeEditor.tsx:48`) and the editor font size is `14px` (`CodeEditor.tsx:60`). |
| **Expected behaviour** | `layout.tsx` loads `Geist`, `Geist_Mono`, `Noto_Sans_Devanagari` only, each with `display: "swap"`; `--font-display` is gone. `type.css`: headings use `text-balance` and the scale: `h1` `text-4xl md:text-5xl` with `tracking-tight`, `h2` `text-2xl md:text-3xl`, `h3` `text-lg`, `h4` `text-base`; weight 600; paragraphs `text-pretty`; `body` `text-base`; `.tabular` kept; new utility `kicker` (`text-xs font-semibold text-muted`, no caps, no tracking) and `field-label` (same); new utility `lang-air` (`:lang(hi)` and `:lang(zh-Hans)` get `line-height: 1.3; letter-spacing: 0`) that display headings carry; `ink-kicker` and `ink-label` stay as aliases of them (removed in T-BU-56); `.shell-meta` becomes the same as `kicker`; `.accent-serif` and `--font-accent`, `--font-display`, `--font-head` (alias of sans, `font-head` classes keep working until T-BU-56) lose the serif and italic; `.tok-cm` loses `font-style: italic`. Hindi and Chinese keep their font stacks (`type.css` from `globals.css:293-317`) and get the display line height rule (question 14). `CodeEditor.tsx`: the comment highlight drops `fontStyle: "italic"` and `fontSize` reads `var(--text-sm)` (Tailwind v4 exposes the scale as `--text-*` variables). |
| **Existing files** | `src/app/[lang]/layout.tsx:2,15-19`; `src/styles/type.css`; `src/components/boardlab/CodeEditor.tsx:48,60`; `src/components/marketing/marketing.css:12-58` (not touched here; T-BU-26 owns it and deletes it). |
| **New files** | `src/styles/type.test.ts`. |
| **Design values** | Section 1.2 Type. Mono face for `code, kbd, samp, pre` only. `text-rendering: optimizeLegibility` kept. Display line height for `hi` and `zh-Hans` headings 1.3. No `font-style: italic` in any CSS file. |
| **States** | Not applicable (type). Selection colour: `::selection` uses `--accent` at 30 percent and `--ink` text (the old one used `--color-mustard-l`). |
| **i18n** | The two `*word*` star markers in `shell.json:50` and `:125` are removed by T-BU-31 (new `home` namespace) and T-BU-52; this task does not edit messages. The `Accent` parser in `marketing/index.tsx` still strips stars until T-BU-26 moves it into `editorial/Editorial.tsx`, where T-BU-51 deletes it. |
| **Tests** | vitest `type.test.ts`: `type.css` contains no `italic`, no `Instrument`, no `font-accent`; `layout.tsx` source imports exactly the three fonts (string check on the file) and not `Instrument_Serif`; CodeEditor source has no `italic`. Playwright is run by the sweeps. |
| **Acceptance** | Given any page, When the network log is read, Then no Instrument Serif file is requested (the build's `static/media` has no `Instrument` font). Given the home hero, Then the headline is one face, no italic word (the star markers show as plain text until T-BU-31/43 land; the builder confirms the page does not print a `*`: `Accent` still removes them). Given `/hi`, Then the Devanagari face renders and headings keep line height 1.3. |
| **Proof commands** | `TL`; `V src/styles src/components/boardlab`; `UIC src/styles/type.css "src/app/[lang]/layout.tsx" src/components/boardlab/CodeEditor.tsx`; `BUILD bu-05`; screenshots `/en` and `/hi` (1.5). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-08 onward use `kicker`, `field-label`, `text-balance`. |

---

### T-BU-06. Motion tokens and reduced motion

| Field | Content |
|---|---|
| **Identity** | Id T-BU-06. Subsystem styles. Phase BU. Priority P0. Dependencies T-BU-01. Group G2. Source files: 1 (`src/styles/motion.css`). |
| **Problem** | Five different easings and durations (`globals.css:70-74`, `marketing.css:61`); `ease-out` on 11 lines and 150, 100, 75 ms durations; reduced motion sets every animation to 0.01 ms (`globals.css:585-600`), which removes fades too instead of swapping movement for a fade. |
| **Expected behaviour** | `motion.css` defines: `--ease-iynk: cubic-bezier(0.22, 1, 0.36, 1)` (utility `ease-iynk`); keyframes `fade-in`, `rise-in` (translate `var(--travel, 24px)` and opacity), `slide-in-end`, `slide-in-start`, `slide-in-bottom` (translate 100%), `scale-in`; `--animate-fade-in` 300 ms, `--animate-rise-in` 500 ms, `--animate-slide-*` 500 ms, all with `var(--ease-iynk)`; utility `stagger-in` (`animation: rise-in 500ms var(--ease-iynk) both; animation-delay: min(calc(var(--i, 0) * 60ms), 360ms)`, so a list sets `--i` per item and the last link starts at or before 360 ms), utilities `motion-move` (`transition-property: transform, translate, scale, opacity; transition-duration: 500ms`), `motion-fade` (`color, background-color, border-color, text-decoration-color, opacity; 300ms`), `motion-press` (`transform; 200ms`), each with the curve. The legacy names `animate-ink-pop`, `animate-ink-fade`, `animate-ink-rise`, `animate-ink-from-start`, `animate-ink-from-end` stay as aliases pointing at the new animations (so 9 files keep working; removed in T-BU-56). Reduced motion (media query and `data-reduce-motion="true"`): `--travel: 0px`, `--dur-reveal` stays but only opacity changes, `motion-move` and `motion-press` lose `transform` from `transition-property`, `scroll-behavior: auto`; the blanket 0.01 ms rule and its four `!important`s are deleted. `motion.css` also sets `@theme { --default-transition-duration: 300ms; --default-transition-timing-function: var(--ease-iynk); }`, so a bare `transition`, `transition-colors`, `transition-opacity` or `transition-transform` (20 lines today, for example `not-found.tsx:48` and `about/page.tsx:105`) runs at 300 ms on the base curve instead of Tailwind's 150 ms and its own easing (it uses the variable, not a second `cubic-bezier(`, so the one-curve test below holds). |
| **Existing files** | `src/styles/motion.css` (from T-BU-01): `--animate-*` and keyframes (old `globals.css:70-93`), reduced motion (`:585-600`). Users of the old names (`grep -rn "animate-ink"`): 18 lines in 9 files, among them `ui/Dialog.tsx:35,50`, `ui/Sheet.tsx:23-25,41`, `ui/Popover.tsx`, `dock/LabDock.tsx:281`. |
| **New files** | `src/styles/motion.test.ts`. |
| **Design values** | Section 1.2 Motion. Reveal: 32 px rise, 700 ms (`--dur-reveal`), base curve. Nav link entrance: 24 px, 500 ms, delay set per item inline as `--i` times 60 ms, capped at 360 ms (T-BU-24 uses it). Press 200 ms is the floor. Never `transition-all`. |
| **States** | Reduced motion is the state: the same elements fade in 300 ms and do not move. |
| **i18n** | None. |
| **Tests** | vitest `motion.test.ts`: only one `cubic-bezier(` appears in the file and it is the base curve; no duration under 200 ms except the 0.01 ms-free reduced block (none left); the reduced block sets `--travel: 0px`; no `!important`; the file sets `--default-transition-duration` to 300ms and `--default-transition-timing-function` to `var(--ease-iynk)`. Playwright proof is T-BU-51's reduced motion spec. |
| **Acceptance** | Given a user with reduced motion, When a dialog opens, Then it fades in and does not move. Given the Settings popover, Then it opens with a 300 ms fade on the base curve. |
| **Proof commands** | `TL`; `V src/styles`; `UIC src/styles/motion.css`; `BUILD bu-06`; open Settings and a dialog in the browser with `page.emulateMedia({ reducedMotion: "reduce" })` and read `getComputedStyle(el).transform` (identity). |
| **Rollback** | `git revert`. |
| **Later tasks need** | `motion-move`, `motion-fade`, `motion-press`, `ease-iynk`, `--travel`. |

---

### T-BU-07. Radius, spacing, frame and surface classes (aliases)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-07. Subsystem styles. Phase BU. Priority P0. Dependencies T-BU-01. Group G2. Source files: 1 (`src/styles/layout.css`). |
| **Problem** | `.ink-card` (hand cut radius, 2 px ink border, offset shadow), `.ink-plate`, `.ink-field` (a 999 px pill with a gradient drawn arrow) and the frames use the old values; 40 files use `rounded-ink` and 17 use `ink-card`. The header is 58 px and welded. The focus ring has a 7 px halo. |
| **Expected behaviour** | `layout.css` keeps the old class names but renders the new look, so unswept screens already match: `.ink-card` is `bg-surface`, 1 px `--rule` border, `rounded-2xl`, no shadow; `.ink-plate` is the figure paper, 1 px `--plate-frame` border, `rounded-xl`, no shadow, no grain (the same rules are also published as `.plate`, and `.ink-prose` as `.prose`, so files can move to the new names before the old ones are deleted in T-BU-56); `.ink-field` is `min-height: 44px`, `rounded-lg`, 1 px `--rule` border, `--sunken` fill, `text-base`, padding 8 px by 12 px (right padding 40 px for a select), no gradient (the select arrow is drawn by the component, T-BU-09); `--radius-ink` is `var(--radius-xl)` and `--radius-ink-sm` is `var(--radius-lg)`. `:focus-visible` is `outline: 2px solid var(--focus); outline-offset: 2px;` with radius inherited; no halo. `--header-h: 64px`; `.ws`, `.ws-stage`, `.ws-rail`, `.ws-below` gaps and paddings snap to 8, 12, 16, 24, 32, 48 (for example `0.75rem` stays, `0.5rem 1rem` stays, `padding: 2rem var(--frame-pad) 3rem` becomes 32 and 48); `.ws-sticky-tabs` and the sticky stage take `z-index: var(--z-sticky)`; the sticky stage loses `background-image: var(--grain)`. `.ink-prose` measure 65ch; `.ink-prose` list and code spacing snap (0.9em, 1.6em, 1.3em stay as relative prose rhythm, which is not spacing between components; the card says so, and the guard does not read CSS `em` values). |
| **Existing files** | `src/styles/layout.css` (old `globals.css:362-374` base interactions, `:379-402` card and plate, `:422-441` field with the gradient arrow at `:436`, `:443-452` footer and shell frame, `:480-540` frame and workspace grid, `:542-565` prose, `:602-604` print); `--header-h` consumers `LabDock.tsx:281`, `globals.css` itself. |
| **New files** | `src/styles/layout.test.ts`. |
| **Design values** | Section 1.2 Radius, Spacing, Borders. `--shell-pad` and `--frame-pad`: `clamp(16px, 4vw, 56px)` becomes `16px`, `24px` from `sm`, `40px` from `lg`, `48px` from `xl` (set in media queries; one source). `--frame-max` 80rem and 90rem from 105rem stay (a width, not spacing). |
| **States** | Focus: 2 px ring with 2 px offset in `--focus` (contrast at least 3 to 1 on `--paper` and `--surface`, asserted by T-BU-04's test). Hover and press come from components. |
| **i18n** | None. |
| **Tests** | vitest `layout.test.ts`: no `linear-gradient`, no `box-shadow` with a pixel offset pair other than the three tokens, no `border-radius` with a slash, `--header-h` is 64px, `.ink-field` has no `background-image`. Playwright: the existing workspace specs (`E bu-07 e2e/boardlab.spec.ts e2e/robotics.spec.ts e2e/dronelab.spec.ts e2e/dock.spec.ts`) still pass, because the grid is unchanged apart from 6 px. |
| **Acceptance** | Given a lab page at 1440x900, When it loads, Then the workspace fills the viewport below a 64 px header area and no element is cut. Given a select field, Then it is an 8 px radius box, not a pill. Given Tab, Then a 2 px ring shows with no halo. |
| **Proof commands** | `TL`; `V src/styles`; `UIC src/styles/layout.css`; `BUILD bu-07`; `E bu-07 e2e/boardlab.spec.ts e2e/robotics.spec.ts e2e/dronelab.spec.ts e2e/dock.spec.ts e2e/shell.spec.ts`; screenshots of one lab page at both sizes in both themes (1.5). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-16 adds the dock push rule to this file; T-BU-56 deletes `.ink-*`. |

---

### T-BU-08. Button, IconButton, Tooltip

| Field | Content |
|---|---|
| **Identity** | Id T-BU-08. Subsystem ui. Phase BU. Priority P0. Dependencies T-BU-02, 04, 05, 06, 07. Group G3. Source files: 3 (`ui/Button.tsx`, `ui/IconButton.tsx`, `ui/Tooltip.tsx`). |
| **Problem** | `Button` is a pill with a 2 px ink border, a mustard raised variant that presses into a hard shadow and `duration-100` (`Button.tsx:9-27`: base `rounded-full border-2` at `:11`, raised variant at `:13-14`); `IconButton` is a `rounded-full` bordered circle (`IconButton.tsx:46-72`); the tooltip is an ink bubble with a hard shadow, `z-40` and `px-2.5 gap-1.5` (`Tooltip.tsx:91`). 143 uses of `Button` in 51 files. Variants in use: ghost 35, primary 31, secondary 30, danger 4, ink 1; `size="lg"` in 2 files. |
| **Expected behaviour** | Same props (`variant`, `size`, `className`, `type`, everything a `<button>` takes; `ButtonLink` for navigation; `buttonClass()` stays exported for links). New variant `solid` (ink fill) and new prop `busy`. Variants: `primary` accent fill with `--on-accent` text; `secondary` `--sunken` fill with `--ink` text; `ghost` transparent; `danger` `--bad-bg` fill with `--bad` text; `solid` `--ink` fill with `--paper` text. `ink` and `lg` stay as deprecated aliases of `solid` and `md` (typed `@deprecated`), removed in T-BU-56 after T-BU-23, 41 and 45 migrate their three call sites (`PartnerPanel.tsx:254`, `WireInPanel.tsx`, `Lobby.tsx`). Sizes: `md` is `text-base font-semibold py-2 px-3` (about 40 px high), `sm` is `text-sm font-semibold py-2 px-3` (36 px); under `pointer: coarse` both get `min-h-11`. Radius `rounded-lg`. No border (the fill carries the shape); `secondary` and `ghost` use a 1 px `--rule` border only when `outline` is true (new optional prop used by toolbars). `IconButton`: `size-10` (`md`) and `size-8` (`sm`), coarse `size-11`, `rounded-lg`, icon 20 (sm 16), `variant` `plain` or `solid`, tooltip unchanged in behaviour. Tooltip bubble: `bg-ink text-paper rounded-md px-2 py-1 text-xs font-semibold shadow-md z-tooltip`, no border. |
| **Existing files** | `ui/Button.tsx:9-27` (base, raised, variants, sizes), `:29-47`; `ui/IconButton.tsx:46-72`; `ui/Tooltip.tsx:30-80` (`useTip`, placement logic stays), `:84-97` (bubble). Users: `buttonClass` imports (grep `buttonClass`), `Button` in 51 files. |
| **New files** | `ui/Button.test.tsx`. |
| **Design values** | Hover: `primary` to `--accent-hover`, `secondary` and `ghost` to `--hover`, `solid` to 88 percent ink over paper (`bg-ink/88`), all `motion-fade`. Active: `active:scale-98 motion-press` (transform only). Focus: global ring (T-BU-07). Disabled: `opacity-50 cursor-not-allowed`, no hover, no press, still readable; `aria-disabled` looks the same. `busy`: sets `aria-busy` and `disabled`, keeps the label, and the fill breathes with Tailwind's `animate-pulse` (opacity only) and `motion-reduce:animate-none`, so there is never a spinner. Icon inside a button: 20 px, `gap-2`. |
| **States** | default, hover, active, focus-visible, disabled, busy (all six rendered in the unit test by class and attribute). |
| **i18n** | None (labels are passed). |
| **Tests** | vitest `Button.test.tsx`: each variant has its class set; `sm` text size is `text-sm`, `md` is `text-base`, both have `py-2 px-3`; `busy` sets `aria-busy` and `disabled` and renders the children; `ButtonLink` renders an anchor with the same classes; `lg` and `ink` still render (alias). `Tooltip.test.tsx` (existing) keeps passing: the bubble text, `role="tooltip"`, hidden until hover or focus, Escape hides. Playwright is covered by the existing specs that click buttons (`E bu-08 e2e/boardlab.spec.ts e2e/shell.spec.ts`). |
| **Acceptance** | Given a primary button, When I hover, press and tab to it, Then the fill darkens within 300 ms, it scales to 98 percent for 200 ms, and a 2 px ring shows. Given `variant="primary"` in dark mode, Then the text is `#131209` on `#e4694e`. Given `UIC` on the three files, Then 0 hits. |
| **Proof commands** | `TL`; `V src/components/ui/Button.test.tsx src/components/ui/Tooltip.test.tsx`; `UIC src/components/ui/Button.tsx src/components/ui/IconButton.tsx src/components/ui/Tooltip.tsx`; `E bu-08 e2e/shell.spec.ts e2e/boardlab.spec.ts`; screenshot of the lesson page toolbar in both themes (1.5). |
| **Rollback** | `git revert`. |
| **Later tasks need** | Every sweep replaces raw `<button>` with these. |

---

### T-BU-09. Field (TextInput, Select, TextArea, inline error), Toggle, SegmentedControl

| Field | Content |
|---|---|
| **Identity** | Id T-BU-09. Subsystem ui. Phase BU. Priority P0. Dependencies T-BU-02, 04, 05, 06, 07. Group G3. Source files: 3 (`ui/Field.tsx`, `ui/Toggle.tsx`, `ui/SegmentedControl.tsx`). |
| **Problem** | `Field.tsx` has `Select` and `TextInput` only, both the `ink-field` pill; there is no text area and no field level error, so 51 lines show errors as loose `role="alert"` text; 5 raw `<textarea>`, 11 raw `<select>` and 23 raw `<input>` lines bypass the kit. `Toggle` animates `inset-inline-start` and uses mint and ink borders (`Toggle.tsx:30-55`). `SegmentedControl` uses `px-2.5` style off scale spacing (3 hits) and pills. |
| **Expected behaviour** | `TextInput`, `Select`, new `TextArea` share one wrapper: label (`field-label`), control, optional `hint`, optional `error`. Props added: `error?: string`, `hint?: string`. With `error` the control gets `aria-invalid="true"` and `aria-describedby` pointing at a message `<p id role="alert">` with a Phosphor `WarningCircle` (`Icon name="warn-circle"`, 16; `warn` is the triangle `Warning`) and the text in `--bad`, below the control; the control border turns `--bad`. `hint` is the same slot in `--muted` with no role. `Select` is `appearance-none` inside a `relative` wrapper with a `CaretDown` icon (`chevron-down`, 16) positioned at the end (`pointer-events-none`), so the gradient arrow in CSS is not needed. Exports `FieldMessage` for custom controls. Control look: `min-h-11`, `rounded-lg`, 1 px `--rule` border, `--sunken` fill, `text-base`, `px-3 py-2`, hover border `--muted`, focus ring global. `Toggle` keeps `role="switch"` and its label/description; track `h-6 w-10` `rounded-full` with the thumb moving by `translate-x-4` (`motion-move`), `--sunken` off and `--accent` on, thumb `--paper`; the track has a 1 px `--muted` border (`border border-muted`) because `--accent` alone is 2.84 to 1 on `--paper` and 2.57 on `--sunken`, under the 3 to 1 of WCAG 1.4.11. `SegmentedControl` keeps `role="radiogroup"` and arrow-key behaviour; container `rounded-lg bg-sunken p-0.5`, the chosen segment `bg-surface shadow-sm rounded-md`, labels `text-sm font-semibold`. |
| **Existing files** | `ui/Field.tsx:11-42`; `ui/Toggle.tsx:17-57` (`:45` track, `:50` thumb with `transition-[inset-inline-start]`); `ui/SegmentedControl.tsx:66-97`; `shell.spec.ts:40` reads `[role="radiogroup"]` and measures pills (`cutThemeOptions`) so the structure (a radiogroup with `button role=radio` children each holding a `span` label) must stay. |
| **New files** | `ui/Field.test.tsx`, `ui/Toggle.test.tsx`. |
| **Design values** | Section 1.2 Spacing (field padding 8 and 12), Radius (`rounded-lg` control, `rounded-md` inner segment), Motion (`motion-move` on the thumb, `motion-fade` on colours). Error text `text-sm`, 4 px above the control's bottom edge (`mt-1`). |
| **States** | default, hover, focus, disabled (`opacity-50`, `cursor-not-allowed`, `--sunken` fill), invalid (border and message), read only (no border change, `text-muted`). Toggle: off, on, focus, disabled. Segmented: each option default, hover, selected, focus. |
| **i18n** | None in these files; callers pass `error` strings already translated. |
| **Tests** | vitest `Field.test.tsx`: label wires `htmlFor`; `error` sets `aria-invalid`, `aria-describedby` equals the message id, the message has `role="alert"` and the `warn-circle` icon (not `warn`); `hint` has no role; `Select` renders the caret and no `background-image`; `TextArea` forwards `rows`. `Toggle.test.tsx`: click toggles, Space toggles, `aria-checked` follows, disabled blocks, the thumb class changes, the track carries `border-muted`. `SegmentedControl.test.tsx` (existing) keeps passing. axe on a rendered field with an error: no serious findings (`@axe-core/playwright` is for e2e; in jsdom use the text assertions only; the e2e axe pass is T-BU-57). |
| **Acceptance** | Given a `TextInput` with `error="Enter a name"`, When rendered, Then the message shows under the field in red with an icon and a screen reader reads it with the field. Given the theme control in Settings, Then it is still a radiogroup, 3 options. |
| **Proof commands** | `TL`; `V src/components/ui`; `UIC src/components/ui/Field.tsx src/components/ui/Toggle.tsx src/components/ui/SegmentedControl.tsx`; `E bu-09 e2e/shell.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | W9 sweeps use `TextInput`, `Select`, `TextArea` with `error`. |

---

### T-BU-10. Tabs, Panel, Chip, Callout re-skinned; Card removed

| Field | Content |
|---|---|
| **Identity** | Id T-BU-10. Subsystem ui. Phase BU. Priority P0. Dependencies T-BU-02, 04, 05, 06, 07. Group G3. Source files: 5 (`ui/Tabs.tsx`, `ui/Panel.tsx`, `ui/Chip.tsx`, `ui/Callout.tsx`, `ui/index.ts`); deletes `ui/Card.tsx`. |
| **Problem** | `Callout` draws a one sided `border-s-4` bar in a palette colour on a bordered, shadowed box (`Callout.tsx:50-58`; 71 uses in 33 files). `Chip` has seven palette tones with `border-[1.5px] border-line` (`Chip.tsx:5-33`; 29 uses, tones `mint` 5, `cobalt` 4, `ink` 3, `tomato` 2, `mustard` 2, `plain` 1). `Tabs` underlines with `shadow-[inset_0_-2.5px_0_var(--ink)]` and has `px-2 pt-1` strip padding (`Tabs.tsx:103,127`). `Panel` is `ink-card` (`Panel.tsx:29`). `Card` has no importer except the barrel (`ui/index.ts:3`). |
| **Expected behaviour** | `Callout` keeps `tone`, `variant`, `title`, `children`, `live`, `className`. Box variant: `rounded-lg`, `--state-bg` fill, no border, no shadow, the tone icon (Phosphor, 20) in the state colour, title `text-sm font-semibold`, body `text-sm`; tones `note` to info, `tip` and `success` to good, `warn` to warn, `danger` to bad. Quiet variant unchanged in structure, icon 16. `Chip` keeps `dot`. The `tone` union becomes `neutral \| ink \| good \| bad \| warn \| info` plus the legacy `plain \| tomato \| mustard \| mint \| cobalt \| blush` typed `@deprecated`, because the sweeps (T-BU-20, 21 and others) pass `good`, `bad` and `neutral` and `tsc` must accept them. The legacy tones `plain ink tomato mustard mint cobalt blush` stay accepted and map to `neutral` (`--sunken`), `ink` (`--ink` on `--paper`), `bad`, `warn`, `good`, `info`, `neutral` fills, so 22 files need no edit; `rounded-md px-2 py-1 text-xs font-semibold`, no border, `font-ui` only when the child is a number or pin name (`mono` prop, default false; the 5 current mono users are swept). `Tabs`: underline is an `after:` element `h-0.5 bg-ink scale-x-0 aria-selected:scale-x-100 origin-center motion-move` (transform only); tab buttons `text-sm font-semibold`, `px-3 py-2`, `rounded-lg`, hover `--hover`; the strip fade masks stay; roles, roving tabindex and the key handling stay. `Panel`: `bg-surface`, 1 px `--rule` border, `rounded-2xl`, header row `min-h-12`, title `text-base font-semibold` (not `font-head text-lg`), the `overflow-clip` rule stays. `index.ts` loses the `Card` export; `Card.tsx` is deleted after `grep` proves no importer (`grep -rn "ui/Card\|Card }" src` finds only the barrel). |
| **Existing files** | `ui/Callout.tsx:5-63`; `ui/Chip.tsx`; `ui/Tabs.tsx:84-160`; `ui/Panel.tsx:24-43`; `ui/Card.tsx`; `ui/index.ts:3`. Callers that pass `tone="mint"` etc. to `Chip`: found by `grep -rn "<Chip" src` (22 files, left unchanged). |
| **New files** | `ui/Callout.test.tsx`. |
| **Design values** | Section 1.2 (state tokens, radius, spacing). Nested radius: a `Callout` inside a `Panel` with 16 px padding keeps `rounded-lg`; a `Chip` inside a `Callout` with 12 px padding is `rounded-sm` only if the chip sits on the callout edge (not the case), so `rounded-md`. |
| **States** | Tabs: default, hover, selected, focus, disabled. Callout: static; `live` announces. Chip: static. Panel: static. |
| **i18n** | None. |
| **Tests** | vitest `Callout.test.tsx` (each tone icon and colour class, `role` note or status, quiet variant has no box); `Tabs.test.tsx` (existing) keeps passing (roles, arrows, Home/End); a new case asserts the selected tab has `aria-selected` and the underline element exists. A `Chip` describe block in the same file asserts the legacy tones (`mint`, `cobalt`, `tomato`, `mustard`, `blush`, `ink`, `plain`) map to the neutral and state fills above, and that every new tone (`neutral`, `ink`, `good`, `bad`, `warn`, `info`) is accepted and renders its fill. |
| **Acceptance** | Given a `Callout tone="warn"`, When rendered, Then no side bar and no border show; the amber icon and tinted fill carry the tone and the title carries the word. Given `UIC` on the four files and `git grep -n "ui/Card"` in `src`, Then 0 hits. |
| **Proof commands** | `TL`; `V src/components/ui`; `UIC src/components/ui/Tabs.tsx src/components/ui/Panel.tsx src/components/ui/Chip.tsx src/components/ui/Callout.tsx`; `E bu-10 e2e/boardlab.spec.ts e2e/robotics.spec.ts e2e/dronelab.spec.ts`; screenshots of a lesson (callouts, tabs, chips) in both themes. |
| **Rollback** | `git revert` (restores `Card.tsx` and the barrel line). |
| **Later tasks need** | T-BU-16 and the sweeps rely on `Panel`, `Tabs`, `Callout`. |

---

### T-BU-11. Skeleton, PageSkeleton, EmptyState, InlineStatus, Reveal

| Field | Content |
|---|---|
| **Identity** | Id T-BU-11. Subsystem ui. Phase BU. Priority P0. Dependencies T-BU-02, 04, 05, 06, 07. Group G3. Source files: 5 (`ui/Skeleton.tsx`, `ui/EmptyState.tsx`, `ui/InlineStatus.tsx`, `ui/Reveal.tsx`, `src/i18n/messages/*/common.json` as one set). |
| **Problem** | 11 route level `Suspense` fallbacks (after B0) are empty boxes (`page.tsx:38` and 10 more); three panels hand write their own pulsing blocks (`search/shared.tsx:47-52`, `TogetherPanel.tsx:122`, `PartnerPanel.tsx:35`); an empty list is a bare `<p>` or the one line `Note` (`Editorial.tsx:123-133`); there is no status line component; nothing reveals on scroll. |
| **Expected behaviour** | `Skeleton({ className })`: a `div` with `--hover` fill, `rounded-md`, `animate-pulse` (opacity only) with `motion-reduce:animate-none`, `aria-hidden="true"`. `SkeletonGroup({ label, children, className })`: `div role="status" aria-busy="true"` with a visually hidden `label` (so screen readers hear "Loading" once; the children are decorative). `PageSkeleton({ kind })` in `Skeleton.tsx` (the file is `"use client"` so `PageSkeleton` reads its "Loading" text with `useCommonT`, because a Suspense fallback cannot await `params`): `kind="list"` (a head: 40 px title block, 2 lines, then a grid of 6 cards), `"workspace"` (a top bar block, a stage block and a rail block matching the `.ws` grid), `"article"` (title and 8 text lines at 65ch); each uses `min-h-[calc(100dvh-var(--header-h))]` where the real page does. `EmptyState({ icon, title, children, action, className })`: centred column, a Phosphor icon at 32 in `--muted`, title `text-lg font-semibold`, body `text-base text-muted max-w-prose`, an optional action slot, no box (spacing does the work) or `bordered` for a dashed `--rule` 1 px box inside a panel; `role` none. `InlineStatus({ tone, children, live })`: one line, icon 16 plus `text-sm`, tones `info good warn bad`, `role="status"` when `live`, `role="alert"` only when `tone="bad"` and `live`. `Reveal({ children, delay, as })`: client component; wraps in an element that starts at `opacity-0 translate-y-8` and, when it enters the viewport once (`IntersectionObserver`, `rootMargin: "0px 0px -10% 0px"`, `threshold: 0.1`), gets `opacity-100 translate-y-0` with 700 ms on the base curve and then disconnects; when `IntersectionObserver` is missing or reduced motion is on it renders visible at once (opacity only fade under reduced motion, travel 0). Exports `useRevealOnce(ref)` for components that need the flag (T-BU-37). |
| **Existing files** | `search/shared.tsx:47-52` (`PanelSkeleton`, stays and calls `Skeleton` after T-BU-42); `Editorial.tsx:123-133` (`Note`, T-BU-26 keeps it); the fallbacks listed in 0.2 item 18. |
| **New files** | `ui/Skeleton.tsx`, `ui/EmptyState.tsx`, `ui/InlineStatus.tsx`, `ui/Reveal.tsx`, tests `Skeleton.test.tsx`, `EmptyState.test.tsx`, `Reveal.test.tsx`. |
| **Design values** | Pulse 1.2 s opacity 1 to 0.5 to 1 (Tailwind `animate-pulse`). Reveal: 32 px, 700 ms, once. Skeleton shapes copy the real layout's block sizes in the 2/4/8/12/16/24/32 scale. |
| **States** | Skeleton is the loading state. Empty state is the empty state. `InlineStatus` is the success and error state for a quiet confirmation ("Saved to blink.iynk") or an inline failure. |
| **i18n** | Five generic keys in `common.json` under `client.state`, so server pages (`getT(lang, "common")`) and client components (`useCommonT`) read the same ones: `loading` ("Loading"), `empty` ("Nothing here yet"), `error` ("Something went wrong. Try again."), `retry` ("Try again") and `saved` ("Saved", read by the keys dialog in T-BU-18), in six languages (de "Wird geladen", "Noch nichts hier", "Etwas ist schiefgelaufen. Versuche es erneut.", "Erneut versuchen"; es "Cargando", "Todavía no hay nada", "Algo salió mal. Inténtalo de nuevo.", "Reintentar"; fr "Chargement", "Rien ici pour l'instant", "Un problème est survenu. Réessayez.", "Réessayer"; and for `saved`: de "Gespeichert", es "Guardado", fr "Enregistré"; hi, zh by the translating agent). `PageSkeleton` reads `client.state.loading` itself. Sweeps reuse these and add no keys (rule W15). |
| **Tests** | vitest: `Skeleton.test.tsx` (group has `role=status`, `aria-busy`, hidden label text; blocks are `aria-hidden`); `EmptyState.test.tsx` (icon, title, action render; no `role="alert"`); `Reveal.test.tsx` with a stub `IntersectionObserver`: starts hidden, becomes visible on intersect, calls `disconnect`, never hides again, renders visible when the observer is undefined and when `matchMedia("(prefers-reduced-motion: reduce)")` matches. |
| **Acceptance** | Given a slow page, When it streams, Then a skeleton shaped like the page shows and a screen reader hears "Loading" once. Given a section below the fold, When I scroll to it, Then it rises 32 px and fades in once and does not replay when I scroll back. Given reduced motion, Then it fades with no travel. |
| **Proof commands** | `TL`; `V src/components/ui src/i18n`; `UIC src/components/ui/Skeleton.tsx src/components/ui/EmptyState.tsx src/components/ui/InlineStatus.tsx src/components/ui/Reveal.tsx`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-18, 26, 37 to 47 import these. |

---

### T-BU-12. Dialog, Sheet (slide over), Popover, CodeBlock

| Field | Content |
|---|---|
| **Identity** | Id T-BU-12. Subsystem ui. Phase BU. Priority P0. Dependencies T-BU-02, 04, 05, 06, 07. Group G3. Source files: 4 (`ui/Dialog.tsx`, `ui/Sheet.tsx`, `ui/Popover.tsx`, `ui/CodeBlock.tsx`). |
| **Problem** | Overlays use a hard coded scrim `bg-[rgb(20_17_12/0.55)]` (`Dialog.tsx:35`, `Sheet.tsx:41`), `z-50`, the `ink-card` with a 5 px ink shadow, `border-b-[1.5px]` header rules, and animation names from the old set; `Sheet` removes one border by `border-s-0`/`border-e-0` (`Sheet.tsx:23-25`) to sit on an edge; `Popover` is an `ink-card` with `shadow-ink-lg` (`Popover.tsx:91`). `CodeBlock` has an ink header with `border-b-2` and a copy button with `gap-2 px-3.5` (`CodeBlock.tsx:45`). |
| **Expected behaviour** | `Dialog`: scrim `bg-(--scrim)`, `z-overlay`, panel `rounded-2xl bg-raised shadow-lg`, no border, header row with `text-lg font-semibold` title, `IconButton plain` close, content padding 16, 24 from `sm`, footer actions right aligned `gap-2`; opens with `animate-fade-in` for the scrim and `animate-rise-in` (24 px, 500 ms) for the panel; focus trap and Escape unchanged (`useModal`). `Sheet`: the slide over panel: `side` `end`, `start` or `bottom`; panel `bg-raised shadow-lg`, flush to its edge with no radius on that side (`rounded-s-2xl` for an end sheet, `rounded-t-2xl` bottom), `w-[min(24rem,88vw)]`, slides with `animate-slide-in-*` (500 ms), scrim `bg-(--scrim)`; a `modal` prop (default true) and a non modal variant for the dock is T-BU-16's decision (the dock keeps its own `aside`). `Popover`: `bg-raised rounded-2xl shadow-lg p-4`, `popover="auto"` native top layer so no z-index is needed; opens with `animate-fade-in`. `CodeBlock`: `bg-(--code-bg)` `rounded-xl`, 1 px `--rule` border, caption row `min-h-10 px-3` in `kicker` style with a `Copy` icon button (`IconButton sm`), code `font-mono text-sm`. |
| **Existing files** | `ui/Dialog.tsx:30-69`; `ui/Sheet.tsx:21-72`; `ui/Popover.tsx:88-99`; `ui/CodeBlock.tsx:40-85`; `ui/useModal.ts` (unchanged); tests `Dialog.test.tsx`. Consumers: 9 `<Dialog` files, 2 `<Sheet`, 2 `<Popover`. |
| **New files** | none. |
| **Design values** | Section 1.2: nested radius: a `rounded-lg` button in a Dialog footer with 16 px padding is unchanged. The scrim is the token, not a literal. z-index by name; the Popover needs none. |
| **States** | Open, closing (no exit animation: unmount is immediate, keeping the focus return logic; an exit fade is out of scope), focus trapped, Escape closes, scrim click closes (Dialog and Sheet), reduced motion fades only. |
| **i18n** | None (labels come from callers). |
| **Tests** | vitest `Dialog.test.tsx` (existing: focus trap, Escape, scrim click, labelled by title) keeps passing and gains: the scrim and panel carry the new animation classes; no `border-` on the panel. A `Sheet` case (new in the same file): `side="end"` has `rounded-s-2xl`, `side="bottom"` has `rounded-t-2xl`. `CodeBlock`: copy button still copies (existing behaviour test if present, else a new case with a stubbed clipboard). |
| **Acceptance** | Given the keyboard shortcuts dialog, When I press `?`, Then it opens over a dim scrim, focus moves inside, Tab stays inside, Escape closes and focus returns. Given the phone menu (T-BU-24) and dock sheet, Then they slide from their edge in 500 ms. |
| **Proof commands** | `TL`; `V src/components/ui`; `UIC src/components/ui/Dialog.tsx src/components/ui/Sheet.tsx src/components/ui/Popover.tsx src/components/ui/CodeBlock.tsx`; `E bu-12 e2e/shell.spec.ts e2e/dock.spec.ts e2e/dock.phone.spec.ts`; screenshots with the settings popover and one dialog open (1.5). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-15, 17, 18, 24 build on them. |

---

### T-BU-13. Menu (action menu)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-13. Subsystem ui. Phase BU. Priority P0. Dependencies T-BU-02, 04, 05, 06, 07. Group G3. Source files: 2 (`ui/Menu.tsx`, `ui/menu-nav.ts`). |
| **Problem** | Scope asks for "select or menu". Native selects (styled by T-BU-09) cover choosing one value; there is no menu for actions (share, copy link, reset, export) and the kit has none, so each lab invents a row of buttons. B1 onward adds more actions per screen. |
| **Expected behaviour** | `Menu({ label, trigger, items, align })`: a button trigger (any `Button` or `IconButton`) opens a native popover (`popover="auto"`, same technique as `Popover.tsx:36-86`; it does not wrap `Popover` so it needs nothing from T-BU-12). `items`: `{ id, label, icon?, shortcut?, onSelect, disabled?, tone? }` or `{ separator: true }`. Roles: panel `role="menu"`, items `role="menuitem"`. Keyboard: ArrowDown/ArrowUp move (wrapping), Home/End jump, a typed letter jumps to the next item starting with it (`menu-nav.ts`), Enter or Space selects, Escape closes and returns focus to the trigger. Selecting closes the menu. Item row `min-h-10 px-3 py-2 rounded-lg text-sm font-semibold`, hover and focused `--hover`, a trailing `Kbd` for the shortcut. Panel `bg-raised rounded-2xl shadow-lg p-2` (inner items `rounded-lg`: 16 minus 8). |
| **Existing files** | `ui/Popover.tsx:36-86` (the popover API pattern to copy), `ui/Kbd.tsx`, `ui/useModal.ts` (`focusableIn`). |
| **New files** | `ui/Menu.tsx`, `ui/menu-nav.ts` (pure: `nextIndex(items, current, key)`, `typeahead(items, current, typed)`), tests `menu-nav.test.ts`, `Menu.test.tsx`. |
| **Design values** | As the Popover and the item row above; icon 20; separator is a 1 px `--rule` line with `my-2`. |
| **States** | closed, open, item hover, item focused, item disabled (`opacity-50`, skipped by arrows), selected closes. |
| **i18n** | None; labels from callers. |
| **Tests** | `menu-nav.test.ts` (wrap, skip disabled, typeahead, empty list). `Menu.test.tsx` (jsdom): trigger has `aria-haspopup="menu"` and `aria-expanded`; ArrowDown focuses the first item; Escape closes; selecting calls `onSelect` once and closes. |
| **Acceptance** | Given a menu with three items, When I open it by keyboard and press ArrowDown twice then Enter, Then the second item runs and focus returns to the trigger. |
| **Proof commands** | `TL`; `V src/components/ui/menu-nav.test.ts src/components/ui/Menu.test.tsx`; `UIC src/components/ui/Menu.tsx src/components/ui/menu-nav.ts`. |
| **Rollback** | `git revert` (nothing else imports it yet). |
| **Later tasks need** | T-BU-15 (command actions share `menu-nav.ts`), T-BU-19 optional (the nav's account/settings), later phases for actions. |

---

### T-BU-14. Kbd, Meter, Stat, Stepper, ProgressBadge

| Field | Content |
|---|---|
| **Identity** | Id T-BU-14. Subsystem ui. Phase BU. Priority P0. Dependencies T-BU-02, 04, 05, 06, 07. Group G3. Source files: 5 (`ui/Kbd.tsx`, `ui/Meter.tsx`, `ui/Stat.tsx`, `ui/Stepper.tsx`, `ui/ProgressBadge.tsx`). |
| **Problem** | `Kbd` has `text-[11px]` and a hard shadow (`Kbd.tsx`: size 1, shadow 1). `Meter` and `ProgressBadge` animate `width` (`Meter.tsx:43`, `ProgressBadge.tsx:30`) with palette fills and `border-e-[1.5px]`. `Stat` and `Stepper` use `ink-label`, mono and palette tones (`Stepper.tsx`: palette 2, shadow 1, raw button). |
| **Expected behaviour** | `Kbd`: `rounded-md bg-sunken px-1 py-0.5 text-xs font-mono font-semibold`, 1 px `--rule` border, no shadow. `Meter`: track `bg-sunken rounded-full h-2 border border-muted` (the 1 px border keeps the accent fill at 3 to 1 against its surround); the fill is a full width element scaled by an inline `style={{ transform: "scaleX(0.4)", transformOrigin: "left" }}` (a style attribute, which B1's `style-src-attr 'unsafe-inline'` allows) with `motion-move`; fill colour `--accent` normally, `--good` when complete, `--bad` when over limit; the numeric label `tabular`. `ProgressBadge`: same scale approach and the same track border for its bar; `font-ui` only on the number. `Stat`/`StatStrip`: label `kicker`, value `text-2xl font-semibold tabular`, no mono for labels. `Stepper`: step markers are `rounded-full` dots only (allowed: status dots), the step button is a real `Button ghost sm`, current step `aria-current="step"`; completed shows a Phosphor `Check` (16). |
| **Existing files** | `ui/Kbd.tsx` (15 lines); `ui/Meter.tsx:30-52`; `ui/Stat.tsx`; `ui/Stepper.tsx:60-82`; `ui/ProgressBadge.tsx:20-90`. Tests `Stat.test.tsx`, `ProgressBadge.test.tsx`. |
| **New files** | none. |
| **Design values** | Section 1.2; no width animation; bar thickness 8 px (`h-2`). Colours from tokens only. |
| **States** | Meter: empty, partial, complete, over. Stepper: upcoming, current, done, disabled. ProgressBadge: 0, partial, done (the existing "Done" word). |
| **i18n** | None (callers pass labels; `progress` and `progressLabel` strings stay). |
| **Tests** | `Stat.test.tsx` and `ProgressBadge.test.tsx` (existing) keep passing; add: the Meter track has `border-muted`; the bar element has `transform: scaleX(...)` and no `width` style or `transition-[width]` class (source check), `aria-valuenow` unchanged. |
| **Acceptance** | Given a lesson progress bar, When progress changes, Then the bar grows by transform with a 500 ms ease and nothing else on the page reflows. |
| **Proof commands** | `TL`; `V src/components/ui`; `UIC src/components/ui/Kbd.tsx src/components/ui/Meter.tsx src/components/ui/Stat.tsx src/components/ui/Stepper.tsx src/components/ui/ProgressBadge.tsx`; `E bu-14 e2e/boardlab.spec.ts e2e/robotics.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Sweeps and the home page read these. |

---

### T-BU-15. Command menu

| Field | Content |
|---|---|
| **Identity** | Id T-BU-15. Subsystem shell. Phase BU. Priority P0. Dependencies T-BU-08, 09, 12, 13. Group G4. Source files: 4 (`ui/CommandMenu.tsx`, `shell/command-items.ts`, `shell/CommandMenuHost.tsx`, `src/i18n/messages/*/shell.json` as one set). |
| **Problem** | UI_RULES prefers a command menu to modals. Moving between 3 labs, the settings, a theme and a language takes 3 to 4 clicks; there is no keyboard way to jump (the lab shortcuts in `boardlab/shortcuts.ts` are inside one lab only). |
| **Expected behaviour** | `Ctrl+K` / `Cmd+K` or the nav's search button (T-BU-19) opens a dialog with a search field and a list. Items: Pages (every `NAV` entry that `showNavEntry` allows, from `shell/nav.ts`), Actions (Keys and usage via `OPEN_KEYS_EVENT`, Sound on or off, Reduce motion on or off), Theme (Match system, Light, Dark via `setSetting("theme", ...)`), Language (the six names, via the same cookie and `router.push(localizedPath(...))` as `LanguagePicker.tsx`). Typing filters (prefix match ranks above word start above substring, case and accent insensitive); ArrowUp/Down move the active option; Enter runs it and closes; Escape closes; the field is a `combobox` (`aria-expanded`, `aria-controls`, `aria-activedescendant`) over a `listbox` of `option`s; groups have `role="group"` and a heading label. No match shows an `EmptyState`-style line. The shortcut yields to an editor: when focus is inside `.cm-editor` and the platform is macOS, `Ctrl+K` (delete to end of line in CodeMirror) is ignored; `Cmd+K` still opens. |
| **Existing files** | `shell/nav.ts:1-39` (`NAV`, `showNavEntry`); `shell/LanguagePicker.tsx:15-37` (cookie and push); `lib/settings/settings.ts` (`setSetting`); `ui/Dialog.tsx`; `ui/menu-nav.ts` (T-BU-13); `boardlab/shortcuts.ts:47-56` (`typingTarget`). B1's `OPEN_KEYS_EVENT` from `components/settings/KeysDialog.tsx`. |
| **New files** | `ui/CommandMenu.tsx` (generic: `{ open, onClose, label, placeholder, emptyLabel, groups: { id, label, items }[] }`), `shell/command-items.ts` (pure: `type CommandItem`, `rankCommands(items, query)`, `normalise(text)`), `shell/CommandMenuHost.tsx` (client: builds the items from props, owns `open`, listens for `keydown` and for `window` event `iynk:open-command`, exports `OPEN_COMMAND_EVENT`). |
| **Design values** | Dialog panel `rounded-2xl bg-raised shadow-lg`, top aligned with `items-start pt-16 sm:pt-24` (64 and 96 px), width `max-w-xl`; search row `px-4 py-3`, icon `MagnifyingGlass` 20, input `text-base` (16 px, avoids iOS zoom); option rows `min-h-10 px-3 py-2 rounded-lg`, active `bg-hover`; group label `kicker` with `px-3 py-2`; key hint `Kbd`. Scroll area `max-h-96`. |
| **States** | closed, open empty query (all groups), filtered, no match, option active, option hover, reduced motion (fade only). |
| **i18n** | `shell.json` `command`: `title` ("Command menu"), `placeholder` ("Search pages and actions"), `empty` ("Nothing matches. Try a lab name or a setting."), `groups.pages`, `groups.actions`, `groups.theme`, `groups.language`, `open` ("Search"), `sound.on`, `sound.off`, `motion.on`, `motion.off`, `keys` ("Keys and usage"), `hint` ("{key} opens this menu"). Six languages. |
| **Tests** | vitest `command-items.test.ts`: ranking (prefix, word start, substring), accent folding ("Espanol" finds "Español", "robotica" finds "Robótica"), stable order, empty query returns all. `CommandMenu` jsdom test in `ui/CommandMenu.test.tsx`: roles, arrow navigation updates `aria-activedescendant`, Enter calls the item, Escape closes. Playwright (added to `e2e/shell.spec.ts` by this task, not counted): `Control+K` opens, typing "dro" shows the Drone lab, Enter navigates to `/en/drones`; axe on the open menu has no serious findings. |
| **Acceptance** | Given any page, When I press `Ctrl+K`, type "dark" and press Enter, Then the theme becomes dark and the menu closes. Given the phone, When I tap the search button, Then the same menu opens full width. |
| **Proof commands** | `TL`; `V src/components/shell src/components/ui src/i18n`; `UIC` on the three source files; `E bu-15 e2e/shell.spec.ts`; screenshots with the menu open, 1440 and 390, both themes. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-19 mounts `CommandMenuHost` and the trigger; T-BU-48 may link to it from the 404. |

---

### T-BU-16. Workspace chrome and the dock

| Field | Content |
|---|---|
| **Identity** | Id T-BU-16. Subsystem shell. Phase BU. Priority P0. Dependencies T-BU-08, 10, 11, 12. Group G4. Source files: 5 (`shell/WorkspaceBar.tsx`, `shell/StageDrawer.tsx`, `shell/UntranslatedNotice.tsx`, `dock/LabDock.tsx`, `src/styles/layout.css`). |
| **Problem** | `WorkspaceBar` marks a lab with a 10 px swatch in cobalt, mint or tomato inside a 1.5 px ink border (`WorkspaceBar.tsx:6,39`) and sets titles in `font-head`; `StageDrawer` is `rounded-ink-sm` with `border-[1.5px]` and a 150 ms chevron (`StageDrawer.tsx:30,40`); `UntranslatedNotice` has a `z-40` popover with `shadow` (`:32`); `LabDock` casts `shadow-[-4px_0_0_var(--shadow-c)]`, has `border-s-2` on a card shaped panel, `z-30`, `w-[min(26rem,calc(100vw-3rem))]`, an inline `<style>` (`LabDock.tsx:96-99,281,290`) that B1's page CSP would block, and a trigger with a mint dot and a 1.5 px border (`:239`). |
| **Expected behaviour** | `WorkspaceBar`: keeps props; `tone` stays accepted and now picks a Phosphor lab icon (`cobalt` to `board`, `mint` to `robot`, `tomato` to `drone`) at 16 in `--muted` instead of a colour swatch; back link is a `Button ghost sm` with a `CaretLeft` (the label stays its name below `md`); the h1 is `text-xl lg:text-2xl font-semibold`; the kicker uses the `kicker` class. `StageDrawer`: `rounded-xl`, 1 px `--rule` border, header row a real button `min-h-10 px-3 text-sm font-semibold`, chevron rotates with `motion-move`, body top rule 1 px. `UntranslatedNotice`: popover `z-tooltip`, `rounded-lg bg-raised shadow-md`, no border. `LabDock`: `aside` is `bg-raised shadow-lg rounded-s-2xl`, no border, `z-dock`, width from `--dock-w`, `animate-slide-in-end`; header `min-h-12`, icon `tools` 20, title `text-lg font-semibold`; the `PUSH_PAGE` text moves out of the component into `layout.css` as the same two rules using `var(--dock-w)` (defined once as `26rem`, and the `aside` width as `min(var(--dock-w), calc(100vw - 3rem))`), and the `<style>` element is deleted; trigger keeps `data-testid="lab-dock-trigger"` and its aria, in room dot becomes `size-2 rounded-full bg-good` with no border. The phone `Sheet` path is unchanged. Keep B1 T-B1-22's `next/dynamic` imports and Suspense fallbacks in `LabDock.tsx` as they are. |
| **Existing files** | `shell/WorkspaceBar.tsx:6-48`; `shell/StageDrawer.tsx:26-46`; `shell/UntranslatedNotice.tsx:28-40`; `dock/LabDock.tsx:96-99` (`PUSH_PAGE`), `:239` (trigger), `:268-293` (aside and `<style>`); `src/styles/layout.css` (frames). Tests `dock/LabDock.test.tsx`. |
| **New files** | none. |
| **Design values** | Section 1.2: no border on the dock's start edge only (removed), shadow from `--shadow-lg`, radius only on the inside edge (`rounded-s-2xl`, edge attached rule). |
| **States** | Dock: closed (`hidden`), open, trigger pressed (`aria-pressed`), in room dot. Drawer: closed, open, focus. |
| **i18n** | None. |
| **Tests** | `LabDock.test.tsx` keeps passing (tabs, flags, events); add: no `<style>` element is rendered (`document.querySelector("style")` is null inside the dock portal). `E bu-16 e2e/dock.spec.ts e2e/dock.phone.spec.ts`: the dock still pushes the page at 1440 wide (`main` has end padding when open, measured with `getComputedStyle`). |
| **Acceptance** | Given a lab page at 1440x900, When I open the dock, Then the panel slides in over 500 ms, the workspace narrows by the dock width and no inline style element exists in the DOM. Given the CSP, Then there is 0 violation. |
| **Proof commands** | `TL`; `V src/components/dock src/components/shell`; `UIC` on the five files; `E bu-16 e2e/dock.spec.ts e2e/dock.phone.spec.ts e2e/boardlab.spec.ts`; screenshots of a lab with the dock open (1.5). |
| **Rollback** | `git revert`. |
| **Later tasks need** | Sweeps assume `WorkspaceBar` and the dock look. |

---

### T-BU-17. Settings menu, theme, language, sound, usage toggles

| Field | Content |
|---|---|
| **Identity** | Id T-BU-17. Subsystem settings. Phase BU. Priority P0. Dependencies T-BU-08, 09, 12; B1 (T-B1-02). Group G4. Source files: 5 (`shell/SettingsMenu.tsx`, `shell/ThemeControl.tsx`, `shell/LanguagePicker.tsx`, `settings/SoundToggle.tsx`, `settings/UsageToggle.tsx`). |
| **Problem** | The Settings trigger is an outlined pill with a mono language code and a gear (`SettingsMenu.tsx:52-69`, `text-[11px]`, `tracking-[0.08em]`, `rounded-full`); the panel mixes `ink-label`, `divide-y` with `border-t-[1.5px]` and a `py-1` toggle stack (`:15-45`); `SoundToggle.tsx` draws two inline `<svg>` icons; B1 adds a "Keys and usage" button and the dialog. Theme is already words in a radiogroup (compliant). |
| **Expected behaviour** | Trigger: `Button ghost sm` named `shell.settings.label` (sr-only text), `GearSix` 20 and the language code in `text-sm font-semibold` (the code is an identifier, kept uppercase); `aria-haspopup="dialog"`, `aria-expanded` from `Popover`. Panel (`Popover`, `w-[min(21rem,calc(100vw-2rem))]`): sections with `kicker` labels "Theme", "Language", then the toggles (Sound, Reduce motion, Usage) in rows with 1 px `--rule` dividers (row dividers stay), then B1's "Keys and usage" as `Button secondary sm` with the `key` icon dispatching `OPEN_KEYS_EVENT`. `ThemeControl`: unchanged behaviour and roles: `SegmentedControl` with words "Match system / Light / Dark", `stretch`. No sun and moon anywhere. `LanguagePicker`: `Select` from T-BU-09 (native, so mobile pickers work), label shown. `SoundToggle`: an `IconButton plain` with `sound-on` / `sound-off`, `aria-pressed`, `data-testid="sound-toggle"` kept. `UsageToggle`: `Toggle`, `data-testid="usage-toggle"` kept. |
| **Existing files** | `shell/SettingsMenu.tsx:15-69`; `shell/ThemeControl.tsx` (20 lines); `shell/LanguagePicker.tsx:15-37`; `settings/SoundToggle.tsx` (62 lines, two inline svgs); `settings/UsageToggle.tsx` (17 lines); `e2e/shell.spec.ts:28-60,209-230` (open Settings, theme options measured by `cutThemeOptions`, Escape returns focus). |
| **New files** | none. |
| **Design values** | Section 1.2; trigger 36 px high (`sm`); popover padding 16; section gap 16 (`gap-4`); toggle rows `min-h-11`. Icons 20. |
| **States** | trigger: default, hover, expanded, focus; toggles: off, on, disabled; segmented: 3 options; select: default, focus; keys button: default, hover, focus. |
| **i18n** | None new (strings exist: `settings.label`, `language.label`, `theme.*`, `sound.label`, `motion.label`). |
| **Tests** | `settings.test.tsx` (existing) keeps passing; `E bu-17 e2e/shell.spec.ts e2e/sound.spec.ts` (the settings popover, theme options not clipped, Escape hands focus back, sound toggle). axe on the open popover: 0 serious (added inside shell.spec by T-BU-57's pass, not here). |
| **Acceptance** | Given 1440x900, When I click Settings, Then a popover opens under the button with Theme, Language, three toggles and Keys and usage; Escape closes it and focus returns to the button. Given dark mode, Then the popover is `#272727` with `#313131` dividers. |
| **Proof commands** | `TL`; `V src/components/shell src/lib/settings src/components/settings`; `UIC` on the five files; `E bu-17 e2e/shell.spec.ts e2e/sound.spec.ts`; screenshots with the popover open in both themes. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-19 places `SettingsMenu` in the bar; T-BU-24 reuses `SettingsPanel` in the phone panel. |

---

### T-BU-18. Keys dialog, usage meter and NotSetUp on the base

| Field | Content |
|---|---|
| **Identity** | Id T-BU-18. Subsystem settings. Phase BU. Priority P0. Dependencies T-BU-08, 09, 10, 11, 12, 14; B1 (T-B1-02, 26, 27, 30). Group G4. Source files: 5 (`settings/KeysDialog.tsx`, `settings/KeysPanel.tsx`, `settings/UsageMeter.tsx`, `settings/NotSetUp.tsx`, `settings/LocalLog.tsx`). |
| **Problem** | B1 builds these five files on the old kit (the fifth is the local log list of T-B1-27, mounted in the keys dialog): password fields from `TextInput` with a loose `role="alert"` line (T-B1-02 "validation, errors"), a usage meter that shows "spinner after 300 ms" and a text only "Could not read usage" (T-B1-26), and `NotSetUp` as a quiet `Callout` with a button (T-B1-30). They must follow UI_RULES: inline field errors, skeletons not spinners, composed states. File names are from the B1 cards (the files do not exist at `f018746`, UNKNOWN until B1 lands); the builder runs `ls src/components/settings` first. |
| **Expected behaviour** | `KeysDialog`: `Dialog size="md"`, title "Keys and usage", the notice "Kept in this browser only..." as `text-sm text-muted` under the title. `KeysPanel`: one `KeyField` per kind with `TextInput type="password"` (`autoComplete="off"`, `spellCheck={false}`, no `name`, as B1 requires) and the `error` prop for the B1 reasons (`empty`, `tooLong`, `badChars`, `notPersisted` messages stay), Save is `Button primary sm`, after saving the masked tail with `Remove` (`Button ghost sm`) and an `InlineStatus tone="good" live` "Saved". `UsageMeter`: `Meter` for today against the cap, numbers `tabular`, loading shows two `Skeleton` lines (no spinner), `no_key` and `off` show an `InlineStatus tone="info"` with the reason text (not an error), `failed` shows `InlineStatus tone="bad"` plus `Button ghost sm` Retry. `NotSetUp`: keeps `data-testid="not-set-up"`, `data-reason`, the reason line and fix line, uses `EmptyState` (compact, `icon="info"`) with the `Open Keys and usage` `Button secondary sm` for `needs_key`; no box shadow, `rounded-lg bg-sunken p-4`. `LocalLog`: the B1 log list on the base: each row is a `text-sm` line with the time `tabular` and the kind as a `Chip` (`bad` for an error, `neutral` for an event), the entry text in `text-sm`; Clear is `Button ghost sm`, "Copy for a bug report" is `Button secondary sm`; an empty log is a compact `EmptyState` with the B1 wording; the redaction of T-B1-27 is not touched. `settings/index.ts` is B1's file and gets no new export. The canary rule of B1 holds: a saved key never appears in the DOM text. |
| **Existing files** | B1: `src/components/settings/KeysDialog.tsx`, `KeysPanel.tsx`, `UsageMeter.tsx`, `NotSetUp.tsx`, `LocalLog.tsx`, `index.ts` (T-B1-02, T-B1-26, T-B1-27, T-B1-30); their tests `KeysPanel.test.tsx`, `NotSetUp.test.tsx`, `LocalLog.test.tsx`; `e2e/keyless.spec.ts` (T-B1-12) reads `[data-testid="not-set-up"]`. |
| **New files** | none. |
| **Design values** | Section 1.2; dialog padding 24; field gap 16; Save and Remove `sm`; meter bar `h-2`. |
| **States** | field: empty, typing, saved (masked tail), invalid (inline error), not persisted (inline warn); meter: loading, ok, no key, off, failed with retry; local log: empty, entries, cleared; NotSetUp: `server_off`, `needs_key`. |
| **i18n** | None new here. The "Saved" line reads `client.state.saved`, which T-BU-11 adds to `common.json`; this task does not edit `common.json`. |
| **Tests** | B1's unit tests keep passing (`KeysPanel.test.tsx`, `NotSetUp.test.tsx`) with edits only for class names they quote; add: an invalid key renders the message inside the field's `aria-describedby` target; loading renders `[aria-busy]` skeleton and no `animate-spin`. `E bu-18 e2e/keyless.spec.ts e2e/shell.spec.ts`. |
| **Acceptance** | Given a bad key, When I press Save, Then the message appears under that field in red and the field is `aria-invalid`. Given the usage request is slow, Then two skeleton lines show instead of a spinner. Given no key, Then the partner tab shows the not set up box with the open keys button, and the keyless walk passes. |
| **Proof commands** | `TL`; `V src/components/settings`; `UIC` on the five files; `E bu-18 e2e/keyless.spec.ts e2e/shell.spec.ts`; screenshots of the open dialog in both themes at both sizes. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-41 and T-BU-42 render `NotSetUp` inside the partner and search panels. |

---

### T-BU-19. Floating nav bar and the current page mark

| Field | Content |
|---|---|
| **Identity** | Id T-BU-19. Subsystem shell. Phase BU. Priority P0. Dependencies T-BU-08, 15, 17. Group G5. Source files: 4 (`shell/SiteHeader.tsx`, `shell/NavLinks.tsx`, `shell/NavBar.tsx`, `src/i18n/messages/*/shell.json` as one set). |
| **Problem** | The header is welded to the top edge, 57 px with a bottom hairline and a grain image (`SiteHeader.tsx:27-28`); the nav row is `text-sm font-medium` with a 5 px LED dot (`NavLinks.tsx:34-36,63-70`); the phone sheet links are `text-[22px]` with mono numerals and `tracking-[-0.02em]` (`NavLinks.tsx:44-52`). UI_RULES: a compact bar floating off the top edge, sized to its content, translucent with backdrop blur, the current page marked. |
| **Expected behaviour** | `SiteHeader` stays a server component that returns the one `<header>` landmark: `sticky top-0 z-header h-(--header-h) pointer-events-none` (the wrapper reserves 64 px so `--header-h` consumers do not move; it is transparent, so content slides under the bar). Inside, `NavBar` (client) renders the bar: `pointer-events-auto mx-auto mt-2 flex h-12 w-max max-w-[calc(100%-2rem)] items-center gap-2 rounded-2xl bg-paper/90 px-2 shadow-md backdrop-blur-xl` (translucent over a blur, sized to its content, floats 8 px off the top). Keep any `prefetch` prop that B1 T-B1-23 set on the links in `NavLinks.tsx` and `SiteHeader.tsx` when rewriting them. Contents left to right: logo link (min 44 px), `NavLinks layout="bar"` from `lg`, a search button (`IconButton plain`, `search` icon, opens the command menu; from `xl` it also shows the `Kbd` hint), `SettingsMenu`, and below `lg` the `MobileNav` trigger (T-BU-24). `NavBar` mounts `CommandMenuHost` once. `NavLinks` bar layout: `Link` `rounded-lg px-3 py-2 text-sm font-semibold motion-fade`; current page: `aria-current="page"`, `bg-hover text-ink` and a 4 px `bg-accent` dot before the label; other links `text-muted hover:bg-hover hover:text-ink`. The sheet layout (used by T-BU-24) lays links out as `text-2xl font-semibold py-3` rows with the same current mark, each carrying `style="--i: n"` and the class `stagger-in`; the mono numerals are dropped. Below `lg` the bar holds only the logo, the search button and the menu button, so it never overflows a 360 px screen. At 1024 px in German (the longest labels) the links still fit one row; the spec checks it. |
| **Existing files** | `shell/SiteHeader.tsx:19-53` (`SettingsLabels`, grid, `lg:hidden` split); `shell/NavLinks.tsx:1-74` (both layouts); `shell/nav.ts` (unchanged); `shell/Logo.tsx` (drawn, unchanged, its `fill="var(--accent, #ef6a4c)"` fallback stays); `e2e/shell.spec.ts:72,172,209` (skip link first stop, one visible header, settings button inside the header). |
| **New files** | `shell/NavBar.tsx` (client; props `{ lang, labels, settings, commandLabels, children }`), test `shell/NavBar.test.tsx`. |
| **Design values** | Section 1.2: bar radius 16, shadow `--shadow-md`, padding 8, link padding 8 by 12, gap 8; translucent fill `--paper` at 90 percent; `backdrop-blur-xl`; motion `motion-fade` only on colour; the bar itself does not animate on load (no entrance, so no layout shift). Contrast of `text-muted` on the translucent paper over any content is at least 4.5: computed worst case at 90 percent opaque is 4.67 to 1 for light `--muted` `#625b4f` over black content and 6.26 to 1 for dark `--muted` `#b3aa98` over white content (at 80 percent they were 3.66 and 4.45, which is why the bar is 90). The test computes both against `#000` and `#fff` content behind. |
| **States** | link: default, hover, current, focus; search button: default, hover, focus; reduced motion: no change (only colours animate). |
| **i18n** | `shell.json` `nav.search` ("Search") and `nav.searchHint` ("Search pages and actions") for the button's accessible name and tooltip, six languages. (`command.*` strings are T-BU-15's.) |
| **Tests** | `NavBar.test.tsx` (jsdom): the bar class contains `bg-paper/90` and the worst case contrast above is at least 4.5; renders one `nav` with `aria-label`, the current link has `aria-current="page"` and the others do not; the search button has an accessible name and fires `OPEN_COMMAND_EVENT`. `nav.test.ts` (existing) unchanged. Playwright in `e2e/shell.spec.ts` stays green; add (counted as test): at 1440 the bar's `getBoundingClientRect().top` is 8 and its width is less than 1200 and its centre is the viewport centre (+/- 1 px); at 1024 in `de` the nav links fit on one row; one `header:visible`. |
| **Acceptance** | Given any page at 1440x900, When it loads, Then a translucent rounded bar floats 8 px below the top edge, centred and just wide enough for its content, and the current section is marked. Given I scroll, Then page content passes under the bar and stays faintly visible through the blur. Given Tab as the first key, Then the skip link shows (T-BU-49), and the second stop is the logo. |
| **Proof commands** | `TL`; `V src/components/shell src/i18n`; `UIC` on the four source files; `E bu-19 e2e/shell.spec.ts e2e/dock.spec.ts`; screenshots `/en`, `/en/boards`, `/de`, `/hi` at 1440 and 390, both themes (1.5). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-24 fills the phone half; T-BU-48 reuses the bar on the 404 (it is in the layout already). |

---

### T-BU-20. Sweep: board lab 1 (workspace, view bar, progress)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-20. Subsystem boardlab. Phase BU. Priority P0. Dependencies T-BU-08 to 14. Group G5. Source files: 5 (`components/boardlab/BoardWorkspace.tsx`, `components/boardlab/BoardProgress.tsx`, `components/boardlab/ViewBar.tsx`, `components/boardlab/ScrollRow.tsx`, `components/boardlab/FigureReadout.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `components/boardlab/BoardWorkspace.tsx` (438 lines): 2 off-scale spacing, 1 old `ink-*` class, 1 rounded-ink or arbitrary radius, 2 icon or svg, 1 `font-ui`; `components/boardlab/BoardProgress.tsx` (32 lines): 1 `font-ui`; `components/boardlab/ViewBar.tsx` (156 lines): 1 old `ink-*` class, 6 icon or svg, 2 raw control; `components/boardlab/ScrollRow.tsx` (59 lines): 1 off-scale spacing; `components/boardlab/FigureReadout.tsx` (53 lines): 3 off-scale spacing, 2 palette colour, 1 `font-ui`. Notable lines: `BoardProgress.tsx:27` prints a `✓` character as the done icon; `ViewBar.tsx:127,140` are raw `<select>` elements styled with a local `fieldClass`, and the file has six icon uses; `FigureReadout.tsx:38` builds status chips as `rounded-full border-[1.5px] px-2.5 py-1` in palette tones (the same chip shape as `PinReadout.tsx:23`); `BoardWorkspace.tsx:432` sets prose with `ink-prose text-lg xl:max-w-[128ch]`; `ScrollRow.tsx:52` has a mask fade (stays). |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. `BoardProgress` shows a Phosphor `check` (16) before the label instead of the glyph. `ViewBar` uses `Select` with `hideLabel` for the variant and power pickers and `IconButton`/`SegmentedControl` for the view switch. `FigureReadout` renders its readouts as `Chip` with `good`, `bad`, `neutral` tones (the `tabular` number stays). `BoardWorkspace` keeps the `WorkspaceFrame` composition; prose measure `max-w-prose`; the `×` in the size readout (`BoardWorkspace.tsx:233`, "69 × 53") is data text and stays. Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | `BoardWorkspace.tsx:233,432`; `BoardProgress.tsx:27`; `ViewBar.tsx:127,140`; `FigureReadout.tsx:38`; `ScrollRow.tsx:52`; the figure bridge keeps working through the unchanged `FigureFrame` props. Unit tests `FigureReadout.test.tsx`, `ViewBar.test.ts` (logic only). |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. View bar buttons are `sm` icon buttons (20 px icons) with `aria-pressed`; readout chips `rounded-md px-2 py-1 text-xs font-semibold`. |
| **States** | View bar: default, hover, pressed, focus, disabled. Readouts: high, low, unknown. Assembly progress: not started, in progress, done. |
| **i18n** | None (rule W15).  |
| **Tests** | Existing `FigureReadout.test.tsx` and `ViewBar.test.ts` keep passing; update class name assertions in the same commit if they quote one. Playwright: `E bu-20 e2e/boardlab.spec.ts e2e/dock.spec.ts`. Screenshots (1.5) of `/en/boards/uno-r3` (breadboard view, schematic view, the assembly state) at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given `/en/boards/uno-r3`, When it loads at 1440x900, Then the view bar, readouts and progress use the new kit, no `✓` text character shows, the two pickers are styled selects, and `UIC` prints 0 for the five files. Given dark mode, Then no element keeps a warm brown surface outside the allowed ladder. |
| **Proof commands** | `TL`; `V src/components/boardlab`; `UIC src/components/boardlab/BoardWorkspace.tsx src/components/boardlab/BoardProgress.tsx src/components/boardlab/ViewBar.tsx src/components/boardlab/ScrollRow.tsx src/components/boardlab/FigureReadout.tsx`; `BUILD bu-20`; `E bu-20 e2e/boardlab.spec.ts e2e/dock.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing; T-BU-56 deletes the compatibility aliases once every sweep has landed. |

---

### T-BU-21. Sweep: board lab 2 (lesson workspace)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-21. Subsystem boardlab. Phase BU. Priority P0. Dependencies T-BU-08 to 14. Group G5. Source files: 5 (`components/boardlab/LessonWorkspace.tsx`, `components/boardlab/LessonPicker.tsx`, `components/boardlab/LessonInfo.tsx`, `components/boardlab/ParamPanel.tsx`, `components/boardlab/PinReadout.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `components/boardlab/LessonWorkspace.tsx` (427 lines): 1 off-scale spacing, 3 icon or svg; `components/boardlab/LessonPicker.tsx` (91 lines): 1 off-scale spacing, 1 old `ink-*` class, 1 rounded-ink or arbitrary radius, 6 icon or svg, 2 `font-ui`, 1 raw control; `components/boardlab/LessonInfo.tsx` (195 lines): 5 off-scale spacing, 1 old `ink-*` class, 1 rounded-ink or arbitrary radius, 1 palette colour, 1 raw control; `components/boardlab/ParamPanel.tsx` (78 lines): 1 palette colour, 1 raw control; `components/boardlab/PinReadout.tsx` (33 lines): 2 off-scale spacing, 2 palette colour, 1 `font-ui`. Notable lines: `LessonPicker.tsx:67` is a raw `<button>` built with `buttonClass("ghost", "sm", "tabular gap-1 px-2 ...")` and mono for labels (2 `font-ui`); `LessonInfo.tsx:58` and `ParamPanel.tsx:42` are raw `<input>` elements (a checkbox and a range slider for lesson parameters); `LessonInfo.tsx` has five off scale spacings and a palette dot at `:108`; `PinReadout.tsx:23` repeats the chip shape of `FigureReadout`; `LessonWorkspace.tsx` carries three icon uses and the `]`/`[` lesson shortcuts that must keep working (B0 T-B0-04). |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. `LessonPicker` is a `Menu`-less select: a `Select hideLabel` of lessons with the progress count as `tabular` text, previous and next as `IconButton`. The checkbox in `LessonInfo` stays a native input styled by the global `accent-color` (allowed exception: native checkbox and range controls keep their native element, wrapped by a `label` with the field label style); the range in `ParamPanel` stays native and gets a visible focus ring and `field-label`. `PinReadout` uses `Chip`. The lesson text keeps `ink-prose` until T-BU-56 renames it to `prose` (this task renames it in these files: `prose`). Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | `LessonPicker.tsx:67`; `LessonInfo.tsx:58,108`; `ParamPanel.tsx:32,42` (param row highlight with `rounded-md p-1 transition-colors`); `PinReadout.tsx:23`; `LessonWorkspace.tsx` shortcut handler (uses `typingTarget`, unchanged). |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. Parameter rows `rounded-lg p-2` with `motion-fade` highlight on change; slider track uses the native look with `accent-color: var(--accent)`. |
| **States** | Lesson picker: default, open, first, last (previous or next disabled). Params: idle, just changed (highlight 300 ms). Lesson info: loading uses `SkeletonGroup` shaped like the title and three lines when content streams. |
| **i18n** | None (rule W15).  |
| **Tests** | No component unit test exists for these files (VERIFIED `ls`); the e2e specs below carry the behaviour. Playwright: `E bu-21 e2e/boardlab.spec.ts`. Screenshots (1.5) of `/en/boards/uno-r3/blink` (lesson with params, with the lesson picker open) at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given a lesson page, When I press `]`, Then the next lesson opens as before (B0 T-B0-04 behaviour). Given the parameter slider, When I tab to it, Then a 2 px ring shows. Given `UIC` on the five files, Then 0 hits. |
| **Proof commands** | `TL`; `V src/components/boardlab`; `UIC src/components/boardlab/LessonWorkspace.tsx src/components/boardlab/LessonPicker.tsx src/components/boardlab/LessonInfo.tsx src/components/boardlab/ParamPanel.tsx src/components/boardlab/PinReadout.tsx`; `BUILD bu-21`; `E bu-21 e2e/boardlab.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing; T-BU-56 deletes the compatibility aliases once every sweep has landed. |

---

### T-BU-22. Sweep: board lab 3 (code, serial monitor, checks, failures, assembly)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-22. Subsystem boardlab. Phase BU. Priority P0. Dependencies T-BU-08 to 14. Group G5. Source files: 5 (`components/boardlab/CodePanel.tsx`, `components/boardlab/SerialMonitor.tsx`, `components/boardlab/ChecksPanel.tsx`, `components/boardlab/FailurePanel.tsx`, `components/boardlab/AssemblyPanel.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `components/boardlab/CodePanel.tsx` (158 lines): 2 off-scale spacing, 1 old `ink-*` class, 1 rounded-ink or arbitrary radius, 6 icon or svg; `components/boardlab/SerialMonitor.tsx` (225 lines): 1 off-scale spacing, 2 old `ink-*` class, 2 rounded-ink or arbitrary radius, 1 hard shadow, 3 palette colour, 2 icon or svg, 3 raw control; `components/boardlab/ChecksPanel.tsx` (87 lines): 1 off-scale spacing, 1 icon or svg; `components/boardlab/FailurePanel.tsx` (102 lines): 1 off-scale spacing, 1 old `ink-*` class, 1 one sided bar; `components/boardlab/AssemblyPanel.tsx` (136 lines): 2 off-scale spacing, 1 icon or svg, 2 `font-ui`, 1 one sided bar. Notable lines: `CodePanel.tsx:100` pulses the Run button with `animate-pulse` while busy and has six icon uses; `SerialMonitor.tsx:61` colours input lines `text-cobalt-m`, `:112-115` draws the status LED with `bg-mint-m`, `bg-mustard-m` and a `shadow-[0_0_0_4px_color-mix(...)]`, `:178,195,207` are a raw button, input and select for the baud and line ending controls; `ChecksPanel.tsx:75` prints `×` for a failed check next to an `Icon` for a passed one (a 12 px icon); `FailurePanel.tsx:25` and `AssemblyPanel.tsx:100` mark the current row with `-mx-4 border-s-4` (one sided bar) and `AssemblyPanel` sets step labels in mono. |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. Run button uses `Button primary` with `busy`. The serial monitor keeps its console look: `--console-bg`, mono text (this is serial output, mono is correct), the status LED becomes a `size-2 rounded-full` dot in `good` / `warn` / `muted` with no glow shadow, line colours use `--console-accent`, `--console-warn`, `--console-err` and `--console-muted`; its controls use `Select hideLabel`, `TextInput` and `IconButton`. `ChecksPanel` shows `Icon check` / `Icon close` (16) in `good` / `bad` for all states. A current row in `FailurePanel` and `AssemblyPanel` becomes `rounded-lg bg-hover px-3` with a leading 4 px accent dot (no one sided border). Step numbers stay `tabular`; step names are Geist. Every `data-testid`, accessible name, role and key handler stays (W14). Keep B1 T-B1-22's `next/dynamic` imports and Suspense fallbacks in `CodePanel.tsx`. The `--console-*` values are the neutral ones of section 1.2 (T-BU-04). |
| **Existing files** | `CodePanel.tsx:96-101`; `SerialMonitor.tsx:61,112-115,178-207`; `ChecksPanel.tsx:75` (unit test `ChecksPanel.test.tsx`); `FailurePanel.tsx:25,89` (the quiet `Callout`); `AssemblyPanel.tsx:100`. Test ids kept: `run-button`, `serial-lines`, `serial-status`, `code-error`, `assembly-panel`. |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. Serial monitor body `text-sm font-mono` (code and serial output exception), console wells `rounded-xl`, line height from the step. |
| **States** | Run: idle, busy, error. Serial: connected, waiting, paused, empty ("Run the code to see output" key exists), error line. Checks: pending, pass, fail. Failures: none, active, current row. |
| **i18n** | None (rule W15).  |
| **Tests** | `ChecksPanel.test.tsx` keeps passing (update the glyph assertion to the icon). Playwright: `E bu-22 e2e/boardlab.spec.ts`. Screenshots (1.5) of `/en/boards/uno-r3/blink` with code running (serial output visible) and with a failed check at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given Blink running, When serial output arrives, Then lines render in the console palette, the status dot is a plain dot, and the Run button shows its busy state without a spinner. Given a failed check, Then the row shows a red icon and text, not a `×` character. `UIC` prints 0. |
| **Proof commands** | `TL`; `V src/components/boardlab`; `UIC src/components/boardlab/CodePanel.tsx src/components/boardlab/SerialMonitor.tsx src/components/boardlab/ChecksPanel.tsx src/components/boardlab/FailurePanel.tsx src/components/boardlab/AssemblyPanel.tsx`; `BUILD bu-22`; `E bu-22 e2e/boardlab.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing; T-BU-56 deletes the compatibility aliases once every sweep has landed. |

---

### T-BU-23. Sweep: board lab 4 (pinout, wire in, world, shortcuts)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-23. Subsystem boardlab. Phase BU. Priority P0. Dependencies T-BU-08 to 14. Group G5. Source files: 4 (`components/boardlab/PinoutTable.tsx`, `components/boardlab/WireInPanel.tsx`, `components/boardlab/WorldPanel.tsx`, `components/boardlab/ShortcutsDialog.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `components/boardlab/PinoutTable.tsx` (75 lines): 7 off-scale spacing, 2 old `ink-*` class, 1 rounded-ink or arbitrary radius, 1 raw control; `components/boardlab/WireInPanel.tsx` (132 lines): 1 off-scale spacing, 2 icon or svg; `components/boardlab/WorldPanel.tsx`: no hits in the scan (read it, apply W9 to W11 if it holds raw controls); `components/boardlab/ShortcutsDialog.tsx`: no hits in the scan (read it, apply W9 to W11 if it holds raw controls). Notable lines: `PinoutTable.tsx:25` is a raw `<select className="ink-field py-0">` and the file has 7 off scale spacings and two `ink-` classes; `WireInPanel.tsx:15-24` holds ten wire colour hexes (data, they stay and are on the allow list) and uses `size="lg"` on a `Button` (alias to remove); `WorldPanel.tsx:25,60` has a raw `<button>` and `<input>`; `ShortcutsDialog.tsx` (24 lines) renders `Kbd` rows in a `Dialog`. |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. `PinoutTable`: `Select hideLabel`, table cells `text-sm`, header cells `text-xs font-semibold text-muted`, numbers `tabular`, pin names in `font-mono` (data table: mono allowed). `WireInPanel`: `Button size="md"`; wire swatches stay as inline colour data. `WorldPanel`: `Toggle`/`TextInput`/`Button` from the kit. `ShortcutsDialog`: unchanged structure on the new `Dialog`; `Kbd` rows `gap-2`. Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | `PinoutTable.tsx:25`; `WireInPanel.tsx:15-24` and its `size="lg"` use; `WorldPanel.tsx:25,60`; `ShortcutsDialog.tsx:1-24`; test id `pinout`. |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. Pin table row height 40 px (`h-10`), dividers 1 px `--rule`; wire swatch `size-4 rounded-md` (square, not a circle). |
| **States** | Pinout: capability filter all or one, empty result. Wire panel: no wires, partly wired, wired. World panel: default, edited. Shortcuts dialog: open, closed. |
| **i18n** | None (rule W15).  |
| **Tests** | No component unit test exists for these files (VERIFIED `ls`); the e2e specs below carry the behaviour. Playwright: `E bu-23 e2e/boardlab.spec.ts`. Screenshots (1.5) of `/en/boards/uno-r3` pinout tab and the shortcuts dialog (`?`) at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given the pinout tab, When I choose a capability, Then rows filter and the table keeps its header; given `?`, Then the shortcuts dialog opens on the new Dialog. `UIC` prints 0 for the four files (the wire hexes are allow listed). |
| **Proof commands** | `TL`; `V src/components/boardlab`; `UIC src/components/boardlab/PinoutTable.tsx src/components/boardlab/WireInPanel.tsx src/components/boardlab/WorldPanel.tsx src/components/boardlab/ShortcutsDialog.tsx`; `BUILD bu-23`; `E bu-23 e2e/boardlab.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-56 removes the `size="lg"` alias from `Button.tsx` once this task, T-BU-41 and T-BU-45 stopped passing it. |

---

### T-BU-24. Full height mobile panel and the animated menu icon

| Field | Content |
|---|---|
| **Identity** | Id T-BU-24. Subsystem shell. Phase BU. Priority P0. Dependencies T-BU-19. Group G6. Source files: 3 (`shell/MobileNav.tsx`, `shell/MenuIcon.tsx`, `shell/nav-stagger.ts`). |
| **Problem** | The phone menu is a 22 rem side drawer (`MobileNav.tsx:28-37`, `Sheet side="end"` with `w-[min(22rem,88vw)]`) opened by a swapping hamburger `IconButton icon="menu"` (`:26`); the links appear at once; settings sit under the links in the same scroll. UI_RULES: a full height panel with links arriving 60 ms apart in under 400 ms, an animated menu icon, the panel at the theme's base surface at high opacity with a strong blur. |
| **Expected behaviour** | `MenuIcon` draws three 2 px bars (`span`s, 20 px wide, 6 px apart) that morph into a cross with transforms only: top and bottom bars translate 6 px and rotate 45 and -45 degrees, the middle bar scales to 0 and fades, over 500 ms on the base curve (`motion-move`); `aria-hidden`. `MobileNav` renders, below `lg`, an `IconButton` (name "Menu"/"Close menu" from the existing strings, `aria-expanded`, `aria-controls`) containing `MenuIcon open={open}`. The open panel is `fixed inset-0 z-overlay h-dvh bg-paper/95 backdrop-blur-2xl` with `animate-fade-in`. It renders through `createPortal(..., document.body)` like `ui/Sheet.tsx:38`, because `NavBar` has `backdrop-blur-xl` and `rounded-2xl` and an ancestor with a `backdrop-filter` becomes the containing block of `fixed` descendants, which would clip the panel to the bar; it reuses `useModal` for the focus trap and the scroll lock; it holds a top row (logo link and the same toggle button at the same screen position as the bar's, so the icon reads as one object morphing), the link list (`NavLinks layout="sheet"` from T-BU-19: each `li` has `--i` and `stagger-in`; `nav-stagger.ts` exports `staggerDelay(index, stepMs = 60, capMs = 360)` and the sheet sets `style={{ "--i": index }}` for CSS, with the function used by the unit test as the specification), then the settings (`SettingsPanel`) under a 1 px rule. Focus is trapped (`useModal`), Escape and a link click close it, `body` scroll is locked while open, the first link takes focus on open. Under reduced motion links fade in place (travel 0). |
| **Existing files** | `shell/MobileNav.tsx:1-38`; `shell/NavLinks.tsx` sheet layout (T-BU-19); `ui/useModal.ts` (trap, scroll lock); `ui/Sheet.tsx` (no longer used here; stays for the dock); `shell/SettingsMenu.tsx` `SettingsPanel` export (T-BU-17). |
| **New files** | `shell/MenuIcon.tsx`, `shell/nav-stagger.ts`, test `shell/nav-stagger.test.ts`. |
| **Design values** | Section 1.2 Motion: link rise 24 px, 500 ms, steps of 60 ms, last link starts at or before 360 ms so the sequence ends well under 400 ms of stagger; panel fade 300 ms; icon morph 500 ms. Links `text-2xl font-semibold`, rows `py-3`, 1 px `--rule` between rows. Panel padding 16 horizontal (the bar's `px-2` plus 8). |
| **States** | closed, opening, open, closing (immediate unmount, no exit animation), focus on first link, reduced motion. |
| **i18n** | None (the strings `nav.menu`, `nav.closeMenu`, `nav.label` exist). |
| **Tests** | `nav-stagger.test.ts`: `staggerDelay(0)` is 0, `(1)` is 60, `(5)` is 300, `(9)` is 360 (cap), non integer and negative input clamp. `MobileNav` jsdom test (`MobileNav.test.tsx`, new): the toggle has `aria-expanded` false then true; the open panel has `role="dialog"` and `aria-modal` and its `parentElement` is `document.body`; Escape closes and returns focus to the toggle; the links carry `--i` 0..n-1. Playwright (added to `e2e/dock.phone.spec.ts`, counted as test): at 390x844 with the bar present, open the menu, assert the panel covers the full viewport (`getBoundingClientRect` height equals `innerHeight`), the last link's computed `animation-delay` is at most 360 ms, and with `reducedMotion: "reduce"` the first link's computed `transform` is `none`. |
| **Acceptance** | Given 390x844, When I tap the menu icon, Then the three bars become a cross over half a second, a full height blurred panel appears, and the links rise into place one after another, the last one starting no later than 360 ms. Given a link tap, Then the panel closes and the page navigates, with the current page marked. |
| **Proof commands** | `TL`; `V src/components/shell`; `UIC` on the three files; `E bu-24 e2e/dock.phone.spec.ts e2e/shell.spec.ts`; screenshots of the open menu at 390x844 in light and dark and of 768x1024 (1.5). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-57 screenshots the open menu. |

---

### T-BU-25. Footer, legal links, privacy page

| Field | Content |
|---|---|
| **Identity** | Id T-BU-25. Subsystem shell, ship. Phase BU. Priority P0. Dependencies T-BU-08, 11, 19, 26. Group G6. Source files: 4 (`shell/SiteFooter.tsx`, `shell/FooterNav.tsx`, `app/[lang]/privacy/page.tsx`, `src/i18n/messages/*/shell.json` as one set). |
| **Problem** | The footer is a four column link farm with a 400 px wordmark and a privacy sentence but no privacy page, no terms and no licence status (`SiteFooter.tsx:11-46`, `FooterNav.tsx:10-76`: `text-[15px]`, `shell-meta` headings, a language column of six links). Ship items: privacy link in the footer, licence status, way back. |
| **Expected behaviour** | Footer, one block: left, the logo (height 24, not decor sized) and the site description (`common site.description`, `text-sm text-muted max-w-prose`); a short link row of the main paths (Board lab, Robotics lab, Drone lab, Together, About), then a legal row: **Privacy** (`/{lang}/privacy`), **Licence status** (`/{lang}/about#about-licence-{lang}`, the licence section that exists on the About page), **Source code** (the repository URL, B1's `REPO_URL`, `rel="noopener noreferrer"`, `target="_blank"`, external icon), and the Colorfigures credit; then the six languages as one inline row of `lang`/`hrefLang` links (kept: they are the crawlable language switch; the active one has `aria-current="true"`); then one sentence of privacy (`footer.privacy`, B1's wording) and one of licence (`footer.licence`: "Licence: not chosen yet. Figures: MIT, by April Zhu." until Amar decides). `/privacy` page (Editorial `PageHead` and three `Section`s): "What stays in your browser" (progress, settings, language cookie `iynk-lang`, keys if you add them: `iynk:v1`, `iynk:keys:v1`), "What leaves your browser" (nothing unless you use a room, which sends your name, cursor, chat and voice to the room relay, or you add a key, which is sent to your own iynk server for each AI or search call and not stored there), "What we do not do" (no accounts, no ads, no analytics: the usage counts are a local log you can read and clear). The builder verifies each claim in code before writing it (`LANG_COOKIE` in `i18n/config.ts:15`, `STORAGE_KEY` in `lib/progress/storage.ts`, B0 telemetry off, B1 keys store) and states in the commit which file proved which sentence. The page imports `PageHead` and `Section` from `@/components/editorial/Editorial` (T-BU-26) and `PageSkeleton` from `@/components/ui` (T-BU-11). |
| **Existing files** | `shell/SiteFooter.tsx:1-47`; `shell/FooterNav.tsx:1-76`; `app/[lang]/about/page.tsx:93-118` (the licence section and its id `about-licence-${lang}`); `i18n/config.ts:15,20-27` (`LANG_COOKIE`, names); `i18n/seo.ts` (`alternatesFor`); messages `shell.json` `footer.*`. |
| **New files** | `app/[lang]/privacy/page.tsx` (static, `generateMetadata` with `alternatesFor(lang, "/privacy")`, `Suspense` + `PageSkeleton kind="article"` like the other pages). |
| **Design values** | Footer: `border-t` 1 px rule, padding `py-12 md:py-16` (48 and 64), links `text-sm`, `gap-x-6 gap-y-2`, each link `min-h-11` on touch; no mono, no uppercase headings; the page width is `page` from Editorial. Privacy page: article measure `max-w-prose`, headings `text-2xl font-semibold`, body `text-base`. |
| **States** | links: default, hover (`text-ink`), focus, current language (`aria-current`). Privacy page: loading (skeleton), ready. |
| **i18n** | `shell.json`: `footer.privacyLink` ("Privacy"), `footer.licenceLink` ("Licence status"), `footer.sourceLink` ("Source code"), `footer.licence` (as above), `footer.labs` ("Labs"), changed `footer.privacy` only if B1's wording is not already right; `privacy.metaTitle`, `privacy.metaDescription`, `privacy.title`, `privacy.lede`, `privacy.stays.title`, `privacy.stays.text`, `privacy.leaves.title`, `privacy.leaves.text`, `privacy.never.title`, `privacy.never.text`. Six languages; the remove list (`footer.pages`, `footer.figures` if unused) is checked with `git grep`. |
| **Tests** | vitest `src/components/shell/SiteFooter.test.tsx` (new, server component rendered through its async function with a stub translator, or a Playwright check if the server only path is awkward): privacy, licence and source links exist with the right hrefs; the active language has `aria-current`. Playwright in `e2e/shell.spec.ts` (counted as test): the footer has a link named Privacy that opens `/en/privacy` with an `h1`; the page passes axe; `/hi/privacy` renders Devanagari. `src/i18n/messages.test.ts` covers key parity. |
| **Acceptance** | Given any page, When I scroll to the footer, Then I can open Privacy, Licence status and Source code, switch language, and read one line on privacy and one on the licence. Given `/en/privacy`, Then each sentence matches what the code does (listed in the commit). |
| **Proof commands** | `TL`; `V src/components/shell src/i18n`; `UIC` on the three source files; `E bu-25 e2e/shell.spec.ts`; screenshots `/en` footer and `/en/privacy` at both sizes, both themes (1.5). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-49 lists `/privacy` in the sitemap. |

---

### T-BU-26. Editorial page grammar

| Field | Content |
|---|---|
| **Identity** | Id T-BU-26. Subsystem pages. Phase BU. Priority P0. Dependencies T-BU-08, 10, 11. Group G6. Source files: 2 (`editorial/Editorial.tsx`, `marketing/index.tsx`); deletes `marketing/marketing.css` (a delete is not counted). |
| **Problem** | The shared page grammar sets headlines through `mk-display` (`clamp(44px,7vw,104px)`, `mk-accent` serif italic, `marketing.css:11-47`), sections with `mt-[clamp(72px,10vw,160px)]` (`Editorial.tsx:101`), `text-[17px] leading-[1.55]` ledes, `text-[11px]` eyebrows, and animation by `ease-out` utilities; `actionClass` is an ink pill; `quietField` is a bordered 10 px field with `text-[15px]` (`Editorial.tsx:20-31`); `Note` has a one sided border (`:124`). `Accent` turns `*word*` into an `<em>` (`marketing/index.tsx:18-29`). |
| **Expected behaviour** | `typeClass` becomes Tailwind class strings: `display` `text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-balance lang-air`, `title` `text-3xl md:text-4xl font-semibold tracking-tight text-balance lang-air`, `eyebrow` `kicker`, `rise` `animate-rise-in` (`lang-air` is the Hindi and Han line height class from T-BU-05); `marketing.css` is deleted and its import removed. `Accent` returns the text with the `*` characters removed (no `<em>`, no italic); it exists only until T-BU-43 rewrites the home page and T-BU-51 deletes it. `Wrap` and the Editorial `page` frame use `mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-12`. `PageHead`: title `max-w-[680px]`, lede `text-base md:text-lg text-muted max-w-prose`; `Section`: `mt-16 md:mt-24 border-t border-rule pt-6 sm:pt-8`, title `text-2xl md:text-3xl font-semibold`; `enter` becomes `animate-rise-in`. `actionClass`/`Action`/`ActionLink` build on `buttonClass("primary" or "secondary", "md")` so the pages outside the labs use the one button. `quietField` is an alias of the new field class exported by `ui/Field.tsx` (removed with `Lobby`'s migration, T-BU-45/51). `Note` becomes a `rounded-lg bg-sunken p-4` block (no one sided border) with an optional icon. `CtaLink` renders `ButtonLink` primary with `arrow-right`; `ArrowLink` is a text link with an `arrow-right` icon that nudges 2 px on hover (`motion-move`); `SectionHead` keeps its 1 px rule and uses `kicker` for the number. Where the helpers live: `typeClass`, `Wrap`, `SectionHead`, `riseDelay`, `CtaLink`, `ArrowLink` and `Accent` move out of `marketing/index.tsx` into `editorial/Editorial.tsx` (this task owns both files), `Editorial.tsx` stops importing `@/components/marketing`, and `marketing/index.tsx` becomes the one line `export { typeClass, Wrap, SectionHead, riseDelay, CtaLink, ArrowLink, Accent } from "@/components/editorial/Editorial";`. The old importers (`app/[lang]/page.tsx`, `DashboardProgress.tsx`, `Catalogue.tsx`, `not-found.tsx`) keep compiling through that line until their own tasks (27, 43, 48) repoint them to `@/components/editorial/Editorial`; T-BU-56 deletes the folder. |
| **Existing files** | `editorial/Editorial.tsx:10-24,26-52,80-122,124-133`; `marketing/index.tsx:1-89`; `marketing/marketing.css:1-85`. Importers of `@/components/marketing` (VERIFIED by `git grep` at `build/v1`): `app/[lang]/page.tsx`, `app/[lang]/not-found.tsx`, `editorial/Editorial.tsx`, `shell/dashboard/DashboardProgress.tsx`, `catalogue/Catalogue.tsx`; the about, together and lobby pages import Editorial, not marketing. |
| **New files** | none. |
| **Design values** | Section 1.2. Hero heading and subheading `max-w-[680px]` (also page heads). Section rhythm 64 and 96 px. No hyphens in running text (`hyphens-auto` is dropped from the head). |
| **States** | `Action`: the button states of T-BU-08. `Note`: static. |
| **i18n** | None. |
| **Tests** | vitest `components/editorial/Editorial.test.tsx` (new): `PageHead` renders an `h1` with the 680 cap class; `Section` renders `section` labelled by its heading; `Accent("a *b* c")` returns `a b c` and contains no `em`; `marketing/index.tsx` re-exports the same function objects as `Editorial.tsx`; `Note` has no `border-s`. The existing e2e specs stay green (`E bu-26 e2e/shell.spec.ts`). |
| **Acceptance** | Given `/en/about`, When it loads, Then the head is one face, no italic word, 680 px wide at most; sections are spaced 64 or 96 px. `UIC` prints 0 on `Editorial.tsx` and `index.tsx`. |
| **Proof commands** | `TL`; `V src/components/editorial`; `UIC src/components/editorial/Editorial.tsx src/components/marketing/index.tsx`; `BUILD bu-26`; `E bu-26 e2e/shell.spec.ts`; screenshots `/en/about`, `/en/together` (1.5). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-25, 27, 31, 36 to 40 and 48 import `Wrap`, `SectionHead`, `typeClass`, `PageHead`, `Section`, `CtaLink`, `ArrowLink` from `@/components/editorial/Editorial`. T-BU-56 deletes `marketing/`. T-BU-51 adds reveals and removes `quietField`, `enter` and `Accent`. |

---

### T-BU-27. Catalogue, dashboard progress, figure frame chrome

| Field | Content |
|---|---|
| **Identity** | Id T-BU-27. Subsystem pages, figure. Phase BU. Priority P0. Dependencies T-BU-08, 10, 11, 26. Group G6. Source files: 4 (`catalogue/Catalogue.tsx`, `shell/dashboard/DashboardProgress.tsx`, `figure/FigureStill.tsx`, `figure/FigureFrame.tsx`). |
| **Problem** | `Catalogue.tsx` sets its own `eyebrow` (mono caps with `text-[11px]` and `tracking-[0.08em]`, `:16`), page padding with three `clamp()`s (`:18-24`), a count in `text-[clamp(64px,9vw,152px)]`, `enter` with `duration-400 ease-out` (`:13`) and a `z-10` (`:184`); `DashboardProgress.tsx` imports `CtaLink`/`ArrowLink` from the marketing helpers; `FigureStill.tsx:28` zooms with `duration-300 ease-out group-hover:scale-[1.04]`; `FigureFrame.tsx:309,311` draws its controls panel as `ink-card ... shadow-ink` with `z-10`, `:360,370,382` uses `ink-plate` and `transition-opacity duration-500`, `:400-415` the pressable controls as `rounded-full border-2 border-line` pills. The art inside the iframe is not touched. |
| **Expected behaviour** | `Catalogue`: `eyebrow` becomes `kicker`; page padding `px-4 sm:px-6 lg:px-10 xl:px-12 pt-10 md:pt-16 pb-16 md:pb-24`; the count `text-7xl lg:text-8xl font-semibold tabular tracking-tight`; cells keep their hairline grid and subgrid rows; hover on a card shows the title underline and the still scales 105 percent with `motion-move`; `z-sticky` only where needed. `HeroActions` keeps its props and logic and renders `ButtonLink variant="primary"` (with an `arrow-right` icon) plus a `ButtonLink variant="ghost"` text style for browse; the progress lines keep `tabular`. `FigureStill`: `group-hover:scale-105 motion-move`. `FigureFrame`: the controls panel `rounded-2xl bg-raised shadow-lg z-sticky`; control buttons are `Button secondary sm` with `aria-pressed` (selected = `solid`); plate states use `motion-fade` (300 ms) for the poster fade; the loading plate title is `text-lg font-semibold` (not `font-head`); `FigureFrame` swaps `ink-plate` for `plate` (1 px frame, `rounded-xl`) and `ink-card` for the new panel classes. The postMessage protocol, the lazy iframe and `FigureStill`'s decorative `alt=""` are unchanged. `Catalogue` imports `typeClass`, and `DashboardProgress` imports `CtaLink` and `ArrowLink`, from `@/components/editorial/Editorial` (moved there by T-BU-26), not from `@/components/marketing`. |
| **Existing files** | `catalogue/Catalogue.tsx:13-31,33-82,84-140,142-201,203-231`; `shell/dashboard/DashboardProgress.tsx:1-10,60-118`; `figure/FigureStill.tsx:1-32`; `figure/FigureFrame.tsx:300-427`; test ids `progress-uno-r3`, `figure-log`, `figure-readout`, `board-lessons`. |
| **New files** | none. |
| **Design values** | Section 1.2; the figures stay: do not edit `figures/`, `public/figures/`, the engine protocol. |
| **States** | Card: default, hover, focus-within (the existing 2 px outline around the whole card via `has-[a:focus-visible]` stays but as `outline-2 outline-offset-2`). Figure: loading (poster or plate), ready, failed (inline `bad` text with the existing retry), controls open. |
| **i18n** | None. |
| **Tests** | `e2e/shell.spec.ts`, `e2e/boardlab.spec.ts` (figure bridge, controls). A new vitest `Catalogue.test.tsx` is not needed; the grid is covered by the page specs. `components/data/components.test.tsx` is deleted by B0. |
| **Acceptance** | Given `/en/boards`, When it loads, Then twelve cells sit in a hairline grid with a big count, rows align across a line of cards, and hovering a still scales it without moving the text. Given a figure, Then its controls panel is a tinted shadow card and the art is unchanged. |
| **Proof commands** | `TL`; `V src/components`; `UIC` on the four files; `E bu-27 e2e/boardlab.spec.ts e2e/shell.spec.ts e2e/robotics.spec.ts`; screenshots `/en/boards`, `/en/drones`, a figure with controls open (1.5). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-36 renders `HeroActions` and `FigureFrame` in the hero. |

---

### T-BU-28. Sweep: robotics lab 1 (workspace, steps, faults, serial)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-28. Subsystem robotics. Phase BU. Priority P0. Dependencies T-BU-08 to 14. Group G6. Source files: 5 (`components/robotics/BenchWorkspace.tsx`, `components/robotics/Fold.tsx`, `components/robotics/FaultsPanel.tsx`, `components/robotics/SerialPanel.tsx`, `components/robotics/StepsPanel.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `components/robotics/BenchWorkspace.tsx` (565 lines): 5 off-scale spacing, 1 old `ink-*` class, 2 rounded-ink or arbitrary radius, 2 hard shadow, 8 icon or svg, 1 `font-ui`; `components/robotics/Fold.tsx` (16 lines): 1 bad easing or animated property, 1 icon or svg; `components/robotics/FaultsPanel.tsx` (85 lines): 3 off-scale spacing, 1 palette colour; `components/robotics/SerialPanel.tsx` (71 lines): 1 `font-ui`; `components/robotics/StepsPanel.tsx` (144 lines): 2 off-scale spacing, 6 icon or svg, 2 `font-ui`. Notable lines: `BenchWorkspace.tsx` has eight icon uses, two `shadow-ink` and two `rounded-ink`; `Fold.tsx:` (16 lines) is a `<details>` with a `transition ease-out` chevron; `FaultsPanel.tsx:46` marks an active fault with `bg-bad-bg on-fill before:... before:w-1` (a one sided bar done with a pseudo element); `StepsPanel.tsx` has six icon uses and mono step numbers; `SerialPanel.tsx` is a console wrapper with `font-ui`. |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. `Fold` uses `Icon chevron-right` rotating 90 degrees with `motion-move`. `FaultsPanel` active fault: `rounded-lg bg-bad-bg` fill with a `warn` icon (no pseudo bar); `on-fill` is no longer needed in dark because `--bad-bg` is `#272727` there. `StepsPanel` steps: done (check icon in `good`), current (accent dot, `aria-current="step"`), upcoming (muted); numbers `tabular`. `SerialPanel` keeps the console look from T-BU-22. `BenchWorkspace` keeps the `WorkspaceFrame`; shadows removed. Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | `BenchWorkspace.tsx` (565 lines; tests `BenchWorkspace.test.tsx`); `Fold.tsx:1-16`; `FaultsPanel.tsx:46`; `SerialPanel.tsx`; `StepsPanel.tsx`; test ids `bench-status`, `build-count`. |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. Step rows `min-h-11`, check icon 20; fold summary `text-sm font-semibold`. |
| **States** | Steps: done, current, upcoming, locked. Faults: none, active. Serial: empty, streaming. Bench: loading (skeleton for the rail), ready. |
| **i18n** | None (rule W15).  |
| **Tests** | `BenchWorkspace.test.tsx` keeps passing; update class quoting assertions only. Playwright: `E bu-28 e2e/robotics.spec.ts`. Screenshots (1.5) of `/en/robotics/l298n` at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given a bench page, When a fault is switched on, Then its row shows a tinted fill with a warning icon and text, with no side bar. `UIC` prints 0 on the five files. |
| **Proof commands** | `TL`; `V src/components/robotics`; `UIC src/components/robotics/BenchWorkspace.tsx src/components/robotics/Fold.tsx src/components/robotics/FaultsPanel.tsx src/components/robotics/SerialPanel.tsx src/components/robotics/StepsPanel.tsx`; `BUILD bu-28`; `E bu-28 e2e/robotics.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing; T-BU-56 deletes the compatibility aliases once every sweep has landed. |

---

### T-BU-29. Sweep: robotics lab 2 (quiz, status, tasks)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-29. Subsystem robotics. Phase BU. Priority P0. Dependencies T-BU-08 to 14. Group G6. Source files: 3 (`components/robotics/QuizPanel.tsx`, `components/robotics/StatusPanel.tsx`, `components/robotics/TasksPanel.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `components/robotics/QuizPanel.tsx` (189 lines): 1 off-scale spacing, 1 rounded-ink or arbitrary radius, 1 extra bold, 1 icon or svg, 1 `font-ui`, 1 raw control; `components/robotics/StatusPanel.tsx` (216 lines): 4 off-scale spacing, 1 old `ink-*` class, 4 `font-ui`; `components/robotics/TasksPanel.tsx` (211 lines): 5 off-scale spacing, 3 old `ink-*` class, 2 rounded-ink or arbitrary radius, 3 icon or svg, 3 `font-ui`, 1 raw control. Notable lines: `QuizPanel.tsx:116` sets the score in `font-extrabold` and `:165` is a raw `<input>` for a numeric answer; `StatusPanel.tsx` has four off scale spacings and four mono labels (the readouts themselves are numbers and may stay mono); `TasksPanel.tsx:121` is a raw `<textarea>` for notes, with five off scale spacings, three `ink-*` classes and three mono labels. |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. Quiz score `text-3xl font-bold tabular`; the numeric answer is a `TextInput` (`inputMode="decimal"`) with `error` for a wrong format and a `InlineStatus` for right or wrong; `StatusPanel` readouts are `StatStrip`-style: label `kicker`, value `tabular` mono `text-lg font-semibold`; `TasksPanel` notes use `TextArea`, task rows use `Toggle` or a native checkbox in a labelled row, unlock text is plain. Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | `QuizPanel.tsx:116,165`; `StatusPanel.tsx` (unit test `StatusPanel.test.tsx`); `TasksPanel.tsx:121`. |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. Readout value `font-mono tabular` (numeric readout exception), label Geist. |
| **States** | Quiz: unanswered, correct, wrong, locked; empty answer error inline. Tasks: not started, in progress, done. Status: ok, warn, over limit. |
| **i18n** | None (rule W15).  |
| **Tests** | `StatusPanel.test.tsx` keeps passing. Playwright: `E bu-29 e2e/robotics.spec.ts`. Screenshots (1.5) of `/en/robotics/l298n` quiz tab and tasks tab at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given a wrong numeric answer, When I submit, Then the message shows under the field with `aria-invalid` and the page does not shift. `UIC` prints 0. |
| **Proof commands** | `TL`; `V src/components/robotics`; `UIC src/components/robotics/QuizPanel.tsx src/components/robotics/StatusPanel.tsx src/components/robotics/TasksPanel.tsx`; `BUILD bu-29`; `E bu-29 e2e/robotics.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing; T-BU-56 deletes the compatibility aliases once every sweep has landed. |

---

### T-BU-30. Sweep: hardware twin and drone lab panels (craft progress, tests, quiz, wiring)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-30. Subsystem hw, dronelab. Phase BU. Priority P0. Dependencies T-BU-08 to 14. Group G6. Source files: 5 (`components/hw/HardwareTwinPanel.tsx`, `components/dronelab/CraftProgress.tsx`, `components/dronelab/TestsPanel.tsx`, `components/dronelab/QuizPanel.tsx`, `components/dronelab/WiringPanel.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `components/hw/HardwareTwinPanel.tsx` (323 lines): 1 off-scale spacing, 5 old `ink-*` class, 3 rounded-ink or arbitrary radius, 1 extra bold, 1 palette colour, 9 `font-ui`; `components/dronelab/CraftProgress.tsx` (66 lines): 1 bad easing or animated property, 1 palette colour; `components/dronelab/TestsPanel.tsx` (96 lines): 1 off-scale spacing, 3 palette colour, 2 `font-ui`, 3 one sided bar; `components/dronelab/QuizPanel.tsx` (107 lines): 1 palette colour, 2 `font-ui`; `components/dronelab/WiringPanel.tsx` (103 lines): 3 off-scale spacing, 1 rounded-ink or arbitrary radius, 1 icon or svg, 2 `font-ui`, 1 raw control. Notable lines: `HardwareTwinPanel.tsx:91` is a hand rolled `animate-pulse` loading block, `:230` draws the report dot with `border border-line`, `:308` uses `font-extrabold` and the file has five `ink-*` and nine mono uses; `CraftProgress.tsx:51` animates `width` (`transition-[width] duration-700`) on a mustard bar; `TestsPanel.tsx:68,69,71` mark results with `border-s-4 border-mint` and `border-s-4 border-tomato`; `dronelab/QuizPanel.tsx:75` forces `!bg-mint !text-on-color` on the right answer; `WiringPanel.tsx:92` prints `→`, `:33` is a raw `<button>`, `:10-15` are wire role colours (data, stay). |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. `HardwareTwinPanel`: loading is a `SkeletonGroup`, the report dot is a `size-2 rounded-full` `good`/`bad`, table cells are data (mono allowed for pin names and numbers), header weight `font-bold`. `CraftProgress` uses `Meter` (scaleX). `TestsPanel` results are `InlineStatus tone="good"` / `"bad"` rows with icons (no side bar). Drone `QuizPanel` right answer shows a `check` icon and `good` text on `--good-bg`. `WiringPanel` replaces the arrow glyph with `Icon arrow-right` (16) and the button with `Button`. Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | `HardwareTwinPanel.tsx:91,230,308` (test `HardwareTwinPanel.test.tsx`); `CraftProgress.tsx:51`; `TestsPanel.tsx:68-71`; `QuizPanel.tsx:75`; `WiringPanel.tsx:10-15,33,92`; test ids `tests-count`, `arming-rules`. |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. Meter bar 8 px; state rows `rounded-lg px-3 py-2`. |
| **States** | Twin: loading, not connected, connecting, connected, error. Tests: pending, running, passed, failed with retry. Quiz: unanswered, right, wrong. |
| **i18n** | None (rule W15).  |
| **Tests** | `HardwareTwinPanel.test.tsx` keeps passing. Playwright: `E bu-30 e2e/dronelab.spec.ts e2e/robotics.spec.ts`. Screenshots (1.5) of `/en/drones/quad5` tests tab and wiring tab at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given the tests tab, When a test fails, Then the row shows a red icon, the failure text and a retry button, with no side bar. `UIC` prints 0 (wire colours allow listed). |
| **Proof commands** | `TL`; `V src/components/hw src/components/dronelab`; `UIC src/components/hw/HardwareTwinPanel.tsx src/components/dronelab/CraftProgress.tsx src/components/dronelab/TestsPanel.tsx src/components/dronelab/QuizPanel.tsx src/components/dronelab/WiringPanel.tsx`; `BUILD bu-30`; `E bu-30 e2e/dronelab.spec.ts e2e/robotics.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing; T-BU-56 deletes the compatibility aliases once every sweep has landed. |

---

### T-BU-31. Home copy: `home` namespace in six languages

| Field | Content |
|---|---|
| **Identity** | Id T-BU-31. Subsystem i18n. Phase BU. Priority P0. Dependencies T-BU-11, 26 (B1 done). Group G7. Source files: 3 (`src/i18n/namespaces.ts`, `src/i18n/messages/*/home.json` as one new set, `src/components/home/primitives.tsx`). |
| **Problem** | The home copy lives in `shell.json` `dashboard.*` (`:48-130`), is written for a launch, carries two `*star*` accent markers (`:50`, `:125`), a together section that B1 removes, and B1's rewritten lede and open source strings. Six home section tasks would collide in `shell.json`, which is also edited by T-BU-15, 19 and 25. |
| **Expected behaviour** | A new namespace `home` with its own six files, so the home sections read one file and nothing else touches it. `namespaces.ts` gets `"home"` in `NAMESPACES` and in the `Messages` type. The strings (English below) are plain, specific and sentence case, with no filler words, no exclamation marks, no hyphens inside sentences and no fake proof. A message may hold `\n` where the headline should break; the section renders it as a line break (meaningful breaks per landing B5). Keys and English: `meta.title` "iynk: a hardware lab in your browser"; `meta.description` "An open source workbench for circuits, boards, robots and drones. Wire parts, write code, run it and break it on purpose, in your browser, with no account."; `hero.kicker` "Open source hardware workbench"; `hero.title` "Learn hardware by wiring it,\nrunning it and breaking it"; `hero.lede` "iynk is an open source workbench for circuits, boards, robots and drones. Wire parts, write code, run it, and watch the simulation answer, all in your browser."; `hero.cta` "Open the workbench"; `hero.browse` "Browse the boards"; `hero.reassure` "No account. Nothing to install. Your work stays in this browser."; `hero.proof` "{boards} boards, {benches} robotics benches and {drones} drones, each one runnable."; `hero.figure` "Arduino Uno R3 running Blink on a breadboard, live: drag to turn it"; `tagline.text` "Wire a part the wrong way and watch it fail. Fix it, and watch it work. That is when the datasheet finally makes sense."; `benefits.title` "What you can do here"; `benefits.see.title` "See the circuit think"; `benefits.see.text` "Turn a hand drawn 3D board, switch between breadboard and schematic, and watch the pins and the current change as the code runs."; `benefits.code.title` "Write code and get a result"; `benefits.code.text` "Edit Arduino C++, MicroPython or Verilog and press Run. The simulation drives the figure, the pins and the serial monitor."; `benefits.break.title` "Break it, then learn why"; `benefits.break.text` "Leave a resistor off, fit a part backwards, put a motor on the wrong pin. Each fault explains what failed and how to fix it."; `benefits.fly.title` "Fly what you built"; `benefits.fly.text` "Size a drone with the thrust and weight maths, pass the safety tests, then fly it on a range against your best runs."; `labs.title` "Three labs"; `labs.open` "Open the {lab}"; `labs.boards`, `labs.robotics`, `labs.drones` (each: `text`, `unit`; the board lab text "From the Arduino Uno R3 to two FPGA boards: lessons, a live code editor, schematic and breadboard views, a serial monitor and failures that really trigger.", the robotics text "Motor drivers, sensors and power stages, built part by part with live status and current draw.", the drones text "From a Tiny Whoop to an octocopter: build it part by part, check the maths, pass the safety tests, then fly."); `how.title` "How it works"; `how.1.title` "Pick a part", `how.1.text` "Choose a board, a robotics bench or a drone. Each opens as a figure you can turn and take apart."; `how.2.title` "Wire it and write code", `how.2.text` "Follow a lesson or start from Blink. The editor, the pinout and the serial monitor sit beside the figure."; `how.3.title` "Run it, then break it", `how.3.text` "Press Run. Switch on a fault, read the check that failed, fix it, and run it again."; `proof.title` "What runs, and what is simulated"; `proof.runs.title` "What runs in your browser"; `proof.runs.1` "Your Arduino C++, MicroPython and Verilog run in interpreters inside the page, on a fixed clock, so the same code gives the same result."; `proof.runs.2` "Pins, the serial monitor and the figure answer your code."; `proof.runs.3` "A circuit solver decides what a mistake does, and shows the current."; `proof.sim.title` "What is simulated"; `proof.sim.1` "The parts follow models of their datasheets, not the real silicon."; `proof.sim.2` "Timing follows the simulation clock, not a chip's."; `proof.sim.3` "Your code is not compiled for the board."; `proof.fidelity` "iynk runs your code in its own interpreter, not on a real chip. It teaches how parts behave; it does not replace a bench, a compiler or a datasheet."; `faq.title` "Questions"; eight pairs `faq.1.q` to `faq.8.a`: "Do I need an account?" "No. There is nothing to register for. Your progress and settings stay in this browser."; "Is it free?" "Yes. It is open source and has no paid tier. If you run your own copy, any AI or search keys you add are your own."; "Which languages does it speak?" "English, Spanish, French, German, Chinese and Hindi, including the labels inside the figures."; "Does my code run on a real board?" "No. It runs in iynk's own interpreter in the page. To use a real board you still need a compiler and a bench."; "How accurate is the simulation?" "Parts follow simple models and the clock is deterministic. Treat the results as teaching, not as a test of your hardware."; "What do the AI features need?" "They are optional. Add your own key under Settings, Keys and usage, and the partner and the shop search switch on. Everything else works without one."; "Where is my work stored?" "In this browser on this device. Clearing site data removes it."; "Can I read or change the code?" "Yes. The source is on GitHub, with a guide to running your own copy and one to contributing."; `open.title` "Open source"; `open.text` "Read it, run your own copy, or send a fix."; `open.readme` "Read the README"; `open.selfHost` "Run your own copy"; `open.contribute` "Contribute"; `end.title` "The bench is ready."; `end.text` "Pick a board and press Run. There is nothing to install and no account to make."; `end.cta` "Open the workbench". The same task creates `src/components/home/primitives.tsx`, so the G8 sections compile before T-BU-43: `export const WORKBENCH_HREF = "/boards/uno-r3"` (B4 changes this one constant); `export function workbenchHref(lang, uno?)` returning the `href` of the first lesson entry of the Uno R3 item when the content has one, else `/` plus the language plus `WORKBENCH_HREF` (the logic of today's `startHref`, `page.tsx:62`); `export const REPO_URL = "https://github.com/kushwahaamar-dev/iynk"` (B1 T-B1-21 keeps its own copy inside `page.tsx`; T-BU-43 removes that copy and imports this one); and `HomeSection({ id, title, children })`, a `section` with `aria-labelledby`, `Wrap` from `@/components/editorial/Editorial`, `mt-16 md:mt-24` and `Reveal` from `@/components/ui`. |
| **Existing files** | `src/i18n/namespaces.ts:4,6-19` (`NAMESPACES`, `Messages`); `src/i18n/messages/en/shell.json:48-130` (`dashboard.*`, to be retired in T-BU-52); B1's `dashboard.open.*`, `dashboard.lede`, `dashboard.metaDescription` (the strings above supersede them; the open source links and the fidelity sentence are B1's, reused word for word); `src/i18n/server.ts:11-14` (loads `./messages/${locale}/${ns}.json`, so no loader change). |
| **New files** | `src/i18n/messages/{en,de,es,fr,hi,zh}/home.json`, `src/components/home/primitives.tsx`; tests `src/i18n/home-copy.test.ts`, `src/components/home/primitives.test.tsx`. |
| **Design values** | Copy rules of UI_RULES: sentence case, plain words, calm, no `!`, no filler words. The banned phrases of B1's copy check (`validated`, `verified against hardware`, `live prices`, `priced live`, `Proof of Build`, `Solana`, `credential`, `sponsor`, `Vercel`, `aims to do everything`, `server re-runs`, a test count) do not appear. Numbers come from `{boards}`, `{benches}`, `{drones}` placeholders filled from the content ids, never typed. No testimonials, no logos, no prices, no counters of users. |
| **States** | Not applicable (strings). |
| **i18n** | The task is the i18n: all six languages in the same commit. Hindi and Chinese use their own words for "workbench" and "simulation" (not transliteration), keep placeholders, and keep the `\n` break where the thought breaks in that language. German, French, Spanish keep sentence case. The translating agent writes in the language's own register and does not copy English sentence shape. `faq.1.a` and `faq.6.a` are translated from the new English wording above, so none of the six languages says "sign up" or "price" (B1's `e2e/home.spec.ts` asserts that no element contains either word). A native reader check is "For Amar" item 3. |
| **Tests** | `src/i18n/messages.test.ts` (existing, loops over `NAMESPACES`): file exists in every language, same keys, same placeholders. New `src/i18n/home-copy.test.ts`: no value in `en/home.json` contains `!`, an em dash, a spaced hyphen, or a filler word from the guard's list, and no value matches `/sign up/i` or `/price/i`; every `faq.N.q` has a matching `faq.N.a`; `hero.proof` has the three placeholders. New `src/components/home/primitives.test.tsx`: `HomeSection` renders a `section` whose `aria-labelledby` points at its heading; `REPO_URL` is exactly `https://github.com/kushwahaamar-dev/iynk`; `workbenchHref("de")` is `/de/boards/uno-r3` and `workbenchHref("en", uno)` returns the first lesson entry. |
| **Acceptance** | Given `getT(lang, "home")` for each of the six languages, When any key is read, Then it resolves and placeholders match English. Given `UIC` R14 on `en/home.json`, Then 0 hits. |
| **Proof commands** | `TL`; `V src/i18n src/components/home`; `UIC src/i18n/messages/en/home.json src/components/home/primitives.tsx`. |
| **Rollback** | `git revert` (nothing reads the namespace yet). |
| **Later tasks need** | T-BU-36 to 40 and 43 read it and import `./primitives`; T-BU-52 deletes the retired `dashboard.*` keys. |

---

### T-BU-32. Sweep: drone lab 2 (workspace, build, keyboard help, CLI console)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-32. Subsystem dronelab. Phase BU. Priority P0. Dependencies T-BU-08 to 14. Group G7. Source files: 4 (`components/dronelab/DroneWorkspace.tsx`, `components/dronelab/BuildPanel.tsx`, `components/dronelab/KeyboardHelp.tsx`, `components/dronelab/CliConsole.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `components/dronelab/DroneWorkspace.tsx` (425 lines): 3 off-scale spacing, 3 old `ink-*` class, 1 rounded-ink or arbitrary radius, 1 hard shadow, 2 icon or svg, 4 `font-ui`; `components/dronelab/BuildPanel.tsx` (190 lines): 4 off-scale spacing, 3 old `ink-*` class, 1 rounded-ink or arbitrary radius, 2 icon or svg, 3 `font-ui`; `components/dronelab/KeyboardHelp.tsx` (90 lines): 2 off-scale spacing, 1 old `ink-*` class, 2 icon or svg; `components/dronelab/CliConsole.tsx` (207 lines): 1 old `ink-*` class, 1 rounded-ink or arbitrary radius, 1 hard shadow, 4 `font-ui`, 1 raw control. Notable lines: `DroneWorkspace.tsx:348,356` use `ink-prose`; the file has three `ink-*` classes, one shadow and four mono labels; `BuildPanel.tsx` has four off scale spacings and three `ink-*` classes; `KeyboardHelp.tsx` is a dialog body of `Kbd` rows with two icon uses; `CliConsole.tsx:137` is a raw `<input>` for the command line (a terminal input, an allowed exception to W9 that still gets the global focus ring) on a console well. |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. Workspace keeps `WorkspaceFrame`; prose uses `prose`. Build steps use the same step row as T-BU-28. CLI console: console look from tokens, input is a bare mono input inside the well with a visible 2 px ring on `:focus-within`, output lines in console colours. Keyboard help on `Dialog` with `Kbd`. Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | `DroneWorkspace.tsx:348,356`; `BuildPanel.tsx`; `KeyboardHelp.tsx`; `CliConsole.tsx:137`; test ids `cli-input`, `cli-output`, `design-tiles`. |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. Console `rounded-xl bg-(--console-bg)`, text `text-sm font-mono`. |
| **States** | CLI: idle, running a command, error output, history empty. Build: step done, current, upcoming. |
| **i18n** | None (rule W15).  |
| **Tests** | No component unit test exists for these files (VERIFIED `ls`); the e2e specs below carry the behaviour. Playwright: `E bu-32 e2e/dronelab.spec.ts`. Screenshots (1.5) of `/en/drones/quad5` build tab and the CLI at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given the CLI, When I type a command and press Enter, Then output appears in the console palette and the input keeps focus with a visible ring. `UIC` prints 0. |
| **Proof commands** | `TL`; `V src/components/dronelab`; `UIC src/components/dronelab/DroneWorkspace.tsx src/components/dronelab/BuildPanel.tsx src/components/dronelab/KeyboardHelp.tsx src/components/dronelab/CliConsole.tsx`; `BUILD bu-32`; `E bu-32 e2e/dronelab.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing; T-BU-56 deletes the compatibility aliases once every sweep has landed. |

---

### T-BU-33. Sweep: drone lab 3 (fly workspace, design panel)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-33. Subsystem dronelab. Phase BU. Priority P0. Dependencies T-BU-08 to 14. Group G7. Source files: 2 (`components/dronelab/FlyWorkspace.tsx`, `components/dronelab/DesignPanel.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `components/dronelab/FlyWorkspace.tsx` (409 lines): 3 off-scale spacing, 3 rounded-ink or arbitrary radius, 1 icon or svg, 3 `font-ui`, 2 raw control; `components/dronelab/DesignPanel.tsx` (223 lines): 13 off-scale spacing, 5 old `ink-*` class, 3 palette colour, 7 `font-ui`, 1 one sided bar, 1 raw control. Notable lines: `FlyWorkspace.tsx:295,364` raw buttons (the fullscreen and settings toggles), three `rounded-ink`, three mono labels, and the `challengeWords` import; `DesignPanel.tsx` has 13 off scale spacings, five `ink-*` classes, three palette colours (`LEVEL_BORDER` maps `danger warn info` to `border-tomato border-mustard border-cobalt` at `:14`), a one sided bar at one place, seven mono uses and a raw `<select>` at `:87`. |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. Fly workspace uses `IconButton` for its two toggles and keeps `WorkspaceFrame phoneStage="full"`. `DesignPanel`: design hints become `Callout` rows by level (`danger`, `warn`, `note`) instead of coloured borders; the select is `Select`; tiles keep `data-testid="design-tiles"`; numbers `tabular`. Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | `FlyWorkspace.tsx:295,364`; `DesignPanel.tsx:14,87` (test `DesignPanel.test.tsx`). |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. Design tiles `rounded-xl bg-surface` with a 1 px rule; hint rows via `Callout`. |
| **States** | Design: no hints, hints by level. Fly: loading range (skeleton), ready, fullscreen. |
| **i18n** | None (rule W15).  |
| **Tests** | `DesignPanel.test.tsx` keeps passing; update only class assertions. Playwright: `E bu-33 e2e/dronelab.spec.ts e2e/fly.spec.ts e2e/fly.phone.spec.ts`. Screenshots (1.5) of `/en/drones/quad5` design tab and `/en/drones/quad5/fly` at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given the design tab with an unsafe battery, When it renders, Then a danger callout shows with an icon and text and no coloured side border. `UIC` prints 0. |
| **Proof commands** | `TL`; `V src/components/dronelab`; `UIC src/components/dronelab/FlyWorkspace.tsx src/components/dronelab/DesignPanel.tsx`; `BUILD bu-33`; `E bu-33 e2e/dronelab.spec.ts e2e/fly.spec.ts e2e/fly.phone.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing; T-BU-56 deletes the compatibility aliases once every sweep has landed. |

---

### T-BU-34. Sweep: flight range, break it, daily challenge

| Field | Content |
|---|---|
| **Identity** | Id T-BU-34. Subsystem flight. Phase BU. Priority P0. Dependencies T-BU-08 to 14. Group G7. Source files: 3 (`components/flight/FlightRange.tsx`, `components/flight/BreakIt.tsx`, `components/flight/DailyChallenge.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `components/flight/FlightRange.tsx` (846 lines): 4 off-scale spacing, 4 old `ink-*` class, 4 rounded-ink or arbitrary radius, 4 hard shadow, 1 icon or svg, 1 raw control; `components/flight/BreakIt.tsx` (61 lines): 1 rounded-ink or arbitrary radius, 1 palette colour, 1 one sided bar; `components/flight/DailyChallenge.tsx` (136 lines): 1 off-scale spacing, 1 old `ink-*` class. Notable lines: `FlightRange.tsx` (846 lines) has four `ink-*` classes, four `rounded-ink`, four hard shadows, four off scale spacings, `z-20` at `:747` for the HUD panel, a raw `<button>` at `:832`, and two data colours at `:143-144` (allow listed); `BreakIt.tsx:55` is `border-s-4 border-tomato` on a status line; `DailyChallenge.tsx` has an off scale spacing and an `ink-` class. |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. HUD overlays: `rounded-xl bg-raised/90 backdrop-blur` with `z-sticky`, `shadow-md`; telemetry numbers `tabular font-mono`; the raw button becomes `IconButton`. `BreakIt` message is an `InlineStatus tone="bad" live`. `DailyChallenge` is a `Panel`-style row with a `Button`. The canvas and simulation timing are untouched (simulation animation follows the simulation clock). Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | `FlightRange.tsx:143-144,747,832` (test `FlightRange.test.tsx`); `BreakIt.tsx:55`; `DailyChallenge.tsx`; test ids `flight-range`, `flight-message`, `flight-telemetry`, `crash-replay`, `crash-why`, `break-it`, `daily-challenge`, `challenge-beat`, `challenge-link`. |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. HUD panel max width `max-w-md`; message toasts use `animate-rise-in`. |
| **States** | Range: ready, flying, crashed (replay), challenge beaten. Break it: idle, broken, repaired. |
| **i18n** | None (rule W15).  |
| **Tests** | `FlightRange.test.tsx` keeps passing. Playwright: `E bu-34 e2e/fly.spec.ts e2e/fly-fun.spec.ts e2e/fly.phone.spec.ts`. Screenshots (1.5) of `/en/drones/quad5/fly` (HUD, after a crash) at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given the fly page, When I crash, Then the replay and the reason panel show on the new surface, tinted shadows, and the telemetry numbers do not jitter (tabular). `UIC` prints 0 (allow listed ghost colours). |
| **Proof commands** | `TL`; `V src/components/flight`; `UIC src/components/flight/FlightRange.tsx src/components/flight/BreakIt.tsx src/components/flight/DailyChallenge.tsx`; `BUILD bu-34`; `E bu-34 e2e/fly.spec.ts e2e/fly-fun.spec.ts e2e/fly.phone.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing; T-BU-56 deletes the compatibility aliases once every sweep has landed. |

---

### T-BU-35. Sweep: gamepad panel and touch sticks

| Field | Content |
|---|---|
| **Identity** | Id T-BU-35. Subsystem flight. Phase BU. Priority P0. Dependencies T-BU-08 to 14. Group G7. Source files: 2 (`components/flight/GamepadPanel.tsx`, `components/flight/TouchSticks.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `components/flight/GamepadPanel.tsx` (160 lines): 1 `font-ui`, 2 raw control; `components/flight/TouchSticks.tsx` (102 lines): 1 palette colour, 1 `font-ui`. Notable lines: `GamepadPanel.tsx:114,143` are raw `<input>` elements (range sliders for dead zone and expo) and the file has a mono label; `TouchSticks.tsx:65` fills the stick knob with `bg-tomato/85` and `border-black/80` (a control, not decoration), plus a mono label. |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. Sliders stay native with a visible ring, `field-label` and a `tabular` value; the stick knob uses `bg-accent` with a 1 px `--ink` outline, the base ring `bg-hover`. Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | `GamepadPanel.tsx:114,143`; `TouchSticks.tsx:65`. |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. The stick base and knob are discs (`rounded-full`): control surfaces, not avatars or buttons, so the only radius exception besides dots and switches; sizes are control sizes, not spacing. |
| **States** | Gamepad: not connected, connected, calibrating. Sticks: idle, active. |
| **i18n** | None (rule W15).  |
| **Tests** | No component unit test exists for these files (VERIFIED `ls`); the e2e specs below carry the behaviour. Playwright: `E bu-35 e2e/fly.phone.spec.ts`. Screenshots (1.5) of `/en/drones/quad5/fly` on the phone size at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given the phone fly page, When I touch the left stick, Then the knob follows in the accent colour. `UIC` prints 0. |
| **Proof commands** | `TL`; `V src/components/flight`; `UIC src/components/flight/GamepadPanel.tsx src/components/flight/TouchSticks.tsx`; `BUILD bu-35`; `E bu-35 e2e/fly.phone.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing; T-BU-56 deletes the compatibility aliases once every sweep has landed. |

---

### T-BU-36. Home: hero

| Field | Content |
|---|---|
| **Identity** | Id T-BU-36. Subsystem home. Phase BU. Priority P0. Dependencies T-BU-11, 26, 27, 31. Group G8. Source files: 3 (`home/Hero.tsx`, `home/hero.css`, `home/HeroFigure.tsx`), all under `src/components/`. |
| **Problem** | The hero is a 12 column grid inside `page.tsx:73-123` with `mk-display` at `clamp(44px,7vw,104px)`, an `Accent` italic word, `text-[17px]`, two competing actions (`HeroActions` CTA plus a browse link, plus the continue-where-you-left-off block), and a live Uno figure with a caption line. Landing Part A: headline of outcome and audience, subheadline, one primary action, one proof signal, a hero visual. Part B5: heading gradient text, 680 px cap, meaningful line breaks. |
| **Expected behaviour** | `Hero` (server component) takes already read props (`t` strings from `home`, counts, `items` and the `start` link) and renders: kicker (`hero.kicker`), `h1` (`hero.title`, split on `\n` into lines, `text-5xl md:text-6xl font-semibold tracking-tight text-balance lang-air max-w-[680px]`, with the gradient text class from `hero.css`), lede (`hero.lede`, `text-lg text-muted max-w-[680px]`), then `HeroActions` (T-BU-27: the one primary button `hero.cta` to `start.href` (built by `workbenchHref` in `./primitives`), plus the quiet browse link; a returning visitor sees "Carry on" as the primary instead), the reassurance line (`hero.reassure`, `text-sm text-muted`), and the proof line (`hero.proof`, `tabular`). The right column is `HeroFigure`: the live `FigureFrame` (`/figures/boards/uno-r3.html?bare=1&view=breadboard&circuit=blink`, `controls={false}`, `hideChrome={["zoom","toast"]}`, `fill`) with `HeroArt` as the poster, in a `rounded-xl` plate; caption `hero.figure` under it in `text-xs text-muted`. `hero.css` holds only the heading gradient: `.hero-title { background: linear-gradient(90deg, var(--hero-from), var(--hero-to)); -webkit-background-clip: text; background-clip: text; color: transparent; }` (the one allowed gradient; allow listed in the guard). No competing actions: the continue block is a single quiet line under the button. Imports: `Wrap` and `typeClass` from `@/components/editorial/Editorial` (T-BU-26), `HeroActions` from `DashboardProgress` (T-BU-27), `HomeSection` from `./primitives` (T-BU-31). |
| **Existing files** | `app/[lang]/page.tsx:73-123` (hero markup, `HERO_CHROME`, `riseDelay`), `:55-62` (`start`, `browse`), `shell/dashboard/DashboardProgress.tsx:85-118` (`HeroActions`), `shell/dashboard/HeroArt.tsx` (next/image of `hero.svg`, unchanged), `figure/FigureFrame.tsx` (props `src`, `title`, `controls`, `hideChrome`, `fill`, `className`, `poster`). |
| **New files** | `home/Hero.tsx`, `home/HeroFigure.tsx` (client boundary only if `FigureFrame` needs it; it is already a client component, so `HeroFigure` may stay server), `home/hero.css`; test `home/Hero.test.tsx`. |
| **Design values** | Section 1.2: gradient light `#000000` to `#666666`, dark `#FFFFFF` to `#9B9B9B`, left to right, text only; heading and lede both `max-w-[680px]`; hero padding `pt-12 md:pt-16 lg:pt-24`; grid gap 24; the figure column `lg:col-span-6`, `min-h-[min(50svh,460px)]` on phone (a size). Entry: heading, lede, actions and figure rise 24 px and fade in order, 60 ms apart (`stagger-in`), once on load; under reduced motion they fade. |
| **States** | CTA: default, hover, active, focus, disabled never. Figure: poster, live, failed (the frame's own). Returning visitor: "Carry on" variant. Keyless and offline: the page does not need any request except the figure. |
| **i18n** | Reads `home.hero.*` (T-BU-31). Hindi and Chinese headings use the `lang-air` line height. |
| **Tests** | vitest `Hero.test.tsx`: the `h1` is split on `\n` into two lines with a `br`, has the 680 cap and the gradient class; exactly one element with the primary CTA text exists; the proof line fills three numbers; no `*` appears. Playwright `e2e/home.spec.ts` (T-BU-43) asserts the same in the browser. |
| **Acceptance** | Given `/en` at 1440x900, When it loads, Then the first screen shows the headline in two meaningful lines with a black to gray gradient, a two sentence lede, one button "Open the workbench", the reassurance line, a proof line with real counts, and the live Uno. Given dark mode, Then the gradient runs white to gray on `#131209`. |
| **Proof commands** | `TL`; `V src/components/home`; `UIC src/components/home/Hero.tsx src/components/home/HeroFigure.tsx src/components/home/hero.css` (R11 passes by allow list entry for `hero.css`); screenshots of the hero at 1440x900 and 390x844, both themes (1.5), once the compose task wires it (until then, render it through a throwaway page in the screenshot script, not committed). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-43 composes it. |

---

### T-BU-37. Home: tagline reveal

| Field | Content |
|---|---|
| **Identity** | Id T-BU-37. Subsystem home. Phase BU. Priority P0. Dependencies T-BU-11, 26, 31. Group G8. Source files: 3 (`home/TaglineReveal.tsx`, `home/tagline-words.ts`, `home/tagline.css`). |
| **Problem** | Landing B11 makes this section mandatory: a large type statement of the core benefit, its own moment further down, at least two lines, words that move one by one from a muted tone to full text colour as the section scrolls into view, in reading order, on the base curve, with no unthrottled scroll listener. The current page has no such section. |
| **Expected behaviour** | `TaglineReveal({ text, locale })`: a `section` with an `aria-label`-free `p` holding the whole sentence as readable text once (`aria-label` is not used; the words are real text, each in a `span`, so screen readers read the sentence normally). `tagline-words.ts` exports `splitWords(text, locale)`: uses `Intl.Segmenter(locale, { granularity: "word" })` and keeps only word like segments with the whitespace between them preserved, so Chinese and Hindi split into words and English splits on spaces; falls back to splitting on spaces when `Intl.Segmenter` is missing. In the browser one `IntersectionObserver` per word (or one observer over all words) with `rootMargin: "0px 0px -40% 0px"` (the trigger line sits at 60 percent of the viewport height) marks a word `data-lit="true"` the first time its top crosses the line; lit words never unlight (reveal once). CSS (`tagline.css`): `.tagline-word { color: color-mix(in oklab, var(--ink) 30%, transparent); transition: color 300ms var(--ease-iynk); } .tagline-word[data-lit="true"] { color: var(--ink); }` (muted at 30 percent of the base text colour; colour transitions are allowed to be 300 ms). Under reduced motion or without `IntersectionObserver`, all words render lit. Text size `text-4xl md:text-5xl lg:text-6xl` (36, 48, 60 px) by length, `font-semibold tracking-tight text-balance lang-air`. Width is capped at `max-w-[680px]` like the hero (B11). Vertical room is `py-24` (96 px) with `min-h-[60svh]` and the text centred in it. Imports `Wrap` from `@/components/editorial/Editorial` (T-BU-26) and `HomeSection` from `./primitives` (T-BU-31). |
| **Existing files** | None (new). Pattern for the observer: `ui/Reveal.tsx` (T-BU-11, `useRevealOnce`). |
| **New files** | `home/TaglineReveal.tsx` (client), `home/tagline-words.ts`, `home/tagline.css`; tests `home/tagline-words.test.ts`, `home/TaglineReveal.test.tsx`. |
| **Design values** | `text-4xl` to `text-6xl` per B11; max width 680 px per B5; muted 25 to 35 percent: 30; trigger line at 60 percent from the top (the word lights when it is above that line); base curve; no scroll listener, no `requestAnimationFrame` loop. The section is separate from the hero, below the fold. |
| **States** | before scroll (all words muted), mid scroll (a prefix lit), complete (all lit, stays lit), reduced motion (all lit at once by CSS: `@media (prefers-reduced-motion: reduce)` and `:root[data-reduce-motion="true"]` set the lit colour with no transition), no JavaScript (`@media (scripting: none)` sets the lit colour, so the sentence is readable without script). |
| **i18n** | Reads `home.tagline.text` in six languages. |
| **Tests** | vitest `tagline-words.test.ts`: English sentence splits into words with spaces preserved and the join equals the input; a Chinese sentence splits into more than one word with the stub segmenter and the join equals the input; missing `Intl.Segmenter` falls back to spaces. `TaglineReveal.test.tsx` with a stub `IntersectionObserver`: words start unlit (after mount), a callback lights the first three in order, they stay lit, `disconnect` is called when all are lit, reduced motion renders all lit. Playwright (in `e2e/home.spec.ts`, T-BU-43): scroll to the section and assert more than one but not all words lit at a mid scroll position, then all lit at the end. |
| **Acceptance** | Given `/en`, When I scroll down to the statement, Then its words change from faint to full colour one after another as they pass the trigger line, never all at once, and do not fade back when I scroll up. Given reduced motion, Then the whole sentence is readable at once. Given the visual spec's `settle()` (T-BU-57), which scrolls the page top to bottom and back, Then every word has `data-lit="true"` before axe runs, so no unlit 30 percent word is scanned (axe `color-contrast` would flag one) and no axe exclusion exists. |
| **Proof commands** | `TL`; `V src/components/home`; `UIC src/components/home/TaglineReveal.tsx src/components/home/tagline-words.ts src/components/home/tagline.css`; screenshot at three scroll positions, both themes (1.5). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-43 composes it right after the hero. |

---

### T-BU-38. Home: labs shelf and how it works

| Field | Content |
|---|---|
| **Identity** | Id T-BU-38. Subsystem home. Phase BU. Priority P0. Dependencies T-BU-11, 26, 27, 31. Group G8. Source files: 3 (`home/LabsShelf.tsx`, `home/HowItWorks.tsx`, `home/labs-data.ts`). |
| **Problem** | The current labs section is three equal columns separated by vertical hairlines (`page.tsx:127-176`, the most generic AI layout, redesign skill "Layout"), with `text-[clamp(56px,6vw,88px)]` counts; the features are a numbered list (`:178-198`) in the same rhythm; there is no "how it works" and no outcome driven benefit layout. |
| **Expected behaviour** | `LabsShelf`: an asymmetric grid: the Board lab is one wide cell (`lg:col-span-7`) with its still and the count; Robotics and Drone labs stack beside it (`lg:col-span-5`, two rows). Each cell: `FigureStill` (from `LAB_STILL`), the count `text-5xl font-semibold tabular`, unit `kicker`, name `text-2xl font-semibold` as the one link (the whole cell is the target via `after:absolute after:inset-0`), the text, the progress badge (`LabProgress`, only once something is done), and an `Icon arrow-right` that nudges on hover. Cells `rounded-2xl bg-surface p-6` (fill, no border, no shadow: elevation means hierarchy). `HowItWorks`: the four benefits as a two column zig zag (text and a still alternate sides; images `boards/uno-r3`, `boards/pico`, `robotics/led-resistor`, `drones/quad5` from `labs-data.ts`, all existing in `public/thumbs`), each row a number (`kicker tabular`), title `text-2xl font-semibold`, text `text-base text-muted max-w-prose`; then the three steps as a horizontal sequence (`how.1` to `how.3`) with connecting rules. Rows reveal on scroll via `Reveal`. No three equal card columns. Imports: `Wrap`, `SectionHead` from `@/components/editorial/Editorial` (T-BU-26), `LabProgress` and `FigureStill` as edited by T-BU-27, `HomeSection` from `./primitives` (T-BU-31). |
| **Existing files** | `app/[lang]/page.tsx:127-198`; `shell/dashboard/labs.ts` (`LAB_STILL`), `shell/dashboard/data.ts` (`loadLabs`), `shell/dashboard/DashboardProgress.tsx` (`LabProgress`), `figure/FigureStill.tsx`. |
| **New files** | `home/LabsShelf.tsx`, `home/HowItWorks.tsx`, `home/labs-data.ts` (pure: the benefit to still map and the lab order); test `home/labs-data.test.ts` (each still path exists under `public/thumbs`). |
| **Design values** | Section 1.2 spacing 24 and 64; radius 16 outer, a still inside a cell with 24 px padding keeps `rounded-md` (gap above 16: result 0, unchanged rule); image ratio from `FigureStill`; hover: still scales to 105 percent with `motion-move`, arrow translates 4 px. |
| **States** | cell: default, hover, focus-visible (2 px ring around the whole cell), progress shown or hidden. |
| **i18n** | Reads `home.labs.*`, `home.benefits.*`, `home.how.*`. |
| **Tests** | vitest `labs-data.test.ts`; `home/LabsShelf.test.tsx` renders three links with the counts and hrefs; axe is in `e2e/home.spec.ts`. |
| **Acceptance** | Given `/en` at 1440, When I scroll past the tagline, Then one wide lab cell and two stacked ones show with real counts, then four alternating benefit rows and three steps, and each lab cell is one focusable link. At 390 the cells and rows stack in one column without horizontal scroll. |
| **Proof commands** | `TL`; `V src/components/home`; `UIC` on the three files; screenshots (1.5). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-43 composes them. |

---

### T-BU-39. Home: what runs, what is simulated, and the FAQ

| Field | Content |
|---|---|
| **Identity** | Id T-BU-39. Subsystem home. Phase BU. Priority P0. Dependencies T-BU-11, 26, 31. Group G8. Source files: 3 (`home/Proof.tsx`, `home/Faq.tsx`, `home/faq-schema.ts`). |
| **Problem** | An open source workbench for friends has no pricing and no testimonials, so its proof has to be the product's own facts: what really runs and what is only a model. The page has neither a proof section nor a FAQ (landing A2 asks for the FAQ with six to twelve questions, in plain question and answer form for AEO, objections as a section, not a footnote). |
| **Expected behaviour** | `Proof`: two columns on `rounded-2xl` fills: "What runs in your browser" with three checks (`Icon check-circle` in `good`) and "What is simulated" with three notes (`Icon info`), then the fidelity sentence in a full width quote block (`home.proof.fidelity`), `text-lg`. `Faq`: eight questions in a side by side list (questions left, answers right at `lg`, stacked below), not an accordion: each pair is a `div` with `h3` question and `p` answer, separated by 1 px rules, all visible, so it reads and is found by search. `faq-schema.ts` exports `buildFaqJsonLd(pairs)` returning the `FAQPage` object; `Faq` renders one `<script type="application/ld+json">` with `JSON.stringify` output where `<` is escaped as `<`. No claim beyond `home.json` copy. Imports: `Wrap`, `SectionHead` from `@/components/editorial/Editorial` (T-BU-26) and `HomeSection` from `./primitives` (T-BU-31). |
| **Existing files** | None (new); the copy is T-BU-31. |
| **New files** | `home/Proof.tsx`, `home/Faq.tsx`, `home/faq-schema.ts`; tests `home/faq-schema.test.ts`, `home/Faq.test.tsx`. |
| **Design values** | Section 1.2; two columns `md:grid-cols-2 gap-6`; FAQ questions `text-lg font-semibold`, answers `text-base text-muted max-w-prose`; rules 1 px. |
| **States** | Static; reduced motion irrelevant; `Reveal` per block. |
| **i18n** | Reads `home.proof.*`, `home.faq.*`. |
| **Tests** | `faq-schema.test.ts`: output has `@type: "FAQPage"`, eight `Question`s each with an `acceptedAnswer`, and the serialised string contains no raw `<`. `Faq.test.tsx`: eight `h3` and eight answers render, one `application/ld+json` script, no `details` or `button` (not an accordion). The CSP run (`e2e/csp.spec.ts`, B1) must still show 0 violations. |
| **Acceptance** | Given `/en`, When I read the page, Then I see what runs and what is only simulated in plain words, and eight questions answered in the open. Given a crawler, Then the page carries valid FAQ JSON-LD. |
| **Proof commands** | `TL`; `V src/components/home`; `UIC` on the three files; `E bu-39 e2e/csp.spec.ts` (if B1 created it); screenshots (1.5). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-43 composes them. |

---

### T-BU-40. Home: open source and the closing call

| Field | Content |
|---|---|
| **Identity** | Id T-BU-40. Subsystem home. Phase BU. Priority P0. Dependencies T-BU-11, 26, 31. Group G8. Source files: 2 (`home/OpenSource.tsx`, `home/FinalCta.tsx`). |
| **Problem** | B1 T-B1-21 requires an "Open source" section with three links (README, self hosting, contributing) and the fidelity statement; landing A2 requires a final CTA identical to the top. The current closing block says `The bench is *ready*.` with an accent word (`page.tsx:225-249`). |
| **Expected behaviour** | `OpenSource`: title `home.open.title`, text, three links as a row of `ButtonLink variant="secondary"` with the `github` or `book` icon and an external icon: README (`${REPO_URL}#readme`), Run your own copy (`${REPO_URL}/blob/main/docs/SELF_HOSTING.md`), Contribute (`${REPO_URL}/blob/main/CONTRIBUTING.md`), all `target="_blank" rel="noopener noreferrer"`; `REPO_URL` is imported from `./primitives` (created by T-BU-31; B1 T-B1-21 keeps its own copy inside `page.tsx`, which T-BU-43 removes; there is no `src/lib/repo.ts`). The fidelity statement is not repeated here (it is in `Proof`). `FinalCta`: a `rounded-2xl bg-surface p-8 md:p-12` block with `end.title` (`text-4xl font-semibold`), `end.text`, and the same `HeroActions`-free primary `ButtonLink` "Open the workbench" to the `href` prop (the same string the hero gets, built by `workbenchHref` in `./primitives`), identical to the hero's label (landing A2). No second action. Imports: `Wrap` from `@/components/editorial/Editorial` (T-BU-26), `REPO_URL` and `HomeSection` from `./primitives` (T-BU-31). |
| **Existing files** | `app/[lang]/page.tsx:225-249` (closing block); B1's open source section and `REPO_URL`; `search/shared.tsx:88` (`external` helper pattern for `rel`). |
| **New files** | `home/OpenSource.tsx`, `home/FinalCta.tsx`; test `home/OpenSource.test.tsx` (three external links with `rel` and the right hrefs; the CTA label equals the hero's). |
| **Design values** | Section 1.2; link buttons `sm`; block padding 32 and 48. |
| **States** | links: default, hover, focus; none disabled; no `href="#"`. |
| **i18n** | Reads `home.open.*`, `home.end.*`. |
| **Tests** | `OpenSource.test.tsx`; `e2e/home.spec.ts` (T-BU-43) checks the three links resolve to the paths B1's link check knows (`docs/SELF_HOSTING.md`, `CONTRIBUTING.md`, README). |
| **Acceptance** | Given `/en`, When I reach the bottom, Then I can open the README, the self hosting guide and CONTRIBUTING, and the last block repeats the one call to action. |
| **Proof commands** | `TL`; `V src/components/home`; `UIC` on the two files; screenshots (1.5). |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-43. |

---

### T-BU-41. Sweep: AI partner (panel, turns, change card, markdown, mic)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-41. Subsystem ai. Phase BU. Priority P0. Dependencies T-BU-08 to 14, 18. Group G8. Source files: 5 (`components/ai/PartnerPanel.tsx`, `components/ai/TurnView.tsx`, `components/ai/ChangeCard.tsx`, `components/ai/Markdown.tsx`, `components/ai/MicButton.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `components/ai/PartnerPanel.tsx` (316 lines): 3 off-scale spacing, 2 rounded-ink or arbitrary radius, 2 palette colour, 2 raw control; `components/ai/TurnView.tsx` (197 lines): 2 off-scale spacing, 1 old `ink-*` class, 3 rounded-ink or arbitrary radius, 4 hard shadow, 3 palette colour, 4 `font-ui`, 1 italic; `components/ai/ChangeCard.tsx` (109 lines): 1 old `ink-*` class, 2 rounded-ink or arbitrary radius, 1 hard shadow, 1 palette colour, 1 `font-ui`; `components/ai/Markdown.tsx` (115 lines): 2 off-scale spacing, 1 arbitrary size, 1 rounded-ink or arbitrary radius, 2 extra bold, 1 palette colour, 2 `font-ui`; `components/ai/MicButton.tsx` (86 lines): 1 hard shadow, 1 palette colour, 1 raw control. Notable lines: `PartnerPanel.tsx:35` is a hand rolled pulsing block, `:44` a `animate-ping` mint dot, `:235,281` a raw button and `<textarea>`, `:254` uses `variant="ink"` (alias to remove); `TurnView.tsx:26` is the user bubble in `bg-mustard` with `border-2 border-line`, `:55,133` mint and tomato avatars, `:183` is the one `italic` in the app, `:61-66` a blinking caret; `ChangeCard.tsx:46` has a mustard header; `Markdown.tsx:31,76` use `font-extrabold`, `:82` a tomato list marker; `MicButton.tsx:28,55` is a raw button that goes tomato and pulses while recording. All use the old icon set in `ai/icons.tsx`. |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. User message: right aligned `rounded-2xl bg-hover px-4 py-3` (no colour); partner message: left, no fill, a 28 px rounded square avatar (`rounded-lg bg-sunken`) with the `spark` icon. The question line is upright (no italic), set `text-muted`. Composer: `TextArea` with `Button primary` send and `IconButton` mic; recording state is a `bad` dot with a visible text "Recording" (existing key) and `animate-pulse`, not a coloured button. `ChangeCard`: `Panel`-style card, header `text-sm font-semibold`, the diff colours from `good`/`bad`. `Markdown`: bold is `font-bold`, list markers `text-muted`. The not set up state renders B1/T-BU-18 `NotSetUp`. Imports move from `./icons` to `@/components/ui/icons`. Streaming caret is a 2 px wide `bg-ink` element with `animate-pulse`. Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | `PartnerPanel.tsx:35,44,235,254,281` (test `PartnerPanel.test.tsx`); `TurnView.tsx:26,55,61-66,133,183`; `ChangeCard.tsx:46`; `Markdown.tsx:31,76,82`; `MicButton.tsx:28,55`; `ai/icons.tsx` (deleted in T-BU-56). |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. Avatars rounded squares (W3); bubbles `rounded-2xl` with a 12 px padding inner radius `rounded-sm` for code blocks inside a bubble. |
| **States** | Partner: loading, off (not set up), ready, thinking, streaming, error with retry (inline `InlineStatus`), empty conversation (an `EmptyState` with example prompts using existing keys), recording. |
| **i18n** | None (rule W15).  |
| **Tests** | `PartnerPanel.test.tsx` keeps passing; update class quotes and the `variant="ink"` assertion. Playwright: `E bu-41 e2e/dock.spec.ts e2e/keyless.spec.ts`. Screenshots (1.5) of the partner tab in the dock on `/en/boards/uno-r3/blink` (not set up, and with the keyless state) at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given a keyless install, When I open the partner tab, Then I see the not set up box with an Open Keys and usage button; given a ready key, Then messages show without colour fills and no italic text exists. `UIC` prints 0 for the five files and `grep -rn "ai/icons" src` shows no importer. |
| **Proof commands** | `TL`; `V src/components/ai`; `UIC src/components/ai/PartnerPanel.tsx src/components/ai/TurnView.tsx src/components/ai/ChangeCard.tsx src/components/ai/Markdown.tsx src/components/ai/MicButton.tsx`; `BUILD bu-41`; `E bu-41 e2e/dock.spec.ts e2e/keyless.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-56 deletes `ai/icons.tsx` and the `ink` alias of `Button`. |

---

### T-BU-42. Sweep: search panels (real build, nearby, videos, sources)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-42. Subsystem search. Phase BU. Priority P0. Dependencies T-BU-08 to 14, 18. Group G8. Source files: 5 (`components/search/RealBuildPanel.tsx`, `components/search/shared.tsx`, `components/search/SourcesList.tsx`, `components/search/VideoHelp.tsx`, `components/search/NearbyPanel.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `components/search/RealBuildPanel.tsx` (527 lines): 5 off-scale spacing, 5 old `ink-*` class, 1 rounded-ink or arbitrary radius, 1 extra bold, 1 palette colour, 5 icon or svg, 6 `font-ui`, 3 raw control; `components/search/shared.tsx` (88 lines): 3 rounded-ink or arbitrary radius; `components/search/SourcesList.tsx` (48 lines): 1 off-scale spacing, 1 old `ink-*` class, 1 icon or svg, 2 `font-ui`; `components/search/VideoHelp.tsx` (110 lines): 1 old `ink-*` class, 2 rounded-ink or arbitrary radius, 1 icon or svg, 2 `font-ui`, 1 raw control; `components/search/NearbyPanel.tsx` (237 lines): 2 old `ink-*` class, 2 rounded-ink or arbitrary radius, 3 icon or svg, 2 `font-ui`, 1 raw control. Notable lines: `RealBuildPanel.tsx:497` prints the total in `font-extrabold`, `:211,247,336` are a raw button and two raw inputs (a zip code field and a quantity), the file has five `ink-*`, five icon uses, six mono uses and a palette colour at `:370`; `shared.tsx:47-52` is the private `PanelSkeleton` (three `animate-pulse rounded-ink` blocks) and `:84` the `external` link helper; `NearbyPanel.tsx:66` and `VideoHelp.tsx:90` render `<img alt="">` thumbnails (decorative, stay) in `rounded-ink` frames and raw inputs at `NearbyPanel.tsx:170` and `VideoHelp.tsx:59`. |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. `PanelSkeleton` is rebuilt on `Skeleton` and `SkeletonGroup` and keeps its export. Inputs become `TextInput` with inline `error` from the existing failure codes (B1 T-B1-28), results `EmptyState` when none. Prices and totals `tabular`; the total is `text-2xl font-bold`. B1 `NotSetUp` renders first when the search module is off or keyless. Thumbnails `rounded-lg`. Links that open a shop use `Icon external` (16). Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | `RealBuildPanel.tsx:211,247,336,370,497` (test `RealBuildPanel.test.tsx`); `shared.tsx:47-52,84`; `VideoHelp.tsx:59,90`; `NearbyPanel.tsx:66,170`; `SourcesList.tsx`. |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. Result rows `py-3` with 1 px dividers; thumbnails 64 px squares. |
| **States** | Each panel: not set up, idle (waiting for a click, B1 T-B1-09), loading (skeleton), results, empty results, failed (inline, specific, with a retry button). |
| **i18n** | None (rule W15).  |
| **Tests** | `RealBuildPanel.test.tsx` keeps passing; update only quoted classes and the `font-extrabold` assertion if any. Playwright: `E bu-42 e2e/dock.spec.ts e2e/keyless.spec.ts`. Screenshots (1.5) of the dock tabs Prices, Nearby and Videos on a lesson page, keyless at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given a keyless install, When I open Prices, Nearby and Videos, Then each shows a not set up box and 0 requests leave the page. Given a failed search, Then the message appears inline with a retry. `UIC` prints 0. |
| **Proof commands** | `TL`; `V src/components/search`; `UIC src/components/search/RealBuildPanel.tsx src/components/search/shared.tsx src/components/search/SourcesList.tsx src/components/search/VideoHelp.tsx src/components/search/NearbyPanel.tsx`; `BUILD bu-42`; `E bu-42 e2e/dock.spec.ts e2e/keyless.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing; T-BU-56 deletes the compatibility aliases once every sweep has landed. |

---

### T-BU-43. Home: compose the page and metadata

| Field | Content |
|---|---|
| **Identity** | Id T-BU-43. Subsystem home. Phase BU. Priority P0. Dependencies T-BU-36 to 40. Group G9. Source files: 3 (`app/[lang]/page.tsx`, `components/home/primitives.tsx` edited, `components/home/index.ts` new). |
| **Problem** | `page.tsx` is 249 lines of mixed data loading and markup. After the section tasks the page must become a thin composition, keep B1's `e2e/home.spec.ts` contract, and it must stop importing the old `marketing/` helpers (T-BU-56 deletes the folder). |
| **Expected behaviour** | `page.tsx` keeps `generateMetadata` (title absolute from `home.meta.title`, description from `home.meta.description`, `alternates`) and the `Suspense` shell with `<PageSkeleton kind="list" />`; the async body loads `getT(lang,"home")`, `getT(lang,"shell")`, `loadLabs`, the counts, and renders in this order (layout type A, classic hero plus sections, because the product is understandable from the live hero figure): `Hero`, `TaglineReveal`, `LabsShelf`, `HowItWorks`, `Proof`, `Faq`, `OpenSource`, `FinalCta`. `primitives.tsx` already exists (T-BU-31: `WORKBENCH_HREF`, `workbenchHref`, `REPO_URL`, `HomeSection`); this task edits it only to align it with what B1 left in `page.tsx` (one `REPO_URL`, B1's value wins if it differs from section 5 item 5; one `workbenchHref`), removes the copies from `page.tsx`, and passes `workbenchHref(lang, uno)` to `Hero` and `FinalCta`. It creates only `home/index.ts`, which re-exports the sections. The language list leaves the home page (the footer has the six links). `page.tsx` imports nothing from `@/components/marketing` any more; `Wrap`, `SectionHead`, `typeClass`, `riseDelay` come from `@/components/editorial/Editorial` (T-BU-26). The folder itself is deleted in T-BU-56, after `not-found.tsx` (T-BU-48) and the other importers are repointed. `e2e/home.spec.ts` (B1) is updated: it still asserts the open source section with its three links, the fidelity sentence, no "sign up", "price" or counter text, 360 px no horizontal scroll, axe 0 serious or critical; it gains assertions for the one primary CTA above the fold, the tagline reveal progress, the FAQ JSON-LD, and the new copy. |
| **Existing files** | `app/[lang]/page.tsx:1-249` (as B1 left it); `components/home/primitives.tsx` (T-BU-31); `shell/dashboard/*`; `e2e/home.spec.ts` (B1, T-B1-21). |
| **New files** | `home/index.ts`. |
| **Design values** | Section 1.2; sections separated by 64 and 96 px; page `pb-16 md:pb-24`. |
| **States** | page: loading (PageSkeleton), ready; returning visitor (continue block) and first visit both covered by `HeroActions`. |
| **i18n** | Uses `home`, `shell`. |
| **Tests** | `E bu-43 e2e/home.spec.ts e2e/shell.spec.ts e2e/redirects.spec.ts` (the home page, the skip link, the redirect from `/` to a language, all six languages open without a page error: add a loop over `LOCALES` that opens each home and fails on `pageerror`). `grep` proof for this task: `git grep -n "components/marketing" -- "src/app/[lang]/page.tsx" src/components/home` prints nothing (the whole tree proof moves to T-BU-56). |
| **Acceptance** | Given `/en`, `/de`, `/es`, `/fr`, `/zh`, `/hi`, When each loads, Then the page has the eight sections in order, no italic, one primary action above the fold, and no console error. Given 360 px width, Then `scrollWidth <= innerWidth`. |
| **Proof commands** | `TL`; `V src/components src/i18n`; `UIC "src/app/[lang]/page.tsx" src/components/home`; `BUILD bu-43`; `E bu-43 e2e/home.spec.ts e2e/shell.spec.ts e2e/redirects.spec.ts`; screenshots of the full page, 1440x900 and 390x844, both themes, in six languages for at least `en` and `hi` (1.5). |
| **Rollback** | `git revert` (restores the old page). |
| **Later tasks need** | T-BU-56 deletes the last alias users and `marketing/`; B4 changes `WORKBENCH_HREF`; B2's New and Open buttons plug into `HeroActions`. |

---

### T-BU-44. Sweep: room bar, together panel, chat, voice

| Field | Content |
|---|---|
| **Identity** | Id T-BU-44. Subsystem realtime. Phase BU. Priority P0. Dependencies T-BU-08 to 14. Group G9. Source files: 4 (`components/realtime/RoomBar.tsx`, `components/realtime/TogetherPanel.tsx`, `components/realtime/ChatPanel.tsx`, `components/realtime/VoiceButton.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `components/realtime/RoomBar.tsx` (224 lines): 3 off-scale spacing, 2 old `ink-*` class, 1 rounded-ink or arbitrary radius, 1 icon or svg, 2 raw control; `components/realtime/TogetherPanel.tsx` (134 lines): 2 rounded-ink or arbitrary radius, 1 `font-ui`, 1 raw control; `components/realtime/ChatPanel.tsx` (197 lines): 1 off-scale spacing, 3 rounded-ink or arbitrary radius, 1 palette colour, 2 raw control; `components/realtime/VoiceButton.tsx` (136 lines): 1 hard shadow, 1 palette colour, 1 icon or svg, 1 raw control. Notable lines: `RoomBar.tsx:110,135` raw selects, three off scale spacings, two `ink-*` classes; `TogetherPanel.tsx:33` raw input, `:122` a pulsing `rounded-ink` loading block; `ChatPanel.tsx:60` colours own messages `bg-mustard`, `:72` raw button (the "original" toggle), `:177` raw `<textarea>`; `VoiceButton.tsx:109,118` a raw button that turns tomato and pulses while recording. After B0 `together/api.tsx` is 5 lines (only `roomPath`), so it has nothing to sweep and is not in this card. |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. `RoomBar` uses `Select` and `IconButton`; `TogetherPanel` loading is a `SkeletonGroup`; chat: own messages `bg-hover` right aligned, others `bg-sunken` left, avatar rounded squares from T-BU-45, composer `TextArea` with a `Button primary` send; `VoiceButton` is an `IconButton` with `aria-pressed`, recording shown by a `bad` dot and text. Local only room note uses `InlineStatus tone="info"`. Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | `RoomBar.tsx:110,135`; `TogetherPanel.tsx:33,122`; `ChatPanel.tsx:60,72,177`; `VoiceButton.tsx:109,118`; e2e `room.spec.ts`. |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. Chat bubbles `rounded-2xl`, inner quote blocks `rounded-sm`. |
| **States** | Room: not in a room, starting, connected, peers joining, reconnecting, error. Chat: empty (EmptyState), sending, failed message with retry. Voice: off, requesting permission, recording, denied (inline). |
| **i18n** | None (rule W15).  |
| **Tests** | No component unit test exists for these files (VERIFIED `ls`); the e2e specs below carry the behaviour. Playwright: `E bu-44 e2e/room.spec.ts e2e/dock.spec.ts`. Screenshots (1.5) of the Together tab in the dock, in and out of a room at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given two browser tabs in one room, When one sends a message, Then it appears styled on the other, and `room.spec.ts` passes. `UIC` prints 0. |
| **Proof commands** | `TL`; `V src/components/realtime`; `UIC src/components/realtime/RoomBar.tsx src/components/realtime/TogetherPanel.tsx src/components/realtime/ChatPanel.tsx src/components/realtime/VoiceButton.tsx`; `BUILD bu-44`; `E bu-44 e2e/room.spec.ts e2e/dock.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing; T-BU-56 deletes the compatibility aliases once every sweep has landed. |

---

### T-BU-45. Sweep: identity, invite, avatars, cursors, lobby

| Field | Content |
|---|---|
| **Identity** | Id T-BU-45. Subsystem realtime. Phase BU. Priority P0. Dependencies T-BU-08 to 14. Group G9. Source files: 5 (`components/realtime/IdentityForm.tsx`, `components/realtime/InviteDialog.tsx`, `components/realtime/PeerAvatar.tsx`, `components/realtime/PresenceCursors.tsx`, `app/[lang]/together/Lobby.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `components/realtime/IdentityForm.tsx` (113 lines): 1 rounded-ink or arbitrary radius, 1 hard shadow, 1 icon or svg, 2 raw control; `components/realtime/InviteDialog.tsx` (134 lines): 1 old `ink-*` class, 3 rounded-ink or arbitrary radius, 1 icon or svg, 1 `font-ui`, 1 raw control; `components/realtime/PeerAvatar.tsx` (39 lines): 1 palette colour, 1 icon or svg; `components/realtime/PresenceCursors.tsx` (136 lines): 2 off-scale spacing, 1 rounded-ink or arbitrary radius, 1 hard shadow, 3 bad easing or animated property, 2 icon or svg, 1 raw control; `app/[lang]/together/Lobby.tsx` (188 lines): 3 off-scale spacing, 1 `font-ui`. Notable lines: `IdentityForm.tsx:50,83` raw inputs (name and colour), one shadow; `InviteDialog.tsx:45` a pulsing QR placeholder, `:110` a raw input, three `rounded-ink`; `PeerAvatar.tsx:30` a circle with a palette status badge; `PresenceCursors.tsx:109` animates `left` and `top` (`transition-[left,top]`), has three off-motion easings and a raw button at `:123`; `Lobby.tsx` imports `Action`, `quietField`, `sectionTitle` from Editorial and uses `size="lg"` (`Lobby.tsx` has three off scale spacings). |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. `IdentityForm`: `TextInput` with `error` for an empty or long name; colours are a swatch row of `button`s (`rounded-lg`, `aria-pressed`), not a free input unless the existing behaviour needs it. `InviteDialog`: QR placeholder is a `Skeleton`, link field `TextInput` read only with a copy `IconButton`. `PeerAvatar`: `rounded-lg` square with initials, colour is the peer colour (data), presence badge a 8 px `rounded-full` dot. `PresenceCursors`: positions via `transform: translate()` (inline style updated per frame by the existing code path), no `left/top` transition. `Lobby`: `TextInput`, `Button`, `Select`; `quietField` and `size="lg"` go. Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | `IdentityForm.tsx:50,83`; `InviteDialog.tsx:45,110`; `PeerAvatar.tsx:30`; `PresenceCursors.tsx:109,123`; `together/Lobby.tsx:7` (import), the create and join forms; `e2e/room.spec.ts`. |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. Peer colours stay data (the guard allow list lists `lib/realtime/identity.ts`); cursor label `text-xs font-semibold` on the peer colour with a contrast safe text colour chosen by the existing code. |
| **States** | Identity: empty, valid, invalid (inline). Invite: generating (skeleton), ready, copied (`InlineStatus` "Copied"), failed. Lobby: create, join, joining, wrong code (inline), full. |
| **i18n** | None (rule W15).  |
| **Tests** | No component unit test exists for these files (VERIFIED `ls`); the e2e specs below carry the behaviour. Playwright: `E bu-45 e2e/room.spec.ts e2e/shell.spec.ts`. Screenshots (1.5) of `/en/together` (lobby), the invite dialog, a room with two peers at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given `/en/together`, When I submit an empty name, Then the error shows under the field. Given two cursors moving, Then no layout property animates (`UIC` R7 clean). `UIC` prints 0. |
| **Proof commands** | `TL`; `V src/components/realtime`; `UIC src/components/realtime/IdentityForm.tsx src/components/realtime/InviteDialog.tsx src/components/realtime/PeerAvatar.tsx src/components/realtime/PresenceCursors.tsx "src/app/[lang]/together/Lobby.tsx"`; `BUILD bu-45`; `E bu-45 e2e/room.spec.ts e2e/shell.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-51 removes `quietField` from `Editorial.tsx` once this task stopped importing it. |

---

### T-BU-46. Sweep: list pages and about (skeleton fallbacks, page grammar)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-46. Subsystem pages. Phase BU. Priority P0. Dependencies T-BU-11, 26, 27. Group G9. Source files: 5 (`app/[lang]/about/page.tsx`, `app/[lang]/boards/page.tsx`, `app/[lang]/drones/page.tsx`, `app/[lang]/robotics/page.tsx`, `app/[lang]/together/page.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `app/[lang]/about/page.tsx` (118 lines): 4 off-scale spacing, 2 arbitrary size, 1 bad easing or animated property, 2 icon or svg, 2 `font-ui`, 1 one sided bar; `app/[lang]/boards/page.tsx`: no hits in the scan (read it, apply W9 to W11 if it holds raw controls); `app/[lang]/drones/page.tsx` (115 lines): 1 off-scale spacing, 1 arbitrary size; `app/[lang]/robotics/page.tsx` (135 lines): 1 off-scale spacing, 2 `font-ui`; `app/[lang]/together/page.tsx` (66 lines): 2 off-scale spacing. Notable lines: all five wrap their body in `<Suspense fallback={<div ... className="min-h-[70vh]" aria-busy="true" />}>` (`about/page.tsx:36`, `boards/page.tsx:22`, `drones/page.tsx:29`, `robotics/page.tsx:24`, `together/page.tsx:25`), a blank screen while the server renders; `about/page.tsx` has 4 off scale spacings, `text-[17px]` at two places (`:92,98`), `text-[clamp(22px,2.2vw,30px)]` at `:80`, a mono summary at `:104`, and `Icon external`; the catalogue pages import `eyebrow` from Editorial and the hero pairs from `components/catalogue`. |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. Every fallback becomes `<PageSkeleton kind="list" />` (about uses `kind="article"`). `PageSkeleton` is a client component that reads its "Loading" text with `useCommonT` from the provider the layout already wraps around the page, so a fallback needs no translated prop (a fallback cannot await `params`). Text sizes use steps; section titles use the Editorial `sectionTitle`; the about page keeps its licence text and its `details` disclosure, which gets `Icon chevron-right` rotating with `motion-move`. Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | `about/page.tsx:36,80,92,98,104`; `boards/page.tsx:22`; `drones/page.tsx:29`; `robotics/page.tsx:24`; `together/page.tsx:25`; `components/catalogue/Catalogue.tsx` (T-BU-27). |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. Page frame from T-BU-26 (`px-4 sm:px-6 lg:px-10 xl:px-12`); section spacing `mt-16 md:mt-24`. |
| **States** | Each page: loading (PageSkeleton), ready. About: licence disclosure closed or open. |
| **i18n** | None (rule W15).  |
| **Tests** | No unit tests; `e2e/shell.spec.ts` covers about and the nav. Playwright: `E bu-46 e2e/shell.spec.ts e2e/redirects.spec.ts`. Screenshots (1.5) of `/en/boards`, `/en/robotics`, `/en/drones`, `/en/together`, `/en/about` at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given a throttled network, When I open `/en/boards`, Then a skeleton shaped like the catalogue shows instead of a blank page. `UIC` prints 0 for the five files. |
| **Proof commands** | `TL`; `V src/app`; `UIC "src/app/[lang]/about/page.tsx" "src/app/[lang]/boards/page.tsx" "src/app/[lang]/drones/page.tsx" "src/app/[lang]/robotics/page.tsx" "src/app/[lang]/together/page.tsx"`; `BUILD bu-46`; `E bu-46 e2e/shell.spec.ts e2e/redirects.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing; T-BU-56 deletes the compatibility aliases once every sweep has landed. |

---

### T-BU-47. Sweep: detail pages (skeleton fallbacks)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-47. Subsystem pages. Phase BU. Priority P0. Dependencies T-BU-11, 26, 27. Group G9. Source files: 5 (`app/[lang]/boards/[board]/page.tsx`, `app/[lang]/boards/[board]/[lesson]/page.tsx`, `app/[lang]/drones/[drone]/page.tsx`, `app/[lang]/drones/[drone]/fly/page.tsx`, `app/[lang]/robotics/[bench]/page.tsx`; paths under `src/`). |
| **Problem** | Counts at `f018746` (`bu-scratch/perfile.txt`): `app/[lang]/boards/[board]/page.tsx`: no hits in the scan (read it, apply W9 to W11 if it holds raw controls); `app/[lang]/boards/[board]/[lesson]/page.tsx`: no hits in the scan (read it, apply W9 to W11 if it holds raw controls); `app/[lang]/drones/[drone]/page.tsx`: no hits in the scan (read it, apply W9 to W11 if it holds raw controls); `app/[lang]/drones/[drone]/fly/page.tsx`: no hits in the scan (read it, apply W9 to W11 if it holds raw controls); `app/[lang]/robotics/[bench]/page.tsx` (104 lines): 2 off-scale spacing, 2 icon or svg. Notable lines: the workspace pages use `<Suspense fallback={<div className="min-h-[calc(100dvh-var(--header-h))]" aria-busy="true" />}>` (`boards/[board]/page.tsx:34`, `[lesson]/page.tsx:38`, `drones/[drone]/page.tsx:37`, `fly/page.tsx:38`, `robotics/[bench]/page.tsx:39`); `robotics/[bench]/page.tsx` has two off scale spacings and two icon uses. |
| **Expected behaviour** | Apply sweep rules W1 to W15 (section 1.3) to these files so that `UIC` on them prints nothing. Fallbacks are `<PageSkeleton kind="workspace" ... />` matching the `.ws` grid (bar, stage, rail); the text comes from `PageSkeleton` itself, as in T-BU-46. Untranslated notices keep working. Every `data-testid`, accessible name, role and key handler stays (W14). |
| **Existing files** | the five lines above; `components/shell/WorkspaceFrame.tsx` (unchanged). |
| **New files** | None. |
| **Design values** | Section 1.2 and 1.3. Skeleton blocks follow `--rail-w` and `--stage-h`. |
| **States** | loading (PageSkeleton), ready, content missing (existing `notFound()` path). |
| **i18n** | None (rule W15).  |
| **Tests** | No unit tests. Playwright: `E bu-47 e2e/boardlab.spec.ts e2e/robotics.spec.ts e2e/dronelab.spec.ts e2e/fly.spec.ts`. Screenshots (1.5) of `/en/boards/uno-r3`, `/en/boards/uno-r3/blink`, `/en/robotics/l298n`, `/en/drones/quad5`, `/en/drones/quad5/fly` (also with the network throttled to show the skeleton) at 1440x900 and 390x844 in light and dark, each opened and looked at. axe stays green in the specs that already call it. |
| **Acceptance** | Given a slow connection, When a lab page loads, Then a workspace shaped skeleton shows with a stage block and a rail block, then the page replaces it without shifting. `UIC` prints 0. |
| **Proof commands** | `TL`; `V src/app`; `UIC "src/app/[lang]/boards/[board]/page.tsx" "src/app/[lang]/boards/[board]/[lesson]/page.tsx" "src/app/[lang]/drones/[drone]/page.tsx" "src/app/[lang]/drones/[drone]/fly/page.tsx" "src/app/[lang]/robotics/[bench]/page.tsx"`; `BUILD bu-47`; `E bu-47 e2e/boardlab.spec.ts e2e/robotics.spec.ts e2e/dronelab.spec.ts e2e/fly.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing; T-BU-56 deletes the compatibility aliases once every sweep has landed. |

---

### T-BU-48. Branded 404 (language and global) and the error boundary

| Field | Content |
|---|---|
| **Identity** | Id T-BU-48. Subsystem ship. Phase BU. Priority P0. Dependencies T-BU-08, 11, 19, 26. Group G10. Source files: 5 (`app/[lang]/not-found.tsx`, `app/global-not-found.tsx`, `app/[lang]/error.tsx`, `next.config.ts`, `src/i18n/messages/*/common.json` as one set). |
| **Problem** | A branded 404 exists only inside a language (`not-found.tsx`, rendered by the `[...rest]` catch all through `notFound()`); a URL with no language prefix that no redirect catches (for example `/zzz`) gets Next's default page, because the root layout is the top level dynamic segment `[lang]`, the case the docs name for `global-not-found` (`not-found.md:49-53`). There is no `error.tsx` or `global-error.tsx`, so a thrown error shows Next's default error page without the site frame (VERIFIED: `find src/app` lists neither). The language 404 uses `typeClass.display`, `text-[17px]` and a chevron icon with a 200 ms `ease-out` (`not-found.tsx:33-52`). |
| **Expected behaviour** | `[lang]/not-found.tsx` (it imports from `@/components/editorial/Editorial`, T-BU-26, instead of `@/components/marketing`): `PageHead`-style block: `kicker` "404", `h1` `notFound.title` (`text-4xl md:text-5xl`, 680 cap), body `notFound.body`, a primary `ButtonLink` home, a `Button secondary` "Search" that dispatches `OPEN_COMMAND_EVENT`, and the three lab links as a plain list with `Icon arrow-right`; it sits inside the layout, so the floating nav and footer show. `app/global-not-found.tsx` (needs `experimental: { globalNotFound: true }` in `next.config.ts`): imports `./globals.css` and the Geist font through `next/font/google`, renders its own `<html lang="en">`/`<body>` with a centred card: the wordmark, "Page not found" and a line "Choose a language to continue" with the six `LOCALE_NAMES` as links to `/en` ... `/hi`; exports `metadata` with a title; theme follows `prefers-color-scheme` (no saved theme is readable here; the doc says so). `[lang]/error.tsx` (client; `error`, `reset`): `EmptyState` with `warn-circle`, title `client.error.title`, text `client.error.text`, a `Button primary` calling `reset()` labelled `client.state.retry`, a `ButtonLink` to `/{lang}`, and the `error.digest` as a small `tabular` reference line when present; it `console.error`s nothing extra. If `BUILD` rejects `globalNotFound` (open question 8) the flag and file are dropped and the card reports it. |
| **Existing files** | `app/[lang]/not-found.tsx:1-55`; `app/[lang]/[...rest]/page.tsx` (12 lines, calls `notFound()`); `next.config.ts:5-17`; `i18n/config.ts:20-27` (`LOCALE_NAMES`); `common.json` `notFound.*` (title, body, home, boards, robotics, drones, metaTitle). Docs: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`, `error.md`. |
| **New files** | `app/global-not-found.tsx`, `app/[lang]/error.tsx`. Tests: `e2e/ship.spec.ts` (new, shared with T-BU-49). |
| **Design values** | Section 1.2. The 404 text never says "oops"; it names what failed and what to do ("This page does not exist. Check the address or pick a lab."). The global page is small: one font, the token CSS, no scripts. |
| **States** | 404: language route (with nav and footer), global (no layout). Error: default, retry pressed (calls `reset`), with digest. |
| **i18n** | `common.json`: `notFound.search` ("Search the site"), `client.error.title` ("Something went wrong"), `client.error.text` ("This page hit a problem. Try again, or go back to the start."), `client.error.reference` ("Reference: {digest}"), `client.error.home` ("Back to the start"); `notFound.*` strings reviewed for sentence case. Six languages. The global page's strings are English plus the six native language names (it has no language), documented in the file. |
| **Tests** | Playwright `e2e/ship.spec.ts`: `GET /en/does-not-exist` returns 404 with an `h1`, a home link, the nav and the footer; `GET /zzz` returns 404 with the global page (the six language links, `lang="en"`); both pass axe; a forced error route is not added to the app, so the error boundary is covered by a jsdom test `error.test.tsx` that renders `error.tsx` with a fake error and checks the retry calls `reset`. |
| **Acceptance** | Given a mistyped address inside a language, Then a branded page with the nav, a search button and the three labs shows with status 404. Given `/zzz`, Then a small branded page offers the six languages. Given a thrown render error, Then the site frame stays and a retry button shows. |
| **Proof commands** | `TL`; `V src/app src/i18n`; `UIC` on the three source files; `BUILD bu-48`; `E bu-48 e2e/ship.spec.ts e2e/redirects.spec.ts`; screenshots of both 404 pages at both sizes in both themes (1.5). |
| **Rollback** | `git revert` (the flag and the files go together). |
| **Later tasks need** | T-BU-57 screenshots the 404. |

---

### T-BU-49. Meta, og, robots, sitemap, manifest, viewport, skip link

| Field | Content |
|---|---|
| **Identity** | Id T-BU-49. Subsystem ship. Phase BU. Priority P0. Dependencies T-BU-05, 25. Group G10. Source files: 5 (`app/[lang]/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`, `components/ui/SkipLink.tsx`). |
| **Problem** | `layout.tsx` sets title, description, `openGraph` (no image fields; the file convention `opengraph-image.png` supplies one), `twitter` (`:36-45`); there is no `viewport` export (no `theme-color`, no `color-scheme`), no `robots`, no `sitemap`, no `manifest`; the skip link is an ink pill with a hard shadow and `z-[100]` (`SkipLink.tsx:9`). Ship items: title, description, og and sharing tags, favicon, skip link, landmarks. |
| **Expected behaviour** | `layout.tsx`: `generateViewport()` returns `themeColor` per scheme (`#f2efe7` light, `#131209` dark) and `colorScheme: "light dark"`; `generateMetadata` keeps title template, description, `openGraph` and `twitter`, adds `openGraph.url` (canonical), `alternates` stays per page, `robots: { index: true, follow: true }`, `icons` untouched; it confirms (test) that the rendered `<head>` has `og:title`, `og:description`, `og:image` (from the file convention) and `twitter:card`. `robots.ts`: allow `/`, disallow `/api/`, `sitemap: new URL("/sitemap.xml", siteUrl()).href` (`siteUrl()` returns a `URL`, `src/i18n/seo.ts:8`, and its string form ends in `/`, so a template string would give `//sitemap.xml`). `sitemap.ts`: every language times these pages: home, boards, robotics, drones, together, about, privacy, and every board, bench and drone detail from `BOARD_IDS`, `ROBOTICS_IDS`, `DRONE_IDS` (the fly pages are linked from the drone page, so they are listed too), each with `alternates.languages` for the six tags and `x-default` (same source as `alternatesFor`); every entry's `url` is `new URL(path, siteUrl()).href`. `manifest.ts`: `name`/`short_name` from `common` site name, `start_url` `/`, `display: "standalone"`, `theme_color` and `background_color` `#f2efe7`, `icons`: `/icon.svg` (`any`, image/svg+xml) and `/apple-icon.png` (180x180, image/png; VERIFIED size). `SkipLink`: `fixed start-4 top-4 z-skip rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-paper -translate-y-24 focus-visible:translate-y-0 motion-move no-underline`; first tab stop; target is the language scoped `main` id (unchanged logic in `layout.tsx:56-64`). |
| **Existing files** | `app/[lang]/layout.tsx:25-48,56-74`; `ui/SkipLink.tsx` (14 lines); `i18n/seo.ts:1-25` (`siteUrl`, `alternatesFor`); `content/ids.ts` (`BOARD_IDS`, `ROBOTICS_IDS`, `DRONE_IDS`); `app/icon.svg`, `app/apple-icon.png`, `app/[lang]/opengraph-image.png` (+ `.alt.txt`). Next docs: `01-metadata/robots.md`, `sitemap.md`, `manifest.md`, `generate-viewport.md`. |
| **New files** | `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`; test `app/sitemap.test.ts`. |
| **Design values** | Skip link: shown on focus only; contrast `--paper` on `--ink` at least 12 to 1; no `z-[100]`. |
| **States** | Skip link: hidden, focused (visible), activated (focus moves to `main`). |
| **i18n** | None new (`a11y.skipToContent` exists). |
| **Tests** | vitest `sitemap.test.ts`: URLs unique, absolute, none contains `//` after the scheme (also asserted for the `robots.ts` sitemap line), 6 languages times the page set, contains `/en/privacy` and `/de/drones/quad5/fly`, every entry has an `alternates.languages` with 7 keys. Playwright (`e2e/ship.spec.ts`): `/robots.txt` and `/sitemap.xml` return 200; `/manifest.webmanifest` parses and has an icon; the home `<head>` has the description, the og tags and a `theme-color` meta for each scheme; Tab once from a fresh load focuses the skip link and Enter moves focus to `main` (existing check in `shell.spec.ts:72` stays). |
| **Acceptance** | Given a link pasted in a chat, When it unfurls, Then it shows the title, description and the OG picture. Given a crawler, Then `robots.txt` points to a sitemap that lists every page in six languages with hreflang. |
| **Proof commands** | `TL`; `V src/app src/i18n`; `UIC` on `SkipLink.tsx` and `layout.tsx`; `BUILD bu-49`; `E bu-49 e2e/ship.spec.ts e2e/shell.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-57 axe checks the head and landmarks. |

---

### T-BU-50. States spec: no alert, skeletons, empty and error states

| Field | Content |
|---|---|
| **Identity** | Id T-BU-50. Subsystem tests. Phase BU. Priority P0. Dependencies T-BU-11 and every sweep (20 to 47). Group G10. Source files: 0 (`e2e/states.spec.ts`, a new test). |
| **Problem** | UI_RULES and landing B9 demand loading, empty and error states on every interactive screen, no `window.alert`, no dead link, disabled things that look disabled and a marked current page. Sweeps apply them file by file; nothing proves the whole. |
| **Expected behaviour** | `e2e/states.spec.ts` (imports `test, expect` from `./support/no-egress`) checks, over the main routes: (1) no native dialog: `page.on("dialog", ...)` fails the test; each primary action on `/en/boards/uno-r3/blink` (Run, the lesson switch), `/en/together` and the keys dialog is pressed once; (2) skeletons: with `page.route` delaying document and RSC requests by 700 ms, a client side navigation from `/en` to `/en/boards` shows an element with `role="status"` and `aria-busy="true"` before the content, then none after; (3) empty states: the partner tab keyless shows `[data-testid="not-set-up"]`; the chat panel in a new room shows an empty state (an icon and text, not a blank box); the serial monitor before Run shows its empty line; (4) inline errors: the identity form with an empty name and the keys dialog with a bad key each show a message that is the `aria-describedby` target of an `aria-invalid="true"` field and visible; (5) disabled things look disabled: every `button:disabled` has computed `opacity` below 1 and `cursor: not-allowed`; (6) no dead links: `a[href="#"]` count is 0 on the routes; every `<a href>` on `/en` resolves (HEAD against the same origin, external links skipped); (7) the nav marks the current page: visit each nav route and assert exactly one `a[aria-current="page"]` inside the header. |
| **Existing files** | `e2e/support/no-egress.ts` (B0), `e2e/dock-shared.ts` (dock helpers), `e2e/shell.spec.ts:13-23` (`watchErrors`). |
| **New files** | `e2e/states.spec.ts`. |
| **Design values** | Section 1.3 W10. |
| **States** | The spec is the states proof. |
| **i18n** | English only (the states are structural). |
| **Tests** | The spec itself; it must pass three times in a row (`--repeat-each=3 --retries=0`). |
| **Acceptance** | Given the finished UI, When `E bu-50 e2e/states.spec.ts` runs, Then all seven checks pass. A failing check names the route and the element. |
| **Proof commands** | `TL`; `E bu-50 e2e/states.spec.ts --repeat-each=3 --retries=0`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-59 runs it. |

---

### T-BU-51. Motion pass: reveals on pages, reduced motion proof

| Field | Content |
|---|---|
| **Identity** | Id T-BU-51. Subsystem motion. Phase BU. Priority P0. Dependencies T-BU-06, 11, 26, 43, 44 to 47. Group G10. Source files: 1 (`editorial/Editorial.tsx`). |
| **Problem** | Page content outside the home appears at once; `PageHead` and `Catalogue` enter with a short rise on first paint, but sections below the fold do not reveal. `Editorial.tsx` still exports `quietField`, `Action` and `enter` shims for `Lobby` and others. |
| **Expected behaviour** | `Section` wraps its content in `Reveal` (rise 32 px, 700 ms, once, `IntersectionObserver`); `PageHead` keeps `animate-rise-in` on load; `quietField`, the old `enter` export and `Accent` are deleted after `git grep` shows no importer (T-BU-45 and 46 removed the last); `Action` stays only if something imports it. No `window` scroll listener is introduced. `e2e/motion.spec.ts` proves: with normal motion a section below the fold has computed `opacity` 0 before scrolling and 1 after, and still 1 after scrolling back up (once); with `reducedMotion: "reduce"` it is 1 at load and its computed `transform` is `none`; opening the Settings popover and a dialog with reduced motion leaves their `transform` at `none`; and a source scan (in `src/styles/motion.test.ts`) finds no `transition-all`, no `ease-in`, `ease-out` or `linear` timing in `src` outside the allow list (`animate-pulse` skeletons). |
| **Existing files** | `editorial/Editorial.tsx` (as left by T-BU-26); `ui/Reveal.tsx` (T-BU-11); `styles/motion.css`. |
| **New files** | none (tests: `e2e/motion.spec.ts`). |
| **Design values** | Section 1.2 Motion. |
| **States** | before reveal, revealed, reduced motion. |
| **i18n** | None. |
| **Tests** | `E bu-51 e2e/motion.spec.ts e2e/shell.spec.ts`; `V src/styles src/components/editorial`; `UIC src/components/editorial/Editorial.tsx`. |
| **Acceptance** | Given `/en/about` at 1440x900, When I scroll, Then each section rises and fades in once as it enters. Given reduced motion, Then nothing moves. |
| **Proof commands** | As above plus `BUILD bu-51`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing. |

---

### T-BU-52. Copy pass 1: common, shell, hw

| Field | Content |
|---|---|
| **Identity** | Id T-BU-52. Subsystem i18n. Phase BU. Priority P0. Dependencies T-BU-31 (and all UI tasks that added strings). Group G11. Source files: 3 (`messages/*/common.json`, `messages/*/shell.json`, `messages/*/hw.json`, each a set of six). |
| **Problem** | Chrome strings follow the older voice: Title Case labels (`shell.json:8-10` "Board Lab", "Robotics Lab", "Drone Lab"), hyphenated compounds in running text (`shell` 7, `common` 1, `hw` 2 in English), "Explore · Understand · Build" style kickers, and the retired `dashboard.*` home strings (superseded by `home.json`). UI_RULES copy: sentence case, plain words, calm specific system messages, no exclamation marks, all six languages together. |
| **Expected behaviour** | In all six languages: sentence case for labels and headings (German keeps noun capitals by grammar; French and Spanish capitalise only the first word and proper nouns); no hyphen used as punctuation; compounds are rewritten as two words or a different phrase (for example "hand-inked" becomes "hand drawn"; part names and standard terms stay: I2C, Wi-Fi, USB-C, ESP32-S3); no exclamation marks; no filler words; system messages say what happened and what to do; the brand is written `iynk`, lowercase. Remove the retired `dashboard.*` keys from `shell.json` except `dashboard.continue.*` and `dashboard.overall`, which `DashboardProgress.tsx` still reads (`ContinueMessages = Shell["dashboard"]["continue"]`), after `git grep -n "dashboard\." src` shows no other reader. Remove `footer.*`/`ui.*` keys that no file reads (the builder greps each). Update tests and specs that quote a changed string in the same commit; `DashboardProgress.test.tsx` reads `shell.dashboard.start` and `shell.dashboard.browse` (lines 70-79), so update it in the same commit when those keys are dropped. |
| **Existing files** | `src/i18n/messages/*/common.json` (62 lines), `shell.json` (164 lines), `hw.json` (86 lines in `zh`, similar in others); readers: `e2e/shell.spec.ts` (imports the English JSON), `components/**` tests that quote strings (`git grep -n` each changed English value in `src` and `e2e`). |
| **New files** | none. |
| **Design values** | UI_RULES Copy; the guard R14 (English). |
| **States** | Not applicable. |
| **i18n** | This is the i18n. |
| **Tests** | `V src/i18n` (key and placeholder parity); `UIC src/i18n/messages/en/common.json src/i18n/messages/en/shell.json src/i18n/messages/en/hw.json` prints 0; `E bu-52 e2e/shell.spec.ts` (it reads these JSON files, so it follows the new text); the B1 copy check `node scripts/copy-check.mjs` stays 0. |
| **Acceptance** | Given the English files, When `UIC` runs on them, Then 0 hits. Given any of the six languages, Then no label is in Title Case and no string ends in an exclamation mark. |
| **Proof commands** | `TL`; `V src/i18n src/components`; the `UIC` line above; `node scripts/copy-check.mjs`; `E bu-52 e2e/shell.spec.ts`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing. |

---

### T-BU-53. Copy pass 2: boardlab, robotics

| Field | Content |
|---|---|
| **Identity** | Id T-BU-53. Subsystem i18n. Phase BU. Priority P0. Dependencies T-BU-31. Group G11. Source files: 2 (`messages/*/boardlab.json`, `messages/*/robotics.json`). |
| **Problem** | English `boardlab.json` has 35 and `robotics.json` 26 hyphenated compounds in running text; some labels and button texts are Title Case; `robotics.json:309,312` use "Unlock"/"unlock" for the quiz lock (allowed verb, but check tone). Lab teaching prose (`src/i18n/content/**`) is out of scope (question 11). |
| **Expected behaviour** | Same rules as T-BU-52, applied to the two namespaces in six languages. Strings read by tests (`boardlab` check messages such as "All checks pass. Lesson done.", `{passed} of {total} checks pass`; `e2e/boardlab.spec.ts` imports the JSON) keep their meaning; quoted literals in unit tests are updated in the same commit. |
| **Existing files** | `messages/*/boardlab.json` (440 lines in `zh`), `robotics.json` (330). |
| **New files** | none. |
| **Design values** | As T-BU-52. |
| **States** | Not applicable. |
| **i18n** | This is the i18n. |
| **Tests** | `V src/i18n src/components/boardlab src/components/robotics`; `UIC` on the two English files prints 0; `E bu-53 e2e/boardlab.spec.ts e2e/robotics.spec.ts`. |
| **Acceptance** | `UIC` R14 prints 0 for the two files; both lab specs pass. |
| **Proof commands** | `TL`; the commands above. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing. |

---

### T-BU-54. Copy pass 3: dronelab, flight, together

| Field | Content |
|---|---|
| **Identity** | Id T-BU-54. Subsystem i18n. Phase BU. Priority P0. Dependencies T-BU-31. Group G11. Source files: 3 (`messages/*/dronelab.json`, `flight.json`, `together.json`). |
| **Problem** | `dronelab.json` has 48 hyphenated compounds, `flight.json` 18 and six exclamation marks (`flight.json:105` "Hand launch!", `:121` "{line}. {medal} medal!" and four more, found by `grep -n '!' en/flight.json`); `together.json` still carries rooms copy that B1 and R-022 may hide. |
| **Expected behaviour** | Same rules as T-BU-52 in six languages. Game messages stay playful in meaning but calm in form ("Hand launch." and "{line}. {medal} medal."). The `{line}` and `{medal}` placeholders survive. Specs that read `flight.json` (`e2e/fly*.spec.ts`) follow the JSON. |
| **Existing files** | `messages/*/dronelab.json` (350 lines), `flight.json` (328), `together.json` (238). |
| **New files** | none. |
| **Design values** | As T-BU-52. |
| **States** | Not applicable. |
| **i18n** | This is the i18n. |
| **Tests** | `V src/i18n src/components/flight src/components/dronelab`; `UIC` on the three English files prints 0; `E bu-54 e2e/fly.spec.ts e2e/fly-fun.spec.ts e2e/dronelab.spec.ts e2e/room.spec.ts`. |
| **Acceptance** | `grep -c '!' src/i18n/messages/*/flight.json` prints 0 for all six; `UIC` prints 0 for the English files. |
| **Proof commands** | `TL`; the commands above. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing. |

---

### T-BU-55. Copy pass 4: ai, search

| Field | Content |
|---|---|
| **Identity** | Id T-BU-55. Subsystem i18n. Phase BU. Priority P0. Dependencies T-BU-31. Group G11. Source files: 2 (`messages/*/ai.json`, `messages/*/search.json`). |
| **Problem** | `search.json` has 14 hyphenated compounds; B1 rewrote its price strings ("Catalogue prices ... shop prices when you add a search key"); `ai.json` carries partner voice lines. Error and status lines should be calm, specific and say what to do ("Upload failed. The file is over 20 MB."). |
| **Expected behaviour** | Same rules as T-BU-52 in six languages; failure messages name the cause and the next step; "not set up" lines follow B1's `notSetUp.*` pattern. `RealBuildPanel.test.tsx` quotes strings: update them in the same commit. |
| **Existing files** | `messages/*/ai.json` (136 lines), `search.json` (220). |
| **New files** | none. |
| **Design values** | As T-BU-52. |
| **States** | Not applicable. |
| **i18n** | This is the i18n. |
| **Tests** | `V src/i18n src/components/ai src/components/search`; `UIC` on the two English files prints 0; `node scripts/copy-check.mjs` exits 0; `E bu-55 e2e/keyless.spec.ts`. |
| **Acceptance** | `UIC` R14 prints 0; the copy check stays green. |
| **Proof commands** | `TL`; the commands above. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Nothing. |

---

### T-BU-56. Remove the compatibility aliases and `marketing/`

| Field | Content |
|---|---|
| **Identity** | Id T-BU-56. Subsystem styles, ui. Phase BU. Priority P0. Dependencies every sweep (20 to 47), T-BU-43, 48. Group G12. Source files: 5 (`styles/tokens.css`, `styles/type.css`, `styles/motion.css`, `styles/layout.css`, `ui/Button.tsx`); deletes `components/ai/icons.tsx` and the folder `components/marketing/`. |
| **Problem** | G2 kept the old names so unswept screens looked right: `.ink-card`, `.ink-plate`, `.ink-field`, `.ink-kicker`, `.ink-label`, `.ink-prose`, `.ink-hand`, `.shell-meta`, `.accent-serif`, `--radius-ink*`, `--shadow-ink*`, `--card-line`, `--card-shadow`, `--shadow-c`, `--halo`, `--font-head`, `--font-accent`, `--font-display`, `animate-ink-*`, `--line`, and in `Button.tsx` the `ink` variant and `lg` size. "No ghosts in the project" (CLAUDE.md): once nothing uses them they go. |
| **Expected behaviour** | Prove nothing reads each name: `git grep -nE "ink-(card|plate|field|kicker|label|prose|hand)|shell-meta|accent-serif|rounded-ink|shadow-ink|animate-ink|font-head|font-accent|border-line|card-line|card-shadow|--halo|--shadow-c" -- src` prints nothing; `git grep -n 'variant="ink"\|size="lg"' -- src` prints nothing; `git grep -n "components/ai/icons\|from \"./icons\"" -- src/components/ai` prints nothing; `git grep -n "components/marketing" -- src` prints nothing (its importers were repointed by T-BU-26, 27, 43 and 48) and `git grep -nE "mk-(display|accent|eyebrow|rise)" -- src` prints nothing; `git grep -nE "size=\{(12|14|18)\}" -- src` prints nothing (every sweep snapped its icon sizes, so T-BU-58 can narrow the `Icon` type). Then delete the definitions, the two `Button` aliases, `ai/icons.tsx` and the folder `src/components/marketing/` (`index.tsx`; `marketing.css` went in T-BU-26). If a grep still hits, that file is fixed in this commit only if it is one of the five; otherwise the task stops and reports the file and its owner task. |
| **Existing files** | The four style files (T-BU-04 to 07), `ui/Button.tsx` (T-BU-08), `ai/icons.tsx` (T-BU-02). |
| **New files** | none. |
| **Design values** | None change; the visible result is identical because nothing used the aliases. |
| **States** | Not applicable. |
| **i18n** | None. |
| **Tests** | `V src/styles src/components`; build equality is not required here (the CSS shrinks); `BUILD bu-56`; `E bu-56 e2e/shell.spec.ts e2e/boardlab.spec.ts e2e/robotics.spec.ts e2e/dronelab.spec.ts e2e/dock.spec.ts` (the visual result must not change: compare two screenshots of `/en` and a lesson before and after). `UIC` over all of `src` runs here for the first time and must print 0 (apart from allow listed lines); any hit is fixed in its owner file by a follow up task opened by the orchestrator. |
| **Acceptance** | Given the tree, When the greps above run, Then they print nothing. Given the home page and a lesson, Then screenshots before and after are identical. |
| **Proof commands** | `TL`; `node scripts/ui-check.mjs` exit 0; the greps (including `git grep components/marketing`, whose proof moved here from T-BU-43); `BUILD bu-56`; `E bu-56` as above. |
| **Rollback** | `git revert`. |
| **Later tasks need** | T-BU-57 and 58 need a clean guard. |

---

### T-BU-57. Screenshot and axe Playwright spec

| Field | Content |
|---|---|
| **Identity** | Id T-BU-57. Subsystem tests. Phase BU. Priority P0. Dependencies T-BU-56. Group G13. Source files: 4 (`e2e/visual.spec.ts`, `e2e/support/visual.ts`, `playwright.config.ts`, `.gitignore`). |
| **Problem** | The only visual check is a manual look (1.5) and axe runs inside four specs on four screens. Later phases (B4 and on) will add screens and bring back old habits; Amar wants this kept as a regression aid. |
| **Expected behaviour** | `e2e/support/visual.ts` exports `SCREENS` (name, path, optional `before(page)` for overlays), `VIEWPORTS` (`desktop` 1440x900, `phone` 390x844 with `hasTouch`), `THEMES` (`light`, `dark`), `setTheme(page, theme)` (an `addInitScript` that writes `localStorage["iynk:v1"]` as `{ v: 1, done: {}, quiz: {}, best: {}, settings: { theme, sound: false, lofi: false, labels: true, reduceMotion: false, telemetry: false } }` using `STORAGE_KEY` and `DEFAULT_SETTINGS` imported from `src/lib/progress/storage`), and `settle(page)`: it waits for `document.fonts.ready` and for no `[aria-busy="true"]` skeleton, then scrolls the page from the top to the bottom in steps of `innerHeight * 0.8`, waiting two animation frames after each step so the `IntersectionObserver` callbacks of `Reveal`, `Section` and the tagline words run, scrolls back to the top, waits until `document.getAnimations()` holds no running finite animation (cap 1.5 s) and waits one more frame. Reveals and tagline words light once and stay lit, so the full page screenshots show every section and axe scans the final colours (an unlit tagline word at 30 percent ink would fail `color-contrast`). The context does not use `reducedMotion: "reduce"`, so the shipped motion is what is checked, and there is no axe exclusion. `e2e/visual.spec.ts` imports `test, expect` from `./support/no-egress` and loops viewports, themes and screens: home `/en`, `/de`, `/hi`; `/en/boards`, `/en/boards/uno-r3`, `/en/boards/uno-r3/blink`; `/en/robotics`, `/en/robotics/l298n`; `/en/drones`, `/en/drones/quad5`, `/en/drones/quad5/fly`; `/en/together`; `/en/about`; `/en/privacy`; `/en/does-not-exist` (404); and overlays: Settings popover, command menu (`Control+K`), keys dialog, the dock open (desktop), the mobile menu (phone only). For each: no `pageerror`; `scrollWidth <= innerWidth`; one visible `main`; axe with the wcag2a, wcag2aa, wcag21a, wcag21aa tags reports 0 findings of impact `serious` or `critical` (the violations list is attached to the test on failure); a full page screenshot is written to `test-results/ui-shots/<theme>-<viewport>-<name>.png` always, with `iframe`s and the live hero figure masked; when `UI_SHOTS=compare` it also calls `toHaveScreenshot` against the local baseline (`maxDiffPixelRatio: 0.01`, `animations: "disabled"`, `caret: "hide"`). `playwright.config.ts`: a `visual` project (`testMatch: /visual\.spec\.ts/`, Desktop Chrome) and the `chromium` project's `testIgnore` gains `visual\.spec\.ts`; `snapshotPathTemplate` puts baselines in `e2e/visual.spec.ts-snapshots/`; `.gitignore` gains that folder and `test-results/ui-shots/`. |
| **Existing files** | `playwright.config.ts:44-52` (projects), `e2e/support/no-egress.ts`, `e2e/shell.spec.ts:53` (the axe call shape), `lib/progress/storage.ts:5,31-39`. |
| **New files** | `e2e/visual.spec.ts`, `e2e/support/visual.ts`. |
| **Design values** | The matrix of UI_RULES: 1440x900 and 390x844, light and dark. |
| **States** | The spec covers default states and the overlays above; loading and error states are T-BU-50's. |
| **i18n** | Three languages sampled for the home page (`en`, `de`, `hi`: the longest labels and a non Latin script). |
| **Tests** | The spec is the test. After `settle()` on `/en` every `.tagline-word` has `data-lit="true"` and no `Reveal` element has computed `opacity` 0. It must pass three times in a row. A deliberate regression (a `text-[17px]` in a component) does not fail it (the guard does), but a contrast regression does (axe). |
| **Acceptance** | Given the finished UI, When `E bu-57 e2e/visual.spec.ts` runs, Then it writes about 90 PNGs, axe finds nothing serious or critical anywhere, and no screen scrolls sideways. |
| **Proof commands** | `TL`; `E bu-57 e2e/visual.spec.ts --repeat-each=3 --retries=0`; then the agent opens every PNG (1.5) and writes one line per screen. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Every later phase adds its screens to `SCREENS`. |

---

### T-BU-58. Wire the guard into `check`; the ui barrel; the contributor UI doc

| Field | Content |
|---|---|
| **Identity** | Id T-BU-58. Subsystem tooling. Phase BU. Priority P0. Dependencies T-BU-56. Group G13. Source files: 5 (`package.json`, `scripts/ci-local.sh`, `.github/workflows/ci.yml`, `src/components/ui/index.ts`, `src/components/ui/icons.tsx`); doc `docs/UI.md` (docs are not counted). |
| **Problem** | The guard exists but does not run unless someone remembers; the barrel `ui/index.ts` does not export the new components; a contributor has no page that says how the UI is made. |
| **Expected behaviour** | `package.json`: `"ui:check": "node scripts/ui-check.mjs"` and `check` becomes `npm run content:check && npm run typecheck && npm run lint && npm run ui:check && npm run test && npm run e2e` (B0/B1 may have changed the list; the builder inserts the step after `lint`). `scripts/ci-local.sh` and `.github/workflows/ci.yml` gain a `ui-check` step (and keep the 5 file rule's note out of CI). Last step: `ui/icons.tsx` narrows the `Icon` `size` prop from `number` to `16 \| 20 \| 24 \| 32` and deletes the runtime rounding that T-BU-02 added (no dead code); `icons.test.tsx` swaps the rounding table for a `@ts-expect-error` case showing that `size={18}` is rejected. `tsc` is the proof that every sweep snapped its sizes (T-BU-56 greps for `size={12}`, `size={14}`, `size={18}` first). `ui/index.ts` exports `Skeleton`, `SkeletonGroup`, `PageSkeleton`, `EmptyState`, `InlineStatus`, `Reveal`, `Menu`, `TextArea`, `FieldMessage`, `CommandMenu` next to the existing ones. `docs/UI.md` (new): the design values of section 1.2 in short form, the component list with one line each, the rules W1 to W15 as a checklist, how to run `ui:check` and the visual spec, how to add a screen to `SCREENS`, and the note that figures and the simulation canvas are exempt. |
| **Existing files** | `package.json:5-24` (scripts), `scripts/ci-local.sh`, `.github/workflows/ci.yml` (B0), `ui/index.ts`, `ui/icons.tsx` (T-BU-02). |
| **New files** | `docs/UI.md`. |
| **Design values** | None new. |
| **States** | Not applicable. |
| **i18n** | None (English doc). |
| **Tests** | `scripts/ci-local.test.mjs` (B0) expects the step list: update it. `npm run ui:check` exits 0; `bash scripts/ci-local.sh` exits 0. |
| **Acceptance** | Given a change that adds `text-[19px]`, When `npm run check` runs, Then it fails at `ui:check` with the file and line. |
| **Proof commands** | `TL`; `V scripts`; `npm run ui:check`; `bash scripts/ci-local.sh`. |
| **Rollback** | `git revert`. |
| **Later tasks need** | Every later phase runs the guard. |

---

### T-BU-59. Phase exit gate (no file changes)

| Field | Content |
|---|---|
| **Identity** | Id T-BU-59. Subsystem verification. Phase BU. Priority P0. Dependencies all other BU tasks. Group G14. Source files: 0. |
| **Purpose** | Prove the phase exit criteria on the finished `build/ui` and report to the orchestrator. The orchestrator stops for Amar's OK and then merges into `build/v1` (before B4) and tags `phase-BU`. No commit unless a proof fails and a fix task is opened. |
| **Preconditions** | Clean tree on `build/ui` (`git status --short` empty). B1's gate evidence exists. No other process uses the machine heavily. |
| **Steps and commands** | 1. `npm run content:check && npm run typecheck && npm run lint`. 2. `npm run ui:check` exits 0. 3. Keyless full check: `KL npm run check` (includes the guard, vitest, every e2e spec, the states, motion and visual specs). 4. `BUILD bu-gate` exits 0. 5. Open every PNG the visual spec wrote (`test-results/ui-shots/`, about 90) and write one line per screen: verdict (good, cheap, cramped, misaligned, generic) and what was fixed; any "cheap" or "cramped" opens a fix task. 6. Keyboard walk with Playwright on `/en` and a lesson: Tab order starts at the skip link, every control shows a ring, Escape closes the popover, the command menu and dialogs, focus returns. 7. Reduced motion: `E bu-gate e2e/motion.spec.ts`. 8. Grep proofs, all printing nothing: `git grep -nE "Instrument_Serif|Instrument Serif|font-style: italic|\bitalic\b|fontStyle|font-accent|accent-serif" -- src ':!src/content'`; `git grep -nE "ink-(card|plate|field|kicker|label|prose|hand)|rounded-ink|shadow-ink|animate-ink|shell-meta|border-line" -- src`; `git grep -nE "lucide|feather|material-symbols" -- src package.json`; `git grep -nE "window\.(alert|confirm|prompt)" -- src`; `git grep -nE "<style" -- src`. 9. Fonts: the built `static/media` folder holds Geist, Geist Mono and Noto Sans Devanagari files and no Instrument file (`ls .next-bu-gate/static/media`). 10. Performance: if B1's `budgets.json` job exists, run it and compare first load JS of `/en`, a lesson and a bench with the B1 baseline; Phosphor must not add more than 15 KB gzip on `/en` (ESTIMATED limit, the deep imports keep it near the 40 icons used); report the numbers. 11. CSP: if `e2e/csp.spec.ts` exists, it passes with 0 violations. 12. `npm audit --omit=dev` shows 0 high and 0 critical; `node scripts/secret-scan.mjs` exits 0. 13. `git log --format='%an <%ae>%n%b' build/v1..build/ui` shows only Amar Kushwaha and no `Co-Authored-By` or "Generated with" line. 14. `git diff --stat build/v1...build/ui -- . ':!src' ':!e2e' ':!scripts' ':!docs' ':!package.json' ':!package-lock.json' ':!playwright.config.ts' ':!next.config.ts' ':!.gitignore' ':!.github'` prints nothing (no figures, no engine, no server code changed). 15. Contract check: the section 1 test ids and roles are present (`E bu-gate e2e/shell.spec.ts e2e/dock.spec.ts`). |
| **Evidence to return** | A table: step, command, exit code, key numbers (tests passed, e2e passed, axe findings, PNG count, JS size delta, seconds), and the per screen verdict list of step 5. |
| **Pass rule** | Every step passes. A failed step opens a fix task (new id, same rules) in the right group; do not edit thresholds. |
| **Acceptance** | Given the tree after G13, When all fifteen steps run, Then all fifteen pass and the orchestrator can ask Amar for his OK and plan the merge (section 5 item 2). |
| **Observability** | The evidence table and the PNG folder are the record. |
| **Release blockers** | Any failed step; a serious or critical axe finding; a screen judged cheap or cramped. |
| **Definition of done** | Evidence returned; nothing pushed; nothing deployed. |
| **Rollback** | `git reset --hard build/v1` on `build/ui`, or revert per task. |
| **Later tasks need** | B4 starts from the merged tree. |

## 8. Exit check against the phase goal

| Scope item (Amar's list) | Tasks |
|---|---|
| Design tokens in Tailwind v4: type scale, spacing, radius, motion curve and durations, one gray family and one accent, dark surfaces, z-index scale, tinted shadows | 01, 04, 05, 06, 07, 56 |
| Fonts: remove Instrument Serif and every italic; tabular numbers; text wrap | 05, 26, 43, 52 to 55, 56 |
| Phosphor icons replacing the current icons in chrome | 02 and every sweep (W7), guard R9 |
| Base components: button, icon button, field with inline error, select or menu, tabs, slide over panel, command menu, skeleton, empty state, inline status | 08, 09, 10, 11, 12, 13, 14, 15 |
| Existing chrome moved onto them | 16 to 18, 20 to 23, 27 to 30, 32 to 35, 41, 42, 44 to 47 |
| Floating nav, full height mobile panel, current page mark | 19, 24 |
| Theme choice without a sun and moon switch | 17 (kept and restyled), 15 (also a command) |
| Home page rebuilt with landing Part A, tagline reveal included | 31, 36 to 40, 43 |
| Ship items: skip link, branded 404, meta and og, legal and licence links, landmarks | 25, 48, 49 |
| States across screens: no alert, skeletons, empty, inline errors | 09, 11, 18, 20 to 47, 50 |
| Motion pass | 06, 24, 37, 51 |
| Copy pass in six languages | 31, 52 to 55 |
| Screenshot plus axe spec in light and dark at desktop and phone size | 57 |
| Guard and docs so it stays | 03, 58 |
| Exit proof | 59 |

Requirements covered: UI_RULES Type (05, 52 to 55), Spacing (07, sweeps), Radius (07, sweeps), Color (04), Icons (02), Motion (06, 24, 37, 51), Nav (19, 24), States (11, 50), Components (08 to 15), Copy (31, 52 to 55), Ship (25, 48, 49), Verify (57, 59). Landing Part A: intake assumptions stated in the Hero card (one offer, one audience, one primary action: open the workbench), page structure A2 (hero with one proof signal, tagline reveal, benefits, how it works, proof, FAQ, risk reversal in the reassurance line, final CTA), layout type A (classic hero plus sections), copy rules A5 (benefit first, specific, no filler), SEO A7 (indexed, FAQ in plain Q and A with JSON-LD), pitfalls A8 (one CTA above the fold, no vague verbs).

Counts: 59 tasks in 14 groups. Seventeen tasks are sweeps by area (72 files); seven carry the base components; seven carry the home page and its copy; five carry the shell (nav, mobile panel, footer, settings, workspace chrome and dock). 21 tasks edit exactly 5 source files; none edits more.

## Review fixes (2026-10-28)

All 26 review items were checked against `build/v1` (HEAD `dcf897f`, read only), the packed `@phosphor-icons/react@2.1.10` (`npm pack` into `bu-scratch/phos/`) and computed contrast ratios. All 26 held and none was skipped. Items 1, 2, 6, 11 and 16 were applied with a change from the proposed fix, which the row states. Section 2 was regenerated from the card Identity rows (Pri, Depends on, Group, Src), so the index and the cards agree. The number of tasks that edit exactly 5 source files is now 21 (44 drops to 4; 18 and 58 rise to 5; 26 drops to 2; 31 rises to 3), and the sweeps touch 72 files.

| # | Result | What changed |
|---|---|---|
| 1 | Applied, widened | Verified importers: `page.tsx`, `not-found.tsx`, `Editorial.tsx`, `DashboardProgress.tsx`, `Catalogue.tsx`. T-BU-26 moves `typeClass`, `Wrap`, `SectionHead`, `riseDelay`, `CtaLink`, `ArrowLink` and also `Accent` (old `page.tsx` still needs it until 43; T-BU-51 deletes it) into `Editorial.tsx`; `marketing/index.tsx` is a one line re-export. T-BU-26 has 2 source files now (the `marketing.css` delete is not counted). 25, 27, 37 and 48 gained dependency 26 because they import from Editorial; G6 says 26 lands before 25 and 27. T-BU-43 no longer deletes `marketing/` (title changed); T-BU-56 deletes the folder and carries the `git grep components/marketing` proof. |
| 2 | Applied, one correction | T-BU-31 creates `home/primitives.tsx` (3 source files) and now depends on 11 and 26; T-BU-43 edits it instead of creating it and creates only `home/index.ts`. `src/lib/repo.ts` guess removed from 40. Correction: the workbench link carries the language and the first lesson entry (`page.tsx:62`), so `WORKBENCH_HREF` is the language free path `/boards/uno-r3` and `workbenchHref(lang, uno)` builds the link; `Hero` and `FinalCta` receive it as a prop instead of reading a constant. Import notes added to 36 to 40. |
| 3 | Applied | `faq.1.a` and `faq.6.a` reworded as asked; `home-copy.test.ts` asserts no value matches `/sign up/i` or `/price/i` (two regexes, because a pipe breaks the table cell). The five other languages are translated from the new English. |
| 4 | Applied | `bg-paper/90`. Computed worst cases: light 4.67, dark 6.26 (review said 6.29; my mix rounds slightly differently). At 80 percent they were 3.66 and 4.45. NavBar test asserts the class and the contrast. |
| 5 | Applied | T-BU-24 renders the panel through `createPortal(..., document.body)` like `ui/Sheet.tsx:38` (verified), reuses `useModal`, the test asserts the parent is `document.body`, and the Playwright check says "with the bar present". |
| 6 | Applied, moved | `Icon` keeps `size?: number` and rounds at runtime (T-BU-02). Measured call sites: 6 `size={12}`, 13 `size={14}` (review said 10), 11 `size={18}`; `LabDock.tsx:241` (review said 240). The narrowing to `16 \| 20 \| 24 \| 32` is in T-BU-58, not T-BU-56: T-BU-56 already edits 5 files and the 5 file rule would break. T-BU-56 gets a grep precondition (no `size={12\|14\|18}` left), T-BU-58 deletes the runtime rounding with the narrowing and uses `tsc` as the proof. T-BU-58 is now 5 files. |
| 7 | Applied | `board` is `Cpu`, `drone` is `Fan`, fallback wording and question 13 rewritten. Verified in the tarball: `Propeller.es.js` and `CircuitBoard.es.js` are missing from `dist/ssr`; every other mapped name exists. |
| 8 | Applied | T-BU-04 adds the eight `--color-*` aliases and a test that every semantic name has one. Verified that `@theme inline` has none of them today (`--accent` is only a var at `globals.css:183`). |
| 9 | Applied | Section 1.2 and T-BU-04 list `--console-ink #e8e8e8`, `--console-muted #a3a3a3`, `--console-accent #8af0ae`, `--console-warn #f4b829`, `--console-err #ff8a7a` plus `--console-bg #181818` and `--console-well #000000`, same in both themes. Computed contrast on bg and well: 14.49/17.14, 7.04/8.33, 12.81/15.16, 9.92/11.73, 7.75/9.17. Test asserts at least 4.5. |
| 10 | Applied | R1 matches `Instrument_Serif` and `Instrument Serif` only; default scan is `src/components src/app src/styles src/lib` plus English messages for R14, skipping tests and `src/content`; R10 rewritten; T-BU-59 step 8 grep replaced. Verified the three `Texas Instruments` lines and the two `javascript:alert(1)` test lines. Fixtures added to the T-BU-03 tests. |
| 11 | Applied, option A, widened | 13, 15 and 52 to 55 are P0. Option B (R14 as a warning until T-BU-55) fails if any one earlier copy pass is dropped. The same defect applies to T-BU-35 (T-BU-56 needs 0 guard hits in its files), so it is P0 too. No P1 task is left; section 2 says why. |
| 12 | Applied | Light `--accent-hover` is `#dc6248` (4.64 to 1; the old `#d95f45` is 4.47). Test covers `--on-accent` on `--accent-hover` in both themes (dark 6.82). |
| 13 | Applied | Shadows read `var(--shadow-a1/a2/a3)`, light .08 .12 .18, dark .5 .6 .7, and the test asserts both. Section 1.2 text matches. |
| 14 | Applied | T-BU-09 uses `warn-circle` and the Field test asserts it. T-BU-48 uses `warn-circle` and T-BU-28 uses `warn` (the triangle, right for a fault row); both are as intended. |
| 15 | Applied, scroll method | `settle()` scrolls top to bottom in `innerHeight * 0.8` steps with two frames after each, returns to the top, waits for running animations to end. No reduced motion context, no axe exclusion. T-BU-37 acceptance and T-BU-57 test say so. |
| 16 | Applied, option A | `motion.css` sets `--default-transition-duration: 300ms` and the timing function. The timing function is `var(--ease-iynk)`, not a second literal `cubic-bezier(`, because the T-BU-06 test allows exactly one. Measured 20 bare `transition` lines (review said 24). R7 accepts bare `transition*`; fixtures in T-BU-03, assertions in T-BU-06. |
| 17 | Applied | `client.state.saved` added to T-BU-11 (five keys, de, es, fr given); sentence removed from T-BU-18; `settings/LocalLog.tsx` added to T-BU-18 (5 files) and 4.2; T-BU-14 added to its dependencies; B1 T-B1-27 added. |
| 18 | Applied | `together/api.tsx` is 5 lines (only `roomPath`). Removed from T-BU-44 (4 files), 4.2, the UIC command and the Problem text. |
| 19 | Applied | `new URL('/sitemap.xml', siteUrl()).href` and `new URL(path, siteUrl()).href`; manifest sentence fixed; `sitemap.test.ts` asserts no `//` after the scheme. Verified `siteUrl(): URL` at `seo.ts:8`. |
| 20 | Applied | T-BU-49 depends on 05, 25. T-BU-25 depends on 08, 11, 19, 26 and imports `PageHead`, `Section`, `PageSkeleton`. |
| 21 | Applied | 36 and 38: 11, 26, 27, 31. 51: 06, 11, 26, 43, 44 to 47. 17 gained B1 T-B1-02. 56 gained 48. Index regenerated from the cards. |
| 22 | Applied | `globals.css:67-68`, `Tabs.tsx:103,127`, `IconButton.tsx:46-72`, `Popover.tsx:91`, `Button.tsx:9-27`, `fly/page.tsx:38`, `search/shared.tsx:88` (the `external` helper), `api.tsx:45` removed. Each line read at `build/v1`. T-BU-06 had no wrong quote. |
| 23 | Applied | Chip `tone` union is `neutral \| ink \| good \| bad \| warn \| info` plus the six legacy tones typed deprecated; the Chip test covers all. |
| 24 | Applied | R13 covers `font-mono` and `font-ui` with the same allowed lines (and console lines); W11 and 1.4 updated. Section 1.2 lists the allowed arbitrary widths (680px, 1440px, nav `calc(100%-2rem)`, popover and sheet `min()` widths, dock width, workspace `min-h` calc, hero figure `min-h`). |
| 25 | Applied | One sentence each in T-BU-19 (`prefetch`), T-BU-16 and T-BU-22 (B1 dynamic imports and Suspense fallbacks), T-BU-52 (`DashboardProgress.test.tsx` lines 70 to 79 read `dashboard.start` and `dashboard.browse`, verified). |
| 26 | Applied | Toggle track and Meter track get a 1 px `--muted` border (5.84 to 1). `--accent` is 2.84 on paper and 2.57 on sunken (computed). T-BU-04 test checks the token ratios against an `OUTLINED` list; the Toggle and Meter tests assert the border. |

Final group list (unchanged in shape): G1 01 to 03; G2 04 to 07; G3 08 to 14; G4 15 to 18; G5 19 to 23; G6 24 to 30 (26 before 25 and 27); G7 31 to 35; G8 36 to 42; G9 43 to 47; G10 48 to 51; G11 52 to 55; G12 56; G13 57, 58; G14 59.
