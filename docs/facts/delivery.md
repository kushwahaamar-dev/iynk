# Fact sheet: autonomous delivery quad, Pixhawk 6C + Raspberry Pi 5 companion (Drone Lab Fig. 07, `delivery`)

Status: firmware facts verified against the ArduPilot source at tag `Copter-4.7.2` (released 2026-10-14) and the
MAVSDK sources on 2026-10-24, except where a line says "(unverified)". Source code first, official docs second,
vendor pages third.

**Read this first: ArduPilot 4.7 renamed many parameters to SI units.** The original's snippets (`RTL_ALT 1200`,
`RTL_SPEED`, `LOIT_SPEED`, `LOIT_ACC_MAX`, `PILOT_SPEED_UP`, `WPNAV_SPEED`, `ARMING_CHECK`) use the pre-4.7 names in
centimetres. 4.7 converts old values automatically on first boot, but any snippet iynk shows for 4.7 must use the
new names and metres. See section 5.1.

## 0. Header

**Craft class:** heavy-lift GPS multicopter, 690 mm X quad on folding carbon tube arms, 15-inch props, 6S 10 Ah
LiPo, ArduCopter on a Pixhawk 6C, with a Raspberry Pi 5 companion computer, forward depth camera, LTE modem and a
servo winch that lowers a 1 kg parcel on a line.

**Real products / reference builds it represents:**

| Reference | What it is | Link |
|---|---|---|
| Holybro X650 development kit | 650-class folding carbon quad built around a Pixhawk 6C/6X, designed for a companion computer (unverified exact kit contents) | https://holybro.com/products/x650-development-kit |
| ArduPilot "Raspberry Pi via MAVLink" + RealSense D435 avoidance | The official ArduPilot recipe this figure copies: Pi on TELEM2 at 921600, depth camera sending `OBSTACLE_DISTANCE` [8][9] | https://ardupilot.org/dev/docs/raspberry-pi-via-mavlink.html |
| Commercial winch-delivery drones (Flytrex, Wing, Manna) | Real operators that hover and lower parcels on a tether rather than land (none of them is a hobby quad; airframes differ) (unverified details) | https://www.flytrex.com |

**What it is and what it is for.** Two computers share one airframe. The Pixhawk 6C runs ArduCopter: the attitude
loop, the EKF3 sensor fusion, GPS navigation, the mission engine and every failsafe. The Raspberry Pi 5 runs
non-real-time work: the delivery logic (MAVSDK or ROS 2), the depth-camera pipeline that feeds obstacle distances to
the Pixhawk, and an LTE link to a ground station. They talk MAVLink2 over a 921600-baud UART. The drone takes off from
a depot, climbs above roofs and wires, flies to the address, descends to a hover a few metres up, winches the parcel
to the ground, releases it, reels the line back in and flies home. Lowering on a line keeps 15-inch props (which cut
to the bone) far from people, pets and fences.

## 1. Sources

Firmware source code (ArduPilot tag `Copter-4.7.2`, base `https://github.com/ArduPilot/ardupilot/blob/Copter-4.7.2/`):

1. ArduPilot releases (Copter-4.7.2 published 2026-10-14; 4.7.1 2026-09-03; 4.7.0 2026-07-22; 4.6.3 2025-11-20): https://github.com/ArduPilot/ardupilot/releases ; stable build server confirms 4.7.2 for Pixhawk6C: https://firmware.ardupilot.org/Copter/stable/Pixhawk6C/git-version.txt
2. `ArduCopter/Parameters.cpp` (FS_*, FRAME_*, AUTO_OPTIONS, GUID_OPTIONS, PLDP_*, renames of PILOT_*): .../ArduCopter/Parameters.cpp
3. `ArduCopter/mode_rtl.cpp` (RTL_ALT_M, RTL_SPEED_MS, RTL_ALT_FINAL_M, RTL_CLIMB_MIN_M and their renames): .../ArduCopter/mode_rtl.cpp ; `ArduCopter/mode_land.cpp` (LAND_SPD_MS ...); `ArduCopter/config.h` (defaults)
4. `libraries/AC_WPNav/AC_WPNav.cpp` (WP_SPD, WP_RADIUS_M, ... renamed from WPNAV_*) and `AC_Loiter.cpp` (LOIT_SPEED_MS ...)
5. `ArduCopter/mode.h` (which modes allow arming), `mode_auto.cpp` (DO_WINCH, NAV_PAYLOAD_PLACE), `mode_guided.cpp`
6. `libraries/AP_Winch/AP_Winch.cpp` (WINCH_*), `ArduCopter/GCS_MAVLink_Copter.cpp` (`handle_MAV_CMD_DO_WINCH`), `libraries/AP_Mission/AP_Mission.cpp` (DO_WINCH params)
7. `libraries/AP_Gripper/AP_Gripper.cpp` (GRIP_*), `libraries/GCS_MAVLink/GCS_Common.cpp` (`handle_command_do_gripper`), `libraries/SRV_Channel/SRV_Channel.h` (function 28 gripper, 88 winch, 133 winch clutch)
8. ArduPilot docs, Raspberry Pi via MAVLink: https://ardupilot.org/dev/docs/raspberry-pi-via-mavlink.html
9. ArduPilot docs, Intel RealSense depth camera for obstacle avoidance: https://ardupilot.org/copter/docs/common-realsense-depth-camera.html
10. `libraries/AC_Avoidance/AC_Avoid.cpp` (AVOID_*), `AP_OAPathPlanner.cpp` (OA_TYPE), `AP_OADatabase.cpp` (OA_DB_*), `AP_OABendyRuler.cpp` (OA_BR_*), `libraries/AP_Proximity/AP_Proximity_Params.cpp` (PRX1_*)
11. `libraries/AC_Fence/AC_Fence.cpp` (FENCE_*), `libraries/AP_BattMonitor/AP_BattMonitor_Params.cpp` (BATT_*)
12. `libraries/AP_Arming/AP_Arming.cpp` (ARMING_SKIPCHK replaced ARMING_CHECK in 4.7), `ArduCopter/AP_Arming_Copter.cpp`
13. `libraries/AP_Motors/AP_MotorsMatrix.cpp` (quad X motor table), `AP_MotorsMulticopter.cpp` (MOT_PWM_TYPE, MOT_THST_HOVER range), `libraries/AP_BLHeli/AP_BLHeli.cpp` (SERVO_BLH_*), `libraries/Filter/HarmonicNotchFilter.cpp` (INS_HNTCH_*)
14. `libraries/AP_HAL_ChibiOS/hwdef/Pixhawk6C/hwdef.dat` (UART order, IMUs, baro, compass, IOMCU DShot), `libraries/AP_BoardConfig/AP_BoardConfig.cpp` (BRD_IO_DSHOT)
15. ArduPilot docs, Holybro Pixhawk 6C: https://ardupilot.org/copter/docs/common-holybro-pixhawk6C.html
16. Holybro Pixhawk 6C technical specification: https://docs.holybro.com/autopilot/pixhawk-6c/technical-specification
17. ArduPilot docs, Setting the aircraft up for tuning (MOT_THST_EXPO, INS_GYRO_FILTER by prop size): https://ardupilot.org/copter/docs/setting-up-for-tuning.html
18. ArduPilot docs, Daiwa winch page (SERVO9_FUNCTION 88, SERVO10_FUNCTION 133, RCn_OPTION 44/45): https://ardupilot.org/copter/docs/common-daiwa-winch.html
19. MAVSDK Python 4.x (`pip install mavsdk`, 4.0.6 on 2026-10-08, new C-binding API): https://pypi.org/project/mavsdk/ and https://github.com/mavlink/MAVSDK/tree/main/py/mavsdk (examples `examples/asyncio/takeoff_and_land.py`, `mission.py`; plugins `mavsdk/asyncio/plugins/{action,mission,mission_raw,winch,gripper}`)
20. MAVSDK-Python 3.x API, renamed `mavsdk-grpc` / `import mavsdk_grpc`: https://github.com/mavlink/MAVSDK-Python (README, `mavsdk/system.py`, `examples/goto.py`, `examples/winch.py`)
21. MAVSDK C++ `cpp/src/mavsdk/plugins/action/action_impl.cpp` (ArduPilot-specific takeoff/goto handling): https://github.com/mavlink/MAVSDK
22. mavlink-router README and `examples/config.sample` (latest release v4, 2024-02-13): https://github.com/mavlink-router/mavlink-router
23. T-Motor MN4014 KV400 bench data (15x5 CF, 6S: 1250 g / 5.7 A at 50 %, 2620 g / 18.7 A at 100 %; 16x5.4: 3020 g / 22.5 A), reseller copy of the T-Motor sheet: https://openelab.io/products/tmotor-mn4014-400kv-motor
24. T-Motor MN501-S KV360 (the "5010 360KV" class): 175 g with cable, 6S, 17-18 inch props recommended, retailer listing: https://robu.in/product/t-motor-mn501-s-kv360
25. Tattu 10000 mAh 6S 30C XT90-S pack: 1357 g ±10 g, 175 x 65 x 58 mm: https://www.gensace.de/tattu-10000mah-22-2v-30c-6s1p-lipo-battery-pack-with-xt90-anti-spark-plug.html
26. Tattu 16000 mAh 6S 15C: 1932 g (original), Tattu Plus 2063 g: https://www.getfpv.com/tattu-16000mah-6s-15c-lipo-battery.html , https://www.nextfpv.com/es/products/tattu-plus-16000mah-22-2v-15c-6s1p-lipo-battery-pack
27. Intel RealSense D435i retail listings (90 x 25 x 25 mm, about 72 g, 87 x 58 deg depth FOV, USB-C; prices $330-550): https://www.shopro.lt/intel-realsense-depth-camera-d435i-en
28. Raspberry Pi 5 8 GB price history ($80 launch, $95 Dec 2025, $125 Feb 2026, $175 Apr 2026): https://www.omgubuntu.co.uk/2026/02/raspberry-pi-annouce-more-price-rises , https://www.bgr.com/2150106/raspberry-pi-cost-ram-crisis/

