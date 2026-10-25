# Fig. 09 — FPV flying wing on INAV (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **900 mm FPV flying wing** (INAV 9.1, 4S, GPS return to home)
lying on a pale green cutting mat with a flat blue cast shadow. Craft-local mm: x forward, y left, z up. The planform
comes from the fact sheet (`docs/facts/wing.md` §2): a 300 mm root chord (leading edge x +125, trailing edge x -175 at
y ±40), a 155 mm tip chord (x -95 to -250 at y ±450), a 28° leading-edge sweep, a thin cambered airfoil lofted between
sections, 55 mm constant-chord elevons from y ±120 to the tips on a swept hinge line, and tall winglets at the tips.
Draw every part where a real build puts it:

- The **EPP foam wing** in the craft colour with a carbon spar inside (shown in see-through), a 305 x 84 x 54 mm
  open **pod** on the centreline, a nose fairing with a camera window, a motor mount on the centre section's trailing
  edge, and two **CG marks** (quartered circles) on the top skin at x -5, y ±100: 15-20 % of the mean aerodynamic
  chord, about 130 mm behind the root leading edge.
- Two **9 g metal-gear elevon servos** in pockets at y ±175, with arms, pushrods and horns on the elevons. Both
  elevons sit 2° up at rest (reflex).
- One **pusher motor** (2212 1400 KV by default) on the mount, shaft pointing aft.
- A blue **40 A ESC** in the pod with its leads, and the three **motor wires** on bullets to the motor.
- A black **F405 wing flight controller** on its power board (four standoffs, battery pads), the arrow to the nose,
  F405 and OSD chips, a blue LED, a USB socket and the leads to the ESC (S1) and the servos (S3, S4).
- The yellow **XT60 lead** out of the pod and a **470 µF 35 V** low-ESR capacitor across the power board's battery
  pads, stripe on the negative leg.
- A 40 x 40 mm **M10 GPS + compass** on top of the wing behind the pod, arrow forward, blue LED, its lead to the FC.
- A small **ELRS receiver** in the pod with a T-antenna standing out of it.
- An analog **FPV camera** in the nose, 8° up, its lead to the FC's CAM pad.
- A **5.8 GHz VTX** in the pod with a red LED and a lollipop antenna standing up.
- The **battery** in the pod's bay under a strap: 4S 2200 LiPo (yellow, balanced), 4S Li-ion 3000 (blue,
  slightly nose-heavy) or 3S 1300 LiPo (red, tail-heavy).
- The **hatch** over the pod with its latch, and a two-blade **pusher prop** (8x6 P, 7x5 P or 9x6 P) behind the
  motor, turning counter-clockwise seen from behind.

What it does:

- **Add next part ▾** fits the parts in build order: wing, servos, motor, ESC, motor wires, flight controller,
  XT60 + cap, GPS, receiver, camera, VTX, battery, hatch, prop. Four parts have a choice: servos direction checked
  or reversed (untested), FC arrow to the nose or backwards, cap stripe to minus or to plus, prop printed side
  forward or mounted backwards.
- **Remove a part ▾**, **Build it for me** and **Take it apart** work part by part, with drop and lift animations.
- **Plug / unplug battery**: a cap in backwards goes POP; otherwise the ESC beeps and the FC, servos and VTX come on.
- **Smoke stopper test**, **Check motor direction** and **Calibrate accelerometer (wing level)** are the engine's
  three checks.
- **Check elevons** (craft button): needs the servos, FC and receiver, and the battery in. Three phases with a pill:
  STICK BACK (both elevons up), STICK RIGHT (right up, left down), TILT RIGHT WING DOWN (the right elevon goes down to
  lift it). Servos reversed: the elevons go the wrong way at the sticks. FC backwards: the sticks are right but the
  stabiliser pushes the wrong way.
- **CG check** (craft button): needs the battery. The CG marks light green (HANGS LEVEL, or NOSE DIPS A LITTLE for
  the Li-ion pack) or red (TAIL DROPS for the 3S 1300).
- **Calibrate compass**, **Check airspeed** (virtual airspeed from GPS) and **Failsafe test** (prop off: FAILSAFE
  after 0.5 s, then RTH) are short checks with their own pills.
- The craft checks are reported in the state (`extra.elevonOk`, `extra.cgOk`, `extra.cg`, `extra.compassOk`,
  `extra.airspeedOk`, `extra.failsafeOk`, `extra.ready`). Each holds only while the parts it ran on stay seated
  the same way (re-seating one clears it); the CG check also needs the same pack.
- **Wiring sheet**: battery → XT60 + cap → FC power board (VBAT 2-6S) and → ESC (PDB ESC pads), FC → ESC (S1
  OneShot125), ESC → motor (3-phase), FC → servos (S3 S4, 4.9 V), receiver → FC (UART1 CRSF), GPS + compass → FC
  (UART3 + I2C1), camera → FC (CAM pad) and FC → VTX (video + OSD, 9 V).
- **Options** from the SimLab calculator: the three packs; 2212 1400 KV, 2810 1100 KV or 2306 2400 KV (quad motor);
  and the three pusher props, each in its own colour.
- **Exploded view** lifts each part by its stack level.
- **See-through** fades the foam and names what is inside: CARBON SPAR IN THE FOAM, 9 G METAL-GEAR SERVO, S3 / S4,
  OUTRUNNER, SHAFT AFT, 40 A ESC, ITS BEC LEAD UNUSED, F405 FC ON A PDB: 90 A SENSOR, 3 BECS, 470 µF 35 V LOW-ESR
  CAP, M10 GNSS + COMPASS, UART3 + I2C1, ELRS RX ON UART1 (CRSF), 5.8 GHz VTX, SMARTAUDIO, THE PACK IS THE CG
  BALLAST and CG MARK: 15-20 % OF THE MEAN CHORD.
- **Labels** names the main parts.

Look: Colorfigures palette (blush craft colour, chosen with the colour swatches), warm paper, heavy ink silhouette,
finer inner lines, hand-drawn wobble, paper grain. It works on a phone (numbered badges and a label list) and inside
the SimLab host, embedded and bare.
