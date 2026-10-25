# Design research for the final pass

F-research, 2026-10-25 02:30–03:10 CDT. Knowledge only: nothing here is code, and nothing below may be copied from
a site. Read with `docs/SPEC.md` (the look is fixed: hand-inked, paper, the five palettes plus monochrome) and the
five audits in `docs/verify/`. F-direction turns this into `docs/design/POLISH-SPEC.md`.

## How iynk measures today

Playwright on the driver's production server (`http://127.0.0.1:3430`), script and PNGs in
`<scratchpad>/F-research/` (`shoot.mjs`, `metrics.json`, `shots/<page>-<size>-<theme>-<lang>.png`). Five pages:
`/en`, `/en/boards/uno-r3/blink`, `/en/robotics/tb6612fng`, `/en/drones/quad5`, `/en/drones/quad5/fly`. Light and
dark, English and German, 1440×900, 1920×1080, 390×844. No console errors, no sideways scroll on any of the 25 loads.

| Page | Viewport | Figure share of viewport | Figure top edge | Page height | Controls under 44 px |
|---|---|---|---|---|---|
| lesson (blink) | 1440×900 | 25 % (661×496) | 470 px | 7 756 px | 59 of 143 |
| lesson | 1920×1080 | 16 % | 470 px | 7 756 px | 59 of 143 |
| lesson | 390×844 | 43 % | ~660 px | 11 658 px (de 12 275) | 7 of 140 |
| bench (TB6612FNG) | 1440×900 | 29 % (710×533) | 620 px | 7 279 px | 50 of 98 |
| bench | 390×844 | 43 % | below the fold | 14 597 px (de 15 932) | 2 of 94 |
| drone (quad5) | 1440×900 | 23 % (633×475) | 375 px | 2 563 px | 9 of 139 |
| fly (quad5) | 1440×900 | 32 % (743×558) | 383 px | 2 997 px | 10 of 26 |
| fly | 1920×1080 | 20 % | 383 px | 2 997 px | 10 of 26 |
| landing | 1440×900 | hero art 42 % | 115 px | 1 898 px | 4 of 4 (nav) |

Why: every workspace sits in a `max-w-7xl` (1280 px) reading container with a 52 px display `h1`, a back link, a
kicker, a progress row and (on a lesson) a 110 px strip of lesson cards above the figure; the figure iframe is sized
by aspect ratio (`aspect-[4/3] max-h-[80vh] w-full` in `FigureFrame.tsx`), so its height follows the column width
instead of the viewport. At 1920 the page has 320 px of empty paper on each side and the figure shrinks to a sixth of
the screen. Everything after the first two panels (checks, quiz, Break it, faults, tasks, stats) is a vertical stack
below the fold. Dark mode, the focus ring, the paper plate staying light in dark mode, the `Next up` step card, the
serial monitor's empty line and the landing hero are already right (see "Keep" at the end).

## Principles, most valuable first

Each one: the source, what it looks like in practice in 2025–26 products, and exactly where it applies in iynk.

### 1. The product fills the viewport; chrome is the exception

**Source.** Figma's UI3 write-up (figma.com/blog/behind-our-redesign-ui3): "We aimed to focus the canvas less on our
UI and more on your work", with panels that are resizable and collapsible and a UI that can be hidden completely.
VS Code's docs (code.visualstudio.com/docs/configure/custom-layout): the default layout "maximizes the space provided
for the editor"; Zen Mode "Hide all UI except for the editor area"; a panel or editor group can be maximized to fill
the whole editor area. Onshape (cad.onshape.com/help/.../user_interface_basics.htm): toolbars at the top that change
with the workflow, a feature list on the left, the graphics area everywhere else.

**In practice.** A workspace page is a fixed frame: header, then a grid that is exactly the rest of the viewport
(`100dvh` minus the header), with the canvas as the largest cell and the panels as columns beside it. Nothing the user
needs for the current step is below the fold; the page itself does not scroll, the panels do.

