# Fig. 01 — Build an Arduino Uno R3 (Robotics Bench, Colorfigures prompt)

Make a colourful, hand-inked isometric bench figure of an **Arduino Uno R3** (A000066, UNO-TH Rev3e) being built from
the bare PCB, on a pale green cutting mat with a 10 mm grid, raised on four gold standoffs, with a flat blue cast
shadow. The board is the Board Lab's Uno (`figures/boards/uno-r3.js`): 68.58 x 53.34 mm, teal solder mask, the real
stepped outline, every part where Arduino's Eagle board file puts it. Beside it lies a half-size breadboard with the
practice circuit: a 220 Ω resistor (R3) and a red LED (LED1) on D13, and a black push button (SW1) from D2 to GND,
wired with orange, yellow and black jumpers.

What it does:

- **Strip to bare PCB, Pick & place SMD, Place a part ▾, Solder joints**: the factory order with its refusals. Pick
  and place drops every SMD part in about 3 s and the board rolls through the reflow oven; then **All low parts** (the
  DIP-28 socket, the 16 MHz crystal, the two ICSP headers) and **All tall parts** (USB-B, barrel jack, the four
  female headers); the
  iron solders every through-hole joint; the ATmega328P goes into its socket last, cold, notch to the ICSP header.
  "Unplug the power first", "SMD parts first", "Low parts first" and "Solder everything first. Never heat a chip
  sitting in its socket" stop anything out of order.
- **Power ▾**: USB, barrel jack, VIN pin or 5V pin, through the board's real power tree.
- **Upload sketch ▾**: Blink (1 s on, 1 s off), Blink without delay() (200 ms), analogWrite on pin 13 (no PWM there,
  so it only blinks), Serial hello ("Uno ready", then "hello, robot #n" once a second). Uploads take 2.2 s with RX/TX
  flicker.
- **Break it ▾**: the ATmega328P or PC2 in backwards, reverse polarity on the jack (D1 blocks it) or on VIN (U1 and
  PC1 burn), 24 V and 4 V on the jack, a motor on the 5 V pin (brown-out: the banner repeats), a cold joint on the
  USB socket, a 5V-GND solder bridge (the polyfuse trips), and the chip, the resonator, the fuse or the 16U2 left out.
- **View ▾**: the board, the breadboard with the practice circuit (reaction timer, or the real fade on ~9), the
  schematic and power-tree sheets, the exploded view. **See-through** shows the dies, the quartz and copper paths
  with moving dots where current flows.

State the host reads: `build`, `power`, `status`, `mode`, `faults`, `missing`, `leds.L`, `leds.ON`, `rails.*` and the
build-step conditions `tasks.smd-placed`, `tasks.smd-soldered`, `tasks.low-in`, `tasks.tall-in`, `tasks.tht-soldered`,
`tasks.chip-in`. The lesson (25 steps, 13 faults, 2 tasks, 5 quizzes) is `src/content/robotics/uno-r3-build.ts`.

Look: Colorfigures palette (cobalt accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble,
paper grain. Works on a phone and inside the SimLab host (embedded, bare).
