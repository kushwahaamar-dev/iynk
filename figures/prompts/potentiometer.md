# Potentiometer (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **B10K rotary potentiometer**, the 9 mm kit part (RK09 class),
plugged into three neighbouring holes (e8, e9, e10) of a white mini breadboard on a pale green cutting mat, with a
flat blue cast shadow.

- A blue 9.8 mm square plastic body about 6 mm tall under a metal cover, a metal bushing, and a black knurled knob
  9.2 mm across with a white indicator line. Three ink ticks on the cover mark the ends and the middle of its 300°
  travel.
- Three tinned legs in a row on 2.5 mm pitch, leaving the front of the body: with the legs toward you and the shaft
  up, pin 1 (left, the anticlockwise end), W (the wiper, middle), pin 3 (right, the clockwise end).
- "B" means linear taper: 10 kΩ ±20 % end to end; the wiper splits it into ohms × pos (1-W) and ohms × (1 − pos)
  (W-3). With pin 1 on GND and pin 3 on 5 V, the wiper reads 5 V × pos and `analogRead()` gives 1023 × pos.

What it does:

- **Knob position ▾** (0, 25, 50, 75, 100 %) and a press on the knob, which turns it an eighth of its travel
  clockwise, then back to the start: the indicator swings through −150° to +150°.
- **Value ▾** (1 k, 10 k, 100 k).
- **See-through** clears the body: the tan phenolic wafer with a dark horseshoe carbon track (300°, open toward the
  legs), its two end terminals running down to pins 1 and 3, the steel collector ring that carries the wiper to the
  middle leg, and the sprung wiper blade on the shaft. The track from pin 1 to the wiper is tinted red, from the
  wiper to pin 3 blue, so the two resistances read at a glance. Labels: Carbon track, Wiper, Ring to pin W.
- Failure: wired with 5 V on one end and GND on the wiper, turning toward that end shorts 5 V through a sliver of
  track (rated about 0.05 W): the body turns red, the wiper glows and it smokes ("hot: 5 V shorted through the
  track", then "track burnt").

Look: warm paper, heavy ink outline with finer inner lines, flat bands, mustard accent, the five palettes.