**iynk.** `LessonWorkspace`, `BenchWorkspace`, `DroneWorkspace`, `FlyWorkspace`: drop the `max-w-7xl` container
and the page-level vertical stack; make the frame a `lg:` grid of `minmax(0,1fr)` for the figure and 400–460 px for
the panel column, height `calc(100dvh - 66px)` (the sticky `SiteHeader` measures 66 px at every size). Pass
`frameClassName` to `FigureFrame` so the iframe takes the
cell's height (`h-full`) rather than `aspect-[4/3]`. Target: figure ≥ 50 % of a 1440×900 screen and ≥ 55 % of
1920×1080 (today 23–32 % and 14–20 %), its top edge under 130 px (today 375–620 px).

### 2. A workspace gets a title row, not a hero

**Source.** VS Code's status bar and title bar are single lines (code.visualstudio.com/api/ux-guidelines/overview);
Figma UI3 moved its toolbar to "a slim toolbar at the bottom of the canvas"; Onshape's toolbars compact as the screen
shrinks. NN/g heuristic 8 (nngroup.com/articles/ten-usability-heuristics): "Interfaces should not contain information
that is irrelevant or rarely needed."

**In practice.** One 48–56 px row: back link as an icon, kicker and title on one baseline at 20–24 px, progress as a
short meter with `n/N`, then the page's actions (Sound, shortcuts, the primary action). Long introductions move into
the first step or a collapsible "About" in the panel.

**iynk.** The lesson header (`LessonWorkspace` lines 280–314: back link, `LESSON 2 OF 16`, 36 px `h1`, `Lessons
0/16`, the card strip) spends 470 px before the figure. The bench header (`BenchWorkspace`) spends 620 px: a 52 px
title, subtitle, tagline and a nine-line paragraph. The drone page spends 375 px. Keep the 52 px Newsreader title for
`/en`, `/en/about` and the three catalogues only. The bench paragraph belongs in the `StepsPanel` as step 0 or behind
"About this bench".

### 3. Panels collapse, resize and remember

**Source.** Figma's help centre article "Navigating UI3" (as summarised in search results; the article URL itself
answered 404 when fetched): resizable and collapsible panels, Minimize UI collapses the navigation and properties
panels, and the UI minimizes by itself when following a collaborator. The UI3 blog post confirms the first two.
VS Code: toggle the secondary side bar, move the panel to any edge, `View: Toggle Maximized Panel`. Wokwi's serial
monitor (docs.wokwi.com/guides/serial-monitor): `display: auto` shows the monitor "when there's some output (the
default)", `collapse: true` opens it collapsed.

**In practice.** Every panel has a 36–40 px header with its name and a collapse chevron; collapsed, it is a 40 px rail
with a vertical label; the choice is kept in `localStorage` per workspace. Output panels open themselves the first
time they have something to show.

**iynk.** `SerialMonitor`: collapsed under the code until the first byte arrives, then open (Wokwi's `auto`).
`CodePanel` and `LessonInfo`: one column, collapsible. `StepsPanel`, `FaultsPanel`, `TasksPanel`, `StatusPanel` on a
bench; `BuildPanel`, `TestsPanel`, `CliConsole` on a drone. The `LabDock` already behaves like a secondary side bar;
keep it and give the lab panels the same chevron.

### 4. Tabs for siblings, stacking for sequence

**Source.** VS Code (ux-guidelines/overview): "Views like the Terminal, Problems, and Output can be viewed in a single
tab at a time in the Panel." Codecademy's learning environment (curriculum-documentation.codecademy.com, exercises /
le-layouts): an exercise is 2–5 panes, the narrative pane first, an Output Terminal that "must be used alongside a
Code Editor". Codecademy's 2015 redesign post (medium.com/about-codecademy/redesigning-our-learning-environment-
process): a darker backdrop so the lesson content stands out; a learner's critique of that environment asks for the
lesson text to scroll on its own so the code stays in place, which is the behaviour to build.

