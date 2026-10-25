# Fig. 02 — Tiny Whoop 65 mm (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **65 mm 1S brushless Tiny Whoop** (Betaflight) sitting on a pale
green cutting mat with a flat blue cast shadow. It is drawn at whoop scale: the whole craft fits in a 108 mm square
of mat. The frame is one moulded polypropylene part in the craft colour (mint): four 34.9 mm ducts, 14.5 mm tall,
round a centre floor, with the motors 65 mm apart across the diagonal (±23 mm on each axis). Draw every part where a
real whoop puts it:

- Four **0702 25000 KV** brushless outrunners on round mounts at the bottom of each duct. Each has a 9.5 mm bell, a
  1 mm shaft and a 1.6 mm base flange held by three M1.4 screws, and three thin phase wires that end in a JST1.25
  plug.
- A 29 x 29 mm black **5-in-1 AIO board** on four rubber grommet posts over the duct rims (26 x 26 mm holes). It
  carries the STM32G473 flight controller and ICM-42688-P gyro, four 5 A ESC channels (Bluejay), an ExpressLRS
  2.4 GHz receiver on UART3, the OSD chip and a 5.8 GHz VTX under an aluminium can on UART2. It also has the forward
  arrow on the silkscreen, a blue status LED, the CAM pads at the front and the two battery pads at the rear.
- The four **motor plugs** in the JST1.25 sockets, one in each corner of the AIO.
- A short **BT2.0 battery pigtail** (26 AWG, red and black) soldered to the AIO's + and - pads at the rear. It has
  no capacitor: on a 1S whoop the mistake to show is a lead soldered the wrong way round.
- A black **VTX antenna** that leans up and back, and a white **ELRS antenna** led back and out between the rear
  ducts.
- A thin white moulded **canopy** that snaps over the AIO, with the two antennas through their slots.
- A 14 mm **nano FPV camera** in the canopy nose at 25° uptilt, its 5 V, ground and video wires to the CAM pads.
- A **1S LiHV pack** slid into the holder rails under the frame with its BT2.0 plug at the rear. The picker offers
  1S 300 (black), 1S 450 HV (blue) and 2S 300 (two cells in series, yellow).
- **31 mm press-fit props** (4-blade translucent blue by default) fitted "props in": M1 rear right CW, M2 front
  right CCW, M3 rear left CCW, M4 front left CW. The leading edge of each blade is raised in its spin direction.

What it does:

- **Add next part ▾** fits the parts in build order: ducted frame, motors, AIO board, motor plugs, BT2.0 lead, VTX
  antenna, ELRS antenna, canopy, camera, battery, props. Three parts have a polarity choice: AIO arrow forward or
  backward, BT2.0 lead red to + or red to - (reversed), props in or swapped CW/CCW. The refusals are the real rules:
  - "Unplug the battery first: never work on a live quad"
  - "Props go on LAST: run the smoke stopper test and the motor direction check first"
- **Remove a part ▾** takes off any part that has nothing fitted on top of it.
- **Build it for me** and **Take it apart** run the same steps part by part, with drop and lift animations.
- **Plug / unplug battery** needs the pack, the lead and the VTX antenna ("never power a VTX without its antenna").
  If the lead is reversed it goes POP: the reversed pack burns the AIO input, and the message says a smoke stopper
  would have caught it. Otherwise the ESCs beep ready and the AIO and VTX LEDs light.
- **Smoke stopper test**: a stopper box on the mat between the pack and the lead. Its lamp blinks once when the lead
  is right and stays lit when it is reversed.
- **Check motor direction**: only with the props off. It spins M1 to M4 one at a time, each with an arrow and a pill.
  After each plug job one motor spins the wrong way; the fix is the motor's direction in the Bluejay settings, not a
  re-solder.
- **Calibrate accelerometer**: on a level surface. With the AIO arrow backwards it passes but warns that the whoop
  will flip on take-off (`align_board_yaw = 180`).
- **Receiver test** (craft button): with the AIO, the ELRS antenna and a pack plugged in, the sticks and AUX1 to AUX3
  move in the receiver tab. It reports `rxtest` as passed.
- **Failsafe test** (craft button): props off, pack in, radio off: RXLOSS, and the motors stop (DROP). It reports
  `failsafe` as passed until the props go back on.
- **Wiring sheet** is a hand-inked block diagram: battery → BT2.0 lead → AIO VBAT pads → motor plugs → motors
  (3-phase x4), camera → AIO (video + 5 V), AIO → ELRS antenna (UART3 CRSF) and AIO → VTX antenna (UART2
  SmartAudio). Clicking a block selects the same part as in the 3D view, and parts that are not fitted are dashed.
- **Options** from the iynk calculator change the drawing: the three packs, motors of 23000, 25000 or 27000 KV,
  and 31 mm props with 4, 3 or 2 blades, each with its own colour.
- **Exploded view** lifts each part by its stack level.
- **See-through** fades the canopy and shows what is inside, with callouts: G473 MCU + GYRO, 4 X 5 A ESC, ELRS RX,
  UART3, VTX, SMARTAUDIO, JST1.25 PLUGS, 7 MM STATOR 9N12P, VBAT 1S, 26 AWG and LIHV CELL 4.35 V.
- **Labels** names the main parts.

Look: Colorfigures palette (mint craft colour, chosen with the colour swatches), warm paper, heavy ink silhouette,
finer inner lines, hand-drawn wobble, paper grain. It works on a phone (numbered badges and a label list) and inside
the iynk host, embedded and bare. The host can set the design options, the build step and the test to run, and it
receives the build state (the two craft tests as `state.extra.rxtest` and `state.extra.failsafe`), part clicks and
button presses.
