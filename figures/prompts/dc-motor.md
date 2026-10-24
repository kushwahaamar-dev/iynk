# Fig. P14 — Small DC motor (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **"130-size" brushed DC hobby motor** (Mabuchi FA-130 class,
3-6 V) lying on a small wooden motor block on the pale green cutting mat, with a yellow two-blade propeller on its
shaft and a flat blue cast shadow. Real size: bright steel can 20 mm across with two flats 15 mm apart and 22 mm
long, a black end cap with two solder tabs and a red "+", a 2 mm shaft out of a small bushing, a 40 mm propeller.
A red (+) and a black (-) lead arc over to two breadboard holes.

What it does:

- It follows the volts across it: armature 1.43 Ω, back-EMF 0.306 mV per rpm (9100 rpm no-load at 3 V), no-load
  current 0.12 A plus about 0.08 A of propeller load at full speed, so about 0.2 A at 4 V (5 V less a TIP120's
  drop). Below about 1 V average (25 % PWM) brush and bearing stiction keep it still; it stops below 0.6 V. While it
  spins the blades blur into a disc with motion arcs; the label shows volts and milliamps.
- **Load ▾**: propeller, free shaft, or stalled (a held shaft draws V / 1.43 Ω, 2.9 A at 4.1 V, far past the Uno's
  500 mA USB fuse: heat lines rise from the end cap).
- **Show ▾** (part page): stopped, half (PWM 50 %), full, reversed (leads swapped: it turns the other way),
  stalled, burnt (above 9 V the winding overheats and burns open: smoke).
- In lesson 10 it hangs off a TIP120 with a 1N4007 flyback diode across it; without the diode the switch-off spike
  is reported (and the Uno can reset).
- **See-through**: the can ghosts to show the two arc ferrite magnets, the 3-pole wound armature turning with the
  shaft, the copper commutator and the two metal-leaf brushes. Labels: Ferrite magnet, Armature coils, Brushes on
  the commutator.

Look: Colorfigures ink and paper, steel and mustard, flat banded shading. Facts: docs/facts/la-components.md §13.