## 2. Geometry (craft frame: x forward, y left, z up, origin at frame centre on top of the bottom plate, mm)

### 2.1 Frame

| Item | Value | Source / note |
|---|---|---|
| Layout | X quad, square motor pattern, four folding carbon-tube arms, two landing skids | original `11:139-223` |
| Wheelbase (motor-to-motor diagonal) | 690 mm | original; motor axis at 690/2/sqrt(2) = 243.95 mm from centre on each axis |
| Motor-to-neighbour distance | 487.9 mm (2 x 243.95) | computed |
| Arm | carbon tube from hub corner (+-80, +-80) to motor mount; length about 230 mm hub-edge to motor (sqrt(2) x 164 = 232 mm) | computed from the original drawing |
| Arm tube diameter | drawing uses 22 mm; the lesson text says 25 mm. Pick one: 25 mm tubes are normal for 15-16 inch heavy-lift frames, 16-22 mm for 650-class frames (unverified) | original inconsistency |
| Fold hinge | one block per arm at (+-92, +-92); the latch must lock or the arm folds under thrust | original |
| Hub (bottom plate) | 240 x 220 x 5 mm (original drawing) | original |
| Top plate | 250 x 224 mm on 40 mm standoffs; carries battery, Pi 5, LTE modem | original |
| Landing skids | legs from (+-80, +-100, -5) to (+-80, +-150, -205); two 350 mm skids at z = -205 (skids run along x, spaced 300 mm in y) | original |
| FC mounting | Pixhawk 6C 84.8 x 44 x 12.4 mm, 59.3 g (aluminium case) [16], on a vibration-damping plate at the hub centre, arrow forward. No 30.5/20 mm stack: Pixhawks mount on foam or a damped plate | [16] |
| Frame mass | 1100 g incl. skids (original). Plausible for a 690 mm folding carbon frame with skids, at the heavy end (unverified) | |

### 2.2 Motors, ArduPilot order and spin (FRAME_CLASS 1, FRAME_TYPE 1 = X) [13]

From `AP_MotorsMatrix.cpp` quad X table: `{45, CCW, 1}, {-135, CCW, 3}, {-45, CW, 4}, {135, CW, 2}` (angle from nose, positive = right; last number = motor-test order).

| Motor (SERVOn_FUNCTION 33+n-1) | Position | x, y (mm) | Spin seen from above | Mission Planner Motor Test letter |
|---|---|---|---|---|
| M1 (function 33) | front right | +244, -244 | CCW | A |
| M2 (function 34) | rear left | -244, +244 | CCW | C |
| M3 (function 35) | front left | +244, +244 | CW | D |
| M4 (function 36) | rear right | -244, -244 | CW | B |

The Motor Test letters go clockwise from front-right (A = M1, B = M4, C = M2, D = M3): the letters are NOT motor
numbers. This is the classic bench mistake.

**Alternative direction.** ArduPilot's standard X has no "props reversed" switch. Two other quad-X tables exist
in `AP_MotorsMatrix.cpp` [13]:

| FRAME_TYPE | M1 | M2 | M3 | M4 | Use |
|---|---|---|---|---|---|
| 1 X (default) | front right CCW | rear left CCW | front left CW | rear right CW | normal ArduPilot wiring |
| 12 BetaFlightX | rear right CW | front right CCW | rear left CCW | front left CW | a Betaflight-wired ESC/stack, same spin pattern as X |
| 18 BetaFlightXReversed ("X_REV") | rear right CCW | front right CW | rear left CW | front left CCW | Betaflight numbering with every spin reversed ("props out") |

To fly the reversed spin pattern with standard numbering you would reverse all four motors (`SERVO_BLH_RVMASK` or
the ESC) and also need a mirrored yaw mix, which only FRAME_TYPE 18 provides; so use 18 and Betaflight numbering.

### 2.3 Props, payload, sensors

| Item | Value |
|---|---|
| Props | 15 x 5.5 in carbon, 2-blade (default); 381 mm diameter, radius 190.5 mm; tip-to-tip clearance between neighbours 487.9 - 381 = 107 mm; 16 in props leave 82 mm |
| Prop mounting | CW props on M3/M4, CCW props on M1/M2 (matched to motor spin) |
| Motor | 4114/4014-class 400 KV outrunner, 52 x 52 mm mount, 47 mm bell, 34 mm tall in the drawing (real MN4014 bell is about 46 mm, unverified) |
| ESCs | four single ESCs, 44 x 24 x 9 mm, halfway out each arm (prop-wash cooled) |
| Depth camera | nose, forward-facing, level (0 deg tilt); ArduPilot's RealSense support only supports a forward-facing camera [9]. D435i body 90 x 25 x 25 mm, 72 g [27] |
| GPS + compass | on a 129 mm carbon mast at x = -100 (aft), arrow forward |
| Battery | 6S 10000 mAh, about 175 x 65 x 58 mm [25] (original draws 176 x 76 x 61), strapped on the top plate along x, centred on the CG |
| Winch | under the hub, drum r 18 mm x 84 mm at z = -32; cargo bay plate 208 x 172 mm at z = -182; parcel 168 x 136 x 120 mm, 1000 g |
| Companion | Raspberry Pi 5 (85 x 56 mm board) on the top plate with active cooler |
| LTE modem | USB modem on the Pi, two antennas (65 mm drawn) |
| FPV / nav camera | none in the original apart from the depth camera |

## 3. The original's catalogue, sanity-checked (numbers stay as they are in iynk)

Calculator (kept identical): `thrust = 32 * pf * (KV*V/1000)^2` g per motor; hover `AUW/(9.5*eff)/V`; max current
`4*thrust/(3.6*eff)/V`; `hoverThr = sqrt(AUW/(4*thrust))`.

### Batteries

| Option | Original | Real-world check | Verdict |
|---|---|---|---|
| 6S 10000 mAh * | 1350 g, $160 | Tattu 6S 10000 30C XT90-S: 1357 g [25] | OK |
| 6S 16000 mAh | 2050 g, $245 | Tattu 6S 16000 15C: 1932 g; Tattu Plus: 2063 g [26] | OK |
| 4S 10000 mAh | 880 g, $110 | scales to about 900 g from the 6S pack (unverified) | OK. Note a 4S pack with the 400 KV or 360 KV motors cannot lift this craft (calc T:W 0.65-1.12; 4114/15x5.5 = 0.95) |

### Motors

| Option | Original | Real-world check | Verdict |
|---|---|---|---|
| 4114 400KV * | 140 g, $58, calc 2523 g max thrust on 15x5.5 / 6S | Closest real motor: T-Motor MN4014 KV400. On 15x5 CF / 6S: 2620 g at 18.7 A full throttle, 1250 g at 5.7 A at 50 % [23]. "4114" is a real size class but no 4114 400KV datasheet was checked (unverified) | Thrust is right. Price is low (MN4014 retails around $90-110, unverified) |
| 5010 360KV | 118 g, $46 | T-Motor MN501-S KV360 = 5010 class: 175 g with cable, recommended 17-18 inch props [24] | Weight implausible: a 5010 motor is not lighter than the 4114 option (140 g); real figure about 175 g |
| 2814 700KV | 105 g, $32, forCells 4 | 2814 700KV motors are 10-12 inch / 3-4S motors (unverified). On 4S 15x5.5 the calc gives 3434 g per motor (T:W 3.0, "Parts match") | **Untrue.** A ~105 g motor cannot make 3.4 kg (about 1 kW per motor). On 4S with 15 inch props it would overheat; the calc's KV^2 model ignores that loaded rpm collapses. Real full-throttle thrust on 15 inch is perhaps 1.5-2 kg (unverified). The 6S warning text ("desync") is right |

### Props

| Option | Original | Check | Verdict |
|---|---|---|---|
| 15x5.5 carbon 2-blade * | pf 1, 28 g, $32 per pair | T-Motor sells 15x5 CF for the MN4014 [23]; 15x5.5 CF props weigh roughly 20-30 g each (unverified) | OK |
| 14x4.8 | pf 0.82, eff 1.06 | 14 vs 15 in at the same rpm: (14/15)^4 = 0.76 thrust ratio for geometrically similar props | OK (plausible) |
| 16x5.4 | pf 1.18, eff 0.95 | MN4014: 3020 g on 16x5.4 vs 2620 g on 15x5 = 1.15 [23] | OK. Clearance drops to 82 mm |

Prop price is per pair (`Mechanical += prop.price * 2` buys four props).

### Fixed parts

