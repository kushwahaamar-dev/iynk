# Fact sheet: Betaflight tricopter with tail-servo yaw (Drone Lab Fig. 12, `tricopter`)

Status: firmware facts verified against the Betaflight **2026.6.2** source tree (tag `2026.6.2`, published
2026-09-16) and the betaflight.com docs on 2026-10-24, and against INAV 9.1.0 for the alternative firmware.
Build facts come from the RCExplorer (David Windestal) kit pages (archived). Anything marked "(unverified)" could
not be checked in the time box. Source first, docs second, community last.

## 0. Header

**Craft class:** Y-layout tricopter ("tri"): two front motors on arms about 60 deg either side of the nose, one tail
motor on a long boom, the tail motor mounted on a servo-driven tilt hinge so it can be tilted left/right about the
boom axis. 4S LiPo, 5-6 inch props, Betaflight `mixer TRI` (or INAV `platform_type = TRICOPTER`), flown FPV.

**Real products / reference builds it represents:**

| Reference | What it is | Key published figures | Link |
|---|---|---|---|
| RCExplorer **Mini Tricopter** (David Windestal) | Folding-arm 6" tri, 10 x 10 mm woven-carbon square-tube arms, F3FC frame with integrated FC + PDB | Recommended: 3 x EMAX RS2205 2300KV, 3 x Littlebee 30 A ESC, BMS-210DMH feedback servo, HQ 6x4.5 props (listed as 1 pack CCW + 1 pack CW), 4S 1800 mAh 35C+; battery up to 110 x 35 x 35 mm; camera mount 0-40 deg adjustable; folded 10 x 30 x 8 cm; "almost 160 km/h" (maker's claim) [9] | https://rcexplorer.se/product/minitricopter-kit/ (archived [9]) |
| RCExplorer **Baby Tricopter** | Unibody 3 mm carbon tri on 5" props | 170 mm motor to motor, 200 x 200 x 43 mm without props, empty frame 84.8 g, 30.5 mm FC mount, 30 mm standoffs, AUW 280 g with FPV gear and battery, 2204-2206 motors, 4S 1300 mAh [10] | https://rcexplorer.se/product/babytricopter-kit/ (archived [10]) |
| RCExplorer **Tricopter V4** | Full-size folding tri (the "classic" Windestal tri) | frame 201 g incl. FC, PDB, arms, tilt mechanism, mounts, landing gear and camera mount (from a search excerpt of [11]; the page itself would not load); AUW 980 g on 4S 3200 mAh with GoPro (forum reply, unverified) [11] | https://rcexplorer.se/product_archive/2020/05/tricopter-v4-kit-product-archive/ |

