# Requests from item:nano (Arduino Nano figure + content)

Figure: `figures/boards/nano.js`, built page `public/figures/boards/nano.html`. Content: `src/content/boards/nano.ts`.

## For engine:bench (figures/engine/bench*.js)

1. **No standoffs on the Nano.** `sceneBoard()` (bench.js) and the breadboard scene (bench-bb.js) draw a gold standoff
   post under every mounting hole. The genuine Nano has none: it stands on its header pins (docs/facts/nano.md §10,
   "Corrections to the originals"). The Nano def sets `pcb.standoffs: false`; please skip the posts when it is false.
2. **Board plugged into the breadboard (`circuit.board: 'in'`).** The Nano (and the Pico) straddle the centre channel
   in real life: J1 in one row group, J2 in the other, 0.6 in apart (for example J2 in row d and J1 in row h, columns
   5-19). A placement like `{ board: 'in', at: { 'J2.15': 'd5' } }` that puts the board's pins into holes, joins each
   pin's strip to its net in the solver, and lets wires and parts use the free holes of those strips would make the
   Nano lessons look like every real Nano tutorial. Until then the Nano circuits use the default `board: 'left'`.
3. **Modules in board lesson circuits.** The Nano's I2C lesson circuit (`i2c`) lists
   `modules: [{ id: 'M1', module: 'mpu6050', holes: 'h3' }]` in the bench format (§11). Please draw and solve modules
   in board circuits too, with `M1.<net>` usable as a wire end.
4. **Footprints of removed bottom-side parts.** `drawPCB()` skips footprints for `side: 'bottom'` parts, so a bare
   Nano shows no header holes and no pads for the FT232, LDO, diode and passives. Please draw them (through-hole pads
   on both faces).
5. **Exploded view with bottom-side parts.** Bottom parts explode downward (correct), but the Nano's header pins
   already touch the mat, so exploded headers sink into the mat. Raising the PCB by the largest bottom lift while
   exploded would fix it.
6. **Wire end height.** Wires start at `part.h + part.z − 2` above the board. The Nano's headers hang under the board
   and only 1.2 mm stubs show on top, so `nano-header` sets `h: 3.2` to land wires on the stub. A kind hook
   (`wireZ(p)`) would be cleaner.
7. **Rail over-voltage victim.** A rail above its `max` always damages `mcu.part`. On the Nano the 3V3 rail belongs to
   the FT232 (IC1), so `nano.js` puts `max` on the feed instead. A `rail.victim` field would make it explicit.
8. If useful, move `nano-header` (a header fitted from underneath, pins down, stubs and fillets on top) into the
   library as `male` with `under: true`; the Pico and other breadboard boards have the same build.

## For interpreters (src/lib/interp)

1. The `nano` profile inherits `adcVref: 5` from the Uno. On USB the Nano's AVCC is VBUS minus the SS1P3L drop,
   about 4.65 V (docs/facts/nano.md §3.2). Ratiometric sensors (pots, dividers) are unaffected; a fixed voltage into
   A0 reads about 7 % high on USB. Low priority.
2. My test (`src/content/boards/nano.test.ts`) needs the headless lesson runner (source, language, target,
   world.script, runMs → RunTrace) and `checks.ts`. It uses them as soon as they are exported.
