# Fig. 06 — GPS camera drone (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of an **F450-class GPS camera quadcopter** (ArduPilot Copter 4.7.2, 4S)
standing on its landing gear on a pale green cutting mat, with a flat blue cast shadow. It is an X quad, 450 mm motor
to motor (motors at ±159.1 mm), with four moulded arms between two plates. Draw every part where a real build puts it:

- **Landing gear**: two skid tubes with rubber end caps on four legs that lift the bottom plate to 120 mm, and a
  battery tray between the legs.
- The **F450 frame**: the bottom plate is a black power-distribution PCB (battery pads at the rear, a plus and minus
  pad at each arm root, "F450 PDB" silkscreen). The two front arms are in the palette colour, the rear two white.
- Four **2212 920 KV** motors on the arm ends and a blue **30 A ESC** zip-tied on each arm. Three phase wires run to
  each motor, and red and black leads run down to the arm-root pads.
- A **PM02 power module** at the rear of the bottom plate. Its XT60 lead hangs out the back, a low-ESR capacitor sits
  across the battery pads (stripe to minus), and a 6-pin lead runs up to the Pixhawk's POWER1.
- A carbon **top plate**. On it, on a foam pad, a grey **Pixhawk 6C** (84.8 x 44 x 12.4 mm, arrow forward, green LED),
  with four orange ESC signal leads into MAIN OUT 1-4 at its rear.
- An **M10 GPS + compass puck** on a folding aluminium mast at the rear, with an arrow on top and a status LED that
  flashes blue with no fix and green with a 3D fix.
- A **SiK telemetry radio** with an upright antenna at the left rear, and an **ELRS receiver** with a T antenna at the
  right rear, wired to TELEM1 and TELEM2.
- A **2-axis brushless gimbal** under the nose on a damped plate (four mustard rubber balls), with a roll motor, a
  yoke, a pitch motor and a small camera. Its signal lead runs up to the Pixhawk's AUX outputs.
- A **4S 5000 mAh LiPo** strapped to the tray, and **10-inch two-blade props**: CCW on M1 (front right) and M2 (rear
  left), CW on M3 (front left) and M4 (rear right), ArduPilot numbering.

What it does:

- **Add next part ▾** fits the parts in build order: landing gear, frame, motors, ESCs, wiring, power module, top plate,
  Pixhawk, GPS + compass, telemetry, receiver, gimbal, battery, props. Polarity choices: power-module cap stripe to
  minus or plus, Pixhawk arrow forward or backward, GPS arrow forward or backward (`gps-reversed`), props on the right
  motors or swapped. **Remove**, **Build it for me**, **Take it apart**, **Exploded view** and **Plug / unplug battery**
  work as on every craft; a reversed cap pops on the first plug.
- The engine's three safety tests: **Smoke stopper test**, **Check motor direction** (props off), **Calibrate
  accelerometer**.
- **Calibrate compass** (props off, Pixhawk and GPS fitted): six dots round the puck light as each side is sampled
  over 4 s. With the puck turned round it still calibrates but warns that compass and GPS disagree by 180°.
- **Wait for GPS lock** (powered): the satellite count climbs over 6 s to "3D fix, 14 satellites, HDOP 0.8" and the
  puck LED turns green.
- **Failsafe test (props off)**: armed on the bench, transmitter off: landed, so it disarms. In the air it would RTL.
- **Gimbal test** (powered): the camera pitches to -90° (straight down), up to +25° and back while roll stays level.
- **Pre-arm checks** (powered) names the first problem as ArduPilot does: "3D Accel calibration needed", "Compass not
  calibrated", "Compasses inconsistent", "RC not found", "GPS 1: Bad fix", or passes.
- A check holds only for the parts it ran on: re-seating the GPS clears its compass calibration and fix, the
  Pixhawk its fix, failsafe and gimbal checks, the receiver its failsafe check, the gimbal its sweep; taking the drone
  apart clears every check.
- **Wiring sheet**: battery → power module → ESCs → motors, power module → Pixhawk (POWER1), Pixhawk → ESCs (MAIN 1-4
  DShot600), GPS → Pixhawk (GPS1 UART + I²C), telemetry → TELEM1 (MAVLink2), receiver → TELEM2 (CRSF), Pixhawk →
  gimbal (AUX 1-2 PWM).
- **Options** from the calculator: battery 4S 5000, 4S 3300 or 3S 5000; motors 2212 920 KV, 2216 880 KV or 2212
  1400 KV; props 10x4.5, 11x4.7 or 9.4x5.0.
- **See-through** labels the PCB power plate, stator 12N14P, 30 A ESC on the arm, 3 phase wires, PM02 V + I sense,
  STM32H743 + 2 IMUs, M10 GPS + compass, MAVLink2 TELEM1, CRSF on TELEM2, gimbal motors and LiPo cells.

Look: Colorfigures palette (cobalt accent), warm paper, heavy ink silhouette, finer inner lines. It works on a phone
(numbered badges and a label list) and inside the SimLab host, which loads it with `?fresh=1` so every check starts
unrun.
