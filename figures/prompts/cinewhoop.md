# Fig. 03 — 3-inch cinewhoop (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **3-inch ducted cinewhoop** (Betaflight, 4S) sitting on a pale
green cutting mat with a flat blue cast shadow. The frame is a true-X, 3 mm carbon bottom plate, 147 mm motor to
motor across the diagonal: the four motors sit on the corners of a square at ±52 mm from the centre. Short arms and
two spokes per corner hold four **ducts** in the craft colour (mint): rings 79 mm across inside, 24 mm tall, with a
dark TPU bumper band round the outside. Draw every part where a real build puts it:

- Four **2004 3000 KV** outrunners (25 mm bells, 12N14P stators) in the middle of the ducts.
- A 26 mm **35 A 4-in-1 ESC** (AM32, AT32 MCU) on short standoffs on the 20 x 20 mm stack, battery pads at the rear.
- Above it on grommets, a blue **F722 flight controller** with the forward arrow on the silkscreen, a blue status LED,
  a USB socket and the ICM-42688-P gyro. An 8-pin harness loops down to the ESC at the back of the stack.
- The **motor wires**, three per motor, from each corner to the ESC pads.
- The yellow **XT60 pigtail** out of the rear, and a **470 µF 35 V** low-ESR capacitor across the ESC battery pads,
  stripe on the negative leg.
- The **DJI O3 camera** (21.2 x 20 x 19.5 mm) between two side plates at the nose, tilted up 15°.
- The **DJI O3 air unit** (32.5 x 30.5 x 14.5 mm, finned grey case, green LED) on top of the stack. It has the camera
  coax, a 3-in-1 lead (VBAT, GND, UART1) down to the FC, and two antennas led out between the rear ducts.
- An **ExpressLRS 2.4 GHz** nano receiver at the rear of the bottom plate (UART2, CRSF), its antenna led back
  between the rear ducts.
- A 2.5 mm carbon **top plate** on four standoffs, above the duct tops.
- A **naked action camera** on a 14° TPU wedge at the front of the top plate, with a red REC LED and a 5 V BEC board
  whose red and black lead runs down to the battery pads.
- The **LiPo** on a grip pad under a strap, behind the action camera. The picker offers 4S 1100 (black), 4S 850
  (yellow) and 6S 850 (blue), each at its own size.
- **3-inch ducted props** with wide square tips fitted "props in": M1 rear right CW, M2 front right CCW, M3 rear left
  CCW, M4 front left CW. The leading edge of each blade is raised in its spin direction, and each tip runs 1.4 mm
  from its duct wall.

What it does:

- **Add next part ▾** fits the parts in build order: frame, ducts, motors, 4-in-1 ESC, motor wires, flight
  controller, XT60 + cap, O3 camera, air unit, receiver, top plate, action camera, battery, props. Three parts have a
  polarity choice: FC arrow forward or backward, cap stripe to minus or to plus, props in or swapped CW/CCW. The
  refusals are the real rules ("Unplug the battery first: never work on a live quad", "Props go on LAST: run the
  smoke stopper test and the motor direction check first").
- **Remove a part ▾**, **Build it for me** and **Take it apart** work part by part, with drop and lift animations.
- **Plug / unplug battery**: a cap in backwards goes POP and vents. Otherwise the ESCs beep ready and the FC, air
  unit and action camera LEDs light.
- **Smoke stopper test**, **Check motor direction** (props off only) and **Calibrate accelerometer** (with the FC
  arrow backwards it passes but warns of the flip on take-off) are the engine's three checks.
- **Prop clearance check** (craft button): battery unplugged, ducts and props on. It turns every prop by hand and
  logs the tip gap for the chosen prop (1.4 mm for a 3-inch prop).
- **OSD and link check** (craft button): FC, air unit, camera and receiver fitted, battery in, no fault. The goggles
  show the HD picture with the OSD; the log shows `serial UART1 131073 ...`.
- **Failsafe test** (craft button): props off, battery in, no arming flags. It arms, switches the radio off and logs
  RXLOSS, 1.5 s of stage 1, then DROP.
- **Pre-arm check** (craft button): runs `status` and lists the arming flags (RXLOSS without a receiver, NO_ACC_CAL
  before calibration). With the FC arrow backwards it passes, and says that a reversed board passes every check.
- Each craft check is reported in the state (`extra.clearanceOk`, `extra.osdOk`, `extra.failsafeOk`, `extra.armOk`)
  and only holds while the parts it ran on stay fitted.
- **Wiring sheet**: battery → XT60 + cap → 4-in-1 ESC → motors (3-phase x4), FC → ESC (DShot300 bidir + VBAT, CUR),
  receiver → FC (UART2 CRSF + 5 V), air unit → FC (UART1 MSP + VBAT), O3 camera → air unit (coax) and XT60 → action
  camera (5 V BEC).
- **Options** from the iynk calculator: the three packs; 2004 3000 KV, 2004 1950 KV or 1404 4600 KV motors; and
  3x3x3, 3x2x5 or 3x3.5x3 props, each in its own colour.
- **Exploded view** lifts each part by its stack level.
- **See-through** fades the top plate, the air unit, the action camera and the battery, and names what is inside:
  1.4 MM TIP GAP, STATOR 12N14P, 4 x 35 A MOSFETS, GYRO ICM-42688-P, 8-PIN HARNESS, 470 µF 35 V CAP, 1/1.7" SENSOR,
  5.8 GHZ HD LINK, VBAT + UART1, ELRS ON UART2, 5 V BEC POWERED and CELLS IN SERIES.
- **Labels** names the main parts.

Look: Colorfigures palette (mint craft colour, chosen with the colour swatches), warm paper, heavy ink silhouette,
finer inner lines, hand-drawn wobble, paper grain. It works on a phone (numbered badges and a label list) and inside
the iynk host, embedded and bare.
