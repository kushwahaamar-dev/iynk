# Fact sheet: VTOL tiltrotor QuadPlane, tricopter layout, on ArduPilot Plane (Drone Lab Fig. 10, `vtol`)

Status: verified against ArduPilot Plane **4.7.2** (stable since 11 Oct 2026) parameter docs, source code and release
notes, 24 Oct 2026. Anything marked **(unverified)** could not be checked in the time box. Physics estimates are
marked **(estimate)** and show their working.

## 0. Header

**Craft class:** small electric fixed-wing VTOL, "tilt-tricopter" QuadPlane: two front motors on tilting nacelles
(straight up for hover, straight forward for cruise) and one fixed rear lift motor that stops in cruise. Fixed-wing
controls in the original are a V-tail only (two ruddervators: pitch and yaw, `SERVOn_FUNCTION` 79/80 [3]). The original
draws **no ailerons and a flat wing**, so it has no direct roll control in cruise: roll would have to come from
rudder-roll coupling (needs wing dihedral) or from tilt vectoring of the front motors (`Q_TILT_FIX_ANGLE` /
`Q_TILT_FIX_GAIN`, "vectoring for roll/pitch in forward flight" [3][4]). The Convergence uses elevons [8] (functions
77/78 in its frame file). SimLab should either add ailerons (function 4) to the figure or teach tilt-vectored roll.

**Real products / reference builds it represents:**

| Product | What it is | Key figures |
|---|---|---|
| E-flite Convergence VTOL (EFL11050 BNF / EFL11075 PNP, discontinued) [14][8] | The classic tilt-tricopter: delta wing, two tilting front motors, fixed tail motor. ArduPilot ships a frame parameter file for it [8] | 650 mm span, 291 sq in (0.188 m²) wing, 3S 2200-3000 mAh [14]; ArduPilot file: `Q_FRAME_CLASS 7`, `Q_TILT_TYPE 2` (vectored yaw), `Q_TILT_MASK 3` [8] |
| HEEWING T1 Ranger VTOL (PNP, ArduPilot on the HEEWING F405) [13] | Twin-motor foam V-tail FPV wing with a VTOL kit: two tilt servos on the front motors plus a rear lift motor | 730 mm span, 645 mm long, 600-750 g take-off weight, 4S 1300-3500 mAh, "over 65 min" cruise (manufacturer claim) [13]; a builder reports 730 g RTF with a DJI pod and 1500 mAh 4S [13] |
| SimLab/Drone Lab Fig. 10 itself | 840 mm straight wing, V-tail, 4S2P Li-ion, Matek H743-WING | AUW 1585 g by the original's calculator (see section 3) |

**What it is and what it is for.** A tiltrotor QuadPlane takes off and lands vertically like a multicopter (QHOVER,
QLOITER, QLAND, QRTL), then tilts its front rotors forward and flies on the wing like an aeroplane. Once the wing
carries the weight the motors only have to overcome drag, so cruise power is roughly a third of hover power and range
is several times a multicopter's on the same battery. It is used for mapping, coastal / pipeline / power-line
inspection and long-range FPV from places without a runway. The hard part is the transition: for a few seconds the
wing is too slow to lift but the rotors already point partly forward; ArduPilot handles that with a tilt hold at
`Q_TILT_MAX` until `AIRSPEED_MIN` is reached, a blend over `Q_TRANSITION_MS`, and `Q_ASSIST_SPEED` lift assistance
[4][10].

## 1. Sources

1. ArduPilot firmware server, Plane stable, MatekH743 `git-version.txt`: "APMVERSION: ArduPlane V4.7.2", commit
   fb77356, 11 Oct 2026. https://firmware.ardupilot.org/Plane/stable/MatekH743/git-version.txt
2. ArduPlane release notes (tag Plane-4.7.2): "Release 4.7.2 11-October-2026"; 4.5.0 and 4.7.0 rename lists.
   https://raw.githubusercontent.com/ArduPilot/ardupilot/Plane-4.7.2/ArduPlane/ReleaseNotes.txt
3. Plane 4.7.2 full parameter list. https://ardupilot.org/plane/docs/parameters-Plane-stable-V4.7.2.html
4. ArduPilot, Tilt Rotor Planes. https://ardupilot.org/plane/docs/guide-tilt-rotor.html
5. ArduPilot source `ArduPlane/tiltrotor.cpp` (Plane-4.7.2): parameter defaults and tilt-rate logic.
   https://github.com/ArduPilot/ardupilot/blob/Plane-4.7.2/ArduPlane/tiltrotor.cpp
6. ArduPilot source `libraries/AP_Motors/AP_MotorsTri.cpp` (Plane-4.7.2): tri uses motors 1, 2, 4 and a yaw servo.
   https://github.com/ArduPilot/ardupilot/blob/Plane-4.7.2/libraries/AP_Motors/AP_MotorsTri.cpp
7. ArduPilot Copter, Connect ESCs and Motors (tricopter diagram `m_07_00_tricopter.svg` and note).
   https://ardupilot.org/copter/docs/connect-escs-and-motors.html
8. ArduPilot `Tools/Frame_params/EFlight_Convergence.param` (Plane-4.7.2).
   https://github.com/ArduPilot/ardupilot/blob/Plane-4.7.2/Tools/Frame_params/EFlight_Convergence.param
9. ArduPilot source `ArduPlane/AP_Arming_Plane.cpp` (Plane-4.7.2): pre-arm messages.
   https://github.com/ArduPilot/ardupilot/blob/Plane-4.7.2/ArduPlane/AP_Arming_Plane.cpp
10. ArduPilot, QuadPlane Transitions. https://ardupilot.org/plane/docs/quadplane-transitions.html
11. ArduPilot, Mateksys H743-Wing/SLIM/MINI/WLITE. https://ardupilot.org/plane/docs/common-matekh743-wing.html
12. Matek H743-WING V3 retailer specs (54 x 36 x 13 mm, 30 g, 30.5 x 30.5 mm holes, ICM42688-P + ICM42605):
    https://www.fpvfaster.com.au/products/matek-h743-wing-v2-flight-controller-30-5x30-5mm ,
    https://ca.wrekd.com/fr/products/matek-h743-wing-v3-flight-controller
13. HEEWING T1 Ranger VTOL: https://www.fpvfaster.com.au/products/hee-wing-t1-ranger-twin-motor-wing-vtol-pnp-w-fc ,
    VTOL kit https://www.fpvfaster.com.au/products/hee-wing-t1-ranger-pnp-vtol-conversion-kit ,
    builder thread https://discuss.ardupilot.org/t/heewing-t1-ranger-vtol/88335 ,
    FC https://ardupilot.org/plane/docs/common-heewingf405.html
14. E-flite Convergence: https://www.modelairplanenews.com/?p=247447 ,
    https://docs.px4.io/v1.15/en/frames_vtol/vtol_tiltrotor_eflite_convergence_pixfalcon.html
15. APC Propellers performance data (PER3 files, static rows): `PER3_9x5.dat`, `PER3_9x45MR.dat`, `PER3_10x5E.dat`,
    `PER3_10x45MR.dat`, `PER3_7x4E.dat` at https://www.apcprop.com/files/
16. End of BLHeli_32 (June 2024): https://oscarliang.com/end-of-blheli_32 , https://hackaday.com/tag/blheli/
17. ArduPilot source `ArduPlane/config.h` / `defines.h` (Plane-4.7.2): AIRSPEED_CRUISE default 12 m/s,
    AIRSPEED_MIN default 9, AIRSPEED_MAX 22, MIN_AIRSPEED_MIN 5 m/s.
18. ArduPilot, QRTL mode. https://ardupilot.org/plane/docs/qrtl-mode.html ; QuadPlane frame setup
    https://ardupilot.org/plane/docs/quadplane-frame-setup.html
