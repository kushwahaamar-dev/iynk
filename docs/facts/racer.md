# Fact sheet: 5-inch racing quad on Betaflight (Drone Lab Fig. 05, `racer`)

Status: firmware facts verified against Betaflight **2026.6.2** source code (fetched from the tag on 2026-10-24)
and the betaflight.com docs; race-rule facts from MultiGP pages; hardware figures from manufacturer/retailer
spec listings. Anything not checked in time says "(unverified)". Companion sheet for the freestyle quad:
`docs/facts/quad5.md` (same firmware; many of the firmware tables below were cross-checked with it).

## 0. Header

**Craft class:** 5-inch (127 mm prop) **gate-racing** FPV quadcopter: stretched-X carbon frame, 4S (or 6S) race
LiPo, 2207 motors, analog 5.8 GHz video on Raceband at 25 mW, ExpressLRS 2.4 GHz control, Betaflight, flown in
Acro mode through a MultiGP-style gate track.

**Real products / reference builds it represents:**

| Reference | What it is | Link |
|---|---|---|
| MQC SXR (Stretched X Racer) | 5" stretched-X race frame: 218 mm diagonal, 138 mm left-right x 168 mm front-rear, 75 g dry [18] | https://www.getfpv.com/mqc-sxr-stretched-x-racer.html |
| RDQ Mach 1 Stretch X | MultiGP Spec-class frame: 4 mm arms, 3 mm base plate, 2 mm top plate, 68 g (race arms) / 82 g (normal arms) with hardware [19] | https://www.getfpv.com/rdq-mach-1-stretch-x-frame-5-in-normal-arms.html |
| MRM 5" Stretch Reaper | 217 mm stretched-X race frame, 5 mm arms, 80 g [20] | https://www.getfpv.com/mrm-5-stretch-reaper-217mm-fpv-racing-frame-blue.html |

Typical race build: a 210-220 mm stretched-X frame (65-85 g), four 2207 motors at ~2400-2700 KV on 4S (or
~1900-2000 KV on 6S), 5" tri-blade race props, an F4/F7 flight controller on a 45-55 A 4-in-1 ESC, an ExpressLRS
receiver, a nano analog camera and a small race VTX (25 mW at events), addressable LEDs on the rear arms, and a
4S 1300-1500 mAh pack (or 6S 1000-1100 mAh).

**What it is and what it is for.** A race quad is a 5-inch FPV quad stripped down to do one thing: get round a gate
track as fast as possible. It is lighter than a freestyle quad (about 380-450 g with the pack versus 600-700 g),
lower, and has a stretched-X frame (longer than it is wide) so the rear props sit in cleaner air when the quad is
pitched hard forward at full throttle. The pilot flies in Acro (rate) mode from analog goggles, because analog
video has the lowest, most predictable latency; every pilot in a heat is put on a separate Raceband channel at
25 mW so up to 4-8 pilots can fly together. LED strips in each pilot's colour let spotters and timers tell quads
apart. Laps are timed by a lap timer that listens to each VTX (RotorHazard, LapRF) or by IR transponders.

## 1. Sources

Firmware source (Betaflight tag 2026.6.2; files downloaded and grepped on 2026-10-24):

1. Betaflight releases (2026.6.2 published 2026-09-16; 2025.12.5 and 4.5.5 on 2026-06-28): https://github.com/betaflight/betaflight/releases
2. `src/main/cli/settings.c` (every `set` name, range, lookup table): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/cli/settings.c
3. `src/main/cli/cli.c` (`vtxtable`, `led`, `color`, `vtx`, `serial`, `aux` parsers): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/cli/cli.c
4. `src/main/io/ledstrip.c` + `ledstrip.h` (LED codes, default colours, RACE profile, VTX-frequency colour): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/io/ledstrip.c
5. `src/main/drivers/vtx_table.h`, `drivers/vtx_common.h`, `io/vtx.c` (table limits, pit-mode frequency, low-power-disarm): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/drivers/vtx_table.h
6. `src/main/flight/pid.c` (PID-profile defaults: TPA, anti-gravity, launch control, throttle boost, feedforward): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/pid.c
7. `src/main/flight/mixer_init.c` (QuadX motor table) and `flight/mixer.c` (`yaw_motors_reversed`): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/mixer_init.c
8. `src/main/fc/runtime_config.c` (arming-disable flag names) and `fc/core.c` (arming checks): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/fc/runtime_config.c
9. `src/main/msp/msp_box.c` (mode names and permanent IDs for `aux`): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/msp/msp_box.c
10. `src/main/osd/osd.h`, `osd.c` (timer packing, stats bits): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/osd/osd.h

Official docs:

11. Betaflight wiki guides (VTX / vtxtable, LED Strip, DShot RPM Filtering, Reversed motor direction, Failsafe, Modes, Arming Sequence and Safety) and app tabs (Motors, Setup, VTX, LED Strip): https://betaflight.com/docs/wiki/guides/current/ and https://betaflight.com/docs/wiki/app/
12. Betaflight 2025.12 / 2026.6 release notes and calendar-versioning blog: https://betaflight.com/docs/wiki/release/Betaflight-2026-6-Release-Notes , https://betaflight.com/blog/2025/09/01/Calendar-Versioning-Change
13. ExpressLRS "Configuring the FC": https://www.expresslrs.org/quick-start/receivers/configuring-fc/
14. SpeedyBee F405 V4 board doc (target `SPEEDYBEEF405V4`, used as the named pad map): https://betaflight.com/docs/wiki/boards/current/SPEEDYBEEF405V4

Race rules and timing:

15. MultiGP race course obstacles (gate, tower, hurdle, dive gate dimensions): https://dev.multigp.com/multigp-drone-race-course-obstacles/
16. MultiGP shop, Standard Start-Finish Gate 5'x5': https://shop.multigp.com/product/standard-multigp-start-finish-gate-5x5/ ; MultiGP Universal Time Trial track rules (2017, "standard issue MultiGP Racing Gates or another gate with a 5'x5' square opening"): https://www.multigp.com/wp-content/uploads/2017/05/MultiGP-universal-time-trial-track1.pdf
17. MultiGP rules text, "10.2.1 Global Qualifier Race Format: Fastest 3 Consecutive Laps, fixed time of 2 min, minimum 5 / maximum 10 rounds" (dev-site copy): https://www.multigp.com/?p=61671 ; ZippyQ and bracket formats on event pages, e.g. https://dev.multigp.com/races/view/?race=23691
21. RotorHazard timer (RX5808 receivers, Arduino/STM32 nodes, Raspberry Pi server, up to 16 racers, RSSI-based): https://github.com/RotorHazard/RotorHazard

Hardware:

18. MQC SXR listing: https://www.getfpv.com/mqc-sxr-stretched-x-racer.html
19. RDQ Mach 1 Stretch X listing: https://www.getfpv.com/rdq-mach-1-stretch-x-frame-5-in-normal-arms.html
20. MRM 5" Stretch Reaper listing: https://www.getfpv.com/mrm-5-stretch-reaper-217mm-fpv-racing-frame-blue.html ; XBEE MCK Light stretched-X (210 mm, 5 mm arms, 65-66 g): https://www.getfpv.com/xbee-mck-light-5-frame-stretched-x.html
22. T-Motor F60 Pro V 2550 KV spec (4S rated, 12N14P, 4 mm shaft, peak 50.7 A, 825 W): https://www.racedayquads.com/products/t-motor-f60-pro-v-2550kv-motor-gray ; F60 Pro V range spec: https://www.getfpv.com/t-motor-f60-pro-v-motor-1750kv-1950kv-2020kv-2550kv.html
23. MiniQuadTestBench, Cobra Champion 2207 2600 KV (over 1700 g on a Lumenier Butter Cutter 5x5x3 at about 44 A): https://www.miniquadtestbench.com/cobra-champion-2207-2600kv.html
24. Racerstar Sprog X 2207 2400 KV listing (max thrust 1368 g on 4S with a 6" prop, 41 A max continuous): https://www.getfpv.com/racerstar-sprog-x-2207-2400kv-motor-set-of-5-red.html
25. End of BLHeli_32 support (30 June 2024): https://oscarliang.com/end-of-blheli_32 ; ESC Configurator (Bluejay / BLHeli_S / AM32): https://esc-configurator.com
26. Drone Lab research doc, Fig. 05 section: `docs/research/drone-lab-b.md` lines 163-485 (what the original shows); calculator matrix `docs/research/drone-lab-b-calc-matrix.md`.
27. ImmersionRC LapRF 8-Way listing (VTX-energy detection, no transponder): https://www.nextfpv.com/products/immersionrc-laprf-8-race-timing-system
28. I-Lap drone transponder listing (IR, 7-digit ID, 6 m sun / 10 m shade): https://www.getfpv.com/i-lap-drone-transponder.html ; protocol notes: https://hackaday.com/tag/ilap/
29. Tattu R-Line V4 4S 1300 130C listing (150 g +-20 g, 72 x 38 x 25 mm) and 6S 1300 (200 g, 78 x 39 x 38 mm): https://www.getfpv.com/batteries/mini-quad-batteries/tattu-r-line-version-4-0-1300mah-4s-130c-lipo-battery-xt60.html , https://readymaderc.com/products/details/tattu-r-line-v4-1300mah-6s-130c-xt60-lipo
30. ExpressLRS Lua script guide (packet-rate names): https://www.expresslrs.org/quick-start/transmitters/lua-howto/
31. Pyrodrone / Rotorvillage F60 Pro V 1950 KV listings (via search): https://pyrodrone.com/collections/2000-2500kv-motors/products/t-motor-f60-pro-v-1950kv-fpv-drone-motor-grey
32. Betaflight unified target config for SpeedyBee F405 V4 (pins, `SERIALRX_UART` USART2, `ESC_SENSOR_UART` UART5, `MSP_UART` UART4, LED PA8): https://github.com/betaflight/config/blob/master/configs/SPBE/SPEEDYBEEF405V4/config.h
33. `src/main/target/common_pre.h` (RACE_PRO feature pack, LED strip length) and `src/main/flight/imu.c` (`DEFAULT_SMALL_ANGLE`): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/target/common_pre.h

## 2. Geometry (craft frame)

Craft frame: **x forward (nose/camera), y left, z up**, origin at the frame centre on the top face of the bottom
plate, units mm. "Seen from above" = looking down -z.

### 2.1 Frame

| Item | Value | Notes |
|---|---|---|
| Layout | **Stretched-X**: motors on a rectangle longer (x) than wide (y) | Purpose: the rear props sit further behind the front props, so at high forward pitch they ingest less of the front props' wash and the quad "tracks" straight at speed (the original's quiz answer) |
| Motor rectangle (keep the original) | **x = +-86, y = +-70** (172 mm front-rear, 140 mm left-right) [26] | real MQC SXR: 168 x 138 mm [18], within 3 mm |
| Wheelbase (motor-to-motor diagonal) | 2 x sqrt(86^2 + 70^2) = **221.8 mm** | real race frames 210-220 mm (SXR 218 [18], Stretch Reaper 217 [20], MCK Light 210 [20]) |
| Motor radius from centre | 110.9 mm; arm angle 39.1 deg off the x axis | |
| Arms | **4-5 mm** carbon (Mach 1 4 mm [19], Stretch Reaper and MCK 5 mm [20]); ~10-14 mm wide at the motor (unverified) | original draws 12 mm wide, 4 mm thick, from r = 18 to 117 mm [26] |
| Bottom (base) plate | 3 mm carbon (Mach 1 [19]) | original centre plate 120 x 32 x 3 mm [26] |
| Top plate | 2 mm carbon (Mach 1 [19]) | original 92 x 34 x 2 mm on four 20 mm standoffs [26] |
| Standoffs | M3, ~20-25 mm (low: race frames use a nano camera so the stack can be short) (unverified) | original 20 mm |
| Stack mounting | **30.5 x 30.5 mm M3** (most common) or **20 x 20 mm M2/M3** (lighter race stacks) (unverified per frame) | |
| Motor mounting | 16 x 16 mm, M3 (industry standard for 22xx; unverified per frame) | |
| Frame mass with hardware | **65-85 g** (MCK 65-66 g, Mach 1 68/82 g, SXR 75 g dry, Reaper 80 g) [18][19][20] | original: 95 g frame + 14 g top plate/standoffs = 109 g (see 3.4) |

### 2.2 Motors: Betaflight QUAD X order and spin

QuadX mixer in output order (throttle, roll, pitch, yaw) [7]:
`{1,-1, 1,-1} REAR_R`, `{1,-1,-1, 1} FRONT_R`, `{1, 1, 1, 1} REAR_L`, `{1, 1,-1,-1} FRONT_L`.

| Motor (BF number) | Corner | x (mm) | y (mm) | Spin from above, **props in (default, `yaw_motors_reversed = OFF`)** | Spin, **props out (`yaw_motors_reversed = ON`)** |
|---|---|---|---|---|---|
| M1 | rear right | -86 | -70 | **CW** | CCW |
| M2 | front right | +86 | -70 | **CCW** | CW |
| M3 | rear left | -86 | +70 | **CCW** | CW |
| M4 | front left | +86 | +70 | **CW** | CCW |

- This matches the original exactly [26]. Diagonal pairs (M1+M4 CW, M2+M3 CCW) share a direction so yaw torque
  cancels. "Props in" = the front edge of each front disc moves inward toward the camera.
- `yaw_motors_reversed` only changes the yaw mixing sign; it never changes how a motor spins [7]. Spin is set in the
  ESC (DShot direction command / ESC tool) or by swapping two of the three motor wires.
- Racers often fly props out (`yaw_motors_reversed = ON`) to throw less grass/debris at the camera; either works if
  firmware and ESC agree (unverified as a racing norm).

### 2.3 Props, camera, battery, mass