**In practice.** Content that the learner uses in turn (read, then code, then check) sits in one column as tabs or as
two stacked panes with one scroll container each. Content that belongs to one moment (code and its output) stacks.

**iynk.** A lesson becomes: left the figure, right a column with tabs `Lesson | Code | Checks | Quiz` (or Code with
the serial monitor stacked under it, and the lesson text as the first tab). Today `LessonWorkspace` line 333 puts
checks, quiz and Break it in a second `lg:grid-cols-2` grid below, which is why the page is 7 756 px tall and
`ChecksPanel` starts at y > 900. A bench becomes `Steps | Faults | Tasks | Stats | Serial`. `DroneWorkspace` already
has `Design | Build | Wiring | Tests | CLI | Quiz`: that is the right pattern, keep it and give it the whole column.

### 5. Direct controls on the canvas, everything else off it

**Source.** Figma UI3: a slim toolbar on the canvas; labels optional ("Turn on labels to quickly understand what each
control does, or turn them off to focus on your work"). Onshape: context toolbars, the last-used tool rising to the
top of its group. Procreate and Infinite Painter (docs.infinitestudio.art/painter/studio/customize): one gesture hides
every panel and the canvas stays usable.

**In practice.** The canvas carries only what acts on the view: rotate, zoom, see-through, labels, exploded, in one
thin bar at the plate's edge. Actions that change the model (power, upload, place a part, break it) live in the panel
in the order the user will need them.

**iynk.** The host's `ViewBar` (Board | Breadboard | Schematic | Power tree, Exploded view, See-through, rotate,
power source) is two rows above the plate; make it one 40 px row inside the plate's top edge. The 10–11 pill buttons
over the art (Power, Upload sketch, Press RESET, Strip to bare PCB …) are drawn by the figure itself (`figures/**`,
out of scope); the host's "Figure controls (68)" `<details>` in `FigureFrame` duplicates them below as a third level
(see 14). Prefer `controls={false}` and let `StepsPanel` / `BuildPanel` be the one place for model actions; if a
figure flag to hide its pill menu exists, that is a request to the figure owner, not a host change.

### 6. One status strip, always visible, numbers in one style

**Source.** VS Code status bar: left side is the workspace, right side is the active file; NN/g heuristic 1: "The
design should always keep users informed about what is going on, through appropriate feedback within a reasonable
amount of time." FPV OSDs (ImmersionRC EzOSD product page) show "just the essentials instead of a crowded display".

**In practice.** A 32–36 px row directly under the plate: state (Running / Stopped), power, the pin or part being
taught, current, program name. Each is a 12 px kicker over a tabular-number value, separated by space, no cards.

**iynk.** The plate's top-right readout (`STATUS RUNNING / 5V 5.0 V / PROGRAM Blink`) is the right typography; it
overlaps the art and the Labels toggle. `StatusPanel` (robotics) and `DesignPanel`'s six bordered stat cards (all-up
weight, thrust : weight, hover throttle …) become one row of `Stat` without borders. `FigureReadout` and `PinReadout`
feed it. `FlyWorkspace` shows arm state, mode, battery, gate and lap time the same way, on the canvas (see 24).

### 7. Type: two families, five sizes, fluid between 390 and 1920

**Source.** Utopia (utopia.fyi/blog/designing-with-fluid-type-scales): one scale at 320 px (ratio 1.2) and one at
1500 px (ratio 1.333), interpolated with `clamp()`, "a set of type sizes which is always 'in tune' with itself".
Butterick (practicaltypography.com/line-length.html): "Aim for an average line length of 45–90 characters, including
spaces." Vercel Geist (vercel.com/geist): Geist Sans for text, Geist Mono for code and technical labels.

**In practice.** Workspaces use 12 (kicker), 13–14 (UI, mono), 15–16 (body), 20–24 (panel and page titles); display
sizes (28–52) only on reading pages. Prose columns 60–68 ch. Numbers tabular. Headings `text-wrap: balance`.

