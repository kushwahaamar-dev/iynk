# UI review: the final pass checked against POLISH-SPEC (F-review, 2026-10-25 04:40 CDT)

Phase 5 of `scripts/workflows/final.md`. One production build of the tree at `665db61` (04:16), which also held the
driver's uncommitted figure and engine work (`figures/**`, `public/figures/**`, `src/i18n/figures/*.json`), served
with `next start` on port 3446 from `.next-review`. Commits after 04:16 (`ff67740` … `74c470e`, figure strings and
HANDOFF) are not in it.

Screenshots are under `<s>/F-review/shots/`, where `<s>` is
`/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/5990e040-4ffc-48cb-ba35-923d41b56efe/scratchpad`. Every one named
below was read. Raw numbers: `<s>/F-review/{en-light,en-dark,de,hi}.json`.

## How this was checked

- `walk.mjs`: 25 pages (landing, about, together, passport, verify, 404, the three catalogues, `uno-r3`, four
  lessons on `uno-r3`, `nucleo-f401re`, `basys3`, `microbit-v2`, `pi4-pi5`, the benches `led-resistor`, `l298n`,
  `uno-r3-build`, the workshops `quad5` and `wing`, the fly pages of `quad5`, `wing`, `vtol`, `swarm`, `octo`).
  English light at 1440 × 900, 1920 × 1080 and 390 × 844 (touch); English dark at 1440 and 390; German at 1440 and
  390; Hindi and Chinese on eight of them at 1440 and 390. 207 page loads: figure plate size and position, workspace
  height, sideways scroll, touch targets under 44 px, text under 12 px, console errors, and axe (`wcag2a/aa`,
  `wcag21a/aa`, iframes excluded) on the 125 English loads.
- `interact.mjs`: Settings popover and the phone menu; the header and workspace bar in de, es, fr, hi, zh at 1024 and
  1280; on `uno-r3/blink` Break it → "LED with no resistor" → Trigger, Run, Lab tools; the phone stage while the rail
  scrolls (lesson, board, bench, workshop); bench Do it, Break it and Status tabs; workshop Build it for me, Tests,
  Wiring, CLI, Lab tools; fly page "Mount the flight controller backwards" → Arm → hold W; dark mode; a returning
  learner on the landing.
- `walk.mjs --all`: every board overview (12), bench (13), workshop (13) and fly page (13) in English light at
  1440 and 390, 102 loads more, with screenshots.
- `node scripts/crawl-routes.mjs --base http://127.0.0.1:3446 --dist .next-review --workers 3` (all 786 routes).
- `E2E_SKIP_BUILD=1 NEXT_DIST_DIR=.next-review npx playwright test` (the whole suite, 86 tests).
- Also, for the driver: `npx tsc --noEmit`, `npx vitest run src/components src/i18n`, `npx eslint src e2e --quiet`.

## Results

