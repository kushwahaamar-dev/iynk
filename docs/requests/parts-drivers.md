# Requests from parts:drivers (tip120, npn-2n2222, diode-1n4007, dc-motor, fan, servo-sg90, stepper-28byj48)

Files: `figures/parts/{tip120,npn-2n2222,diode-1n4007,dc-motor,fan,servo-sg90,stepper-28byj48}.js`. Each part
declares its electrical model in `elec(p)` and pure helper functions in `def.model`, so the solver can use them
without copying numbers. Until the solver handles these types, each part draws a sensible state from `ctx.m` when
the solver gives one, else from its own fallback (below), else from its `demo` param (part pages).

## 1. engine:bench, `figures/engine/bench-bb.js`: solver types for these parts

What: teach `solve()` the types below. Why: lesson 10 (motor), lesson 11 (fan), lesson 12/15 (servo), lesson 13
(stepper) and Robotics Fig 03 (transistor-switch) need them; today they are open circuits (FIGURES-BENCH §8 v3).

- `npn` (tip120, npn-2n2222): `elec(p).pins = {B, C, E}` gives the hole index of each terminal (already swapped
  for `reversed` and, on the 2N2222, for `pinout` EBC/CBE). Base path: pin source → resistors → B → E → GND with a
  drop of `model.vbe(ic)` (or `elec.vbe`); IB = (Vpin − VBE) / (R + 25 Ω). Collector path: the load from a rail
  into C; `model.lowSide(vcc, rLoad, ib)` returns `{ic, vce, sat}` (IC = min(hFE·IB, what the load allows), VCE ≥
  `model.vcesat(ic)`). Report `m = {state, ib_mA, ic_mA, vce, p_W}`; state `on` (saturated), `linear` (IB too
  small), `hot` (p_W > 1.5 W TIP120 / > 0.5 W 2N2222), `burnt` (TJ = `model.tj(p_W)` past `elec.tjmax`, or IC far
  above `elec.icmax`; make it stick like a burnt LED), `reverse` (C and E swapped: treat hFE as about 5),
  `overdrive` (the pin's strip is C and the load is on B).
- `diode` (diode-1n4007): forward drop `model.vf(i)` (SPICE fit), block when reversed. States `ok`, `off`,
  `block` (it is what stops a load's current), `clamp` (a diode across an inductive load, band to the + side,
  while that load is switched by PWM), `burnt` (average > `elec.imax` 1 A or surge > 30 A).
- `motor` (dc-motor, fan): a load between its two legs. dc-motor: `model.steady(v, load)` gives `{rpm, i}`
  (armature 1.43 Ω, back-EMF, no-load 0.12 A); fan: `model.steady(v)`; both have `vstart`/`vstop` and `vmax`.
  For PWM, use v = (rail − VCE(sat)) × duty. Report `m = {state, v, i_mA}` with v the average volts from + to −;
  states `ok`, `off`, `stall` (dc-motor param `load: 'stalled'`: I = V/1.43 Ω, which should trip the Uno's 500 mA
  USB fuse and brown the board out), `over` (v > vmax), `burnt`, `spike` (switched by a transistor with no diode
  across it: `elec.inductive`; ideally also the Uno reset that la-components.md §29 describes), `reverse` (fan only:
  backwards, no spin).
- `servo` (servo-sg90): signal = the duty of its SIG net; pulse µs = duty × 20000; angle = `model.angleOf(us)`.
  Supply on V+; report `m = {state, us, angle, i_mA}`; `jitter` below 4 V on V+, `stop` for pulses outside
  500-2400 µs, `off` with no pulses. Its current (8 mA holding, 200 mA moving, 700 mA stalled) belongs on the 5 V
  rail budget (several servos on the Uno 5 V → brown-out).
- `stepper` (stepper-28byj48): give `m.coils = {B, P, Y, O}` (true = energised, i.e. that ULN2003 output is low)
  from the ULN2003 module's outputs; the part turns its rotor itself (`model.field`, 2037.8864 full steps a turn).

## 2. engine:bench, `figures/engine/bench-bb.js`: view bounds and part pages for parts on the mat

- Breadboard-view `bounds()` (and the mat drawn by `scene`) only cover the board and the breadboard, so a mat part
  (`at`) is clipped or sits on the edge. My parts declare `foot: [length, width, height]` mm (servo 32 x 12 x 31,
  stepper 42 x 32 x 36) and the others are: dc-motor 46 x 40 x 44 (with the propeller), fan 10 x 40 x 40.
  Please grow the mat and the bounds to include every circuit part's `at` ± its foot (rotated by `p.rot`).
- `B.mountPart` (part pages) uses a fixed 8 mm mat, so the motor, fan, servo and stepper land on the mini
  breadboard's corner. With the bounds fix, please honour `at` in `show` circuits (I will then give each a `show`
  with the part on the mat and its leads in the breadboard), or let `show` carry `mat: {front, back, left, right}`.
