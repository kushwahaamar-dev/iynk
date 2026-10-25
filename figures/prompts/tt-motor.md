# Fig. P20 — TT gear motor (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of the **yellow "TT" gear motor** every robot kit uses, standing on a
small wooden block on the pale green cutting mat so its wheel turns in the air, with a flat blue cast shadow. Real
size: the yellow 1:48 plastic gearbox 45 x 18.8 x 22.5 mm, a silver 130-size motor can (20 mm across, flats 15 mm
apart) sticking out of its back with two solder tabs, the double-D shaft 11 mm from the gearbox's front end carrying a
65 mm wheel: black rubber tyre 26 mm wide on a yellow six-window rim. A red (+) and a black (-) lead run from the tabs
and end in two breadboard holes, or on the mat when a bench wires them itself.

What it does:

- The wheel turns at the speed and in the direction the bench's model reports (`m = { state, v, i_mA, rpm }` by part
  id): about 220 rpm and 160 mA at 6 V turning freely, slower on less, backwards on a negative voltage.
- `model.steady(v)` is shared by every motor bench: winding 4 Ω, back-EMF 24.4 mV per wheel rpm, a running current
  of 130-160 mA that rises with speed; it does not start below 1 V and stops below 0.6 V. Held still it draws
  v / 4 Ω, 1.5 A at 6 V.
- States: off, ok, stall (wheel held), over (far too much voltage, it races), spike (switched off with no flyback
  diode): the last three put heat shimmer over the can; burnt: a grey can, a dark tyre and wisps of smoke, dead for
  good. The label names the state with its current, volts or rpm.
- **Show ▾** (part page): stopped, half, full, reversed, stalled, burnt.
- **See-through**: the gearbox ghosts to show the nylon gear train turning.

Look: Colorfigures ink and paper, yellow gearbox in flat light / mid / dark bands, heavy silhouette, finer inner lines.
Facts: docs/facts/la-components.md §13 (Adafruit 3777 measurements).