**iynk.** `globals.css` sets `h1 { clamp(2rem, …, 3.25rem) }` for every page; add a workspace title size (1.25–1.5
rem) and keep the big one for `/en`, `/en/about` and the catalogues. `.ink-prose` is already 68 ch at 1.65 line
height: keep. The bench intro paragraph runs ~90 characters per line at 1440 (the ceiling of Butterick's range). The
`.ink-kicker` (12 px mono, 0.12 em tracking) is good and should be the only small-caps style.

### 8. Spacing on a 4/8 grid: dense in the workspace, airy on reading pages, one border per panel

**Source.** Carbon spacing (carbondesignsystem.com/elements/spacing/overview): a 2/4/8 scale to 160 px, "Elements
that have more spacing around them tend to be perceived as higher in importance", "deviating from the spacing scales
should be avoided whenever possible". Linear's density (third-party analyses only; no first-party doc): more data,
less chrome, detail on hover.

**In practice.** Workspace: 8–12 px between panels, 16 px inside, 8 px between rows. Reading pages: 24–48 px
between sections. A panel has one 2 px ink border; inside it, 1 px rules and indentation, never nested cards.

**iynk.** `StepsPanel` nests an ink card (step) inside an ink card (panel) with an ink-shadowed button inside that:
three borders and three shadows per step. `LessonStrip` is five bordered cards plus bordered chevrons. `DesignPanel`
has six bordered stat cards; `ChecksPanel` a card per check. Reduce each to one border per panel and rules inside.
`Card.tsx` could take a `flat` variant (no border, no shadow) for inner items.

### 9. Colour is a signal; ink and paper are the default

**Source.** Radix Colors (radix-ui.com/colors/docs/palette-composition/composing-a-palette and the scale docs):
twelve steps with fixed roles, 1–2 backgrounds, 3–5 component states, 6–8 borders, 9–10 solid fills, 11–12 text;
"Creating semantic aliases like accent, primary, neutral … can be helpful". Teenage Engineering's site (described in
several design-system teardowns, none first-party): colour only in the product and the one action. Geist: a near-mono
palette with one accent.

**In practice.** Chrome uses ink, muted and rule. One mustard primary per visible area. Good/bad/warn only for state.
The lab's palette (cobalt boards, mint robotics, tomato drones) appears once per page, as a kicker, a tab underline
or a plate edge, not as a full fill behind text.

**iynk.** Mustard primaries today: Run, Do it, Fly it, Fly the challenge, Open lab tools; keep one per area (the
fly page shows Arm and Fly the challenge at once). The mint "Running" chip and the pastel `bg-good-bg` / `bg-bad-bg`
with `.on-fill` are right. The landing's three colour-headed cards are a catalogue and may keep their fills.
`Button.tsx` variants: primary (mustard), secondary (ink outline), quiet (text). Nothing else.

### 10. Dark mode is a second palette, not inverted paper

**Source.** Material's dark theme guidance (m2.material.io/design/color/dark-theme, static page): dark grey rather
than black, surfaces get lighter with elevation, accents desaturated, text at high/medium/disabled emphasis. Apple's
HIG Dark Mode page (via summaries; the page itself is script-rendered): elevated surfaces lift with subtle colour,
system colours adapt.

**In practice.** Paper → warm dark; surface a step lighter than paper; the figure's plate stays paper so ink art reads;
status colours lighter and less saturated; the focus ring switches to a light colour.

**iynk.** `globals.css` already does all of it (`--paper #1b1813`, `--surface #26221b`, `--plate-bg #e4ddcf`, good
`#93d3b0`, focus `#f4b829`). The dark lesson screenshot is clean. Keep; only check that any new flat panels (8) still
separate from the paper by `--surface`, not by borders.

### 11. Motion: under 300 ms, ease-out, interruptible, never on a keypress

