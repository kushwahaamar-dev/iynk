# Fig. 11 — QTR-8RC line follower (Robotics Bench, Colorfigures prompt)

Two figures share this prompt: the module on its own (`figures/modules/qtr-8rc.js`) and the bench that builds a line
follower around it (`figures/robotics/qtr-8rc.js`). Facts in `docs/facts/qtr8rc.md`, the driver's in `docs/facts/tb6612.md`.

Make a colourful, hand-inked isometric figure of a **Pololu QTR-8RC** reflectance array: a red 74.93 x 12.70 mm strip
with square corners, four 2.18 mm holes along the header edge, and eight black QRE1113-style sensors (2.8 x 3.6 mm,
two windows each) in a row at 9.525 mm along the far edge, sensor 1 on the left. Between them the MOSFET Q1 that
switches the LEDs, sixteen 0603 resistors and twelve tan 0603 capacitors at the positions of Pololu's STEP model, the
11-pin header soldered from the back (only its joints show on top; its plastic and pins hang under the board), the
empty row-B pads, the 3.3V BYPASS pads, the 2-sensor piece's pads, the break-off resistor pads and a column of vias
at x = 55.88 where the board snaps into 6 + 2. Silkscreen: "TOP" and the sensor numbers.

What it does (module page):

- **Programs** are what a host sketch prints, one line a second, while a card with black tape slides back and forth
  under the array: "Raw RC times" (eight fall times: about 120 µs white, 2500 µs = timeout black), "Line position"
  (readLineBlack, 0-7000), "Over a white card" and "Emitters off" (LEDON low: every sensor times out).
- While the host reads, a small column over each sensor shows its RC time, pale for white, dark for black.
- **See-through**: each sensor's IR LED glows violet while it emits (what a phone camera shows) and its
  phototransistor lights with the IR that comes back; current on LEDON, VCC, OUT1 and OUT8.
- **Break it**: the bypass bridged on 5 V (pair 5+6 burns), R9 left out (sensors 3 and 4 dark), a cold joint on
  OUT1, sunlight on the floor, Q1 left out.

The bench (Robotics Bench Fig. 11, tomato palette): on the pale green mat around the array an **Arduino Nano** in
front of the header, a **TB6612FNG** breakout to its right, a **2S LiPo** beyond it, two **TT gear motors** behind,
and a **white test card with 19 mm black tape** slid under the array, red ticks where each sensor looks. Jumpers:
GND, VCC and LEDON to GND, 5V and D2; OUT1-OUT6 to A0-A5, OUT7 and OUT8 to D11 and D12; the driver's PWMA D5, AIN1
D7, AIN2 D8, STBY D9, BIN1 D10, BIN2 D4, PWMB D6, GND and VCC to the Nano; motor L on A01/A02, motor R on B01/B02,
the pack on VM.

What it does (bench):

- **Set up the mat ▾**: the Nano with the array's wires, the driver, the motors, the pack, the card: one at a time.
- **Upload sketch ▾**: Raw RC times, Line position, Follow the line. Follow runs a P controller (150 ± error/20,
  Kp 0.05): the tape drifts sideways as the track curves and comes back as the wheel difference turns the robot;
  the wheels spin at what the TB6612FNG gives them from the pack.
- **Break it ▾**: the array on 3.3 V (every sensor reads dark), the bypass bridged on 5 V, a cold joint on OUT1, R9
  left out, sunlight, the array lifted to 10 mm (white reads 780 µs), the motors swapped (it steers away and loses
  the line, the card glows), the motors on the Nano's 5 V (brown-out).

State the host reads: `status`, `power`, `mode`, `matStep`, `rails.VCC`, `qtr.us`, `qtr.cal`, `qtr.pos`, `qtr.lost`,
`drive.L`, `drive.R`, `readings.MOTL`, `readings.MOTR`, `faults`, `missing`. The lesson is
`src/content/robotics/qtr-8rc.ts`.

Look: Colorfigures palette, warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble, paper grain. Works
on a phone and inside the iynk host (embedded, bare).
