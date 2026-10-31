# Drone figures: the data format

Owner: engine:drone. Every drone figure (`figures/drones/<id>.js`) is data for one engine,
`figures/engine/drone*.js`. Write your craft from this page and from `figures/drones/quad5.js`
(the worked example). The engine renders exactly what is written here; if you need something the
format cannot say, write it to `docs/requests/<your-label>.md` and use a `custom` piece meanwhile.

## Changelog

Additive changes only after v1. Newest first.

- v5 (04:10 CDT, Oct 25, P2-engine-b): the wiring sheet starts right of the widest button when the column reaches past
  a quarter of the frame ("Calibrate accelerometer", "Failsafe test (props off)"), so no block sits under a button.
- v4 (01:50 CDT, Oct 25, P2-engine-b): a catalogue motor may give `shaft: [d, l]` and `base: h`, a prop
  `hub: [d, h, nutD]` (§5); the `motors` and `props` pieces then draw the shaft, base flange, spokes, cap, hub and nut
  to those sizes, for whoop-scale crafts. Without them every craft draws as before (5 x 7 mm shaft, 3 mm base, a
  12 x 5.5 mm hub with an 8.4 mm nut).

- v3 (23:20 CDT, Oct 24): motors can move while the figure runs.
  - motor `bank` (deg about the craft's x axis, after `tilt`) and a per-frame pose from `craft.motorPose(st, i, mo)`
    (§3, §4); `ctx.pose[i]` and `SL.drone.motorFrame(mo, z0)` for a craft's own pieces (§7.1);
  - `craft.animating(st)` keeps the figure animating, and `SL.drone.settle()` resolves when it stops (§3, §10.4).
- v2 (14:25 CDT, Oct 24): the engine and quad5 landed; every section now matches the code.
  Corrections, each marked (v2) in place:
  - §7 `antenna`: the style field is `type`, not `kind`, because `kind` is the piece kind;
  - §7 `wires`: the real routing fields;
  - §7 `xt60`: `dir`, the cap `stripe` and `leads`, and the plus and minus leads drawn either side of one `lead` path;
  - §7.1: `g.wire`'s third argument is a thickness, and `g.text`, `g.led`, `g.disc` and `g.arrow` return SVG strings;
  - §4: one slab thickness, `arm.t`;
  - §10.1: unknown `set` fields are refused with a reason, not ignored;
  - §10.2: no `plug` sound;
  - §10.3: the `remove` picker replaces the "Take off chip" wording.
  Additions:
  - top-level `bounds` and `messages`;
  - part `cover`;
  - `arm.pad` and `arm.from`;
  - the `vtol` layout, a wing on any layout, and `wing.boom` as an array;
  - board `arrowAt`, `labelAt`, `ledAt`, `usb` and `pads`;
  - module `labelSize`, `labelColor` and `ledAt`;
  - camera `depth`, `lens` and `plates.l`/`plates.t`;
  - standoffs `split`;
  - plate `l`/`w`/`r`/`at`/`label`;
  - battery `strapW`/`strapColor`/`strapZ`;
  - `g.oblock` and `SL.drone.W`;
  - `ctx.flows` (see-through current dots);
  - `tests.smoke.at`;
  - the URL parameters (§10.5);
  - the frame validation messages;
  - motor `at[2]` and `tilt` drawn (§4);
  - `xrCaption`;
  - keyboard and ARIA on parts and sheet blocks (§10.2);
  - the `flight.mistakes` codes (§10.2);
  - the `remove` button;
  - §12 checklist and the quad5 worked example (§13).
- v1 (13:55 CDT, Oct 24): first publication. Format, layouts, pieces, build rules, tests, wiring
  sheet, bridge fields.

## 1. Files and registration

| Path | What | Owner |
|---|---|---|
| `figures/engine/drone.js` | registry, state, actions (build, tests, plug), scene, bridge accept/report | engine:drone |
| `figures/engine/drone-geo.js` | craft-local geometry helpers `SL.drone.g` | engine:drone |
| `figures/engine/drone-frames.js` | frame layouts and motor numbering | engine:drone |
| `figures/engine/drone-pieces.js` | piece drawings (motors, props, boards, battery, ...) | engine:drone |
| `figures/engine/drone-sheet.js` | the hand-inked wiring sheet | engine:drone |
| `figures/drones/<id>.js` | one craft: data plus optional `custom` draw hooks | that drone's agent |
| `figures/prompts/<id>.md` | the craft's Colorfigures prompt | that drone's agent |
| `public/figures/drones/<id>.html` | built page (never edit by hand) | that drone's agent (built) |

A craft file starts with the platform's `@cf` directives (docs/FIGURES.md: the page is core.js, the bridge,
the `use` scripts in this order, then the craft file) and is one IIFE that calls `SL.drone.define({...})` and
nothing else. Copy these lines exactly; the five engine files never change name:

```js
// @cf title 5-inch freestyle quad
// @cf use engine/drone.js
// @cf use engine/drone-geo.js
// @cf use engine/drone-frames.js
// @cf use engine/drone-pieces.js
// @cf use engine/drone-sheet.js
(() => {
  SL.drone.define({
    id: 'quad5', fig: '01', title: '5-inch freestyle quad', palette: 'tomato',
    // ...fields below
  });
})();
```

`define` validates the craft (problems go to `<html data-errors>`, prefixed `drone:`), registers it and
mounts the figure synchronously. Never declare top-level names (core.js owns a long list of globals,
colorfigures-guide §1.14); keep everything inside the IIFE, and never shadow a core helper (`P`, `on`, `tag`,
`box`, `S`, `C`, `f`, `L`) inside a function that also calls it.

Build and shoot with the platform's tools:

```bash
python3 -I figures/tools/cfbuild.py drones/<id>      # -> public/figures/drones/<id>.html
python3 -I figures/tools/cfshoot.py drones/<id> --press "Smoke stopper test@300" --at 2800
```

