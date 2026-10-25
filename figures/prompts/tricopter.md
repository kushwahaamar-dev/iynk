# Fig. 12 — 5-inch tricopter (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **5-inch tricopter** (Betaflight TRI mixer, 4S) sitting on a pale
green cutting mat with a 40 mm grid, with a flat blue cast shadow. The frame is a **Y**: a 100 x 64 x 3 mm carbon
centre plate, two front arms on the ±60° diagonals out to motors at (60, ±104) mm, 208 mm apart, and a tail boom back
to the tail motor at (-150, 0). The tail motor sits on a 30 x 30 mm plate in the palette colour, hinged on a block at
the end of the boom so it can rock left and right about the boom. Draw every part where a real tri build puts it:

- Three **2306 2450 KV** motors: M1 on the tail plate (CCW), M2 front right (CW), M3 front left (CCW).
- A **single ESC on each arm** near its motor (Bluejay, zip-tied over heat-shrink), red and black power leads running
  in along the arm to the power board.
- A **metal-gear tail servo** screwed to the side of the boom, its horn towards the tail and a short pushrod up to the
  tilt plate. Its brown, red and orange lead runs forward to the flight controller's S9 pad (servo 5).
- A blue **F405 flight controller with a power board** on the 30.5 mm stack (forward arrow, blue LED). Its three ESC
  signal wires run out along the arms (M1 tail, M2 front right, M3 front left).
- An **XT60 pigtail** out the back of the stack with a 1000 µF 35 V low-ESR capacitor on the battery pads, stripe to
  minus.
- A **micro analog camera** at the nose, tilted up 20° between two side plates in the palette colour.
- An **ELRS receiver** behind the stack on the left (UART2, CRSF, green LED) with a white T dipole, and a **25 mW VTX**
  on the right (red LED) with a lollipop antenna.
- A 94 x 56 mm carbon **top plate** on 30 mm standoffs, a **4S 2200 mAh LiPo** on top with a strap, slid until the
  centre of gravity sits 10 mm behind the frame centre, where the three motors' thrust balances.
- **5-inch tri-blade props** (5x4.3x3, blue).

What it does:

- **Add next part ▾** fits the parts in build order: frame, motors, ESCs, tail servo, motor wires, flight controller,
  XT60 + cap, camera, receiver, VTX, top plate, battery, props. Four parts have a polarity choice: the tail servo
  normal or reversed, the FC arrow forward or backward, the cap stripe to minus or to plus, the props in or swapped
  CW/CCW. The refusals are the real rules (unplug before working on the tri, the stack goes bottom up, the props go on
  after the tail servo and last).
- **Remove a part ▾**, **Build it for me**, **Take it apart**, **Exploded view** and **Plug / unplug battery** work as
  on the other quads: a reversed cap pops and vents when the pack goes in.
- **Smoke stopper test**, **Check motor direction** (props off) and **Calibrate accelerometer** are the engine's three
  safety tests.
- **Tail servo test** needs the servo and the FC fitted, the props off and the pack in. The servo horn swings, the
  pushrod rocks the tail plate and the tail motor with it, and a green arrow along the motor's shaft and a "TAIL TILT
  25° LEFT / RIGHT" pill show which way its thrust points as the yaw stick goes right, then left. A correct servo
  passes ("yaw right tilts the thrust left, the nose swings right"); a reversed one turns the pill red and fails, and
  the mistake goes on to the flying range as a tri that pirouettes on take-off.
- **Failsafe test (radio off)** needs the receiver and FC, the props off and the pack in: after 1.5 s the motors stop
  and the tri disarms (DROP).
- **Wiring sheet**: battery → XT60 + cap → ESCs (VBAT) → motors (3-phase x3), FC → ESCs (DShot600), FC → tail servo
  (PWM + 5 V), receiver → FC (UART2 CRSF), camera → FC (CAM pad), FC → VTX (video + OSD, SmartAudio).
- **Options** from the iynk calculator change the drawing: battery 4S 2200, 4S 1800 or 4S 1500; motors 2306 2450 KV,
  2207 2150 KV or 2205 2300 KV; props 5x4.3x3, 6x4x2 or 5x5x3, each with its own size or colour.
- **See-through** fades the top plate and battery and labels what is inside: stator 23 x 6 mm, servo 5 on the S9 pad,
  F405 + PDB with the TRI mixer, camera at 20° up, ELRS on UART2 CRSF, Raceband at 25 mW.

Look: Colorfigures palette (mint accent), warm paper, heavy ink silhouette, finer inner lines. It works on a phone
(numbered badges and a label list) and inside the iynk host, which sets the design options and runs the tests.
