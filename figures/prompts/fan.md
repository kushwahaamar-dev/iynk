# Fig. P15 — 5 V cooling fan (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **40 x 40 x 10 mm 5 V brushless axial fan** standing on its
frame edge on the pale green cutting mat, blowing along its axis, with a flat blue cast shadow. Square black frame
with a 38 mm round duct and four M3 holes on 32 mm centres, seven dark blades on an 18 mm hub with a cream sticker
"DC 5V 0.10A", three struts at the back, a red (+) and a black (-) lead out of the lower corner to two breadboard
holes. Blue airflow arrows stream out of the front while it spins.

What it does:

- Brushless: a Hall sensor and a driver IC in the hub switch the stator coils, so polarity matters (backwards it
  does not spin; the usual driver has reverse protection) and PWM is a chopped supply: below about 2.5 V average it
  stalls. Modelled as 0.10 A and 6000 rpm at 5 V (typical of 4010 5 V fans: Delta BFB0405HHA-A 0.16 A, Qualtek
  FAD1-04010BHLW11 0.07 A, Wakefield DC0401005U2B-2T0 0.20 A and 8000 rpm), speed rising with the average voltage.
  Above 6.5 V the driver IC fails.
- In lesson 11 a TIP120 switches it from D6 when the TMP36 reads above the limit; it needs a flyback diode too.
- **Show ▾** (part page): stopped, half, full, reversed (no spin), burnt.
- **See-through**: the hub ghosts to show four copper stator coils, the round green driver board with its Hall
  sensor and driver chip. Labels: Stator coils, Hall sensor + driver IC.

Look: Colorfigures ink and paper, charcoal frame, cobalt airflow, flat banded shading. Facts:
docs/facts/la-components.md §9, §11, §13 and the distributor listings named above.