**Source.** Emil Kowalski (emilkowal.ski/ui/great-animations): "Your animations should also usually be shorter than
300ms"; ease-out "starts fast and slows down at the end"; interruptible animations let "the user change the state of
the animation at any time while maintaining a smooth transition"; never animate keyboard-initiated actions; animate
only `transform` and `opacity`; respect `prefers-reduced-motion`. Material 3 Expressive (I/O 2025; the official page
is script-rendered, values from the Flutter `motor` package that mirrors the tokens): springs with a spatial and an
effects family, three speeds.

**In practice.** Panel collapse 200 ms ease-out on transform; sheet rise 220 ms; a celebration (step done, checks
pass) may take 500–700 ms and bounce, once. Serial lines append with no animation. Run/Stop from the keyboard
changes state instantly.

**iynk.** `globals.css`: `ink-rise` 0.22 s and `ink-fade` 0.18 s are right; `ink-pop` 0.7 s belongs only to a
completed step or passed check, not to hover or every click. `Sheet.tsx`, `Dialog.tsx`, `Tabs.tsx` use transform and
opacity. The `data-reduce-motion` switch and the media query already cover the reduced path: keep both.

### 12. Feedback at 0.1 s, 1 s and 10 s; no spinner under a second

**Source.** NN/g response times (nngroup.com/articles/response-times-3-important-limits): under 0.1 s "no special
feedback is necessary except to display the result"; over 1 s "indicate to the user that the computer is working on
the problem"; over 10 s "a percent-done indicator as well as a clearly signposted way for the user to interrupt".
NN/g skeleton screens (nngroup.com/articles/skeleton-screens): under 1 s nothing; spinners for 2–10 s single modules;
skeletons for full-page loads; progress bars over 10 s.

**In practice.** Run flips the status chip before the simulation produces anything. A figure that takes over a second
to say `ready` shows a paper plate with the figure's title and a quiet "loading" line, not a spinner; a failed figure
says so in words with a retry.

**iynk.** `FigureFrame` already has `aria-busy`, a `READY_TIMEOUT_MS` of 10 s and a `figure.failed` message; make
the loading state visible (the plate is blank today) and give the failed state a retry button. `CodePanel` Run and
`SerialMonitor` status, `TestsPanel` smoke-stopper and motor-direction tests (seconds long: show progress inline).

### 13. Empty states say what will appear and offer one action

**Source.** Carbon empty states (carbondesignsystem.com/patterns/empty-states-pattern): title, body that explains the
next step, one primary action, "Keep words to a minimum so they are fast to read and act upon", "Empty states always
appear in the otherwise empty space, in the context of the data that's missing". Polaris: one primary call to action,
an encouraging tone.

**In practice.** An empty canvas is never blank: a one-line title, one sentence, one button, placed where the content
will be.

**iynk.** `/en/drones/quad5` opens on an empty green plate with eleven pills around it (0/12 parts): put "No parts
fitted yet" and a single primary "Build it for me" (secondary: "Add the frame") on the plate; the `BuildPanel` list
is the second level. `SerialMonitor`'s "Nothing printed yet. Press Run." is already right. `FaultsPanel` with no fault,
`TasksPanel` before the first task, `ChecksPanel` before the first run, `DashboardProgress` with nothing started, the
fly page's "No design saved for this craft yet" (good, keep).

### 14. Onboarding is the first step, one hint at a time, two levels deep at most

**Source.** NN/g instructional overlays (nngroup.com/articles/mobile-instructional-overlay): users "cannot be expected
to read a manual before using your app"; "Presenting hints one-by-one, at the right moment, makes it a lot easier for
users to understand and learn instructions"; chains of tips are dismissed. NN/g progressive disclosure
(nngroup.com/articles/progressive-disclosure): "Initially, show users only a few of the most important options";
"designs that go beyond 2 disclosure levels typically have low usability". Brilliant (brilliant.org): problems step
by step with feedback as you go.

**In practice.** No tour. The first thing on screen is step 1 with its one button. Advanced options (power source,
baud rate, Break it, CLI) are one disclosure away. A third level is a smell.

