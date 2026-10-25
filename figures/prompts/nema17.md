# Fig. P23 — NEMA 17 stepper motor (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **NEMA 17 hybrid stepper** standing on its rear end cap on the
pale green cutting mat, shaft up, with a flat blue cast shadow. Modelled on the SOYO SY42STH38-1684A (Pololu #2267):
a 42.3 mm square body with chamfered corners, 38 mm long, an 8 mm silver aluminium cap at each end round a black
laminated stator stack, four M3 holes on a 31 mm square in the top flange, a 22 mm pilot boss and a 5 mm steel shaft
24 mm long. A strip of red tape stuck to the shaft is the pointer: it turns with the shaft so you can count turns.
Four leads leave a black boot on the rear cap, black, green, red and blue, each ending in a female jumper housing.

What it does:

- Black and green are one coil (the A4988's 2B and 2A), red and blue the other (1A and 1B). 1.8° a step, 200 full
  steps a turn, 1.65 Ω and 3.2 mH a coil, 1.68 A rated, 36 N·cm holding torque.
- The bench that drives it reports `m = { state, deg, ia, ib, rpm }` by part id: the shaft angle, the two coil
  currents (signed) and the speed. States: off, hold (coils on, still), ok (turning), skip (losing steps), buzz (coil
  pairs mixed: it shakes in place), free (driver outputs off), unplugged (the leads lie loose on the mat), hot (heat
  shimmer off the stack).
- See-through: the eight stator poles (coil A on 1-3-5-7, coil B on 2-4-6-8) glow with their coil current round the
  toothed rotor (two 50-tooth cups: 50 x 4 = 200 steps), which turns with the shaft.
- **Show ▾** (part page): idle, holding, turning, microstepping, missing steps, coils mixed.
- `legZ` lifts the lead ends so a bench can plug them onto header pins that stand above the mat.

Look: Colorfigures ink and paper, flat light/mid/dark bands, heavy silhouette, finer inner lines.
