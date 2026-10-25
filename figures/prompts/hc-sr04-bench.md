# Fig. 10 — HC-SR04 parking sensor (Robotics Bench, Colorfigures prompt)

The bench around the HC-SR04 module figure (`figures/modules/hc-sr04.js`, its own prompt in `hc-sr04.md`):
`figures/robotics/hc-sr04.js`. Facts in `docs/facts/hcsr04.md`.

On the pale green mat (cobalt palette) the blue HC-SR04 lies with its two aluminium cans facing up; an **Arduino Nano**
lies in front of it and a black 12 mm **piezo buzzer** to the right. Jumpers from the right-angle header's pins: Vcc to
the Nano's 5V, Trig to D9, Echo to D10, Gnd to GND; the buzzer's + to D8 and - to GND. While a sketch pings, rings of
sound leave T and, when something echoes, come back down onto R; the Trig and Echo wires light with each pulse.

What it does:

- **Set up the mat ▾**: the Nano and its four wires, then the buzzer.
- **Upload sketch ▾**: Ping and print (a wall at 30 cm: "30.02 cm" once a second), Parking beeper (a hand from 1 m to
  5 cm in 12 s; a 50 ms beep every distance x 10 ms, one long tone under 10 cm, the buzzer glowing while it sounds),
  Ping a cushion (soft: mostly "no echo", now and then the wall behind at 183 cm), Nothing in range ("no echo").
- **Model**: each ping is the module's own reading, so the rings and the numbers agree; the beeper works on it.
- **Break it ▾**: Vcc reversed (the MCU burns), Vcc on the Nano's 3V3 pin (faint rings, no echo), the receiver pulled
  (no echo), a cold Echo joint (readings come and go), pulseIn() with no timeout (an empty room reads 655 cm), Vcc
  shorted to Gnd (the Nano's USB fuse trips).

State the host reads: `status`, `power`, `mode`, `matStep`, `rails.VCC`, `sonar.cm`, `sonar.echo`, `sonar.us`,
`sonar.beep`, `readings.BUZ`, `faults`, `missing`. The lesson is `src/content/robotics/hc-sr04.ts`.

Look: Colorfigures palette, warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble, paper grain. Works
on a phone and inside the iynk host (embedded, bare).