**iynk.** `StepsPanel`'s "Next up" card is the onboarding: keep it and put it first in the viewport. The lesson's
first instruction should name the Run button; `CodePanel`'s Expand / Copy / Reset become icon buttons in the editor's
corner. The `FigureFrame` "Figure controls (68)" disclosure is the third level under the figure's own pills: remove it
or fold it into `ShortcutsDialog`. The drone page's `(i)` button next to Fly it and the "Finish the build and the
safety tests first" sentence can be one tooltip on a disabled Fly it.

### 15. One primary action per area, named as the verb

**Source.** Polaris empty state and Carbon: one primary action, others ranked below it; Figma's properties panel put
"component controls like variants and instances" at the top because order signals importance.

**In practice.** Each panel or plate has one filled button (Run, Do it, Fly it, Arm) and text buttons for the rest.

**iynk.** Lesson header today: Sound, Keyboard shortcuts, Expand code, Copy code, Reset code, Run, all at the same
size. Keep Run filled; the rest become `IconButton`s with tooltips. Fly page: Arm filled, Reset to the pad / FPV
goggles / Wind as outlined or icon toggles, Fly the challenge inside its own panel only.

### 16. `?` lists the page's shortcuts; keys appear in tooltips; nothing fires while typing

**Source.** GitHub (docs.github.com/en/get-started/accessibility/keyboard-shortcuts): "Typing ? on GitHub brings up a
dialog box that lists the keyboard shortcuts available for that page"; a command palette so users need not memorise.
Dynatrace's developer guide: show the key in tooltips, make tooltips appear on keyboard focus. VS Code: every command
in the palette with its key.

**In practice.** The `?` affordance is an icon button with a tooltip; Run, Arm, See-through, Labels show their key in
the tooltip; single-key shortcuts are ignored while the editor or a field has focus.

**iynk.** `ShortcutsDialog` (boards), `KeyHelp` (robotics), `KeyboardHelp` (drones) exist: keep every binding (rule
6). Add the key to `Tooltip.tsx` on the buttons that have one. Verify `CodeEditor` swallows R, Space and the arrows.

### 17. Phone: the canvas first, the panels as a sheet with two heights

**Source.** Apple HIG sheets (medium and large detents, a grabber when resizable; page body is script-rendered, taken
from the published guidance) and Material 3 bottom sheets (standard sheets stay beside the content, modal sheets sit
over a scrim, drag handle optional). Infinite Painter: panels hide, the canvas stays live. Sketchbook: the toolbar
stays at one edge of the canvas and swaps tools by device.

**In practice.** On 390 px the figure is the top 50–60 % of the viewport and stays put; a standard (non-modal) bottom
sheet with a grabber holds the panel tabs at a medium height (about 40 %) and drags to full; the page does not scroll.

**iynk.** Today the lesson is 11 658 px tall on a phone (bench 14 597, German 15 932) and "Open lab tools" is a
floating pill over the art. `LessonWorkspace`, `BenchWorkspace`, `DroneWorkspace`: a sticky figure and `Sheet.tsx` with
detents for the tabs; the dock's phone sheet (`LabDock`) is the same component. `FlyWorkspace`: full-width range on
top, `TouchSticks` fixed at the bottom, HUD in the canvas.

### 18. Targets: 44 px on touch, 24 px with spacing as the desktop floor

**Source.** WCAG 2.2 SC 2.5.8 (w3.org/WAI/WCAG22/Understanding/target-size-minimum): "at least 24 by 24 CSS pixels",
or a 24 px circle around an undersized target that does not intersect another's; inline links exempt; SC 2.5.5 is
the enhanced level. Apple HIG: 44×44 pt as the recommended size.

**In practice.** Phone: 44 px minimum everywhere (`.touch-target`). Desktop dense rows: 28–32 px tall is fine if
there is 8 px between controls.

