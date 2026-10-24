# Robotics Bench (original): research part A

Engine, shell, sound, progress and Fig. 01 to Fig. 06 of https://robotics-engineer.vercel.app.
Figures 07 to 13 are covered in part B.

## How this was researched

- Source folder (session scratchpad, it can disappear, so everything a builder needs is copied or summarised here):
  `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/orig/robotics/`
- File references are `file:line` inside that folder. Short names used below:
  `core` = `00-core.js` (Colorfigures core), `eng` = `01-.js` (Robotics Bench engine),
  `f01` = `02-fig01-arduino-uno-r3.js`, `f02` = `03-fig02-led-resistor-trainer.js`, `f03` = `04-fig03-transistor-switch.js`,
  `f04` = `05-fig04-esp32-s3-devkitc-1.js`, `f05` = `06-fig05-tb6612fng-dual-motor-driver.js`, `f06` = `07-fig06-l298n-dual-h-bridge-module.js`,
  `start` = `15-startbench.js`, `shell` = `shell.html`.
- Live parity: on 2026-10-24 I fetched the live page. Its 16 inline scripts are byte-identical to the downloaded files once CRLF
  line endings are normalised. So the code below is exactly what runs live.
- Every flow marked "(live)" was driven with Playwright (Chromium 1280x1000 and 390x844). I hooked `ui.flash` and `sfx` to log every
  toast and every sound with timestamps. Tracking was disabled during the runs (`rb-owner=1`, `/api/track` aborted).
- Screenshots: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/shots/robotics-bench-a/` (index in section 12).

---

## 0. What the original does NOT have (so nobody hunts for it)

- **No See-through toggle, no turn/rotate, no zoom, no drag, no keyboard shortcuts, no touch gestures.** `core` has the VIEW/TURNS
  rotation machinery (`core:28-35`) but `mountFigure` always sets `VIEW = 0` (`core:301`) and no control changes it. The only pointer
  handler is `pointerdown` on `[data-act]` elements (`core:334`). Live controls row is exactly: Hand-drawn wobble, Colour, Labels, Sound.
  (The task brief mentions "toggle see-through": it does not exist in Robotics Bench. The rebuild can add it as a new feature.)
- No status line and no "big idea" line: `#readout` and `.idea` exist but are `display:none` (`core:201`).
- No per-question quiz explanation. A wrong answer only shows a generic toast.
- No "remove one part" action. Only "Strip to bare PCB" removes parts, and it removes all of them.
- No user-operable controls on the boards: the Uno reset button, ESP32 BOOT/RST buttons and the LED trainer slide switch are drawn
  but cannot be pressed. The slide switch knob simply follows `st.power` (`eng:353`).
- No saved build state: every visit (and every board switch) starts fully assembled and powered.

---

## 1. Page shell

### 1.1 Boot sequence

- `shell.html`: `<title>Robotics Bench</title>`, viewport meta, 16 inline `<script>`s in order: core, engine, the 13 board files
  (each an IIFE calling `defineBoard`), then `startBench();` (`start:1`).
- `startBench()` = `mountBoard(location.hash.slice(1) || BOARDS[0].key)` (`eng:1090`). `hashchange` remounts (`eng:1089`).
  An unknown hash falls back to the first board (Fig. 01).
- `defineBoard(d)` pushes and sorts `BOARDS` by `fig` (`eng:598`).
- `mountBoard(key)` (`eng:1031-1088`):
  1. Finds the board, `track('board')`.
  2. `GEN++`, `looping = false` (stops animation loops of the previous board).
  3. Mat margins: defaults `{ back:5, front:5, right:5, left:16 }` merged with `pcb.mat` (`eng:1035`).
  4. Builds geometry `G` (section 2.1) and `PART` (each part gets `p.r = RXY(...p.uv)`).
  5. Creates `st` (section 2.6), runs `B.init(st)`, then **places and solders every part** (`t:1, sold:true`) (`eng:1044`).
  6. Removes every `<style>` from `<head>`, calls core `mountFigure({...})` (rebuilds `<body>`), then `shell()` (nav + lesson).
  7. Forces the wobble slider to 0 (core default is 2.4) (`eng:1082-1083`). Scrolls to top.
  8. Unless `?usb=0` or `?bare=1`: after **350 ms** calls `plug()` (only if same `GEN`, not plugged, not exploded) (`eng:1086-1087`).
     So every board opens assembled, the cable slides in, it powers up and runs its default program.
- `document.title` becomes the board name, for example "Arduino Uno R3" (`core:272`).

### 1.2 Desktop layout (CSS: `core:191-243`, `eng:902-943`)

- `body` is a flex row: left `nav.side` (220 px, sticky, full height, own scroll, right rule), right `main.page` (column, centred, max 760 px).
- `main.page` from top to bottom:
  - `header`: `Fig. NN — Name` (h1, 13 px, 600) on the left, the hint (muted) on the right, baseline aligned, wraps.
  - `.stage` (relative): buttons column top-left (`.actions`, caption "Bench", max 220 px), stats column top-right (`.stats`),
    the toast, and the SVG `#fig` (4:3 viewBox, `overflow:visible`, `user-select:none`, everything inside `<g filter="url(#hand)">`).
  - `.controls`: grid `repeat(auto-fit, minmax(200px,1fr))`, top rule: "Hand-drawn wobble" slider, "Colour" swatches,
    "Labels" button, "Sound" (Lofi, Effects).
  - `.lesson`: grid `1fr 1fr` (gap 26 px / 32 px), top rule (section 2.15). In practice the code column widens to fit the longest
    code line because `pre.code` does not wrap.
  - Footer link "Made with Colorfigures ↗" to `https://april-zhu.com/colorfigures` (right aligned, uppercase, 11 px).
- Tokens: `--paper #f2efe7`, `--ink #231e16`, `--muted #857d6e`, `--rule #ddd6c8`. Background = paper plus an inline-SVG
  `feTurbulence` grain (`core:195`). Font everywhere: `ui-monospace, SFMono-Regular, Menlo, monospace` 13px/1.4.
- Buttons `.act`: pill, 1.5 px ink border, `padding:5px 14px`. Picker buttons get a caret `▾` (`.car`).
- Picker popover `.chips`: absolute to the right of its button (`left: calc(100% + 10px); top:-4px`), 2 px ink border, radius 12,
  hard shadow `3px 3px 0 ink`, `max-width: min(300px, 62vw)`, chips wrap. Only one picker open at a time; any document click closes it.
- Chip states: `.current` (ink background, paper text, `aria-pressed=true`), `.off` (opacity .45), hover = accent background + 1 px lift.
  **Every chip stays clickable**: current shows `<label> — already set`; disabled shows its reason (`c.why`) or
  `<label> isn't possible right now` (`core:348-356`).
- Stats: label `.k` 11 px 700 uppercase muted, value `.v` 34 px 800 tabular numerals; `small:true` values are 20 px.
  A value that changes plays `bump` (scale 1.18 to 1 in .35 s) (`core:216-221, 318-321`).
- Toast `#toast` (`ui.flash`): absolute, `top = #btns bottom + 8px`, paper background, 1.5 px ink border, radius 8, hard shadow
  2 px, uppercase 11.5 px, letter-spacing .06em, max-width 240 px, fades in .2 s, hides after `ms` (default 1600) (`core:211-213, 324-326`).
- `--accent` = light colour of the current palette (active tags, chip hover) (`core:315`).

### 1.3 Left navigation (`eng:944-958`)

- `<h1>Robotics Bench</h1>`, then `<p>Hand-inked circuit boards you build, power up and break.</p>`.
- Boards grouped by `month` with a header `div.mo` (uppercase via CSS). `MONTHS` (`eng:944`):

  | month | header text |
  |---|---|
  | 0 | Start here |
  | 1 | Month 1 · electronics |
  | 2 | Month 2 · microcontrollers |
  | 3 | Month 2 · motors + drivers |
  | 4 | Month 2 · sensors |
  | 5 | Power + the ROS 2 brain |

  (Months 3 and 4 are also labelled "Month 2": an inconsistency, see section 10.)
- Each board: `<a href="#key" aria-current="true|false"><span>Fig. NN[ · done]</span>Name<em>sub</em></a>`. The active link has an ink
  background. ` · done` appears when `localStorage['rb-<key>'] === '1'` (quiz mastered). The active link is scrolled into view.
- Footer `<small>`: "A training bench for the six-month robotics roadmap: electronics, microcontrollers, drivers, sensors, power."
- Full list (live):

  | Fig | key | name | sub | month |
  |---|---|---|---|---|
  | 01 | uno | Arduino Uno R3 | meet the board | 0 |
  | 02 | led | LED + resistor | Ohm's law | 1 |
  | 03 | transistor | Transistor switch | logic drives power | 1 |
  | 04 | esp32 | ESP32-S3 DevKit | WiFi + two cores | 2 |
  | 05 | tb6612 | TB6612FNG driver | H-bridge, PWM | 3 |
  | 06 | l298n | L298N driver | why not to use it | 3 |
  | 07 | a4988 | A4988 stepper driver | microstepping | 3 |
  | 08 | pca9685 | PCA9685 servo board | 16 PWM over I2C | 3 |
  | 09 | mpu6050 | MPU-6050 IMU | filters + drift | 4 |
  | 10 | hcsr04 | HC-SR04 ultrasonic | time of flight | 4 |
  | 11 | qtr8 | QTR-8RC line sensor | line following | 4 |
  | 12 | lm2596 | LM2596 buck module | power + brown-outs | 5 |
  | 13 | rpi5 | Raspberry Pi 5 | ROS 2 brain | 5 |

### 1.4 Mobile layout (live at 390x844)

- `max-width:760px` (`eng:937-943`): body becomes a column. Nav becomes a sticky top bar, horizontal scroll, no scrollbar, paper
  background; h1, p, small, span (Fig number), em (sub) and month headers are hidden; links are pills (1 px rule border, radius 999,
  12.5 px) showing only the board name. Lesson grid becomes one column.
- `max-width:560px` (`core:235`): body padding 14/12/24; header hint and the "Bench" caption hidden; buttons become a static wrapping
  row (12 px font, `4px 11px` padding); stats become a static row, right aligned, gap 18 px, above the figure; pickers open **below**
  their button (`left:0; top: calc(100% + 8px)`).
- Weak points seen live: the figure shrinks to about 350 px wide, the open picker covers the whole figure, and the toast overlaps the
  stats row (`uno-mobile-top.png`, `uno-mobile-picker.png`).

---

## 2. Engine

### 2.1 Coordinates and board geometry

- World axes (`eng:8-12`): `x` = depth, the front edge of the PCB faces viewer-right; `y` = width, `+y` is viewer-left; `z` = up.
  Projection is the fixed Colorfigures isometric: `P(x,y,z) = [(x-y)*cos30 + OX, (x+y)*sin30 - z + OY]` (`core:37`).
- Board authors work in "uv" millimetres on the real board's top view: `u` = distance from the board's LEFT edge (the +y edge),
  `v` = distance from its FRONT edge (+x edge). Negative v = on the mat in front of the PCB, negative u = on the mat left of it.
- Helpers (`eng:56-60`):
  - `bx(v) = G.SX + G.PW - v`, `by(u) = G.SY + G.PD - u`
  - `RXY(u0,v0,u1,v1) -> {x0:bx(max v), x1:bx(min v), y0:by(max u), y1:by(min u)}`
  - `uvP(u,v,z) -> [bx(v), by(u), z ?? G.TOP + .05]`
- `G` at mount (`eng:1036-1037`): `SX = mat.back`, `SY = mat.right`, `PW = pcb.w` (x size), `PD = pcb.d` (y size), `MAT_H = 3`,
  `MW = SX + PW + mat.front`, `MD = SY + PD + mat.left`, `Z0 = MAT_H + (pcb.standoff ?? 4)` (PCB underside),
  `TOP = Z0 + 1.6` (1.6 mm PCB). Figure frame size = `[MW, MD, TOP + (B.height || 22)]`.
- The view frames the bounding box so the object fills about 74% of the width / 88% of the height of a 4:3 viewBox, nudged right
  of centre (`core:297-311`). `INK_K = viewBoxWidth / 585` rescales every stroke width and the wobble filter (`core:186-188`).
- Live values: Uno mat 63.3 x 89.6, viewBox 178.9 x 134.2, INK_K 0.306; LED 89 x 79 (196.6 wide); Transistor 82 x 87 (197.8);
  ESP32 56.4 x 81.7, Z0 14 (standoff 11) (161.6); TB6612 78.3 x 100.4 (209.1); L298N 104 x 112 (252.8).

### 2.2 `defineBoard({...})` API, every field

Board-level fields (header doc `eng:14-31`, plus fields the engine reads but the header does not list):

| field | type / default | where it is used |
|---|---|---|
| `key` * | string | URL hash, nav href, `localStorage rb-<key>`, tracking |
| `fig` * | number | sort order, "Fig. NN" (padStart 2) |
| `month` | 0..5 | nav grouping (not in the header doc) |
| `name` *, `sub` * | string | header, nav |
| `hint` | string, default "build it, solder it, power it, break it" | header right |
| `height` | mm above TOP, default 22 | frame headroom |
| `pcb` * | `{ w, d, r (default 2), pal (default 'cobalt'), mat:{back,front,right,left}, standoff (default 4) }` | geometry, palette |
| `holes` | `[[u,v],...]` | gold standoff cylinders (r 1.5, mat to Z0) plus tin ring r 2.4 and hole r 1.5 |
| `silk` | `[[u,v,'TEXT',size,flip?],...]` | silkscreen text (`#fbf8ee`, weight 800) |
| `deco` | `[[[u,v],...],...]` | decorative copper traces |
| `sig` | `{ name:[[u,v],...] }` | copper paths signals ride on; `up` = upload path, `pwr` = power path |
| `parts` * | array | see part fields |
| `power` * | `{ usb: 'J1' (part whose +y face takes the plug) or (st)=>({xm,y,zc,w}), plug:'b'\|'c'\|'micro' (default 'b'), zc }` | USB plug drawing and the plug/evaluate rules |
| `needs` | ids that must be soldered for power | `evaluate()` |
| `run` | ids that must be soldered to run code; `run[0]` is the default "working" tag | `evaluate()`, `labels()` |
| `uploadNeeds` | ids that must be soldered for uploads | `runMode()` |
| `powerLabel` | default "Plug / unplug USB" | power button text |
| `powerMsg` | default "Powered: the program starts" | toast after a good power-up |
| `modesLabel` | default "Upload sketch" | mode picker button |
| `codeLabel` | default "Try it yourself" | lesson heading |
| `termLabel` | default "Serial monitor" | lesson heading; first terminal line is `-- <termLabel lowercased> --` |
| `modes` * | `{ key: mode }` | see mode fields |
| `mode` | default mode key | |
| `init(st)` | runs after `st` is created, before parts are placed | per-board state |
| `periph(st,o)` | `-> [{ bb:[x0,x1,y0,y1,z0,z1], svg }]` | things on the mat, depth-sorted with the parts, get cast shadows |
| `under(st,o)` | `-> svg` | drawn under the PCB slab (breadboards) |
| `wires(st,o)` | `-> svg` | drawn after parts and peripherals |
| `after(st,o)` | `-> svg` | drawn after wires (jumper cap, RGB glow, WiFi waves, heat shimmer, extra tags) |
| `signals(st,o)` | `-> [{ path, speed=.8, n=2, col='#f7a531' }]` | dots along `sig[path]` while running |
| `stats(st,o)` | `-> [{ label, value, small }]` | appended after the engine stats, only while running |
| `tags` | `[[id, [dx3,dy3,dz3], screenDx, screenDy], ...]` | part labels (section 2.13) |
| `working(id,st,o)` | `-> bool` | which tags are accent-coloured; default `st.running && id === run[0]` |
| `animating(st)`, `tick(st,dt)` | | extra animation (Fig. 03 motor) |
| `overview` | HTML | "Meet the board" |
| `quiz` | `[{ q, a:[...], ok }]` | "Check yourself" |
| `practice` | text | "Practice task" section (omitted if absent) |
| `matPal` | `{l,m,d}`, default core `BOARD` | mat colour (not used by Fig. 01-06) |

