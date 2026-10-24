# Drone Lab (original), part A: engine, flying range, Figs 01 to 04

Research for the SimLab rebuild. This covers the original Drone Lab at https://drone-engineer.vercel.app:
the shared engine (`defineDrone` API, design calculator, bench build, safety tests, wiring diagram, lesson
panels, flight model), the flying range (world, collisions, checkpoints, race gates, third-person iso view, FPV
view with OSD), and the first four crafts: Fig. 01 5-inch freestyle quad, Fig. 02 Tiny Whoop, Fig. 03 3-inch
cinewhoop, Fig. 04 7-inch long range. Figs 05 to 13 are covered in part B.

## 0. Sources, method, conventions

Source files (scratchpad copy of the live bundle; `D` below means
`/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/orig/drone`):

| File | What it is |
|---|---|
| `D/shell.html` | Page skeleton: `<title>Drone Lab</title>`, 19 inline `<script>` blocks, nothing else |
| `D/00-core.js` | Colorfigures core (older fixed-view version): projection, shading, `mountFigure`, buttons/pickers, stats, toast, wobble/colour/labels controls |
| `D/01-shared-pieces-copied-from-the-robotics-b.js` | Materials, small helpers, synthesized audio (lofi + sfx), anonymous usage tracking |
| `D/02-oriented-3d-frames-shapes-copied-from-th.js` | Oriented frames `FR`, `obox`, `ocyl`, `odisc`, `otext` |
| `D/03-fig01-5-inch-freestyle-fpv-quad.js` | **The Drone Lab engine** (despite the file name): calc, bench, tests, flight model, UI shell, mount |
| `D/04-.js` | **The flying range**: world prims, collisions, checkpoints, iso drawing, FPV renderer, OSD |
| `D/05-fig01-5-inch-freestyle-fpv-quad.js` | Fig. 01 `quad5` (the template craft) |
| `D/06-fig02-tiny-whoop-65-mm.js` | Fig. 02 `whoop` |
| `D/07-fig03-3-inch-cinewhoop.js` | Fig. 03 `cinewhoop` |
| `D/08-fig04-7-inch-long-range-quad.js` | Fig. 04 `longrange` |
| `D/18-startlab.js` | `startLab();` |

References are `file:line` using the short names `00`, `01`, `02`, `03`, `04`, `05`, `06`, `07`, `08`.

How this was verified:
- Every line of 01, 02, 03, 04, 05 to 08, 18 and shell was read; 00 was read in full for the UI shell.
- The live site was driven with Playwright (bench flows, deliberate build mistakes, tests, all flight modes,
  FPV, rescue). Mid-session the site started answering with a Vercel Security Checkpoint (HTTP 403) after
  repeated headless loads, so the remaining runs used the downloaded `orig/drone-engineer.html`, which I checked
  is byte-identical script-for-script to the split files (19/19 identical) and behaved identically to the live site.
- The design calculator was re-implemented in Python from the source constants and compared with the live
  `calc()` for all 4 crafts x 27 combinations: **0 mismatches** (golden values in Appendix A).
- Several flight claims were checked by running the original `physics()` synchronously in the page
  (Appendix B).
- Screenshots: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/shots/drone-lab-a/`
  (index in Appendix C).

Conventions in the original: bench units are millimetres and grams; physics units are metres, kilograms and
seconds; z is up; +x is the craft's nose; +y is the craft's left. Angles in data are degrees; the code uses
radians. UI strings below are quoted verbatim from source; section headings render UPPERCASE through CSS.

---

## 1. Page shell, navigation, layout

### 1.1 Structure (03:541-635, 00:271-391)

`mountFigure` (00:271) builds: `<header><h1>Fig. NN — {name}</h1><span>{hint}</span></header>`, a `.stage` with the
button column (`#btns`, caption `buttonsLabel` = `Workshop`), the stats column (`#stats`, top right), a toast
(`#toast`, role=status), and the SVG figure (`#fig`, viewBox computed from the bench size). Below it a
`.controls` row: `Hand-drawn wobble` slider (range 0..7 step 0.1; the Drone Lab forces it to 0 at mount,
03:699), `Colour` swatches (palettes `mustard`, `tomato`, `mint`, `cobalt`, `blush`, 00:11-17), `Labels`
switch `On`/`Off` (shown only when the scene draws a tag, 00:389). `dshell()` adds `Sound` with two toggle
buttons `Lofi` and `Effects` (03:570-574), then a full-width wiring card and the two-column lesson grid, then the
footer link `Made with Colorfigures ↗`.

`dshell()` also moves the page into `<main class="page">` and prepends a sidebar `<nav class="side">`:
- `<h1>Drone Lab</h1>`, `<p>Hand-inked drones you design, build and then fly.</p>`
- one link per figure 1..13: small `Fig. 01`, the craft `name`, and `<em>` the craft `sub`. A figure with no
  registered craft renders as disabled `Fig. NN · soon` using the fallback `DRONE_ROSTER` (03:480-482). All 13
  exist, so the live sidebar shows: 01 `5-inch freestyle quad` / `Betaflight + FPV`; 02 `Tiny Whoop 65 mm` /
  `indoor, brushless`; 03 `3-inch cinewhoop` / `ducted, smooth video`; 04 `7-inch long range` / `GPS rescue`;
  05 `Racing quad` / `gates + rates`; 06 `GPS camera drone` / `ArduPilot, gimbal`; 07 `Delivery drone` /
  `Pixhawk + companion`; 08 `Agri hexacopter` / `spray + RTK`; 09 `FPV flying wing` / `INAV, elevons`;
  10 `VTOL tiltrotor` / `hover to cruise`; 11 `Crazyflie swarm` / `Crazyflie, mocap`; 12 `Tricopter` /
  `servo yaw`; 13 `Heavy-lift octocopter` / `redundancy`.
- footer `<small>Design it, wire it, build it, smoke-test it, then fly it in the simulator.</small>`
- the current craft gets `aria-current=true` (inverted colours).

Routing: the hash is the craft key (`#quad5`, `#whoop`, `#cinewhoop`, `#longrange`, ...). `startLab()` mounts
`location.hash` or the first craft by fig number (03:709); `hashchange` re-mounts (03:708). Re-mounting resets
all state (`freshState`, 03:79-83): design, build, tests, quiz answers, best lap, crash count, FPV off.

### 1.2 Lesson grid (03:579-599)

Full width above the grid: `Wiring · click a block` + card `#wire` (section 5).

