# ULN2003 driver board on the mat (Colorfigures prompt)

The breadboard part that lesson circuits use (`figures/parts/uln2003.js`, Fig. P25): DRV1 in the Uno R3's "Spin the
wheel" circuit, where D8-D11 drive IN1-IN4 and the 28BYJ-48 stepper plugs into its socket. The module page of the same
board has its own prompt in `uln2003.md`. Facts in `docs/facts/la-components.md` §15.2.

Make a colourful, hand-inked isometric figure of the **ULN2003 stepper driver board** lying flat on a pale green
cutting mat beside a white mini breadboard, with a flat blue cast shadow.

- A green 35 x 32 mm board, 1.6 mm thick, four dark mounting holes near the corners, white silkscreen.
- The **ULN2003APG** in a black DIP-16 package (19.3 x 6.4 mm) in the middle, eight tinned legs a side bent down to
  the board, a pin-1 dot and "ULN2003APG" printed in grey.
- The white 5-pin **JST-XH** motor socket on the back edge, open on top.
- Four red 3 mm LEDs **A-D** down one side.
- On the front edge, gold pins in black headers: **IN1-IN4**, the **− +** power pins marked "5-12V", and the
  **ON/OFF** jumper with its black cap on.
- Legs: IN1, IN2, IN3, IN4, GND, VCC, the header pins a jumper wire pushes onto.

What it does:

- **Show ▾**: stepping (the default: the LEDs walk the full-step sequence, two neighbours lit at a time, four steps a
  second) or idle (all dark).
- In a circuit the bench solver drives it instead. Each input is 2.7 kΩ into a Darlington (hFE about 1000, about 1 V
  across it when on, 500 mA a channel at most) with a clamp diode from every output to VCC. An input HIGH switches its
  output on, that coil's current flows and its LED lights; the part's pill reads "DRV1 · coils A+B on". A channel the
  solver reports burnt leaves its LED dark. The stepper reads its four coil currents from the outputs and turns.
- **See-through** fades the chip to show its die, with four channel squares that glow orange while on, and the copper
  from each input to the chip and from the chip to the socket, red while that channel is on. **Labels**: ULN2003:
  Darlington switches, IN1-IN4 from the board, LED on = coil on, Motor socket, red = +.

Look: warm paper, heavy ink outline with finer inner lines, flat light/mid/dark bands, the five palettes.