| id | Original | Check | Verdict |
|---|---|---|---|
| FRAME | 690 mm folding carbon + skids, 1100 g, $189 | plausible (unverified) | OK |
| ESC | 4 x 40 A, 180 g, $120 | real full-throttle draw is about 19 A per motor on 15x5 [23]; 40 A is ample. Note: many big-quad ESCs (e.g. T-Motor AIR/Alpha) are PWM-only; DShot needs a BLHeli_32 / AM32 / Bluejay-class ESC (unverified per product) | OK |
| FC | Pixhawk 6C, 60 g, $245 | 59.3 g alu [16] | OK. Lesson says "three IMUs": **wrong**, the 6C has two (ICM-42688-P + BMI055, newer boards BMI088) [14][16] |
| COMP | Raspberry Pi 5 8 GB + fan, 55 g, $95 | $95 was the Dec 2025 price; $175 since April 2026 [28] (unverified against raspberrypi.com) | Price outdated |
| DEPTH | Stereo depth camera, 75 g, $289 | D435i: 72 g, $330+ retail [27] | OK (price a little low) |
| GPS | M10 GPS + compass + mast, 60 g, $59 | plausible (Holybro M10 class, unverified) | OK |
| LTE | 4G/LTE USB modem + antennas, 35 g, $69 | plausible (unverified) | OK |
| RX | backup RC receiver, 5 g, $22 | ELRS receiver: plausible | OK |
| TEL | SiK telemetry radio 433 MHz, 25 g, $49 | SiK radios come as an air/ground pair. 433 MHz is the Europe/Region 1 choice; in the USA SiK radios are 915 MHz (unverified regulatory detail) | Flag the band |
| XT60 | "PDB + XT90 + 1000 uF cap + BECs", 70 g, $35 | the id and bench tag say XT60 but the part is XT90; XT90(-S) is right for a 10 Ah 6S pack. **Missing: a current/voltage sensor (power module)**; the Pixhawk 6C needs one on POWER1 for BATT failsafes [15] | Rename tag to XT90; add a power module |
| TOP | top plate + standoffs + straps, 160 g | plausible | OK |
| CARGO | servo winch + cargo bay, 330 g, $89 | plausible; needs a release hook at the line end (see 4.6) | OK |
| PARCEL | 1000 g | part of AUW | OK |

