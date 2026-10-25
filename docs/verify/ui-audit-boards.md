# UI audit: Board Lab (F-audit-boards, 2026-10-25 02:30 CDT)

Walked on the driver's production server `http://127.0.0.1:3430` with Playwright (Chromium). Pages: `/en/boards`, all
12 board overviews, five lessons (`uno-r3/blink`, `nucleo-f401re/pwm-dimmer`, `basys3/counter`,
`microbit-v2/buttons`, `pi4-pi5/blink`) at 1440 × 900, 1920 × 1080 and 390 × 844, light and dark, English plus
German (`/de/boards`, `/de/boards/uno-r3`, `/de/boards/uno-r3/blink`) and Hindi (`/hi/boards`,
`/hi/boards/pi4-pi5`, `/hi/boards/microbit-v2/buttons`). 44 page loads, plus click-through runs on five lessons and
the Uno board page.

Screenshots are in
`/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/5990e040-4ffc-48cb-ba35-923d41b56efe/scratchpad/F-audit-boards/shots/`
(named `<lang>_boards_<board>_<lesson>-<d|w|p>-<light|dark>.png`, with `-full.png` for the whole page; `int-*` and
`int2-*`, `int3-*` are after clicks). The scripts that took them, `metrics.json` with every measurement below, and
`crops/` (cut-outs of the full-page shots) are in the folder above `shots/`.

## The numbers

| Page | Viewport | Figure on the first screen | Page height | Where things are |
|---|---|---|---|---|
| Lesson (`uno-r3/blink`) | 1440 × 900 | 661 × 496 frame at y 470, **22 %** of the screen | 7,756 px (8.6 screens) | serial at y 789 (111 px show), Checks at y 1123 (hidden), Break it at y **1836** |
| Lesson | 1920 × 1080 | same 661 × 496 frame, **16 %** | 7,756 px | content capped at 1,232 px wide: **344 px of empty gutter each side (36 % of the width)** |
| Lesson | 390 × 844 | frame 358 × 394 at y 638; the board drawing inside is about 170 × 110 px | 11,354 px (13.5 screens) | Code at y 1686, Run at y 1744, Break it at y 3223, Wire it in 5,671 px tall |
| Board overview (12) | 1440 × 900 | 685 × 514 frame at y 442 to 539, **19 to 24 %** | 6,876 to **10,692** px (7.6 to 11.9 screens) | lesson list at y 1642 to 1919, Assembly at y 1891 to 2297, Wire it in up to 4,363 px tall |
| Board overview | 1920 × 1080 | **17 %** | same | same 1,232 px column |
| Board overview | 390 × 844 | frame at y 568, 30 % | 16,178 px (Uno) | lessons at y 3040 |
| Index `/en/boards` | 1440 / 1920 | no figure at all | 2,503 px | 3 columns at both widths; at 1920 the grid is 1,104 px wide in a 1,920 px screen |

Type in use on one lesson page (computed `font-size` of visible text): 9.92, 11.2, 12, 13, 14, 15.2, 16, 18, 20 and
36 px: **ten sizes**. Families: IBM Plex Mono on 356 text nodes, Source Sans 3 on 232, Newsreader on 11. Every small
button is 12 px bold mono uppercase-ish, so most of the chrome reads as code.

Buttons on one lesson page, grouped by computed height, radius, border, fill and type: **eleven visual variants**
(ghost 36 px text: Sound, Keyboard shortcuts, the three turn glyphs, Expand code; segmented 36 px; outlined pill with
ink shadow 36 px: Exploded view, See-through, Reset code, Check again, Inspect …; outlined 44 px: the 68 "Figure
controls"; mustard 44 px 14 px: Run; red 36 px: Trigger ×14; tabs 44 px with 8 px top radius; ghost 44 px: Clear
output; Send 44 px 14 px; round 44 px arrow 16 px: More lessons; the 12 px resize handle). The figure inside the
iframe adds a twelfth style (thin-border mono chips with no shadow) next to the host's.

Measured and fine: **0** console or page errors on 44 loads and every click run; **0** sideways scroll at any size
or language (the phone pinout table scrolls inside its own panel on purpose); **0** WCAG AA contrast failures on the
index, the Uno page and the Blink lesson, light and dark; every focusable element shows a 2 px solid focus ring.

## What works and must be kept