19. Drone Lab research: `docs/research/drone-lab-b.md` Fig 10 section and `drone-lab-b-calc-matrix.md` Fig 10 table
    (what the original shows).
20. XT60 gender convention (retailer pages, consistent with hobby practice):
    https://probots.co.in/xt60-connector-male-and-female-for-rc-lipo-battery.html
21. ArduPilot source `ArduPlane/events.cpp` and `ArduPlane/quadplane.cpp` (Plane-4.7.2): RC failsafe in Q modes
    (QLAND unless Q_OPTIONS FS_QRTL / FS_RTL), transition timer clamp, quadplane motor test.
    https://github.com/ArduPilot/ardupilot/blob/Plane-4.7.2/ArduPlane/events.cpp

## 2. Geometry (craft frame)

Frame: **x forward (nose), y left, z up, mm.** The original models from the fuselage pod: origin on the fuselage
centreline at the pod's bottom face (pod z 0 to 80). SimLab should keep that origin for this craft (a VTOL has no
"bottom plate"); the CG target is given below.

### 2.1 Airframe as drawn by the original (keep for the figure) [19]

| Part | Geometry (original) | Real-world check |
|---|---|---|
| Fuselage pod | 370 x 90 x 80 mm box, x -140 to 230, plus a 62 mm nose (to x 292) | Plausible for a 0.8-1.2 m foam VTOL |
| Tail boom | carbon tube from the pod to x = -505 | Plausible |
| Wing | straight, **840 mm span** (y ±420), **150 mm chord** (LE x 110, TE x -40), 10 mm thick, on top of the pod at z 80-90; area 0.126 m², AR 5.6 | **Too small for 1585 g** (see 2.5): wing loading 126 g/dm². For scale, the Convergence has 0.188 m² of wing for a 3S 2200-3000 mAh airframe [14] |
| V-tail | at x = -470: two fins, 90 mm chord x 150 mm tall, each 35° above horizontal (55° from vertical) | V-tails of 30-45° dihedral are normal |
| Landing gear | two wire skids 220 mm long at y ±66, 44 mm below the pod; tail stand at x -450 | Plausible |
| Front tilt pivots | (175, ±230, 92) | Ahead of the wing LE by 65 mm, on nacelles at y ±230 |
| Rear lift motor | (-300, 0, 70), fixed, pointing up | |
| Battery | 102 x 60 x 42 mm under the wing | 8 x 21700 cells (Ø21 x 70 mm) pack as 4 across x 2 layers ≈ 90 x 46 x 75 mm with wrap, or 2 x 2 x 2 ≈ 145 x 46 x 46 mm **(estimate)**; the original's box is a fair stand-in. A 4S 5000 LiPo is about 140 x 45 x 35 mm **(unverified)** |
| GPS | puck r 24 mm on a 50 mm mast on the boom | Good practice (away from battery current) |
| Pitot | 100 mm tube on the right wing at y = -330 (the doc writes y = 330; the right wing is negative y in this frame) | Must sit outside prop wash; tip ahead of the LE |
| Camera | nose, 8° uptilt | Typical for a wing: 0-10° |

### 2.2 Motor positions, ArduPilot tricopter order

ArduPilot's tricopter uses **Motor 1, Motor 2 and Motor 4** (no Motor 3) plus a yaw servo on output function 39
("Motor7/TailTiltServo") [6][3]. Motor 1 = front right, Motor 2 = front left, Motor 4 = rear [7].

| Motor | Position (x, y, z) mm | SERVOn_FUNCTION | Tilts? (Q_TILT_MASK bit) | Spin seen from above, original | Alternative |
|---|---|---|---|---|---|
| M1 front right | (175, -230, 92) pivot | 33 Motor1 | yes, bit 0 | CW | CCW |
| M2 front left | (175, +230, 92) pivot | 34 Motor2 | yes, bit 1 | CCW | CW |
| M4 rear | (-300, 0, 70) | 36 Motor4 | no | CW | CCW |

- **ArduPilot does not prescribe tricopter spin directions.** The official tricopter diagram draws all three motors
  without a direction, and the note says only that the two front motors should spin in opposite directions, or roll
  and pitch inputs cause adverse yaw [7]. The original's M1 CW / M2 CCW / M4 CW is one valid choice. The other
  valid choice is the mirror image (M1 CCW / M2 CW). The rear motor can turn either way: its torque is cancelled by
  the yaw mechanism (a yaw servo, or vectored front tilt), not by another motor.
- Distances: front motor to front motor 460 mm; front to rear 528 mm (sqrt(475² + 230²)); thrust centroid with equal
  thrust at x = (2·175 - 300)/3 = **16.7 mm** **(estimate)**.
- CG: the original says the CG sits at a quarter of the chord: x = 110 - 37.5 = **72.5 mm**. With CG there, hover
  balance needs rear thrust ≈ 0.55 x each front motor's thrust (2·Tf·102.5 = Tr·372.5) **(estimate)**. That is
  flyable (ArduPilot mixes it automatically) but the rear motor runs lighter than the calculator assumes.
- Props drawn: radius 115 mm (9 in = 228.6 mm, r 114.3) at the front, 100 mm (about 8 in) at the rear, for every prop
  choice. The calculator assumes three identical props, so the drawn rear prop is smaller than the maths.

### 2.3 Tilt mechanism

| Item | Value |
|---|---|
| Tilt axis | about the pitch axis (y) through the pivot (175, ±230, 92) |
| Range | 0° (rotor axis straight up, hover) to 90° (axis straight forward, cruise). The original animates `tilt * 90°`. |
| Vectored yaw (recommended, see 5.3) | each front servo also goes **past vertical** by `Q_TILT_YAW_ANGLE` degrees (Convergence: 10° [8]; doc example 20° for a 110° total throw [4]) |
| ArduPilot convention | `SERVOn_REVERSED` set so that in **MANUAL the rotors point forward and in QSTABILIZE they point straight up** [4] |
| Tilt rates (time for 90°) | default `Q_TILT_RATE_UP` 40 °/s, `Q_TILT_RATE_DN` 0 (= use RATE_UP) [5]; doc "typical" 15 °/s both ways [4]; Convergence DN 15, UP 25 [8]. Changing to MANUAL, or the remainder after a completed forward transition, tilts at 90 °/s [4] |
| Original's bench test | 0 → 90 → 0° in 3.2 s (about 56 °/s); in-flight tilt 3 s each way (30 °/s) |

### 2.4 Props, camera, battery, mass (original default build)

| Item | Value |
|---|---|
| Props | 9x5 two-blade (default), 10x5 or 7x4 two-blade; front pair counter-rotating |
| Camera | nose, 8° uptilt, analog FPV + 800 mW VTX |
| Battery | 4S2P Li-ion 8000 mAh, 560 g, under the wing at the CG |
| AUW (original calculator) | 1585 g = 773 g fixed + 3 x 72 g motors + 3 x 12 g props + 560 g battery |

### 2.5 Wing sizing check (the drawn wing cannot fly 1585 g at the original's speeds)

Lift = ½ρV²S·CL, ρ = 1.225 kg/m³, W = 1.585 kg x 9.81 = 15.55 N, S = 0.126 m² **(estimate)**:

| Quantity | Drawn wing (0.126 m²) | Needed for the original's VS 10 m/s / cruise 13 m/s |
|---|---|---|
| Stall speed at CLmax 1.0-1.2 | **13.0-14.2 m/s** | 10 m/s needs S ≈ 0.23 m² at CLmax 1.1 |
| CL at 13 m/s cruise | **1.19** (above most foam-wing CLmax: it would stall) | 0.45-0.65 is a sensible cruise CL |
| Suggested real-world wing | | e.g. **1200 mm span x 195 mm chord** (0.234 m², AR 6.2) or 1100 x 210 mm |