The Fig. 12 craft (208 mm between front motors, 150 mm tail, 5" tri-blades, 655 g AUW on 4S 2200) sits between the
Baby Tri (170 mm, 280 g) and the Mini Tri (6" props, about 660 g AUW reported by a user, unverified [9]).

**What it is and what it is for.** A tricopter has three thrust motors and one servo. Roll and pitch are made the
same way as on a quad (differential thrust), but yaw is made by **thrust vectoring**: the servo tilts the tail motor
a few degrees to the side, so part of its thrust pushes the tail sideways and swings the nose the other way, like a
rudder. That gives a smooth, "coordinated", plane-like yaw (good for video and swoopy flying) and lets the tri use
fewer, bigger props, at the cost of one more moving part that works every moment of the flight: if the servo, its
gears, its linkage or its power fail, nothing else can control yaw. Tris were most popular roughly 2010-2018 (approximate)
(RCExplorer kits, the Triflight firmware fork); today they are a niche, and the RCExplorer shop has closed [9].

## 1. Sources

Firmware source (Betaflight tag 2026.6.2, files fetched raw from GitHub on 2026-10-24):

1. Betaflight releases (2026.6.2 published 2026-09-16; calendar versioning since 2025.12, no "4.6"): https://github.com/betaflight/betaflight/releases
2. `src/main/flight/mixer_init.c` (TRI motor table `mixerTricopter`, `mixerIsTricopter()`): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/mixer_init.c
3. `src/main/flight/servos.c` (`servoMixerTri`, `writeServos()`, `servoMixer()`, servo defaults): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/servos.c
4. `src/main/flight/servos.h` (servo slot enum `SERVO_RUDDER = 5`, input enum `INPUT_STABILIZED_YAW = 2`): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/servos.h
5. `src/main/flight/servos_tricopter.c` and `mixer_tricopter.c` (tri-specific code, now stubs): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/servos_tricopter.c , https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/mixer_tricopter.c
6. `src/main/cli/cli.c` (`servo`, `smix`, `mixer` commands) and `src/main/cli/settings.c` (every `set` name): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/cli/cli.c , https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/cli/settings.c
7. `src/main/target/common_pre.h` (`USE_SERVOS` only in non-cloud builds or with `USE_WING`), `src/main/drivers/servo_impl.h` (servo limits): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/target/common_pre.h
8. Betaflight cloud-build options API (2026.6.2): "Servos" = `USE_SERVOS`, default **false**: https://build.betaflight.com/api/options/2026.6.2
9. RCExplorer Mini Tricopter kit page (archived 2019): https://web.archive.org/web/2019/https://rcexplorer.se/product/minitricopter-kit/
10. RCExplorer Baby Tricopter kit page (archived 2018): https://web.archive.org/web/2018/https://rcexplorer.se/product/babytricopter-kit/
11. RCExplorer Tricopter V4 product archive (frame 201 g; AUW from a forum reply): https://rcexplorer.se/product_archive/2020/05/tricopter-v4-kit-product-archive/
12. Betaflight docs, Mixer guide (supported airframes, `smix`, servo reversal, servo filtering): https://betaflight.com/docs/wiki/guides/current/Mixer
13. Betaflight docs, CLI settings list (2025.12) and the other guides used by the quad sheets (Failsafe, VTX, DShot RPM Filtering, Reversed motor direction, Arming Sequence and Safety): https://betaflight.com/docs/wiki/guides/current/
14. SpeedyBee F405 V4 Betaflight target `config.h` (pins, timers, `SERVO1_PIN PB15`) and board page: https://github.com/betaflight/config/blob/master/configs/SPEEDYBEEF405V4/config.h
15. Betaflight wiki (archive), Matek F405-mini tricopter notes (Betaflight 3.2 era; tail servo on the first servo output, "do not draw power from the board with a servo"): https://betaflight.com/docs/wiki/boards/archive/MATEKF405MINI
16. INAV releases (9.1.0 stable 2026-07-09; 10.0.0-rc2 2026-09-29): https://github.com/iNavFlight/inav/releases
17. INAV `docs/Mixer.md` (platform types MULTIROTOR / AIRPLANE / TRICOPTER, `smix` syntax): https://github.com/iNavFlight/inav/blob/master/docs/Mixer.md
18. INAV 9.1.0 `src/main/fc/settings.yaml` (`platform_type`, `tri_unarmed_servo`): https://github.com/iNavFlight/inav/blob/9.1.0/src/main/fc/settings.yaml
19. Triflight (Betaflight fork with tricopter tail algorithms by lkaino): https://github.com/lkaino/Triflight/releases
20. Companion sheet for all generic Betaflight facts (renamed parameters, failsafe, VTX table, RPM filter, arming flags), verified against the same 2026.6.2 tag: `docs/facts/quad5.md` sections 5.2-5.14.
21. Oscar Liang, EMAX RS2205 2300KV thrust tests on 4S (16.2-16.6 V): https://oscarliang.com/emax-rs2205-2300kv-2600kv-motors/ ; GetFPV listing (about 30 g with wires): https://www.getfpv.com/emax-rs2205-2300kv-racespec-motor-cw.html
22. ArduPilot Copter docs, Tricopter Configuration (`FRAME_CLASS` 7, `MOT_YAW_SV_ANGLE`, `SERVO7_*`, function 39): https://ardupilot.org/copter/docs/tricopter.html
23. INAV Configurator mixer presets `js/model.js` (Tricopter preset, `SERVO.RUDDER: 4`, `INPUT.STABILIZED_YAW: 2`): https://github.com/iNavFlight/inav-configurator/blob/master/js/model.js

Research input: `docs/research/drone-lab-b.md`, section "Fig 12. Tricopter" (design options, frame, build steps,
servo test, modes, CLI) and `docs/research/drone-lab-b-calc-matrix.md`, section "Fig 12".

## 2. Geometry (craft frame)

Craft frame: **x forward (nose), y left, z up**, origin at the frame centre on top of the bottom plate, mm. Yaw
angles positive counter-clockwise seen from above (right-hand about +z).

### 2.1 Frame layout (the original's drawing, kept for the iynk figure)

The original's numbers [research `16:155-241`] are self-consistent and fit real 5" tris; keep them.

| Item | Value | Notes / real-world check |
|---|---|---|
| Layout | Y: two front arms at +-60 deg from the nose (i.e. 120 deg apart), one tail boom straight back | RCExplorer tris use the same Y (front arms ~60 deg off the nose, unverified exact angle) |
| Centre plate | 100 x 64 x 3 mm, x from -52 to +48 | Baby Tri unibody is 3 mm carbon [10] |
| Front arms | from r = 24 to 122 mm along the +-60 deg diagonals, 14 mm wide | real tris often use 10 x 10 mm square carbon tubes [9] |
| Tail boom | x from -40 to -156, 16 mm wide | |
| Front motor radius | 120 mm from centre | |
| Front motor spacing | 208 mm (left to right) | Baby Tri 170 mm motor-to-motor [10] |
| Tail motor | 150 mm behind centre | |
| Front-to-tail motor distance | sqrt(210^2 + 104^2) = 234 mm | props cannot touch with 5" or 6" props |
| Front prop clearance | 208 - 2 x 63.5 = 81 mm (5"), 208 - 2 x 76 = 56 mm (6") | fine |
| "Wheelbase" | not defined the quad way; quote front spacing 208 mm and front-to-tail 234 mm | |
| Top plate | 94 x 56 mm on 30 mm standoffs | Baby Tri uses 30 mm standoffs [10]; Mini Tri 40 mm [9] |
| Stack mount | 30.5 x 30.5 mm, M3 | Baby Tri FC mount 30.5 mm [10] |
| FC | 31 x 31 mm (F4 + PDB), arrow forward, between the front arms | |
| Frame mass | 190 g (original); RCExplorer V4 201 g incl. FC/PDB/tilt [11]; Baby Tri 84.8 g [10] | plausible for this size |

Motor and tail-hinge heights (z) are not in the original; suggested values for the figure: motor bell base at
z = 8 mm on 4 mm motor mounts above the 3 mm arm (front), tail hinge axis at z = 12 mm (iynk design choice,
unverified against a real frame).

### 2.2 Motor positions and firmware order (Betaflight `mixer TRI`)

Betaflight motor table `mixerTricopter` (columns throttle, roll, pitch, yaw) [2]:

```
{ 1.0f,  0.0f,  1.333333f,  0.0f },     // REAR       -> M1
{ 1.0f, -1.0f, -0.666667f,  0.0f },     // RIGHT      -> M2 (front right)
{ 1.0f,  1.0f, -0.666667f,  0.0f },     // LEFT       -> M3 (front left)
```

The **yaw column is zero for all three motors**: Betaflight makes no yaw with motor speed on a tri; yaw comes only
from the servo. The pitch weights 1.333 / -0.667 balance the 2:1 motor count front to back.

| Motor | Betaflight # | (x, y) mm | Spin seen from above (recommended) | Prop |
|---|---|---|---|---|
| Tail | **M1** | (-150, 0) | **CCW** | CCW (normal) prop |
| Front right | **M2** | (60, -104) | **CW** | CW ("reversed") prop |
| Front left | **M3** | (60, 104) | **CCW** | CCW prop |

Servo: one tail servo, Betaflight servo slot **5** (`SERVO_RUDDER`) [4], written to the **first servo output**
(resource `SERVO 1`) [3]. Betaflight docs: "TRI ... Motors M1-M3, Servos S1" [12].

### 2.3 Spin directions: what is required and what is preferred

- Firmware: because the TRI yaw column is 0, Betaflight does not care which way any motor spins, and
  `yaw_motors_reversed` has **no effect** on a tri's yaw (it only flips the motor-mix yaw sign (`src/main/flight/mixer.c`, same tag), and the
  servo's input is the raw yaw PID sum [3]).
- Physics: the two front motors must counter-rotate so their reaction torques cancel. The tail motor's reaction
  torque is not cancelled and is trimmed out by a steady servo offset (section 2.5, coupling 3).
- RCExplorer (Windestal) recommendation, seen from above: **left CCW, right CW, tail CCW**. Swapping the front pair
  (left CW, right CCW) "is not a big deal ... you will be fighting it a bit more with stick inputs in the turns",
  but "the CCW rotation of the tail motor is absolutely critical for proper triflight behavior" [9][10] (that last
  rule is for the Triflight firmware; stock Betaflight just ends up with a different servo trim).
- The original's order and spins (M1 tail CCW, M2 front-right CW, M3 front-left CCW) **match** the RCExplorer
  recommendation. Note that relative to a Betaflight quad's default "props in" (front-right CCW, front-left CW) this
  front pair is the **props-out** sense.
- Alternative: left CW, right CCW, tail CCW (flies, slightly worse coordinated turns [9]).

### 2.4 Props, camera, battery

| Item | Value |
|---|---|
| Props (original default) | 5 x 4.3 x 3 (5.0" diameter, 4.3" pitch, 3 blades), drawn radius 63 mm; options 6x4x2 (r 76 mm), 5x5x3 |
| Real references | Mini Tri: HQ 6 x 4.5 two-blade [9]; Baby Tri: 5 x 4 x 3 class (unverified exact) [10] |
| Prop handedness | the tail and front-left take CCW props, front-right a CW prop (one CW + two CCW per set) |
| Camera | nose, between side plates; original draws the lens rotated 72 deg = about 18 deg uptilt, `camTilt` 22 deg in FPV, diagram says 15 deg, lesson says 15-20 deg (inconsistent, see 3.4); real Mini Tri mount 0-40 deg adjustable [9] |
| Battery | on top plate, strap; 96 / 88 / 80 mm long for 2200 / 1800 / 1500 mAh, 36 x 33.5 mm section (original). Real 4S 2200 packs are about 105 x 35 x 30 mm (unverified typical). The CG of a tri sits behind the geometric centre of the front motors, so the battery is slid until it hovers level hands-off |
| CG / centre of thrust | with equal thrust per motor the centre of thrust is at x = (60 + 60 - 150)/3 = **-10 mm** (10 mm behind the frame centre); the CG must be there for equal throttles |

### 2.5 Tail tilt mechanism and the yaw-by-thrust-vectoring physics

Mechanism: a hinge block at the end of the boom; the tail motor sits on a 30 x 30 mm plate that rotates about the
**boom axis (the x axis)**; a metal-gear micro servo on the side of the boom drives it through a horn and pushrod
(original). RCExplorer uses its own "indestructible tilt mechanism", zip-tied on as a mechanical fuse [10].

Servo travel (real reference): RCExplorer sets the tail to **40 deg each side of level** (servo setup tool: 50 deg
min, 90 deg mid, 130 deg max from the horizon) [9]. The original clamps the drawn tilt at +-40 deg and commands
30 deg per full yaw stick; in its yaw demo the tail tilts up to about +-25 deg. In real flight the tilt is
usually only a few degrees except during fast yaw.

Sign convention (for the figure and the sim). Let delta be the tilt of the tail motor's thrust axis toward **+y
(left)**. The thrust axis is `(0, sin delta, cos delta)`, i.e. a rotation of the motor about +x by **-delta**.
With the tail motor at r = (-l, 0, 0), l = 150 mm, thrust T_t:

```
torque = r x F = (-l,0,0) x (0, T_t sin d, T_t cos d)
  tau_x (roll)  = 0
  tau_y (pitch) = l * T_t * cos d      (tail lift: nose-down moment, balanced by the front motors)
  tau_z (yaw)   = -l * T_t * sin d     (thrust tilted LEFT pushes the tail left -> nose RIGHT = yaw right)
```

So **"yaw right -> the tail motor tilts its thrust to the left"** (the original's servo-test message is correct).
Yaw authority per degree near hover: with T_t about AUW/3 = 218 g (2.14 N) and l = 0.150 m, `dtau_z/d delta =
0.32 N m per rad = 5.6 mN m per degree`.

Couplings the figure/sim should show:
1. **Lift loss**: vertical tail thrust is `T_t cos delta` (-0.6 % at 6 deg, -13 % at 30 deg, -23 % at 40 deg), so a
   hard yaw drops the tail; the pitch PID raises M1 to hold attitude.
2. **Side force**: `T_t sin delta` also pushes the whole craft sideways (a small lateral drift during sustained yaw).
3. **Tail-motor reaction torque**: the tail prop's drag torque Q acts on the frame about the tilted motor axis:
   for a CCW tail prop the frame gets `-Q (0, sin d, cos d)`, i.e. a constant yaw-right torque `Q cos d`. It must be
   cancelled by a steady trim tilt of `delta0 = -asin(Q / (l T_t))` (thrust tilted slightly right). For a 5"
   prop `Q/T` is about 0.010 m (estimate from typical C_Q/C_T ~ 0.08 x D 0.127 m, unverified), giving
   **delta0 ~ 4 deg**. The trim changes with throttle (punch-outs yaw the tri until the PID catches up); that is
   what Triflight's tail-motor compensation addressed and what stock Betaflight leaves to the yaw PID
   (`mixerTricopterMotorCorrection()` returns 0 in 2026.6.2 [5]).
4. **Servo speed and gearing**: the servo is a rate-limited actuator (about 0.05-0.1 s per 60 deg for a digital
   micro servo, unverified); yaw response is limited by it, which is why tri yaw P/I need tuning and why
   Betaflight offers `servo_lowpass_hz` for tail-boom resonance [12].
5. **Gyroscopic torque**: tilting a spinning prop quickly produces a precession torque about the third axis
   (pitch); small but visible as a twitch on fast yaw (qualitative, unverified magnitude).

## 3. The original's catalogue, sanity-checked

iynk keeps the calculator identical (stock `calc()` with `kThrust 0.85`, `gPerW 6.8`, `minTW 3.5`, `n = 3`).
Numbers are not changed here; only flagged.

### 3.1 Batteries

| Key | Original | Real-world check | Verdict |
|---|---|---|---|
| `4s2200` * | 4S 2200 mAh, 250 g, $34 | typical 4S 2200 mAh 45-75C packs weigh about 230-260 g, $25-40 (unverified range) | OK |
| `4s1800` | 4S 1800 mAh, 210 g, $30 | typical 190-215 g; RCExplorer's recommended Mini Tri pack is 4S 1800 35C+ [9] | OK |
| `4s1500` | 4S 1500 mAh, 182 g, $28 | typical 165-185 g (unverified range) | OK |

### 3.2 Motors

| Key | Original | Real-world check | Verdict |
|---|---|---|---|
| `2306-2450` * | 2306 2450KV, 32 g, $20, 4S | 2306 2400-2450KV is a standard 4S 5" size; 30-34 g (unverified range). Calc: 1118 g/motor full thrust | plausible: a 2205 2300KV already makes 1050-1155 g on 4S with 5" tri-blades [21], so a 2306 2450KV making more (about 1.2-1.4 kg, unverified, no table fetched) means the calc is if anything conservative |
| `2207-2150` | 2207 2150KV, 34 g, $22, 4S | 2207 at ~2150KV is a valid 4S size, 33-36 g (unverified). Calc gives it the **lowest** thrust (861 g) because the model only uses KV x V, not stator size | the "bigger motor, less thrust" result is a model artefact on 4S; real full-throttle thrust is set mostly by RPM, so a lower KV does give somewhat less, but 23 % less than the 2205 is too much (unverified) |
| `2205-2300` | 2205 2300KV, 28 g, $16, 4S | EMAX RS2205 2300KV is the exact motor RCExplorer recommended for the Mini Tri [9]; about 30 g with wires [21]. Measured on 4S: HQ 5040x3 **1050 g at 25.0 A**, Gemfan 5045x3 **1155 g at 27.3 A** (100 %), 411-417 g at 5.3-5.4 A (50 %) [21]. Calc: 985 g | OK; calc thrust 6-15 % low, mass 2 g light |

### 3.3 Props

| Key | Original (pf, eff, g) | Check | Verdict |
|---|---|---|---|
| `5x4.3x3` * | 1.00, 1.00, 4.4 g, $4 | 5 x 4.3 x 3 props weigh 4-4.5 g (unverified) | OK |
| `6x4x2` | 1.08, 1.15, 5 g | a 6x4 two-blade is the classic tri prop (Mini Tri used 6 x 4.5 [9]) and is more efficient; but on a 2450KV 2306 at 4S a 6" prop loads the motor heavily (hot motor, 35-45 A bursts, unverified) | description "efficient" true for hover; flag that 6" on 2450KV x 4S overloads 30 A ESCs at full throttle |
| `5x5x3` | 1.10, 0.88, 4.8 g | higher pitch = more thrust at speed, more current | OK |

The design step labels every one of the 27 combinations "Parts match. Good all-round build." (T:W 3.90-6.27).

### 3.4 Fixed parts

| Id | Original | Check | Verdict |
|---|---|---|---|
| `FRAME` | Y frame, 190 g, $45 | V4 201 g with FC/PDB/tilt [11]; Baby Tri 84.8 g [10] | OK for this size |
| `ESC` | 3 x 30 A BLHeli_S, 21 g, $36 | single 30 A BLHeli_S ESCs are 5-8 g each without wires (unverified). BLHeli_S firmware is discontinued; current BLHeli_S hardware runs **Bluejay** (bidirectional DShot, RPM telemetry) | **flag**: the calc's own max current is 113 A / 3 = **37.8 A per ESC**, above the 30 A rating; real 2306 2450KV on 4S 5" peaks around 30-35 A (unverified) |
| `FC` | F4 FC + PDB, 8 g, $35 | a 30 x 30 F405 FC alone weighs 7-10.5 g (SpeedyBee F405 V4: 10.5 g [14]); with a PDB 12-20 g (unverified) | slightly light; harmless |
| `TAILSERVO` | metal-gear servo + tilt mount, 22 g, $14 | a metal-gear digital micro servo is about 10-13 g (unverified), plus mount, hinge and pushrod ~8-10 g | OK |
| `CAM` | analog FPV camera, 7 g | micro analog cams 5-9 g | OK. Uptilt inconsistent in the original: lens drawn ~18 deg, FPV `camTilt` 22, diagram "15 deg", lesson "15-20 deg"; pick one (suggest **20 deg**) |
| `VTX` | 5.8 GHz VTX + antenna, 9 g; diagram "400 mW" | OK; Windestal notes "Most countries only allow up to 25mW if you don't have a HAM licence" [10] | OK, mention the legal limit |
| `RX` | ELRS 2.4 GHz, 2 g | OK | OK |
| `XT60` | pigtail + low-ESR cap, 12 g; diagram "1000 uF 35 V" | 35 V gives 2x margin over 16.8 V (4S full) | OK |
| `TOP` | top plate + standoffs + screws, 20 g | OK | OK |
| `STRAP` | strap + pad, 5 g | OK | OK |

Other flags from the research doc: the mechanical cost counts `ceil(3/2) = 2` props for a three-prop craft (should be
3 props, or 2 packs of 2); the race panel says "5 gates" but the course has 6; the pirouette never ends.

## 4. Electronics and wiring

### 4.1 Parts

| Function | Typical part | Notes |
|---|---|---|
| FC | F405 (STM32F405) 30.5 x 30.5 mm, M3/M4 holes, soft-mounted, arrow forward | e.g. SpeedyBee F405 V4 FC: 30.5 x 30.5 mm (4 mm holes), 10.5 g, 8 motor outputs, one servo pad `S9`, 5 V 3 A BEC, 9 V 3 A BEC [14] |
| ESCs | 3 single 30 A ESCs (one per arm, under the prop), BLHeli_S hardware with **Bluejay**, or AM32 / BLHeli_32 | DShot300/600; bidirectional DShot for the RPM filter; 4-in-1 ESCs are a poor fit (only 3 outputs used, wires to the tail run back anyway) |
| PDB | separate or integrated (RCExplorer F3FC frame had FC + PDB built in [9]) | battery to 3 ESCs |
| Tail servo | **digital** metal-gear micro servo, 5 V (6 V-capable), 250-333 Hz input; RCExplorer used BlueBird BMS-210DMH (with a position feedback wire for Triflight) [9] | RCExplorer: "a digital servo capable of 250Hz update rate ... Using an analog servo with this setup file will result in a burnt servo" [9] |
| Servo power | 5 V from a BEC with headroom (FC 5 V rail if rated 2-3 A, or a separate BEC) | "Do not draw power from the board with a servo especially on a tricopter" (old Matek F405-mini wiki note; modern FCs with 3 A BECs can, if rated) [15] |
| Receiver | ExpressLRS 2.4 GHz, CRSF protocol on a full UART (UART2 on the SpeedyBee) | `serialrx_provider = CRSF` |
| Video | analog camera + 5.8 GHz VTX with SmartAudio/Tramp on a UART TX, or a digital air unit with MSP DisplayPort | |
| GPS / compass | optional (UART6 + I2C on the SpeedyBee); RCExplorer: GPS "is possible ... not a turnkey solution" [10] | |
| Capacitor | low-ESR 1000 uF 35 V on the battery pads (4S); 50 V for 6S | |
| Buzzer | 5 V active buzzer on BZ+/BZ- (RCExplorer: "highly recommended") [9] | |

### 4.2 Pad / output map on a named FC: SpeedyBee F405 V4 (Betaflight target `SPEEDYBEEF405V4`)

From the target `config.h` [14]:

| Function | Pad | MCU pin | Timer (F405) | Notes |
|---|---|---|---|---|
| M1 (tail motor ESC signal) | M1 | PB6 | TIM4 | 8-pin connector / bottom pad |
| M2 (front right) | M2 | PB7 | TIM4 | |
| M3 (front left) | M3 | PB0 | TIM3 | |
| (M4, unused on a tri) | M4 | PB1 | TIM3 | leave unconnected |
| **Tail servo** | **S9** | **PB15** | TIM12 (its own timer) | `SERVO1_PIN PB15` is the board default, so **no `resource` remap is needed** on this board |
| Receiver (ELRS CRSF) | T2 / R2 | PA2 / PA3 | | default serial RX UART |
| VTX SmartAudio | T1 or T3 | PA9 / PC10 | | |
| GPS | T6 / R6 + SDA/SCL | PC6 / PC7 | | |
| LED strip | LED | PA8 | | |
| Buzzer | BZ+ / BZ- | PC15 | | |
| 5 V | 5V pads | | | 3 A total [14] |

Why a separate timer matters: a servo runs at 50-333 Hz PWM, the motors at DShot; outputs sharing a hardware timer
must share a protocol and rate, so the servo must sit on a timer no motor uses (on the SpeedyBee, TIM12). Older
Matek F405-mini notes: "Motor pin 4 will not work for tail servo due to timing issue" [15]. On boards without a
servo pad, remap a free pad on a non-motor timer with `resource SERVO 1 <pin>` (e.g. RCExplorer's Kakute F4
listing: `resource motor 4 none`, `resource led_strip A02`, `resource servo 1 C08` [10]; board-specific).

### 4.3 Wire colours

| Wire | Colour |
|---|---|
| Battery + / - | red = +, black = - (the XT60 housing has + and - moulded next to the contacts; it is keyed so it only mates one way) |
| Servo lead (JR/Futaba style) | **brown or black = ground, red = +5 V (middle), orange/yellow/white = signal** |
| Motor phases | three wires, any colour (often all black); swap any two to reverse a motor |
| Capacitor | stripe marks **minus** |

### 4.4 Servo and mixer behaviour in Betaflight 2026.6.2 (source-verified)

- Servo rule for TRI: `{ SERVO_RUDDER, INPUT_STABILIZED_YAW, 100, 0, 0, 100, 0 }` (servo 5 <- stabilised yaw, rate
  100 %, speed 0 = unlimited, range 0-100 %) [3].
- Servo input in normal flight = `pidData[FD_YAW].Sum * 0.7` (`PID_SERVO_MIXER_SCALING`); in PASSTHRU it is the raw
  yaw stick [3]. Output = `rate/100 * input + middle`, limited to the servo's min..max.
- Servo defaults: min 1000, middle 1500, max 2000 us, rate 100, forward -1 (none); CLI limits 500-2500 us
  (`PWM_SERVO_MIN/MAX`), rate -100..100 [3][6][7].
- `servo_pwm_rate` default **50 Hz** (range 50-498); set 250-333 for a digital servo. `servo_center_pulse` 1500.
  `servo_lowpass_hz` 0 = off, up to 400 [6]. (The docs' Mixer page still says `servo_lowpass_freq` +
  `servo_lowpass_enable`; those names do not exist in 2026.6.2 settings.c, trust the source [6] over [12].)
- `tri_unarmed_servo` default **ON** [3]: the servo keeps working while disarmed. When OFF the servo signal is cut
  completely while disarmed (`servo[SERVO_RUDDER] = 0`) [3]. Because `pid_at_min_throttle` defaults ON, the yaw
  P/D/F terms run while disarmed, so with props off you can see the servo react to the yaw stick and to turning the
  frame by hand; with stick arming the yaw stick is not reset for a tri when `tri_unarmed_servo` is ON (`src/main/fc/core.c`, same tag).
- The Triflight-era tricopter extras (tail motor compensation, servo feedback, tail tune) are **not** in Betaflight:
  `mixer_tricopter.c` / `servos_tricopter.c` are stubs (`mixerTricopterMotorCorrection()` returns 0); only a
  yaw-saturation check (`errorRate > 75`) remains [5]. Those features live in the Triflight fork [19] (old).

## 5. Firmware

### 5.1 Support status (verified)

- **Betaflight 2026.6.2** (current stable, Oct 2026) still supports tricopters: `mixer TRI` and `CUSTOMTRI` are in the CLI mixer list
  [2][6][12], servo support (`USE_SERVOS`) and the TRI servo path are in the source [3][5].
- **But servos are not in a default cloud build.** `USE_SERVOS` is only defined for classic (non-cloud) builds or
  when `USE_WING` is set [7]; the cloud build option "Servos" (`USE_SERVOS`) defaults to **false** [8]. When
  flashing with the Betaflight App, tick **Servos** in the build options (`USE_WING` also pulls it in, but is not
  needed). Without it, `servo` and `smix` do not exist and the TRI mixer has no yaw output at all (motors carry no
  yaw, see 2.2): do not fly it.
- **INAV 9.1.0** (stable, 2026-07-09; 10.0.0-rc2 in test) also supports tricopters: `platform_type = TRICOPTER`
  ("Currently only MULTIROTOR, AIRPLANE and TRICOPTER types are implemented") and `tri_unarmed_servo` (default ON)
  [16][17][18]. INAV is the choice if GPS navigation (RTH, position hold, missions) matters.
- ArduPilot Copter also flies tricopters [22]: `FRAME_CLASS = 7` ("Tri"); tail servo on output 7 by default, or
  any output with `SERVOx_FUNCTION = 39`; `SERVO7_MIN` / `SERVO7_MAX` (travel before binding), `SERVO7_TRIM` (the
  PWM that stops the tail spinning), `SERVO7_REVERSED` (0/1); `MOT_YAW_SV_ANGLE` = the tail servo's maximum lean
  angle in degrees (default **30**), used to compensate the tail motor's thrust for lean. ArduPilot's tri motor
  numbering differs from Betaflight's (unverified: motors 1/2 front, 4 tail).

### 5.2 Initial setup (Betaflight 2026.6.2, SpeedyBee F405 V4, ELRS on UART2, SmartAudio on UART1)

```
# flash with the "Servos" build option ticked
mixer TRI                          # M1 tail, M2 front right, M3 front left, servo 5 on SERVO 1
set align_board_yaw = 0            # FC arrow toward the nose (180 if mounted backwards)
set motor_pwm_protocol = DSHOT600
set dshot_bidir = ON               # RPM telemetry for the RPM filter (Bluejay/AM32/BLHeli_32)
set motor_poles = 14
serial UART2 64 115200 57600 0 115200     # 64 = serial RX
set serialrx_provider = CRSF
serial UART1 2048 115200 57600 0 115200   # 2048 = VTX SmartAudio
set servo_pwm_rate = 333           # digital servo; leave 50 for an analog servo
set tri_unarmed_servo = ON         # default ON: servo works on the bench
servo 5 1000 2000 1500 100 -1      # index min max middle rate forward(-1 = off)
save
```

Syntax checks [6]: `servo <index> <min> <max> <middle> <rate> <forward>` takes exactly six integers; middle must
lie between min and max; rate -100..100 (a negative rate also reverses). `mixer <name>` / `mixer list`. `serial`
and function bits as in `quad5.md` 5.3 [20].

### 5.3 Servo centring, travel and reversal

```
# 1. centre: adjust middle until the tail motor plate is level (props off, servo powered)
servo 5 1000 2000 1520 100 -1      # example: +20 us trim
# 2. travel: set min/max so the tilt reaches about +-40 deg without binding
servo 5 1100 1950 1520 100 -1      # example endpoints
# 3. direction: yaw stick RIGHT must tilt the tail thrust to the LEFT
smix reverse 5 2 r                 # reverse servo 5 for input 2 (stabilised yaw)
smix reverse 5 2 n                 # back to normal
smix reverse                       # print reversals
save
```

`smix reverse <servo> <source> r|n` is real syntax and the docs' own tricopter example is exactly `smix reverse 5 2
r` [6][12]; it is stored per profile [12]. Equivalent alternative: a negative servo rate (`servo 5 ... -100 -1`).
Full rule syntax: `smix <rule> <servo> <source> <rate> <speed> <min> <max> <box>`; `smix reset`, `smix load <mixer>`
[6]. Mechanical reversal (flip the servo or the horn side) also works.

INAV equivalent [17][23]: `smix <n> <servo_index> <input_id> <weight> <speed> <logic_condition_id>`. The INAV
Configurator "Tricopter" preset (platform TRICOPTER) uses the same motor mix as Betaflight (REAR 1.0/0/1.333/0,
RIGHT 1.0/-1/-0.667/0, LEFT 1.0/1/-0.667/0) and one servo rule `RUDDER <- STABILIZED_YAW, 100 %, speed 0`, with
the configurator's `RUDDER` index **4** [23], i.e. `smix 0 4 2 100 0 -1` in the CLI (CLI form inferred from the
preset, unverified on hardware). INAV docs: "The absolute value of the index is not important, what matters is only
the relative difference between the used indexes" [17]. Reverse with weight -100 (or `servo` rate negative).

### 5.4 Flight modes used in the original, with the correct current CLI

The original's craft modes: `alt` (Altitude hold), `angle`, `acro`, `race`, `yaw` (yaw demo). Correct forms
(2026.6.2), all names checked in settings.c / msp_box.c [6][20]:

```
# Angle (self-level): aux mode ANGLE = permanent ID 1
aux 1 1 1 1300 2100 0 0
set angle_limit = 60               # 10-80 deg, default 60
set angle_p_gain = 50              # 0-200, default 50 (was p_level / angle_level_strength)
# Altitude hold (2025.12+, needs a barometer and/or GPS): aux ALTHOLD = ID 3
aux 2 3 2 1700 2100 0 0
set alt_hold_deadband = 15         # 0-70 % of stick (default 20)
# Acro: no mode, it is what the FC does with ANGLE/HORIZON/ALTHOLD off
set rates_type = ACTUAL
set roll_rc_rate = 7               # 70 deg/s centre
set roll_srate = 54                # 540 deg/s at full stick
# Tri yaw tuning (defaults: p_yaw 45, i_yaw 80, d_yaw 0, f_yaw 120)
set p_yaw = 60
set i_yaw = 90
set yaw_rc_rate = 7                # ACTUAL: 70 deg/s centre (default)
set yaw_srate = 40                 # example: gentle 400 deg/s max yaw (unverified as a "typical" tri value)
# Race timer on the OSD
set osd_tim_1_pos = 2103           # visible; timer config is the packed osd_tim1 (see quad5.md 5.6)
save
```

### 5.5 Failsafe, OSD, VTX, RPM filter, accelerometer, arming

Identical to the quad sheet `docs/facts/quad5.md` (same 2026.6.2 source) [20]; the tri-specific points:

- **Failsafe**: `failsafe_procedure` = `DROP` (default) / `AUTO-LAND` / `GPS-RESCUE`; `failsafe_delay` 15 (1.5 s).
  When disarmed by failsafe the servo keeps moving if `tri_unarmed_servo = ON` (harmless).
- **OSD**: `osd_tim1`/`osd_tim2` packed timers + `osd_tim_1_pos`; statistics via `osd_stat_bitmask` (no
  `osd_timer_1` or `osd_stat_max_spd` settings exist).
- **VTX**: `vtxtable ...` then `set vtx_band`, `set vtx_channel`, `set vtx_power`, `vtx_low_power_disarm`.
- **RPM filter**: `set dshot_bidir = ON`, `rpm_filter_harmonics = 3` (default), `motor_poles = 14`. It filters only
  motor noise; the servo/boom resonance needs `servo_lowpass_hz` instead [12].
- **Accelerometer calibration**: Setup tab "Calibrate Accelerometer" with the frame level (on a tri, level the
  frame, not the tilted tail); sticks: throttle high + yaw left + pitch low. Arming flag `NO_ACC_CAL` if never done
  and an acc mode is configured.
- **Arming-disable flags** (2026.6.2): `NOGYRO, FAILSAFE, RXLOSS, NOT_DISARMED, BOXFAILSAFE, RUNAWAY, CRASH,
  THROTTLE, ANGLE, BOOTGRACE, NOPREARM, LOAD, CALIB, CLI, CMS, BST, MSP, PARALYZE, GPS, RESCUE_SW, DSHOT_TELEM,
  REBOOT_REQD, DSHOT_BBANG, NO_ACC_CAL, MOTOR_PROTO, FLIP_SWITCH, ALT_HOLD_SW, POS_HOLD_SW, AUTOPILOT_SW,
  ARM_SWITCH`; `small_angle` default 25 deg. There is no servo-specific pre-arm check: a reversed or dead servo
  arms happily.

### 5.6 Motor direction reversal

- ESC side (changes the real spin): Betaflight App Motors tab motor-direction tool (DShot commands, props off), ESC
  Configurator / BLHeli_32 / AM32 "Motor Direction", or swap two phase wires.
- FC side: `yaw_motors_reversed` exists but does nothing useful on a tri (TRI yaw column is 0). Spin direction on a
  tri is about cancelling torque, not about the mixer.

### 5.7 Errors in the original's CLI and the correct form

| Original | Problem | Correct (2026.6.2) |
|---|---|---|
| `mixer TRI` | valid | keep (needs a Servos build) |
| `set tri_unarmed_servo = ON` | valid, already the default | keep, comment "default ON" |
| `servo 5 1000 2000 1500 100 -1` | valid; comment "min max centre rate" misses the 6th field (forward channel, -1 = off) | keep, fix the comment |
| `smix reverse 5 2 r` | valid (servo 5, source 2 = stabilised yaw) | keep |
| `set yaw_motors_reversed = OFF` | valid but has no effect on a tri | drop or comment "no effect on TRI" |
| `set p_yaw = 60` "tri yaw needs more P than a quad" | valid (default 45) | keep; the claim is a tuning rule of thumb (unverified) |
| `set i_yaw = 90` "tails need lots of I" | valid (default 80) | keep |
| `set yaw_rc_rate = 90` "gentle, cinematic yaw" | under the default ACTUAL rates this is **900 deg/s centre sensitivity**, not gentle; it is only 0.90 under BETAFLIGHT rates | `set yaw_rc_rate = 7` (default) and lower `yaw_srate` |
| `set alt_hold_throttle_deadband = 15` | no such setting | `set alt_hold_deadband = 15` |
| `aux 1 ANGLE ...`, `aux 2 ALTHOLD ...` | aux takes numeric IDs | `aux 1 1 1 1300 2100 0 0`, `aux 2 3 2 1700 2100 0 0` |
| `set p_level = 50`, `set i_level = 50` | removed | `set angle_p_gain = 50`, no `i_level` |
| `set angle_limit = 38` | valid (10-80) | keep |
| `set roll_rc_rate = 100`, `set roll_srate = 70` "~540 deg/s" | wrong under ACTUAL | `set roll_rc_rate = 7`, `set roll_srate = 54` |
| `set osd_timer_1 = ON`, `set osd_stat_max_spd = ON` | no such settings | `osd_tim1` / `osd_tim_1_pos`, `osd_stat_bitmask` |
| `set align_board_yaw = 0`, `save` | valid | keep |
| log "$ servo tab: sweep servo 5" | the Betaflight App Servos tab sets ranges/reversal and shows live values; there is no "sweep" command (unverified UI detail) | "move the yaw stick with props off and watch the tail" |

## 6. Safety tests

| Test | How | Tool | What it catches |
|---|---|---|---|
| **Smoke stopper** | an inline current limiter (a resettable fuse or a 12 V bulb in series) between battery and craft for the very first power-up; a short circuit lights the bulb / trips it instead of burning the ESCs/FC | hardware | solder bridges, reversed XT60, shorted ESC |
| **Servo direction test** (props off) | power up, disarmed (`tri_unarmed_servo` ON): push yaw stick **right** -> the tail motor must tilt so its thrust points **left** (top of the motor leans left seen from behind); then turn the frame by hand nose-right -> the servo tilts the other way (it fights the turn) | radio + eyes; Betaflight App Servos tab live view | reversed servo (instant pirouette on take-off), wrong `smix reverse` |
| **Servo centre and travel** | with a level tool / protractor: tail level at middle, about +-40 deg at the ends without binding [9] | `servo 5 ...` | binding linkage that stalls (hot servo, brown-out), offset trim |
| **Motor direction test** (props off) | Motors tab, spin M1, M2, M3 one at a time: M1 tail CCW, M2 front-right CW, M3 front-left CCW | Betaflight App Motors tab | wrong order (wiring), wrong spin |
| **Accelerometer calibration** | frame level, Setup tab "Calibrate Accelerometer" | Betaflight App | drift in Angle/Alt hold |
| **Pre-arm checks** | Setup tab / `status` arming flags; arm with props off | Betaflight App / CLI | RX loss, board tilt, throttle not low, calibration |
| **Failsafe test** | props off, armed, radio off: motors stop | radio | wrong RX failsafe setting |
| **Hover trim** | first hover low: if it yaws slowly, trim servo middle; if it pitches, slide the battery | flight | tail torque trim, CG |

Compass calibration: only for INAV/ArduPilot builds with a magnetometer (rotate the craft about all axes in the
configurator's calibration window, away from metal).

## 7. Flight characteristics (Fig. 12 default build)

| Quantity | Original calc | Real-world estimate |
|---|---|---|
| AUW | 655 g | Mini Tri about 660 g (user report, unverified) [9] |
| T:W | 5.1 : 1 | 5-6 : 1 plausible for 3 x 2306 on 4S |
| Hover throttle | 44 % | 35-45 % (unverified) |
| Hover current | 6.5 A | about 8 A: measured RS2205 + 5" tri-blade efficiency is 4.8 g/W at 50 % throttle (417 g / 87.5 W) [21], somewhat better at hover load (~218 g per motor), so 5-6 g/W -> 655 g / 5.5 g/W = 119 W / 14.8 V = 8 A (estimate); the calc's 6.8 g/W is optimistic |
| Hover time (4S 2200, 80 %) | 16.2 min | about 11-14 min (unverified) |
| Freestyle time | 6.8 min | 5-8 min (unverified) |
| Max current | 113 A | about 75-105 A: 25-27 A per RS2205 at full throttle [21], 30-35 A per 2306 (unverified) |
| Top speed | n/a | Mini Tri "almost 160 km/h" (maker's claim) [9]; 100-130 km/h typical (unverified) |
| Yaw feel | | coordinated, plane-like; "like an overpowered rear-drive car" [9] |

**Motor-out behaviour**: a tricopter has no redundancy. Losing the tail motor: the tail drops, the craft flips
backward/over within a fraction of a second. Losing a front motor: it rolls toward that side and falls. Losing the
servo (stripped gears, dead signal, brown-out): a servo stuck off-centre gives a constant yaw spin; stuck near
centre the craft still flies but cannot yaw and the tail torque turns it slowly.

## 8. Real failure modes

| Failure | Cause | What the pilot sees |
|---|---|---|
| **Reversed tail servo** | servo/horn mounted the other way or wrong `smix reverse` | on take-off it starts yawing and accelerates into an ever-faster pirouette: the yaw loop pushes the wrong way (positive feedback) |
| Stripped servo gears / slipped horn | crash, plastic gears | sudden yaw spin or no yaw; jitter |
| Servo brown-out | servo on a weak 5 V rail, stall current | FC reboots mid-air (falls) or the servo stops |
| Analog servo at high `servo_pwm_rate` | 333 Hz into an analog servo | hot, buzzing, burnt servo [9] |
| Tail-boom / servo oscillation | soft boom, linkage slop, high yaw gains | wagging tail, yaw wobble; fix with `servo_lowpass_hz`, stiffer linkage [12] |
| Desync | cheap ESC timing, high KV, hard punch | one motor stutters: a front motor -> roll flip, the tail -> backflip |
| Reversed motor or swapped props | wrong spin / wrong prop | flip on take-off; a front pair spinning the same way gives a strong constant yaw the servo cannot trim |
| Wrong board alignment | FC arrow not forward | immediate flip or yaw runaway on take-off |
| Missing capacitor | voltage spikes | noisy video, gyro noise, dead ESC/FC |
| Prop wash | descending into own wash | wobble on descents |
| Wrong CG | battery too far forward/back | constant pitch drift; tail motor working much harder than the fronts |
| GPS/compass errors (INAV) | compass near the battery leads | toilet-bowling in position hold |

## 9. Uncertainties

- Real thrust for the three motors was not checked against manufacturer thrust tables (no table fetched); all
  thrust/current real-world figures above are marked unverified.
- Mini Tri arm length and exact front-arm angle were not found; only the Baby Tri's 170 mm motor-to-motor is
  official.
- Battery, servo and ESC masses are typical ranges, not specific product pages.
- The Betaflight App Servos tab UI details (live view, any test feature) were not checked against 2026.6.
- The Q/T ratio and the ~4 deg tail trim are an estimate from typical prop coefficients.
- INAV TRICOPTER preset servo index and default rules were not read from the configurator source.
- ArduPilot tricopter parameter names (yaw servo function) were not checked for this sheet.