## 2. Units and coordinates

- Millimetres, real sizes. Never scale a part up for looks; the frame fit and zoom handle size.
- Craft-local axes: **x = forward (the nose), y = left, z = up** (FLU, like ROS REP-103).
  Origin: the craft's centre in x and y, **z = 0 is the bench mat surface** (the lowest point
  of the craft rests on z = 0: the bottom plate, the landing gear or the skids).
- The engine places the craft on a square bench mat of side `mat` (default 280 mm) and handles
  the camera, framing, shadows and exploded lifts. You only write craft-local coordinates.
- Angles in degrees in data. Motor angles count **clockwise from the nose seen from above**
  (0 = front, 90 = right), which is how ArduPilot and Betaflight diagrams are drawn.
- Colours are `#rrggbb` only (core's `mix()` breaks on anything else) or a palette name:
  `'pal'` (the craft palette's light tone), `'tomato' | 'mustard' | 'mint' | 'cobalt' | 'blush'`,
  or the engine materials `'carbon' | 'metal' | 'dark' | 'pcb' | 'pcbBlue' | 'pcbBlack' | 'copper'
  | 'foam' | 'clear' | 'white' | 'red' | 'black' | 'yellow'`.

## 3. Top-level craft fields

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | the D3 id (`quad5`, `whoop`, ...) |
| `fig` | string | yes | two digits, `'01'`..`'13'` |
| `title` | string | yes | English title, e.g. `'5-inch freestyle quad'` (translated via CF_T) |
| `palette` | PALS key | yes | `tomato`, `mustard`, `mint`, `cobalt` or `blush` |
| `mat` | mm | no, 280 | bench mat side; pick it so the craft plus props fits with ~20 mm spare |
| `height` | mm | no, 120 | figure headroom (tallest built point + some room for labels) |
| `explode` | mm | no, `16 * mat / 280` | lift per exploded layer |
| `frame` | object | yes | §4 |
| `design` | object | yes | the drawing table for the host calculator's options, §5 |
| `parts` | array | yes | the build, in build order, §6 |
| `tests` | object | yes | safety tests, §8 |
| `wiring` | object | yes | the wiring sheet, §9 |
| `buttons` | array | no | extra buttons, §10.3 |
| `inside` | array | no | extra see-through callouts not tied to one part `[{ at:[x,y,z], text, part? }]` |
| `calLabel` | string | no, `'Calibrate accelerometer'` | label of the calibrate button |
| `log` | string | no, `'betaflight'` | firmware name for the first log line `-- betaflight --` |
| `bounds` | `[x0, x1, y0, y1, z0, z1]` mm | no, 80 % of the mat, `0.7 × height` tall | (v2) craft-local box the see-through callout columns are laid out around. Keep it to the body without the props (quad5: `[-75, 75, -50, 50, 0, 76]`), or the callouts are pushed off the frame (cfshoot `offFrame`) |
| `xrCaption` | string | no, `'See-through: the covers fade so the insides, the power path and the signals show.'` | (v2) the see-through caption; say what fades on your craft |
| `messages` | `{ powered? }` | no | (v2) replaces the plugged-in notice (default `Beep beep beep: ESCs armed-ready, FC and VTX on`) for crafts without an FC or VTX |
| `motorPose` | `(st, i, mo) => { tilt?, bank? } \| null` | no | (v3) motor `i`'s pose this frame, in degrees (§4); a missing or non-number field keeps the motor's own `tilt` and no bank. Called once per motor per frame |
| `animating` | `st => bool` | no | (v3) true while the craft's own motion runs (a servo sweep, a transition), so the figure keeps animating without `st.later` |

## 4. Frame layouts

`frame` describes the airframe and the motor positions. The engine draws it as the `FRAME` part.

| Field | Type | Meaning |
|---|---|---|
| `layout` | string | one of the layouts below |
| `wheelbase` | mm | motor-to-motor **diagonal** for quad layouts; for hex/octo/tri the diameter of the motor circle |
| `stretch` | number | `stretch-x` only: front-to-back motor spacing divided by left-to-right spacing (1 = true X) |
| `numbering` | string | motor numbering and spin, see below; default per layout |
| `motors` | array | optional explicit list `[{ id:'M1', at:[x, y], dir:'CW' \| 'CCW', tilt?:deg }]`; overrides layout positions |
| `arm` | `{ w, t, z? }` | arm width and thickness (mm); `z` = arm underside height (default = `plate.z`) |
| `plate` | `{ l, w, t, z?, r? }` | bottom (centre) plate: length along x, width along y, thickness, underside height (default 0), corner radius |
| `motorZ` | mm | height of the motor mount face (default = arm top) |
| `ducts` | `{ r, h, t?, z? }` or null | prop guards (whoop, cinewhoop): inner radius, height, wall thickness, underside height |
| `gear` | `{ kind:'legs' \| 'skids', h, span?, w? }` or null | landing gear under the plate; the plate then sits at `plate.z = gear.h` |
| `colors` | `{ frame?, plate?, arm?, duct?, gear? }` | colours (default carbon) |
| `wing` | object | `wing` and `vtol` layouts only, see below |

Layouts and their default numbering (seen from above, x forward):

| `layout` | Motors | Default `numbering` |
|---|---|---|
| `quad-x` | 4 at (±a, ±a), a = wheelbase / (2√2) | `betaflight` |
| `stretch-x` | 4 at (±a·s, ±a), scaled so the diagonal is `wheelbase` | `betaflight` |
| `whoop` | quad-x plus ducts (set `frame.ducts`) | `betaflight` |
| `hex-x` | 6 on a circle of diameter `wheelbase`, at 30, 90, 150, 210, 270, 330 deg | `ardupilot` |
| `octo-x` | 8 on a circle, at 22.5 + k·45 deg | `ardupilot` |
| `tri-y` | 3: two front at ±60 deg, one tail at 180 deg | `betaflight` |
| `vtol-tri` | tri-y with tilting front motors (`motors[i].tilt`) | `ardupilot` |
| `cf2` | Crazyflie 2.x X: the PCB is the frame | `crazyflie` |
| `wing` | one pusher motor at the trailing edge | `wing` |

Numbering tables (id, position, spin). These are the firmware defaults; check them against your
fact sheet and override with `frame.motors` when your craft differs.

| `numbering` | Order and spin |
|---|---|
| `betaflight` (quad) | M1 rear-right CW, M2 front-right CCW, M3 rear-left CCW, M4 front-left CW ("props in") |
| `betaflight` (tri-y) | M1 tail, M2 front-right, M3 front-left; tail servo on the tail arm |
| `ardupilot` (quad) | M1 front-right CCW, M2 rear-left CCW, M3 front-left CW, M4 rear-right CW |
| `ardupilot` (hex-x) | M1 90° CW, M2 270° CCW, M3 330° CW, M4 150° CCW, M5 30° CCW, M6 210° CW |
| `ardupilot` (octo-x) | M1 22.5° CW, M2 202.5° CW, M3 67.5° CCW, M4 157.5° CCW, M5 337.5° CCW, M6 247.5° CCW, M7 292.5° CW, M8 112.5° CW |
| `crazyflie` | M1 front-right CCW, M2 rear-right CW, M3 rear-left CCW, M4 front-left CW |
| `wing` | M1 at the trailing edge, spin from `frame.motors` (default CCW seen from behind is not assumed: give it) |

(v2) Also on `frame`:
- `arm.pad` is the motor pad radius (default `1.05 × arm.w`).
- `arm.from` is the arm root's distance from the centre (default 0).
- The arms, the motor pads and the centre plate are drawn as **one slab** of thickness `arm.t` with its underside
  at `plate.z` (default `gear.h` with gear, else 0). `arm.z` and `plate.t` are not read.

(v2) Motors that are not upright, or not on the arm tops:
- `frame.motors[i].at` may be `[x, y, z]`, where z is the height of the motor's mount face (default: the arm top,
  or `motorZ`).
- `tilt` (deg) turns the shaft from straight up towards the nose, about the craft's y axis. 0 is a lift motor, 90 a
  tractor, -90 a pusher, and anything in between is a tilt-rotor.
- The motor, its prop, the see-through stator and the motor-test arrow are all drawn in that tilted frame.
- (v3) `bank` (deg) then rocks the shaft about the craft's x axis through the mount point; + tips the top of the shaft
  to the left (+y), as a tricopter's tail servo does.
- (v3) Both can change while the figure runs: `craft.motorPose(st, i, mo)` returns `{ tilt?, bank? }` for that frame
  (tricopter: `i === 0 ? { bank: tailTilt(st) } : null`; a tilt-rotor: the nacelle angle during its transition). Make
  `craft.animating(st)` true for as long as the pose is moving.

(v2) More layouts:
- `vtol` is a QuadPlane: the wing plus the lift and pusher motors, all listed in `frame.motors`.
- `wing` also needs `frame.motors` (the pusher).
- Any other layout with `frame.wing` set draws the wing as well as its arms. For example, `vtol-tri` with a wing is
  a tilt-rotor.

`define` refuses these with `drone:` notes:
- an unknown layout;
- `wing` or `vtol` without `frame.wing` or `frame.motors`;
- any other layout without `wheelbase` (or `frame.motors`), `arm` or `plate`.

`wing` (layouts `wing`, `vtol`): `{ planform: [[x, y], ...], t, z, pod?: { l, w, h, x }, boom?: { from, to, r } }`.
(v2) `boom` may be an array of booms (a QuadPlane has two), each `{ from, to, r?, color? }`.
`planform` is the half-wing outline on the left side (+y), convex pieces allowed as an array of
outlines; the engine mirrors it to the right. `t` is the foam thickness, `z` its underside.

## 5. Design options (the host calculator's catalogue)

The host owns the calculator and its catalogue (`src/content/drones/<id>.ts`: `batts`, `motors`,
`props`, `fixed`, default picks). The figure only needs what changes the drawing, under **the
same keys**. The host sends `set { design: { batt, motor, prop } }` with those keys (§10).

```js
design: {
  default: { batt: '6s1100', motor: '2306-1750', prop: '5x4.3x3' },
  batts:  { '6s1100': { cells: 6, mah: 1100, size: [75, 35, 37], color: '#2b2a28', label: '6S 1100' }, ... },
  motors: { '2306-1750': { stator: [23, 6], kv: 1750, bell: [27.5, 15], label: '2306 1750KV' }, ... },
  props:  { '5x4.3x3': { d: 5, pitch: 4.3, blades: 3, color: '#3fa8d8' }, ... },
}
```

| Table | Field | Unit | Meaning |
|---|---|---|---|
| `batts` | `cells` | - | series cell count (the wiring sheet prints `cells × 3.7` V nominal, plug log `cells × 4.2` V full) |
| | `mah` | mAh | capacity (shown on the label) |
| | `size` | mm `[l, w, h]` | pack block, l along x |
| | `color`, `label` | | wrap colour and the text printed on the pack |
| | `chem` | `'lipo'` (default), `'lihv'`, `'liion'` | full-charge volts 4.2, 4.35, 4.2 per cell |
| `motors` | `stator` | mm `[d, h]` | from the size code: "2306" = 23 mm × 6 mm |
| | `bell` | mm `[d, h]` | outer bell diameter and height (bell height excludes the base) |
| | `shaft?` | mm `[d, l]` | shaft diameter and the length that shows with the props off (default `[5, 7]`); given, the spokes run from just outside it to 0.8 of the bell radius |
| | `base?` | mm | base flange height under the bell (default 3) |
| | `kv`, `label` | | shown on the wiring sheet |
| `props` | `d`, `pitch` | inches | "5x4.3x3" = 5 in diameter, 4.3 in pitch, 3 blades |
| | `blades` | - | 2, 3 or 4 |
| | `color` | | blade colour |
| | `hub?` | mm `[d, h, nutD]` | hub diameter and height and the prop nut's diameter, 0 or left out for a press-fit prop (default `[12, 5.5, 8.4]`) |

Every key in the host catalogue must exist here and the other way round (checked in §12).

## 6. Parts and the build

`parts` is the build in order. One entry per build step:

| Field | Type | Meaning |
|---|---|---|
| `id` | string | upper case. Use the engine ids where the craft has them: `FRAME MOTORS ESC WIRES FC XT60 CAM RX VTX TOP BATT PROPS` (tests, faults, power and the flight sim key off them). Extras: any other upper-case id (`GPS`, `TELEM`, `COMP`, `TANK`, `SERVO`, `LED`, ...) |
| `short` | string | button and tag text, English, upper case for Latin (`'FLIGHT CTRL'`) |
| `name` | string | longer English name (`'F7 flight controller'`), shown in the parts list |
| `after` | string[] | prerequisite part ids (must be fitted first) |
| `z` | number | exploded-view layer (lift = `z × explode` mm); may be negative for parts under the frame |
| `polar` | `[ok, mistake]` | optional: the two ways it can go on; index 1 is always the mistake (`['arrow forward', 'arrow backward']`) |
| `mistake` | string | for `polar` parts other than FC, XT60, PROPS: a code the host and flight sim read (`'gps-reversed'`, `'servo-reversed'`, `'tilt-reversed'`) |
| `piece` | object or array | how to draw it: one or more pieces from §7 |
| `tag` | `{ at:[x,y,z], dx, dy }` | optional label pill anchor (craft-local) and pill offset in screen px; default anchor = top centre of the first piece |
| `xr` | array | optional see-through callouts `[{ at:[x,y,z], text }]` for what is inside this part |
| `power` | `'led'` etc. | optional; see `led` in pieces |
| `cover` | boolean | (v2) a covering part (top plate, battery, canopy, shell): it fades to about 30 % in see-through so the inside shows |

Build rules the engine applies (messages are English, translated through CF_T), in this order:

1. battery plugged and the part is not `BATT`: `Unplug the battery first: never work on a live quad`
2. in the exploded view: `Close the exploded view first`; while a test or `Build it for me` runs:
   `Wait for the test to finish`
3. already on: same orientation or not polar: `{short} is already on` (tick). Other orientation:
   re-orient, the part re-drops (whoosh); re-orienting `XT60` clears the smoke check (and replaces a
   vented cap), `FC` clears the accelerometer calibration
4. a prerequisite is missing: `{short} goes on after {missing short, lower case}`
5. `PROPS` while the smoke test (if the craft has one) or the motor check (if it has motors) has not
   passed: `Props go on LAST: run the smoke stopper test and the motor direction check first`
6. otherwise it goes on: drops 70·u mm (u = mat/280) over 0.45 s, plays `place` on landing, becomes
   the selected part. Placing `XT60` clears the smoke check, `WIRES` clears the motor check (a fresh
   wiring job always has one reversed motor), `FC` clears the calibration.

Removing one part (`set { remove: id }`, or (v2) the `Remove a part` picker, button id `remove`, chip id = part
id; a chip whose part has a fitted dependant is disabled and its `why` names it): refused while plugged; refused
with `Take the {dependent short, lower case} off first` while a fitted part lists it in `after`.

`Build it for me`: unplugs, closes the exploded view, re-seats every reversed part the right way (v2: and fits
a new cap when the old one vented),
then drops each missing part in list order (props last), one every 0.35 s, and runs the three checks
for you (logged). `Take it apart`: unplugs, closes the exploded view, lifts parts off top layer first,
clears every check. Both answer `Already built` / `Already a box of parts` when there is nothing to do.

## 7. Pieces

A part's `piece` is one object or an array. Positions are craft-local mm (§2). Every piece accepts
`color` (see §2) where it makes sense. The engine-specific behaviour (LEDs on when powered,
props spinning, phase-wire pulses, the reversed-cap colour, the FC arrow) comes from the kind.

| `kind` | Fields | Draws |
|---|---|---|
| `frame` | none (reads `craft.frame`) | plates, arms, motor pads, ducts, gear, wing |
| `motors` | `color?` (bell), `base?` color | one outrunner per motor position, sized from the chosen motor (`stator`, `bell`); 3 spokes that turn in the motor's own direction |
| `props` | `hub?` | one prop per motor, from the chosen prop (`d`, `blades`, `color`); blades when slow, a translucent disc when spinning; `PROPS` with orientation 1 draws every prop with mirrored pitch (swapped CW/CCW) |
| `wires` | (v2) `from: [x, y, z]` = the ESC board centre at pad height; each motor's three wires start `padR` mm (default 17) from it towards that motor, run `edge` mm (default 6) at pad height, then drop to the arm top and run to the bell. Or `from: 'arm'` with `along` (0..1 of the arm, default .5) and `h` (mm above the arm, default 6) for ESCs on the arms. `color` default `#33302c` | three phase wires per motor (all one colour, as on real motors) |
| `board` | `at:[x,y,z]` (bottom centre), `size:[l, w]`, `t` (1.6), `holes` (30.5 \| 25.5 \| 20 \| 16, mounting pattern, mm), `color` (`'pcbBlue'`), `chips:[{ at:[dx,dy], size:[l,w,h], color?, label? }]`, `arrow:true`, `led:'#4aa3ff'`, `fets:n`, `label`; (v2) offsets from the board centre: `arrowAt`, `labelAt`, `ledAt`, `usb:[dx,dy]` (a USB-C socket at that edge), `pads:[{ at:[dx,dy], size:[l,w] }]` (copper pads) | a stack board: FC (`arrow`, `led`), 4-in-1 ESC (`fets`), AIO, PDB, VTX board, companion computer |
| `module` | `at`, `size:[l,w,h]`, `color`, `label?`, `led?`, `arrow?`, `antenna?`, (v2) `labelSize` (fraction of the smaller side, default .2), `labelColor`, `ledAt:[dx,dy]` | a small box: RX, VTX, GPS, telemetry, radar, pump, buzzer |
| `antenna` | `at`, (v2) **`type`** (not `kind`, which names the piece): `'whip'` (default; `'dipole'` draws as a whip), `'v'` or `'t'` (two white elements `spread` deg apart, default 45), `'lollipop'` or `'patch'` (head radius `head`, default 8, `headColor`, default the palette tone), `'stubby'`; `dir:[dx,dy,dz]` (default up), `len` (30), `r` (0.9), `color?` | an antenna; also allowed as `module.antenna` (one object, its own craft-local `at`) |
| `camera` | `at` (lens-face centre), `size` (19 \| 14 \| 12 \| 22 mm square), `tilt` (deg up), `plates?: { gap, h, color }`; (v2) `depth` (body length behind the lens face), `lens` (lens radius, default 0.36 × `size`), `plates.l`, `plates.t` | an FPV camera between side plates, lens tilted up |
| `xt60` | `at` (connector centre), (v2) `dir:[dx,dy,dz]` (the way the plug faces), `lead:[[x,y,z],...]` = **one** centre path from the pads to the plug (the engine draws red + and black − 2.6 mm either side), `cap:{ at, r, l, dir, stripe:[x,y,0], leads:[[pts], [pts]] }`: `stripe` is the craft-local direction the minus stripe faces when fitted right, `leads` the two legs' paths to the pads | yellow XT60, red/black leads, the electrolytic cap with its minus stripe; orientation 1 turns the stripe to the plus lead; the cap fault turns it brown with a vent and smokes |
| `standoffs` | `at:[[x,y],...]`, `z0`, `z1`, `r` (2.5), `color?`, (v2) `split` (a z where each standoff is cut in two, so a board level between z0 and z1 sorts correctly) | alloy standoffs |
| `plate` | `outline:[[x,y],...]` (convex, or an array of convex outlines), or (v2) `l, w, r` (rounded rectangle) centred on `at:[x,y]` (default 0, 0); `z`, `t`, `color`, (v2) `label` | a flat plate: top plate, deck |
| `battery` | `at:[x,y,z]` (bottom centre), `strap?:true`, `pad?:true`, (v2) `strapW` (16), `strapColor` (`#5b6478`), `strapZ` (where the strap's sides start, default `at[2]`) | the chosen pack from `design.batts`, its label and `{v} V` on top, strap with a pull tab, grip pad; the lead to the XT60 is drawn only when plugged |
| `cyl` | `at:[x,y,z]` (bottom centre), `r`, `h`, `color`, `axis?:'z' \| 'x' \| 'y'` | tanks, cans, gimbal motors |
| `box` | `at:[x,y,z]` (bottom centre), `size:[l,w,h]`, `color` | any block |
| `custom` | `draw(ctx) => items` | your own drawing (§7.1) |

### 7.1 `custom` pieces and the geometry helpers

`draw(ctx)` returns an array of items made with `SL.drone.g` (all craft-local mm; each helper returns
one item `{ box, svg }` or an array of them, which the engine depth-sorts with everything else):

| Helper | Draws |
|---|---|
| `g.box(x0, y0, z0, x1, y1, z1, color)` | an axis-aligned block |
| `g.cyl(x, y, z0, z1, r, color, n?)` | an upright cylinder |
| `g.rod(a, b, r, color, maxL?, n?)` | a rod or cable between two points, cut into pieces of at most `maxL` (12) mm |
| `g.wire(points, color, d?, maxL?)` | (v2) a polyline wire of thickness `d` mm (1.6), cut into pieces of at most `maxL` (9) mm |
| `g.plate(outline, z, t, color)` | an extruded convex outline |
| `g.oblock(o, u, v, n, hu, hv, hn, color)` | (v2) an oriented block: centre `o`, unit axes `u v n`, half sizes (tilted cameras, tilt motors) |
| `g.text(x, y, z, str, size, color?, dir?)` | (v2) **returns an SVG string**: text lying on a horizontal face, reading along +x (`dir 'x'`) or +y (`'y'`); append it to an item, `it.svg += g.text(...)` |
| `g.led(x, y, z, color, on)` | (v2) **SVG string**: a small LED that glows when `on` |
| `g.disc(x, y, z, r, color)`, `g.arrow(x, y, z, L, sign, color?)` | (v2) **SVG strings**: a flat disc; a flat arrow along +x (`sign` 1) or −x (−1) |
| `SL.drone.W(x, y, z)` | (v2) craft-local point → bench point, for `ctx.flows` and `ctx.shadows` |

`ctx` = `{ st, craft, part, orient, powered, spin, rpm, t, k, design, mat }`: `orient` 0/1, `powered`
(plugged, FC fitted, no fault), `spin[i]` motor angles, `rpm[i]` 0..1, `t` seconds since mount (for
blinking), `k` see-through amount 0..1, `design` the resolved picks `{ batt, motor, prop }` (objects from §5).
(v2) Also on `ctx`:
- `flows`: push `{ kind: 'power' | 'signal' | 'video' | 'phase', pts: [SL.drone.W(x, y, z), ...] }` and see-through
  draws moving current dots along it while the craft is powered (`phase` only for the motor under test). quad5's
  ESC harness and video coax show how.
- `shadows`: push polygons of bench points.
- `testing`: the running test or null.
- (v3) `pose[i]`: motor `i`'s `{ tilt, bank }` this frame. `SL.drone.motorFrame(mo, z0)` returns `(a, b, h) => [x, y, z]`,
  the motor's own frame in that pose (offsets `a`, `b` across the shaft, `h` up it from the mount face at `z0`), so a
  hinge, pushrod or nacelle drawn with it turns with the motor.
- Positions earlier pieces leave behind: `fcAt` and `capAt` are bench points; `xt60At` and `wireAt` are craft-local.

Keep pieces small and boxed: one item per physical piece, long things cut into pieces (the engine's
helpers do this for rods and wires). Never concatenate several parts into one item.

## 8. Tests

```js
tests: {
  smoke:     { needs: ['XT60', 'ESC'], at: [-30, 120] },  // (v2) at: craft-local x, y of the stopper box on the mat
                                              // false: the craft has no smoke stopper test (Tiny Whoop)
  motors:    { needs: ['WIRES', 'FC'] },      // false: no motors to check
  calibrate: { needs: ['FC'] },
  plug:      { needs: ['BATT', 'XT60'] },
}
```

| Test | Engine behaviour (messages as in the original, with its defects fixed) |
|---|---|
| smoke stopper | unplugs, 2.2 s; the stopper box sits on the mat with a lead to the craft; lamp blinks orange (no short) or glows solid red (cap reversed). Pass sets `smokeOk` |
| motor direction | needs props off (`PROPS OFF! Never spin motors on the bench with props on`); plugs the battery through the normal plug action (so a reversed cap still pops); spins each motor 1.2 s in numbering order with a 288° arrow and a `{M} CW` pill; one motor of a fresh wiring job spins the wrong way (`{M} CW WRONG` in red), the check then reverses it in the ESC configurator. Which motor is wrong is deterministic: the n-th wiring job of a session picks motor index `(2 + 3n) mod motors` (M3 first on a quad, as in the original), so it is not always M3 |
| calibrate | needs `FC`; works unplugged; FC reversed: passes but warns `Calibrated level. Note: the arrow on the FC points backwards...` |
| plug | needs `plug.needs` fitted; reversed cap and no passed smoke test: POP fault, smoke, brown cap, the craft stays faulted until unplugged and the XT60 re-seated the right way and the smoke test re-run |

## 9. The wiring sheet

A flat, hand-inked sheet drawn by the same page (`?sheet=wiring`, the `Wiring sheet` button, or
`set { sheet: 'wiring' }`). Canvas 760 × 340 units; blocks 150 × 56. Node ids are part ids, so a
click selects the same part as the 3D figure (and the host gets a `part` event either way).

```js
wiring: {
  nodes: {
    BATT: { at: [20, 30], title: 'BATTERY', sub: 'batt' },          // sub 'batt' | 'motor' = the chosen option's label
    XT60: { at: [20, 140], title: 'XT60 + CAP', sub: '1000 µF 35 V', color: 'tomato' },
    // ...
  },
  edges: [
    { from: 'BATT', to: 'XT60', kind: 'power', label: 'V' },        // label 'V' = the pack's nominal volts
    { from: 'ESC', to: 'MOTORS', kind: 'phase', label: '3-phase ×4', n: 3 },
    { from: 'FC', to: 'ESC', kind: 'signal', label: 'DShot600 M1-M4' },
    { from: 'CAM', to: 'VTX', kind: 'video', via: [[x, y], ...] },
  ],
}
```

| Field | Meaning |
|---|---|
| `nodes[id].at` | top-left corner of the 150 × 56 block |
| `title`, `sub` | English text; `sub: 'batt'` / `'motor'` / `'prop'` prints the chosen option's `label` |
| `color` | the 8-unit bar on the left (palette name or `#hex`); default from the edge kinds |
| `edges[].kind` | `power` (#e2483d, solid), `ground` (ink, solid), `phase` (#f08a2b, solid), `signal` (#43a35a, dashed), `video` (#f2c230, solid), `rf` (#5a82c6, dashed) |
| `edges[].n` | parallel strands (3 for phases, 2 for power + ground) |
| `edges[].via` | optional bend points; default an elbow route between the nearest block sides |
| `edges[].label` | English text; `'V'` prints the nominal pack voltage (`cells × 3.7`, one decimal) |

Live on the sheet: when powered, power edges carry moving dots; during the motor test the phase
edge to the spinning motor pulses; the selected block turns accent.

## 10. Bridge (embedded mode)

The page runs in an iframe of the host's `FigureFrame` (D11). Envelope and handshake per
colorfigures-guide §2.3; the engine passes `embed: { accept, report }` to `mountFigure`.

### 10.1 `set` patch fields the engine accepts

(v2) A patch with any other field is refused as a whole and `accept` returns the reason
(`unknown field foo`), which the bridge reports as an `error` event. Unknown part ids and design keys
are refused the same way.

| Field | Type | Effect |
|---|---|---|
| `design` | `{ batt?, motor?, prop? }` | known keys only; redraws the battery, motors and props |
| `calc` | `{ V?, maxA?, hoverA? }` | numbers for the wiring sheet labels (display only) |
| `sel` | part id or null | select (the pill and the sheet block light) |
| `step` | 0..N | show the build after step N: the first N parts fitted the right way, the rest off (animated) |
| `add` | `{ id, orient? }` | the add action, with every rule of §6 |
| `remove` | part id | remove one part (§6) |
| `run` | `'build' \| 'strip' \| 'explode' \| 'plug' \| 'unplug' \| 'smoke' \| 'motors' \| 'calibrate'` | run that action or test |
| `exploded` | boolean | open or close the exploded view |
| `sheet` | `'wiring'` or null | show the wiring sheet or the 3D figure |

### 10.2 `state` report fields (discrete values only)

| Field | Meaning |
|---|---|
| `craft` | id |
| `fitted`, `total` | parts fitted / parts in the build ("Parts 12/12") |
| `placed` | `{ ID: 0 \| 1 }` orientation of each fitted part |
| `next` | the first part in build order that is not fitted, or null |
| `built` | every part fitted |
| `plugged`, `powered` | battery plugged; powered = plugged + FC fitted + no fault |
| `fault` | null or `'XT60'` (the vented cap) |
| `smokeOk`, `motorOk`, `accOk` | the three checks |
| `test` | null or the running test `'smoke' \| 'motors' \| 'calibrate'` |
| `wrongMotor` | the motor id the last motor check reversed, or null |
| `exploded`, `sheet`, `sel` | view state |
| `design` | `{ batt, motor, prop }` keys in use |
| `flight` | `{ ready, fcReversed, propsSwapped, motorChecked, accCal, capFault, smokeTested, mistakes: [codes] }` for the flight sim: ready = built, no fault, smoke + motor + calibration done (v2) `mistakes` lists every polar part fitted the wrong way: `fc-reversed`, `cap-reversed`, `props-swapped`, else the part's `mistake`, else `<id>-reversed` (lower case) |
| `log` | `{ n, lines }`: total log lines so far and the last 10 (`-- betaflight --`, `battery plugged: 25.2 V`, ...). The host appends lines it has not seen |
| `sfx` | `{ n, name }`: the last sound effect and a counter (v2: `place whoosh tick click unplug power pop sizzle buzz ding spin`); the host plays it when `n` changes |

Part clicks arrive as the bridge's `part` event with `act: 'part'` and `data.id` = the part id (or a
wiring block). Buttons arrive as `button` events with the ids below.

(v2) Keyboard: each fitted part has one tab stop (its first drawn item; `role="button"`, `aria-label` =
the part `name`, `aria-pressed` = selected), and so does every wiring-sheet block. Enter or Space presses
it exactly like a click (same `part` event), and the focus stays on that part after the redraw. The
pickers and buttons are core buttons. A craft needs no code for any of this.

### 10.3 Buttons (stable ids for `press`)

| id | Label | Notes |
|---|---|---|
| `add` | `Add next part` (picker) | chips: one per part (`id` = part id), two per polar part (`ID` and `ID-wrong`) |
| `remove` | `Remove a part` (picker) | (v2) chips: one per fitted part (`id` = part id), disabled while a fitted part depends on it; `none` when nothing is fitted |
| `build` | `Build it for me` | |
| `strip` | `Take it apart` | |
| `explode` | `Exploded view` | toggle |
| `plug` | `Plug / unplug battery` | |
| `smoke` | `Smoke stopper test` | absent when `tests.smoke` is false |
| `motors` | `Check motor direction` | absent when `tests.motors` is false |
| `calibrate` | `calLabel` | |
| `wiring` | `Wiring sheet` | toggle the flat sheet |
| craft `buttons` | `{ id, label, onClick(api) }` | extra checks (CG check, servo test, ...); `api` = `SL.drone.api` (§10.4) |

### 10.4 `SL.drone.api` (for craft buttons and custom hooks)

`api.say(text, ms?, sfx?)` notice + log; `api.log(line)`; `api.sfx(name)`; `api.isOn(id)`; `api.orient(id)`;
`api.st` (the state, read-only by convention); `api.render()`.

(v3) `SL.drone.settle()` returns a promise that resolves once the figure stops animating (placements, tests and
`craft.animating` all done), so a test can wait for a sweep without polling.

`SL.drone.advanceUntil(done, maxSeconds, dt = 0.05)` is the test seam: it steps simulated time with the frame loop's own
step until `done()` is true or `maxSeconds` pass, draws once and returns `done()`. A test that also loads the page with
`frozenClock` (testkit) never depends on the CPU share. No production page calls it.

### 10.5 URL parameters (v2)

The engine reads these on load, in this order, on top of the core's own (`yaw`, `pitch`, `xr`, `labels`,
`press`, `free`, `embed`, ...). The page always starts **fully built, all three checks passed, unplugged**.

| Parameter | Effect |
|---|---|
| `step=n` | only the first `n` parts are fitted; the checks their parts own are cleared (XT60 → smoke, WIRES → motor, FC → calibration) |
| `flip=ID,ID` | fits those polar parts the wrong way round (`XT60` clears the smoke check, `FC` the calibration) |
| `fresh=1` | clears all three checks; the next motor check has one reversed motor |
| `batt=`, `motor=`, `prop=` | design keys (§5); unknown keys are ignored |
| `exploded=1` | opens the exploded view (cfshoot's exploded set) |
| `sheet=wiring` | shows the wiring sheet |
| `sel=ID` | selects a part |
| `plug=1` | plugs the battery when `BATT` and `XT60` are fitted; with a reversed cap and no passed smoke test the craft starts faulted |

## 11. Strings and translation

Every figure string (titles, `short`, `name`, polar options, callouts, sheet titles, messages) is
English in the craft file and goes through `CF_T` at draw time; the host sends the dictionaries
(`src/i18n/figures/<lang>.json`, keys = the English strings). Messages with values use the core's
placeholder form: the key is `'{short} is already on'` and the engine calls `CF_T(key, { short })`, so
translators keep `{short}`. Write Latin labels in capitals; escape nothing yourself (the engine escapes
`& < > "`). The engine's own message keys are listed in `figures/engine/drone.js` (`MSG`), so the
translation wave can collect them.

## 12. Verification checklist

(v2) Run every step before you report a craft as done. quad5 passes all of them (§13).

1. **Build** with `python3 -I figures/tools/cfbuild.py drones/<id>`. It must print `built ...` with no warnings
   and no `drone:` notes.
   - A warning that a local shadows a core helper (`on`, `sp`, `sub`, `line`, ...) is a real bug: rename the local.
   - `define` problems land in `<html data-errors>`. cfshoot reports them as `errors`.
2. **Shoot** with `python3 -I figures/tools/cfshoot.py drones/<id> --press "Take it apart@300,Build it for me@2600"
   --at 1800,7000`. It must end with `OK: 29 shots + embed check`. In `report.json`, every shot must have:
   - `errors` empty and `nan` 0;
   - no `overlaps`;
   - no `offFrame`. If the see-through callouts go off the frame, tighten `bounds` (§3) to the body and keep each
     callout text to about 16 characters (`'MOSFETS x12'`, not a sentence).
3. **Look at `contact.png`** and open the full-size shots it flags:
   - **Angles (7 shots).** Nothing is drawn through anything else: stack boards over the frame, props over the arms,
     the battery over the top plate. Nothing floats, and the blue shadow sits under the craft.
   - **`exploded-*`.** cfshoot loads `?exploded=1`. Every part lifts by its `z`, and no part overlaps the layer
     next to it.
   - **`xr-*`.** Cover parts are faded, the insides show, and the callouts are readable and on the page.
   - **`press-*`.** The strip leaves an empty mat at `Parts 0/N`. The build ends at `Parts N/N` and `Checks k/k`,
     with the notice `Built: every part on...`.
   - **`phone-xr`.** Numbered badges, the label list under the figure, buttons that wrap, and no sideways scroll.
   - **`embed`.** The bridge answered `ready`, `state`, `button`, `labels` and `error`.
4. **Labels.** Shoot `?labels=1` at the default view: no two pills may overlap. Tune each part's `tag.at`, `dx`
   and `dy`, and anchor the tag on what it names.
5. **Safety flow** by URL (`?embed=0` for a standalone look; `press` takes the English button labels, with spaces
   as `%20`). It must behave as §8 says:
   - `?flip=XT60&press=Smoke%20stopper%20test@200`: the stopper lamp glows solid red and the notice says the cap is
     in backwards. Then Plug gives POP, the brown vented cap and smoke. Then unplug, add the XT60 the right way, and
     the smoke test passes.
   - `?fresh=1&step=<index of PROPS>&press=Check%20motor%20direction@200`: the battery plugs in, each motor spins
     in numbering order, and one shows `M3 CW WRONG` in red (on a quad). After that, Add PROPS is allowed.
   - With the props on, Check motor direction refuses with `PROPS OFF! ...`.
   - `?flip=FC&press=Calibrate%20accelerometer@200`: passes with the backwards-arrow warning.
   - `?flip=PROPS`: the blades are mirrored (leading edges on the wrong side).
6. **Wiring sheet.** Shoot `?sheet=wiring&plug=1&sel=FC`:
   - every node block is on the paper, clear of the button column;
   - no label crosses a wire or a block;
   - the selected block is in the accent colour;
   - dots run on the powered edges;
   - parts that are not fitted are dashed (`?step=3&sheet=wiring`).
7. **Design keys.** Every key in the host catalogue (`src/content/drones/<id>.ts`) exists in `design`, and the
   other way round. For each key, `?batt=<key>`, `?motor=<key>` and `?prop=<key>` must visibly change the
   drawing.
8. **Facts.** Check every dimension against `docs/facts/<id>.md`. Check the motor numbering and spin against your
   firmware's mixer for the layout, and override with `frame.motors` where the table in §4 does not fit.
9. **Clean up.** Kill every server and browser you started.

## 13. Worked example: quad5

(v2) `figures/drones/quad5.js` is the reference craft; copy its shape. Geometry is from `docs/facts/quad5.md`.

| Choice | Value in quad5.js | Why |
|---|---|---|
| frame | `layout: 'quad-x'`, `wheelbase: 225`, `arm: { w: 14, t: 5, pad: 15.5 }`, `plate: { l: 112, w: 46, z: 0, r: 8 }`, `motorZ: 5` | true-X, motors at ±79.5 mm; 5 mm arms; the slab top is the motor mount face |
| mat, height, explode | `300`, `120`, `12` | the props span 286 mm; the battery top is at 73 mm |
| `bounds` | `[-75, 75, -50, 50, 0, 76]` | the body without props, so the see-through callouts stay on the page |
| stack | ESC board z 9 (spacers 5-9), FC z 16 (grommets 11.7-16), VTX z 24 (spacers 19-24) | each level's standoffs start above the board below it (FETs and chips included), so the levels sort cleanly |
| `WIRES` | `from: [0, 0, 10.6]`, `padR: 18`, `edge: 5` | the phase wires leave the ESC's motor pads and drop to the arm |
| `XT60` | plug at `[-72, 0, 9]` facing `-x`; `lead` from the ESC battery pads `[-17, 0, 11]`; cap at `[-25, 15, 10.6]` with `stripe: [0, 1, 0]` | male XT60 on the quad, out the rear; the 1000 µF cap's stripe faces the minus pad |
| `FC` | `polar: ['arrow forward', 'arrow backward']`, `arrowAt: [-10, 0]`, `usb: [0, 17]`, a `custom` harness with a `signal` flow | the arrow is the mistake the calibrate test warns about |
| `CAM` | `at: [43, 0, 18.5]`, `size: 19`, `tilt: 30`, palette side plates; a `custom` coax with a `video` flow | 19 mm micro camera, 30° uptilt |
| `RX`, `VTX` | ELRS module with two whips at 90°; VTX board with an alu can and a lollipop `antenna` out the rear | the VTX antenna stays clear of the props |
| `TOP`, `BATT` | `cover: true` | they fade in see-through |
| `PROPS` | `polar: ['props in (correct)', 'swapped CW/CCW']`, `after: ['MOTORS', 'TOP']` | props go on last (rule 5) |
| tests | `smoke: { needs: ['XT60', 'ESC'], at: [-30, 120] }`, `motors`, `calibrate`, `plug` | the stopper box sits on the mat to the left of the craft, beside the rear-left motor |
| wiring | 8 blocks, 7 edges: BATT-XT60 power `label: 'V'`, XT60-ESC power, ESC-MOTORS phase `n: 3`, FC-ESC `DShot600`, RX-FC `UART2 CRSF`, CAM-FC and FC-VTX video | the real signal path of an analog 5-inch |

Build and check it with:

```bash
python3 -I figures/tools/cfbuild.py drones/quad5
python3 -I figures/tools/cfshoot.py drones/quad5 --press "Take it apart@300,Build it for me@2600" --at 1800,7000
```
