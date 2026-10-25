# UI audit: Drone Lab (F-audit-drones, 2026-10-25 02:30–02:45 CDT)

Phase 1 of the final pass (`scripts/workflows/final.md`). Read only: no code changed. Everything was walked on the driver's
production server `http://127.0.0.1:3430` with Playwright (Chromium) at 1440 × 900, 1920 × 1080 and 390 × 844 (touch,
`isMobile`), light and dark, English plus German and Hindi.

Covered: `/en/drones` (and `/de`, `/hi`), all 13 workshops (`quad5 whoop cinewhoop longrange racer gpscam delivery
agrihex wing vtol swarm tricopter octo`, every tab clicked), the quad5 bench end to end (Build it for me, wiring sheet,
the three tests, CLI with five commands, quiz, design pick, keyboard dialog, exploded view), and the fly pages of quad5,
wing, vtol, swarm and octo (arm, fly with W and the arrows, FPV, reset, Break it, crash replay, the fix, gamepad
mapping, controls legend, daily challenge, ghosts).

Screenshots and the raw numbers are in the auditor's scratchpad (not committed):
`/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/5990e040-4ffc-48cb-ba35-923d41b56efe/scratchpad/F-audit-drones/`
(`shots/*.png`, `results-*.json`, `verify.json`, and the scripts `audit.mjs`, `verify.mjs`, `verify2.mjs`). Below,
"shot:" names a file in `shots/`.

Owners used below: **drones** = F-build-drones (`src/components/dronelab/**`, `src/components/flight/**`,
`src/app/[lang]/drones/**`, `dronelab.json`, `flight.json`, `e2e/dronelab.spec.ts`, `e2e/fly*.spec.ts`); **shell** =
F-build-shell (`src/components/ui/**`, `globals.css`, header); **panels** = F-build-panels (dock, data, figure host);
**engine** = the figure engine (`figures/**`, out of scope for every builder: the driver decides); **lib** =
`src/lib/dronelab/**` and `src/lib/flight/**`, which no F-build section lists (F-direction or the driver must assign
them; drones is the natural owner).

## What works and must be kept

- All 13 workshops answer 200 and the figure reports ready in 0.2–0.75 s; every fly page is interactive in about 2.6 s.
  **0 console errors** on the 37 page loads the walk watched. **No sideways scroll** at 390 px in en, de or hi on any drone page.
- axe (WCAG 2.1 A/AA) is clean on `/en/drones` and finds no colour-contrast problem on the workshop or the fly page
  (the two violations it does find are listed below).
- The live design calculator (tiles, checks with numbers, cost table) and its effect on the fly page.
- The build flow: step chips (fitted / next / flipped), per-step fit and take-off, "Try a real mistake", parts in the box.
- The CLI emulator reads like Betaflight: `status` with arming-disable flags, `get` with range and default, `set`,
  `save` → reboot → CLI re-entry, `Unknown command, try 'help'`, history on the arrow keys, "Try it" snippets.
- Break it → the crash replays at ⅓ speed with a REPLAY badge → "Here's why" names the root cause in real terms
  (`align_board_yaw = 180`) → one button fixes it. This is the best demo moment in the lab; keep every step of it.
