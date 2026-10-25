# Fig. P21 — 4 x AA battery holder (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of an **open black 4 x AA holder** lying on the pale green cutting mat
with a flat blue cast shadow: a 62 x 58 x 16 mm moulded tray, four cells side by side and alternating so they chain
in series, steel springs and contacts in the end walls, low side walls and ribs between the cells. Alkaline cells in
a dark wrap printed "AA 1.5V". A red (+) and a black (-) lead come out of one end wall and arch over to two
breadboard holes (the power rails of the transistor-switch bench).

What it does:

- Its voltage is what the bench's model reports (`m = { state, v, i_mA }` by part id): fresh alkaline cells give
  about 1.6 V each (6.4 V), 1.5 V nominal (6 V), and each has 0.15-0.3 Ω inside, so the pack sags under a motor's
  start current.
- States: ok; reverse (the leads on the rails the wrong way round: heat shimmer over the tray); li-ion (four 14500
  Li-ion cells in the same holder, the size of an AA but 3.7-4.2 V each, 16.8 V: lighter wraps printed
  "14500 3.7V" and heat shimmer).
- **Show ▾** (part page): fresh, running, li-ion.

Look: Colorfigures ink and paper, black plastic in flat bands, steel contacts, heavy silhouette, finer inner lines.
Facts: Energizer E91 data sheet (open-circuit voltage and internal resistance), docs/facts/la-components.md.