**iynk.** Measured with `<scratchpad>/F-research/targets.mjs`. At 1440 the lesson page has 59 controls under 44
px, but 57 of them are 36–40 px tall buttons with spacing (fine by the 24 px floor); the real offenders on every size
are a 16×16 colour swatch ("Red") in the wire-in palette, an unlabelled 16×16 control, the 12 px-tall "Resize the
serial monitor" handle (`SerialMonitor`), and on the fly page the two 13×13 ghost toggles (`data-testid=ghost-best`,
`ghost-pace` in `FlightRange`). At 390 the three `ViewBar` rotate icons are 35–42 px wide (44 tall): widen to 44. The
footer credit link is 40 px tall. Re-run the script after the rebuild; it lists them.

### 19. The lesson strip is a progress rail, not a card carousel

**Source.** Brilliant: short sequenced lessons with a visible position; Duolingo's lesson progress bar (first-party
blog only covers tabs; the bar is described in teardowns); NN/g heuristic 6: "Minimize the user's memory load by
making elements, actions, and options visible."

**In practice.** Sixteen lessons as sixteen 32 px numbered chips in one row (done filled, current outlined, rest
muted), name of the current one beside the title; or a vertical list in the Lesson tab. Prev / Next as text buttons.

**iynk.** `LessonStrip` (five 240 px cards, two bordered chevrons, 110 px of the fold) and `BoardProgress`. The
"0/16" count stays (SPEC baseline), as the kicker of the rail.

### 20. Checks and quizzes beside the work, re-run on every change, explained when wrong

**Source.** Brilliant: "instant feedback as you go"; Codecademy: checkpoints in their own pane next to the editor;
Duolingo teardown: keep mistakes recoverable and explanations close to the answer.

**In practice.** Checks live in the tab next to the code, re-evaluate on every Run, and a failed check says what to
change in one line. A quiz question appears inside the step it belongs to; a wrong answer shows why, then lets you try
again.

**iynk.** `ChecksPanel` (now below the fold) into the lesson column's tabs with a count badge ("Checks 1/3");
`QuizPanel` (robotics and dronelab) inline after the step that unlocks it, in the same panel, not a separate card
column.

### 21. Reading pages keep a measure and air; catalogue cards show the product

**Source.** Butterick's 45–90 characters; Teenage Engineering teardowns: the product is the only dense object on the
page, the rest is negative space and hairlines; Carbon: more space around an element reads as more important.

**In practice.** Landing: title, one paragraph, two buttons, the art; nothing competes. Catalogues: a grid of plate
thumbnails (the real figure, not an icon) with name and a one-line fact, 3–4 per row at 1440, 1 at 390.

**iynk.** `/en` hero is right (art 42 % of the viewport): keep. "The three labs" cards can show a small figure
plate each. `/en/boards`, `/en/robotics`, `/en/drones` catalogue pages and `Card.tsx`: plate thumbnails, counts as
kickers, no paragraph per card.

### 22. Wide screens add density, not margins

**Source.** Carbon: at a breakpoint it is acceptable "to jump a step(s) on the spacing scale"; VS Code and Figma keep
panels docked to the edges at any width; Onshape's toolbar grows back out of its dropdowns on a large screen.

**In practice.** Workspaces have no max width. At ≥ 1536 px a third column appears (serial monitor or stats beside the
code instead of under it) and the figure keeps growing. Reading pages cap at 72–80 ch.

**iynk.** The four workspaces' `max-w-7xl` (320 px of paper each side at 1920). The landing and about pages keep
their container.

### 23. Labels on by default, icons beside them, icon-only when narrow

**Source.** Figma UI3 made labels optional for exactly this trade-off; Onshape collapses toolbar icons into groups as
the screen narrows.

**In practice.** First-time judges read words: text labels stay on. Below 360 px of panel width, buttons drop to icons
with tooltips and `aria-label`s.

**iynk.** `ViewBar`, `SegmentedControl`, `IconButton`, the fly controls row, the dock tabs.

### 24. The fly page is a HUD: essentials on the canvas, the rest folded away