Conclusion for builders: the original's sim (stall 10 m/s, cruise 13 m/s) and its 1585 g weight are consistent with a
~0.23 m² wing, not the drawn 840 x 150 mm one. Either draw a larger wing or state in the lesson that the figure is
schematic. Do not teach that 840 x 150 mm carries 1.6 kg at 13 m/s.

## 3. The original's catalogue, sanity-checked

SimLab keeps the original calculator identical. The numbers below are the original's; the right-hand columns give
the real-world figure.

### 3.1 Batteries

| Original | cells / mAh / g / $ | Real-world check | Verdict |
|---|---|---|---|
| 4S2P Li-ion 8000 mAh (default) | 4 / 8000 / 560 / 70 | 8 x 21700 cells of 4000-4200 mAh (Molicel P42A, Samsung 40T class) at about 67-70 g each = 535-560 g of cells, plus 30-50 g of nickel strip, wires, wrap and XT60 → **about 580-610 g** **(unverified cell masses)**. Max continuous about 2 x 30-45 A. Nominal 14.4 V (3.6 V/cell), not 14.8 V | Plausible, slightly light. The calculator uses 14.8 V for all 4S packs; Li-ion nominal is 14.4 V and sags more under hover current |
| 4S LiPo 5000 mAh | 4 / 5000 / 520 / 55 | Typical 4S 5000 mAh LiPo packs weigh about 500-560 g **(unverified, e.g. Gens Ace / Turnigy listings)** | Plausible |
| 6S LiPo 4000 mAh | 6 / 4000 / 600 / 75 | Typical 6S 4000 mAh packs weigh about 560-650 g **(unverified)** | Plausible |

### 3.2 Motors

| Original | KV / g / $ / forCells | Real-world check | Verdict |
|---|---|---|---|
| 2810 1000KV (default) | 1000 / 72 / 30 / 4 | 2810-class motors weigh about 70-90 g (T-Motor 2810 family, Emax PRO 2810); 900-1100 KV is a normal 4S choice for 8-9 in props **(unverified exact mass)** | Plausible |
| 2814 700KV | 700 / 96 / 38 / 6 | 2814-class motors (SunnySky X2814, T-Motor AT2814) weigh about 100-110 g **(unverified)**; 700 KV on 6S with 9-10 in props is a normal pairing | Plausible, slightly light |
| 2306 2400KV (racing) | 2400 / 33 / 20 / 4 | Real 2306 2400 KV motors weigh about 32-34 g and are built for 5 in props on 4S. On 9 in props they draw far beyond their rating and burn | Weight right. **The calculator caps its thrust at 2600 g, which no 2306 can make on 4S**: treat the "over" flag, not the thrust tile, as the lesson |

Flagged message (true outcome, untrue words): for **6S + 2810 1000KV** the original prints "2810 1000KV is a racing
motor: on 9-inch props it overheats in seconds". The 2810 is not a racing motor; the real problem is 1000 KV x 22.2 V
= 22 200 rpm unloaded on a 9 in prop, which would demand over 1 kW per motor (APC 9x5 at 15 000 rpm already needs
483 W shaft [15]). The "over" verdict is right, the explanation is wrong. Suggested wording: "1000 KV on 6S spins a
9-inch prop far too fast: it overloads the motor and ESC. Use 700 KV on 6S."

### 3.3 Props (thrust model check)

The calculator uses thrust = 6.8 x pf x (KV x V / 1000)² g per motor, i.e. unloaded rpm. APC's static data [15]:

| Prop | APC static thrust coefficient (g per krpm²) | Thrust at 12 000 rpm | Shaft power at 12 000 rpm |
|---|---|---|---|
| 9x5 | 10.2 | 1474 g | 247 W |
| 9x4.5MR | 11.1 | 1601 g | 267 W |
| 10x5E | 14.9 | 2149 g | 374 W |
| 10x4.5MR | 15.9 | 2282 g | 401 W |
| 7x4E | 4.35 | 627 g | 89 W |

