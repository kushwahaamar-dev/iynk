# Fig. 04 — ESP32-DevKitC V4 (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of an **Espressif ESP32-DevKitC V4** (ordering code ESP32-DevKitC-32E)
lying on a pale green cutting mat with a 10 mm grid, with a flat blue cast shadow. The board is 27.94 x 48.26 mm,
1.6 mm thick, with about 1 mm corner radius, a near-black solder mask, white silkscreen and **no mounting holes**.
Draw it in board millimetres with the micro-USB edge at the front (y = 0) and the module at the back, every centre
taken from Espressif's DXF and layout PDF as collected in docs/facts/esp32-devkitc.md:

- the **ESP32-WROOM-32E** module (18 x 25.5 x 3.1 mm, centre 14.00, 41.55): blue module PCB, a stamped silver
  shield etched ESPRESSIF / ESP32-WROOM-32E, and the gold meandered PCB antenna at the far end, which **overhangs the
  back edge by 6.04 mm** so no board copper sits under it;
- the **CP2102N** USB-UART bridge (QFN-28, 5 x 5 mm, pin-1 dot top-right) at (14.00, 12.25), the **AMS1117-3.3**
  regulator (SOT-223, three legs to the left at x 10.92, tab to the right) at (14.07, 19.18), the **BAT760**
  Schottky diode (SOD-323) at (9.15, 8.38), three LESD5D5.0 ESD diodes along y 7.87, the two **SS8050**
  auto-program transistors (SOT-23) at (21.59, 11.56) and (21.59, 19.43), the red 0603 power LED D1 with its 2 kΩ
  resistor R2, the 22 µF regulator capacitors C1/C3, and every 0402 resistor and capacitor the fact sheet lists
  (R11/C9 EN delay, R17/R18 0 Ω links on TXD0/RXD0, R21/R22, R24-R26, C14, C15, C19-C22);
- the **micro-USB** receptacle on the front edge, opening facing the viewer, with a dark cable plugged in;
- the two small SMD push buttons **EN** (left, 6.00, 3.86) and **Boot** (right, 22.00, 3.86), silk "EN" and "Boot"
  above them;
- two 19-pin 2.54 mm headers, **J2** at x 1.245 and **J3** at x 26.645, pin 1 at the back (y 47.01), rows 25.4 mm
  apart. They point down into a breadboard, so from above you see round pads, shiny solder fillets and the short gold
  pin ends. Silk beside them, rotated along the long edges: left `3V3 EN VP VN 34 35 32 33 25 26 27 14 12 GND 13 D2
  D3 CMD 5V`, right `GND 23 22 TX RX 21 GND 19 18 5 17 16 4 0 2 15 D1 D0 CLK`.

There is **no user LED** on this board: lessons wire a red LED with a 220 Ω resistor to GPIO23 on a half-size
breadboard beside it.

What it does:

- **Power ▾**: USB cable, the 5V pin or the 3V3 pin (one at a time). The power tree is real: USB → BAT760 (about
  0.35 V drop) → 5V rail (≈ 4.65 V) → AMS1117 (1.1 V dropout) → 3V3; the 5V pin feeds the 5V rail with no
  protection; the 3V3 pin bypasses the regulator. The red LED lights from the 5V rail.
- **Upload sketch ▾**: Blink GPIO23 (500 ms / 500 ms), LEDC fade on GPIO23, Serial hello. Uploads go over USB with
  esptool (3 s); without the 0 Ω link R17 or R18, or without the CP2102N, the upload fails. Every restart prints the
  ROM line `rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)`.
- **Press EN**: the chip stops while it is held and restarts on release. **Press BOOT**: hold Boot and tap EN (or
  plug in) and the ROM prints `boot:0x3 (DOWNLOAD_BOOT(UART0/UART1/SDIO_REI_REO_V2))` and `waiting for download`;
  the sketch does not run until EN is pressed again with Boot released. Both buttons work from the figure, the
  keyboard and the host bridge.
- **Strip to bare PCB, Pick & place SMD (reflow), Place a part ▾, Solder joints, Remove a part ▾**: everything is
  SMD except the two headers, which go on after reflow and are soldered by hand, with the real refusals. Any single
  part can be left out: without R2 the power LED stays dark, without R11 the chip never leaves reset, without U2
  there is no 3V3, without D3 USB power never arrives.
- **Break it ▾**: reverse polarity on the 5V or 3V3 pin (the module burns), too high or too low a voltage on either
  pin (14 V on 5V damages the regulator; 3.3 V on 5V browns out; 5 V on 3V3 kills the module), a brown-out from a
  heavy load, D3 in backwards (no power), cold joints (on D1, the buttons, U3, R11, and the GPIO23 header pin, which
  makes the breadboard LED flicker), GPIO12 pulled high at reset (boot loop with `flash read err, 1000`), and 5V or
  3V3 shorted to GND (the supply trips).
- **View ▾**: the board; the breadboard with the lesson circuit (GPIO23 → 220 Ω → red LED → GND, real current from
  3.3 V); the hand-inked schematic and power-tree sheets, synced with the 3D parts; the exploded view.
  **See-through** shows the silicon dies with bond wires and orange copper paths with moving dots where current flows
  (5V from USB through D3, 3V3 from the regulator, GPIO23). **Labels** names the main parts.

Look: Colorfigures palette (mustard accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble,
paper grain. Works on a phone and inside the SimLab host (embedded, bare). Upload byte counts are illustrative.