- **The lab really works.** Run compiles, uploads and runs in about 5 s on all five lessons (Arduino C++ on the Uno
  and the Nucleo, MicroPython on the micro:bit, Python on the Pi, Verilog on the Basys 3). The serial monitor prints
  (`raw=1024 duty=63` on the Nucleo), Checks tick green with "All checks pass. Lesson done.", the Done pill and the
  strip tick appear. A syntax error (`int x = ;`) highlights line 14 in red and says "Line 14: unexpected ';'".
- **Break it is real**: Trigger changes the board status to "No power" or "Fault", the figure reports what burned
  ("LTC3633 dual buck regulator … burned"), and the opened row explains What you see / Why / Fix in plain words.
  Repair works. This is the most memorable thing on the page.
- **Keyboard**: X, C, B, Space, Q/E/R all work; the "?" dialog lists them in a calm two-column table with key caps
  and tells you shortcuts pause while you type (`int-en_boards_uno-r3_blink-keys.png`). Keep it as is.
- **Assembly teaches the order**: "Do it" on step 10 before step 3 doesn't advance and says why ("Not yet. Low parts
  first: with tall parts in, the board rocks…"); done steps turn green with a tick, "Start over" resets.
- **Inspect LED** (Wire it in) opens a clean dialog with the part's own figure (five LEDs on a breadboard, Colour
  menu, See-through, Labels) (`int3-inspect-led.png`).
- **Quiz** gives a reason with every answer ("One full cycle is 500 ms on plus 500 ms off: one second").
- **Copy**: board taglines, power limits, pin notes and fault explanations are specific and human. Keep every word.
- **Dark mode** is coherent: the figure stays a paper plate, the ink cards invert cleanly, the cobalt language chip
  keeps its meaning.
- The lesson strip's done tick, the "Lesson 2 of 16" kicker, the progress bar on index cards and the parameter
  chips in the code (click `500` to get a slider) are good ideas; keep them.
- Labels the pitch clicks (`docs/hacktx/PITCH.md` 0:00, 0:15, the table demo): Uno figure drag and E, **See-through**,
  **Exploded view**, **Run**, serial **Running**, Checks **All checks pass. Lesson done.**, **Break it**,
  **LED with no resistor**, **5 V capacitor fitted backwards**, **Trigger**, **Repair**. Keep all of them visible.

## Findings, worst first

### B1. Break it fires two screens away from the figure (blocker for the pitch's 0:15 beat)