Left column:
1. `Design it`: three selects `Battery`, `Motors`, `Props` (options = each catalogue entry's `name`), six calc
   tiles, warnings, cost table (section 3).
2. `Meet the {noun}` (noun defaults to `drone`) with the craft `overview` HTML.
3. `Selected part`: card. Nothing selected: small caps `nothing selected` + `Click any part, a wiring block, or a name below.`
   Selected: `{short} · fitted` or `{short} · in the box`, bold `name`, then the part's `what` text (03:626).
4. `Parts in the box`: one button per part (`short`); faded (`.out`) when not fitted; pressed when selected (03:605-607, 627).

Right column:
1. `Fly it · controls`: keys card. Default rows (03:594): `W S` throttle (alt hold: climb / descend);
   `A D` yaw; `arrows` pitch + roll; `Space` arm / disarm; `R` reset to the pad; `V` first-person (FPV) view;
   footer `or drag the two sticks on the figure`.
2. `{cliName || 'Betaflight CLI'} · {build | mode title}` with a code block: on the bench `buildCode`, in flight
   the current mode's `code` (03:628-630).
3. `{logName || 'Betaflight log'}`: a green-on-dark terminal showing the last 10 log lines (03:89, 631). First
   line `-- betaflight --` (`-- ${DR.log} --`).
4. `Check yourself`: quiz (section 6.3).
5. `Practice task` paragraph when the craft defines `practice`.

### 1.3 Stats panel (03:658-668)

Bench: `Parts` `n/N` (big), `Weight` `{round(auw)} g`, `Thrust : weight` `{tw.toFixed(1)} : 1`,
`Flight time` `~{flyMin.toFixed(1)} min` (small). Values that change get a 0.35 s "bump" scale animation (00:323).

In flight: `Mode` (mode title before ` (`), `Battery` `{(volt/cells).toFixed(2)} V/cell`, `Altitude`
`{z.toFixed(1)} m` (big), `Speed` `{round(|v|*3.6)} km/h`, a status stat whose label is `Crashed` / `Armed` /
`Disarmed` and whose value is `gate {i}/{N}` in race mode, else `GO` (armed) or `SPACE` (not armed), `Throttle`
`{round(sqrt(thrEff)*100)}%`, `Best lap` `{best.toFixed(2)} s` once any lap or range run exists, then the craft's
`flyStats(fl)` (Fig. 04: `Home` `{dist.toFixed(1)} m`, `Rescue` `{PHASE}`). In flight the stats get a translucent
paper background; in FPV they are hidden (the OSD replaces them).

### 1.4 Buttons (Workshop column, 03:669-688)

Order: `Take it apart`, `Add next part ▾` (picker), `Build it for me`, `Smoke stopper test` (absent when
`noSmoke`), `Check motor direction` (absent when `mpos` empty), `{calLabel || 'Calibrate accelerometer'}`,
craft `extraButtons` (none in Figs 01 to 04), `Plug / unplug battery`, `Fly ▾` (picker), `Arm / disarm`,
`Reset`, `Exploded view`.

Visibility (03:693-696, CSS 526-527): on the bench `Arm / disarm` and `Reset` are hidden; in flight only `Fly ▾`,
`Arm / disarm`, `Reset` and `extraButtons` marked `inFlight` stay, and the `Workshop` caption is hidden.

Picker behaviour (00:340-360): a `▾` button opens a chip panel next to it (below it on phones). Every chip stays
clickable: a `current` chip (filled ink) answers `{label} — already set`; a `disabled` chip (faded) answers its
`why` text or `{label} isn't possible right now`. Clicking anywhere else closes pickers.

`Fly ▾` chips: one per mode title (current = flying in that mode), then `FPV view on / off (V)`,
`Wind on / off`, `Back to the bench` (03:681-684).

Every top-level button press plays `tick` and is tracked (03:575-576).

### 1.5 Toast and flight message

`dsay(text, ms=2200, snd='error')` (03:88) plays `snd` (default `error`) and shows the toast under the buttons
(uppercase, max 240 px) for `ms`. The full catalogue is in section 4.7.

In flight, `fl.msg` shows as a pill `#fmsg` (accent colour, bottom centre, role=status) for 3.2 s (03:320-321,
328-329); hidden in FPV where the OSD prints it instead.

### 1.6 Mobile and narrow layouts (03:528-539, 00:235)

- `<= 760 px`: sidebar becomes a sticky horizontal scrolling row of pill links (only the craft name; heading,
  blurb, footer, fig numbers and subs hidden); lesson grid becomes one column.
- `<= 560 px`: header hint hidden; Workshop buttons wrap in rows (static, not an overlay); stats become a
  static row; pickers open below their button. In flight the stage becomes a column: buttons, stats as a
  3-column grid (first stat spans the row, 9 px labels, 15 px values), figure, the message pill (static), the
  two sticks below the figure. Flight view is 0.8 x as wide and taller (height = 1.05 x width). FPV crops the
  viewBox to the goggles rectangle and scales OSD text by 1.35.
- Screens: `70-phone-bench.png`, `72-phone-fly.png`, `73-phone-fpv.png`.

### 1.7 URL parameters

| Param | Effect | Ref |
|---|---|---|
| `#key` | craft to mount | 03:708-709 |
| `?pal=<palette>` (`mustard`, `tomato`, `mint`, `cobalt`, `blush`) | palette | 00:294 |
| `?labels=0` | start with tags hidden | 00:375 |
| `?press=Label@ms,Label>Choice@ms` | test hook: clicks buttons (and picker chips) whose text starts with Label at those times; errors land in `<html data-errors>` | 00:382-387 |
| `?bare=1` | start with no parts placed (box of parts) | 03:690 |
| `?ex=1` | start in exploded view | 03:690 |
| `?fly=<mode>` | after 300 ms call `fly(mode)` | 03:703 |
| `&fpv` | turn FPV on | 03:703 |
| `&pose=x,y,z,yawDeg` | arm, place the craft there, hold sticks (alt: `thr 0`; manual: `thrAbs = hoverThr`) | 03:703 |
| `&auto` | arm, climb 1.5 s (alt: `thr 1`; manual: `thrAbs = min(.9, h+.15)` with `h = clamp(hoverThr, .2, .6)`), then fly forward (`pitch .6`, or `-.6` for wing/plane crafts) | 03:703-704 |
| `?track=1` | enable analytics on localhost | 01:175 |

`?fly=` takes any mode key of the craft (`alt`, `angle`, `acro`, `race`, `range`, and `cine` / `rescue` where they
exist). An unknown mode throws `Cannot read properties of undefined (reading 'title')` (verified). After the 1.5 s
climb, `&auto` holds `thr 0` (alt) or `thrAbs = h` (manual) with the forward pitch.

---

## 2. `defineDrone({...})` API and mounting

`defineDrone(d)` pushes into `DRONES` sorted by `fig` (03:42). `mountDrone(key)` (03:638-706) copies the record's
catalogues into globals `BATTS`, `MOTORS`, `PROPS`, `FIXED`, `PARTS`, `MPOS`, sets `MAT`, `GATES`, `TREES`,
`FIELD`, `PAD`, `MODES` (adds `range` when `range.goals` exist), `GATE_W/H`, builds the world, resets state,
marks **every part placed and correctly oriented**, mounts the figure, then the shell.

Initial state (03:79-83): fully built, `smokeOk = motorOk = accOk = true`, **`plugged = true`**, mode `alt`
(or `DR.mode`), no flight. So a visitor can press `Fly` immediately.

Fields (03:9-35 plus usage). `*` = required.

| Field | Meaning, default | Used at |
|---|---|---|
| `key*`, `fig*`, `name*`, `sub*` | id, figure number, title, sidebar subtitle | 03:546-548, 654 |
| `hint` | header hint, default `design it, build it, then fly it` | 03:654 |
| `noun` | `Meet the {noun}`, default `drone` | 03:589 |
| `palette` | PALS key, default `tomato` | 03:80 |
| `log` | log name in the first terminal line, default `betaflight` | 03:81 |
| `mat` | bench mat size mm, default 280 | 03:641 |
| `benchH` | frame headroom mm (figure size z), default 120 | 03:655 |
| `benchZ` | frame origin above the mat, default 5 | 03:106 |
| `benchYaw` | turn the craft on the mat (deg) | 03:106 |
| `benchUnit` | scale for drop/explode/test props, default `mat/280` | 03:92 |
| `explode` | mm per exploded layer, default `16*benchUnit` | 03:92 |
| `flyScale` | drawn size multiplier in the field, default 3 | 03:263 |
| `flyVB` | field view width in mm, default 5200 | 03:250 |
| `camZ` | iso camera follows this share of altitude, default 0.8 | 03:249 |
| `ceiling` | soft ceiling m, default 12 | 03:179 |
| `drag` | drag coefficient, default 0.045 | 03:184 |
| `hitR` | collision radius m, default 0.14 | 04:52 |
| `fpvFov` | FPV horizontal FOV deg, default 105 | 04:117 |
| `camTilt` | FPV uptilt deg (overridden by `range.camTilt`), default 25 | 04:118 |
| `fpvLevel` | camera on a gimbal: yaw only | 04:120 |
| `fpvProps` | draw prop blur in the FPV top corners | 04:184 |
| `sagK` | sag multiplier, default 1 | 03:214 |
| `batts* motors* props*` | catalogues `{ key: { name, ... } }` | 03:43-58 |
| `design*` | default keys `{ batt, motor, prop }` | 03:80 |
| `fixed*` | `[[id, name, grams, price, category], ...]`, category `'Electrical'` or `'Mechanical'` | 03:48, 55 |
| `kThrust` (1.06), `gPerW` (5.4), `nMotors`, `maxKvCells` (12075), `minTW` (5) | calc constants | 03:45-53 |
| `calc(design)` | full override returning `{ n, V, thrust, auw, tw, hoverA, hoverMin, flyMin, maxA, over, weak, cost, hoverThr }` | 03:44 |
| `calcRows(c)` | override the 6 tile rows `[[label, value], ...]` | 03:617 |
| `warnings(design, c)` | override the warnings HTML | 03:619 |
| `parts*` | `[{ id, name, short, z, after, polar, opts:[ok, wrong], what }]`; keep ids FRAME, MOTORS, ESC, WIRES, FC, XT60, CAM, RX, VTX, TOP, BATT, PROPS where the craft has them (tests and faults key off them) | 03:17-19 |
| `mpos` | `[[x, y, 'M1', dir], ...]` motor positions, dir `'CW'` or `'CCW'`; empty = no motor test | 03:20 |
| `wrongMotor` | index of the motor that spins wrong before the check, default `min(2, n-1)` (M3) | 03:109 |
| `motorNeeds` / `smokeNeeds` / `plugNeeds` | part ids required, defaults `WIRES+FC` / `XT60+ESC` / `BATT+XT60` | 03:401, 409, 416 |
| `noSmoke` | no smoke-stopper test or gating | 03:374, 453, 676 |
| `smokeAt` | bench point where fault smoke rises, default `[mat/2-46, mat/2+13, 18]` | 03:313 |
| `smokeLead` | craft-local point the stopper lead runs to, default `[-0.3 mat, 0, 8]` | 03:128 |
| `arrowZ` | motor-test arrow height, default 48 | 03:114 |
| `draw*(F, add, opt)` | draws the craft; `add(at3, svg, partId)`; `opt = { has, U, orient, m, spin[], rpm[], power, broken, k, design, plugged, fault, all, fl }` | 03:94-98 |
| `hull*(F)` | 3D points for a cast shadow (**defined by every craft but never used**, 03:100) | |
| `tags` | `[[id, [x,y,z], dx, dy]]` part label pills | 03:132-133 |
| `wiring*` | `{ nodes(d,c) -> { ID: [x, y, TITLE, sub, colour] }, lines(d,c,ln,lab) -> svg, legend }` on a 760 x 340 canvas, boxes 150 x 56 | 03:463-477 |
| `modes` | `{ key: { title, code, hint, alt?, acro? } }`, default alt/angle/acro/race | 03:428-449 |
| `mode` | default mode key | 03:82 |
| `physics(fl, dt)` | replaces the multirotor model; may write `D.stick` and call `multirotor` | 03:149 |
| `flyExtra(fl, add, F)` | extra iso drawing in flight | 03:268 |
| `flyStats(fl)` | extra flight stats | 03:665 |
| `gates` | race gates `[[x, y, headingDeg]]`, default 5 gates | 03:642 |
| `gateW`, `gateH` | gate size m, default 1.6 | 03:646 |
| `trees`, `pad`, `field` | default world layout | 03:642-643 |
| `range` | the flying range (section 7.6) | 04:6-19 |
| `overview`, `buildCode`, `cliName`, `logName`, `controls`, `quiz`, `practice`, `calLabel`, `extraButtons` | lesson content and extra buttons (`[{ label, onClick, inFlight }]`) | 03:35 |

Engine state `D` (03:79-83): `pal, design, placed{id:{t, orient, leave}}, ex, exT, sel, smokeOk, motorOk, accOk,
plugged, fault, smoke[], serial[], quiz{}, queue[], queueT, test, testT, view ('bench'|'fly'), flight, mode,
keys{}, stick{thr, yaw, pitch, roll, thrAbs}, vstick, auto, wind, best, crashes, laps`.
`isOn(id)` = placed, not leaving, drop finished (`t >= 1`); `inPl(id)` = placed and not leaving (03:84-85).

Animation loop: `dkick()` starts `ui.animate` (a 16 ms `setTimeout` loop, dt capped at 50 ms, 00:330-332)
which runs `dtick` until nothing is busy (03:301-324).

---

## 3. The design calculator (exact)

### 3.1 Generic `calc(d)` (03:43-58), used by Figs 01, 02, 04

```
b = BATTS[d.batt], m = MOTORS[d.motor], pr = PROPS[d.prop]
n   = DR.nMotors || MPOS.length || 4
kT  = DR.kThrust || 1.06          gW = DR.gPerW || 5.4
V    = b.cells * 3.7                              // nominal pack volts
krpm = m.kv * V / 1000                            // no-load kilo-rpm
thrust = kT * pr.pf * krpm^2                      // grams per motor at full throttle
auw  = sum(FIXED grams) + n*m.g + n*pr.g + b.g    // all-up weight, g
tw   = n * thrust / auw                           // thrust : weight
hoverW = auw / (gW * pr.eff)                      // watts at hover (gW = grams of thrust per watt)
hoverA = hoverW / V
hoverMin = (b.mah/1000 * 0.8) / hoverA * 60       // 80% usable capacity
flyMin   = hoverMin * 0.42                        // "freestyle" (aggressive) time
maxA     = n * thrust / (2.0 * pr.eff) / V        // assumes 2 g/W at full throttle
over = m.kv * b.cells > (DR.maxKvCells || 1750*6*1.15 = 12075)
weak = tw < (DR.minTW || 5)
cost.Electrical = sum(FIXED Electrical prices) + n*m.price + b.price
cost.Mechanical = sum(FIXED Mechanical prices) + pr.price * ceil(n/2)   // a prop price is per pair
hoverThr = sqrt(auw / (n*thrust))                 // = sqrt(1/tw), because thrust ~ throttle^2
```

`forCells` on motors is data only; no code reads it.

### 3.2 Cinewhoop override `cineCalc` (07:29-43)

Same structure with: `thrust = 0.24 * pr.pf * m.sz * krpm^2` (`sz` = motor size factor), `hoverW = auw / (3.4 * pr.eff)`,
`flyMin = hoverMin * 0.85` ("cine flying is gentle"), `maxA = n*thrust / (1.7*pr.eff) / V`,
`over = b.cells > m.maxCells`, `weak = tw < 3`, props cost `pr.price * 2`, `n = 4`.

### 3.3 Per-craft constants

| Craft | kThrust | gPerW | maxKvCells / over rule | minTW | flyMin factor | max-current g/W |
|---|---|---|---|---|---|---|
| quad5 | 1.06 | 5.4 | kv*cells > 12075 (default) | 5 (default) | 0.42 | 2.0 |
| whoop | 0.00304 | 3.6 | kv*cells > 28000 | 2.6 | 0.42 | 2.0 |
| cinewhoop | 0.24 x `sz` | 3.4 | cells > motor.maxCells | 3 | 0.85 | 1.7 |
| longrange | 1.6 | 8 | kv*cells > 1300*6*1.2 = 9360 | 3.5 | 0.42 | 2.0 |

### 3.4 Display (03:617-623)

Tiles (default rows): `All-up weight` `{round(auw)} g`; `Thrust : weight` `{tw.toFixed(1)} : 1`;
`Hover throttle` `{round(hoverThr*100)}%`; `Max current` `{round(maxA)} A`; `Hover time`
`{hoverMin.toFixed(1)} min`; `Freestyle time` `{flyMin.toFixed(1)} min`. No craft in part A overrides `calcRows`,
so the long-range cruiser and the whoop also say "Freestyle time".

Default warnings (when the craft has no `warnings`): over
`{kv} KV on {cells}S spins the props far past what the motors and ESC can take: expect hot motors and a desync.`;
weak `Thrust to weight {tw.toFixed(1)}:1 is too low for this kind of flying.`; otherwise green
`Parts match. Plenty of punch.` (tw > 10) or `Parts match. Good all-round build.`

Cost table: header row `Category`, `Parts`, `Cost`; `Electrical` with parts count = FIXED electrical rows + 2 (motors
and battery count as one line each) and the cost as `$287` style; `Mechanical` with count = FIXED mechanical rows + 1
(props); `Total (approx.)` = sum.

Changing a select: blocked while flying armed (`Land and disarm before changing parts`, value reverts);
otherwise updates the design, **sets `D.flight = null`**, plays `click`, re-renders (03:601-603).

All 108 combinations with displayed warning text are in Appendix A.

---

## 4. The bench: build, mistakes, safety tests

### 4.1 Parts, prerequisites, orientation

- `after` lists prerequisites (`inPl`, i.e. placed even if still dropping). `polar: true` parts have two
  orientation choices `opts[0]` (correct) and `opts[1]` (the mistake); orientation index 1 = the mistake.
- `Add next part ▾` lists **all** parts (not only the next one): one chip per non-polar part (`short`) and two
  per polar part (`{short}: {opt}`). Chip state: `current` if placed with that orientation; `disabled` if not
  placed and a prerequisite is missing (why = `{short} goes on after {missing.short lowercased}`) (03:672-674).
- `z` is the exploded-view layer.

### 4.2 `addPart(id, o)` rules (03:364-378), in order

1. In flight: `Land and go back to the bench first`.
2. Battery plugged and part is not BATT: `Unplug the battery first: never work on a live quad`.
3. Exploded view open: `Close the exploded view first`.
4. Already placed: same orientation or not polar: `{short} is already on` (tick). Different orientation:
   re-orient (part re-drops from t = 0, whoosh); XT60 re-orient sets `smokeOk = false`; FC re-orient sets
   `accOk = false`. **No `dkick()` here (03:370-371): if the loop is idle the part stays at t = 0, "not fitted",
   until something else kicks the loop** (verified: Parts showed 11/12 and `Calibrate accelerometer` answered
   `Mount the flight controller first`).
5. Missing prerequisite: `{short} goes on after {missing short lowercased}`.
6. PROPS while (`!smokeOk` and not `noSmoke`) or (`!motorOk` and the craft has motors):
   `Props go on LAST: run the smoke stopper test and the motor direction check first` (3.2 s).
7. Otherwise place (t = 0), select it, whoosh. Side effects: XT60 -> `smokeOk = false`; WIRES -> `motorOk = false`
   (so a fresh wiring job always has one reversed motor); FC -> `accOk = false`.

Animations (03:92, 305-309): a placed part drops from `70*u` mm above (u = mat/280) with ease-in-out while
`t += 2.2/s` (0.45 s), playing `place` on landing. Exploded view lifts each part by `ease(ex) * z * explode`;
`ex` moves at 1.5/s. Leaving parts fade with `t -= 2.6/s`.

### 4.3 Other bench buttons

- `Take it apart` (03:389-396): in flight `Land first`; unplug silently; close exploded; clear queue, selection and
  fault; empty: `Already a box of parts` (tick). Parts leave top layer first, staggered by 0.05; sets
  `smokeOk = motorOk = accOk = false`; whoosh.
- `Build it for me` (03:379-388): in flight `Land first`; unplug silently; close exploded; queue every missing
  part except PROPS in list order, then PROPS last, one every 0.35 s; already complete: `Already built` (tick).
  **Sets `smokeOk = motorOk = accOk = true` without fixing parts already placed the wrong way round.**
- `Exploded view` (03:687): in flight `Land first`; unplugs silently; toggles.
- `Plug / unplug battery` (03:397-406): in flight `Use Back to the bench first`; if plugged -> unplug
  (unplug sfx, log `battery unplugged`). Needs `plugNeeds` fitted: `Mount the battery and its power lead first`.
  Plug: plug sfx, log `battery plugged: {cells*4.2} V` (prints `25.200000000000003 V` for 6S). If the XT60 is
  reversed and `!smokeOk`: fault `{id:'XT60'}`, pop + sizzle (120 ms later),
  `POP: the capacitor was in backwards and vented. A smoke stopper would have caught it. Unplug, replace it` (4.2 s);
  the cap turns brown `#7a6a5a` and smoke puffs rise (spawn ~8/s at `smokeAt`, rise 30 mm/s, radius 3+9*age,
  opacity .6-.55*age, life 1.1 s). Otherwise power sfx and `Beep beep beep: ESCs armed-ready, FC and VTX on`.
  While powered (plugged, FC fitted, no fault) the FC LED (blue) and VTX/air unit/GPS LEDs glow.

### 4.4 Safety tests

**Smoke stopper test** (03:407-412, 125-129, 312). Absent when `noSmoke` (Tiny Whoop).
- Needs `smokeNeeds` (XT60 + ESC) fitted: `Solder the power lead and the ESC first`. In flight: `Land first`.
- Unplugs silently, click sfx, log `$ smoke stopper between battery and quad...`, runs 2.2 s.
- Visual: a dark box (30 x 18 x 12, scaled by u) at (0.09 mat, 0.71 mat) with a clear lamp labelled `STOP`,
  a red lead to the craft; the lamp blinks orange (`sin(12t) > 0`, glow r 7) when fine, glows solid red (r 16)
  when the cap is reversed.
- Result: reversed XT60 -> log `smoke stopper: SHORT detected`, toast
  `The smoke stopper lamp lit up: something is shorted. The cap is in backwards: flip it before you plug in for real`
  (buzz, 3.8 s), `smokeOk` stays false. Otherwise `smokeOk = true`, log `smoke stopper: no short, current ok`,
  toast `No short: the lamp only blinked. Safe to plug in` (ding).

**Check motor direction** (03:413-420, 108-122, 311).
- Rules in order: in flight `Land first`; no motors `Nothing to spin on this craft`; needs `motorNeeds`
  (WIRES + FC): `Wire the motors and mount the flight controller first`; props on:
  `PROPS OFF! Never spin motors on the bench with props on` (2.8 s); not plugged: needs BATT fitted
  (`Plug in a battery (USB alone can’t spin motors)`), then **auto-plugs** (plug sfx, no reversed-cap check).
- Log `$ motors tab: spin M1, M2, M3, M4 one at a time`. Each motor spins for 1.2 s in order
  (`spin = t*20 rad`); tags of other parts hide; a 288-degree arrow (radius 22u at height `arrowZ`) plus a pill
  `{M} CW` or `{M} CCW` shows over the spinning motor. If `!motorOk`, the wrong motor (index `wrongMotor`,
  default 2 = M3) shows the opposite direction in red with ` WRONG` (e.g. `M3 CW WRONG`).
- End: if it was wrong: `motorOk = true`, log `M3 direction reversed in ESC config`, toast
  `M3 spun the wrong way: reversed it in the ESC configurator. They all spin right now` (ding, 3.2 s); else
  `Every motor spins the right way` (ding). The battery stays plugged afterwards.

**Calibrate accelerometer** (03:421-426): in flight `Land first`; needs FC fitted:
`Mount the flight controller first`. FC reversed: `accOk = true`, log `acc calibrated (but board_align is wrong!)`,
toast `Calibrated level. Note: the arrow on the FC points backwards...` (tick). Else log
`$ calibrate accelerometer: done, level = 0.0 / 0.0`, toast `Accelerometer calibrated on a flat surface` (ding).
Works unplugged.

No CG check, servo test or elevon check exists in Figs 01 to 04 (those are craft `extraButtons` in Figs 09, 10,
12: `CG check`, `Check elevons`, `Servo test`, `Tilt servo test`, `Transition / back (T)`; part B).

### 4.5 The "real mistakes" and what happens

| Mistake | How you make it | What the lab does |
|---|---|---|
| Part out of order | pick a part whose `after` part is missing | refused: `{X} goes on after {y}` |
| Working on a live craft | add/re-orient a part while plugged | refused: `Unplug the battery first: never work on a live quad` |
| FC arrow backward | `FLIGHT CTRL: arrow backward` (whoop: `AIO BOARD: ...`) | calibrate warns; on take-off (armed > 0.25 s, thrust > 5%) roll += 900 deg/s, pitch += 500 deg/s -> flips -> crash `Flipped on take-off: the flight controller is mounted the wrong way round` |
| Cap reversed | `XT60 + CAP: stripe to plus` | smoke stopper lights red; plugging without a passed test -> POP fault (smoke; flying refused: `Fix the fault first (unplug, replace the capacitor)`); fix = unplug, re-add `stripe to minus`, re-run the smoke test |
| Skipping the smoke test | fly after adding the XT60 | `Do the smoke stopper test first: a short on the first plug kills ESCs` |
| Props before tests | add PROPS before smoke + motor checks | refused (rule 6) |
| Spinning motors with props on | `Check motor direction` with props fitted | refused: `PROPS OFF! ...` |
| Wrong motor direction | always present after WIRES until the motor check | the check reveals M3 and fixes it in "ESC config"; the take-off flip for it (`...motor direction was never checked (bench: Check motor direction)`) is unreachable through the UI because props cannot go on first |
| Props swapped | `PROPS: swapped CW/CCW` | flips on take-off: `Flipped on take-off: the props are on the wrong motors` (roll direction -1) |
| ACC not calibrated | after placing/re-orienting the FC | arming refused: `Arming blocked: ACC not calibrated. Run Calibrate accelerometer on the bench` |
| Throttle up when arming | manual-throttle modes, throttle > 8% | `Arming blocked: throttle not at zero (that is a safety rule, not a bug)` |
| GPS puck backward (Fig. 04) | `GPS: arrow backward` | only GPS rescue notices: it flies away from home (section 9.4) |
| Too much KV for the pack | design pickers | warning; in flight a heat counter desyncs the ESC (section 7.3) |
| Too little thrust | design pickers | warning only; alt-hold still climbs at the full 2.2 m/s while T:W >= ~1.7 (`(g + 3*2.2)/(tw*g) <= 1`); the only felt effect is a high hover throttle in manual modes |
| Discharging too low | flying long | `LOW BATTERY: land now (3.5 V per cell)`, cutoff below 3.2 V/cell (section 7.4) |

Fault precedence on take-off: FC reversed, then props swapped, then motor not checked (03:173).

### 4.6 Bench drawing notes

Mat: a rounded board `mat x mat`, 4 mm thick, corner radius 8, grid lines every 40 mm at 50% (03:103-105). Part
tags (cream pills with leader lines) from `tags`, hidden for the selected part and during the motor test; the
selected part's pill is drawn in the accent colour at a fixed spot above the craft centre (03:132-134).
Clicking any drawn part selects it (`act('part')`, pointerdown, 03:689). Props render as blades when slow and as a
translucent disc when `rpm > 0.12` (opacity quad5 `.18 + .22*rpm`, whoop and cinewhoop `.2 + .25*rpm`, long range
`.16 + .2*rpm`); in flight `rpm = max(.2, thrEff)` while armed. Motor bells show 3 rotating spokes; M1 and M4 turn
the negative way (CW). No cast shadow is drawn for the craft (the `hull` points are unused).

### 4.7 Complete message catalogue (bench and flight)

Toasts (sound in brackets; default 2.2 s, `error`): see 4.2 to 4.4 plus:
`Finish building it first: Build it for me is fine` (2.4 s), `Fix the fault first (unplug, replace the capacitor)`,
`Do the smoke stopper test first: a short on the first plug kills ESCs` (2.6 s), `Already on the bench` (tick, 1.2 s),
`Land and disarm before changing parts`, `Pick a flight mode first, then switch to FPV`,
`Gusty wind on` / `Wind off` (click, 1.4 s), `Pick a flight mode under Fly first`, `Land first`,
`Crashed: press R (or Reset) to put it back on the pad` (2.0 s), core picker notes `{label} — already set`.

Log lines (last 10 kept): `-- betaflight --`, `battery plugged: {V} V`, `battery unplugged`,
`$ smoke stopper between battery and quad...`, `smoke stopper: SHORT detected`, `smoke stopper: no short, current ok`,
`$ motors tab: spin M1, M2, M3, M4 one at a time`, `M3 direction reversed in ESC config`,
`acc calibrated (but board_align is wrong!)`, `$ calibrate accelerometer: done, level = 0.0 / 0.0`,
`-- field: {mode title} --`, `ARMED  mode: {mode title}` (two spaces), `disarmed`, `CRASH: {reason lowercased}`,
`ESC desync: motor 3 overtemp`, `lap {t.toFixed(2)} s`, `range run {t.toFixed(2)} s`, and Fig. 04's
`failsafe -> GPS RESCUE`, `RX LOSS -> failsafe -> GPS RESCUE`, `rescue: climb done, heading home`,
`rescue: heading error, distance growing`, `rescue: over home, descending`, `rescue: landed, disarmed`.

Flight messages: arming hints (mode `hint`, else `Fly through the gates in order` for race,
`Hold W to climb, arrows to fly` for alt, `W/S throttle, arrows to fly` otherwise), `Out of the field: turn back (R resets to the pad)`,
`LOW BATTERY: land now (3.5 V per cell)`, `Battery empty: the ESCs cut out. Never fly a LiPo this low`,
`{reason}. Press R to reset`, `Desync! {kv}KV on {cells}S overheats: the ESC lost a motor`,
`Lap {t.toFixed(2)} s` (+ ` (best!)`), `{label} done` or `Checkpoint {i}/{N}`, `{range title} done: {t.toFixed(1)} s` (+ ` (best!)`),
and the Fig. 04 rescue messages (section 9.4).

Crash reasons: `Crashed into the ground: props broken`, the three `Flipped on take-off: ...` texts, `Hit an obstacle`,
`Hit a tree` (cones), `Hit a roof` (4-sided pyramids).

---

## 5. Wiring diagram (03:463-477)

- An SVG `viewBox="0 0 760 340"`, monospace, inside the `Wiring · click a block` card.
- Each node: `[x, y, TITLE, sub, colour]` -> a 150 x 56 rounded rect (rx 10, paper `#fbf8f0`, ink stroke 1.6), an 8 px
  colour bar on the left, title 12.5 px bold at (x+18, y+23), sub 10.5 px muted at (x+18, y+41).
- Lines: `ln(points, colour, width, dash)` polylines (dash `6 4` = data/signal or RF) and `lab(x, y, text)` 10 px
  muted labels.
- Legend at y 330, 150 px per entry (22 x 4 swatch + text). Default legend: `power` `#e2483d`, `data / signal`
  `#43a35a`, `video` `#f2c230`, `motor phases` `#f08a2b`.
- Clickable: every node. Click toggles `D.sel` to that node id (tick); node ids equal part ids, so the selected
  block turns accent-coloured, the same part's pill lights on the bench, and `Selected part` shows the part's
  name and explanation. Parts list buttons and clicks on the bench figure select the same way.
- Dynamic content: battery sub = battery name; motors sub = motor name; the pack voltage label = `c.V.toFixed(1)V`
  (nominal: 22.2, 14.8, 3.7, 7.4). Nothing animates; current is not shown.
Per-craft nodes and lines are in section 9.

---

## 6. Lesson content mechanics

### 6.1 CLI card
Bench: craft `buildCode`. Flight: `MODES[mode].code`; heading `{cliName} · {mode title}`. Range mode code:
`range.code` or `# fly the checkpoints in order; the run time is kept`.

### 6.2 Log terminal
`D.serial`, last 10 lines, `#1d2a26` background, `#8af0ae` text.

### 6.3 Quiz (03:608-612)
`{i}. {question}` then one chip per answer. Clicking stores the choice; correct chip turns green (`chime`), a wrong
chip is struck through and faded (`buzz`); you can try again. No score, no persistence, reset on craft switch.

### 6.4 Selected part, parts list
See 1.2. Clicking the same part again deselects.

---

## 7. Flight model and flying range

### 7.1 Entering flight: `fly(mode)` (03:450-459)

Refusals: not every part fitted -> `Finish building it first: Build it for me is fine`; fault ->
`Fix the fault first (unplug, replace the capacitor)`; `!smokeOk && !noSmoke` ->
`Do the smoke stopper test first: a short on the first plug kills ESCs`. `accOk` and `motorOk` are not checked
here (arming checks `accOk`).

Then: `D.mode = mode`, view `fly`, `plugged = true`, exploded closed, `auto = false`. A new flight is created
unless the current one is airborne and not crashed (so switching mode mid-air keeps position). Sticks are zeroed
(this also zeroes a manual throttle, see defects), sticks parked, log `-- field: {title} --`, whoosh, stage gets
classes `flying` (+ `fpv`). `Back to the bench` disarms, stops the hum, removes `flying`/`fpv`
(`FPV.on` stays, so FPV comes back next flight).

`newFlight()` (03:139-143): position = pad, z = 0, everything zero, `volt = cells*4.2`, `used = 0`,
`c = calc(design)`, fresh battery. `R` / `Reset` creates a new flight (keeps the camera), zeroes sticks and
virtual sticks, parks the sticks, whoosh.

### 7.2 Modes

Default `DEF_MODES` (03:428-449), used by quad5, whoop and (by reference) longrange:

| key | title | behaviour |
|---|---|---|
| `alt` | `Altitude hold (easy)` | self-levelling, throttle = climb-rate command |
| `angle` | `Angle mode` | self-levelling, manual throttle |
| `acro` | `Acro (rate) mode` | rate mode, manual throttle |
| `race` | `Gate race` | angle behaviour + gate timing |
| `range` (added at mount when `range.goals`) | `Range: {range.title}` | alt-hold unless `range.alt === false`; checkpoints |

`isAltMode(m)` = `m === 'alt'` or `MODES[m].alt`; `isAcroMode(m)` = `m === 'acro'` or `MODES[m].acro` (03:145-146).
There is no horizon mode in this slice. Craft modes: cinewhoop adds `cine`; longrange adds `rescue` (section 9).

### 7.3 The multirotor model (03:153-206). Substeps of at most 10 ms (`n = ceil(dt/0.01)`, 03:318)

Arming state: when disarmed or crashed, `thrEff -= 3/s` (spin-down).

Attitude:
- Grounded (`z <= 0.02` and `thrEff < 0.3`): roll, pitch `*= 0.8` per substep.
- Acro: `roll += stick.roll * 540 deg/s * dt`, same for pitch (no self-levelling).
- Self-level modes: target = `stick * 38 deg`; `roll += (target - roll) * min(1, 9*dt)` (time constant ~0.11 s).
- Yaw (all modes): `yaw += -stick.yaw * 200 deg/s * dt`.
- `!accOk` outside acro: `roll += 18 deg/s` drift (03:163; unreachable because arming needs `accOk`).

Throttle:
- Alt-hold: `target = stick.thr * 2.2` m/s; `need = (g + 3*(target - vz)) / (tw*g) / max(0.4, cos(roll)*cos(pitch))`
  where `tw*g = n*thrust/1000*g/(auw/1000)`; `thr = clamp(sqrt(max(0, need)), 0, 1)`; on the ground with
  `stick.thr <= 0`, `thr = 0`.
- Manual: `thr = clamp(stick.thrAbs, 0, 1)`.
- Spool-up: `thrEff += (thr^2 - thrEff) * min(1, 18*dt)` (~55 ms lag). `thrEff` is the fraction of max thrust.

Faults (armed > 0.25 s and `thrEff > 0.05`): FC reversed, props swapped, or `!motorOk`: `roll += 900 deg/s * dt * (FC ? +1 : -1)`,
`pitch += 500 deg/s * dt`. Over-KV: `heat += dt * thrEff * 1.6`; at `heat > 9` desync once (message, log, pop),
then each substep `thrEff *= 0.985` and `roll += 120 deg/s * dt`. Heat never cools: about 5.6 s at full throttle,
about 140 s at hover for a 2450 KV 6S quad (verified 5.67 s and 138.45 s). In self-level modes the craft only leans
~13 degrees with ~92% thrust and drifts away (it does not drop); in acro it rolls continuously.

Forces (g = 9.81):
```
CEIL = DR.ceiling || 12
T = thrEff * n * thrust/1000 * g * (z > CEIL-3 ? max(0, 1 - (z - CEIL + 3)/3) : 1)   // N, soft ceiling
F = Rx(Ry(Rz(I, yaw), pitch), -roll);  up = F * (0,0,1)                             // +pitch tilts thrust to the nose, +roll to the left
wind = D.wind ? [1.2 sin(0.7 t), 0.8 cos(0.5 t), 0] : 0                             // m/s, t = time since arming
a_i = up_i * T/m - drag * (v_i - wind_i) * (|v| + 1);  a_z -= g                     // drag default 0.045
v += a*dt;  p += v*dt                                                                // semi-implicit Euler
```
Consequences (measured): alt-hold climb 2.2 m/s; with W held the soft ceiling settles at `CEIL - 1.79` m
(quad5: 10.2 m; 10.47 m peak), released it sinks to `CEIL - 3`; manual full throttle carries the craft far above
the ceiling on momentum (quad5 reached 30 m). Angle-mode top speed of the 5-inch ~14 m/s (50 km/h); acro dive
~50 m/s (180 km/h). The gusts move a hovering 5-inch about 0.2 m in 5 s (barely perceptible).

Ground (z <= 0): crash when `t > 0.3` and (`vz < -3.2` or (tilt > 55 deg and `|v| > 1.5`) or `|v| > 6`),
tilt = `acos(up_z)`, reason `flipWhy` or `Crashed into the ground: props broken`; then z = 0, `vz = max(0, vz)`,
`vx, vy *= 0.8`, and if not crashed and `thrEff < 0.3` the attitude levels.

Then `worldCollide`, `gateCheck`, `goalCheck`; out of field (`x` or `y` outside `[-2, FIELD+2]`) shows the
out-of-field message once per excursion; `batteryStep`; crashed crafts tumble (`tumble += 8/s`, `roll += 6/s`,
visual only); `t += dt`; prop spin `+= dt*(6 + 60*thrEff)` while armed.

`crash(fl, why)` (03:220): crashed, disarmed, `D.crashes++`, message `{why}. Press R to reset`, pop then sizzle
(100 ms), log `CRASH: {why lowercased}`, tracked. Props vanish (broken). Space then says
`Crashed: press R (or Reset) to put it back on the pad`.

### 7.4 Battery model (03:208-219)

While armed and not crashed:
```
amps  = c.hoverA * (thrEff / max(0.05, c.hoverThr^2))^1.25 + 0.4     // 0.4 A idle (FC, VTX)
used += amps * dt / 3.6                                               // mAh
soc   = max(0, 1 - used/mah)
volt  = cells*(3.3 + 0.9*soc^0.7) - amps*0.012*(cells/6)*(DR.sagK || 1)
```
Per-cell sag is `0.002 V per amp` for every pack. Below 3.5 V/cell once: `LOW BATTERY: land now (3.5 V per cell)`
(error sfx). Below 3.2 V/cell: disarm, `Battery empty: the ESCs cut out. Never fly a LiPo this low` (unplug sfx).
At hover the voltage floor is ~3.29 V/cell even when `used > mah`, so **a hovering craft never cuts out**
(verified). Thrust does not depend on voltage. Full chemistry is LiPo for every pack (Li-ion and HV included).

### 7.5 Controls

Keyboard (03:327-348), only in flight and not while typing in an input/select/textarea; `preventDefault` on:
`KeyW KeyS KeyA KeyD ArrowUp ArrowDown ArrowLeft ArrowRight Space KeyR KeyV`.
- `Space` (no repeat): arm/disarm. `R`: reset to the pad. `V`: FPV on/off.
- Held keys: yaw = D - A; pitch = Up - Down; roll = Left - Right (left arrow banks left); each smoothed toward
  its target at `min(1, 10*dt)` per frame. Virtual-stick values override keys.
- Throttle: alt modes `thr = W - S` (instant, springs to 0); manual modes `thrAbs += (W - S) * 0.32/s`
  (0 to 100% in ~3.1 s), stays where left (like a throttle stick).
- `D.auto` (an autopilot) skips the throttle read; the autopilot writes `D.stick` itself.
- `T` is not an engine key (only the VTOL craft listens for it).

Arming (`toggleArm`, 03:351-360): crashed -> refuse; armed -> disarm (in the air too: the craft falls), unplug sfx,
log `disarmed`; airborne (z > 0.05) -> ignored silently; `!accOk` -> refuse; manual mode and `thrAbs > 0.08` ->
refuse; else arm, `t = 0`, power sfx, log, hint message.

Virtual sticks (03:552-568), shown only in flight: two 118 px circles, left `THROTTLE · YAW`, right `PITCH · ROLL`,
38 px knob, travel 40 px, clamped to the unit circle, pointer-captured by id (pointercancel releases). Left: x = yaw;
alt modes y = climb (springs back); manual modes `thrAbs = (y+1)/2`, no spring, and the touch starts relative to
the knob (no jump). Right: roll = -x, pitch = y, springs back. Parking: knobs centred, except a manual-mode
throttle knob parks at the bottom (zero) (03:349-350).

### 7.6 The range: world API and contents (04:6-46)

`range: { title, brief, field, pad:[x,y], ground, alt, camTilt, keepGates, code, prims:[...], goals:[...] }`.

Prims (metres; z defaults 0; yaw degrees):

| type | fields | built as |
|---|---|---|
| `box` | x, y, z, w, d, h, yaw, col, solid (default true) | oriented box |
| `house` | x, y, w, d, h, yaw, col, roof, roofCol | box + 4-sided pyramid roof (r = diagonal/2*1.02, height `roof` or 0.45*min(w,d), rot yaw+45, colour `#c96a4e`) |
| `cyl` | x, y, z, r, h, r1 (top radius), n (sides, 14), rot, col, solid | cylinder or cone |
| `tree` | x, y, h (3) | trunk cyl r .16 h .35h `#bf8a4f` (8 sides) + crown cone base r max(.5, .22h) at z .3h, h .7h, r1 .03, `#6aa86b` (12 sides) |
| `pole` | x, y, h, r (.08), col (`#8a8f93`) | 8-sided cylinder |
| `gate` | x, y, heading, w, h, col (`#ece6d6`) | two .07 m posts h+.07 at +-(w/2+.035) across the heading + top bar |
| `flat` | x, y, w, d, yaw, col, label, ink | ground decal |
| `disc` | x, y, r, col, label | round ground decal |

Without `prims` the default 6 trees and 5 gates are used; with `prims` the race gates are added as solids only
when `keepGates`. A pad decal is always added: white disc r 0.6 labelled `H` at the pad.

Collisions (`worldCollide`, 04:49-62), once per step: radius `m = hitR (0.14)`; skip solids not overlapping
`[o.z - m, o.z + o.h + m]` in height. Box: point in the rotated rectangle grown by m -> `Hit an obstacle`
(`o.name` is never set). Cylinder: radius interpolated at height; 4-sided: diamond test `|lx| + |ly| < r + m` ->
`Hit a roof` if `r1 < r/2` else `Hit an obstacle`; round: `Hit a tree` if `r1 < r/2` (any cone, including the
long-range ridges) else `Hit an obstacle`.

Checkpoints (`goalCheck`, 04:63-79), only in `range` mode, in order: a goal with `heading` is a ring: passed when
the signed distance along the heading normal crosses from < 0 to >= 0 and `hypot(lateral, dz) < r`; without
heading it is a sphere touched when the 3D distance < r. Passing goal 1 starts the run clock (`runStart`). Each
pass: chime and `{label} done`. The last one: run time `t - runStart`, `D.laps++`,
`D.best = min(best, t)`, message `{title} done: {t.toFixed(1)} s` (+ ` (best!)`), log, ding, tracked
`mastered`, and the course restarts at goal 1 with the clock running from now.

Race gates (`gateCheck`, 03:221-232), only in `race` mode: same plane-crossing test against
`(cos h, sin h)`, `lateral < GATE_W/2` and `0.05 < z < GATE_H`. Gate 1 starts the lap clock; after the last gate:
`Lap {t.toFixed(2)} s` (+ ` (best!)`), log, ding, `D.laps++`, best updated, gate index back to 0, clock restarted
(so every lap after the first is a flying lap). `D.best` is shared by race laps and range runs.

### 7.7 Third-person iso view (03:246-274, 04:82-107)

- World units mm (`K = 1000` per metre). View width `flyVB` (default 5200 mm; x0.8 on phones), height 0.75 x
  width (1.05 x on phones). The ink weight and hand-drawn filter are rescaled per zoom; the filter region is
  pinned to the visible frame so WebKit does not drop it (03:237-244).
- Camera: `cam += (target - cam) * 0.14` per frame, target `(x, y, z*camZ)`; the field is a 40 mm slab with a grid every
  `max(1, round(FIELD/30))` m.
- Decals, solids (with blue cast shadows), checkpoint rings (ink + colour, next one in the palette light colour,
  others `#ece6d6`; spheres as translucent circles r*1.22), the craft drawn `flyScale` x life size, a dashed height
  line and ground dot when z > 0.05, `flyExtra`, and a pill tag at the next gate (`GATE {n}`) or next checkpoint
  (its label or `CHECKPOINT {n}`).
- Painter's order by depth; there is no cutaway: the craft disappears under bando floors and the cinewhoop's roof
  (screens `34-quad5-range-mid.png`, `55-cine-iso-hallway.png`).

### 7.8 FPV view and OSD (04:110-215)

Renderer: 1000 x 750 view; the goggles image is the rectangle (250, 0, 750 x 562), rx 26, leaving the button
column clear on desktop; phones crop to it. Camera at the craft + 0.08 m, attitude = craft yaw/pitch/roll (+tumble),
then pitched up by `camTilt` (`range.camTilt`, else `DR.camTilt`, else 25 deg); gimbal crafts (`fpvLevel`) use yaw
only. Horizontal FOV `fpvFov` (105 deg), focal `375/tan(fov/2)` px, near plane 0.06 m with polygon clipping.
Scene: sky `#cfe2ea`; 28 hills on a ring of radius `max(500, 4*FIELD)` m, heights `25 + 45|sin(1.7i)|` m,
`#b8c7c3`; ground plane +-3000 m `#e3e6d2`; the field square in the range ground colour with a grid; decals far to
near; solid faces back-face culled and depth sorted, shaded by `SUN = norm(-.45, -.25, .86)` (light tone when
dot > .55, mid when dot > .05, else dark); cylinders as side strips plus a top cap when above; checkpoint rings (width
`clamp(260/dist, 1.5, 18)`, next one accent, others `#f4f1e6`); prop blur for `fpvProps` crafts: two white circles
r 120 at the top corners, opacity `.12 + .2*thrEff`.

OSD (white 800-weight monospace with a dark 3.2 px outline; x1.35 on phones):
- top left: pack voltage `{V.toFixed(1)}V` (red `#ff6b5b` below 3.5 V/cell), under it `{A.toFixed(1)}A  {mAh}mAh`
- top right: flight timer `mm:ss` since arming
- bottom left `ALT {z.toFixed(1)}m`; bottom right `{km/h} km/h`
- bottom centre: `CRASHED`, the mode title uppercased (green `#8af0ae` while armed), or `DISARMED` (yellow `#ffd25e`)
- centre: crosshair; artificial-horizon bar `translate(cx, cy + clamp(pitch_deg*4, +-150)) rotate(roll_deg)`
  (**pitch sign inverted**: the bar moves down when the nose drops while the real horizon moves up; roll correct;
  screens `80-ahi-*.png`)
- blinking `LOW BATTERY` (red) below 3.5 V/cell
- top centre: an arrow pointing to the next target (range checkpoint, race gate, else the pad) and
  `{label}  {dist}m` where label = checkpoint label or `CP i/N`, `GATE i/N`, or `HOME`
- the flight message in yellow, truncated to 46 characters + `…`

### 7.9 Other flight features

- `Wind on / off` (Fly menu, also on the bench): see 7.3. No indicator is drawn.
- Motor sound while armed (03:288-298): sawtooth + square (x2.01) through a 1400 Hz low-pass, frequency
  `95 + 430*thrEff` Hz, gain `0.025 + 0.05*thrEff`.
- Autopilot hooks: craft `physics` may set `D.auto = true` and write `D.stick` every substep before calling
  `multirotor` (Fig. 04 GPS rescue); `flyExtra` / `flyStats` add drawing and stats; `?auto` and `?pose` drive
  demos and screenshots.
- No missions, no wind sock, no replay, no ghost, no lap list, no crash counter on screen.

---

## 8. Sound, tracking, progress

Synthesized with WebAudio, no files (01:63-166): a compressor out, music bus through a 2400 Hz low-pass,
effects bus at 0.55 gain.
- `Lofi`: 74 bpm loop Dm9 - G13 - Cmaj9 - Am9, rhodes-like chords, bass, kick, soft snare, hats, sparse melody,
  vinyl crackle; fades in/out. Off by default.
- `Effects` (on by default; read from `localStorage['rb-audio'].sfx` but never written back).
- Effects used here: `tick` (buttons, selections), `place` (part lands), `whoosh` (add, strip, build, explode,
  fly, bench, reset), `click` (select change, FPV toggle, smoke test start, wind), `plug`, `power`, `unplug`,
  `pop` + `sizzle` (cap vents, crash), `pop` alone (desync), `buzz` (short found, wrong quiz answer, compass warning), `ding`
  (test passed, lap, run done, landed), `chime` (gate, checkpoint, right quiz answer), `error` (refusals,
  low battery, link lost).

Tracking (01:173-191): anonymous visitor id in localStorage `rb-vid`, events queued and sent with `sendBeacon` to
`/api/track` when the tab hides; off on localhost and when `rb-owner=1`. Events: `board` (mount), `btn` (button
label, `fly {mode}`), `pick` (picker chip, `batt:6s1800` style design changes), `part` (part clicked), `quiz`
(index, correct), `fault` (crash), `mastered` (lap, range run, rescue landing).

Progress: none is persisted. Quiz answers, best lap, laps, crashes and the build state vanish on reload or when
switching crafts.

---

## 9. The four crafts

Common: `log: 'betaflight'`, Betaflight motor order M1 rear-right CW, M2 front-right CCW, M3 rear-left CCW,
M4 front-left CW ("props in"); `wrongMotor` default M3.

### 9.1 Fig. 01 `quad5` — 5-inch freestyle quad (05)

Identity: name `5-inch freestyle quad`, sub `Betaflight + FPV`, hint `design it, build it, smoke-test it, then fly it`,
noun not set (renders `Meet the drone`), palette `tomato`, mat 280, benchH 120, flyScale 4, flyVB 8000,
ceiling 12 (default), drag 0.045, hitR 0.14, FPV tilt 25 (default), `fpvProps: true`. Default design
`6s1100 / 2306-1750 / 5x4.3x3`. Constants kThrust 1.06, gPerW 5.4.

Batteries (05:4-8):

| key | name | cells | mAh | g | $ | colour / label |
|---|---|---|---|---|---|---|
| 6s1100 | `6S 1100 mAh` | 6 | 1100 | 178 | 38 | `#2b2a28` / `6S 1100` |
| 6s1800 | `6S 1800 mAh` | 6 | 1800 | 282 | 54 | `#2f5fa8` / `6S 1800` |
| 4s1500 | `4S 1500 mAh` | 4 | 1500 | 182 | 30 | `#d9a520` / `4S 1500` |

Motors (05:9-13): `2306 1750KV` 1750 KV 32 g $22; `2207 1950KV` 1950 KV 34 g $24; `2306 2450KV` 2450 KV 31 g $20
(`forCells` 6/6/4). Props (05:14-18): `5x4.3x3 tri-blade` pf 1.00 eff 1.00 4.4 g $4; `5.1x2.5x3 (efficient)` pf .84
eff 1.18 4.0 g $4; `5x5x3 (aggressive)` pf 1.10 eff .88 4.8 g $4.

Fixed parts (05:19-23): `5" carbon frame` 118 g $39 M; `45A 4-in-1 ESC` 8 g $45 E; `F7 flight controller` 7 g $39 E;
`Analog FPV camera` 7 g $25 E; `5.8 GHz VTX + antenna` 9 g $30 E; `ELRS 2.4 GHz receiver` 2 g $18 E;
`XT60 pigtail + low-ESR cap` 12 g $4 E; `Top plate + standoffs + screws` 22 g $8 M; `Battery strap + pad` 5 g $4 M.
Default results: 514 g, 1600 g/motor, 12.5:1, hover 28%, 144 A, 12.3 min hover, 5.2 min freestyle, $287 + $59 = $346.

Build (05:24-37). Order shown in the picker; prerequisites in brackets; explanation summarised:
1. `FRAME` — Carbon frame: bottom plate + arms. True-X, 5 mm arms, 225 mm motor to motor; carbon conducts, keep bare leads off it.
2. `MOTORS` [FRAME] — outrunner bells around fixed windings; KV x volts = prop speed.
3. `ESC` [FRAME] — four controllers on one board, DC to 3-phase for each motor.
4. `MOTOR WIRES` [MOTORS, ESC] — three wires per motor in any order; direction is fixed later in software.
5. `FLIGHT CTRL` [ESC], polar `arrow forward` / `arrow backward` — gyro + PID loop; arrow must face the nose.
6. `XT60 + CAP` [ESC], polar `stripe to minus` / `stripe to plus` — battery lead + 1000 uF spike cap; stripe to minus or it vents.
7. `CAMERA` [FRAME] — analog camera tilted up ~30 degrees to keep the horizon in view at speed.
8. `RECEIVER` [FC] — ELRS 2.4 GHz on an FC UART, two antennas at 90 degrees.
9. `VTX` [FC] — 5.8 GHz video to the goggles; never power without an antenna.
10. `TOP PLATE` [FC, CAM, RX, VTX] — closes the stack, carries the battery; standoff height matters.
11. `BATTERY` [TOP, XT60] — heaviest part; never below 3.5 V/cell, store at 3.8 V, never charge unattended.
12. `PROPS` [MOTORS, TOP], polar `props in (correct)` / `swapped CW/CCW` — two CW, two CCW to cancel torque; last.

Motor positions (05:38): +-79.5 mm on both axes. Tags (05:145): FC, ESC, CAM, VTX, XT60, MOTORS, BATT.

Wiring (05:146-162) nodes: `BATTERY` (battery name), `XT60 + CAP` `1000 uF 35 V`, `4-IN-1 ESC` `45 A x 4, BLHeli_32`,
`FLIGHT CTRL` `F7, gyro, Betaflight`, `RECEIVER` `ELRS 2.4 GHz`, `CAMERA` `analog, 30 deg`, `VTX` `5.8 GHz, 400 mW`,
`MOTORS x4` (motor name). Lines: battery to XT60 to ESC (red/black, voltage label), ESC to motors (3 orange,
`3-phase x4`), ESC to FC (`VBAT` red, `M1-M4` dashed green), FC to RX (`UART2 + 5V`), FC to camera (`video in`
yellow), FC to VTX (`video + SmartAudio`, yellow + dashed green). Default legend.

Overview (summary): the standard first FPV build (four brushless motors, 4-in-1 ESC, Betaflight FC, analog camera
and VTX, ELRS link); the FC's PID loop is the same idea as the line follower in the robotics lab, in three axes.

`buildCode` (verbatim):
```
# after the build, in the Betaflight CLI:
resource                      # check motor + UART mapping
set align_board_yaw = 0       # 180 if the arrow points back
set motor_pwm_protocol = DSHOT600
set yaw_motors_reversed = OFF # "props in"
serial 1 64 115200 57600 0 115200   # UART2 = ELRS
save
```
Mode codes (DEF_MODES, verbatim):
```
alt:   # beginner: the FC holds height for you
       # W/S = climb/descend, arrows = tilt, A/D = yaw
       set alt_hold_throttle_deadband = 15
       aux 1 ANGLE   ...   # self-level on
       aux 2 ALTHOLD ...
angle: # self-levelling: release the stick, it levels
       # W/S move the throttle and it STAYS there
       set angle_limit = 38
       set p_level = 50
       set i_level = 50
acro:  # what freestyle pilots fly: sticks = rotation RATE
       # let go and it keeps its angle, it does NOT level
       set roll_rc_rate = 100
       set roll_srate = 70      # ~540 deg/s at full stick
       set p_roll = 45
       set d_roll = 40
race:  # 5 gates, fly them in order, the timer starts at gate 1
       # (angle mode here; real racers fly acro)
       set osd_timer_1 = ON
       set osd_stat_max_spd = ON
range: # fly the checkpoints in order; the run time is kept
```
(The `alt:` etc. prefixes are mine; each block is a separate `code` string.)

Range `Freestyle bando` (05:46-72): brief `Thread the gap, fly through the bando, top the tower, dive it, land`;
field 40 m, pad (20, 6), ground `#dde3cc`, `keepGates: false`, alt-hold controls.
Prims: old road flat (20, 21) 3 x 32 `#d4cfc4`; bando slab flat (30, 22) 10 x 14; six pillars .6 x .6 x 6.3 at
x 26.3/30/33.7, y 16.3/27.7; two floors (30, 22) 8 x 12 x .3 at z 3 and z 6; back wall (33.7, 22) .3 x 11 x 3;
the gap: two walls .4 x 6 x 4 at x 15 and 16.6, y 20 (1.2 m apart, `#e0a26a`); dive tower (8, 30) 3 x 3 x 10 with a
3.6 x 3.6 x .3 top at z 10; five power poles h 8 at y 37, x 5/12/19/26/33; trees (5, 9) 3.2, (36, 8) 3.6,
(24, 33) 2.8, (11, 14) 2.6, (36, 33) 3; barrels r .5 h .9 at (23, 12) yellow and (24.2, 12.4) blue.

| # | label | x, y, z | r | type |
|---|---|---|---|---|
| 1 | `THE GAP` | 15.8, 20, 2 | 0.8 | ring, heading 90 |
| 2 | `BANDO` | 30, 22, 1.5 | 1.1 | ring, heading 90 |
| 3 | `TOWER TOP` | 8, 30, 11.6 | 1.6 | sphere (**unreachable**, see defects) |
| 4 | `DIVE` | 8, 27.4, 1.6 | 1.3 | ring, heading -90 |
| 5 | `LAND` | 20, 6, 0.8 | 1.6 | sphere |

Race: default 5 gates `[18.5,15,0] [21.5,18.5,70] [18,21.5,165] [13,20,215] [12,15.5,-60]`, 1.6 m, but not built as
solids (`keepGates: false`) so they are invisible (only the `GATE n` pill floats), and the 3 to 4 leg crosses the gap
walls (verified crash `Hit an obstacle`).

Quiz (verbatim; correct answer marked *):
1. `Why do the props go on last?` `They are fragile` / *`A motor test or short with props on can throw the quad at your face` / `They block the camera`
2. `The arrow on the flight controller points backwards. What happens on takeoff?` `Nothing, the gyro does not care` / *`It corrects the wrong way and flips instantly` / `It flies slower`
3. `What does the big capacitor on the XT60 lead do?` `Stores energy for longer flights` / *`Soaks up voltage spikes from the ESCs` / `Filters video noise only`
4. `You let go of the sticks in acro mode. The quad...` `levels itself` / *`keeps whatever angle it had` / `lands`

Practice (summary): five gate laps in angle mode then one in acro; for a real build, smoke-stopper the first plug,
check motor direction with props off and compare the real flight time with the estimate.

Visual notes (05:73-143): carbon plate 112 x 46 + four 96 mm arms; green ESC with four FETs; blue FC with a white
direction arrow and a blue LED when powered; yellow XT60, red/black leads, a blue capacitor whose white stripe
swaps side with the orientation (brown when popped); camera between two palette-coloured plates, lens tilted 60
degrees from vertical; RX with two whips; VTX with an angled antenna and red LED; top plate on 30 mm standoffs;
battery box (longer for packs over 1500 mAh) in the pack colour with its label; battery lead only drawn when
plugged; tri-blade props radius 63 mm.

### 9.2 Fig. 02 `whoop` — Tiny Whoop 65 mm (06)

Identity: name `Tiny Whoop 65 mm`, sub `indoor, brushless`, noun `whoop`,
hint `build it, plug it in, then fly the living-room course`, palette `mint`, mat 120, benchH 60, benchZ 8,
benchYaw 45, flyScale 7, flyVB 4200, ceiling 5, drag 0.09, hitR 0.06, gates 0.8 x 0.8, arrowZ 22,
`noSmoke: true`, `plugNeeds: ['BATT','FC']`, `motorNeeds: ['WIRES','FC']`, `smokeAt [60,60,14]`, `fpvProps: true`.
kThrust 0.00304, gPerW 3.6, maxKvCells 28000, minTW 2.6. Default `1s300 / 0702-25000 / 31mm-4`.

Batteries: `1S 300 mAh (BT2.0)` 1S 300 mAh 7.5 g $6 `#3a3632`; `1S 450 mAh HV (BT2.0)` 1S 450 mAh 11 g $7 `#2f5fa8`;
`2S 300 mAh (XT30)` 2S 300 mAh 16 g $9 `#d9a520`. Motors: `0702 25000KV` 1.9 g $9; `0702 23000KV` 1.9 g $9;
`0702 27000KV` 1.9 g $10. Props: `31 mm 4-blade` pf 1.00 eff 1.00 .25 g $1.5; `31 mm 3-blade` pf .90 eff 1.08 .22 g $1.5;
`31 mm 2-blade (efficient)` pf .78 eff 1.20 .18 g $1.5.

Fixed: `65 mm ducted frame` 3.6 g $6 M; `AIO: F4 FC + 4x5A ESC + ELRS` 2.6 g $40 E; `Nano camera` 1.6 g $15 E;
`On-board VTX + antenna` .4 g $3 E; `ELRS antenna` .2 g $2 E; `Canopy` 1.2 g $4 M; `Screws + grommets` .6 g $2 M.
Default results: 26 g, 26 g/motor, 4.0:1, hover 50%, 14 A, 7.3 min hover, 3.1 min, $102 + $15 = $117.

Build (06:25-36), battery first (layer 0, stays on the mat when exploded):
1. `BATTERY` — 1S LiPo in a clip under the frame; 3.7 V nominal, 4.2 V full (4.35 V HV); sags hard under load.
2. `DUCTS` [BATT] — one-piece ducted frame that bounces off furniture; 65 mm diagonal.
3. `MOTORS` [FRAME] — 0702, 7 mm stators, ~2 g, ~25,000 KV (~90,000 rpm on 1S); two tiny screws each.
4. `AIO BOARD` [FRAME], polar arrow — FC + four 5 A ESCs + ELRS on one 26 mm board on grommets.
5. `MOTOR PLUGS` [MOTORS, FC] — plug-in connectors, no soldering; direction set in Betaflight.
6. `CAMERA` [FC] — 14 mm nano camera, ~20 degrees uptilt.
7. `ELRS ANT` [FC] — only the receiver's wire antenna sticks out the back.
8. `VTX ANT` [FC] — the 25-400 mW VTX lives on the AIO; 25 mW is plenty indoors.
9. `CANOPY` [CAM, RX, VTX] — thin shell holding the camera.
10. `PROPS` [MOTORS, TOP], polar — press-fit 4-blades; last, after the motor check.
No smoke test (the draw function forces `smokeOk = true` every frame, 06:115); PROPS only wait for the motor check.
Motors at +-23 mm (65 mm diagonal). Tags (06:187): TOP, FC, CAM, MOTORS, FRAME, BATT.

Visual notes (06:112-181): turned 45 degrees on the mat; the battery sits in a clip under the frame with a white
BT2.0 plug at the back; each duct is drawn in two halves (inner back wall r 17.2 before the motor and prop, outer
front wall r 18.5 + flat rim after) so props read as inside the duct; the AIO board sits on four rubber grommets
with four white motor sockets and a white arrow (blue LED when powered); motor plug wires run to the sockets; the
nano camera sits in the canopy nose tilted 20 degrees; the canopy is a lofted rounded shell in the palette colour;
props are four clear-tinted blades r 15.5 (a disc when spinning); RX and VTX are wire antennas out the back.
Its `hull` even adapts to what is built (06:183-186, "a bare mat casts none"), but like every craft's `hull` it is
never drawn (03:100), so no shadow appears.

Wiring nodes: `BATTERY` (name without the plug suffix), `AIO BOARD` `F4 + 4x5A ESC + ELRS`, `ELRS ANTENNA`
`2.4 GHz, on the AIO`, `NANO CAMERA` `14 mm, 20 deg tilt`, `VTX ANTENNA` `25-400 mW, on the AIO`, `MOTORS x4`.
Labels `BT2.0 {V}V`, `plugs x4`, `video + 5V`, `RF` x2. Legend `power`, `video`, `motor phases`, `radio (RF)`.

Warnings (06:96-101, one at a time): over `{kv} KV on {cells}S: about {round(kv*cells*3.7/1000)}k rpm, twice what 0702 windings are made for. They cook in seconds. 2S whoops use ~19000 KV 0802 motors.`;
weak `Thrust to weight {tw}:1: it feels floaty and won't pull out of a dive. Aim for about 4:1.`;
ok `Parts match. Punchy for a whoop.` (tw > 4.3) or `Parts match. Light, safe and fun indoors.`

Custom physics (06:104-111): runs the stock model with `hoverA` halved so "one cell sags like one cell", then
corrects the mAh drawn back to the real current. Effect: sag is halved again (it was already ~0.002 V/A), and the
OSD current shows ~half the real draw (measured 5.9 A at full throttle vs ~11.4 A real).

`buildCode` (verbatim):
```
# Tiny Whoop (1S AIO) in the Betaflight CLI
set motor_pwm_protocol = DSHOT300
set dshot_bidir = ON            # RPM filter: much smoother on tiny motors
set yaw_motors_reversed = OFF   # props in (ON for props out)
set vbat_warning_cell_voltage = 330   # 1S sags hard: warn at 3.3 V
aux 2 35 1 1700 2100 0 0        # switch: turtle mode, flip over after a crash
save
```
Modes: DEF_MODES + range.

Range `Living room` (06:56-95): brief `Under the coffee table, under the dining table, round the lamp, over the sofa, land on the rug`;
field 9 m, pad (1.5, 1.5), ground `#dcc097`, `camTilt 15`, `keepGates: false` but the three 0.8 m race gates are
placed as yellow `gate` prims so they stand in every mode. Prims: two back walls 1.1 m high on x = -0.05 and
y = -0.05; rug (4.5, 4.5) 3 x 2.2 `#c96a6a` + inner 2.6 x 1.8; coffee table 1.2 x .7 top at .45 m on 4 legs;
sofa (4.5, 7.3) seat 2.2 x .9 x .45, back, arms (blue); TV stand + TV; dining table (7.3, 3) 1.4 x .9 at .75 m;
two chairs at (8.3, 2.4) and (8.3, 3.6) with backs; floor lamp (7.5, 7.2) pole 1.4 m + shade; bookshelf
(.4, 5.5) .35 x 1.6 x 1.9; houseplants (trees) h .9/1.1/.8.

| # | label | x, y, z | r | type |
|---|---|---|---|---|
| 1 | `UNDER THE TABLE` | 3.6, 4.5, .22 | .16 | ring, heading 0 |
| 2 | `BETWEEN THE CHAIRS` | 8.3, 3.0, .55 | .22 | ring, heading 0 |
| 3 | `ROUND THE LAMP` | 8.1, 6.3, 1.0 | .35 | sphere |
| 4 | `OVER THE SOFA` | 4.5, 7.3, 1.35 | .4 | sphere |
| 5 | `LAND ON THE RUG` | 3.4, 4.5, .15 | .35 | sphere |

Race gates: `[2.4, 3.0, 90] [6.0, 5.6, 0] [5.5, 1.8, 180]`, 0.8 m.

Quiz:
1. `Why does a whoop have ducts round its props?` `They make it faster` / *`They protect props, furniture and people when you bump into things indoors` / `They cool the motors`
2. `What does the AIO board combine?` *`The flight controller, the four ESCs and the receiver` / `The camera and the battery` / `The motors and the props`
3. `You punch the throttle and the OSD voltage drops from 4.1 V to 3.4 V, then recovers. What happened?` `The battery is broken` / *`Normal 1S voltage sag under load` / `The VTX is too powerful`
4. `25000 KV whoop motors on a 2S pack?` `Twice the fun, no problem` / *`Far beyond what the windings take: they overheat and burn` / `It refuses to arm`

Overview (summary): the safest way into FPV; a 65 mm ducted, single-cell craft about as heavy as five sheets of
paper; one AIO board; same Betaflight and PID loop as the 5-inch. Practice (summary): a two-chair course, ten clean
laps in angle mode, practise turtle-mode flips, log every pack's time against the calculator.

### 9.3 Fig. 03 `cinewhoop` — 3-inch cinewhoop (07)

Identity: name `3-inch cinewhoop`, sub `ducted, smooth video`, noun `cinewhoop`,
hint `design it, build it, then fly slow and smooth`, palette `mint`, mat 240, benchH 100, benchZ 6, benchYaw 45,
flyScale 3.5, flyVB 7000, ceiling 9, drag 0.06, hitR 0.14, FPV tilt 12 (range), `fpvProps` not set,
`calc: cineCalc`. Default `4s1100 / 2004-3000 / 3x3x3`.

Batteries: `4S 1100 mAh` 4S 1100 mAh 128 g $26 (66 x 34 x 28 mm, `#2b2a28`); `4S 850 mAh` 98 g $22 (56 x 30 x 24,
`#d9a520`); `6S 850 mAh` 140 g $34 (66 x 34 x 30, `#2f5fa8`). Motors: `2004 3000KV` 19 g $21 maxCells 4 sz 1.00;
`2004 1950KV` 19 g $22 maxCells 6 sz 1.00; `1404 4600KV` 10 g $16 maxCells 4 sz .32. Props: `3x3x3 ducted tri-blade`
pf 1.00 eff 1.00 2.6 g $4; `3x2x5 five-blade (quiet)` pf .92 eff .94 3.1 g $5; `3x3.5x3 (punchy)` pf 1.08 eff .92 2.8 g $4.

Fixed: `3" carbon frame + plates` 62 g $55 M; `Printed ducts + bumpers` 52 g $0 M; `35A 4-in-1 ESC (20x20)` 7 g $40 E;
`F7 flight controller (20x20)` 6 g $40 E; `O3-style digital air unit + camera` 36 g $229 E; `ELRS 2.4 GHz receiver`
2 g $18 E; `XT60 pigtail + low-ESR cap` 10 g $4 E; `Top plate + standoffs` 12 g $6 M; `Battery strap + pad` 4 g $3 M;
`Naked action cam + TPU mount` 36 g $199 E. Default results: 441 g, 473 g/motor, 4.3:1, hover 48%, 75 A,
6.0 min hover, 5.1 min, $640 + $72 = $712.

Build (07:44-59):
1. `FRAME` — 3 mm carbon plate, 147 mm motor to motor; short arms mostly carry the ducts.
2. `DUCTS` [FRAME] — rings that protect people and walls and add a little low-speed thrust; cost weight and drag.
3. `MOTORS` [FRAME] — 2004-class, wide stators give torque for smooth corrections.
4. `ESC` [FRAME] — 20 x 20 4-in-1; bidirectional DShot feeds the RPM filter (fixes jello).
5. `MOTOR WIRES` [MOTORS, ESC] — short and tidy under the ducts.
6. `FLIGHT CTRL` [ESC], polar arrow — RPM filtering, soft-mounted gyro.
7. `XT60 + CAP` [ESC], polar stripe — a digital VTX hates electrical noise.
8. `O3 CAMERA` [FRAME] — digital camera in a TPU mount, ~20 degrees uptilt, ribbon to the air unit.
9. `AIR UNIT` [FC] — HD encoder/transmitter; runs hot, needs airflow and antennas.
10. `RECEIVER` [FC] — separate ELRS keeps control if video drops.
11. `TOP PLATE` [FC, CAM, RX, VTX] — carries battery and action cam near the thrust centre.
12. `BATTERY` [TOP, XT60] — on top behind the action cam; 4S 1100 is the sweet spot.
13. `ACTION CAM` [TOP] — caseless action camera recording 4K with gyro data for later stabilisation.
14. `PROPS` [MOTORS, DUCTS, TOP], polar — ~1.5 mm duct clearance; last.
Motors at +-52 mm; duct radii 39.5 / 41.5 mm, z -6 to 18. Tags (07:235): GOPRO, CAM, VTX, BATT, XT60, DUCTS.

Visual notes (07:143-233): turned 45 degrees on the mat; carbon plate 90 x 48 with arms out to 82 mm; each duct is
drawn as a far inner wall before the motor and prop and a near outer wall with a dark bumper band and rim after;
green ESC, blue FC with arrow (blue LED when powered); the air unit is a dark box with four metal fins, a green LED
and two angled antennas; the O3 camera sits between two palette-coloured plates with its lens tilted 20 degrees up
and a yellow ribbon to the air unit; top plate 110 x 56 on 28 mm standoffs; the battery box uses the pack's
`len x w x h`; the action camera sits on a TPU wedge tilted 14 degrees with a `4K` label; props are tri-blades r 37.

Wiring nodes: `BATTERY`, `XT60 + CAP` `470 uF 35 V` (the part text says nothing about size; the 5-inch uses 1000 uF),
`4-IN-1 ESC` `35 A x 4, bidir DShot`, `FLIGHT CTRL` `F7, RPM filter`, `RECEIVER` `ELRS 2.4 GHz`, `O3 CAMERA`
`4K sensor, 20 deg`, `AIR UNIT` `digital HD, 1080p`, `MOTORS x4`, `ACTION CAM` `own battery, 4K`. Labels include
`M1-M4 + rpm`, `VBAT + UART1 (OSD)`, `camera cable`, and under the action cam `no wires: records on its own`.
Legend `power`, `data / signal`, `camera cable`, `motor phases`.

Warnings (07:134-141, can stack): over `{motor name} is a {maxCells}S motor: on {cells}S it spins the ducted props far too fast. Expect hot motors and a desync. On 6S use ~1950 KV.`;
weak `Thrust to weight {tw}:1: the action cam and ducts are heavy, so this barely climbs and wobbles in wind. Use bigger motors.`;
ok `Parts match. Plenty of reserve for a heavy action cam.` (tw > 5) or `Parts match. Smooth and gentle: right for cine work.`

Modes (07:255-280, verbatim codes):
```
alt   "Altitude hold (easy)" (alt:true)
# beginner: the FC holds height for you
# W/S = climb/descend, arrows = tilt, A/D = yaw
aux 1 ANGLE   ...   # self-level on
aux 2 ALTHOLD ...

cine  "Cine (smooth)" (alt:true, hint "Cine mode: gentle sticks, slow yaw, smooth throttle")
# low rates + heavy stick smoothing = buttery footage
set roll_rc_rate = 50
set roll_srate = 30        # ~150 deg/s at full stick
set yaw_rc_rate = 40
set rc_smoothing_auto_factor = 60
set feedforward_smooth_factor = 75
set dshot_bidir = ON        # RPM filter: no jello

angle "Angle mode"
# self-levelling: release the stick, it levels
# W/S move the throttle and it STAYS there
set angle_limit = 30
set p_level = 50

acro  "Acro (rate) mode" (acro:true)
# sticks = rotation RATE, no self-levelling
# heavy cinewhoops want soft rates even in acro
set roll_rc_rate = 80
set roll_srate = 50
set p_roll = 55
set d_roll = 45

race  "Gate fly-through" (hint "Thread the gates slowly: you are filming, not racing")
# 5 gates in order: think "one-take fly-through"
set osd_timer_1 = ON
set osd_stat_max_spd = ON

range "Range: Real-estate fly-through" (range.code)
# a one-take real-estate shot, flown in Cine-smooth sticks
# film at 4K/60, ND filter so the shutter is ~1/120
set roll_rc_rate = 50
set yaw_rc_rate = 40
set rc_smoothing_auto_factor = 60
# fly it: slow in, steady through the hall, ease out, rise, land
```
Physics wrapper (07:282-288): in `cine` and `range` modes the sticks are scaled for each step (roll and pitch x0.45,
so max tilt ~17 degrees; yaw x0.35, ~70 deg/s; climb command x0.6, 1.32 m/s) then restored. The sim keeps 38
degrees and 540 deg/s in `angle`/`acro` despite the softer codes.

`buildCode` (verbatim):
```
# after the build, in the Betaflight CLI:
set align_board_yaw = 0       # 180 if the arrow points back
set motor_pwm_protocol = DSHOT300
set dshot_bidir = ON          # rpm telemetry for the RPM filter
set rpm_filter_harmonics = 3
serial 0 1 115200 57600 0 115200    # UART1 = MSP DisplayPort (HD OSD)
set osd_displayport_device = MSP
serial 1 64 115200 57600 0 115200   # UART2 = ELRS
save
```

Range `Real-estate fly-through` (07:74-133): brief `One smooth take: front door, hallway, back door, round the pool, over the roof, land on the drive`;
field 30 m, pad (5, 15), ground `#dde3cc`, alt-hold, camTilt 12, `keepGates: true`. House x 10..20, y 9..21,
walls 2.8 m (front wall x = 10 with a 1.0 m door at y 14.5..15.5 under a lintel from 2.1 m; back wall x = 20 with a
3 m sliding door y 13.5..16.5 under a lintel from 2.2 m; side walls y 9 and 21); hallway 1.8 m wide (walls at
y 14.1 and 15.9, x 10.2..14); furniture off the y = 15 line (sofa, coffee table, TV); an inside ceiling face
(non-solid), a solid 12 x 12 x .25 roof slab at 2.8 m and a non-solid pitched roof to 4.65 m; garage `house`
(6, 26.5) 6 x 6 x 2.6 with a 1.4 m roof; street, drive, patio, pool decals; patio table + parasol pole + non-solid
parasol; two loungers; hedges on y 1 and 29; five trees.

| # | label | x, y, z | r | type |
|---|---|---|---|---|
| 1 | `FRONT DOOR` | 10, 15, 1.05 | .45 | ring, heading 0 |
| 2 | `HALLWAY` | 13.8, 15, 1.1 | .7 | ring, heading 0 |
| 3 | `BACK DOOR` | 20, 15, 1.1 | .95 | ring, heading 0 |
| 4 | `POOL ARC` | 28.6, 15, 1.6 | 1.3 | sphere |
| 5 | `OVER THE ROOF` | 15, 15, 5.9 | 1.4 | sphere |
| 6 | `ON THE DRIVE` | 5, 15, .7 | 1.5 | sphere |

Race gates (visible, 1.6 m): `[5, 9, -90] [12, 4, 0] [25, 5.5, 20] [25, 24, 120] [6.5, 21.5, 225]`.

Quiz:
1. `What are the ducts really for?` `They make it faster` / *`They protect people and props, and add a little thrust at low speed` / `They hold the battery`
2. `Why carry a separate action camera?` `The FPV link cannot be recorded` / *`It records full-bitrate 4K with gyro data you can stabilise later; the FPV feed is just for flying` / `It is required by law`
3. `What do you give up for HD digital video?` `Nothing` / *`Some weight, money and a little latency` / `Range is always shorter`
4. `Why is a heavy 3-inch less efficient than a 5-inch?` *`Small props must spin fast to move enough air: less thrust per watt` / `Ducts store energy` / `The camera draws most of the power`

Overview (summary): a camera platform, not an acrobat; ducted 3-inch props make it safe near people and inside
houses; two cameras (digital FPV for the pilot, a caseless action camera for stabilised 4K); the RPM filter keeps
jello out. Practice (summary): the gate fly-through in Cine mode without touching a gate, then again as if
filming; for real, record and stabilise a 30-second indoor take and compare it with the raw clip.

### 9.4 Fig. 04 `longrange` — 7-inch long range (08)

Identity: name `7-inch long range`, sub `GPS rescue`, noun `long-range quad`,
hint `design it, build it, then let GPS Rescue fly it home`, palette `mint`, mat 430, benchH 150, flyScale 9,
flyVB 30000, camZ 0.5, ceiling 70, drag 0.045, FPV tilt 20 (range), `cliName: 'Betaflight CLI'`,
`logName: 'Betaflight log'`. kThrust 1.6, gPerW 8, maxKvCells 9360, minTW 3.5. Default `6s1p4000 / 2807-1300 / 7x3.5x2`,
default mode `alt`.

Batteries (dims length x width x height mm): `6S1P Li-ion 4000 mAh` 6S 4000 mAh 440 g $62 `#2f6f8f` label
`6S1P 21700` 70 x 64 x 44 Li-ion; `6S1P Li-ion 5000 mAh (P50B)` 5000 mAh 468 g $78 `#7a3f8f` `6S1P P50B` 72 x 64 x 44
Li-ion; `6S LiPo 1800 mAh` 1800 mAh 292 g $54 `#2b2a28` `6S 1800` 104 x 36 x 42. Motors: `2807 1300KV` 48 g $28;
`3008 1100KV (efficient)` 56 g $32; `2807 1700KV (4S motor)` 47 g $26. Props: `7x3.5 bi-blade` pf 1.00 eff 1.00
8 g $5 (2 blades, r 89 mm); `7.5x3.7 bi-blade (longer)` pf 1.10 eff 1.06 9 g $6 (r 95); `7x4 tri-blade (punchy)`
pf 1.18 eff .86 10.5 g $6 (3 blades, r 89).

Fixed: `7" carbon true-X frame` 162 g $55 M; `50A 4-in-1 ESC` 10 g $52 E; `F7 flight controller + baro` 8 g $45 E;
`Analog FPV camera` 7 g $25 E; `5.8 GHz 1 W VTX + stubby` 10 g $38 E; `ELRS 900 MHz diversity RX + T-antenna` 4 g $32 E;
`M10 GPS + QMC5883 compass` 12 g $24 E; `XT60 pigtail + low-ESR cap` 12 g $4 E; `Top plate + standoffs + GPS mast`
30 g $12 M; `Battery strap + grip pad` 6 g $4 M. Default results: 925 g, 1333 g/motor, 5.8:1, hover 42%, 120 A,
36.9 min hover, 15.5 min "freestyle", $394 + $81 = $475.

Build (08:26-40):
1. `FRAME` — 6 mm arms, 315 mm motor to motor; longer arms flex more.
2. `MOTORS` [FRAME] — low KV for big props; grams per watt buys flight time.
3. `ESC` [FRAME] — runs cool at 30-40% cruise throttle.
4. `MOTOR WIRES` [MOTORS, ESC] — long leads, keep them tight and sleeved.
5. `FLIGHT CTRL` [ESC], polar arrow — Betaflight with GPS Rescue; barometer helps altitude.
6. `XT60 + CAP` [ESC], polar stripe — 1000 uF.
7. `CAMERA` [FRAME] — only 15-20 degrees uptilt for flat cruising.
8. `RECEIVER` [FC] — ELRS 900 MHz goes further and through trees; watch link quality.
9. `VTX` [FC] — 1 W; video fades before control, hence GPS Rescue.
10. `TOP PLATE` [FC, CAM, RX, VTX] — with a printed mast lifting the GPS away from carbon and the VTX.
11. `GPS` [TOP], polar `arrow forward` / `arrow backward` — position + heading; wait for 8+ satellites; arrow to the nose.
12. `BATTERY` [TOP, XT60] — 21700 Li-ion: more energy per gram, limited burst current.
13. `PROPS` [MOTORS, TOP], polar — bi-blades most efficient; dangerous; last.
Motors at +-111.4 mm (315 mm wheelbase). Tags (08:179): GPS, FC, RX, VTX, XT60, MOTORS, BATT, CAM.

Visual notes (08:99-177): carbon plate 132 x 52 with 132 mm arms; ESC, FC, XT60 as on the 5-inch but bigger; camera
lens tilted 18 degrees up; the RX has a standing T-antenna behind the stack; the 1 W VTX has an angled stubby;
top plate 124 x 44 with a palette-coloured GPS mast leaning back 22 degrees; the white GPS puck carries an ink arrow
(flips with orientation) and a green LED when powered; the battery box uses the pack `dims`, with two cell-line
marks on Li-ion packs; motor bells r 17; props are bi- or tri-blades of the selected radius (89 or 95 mm).

Wiring nodes: `BATTERY`, `XT60 + CAP` `1000 uF 35 V`, `4-IN-1 ESC` `50 A x 4, BLHeli_32`, `FLIGHT CTRL`
`F7 + baro, Betaflight`, `RECEIVER` `ELRS 900 MHz`, `GPS + COMPASS` `M10 + QMC5883`, `CAMERA` `analog, 18 deg`,
`VTX` `5.8 GHz, 1 W`, `MOTORS x4`. Labels `UART2 + 5V`, `UART3`, `I2C mag` (blue dashed), `video in`,
`video + SmartAudio`. Legend `power`, `data / UART`, `I2C`, `video`, `motor phases`.

Warnings (08:89-98, stack): over `{kv} KV on 6S spins a 7" prop far too fast: hot motors and a desync, a long way from home. Use 1100-1300 KV on 6S.`;
weak `Thrust to weight {tw}:1 is too low even for cruising: no margin to climb over trees or fight wind.`;
Li-ion and `maxA > 45`: `Full throttle pulls ~{round(maxA)} A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise.`;
LiPo: `LiPo: lots of punch, but only {flyMin.toFixed(0)} min of cruise. Li-ion more than doubles it.`;
ok `Parts match. A calm cruiser: about {flyMin} min of flight.` (never shown: every Li-ion combo exceeds 45 A and
every LiPo combo gets the LiPo note).

`buildCode` (verbatim):
```
# after the build, in the Betaflight CLI:
resource                         # check motor, UART and I2C mapping
set align_board_yaw = 0          # 180 if the FC arrow points back
set align_mag = DEFAULT          # the GPS puck arrow must point at the nose
feature GPS
serial 2 2 57600 57600 0 115200  # UART3 = GPS
set gps_provider = UBLOX
set gps_ublox_use_galileo = ON
set failsafe_procedure = GPS-RESCUE
save
```
Modes: `alt`, `angle`, `acro`, `race` from DEF_MODES, then `rescue`, then `range`. Rescue mode (verbatim):
title `GPS rescue (failsafe demo)`, `alt: true`, hint `Hands off: it flies out, loses link, then GPS Rescue brings it home`, code:
```
# GPS Rescue: on failsafe the quad climbs, turns home,
# flies back and lands. Test it close in before you trust it far out.
set failsafe_procedure = GPS-RESCUE
set gps_rescue_min_sats = 8        # no home point below this
set gps_rescue_return_alt = 45     # metres: clear the highest ridge
set gps_rescue_ground_speed = 750  # cm/s on the way home
set gps_rescue_descent_dist = 20   # start descending this far out
set gps_rescue_sanity_checks = RESCUE_SANITY_FS_ONLY
save
```

GPS rescue autopilot (08:43-82, 268-282). Runs while in `rescue` mode, armed and not crashed; sets `D.auto = true`
(the pilot loses throttle; key pitch/roll/yaw are overwritten every substep).
- Start: at the pad (within 2.5 m, z < 0.5) -> phase `out`; anywhere else -> phase `climb` with message
  `Failsafe! GPS Rescue: climbing to 45 m, over the ridges` (if > 30 m from home) or
  `Failsafe! GPS Rescue: climbing to 7 m`, log `failsafe -> GPS RESCUE`.
- `alt(target) = clamp((target - z)*0.6, +-1)` is the climb-rate command.
- `goTo(tx, ty, vmax, yawSign)`: desired speed `min(vmax, 0.7*dist)` toward the target; heading estimate =
  yaw (+180 deg if the compass is reversed); beyond 2.5 m yaw stick = `clamp(-1.6*wrap(bearing - heading), +-1)`;
  velocity error rotated into the (estimated) body frame; pitch = `clamp(0.2*fwd, +-0.7)`, roll = `clamp(0.2*left, +-0.7)`.
- `out`: below 3.5 m climb to 4.5 m over home; then hold 5 m and fly to OUT = pad + (11, 4) at <= 5 m/s; within
  1.6 m: `Link lost! Failsafe: GPS Rescue takes over` (error sfx), log `RX LOSS -> failsafe -> GPS RESCUE`, phase `climb`.
- return altitude chosen once: 45 m if > 30 m from home, else 7 m.
- `climb`: hold position, climb to alt + 0.3; above alt - 0.4: log `rescue: climb done, heading home`, phase `home`.
- `home`: hold alt, fly home at <= 12 m/s (alt > 10) or 6 m/s; reversed compass and > 14 m from home: once
  `Compass arrow backwards: it flies AWAY from home. Fix align_mag` (buzz), log `rescue: heading error, distance growing`;
  within 1 m: log `rescue: over home, descending`, phase `descend`.
- `descend`: hold over home at <= 1.2 m/s; climb command -1 above 6 m, -0.5 above 1.5 m, else -0.22; on the ground
  (z <= 0.01, t > 1 s): disarm, `Landed at home and disarmed` (ding), log, tracked `mastered`, phase `done`.
- Measured: the whole demo from the pad takes ~17.5 s; with a reversed puck it flies away at ~12 m/s until it
  leaves the field. Iso view draws a green dashed line from the craft's ground point to home until `done`
  (08:276-280). Stats add `Home` and `Rescue` (`OUT`/`CLIMB`/`HOME`/`DESCEND`/`DONE`).

Range `Mountain valley` (08:204-254): brief `Follow the river, over the saddle, touch the tower, come home`;
field 300 m, pad (60, 60), ground `#d9e2c4`, `keepGates: true`, camTilt 20, alt-hold. Valley road flat
(130, 55) 150 x 4; the river as four 9 m wide rotated strips to a lake disc (272, 150) r 20; farmhouse `house`
(40, 74) 8 x 6 x 4; barn box (28, 60) 10 x 7 x 5; ~19 trees (h 7 to 12.9) incl. a forest around (60..105, 124..158);
a ridge of seven cones at y 205 (x 10, 55, 95, 130, 210, 250, 292; r 32-36, top r 4, h 32-36) with a low saddle
hump at x 170 (r 26, top 9, h 12); two back hills (120, 250) and (265, 255); radio tower box (200, 265) 3 x 3 x 40
with a red mast r .3 from 40 to 48 m and a hut.

| # | label | x, y, z | r | type |
|---|---|---|---|---|
| 1 | `RIVER` | 150, 115, 6 | 6 | ring, heading 15 |
| 2 | `LAKE` | 262, 146, 8 | 6 | sphere |
| 3 | `SADDLE` | 170, 205, 22 | 6 | ring, heading 90 |
| 4 | `TOWER TOP` | 200, 265, 53 | 6 | sphere |
| 5 | `HOME` | 60, 60, 2 | 4 | sphere |

Race gates (visible, 1.6 m): the default five shifted by (+45, +45) around the pad:
`[63.5,60,0] [66.5,63.5,70] [63,66.5,165] [58,65,215] [57,60.5,-60]`.

Quiz:
1. `Why fly long range on a Li-ion pack instead of a LiPo?` `It charges faster` / *`More energy per gram, so longer flights, at the cost of burst current` / `It is safer to crash`
2. `What actually triggers GPS Rescue?` `The video signal fading` / *`A failsafe: the flight controller stops hearing your radio` / `Low battery voltage`
3. `Why wait for 8 or more satellites before take-off?` `The motors need GPS to spin` / *`So the home point is accurate: rescue flies back to wherever home was set` / `To unlock acro mode`
4. `The compass arrow points backwards. What does GPS Rescue do?` `Lands immediately` / *`Flies the wrong way or circles (a toilet bowl)` / `Nothing changes`

Overview (summary): efficiency over punch (big bi-blades, low KV, a Li-ion pack with about twice the energy, GPS for
home); two links limit range, video first then control; on control loss the failsafe hands over to GPS Rescue.
Practice (summary): fly out in angle mode, switch to GPS rescue and watch it return; then reverse the puck and
retry; for real, test rescue at 50 m by switching the radio off before going further; log the real cruise time.

---

## 10. Defects and inconsistencies in the original (the rebuild must not copy these)

Verified on the live site or the identical local copy unless noted "by code".

1. **Re-orienting a placed part does not restart the animation loop** (03:370-371): the part can stay unfitted.
2. **Changing a picker in the flight view while disarmed sets `D.flight = null`** (03:603): the bench is drawn under
   the flight UI, Space does nothing; recover only through `Fly ▾`. (Screen `27-quad5-after-batt-change-in-fly.png`.)
3. **Switching from alt-hold to a manual-throttle mode mid-air zeroes the throttle** (03:456): the craft drops and crashes.
4. **Flight messages can vanish early**: a new message reuses the old 3.2 s timer (03:320-321).
5. **5-inch `Gate race` is broken**: gates are invisible (`keepGates: false`) and the course crosses the gap walls.
   The practice task asks for five laps of it.
6. **5-inch range cannot be completed**: `TOWER TOP` (sphere centre 11.6 m, r 1.6) needs z >= 10.0 near the tower,
   alt-hold tops out at 10.2 m (10.47 m peak) because of the 12 m soft ceiling, and the tower slab collides up to
   10.44 m. Closest legal approach measured 2.38 m.
7. **Battery never cuts out at hover**; thrust ignores voltage; sag is 0.002 V/A per cell for every pack; the
   whoop wrapper reduces sag further and under-reports OSD current by ~2x, contradicting its own quiz; Li-ion and HV
   packs use the LiPo curve and messages (`Never fly a LiPo this low`).
8. **Wind is imperceptible** (only enters the drag term); no indicator.
9. **Desync is mild in self-level modes** (13 degree lean, 92% thrust) although the text says the ESC lost a motor; heat never cools.
10. **OSD artificial horizon pitch sign is inverted** (04:195).
11. **`Build it for me` sets all tests passed without fixing reversed parts**; a reversed cap then never pops.
12. **`Check motor direction` auto-plugs without the reversed-cap check** (03:418).
13. **Collision labels**: every box is `Hit an obstacle`; ridges and the saddle say `Hit a tree`.
14. **No cutaway in the iso view**: the craft is invisible inside the bando and the house.
15. **Collision radius (0.14 m) does not match the drawn size** (the 5-inch is drawn 4x life size, about 1 m across).
16. Camera follow uses a per-frame factor (0.14), so it is frame-rate dependent.
17. `?fly=<unknown>` throws.
18. Keyboard throttle stops working after the touch throttle has been used in a manual mode (vstick persists).
19. Re-arming after a GPS-rescue landing without `R` leaves `D.auto` on with the rescue in `done`: no throttle (by code).
20. `D.best` is shared by race laps and range runs; `D.laps` and `D.crashes` are never shown; nothing persists.
21. Range clock starts at checkpoint 1, not at take-off.
22. `battery plugged: 25.200000000000003 V` (float formatting).
23. `Effects` preference is read but never saved.
24. Camera tilt is inconsistent: part text says ~30/20/20/15-20 degrees, wiring says 30/20/20/18, FPV uses 25/15/12/20.
25. CLI snippets disagree with the sim (cinewhoop `angle_limit = 30` and soft acro rates vs. the sim's 38 degrees and 540 deg/s; alt-hold deadband not modelled).
26. `Freestyle time` label on the whoop, cinewhoop and long-range cruiser; long-range `ok` warning is unreachable; the 5-inch has no `noun`.
27. The motor check always finds M3 reversed; the "motor direction never checked" flip and the uncalibrated-ACC drift are unreachable code.
28. `hull` is defined for every craft but unused: no cast shadow under the craft on the bench or in the field.
29. The selected part's pill is drawn at a fixed spot above the craft, not at the part.
30. Calc tiles wrap at desktop width (`514` / `g` on two lines); phone bench stats wrap too.
31. Max current is never compared with the ESC rating (e.g. 282 A on a 4 x 45 A ESC) or the pack's C rating.

---

## 11. Making the rebuild strictly better (recommendations)

- Keep `calc()` bit-identical (Appendix A doubles as a unit-test table), but label the sixth tile per craft
  (`Freestyle time`, `Indoor time`, `Cine time`, `Cruise time`) and add ESC/C-rating checks.
- One source of truth for camera tilt, angle limit and rates: the CLI snippet values should drive the sim.
- Battery: per-chemistry OCV curve (LiPo, LiHV 4.35 V, Li-ion 4.2 to 2.8 V), internal resistance per cell scaled
  by capacity (makes the 1S sag real), thrust scaled by (V/Vnom)^2, hard cutoff when empty.
- Wind as airspeed (drag on `v - wind`, |v - wind|), gusts of several m/s, a visible indicator.
- Desync as a lost motor (asymmetric thrust, yaw spin) and heat that cools.
- Fix the AHI sign; draw a home arrow and distance in the iso view too.
- Iso view: use the current Colorfigures core (orbit camera + See-through) so the craft shows through roofs and
  floors; draw the craft's cast shadow from `hull`.
- Give the 5-inch its own visible race course and a reachable tower top; add a gate list with per-gate splits,
  best lap per course per craft, crash counter, persisted progress (build done, tests passed, quiz score,
  best times) in localStorage.
- Make the reversed motor random (or derive it from the wire order) and keep the flip paths reachable.
- Never null the flight on a design change; offer "Apply to next flight".
- Validate URL params.

---

## Appendix A: golden calculator values (live site, all 27 combinations per craft)

Columns are raw `calc()` values (not rounded the way the tiles round them). "flags" = over / weak.

#### quad5: all 27 combinations (default = 6s1100 / 2306-1750 / 5x4.3x3)

| batt | motor | prop | AUW g | g/motor | T:W | hover thr | max A | hover min | fly min | flags | $ elec / mech / total | warning text shown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 6s1100 | 2306-1750 | 5x4.3x3 | 513.6 | 1599.9 | 12.46 | 28% | 144 | 12.3 | 5.2 | - | 287 / 59 / 346 | Parts match. Plenty of punch. |
| 6s1100 | 2306-1750 | 5.1x2.5x3 | 512.0 | 1343.9 | 10.50 | 31% | 103 | 14.6 | 6.1 | - | 287 / 59 / 346 | Parts match. Plenty of punch. |
| 6s1100 | 2306-1750 | 5x5x3 | 515.2 | 1759.9 | 13.66 | 27% | 180 | 10.8 | 4.5 | - | 287 / 59 / 346 | Parts match. Plenty of punch. |
| 6s1100 | 2207-1950 | 5x4.3x3 | 521.6 | 1986.5 | 15.23 | 26% | 179 | 12.1 | 5.1 | - | 295 / 59 / 354 | Parts match. Plenty of punch. |
| 6s1100 | 2207-1950 | 5.1x2.5x3 | 520.0 | 1668.6 | 12.84 | 28% | 127 | 14.4 | 6.0 | - | 295 / 59 / 354 | Parts match. Plenty of punch. |
| 6s1100 | 2207-1950 | 5x5x3 | 523.2 | 2185.1 | 16.71 | 24% | 224 | 10.7 | 4.5 | - | 295 / 59 / 354 | Parts match. Plenty of punch. |
| 6s1100 | 2306-2450 | 5x4.3x3 | 509.6 | 3135.8 | 24.61 | 20% | 282 | 12.4 | 5.2 | over | 279 / 59 / 338 | 2450 KV on 6S spins the props far past what the motors and ESC can take: expect hot motors and a desync. |
| 6s1100 | 2306-2450 | 5.1x2.5x3 | 508.0 | 2634.0 | 20.74 | 22% | 201 | 14.7 | 6.2 | over | 279 / 59 / 338 | 2450 KV on 6S spins the props far past what the motors and ESC can take: expect hot motors and a desync. |
| 6s1100 | 2306-2450 | 5x5x3 | 511.2 | 3449.3 | 26.99 | 19% | 353 | 10.9 | 4.6 | over | 279 / 59 / 338 | 2450 KV on 6S spins the props far past what the motors and ESC can take: expect hot motors and a desync. |
| 6s1800 | 2306-1750 | 5x4.3x3 | 617.6 | 1599.9 | 10.36 | 31% | 144 | 16.8 | 7.0 | - | 303 / 59 / 362 | Parts match. Plenty of punch. |
| 6s1800 | 2306-1750 | 5.1x2.5x3 | 616.0 | 1343.9 | 8.73 | 34% | 103 | 19.8 | 8.3 | - | 303 / 59 / 362 | Parts match. Good all-round build. |
| 6s1800 | 2306-1750 | 5x5x3 | 619.2 | 1759.9 | 11.37 | 30% | 180 | 14.7 | 6.2 | - | 303 / 59 / 362 | Parts match. Plenty of punch. |
| 6s1800 | 2207-1950 | 5x4.3x3 | 625.6 | 1986.5 | 12.70 | 28% | 179 | 16.6 | 7.0 | - | 311 / 59 / 370 | Parts match. Plenty of punch. |
| 6s1800 | 2207-1950 | 5.1x2.5x3 | 624.0 | 1668.6 | 10.70 | 31% | 127 | 19.6 | 8.2 | - | 311 / 59 / 370 | Parts match. Plenty of punch. |
| 6s1800 | 2207-1950 | 5x5x3 | 627.2 | 2185.1 | 13.94 | 27% | 224 | 14.5 | 6.1 | - | 311 / 59 / 370 | Parts match. Plenty of punch. |
| 6s1800 | 2306-2450 | 5x4.3x3 | 613.6 | 3135.8 | 20.44 | 22% | 282 | 16.9 | 7.1 | over | 295 / 59 / 354 | 2450 KV on 6S spins the props far past what the motors and ESC can take: expect hot motors and a desync. |
| 6s1800 | 2306-2450 | 5.1x2.5x3 | 612.0 | 2634.0 | 17.22 | 24% | 201 | 20.0 | 8.4 | over | 295 / 59 / 354 | 2450 KV on 6S spins the props far past what the motors and ESC can take: expect hot motors and a desync. |
| 6s1800 | 2306-2450 | 5x5x3 | 615.2 | 3449.3 | 22.43 | 21% | 353 | 14.8 | 6.2 | over | 295 / 59 / 354 | 2450 KV on 6S spins the props far past what the motors and ESC can take: expect hot motors and a desync. |
| 4s1500 | 2306-1750 | 5x4.3x3 | 517.6 | 711.1 | 5.50 | 43% | 96 | 11.1 | 4.7 | - | 279 / 59 / 338 | Parts match. Good all-round build. |
| 4s1500 | 2306-1750 | 5.1x2.5x3 | 516.0 | 597.3 | 4.63 | 46% | 68 | 13.2 | 5.5 | weak | 279 / 59 / 338 | Thrust to weight 4.6:1 is too low for this kind of flying. |
| 4s1500 | 2306-1750 | 5x5x3 | 519.2 | 782.2 | 6.03 | 41% | 120 | 9.8 | 4.1 | - | 279 / 59 / 338 | Parts match. Good all-round build. |
| 4s1500 | 2207-1950 | 5x4.3x3 | 525.6 | 882.9 | 6.72 | 39% | 119 | 10.9 | 4.6 | - | 287 / 59 / 346 | Parts match. Good all-round build. |
| 4s1500 | 2207-1950 | 5.1x2.5x3 | 524.0 | 741.6 | 5.66 | 42% | 85 | 13.0 | 5.4 | - | 287 / 59 / 346 | Parts match. Good all-round build. |
| 4s1500 | 2207-1950 | 5x5x3 | 527.2 | 971.2 | 7.37 | 37% | 149 | 9.6 | 4.0 | - | 287 / 59 / 346 | Parts match. Good all-round build. |
| 4s1500 | 2306-2450 | 5x4.3x3 | 513.6 | 1393.7 | 10.85 | 30% | 188 | 11.2 | 4.7 | - | 271 / 59 / 330 | Parts match. Plenty of punch. |
| 4s1500 | 2306-2450 | 5.1x2.5x3 | 512.0 | 1170.7 | 9.15 | 33% | 134 | 13.3 | 5.6 | - | 271 / 59 / 330 | Parts match. Good all-round build. |
| 4s1500 | 2306-2450 | 5x5x3 | 515.2 | 1533.0 | 11.90 | 29% | 235 | 9.8 | 4.1 | - | 271 / 59 / 330 | Parts match. Plenty of punch. |

#### whoop: all 27 combinations (default = 1s300 / 0702-25000 / 31mm-4)

| batt | motor | prop | AUW g | g/motor | T:W | hover thr | max A | hover min | fly min | flags | $ elec / mech / total | warning text shown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1s300 | 0702-25000 | 31mm-4 | 26.3 | 26.0 | 3.96 | 50% | 14 | 7.3 | 3.1 | - | 102 / 15 / 117 | Parts match. Light, safe and fun indoors. |
| 1s300 | 0702-25000 | 31mm-3 | 26.2 | 23.4 | 3.58 | 53% | 12 | 7.9 | 3.3 | - | 102 / 15 / 117 | Parts match. Light, safe and fun indoors. |
| 1s300 | 0702-25000 | 31mm-2 | 26.0 | 20.3 | 3.12 | 57% | 9 | 8.8 | 3.7 | - | 102 / 15 / 117 | Parts match. Light, safe and fun indoors. |
| 1s300 | 0702-23000 | 31mm-4 | 26.3 | 22.0 | 3.35 | 55% | 12 | 7.3 | 3.1 | - | 102 / 15 / 117 | Parts match. Light, safe and fun indoors. |
| 1s300 | 0702-23000 | 31mm-3 | 26.2 | 19.8 | 3.03 | 57% | 10 | 7.9 | 3.3 | - | 102 / 15 / 117 | Parts match. Light, safe and fun indoors. |
| 1s300 | 0702-23000 | 31mm-2 | 26.0 | 17.2 | 2.64 | 62% | 8 | 8.8 | 3.7 | - | 102 / 15 / 117 | Parts match. Light, safe and fun indoors. |
| 1s300 | 0702-27000 | 31mm-4 | 26.3 | 30.3 | 4.61 | 47% | 16 | 7.3 | 3.1 | - | 106 / 15 / 121 | Parts match. Punchy for a whoop. |
| 1s300 | 0702-27000 | 31mm-3 | 26.2 | 27.3 | 4.17 | 49% | 14 | 7.9 | 3.3 | - | 106 / 15 / 121 | Parts match. Light, safe and fun indoors. |
| 1s300 | 0702-27000 | 31mm-2 | 26.0 | 23.7 | 3.64 | 52% | 11 | 8.8 | 3.7 | - | 106 / 15 / 121 | Parts match. Light, safe and fun indoors. |
| 1s450 | 0702-25000 | 31mm-4 | 29.8 | 26.0 | 3.49 | 54% | 14 | 9.7 | 4.1 | - | 103 / 15 / 118 | Parts match. Light, safe and fun indoors. |
| 1s450 | 0702-25000 | 31mm-3 | 29.7 | 23.4 | 3.15 | 56% | 12 | 10.5 | 4.4 | - | 103 / 15 / 118 | Parts match. Light, safe and fun indoors. |
| 1s450 | 0702-25000 | 31mm-2 | 29.5 | 20.3 | 2.75 | 60% | 9 | 11.7 | 4.9 | - | 103 / 15 / 118 | Parts match. Light, safe and fun indoors. |
| 1s450 | 0702-23000 | 31mm-4 | 29.8 | 22.0 | 2.96 | 58% | 12 | 9.7 | 4.1 | - | 103 / 15 / 118 | Parts match. Light, safe and fun indoors. |
| 1s450 | 0702-23000 | 31mm-3 | 29.7 | 19.8 | 2.67 | 61% | 10 | 10.5 | 4.4 | - | 103 / 15 / 118 | Parts match. Light, safe and fun indoors. |
| 1s450 | 0702-23000 | 31mm-2 | 29.5 | 17.2 | 2.33 | 66% | 8 | 11.7 | 4.9 | weak | 103 / 15 / 118 | Thrust to weight 2.3:1: it feels floaty and won't pull out of a dive. Aim for about 4:1. |
| 1s450 | 0702-27000 | 31mm-4 | 29.8 | 30.3 | 4.07 | 50% | 16 | 9.7 | 4.1 | - | 107 / 15 / 122 | Parts match. Light, safe and fun indoors. |
| 1s450 | 0702-27000 | 31mm-3 | 29.7 | 27.3 | 3.68 | 52% | 14 | 10.5 | 4.4 | - | 107 / 15 / 122 | Parts match. Light, safe and fun indoors. |
| 1s450 | 0702-27000 | 31mm-2 | 29.5 | 23.7 | 3.21 | 56% | 11 | 11.7 | 4.9 | - | 107 / 15 / 122 | Parts match. Light, safe and fun indoors. |
| 2s300 | 0702-25000 | 31mm-4 | 34.8 | 104.0 | 11.96 | 29% | 28 | 11.0 | 4.6 | over | 105 / 15 / 120 | 25000 KV on 2S: about 185k rpm, twice what 0702 windings are made for. They cook in seconds. 2S whoops use ~19000 KV 0802 motors. |
| 2s300 | 0702-25000 | 31mm-3 | 34.7 | 93.6 | 10.80 | 30% | 23 | 11.9 | 5.0 | over | 105 / 15 / 120 | 25000 KV on 2S: about 185k rpm, twice what 0702 windings are made for. They cook in seconds. 2S whoops use ~19000 KV 0802 motors. |
| 2s300 | 0702-25000 | 31mm-2 | 34.5 | 81.2 | 9.40 | 33% | 18 | 13.3 | 5.6 | over | 105 / 15 / 120 | 25000 KV on 2S: about 185k rpm, twice what 0702 windings are made for. They cook in seconds. 2S whoops use ~19000 KV 0802 motors. |
| 2s300 | 0702-23000 | 31mm-4 | 34.8 | 88.1 | 10.12 | 31% | 24 | 11.0 | 4.6 | over | 105 / 15 / 120 | 23000 KV on 2S: about 170k rpm, twice what 0702 windings are made for. They cook in seconds. 2S whoops use ~19000 KV 0802 motors. |
| 2s300 | 0702-23000 | 31mm-3 | 34.7 | 79.3 | 9.14 | 33% | 20 | 11.9 | 5.0 | over | 105 / 15 / 120 | 23000 KV on 2S: about 170k rpm, twice what 0702 windings are made for. They cook in seconds. 2S whoops use ~19000 KV 0802 motors. |
| 2s300 | 0702-23000 | 31mm-2 | 34.5 | 68.7 | 7.96 | 35% | 16 | 13.3 | 5.6 | over | 105 / 15 / 120 | 23000 KV on 2S: about 170k rpm, twice what 0702 windings are made for. They cook in seconds. 2S whoops use ~19000 KV 0802 motors. |
| 2s300 | 0702-27000 | 31mm-4 | 34.8 | 121.4 | 13.95 | 27% | 33 | 11.0 | 4.6 | over | 109 / 15 / 124 | 27000 KV on 2S: about 200k rpm, twice what 0702 windings are made for. They cook in seconds. 2S whoops use ~19000 KV 0802 motors. |
| 2s300 | 0702-27000 | 31mm-3 | 34.7 | 109.2 | 12.60 | 28% | 27 | 11.9 | 5.0 | over | 109 / 15 / 124 | 27000 KV on 2S: about 200k rpm, twice what 0702 windings are made for. They cook in seconds. 2S whoops use ~19000 KV 0802 motors. |
| 2s300 | 0702-27000 | 31mm-2 | 34.5 | 94.7 | 10.97 | 30% | 21 | 13.3 | 5.6 | over | 109 / 15 / 124 | 27000 KV on 2S: about 200k rpm, twice what 0702 windings are made for. They cook in seconds. 2S whoops use ~19000 KV 0802 motors. |

#### cinewhoop: all 27 combinations (default = 4s1100 / 2004-3000 / 3x3x3)

| batt | motor | prop | AUW g | g/motor | T:W | hover thr | max A | hover min | fly min | flags | $ elec / mech / total | warning text shown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4s1100 | 2004-3000 | 3x3x3 | 441.4 | 473.1 | 4.29 | 48% | 75 | 6.0 | 5.1 | - | 640 / 72 / 712 | Parts match. Smooth and gentle: right for cine work. |
| 4s1100 | 2004-3000 | 3x2x5 | 443.4 | 435.3 | 3.93 | 50% | 74 | 5.6 | 4.8 | - | 640 / 74 / 714 | Parts match. Smooth and gentle: right for cine work. |
| 4s1100 | 2004-3000 | 3x3.5x3 | 442.2 | 511.0 | 4.62 | 46% | 88 | 5.5 | 4.7 | - | 640 / 72 / 712 | Parts match. Smooth and gentle: right for cine work. |
| 4s1100 | 2004-1950 | 3x3x3 | 441.4 | 199.9 | 1.81 | 74% | 32 | 6.0 | 5.1 | weak | 644 / 72 / 716 | Thrust to weight 1.8:1: the action cam and ducts are heavy, so this barely climbs and wobbles in wind. Use bigger motors. |
| 4s1100 | 2004-1950 | 3x2x5 | 443.4 | 183.9 | 1.66 | 78% | 31 | 5.6 | 4.8 | weak | 644 / 74 / 718 | Thrust to weight 1.7:1: the action cam and ducts are heavy, so this barely climbs and wobbles in wind. Use bigger motors. |
| 4s1100 | 2004-1950 | 3x3.5x3 | 442.2 | 215.9 | 1.95 | 72% | 37 | 5.5 | 4.7 | weak | 644 / 72 / 716 | Thrust to weight 2.0:1: the action cam and ducts are heavy, so this barely climbs and wobbles in wind. Use bigger motors. |
| 4s1100 | 1404-4600 | 3x3x3 | 405.4 | 356.0 | 3.51 | 53% | 57 | 6.5 | 5.6 | - | 620 / 72 / 692 | Parts match. Smooth and gentle: right for cine work. |
| 4s1100 | 1404-4600 | 3x2x5 | 407.4 | 327.5 | 3.22 | 56% | 55 | 6.1 | 5.2 | - | 620 / 74 / 694 | Parts match. Smooth and gentle: right for cine work. |
| 4s1100 | 1404-4600 | 3x3.5x3 | 406.2 | 384.4 | 3.79 | 51% | 66 | 6.0 | 5.1 | - | 620 / 72 / 692 | Parts match. Smooth and gentle: right for cine work. |
| 4s850 | 2004-3000 | 3x3x3 | 411.4 | 473.1 | 4.60 | 47% | 75 | 5.0 | 4.2 | - | 636 / 72 / 708 | Parts match. Smooth and gentle: right for cine work. |
| 4s850 | 2004-3000 | 3x2x5 | 413.4 | 435.3 | 4.21 | 49% | 74 | 4.7 | 4.0 | - | 636 / 74 / 710 | Parts match. Smooth and gentle: right for cine work. |
| 4s850 | 2004-3000 | 3x3.5x3 | 412.2 | 511.0 | 4.96 | 45% | 88 | 4.6 | 3.9 | - | 636 / 72 / 708 | Parts match. Smooth and gentle: right for cine work. |
| 4s850 | 2004-1950 | 3x3x3 | 411.4 | 199.9 | 1.94 | 72% | 32 | 5.0 | 4.2 | weak | 640 / 72 / 712 | Thrust to weight 1.9:1: the action cam and ducts are heavy, so this barely climbs and wobbles in wind. Use bigger motors. |
| 4s850 | 2004-1950 | 3x2x5 | 413.4 | 183.9 | 1.78 | 75% | 31 | 4.7 | 4.0 | weak | 640 / 74 / 714 | Thrust to weight 1.8:1: the action cam and ducts are heavy, so this barely climbs and wobbles in wind. Use bigger motors. |
| 4s850 | 2004-1950 | 3x3.5x3 | 412.2 | 215.9 | 2.09 | 69% | 37 | 4.6 | 3.9 | weak | 640 / 72 / 712 | Thrust to weight 2.1:1: the action cam and ducts are heavy, so this barely climbs and wobbles in wind. Use bigger motors. |
| 4s850 | 1404-4600 | 3x3x3 | 375.4 | 356.0 | 3.79 | 51% | 57 | 5.5 | 4.7 | - | 616 / 72 / 688 | Parts match. Smooth and gentle: right for cine work. |
| 4s850 | 1404-4600 | 3x2x5 | 377.4 | 327.5 | 3.47 | 54% | 55 | 5.1 | 4.3 | - | 616 / 74 / 690 | Parts match. Smooth and gentle: right for cine work. |
| 4s850 | 1404-4600 | 3x3.5x3 | 376.2 | 384.4 | 4.09 | 50% | 66 | 5.0 | 4.3 | - | 616 / 72 / 688 | Parts match. Smooth and gentle: right for cine work. |
| 6s850 | 2004-3000 | 3x3x3 | 453.4 | 1064.5 | 9.39 | 33% | 113 | 6.8 | 5.8 | over | 648 / 72 / 720 | 2004 3000KV is a 4S motor: on 6S it spins the ducted props far too fast. Expect hot motors and a desync. On 6S use ~1950 KV. |
| 6s850 | 2004-3000 | 3x2x5 | 455.4 | 979.4 | 8.60 | 34% | 110 | 6.4 | 5.4 | over | 648 / 74 / 722 | 2004 3000KV is a 4S motor: on 6S it spins the ducted props far too fast. Expect hot motors and a desync. On 6S use ~1950 KV. |
| 6s850 | 2004-3000 | 3x3.5x3 | 454.2 | 1149.7 | 10.13 | 31% | 132 | 6.2 | 5.3 | over | 648 / 72 / 720 | 2004 3000KV is a 4S motor: on 6S it spins the ducted props far too fast. Expect hot motors and a desync. On 6S use ~1950 KV. |
| 6s850 | 2004-1950 | 3x3x3 | 453.4 | 449.8 | 3.97 | 50% | 48 | 6.8 | 5.8 | - | 652 / 72 / 724 | Parts match. Smooth and gentle: right for cine work. |
| 6s850 | 2004-1950 | 3x2x5 | 455.4 | 413.8 | 3.63 | 52% | 47 | 6.4 | 5.4 | - | 652 / 74 / 726 | Parts match. Smooth and gentle: right for cine work. |
| 6s850 | 2004-1950 | 3x3.5x3 | 454.2 | 485.7 | 4.28 | 48% | 56 | 6.2 | 5.3 | - | 652 / 72 / 724 | Parts match. Smooth and gentle: right for cine work. |
| 6s850 | 1404-4600 | 3x3x3 | 417.4 | 800.9 | 7.68 | 36% | 85 | 7.4 | 6.3 | over | 628 / 72 / 700 | 1404 4600KV is a 4S motor: on 6S it spins the ducted props far too fast. Expect hot motors and a desync. On 6S use ~1950 KV. |
| 6s850 | 1404-4600 | 3x2x5 | 419.4 | 736.8 | 7.03 | 38% | 83 | 6.9 | 5.9 | over | 628 / 74 / 702 | 1404 4600KV is a 4S motor: on 6S it spins the ducted props far too fast. Expect hot motors and a desync. On 6S use ~1950 KV. |
| 6s850 | 1404-4600 | 3x3.5x3 | 418.2 | 865.0 | 8.27 | 35% | 100 | 6.8 | 5.8 | over | 628 / 72 / 700 | 1404 4600KV is a 4S motor: on 6S it spins the ducted props far too fast. Expect hot motors and a desync. On 6S use ~1950 KV. |

#### longrange: all 27 combinations (default = 6s1p4000 / 2807-1300 / 7x3.5x2)

| batt | motor | prop | AUW g | g/motor | T:W | hover thr | max A | hover min | fly min | flags | $ elec / mech / total | warning text shown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 6s1p4000 | 2807-1300 | 7x3.5x2 | 925.0 | 1332.6 | 5.76 | 42% | 120 | 36.9 | 15.5 | - | 394 / 81 / 475 | Full throttle pulls ~120 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p4000 | 2807-1300 | 7.5x3.7x2 | 929.0 | 1465.9 | 6.31 | 40% | 125 | 38.9 | 16.3 | - | 394 / 83 / 477 | Full throttle pulls ~125 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p4000 | 2807-1300 | 7x4x3 | 935.0 | 1572.5 | 6.73 | 39% | 165 | 31.4 | 13.2 | - | 394 / 83 / 477 | Full throttle pulls ~165 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p4000 | 3008-1100 | 7x3.5x2 | 957.0 | 954.1 | 3.99 | 50% | 86 | 35.6 | 15.0 | - | 410 / 81 / 491 | Full throttle pulls ~86 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p4000 | 3008-1100 | 7.5x3.7x2 | 961.0 | 1049.6 | 4.37 | 48% | 89 | 37.6 | 15.8 | - | 410 / 83 / 493 | Full throttle pulls ~89 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p4000 | 3008-1100 | 7x4x3 | 967.0 | 1125.9 | 4.66 | 46% | 118 | 30.3 | 12.7 | - | 410 / 83 / 493 | Full throttle pulls ~118 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p4000 | 2807-1700 | 7x3.5x2 | 921.0 | 2278.9 | 9.90 | 32% | 205 | 37.0 | 15.6 | over | 386 / 81 / 467 | 1700 KV on 6S spins a 7" prop far too fast: hot motors and a desync, a long way from home. Use 1100-1300 KV on 6S. / Full throttle pulls ~205 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p4000 | 2807-1700 | 7.5x3.7x2 | 925.0 | 2506.8 | 10.84 | 30% | 213 | 39.1 | 16.4 | over | 386 / 83 / 469 | 1700 KV on 6S spins a 7" prop far too fast: hot motors and a desync, a long way from home. Use 1100-1300 KV on 6S. / Full throttle pulls ~213 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p4000 | 2807-1700 | 7x4x3 | 931.0 | 2689.1 | 11.55 | 29% | 282 | 31.5 | 13.2 | over | 386 / 83 / 469 | 1700 KV on 6S spins a 7" prop far too fast: hot motors and a desync, a long way from home. Use 1100-1300 KV on 6S. / Full throttle pulls ~282 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p5000 | 2807-1300 | 7x3.5x2 | 953.0 | 1332.6 | 5.59 | 42% | 120 | 44.7 | 18.8 | - | 410 / 81 / 491 | Full throttle pulls ~120 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p5000 | 2807-1300 | 7.5x3.7x2 | 957.0 | 1465.9 | 6.13 | 40% | 125 | 47.2 | 19.8 | - | 410 / 83 / 493 | Full throttle pulls ~125 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p5000 | 2807-1300 | 7x4x3 | 963.0 | 1572.5 | 6.53 | 39% | 165 | 38.1 | 16.0 | - | 410 / 83 / 493 | Full throttle pulls ~165 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p5000 | 3008-1100 | 7x3.5x2 | 985.0 | 954.1 | 3.87 | 51% | 86 | 43.3 | 18.2 | - | 426 / 81 / 507 | Full throttle pulls ~86 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p5000 | 3008-1100 | 7.5x3.7x2 | 989.0 | 1049.6 | 4.24 | 48% | 89 | 45.7 | 19.2 | - | 426 / 83 / 509 | Full throttle pulls ~89 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p5000 | 3008-1100 | 7x4x3 | 995.0 | 1125.9 | 4.53 | 47% | 118 | 36.8 | 15.5 | - | 426 / 83 / 509 | Full throttle pulls ~118 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p5000 | 2807-1700 | 7x3.5x2 | 949.0 | 2278.9 | 9.61 | 32% | 205 | 44.9 | 18.9 | over | 402 / 81 / 483 | 1700 KV on 6S spins a 7" prop far too fast: hot motors and a desync, a long way from home. Use 1100-1300 KV on 6S. / Full throttle pulls ~205 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p5000 | 2807-1700 | 7.5x3.7x2 | 953.0 | 2506.8 | 10.52 | 31% | 213 | 47.4 | 19.9 | over | 402 / 83 / 485 | 1700 KV on 6S spins a 7" prop far too fast: hot motors and a desync, a long way from home. Use 1100-1300 KV on 6S. / Full throttle pulls ~213 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1p5000 | 2807-1700 | 7x4x3 | 959.0 | 2689.1 | 11.22 | 30% | 282 | 38.2 | 16.1 | over | 402 / 83 / 485 | 1700 KV on 6S spins a 7" prop far too fast: hot motors and a desync, a long way from home. Use 1100-1300 KV on 6S. / Full throttle pulls ~282 A, more than one 21700 cell can give (~45 A): the voltage will sag hard on punch-outs. Fine if you cruise. |
| 6s1800 | 2807-1300 | 7x3.5x2 | 777.0 | 1332.6 | 6.86 | 38% | 120 | 19.8 | 8.3 | - | 386 / 81 / 467 | LiPo: lots of punch, but only 8 min of cruise. Li-ion more than doubles it. |
| 6s1800 | 2807-1300 | 7.5x3.7x2 | 781.0 | 1465.9 | 7.51 | 36% | 125 | 20.8 | 8.8 | - | 386 / 83 / 469 | LiPo: lots of punch, but only 9 min of cruise. Li-ion more than doubles it. |
| 6s1800 | 2807-1300 | 7x4x3 | 787.0 | 1572.5 | 7.99 | 35% | 165 | 16.8 | 7.0 | - | 386 / 83 / 469 | LiPo: lots of punch, but only 7 min of cruise. Li-ion more than doubles it. |
| 6s1800 | 3008-1100 | 7x3.5x2 | 809.0 | 954.1 | 4.72 | 46% | 86 | 19.0 | 8.0 | - | 402 / 81 / 483 | LiPo: lots of punch, but only 8 min of cruise. Li-ion more than doubles it. |
| 6s1800 | 3008-1100 | 7.5x3.7x2 | 813.0 | 1049.6 | 5.16 | 44% | 89 | 20.0 | 8.4 | - | 402 / 83 / 485 | LiPo: lots of punch, but only 8 min of cruise. Li-ion more than doubles it. |
| 6s1800 | 3008-1100 | 7x4x3 | 819.0 | 1125.9 | 5.50 | 43% | 118 | 16.1 | 6.8 | - | 402 / 83 / 485 | LiPo: lots of punch, but only 7 min of cruise. Li-ion more than doubles it. |
| 6s1800 | 2807-1700 | 7x3.5x2 | 773.0 | 2278.9 | 11.79 | 29% | 205 | 19.9 | 8.3 | over | 378 / 81 / 459 | 1700 KV on 6S spins a 7" prop far too fast: hot motors and a desync, a long way from home. Use 1100-1300 KV on 6S. / LiPo: lots of punch, but only 8 min of cruise. Li-ion more than doubles it. |
| 6s1800 | 2807-1700 | 7.5x3.7x2 | 777.0 | 2506.8 | 12.90 | 28% | 213 | 20.9 | 8.8 | over | 378 / 83 / 461 | 1700 KV on 6S spins a 7" prop far too fast: hot motors and a desync, a long way from home. Use 1100-1300 KV on 6S. / LiPo: lots of punch, but only 9 min of cruise. Li-ion more than doubles it. |
| 6s1800 | 2807-1700 | 7x4x3 | 783.0 | 2689.1 | 13.74 | 27% | 282 | 16.9 | 7.1 | over | 378 / 83 / 461 | 1700 KV on 6S spins a 7" prop far too fast: hot motors and a desync, a long way from home. Use 1100-1300 KV on 6S. / LiPo: lots of punch, but only 7 min of cruise. Li-ion more than doubles it. |

## Appendix B: in-page physics checks (original `physics()`, 10 ms steps)

| Check | Result |
|---|---|
| quad5 alt-hold, W held 8 s from the pad | climbs 2.1 m/s, peak 10.47 m, settles 10.2 m; released, sinks to 9.0 m |
| quad5 range, climb beside the tower then push over it | peak 10.47 m, nearest approach to TOWER TOP 2.38 m (r 1.6), crash `Hit an obstacle` on the slab |
| quad5 angle, full forward stick | top speed 14.0 m/s |
| quad5 acro, pitched then full throttle | 50.5 m/s |
| quad5 hover 600 s | 780 mAh used of 1100, 3.67 V/cell, never cut out |
| quad5 2450 KV on 6S | desync at 5.67 s (full throttle) and 138.45 s (hover); no crash at full throttle in angle mode |
| cinewhoop 2004-1950 on 4S (T:W 1.8) | alt-hold climbs normally (7.3 m in 4 s) |
| whoop 25000 KV on 2S | desync at 5.67 s |
| whoop full throttle | OSD 5.9 A (real ~11.4 A), 4.183 V (sag 0.017 V) |
| GPS rescue from the pad | out, link lost, climb to 7 m, home, descend, landed in ~17.5 s |
| GPS rescue with reversed puck | flies away at ~12 m/s; warning at 14 m |
| GPS rescue started 94 m out | climbs to 45 m at ~2.1 m/s, returns at ~9 m/s |

## Appendix C: screenshot index (`.../scratchpad/shots/drone-lab-a/`)

`00-home-quad5.png` full page; `01-bench-*.png` four benches; `10`-`18` quad5 build, exploded, picker, smoke,
pop, motor test frames, crash; `sheet-bench-states.png`, `sheet-motortest.png`; `21`/`22` take-off flips;
`23`-`27` field, flying, FPV, roll, stuck state; `30`-`38` race, range, FPV bando/gap/low battery, acro
(`sheet-quad5-race-range.png`, `sheet-quad5-fpv.png`); `40`-`48` whoop (`sheet-whoop*.png`); `50`-`56` cinewhoop
(`sheet-cine*.png`); `60`-`67` long range rescue/range (`sheet-lr*.png`); `70`-`73` phone; `74-param-*.png` URL
params; `80-ahi-*.png`, `sheet-ahi.png` OSD horizon check. Logs: `build_quad5.log`, `faults_quad5.log`,
`flight_quad5.log`, `range_quad5.log`, `others.log`; data: `calcs.json`, `warnings.json`, `sim_checks.json`.
