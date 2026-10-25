# Board Bench figures: the data format

Owner: engine:bench. Board, module, part and robotics-bench agents write their figure data in exactly this format and
nothing else. The engine (`figures/engine/bench*.js`, `figures/engine/sheets*.js`) renders it. The Uno R3
(`figures/boards/uno-r3.js`) is the worked example: copy its shape.

## Changelog

Changes after the first publication are additive only. Every change is logged here, newest first.

- v13 (02:30 Oct 25, P2-engine-b): `upload.also` (§6.1); Break it labels a `gpio5v:<pin>` fault ("5 V into GPIO4
  (a 3.3 V pin)"). When the supply drops out under a running chip (brown-out, a cold joint on the connector, a
  short) and comes back, the program starts again from t = 0 with its banner, after the board's `brownoutLine` for
  a brown-out. Cold-joint and brown-out patterns run on `st.on` (time since the supply went in), not the program
  clock. A mode's banner goes out on its own frame, so `state.serial` no longer drops it behind line 0. A finished
  upload leaves the Pico's UF2 boot (it reboots into the program), and so does unplugging. Scenario sources get no
  Break it voltage choices.
- v12 (02:10 Oct 25, P2-engine-b): the obstacle prop stays on the mat and off the breadboard over 2-450 cm (prop
  `travel`, `ctx.breadboard`, §9.1).
- v11 (01:30 Oct 25, P2-engine-b, for the FPGA boards): a feed takes `onlyIf: ['ctl:SW16', '==', 1]` (a condition on
  a rail's volts or a control's position; `offIf` reads the same way, §6.1); a rail's `victim` may be
  `{ part, fails: 'short' }`, which pulls that rail and the rails fed from it to 0 V; a slide control's `start` sets
  its first position; `mcu.bootNeeds` lists parts only
  the power-up start reads, so an upload runs without them until the next power cycle; a header part's `rs` (ohms)
  puts a resistor between its signal pins and any breadboard wire on them (§4.2). More than four controls of one
  type fold into one picker, "Flip a switch" / "Press a button" (§6.3). The automatic cold joints skip ids the
  board lists itself and start with a control and an LED. The board view moves down, once laid out, until no stat
  covers the drawing.
- v10 (00:40 Oct 25, P2-engine-b): a breadboard ULN2003 driver board (`figures/parts/uln2003.js`, legs IN1-IN4,
  GND, VCC on its header, lying on the mat) and the solver's `stepper` type: the 28BYJ-48 with `plug: 'DRV1'` sits
  in the board's socket and reports `coils` from the current in each coil, so the stepper turns from the circuit,
  not from its `in` pins (§8, §9). Element `legs`/`pins` take node names, a part may list inside `nodes`, a `ch`
  entry of any type has its own key, and a part's `npn` channels report as one `driver` entry. A params patch that
  changes nothing a part takes no longer clears its burnt state. The UNO R3 stepper lesson wires the board up.
  An `npn` whose base carries the load (pin and load swapped) reports `overdrive`.
- v9 (23:50, P2-engine-b): lesson props (§9.1): `circuit.props: [{ id, prop, at, aim, ...params }]` stand the
  scenery a world input names on the mat (desk lamp, hair dryer, obstacle, watering can, strength meter, weights;
  `// @cf use engine/bench-props.js`). They are pressable like parts (`select`, `params`, a `part` event), never in
  the solver. Part pages are framed on the part (§8): the frame is the part's drawn box plus 10 mm, the mat fades
  out at its edge. `report.inputs` (§13) and `accept.inputs` keyed by net. A `cold:<pin>` header fault cuts only
  what plugs into the pin, not the board's own LED on that net (§6.4).
- v8 (22:40, P2-engine-b): breadboard and mat parts label their insides with `ctx.label(at, text, on)` (§8), not
  `tag()`; the scene lays those labels and the board's see-through notes out together, last, in two columns
  (`xrCallouts`) outside any view scaling. A stats panel with more than four entries is set smaller and wraps a
  value at its spaces (a three-column grid on a phone), so a motor bench's numbers stay clear of the drawing. The
  board view's frame holds the tallest thing on the mat (a periph part's `foot[2]` or `height`, a periph board's
  height), so a TT motor's wheel no longer runs into the title row.
  Circuit faults (§6.4): `missing:`/`reversed:` on a breadboard-circuit part, and a listed fault's circuit edit
  (`missing`, `reversed`, `cut`, `wires`, `holes`); `SL.bench.circuitNow()` is the circuit with the faults in force.
- v7 (21:00, P2-engine): the breadboard solver is a DC circuit solver (`figures/engine/bench-solve.js`, §9): node
  voltages per PWM time slice, averaged over the period, for every `elec` type in the §8 table (not yet the
  stepper). Every `meas` entry carries `kind` (§9 table); host readouts that only know LEDs should filter on
  `kind: 'led'`. New in the `state` event: `volts` (average volts on every pin and input net the circuit uses) and
  `sound` (the loudest part sounding), plus a bridge event `tone` when it changes (§13). A circuit that draws more than
  the source's `ilim` browns the board out with the reason (§6.1). Part files may add `press(p, down)`, `steps`,
  `step({ p, st, m }, dt)`, `sound(p, m)`, `legAt(p, origin, i)`, `foot: [w, d, h]` or `height`; `draw` gets `k` and
  `solo` (§8). The breadboard view's mat grows to fit circuit parts that sit on it (`at`) and is fitted per circuit.
  `tones` is in the §13 table. A bench may name its modes picker with `modesLabel` (§7). `pcb.standoffs: false` draws
  no standoff posts (a board standing on its header pins); a rail's `victim` names the part an over-voltage on it
  burns (§6.1). The see-through labels' right
  column starts under the stats panel. There is no `module` elec type (v1 listed one; it was never built): a module's part
  file declares its insides in the types above.
- v6 (19:40, P2-engine): one `set` patch is applied as one moment: unplug (`power: null`) first, then `exploded`,
  `build`, `remove`, `restore`, `fault`, `matStep`, `circuit`, `params`, `tones`, `inputs`, `press`, then plug in
  (`power: <source>`), then `view`, `select`, `serial`, so `{ power: 'usb', fault: 'missing:Y2' }` shows the powered
  board without Y2 (§13). A host `fault` replaces the fault before it (repair, then apply); `fault: null` also turns
  reversed parts back round. Plugging in the source that is already in keeps the sketch clock. `state.faults` carries
  `reversed:<id>` for every polar part sitting backwards (§6.4). Feeds take `burns: '<part>'` (what a reversed supply
  on that feed destroys) and `ilim` (amps: a current-limited regulator, so a short on its rail zeroes that rail and the
  rails it feeds, and the rest runs) (§6.1). `polar.rail`: a backwards part only faults while that rail is live (§4.1).
  Uploads also need every `mcu.needs` part. The serial `banner` is printed as written (program output, never
  translated). Pick and place takes at most about 3 s. `faults` entries may be `[id, label]`; listed faults without a
  label get one from their kind ("Short from 5V to GND", "Leave out C5") (§6.4). The model hook returns `stats`,
  `meas`, `report`, `flow` and `accent` as well (§11). `cfshoot.py --set '<json>'` sends a patch through the bridge and
  records the state (§14). Boards declare boot `straps`, latched when the program (re)starts (§6.3). An MCU rail at
  0 V reports `no-power` ("No power on 5V"), not a brown-out.
- v5 (14:15): part files may name their pickers with `paramNames: { tempC: 'Temperature' }` (§8; default: the
  param key with a capital). The standalone page now has keyboard access to every drawn part: an off-screen group
  of buttons, one per part, where focus selects the part and Enter or Space holds a control (§14); inside the host
  the host's own part list does this.
- v4 (14:09): part pages also take the one-part shape `show: { breadboard, holes, params }`; with no `show` the
  part sits in row e from column 5 (§8). Param specs: a two-number array is a range `[min, max]`, anything else a
  list (§8); the host's `set {params}` now accepts any number inside a range (v3 only took the end values).
  Part-page pickers for ranges: the common resistor values for `ohms`, both ends for on/off names (`pressed`,
  `on`, `closed`, `down`), decades for wide ranges (`lux: [0, 100000]`), else five even steps.
- v3 (14:03): part pages (§8: `fig`, `show`, `example`; `public/figures/parts/<id>.html` shows the part on a
  breadboard with a picker per param), circuit parts on the mat with `at` and module legs as wire ends
  (`M1.VCC`, part `pinZ`) (§9), benches merge with their board and report `tasks` (§11, with what is built so far),
  `view` aliases `iso`, `see-through`, `exploded` (§13). Correction: `meas` states are
  `ok | off | burnt | reverse | open` (§13; v1 said `dark`). The verification checklist (§14) and the Uno worked
  example (§15) are written.
