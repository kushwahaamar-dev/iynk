# Fact sheet: Agricultural spray hexacopter (Drone Lab Fig. 08, `agrihex`)

Status: verified 2026-10-24 against ArduCopter 4.7.2 (current stable) docs, parameter list and source code. Anything marked "(unverified)" could not be confirmed in the time box.

## 0. Header

**Craft class:** heavy-lift agricultural spray multirotor, hexa X, 10 L tank, 12S (option: 14S) high-voltage power, RTK GNSS, downward radar altimeter, ArduCopter on a Cube Orange+.

**Real products and reference builds it represents:**

| Reference | What it is | Link |
|---|---|---|
| EFT E610P | 6-axis 10 L folding agri frame. The rcdrone.top listing (checked 2026-10-24) gives wheelbase 1407 mm in its spec table and "Digonal Wheelbase: 1362mm" in its text, frame 6.5 kg, take-off weight 35 kg (table) or 37 kg (text), unfolded 1844 x 1844 x 628 mm, and a Hobbywing X6 power system with 23" props, 12S Tattu battery [25]. The zbotic listing's "1404 mm, 25 kg MTOW, 5 kg frame" could not be re-read (page no longer shows specs) (unverified) | https://rcdrone.top/products/eft-e610p-agriculture-drone |
| Hobbywing XRotor X8 | integrated arm power system: 8120-100KV motor + 80A-FOC ESC + 30" folding prop, 12S, 15 kg max thrust, 5-7 kg recommended per axis [20] | https://www.hobbywing.com/en/products/xrotor-x8108 |
| Hobbywing XRotor X9 Plus | the next class up: 100KV, 36x19 prop, 12S/14S, 27 kg max thrust, 11-13 kg per axis [21] | https://hobbywing.com/en/products/xrotor-x9-plus112 |
| ArduCopter sprayer | the open-source sprayer feature the figure's code teaches [1][2] | https://ardupilot.org/copter/docs/common-sprayer.html |

**What it is and what it is for.** A spray drone is a flying tank. It carries 10 L (10 kg of water-based mix) of pesticide, fungicide or foliar fertiliser, about a third of its take-off weight, over a field at 2-3 m above the crop and 3-7 m/s, and lays it down in parallel strips (a "lawn-mower" or boustrophedon pattern) about one swath width apart. Six big, slow 30" props give the lift and a downwash that drives droplets into the canopy. ArduCopter ties the pump rate to ground speed, so the dose per square metre stays constant when the drone slows for a turn. RTK GNSS holds the rows to centimetres and a dual-antenna setup gives heading without a magnetometer. A downward radar measures height above the crop so the drone can follow slopes. When the tank or battery runs out, the drone returns, the crew refills and swaps the battery, and the mission resumes where spraying stopped.

Note on class: the figure's 1.8 m / 30" / 33 kg build sits at the top of the "10 L" class. Real 10 L hexas such as the E610P use about 1.36-1.41 m wheelbases, 23" props and the smaller Hobbywing X6 system (3.5-5.5 kg per axis class) [25][22]. The 30" X8 system (5-7 kg per axis, so 30-42 kg AUW for six) is normally used on 16-20 L hexas (unverified for specific products). The figure's numbers are still self-consistent: 33.3 kg / 6 = 5.5 kg per axis, inside Hobbywing's 5-7 kg band for the X8 [20].

## 1. Sources

Official firmware docs, parameter lists and source code first:

