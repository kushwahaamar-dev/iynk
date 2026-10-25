# Fig. 08 — Agricultural spray hexacopter (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **10 L agricultural spray hexacopter** (ArduPilot Copter 4.7.2,
12S) standing on two carbon skids on a pale green cutting mat, with a flat blue cast shadow. It is a Hexa X, 1800 mm
motor to opposite motor (motors 900 mm from the centre, every 60°, the first pair ±30° either side of the nose). Draw
every part where a real build puts it:

- The **frame**: a carbon sandwich hub 480 x 420 x 20 mm held 470 mm up by four carbon legs on two 940 mm skids, with a
  brace between each pair of legs; six 35 mm carbon-tube arms from r = 200 mm, each with a fold joint at r = 300 mm
  (a sleeve in the palette colour and a dark lock ring) and a dark clamp at the arm end that holds the motor.
- Six **8120 100 KV** motors (Hobbywing X8 class) on the arm ends, and under each one the **80 A FOC ESC** in a dark
  finned pod. A red and black 12 AWG pair and a white PWM lead along every arm, from the power board and the Cube.
- A **power board** on the back of the hub: PCB with four pads, a blue power brick, the yellow **AS150U** anti-spark
  lead out of the back and a 63 V capacitor across the pads (stripe to minus).
- An orange **Cube Orange+** on its black carrier board at the front of the hub (arrow forward, green LED), a dark
  **900 MHz radio** at the right with a whip antenna hanging under the hub.
- A downward **radar** (Ainstein US-D1 class: a cream box with a white dome) under the nose.
- A mint **canopy** over the electronics, in four stepped layers, with a small **FPV camera** in its nose tilted 10°
  down.
- Two **RTK GNSS** antennas (cream pucks labelled GPS1 and GPS2) on 200 mm carbon masts at the left of the canopy,
  340 mm apart along the body: GPS1 in front. Their LEDs flash blue with no fix and green with RTK fixed.
- A **10 L tank** (320 x 260 x 332 mm, off-white, a blue sight strip showing the level, a filler cap) strapped under
  the hub; a blue **diaphragm pump** and its driver behind it with a clear hose from the tank; an aluminium **boom**
  1640 mm across under the tank on two brackets, a hose along it and four **nozzles** (dark bodies, red tips) at
  ±300 and ±720 mm.
- A **12S 22000 mAh smart pack** with a handle on top of the canopy; plugged in, its AS150U lead runs to the power
  board.
- **30-inch two-blade folding props**: CW on M1, M3 and M6, CCW on M2, M4 and M5, ArduPilot numbering. List the motors
  in Mission Planner's motor-test order, clockwise from the front right (A = M5, B = M1, C = M4, D = M6, E = M2,
  F = M3), so the bench test spins them the way ArduPilot does.

What it does:

- **Add next part ▾** fits the parts in build order: frame, motors, ESCs, wiring, power board, Cube, radio, radar,
  canopy, RTK masts, tank, pump, boom, battery, props. Polarity choices: cap stripe to minus or plus, Cube arrow forward
  or backward, GPS1 at the front or the back (`gps-swapped`), props matched or swapped. **Remove**, **Build it for
  me**, **Take it apart**, **Exploded view** and **Plug / unplug battery** work as on every craft; a reversed cap pops
  on the first plug. The engine's messages are reworded for a 50 V PWM drone (a wrong motor is fixed by swapping two
  motor wires).
- The engine's three safety tests: **Smoke stopper test** (the stopper box sits behind the drone, between the rear
  props), **Check motor direction** (props off), **Calibrate accelerometer**.
- **Pump test (disarmed)** (Cube, tank, pump and boom fitted, powered), 4 s: the pump runs at SPRAY_PUMP_RATE and a
  flat fan of droplets sprays from every nozzle.
- **RTK fix and GPS yaw** (Cube, masts and radio fitted, powered), 5 s: with GPS1 in front, RTK Fixed and the heading
  matches the nose; with the masts swapped, the heading reads 180° out ("EKF3 Yaw inconsistent").
- **Pre-arm checks** (powered), 1.5 s: refuses with the real PreArm line for a missing radar, no GPS yaw or an
  uncalibrated accelerometer, and passes when they are all done.
- A check stays passed until a part it ran on is taken off, re-seated or turned round. The SimLab host loads the
  figure with `?fresh=1`, so every check starts unrun there.
- **Wiring sheet**: battery → power board (AS150U) → ESCs → motors; power board → Cube (POWER1) and → pump (12S);
  Cube → ESCs (MAIN 1-6 PWM) and → pump (AUX1 SprayerPump); radio → TELEM1 + RCIN; RTK pair → GPS1 + GPS2;
  radar → TELEM2.
- **Options** from the calculator: battery 12S 22000, 12S 16000 or 14S 30000; motors 8120 100 KV, 10025 80 KV or
  6215 180 KV; props 30x9.9, 28x9.2 or 32x11.
- **See-through** labels the fold joint's lock, the FOC ESC's PWM range, the capacitors (stripe to minus), the power
  brick to POWER1, the STM32H757 with 3 IMUs and EKF3, the radar's 0.5 m minimum, the moving baseline (GPS yaw, no
  compass), the pump on AUX1 (SERVO9 = 22) and the nozzle positions.

Look: Colorfigures palette, mint by default (the 'pal' pieces follow the swatch the viewer picks), warm paper, heavy
ink silhouette, finer inner lines. It works on a phone (numbered badges and a label list) and inside the SimLab host.
