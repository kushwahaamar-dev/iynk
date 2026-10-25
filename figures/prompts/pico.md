# Fig. 07 — Raspberry Pi Pico (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **Raspberry Pi Pico** standing on its two soldered 20-pin headers
on a pale green cutting mat with a 10 mm grid, with a flat blue cast shadow (`figures/boards/pico.js`, facts in
`docs/facts/pico.md`). One figure draws the whole family, a variant each: Pico (Rev3, the default), Pico W, Pico 2
and Pico 2 W (`?variant=pico|pico-w|pico2|pico2-w`). The outline, holes, castellated pins and SWD pads come from the
dimensioned datasheet drawings, the Pico and Pico W part centres from the published STEP files; Pico 2 and Pico 2 W
follow the Pico and Pico W layout.

The board is green, 21 x 51 mm, 1 mm thick, with four 2.1 mm holes, white silkscreen ("1", "2", "39" by the pins,
"LED", "USB", "BOOTSEL", "DEBUG", "Raspberry Pi Pico © 2020" along the edge) and 20 gold castellated pins down each
long edge, GP0-GP15 on the left, GP16-GP28 and the power pins on the right (VBUS, VSYS, 3V3_EN, 3V3, ADC_VREF,
GP28_A2, AGND, GP27_A1, GP26_A0, RUN …). On it:

- the **micro-USB** socket at the top edge with a dark cable plugged in that curls onto the mat;
- the **RP2040** (QFN, marked RP2-B2) in the middle, the 12 MHz crystal, the **W25Q16JV** 2 MB QSPI flash, the
  **BOOTSEL** button, the green user LED on GP25, the **MBR120** Schottky from VBUS to VSYS, the **RT6150B**
  buck-boost with its 2.2 µH inductor and two 47 µF capacitors, the DMG1012T MOSFET, and the three SWD pads at the
  bottom edge; test pads TP1-TP6 underneath (the W boards draw none);
- the W boards add the **CYW43439** radio under a silver RF shield and the printed 2.4 GHz antenna at the bottom end,
  move the LED onto the radio (WL_GPIO0), take an RT6154A and an extra 47 µF capacitor, and have three SWD holes
  mid-board instead of the edge pads; the Pico 2 boards carry the **RP2350A** and a 4 MB W25Q32RV.

There is no reset button, no power LED and no USB-serial chip: USB data goes straight into the microcontroller.

What it does:

- **Power ▾**: USB cable, VBUS pin (4.5-5.5 V), Battery on VSYS (3.7 V, 1.8-5.5 V), or Unplug, plus a wiring mistake
  as a fourth supply: "USB, with a 5 V sensor output on GP17". The power tree is real: USB → VBUS (no fuse) →
  Schottky (0.3 V) → VSYS at 4.7 V → buck-boost → 3.3 V, held from anything between 1.8 and 5.5 V on VSYS and off
  below 1.8 V. The 5 V sensor output drags the Pico's 3V3 rail up through the pin's protection diode to 4.4 V and
  damages the RP2040; on a Pico 2 GPIO0-22 are 5 V tolerant and nothing happens.
- **Upload sketch ▾** offers MicroPython programs (`main.py`, the byte count is the file's length), copied over USB
  as a UF2 in 2.2 s: Blank flash (factory: the chip is the RPI-RP2 or RP2350 drive and runs nothing), MicroPython
  blink (the LED and GP15 toggle every half second), LED follows BOOTSEL, On-chip temperature (the monitor prints
  "temperature 27.6 C" once a second, wandering up to 28.3 C, read from ADC4 with the datasheet formula) and, on the
  W boards, Wi-Fi connect (the LED flickers for two seconds, then stays on and the monitor prints "connected
  192.168.4.20"). Uploads fail without the USB socket, the microcontroller, the flash or the crystal.
- **Press BOOTSEL** (or press the button on the board). Pressed while the board is unplugged, the chip comes up as
  the USB drive when it is plugged in and runs nothing.
- **Strip to bare PCB, Pick & place SMD (reflow), Place a part ▾, Solder joints, Remove a part ▾**: the real build
  order with its refusals; the two 20-pin headers are the parts you solder yourself.
- **Break it ▾**: reverse polarity on the VBUS pin (the Schottky blocks it, nothing powers up) or on VSYS (the
  microcontroller burns); too high a voltage on VBUS or VSYS (9.5 V: the buck-boost is damaged) or too low (3.1 V on
  VBUS leaves 2.8 V on VSYS and the buck-boost still makes 3.3 V; 1.3 V on VSYS is under 1.8 V and 3.3 V switches
  off); a motor on the 5 V pin (brown-out resets); the Schottky in backwards (USB power never reaches VSYS); 3V3 or
  VBUS shorted to GND (the supply trips); the crystal left out (powered, but nothing runs) or the 3.3 V-side
  capacitor left out (no 3.3 V reaches the chip); and cold joints on BOOTSEL, the LED, the flash, the
  microcontroller, the crystal, the GP15 header pin (the breadboard LED cuts out) and the GP26 header pin.
- **View ▾**: the board; the breadboard with the circuit the host picks, the Pico on the mat beside a half-size
  breadboard and jumpers from its pins: Blink an LED on GP15 (330 Ω, red), Button on GP14 with the LED on GP15,
  Potentiometer on GP26 (ADC0) with the LED on GP15 (PWM), and MPU-6050 on I2C0 (GP4 SDA, GP5 SCL); the hand-inked
  schematic and power-tree sheets; the exploded view. **See-through** shows the dies with bond wires and orange
  copper paths with moving dots where current flows (VBUS, VSYS, 3V3, the LED's line, GP15). Labels: SILICON DIE,
  FLASH MEMORY, QUARTZ, BUCK-BOOST, and WI-FI RADIO on the W boards.

Look: Colorfigures palette (mint accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble,
paper grain. Works on a phone and inside the SimLab host (embedded, bare).
