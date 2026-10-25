# Fig. 04 — 7-inch long-range quad (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **7-inch long-range FPV quadcopter** (Betaflight 2026.6, 6S
Li-ion, GPS Rescue) sitting on a pale green cutting mat with a flat blue cast shadow. The frame is a True-X carbon
frame, 315 mm motor to motor across the diagonal: the four motors sit on the corners of a square at ±111.4 mm from
the centre, on 6 mm carbon arms 13 mm wide, round a 132 x 52 mm body plate with the 30.5 mm stack in the middle.
Draw every part where a real build puts it:

- Four **2807 1300 KV** outrunners (33.5 mm bells, 12N14P stators) at the arm tips.
- A black 44 mm **50 A 4-in-1 ESC** (AM32, 12 MOSFETs) on the stack, battery pads at the rear.
- The **motor wires**, three per motor, along the arms to the ESC pads.
- The yellow **XT60 lead** out of the rear and a **1000 µF 35 V** low-ESR capacitor across the ESC battery pads,
  stripe on the negative leg.
- Above the ESC, a blue **F722 flight controller** with gyro and barometer, the forward arrow on the silkscreen, a
  blue status LED and a USB socket.
- On top of the stack, a **5.8 GHz 1 W VTX** with a red LED and a stubby antenna out of the back.
- A 19 mm **analog FPV camera** between two side plates at the nose, tilted up 20°, its video wire to the FC.
- An **ExpressLRS 900 MHz diversity receiver** at the rear with its two-element T-antenna, wired to UART2.
- A 2 mm carbon **top plate** on four 30 mm standoffs, with a printed TPU **GPS mast** at the rear that leans back
  22° and ends in a level platform.
- The **M10 GPS + QMC5883L compass** module (20 x 20 mm, ceramic patch, green LED, arrow to the nose) flat on the
  mast's platform.
- A **6S1P 21700 Li-ion pack** (a 3 x 2 bundle of cells, 71 x 65 x 44 mm) on a grip pad under a strap. The picker
  offers 6S1P 21700 (teal), 6S1P P50B (purple) and a flat 6S 1800 LiPo (black).
- **7-inch bi-blade props** (7x3.5, translucent blue) fitted "props in": M1 rear right CW, M2 front right CCW, M3
  rear left CCW, M4 front left CW.

What it does:

- **Add next part ▾** fits the parts in build order: frame, motors, ESC, motor wires, XT60 + cap, flight
  controller, VTX, camera, receiver, top plate, GPS, battery, props. Four parts have a polarity choice: cap stripe
  to minus or to plus, FC arrow forward or backward, GPS arrow forward or backward, props in or swapped.
- **Remove a part ▾**, **Build it for me** and **Take it apart** work part by part, with drop and lift animations.
- **Plug / unplug battery**: a cap in backwards goes POP. Otherwise the ESCs play their tones and the FC, VTX,
  receiver and GPS LEDs light (GPS LED solid: searching).
- **Smoke stopper test**, **Check motor direction** (props off only) and **Calibrate accelerometer** are the engine's
  three checks.
- **Calibrate compass** (craft button): needs the GPS module. It turns the quad through every axis; with the module
  arrow forward the heading agrees with a phone compass, with it backwards the heading reads 180° off.
- **GPS lock (outdoors)** (craft button): a 3D fix with 14 satellites (8 needed to arm); the LED blinks once a second.
- **Failsafe test (props off)** (craft button): needs the receiver and GPS, props off, the battery in, a calibrated
  accelerometer and a GPS fix (otherwise "Arming blocked: NO_ACC_CAL" or "Arming blocked: GPS"). Radio off: RXLOSS,
  1.5 s later GPS RESCUE on the OSD and SOS beeps; with the GPS backwards the home arrow points away from home.
- The craft checks are reported in the state (`extra.compassOk`, `extra.compassBack`, `extra.gpsFix`, `extra.sats`,
  `extra.failsafeOk`, `extra.rescue`) and hold only while the parts they ran on stay seated the same way.
- **Wiring sheet**: battery → XT60 + cap → 4-in-1 ESC → motors (3-phase x4), FC → ESC (DShot600 x4), receiver → FC
  (UART2 CRSF), GPS + compass → FC (UART3 + I2C), camera → FC (video in) and FC → VTX (video + SmartAudio).
- **Options** from the iynk calculator: the three packs; 2807 1300 KV, 3008 1100 KV or 2807 1700 KV motors; and
  7x3.5 bi-blade, 7.5x3.7 bi-blade or 7x4 tri-blade props, each in its own colour.
- **Exploded view** lifts each part by its stack level.
- **See-through** fades the top plate and the battery and names what is inside: STATOR 12N14P, MOSFETS x12,
  1000 µF CAP, GYRO + BARO, VTX 1 W, CAM 20° UP, ELRS 900 MHZ, GPS + COMPASS and 6 CELLS, 6S.
- **Labels** names the main parts.

Look: Colorfigures palette (mint craft colour, chosen with the colour swatches), warm paper, heavy ink silhouette,
finer inner lines, hand-drawn wobble, paper grain. It works on a phone (numbered badges and a label list) and inside
the iynk host, embedded and bare.
