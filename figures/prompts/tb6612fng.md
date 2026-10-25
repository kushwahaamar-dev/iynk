# Fig. 05 — TB6612FNG motor driver (Robotics Bench, Colorfigures prompt)

Make a colourful, hand-inked isometric bench figure on the pale green cutting mat with a flat blue cast shadow, cobalt
palette accent. In the middle the **SparkFun TB6612FNG breakout** the learner builds (figures/modules/tb6612fng.js:
red 20.3 mm square, the SSOP-24 driver, C1 and C2 0.1 µF, the C3 10 µF tantalum, JP1 and JP2 1 x 8 headers). On the
mat around it: an **Arduino Nano** in front on the right, a **2S LiPo** on the left by JP1, and two **TT gear motors**
behind it with their wheels at the back. Jumpers: JP2 to the Nano (PWMA D5, AIN2 D8, AIN1 D7, STBY D9, BIN1 D10, BIN2
D11, PWMB D6, GND), VCC to the Nano's 5V, A01/A02 to motor A, B01/B02 to motor B, VM and GND to the pack.

What it does:

- **Set up the mat ▾**: the Nano with its wires, then the motors, then the pack, one step at a time, never live.
- **Upload sketch ▾**: Forward 50%, Forward 100%, Reverse, Brake, Coast, Standby. The model drives each bridge from
  IN1, IN2, PWM and STBY (Toshiba truth table), gives each motor duty x (VM − I x 0.5 Ω) and runs the TT motor model
  on that: about 3.7 V and 126 rpm at 50%, 7.3 V and 270 rpm at 100%, the pack sagging through 0.1 Ω. Brake stops
  the wheels hard, coast lets them spin down, standby turns every output off.
- It reports `state.levels` (STBY, AIN1, AIN2, PWMA, BIN1, BIN2, PWMB) for the host's status table, and each motor's
  and the pack's readings for their drawings; the stats panel shows both motors and the battery.
- **Break it ▾**: C3 backwards, the LiPo backwards, a 4S pack (16.8 V on a 15 V part), the motors on the Nano's 5 V
  (brown-out), a cold joint on JP2 (STBY drops out), U1 left out.
- **See-through**: the module's own: the die and its bond wires, each bridge's switches lit as they conduct, current
  on VM, PWMA, PWMB, STBY and the motor outputs.

State the host reads: `status`, `power`, `mode`, `matStep`, `rails.VM`, `rails.VCC`, `levels.*`, `faults`, `missing`,
`readings`. The lesson is `src/content/robotics/tb6612fng.ts`; the facts are `docs/facts/tb6612.md`.

Look: Colorfigures palette, warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble, paper grain. Works
on a phone and inside the iynk host (embedded, bare).
