# UI audit: the shell (F-audit-shell, 2026-10-25 02:45 CDT)

Final pass, phase 1 (`scripts/workflows/final.md`). Surface: the header, the footer, the landing / dashboard (`/en`),
`/en/about`, `/en/together`, `/en/passport`, `/en/verify`, the 404 (`/en/nope`), the theme and language controls,
the settings toggles, and the untranslated notice.

## How this was checked

- Server: the driver's production build on `http://127.0.0.1:3430`, read only. `/api/status` says `solana` on and
  everything else off; the Solana config check fails, so Passport and Verify show "not set up" and stay out of the nav.
- Walk (`walk.mjs`): the six pages at 1440 × 900, 1920 × 1080 and 390 × 844 (touch profile), light and dark, in en;
  light at 1440 and 390 in de, hi and zh. 120 page loads, a viewport and a full-page screenshot each, computed styles
  for every element with text (size, line height, weight, family, colour), every button's look, touch targets under
  44 px, elements past the right edge, and axe (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`).
- Header (`header.mjs`): all six languages at 768, 900, 1024, 1280, 1440 and 1920 wide.
- Clicks (`interact.mjs`, `recheck.mjs`, `odd.mjs`, `settings.mjs`, `tablet.mjs`): the three theme options and arrow
  keys, reload, the language picker and Back, every header, footer, dashboard and 404 link, the logo, a 16-stop Tab
  tour with focus styles, a returning learner (one lesson saved), the phone menu (focus trap, Escape, theme, a link,
  the language), Together (segments, Open the room, Join with a bad and a good code), unprefixed and mistyped URLs,
  the Sound and usage toggles on a lesson, and the tablet widths 768 and 1024.
- Every screenshot named below was read. Paths are under `<scratchpad>/F-audit-shell/`, where `<scratchpad>` is
  `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/5990e040-4ffc-48cb-ba35-923d41b56efe/scratchpad`. Raw numbers:
  `out/*.json`.

## The numbers

| Page | 1440: content width (left edge) | 1920: content width (left edge) | Page height 1440 / 390 | Above the fold at 1440 |
|---|---|---|---|---|
| `/en` dashboard | 1280 (80) | 1280 (320) | 1898 / 3479 | h1, two CTAs, hero plate, "The three labs" and the card tops |
| `/en/about` | 896 (272) | 896 (512) | 2455 / 3820 | h1, lede, "How it works" |
| `/en/together` | 1024 (208) | 1024 (448) | 1513 / 2135 | h1, Start a room, Join a room |
| `/en/passport`, `/en/verify` | 1024 (208) | 1024 (448) | 900 / ~1080 | h1, lede, one callout, then 250 px of nothing |
| `/en/nope` | 672 (384) | 672 (624) | 961 / 1144 | the 404 card |

- Header 66 px everywhere (`h-16` + 2 px rule). Footer 236 px on desktop, **479 px on the phone** (57 % of the screen).
- Hero plate 557 × 537 at both 1440 and 1920: 23 % of a laptop viewport, 14 % of a wide one. It is a static SVG.
- Type on `/en` at 1440: three families (elements with text: IBM Plex Mono 27, Source Sans 3 20, Newsreader 13) and
  eleven sizes: 9.92, 12, 14, 15.2, 16, 18, 19.2, 20, 24, 30.4 and 52 px. The codebase has eleven arbitrary sizes
  (`text-[0.65rem]` ×10, `text-[0.7rem]` ×9, `text-[10px]`, `text-[11px]`, `text-[0.62rem]`, …), five under 12 px.
- Buttons on `/en`: 52 px (lg, mustard and paper), 44 px (md, mustard), 44 px ghost nav pills, 40 px theme segments.
  Fields: the `ink-field` pill (language picker and 10 other files) and a `rounded-ink-sm` rectangle with a 2 px border
  (Together's select and code input); there is no shared field component in `src/components/ui`.
- axe: **0 violations** on every run (36 en page × theme × size runs, plus de, hi, zh at 1440). Console: no errors
  apart from the expected 404 resource line on `/nope`. No sideways scroll at 390 on any shell page in en, de, hi, zh.

## Findings, worst first

### B1. The header falls apart in Spanish, French and German, and at tablet widths in every language (blocker)

- **Where:** every page. `header.mjs`, heights of the theme control (one row is 48 px):

  | | 768 | 900 | 1024 | 1280 | 1440 | 1920 |
  |---|---|---|---|---|---|---|
  | en | 128, scroll 812 | 88 | 128 | ok | ok | ok |
  | es | 128, scroll 930 | 128, scroll 930 | 128, scroll 1096 | 128 | 128 | **128** |
  | fr | 128, scroll 846 | 128 | 128, scroll 1034 | 88 | 88 | 88 |
  | de | 128, scroll 863 | 128 | 128 | 88 | **88** | 88 |
  | zh | 128 | 88 | 88 | ok | ok | ok |
  | hi | 128 | 88 | ok | ok | ok | ok |

- **What:** the three-option theme control wraps into two or three rows and hangs 22–62 px below the 66 px header,
  over the page; nav labels break onto two lines ("Board- / Labor", "Laboratorio de / placas", "Acerca / de"); at 768
  the language picker is cut off at the right edge and the page scrolls sideways. In Spanish this happens even at
  1920 × 1080.
- **Why it matters:** it is the first thing a judge sees, on every page, and the VIDEO.md path records in Spanish.
- **Screenshots:** `crops/headers.png` (es 1920, es 1440, de 1440, fr 1440, en 1024, en 768, hi 900),
  `shots/header/<lang>-<width>.png`, `shots/home-de-light-desk.png`.
- **Cause:** logo + wordmark with its tagline + five mono-bold nav pills + a 3-segment theme control + a language select share
  one `max-w-7xl` row. Nav items may wrap, and `SegmentedControl` has `flex-wrap max-w-full`, so it grows downwards
  instead of overflowing.
- **Proposal (F-build-shell: `SiteHeader`, `NavLinks`, `ThemeControl`, `LanguagePicker`, `MobileNav`):**
  1. Replace the theme control and the language select in the bar with one 44 px **Settings** button (gear icon,
     `aria-haspopup="dialog"`) that opens a popover on desktop holding Theme, Language, Sound, Reduce motion and
     Anonymous usage counts (see U12). On the phone the same panel sits in the menu sheet. This frees about 300 px.
  2. Drop the tagline from the header (it repeats as the hero kicker and in the footer: U15).
  3. Nav links `whitespace-nowrap`; show the bar from `lg` (1024) instead of `md` (768), and verify each language at
     1024: if a language still does not fit, give the bar a measured breakpoint per language or shorter labels in that
     language's `shell.json` (es "Placas · Robótica · Drones" style). PITCH.md and VIDEO.md name no header label,
     so this is free, but list any renamed label in the report.
  4. e2e: `e2e/shell.spec.ts` lines 80–112 click the theme radios and the language combobox inside the visible header;
     they must open the settings popover first (F-build-shell owns that spec).

### B2. The progress row overflows its card: counts clipped on phones, bar and count gone on a tablet (blocker)

- **Where:** the `/<lang>` lab cards (the same component draws `BoardProgress`, `BenchProgress` and `CraftProgress`,
  so the fix lands there too). Phone (390), count's right edge past the card's inner edge: en Drone Lab +2 px,
  es +37 px, fr +19, de +19 and +11 ("0/3", "0/16"). 768 (iPad portrait): the row overflows by 96–150 px,
  so the card (`overflow-hidden`) cuts the label mid-word ("BUILDS, TESTS AND COURSE") and hides the bar and the count
  entirely. 1024 (small laptop, iPad landscape): the counts are cut to "0/8" and "0", and the Drone Lab count is
  gone. (The sideways scroll at 768 is the header's, B1.)
- **Why it matters:** clipped numbers and cut labels read as a bug on the first page.
- **Screenshots:** `crops/home-phone-labs.png`, `shots/home-de-light-phone-full.png`, `crops/tablet-768-progress.png`,
  `crops/tablet-1024-progress.png`.
- **Cause:** `ProgressBadge` puts a `shrink-0` mono uppercase label with 0.12em tracking ("BUILDS, TESTS AND COURSES"
  is about 230 px), a `min-w-12` track and a `shrink-0` count on one row; the lab grid goes three-up at `md` (768),
  where a card is about 230 px wide.
- **Proposal (F-build-shell: `ui/ProgressBadge.tsx`, `[lang]/page.tsx`):** label on its own line (`min-w-0`, allowed
  to wrap) above a row of bar + count, or `flex-wrap` with the label `basis-full` when the row is narrow; never
  `shrink-0` on text. Lab grid `lg:grid-cols-3` (one column below 1024, or two at `sm` with the third full width).

### B3. A URL without a language, or with a wrong one, is Next's bare white English 404 (blocker, rare)

- **Where:** `/boards`, `/about`, `/drones/quad5`, `/xx`, `/de-DE`, `/EN`, `/EN/boards`.
- **What:** a white page "404 | This page could not be found." with no header, no styles, no link back. (`/En/about`
  oddly serves the About page with 200.)
- **Why it matters:** a judge who types the domain plus `/boards` from the pitch, or follows a link shared without
  the language, hits a dead end.
- **Screenshots:** `shots/interact/404-badlang.png`, `shots/interact/odd-_boards.png`.
- **Proposal:** in `next.config.ts` (driver: no builder owns it) add redirects for the seven top-level sections
  without a language (`/:section(boards|robotics|drones|about|together|passport|verify)/:rest*` →
  `/:lang/:section/:rest*`), with the same cookie, `accept-language` and English fallbacks that `/` already uses; and
  a styled root not-found (Next 16 `global-not-found`, read `node_modules/next/dist/docs/` first) that looks like the
  localized 404 with links to `/en`. Owner of the page: F-build-shell.

### U1. The landing page's tab title is "Dashboard", and no page has a share preview (ugly)

- **Where:** `<title>Dashboard</title>` on `/en` (de "Übersicht", zh "总览", hi "डैशबोर्ड"); no `og:*` or
  `twitter:*` tags on any page.
- **Why it matters:** the tab, history, bookmark and the link pasted into Devpost, Slack or Discord say "Dashboard"
  with no card and no picture.
- **Cause:** `[lang]/page.tsx` sets `title` in the same segment as the layout's `template`, which only applies to
  child segments.
- **Proposal (F-build-shell):** `title: { absolute: "iynk · <tagline>" }` from the messages on the landing page;
  `openGraph` and `twitter` (title, description, `summary_large_image`) in the layout's `generateMetadata`; an
  `opengraph-image` (1200 × 630 PNG made once from `hero.svg` on paper, with the wordmark).

### U2. The hero says "Turn it round, look inside" but the picture is a static image (ugly)

- **Where:** `/en` hero, all sizes. Dragging the plate does nothing; the product (a live figure) never appears on the
  landing page. The plate is the same 557 × 537 at 1440 and 1920.
- **Why it matters:** the first interaction a curious judge tries fails, and the strongest thing iynk has is not
  shown until the second click.
- **Screenshots:** `shots/home-en-light-desk.png`, `shots/home-en-light-wide.png`.
- **Proposal (F-build-shell: `page.tsx`, `dashboard/HeroArt.tsx`; uses F-build-panels' `FigureFrame`):** mount the
  live quad5 figure (`public/figures/drones/quad5.html`, 192 KB) or the Uno (480 KB) in the hero after first paint,
  with `hero.svg` as the poster until it loads and as the reduced-motion/no-JS fallback; one hint line under it
  ("Drag to turn · See-through" style, existing strings if possible). Give it the room: hero columns about 5 : 7 with
  the figure at `min(70vh, 640px)` tall. At the very least make the plate a link to the Uno board page.

### U3. Every page centres a different width, so the left edge jumps on each click (ugly)

- **Where:** content widths 1280 (home, header), 1024 (together, passport, verify), 896 (about), 672 (404). Left
  edges at 1920: 344, 472, 536, 624. At 1920 the reading pages use 47–53 % of the width and nothing lines up with the
  logo.
- **Proposal (F-direction / F-build-shell):** one reading frame: the header's container, content left-aligned to the
  logo, with only the text measure narrowed (`max-w-[68ch]` on paragraphs); side material (a figure, the originals,
  cards) uses the rest of the row. Lab pages get the full-viewport workspace frame, and the header's inner container
  must follow it (it is `max-w-7xl` today, so on a full-width workspace at 1920 the logo would sit 320 px in from the
  workspace edge: `shots/interact/lab-1920-board.png`). Same for the footer.

### U4. Three type families with mono doing most of the talking; eleven sizes on one page; text under 12 px (ugly)

- **Where:** all pages. Nav, every button, kickers, chips, card links ("Open the Board Lab"), progress labels and
  counts are IBM Plex Mono bold, many uppercase with 0.12–0.16em tracking. The header tagline is 9.92 px uppercase.
- **Why it matters:** the brief asks for "calmer type"; mono caps everywhere is loud, wide (it is half of B1 and B2)
  and reads as a terminal rather than a product.
- **Proposal (F-direction to fix the scale, F-build-shell to implement in `globals.css` and `ui/*`):** one scale,
  12 / 14 / 16 / 18 / 22 / 30 / 52 (h1 clamp), floor 12 px; Newsreader for headings, Source Sans 3 (semibold) for nav
  and buttons, mono only for code, numbers, pin names, readouts and the one kicker style. Replace the arbitrary
  `text-[…]` sizes with the scale.

### U5. Tracking pulls Hindi words apart, and the wordmark changes font in Hindi (ugly)

- **Where:** `/hi`: the header tagline reads "खोजें · स म झें · बनाएँ", and every `ink-kicker` and `tracking-*` label
  spaces Devanagari letters. The wordmark "iynk" renders in Noto Sans Devanagari because `html:lang(hi)` overrides
  `--font-display`.
- **Screenshots:** `crops/hi-tagline.png`, `shots/home-hi-light-desk.png`.
- **Proposal (F-build-shell, `globals.css`, `Logo`/`SiteHeader`):** `letter-spacing: 0` and no `uppercase` for
  `.ink-kicker` and the shell's tracking utilities under `:lang(hi)` and `:lang(zh-Hans)`; the wordmark keeps
  Newsreader in every language (a Latin-only display variable that the Hindi override does not touch).

### U6. The phone menu's theme control wraps "Dark" onto a second row (ugly)

- **Where:** 390 × 844, menu sheet, en (and longer languages). `crops/phone-menus.png`.
- **Proposal:** in the sheet, equal-width segments in a full-width three-column grid, or a vertical radio list; or the
  settings panel from B1.

### U7. Dashboard: two buttons for one job, a "continue" box for someone who has not started, an empty dashed box (ugly)

- **Where:** `/en`. "Start with the Arduino Uno R3" (lg, mustard) and "Begin the first lesson" (md, mustard) both go
  to `/en/boards/uno-r3/board`; "Browse the boards" and "Open the Board Lab" both go to `/en/boards`. A first visit
  sees "Continue where you left off / Nothing finished yet". "Overall progress 0/613" sits alone in a 504 × 216 dashed
  box; at 1/613 the bar's fill is a 0.16 % sliver. For a returning learner, "Carry on" is below the fold (y ≈ 1150 at
  1440).
- **Screenshots:** `shots/home-en-light-desk-full.png`, `crops/dash-returning.png`.
- **Proposal (F-build-shell: `page.tsx`, `dashboard/DashboardProgress.tsx`):** first visit: no continue section, the
  hero CTA is the start. Returning: the hero's primary button becomes "Carry on" with the next lesson's name and the
  last-finished line under it, and overall progress becomes one quiet line ("1 of 613 done") in the hero or the labs
  heading row. Remove the dashed box.

### U8. The lab cards: five layers each, only a small text link is clickable, no picture (ugly)

- **Where:** `/en` "The three labs". A coloured band with a ringed icon, a bordered body with an offset shadow, a
  paragraph, a progress row, a text link. The band looks like a button and is not; the numbers (0/83, 0/369, 0/161)
  shout at someone who has done nothing.
- **Proposal (F-build-shell):** the whole card is one link (stretched link, focus ring on the card); a small figure
  snapshot of each lab on top (static SVG or PNG of the Uno, the Uno build bench and quad5, generated once); title and
  count, one sentence; progress only once something is done. Use the 4 px top rule in the lab colour that the About
  page's cards already use instead of the full band, so the two pages match.

### U9. Together: half the page is "not set up"; two field styles; a stretched segmented control (ugly)

- **Where:** `/en/together`. Build Buddies and Build Night planner are full cards whose body is only a "NOT SET UP ON
  THIS DEPLOYMENT" callout (about 470 px of a 1513 px page at 1440; more on the phone). The Join card has about 130 px
  of empty space below its field. The select and the code input are `rounded-ink-sm` rectangles while the language
  picker is the `ink-field` pill. The Boards / Robotics / Drones control spans the card with its options huddled left.
- **Screenshots:** `shots/together-en-light-desk-full.png`, `crops/phone-together-404-passport.png`.
- **Proposal:** F-build-panels (`src/app/[lang]/together/**`): when AI and the database are off, fold both features
  into one quiet line under the room cards; the segmented control at its own width (or equal segments). F-build-shell:
  one `Field` / `Select` / `TextInput` in `src/components/ui` with one shape, used by both.
- **Works:** a bad code gets an inline error with `aria-invalid`; a good code with nobody in the room says so; "Open
  the room" lands on the bench with `?room=`.

### U10. Dark mode: the logo loses its outline (ugly)

- **Where:** header and footer in dark. The mark's strokes are hard-coded `#231e16` on the `#1b1813` header, so the
  chip becomes a yellow blob with no legs. `crops/logo-dark.png` vs `crops/logo-light.png`.
- **Proposal (F-build-shell, `shell/Logo.tsx`):** strokes from a token that turns light in dark mode (`var(--line)`),
  or the mark on a small paper disc in dark mode.

### U11. Dark mode: every box has a light 2 px outline, so pages read as a wireframe (ugly)

- **Where:** all pages in dark; the Together page has four cards, two callouts, three fields and a segmented control,
  all outlined in `#cfc6b4`. `crops/dark-grid.png`.
- **Proposal (F-direction / F-build-shell, `globals.css` `.ink-card`, `Card`, `Callout`):** in dark, cards and callouts
  take a `--rule` border and no offset shadow; the strong line stays on interactive controls and on figure plates.
  Together with U4 this is most of "fewer borders and boxes".

### U12. Settings are spread over three places, and three settings have no control at all (ugly)

- **Where:** theme and language in the header; Sound in each workspace's toolbar; "Share anonymous usage counts" at
  the very bottom of every lab page (y = 7284 of 7756 on `/en/boards/uno-r3/blink` at 1440, y = 10599 of 11354 on the
  phone), and described again in the footer. `reduceMotion`, `labels` and `lofi` exist in `Settings` with no UI
  (reduce motion follows the OS only). Both toggles work: Sound flips `aria-pressed`, the checkbox writes
  `settings.telemetry`.
- **Screenshot:** `shots/interact/usage-desk.png`.
- **Proposal (F-build-shell, `components/settings/**`, `SiteHeader`):** the B1 Settings panel holds Theme, Language,
  Sound, Reduce motion and Usage counts, built from the existing components so `data-testid="sound-toggle"` and
  `"usage-toggle"` survive. Workspaces may keep their Sound button (the presenter may use it); the bottom-of-page
  usage block then goes (no e2e spec reads it; `settings/toggles.test.tsx` tests the component, not its place).

### U13. Footer: 236 px on desktop, 479 px on a phone, mostly repeats (ugly)

- **Where:** every page. Logo, name, the tagline (third time on the landing), a summary, the privacy note, the credit,
  and a two-column link list that duplicates the header. The header says "About", the footer calls the same page
  "Credits and licences".
- **Proposal (F-build-shell, `SiteFooter`, `FooterNav`):** one row on desktop (name and privacy note left; About,
  Together, Passport and Verify when on, and the Colorfigures credit right), about 72 px; about 160 px on a phone; one
  name for the About page. On full-viewport lab pages, no footer inside the workspace (it can sit below it).

### U14. The 404 is a card in a page, with one button orphaned on a second row (ugly)

- **Where:** `/en/nope` at 1440: four 44 px pills in a 672 px card, "Drone Lab" alone on row two.
  `shots/nope-en-light-desk.png`.
- **Proposal (F-build-shell, `[lang]/not-found.tsx`: not in the brief's owner list, the driver should confirm it is
  F-build-shell's):** no card; h1, one line, the primary "Back to the dashboard", and the three labs as one row of
  links (or the three lab tiles from U8). Works today: localized title and text in de (`Seite nicht gefunden ·
  iynk`), every button goes where it says.

### U15. The tagline appears three times on the landing page (ugly)

- Header subline, hero kicker and footer kicker (plus a fourth "iynk · Explore · Understand · Build" line at the end
  of About). Keep it as the hero kicker only.

### U16. About: the licence dominates, three text measures, half the screen empty (ugly)

- **Where:** `/en/about`. The MIT licence is a 430 px bordered card in the middle of the page; text measures are 672 px
  (lede), about 560 px (`ink-prose`), 672 px again, then 896 px cards. At 1440 the right 40 % of the column is empty.
  `shots/about-en-light-desk-full.png`.
- **Proposal (F-build-shell, `[lang]/about/**`):** keep the licence text but in a `<details>` ("Show the MIT licence")
  or a plain 12 px sunken block; one text measure; at 1280 and up, a second column (the three originals, or a figure
  plate) instead of empty paper; drop the closing tagline line.

### N1. Passport and Verify, when not set up, end in empty paper (nit)

- Title, lede, a callout, 250 px of nothing, then the footer; nowhere to go next. Add one secondary "Back to the labs"
  button to the callout. (Only reachable by direct link while Solana is off; Solana-on states were not testable here.)

### N2. Theme control focus ring is paper on paper (nit)

- Tab stop 8: the checked segment's outline computes to `rgb(242, 239, 231)` on the paper header; only the yellow halo
  shows. Use `--focus` with an offset. `crops/focus.png` (fourth tile).

### N3. Footer links in zh and hi are 29–40 px wide (nit)

- "总览", "一起", "डैशबोर्ड", "बोर्ड लैब" are 44 px tall but narrower than 44 px. `min-w-11` with centred text.

### N4. The untranslated notice never shows now; if it does, it pushes the workspace down (nit)

- All 38 items have prose in all six languages; none of `/de/boards/uno-r3`, `/de/boards/uno-r3/blink`,
  `/hi/drones/quad5`, `/de/robotics/uno-r3-build`, `/zh/drones/quad5/fly` renders it. In code it is a full `Callout`
  in its own `max-w-7xl` block with 24 px top padding above the workspace. For the workspace frame, make it a one-line
  chip next to the page kicker ("Text in English", with the sentence as its description) so it never costs figure
  height. Owner: F-build-shell (`shell/UntranslatedNotice.tsx`).

### N5. Heading sizes drift (nit)

- On `/en`: h2 30.4 px ("The three labs") and 24 px ("Continue where you left off"); h3 19.2 px and 20 px (lab card
  titles). One scale (U4) fixes it.

## What works and must be kept

- No sideways scroll at 390 on any shell page in en, de, hi and zh; 0 axe violations everywhere tested; no console
  errors.
- Theme: the three options switch instantly, persist across a reload (boot script, no flash), arrow keys move the
  choice, every option has a name in every language.
- Language: keeps the path (the code also carries the query and hash), sets the `iynk-lang` cookie, and Back
  restores both the page and the select. The `/` redirect honours cookie, then browser language, then English.
- Phone menu: focus lands on Close, Tab is trapped inside, Escape closes and returns focus to Menu, a link navigates
  and closes the sheet, the language select works from inside it.
- Skip link is the first Tab stop, slides in at (12, 12) and lands on `main`.
- The localized 404 inside the layout, with its own title, for any unknown path under a language.
- Together's room flow (validation, empty-room message, Open the room).
- The identity: warm paper and grain, Newsreader headings, the mustard primary, the inked plate, the five palette
  colours on the lab cards, light figure plates in dark mode. Fewer boxes and calmer type, not a different look.
- The feature row "In every lab" (four columns with a top rule, no boxes) is already the calm style the rest of the
  page should move towards.

## For F-direction: the shell decisions these findings need

1. Header: one row in every language at 1024 and up, a Settings popover instead of the theme control and language
   select, no tagline, sans nav labels, full-width container on lab pages (B1, U3, U4, U12).
2. Frames: one reading frame aligned to the header (U3) and the workspace frame for labs; footer one row, absent inside
   workspaces (U13).
3. Type scale and family roles, 12 px floor, no tracking on Devanagari and Chinese (U4, U5).
4. Components: `ProgressBadge` that wraps (B2), one field style (U9), cards with fewer layers and a softer dark border
   (U8, U11), lab card as one link.
5. Landing: live figure hero, one start action, continue only for returning learners, progress as a line (U2, U7).
6. Metadata: absolute landing title and share cards (U1). Routing: language-less URLs redirect, styled root 404 (B3,
   driver's `next.config.ts`).