- Default 2810 1000KV on 4S, 9x5: the calculator says **1490 g per motor** (14.8 krpm unloaded x 6.8). Real loaded
  rpm is about 11-12 krpm, giving 1.2-1.5 kg (APC's simulation reads 10-20 % high in static tests) at about 20-25 A
  **(estimate)**. **Plausible.**
- 10x5 (pf 1.2 → 1787 g): real gain from 9x5 to 10x5 at the same power is about 1.2-1.3x, but current rises to about
  30-35 A on a 2810 1000KV **(estimate)**: near the 40 A ESC limit. Plausible.
- 7x4 (pf 0.6 → 894 g): APC 7x4E gives 858 g at 14 000 rpm, which a 1000 KV motor on 4S cannot quite reach loaded
  **(estimate)**. Slightly optimistic, plausible order of magnitude.
- Prop masses (12 / 14 / 8 g): APC E and MR props of these sizes weigh about 10-20 g **(unverified)**. Plausible.

### 3.4 Fixed parts

| id | Original (g, $) | Real-world check | Verdict |
|---|---|---|---|
| FRAME foam fuselage + boom + gear | 330 g, $90 | Plausible for EPO with a carbon boom | OK |
| WING foam + carbon spar | 190 g, $40 | Plausible for 840 x 150 mm; a 0.23 m² wing (2.5) would weigh about 300-350 g **(estimate)** | OK for the drawn wing |
| TAIL V-tail + 2 ruddervator servos | 40 g, $24 | Plausible (two 9 g servos + foam) | OK |
| TILT 2 metal-gear tilt servos + nacelles | 70 g, $46 | Metal-gear 12-20 g servos x 2 + nacelles: plausible | OK |
| ESC 3 x 40 A BLHeli_32 | 45 g, $60 | Weight plausible. **BLHeli_32 ended in June 2024: no new firmware or flashing; existing ESCs keep working** [16]. New ESCs ship AM32 | Flag the firmware name in lessons; suggest "AM32 (formerly BLHeli_32)" |
| FC Matek H743-WING + ELRS RX | 30 g, $95 | H743-WING V3 alone is 30 g with its USB extender [12]; retail about USD 110-180 **(unverified; AUD 181.99 at [12])**; ELRS RX adds 1-3 g and $15-25 | Weight right; **price low** (real about $130-200 with RX) |
| GPS M10 + compass | 18 g, $28 | Plausible for an M10 puck with QMC5883/IST8310 **(unverified)** | OK |
| ARSPD ASPD-4525 + pitot | 8 g, $35 | Matek ASPD-4525 is an I2C MS4525DO board (ArduPilot `ARSPD_TYPE 1` = I2C-MS4525D0 [3]); price about $40-60 **(unverified)** | OK |
| CAM FPV camera + 800 mW VTX | 22 g, $55 | Plausible | OK |
| XT60 + 1000 uF cap + PDB | 20 g, $12 | Plausible. The cap must be rated **≥ 25 V for 4S (35 V preferred), ≥ 35 V for 6S (50 V preferred)** | OK |

### 3.5 Calculator outputs vs reality (default 4S2P Li-ion / 2810 1000KV / 9x5)

| Tile | Original | Real-world figure | Verdict |
|---|---|---|---|
| All-up weight | 1585 g | 1600-1650 g with real battery/servo masses **(estimate)** | Plausible |
| Thrust : weight | 2.8 : 1 | about 2.3-2.6 : 1 with loaded rpm **(estimate)** | Slightly optimistic; ≥ 2:1 is the usual VTOL target, 1.6:1 a bare minimum (original warning threshold) |
| Hover throttle | 60 % | ArduPilot learns `Q_M_THST_HOVER` (range 0.125-0.6875 [3]); about 0.35-0.5 for T:W 2.5 **(estimate)** | Model artefact (sqrt law); fine for teaching |
| Hover current | 15.3 A | Momentum theory: ideal power for 15.55 N on three 9 in discs (0.123 m²) = 112 W; with figure of merit 0.6 and 80 % motor+ESC efficiency ≈ **230 W ≈ 15.5-16.5 A** at 14-14.8 V **(estimate)**. APC 9x5 at 528 g/motor (7.2 krpm) needs about 57 W shaft each [15] → 171 W shaft → about 215-230 W electrical | **Right** |
| Cruise current | 5.1 A | Drag at L/D 6 = 2.6 N; at 13 m/s that is 34 W of air power; at 50-55 % propulsive efficiency → 62-68 W ≈ 4.3-4.7 A, plus 0.5-0.8 A for FC, GPS, camera and 800 mW VTX → **about 5 A** **(estimate)**. Scaling the HEEWING T1's claim (65 min on 4S, assuming its largest recommended 3500 mAh pack at 80 % → ≈ 2.6 A at ≈ 0.75 kg) to 1.6 kg also gives about 5-6 A **(estimate from a manufacturer claim)** | **Right** |
| Hover time | 25.1 min | 6.4 Ah usable / 15.5 A ≈ 25 min, less with Li-ion sag (about 20 min) **(estimate)** | Plausible; real flights hover only 1-3 min |
| Cruise time | 76 min | 6.4 Ah / 5 A ≈ 75 min | Plausible |
| Max current | 116 A | 3 motors x 20-25 A ≈ 60-75 A real full-throttle draw **(estimate)** | High, but under the 3 x 40 A ESC rating |

**The 1.2 A vs 5 A mismatch is settled in favour of the calculator's 5 A.** The original's flight sim shows 1.2-1.3 A
in cruise (and 16 A in hover). 1.2 A x 14.8 V = 18 W of total electrical power. Flying 15.55 N at 13 m/s with 18 W,
of which the 800 mW VTX, camera, FC and GPS alone take about 6-10 W, would need a lift-to-drag ratio above 20 even
with perfect propulsion: sailplane territory, not a foam VTOL with nacelles. SimLab's sim should draw about
**4.5-5.5 A in level cruise at 13 m/s** (about 1/3 of hover), more in climbs and turns. The sim's own drag model
(0.11 W at cruise, L/D ≈ 9) gives 22 W of air power, i.e. about 3-3.5 A at realistic efficiency: closer, but the
calculator's L/D 6 is the more realistic figure for this airframe **(estimate)**.

## 4. Electronics and wiring

### 4.1 Flight controller: Matek H743-WING V3 [11][12]

| Item | Value |
|---|---|
| MCU | STM32H743VIT6, 480 MHz, 2 MB flash [11][12] |
| IMU / baro | V3: ICM42688-P (SPI1) + ICM42605 (SPI4) per current retailers [12]; ArduPilot's page still lists MPU6000 + ICM20602 (older revision) [11]. Baro DPS310 [11] |
| Power | 9-36 V input (ArduPilot page) [11] / 8-36 V, 3-8S (retailer) [12]; current sensor: "132 A" on the ArduPilot page [11], "90 A continuous, 220 A peak" on retailer pages [12] |
| BECs | 5 V 2 A (peripherals), 9/12 V 2 A (video, switchable), 5/6/7.2 V 8 A (servos) [11] |
| I/O | 7 UARTs, 13 PWM outputs, 2 x I2C, CAN, built-in analog OSD (AT7456E), microSD [11][12] |
| Size / mounting | 54 x 36 x 13 mm, 30 g with USB extender, 30.5 x 30.5 mm holes Φ4 mm with Φ3 mm grommets [12]. Not a stack board |
| Firmware target | `MatekH743`; bi-directional DShot build `MatekH743-bdshot` (only outputs 1-8 bidirectional) [11] |
| Output groups (same PWM rate or DShot per group) | 1/2, 3/4/5/6, 7/8/9/10, 11/12, 13 (LED) [11] |
| Default UARTs | SERIAL1 = UART7 (Telem1, CTS/RTS), SERIAL2 = USART1 (Telem2), SERIAL3 = USART2 (GPS1), SERIAL4 = USART3 (GPS2), SERIAL5 = UART8, SERIAL6 = UART4, SERIAL7 = UART6 (TX only unless `BRD_ALT_CONFIG 1`) [11] |
| Battery monitor | `BATT_MONITOR 4`, `BATT_VOLT_PIN 10`, `BATT_CURR_PIN 11`, `BATT_VOLT_MULT 10.5`, `BATT_AMP_PERVLT 66.7` for WING V2/V3 [11] |
| Mounting | arrow to the nose; if mounted backwards set `AHRS_ORIENTATION 4` (Yaw180) [3] |

### 4.2 ESCs

- 3 x 40 A, one per motor (two in the nacelles, one on the boom; original). ESC firmware: **AM32** on new 32-bit ESCs;
  BLHeli_32 is end-of-life since June 2024 [16]; Bluejay runs only on 8-bit BLHeli_S-class ESCs.
- Protocol: **DShot600** (`Q_M_PWM_TYPE 6`) or DShot300 (`5`) [3]. Bidirectional DShot for RPM telemetry needs the
  `MatekH743-bdshot` firmware and `SERVO_BLH_BDMASK` [3][11]. The motor group must be all-DShot (e.g. S3-S6).
- In a tiltrotor the motor and ESC wires cross the tilt pivot: leave a slack service loop so the wires bend over a
  length, not at one point (original lesson; standard practice).

### 4.3 Receiver, video, GPS, airspeed

| Peripheral | Connection | Parameters |
|---|---|---|
| ExpressLRS receiver (CRSF) | a full UART, e.g. USART1 = SERIAL2 (TX1/RX1). CRSF/ELRS needs a true UART, not the Rx6 timer pin unless `BRD_ALT_CONFIG 1` [11] | `SERIAL2_PROTOCOL 23` (RCIN), `RSSI_TYPE 3` (ReceiverProtocol), `RC_OPTIONS` bit 13 "Use 420kbaud for ELRS protocol" (value 8192), bit 9 suppresses the CRSF mode message [3] |
| GPS + compass (M10 + QMC5883/IST8310 class) | GPS on USART2 = SERIAL3 (default GPS port), compass on I2C (SCL/SDA) [11] | `SERIAL3_PROTOCOL 5` (GPS), `GPS1_TYPE 1` (AUTO) or 2 (uBlox) [3] |
| Airspeed (ASPD-4525, MS4525DO) | I2C | `ARSPD_TYPE 1` (I2C-MS4525D0), `ARSPD_USE 1`, `ARSPD_BUS` per pad used [3] |
| Analog camera + VTX | camera to C1, VTX video to the VTX pad, VTX powered from the 9/12 V switchable BEC; built-in OSD | `OSD_TYPE 1` (MAX7456-compatible) [3] |
| VTX control | SmartAudio or Tramp on a UART TX pin (e.g. UART4 = SERIAL6) | `SERIAL6_PROTOCOL 37` (SmartAudio) or `44` (IRC Tramp); `VTX_ENABLE 1`, `VTX_POWER` (mW), `VTX_MAX_POWER`, `VTX_BAND`, `VTX_CHANNEL` [3] |
| HD video (alternative) | DJI/Walksnail/HDZero air unit on a UART | `SERIALn_PROTOCOL 42` (DisplayPort), `OSD_TYPE 5` (MSP_DISPLAYPORT) [3] |
| Servos | tilt servos and ruddervators powered from the 8 A servo BEC (jumper 5, 6 or 7.2 V [11]; pick the servos' rated voltage, many metal-gear servos accept 6-7.4 V **(unverified per servo)**) | |
| Buzzer, LED | buzzer pads on the board / USB dongle; output 13 = LED [11] | |

### 4.4 Power

- Battery → **XT60** (the battery lead carries the **female** XT60 with recessed sockets, the aircraft lead the male
  with exposed pins, so a loose pack cannot short [20]; red = +, black = −) → PDB (or the FC's own power pads) → three ESCs, FC BECs.
- Low-ESR capacitor across the battery input: 1000 µF in the original; **≥ 25 V for 4S, ≥ 35 V for 6S**. Matek also
  asks for the bundled bypass capacitor because its precision current sensor is sensitive to ESC switching noise, and
  says ESCs may need extra 200-330 µF low-ESR caps on their own inputs [11]. Electrolytic stripe = **negative**.
- The FC's 5 V rail is live only with a battery connected; USB alone powers GPS/RX only from the 4.5 V pins [11].

### 4.5 Output map (one consistent choice for the H743-WING, matching the original's SERVO1/2 tilt servos)

| Output | Function | SERVOn_FUNCTION | Group / protocol | Typical lead colours |
|---|---|---|---|---|
| S1 | Tilt servo, front left | 75 TiltMotorFrontLeft | 1/2: PWM 50 Hz | brown − / red + / orange signal (or black/red/white) |
| S2 | Tilt servo, front right | 76 TiltMotorFrontRight | 1/2: PWM | same |
| S3 | Motor 1 (front right ESC) | 33 Motor1 | 3/4/5/6: DShot | ESC signal white/yellow, ground black |
| S4 | Motor 2 (front left ESC) | 34 Motor2 | 3/4/5/6: DShot | |
| S5 | Motor 4 (rear ESC) | 36 Motor4 | 3/4/5/6: DShot | |
| S6 | spare (must stay DShot or unused) | 0 | 3/4/5/6 | |
| S7 | V-tail left ruddervator | 79 VTailLeft | 7-10: PWM | servo colours |
| S8 | V-tail right ruddervator | 80 VTailRight | 7-10: PWM | |
| S13 | LED strip | 120 NeoPixel1 | 13 | |

Function numbers verified in the 4.7.2 parameter list [3]. Note `Q_ENABLE` by default puts multicopter motors from
output 5 upward [3]; the map above overrides that with explicit SERVOn_FUNCTION values (ArduPilot recommends the
standard ordering unless you have a reason; here the reason is the H743-WING's output groups) [18]. Wire colours of
ESC and GPS leads vary by vendor **(unverified per product)**.

## 5. Firmware: ArduPilot Plane (QuadPlane)

### 5.1 Version

**ArduPilot Plane 4.7.2**, released 11 October 2026, is the current stable (the firmware server's Plane/stable
MatekH743 build reports "ArduPlane V4.7.2") [1][2]. 4.7.1 was 31 Aug 2026, 4.7.0 21 Jul 2026 [2]. Configure with
Mission Planner or QGroundControl (Full Parameter List), or MAVProxy `param set`.

### 5.2 Renamed or removed parameters (check every snippet against these)

| Old name (original uses it?) | Current name (4.7.2) | Units / note | Since |
|---|---|---|---|
| `ARSPD_FBW_MIN` (**yes**) | `AIRSPEED_MIN` | m/s; "set 20 % higher than level-flight stall speed" [3] | 4.5.0 [2] |
| `TRIM_ARSPD_CM` (**yes**, 1300) | `AIRSPEED_CRUISE` | **m/s, not cm/s** (1300 → 13) [3] | 4.5.0 [2] |
| `ARSPD_FBW_MAX` | `AIRSPEED_MAX` | m/s | 4.5.0 [2] |
| `Q_LAND_SPEED` (**yes**, 50) | `Q_LAND_FINAL_SPD` | **m/s** (50 cm/s → 0.5), range 0.3-2 [3] | 4.5.0 [2] |
| `Q_VELZ_MAX` / `Q_VELZ_MAX_DN` | `Q_PILOT_SPD_UP` / `Q_PILOT_SPD_DN` | | 4.5.0 [2] |
| `Q_ACCEL_Z` | `Q_PILOT_ACCEL_Z` | | 4.5.0 [2] |
| `ALT_HOLD_RTL` | `RTL_ALTITUDE` | | 4.5.0 [2] |
| `LIM_ROLL_CD`, `LIM_PITCH_MAX/MIN`, `TRIM_PITCH_CD` | `ROLL_LIMIT_DEG`, `PTCH_LIM_MAX_DEG`/`PTCH_LIM_MIN_DEG`, `PTCH_TRIM_DEG` | degrees | 4.5.0 [2] |
| `ARMING_CHECK` | **`ARMING_SKIPCHK`** (bitmask of checks to skip; 0 = skip none) | inverse sense | 4.7.0 [2] |
| `Q_ANGLE_MAX` (centidegrees) | `Q_A_ANGLE_MAX` | degrees, 10-80 [3] | 4.7.0 [2] |
| `Q_WP_SPEED` (cm/s) **(old name unverified)** | `Q_WP_SPD` | m/s [3] | 4.7.0 (WPNAV → WP, SI units) [2] |
| `Q_P_JERK_NE/D` | `Q_P_NE_JERK` / `Q_P_D_JERK` | | 4.7.1 [2] |
| `Q_ASSIST_SPEED` | **not renamed** | m/s, 0-100 [3] | |
| `Q_TILT_*`, `Q_TRANSITION_MS`, `Q_RTL_MODE`, `Q_FRAME_CLASS`, `Q_LAND_FINAL_ALT` | **not renamed** | [3] | |

### 5.3 Errors in the original's snippets

| Original line | Problem | Correct |
|---|---|---|
| `Q_TILT_TYPE 0  # continuous servo tilt` with a rear motor that "only lifts" | A non-vectored tri (TYPE 0/1) **needs a yaw servo on function 39 tilting the rear motor** [4][6]. Without it the craft cannot control yaw in hover. The original has no rear servo | `Q_TILT_TYPE 2` (VectoredYaw) + `Q_TILT_YAW_ANGLE` 10-20, fronts on 75/76, rear fixed (Convergence layout [8]). Or keep TYPE 0, use function 41 for both tilt servos and add a rear yaw servo (function 39, `Q_M_YAW_SV_ANGLE`) [4] |
| Build code `SERVO1_FUNCTION 75`, `SERVO2_FUNCTION 76` with TYPE 0 | 75/76 are the separate left/right tilt functions meant for vectored yaw; for TYPE 0/1 the guide says use 41 TiltMotorsFront [4] | Consistent with TYPE 2 (above) |
| `Q_TILT_RATE_UP 40  # deg/s while tilting forward` | **Backwards.** RATE_UP is "from forward flight to hover"; RATE_DN is "from hover to forward flight" [3][5] | `Q_TILT_RATE_DN 40` for tilting forward (or leave DN 0 to use UP) |
| `Q_TILT_RATE_DN 20  # tilt back slowly: speed bleeds off` | **Backwards** (DN = forward) | `Q_TILT_RATE_UP 20` for tilting back to hover |
| `ARSPD_FBW_MIN 10  # stall margin (m/s)` | Renamed [2]; and 10 m/s **is** the sim's stall speed `VS`, but AIRSPEED_MIN should be about 20 % above stall [3] | `AIRSPEED_MIN 12` |
| `TRIM_ARSPD_CM 1300` | Renamed, now m/s [2][3] | `AIRSPEED_CRUISE 13` (14-15 better with AIRSPEED_MIN 12) |
| `Q_ASSIST_SPEED 10` | Docs: "set to 3 m/s below the minimum airspeed you will fly at" (5 m/s below without an airspeed sensor) [3]; 10 = AIRSPEED_MIN triggers false assists | `Q_ASSIST_SPEED 9` with `AIRSPEED_MIN 12` |
| `Q_LAND_SPEED 50` | Removed in 4.5 [2] | `Q_LAND_FINAL_SPD 0.5` |
| `Q_TILT_MAX 45 # tilt held here until airspeed builds` | Correct: "the angle ... the rotors will move to while waiting for the transition airspeed" [4]; default 45 [5], range 20-80 [3] | keep |
| `Q_RTL_MODE 1 # fly home in plane mode first` + `RTL_AUTOLAND 0` | Correct; 4.7.2 refuses to arm with both RTL_AUTOLAND ≠ 0 and Q_RTL_MODE ≠ 0 ("unset one of RTL_AUTOLAND or Q_RTL_MODE") [9] | keep (note the Convergence file [8] has both set and would fail this check on 4.7.2) |
| Mode names `transition` | Not an ArduPilot mode: a transition happens when switching from a Q mode to a fixed-wing mode (FBWA, FBWB, CRUISE, LOITER, CIRCLE, AUTO, GUIDED, RTL) [10] | Teach it as "switch to CRUISE/LOITER/AUTO" |

### 5.4 Initial setup (Plane 4.7.2, H743-WING, vectored-yaw tri tiltrotor)

Each value verified in the 4.7.2 parameter list [3]; layout from [4][8].

```
# 1. QuadPlane + tiltrotor (reboot after this block)
Q_ENABLE          1      # enable QuadPlane
Q_FRAME_CLASS     7      # Tri (Q_FRAME_TYPE is ignored for Tri)
Q_TILT_ENABLE     1      # enable tiltrotor support
# reboot, then:
Q_TILT_MASK       3      # motors 1 + 2 tilt (bit0 + bit1)
Q_TILT_TYPE       2      # VectoredYaw: front tilts steer yaw in hover, rear motor fixed
Q_TILT_YAW_ANGLE  10     # degrees the tilt servos can go back past vertical (Convergence: 10)
Q_TILT_MAX        45     # deg held during the airspeed wait (default 45, range 20-80)
Q_TILT_RATE_DN    15     # deg/s hover -> forward (0 = use RATE_UP)
Q_TILT_RATE_UP    25     # deg/s forward -> hover (default 40)

# 2. Outputs (H743-WING groups 1/2, 3/4/5/6, 7-10)
SERVO1_FUNCTION   75     # TiltMotorFrontLeft
SERVO2_FUNCTION   76     # TiltMotorFrontRight
SERVO3_FUNCTION   33     # Motor1 front right
SERVO4_FUNCTION   34     # Motor2 front left
SERVO5_FUNCTION   36     # Motor4 rear
SERVO7_FUNCTION   79     # VTailLeft
SERVO8_FUNCTION   80     # VTailRight
Q_M_PWM_TYPE      6      # DShot600 for the VTOL motors
SERVO1_REVERSED   0      # set each tilt servo so MANUAL = rotors forward, QSTABILIZE = rotors up
SERVO2_REVERSED   1      #   (example only: one side is usually mirrored)

# 3. Sensors
AHRS_ORIENTATION  0      # 4 = Yaw180 if the FC arrow points backwards
ARSPD_TYPE        1      # I2C-MS4525D0 (ASPD-4525)
ARSPD_USE         1
SERIAL2_PROTOCOL  23     # ELRS receiver on USART1
RSSI_TYPE         3      # RSSI from the receiver protocol
SERIAL3_PROTOCOL  5      # GPS on USART2

# 4. Speeds (m/s; sim stall VS = 10)
AIRSPEED_MIN      12     # ~1.2 x stall (was ARSPD_FBW_MIN)
AIRSPEED_CRUISE   14     # (was TRIM_ARSPD_CM, cm/s)
AIRSPEED_MAX      20
Q_ASSIST_SPEED    9      # 3 m/s below AIRSPEED_MIN; 0 blocks arming
Q_TRANSITION_MS   5000   # blend time after AIRSPEED_MIN is reached (default 5000)
```

The servo reversal values are an example only: set them on the bench so MANUAL tilts the rotors forward and
QSTABILIZE points them up [4].

### 5.5 Flight modes used by the original

Mode numbers for `FLTMODE1`..`FLTMODE6` on `FLTMODE_CH` [3]:

| Mode | Number | Original's use | What it does |
|---|---|---|---|
| QSTABILIZE | 17 | (setup check) | VTOL self-level, manual throttle; rotors straight up |
| **QHOVER** | 18 | default mode | VTOL with altitude hold (original's "fly it as a drone") |
| QLOITER | 19 | (recommended) | VTOL position + altitude hold, needs GPS |
| QLAND | 20 | | VTOL descent and land |
| **QRTL** | 21 | "come home + land" | return home (as a plane if far, then VTOL) and land [18] |
| QAUTOTUNE / QACRO | 22 / 23 | | |
| MANUAL | 0 | | rotors snap forward at 90 °/s, VTOL motors stop: **stall if slow** [4][10] |
| FBWA / FBWB / CRUISE | 5 / 6 / 7 | transition target | forward transition starts when entered from a Q mode [10] |
| CIRCLE / LOITER | 1 / 12 | original's auto cruise circle | fixed-wing circling; entering from a Q mode transitions first |
| AUTO | 10 | range mission | `VTOL_TAKEOFF`, `WAYPOINT`, `VTOL_LAND`, `RETURN_TO_LAUNCH` |
| RTL | 11 | | with `Q_RTL_MODE 1` flies home as a plane and switches to QRTL within `RTL_RADIUS` [3] |
| Loiter to QLand | 25 | | |

```
# Transition (forward): from QHOVER/QLOITER switch to FBWA, CRUISE, LOITER or AUTO.
# Tiltrotor sequence [10]: rotors tilt to Q_TILT_MAX, VTOL motors hold height until AIRSPEED_MIN,
# then their share fades out over Q_TRANSITION_MS and the rotors finish tilting at 90 deg/s [4].
Q_TILT_MAX        45
Q_TRANSITION_MS   5000
Q_TRANS_FAIL      15     # s (example; default 0 = no limit): cancel a transition that has not reached AIRSPEED_MIN
Q_TRANS_FAIL_ACT  1      # -1 warn, 0 QLand (default), 1 QRTL
Q_TRAN_PIT_MAX    3      # max pitch during transition in AUTO (0-30 deg, default 3)

# Back-transition: switch to any Q mode. Tilt-rotors move to VTOL position at Q_TILT_RATE_UP;
Q_TRANS_DECEL     2.0    # m/s/s used to plan the stopping distance (0.2-5, default 2)
Q_BACKTRANS_MS    3000   # pitch-limit ramp for back-transition in position modes (default 3000, 0 disables)

# Q_ASSIST (assisted fixed-wing flight) [3]
Q_ASSIST_SPEED    9      # m/s; below it the VTOL motors help. -1 = only during transitions; 0 fails pre-arm
Q_ASSIST_ANGLE    30     # deg attitude error that also triggers assist
Q_ASSIST_ALT      0      # m AGL; 0 disables
Q_ASSIST_DELAY    0.5    # s

# QRTL / RTL and landing [3][18]
Q_RTL_MODE        1      # RTL switches to QRTL within RTL_RADIUS of home (2 = VTOL approach, 3 = QRTL always)
RTL_AUTOLAND      0      # must be 0 when Q_RTL_MODE != 0 (pre-arm check) [9]
Q_RTL_ALT         15     # m, QRTL return altitude (default 15)
Q_LAND_FINAL_ALT  6      # m, where the final slow descent starts (0.5-50)
Q_LAND_FINAL_SPD  0.5    # m/s final descent (was Q_LAND_SPEED 50 cm/s)
Q_M_SPIN_ARM      0.08   # armed idle (0-0.2, default 0.1; must be below Q_M_SPIN_MIN, default 0.15)
```

Mission for the original's range run (ArduPilot mission items; MAV_CMD_NAV_VTOL_TAKEOFF / NAV_VTOL_LAND):

```
VTOL_TAKEOFF      alt 10
WAYPOINT          coastline, lighthouse, turbine
VTOL_LAND         rooftop pad
RETURN_TO_LAUNCH  # with Q_RTL_MODE 1: plane home, QRTL to land
```

`Q_OPTIONS` bits to know [3]: bit 0 Level Transition, bit 18 ARMVTOL (arm only in VTOL modes), bit 19
CompleteTransition if Q_TRANS_FAIL times out; QRTL as pure VTOL needs bit 16 [18].

### 5.6 Failsafes [3]

```
THR_FAILSAFE      1      # RC loss failsafe
THR_FS_VALUE      950    # PWM below which throttle failsafe triggers (if receiver outputs low throttle)
FS_SHORT_ACTN     0      # 0 CIRCLE/no change, 1 CIRCLE, 2 FBWA zero throttle, 3 disable, 4 FBWB
FS_LONG_ACTN      1      # 1 RTL (-> QRTL near home with Q_RTL_MODE 1); 4 Auto, 5 AUTOLAND
FS_LONG_TIMEOUT   5      # s (default 5)
BATT_CAPACITY     8000
BATT_LOW_VOLT     13.2   # 4S Li-ion 3.3 V/cell under load (example)
BATT_CRT_VOLT     12.4   # 3.1 V/cell (example)
BATT_FS_LOW_ACT   1      # 1 RTL; 4 QLand, 6 Loiter to QLand, 7 AUTOLAND or RTL
BATT_FS_CRT_ACT   4      # QLand
```

In QSTABILIZE, QHOVER, QLOITER, QAUTOTUNE and QACRO an RC failsafe switches to **QLAND** by default; `Q_OPTIONS` bit 5
(value 32) makes it QRTL, bit 20 forces RTL [3][21]. Voltage thresholds are examples, not defaults.

### 5.7 OSD and VTX

```
OSD_TYPE          1      # built-in AT7456E (MAX7456-compatible); 5 = MSP_DISPLAYPORT for HD
OSD1_ASPEED_EN    1      # airspeed used by TECS
VTX_ENABLE        1
SERIAL6_PROTOCOL  37     # SmartAudio on UART4 TX (44 = IRC Tramp)
VTX_BAND          4      # RaceBand (0 A, 1 B, 2 E, 3 Airwave, 4 RaceBand)
VTX_CHANNEL       0      # 0-7 (R1)
VTX_POWER         25     # mW: low on the bench
VTX_MAX_POWER     800
```

The original's "three numbers to watch in a transition" (airspeed, tilt angle, battery): airspeed (`OSD1_ASPEED_EN`), battery
(`OSD1_BAT_VOLT_EN`, `OSD1_CURRENT_EN`, `OSD1_BATUSED_EN`) and flight mode (`OSD1_FLTMODE_EN`) are standard OSD items, but
the 4.7.2 parameter list has **no tilt-angle OSD item** [3]. Tilt angle is written to the dataflash log (a tiltrotor
log message in `tiltrotor.cpp` [5]); SimLab's own HUD may show it, but do not claim the real OSD does.

### 5.8 RPM filtering (harmonic notch) [3][11]

```
# needs firmware MatekH743-bdshot (outputs 1-8 bidirectional) and AM32/BLHeli_32 ESCs
Q_M_PWM_TYPE      6      # DShot600
SERVO_BLH_BDMASK  28     # outputs 3,4,5 (bits 2,3,4) bidirectional DShot
SERVO_BLH_POLES   14     # motor magnet poles (default 14)
INS_HNTCH_ENABLE  1      # reboot to see the rest
INS_HNTCH_MODE    3      # ESC Telemetry (1 = Throttle-based, no telemetry needed)
INS_HNTCH_REF     1
INS_HNTCH_FREQ    80     # Hz, lower bound (example)
```

### 5.9 Motor direction reversal

- **In the ESC (via ArduPilot):** `SERVO_BLH_RVMASK` = bitmask of output channels whose motor direction is reversed
  (e.g. 4 = output 3) [3]. Needs BLHeli passthrough on those outputs: `SERVO_BLH_AUTO 1` (auto-enables multicopter
  motors) or `SERVO_BLH_MASK`. The tilt guide warns: in a **non-vectored** tri do not set `SERVO_BLH_AUTO 1`; set
  `SERVO_BLH_MASK` to the actual ESC outputs instead [4].
- **In the ESC configurator:** AM32 configurator / BLHeliSuite32 (existing ESCs) via ArduPilot passthrough, "Motor
  direction: reversed".
- **Physically:** swap any two of the three motor phase wires.
- Props must then match: fronts counter-rotating.

### 5.10 Accelerometer, compass and airspeed calibration

- Accelerometer: Mission Planner Setup > Mandatory Hardware > Accel Calibration: 6 positions (level, left, right,
  nose down, nose up, back), then "Calibrate Level" with the **wing level and the fuselage at its normal flying
  attitude** **(unverified menu path for 4.7)**. `Q_TRIM_PITCH` compensates the difference between AHRS level and
  VTOL hover pitch (-10 to +10°) [3].
- Compass: onboard calibration (rotate the aircraft about all axes until complete), then reboot. Keep the compass on
  the mast, away from ESC and battery currents.
- Airspeed: offset calibration happens at every boot (cover the pitot tube against wind during boot, or set
  `ARSPD_SKIP_CAL`) [3]; ratio calibration in flight with `ARSPD_AUTOCAL 1`, which "should not be left enabled" [3].

### 5.11 Arming checks (pre-arm messages, 4.7.2 source [9])

`ARMING_SKIPCHK` (4.7+, replaces `ARMING_CHECK`) is a bitmask of checks to **skip**: 1 Barometer, 2 Compass, 3 GPS
lock, 4 INS, 5 Parameters, 6 RC Channels, 7 Board voltage, 8 Battery level, 9 Airspeed, 10 Logging, 11 Safety switch,
12 GPS config, 13 System, 14 Mission, 15 Rangefinder, 16 Camera, 17 AuxAuth, 19 FFT; leave it 0 [3]. QuadPlane-
specific pre-arm failures, verbatim from the source [9]:

| Message | Cause |
|---|---|
| `Q_ASSIST_SPEED is not set` | Q_ASSIST_SPEED = 0 on a non-tailsitter |
| `tiltrotor setup not complete, reboot` | changed Q_TILT_ENABLE / Q_ENABLE without a reboot |
| `Quadplane enabled but not running` | Q_ENABLE set, QuadPlane not initialised (reboot) |
| `AIRSPEED_MIN too low (x < 5)` | AIRSPEED_MIN below 5 m/s |
| `unset one of RTL_AUTOLAND or Q_RTL_MODE` | both set |
| `Motors: ...` | motor/output setup problem |
| `set TAILSIT_ENABLE 0 or TILT_ENABLE 0` | both tailsitter and tiltrotor enabled |
| `ROLL_LIMIT_DEG too small`, `PTCH_LIM_MAX_DEG too small`, `PTCH_LIM_MIN_DEG too large` | fixed-wing limits |
| `Waiting for RC` | no receiver |
| `AHRS: ...` | EKF/AHRS not ready (e.g. no GPS lock, bad compass) |

## 6. Safety tests

| Test | How | What it catches |
|---|---|---|
| **Smoke stopper** | A fuse-like current limiter (a resettable PTC/polyfuse, or an inline incandescent bulb / electronic limiter) between battery and XT60 for the **first power-up**. A short circuit makes it limit current to a fraction of an amp so nothing burns | Solder bridges, reversed power leads, a shorted ESC or capacitor, before they burn the FC |
| **Tilt servo test** (original's button; real: switch MANUAL ↔ QSTABILIZE on the bench, armed only if needed, props off) | MANUAL must tilt the rotors **forward**, QSTABILIZE **straight up**; both servos move together and smoothly, no binding, wires slack [4] | Reversed tilt servo (motors swing back in transition: tail-first flip), wrong SERVO_MIN/MAX end points, binding nacelles |
| **Props-off motor test** | Mission Planner Setup > Optional Hardware > Motor Test (spins each VTOL motor in turn at a small throttle; QuadPlane implements MAV_CMD_DO_MOTOR_TEST in `quadplane.cpp` [21], the menu path is **(unverified)** for the Oct 2026 Mission Planner); check order M1 front right, M2 front left, M4 rear and spin direction from above | Wrong output mapping, reversed motor (flips on take-off) |
| **Control-surface / vectored-yaw check** | In QSTABILIZE, yaw stick: front rotors tilt in opposite directions; in FBWA, tilt the airframe: ruddervators correct the right way | Reversed V-tail mixing, vectored yaw reversed |
| **Accelerometer calibration** | 6-position + level (5.10) | Wrong board orientation, tilted hover, drift |
| **Compass calibration** | rotate on all axes; check heading against a real compass | Interference from power leads; GPS modes toilet-bowling |
| **Airspeed check** | blow gently into the pitot: airspeed rises; covered pitot reads about 0 | Swapped pitot tubes (reads 0 or negative), blocked port, no sensor |
| **Pre-arm checks** | must all pass (5.11); never set ARMING_SKIPCHK to skip | Missing Q_ASSIST_SPEED, no GPS, uncalibrated sensors |
| **First hover, then first transition** | hover in QHOVER/QLOITER first; first transition high (30 m+), into wind, with a switch back to QHOVER under the thumb (original lesson; standard advice) | Poor VTOL tune, tilt problems, before speed is involved |

## 7. Flight characteristics (default build; estimates unless cited)

| Quantity | Value |
|---|---|
| AUW | 1585 g (calculator); 1600-1650 g realistic |
| Hover T:W | 2.8 (calculator), about 2.3-2.6 real |
| Hover current / power | about 15-16.5 A, 220-240 W (section 3.5; matches the calculator's 15.3 A) |
| Cruise current / power at 13 m/s | about 5 A, 70-75 W (calculator 5.1 A; the original sim's 1.2-1.3 A is wrong) |
| Hover : cruise power | about 3 : 1 |
| Hover endurance | about 20-25 min (Li-ion sag), but real missions hover only 1-3 min |
| Cruise endurance | about 70-75 min at 80 % of 8 Ah |
| Stall / cruise | original sim: VS 10 m/s, VC 13 m/s. With the drawn 0.126 m² wing, stall would be about 13-14 m/s (2.5) |
| L/D | calculator 6, sim about 9; 6-8 is realistic for a small foam VTOL with nacelles and pods |
| Top speed | about 20-25 m/s: a 9x5 prop at about 12 000 rpm has a pitch speed of 25 m/s |
| Transition speed | AIRSPEED_MIN (recommended 12 m/s here); transition takes about 5-10 s: tilt to Q_TILT_MAX, accelerate to AIRSPEED_MIN, then Q_TRANSITION_MS (5 s) [10] |
| Motor-out | A tricopter has no motor redundancy: losing any motor in hover is a crash. In cruise, losing a front motor gives asymmetric thrust (yaw), but the wing can glide or fly on the other front motor; Q_ASSIST cannot help once a lift motor is gone |
| Wind | Back-transition and landing into wind; tiltrotors weathervane in hover |

## 8. Real failure modes

| Failure | Cause | What the pilot sees |
|---|---|---|
| **Tilt servo reversed** | servo direction or SERVOn_REVERSED wrong | Fine hover; at transition the rotors swing **back**, the nose pitches up and it flips over its tail (original's crash) |
| **Wrong tilt rate sense** | RATE_UP/RATE_DN swapped (the original's snippet) | Forward tilt slower or faster than intended; a fast back-transition makes the nose balloon and stall |
| **Q_ASSIST_SPEED too high / 0** | 0 blocks arming; too high wastes battery with false assists; -1 means no rescue | Lift motors spin up in cruise, or a slow turn stalls and spins with no VTOL rescue |
| **Transition stall** | AIRSPEED_MIN too low, transition downwind, switching to MANUAL in hover | Rotors snap forward, wing not flying, sinks or tip-stalls into a spiral |
| **Airspeed sensor failure** | blocked pitot, water, swapped tubes, prop wash on the pitot | Wrong airspeed: transition never completes, or completes too early and stalls; ArduPilot may fall back to synthetic airspeed |
| **Reversed motor / swapped props** | motor direction or prop direction wrong | Flips on take-off in QHOVER (original: 0.7 s) |
| **FC arrow backwards** (AHRS_ORIENTATION) | board mounted 180° off | Flips on take-off; in plane mode every correction goes the wrong way |
| **Desync** | wrong KV/prop pairing (racing 2306 on 9 in), BLHeli timing, brown-outs | A motor stops mid-air; a tri cannot survive it in hover |
| **Brown-out** | servo BEC overloaded by metal-gear tilt servos stalling, or battery sag | FC reboots in flight; tilt servos twitch; total loss |
| **Missing / weak capacitor** | voltage spikes from ESC braking | ESC failure, noisy current reading, video lines, FC resets |
| **Wire fatigue at the pivot** | tight wire loops at the tilt axis | Intermittent motor after hundreds of transitions: a desync-like stop |
| **Vectored yaw slop** | loose nacelle linkage | Yaw wobble in hover, poor heading hold |
| **Prop wash on the wing / tail** | front props in hover blow on the wing | Pitch-down moment and reduced lift in hover; buffeting |
| **GPS / compass errors** | compass near the ESC wires, no GPS lock | QLOITER toilet-bowls, QRTL goes the wrong way; "AHRS" pre-arm failure |
| **CG wrong** | battery too far aft or forward | Pitch oscillation in hover; nose-heavy or tail-heavy in cruise |
| **Wing too small for the weight** | (this figure's drawn wing) | At AIRSPEED_MIN the wing cannot carry the weight: after the transition it sinks, stalls, or keeps triggering Q_ASSIST, and endurance collapses |

## 9. Uncertainties

- Battery, motor, servo, GPS and airspeed-sensor masses and prices in section 3 are typical-product ranges from
  memory and listings, not checked product by product **(unverified)**.
- Matek H743-WING V3 IMU: current retailers say ICM42688-P + ICM42605 [12]; ArduPilot's page still lists MPU6000 +
  ICM20602 [11]. Current sensor rating differs (132 A [11] vs 90 A continuous / 220 A peak [12]). Retail price varies.
- All flight-performance numbers are physics estimates (momentum theory with figure of merit 0.6, propulsive
  efficiency 50-55 %, L/D 6); no bench test of this exact build exists.
- HEEWING T1 endurance (65 min) is a manufacturer claim [13]; whether its stock VTOL params use Q_TILT_TYPE 2 was not
  checked **(unverified)**.
- E-flite Convergence flying weight and motor KV were not found in the time box.
- Mission Planner menu paths (Motor Test, Accel Calibration) are from long-standing practice, not re-checked for the
  October 2026 Mission Planner build **(unverified)**.
- Q_TRANSITION_MS: the 4.5.0 notes say "Transition time may be no less than 2 seconds" [2], but the 4.7.2 code
  clamps it to 500-30000 ms (`constrain_float(quadplane.transition_time_ms, 500, 30000)` in `quadplane.cpp`) and the
  parameter docs give 500-30000 [3]. I trust the code: the floor is 0.5 s. Keep 5000 (default) anyway.
- Where my figures disagree with the original's sim (stall speed vs drawn wing, cruise current), I trust physics and
  the calculator over the sim; the sim constants were tuned for feel, not derived.