Part fields:

| field | meaning |
|---|---|
| `id` | designator (designator buttons, picker chips, footprint silk text, messages) |
| `name` | full name (Selected part title, designator tooltip, error messages "U1 (ATmega328P microcontroller)") |
| `kind` | `KINDS` key (section 2.3) |
| `g` | 0 = SMD (pick and place + reflow), 1 = low through-hole, 2 = tall through-hole, 3 = goes in last (chip into socket, jumper cap). Drives order rules, solder rules and exploded lift `LIFT = [6,12,18,24]` mm |
| `uv` | `[u0,v0,u1,v1]` footprint in mm |
| `h` | height; used for sorting, tag anchor, iron target (`topOf`) |
| `z` | extra base height (U1 sits 3 mm up on SK1, jumper caps 2.5 mm up on their pins) |
| `short` | tag text; lowercased it is the chip label of non-polar parts ("J1 usb port") |
| `what` | Selected part description |
| `polar` | gives two orientation chips; `opts` default `['stripe front','stripe back']` |
| `opts` | orientation labels `[orient 0 (correct), orient 1 (reversed)]` |
| `fault` | `'pop'`, `'hot'` or `'dark'` for a reversed polar part. Default: `ecap` -> pop, `led`/`led5` -> dark, anything else -> hot |
| `faultMsg` | custom reversed-part message |
| `inSocket` | g3 chip that goes into a socket: different block message, its footprint silk is skipped (unless `noSilk === false`) |
| `noOutline` | no silkscreen rectangle (jumper caps) |
| `col` | LED colour; `powerLed` = lit whenever powered; `rx` / `tx` = flicker during uploads |
| kind options | `label`, `ls`, `n`, `lead`, `th`, `body`, `bands`, `diode`, `spots`, `down`, `pinH`, `rowCol`, `m`, `top`, `ant`, `antLen`, `sinkH`, `legs`, `bodyH`, `sink`, `sinkD`, `fins`, `sinkM`, `rad`, `bodyLen`, `micro`, `face`, `angle(st)`, `sleeve`, `c`, `w`, `lc` |

Mode fields:

| field | meaning |
|---|---|
| `title` | chip label, code heading suffix, `Compiling <title> ...`, `-- <title> --` |
| `code` | text shown in the code panel (highlighted) |
| `bytes` | `Sketch uses <bytes> bytes of program storage` (default 1024) |
| `instant` | no upload: switch immediately; can be chosen while unplugged ("Move jumper", "Send command") |
| `out(st, t)` | returns `o` each frame; `t` = seconds since `runStart`. Engine reads `o.leds {id:bool}` and `o.bright {id:0..1}` |
| `serial(k, st)` | called once each time the whole-second counter `k` changes; returns a line or null |
| `fault(st)` | returns `{ id, kind, msg, stop? }` or null; checked after power-up, after an upload and after an instant switch |

`o` is `{ leds:{} }` when not running or while uploading (`eng:607-610`).

### 2.3 `KINDS` registry (part drawings)

Signature `(r, z, p, c)`: `r` footprint `{x0,x1,y0,y1}`, `z` base, `p` part, `c = { st, o, orient, lit, hot, pop }`. Returns SVG.

| kind | line | draws | options read | reacts to |
|---|---|---|---|---|
| `qfp` | eng:99 | quad flat pack, leads on 4 sides, pin-1 dot, label | `lead` 1.0, `th` 1.1, `n` 8 per side, `body`, `label`, `ls` 1.45 | |
| `soic` | eng:112 | 2-sided package, orientation from footprint | `n` 4 per side, `lead`, `th` 1.5, `body`, `label`, `ls` 1.25 | |
| `sot223` | eng:125 | tab + 3 legs | `label` | |
| `sot23` | eng:132 | small 3-leg | | |
| `xtal` | eng:134 | metal can crystal | `h` 3.6, `label` '16.000' | |
| `led` | eng:140 | SMD LED, body + lens | `col` | lit: lens lightens + glow |
| `chip` | eng:146 | 0603/0805 resistor (black) or capacitor (`c:true`, tan) | `c` | |
| `passives` | eng:152 | scatter of tiny chips | `spots [[u,v,'c'\|'r',alongU?]]` | |
| `socket` | eng:155 | DIP socket, notch at y0, pins = round(len/2.54) per side | | |
| `dip` | eng:167 | DIP chip, notch + pin-1 dot, label lines split by `\|` | `label`, `inSocket` | orient (notch end and text flip), hot (red tint) |
| `tact` | eng:182 | tactile switch | | |
| `male` | eng:184 | male header rows x cols (2.54 pitch) | `down` (plastic only), `pinH` 8.4, `rowCol`, `body` | |
| `female` | eng:194 | female header with holes | `h` 8.5 | |
| `ecap` | eng:200 | standing electrolytic, minus stripe faces +x at orient 0 | `h` 7, `sleeve` | orient (stripe side), pop (vented domed top) |
| `usbb` | eng:214 | USB-B receptacle, 10.9 high | | |
| `usbc` | eng:223 | USB-C or micro-USB (`micro`) on the +y face (or `face:'x'`) | `micro`, `face` | |
| `jack` | eng:237 | barrel jack, 11 high | | |
| `fuse` | eng:243 | polyfuse | `body` (green) | |
| `axial` | eng:247 | flat resistor/diode with colour bands | `bands` (BAND keys), `diode`, `rad` 1.15, `bodyLen`, `body` | diode: band end flips with orient |
| `led5` | eng:261 | 5 mm through-hole LED | `col`, `legs` 4 | orient 1 = stays dark; pop = dead brown body; `o.bright[id]` sets lens tint and glow radius `4 + 9*br` |
| `to92` | eng:275 | TO-92, flat face +x at orient 0, label | `label` '2N2222' | orient (flat face side, label hidden when reversed), hot |
| `to220` | eng:286 | TO-220, optional finned heatsink | `sink`, `sinkD` 6, `fins` 7, `sinkH` 22, `sinkM`, `legs` 3, `bodyH` 9, `label` | hot |
| `term` | eng:302 | screw terminal block, wire entries on +x or +y face | `n` (default round(len/5)), `th` 10, `body` (green TERMG / blue TERMB) | |
| `pot` | eng:314 | trimpot | `angle(st)` degrees, `th`, `body` | |
| `module` | eng:323 | WROOM-style module: substrate, shield can, zigzag PCB antenna | `ant:'y0'` flips antenna end, `antLen` 6, `label` 'ESP32-S3\|WROOM-1' | |
| `inductor` | eng:335 | shielded power inductor | `th` 6, `label` '330' | |
| `cyl` | eng:340 | upright cylinder (test point, can, buzzer) | `m`, `top:'mesh'`, `th` 12 | |
| `box` | eng:349 | generic box with optional label | `th`, `m`, `w`, `label`, `ls`, `lc` | |
| `irpair` | eng:351 | IR emitter/receiver pair | | |
| `slide` | eng:353 | slide switch; knob at 30% when powered, 70% when not | | `st.power` |
| `jumper` | eng:356 | jumper cap block | `th` 6, `m` | |

Added by figures in this slice: `link` (bare wire link, `f02:6-8`), `pinrow` (header soldered from below: pads + stubs, `f04:6-12`),
`rgb` (WS2812 with lens coloured by `o.rgb`, `f04:14-19`), `multiwatt` (L298N Multiwatt-15 on a 9-fin heatsink, `f06:7-22`).
Added in part B figures: `stubs`, `sinkTop` (Fig. 07), `servoHdr`, `apads` (Fig. 08), `to263`, `smddiode`, `trim3296`, `seg7` (Fig. 12),
`soc`, `ffc`, `jst`, `rj45`, `usba2`, `cooler` (Fig. 13).

Materials (`eng:35-54`): BLK, GOLD, TIN, SLEEVE (blue cap sleeve), STRIPE, CHIPC, FUSE, LEDBODY, BOOT (cable grey), TERMG, TERMB, POTB,
RESB (resistor beige), WOODB, YEL, `SILK #fbf8ee`, `HOLE #2b2825`, `PAPER_W`. Wire colours: red `#e2483d`, blk `#3a3632`, yel `#f2c230`,
grn `#43b05c`, blu `#3e86d9`, org `#f08a2b`, wht `#ece6d6`, pur `#8c4bd1`. Resistor bands: blk, brn, red, org, yel, grn, blu, vio, gry, wht, gld.
Helpers: `tube(pts, r, mat)` (smoothed wire with ink outline + highlight, `eng:82`), `jumper(a, b, mat, arc=10, r=.55)` (arched jumper
wire, `eng:89`), `glowDot` (`eng:91`).

### 2.4 `PERIPH` registry (things on the mat)

| peripheral | line | what | returns |
|---|---|---|---|
| `nano(x0,y0,st)` | eng:363 | Arduino Nano 18 x 43 mm on gold standoffs, 328P chip, "NANO" silk, 2x15 pads, mini-USB on the +y end, green power LED when `st.power` | `{ item, usb:{xm,y,zc,w,z0}, pin(side,k) }` |
| `battery(x0,y0,kind,label,st,size=[22,40,14])` | eng:380 | `'aa'`: black 4xAA holder with red/blue cells; `'lipo'`: dark pack with yellow label "7.4V" + "LIPO" | `{ bb, svg, plus, minus }` |
| `motor(x0,y0,a,st,{R=13,hub})` | eng:395 | TT gear motor: metal can, yellow gearbox 22x19x19, tyre + coloured hub + 5 spokes rotating by angle `a` | `{ bb, svg, term }` |
| `servo(x0,y0,deg,st,col)` | eng:413 | SG90-style servo with horn (part B) | |
| `stepper(x0,y0,a,st)` | eng:425 | NEMA17 42x42x40 with red pointer flag (part B) | |
| `block(x0,y0,w,d,h)` | eng:436 | wooden block | |
| `meter(x0,y0,text,unit,st)` | eng:438 | yellow multimeter 34x20x6, dark LCD with green text + unit, rotary dial | `{ bb, svg, probe, com }` |
| `screen(x0,y0,w,h,draw)` | eng:447 | small standing display (part B) | |
| `strip(x0,y0,x1,y1,lineY,lw=4)` | eng:457 | paper strip with a black line (part B) | |

### 2.5 Scene drawing order (`scene()`, `eng:646-719`)

