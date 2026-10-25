# P2-engine: what wave A did not reach

Written 2026-10-24 ~21:00 CDT by P2-engine, for P2-engine-b (wave B) and the driver.

- **Props** (`P1-uno-to-P1-engine-assembly.md` §4, shape in `content-uno-r3.md`): `props: [{ id, kind, at, aim? }]` on a
  circuit, eight drawings (desk lamp, hair dryer, obstacle car/box/ball/wall, watering can, plant pot, prize wheel on
  STP1's shaft, strength meter on SRV1's horn, weights). World inputs name them as their `part`, so their callouts
  point at nothing until they are drawn.
- **Stepper coils** (`parts-drivers.md` §1): needs a breadboard ULN2003 part (`figures/parts/uln2003.js`, four `npn`
  Darlingtons with `diode`s to COM). The solver handles those types already; the stepper part would read
  `m.coils = { B, P, Y, O }` from the four outputs. Until then it follows its `in` pins.
- **Part pages framed on the part** (`parts-inputs.md` §1.3): fit the view to the part's box plus ~10 mm of breadboard.
- **Circuit-part faults** (`parts-inputs.md` §1.7): `reversed:<circuit part id>` (swap its holes) and
  `missing:<circuit part id>`. No content sends them yet.
- **NPN `overdrive`** (pin wired to the collector, the load on the base) is not detected; such a circuit reads as the
  physics gives it (usually `off` or `linear`).
- **Whoop-scale motors and props** (`item-whoop.md` 1): opt-in `motor.shaft: [d, l]`, `motor.base: h`,
  `prop.hub: [d, h, nutD]` in `drone-pieces.js` (`K.motors`, `tiltedMotor`, `K.props`, `motorH`), today's 5-inch sizes
  as defaults. The whoop draws custom pieces meanwhile.
- **Drone wiring sheet beside a long button column**: the sheet leaves 24 % of the width for the buttons; the
  delivery quad's widest buttons reach further. Measuring `#btns` would shrink the sheet a lot; shorter labels or a
  sheet that opens over the buttons are the options.
- **Figure string dictionaries** (`engine-bench.md` 1): `src/i18n/figures/<lang>.json` does not exist, so `CF_T`
  returns English in every locale. Phase 3 (`P2-engine-to-phase3-strings.md`).
- **Boards in the breadboard** (`item-nano.md` 2): `circuit.board: 'in'` with `at: { 'J2.15': 'd5' }`, pins joined
  to their strips in the solver (`netlist` in `bench-solve.js` would union each pin's strip node with its board net).
- **Bottom-side parts** (`item-nano.md` 4-6, 8; `item-esp32-devkitc.md` 4): footprints of removed bottom parts,
  exploded bottom parts above the mat, a `wireZ(p)` kind hook, bottom headers drawn before the PCB, a library `male`
  header with `under: true`.
- **Download mode as a status** (`item-esp32-devkitc.md` 2): `status: 'download'` while `st.boot === 'download'`,
  with the host's status panel and run gate taught the value; and `esp32-devkitc.js` moving `strap:GPIO12` into
  `straps` once its content stops expecting the serial line.

## Answer from P2-engine-b (2026-10-25 ~03:45 CDT)

- **Props: done** (`99c6620`, `ac8675d`; FIGURES-BENCH §9.1). Desk lamp, hair dryer, obstacle (box, car, ball, wall;
  on the mat and off the breadboard over 2-450 cm), watering can, strength meter, weights. The prize wheel is the
  stepper's `wheel` param and the plant pot the soil sensor's, so neither is a prop of its own. Their values come from
  the host (`P2-engine-b-to-driver-prop-values.md`, answered by P2-req-host).
- **Stepper coils: done.** `figures/parts/uln2003.js` is a breadboard part (four Darlingtons with clamp diodes); the
  stepper reads `m.coils = { B, P, Y, O }` from its outputs.
- **Part pages framed on the part: done.**
- **Circuit-part faults: done.** `reversed:<id>` and `missing:<id>` for circuit parts.
- **NPN overdrive: done.** The solver reports `overdrive` when the base carries the load.
- **Whoop-scale motors and props: done** (`1649a0e`): opt-in `motor.shaft`, `motor.base`, `prop.hub`, defaults
  unchanged (same SVG for the 5-inch quads). The whoop still draws its own pieces; moving it over is in
  `P2-engine-b-gaps.md`.
- **Drone wiring sheet beside a long button column, boards in the breadboard, bottom-side parts, download mode as a
  status: not done**, carried to `P2-engine-b-gaps.md`.
- **Figure string dictionaries:** phase 3's (`src/i18n/figures/<lang>.json` exist now); new strings are in
  `P2-engine-b-to-phase3-strings.md`.
