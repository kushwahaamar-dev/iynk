# Fig. 10 — Raspberry Pi 5 / Raspberry Pi 4 Model B (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **Raspberry Pi 5** and, as a second variant (`?variant=pi4`), a
**Raspberry Pi 4 Model B**, component side up on a pale green cutting mat with a 10 mm grid and a flat blue cast
shadow. Both boards are 85 x 56 mm with R 3 mm corners and four 2.7 mm holes on a 58 x 49 mm grid; the Pi 5 is
1.3 mm thick with Raspberry Pi green mask, the Pi 4 1.4 mm. Facts and sources: `docs/facts/pi4-pi5.md`. Origin at
the bottom-left corner: the 40-pin header along the top edge, USB and Ethernet on the right edge, USB-C power and the
micro-HDMI ports on the bottom edge.

Draw every part where Raspberry Pi's drawings put it (Pi 5: the STEP model and mechanical drawing; Pi 4: the DXF):

- **Pi 5:** BCM2712 under its steel heat spreader (17 x 17 mm), the LPDDR4X package above it, the RP1 I/O chip, the
  DA9091 PMIC with its four grey inductors in a row, the Wi-Fi can, the Ethernet PHY turned 45°, the decoupling parts
  around the SoC, PMIC and RP1 (positions illustrative, one selectable group), the bi-colour LED behind its light pipe
  and the side-pressed power button at the left edge, the PCIe FFC (J20), both 22-pin CAM/DISP FFCs, the RTC battery,
  UART and 4-pin fan JST-SH connectors, USB-C, two micro-HDMI sockets, the 40-pin header J8 (pin 1 at (8.37, 51.23)),
  the PoE+ header, the Ethernet jack with link and activity LEDs, the blue USB 3 and black USB 2 stacks, and on the
  underside the microSD socket with the card sticking out past the left edge.
- **Pi 4:** BCM2711, LPDDR4, the VL805 USB 3 controller, the MxL7704 PMIC and its inductor, the Wi-Fi can and chip
  antenna, the Ethernet PHY, the red PWR (D3) and green ACT (D5) LEDs, the unfitted RUN/GLOBAL_EN pads (J2), the
  15-pin CAMERA and DISPLAY connectors, USB-C, two micro-HDMI sockets, the 3.5 mm A/V jack, the same header and port
  row in the Pi 4 places, and the microSD socket and card underneath. The DXF's silkscreen text is printed where the
  DXF puts it.
- The part ids work by function and match on both boards: U1 SoC, U2 RAM, U3 USB/IO chip, U4 PMIC, U5 Wi-Fi, U6
  Ethernet PHY, J1 USB-C, J3/J4 camera/display, J6/J13 micro-HDMI, J8 GPIO, J10 Ethernet, J11 USB 2, J12 USB 3, J14
  PoE, CARD the microSD card.

What it does:

- **Power ▾**: the official USB-C supply (27 W PD on the Pi 5, 15 W on the Pi 4), a 5 V 2 A phone charger, 5 V into
  GPIO pins 2 and 4, and "USB-C with a 5 V sensor output straight into GPIO24" as a wiring mistake. The header's 5 V
  pins sit on the input rail with no protection, so a reversed or 12 V supply there burns the PMIC; below 4.63 V the
  firmware flags under-voltage and the Pi 4's PWR LED goes out (it hangs off the PMIC's power-good signal).
- **Run a program ▾**: there is no flash to upload to; programs run on Linux from the card. Boot to a shell, blink.py
  (gpiozero LED on GPIO17), button.py (GPIO27 to GND drives the LED), fade.py (PWMLED on GPIO18), and a vcgencmd
  health check whose `throttled=` and voltage lines follow the supply (`EXT5V_V` on the Pi 5, the core `volt=` on
  the Pi 4). Under-voltage throttles the Arm clock; the model drops it to the firmware minimum (1.5 GHz on the
  Pi 5, 600 MHz on the Pi 4; the fact sheet gives no figure, unverified).
- **LEDs**: the Pi 5 LED is red with power and no firmware, green when running and blinks off for SD reads; with the
  RAM missing it flashes 0 long / 8 short, with the RP1 missing 4 long / 3 short. The Pi 4's ACT LED flickers with
  the card.
- **Strip, Pick & place, Place / Remove a part, Solder**: SMD (chips, passives and every surface-mount connector),
  then low (micro-HDMI, A/V), tall (header, PoE, Ethernet, USB), and the card last. The board reports
  `tasks.low-in`, `tasks.tall-in` and `tasks.card-in`.
- **Break it ▾**: reverse polarity and over- or under-voltage on the pin supply, a motor browning out the 5 V rail, cold
  joints on header pins 11 and 13, no card, a 3V3-GND bridge (the PMIC's limit drops 3.3 V and everything stops), a
  5 V bridge (the supply trips), missing RAM or RP1.
- **View ▾**: the board; a half breadboard behind the board for each lesson (LED D1 on GPIO17 through 330 Ω R1, a button
  on GPIO27, an LED on GPIO18, an HC-SR04 on GPIO23/24 with its echo through a 1 kΩ / 2 kΩ divider); the schematic and
  power-tree sheets; the exploded view. **See-through** shows the dies, the jack's magnetics and the 5 V, 3V3, CORE
  and GPIO17 paths.

Look: Colorfigures palette (mint accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble,
paper grain. Works on a phone (badges and a label list) and inside the SimLab host (embedded, bare).