- v2 (13:58): the engine and the Uno R3 exist (`figures/engine/bench*.js`, `figures/engine/sheets.js`,
  `figures/boards/uno-r3.js`). Corrections to v1, all binding: dependencies are the platform's directives
  `// @cf title …` and `// @cf use engine/bench.list` (not `// needs:`, §1); a page mounts its own item synchronously
  (§1 Start); the world mapping is `worldX = mat.back + (pcb.h − y)` (§2). Added: header option `mirror` (§4.2),
  `led.via` (§4.1), board `bootloader` and `logic` (§3), message templates with `{name}` placeholders (§6.2), URL
  test parameters (§13.1), sound through `CF_BRIDGE.send('sfx')` (§13), breadboard-part `draw` context (§8),
  modules on a breadboard as parts (§11), circuit parts on the mat (`at`, §9), the verification checklist (§14) and
  the Uno worked example (§15).
- v1 (13:36 CDT Oct 24): first publication.

## 0. Rules in one screen

- One file per item: `figures/boards/<id>.js`, `figures/modules/<id>.js`, `figures/parts/<id>.js`,
  `figures/robotics/<id>.js`. Each file is an IIFE that calls exactly one registration function (section 1) and
  defines no globals. Never declare a top-level name; never shadow a core helper (`P`, `on`, `tag`, `box`, `S`, `C`,
  `f`, `L`…) inside a function that also calls it (guide §1.14).
- Units are millimetres, angles are degrees. Coordinates are **board coordinates** (section 2): origin at the
  board's bottom-left corner in its datasheet top view, `x` right, `y` up (away from the viewer's front edge), `z` up
  out of the component side.
- Ids: part ids are the real silkscreen designators where the board prints one (`U1`, `C4`, `J1`), otherwise a short
  upper-case id (`LED_L`, `ANT`). Pin ids are `<partId>.<n>` (1-based). Net names are the names the host and the
  interpreters use (`D13`, `A0`, `GPIO2`, `GP25`, `P0`, `LED0`, `SW0`, `5V`, `3V3`, `GND`, `VIN`).
- Every English string you write (names, short labels, titles, messages) is a `CF_T` key: plain English, sentence
  case, no HTML. Escape nothing: the engine escapes at the edge.
- Every part you list must be drawn, selectable, removable (unless `fixed`), and named. No placeholders, no
  "TODO", no invented positions: take positions from the fact sheet (`docs/facts/<id>.md`) or the maker's drawing.

## 1. Files, registration, build

```
figures/engine/bench.js        SL.bench core: registry, state, build flow, power, faults, scene, bridge
figures/engine/bench-kinds.js  on-board part drawings (section 5)
figures/engine/bench-bb.js     breadboard scene, lesson circuits, circuit solver (section 9)
figures/engine/sheets.js       flat hand-inked sheets: schematic and power tree (section 10)
figures/parts/<id>.js          breadboard parts: breadboard, led, resistor, wire, button, pot… (section 8)
figures/boards/<id>.js         one board          → SL.bench.board(def)
figures/modules/<id>.js        one module         → SL.bench.module(def)   (same shape as a board)
figures/robotics/<id>.js       one bench          → SL.bench.bench(def)
```

Registration calls (all take one plain object; the engine validates it and writes problems to
`<html data-errors>`, prefixed `bench:`):

| Call | For | Notes |
|---|---|---|
| `SL.bench.board(def)` | a board | `def.id` is the D3 board id (`uno-r3`) |
| `SL.bench.module(def)` | a robotics module (TB6612, L298N, A4988, HC-SR04 breakout…) | same fields as a board; may be placed into a bench or a lesson circuit |
| `SL.bench.bench(def)` | a robotics bench (Fig 01-13) | section 11 |
| `SL.bench.part(name, def)` | a breadboard part | section 8 |
| `SL.bench.kind(name, def)` | an on-board drawing the library lacks | section 5.3; register it in your own item file before your `board()` call |

**Dependencies** (docs/FIGURES.md "Writing a figure"). The leading comment lines of every item file are the
platform's build directives:

```js
// @cf title Arduino Uno R3
// @cf use engine/bench.list
```

`figures/engine/bench.list` lists the engine files and the shared breadboard parts in load order (bench.js,
bench-kinds.js, bench-bb.js, sheets.js, parts/breadboard.js, led.js, resistor.js, wire.js). A bench that shows a
board or modules adds one `// @cf use boards/uno-r3.js` or `// @cf use modules/tb6612.js` line per file after the
list. A part file of your own that a circuit needs (`parts/button.js`) is added the same way. Build:
`python3 -I figures/tools/cfbuild.py boards/<id>`.

**Start.** Item files only register; never call `mountFigure` yourself. The engine mounts, synchronously and inside
the registration call, the item whose kind and id match the page file (`public/figures/boards/uno-r3.html` →
board `uno-r3`; `modules/<id>.html` → module, `robotics/<id>.html` → bench, `parts/<id>.html` → part) or the
`?id=` parameter. Registered dependencies (the board inside a bench page) do not mount. A page built elsewhere
(`cfbuild --out`) mounts the last registered item at `DOMContentLoaded`.

**Output.** `public/figures/boards/<id>.html`, `public/figures/modules/<id>.html`, `public/figures/parts/<id>.html`,
`public/figures/robotics/<id>.html`. Write the figure's Colorfigures prompt to `figures/prompts/<id>.md`.

## 2. Coordinates

```
            y (mm)                      board coordinates, top view, component side up,
            ▲   back edge               silkscreen upright, as in the maker's mechanical drawing
            │ ┌──────────────────┐
            │ │                  │      z = 0 is the top copper; the PCB fills -thick..0
            │ │      board       │      side:'bottom' parts sit at z < -thick (drawn under it)
  left edge │ │                  │ right edge
            │ └──────────────────┘
            └──────────────────────▶ x (mm)
   origin (0,0) = bottom-left corner     front edge (y = 0) faces the viewer-right at the default camera
```

- If your source is KiCad or an image with `y` down, convert: `y = boardHeight − y_kicad`.
- Board outline: `pcb.w` (x size) by `pcb.h` (y size), optional `pcb.outline` polygon `[[x,y],…]` (convex or not;
  the engine extrudes it) for notches (the Uno's corner cut, the micro:bit's edge).
- The engine places the board on a cutting mat. World mapping (internal, for custom kinds use `ctx.P`):
  `worldX = mat.back + (pcb.h − y)`, `worldY = mat.right + (pcb.w − x)`, `worldZ = top + z` (`top` = mat 3 mm +
  `pcb.standoff` + `pcb.thick`), so the front edge faces viewer-right and the left edge viewer-left at the default
  yaw of 45°. The mapping is a reflection; the core's projection is one too, so the board reads the right way round.
  Helpers: `SL.bench.BP(x, y, z)` → world point, `SL.bench.BPs(x, y, z)` → screen point.

## 3. Board definition (`SL.bench.board(def)`)

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | D3 id |
| `name` | string | yes | "Arduino Uno R3" |
| `sub` | string | yes | one line: "ATmega328P at 16 MHz, 5 V logic" |
| `fig` | string | no | figure number for the header, e.g. `'01'` |
| `pcb` | object | yes | `{ w, h, thick:1.6, r:corner radius, color:'#rrggbb' solder-mask colour, silk:'#rrggbb', outline?, standoff:4 }` |
| `mat` | object | no | `{ front:8, back:8, left:14, right:8 }` mm of cutting mat round the board (room for cables) |
| `holes` | `[[x,y,d]]` | yes | mounting holes, centre and drill diameter (3.2 for M3) |
| `silk` | `[[x,y,text,size,rot?]]` | no | silkscreen text, `size` = cap height mm, `rot` deg CCW |
| `traces` | `[[[x,y],…]]` | no | decorative copper traces (drawn under the mask, slightly darker) |
| `parts` | `Part[]` | yes | section 4 |
| `power` | object | yes | section 6 |
| `modes` | object | yes | section 7: built-in demo programs; `mode` names the factory one |
| `mode` | string | yes | default mode key |
| `faults` | `string[]` | no | extra fault ids this board offers in its picker (section 6.4); the generic ones are always on |
| `circuits` | object | no | lesson circuits on the breadboard (section 9) |
| `circuit` | string | no | default circuit key |
| `xr` | object | no | see-through: `{ flow:[[netOrRail, [[x,y],…]]], notes:[[partId, 'Text']] }` (section 12) |
| `tags` | `[[partId, dx, dy]]` | no | which parts get surface labels, with the pill's screen offset (px at 585 wide) |
| `variants` | object | no | `{ key:{ name, patch(def) → def } }` for a variant switch (R4 Minima/WiFi, Pico/Pico W/Pico 2, Pi 4/Pi 5) |
| `variant` | string | no | default variant key |
| `height` | number | no | headroom above the PCB for framing, default 14 |
| `pal` | string | no | Colorfigures palette key for accents, default `'cobalt'` |
| `logic` | number | no | I/O voltage for the circuit solver, default 5 (3.3 for ESP32, Pico, Nucleo, micro:bit, Pi, FPGA boards) |
| `bootloader` | object | no | what a reset does before the program restarts: `{ led:'L', flashes:3, hz:8, wait:1 }` (Optiboot flashes L three times and listens ~1 s); omit for boards that start at once |

## 4. Parts

