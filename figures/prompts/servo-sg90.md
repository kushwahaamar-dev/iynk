# Fig. P18 — SG90 micro servo (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **TowerPro SG90 micro servo** standing on the pale green
cutting mat, output shaft up, with a white one-arm horn and a flat blue cast shadow. Real size: translucent-blue
case 22.2 x 11.8 mm and 22.7 mm tall, mounting ears 32 mm across with their holes, the round gear tower over one
end and the splined shaft at 31 mm; "SG90 9g servo" on the side. Its lead (brown GND, red +V in the middle, orange
signal) runs to a black 3-pin JR plug at 2.54 mm.

What it does:

- A pulse every 20 ms sets the angle: 500-2400 µs = 0-180° (1.5 ms is the centre; the Arduino Servo library
  sends 544-2400 µs for write(0..180)); dead band 10 µs; it turns at 0.1 s per 60° (4.8 V), so the arm eases to
  each new angle; 1.8 kgf·cm.
- **Angle ▾** sets the arm; in a lesson it follows its signal pin (D9) as duty x 20 ms.
- **Show ▾** (part page): hold 0°, 90°, 180°; past the stop (pulses beyond the end: it buzzes against its stop and
  draws about 700 mA stall current: red buzz marks); low supply (a sagging 5 V rail below about 4 V: it jitters and
  can reset the Uno); burnt.
- **See-through**: the case ghosts to show the small DC motor, the four cream nylon spur gears stepping down to the
  output shaft (turning as the arm moves), the 5 kΩ position potentiometer under the shaft with its wiper, and the
  green control board. Labels: DC motor, Nylon gear train, Position pot (5 kΩ), Control board.

Look: Colorfigures ink and paper, cobalt case, white horn, flat banded shading. Facts:
docs/facts/la-components.md §14 (TowerPro SG90 sheet).
