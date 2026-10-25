# Fig. 07 — Autonomous delivery quad (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **690 mm autonomous delivery quadcopter** (ArduPilot Copter 4.7.2,
6S) standing on two carbon landing skids on a pale green cutting mat, with a flat blue cast shadow. It is an X quad,
690 mm motor to motor (motors at ±243.95 mm), on four folding 25 mm carbon-tube arms. Draw every part where a real
build puts it:

- The **frame**: a carbon hub plate 240 x 220 mm held 208 mm up by four legs on two 350 mm skids; four tube arms from
  the hub corners, each with a fold hinge in the palette colour and a small dark latch, and a 52 mm motor mount at the
  end.
- Four **4114 400 KV** motors on the arm ends, and a blue **40 A ESC** halfway out each arm, under the prop. Three
  phase wires to each motor; a red and a black lead from the power board along each arm to its ESC.
- A **power board** on the hub: PCB with four pads, a 5 V 5 A BEC and a 6 V BEC, a blue power module, an XT90-S lead
  out of the back and a 1000 µF capacitor across the battery pads (stripe to minus).
- A grey **Pixhawk 6C** (84.8 x 44 x 12.4 mm, arrow forward, green LED) on a black damping plate in the middle of the
  hub; an **ELRS receiver** with a V antenna at the front right, a **SiK radio** with a whip antenna at the left.
- A **stereo depth camera** (RealSense D435i class) on the nose, level and facing forward, with its two IR windows,
  the IR projector and the colour lens.
- A carbon **top plate** on 40 mm standoffs. On it: a **Raspberry Pi 5** with its fan and USB/Ethernet blocks (a
  3-wire TX/RX/GND lead down to TELEM2, a USB 3 cable to the depth camera), a blue **LTE modem** with two upright
  antennas, an **M10 GPS + compass** puck on a 129 mm carbon mast at the rear (arrow on top, LED flashing blue
  without a fix and green with one), and a **6S 10000 mAh LiPo** strapped along the middle.
- Under the hub: a **servo winch** (drum in the palette colour between two brackets, a black servo), a white line
  down to a **release hook**, a metal **cargo cage** and a **1 kg parcel** labelled "PARCEL 1 KG".
- **15-inch carbon props**, two-blade: CCW on M1 (front right) and M2 (rear left), CW on M3 (front left) and M4 (rear
  right), ArduPilot numbering. List the motors in Mission Planner's motor-test order (A = M1, B = M4, C = M2,
  D = M3) so the bench test spins them the way ArduPilot does.

What it does:

- **Add next part ▾** fits the parts in build order: frame, motors, ESCs, wiring, power board, Pixhawk, receiver,
  telemetry, depth camera, top plate, companion, LTE modem, GPS mast, winch, battery, props. Polarity choices: cap
  stripe to minus or plus, Pixhawk arrow forward or backward, GPS arrow forward or backward (`gps-reversed`), props
  matched or swapped. **Remove**, **Build it for me**, **Take it apart**, **Exploded view** and **Plug / unplug
  battery** work as on every craft; a reversed cap pops on the first plug.
- The engine's three safety tests: **Smoke stopper test**, **Check motor direction** (props off), **Calibrate
  accelerometer**.
- **Calibrate compass** (props off, Pixhawk and GPS fitted), 4 s. With the puck turned round it calibrates and says it
  set COMPASS_ORIENT 4 (auto-rotation), and recommends mounting it arrow forward.
- **Wait for GPS lock** (powered), 5 s: "GPS 1: 3D fix, 18 satellites, HDOP 0.7. EKF3 is using GPS"; the puck LED
  turns green.
- **Winch test** (powered, Pixhawk and winch fitted), 3 s: the parcel drops 3 cm on the line and comes back up.
- **Failsafe test (props off)** (Pixhawk, receiver and telemetry fitted, powered), 2.6 s: the motors idle armed, the
  transmitter goes off, it disarms on the ground; in the air it would RTL.
- A check stays passed until a part it ran on is taken off, re-seated or turned round. The iynk host loads the
  figure with `?fresh=1`, so every check starts unrun there.
- **Wiring sheet**: battery → power board → ESCs → motors; power board → Pixhawk (POWER1) and → Pi (5 V 5 A); Pi →
  Pixhawk TELEM2 (921600); SiK → TELEM1; receiver → TELEM3; GPS → GPS1 (UART + I²C); Pixhawk → ESCs (AUX 1-4
  DShot600); Pixhawk → winch (AUX 5 PWM + 6 V); depth camera → Pi (USB 3); LTE → Pi (USB). Each Pixhawk port gets its
  own point on the block's edge.
- **Options** from the calculator: battery 6S 10000, 6S 16000 or 4S 10000; motors 4114 400 KV, 5010 360 KV or 2814
  700 KV; props 15x5.5, 14x4.8 or 16x5.4.
- **See-through** labels the 40 A ESCs (DShot600), the capacitor (stripe to minus), the power module to POWER1, the
  STM32H743 with 2 IMUs and EKF3, the depth camera, the Pi's 3.3 V UART to TELEM2, the compass far from the amps, the
  PWM winch on AUX5 and the hook that opens on a slack line.

Look: Colorfigures palette (mustard accent; the 'pal' pieces follow the swatch the viewer picks), warm paper, heavy ink
silhouette, finer inner lines. It works on a phone (numbered badges and a label list) and inside the iynk host.
