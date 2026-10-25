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
