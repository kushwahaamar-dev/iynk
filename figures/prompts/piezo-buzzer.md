# Piezo buzzer (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **12 mm piezo buzzer**, 9.5 mm tall, plugged into a white mini
breadboard (legs 7.6 mm apart, three columns: e7 and e10) on a pale green cutting mat, with a flat blue cast shadow.

- A black round can with a central sound hole and a + by the + leg. The passive kind (the default) shows a thin
  green PCB edge underneath; the active kind has a black sealed underside and a white "REMOVE SEAL / AFTER WASHING"
  sticker on top.
- Passive: a transducer only, a brass disc with a piezo-ceramic layer. It needs a square wave, `tone(pin, f)`, plays
  any pitch, loudest near its resonance (about 4 kHz), and only clicks once on a steady HIGH. Active: an oscillator
  inside, so a steady HIGH makes its own tone (about 2.3 kHz); driven with `tone()` it sounds rough; it is polar
  (longer leg +) and silent backwards. On the Uno `tone()` takes Timer2, so PWM on pins 3 and 11 stops while a tone
  plays, and only one tone plays at a time.

What it does:

- **Tone (Hz) ▾** (C4 262 to C5 523, G6 1568, 2300, 4000) and a press on the part, which plays A4 (passive) or
  switches it on (active) while held. Blue rings rise from the sound hole, closer together for a higher pitch and
  jagged for a rough buzz; the label names the note: "BZ1 · 440 Hz (A4)".
- **Type ▾** passive / active, **Steady HIGH ▾** (a passive one clicks once, "use tone()"), **Put in backwards ▾**
  (an active one stays silent).
- **See-through** clears the can: the brass disc flexing with the drive (slowed down so it can be seen), the white
  ceramic layer with its silver electrode and its two wires, and on the active kind the small green oscillator
  board with its transistor. Labels: Brass disc, Piezo ceramic, Sound hole, Oscillator.

Look: warm paper, heavy ink outline with finer inner lines, flat bands, mustard accent, the five palettes.
