# Fig. 13 — Heavy-lift cinema octocopter (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **heavy-lift cinema octocopter** (ArduCopter 4.7.2, 12S) standing
on a pale green cutting mat, with a flat blue cast shadow of the plates, the eight arms and the skids. Origin on the
mat under the centre, x to the nose, y left, z up, mm; the bottom plate's underside is 400 mm up. Draw every part
where a real build of this kind puts it:

- A **flat octa X frame**, 1360 mm motor to motor: two octagonal carbon plates (r 200 and 180 mm, 60 mm apart) with
  eight 32 mm carbon tubes clamped between them at 22.5° + k·45°, so no arm points straight forward. Each arm has a
  **fold joint** in the palette colour 230-272 mm out with a dark lock ring, and a motor clamp at r 680 mm. Without
  its legs the frame sits on a padded wooden build stand under the rear.
- **Retractable landing gear**: two legs a side from hinge blocks under the bottom plate (y ±150) down to carbon
  skid tubes at y ±270 with rubber end caps, and a brace between the legs of each side.
- **Eight 6010 170 KV motors** on the clamps, by ArduPilot octa X number: M1 front right, then clockwise M3, M8, M4,
  M2, M6, M7, M5 (Mission Planner's Motor Test order A to H), alternating clockwise and counter-clockwise; motors
  opposite each other spin the same way.
- **Eight 80 A ESCs** in orange heat-shrink on top of the tubes under the props, each with a 12 AWG red and black
  pair and a white signal lead running inboard along the tube, a **slack loop over every fold joint**, and three
  phase wires out to the motor.
- A **12S power board** (160 x 160 mm) on the bottom plate between the plates, with a blue **PM02D HV** module, a
  **1000 µF 63 V** capacitor standing on the board (stripe to minus), and an **XT90-S** at the back whose lead runs
  out the rear and up to the top plate.
- A **Pixhawk 6X** on four vibration dampers in the middle of the top plate: the black baseboard (103.4 x 52.4 x
  16.7 mm) and the grey FMU module on top with its arrow to the nose and a status LED.
- Under the bottom plate, an **ELRS receiver** with its T antenna pointing down and a blue **900 MHz telemetry radio**
  with a whip pointing down and out, their leads up to the Pixhawk.
- **Two GPS + compass pucks** on carbon masts behind the tray (x -140, y ±65), arrows forward, labelled GPS1 and GPS2,
  each with a status LED (blue searching, green fixed) and a lead down to the Pixhawk.
- A **battery tray** on four aluminium posts over the Pixhawk, carrying **two 6S packs** side by side in series (a
  red series link at the front), two blue straps, and the lead to the XT90-S when plugged in.
- A **3-axis gimbal** hung under the front on a damper plate: the yaw motor, an arm down the back, the roll motor, a
  U cradle and the tilt motor on the right, with a black **cinema camera** (a red side panel and a record LED) and a
  long lens pointing forward.
- **20 x 5.5 inch folding carbon props**, two-blade, on all eight motors.

What it does:

- **Add next part ▾** fits the parts in build order: frame, landing gear, motors, ESCs, wiring, power board, Pixhawk
  6X, receiver + telemetry, GPS masts, battery tray, gimbal, camera, battery, props. Three parts have a polarity
  choice: the capacitor stripe to minus or to plus, the Pixhawk arrow forward or backward, the props correct or
  swapped CW/CCW. The refusals are the real order (the gimbal hangs only once the legs hold the frame off the bench,
  the packs go on the tray, the props go on last).
- **Remove a part ▾**, **Build it for me**, **Take it apart**, **Exploded view** and **Plug / unplug battery** work as
  on the other crafts; a reversed capacitor pops when the packs go in.
- **Smoke stopper test** (through a limiter rated for 12S), **Check motor direction** (props off, A to H) and
  **Calibrate accelerometer** are the engine's three safety tests.
- **Landing gear test** needs the gear, the Pixhawk and the receiver and the packs in. On the stand, disarmed: the
  gear switch high folds both sides' legs up and out about their hinges (70°) while a pill says the camera can now pan
  all the way round, then the switch low brings them down again.
- **GPS check (both receivers)** needs the masts, the Pixhawk and the packs: a pill counts the satellites of both
  receivers up to a 3D fix and the puck LEDs turn green.
- **Pre-arm checks** needs the Pixhawk, the GPS and the receiver, the props off and the packs in. It fails with
  "PreArm: 3D Accel calibration needed" until the accelerometer is calibrated and "PreArm: GPS 1: Bad fix" until the
  GPS check has passed, then arms (motors idle) and disarms. A failed run takes back an earlier pass.
- **Wiring sheet**: packs → power board (XT90-S, 44.4 V) → ESCs (VBAT x8) → motors (3-phase x8); power board → Pixhawk
  (PM02D → POWER1); Pixhawk → ESCs (MAIN OUT 1-8, PWM), → landing gear (AUX 1), → gimbal (TELEM2, MAVLink); GPS → Pixhawk
  (GPS1 + GPS2); receiver and telemetry → Pixhawk (UART4 + TELEM1).
- **Options** from the iynk calculator change the drawing: two 6S 16000, two 6S 22000 (bigger, blue) or one 6S
  16000 pack; 6010 170 KV, 6010 130 KV or 6215 230 KV motors; 20, 18 or 22 inch props.
- **See-through** fades the tray, the packs and the camera and labels what is inside: the fold joints, the slack
  loops, the capacitor's rating, the PM02D, the Pixhawk's outputs, the radios' ports, the gear servo's output, the
  gimbal's port, and that with a motor out the mixer spreads its lift over the other seven.

Look: Colorfigures palette (cobalt accent), warm paper, heavy ink silhouette, finer inner lines. It works on a phone
(numbered badges and a label list) and inside the iynk host, which sets the design options and runs the tests.