| Item | Value |
|---|---|
| Prop | 5.0-5.1 in (127-130 mm; radius 63.5 mm), pitch 4.3-5.2 in, 3 blades; race props are stiff and higher pitch (e.g. 5x4.8x3, 5x5x3) (unverified per model) |
| Prop clearance (5.0") | side-to-side gap 140 - 127 = **13 mm**; front-rear gap 172 - 127 = **45 mm** (original says ~14 mm side-to-side) |
| Prop hub | 5 mm prop bore on an M5 threaded prop shaft with a lock nut (standard for 22xx); the internal motor shaft can be thinner (T-Motor F60 Pro V: 4 mm shaft, 5 mm prop mount [22]) |
| Prop mass | ~3.8-4.5 g each (unverified) |
| Camera | nano (14 mm) or micro (19 mm) analog camera between two side plates at the nose, lens at about x = +50 to +60, z = 15-20 (unverified) |
| Camera uptilt | **35-50 deg** typical for racing (higher than freestyle because the quad flies fast and nose-down) (unverified range). Original: drawn 48 deg, but the FPV view uses `camTilt` 38 deg - pick one in the rebuild (suggest 40 deg) |
| Battery | on the top plate, centred on x = 0 (slide fore/aft for CG), strap + grip pad; 4S 1300 is about **72 x 38 x 25 mm** (Tattu R-Line V4 [29]; original draws 68 x 32 x 30); XT60 lead to the tail |
| Antennas | VTX antenna out the rear (often a small stubby or dipole for racing); ELRS antennas zip-tied along the rear arms or standoffs |
| AUW | about **380-450 g** with a 4S 1300-1500 pack (unverified range; original computes 443 g, its lesson says "about 420 g") |

## 3. The original's catalogue, sanity-checked

The calculator stays identical (stock `calc()` with `kThrust 1.06`, `gPerW 3.6`, `minTW 9`, max KV x cells 12075)
[26]. Below: what each option claims vs real-world values. The numbers are kept; only descriptions are flagged.

### 3.1 Batteries

| Option | Original | Real-world check | Verdict |
|---|---|---|---|
| `4s1300` "4S 1300 mAh (race)" | 152 g, $28 | Tattu R-Line V4 4S 1300 130C: **150 g (+-20 g), 72 x 38 x 25 mm**, XT60 [29] (GetFPV and ReadyMadeRC agree; one EU retailer lists 143 g, 76 x 38 x 25 mm) | correct |
| `4s1500` "4S 1500 mAh" | 178 g, $30 | 4S 1500 packs about 170-190 g (unverified) | plausible |
| `6s1000` "6S 1000 mAh" | 164 g, $36 | Tattu R-Line V4 6S **1300** is 200 g, 78 x 39 x 38 mm [29]; scaling by capacity a 6S 1000 is ~155-170 g (unverified) | plausible |

### 3.2 Motors

| Option | Original | Real-world check | Verdict |
|---|---|---|---|
| `2207-2500` "2207 2500KV (4S)" | 31 g, $21 | 2207-class 2400-2600 KV race motors: ~30-35 g; T-Motor F60 Pro V 2550 KV (actually a 2207.5 stator) is rated 4S, 12N14P, 4 mm shaft / 5 mm prop mount, peak 50.7 A and 825 W (10 s), **33.8 g with cable** [22] | plausible; 4S rating correct |
| `2306-2700` "2306 2700KV (4S)" | 30 g, $20 | 2306 2600-2800 KV 4S motors exist (unverified product); ~29-32 g | plausible, aggressive on 4S |
| `2207-1950` "2207 1950KV (6S)" | 32 g, $22 | T-Motor F60 Pro V comes in 1950 KV for 6S [22]; retailer specs give 33.9 g with cable, peak 49.3 A (10 s) [31] | plausible |

Calculator thrust vs bench data:
- Default 2500 KV on 4S, 5x4.8x3: `krpm = 2500 x 14.8 / 1000 = 37`, thrust = 1.06 x 1.05 x 37^2 = **1524 g** per motor.
  Real: a 2207 2600 KV makes "over 1700 g" on an aggressive 5x5x3 at ~44 A [23]; a 2207 2400 KV is listed at
  1368 g on a 6" prop on 4S [24] (lower-quality motor). **1524 g is plausible** for 2500 KV on a 4.8-pitch prop.
- 2700 KV on 4S, 5x4.8x3: 1.113 x 39.96^2 = 1777 g (plausible upper end, unverified).
- 1950 KV on 6S, 5x4.8x3: 1.113 x 43.29^2 = 2086 g (likely ~10-20 % high; 6S 1950 KV 5" tests are typically
  1.7-2.0 kg) (unverified).
- "over" rule: 2500 KV x 6S = 15000 > 12075: correct physically (on a full 25.2 V 6S pack the no-load speed would
  be ~63,000 rpm, far past what a 5" prop/motor/ESC survives). The "Desync! 2500KV on 6S overheats" story is
  realistic.
- "weak" rule: 1950 KV on 4S gives 7.1-8.8:1. True to life: a 6S motor on 4S has ~25 % less prop speed and feels
  soft.

### 3.3 Props

| Option | Original | Real-world check | Verdict |
|---|---|---|---|
| `5x4.8x3` "race tri-blade" (pf 1.05, eff 0.95) | 3.8 g, $4 (per pair in the cost formula) | 5x4.8x3 race props exist (e.g. HQProp 5x4.8x3) (unverified product page), ~4-4.5 g | plausible; 3.8 g a little light |
| `5.1x3.6x3` "(smooth)" (pf 0.95, eff 1.05) | 3.9 g | low-pitch 5.1" props are smoother and more efficient but slower; the exact 5.1x3.6x3 size is not a common product (unverified) | idea correct, size questionable |
| `5x5.2x3` "(top speed)" (pf 1.12, eff 0.88) | 4.2 g | 5x5x3 to 5.1x5.x tri-blades are the "top speed" race props [23] | plausible |

Note: the drawing uses a 63 mm radius for every prop; 5.1" is 64.8 mm. Minor.

### 3.4 Fixed parts

| id | Original | Real-world check | Verdict |
|---|---|---|---|
| FRAME "5" stretched-X race frame" | 95 g, $45 | 65-85 g with hardware [18][19][20]; with the separate TOP (14 g) the original carries 109 g of frame | a bit heavy; plausible for a durable race frame |
| ESC "45A 4-in-1 ESC" | 7 g, $45 | 30x30 45 A 4-in-1 boards weigh ~10-15 g; 20x20 boards ~6-8 g (unverified) | 7 g fits a 20x20 board, but the drawing is 30 x 30 - flag |
| FC "F7 flight controller" | 6 g, $39 | 30x30 F7 FCs ~7-10 g, 20x20 ~4-6 g (unverified) | plausible |
| CAM "Nano low-latency camera" | 5 g, $25 | nano analog cameras ~3-6 g (unverified) | plausible |
| VTX "25-200 mW race VTX" | 5 g, $28 | small race VTXs 2-6 g (unverified); 25 mW is the event power | plausible |
| RX "ELRS 2.4 GHz receiver" | 2 g, $18 | ELRS nano receivers 0.5-2 g with antenna (unverified) | plausible |
| LED "Addressable LED strips" | 4 g, $8 | WS2812B strips, ~0.5 g per LED with wire (unverified) | plausible |
| XT60 "XT60 pigtail + low-ESR cap" | 10 g, $4; wiring box says "1000 uF 35 V" | XT60 + 12-14 AWG pigtail + 1000 uF 35 V cap ~ 8-14 g (unverified) | correct parts; 35 V is right for 4S and the minimum for 6S |
| TOP "Thin top plate + standoffs" | 14 g, $6 | 2 mm top plate + 4 alloy standoffs ~10-15 g (unverified) | plausible |
| STRAP | 4 g, $4 | plausible | |

### 3.5 Calculator outputs vs reality (default 4s1300 / 2207-2500 / 5x4.8x3) [26]

| Tile | Original | Real-world | Verdict |
|---|---|---|---|
| All-up weight | 443 g | race quads 380-450 g (unverified) | plausible; but the lesson text "about 420 g" disagrees with 443 |
| Thrust : weight | 13.8 : 1 | 10-15 : 1 typical race (unverified) | plausible |
| Hover throttle | 27 % | 20-30 % (unverified) | plausible |
| Max current | 217 A | 4 x ~40-45 A = 160-180 A full-throttle bursts [23] | ~20 % high; flag in the rebuild text only |
| Hover time | 7.1 min | 6-8 min gentle hover on 4S 1300 (unverified) | plausible |
| "Freestyle time" | 3.0 min | race heats are 2 min fixed (MultiGP GQ) [17]; packs last ~2-3 min at race pace | plausible, but the tile should say "Race time" for this craft |
| Verdict thresholds | warning says "aim for 12:1+", `minTW` = 9 | | inconsistent (builds at 9-12:1 are called "Race-ready") |

## 4. Electronics and wiring

### 4.1 Flight controller and ESC

| Part | Typical race choice |
|---|---|
| FC MCU | STM32F722/F745 (F7) or STM32F405 (F4); original says F7. On F7 + MPU6000/ICM-42688 the PID loop can run 8 kHz (`pid_process_denom` [2]); BMI270 gyros run at 3.2 kHz (unverified) |
| FC mounting | 30.5 x 30.5 mm M3 (or 20 x 20 mm) on rubber grommets, arrow to the nose |
| ESC | 4-in-1, 45-55 A per channel, 3-6S, same footprint as the FC |
| ESC firmware | **AM32** (current open 32-bit), **Bluejay** (BLHeli_S hardware), BLHeli_32 (support ended 30 June 2024 [25]); configure with ESC Configurator [25] |
| Protocol | **DShot600** + **bidirectional DShot** (RPM telemetry for the RPM filter) |

### 4.2 Receiver, video, LEDs, power

- **Receiver:** ExpressLRS 2.4 GHz, **CRSF** protocol on a full UART (RX and TX both wired) [13]; Ports tab "Serial
  RX", Receiver tab "Serial (via UART)" + CRSF. 2.4 GHz packet rates in the ELRS Lua menu: 50Hz, 150Hz, 250Hz,
  500Hz, F500, F1000, D250, D500, 100Hz Full, 333Hz Full, plus K1000/DK250/DK500 on LR1121 hardware [30]; racers use
  500Hz or F1000 (choice is practice, unverified). F1000 only works when the handset-to-module serial baud is above 400K [30].
- **Video:** analog 5.8 GHz is the racing norm (lowest latency, all pilots share Raceband). Camera video -> FC `CAM`
  pad -> OSD chip (AT7456E) -> FC `VTX` pad -> VTX video in. VTX control by **SmartAudio** (TBS-style) or
  **IRC Tramp** on one UART TX (Ports tab "VTX (SmartAudio)" / "VTX (IRC Tramp)"). HDZero digital is also raced
  (MSP DisplayPort) (unverified at MultiGP level).
- **LED strip:** WS2812B addressable LEDs, data in on the FC `LED` pad, 5 V and GND from the FC; the original draws
  8 LEDs (4 per rear arm).
- **GPS/compass:** not used on a race quad (weight).
- **Power:** XT60 (battery female, quad male). 12-14 AWG red/black battery lead. Low-ESR electrolytic capacitor
  across the ESC battery pads: **1000 uF, 35 V** (4S; 35 V is the minimum for 6S, 50 V gives margin); white stripe =
  negative leg; reversed it vents/bursts. Catches voltage spikes from motor braking/punch-outs that otherwise kill
  ESC MOSFETs and inject gyro/video noise.
- **BECs:** FC 5 V (receiver, camera, LEDs, buzzer) and 9-10 V (VTX). Buzzer on BZ+/BZ- (5 V active buzzer).

### 4.3 Named pad/UART map: SpeedyBee F405 V4 (target `SPEEDYBEEF405V4`) [14]

(An F4 board with a verified map; the same UART roles apply to an F7 board.)

| UART / pad | Use on the racer |
|---|---|
| UART2 T2/R2 | **ELRS receiver (CRSF)** |
| UART1 T1/R1 | analog VTX SmartAudio/Tramp on T1 (or HDZero/DJI MSP DisplayPort; the 6-pin DJI plug uses UART1) |
| UART3, UART6 | spare (UART6 sits with 4V5/SDA/SCL, meant for GPS) |
| UART4 | no pads: wired to the onboard Bluetooth chip (MSP 115200); not usable for a peripheral |
| UART5 R5 "TEL" | ESC telemetry (not needed with bidirectional DShot) |
| LED pad | WS2812 data (MCU pin PA8: `resource LED_STRIP 1 A08` in the target config [32]) |
| BZ+ / BZ- | buzzer |
| 8-pin ESC harness | FC side GND, BAT, M1, M2, M3, M4, CUR, TEL; ESC side labels S4..S1 (the harness crosses over) |
| BECs | 5 V 3 A total (front 5V pads, BZ+, LED 5V pads); 9 V 3 A total (9V pad + DJI plug, VTX 9V switchable by PINIO/USER1); 3.3 V 500 mA; 4V5 1 A (live on USB) [14] |

Wire colours (convention, not a standard): battery red (+) / black (-); motor phase wires one colour, any order;
5 V red, GND black, signals yellow/white/green (unverified).

## 5. Firmware: Betaflight

### 5.1 Version

- Current stable on 2026-10-24: **Betaflight 2026.6.2** (2026-09-16) [1]. Previous lines: 2025.12.5, 4.5.5 [1].
- Calendar versioning YYYY.M.PATCH since 2025.12; no "4.6" exists [12]. Gyro alignment settings were removed in
  2025.12; only `align_board_*` remains [12].

### 5.2 Renamed / non-existent parameters (check every snippet)

| Old or wrong name | Correct (2026.6.2) [2] |
|---|---|
| `p_level` / `angle_level_strength` | `angle_p_gain` (0-200, default 50) |
| `level_limit` | `angle_limit` (10-80 deg, default 60) |
| `dshot_idle_value` | `motor_idle` |
| `d_min_*` | `d_*` (base D) + `d_max_*` (peak) since 2025.12 |
| `osd_timer_1`, `osd_timer_2` | never existed: `osd_tim1` / `osd_tim2` (packed numbers) + `osd_tim_1_pos` |
| `osd_stat_max_spd` | never existed: bits of `osd_stat_bitmask` |
| `alt_hold_throttle_deadband` | never existed: `alt_hold_deadband` (2025.12+, needs baro/GPS) |
| `launch_control_trigger_throttle`, `launch_control_angle_limit` | `launch_trigger_throttle_percent`, `launch_angle_limit` (the real names) |

### 5.3 Initial setup

```
# Betaflight 2026.6.2, ELRS on UART2, analog VTX SmartAudio on UART1
mixer QUADX
set align_board_yaw = 0             # FC arrow to the nose; 180 if mounted backwards
set motor_pwm_protocol = DSHOT600
set dshot_bidir = ON                # RPM telemetry for the RPM filter
set motor_poles = 14                # 14 magnets on a 12N14P 2207
serial UART2 64 115200 57600 0 115200     # 64 = Serial RX
set serialrx_provider = CRSF
serial UART1 2048 115200 57600 0 115200   # 2048 = VTX SmartAudio (8192 = Tramp)
set yaw_motors_reversed = OFF       # props in; ON = props out
save
```
Syntax and function bits from `cli.c` / `serial.h` [3]; `motor_pwm_protocol` table and ranges from [2].
RPM filter defaults (`rpm_filter_harmonics = 3`, `rpm_filter_min_hz = 100`) need nothing else once
`dshot_bidir = ON`; with bidir DShot on and no ESC telemetry Betaflight blocks arming with `DSHOT_TELEM` [8].

### 5.4 VTX table with Raceband, band/channel/power

`vtxtable` syntax (2026.6.2 `cli.c`) [3]:
`vtxtable bands <n>` (0-8), `vtxtable channels <n>` (0-8), `vtxtable band <band> <bandname> <bandletter> [FACTORY|CUSTOM] <freq> ... <freq>`
(exactly `channels` frequencies, else "NOT ENOUGH / TOO MANY FREQUENCIES"), `vtxtable powerlevels <n>` (0-8),
`vtxtable powervalues <v> ...`, `vtxtable powerlabels <l> ...` (labels max 3 chars). Band names max 8 chars [5].
**`channels` must be set before a `band` line**, or the band line fails ("TOO MANY FREQUENCIES (EXPECTED 0)") [3].

```
vtxtable bands 5
vtxtable channels 8
vtxtable band 1 BOSCAM_A A FACTORY 5865 5845 5825 5805 5785 5765 5745 5725
vtxtable band 2 BOSCAM_B B FACTORY 5733 5752 5771 5790 5809 5828 5847 5866
vtxtable band 3 BOSCAM_E E FACTORY 5705 5685 5665 5645 5885 5905 5925 5945
vtxtable band 4 FATSHARK F FACTORY 5740 5760 5780 5800 5820 5840 5860 5880
vtxtable band 5 RACEBAND R FACTORY 5658 5695 5732 5769 5806 5843 5880 5917
vtxtable powerlevels 3
vtxtable powervalues 14 20 26        # SmartAudio 2.1 takes dBm; use your VTX maker's table
vtxtable powerlabels 25 100 400
set vtx_band = 5                     # Raceband
set vtx_channel = 4                  # R4 = 5769 MHz (race control assigns it)
set vtx_power = 1                    # index 1 = lowest level = 25 mW
set vtx_low_power_disarm = ON        # OFF / ON / UNTIL_FIRST_ARM
save
```
- Band frequencies: Betaflight VTX guide [11]; Raceband R1 5658 ... R8 5917 is also hard-coded in `ledstrip.c`
  ("R1, returns solid red", "R8 at 5917") [4].
- `vtx_band` 0-8, `vtx_channel` 0-8, `vtx_power` 0-7 (`VTX_TABLE_MAX_POWER_LEVELS - 1`), but only up to the table's `powerlevels` is meaningful; **power is 1-based: 0 means unknown, 1 is the lowest
  real level** (`VTX_TABLE_DEFAULT_POWER 1`) [2][5]. `vtx_freq` / `vtx_pit_mode_freq` 0-5999 MHz [2][5].
- Raceband channels: R1 5658, R2 5695, R3 5732, R4 5769, R5 5806, R6 5843, R7 5880, R8 5917 MHz (37 MHz apart).
- FACTORY vs CUSTOM (Betaflight VTX guide [11]): "When the flag is set to FACTORY, Betaflight sends the VTX a band
  and channel number"; "When the flag is set to CUSTOM, Betaflight sends the VTX the frequency it should use".
- A frequency of **0** blanks a channel, e.g. the guide's example `vtxtable band 5 RACEBAND R FACTORY 0 0 0 5769 5806
  5843 0 0` [11]; useful to lock a race quad to allowed channels.
- Power values depend on the VTX protocol: SmartAudio 2.1 uses dBm (Unify Pro32 HV example `14 20 26 30`); Tramp
  uses mW (example `25 100 200 400 600`) [11]. "Pitmode is separate from vtxTable"; SmartAudio V1.0/V2.0 VTXs can
  enter pit mode only at power-up, Betaflight can only take them out of it [11].
- Pit mode: aux mode **VTX PIT MODE (ID 39)** [9]; if `vtx_pit_mode_freq` is non-zero, pit mode moves the VTX to
  that frequency instead (`io/vtx.c`) [5]; the original's 5584 MHz is a frequency outside the race bands. "Pit mode on boot" is a **VTX hardware setting** (e.g. via
  its button/SmartAudio menu), not a Betaflight setting; `vtx_low_power_disarm = ON` keeps the lowest power while
  disarmed [5].
- Channel on a switch: `vtx <index> <aux_channel> <vtx_band> <vtx_channel> <vtx_power> <start_range> <end_range>` [3].
- Raceband **R1/R2/R7/R8** are commonly used for 4-pilot heats (wide spacing) (unverified; race control decides;
  IMD6C is the common 6-pilot plan, unverified).

### 5.5 LED strip and race colours

Syntax [3][4]:
- `led <index> <x>,<y>:<directions>:<functions+overlays>:<colour>`; index 0 to `LED_STRIP_MAX_LENGTH - 1` (32 LEDs on
  most targets, 64 on targets built with `USE_LED_STRIP_64` [`target/common_pre.h`]), x/y 0-15 grid position.
- Directions: `N E S W U D`. Base functions: `C` colour, `F` flight mode, `A` arm state, `L` battery, `S` RSSI, `G` GPS,
  `R` thrust ring, `P` GPS bar, `E` battery bar, `U` altitude. Overlays: `T` throttle, `Y` rainbow, `O` Larson
  scanner, `B` blink, `V` VTX, `I` indicator, `W` warning [4].
- `color <0-15> <h>,<s>,<v>`: H 0-359, S and V 0-255; **Betaflight's saturation is inverted: S = 0 is full colour,
  S = 255 with V = 255 is white** [4].
- Default palette (index = name): 0 BLACK, 1 WHITE, 2 RED (0,0,255), 3 ORANGE (15,0,255), 4 YELLOW (50,0,255),
  5 LIME_GREEN (100,0,255), 6 GREEN (115,0,255), 7 MINT_GREEN (125,0,255), 8 CYAN (180,0,255), 9 LIGHT_BLUE
  (210,0,255), 10 BLUE (240,0,255), 11 DARK_VIOLET (270,0,255), 12 MAGENTA (300,0,255), 13 DEEP_PINK (330,0,255) [4].
- Profiles: `set ledstrip_profile = RACE | BEACON | STATUS` (STATUS only on builds with status mode; default STATUS
  there, else RACE) [2][4]. In **RACE** the configured LEDs all show `ledstrip_race_color` (default **ORANGE**);
  if it is **BLACK**, the colour follows the VTX frequency (R1 = red, rising hue up to R8) [4].
- `ledstrip_race_color` is a **lookup** setting: write the name, e.g. `GREEN`, not a number [2].
- Other: `ledstrip_brightness` 5-100 % (default 100), `ledstrip_beacon_color` (default WHITE),
  `ledstrip_visual_beeper`, `ledstrip_grb_rgb` [2][4]. Resource: the LED pad is `resource LED_STRIP 1 <pin>`
  (unverified for a given target).

```
# 8 LEDs, 4 on each rear arm, one race colour (green)
led 0 0,0::C:6
led 1 1,0::C:6
led 2 2,0::C:6
led 3 3,0::C:6
led 4 12,0::C:6
led 5 13,0::C:6
led 6 14,0::C:6
led 7 15,0::C:6
set ledstrip_profile = RACE
set ledstrip_race_color = GREEN      # or BLACK = colour from the VTX channel
save
```
(`::` = no directions; `C:6` = solid colour, palette 6 GREEN. Grid x/y positions only matter for direction-based
functions; chosen here as an example.)

### 5.6 Modes (`aux`) and race features

`aux <slot> <modeId> <auxChannel> <start> <end> <logic> <linkedTo>`; numeric permanent IDs [3][9]:
ARM 0, ANGLE 1, HORIZON 2, ALTHOLD 3, BEEPER 13, AIR MODE 28, FLIP OVER AFTER CRASH 35, PREARM 36,
VTX PIT MODE 39, LAUNCH CONTROL 49, BEEPER MUTE 52. There is no ACRO mode: Acro = no self-level mode on.

```
aux 0 0 0 1700 2100 0 0      # ARM on AUX1 high
aux 1 1 1 1300 2100 0 0      # ANGLE on AUX2 mid/high (low = acro)
aux 2 39 2 1700 2100 0 0     # VTX PIT MODE on AUX3 high
aux 3 49 3 1700 2100 0 0     # LAUNCH CONTROL on AUX4 high
aux 4 13 3 900 1300 0 0      # BEEPER (lost quad) on AUX4 low
# Angle mode (learning the track)
set angle_limit = 45         # default 60
set angle_p_gain = 50        # default 50 (was p_level)
# Acro race rates (ACTUAL is the default rates_type)
set rates_type = ACTUAL
set roll_rc_rate = 7         # centre sensitivity 70 deg/s
set roll_srate = 67          # max rate 670 deg/s (ACTUAL: value x 10)
set roll_expo = 40
set pitch_rc_rate = 7
set pitch_srate = 67
set pitch_expo = 40
set yaw_srate = 45           # 450 deg/s
# Launch control (race start): with the LAUNCH CONTROL mode on, the quad sits armed on the grid and stick
# input is replaced by a fixed launch rate (max 100 deg/s at half stick, whatever your rates); PITCHONLY
# ignores roll and yaw sticks so only pitch can move, launch_angle_limit (needs ACC) stops forward tilt at
# that angle; once throttle passes the trigger, normal acro flight resumes (pid.c applyLaunchControl)
set launch_control_mode = PITCHONLY       # NORMAL / PITCHONLY / FULL; default PITCHONLY
set launch_trigger_throttle_percent = 20  # default 20
set launch_angle_limit = 0                # 0-80 deg, default 0 (off)
set launch_control_gain = 40              # default 40
save
```
Defaults and ranges from `settings.c` and `pid.c` [2][6]. ACTUAL rates: full stick = `srate x 10` deg/s,
centre = `rc_rate x 10` deg/s (`src/main/fc/rc.c`, as checked for `docs/facts/quad5.md`). Alt hold exists (`alt_hold_deadband`, ALTHOLD id 3) but needs a barometer
and/or GPS; race quads rarely have one.

### 5.7 Typical race tune (starting points, not defaults unless stated)

| Setting | Default (2026.6.2) [6] | Race practice |
|---|---|---|
| `anti_gravity_gain` | 80 | keep or raise; holds attitude on throttle punches |
| `throttle_boost` | 5 | keep |
| `tpa_rate` / `tpa_breakpoint` | 65 / 1350 | TPA reduces D (or PD, `tpa_mode`) above the breakpoint; racers spend time at high throttle, so TPA matters |
| `feedforward_boost` | 15 | race tunes often use higher feedforward for sharp stick response (unverified) |
| `motor_output_limit` | 100 | lower (e.g. 85-90) to tame a 6S motor (unverified practice). For spec racing Betaflight has a real RPM limiter instead: `rpm_limit` (OFF/ON, default OFF) and `rpm_limit_value` (default 18000, compared with the average motor rpm from bidir DShot), with `rpm_limit_p/i/d` 25/10/8; it only exists in builds with `USE_RPM_LIMIT`, which the RACE_PRO feature pack enables when bidir DShot telemetry is built in [2][7][33] |
| `thrust_linear` | 0 | 0-40 sometimes used (unverified) |
| `dyn_idle_min_rpm` | 0 (off); range 0-200, **units of 100 rpm** (`* 100 / 60` to rev/s in `mixer_init.c`) [2][7] | 20-40 (2000-4000 rpm idle floor, needs bidir DShot) helps prop-wash and desync resistance (unverified practice) |
| `osd_tim1` | 2560 (on-timer, alarm 10 min) | race timer: `set osd_tim1 = 18` (LAST_ARMED, hundredths) and `set osd_tim_1_pos = 2103` |

Simplified tuning sliders (`simplified_master_multiplier`, `simplified_feedforward_gain`, ...) exist [2].

### 5.8 OSD

- Element positions: `osd_<element>_pos` = `x | (y << 5)` + 2048 for OSD profile 1 [10]. Race OSD: voltage
  (`osd_avg_cell_voltage_pos`), timer (`osd_tim_1_pos`), link quality (`osd_link_quality_pos`), warnings,
  crosshairs (`osd_crosshairs_pos`).
- Timers packed: `source | precision << 4 | alarm << 8`; sources 0 ON, 1 TOTAL_ARMED, 2 LAST_ARMED, 3 ON_OR_ARMED,
  4 LAUNCH_TIME; precision 0 seconds, 1 hundredths, 2 tenths [10]. Lap times come from the lap timer, not the FC.
- Post-flight stats: `osd_stat_bitmask` (bit 1 TIMER_1, bit 3 MAX_SPEED needs GPS) [10].
- Analog: `osd_displayport_device = MAX7456` or `AUTO`; HDZero/DJI: `MSP` [2].

### 5.9 Failsafe, arming, calibration, motor direction

- Failsafe defaults [2]: `failsafe_delay = 15` (1.5 s), `failsafe_procedure = DROP` (racing norm: drop out of the
  sky inside the netted course), `failsafe_recovery_delay` 5 (0.5 s).
- Arming-disable flags (2026.6.2) [8]: `NOGYRO, FAILSAFE, RXLOSS, NOT_DISARMED, BOXFAILSAFE, RUNAWAY, CRASH, THROTTLE,
  ANGLE, BOOTGRACE, NOPREARM, LOAD, CALIB, CLI, CMS, BST, MSP, PARALYZE, GPS, RESCUE_SW, DSHOT_TELEM, REBOOT_REQD,
  DSHOT_BBANG, NO_ACC_CAL, MOTOR_PROTO, FLIP_SWITCH, ALT_HOLD_SW, POS_HOLD_SW, AUTOPILOT_SW, ARM_SWITCH`. Common:
  RXLOSS, THROTTLE (throttle not low), ANGLE (tilted more than `small_angle`, default 25 deg; 180 = arm at any angle on builds with the RACE_PRO option [33]), ARM_SWITCH (arm switch
  on at boot), CLI/MSP (Configurator connected), DSHOT_TELEM, NO_ACC_CAL (Angle mode configured but accelerometer
  never calibrated). `status` lists them.
- Accelerometer calibration: Setup tab "Calibrate Accelerometer" on a level surface, or sticks (disarmed)
  throttle high + yaw left + pitch low; gyro: throttle low + yaw left + pitch low [3]. No compass on a racer.
- Motor direction: physically in the ESC (Configurator Motors tab direction tool via DShot, ESC Configurator
  "Motor direction: Normal/Reversed", or swap two motor wires) [11][25]; firmware expectation with
  `yaw_motors_reversed` [7].
- Board alignment: `align_board_roll/pitch/yaw` (-180..360) [2].

### 5.10 Errors in the original's CLI (and the fix)

| Original | Problem | Correct |
|---|---|---|
| `set osd_timer_1 = ON` | no such setting | `set osd_tim1 = 18` + `set osd_tim_1_pos = 2103` |
| `set osd_stat_max_spd = ON` | no such setting; max speed needs GPS (racers have none) | OR 8 into `osd_stat_bitmask` (GPS builds only) |
| `vtxtable bands 1` + `vtxtable band 1 RACEBAND R CUSTOM 5658 ... 5917` | fails unless `vtxtable channels 8` was set; no power table so `vtx_power = 1` has nothing to map to | full table in 5.4 (`channels 8`, `powerlevels/powervalues/powerlabels`); with only Raceband, `bands 1` + `band 1 RACEBAND R ...` is fine after `channels 8` |
| `set vtx_band = 1` with the full table | band 1 is Boscam A in the standard 5-band table | `set vtx_band = 5` (or 1 if the table has only Raceband) |
| `set vtx_pit_mode_freq = 5584` | valid (0-5999) | keep; note it only applies with the PIT MODE aux on |
| `led 0 0,0::C:6` | valid (one LED, solid GREEN) | keep; add one line per LED |
| `set ledstrip_race_color = 6` | lookup setting: the CLI only string-matches the table names (`strcasecmp`), so "6" is rejected as an invalid value [3] | `set ledstrip_race_color = GREEN` + `set ledstrip_profile = RACE` |
| `set p_level = 50` | removed | `set angle_p_gain = 50` |
| `set alt_hold_throttle_deadband = 15`, `aux 1 ANGLE ...` | wrong name; `aux` takes numeric IDs | `set alt_hold_deadband = 15`; `aux 1 1 1 1300 2100 0 0` |
| `set rates_type = ACTUAL`, `roll_rc_rate = 7`, `roll_srate = 67` (670 deg/s), `roll_expo = 40`, `yaw_srate = 45`, `motor_pwm_protocol = DSHOT600`, `dshot_bidir = ON`, `align_board_yaw = 0`, `vtx_channel`, `vtx_power`, `angle_limit` | valid | keep |

## 6. Safety tests

| Test | How | Tool | What it catches |
|---|---|---|---|
| **Smoke stopper** | a current limiter in series with the battery positive for the first power-up: a small incandescent bulb, a resettable fuse, or a MOSFET smoke-stopper board. With a short, the bulb lights (or the board trips) and current stays at a few amps, so nothing burns; without a short the bulb only flashes while the caps charge | inline XT60 adapter | solder bridges, a reversed capacitor or battery lead, a pinched wire to carbon (carbon conducts) |
| **Props-off motor test** | props off, battery on, Motors tab, "I understand the risks", raise each slider: M1..M4 must spin at the positions/directions of 2.2 | Betaflight App Motors tab | wrong motor order, reversed spin, dead ESC channel |
| **Receiver test** | Receiver tab: channels move correctly, 1000-2000 us, arm switch on the right AUX | Receiver tab | channel map, endpoints |
| **Board alignment** | Setup tab: tilt the quad; the 3D model must follow | Setup tab | FC rotated, wrong `align_board_yaw` |
| **Accelerometer calibration** | level surface, "Calibrate Accelerometer" | Setup tab | drift in Angle mode, `NO_ACC_CAL` |
| **VTX check** | VTX tab: band/channel/power read back from the VTX; power-up in pit mode at the field | VTX tab, goggles | wrong table, VTX stomping on other pilots |
| **Failsafe test** | props off, armed, radio off: motors stop (DROP) | radio + Motors tab | receiver holding last throttle |
| **Pre-arm checks** | `status` / Setup tab shows arming-disable flags | CLI / Setup tab | see 5.9 |

## 7. Flight characteristics (4S 5" race quad, typical)

| Quantity | Typical value |
|---|---|
| AUW | 380-450 g with 4S 1300-1500 (unverified) |
| T:W | 10-15 : 1 (original 13.8) (unverified range) |
| Hover throttle | 20-30 % |
| Hover current | ~8-10 A on 4S (original 8.75 A) (unverified) |
| Peak current | ~160-200 A bursts (4 x 40-50 A [22][23]) |
| Pack time | MultiGP GQ heats are a fixed **2 min** [17]; ~2-3 min at race pace; 6-8 min gentle |
| Top speed | 120-160 km/h on a straight (unverified); the original's lesson says "120 km/h" |
| Max rotation rate | 600-800 deg/s typical race rates (670 deg/s default) |
| Land voltage | ~3.5 V/cell resting (original) (unverified as a standard) |
| Motor out | no redundancy: losing a motor or prop gives a violent yaw spin and an immediate fall |

### 7.1 MultiGP track and race formats

| Item | Value |
|---|---|
| Standard gate | **5 ft x 5 ft opening (1.524 m)** MultiGP chapter gate [15][16] |
| Championship gate | **7 ft x 6 ft** opening (2.13 x 1.83 m) [15] |
| Tower | 5x5 gate raised 5 ft; 7x6 gate raised 6 ft [15] |
| Dive gate | 7x6 gate raised **15 ft (4.57 m)**, slightly angled [15] |
| Hurdle | **5 ft tall x 10 ft wide** (1.52 x 3.05 m) [15] |
| Ladder / double tower | 3 / 2 gates stacked [15] |
| Split-S | flags 1.5 ft behind and to the side of a 7x6 gate [15] |
| Rules | gates flown in numbered order and direction; a missed gate must be re-flown [16] |
| Global Qualifier format | **fastest 3 consecutive laps**, fixed 2-minute round, 5-10 rounds, start on the tone, timing starts at the start/finish gate [17] |
| Chapter formats | ZippyQ (first 10 packs recorded), 4-up double-elimination brackets, "Chase the Ace" finals [17] |
| Heat size | at least 3 quads per heat (2024 rules, per event page); 4-up is typical (unverified rule) [17] |

Original range check: the original's gates are 1.6 x 1.6 m (close to 5 ft = 1.52 m), the hurdle is 2.4 m wide with a
1.2 m bar (real: 10 ft = 3.05 m wide, 5 ft = 1.52 m tall), the dive frame is 1.9 m at 3.42 m (real dive gate 7x6 ft
at 15 ft = 4.57 m) [26].

### 7.2 Lap timing

| System | How it works |
|---|---|
| **RotorHazard** | open source; RX5808 video receivers tuned to each pilot's channel, an Arduino or STM32 node reads RSSI, a Raspberry Pi server runs the web UI; a lap is the RSSI peak as the quad passes the timer; up to 16 racers; no hardware on the quad [21] |
| **ImmersionRC LapRF 8-Way** | event RF timer: measures the 5.8 GHz energy of each quad's own VTX as it passes the start/finish gate, so no tag on the quad; shaped antennas define the detection zone; LapRF Personal is the single-receiver version [27]. (ImmersionRC RaceTracker is an older personal RF timer, unverified details) |
| **IR transponders (I-Lap)** | an IR tag on each quad sends a unique 7-digit ID on a modulated 38 kHz carrier to a finish-line receiver; stated range 6 m in sun, 10 m in shade; works with AMB-compatible software [28] |
| Calibration | RSSI timers need enter/exit thresholds set per node; all pilots must be on their assigned channel at race power |

## 8. Real failure modes

| Failure | Cause | What the pilot sees |
|---|---|---|
| Desync | ESC loses rotor position: over-KV for the cell count, hard punches, damaged motor | one motor stutters/stops on a punch; quad flips/tumbles ("death roll") |
| Brown-out | voltage sag on punch-outs resets the FC or VTX | video cuts or rolls, quad drops |
| Reversed motor / swapped props | wrong spin or CW prop on a CCW motor | flips on take-off, or spins in yaw |
| Wrong board alignment | FC arrow not forward and `align_board_yaw` wrong | instant flip at take-off; runaway-takeoff prevention may disarm (`RUNAWAY`) |
| Missing/reversed capacitor | ESC spikes | video lines, gyro noise, dead ESC; reversed cap vents |
| Prop wash | descending into own wash after dives/split-S | wobble/oscillation |
| Gate clip / crash damage | props hit the gate | bent props, broken arm, vibration, failed lap |
| Wrong VTX channel or power | not set to the assigned channel, or high power at the pits | other pilots' video breaks up; disqualification at events |
| Video loss on a VTX without antenna | VTX powered without antenna | VTX overheats or dies |
| Over-discharge | flying past 3.5 V/cell (resting) | sag, puffed pack |
| GPS/compass | not fitted on a racer | none |

## 9. Uncertainties

- Only the 4S 1300 and 6S 1300 pack masses were checked against a product listing [29]; 4S 1500 and 6S 1000 masses, and prop, camera, ESC and FC masses in section 3, are ranges from general knowledge (unverified).
- No manufacturer thrust table for a 2207 2500 KV on 4S 5x4.8x3 was fetched; the thrust checks use one bench test
  (2600 KV, 5x5x3) [23] and one listing [24].
- Raceband channel plans for 4- and 6-pilot heats (R1/R2/R7/R8, IMD6C) are unverified.
- MultiGP rules: the Global Qualifier format comes from a dev-site copy of the rules [17]; check the current
  season's rulebook. Heat size and the 3.5 V/cell landing figure are unverified.
- LapRF and I-Lap details come from retailer descriptions [27][28]; RaceTracker details are unverified.
- That `set ledstrip_race_color = 6` is rejected was read from the CLI source (lookup values are matched by name
  only), not tested on hardware.
- Exact Configurator UI labels in the 2026.6 app are unverified.
- Camera uptilt range and top speed are unverified ranges.

## Verification

Adversarial fact-check, 2026-10-24, against Betaflight 2026.6.2 source downloaded from the tag (raw.githubusercontent.com),
the betaflight.com VTX guide and board page, the betaflight/config target file, MultiGP's obstacle page, the ExpressLRS
docs and retailer listings. GetFPV pages return HTTP 403 to fetchers, so GetFPV figures were checked through search
snippets of the same listings plus a second retailer where one was found.

| # | Claim | Status | Source | Old -> new (corrections) |
|---|---|---|---|---|
| 1 | QuadX mixer rows REAR_R, FRONT_R, REAR_L, FRONT_L with the signs in 2.2 | confirmed | https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/mixer_init.c | |
| 2 | Props-in default: M1 RR CW, M2 FR CCW, M3 RL CCW, M4 FL CW; `yaw_motors_reversed` OFF/ON lookup | confirmed (setting from settings.c; spin pattern from the mixer yaw signs and the BF Motors-tab convention) | https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/cli/settings.c | |
| 3 | Raceband 5658/5695/5732/5769/5806/5843/5880/5917 and the A/B/E/F band tables | confirmed | https://betaflight.com/docs/wiki/guides/current/VTX | |
| 4 | `vtxtable` limits: 8 bands, 8 channels, 8 power levels, 8-char band names, 3-char labels; `channels` default 0 so a `band` line before `channels` fails with TOO MANY FREQUENCIES (EXPECTED 0) | confirmed | https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/cli/cli.c , drivers/vtx_table.h, pg/vtx_table.c | |
| 5 | FACTORY / CUSTOM meaning, zero-frequency blanking example, Tramp mW and SmartAudio 2.1 dBm power values (Pro32 HV 14 20 26 30), SA 1.0/2.0 pit mode only at power-up | confirmed | https://betaflight.com/docs/wiki/guides/current/VTX | |
| 6 | `vtx_band` 0-8, `vtx_channel` 0-8, `vtx_power` 0-7, `vtx_freq`/`vtx_pit_mode_freq` 0-5999, `vtx_low_power_disarm` OFF/ON/UNTIL_FIRST_ARM | confirmed | settings.c (2026.6.2) | |
| 7 | Serial function bits 64 = Serial RX, 2048 = SmartAudio, 8192 = Tramp; `serial` accepts a port name such as `UART2` (or a legacy number) | confirmed | https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/io/serial.h , cli.c `cliSerial` (`findSerialPortByName`) | |
| 8 | LED codes: directions NESWUD, base functions C F A L S G R P E U, overlays T Y O B V I W; `led` string `x,y:dirs:funcs:colour` | confirmed | https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/io/ledstrip.c | |
| 9 | Default HSV palette (ORANGE 15, YELLOW 50, LIME 100, GREEN 115, MINT 125 ...) and inverted saturation | confirmed (surprising but in source) | ledstrip.c `hsv[]` | |
| 10 | `ledstrip_race_color` default ORANGE, BLACK = colour from VTX frequency; `ledstrip_profile` RACE/BEACON(/STATUS); brightness 5-100 | confirmed | ledstrip.c, settings.c | |
| 11 | `set ledstrip_race_color = 6` is rejected (lookup values matched by name with `strcasecmp`) | confirmed (source; not tested on hardware) | cli.c set handler, MODE_LOOKUP branch | |
| 12 | LED_STRIP_MAX_LENGTH 32, 64 with USE_LED_STRIP_64 | confirmed | https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/target/common_pre.h | |
| 13 | `aux` mode IDs ARM 0, ANGLE 1, HORIZON 2, ALTHOLD 3, BEEPER 13, AIR MODE 28, FLIP OVER AFTER CRASH 35, PREARM 36, VTX PIT MODE 39, LAUNCH CONTROL 49, BEEPER MUTE 52 | confirmed | https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/msp/msp_box.c | |
| 14 | Launch control names/defaults: mode NORMAL/PITCHONLY/FULL default PITCHONLY, trigger 20 %, angle limit 0 (0-80), gain 40 | confirmed; behaviour text was "unverified" | https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/pid.c | corrected: vague "PID loop restrained" summary -> source behaviour (fixed 100 deg/s launch rate, PITCHONLY ignores roll/yaw, angle limit needs ACC) |
| 15 | `angle_limit` 10-80 default 60; `angle_p_gain` 0-200 default 50 | confirmed | settings.c, pid.c | |
| 16 | ACTUAL rates: centre = rc_rate x 10, max = srate x 10; defaults rc_rate 7, srate 67, expo 0, rates_type ACTUAL | confirmed | https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/fc/rc.c , fc/controlrate_profile.c | |
| 17 | PID defaults anti_gravity_gain 80, throttle_boost 5, tpa_rate 65, tpa_breakpoint 1350, tpa_mode D, feedforward_boost 15, motor_output_limit 100, thrust_linear 0, dyn_idle_min_rpm 0 (0-200, x100 rpm) | confirmed | pid.c, settings.c, mixer_init.c | |
| 18 | `motor_output_limit` as the spec-racing tool | corrected | mixer_init.c, settings.c, common_pre.h | old: lower it to "make a spec quad"; new: Betaflight's spec tool is `rpm_limit` / `rpm_limit_value` (default 18000), only on builds with USE_RPM_LIMIT (RACE_PRO pack) |
| 19 | RPM filter defaults harmonics 3, min 100 Hz; DSHOT_TELEM blocks arming when bidir is on and a motor gives no telemetry | confirmed | pg/rpm_filter.c, fc/core.c | |
| 20 | Arming-disable flag list (30 names, ending ARM_SWITCH); `small_angle` default 25 | confirmed, with addition | fc/runtime_config.c, flight/imu.c | added: `small_angle` default is 180 on RACE_PRO builds |
| 21 | Failsafe defaults: delay 15 (1.5 s), procedure DROP (table AUTO-LAND/DROP/GPS-RESCUE), recovery delay 0.5 s | confirmed | https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/failsafe.c | |
| 22 | OSD timer packing `src \| prec<<4 \| alarm<<8`, sources 0-4, precision 0 s / 1 hundredths / 2 tenths, default `osd_tim1` 2560; position `x \| y<<5` + 2048; stats bit 1 TIMER_1, bit 3 MAX_SPEED; displayport table NONE/AUTO/MAX7456/MSP/FRSKYOSD/FBOSD | confirmed | osd/osd.h, osd/osd.c, settings.c | |
| 23 | Stick commands: gyro cal = throttle low + yaw left + pitch low; acc cal = throttle high + yaw left + pitch low | confirmed | https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/fc/rc_controls.c | |
| 24 | Betaflight 2026.6.2 released 2026-09-16; 2025.12.5 and 4.5.5 on 2026-06-28 | confirmed | https://api.github.com/repos/betaflight/betaflight/releases | |
| 25 | SpeedyBee F405 V4 map: UART2 = serial RX, UART1 = VTX/DJI, UART5 RX-only TEL = ESC telemetry, 8-pin harness order, AT7456E OSD, BZ 5 V buzzer | confirmed, with additions | https://betaflight.com/docs/wiki/boards/current/SPEEDYBEEF405V4 , https://github.com/betaflight/config/blob/master/configs/SPBE/SPEEDYBEEF405V4/config.h | added: UART4 is the Bluetooth link (not spare), LED pad = PA8, BEC ratings |
| 26 | MultiGP obstacles: 5x5 gate, 7x6 champ gate, towers 5 ft / 6 ft, dive gate 15 ft angled, hurdle 5 ft x 10 ft, ladder 3 gates, Split-S flags 1.5 ft | confirmed | https://dev.multigp.com/multigp-drone-race-course-obstacles/ | |
| 27 | MQC SXR 218 mm diagonal, 138 x 168 mm, 75 g dry | confirmed (search snippet of the GetFPV listing; sqrt(138^2+168^2) = 217.4 mm is consistent) | https://www.getfpv.com/discontinued/mqc-sxr-stretched-x-racer.html | |
| 28 | Tattu R-Line V4 4S 1300: 150 g, 72 x 38 x 25 mm; 6S 1300: 200 g, 78 x 39 x 38 mm | confirmed (GetFPV and ReadyMadeRC agree; Gensace lists 143 g, 76 x 38 x 25 mm) | https://www.readymaderc.com/products/details/tattu-r-line-v4-1300mah-4s-130c-xt60 | added the outlier note |
| 29 | T-Motor F60 Pro V 2550 KV: 4S, 12N14P, 4 mm shaft, 5 mm prop mount, peak 50.7 A, 825 W | confirmed, with addition | https://www.racedayquads.com/products/t-motor-f60-pro-v-2550kv-motor-gray | added: 2207.5 stator, 33.8 g with cable; 1950 KV version 33.9 g, 49.3 A peak |
| 30 | ELRS 2.4 GHz packet-rate names | confirmed (K1000/DK250/DK500 on LR1121 not checked: unverified) | https://www.expresslrs.org/quick-start/transmitters/lua-howto/ | added: F1000 needs handset baud above 400K |

Not checked in this pass (kept as written, most already marked unverified): Mach 1 / Stretch Reaper / MCK frame specs
(GetFPV 403), Sprog X and MiniQuadTestBench thrust figures, LapRF and I-Lap retailer details, RotorHazard feature list,
MultiGP Global Qualifier rules text, XT60 gender convention and capacitor voltage advice.

