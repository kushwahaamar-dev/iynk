# Fig. 01 — 5-inch freestyle quad (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **5-inch freestyle FPV quadcopter** (Betaflight, 6S) sitting on a
pale green cutting mat with a 40 mm grid, with a flat blue cast shadow. The frame is a true-X carbon frame, 225 mm
motor to motor: the four motors sit on the corners of a square at ±79.5 mm from the centre. It has 5 mm carbon arms,
14 mm wide with round motor pads, and a 112 x 46 mm centre plate. Draw every part where a real build puts it:

- Four **2306 1750 KV** outrunners on 16 x 16 mm mounts. Each has a 27.9 mm red bell with three spokes and three
  silicone phase wires (all one colour) running along the arm to the ESC pads.
- A 40 x 40 mm **45 A 4-in-1 ESC** (AM32 firmware). It has twelve MOSFETs, an AT32 MCU and the battery pads at the
  rear, on four short spacers on the 30.5 x 30.5 mm stack.
- Above it on rubber grommets, a 37 x 37 mm blue **F405 flight controller**. It carries an STM32F405 MCU, an
  ICM-42688-P gyro and an AT7456E OSD, plus the forward arrow on the silkscreen, a blue status LED and a USB socket
  on the left side. The 8-pin ESC harness (VBAT, current, M1-M4) loops down to the ESC.
- On top of the stack, a 30 x 30 **5.8 GHz analog VTX** with an aluminium shield can and a red LED. Its coax runs to
  a lollipop antenna that leans out of the rear.
- A 19 mm micro **analog FPV camera** at the nose with 30° uptilt, between two side plates. Its video wire runs back
  to the FC.
- An **ExpressLRS 2.4 GHz** nano receiver at the rear of the bottom plate, wired to UART2 (CRSF). Its two dipole
  antennas sit at 90° to each other.
- The **XT60 pigtail** (yellow, male on the quad) out of the rear. A 1000 µF 35 V low-ESR capacitor sits across the
  battery pads, with its stripe on the negative leg.
- A 2 mm carbon **top plate** on four 27.5 mm M3 standoffs. It carries a **6S 1100 mAh LiPo** (black, "6S 1100" and
  "22.2 V" printed on top) on a grip pad, with a strap and a pull tab.
- **5-inch tri-blade props** (5x4.3x3, translucent blue) fitted "props in". As Betaflight numbers them: M1 rear right
  CW, M2 front right CCW, M3 rear left CCW, M4 front left CW. The leading edge of each blade is raised in its spin
  direction.

What it does:

- **Add next part ▾** fits the parts in build order: frame, motors, 4-in-1 ESC, motor wires, flight controller,
  XT60 + cap, camera, receiver, VTX, top plate, battery, props. Three parts have a polarity choice: FC arrow forward
  or backward, cap stripe to minus or to plus, props in or swapped CW/CCW. The refusals are the real rules:
  - "Unplug the battery first: never work on a live quad"
  - "FLIGHT CTRL goes on after 4-in-1 esc"
  - "Props go on LAST: run the smoke stopper test and the motor direction check first"
- **Remove a part ▾** takes off any part that has nothing fitted on top of it ("Take the receiver off first").
- **Build it for me** and **Take it apart** run the same steps part by part, with drop and lift animations. Build it
  for me also re-seats parts fitted the wrong way round and swaps a vented cap for a new one.
- **Plug / unplug battery**: if the cap is in backwards it goes POP. It vents, turns brown and smokes, and the
  message says a smoke stopper would have caught it. Otherwise the ESCs beep ready and the FC and VTX LEDs light.
- **Smoke stopper test**: a stopper box on the mat sits between the battery and the XT60. Its lamp blinks once when
  the wiring is good and stays lit when something is shorted (a reversed cap).
- **Check motor direction**: only with the props off. With the props on it refuses: "PROPS OFF! Never spin motors on
  the bench with props on". It plugs in through the normal plug and spins M1 to M4 one at a time, each with an
  arrow and a pill showing its number and direction. After each re-wiring job, one motor (M3 the first time) spins
  the wrong way. The fix is to set that motor's direction in the ESC configurator, not to re-solder it.
- **Calibrate accelerometer**: the quad must sit level on the mat. The FC LED blinks and a LEVEL pill shows. If the
  FC arrow points backwards, calibration still passes but warns that it will flip on take-off (`align_board_yaw =
  180`).
- **Wiring sheet** is a hand-inked block diagram: battery → XT60 + cap (22.2 V) → 4-in-1 ESC (VBAT) → motors
  (3-phase x4), FC → ESC (DShot600), receiver → FC (UART2 CRSF), and camera → FC → VTX (video). Dots run along the
  live wires. Clicking a block selects the same part as in the 3D view, and parts that are not fitted are dashed.
- **Options** from the SimLab calculator change the drawing:
  - battery: 6S 1100, 6S 1800 or 4S 1500, each with its own size and colour;
  - motors: 2306 1750 KV, 2207 1950 KV or 2306 2450 KV;
  - props: 5x4.3x3, 5.1x2.5x3 or 5x5x3, each with its own colour.
- **Exploded view** lifts each part by its stack level.
- **See-through** fades the top plate and the battery and shows the copper stator windings. Moving dots show the
  battery current, the ESC signal and the video lines. Labelled callouts name what is hidden inside: MCU STM32F405,
  gyro ICM-42688-P, MOSFETs x12, 1000 µF cap, ESC harness 8-pin, ELRS RX on UART2, stator 12N14P.
- **Labels** names the main parts.

Look: Colorfigures palette (tomato accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble,
paper grain. It works on a phone (numbered badges and a label list) and inside the SimLab host, embedded and bare.
The host can set the design options, the build step and the test to run, and it receives the build state, part
clicks and button presses.
