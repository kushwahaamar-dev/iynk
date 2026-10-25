# Fig. P22 — 2S LiPo battery (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **2S lithium-polymer pack** lying on the pale green cutting mat
with a flat blue cast shadow: 70 x 35 x 18 mm in blue shrink wrap with a cream label band printed "2S 1000mAh" and
"7.4V LIPO". The thick red (+) and black (-) main leads come out of one end, with a small white JST-XH balance plug on
three thin wires beside them. The main leads end on the bench's power terminal (the TB6612FNG's VM and GND, the
L298N's +12V and GND).

What it does:

- Its voltage is what the bench's model reports (`m = { state, v, i_mA }` by part id): 8.4 V full, 7.4 V nominal,
  6.0 V empty (3.0 V a cell is the floor; below that the cells are damaged), about 0.1 Ω inside so it sags a little
  under the motors.
- States: ok; reverse (plugged in backwards: no protection on the driver boards, the pack dumps current into their
  diodes, heat shimmer over the pack); low (below 6.4 V under load: the logic regulator drops out).
- **Show ▾** (part page): full, nominal, low.

Look: Colorfigures ink and paper, blue wrap in flat bands, heavy silhouette, finer inner lines.
