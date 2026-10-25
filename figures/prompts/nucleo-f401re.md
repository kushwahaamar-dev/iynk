# Fig. 08 — STM32 Nucleo-F401RE (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of ST's **NUCLEO-F401RE** (PCB MB1136 rev C, assembly C-04) lying on a
pale green cutting mat with a 10 mm grid, raised on standoffs, with a flat blue cast shadow. The board is 70 x 82.5 mm
with the USB at the top, R 2 mm corners, a tab at the bottom edge with 45° chamfers, white solder mask, blue
silkscreen and three 3.2 mm holes at (43.89, 2.50), (10.87, 54.57) and (59.13, 53.30) mm. Facts and sources:
`docs/facts/nucleo-f401re.md`; every position is the part's pad-box centre from ST's Altium file MB1136.PcbDoc, in the
board frame (origin at the bottom-left of the outline).

Two boards in one:

- **ST-LINK/V2-1 (top, behind the snap-off slots at y 57-58 with their three bridges):** the STM32F103CBT6 (QFP-48)
  turned 270°, the 8 MHz HC-49 crystal X1, the LD3985 3.3 V regulator U1, the BAT60J Schottkys D1-D3, the MMBT9013
  driver T1 and the STS9P3LLH6 P-MOSFET USB switch T2 (SO-8), the bicolour LD1 COM LED, the USB Mini-B socket CN1
  with its opening at the top edge, the CN2 header with two black jumper caps, CN3 (virtual COM RX/TX), the CN4 SWD
  header, JP1 USB PWR (open), the empty JP4 pads, the CN11/CN12 spare-cap headers, and the 0603 parts as one group.
- **Target (below):** the STM32F401RET6 (LQFP-64, "ARM / STM32F401 / RET6U") at (32.46, 24.09), the LD1117 5 V
  regulator U3 (SOT-223), the STPS2L30A Schottky D4 (SMA, band towards E5V), the 10 µF tantalums C16 (VIN) and C17,
  the LD39050 3.3 V regulator U4 with the SB2 bridge, JP5 (U5V / +5V / E5V) and JP6 (IDD) with their caps, green
  LD2 on D13 through 510 Ω, red LD3 PWR on +5V through 1 kΩ, the blue B1 USER button with its 4.7 kΩ pull-up and
  100 Ω + 100 nF filter, the black B2 RESET button with 100 nF on NRST, the L1 ferrite, the 32.768 kHz X2, the empty
  X3 footprint, the four black female Arduino sockets (CN6 POWER, CN8 A0-A5, CN5 D8-D15, CN9 D0-D7, Uno spacing,
  silk labels as printed: PWM/D9, SCK/D13, SDA/D14, RX/D0 ...), the two 2 x 19 male ST morpho headers CN7 and CN10 at
  the long edges, the closed solder bridges on the bottom, and the 0603 parts as one group.

What it does:

- **Power ▾**: USB cable, VIN pin (7-12 V) or E5V pin (4.75-5.25 V). The power tree is real: USB (U5V) feeds the
  ST-LINK through D2 and U1, and the target's +5V only through T2, which the ST-LINK switches on, and the JP5 cap on
  1-2; VIN goes straight into the LD1117 (no reverse diode), then D4 onto E5V; E5V reaches +5V with the JP5 cap on
  2-3 (the cap moves there while VIN or E5V is chosen) and feeds the ST-LINK through D3; +5V lights LD3 and feeds the
  LD39050 (500 mA, current limited), whose 3.3 V reaches the MCU's VDD only through JP6.
- **Upload sketch ▾**: the factory demo (LD2 blinks; each B1 press steps the rate), B1 lights LD2, and Serial hello,
  written by the ST-LINK over SWD while LD1 flashes red and green. Uploads need the CN2 caps.
- **Press B1 USER / Press B2 RESET**: B1 pulls PC13 low; B2 holds the STM32 in reset while the ST-LINK stays up.
- **Strip to bare PCB, Pick & place SMD (reflow), Place a part ▾ (low headers and X1, then the tall sockets, then the
  jumper caps), Solder joints, Remove a part ▾**: the real build order with its refusals.
- **Break it ▾**: reverse polarity and wrong voltages on VIN and E5V (20 V burns U3; 9 V on E5V kills U4), 5V-GND and
  3V3-GND shorts (the 3.3 V short leaves LD3 lit and the MCU dead), the JP5, JP6 and CN2 caps pulled, D4 or a
  tantalum backwards, a servo browning out the 5 V rail, cold joints on the USB socket and on D13.
- **View ▾**: the board; the breadboard with each lesson circuit (an LED on D13 through 220 Ω, a 10 kΩ knob on A0 from
  3V3, an LED on PWM pin D9 with the knob, a GY-521 MPU-6050 on D14/D15 at 3.3 V, an HC-SR04 at 5 V with TRIG on D7
  and ECHO straight into the 5 V tolerant D8); the schematic and power-tree sheets; the exploded view by build group.
  **See-through** shows the silicon dies and orange copper paths with moving dots where current flows (U5V, 5V, VIN,
  E5V, 3V3, VDD, the ST-LINK's 3.3 V and D13). **Labels** names the main parts.

Look: Colorfigures palette (tomato accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble,
paper grain. Works on a phone (badges and a label list) and inside the SimLab host (embedded, bare).
