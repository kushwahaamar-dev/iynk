# Fig. 05 — ESP32-S3-DevKitC-1 (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of an **Espressif ESP32-S3-DevKitC-1** standing on its two header rows
on a pale green cutting mat with a 10 mm grid, with a flat blue cast shadow (`figures/boards/esp32-s3-devkitc-1.js`,
facts in `docs/facts/esp32-s3-devkitc-1.md`). Two variants: v1.1, the default, with the RGB LED on GPIO38, and v1.0
with it on GPIO48 (`?variant=v1.1|v1.0`). Every part centre comes from Espressif's own PADS design file
(PCB_ESP32-S3-DevKitC-1_V1.1_20220429.asc). The board is 25.40 x 62.74 mm, 1.6 mm thick, 0.5 mm corner radius, near
black solder mask, white silkscreen and no mounting holes. On it:

- the **ESP32-S3-WROOM-1-N8R8** module at the far end (25.5 x 18 mm: a silver shield printed ESP32-S3-WROOM-1 / N8R8
  across the module, the meandered antenna beyond it, 14 gold pads down each long side and 12 across the end);
- two **micro-USB** ports at the near end, silk "UART" and "USB", with a dark cable in the UART port that curls onto
  the mat;
- the **CP2102N** USB-UART bridge (QFN, SILABS), the **SGM2212** 3.3 V regulator (SOT-223), two **1N5819** Schottky
  diodes (one from each port's VBUS onto 5 V), six small ESD diodes behind the ports, the two L8050 auto-reset and
  auto-boot transistors, the **SK68XXMINI-HS** addressable RGB LED with silk "RGB@IO38" ("RGB@IO48" on v1.0), the red
  power LED D5 with its 5.1 kΩ resistor, the **BOOT** and **RESET** buttons, and the 0402 and 0603 resistors and
  capacitors of the fact sheet: the LDO's input and output capacitors, the EN pull-up and its 1 µF delay capacitor,
  the VBUS sense divider, and the 0 Ω links R24 (3.3 V to the module and the 3V3 pins) and R17 (data pin to the RGB
  LED);
- two 1x22 headers underneath, pins pointing down, labelled along the long edges: `3V3 3V3 RST 4 5 6 7 15 16 17 18 8
  3 46 9 10 11 12 13 14 5V G` on one side, `G TX RX 1 2 42 41 40 39 38 37 36 35 0 45 48 47 21 20 19 G G` on the
  other, the labels beside the module shrunk into the gap between the pads and the shield.

What it does:

- **Power ▾**: USB cable in the UART port (the default), USB cable in the USB port, the 5V pin (4.75-5.25 V), the 3V3
  pin (3.0-3.6 V), or Unplug. The power tree is real: each port's VBUS goes through its own Schottky (0.35 V) to 5 V
  at about 4.65 V, so both cables can be in at once; the 5V pin joins after the diodes with no protection; the
  SGM2212 (0.42 V dropout, 20 V in at most) makes 3.3 V, which lights the red power LED and reaches the module and
  the 3V3 pins through R24. The chip browns out below 2.7 V.
- **Upload sketch ▾**: each sketch starts with the ROM's boot line on the monitor ("rst:0x1 (POWERON),boot:0x8
  (SPI_FAST_FLASH_BOOT)"). Blink RGB (the RGB LED red, half a second on and off at 64 of 255, GPIO4 with it, "blink
  #1" …), RGB rainbow (the hue goes round every 4 s, "hue 90 deg" …), BOOT button as an input (green and GPIO4 high
  while BOOT is held, "BOOT pressed"), Wi-Fi web server (blue blinking for 2.6 s, then green; "Connecting to
  bench-lab", "....", "WiFi connected, IP 192.168.4.42", then "GET / from 192.168.4.17 200 OK" every 3 s) and Deep
  sleep (a pale blue flash for 2 s every 12 s, "boot #1, sleeping 10 s"). Uploads go over the UART port with esptool,
  no button press needed (the two transistors pull EN and GPIO0), and fail without the CP2102N, either transistor,
  their four resistors and links, the UART links R7 and R9, the module or the EN pull-up ("Upload failed: … is
  missing"). Powered from the USB port alone, the page asks for the cable first.
- **Press BOOT** and **Press RESET**: RESET stops the sketch while held. With BOOT still down when RESET lets go, the
  ROM stays in download mode: the RGB LED goes dark and the monitor shows "boot:0x0 (DOWNLOAD(USB/UART0))" and
  "waiting for download"; another RESET on its own runs the sketch again.
- **Strip to bare PCB, Pick & place SMD (reflow), Place a part ▾, Solder joints, Remove a part ▾**: the real build
  order with its refusals.
- **Break it ▾**: reverse polarity on the 5V pin (the regulator burns) or the 3V3 pin (the module burns); too high a
  voltage (24 V on 5V damages the regulator; 7.6 V or 5 V on 3V3 damages the module) or too low (3.3 V on 5V still
  leaves 2.9 V and the sketch runs; 3 V on 5V leaves 2.6 V, a brown-out; 2.1 V on 3V3, a brown-out); a motor on the
  5 V pin (brown-out resets); D1 in backwards (UART-port power never arrives), D7 in backwards (the same for the USB
  port), D5 in backwards (the power LED stays dark); 5V or 3V3 shorted to GND (the supply trips); GPIO0 held low at
  reset (the ROM waits in download mode and nothing runs); 5 V into GPIO4 (the pin is dead and the breadboard LED
  stays off); R17 left out (the RGB LED stays dark), R24 left out (the power LED lights but no 3.3 V reaches the
  chip), the EN pull-up left out (powered, but nothing runs); and cold joints on the GPIO4 header pin, the UART port,
  the module, the RGB LED, the power LED, both buttons and the EN pull-up.
- **View ▾**: the board; the breadboard with the circuit the host picks, the DevKitC-1 on the mat beside a half-size
  breadboard and jumpers from its pins, an LED on GPIO4 through 330 Ω in each: Blink an LED on GPIO4, BOOT button
  toggles the LED, Potentiometer dims the LED with PWM (a 10 kΩ knob from G to 3V3, its wiper on GPIO1) and LED
  switched from a web page; the hand-inked schematic and power-tree sheets; the exploded view. **See-through** shows
  the dies with bond wires and orange copper paths with moving dots where current flows (each port's VBUS, 5 V, the
  regulator's 3.3 V to the power LED and on through R24 to the module, the RGB data line, TX to the header and to the
  CP2102N). Labels: ESP32-S3 + FLASH + 40 MHZ CRYSTAL, USB-UART BRIDGE, LDO PASS TRANSISTOR, R, G, B DIES + DRIVER.

Look: Colorfigures palette (mustard accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble,
paper grain. Works on a phone and inside the iynk host (embedded, bare). Upload byte counts are illustrative.