- The FPV view: OSD with pack voltage, current, mAh, timer, gate arrow and distance, artificial horizon.
- Ghosts (the autopilot's line, your best lap), medal times, the daily challenge with a share link.
- Keyboard: `?` dialog, `F` into the figure and `Esc` out, Space/R/V, `aria-keyshortcuts` on the buttons.
- The per-craft palette band on the index cards and the "Fig. 01" numbering: it is the SimLab look and reads well.
- Every `data-testid` used by `e2e/dronelab.spec.ts`, `fly.spec.ts`, `fly-fun.spec.ts`, `fly.phone.spec.ts`.

## Measurements

| Page | Viewport | Main figure (px) | Share of the screen | Notes |
|---|---|---|---|---|
| workshop (all 13) | 1440 × 900 | 633 × 475 at y 372 | **23 %** of the area, 44 % of the width | page capped at `max-w-7xl` (1280), 80 px gutters |
| workshop | 1920 × 1080 | 633 × 475 | **14.5 %** of the area, 33 % of the width | 320 px empty gutters each side |
| workshop | 390 × 844 | 358 × 394 at y 550 | 43 %, but the craft itself is about 100 × 60 px (see B1) | figure starts below the first screen |
| fly | 1440 × 900 | 743 × 558 at y 382 | **32 %**; bottom edge 40 px **below the fold** | live stats at y 977–1236: all below the fold |
| fly | 1920 × 1080 | 743 × 558 | **20 %** | |
| fly | 390 × 844 | 358 × 394 at y 529 | 43 % | touch sticks 118 px each inside it |

- Fly page column balance at 1440: the left column (range, stats, ghosts) ends at y 1292, the right rail at y 2633: a
  **1,340 px empty column** under the range. Page height 2,997 px.
- Workshop page height 2,563–2,695 px at 1440; 3,928 px at 390. Index 2,431 px at 1440, **5,723 px at 390** (13 cards ×
  ~370 px).
- Type in use on one workshop page: 12 different sizes (10.4, 11.2, 12, 14, 15, 15.2, 16, 18, 20, 30.4, 52 px, plus 30 px
  stats on the fly page) in three families (Newsreader, Source Sans 3, IBM Plex Mono). Monospace bold carries most of the
  UI (12 px/700 is the commonest style: 31 elements on the workshop, 66 on the index).
- Button styles in use on the workshop alone: 11 distinct (height × size × radius × fill × shadow), for example 36 px
  ghost pills (Sound, Use the figure), 36 px segmented, 44 px raised icon button, 44 px figure-control chips, 44 px tabs
  with square tops, ink-shadow primary and secondary, small ghost "Take X off", tomato danger pills, bordered pill
  "end" buttons inside the wiring table. Two select styles: the workshop's `ink-field` pill (44 px) and the fly page's
  native select (8 px radius, 34 px, hard-coded `var(--paper,#f2efe7)`).

## Blockers

**B1. Phone workshop: the craft is a thumbnail and the figure is mostly its own buttons.** 390 × 844, en and hi, light
and dark. The plate is 358 × 394, but the figure's own control stack (Add next part, Remove a part, Build it for me, Take
it apart, Exploded view, Plug/unplug, Smoke stopper, Check motor direction, Calibrate, Wiring sheet) fills the top
~55 % and the HUD (parts, checks, battery) the next ~15 %; the mat with the drone is about 100 × 60 px at the bottom, and
the dock's "Open lab tools" button sits on top of it and on the Labels pill. Before the figure even starts (y 550) the
judge scrolls past crumb, kicker, title, sub, progress, Fly it, the readiness note, Bench/Wiring sheet, Exploded view and
Use the figure. Why it matters: on a phone the product (the figure) is not visible. shot:
`verify-phone-bench-figure.png`, `bench-quad5-en-phone-light-0-open.png`, `bench-quad5-hi-phone-dark-0-open.png`.
Proposal (drones + engine + panels):
1. Phone order: compact title row (title 24–28 px, progress as a thin bar under it), then the figure full-bleed
   (`width: 100vw`, height `min(68svh, 560px)`), then a sticky tab bar, then the panel. Move Bench/Wiring sheet and
   Exploded view into one 44 px toolbar row directly above the figure; drop "Use the figure" from the phone layout (the
   `F` shortcut means nothing on touch).
2. Hide the figure's own control stack when embedded in the workshop: the host already has every one of those actions
   (Build tab, Tests tab, the toolbar). No such switch exists in `figures/engine/embed.js` today, so this needs the
   engine owner (driver) to add one (for example a `set {chrome: "min"}` the host sends, keeping See-through, Labels,
   zoom and the HUD). Until then the larger plate in U1 is the mitigation.
