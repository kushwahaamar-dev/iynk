# Fig. P24 — Pocket multimeter (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **yellow pocket digital multimeter** lying face up on the pale
green cutting mat with a flat blue cast shadow: 54 x 30 x 9 mm, a dark face with a green-grey 3½-digit LCD at the far
end, a rotary range dial in the middle (OFF, 2V, 20V, 200m, 10A) and three jacks in a row at the near end: 10A, COM
(black) and VΩmA (red). A black lead runs from COM and a red lead from VΩmA, each sagging over to a probe that stands
on its steel tip, leaning back toward the meter.

What it does:

- The bench that uses it reports `m = { state, text, unit, range }` by part id: the digits exactly as the meter shows
  them (the bench formats them: a 3½-digit meter never shows more than it has), the unit, and the range the dial is
  on. States: ok, off (dial at OFF, blank LCD), ol (over range: a lone 1 at the left, as real meters show it).
- Legs [COM, V] are the probe tips; `tipZ` lifts them so a bench can touch a trimpot slot or a screw terminal that
  stands above the mat. The A4988 bench uses it to read Vref on the trimpot; the LM2596 bench reads the buck output.
- **Show ▾** (part page): reading 5 V, reading 0.54 V, over range, off.

Look: Colorfigures ink and paper, yellow body in flat bands, heavy silhouette, finer inner lines.