1. ArduPilot Copter docs, "Crop Sprayer": https://ardupilot.org/copter/docs/common-sprayer.html
2. ArduPilot source, AC_Sprayer library (master, Oct 2026): https://github.com/ArduPilot/ardupilot/blob/master/libraries/AC_Sprayer/AC_Sprayer.cpp and `AC_Sprayer.h`
3. ArduCopter 4.7.2 stable parameter list: https://ardupilot.org/copter/docs/parameters-Copter-stable-V4.7.2.html
4. ArduCopter 4.6.3 stable parameter list (old parameter names): https://ardupilot.org/copter/docs/parameters-Copter-stable-V4.6.3.html
5. ArduPilot firmware server, current stable build for CubeOrangePlus (`APMVERSION: ArduCopter V4.7.2`, commit dated 2026-10-11): https://firmware.ardupilot.org/Copter/stable/CubeOrangePlus/git-version.txt
6. ArduPilot source, `libraries/AP_Motors/AP_MotorsMatrix.cpp` (hexa motor table, motor-loss "thrust boost"): https://github.com/ArduPilot/ardupilot/blob/master/libraries/AP_Motors/AP_MotorsMatrix.cpp
7. ArduPilot docs, "GPS for Yaw (aka Moving Baseline)": https://ardupilot.org/copter/docs/common-gps-for-yaw.html
8. ArduPilot docs, rangefinder landing page: https://ardupilot.org/copter/docs/common-rangefinder-landingpage.html
9. ArduPilot docs, Ainstein US-D1 radar: https://ardupilot.org/copter/docs/common-aerotenna-usd1.html
10. ArduPilot docs, Nanoradar NRA24: https://ardupilot.org/copter/docs/common-rangefinder-nra24.html
11. ArduPilot docs, Hexsoon 24G radar: https://ardupilot.org/copter/docs/common-rangefinder-hexsoon-24g.html
12. ArduPilot docs, Ainstein LR-D1: https://ardupilot.org/copter/docs/common-ainstein-lrd1.html
13. ArduPilot docs, "Surface Tracking": https://ardupilot.org/copter/docs/terrain-following-manual-modes.html
14. ArduPilot docs, "Mission Rewind on Resume": https://ardupilot.org/copter/docs/common-mission-rewind.html
15. ArduPilot docs, mission command list (DO_SET_RESUME_REPEAT_DIST etc.): https://ardupilot.org/copter/docs/common-mavlink-mission-command-messages-mav_cmd.html
16. ArduPilot source, `libraries/AP_Mission/AP_Mission.cpp` (resume and rewind) and `AP_Mission_Commands.cpp` (`start_command_do_sprayer`)
17. ArduPilot source, `libraries/RC_Channel/RC_Channel.cpp` / `.h` (aux function 15 "Sprayer", pump test when disarmed) and `ArduCopter/AP_Arming_Copter.cpp` (pump test cancelled on arm)
18. ArduPilot source, `ArduCopter/mode_zigzag.cpp` (`ZIGZ_SPRAYER`)
19. ArduPilot source, `libraries/AP_HAL_ChibiOS/hwdef/CubeOrangePlus/hwdef.dat` and `CubeOrange/hwdef.inc` (MCU, IMUs, serial order)
20. Hobbywing XRotor X8 product page and spec table: https://www.hobbywing.com/en/products/xrotor-x8108
21. Hobbywing XRotor X9 Plus (via spec-sheet search summary): https://hobbywing.com/en/products/xrotor-x9-plus112
22. Hobbywing XRotor X6 Plus (via search summary): https://hobbywing.com/en/products/xrotor-x6-plus269
23. Gens Ace / Tattu Pro 22000 mAh 12S 25C smart pack, net weight 6300 g: https://gensace.de/products/tattu-pro-22000mah-44-4v-25c-12s1p-lipo-battery-pack-with-as150u-plug
24. Tattu 3.0 25000 mAh 14S 25C, net weight 9600 g (the gensace.de URL returned 404 on 2026-10-24; Grepow's listing gives the same 9600 g): https://www.grepow.com/uav-battery/tattu-3-0-14s-25000mah-51-8v-25c-lipo-smart-drone-battery.html
25. EFT E610P retail listings (retailer data, low trust): https://zbotic.in/product/eft-e610p-6-axis-agricultural-drone-frame-with-10l-tank/ and https://rcdrone.top/products/eft-e610p-agriculture-drone
26. iynk research doc: `docs/research/drone-lab-b.md`, section "Fig 08" (what the original shows).
27. ArduPilot docs, "Connect ESCs and Motors" (Mission Planner Motor Test order): https://ardupilot.org/copter/docs/connect-escs-and-motors.html
28. ArduPilot docs, "Compass Calibration" (Large Vehicle MagCal): https://ardupilot.org/copter/docs/common-compass-calibration-in-mission-planner.html
29. ArduPilot docs, "Accelerometer Calibration": https://ardupilot.org/copter/docs/common-accelerometer-calibration.html
30. ArduPilot docs, "RTK GPS Correction (Fixed Baseline)": https://ardupilot.org/copter/docs/common-rtk-correction.html
31. Ainstein US-D1 data sheet v2 (via Sundance): https://store.sundance.com/docs/Ainstein/US-D1-Data-Sheetv2.pdf

## 2. Geometry (craft frame: x forward, y left, z up, origin at frame centre on top of the bottom plate, mm)

### Frame layout

| Item | Value | Source / note |
|---|---|---|
| Layout | Hexa X: 6 arms every 60 deg, first arms at +-30 deg either side of the nose (no arm points straight forward) | ArduPilot FRAME_CLASS 2, FRAME_TYPE 1 [3][6] |
| Wheelbase (motor to opposite motor) | 1800 mm (R = 900 mm) | original [26]; real 10 L class is about 1400 mm [25] |
| Neighbour motor spacing | 900 mm (2 R sin 30 deg) | computed |
| Prop tip clearance | 30": 900 - 762 = 138 mm; 32": 87 mm; 28": 189 mm | computed |
| Arms | 30 mm carbon tubes from r = 200 mm to the motor, fold joint at r = 300 mm with a locking sleeve | original [26]; Hobbywing X8 mounts on 35 or 40 mm tubes [20], so 35 mm is closer to a real X8 build |
| Hub | 480 x 420 x 20 mm carbon sandwich plate, 460 x 400 x 130 mm canopy | original [26] (plausible, unverified) |
| Stack mounting | Cube Orange+ carrier board on a vibration-damped plate at the hub front, arrow forward. Cube carrier boards use a 4-hole pattern (unverified dimension; do not draw a 30.5 or 20 mm FPV stack) | [19] |
| Landing skids | legs from (+-170, +-150, -10) to (+-250, +-420, -480); 940 mm skid tubes at z = -482 (skids run along x at y = +-420) | original [26] |
| Frame mass | 5200 g (centre frame + 6 folding arms, excluding power system) | original; E610P listing says 6.5 kg frame [25] |

### Motor positions (ArduCopter Hexa X, default and only prop direction)

ArduCopter defines the hexa X as motor angles measured clockwise from the nose, seen from above [6]. Converted to the craft frame (y left): x = R cos(theta), y = -R sin(theta), R = 900 mm.

| Motor (output) | Angle from nose (clockwise +) | x (mm) | y (mm) | Position | Spin from above | Motor-test letter (Mission Planner) |
|---|---|---|---|---|---|---|
| M1 (SERVO1, function 33) | +90 | 0.0 | -900.0 | right | CW | B |
| M2 (SERVO2, function 34) | -90 | 0.0 | +900.0 | left | CCW | E |
| M3 (SERVO3, function 35) | -30 | +779.4 | +450.0 | front-left | CW | F |
| M4 (SERVO4, function 36) | +150 | -779.4 | -450.0 | rear-right | CCW | C |
| M5 (SERVO5, function 37) | +30 | +779.4 | -450.0 | front-right | CCW | A |
| M6 (SERVO6, function 38) | -150 | -779.4 | +450.0 | rear-left | CW | D |

- Going clockwise round the ring from front-right: M5 CCW, M1 CW, M4 CCW, M6 CW, M2 CCW, M3 CW. Spins alternate, so the yaw torques cancel.
- The motor-test order (third column of the source table) is 1 = M5, 2 = M1, 3 = M4, 4 = M6, 5 = M2, 6 = M3: clockwise from front-right. Mission Planner's Motor Test (SETUP > Optional Hardware) spins motors in this test order, not by motor number: "the first motor to the right of straight forward in the case of X configuration ... then in a clockwise rotation" [27]. The letters A-F map to test order 1-6 [6][27].
- Motors sit at z of about +20 to +90 mm (bell 132 mm diameter, 70 mm tall in the original; the real X8 motor is 88.6 mm diameter, 143 x 90 x 79 mm for the motor-plus-ESC unit [20]).
- **Alternative prop direction:** ArduCopter has no reversed-spin hexa frame type. FRAME_TYPE 13 (DJIX) and 14 (ClockwiseX) use the same spin pattern with different motor numbering: DJIX numbers anticlockwise from front-right, ClockwiseX numbers clockwise from front-right (M1 front-right CCW, M2 right CW, M3 rear-right CCW, M4 rear-left CW, M5 left CCW, M6 front-left CW) [6]. To fly with every prop reversed you would need a custom scripting matrix (FRAME_CLASS 15) (unverified that anyone does this on hexas). For quads only, FRAME_TYPE 18 is "BetaFlightXReversed" [3].

**Original's numbering differs (flag).** The original places M1 at 30 deg CW, M2 at 90 deg CCW, then M3 150 CW, M4 210 CCW, M5 270 CW, M6 330 CCW, numbered in sequence round the ring [26]. If those angles are measured anticlockwise from the nose (towards +y), the spin pattern matches ArduCopter (front-left CW, left CCW, rear-left CW, rear-right CCW, right CW, front-right CCW), but the numbers do not match ArduPilot's M1-M6. If they are measured clockwise, every motor spins the wrong way. The rebuild should use the ArduPilot table above.

### Props, payload, sensors

| Item | Value | Source |
|---|---|---|
| Prop | 30" (762 mm) 2-blade folding carbon-reinforced, default 30x9.9 in the original; Hobbywing's matched prop is the MFP 30x11 (set 191 +- 5 g, single blade 51 g) [20], and a 30x9.0 ("3090") also exists [20 search summary] | [20][26] |
| Tank | 10 L, 400 x 340 x 350 mm under the hub, centred on the CG (x = 0, y = 0), top at about z = -20; sight window shows level | original [26] |
| Pump | diaphragm pump + driver behind the tank, fed by a hose | original [26] |
| Boom | 1640 mm boom along y at z = -470, 4 nozzles at y = +-300 and +-720 (the outer nozzles sit just under the side props' discs; the side motors are at y = +-900 with prop radius 381, so the disc covers y = 519 to 1281 at x = 0) | original [26], computed |
| Radar | 80 x 120 x 70 mm, at the nose under the hub, facing down (RNGFND1_ORIENT 25) | original [26][3] |
| RTK antennas | two masts 200 mm tall at x = +-170, y = 150: a 340 mm baseline along x. ArduPilot requires at least 300 mm between antennas for GPS yaw [7] | [7][26] |
| Battery | 260 x 220 x 200 mm smart pack with a handle, on top of the hub at the centre (CG) | original [26] |
| FPV camera | small analog/HD camera at the nose, tilted 10 deg down in the original (`camTilt -10`); real ag drones carry a forward FPV camera for the operator (unverified layout) | [26] |
| CG | battery and tank both on the vertical axis through the hub centre, so the CG barely moves as the tank empties | design rule |

## 3. The original's catalogue, sanity-checked

The calculator stays identical. Numbers are not changed; this section only flags descriptions.

Original model: `thrust = 550 * pf * krpm^2` g per motor; `AUW = fixed + 6*motor + 6*prop + battery + 10000`; hover current from about 9 g/W [26].

### Batteries

| Option | Original | Real-world check | Verdict |
|---|---|---|---|
| 12S 22000 mAh smart pack (default) | 5600 g, $620 | Tattu Pro 22000 mAh 12S 25C (AS150U plug): 6300 g net, 117 x 174 x 238 mm [23] | about 11 % light; plausible but optimistic. Price unverified (retail is usually higher, unverified) |
| 12S 16000 mAh (2 x 6S) | 4300 g, $480 | two 6S 16000 mAh 15C LiPos are about 1.9-2.0 kg each (unverified) | plausible |
| 14S 30000 mAh smart pack | 9800 g, $1150 | Tattu 3.0 25000 mAh 14S: 9600 g [24]; scaling by capacity puts a 30000 mAh 14S pack at roughly 11.5 kg (unverified estimate) | about 15 % light; flag as optimistic |

Full charge: 12S = 50.4 V, 14S = 58.8 V (4.20 V per cell); nominal 44.4 V / 51.8 V. The original's plug log "50.400000000000006 V" is right but unrounded [26].

### Motors

| Option | Original | Real-world check | Verdict |
|---|---|---|---|
| 8120 100KV (sealed), 12S (default) | 760 g, $180 | Hobbywing X8 uses an 8120-100KV, 36N40P, 88.6 mm motor, 12S, IPX6; motor + ESC + cable + props = 1150 g; max thrust 15 kg; 5-7 kg per axis recommended; 9.5-8.6 g/W at that load [20] | true. Original per axis = 760 + 300 (ESC share) + 160 (prop) = 1220 g vs 1150 g real: close |
| 10025 80KV (14S) | 980 g, $260 | no Hobbywing "10025 80KV" found. The 14S Hobbywing X9 Plus is 100KV on a 36" prop (1760 g, 27 kg) and the X9 Plus G2L is 80KV on a 43" prop [21]. An 80KV motor is meant for props larger than 30" | the original flags 8 of 9 combinations as weak; that is realistic, since 80KV on a 30" prop leaves too little rpm. The "10025" name is unverified |
| 6215 180KV (`forCells 6`) | 520 g, $120 | 62xx-class 150-180KV motors are 12S agri motors on 22-24" props (Hobbywing X6 Plus: 150KV, 24x8.0, 11.8 kg max at 46 V, 3.5-5.5 kg per axis [22]) | the "over" warning (180KV on 12S spins a 30" prop far too fast) is correct, but the `forCells 6` tag is misleading: the motor class is 12S, matched to smaller props |

### Props

| Option | Original | Real-world check | Verdict |
|---|---|---|---|
| 30x9.9 folding carbon (default) | pf 1, 160 g, $70 | Hobbywing's 30" prop is MFP 30x11 (set 191 g) or 30x9.0 [20] | "30x9.9" is not a Hobbywing size (unverified elsewhere); mass is plausible |
| 28x9.2 folding (efficient) | pf 0.86, eff 1.08, 140 g | plausible (unverified) | OK |
| 32x11 folding (heavy lift) | pf 1.14, eff 0.93, 190 g | plausible; it leaves 87 mm tip clearance at a 900 mm motor spacing | OK, and teach the clearance |

### Derived numbers (default build)

| Tile | Original | Real-world check |
|---|---|---|
| AUW | 33265 g | 5.5 kg per axis: inside the X8's 5-7 kg band [20] |
| T:W | 1.96:1 (about 10.9 kg per motor) | the X8 gives 15 kg max per axis at 46 V [20], so the real T:W would be about 2.7:1. The original is conservative |
| Hover efficiency | 9 g/W | X8: 9.5-8.6 g/W at 5-7 kg per axis [20]. Matches |
| Hover current | about 83 A total (3696 W / 44.4 V) | X8 rated input 950 W per axis (about 20.6 A at 46 V) [20]; at 5.5 kg and 9 g/W it is about 610 W per axis; Hobbywing measured 578.5 W (12.6 A) at 5480 g [20]. Consistent |
| Max current | 458 A | the X8 ESC peak is 80 A for 3 s [20], so 6 x 80 = 480 A. Consistent |
| Hover throttle | 72 % (`sqrt(AUW/(6*thrust))`) | ArduCopter learns `MOT_THST_HOVER` (range 0.125-0.6875 [3]). With the real 15 kg per axis, 5.5/15 = 0.37 of max thrust, but Hobbywing's own X8 test data puts 5480 g per axis at 57 % ESC throttle (2392 rpm, 578.5 W, 12.6 A at 46 V) [20]. Expect the learned value to be around 0.5-0.6 depending on MOT_THST_EXPO and MOT_SPIN_MIN (unverified); 72 % is high |
| Hover time | 12.7 min, "freestyle" 10.1 min | plausible for full-tank hover on 22 Ah. Real ag operators plan on about 8-12 min per tank (unverified). "Freestyle" is the wrong word for an ag drone: say "working time" |

### Fixed parts

| Part | Original | Check |
|---|---|---|
| FRAME 5200 g | carbon centre + 6 folding arms | E610P listing: 6.5 kg frame [25]; 5.2 kg is plausible but slightly light for a 1.8 m frame |
| SKIDS 1100 g | | plausible (unverified) |
| ESC "6 x 80 A FOC arm ESCs", 1800 g | | Hobbywing's 80A-FOC is 80 A **peak for 3 s**; the spec table lists 20 A continuous [20]. Flag "80 A" as a peak rating, not continuous. On the X8 the ESC is built into the motor unit, not a separate box (the 300 g share is still plausible). The X8 ESC takes PWM 1100-1940 us, has no BEC and does not support throttle calibration [20] |
| FC "Cube Orange+", 75 g, $400 | | STM32H757 MCU; IMUs ICM42688 (x2 on some batches), ICM20948, ICM20649 or ICM45686 depending on hardware revision; AK09916 internal compass [19]. Mass and price unverified |
| RTK "dual-antenna RTK GNSS", 350 g, $700 | | plausible for a UM982 or dual-F9P pair with two antennas (unverified) |
| RADAR "mmWave terrain radar", 250 g, "0.1-30 m" | | US-D1: 110 g, 0.5-50 m (Ainstein datasheet: minimum operating altitude 0.5 m, maximum 50 m; update rate 82 Hz UART / 86 Hz CAN, while the ArduPilot page says 100 Hz) [9][31]; LR-D1: 300 g, 500 m [12]; NRA24: min 0.5 m, about 200 m [10]. **Flag "0.1-30 m"**: these radars do not read below about 0.5 m. Use "0.5-50 m (US-D1)" |
| RX "900 MHz RC + telemetry", 120 g | | plausible (SiK/RFD900-class, unverified) |
| XT60 id "AS150 anti-spark lead + caps", 150 g; wiring label "63 V caps" | | 63 V caps are fine on 12S (50.4 V max). On 14S (58.8 V) 63 V leaves too little margin; use 80-100 V parts (design rule, unverified source) |
| TANK 1300 g, PUMP 900 g, BOOM 900 g | | plausible (unverified) |

## 4. Electronics and wiring

| Block | Real part / setting | Notes |
|---|---|---|
| FC | Cube Orange+ (STM32H757), triple redundant IMU, dual MS5611 baro, AK09916 compass [19], on a damped carrier board, arrow forward. ArduCopter 4.7.2 [5] | AHRS_ORIENTATION 0 if the arrow points forward |
| Serial map (Cube Orange/Orange+) | SERIAL0 = USB; SERIAL1 = TELEM1 (USART2, flow control); SERIAL2 = TELEM2 (USART3); SERIAL3 = GPS1 (UART4); SERIAL4 = GPS2 (UART8); SERIAL5 = UART7 (console/debug) [19] | from `SERIAL_ORDER OTG1 USART2 USART3 UART4 UART8 UART7 OTG2` |
| PWM outputs | MAIN 1-6 = motors (SERVO1-6 functions 33-38 [3]); AUX1 = SERVO9 = sprayer pump (22), AUX2 = SERVO10 = spinner (23) [1] | |
| ESC / motors | Hobbywing X8: integrated FOC ESC, PWM 1100-1940 us, no throttle calibration; Hobbywing says set PWM_MIN 1050 and PWM_MAX 1950 on open-source FCs (translated from the spec sheet's Chinese note) [20]. ArduCopter: `MOT_PWM_TYPE 0` (Normal), `MOT_PWM_MIN 1050`, `MOT_PWM_MAX 1950` [3][20] | Not BLHeli/AM32/Bluejay and not DShot: big agri systems are PWM with a CAN or UART telemetry link (the X8 also outputs data over UART, read with Hobbywing DataLink [20]) |
| Telemetry + RC | 900 MHz MAVLink radio (e.g. SiK/RFD900x) on TELEM1: `SERIAL1_PROTOCOL 2` (MAVLink2). RC can be ExpressLRS/CRSF on TELEM2 with `SERIAL2_PROTOCOL 23` (RCIN) [3] (an alternative to the 900 MHz RC; the build choice is not specified) | RTCM corrections reach the drone over this link |
| GPS | dual u-blox F9P on GPS1/GPS2 (`SERIAL3_PROTOCOL 5`, `SERIAL4_PROTOCOL 5`), or one dual-antenna Unicore UM982 [7] | see section 5 |
| Radar | US-D1 serial on a spare UART (`SERIALn_PROTOCOL 9`, `RNGFND1_TYPE 11`) or CAN (`CAN_D1_PROTOCOL 7`, `RNGFND1_TYPE 33`) [9]; NRA24 on CAN (`CAN_Dx_PROTOCOL 14` RadarCAN, `RNGFND1_TYPE 39`) [10]; Hexsoon 24G on CAN (`RNGFND1_TYPE 44`) [11] | |
| Pump | PWM from AUX1 into the pump driver; pump power from the main bus (12S) through the driver | original label "pump power from the 12S bus" is plausible |
| Power | AS150U anti-spark connector (the resistor pre-charges the ESC capacitors so the plug does not arc at 50 V), low-ESR capacitors at the power distribution, Cube power brick/PM for FC power (the X8 ESCs have no BEC [20]) | original says "stripe to minus" for the anti-spark polarity (unverified) |
| Battery monitor | `BATT_MONITOR 4` = analog voltage and current [3]; smart packs often report over CAN/SMBus (`BATT_MONITOR 8` DroneCAN, `7` SMBus-Generic [3]) | |
| Buzzer / LED / safety | Cube carrier: buzzer, safety switch, external RGB LED on the GPS mast (unverified for this build) | |

Wire colours: power red (+) / black (-), 12 AWG per X8 arm (power cord 12AWG x 905 mm) [20]; X8 signal lead: 2-wire black/white = GND/PWM, or 3-wire black/red/white = GND, 5 V, PWM ("P") [20] (Hobbywing's tables list colours and functions in inconsistent order across products, so the white = PWM mapping is by convention (unverified)); motor phases inside the integrated unit.

## 5. Firmware: ArduCopter 4.7.2 (current stable, Oct 2026)

Verified: the stable build for CubeOrangePlus reports `APMVERSION: ArduCopter V4.7.2` [5]. **Version 4.7 renamed many parameters to SI units (m, m/s).** Old names fail on 4.7.2. Rename table, verified by presence or absence in the 4.6.3 and 4.7.2 lists [3][4]:

| 4.6.x name (unit) | 4.7.x name (unit) |
|---|---|
| WPNAV_SPEED (cm/s) | WP_SPD (m/s, 0.1-20) |
| WPNAV_ACCEL (cm/s/s) | WP_ACC (m/s/s) |
| WPNAV_RADIUS (cm) | WP_RADIUS_M (m) |
| WPNAV_RFND_USE | WP_RFND_USE |
| RTL_ALT (cm) | RTL_ALT_M (m) |
| RTL_ALT_FINAL (cm) | RTL_ALT_FINAL_M (m) |
| RTL_SPEED (cm/s) | RTL_SPEED_MS (m/s; 0 = use WP_SPD) |
| LOIT_SPEED (cm/s) | LOIT_SPEED_MS (m/s) |
| LOIT_ACC_MAX (cm/s/s) | LOIT_ACC_MAX_M (m/s/s) |
| LAND_SPEED (cm/s) | LAND_SPD_MS (m/s) |
| RNGFND1_MAX_CM / MIN_CM (cm) | RNGFND1_MAX / RNGFND1_MIN (m) |
| RNGFND1_GNDCLEAR (cm) | RNGFND1_GNDCLR (m) |
| ARMING_CHECK (bitmask of checks to run, 1 = all) | ARMING_SKIPCHK (bitmask of checks to skip, 0 = skip none) |
| GPS_TYPE (pre-4.6) | GPS1_TYPE (4.6 and later) |
| GPS_MB1_TYPE | GPS1_MB_TYPE (4.6 and later; both still listed) |

`FS_BATT_ENABLE` does not exist in current Copter; the low-battery action is `BATT_FS_LOW_ACT` [3]. `TERRAIN_FOLLOW` is a Plane parameter, absent from the Copter list [3].

### Initial setup (4.7.2 names)

```
FRAME_CLASS     2        # Hexa                       [3]
FRAME_TYPE      1        # X                          [3]
MOT_PWM_TYPE    0        # Normal PWM (Hobbywing X8)  [3][20]
MOT_PWM_MIN     1050     # Hobbywing recommendation   [20]
MOT_PWM_MAX     1950
MOT_SPIN_ARM    0.08     # default 0.1, range 0-0.2   [3]
MOT_HOVER_LEARN 2        # 0 off, 1 learn, 2 learn and save MOT_THST_HOVER [3]
BATT_MONITOR    4        # analog voltage and current [3]
BATT_LOW_VOLT   42.0     # 3.5 V x 12S                 [3]
BATT_CRT_VOLT   40.8     # 3.4 V x 12S (example)
BATT_FS_LOW_ACT 2        # RTL                        [3]
BATT_FS_CRT_ACT 1        # Land                       [3]
FS_THR_ENABLE   1        # RC loss -> RTL             [3]
FS_GCS_ENABLE   1        # GCS link loss (5 s) -> RTL [3]
RNGFND1_ORIENT  25       # down                       [3]
```

### Sprayer (the figure's core feature)

```
SPRAY_ENABLE     1       # then refresh params: the others are hidden until enabled [1]
SERVO9_FUNCTION  22      # SprayerPump on AUX1   [1][3]
SERVO10_FUNCTION 23      # SprayerSpinner on AUX2 (optional rotary atomiser) [1][3]
SPRAY_PUMP_RATE  10      # % pump at 1 m/s ground speed; default 10 -> 100 % at 10 m/s [1][2]
SPRAY_PUMP_MIN   0       # % floor; default 0 = pump stops when stopped [1][2]
SPRAY_SPEED_MIN  100     # cm/s; pump runs only at >= 1 m/s (default 100) [1][2]
SPRAY_SPINNER    1300    # PWM (us) sent to the spinner while the pump is on (default 1300) [2]; the param list says "milliseconds", a doc slip [3]
RC7_OPTION       15      # "Sprayer Enable" switch (any RCx_OPTION) [1][3]
SERVO9_MIN / SERVO9_MAX  # set the PWM range that the pump driver expects [1]
```

How it works, from `AC_Sprayer::update()` [2], which runs at 3 Hz (scheduler entry `SCHED_TASK_CLASS(AC_Sprayer, &copter.sprayer, update, 3, 90, 54)` in `ArduCopter/Copter.cpp`):

1. Nothing happens unless SPRAY_ENABLE = 1 **and** spraying has been permitted, either by the RC switch (aux 15 high) or by a mission `DO_SPRAYER` command with param1 = 1 (`DO_SPRAYER 0` turns it off) [16][17]. A pump output must be assigned (function 22).
2. Ground speed = horizontal EKF velocity (cm/s). If it stays >= SPRAY_SPEED_MIN for more than 100 ms the pump starts; if it stays below for more than 1000 ms the pump stops (anti-chatter delays) [2]. Because update() runs at 3 Hz and the first update only starts the timer, the pump really starts on the second qualifying update (about 0.33 s) and stops after about 1.33 s.
3. Pump command (percent) = clamp(max(v_ground[m/s] x SPRAY_PUMP_RATE, SPRAY_PUMP_MIN), 0, 100). The servo output moves linearly between SERVOn_MIN and SERVOn_MAX [2].
4. The spinner gets the fixed PWM SPRAY_SPINNER whenever the pump is on [2].
5. Pump test: flipping the sprayer switch high **while disarmed** runs the pump as if at 1 m/s (SPRAY_PUMP_RATE %); arming cancels the test [17].
6. The library does **not** stop the pump on a mode change. In AUTO the pump stays permitted until a `DO_SPRAYER 0`, the switch goes low, or the speed falls under SPRAY_SPEED_MIN (for example while hovering) [2][16]. Only ZigZag mode turns spraying off on exit (`ZIGZ_SPRAYER 1` sprays on A/B legs and stops on arrival or mode change) [18]. **Flag:** the original's RTL snippet comment "SPRAY_ENABLE 1 # pump stops automatically" is wrong; put `DO_SPRAYER 0` at the end of each spray leg, or switch the sprayer off, before RTL.

**Dose per area math.** For a pump whose flow is proportional to its command (assumed linear; real diaphragm pumps have a dead band, unverified), the flow is Q = Qmax x (PUMP_RATE/100) x v. The area covered per second is v x w (w = swath in m). The application rate is

```
L/ha = Q[L/s] / (v[m/s] * w[m]) * 10000
     = Qmax[L/s] * (SPRAY_PUMP_RATE/100) / w * 10000      (speed cancels, as long as the pump is not saturated)
```

- Example: Qmax = 3 L/min (0.05 L/s), SPRAY_PUMP_RATE 10, w = 4 m: 0.05 x 0.10 / 4 x 10000 = 12.5 L/ha at any speed up to 10 m/s (at 10 m/s the pump reaches 100 %, and above that the dose falls).
- To set a target dose D (L/ha): SPRAY_PUMP_RATE = D x w x 100 / (Qmax x 10000).
- Check with the "L/min" form farmers use: L/ha = 600 x Q[L/min] / (v[km/h] x w[m]).
- Typical drone application rates are low-volume: about 10-30 L/ha (unverified range), so a 10 L tank covers about 0.3-1 ha.
- **Original's numbers (flag):** a constant 0.42 L/s at 4 m/s over a 2.4 m swath = 437.5 L/ha. The live run used 2 L per 14 m x 2.4 m row = 595 L/ha (it sprays during accel/decel too). Both are roughly 20-40 times a real drone dose. That is the "time-compressed" choice; keep it, but label it, and the rebuild must scale flow with ground speed [26].
- **Original practice task (flag):** "fly at 4 and 7 m/s with SPRAY_PUMP_RATE fixed, work out how L/ha changed". With ArduPilot's speed-proportional pump, the L/ha does **not** change (7 m/s x 10 = 70 %, unsaturated). It changes only if the pump saturates (v x RATE > 100 %) or with a fixed-flow pump like the original sim's.

### RTK and moving-baseline yaw

`GPS1_TYPE` values that matter [3]: 1 AUTO, 2 uBlox, 5 NMEA, 9 DroneCAN, 10 Septentrio(SBF), **17 uBlox-MovingBaseline-Base**, **18 uBlox-MovingBaseline-Rover**, 22 DroneCAN-MovingBaseline-Base, 23 DroneCAN-MovingBaseline-Rover, 25 UnicoreMovingBaselineNMEA, 26 Septentrio-DualAntenna(SBF).

**Flag:** the original says `GPS_TYPE 17 # RTK base / rover pair` and `GPS_TYPE 17 # RTK rover`. Both are wrong. 17 is only the *moving-baseline base* half of a pair on the vehicle (its partner is GPS2_TYPE 18). It has nothing to do with the RTK base station on the ground. On 4.6 and later the name is GPS1_TYPE.

Dual serial F9P (moving-baseline yaw plus RTK position) [7]:

```
SERIAL3_PROTOCOL 5        # GPS1 port
SERIAL4_PROTOCOL 5        # GPS2 port
GPS1_TYPE        17       # uBlox moving-baseline base
GPS2_TYPE        18       # uBlox moving-baseline rover
GPS_AUTO_CONFIG  1        # AutoConfig serial
GPS_AUTO_SWITCH  1        # NOT 2 (blend) with moving baseline [7]
GPS1_POS_X/Y/Z, GPS2_POS_X/Y/Z   # antenna offsets in metres, body frame (x fwd, y RIGHT, z down)
EK3_SRC1_YAW     2        # GPS yaw (3 = GPS with compass fallback) [3][7]
```

- Antennas at least 30 cm apart [7] (the figure's 340 mm along x passes). For the figure's antennas at x = +-170, y = 150 (craft frame, y left), the ArduPilot offsets (y right) are GPS1_POS_X 0.17, GPS1_POS_Y -0.15 and GPS2_POS_X -0.17, GPS2_POS_Y -0.15 (computed, depending on which antenna is the base).
- DroneCAN pair: GPS1_TYPE 22, GPS2_TYPE 23, GPS_AUTO_CONFIG 2 [7]. Single-module UM982 dual antenna: GPS1_TYPE 25 [3][7].
- GPS yaw works even without an RTK fix [7]. F9P firmware must be 1.3.2 or later [7].
- **RTK position (fixed base, cm accuracy):** a ground base station surveys itself in and streams RTCM3 corrections. The base surveys itself in through Mission Planner (u-blox recommends SurveyIn accuracy of 5 m or less, and 2 m is common), or a known saved position is used. Corrections can also come from an NTRIP server through an internet-connected GCS (port usually 2101) [30]. The GCS forwards RTCM over the MAVLink telemetry link (GPS_RTCM_DATA / GPS_INJECT_DATA messages; message names unverified). `GPS_INJECT_TO` picks the receiver: 0 = first GPS, 1 = second, 127 = all [3]. Typical RTK fixed accuracy is about 1-2 cm horizontal (unverified spec; the original's "2 cm" is reasonable).

### Radar rangefinder, surface tracking, terrain following

Correct `RNGFND1_TYPE` for common radars [3][9][10][11][12]:

| Radar | Interface | RNGFND1_TYPE | Range / notes |
|---|---|---|---|
| Ainstein US-D1 | serial (`SERIALn_PROTOCOL 9`) | **11** USD1_Serial | 0.5-50 m (set RNGFND1_MIN 0.5, RNGFND1_MAX 45), 82 Hz UART / 86 Hz CAN per the datasheet (ArduPilot docs say 100 Hz), 110 g [9][31] |
| Ainstein US-D1 | CAN (`CAN_D1_PROTOCOL 7`, own protocol, not DroneCAN) | **33** USD1_CAN | [9] |
| Nanoradar NRA24 | CAN (`CAN_D2_PROTOCOL 14` RadarCAN, 500 kbit/s) | **39** NRA24_CAN | RNGFND1_MIN 0.5, RNGFND1_MAX 190 [10]; serial version uses type 11 (Nanoradar's recommendation, not fully verified by ArduPilot [10]) |
| Hexsoon 24G (20/100/200 m versions) | CAN (`CAN_D1_PROTOCOL 14`) | **44** HexsoonRadar | MAX 18/95/190, MIN 0.5 [11] |
| Ainstein LR-D1 | serial | **42** Ainstein_LR_D1 | 1-500 m, 40 Hz, 300 g [12] |
| JAE JRE-30 | serial | 41 JRE_Serial | [3][8] |
| RDS02UF | serial | 43 RDS02UF | [3] |

**Flags:** the original's `RNGFND1_TYPE 32 # mmWave radar` is wrong (32 = MSP). Its `RNGFND1_TYPE 10 # radar altimeter` is wrong too (10 = MAVLink) [3].

- **Surface tracking (pilot modes: AltHold, Loiter, PosHold):** `SURFTRAK_MODE 1` (0 = off, 1 = ground, 2 = ceiling) [3][13]; `SURFTRAK_TC` smooths the surface data (raise it for fast flight) [13]; aux function 75 = SurfaceTrackingUpDown [3][13]. While the rangefinder sees the ground, the throttle stick sets the target height above ground. Out of range, it reverts to climb-rate control and re-latches when back in range [13]. Do **not** set EK3_SRC1_POSZ to rangefinder, and leave EK3_RNG_USE_HGT at -1 [13].
- **Terrain following in AUTO missions:** `WP_RFND_USE 1` (4.7 name; WPNAV_RFND_USE before) lets missions use the rangefinder [3], with waypoints in the **Terrain** altitude frame (2.5 m above terrain). Without a rangefinder, Copter can use the SRTM terrain database (`TERRAIN_ENABLE`) [3], but SRTM (about 30-100 m grid, unverified) is useless for 2.5 m crop height. `TERRAIN_FOLLOW` is Plane-only [3]; drop it from the Copter snippet.

### Flight modes and features the original uses

```
# spray: AUTO lawn-mower mission (4.7.2 names)
SPRAY_ENABLE    1
SPRAY_PUMP_RATE 10        # % pump per m/s ground speed  [1]
SPRAY_SPEED_MIN 100       # cm/s, below this the pump stops [1]
RNGFND1_TYPE    11        # Ainstein US-D1 radar (serial)  [3][9]
RNGFND1_ORIENT  25        # down
WP_SPD          4.0       # m/s along the rows (was WPNAV_SPEED 400) [3]
WP_RFND_USE     1         # missions follow the rangefinder; plan WPs in Terrain frame [3]

# loiter: GPS hold (RTK + GPS yaw)
LOIT_SPEED_MS   8.0       # was LOIT_SPEED 800 [3]
LOIT_ACC_MAX_M  3.0       # was LOIT_ACC_MAX 300 [3]
GPS1_TYPE       17        # moving-baseline base ...
GPS2_TYPE       18        # ... and rover (dual F9P) [3][7]
EK3_SRC1_YAW    2         # yaw from the two antennas [3][7]

# rtl
RTL_ALT_M       5.0       # was RTL_ALT 500 [3]
RTL_SPEED_MS    6.0       # was RTL_SPEED 600 [3]
BATT_FS_LOW_ACT 2         # low battery -> RTL (FS_BATT_ENABLE does not exist) [3]
# the pump does NOT stop on its own: end each leg with DO_SPRAYER 0 [2][16]
```

### Lawn-mower survey mission

- Planned in Mission Planner (Flight Plan > Auto WP > Survey (Grid)), or written as a list: for each lane, WAYPOINT(lane start) > DO_SPRAYER 1 > WAYPOINT(lane end) > DO_SPRAYER 0. Lane spacing = swath width. Mission Planner's survey tool layout is unverified in detail.
- Alternative for manual work: ZigZag mode with `ZIGZ_SPRAYER 1`. The pilot records points A and B, then the drone flies the A-B legs with the sprayer on and stops spraying at each end [18].

### Mission resume after refill (how ArduPilot does it)

1. `MIS_RESTART 0` (Resume Mission, default) means switching back to AUTO resumes from the last active nav command, not from the start [3]. Aux function 24 "Auto Mission Reset" forces a restart [3].
2. By default the resumed vehicle flies straight to the interrupted waypoint, which leaves the rest of the strip sprayed on the wrong track or not at all [14].
3. **Rewind on resume:** put `DO_SET_RESUME_REPEAT_DIST` (MAV_CMD 215, param1 = metres) early in the mission. On resume, the vehicle rejoins the track that distance *behind* where it left, so it is back on line before it reaches the unsprayed part. The GCS shows "Resume repeat dist set to <N> m". Up to 7 waypoints of history are kept. For multirotors the docs suggest 2 x WP_RADIUS. MIS_RESTART must be 0. A value of 0 switches it off [14][15][16].
4. Typical refill cycle: tank empty or low battery > RTL (BATT_FS_LOW_ACT 2, or the pilot switches to RTL) > land > refill and swap the battery > arm > switch to AUTO > it resumes.
5. **Caveat (verified in source):** the current nav-command index lives only in RAM. The AP_Mission constructor sets `_nav_cmd.index = AP_MISSION_CMD_INDEX_NONE`, and `resume()` calls `start()` when the index is NONE [16]. So a battery swap that powers down the FC (single-pack drones) loses the resume point, and AUTO restarts at item 1 after reboot. The sprayer permission is lost too. Workarounds: hot-swap with a second pack or a backup supply that keeps the FC alive, or have the GCS re-plan from the break point (Mission Planner's right-click "resume mission" style helper; exact wording unverified), or set the current item with MISSION_SET_CURRENT before switching to AUTO (unverified for this flow).
6. **Original's defect:** "resume point saved" is printed but not implemented, and nothing refills the tank [26]. The rebuild should implement steps 3-4.

### OSD, VTX, RPM filtering, ESC direction, calibration, arming

- **OSD / VTX:** not central on an ag drone (the operator flies from a GCS tablet with telemetry). The Cube has no onboard OSD chip; MSP DisplayPort OSD to an HD system is possible (`OSD_TYPE 5` = MSP_DISPLAYPORT [3]; not part of this build). There is no SmartAudio/VTX table in this design. Do not teach Betaflight VTX tables here.
- **RPM / harmonic notch:** `INS_HNTCH_ENABLE 1`; `INS_HNTCH_MODE` 0 Fixed, 1 Throttle, 2 RPM sensor, 3 ESC telemetry, 4 Dynamic FFT, 5 second RPM sensor [3]. Throttle (1) is the usual choice for PWM ESCs without DShot telemetry; ESC telemetry (3) needs DShot/BLHeli telemetry, which these ESCs do not provide (their data goes over Hobbywing's UART/CAN protocol [20]). Big slow props have a low rotation frequency: Hobbywing's X8 test data gives 2392 rpm at 5480 g per axis [20], so about 2400 rpm at hover = 40 Hz rotation and 80 Hz blade-pass for 2 blades. Set INS_HNTCH_FREQ near 80 Hz and keep INS_HNTCH_MINRATIO low enough for the empty-tank hover (unverified tuning advice).
- **Motor direction reversal:** on PWM ESCs ArduPilot cannot reverse a motor. Swap any two of the three motor phase wires, or use the ESC's own setting. Hobbywing X-series units are sold as CW and CCW versions with matching props [20 search summary]. `SERVO_BLH_RVMASK` reverses motors only on BLHeli/DShot ESCs [3]. Never use `SERVOn_REVERSED` for a motor: it inverts the PWM range, not the spin.
- **Accelerometer calibration:** Mission Planner > Setup > Mandatory Hardware > Accelerometer Calibration, 6 positions: level, right side, left side, nose down, nose up, on its back. Hold still at each step; the positions other than level can be within about 20 deg [29]. For very large vehicles the docs say to do it on the bench (with AHRS_ORIENTATION already set for the mounting), then run "Calibrate Level" once installed. Calibrate Level corrects only up to 10 deg of pitch and roll, not yaw [29]. Pre-arm complains "3D Accel calibration needed" (wording unverified).
- **Compass calibration:** onboard calibration (rotate the vehicle about all axes) or Mission Planner's "Large Vehicle MagCal" for vehicles too heavy to rotate. It needs a GPS lock and the vehicle's known TRUE heading (not magnetic: add the declination to a phone compass reading). The compass orientation must be right first, or it "will appear to succeed" with a bad calibration [28]. With GPS yaw (`EK3_SRC1_YAW 2`) the compass is not needed and can be disabled (`COMPASS_USE 0`) [3][7].
- **Arming checks:** 4.7 uses `ARMING_SKIPCHK` (bitmask of checks to skip; default 0 = skip none; -1 skips all non-mandatory). Bits: 1 Barometer, 2 Compass, 3 GPS lock, 4 INS, 5 Parameters, 6 RC Channels, 7 Board voltage, 8 Battery level, 10 Logging, 11 Hardware safety switch, 12 GPS configuration, 13 System, 14 Mission, 15 Rangefinder, 16 Camera, 17 AuxAuth, 18 VisualOdometry, 19 FFT [3]. Typical messages (exact wording unverified): "PreArm: Compass not calibrated", "PreArm: GPS: Need 3D Fix", "PreArm: Hardware safety switch", "PreArm: Battery below minimum arming voltage" (`BATT_ARM_VOLT` [3]), "PreArm: Rangefinder 1: No Data", "PreArm: EKF3 Yaw inconsistent".

## 6. Safety tests

| Test | How | What it catches |
|---|---|---|
| Smoke stopper | an inline fuse or PTC/bulb current limiter between the battery and the ESCs for the first power-up. On a 12S agri drone the equivalent is the AS150U anti-spark plug (pre-charge resistor) plus a current-limited bench supply for the first power-up (smoke stoppers are mostly a hobby-scale tool; an agri-scale one is unverified) | shorts, reversed polarity, a pinched wire, before they burn a 50 V system |
| Props-off motor test | Mission Planner > Setup > Optional Hardware > Motor Test, props OFF, throttle 5-15 %; buttons A-F spin motors in test order clockwise from front-right (A = M5, B = M1, C = M4, D = M6, E = M2, F = M3) [6][27]. Check each spins the way the table in section 2 says | wrong output mapping, a reversed motor, a dead ESC |
| Pump test | sprayer switch high while disarmed runs the pump at the 1 m/s rate [17] | pump wiring, PWM range, a blocked nozzle; also used to measure L/min for the dose calibration |
| Accel calibration | 6-position on the bench plus Calibrate Level in the vehicle [29] | wrong board alignment, a tilted mount (drifts in Loiter) |
| Compass / GPS yaw | Large Vehicle MagCal [28], or verify GPS yaw: point the nose at a known heading and compare the HUD | magnetic interference from steel sheds and the high-current bus; swapped GPS1/GPS2 or wrong POS offsets (yaw off by 180 deg) |
| Pre-arm checks | automatic on every arm attempt (ARMING_SKIPCHK 0) | no RTK/GPS fix, no radar data, low battery, uncalibrated sensors |
| Tie-down hover | hover tethered or low over open ground, props on, nobody within the rotor area | vibration, oscillation, motor imbalance |

## 7. Flight characteristics (default build)

| Quantity | Value | Basis |
|---|---|---|
| AUW full / empty tank | 33.3 kg / 23.3 kg (original sim 33265 g to 25316 g with 2 L left) | [26] |
| Per-axis load | 5.5 kg full | computed; X8 band 5-7 kg [20] |
| T:W | original 1.96:1; with real X8 thrust (15 kg) about 2.7:1 | [20][26] |
| Hover throttle | original 72 % to 63 %; Hobbywing measured 57 % ESC throttle at 5480 g per axis [20]; the learned MOT_THST_HOVER is probably 0.5-0.6 (unverified) | [20] |
| Hover power | about 3.7 kW (9 g/W), about 83 A at 44.4 V | [20] |
| Working time | about 10-13 min per pack with a full tank (original 12.7 / 10.1 min); real operators plan about 8-12 min (unverified) | |
| Spray speed | 3-7 m/s typical (original 4 m/s legs, 6 m/s transit); ArduPilot WP_SPD up to 20 m/s [3] | unverified typical range |
| Spray height | 2-3 m above the canopy (original 2.5 m) | original, plausible |
| Top speed | about 10 m/s operationally (unverified) | |
| Max current | about 460-480 A peak (6 x 80 A 3 s ESC peak) | [20] |
| Motor-out | ArduCopter checks frames with 6 or more motors for thrust imbalance. When the highest filtered motor command reaches 1.5 x the average of all motors (it clears at 1.25 x), the thrust is unbalanced and "thrust boost" can engage: it drops yaw priority and holds roll, pitch and thrust with the other five [6]. The pilot sees the drone yaw slowly and hold attitude, and can land. It needs margin: at T:W 1.96, five motors give 1.6:1 and less is usable in control (unverified). Not simulated in the original [26] | [6] |

## 8. Real failure modes

| Failure | Cause | What the pilot sees |
|---|---|---|
| Desync / overheat | over-KV motor on too big a prop (original: 6215 180KV on 30"), or a worn bearing in pesticide mist | a sudden twitch or one arm dropping, a yaw spin, possibly a flip; ESC fault logs. Hexa thrust boost may save it [6] |
| Swapped CW/CCW prop or reversed motor | wrong prop or motor version on an arm | a violent yaw or a flip at take-off (original: flip) [26] |
| FC arrow backwards / wrong AHRS_ORIENTATION | mounting | immediate flip at take-off (original: flip at 0.7 s) [26] |
| Unlocked arm fold | sleeve not locked | the arm folds under thrust and the drone flips on take-off |
| Reversed AS150 / polarity | wiring | "pop", destroyed ESC caps (original: pop) [26] |
| Missing or under-rated low-ESR caps | 63 V caps on 14S, or none | voltage spikes, ESC failures and desyncs at high throttle |
| Brown-out | FC powered from a weak BEC, or the battery sagging under 480 A | FC reboots in flight, so the drone falls. The X8 ESCs have no BEC [20], so use a proper PM/brick |
| GPS yaw wrong | swapped GPS1/GPS2, wrong POS offsets, antennas under 30 cm apart, no fix on the rover | "EKF3 Yaw inconsistent" pre-arm, toilet-bowling, flying off-line |
| Compass error | steel sheds, rebar, high-current wiring | toilet-bowling in Loiter, "Compass variance"; the reason to use GPS yaw [7] |
| RTK float or lost corrections | telemetry link loss, base station moved | position wanders by decimetres to metres and the rows drift apart |
| Radar | dust or mud on the dome, below its 0.5 m minimum near landing, or reading crop gaps | height jumps over gaps; "Rangefinder 1: No Data" pre-arm |
| Spray drift | wind, too high, droplets too fine (high SPRAY_SPINNER) | mist leaves the block, an off-target dose; the real failure of the job |
| Over or under dose | fixed-flow pump, pump saturating at high speed, or a blocked nozzle | stripes in the crop days later |
| Prop wash | descending vertically into its own downwash with a heavy load | wobble and sink during the descent; descend with forward speed |
| Power-line strike | wires at field edges (original range has them at 8.15 and 8.55 m) | "Hit an obstacle"; the main real-world cause of ag-drone crashes (unverified claim) |
| Pump runs during RTL | DO_SPRAYER never turned off (the library does not stop on mode change) [2] | spray over the farmyard or house on the way home |

## 9. Uncertainties

- Battery and component prices; masses of the 16 Ah 2x6S pair, pump, boom, skids, RTK and RX (unverified).
- "10025 80KV" and "30x9.9" are not Hobbywing catalogue items; I could not identify the real products in the time box.
- The Cube Orange+ IMU set varies by hardware revision; hwdef lists ICM42688 (x2), ICM20948, ICM20649 and ICM45686 as probe candidates [19].
- Hover throttle in real ArduCopter (MOT_THST_HOVER) for this build, working-time and typical L/ha ranges are engineering estimates.
- Mission resume across a reboot: verified that it does not survive (index in RAM [16]). How Mission Planner's resume helper rebuilds the mission was not checked.
- Exact PreArm message strings and the Mission Planner labels "Survey (Grid)" and "RTK/GPS Inject" are from memory ("Large Vehicle MagCal" and "Motor Test" are confirmed [27][28]).
- Hobbywing's X8 spec table lists "Continuous current 20A" next to an "80A (3s)" peak; the 20 A may be a per-unit rated-power figure (950 W / 46 V). The data is from the manufacturer page, but its meaning is ambiguous.
- EFT E610P specs come only from retailers, and the listings disagree (even within one rcdrone.top page: 1407 vs 1362 mm, 35 vs 37 kg take-off weight; zbotic's 1404 mm / 5 kg could not be re-read).

## Verification

Adversarial fact-check, 2026-10-24 (14:12-14:20 CDT). Each claim was re-checked against a source opened in this pass (ArduPilot master source on raw.githubusercontent.com, the ArduCopter 4.7.2 and 4.6.3 parameter pages, ArduPilot wiki pages, Hobbywing product pages, manufacturer datasheets). The researcher's citations were not trusted; each was re-fetched.

| # | Claim | Status | Source | Old -> new (corrections) |
|---|---|---|---|---|
| 1 | Current stable for CubeOrangePlus is ArduCopter V4.7.2 (commit 2026-10-11) | confirmed | https://firmware.ardupilot.org/Copter/stable/CubeOrangePlus/git-version.txt | |
| 2 | Hexa X motor table: M1 +90 CW (test 2/B), M2 -90 CCW (5/E), M3 -30 CW (6/F), M4 +150 CCW (3/C), M5 +30 CCW (1/A), M6 -150 CW (4/D) | confirmed | https://github.com/ArduPilot/ardupilot/blob/master/libraries/AP_Motors/AP_MotorsMatrix.cpp (`setup_hexa_matrix`, MOTOR_FRAME_TYPE_X) | |
| 3 | FRAME_TYPE 13 DJIX numbers anticlockwise from front-right; 14 ClockwiseX numbers clockwise from front-right, same spin pattern; 18 = BetaFlightXReversed | confirmed | AP_MotorsMatrix.cpp; https://ardupilot.org/copter/docs/parameters-Copter-stable-V4.7.2.html | |
| 4 | Motor-loss thrust boost: >= 6 motors, unbalanced at 1.5 x average filtered command, rebalanced at 1.25 x (not on co-rotating frames) | confirmed | AP_MotorsMatrix.cpp `check_for_failed_motor` | |
| 5 | Mission Planner Motor Test starts at the first motor right of forward and proceeds clockwise | confirmed | https://ardupilot.org/copter/docs/connect-escs-and-motors.html | |
| 6 | SPRAY_PUMP_RATE 10 %, SPRAY_PUMP_MIN 0, SPRAY_SPEED_MIN 100 cm/s, SPRAY_SPINNER 1300 PWM; 100 ms on / 1000 ms off delays; pump % = v[m/s] x RATE clamped | confirmed, with a timing note added | https://github.com/ArduPilot/ardupilot/blob/master/libraries/AC_Sprayer/AC_Sprayer.h and AC_Sprayer.cpp | added: at 3 Hz the effective start is about 0.33 s and stop about 1.33 s |
| 7 | Sprayer update runs at 3 Hz (`SCHED_TASK_CLASS(AC_Sprayer, ..., update, 3, 90, 54)`) | confirmed | https://github.com/ArduPilot/ardupilot/blob/master/ArduCopter/Copter.cpp | |
| 8 | SERVOn_FUNCTION 22 = SprayerPump, 23 = SprayerSpinner, 33-38 = Motor1-6; RCx_OPTION 15 Sprayer Enable, 24 Auto Mission Reset, 75 SurfaceTrackingUpDown; SPRAY_ENABLE then refresh params | confirmed | 4.7.2 parameter list; https://ardupilot.org/copter/docs/common-sprayer.html | |
| 9 | Switch high while disarmed runs the pump test; arming cancels it; DO_SPRAYER p1 = 1 on, else off | confirmed | https://github.com/ArduPilot/ardupilot/blob/master/libraries/RC_Channel/RC_Channel.cpp (`do_aux_function_sprayer`); ArduCopter/AP_Arming_Copter.cpp; libraries/AP_Mission/AP_Mission_Commands.cpp | |
| 10 | Pump not stopped on mode change except ZigZag (`ZIGZ_SPRAYER`) | confirmed (no sprayer calls in ArduCopter mode.cpp, mode_rtl.cpp, mode_auto.cpp, motors.cpp, events.cpp; ZigZag calls `spray(false)` on exit) | https://github.com/ArduPilot/ardupilot/blob/master/ArduCopter/mode_zigzag.cpp | |
| 11 | 4.6 -> 4.7 rename table (WP_SPD, WP_ACC, WP_RADIUS_M, WP_RFND_USE, RTL_ALT_M, RTL_ALT_FINAL_M, RTL_SPEED_MS, LOIT_SPEED_MS, LOIT_ACC_MAX_M, LAND_SPD_MS, RNGFND1_MAX/MIN, RNGFND1_GNDCLR, ARMING_SKIPCHK); old names present in 4.6.3 and absent in 4.7.2; units m, m/s | confirmed | https://ardupilot.org/copter/docs/parameters-Copter-stable-V4.7.2.html and https://ardupilot.org/copter/docs/parameters-Copter-stable-V4.6.3.html | |
| 12 | FS_BATT_ENABLE and TERRAIN_FOLLOW absent from Copter 4.7.2 | confirmed | 4.7.2 parameter list | |
| 13 | GPS1_TYPE 17/18 uBlox MB base/rover, 22/23 DroneCAN MB, 25 UnicoreMovingBaselineNMEA, 26 Septentrio dual antenna; GPS_AUTO_SWITCH not 2 with MB; antennas >= 30 cm; F9P fw >= 1.3.2; works without RTK fix; EK3_SRC1_YAW 2 / 3 | confirmed | 4.7.2 parameter list; https://ardupilot.org/copter/docs/common-gps-for-yaw.html | |
| 14 | GPSn_POS_Y positive right, POS_Z positive down | confirmed | 4.7.2 parameter list (GPS1_POS_Y, GPS1_POS_Z) | |
| 15 | RNGFND1_TYPE 10 MAVLink, 11 USD1_Serial, 32 MSP, 33 USD1_CAN, 39 NRA24_CAN, 41 JRE_Serial, 42 Ainstein_LR_D1, 43 RDS02UF, 44 HexsoonRadar; RNGFND1_ORIENT 25 Down; CAN_Dx_PROTOCOL 7 USD1, 14 RadarCAN | confirmed | 4.7.2 parameter list; https://ardupilot.org/copter/docs/common-aerotenna-usd1.html, common-rangefinder-nra24.html, common-rangefinder-hexsoon-24g.html, common-ainstein-lrd1.html | |
| 16 | US-D1 range 0.5-50 m, 110 g, 100 Hz | corrected (update rate) | https://store.sundance.com/docs/Ainstein/US-D1-Data-Sheetv2.pdf; https://ardupilot.org/copter/docs/common-aerotenna-usd1.html | "100 Hz" -> "82 Hz UART / 86 Hz CAN per datasheet (ArduPilot page says 100 Hz)"; 0.5 m minimum and 110 g confirmed by datasheet |
| 17 | Cube Orange+: STM32H757, IMUs ICM42688/ICM20948/ICM20649/ICM45686 by revision, AK09916, dual MS5611; SERIAL_ORDER OTG1 USART2 USART3 UART4 UART8 UART7 OTG2 | confirmed | https://github.com/ArduPilot/ardupilot/blob/master/libraries/AP_HAL_ChibiOS/hwdef/CubeOrangePlus/hwdef.dat and CubeOrange/hwdef.inc | |
| 18 | Hobbywing X8: 8120-100KV 36N40P, 88.6 mm, 15 kg max, 5-7 kg per axis, 9.5-8.6 g/W, 12S 46 V, 35/40 mm tube, 1150 g, 950 W rated input, 80 A (3 s) peak / 20 A continuous, 1100-1940 us, no BEC, no throttle calibration, set PWM 1050-1950 on open-source FCs, MFP 30x11 191 g / 51 g, 143.1 x 90.2 x 78.5 mm | confirmed (the page's peak row is labelled "Peak current (30 seconds)" but the value reads "80A (3s)") | https://www.hobbywing.com/en/products/xrotor-x8108 | |
| 19 | Hover rotor speed about 3000 rpm (50 Hz, 100 Hz blade-pass) | corrected | Hobbywing X8 MFP 30x11 thrust test table (same page) | "3000 rpm / 50 Hz / 100 Hz" -> "2392 rpm at 5480 g: about 40 Hz / 80 Hz blade-pass" |
| 20 | Real hover throttle about 0.4-0.5 | corrected (still an estimate) | Hobbywing X8 thrust test table: 5480 g at 57 % throttle, 578.5 W, 12.6 A | "0.4-0.5 (unverified)" -> "57 % ESC throttle measured; learned MOT_THST_HOVER about 0.5-0.6 (unverified)" |
| 21 | X8 signal lead white = PWM, black = GND, plus red 5 V/data variant | corrected (wording) / partly unverified | Hobbywing X8 spec table "Black White-PWM, GND; Black Red White-GND, 5V, P" | "red 5 V/data variant" -> "3-wire GND, 5 V, PWM"; white = PWM is by convention (unverified) |
| 22 | X9 Plus: 100KV (9620), MFP 36x19, 12S/14S, 27 kg max, 11-13 kg per axis, 1760 g | confirmed | https://www.hobbywing.com/en/products/xrotor-x9-plus112 | |
| 23 | X6 Plus: 150KV, MFP 24x8.0, 11.8 kg max at 46 V, 3.5-5.5 kg per axis | confirmed (page lists 12-14S LiPo, 62x18 mm stator, 30 mm tube) | https://www.hobbywing.com/en/products/xrotor-x6-plus269 | |
| 24 | Tattu Pro 22000 mAh 12S 25C: 6300 g | confirmed (added 117 x 174 x 238 mm) | https://gensace.de/products/tattu-pro-22000mah-44-4v-25c-12s1p-lipo-battery-pack-with-as150u-plug | |
| 25 | Tattu 3.0 25000 mAh 14S: 9600 g | confirmed (cited gensace URL now 404; source replaced) | https://www.grepow.com/uav-battery/tattu-3-0-14s-25000mah-51-8v-25c-lipo-smart-drone-battery.html | URL replaced |
| 26 | EFT E610P: 1404 mm, 25 kg MTOW, 5 kg frame, 23-24" props | corrected / unverified | https://rcdrone.top/products/eft-e610p-agriculture-drone (zbotic page no longer shows specs) | "1404 mm / 25 kg / 5 kg" -> "1407 mm (table) or 1362 mm (text), 35-37 kg take-off, 6.5 kg frame, Hobbywing X6 + 23\" props"; zbotic values unverified |
| 27 | Mission resume: MAV_CMD 215 DO_SET_RESUME_REPEAT_DIST, up to 7 WPs history, 2 x WP radius suggested, MIS_RESTART must be 0 | confirmed | https://ardupilot.org/copter/docs/common-mission-rewind.html | |
| 28 | Resume point lost across reboot (`_nav_cmd.index` = NONE at construction; `resume()` calls `start()` when NONE) | confirmed | https://github.com/ArduPilot/ardupilot/blob/master/libraries/AP_Mission/AP_Mission.cpp and AP_Mission.h | |
| 29 | MOT_SPIN_ARM default 0.10, range 0-0.2; MOT_THST_HOVER range 0.125-0.6875; MOT_HOVER_LEARN 0/1/2 | confirmed | https://github.com/ArduPilot/ardupilot/blob/master/libraries/AP_Motors/AP_MotorsMulticopter.h; 4.7.2 parameter list | |
| 30 | ARMING_SKIPCHK bits 1-19 as listed, default 0, -1 skips all non-mandatory | confirmed | 4.7.2 parameter list | |
| 31 | INS_HNTCH_MODE 0-5; BATT_MONITOR 4/7/8; BATT_FS_LOW_ACT 2 RTL; FS_THR_ENABLE 1 RTL; FS_GCS_ENABLE 1 RTL with FS_GCS_TIMEOUT default 5 s; GPS_INJECT_TO 0/1/127; GPS_AUTO_CONFIG 1/2; OSD_TYPE 5; SERIALn_PROTOCOL 2/5/9/23; MOT_PWM_TYPE 0 | confirmed | 4.7.2 parameter list; https://github.com/ArduPilot/ardupilot/blob/master/ArduCopter/Parameters.cpp | |
| 32 | Surface tracking: SURFTRAK_MODE 0/1/2, SURFTRAK_TC, aux 75, leave EK3_SRC1_POSZ default and EK3_RNG_USE_HGT -1 | confirmed | https://ardupilot.org/copter/docs/terrain-following-manual-modes.html | |
| 33 | Accel cal 6 positions, within 20 deg except level; bench cal for very large vehicles; Calibrate Level corrects up to 10 deg pitch/roll, not yaw | confirmed | https://ardupilot.org/copter/docs/common-accelerometer-calibration.html | |
| 34 | Large Vehicle MagCal needs GPS lock and TRUE heading; wrong orientation "will appear to succeed" | confirmed | https://ardupilot.org/copter/docs/common-compass-calibration-in-mission-planner.html | |
| 35 | Arithmetic: tip clearances 138/87/189 mm, neighbour spacing 900 mm, 5.5 kg per axis, T:W 2.7 with 15 kg, dose examples 12.5 / 437.5 / 595 L/ha, L/ha = 600 Q / (v w), 50.4 / 58.8 V full charge | confirmed (recomputed) | computed | |

Not re-checked in this pass and left as marked: prices, masses of skids/pump/boom/RTK/RX, MP "Survey (Grid)" label, exact PreArm strings, typical L/ha and working-time ranges, the "power-line strikes are the main cause of ag-drone crashes" claim.
