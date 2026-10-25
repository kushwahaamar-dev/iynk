# UI audit: robotics (F-audit-robotics, 2026-10-25 02:30 CDT)

Pages walked on the driver's production server `http://127.0.0.1:3430`: `/en/robotics` and all 13 benches
(`uno-r3-build`, `led-resistor`, `transistor-switch`, `esp32-s3-build`, `tb6612fng`, `l298n`, `a4988`, `pca9685`,
`mpu6050`, `hc-sr04`, `qtr-8rc`, `lm2596`, `pi5-ros2`) at 1440 × 900; `uno-r3-build`, `led-resistor` at 1920 × 1080;
`uno-r3-build`, `a4988` (de, dark), `pi5-ros2` (hi) at 390 × 844 (both as a narrow desktop window and as a touch phone);
`esp32-s3-build` in Hindi dark and `l298n` in German at 1440; the index in en, de (390), hi (dark) and at 1920 dark.
Clicked: every step's "Do it" in order with the `N` key, "Do this in the figure", the figure's "Place a part" menu,
a fault "Trigger", "Clear every fault", "Load the reference solution" then "Run checks", the `?` dialog, a quiz from
its ready notice (`Q`), Tab order from the top. Computed styles and boxes read with Playwright.

Screenshots: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/5990e040-4ffc-48cb-ba35-923d41b56efe/scratchpad/F-audit-robotics/shots/`
(below as `shots/<file>`). Scripts beside it (`measure.mjs`, `interact.mjs`, `walk.mjs`, `phone.mjs`, `contrast.mjs`).

## The numbers

| Measure | 1440 × 900 | 1920 × 1080 | 390 × 844 |
|---|---|---|---|
| Content column (bench page) | 1232 px of 1440 (86 %) | 1232 px of 1920 (64 %), 344 px empty each side | 358 px |
| Figure size | 710 × 533 (49 % of width) | 710 × 533 (37 % of width) | 358 × 394 |
| Figure top (page y) | 543–647 px, by bench | 569 px | 782–1200 px (first screen ends at 844) |
| Figure on the first screen | 15–20 % of the viewport; 253–357 px of its 533 px height | 17.5 % | 0 % (`uno-r3-build`, `a4988`), 7 % (`pi5-ros2`) |
| Height above the figure (back link, kicker, h1, sub, hint, overview) | 480–580 px = 53–64 % of the first screen | same | 870–1130 px |
| Page height | 6 537–9 180 px (7–10 screens) | 6 537–7 408 px | 15 293–16 145 px (18–19 screens) |
| Console errors, sideways scroll | 0 and none on all 13 | 0, none | 0, none (en, de, hi) |
| Index page | 1152 px column, 3 371 px tall | 1152 px of 1920 (60 %) | 5 992 px tall (de) |

Type in use on a bench: h1 52 px Newsreader 700; panel h2 20 px Newsreader ("Practice tasks" 24 px, the odd one out);
body 16 px Source Sans 3; step and fault prose 14 px; kickers 12 px IBM Plex Mono 700, 0.12em, uppercase; buttons
12 px (`sm`) and 14 px (`md`) Plex Mono 700.

Components on one bench page (`uno-r3-build`): **14 distinct button looks** (heights 36 / 40 / 44, radius pill or
8 px, fills ink, paper, mustard, tomato, transparent, with and without the ink offset shadow) and **4 card looks**
(2 px border, 15/17 px radius, padding 0 / 12 / 16 / 20 px, paper vs page background), with cards nested inside cards
in Steps, Faults and Check yourself.

Contrast (measured): muted text 5.84:1 light, 7.69:1 dark; tomato "Trigger" and "Break it" chip 5.39:1; cobalt
"Build" chip 6.22:1; "Not run yet" 6.32:1. Everything passes AA. Focus ring: 2 px solid ink, 3 px offset on every
host control (the dialog close button uses a mustard ring instead, see nits).

## Findings, worst first

### 1. blocker (perceived): breaking something happens off screen
- **Where:** every bench, every size; `shots/i-uno-r3-build-1440-3-trigger.png`, phone run in `phone.mjs`.
- **What:** "Break it on purpose" sits 2 400 px below the figure at 1440 (scrollY 2 980 when you reach the first
  "Trigger"; the figure is at y −2 407 after the click) and 8 875 px below it on a phone. The live notice that says
  what happened ("No power: USB-B socket is missing") is drawn under the figure too, so it is also off screen. The
  only visible change after "Trigger" is a small "Active" chip on the card. Steps do the same on a phone: even the
  first step's "Do it" leaves the figure 460 px above the viewport, and later steps thousands of px. Practice-task
  results are fine (they show beside the button).
- **Why it matters:** "Build it, break it, fix it" is the robotics pitch (`PITCH.md` names the LED trainer's faults).
  A judge who clicks Trigger sees nothing happen and concludes it is broken.
- **Proposal:** the workspace layout in finding 3: faults move into the right rail next to the figure, so the figure
  and the trigger are on one screen; the notice becomes an overlay inside the bottom edge of the figure frame
  (`absolute inset-x-3 bottom-3`, same `role="status"`, `data-notice` kept). On a phone the figure becomes sticky
  (finding 4).

### 2. blocker: current-draw labels say "MA" (mega-amps)
- **Where:** Live status → Current draw, every bench with a supply; `shots/uno-1440-part1.png`
  ("USB, 5 V: 500 MA THROUGH THE POLYFUSE · 5 V", "ABOUT 300 MA BEFORE THE 5 V REGULATOR OVERHEATS").
- **What:** `Meter` (`src/components/ui/Meter.tsx`, line 27) draws its label with `ink-kicker`, which is
  `text-transform: uppercase`; the supply labels carry units, so mA becomes MA. The labels also wrap to two lines and
  push "50 of 500 mA" onto two lines.
- **Why:** a hardware judge reads 500 MA as wrong engineering; it undercuts the precision the benches are built on.
- **Proposal:** F-build-shell: `Meter` label without uppercase (`font-ui text-xs font-bold text-muted`, no letter
  spacing) or a `labelCase="none"` prop. F-build-robotics: shorten the meter label to the supply name ("USB · 5 V")
  and move the limit sentence ("500 mA through the polyfuse") into the line under the bar, which already holds
  "450 mA to spare". Check every `ink-kicker` that can hold a unit or a part number (Stat labels hold "5 V RAIL",
  "3.3 V RAIL": V is fine, but "mA", "kΩ", "µF" are not).

### 3. ugly: the bench page is a long article, not a workspace
- **Where:** all 13 benches at 1440 and 1920; `shots/b-*-1440.png`, `shots/uno-1440-full.png` (+ `uno-1440-part0..5.png`),
  `shots/uno-1920-light.png`, `shots/led-1920-dark.png`.
- **What:** `max-w-7xl` column; a 480–580 px reading header (52 px h1, sub, hint, a 6–9 line overview) before the
  figure; then a 12-column grid with `items-start` that pairs unrelated panels: Serial (≈ 380 px) beside Live status
  (≈ 800 px) leaves a ≈ 420 px hole under Serial (`uno-1440-part1.png`). Under the
  figure sit the "Figure controls" disclosure, a hint line, the notice, a "Selected part" card that says "Nothing
  selected" (80 px empty state) and the whole lab dock (≈ 500 px, showing "The lab partner isn't set up on this
  deployment" on this server), which pushes Serial to y ≈ 1 900. At 1920 a third of the screen is gutter.
- **Proposal (`BenchWorkspace.tsx`, `[bench]/page.tsx`; the dock and FigureFrame stay as they are):**
  - Compact bench header, one band ≤ 140 px: back link and kicker on one line; h1 at the h2-display size (≈ 32 px);
    sub on one line; progress meter and board link right-aligned in the same band. The overview paragraph goes behind
    an "About this bench" disclosure (or the rail's first tab) with the sources list; keep the sr-only overview h2.
  - Workspace at `lg+`: full width of the viewport minus a 24 px gutter (drop `max-w-7xl` for the workspace only;
    reading parts below keep a 72ch measure), height `calc(100dvh - <site header> - <bench band>)`, min 560 px.
    Grid `grid-cols-[minmax(0,1fr)_clamp(360px,30vw,520px)]`:
    - Left: the figure filling the cell. `FigureFrame` already takes `frameClassName`; pass e.g.
      `"h-full w-full aspect-auto max-h-none"` so the figure grows from 710 × 533 to about 1000 × 700 at 1440 × 900
      (≈ 2 × the area, 100 % above the fold) and ≈ 1 340 × 860 at 1920. The notice overlays its bottom edge; the
      bench-header buttons (Sound, Go into the figure, ?) become one icon row on the figure's top edge.
    - Right rail: a `Tabs` panel (one tablist, panels scroll inside, `overflow-y-auto`): **Steps** (default),
      **Break it** (faults), **Status** (stats + current draw), **Quiz**. Each tab label carries its count
      ("Steps 3/25", "Break it 13"). Keep every panel's h2 (e2e looks up the Steps and Live status headings by
      role: keep them in the DOM; hidden tab panels must still be found where the spec expects them visible, so the
      default tab must be Steps and the spec's Live status check needs the Status panel visible or the spec updated
      by F-build-robotics in `e2e/robotics.spec.ts`).
    - A slim live strip pinned to the top of the rail, always visible: 3–4 key stats (Bench, Status, the bench's main
      reading) so the Status tab is optional while building.
    - Serial monitor: a bottom drawer under the figure (collapsed to a 40 px bar with the last line; opens to 200 px),
      the IDE-terminal pattern. `S` still focuses `[data-serial]`; open the drawer first.
  - Below the workspace (reading area, normal page scroll): Modes ("On the bench" sketches), Practice tasks (code
    editors need the width), Sources, usage toggle, prev/next. This keeps the long, code-heavy part as a page.
  - "Selected part": render only when a part is selected, as a one-line chip row inside the figure overlay
    (`data-selected-part` kept on it; render an empty `data-selected-part` element when nothing is selected if a test
    needs it).

### 4. ugly: on a phone the figure is never on screen with what you do
- **Where:** 390 × 844, all benches; `shots/uno-390-part0..2.png`, `shots/a4988-390-de-part0..1.png`,
  `shots/pi5-390-hi-full.png`.
- **What:** the figure starts at y 782–1 200, below the first screen. Steps are a 5 500 px list of 25 open cards (each
  200–270 px), then faults (13 cards), then tasks: 16 000 px in all. The board drawing is about 170 px wide inside a
  394 px frame whose top half is the figure's own control chips. The "Open lab tools" floating button sits over the
  overview text (`uno-390-part0.png`, last line "fix it.").
- **Proposal:** below `lg`: (a) overview behind the "About this bench" disclosure so the figure starts under the
  header band (target y < 300); (b) the figure `sticky top-[<site header>]` at `h-[45dvh]` with the notice overlaid,
  so steps, faults and status scroll underneath it; (c) the same tabs as the desktop rail as a segmented control
  directly under the sticky figure; (d) Steps collapsed: done steps one line (number, title, check), the current step
  open, the next ones title-only and tappable. That brings the phone page from 18 screens to about 5.

### 5. ugly: boxes inside boxes, and fourteen button looks
- **Where:** Steps, Break it on purpose, Check yourself; `shots/uno-1440-part2.png`, `uno-1440-part3.png`.
- **What:** each step, fault and quiz row is a bordered rounded card inside a bordered card with an ink shadow:
  2 px border + 2 px border + shadow, three rings deep around a 14 px sentence. 13 fault cards each carry a tomato
  "Trigger" button, a mono category chip and a "Why it happens" disclosure: 13 loud buttons in one panel. Three
  different button styles sit in the one bench toolbar (ghost "Sound", outlined pill "Go into the figure", ghost with
  a key cap "Keyboard shortcuts"). Primary appears at 36 px ("Do it") and 44 px ("Run checks").
- **Proposal:** inside a panel, rows are separated by a 1 px `border-rule` line, no card; the current step keeps a
  4 px ink bar on its left edge and the paper fill, done steps go muted with the check. Faults as a dense list: title,
  category chip, one `secondary` "Trigger" (the tomato fill only on the fault that is active, together with the
  "Active" chip); symptom and "Why" open on the row. One button per job: `primary` for the one next action on screen
  (current step's "Do it", "Run checks", "Take the quiz" when ready), `secondary` for repeatable actions (other
  steps, Trigger, starter code), `ghost` for toolbar and clear actions. Same size in the rail (`sm`, 44 px on coarse
  pointers as now).

### 6. ugly: step titles squeezed into a third of the row
- **Where:** Steps, 390 px all languages and 1440 in German; `shots/uno-390-part1.png` ("Unplug the / USB cable"),
  `shots/a4988-390-de-part1.png` ("Bis auf die / nackte Platine / zerlegen" beside "Als Nächstes"),
  `shots/l298n-de-1440.png` (step 1 is 223 px tall vs 156 in English).
- **What:** number, kind chip, title and the "Next up" / "Done" label share one flex row, so the title wraps in the
  space left over.
- **Proposal:** row 1: number + kind chip + status label (right); row 2: the title at full width. Or move "Next up"
  into the current step's left bar styling and drop the word.

### 7. ugly: the index is a sparse list of text cards with half-empty rows
- **Where:** `/en/robotics` at 1440 and 1920; `shots/index-1440-light-full.png`, `shots/index-1920-dark.png`,
  `shots/index-390-de-light.png`.
- **What:** 1152 px column; months hold 1, 2, 1, 4, 3, 2 benches, so "Start here" and Month 2 are a single 355 px
  card with 750 px of nothing beside it, Month 3 wraps one card alone onto a second row. The cards have no image of
  the thing (the figures are the product); every card shows an empty "Progress 0/32" bar. 3 371 px tall at 1440;
  5 992 px on a phone.
- **Proposal:** a roadmap layout: at `lg+` each month is a row with a 220 px left column (the month h2, a one-line
  summary, the month's progress) and the cards to its right in a 3-column grid (4 at ≥ 1680), container
  `max-w-[1440px]`; single-card months then read as a timeline, not a hole. Keep the six h2 (the e2e spec counts
  them) and `article[data-bench]` with one link each. Show the progress bar only once a bench is started; before
  that, one muted line ("25 steps · 2 tasks · 5 quizzes"). A figure picture would help most but there are no poster
  images in `public/figures/` and figures are out of scope: note for the driver (a static poster per bench from
  `cfshoot.py` would let the cards show the drawing).

### 8. ugly: sub and hint lines switch between sentence case and lower case
- **Where:** bench headers; `shots/b-l298n-1440.png` ("why not to use it" / "power it, pick a direction, feel the
  heat") vs `shots/b-uno-r3-build-1440.png` ("From the bare PCB to Blink" / "Strip it, …").
- **What:** 9 of 13 benches start sub and hint lower-case (a4988, hc-sr04, l298n, lm2596, mpu6050, pca9685, qtr-8rc,
  tb6612fng, transistor-switch), 4 start upper-case.
- **Proposal:** F-build-robotics adds `first-letter:uppercase` to the sub and hint `<p>` in `[bench]/page.tsx`
  (works in every language; a no-op for Hindi and Chinese). The prose files are the driver's if they prefer to fix
  the text.

### 9. ugly: figure text in English on German and Hindi pages
- **Where:** `/de/robotics/a4988` notice "Vref 0.544 V on the meter: the limit is 1.0 A"
  (`shots/a4988-390-de-part1.png`); `/hi/robotics/esp32-s3-build` figure buttons "Press BOOT", "Press RESET"
  (`shots/esp32-hi-1440-dark.png`).
- **What:** figure flash texts and some control labels come from the figure, untranslated.
- **Owner:** not a builder's file (`figures/**`, figure string tables). Note for the driver;
  `src/i18n/figure-keys.json` is modified in the working tree right now, so someone may be on it.

### 10. nit: keyboard path to the steps runs through the whole figure
- **Where:** Tab from the top of `/en/robotics/uno-r3-build`: back link, board link, Sound, Go into the figure,
  Keyboard shortcuts, then the iframe and its controls (13 more Tabs stayed inside the figure; it has 63 controls).
- **Proposal:** in the new layout put the rail before the figure in DOM order at `lg+` (visual order unchanged with
  `order-*`), or keep the order and make the figure a single tab stop ("Go into the figure"/`F` to enter, Escape to
  leave, as the hint already says). FigureFrame belongs to F-build-panels; the DOM order is robotics'.

### 11. nit: "Load the reference solution" replaces your code with no way back
- **Where:** Practice tasks; clicking it swapped the editor content at once, no dialog, no undo.
- **Proposal:** the notice says "Reference solution loaded" with an "Undo" button that restores the previous text
  (kept in the store for the task), or a confirm only when the editor differs from the starter.

### 12. nit: small inconsistencies
- "Practice tasks" h2 is 24 px and outside a card; every other panel h2 is 20 px inside one. Pick one.
- The `?` dialog and quiz dialog close buttons take a mustard focus ring; every other control uses the 2 px ink ring
  (`shots/i-uno-r3-build-1440-5-keys.png`). Shell's `Dialog`.
- Locked "Take the quiz" buttons (five on `uno-r3-build`) render at 50 % opacity in a column; the row already says
  "Unlocks after: …". Show a lock icon and the unlock text instead of five grey buttons.
- The steps list scrolls inside a 36 rem box at `lg` while the page scrolls too: two scrollbars on one screen. The
  workspace rail in finding 3 makes the inner scroll the only one.
- On a desktop window narrower than `sm` the step buttons are 36 px tall; on a touch device they are 44 px (checked
  with `isMobile`/`hasTouch`), so phones are fine.

## Works, keep it
- Zero console errors and no sideways scroll on all 13 benches and the index, in en, de, hi, light and dark.
- The bench logic: `N` walks the steps, "Do this in the figure" hands focus to the figure, out-of-order steps are
  refused with a reason, break steps wait for the fix ("Fix the fault first: unplug, then replace D1"), quizzes unlock
  on time and open from the notice with `Q` (`shots/w-led-resistor-1440-quiz.png`).
- Practice tasks: "Run checks" with the reference solution passed 6/6 on `uno-r3-build` in about 6 s, with a clear
  success callout, per-check Pass rows and the serial output of the run (`shots/i-uno-r3-build-1440-4-run.png`).
- The keyboard shortcuts dialog (`?`) is clear and complete; every shortcut works.
- The hand-inked look holds in dark mode (the plate stays paper, dimmed); Devanagari uses Noto Sans Devanagari and
  does not clip; German long words wrap without overflow.
- Contrast passes AA everywhere measured; the 2 px ink focus ring with 3 px offset is consistent.
- The steps list keeps the current step in view inside its panel.
- Keep for tests and the video: `article[data-bench]` (one link each), six h2 on the index, `[data-bench-page]`,
  `[data-step]`, `[data-notice]` (`role="status"`), `[data-selected-part]`, `[data-supply]`, `[data-quiz]`,
  `[data-quiz-score]`, `[data-serial]`, the Steps ("Build and break") and Live status headings by role, one iframe,
  a visible `role="meter"`, and the labels "Do it", "Do this in the figure", "Trigger", "Run checks", "Take the
  quiz", "Keyboard shortcuts". `VIDEO.md` shot 14 shows the step "Solder the through-hole joints" on
  `/en/robotics/uno-r3-build` and switches language on `/hi/robotics/esp32-s3-build` and `/zh/…`; `PITCH.md` points
  at the "LED in backwards" fault on `/en/robotics/led-resistor` and the backwards 47 µF capacitor that smokes.