3. One bottom action area on the phone: "Fly it" and the dock's button side by side in a sticky bar, not a floating
   button over the figure (panels owns the dock button; agree the bar's slot with them).

**B2. Phone fly: "Open lab tools" sits on both touch sticks.** 390 × 844, quad5 (and every craft). With the range
scrolled into view the sticks are at x 28–146 and 244–362, y 710–828; the dock button is at x 118–272, y 788–832. It
covers the inner edge of both sticks, exactly where a thumb rests; a judge flying on a phone opens the dock instead.
The sticks themselves (118 px, opaque paper fill) also cover the lower 40 % of the 394 px range. shot:
`verify-phone-fly-sticks.png`, `fly-quad5-en-phone-light-0-open.png`. Proposal (drones + panels): on the fly page the
dock button hides while the range has focus or is armed (or moves to the top-right of the header area); the range on a
phone takes `100svh − header − one 48 px control row`, with the sticks at 30 % opacity rings (no fill) in the bottom
corners; Arm, Reset and FPV become three 44 px icon buttons overlaid on the range's top edge.

**B3. The Break it payoff and the live numbers are off screen on a laptop.** 1440 × 900, quad5 fly, any craft. The
range is 382–940 px, so its bottom 40 px (the FPV OSD's ALT / mode / speed line and the crash chip "HIT A GATE POST.
PRESS R TO RESET") is below the fold, the stats grid starts at 977 px, and the "Here's why" card with the fix button
appears under the range at about 945 px. While the range has focus the arrow keys and Space fly the craft, so the judge
cannot scroll to the explanation with the keyboard. shot: `fly-quad5-en-laptop-light-3-crashwhy.png` (only the REPLAY
badge is visible) vs `fly-quad5-en-laptop-light-3b-crashwhy-scrolled.png`. Proposal (drones): see U2 for the frame; the
"Here's why" card renders as an overlay inside the range frame (bottom-left, `max-width: 26rem`, ink border, the fix
as the primary button), and the stats become a single telemetry strip directly under the range or overlaid on its
bottom edge (U5).

## Ugly

**U1. The workshop is a document, not a workspace (1440 and 1920).** Every workshop, light and dark. The figure gets
23 % of a laptop screen and 14.5 % of a wide one; ~300 px of header (crumb, kicker, 52 px title, sub, a progress row
and a right-aligned readiness note) sit above it; the right panel's height jumps with the tab (Design ~500 px, Build
~1,500 px); below the figure come the status row, the Betaflight log and the whole dock, then two prose columns and the
usage toggle. shot: `bench-quad5-en-laptop-light-0-open.png`, `-0-full.png`, `bench-quad5-en-wide-light-0-open.png`.
Proposal (drones, on the shell's workspace frame):
- Frame: below the site header, `height: calc(100dvh − header)`, two columns `minmax(0,1fr) clamp(400px, 32vw, 560px)`,
  no max-width, 16–24 px outer gutter. The panel column scrolls inside itself; the page does not scroll in the workspace.
- One 56 px toolbar row across the top: back arrow · `FIG. 01 · FREESTYLE · BETAFLIGHT 2026.6.2` kicker · title at
  24–28 px serif · (right) progress bar with count, Sound, Keys, **Fly it**. The sub ("Betaflight + FPV") joins the kicker
  or goes; the readiness note becomes the Fly it button's tooltip and `aria-describedby` (keep the id).
- The figure fills the left column (about 970 × 760 at 1440 × 900, 57 % of the screen; about 1,350 × 940 at 1920, 61 %).
  Bench/Wiring sheet, Exploded view and the figure-focus button float as one small toolbar on the figure's top-left.
- The status row (parts / battery / fault) goes: the figure's HUD already shows PARTS, CHECKS and BATTERY. Keep the
  `data-testid="bench-status"` element as a visually hidden live region if the e2e spec needs it, or move it into the
  toolbar as three compact readouts.
- The Betaflight log becomes a collapsible drawer at the bottom of the figure column, closed by default to one line
  (the last log line), opening to 160 px: like an IDE's terminal.
- "Meet the …" and "Practice task" move to a seventh panel tab ("About" / reuse `workspace.meet`) or below the
  workspace as a reading section; the usage toggle belongs to the footer or settings (shell).

**U2. The fly page wastes the screen and splits the cockpit.** 1440 and 1920, every craft. Range 32 % / 20 % of the
screen; mode select, Arm, Reset, FPV, Wind on one row and Gamepad, Controls as text-like ghost buttons on a second row
with an odd indent; the course hint line; the range; the 13-stat grid; ghosts. The right rail is 1,500 px of stacked
sections (challenge, design, arming rules, courses, Break it, leaderboard, dock). shot:
`fly-quad5-en-laptop-light-0-open.png`, `-0-full.png`, `fly-quad5-en-wide-light-0-open.png`. Proposal (drones): same
frame as U1. The range fills the left column (height `100dvh − header − 56 px toolbar`); the toolbar carries back,
title, mode select, Arm (primary), Reset, FPV, Wind, then Gamepad and Controls as icon buttons that open popovers over
the range (not panels that push the page down). The right rail scrolls inside itself, in this order: Courses (with best
and medals) → Break it → Flying this design + Arming rules (collapsed to one line "8 of 8 OK" that expands) → Daily
challenge → Leaderboard → dock.

**U3. Arming rules contradict Break it.** quad5 fly, 1440. With "Skip the accelerometer calibration" and "Mount the
flight controller backwards" switched on, pressing Arm says "Arming blocked: ACC not calibrated…" while the pre-flight
list shows **OK** for "Accelerometer calibrated" and "Flight controller arrow points forward" and
`data-can-arm="true"`. Cause: `flyRules()` (`src/lib/dronelab/fly.ts:44`) reads only the bench summary, never
`state.breaks`. shot: `verify-accbreak.png`; numbers in `verify.json` (`accBreak`). Proposal (lib + drones): pass the
breaks in; a broken item shows a tomato chip "Broken on purpose" with the Break it label, `acc` keeps level `block` so
the list and the Arm refusal agree, `fcArrow` / `props` / `motorDir` stay `warn`.

**U4. Arming rules use the 5-inch quad's words on every craft.** Every fly page. The list always says "No vented
capacitor (unplug and re-seat the XT60 the right way)" and "Smoke stopper test passed", but the swarm Crazyflie has no
smoke-stopper test and a BT2.0 lead, the whoop a BT2.0 lead, gpscam a power module, delivery a PDB, agrihex a PDU,
octo a power board (their `parts.XT60.short`). A judge who knows drones sees a 5-inch checklist on a 28 g Crazyflie.
shot: `fly-swarm-en-laptop-light-0-open.png`. Proposal (lib + drones + `dronelab.json`): `armingRules` takes the
content: the capacitor rule names the craft's own power-lead part (`{part}` placeholder filled from `parts.XT60.short`),
and a rule for a test the craft doesn't have (`content.tests` kinds) is left out.

**U5. Thirteen loud stat tiles under the range.** Fly, every size. 30 px extra-bold monospace for State, Battery,
Altitude, Speed, Throttle, Current, Used, Next, Best, Laps, Crashes, Medal times (+ Splits): "4.20 V/cell" and
"10 / 14 / 20 s" wrap to two lines, "none yet" is set at 30 px. Medal times and Best repeat what each course row
already shows. The grid is a `<dl>` holding `Stat` divs: axe reports **definition-list (serious)** on the fly page, and
no e2e spec runs axe there. shot: `fly-quad5-en-laptop-light-3b-crashwhy-scrolled.png`. Proposal (drones): one
telemetry strip, 12 px kicker labels and 18–20 px tabular values, `white-space: nowrap`: State · Battery · Alt · Speed ·
Throttle · Current · mAh · Next · Lap clock/best · Crashes; medal times only on the course row; render it as
`<div role="list">` or real `dt`/`dd`; add `expectNoAxeViolations` to `e2e/fly.spec.ts` once it passes.

**U6. The wiring sheet is illegible on the bench.** quad5 workshop, 1440, Wiring tab → "Show the wiring sheet". The
hand-inked sheet renders at about 275 × 140 px inside the 633 × 475 plate, to the right of the figure's control stack:
no label on it can be read without the zoom buttons. The brief asks for a clickable wiring diagram; this one is a
postage stamp. Exploded view stays switchable while the sheet is up and does nothing visible. shot:
`bench-quad5-en-laptop-light-3-wiring.png`, `-9-exploded.png`. Proposal: the larger plate (U1) and, in the engine, fit
the sheet to the plate when it opens (engine owner); host side (drones), disable the Exploded view toggle while the
sheet is shown.

**U7. The wiring table squeezes its ends into wrapped pills; on a phone it scrolls sideways inside itself.** quad5
Wiring tab, 1440 and 390. "XT60 + CAP", "4-IN-1 ESC" wrap to two lines inside bordered pill buttons in 1,440 px; the
table has `min-w-[34rem]`, so at 390 it scrolls horizontally and cuts "PADS AND PROTOCOL". shot:
`bench-quad5-en-laptop-light-3-wiring.png`, `bench-quad5-en-phone-light-3-wiring.png`. Proposal (drones): each wire as a
row card: `FROM → TO` as two text buttons with the kind's colour dot (`whitespace-nowrap`, 44 px tall hit area,
underline on hover), then the pads label in mono and the note under it; no table, no min-width. Keep the
select-both-ends behaviour and the legend.

**U8. The figure's control stack is cut off and duplicates the page.** Workshops with more figure buttons (wing: "Check
elevons", "CG check" and one more; agrihex: "Pump test", "RTK fix" and more): the stack runs past the plate's bottom
edge and the last buttons are clipped. On every workshop the stack covers the left third of the craft (props and
labels sit under it), and the same actions exist three times: in the figure, in the host toolbar, and in the Build /
Tests tabs ("Figure controls (12)" adds a fourth list). shot: `drone-wing-laptop.png`, `drone-agrihex-laptop.png`,
`bench-quad5-en-laptop-light-2-built.png`. Proposal: as B1.2 (engine switch to hide the stack in the workshop); host
side (drones), keep the "Figure controls" disclosure only as the keyboard/screen-reader path, collapsed and visually
quiet (text link, not a full-width card).

**U9. Design selects truncate the very thing being picked.** Design tab, 1440: "6S 1100 mAh LiPo" shows as "6S 1100 mAh
LiPc", wing "4S LiPo 2200 mAh" loses "mAh", agrihex "12S 22000 mAh sm…", "8120 100KV (sea…", "30x9.9 folding c…". The
three selects share a 575 px panel in three columns (~183 px each). shot: `drone-agrihex-laptop.png`,
`drone-wing-laptop.png`. Proposal (drones): one select per row, label on the left (120 px) and the select filling the
rest; or a 1-column grid whenever the panel is under 640 px.

**U10. Tests: a refused test says nothing in its row; "Build it for me" claims tests it didn't count.** quad5 Tests tab,
1440. After "Build it for me" (props on), "Run: Motor direction check (props off)" is refused: the reason ("PROPS OFF!
Never spin motors on the bench with props on") shows only in the figure's toast and the line under the figure, the row
stays "Not run yet" with no hint how to take the props off. And the build toast says "Built: every part on, smoke
test, motor check and calibration done" while the Tests tab shows 0 of 3 run. shot: `verify2-motors.png`,
`bench-quad5-en-laptop-light-4-tests.png`. Proposal (drones + `dronelab.json`): when the figure refuses a test, show the
refusal inside that row (`role="alert"`, tomato rule) with a one-click fix where the host knows it ("Take the props
off" → `bench/remove PROPS`); ask the engine owner to drop "smoke test, motor check and calibration" from the
build-for-me toast, or count those runs as attempted on the host.

**U11. The catalogue has no pictures of the crafts.** `/en/drones`, all sizes. Thirteen text cards: band, title, sub,
three chips, three stats, hashtags, progress. For a lab whose product is the hand-inked figure, the index shows none.
On a phone the cards are ~370 px each: 5,723 px of scrolling. At 1920 the grid stays 3 columns in 1,280 px with 320 px
gutters. shot: `index-en-laptop-light.png`, `index-en-wide-light.png`, `index-en-phone-dark.png`. Proposal: a still of
each craft on its card (top, 16:10, paper background). Stills can come from `figures/tools/cfshoot.py` (it writes
`angle-*.png`) into a new folder such as `public/posters/drones/<id>.webp` (not `public/figures/**`): a driver/engine
task. Drones side: the card takes an optional poster; drop the hashtag row (it repeats the class chip and the sub);
progress becomes a 3 px line along the card's bottom edge with the count in the stats row; 4 columns at ≥ 1536 px;
on a phone a compact card (poster left 96 px, title, class chip, AUW · T:W · time in one line) at ~140 px tall.

**U12. On 12 of 13 fly pages the first thing in the rail sends you to the quad.** wing, vtol, swarm, octo and the
others. The daily challenge card (dashed border, top of the rail) says "5-inch freestyle quad on Gate race…" with
"Fly it with the 5-inch freestyle quad" when the day's craft is another one. shot: `fly-wing-en-laptop-light-0-open.png`.
Proposal (drones): when the challenge is on another craft, collapse it to one line at the bottom of the rail ("Today's
challenge: 5-inch quad · Gate race →"); full card only on the challenge's own craft.

**U13. Native, off-palette controls on the fly page.** The flight-mode select (34 px tall: under the 44 px touch target
on a phone), the ghost checkboxes, and the gamepad panel's selects, checkboxes and deadband slider are browser
defaults: blue accent, system font, square corners; the Controls legend is a fourth card style (`rounded-xl`, ink
border, no shadow) next to `Card`. shot: `fly-quad5-en-laptop-light-4-legend-pad.png`, `fly-quad5-en-phone-light-0-open.png`.
Proposal (drones, using shell components): the mode select uses the same `ink-field` select as the Design tab (44 px);
ghosts and gamepad Invert use `Toggle`; `accent-color: var(--ink)` for any remaining native input; Controls and Gamepad
as popovers on the range (U2) using `Card`.

**U14. Degraded sponsor panels take a screen's worth of space.** Workshop and fly, every craft. "The lab partner isn't
set up on this deployment" sits in a ~380 px box with ~150 px of blank above it; "Leaderboards aren't set up here" is a
full card. On a deployment without keys this is the common case. shot: `bench-quad5-en-laptop-light-0-full.png`,
`fly-quad5-en-laptop-light-0-full.png`. Proposal (panels): one muted line each, no empty chat area; the drones page just
places the dock in the rail (U1/U2).

**U15. The same message three times.** Workshop: a figure event shows as the figure's toast, again as a bold line under
the figure (`figure-flash`), and again in the Betaflight log. Fly: the crash text shows in the range and again under it,
while the root cause in "Here's why" names something else ("Hit a gate post" vs "The flight controller was mounted
backwards"). shot: `bench-quad5-en-laptop-light-2-built-full.png`, `fly-quad5-en-laptop-light-3b-crashwhy-scrolled.png`.
Proposal (drones): keep the host lines as screen-reader live regions (`sr-only`) since the figure shows the toast; in
"Here's why", lead with the immediate cause and then the root cause ("Hit a gate post, because the flight controller
was mounted backwards…") so the two agree.

**U16. Phone tab bar hides two of six tabs.** Workshop at 390: the Tabs strip is 466 px wide in 358 px; "CLI" is cut to
"C" and "Quiz" is off screen, with no fade or arrow. shot: `bench-quad5-en-phone-light-0-open.png`,
`verify-phone-bench-tabs.png`. Proposal (drones, or shell if fixed in `Tabs`): a 3 × 2 grid of 44 px segments on phones,
or a scroll strip with an edge fade and the active tab scrolled into view; sticky under the header while the panel
scrolls.

## Nits

- **N1.** The keyboard-shortcuts button uses the "info" (i) icon; use a keyboard icon or a "?" glyph (shell icon set).
  All workshops and fly pages.
- **N2.** "Use the figure" is unclear to a first-time judge (it moves keyboard focus into the figure). Make it an icon
  button with the label "Control the figure with the keyboard (F)" as its accessible name and tooltip; hide it on
  touch. Keep `aria-keyshortcuts="F"`.
- **N3.** Disabled primary "Every part is on" keeps a mustard fill and reads as the main call to action (light and
  dark). Disabled buttons should drop the fill and shadow (shell `Button`).
- **N4.** Build steps wrap at 1440 when the "Take FLIGHT CTRL off" button doesn't fit (step 5 drops it to a second line).
  Put the take-off action as a 44 px icon button (×) with the text as its accessible name.
- **N5.** Quiz answers are set in IBM Plex Mono bold; long sentences read badly in mono. Answers in the body sans, mono
  only for labels. shot: `bench-quad5-en-laptop-light-6-quiz.png`.
- **N6.** German: the tile label "FLUGZEIT, HART GEFLOGEN" wraps to two lines and makes that tile taller than its row
  (`hyphens: auto` and a shorter `design.tiles.flyMin` in de, e.g. "FLUGZEIT (SPORT)"). shot:
  `bench-quad5-de-laptop-light-0-open.png`.
- **N7.** Hindi: uppercase-style kickers keep their letter-spacing on Devanagari ("उड़ान का समय", "थ्रस्ट : वज़न"),
  which pulls the letters apart; `:lang(hi) .ink-kicker { letter-spacing: 0 }` (shell). shot: `index-hi-phone-light.png`.
- **N8.** The readiness note under the header is right-aligned (`text-end`), also on a phone where it wraps under a
  left-aligned button. Left-align it on phones (or make it the button's tooltip, U1).
- **N9.** The console colours are hard-coded hexes (`#1d2a26`, `#8af0ae`, `#f2c230`, …) in `DroneWorkspace` and
  `CliConsole`; the touch sticks and the fly select use `var(--paper,#f2efe7)` fallbacks. Make them tokens
  (`--console-bg`, `--console-ink`) so dark mode and any palette change reach them.
- **N10.** At 1440 holding W for 1.5 s in altitude hold reaches the 16 m field ceiling and a large structure fills the
  chase camera's view: the craft disappears behind it (shot: `fly-quad5-en-laptop-light-1-flying.png`). Engine/camera,
  for the engine owner.

## For other owners (seen on drone pages, not drones' files)

- **Shell, ugly:** in German at 1440 the header nav wraps every item to two lines ("Board-/Labor") and the
  theme switch breaks out of the header (its third button drops below, the pill overlaps the page). shot:
  `index-de-laptop-light-full.png`, `bench-quad5-de-laptop-light-0-open.png`, `fly-quad5-de-laptop-light-0-open.png`.
- **Engine:** the figure HUD's "OFF" is untranslated ("AKKU OFF", "बैटरी OFF"); axe reports **nested-interactive
  (serious)** on `iframe #fig` inside the quad5 figure after build + wiring sheet + exploded (shot:
  `bench-quad5-en-laptop-light-9-exploded.png`); in dark mode both the bench plate and the range stay light paper, a bright
  block in a dark page: F-direction should decide whether that is the intended look.
- **lib:** U3 and U4 live in `src/lib/dronelab/bench.ts` and `fly.ts`, which no F-build section owns.

## Priority for F-build-drones (most value per minute)

1. U1 + U2 frame (full-viewport workspace and fly cockpit), with B3's in-range "Here's why" and U5's telemetry strip.
2. B1 and B2 phone layouts (with panels for the dock button).
3. U3 + U4 arming rules (needs the lib owner), U10 test refusals, U5 axe fix.
4. U9, U7, U13, U16, U12, U15.
5. U11 card posters if the driver produces stills; the card trim either way.
