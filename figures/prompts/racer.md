# Fig. 05 — 5-inch racing quad (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **5-inch FPV racing quad** (Betaflight, 4S) sitting on a pale
green cutting mat with a 40 mm grid, with a flat blue cast shadow. The frame is a **stretched X**: the motors sit at
±86 mm front to back and ±70 mm side to side (172 x 140 mm, 221.8 mm motor to motor), on 12 mm wide, 4 mm thick carbon
arms around a 120 x 32 mm centre plate. Draw every part where a real race build puts it:

- Four **2207 2500 KV** motors with their phase wires cut short and soldered straight to the ESC pads.
- A 20 x 20 mm **55 A 4-in-1 ESC** (AM32, four FETs, two battery pads at the rear) on short standoffs.
- Above it a blue **F7 flight controller** (F722 MCU, forward arrow, blue LED, USB on the right). Its 8-pin ESC
  harness (GND, VBAT, M1-M4, current, telemetry) loops down the right-hand edge.
- On top of the stack a **race VTX** (25-200 mW, aluminium can, red LED). Its coax runs out the back to a lollipop
  antenna that leans backwards.
- A 14 mm **nano camera** at the nose, tilted up 40° between two side plates in the palette colour. Three wires (video,
  5 V, GND) run back to the CAM pads.
- An **ELRS receiver** on the rear-right arm root, wired to UART2. Its coax runs out along the arm to a white T dipole.
- **Eight WS2812B LEDs**, four on each rear arm, one chain fed from the FC's LED pad, lit race green when powered.
- An **XT60 pigtail** out the tail with a 1000 µF 35 V low-ESR capacitor on the battery pads, stripe to minus.
- A thin 92 x 34 mm carbon **top plate** on 20 mm standoffs, a **4S 1300 mAh race LiPo** on a grip pad with a strap.
- **5-inch tri-blade props** (5x4.8x3, blue) fitted props in: M1 rear right CW, M2 front right CCW, M3 rear left CCW,
  M4 front left CW.

What it does:

- **Add next part ▾** fits the parts in build order: frame, motors, 4-in-1 ESC, motor wires, XT60 + cap, flight
  controller, VTX, camera, receiver, LED strip, top plate, battery, props. Three parts have a polarity choice: FC arrow
  forward or backward, cap stripe to minus or to plus, props in or swapped CW/CCW. The refusals are the real rules
  (unplug before working on the quad, the stack goes bottom up, props go on last).
- **Remove a part ▾**, **Build it for me**, **Take it apart**, **Exploded view** and **Plug / unplug battery** work as
  on the freestyle quad: a reversed cap pops and vents when the pack goes in.
- **Smoke stopper test**, **Check motor direction** (props off) and **Calibrate accelerometer** are the engine's three
  safety tests.
- **Receiver test** needs the receiver and the FC fitted. The log shows CRSF on UART2, every channel 1000-2000 µs and
  the arm switch on AUX1.
- **Failsafe test (radio off)** needs the receiver and FC, the props off and the pack in. The log shows stage 1 for
  1.5 s, then stage 2 DROP: motors stopped, disarmed. With the props on it refuses.
- **Wiring sheet**: battery → XT60 + cap → 4-in-1 ESC → motors (3-phase x4), FC → ESC (DShot600), camera → FC (CAM
  pad), FC → VTX (video + OSD, SmartAudio), receiver → FC (UART2 CRSF), FC → LED strips (LED pad + 5 V).
- **Options** from the SimLab calculator change the drawing: battery 4S 1300, 4S 1500 or 6S 1000; motors 2207 2500 KV,
  2306 2700 KV or 2207 1950 KV; props 5x4.8x3, 5.1x3.6x3 or 5x5.2x3, each with its own size or colour.
- **See-through** fades the top plate and battery and labels what is inside: stator 22 x 7 mm, F722 MCU + gyro,
  Raceband R4 at 25 mW, nano cam at 40° up, ELRS RX on UART2 CRSF, WS2812B x8 LEDs.

Look: Colorfigures palette (mustard accent), warm paper, heavy ink silhouette, finer inner lines. It works on a phone
(numbered badges and a label list) and inside the SimLab host, which sets the design options and runs the tests.
