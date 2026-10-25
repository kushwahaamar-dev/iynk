# Fresh eyes: a judge with ten minutes (F-fresh-eyes, 2026-10-25 02:28–02:50 CDT)

Walked as someone who has never seen iynk, on the driver's production server `http://127.0.0.1:3430` (repo HEAD
`b44a67c` at the time), with Playwright (Chromium) from a script in my scratchpad. I read only BUILD-PLAN §1 (the
demo path) and, to check one label, VIDEO.md; no code. Every screenshot below was opened and looked at.

- Sizes: laptop 1440 × 900, wide 1920 × 1080, phone 390 × 844 (iPhone 13 profile, touch).
- Themes: light and dark. Languages: English, Spanish (phone walk), German and Hindi (Blink lesson).
- Pages: `/en` (landing = dashboard; the footer's "Dashboard" link goes to `/en`), `/en/boards/uno-r3/board`,
  `/en/boards/uno-r3/blink`, `/en/drones`, `/en/drones/quad5`, `/en/drones/quad5/fly`, `/en/robotics`,
  `/en/robotics/esp32-s3-build`, `/en/together`, the lab-tools sheet on a phone, and the `/es`, `/de`, `/hi` versions
  named below.
- Screenshots: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/5990e040-4ffc-48cb-ba35-923d41b56efe/scratchpad/F-fresh-eyes/shots/`
  (written `shots/<name>.png` below).

**Health on every page walked:** 0 console errors, 0 page errors, 0 HTTP 4xx/5xx, no sideways scroll at 390 px (en
and es). Every page loads in under 1 s on the local server.

**The short version.** Everything a judge clicks works and nothing errors. What lets the product down is the frame:
lab pages are long scrolling documents, not workspaces. The figure (the product) is cut off by the fold on a laptop.
The sponsor panels sit at the bottom of the page, and on a wide screen a third of it is empty. Two things are broken outright (the blockers): the flight controller's "Break
it" doesn't crash the drone, and a board's Break it fires where the figure can't be seen. The German header falls
apart at laptop width (U2).

---

## Blockers

### B1. Fly page, Break it "Mount the flight controller backwards": no flip, no crash, no replay

- **Where:** `/en/drones/quad5/fly`, 1440 × 900, en, light.
- **Tried:** switched on "Mount the flight controller backwards" (the switch), Arm, held W (throttle to 70%), waited
  5 s. A second run held W for 1.2 s.
- **Expected:** the section's own promise, "It flips on take-off ... a crash replays in slow motion and says why" (the
  Most Entertaining beat in VIDEO.md).
- **Happened:** the HUD read ALTITUDE 0.0 m, SPEED 9 km/h, CURRENT 58 A, CRASHES 0 for 5 s straight. The craft skates
  along the ground at full current. In the first run it slid off the edge of the range onto blank paper and kept
  going. No crash was counted, nothing replayed, and no "why" appeared.
- **Screens:** `shots/07-fcback-retry-5.png` (skating at 70% throttle), `shots/06-fly-fcback-4.png` (off the edge of
  the world).
- **Proposal:** with the FC reversed, attitude correction should push the wrong way, so the craft flips within about
  0.5 s of leaving the ground. Count it as a crash and start the slow-motion replay with the "why" card. Also count
  leaving the range, or sitting on the ground at high throttle for more than about 2 s, as a crash (or reset to the
  pad), so a craft can never drive off the map. Rehearse this shot before the demo.

### B2. Board lesson: Break it fires about 2,000 px away from the figure it breaks

- **Where:** `/en/boards/uno-r3/blink`, 1440 × 900 (same on every board lesson), en.
- **Tried:** ran Blink, scrolled to Break it, pressed Trigger on "LED with no resistor".
- **Expected:** to see the LED flash and die (VIDEO.md shot 4 says "scrolled so Break it and the figure are both in
  frame").
- **Happened:** that framing can't be done. The figure ends at y≈965 and the Break it list starts at y≈1,854. At the
  moment of the click the figure was 1,982 px above the viewport, so the judge sees a red "Happening now" card and
  misses the flash, which is the whole point. The fault itself works: scrolling up shows the figure's new state.
- **Screens:** `shots/04-break-noresistor-viewport.png` (the click), `shots/04-break-short-figure.png` (the figure,
  after scrolling back).
- **Proposal:** make Break it a tab of the right-hand panel (Code · Serial · Checks · **Break it** · Learn), so the
  figure stays on screen. At minimum, make the figure column `position: sticky` while the page scrolls. Keep the
  compact one-line rows (category kicker, title, Trigger) and keep the What you see / Why / Fix card: it is the best
  copy on the page.

---

## Ugly (works, but looks broken, cramped, wasteful or reads wrong)

### U1. Lab pages aren't workspaces: the figure is cut by the fold and the page runs for metres

- **Where:** every lab page at 1440 × 900 and 1920 × 1080, light and dark.
- **Measured:**

  | Page | Figure top (px) | Visible figure at 900 px | Page height | Figure width at 1920 px |
  |---|---|---|---|---|
  | `/en/boards/uno-r3/blink` | 470 | 430 of 496 | 7,525 | 660 (of 1,920) |
  | `/en/robotics/esp32-s3-build` | 570 | 330 | 8,111 | about 700 |
  | `/en/drones/quad5/fly` (the range) | 383 | 517 | 3,021 | 745 |
  | `/en/drones/quad5` | 372 | 528 | 2,563 | about 630 |

  At 1920 every page is capped at 1,232 px, leaving 344 px of empty gutter on each side. On a phone the Blink lesson is
  12,367 px tall and the bench 16,602 px.
- **Why it matters:** the brief is "utilize the entire page dimension". A judge's first look at a lab is a page title,
  a lesson strip and two toolbars, with the figure starting halfway down. On the bench, a 7-line paragraph sits above
  the figure.
- **Screens:** `shots/03-blink-l1440.png`, `shots/07-bench-l1440.png`, `shots/06-fly-l1440.png`,
  `shots/08-en-blink-d1920.png`, `shots/02-uno-board-l1440-full-tiled.png` (the whole lesson, 7,525 px).
- **Proposal:** a full-viewport workspace frame for lab pages.
  - **Layout:** a slim title row (back link, title, lesson x of y as a dropdown, progress). Under it, the figure on the
    left at about 60% of the width and `calc(100dvh - header - title row)` high. On the right, a tabbed panel at about
    40%, with a draggable splitter.
  - **Right-hand tabs:** Code+Run, Serial, Checks, Break it, Learn (overview, pins, quiz), Tools (partner, together,
    real parts).
  - **No page scroll on desktop;** only panels scroll. Long reference content ("Wire it in", 16 module cards, 4,000 px)
    becomes a Learn sub-tab.
  - **Bench:** the intro paragraph collapses to a one-line subtitle with "More".
  - **Fly:** the range takes the full left side and the HUD overlays its top edge.

### U2. German header breaks at laptop width (every page)

- **Where:** `/de/...`, 1440 × 900, light.
- **Happened:** each nav item wraps onto two lines ("Board-/Labor", "Robotik-/Labor", "Drohnen-/Labor", "Über/iynk").
  The three-button theme switch wraps into a 2 × 2 block that hangs below the header rule, over the page.
- **Screen:** `shots/08-de-blink-l1440.png`. Hindi at the same size holds (`shots/08-hi-blink-l1440.png`).
- **Proposal:** `white-space: nowrap` on nav items. Fold the theme switch into a single icon button with a menu
  (System, Light, Dark). Switch to the hamburger header below about 1280 px, or whenever the nav doesn't fit. Optionally
  shorten the German labels ("Boards", "Robotik", "Drohnen").

### U3. The sponsor and social panels (Partner · Together · Build it for real) are at the bottom of the page

- **Where:** the lab dock. Blink: tabs at y≈6,720, under the 16 "Wire it in" module cards. quad5: y≈1,197. Fly:
  y≈2,195 in the right column. 1440 × 900.
- **Happened:** a judge looking for the SerpApi feature has to know to scroll 1.5 to 7 screens. On quad5 the dock is
  squeezed into the left half under the figure: a long parts list in about 600 px, next to an empty right column
  below the cost table.
- **Screens:** `shots/05-quad5-real-l1440.png`, `shots/02-uno-board-l1440-full-tiled.png`.
- **Proposal:** make the panels a "Tools" tab of the workspace's right-hand panel (U1), or a right rail that opens
  from a header button, visible on load. Build it for real should open beside the figure, so "Use this build in the
  lab" visibly changes the craft.

### U4. The run state contradicts itself

- **Where:** `/en/boards/uno-r3/blink` and `/en/robotics/esp32-s3-build`, 1440 × 900.
- **Happened:**
  1. **Before Run on Blink:** the figure shows STATUS RUNNING, PROGRAM Blink, the LED lit at 12.2 mA, and a toast,
     "Powered: Blink starts". A green "Running" pill sits above it. Meanwhile the serial monitor says "Stopped ·
     Nothing printed yet. Press Run." So is it running?
  2. **After a short:** with "5V shorted to GND" triggered, the figure says NO POWER, 0.0 V, but the code panel still
     offers "Stop" and the serial header still says "Running".
  3. **On the bench:** step 1 is "Strip to the bare PCB: start from the bare black board", while the figure shows the
     assembled board running Blink RGB. Its toast ("3.3 V is up: ...") covers the R of RUNNING.
- **Screens:** `shots/03-blink-l1440.png`, `shots/04-break-short-figure.png`, `shots/07-bench-l1440.png`.
- **Proposal:** one run state, shared by the figure, the pill, the Run button and the serial monitor.
  - **On load:** the figure is powered and idle, with no sketch running, until Run.
  - **On power loss:** losing power stops the sim, and the serial monitor prints "Board lost power".
  - **On the bench:** the bench figure opens in step 1's state, or step 1 says "Strip the board you see".
  - **Duplicates:** drop the duplicate "Running" pill, because the figure already shows STATUS.

### U5. Duplicate controls

- **Where:** the board lessons, quad5 and the bench, 1440.
- **Happened:**
  - "See-through" twice on every board lesson: the page toolbar and the figure's own top-right button. "Labels" sits
    next to the second one.
  - On quad5: "Exploded view" twice (a page toggle and a figure button) and "Wiring sheet" twice (a page tab and a
    figure button).
  - Two status displays: the green pill and the figure's STATUS.
  - The figure's own column of 10 action pills (Power, Upload sketch, Press RESET, Strip to bare PCB, ...) sits on top
    of the board art.
- **Screens:** `shots/03-blink-l1440.png`, `shots/05-quad5-l1440.png`.
- **Proposal:** keep one of each. The figure's overlay buttons can't change (`figures/**` is out of scope), so remove
  the page-level duplicates (See-through, Exploded view toggle, Wiring sheet, the Running pill). Keep only the view
  tabs (Board / Breadboard / Schematic / Power tree) and the power source in one slim row.

### U6. The drone page opens on an empty mat, and the drone catalogue has no pictures

- **Where:** `/en/drones` and `/en/drones/quad5`, 1440, light.
- **Happened:** "5-inch freestyle quad" opens on an empty green bench mat (PARTS 0/12, BATTERY OFF). The catalogue's 13
  cards are text only (FIG. 01 ... with stats), so a judge doesn't see a single drone until they find "Build it for
  me". The landing hero shows a drone, but no drone page does.
- **Screens:** `shots/05-quad5-l1440.png`, `shots/05-drones-catalogue-l1440.png`.
- **Proposal:** open the drone page with the finished craft (the factory build), plus a clear "Start from parts"
  button. Give each catalogue card a figure thumbnail (a static render of the built craft), the same for the robotics
  benches. Catalogue cards then lead with the picture.

### U7. "Near you" and "Video help" say "Live prices aren't set up"

- **Where:** quad5 → Build it for real, 1440, en (keyless deployment).
- **Happened:** both sections under the optimiser say "Live prices aren't set up on this deployment." That is the wrong
  noun for maps and videos.
- **Screen:** `shots/05-quad5-real-l1440.png` (the text is in the walk log).
- **Proposal:** "Nearby places aren't set up on this deployment." and "Video search isn't set up on this deployment."
  Better still, one line for the whole tab: "Live search (prices, places, videos) isn't set up here; the optimiser uses
  catalogue prices."

### U8. The budget optimiser's range is only $330–$370

- **Where:** quad5 → Build it for real → Budget, 1440.
- **Happened:** the slider runs from $330 to $370 in steps of $5. BUILD-PLAN §1 step 3 ("under $150") can't be done.
  VIDEO.md already uses $340, so the presenter is fine, but a judge exploring on their own gets a $40 range that looks
  arbitrary. At $330 the swap works well: 6S 1100 → 4S 1500 mAh, 1750KV → 2450KV, T:W 12.5 → 10.9.
- **Proposal:** run the slider from the cheapest combination the calculator accepts up to about 1.5 × the current
  build, and label the floor ("cheapest build that still flies: $X"). Fix BUILD-PLAN §1 step 3's figure.

### U9. Phone: the floating "Open lab tools" pill covers content

- **Where:** every lab page at 390 × 844, en and es, light and dark.
- **Happened:** the pill sits over:
  - the figure's "Press RESET" pill on the Blink lesson;
  - a paragraph of body text on the bench;
  - the HUD's "BEST none yet" on the fly page;
  - the bottom of the touch-stick area while flying.
- **Screens:** `shots/09-p390-strip.png` (es: landing, Blink, Blink after Run, quad5, fly, bench),
  `shots/10-p390d-fly-range.png`.
- **Proposal:** add bottom padding equal to the pill height + 16 px plus the safe area on lab pages, or move "Tools"
  into the sticky header as an icon button beside the menu. On the fly page, hide the pill while armed.

### U10. Phone tools sheet: truncated tab, and it opens on a "not set up" notice

- **Where:** fly page → Open lab tools, 390 × 844, dark.
- **Happened:** the third tab reads "BUILD IT FOR REA" (cut off, with no scroll hint), and that is the SerpApi feature.
  The sheet opens on Partner, which on this deployment is only "The lab partner isn't set up on this deployment".
- **Screen:** `shots/10-p390d-tools-sheet.png`.
- **Proposal:** use short tab labels on phones ("Partner", "Together", "Real parts"), or let the tabs scroll with an
  edge fade. Open on the first tab that works (Build it for real works with catalogue prices).

### U11. Phone fly page: invisible stick labels, Arm out of reach, oversized HUD

- **Where:** `/en/drones/quad5/fly`, 390 × 844, dark (the labels are also faint in light).
- **Happened:**
  - "THROTTLE · YAW" and "PITCH · ROLL" are near-white text on the light range, so you can barely read them.
  - Arm and the flight mode sit above the range, so a phone pilot scrolls up to arm and back down to the sticks.
  - The HUD's values are about 44 px type, two per row. They take about 900 px under the range, and "4.20 V/cell"
    wraps.
- **Screen:** `shots/10-p390d-fly-range.png`.
- **Proposal:**
  - Stick labels in dark ink on a paper chip.
  - An Arm/Disarm button and the mode inside the range's top-left corner.
  - The HUD as a compact 3-column strip with values at about 18 px, directly under or over the range.

### U12. Phone lesson: Run is 2.4 screens down

- **Where:** `/es/boards/uno-r3/blink`, 390 × 844.
- **Happened:**
  - **Run:** the Run button sits at y≈1,993. The page is 12,367 px.
  - **Lesson strip:** it shows a clipped previous card and a sliver of the next one ("EN") around the current lesson.
  - **Figure toolbar:** it wraps to three rows (Placa / Protoboard / Esquema, then Árbol de alimentación, then Vista
    despiezada / Transparente).
- **Screen:** `shots/09-p390-strip.png` (2nd and 3rd frames).
- **Proposal:** on a phone, put the figure first, then a sticky bottom bar with Run/Stop, the check status ("3/3") and
  Tools. Collapse the code to its first lines with "Edit code". Show the lesson strip as a "Lesson 2 of 16 ▾" picker.

### U13. Break it on a board lesson is a generic board list, and the figure's menu speaks in designators

- **Where:** `/en/boards/uno-r3/blink`, 1440.
- **Happened:**
  - **The page list:** the same 14 faults appear on "Meet the Uno" and on "Blink an LED", all about the board's power
    and parts. Only one ("LED with no resistor") is about the LED this lesson wires. BUILD-PLAN §1 step 1 says "Reverse
    the LED → it doesn't light", but there is no reversed-LED fault anywhere.
  - **The figure's menu:** its own Break it menu offers "ZU4 in backwards", "PC1 in backwards" and "Cold joint on SK1 /
    Y2 / RN1", designators a newcomer can't read (figure strings, out of scope here).
  - **Smoke:** "5V shorted to GND" gives "NO POWER / the supply trips". That's realistic, but it isn't the "magic smoke"
    BUILD-PLAN promises.
- **Proposal:** lead each lesson's Break it with the faults about what that lesson wires ("LED in backwards", "No
  resistor", "Wrong pin"), then "More faults on this board". Update BUILD-PLAN §1 step 1 to match what exists. Report
  the designator names to the figure owner (driver).

### U14. Dark mode: the figure is a bright rectangle with no frame

- **Where:** `/en` hero and every lab page, dark, 1440 and 1920.
- **Happened:** the figure stays on light paper and loses its ink border, so it is the brightest thing on the page.
  On the landing it's a borderless beige block next to dark text.
- **Screens:** `shots/01-landing-d1440.png`, `shots/08-en-blink-d1920.png`.
- **Proposal:** keep the 2 px ink frame in dark (light ink on dark), and give the figure plate a slightly dimmed
  paper. Change the page frame only, not the figure.

### U15. Landing: a first-time judge is greeted by zeros

- **Where:** `/en`, 1440 and 390, light.
- **Happened:**
  - **The cards:** each lab card ends in an empty progress bar (0/83, 0/369, 0/161).
  - **The dashed box:** "Continue where you left off" sits next to a large dashed box that holds only "OVERALL
    PROGRESS 0/613" and empty space.
  - **The phone:** the "0/161" in the drone card touches the card's right border (right edge 374 = card edge 374, no
    padding).
- **Screens:** `shots/01-landing-l1440-full.png`, `shots/01-landing-p390-dronecard.png`.
- **Proposal:**
  - While progress is 0, show counts ("83 lessons and assemblies") instead of empty bars.
  - Replace the dashed box with three 10-second deep links ("Blink an LED", "Fly the quad", "Build an ESP32"), each
    with a small figure crop.
  - Fix the card's right padding on phones.

### U16. Fly page: clicking a Break it row's title doesn't toggle it

- **Where:** `/en/drones/quad5/fly`, Break it, 1440.
- **Happened:** clicking "Mount the flight controller backwards" (the bold title) did nothing, and every switch stayed
  off. Only the small switch on the right works.
- **Screen:** `shots/06-fly-break-toggled.png`.
- **Proposal:** make the whole row the switch's label (a `<label>` around the title and description, or a click
  handler on the row).

### U17. Inconsistent controls and frame widths

- **Where:** fly, Together, landing, 1440.
- **Happened:**
  - **Selects:** Flight mode (fly) and "What to build" (Together) are native system selects, while the power and part
    pickers elsewhere are ink-styled.
  - **Checkboxes:** the Ghosts checkboxes are native blue checkboxes.
  - **Text buttons:** "Gamepad" and "Controls" are plain text buttons in a row of pill buttons.
  - **Widths:** Together's content is 976 px wide, while every other page uses 1,232 px.
- **Screens:** `shots/06-fly-l1440.png`, `shots/11-together-l1440.png`.
- **Proposal:** one Select, one Checkbox and one secondary-button style, and one reading width for Together, About and
  the catalogues.

---

## Nits

1. **Blink passes untouched.** It passes on the first Run without any edit ("All checks pass. Lesson done."). The
   demo says "edit, Run". A starter with one deliberate gap would make the first lesson a real task.
   `shots/03-blink-run-c.png`.
2. **The code column wraps comments at 1440.** On "Meet the Uno", `// pin 13 drives the L LED` breaks onto two lines,
   because the code column is only about 500 px. U1 fixes it. `shots/02-uno-board-l1440.png`.
3. **The serial header reflows on Run.** The baud selector drops to a second line and a "×" appears.
   `shots/03-blink-run-a.png`.
4. **"PROGRAM your sketch" overlaps the breadboard after Run.** That's figure art, but a wider figure (U1) would give
   it room. `shots/03-blink-run-a.png`.
5. **"MEDAL TIMES 10 / 14 / 20 s" wraps,** leaving "20 s" alone on the next line. `shots/06-fly-break-toggled.png`.
6. **The view toolbar moves between lessons.** On Blink the turn buttons drop to a second row, because
   Breadboard/Schematic are added. `shots/02-uno-board-l1440.png` vs `shots/03-blink-l1440.png`.
7. **"Press RESET" stays English** inside the figure in de, es and hi (figure dictionary). `shots/08-de-blink-l1440.png`.
8. **The chase camera loses the craft.** With the quad climbing past the bando, the view filled with a close-up of
   the building and the craft was out of sight. `shots/06-fly-break-crash-b.png`.
9. **The tagline appears three times.** "EXPLORE · UNDERSTAND · BUILD" is under the logo, again as the hero kicker
   40 px below it, and again in the footer. Keep one.
10. **The drone catalogue's intro says the same thing twice** ("Hand-inked drones you design, build and then fly." /
    "Design it, wire it, build it, smoke-test it, then fly it").
11. **The Blink LED is about 12 px across** on a 660 px figure. The lesson's subject is the smallest thing on screen.
    U1's bigger figure helps; so would opening Blink zoomed in on the breadboard.

---

## What already works (keep it)

- **Health:** no errors anywhere I went. 0 console errors, 0 failed requests, and no sideways scroll on a phone in en
  and es. Pages load in under 1 s.
- **The landing:** the type (the serif display face with the mono kickers), the three palette-headed lab cards, a hero
  CTA that goes straight into lesson 1, and the "In every lab" row. These read as a confident, crafted product.
- **The Blink loop:**
  - Run moves through Compiling → Uploading → Running. The LED glows, and the checks explain themselves (a fixed
    script on a virtual clock).
  - "Done" appears beside the title and the lesson strip gets its tick.
  - It works by tap on a phone in Spanish ("Todas las comprobaciones superadas. Lección hecha.").
- **Break it's explanation card** (What you see / Why / Fix, with the arithmetic) is the best teaching on the site.
  Keep the copy and the layout of the card.
- **Build it for real without keys:**
  - It says honestly that it uses catalogue prices.
  - The optimiser lists its swaps and offers "Use this build in the lab".
  - It adds "For $16.00 more: thrust-to-weight 12.5 and 5.2 min of flight" and "The calculator checked 27
    combinations". Good, honest detail.
- **The fly page:** a clear Arming rules list, the daily challenge card, medal times, ghosts and the Controls help.
  Touch sticks appear on a phone. Flying in angle mode works (climb, pitch forward, gate counter advances).
- **The bench:** "Do it" updates the figure, the step counter and the next-up card at once.
- **Translations:** the German and Hindi Blink lessons are fully translated in the page UI. Hindi renders cleanly at
  1440.
- **Together without a relay:** Start a room → name and colour → Join works, with an honest "this browser only"
  note. The `/en/together` hero line, "Nobody has to build alone", is good.
- **"Not set up on this deployment" notices** never break a page.
