# Fig. 03 — Transistor switch: a Nano drives a motor (Robotics Bench, Colorfigures prompt)

Make a colourful, hand-inked isometric bench figure on the pale green cutting mat with a flat blue cast shadow,
mustard palette accent: an **Arduino Nano** (the board the learner builds: SMD parts, then its two pin headers) in
front, a half-size breadboard beside it, and behind the breadboard a **TT gear motor** on its wooden block and an
open **4 x AA holder**. On the breadboard: a green LED with its 1 kΩ resistor showing what pin 9 does, a 1 kΩ base
resistor from pin 9 to a **TIP120** Darlington standing in the board, a **1N4007** flyback diode across the motor
leads (band toward +), the motor's red lead on the battery's + rail and its black lead on the collector, and the
emitter on the ground rail. Jumpers: pin 9 to the base resistor, the Nano's GND to the LED, and the Nano's GND to the
battery's - rail (the common ground).

What it does:

- **Upload sketch ▾**: Input HIGH (pin 9 HIGH: the motor runs), PWM 50% (analogWrite(9, 128): 490 Hz, half the
  average voltage), Input LOW (it coasts to a stop), Soft start (0 to 255 in about 2 s, the duty printed once a
  second). The Nano prints one line when each starts.
- **Circuits** for the build and the tasks: stage-drive (LED, resistors and the TIP120 only), stage-motor (plus the
  motor and D1), bench (plus the battery and the common ground), speed-knob (a 10 kΩ pot on A0), toggle-button (a
  button on D2).
- The model reports what a meter would read: `meas.Q1` (drive, base current, collector current, VCE, power, the
  collector's peak voltage at switch-off and the junction temperature), `meas.M1` (volts, current, rpm, its supply),
  `meas.BT1` (pack volts and current) and `meas.D1`. The base current is (5 V − 1.3 V) / 1 kΩ, about 3.7 mA; the
  TIP120 saturates at about 0.7 V, so the motor sees about 5.6 V of the pack's 6.3 V and turns at about 200 rpm.
- **Break it ▾**: no flyback diode (the collector spikes to 60 V on every PWM edge and the TIP120 fails short), the
  diode backwards (it shorts the pack whenever the TIP120 is on, then burns open), the TIP120 backwards (it never
  turns on), no common ground, no base resistor (pin 9's output stage burns out), the motor straight on pin 9 (it
  twitches and the pin dies), the motor on the Nano's 5 V (brown-out loop), the battery leads swapped, Li-ion cells in
  the AA holder (the motor races and burns), a cold joint on the motor tab (it stutters), the wheel held (the stall
  current heats the TIP120). The shortened status line on the stats panel names each.
- **Strip, Pick & place, Place a part ▾, Solder joints**: the Nano's factory build; then the breadboard circuit stage by
  stage (stage-drive, stage-motor, bench).

State the host reads: `status`, `power`, `mode`, `circuit`, `faults`, `meas.Q1.*`, `meas.M1.*`, `meas.BT1.*`,
`meas.D1`, `meas.LED1`, `readings`. The lesson is `src/content/robotics/transistor-switch.ts`; the facts are
`docs/facts/la-components.md` (§11 TIP120, §13 TT motor) and `docs/facts/nano.md`.

Look: Colorfigures palette, warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble, paper grain. Works
on a phone and inside the iynk host (embedded, bare).