**Source.** FPV OSDs (ImmersionRC EzOSD page; INAV OSD docs warn against items that overlap on screen); MSFS 2024's
community removes its persistent toolbar handle and SU5 added a HUD-off option, both signs that sim players want the
view clean; VS Code's maximize for the one thing you are doing.

**In practice.** The range canvas is the workspace (≥ 65 % of the viewport), with arm state, mode, battery, gate and
lap time as a thin OSD strip in a corner; controls as one row under the canvas; daily challenge, arming rules and the
design summary in a collapsible panel.

**iynk.** `FlyWorkspace` (canvas top at 383 px, cut by the 900 px fold; 2 997 px page), `FlightRange`, `BreakIt`,
`DailyChallenge` (a dashed card that outranks the canvas today), `GamepadPanel`, `TouchSticks`. Keep every key
(WASD, arrows, Space, V) and the crash replay and ghosts.

### 25. Six languages: design for the longest word and the tallest script

**Source.** iynk's own rule 5 and the measurements: the German bench is 9 % taller than the English one on a phone;
Devanagari needs more line height (globals.css already swaps the family). Figma and Onshape both compact labels before
they truncate.

**In practice.** Buttons never truncate and never grow past their row: give them
`min-w-0` and allow two lines at 390 (commit `282f15d` fixed the French and German cases); headings `text-wrap: balance`; panels at least 320 px wide; test de and hi in
every layout, not only en.

**iynk.** Every new string in all six `src/i18n/messages/<lang>/*.json`; keep the strings few (rule 5). The German
screenshots (`bench-390-dark-de.png`, `lesson-390-dark-de.png`) wrap cleanly today; keep it that way after the
rebuild.

## Keep (already right; the audits should list these as "do not change")

- The look: paper grain, 2 px ink borders with offset shadow, hand-cut `--radius-ink` corners, Newsreader display,
  mono UI, the five palettes. Dark mode's handling of the plate (paper stays light, ink stays dark).
- `:focus-visible` ring (2.5 px ink plus mustard halo); the reduced-motion media query and the `data-reduce-motion`
  switch.
- `StepsPanel`'s "Next up" card with one `Do it` button; the serial monitor's "Nothing printed yet. Press Run.";
  the fly page's "No design saved for this craft yet" line.
- The plate readout typography (kicker over a tabular value): make it the pattern for every stat.
- `DroneWorkspace`'s tab row; the landing hero; `.ink-prose` at 68 ch; `.ink-kicker`.
- Every route, `data-testid`, keyboard shortcut and the presenter's labels in `docs/hacktx/VIDEO.md` and
  `PITCH.md` (rule 6).

## Sources read

First-party: figma.com/blog/behind-our-redesign-ui3; help.figma.com/hc/articles/23954856027159;
code.visualstudio.com/docs/configure/custom-layout and /api/ux-guidelines/overview;
cad.onshape.com/help/Content/Home/user_interface_basics.htm; docs.wokwi.com/guides/serial-monitor;
curriculum-documentation.codecademy.com (le-layouts); emilkowal.ski/ui/great-animations;
nngroup.com/articles/{ten-usability-heuristics, response-times-3-important-limits, skeleton-screens,
progressive-disclosure, mobile-instructional-overlay}; carbondesignsystem.com (empty-states-pattern, spacing);
radix-ui.com/colors docs; utopia.fyi/blog/designing-with-fluid-type-scales; practicaltypography.com/line-length;
w3.org/WAI/WCAG22/Understanding/target-size-minimum; docs.github.com keyboard-shortcuts; vercel.com/geist;
brilliant.org. Script-rendered pages that would not fetch (Apple HIG motion and sheets, Material 3 motion and
bottom sheets, Polaris empty state after its move to shopify.dev) are cited from their published guidance as
summarised in search results, and marked so above. Third-party teardowns (Linear, Teenage Engineering, Duolingo,
Procreate) are used only for description, never as a spec.
