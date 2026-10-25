# Fact sheet: heavy-lift cinema octocopter on ArduCopter (Drone Lab Fig. 13, `octo`)

Status: firmware facts verified against the ArduPilot source at tag `Copter-4.7.2` (the current Copter stable on
2026-10-24) and the ardupilot.org / PX4 docs; hardware figures against manufacturer pages. Anything not checked is
marked "(unverified)". Firmware facts come from source code first, docs second, community sites last.

**Read this first.**
1. ArduCopter 4.7 renamed many parameters to SI units (metres, m/s). The original's snippets (`LOIT_SPEED 1250`,
   `LOIT_ACC_MAX`, `LOIT_BRK_ACCEL`, `PILOT_SPEED_UP 250`, `RTL_ALT 550`, `RTL_ALT_FINAL`) use pre-4.7 names in
   centimetres. 4.7 is reported to convert old values on first boot (unverified here), but anything iynk shows must
   use the 4.7 names (section 5.1).
2. The original numbers its motors sequentially round the frame. ArduPilot octa X (`FRAME_TYPE 1`) does not, and every
   one of the original's spin directions is the reverse of ArduPilot octa X at that position (section 2.2).
3. `LGR_DEPLOY_ALT` / `LGR_RETRACT_ALT` are in **metres** (`@Units: m`, range 0-1000). The original's `300 # cm` would
   mean 300 m, and because the code only auto-retracts when `LGR_RETRACT_ALT >= LGR_DEPLOY_ALT`, it would also
   silently disable auto-retract. Use e.g. `LGR_DEPLOY_ALT 3`, `LGR_RETRACT_ALT 4`.