- Wire ends on a mat part's leg (`SV1.SIG`): the servo defines `legAt(p, origin, i)` → world point of leg i when it
  has no holes (its plug lying on the mat). Could `legHole`/the wire `end()` fall back to `def.legAt` when the part
  has no holes? Lesson 12 wires the servo lead straight to D9 / 5V / GND.
- `draw(ctx)`: please pass the see-through ease as `ctx.k` (my parts fall back to `st.xr`).
- Per-part motion: my motors keep their speed/angle in `st.drv[partId]`, integrated from `st.t` deltas inside
  `draw`. If you add a `def.step(ctx, dt)` hook in `bbStep`, I will move it there.

## 3. Owner of `src/i18n/figures/<lang>.json` (D5)

Add these figure strings (keyed by the English text; keep `{id}`, `{n}`, `{v}`, `{w}` as they are):

```json
[
"TIP120 transistor", "2N2222 transistor", "1N4007 diode", "DC motor", "Cooling fan", "SG90 servo", "28BYJ-48 stepper",
"Put in backwards", "Show", "Pinout", "Type", "Load", "Angle", "On the shaft", "Stepping", "Pin order in code",
"off", "switching 200 mA", "overheating (2 A, no heatsink)", "burnt", "switching 100 mA", "half on: hot (150 mA at 4 V)",
"conducting 200 mA", "blocking", "clamping a motor spike", "stopped", "half", "full", "reversed", "stalled",
"prop", "free", "hold 90°", "hold 0°", "hold 180°", "past the stop", "low supply", "idle", "turning", "too fast",
"wrong pin order", "pointer", "wheel", "wave",
"{id} · burnt", "{id} · hot: {w} W", "{id} · C and E swapped", "{id} · base on the motor side", "{id} · base on the load side",
"{id} · {n} mA", "{id} · blocking", "{id} · clamping the motor spike", "{id} · {v} V · {n} mA", "{id} · burnt out",
"{id} · stalled: {n} mA", "{id} · {v} V: too much", "{id} · no flyback diode", "{id} · backwards: no spin",
"{id} · {n} rpm", "{id} · pushing its end stop", "{id} · jitters: supply too low", "{id} · no pulses", "{id} · {n}°",
"{id} · too fast: it hums and stalls", "{id} · wrong coil order: it jitters",
"Silicon PN chip", "Cathode band", "Q1 driver transistor", "Q2 output transistor", "Tab = collector", "Base bond wire",
"Silicon die on the collector lead", "Gold bond wires", "Ferrite magnet", "Armature coils", "Brushes on the commutator",
"Stator coils", "Hall sensor + driver IC", "DC motor", "Nylon gear train", "Position pot (5 kΩ)", "Control board",
"Winding O–P", "Winding Y–B", "32-step magnet rotor", "Gears 63.68 : 1"
]
```

## 4. Board and bench agents using these parts (uno-r3 lessons 10-13 and 15, Robotics Fig 03 and Fig 08)

- Legs: tip120 `[B, C, E]` (c13, c14, c15 in lesson 10/11), npn-2n2222 `[1, 2, 3]` with `pinout` 'EBC' (PN2222A,
  default) or 'CBE' (P2N2222A), diode-1n4007 `[A, K]` (band = K: put K on the + supply strip, A on the collector
  strip), dc-motor and fan `[+, -]` (give `at` on the mat and two holes for the lead ends), servo-sg90
  `[GND, V+, SIG]` (three holes for the plug, or `at` alone), stepper-28byj48 `[B, P, Y, O, R]` (`at`, and `plug:
  [x, y]` in board mm where the ULN2003 socket is).
- Until the solver does it (§1): dc-motor/fan take `drive: 'D6'` (+ `supply`, `drop`) and follow that pin's PWM
  through a low-side switch; servo-sg90 reads `sig` (default 'D9') as duty × 20 ms; stepper-28byj48 reads `in`
  (default ['D8', 'D9', 'D10', 'D11'] = IN1..IN4) through the ULN2003, or the host's `steps`/`rate`/`seq`/`order`
  params (set {params}) when the interpreter runs faster than the 30 Hz bridge.
- Leave mat room (`mat.front`, `mat.left`…) for the motor (46 x 40 mm with its propeller), the fan, the servo and
  the stepper until §2 is done.