Default build as rendered: AUW 5177 g, T:W 1.95, hover throttle 72 %, max current 126 A, hover 19.6 min. Real-world
comparison with MN4014 data: T:W 4 x 2620 / 5177 = **2.02**; hover needs 1294 g per motor, about 50 % throttle and
about 6 A per motor (24 A total, about 530 W); **max current about 75 A, not 126 A**; hover time 8 Ah / 24 A = about
20 min (the calc's 19.6 min agrees). The calc's 72 % hover throttle is too high: ArduPilot's `MOT_THST_HOVER` would
learn about 0.45-0.5 for this build, and the code clamps it to 0.125-0.6875 (`AP_MOTORS_THST_HOVER_MIN/MAX` in `AP_MotorsMulticopter.h`) [13], so a 72 % hover could not even be learned.


### 3.1 Corrections to the original's text and snippets

| Original | Fact |
|---|---|
| "Pixhawk 6C with three IMUs" | two IMUs (ICM-42688-P + BMI055/BMI088) [14][16] |
| Loiter to RTL in the air does nothing | real RTL engages from any mode whenever position + home are good (section 5.3) |
| RTL armed on the pad climbs and lands | RTL is not an armable mode in ArduCopter [5] |
| `RTL_ALT 1200`, `RTL_SPEED 300` (cm) | 4.7: `RTL_ALT_M 12`, `RTL_SPEED_MS 3` [3] |
| `LOIT_SPEED 500`, `LOIT_ACC_MAX 250`, `PILOT_SPEED_UP 150` | 4.7: `LOIT_SPEED_MS 5`, `LOIT_ACC_MAX_M 2.5`, `PILOT_SPD_UP 1.5` [2][4] |
| `WPNAV_SPEED 500` | 4.7: `WP_SPD 5` [4] |
| `FS_BATT_ENABLE 2` | `BATT_FS_LOW_ACT 2` (renamed in 3.6) [11] |
| `MOT_PWM_TYPE 6` with `SERVO9_FUNCTION 88` (winch on AUX1) | only valid with `BRD_IO_DSHOT 1` and motors on MAIN 1-4; otherwise motors go on AUX 1-4 and the winch moves to AUX 5+ [15] |
| `from mavsdk import System`, `connect(system_address=...)` | that API is now the `mavsdk-grpc` package (`from mavsdk_grpc import System`); `pip install mavsdk` gives the 4.x API [19][20] |
| winch left as a comment ("no winch call") | MAVSDK has a Winch plugin; ArduPilot accepts relax / relative length / rate control only [6][19] |
| "XT60" part id and bench tag | the part is an XT90 PDB; and a power module is missing |
| "four 25 mm carbon tube arms" vs 22 mm drawn | inconsistent; pick one |
| 72 % hover throttle, 126 A max | real about 49 % and about 75 A with MN4014 data [23] |
| 2814 700KV on 4S "Parts match, 3.0:1" | implausible (section 3) |
| 5010 360KV at 118 g | real 5010-class about 175 g [24] |
| Pi 5 8 GB at $95 | $175 since April 2026 [28] |
| SiK 433 MHz | correct for Europe; 915 MHz in the USA |
| `FENCE_ALT_MAX 30`, `WP_YAW_BEHAVIOR 1`, `FS_GCS_ENABLE 1`, `SERIAL2_PROTOCOL 2`, `SERIAL2_BAUD 921`, `WINCH_TYPE 1`, `SERVOn_FUNCTION 88`, `EK3_SRC1_POSXY 3`, `AHRS_ORIENTATION 4` = yaw 180, `FRAME_CLASS 1`, `FRAME_TYPE 1` | all correct for 4.7.2 |
| plug log "25.200000000000003 V" | 6S full = 25.2 V; round the display |

## 4. Electronics and wiring

### 4.1 Flight controller: Holybro Pixhawk 6C [14][15][16]

| Item | Value |
|---|---|
| FMU MCU | STM32H743, Cortex-M7 480 MHz, 2 MB flash, 1 MB RAM |
| IO MCU | STM32F103 (drives the 8 "I/O PWM OUT" = MAIN outputs) |
| IMUs | two: ICM-42688-P and BMI055 (newer boards: BMI088; hwdef also probes LSM6DSV), heated to 45 C (`HAL_IMU_TEMP_DEFAULT 45`) |
| Baro / compass | MS5611 (hwdef also accepts BMP388); internal IST8310 compass. Use the external compass in the GPS puck |
| Outputs | 16 PWM: 8 IO (MAIN 1-8 = SERVO1-8) + 8 FMU (AUX 1-8 = SERVO9-16). All FMU outputs do DShot; IO outputs need `BRD_IO_DSHOT 1` + reboot, then IO 1-4 also do bidirectional DShot. FMU groups: 1-4, 5-6, 7-8 must share a protocol/rate [15] |
| Power | two analog POWER ports; `BATT_MONITOR 4`, `BATT_VOLT_PIN 8`, `BATT_CURR_PIN 4`, `BATT_VOLT_MULT 18.182`, `BATT_AMP_PERVLT 36.364` for POWER1 [15]. FC input max 6 V; servo rail 0-36 V [16] |
| Logic level | all UARTs 3.3 V TTL |

**UART map (verified from hwdef `SERIAL_ORDER OTG1 UART7 UART5 USART1 UART8 USART2 USART3 OTG2` and [15]):**

| Port (JST-GH) | ArduPilot | MCU UART | Delivery-quad use | Parameters |
|---|---|---|---|---|
| USB | SERIAL0 | OTG1 | Mission Planner on the bench | - |
| TELEM1 | SERIAL1 | UART7 (RTS/CTS, own 1.5 A 5 V limit) | SiK radio | `SERIAL1_PROTOCOL 2`, `SERIAL1_BAUD 57` (57600, SiK default) |
| TELEM2 | SERIAL2 | UART5 (RTS/CTS) | Raspberry Pi 5 | `SERIAL2_PROTOCOL 2` (MAVLink2), `SERIAL2_BAUD 921` [8] |
| GPS1 (10-pin, with safety switch/LED/buzzer lines) | SERIAL3 | USART1 + I2C1 | M10 GPS + compass | `SERIAL3_PROTOCOL 5` (GPS, default), `GPS1_TYPE 1` auto |
| GPS2 | SERIAL4 | UART8 + I2C2 | spare | |
| TELEM3 | SERIAL5 | USART2 | ExpressLRS receiver (CRSF needs a full UART) | `SERIAL5_PROTOCOL 23` (RCIN), `SERIAL5_OPTIONS 0` for CRSF [15] |
| DEBUG | SERIAL6 | USART3 | - | |

TELEM pinout (Pixhawk standard, unverified for this exact board revision): 1 +5V, 2 TX (out), 3 RX (in), 4 CTS, 5 RTS,
6 GND. Holybro JST-GH cables usually have a red wire at pin 1 (+5 V) and black for the others (unverified); label the pins in the figure rather than relying on colour.

### 4.2 Companion link (Pi 5 to TELEM2)

| Pixhawk TELEM2 | Raspberry Pi 5 40-pin header |
|---|---|
| pin 2 TX | pin 10, GPIO15 RXD |
| pin 3 RX | pin 8, GPIO14 TXD |
| pin 6 GND | pin 6 GND |
| pin 1 +5 V | **leave unconnected**; ArduPilot: "It is usually not recommended that +5v be supplied via the flight controller's TELEM port connector" [8] |

- Both sides are 3.3 V logic: no level shifter.
- On the Pi, enable the UART (`sudo raspi-config` > Interface > Serial: login shell No, hardware Yes); ArduPilot's
  page says the port then appears as `/dev/serial0` [8]. On a Pi 5 the GPIO14/15 UART is `/dev/ttyAMA0` and the
  separate 3-pin debug connector is `/dev/ttyAMA10` (unverified against raspberrypi.com in this session). Use
  `/dev/ttyAMA0` (or `/dev/serial0` after checking it points there).
- Pi 5 power: official supply is 5 V 5 A (USB-C PD). From a BEC, feed 5 V into header pins 2/4 from a 5 V >= 5 A BEC.
  When the Pi cannot detect a 5 A supply it caps total USB current at 600 mA; with a depth camera and LTE modem on
  USB you need `usb_max_current_enable=1` in `config.txt` and a BEC that can really supply it (unverified).
- **mavlink-router** on the Pi fans the one serial link out to local programs and to the LTE link [22].
  `/etc/mavlink-router/main.conf`:

```ini
[General]
TcpServerPort = 5760

[UartEndpoint pixhawk]
Device = /dev/ttyAMA0
Baud = 921600

[UdpEndpoint mavsdk]
Mode = Normal
Address = 127.0.0.1
Port = 14540

[UdpEndpoint gcs_over_lte]
Mode = Normal
Address = 10.8.0.1
Port = 14550
```

  Equivalent CLI: `mavlink-routerd -e 127.0.0.1:14540 -e 10.8.0.1:14550 /dev/ttyAMA0:921600` [22]. `10.8.0.1` stands for
  the ground station's address on a VPN (ZeroTier, Tailscale or WireGuard) because mobile networks use CGNAT and
  cannot accept inbound connections (VPN approach: unverified common practice). The MAVSDK script then connects to
  `udpin://0.0.0.0:14540` (section 5.6).

### 4.3 Depth camera and avoidance

- Intel RealSense D435/D435i, USB-C into a Pi USB 3 port [9][27]. A companion script (`d4xx_to_mavlink.py` from the
  `vision_to_mavros` repo) turns the depth image into `OBSTACLE_DISTANCE` messages (up to 72 sectors) at 10-15 Hz [9].
- ArduPilot's doc lists UP Squared as the tested companion and says Raspberry Pi 4 is "not supported"; running the
  pipeline on a Pi 5 is untested by ArduPilot (unverified whether it keeps 10 Hz) [9].
- Firmware side: `PRX1_TYPE 2` (MAVLink). Section 5.4 has the full set.

### 4.4 ESCs, motors, power

| Item | Value |
|---|---|
| ESCs | 4 x single 40 A ESCs on the arms, 6S rated, DShot (AM32 or BLHeli_32 firmware; Bluejay is BLHeli_S-only and not used on 40 A singles, unverified). BLHeli_32 development stopped in 2024 (unverified) |
| Protocol | `MOT_PWM_TYPE 6` = DShot600 (values: 0 Normal, 1 OneShot, 2 OneShot125, 3 Brushed, 4 DShot150, 5 DShot300, 6 DShot600, 7 DShot1200) [13]. DShot300 is a sound choice with long arm leads |
| Motor outputs | **Either** motors on FMU AUX 1-4 (`SERVO9..12_FUNCTION 33..36`) and the winch on AUX 5 (`SERVO13_FUNCTION 88`, group 5-6 stays PWM), **or** `BRD_IO_DSHOT 1` with motors on MAIN 1-4 (`SERVO1..4_FUNCTION 33..36`) and the winch on AUX 1 (`SERVO9_FUNCTION 88`). The original's "MOT_PWM_TYPE 6 + winch on AUX1" only works with the second option [15] |
| Battery lead | XT90 or XT90-S (anti-spark) for a 6S 10 Ah pack; 10-12 AWG main leads (unverified gauge) |
| Low-ESR capacitor | 1000 uF electrolytic, rated 35 V minimum for 6S (25.2 V full), 50 V preferred for spike margin; across the battery pads at the PDB, stripe (minus) to negative (rating: unverified engineering practice) |
| Power module | analog PM on POWER1 rated for the current (>= 80-100 A), e.g. a Holybro PM (model and rating unverified); without it `BATT_*` failsafes cannot work |
| BECs | 5 V >= 5 A for the Pi 5; separate 5 V or 6 V for the winch servo on the servo rail (big servos brown out the FC rail); 12 V for the LTE modem only if it needs it |
| Buzzer / LED / safety switch | normally in the GPS module on the GPS1 10-pin connector (Holybro M10 GPS has them, unverified). `BRD_SAFETY_DEFLT 0` disables the safety switch |

### 4.5 Radio links

| Link | Hardware | Port | Note |
|---|---|---|---|
| RC (backup pilot) | ExpressLRS receiver, CRSF | TELEM3, `SERIAL5_PROTOCOL 23` | A human must be able to take over in Loiter/AltHold; RC failsafe `FS_THR_ENABLE` |
| Telemetry | SiK radio pair, 57600 baud | TELEM1 | 433 MHz (EU) or 915 MHz (US); range a few km |
| LTE | USB 4G modem on the Pi | Pi USB | MAVLink via mavlink-router over a VPN; beyond-visual-line-of-sight flying needs regulatory permission |

### 4.6 Payload release: winch and/or gripper

- **PWM winch** (`WINCH_TYPE 1`): a continuous-rotation servo/motor whose PWM sets line speed. Output function
  `SERVOn_FUNCTION 88` (Winch). ArduPilot drives it at rates up to `WINCH_RATE_MAX` (m/s, default 1.0) with position
  gain `WINCH_POS_P` (default 1.0). There is no encoder: the PWM backend **estimates line length by integrating the
  commanded rate** (`line_length += rate_desired * dt`), so it drifts [6]. Daiwa smart winch: `WINCH_TYPE 2`,
  `SERVO10_FUNCTION 133` (clutch) and serial telemetry `SERIALn_PROTOCOL 31` [18].
- **Gripper** (`GRIP_ENABLE 1`, `GRIP_TYPE 1` servo or `2` EPM): `SERVOn_FUNCTION 28`, PWM defaults grab 1900,
  release 1100, neutral 1500, `GRIP_AUTOCLOSE` 0 s [7].
- A winch only pays out line; something must let go of the parcel. Real designs use a self-releasing hook at the line
  end that opens when the line goes slack on the ground (unverified example products), or a gripper on the hook.
  For iynk: "release" = the hook opens when the parcel touches down.
- RC aux switches: `RCn_OPTION 19` Gripper, `44` Winch Enable, `45` Winch Control [source: `RC_Channel.cpp`].

## 5. Firmware: ArduCopter 4.7.2 (current stable, released 2026-10-14) [1]

Parameters are set in Mission Planner (Config > Full Parameter List) or MAVProxy (`param set NAME VALUE`). ArduPilot
has no Betaflight-style CLI; a `.param` file is one `NAME,VALUE` (or `NAME VALUE`) per line.

### 5.1 Renamed in 4.7 (units changed to SI; old values convert automatically on first boot) [2][3][4][12]

| Pre-4.7 name (unit) | 4.7 name (unit) | Default in 4.7 |
|---|---|---|
| `RTL_ALT` (cm) | `RTL_ALT_M` (m) | 15 m |
| `RTL_SPEED` (cm/s) | `RTL_SPEED_MS` (m/s) | 0 = use `WP_SPD` |
| `RTL_ALT_FINAL` (cm) | `RTL_ALT_FINAL_M` (m) | 0 = land |
| `RTL_CLIMB_MIN` (cm) | `RTL_CLIMB_MIN_M` (m) | 0 |
| `WPNAV_SPEED` (cm/s) | `WP_SPD` (m/s) | 10 m/s |
| `WPNAV_RADIUS` (cm) | `WP_RADIUS_M` (m) | 2 m |
| `WPNAV_SPEED_UP` / `_DN` (cm/s) | `WP_SPD_UP` / `WP_SPD_DN` (m/s) | 2.5 / 1.5 m/s |
| `WPNAV_ACCEL` (cm/s/s) | `WP_ACC` (m/s/s) | 2.5 |
| `LOIT_SPEED` (cm/s) | `LOIT_SPEED_MS` (m/s) | 12.5 m/s |
| `LOIT_ACC_MAX` (cm/s/s) | `LOIT_ACC_MAX_M` (m/s/s) | 5.0 |
| `LOIT_BRK_ACCEL` / `LOIT_BRK_JERK` | `LOIT_BRK_ACC_M` / `LOIT_BRK_JRK_M` | |
| `PILOT_SPEED_UP` / `PILOT_SPEED_DN` (cm/s) | `PILOT_SPD_UP` / `PILOT_SPD_DN` (m/s) | 2.5 / 0 (= use up) |
| `PILOT_ACCEL_Z` | `PILOT_ACC_Z` | |
| `PILOT_TKOFF_ALT` (cm) | `PILOT_TKO_ALT_M` (m) | 0 |
| `LAND_SPEED` (cm/s) | `LAND_SPD_MS` (m/s) | 0.5 m/s |
| `LAND_SPEED_HIGH`, `LAND_ALT_LOW` | `LAND_SPD_HIGH_MS`, `LAND_ALT_LOW_M` | 0, 10 m |
| `ARMING_CHECK` (bitmask of checks to RUN, 1 = all) | `ARMING_SKIPCHK` (bitmask of checks to SKIP, 0 = run all) | 0 |
| `PRX_TYPE` etc. (renamed in 4.3) | `PRX1_TYPE`, `PRX1_ORIENT`, ... | |
| `FS_BATT_ENABLE`, `FS_BATT_VOLTAGE`, `FS_BATT_MAH` (renamed in 3.6) | `BATT_FS_LOW_ACT`, `BATT_LOW_VOLT`, `BATT_LOW_MAH` | |

Unchanged and still in their old units: `RTL_LOIT_TIME` (ms, default 5000), `FENCE_ALT_MAX` / `FENCE_RADIUS` /
`FENCE_MARGIN` (m), `AVOID_MARGIN` (m), `BATT_LOW_VOLT` (V), `FS_GCS_TIMEOUT` (s, default 5).

### 5.2 Initial setup (verified names and values)

```
# frame and orientation
FRAME_CLASS 1            # Quad                         [2]
FRAME_TYPE 1             # X                            [2]
AHRS_ORIENTATION 0       # 4 = Yaw180 if the FC arrow points backwards
# motors (option A: motors on FMU AUX1-4)
SERVO9_FUNCTION 33       # Motor1 front right CCW
SERVO10_FUNCTION 34      # Motor2 rear left CCW
SERVO11_FUNCTION 35      # Motor3 front left CW
SERVO12_FUNCTION 36      # Motor4 rear right CW
MOT_PWM_TYPE 6           # DShot600                     [13]
MOT_SPIN_ARM 0.10        # default 0.1
MOT_SPIN_MIN 0.15        # default 0.15
MOT_THST_EXPO 0.65       # 0.65 for 10 in, 0.75 for 20 in props: about 0.7 for 15 in [17]
MOT_BAT_VOLT_MAX 25.2    # 4.2 V x 6                    [17]
MOT_BAT_VOLT_MIN 19.8    # 3.3 V x 6                    [17]
INS_GYRO_FILTER 30       # 40 Hz for 10 in, 20 Hz for 20 in props [17]; 30 Hz is the 15 in interpolation
INS_ACCEL_FILTER 10      # [17]
# links
SERIAL1_PROTOCOL 2       # SiK on TELEM1, MAVLink2
SERIAL1_BAUD 57
SERIAL2_PROTOCOL 2       # Pi 5 on TELEM2            [8]
SERIAL2_BAUD 921
SERIAL5_PROTOCOL 23      # ELRS/CRSF on TELEM3       [15]
# battery monitor (POWER1)
BATT_MONITOR 4           # analog voltage + current  [15]
BATT_CAPACITY 10000
# position source
EK3_SRC1_POSXY 3         # GPS
EK3_SRC1_VELXY 3         # GPS
EK3_SRC1_POSZ 1          # baro
```

`EK3_SRC1_POSXY` values: 0 None, 3 GPS, 4 Beacon, 6 ExternalNav (default 3). `EK3_SRC1_VELXY`: 0 None, 3 GPS,
4 Beacon, 5 OpticalFlow, 6 ExternalNav, 7 WheelEncoder. `EK3_SRC1_POSZ`: 0 None, 1 Baro (default), 2 RangeFinder, 3 GPS,
4 Beacon, 6 ExternalNav (from `libraries/AP_NavEKF/AP_NavEKF_Source.cpp`, 4.7.2).

### 5.3 Flight modes this craft uses (original: `deliver` = Auto/Guided, `loiter`, `rtl`)

| Mode | `FLTMODE` number | Can arm in it? [5] | What it does |
|---|---|---|---|
| Stabilize | 0 | yes | self-level, manual throttle |
| AltHold | 2 | yes | self-level + baro altitude hold |
| Auto | 3 | only with `AUTO_OPTIONS` bit 0 (Allow Arming); bit 1 lets it take off without raising throttle | flies the uploaded mission |
| Guided | 4 | from a GCS/companion or scripting always; from the transmitter only with `GUID_OPTIONS` bit 0 | follows companion/GCS commands (MAVSDK takeoff and goto use it) |
| Loiter | 5 | yes | GPS position + altitude hold; sticks move it |
| RTL | 6 | **no** | climb, fly home, land |
| Land | 9 | no | descend and land in place |
| PosHold | 16 | yes | like Loiter with a more direct stick feel |
| SmartRTL | 21 | no | retraces the outbound path |

Mode numbers verified in the `Mode::Number` enum of `ArduCopter/mode.h` (4.7.2).

Mode switch: `FLTMODE_CH` (default channel 5) selects `FLTMODE1..6`. Aux-switch alternatives: `RCn_OPTION 4` (RTL),
`16` (Auto), `56` (Loiter), `42` (SmartRTL), `31` (Motor Emergency Stop) [RC_Channel.cpp].

Loiter snippet, 4.7 names:

```
LOIT_SPEED_MS 5          # m/s max horizontal speed (was LOIT_SPEED 500)
LOIT_ACC_MAX_M 2.5       # m/s/s, gentle with a parcel on a line (was LOIT_ACC_MAX 250)
PILOT_SPD_UP 1.5         # m/s climb (was PILOT_SPEED_UP 150)
```

**The original's dead Loiter-to-RTL switch, at the facts level.** In real ArduCopter, RTL is an ordinary flight
mode. Selecting it at any time in flight (mode switch, `RCn_OPTION 4`, a GCS, or a failsafe) engages it no matter
which mode the drone was armed in. The only reason a switch to RTL is refused is a missing position estimate or home
(RTL requires GPS); then the mode change fails, the drone stays in the current mode and the pilot keeps control. In
RTL the vehicle [3]:
1. climbs to `RTL_ALT_M` (or stays at its current height if already higher; always climbs at least
   `RTL_CLIMB_MIN_M`; `RTL_CONE_SLOPE` (default 3) lowers the return height when it is close to home),
2. flies home at `RTL_SPEED_MS` (0 = `WP_SPD`),
3. hovers above home for `RTL_LOIT_TIME` (5000 ms),
4. descends to `RTL_ALT_FINAL_M` (0 = land) and lands at `LAND_SPD_MS` below `LAND_ALT_LOW_M`, then disarms.
The pilot can yaw (unless `RTL_OPTIONS` bit 2 "Ignore pilot yaw") and, with `LAND_REPOSITION 1` (default),
nudge position during the final landing; switching back to Loiter returns full control instantly. Also: **RTL is not
an armable mode**, so "arm in RTL on the pad" (the original's RTL range demo) is impossible in ArduPilot; the fix is
arm in Loiter, take off, then switch to RTL.

RTL snippet, 4.7 names:

```
RTL_ALT_M 12             # m, above roofs (7 m) and power lines (9 m)  (was RTL_ALT 1200)
RTL_SPEED_MS 3           # m/s  (was RTL_SPEED 300)
RTL_ALT_FINAL_M 0        # land at home
RTL_LOIT_TIME 5000       # ms
```

### 5.4 Obstacle avoidance with the depth camera [9][10]

```
PRX1_TYPE 2              # MAVLink: OBSTACLE_DISTANCE from the Pi
AVOID_ENABLE 7           # bitmask: 1 fence + 2 proximity + 4 beacon fence
AVOID_MARGIN 1.5         # m kept from obstacles in GPS modes (range 1-10)
AVOID_BEHAVE 1           # 0 Slide, 1 Stop
AVOID_DIST_MAX 1.5       # m, starts leaning away in non-GPS modes (AltHold)
AVOID_ANG_MAX 30         # deg max lean away in non-GPS modes (4.7 default 10)
OA_TYPE 1                # path planning in Auto/Guided: 0 off, 1 BendyRuler, 2 Dijkstra (fence only), 3 Dijkstra+BendyRuler
OA_BR_LOOKAHEAD 5        # m look-ahead (range 1-100)
OA_MARGIN_MAX 2          # m wide margin
OA_DB_SIZE 100           # object-database points (range 0-10000)
OA_DB_EXPIRE 10          # s
```

- `AVOID_*` (simple avoidance: stop or slide) acts in pilot-controlled modes such as Loiter, AltHold and PosHold
  and in Guided velocity control (exact mode list unverified); `OA_TYPE` path planners re-route Auto and Guided waypoints around obstacles stored in the
  object database (OA_DB) built from proximity data. Values from source [10]; the OA_BR/OA_DB numbers above are
  example settings, not defaults.
- Pre-arm messages tied to this: `PRX1: No Data`, `PRX1: Not Connected`, `Check Object Avoidance`.
- The camera faces forward only and its FOV is under 90 deg, so it sees nothing beside, behind or below the drone [9].

### 5.5 Winch / gripper and the delivery mission

```
WINCH_TYPE 1             # 0 None, 1 PWM, 2 Daiwa          [6]
WINCH_RATE_MAX 1.0       # m/s max line speed (default 1.0)
WINCH_POS_P 1.0          # position error gain (default 1.0)
SERVO13_FUNCTION 88      # Winch (on AUX5 with option A; SERVO9 on AUX1 with BRD_IO_DSHOT 1)
# or a gripper / release hook
GRIP_ENABLE 1
GRIP_TYPE 1              # 1 Servo, 2 EPM                  [7]
GRIP_GRAB 1900
GRIP_RELEASE 1100
SERVO14_FUNCTION 28      # Gripper
```

`MAV_CMD_DO_WINCH` (id 42600) [6]: param1 winch number (ignored by ArduPilot), param2 action
(0 = relax, 1 = relative length control, 2 = rate control; other MAVLink actions are rejected with
MAV_RESULT_FAILED), param3 length in m relative to the current length (positive pays out, negative winds in), param4
rate in m/s (used only by rate control; length control runs at up to `WINCH_RATE_MAX`). Returns FAILED if
`WINCH_TYPE` is 0.

`MAV_CMD_DO_GRIPPER` (id 211): param1 gripper number (ignored), param2 0 = release, 1 = grab [7].

`MAV_CMD_NAV_PAYLOAD_PLACE` (id 94): ArduCopter descends at the target until it detects touchdown (thrust drops
below `PLDP_THRESH` x hover, default 0.9), releases the gripper, waits `PLDP_DELAY` s and climbs; `PLDP_SPEED_DN`
(m/s, 0 = normal land speed), `PLDP_RNG_MAX` (m) [2][5]. This is the "land the parcel" alternative to winching.

A delivery mission (Mission Planner, alt relative to home):

| # | Command | Parameters | Phase in iynk |
|---|---|---|---|
| 0 | (home) | written by ArduPilot | |
| 1 | NAV_TAKEOFF | alt 12 m | takeoff |
| 2 | NAV_WAYPOINT | drop zone lat/lon, 12 m | to drop zone |
| 3 | NAV_WAYPOINT | same lat/lon, 3.5 m | descend |
| 4 | DO_WINCH | action 1, length +3.4 m | lowering |
| 5 | NAV_DELAY or NAV_LOITER_TIME | about 6 s (3.4 m at 1 m/s plus settle) | lowering / release |
| 6 | DO_GRIPPER | release (if a gripper hook) | release |
| 7 | DO_WINCH | action 1, length -3.4 m | winch up |
| 8 | NAV_LOITER_TIME | about 5 s | winch up |
| 9 | NAV_RETURN_TO_LAUNCH | | climb, flying home, landing |

DO_ commands run immediately after the preceding NAV command completes and do not wait, so a NAV_LOITER_TIME (or
NAV_DELAY) is what holds the drone while the line moves (`AP_Mission::update()` / `advance_current_nav_cmd()`:
DO items between two NAV items start when the earlier NAV completes and run alongside the next NAV) [6].

### 5.6 MAVSDK on the Pi (verified against MAVSDK sources, October 2026) [19][20][21]

Packaging changed in September 2026: **`pip install mavsdk` now installs MAVSDK 4.x** (4.0.6, 2026-10-08), a direct
C-library binding with no `mavsdk_server`, imported as `from mavsdk.asyncio import Mavsdk, ...`. The older gRPC API
that the original's snippet uses (`from mavsdk import System`) lives on as **`mavsdk-grpc`**, imported as
`mavsdk_grpc`. Pick one; both are shown.

How MAVSDK drives ArduCopter (from `action_impl.cpp`): `takeoff()` first switches to GUIDED (MAVSDK's "Offboard"
maps to ArduCopter Guided) and then sends `MAV_CMD_NAV_TAKEOFF` with the stored takeoff altitude;
`goto_location()` switches to GUIDED then sends `MAV_CMD_DO_REPOSITION`; `set_takeoff_altitude()` on ArduPilot is
only stored locally and sent with the takeoff command. `goto_location` altitude is **AMSL**, so read home's
`absolute_altitude_m` first. The Winch plugin offers `relax`, `relative_length_control`, `rate_control`, and also
`lock/deliver/hold/retract/load_line/abandon_line/load_payload`, but ArduPilot accepts only the first three
(section 5.5). For missions on ArduPilot use `mission_raw` (raw MAVLink items) rather than the PX4-oriented
`mission` plugin (unverified that `mission` fails on ArduPilot; `mission_raw` is the safe choice).

**MAVSDK 4.x (`pip install mavsdk`), asyncio:**

```python
import asyncio
from mavsdk.asyncio import Mavsdk, Configuration, ComponentType
from mavsdk.asyncio.plugins.action import ActionAsync
from mavsdk.asyncio.plugins.telemetry import TelemetryAsync
from mavsdk.asyncio.plugins.winch import WinchAsync

async def deliver(drop_lat, drop_lon):
    mavsdk = Mavsdk(Configuration.create_with_component_type(ComponentType.GROUND_STATION))
    await mavsdk.add_any_connection("udpin://0.0.0.0:14540")      # via mavlink-router
    # or directly: "serial:///dev/ttyAMA0:921600"
    drone = None
    async for _ in mavsdk.on_new_system():
        for system in await mavsdk.get_systems():
            if await system.has_autopilot() and await system.is_connected():
                drone = system
                break
        if drone is not None:
            break

    action, telemetry, winch = ActionAsync(drone), TelemetryAsync(drone), WinchAsync(drone)
    while True:                                       # wait for EKF position + home
        health = await telemetry.health()
        if health.is_global_position_ok and health.is_home_position_ok:
            break
        await asyncio.sleep(1)

    await action.set_takeoff_altitude(12.0)           # m above home
    await action.arm()
    await action.takeoff()                            # GUIDED + NAV_TAKEOFF
    while (await telemetry.position()).relative_altitude_m < 11.5:
        await asyncio.sleep(0.5)
    home_amsl = (await telemetry.home()).absolute_altitude_m   # HomePosition
    await action.goto_location(drop_lat, drop_lon, home_amsl + 12.0, 0.0)   # AMSL!
    # ... wait until within ~1 m, then descend:
    await action.goto_location(drop_lat, drop_lon, home_amsl + 3.5, 0.0)
    await winch.relative_length_control(1, 3.4, 1.0)  # instance, metres out, m/s (ArduPilot uses WINCH_RATE_MAX)
    await asyncio.sleep(6)
    await winch.relative_length_control(1, -3.4, 1.0) # wind back in
    await asyncio.sleep(6)
    await action.return_to_launch()

asyncio.run(deliver(30.2672, -97.7431))
```

The connection/discovery block, `ActionAsync`, `TelemetryAsync.health()`, `arm`, `takeoff`, `goto_location`,
`return_to_launch` and `WinchAsync.relative_length_control(instance, length_m, rate_m_s)` are copied from the 4.x
sources [19]; in 4.x, `TelemetryAsync.home()` and `position()` return one current value (`HomePosition`,
`Position`), while `subscribe_home()` / `subscribe_position()` are the async generators.

**MAVSDK-gRPC 3.x API (`pip install mavsdk-grpc`, the original's style):**

```python
import asyncio
from mavsdk_grpc import System

async def deliver(drop_lat, drop_lon):
    drone = System()
    await drone.connect(system_address="serial:///dev/ttyAMA0:921600")   # or "udpin://0.0.0.0:14540"
    async for state in drone.core.connection_state():
        if state.is_connected:
            break
    async for health in drone.telemetry.health():
        if health.is_global_position_ok and health.is_home_position_ok:
            break
    async for home in drone.telemetry.home():
        home_amsl = home.absolute_altitude_m
        break

    await drone.action.set_takeoff_altitude(12.0)
    await drone.action.arm()
    await drone.action.takeoff()
    await asyncio.sleep(15)
    await drone.action.goto_location(drop_lat, drop_lon, home_amsl + 12.0, 0.0)
    await asyncio.sleep(30)                                   # better: watch telemetry.position()
    await drone.action.goto_location(drop_lat, drop_lon, home_amsl + 3.5, 0.0)
    await asyncio.sleep(10)
    await drone.winch.relative_length_control(1, 3.4, 1.0)
    await asyncio.sleep(6)
    await drone.winch.relative_length_control(1, -3.4, 1.0)
    await asyncio.sleep(6)
    await drone.action.return_to_launch()

asyncio.run(deliver(30.2672, -97.7431))
```

Connection URL formats (3.x `system.py` docstring): `serial:///path[:baud]`, `udpin://host:port`,
`udpout://host:port`, `tcpin://`, `tcpout://`; the old `udp://:14540` form is gone [20].

**Mission upload with `mission_raw`** (both APIs have `upload_mission(items)`, `start_mission()`,
`subscribe_mission_progress()`, `is_mission_finished()`; MissionItem fields: `seq, frame, command, current,
autocontinue, param1..param4, x, y, z, mission_type`; x/y are lat/lon x 1e7 ints for global frames):

```python
from mavsdk_grpc.mission_raw import MissionItem   # 3.x (mavsdk-grpc) API
FRAME_REL = 3                        # MAV_FRAME_GLOBAL_RELATIVE_ALT
def item(seq, cmd, p1=0, p2=0, p3=0, p4=0, lat=0, lon=0, alt=0):
    return MissionItem(seq, FRAME_REL, cmd, 1 if seq == 0 else 0, 1,
                       p1, p2, p3, p4, int(lat * 1e7), int(lon * 1e7), alt, 0)
items = [
    item(0, 16, lat=HOME_LAT, lon=HOME_LON),          # seq 0 = home, overwritten by ArduPilot
    item(1, 22, alt=12),                              # NAV_TAKEOFF
    item(2, 16, lat=DROP_LAT, lon=DROP_LON, alt=12),  # NAV_WAYPOINT
    item(3, 16, lat=DROP_LAT, lon=DROP_LON, alt=3.5),
    item(4, 42600, p1=1, p2=1, p3=3.4),               # DO_WINCH lower 3.4 m
    item(5, 19, p1=6, lat=DROP_LAT, lon=DROP_LON, alt=3.5),   # NAV_LOITER_TIME 6 s
    item(6, 42600, p1=1, p2=1, p3=-3.4),              # DO_WINCH retract
    item(7, 19, p1=6, lat=DROP_LAT, lon=DROP_LON, alt=3.5),
    item(8, 20),                                      # NAV_RETURN_TO_LAUNCH
]
await drone.mission_raw.upload_mission(items)
```

MAVLink command ids used: NAV_WAYPOINT 16, NAV_LOITER_TIME 19, NAV_RETURN_TO_LAUNCH 20, NAV_TAKEOFF 22,
NAV_PAYLOAD_PLACE 94, DO_GRIPPER 211, DO_WINCH 42600 (the last three verified in source comments [5][6]; the others
are the standard MAVLink common.xml ids, unverified in this session). ArduPilot treats mission item 0 as home. The
4.x `MissionItem` is built with attribute assignment (`item = MissionItem(); item.seq = ...`) as in the 4.x
`mission.py` example; constructor arguments for the 4.x raw item are (unverified).

To start the uploaded mission from the companion: arm in GUIDED or Loiter, take off, then switch to AUTO
(`mission_raw.start_mission()`), or set `AUTO_OPTIONS 3` (allow arming + take off without raising throttle) and
arm in AUTO.

### 5.7 Failsafes, geofence and battery reserve [2][11]

```
FS_THR_ENABLE 1          # RC lost: 1 RTL (default), 3 Land, 4 SmartRTL or RTL ...
FS_THR_VALUE 975         # PWM below which RC failsafe triggers (default 975)
FS_GCS_ENABLE 1          # GCS heartbeat lost: 1 RTL, 3 SmartRTL or RTL, 5 Land, 6 DO_LAND_START or RTL, 7 Brake or Land
FS_GCS_TIMEOUT 5         # s (default 5)
FS_OPTIONS 16            # default: bit4 continue in pilot modes on GCS loss. Add bit1 (+2) to keep flying Auto; bit5 (+32) release gripper on failsafe
FS_EKF_ACTION 1          # EKF bad: 1 Land if mode needs position (default)
FS_CRASH_CHECK 1         # disarm on detected crash (default 1)
FS_VIBE_ENABLE 1         # vibration failsafe (default 1)
BATT_LOW_VOLT 21.0       # V (3.5 V/cell under load)
BATT_LOW_MAH 3000        # mAh remaining = 30 % reserve of 10 Ah
BATT_FS_LOW_ACT 2        # 0 warn, 1 Land, 2 RTL, 3 SmartRTL or RTL, 4 SmartRTL or Land, 5 Terminate, 6 DO_LAND_START or RTL, 7 Brake or Land
BATT_CRT_VOLT 19.8       # V (3.3 V/cell)
BATT_CRT_MAH 1500
BATT_FS_CRT_ACT 1        # Land
BATT_ARM_VOLT 23.4       # refuse to arm a part-charged pack (3.9 V/cell, our choice)
BATT_LOW_TIMER 10        # s below LOW_VOLT before triggering (default 10)
FENCE_ENABLE 1
FENCE_TYPE 7             # bitmask: 1 max alt + 2 circle + 4 polygon (8 = min alt); Copter default 7
FENCE_ALT_MAX 30         # m (default 100)
FENCE_RADIUS 300         # m (default 300, range 30-10000)
FENCE_MARGIN 2           # m (default 2)
FENCE_ACTION 1           # 0 report, 1 RTL or Land (default), 2 Land, 3 SmartRTL or RTL or Land, 4 Brake or Land
ARMING_SKIPCHK 0         # run every pre-arm check (4.7; replaces ARMING_CHECK 1)
```

The voltage, mAh and arm-voltage values are reasonable choices for this 6S 10 Ah pack, not ArduPilot defaults
(defaults are 0 = disabled for `BATT_LOW_MAH`, `BATT_CRT_*`, `BATT_FS_*_ACT`, `BATT_ARM_*`) [11].

### 5.8 RPM filter, motor direction, calibration, OSD/VTX

- **Harmonic notch** (ArduPilot's RPM filter) [13]: `INS_HNTCH_ENABLE 1`, `INS_HNTCH_MODE 3` (ESC telemetry; 1
  throttle-based, 4 in-flight FFT), `INS_HNTCH_FREQ` (Hz, default 80; set below hover motor frequency, for 15 in
  props about 40-60 Hz, unverified), `INS_HNTCH_BW` (default 40 Hz), `INS_HNTCH_REF` (0-1), `INS_HNTCH_HMNCS 3`
  (1st+2nd harmonics, default), `INS_HNTCH_OPTS` bit 0 double notch. Mode 3 needs bidirectional DShot:
  `SERVO_BLH_BDMASK` = bitmask of the motor outputs (FMU outputs need the `Pixhawk6C-bdshot` firmware; IO outputs 1-4
  with `BRD_IO_DSHOT 1`) [15], and `SERVO_BLH_POLES 14` (default 14 poles; check your motor's magnet count).
- **Motor direction**: (a) swap any two of the three motor wires; (b) in firmware: `SERVO_BLH_RVMASK` (bitmask of
  reversed DShot outputs) [13]; (c) in the ESC: BLHeli_32/AM32 configurator via ArduPilot passthrough
  (`SERVO_BLH_AUTO 1`, connect over USB) (passthrough tool support for AM32: unverified).
- **Accelerometer**: Mission Planner Setup > Mandatory Hardware > Accel Calibration > "Calibrate Accel" (6 positions:
  level, left, right, nose down, nose up, back), then "Calibrate Level". Pre-arm until done:
  `3D Accel calibration needed`; afterwards `Accels calibrated requires reboot`.
- **Compass**: Setup > Mandatory Hardware > Compass > Onboard Mag Calibration "Start", rotate the vehicle about all
  axes until done, reboot (`Compass calibrated requires reboot`). For a 690 mm frame that is awkward to rotate use
  "Large Vehicle MagCal" (needs GPS lock and the true heading, uses `MAV_CMD_FIXED_MAG_CAL_YAW`) (unverified UI name
  in 4.7 Mission Planner). Then CompassMot (current-based interference compensation, props on, tied down) with the
  power module fitted (unverified menu path: Setup > Optional Hardware > Compass/Motor Calib).
- **OSD / VTX**: this craft has no FPV video and the Pixhawk 6C has no OSD chip; video, SmartAudio and VTX tables do
  not apply. (An HD system could use MSP DisplayPort OSD, `OSD_TYPE 5`, unverified.)

### 5.9 Arming checks (pre-arm messages appear as "PreArm: ...") [12]

`ARMING_SKIPCHK` bits (skip when set): 1 Barometer, 2 Compass, 3 GPS lock, 4 INS, 5 Parameters, 6 RC Channels,
7 Board voltage, 8 Battery Level, 10 Logging Available, 11 Hardware safety switch, 12 GPS Configuration, 13 System,
14 Mission, 15 Rangefinder, 16 Camera, 17 AuxAuth, 18 VisualOdometry, 19 FFT. (Bit numbers as listed in the
`@Bitmask` of `AP_Arming.cpp`.)

Exact strings from 4.7.2 source: `3D Accel calibration needed`, `Accels inconsistent`, `Gyros inconsistent`,
`Compasses inconsistent`, `Compass offsets too high`, `Check mag field: ...`, `GPS 1: Bad fix`, `High GPS HDOP`,
`GPS glitching`, `Need Position Estimate`, `Fence enabled, need position estimate`, `EKF attitude is bad`,
`Hardware safety switch`, `RC not found`, `Check FS_THR_VALUE`, `Battery 1 below minimum arming voltage`
(form: `Battery %d %s`; unverified final wording), `Battery failsafe`, `Leaning`, `<mode> mode not armable`,
`Mode requires mission`, `Motors Emergency Stopped`, `PRX1: No Data`, `Check Object Avoidance`.

## 6. Safety tests (bench, before the first flight)

| Test | How | What it catches |
|---|---|---|
| **Smoke stopper** | A current-limiting device (a self-resetting PTC fuse, or a resistor or automotive bulb in series) placed between battery and drone for the first plug-in. If there is a short, the stopper takes the current (bulb lights / PTC trips) instead of letting hundreds of amps burn the PDB, ESCs or FC. With no fault, the drone boots normally at reduced current. Most commercial stoppers are rated to about 6S (check: a 6S 10 Ah craft needs a 6S-rated stopper, unverified product ratings). Remove it before arming: motors cannot draw flight current through it | solder bridges, reversed battery leads, pinched wires, a dead-short capacitor or ESC |
| **Power-up checks with a meter** | Before first battery: continuity between + and - must be open; 5 V BEC output measured before connecting the Pi | shorts, wrong BEC voltage |
| **Props-off motor test** | Mission Planner > Setup > Optional Hardware > Motor Test, props OFF, throttle about 5-10 %, buttons A-D (A = M1 front right, then clockwise) or "Test all in sequence" | wrong output mapping (a motor that spins at the wrong corner), wrong spin direction (M1/M2 must spin CCW, M3/M4 CW seen from above), dead ESC. Fix direction with two motor wires, `SERVO_BLH_RVMASK` or the ESC configurator |
| **Accelerometer calibration** | 6-position accel cal + level (section 5.8), on a level surface, vehicle still | `3D Accel calibration needed`; a crooked horizon that makes Loiter/Auto drift |
| **Compass calibration** | onboard mag cal away from steel and cars, or Large Vehicle MagCal; then CompassMot | toilet-bowling in Loiter, `Compasses inconsistent`, `Check mag field`, a compass mounted the wrong way (`COMPASS_ORIENT`) |
| **Radio checks** | Setup > Radio Calibration, check each channel direction; turn off the transmitter to see RC failsafe trigger (props off) | reversed channels, `RC not found`, failsafe not configured |
| **GCS failsafe test** | in SITL or props-off: unplug the SiK/LTE link and watch `FS_GCS_ENABLE` act after `FS_GCS_TIMEOUT` | failsafe disabled or wrong action |
| **Winch test** | `RCn_OPTION 45` knob or a DO_WINCH from the GCS with props off; mark the line at 1 m steps and compare with the reported length | wrong direction, `WINCH_RATE_MAX` too high for the servo, line-length drift |
| **Pre-arm checks** | Mission Planner HUD shows `PreArm: ...` (section 5.9); never skip with `ARMING_SKIPCHK` on a delivery craft | all of the above, plus GPS fix, EKF health, battery level, fence needing position |
| **Tethered hover / first hover in Stabilize/AltHold** | low and over grass, then Loiter | vibration (`FS_VIBE`), oscillation, wrong board alignment (instant flip if AHRS orientation is wrong) |

## 7. Flight characteristics (default build: 6S 10 Ah, 4014/4114 400 KV, 15x5.5, 1 kg parcel)

| Quantity | Value | Basis |
|---|---|---|
| AUW | 5177 g with parcel, 4177 g after release | original calc |
| Max static thrust | 4 x about 2620 g = 10.5 kg (15x5 on MN4014 KV400, 6S) | [23] |
| T:W | 2.0:1 with parcel, 2.5:1 empty (calc says 1.95) | [23] |
| Hover throttle (thrust fraction) | about 0.49 with parcel, 0.40 empty; `MOT_THST_HOVER` learns this (range 0.125-0.6875) | [23][13]; calc's 72 % / 64 % is too high |
| Hover current / power | about 24 A, 530 W with parcel; about 18 A empty (unverified extrapolation) | [23] (50 % point: 1250 g at 5.7 A per motor) |
| Max current | about 75 A full throttle (4 x 18.7 A); calc says 126 A | [23] |
| Hover time | about 19-20 min to 20 % reserve with parcel (calc 19.6 min) | 8 Ah / 24 A |
| Mission flight time | about 15-17 min (calc 16.6 min "freestyle") | |
| Cruise speed | 5 m/s in the original range (`WP_SPD 5`); ArduPilot default `WP_SPD` 10 m/s | [4] |
| Top speed | about 15 m/s at about 30 deg lean (unverified) | |
| Climb / descent | `WP_SPD_UP` 2.5 m/s, `WP_SPD_DN` 1.5 m/s defaults; `LAND_SPD_MS` 0.5 m/s final | [4][3] |
| Motor-out | A quad has no redundancy: losing one motor gives an uncontrolled yaw spin and a fast descent; ArduPilot cannot hold a quad on three motors. Mitigations: hexa/octo frames, or a parachute (`CHUTE_*` parameters, unverified names in 4.7) | general multicopter physics |
| Parcel on a line | a 1 kg pendulum: quick horizontal moves set it swinging; use low `LOIT_ACC_MAX_M` / `WP_ACC` during lowering and hover still | |

In the original's mission (48.4 s round trip, about 4.2 m/s cruise) the hover throttle step at release (0.716 to
0.643 in the calc) would really be about 0.49 to 0.40.

## 8. Real failure modes and what the pilot sees

| Failure | Cause | What the pilot/GCS sees |
|---|---|---|
| **Desync** | ESC loses track of rotor position: KV too high for the prop (e.g. 700 KV on 6S with 15 inch props), sudden throttle steps, bad timing settings | one motor stutters or stops, the quad yaws and drops on that corner, often a flip; ESC telemetry shows the rpm collapse |
| **Brown-out** | the Pi 5 or a big winch servo pulls the 5 V rail down; or a weak BEC | the Pi reboots (MAVSDK link and LTE lost, GCS failsafe fires); if the FC rail sags the Pixhawk reboots in the air = crash. `Board voltage` pre-arm check / `POWR` log flags |
| **Reversed motor or swapped props** | wrong wire order, wrong `SERVO_BLH_RVMASK`, CW prop on a CCW motor | flips or yaws violently the moment it lifts off; with a prop on the wrong motor it does not lift on that corner. The original's failure scenario ("Flipped on take-off") is correct |
| **Wrong board alignment** | FC arrow not pointing forward and `AHRS_ORIENTATION` not set | Stabilize corrections go the wrong way: an instant flip at take-off; the HUD horizon does not match the vehicle |
| **Missing or failed capacitor** | no low-ESR cap on long 6S leads | voltage spikes on throttle chops kill ESCs or the power module; noise causes gyro glitches and desyncs |
| **Prop wash** | descending through its own downwash (e.g. fast vertical descent to 3.5 m) | wobbles and loss of altitude control during descent; keep `WP_SPD_DN` / `LAND_SPD_MS` low |
| **GPS glitch / poor fix** | multipath between houses, a cheap antenna, interference from the LTE modem or USB 3 ports (USB 3 is a known 2.4 GHz/GNSS noise source, unverified magnitude) | `GPS glitching`, `High GPS HDOP`, EKF variance warnings; the drone wanders in Loiter; EKF failsafe (`FS_EKF_ACTION`) switches to Land |
| **Compass interference** | GPS mast too short, power leads under the puck, steel parcel contents | toilet-bowl circles in Loiter, `Compasses inconsistent`, yaw reset messages from EKF3 |
| **Loss of GCS / LTE link** | coverage gap, Pi crash, CGNAT/VPN drop | `FS_GCS_ENABLE` action after `FS_GCS_TIMEOUT` (default RTL after 5 s); in Auto it RTLs unless `FS_OPTIONS` bit 1 is set |
| **Low battery mid-mission** | cold pack, heavier parcel, headwind | `Battery 1 is low ...` message, `BATT_FS_LOW_ACT` (RTL) fires; at critical, Land wherever it is |
| **Winch line tangle / snag** | line catches a tree or fence, or line length drifts (PWM winch has no encoder) | drone pulled sideways and down; parcel not on the ground at release; operator must relax or cut the line (`WINCH` relax, RC option 44) |
| **Arm latch not locked** | folding arm not clicked home | arm folds under thrust at take-off: violent flip |
| **Geofence breach** | waypoint or wind outside the fence | `Fence breach` messages; `FENCE_ACTION` RTL or Land |
| **T:W below 1** | e.g. 4S pack with 400 KV motors (calc T:W 0.79-1.0) | motors at full throttle, the drone does not leave the ground; the Auto/Guided takeoff never completes (exact ArduPilot messages for this case unverified; the original shows nothing, so add a "cannot lift" message) |

## 9. Uncertainties

- Exact frame: no single commercial "690 mm folding quad + Pixhawk 6C + Pi 5 + winch" kit was found; the Holybro X650
  link is a near reference, and its kit contents were not checked.
- Arm tube diameter: 22 mm (drawing) vs 25 mm (text) in the original; both plausible.
- "4114 400KV" motor: thrust checked against the T-Motor MN4014 KV400 (a reseller copy of T-Motor data, not the
  primary T-Motor sheet). Weight and price of a "4114 400KV" not checked.
- 2814 700KV real thrust on 15 inch props and 5010 class weights come from a single retailer listing or reasoning.
- Raspberry Pi 5 UART device naming (`/dev/ttyAMA0` on GPIO14/15, `ttyAMA10` debug) and the 600 mA USB limit /
  `usb_max_current_enable` were not re-checked on raspberrypi.com in this session.
- The RealSense pipeline on a Pi 5 is not documented by ArduPilot; the official page uses UP Squared and says Pi 4
  is unsupported.
- MAVSDK 4.x is a few weeks old; its sync `MissionItem` takes keyword arguments (`seq=None, frame=None, ...`), and
  the async `mission_raw` import path was taken from the plugin folder; not run against SITL. The 3.x (`mavsdk-grpc`) code is checked against its
  examples and `system.py`.
- ESC firmware statements (BLHeli_32 end of development; Bluejay only on BLHeli_S hardware; AM32 passthrough support
  in ArduPilot) are from memory.
- Capacitor voltage rating, wire gauge, BEC currents and the VPN approach for LTE are engineering practice, not
  checked against a primary source.
- SiK band legality per country not checked.
- Pi 5 8 GB price ($175) from one news article; D435i price varies $330-550 between retailers.