4. The task brief mentions "28-30 inch props". They **cannot** fit a 1360 mm flat octo: neighbouring motors are only
   520 mm (20.5") apart, so the largest prop that clears is 20" (section 2.4). 28-33" props belong on big quads such
   as the Freefly Alta X (33 x 9"). The original's 18/20/22" options are the right class for this frame.

## 0. Header

**Craft class:** heavy-lift camera multirotor: flat octocopter X (eight motors in one plane, alternating spin), 1360 mm
motor-to-motor diagonal, folding carbon-tube arms, 12S LiPo (two 6S packs in series), 20" folding carbon props,
ArduCopter on a Pixhawk 6X, carrying a cinema camera on a 3-axis stabilised gimbal, with retractable landing gear.

**Real products / reference builds it represents:**

| Reference | What it is | Key figures | Link |
|---|---|---|---|
| DJI Spreading Wings S1000+ | The classic flat-octo cinema frame (discontinued) | 1045 mm wheelbase, 386 mm arms, 4114 400 KV motors, 15 x 5.2" folding props, 40 A ESCs, 6S, 4.4 kg frame, 6-11 kg take-off weight, retractable gear [10] | https://www.dji.com/spreading-wings-s1000-plus/info |
| Tarot T18 (TL18T00) | Open 1270 mm foldable octo frame, the closest hobby match to Fig. 13 | 1270 mm motor-axis diameter, up to 18" props, 3K carbon; typically 5008-class motors on 6S, two 6S packs [11] | https://www.getfpv.com/tarot-t18-1270mm-octocopter-foldable-frame-tl18t00.html |
| Freefly Alta X (quad, for comparison) | Professional heavy-lift cinema quad (the "big props, few motors" alternative) | 1415 mm diameter without props, 2273 mm with props, 33 x 9" props, 115 KV-equivalent motors, 44.4 V (12S) on two XT90 packs, 10.86 kg empty, 34.86 kg MTOW, 15.06 kg max payload, PX4-based FC [12] | https://freeflysystems.com/alta-x/specs |

**What it is and what it is for.** A heavy-lift cinema octocopter carries a professional cinema camera (RED Komodo,
ARRI Alexa Mini LF) on a stabilised gimbal for film and TV aerial shots: tracking a car down
a road, orbiting a subject, a slow rising "reveal". The payload often costs more than the aircraft, so the design goal
is not falling: with eight motors the autopilot can lose one and still control thrust, roll, pitch and (with reduced
authority) yaw, and land. Low-KV motors on 12S turning big slow props give efficient thrust; GPS + compass position
hold (Loiter) gives the smooth, locked-off hover a camera operator needs; the landing legs fold up so the gimbal can pan
360 degrees without the legs in shot. Usually flown by two people: a pilot and a separate gimbal/camera operator.

## 1. Sources

Firmware source code (ArduPilot tag `Copter-4.7.2`, base `https://github.com/ArduPilot/ardupilot/blob/Copter-4.7.2/`):

1. Releases and stable build server: https://github.com/ArduPilot/ardupilot/releases ; `https://firmware.ardupilot.org/Copter/stable/Pixhawk6X/git-version.txt` reports `APMVERSION: ArduCopter V4.7.2` (checked 2026-10-24).
2. `libraries/AP_Motors/AP_MotorsMatrix.cpp` (octa motor tables `setup_octa_matrix()`, `check_for_failed_motor()`, thrust boost) and `AP_Motors_Class.h` (frame class/type enums).
3. `ArduCopter/crash_check.cpp` (`thrust_loss_check()`, `yaw_imbalance_check()`, crash check constants).
4. `libraries/AP_Motors/AP_MotorsMulticopter.cpp` + `.h` (MOT_* params and defaults).
5. `libraries/AP_LandingGear/AP_LandingGear.cpp` (LGR_* params, deploy = SERVO MAX, retract = SERVO MIN, altitude triggers).
6. `libraries/AP_Mount/AP_Mount_Params.cpp` (MNT1_* params, MNT1_TYPE values).
7. `libraries/SRV_Channel/SRV_Channel.h` (servo function numbers: 29 landing gear, 33-40 motors 1-8), `SRV_Channels.cpp` (SERVO_DSHOT_ESC, SERVO_DSHOT_RATE), `libraries/AP_BLHeli/AP_BLHeli.cpp` (SERVO_BLH_*).
8. `libraries/RC_Channel/RC_Channel.cpp` (RCn_OPTION 29 = Landing Gear).
9. `ArduCopter/Parameters.cpp`, `ArduCopter/mode_rtl.cpp`, `ArduCopter/config.h` (FRAME_*, FLTMODE*, FS_*, PILOT_SPD_*, RTL_*_M and defaults), `libraries/AC_WPNav/AC_Loiter.cpp` (LOIT_*), `libraries/AP_BattMonitor/AP_BattMonitor_Params.cpp` (BATT_*), `libraries/AP_Arming/AP_Arming.cpp` + `ArduCopter/AP_Arming_Copter.cpp` (ARMING_SKIPCHK, pre-arm messages), `libraries/AP_SerialManager/AP_SerialManager.cpp` (SERIALn_PROTOCOL values).

Manufacturer spec pages and test data:

10. DJI Spreading Wings S1000+ specs: https://www.dji.com/spreading-wings-s1000-plus/info (via search snippet; the page timed out on direct fetch).
11. Tarot T18 frame listing (GetFPV): https://www.getfpv.com/tarot-t18-1270mm-octocopter-foldable-frame-tl18t00.html
12. Freefly Alta X specs: https://freeflysystems.com/alta-x/specs
13. T-Motor MN601-S KV170 (6010-class 170 KV motor) with thrust tables on 12S, P20x6 and P21x6.3: https://store.tmotor.com/product/mn601-s-kv170-motor-navigator-type.html
14. Holybro Pixhawk 6X on PX4 docs (sizes, ports, UART map): https://docs.px4.io/main/en/flight_controller/pixhawk6x
15. Pixhawk 6X on ArduPilot docs (SERIALn map, outputs, DShot, battery monitor): https://ardupilot.org/copter/docs/common-holybro-pixhawk6X.html
16. Tattu 6S 16000 mAh 15C (1932 g original, 2063 g "Plus"): https://www.getfpv.com/discontinued/tattu-16000mah-6s-15c-lipo-battery.html , https://www.adorama.com/tap15166as15.html
17. Tattu 6S 22000 mAh 25C (2490-2650 g depending on SKU): https://www.getfpv.com/tattu-22000mah-6s-25c-lipo-battery-5340.html , https://www.getfpv.com/tattu-plus-22000mah-22-2v-25c-6s-lipo-smart-battery-pack.html
18. Gremsy T7 gimbal (1860 g, 3175 g max payload): https://gremsy.com/products/gremsy-t7 , https://www.bhphotovideo.com/c/product/1851042-REG/gremsy_20t001_t7_gimbal.html
19. RED Komodo 6K (0.95 kg body): https://www.red.com/komodo-6k ; ARRI Alexa Mini LF (2.6 kg body + LPL mount): https://www.newsshooter.com/2019/03/28/arri-alexa-mini-lf-announced/

ArduPilot docs (ardupilot.org, Copter):

20. ArduPilot Copter docs (all URLs checked to resolve on 2026-10-24): motor-order diagrams and Motor Test ("green = CW, blue = CCW", letters = Mission Planner SETUP > Optional Hardware > Motor Test) https://ardupilot.org/copter/docs/connect-escs-and-motors.html ; landing gear https://ardupilot.org/copter/docs/landing-gear.html ; cameras and gimbals https://ardupilot.org/copter/docs/common-cameras-and-gimbals.html and Gremsy https://ardupilot.org/copter/docs/common-gremsy-pixyu-gimbal.html ; thrust loss and yaw imbalance ("the result of a motor or motors saturating at 100% throttle") https://ardupilot.org/copter/docs/thrust_loss_yaw_imbalance.html ; notch filtering https://ardupilot.org/copter/docs/common-imu-notch-filtering.html ; accelerometer calibration https://ardupilot.org/copter/docs/common-accelerometer-calibration.html ; compass calibration https://ardupilot.org/copter/docs/common-compass-calibration-in-mission-planner.html

Research doc:

21. `docs/research/drone-lab-b.md`, section "Fig 13. Heavy-lift octocopter" (what the original shows and its known defects).

## 2. Geometry (craft frame: x forward, y left, z up, origin at frame centre on top of the bottom plate, mm)

### 2.1 Frame layout

| Item | Value | Note |
|---|---|---|
| Layout | Flat octo X: 8 arms at 45 deg spacing, offset 22.5 deg from the nose so no arm points straight forward | ArduPilot `FRAME_CLASS 3`, `FRAME_TYPE 1` [2] |
| Wheelbase (motor-to-motor diagonal) | 1360 mm (motor radius R = 680 mm) | original; Tarot T18 is 1270 mm [11], DJI S1000+ 1045 mm [10] |
| Neighbour motor spacing (chord) | 2 R sin(22.5 deg) = **520.4 mm** (20.49") | sets the prop-clash limit |
| Arms | 8 carbon tubes, 32 mm OD (original), folding hinge with clamp at r 230-272 mm, arm from r 170 to the motor at r 680, motor plate ~80 mm | real 1200-1400 mm octos use 25-30 mm tubes (unverified); DJI S1000 arm length 386 mm [10] |
| Centre plates | Two octagonal carbon plates: bottom r 200 mm at z 0-6, top r 180 mm at z 60-66 | original; DJI S1000+ centre frame 337 mm diameter [10] |
| Motor height | motor mount on the arm centreline at z = 33 | original |
| FC mounting | Pixhawk 6X on the top plate centre, arrow forward, on vibration-damped standoffs; standard baseboard 52.4 x 103.4 x 16.7 mm, 51 g (+ FMU module 23 g) [14] | original draws 100 x 90 x 26 mm |
| Power board | 160 x 160 mm PDB with a large electrolytic capacitor, two XT90-S at the rear | original |
| Battery | Tray 350 x 230 mm on four posts above the top plate; two 6S packs side by side (each ~200 x 90 x 70 mm), centred on the CG | original draws 220 x 96 x 74 mm packs; Tattu 16 Ah is 180-202 x 74-88 x 65-70 mm [16] |
| GPS | Mast 184 mm tall at x = -150 (rear), 88 mm puck, arrow forward | keep GPS/compass away from the 12S wiring |
| Gimbal + camera | Hung under the front at x = +90; yaw motor, 220 mm cross bar, roll/tilt motors; camera body ~180 x 124 x 125 mm, 88 mm lens 120 mm long | original |
| Landing gear | Two legs per side to a skid bar at y = +-270, z = -380 (down); retracted they swing to y = +-530, z = -50 | original; the sim retracts between 1.2 and 2.4 m |
| Frame mass | 3200 g (original "1360 mm octo frame, folding arms") | plausible: DJI S1000+ total 4.4 kg includes motors, ESCs and gear [10] |

### 2.2 Motor positions, ArduPilot numbering and spin (FRAME_CLASS 3, FRAME_TYPE 1 "X")

ArduPilot defines octa X in `setup_octa_matrix()` [2] as `{angle, yaw factor, test order}` per motor, where the
angle is measured clockwise from the nose seen from above (positive = right) and the array index is the motor number
(motor n = output SERVOn, `SERVOn_FUNCTION = 32 + n`, i.e. 33-40 [7]). Positions below are x = R cos(a),
y = -R sin(a) with R = 680 mm. Spin is seen from above. The "test" letter is the Mission Planner Motor Test button,
which runs clockwise from the front-right motor.

| Motor (output) | Angle (deg, CW from nose) | x (mm) | y (mm) | Position | Spin (default) | Prop | Motor test |
|---|---|---|---|---|---|---|---|
| M1 (SERVO1) | 22.5 | 628.2 | -260.2 | front-right | CW | CW prop | A |
| M3 (SERVO3) | 67.5 | 260.2 | -628.2 | right-front | CCW | CCW prop | B |
| M8 (SERVO8) | 112.5 | -260.2 | -628.2 | right-rear | CW | CW | C |
| M4 (SERVO4) | 157.5 | -628.2 | -260.2 | rear-right | CCW | CCW | D |
| M2 (SERVO2) | -157.5 | -628.2 | 260.2 | rear-left | CW | CW | E |
| M6 (SERVO6) | -112.5 | -260.2 | 628.2 | left-rear | CCW | CCW | F |
| M7 (SERVO7) | -67.5 | 260.2 | 628.2 | left-front | CW | CW | G |
| M5 (SERVO5) | -22.5 | 628.2 | 260.2 | front-left | CCW | CCW | H |

Going clockwise round the frame from the front-right: M1, M3, M8, M4, M2, M6, M7, M5, alternating CW/CCW. Diagonally
opposite motors spin the same way (M1 and M2 both CW; M3 and M6 both CCW).

**Alternatives (same positions, other numbering/spins), all verified in `setup_octa_matrix()` [2]:**

| FRAME_TYPE | Name | Numbering | Front-right motor spin |
|---|---|---|---|
| 1 | X (default) | non-sequential, table above | M1 CW |
| 13 | DJI_X | M1 front-right, then **counter-clockwise** (M2 front-left at -22.5, M3 -67.5 ... M8 at +67.5) | M1 CCW, alternating |
| 14 | CW_X ("ClockwiseX") | M1 front-right, then **clockwise** (M2 67.5, M3 112.5 ... M8 -22.5) | M1 CCW, alternating |
| 0 | Plus | M1 on the nose (0 deg) | - |
| 2, 3, 15 | V, H, I | non-circular layouts | - |

There is no octa "reversed" frame type (unlike quad `FRAME_TYPE 18` BetaFlightXReversed). To fly every prop the other
way on an octo, use `FRAME_TYPE 13` or `14` (both have the front-right motor CCW) and renumber the outputs.

**What the original does (for the figure builders).** The original places M1..M8 at 22.5 + 45 k deg measured
counter-clockwise from the nose (toward +y, left), with even k CW. So its M1 is front-left CW and the numbering runs
counter-clockwise. At every position, its spin is the opposite of ArduPilot octa X (ArduPilot's front-left motor M5 is
CCW). Its spin pattern equals `DJI_X`/`CW_X` (front-right CCW), and its numbering is `DJI_X` shifted by one: original
Mk = DJI_X M(k+1) (original M8 = DJI_X M1 at the front-right). iynk should draw ArduPilot `FRAME_TYPE 1` (table
above) and label motors by ArduPilot number, since its snippets say `FRAME_TYPE 1`.

### 2.3 Props, motors, mass

| Item | Value | Source |
|---|---|---|
| Prop (default) | 20 x 5.5", 2-blade carbon folding, 62 g (original); real 6010/170 KV pairing is the T-Motor P20 x 6 (2-blade) | [13] |
| Prop options | 18 x 5.5 (229 mm drawn radius), 20 x 5.5 (254), 22 x 5.5 (279) | original |
| Motor | 6010-class outrunner (60 mm stator, 10 mm tall), 170 KV, 72 mm bell drawn (real MN601-S: 68.8 x 34.9 mm, 250 g with cable) | [13] |
| Camera tilt | Gimbal-stabilised, independent of the airframe; the FPV/pilot camera view in the sim is level, 10 deg down, 95 deg FOV | original |
| Battery position | Centred on the CG above the top plate | original |
| Frame mass | 3200 g | original |

### 2.4 Prop-clash geometry check

Neighbouring props clash when the prop diameter D exceeds the motor-to-neighbour chord c = 2 R sin(pi/N), with N = 8
and R = 680 mm: c = 520.4 mm. Tip gap = c - D.

| Prop | D (mm) | Tip gap (mm) | Verdict |
|---|---|---|---|
| 18" | 457.2 | +63.2 | clear |
| 20" | 508.0 | +12.4 | clear but tight (12 mm is less than real practice; flexing blades can touch) |
| 22" | 558.8 | -38.4 | **clash** (overlap) |
| 28" | 711.2 | -190.8 | clash: needs R >= 929 mm (1858 mm wheelbase) |
| 30" | 762.0 | -241.6 | clash: needs R >= 996 mm (1991 mm wheelbase) |

Minimum R for zero gap = D / (2 sin 22.5 deg) = 1.3066 D. Real designers keep 5-10 % of D as clearance (unverified rule
of thumb). In the original, the clash is only a warning and 22" props fly normally; in reality overlapping props on
the same plane strike each other and shatter on spool-up.

## 3. The original's catalogue, sanity-checked

iynk keeps the original calculator identical; this section only flags untrue or implausible descriptions.

### 3.1 Batteries

| Original option | Original figures | Real-world check | Verdict |
|---|---|---|---|
| 2 x 6S 16000 mAh in series (12S) * | 12S, 16000 mAh, 3900 g, $580 | Tattu 6S 16000 mAh 15C: 1932 g (original line), 2063 g (Tattu Plus) [16]; two = 3864-4126 g | OK (3900 g = 2 x 1950 g) |
| 2 x 6S 22000 mAh in series (12S) | 12S, 22000 mAh, 5400 g, $760 | Tattu 6S 22000 mAh 25C: 2490-2650 g per pack [17]; two = 4980-5300 g | Slightly heavy (5400 vs 4980-5300 g) but plausible with leads/connectors |
| 1 x 6S 16000 mAh (6S only) | 6S, 16000 mAh, 1950 g, $290 | as above | OK |

Series wiring: two 6S in series = 12S, 44.4 V nominal, 50.4 V full (4.2 V/cell), capacity stays 16000 mAh.

### 3.2 Motors

| Original option | Original figures | Real-world check | Verdict |
|---|---|---|---|
| 6010 170KV * | 170 KV, 285 g, $120, 12S | T-Motor MN601-S KV170: 250 g, 6-12S, 1500 W / 30 A peak (180 s), recommended 20-21" prop, $130 each ($259.98 a pair) [13] | OK (285 g a little heavy) |
| 6010 130KV (efficient) | 130 KV, 285 g, $120, 12S | 6010-class motors exist in 130-ish KV (unverified exact product) | Plausible; on 12S with 18-22" props it is underpowered, which the original's "weak" warning reflects |
| 6215 230KV | 230 KV, 360 g, $160, 6S | 62xx 230 KV is a 6S heavy-lift class (unverified exact product) | Plausible for 6S; on 12S it overspeeds, which the "over" warning reflects |

**Thrust check of the default (6010 170 KV, 20", 12S).** The original computes 7.55 krpm (KV x 44.4 V, unloaded) and
4501 g per motor at full throttle. T-Motor's test of MN601-S KV170 + P20x6 at 47.3-47.9 V [13]:

| Throttle | Thrust (g) | Current (A) | RPM | Power (W) | g/W |
|---|---|---|---|---|---|
| 50 % | 1957 | 4.3 | 3851 | 206 | 9.50 |
| 64 % | 2819 | 7.1 | 4589 | 339 | 8.31 |
| 75 % | 3572 | 10.1 | 5144 | 481 | 7.42 |
| 100 % | 5809 | 20.7 | 6482 | 980 | 5.93 |

- Loaded full-throttle rpm is 6482 at 47.3 V, not 7.55 krpm: real loaded rpm is ~80 % of KV x V. Scaling thrust with
  V^2 to 44.4 V gives ~5.1 kg; the original's 4501 g at 44.4 V is a little conservative but plausible.
- Hover check: 15486 g / 8 = 1936 g per motor, which is the 50 % row: ~206 W per motor, 8 x 206 = 1650 W, ~37 A at
  44.4 V. The original's hover current 36.7 A and its "~9.5 g/W" both match the T-Motor data. Good.
- Max current: 8 x 20.7 A = 166 A at 47 V real; original 193 A. Plausible.
- Hover thrust fraction 1936 / 5809 = 0.33; ArduPilot's `MOT_THST_HOVER` (a linearised thrust fraction, not raw
  throttle) would learn ~0.33-0.43. The original's "hover throttle 66 %" is `sqrt(AUW / 8T)`, raw stick-like
  throttle; label it "throttle", not `MOT_THST_HOVER`.

### 3.3 Props

| Original option | Original figures | Real-world check | Verdict |
|---|---|---|---|
| 18 x 5.5 carbon folding | pf 0.78, 52 g, $70 | 18" folding carbon blade pairs weigh ~40-60 g (unverified) | Plausible |
| 20 x 5.5 carbon folding * | pf 1.00, 62 g, $85 | T-Motor P20x6 is the matched prop for 170 KV / 12S [13]; weight ~60-70 g (unverified) | Plausible |
| 22 x 5.5 carbon folding | pf 1.22, 74 g, $100 | Does not fit this frame (clash, section 2.4) | Description OK, geometry fails |

Thrust factors: thrust at fixed rpm scales roughly with D^4 (and pitch); (18/20)^4 = 0.66 and (22/20)^4 = 1.46, so the
original's 0.78 / 1.22 look small (they are closer to D^2.4). But on the same motor and voltage a bigger prop loads the
motor and its rpm falls, so the full-throttle thrust ratio is well below D^4. T-Motor's own data on this motor: P21x6.3
vs P20x6 at 100 % gives 6605 / 5809 = 1.14 [13] where (21/20)^4 = 1.22 (D^2.6 effective). So the original's factors are
plausible for "same motor, full throttle". Kept as-is.

### 3.4 Fixed parts

| Original part | g | $ | Real-world check | Verdict |
|---|---|---|---|---|
| 1360 mm octo frame, folding arms | 3200 | 900 | Tarot T18 class frame; DJI S1000+ "total weight 4.4 kg" includes motors/ESCs/gear [10] | Plausible |
| 8 x 80 A ESC in the arms | 640 (80 g each) | 480 | The motor draws 20.7 A max, 30 A peak [13]; T-Motor recommends a 60 A 12S ESC (FLAME 60A) [13]. 80 A is oversized but harmless | Plausible but oversized; "80 A" is not needed |
| Pixhawk 6X flight controller | 60 | 380 | Standard set FMU 23 g + baseboard 51 g = 74 g [14] | OK (60 vs 74 g) |
| Dual GPS + compass on a mast | 70 | 120 | Two M9N/M10-class pucks + mast weigh more like 100-150 g (unverified) | Light |
| 12S PDB + XT90 anti-spark | 180 | 90 | XT90-S has a built-in anti-spark resistor contact (true) | OK |
| RC receiver + 900 MHz telemetry | 60 | 150 | ELRS receiver (~5 g) + SiK/RFD900x radio (~15-20 g) + antennas | OK |
| Retractable landing gear | 600 | 350 | DJI S1000 has servo-driven retracts (true) | Plausible |
| 3-axis cinema gimbal | 1400 | 1800 | Gremsy T7: 1860 g, carries up to 3175 g [18]; Freefly MoVI Pro ~2.65 kg (unverified) | Light for a 2.3 kg camera; 1.8-2.7 kg is realistic |
| Cinema camera + lens (payload) | 2300 | 0 | RED Komodo 6K body 0.95 kg [19] + cine lens 0.5-1.5 kg + battery/media: 1.8-2.8 kg; ARRI Alexa Mini LF body 2.6 kg [19] (with lens 3.5-4.5 kg) | OK for Komodo-class; an Alexa Mini LF would be over |
| Battery tray + standoffs | 300 | 60 | - | Plausible |

Fixed total 8810 g (original). Default AUW 15486 g. The Alta X carries 15 kg payload at 34.9 kg MTOW [12], so this
octo is a medium-lift class, not truly "heavy" by industry standards.

### 3.5 Other text claims

| Claim in the original | Real-world fact |
|---|---|
| "170 KV x 44 V turns a 20" prop at about 7500 rpm" | 7548 rpm is the no-load figure; loaded it is ~6000-6500 rpm at full throttle [13] |
| Gimbal "talks to the Pixhawk over CAN" while the code says `MNT1_TYPE 4` (SToRM32 MAVLink) | Inconsistent. Pick one: Gremsy-class gimbals use `MNT1_TYPE 6` "MAVLink (Gremsy/AVT)" on a serial port [6]; there is no plain "CAN" mount type in 4.7.2's MNT1_TYPE list [6] |
| "Motor 3 failed! ... Mixer: rebalancing 7 motors" and "ESC 3: no RPM telemetry, motor lost" | ArduCopter has no "rebalancing" message. The real message, only if thrust saturates, is `Potential Thrust Loss (N)` (EMERGENCY severity) [3]; otherwise the attitude controller just absorbs the loss silently. ESC telemetry loss can produce ESC telemetry warnings (unverified wording) |
| "hover throttle goes up ~15 %" | Thrust per motor rises 8/7 = +14.3 %; raw throttle rises ~sqrt(8/7) = +6.9 % (the original's own measurement 0.66 -> 0.70); but the motor opposite the dead one must slow, and the neighbours carry more, so real per-motor loads are uneven |
| `LGR_DEPLOY_ALT 300 # cm` | Metres. Use `LGR_DEPLOY_ALT 3` [5] |
| Mission comment "34 ... LOITER_TURNS" | MAV_CMD 34 is `DO_ORBIT`; `LOITER_TURNS` is 18 (unverified against source in this pass; from research doc) |
| `BATT_MONITOR 4` "voltage + current from the power module" | On a Pixhawk 6X the supplied power module is digital I2C: `BATT_MONITOR 21` (INA2xx), `BATT_I2C_BUS 1`, HV (12S/14S) module address 69. Analog ADC monitoring is not supported on this board [14][15] |
| Signal leads to "MAIN OUT 1-8" | Correct and conventional: on a Pixhawk 6X MAIN OUT 1-8 are the IO-processor outputs = SERVO1-8. AUX OUT 1-8 (FMU) are SERVO9-16 [15] |

## 4. Electronics and wiring

### 4.1 Flight controller: Holybro Pixhawk 6X [14][15]

| Item | Value |
|---|---|
| MCU | STM32H753, Cortex-M7, 480 MHz, 2 MB flash, 1 MB RAM (FMUv6X) |
| IMUs | Triple redundant: Rev 8 has 3 x ICM-45686 on separate buses (older revisions mixed ICM-42688-P / ICM-20649 / BMI088 (unverified for older revs)); 2 barometers (ICP20100 + BMP388), BMM150 magnetometer |
| Sizes | FMU module 38.8 x 31.8 x 14.6 mm, 23 g; standard baseboard 52.4 x 103.4 x 16.7 mm, 51 g; mini baseboard 43.4 x 72.8 x 14.2 mm, 26.5 g |
| Power in | POWER1/POWER2 4.9-5.5 V (from the power modules), USB 4.75-5.25 V, max 6 V; servo rail 0-36 V |
| Outputs | 16 PWM: MAIN 1-8 from the IO MCU (SERVO1-8), AUX 1-8 from the FMU (SERVO9-16). FMU outputs support DShot except 7-8 (groups 1-4, 5-6, 7-8). IO outputs support DShot only with `BRD_IO_DSHOT 1` + reboot; then IO 1-4 also support bidirectional DShot |
| Ports | GPS1 (with safety switch), GPS2, TELEM1 (1.5 A limit), TELEM2, TELEM3, UART4/I2C, 2 x CAN, Ethernet, I2C, SPI, RC IN (PPM/SBUS), DSM, 2 x POWER (I2C/SMBus) |
| Firmware target | `Pixhawk6X` on firmware.ardupilot.org (bdshot variant also exists) |

**ArduPilot SERIALn map on Pixhawk 6X** [15]:

| SERIALn | UART | Port | Use in this build |
|---|---|---|---|
| SERIAL0 | USB | USB | MAVLink to GCS |
| SERIAL1 | UART7 | TELEM1 | 900 MHz telemetry radio, `SERIAL1_PROTOCOL 2` (MAVLink2), 57600 baud (`SERIAL1_BAUD 57`) |
| SERIAL2 | UART5 | TELEM2 | MAVLink gimbal (Gremsy) `SERIAL2_PROTOCOL 2`, 115200 (`SERIAL2_BAUD 115`) (assignment is this sheet's choice) |
| SERIAL3 | USART1 | GPS1 | GPS 1, `SERIAL3_PROTOCOL 5` |
| SERIAL4 | UART8 | GPS2 | GPS 2, `SERIAL4_PROTOCOL 5` |
| SERIAL5 | USART2 | TELEM3 | spare |
| SERIAL6 | UART4 | UART4/I2C | ELRS/CRSF receiver: `SERIAL6_PROTOCOL 23` (RCIN), `SERIAL6_OPTIONS 0` |
| SERIAL7 | USART3 | DEBUG | - |

CRSF/ELRS must go on a full UART (not RC IN) [15]. SBUS/PPM receivers use RC IN.

### 4.2 ESCs and motors

- One ESC per arm, close to the motor (short phase wires, long signal + power leads). 12S-rated (>= 50.4 V; 14S-rated
  parts for margin), 40-60 A continuous is enough (motor peak 30 A [13]). Real options: T-Motor FLAME 60A 12S (PWM
  input only, opto, no telemetry (unverified)), Hobbywing XRotor Pro / X-series, APD / AM32-based HV ESCs that accept
  DShot.
- ESC firmware: big HV ESCs are often closed firmware with PWM input. BLHeli_32 ended support on 30 June 2024; AM32
  supports HV ESCs with DShot + bidirectional DShot (unverified per product).
- Protocol: `MOT_PWM_TYPE` values [4]: 0 Normal (PWM), 1 OneShot, 2 OneShot125, 3 Brushed, 4 DShot150, 5 DShot300,
  6 DShot600, 7 DShot1200, 8 PWMRange, 9 PWMAngle. Heavy lifters commonly use 0 (PWM) with `MOT_PWM_MIN 1000` /
  `MOT_PWM_MAX 2000` and ESC calibration, or 5 (DShot300) on DShot-capable ESCs. Because DShot on MAIN OUT needs
  `BRD_IO_DSHOT 1`, many builds put the motors on AUX 1-8 (FMU) instead; with eight motors on AUX, outputs 7-8
  (AUX 7-8) cannot do DShot [15], so PWM is the simple choice for an octo on a 6X.
- `SERVO_DSHOT_ESC` values [7]: 0 None, 1 BLHeli32/Kiss/AM32, 2 BLHeli_S/BlueJay, 3 BLHeli32/AM32/Kiss+EDT, 4
  BLHeli_S/BlueJay+EDT. `SERVO_BLH_BDMASK` = bidirectional DShot channel bitmask, `SERVO_BLH_RVMASK` = reversed
  channel bitmask, `SERVO_BLH_POLES` default 14 [7].

### 4.3 Power

| Item | Value |
|---|---|
| Pack | 2 x 6S in series = 12S: 44.4 V nominal, 50.4 V full, 42.0 V at 3.5 V/cell |
| Connector | XT90-S (anti-spark: a pre-charge resistor contact mates first and limits inrush) at each pack; series link between packs |
| Power module | Holybro PM02D HV (I2C digital, 2-12S per retailer listings; I2C address 69 for the HV module [15]) gives 5.2 V to POWER1/POWER2. Its XT60 leads are rated ~30 A continuous / 60 A burst (retailer listing, unverified), far below this craft's ~37 A hover and 166-193 A max, so a real build feeds the 6X from the PM for FC power/voltage and measures current with a high-current sensor or a second monitor (product choice unverified). PX4 docs list a 6S, 60 A version under the same name, so check the HV label |
| Capacitor | Low-ESR electrolytic at the PDB / each ESC input, rated **>= 63 V** for 12S (50.4 V full plus switching spikes); 35 V or 50 V caps would fail. Polarised: stripe = minus |
| BEC | FC powered from the power module (5.2-5.3 V); servos (landing gear) from a separate 5-6 V BEC on the servo rail (servo rail 0-36 V tolerated [14]) |
| Buzzer, safety switch, LED | Pixhawk 6X GPS1 port carries the safety switch, buzzer and RGB LED on the standard GPS module (unverified exact module) |

### 4.4 Receiver, telemetry, video, GPS

- RC: ExpressLRS (CRSF protocol) on SERIAL6 with `SERIAL6_PROTOCOL 23`; or SBUS on RC IN. Telemetry: SiK / RFD900x
  900 MHz MAVLink radio on TELEM1 (`SERIAL1_PROTOCOL 2`). The original says "ELRS + 900 MHz": consistent.
- Video: the cinema camera records internally; a separate HD video downlink (e.g. DJI/Teradek-class transmitter) sends
  the camera's HDMI/SDI feed to the camera operator. Not an FPV analog VTX; no SmartAudio/Tramp.
- GPS/compass: two GNSS modules with compasses on GPS1 (SERIAL3) and GPS2 (SERIAL4), compasses on I2C, or DroneCAN
  GNSS on CAN1/CAN2 (`CAN_P1_DRIVER 1` verified in `AP_CANManager.cpp`; `CAN_D1_PROTOCOL 1` = DroneCAN, value
  unverified). Raised on a mast
  away from the 12S power wiring, arrow forward.

### 4.5 Gimbal

`MNT1_TYPE` values in 4.7.2 [6]: 0 None, 1 Servo, 2 3DR Solo, 3 Alexmos Serial, 4 SToRM32 MAVLink, 5 SToRM32 Serial,
6 MAVLink (Gremsy/AVT), 7 BrushlessPWM, 8 Siyi, 9 Scripting, 10 Xacti, 11 Viewpro, 12 Topotek, 13 CADDX, 14 XFRobot.
`MNT1_DEFLT_MODE` values: 0 Retracted, 1 Neutral, 2 MavLink Targeting, 3 RC Targeting (default), 4 GPS Point,
5 SysID Target, 6 Home Location. Angle limits default: `MNT1_ROLL_MIN -30`, `MNT1_ROLL_MAX 30`, `MNT1_PITCH_MIN -90`,
`MNT1_PITCH_MAX 20`, `MNT1_YAW_MIN -180`, `MNT1_YAW_MAX 180` (degrees) [6].

For a cinema octo the gimbal is a Gremsy T7 / Freefly MoVI Pro class, 3-axis brushless with its own IMU. Gremsy uses
MAVLink (`MNT1_TYPE 6`). In practice the camera operator usually controls the gimbal on a separate radio, and the FC
link is optional.

### 4.6 Typical wiring and wire colours

| Link | From -> to | Wire |
|---|---|---|
| Battery | 2 x 6S series -> XT90-S -> power module -> PDB | 10 AWG silicone, red (+) / black (-) (unverified gauge) |
| ESC power | PDB -> each arm ESC | 12-14 AWG red/black along the arm |
| Motor phases | ESC -> motor | 3 wires, often all black/blue/yellow; swap any two to reverse |
| ESC signal | Pixhawk MAIN OUT n (SERVOn) -> ESC of motor n | servo lead: signal white/yellow/orange, ground black/brown (opto ESCs: no 5 V) |
| Power module | PM -> POWER1 | 6-pin JST-GH |
| GPS1 / GPS2 | GPS puck -> GPS1 / GPS2 | 10-pin / 6-pin JST-GH |
| RC | ELRS RX -> UART4/I2C port | TX/RX crossed, 5 V, GND |
| Telemetry | radio -> TELEM1 | 6-pin JST-GH |
| Landing gear | AUX OUT 1 (SERVO9) -> retract servo/controller | servo lead; servo power from a separate BEC |

## 5. Firmware: ArduCopter 4.7.2

Current stable: **ArduCopter 4.7.2**, confirmed by the stable firmware server for `Pixhawk6X` (`APMVERSION:
ArduCopter V4.7.2`, commit dated 2026-10-11) [1]. Parameters are set in Mission Planner > Config > Full Parameter List
(or QGroundControl, or MAVProxy `param set NAME VALUE`). There is no Betaflight-style CLI.

### 5.1 Renamed parameters (4.7 vs pre-4.7)

| Pre-4.7 name (unit) | 4.7.2 name (unit) | Default in 4.7.2 | Source |
|---|---|---|---|
| `LOIT_SPEED` (cm/s) | `LOIT_SPEED_MS` (m/s), range 0.2-35 | 12.5 | [9] AC_Loiter.cpp |
| `LOIT_ACC_MAX` (cm/s/s) | `LOIT_ACC_MAX_M` (m/s/s) | 5.0 | [9] |
| `LOIT_BRK_ACCEL` (cm/s/s) | `LOIT_BRK_ACC_M` (m/s/s) | 2.5 | [9] |
| `LOIT_BRK_JERK` (cm/s/s/s) | `LOIT_BRK_JRK_M` (m/s/s/s) | 5.0 | [9] |
| `LOIT_BRK_DELAY` (s) | unchanged (s) | 1.0 | [9] |
| `LOIT_ANG_MAX` (deg) | unchanged (deg), 0 = use ANGLE_MAX-derived | 0 | [9] |
| `PILOT_SPEED_UP` (cm/s) | `PILOT_SPD_UP` (m/s), 0.5-5 | 2.5 | [9] |
| `PILOT_SPEED_DN` (cm/s) | `PILOT_SPD_DN` (m/s), 0-5, 0 = same as up | 0 | [9] |
| `PILOT_ACCEL_Z` (cm/s/s) | `PILOT_ACC_Z` (m/s/s) | 2.5 | [9] |
| `RTL_ALT` (cm) | `RTL_ALT_M` (m) | 15 | [9] mode_rtl.cpp |
| `RTL_ALT_FINAL` (cm) | `RTL_ALT_FINAL_M` (m), 0 = land | 0 | [9] |
| `RTL_CLIMB_MIN` (cm) | `RTL_CLIMB_MIN_M` (m) | 0 | [9] |
| `RTL_SPEED` (cm/s) | `RTL_SPEED_MS` (m/s), 0 = use WP speed | 0 | [9] |
| `RTL_LOIT_TIME` (ms) | unchanged (ms) | 5000 | [9] |
| `ARMING_CHECK` (bitmask of checks to run) | `ARMING_SKIPCHK` (bitmask of checks to **skip**; 0 = run all) | 0 | [9] AP_Arming.cpp |

`ARMING_SKIPCHK` bits [9]: 1 Barometer, 2 Compass, 3 GPS lock, 4 INS, 5 Parameters, 6 RC Channels, 7 Board voltage,
8 Battery Level, 10 Logging Available, 11 Hardware safety switch, 12 GPS Configuration, 13 System, 14 Mission,
15 Rangefinder, 16 Camera, 17 AuxAuth, 18 VisualOdometry, 19 FFT. Leave it at 0 on a camera ship.

### 5.2 Initial setup (frame, motors, battery)

```
# ArduCopter 4.7.2, Mission Planner > Config > Full Parameter List
FRAME_CLASS      3       # 3 = Octa              (Parameters.cpp: 0 Undefined,1 Quad,2 Hexa,3 Octa,4 OctaQuad,...)
FRAME_TYPE       1       # 1 = X                 (0 Plus,1 X,2 V,3 H,...,13 DJIX,14 ClockwiseX,15 I)
MOT_PWM_TYPE     0       # 0 Normal PWM (or 5 = DShot300 on DShot ESCs)
MOT_PWM_MIN      1000    # PWM
MOT_PWM_MAX      2000    # PWM
MOT_SPIN_ARM     0.10    # default 0.10 (range 0-0.2)
MOT_SPIN_MIN     0.15    # default 0.15 (range 0-0.25); must be > MOT_SPIN_ARM
MOT_SPIN_MAX     0.95    # default 0.95
MOT_THST_EXPO    0.65    # default 0.65 (range -1..1); big props often want higher (unverified typical value)
MOT_THST_HOVER   0.35    # default 0.35 (range 0.125-0.6875); learnt in flight
MOT_HOVER_LEARN  2       # 0 Disabled, 1 Learn, 2 Learn and Save (default 2)
MOT_BAT_VOLT_MAX 50.4    # V, 4.2 V x 12 (voltage compensation; default 0 = off)
MOT_BAT_VOLT_MIN 39.6    # V, 3.3 V x 12 (range 6-42; per-cell choice unverified)
BATT_MONITOR     21      # Pixhawk 6X digital power module (INA2xx); 4 = analog V+I is NOT supported on the 6X
BATT_I2C_BUS     1
BATT_CAPACITY    16000   # mAh
BATT_LOW_VOLT    42.0    # V (3.5 V/cell)
BATT_CRT_VOLT    40.8    # V (3.4 V/cell) (value is this sheet's choice)
BATT_FS_LOW_ACT  2       # Copter: 0 Warn,1 Land,2 RTL,3 SmartRTL or RTL,4 SmartRTL or Land,5 Terminate,6 Auto DO_LAND_START or RTL,7 Brake or Land
BATT_FS_CRT_ACT  1       # Land
```

Sources: `FRAME_*` [9] Parameters.cpp; `MOT_*` values and defaults [4] AP_MotorsMulticopter.cpp/.h;
`BATT_*` [9] AP_BattMonitor_Params.cpp; `BATT_MONITOR 21` on the 6X [15].

The original's `MOT_SPIN_ARM 0.08`, `MOT_SPIN_MIN 0.12`, `MOT_THST_EXPO 0.70` are valid in-range values (tuning
choices). `MOT_THST_HOVER 0.35` is the default, not a learnt value.

### 5.3 Flight modes used in the original

`FLTMODE1..6` values [9]: 0 Stabilize, 1 Acro, 2 AltHold, 3 Auto, 4 Guided, 5 Loiter, 6 RTL, 7 Circle, 9 Land,
11 Drift, 13 Sport, 14 Flip, 15 AutoTune, 16 PosHold, 17 Brake, 18 Throw, ... `FLTMODE_CH` default channel 5.

**Loiter (GPS hold)** (4.7.2 names):
```
FLTMODE1        5       # Loiter
LOIT_SPEED_MS   12.5    # m/s max horizontal speed (default 12.5)
LOIT_ACC_MAX_M  5.0     # m/s/s (default 5.0); lower (e.g. 2.5) for smoother camera moves
LOIT_BRK_ACC_M  2.5     # m/s/s braking when sticks released (default 2.5)
LOIT_BRK_JRK_M  5.0     # m/s/s/s (default 5.0)
LOIT_BRK_DELAY  1.0     # s before braking starts (default 1.0)
```
Loiter in ArduCopter is a true position hold: release the sticks and it brakes and holds the spot (the original's
velocity damper does not return to where you let go).

**AltHold (no GPS):**
```
FLTMODE2        2       # AltHold
PILOT_SPD_UP    2.5     # m/s climb (default 2.5)
PILOT_SPD_DN    1.5     # m/s descent (default 0 = same as PILOT_SPD_UP)
PILOT_ACC_Z     2.5     # m/s/s (default 2.5)
```

**Motor-failure handling** (automatic, no mode). See section 5.4.

**RTL:**
```
FLTMODE3        6       # RTL
RTL_ALT_M       15      # m (default 15; the original uses 5.5 m for its small range)
RTL_LOIT_TIME   5000    # ms over home before descending (default 5000)
RTL_ALT_FINAL_M 0       # m, 0 = land and disarm (default 0)
RTL_CLIMB_MIN_M 0       # m (default 0)
RTL_SPEED_MS    0       # m/s, 0 = use WP speed
```
Sources: [9] Parameters.cpp, mode_rtl.cpp, config.h, AC_Loiter.cpp.

### 5.4 Motor-out handling: what ArduCopter really does

1. **Nothing special at first.** With margin (T:W ~2), losing one of eight motors is absorbed by the normal attitude
   controller and mixer: the remaining motors' commands change to keep roll/pitch/yaw and thrust. No message is
   generated. The motor diagonally opposite the dead one (same spin direction) is driven down; the dead motor's
   neighbours (opposite spin) carry more.
2. **Thrust-loss detection** `Copter::thrust_loss_check()` [3]: if, for **1 second**, the vehicle is armed and not
   landed, the requested lean angle is < **15 deg**, throttle is >= **90 %** (`attitude_control->get_throttle_in()`)
   or the motors hit the upper throttle limit, throttle >= 25 %, the vehicle is **descending**, and the attitude error
   is < 30 deg, then it sends `Potential Thrust Loss (N)` at EMERGENCY severity (N = 1-based motor number), logs error
   `THRUST_LOSS_CHECK`, and calls `motors->set_thrust_boost(true)`.
3. **Thrust boost** in `AP_MotorsMatrix` [2]: `check_for_failed_motor()` low-pass filters each motor's output
   (time constant 0.5 s) and tracks the highest-commanded motor as `_motor_lost_index`. For frames with **>= 6
   motors**, if highest x N / sum >= **1.5** the thrust is flagged unbalanced (and balanced again at <= 1.25). Not
   active on co-rotating X8 frame types (20, 21). While thrust boost is on, the mixer leaves the "lost" motor (the
   one pinned at the highest command) out of the yaw-headroom and output-scaling sums, so that saturated motor no
   longer drags the other seven down; the others are mixed as if it were absent. Boost switches itself off once the
   throttle is back under the limit, the highest motor is below 0.9 and thrust is balanced again [2].
4. **Yaw imbalance warning** `yaw_imbalance_check()` [3]: if the low-pass-filtered yaw rate-PID I-term exceeds
   **75 % of its IMAX** (or the raw I-term sits at IMAX) it sends `Yaw Imbalance N%` at EMERGENCY severity, at most
   once every 10 s. It is suppressed while thrust boost is active. A dead motor with enough lift margin leaves a
   standing yaw torque, so this warning (not "thrust loss") is the likely first message on a healthy-margin octo
   (inference from the code, not a documented statement).
5. **Options:** `FLIGHT_OPTIONS` bitmask [9]: bit 0 Disable thrust loss check, bit 1 Disable yaw imbalance warning,
   bit 2 Release gripper on thrust loss. There is no dedicated `MOT_*` parameter for motor-out; relevant MOT params are
   `MOT_YAW_HEADROOM` (default 200, PWM) which reserves output for yaw, and `MOT_SPIN_MAX`.
6. **Crash check** `FS_CRASH_CHECK 1` (default): disarms if the attitude error is > 30 deg, lean > 15 deg, speed
   < 10 m/s and accel < 3 m/s/s for 2 s: message `Crash: Disarming: AngErr=...` [3].

Pilot response: stay in Loiter/AltHold, avoid large yaw inputs, land promptly. Yaw authority drops because the
missing motor's torque has to be balanced by slowing motors of the opposite spin. The frame yaws in the dead motor's
spin direction until the yaw controller catches it (the original's steady 16 deg/s yaw is a simplification; real
ArduCopter holds heading if headroom allows).

### 5.5 Retractable landing gear

```
SERVO9_FUNCTION  29      # 29 = LandingGear (SRV_Channel.h k_landing_gear_control) on AUX OUT 1
SERVO9_MIN       1000    # PWM = RETRACTED position (retract uses Limit::MIN)
SERVO9_MAX       2000    # PWM = DEPLOYED position (deploy uses Limit::MAX); swap with SERVO9_REVERSED 1
LGR_ENABLE       1       # 0 Disabled, 1 Enabled
LGR_STARTUP      0       # 0 WaitForPilotInput, 1 Retract, 2 Deploy
LGR_RETRACT_ALT  4       # m, retract when climbing through this (0 = off). Must be >= LGR_DEPLOY_ALT
LGR_DEPLOY_ALT   3       # m, deploy when descending through this (0 = off). Range 0-1000 m
LGR_OPTIONS      3       # bit 0 Retract after Takeoff, bit 1 Deploy during Land (Auto/Guided); default 3
RC7_OPTION       29      # 29 = Landing Gear switch: LOW = deploy, MIDDLE = no change, HIGH = retract
```
Verified in [5] and [7][8]: units `m`, defaults 0 for both altitudes, `LGR_OPTIONS` default 3, the old
`LGR_SERVO_RTRACT` / `LGR_SERVO_DEPLOY` PWM params were removed ("now replaced with SERVOn_MIN/MAX/REVERSED").
Altitude retract only works when `LGR_RETRACT_ALT >= LGR_DEPLOY_ALT` (checked in `AP_LandingGear::update()`), and
altitude triggering happens only when armed, on crossing the threshold, using height above ground (rangefinder if fitted, else altitude above
home) (exact source of height (unverified)). Switch direction verified in `RC_Channel.cpp` [8]: LOW deploys, HIGH
retracts, MIDDLE does nothing.

### 5.6 Gimbal (Gremsy-class over MAVLink)

```
MNT1_TYPE        6       # MAVLink (Gremsy/AVT). 4 = SToRM32 MAVLink (what the original shows)
MNT1_DEFLT_MODE  3       # RC Targeting (default)
MNT1_PITCH_MIN   -90     # deg
MNT1_PITCH_MAX   20      # deg (default)
MNT1_YAW_MIN     -180    # deg
MNT1_YAW_MAX     180     # deg
SERIAL2_PROTOCOL 2       # MAVLink2 on TELEM2 to the gimbal
SERIAL2_BAUD     115     # 115200
```
Sources: [6] AP_Mount_Params.cpp, [9] AP_SerialManager.cpp. For an SToRM32 board use `MNT1_TYPE 4` (MAVLink) or
`5` (serial, `SERIALn_PROTOCOL 8` Gimbal).

### 5.7 Failsafes

```
FS_THR_ENABLE    1       # 0 Disabled, 1 Enabled always RTL, 3 Enabled always Land, 4 Enabled always SmartRTL or RTL, ... (default 1)
FS_THR_VALUE     975     # PWM (range 910-1100, default 975); RC throttle below this = failsafe (PWM receivers)
FS_GCS_ENABLE    0       # 0 Disabled (default), 1 RTL, 3 SmartRTL or RTL, 4 SmartRTL or Land, 5 Land, ...
FS_EKF_ACTION    1       # 1 Land if mode needs position (default); 2 AltHold; 3 Land always
FS_EKF_THRESH    0.8     # 0.6 strict, 0.8 default, 1.0 relaxed
FS_CRASH_CHECK   1       # disarm on detected crash (default 1)
BATT_FS_LOW_ACT  2       # RTL
BATT_FS_CRT_ACT  1       # Land
```
Sources: [9] Parameters.cpp, config.h, AP_BattMonitor_Params.cpp. With ELRS/CRSF, link loss is reported by the
receiver protocol (no throttle-PWM drop) and the same FS_THR_ENABLE action applies (unverified mechanism detail).

### 5.8 OSD, VTX, RPM filter

- OSD: not used on a cinema octo (the camera operator watches the cinema feed; the pilot watches the GCS). ArduPilot
  has `OSD_TYPE` (1 MAX7456, 3 MSP, 5 MSP_DisplayPort) for FPV boards; the Pixhawk 6X has no analog OSD chip
  (unverified).
- VTX table/power: not applicable (no FPV VTX).
- RPM / harmonic notch filtering (verified in `AP_InertialSensor.cpp` group `INS_HNTCH_` and
  `Filter/HarmonicNotchFilter.cpp`): `INS_HNTCH_ENABLE 1`; `INS_HNTCH_MODE` 0 Fixed, 1 Throttle, 2 RPM Sensor,
  3 ESC Telemetry, 4 Dynamic FFT, 5 Second RPM Sensor; `INS_HNTCH_FREQ` (Hz), `INS_HNTCH_BW` (Hz), `INS_HNTCH_REF`,
  `INS_HNTCH_HMNCS` (harmonics bitmask). A second notch is `INS_HNTC2_*`. With PWM ESCs (no telemetry) use mode 1.
  Hover ~3850 rpm [13] / 60 = **~64 Hz** motor fundamental; a 2-blade prop's blade-pass frequency is 2x, ~128 Hz.
  Bidirectional-DShot "RPM filtering" in the Betaflight sense corresponds to mode 3.

### 5.9 Motor direction reversal

- In ArduPilot: there is no per-motor reverse for PWM ESCs. For DShot ESCs, `SERVO_BLH_RVMASK` (bitmask of reversed
  channels) [7] sends the reverse command. Or choose a different octa `FRAME_TYPE` (13/14) to flip all of them.
- In the ESC: swap any two of the three motor phase wires, or set "motor direction reversed" in the ESC configurator
  (BLHeliSuite32 / AM32 configurator / ESC Configurator) for DShot-programmable ESCs.
- Check with Mission Planner > Setup > Optional Hardware > Motor Test: buttons A-H spin motors one at a time in the
  clockwise order M1, M3, M8, M4, M2, M6, M7, M5 (section 2.2). Props off.

### 5.10 Calibration and arming checks

- Accelerometer: Mission Planner > Setup > Mandatory Hardware > Accel Calibration > "Calibrate Accel": place level,
  left side down, right side down, nose down, nose up, on its back; then "Calibrate Level". On a big octo, calibrate
  the FC (or the whole frame without props). Pre-arm message if missing: `3D Accel calibration needed`; after cal,
  `Accels calibrated requires reboot` [9].
- Compass: Mission Planner > Setup > Mandatory Hardware > Compass > "Start" onboard calibration: rotate the craft
  through all orientations until the bar completes, then reboot. Do it away from metal and cars. Pre-arm: `Compass
  calibrated requires reboot`, `Compass offsets too high`, `Compasses inconsistent`, `Check mag field ...` [9].
- Pre-arm checks (`ARMING_SKIPCHK 0` runs all). Real messages seen as `PreArm: <text>` [9]: `3D Accel calibration
  needed`, `Accels inconsistent`, `Gyros not calibrated`, `Compasses inconsistent`, `Compass offsets too high`,
  `GPS 1: Bad fix`, `High GPS HDOP`, `GPS positions differ by X m`, `Need Position Estimate`, `EKF attitude is bad`,
  `Hardware safety switch`, `RC not found`, `Throttle (RC3) is not neutral` (from the format `%s (RC%d) is not neutral`), `Check FS_THR_VALUE`, `Battery failsafe`,
  `Leaning`, `Motors Emergency Stopped`, `IOMCU is unhealthy`, `Invalid MultiCopter FRAME_CLASS`.
- Arming: throttle low + yaw right for 2 s (stick arming, unverified duration), or an arm switch `RCn_OPTION 153`
  (ArmDisarm, verified [8]). The hardware safety switch (on the GPS1 module) must be pressed first unless
  `BRD_SAFETY_DEFLT 0` (verified name in `AP_BoardConfig.cpp`). Board orientation is `AHRS_ORIENTATION` (0 = none,
  arrow forward; verified name in `AP_AHRS.cpp`).
- Auto-disarm: `DISARM_DELAY` default 10 s after landing [9].

## 6. Safety tests

| Test | How | What it catches |
|---|---|---|
| Smoke stopper | A current-limiting device (a resettable fuse/polyfuse or a bulb/resistor, or an electronic current limiter) placed between the battery and the craft for the first power-up. On a short it limits the current so nothing burns; the indicator lights or the fuse trips. Smoke stoppers sold for FPV are usually rated to 6S; for 12S use a lab supply with current limit or a 12S-rated anti-spark/limiter (unverified ratings) | Reversed polarity, solder bridges, a short in the PDB or an ESC, a capacitor in backwards |
| Props-off motor direction test | Mission Planner Motor Test (A-H at ~5-10 % throttle, a few seconds each); check order and spin against the octa X diagram | Wrong output mapping (signal leads swapped), a motor spinning the wrong way, a dead motor/ESC |
| Accelerometer calibration | 6-position + level calibration (section 5.10) | Level offset (drifts in AltHold), wrong orientation |
| Board orientation | `AHRS_ORIENTATION` matches mounting (0 = arrow forward); tilt the craft and watch the HUD | FC mounted backwards -> instant flip on take-off |
| Compass calibration | Onboard cal, rotate all axes; then check heading against a known bearing | Toilet-bowling in Loiter, flyaways, `Compass offsets too high` |
| Pre-arm checks | Arm on the ground with props on but clear; read every `PreArm:` message | Missing calibration, poor GPS, failsafe misconfig, low battery |
| Gimbal balance | Balance the camera on all three axes with the gimbal powered off | Hot gimbal motors, jitter |
| Arm-clamp check | Pull each folding arm before every flight | An unlocked arm folding in flight |
| Landing-gear test | Toggle the gear switch on the bench, check `LGR_*` altitudes | Legs in shot, legs not deployed for landing |
| Failsafe test | Switch off the transmitter at a low hover (props on, in a safe field) and watch RTL engage | No action on link loss |

## 7. Flight characteristics (default build)

| Quantity | Value | Source |
|---|---|---|
| AUW | 15.5 kg (15486 g) | original calc |
| T:W | 2.33 : 1 (original, 4501 g/motor); ~2.6 : 1 with T-Motor's 5.1 kg at 44 V | original, [13] |
| Hover thrust per motor | 1936 g (8 motors), 2212 g (7 motors) | arithmetic |
| Hover throttle | original raw 66 %; T-Motor bench 50 % PWM throttle for 1957 g [13]; `MOT_THST_HOVER` ~0.33-0.43 | |
| Hover current / power | ~37 A at 44.4 V, ~1.65 kW | [13] and original |
| Hover time | 20.9 min (80 % of 16 Ah at 36.7 A); flown ~16 min | original; real cinema octos of this class quote 12-20 min with payload (unverified) |
| Max current | 166-193 A | [13], original |
| Top speed | `LOIT_SPEED_MS` 12.5 m/s default in Loiter; the original reached 12.2 m/s at 38 deg lean | [9], original |
| Motor-out | Lift fine with 7 (each 2212 g vs 4501 g max, 49 %); yaw authority reduced | arithmetic |

## 8. Real failure modes

| Failure | Cause | What the pilot sees |
|---|---|---|
| Motor/ESC failure in flight | ESC overheat, desync, broken phase wire | Sudden small roll/yaw kick, then it holds (octo); `Yaw Imbalance N%` and, if thrust saturates, `Potential Thrust Loss (N)` |
| ESC desync | KV x voltage too high for the prop, wrong ESC timing, sudden throttle | Motor stutters and loses thrust; a quad would flip, the octo yaws and sags |
| Brown-out | FC power module overloaded, single power path | FC reboots in the air -> the craft falls; this is why Pixhawk 6X has two power inputs |
| Reversed motor or swapped props | Phase wires / ESC direction wrong, CW prop on a CCW motor | Instant yaw spin or flip on take-off |
| Wrong board alignment | FC mounted backwards, `AHRS_ORIENTATION` wrong | Flip on take-off |
| Missing / wrong-voltage capacitor | No low-ESR cap, or a 35 V cap on 12S | Voltage spikes kill ESCs, noise on video; an under-rated cap can vent or explode |
| Prop clash | Props larger than the chord (section 2.4) | Blades strike on spool-up, props shatter |
| Prop wash / vortex ring | Fast vertical descent into its own downwash | Wobble, sinking, loss of control during descent: descend at an angle |
| GPS glitch / compass error | Magnetic interference from 12S wires, poor GPS | Toilet-bowling (circles of growing size) in Loiter, `GPS glitching`, EKF failsafe -> Land |
| Landing gear misbehaves | `LGR_DEPLOY_ALT` set as if cm (300 = 300 m). The source only auto-retracts when `LGR_RETRACT_ALT >= LGR_DEPLOY_ALT` [5], so with 300 m auto-retract is silently disabled, and auto-deploy only fires when descending through 300 m | Legs stay down and in shot; or, if retracted by switch, they never come down by altitude and it lands on the gimbal/camera |
| Unbalanced gimbal | Camera not balanced | Gimbal motors overheat, jitter in footage |
| Arm clamp open | Folding arm not locked | Arm folds -> loss of one motor's lift plus a big CG/torque change |
| Low-voltage collapse | Heavy load on an aged pack, cold weather | Sudden sag and battery failsafe -> RTL/Land |

## 9. Uncertainties

- The DJI S1000+ spec page timed out; the figures come from a search snippet of that page plus Adorama.
- Tarot T18 frame weight and arm tube size were not found.
- The 130 KV 6010 and 230 KV 6215 motors are not matched to a specific real product.
- Prop masses (18/20/22" folding carbon) are not verified.
- Stick-arming hold time and the exact `PreArm:` prefix formatting are from memory.
- The Holybro 12S digital power module's exact model name and current rating.
- The original's gimbal 1400 g and GPS 70 g are light versus real parts (flagged, not changed).
- Stick-arm hold time; MAVLink command numbers 18/34 are from the MAVLink common set, not re-checked here.
- Smoke-stopper ratings for 12S are not verified.
