# Push button (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **6 x 6 mm through-hole tactile push button** (Omron B3F class,
the common kit part) plugged into a white mini breadboard (17 columns, rows a-j, 2.54 mm pitch) on a pale green
cutting mat, with a flat blue cast shadow.

- The body is a black 6 x 6 x 3.4 mm block under a thin stainless frame with four dimples and two clip tabs folded
  down the sides. A round 3.5 mm plunger stands 1.35 mm above the frame (black, or a coloured cap: red, yellow,
  green, blue, white).
- Four tinned legs leave the two sides that face across the breadboard's centre trench. Omron numbers them 1-4:
  1-2 are always joined, 3-4 are always joined, and pressing joins the two pairs. The joined pairs face each other
  across the 6.5 mm direction, so the button straddles the trench (legs bent out to 7.62 mm) and the switched pair,
  4.5 mm apart on one side, is bent to two columns: holes e8, f8, e10, f10. Pressing joins column 8 to column 10.

What it does:

- **Pressed ▾** (no / yes) and a press on the part itself: the plunger travels its real 0.25 mm and an amber ring
  lights round it.
- **Plunger colour ▾** swaps the cap.
- **See-through** clears the body: underneath are the copper outer ring (pins 1-2), the centre contact (pins 3-4)
  and the stainless snap dome over them. Pressed, the dome flattens onto the centre and an amber dashed path shows
  current crossing from the ring to the centre. Labels: Snap dome, Ring: pins 1-2, Centre: pins 3-4.
- In a lesson circuit the label reads "SW1 · pressed" or "released"; a button turned 90° on one side of the trench
  puts the switched pair in one strip and reads "always closed: turn it 90°", which the solver works out from the
  holes. Contacts rated 50 mA at 24 V; bounce up to 5 ms, so sketches debounce.

Look: warm paper, heavy ink outline with finer inner lines, flat light/mid/dark bands, mustard accent, the five
Colorfigures palettes, a dimmed paper plate in dark mode.
