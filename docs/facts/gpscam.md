# Fact sheet: GPS camera drone on ArduPilot (Fig. 06, `gpscam`)

Status: verified 2026-10-24 against ArduCopter **4.7.2** (current stable) source and parameter docs. Items marked
"(unverified)" could not be checked against a primary source in the time box.

## 0. Header

**Craft class:** 450-500 mm X quadcopter ("F450 / X500 class"), GPS-navigating, ArduPilot Copter on a Pixhawk-class
autopilot, 4S LiPo, 10" two-blade props, 2-axis brushless camera gimbal, 915 MHz MAVLink telemetry.

Real products / reference builds it represents:

| Reference | What it is | Link |
|---|---|---|
| Holybro X500 V2 kit + Pixhawk 6C | 500 mm carbon-tube quad, 2216 KV920 motors, 1045 props, 20 A BLHeli_S ESCs, PM02 V3 power module, M8N GPS, SiK radio | [18] |
| DJI Flame Wheel F450 (ARF) | 450 mm glass-fibre/nylon arm frame with a PCB bottom plate (power distribution), the classic hobby GPS-quad frame | [22] |
| DJI F450 + E300 tuned propulsion (22x12 mm stator, 920 rpm/V, 50 g motor, 15 A OPTO ESC, 9.4x4.3 props, 3S recommended, 3S-4S allowed) | The stock DJI drive for the F450 | [23] |

**What it is and what it is for.** This is the drone most people picture: a mid-size quad that knows where it is. The
flight controller's EKF (EKF3) fuses gyro, accelerometer, barometer, magnetometer and GPS into one position and
velocity estimate, so the craft can hold a point in wind (Loiter), hold only height (AltHold), fly home on its own
(RTL) and fly a pre-planned waypoint mission (AUTO) while a gimbal keeps a camera level. It is built for long, smooth,
efficient flights (low-KV motors, big slow props, a big 4S pack), not for punch: aerial photography, roof and tower
inspection, mapping, and as the standard ArduPilot/PX4 learning and research platform.

## 1. Sources

Firmware, parameter docs and source (primary):
1. ArduPilot firmware server, Copter stable for Pixhawk6C: https://firmware.ardupilot.org/Copter/stable/Pixhawk6C/ (`firmware-version.txt` = `4.7.2-FIRMWARE_VERSION_TYPE_OFFICIAL`; `git-version.txt` = `APMVERSION: ArduCopter V4.7.2`, commit `fb77356789`, 11 Oct 2026). Copter `beta` points at the same commit.
2. ArduCopter release notes at that commit: https://github.com/ArduPilot/ardupilot/blob/fb773567896014da007bca58358704d4a0d8516f/ArduCopter/ReleaseNotes.txt ("Release 4.7.2 11-October-2026"; 4.7.0 released 21 July 2026; rename list under 4.7.0-beta1, section 5).
3. Complete parameter list, Copter stable V4.7.2: https://ardupilot.org/copter/docs/parameters-Copter-stable-V4.7.2.html
4. `ArduCopter/mode_rtl.cpp` (RTL params and the old-name conversion table): https://github.com/ArduPilot/ardupilot/blob/fb773567896014da007bca58358704d4a0d8516f/ArduCopter/mode_rtl.cpp
5. `libraries/AC_WPNav/AC_WPNav.cpp` (WP_ params, defaults, WPNAV_ conversion): same commit, https://github.com/ArduPilot/ardupilot/blob/fb773567896014da007bca58358704d4a0d8516f/libraries/AC_WPNav/AC_WPNav.cpp
6. `libraries/AC_WPNav/AC_Loiter.cpp` (LOIT_ params, defaults, conversion): same commit.
7. `ArduCopter/config.h` (RTL, FS_THR, LAND, PILOT defaults): same commit.
8. `ArduCopter/Parameters.cpp` (FS_THR_ENABLE default, PILOT_ conversions): same commit.
9. `libraries/AP_Motors/AP_MotorsMatrix.cpp` (QUAD X motor angles, spin, test order): same commit.
10. `libraries/AP_Motors/AP_MotorsMulticopter.h` (MOT_THST_HOVER, MOT_SPIN_* defaults): same commit.
11. `libraries/AC_Fence/AC_Fence.cpp` (fence defaults): same commit.
12. `libraries/AP_BattMonitor/AP_BattMonitor_Params.cpp` (battery failsafe defaults): same commit.
13. `ArduCopter/AP_Arming_Copter.cpp` and `libraries/AP_Arming/AP_Arming.cpp` (pre-arm messages): same commit.
14. `libraries/AC_AttitudeControl/AC_AttitudeControl.cpp` (ATC_ANGLE_MAX default 30 deg): same commit.
15. ArduPilot hardware page, Holybro Pixhawk 6C: https://ardupilot.org/copter/docs/common-holybro-pixhawk6C.html
16. PX4 docs, Holybro Pixhawk 6C: https://docs.px4.io/main/en/flight_controller/pixhawk6c.html
17. Holybro Pixhawk 6C overview: https://docs.holybro.com/autopilot/pixhawk-6c/overview
19. ArduPilot "Connect ESCs and Motors": https://ardupilot.org/copter/docs/connect-escs-and-motors.html
20. ArduPilot "Brushless PWM Gimbal": https://ardupilot.org/copter/docs/common-brushless-pwm-gimbal.html
24. MAVLink file formats (mission plain-text): https://mavlink.io/en/file_formats/
25. MAVLink `common.xml` (MAV_CMD and MAV_FRAME ids): https://github.com/mavlink/mavlink/blob/master/message_definitions/v1.0/common.xml
26. `ArduCopter/mode_auto.cpp` (`allows_arming`), same ArduPilot commit as [4].
27. ArduPilot Copter mission command list: https://ardupilot.org/copter/docs/mission-command-list.html
28. ArduPilot TBS Crossfire / ELRS: https://ardupilot.org/copter/docs/common-tbs-rc.html
29. ArduPilot RC systems: https://ardupilot.org/copter/docs/common-rc-systems.html
30. ArduPilot accelerometer calibration: https://ardupilot.org/copter/docs/common-accelerometer-calibration.html
31. ArduPilot compass calibration: https://ardupilot.org/copter/docs/common-compass-calibration-in-mission-planner.html
32. Holybro standard M10/M9N/M8N GPS overview: https://docs.holybro.com/gps-and-rtk-system/m8n-m9n-m10-gps/standard-m10-m9n-m8n-gps/overview.md
33. Holybro power module comparison (PM02 V3): https://docs.holybro.com/power-module-and-pdb/power-module-comparison.md
34. `libraries/AP_Motors/AP_MotorsMatrix.cpp` `check_for_failed_motor()` (motor-lost logic, `number_motors >= 6`), same commit as [9].
35. ArduPilot servo gimbal page: https://ardupilot.org/copter/docs/common-camera-gimbal.html

