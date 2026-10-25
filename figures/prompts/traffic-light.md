# Traffic-light LED module (Colorfigures prompt)

Two figures share this prompt: the module on its own (`figures/modules/traffic-light.js`) and the breadboard part that
lesson circuits use (`figures/parts/traffic-light.js`, in the Uno R3's "Parking sensor" circuit as TL1). Facts in
`docs/facts/la-components.md` §19; the layout is the common one read from product photos.

Make a colourful, hand-inked isometric figure of the generic **4-pin traffic-light LED module**: a black 21 x 56 mm
board, 1.6 mm thick with rounded corners and one 3.2 mm hole at the top, white silkscreen ("TRAFFIC LIGHT", R, Y and
G beside the lamps, the pin names over the header), with:

- three 8 mm LEDs standing on it like a real traffic light, red at the top, yellow, green at the bottom: a 9 mm
  flange, the coloured body and a dome, about 12 mm tall;
- beside each LED its own 330 Ω SMD resistor printed "331", and copper traces from each pin through its resistor
  to the LED's anode; the cathodes are tied to GND;
- the 4-pin 2.54 mm header on the back, pins pointing down: GND R Y G.

On the module page it stands on its header pins over a pale green mat with a flat blue cast shadow (tomato
palette). As a breadboard part it is the smaller kit board: black, 14 x 30 mm, standing upright on its header in
four holes (a5-a8 on the part page) with three 5 mm lenses on its face, red at the top, and "GND R Y G" printed at
its foot. It has no solver model: each lens lights while the sketch runs and the board pin wired into its leg's
strip is high. **Labels** reads its id.

What it does (module page):

- **Power ▾**: Uno pins (5 V logic) or Pins of a 3.3 V board (ESP32, Pico), or Unplug. Each LED lights when its pin
  is high and takes I = (V − Vf) / 330 Ω: about 9 mA from 5 V, 3-4 mA from 3.3 V (Vf red 2.0, yellow 2.1, green
  2.2 V). A lit LED pales towards white and glows, brighter as (I / 13.6 mA)^0.55 times its duty.
- **Upload sketch ▾** switches the sketch instantly: **Traffic cycle** (the default: green 3 s, yellow 1 s, red
  3 s), **Parking sensor** (an obstacle drives between 6 and 58 cm, 8 s a round trip: green above 30 cm, yellow to
  15 cm, red closer; the serial monitor gets "42 cm · GREEN · all clear", "… · YELLOW · slow down", "… · RED ·
  stop!"), **Fade green (PWM)** (green breathes), **Night flash** (yellow blinks once a second), **Lamp test** (all
  three on).
- **See-through** ghosts the LED bodies to show each one's steel lead posts, the reflector cup on the cathode
  holding the coloured die and the gold bond wire to the anode post; the back of the board shows the header, and
  current dots run along each colour's trace. Label: DIE IN A REFLECTOR CUP.
- **Strip to bare PCB, Pick & place SMD, Place a part ▾, Solder joints, Remove a part ▾**: the engine's build
  order, with each LED placeable the right way round (flat side to the right) or backwards (it stays dark).
  Without its resistor an LED takes about 120 mA through the pin driver alone: it flares, and after half a second
  burns out with a pop and a toast ("Red LED burned out: about 120 mA with no resistor"), turns brown under a puff
  of smoke and stays dead until it is replaced.
- **Break it ▾**: too high a voltage on either supply (12 V: the red LED is damaged) or too low (the LEDs dim), a
  brown-out, any LED in backwards, cold joints on the header and on each LED.
- The `?variant=gnd-last` page prints the other makers' pin order, R Y G GND.
- **View ▾**: the board, the schematic and power-tree sheets, the exploded view.

Look: warm paper, heavy ink outline with finer inner lines, flat light/mid/dark bands, the five Colorfigures
palettes.
