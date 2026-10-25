# Fig. 02 — Arduino Nano (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of an **Arduino Nano** (classic, A000005, board revision 3.3, as
produced today) standing on its header pins on a pale green cutting mat with a 10 mm grid, with a flat blue cast
shadow (`figures/boards/nano.js`, facts in `docs/facts/nano.md`). The board is 43.18 x 17.78 mm, 1.6 mm thick, square
corners, teal solder mask, white silkscreen and no branding on top, four 1.65 mm holes in the corners. Every part
sits where Arduino's own Eagle file (NanoV3.3.brd) puts it, USB at the left end:

- on top: the **ATmega328P-MU** (VQFN-32, turned 45°, marked ATMEL M328P), the 16 MHz ceramic resonator turned at an
  angle, the SMD **RESET** button, four SMD LEDs in a column with their silk (TX green, RX red, ON green, L amber),
  the **USB Mini-B** socket at the left end with a dark cable plugged in that curls down onto the mat, and the six
  bare ICSP pads at the right end;
- two 1x15 headers fitted with their plastic underneath and the pins pointing down, so only short pin stubs with
  solder fillets show on top, silk beside them: `TX1 RX0 RST GND D2 … D12` on one row, `D13 3.3V REF A0 … A7 5V RST
  GND VIN` on the other, with asterisks on the PWM pins;
- underneath: the **FT232RNL** USB-to-serial bridge, the **LD1117** 5 V regulator (SOT-223), the SS1P3L Schottky from
  USB to 5 V, the 500 mA polyfuse, two 4.7 µF tantalums, the 0603 capacitors (C4 is the auto-reset capacitor from DTR
  to RESET) and two 4 x 1 kΩ resistor arrays.

What it does:

- **Power ▾**: USB cable, VIN pin (7-12 V), 5V pin, 3.3V pin (an output), or Unplug. The power tree is real: USB →
  polyfuse → Schottky (0.35 V) → 5 V at about 4.65 V; VIN → LD1117 (1.1 V dropout) → 5 V, with no switch and no
  reverse-polarity diode on VIN; the 5V pin feeds 5 V directly; 3.3 V comes from the FT232's own regulator. ON lights
  from the 5 V rail. The ATmega's brown-out detector trips below 2.7 V.
- **Upload sketch ▾**: Blink (1 s on / 1 s off on L and D13), Blink without delay() (0.2 s / 0.2 s), Serial hello
  ("Nano ready", then "hello from the Nano #0", "#1" … once a second). Uploads only go over USB, take 2.2 s with RX
  and TX flickering ("Uploading Blink: 924 bytes", then a ding), and fail without the FT232, C4, RP1, the ATmega or
  the resonator ("Upload failed: … is missing"). After a reset the bootloader flashes L three times and waits about a
  second before the sketch runs.
- **Press RESET** (or press the button on the board): the sketch stops while it is held and restarts on release.
- **Strip to bare PCB, Pick & place SMD (reflow), Place a part ▾, Solder joints, Remove a part ▾**: the real build
  order with its refusals; the headers go on after reflow. Any single part can be left out, and the polar ones (the
  regulator and both tantalums) can go in backwards.
- **Break it ▾**: reverse polarity on VIN (the LD1117 burns), on the 5V pin (the ATmega burns) or on the 3.3V pin
  (the FT232 burns); too high or too low a voltage on each pin (19 V on VIN damages the regulator; 3.5 V on VIN
  leaves 2.4 V on 5 V, a brown-out; 5 V on the 3.3V pin damages the FT232); a motor on the 5 V pin (brown-out
  resets); the regulator or a tantalum in backwards (hot); 5V or 3V3 shorted to GND (the supply trips); cold joints
  on the ATmega, the resonator, RESET, the TX, RX and ON LEDs, the USB socket, the regulator and the D9 header pin
  (what plugs into D9 cuts out in bursts).
- **View ▾**: the board; the breadboard with the circuit the host picks, the Nano on the mat beside a half-size
  breadboard and jumpers from its pins: Blink an LED (D13 → 220 Ω → red LED → GND, real current), A button and a knob
  (a push button on D2, a 10 kΩ potentiometer on A0), Fade an LED with a knob (D9 → 220 Ω → LED, the potentiometer on
  A0) and Talk to an MPU-6050 over I2C (a GY-521 on 5V, GND, A5 and A4); the hand-inked schematic and power-tree
  sheets; the exploded view. **See-through** shows the silicon dies with bond wires and orange copper paths with
  moving dots where current flows (USB, 5 V from the Schottky and from the regulator, VIN, D13 to the pin and to L).
  Labels: SILICON DIE, CERAMIC, USB BRIDGE, 5V REGULATOR, POLYFUSE, SCHOTTKY.

Look: Colorfigures palette (cobalt accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble,
paper grain. Works on a phone and inside the iynk host (embedded, bare). Upload byte counts are illustrative.