Manufacturer spec pages and test data:
18. Holybro X500 V2 kit docs: https://docs.holybro.com/drone-development-kit/px4-development-kit-x500v2
21. T-Motor AIR Gear 450II (AIR2216II KV920 + T1045) bench table at 16 V, sold by LIG Power: https://www.ligpower.com/product/air-gear-450II-combo-set-no-esc.html
22. DJI Flame Wheel F450 ARF kit spec (retailer copy of DJI's spec): https://www.getfpv.com/dji-flamewheel-f450-arf-kit.html
23. DJI newsroom, "DJI released the tuned propulsion system E300 and E600" (2013-11-28), spec table: https://www.dji.com/newsroom/news/dji-released-the-tuned-propulsion-system-e300-and-e600

Research docs (what the original shows): `docs/research/drone-lab-b.md` Fig 06 section (lines 484-830),
`docs/research/drone-lab-b-calc-matrix.md` (Fig 06 table), `docs/research/current-simlab-audit.md` DR-08.

## 2. Geometry (craft frame: x forward, y left, z up, origin = frame centre on top of the bottom plate, mm)

### 2.1 Frame layout

| Item | F450 class (what Fig. 06 draws) | Holybro X500 V2 (reference) |
|---|---|---|
| Layout | X quad, 4 arms at 45 deg to the nose | X quad, 4 arms at 45 deg |
| Wheelbase (motor-to-motor diagonal) | **450 mm** [22] | **500 mm** [18] |
| Motor radius from centre | 225 mm | 250 mm |
| Motor (x, y) magnitude | 225 / sqrt2 = **159.1 mm** | **176.8 mm** |
| Adjacent motor spacing | 318.2 mm | 353.6 mm |
| Prop clearance between neighbours, 10" (254 mm) props | 318.2 - 254 = 64 mm | 99.6 mm |
| Arms | moulded glass-fibre-reinforced nylon arms bolted between two plates; the bottom plate is a PCB power distribution board (unverified for exact arm section) | 16 mm carbon-fibre tubes [18] |
| Plates | two centre plates; bottom = PDB, top = electronics deck (F450 plate size about 140 mm, unverified) | 144 x 144 mm, 2 mm thick; 28 mm between top and bottom plate [18] |
| FC mounting | Pixhawk is not a 30.5/20 mm stack board: it sits on the top plate on its own vibration-damping mount or foam tape | same |
| Landing gear | add-on legs; original draws the body 120 mm up | 215 mm landing gear height, 16 mm and 10 mm carbon tubes [18] |
| Frame mass | **282 g** (frame only) [22] | **610 g** (listed under mechanical spec; the page does not say whether gear is included) [18] |
| Motor mount pattern | 16 x 19 mm class for 22xx motors (unverified for F450) | 16 x 16 mm [18] |
| Takeoff weight range | 800-1600 g (DJI spec) [22] | max payload about 1 kg with 4S 5000 at 70% throttle [18] |

What the original draws (keep it): motors at (+-159.1, +-159.1), 120 x 120 mm carbon hub plates, top plate on four
30 mm standoffs at (+-52, 0) and (0, +-52), arms from 45 to 238 mm, 22 mm wide, 24 mm tall, front arms in the
palette colour and rear arms white (DJI F450 kits ship coloured and white arm pairs for exactly this reason, unverified colours),
ESCs on the arms at 104-140 mm, skids at z = -120. These are consistent with a 450 mm frame.

### 2.2 Motor positions, numbering and spin (ArduCopter FRAME_CLASS 1 Quad, FRAME_TYPE 1 X)

From `AP_MotorsMatrix.cpp` [9]: each motor is `{angle from nose, positive clockwise/right; yaw factor; test order}`,
with `YAW_FACTOR_CCW = +1`, `YAW_FACTOR_CW = -1`.

| Motor (output SERVOn, function 33-36) | Position | Angle | (x, y) at 450 mm | (x, y) at 500 mm | Spin seen from above | Prop | Motor-test letter (order) |
|---|---|---|---|---|---|---|---|
| M1 (SERVO1, Motor1 = 33) | front right | +45 | (+159.1, -159.1) | (+176.8, -176.8) | **CCW** | CCW ("normal"/puller) | A (1st) |
| M2 (SERVO2, Motor2 = 34) | rear left | -135 | (-159.1, +159.1) | (-176.8, +176.8) | **CCW** | CCW | C (3rd) |
| M3 (SERVO3, Motor3 = 35) | front left | -45 | (+159.1, +159.1) | (+176.8, +176.8) | **CW** | CW ("pusher"/reversed) | D (4th) |
| M4 (SERVO4, Motor4 = 36) | rear right | +135 | (-159.1, -159.1) | (-176.8, -176.8) | **CW** | CW | B (2nd) |

- Mission Planner's motor test starts with the motor just right of the nose (front right, M1 = A) and goes clockwise
  round the frame: A front-right, B rear-right, C rear-left, D front-left [19]. The test letter is NOT the motor
  number: B is M4, C is M2, D is M3.
- This spin pattern is "props in" (the front props' leading blades sweep in towards the nose line). It is the same
  direction pattern as Betaflight's default; only the numbering differs.
- Alternative direction: ArduPilot's plain X has no reversed variant. The reversed ("props out") pattern exists only
  with Betaflight numbering, `FRAME_TYPE 18` BetaFlightXReversed [3][9]: M1 rear-right CCW, M2 front-right CW,
  M3 rear-left CW, M4 front-left CCW. `FRAME_TYPE 12` BetaFlightX keeps props-in with Betaflight numbering
  (M1 rear-right CW, M2 front-right CCW, M3 rear-left CCW, M4 front-left CW) [9]. Other values: 0 Plus, 2 V, 3 H,
  13 DJIX, 14 ClockwiseX [3].
- ArduPilot's docs call CW props "pushers" and CCW props "pullers"; the thicker (rounded) edge is the leading edge and
  moves in the direction of rotation [19].
- The original's motor-order text is correct.

### 2.3 Component positions in the craft frame (from the original's drawing, mm)

These are the original's drawn positions (research doc), checked for plausibility against a 450 mm build. Keep them.

| Part | x | y | z | Size / note |
|---|---|---|---|---|
| Bottom plate (top face) | 0 | 0 | 0 | 120 x 120 mm hub (real F450 plate about 140 mm, unverified) |
| Top plate | 0 | 0 | +30 | on four 30 mm standoffs at (+-52, 0) and (0, +-52) |
| Arms | 45 to 238 mm from centre along the diagonals | | | 22 mm wide, 24 mm tall |
| Motors | +-159.1 | +-159.1 | on the arm tips | 22xx bell about 28 mm dia (unverified) |
| ESCs | 104-140 mm along each arm | | | 36 x 16 x 7 mm |
| Pixhawk 6C | 0 | 0 | on top plate | drawn 60 x 44 x 14 mm; real 84.8 x 44 x 12.4 mm [16] (draw it longer if accuracy matters) |
| GPS mast + puck | -44 | 0 | mast 86 mm tall above the top plate | puck r 28 mm drawn; real M10 phi 50-51 mm (r 25-25.5) [32] |
| Gimbal + camera | +72 | 0 | under the bottom plate | camera pitched 20 deg down |
| Battery | 0 | 0 | under the bottom plate, between the legs | 128 x 48 x 40 mm drawn for 5000 mAh; 104 mm long otherwise |
| Landing legs | from (+-40, +-38, -2) to (+-62, +-64, -116) | | | skids 176 mm long at z = -120 |

### 2.4 Props, camera, battery

| Item | Value |
|---|---|
| Props | 10 x 4.5 in (1045), 2-blade, 254 mm diameter, 13 g each for T-Motor T1045 [21]; X500 V2 ships 1045 [18]; DJI spec allows 10x4.5 or 8x4.5 on F450 [22]; DJI E300 uses 9.4x4.3 [23] |
| Prop disc height | prop plane about 30-40 mm above the arm top (22xx motor bell height, unverified exact) |
| Camera | on a 2-axis (roll + pitch) brushless gimbal hung under the front of the body; original puts it at x = +72 mm, camera pitched 20 deg down. Pitch range on typical setups -90 (straight down) to about +25 deg [20]. Yaw follows the airframe (2-axis has no yaw motor). |
| Battery | 4S 5000 mAh LiPo slung under the body between the legs on straps, centred on the CG (x = 0); typical 4S 5000 pack about 140 x 45 x 35-45 mm (unverified, varies by brand) |
| GPS + compass | puck on a mast behind the FC (original: mast 86 mm tall at x = -44 mm). Arrow on the puck points to the nose. |
| FC | Pixhawk 6C, 84.8 x 44 x 12.4 mm, 59.3 g [16]; arrow forward on the top plate centre |

## 3. The original's catalogue, sanity-checked

The calculator stays identical; this section only flags descriptions that are untrue or implausible and gives the
real figure. The original model: `thrust = 5.4 * pf * (KV*V/1000)^2` g/motor, `hoverA = AUW / (9 g/W * eff) / V`.

### 3.1 Batteries

| Key | Original (mAh / g / $) | Real-world check | Verdict |
|---|---|---|---|
| `4s5000` | 5000 / 500 g / $55 | 4S 5000 mAh = 74 Wh (14.8 V x 5 Ah). Typical 4S 5000 mAh 25-50C packs weigh about 480-570 g and cost $45-90 (unverified ranges). Holybro recommends 4S 2000-5000 mAh for X500 V2 [18]. | Plausible (light end) |
| `4s3300` | 3300 / 340 g / $38 | Typical 4S 3300 packs about 330-380 g (unverified) | Plausible |
| `3s5000` | 5000 / 410 g / $40 | Typical 3S 5000 packs about 380-420 g (unverified) | Plausible |

### 3.2 Motors

| Key | Original (KV / g / $ / cells) | Real-world check | Verdict |
|---|---|---|---|
| `2212-920` | 920 / 58 g / $18 / 4S | DJI E300: 22x12 mm stator, 920 rpm/V, 50 g, 15 A OPTO ESC (PWM 30-450 Hz, 11.1-14.8 V, 3S-4S), 9.4x4.3 props, **recommended battery 3S**, 300 g/axis recommended load, **600 g/axis maximum thrust** [23]. Generic 2212 920 KV outrunners are about 50-60 g. | Mass and KV fine. Note DJI recommends 3S for its 2212/920 drive while the catalogue says 4S (`forCells 4`) and calls every 3S build "weak": on a 1.5 kg camera quad 4S is the realistic choice, so the catalogue is defensible but not DJI's spec. Calculator thrust (1001 g/motor at 4S with 1045) is optimistic for a 2212: about 1.7 x DJI's max figure (different prop, but still high). Do not change; note in lesson text that real 2212/920 drives deliver about 600-900 g (upper end unverified). |
| `2216-880` | 880 / 72 g / $24 / 4S | Closest real data: T-Motor AIR2216II KV920 + T1045 at 16 V: 1332 g at 100% (16.4 A, 260 W), 447 g at 50% (3.6 A), 64 g with cable [21]. Holybro X500 V2 uses "2216 KV920" [18]. | Mass plausible (64-72 g). Calculator gives 916 g at 14.8 V, which UNDERstates a real 2216 (about 1100-1200 g at 14.8 V by V^2 scaling of [21], unverified scaling). The model only uses KV, so a bigger motor never helps. |
| `2212-1400` | 1400 / 56 g / $16 / 3S | 1400 KV 2212s are 3S motors for 8x4 / 8x4.5 props (unverified, common hobby spec). On 3S with 10x4.5 they draw well over the motor's rating. | Description fine for 3S + 8"; implausible on 10-11" props. The calculator flags only 4S combos and `3s5000/2212-1400/1147`; `3s5000/2212-1400/1045` passes as "Parts match" although a 1400 KV 2212 on 3S with 10x4.5 props would overheat (unverified exact current). Flag only. |

### 3.3 Props

| Key | Original (pf / eff / g / $) | Check | Verdict |
|---|---|---|---|
| `1045` | 1 / 1 / 13 g / $8 | T-Motor T1045 13 g [21] | Correct |
| `1147` | 1.18 / 1.08 / 16 g / $10 | 11x4.7 2-blade about 15-18 g (unverified) | Plausible; 11" fits a 450 frame (279 mm disc, 39 mm clearance) but is a tight fit |
| `9450` | 0.82 / 0.94 / 11 g / $7 | DJI's stock F450 prop is 9.4 x 4.3 (E300) [23] or 9.4 x 5.0 ("9450", DJI Phantom 2 era) (unverified mass) | Plausible |

Note: the figure always draws 10" props, whatever is chosen (research doc).

### 3.4 Fixed parts

| Id | Original (g / $) | Real-world check | Verdict |
|---|---|---|---|
| `FRAME` F450 plates + 4 arms | 270 / 35 | DJI F450 frame 282 g [22] | Correct within 5% |
| `GEAR` | 60 / 12 | Add-on F450 legs 40-100 g (unverified) | Plausible |
| `ESC` 4x 30 A | 112 / 48 | 28 g each is typical of 30 A hobby ESCs (unverified). Real reference kits use smaller ESCs: X500 V2 20 A BLHeli_S [18], DJI E300 15 A [23]. Hover is about 3 A per motor and full throttle about 14-16 A per 2216 [21]. | 30 A is generous, fine |
| `XT60` power module + XT60 + cap | 22 / 18 | Holybro PM02 V3 (X500 V2's module [18]): 2-12S input, 60 A continuous / 100 A burst, 120 A max sensing, **5.2 V / 3 A** to the FC, 20 g, 25 x 25 x 10 mm [33]. Pixhawk 6C POWER1/2 accept 4.9-5.5 V, max 6 V [16]. | Mass plausible (20 g module + XT60 + cap). The text's "clean 5.3 V" should be **5.2 V** for a PM02 V3; flag |
| `FC` Pixhawk 6C | 40 / 165 | **59.3 g** [16] (PX4 docs; case variant not stated). Price about $165-$200 (unverified). | Mass understated by about 19 g; flag |
| `GPS` M10 GPS + compass on a mast | 52 / 45 | Holybro M10 GPS: u-blox M10 + IST8310 compass, tri-colour LED, JST-GH 10-pin, 4.7-5.2 V, up to 25 Hz (single GNSS) / 10 Hz (4 GNSS); V1 32 g, phi 50 x 14.4 mm, with buzzer and safety switch; V2 36.8 g, phi 51 x 18.5 mm, buzzer and safety switch removed [32]. A folding mast adds about 15-20 g (unverified). | Plausible (32-37 g + mast). Puck radius 28 mm in the figure vs real 25-25.5 mm: fine |
| `TELEM` 915 MHz radio | 24 / 40 | SiK V3 radio (433/915 MHz) used by X500 V2 [18]; mass about 20-30 g (unverified) | Plausible |
| `RX` ELRS | 4 / 18 | ELRS 2.4 GHz receivers are 1-4 g with antenna | Correct |
| `GIMBAL` 2-axis + camera | 190 / 120 | A 2-axis brushless action-camera gimbal is about 150-200 g on its own; with an action camera (about 120-150 g) the pair is about 280-350 g (unverified ranges) | Understated, flag; real gimbal + camera is about 300 g |
| `TOP` | 30 / 8 | plausible | OK |
| `STRAP` | 12 / 5 | plausible | OK |

Default build totals: original AUW 1600 g, T:W 2.5, hover 63%, max 80 A, hover 20.0 min. Real-world check: X500 V2
hovers about 18 min on 5000 mAh with no payload [18]; at 400 g/motor a 2216 KV920 + 1045 draws about 3.2 A at
16 V [21] (about 12.5 A total, close to the original's 12.0 A). Real full-throttle current for 4 x 2216 KV920 + 1045
is about 4 x 16.4 = 66 A at 16 V [21], below the original's 80 A estimate. Real hover throttle for this class is
typically 0.3-0.5 (ArduPilot's default `MOT_THST_HOVER` is 0.35 [10] and it learns the real value); the original's
63% comes from `sqrt(AUW/(4*thrust))` and is high. Flag only.

## 4. Electronics and wiring

### 4.1 Flight controller: Holybro Pixhawk 6C [15][16][17]

| Item | Value |
|---|---|
| FMU MCU | STM32H743, Cortex-M7, 480 MHz, 2 MB flash, 1 MB RAM [16][17] |
| IO coprocessor | STM32F103, Cortex-M3, 72 MHz [16] |
| IMUs | ICM-42688-P and BMI055, temperature-controlled by heating resistors, vibration-isolated [16][17] |
| Barometer | MS5611 [16] |
| Internal compass | IST8310 [16] (ArduPilot docs: usually used with an external I2C compass) [15] |
| Size / mass | 84.8 x 44 x 12.4 mm, 59.3 g [16] |
| Power | POWER1 and POWER2 (6-pin, analog V/I sense), 4.9-5.5 V normal, 6 V max; USB 4.75-5.25 V [16] |
| Servo rail | 0-36 V rated [16]; the rail does not power the board and the board does not power the rail (unverified wording, standard Pixhawk design) |
| PWM outputs | 16: 8 IO ("I/O PWM OUT", SERVO1-8, Mission Planner "MAIN") + 8 FMU ("FMU PWM OUT", SERVO9-16, "AUX") [15][16] |
| DShot | All FMU outputs; IO outputs only with `BRD_IO_DSHOT 1` (loads DShot firmware on the IO chip). FMU groups: 1-4, 5-6, 7-8 must share a protocol. Bi-directional DShot on IO 1-4 with the DShot IO firmware, or on FMU 1-8 with the `Pixhawk6C-bdshot` firmware [15] |
| Default battery monitor | `BATT_MONITOR 4`, `BATT_VOLT_PIN 8`, `BATT_CURR_PIN 4`, `BATT_VOLT_MULT 18.182`, `BATT_AMP_PERVLT 36.364` (matches Holybro PM02) [15] |
| Ports | TELEM1, TELEM2, TELEM3, GPS1, GPS2, 2 x CAN, I2C, RCIN, SBUS out, USB, debug; TELEM1 has its own 1.5 A current limit [16] |

UART map for ArduPilot on Pixhawk 6C [15]:

| SERIALn | MCU UART | Port | Use on this craft |
|---|---|---|---|
| SERIAL0 | USB | USB | Mission Planner / QGC over USB |
| SERIAL1 | UART7 (RTS/CTS) | TELEM1 | 915 MHz SiK radio, MAVLink2 |
| SERIAL2 | UART5 | TELEM2 | ELRS receiver (CRSF) |
| SERIAL3 | USART1 | GPS1 | M10 GPS (+ I2C compass and LED on the same 10-pin JST-GH; buzzer and safety switch on M10 V1 only [32]) |
| SERIAL4 | UART8 | GPS2 | spare / second GPS |
| SERIAL5 | USART2 (RTS/CTS) | TELEM3 | spare (ArduPilot's own example puts CRSF here) [15] |
| SERIAL6 | USART3 | USER/debug | spare |

**RCIN cannot take ELRS/CRSF.** ArduPilot's 6C page: the RCIN pin takes all protocols except CRSF/ELRS and SRXL2,
which need a full UART; use `SERIALn_PROTOCOL 23` (RCIN) and `SERIALn_OPTIONS 0` for CRSF [15]. The original's
wiring label "ELRS, RCIN" is therefore wrong for an ELRS receiver; an SBUS/PPM receiver would use RCIN.

### 4.2 ESCs and motors

- Reference kits: X500 V2 4 x BLHeli_S 20 A (XT30 plugs) [18]; DJI E300 15 A opto ESCs [23]. The original's
  "4 x 30 A" separate arm ESCs are fine. BLHeli_S ESCs can be reflashed to Bluejay (unverified for this exact ESC).
- Protocol: PWM (`MOT_PWM_TYPE 0`, needs ESC calibration) or DShot (`MOT_PWM_TYPE 4/5/6/7` = DShot150/300/600/1200)
  [3]. With motors on MAIN 1-4 of a 6C, DShot needs `BRD_IO_DSHOT 1` [15].
- Motor outputs: `SERVO1_FUNCTION 33` (Motor1) .. `SERVO4_FUNCTION 36` (Motor4) [3].
- Motor reversal: swap any two of the three motor wires [19]; or in the ESC (BLHeli/Bluejay configurator via
  `SERVO_BLH_AUTO 1` pass-through); or with DShot, `SERVO_BLH_RVMASK` (bitmask of reversed channels, reboot) [3].
  The original's lesson "reverse a motor in the ESC, not with the iron" is reasonable.

### 4.3 Receiver, telemetry, GPS, gimbal, video

| Function | Hardware | Connection | Key params |
|---|---|---|---|
| RC | ExpressLRS 2.4 GHz receiver (CRSF protocol), needs RX and TX wired to a full UART [29] | TELEM2 (SERIAL2) | `SERIAL2_PROTOCOL 23` (RCIN), `RSSI_TYPE 3` (ReceiverProtocol), `RC_OPTIONS` bit 13 (+8192, "Use 420kbaud for ELRS protocol"); baud is set automatically [3][28][29]. Alternative ELRS-MAVLink mode: `SERIALn_PROTOCOL 2`, `SERIALn_BAUD 115`, `RSSI_TYPE 5` [28] |
| Telemetry | SiK radio 915 MHz (US) / 433 MHz (EU) [18] | TELEM1 (SERIAL1) | `SERIAL1_PROTOCOL 2` (MAVLink2), `SERIAL1_BAUD 57` (57600, SiK default) [3] |
| GPS + compass | u-blox M10 GPS with compass (Holybro M10) | GPS1 (SERIAL3) + I2C on the same connector | `SERIAL3_PROTOCOL 5` (GPS), `GPS1_TYPE 1` (AUTO) or 2 (uBlox) [3] |
| Gimbal | 2-axis brushless gimbal with its own controller and IMU | PWM from FMU outputs (SERVO9 roll, SERVO10 pitch) | `MNT1_TYPE 7` (BrushlessPWM), see section 5.6 [20] |
| Camera video | HD camera on the gimbal; ArduPilot does not need the video. A digital link that wants an OSD uses MSP DisplayPort | spare UART | `OSD_TYPE 5` (MSP_DISPLAYPORT) + `SERIALn_PROTOCOL 42` (DisplayPort) [3] |
| Analog VTX control (if fitted) | SmartAudio or Tramp | spare UART | `SERIALn_PROTOCOL 37` (SmartAudio) or `44` (IRC Tramp); `VTX_ENABLE 1`, `VTX_BAND`, `VTX_CHANNEL`, `VTX_POWER` (mW), `VTX_MAX_POWER` [3] |

Pixhawk 6C has no onboard analog OSD chip (no MAX7456) (unverified, consistent with [16] feature list).

### 4.4 Power

- Battery to power module (Holybro PM02 V3 on X500 V2 [18]) via XT60; power module 6-pin cable to POWER1; module
  output to the PDB / ESCs. Analog voltage + current sense, `BATT_MONITOR 4` [15].
- Low-ESR capacitor: on separate-ESC builds a capacitor across the battery leads is optional but cheap insurance;
  typical choice 35 V or higher, 470-1000 uF for 4S (unverified; 4S max 16.8 V, so a 25 V cap is the bare minimum,
  35 V gives margin). Stripe = minus. The original's "cap stripe to plus" mistake (reverse electrolytic: it heats,
  vents and can pop) is a valid lesson.
- Servo rail: the gimbal and any servos need their own 5 V BEC on the servo rail; the Pixhawk does not power the rail
  (unverified wording, standard Pixhawk design).
- LEDs and buzzer: on the GPS puck and its 10-pin connector: tri-colour LED on M10; buzzer and safety switch on M10 V1,
  removed on M10 V2 [32] (LED driver IC not stated). Without a safety switch, set `BRD_SAFETY_DEFLT 0` or skip that check
  (unverified recommendation).

### 4.5 Wire colours

| Wire | Colour |
|---|---|
| Battery / XT60 | red +, black - |
| Motor phases | 3 wires, often black/red/yellow or all one colour; order does not matter except that swapping two reverses the motor |
| Servo/PWM leads | brown/black = GND, red = +5 V, orange/yellow/white = signal |
| JST-GH Pixhawk cables | pin 1 is red = VCC on Holybro cables (unverified) |

## 5. Firmware: ArduPilot Copter 4.7.2

Current stable on 24 Oct 2026: **ArduCopter V4.7.2**, released 11 Oct 2026 [1][2]. 4.7.0 (21 Jul 2026) renamed and
re-scaled many navigation parameters to SI units (metres, m/s, degrees) [2]. Old names are converted automatically
when you upgrade [4][5][6][8], but snippets written for 4.6 and earlier (like the original's) no longer exist under
those names in 4.7.

### 5.1 Renamed parameters you will meet (4.6 name -> 4.7 name)

| Old (<= 4.6), unit | New (4.7), unit | Default (4.7) | Source |
|---|---|---|---|
| `RTL_ALT`, cm | `RTL_ALT_M`, m (0.3-3000) | 15 m | [3][4][7] |
| `RTL_SPEED`, cm/s | `RTL_SPEED_MS`, m/s (0 = use WP_SPD) | 0 | [3][4] |
| `RTL_ALT_FINAL`, cm | `RTL_ALT_FINAL_M`, m (0 = land) | 0 | [4][7] |
| `RTL_CLIMB_MIN`, cm | `RTL_CLIMB_MIN_M`, m | 0 | [4][7] |
| `WPNAV_SPEED`, cm/s | `WP_SPD`, m/s | 10.0 m/s | [3][5] |
| `WPNAV_RADIUS`, cm | `WP_RADIUS_M`, m | 2.0 m | [5] |
| `WPNAV_SPEED_UP` / `_DN`, cm/s | `WP_SPD_UP` / `WP_SPD_DN`, m/s | 2.5 / 1.5 m/s | [5] |
| `WPNAV_ACCEL`, `WPNAV_ACCEL_Z`, `WPNAV_ACCEL_C` | `WP_ACC`, `WP_ACC_Z`, `WP_ACC_CNR` (m/s/s) | WP_ACC_Z 1.0 | [5] |
| `LOIT_SPEED`, cm/s | `LOIT_SPEED_MS`, m/s | 12.5 m/s | [6] |
| `LOIT_BRK_ACCEL`, cm/s/s | `LOIT_BRK_ACC_M`, m/s/s | 2.5 m/s/s | [6] |
| `LOIT_ACC_MAX`, `LOIT_BRK_JERK` | `LOIT_ACC_MAX_M` (5.0), `LOIT_BRK_JRK_M` (5.0) | | [6] |
| `LOIT_BRK_DELAY`, s | unchanged | 1.0 s | [6] |
| `PILOT_SPEED_UP` / `_DN`, cm/s | `PILOT_SPD_UP` / `PILOT_SPD_DN`, m/s | 2.5 m/s up | [7][8] |
| `PILOT_ACCEL_Z`, `PILOT_TKOFF_ALT` | `PILOT_ACC_Z`, `PILOT_TKO_ALT_M` | | [8] |
| `ANGLE_MAX`, centi-degrees | `ATC_ANGLE_MAX`, degrees | 30 deg | [2][14] |
| `LAND_SPEED`, cm/s | `LAND_SPD_MS`, m/s | 0.5 m/s | [7] |
| `ARMING_CHECK` (bitmask of checks to RUN, 1 = all) | `ARMING_SKIPCHK` (bitmask of checks to SKIP, 0 = none skipped) | 0 | [2][3] |
| `GPS_TYPE` (renamed in 4.6: "GPS_xxx params renamed to GPS1_xxx, GPS_xxx2 renamed to GPS2_xxx") | `GPS1_TYPE`; `GPS_TYPE2` -> `GPS2_TYPE` | `HAL_GPS1_TYPE_DEFAULT` (1 AUTO on standard boards; unverified for 6C) | [2] (4.6.0-beta1 notes), AP_GPS.cpp |
| `FS_BATT_ENABLE` (pre-3.6) | `BATT_FS_LOW_ACT` | 0 | research doc; [3] |
| `MNT_` (single mount, pre-4.3) | `MNT1_` | | [3] (unverified version of the rename) |

### 5.2 Initial setup (Mission Planner: Config > Full Parameter List, or MAVProxy `param set`)

```
# frame
FRAME_CLASS      1     # Quad              [3]
FRAME_TYPE       1     # X                 [3]
# motors on MAIN 1-4 (defaults for a quad, shown for clarity)
SERVO1_FUNCTION  33    # Motor1 (front right, CCW)
SERVO2_FUNCTION  34    # Motor2 (rear left, CCW)
SERVO3_FUNCTION  35    # Motor3 (front left, CW)
SERVO4_FUNCTION  36    # Motor4 (rear right, CW)
MOT_PWM_TYPE     6     # DShot600 (0 = PWM, needs ESC calibration)   [3]
BRD_IO_DSHOT     1     # Pixhawk 6C: DShot on the IO (MAIN) outputs   [15]
# power module PM02 on POWER1 (6C defaults)
BATT_MONITOR     4     # analog voltage and current                   [3][15]
BATT_CAPACITY    5000  # mAh
MOT_BAT_VOLT_MAX 16.8  # 4.2 V x 4 cells (thrust compensation)          [3]
MOT_BAT_VOLT_MIN 13.2  # 3.3 V x 4 cells (param doc: "Recommend 3.3 * cell count") [3]
# radio and telemetry
SERIAL1_PROTOCOL 2     # TELEM1: MAVLink2 for the SiK radio
SERIAL1_BAUD     57    # 57600
SERIAL2_PROTOCOL 23    # TELEM2: RCIN, ELRS/CRSF receiver              [15][28]
RSSI_TYPE        3     # RSSI from the receiver protocol                [28]
RC_OPTIONS       8192  # bit 13: 420 kbaud for ELRS (add to any bits already set) [3][28]
# GPS
SERIAL3_PROTOCOL 5     # GPS1 port
GPS1_TYPE        1     # AUTO (u-blox M10 detected); 2 = uBlox
# board orientation (FC arrow forward = 0)
AHRS_ORIENTATION 0     # 4 = Yaw180 if the arrow points backwards (reboot, then re-level)
COMPASS_ORIENT   0     # external compass arrow forward
```

Then: accelerometer calibration, compass calibration, radio calibration, flight modes, failsafes (section 6).
MAVProxy: `param set FRAME_CLASS 1`, then reboot with `reboot`. `write` is not a MAVProxy command (DR-08):
`param set` writes immediately; Mission Planner uses "Write Params".

`AHRS_ORIENTATION` values [3]: 0 None, 1 Yaw45, 2 Yaw90, 3 Yaw135, 4 Yaw180, 5 Yaw225, 6 Yaw270, 7 Yaw315,
8 Roll180, ... It takes effect on next boot and needs a re-level [3].

### 5.3 Flight modes (FLTMODE1-6 on FLTMODE_CH, default channel 5)

`FLTMODEn` values [3]: 0 Stabilize, 1 Acro, 2 AltHold, 3 Auto, 4 Guided, 5 Loiter, 6 RTL, 7 Circle, 9 Land,
11 Drift, 13 Sport, 14 Flip, 15 AutoTune, 16 PosHold, 17 Brake, 18 Throw, 21 Smart_RTL, 27 Auto RTL, 28 Turtle.
Default for every FLTMODEn is 0 Stabilize [7]. PWM bands on FLTMODE_CH [3]: FLTMODE1 <= 1230, FLTMODE2 1231-1360,
FLTMODE3 1361-1490, FLTMODE4 1491-1620, FLTMODE5 1621-1749, FLTMODE6 >= 1750.

```
FLTMODE_CH  5
FLTMODE1    5     # Loiter   (GPS position + altitude hold)
FLTMODE2    2     # AltHold  (baro altitude hold, no position hold)
FLTMODE3    3     # Auto     (fly the mission)
FLTMODE4    0     # Stabilize (manual fallback)
FLTMODE5    9     # Land
FLTMODE6    6     # RTL
```

The original's numbers (5 Loiter, 2 AltHold, 6 RTL) are correct.

**Loiter** (4.7 names) [6]:
```
LOIT_SPEED_MS   5.0    # m/s at full stick (was LOIT_SPEED 500 cm/s); default 12.5
LOIT_BRK_ACC_M  2.5    # m/s/s braking when sticks centre (was LOIT_BRK_ACCEL 250); default 2.5
LOIT_BRK_DELAY  1.0    # s before braking starts; default 1.0
```
**AltHold** [3][7][14]:
```
PILOT_SPD_UP    2.5    # m/s climb at full throttle (was PILOT_SPEED_UP 250); default 2.5
ATC_ANGLE_MAX   30     # degrees max lean, all modes (was ANGLE_MAX 3000 centi-degrees); default 30
```
**RTL** [3][4]:
```
RTL_ALT_M       12     # m above home (was RTL_ALT 1200 cm); default 15. Already higher? it returns at current alt
RTL_SPEED_MS    0      # m/s; 0 = use WP_SPD
RTL_ALT_FINAL_M 0      # 0 = land at home
RTL_LOIT_TIME   5000   # ms hover over home before descending (default 5000) [7]
RTL_CONE_SLOPE  3.0    # default; near home it climbs less (cone) [7]
LAND_SPD_MS     0.5    # final descent m/s
```
RTL sequence: climb to `max(RTL_ALT_M, current alt)` (also at least `RTL_CLIMB_MIN_M`), fly home at `RTL_SPEED_MS`
(or `WP_SPD`), loiter `RTL_LOIT_TIME`, descend and land, disarm [3][4]. The original's simulated RTL descends when
started above RTL_ALT: real ArduPilot keeps the current altitude [3].

**Auto** [5]:
```
WP_SPD          4.0    # m/s horizontal (was WPNAV_SPEED 400 cm/s); default 10.0
WP_SPD_UP       2.5    # m/s
WP_SPD_DN       1.5    # m/s
WP_RADIUS_M     2.0    # m; waypoint "reached" radius
AUTO_OPTIONS    0      # bit0 allow arming in Auto, bit1 take off without raising throttle [3]
```

### 5.4 A 4-waypoint AUTO mission (QGC WPL 110, loadable)

Format: tab-separated `INDEX CURRENT FRAME COMMAND P1 P2 P3 P4 LAT LON ALT AUTOCONTINUE`. Row 0 is home (frame 0 =
absolute MSL altitude). Mission rows use frame 3 (MAV_FRAME_GLOBAL_RELATIVE_ALT, metres above home). Commands:
16 NAV_WAYPOINT (P1 = hold s), 22 NAV_TAKEOFF (alt in ALT), 20 NAV_RETURN_TO_LAUNCH. Home here is ArduPilot SITL's
default location (CMAC, Canberra: -35.363261, 149.165230, 584 m) so it loads in `sim_vehicle.py -v ArduCopter`
(SITL home location: unverified that it is still the default). The square is the original's: pad (15, 15) and
waypoints (20,12), (20,19), (13,19), (13,12) in field metres (x east, y north), i.e. offsets +5E/-3N, +5E/+4N,
-2E/+4N, -2E/-3N; 1 m north = 8.983e-6 deg, 1 m east = 1.1016e-5 deg at this latitude.

```
QGC WPL 110
0	1	0	16	0	0	0	0	-35.3632610	149.1652300	584.000000	1
1	0	3	22	0	0	0	0	0.0000000	0.0000000	5.000000	1
2	0	3	16	0	0	0	0	-35.3632879	149.1652851	5.000000	1
3	0	3	16	0	0	0	0	-35.3632251	149.1652851	5.000000	1
4	0	3	16	0	0	0	0	-35.3632251	149.1652080	5.000000	1
5	0	3	16	0	0	0	0	-35.3632879	149.1652080	5.000000	1
6	0	3	20	0	0	0	0	0.0000000	0.0000000	0.000000	1
```

Command ids and frames verified in MAVLink `common.xml` [25]; file format (12 tab-separated fields, header
`QGC WPL 110`) from the MAVLink file-format page [24]. Row 0 as home is the Mission Planner / ArduPilot convention
(the MAVLink page does not define it).

MAVProxy (SITL) sequence: `wp load square.txt`, `wp list`, `mode LOITER`, `arm throttle`, `mode AUTO`, `rc 3 1500`
(raise throttle: a landed copter in AUTO waits for throttle unless `AUTO_OPTIONS` bit 1 is set) [3]. ArduCopter
refuses to arm in AUTO itself unless `AUTO_OPTIONS` bit 0 (Allow Arming) is set: `ModeAuto::allows_arming()` returns
`option_is_enabled(Option::AllowArming)` [26]. Mission Planner: Plan > Load WP File, then Write WPs.

Camera commands (ids from [25]): 201 `DO_SET_ROI`, 195 `DO_SET_ROI_LOCATION` (newer form), 203
`DO_DIGICAM_CONTROL`, 205 `DO_MOUNT_CONTROL`, 1000 `DO_GIMBAL_MANAGER_PITCHYAW`, 206 `DO_SET_CAM_TRIGG_DIST`,
2000 `IMAGE_START_CAPTURE`, 178 `DO_CHANGE_SPEED`, 21 `NAV_LAND`. All but `DO_SET_ROI_LOCATION` and
`IMAGE_START_CAPTURE` appear on ArduPilot's Copter mission-command list [27] (those two are not listed there:
unverified for Copter). The original's inspection script (`DO_SET_ROI` + `WAYPOINT` + `DO_DIGICAM_CONTROL`) uses
real commands; it is shorthand, not a loadable file.

### 5.5 Failsafes

```
FS_THR_ENABLE    1     # RC loss -> RTL (default 1) [3][8]; 3 Land, 4 SmartRTL or RTL, 5 SmartRTL or Land, 7 Brake or Land
FS_THR_VALUE     975   # PWM on ch3 below which throttle failsafe triggers (default 975, range 910-1100) [3][7]
FS_GCS_ENABLE    0     # GCS-loss failsafe (1 RTL, 3 SmartRTL or RTL, 5 Land) [3]
FS_EKF_ACTION    1     # EKF failsafe: 1 Land if mode needs position, 2 AltHold, 3 Land always [3]
FS_OPTIONS       0     # bit0 continue Auto on RC failsafe, etc. [3]
BATT_LOW_VOLT    14.0  # V (4S: 3.5 V/cell). Default 10.5 V is a 3S value [12]
BATT_CRT_VOLT    13.2  # V (4S: 3.3 V/cell). Default 0 = disabled [12]
BATT_LOW_MAH     1000  # mAh remaining (20% of 5000). Default 0 = disabled [12]
BATT_CRT_MAH     500   # mAh remaining
BATT_LOW_TIMER   10    # s below the voltage before triggering (default 10) [12]
BATT_FS_VOLTSRC  1     # 1 = sag-compensated voltage (default 0 raw) [3][12]
BATT_FS_LOW_ACT  2     # RTL (0 warn, 1 Land, 2 RTL, 3 SmartRTL or RTL, 4 SmartRTL or Land, 5 Terminate, 6 Auto DO_LAND_START or RTL, 7 Brake or Land); default 0 [3][12]
BATT_FS_CRT_ACT  1     # Land; default 0 [3][12]
```
With ELRS/CRSF the receiver stops sending frames on link loss and ArduPilot detects RC loss directly ("no pulses"
failsafe), so FS_THR_VALUE matters mostly for PWM/SBUS receivers (unverified wording; behaviour well documented).
Note: with ELRS the receiver's own failsafe should be "no pulses", not "hold" (unverified ELRS setting name).

**Geofence** [3][11]:
```
FENCE_ENABLE     1     # default 0
FENCE_TYPE       7     # bitmask: 1 max alt + 2 circle + 4 polygon (Copter default 7); 8 = min alt
FENCE_ACTION     1     # 1 RTL or Land (default); 0 report only, 2 always Land, 3 SmartRTL or RTL or Land, 4 Brake or Land
FENCE_ALT_MAX    100   # m (default 100)
FENCE_RADIUS     300   # m circle around home (default 300, min 30)
FENCE_MARGIN     2     # m (default 2)
```
Fence enabled needs a position estimate before arming ("Fence enabled, need position estimate") [13].

### 5.6 2-axis brushless gimbal (MNT1_*)

For a self-stabilising brushless gimbal (own controller and IMU) that takes PWM angle commands [20]:
```
MNT1_TYPE        7     # BrushlessPWM (reboot). 1 = Servo is for plain servo gimbals [3][20]
SERVO9_FUNCTION  8     # Mount1Roll  (FMU out 1, "AUX 1")
SERVO10_FUNCTION 7     # Mount1Pitch (FMU out 2)
MNT1_PITCH_MIN   -90   # deg (straight down)
MNT1_PITCH_MAX   25    # deg
MNT1_ROLL_MIN    -30   # deg
MNT1_ROLL_MAX    30    # deg
MNT1_RC_RATE     90    # deg/s rate control from RC; 0 = angle control
RC6_OPTION       213   # Mount Pitch (tilt knob/slider on ch6)
MNT1_DEFLT_MODE  3     # RC Targeting (0 Retracted, 1 Neutral, 2 MAVLink, 3 RC, 4 GPS Point, 5 SysID, 6 Home) [3]
```
Other `SERVOn_FUNCTION` mount values: 6 Mount1Yaw, 9 Mount1Retract [3]. Other `MNT1_TYPE` values: 0 None, 1 Servo,
2 3DR Solo, 3 Alexmos Serial, 4 SToRM32 MAVLink, 5 SToRM32 Serial, 6 MAVLink (Gremsy/AVT), 7 BrushlessPWM, 8 Siyi,
9 Scripting, 10 Xacti, 11 Viewpro, 12 Topotek, 13 CADDX, 14 XFRobot [3]. Servo power comes from a BEC on the servo
rail. The gimbal's own controller does the stabilising; ArduPilot only sends the angle it wants (type 7) [20],
whereas with type 1 Servo "ArduPilot can stabilize a servo gimbal with up to three axis of motion" itself, using
`MNT1_LEAD_RLL` / `MNT1_LEAD_PTCH` to offset slow servos [35]. Using type 1 on a self-stabilised brushless gimbal
makes both try to cancel the lean. In AUTO,
`DO_SET_ROI` makes the mount point at a location (needs a 3-axis or yaw-able setup for full pointing; a 2-axis
gimbal can only point in pitch, the copter yaws to face the ROI) (unverified wording).

### 5.7 RPM filtering (harmonic notch) [3]

Throttle-based (works with PWM ESCs, no telemetry):
```
INS_HNTCH_ENABLE 1     # reboot / refresh to see the rest
INS_HNTCH_MODE   1     # 1 throttle, 3 ESC telemetry (bi-directional DShot), 4 dynamic FFT
INS_HNTCH_REF    0.35  # throttle mode: the throttle at which FREQ was measured, i.e. hover (MOT_THST_HOVER) [3]
INS_HNTCH_FREQ   80    # Hz, hover noise frequency (from a log FFT; unverified typical for 10" props)
INS_HNTCH_BW     40    # Hz, about half of FREQ [3]
INS_HNTCH_HMNCS  3     # 1st + 2nd harmonics (bitmask)
```
ESC-RPM based: `INS_HNTCH_MODE 3`, `INS_HNTCH_REF 1` [3], `INS_HNTCH_OPTS 2` (bit 1 Multi-Source, one notch per motor), `SERVO_BLH_BDMASK 15`
(bi-directional DShot on outputs 1-4), `SERVO_BLH_POLES 14` (default 14; set to the motor's magnet count) [3]; on a
6C needs IO DShot firmware (outputs 1-4) or the `Pixhawk6C-bdshot` build [15].

### 5.8 OSD and VTX

No Betaflight-style VTX table in ArduPilot: `VTX_ENABLE`, `VTX_BAND` (0 A, 1 B, 2 E, 3 Airwave, 4 RaceBand,
5 Low RaceBand, ...), `VTX_CHANNEL` (0-7), `VTX_POWER` (mW, rounded down to a supported level), `VTX_MAX_POWER` [3],
with SmartAudio (`SERIALn_PROTOCOL 37`) or Tramp (44). OSD: `OSD_TYPE` 1 MAX7456, 3 MSP, 5 MSP_DISPLAYPORT [3]. A
camera drone usually flies on telemetry + the GCS map; FPV video is optional.

### 5.9 Arming checks

`ARMING_SKIPCHK 0` (skip nothing) [3]. Bits that can be skipped: 1 Barometer, 2 Compass, 3 GPS lock, 4 INS,
5 Parameters, 6 RC Channels, 7 Board voltage, 8 Battery Level, 10 Logging Available, 11 Hardware safety switch,
12 GPS Configuration, 13 System, 14 Mission, 15 Rangefinder, 16 Camera, 17 AuxAuth, 18 VisualOdometry, 19 FFT; -1
skips all non-mandatory checks [3]. Related: `ARMING_NEED_LOC 1` requires a position before arming [3];
`BATT_ARM_VOLT` / `BATT_ARM_MAH` minimum battery to arm [3][12].

Real pre-arm messages (exact strings from [13]; the GCS shows "PreArm: " + text):

| Message | Cause |
|---|---|
| `3D Accel calibration needed` | accelerometer never calibrated |
| `Compass not calibrated` (from AP_Compass), `Compass %d not healthy`, `Compass offsets too high`, `Compasses inconsistent`, `Check mag field: %4.0f, max %d, min %d` | compass calibration / interference |
| `GPS %i: Bad fix`, `High GPS HDOP`, `GPS glitching`, `Need Position Estimate` | no 3D fix / poor geometry / EKF not ready for a GPS mode |
| `EKF attitude is bad`, `AHRS not healthy`, `EKF %s variance` | estimator not converged or sensors disagree |
| `Gyros inconsistent`, `Accels inconsistent`, `Gyros not calibrated` | IMU disagreement, moved during boot |
| `Throttle too high` (from `%s too high`) | throttle stick not at bottom |
| `%s mode not armable` | e.g. trying to arm in RTL, or AUTO without AUTO_OPTIONS bit 0 |
| `Battery failsafe`, `Board (%1.1fv) out of range %1.1f-%1.1fv` | low battery / bad 5 V supply |
| `Check FS_THR_VALUE` | throttle failsafe PWM set above the radio's minimum |
| `Hardware safety switch` | safety switch on the GPS not pressed |
| `Fence enabled, need position estimate` | fence on without GPS |
| `Leaning` | vehicle tilted beyond the arming lean limit |
| `Logging failed`, `No SD card` | SD card missing / failed |
| `Mode requires mission` | AUTO with no mission |
| `Invalid MultiCopter FRAME_CLASS` | FRAME_CLASS 0 |
| `RC not found`, `Radio failsafe on`, `Throttle below failsafe`, `RC calibrating`, `RC%d_MIN is greater than RC%d_TRIM` | no RC signal / RC failsafe active / bad radio calibration |
| `Throttle (RC%d) is not neutral` (from `%s (RC%d) is not neutral`) | throttle not neutral when arming in a mode that needs it |

## 6. Safety tests

| Test | How | What it catches |
|---|---|---|
| Smoke stopper | An inline fuse-like device (usually a resettable PTC fuse or a small incandescent bulb, sometimes an electronic current limiter) between battery and craft for the first power-up. A short makes it trip/glow and limit current to well under an amp. | Solder bridges, reversed polarity, shorted ESC or PDB before they burn a board. With big ESCs a bulb-type stopper may not pass enough current to initialise them (they just beep/reboot) (unverified wording). |
| Props-off motor test | Mission Planner: Setup > Optional Hardware > Motor Test (path from ArduPilot forum threads, not the wiki), buttons "Test motor A".."D" plus throttle % and duration; default 5% may be too low, 10-15% is typical. A = first motor right of the nose, then clockwise [19]; the letter is the matrix test order [9]. QGC: Vehicle Setup > Motors (unverified menu name). Props OFF. | Wrong motor number (output order), wrong spin direction, dead ESC. Expected: A = M1 front-right CCW, B = M4 rear-right CW, C = M2 rear-left CCW, D = M3 front-left CW. |
| Accelerometer calibration | Mission Planner: Setup > Mandatory Hardware > Accel Calibration > **Calibrate Accel**; hold each position still and click "Click when Done": 1 level, 2 right side, 3 left side, 4 nose down, 5 nose up, 6 on its back (within about 20 deg except level; stillness matters more than angle). Then, in the flying attitude, **Calibrate Level** (corrects pitch/roll trim only) [30]. Reboot. | IMU offsets/scale; `3D Accel calibration needed`; level trim so it does not drift in AltHold/Stabilize |
| Compass calibration | Mission Planner: Setup > Mandatory Hardware > Compass > Onboard Mag Calibration > **Start**; hold the craft in the air and point each side (front, back, left, right, top, bottom) down in turn, a full 360 deg turn each (about six turns) until the green bars complete; three rising tones and "Please reboot the autopilot"; it cannot arm until rebooted [31]. Not while armed; away from metal, phones, desks, power supplies; good 3D GPS lock first. If it keeps failing, relax "Fitness" or raise `COMPASS_OFFS_MAX` from 850. "Large Vehicle MagCal" (needs GPS lock and the TRUE heading typed in, correct orientation set first) for craft too big to rotate [31]. | Hard-/soft-iron offsets, wrong COMPASS_ORIENT, interference from power wires (`Compass not calibrated`, `Compass offsets too high`, `Compasses inconsistent`); prevents "toilet-bowling" in Loiter |
| Radio calibration | Setup > Mandatory Hardware > Radio Calibration (unverified menu path): move all sticks/switches to their ends | stick ranges; FS_THR_VALUE must be below the real minimum |
| Failsafe test | SITL first (`sim_vehicle.py -v ArduCopter`), then props-off on the bench: turn the transmitter off, the mode must change to RTL (or Land when landed: disarm) | failsafe configuration |
| Pre-arm checks | Leave `ARMING_SKIPCHK 0`; read the PreArm messages in the HUD / Messages tab | everything in 5.9 |
| Hover-learn test flight | Stabilize/AltHold hover; `MOT_HOVER_LEARN 2` (learn and save) [3] | real hover throttle into MOT_THST_HOVER |

## 7. Flight characteristics (typical, 450-500 mm 4S camera quad)

| Quantity | Typical value |
|---|---|
| AUW | 1.4-1.8 kg with a 5000 mAh pack and gimbal (F450 TOW 0.8-1.6 kg per DJI [22]; original default 1600 g) |
| Thrust per motor (2216 KV920 + 1045) | about 1.3 kg at 16 V full throttle [21] |
| T:W | 2-3:1 (camera drones want at least about 2:1) |
| Hover throttle | 0.3-0.5; ArduPilot's starting estimate `MOT_THST_HOVER 0.35` [10] |
| Hover current | about 12-14 A total (3-3.5 A per motor at 400 g each [21]) |
| Max current | about 60-70 A total (4 x 16.4 A [21]) |
| Hover time | about 18 min, X500 V2 with 5000 mAh, no payload [18]; 12-15 min with gimbal and camera (unverified) |
| Aggressive flight time | about 8-10 min (unverified) |
| Max lean | 30 deg default (`ATC_ANGLE_MAX`) [14] |
| Speeds | Loiter max 12.5 m/s default [6]; WP 10 m/s default [5]; practical top speed about 15 m/s at 30 deg lean (unverified) |
| Climb / descent | 2.5 m/s pilot climb [7], 1.5 m/s WP descent [5], 0.5 m/s final land [7] |
| Motor-out | a quad cannot keep attitude with one motor out: it yaws hard, rolls towards the dead arm and falls. ArduPilot's motor-lost detection ("thrust boost") only runs when `number_motors >= 6` (`AP_MotorsMatrix::check_for_failed_motor`) [34], so a quad gets no motor-out handling; a hexa or octa can limp home. |

## 8. Real failure modes (what the pilot sees)

| Failure | Cause | What the pilot sees |
|---|---|---|
| Flip on take-off | reversed motor, props on the wrong motors (CW/CCW swapped), wrong motor order, or FC arrow backwards (AHRS_ORIENTATION wrong) | at throttle-up one side lifts and it flips within a second, or spins hard in yaw |
| Wrong board alignment | AHRS_ORIENTATION / FC rotated 90-180 deg | flips on take-off; if slightly off, drifts and toilet-bowls |
| Compass interference / bad calibration | GPS mast too short, power wires under the compass, COMPASS_ORIENT wrong | "toilet-bowling" circles in Loiter that grow; `Compass offsets too high`, `Check mag field` pre-arm; EKF yaw reset messages; can fly away in a straight line if heading is 180 deg wrong |
| GPS loss / glitch | few satellites, high HDOP, multipath near buildings | `GPS Glitch` / EKF failsafe; in Loiter it switches to Land or AltHold per FS_EKF_ACTION and starts drifting |
| Desync | over-propped/over-volted motor, ESC timing, sudden throttle | one motor stutters or stops: a twitch, then a roll/flip and fall |
| Brown-out | power module or BEC overloaded, loose POWER1 cable, voltage dip | FC reboots mid-air: motors stop, it falls; log ends abruptly |
| Missing / reversed low-ESR capacitor | voltage spikes on long battery leads | noise, ESC failures, gyro noise; a reversed electrolytic heats and vents |
| Prop wash / vibration | fast descents through its own wash, unbalanced props | wobble on descent; high VIBE in logs, "Vibration compensation ON" (unverified exact string), altitude jumps |
| Low-battery sag | pack worn or too small | battery failsafe RTL early; voltage collapses under load |
| RC loss | out of range | FS_THR_ENABLE 1: mode changes to RTL, climbs to RTL_ALT_M and comes home |
| EKF failsafe | bad compass + GPS together | mode changes to Land (FS_EKF_ACTION 1) |
| Fence breach | flew outside FENCE_RADIUS / above FENCE_ALT_MAX | RTL (FENCE_ACTION 1) and a fence-breach status message (exact text unverified) |

## 8a. Corrections to the original (drone-lab-b.md Fig 06)

| Original | Problem | Correct (ArduCopter 4.7.2) |
|---|---|---|
| `LOIT_SPEED 500 # cm/s` | renamed in 4.7 | `LOIT_SPEED_MS 5.0` (m/s) [6] |
| `LOIT_BRK_ACCEL 250` | renamed | `LOIT_BRK_ACC_M 2.5` (m/s/s) [6] |
| `LOIT_BRK_DELAY 1.0` | correct | unchanged [6] |
| `PILOT_SPEED_UP 250 # cm/s` | renamed | `PILOT_SPD_UP 2.5` (m/s) [8] |
| `ANGLE_MAX 3000 # centi-degrees` | replaced | `ATC_ANGLE_MAX 30` (deg) [2][14] |
| `RTL_ALT 1200 # cm` | renamed | `RTL_ALT_M 12` (m) [4] |
| `RTL_SPEED 0 # 0 = use WPNAV_SPEED` | both renamed | `RTL_SPEED_MS 0 # 0 = use WP_SPD` [4][5] |
| `FS_THR_ENABLE 1`, `BATT_FS_LOW_ACT 2` | correct values; but battery FS also needs `BATT_LOW_VOLT` (default 10.5 V is for 3S) and/or `BATT_LOW_MAH` | set `BATT_LOW_VOLT 14.0` for 4S [12] |
| `MNT1_TYPE 1 # servo gimbal on AUX (SERVO9 = tilt)` | a self-stabilised 2-axis brushless gimbal is type 7, and the output function must be set | `MNT1_TYPE 7`, `SERVO9_FUNCTION 8` (roll), `SERVO10_FUNCTION 7` (pitch) [20]; type 1 only for plain servo gimbals |
| Wiring "RC RECEIVER: ELRS, RCIN" | CRSF/ELRS does not work on the 6C RCIN pin | ELRS on TELEM2/3 with `SERIALn_PROTOCOL 23`, `RSSI_TYPE 3`, `RC_OPTIONS` bit 13 [15][28] |
| Power module "clean 5.3 V" | PM02 V3 (the X500 V2 module) outputs 5.2 V / 3 A | say 5.2 V [33] |
| "FC: PIXHAWK 6C, ArduCopter 4.5" | out of date | ArduCopter 4.7.2 [1] |
| "PWM or DShot from MAIN OUT 1-4" | DShot on MAIN needs IO DShot firmware | `BRD_IO_DSHOT 1` [15] |
| Pixhawk 6C 40 g | real 59.3 g | flag only (calculator unchanged) [16] |
| Gimbal + camera 190 g | real about 300 g (unverified) | flag only |
| QGC WPL 110 panel with "+5 m E" columns | not loadable | use the real file in 5.4 |
| RTL from above RTL_ALT descends | real ArduPilot returns at current altitude if above RTL_ALT_M [3] | hold altitude, fly home, then descend |
| Mission arms in AUTO | ArduCopter refuses to arm in AUTO unless `AUTO_OPTIONS` bit 0 is set [3][26] | arm in Loiter/Stabilize, then switch to AUTO, or set AUTO_OPTIONS 3 |
| Calibrate toast says only accelerometer | the button promises compass too | do both (section 6) |
| Generic 2212 920 KV thrust 1001 g at 4S with 1045 | optimistic | DJI E300 (2212/920 + 9.4") rates 600 g max/axis [23] |

## 9. Uncertainties

- F450 arm dimensions, plate size, arm colours and motor-mount pattern were not checked against a DJI drawing.
- Masses of the SiK radio, gimbals, landing gear and batteries are typical ranges, not datasheet values. M10 GPS
  (32 / 36.8 g) and PM02 V3 (20 g) are from Holybro [32][33].
- Pixhawk 6C mass 59.3 g is from PX4 docs [16]; the case variant is not stated and Holybro's own page gives no mass.
- The 2216 thrust numbers are for T-Motor's AIR2216II KV920 [21], used as a proxy for Holybro's 2216 KV920 (no
  Holybro thrust table found). The 14.8 V figures scaled from 16 V data are estimates.
- QGC menu names, the Mission Planner Motor Test and Radio Calibration paths (forum-sourced), the SITL default
  location, ELRS receiver failsafe wording and the "Vibration compensation" / fence-breach message strings were not
  verified against primary sources.
- `GPS1_TYPE` default is `HAL_GPS1_TYPE_DEFAULT` in source; 1 (AUTO) on standard boards, not checked in the 6C hwdef.
- Release dates (4.7.0 on 21 Jul 2026, 4.7.2 on 11 Oct 2026) are from the ReleaseNotes file at the stable commit [2];
  the firmware server's stable and beta folders both point at that commit [1].