| Check | Result |
|---|---|
| Plate share of a 1440 × 900 screen on lab pages (spec ≥ 45 %) | **46–52 %** (lessons 46, board pages 48, workshops 48, fly 46–48, benches 52), the same on all 51 lab pages of each kind |
| Plate share at 1920 × 1080 (spec ≥ 50 %) | **51–55 %** |
| Plate top edge at 1440 (spec ≤ 200 px) | **138–190 px** |
| Workspace fills the screen at ≥ 1024, no page scroll inside it | yes: `.ws` = viewport − 58 px on every lab page, every size, every language |
| Phone: figure on the first screen and stays while the rail scrolls | yes: plate top 175–238 px on load; after scrolling 900 px it sits at 62–126 px (lesson, board, bench, workshop); fly page 52 % of the screen |
| Header one row at 1024 and 1280 in de, es, fr, hi, zh | yes (58 px, nav 44 px); workspace bar 56 px in all five |
| axe on 125 English loads (light and dark, three sizes) | **0 violations** |
| Text under 12 px | only the fly telemetry units (finding U6) |
| Phone touch targets under 44 px | serial resize handle 24 px (N2), robotics "Hints" 53 × 32 (N3); "Figure controls (n)" is visually hidden until focused, by design |
| Sideways scroll on a phone | **every board page** (B1, all 12 boards); no bench, workshop, fly or reading page |
| Console and page errors | none on the 309 loads, except the 404 page's own 404 and the devnet 429 (N11) |
| Route crawl | **786 pages: 274 clean, 6 expected 404, 506 failed**: 498 are B1 (every board route in every language, 541–969 px wide at 390), 8 are a 429 from `api.devnet.solana.com` (N11) |
| E2E, whole suite | **82 passed, 2 failed, 2 skipped** in 2.4 min. Failed: `room.spec.ts:56` (Break it rows now sit in a tab) and `sound.spec.ts:53` (two "Build it for me" buttons). The tree holds uncommitted fixes to both (not mine); rerun with them, `room` + `sound` + `dronelab`: 9 passed, 1 failed, the failure being the uncommitted `dronelab.spec.ts` edit that expects quad5's fourth (failsafe) test, which this build doesn't have. Skipped: `boardlab.spec.ts:176` and `:187` (the untranslated-board notice; the spec skips it because every board's prose now exists in every language). |
| Fly page Break it with keyboard flight (FE B1, the blocker) | **fixed**: switch on, Arm, hold W → "Flipped on take-off", Crashes 1, slow-motion replay, "Here's why" with "Turn the flight controller round" |
| `npx tsc --noEmit` | 0 errors |
| `npx eslint src e2e --quiet` | 0 problems |
| `npx vitest run src/components src/i18n` | 538 passed, 4 failed, 1 skipped: `src/i18n/figure-strings.test.ts` es, fr, zh, hi ("extra" keys): the driver's figure-string delta, in progress in the tree |

## Findings, worst first

### B1 (blocker) Every board page scrolls sideways on a phone

- **Where:** all 498 board routes (12 overviews and 71 lessons × 6 languages), 390 × 844. The document is 541 px
  (`uno-r3`), 715 (`uno-r3/blink`), 834 (`pi4-pi5/blink`, hi) up to 969 (`esp32-s3-devkitc-1/blink`, de) wide.
  Robotics and drone pages are clean.
- **Why it matters:** a judge on a phone can drag the page sideways into blank paper, and the browser may zoom the
  page out to fit; it also fails `crawl-routes` for 498 routes, so gate 3 can't pass.
- **Cause:** `ScrollRow` is `overflow-x-auto` but not positioned. Its `sr-only` children (the supply and variant
  `<select>` labels and the `board-status` live region in `ViewBar`, and the readout row) are `position: absolute`,
  take the page as their containing block, and stretch the document by the row's scrolled-off width.
- **Proof:** setting `position: relative` on the page's two ScrollRows in the browser brings the document back to
  390 px on all four pages above (`<s>/F-review/fixprobe.mjs`).
- **Fix (F-build-boards, `src/components/boardlab/ScrollRow.tsx`):** add `relative` to the root's class list
  (`"relative flex shrink-0 flex-nowrap …"`). Then rerun the crawl with `--only /boards/`.
- Screenshot: `en-light_boards_uno-r3_blink_en_light_phone.png` (looks fine at scroll 0; the width is off screen).

### U1 (ugly) After the pitch's fault, the readout says "0 mA was too much"

- **Where:** `/en/boards/uno-r3/blink`, Break it → "LED with no resistor" → Trigger (PITCH 0:15). The figure's toast
  says "LED1 burned out: 113 mA is far above its 20 mA"; the readout chip under the figure says
  "LED1: burnt out (0 mA was too much)". Every language has the same template.
- **Cause:** `FigureReadout` fills `{ma}` from the live `i_mA`, which is 0 once the LED is open.
- **Fix (F-build-boards):** drop the number from `readout.part.burnt` in the six `boardlab.json` files
  (en "{part}: burnt out", de "{part}: durchgebrannt", es "{part}: fundido", fr "{part} : grillé",
  zh "{part}：烧坏了", hi "{part}: जल गया"), or keep each part's peak current in `FigureReadout` and print that.
- Screenshot: `ix_blink-fault.png`.

### U2 (ugly) A burnt LED still passes Blink

- **Where:** same page. Trigger "LED with no resistor", then Run: Checks 3/3, the Done pill and "Next: Push a button",
  with the readout still showing LED1 burnt. The lesson teaches that the LED blinks.
- **Fix (driver, lesson content `src/content/boards/uno-r3.ts`):** add a check that LED1's measured state is `ok`
  (lit) at some point in the run, the way the pin checks read the waveform. Related to FE nit 1 (Blink passes
  untouched), which the spec left to the driver.
- Screenshot: `ix_blink-labtools.png` (Checks 3/3 and Done beside "LED1: burnt").

### U3 (ugly) On a phone the robotics figure is a thumbnail under its own buttons

- **Where:** every bench at 390 × 844 (`led-resistor`, `l298n`, `uno-r3-build`). The figure's eight pills (Power ▾,
  Upload sketch ▾, Flip POWER, Strip to bare PCB, Place a part ▾, Solder joints, Remove a part ▾, View ▾) and its
  HUD fill the 358 × 326 plate; the bench drawing is about 160 × 100 px. At 1440 the same column of pills sits over
  the left of the figure. The board page (`uno-r3`) has seven of them (Upload sketch ▾, Press RESET, Strip to bare
  PCB, Pick & place SMD, Place a part ▾, Solder joints, Remove a part ▾) beside the Assembly tab that does the same.