### 4.1 Part fields

| Field | Type | Meaning |
|---|---|---|
| `id` | string | designator, unique on the board |
| `kind` | string | a registered kind (section 5) |
| `name` | string | English full name: "ATmega328P microcontroller" |
| `short` | string | label pill text, upper case for Latin: "MCU" |
| `at` | `[x,y]` | centre of the body in board mm |
| `size` | `[l,w]` | body length along the part's own x axis and width along its y axis, before `rot` |
| `h` | number | body height mm above its base |
| `rot` | number | degrees CCW seen from above, default 0 (any angle; the Uno's 16U2 is 45) |
| `side` | `'top'\|'bottom'` | default `'top'` |
| `z` | number | base height above the PCB (a chip in a socket: the socket height) |
| `group` | `'smd'\|'low'\|'tall'\|'last'` | build group; default from the kind (section 5) |
| `polar` | `{ fault:'pop'\|'hot'\|'dark', rail?:'VIN', opts?:['notch left','notch right'] }` | the part can be placed reversed; orient 0 = as on the real board; `opts` are the two chip labels; `rail`: it only faults while that rail is live (a cap on VIN stays quiet on USB power) |
| `fixed` | true | part of the PCB itself (antenna trace, edge fingers, touch logo): cannot be removed |
| `inSocket` | partId | goes into that socket (group `'last'`) |
| `led` | object | for LED kinds: `{ color:'#rrggbb', net?:'D13', rail?:'5V', serial?:'rx'\|'tx', invert?:true, via?:['U5','RN2'] }` what lights it; `via` = parts that must be in and soldered for it to light (driver, resistor) |
| `control` | object | for on-board controls: `{ type:'button'\|'slide'\|'touch', action:'reset'\|'boot'\|'bootsel'\|'input', net?:'BTN_A', positions?:['ON','OFF'], active?:0\|1 }` |
| `pins` | `string[]` | for headers and pin rows: net name per pin, pin 1 first (section 4.2); `null` = no pin fitted, `''` = pin with no net |
| `labels` | `string[]` | silkscreen text per pin when it differs from the net (`'~11'`, `'TX→1'`) |
| `nets` | `{ pin: net }` | for ICs: which pins carry which nets (for the schematic and see-through current flow) |
| `label` | string | text printed on the body (`'ATMEGA328P'`, `'16.000'`); `\|` breaks lines |
| (kind params) | | per kind, section 5 |

### 4.2 Headers and pins

Header pins are numbered from pin 1 along the header's own x axis; two-row headers number 1, 2 across, then 3, 4…
(the usual IDC order) unless `order:'rows'` (all of row 1, then row 2). `mirror: true` runs the columns the other
way (pin 1 at the +x end), for headers whose pin 1 sits top-right (the Uno's ICSP headers). Pin `n`'s board
position is derived:

```
row header, rot 0:  pin n at  at.x − (cols−1)·pitch/2 + (n−1)·pitch,  at.y
two rows (idc):     col = floor((n−1)/2), row = (n−1) % 2;  y = at.y + pitch/2 − row·pitch
```

`rot` turns the whole header, pins included. Every header pin becomes a board pin `H1.5` with `net`, `label`, `at`.
`rs: 200` on a header part (ohms) is the series resistor the board puts on each of its signal pins (the Basys 3 Pmod
lines): a breadboard wire on one of its pins meets the pin's net through it. Ground and rail pins are left direct.
The engine also indexes pins by net name: `D13` resolves to the only pin on net D13; for nets with several pins
(`GND`, `5V`) a circuit wire may name the pin id (`H3.6`) or just the net (the engine picks the pin nearest the
breadboard).

### 4.3 Groups and the build order

| Group | What | When it can go on |
|---|---|---|
| `smd` | every surface-mount part | by "Pick & place SMD", all at once (0.22 s apart), then reflow 1.3 s |
| `low` | low through-hole parts: sockets, tact switches, small headers, crystals in HC-49 | after reflow |
| `tall` | tall through-hole parts: connectors, female headers, electrolytics, barrel jack | after every placed `low` part is in |
| `last` | goes on after soldering: a chip into its socket, a jumper cap, a plug-in module | after "Solder joints" |

## 5. Kinds (on-board drawings)

### 5.1 Library (in `bench-kinds.js`)

Default group in brackets. `label` and `color` are optional on all; `color` is a `#rrggbb` body colour.

| Kind | Draws | Params |
|---|---|---|
| `qfp` [smd] | quad flat pack, gull-wing leads on 4 sides, pin-1 dot | `n` leads per side (8), `label` |
| `qfn` [smd] | leadless quad, pads on 4 sides | `n` pads per side (8), `label` |
| `bga` [smd] | big ball-grid package (FPGA, SoC), optional lid | `label`, `lid:true` (metal lid) |
| `soic` [smd] | 2-sided small outline (SOIC/TSSOP/SOT-23-6) | `n` leads per side (4), `label` |
| `sot23` [smd] | 3-lead small transistor/regulator | `label` |
| `sot223` [smd] | regulator with tab | `label` |
| `sod` [smd] | small diode (SOD-123/SMA); cathode band at −x end | `label` |
| `chip` [smd] | one 0402/0603/0805/1206 resistor or capacitor | `cap:true` tan ceramic, else black resistor; `label` ('103') |
| `passives` [smd] | a scatter of tiny chips (one selectable part) | `spots:[[x,y,'r'\|'c',rot?]]` in board mm |
| `fuse` [smd] | 1206/1812 polyfuse | |
| `inductor` [smd] | shielded power inductor / ferrite bead | `label` |
| `xtal` [low] | HC-49/S metal can crystal | `label` ('16.000') |
| `xtal-smd` [smd] | 3225/5032 metal-lid crystal | `label` |
| `resonator` [smd] | 3-pad ceramic resonator | `label` |
| `ecap` [tall] | standing electrolytic; minus stripe toward −y at orient 0 | `sleeve:'#rrggbb'` |
| `ecap-smd` [smd] | SMD electrolytic (can on a square base) | |
| `tant` [smd] | tantalum, + band at +x end | |
| `led` [smd] | 0603/0805 SMD LED, lens lights with `led` | |
| `rgb` [smd] | 5050/2020 addressable RGB LED; colour from the run | |
| `dip` [last or low] | DIP chip, notch at −x end at orient 0 | `n` pins per side, `label` |
| `socket` [low] | DIP socket | `n` pins per side |
| `tact` [low] | 6x6 mm through-hole tactile switch; pressable when it has `control` | |
| `button-smd` [smd] | small SMD push button (3x4, 4x4, side-push) | `side:true` |
| `slide` [low] | slide switch, knob position from the control state | `positions` in `control` |
| `male` [low] | pin header, `rows` x `cols` | `rows` 1, `cols` from `pins.length/rows`, `pitch` 2.54, `pinH` 6 (above the plastic), `angle:'right'` for right-angle |
| `female` [tall] | socket header | as `male` |
| `castellated` [fixed] | half-hole edge pads along one edge, numbered | `pitch` 2.54; `pins` |
| `edge` [fixed] | gold edge-connector fingers along the front edge | `fingers:[[x0,x1,net]]` |
| `pads` [fixed] | exposed round test pads / through-hole pad row | `pins`, `pitch`, `d` |
| `usb-b`, `usb-mini`, `usb-micro`, `usb-c`, `usb-a` [tall/smd] | USB receptacles; the opening faces the part's −x end at rot 0 | `plug:true` marks the one the cable goes in |
| `barrel` [tall] | 2.1 mm barrel jack, opening at −x | |
| `module` [smd] | castellated RF module (WROOM): substrate, shield can, PCB antenna at +x end | `label`, `ant` length mm (6) |
| `can` [smd] | plain shield can | `label` |
| `antenna` [fixed] | PCB meander or chip antenna area | `chip:true` for a chip antenna |
| `matrix` [smd] | LED matrix (R4 WiFi 12x8, micro:bit 5x5) lit from the run | `rows`, `cols`, `pitch`, `net:'MATRIX'` |
| `seg7` [tall] | 7-segment display, `digits` wide | `digits` 4, `color` |
| `box` [tall] | generic labelled block: HDMI, RJ45, VGA, audio, JST, FFC, heat sink | `color`, `label`, `face:'-x'\|'+x'\|'-y'\|'+y'` opening side |
| `pad` [fixed] | touch pad / logo (micro:bit) | `shape:'logo'\|'round'`, control for touch |
| `hole` [fixed] | a plated hole ring with a label (micro:bit rings 0/1/2/3V/GND) | `d` |

### 5.2 How the engine uses a kind

```js
SL.bench.kind('qfp', {
  group: 'smd',                  // default build group
  draw(ctx) { … ctx.put(box, svg) … },   // required: the iso drawing
  xr(ctx)  { … },                // optional: see-through internals (die, bond wires, quartz blank)
  pins(part) { return [[x,y], …] },      // optional: pin positions in board mm (headers do this)
});
```

`ctx` (all in board mm unless noted): `p` the part record, `L(a,b,z)` → board `[x,y]` of a point given in the
part's local frame (centre origin, its own x along `size[0]`, rotation applied), `P(x,y,z)` → screen point,
`B(a0,b0,z0,a1,b1,z1)` → a world box for sorting from local extents, `put(box, svg)` adds one depth-sorted item,
`z0` base z, `st`, `lit` 0..1 (LED brightness), `hot`, `pop`, `rev` (placed reversed), `sel` (selected), `k`
(see-through ease 0..1), `T` = `CF_T`, plus drawing helpers `ctx.slab(a0,b0,a1,b1,z0,z1,mat)` (a rotated box),
`ctx.text(a,b,z,str,size)` (text on top, reading along the part's x), `ctx.dot(a,b,z,r,fill)`.

### 5.3 Adding a kind

Only if the library lacks it. Register it at the top of your item file, name it `<board>-<thing>` (`pico-bootsel`),
and draw with `ctx` only. Tell engine:bench in `docs/requests/<label>.md` if it should move into the library.

## 6. Power, run, upload, faults

### 6.1 Sources and rails

```js
power: {
  sources: {                                   // ways to feed the board; the host offers them by key
    usb:  { label: 'USB cable', part: 'J1', plug: 'usb-b', v: 5.0, ilim: 0.5 },
    jack: { label: 'Barrel jack', part: 'J2', plug: 'barrel', v: 9, range: [7, 12], max: 20 },
    vin:  { label: 'VIN pin', pin: 'VIN', v: 9, range: [7, 12], max: 20 },
    pin5: { label: '5V pin', pin: '5V', v: 5, range: [4.75, 5.25], max: 6 },
  },
  default: 'usb',
  rails: {                                     // evaluated in order; a rail = the best of its feeds
    USBVCC: { from: [{ src: 'usb', via: ['J1', 'F1'] }] },
    VIN:    { from: [{ src: 'jack', via: ['J2', 'D1'], drop: 0.7, protect: 'D1' }, { src: 'vin' }] },
    '5V':   { from: [{ rail: 'VIN', via: ['U2'], reg: 5.0, dropout: 1.1, max: 20 },
                     { rail: 'USBVCC', via: ['T1'], drop: 0.05, offIf: ['VIN', '>', 6.6] },
                     { src: 'pin5' }], max: 6 },
    '3V3':  { from: [{ rail: '5V', via: ['U4'], reg: 3.3, dropout: 0.3 }], max: 3.6 },
  },
  mcu:    { part: 'U1', rail: '5V', min: 4.3, needs: ['U1', 'Y2'] },   // runs when rail ≥ min and needs are in
  upload: { source: 'usb', needs: ['U3', 'Y1', 'U1'], tool: 'avrdude' }, // 'avrdude' | 'esptool' | 'uf2' | 'stlink' | 'daplink' | 'vivado' | 'quartus' | 'none'
}
```

A source with `scenario: true` (the Pico's "USB, with a 5 V sensor output on GP17") is a lesson's setup, not a
supply: Break it offers no wrong-voltage or reverse-polarity choice for it. `upload.source` is the supply whose cable
carries uploads; `upload.also: ['usb']` lists more (the ESP32-S3 DevKitC
uploads over its UART port or its native USB port). On any other supply Upload answers "Plug in USB first".

Feed options beyond the example: `burns: 'U1'` names the part a reversed supply on that feed destroys (default the
feed's last `via` part, else the MCU); `ilim: 0.15` marks a current-limited regulator (amps), so a `short:` on that
rail zeroes the rail and the rails fed from it while the rest keeps running (the Uno's LP2985 on 3V3). A source may
also feed several rails at once: `{ label, parts: ['NANO', 'BATT'], feeds: { VM: 7.4, VCC: 5 } }` (a bench supply;
`wrong-voltage` scales every feed).

A feed is alive when its source is connected (or its upstream rail is alive) and every `via` part is in, soldered,
not reversed and not cold (cold = alive in bursts). Feed voltage: `src.v − drop`, or for a regulator
`min(reg, in − dropout)`. `offIf: [rail, '>', volts]` switches a feed off (the Uno's comparator); `onlyIf` switches
it on only while its condition holds. A condition is `[ref, op, value]` with `op` one of `>`, `<`, `==`, `!=`, and `ref`
a rail (its volts) or `'ctl:<id>'` (a control's position: 0/1 for a slide switch, 1 while a button is held), so a
power switch gates its regulators: `{ rail: 'VU', via: ['IC10'], reg: 1.0, onlyIf: ['ctl:SW16', '==', 1] }`, with
`control: { type: 'slide', start: 1 }` on SW16 so it starts ON (a slide's `start` is its first position). A rail
takes the highest live feed. Above a rail's `max` the parts on it are damaged (fault `wrong-voltage`; the part named as
burnt is the rail's `victim`, else the MCU). `victim: { part: 'C27', fails: 'short' }` is a part that fails short: the
rail and every rail fed from it fall to 0 V, so the board goes dark. `mcu.bootNeeds: ['IC8']` lists parts only the
power-up start reads (an FPGA's configuration flash): without one the board is powered but nothing runs ("nothing
loads at power-up"), until an upload loads a program; the next power cycle needs them again. Below `mcu.min` the MCU
resets (fault `brownout`). When the MCU's supply comes back after a brown-out or a drop to no power, the program
restarts from t = 0 and prints its banner again; a board's `brownoutLine` (the ESP32's "Brownout detector was
triggered") goes out first after a brown-out. LEDs with `led.rail` light when that rail is alive; with `led.net` when the pin is high
(or `invert`: low).

### 6.2 What the user can do (state machine)

```
BARE ─Pick & place SMD─▶ SMD placed ─(reflow 1.3 s)─▶ SMD soldered ─Place low…─▶ ─Place tall…─▶ ─Solder joints─▶
THT soldered ─Place last (chip into socket)─▶ ASSEMBLED ─Plug power─▶ evaluate:
   supply part out or unsoldered          → "No power: <part> is missing"  (nothing lights)
   reversed polar part                     → FAULT pop | hot | dark (stops; unplug to recover)
   rail above its max                      → FAULT wrong-voltage
   mcu rail below min                      → BROWN-OUT (resets every 0.6 s, ON LED dims)
   an mcu.needs part missing               → POWERED, nothing runs (ON lit, no blink)
   otherwise                               → RUNNING the current mode
Upload ▸ mode → UPLOADING 2.2 s (RX/TX flicker per upload tool) → RUNNING the new mode (instant modes switch at once)
Exploded view: unplugs nothing, refuses while powered; lifts smd 4 / low 9 / tall 14 / last 19 mm.
Remove a part (Remove ▸ id) and Leave out (Pick & place skips it): any part not `fixed`, power off.
```

Refusals (exact English, `CF_T` keys):

| When | Message |
|---|---|
| any build action while powered | "Unplug the power first: never work on a live board" |
| any build action in the exploded view | "Close the exploded view first" |
| placing a through-hole part before reflow | "SMD parts first: run pick and place + reflow. The oven would melt plastic parts" |
| a tall part while a low part is still out | "Low parts first: with tall parts on, the board rocks and loose parts fall out when you flip it to solder" |
| a `last` part before soldering | "Solder everything first: this part goes on last" |
| a socketed chip before soldering | "Solder everything first. Never heat a chip sitting in its socket" |
| solder with nothing placed | "Nothing to solder yet: place a part first" |
| upload while unplugged | "Plug in USB first: uploads go over the cable" |
| upload while uploading | "Uploading: wait for it" (the refused pick changes nothing) |
| upload while faulted | "Fix the fault first: unplug, then repair" |
| upload with an `upload.needs` part missing | "Upload failed: <part name> is missing" |
| remove a `fixed` part | "<name> is part of the board itself" |

### 6.3 On-board controls

A part with `control` is pressable in the figure (pointer, keyboard via the bridge `press`/`act`, and the fallback
list) and reports its state:

| `action` | Behaviour |
|---|---|
| `reset` | while held the MCU is in reset (outputs low, LEDs off); on release the mode restarts at t = 0 and the serial banner repeats |
| `boot` | ESP32 BOOT: held while `reset` is released → "download mode" (`st.boot = 'download'`) |
| `bootsel` | Pico BOOTSEL: held while USB is plugged in → mass-storage mode (`st.boot = 'uf2'`); a finished upload reboots into the program and unplugging forgets it |
| `input` | a user input (buttons A/B, Basys 3 switches): its `net` level goes to the host as `inputs.<net>` |

Each control is a toolbar button `ctl-<id>` ("Flip SW0", "Press KEY0"). More than four of one type (slides, or
buttons) fold into one picker, `ctl-slide` "Flip a switch" or `ctl-press` "Press a button", whose choices keep the
`ctl-<id>` ids. Each folded control also keeps a hidden `ctl-<id>` button, so a host or a content step that presses
`ctl-sw0` still reaches it, and `B.choices()` lists it.

Boot straps are data, not controls: `straps: [{ fault, boot, halts?, part?, blocks?: ['upload', 'serial'], msg,
fix }]`. When the program (re)starts (plugged in, RESET released, an upload done, or that strap's fault set on a live
board) the engine latches the first strap whose `fault` is in force, until the next restart. `state.boot` reports its
`boot`. `halts`: the sketch never starts (status `fault`, `fault: { id, kind: 'boot', part, msg, fix }`, no smoke).
`blocks`: the sketch runs, but `upload` is refused with `msg` and its Serial lines stop. Example (Uno R4):

```js
straps: [
  { fault: 'short:MD:GND', boot: 'rom', halts: true, msg: 'BOOT (MD) was low at reset: …', fix: 'Free the BOOT pin and press RESET' },
  { fault: 'short:ESP_DOWNLOAD:GND', boot: 'esp-download', part: 'M1', blocks: ['upload', 'serial'], msg: '…', fix: '…' },
],
```

### 6.4 Faults

Fault ids (strings; the host sets them with `set {fault}`; the figure's "Break it ▾" picker lists them):

| Id | Effect | Message (English) and fix |
|---|---|---|
| `reversed:<part>` | place a polar part the wrong way round; on power-up its `polar.fault`: `pop` (electrolytic vents), `hot` (IC/regulator burns), `dark` (LED stays off) | "<name> is in backwards" · "Unplug, then turn it round" |
| `missing:<part>` | leave the part out | effects follow from the power tree, `mcu.needs`, `upload.needs`, LEDs |
| `cold:<part>` or `cold:<pin>` | cold solder joint: the part (or one header pin) works in bursts, deterministic; a header pin cuts only what plugs into it, so an on-board LED on its net keeps blinking | "Cold joint on <name>: it works, then it doesn't" · "Reflow the joint" |
| `reverse-polarity:<source>` | the supply is connected backwards; a `protect` part blocks it, else the regulator burns | "Reverse polarity: <protect> blocks it, nothing powers up" or "Reverse polarity: <part> burned" · "Swap the leads" |
| `wrong-voltage:<source>:<volts>` | sets that source's voltage (e.g. `wrong-voltage:pin5:12`) | "<volts> V on <label>: <part> is damaged" or "<volts> V is too low: brown-out" · "Use <range> V" |
| `brownout` | a motor on the 5 V pin: the rail sags under load and the MCU resets in a loop | "Brown-out: the motor drags 5 V down and the board resets" · "Power motors separately" |
| `short:<netA>:<netB>` | solder bridge; on a power rail the polyfuse or USB port trips; on a rail fed through an `ilim` regulator only that rail (and its children) drops | "Short between <netA> and <netB>" · "Clear the bridge" |

Break it also offers six `cold:<id>` joints of its own: parts with an LED, a control or a place in `mcu.needs`, a
control and an LED first, then in part order, skipping any id the board's `faults` list already names.

`state.faults` lists every fault in force: the ids set, `missing:<id>` while that part is out, and `reversed:<id>`
while a polar part sits backwards. A board's or bench's own `faults` list may give labels for Break it:
`faults: [['short:5V:GND', 'Solder bridge from 5V to GND'], 'short:3V3:GND']`; an id without one is labelled from its
kind ("Short from 3V3 to GND", "Leave out C5", "9 V on Barrel jack", "Wrong level on GPIO12 at reset").

**Circuit faults** (v8). `missing:<id>` and `reversed:<id>` also act on a part of the breadboard circuit when the board
itself has no part with that id: the circuit is drawn, solved and drawn as a schematic without it (and without the
wires that end on its legs), or turned round (its `reversed` param when the part has one, else its holes in the other
order). A listed fault may carry a third element that edits the circuit while it is on:

```js
faults: [
  ['no-flyback', 'Leave out the flyback diode', { missing: ['D1'] }],
  ['no-ground', 'No common ground', { cut: [['J1.4', 'T-3']] }],            // wires left out, by their two ends
  ['no-base-resistor', 'No base resistor', { missing: ['R1'], wires: [{ from: 'c7', to: 'c11', color: 'orange' }] }],
  ['motor-on-pin', 'Motor straight on pin 9', { holes: { M1: ['d7', 'T-9'] } }],   // a part moved
  ['battery-reversed', 'Battery leads swapped', { reversed: ['BT1'] }],
]
```

Each edit applies where the current circuit has that part or wire, so one fault serves every stage of a bench. What
the fault does electrically is still the bench model's (§11); the edit is what the learner sees on the breadboard.


## 7. Modes (built-in demo programs)

```js
modes: {
  blink: { title: 'Blink', bytes: 924, out: (st, t) => ({ D13: t % 2 < 1 ? 1 : 0 }) },
  hello: { title: 'Serial hello', bytes: 1490, out: () => ({}), serial: (k) => 'hello #' + k, banner: 'ready' },
},
mode: 'blink',
```

`out(st, t)` returns pin levels by net (`0`/`1`, or `0..1` for PWM duty), `t` in seconds since the program started
(virtual, deterministic). `serial(k, st)` is called once per whole second `k` and returns a line or null. `banner`
is printed at every (re)start. When the host drives pins (`set {pins}`) built-in modes pause until it sends
`set {mode}`.

A bench whose modes are positions rather than sketches (jumper or switch settings) names its picker:
`modesLabel: { button: 'Move jumper', stat: 'Jumper' }` replaces "Upload sketch" and the "Program" stat. The
button's id stays `upload`, so content and the host send the same `set {mode}`.

## 8. Breadboard parts (`SL.bench.part(name, def)`)

```js
SL.bench.part('led', {
  name: 'LED',
  legs: ['A', 'K'],                    // leg names, in the order circuits list holes
  span: [1, 1],                        // min, max hole distance between first and last leg (columns)
  params: { color: ['red', 'yellow', 'green', 'blue', 'white'] },
  elec: (p) => ({ type: 'led', vf: { red: 2.0, yellow: 2.1, green: 2.2, blue: 3.0, white: 3.1 }[p.color], imax: 0.02 }),
  draw(ctx) { … },                     // ctx: legs (world points of the holes), p, lit, i (current A), st, P, put
  show: { … },                         // optional: how the part page shows it alone
});
```

`elec` types the solver understands (§9 has what each reports); `elec` may also be an array of them (an RGB LED is
three `led` entries with `ch` and `legs`; a ULN2003 board is four channels of `res`, `npn` and `diode`). `legs` (on
`led`, `res`, `wire`, `diode`) and `npn` `pins` take leg indices or node names: a leg's name, or an inside node the
part lists in `nodes: ['OUT1', 'B1', …]` (numbered after its legs; a wire can't end on one). Any other entry with
`ch` gets its own key, so one channel burns alone, and its `npn` reports inside the part's `driver` entry (§9):

| Type | Fields (defaults) |
|---|---|
| `led` | `vf` (2), `imax` (.02); in an array `ch: 'R'`, `legs: [anode, cathode]` (leg indices) |
| `res` | `ohms`; `open: true` leaves it out |
| `wire` | none |
| `button` | `pressed`, `pairs: [[0, 1], [2, 3]]` (leg indices; each pair is always joined, `pressed` joins the pairs) |
| `pot` | `ohms`, `pos` 0..1 (legs end 1, wiper, end 3), `pmax` (.05 W) |
| `diode` | `imax` (1 A), `isurge` (30 A); 0.7 V + 0.2 Ω when on |
| `npn` | `pins: { B, C, E }` (leg indices), `hfe` (100), `hfr` (5, inverse gain), `vbe` (.7), `vcesat` (.2), `pmax`, `photW`, `tjmax` (150), `icmax` (1), `theta` (200 °C/W) or `model.tj(W)`, `darlington` (a burnt one fails short C-E) |
| `motor` | `ohms`, `vmax` (12), `inductive`, `brushless` + `polar` (a fan that only runs one way); current from `model.steady(v, load)` → `{ rpm, i }`; param `load: 'stalled'` draws V / `ohms` |
| `servo` | legs named `GND`, `V+`, `SIG` (else legs 0, 1, 2), `vmin` (4), `vmax` (6), `period` (.02 s), `iidle`, `imove`, `istall`; angle from `model.angleOf(us)` |
| `sensor` | `model: 'tmp36'`, `supply: [vs, gnd]`, `out`, `vout` (volts it drives), `vmin` (2.7), `vabs` (7), `polar` |
| `buzzer` | `kind: 'passive'` (open at DC) or `'active'` (`imax` .03, `vmin` 3, a polar load) |
| `cap` | open at DC |
| `stepper` | `coils: ['B', 'P', 'Y', 'O']`, `common: 'R'` (leg names), `ohms` (50), `vrated` (5): one coil from the common lead to each coil lead; a coil carrying a fifth of `vrated / ohms` is energised |

All of these carry current. A part whose type the solver doesn't know is drawn and clickable, carries no current,
and falls back to its params; so does a stepper whose plug reaches no driver (it then follows its `in` pins).

A plug into another part: a circuit part with `plug: '<part id>'` joins its legs, in order, to that part's
`socket: [node names]` (the 28BYJ-48's [B, P, Y, O, R] into the ULN2003's [OUT1, OUT2, OUT3, OUT4, VCC]), and draws
its plug at the points that part's `socketAt(p, origin)` gives (`SL.bench.socketOf(id)`). With the socket's part left
out by a fault the plug hangs free.

Optional hooks on a part file:

- `press(p, down)` returns a param patch (or `null`): a pointer press on the part's drawing, or Enter/Space on its
  off-screen button, calls it with `true` and again with `false` on release. The patch goes through `B.bbParams`.
- `steps: { key: [values] }`: the part page's picker values for a range, used before the generic steps.
- `step({ p, st, m }, dt)` runs each frame on the virtual clock after the solver (a servo arm easing to its angle in
  `st.drv[id]`).
- `sound(p, m)` returns `{ hz, loud, how }` (`hz: 0` = silent): see `sound` in §13.
- `legAt(p, origin, i)`: the world point of leg `i` for a part that lies on the mat, so a wire can end on `SRV1.SIG`
  without a hole (the ULN2003 board's `DRV1.IN1`: the top of its header pin).
- `nodes`, `socket`, `socketAt(p, origin)`: inside nodes and the socket another part plugs into (above).
- `foot: [w, d, h]` (mm) or `height`: the mat and headroom grow to fit the part.

`draw(ctx)` gets `{ p, st, legs, holes, origin, pl, m, lit, i, … }`: `p` the circuit entry (its params), `legs` the
world points of its holes (top of the breadboard), `holes` the parsed holes, `origin` the world point of `p.at`
(mat mm in board coordinates, for things that sit on the mat, not in holes) or the first leg, `pl` the placement
(`pl.at(x, y, z)` breadboard mm → world, `pl.zTop`), `m` the solver result for this part (§9), `k` the see-through
ease (0..1) and `solo` (true on the part's own page).
`ctx.label(at, text, on)` queues a see-through label on the world point `at` (`text` the English `CF_T` key, `on`
the accent colour): the engine lays every label of the frame out last, in two columns beside the parts that asked,
so pills never overlap or sit under the drawing. Call it instead of the core's `tag()` (whose fixed offsets
overlapped on part pages); a part only labels while selected or on its own page, with `k > .5`.

Part pages (`public/figures/parts/<id>.html`, built from `figures/parts/<id>.js`): `fig: 'P2'` is the figure number
in the title; `show: { breadboard, parts, wires }` is the circuit the page shows, or `show: { breadboard, holes,
params }` for one part (default: one part with `example` params in row e from column 5 on a mini breadboard).
Every param becomes a picker: a list (`color: [...]`, `turned: [false, true]`) offers its values, a numeric range
(`ohms: [1, 1e7]`) the common values inside it (100 Ω to 100 kΩ), a range named `pressed`, `on`, `closed` or `down`
its two ends, a wide range (`lux: [0, 100000]`) decades, any other range five even steps. A pick changes the
selected part, or the first one. `paramNames: { key: 'Button name' }` names a picker (default: the key with a capital).
Module parts (a sensor or driver board that plugs into the breadboard) list `legs` in header order and set `pinZ`
(mm from the breadboard top to the pin tips) so wires can end on `M1.<leg>`.

## 9. Lesson circuits

```js
circuits: {
  blink: {
    title: 'Blink an LED',
    breadboard: 'half',                        // 'half' 30 columns + rails | 'full' 63 | 'mini' 17, no rails | null
    parts: [
      { id: 'R1', part: 'resistor', ohms: 220, holes: ['b10', 'b14'] },
      { id: 'LED1', part: 'led', color: 'red', holes: ['c14', 'c15'] },     // [anode, cathode]
    ],
    wires: [
      { from: 'D13', to: 'a10', color: 'orange' },
      { from: 'GND', to: 'a15', color: 'black' },
    ],
  },
},
circuit: 'blink',
```

- Holes: terminal strips `a1`..`j30` (rows a-e and f-j, columns 1..N; a-e of one column are one net, so are f-j);
  power rails `T+12`, `T-12` (top pair), `B+12`, `B-12` (bottom pair), the number is the nearest column.
- Wire ends: a board pin (`D13`, `H3.6`), a hole, or a module pin (`M1.VCC`). Colours: `red`, `black`, `orange`,
  `yellow`, `green`, `blue`, `white`, `purple`, `brown`, `grey`.
- Part params can be changed by the host: `set {params: {R1: {ohms: 1000}, LED1: {color: 'green'}}}`.
- The engine solves the whole circuit (`bench-solve.js`): nodes are strips, rails, board nets and the legs of parts on
  the mat; a pin is a 5 V or 3.3 V source behind 25 Ω, a rail one behind 0.5 Ω. PWM is solved per time slice (all
  PWM pins start their period together) and averaged; a `tones` pin is a 50 % square wave. So a missing resistor, a
  reversed LED, a transistor wired the wrong way or a wire in the wrong strip shows the real result, and every pin and
  input net reports its average volts in `state.volts` (for the host's `analogRead` and `digitalRead`).
- What each part reports in `state.meas[id]` (every entry has `kind`; parts no source reaches report nothing, LEDs
  always report). Burnt is sticky until the page reloads, with a toast saying why:

  | `kind` | Fields | `state` |
  |---|---|---|
  | `led` | `i_mA`, `r` (series ohms), `net`; RGB adds `ch: { R: { i_mA, state }, … }` | `ok`, `off`, `burnt` (peak above 2.5 x `imax`), `reverse`, `open` |
  | `diode` | `i_mA`, `v` | `ok`, `off`, `block` (reverse biased), `clamp` (catching a switched motor's current), `burnt` |
  | `npn` | `ib_mA`, `ic_mA`, `vce`, `p_W`, `tj_C` | `on` (saturated), `linear`, `off`, `reverse` (C and E swapped, or `p.reversed`), `overdrive` (the base carries the load: more than `ibmax`, default `icmax` / 10, and more than the collector), `hot`, `burnt` |
  | `motor` | `v` (signed average), `i_mA`, `rpm` | `ok`, `off`, `stall`, `over`, `spike` (inductive, switched, no flyback diode), `reverse`, `burnt` |
  | `servo` | `us`, `angle` (while pulses arrive), `i_mA` | `ok`, `off`, `jitter` (supply below `vmin`), `over`, `stop` (pulse past the ends) |
  | `sensor` | `v` (out), `vs` (supply) | `ok`, `off`, `low`, `hot` (reversed), `dead` |
  | `pot` | `v` (wiper) | `ok`, `hot`, `burnt` (2 s hot) |
  | `buzzer` | `v`, `f` (Hz on its pin), `i_mA` (active) | `ok`, `off`, `reverse` |
  | `button` | `closed` | `ok`, `shorted` (a switched pair already joined by the strips) |
  | `driver` | `ch: { 1: { state, ib_mA, ic_mA, vce, p_W, tj_C }, … }` (each channel as an `npn`), `i_mA` (all outputs) | the worst channel: `burnt`, `hot`, `reverse`, `on`, `linear`, `off` |
  | `stepper` | `coils: { B, P, Y, O }` (true = energised), `i_mA` | `ok` (a coil on), `off` |

- The circuit's total current counts against the source: above the source's `ilim` (USB 0.5 A) the board browns out
  for 0.6 s after the overload stops, `why` "Brown-out: the circuit draws {n} mA, more than {src} gives ({max} mA)".
- The board sits left of the breadboard (`board: 'left'`, default) or behind it (`board: 'back'`).
- A part without holes (a motor, a battery box) gives `at: [x, y]` in board mm (negative x is left of the board,
  above `pcb.w` is right of it) and draws from `ctx.origin`.
- Wire ends may also be a module leg: `M1.VCC` is the hole under leg `VCC` of circuit part `M1`.

### 9.1 Props

A circuit can stand the thing its lesson's world input is about on the mat beside it: the lamp shining on the LDR,
the box in front of the HC-SR04. Props are scenery. The solver never sees them, they report nothing in `meas`, and
they draw from `figures/engine/bench-props.js` (`// @cf use engine/bench-props.js` in the figure).

```js
light: {
  parts: [{ id: 'LDR1', part: 'ldr', holes: ['e20', 'e23'] }, ...],
  props: [{ id: 'LAMP', prop: 'desk-lamp', at: [140, 82], aim: 'LDR1' }],
},
```

- `at: [x, y]` is board mm, as for a part without holes; `aim` is a circuit part or another prop, and the prop turns
  to face it (without `aim`, `rot` in degrees, 0 = +x). Put it on the side the aim faces: the HC-SR04's
  transducers face −y, so its obstacle stands at negative y.
- Extra fields are the prop's params, and the host changes them like a part's: `set {params: {OBST: {kind: 'car',
  value: 40}}}`. A value outside the prop's list or range is ignored. `value` is the world quantity the lesson's
  input sets; without it the prop shows its everyday state.

  | `prop` | Params | What it shows |
  |---|---|---|
  | `desk-lamp` | `value` lux 0..100000 | an anglepoise lamp, shade on the aim; lit with a light cone above 0 lux |
  | `hairdryer` | `value` °C -40..125 | a dryer on its handle, nozzle at the aim; warm air streaks above 30 °C |
  | `obstacle` | `kind` box, car, ball, wall; `value` cm 2..450 | the thing in front of the aim: at its `at` for 30 cm, nearer down to the breadboard's edge at 2 cm, out to 1.8 times its distance at 450 cm (`travel`) |
  | `watering-can` | none | a can tipped toward the aim (the soil sensor's pot) |
  | `strength-meter` | none | a card dial on the aim servo's case (its part def's `shaft`), the horn is the needle, a bell rings at 180° |
  | `weights` | none | 50, 100, 200 and 500 g brass weights on cork coasters |

- A prop is pressable like a part: the scene wraps it in `data-act="part"` with `data-id`/`data-label`, the bridge
  sends the same `part` event, and `set {select: 'LAMP'}` selects it. It counts toward the mat's extent, so the
  breadboard view frames it.
- A new prop: `SL.bench.prop(name, { name, foot: [w, d, h], params, defaults, draw(ctx) })`. `ctx` has `p` (the
  circuit entry with params applied), `origin` (the mat point under `at`), `aim` (the aim's world point or null),
  `at(x, y)` (board mm to the mat), `breadboard` (its footprint on the mat, world `[x0, y0, x1, y1]`, for a prop that
  must stay off it), `aimPart` (the aim's circuit entry with its params) and `m` (its `meas`), `k`,
  `sel`, `st`, `label`, and `put(box, svg)` for each drawn piece. A def's `travel: k` says the prop moves along its
  aim out to k times its distance from it; the mat grows to hold it there. An unknown prop is noted once and skipped; an
  unknown aim is noted once and the prop faces `rot`.
- The stepper's prize wheel is the stepper part's own `wheel: 'wheel'` param, and a soil sensor with `at` brings its
  own pot: neither is a prop.

## 10. Views and sheets

`st.view`: `'board'` (the iso PCB), `'breadboard'` (iso breadboard scene with the circuit), `'schematic'` (flat,
hand-inked sheet of the circuit: the board as a block with the used pins, symbols, wires), `'power'` (flat sheet of
the power tree from `power.rails`). See-through (`xr`) and exploded (`exploded`) apply to the iso views. Sheets are
drawn in the same ink, wobble and paper as the figure, every symbol is clickable and selects the same part id as in
3D, and live pin values and LED states are shown on both.

## 11. Robotics benches (`SL.bench.bench(def)`) and modules

```js
SL.bench.bench({
  id: 'motor-driver',                  // the id in src/content/ids.ts
  name: 'TB6612FNG motor driver', sub: '…',
  board: 'uno-r3',                     // a registered board (include its file in "needs"), shown on the mat
  modules: [{ id: 'M1', module: 'tb6612', holes: 'e10' }],   // a module on the breadboard from hole e10 along the row
  periph: [{ id: 'MOT1', kind: 'tt-motor', at: [120, 40] }],  // things on the mat, mat mm
  circuit: { breadboard: 'half', parts: [...], wires: [...] },
  modes: { … }, mode: '…',
  tasks: [{ id: 'fwd50', title: 'Run motor A forward at 50 %', check: (st) => st.out.PWMA === 0.5 && … }],
});
```

A module is defined like a board (`SL.bench.module`) with `pins` on a `male` header (`pins:['GND','VCC',…]`); in a
bench it inherits its pins as `M1.<net>`.

**The model hook.** A bench says what its circuit does in its own words, instead of a general solver:

```js
model: (st, dt) => ({                      // every frame after the outputs (dt 0 on a state change)
  readings: { M1: { rpm: 120, v: 6.1 } },  // state.readings (numbers rounded); a mat part `MOTA` draws from readings.MOTA
  status: 'motor A forward',               // state.benchStatus and the stats panel
  stats: [['Motor A', '6.1 V'], ['I', 0.42]],   // more lines on the stats panel while powered
  meas: { Q1: { state: 'on', ic_mA: 180 } },    // merged over the breadboard solver's state.meas
  report: { levels: { AIN1: 1, AIN2: 0 } },     // extra top-level state keys (never the engine's own keys)
  flow: { VM: true },                      // lights xr.flow paths and mat wires on these nets
  accent: ['MOTA'],                        // rings these parts or mat items
})
```

Inputs: `st.o.pins` (the program's pin levels or the host's `set {pins}`), `st.ev.rails`, `st.meas`, `st.t`,
`st.mode`, `st.matStep`, `st.power`. Things on the mat: `periph: [{ id, board | part, at, step? }]`, `wires: [{ from,
to, color, step? }]` and `matSteps` (set out one step at a time with the `mat` button or `set {matStep}`).

What the engine does with a bench today (v3): `board` names a registered board or module (its file goes in a
`// @cf use boards/uno-r3.js` line); the bench's own fields override the board's, its `circuit` object becomes the
breadboard circuit, its `modes` (or the board's) run, its `faults` add to the board's, and the page opens on the
breadboard view. `tasks[].check(st, o)` runs on every report (`o` = the outputs: `o.pins`, `o.leds`) and the state
report carries `tasks: {id: true|false}`. A bench without a board is a breadboard on the mat. Not built yet:
`modules:` and `periph:` placement (put a module on the breadboard as a module part, §8, and things on the mat as
parts with `at`, §9, until the engine places them).

## 12. See-through, exploded, labels

- See-through (`xr` switch): the PCB ghosts, every IC shows its die and bond wires, crystals their quartz blank,
  regulators their pass element, and `xr.flow` paths animate dots along copper while the rail or pin is live
  (`[['5V', [[x,y],…]], ['D13', […]]]`). `xr.notes` adds callouts.
- Exploded: groups lift 4 / 9 / 14 / 19 mm, the PCB stays.
- Labels: `tags` parts get pills; the host can draw them from the `labels` event.

## 13. Bridge: what the figure accepts and reports

Host → figure `set {state: patch}`; the engine applies only these keys, each validated. One patch is one moment:
`power: null` first, then the board changes (`exploded`, `build`, `remove`, `restore`, `fault`, `matStep`, `circuit`,
`params`, `tones`, `inputs`, `press`), then `power: <source>`, then `view`, `select`, `serial`. So
`{ power: 'usb', fault: 'missing:Y2' }` unplugs to take Y2 out and plugs back in, and `{ power: null, build: 'bare' }`
unplugs before it strips. Send `power` with every `fault` whose consequence needs the board powered:

| Key | Type | Effect |
|---|---|---|
| `pins` | `{net: 0..1}` | pin levels or PWM duty from the interpreter (≤ 30 Hz); pauses built-in modes |
| `mode` | mode key | run a built-in demo program |
| `power` | source key or `null` | connect a supply / unplug |
| `fault` | fault id or `null` | replace the fault in force with this one (section 6.4) / clear all, parts back in and turned right |
| `view` | `'board'\|'breadboard'\|'schematic'\|'power'`, also `'iso'` (= board), `'see-through'`, `'exploded'` (board view with that on) | switch sheet |
| `exploded` | boolean | exploded view |
| `circuit` | circuit key or `null` | which lesson circuit the breadboard shows |
| `params` | `{partId: {…}}` | circuit part or prop params (§9, §9.1) |
| `select` | part or prop id, or `null` | select (same as a click) |
| `build` | `'bare'\|'assembled'` | jump the build state |
| `remove`, `restore` | part id | take a part off / put it back |
| `press` | `{id, down}` | press or release an on-board control |
| `serial` | string | the host printed a line: TX LED blips |
| `inputs` | `{net: 0\|1}` or `{partId: 0\|1\|position}` | host-side inputs mirrored on the drawing: keyed by an input control's `net`, the level that net reads (the part shows pressed when it is the control's `active` level); keyed by part id, the control's state as `controls` reports it |
| `tones` | `{net: Hz}` | pins the sketch drives with `tone()`; a net left out or 0 is silent; send `{}` when the last stops |

Figure → host `state` (discrete values only):

```
{ id, view, exploded, build: 'bare'|'smd'|'reflowed'|'tht'|'soldered'|'assembled', power: null|source,
  status: 'off'|'no-power'|'powered'|'running'|'uploading'|'brownout'|'fault', mode, ext: bool,
  rails: {name: volts (0.1 V)}, fault: null|{id, kind, part, msg, fix}, faults: [...ids], missing: [...ids],
  selected, controls: {partId: 0|1|position}, boot, leds: {partId: 0|1}, circuit,
  meas: {partId: {kind, state, …}} (§9 table), serial: {n, line},
  why: null|string, sfx: null|name, tasks: {taskId: bool},
  volts: {net: volts}, sound: null|{part, hz, loud, how},     // volts and sound only while a circuit is shown
  inputs: {net: 0|1} }                                         // only on a board with `input` controls
```

`inputs` gives each `input` control's net the level it reads now: `control.active` (default 1) while the button is
held or the slide is off its first position, the other level otherwise. A micro:bit shows `{ P5: 1, P11: 1, P201: 1 }`
at rest and `P5: 0` while button A is held; the host drives those nets in the running program.

`sound` is the loudest part whose `sound(p, m)` gives a pitch (`how`: `tone`, `rough` for an active buzzer driven by
`tone()`); a buzzer on the wrong pin, backwards or missing gives none. Whenever it changes the figure also sends a
bridge event `tone` `{ part, hz, loud, how }` (`hz: 0`, `part: null` = silence), so the host can play it.

Part presses arrive as bridge `part` events: `act: 'part'` with `id` = part id, or `act: 'ctl'` for controls,
`act: 'hole'` with `id` = hole on the breadboard, `act: 'pin'` with `id` = pin id.

## 14. Verification checklist (per figure)

Run these from `/Users/amar/Codes/ak/simlab`, look at every picture yourself, and fix what is wrong before you
report. A figure is done when every line holds.

**Facts and data**

- [ ] Every position comes from a source you can name in a comment at the top of the file (the maker's CAD files,
  a dimensioned drawing, the fact sheet). No part is placed by eye.
- [ ] Every part on the real board is in `parts`, with a `name` a beginner understands ("16 MHz crystal for the USB
  chip", not "Y1"), and nothing is drawn that the board does not have.
- [ ] Header `pins` nets and `labels` match the silkscreen of the real board pin for pin.
- [ ] `power` reproduces the real tree: every source, every regulator with its real output and dropout, every
  protection part, the brown-out level of the MCU, and what the upload path needs.
- [ ] `faults` and `polar` parts give the real consequence (what a reversed tantalum or a 12 V supply on 5 V does).

**Build and errors**

- [ ] `python3 -I figures/tools/cfbuild.py boards/<id>` prints `built …` and no warning.
- [ ] `document.body.dataset.errors` is empty in every view (cfshoot fails when it is not).

**Pictures** (`python3 -I figures/tools/cfshoot.py boards/<id> --press "…" --at 1200,4200 --out <scratch>`)

- [ ] `angle-*`: the board reads the right way round from every side (silk text not mirrored, USB and jack where
  they are on the real board), nothing floats or sinks into the PCB, no part pokes through another.
- [ ] `xr-*`: see-through shows the dies, the quartz, the flow dots on live copper only, and the callouts stay
  inside the frame.
- [ ] `exploded-*`: the groups lift in build order, every part stays above its own footprint.
- [ ] `press-*`: every run you pass ends in the state you expect (status, rails and LEDs in the stats column).
- [ ] `phone-xr` and `zoom-xr`: the figure fits a phone, buttons wrap, labels become the list.
- [ ] `embed`: the bridge reports `ready`, `state`, `labels` and your button events.
- [ ] The other views by URL: `?view=breadboard`, `?view=schematic`, `?view=power`, `?build=bare`,
  `?fault=<id>`, `?power=<source>`, `?mode=<key>`; the sheets sit beside the page's buttons, not under them.

**Behaviour** (click it yourself, or `#wait=` shots with the parameters above)

- [ ] Every button and every on-board control does what its label says; a refused step says why and how to fix it.
- [ ] Every part can be selected by a click, by Tab + Enter, and from the host (`select`), and the same id lights
  in 3D and on both sheets.
- [ ] Every part can be removed and put back, and removing it has its real effect (no regulator, no 5 V).
- [ ] Every fault in `faultChoices` is reachable from Break it and from `?fault=`, and Fix it clears it.
- [ ] The lesson circuit gives the textbook result (Blink: 220 Ω, red LED, about 12 mA on 5 V).

**Words**

- [ ] Every string the figure shows is written in English inside `T()` or a `name`/`label`/`title` field, so
  `CF_T` can translate it (D5: `src/i18n/figures/<lang>.json`, keyed by the English text).

## 15. Worked example: the Arduino Uno R3

`figures/boards/uno-r3.js` (about 150 lines) is the pattern to copy. Its parts are placed at the part centres of
Arduino's own Eagle board file (`UNO-TH_Rev3e.brd`, CC BY-SA), converted to board mm with the origin at the
bottom-left corner of the PCB.

```js
// @cf title Arduino Uno R3
// @cf use engine/bench.list
SL.bench.board({
  id: 'uno-r3', fig: '01', name: 'Arduino Uno R3', sub: 'ATmega328P at 16 MHz, 5 V logic, USB through an ATmega16U2',
  pcb: { w: 68.58, h: 53.34, thick: 1.6, color: '#2f9aa0', silk: '#f4f6ef', standoff: 4, outline: [ … ] },
  mat: { front: 9, back: 9, left: 30, right: 8 },             // room on the mat for the USB plug and cable
  holes: [[13.97, 2.54, 3.2], [15.24, 50.8, 3.2], [66.04, 7.62, 3.2], [66.04, 35.56, 3.2]],
  bootloader: { led: 'L', flashes: 3, hz: 8, wait: 1 },       // Optiboot: three flashes, then ~1 s listening
  parts: [ … ],
  power: { … }, mode: 'blink', modes: { … }, faults: ['short:5V:GND'], xr: { … }, tags: [ … ],
  circuit: 'blink', circuits: { blink: { … } },
});
```

Parts, one of each shape:

```js
{ id: 'ZU4', kind: 'dip', name: 'ATmega328P microcontroller', short: 'MCU', at: [46.355, 16.383], rot: 180, n: 14,
  h: 3.4, z: 3, inSocket: 'SK1', … },                          // sits 3 mm up, in its socket; text upside down as printed
{ id: 'PC1', kind: 'ecap-smd', name: '47 µF capacitor on VIN', at: [25.527, 9.144], rot: 180, label: '47',
  polar: { fault: 'pop', opts: [ … ] } },                      // placing it backwards is a choice; powered, it pops
{ id: 'L', kind: 'led', name: 'L LED (pin 13)', at: [27.94, 42.164],
  led: { color: '#f2b12e', net: 'D13', via: ['U5', 'RN2'] } }, // the op-amp buffers D13; RN2 is its resistor
{ id: 'RESET', kind: 'tact', name: 'RESET button', at: [6.35, 49.403], size: [6, 6], h: 3.5, group: 'smd',
  control: { type: 'button', action: 'reset' } },             // press it on the board or with Press RESET
{ id: 'IOL', kind: 'female', name: 'Digital header D0-D7', at: [54.61, 50.8], h: 8.5,
  pins: ['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'], labels: ['7', '~6', '~5', '4', '~3', '2', 'TX→1', 'RX←0'] },
```

The power tree is the real one: USB through the polyfuse; the barrel jack through the M7 diode (which also blocks
reverse polarity) to VIN; VIN through the NCP1117 to 5 V; USB onto 5 V through the FDN340P switch, which the
LMV358 comparator opens when VIN is above 6.6 V; 5 V through the LP2985 to 3.3 V.

```js
rails: {
  USBVCC: { from: [{ src: 'usb', via: ['X2', 'F1'] }] },
  VIN: { from: [{ src: 'jack', via: ['X1', 'D1'], drop: .7, protect: 'D1' }, { src: 'vin' }] },
  '5V': { from: [{ rail: 'VIN', via: ['U1'], reg: 5, dropout: 1.1, max: 20 },
                 { rail: 'USBVCC', via: ['T1', 'U5'], drop: .05, offIf: ['VIN', '>', 6.6] }, { src: 'pin5' }], max: 6 },
  '3V3': { from: [{ rail: '5V', via: ['U2'], reg: 3.3, dropout: .3 }], max: 3.6 },
},
mcu: { part: 'ZU4', rail: '5V', min: 2.7, needs: ['ZU4', 'SK1', 'Y2', 'RN1'] },  // BOD 2.7 V; resonator; reset pull-up
upload: { source: 'usb', needs: ['U3', 'Y1', 'RN3', 'C5', 'ZU4'], tool: 'avrdude' },
```

Modes are tiny pure functions of the virtual clock; `fade13` shows why `analogWrite` on pin 13 only gives on/off:

```js
blink: { title: 'Blink', bytes: 924, out: (st, t) => ({ D13: blink(t, 1, 1) }) },
fade13: { title: 'analogWrite on pin 13 (no PWM there)', bytes: 1132,
          out: (st, t) => ({ D13: Math.floor((t % 2.56) / 2.56 * 256) >= 128 ? 1 : 0 }) },
```

The Blink lesson circuit: D13 → orange wire → a10; 220 Ω from b10 to b14; red LED anode c14, cathode c15; black
wire from a15 to GND. The solver gives (5 V − 2.0 V) / (220 Ω + 25 Ω) ≈ 12.2 mA, which the LED tag and the
schematic show.

Checks run on it (v3): `cfbuild` clean; `cfshoot` 29 shots and the embed check pass with the presses
`Press RESET@400` and `Upload sketch>Serial hello@900`; by URL: board, breadboard (LED1 12.2 mA), schematic,
power tree on USB and on the jack (VIN 8.30 V, USBVCC off), `?fault=reversed:PC1` (fault, 47 µF pops),
`?fault=reverse-polarity:jack&power=jack` (M7 blocks it, nothing powers up), `?exploded=1&power=0`,
`?xr=1&labels=1`; every view with an empty error list.
