# Learn Arduino (original), teardown for the iynk Board Lab rebuild

Original: https://learn-arduino-red.vercel.app, by Dilum Sanjaya (credited as "Designed by x.com/DilumSanjaya").
It is a single-page Vite + three.js app. It teaches 16 lessons on a 3D Arduino Uno R3. Each lesson is a block of data (text, pinout table, spec grid, parameters, a code template, callout cards) plus a hand-written JavaScript simulation of that one circuit. Nothing parses or runs the C++ sketch. The code panel is read-only. You change the circuit through a per-part "inspector" panel, by dragging or pressing parts in the 3D scene, or by clicking the highlighted numbers in the code.

Investigated 2026-10-24: I read the full bundle source and drove the live site with Playwright (desktop 1672×941, 1280×800, phone 390×844, and the /es/ /fr/ /de/ /zh/ /hi/ /he/ /ja/ paths).

---

## 0. Sources, line references, screenshots

### 0.1 Files

The minified originals are in `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/orig/arduino/`. Every `file:line` below points at a **pretty-printed copy** of those files, so the line numbers mean something:

| Tag | Pretty file (in `.../scratchpad/la-pretty/`) | Original chunk | Contents |
|---|---|---|---|
| `I:` | `index.js` | `index.js` (shipped as `index-GGrOCNGj.js`) | language list, router, translators |
| `M:` | `main-Bvl_zo-E.js` | same | lesson data, UI classes, schematic, audio, app bootstrap |
| `S:` | `stage-QLKhHYHN.js` | same | three.js, camera controls, per-lesson scene layout, **all 15 simulations** |
| `K:` | `kit-DXbMhk_I.js` | same | 3D models of the Uno, breadboard and every component; outline post-pass |
| `T:` | `thumbs-DPauGRHu.js` | same | renders the lesson-card thumbnails from the 3D models |
| `C:` | `index.pretty.css` | `index.css` (= live `index-CqDNWwLj.css`, byte-identical) | all styling |
| `H:` | `../la-live/index.html.pretty` | live `/` HTML | page shell, meta, noscript list |
| `L-xx:` | `xx-*.js` (es, fr, de, zh, hi) + `../la-live/locales/*.js` (pt, it, tr, id, ja, ko, he) | locale chunks | English→target dictionaries |

To regenerate the pretty copies (same line numbers):

```js
// pretty.js  (run: node pretty.js <src.js> <outDir>)
const fs = require('fs'), path = require('path');
const parser = require('<iynk>/node_modules/@babel/parser');
const generate = require('<iynk>/node_modules/@babel/generator').default;
const [,, src, outDir] = process.argv;
const code = fs.readFileSync(src, 'utf8');
const ast = parser.parse(code, { sourceType: 'module', plugins: ['importMeta'], errorRecovery: true });
fs.writeFileSync(path.join(outDir, path.basename(src)),
  generate(ast, { compact: false, comments: true, jsescOption: { minimal: true } }, code).code);
```

CSS was split on `{ } ;` with 2-space nesting (3643 lines).

A debug handle ships in production. `window.__app = {stage, selectLesson, run, stop, state, setParam, inspector, minimap}` (M:4573). Every live check below used it.

### 0.2 Screenshots (`/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/shots/learn-arduino/`)

| File | Shows |
|---|---|
| `01-main-desktop.png` | Home, lesson 1 "Meet the board": 6 callout cards, the info card, the code card, the lesson strip |
| `02-settings-flyout.png` | Settings flyout |
| `03-board-explorer-hover.png` | Hover tooltip "USB-B PORT", with the hovered part lifted |
| `04-board-explorer-select.png` | ATmega328P selected: inspector, selection ring, callouts collapsed to tags |
| `04b-board-callout-focus.png` | After clicking the "Power Jack" card, the camera zooms to the jack |
| `05-board-pinout-tab.png` | Pinout tab |
| `06-all-done.png` | All 16 lessons done: check badges, 16/16 |
| `07-blink-inspector-led.png` | LED inspector (colour swatches and On/Off sliders), the `500` chips marked |
| `08-blink-schematic-running.png` | Schematic panel open while running |
| `09-code-expanded.png` | Code card expanded |
| `10-panned-minimap.png` | View panned away: minimap visible |
| `11-phone-top.png`, `12-phone-full.png` | Phone layout (390 px), full page |
| `13-phone-knob-running-inspector.png` | Phone: knob lesson running, inspector docked at the bottom |
| `14-phone-code-console.png` | Phone: code and serial monitor |
| `15-lang-{hi,zh,he}-blink.png` | Hindi, Chinese, Hebrew (RTL) |
| `16-lessons-flyout.png` | Lessons flyout |
| `17-schematic-{stepper,force,piano,heat}.png` | Generated schematics |
| `18-sidebar-expanded.png` | Sidebar expanded with labels |
| `run-01-board.png` … `run-16-project.png` | Every lesson running (plus `run-06-light-dark`, `run-11-heat-ramp`, `run-13-stepper-spinning`, `run-14-plant-thirsty/-watering`, `run-15-force-squeeze`) |

---

## 1. Page structure

### 1.1 HTML shell (H:)

- `<html lang="en" class="is-loading">`. Title "Learn Arduino — interactive 3D lessons for beginners". Meta description "Learn Arduino on an interactive 3D board: wire LEDs, buttons, sensors, motors and servos, then run the code and watch it work. 16 free beginner lessons." Author "Dilum Sanjaya".
- `theme-color` #f6eddd. `color-scheme` light. Manifest `/site.webmanifest`: name "Learn Arduino — interactive 3D lessons", short name "Learn Arduino", `display: standalone`, bg and theme #f6eddd, icons 192, 512, maskable 512, and svg.
- Open Graph and Twitter cards with `og-image.png` (1200×630). Each language has its own `og-image-xx.png`. Alt text: "An illustrated 3D Arduino Uno wired on a breadboard to a distance sensor and a traffic light, with a toy car in front of it".
- `hreflang` alternates for all 13 languages plus `x-default`, and a canonical per language.
- JSON-LD `@type: ["WebApplication","LearningResource"]` with `teaches` set to the 16 lesson titles, `isAccessibleForFree`, `educationalLevel: Beginner`.
- `<noscript>`: "An interactive 3D course in your browser. Turn on JavaScript to start." It lists all 16 lessons as **"N. Title"** followed by the first sentence of the lede.
- The Barlow Semi Condensed 500 and 600 woff2 files are preloaded.
- `#app.artboard` is `inert` until the loader finishes.

### 1.2 Loader (M:3457-3476, M:4554-4667, C:299-447)

A full-screen `#loader` on `--bg` with a faint 28 px grid masked into a radial vignette. The Arduino "∞ −/+" logo is 92×50, stroke #26324d. Title "LEARN ARDUINO" (uppercase, letter-spacing .13em). A 220×8 track with a teal gradient fill (#23b0ad→#149895, `scaleX`) and a moving shine (1.4 s loop). Below it a step label (uppercase, .16em tracking, faint colour).

Step sequence (label → fill): "Loading" (the initial HTML) → "Loading fonts" 0.08 → "Loading the 3D view" 0.18 → "Building the board" 0.32 → "Drawing the lessons" 0.6 → "Drawing the lessons · {n} / {total}" = 0.6 + 0.38·n/16 (one step per thumbnail rendered) → "Ready" 1.0. Then a 0.5 s fade and the node is removed. On the live site this took about 16 s in headless SwiftShader.

- A 20 s failsafe dismisses the loader anyway (`sn = 2e4`, M:4498).
- On a fatal error the loader gets `is-failed`, the track hides and the label reads "Something went wrong while starting. Try reloading the page."
- If WebGL fails: the stage gets `no-webgl`, the canvas, viewbar and minimap hide, and a centred note shows "3D view unavailable" with "The 3D board is drawn with WebGL, which this browser has turned off. Turn on hardware acceleration in its settings, or try another browser — the lessons and their code still work." (M:4499-4512).
- `prefers-reduced-motion` shortens the loader fade to 10 ms and hides the shine.

### 1.3 Desktop artboard and scaling (M:4232-4244, C:472)

The whole UI is one fixed **1672×941 px artboard** (`#app.artboard`), scaled with `transform: scale(B)` from the top-left corner. Its background is a radial highlight `radial-gradient(120% 90% at 45% 45%, #fffaf08c, transparent 60%)` over `--bg`.

Scale rule (`Lt()`):
```
n = min(vw/1672, vh/941)
if n < 0.8:  n = min(vw/1280, vh/941, 0.8)      // the artboard may become wider than 1672
compact = n < 0.62 || vw/vh < 0.95            // phone/portrait → CSS-grid layout (§1.13)
not compact: #app.width = vw/n, #app.height = vh/n, transform = scale(n)
```
Measured: at 1280×800 the scale is 0.8 and the artboard is 1600 px wide. At 1672×941 the scale is 1.