Where: every lesson and board page, all sizes. `/en/boards/uno-r3/blink` 1440 × 900: the figure ends at y 966,
Break it starts at y 1836; "LED with no resistor" (the pitch's fault) is the last of 14 rows, at y 2854: 1,900 px
below the bottom of the figure. On the
board page Break it starts at y 2315 to 4156. On the phone at y 3223.
Why it matters: the panel's own lede says "Trigger one, watch the figure", and the pitch says "One bright flash, then
dark. The readout under the figure…". When you press Trigger the figure is off screen, so the judge sees a red row
change colour and nothing else. The best moment in Board Lab is invisible.
Screenshots: `int-en_boards_uno-r3_blink-fault.png`, `int-en_boards_uno-r3_blink-fault-panel.png`.
Proposal: Break it lives **beside the figure**, not below the lesson. In the lesson workspace (see U1) it is a tab of
the right-hand pane ("Serial · Checks · Break it"), so Trigger and the figure share one screen. On the board page it
goes in the column next to the figure. Rows become compact one-liners (kind chip, title, a small outlined
"Trigger" button), the opened row keeps What you see / Why / Fix. On the phone, Trigger scrolls the figure into view
(`figure.scrollIntoView({block:"start"})`) before sending the fault.
The same happens to **Assembly** on the board page: pressing "Do it" on step 1 (y 2297 at 1440) animates a figure
that is then 2,247 px above the top of the screen (measured: iframe `y = -2247`). Assembly belongs in the pane beside
the figure too (U2), or "Do it" scrolls the figure into view first.

### B2. The phone figure is a thumbnail under a pile of chrome (blocker on a phone)

Where: `/en/boards/uno-r3/blink` 390 × 844 (and every board page and lesson on the phone).
What: before the figure come the back link, kicker, h1, Sound and Keyboard shortcuts buttons, the "Lessons 0/16"
heading, the lesson strip, a two-row view bar, three bare turn glyphs, the power select and the Running pill: the
frame starts at y 612 to 800. Inside the 358 × 394 frame the figure's own 10 control chips fill the top 130 px, and the
board itself is drawn at roughly 170 × 110 px. The floating "Open lab tools" button sits on top of the frame's
bottom edge, covering the figure's See-through / Labels chips and, on the board page, the STATUS readout.
Screenshots: `en_boards_uno-r3_blink-p-light.png`, `int2-phone-figure.png`, `en_boards_uno-r3-p-dark.png`,
`hi_boards_pi4-pi5-p-light.png` (frame at y 800, 5 % of the first screen).
Proposal: on `< sm`, order the lesson as h1 (24 px, one line with a "2 / 16 ▾" lesson picker), then the figure at
`height: calc(100svh - 64px header - 56px bar)` with the view bar as one horizontally scrolling row overlaid on the
frame's top edge, then Code. Hide "Keyboard shortcuts" on coarse pointers (no keyboard). Move Sound into the dock.
The panels owner should move "Open lab tools" into a bottom bar that never overlaps the frame (request to
F-build-panels, see Notes).

### U1. A lesson is a long document, not a workspace (ugly, the main one)

Where: every lesson at 1440 and 1920. `uno-r3/blink` 1440 × 900: header block (back link, kicker, h1, "Lessons 0/16",
strip) uses y 66 to 340; the figure gets 661 × 430 visible px (22 % of the screen); serial shows 111 px; Checks is
below the fold; at 1920 the page is the same 1,232 px column with 344 px empty on each side and the figure drops to
16 %. The left column ends with Parameters at y 1568 while the right ends at y 1377: uneven columns.
Screenshots: `en_boards_uno-r3_blink-d-light.png`, `en_boards_uno-r3_blink-w-dark.png`,
`en_boards_basys3_counter-d-light.png`.
Proposal (the frame F-direction should spec; sizes for 1440 × 900):
1. Drop `max-w-7xl` for lesson pages; use the full width with a 24 px gutter (16 px under `lg`).
2. One 56 px top bar replaces the header block: `‹ Arduino Uno R3` · kicker `Lesson 2 of 16` · h1 at 28 px ·
   Done pill · lesson picker (`2 / 16 ▾` popover with the strip's cards) with ‹ › for prev/next · Sound · `?`.
   The full-width lesson strip goes into that popover (it is also the `[` `]` and `1…0` shortcuts' target).
3. Below it a workspace of height `calc(100dvh - 65px - 56px - 24px)` (about 755 px): figure pane on the left,
   flexible; a right pane `clamp(420px, 34vw, 600px)` wide.
4. Figure pane: the view bar (Board / Breadboard / Schematic / Power tree, Exploded view, See-through, turn, power
   select, status pill) as one 44 px toolbar row on top; the frame fills the rest (about 880 × 690 at 1440, about
   1,290 × 930 at 1920: **2 to 3 times today's area**). The LED readout chips sit in a single 32 px row under it.
5. Right pane: Code (toolbar: Run primary, then Reset code, Copy code, Expand code as icon buttons with tooltips),
   editor `flex: 1`; under it a 280 px tabbed area: **Serial · Checks (3/3) · Parameters · Break it**. Run switches to
   Serial; a finished check run puts a badge on Checks.
6. Under the workspace (page scroll): the lesson info tabs at a reading width (`max-w-[72ch]`) and Wire it in
   (U5) beside it at ≥ xl.
At 1920 × 1080 nothing important is below the fold, and the figure takes over half the screen.

### U2. The board overview is 7 to 12 screens long and its lessons start two screens down (ugly)

Where: all 12 board pages. Uno: 10,692 px at 1440; lessons at y 1772, Assembly at y 2297 (26 steps, 1,984 px),
Pinout at y 4301, Wire it in 4,363 px tall, the lab dock at y 9688. Under the 685 px figure column there is about
500 px of blank paper while Key facts / Power and limits run on (`crops/uno-0.png`).
Why it matters: a judge who lands on `/en/boards/uno-r3` (the pitch's first tab) sees a figure cut at the bottom of
the screen, a fact table and no way to start a lesson without scrolling twice.
Screenshots: `en_boards_uno-r3-d-light.png`, `en_boards_uno-r3-d-light-full.png`, `en_boards_basys3-w-light.png`.
Proposal:
1. Hero = workspace frame like U1: figure pane left (about 62 %, full height of the viewport minus the top bar).
   Right pane: kicker, h1 (40 px), tagline, progress, one primary button **Start: Meet the Uno** (or
   **Continue: lesson n** once begun), then tabs **Key facts · Assembly · Break it · On-board controls**, so every
   control that moves the figure sits next to it (B1). Key facts as a compact two-column `dl` with no filled boxes.
2. Lessons directly under the hero as a dense 4-column list at ≥ 1440 (number, title, level; no card per row).
3. Then a sticky in-page tab bar for the reference material: **Pinout · Wire it in · Power and limits · Sources**,
   one panel at a time. Page height drops to about 2 to 3 screens; nothing is removed.

Also on the board page: on the four boards with variants (UNO R4, Pico, ESP32-S3, Pi) the variant switch is a
1,232 px wide pill holding two to four short labels, an empty bar that pushes the figure down another 68 px
(`crops/boards-grid.png`). Put it in the figure toolbar as a compact segmented control or a select.

### U3. Two copies of the same controls on screen (ugly)

Where: every board page and lesson, desktop and phone.
- **See-through** twice: the host view bar and the figure's own chip (top right of the frame).
- **Break it** twice: the figure's "Break it ▾" chip menu and the host's Break it panel, in two different styles.
- **Status** twice: the host "Running" pill and the figure's big "STATUS RUNNING" readout 80 px away.
- **Press RESET** button plus the plain word "RESET" beside it in On-board controls.
- **Lesson position** twice in 90 px: kicker "Lesson 2 of 16" and heading "Lessons 0/16" (position vs done; the two
  numbers read as a contradiction).
Screenshots: `en_boards_uno-r3_blink-d-light.png`, `int2-key-c-schematic.png`.
Proposal: keep the host's See-through (keyboard T, the pitch clicks it) and the host's Break it panel; the figure's
duplicates are figure-owned, so the host frame can't hide them, but F-direction should list them for the figure owner.
Drop the host status pill when the figure shows its readout (the figure's is bigger and always in view), or keep the
pill and make it the single status by moving it into the Run toolbar ("Board running · your code not uploaded").
Rename the strip heading to "Done 0/16" or fold it into the lesson picker (U1.2).

### U4. Lesson strip: cards cut by their own arrows, uppercase titles, scrolls when it needn't (ugly)

Where: every lesson. 1440: the 5th card "5. MIX COLOURS" is cut by the 44 px "More lessons" arrow; after scrolling
the "earlier" arrow covers the first visible card ("PRO 9. B…"). micro:bit has only 5 lessons yet the strip still
scrolls at 1920 and cuts "5. TOUCH LOGO TUNE COUN…". Basys 3's "5. FOUR HEX DIGITS ON THE DISPLAY" wraps to two lines and
makes that card 17 px taller than the rest. Titles are set uppercase at 14 px: slower to read than the Title Case
used everywhere else.
Screenshots: `int2-strip-scrolled.png`, `en_boards_microbit-v2_buttons-w-dark.png`,
`en_boards_basys3_counter-d-light.png`.
Proposal: in the U1 top bar, a lesson picker popover replaces the strip. If the strip stays: cards `flex: 1 1 0` with
`min-width: 11rem` so ≤ 6 lessons fit without scrolling; arrows outside the scroller (in a 44 px gutter) with an
edge fade instead of covering cards; titles in sentence case, `line-clamp-2`, equal heights.

### U5. Wire it in on a lesson lists every part the board can drive (ugly)

Where: `uno-r3/blink`: Wire it in is 4,814 px tall at 1440 (16 parts with full pin tables and Careful callouts) and
5,671 px on the phone, on a lesson that uses one LED and one resistor.
Proposal: on a lesson, show only the parts in `lesson.circuit` (one or two), with a link "All 16 parts on the
Arduino Uno R3 page". On the board page, each part is a one-line row (name, supply, Inspect) that expands to its pin
table; the Careful callout stays inside the expanded row.

### U6. Boxes inside boxes, three deep (ugly)

Where: board pages and lessons. Wire it in: ink card → bordered part card → bordered table rows → Careful callout
with its own heavy border and coloured block. Lessons list: ink card → 16 bordered link cards. Assembly: ink card →
26 bordered step cards. Break it: ink card → 14 bordered rows → 14 red pill buttons. Key facts: ink card → 8 filled
stat cells.
Why: SPEC's "fewer borders and boxes". With every element framed, nothing leads, and the 14 red Trigger buttons read
as 14 warnings.
Proposal: one ink card per pane; inside it, rows separated by a 1 px `--color-rule` line, no inner borders; Trigger
becomes an outlined small button (red text and border only), filled red only for the active fault; Key facts as a
`dl` grid without fills.

### U7. Board index: twelve cards with "FIG. n" and no figure (ugly)

Where: `/en/boards` at every size. Each card is labelled FIG. 1 to FIG. 12 but shows no picture; at 1920 the 3-column
grid is 1,104 px wide in a 1,920 px window; a phone scrolls 6,126 px of text cards.
Screenshots: `en_boards-d-light.png`, `en_boards-w-light-full.png`, `en_boards-p-dark.png`.
Proposal: give every card its board as a 4:3 poster on top (no static posters exist in `public/` today: the figure
owner or driver would render them with `cfshoot.py` into e.g. `public/posters/boards/<id>.webp`; the index must not
load 12 live iframes). Grid `repeat(auto-fill, minmax(320px, 1fr))` so 1920 gets 4 to 5 columns; the spec cells
become one mono line ("ATmega328P · 16 MHz · 5 V · 32 KB"); keep the language chip, drop the other chips to two.
Without posters, at least drop the "FIG. n" kicker so the cards don't promise a picture.

### U8. Index card data glitches (nit)

- Basys 3 and DE10-Lite list **Verilog twice** (the cobalt language chip and a plain "Verilog" chip).
- Pi 4 / Pi 5: "Clock **2,400 MHz**" (write 2.4 GHz) and its fourth cell is "Code in: Python" where every other card
  has Flash.
- NodeMCU: the chip cell wraps to three mono lines ("ESP8266EX (Ai-Thinker ESP-12E module)"); the maker line
  "NodeMCU (open hardware) · ESP8266 by Espressif" is twice as long as the others.
- "○ Assembly" under every progress bar: a hollow circle and a word, no verb. Say "Assembly not done" / "✓ Assembled".
Screenshot: `en_boards-w-light-full.png`.

### U9. German header breaks on board pages (ugly, shell-owned)

Where: `/de/boards/uno-r3` 1440 × 900. Nav items wrap and hyphenate ("Board-/Labor", "Robotik-/Labor"), and the theme
switcher breaks into a two-row box that hangs below the header.
Screenshot: `de_boards_uno-r3-d-light.png`. Owner: F-build-shell (header). Listed here because every German board
page shows it.

### U10. German view bar wraps inside its segmented control (ugly)

Where: `/de/boards/uno-r3/blink` 390 × 844: "Board · Steckbrett · Schaltplan" on one row and "Versorgungsbaum" alone
on a second row inside the same pill. Segmented controls must not wrap.
Screenshot: `de_boards_uno-r3_blink-p-dark.png`.
Proposal: on the phone the segmented control scrolls horizontally (`overflow-x: auto`, no wrap) or turns into a
select when it can't fit; same for the Hindi Pi variant switch, which stacks "Raspberry Pi 5 / Raspberry Pi 4
Model B" as two full-width rows (`hi_boards_pi4-pi5-p-light.png`).

### U11. Touch targets under 44 px on the phone (ugly)

Measured at 390 × 844 on `uno-r3/blink`: every `size="sm"` button is 36 px tall (Sound, Keyboard shortcuts, Board,
Breadboard, Schematic, Power tree, Exploded view, See-through, the parameter chips 220 Ω / 1 kΩ / 10 kΩ, Red …
White, Expand / Copy / Reset code, Check again, Trigger, Do it ×26 on the board page); the turn glyphs are 35 × 36;
the serial monitor's resize handle is 354 × **12**; the "Figure controls (68)" summary is 20 px tall.
Proposal: the shell's `Button size="sm"` gets `min-h-11` under `@media (pointer: coarse)` (shell-owned); the resize
handle gets a 44 px hit area around its 4 px grip; the summary gets `min-h-11`.

### U12. The three turn controls are bare glyphs (ugly)

Where: the view bar everywhere: ↺ ⌖ ↻ at 12 px with no border, 35 px wide, between the pills and the power select.
They read as stray characters. Proposal: real icon buttons (24 px icons, 44 px hit area) grouped in one segmented
pill "⟲ · reset · ⟳", with the existing titles as tooltips.

### U13. Code pane too narrow for real code (ugly)

Where: lessons at 1440: the code panel is 551 px wide; Verilog on `basys3/counter` wraps lines 1, 10 and 13; the
micro:bit's `# True once after each press` wraps; on the phone `// how long it stays on` wraps. Wrapped code with
line numbers is hard to read.
Proposal: the U1 right pane gives the editor 520 to 600 px at 1440 and up to 600 px at 1920 (or let the user drag the
split). Keep soft wrap only under `sm`.

### U14. The code toolbar jumps when you edit (nit)

Where: `uno-r3/blink` 1440 after typing: the "EDITED" tag appears, "Reset code" turns from a disabled grey pill into
an outlined button, and the row reflows: Run moves about 100 px right, next to Reset.
Screenshot: `int2-syntax-error.png` vs `en_boards_uno-r3_blink-d-light.png`.
Proposal: fixed toolbar order `Run · Reset · Copy · Expand`, Reset always in place (disabled until edited), the
EDITED tag after the title so nothing moves.

### U15. Lesson status before Run reads "Running" (nit)

Where: every lesson before Run: the pill says "Running" and the figure "STATUS RUNNING · PROGRAM Blink", while the
serial monitor says "Stopped" and "Nothing printed yet. Press Run." Correct (the board runs its factory sketch), but
a first-time user reads it as their code already running. After a failed compile the figure still says
"RUNNING your sketch".
Proposal: label the factory state "Factory Blink running" in the pill and the serial header says "Your code: not
uploaded yet".

### U16. Checks button says "Check again" before any check (nit)

`ChecksPanel` always renders `checks.again`; on a fresh lesson it sits next to "Not checked yet". The lede "Run your
code to check it" stays after everything passed.
Proposal: "Run checks" until the first result, then "Check again"; hide the lede once results exist (string
`checks.run` in six languages).

### U17. Quiz uses the browser's blue radio buttons (nit)

Where: lesson info → Quick quiz: native radios in browser blue (`#0075ff`-like), the only blue-accent control on
the page; options are 52 px apart but only the 13 px radio and the label text are clickable.
Screenshot: `int-en_boards_uno-r3_blink-quiz.png`.
Proposal: each option a full-width 44 px row (`label` wrapping the radio) with `accent-color: var(--color-ink)`;
right / wrong shown with the good / bad fills the Checks panel already uses.

### U18. Lesson info tabs are cut on the phone (nit)

Where: `uno-r3/blink` 390 × 844: the tab row "OVERVIEW · PINS · HOW THE CODE WOR…" scrolls sideways with the third
tab cut and no hint that three more (Specifications, Hints, Quick quiz) exist (`crops/blink-phone-strip.png`).
Proposal: on `< sm` the tabs become a select ("Section: Overview ▾") or wrap into two rows of pills; the quiz, the
one interactive tab, gets its own heading below the info instead of hiding in the sixth tab.

### U19. Ten type sizes and mono everywhere (nit, for F-direction)

Ten font sizes on one lesson (9.92 to 36 px), and 12 px bold mono on every button, tab, kicker, chip and the figure
chips. Proposal for the spec: four UI sizes (12 kicker, 14 UI and body-small, 16 body, 24/28 titles) plus the
display size; mono only for code, pins, values and the kicker; buttons in Source Sans 3 600 at 14 px.

## Notes for other owners

- F-build-panels: the floating "Open lab tools" button covers the bottom of the figure frame on every board page and
  lesson on the phone (B2); `FigureFrame` (`src/components/figure/FigureFrame.tsx`) is theirs too: lesson and board
  workspaces need it to accept a full-height class (`frameClassName` exists; `aspect-[4/3] max-h-[80vh]` must be
  overridable to `h-full`).
- F-build-shell: German header wrap (U9); `Button size="sm"` 44 px on coarse pointers (U11).
- Figure owner (out of scope for the final pass): duplicate See-through and Break it chips inside the figure (U3);
  the figure's PROGRAM readout ("your sketch", "Beating heart") overlaps the breadboard drawing on the Uno and micro:bit
  lessons; the schematic view draws a 280 × 150 px schematic in the corner of a 660 px plate; "Press RESET", "Run a
  program", "Press POWER" stay English in de and hi.