1. Mat slab (`board(0,0,MW,MD, h 3, r 4)`, colour `B.matPal || BOARD`) plus a 10 mm grid (`mat.m`, opacity .5).
2. Cast shadows of the PCB and every peripheral bounding box, clipped to the mat (peripheral shadows at opacity .8).
3. Standoffs for `holes`. 4. `B.under`. 5. PCB slab (palette `m`, ink outline, heavy hull ink 2.6).
6. Copper: all `deco` + `sig` paths, two strokes (1.5 dark `mix(m.l,#000,.08)`, .8 light `mix(m.l,#fff,.22)`).
7. Hole rings. 8. Silk text.
9. Footprints for every part: silk rectangle (padding .35 SMD / .45 THT; no rectangle for `passives` and `noOutline` parts; socketed
   g3 chips skip the whole footprint because the socket's footprint is already there).
   When the part is not set, or the exploded view is above .2: pads or holes (header holes, chip pads, tinted SMD pad, two THT holes)
   and the designator text (2.2 if the smaller footprint side > 4 mm, else 1.5; none for `passives`).
10. Parts and peripherals, sorted by bounding boxes (`sortItems`, a greedy topological sort on "fully behind in x, y or z").
    Every part is wrapped in `<g data-act="part" data-id="ID">` (clickable).
11. Reflow glow: `#ff8a3d` over the PCB top, opacity `.32 * sin(pi * reflow)`.
12. Signal dots (`dot3`, r .85 or .7, ink outline): upload = 5 green `#8af0ae` on `sig.up` at `upT*3 + k/5`; power = 3 yellow `#ffd25e`
    on `sig.pwr` at `t*.45 + k/3`; board `signals` while running at `t*speed + k/n`.
13. `B.wires`, `B.after`.
14. LED glows: radial gradients `glow0..3` for `#f7a531` (amber, also the fallback), `#43c25c`, `#3e86d9`, `#e2483d`.
15. USB plug and cable (`usbPlug`), soldering iron (`ironSvg`), smoke puffs, tags (`labels`).

### 2.6 State object `st` (`eng:1040-1042`)

| field | meaning |
|---|---|
| `pal` | palette key |
| `placed` | `{ id: { orient 0\|1, t (drop progress, <0 = waiting, 1 = landed), sold, leave? } }` |
| `ex`, `exT` | exploded view value and target (0..1) |
| `usb`, `usbT` | plug animation value and target (0..1) |
| `evald` | evaluate() already ran for this plug-in |
| `power`, `running` | supply on; program running |
| `fault` | `{ id, kind:'hot'\|'pop'\|'dark', msg, stop? }` or null |
| `mode`, `pending` | running mode; last picked mode (the code panel shows `pending`) |
| `runStart`, `secs` | program start time; last whole second passed to `serial()` |
| `upT` | upload progress, -1 when idle |
| `reflow` | reflow progress or null; `pnp` = pick and place running |
| `iron` | `{ list, i, t, from, pos, dwell }` or null |
| `smoke` | puff particles |
| `sel` | selected part id |
| `serial` | terminal lines (last 9 kept) |
| `quiz` | `{ questionIndex: chosenIndex }` (not persisted) |

Predicates (`eng:600-606`): `isIn(id)` placed and not leaving; `isSet(id)` isIn and `t >= 1` (landed); `isSold(id)` isSet and
(`sold` or `g === 3`). `partZ = TOP + ease(ex)*LIFT[g] + (p.z||0)`; `dropZ = (1 - ease(clamp01(t))) * 34` mm;
`topOf(id) = [centre x, centre y, partZ + dropZ + h]`. `ease` is easeInOutQuad (`core:75`).

### 2.7 The Bench buttons (in order) and the build flow

Caption above the buttons: "Bench". Every `.act` press plays `tick` (capture listener, `eng:967-969`).

**1. "Strip to bare PCB"** (`strip`, `eng:887-894`)
- If plugged: unplugs silently. Resets exploded view, iron, pick and place, reflow, selection.
- Nothing placed: toast "The board is already bare" (1500 ms, `tick`).
- Otherwise every part leaves: sorted by group descending, `t = 1 + k*.04`, `t` falls 2.8/s, the part rises 34 mm and disappears
  (g3 first, SMD last). Sound `whoosh`. (live: status BARE PCB, parts 0/24 within ~1.6 s.)

**2. "Pick & place SMD"** (`pickAndPlace`, `eng:847-856`)
- Guards in order: plugged -> "Unplug the power first: never work on a live board"; exploded -> "Close the exploded view first";
  no g0 parts -> "No SMD parts on this board: everything is through-hole. Use Place a part" (2600 ms);
  all SMD already in -> "The SMD parts are already on the board" (`tick`).
- Places the missing SMD parts with `t = -k*.22` (so a new part starts falling every 0.092 s; each falls in 0.42 s at 2.4/s).
  `machine` sound when each starts falling, `place` when it lands. No pick-and-place head is drawn: parts simply drop from 34 mm.
- When all g0 parts are set: reflow starts (`oven` sound), lasts 1.3 s (orange glow pulse), then every g0 part is soldered and the toast
  "Reflow oven: 245 C melts the solder paste under every pad" (2400 ms, `ding`). (live Uno: 11 parts down in ~1.35 s, toast at +2.65 s.)
- While the SMD parts are landed but not reflowed, the "To solder" stat counts them.

**3. "Place a part ▾"** picker (`eng:1060-1065`, `placeChoice` `eng:825-838`, `blockOf` `eng:839-846`)
- Lists only parts with `g >= 1`, in `parts` order. Chip label: polar parts give two chips `<id> <opts[0]>` and `<id> <opts[1]>`;
  others one chip `<id> <short lowercased>` (for example "SK1 socket", "J1 usb port", "TP1 tp+").
- Chip state: `current` if placed in that orientation; `disabled` if not placed and blocked; `why` = the block message.
- Block rules (order matters):
  1. `g >= 1`, the board has SMD parts and not all are soldered: "SMD parts first: run pick and place + reflow. The oven would melt plastic parts"
  2. `g === 2` and not every g1 part is in (placed, landing counts): "Low parts first: with tall parts on, the board rocks and loose parts fall out when you flip it to solder"
  3. `g === 3` and not every g1+g2 part is soldered: socketed chip -> "Solder everything first. Never heat a chip sitting in its socket"; otherwise -> "Solder everything first: this part goes on last"
- `placeChoice(id, orient)` guards: plugged -> "Unplug the power first: never work on a live board"; exploded -> "Close the exploded view first".
- Already placed:
  - same orientation or non-polar: "`<id>` is already on the board" (`tick`). Unreachable through the picker because core intercepts current
    chips with "`<label>` — already set" first.
  - other orientation (flip): orientation changes, the part re-drops (`t = 0`), `whoosh`, toast "Pulled `<id>` out and turned it round" (g3)
    or "Desoldered `<id>`, flipped it, soldered it again". **The solder flag is kept**, and flips ignore the block rules.
- New placement: `{ orient, t:0, sold:false }`, **the part becomes selected** (Selected part card + accent tag), `whoosh`, then `place`
  (or `snap` for g3) when it lands.

**4. "Solder joints"** (`solderAll`, `eng:857-867`; iron animation `eng:774-781`)
- Guards: plugged -> PULL_FIRST; exploded -> "Close the exploded view first"; iron already working -> ignored silently.
- List = g1/g2 parts that are set (landed) and unsoldered, sorted back to front (`depthOf`). Empty list:
  any g1/g2 part in -> "Every through-hole joint is already soldered", else "Nothing to solder yet: place a part first" (2000 ms, `error`).
- The iron (metal tip + tomato handle) starts 14/-10/+30 mm from the first part, eases to each part top in .35 s, dwells (3 smoke wisps,
  `solder` sound) and marks it soldered at .9 s, then the next. After the last it flies away (+30, -18, +40 mm/s) for .6 s, then toast
  "Every joint soldered: shiny, concave, no blobs" (1800 ms, `ding`). Live: 6 joints took about 6.1 s; "To solder" counts down.

**5. Power button** ("Plug / unplug USB" by default) (`plug`, `eng:868-873`; `unplug` `eng:800`)
- If plugged: unplug: `usbT = 0`, power/running/fault cleared, upload cancelled, log "-- power off --", `unplug` sound.
- Guards: exploded -> "Close the exploded view first"; `power.usb` is a part id and that part is not set -> "There's nothing to plug into: place J1 first".
- Otherwise the plug slides in 22 mm along +y at 2.2/s (0.45 s), `whoosh`, then `plug` sound and `evaluate()`.
- Plug drawings (`eng:726-734`): `'b'` USB-B (shell `w-4.2` x 7.1, boot `w-2.4` x 8.5 x 9), `'micro'` (6.8 x 1.8 shell, 9 x 5.5 boot), `'c'`
  (8 x 2.4 shell, 11 x 6 boot); a grey cable tube runs to the mat edge and along it.
- Peripheral-powered boards (`power.usb` is a function: the USB goes into a Nano on the mat) can be plugged in on a bare board.

**`evaluate()`** (`eng:812-823`), in order:
1. `power.usb` is a part and not soldered: "`J1` isn't soldered: the power pins don't touch the copper" (2600 ms). The plug **stays in**.
2. Each `needs` id not soldered: "No power: `<id>` (`<name>`) is missing or unsoldered" (2800 ms). Plug stays in, status not powered.
3. `power = true`, log "-- power on --".
4. Reversed soldered polar part (first in `parts` order): fault (section 2.9). For `dark` faults the program also starts.
5. Each `run` id not soldered: `power` sound, "Powered, but `<id>` (`<name>`) is `missing` | `not soldered`: nothing runs" (2800 ms). Status POWERED.
6. `running = true`, `runStart = now`, `mode = mode || B.mode`, track run, `power` sound, toast `powerMsg` (2000 ms), then the mode's fault check.

**6. Mode picker** ("Upload sketch ▾" by default) (`eng:1068`, `runMode` `eng:874-886`)
- Chips = every mode title; `current` = running in that mode and not uploading (so when stopped no chip is current).
- `runMode(name)` sets `st.pending = name` **first** (the code panel switches to that sketch immediately), then:
  1. Not plugged: instant -> sets `mode`, "Set. Now power the board to see it"; upload -> "Power the board first" (2000 ms, `tick`).
  2. Non-dark fault: "Fix the fault first: unplug, then correct `<id>`".
  3. Not powered: "No power: check the supply parts".
  4. Uploading: "Uploading: wait for it" (1400 ms, `tick`).
  5. Instant: clears the fault (even a dark one), switches mode, restarts the clock, `click` sound, log `-- <title> --`, mode fault check.
  6. `uploadNeeds` missing: log "avrdude: ser_open(): can't open device", toast "`<id>` (`<name>`) is missing: the computer sees no board" (2800 ms).
  7. Not running (no chip): log "avrdude: programmer is not responding", toast "No working chip: the upload times out" (2600 ms).
  8. Upload: `upT = 0`, `running = false`, log `Compiling <title> ...` and `Sketch uses <bytes> bytes of program storage`, `upload` sound.
     Lasts 2.2 s (status UPLOADING, RX/TX flicker, green dots run 3 laps of `sig.up`). Then `mode = pending`, clock restarts, log
     "avrdude: flash verified", "Done uploading.", `ding`, mode fault check.

**7. "Exploded view"** (`toggleExplode`, `eng:895-899`)
- Nothing placed: "Nothing to take apart: the board is bare". If plugged: unplug silently + toast "Unplugged before taking it apart" (1600 ms).
- Toggles `exT`; `ex` moves 1.6/s (0.63 s) with easing; parts lift by group: SMD 6 mm, low THT 12, tall THT 18, last parts 24.
  Footprints, pads and designators show under the lifted parts. `whoosh`.
- While exploded, Pick & place, Place a part, Solder joints and the power button all answer "Close the exploded view first".
  Uploads answer "Power the board first" (the board was unplugged). Strip still works (and resets the view).

### 2.8 State machine

```
 Build axis
   BARE PCB
     | Pick & place SMD (boards with no SMD skip this step)
     v
   SMD placing (a new part every 0.09 s, each falls in 0.42 s) --all landed--> reflow 1.3 s --> SMD soldered
     | Place a part: any g1 part, any order, either orientation
     v
   all g1 in --> Place g2 parts (allowed once every g1 part is in, soldered or not)
     | Solder joints (iron, 0.9 s per joint, landed parts only; can be pressed between placements)
     v
   all g1+g2 soldered --> Place g3 (snaps in, counts as soldered) --> READY
   "Strip to bare PCB" returns to BARE PCB from anywhere (unplugging silently first).

 Power axis (independent of build progress; plug, unplug, explode and strip move between these):
   UNPLUGGED --plug--> inserting 0.45 s --evaluate()-->
        |-- usb part unsoldered / needs missing --> plug in, NOT powered (status stays ASSEMBLING/READY...)
        |-- reversed polar part --> FAULT (hot/pop, program stopped)  or  CHECK <id> (dark, program running)
        |-- run part missing --> POWERED (supply on, nothing runs)
        '-- ok --> RUNNING(mode) --upload--> UPLOADING 2.2 s --> RUNNING(new mode) (+ mode fault check)
                               '--instant mode--> RUNNING(new mode) (+ mode fault check)
   any powered state --unplug / Exploded view / Strip--> UNPLUGGED (fault cleared)
```

Status stat precedence (`eng:1052`): `FAULT` (non-dark fault) > `CHECK <id>` (dark fault) > `UPLOADING` > `RUNNING` > `POWERED` >
`BARE PCB` (0 parts set) > `ASSEMBLING` (fewer than all set) > `NEEDS SOLDER` (all set, some unsoldered) > `READY`.

Engine stats (top right, `eng:1050-1055`): "Parts" = `set/total` (for example 24/24), "Status" (small), "To solder" (small, only when
loose > 0; loose = set but not soldered, g3 counts as soldered), then the board's own stats only while running.

### 2.9 Faults (`polarFault` `eng:801-810`, `setFault` `eng:811`)

- Default reversed messages (verbatim):
  - pop: "Pop! `<id>` is in backwards: reverse voltage vents an electrolytic. Unplug and flip it"
  - dark: "`<id>` is in backwards: an LED only conducts one way, so it stays dark. Unplug and flip it"
  - hot: "`<id>` is in backwards: power lands on the wrong pins and it is cooking. Unplug and turn it round"
- Only **soldered** reversed parts fault (a placed, unsoldered reversed part is ignored).
- `setFault`: track, `st.fault`, `running = (kind === 'dark' && !stop)`, sound `pop` / `error` (dark) / `buzz` (hot), plus `sizzle` 150 ms
  later for non-dark, toast 3600 ms.
- Visuals: hot = the part body pulses toward red `#e2483d` (mix `.35 + .25*sin(6t)`; only `dip`, `to92`, `to220` and `multiwatt` draw this tint, other hot parts such as the Fig. 03 diode only smoke); pop = electrolytic top bulges with a vent cross,
  a dead `led5` turns brown with no highlight; non-dark faults emit smoke (spawn probability `9*dt` per frame, puff r `1.8 + 5*age`,
  opacity `.7 - .6*age`, rises 9 mm/s, drifts -2 mm/s in x, lives 1.1 s, `#8d887e`); power LEDs flicker during a hot fault
  (`off when sin(37t) > .3`); the faulted LED itself is dark.
- A fault clears only on unplug (or Strip / Exploded view, which unplug). An instant mode switch also clears it (bug for dark faults, section 10).

### 2.10 LEDs and signals (`ledLit`, `eng:611-617`)

- No power: dark. Faulted part: dark. `powerLed`: lit (flicker during hot faults). While uploading: `rx` LEDs lit when `sin(41t) > -.2`
  (flicker), `tx` LEDs lit when `upT > .75 && sin(53t) > 0` (only in the last quarter). Otherwise `o.leds[id]`.

### 2.11 Timing

- Animations use `ui.animate`: a `setTimeout(16 ms)` loop (about 60 fps, `dt` capped at .05 s) that runs while `tick()` reports busy
  (`kick`, `eng:757-758`). Rates: drop 2.4/s, leave 2.8/s, explode 1.6/s, USB 2.2/s, reflow 1/1.3 s, upload 1/2.2 s.
- A `setInterval(90 ms)` (`eng:792-797`) calls `serial()` when the whole-second counter changes and re-renders while powered and idle
  (about 11 fps, enough for blinking LEDs).

### 2.12 Serial monitor / terminal

- `log(...lines)` keeps the last 9 lines (`eng:798`). First line `-- serial monitor --` (or `-- bench notes --` on Fig. 02).
  Engine lines: `-- power on --`, `-- power off --`, `-- <title> --`, `Compiling <title> ...`, `Sketch uses N bytes of program storage`,
  `avrdude: flash verified`, `Done uploading.`, `avrdude: programmer is not responding`, `avrdude: ser_open(): can't open device`.
- Styled `.term`: dark green `#1d2a26`, text `#8af0ae`, 12 px mono, min-height 128 px, `white-space:pre-wrap`.

### 2.13 Selection, tags and the Labels switch

- Click a part (pointerdown on its `data-act="part"` group) or a designator button: toggles `st.sel`, `tick` sound, track `part`.
  New placements are auto-selected.
- Selected part card `#pinfo` (`eng:1017-1019`): `<span class="k">ID · on the board|in the parts bin</span><b>name</b>what`; nothing
  selected: `nothing selected` + "Click any part on the board, or a designator below."
- Tags (`labels`, `eng:743-754`): for each `B.tags` entry whose part is set and not selected, a cream pill (`#fff4d6`, ink border, 8.6 px
  bold mono text = `short`) with a leader line and dot at `[cx + dx3*halfX, cy + dy3*halfY, lerp(partZ, top, dz3)]`, offset
  `(sdx, sdy) * INK_K`. `working(id)` true -> pill takes the accent colour. The selected part gets its own pill at offset (30, -30),
  always accent.
- "Labels" button (`core:370-373`): toggles `html.nolabels` (hides every `.tag`, including board-drawn ones such as MOTOR A), text
  "On"/"Off", `aria-pressed`. The control only appears if the figure draws at least one tag. `?labels=0` starts hidden.

### 2.14 Hand-drawn wobble and Colour (core)

- SVG filter `#hand` (`core:245-253`): `feTurbulence` (baseFrequency `.045/K`) -> `feDisplacementMap id="wob"` (scale = slider x INK_K),
  plus multiplied grain (`.9/K`) and blotch (`.012/K`) noise. Slider "Hand-drawn wobble": range 0..7, step .1. The bench sets it to **0**
  on mount (clean lines). Live: value 3 on the Uno -> `scale 0.92`.
- "Colour": five round swatches (`.sw`, 26 px, `title` = key, pressed outline) for `PALS` mustard `#f4b829/#d49c1f/#4e4a18`, tomato
  `#ef6a4c/#cf5038/#4a2219`, mint `#93d3b0/#71b693/#1f4034`, cobalt `#76a0e2/#5a82c6/#1c2948`, blush `#f3a6bb/#d8869c/#4b2430`.
  Recolours the PCB and the accent. Not persisted. Board defaults: Uno cobalt, LED mint, Transistor mint, ESP32 cobalt, TB6612 tomato,
  L298N tomato. `?pal=<key>` overrides.

### 2.15 Lesson panel (`shell()`, `eng:971-1028`)

Two columns under the controls:

| left column | right column |
|---|---|
| "Meet the board" (`overview` HTML) | `<codeLabel> · <mode title>` + `pre.code` |
| "Selected part" (card) | `<termLabel>` + terminal |
| "Parts on this board" (designator buttons) | "Check yourself" (quiz) |
| | "Practice task" (only if `practice`) |

- Section headings: 11 px 600 uppercase muted, letter-spacing .08em. `.card`, `pre.code`: 1.5 px ink border, radius 12, hard shadow 3 px, `#fbf8f0`.
- Designator buttons (`.plist`): one per part (all groups) in `parts` order, `title` = part name; class `out` (opacity .4, no shadow)
  when the part is not set; `aria-pressed` when selected (ink fill).
- Code highlighter (`eng:1002-1011`): one regex pass per line: strings `"..."`/`'...'` -> `.s` (`#a3471f`); comments `//...` or a `#`
  preceded by start/space and followed by a space -> `.c` (`#8a8172`); keywords `void int bool float unsigned long for if else while return
  def import from class const uint8_t uint16_t True False None self` -> `.kw` (`#2f5fa8`, bold). Everything else HTML-escaped.
- `sync()` (`eng:1013-1025`) runs after every render but only rewrites the DOM when `sel`, `pending`, the serial lines or the set-parts
  bitmap change. The code panel shows `B.modes[st.pending]`.

### 2.16 Quizzes and progress (`eng:989-1000`)

- Always visible under "Check yourself", from the start (not gated by building). Each question: `<p>N. question</p>` and its options as chips.
- Click an option: `st.quiz[i] = j`. Wrong: chip gets `.no` (line-through, opacity .5), `buzz`, toast "Not quite: think about what the
  hardware does". Right: chip gets `.ok` (green `#43c25c` background), `chime`. You can click again to change an answer; no lock, no score.
- When every question holds its correct answer: `<p class="done">Board mastered. <a href="#next">Fig. NN is next.</a></p>` (800 weight,
  uppercase), `localStorage['rb-<key>'] = '1'`, track `mastered`, and the active nav span becomes `Fig. NN · done`.
- Persistence: only the mastered flag. Answers reset on reload and on every board switch. Changing an answer after mastery removes
  the "Board mastered" line but keeps the flag (live).

### 2.17 Sound (all synthesised, no files) (`eng:464-567`)

- Graph: `AudioContext` created lazily on the first sound -> `DynamicsCompressor` -> destination. Music bus gain (0 -> .9, time constant
  .6 s on / .25 s off) -> lowpass 2400 Hz Q .3 -> compressor. Effects bus gain .55 -> compressor. A 2 s white-noise buffer and a 3 s
  vinyl-crackle buffer (impulses with probability .0009 x amplitude .9 plus noise .012).
- Controls (row "Sound", `eng:961-966`): "Lofi" (with a 3-bar equaliser that animates while on, `aria-pressed`, default off, not
  persisted, tracked) and "Effects" (default on, persisted as `localStorage rb-audio = {"sfx":bool}`, plays `chime` when switched on).
- Live: the auto-plug at mount plays sounds before any user gesture, so Chromium logs "The AudioContext was not allowed to start" and
  those first sounds are silent.

Lofi loop (`LOFI`, `eng:504-543`): 74 bpm, 16 steps per bar (16ths), 4-bar loop, swing: odd 16ths delayed by .09 beat.

| voice | when | sound |
|---|---|---|
| chords | step 0 of each bar | rhodes (sine x1 + sine x2 at .18 + triangle x3.01 at .05, random detune ±4.5 cents, attack .012, decay tc .7 to 35%, release .45), strummed 18 ms apart, 3.6 beats, vol .055. Bars: Dm9 `[50,53,57,60,64]`, G13 `[43,53,59,64]`, Cmaj9 `[48,52,55,59,62]`, "Am9" `[45,55,60,64,67]` (really an Am7 voicing, no B) |
| answer chord | step 10 of bars 2 and 4 | the chord without its root, its 4th and later notes raised an octave, strummed 20 ms apart, 1.2 beats, vol .03 |
| bass | steps 0 (1.4 beats), 7 (+7 semitones, .6 beat), 10 (.6 beat) | sine vol .16, roots D2 G1 C2 A1 (`[38,31,36,33]`) |
| kick | steps 0 and 9, plus 11 in bar 4 | sine 110 -> 42 Hz in .18 s, gain .42 -> .001 in .42 s |
| snare | steps 4 and 12 (+12 ms) | bandpass noise 1700 Hz Q .8 vol .13 for .06 s + triangle 185 Hz .04 s |
| hats | every even step | highpass noise 7200 Hz .015 s, vol .04 on beats, .028 between |
| melody | steps 3, 6, 14 with 42% chance | random of A4 C5 D5 E5 G5 A5 D5 C5 (`[69,72,74,76,79,81,74,72]`, -2 in bar 2), sine .55 beat vol .045 + octave .3 beat vol .008 |
| crackle | continuous | crackle buffer, bandpass 3200 Hz Q .4, gain .5 |

Scheduler: `setInterval` 40 ms with .2 s lookahead. Turning off fades the bus and stops the scheduler and crackle 900 ms later.

Effects (`sfx(name)`, `eng:544-567`):

| name | synthesis | played when |
|---|---|---|
| tick | square 1800 Hz 12 ms vol .03 | any Bench button, designator or part click; some soft refusals |
| place | sine 220 Hz 40 ms + bandpass noise 2500 Hz 20 ms | a g0-g2 part lands |
| snap | highpass noise 3500 Hz + square 900 Hz 20 ms | a g3 part lands (chip into socket, jumper cap) |
| machine | square 660 Hz then 330 Hz (+50 ms) | the pick and place head starts each SMD part |
| oven | lowpass noise sweeping 400 -> 1600 Hz over 1 s + sawtooth 70 Hz | reflow starts |
| solder | highpass noise 5200 Hz .38 s + bandpass 2800 Hz Q2 .3 s | iron reaches each joint |
| plug | bandpass noise 1400 Hz + sine 140 Hz 30 ms | plug fully in |
| power | triangle C5 G5 C6 (`72,79,84`) 70 ms apart | powered (running or not) |
| unplug | triangle G5 -> C5 | unplug (not silent ones) |
| upload | 14 random square blips 900-2300 Hz every 60 ms | upload starts |
| ding | sine E6 (88) .25 s + B6 (95) | reflow done, soldering done, upload done |
| chime | sine E5 G#5 B5 E6 (`76,80,83,88`) 60 ms apart | right quiz answer, Effects switched on |
| buzz | sawtooth 110 + 116 Hz .18 s | wrong quiz answer, hot fault |
| error | triangle 330 Hz then 262 Hz | default for refusals (`say`), dark fault |
| pop | lowpass noise burst + 70 Hz thump + .9 s bandpass hiss | pop fault |
| sizzle | highpass noise 4000 Hz 1.2 s | 150 ms after every non-dark fault |
| whoosh | bandpass noise sweeping 500 -> 2600 Hz .45 s | place, flip, plug start, strip, explode toggle |
| click | square 1200 Hz 10 ms | instant mode switch |

Motor hum (`window.motorHum`, `f03:6-22`, used by Fig. 03): sawtooth at `40 + 90*level` Hz through a 420 Hz lowpass, gain
`.05*min(1,level)`; plus a square 490 Hz "PWM whine" at gain .05 when the board is in PWM mode. Fades out 250 ms after the last call.
Silent when Effects is off or the level is below .02.

### 2.18 URL parameters, hash, test hooks

| param | effect |
|---|---|
| `#<key>` | which board; changing it remounts |
| `?bare=1` | start with nothing placed, no auto-plug |
| `?usb=0` | start assembled but unplugged |
| `?ex=1` | start exploded (auto-plug skipped because exploded) |
| `?flip=ID,ID` | start with those placed parts reversed (live: `?flip=C1` pops C1 at power-up) |
| `?sel=ID` | start with a part selected |
| `?mode=KEY` | start in that mode (live: `?mode=hello` prints `hello, robot #0..`) |
| `?pal=KEY` | palette (core) |
| `?labels=0` | labels hidden (core) |
| `?press=Label@ms,Label>Choice@ms` | clicks buttons by text prefix at those times (core test hook); unknown labels are written to `<html data-errors>` |
| `?track=1` | enables tracking on localhost |

`window.__st` exposes the state; script errors accumulate in `document.documentElement.dataset.errors` (`core:270, 377`).

### 2.19 Usage tracking (`eng:569-592`)

Anonymous visitor id `localStorage rb-vid`, random session id; events queued in memory (max 400) and sent as one JSON body to
`/api/track` with `navigator.sendBeacon` (fetch keepalive fallback) when the tab is hidden or on `pagehide`. Body: `{ v, s, t0, first,
ref (referrer, 200 chars), lang, w (innerWidth), dur, ev:[{k, t, ...}] }`. Events: `board {b}`, `part {b,p}`, `btn {b,l}`, `pick {b,l}`,
`quiz {b,i,ok}`, `mastered {b}`, `fault {b,p}`, `run {b}`, `lofi {on}`. Off on localhost (unless `?track=1`) and when
`localStorage rb-owner === '1'` (set by an owner dashboard).

localStorage keys in total: `rb-audio`, `rb-<boardKey>`, `rb-vid`, `rb-owner`.

---

## 3. Fig. 01 — Arduino Uno R3 (`#uno`, `f01`)

**Identity**: fig 1, month 0 (Start here), sub "meet the board", hint "build it part by part, solder, plug in, upload". Palette cobalt.
Buttons: Strip to bare PCB / Pick & place SMD / Place a part ▾ / Solder joints / Plug / unplug USB / Upload sketch ▾ / Exploded view.

**Real-world model**: Arduino Uno Rev3. PCB 68.6 x 53.3 mm (`pcb.w 53.3` depth x `pcb.d 68.6` width), corner radius 2.4, 4 mounting
holes at uv `[14,2.5] [15.3,50.7] [66.1,7.6] [66.1,35.5]`, 4 mm standoffs. Mat margins back 5, front 5, right 6, left 15 (mat 63.3 x 89.6).
Frame headroom 22. **Nothing else on the mat**: only the board and the USB-B cable.

Silkscreen (`f01:19-21`): "UNO" (7.5), "ARDUINO" (3.4), "DIGITAL (PWM~)", "POWER", "ANALOG IN", "RESET", "L", "TX", "RX", "ON",
"ICSP", and "+" marks by C1 and C2. Copper: fan-out traces to the headers (`f01:10-13`); signal paths `up` (USB to 16U2 to 328P),
`pwr` (fuse to regulators to power header), `p13` (328P to the L LED) (`f01:23-27`).

**Parts** (24; `f01:28-80`). uv in mm (u from left, v from front):

| id | name | kind | g | uv | h | notes |
|---|---|---|---|---|---|---|
| U3 | ATmega16U2 | qfp | 0 | 15.5,31.5,22.5,38.5 | 1.1 | label "16U2", tag USB-SERIAL |
| Y1 | 16 MHz crystal | xtal | 0 | 13.5,25.5,24.5,29.5 | 3.6 | label "16.000", CRYSTAL |
| U5 | LMV358 op-amp | soic | 0 | 29,28.5,34,32.5 | 1.5 | label "358", OP-AMP |
| U2 | NCP1117 5 V regulator | sot223 | 0 | 5.5,14,12,20 | 1.6 | label "1117", 5V REG |
| U4 | LP2985 3.3 V regulator | sot23 | 0 | 21.5,13.5,24.5,16.5 | 1.1 | 3V3 REG |
| F1 | 500 mA polyfuse | fuse | 0 | 2.8,24.4,7.4,27.6 | 1 | FUSE; in `needs` |
| LL | L LED (pin 13) | led | 0 | 24,45.2,26,46.4 | .9 | amber `#f7a531`, tag L |
| LTX | TX LED | led | 0 | 24,42.6,26,43.8 | .9 | amber, `tx` |
| LRX | RX LED | led | 0 | 24,40,26,41.2 | .9 | amber, `rx` |
| LON | ON LED | led | 0 | 57,40,59,41.2 | .9 | green `#43c25c`, `powerLed` |
| RC | Decoupling caps + resistors | passives | 0 | 9,21,40,40 | .55 | 14 spots (9 caps, 5 resistors) |
| SK1 | DIP-28 socket | socket | 1 | 29.5,10.8,65.06,19 | 3 | 14 pins per side; in `run` |
| C1 | 47 uF capacitor (5 V) | ecap | 1 | 13.2,4.6,19.6,11 | 7.3 | polar (stripe front / stripe back) |
| C2 | 47 uF capacitor (VIN) | ecap | 1 | 20.2,4.6,26.6,11 | 7.3 | polar |
| SW1 | Reset button | tact | 1 | 1.6,45.4,7.6,51.4 | 5 | RESET (not pressable) |
| ICSP1 | ICSP header (16U2) | male | 1 | 11.5,43.4,19.12,48.48 | 8.4 | 2x3 |
| ICSP2 | ICSP header (328P) | male | 1 | 61.5,23.5,66.58,31.12 | 8.4 | 2x3 |
| J1 | USB-B jack | usbb | 2 | -6.3,31.75,9.7,43.8 | 10.9 | overhangs the edge by 6.3 mm; takes the plug |
| J2 | Barrel jack | jack | 2 | -1.8,3.3,12.4,12.2 | 11 | POWER JACK (no barrel plug in the sim) |
| H1 | Digital header 8-13 | female | 2 | 17.8,49.5,43.2,52.04 | 8.5 | 10 pins, DIGITAL PINS |
| H2 | Digital header 0-7 | female | 2 | 44.5,49.5,64.82,52.04 | 8.5 | 8 pins, D0-D7 |
| H3 | Power header | female | 2 | 26.7,1.3,47.02,3.84 | 8.5 | 8 pins, POWER PINS |
| H4 | Analog header | female | 2 | 49.5,1.3,64.74,3.84 | 8.5 | 6 pins, ANALOG PINS |
| U1 | ATmega328P microcontroller | dip | 3 | 29.5,10.8,65.06,19 | 7.4 | in SK1 (`inSocket`, z 3), polar "notch right" / "notch left", label "ATMEGA328P" / "-PU  1842" |

Part descriptions (my summaries of `what`): U3 bridges laptop USB to the 328P's UART, which is why Serial.print and uploads work.
Y1 clocks the 16U2 (USB needs a real crystal; the 328P's ceramic resonator would not do). U5 buffers pin 13 for the L LED and decides
USB vs VIN supply. U2 turns 7-12 V from the barrel jack into 5 V; a linear regulator burns the difference, 12 V at 0.5 A is 3.5 W, so
feed it 7-9 V. U4 makes 3.3 V, 150 mA max: enough for a sensor, not WiFi or a servo. F1 resets itself after a 5 V short and protects the
laptop port. LL is LED_BUILTIN on pin 13 through the op-amp. TX flickers when the board sends (Serial.print, end of upload), RX when the
computer sends (most of an upload). ON shows 5 V; dim or flickering means suspect the supply. RC: 100 nF caps beside every IC plus
pull-ups and LED resistors; the caps absorb switching spikes. SK1 lets a dead chip be swapped in seconds. C1 is bulk capacitance on 5 V,
C2 on VIN before the regulator; both polarised (light stripe = minus, + on the silk = plus). SW1 restarts the sketch from setup(),
erases nothing. ICSP1 programs/rescues the USB chip; ICSP2 burns the 328P bootloader over SPI without USB. J1: power (5 V, 500 mA from
a laptop) and data. J2: 2.1 mm centre-positive 7-12 V into the regulator; on a robot use the jack or VIN, never the 5V pin. H1: D8-D13,
GND, AREF, SDA, SCL; D13 is the L LED. H2: D0-D7; PWM on 3, 5, 6, 9, 10, 11; D0/D1 are shared with USB serial. H3: IOREF, RESET, 3.3V,
5V, GND, GND, VIN; fine for sensors, never motors (a stalling motor sags 5 V and causes a brown-out reset). H4: A0-A5 into the 10-bit
ADC (0-1023 for 0-5 V); A4/A5 are also I2C. U1: 8-bit AVR at 16 MHz, 32 KB flash, 2 KB RAM; setup() once, loop() forever; pin 1 by the notch.

**Power and requirements** (`f01:81-83`): USB-B into J1 (`plug:'b'`, `zc 5.4`); `needs ['F1']`; `run ['U1','SK1']`;
`uploadNeeds ['U3','Y1']`; powerMsg "Powered: ON lights, the factory Blink sketch starts"; default mode `blink`.

**Modes** ("Upload sketch ▾", all uploads, 2.2 s each). `pin13(st,t)` (`f01:4-9`):

| key | chip / title | bytes | output | serial |
|---|---|---|---|---|
| blink | Blink | 924 | L LED = `t mod 2 < 1` (1 s on, 1 s off) | none |
| fast | Blink without delay() | 1006 | L LED = `t mod .4 < .2` (200 ms on/off) | none |
| fade | Fade on pin 13 | 1132 | L LED = `(t mod 2.05)/2.05*256 >= 128` (off ~1.03 s, on ~1.03 s, because pin 13 has no PWM) | none |
| hello | Serial hello | 1490 | TX LED lit when `t mod 1 < .09` | every second: `hello, robot #<k>` (k = 0,1,2...) |

Code shown ("Try it yourself · <title>", verbatim, `f01:85-127`):

```cpp
// Blink
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);   // pin 13 = the L LED
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);                    // blocks: nothing else runs
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
```
```cpp
// Blink without delay()
unsigned long last = 0;
bool on = false;

void setup() { pinMode(13, OUTPUT); }

void loop() {
  if (millis() - last >= 200) {   // non-blocking timing:
    last = millis();              // loop() stays free to read
    on = !on;                     // sensors, buttons, serial...
    digitalWrite(13, on);
  }
}
```
```cpp
// Fade on pin 13
void loop() {
  for (int v = 0; v < 256; v++) {
    analogWrite(13, v);   // pin 13 has NO PWM:
    delay(8);             // below 128 it's LOW, above HIGH
  }                       // use a ~ pin (3,5,6,9,10,11)
}
```
```cpp
// Serial hello
int n = 0;

void setup() {
  Serial.begin(9600);     // must match the monitor
}

void loop() {
  Serial.print("hello, robot #");
  Serial.println(n++);
  delay(1000);
}
```

**Stats while running**: "Pin 13" = `HIGH`/`LOW` (small). It reads LOW in Serial hello (pin 13 unused).
**Signals**: amber dots along `p13` while the L LED is lit; yellow power dots on `pwr` whenever powered; green upload dots on `up`.
**Tags** (`f01:131-132`): USB PORT (J1, offset -46,-4), RESET (SW1, 12,-46), DIGITAL PINS (H1, 16,-40), POWER JACK (J2, -42,18),
MICROCONTROLLER (U1, 44,10), ANALOG PINS (H4, 36,34). Accent when: J1 plugged, U1 running, H1 while pin 13 is HIGH.

**Build sequence (live)**: Strip -> Pick & place (11 SMD parts, reflow, toast) -> Place SK1, C1, C2, SW1, ICSP1, ICSP2 (tall parts
greyed with "Low parts first..." until all six are in; U1 greyed with "Solder everything first. Never heat a chip sitting in its
socket") -> Solder joints -> Place J1, J2, H1-H4 -> Solder joints -> Place "U1 notch right" (snaps, no solder) -> Plug -> RUNNING.
Explicit rules: SMD and reflow before any plastic part; low parts before tall parts; solder the DIP socket before the chip; never work
on a live board; close the exploded view before working.

**Failure modes (live-verified unless noted)**:

| trigger | result |
|---|---|
| Plug before J1 is placed | "There's nothing to plug into: place J1 first" |
| J1 placed but unsoldered | "J1 isn't soldered: the power pins don't touch the copper"; plug stays in; no power |
| F1 missing | "No power: F1 (500 mA polyfuse) is missing or unsoldered" (unreachable in normal play: F1 is SMD and always placed/soldered with the others) |
| U1 missing | "Powered, but U1 (ATmega328P microcontroller) is missing: nothing runs"; status POWERED; ON LED lit; power dots flow |
| Upload with no U1 | terminal `avrdude: programmer is not responding`; toast "No working chip: the upload times out" |
| U3 or Y1 missing at upload | `avrdude: ser_open(): can't open device` + "U3 (ATmega16U2) is missing: the computer sees no board" (unreachable in normal play) |
| U1 notch left, power on | hot: "U1 is in backwards: power lands on the wrong pins and it is cooking. Unplug and turn it round"; FAULT; red pulsing chip, smoke, ON LED flickers, buzz + sizzle |
| C1 or C2 stripe back, power on | pop: "Pop! C1 is in backwards: reverse voltage vents an electrolytic. Unplug and flip it"; bulged vent, smoke |
| Upload during a fault | "Fix the fault first: unplug, then correct U1" |
| Upload while uploading | "Uploading: wait for it" (but the refused sketch becomes the one that runs; bug in section 10) |
| Place/flip while plugged | "Unplug the power first: never work on a live board" |

**Lesson text**: overview (summary): the Uno is built around the ATmega328P and is where digitalWrite, PWM, interrupts and serial
debugging first appear; build it the way a factory does (machine-placed SMD and reflow, then through-hole low to tall, then the
iron), plug in, upload, break it on purpose, fix it. Practice task (summary): a reaction-timer game (LED after a random delay, a button
stops the clock, time in ms to serial) using an interrupt, debouncing and millis(), demonstrable in a 15 s video.

**Quiz**: 4 questions (section 9).

---

## 4. Fig. 02 — LED + resistor trainer (`#led`, `f02`)

**Identity**: fig 2, month 1, name "LED + resistor", sub "Ohm's law", hint "build it, power it, move the jumper, read the meter".
Palette mint. Buttons: Strip to bare PCB / Pick & place SMD / Place a part ▾ / Solder joints / **Plug / unplug 5V** / **Move jumper ▾** /
Exploded view. Lesson headings: **"The math · <position>"** and **"Bench notes"** (terminal starts `-- bench notes --`).

**Real-world model**: a teaching board (not a commercial product). PCB 40 x 60 mm, r 2, 4 holes `[3,3] [57,3] [3,37] [57,37]`,
standoff 4. Mat back 5, front 44, right 5, left 14 (89 x 79). Height 14. All through-hole, no SMD.

**On the mat**: a yellow multimeter in front of the PCB (`PERIPH.meter(bx(-6), by(43))`), LCD shows the current and "mA". Red probe lead
from the meter to TP1, black lead to TP2 (drawn once each test point is set). The jumper cap sits on the JP1 row chosen by the
**pending** position, so it moves even while unplugged (`f02:85-89`). USB-C cable into J1.

Silk: "LED TRAINER", "I = V / R", "220", "1K", "10K", "NONE" (beside the four rows), "D1", "+" (LED anode), "ON" (switch).
Power path `pwr` from J1 through the switch, the selected row and the LED.

**Parts** (11; `f02:38-61`):

| id | name | kind | g | uv | notes |
|---|---|---|---|---|---|
| J1 | USB-C power jack | usbc | 1 | -1.2,15.5,6.3,24.5 | 5V IN, takes the plug |
| SW1 | Slide switch | slide | 1 | 10,18,17,22 | POWER; in `needs`; knob follows power, not clickable |
| R1 | 220 ohm resistor | axial | 1 | 22,32,36,34 | red-red-brown-gold |
| R2 | 1 k resistor | axial | 1 | 22,27,36,29 | brown-black-red-gold |
| R3 | 10 k resistor | axial | 1 | 22,22,36,24 | brown-black-orange-gold |
| JL1 | Wire link (no resistor) | link | 1 | 22,17,36,19 | bare wire, 0 ohm |
| TP1 | Test point (+) | cyl | 1 | 40,7,42,9 | red, 4 mm |
| TP2 | Test point (COM) | cyl | 1 | 45,7,47,9 | black |
| JP1 | Jumper header 2x4 | male | 2 | 38,14,43.08,24.16 | JUMPER; in `run` |
| C1 | 100 uF capacitor | ecap | 2 | 9,29,15,35 | polar |
| D1 | Red 5 mm LED | led5 | 2 | 45.5,21,50.5,26 | polar "long leg +" / "long leg -", red; in `run` |

Description summaries: USB-C gives a regulated 5 V so the resistor is the only variable; the switch sits right after the supply, as on a
robot; colour codes are worked out (22 x 10 = 220, 3 V / 220 = 13.6 mA; 10 x 100 = 1 k, 3 mA, usual indicator value; 10 x 1000 = 10 k,
0.3 mA, also the classic pull-up); the link is 0 ohm ("try it, once"); the meter is in series so it reads the LED current; red to +,
black to COM (swapped just shows a minus); the jumper picks the resistor; C1 smooths the plug-in; the LED conducts only anode (long leg)
to cathode (flat side) and red drops about 2 V.

**Power and requirements**: USB-C (`plug:'c'`, zc 1.6) into J1; `needs ['SW1']`; `run ['D1','JP1']`; powerMsg "5 V on: current flows
through the jumper, the resistor and the LED"; default mode `r220`.

**Model** (`f02:10-15`): `V = 5`, `VF = 2.0`. Rows: `r220 {r 220, row 0}`, `r1k {1000, 1}`, `r10k {10000, 2}`, `bypass {0.5, 3}`.
- `I = (V - VF) / R`
- Meter mA = `I*1000` while running and not faulted, else 0. Display `fmt(mA)`: `'OL'` if >= 100, else 2 decimals below 1 mA, 1 decimal otherwise.
- LED brightness `br = clamp(log10(10*mA) / log10(200), .06, 1)`; glow radius `4 + 9*br`. Live: 220 -> br .928, glow 12.3; 1 k -> .642, 9.8; 10 k -> .207, 5.9.
- `P = I^2 * R` shown in the code panel.

**Modes** ("Move jumper ▾", all `instant`):

| key | chip | I | meter | P | serial (every 4 s) |
|---|---|---|---|---|---|
| r220 | 220 ohm | 13.64 mA | 13.6 | 40.9 mW | `I = 3.0 V / 220 = 13.6 mA  bright, safe` |
| r1k | 1 k | 3.00 mA | 3.0 | 9.0 mW | `I = 3.0 V / 1000 = 3.0 mA  dim` |
| r10k | 10 k | 0.30 mA | 0.30 | 0.9 mW | `I = 3.0 V / 10000 = 0.30 mA  barely glowing` |
| bypass | No resistor | 6.0 A | 0.00 after the fault | 18000.0 mW | none |

"The math" panel (template `f02:16-26`, shown for 220; the R line for bypass reads `R        = 0.5   # just the copper: NO resistor`,
the I line `# I = (5.0 - 2.0) / 0.5 = 6.0 A`, the verdict "This is a short circuit."; for 1 k the verdict is "OK."; for 10 k
"Works, but dim." (rule: bypass -> short circuit, mA > 2 -> OK, else dim)):

```python
# Ohm's law, the whole lesson:  I = V / R
V_supply = 5.0     # volts from USB-C
V_led    = 2.0     # forward voltage of a red LED
R        = 220

I = (V_supply - V_led) / R
# I = (5.0 - 2.0) / 220 = 13.64 mA
# a red LED wants 5-20 mA. OK.
P = I * I * R      # heat in the resistor: 40.9 mW
```

**Stats while running**: "Current" = `<fmt> mA` (13.6 / 3.0 / 0.30), "Resistor" = `220 R`, `1000 R`, `10000 R` or `NONE`.
**Tags**: 5V IN (J1), POWER (SW1), JUMPER (JP1), LED (D1), 220R (R1). Accent: J1 plugged, D1 running without fault, SW1 powered.
(Live: the LED and JUMPER pills overlap.)

**Failure modes (live)**:

| trigger | result |
|---|---|
| "No resistor" | pop on D1: "Flash, then dark: with no resistor the LED tries to pass amps and burns out. Unplug, move the jumper back"; FAULT; meter 0.00; LED brown and dead; smoke; the Current/Resistor stats disappear |
| "No resistor" picked while unplugged | "Set. Now power the board to see it"; the LED pops at the next power-up |
| Move jumper during the pop fault | "Fix the fault first: unplug, then correct D1" |
| D1 long leg -, power on | dark: "D1 is in backwards: an LED only conducts one way, so it stays dark. Unplug and flip it"; status `CHECK D1`; still "running"; Current 0.00 mA |
| Move jumper while D1 is backwards | clears the dark fault: status RUNNING and the meter reads 3.0 mA through a reversed, dark LED (bug) |
| C1 stripe back | pop (default message) |
| J1 placed, unsoldered | "J1 isn't soldered: the power pins don't touch the copper" |
| SW1 missing | "No power: SW1 (Slide switch) is missing or unsoldered" |
| D1 (or JP1) missing | "Powered, but D1 (Red 5 mm LED) is missing: nothing runs" |
| Pick & place SMD | "No SMD parts on this board: everything is through-hole. Use Place a part" |

After a pop the LED is fine again once you unplug and replug (a burnt LED should stay dead).

**Build sequence**: no SMD; place the g1 parts (J1, SW1, R1, R2, R3, JL1, TP1, TP2), then the g2 parts (JP1, C1, D1); solder (live:
7 joints took ~7 s); plug. The board can be plugged as soon as J1 is soldered (the needs/run checks then explain what is missing).

**Lesson text**: overview (summary): the first circuit every roadmap skips; 5 V in, a red LED takes about 2 V, the resistor takes the
other 3 V and sets the current (I = V / R); the jumper picks the resistor, the meter is in series, try every position including no
resistor. Practice (summary): build a two-10 k voltage divider in the Falstad simulator, predict the middle voltage by hand, check it,
then swap one resistor for 4.7 k and predict again before looking.

---

## 5. Fig. 03 — Transistor switch (`#transistor`, `f03`)

**Identity**: fig 3, month 1, sub "logic drives power", hint "a 20 mA pin switches a 250 mA motor". Palette mint.
Buttons: Strip to bare PCB / Pick & place SMD / Place a part ▾ / Solder joints / Plug / unplug USB / Upload sketch ▾ / Exploded view.

**Real-world model**: low-side NPN switch board: 2N2222 (TO-92) with a 1 k base resistor, 1N4007 flyback diode across the motor,
100 uF bulk cap, green indicator LED with 1 k resistor, 3-pin logic header, two 2-way screw terminals. PCB 40 x 55 mm, r 2,
3 holes `[2.5,37.5] [52.5,37.5] [52.5,2.5]`. Mat back 5, front 37, right 6, left 26 (82 x 87). Height 24. All through-hole.

**On the mat** (`f03:25-31, 116-145`): an Arduino Nano in front of the PCB at (50, 26) with the micro-USB cable; a 4xAA holder at (52, 2),
size 26 x 22 x 13, right of the Nano; a TT gear motor with a yellow-hub wheel left of the PCB at (19, 66), wheel facing +x.
Wires: three jumpers from the Nano header to H1 (yellow = IN, red = 5V, black = GND); battery leads black/red into J1's front entries;
motor leads red/black from the back of the motor can into J2.

Silk: "NPN SWITCH", "GND 5V IN", "MOTOR", "BATT", two "+", "1K" x2, "1N4007". Signal paths: `base` (header to R1 to Q1 base),
`load` (battery + to the motor), `ret` (motor return through Q1 to battery -).

**Parts** (9; `f03:72-93`):

| id | name | kind | g | uv | notes |
|---|---|---|---|---|---|
| R1 | 1 k base resistor | axial | 1 | 15,10,27,12 | brown-black-red-gold, BASE R; in `run` |
| D1 | 1N4007 flyback diode | axial (diode) | 1 | 12,22.5,24,24.5 | polar "band to +" / "band to -", fault hot + custom message, FLYBACK |
| R2 | 1 k LED resistor | axial | 1 | 16,31,28,33 | LED R |
| Q1 | 2N2222 NPN transistor | to92 | 2 | 30,9,35,14 | polar "flat side front" / "flat side back", fault hot + custom message; in `run` |
| LED1 | Green indicator LED | led5 | 2 | 42,29.5,47,34.5 | green, tag ON, **not polar** |
| C1 | 100 uF capacitor | ecap | 2 | 47,15,53,21 | polar |
| H1 | Logic header IN / 5V / GND | male | 2 | 6,2,13.62,4.54 | 3 pins, LOGIC IN; in `run` |
| J1 | Battery terminal | term | 2 | 36,1,46,8 | 2 screws, green; in `needs` |
| J2 | Motor terminal | term | 2 | 1,20,8,30 | 2 screws, blue; in `run` |

Description summaries: R1 limits base current to (5 - 0.7) / 1000 = 4.3 mA, without it pin and transistor fight; D1 sits across the
motor band toward +, catches the tens-of-volts kick when the coil switches off; R2 gives the LED about 3 mA; Q1: a few mA into the
base lets up to 600 mA flow collector to emitter, hFE about 100, this is how a 3.3 V pin controls a motor; LED1 looks half bright in
PWM because the eye averages, like the motor; C1 covers the start-up gulp of current; H1 carries IN (pin 9), 5V and GND, and GND must
be shared with the battery or the base current has no way home; J1: 4 x AA = 4.8-6 V for the motor only (motor spikes would reset the
controller); J2: the motor sits between battery + and Q1's collector (low-side switching).

**Power and requirements**: micro-USB into the Nano (`power.usb` function: `xm NANO.x+9, y NANO.y+44.2, zc nanoTop+1.95, w 7.6`);
`needs ['J1']`; `run ['Q1','R1','H1','J2']`; powerMsg "Powered: pin 9 goes HIGH and the motor spins"; default mode `high`.
Because the USB goes into the Nano, you can plug in on a bare board (live: "No power: J1 (Battery terminal) is missing or unsoldered").

**Modes** (uploads):

| key | chip | bytes | out | serial |
|---|---|---|---|---|
| high | Input HIGH | 742 | LED1 on, speed 1; sets `st._wasOn = true` | every 3 s: `pin 9 HIGH -> Ib 4.3 mA -> Ic 250 mA (gain x58)` |
| pwm | PWM 50% | 806 | LED1 on at brightness .45, speed .5 | every 3 s: `analogWrite(9, 128) -> 490 Hz, 50% duty -> half speed` |
| low | Input LOW | 690 | speed 0 | once at k = 0: `pin 9 LOW -> Q1 off -> motor coasts to a stop` |

Mode faults: `pwm` with D1 unsoldered -> Q1 hot "No flyback diode: every PWM switch-off the motor coil kicks back ~50 V and punches
through Q1. Unplug, fit D1". `low` right after a run in `high` (`_wasOn`) with D1 unsoldered -> Q1 hot "No flyback diode: when Q1
switched off, the motor coil kicked back ~50 V and killed it. Unplug, fit D1".

Code (verbatim, `f03:33-57`):

```cpp
// Input HIGH
const int IN = 9;          // to R1, then the base of Q1

void setup() { pinMode(IN, OUTPUT); }

void loop() {
  digitalWrite(IN, HIGH);  // ~4 mA into the base...
}                          // ...lets ~250 mA flow through the motor
// a pin gives 20 mA at most: never wire a motor to it
```
```cpp
// PWM 50%
const int IN = 9;          // a ~ pin: hardware PWM

void setup() { pinMode(IN, OUTPUT); }

void loop() {
  analogWrite(IN, 128);    // 50% duty at 490 Hz:
}                          // Q1 switches on and off 490 times a second
// the motor averages it out: half speed (and a whine)
```
```cpp
// Input LOW
const int IN = 9;

void setup() { pinMode(IN, OUTPUT); }

void loop() {
  digitalWrite(IN, LOW);   // no base current, Q1 is off
}                          // the coil's energy dumps through D1
```

**Stats while running** (`f03:147-148`): "Base current" = `(4.3 * speed).toFixed(1) + ' mA'` (4.3 / 2.1 / 0.0);
"Motor current" = `0.25 * speed` A shown as `250 mA` / `125 mA` / `0 mA` (`>= 1 A` would show `x.xx A`).

**Motor animation** (`f03:108-115`): target speed = `SPD[mode]` (high 1, pwm .5, low 0) when running, no non-dark fault and not uploading,
else 0. `spd += (target - spd) * min(1, dt * (3 if speeding up else 1.2))`; `ang += spd * dt * 13` (13 rad/s at full speed); the
wheel is drawn at `-ang`. Motor hum follows `spd` (section 2.17), whine only in PWM.

**Signals while running with speed > 0**: yellow `#f2c230` on `base` (speed .9); amber on `load` and `ret` (speed `1.2*speed`, 3 dots).
**Tags**: TRANSISTOR (Q1), MOTOR (J2), BATTERY (J1), FLYBACK (D1), LOGIC IN (H1). Accent: Q1 and J2 when the motor is driven, J1 when
powered, H1 when running, D1 when running in PWM.

**Failure modes (live)**:

| trigger | result |
|---|---|
| D1 band to -, power on | hot on D1: "D1 is in backwards: it now conducts straight across the battery, a dead short. It is cooking. Unplug and flip it (band to +)" |
| Q1 flat side back, power on | hot on Q1: "Q1 is in backwards: collector and emitter swap, it barely switches and overheats. Unplug, flat side to the front" |
| C1 stripe back | pop (default message) |
| D1 unsoldered + PWM 50% | Q1 hot "No flyback diode: every PWM switch-off ..." (also fires at every later power-up while the mode stays PWM) |
| D1 unsoldered + LOW after HIGH | Q1 hot "No flyback diode: when Q1 switched off ..." (from code) |
| Bare board, plug | "No power: J1 (Battery terminal) is missing or unsoldered" |

The "no flyback diode" state is practically unreachable: D1 is a low part, so it must be placed before any tall part, and every solder
run solders it. The only path I found (live): with everything placed, choose "D1 band to -" and press "Solder joints" within 0.42 s
(D1 is still dropping, so the iron skips it), then flip it back ("D1 band to +"); flips keep the solder flag, so D1 stays unsoldered.
The board then runs with "To solder 1" until PWM is uploaded.

**Lesson text**: overview (summary): a pin gives about 20 mA, a small gear motor wants 250 mA (ten times that at stall), so wiring it
to a pin kills the pin; a transistor lets a few mA of base current switch the battery current through the motor; add the flyback
diode or the coil kills the transistor the first time it switches off. Practice (summary): on a breadboard build a logic-input LED
switch, then swap the LED for a small motor plus flyback diode, measure base and collector currents and work out the gain.

---

## 6. Fig. 04 — ESP32-S3 DevKitC-1 (`#esp32`, `f04`)

**Identity**: fig 4, month 2, name "ESP32-S3 DevKit", sub "WiFi + two cores", hint "plug into UART, upload, open the web page on the
phone". Palette cobalt. Buttons: the default seven (Plug / unplug USB, Upload sketch ▾).

**Real-world model**: Espressif ESP32-S3-DevKitC-1: PCB 62.7 x 25.4 mm (`pcb.w 25.4`, `pcb.d 62.7`), r 1.2, no holes. It stands
11 mm up on its headers (`standoff:11`) in a breadboard. Mat back 8, front 23, right 6, left 13 (56.4 x 81.7). Height 12.
Module ESP32-S3-WROOM-1 (its PCB antenna at the board end opposite the two USB-C ports, `ant:'y0'`), CP2102N USB-UART, AMS1117-3.3, WS2812 RGB on GPIO48,
RST (EN) and BOOT (GPIO0) buttons, two USB-C ports (UART and native USB), 2 x 22 pin headers.

**On the mat**: a white breadboard under the board (`under`, `f04:115-122`: CERAMIC block 6 mm larger than the PCB on each side, 8.5 mm
tall, red and blue rail stripes, two rows of grey holes at 2.54 mm, black header plastic between breadboard and PCB). A phone lying in
front (`PHONE = (bx(-4.5), by(47))`, 15.5 x 32 x 1.8, dark). Phone screen: dark with "no network" when idle; "connecting..." while the
WiFi sketch connects; after 2.6 s a light page with "Hello robot", "192.168.1.42" and a blue "LED ON" button that turns green "SENT"
for .45 s every 3 s. USB-C cable into J1 (the UART port).

Silk: "ESP32-S3-DevKitC-1", "UART", "USB", "RST", "BOOT", "RGB 48", "PWR". Paths: `up` (UART USB-C to CP2102N to the module), `pwr`.

**Parts** (12; `f04:34-60`): 10 SMD + 2 headers.

| id | name | kind | g | uv | notes |
|---|---|---|---|---|---|
| U3 | CP2102N USB-UART bridge | qfp | 0 | 14,4,19,9 | 6 leads per side, label "2102"; `uploadNeeds` |
| U2 | AMS1117 3.3 V regulator | sot223 | 0 | 14.5,12.5,21,18.5 | label "1117", 3V3 LDO; `needs` |
| RGB | WS2812 RGB LED (GPIO48) | rgb | 0 | 24,4,27.5,7.5 | lens colour = `o.rgb` |
| LP | Power LED | led | 0 | 24,18.5,26,19.7 | red, `powerLed` |
| RC | Decoupling caps + resistors | passives | 0 | 13,9,34,21 | 9 spots |
| SW1 | RST button (EN) | tact | 0 | 8,3.8,12,7.8 | not pressable |
| SW2 | BOOT button (GPIO0) | tact | 0 | 8,17.6,12,21.6 | not pressable |
| J1 | USB-C (UART port) | usbc | 0 | -1.2,3.6,6.3,12.5 | takes the plug |
| J2 | USB-C (native USB port) | usbc | 0 | -1.2,13,6.3,21.9 | decorative |
| U1 | ESP32-S3-WROOM-1 module | module | 0 | 37,3.7,62.7,21.7 | WIFI MODULE; `run` |
| H1 | Pin header 1x22 (front) | pinrow | 1 | 3.4,.6,59.28,3.14 | GPIO |
| H2 | Pin header 1x22 (back) | pinrow | 1 | 3.4,22.26,59.28,24.8 | GPIO |

Description summaries: CP2102N is the serial port the bootloader listens on and toggles EN/BOOT so uploads need no button presses;
the LDO makes 3.3 V (never 5 V on GPIO), WiFi bursts pull up to 500 mA; the WS2812 sets any colour over one data wire (same protocol as
robot status strips); the PWR LED is hard-wired and burns a few mA even in deep sleep (cut it on battery robots); every chip gets 100 nF,
the module wants 10 uF for WiFi bursts; RST restarts from setup(); hold BOOT and tap RST to force download mode (the rescue when uploads
refuse to connect); the UART port goes through the CP2102N (use it when in doubt); the native port lets the S3 act as keyboard, MIDI or
webcam; the module: two Xtensa cores at 240 MHz, 512 KB RAM, 8 MB flash, WiFi + BLE under a shield, keep metal and hands off the
zigzag antenna; headers: 22 pins each, soldered from below for breadboards, avoid strapping pins GPIO 0, 3, 45, 46.

**Power and requirements**: USB-C into J1; `needs ['U2']`; `run ['U1']`; `uploadNeeds ['U3']`; powerMsg "3.3 V up: the red PWR LED
lights, the RGB starts cycling"; default `blink`. The board powers and runs right after reflow, without headers (live).

**Modes** (uploads):

| key | chip | bytes | out | current | serial |
|---|---|---|---|---|---|
| blink | Blink RGB | 262144 | RGB = `HUE((90*t) mod 360)` (full hue cycle in 4 s; HSL s .85, l .5) | 62 mA | every 4 s: `hue ${(k*90) mod 360} deg` (always prints `hue 0 deg`, bug) |
| wifi | WiFi web server | 812032 | t < 2.2: RGB blinks blue `#3e86d9` / `#1d2a4a` (period .5 s); then green `#43c25c`; WiFi waves from t > 2.2; phone page from t > 2.6; tap when `t > 3 && (t-3) mod 3 < .45` | 140 mA connecting, 105 mA connected | k0 `Connecting to bench-lab ...`, k1 `....`, k2 `WiFi connected, IP 192.168.1.42`, then every 3 s from k 6: `GET / from 192.168.1.17 (phone) 200 OK` |
| sleep | Deep sleep | 241664 | awake when `t mod 12 < 1.5`: RGB pale blue `#cfe4ff` | 48 mA awake, .01 mA asleep (shown "10 uA") | every 12 s: `boot #N, sleeping 10 s` |

Visuals in `after` (`f04:135-150`): RGB glow in the sketch colour (radial gradient r 7); while WiFi is up, three arcs (from -100 deg to
10 deg, radius `5 + 26*phase`, phase `(0.7t + k/3) mod 1`, blue, opacity `.85*(1-phase)`) from the antenna end of U1; during a tap a
green dot travels from the phone to the antenna in .45 s.

Code (verbatim, `f04:67-112`):

```cpp
// Blink RGB
#include <Adafruit_NeoPixel.h>
Adafruit_NeoPixel px(1, 48, NEO_GRB);   // 1 LED on GPIO48

void setup() { px.begin(); }

void loop() {
  for (long h = 0; h < 65536; h += 256) {
    px.setPixelColor(0, px.ColorHSV(h));  // any colour, 1 wire
    px.show();
    delay(10);
  }
}
```
```cpp
// WiFi web server
#include <WiFi.h>
#include <WebServer.h>
WebServer server(80);

void setup() {
  Serial.begin(115200);
  WiFi.begin("bench-lab", "robotics");
  while (WiFi.status() != WL_CONNECTED) delay(250);
  Serial.println(WiFi.localIP());
  server.on("/", [] {
    server.send(200, "text/html", "<h1>Hello robot</h1>");
  });
  server.begin();
}

// WiFi stack runs on core 0, your loop() on core 1
void loop() { server.handleClient(); }
```
```cpp
// Deep sleep
RTC_DATA_ATTR int boots = 0;   // RTC memory survives deep sleep

void setup() {
  Serial.begin(115200);
  Serial.printf("boot #%d, sleeping 10 s\n", ++boots);
  esp_sleep_enable_timer_wakeup(10 * 1000000ULL);
  esp_deep_sleep_start();      // chip: ~10 uA. board: the PWR LED
}                              // and the LDO still burn mA!

void loop() {}                 // never reached: wake = reboot
```

**Stats while running** (`f04:151-154`): "Current" = `round(mA) mA` if >= 1 else `10 uA`. Second stat: in Deep sleep
"Board (LED+LDO)" = `48 mA` awake / `~8 mA` asleep; otherwise "Core 0 / core 1" = `WiFi / loop` (WiFi sketch) or `idle / loop`.
**Tags**: UART PORT (J1), BOOT (SW2), RGB LED (RGB), WIFI MODULE (U1), GPIO (H1). Accent: J1 plugged, U1 when WiFi is up, RGB when lit.

**Failure modes**: no polar parts, so no reversal faults. Uploads need U3 (unreachable: it is SMD). Live checks: placing H1 while
plugged -> "Unplug the power first: never work on a live board"; "Solder joints" right after reflow -> "Nothing to solder yet: place a
part first" (misleading wording with 10 parts on the board).

**Build sequence**: Pick & place (10 parts) -> reflow -> Place H1, H2 (pin rows) -> Solder joints. Live: the board can be plugged and
runs after reflow, before the headers.

**Lesson text**: overview (summary): the S3 is the step up for WiFi, Bluetooth, speed and two cores, cheaper than an Uno; the DevKitC-1
adds regulator, USB-UART, BOOT/RST and an RGB LED; it is a 3.3 V part; Arduino framework for speed of work, ESP-IDF for control of
cores and power, MicroPython for quick sensor tests but never a balancing loop. Practice (summary): serve a web page with live sensor
readings and buttons that drive a servo, open it from a phone on the same WiFi (WiFi, HTTP and async work together).

---

## 7. Fig. 05 — TB6612FNG dual motor driver (`#tb6612`, `f05`)

**Identity**: fig 5, month 3, name "TB6612FNG driver", sub "H-bridge, PWM", hint "power the bench, then send drive commands".
Palette tomato. Buttons: Strip to bare PCB / Pick & place SMD / Place a part ▾ / Solder joints / **Power the bench** / **Send command ▾** / Exploded view.

**Real-world model**: SparkFun-style TB6612FNG breakout, 20.3 x 25.4 mm (0.8 x 1.0 in), r 1.2, on a mini breadboard. Two 1x8 headers
pointing down into the breadboard. Mat back 5, front 53, right 6, left 69 (78.3 x 100.4). Height 24.

**On the mat** (`f05:44-51, 103-138`): mini breadboard under the breakout (2 mm larger each side, one row of holes along the front edge);
Arduino Nano at (5, 36) to the left of the PCB; 2S LiPo 40 x 22 x 14 labelled "7.4V LIPO" at (34, 58), lying along x in front of the
Nano; two TT motors in front of the PCB: A (the left one) at (43, 33) with a yellow hub, B at (43, 4) with a red hub. Six jumpers from the Nano's back row to H2 (yellow -> PWMA, green -> AIN1, blue -> AIN2,
white -> STBY, orange -> PWMB, black -> GND), arching higher the further they travel (`4 + 0.12*|dy|`). Motor A leads red/black to
A01/A02, motor B red/black to B01/B02, battery red to VM and black to GND. Extra tags from `after`: "MOTOR A", "MOTOR B" (accent while
spinning) and "NANO" (accent while running).

Silk: header pin names VM VCC GND A01 A02 B02 B01 GND (motor side) and PWMA AIN2 AIN1 STBY BIN1 BIN2 PWMB GND (control side), plus
"+" by C3. Paths: `pwmA`, `pwmB` (control pins to the IC) and `outA`, `outB` (IC to the outputs).

**Parts** (8; `f05:74-91`):

| id | name | kind | g | uv | notes |
|---|---|---|---|---|---|
| U1 | TB6612FNG dual H-bridge | soic | 0 | 7.7,6.7,17.7,13.5 | 12 leads per side, label "TB6612"; `run` |
| C1 | 100 nF cap (VCC) | chip (cap) | 0 | 3.4,8.2,5,9 | |
| C2 | 100 nF cap (VM) | chip (cap) | 0 | 3.4,11.2,5,12 | |
| R1 | 1 k resistor (LED) | chip | 0 | 20.4,15.6,21.2,17.2 | |
| D1 | Power LED | led | 0 | 22.2,15.6,23.4,17.2 | green, `powerLed` |
| C3 | 10 uF capacitor (VM) | ecap | 1 | 18.6,7.8,23.6,12.8 | polar, h 5 |
| H1 | Motor + power header 1x8 | male (`down`) | 2 | 2.54,.6,22.86,3.14 | MOTOR + POWER; `run` |
| H2 | Control header 1x8 | male (`down`) | 2 | 2.54,17.16,22.86,19.7 | CONTROL PINS; `run` |

Description summaries: two MOSFET H-bridges, 1.2 A per channel (3.2 A peak); MOSFETs drop about 0.5 V while the L298N's bipolar
transistors drop about 2 V as heat, so this is the one to use; C1 keeps motor noise off the logic rail, C2 decouples VM at the pins,
R1 gives the LED (5 - 2) / 1 k = 3 mA; C3 is the bulk tank for per-PWM-cycle current spikes (stripe = minus); H1: VM 2.5-13.5 V,
VCC 2.7-5.5 V, GND, outputs; two supplies on purpose; H2: PWMA/PWMB speed, AIN/BIN direction, STBY must be HIGH or the chip sleeps.

**Power and requirements**: micro-USB into the Nano; `needs []`; `run ['U1','H1','H2']`; powerMsg "Nano on USB, LiPo on VM: the driver
is awake (STBY high)"; default `fwd50`. Powering a bare board gives "Powered, but U1 (TB6612FNG dual H-bridge) is missing: nothing runs" (live).

**Model** (`f05:5-23`): `VBAT = 7.4`, `DROP = 0.5`, full wheel speed `BASE = 2*pi*1.6` rad/s.

| key | chip | IN1 | IN2 | PWM | s (signed speed) | Direction | Duty | Motor V |
|---|---|---|---|---|---|---|---|---|
| fwd50 | Forward 50% | HIGH | LOW | 128 | .5 | FORWARD | 50% | 3.5 V |
| fwd100 | Forward 100% | HIGH | LOW | 255 | 1 | FORWARD | 100% | 6.9 V |
| rev | Reverse | LOW | HIGH | 160 | -.63 | REVERSE | 63% | 4.3 V |
| brake | Brake | HIGH | HIGH | 255 | 0 (instant stop) | BRAKE | 100% | 0.0 V |
| coast | Coast | LOW | LOW | 0 | decays | COAST | 0% | 0.0 V |

- Duty = `pwm/255` (coast 0); "Motor V" = `duty * (VBAT - DROP)` when `|s| > 0`, else `0.0`.
- Wheel (`wheel()`, `f05:15-22`): angle carries over between modes. Driven modes: `v = s*BASE` (live: 10.053 rad/s at 100%, -6.333 reverse),
  `a = a0 + v*t`. Brake: `v = 0` at once. Coast: `v = v0*e^(-t/0.9)`, `a = a0 + v0*0.9*(1 - e^(-t/0.9))` (live: 10.05 -> 6.61 -> 4.43 -> ... in
  0.4 s steps). Both wheels share the same angle.
- All modes are instant ("Send command"): `click` sound, `-- <title> --` in the terminal. Chosen while unplugged: "Set. Now power the board to see it".
- Serial: fwd50 every 3 s `AIN1=H AIN2=L PWMA=128 -> forward, ~3.5 V average`; fwd100 every 3 s `AIN1=H AIN2=L PWMA=255 -> forward, ~6.9 V at the motor`;
  rev every 3 s `AIN1=L AIN2=H PWMA=160 -> reverse`; brake once `AIN1=H AIN2=H -> short brake: stopped hard`; coast once `AIN1=L AIN2=L -> coast: spinning down freely`.

Code (template `f05:24-42`, shown for fwd50; the `drive(...)` line changes per mode: `drive(HIGH, LOW, 255);   // forward, full speed`,
`drive(LOW, HIGH, 160);   // reverse`, `drive(HIGH, HIGH, 255);   // short brake: both motor leads tied together, it stops hard`,
`drive(LOW, LOW, 0);   // coast: outputs open, the wheel spins down on its own`):

```cpp
// TB6612FNG: two pins pick the direction, PWM sets the speed
const int PWMA = 5, AIN1 = 7, AIN2 = 8;
const int PWMB = 6, BIN1 = 10, BIN2 = 11, STBY = 9;

void setup() {
  for (int p = 5; p <= 11; p++) pinMode(p, OUTPUT);
  digitalWrite(STBY, HIGH);       // LOW = whole chip asleep
}

void drive(int in1, int in2, int pwm) {
  digitalWrite(AIN1, in1); digitalWrite(AIN2, in2); analogWrite(PWMA, pwm);
  digitalWrite(BIN1, in1); digitalWrite(BIN2, in2); analogWrite(PWMB, pwm);
}

void loop() {
  drive(HIGH, LOW, 128);   // forward, half speed
}
// IN1 IN2 -> motor:  H L fwd | L H rev | H H brake | L L coast
```

**Stats while running**: "Duty", "Direction", "Motor V" (all small).
**Signals** (when |v| > .05): yellow on `pwmA`, `pwmB`; red on `outA`, `outB`.
**Tags**: DRIVER IC (U1), CONTROL PINS (H2), MOTOR + POWER (H1) plus MOTOR A / MOTOR B / NANO. Accent: U1 and H1 while the wheels turn, H2 while running.

**Failure modes (live)**: C3 stripe back -> pop "Pop! C3 is in backwards: reverse voltage vents an electrolytic. Unplug and flip it".
No other faults (no mode faults, no motor stall, no STBY low option).

**Build sequence**: Pick & place 5 SMD parts -> reflow -> Place C3 -> Place H1, H2 -> Solder joints (3) -> Power the bench.

**Lesson text**: overview (summary): a pin gives 20 mA at 5 V, a gear motor wants about an amp at 7 V; the H-bridge is four switches
that connect the motor one way, the other way or short it; IN1/IN2 pick direction, PWM sets speed by switching thousands of times a
second; MOSFETs lose about 0.5 V, which is why it replaced the L298N (about 2 V as heat); try brake and coast back to back. Practice
(summary): drive one motor both ways at five PWM speeds, then add an encoder and turn exactly one revolution regardless of battery
voltage (the first real closed loop).

---

## 8. Fig. 06 — L298N dual H-bridge module (`#l298n`, `f06`)

**Identity**: fig 6, month 3, name "L298N driver", sub "why not to use it", hint "power it, pick a direction, feel the heat".
Palette tomato. Buttons: Strip to bare PCB / Pick & place SMD / Place a part ▾ / Solder joints / **Plug in nano + battery** / Upload sketch ▾ / Exploded view.

**Real-world model**: the red 43 x 43 mm L298N module: L298N in a Multiwatt-15 package bolted to a finned heatsink, 78M05 regulator,
8 flyback diodes, two 220 uF caps, 3-way power terminal (12V, GND, 5V out), two 2-way motor terminals, IN1-IN4 header, ENA/ENB headers
with jumper caps. PCB r 2, 3 holes `[3,3] [3,40] [40,40]`. Mat back 5, front 56, right 5, left 64 (104 x 112). Height 26.

**On the mat** (`f06:46-55, 114-143`): Nano at `(SX+26, SY+PD+5)` and a 2S LiPo (default 22 x 40 x 14, "7.4V LIPO") at `(SX+2, SY+PD+5)`,
both left of the PCB; two TT motors with smaller wheels (R 11) in front: A at `(SX+PW+22, by(4)-9.5)`, B at `(SX+PW+22, by(38)-9.5)`.
Wires: battery red -> 12V, black -> GND along the gap in front of the PCB; motor A red/black -> J2; motor B orange/blue -> J3;
Nano pins -> IN1-IN4 (yellow, green, white, purple).

Heat shimmer (`after`, `f06:144-152`): while running with heat > 0, four wavy vertical strokes rise from the heatsink (11 points, 1.4 mm
apart, `sin(.9i + 5t + 1.7k)*1.1` sway), cream `#fff4d6`, width 1.3, opacity `.45 + .2*sin(2t)`.

Silk: "L298N MODULE", "OUT1 OUT2", "OUT3 OUT4", "12V GND 5V", "IN1 IN2 IN3 IN4", "PWR". Paths `ina`, `outa`, `outb`.

**Parts** (15; `f06:66-99`):

| id | name | kind | g | uv | notes |
|---|---|---|---|---|---|
| U2 | 78M05 5 V regulator | sot223 | 0 | 29,20,36,27 | label "78M05"; `needs` |
| D1 | 8 flyback diodes | passives | 0 | 10,22,29,24 | 8 spots (drawn as chip resistors) |
| LED1 | Power LED | led | 0 | 2,23,4,24.2 | red, `powerLed` |
| RC | Resistors + 100 nF caps | passives | 0 | 36,20,41,27 | 3 spots |
| C1 | 220 uF capacitor (12V) | ecap | 1 | 10,10.5,18,18.5 | polar, h 10.3 |
| C2 | 220 uF capacitor (5V) | ecap | 1 | 19,10.5,27,18.5 | polar, h 10.3 |
| J4 | Control header IN1-IN4 | male | 1 | 27.6,1,37.76,3.54 | 4 pins; `run` |
| JEA | ENA header | male | 1 | 23.8,1,26.34,6.08 | 2 pins |
| JEB | ENB header | male | 1 | 38.6,5,41.14,10.08 | 2 pins |
| U1 | L298N H-bridge + heatsink | multiwatt | 2 | 8,29.5,35,43 | heatsink 20 high, 9 fins, 15 staggered legs, text "L298N" / "ST  1834"; `run` |
| J1 | Power terminal 12V / GND / 5V | term | 2 | 9,0.5,24,8 | 3 screws, blue; `needs` |
| J2 | Motor A terminal | term | 2 | 0.5,11,8,21 | 2 screws, blue; `run` |
| J3 | Motor B terminal | term | 2 | 34.5,11,42.5,18.5 | 2 screws, blue; `run` |
| JPA | ENA jumper cap | jumper | 3 | 23.8,1,26.34,6.08 | on JEA, z 2.5, no outline |
| JPB | ENB jumper cap | jumper | 3 | 38.6,5,41.14,10.08 | on JEB |

Description summaries: the 78M05 makes 5 V for the logic from the 12V input while the 5V-EN jumper is on and the input stays under 12 V
(above that pull the jumper and feed 5 V yourself); 8 diodes catch the coil kick; pull-downs stop floating inputs twitching the motor;
C1/C2 are bulk caps on 12V and 5V (stripe = minus); IN1/IN2 set motor A direction, IN3/IN4 motor B, both equal = brake, 5 V logic;
ENA/ENB: jumper = always full speed, remove it and drive PWM for speed; U1: 1990s bipolar bridges, each conducting pair drops about
1-1.5 V so about 2 V becomes heat (hence the heatsink), learn it, then use a TB6612FNG or DRV8833; J1: motor supply 5-35 V and GND,
third screw is the onboard 5 V output; J2/J3: swapping the motor wires reverses it, same as swapping IN1/IN2; jumper caps go on last.

**Power and requirements**: micro-USB into the Nano; `needs ['J1','U2']`; `run ['U1','J4','J2','J3']` (**the jumper caps are not
required**); powerMsg "Battery on, nano running: both motors forward at full speed"; default `fwd`.

**Model** (`f06:25-30`): `VBAT = 7.4`, `DROP = 2.0`, `IMOT = 0.6` A per motor. `n` = number of motors driven.
- "At motor" `vm = n ? VBAT - DROP : 0` = 5.4 V; "Heat" = `n * IMOT * DROP` = 1.2 W per motor, 2.4 W for two; "Battery" always 7.4 V.
- Wheel angles: `a = dirA * 7 * t`, `b = dirB * 7 * t` (7 rad/s, restart from 0 at every mode change, so the wheels jump).

| key | chip | bytes | IN1 IN2 IN3 IN4 | motors A/B | At motor | Heat | serial (every 3 s) |
|---|---|---|---|---|---|---|---|
| fwd | Forward | 1180 | H L H L | +1 / +1 | 5.4 V | 2.4 W | `battery 7.4 V -> motors 5.4 V, 2.0 V lost in the bridge` |
| rev | Reverse | 1180 | L H L H | -1 / -1 | 5.4 V | 2.4 W | `reverse: same 2.0 V lost, same heat` |
| spin | Spin on the spot | 1180 | H L L H | +1 / -1 | 5.4 V | 2.4 W | `A forward, B reverse: the robot pivots` |
| brake | Brake | 1172 | H H H H | 0 / 0 | 0.0 V | 0.0 W | `brake: motor terminals shorted, 0 A drawn` |

Code (template `f06:31-44`, shown for Forward; the IN levels and the last comment change: Reverse "swap IN pins = reverse",
Spin "A forward, B back = turn in place", Brake "IN1 = IN2 shorts the motor: brake"):

```cpp
const int ENA = 9, IN1 = 8, IN2 = 7;   // motor A
const int ENB = 3, IN3 = 5, IN4 = 4;   // motor B

void setup() {
  for (int p = 3; p <= 9; p++) pinMode(p, OUTPUT);
}

void loop() {
  digitalWrite(IN1, HIGH);  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);  digitalWrite(IN4, LOW);
  analogWrite(ENA, 255);   // jumper on ENA = always full speed
  analogWrite(ENB, 255);   // both forward
}
```

**Stats while running**: "Battery", "At motor", "Heat" (all small).
**Signals** (heat > 0): green `#8af0ae` on `ina` (.9); `#ffd25e` on `outa`, `outb` (.7).
**Tags**: L298N (U1), POWER IN (J1), MOTOR A (J2), MOTOR B (J3), CONTROL (J4). Accent: U1 when heat > 0, J1 when powered, J2/J3 when
that motor turns, J4 when running.

**Failure modes (live)**: C1 or C2 stripe back -> pop with the default message. Bare board, plug -> "No power: J1 (Power terminal
12V / GND / 5V) is missing or unsoldered". JPA before soldering -> "Solder everything first: this part goes on last". Running without
JPA/JPB still gives 5.4 V and 2.4 W (inaccurate, section 10). No overheating fault exists.

**Build sequence**: Pick & place 4 SMD parts -> reflow -> Place C1, C2, J4, JEA, JEB -> Place U1, J1, J2, J3 -> Solder joints (9 joints,
~9 s) -> Place JPA, JPB (snap, no solder) -> Plug in nano + battery.

**Lesson text**: overview (summary): the L298N is in every Arduino car tutorial so you must recognise it; two H-bridges, IN1/IN2 for
direction, ENA for speed; its 1990s bipolar switches drop about 2 V, so from 7.4 V the motors see about 5.4 V and the rest is heat
(watch the shimmer); a TB6612FNG "drops about 0.2 V" (contradicts Fig. 05's 0.5 V), switch to it or a DRV8833 once you understand this.
Practice (summary): same as Fig. 05, with the hint to pull the ENA jumper and wire ENA to a ~ pin for PWM.

---

## 9. Every quiz question in this slice (19)

The original shows no explanation; a wrong pick only flashes "Not quite: think about what the hardware does". The explanation
column is my summary for the rebuild. Correct answer in bold.

| Fig | # | question (verbatim) | choices (verbatim) | why the answer is right |
|---|---|---|---|---|
| 01 | 1 | You analogWrite() a fade to pin 13 and the L LED just snaps on and off. Why? | **Pin 13 has no PWM hardware** / The LED is burnt out / delay(8) is too short | Only 3, 5, 6, 9, 10, 11 have PWM; on other pins analogWrite gives LOW below 128 and HIGH from 128, so a fade becomes a square wave |
| 01 | 2 | Why solder the DIP socket before the ATmega328P goes in? | The chip only programs after soldering / **The iron never heats the chip** / Hot sockets grip better | The socket takes the heat; the chip goes in cold afterwards and stays swappable (the bench blocks U1 until all joints are soldered) |
| 01 | 3 | The Uno resets every time a motor starts. First suspect? | A bug in setup() / The USB cable is too long / **The motor current sags the 5 V rail (brown-out)** | Motor inrush pulls 5 V below the brown-out threshold; power motors from their own supply and driver |
| 01 | 4 | Which chip turns USB into serial for uploads? | **ATmega16U2** / NCP1117 / LMV358 | 16U2 is the USB-serial bridge; NCP1117 is the 5 V regulator, LMV358 the op-amp |
| 02 | 1 | 5 V supply, red LED (2 V), 330 ohm resistor. Current? | 15 mA / **9 mA** / 1.5 mA | (5 - 2) / 330 = 9.1 mA |
| 02 | 2 | An LED in backwards does what at 5 V? | Explodes / **Stays dark, no damage** / Glows dimly | A reverse-biased diode blocks; 5 V is within a typical LED's reverse rating |
| 02 | 3 | Why does the LED die with no resistor? | Too much voltage / **Nothing limits the current, so it tries to pass amps** / The jumper shorts the supply | The LED's forward drop is nearly fixed; only the resistor sets the current |
| 03 | 1 | Why not wire the motor straight to pin 9? | **The pin gives ~20 mA; the motor wants 250 mA+** / Pins only output 3.3 V / The motor needs AC | A GPIO pin is rated for about 20 mA; a gear motor needs 250 mA running and far more at stall |
| 03 | 2 | What is D1 protecting? | The battery from overcharge / **Q1 from the voltage spike when the coil switches off** / The LED from reverse voltage | The coil's stored energy kicks back tens of volts at switch-off; the diode gives it a safe loop |
| 03 | 3 | The battery GND is not connected to the controller GND. What happens? | Nothing, they are separate / **The base current has no return path: Q1 never turns on** / The motor runs backwards | Base current must return through the emitter to the controller's ground |
| 04 | 1 | An upload says "Failed to connect to ESP32". The classic fix? | **Hold BOOT, tap RST, upload again** / Swap to 5 V / Reflash the CP2102N | BOOT held at reset puts the chip in download mode |
| 04 | 2 | Deep sleep: the chip draws ~10 uA, yet the battery drains in days. Likely culprit? | The WiFi antenna / **The always-on power LED and the LDO** / RTC memory | The board's PWR LED and regulator quiescent current burn mA while the chip sleeps |
| 04 | 3 | Why MicroPython is a bad fit for a balancing robot loop? | It cannot read I2C / **Garbage collection pauses wreck the loop timing** / It has no float maths | GC pauses add jitter to a loop that needs fixed timing |
| 05 | 1 | AIN1 = HIGH and AIN2 = HIGH. What does motor A do? | Spins forward / **Short brake: stops hard** / Coasts to a stop | Both outputs high ties the motor leads together: short brake |
| 05 | 2 | Why use the TB6612FNG instead of the L298N? | **It drops ~0.5 V instead of ~2 V, so less heat and more speed** / It has more pins / It needs no PWM | MOSFET bridge vs bipolar bridge losses |
| 05 | 3 | PWM at 50% duty from a 7.4 V pack. What does the motor see on average? | 7.4 V / **About 3.5 V** / 0 V, PWM is digital | Average = duty x supply, minus the small bridge drop: 0.5 x 6.9 = 3.45 V |
| 06 | 1 | 7.4 V battery into an L298N. Roughly what reaches the motor? | 7.4 V / **5.4 V** / 3.3 V | About 2 V is lost across the two conducting bipolar switches |
| 06 | 2 | IN1 = HIGH and IN2 = HIGH does what? | Full speed forward / **Brakes the motor** / Shorts the battery | Equal inputs drive both motor terminals to the same rail: brake |
| 06 | 3 | Why does the L298N need that big heatsink? | **Its bipolar transistors waste about 2 V as heat** / Motors are hot / To hold the chip upright | 2 V x motor current is dissipated in the chip (1.2 W per motor at 0.6 A in the sim) |

---

## 10. Defects and inconsistencies in the original (do not copy)

1. **Refused upload still applies** (`eng:876`): `runMode` sets `st.pending` before its checks. Picking another sketch while one uploads
   shows "Uploading: wait for it", yet that refused sketch is the one that runs when the upload ends (live: Blink uploading + Serial hello
   refused -> `hello, robot #0`). Any refused pick (unplugged, faulted) also changes the code panel, so the panel can show a sketch that is
   not running (live: code panel "Blink" while the Uno printed `hello, robot`).
2. **Instant mode clears a dark fault** (`eng:881`): on Fig. 02 with D1 backwards, moving the jumper sets status RUNNING and the meter
   reads 3.0 mA through a dark, reversed LED (live).
3. **ESP32 serial bug**: `hue ${(k*90) % 360} deg` with `k % 4 === 0` always prints `hue 0 deg` (`f04:66`, live).
4. **ESP32 upload log uses avrdude wording** ("avrdude: flash verified", "Sketch uses 812032 bytes"). ESP32 uploads use esptool
   ("Connecting....", "Writing at 0x...", "Hash of data verified.", "Hard resetting via RTS pin...").
5. **TB6612 drop is 0.5 V in Fig. 05 (`DROP = .5`, text, quiz) but "about 0.2 V" in Fig. 06's overview** (`f06:162`). Pick one
   (0.5 V at about 1 A is closer to the datasheet's ~0.5 ohm on-resistance).
6. **L298N runs without the ENA/ENB jumper caps** (they are not in `run`). On the real module a missing jumper leaves EN low/floating
   and the motor does not run (live: 5.4 V / 2.4 W without JPA/JPB).
7. **Key failure modes are unreachable in normal play**: Fig. 03 "No flyback diode" (only via the flip-then-solder-within-0.42-s trick),
   Uno `needs F1` and `uploadNeeds U3/Y1`, ESP32 `uploadNeeds U3`. There is no way to leave out or remove a single part.
8. **Static power messages**: Fig. 03 says "pin 9 goes HIGH and the motor spins" in LOW mode, Fig. 06 says "both motors forward at full
   speed" in Brake, the Uno says "the factory Blink sketch starts" while running Serial hello (live).
9. **Month labels**: groups 3 and 4 say "Month 2" again ("Month 2 · motors + drivers", "Month 2 · sensors") in a "six-month roadmap".
10. **Fig. 02 bypass**: the meter never shows the spike or "OL" (the fault lands in the same tick), and the LED comes back to life after
    unplugging. The OL branch of `fmt` is dead code.
11. **Fig. 05 wiring**: only PWMA, AIN1, AIN2, STBY, PWMB and GND are wired; BIN1/BIN2 and VCC are not, yet motor B runs and the logic
    side is "awake". Both wheels also share one angle.
12. **Fig. 06 wheel angle resets to 0 at every mode change** (visible jump), unlike Fig. 05.
13. **Lofi "Am9" chord is an Am7 voicing** (no B).
14. **Audio before a gesture**: the auto-plug plays sounds before any user gesture, so the AudioContext starts suspended and Chromium
    warns (live).
15. **Mobile**: the toast covers the stats, the picker covers the figure, the figure is tiny.
16. **Label collisions**: Fig. 02 LED and JUMPER pills overlap; ESP32 WiFi waves run into the stats column (live screenshots).
17. "Solder joints" after reflow says "Nothing to solder yet: place a part first" although SMD parts are on the board.
18. Changing a quiz answer after mastery hides "Board mastered" but the nav still says "done".
19. Status/stat oddities: "Pin 13 LOW" during Serial hello; Fig. 03 base current in PWM (2.1 mA) is an average but is not labelled as such.
20. ESP32-S3-DevKitC-1 v1.1 moved the RGB LED to GPIO38 (v1.0 is GPIO48). Say which revision is modelled.

---

## 11. Rebuild notes (to be strictly better)

- Keep every behaviour, message, number and formula above, but fix section 10.
- Add the missing interactions: remove/leave out a single part (makes the flyback, fuse, 16U2 and EN-jumper lessons reachable),
  pressable RESET/BOOT/RST buttons, a clickable slide switch, maybe a barrel-jack supply option on the Uno.
- Add what the original never had: see-through internals (die and bond wires in DIP/QFP, H-bridge switches inside the TB6612/L298N,
  transistor junction), rotation, zoom, keyboard access to every button and chip, quiz explanations, saved build progress.
- Make mode state honest: separate "selected sketch" from "running sketch" in the code panel; reject picks without side effects.
- Create audio on the first user gesture.

---

## 12. Screenshot index

All in `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/shots/robotics-bench-a/`:

- Uno: `uno-desktop.png` (full page, running), `uno-bare.png`, `uno-pnp.png`, `uno-reflow.png`, `uno-solder.png` (iron),
  `uno-uploading.png`, `uno-exploded.png`, `uno-fault-u1.png` (hot), `uno-fault-c1.png` (pop + smoke), `uno-select.png`,
  `uno-nolabels.png`, `uno-mustard.png`, `uno-wobble3.png`, `uno-quiz-done.png`, `uno-param-ex.png`, `uno-picker-place.png`,
  `uno-picker-upload.png`, `uno-mobile.png`, `uno-mobile-top.png`, `uno-mobile-picker.png`.
- LED: `led-desktop.png`, `led-1k.png`, `led-10k.png`, `led-bypass.png`, `led-d1-backwards.png`, `led-rebuilt.png`, `led-picker-place.png`, `led-picker-move.png`.
- Transistor: `transistor-desktop.png`, `transistor-high.png`, `transistor-pwm.png`, `transistor-fault-D1.png`, `transistor-fault-Q1.png`,
  `transistor-fault-C1.png`, `transistor-noflyback.png`, pickers.
- ESP32: `esp32-desktop.png`, `esp32-blink.png`, `esp32-wifi-connecting.png`, `esp32-wifi-page.png`, `esp32-pnp.png`, `esp32-exploded.png`, pickers.
- TB6612: `tb6612-desktop.png`, `tb6612-fwd50.png`, `tb6612-rev.png`, `tb6612-c3pop.png`, `tb6612-bare-powered.png`, pickers.
- L298N: `l298n-desktop.png`, `l298n-fwd.png`, `l298n-brake.png`, `l298n-nojumpers.png` (taken in Brake mode, so 0 V / 0 W; the 5.4 V / 2.4 W no-cap result was checked separately), `l298n-exploded.png`, pickers.