Decorative "PCB traces" (SVG `#traces`, M:2082-2235) run around the artboard edges: polylines with small end circles (stroke `--trace` #d3bea3, 1.5 px) and clusters of faint pixel squares (#d9c5ac at varied opacity). They are anchored to the corners and stretch with the artboard.

### 1.4 Regions (desktop, artboard px)

| Region | Selector | Position / size | Notes |
|---|---|---|---|
| Sidebar | `.sidebar` | left 0, width 72, full height | vertical gradient #e7d9c6→#e9dcca→#eadecd |
| Brand | `.brand` | top 21, left 95 | logo + dotted rule + title + tagline |
| Status | `.status` | top 17, right 79, 444×87 | progress card + clock |
| Stage (3D) | `.stage` | inset 0 500 140 72 | canvas + overlays |
| Info card | `.info-card` | top 120, right 20, 476×397 | 4 tabs |
| Code card | `.code-card` | top 527, right 29, 464×254 | "Try it yourself" + serial monitor |
| Lessons | `.lessons` | bottom 32, left 100 | heading "Lessons" + horizontal card strip |
| Viewbar | `.viewbar` | bottom 9 of stage, centred at 50% + 168 px | camera buttons |
| Minimap | `.minimap` | bottom 30, left 14 of stage, 184×126 | only when the view is away from home |
| Flyout | `.flyout` | left 84, top `--top` (≥40), 300 wide, max-height 560 | Lessons / Components / Settings / Language |

### 1.5 Sidebar (H:, M:2991-3118, C:542-600)

The nav icons sit at fixed tops of 150, 230, 316, 400, 488 and 574. Each link has `aria-label` and `title`. Its label shows only when the sidebar is expanded:

1. **Home** (house, filled). Selects lesson 1 and resets the view.
2. **Lessons** (open book). Opens the Lessons flyout: header "Lessons" and "{done}/{total} done". Below that, an ordered list of buttons showing the number, or a ✓ icon when done, with **title** in bold and the **heading** in small text (e.g. "MINI PIANO / Build a mini piano"). The current lesson is marked `is-current`. Clicking one closes the flyout and selects the lesson.
3. **Components** (chip). Opens the Components flyout: header "Components" and "{n} in view". Up to 12 entries: the lesson's parts (non-wire), then board parts in the order dip, usb, jack, reset, digitalA, power, analog, qfn, crystal. Each row has a focus icon, the name and the description. Clicking one zooms to and selects that part (M:4438-4457).
4. **Simulator** (screen with a play triangle). `aria-label` and `title` "Run simulation". It toggles Run/Stop and is highlighted (`is-on`) while running.
5. **Settings** (gear, muted). Opens the Settings flyout (§1.5.1).
6. **Language** (globe, muted, with a small code badge such as "EN"). Opens the Language flyout: 13 rows. Each row shows the code, or ✓ for the current language, the native name in bold, and the name in the current UI language in small text via `Intl.DisplayNames` (e.g. "ESPAÑOL / Spanish"). Picking one navigates to that language (§6).

- `.side-toggle` (chevron, 47×50 at top 47) toggles `is-open`, which widens the sidebar to show labels. Labels: "Expand sidebar" / "Collapse sidebar". The flyout shifts with it (`beside-open`).
- At the bottom is a vertical credit link "Designed by / x.com/DilumSanjaya" with an X logo. The rebuild must **not** copy this branding.
- Clicking outside a flyout closes it. Escape also closes it.

#### 1.5.1 Settings flyout (M:3060-3087)

Header "Settings". Rows (verbatim; bold title over a small description):

| Key | Title | Description | Default |
|---|---|---|---|
| (select) | Language | Lessons, labels and code comments | current |
| `labels` | Callout labels | Cards and pointers around the 3D view | on |
| `flow` | Current flow | Moving dots and HIGH / LOW on the wires while a sketch runs | on |
| `grid` | Floor grid | The faint grid under the board | on |
| `autoRotate` | Turntable | Turn a quarter every few seconds when idle | off |
| `sound` | Sound | Let the buzzer play out loud | on |
| `reducedMotion` | Reduce motion | Near-instant transitions | = `prefers-reduced-motion` |

The last row is a "Reset progress" button that clears the done set and the counter.
The switches are `<input type=checkbox>` with a custom track.
The `schematic` setting also lives in this object but has no row. It is toggled from the viewbar.
All of it is stored in `learn-arduino:settings` (§7).

### 1.6 Brand

The logo is 91×50, then a vertical rule with a 5 px dot at each end, then:

- H1 **"Learn Arduino"**: Barlow Semi Condensed 600, 36.5/38 px, uppercase, letter-spacing .13em, `--navy` #18213d.
- Tagline **"Explore · Understand · Build"**: 19.5 px, weight 500, uppercase, letter-spacing .17em, `--faint` #ada293. The separators are `<i>·</i>` with .45em margins.

### 1.7 Status: progress card and clock (H:, M:4343-4347, C:799-881)

- The progress card is 253×66 with an open-book icon. Label **"Basics"** (uppercase 17 px, weight 700, navy). Below it a track `role=progressbar` (aria-valuemax 16) whose fill is a teal gradient with width `done/16·100%` (0.8 s ease), and the count **"0/16"** (19 px, weight 700).
- The clock (`<time>`, JetBrains Mono 17.5/23 px, #5d6066) has two lines: the date via `Intl.DateTimeFormat(lang, {month:'short', day:'2-digit', year:'numeric'})` with dots removed and uppercased, e.g. "OCT 24, 2026", "24 OCT 2026", "2026年10月24日". Korean uses the numeric format. Second line `HH:MM:SS`, updated every 1 s (M:2236-2259).

### 1.8 Stage overlays

- `#board-canvas` (three.js). `aria-label` "Interactive 3D view. Drag or use WASD to pan, Q and E to rotate, scroll to zoom."
- **Callout cards** (`.rig .callout`, M:2358-2575, C:748-798). Absolutely positioned cards at fixed artboard offsets (`x`, `y`, `w` in each lesson's `callouts` data). Each has an icon (40×40 line icon) and an uppercase title (18 px, weight 700) over a body (15.7/20 px, #5c6066).
  - A dashed leader (#1d2236, 1.6 px, dash 5 4) runs from the card edge: `side` top/bottom/left/right, `at` = offset along that edge, `leg` = first segment length, optional `approach: 'above'`, optional `via` waypoint. It ends at the anchor's projected screen point.
  - A ring dot (`ring`) sits on the card edge: r 4.6, fill #fdf8ef, stroke teal 2.4.
  - The anchor hotspot is 3 circles: a hit circle r+6, a halo that animates (2.8 s, scale .6→2.1, fades), and an anchor dot (#e9fbfa, teal stroke 3.4).
  - Cards fade in staggered 60 ms apart, 1000 ms after a lesson switch (0 with reduced motion). On lesson change the old set leaves within 420 ms.
  - Clicking a card, its hotspot or its tag either selects the part (anchor `part:<id>`) or zooms the camera to the anchor (`pin:<D13>`, `usb`, `mcu`…; zoom ×1.9, 1 s).
  - Hovering any of these makes its leader `is-hot`.
- **Free mode / tags.** When the camera is not at the home view, or a part is selected, or the stage is narrow (rig scale < 0.85), or the schematic is open, or the layout is compact, the cards hide and each anchor gets a small uppercase **tag** chip (13 px, weight 700) placed by a collision-avoiding search over 10 candidate offsets (M:2465-2495).
- **Wire signal chips** (`#signals .sig`, M:3477-3546, C:1415-1460). While running with Current flow on, each jumper wire carries a chip with a coloured left border (the wire colour) and a dot: red #e5533d = high/motor, red #d64a3a = power, navy = GND, orange #f0a53a = analog, grey = low. Texts are e.g. "HIGH", "LOW", "5 V", "GND", "PWM 61%", "3.03 V", "PULSE", "ECHO 2.6 MS", "392 HZ", "I²C DATA", "FAN +", "MOTOR −". The chip is placed at the first of t = .5, .42, .58, .34, .66, .27, .73, .2, .8 along the wire that does not collide.
- **Readout pill** (`.readout`, C:1390). A navy pill in mono 13.5 px with live values near a part, e.g. "620 → 155", "26 cm", "♪ G4", "31.9 °C", "A0 = 412", "step 63 / 2816".
- **Float notes** (`.float-note`). Coloured pills that rise 46 px and fade over 1100 ms, e.g. "♪ Sol" in the key colour, or "Ding!" in #d9a32e.
- **Tooltip** (`#tip`, C:1684). On hover over any part: bold uppercase name and a description. It sits 16 px right of the cursor and flips left near the right edge.
- **Inspector** (`#inspector`, 292 wide). See §4.11.
- **Schematic panel** (`#schematic`). See §4.7.
- **Minimap** (`#minimap`, M:3144-3279). A 176×118 canvas that appears after the view has been away from home for 300 ms, desktop only. It draws a 20-unit grid, part footprints (board #4a5d99, breadboard #efe7d6, car #e3604b, sensor #3a56a0, motor #cfc9bf, lights #2c3242, other #8e8a84), the current view rectangle (teal outline, 12% fill), the target dot and a red north arrow. Click to glide there (420 ms). Drag to pan live. "Minimap: click or drag to move the view."
- **Viewbar** (H:, M:3119-3143). Buttons, each with a `title` (shortcut) and `aria-label`: Turn left "Turn left (Q)", Turn right "Turn right (E)", separator, Zoom out "Zoom out (−)", Zoom in "Zoom in (+)", separator, **compass** "Reset view (R)" (its needle rotates with the camera azimuth; `is-away` when not at home), separator, toggle **Current flow** "Current flow (F)" (aria "Show current flow"), toggle **Schematic** "Schematic (C)" (aria "Show schematic"). The toggles use `aria-pressed` with a teal tint when on.
- **View hint.** A navy pill above the viewbar: "Drag or WASD to pan · Q / E to rotate · Scroll to zoom". It disappears 9 s after load or on the first pointerdown on the stage.
- **Floor credit.** The text "x.com/DilumSanjaya" with an X logo is painted as a texture on the 3D floor (#bba78a, Barlow SC 700 84 px). It is placed in an empty floor spot that avoids parts and UI, fades to 0.8 opacity over 900 ms, and is re-placed after the camera turns more than 45° (S:12472-12523, S:13297-13366). **Do not copy.** Use iynk's own mark or nothing.

### 1.9 Info card (M:2576-2643, C:883-1008)

- Tabs (`role=tab`, arrow keys cycle): **Overview**, **Pinout**, **Example**, **Specifications**. Uppercase 17.5 px. The active tab is navy weight 700 with a 4.5 px navy underline.
- The body is a `--card` panel. Content fades out and in on change (220 ms on a lesson change, 120 ms on a tab change).
  - Overview: `<h2>` heading (uppercase), lede (18.3/23 px, max 372 px wide), and the feature list (a 51×48 icon tile, then text 17.2 px).
  - Pinout: "Pinout" plus a subtitle ("How the Uno’s headers are grouped." for lesson 1, "How this circuit is wired." for the rest), then a table with columns **Pin | Connects to | What it does**. The pin cell has a coloured wire dot and `<code>`.
  - Example: "How the code works" and an ordered list of 4–5 steps.
  - Specifications: "Specifications" and a 2-column grid of rounded cells (uppercase `dt` label 12.5 px over a `dd` value).
- The expand button (top-right, "Expand panel" / "Collapse panel") makes the card tall (`is-expanded`) and covers the code card (`inert`). Escape collapses it.

### 1.10 Code card "Try it yourself" and Serial monitor (M:2644-2828, C:1009-1124, C:2304-2420)

- Header **"Try it yourself"**. Buttons: expand ("Expand code" / "Collapse code"; covers the info card), copy ("Copy code"; becomes a ✓ for 1.6 s), and Run (navy gradient, play icon; `title` "Run sketch (Space)"). While running it becomes red (#d0614c→#b84d3a) with a stop square and `aria-label` "Stop sketch". It pulses `is-busy` while uploading.
- `<pre class="code"><code>`: JetBrains Mono with a line-number gutter (27 px, #aaa59d). Highlighting:
  - `kw` #2a56a3 for `void int long const for if else while return unsigned bool float char byte sizeof Servo` and `HIGH LOW INPUT OUTPUT INPUT_PULLUP LED_BUILTIN A0 true false`.
  - `fn` #c0652d for any identifier followed by `(` except `setup` and `loop`.
  - `num` #2a56a3 for integers. `str` #3f8a4f for "strings". `cm` faint italic for `// comments`.
  - `#include` lines: the directive is kw, the rest is str.
  - Parameters render as **chip buttons** (`.param`, teal text #127a78 on a 10% teal background with a 1.5 px teal underline), `title` "Click to change".
- The current trace line gets `is-running` (3 px teal left bar plus a teal tint). Changed lines flash orange (`is-new`, 1.4 s). Changed chips flash teal (`is-flash`, 0.9 s). Chips belonging to the selected part get a teal outline (`is-marked`).
- **Serial monitor** (`.console`). Slides up over the bottom of the code area whenever the state is not idle. Its head shows a dot, **"Serial monitor"**, the status, and a × button ("Stop sketch").
  - Status texts: **"Uploading"** (orange pulsing dot), **"Running"** (teal dot with a halo), **"Stopped"** (grey dot).
  - Lines are mono 13 px. Only the last 40 lines are kept, and it auto-scrolls.
  - The height is resizable by dragging the grip or the head. Default and minimum are 92 px, maximum is the code area minus 48. Double-clicking the grip resets it. ArrowUp/Down change it by ±16, PageUp/Down by ±64. Stored as `localStorage['console-height']`. Fixed at 92 in the compact layout.
  - "Uploading" clears the old lines.

### 1.11 Lessons strip (M:2829-2980, C:1125-1231, C:2457-2500)

- Heading **"Lessons"**. An `<ol>` of 16 cards: 91 px tall, 9 px radius, 12 px gap. Each card has the 3D thumbnail, the title, a hidden ✓ badge and a chevron ›.
- Widths (`--w`): board 316, blink 249, button 268, knob 254, rgb 248, light 252, sensor 282, sound 262, piano 250, motor 300, heat 268, servo 280, stepper 290, plant 268, force 260, project 286.
- Thumbnail widths (`--tw`): board 124, led 72, button 84, pot 78, rgb 72, lamp 84, sensor 96, buzzer 74, motor 104, servo 96, gears 92, dryer 96, wheel 96, plant 76, piano 96, meter 96.
- Title is uppercase Barlow SC 15.2 px weight 500, centred. Lesson 1 breaks onto two lines ("1. Meet the<br />board"). The active card has a 2 px `--teal-deep` border and a bold title, and is `aria-current=step`. Done cards show a teal ✓ badge at top-right. When a lesson is completed the card plays a `celebrate` bounce (0.7 s, lift −5 px, scale 1.02).
- **Thumbnails are rendered at load time** from the same 3D models (T:233-293): an orthographic camera at each thumb's az/el, the same outline pass, 3× resolution, read back to PNG blobs. Per-thumb az/el/pad/shadow are listed at T:1-205. They are not shipped images.
- Scrolling: native horizontal overflow, mouse drag-scroll (5 px threshold; a drag suppresses the click), and the vertical wheel mapped to horizontal. Round ‹ › buttons ("Earlier lessons" / "More lessons") appear when there is more content to that side (`can-left`/`can-right`) and step by 70% of the width. The active card is kept visible with a 40 px margin. RTL-aware.

### 1.12 Footer

On desktop the credit lives in the sidebar. The `.app-foot` row ("Designed by x.com/DilumSanjaya") shows only in the compact layout.

### 1.13 Phone / compact layout (C:3092-3500; `11-phone-top.png`, `13-…`, `14-…`)

`html.compact` (§1.3) turns the artboard into a scrolling CSS grid. Padding is 14 px 12 px, with 78 px plus the safe area at the bottom. Areas:

```
"brand  status"
"stage  stage"
"lessons lessons"
"info   info"
"code   code"
"foot   foot"
```

- The brand shrinks: logo 58×32, H1 22 px.
- The status is a 200×52 progress card plus a 13 px clock.
- The stage is a bordered rounded card, height `clamp(300px, 58vh, 660px)`. Callout cards, minimap and hint are hidden; only tags show. The viewbar is centred.
- **Inspector docks to the bottom of the stage**: width min(420, 100% − 20), max-height 56%, slide-up animation. The camera pans so the selected part stays visible.
- Lesson cards are scaled ×0.8 (74 px tall). The info card and code card are full width. Tabs scroll horizontally. The code area auto-sizes up to 440 px tall at 14.5 px. The console is fixed at 92 px and the code area gets bottom padding while running.
- The **sidebar becomes a fixed bottom nav** (62 px + safe area) with the 6 icons spread out. The active item gets a 3 px bar. Flyouts become bottom sheets (left/right 10, bottom 72 + safe area, max-height min(70vh, 560)).
- Width ≤ 600: a single column (brand, status, stage, lessons, info, code, foot).
- Landscape with height ≤ 600: a two-column grid with the stage sticky on the left (`100dvh − 16`) and the panels on the right. The nav turns back into a left rail.

---

## 2. Board explorer (Lesson 1, "Meet the board")

Lesson 1 is the explorer. It shows the bare Uno (no breadboard), the 6 callouts, hover and click on all 27 board parts, and the pinout and spec tabs. Screens: `01-main-desktop.png`, `03-…`, `04-…`, `04b-…`, `05-…`.

### 2.1 Callout cards (M:147-220)

| Title | Body (verbatim; `/` = `<br />`) | Anchor | Icon |
|---|---|---|---|
| USB Port | Connects to your computer / for programming and power. | `usb` | usb (tall) |
| Microcontroller | ATmega328P runs / your code. | `mcu` (via `mcuWay`) | chip |
| Digital Pins | Pins 0–13 for digital / input/output. / (~ PWM on some pins) | `digital` (leader approaches from above) | pins |
| Power Jack | External DC power / (7–12V recommended). | `jack` | bolt |
| Power Pins | 5V, 3.3V, GND and / VIN for power. | `power` | plug |
| Analog Pins | A0–A5 for reading / analog signals. | `analog` | wave (wide) |

### 2.2 Hover / click parts on the Uno (K:8698-8727; live capture)

Every board part is hoverable, which lifts it 1.6 units over 220 ms and shows the tooltip. Clicking selects it: a teal ring appears on the floor and the inspector opens with name, description and "Zoom to it". The bare PCB ("Arduino Uno R3 / Hover the parts to learn what they do.") has `lift: false`, so clicking it deselects.

| Name (tooltip title) | Description (verbatim) |
|---|---|
| USB-B port | Uploads sketches and powers the board from your computer. |
| DC power jack | Run the board from a 7–12 V adapter or battery. |
| Reset button | Restarts your sketch from the top. |
| ATmega328P | The 8-bit microcontroller that runs your code at 16 MHz. |
| ICSP header | Programs the ATmega328P directly, without the bootloader. |
| ICSP header (USB chip) | Programs the ATmega16U2 USB interface. |
| 47 µF capacitor | Smooths the supply voltage. (×2) |
| 16 MHz crystal | Keeps time for the USB interface chip. |
| ATmega16U2 | Turns USB into serial so your computer can talk to the board. |
| Resettable fuse | Protects your USB port from short circuits. |
| 5 V regulator | Steps the jack voltage down to a steady 5 V. |
| LMV358 op-amp | Switches between USB and jack power automatically. |
| Protection diode | Blocks reverse voltage from the power jack. |
| Transistor | A tiny switch used by the power circuitry. (3× SOT-23) |
| 16 MHz resonator | Clocks the ATmega328P. |
| Ferrite bead | Filters noise on the USB supply. |
| “L” LED | Wired to pin 13 — blinks with LED_BUILTIN. |
| TX LED | Flickers when the board sends serial data. |
| RX LED | Flickers when the board receives serial data. |
| Power LED | Lit whenever the board has power. |
| Resistor | A surface-mount resistor. (0603, many) |
| Capacitor | A surface-mount decoupling capacitor. (0603, many) |
| Resistor network | Four resistors in one package. |
| Digital pins 8–13 | Plus GND, AREF and the I²C pins SDA/SCL. |
| Digital pins 0–7 | Pins 0 and 1 double as serial RX/TX. |
| Power pins | 5 V, 3.3 V, GND and VIN for your circuits. |
| Analog pins A0–A5 | Read voltages between 0 and 5 V. |
| Arduino Uno R3 | Hover the parts to learn what they do. |

Components flyout for lesson 1 ("9 in view"): ATmega328P, USB-B port, DC power jack, Reset button, Digital pins 8–13, Power pins, Analog pins A0–A5, ATmega16U2, 16 MHz crystal.

### 2.3 Tabs for lesson 1

- **Overview**: heading "Arduino Uno". The lede says the Uno is a popular ATmega328P board that is easy to use and good for learning electronics, programming and prototyping. Features: [chip] "Open-source hardware", [bulb] "Wide community support", [gear] "Used in education, hobby projects, and real-world applications".
- **Pinout** ("How the Uno’s headers are grouped."):

| Pin | Connects to | What it does | dot |
|---|---|---|---|
| D0–D13 | Digital I/O | Read buttons, drive LEDs. ~3, 5, 6, 9, 10, 11 do PWM. | #2a56a3 |
| A0–A5 | Analog in | 10-bit readings, 0–1023 for 0–5 V. | #1aa3a1 |
| 5V · 3.3V | Power out | Regulated supply for sensors and modules. | #d64a3a |
| GND | Ground | Every circuit returns here. | #2f3547 |
| VIN | Power in | Raw jack voltage, 7–12 V. | #c0652d |
| RESET | Reset | Pull LOW to restart the sketch. | #8e9094 |

- **Example** (summary): `setup()` runs once at power-up or reset. `pinMode(LED_BUILTIN, OUTPUT)` makes pin 13, the on-board "L" LED, an output. `loop()` repeats forever and `digitalWrite(…, HIGH)` puts 5 V on the pin. The text then tells you to press **Run**, watch TX/RX flicker and the L LED come on, and click any part.
- **Specifications** (the spec table, M:14): Microcontroller **ATmega328P** · Operating voltage **5 V** · Input voltage **7–12 V** · Digital I/O pins **14 (6 PWM)** · Analog inputs **6** · Flash memory **32 KB** · SRAM / EEPROM **2 KB / 1 KB** · Clock speed **16 MHz** · Size **68.6 × 53.4 mm**.

### 2.4 Code and run (M:139-146, S:11711-11725)

```cpp
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
}
```
No parameters. Run: the upload sequence (§4.4) with TX/RX flicker, then the serial monitor shows `pinMode(13, OUTPUT)` and `D13 → HIGH`. The L LED turns on and stays on. Trace: `pinMode(LED_BUILTIN` for 600 ms once, then a loop of `digitalWrite(LED_BUILTIN, HIGH)` for 260 ms and `delay(1000)` for 740 ms. Schematic: ARDUINO D13 → 1 kΩ → LED "L" → ground, with the note "The LED marked L, on the board itself".

### 2.5 Uno model geometry (for builders; K:8305-8761)

- The PCB is 68.58 × 53.34 × 1.6 mm. Outline polygon `[[0,0],[66.04,0],[68.58,2.54],[68.58,37.85],[66.04,40.39],[66.04,51.82],[64.52,53.34],[0,53.34]]`. Mounting holes at (13.97,2.54), (15.24,50.8), (66.04,7.62), (66.04,35.56).
- Headers: digitalA (10 pins at x 30.23, y 50.8), digitalB (8 at 54.61, 50.8), power (8 at 36.83, 2.54), analog (6 at 57.15, 2.54).
- Pin x positions (mm). Top header: SCL 18.8, SDA 21.34, AREF 23.88, GND 26.42, D13 28.96, D12 31.5, D11 34.04, D10 36.58, D9 39.12, D8 41.66, D7 45.72, D6 48.26, D5 50.8, D4 53.34, D3 55.88, D2 58.42, D1 60.96, D0 63.5. Bottom header: IOREF 30.48, RESET 33.02, 3V3 35.56, 5V 38.1, GND1 40.64, GND2 43.18, VIN 45.72. A0–A5 at 50.8 + n·2.54. A pin's 3D anchor is `[x − 34.29, 8.5, 26.67 − y]` (K:8757).
- Silk: the digital header reads SCL SDA AREF GND 13 12 ~11 ~10 ~9 8 7 ~6 ~5 4 ~3 2 TX→1 RX←0. The power header reads (blank) IOREF RESET 3.3V 5V GND GND VIN. Also "DIGITAL (PWM~)", "POWER", "ANALOG IN", "ARDUINO", "UNO", "MADE IN ITALY", RESET, ICSP×2, L/TX/RX/ON, AREF, C4, R2, C7, Y1, U3, F1, X1, D1, "+".
- Components with positions: USB-B (1.8,38.1), jack (5.3,7.85), reset (6.9,49), DIP-28 ATmega328P (47,19), 2×3 ICSP (64.9,29.6), 3×2 ICSP2 (20.2,45.4), 2× 47 µF ecap, crystal (17.4,30.4), QFN 16U2 (22.6,37.4, rot 45°), polyfuse, SOT-223 regulator, SOIC-8 op-amp, SMA diode, 3× SOT-23, resonator (41.2,26.4), ferrite, amber LEDs L/TX/RX (27.3, 40.2/36.9/35), green ON LED (58.6,28), and dozens of 0603 R/C parts.
- In this original the board is **royal blue**, not mint (minimap footprint colour #4a5d99; see the screenshots). It has black female headers, a black DIP-28, a silver USB-B and a black barrel jack. `.audit/presentable.tsv` already names this silhouette as what makes a stranger recognise the board.

---

## 3. The 16 lessons

Common pattern for every lesson: `id`, `title` (sidebar and flyout), `cardTitle` (strip), `heading` (Overview `<h2>`), `lede`, three or four `features` with icon keys, a `pinout` table, four or five `example` steps, five `specs`, `params` (inspector controls), the `code` template, `callouts` and `sim`.
**Completion rule (all lessons): a lesson is marked done the first time its Run finishes uploading** (compile 600 ms + upload 600 ms, then the sim starts) while it is still the current lesson (M:4426-4434). There are no quizzes, no challenge goals, no checks of what the user did, and no hints beyond the tab text, the inspector notes and the interaction hints. "Try it yourself" is only the code card's title.

Breadboard notation: the default board is a **half-size breadboard with 23 columns (1–23) and rows a–e / f–j**, labelled at column 1 and every multiple of 5, with no power rails (K:9547-9654). Hole pitch 2.54 mm. Row z positions: a 13.97, b 11.43, c 8.89, d 6.35, e 3.81, f −3.81 … j −13.97. `col.5` means a part centred between two columns. A resistor spans 4 holes (centre ±2). An LED's legs sit at centre ±0.5. "GND" = top-header GND by D13. "GND1"/"GND2" = power-header GNDs.
The wire colour palette is `Q` (S:10707): red #d64a3a, navy #2f3547, orange #f0a53a, yellow #f0b53a, green #3fae6a, blue #3d6fc4, coral #ee7f62, purple #8a63c9, brown #7a5034.
Inspector interaction hints (M:3282-3288): slide → "or drag it in the scene", knob → "or drag around the knob", press → "Hold it down in the scene", squeeze → "Press it in the scene, then drag down to push harder", tap → "or click a weight in the scene". Parts with params but no 3D interaction show a **"Run to see it"** button instead (it runs the sketch). Every inspector has **"Zoom to it"**.

Throughout: "Serial" = what the serial monitor prints. Lines marked *(synthetic)* are not printed by the sketch. The sim writes them as an activity log.

---

### 3.1 Lesson 1, Meet the board
See §2. id `board`, thumb `board`, sim `builtin`.

---

### 3.2 Lesson 2, Blink an LED (M:222-348; S:10900-10911; S:11726-11747)

- Card "2. Blink an LED". Heading "Blink an LED". Thumb: red LED.
- Lede (summary): first circuit, an LED and a resistor on a breadboard driven by pin 13. Switching the pin on and off with pauses makes it blink.
- Features: [pin] "Digital output with `digitalWrite()`" · [resistor] "Click the resistor to try other values" · [clock] "Click the LED to change its colour and timing".
- Pinout: `D13` | Resistor → LED (+) | The sketch switches this pin HIGH and LOW. (#f0a53a) · `GND` | LED (−) | The short leg returns current to the board. (#2f3547)
- Wiring: wire D13 (orange) → **a10**. 220 Ω resistor **b10–b14**. LED **c14 (anode) / c15 (cathode)**. Wire GND (navy) → **a15**.
- Specs: LED **5 mm, 1.8–3.2 V forward** · Max current **20 mA** · Resistor **220 Ω (red-red-brown)** · LED current **≈ (5 − 2) ÷ 220 ≈ 14 mA** · Pin 13 limit **40 mA absolute max**.
- Example (summary): a named constant `LED_PIN = 13`. `pinMode` makes it an output. The loop writes HIGH, waits, writes LOW, waits; the two delays set the rhythm. A bigger resistor dims the LED (try 10 kΩ).
- Params (inspector):
  - **LED** part: "Colour" swatches Red #e8392e / Yellow #f2c23a / Green #3fbf6a / Blue #3d7be0 / White #f2efe6 (default red; the label shows the colour name). "On for" range 50–2000 step 50, default 500 ms. "Off for" range 50–2000 step 50, default 500 ms.
  - **Resistor** part: "Resistance" segmented 220 Ω "About 14 mA: bright and safe." / 1 kΩ "About 3 mA: noticeably dimmer." / 10 kΩ "About 0.3 mA: barely glowing." Changing it swaps the 3D resistor (new colour bands; the old one drops out and the new one drops in) and relabels the schematic.
- Code (chips: both `delay(...)` values):
```cpp
const int LED_PIN = 13;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  delay(500);
}
```
- 3D sim: `phase = elapsed mod (on+off)`. Lit while `phase < on`. LED brightness `b = min(1, (I/13.6)^0.55)` where `I(mA) = (5 − Vf)/R·1000` and Vf is red 2.0, yellow 2.1, green 2.2, blue 3.0, white 3.1 (S:11636-11639, K:10247). So red/220 Ω gives 13.6 mA and b = 1, 1 kΩ gives 3 mA and b ≈ 0.44, 10 kΩ gives 0.3 mA and b ≈ 0.12. The lens emissive is `0.05 + b·1.4` and the glow sprite opacity is `0.85·b`. The on-board **L LED mirrors D13**.
- Serial *(synthetic)*: `D13 → HIGH` / `D13 → LOW` on every change.
- Trace: on each change, `digitalWrite(LED_PIN, HIGH|LOW)` for min(170, 0.4·phase) ms, then the matching `delay(` line.
- Wire chips: D13 wire "HIGH"/"LOW", GND "GND".
- Callouts: LED "Lights up whenever pin 13 goes HIGH." · Pin 13 "Your sketch switches it HIGH and LOW." · GND "The short leg (−) returns current here." · Resistor "Stops the LED drawing too much current." · Built-in LED "The “L” LED mirrors pin 13 on the board."
- Schematic: D13 → R (label follows ohms) → LED (colour follows the param) → ground.

---

### 3.3 Lesson 3, Push a button (M:348-455; S:10912-10946; S:11748-11771)

- Card "3. Push a button". Heading "Push a button". Thumb: red tactile button.
- Lede (summary): inputs let the board sense the world. The button ties pin 2 to 5 V while held, and a pull-down keeps it at 0 V when released.
- Features: [button] "Click and hold the button in the scene" · [pin] "Read a pin with `digitalRead()`" · [logic] "Switch between “hold” and “toggle” logic".
- Pinout: `5V` | Button (left) | One side of the switch. · `D2` | Button (right) + 10 kΩ | Reads HIGH while the button is held. · `GND` | 10 kΩ pull-down | Pulls D2 LOW when the button is up. · `D13` | 220 Ω → LED | The output you control.
- Wiring: button straddles the trench, legs **cols 8 and 10, rows e/f**. 5V (red) → **a8**. D2 (blue) → **a10**. 10 kΩ **b10–b14**. GND (navy) → **a14**. D13 (orange) → **a15**. 220 Ω **b15–b19**. LED **c19/c20**. Flat navy bridge **e14 → e20** (ground to the LED cathode).
- Specs: Button **12 mm tactile switch** · Pull-down **10 kΩ to GND** · Logic levels **LOW < 1.5 V, HIGH > 3 V** · Bounce **Contacts chatter for ~5 ms** · Tip **`INPUT_PULLUP` needs no resistor**.
- Example (summary): `INPUT` makes pin 2 listen. `digitalRead` is HIGH while held. In hold mode the LED copies the button. In toggle mode the sketch remembers the last reading and flips on each new press.
- Params: **Push button** "Logic" segmented Hold "The LED is on only while you hold the button." / Toggle "Each press flips the LED on or off." (default Hold; it changes code blocks). **LED** "Colour" swatches (as in lesson 2). Interaction: **press and hold** the button cap in 3D (`press`, input `button`); the cap moves down 1.3 over 90 ms.
- Code, Hold (default):
```cpp
const int BUTTON = 2;
const int LED = 13;

void setup() {
  pinMode(BUTTON, INPUT);
  pinMode(LED, OUTPUT);
}

void loop() {
  int pressed = digitalRead(BUTTON);
  digitalWrite(LED, pressed);
}
```
- Code, Toggle (adds globals and replaces the loop body):
```cpp
const int BUTTON = 2;
const int LED = 13;

int last = LOW;
bool lit = false;

void setup() {
  pinMode(BUTTON, INPUT);
  pinMode(LED, OUTPUT);
}

void loop() {
  int now = digitalRead(BUTTON);
  if (now == HIGH && last == LOW) {
    lit = !lit;
    digitalWrite(LED, lit);
    delay(30);  // debounce
  }
  last = now;
}
```
- Sim: D2 = pressed. Hold: LED = pressed. Toggle: flip on the rising edge, and the trace plays `lit = !lit` → `digitalWrite(LED, lit)` → `delay(30)` (220 ms each). LED brightness uses ls(220, colour). The L LED mirrors D13.
- Serial *(synthetic)*: `D2 → LOW` / `D2 → HIGH (pressed)` on change.
- Callouts: Push Button "Click and hold it — pin 2 reads HIGH." · Pull-down "10 kΩ keeps pin 2 LOW when released." · LED "Your sketch decides when it lights." · Pin 2 (input) "`digitalRead()` sees HIGH or LOW."
- Schematic: D2 node with button to 5V above and 10 kΩ to ground below (the wire follows D2). D13 → 220 Ω → LED → ground.

---

### 3.4 Lesson 4, Turn a knob (M:455-542; S:10947-10983; S:11772-11792)

- Card "4. Turn a knob". Heading "Turn a knob". Thumb: blue-base pot with a black knob.
- Lede (summary): a potentiometer is a resistor with a slider. Turning it moves the middle leg from 0 to 5 V, and the analog pin turns that into a number.
- Features: [knob] "Drag around the knob to turn it" · [wave] "`analogRead()` gives 0–1023" · [pwm] "`analogWrite()` dims the LED, 0–255".
- Pinout: `5V` | Pot (left) | Top of the voltage divider. · `A0` | Pot (middle) | The wiper: 0–5 V as you turn. · `GND` | Pot (right) | Bottom of the divider. · `~D9` | 220 Ω → LED | PWM output sets the brightness.
- Wiring: pot legs **e9, e10, e11**. 5V (red) → **a9**. A0 (green) → **a10**. GND1 (navy) → **a11**. D9 (orange) → **a15**. 220 Ω **b15–b19**. LED **c19/c20**. Bridge **b11 → e20**.
- Specs: Potentiometer **10 kΩ linear, 270° travel** · ADC **10-bit, 0–1023** · Resolution **≈ 4.9 mV per step** · PWM **8-bit, 0–255 at ~490 Hz** · Read time **≈ 100 µs per `analogRead()`**.
- Example (summary): `analogRead` maps 0 V→0 and 5 V→1023. Divide by 4 to fit PWM 0–255. `analogWrite` pulses pin 9 fast enough to look dimmed. Run opens the serial monitor.
- Params: **Pot** "Knob position" range 0–1023 step 1, default 620. **LED** "Colour". Interaction: **drag around the knob** (angle delta × 1023/270° → value; the knob rotates `−(pot/1023·270 − 135)°`).
- Code (no chips):
```cpp
const int POT = A0;
const int LED = 9;

void setup() {
  Serial.begin(9600);
  pinMode(LED, OUTPUT);
}

void loop() {
  int value = analogRead(POT);  // 0-1023
  analogWrite(LED, value / 4);  // 0-255
  Serial.println(value);
  delay(50);
}
```
- Sim: `n = round(pot)`, `pwm = floor(n/4)`. The A0 chip shows `(n/1023·5).toFixed(2) V`. The D9 chip shows "PWM xx%". LED brightness is `pwm/255·ls(220,colour)`. Readout above the pot `"{n} → {pwm}"` (e.g. "620 → 155").
- Serial (real `Serial.println(value)`): `620`, **throttled to one line per 300 ms** (the sketch would print every 50 ms).
- Trace loop: `analogRead(POT)` → `analogWrite(LED` → `Serial.println(value)` → `delay(50)` (170 ms each).
- Callouts: Potentiometer "Drag around the knob to turn it." · Pin A0 "Reads the knob as a number, 0–1023." · LED "Brightness follows the knob." · Pin ~9 (PWM) "Dims the LED with fast pulses."

---

### 3.5 Lesson 5, Mix colours (M:542-667; S:10984-11013; S:11793-11816)

- Card "5. Mix colours". Heading "Mix colours". Thumb: purple RGB LED.
- Lede (summary): an RGB LED is three LEDs under one milky lens. PWM on each blends colours.
- Features: [pwm] "One PWM pin per colour, 0–255 each" · [bulb] "Light mixes: red + green makes yellow" · [led] "Click the LED to mix your own colour".
- Pinout: `~D9` | 220 Ω → Red leg | Brightness of the red LED. (#ee7f62) · `~D10` | 220 Ω → Green leg | … green LED. · `~D11` | 220 Ω → Blue leg | … blue LED. · `GND` | Common (longest leg) | All three LEDs return here.
- Wiring: RGB legs **d15 R, d16 common, d17 G, d18 B**. Red 220 Ω **b11–b15**. Green 220 Ω **b17–b21**. Blue 220 Ω **c18–c22** (raised to cross over). D9 (coral) → **a11**. D10 (green) → **a21**. D11 (blue) → **a22**. GND (navy) → **a16**.
- Specs: LED **5 mm RGB, common cathode** · Forward voltage **R 2.0 V · G 3.0 V · B 3.0 V** · Resistors **3 × 220 Ω** · Colours **256³ ≈ 16.7 million** · PWM pins used **~9, ~10, ~11**.
- Params (all on the RGB LED): "Presets" swatches Purple (170,0,255) #a43cf0 · Pink (255,30,110) #f2457f · Orange (255,90,0) #f57a1f · Yellow (255,190,0) #f5c330 · Teal (0,200,150) #1fbf98 · White (255,255,255) #f4f0e8. "Red", "Green", "Blue" ranges 0–255 step 1, defaults 170 / 0 / 255, with tinted tracks. **Constraint** (M:595-598): picking a preset sets r,g,b; moving a slider re-detects the preset or shows "Custom".
- Code (chips: the three values):
```cpp
const int RED = 9;
const int GREEN = 10;
const int BLUE = 11;

void setup() {
  pinMode(RED, OUTPUT);
  pinMode(GREEN, OUTPUT);
  pinMode(BLUE, OUTPUT);
}

void loop() {
  analogWrite(RED, 170);
  analogWrite(GREEN, 0);
  analogWrite(BLUE, 255);
  delay(100);
}
```
- Sim: glow intensity is `max(r,g,b)/255`. The colour is (r,g,b)/max. The lens tint lerps toward that hue. Readout "R 170 · G 0 · B 255".
- Serial *(synthetic)* on change: `analogWrite(9, 170)  analogWrite(10, 0)  analogWrite(11, 255)` (two spaces between calls).
- Callouts: RGB LED "Three colours in one lens — click it to mix." · Pins ~9 ~10 ~11 "One PWM pin for each colour." · GND "The longest leg is the shared ground." · 3 Resistors "220 Ω on each colour keeps the current safe."

---

### 3.6 Lesson 6, Sense light (M:667-774; S:11014-11057; S:11817-11844)

- Card "6. Sense light". Heading "Sense light". Thumb: red desk lamp.
- Lede (summary): an LDR conducts better in light. With a fixed resistor it makes a voltage, used for a night light that switches on in the dark.
- Features: [wave] "Read brightness with `analogRead()`" · [lamp] "Drag the lamp away, or switch it off" · [logic] "Switch the LED on below a threshold".
- Pinout: `5V` | LDR (left leg) | Top of the voltage divider. · `A0` | LDR + 10 kΩ | The middle of the divider: higher when brighter. · `GND` | 10 kΩ | Bottom of the divider. · `~D9` | 220 Ω → LED | The night light. · `GND` | LED (−) | The LED’s return path.
- Wiring: D9 (orange) → **a8**. 220 Ω **b8–b12**. Yellow LED **c12/c13**. GND (navy) → **a13**. 5V (red) → **a20**. LDR **c20/c21**. A0 (green) → **a21**. 10 kΩ **b17–b21**. GND1 (navy) → **a17**. A desk lamp stands on the table aimed at the LDR.
- Specs: LDR **GL5528 photoresistor** · In daylight **≈ 10–20 kΩ** · In the dark **≈ 1 MΩ** · Divider resistor **10 kΩ to GND** · Response time **≈ 20–30 ms**.
- Params: **Lamp** "Lamp distance" range 5–50 step 1, default 18 cm. "Lamp switched on" toggle, default on. Interaction: **drag the lamp** along its 36° axis (`slide`). **LDR** "Dark below" range 50–1000 step 10, default 400.
- Code (chip: `400`):
```cpp
const int SENSOR = A0;
const int LED = 9;

void setup() {
  Serial.begin(9600);
  pinMode(LED, OUTPUT);
}

void loop() {
  int light = analogRead(SENSOR);  // more light = higher
  Serial.println(light);

  if (light < 400) {
    digitalWrite(LED, HIGH);  // dark: night light on
  } else {
    digitalWrite(LED, LOW);
  }
  delay(100);
}
```
- Sim model (S:10781-10783): `reading = lamp ? round(70 + 930 / (1 + (dist/14)²)) : 70`, plus uniform noise ±6 re-sampled every 100 ms, clamped 0–1023. That gives 18 cm ≈ 421, 5 cm ≈ 895, 50 cm ≈ 138, lamp off ≈ 70. Dark when `reading < threshold`, which lights the yellow LED at ls(220, yellow). The lamp's light cone and floor pool scale with `(reading − 70)/930`. Readout "light {v}", plus " · dark" when dark.
- Serial: the reading (real `Serial.println`) **throttled to 320 ms**, plus on each state change *(synthetic)* `{v} < {limit} · dark, night light ON` or `{v} ≥ {limit} · bright, night light off`.
- Callouts: Night Light "Comes on when the reading says “dark”." · Light Sensor "Less resistance the more light it gets." · Pin A0 "Reads the divider as 0–1023." · Desk Lamp "Drag it away, or switch it off."

---

### 3.7 Lesson 7, Read a sensor (HC-SR04) (M:774-866; S:11058-11072; S:11845-11899)

- Card "7. Read a sensor". Heading "Read a sensor". Thumb: HC-SR04.
- Lede (summary): the HC-SR04 sends ultrasound and times the echo. Click the obstacle to swap it, or drag it closer.
- Features: [wave] "Trigger a ping, time the echo with `pulseIn()`" · [ruler] "Every 58 µs of echo is about 1 cm" · [car] "Swap the obstacle: some echo better than others".
- Pinout: `5V` | VCC | Powers the sensor. · `GND` | Gnd | Common ground. · `D9` | Trig | A 10 µs HIGH pulse starts a ping. (#f0b53a) · `D10` | Echo | Stays HIGH for as long as the sound travels.
- Wiring: the sensor stands on the breadboard edge facing out, pins **cols 10–13 = VCC, Trig, Echo, Gnd**. Wires from row e: 5V (red) → **e10**, D9 (yellow) → **e11**, D10 (green) → **e12**, GND1 (navy) → **e13**.
- Specs: Range **2–400 cm** · Resolution **≈ 3 mm** · Frequency **40 kHz** · Beam angle **≈ 15°** · Supply **5 V, 15 mA**.
- Params: **Obstacle** "Obstacle" segmented Car / Box / Ball / Wall (default Car). "Distance" range 5–50 step 1, default 30 cm. "Drive back and forth while running" toggle, default on. **Sensor** "Read every" range 50–1000 step 50, default 100 ms. Interaction: drag the obstacle (`slide`; the first drag turns the sweep off).
  - Obstacle part names and descriptions (K:10071-10146): Toy car "Its flat bumper sends back a clear echo." (jitter ±0.4 cm, miss 0) · Cardboard box "Flat and hard: a strong, steady echo." (±0.2, 0) · Beach ball "Round surfaces scatter the sound, so readings wobble." (±2.6, **8% no echo**) · Brick wall "A big flat surface: the cleanest echo of all." (0, 0). The car's wheels turn as it moves.
- Code (chip: `100`):
```cpp
const int TRIG = 9;
const int ECHO = 10;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
}

void loop() {
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  long cm = pulseIn(ECHO, HIGH) / 58;
  Serial.println(cm);
  delay(100);
}
```
- Sim:
  - Sweep: `gap = 26 + 20·sin((t − t0)·0.00055 − 0.4)`, so 6–46 cm with a period of about 11.4 s. It writes back into the param through `setParam('gap')` and the code and inspector follow.
  - Every `interval` ms: `cm = random() < miss ? 0 : max(2, round(gap ± jitter))`.
  - Pin chips: D9 "PULSE" for 70 ms after each ping. D10 "ECHO {cm·58/1000 toFixed(1)} ms" (or "NO ECHO"), HIGH from 70 to `70 + min(260, gap·6)` ms (slowed-down visual, not real µs).
  - The ultrasonic arcs are teal outgoing rings every 220 ms, which return as orange arcs. A dashed teal tape measure runs on the floor. Readout "{cm} cm" or "no echo" midway.
- Serial (real): `{cm} cm` or `0  (no echo)`, once per reading. Note the sketch prints only the number and the sim appends " cm".
- Callouts: HC-SR04 "Pings at 40 kHz and times the echo." · Trig · Echo "Pin 9 fires the ping, pin 10 hears the echo." · 5V · GND "Power for the sensor, straight from the board." · Obstacle "Click to swap it, drag to move it."

---

### 3.8 Lesson 8, Make a sound (M:866-989; S:11073-11083; S:11900-11933)

- Card "8. Make a sound". Heading "Make a sound". Thumb: black buzzer.
- Lede (summary): a piezo clicks each time its pin flips. Flipping hundreds of times a second makes a note; `tone()` does that.
- Features: [speaker] "Play notes with `tone(pin, Hz, ms)`" · [console] "Store a tune in an array" · [clock] "Click the buzzer to pick a tune and tempo".
- Pinout: `D8` | Buzzer (+) | Toggled at the note’s frequency. · `GND` | Buzzer (−) | Return path.
- Wiring: buzzer legs **e11 (+) / e14 (−)**. D8 (orange) → **a11**. GND (navy) → **a14**.
- Specs: Buzzer **Passive piezo, 12 mm** · Range **≈ 100 Hz – 10 kHz** · Middle C **262 Hz** · A above **440 Hz** · Tip **An active buzzer only beeps at one pitch**.
- Params (buzzer): "Tune" segmented Scale "C major, one octave." / Twinkle "Twinkle, twinkle, little star." (default) / Ode to Joy "Beethoven’s Ninth, first phrase.". "Note length" range 80–500 step 10, default 220 ms. "Speaker volume" range 0–100 step 5, default 40%.
- Melodies (Hz; M:111-115): scale `262 294 330 349 392 440 494 523` · twinkle `262 262 392 392 440 440 392 349 349 330 330 294 294 262` · ode `330 330 349 392 392 349 330 294 262 262 294 330 330 294 294`. They are formatted into the code 4 / 7 / 5 per line.
- Code (default Twinkle; chips: both `220`):
```cpp
const int BUZZER = 8;
int melody[] = {
  262, 262, 392, 392, 440, 440, 392,
  349, 349, 330, 330, 294, 294, 262
};
const int N = sizeof(melody) / sizeof(int);

void setup() {}

void loop() {
  for (int i = 0; i < N; i++) {
    tone(BUZZER, melody[i], 220);
    delay(220 + 50);
  }
  delay(1000);
}
```
  Scale variant array: `262, 294, 330, 349,` / `392, 440, 494, 523`. Ode variant: `330, 330, 349, 392, 392,` / `349, 330, 294, 262, 262,` / `294, 330, 330, 294, 294`.
- Sim: each note sounds for `note` ms, the next note starts `note + 50` ms later, and there is a 1000 ms rest after the last. WebAudio square wave at gain 0.06·volume (§4.10), only if Settings → Sound is on. A teal ring pulses from the buzzer top on each note. Readout "♪ {name}". The D8 chip shows "{hz} Hz" while sounding, else "LOW". Note name: `n = round(12·log2(hz/440)) + 57` → `C C# D D# E F F# G G# A A# B[n mod 12]` + `floor(n/12)` (262 → C4).
- Serial *(synthetic)*: `tone(8, 262, 220)  C4` (two spaces before the name) for each note.
- Callouts: Piezo Buzzer "Click it to pick a tune and tempo." · Pin 8 "`tone()` toggles it at the note’s pitch." · GND "The buzzer’s other leg." · Timer (anchor mcu) "A hardware timer keeps each note in tune."

---

### 3.9 Lesson 9, Mini piano (M:989-1143; S:10821-10879; S:11934-12020)

- Card "9. Mini piano". Heading "Build a mini piano". Thumb: five coloured key caps in a row (red, yellow, green, blue, purple).
- Lede (summary): eight keys and a buzzer. Each key shorts its pin to ground, so the Uno's internal pull-ups replace resistors, and `tone()` plays the held key.
- Features: [piano] "Eight keys, one note each, Do to Do" · [pin] "`INPUT_PULLUP`: no resistors needed" · [note] "Press the keys, or let it play a tune".
- Pinout: `D2–D9` | Keys, Do to high Do | Pulled up inside the Uno: LOW while the key is down. · `D10` | Buzzer (+) | `tone()` plays the note here. (#7a5034) · `GND` | Back − rail | The other leg of every key, and the buzzer’s (−).
- Wiring: the **full-size breadboard (30 columns with + and − rails)**, rotated 90°. Keys key0…key7 straddle the trench at columns **29, 26, 23, 20, 17, 14, 11, 8** (legs at ±1 column). Wire D(2+i) in the key's colour → row a at col+1. A flat navy wire from row a at col−1 goes to the − rail. Buzzer legs **d2 / d5**. D10 (brown) → **a2**. Flat wire a5 → − rail. GND (navy) → − rail. Key colours: #e8392e, #f08a2e, #f2c23a, #3fae6a, #1aa3a1, #3d6fc4, #8a63c9, #e36fa5. Key names: "Key 1: Do (C)" … "Key 7: Si (B)", "Key 8: Do (high C)". Key description "Run the sketch, then press and hold it to play its note.". The breadboard description here mentions the rails.
- Specs: Keys **8 tactile switches, 6 mm** · Notes **C4–C5 (or C5–C6)** · Pull-ups **Built in, about 20–50 kΩ** · Buzzer **Passive piezo on D10** · Breadboard **Full size, with power rails**.
- Params (buzzer):
  - "Play by itself" segmented No, I play "Press and hold the keys in the scene." (default) / Scale "Up the keys and back down." / Twinkle "Twinkle, twinkle, little star." / Ode to Joy "Beethoven, on eight keys.".
  - "Octave" C4–C5 (default) / C5–C6 "Every frequency doubled.".
  - "Note names" Do Re Mi (default) / C D E.
  - Keys: **press and hold** (`press`, `select: false`, so pressing never opens the inspector).
- Auto-play tunes (key index, beats; 1 beat = 330 ms, key released at 80% of the duration, 1400 ms pause at the end, first note 400 ms after choosing; M:116-120): scale `0,1,2,3,4,5,6,7(2),6,5,4,3,2,1,0(2)` · twinkle `0,0,4,4,5,5,4(2),3,3,2,2,1,1,0(2)` · ode `2,2,3,4,4,3,2,1,0,0,1,2,2(1.5),1(.5),1(2)`.
- Code (default; no chips):
```cpp
const int BUZZER = 10;
const int KEYS[] = {2, 3, 4, 5, 6, 7, 8, 9};
const int NOTES[] = {262, 294, 330, 349, 392, 440, 494, 523};  // C4 to C5
const char* NAMES[] = {"Do", "Re", "Mi", "Fa", "Sol", "La", "Si", "Do"};
int playing = -1;  // the key sounding now, or -1

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < 8; i++) {
    pinMode(KEYS[i], INPUT_PULLUP);  // HIGH until pressed
  }
}

void loop() {
  int pressed = -1;
  for (int i = 0; i < 8; i++) {
    if (digitalRead(KEYS[i]) == LOW) pressed = i;  // LOW: key down
  }
  if (pressed != playing) {
    playing = pressed;
    if (playing >= 0) {
      tone(BUZZER, NOTES[playing]);
      Serial.println(NAMES[playing]);
    } else {
      noTone(BUZZER);
    }
  }
}
```
  Octave C5–C6 line: `const int NOTES[] = {523, 587, 659, 698, 784, 880, 988, 1047};  // C5 to C6`. Letters line: `const char* NAMES[] = {"C", "D", "E", "F", "G", "A", "B", "C"};`.
- Sim: a key is down if the user holds it **or** the auto tune holds it. The highest index wins ("last pressed" in the loop). Pins D2–D9 show HIGH/LOW (pull-up mode: LOW = pressed). Auto-played keys sink 1.1 units. When a key starts: a float note "♪ {name}" in the key colour, a continuous square tone (gain 0.06·0.5) that stops on release (`noTone`), rings every 240 ms in the key colour, readout "♪ Sol · 392 Hz", and the D10 chip "{hz} Hz".
- Serial: `Press and hold a key to play it.` *(synthetic, only when the tune is off)*, then the note name (real) on each new key, e.g. `Sol`.
- Trace: intro `pinMode(KEYS[i], INPUT_PULLUP)` (500 ms), then a loop of `int pressed = -1` → `if (digitalRead(KEYS[i]) == LOW)` → `if (pressed != playing)`. Key changes insert `playing = pressed` → `tone(BUZZER, NOTES[playing])` → `Serial.println(NAMES[playing])`, or `noTone(BUZZER)`.
- Callouts: The − rail "One long ground strip for every key." · Passive buzzer "`tone()` sets the note it plays." · Keys "Hold one down to play its note." · Pins 2–9 "`INPUT_PULLUP`: HIGH until pressed."
- Schematic: D2…D9 each → button → shared "GND rail". D10 → buzzer → ground. Note "Pulled up inside the Uno: HIGH until a key is pressed".

---

### 3.10 Lesson 10, Control a motor (M:1143-1241; S:11084-11119; S:12021-12045)

- Card "10. Control a motor". Heading "Control a motor". Thumb: DC motor.
- Lede (summary): a pin cannot power a motor, so a transistor switches it. PWM sets the speed.
- Features: [pwm] "Speed from 0 to 255 with `analogWrite()`" · [transistor] "TIP120 switches the motor current" · [motor] "Click the motor to change the ramp".
- Pinout: `~D6` | 1 kΩ → Base | PWM signal from the sketch. (#ef8a3a) · `5V` | Motor (+) | Motor supply. · `—` | Motor (−) → Collector | The transistor completes the motor circuit. · `GND` | Emitter | Shared ground.
- Wiring: D6 (orange) → **a9**. 1 kΩ (brown-black-red-gold) **b9–b13**. TIP120 legs **c13 B, c14 C, c15 E**. GND (navy) → **a15**. The motor sits off-board. Motor + (red) → **5V header**. Motor − (navy) → **a14** (collector).
- Specs: Motor **3–6 V DC, ~200 mA** · Transistor **TIP120 Darlington, 5 A** · Base resistor **1 kΩ (brown-black-red)** · PWM on pin 6 **≈ 980 Hz** · Tip **Add a flyback diode across the motor**.
- Params (motor): "Top speed" range 50–255 step 5, default 255. "Ramp step" range 1–25 step 1, default 5.
- Code (chips: `255`, `5`):
```cpp
const int MOTOR = 6;  // PWM pin

void setup() {
  pinMode(MOTOR, OUTPUT);
}

void loop() {
  for (int s = 0; s <= 255; s += 5) {
    analogWrite(MOTOR, s);
    delay(40);
  }
  delay(1500);
  analogWrite(MOTOR, 0);
  delay(1500);
}
```
- Sim (S:12026-12039): `steps = floor(top/step)`, `rampMs = (steps+1)·40`, `cycle = rampMs + 3000`. During the ramp `u = min(steps, floor(l/40))·step`. Then it holds `steps·step` for 1500 ms, then 0 for 1500 ms. The prop's angular speed eases to `u/255·26 rad/s` (time constant 380 ms up, 900 ms coasting down). Readout "{round(speed/26·100)}%". The D6 chip shows PWM %. The motor-wire chips read "5 V" / "MOTOR −".
- Serial *(synthetic)*: `analogWrite(6, {u})` at 0, at each crossing of a multiple of 50, and at top speed. In a real browser: 0, 50, 100, 150, 200, 250, 255, 0, …
- Callouts: Transistor "A small base current switches the motor." · 1 kΩ Resistor "Keeps the base current safe for the pin." · Pin ~6 (PWM) "`analogWrite()` sets the speed, 0–255." · DC Motor "Click it to change the ramp."

---

### 3.11 Lesson 11, Sense heat (TMP36 + fan) (M:1241-1373; S:11136-11193; S:12046-12083)

- Card "11. Sense heat". Heading "Sense heat". Thumb: teal hairdryer.
- Lede (summary): the TMP36 outputs 0.5 V at 0 °C plus 10 mV/°C. A hairdryer heats it and a fan turns on above a limit: a tiny thermostat.
- Features: [thermo] "`analogRead()` to degrees in one line" · [dryer] "Drag the hairdryer closer, or switch it off" · [fan] "The fan cools the sensor and holds the limit".
- Pinout: `5V` | TMP36 Vs (left) | Power for the sensor. · `A0` | TMP36 Vout (middle) | 0.5 V plus 10 mV per °C. · `GND` | TMP36 GND (right) | Ground. · `~D6` | 1 kΩ → Base | Switches the fan through the transistor.
- Wiring: D6 (orange) → **a9**. 1 kΩ **b9–b13**. TIP120 **c13–c15**. GND (navy) → **a15**. TMP36 **c19 (+Vs), c20 (Vout), c21 (GND)**. 5V (red) → **a19**. A0 (green) → **a20**. GND1 (navy) → **a21**. Fan + (red) → **e19**. Fan − (navy) → **e14** (collector). The hairdryer is aimed at the sensor along a 36° axis.
- Specs: Sensor **TMP36, −40 to 125 °C** · Output **10 mV/°C, 750 mV at 25 °C** · Accuracy **±2 °C** · Fan **5 V DC, switched by a TIP120** · Reading **every 200 ms**.
- Params: **Hairdryer** "Hairdryer distance" range 5–40 step 1, default 14 cm. "Hairdryer switched on" toggle, default on. Drag interaction. **TMP36** "Fan on above" range 24–45 step 1, default 30 °C. **Fan** "Fan speed" On / off "Full speed above the limit, off below it." (default) / Ramp "Faster the hotter it gets: full speed 8 °C over the limit.".
- Code, On/off (default; chip `30`):
```cpp
const int SENSOR = A0;
const int FAN = 6;  // PWM, through the transistor

void setup() {
  Serial.begin(9600);
  pinMode(FAN, OUTPUT);
}

void loop() {
  int raw = analogRead(SENSOR);
  float volts = raw * 5.0 / 1023.0;
  float tempC = (volts - 0.5) * 100.0;
  Serial.println(tempC);

  if (tempC > 30) {
    analogWrite(FAN, 255);  // too warm: fan on
  } else {
    analogWrite(FAN, 0);
  }
  delay(200);
}
```
  Ramp replaces the `if` block with:
```cpp
  int speed = (tempC - 30) * 32;
  analogWrite(FAN, constrain(speed, 0, 255));
```
- Thermal model (S:10794-10796, S:12046-12083):
  - `heat = dryer ? 34 / (1 + ((dist − 3)/12)²) : 0` °C.
  - `target = 22 + heat − fanSpeed/26·9`, so the fan at full speed cools by 9 °C.
  - `T += (target − T)·(1 − e^(−dt/2200))`. Start value `T0 = 22 + heat·0.5`.
  - Every 200 ms: reading = T ± 0.15, then `pwm = ramp ? clamp(trunc((T − limit)·32), 0, 255) : (T > limit ? 255 : 0)`.
  - Fan blade speed eases to `pwm/255·26` (time constant 420 ms on, 1100 ms off).
  - The A0 chip shows `(0.5 + T/100).toFixed(2) V`. Readout "{T.toFixed(1)} °C". The dryer shows an animated airflow stream when on.
  - Defaults (14 cm): heat 18.5 °C, equilibrium ≈ 31.5 °C with the fan 100% (switch mode), or ≈ 33.4 °C at 43% (ramp). Both match live runs.
- Serial: `31.4 °C  ·  fan 100%`. The temperature is real (the sketch prints only the number); "  ·  fan {p}%" is appended *(synthetic)* when the fan is on.
- Callouts: TMP36 "Its voltage climbs 10 mV for every degree." · Fan "On above the limit; it cools the sensor." · Hairdryer "Drag it closer to heat the sensor." · Pin A0 "`analogRead()` sees the sensor’s volts."

---

### 3.12 Lesson 12, Sweep a servo (M:1373-1474; S:11120-11135; S:12274-12302)

- Card "12. Sweep a servo". Heading "Sweep a servo". Thumb: blue SG90.
- Lede (summary): a servo knows its position. Give it 0–180° and it holds.
- Features: [servo] "Position with `arm.write(angle)`" · [console] "The Servo library makes the pulses for you" · [clock] "Click the servo to change the sweep".
- Pinout: `GND` | Brown wire | Ground. (#7a5034) · `5V` | Red wire | Power for the motor. · `D9` | Orange wire | Signal: a 0.5–2.4 ms pulse every 20 ms.
- Wiring: **no breadboard**. Servo cable: brown → **GND2**, red → **5V**, orange → **D9**.
- Specs: Servo **SG90 micro, 9 g** · Travel **0–180°** · Speed **≈ 0.1 s per 60°** · Torque **1.8 kg·cm at 4.8 V** · Signal **50 Hz, 0.5–2.4 ms pulses**.
- Params (servo): "From" range 0–175 step 5, default 0°. "To" range 5–180 step 5, default 180°. "Step delay" range 2–40 step 1, default 12 ms. **Constraint**: from < to with at least a 5° gap; the other value is pushed.
- Code (chips: from, to, wait, each twice):
```cpp
#include <Servo.h>
Servo arm;

void setup() {
  arm.attach(9);
}

void loop() {
  for (int a = 0; a <= 180; a++) {
    arm.write(a);
    delay(12);
  }
  for (int a = 180; a >= 0; a--) {
    arm.write(a);
    delay(12);
  }
}
```
- Sim: the angle steps 1° every `wait` ms and bounces between from and to (2.16 s per sweep at the defaults). The horn rotates `(90 − angle)°`. Readout "{angle}°". The D9 chip shows the pulse width `(0.5 + angle/180·1.9).toFixed(1) ms`.
- Serial *(synthetic)*: `arm.write({angle})` each time the angle enters a new 15° bucket.
- Callouts: SG90 Servo "Click it to change how far it sweeps." · Pin 9 (signal) "Pulse width sets the angle." · 5V · GND "The servo’s red and brown wires."

---

### 3.13 Lesson 13, Spin the wheel (stepper prize wheel) (M:1474-1620; S:11194-11244; S:12084-12157)

- Card "13. Spin the wheel". Heading "Spin the wheel". Thumb: prize wheel.
- Lede (summary): a stepper turns in exact steps, 2048 per turn. Counting steps lands the prize wheel dead centre on a segment.
- Features: [stepper] "`wheel.move(n)` turns exactly n steps" · [coils] "Four coils switched in turn: watch LEDs A–D" · [button] "Press the button to spin".
- Pinout: `D8–D11` | IN1–IN4 | One pin per coil, through the ULN2003. · `5V · GND` | Driver + and − | The coils need more current than a pin can give. · `D2` | Button | HIGH while pressed (10 kΩ pull-down).
- Wiring: button at **cols 8/10, rows e/f**. 5V (red) → **a8**. D2 (blue) → **a10**. 10 kΩ **b10–b14**. GND (navy) → **a14**. ULN2003 board off to the right. D8→IN1 (orange), D9→IN2 (yellow), D10→IN3 (green), D11→IN4 (purple). GND2 → driver −. **b8 → driver +** (red, 5 V from the breadboard). The 28BYJ-48 is on a wooden base with a 5-wire cable. The 8-segment wheel has a pointer flapper.
- Wheel segments clockwise (K:10665-10666): 50 #ee7f62 · 100 #1aa3a1 · 200 #f2c23a · AGAIN #2f3d5c · 500 #3fae6a · ×2 #8a63c9 · 1000 #f0a53a · JACKPOT #d64a3a.
- Specs: Motor **28BYJ-48, 5 V** · Steps per turn **2048 (64 : 1 gearbox)** · Driver **ULN2003 Darlington array** · Speed **≈ 15 RPM from a standstill, more with a ramp** · Segments **8 × 256 steps**.
- Params (stepper): "Top speed" range 6–28 step 1, default 24 RPM. "Acceleration" range 200–3000 step 100, default 1200 steps/s². "Whole turns first" range 0–3 step 1, default 1. "Direction" Clockwise (default) / Anticlockwise (it changes the `ahead` formula and the sign).
- Code, clockwise (default; chips: 24, 1200, 1):
```cpp
#include <AccelStepper.h>

const int STEPS = 2048;    // one turn of a 28BYJ-48
const int SEGMENTS = 8;    // 256 steps each
const int BUTTON = 2;
// four wires, full steps: pins IN1, IN3, IN2, IN4
AccelStepper wheel(AccelStepper::FULL4WIRE, 8, 10, 9, 11);

const char* PRIZES[] = {"50", "100", "200", "AGAIN",
                        "500", "x2", "1000", "JACKPOT"};
int at = 0;  // the segment under the pointer

void setup() {
  pinMode(BUTTON, INPUT);
  wheel.setMaxSpeed(24 * STEPS / 60.0);  // steps a second
  wheel.setAcceleration(1200);
  Serial.begin(9600);
  randomSeed(analogRead(A0));
}

void loop() {
  if (digitalRead(BUTTON) == HIGH) {
    int prize = random(SEGMENTS);
    int ahead = (prize - at + SEGMENTS) % SEGMENTS;
    long steps = (1 * SEGMENTS + ahead) * (STEPS / SEGMENTS);
    wheel.move(steps);
    wheel.runToPosition();  // speed up, spin, slow down onto it
    at = prize;
    Serial.print("Landed on ");
    Serial.println(PRIZES[at]);
  }
}
```
  Anticlockwise: `int ahead = (at - prize + SEGMENTS) % SEGMENTS;` and `wheel.move(-steps);`.
- Sim (S:12084-12157):
  - Press the button (3D press) while running and the sim picks a random prize. `total = (turns·8 + ahead)·256`.
  - Each frame: `maxV = rpm·2048/60` steps/s, then `v = min(maxV, v + a·dt, max(√(2·a·remaining), a·dt))` (trapezoid profile), and `done += v·dt`.
  - The wheel angle moves by `done·2π/2048`. The ULN2003 LEDs A–D show a two-phase full step `[1100, 0110, 0011, 1001][step mod 4]`. D8–D11 chips read "STEPS".
  - The pointer flicks each time a segment boundary passes (decays with τ 90 ms). Readout "step {n} / {total}", then "{prize}!" on landing.
  - The button is ignored while a spin is in progress.
- Serial: `Press the button to spin the wheel!` *(synthetic)* at start · `Spinning to {prize}: {n} steps` *(synthetic)* · `Landed on {prize}` (real Serial; the × in "×2" printed as x).
- Callouts: Stepper motor "Exact steps: 2048 make a turn." · ULN2003 driver "LEDs A–D light with the coils." · Push button "Press it to spin the wheel." · Pins 8–11 "One pin for each coil."
- Schematic: D2 node (button to 5V, 10 kΩ to ground). D8–D11 → ULN2003 block IN1–IN4, + to 5V, − to GND, then a "STEPPER" motor symbol.

---

### 3.14 Lesson 14, Smart plant (M:1620-1784; S:11245-11289; S:12158-12211)

- Card "14. Smart plant". Heading "Smart plant monitor". Thumb: potted plant.
- Lede (summary): a capacitive soil sensor and an OLED show moisture % and a mood. Let it dry, then hold the watering can over it.
- Features: [drop] "`map()` turns the reading into 0–100 %" · [screen] "Text and a bar on a 128 × 64 OLED screen" · [can] "Hold the watering can down to water the plant".
- Pinout: `5V · GND` | Sensor VCC and GND | Power for the soil sensor. · `A0` | Sensor AOUT | Lower the wetter the soil is. (#f0b53a) · `3V3 · GND` | OLED VCC and GND | The screen runs on 3.3 V. (#ee7f62) · `SCL · SDA` | OLED SCL and SDA | I²C: a clock and a data line (the same pins as A5 and A4).
- Wiring: OLED module pins **g4 GND, g5 VCC, g6 SCL, g7 SDA**. Wires: GND (navy) → **j4**, 3V3 (coral) → **j5**, SCL (blue) → **j6**, SDA (purple) → **j7**. The soil sensor sits in the plant pot off-board; its cable goes straight to the headers (GND→GND1, VCC→5V, AOUT→A0 in yellow).
- Specs: Sensor **Capacitive soil moisture v1.2, 3.3–5.5 V** · Output **About 2.5 V in dry air, 1.3 V in water** · Screen **0.96″ OLED, 128 × 64, SSD1306** · Bus **I²C, address 0x3C** · Reading **Every 500 ms**.
- Params:
  - **OLED**: "“Water me!” below" range 10–50 step 5, default 30%. "“Too wet!” above" range 60–95 step 5, default 85%.
  - **Soil sensor**: "Reading in dry air" range 400–700 step 10, default 520. "Reading in water" range 150–400 step 10, default 260. **Constraint**: dry − wet ≥ 20.
  - **Plant** "Where it stands": Shade "The soil dries out slowly." / Window "Thirsty again in a few seconds." (default) / Full sun "The soil dries out fast.".
  - **Watering can**: press and hold (the can lifts and tilts over 620 ms; a water stream shader appears at full tilt).
- Code (chips: 520, 260, 30, 85):
```cpp
#include <Wire.h>
#include <Adafruit_SSD1306.h>

const int SENSOR = A0;
const int DRY = 520;  // the reading in dry air
const int WET = 260;  // the reading in water
Adafruit_SSD1306 screen(128, 64, &Wire);

void setup() {
  Serial.begin(9600);
  screen.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  screen.setTextColor(SSD1306_WHITE);
}

void loop() {
  int raw = analogRead(SENSOR);
  int moisture = map(raw, DRY, WET, 0, 100);
  moisture = constrain(moisture, 0, 100);
  Serial.println(moisture);

  screen.clearDisplay();
  screen.setTextSize(3);
  screen.setCursor(0, 0);
  screen.print(moisture);
  screen.print("%");
  screen.drawRect(0, 28, 128, 8, SSD1306_WHITE);
  screen.fillRect(0, 28, moisture * 128 / 100, 8, SSD1306_WHITE);

  screen.setTextSize(2);
  screen.setCursor(0, 46);
  if (moisture < 30) {
    screen.print("Water me!");
  } else if (moisture > 85) {
    screen.print("Too wet!");
  } else {
    screen.print("Happy :)");
  }
  screen.display();
  delay(500);
}
```
- Model (S:12158-12211):
  - Soil wetness `w ∈ [0,1]` starts at 0.42. `dw/dt = (watering ? +0.12 : 0) − rate·[w > 0.02]` per second, with rate shade 0.0045, window 0.009, sun 0.018.
  - Every 500 ms: `raw = round(515 − 245·w ± 2)`, then `moisture = clamp(trunc((raw − dry)·100/(wet − dry)), 0, 100)` (Arduino integer `map`). Message: < thirsty → "Water me!", > soggy → "Too wet!", else "Happy :)".
  - Leaves droop by `clamp((0.3 − w)/0.22, 0, 1)`, eased with τ 900 ms.
  - The **OLED is drawn as a real 128×64 framebuffer** with a 5×7 bitmap font at 6 px advance: "{pct}%" at size 3 at (0,0), a bar outline at y 28–35 filled to pct·128/100, the message at size 2 at (0,46) (K:10942-10970).
  - Pin chips: A0 volts, SDA "I²C DATA", SCL "I²C CLOCK". Readout over the sensor "A0 = {raw}".
  - Defaults give raw 412 → 41%. A window spot reaches "Water me!" after about 14 s.
- Serial (real): moisture % every 500 ms, e.g. `41`.
- Callouts: OLED screen "The sketch draws the reading on it." · Soil sensor "Reads lower the wetter the soil is." · Watering can "Hold it down to water the plant." · Pin A0 "`analogRead()` gives 0–1023."

---

### 3.15 Lesson 15, Feel the force (strength tester) (M:1784-1963; S:11293-11363; S:12212-12273)

- Card "15. Feel the force". Heading "Test your strength". Thumb: strength-meter dial.
- Lede (summary): an FSR's resistance falls from MΩ to a few hundred Ω under pressure. A divider plus `analogRead()` measures the push, a servo swings a needle, and a hard press rings a bell.
- Features: [press] "Press the pad, then drag down to push harder" · [gauge] "`map()` turns the reading into the needle’s angle" · [bell] "Reach the mark and the bell rings" · [weight] "Or put a weight on it: heavier ones add less and less".
- Pinout: `5V` | Force sensor | One side of the pad (and the servo’s power). · `A0` | Force sensor + pull-down | The divider: higher the harder you press. · `GND` | Pull-down | Holds A0 at 0 V while nobody presses. · `D9` | Servo signal | Sets the needle’s angle. · `D8` | Buzzer | Rings the bell. (#8a63c9)
- Wiring: the FSR pad lies 34 mm in front of the breadboard with its tail plugged at **cols 13/14** (row a side). 5V (red) → **d13**. A0 (green) → **d14**. Pull-down (value follows the param) **c10–c14**. GND1 (navy) → **d10**. Buzzer **e1/e4**. D8 (purple) → **a1**. GND (navy) → **a4**. Meter servo leads: SIG (orange) → **D9**, + (red) → **e13**, − (brown) → **e10**. The meter is a framed dial (0, 250, 750, 1000 marks; green-yellow-red arc; red needle) with a brass bell on top. Weights 50/100/200/500 g sit on green coasters.
- Specs: Sensor **FSR 402, 18 mm round pad** · Force range **About 0.2–20 N (20 g to 2 kg)** · Resistance **Over 1 MΩ untouched, a few hundred Ω pressed hard** · Accuracy **Good for “how hard”, not for weighing things** · Needle **SG90 servo, 0–180°**.
- Params:
  - **Pull-down**: 1 kΩ "Only a hard press moves the needle far." / 10 kΩ "A good spread, from a light touch to a firm press." (default) / 100 kΩ "A light touch already reads high; hard presses all look the same." (the 3D resistor swaps).
  - **Weights** "On the pad": None (default) / 50 g / 100 g / 200 g / 500 g. Interaction: tap a weight (`tap`; click it again to take it off).
  - **Meter**: "Bell rings above" range 500–1000 step 10, default 880 (moves the bell mark on the dial: bell/1023·180°). "Hold the best for" range 0–3000 step 250, default 1500 ms.
  - **FSR**: **press, then drag down** (`squeeze`: starts at 0.4; travel 140 px → 1.0; min 0.05). A 3D finger appears and presses. FSR and weights open the inspector only while **stopped** (`select: 'stopped'`).
- Code (chips: 10000, 1500, 880 ×2):
```cpp
#include <Servo.h>

const int FSR = A0;
const int BELL = 8;
const long PULLDOWN = 10000;  // ohms, from A0 to GND
Servo needle;

int best = 0;              // the hardest press lately
unsigned long bestAt = 0;  // when it happened
bool rung = false;

void setup() {
  needle.attach(9);
  Serial.begin(9600);
}

void loop() {
  int force = analogRead(FSR);  // higher the harder you press

  // a harder press takes over; after a while the needle lets go
  if (force >= best || millis() - bestAt > 1500) {
    best = force;
    bestAt = millis();
  }
  needle.write(map(best, 0, 1023, 0, 180));

  if (best > 880 && !rung) {
    tone(BELL, 1568, 400);  // ding!
    rung = true;
  } else if (best < 880 - 100) {
    rung = false;
  }

  if (force > 10) {
    // the sensor's resistance, worked out from the divider
    long ohms = PULLDOWN * (1023L - force) / force;
    Serial.print(force);
    Serial.print("  ");
    Serial.print(ohms);
    Serial.println(" ohms");
  }
  delay(20);
}
```
- FSR model (S:12218-12228):
  - Load in grams = (weight on the pad) + finger `20·500^s` (s = squeeze 0–1; 0.4 → 240 g, 1 → 10 kg).
  - `R_fsr(g)`: g ≤ 0 → 10 MΩ. g < 20 → min(10 MΩ, 30 kΩ·(20/g)³). Otherwise log-log interpolation through (20 g, 30 kΩ), (100 g, 6 kΩ), (1000 g, 1 kΩ), (10 kg, 250 Ω), clamped at 250 Ω.
  - `reading = round(1023·Rpd/(Rpd + R_fsr) ± 2)`. With 10 kΩ: 50 g ≈ 460, 100 g ≈ 640, 200 g ≈ 758 (live: 756–759, "3531 ohms"), 500 g ≈ 870, a hard press 998.
  - Every 20 ms: `best` logic as in the sketch. Bell when best > bell and not yet rung: a 1568 Hz tone for 400 ms, the bell swings, a float "Ding!", and gold rings. It re-arms below bell − 100.
  - The needle targets `trunc(best·180/1023)` and slews at most 0.6°/ms. The D9 chip shows the pulse width as in the servo lesson. The D8 chip shows "1568 Hz" while ringing. Readout "A0 = {reading}".
- Serial (real): `{force}  {trunc(Rpd·(1023−force)/force)} ohms` while force > 10, **throttled to 250 ms** (e.g. `757  3513 ohms`).
- Callouts: Strength meter "The needle swings to your best press." · The bell "Rings when the needle passes the mark." · Force sensor "Press it, then drag down to push harder." · Weights "Click one to put it on the pad, and again to take it off." · Pin A0 "Reads the divider: higher the harder you press."

---

### 3.16 Lesson 16, Build a project (parking sensor) (M:1963-2071; S:11364-11398; S:11845-11899)

- Card "16. Build a project". Heading "Parking sensor". Thumb: `gears`, two grey metal spur gears (K:`nl`, rendered from above at el 58°). It does not picture the project.
- Lede (summary): combine the distance sensor and a traffic light that tells the driver when to stop. Click the lights to move the thresholds.
- Features: [logic] "Decisions with comparisons" · [lights] "Three outputs, one for each colour" · [sensor] "Reuses the distance code from lesson 7".
- Pinout: `5V · GND` | Sensor power | GND is bridged to the light module. · `D9 · D10` | Trig · Echo | Same as lesson 7. · `D4` | Red | On when the obstacle is close. · `D3` | Yellow | On in between. · `D2` | Green | On when it is far away.
- Wiring: HC-SR04 pins **cols 8–11** (VCC, Trig, Echo, Gnd). 5V (red) → **e8**. D9 (blue) → **e9**. D10 (purple) → **e10**. GND1 (navy) → **e11**. Traffic-light module pins **b20 GND, b21 R, b22 Y, b23 G**. Bridge **d11 → d20**. D4 (coral) → **e21**. D3 (yellow) → **e22**. D2 (green) → **e23**. The module has three LEDs with built-in resistors.
- Specs: Parts **Uno, HC-SR04, traffic light module** · Wires **8 jumpers** · Thresholds **Adjustable** · Update rate **≈ 15 times a second** · Next step **Add a buzzer from lesson 8**.
- Params: the Obstacle set from lesson 7 (Obstacle / Distance / Drive back and forth while running). **Lights** "Green beyond" range 10–50 step 1, default 30 cm. "Red within" range 3–45 step 1, default 15 cm. **Constraint** near < far (by at least 1 cm).
- Code (chips: 30, 15, each twice):
```cpp
const int TRIG = 9, ECHO = 10;
const int RED = 4, YLW = 3, GRN = 2;

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  for (int p = 2; p <= 4; p++)
    pinMode(p, OUTPUT);
}

void loop() {
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long cm = pulseIn(ECHO, HIGH) / 58;

  digitalWrite(GRN, cm > 30);
  digitalWrite(YLW, cm > 15 && cm <= 30);
  digitalWrite(RED, cm <= 15);
  delay(60);
}
```
- Sim: the same as lesson 7 with the reading every 60 ms. `light = cm > far ? GREEN : cm > near ? YELLOW : RED`. A "no echo" 0 counts as RED. The module LEDs glow. D2/D3/D4 chips show HIGH/LOW.
- Serial *(synthetic; the sketch has no Serial)* on every change: `{cm} cm · RED · stop!` / `{cm} cm · YELLOW · slow down` / `{cm} cm · GREEN · all clear`.
- Callouts: Distance Sensor "Keeps an eye on the obstacle." · Traffic Light "Click it to change the thresholds." · Your Logic (anchor mcu) "Comparisons choose which light is on." · Obstacle "Drag it closer and watch the lights."

---

## 4. The simulator

### 4.1 Architecture: no interpreter

- The code is a **template string per lesson** (M:139…2018). `{{key}}` inserts a param value. `{{key.slot}}` inserts a code block chosen by an option param (`options[].code.slot`; M:2076-2081).
- The 3D behaviour is a **hand-written function per lesson** selected by `lesson.sim` (`builtin`, `blink`, `button`, `knob`, `rgb`, `light`, `sensor`, `sound`, `piano`, `motor`, `heat`, `servo`, `stepper`, `plant`, `force`, `project`; S:11685-12304). It reads the same param values through a Proxy and the live 3D inputs (`inputs.button`, `key0..7`, `press`, `force`, `water`).
- There is no lexer, no AST, no validation and no error messages. The sketch text is never parsed. Whatever the code shows, the sim does its canned thing. A rebuild that interprets code would be strictly better, but it must reproduce every behaviour and number in §3.

### 4.2 Parameters and the template (M:2073-2081, M:4354-4392)

- Defaults come from `params[].value`. Saved values (`learn-arduino:values[lessonId]`) are reapplied only if valid: ranges are clamped to [min,max], toggles must be booleans, options must exist. Then `lesson.constrain(values)` runs.
- `setParam(key, v)`: clamp/coerce, apply `constrain(values, changedKey)`, update the 3D scene (`updateParams`; parts whose `key` changes are rebuilt with a drop animation, e.g. the resistor value or obstacle type), repaint the code (new lines flash, changed chips flash and scroll into view), sync the inspector, save (400 ms debounce) and re-render the schematic.
- Values written by the sim (the sweep moving `gap`) are not saved (`fromSim`).
- Constraints:
  - rgb: preset ↔ r,g,b, or "custom".
  - servo: `from ≥ to` pushes the other value by 5 (0–180).
  - plant: `dry − wet < 20` pushes the other value (dry ≤ 700, wet ≥ 150).
  - project: `near ≥ far` pushes the other value by 1 (far ≤ 50, near ≥ 3).

### 4.3 Editing the code

- The code is **not editable** (no textarea or contenteditable; checked live).
- Clicking a chip selects the 3D part that owns that param and pulses/focuses its inspector row (`row-pulse`).
- Selecting a part marks its chips in the code (`is-marked`) and scrolls the first one into view.
- Changing a param while running applies live; there is no re-upload.
- **Copy** writes the resolved code (real blank lines, bidi marks stripped) to the clipboard, with an `execCommand('copy')` fallback.
- Blank lines display as a single space in the view (M:2669-2672).

### 4.4 Run / Stop lifecycle (M:4426-4437, S:13397-13452)

States are `idle` → `uploading` → `running` → (Stop) `idle`.

1. Run (button, Space key, sidebar "Simulator", or "Run to see it" in the inspector): create/resume the `AudioContext`, set the state to uploading (console opens with "Uploading", lines cleared, run button busy, sidebar item on).
2. TX/RX LEDs flicker for 1150 ms: `TX on when sin(t·0.09) > 0.2`, `RX on when sin(t·0.13 + 1) > 0.4`.
3. Console: `Compiling sketch…`, wait 600 ms, `Uploading to Arduino Uno…`, wait 600 ms, `Done uploading.`. Waits use the tween clock, so Reduce motion makes them almost instant (speed 0.05).
4. The sim starts. State running, status "Running", **lesson marked done** (first time only; progress bar +1, ✓ badge with celebrate bounce, flyout refresh).
5. Stop happens on the stop button, the console ×, Space, the sidebar "Simulator" item, or switching to a different lesson (Home counts only when you are not already on lesson 1). Escape does **not** stop.
   - The sim's `stop()` resets visuals: LEDs off, readouts cleared, coils off, needle to 0.
   - The tone, flow beads and trace are cleared.
   - The console logs `Stopped.`, the status flips to "Stopped", and because the state is now idle the console slides closed at once. The "Stopped" status is seen mostly as it hides.

A run token cancels a stale upload when you switch lessons mid-upload. Stopping during the upload aborts it, so the lesson is not completed.

### 4.5 Serial monitor semantics

- There is no baud rate selector and no handling of baud. `Serial.begin(9600)` is decoration. There is no serial input field.
- The monitor shows three kinds of line: upload messages, **real sketch prints** (knob, light, sensor, piano, heat, stepper "Landed on…", plant, force), and **synthetic activity notes** for sketches with no Serial at all (board, blink, button, rgb, sound, motor, servo, project) plus extra annotations (" cm", "  ·  fan 100%", "Spinning to …").
- Print rates are **throttled** for readability: knob 300 ms, light 320 ms, force 250 ms. The others print on change or per event.
- The 40-line cap. `aria-live=polite`.

### 4.6 Code trace (line highlighting) (S:11646-11684, M:2696-2710)

The `ps` walker plays a list of `[lineText, nth, durationMs = 170]` steps, with an optional one-shot intro and optional looping, against wall-clock time. The UI highlights the `nth` line whose text contains `lineText` and scrolls it into view above the console. The steps are hand-authored per lesson. They approximate where the program is; they are not real execution.

### 4.7 Pin levels → wire chips, flow beads, schematic (M:3775-3815, S:12321-12471, M:3614-4127)

- Each sim writes `levels[pin] = {v: 0..1, mode, text}`. Modes: `out`, `in`, `pullup`, `pwm`, `analog`, `pulse`, `tone`, `servo`.
- `A(pin)`:
  - 5V/3V3/VIN → kind power, text "5 V"/"3.3 V", flow 0.45.
  - GND* → kind gnd, flow 0.
  - pullup → HIGH if v > 0.5, else LOW (flow 0.25 when LOW).
  - pwm → "LOW"/"HIGH" at 0/1, else "PWM {round(v·100)}%".
  - out/in → HIGH/LOW.
  - Otherwise the custom text.
  - flow = v for outputs, `0.12 + 0.2v` for analog, `0.3v` for inputs.
- Wires take their signal from the pin at either end, or follow another pin (e.g. the motor wires follow D6, the key ground wires follow their key pin). Ground return wires carry `max(output flows)`, or 0.3 when powered.
- **Flow beads** (setting "Current flow", F key): light beads (core #fff6d6, rim #18213d) every 7 mm along each wire tube, moving at `6 + 34·flow` mm/s in the direction of current, fading in and out over 160 ms. Shown only while running.
- **Schematic panel** (C key or viewbar):
  - A card at the left of the stage, width clamp(0.38·stageW, 300, 460) px, at top 112. In compact it sits at the bottom of the stage.
  - Header "Schematic" with the lesson title and a "Close schematic" ×.
  - The SVG is **auto-generated** from a per-lesson netlist (`at`, M:3614-3773): an ARDUINO block with the used pins (`~` prefix on PWM pins 3/5/6/9/10/11), chains of symbols (R zig-zag with value label, LED with arrows filled in the LED colour, button, buzzer, motor M, LDR, FSR, NPN transistor, pot with "10 kΩ", ground, VCC tee with label, junction dots, bus to ground with label) and module blocks (HC-SR04, TMP36, SERVO, ULN2003 plus a STEPPER motor, SOIL SENSOR, OLED, LIGHTS).
  - Live while running: wires recolour (`is-high` #e5533d, power #d64a3a, gnd navy), dashed flow animates (speed `22/(14 + 70·flow)` s, direction by current), and pin values print beside each pin ("HIGH", "PWM 61%", "0.83 V", "0.5 ms").
  - Hovering a symbol highlights the 3D part. Clicking selects it.
  - "No circuit in this lesson." appears if there is no netlist (never, in practice).

### 4.8 Timing

- Simulations use `performance.now()` and the frame dt, clamped at 64 ms per frame (S:13455). Delays in the sketches are emulated by the sims' own time logic, not by executing `delay()`.
- `millis()` appears only in lesson 15, where the sim implements the `hold` window in real time.
- Reduce motion speeds up tweens (×0.05) but not the simulations.

### 4.9 Arduino API coverage (what the original "supports")

| API | Where | How it is modelled |
|---|---|---|
| `pinMode`, `digitalWrite` | 1, 2, 3, 6, 16 | pin levels, LEDs, L LED mirror |
| `delay` | all | sim timers (blink on/off, ramps, sweeps) |
| `digitalRead` + `INPUT` / `INPUT_PULLUP` | 3, 9, 13 | 3D press inputs |
| `analogRead` | 4, 6, 11, 14, 15 | physical models (divider, LDR curve, TMP36, soil, FSR) with noise |
| `analogWrite` (PWM) | 4, 5, 10, 11 | LED brightness, motor/fan speed, "PWM %" chips |
| `delayMicroseconds`, `pulseIn` | 7, 16 | distance model, echo jitter/miss |
| `tone(pin,hz,ms)`, `tone(pin,hz)`, `noTone` | 8, 9, 15 | WebAudio square wave |
| `Servo.attach/write` | 12, 15 | horn/needle angle, pulse-width chip |
| `millis` | 15 | hold-best window |
| `map`, `constrain` | 14, 15, 11 | integer map with truncation |
| `random`, `randomSeed` | 13 | `Math.random` |
| `AccelStepper` | 13 | trapezoid profile, coil LEDs |
| `Wire` + `Adafruit_SSD1306` | 14 | pixel framebuffer with 5×7 font |
| `Serial.begin/print/println` | many | console lines (with throttles and synthetic extras) |

Not present anywhere: interrupts, `attachInterrupt`, `millis`-based multitasking outside lesson 15, EEPROM, `Serial.read`, LCDs, IR remotes, keypads, relays, real compile errors.

### 4.10 Audio (M:4128-4170)

- WebAudio only, no samples. One-shot `bt(hz, ms, vol=.4)`: a square oscillator with gain ramped 0 → 0.06·vol in 6 ms, held, then ramped to 0 over the last 30 ms.
- Continuous `xt(hz, vol)` for the piano (re-used if the frequency is the same), stopped by `St()` with a 20 ms ramp.
- Gated by Settings → Sound and the sound lesson's volume slider. The tone stops when the tab is hidden. The AudioContext is created on the first Run (a user gesture).
- There are no UI click sounds.

### 4.11 3D interactions and the inspector (S:13101-13248, M:3292-3456, M:4393-4412)

- **Hover**: the part lifts 1.6 (2.5 for `big`) over 220 ms (wires and `noLift` parts excepted), the tooltip shows, and the cursor shows a hand per interaction type (`data-hand`).
- **Click** (no drag): selects the part. A teal double ring (#1aa3a1, opacity .85/.45) appears on the surface below it, with radius from its footprint. The inspector opens and callouts switch to tags. Clicking empty space or the bare board deselects.
- **Double-click**: zoom to the part (zoom factor clamp(70/size, 1.4, 2.6)) or reset the view.
- **Grab handlers** (pointer down on an interactive part takes over from camera panning):
  - `slide`: drag on a horizontal plane, projected onto the part's axis → param (lamp, hairdryer, obstacle; the first move disables the sweep).
  - `knob`: angle around the projected knob centre; Δθ × (max − min)/(270°) → value.
  - `press`: input true while held, cap moves down 1.3 (90 ms), hold animations for the can (620 ms down, 480 up) and the FSR finger (200 down, 240 up).
  - `squeeze`: press, then vertical drag sets force.
  - `tap`: click without moving more than 6 px → picks the tapped weight.
- **Inspector** (desktop: 292 px card in the stage corner, flipping side to avoid the selected part, with an SVG leader to it; compact: docked to the bottom):
  - Header: part name (uppercase) and a close ×.
  - Description.
  - Rows: `range` (label + live `<output>` with unit; % and ° attached without a space; filled track; optional tint), `toggle` (switch), `choice` (segmented buttons + note), `swatch` (round colour buttons + current name or "Custom" + note). Arrow keys move through radio groups and apply immediately.
  - Footer: "Zoom to it", then the interaction hint or "Run to see it".
  - Escape closes it. Values sync live (e.g. the sweep moving the Distance slider).

---

## 5. Visual and interaction design

### 5.1 Palette (C:257-284)

`--bg` #f6eddd · `--bg-deep` #efe3d1 · `--sidebar` #e9dcca · `--card` #f9f2e5 · `--card-soft` #faf4e9f7 · `--code-bg` #f8f0e3 · `--line` #cec0ad · `--line-soft` #e2d7c7 · `--navy` #18213d · `--navy-2` #24304a · `--ink` #4f535b · `--muted` #696d74 · `--faint` #ada293 · `--teal` #1aa3a1 · `--teal-deep` #3f7f8e · `--trace` #d3bea3 · `--track` #e3d8ca · `--kw` #2a56a3 · `--fn` #c0652d · `--gutter` #aaa59d. Strings #3f8a4f. Run button navy gradient #34436a→#283656. Stop button #d0614c→#b84d3a. Outline ink #141a2c. Light only (`color-scheme: light`), no dark mode.

Cards are flat warm paper with a 1.5 px `--line` border, 9–12 px radii and soft drop shadows (`0 10px 22px -16px #3c2d148c` style).

### 5.2 Typography

- **Barlow Semi Condensed** 500/600/700 for every uppercase label, title, tab and tag (letter-spacing .03–.17em).
- **Barlow** 400/500/600 for body text.
- **JetBrains Mono** 400/500 for code, console, clock and readouts.
- All self-hosted woff2, latin + latin-ext subsets. Non-Latin scripts use system fallbacks, and `html:not([lang=en]) .lesson-title` gets adjusted sizing.

### 5.3 3D style (S:12647-12707, K:8141-8260)

- three.js `WebGLRenderer` (alpha, no MSAA) with an **orthographic camera**. A custom post-pass draws **ink outlines** from depth and normal discontinuities (line colour #141a2c, thickness 1.3 px scaled by `clamp(sqrt(zoom·fit/6), .6, 1)`, plus a softer outer ring for anti-aliasing). The result is a hand-inked, flat-shaded illustration look, close to Colorfigures.
- Lighting: RoomEnvironment PMREM at 0.4 intensity. Hemisphere light #fffaf3 / #c2ae90 at 0.5. Key directional #fff6ea at 1.2 from (−55,100,62). A separate shadow-only light (intensity 0.001) at (70,104,−34) with VSM soft shadows (2048², radius 11, 20 samples). Shadows re-render only when something moves.
- Ground: a brown shadow-catcher (#7a5532, opacity 0.32) at y −4, plus an optional **floor grid** shader (9-unit cells, #d9c7ae, radial fade).
- Glow: additive radial sprites over LEDs. Wire tubes have plug ends. Labels are canvas textures (PCB silk, HC-SR04 print, ULN2003 board, OLED, prize wheel, dial).
- Part entry: parts drop 46 units (breadboard 24) with an out-back scale-up over 720 ms, staggered 130 ms. Wires "draw" along their length (620 ms) with end plugs popping in, starting at 650 ms and staggered 140 ms. Exiting parts shrink and sink (420 ms). Moved parts hop in an arc (800 ms).

### 5.4 Camera and controls (S:10378-10697, S:11400-11487)

- Isometric-style orthographic view. **Azimuth 36° + k·90°** (quarter turns only), **elevation 43°**, zoom 3.2–22 px/unit. Each lesson has a home view (`es[lesson]`: target, zoom and a framing rectangle fitted to the stage). Pan bounds are x −90…150, z −110…90.
- Mouse: **left-drag pans** (4 px threshold, fling inertia with decay τ 340 ms). Middle-drag ratchets quarter turns every 110 px. Wheel zooms around the cursor (`zoom·e^(−deltaY·0.0018)`, smoothed τ 75 ms).
- Touch: one-finger pan. Two fingers pinch-zoom and pan, and a twist past 40° turns a quarter.
- Keys: **WASD / arrows** pan (760 px/s, Shift ×2, smoothed). **Q/E** turn. **+ = PageUp** / **− _ PageDown** zoom ×1.3.
- Viewbar buttons (§1.8). The compass resets the view (1100 ms ease). Lesson changes animate to the new home (1300 ms).
- **Turntable** setting: after 4.5 s without input, turn a quarter (repeats).
- Callout clicks and Components clicks zoom to targets (1 s).

### 5.5 Global keyboard shortcuts (M:4668-4691)

Ignored while typing in inputs or with Ctrl/Cmd/Alt held:
- **Space**: Run/Stop (not when a button has focus).
- **R / Home**: reset view. **F**: Current flow. **C**: Schematic.
- **1–9, 0**: jump to lessons 1–10.
- **[ / ]**: previous / next lesson.
- **Escape**: deselect, otherwise close the flyout, otherwise collapse expanded panels, otherwise reset the view.

### 5.6 Motion details

- Callout stagger 60 ms. Halo pulse 2.8 s. Tab fades 120/220 ms. Code swap fade 180 ms. Console slide 0.4 s. Progress fill 0.8 s. Celebrate 0.7 s. Float notes 1.1 s. Inspector `insp-in` animation. Readout fade 0.25 s.
- Reduce motion: tweens ×0.05, callouts without delay, `html.reduce-motion` disables the CSS flow dash animation.

### 5.7 Accessibility as built

- Tabs use `role=tablist/tab` with arrow keys. The inspector is `role=dialog` with radiogroups and switches. The console is `aria-live`. The progressbar has aria values. The canvas has a descriptive `aria-label`. Lesson cards are `role=button` with "Lesson {n}: {title}" labels and Enter/Space. Buttons have `aria-label`s. The app is `inert` while loading.
- Gaps: the 3D parts are not keyboard-reachable except through Components, chips and callouts. Colour carries most of the state.

---

## 6. Internationalisation (I:100-255, locale chunks)

- **13 languages**: en English, es Español, pt Português, fr Français, de Deutsch, it Italiano, tr Türkçe, id Bahasa Indonesia ("Indonesia" short), zh 简体中文 (`zh-Hans`, short 中文), ja 日本語, ko 한국어, hi हिन्दी, he עברית (**RTL**). The downloaded set covered es, fr, de, hi, zh. I fetched pt, it, tr, id, ja, ko and he from the live site (`la-live/locales/`).
- **URLs**: English at `/`, others at `/xx/` (e.g. `/es/#blink`). Each is a **pre-rendered static HTML** with translated `<title>`, meta, OG/Twitter (`og-image-xx.png`), JSON-LD (`teaches` translated), the noscript list and all static UI labels.
- **First visit**: only on `/` exactly. If `localStorage['learn-arduino:lang']` is set, or the first supported entry of `navigator.languages` (`iw` → he) is not English, `location.replace('/xx/' + search + hash)`. Verified: a `fr-FR` browser at `/` lands on `/fr/`. After choosing German, revisiting `/` redirects to `/de/`.
- **Switching**: from the Settings `<select>` or the Language flyout, it stores the code and navigates to `/xx/` keeping `?search#hash` (so the current lesson stays). It is a full page load.
- **Translation mechanics**: each locale chunk is a flat map of ~906 English strings to translations. `m(key, {vars})` replaces `{name}` placeholders. `C(document.body)` walks text nodes and `aria-label`/`title`/`alt`/`placeholder` and swaps exact matches. Lesson data goes through `T()`, a deep map that skips `id thumb sim anchor icon side approach key part value type color tint via`, special-cases `features` and `pinout`, and for `code` translates **only `//` comments** (regex `//(\s*)(.+)$`).
- **What is translated**: all UI, lesson titles, ledes, features, pinout, examples, specs, callouts, inspector labels and notes, part names and descriptions, tooltips, schematic labels (e.g. "GND rail", SERVO, LIGHTS), console upload messages, sim readouts and synthetic serial lines ("ECO {ms} ms", "SIN ECO", "ROJO · ¡alto!"…), code comments, and dates via `Intl`. Decimal commas appear where the translator wrote them (e.g. "68,6 × 53,4 mm").
- **Not translated**: C identifiers and string literals in sketches ("Water me!", "Too wet!", "Happy :)", "Landed on ", the PRIZES array), so the OLED and some serial lines stay English. The "“Water me!” below" label keeps the English literal inside the translated label. Pin names, units and brand names also stay.
- **RTL**: `<html dir="rtl">` for he. Hebrew strings carry U+200F marks. Code comments containing Hebrew are wrapped in `<bdi dir="rtl">`. The lessons-strip scroll maths is RTL-aware.
- Samples (lesson 2 title / tagline): es "Haz parpadear un LED" / "EXPLORA · ENTIENDE · CONSTRUYE"; fr "Faire clignoter une LED" / "EXPLORER · COMPRENDRE · CONSTRUIRE"; de "Lass eine LED blinken" / "ENTDECKEN · VERSTEHEN · BAUEN"; zh "让 LED 闪烁" / "探索 · 理解 · 动手"; hi "LED ब्लिंक करें" / "खोजें · समझें · बनाएँ". Status words (Uploading / Running / Stopped): es Cargando / En marcha / Detenido; fr Téléversement / En cours / Arrêté; de Hochladen / Läuft / Gestoppt; zh 上传中 / 运行中 / 已停止; hi अपलोड हो रहा है / चल रहा है / रुका हुआ.

---

## 7. Persistence and progress rules

| Key | Value | Written when |
|---|---|---|
| `learn-arduino:lang` | language code | choosing a language |
| `learn-arduino:done` | JSON array of lesson ids, e.g. `["board","blink"]` | first completed upload of a lesson |
| `learn-arduino:values` | JSON `{lessonId: {param: value}}` | any user param change (400 ms debounce) |
| `learn-arduino:settings` | JSON `{labels, grid, autoRotate, sound, reducedMotion, flow, schematic}` | any settings toggle, and the flow/schematic buttons |
| `console-height` | number (px) | after resizing the serial monitor |
| URL `#lessonId` | hash via `history.replaceState` | on every lesson change; read at startup |

- Progress = `done.size / 16`, shown as "N/16" and a bar ("Basics"). It is shared across languages (same origin).
- Done is permanent until **Settings → Reset progress**, which clears `learn-arduino:done` and repaints but keeps values and settings.
- There is no time spent, no quiz score and no partial credit. Running lessons out of order is allowed and all lessons are unlocked.
- `document.title` = "{Lesson title} · Learn Arduino" (translated) after the first lesson change or a deep link.

---

## 8. "Scheggled", best interpretation

**It most likely means the Schematic toggle**, the "Schematic (C)" button (`data-view="schematic" class="toggle"`, `aria-pressed`) that opens and closes the live schematic panel. "Sche…" plus "…ggled" reads as "Schematic toggled".

Evidence:
- `grep` over all bundles finds only these `sch…` user-facing strings: "Schematic", "Schematic (C)", "Show schematic", "Close schematic", "Schematic of the circuit", "No circuit in this lesson." (M:4038-4074, H: viewbar).
- The only "…ggled" string is "Toggled at the note’s frequency." (lesson 8 pinout).
- The schematic is a first-class feature: it has its own shortcut (C), its own persisted setting (`schematic` in `learn-arduino:settings`), live animated flow and live pin values.
- There is **no** scheduler, **no** sketch gallery and **no** scheduled or locked lessons anywhere. The only "Scheduled" string is WebAudio's `cancelScheduledValues`.

Recommendation: implement the schematic as a toggleable, live, auto-generated view per lesson (see §4.7). Matching the README brief, also offer a breadboard view.

---

## 9. Accuracy notes

### 9.1 Facts the rebuild must get right (all verified in source or live)

- Uno R3: ATmega328P at 16 MHz (clocked by the 16 MHz **resonator**; the 16 MHz **crystal** clocks the ATmega16U2 USB bridge), 5 V logic, 7–12 V recommended input, 14 digital I/O with PWM on ~3, 5, 6, 9, 10, 11, 6 analog inputs, 32 KB flash, 2 KB SRAM, 1 KB EEPROM, 68.6 × 53.4 mm, L LED on D13, SDA/SCL = A4/A5.
- ADC: 10-bit, 0–1023 for 0–5 V, ≈ 4.9 mV/step. PWM 8-bit 0–255, ≈ 490 Hz (pins 9/10/3/11), ≈ 980 Hz (pins 5/6).
- LED: `I = (5 − Vf)/R`. 220 Ω red ≈ 13.6 mA. Vf used: red 2.0, yellow 2.1, green 2.2, blue 3.0, white 3.1. Brightness curve `min(1, (I/13.6 mA)^0.55)`.
- Logic thresholds at 5 V: LOW < 1.5 V, HIGH > 3 V. Internal pull-ups 20–50 kΩ.
- HC-SR04: 40 kHz, 2–400 cm, `cm = µs/58` (round trip), 10 µs trigger.
- TMP36: `T = (V − 0.5)·100`, 750 mV at 25 °C, ±2 °C.
- SG90: 50 Hz frame, 0.5–2.4 ms pulses for 0–180°, ≈ 0.1 s/60°, 1.8 kg·cm.
- 28BYJ-48 + ULN2003 with AccelStepper FULL4WIRE and pin order **8, 10, 9, 11** (IN1, IN3, IN2, IN4).
- FSR divider: `R_fsr = Rpd·(1023 − reading)/reading`. SSD1306 at I²C 0x3C, 128×64. Capacitive soil sensor reads lower when wetter. Notes: C4 262 Hz, A4 440 Hz, octave = ×2. `tone(1568)` = G6.

### 9.2 Errors and quirks in the original to avoid or fix

1. **"Serial monitor" shows output for sketches with no `Serial` at all** (blink, button, rgb, sound, motor, servo, project, board). It also appends text the sketch does not print (" cm", "  ·  fan 100%", "Spinning to …: n steps"). Label these as pin activity, not serial.
2. **Serial throttling** hides the real print rate (knob 50 ms vs 300 ms shown). Say so, or emulate it honestly.
3. **No interpreter**: the code view can never disagree with the sim only because it cannot be edited. The trace highlight is canned timing, not execution.
4. **28BYJ-48 "2048 steps (64 : 1 gearbox)"**: the real gear ratio is ≈ 63.68:1, about 2037.9 full steps per turn. Code using 2048 slowly drifts on real hardware, which contradicts "never drifts off centre". The default **24 RPM** (819 steps/s) is above what most 28BYJ-48s reach at 5 V even with acceleration. The lesson's own spec says ≈ 15 RPM.
5. Lesson 11's transistor description is copied from the motor lesson ("switches the motor’s much larger current") although it switches a fan.
6. Lesson 1's sketch never turns the LED off (no LOW). That is intentional, but the `delay(1000)` in `loop()` is pointless. Explain it, or make the first example a real blink.
7. The motor wiring draws the motor from the Uno 5V pin through a TIP120 with no flyback diode. The diode is only mentioned as a tip. The TIP120's ≈ 1–2 V saturation drop is not mentioned.
8. The HC-SR04 echo timing on the wire chip is shown in **ms** (e.g. "ECHO 2.6 ms") while the real pulse is µs. The visual is slowed down. Label it as slowed.
9. `raw * 5.0 / 1023.0` (lesson 11) vs the more correct `/1024`: both are common. Pick one and be consistent with §9.1.
10. Lesson 14 runs the OLED from 3V3, but the Uno's I²C lines are 5 V logic, and on AVR the Wire library turns on internal pull-ups to 5 V. The text implies the bus is 3.3 V. Most SSD1306 breakout modules tolerate this, but the rebuild should say so. (The soil sensor is analog on A0, not on the bus.)
11. The 3D LED in the light lesson is always yellow (no colour control there), even though the swatch param exists in lessons 2–4.
12. **Branding**: the floor watermark and sidebar credit belong to the original author. Do not reproduce them.

---

## 10. What the original does not have (room for "strictly better")

- No code editing, interpreter, compile errors or editable serial input. No baud handling.
- No quizzes, no challenges with goals or checks, no hints system, and no completion criteria beyond "pressed Run".
- No failure modes: no burnt LED without a resistor, no reversed polarity, no shorts, no brown-out, no current over-limit warnings, even though the specs mention 20 mA / 40 mA limits.
- No breadboard or schematic editing and no free-build sandbox. There is one board (Uno only).
- No dark mode. No offline or PWA caching beyond the manifest.
- No progress sync, no per-lesson time, and no "next lesson" call to action at the end.
- A single "Basics" track label. There are no other tracks or levels.
