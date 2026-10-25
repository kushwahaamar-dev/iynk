# P2-microbit: what is still short of perfect

The micro:bit V2 meets the §4 board bar (figure with board, breadboard, schematic and power views; English prose;
five MicroPython lessons passing the app check path; ten failures that change the figure; an assembly sequence that
completes; a quiz per lesson; a parts list; the prompt record). These are the gaps left, with who can close them.

1. **The LED matrix stays dark during a lesson run.** The interpreter keeps the matrix in its world snapshot but
   `Session.pins()` never sends it. The figure already lights LEDs from nets `MX0`-`MX24`.
   → `P2-microbit-to-P2-fpga-matrix-nets.md`.
2. **Pressing A, B or the logo on the drawing does not reach the program.** The bench engine reports `controls` but
   not `inputs.<net>`, which `run.ts` waits for. The World panel works. Same gap on Basys 3 and Nucleo.
   → `P2-microbit-to-P2-engine-b-input-nets.md`.
3. **No sound in the trace; missing `radio`, `i2c`, `compass`, `microphone`, `speaker`.** The touch-tune lesson checks
   the count and the code, not the tone, for that reason, and the protocol lesson reads the accelerometer on the
   internal I²C bus instead of the fact sheet's radio lesson. → `P2-microbit-to-P2-pi-microbit-runtime.md`.
4. **Build it for real lists only the board, the cable and the AAA pack.** → `P2-microbit-to-driver-bom-kit.md`.
5. **`power.idleMa` is 30 mA**, the power-supply page's worst-case allowance for the on-board peripherals. No
   official measured idle current for V2 was found (tech.microbit.org, the power-management spec, a web search).
6. **Figure positions not measured:** X2 (the interface chip's crystal) and D57 (the second battery diode) are left
   out; the antenna area is the fact sheet's estimate; the small passives and transistors sit at their designator
   labels (±1.5 mm). See `docs/facts/microbit-v2.md` section 10.
7. **Figure strings:** the new figure's mode titles, part names and source labels are not yet in
   `src/i18n/figure-keys.json`; phase 3 regenerates it with `node scripts/figure-strings.mjs` before translating.
