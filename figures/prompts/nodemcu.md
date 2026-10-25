# Fig. 06 — NodeMCU ESP8266 DevKit v1.0 (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **NodeMCU DevKit v1.0 "Amica"** standing on its two header rows on
a pale green cutting mat with a 10 mm grid, with a flat blue cast shadow (`figures/boards/nodemcu.js`, facts in
`docs/facts/nodemcu.md`). The board is 25.40 x 48.26 mm, 1.6 mm thick, rounded corners, black solder mask, white
silkscreen, four 2.9 mm holes in the corners. Every part sits where the NodeMCU team's own Altium file
(NODEMCU_DEVKIT_V1.0_OFFSET.PcbDoc) puts it; two positions are estimates, flagged in the fact sheet (the ESP-12E body
outline and the module's blue LED):

- the **ESP-12E** module at the far end (16 x 24 mm: a silver shield etched ESP8266MOD / AI-THINKER, the meandered
  PCB antenna beyond it) with its small blue LED on GPIO2;
- the **micro-USB** socket at the near end with a dark cable plugged in that curls onto the mat, the **CP2102**
  USB-UART bridge (QFN), the **AMS1117-3.3** regulator (SOT-223), the **SS14** Schottky, the 100 µF tantalum C2, the
  two S8050 auto-reset and auto-program transistors (SOT-23, "J3Y"), the board's own blue LED on D0 with its 470 Ω
  resistor, the 220 k / 100 k divider on A0, the 12 kΩ strap resistors (GPIO0 and GPIO2 pull-ups, the GPIO15
  pull-down, the EN pull-up), every 0402 resistor and capacitor of the fact sheet, and the empty R10 pads (the D0 to
  RST link);
- the **RST** and **FLASH** buttons either side of the USB socket, silk "RST" and "FLASH", and "NODEMCU", "DEVKIT",
  "14/02/2015" mid-board;
- two 1x15 headers underneath, pins pointing down, with silk along the long edges: left `A0 RSV RSV SD3 SD2 SD1 CMD
  SD0 CLK GND 3V3 EN RST GND Vin`, right `D0 D1 D2 D3 D4 3V3 GND D5 D6 D7 D8 RX TX GND 3V3`.

Both blue LEDs are active low.

What it does:

- **Power ▾**: USB cable, the Vin pin (5-9 V) or the 3V3 pin, or Unplug. The power tree is real: USB → SS14 (0.35 V)
  → Vin at about 4.65 V → AMS1117 (1.1 V dropout) → 3.3 V for the module and the CP2102. The SS14 also stops a supply
  on Vin from back-feeding the computer; nothing protects Vin against a reversed supply. The module browns out below
  2.5 V.
- **Upload sketch ▾**: Blink (the module's LED, 1 s on / 1 s off), Both LEDs (the two blue LEDs take turns, half a
  second each), Serial hello ("NodeMCU ready", then "hello from the ESP8266 #0", "#1" … once a second), Wi-Fi server
  ("Connecting to iynk" while the module LED flickers for two seconds, then it stays lit and the monitor prints "IP
  address: 192.168.1.42"). Uploads go over USB with esptool and fail without the CP2102, either S8050, the 470 Ω on
  RX, the module, the EN pull-up or the GPIO15 pull-down ("Upload failed: … is missing").
- **Press RST**: the sketch stops while it is held and restarts on release. **Press FLASH** holds GPIO0 low: held
  while RST is released, the board reports the ROM's download mode to the host.
- **Strip to bare PCB, Pick & place SMD (reflow), Place a part ▾, Solder joints, Remove a part ▾**: the real build
  order with its refusals. Without the EN pull-up or the GPIO15 pull-down the chip never runs ("Powered, but nothing
  runs").
- **Break it ▾**: reverse polarity on Vin or 3V3 (the module burns), too high a voltage (19 V on Vin damages the
  regulator, 7.6 V on 3V3 the module) or too low (a brown-out), a motor on the 5 V pin (brown-out resets), D1 in
  backwards (USB power never arrives), C2 in backwards (hot), 3V3 or Vin shorted to GND (the supply trips), the EN
  pull-up or the GPIO15 pull-down left out, and cold joints on the module, its LED, the EN and GPIO15 resistors, the
  D0 LED, RST, the USB socket and the D1 header pin (what plugs into D1 cuts out in bursts).
- **View ▾**: the board; the breadboard with the circuit the host picks, the NodeMCU on the mat beside a half-size
  breadboard and jumpers from its pins: an LED on D1 (220 Ω, red), an LDR from 3V3 to A0 with 10 kΩ to GND, a knob on
  A0 and a green LED on D5, and a yellow LED on D1 for the Wi-Fi web server; the hand-inked schematic and power-tree
  sheets; the exploded view. **See-through** shows the dies with bond wires and orange copper paths with moving dots
  where current flows (USB through the SS14 to Vin and on to the regulator, 3V3, GPIO2 to the module LED, D0 to the
  board LED). Labels: ESP8266EX, USB-UART, 3V3 LDO, AUTO-RESET.

Look: Colorfigures palette (blush accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble,
paper grain. Works on a phone and inside the iynk host (embedded, bare). Upload byte counts are illustrative.
