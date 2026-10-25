# Fig. 03 — Arduino UNO R4 Minima and UNO R4 WiFi (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of an **Arduino UNO R4**, switchable between the **Minima** (ABX00080)
and the **WiFi** (ABX00087) with `?variant=minima|wifi`, lying on a pale green cutting mat with a 10 mm grid, raised on
four standoffs, with a flat blue cast shadow. Both boards are 68.58 x 53.34 mm with the UNO R3's stepped right-hand
edge, three R 1 mm corners, teal solder mask (about #008184), white silkscreen and four 3.2 mm holes at (13.97, 2.54),
(15.24, 50.8), (66.04, 7.62) and (66.04, 35.56) mm. Facts and sources: `docs/facts/uno-r4.md`.

Draw every part where Arduino's own Altium PcbDoc puts it (origin at the bottom-left outline corner):

- **Both:** the black female headers in the UNO R3 positions (D8-D13/GND/AREF/SDA/SCL, D0-D7, the power header whose
  first pin is BOOT where the R3 had NC, and A0-A5) with their silk labels, the 2x3 ICSP header at the right, the
  RESET button top left, the USB-C socket overhanging the left edge, the barrel jack, the yellow L, TX and RX LEDs, the
  green ON LED, the 10 µH shielded buck inductor and its ISL854102 buck, two PMEG6020 Schottky diodes (VIN guard and
  USB to 5 V), the USB ESD array, the ferrite beads, and the small 0402 parts as one selectable group. No crystal:
  the RA4M1 runs from its internal 48 MHz oscillator.
- **Minima:** the RA4M1 (LQFP-64, "RENESAS R7FA4M1AB3CFM") at (43.5, 31.5) turned 270°, the buck and inductor under the
  USB socket, the 2x5 1.27 mm SWD header (pin 1 is +5 V), the empty Y1 crystal pads, "UNO" and "R4 MINIMA" on the
  silkscreen, and the "LOVE" test point on the bottom.
- **WiFi:** the RA4M1 at (52.75, 35.853), the ESP32-S3-MINI-1 module with its bare antenna end at the left edge, the
  buck and inductor in the middle, the SGM2205 3.3 V regulator, the TXB0108 level shifter, the two NLASB3157 USB
  switches, the 12 x 8 red LED matrix at 2.1 mm pitch, the 2N7002 that drives L, the two Qwiic level-shift MOSFETs,
  the 500 mA PTC, the cream Qwiic socket facing the right edge, the 2x3 ESP header, the OFF/GND/VRTC header on the
  bottom edge, the MD test point and the SJ1 jumper on the bottom, and the diagonal ON LED near the right edge.

What it does:

- **Power ▾**: USB-C cable, barrel jack, VIN pin, 5V pin or 3.3V pin. The power tree is real: USB → Schottky → 5 V
  (about 4.7 V, no polyfuse); jack or VIN → Schottky → buck → 5 V (6-24 V, 1.2 A); 3.3 V from the RA4M1's USB LDO on
  the Minima or the SGM2205 on the WiFi; the Qwiic 3.3 V behind the PTC. ON lights from the 5 V rail.
- **Upload sketch ▾**: Minima Blink, Blink without delay() and Serial hello (dfu-util); WiFi Matrix heart, Matrix scan,
  Blink and Serial hello (bossac through the ESP32-S3 bridge, which must be fitted with its level shifter for Serial).
- **Press RESET**: the sketch stops while it is held and restarts on release.
- **Strip to bare PCB, Pick & place SMD (reflow), Place a part ▾ (or a whole low or tall group), Solder joints, Remove
  a part ▾**: the real build order with its refusals.
- **Break it ▾**: reverse polarity and wrong voltages on every input (the Schottky blocks a reversed jack; 9 V on 5V
  damages the RA4M1; 48 V kills the buck; 5 V into the 3.3V pin damages the RA4M1's USB block or the ESP32-S3), USB
  sagging to 2 V (brown-out resets), a 5V-GND short, cold joints, missing parts (no L3: dead on the jack, fine on USB),
  and the boot straps, latched at each restart as the chips do: **MD low** halts the RA4M1 in its ROM boot mode (ON
  lit, sketch dark), **ESP_DOWNLOAD low** (WiFi) parks the ESP32-S3 in download mode, so Serial and uploads stop while
  the RA4M1 keeps running.
- **View ▾**: the board; the breadboard with each lesson circuit (Blink through 1 kΩ, the button on D2 with an LED on
  D13, the potentiometer on A1 with an LED on ~9, the DAC on A0, the GY-521 MPU-6050 on SDA/SCL at 5 V); the
  schematic and power-tree sheets; the exploded view by build group. **See-through** shows the silicon dies, the
  ESP32-S3 module's flash and 40 MHz crystal, the buck, the level shifter, the charlieplexed matrix and orange copper
  paths with moving dots where current flows (USB, 5 V, 3.3 V, VIN, D13). **Labels** names the main parts.

Look: Colorfigures palette (mint accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble, paper
grain. Works on a phone (badges and a label list) and inside the SimLab host (embedded, bare).
