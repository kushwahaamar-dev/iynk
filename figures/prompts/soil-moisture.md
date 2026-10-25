# Capacitive soil moisture sensor v1.2 (Colorfigures prompt)

Two figures share this prompt: the module on its own (`figures/modules/soil-moisture.js`) and the breadboard part that
lesson circuits use (`figures/parts/soil-moisture.js`, in the Uno R3's "Smart plant" circuit as SOIL1). Facts in
`docs/facts/la-components.md` §16; the layout is the common one read from product photos, so the size is ±2 mm.

Make a colourful, hand-inked isometric figure of the black **capacitive soil moisture sensor v1.2**: a 98 x 23 mm
FR-4 probe, 1.6 mm thick, square at the top end and pointed at the tip, white silkscreen ("Capacitive Soil Moisture
Sensor v1.2", "AOUT VCC GND" by the socket, "MAX" by a white line across the board 30 mm from the top), with:

- a white 3-pin JST-PH (2.0 mm) socket at the top end, opening up, and its cable plug: yellow AOUT, red VCC and
  black GND leads that run off the end of the mat;
- the electronics above the line: the TLC555 timer (SOIC-8, pin 1 dot bottom left), a 662K SOT-23 3.3 V regulator
  and its capacitor, the 0603 timer resistor and capacitor, the series resistor to the pad, the peak-detector diode,
  the output hold capacitor and the 1 MΩ bleed resistor printed "105", joined by copper traces;
- below the line the copper pad under the mask, a darker shape that follows the probe's point. No bare metal
  touches the soil, so it does not corrode.

On the module page it lies flat on a pale green mat (mustard palette). As a breadboard part it stands upright in a
terracotta pot of soil on the mat, pushed in to the white line, and its three-wire cable arches to three black
header plugs in breadboard holes (a5, a6, a7 on the part page: AOUT, VCC, GND).

What it does (module page):

- **Power ▾**: 5 V or 3.3 V from the board (3.3-5.5 V, 5 mA), or Unplug. The 662K runs the timer at 3.3 V (about
  3.05 V from a 3.3 V supply).
- **Upload sketch ▾** picks where the probe is, instantly: Plant pot (the default: the soil dries for 16 s, then is
  watered for 4 s, over and over), Dry air, Dry soil, Wet soil, In water. Powered, a wash of soil (darker as it gets
  wetter, with crumbs) or blue water covers the probe up to the MAX line. Once a second the host's serial monitor
  gets "AOUT 1.50 V · analogRead 306 · 92 %": about 2.6 V in dry air (0 %) down to about 1.4 V in water (100 %),
  wetter reads lower.
- **See-through** shows the field lines reaching from the pad into whatever surrounds it, and current dots along
  VCC, 3V3 and AOUT. Labels: 555 OSCILLATOR ~1.5 MHZ, PAD + SOIL = A CAPACITOR, PEAK DETECTOR, BLEED: LETS IT FALL.
- **Strip to bare PCB, Pick & place SMD, Place a part ▾, Solder joints, Remove a part ▾**: the engine's build order.
  Without the 1 MΩ bleed resistor the reading can only rise: it sticks at the driest value it has seen until the
  power is cycled.
- **Break it ▾**: reverse polarity on either supply (the regulator burns), too high a voltage (10 V: the regulator is
  damaged) or too low, a brown-out, the timer in backwards (hot), cold joints on the socket and on the timer.
- The `?variant=ne555` page fits the clone's NE555, which needs 4.5 V and never starts on the 3.3 V rail: AOUT sits at
  1.3 V and reads "wet" even in dry air.
- **View ▾**: the board, the schematic and power-tree sheets, the exploded view.

What it does (part page):

- **Soil moisture (%) ▾** (0, 25, 50, 75, 100) only darkens the soil in the pot; in a lesson the reading comes from
  the lesson's own world input. **Labels** reads "S1 · 40 %".

Look: warm paper, heavy ink outline with finer inner lines, flat light/mid/dark bands, mustard accent, the five
Colorfigures palettes.
