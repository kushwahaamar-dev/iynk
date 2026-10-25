# Fig. 10 — VTOL tiltrotor QuadPlane (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **tilt-tricopter QuadPlane** (ArduPlane 4.7.2, 4S Li-ion) sitting
on a pale green cutting mat with a 40 mm grid, with a flat blue cast shadow of the wing, the pod and the tail. Origin
on the mat under the pod, x to the nose, y left, z up, mm. Draw every part where a real build of this kind puts it:

- A **370 x 90 x 80 mm foam pod** (x -140 to 230) standing 44 mm up on two wire skids at y ±66, with a short faceted
  nose to x 262, a rear deck behind the wing, and a plywood tray high in the nose bay for the electronics. A **carbon
  boom** runs back from the pod to x -515, on a small tail stand.
- A straight **1200 x 195 mm foam wing** on top of the pod (leading edge x 120, trailing edge x -75, a flat-bottomed
  section 7 % thick), in the palette colour, with an **aileron** on each outer panel (servos underneath, S9 and S10),
  a carbon spar, and the **CG marks** at a quarter of the chord (x 71). The wing is bigger than the 840 x 150 mm one
  the original drew: that one could not carry 1.6 kg.
- A **V-tail** at the end of the boom, two fins 35° above level with darker ruddervators, each on its own servo
  (S7, S8).
- Two **front nacelles** under the wing at y ±230, each with a metal-gear **tilt servo** on its inboard side driving a
  horn, a pushrod and a lever on the motor's mount plate. The pivots sit at (175, ±230, 136), 55 mm ahead of the
  leading edge, so the motors swing from straight up (hover) to straight forward (cruise).
- Three **2810 1000 KV** motors: M1 front right (clockwise from above) and M2 front left (counter-clockwise) on the
  tilting mounts, M4 on a fixed plate on the boom at x -300 (clockwise). ArduPilot's tri has no M3.
- **Three 40 A ESCs** in orange heat-shrink: two on the outside of the nacelles, one on the boom by the rear motor,
  their power leads running from the pod (along the walls, out under the wing) and their phase wires crossing each
  tilt pivot in a slack loop.
- A black **Matek H743-WING** on four standoffs on the tray (arrow to the nose, "H743" chips), an **ELRS receiver**
  beside it with its T antenna out of the pod's left wall.
- An **XT60** behind the battery bay with its lead along the right wall to the FC's battery pads, and a **1000 µF 35 V**
  capacitor across the pads, stripe to minus.
- An **M10 GPS puck** on a 50 mm mast on the boom behind the wing, its lead in through the pod's rear wall.
- An **analog camera** in the nose at 8° up, its coax to the FC, and an **800 mW VTX** with a lollipop antenna on the
  rear deck.
- A **pitot tube** under the right wing at y -420 (outside the right rotor's wash), its tip ahead of the leading edge,
  two silicone tubes along the underside into the pod to a blue **ASPD-4525** board on I2C.
- A green **4S2P Li-ion 8000 mAh** pack on a grip pad under a strap, centred on the CG marks, and a foam **hatch** with
  a latch over the nose bay.
- **9x5 two-blade props**, beige, on all three motors.

What it does:

- **Add next part ▾** fits the parts in build order: fuselage, V-tail, flight controller, XT60 + cap, GPS, camera,
  wing, airspeed sensor, tilt servos, motors, ESCs, motor wires, battery, hatch, props. Four parts have a polarity
  choice: the FC arrow to the nose or backwards, the cap stripe to minus or to plus, the tilt servos checked or
  reversed, the props correct or swapped CW/CCW. The refusals are the real order (the nacelles hang under the wing,
  the hatch shuts over the battery and the airspeed board, the props go on last).
- **Remove a part ▾**, **Build it for me**, **Take it apart**, **Exploded view** and **Plug / unplug battery** work as
  on the other crafts; a reversed cap pops when the pack goes in.
- **Smoke stopper test**, **Check motor direction** (props off) and **Calibrate accelerometer (6 positions)** are the
  engine's three safety tests.
- **Tilt servo test** needs the tilt servos and the FC, the props off and the pack in. MANUAL swings both nacelles
  forward at 90°/s, QSTABILIZE brings them back up at 25°/s (Q_TILT_RATE_UP), then a yaw-right input tips the left
  rotor forward and the right one back by 10° (vectored yaw). The motors, props and mount plates turn with the
  nacelles (the engine's motor pose), green thrust arrows follow the shafts and a pill shows the mode and the angle. A
  reversed servo set tilts the rotors back instead, turns the pill red and fails, and the mistake goes on to the flying
  range as a craft that flips once the wing takes over.
- **Check airspeed** needs the airspeed sensor and the FC and the pack in: puffs of breath go into the pitot and an
  "AIRSPEED 7.6 M/S" pill rises and falls back to about 0.
- **Pre-arm checks** needs the FC, the GPS and the airspeed sensor, the props off and the pack in: it fails with
  "PreArm: 3D Accel calibration needed" until the accelerometer is calibrated, then arms (motors idle) and disarms.
- **Wiring sheet**: battery → XT60 + cap → ESCs (VBAT x3) → motors (3-phase x3); FC → ESCs (DShot600 S3-S5), FC → tilt
  servos (S1 S2), FC → V-tail (S7 S8), FC → ailerons (S9 S10), GPS → FC (UART + I2C), airspeed → FC (I2C), camera + VTX
  → FC (video).
- **Options** from the SimLab calculator change the drawing: battery 4S2P Li-ion 8000, 4S LiPo 5000 or 6S LiPo 4000;
  motors 2810 1000 KV, 2814 700 KV or 2306 2400 KV (racing); props 9x5, 10x5 or 7x4, each with its own size or colour.
- **See-through** fades the pod's walls, the wing and the hatch and labels what is inside: the FC's output map, the
  cap's rating, the airspeed board on I2C, the pack on the CG.

Look: Colorfigures palette (cobalt accent), warm paper, heavy ink silhouette, finer inner lines. It works on a phone
(numbered badges and a label list) and inside the SimLab host, which sets the design options and runs the tests.