- **Why:** the figure is the product, and on a phone it is the size of an icon.
- **Fix:** `FigureFrame hideChrome` (F-build-panels' note in `docs/requests/`) with the ids from
  `figure.info()?.buttons`. Robotics (`BenchWorkspace.tsx`, today only `["break"]`): hide the buttons whose job a
  step's Do it already sends (strip, solder, flip power, upload); keep Place a part / Remove a part / View if any
  step is "Do this in the figure" (`action === null`) and needs them. Boards (`BoardWorkspace.tsx`): hide the
  assembly buttons the Assembly tab's Do it sends; keep Press RESET. Hidden buttons still answer `press`, so the
  probe and e2e paths keep working.
- Screenshots: `en-light_robotics_led-resistor_en_light_phone.png`, `ix__en_robotics_led-resistor-phone-scrolled.png`,
  `en-light_robotics_led-resistor_en_light_desk.png`, `en-light_boards_uno-r3_en_light_desk.png`.

### U4 (ugly) "Match system" is cut by its own pill

- **Where:** the Settings popover (desk) and the phone menu, every page. The selected theme segment reads
  "Match systen": `SegmentedControl stretch` gives three equal thirds and the icon plus label don't fit a third of
  the 300 px panel.
- **Fix (F-build-shell, the theme control in `src/components/shell/`):** size the segments to their content in the
  popover (no `stretch`) or drop the three icons there; or use a shorter label if a "System" string exists.
- Screenshots: `ix_settings-desk.png`, `ix_menu-phone.png`.

### U5 (ugly) The fly telemetry wraps to a second row and grows over the range

- **Where:** every fly page in German at 1440 ("ABSTÜRZE 0" alone on row 2), and `swarm/fly` in English (the long
  Next checkpoint pushes Best and Crashes to row 2). The overlay grows from about 56 to 100 px over the range.
- **Fix (F-build-drones, the telemetry strip in `FlyWorkspace`/`FlightRange`):** keep it one row from `lg`: cap the
  Next value narrower (about 12 rem, it already truncates) and let the strip scroll (`flex-nowrap overflow-x-auto`)
  instead of wrapping; the phone layout can keep wrapping.
- Screenshots: `de_drones_quad5_fly_de_light_desk.png`, `en-light_drones_swarm_fly_en_light_desk.png`.

### U6 (ugly) Fly cockpit on a phone: the mode cuts mid-word, the HUD and hint cover the course

- **Where:** `/en/drones/quad5/fly` at 390. The mode select reads "Gate race (angl" with no ellipsis. The HUD panel
  (State, Battery, Altitude, Speed, Next) and the course hint stack over the top 40 % of the range and hide the
  "GATE 1/5" label.
- **Fix (F-build-drones):** `text-ellipsis` on the select (Chromium honours it on `<select>`) or a shorter visible
  label on phones; hide the course hint on phones once armed (or make it dismissible).
- Screenshot: `en-light_drones_quad5_fly_en_light_phone.png`.

### U7 (ugly) Telemetry units are under the 12 px floor

- **Where:** every fly page: m, km/h, %, A, mAh at 10.8 px (1440) and 9.6 px (390). Spec §1.3 sets 12 px as the floor.
- **Cause and fix (F-build-shell, `src/components/ui/Stat.tsx:25`):** the unit is `text-[0.6em]` of an 18 or 16 px
  value; make it `text-xs`.

### Nits

| # | Where | What | Owner, fix |
|---|---|---|---|
| N1 | phone menu, every page | Opening the menu moves focus to × and its Tooltip "Close menu" shows, running off the right edge | F-build-shell (`IconButton`/`Tooltip`): show tooltips on hover with a fine pointer and on `:focus-visible` only, never on a coarse pointer; keep them inside the viewport. `ix_menu-phone.png` |
| N2 | lesson serial monitor, phone | Resize handle 322 × 24 px (BL10 asked for a 44 px hit area) | F-build-boards: pad the handle's hit area to 44 px |
| N3 | bench practice tasks, phone | "Hints" summary 53 × 32 px | F-build-robotics: `min-h-11` on the summary |
| N4 | `/en/drones` at 1440 | Row-2 cards (GPS camera, Delivery, Racing) keep about 60 px of blank under the chips because Agrihex's two-line title sets the row | F-build-drones: rows as subgrid, as the board index does (`04b1973`). `en-light_drones_en_light_desk.png` |
| N5 | the three catalogues | Three kicker schemes: "MODULE 1" (boards; there is no module 2), "ROBOTICS LAB" over a slogan h1, "13 CRAFTS" | F-build-boards: kicker "12 boards" like the drones' count (`boardlab.json`, six languages) |
| N6 | drone workshop toolbar | Exploded view is a switch here and a pressed button on the board ViewBar: two controls for one job | F-build-drones: `Button variant="secondary" size="sm" aria-pressed`, as `ViewBar` does |
| N7 | `/en/boards/uno-r3` (Board view) | The readout row says "LED1: lit, 12.2 mA" for a breadboard LED the Board view doesn't draw | F-build-boards: on the board page show only the on-board LED chips |
| N8 | lesson at 1024, de | The code panel title truncates ("Probier es …") | F-build-boards: hide the title under `xl` (Run says what the panel is) |
| N9 | lesson, de | The figure's toast "Powered: Blink starts" is English | driver: figure strings (the delta in progress) |
| N10 | bench, Status tab | One state, three words: "Bench Off" (strip), "Status Stopped" (panel), "OFF" (figure); "500 mA · 500 mA to spare" reads as a repeat | F-build-robotics: the strip's word in the panel; limit line "Limit 500 mA · 500 mA to spare" |
| N11 | 8 crawled pages (zh robotics, drones, passport) and on the walk `/en/robotics`, `/en/verify` | The browser calls `api.devnet.solana.com` on ordinary pages although Proof of Build is not set up; a 429 becomes a console error and fails the crawl | driver (`src/lib/solana/provider.tsx`): mount the `ConnectionProvider`/autoConnect only when the config check passes, or swallow RPC errors |
| N12 | `/en/together` | The lede promises "the chat shows each message in your own language" while the AI service is off (PA N5) | F-build-panels: the lede without the translation clause when AI is off |
| N13 | bench and workshop bar | The bar's progress reads "0/26" (bench) and "0/10" (workshop) with its label hidden, while the Steps tab says "0/19" | F-build-shell (`ProgressBadge size="xs"`): a Tooltip with the label, or `aria-describedby` text made visible on hover |
| N14 | `/en/about` | Kicker "ABOUT" over "About iynk" | F-build-shell: drop the kicker or make it "How iynk works" |
| N15 | `scripts/crawl-routes.mjs` | `--out` with an absolute path is joined under the repo root (`join(ROOT, OUT)`) and the run dies after crawling; I had to rerun and capture stdout | driver: `resolve(ROOT, OUT)` |
| N16 | drone workshop, Design tab (`agrihex`) | The check verdict is one bold 16 px paragraph of up to seven lines | F-build-drones: the verdict's first sentence bold, the rest in body weight |
| N17 | drone workshop at 1440 with Lab tools open | The stage gives up 416 px: the toolbar's readouts are cut mid-word ("Battery unplugge", Fault gone) and the figure drops to about 540 px wide | F-build-drones: the readouts `truncate` with an ellipsis or hide under a container width; F-build-panels: from 1280 the drawer could take its width from the rail rather than the stage. `ix_drone-labtools.png` |

## What meets the spec and should stay

- The workspace frame on every lab page: bar, figure, rail and nothing below the fold at 1440 and 1920; the rail
  scrolls inside itself; the Lab tools drawer pushes the page over from 1280 and leaves the figure in view
  (`ix_blink-labtools.png`, `ix_drone-labtools.png`).
- One primary per area: Run in the code rail, Do it on the current step, Fly it in the workshop bar, Arm on the
  cockpit row, Build it for me on the empty mat.
- Break it beside the figure: the fault row turns tomato with Repair and the plate shows the toast in the same
  screen (`ix_blink-fault.png`); the bench notice overlays the plate (`ix_bench-status.png`).
- The fly page's crash path with keyboard flight (`ix_fly-crash.png`), the empty-mat overlay
  (`en-light_drones_quad5_en_light_desk.png`), the wiring rows (`ix_drone-wiring.png`).
- Phones: the sticky figure with the tablist pinned under it, the 3-column tab grid on the workshop, no floating pill.
- The header: one row in all six languages from 1024, the Settings popover with theme, language, sound, motion and
  usage; the reading pages in one frame; the 404, passport and verify pages; the landing's returning-learner line
  ("Carry on: Push a button", "Overall progress: 2 of 613 done", `ix_landing-returning.png`).
- Dark mode reads well on every lab page (`en-dark_*`, `ix_dark_*`); 0 axe violations in light and dark.

## Not checked

- The steps, faults and tests of every bench and workshop by hand: their pages were measured and screenshotted at
  1440 and 390, but clicked through only on `led-resistor` and `quad5` (the e2e suite covers more).
- Board lessons other than the five above by eye (the crawl covered all 71).
- Real touch input on the fly sticks (emulated touch only), and the room flow beyond what `room.spec.ts` covers.
