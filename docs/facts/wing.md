# Fact sheet: 900 mm FPV flying wing on INAV (Drone Lab Fig. 09, `wing`)

Status: written 2026-10-24. Firmware facts are checked against the INAV **9.1.0** source tree (tag `9.1.0`):
`settings.yaml`, `cli.c`, `fc_msp_box.c`, `runtime_config.*`, `pwm_mapping.c`, the SpeedyBee F405 WING target and
the docs folder, plus INAV Configurator 9.1.0 `js/model.js`. Anything marked "(unverified)" could not be confirmed
from a primary source in the time box. "(estimate)" marks numbers I computed; the method is given.

## 0. Header

**Craft class:** 900 mm-span swept, tailless EPP-foam flying wing with a single rear pusher motor, two elevons, an
F405 "wing" flight controller running INAV, GPS (with optional compass), ELRS receiver and analog FPV. AUW about
800-1000 g on a 4S pack. Hand-launched, belly-landed.

**Real products / reference builds it represents:**

| Reference | Key published figures | Link |
|---|---|---|
| Sonicmodell AR Wing 900 (Classic / V2 / Pro) | 900 mm span, 482 mm length; Classic kit empty 280 g, PNP 400 g [18]; another listing: kit 203 g, PNP 273 g, about 430 g flying without FPV gear [19]; stock power 2204-2206 2200-2300 KV (GetFPV/BuddyRC recommend 2206 2300 KV), 20-30 A ESC (30 A with 5 V 3 A BEC recommended), 5x5x3 or 6x3 prop, 3-4S 1550-2200 mAh [18][19]; movable battery tray and a CG bump moulded under the wing [18] | https://www.getfpv.com/sonicmodell-ar-wing-classic-900mm-wingspan-epp-flying-wing-rc-airplane-pnp-version.html |
| ZOHD Dart XL Extreme (1000 mm, the nearest ZOHD in size; the plain ZOHD Dart / Dart 250G are smaller, 635 / 570 mm (unverified)) | 1000 mm span, 596 mm length, 19.8 dm2 wing area, max AUW 1200 g, max wing loading 60.6 g/dm2, 2216 1300 KV, 30 A ESC, 9x4.5 prop, 4S 3300 mAh, about 40 min, 25-100+ km/h [20] | https://www.getfpv.com/zohd-dart-xl-extreme-1000mm-wingspan-fpv-aircraft-rc-airplane-pnp.html |
| SpeedyBee F405 WING APP flight controller | STM32F405, 12 PWM outputs (11 + LED), 2-6S PDB, 90 A current sensor, FC BEC 5.2 V 2.4 A, VTX BEC 9/12/5 V 1.8 A, servo BEC 4.9/6/7.2 V 4.5 A; INAV target `SPEEDYBEEF405WING` [17][10] | https://www.getfpv.com/speedybee-f405-wing-app-flight-controller.html |

**What it is and what it is for.** A flying wing has no tail: the swept planform plus slightly reflexed (raised)
trailing-edge surfaces give pitch stability, and two **elevons** do the work of both elevator (move together) and
ailerons (move opposite). One pusher motor at the trailing edge keeps the prop out of the hand at launch and out of
the ground at landing. EPP foam flexes instead of breaking, so these wings are the standard cheap long-range FPV and
first-autopilot platform: INAV levels the wing in ANGLE mode, launches it automatically (NAV LAUNCH), cruises on a
heading (NAV CRUISE), and flies home and circles on GPS (NAV RTH) or on radio failsafe. A cruise draws only a few
amps, so 25-45 minute flights are normal.

## 1. Sources

Firmware (primary, INAV tag `9.1.0` unless noted):

1. INAV releases (9.1.0 stable, published 2026-07-09; 10.0.0-rc1 2026-09-24 and 10.0.0-rc2 2026-09-29 are pre-releases): https://github.com/iNavFlight/inav/releases
2. `src/main/fc/settings.yaml` (every `set` name, default, range, unit, lookup table): https://github.com/iNavFlight/inav/blob/9.1.0/src/main/fc/settings.yaml
3. `docs/Settings.md` (generated from 2): https://github.com/iNavFlight/inav/blob/9.1.0/docs/Settings.md
4. `src/main/fc/cli.c` (`aux`, `mmix`, `smix`, `servo`, `feature` names): https://github.com/iNavFlight/inav/blob/9.1.0/src/main/fc/cli.c
5. `src/main/fc/fc_msp_box.c` (mode names and permanent IDs used by `aux`): https://github.com/iNavFlight/inav/blob/9.1.0/src/main/fc/fc_msp_box.c
6. `src/main/fc/runtime_config.c` / `.h` (arming-blocker flags and their short names): https://github.com/iNavFlight/inav/blob/9.1.0/src/main/fc/runtime_config.c
7. `docs/Mixer.md` (mmix/smix syntax, smix input IDs): https://github.com/iNavFlight/inav/blob/9.1.0/docs/Mixer.md
8. `docs/MixerProfile.md`: https://github.com/iNavFlight/inav/blob/9.1.0/docs/MixerProfile.md
9. `src/main/drivers/pwm_mapping.c` (how outputs become motor or servo): https://github.com/iNavFlight/inav/blob/9.1.0/src/main/drivers/pwm_mapping.c
10. Target `SPEEDYBEEF405WING` (`target.c`, `target.h`, `config.c`): https://github.com/iNavFlight/inav/tree/9.1.0/src/main/target/SPEEDYBEEF405WING
11. INAV Configurator 9.1.0 `js/model.js` ("Flying Wing" mixer preset): https://github.com/iNavFlight/inav-configurator/blob/9.1.0/js/model.js (Configurator 9.1.1 is the latest stable, 2026-07-13)
12. `docs/Failsafe.md`: https://github.com/iNavFlight/inav/blob/9.1.0/docs/Failsafe.md
13. `docs/Navigation.md`: https://github.com/iNavFlight/inav/blob/9.1.0/docs/Navigation.md
14. `docs/Fixed Wing Landing.md`: https://github.com/iNavFlight/inav/blob/9.1.0/docs/Fixed%20Wing%20Landing.md
15. `docs/OSD.md`: https://github.com/iNavFlight/inav/blob/9.1.0/docs/OSD.md
16. `docs/Servo.md` and `docs/Safety.md`: https://github.com/iNavFlight/inav/blob/9.1.0/docs/Servo.md

Hardware and airframes (retailer spec pages; no manufacturer page could be fetched):

17. SpeedyBee F405 WING APP spec listing: https://www.getfpv.com/speedybee-f405-wing-app-flight-controller.html
18. Sonicmodell AR Wing Classic 900 kit / PNP listings: https://www.getfpv.com/sonicmodell-ar-wing-classic-900mm-wingspan-epp-flying-wing-rc-airplane-kit-version.html
19. Sonicmodell AR Wing 900 (RobotShop): https://jp.robotshop.com/en/products/sonicmodell-arwing-900mm-drone-fpv-flying-wing-kit-frame-only
20. ZOHD Dart XL Extreme PNP listing: https://www.getfpv.com/zohd-dart-xl-extreme-1000mm-wingspan-fpv-aircraft-rc-airplane-pnp.html
21. SunnySky X2212 V3 1400 KV listing (3-4S, 7-9 in props, 560 W claimed max): https://www.readymaderc.com/products/details/sunny-sky-x2212-v3-brushless-motor-1400kv
22. EMAX XA2212 1400 KV listing (2-3S, 8x4 to 8x6, about 900 g max thrust): https://craycle.com/product/emax-xa2212-1400kv-2-3s-brushless-motor/
23. SpeedyBee F405 WING APP spec listing (RaceDayQuads, full spec table incl. BEC peaks, weights, UART6 wireless): https://www.racedayquads.com/products/speedybee-f405-wing-app-fixed-wing-flight-controller
24. INAV 9.1.0 `src/main/flight/imu.c` (heading from compass or GPS course): https://github.com/iNavFlight/inav/blob/9.1.0/src/main/flight/imu.c

Original: `docs/research/drone-lab-b.md`, section "Fig 09" (file `13-fig09-fpv-flying-wing-on-inav.js`).

## 2. Geometry (craft frame)

**Frame convention for this craft.** x forward (nose), y left, z up, mm. A wing has no "bottom plate", so the
origin is the original figure's own planform origin: on the centreline, on the root chord line (z = 0 is the chord
plane; the airfoil top is at about +12 mm and the bottom at about -6 mm at the root). In this frame the root leading
edge is at x = +125 and the root trailing edge at x = -175. Using the original's coordinates unchanged keeps the
figure, the calculator and this sheet consistent.

### Planform (original drawing, checked)

| Item | Value | Note |
|---|---|---|
| Span | 900 mm (tip to tip, y = +-450) | matches AR Wing 900 [18] |
| Centre section | y = -40 to +40, chord 300 mm (LE x +125, TE x -175) | |
| Root chord (y = +-40) | 300 mm | |
| Tip chord (y = +-450) | 155 mm (LE x -95, TE -250) | taper ratio 0.517 |
| Leading-edge sweep | 28.2 deg (estimate: atan(220/410)) | original says "about 28 deg" |
| Quarter-chord sweep | 24.1 deg (estimate) | |
| Mean aerodynamic chord (MAC) | outer panels alone: 235 mm at y = +-223 mm, MAC leading edge x = +26.7. Whole wing incl. the 80 mm centre strip: **242.6 mm at y = +-200 mm, MAC leading edge x = +37.9** (estimate, numerical integration of c^2 and c*x_LE over the planform) | trapezoid formula MAC = 2/3 cr (1+l+l^2)/(1+l); spanwise station y = (s/3)(1+2l)/(1+l) from the panel root. Use the whole-wing values for the CG |
| Wing area | 18.7 dm2 outer panels; 21.05 dm2 including the 80 mm centre strip (estimate) | ZOHD Dart XL (1000 mm) is 19.8 dm2 [20] |
| Aspect ratio | 3.85 (estimate, b^2/S) | typical for this class |
| Thickness | root top +12 / bottom -6 mm, tip top +6 / bottom -3 mm | about 6 % at root, 6 % at tip |
| Elevons | y = +-120 to +-450, chord 55 mm, hinge line 55 mm ahead of the TE | constant-chord strip |
| Winglets | at both tips, about 118 mm tall, x -150 to -262 | |
| Pod | x -70 to +235 (305 mm), 84 mm wide, 54 mm tall; nose cone to x +258 | |
| Battery bay | 130 x 56 x 34 mm (a 4S 2200 is about 105-110 x 34 x 30 mm (unverified)) | |
| Servos | at y = +-175 with pushrods and horns | |
| GPS | 40 x 40 mm on top, behind the pod | keep 5+ cm from the ESC and power wires |

### Motor, prop, camera, battery, CG

| Item | Value |
|---|---|
| Motor | one, pusher, mount x -168 to -146 on the centreline, shaft pointing -x (aft) |
| Prop | 2-blade **pusher (P)** prop, plane at x = -198, radius 102 mm (8 in) for every option in the original |
| Prop clearance | at y = +-102 the trailing edge is at x = -186, so the 8 in disc clears the TE by about 12 mm; a 9 in prop (r 114) would still clear the elevons (they start at y = 120) but only by 6 mm in y: draw it carefully (estimate) |
| Motor number | INAV motor 1 = first motor output = pad **S1** on a SpeedyBee F405 WING (see section 4) |
| Spin direction | Not "seen from above" for a horizontal shaft. With a P (reverse-pitch) prop mounted printed side forward, the motor turns **counter-clockwise seen from behind** (clockwise seen from the nose looking aft). With a standard (non-P) prop it turns the other way. The rule that always works: the blade's rounded leading edge must lead, and air must blow **backwards** off the prop (reasoned from prop geometry; check the marking on the prop) |
| Camera | in the nose, uptilt about 10 deg (the original's lens rotation is 80 deg from vertical); FPV view tilt used in flight 3 deg. Real wings run 0-10 deg because they fly nose-level |
| Battery position | inside the pod, slid fore/aft until the CG is right. The battery is the CG ballast |
| Frame mass | 380 g "900 mm EPP wing + pod" in the original; the real AR Wing Classic kit is 280 g, PNP 400 g with motor/ESC/servos [18] |

### CG for this swept wing (corrects the original's "25 % of the wing chord")

On a swept, tapered wing the CG is a percentage of the **mean aerodynamic chord**, measured at the MAC's position, not
of the root chord. For this planform (estimates from the geometry above):

| CG at | x (mm, + is forward of origin) | Meaning |
|---|---|---|
| 10 % MAC | +14 | nose-heavy side, very stable, needs more speed |
| 15 % MAC | +1.5 | a good first-flight point (about 10 % static margin) |
| 20 % MAC | -11 | normal |
| 25 % MAC | -23 | the aft limit; roughly the neutral point of a lightly reflexed wing, too far back to fly |

So: draw the CG marks under the wing on both sides at about x = 0 to +5 mm (15 % MAC; the band +14 to -11 is the
10-20 % MAC range), i.e. about 120-125 mm behind the root leading edge. The figure's two "fingertip" marks sit at
the MAC station y = +-200, or at y = +-100 on the pod sides (same x). The original's text "about 25 % of the wing
chord" is ambiguous: 25 % of the 300 mm root chord is x = +50, which is well ahead of 10 % MAC (very nose-heavy),
while 25 % MAC is x = -23 (the neutral point). Use "about 15 % of the mean chord, about 40 % of the root chord
behind the root leading edge" in text. (Corrected in verification: the first draft put the MAC station at y = +-131.6
and the CG at x = +30 to +40, which came from halving the spanwise MAC formula.)
The manufacturers publish only a moulded CG bump (AR Wing [18]); no millimetre figure was found (unverified).
General guidance that flying wings fly at a 5-15 % static margin is textbook (unverified in a primary source in this
time box).

### Elevon throws (unverified rule of thumb)

No manufacturer throw table was found for the AR Wing 900 or ZOHD Dart XL. Common practice for 900 mm EPP wings:
about +-10-12 mm (about 12-15 deg) pitch and roll each at the trailing edge on high rate, about 60-70 % of that on low
rate, with 2-3 mm of reflex (both elevons slightly up) at neutral (unverified). In INAV the travel is set by the
`smix` weights (50 % per axis in the preset) and `servo` min/max/rate. The original's bench animation (+-22 deg) and
in-flight mix (pitch 20 deg + roll 15 deg) are larger than real but fine for visibility.

## 3. The original's catalogue, sanity-checked

The calculator stays as it is; this table says where the descriptions are untrue and what is real.

### Batteries

| Option | Original | Real-world check | Verdict |
|---|---|---|---|
| `4s2200` 4S LiPo 2200 mAh, 235 g, $34 | 14.8 V nominal | 4S 2200 mAh 25-45C LiPos weigh about 230-250 g, $25-40 (unverified retail range) | plausible |
| `4s3000li` 4S Li-ion 3000 mAh, 270 g, $45 | "nose" CG | A 4S1P 18650 pack (4 x 3000 mAh cells, about 45-48 g each) weighs about 200-220 g with leads (unverified). 270 g is heavy for 3000 mAh (that is closer to a 4S1P 21700 4000-5000 mAh pack). Li-ion cells give about 15-35 A continuous (cell dependent), so this pack is fine for cruise but sags hard at full throttle | weight high, flag it; behaviour (nose-heavy, long cruise) is right |
| `3s1300` 3S LiPo 1300 mAh, 115 g, $20 | "tail" CG | 3S 1300 LiPos weigh about 105-120 g (unverified range) | plausible; a light pack does make a wing tail-heavy if the bay was set up for a 235 g pack |

### Motors (all on 4S unless noted)

| Option | Original | Real-world check | Verdict |
|---|---|---|---|
| `2212-1400` 2212 1400KV, 55 g, $18 | default; with 8x6 on 4S the calc gives 1073 g thrust, 33 A max | 2212 1400 KV motors weigh about 50-57 g. They are 2-3S motors for 8x4-8x6 props (EMAX XA2212: 2-3S, 8x4-8x6, about 900 g max [22]); some are rated 3-4S with 7-9 in props, 560 W claimed (SunnySky X2212 V3 [21]). A static model (estimate: Ct 0.11, Cp 0.065 for an 8x6, Rm 0.09 ohm) gives about 15,300 rpm, 1.5 kg, **about 43 A and 630 W** on 4S: over most 2212s and over the 40 A ESC. On 3S the same model gives about 27 A, 0.95 kg | **implausible as a default.** Real 4S 2212 wing builds use about 1000-1200 KV with 8x6, or 1400 KV with 6-7 in props. Say so in the lesson text; keep the numbers |
| `2810-1100` 2810 1100KV, 80 g, $28 | | 2810 1100 KV (e.g. T-Motor F100 2810, a 6S cinematic quad motor) is about 75-80 g (unverified). On 4S with 8x6, estimate about 31 A / 1.4 kg | plausible; a better 4S wing motor than the 2212/1400 |
| `2306-2400` 2306 2400KV (quad motor), 33 g, $20 | flagged "over" in all 9 combos | 2306 2400 KV is a 4S 5-inch quad motor, about 32-34 g. With an 8x6 on 4S, estimate about 110 A: it would burn out or the ESC would fail in seconds | the "overload" lesson is right; the real failure is a fried motor/ESC, not "no effect" (the sim shows none) |

### Props

| Option | Original | Check | Verdict |
|---|---|---|---|
| `8x6` pusher, 12 g, $3 | `pf` 1, `eff` 1 | 8x6 E-type pushers (APC 8x6EP, Master Airscrew) weigh about 10-14 g, $3-5 (unverified) | plausible |
| `7x5` pusher, 9 g | `pf` 0.75 | 7x5 about 8-9 g (unverified); thrust about 0.6-0.75 of an 8x6 at the same voltage (estimate) | plausible |
| `9x6` pusher, 15 g | `pf` 1.25 | 9x6 about 14-17 g (unverified); thrust about 1.3x and current about 1.25x an 8x6 (estimate) | plausible; still drawn at 8 in radius in the figure, which is wrong for 7 and 9 in props (r 89 / 114 mm) |

### Fixed parts

| Part | Original g / $ | Real check | Verdict |
|---|---|---|---|
| `FRAME` 900 mm EPP wing + pod | 380 / 55 | AR Wing Classic kit 280 g [18] (another listing 203 g kit [19]); with pod, spar, winglets 300-380 g | plausible upper end |
| `ESC` 40 A with 5 V BEC | 30 / 22 | 40 A fixed-wing ESC with 3-5 A BEC: 30-40 g (unverified) | plausible. 40 A is right for this class (ZOHD uses 30-40 A [20]) |
| `FC` F405 wing FC | 10 / 45 | Wing FCs come with a PDB (current sensor + three BECs): SpeedyBee F405 WING APP is FC 8.9 g + PDB 11.4 g + wireless board 4.2 g = about 24.5 g [23]; Matek F405-WTE similar (unverified) | **10 g is too light**; $45-60 is right (unverified) |
| `GPS` M10 GPS + compass | 15 / 22 | M10 GPS + QMC5883/IST8310 compass modules: 8-15 g, $20-35 (unverified) | plausible |
| `CAM` analog FPV camera | 12 / 22 | micro/nano analog cams 5-12 g | plausible |
| `VTX` 5.8 GHz + antenna | 10 / 25 | plausible |
| `RX` ELRS 2.4 GHz | 3 / 18 | ELRS nano receivers about 1-3 g with antenna | plausible. For a long-range wing a 900 MHz ELRS link is also common |
| `SERVOS` 2 x 9 g metal-gear | 20 / 16 | 9 g metal-gear servos (e.g. EMAX ES08MA II) weigh about 12 g each, so 24 g (unverified) | slightly light; fine |
| `XT60` + low-ESR cap | 12 / 4 | wiring diagram says 470 uF 25 V | 25 V is enough for 4S (16.8 V full); 35 V gives more headroom (rule of thumb) |
| `TOP` hatch, pushrods, horns | 25 / 8 | plausible |
| `WIRES` | 6 / 3 | plausible |

### Calculator outputs (default build, kept identical)

| Output | Original | Real-world | Verdict |
|---|---|---|---|
| AUW | 825 g | 800-1000 g is right for a 900 mm 4S wing (ZOHD XL max 1200 g [20]) | fine |
| T:W | 1.30 | 0.5-1.0 is typical; >1 means vertical climbs | high because the motor is overloaded (above) |
| Stall | 7.67 m/s (28 km/h) | Wing loading 39 g/dm2; with CLmax 0.6-0.8 for a reflexed foam wing, stall is about 8.9-10.2 m/s (32-37 km/h) (estimate). The original's vstall needs CL 1.07: too optimistic. Its `vmin` 9.36 m/s (CL 0.72) is the realistic stall | stall slightly low |
| Cruise | 14.5 m/s (52 km/h) | AR Wing 900 / Dart XL cruise 45-65 km/h; AR Wing listing gives 10 to 80+ km/h overall [18]; cruise CL 0.30 (estimate) | fine |
| Top speed | 146 km/h | the 8x6 at about 15,000 rpm loaded has a pitch speed of about 140 km/h (estimate: 15,300 rpm x 6 in); a draggy FPV wing reaches about 70-85 % of pitch speed, so 100-120 km/h (estimate). ZOHD XL quotes "100+ km/h" [20] | high; say "about 110 km/h" in any text |
| Cruise current | 3.7 A | 3-6 A on 4S at 50-60 km/h for this class (unverified, pilot reports) | fine |
| Flight time | 31 min cruise (24 min "fly") | 25-45 min is typical; ZOHD XL 40 min on 4S 3300 [20] | fine |
| L/D 6 | foam wing | 6-8 for a podded EPP wing with winglets (unverified) | fine, slightly pessimistic |

## 4. Electronics and wiring

### Reference FC: SpeedyBee F405 WING APP (INAV target `SPEEDYBEEF405WING`) [10][17]

| Item | Value |
|---|---|
| MCU | STM32F405 (168 MHz, 1 MB flash); IMU ICM-42688-P (target driver ICM42605, on SPI1, CS PA4); baro SPL06-001 on I2C1; OSD AT7456E on SPI2 (CS PB12) [10][23] |
| Mounting | (unverified) not a 30.5 mm stack: a wing FC + PDB pair, usually mounted flat in the pod with double-sided tape, arrow to the nose (board alignment can be changed with `align_board_yaw`, decidegrees) [2] |
| Power input | 2-6S (7-36 V), current sensor 90 A continuous / 215 A peak [17] |
| BECs | FC 5.2 V 2.4 A continuous / 3 A peak; VTX 9 V (12/5 V by jumper) 1.8 A continuous / 2.3 A peak; servo 4.9 V (6/7.2 V by jumper) 4.5 A continuous / 5.5 A peak [17][23] |
| Outputs | S1-S11 PWM (timers TIM4: S1 S2; TIM3: S3 S4; TIM8: S5 S6 S7; TIM2: S8 S9 S10; TIM12: S11) + LED pad (TIM1, WS2812) [10] |
| Default UARTs | UART1 = serial RX, provider CRSF (ELRS); UART3 = GPS; UART6 = MSP, which on this board is dedicated to the wireless (Bluetooth/Wi-Fi) board for the SpeedyBee app [23]; UART2 TX (PA2) can be a soft serial [10]. Six UARTs in all (UART1-6) |
| I2C | I2C1 (PB8 SCL, PB9 SDA): baro on board; external compass, pitot (airspeed) and rangefinder all on this bus [10] |
| LEDs / buzzer | blue LED0 PA14, green LED1 PA13, beeper PC15 (inverted) [10] |

**Which pad drives what (corrects the original).** INAV assigns the first motor output first, and every other pad
on that motor's timer becomes a motor pad too; servos then take the next free timers in order [9]. With one motor:

| Function | INAV index | Pad on SpeedyBee F405 WING |
|---|---|---|
| Pusher motor (ESC signal) | motor 1 (`mmix 0`) | **S1** (S2 shares TIM4, so it is also motor-only) |
| Left/right elevon (first servo) | servo 1 in the preset | **S3** |
| Other elevon (second servo) | servo 2 in the preset | **S4** |

The original says "S1/S2 drive the elevons, S3 the motor": that is not what INAV does on this board. Which elevon
is "servo 1" is set by the `smix` sign convention and checked on the bench (section 6), not fixed by the board.
`timer_output_mode <timer> <AUTO|MOTORS|SERVOS|LED>` can override the assignment (the help text lists only the first three, but the parser also accepts LED) [4].

### Other parts

| Part | Fact |
|---|---|
| ESC | a single 30-40 A fixed-wing ESC (BLHeli_S / BLHeli_32 / AM32 or a "SimonK"-style plane ESC). Many plane ESCs only take PWM; INAV `motor_pwm_protocol` options are STANDARD, ONESHOT125 (default), MULTISHOT, BRUSHED, DSHOT150, DSHOT300, DSHOT600 [2]. With a PDB-style wing FC the ESC's own BEC is not needed (cut or remove its red wire if the FC servo rail is powered by the FC BEC) (unverified general practice) |
| Receiver | ELRS (CRSF protocol) on UART1, `serialrx_provider = CRSF` [10][2] |
| Video | analog camera into the FC's CAM pad, VTX from the FC's VTX pad; INAV's analog OSD (AT7456E) overlays altitude, speed, home arrow. VTX control by SmartAudio or Tramp on a UART (`vtx_band`, `vtx_channel`, `vtx_power` [2]); HD systems use MSP DisplayPort (`osd_video_system` = HDZERO, DJIWTF, AVATAR, BF43COMPAT, BFHDCOMPAT or DJI_NATIVE [2]) |
| GPS / compass | M10 GPS on UART3 (`gps_provider = UBLOX` default [2]); compass on I2C1. On fixed wing, INAV can navigate on GPS course alone; a compass is optional (`mag_hardware = NONE` is common on wings; default is AUTO [2]). In `imu.c`, `isImuHeadingValid()` is true with a calibrated compass **or** once the GPS course heading is initialised in flight [24]. Navigation.md's "POSHOLD and RTH need a compass" is written for multirotors [13] |
| Airspeed | optional pitot on I2C (`pitot_hardware` = MS4525, DLVR-L10D, MS5525, MSP...), analog (ADC) or `VIRTUAL` (GPS-estimated) [2] |
| Power connector | XT60 on the PDB; low-ESR capacitor (470 uF, 25 V for 4S or 35 V for up to 6S) soldered at the PDB pads, stripe (minus) to the negative pad |
| Wire colours | battery red (+) / black (-); servo leads brown or black = GND, red = +5 V (or 6 V), orange/yellow/white = signal; motor phases are three unmarked (often black) leads, any two swap to reverse direction |

## 5. Firmware: INAV

**Current stable version (verified 2026-10-24): INAV 9.1.0, released 2026-07-09** [1]. Prior stable: 9.0.1
(2026-02-14). INAV 10.0.0 is at release-candidate stage (rc2, 2026-09-29) and is not stable. Configurator: 9.1.1
(2026-07-13) [11]. All snippets below are checked against the 9.1.0 sources.

### 5.1 Initial setup (CLI)

```
# platform and mixer: same as Configurator 9.1.0 preset "Flying Wing" [11]
mixer_profile 1
set platform_type = AIRPLANE
set motorstop_on_low = ON
mmix reset
mmix 0 1.000 0.000 0.000 0.000      # motor 1 (pad S1 on SpeedyBee F405 WING): throttle only
smix reset
smix 0 1 0  50 0 -1                 # servo 1 (pad S3): Stabilised ROLL  +50 %
smix 1 1 1  50 0 -1                 # servo 1:          Stabilised PITCH +50 %
smix 2 2 0 -50 0 -1                 # servo 2 (pad S4): Stabilised ROLL  -50 %
smix 3 2 1  50 0 -1                 # servo 2:          Stabilised PITCH +50 %
# receiver, GPS
set serialrx_provider = CRSF
feature GPS
save
```

Syntax, verified in `cli.c` and `Mixer.md` [4][7]:

- `mmix <n> <throttle> <roll> <pitch> <yaw>`: n = motor index from 0; throttle weight 0.0..1.0 (0 disables the rule),
  roll/pitch/yaw -1.0..1.0 (fixed-wing roll/pitch/yaw usually 0) [7]. `mmix reset` clears all rules.
- `smix <rule> <servo_index> <input_id> <weight %> <speed> <logic_condition_id>`: weight -1000..1000, speed 0 = no
  limit (1 = 10 us/s), condition -1 = always. Input IDs: 0 Stabilised ROLL, 1 Stabilised PITCH, 2 Stabilised YAW,
  3 Stabilised THROTTLE, 4-7 raw RC roll/pitch/yaw/throttle, 8-11 RC ch 5-8, 14 FEATURE FLAPS, 29 FIXED-VALUE [7].
  Servo index: only the order matters; the lowest index used goes to the first servo output [7].
- `servo <n> <min> <max> <mid> <rate>`: min/max/mid in us, rate -125..125 %; **a negative rate reverses that servo**
  (e.g. `servo 1 1000 2000 1500 -100`) [4][16]. Servo reversal is per servo; reversing the sign of one `smix`
  weight reverses only that axis on that servo.
- **Mixer profiles (INAV 7+):** `platform_type`, `motorstop_on_low`, `motor_direction_inverted`, the `mmix`/`smix`
  rules and `mixer_automated_switch` live in the mixer profile (`PG_MIXER_PROFILE`) [2][8]. A plain wing uses only
  `mixer_profile 1`; profile 2 (mode `MIXER PROFILE 2`) is for VTOLs.
- `platform_type` values: MULTIROTOR, AIRPLANE, HELICOPTER, TRICOPTER, ROVER, BOAT (only MULTIROTOR, AIRPLANE and
  TRICOPTER implemented) [2].

### 5.2 Modes (`aux`)

`aux <index> <mode permanent ID> <aux channel index> <start us> <end us>`; aux channel 0 = AUX1 (RC channel 5) [4].
Mode IDs from `fc_msp_box.c` [5]:

| Mode | ID | Mode | ID |
|---|---|---|---|
| ARM | 0 | NAV RTH | 10 |
| ANGLE | 1 | MANUAL | 12 |
| HORIZON | 2 | FAILSAFE | 27 |
| NAV ALTHOLD | 3 | NAV WP | 28 |
| NAV POSHOLD (loiter on a wing) | 11 | TURN ASSIST | 35 |
| NAV LAUNCH | 36 | SERVO AUTOTRIM | 37 |
| NAV COURSE HOLD | 45 | NAV CRUISE | 53 |
| AUTO LEVEL TRIM | 54 | ANGLE HOLD | 64 |

Example (ARM on AUX1 high, modes on a 3-position AUX2, LAUNCH on AUX3, RTH on AUX4):

```
aux 0 0  0 1700 2100     # ARM            AUX1 high
aux 1 12 1  900 1300     # MANUAL         AUX2 low
aux 2 1  1 1300 1700     # ANGLE          AUX2 mid
aux 3 53 1 1700 2100     # NAV CRUISE     AUX2 high
aux 4 36 2 1700 2100     # NAV LAUNCH     AUX3 high
aux 5 10 3 1700 2100     # NAV RTH        AUX4 high
```

With no mode active a wing flies in ACRO (rate) mode with the stabiliser on (INAV wiki behaviour, unverified in source); `MANUAL` passes sticks straight to the
servos (scaled by `manual_roll_rate` / `manual_pitch_rate`, **0-100 % servo travel**, not deg/s [2]).

### 5.3 Parameters the original used, verified

| Original line | Real in 9.1.0? | Unit / range / default [2] | Note |
|---|---|---|---|
| `aux 0 0 0 1300 2100` (ARM) | yes | | valid syntax |
| `aux 1 1 1 900 1300` (ANGLE) | yes | | valid syntax |
| `set fw_level_pitch_trim = 0` | yes | degrees, -10..10, default 0; "+5 = nose raised 5 deg" | real wings often need +1..+4; mode AUTO LEVEL TRIM learns it |
| `set max_angle_inclination_rll = 450` | yes | decidegrees, 100..900, default 450 (45 deg) | |
| `set manual_roll_rate = 100`, `manual_pitch_rate = 100` | yes | % servo travel in MANUAL, default 100 | the sim's 220 / 140 deg/s are not these units |
| `set fw_turn_assist_pitch_gain = 0` | yes | 0..2, default 1 | only acts in TURN ASSIST / nav modes, not in MANUAL; setting 0 there is pointless (leave 1) |
| `set nav_rth_altitude = 1500` (RTH panel) / `2000` (build panel) | yes | **cm**, max 65000, default 1000 (10 m) | the two panels disagree; 15-20 m is low for a wing over trees: 50 m (5000) is a sensible teaching value. How it is used depends on `nav_rth_alt_mode` (CURRENT, EXTRA, FIXED, MAX, AT_LEAST; default AT_LEAST) |
| `set nav_fw_loiter_radius = 2200` | yes | **cm**, 0..30000, default 7500 (75 m); doc says "3000 to 7500 is a good value" | **22 m is too tight**: at 15 m/s with the default `nav_fw_bank_angle = 35` deg the tightest coordinated circle is v^2/(g tan 35) = 33 m (estimate). Use 5000 (50 m). This is also why the original sim orbits at about 49 m |
| `set failsafe_procedure = RTH` | yes | LAND (default), DROP, RTH, NONE | |
| `set nav_rth_allow_landing = NEVER` | yes | NEVER, ALWAYS (default), FS_ONLY | the docs text says "FAILSAFE" [14] but the CLI value is `FS_ONLY` [2]. With landing allowed and no Safehome/landing site set, a wing does the old "circle down" landing; full fixed-wing autoland (since 7.1) needs a Safehome with approach headings [14] |
| `set nav_fw_cruise_speed = 1500` | yes | **cm/s**, default 0 | only used to estimate remaining flight time/distance; it does not set the speed INAV flies |
| `set fw_turn_assist_yaw_gain = 1` | yes | 0..2, default 1 | no effect on a wing without a rudder |
| `set osd_stats_page = ON` | **no, does not exist** in 9.1.0 | | INAV shows the stats page automatically on disarm. Real related settings: `osd_stats_energy_unit` (MAH / WH), `osd_stats_page_auto_swap_time` (s, default 3), `osd_stats_show_metric_efficiency`, and `stats = ON` for the lifetime odometer [2][15]. There is no lap timer in INAV stats |
| `servo 1 1000 2000 1500 -100` | yes | rate -125..125 | reverses servo 1; correct command |
| `smix` lines in the build panel | yes | | identical to the Configurator preset [11]; the comments "S1 left elevon / S2 right" mean servo index 1/2, not pads S1/S2 |
| `mmix 0 1.000 0.000 0.000 0.000 # one motor on S3` | syntax yes | | comment is wrong: motor 1 is on **S1** on wing boards like the SpeedyBee F405 WING (section 4) |

### 5.4 Launch (NAV LAUNCH) [2]

Enable by the `NAV LAUNCH` mode (ID 36) on a switch, or always with `feature FW_LAUNCH` [4]. Arm, select launch,
raise the throttle stick (motor stays at idle), throw: INAV detects the throw, waits, then spins up and climbs.

| Parameter | Default | Unit / meaning |
|---|---|---|
| `nav_fw_launch_accel` | 1863 | cm/s^2 forward acceleration to detect a throw (1 G = 981) |
| `nav_fw_launch_velocity` | 300 | cm/s, swing-launch detection |
| `nav_fw_launch_detect_time` | 40 | ms the thresholds must hold |
| `nav_fw_launch_max_angle` | 45 | deg max tilt for a valid launch |
| `nav_fw_launch_motor_delay` | 500 | ms from detection to motor start (keeps the prop off the hand) |
| `nav_fw_launch_spinup_time` | 100 | ms idle to launch throttle |
| `nav_fw_launch_thr` | 1700 | us launch throttle |
| `nav_fw_launch_idle_thr` | 1000 | us before the throw |
| `nav_fw_launch_climb_angle` | 18 | deg nose-up attitude |
| `nav_fw_launch_timeout` | 5000 | ms, then normal flight |
| `nav_fw_launch_max_altitude` | 0 | cm, 0 = off |
| `nav_fw_launch_end_time` | 3000 | ms blend into the next mode |
| `nav_fw_launch_min_time` | 0 | ms sticks ignored |
| `nav_fw_launch_manual_throttle` | OFF | ON = pilot controls throttle |
| `nav_fw_launch_land_abort_deadband` | 100 | stick points to abort |
| `nav_fw_launch_wiggle_to_wake_idle` | 0 | 1-2 yaw wiggles start idle |

The original's sim (throttle > 25 % = instant launch at 10.5 m/s) is a manual throw, not NAV LAUNCH.

### 5.5 Navigation, cruise and airspeed [2]

| Parameter | Default | Unit |
|---|---|---|
| `nav_fw_cruise_thr` | 1400 | us, base throttle in nav modes incl. RTH |
| `nav_fw_min_thr` / `nav_fw_max_thr` | 1200 / 1700 | us |
| `nav_fw_bank_angle` | 35 | deg, max bank in nav modes |
| `nav_fw_climb_angle` / `nav_fw_dive_angle` | 20 / 15 | deg |
| `nav_fw_pitch2thr` | 10 | throttle per degree of pitch |
| `fw_loiter_direction` | RIGHT | loiter clockwise (centre on right wing); LEFT, RIGHT or YAW (stick-selectable). The name has no `nav_` prefix |
| `nav_rth_climb_first` | ON | OFF, ON, ON_FW_SPIRAL |
| `nav_min_rth_distance` | 500 | cm |
| `nav_rth_abort_threshold` | 50000 | cm (aborts RTH to an emergency landing if distance grows by this much) |
| `fw_reference_airspeed` | 1500 | cm/s, airspeed the PIDs were tuned at; used for turn coordination without a pitot |
| `pitot_hardware` | NONE | NONE, AUTO, MS4525, ADC, VIRTUAL, FAKE, MSP, DLVR-L10D, MS5525 |
| `osd_airspeed_alarm_min` / `_max` | 0 / 0 | cm/s, blink thresholds |
| `fw_min_throttle_down_pitch` | 0 | decidegrees nose-down at zero throttle in ANGLE |

NAV CRUISE holds heading and altitude; roll stick changes heading, pitch stick changes altitude (INAV docs) (unverified
wording; mode ID 53 verified [5]).

### 5.6 Failsafe [2][12]

```
set failsafe_procedure = RTH        # LAND (default), DROP, RTH, NONE
set failsafe_delay = 5              # deciseconds before stage 2 (default 5 = 0.5 s)
set failsafe_recovery_delay = 5     # deciseconds
set failsafe_off_delay = 200        # deciseconds, motor-off timeout for LAND
set failsafe_stick_threshold = 50   # stick movement needed to take back control
set failsafe_min_distance = 0       # cm; inside it use failsafe_min_distance_procedure (default DROP)
```

LAND on a fixed wing circles down using `failsafe_fw_roll_angle` (-200 decideg = 20 deg left bank),
`failsafe_fw_pitch_angle` (100 decideg = 10 deg dive) and `failsafe_fw_yaw_rate` (-45 deg/s) [2]. After a disarming
failsafe, re-arming is locked until the link has been back for 30 s and the arm switch is off [12].

### 5.7 OSD, VTX, motor direction, calibration, arming

- OSD: enabled by `feature OSD`; layout by `osd_layout` [4]; `osd_video_system` AUTO/PAL/NTSC/HD options [2].
- VTX: `vtx_band` (1 A, 2 B, 3 E, 4 F, 5 Race), `vtx_channel` 1-8, `vtx_power` (index, VTX-specific),
  `vtx_low_power_disarm`, `vtx_max_power_override` [2]. INAV has no Betaflight-style `vtxtable` command: there is
  no `vtx*` command in the 9.1.0 `cli.c` command table [4]; power levels come from the VTX itself over
  SmartAudio/Tramp/MSP.
- RPM filter: `feature RPM_FILTERS` exists [4] but needs ESC RPM telemetry; it is rarely used on a single-motor wing.
- **Motor direction reversal:** INAV has no CLI command to reverse an ESC. Swap any two of the three motor wires, or
  reverse it in the ESC's configurator (BLHeli/AM32) or by the ESC's programming card. `motor_direction_inverted`
  only flips the yaw mixing of multirotors/differential thrust [2].
- **Servo reversal:** `servo <n> ... <negative rate>` or the "Reverse" box in the Outputs tab [16].
- **Accelerometer calibration:** Configurator Calibration tab, 6-position calibration (level, upside down, nose
  down, nose up, left side, right side) (unverified wording; INAV wiki). For a wing, "level" means the wing's flying
  attitude; then trim with `fw_level_pitch_trim` or AUTO LEVEL TRIM.
- **Compass calibration** (if fitted): Calibration tab, 30 s, rotate the plane through every axis (unverified).
- **Arming blockers** (short names from `runtime_config.c` [6], shown in `status` and the Configurator):
  `GEOZONE`, `FS` (failsafe), `ANGLE` (not level, see `small_angle`, default 25 deg), `CAL` (sensors calibrating),
  `OVRLD` (CPU overload), `NAV` (navigation unsafe: e.g. no GPS fix with a nav mode configured,
  `nav_extra_arming_safety` ON or ALLOW_BYPASS (default) [2]), `COMPASS` (not calibrated), `ACC` (not calibrated),
  `ARMSW` (arm switch on at boot), `HWFAIL`, `BOXFS` (failsafe mode switch), `RX` (no link), `THR` (throttle not
  low), `CLI`, `CMS`, `OSD` (menu open), `ROLL/PITCH` (sticks not centred), `AUTOTRIM`, `OOM`, `SETTINGFAIL`,
  `PWMOUT` (output/mixer error), `NOPREARM` (PREARM mode required), `DSHOTBEEPER`, `LANDED`.

### 5.8 Renamed or moved settings (recent versions)

- Mixer settings (`platform_type`, `motorstop_on_low`, mixer rules) live in **mixer profiles** [2][8] (introduced
  around INAV 7 (unverified version)). There is no `MOTOR_STOP` in the 9.1.0 feature list [4]; `motorstop_on_low`
  (default ON, per mixer profile) does that job [2]. Old guides that say `feature MOTOR_STOP` are out of date.
- `failsafe_procedure` "SET-THR" was renamed `LAND` (docs still say "LAND (or old SET-THR)") [2].
- `nav_rth_allow_landing` takes `NEVER / ALWAYS / FS_ONLY` (not ON/OFF) [2].
- Board alignment is `align_board_roll/pitch/yaw` in **decidegrees** [2].

## 6. Safety tests (bench)

| Test | How | What it catches |
|---|---|---|
| Smoke stopper | A resettable fuse or a current-limited inline device (often a small bulb or PTC, or a bench supply with current limit) between battery and XT60 for the first power-up. A short makes the stopper take the current (bulb glows, fuse trips) instead of the FC/ESC | solder bridges, reversed XT60/capacitor, a pinched wire |
| Props-off motor direction | INAV Configurator **Outputs** tab (enable the motor test switch, raise the slider) with the prop off; mark the bell and watch rotation. Then, prop on and the wing held firmly, feel the air blow **backwards** | motor spinning the wrong way (fix: swap two motor wires or reverse in the ESC tool); a backwards prop |
| Elevon direction, manual | Outputs/Receiver: stick back = both elevons **up**; stick right = **right elevon up, left down** | a reversed servo or wrong smix sign |
| Elevon direction, stabiliser | In ANGLE (or ACRO), armed props-off or with the motor disabled, tilt the wing by hand: roll right wing down -> right elevon goes **down** (lifts that wing back); nose down -> both go **up** | reversed board alignment or stabilisation sign; this catches what the stick test cannot |
| Accelerometer calibration | 6-position in the Calibration tab, then check the horizon in the Setup tab | wrong `align_board_*`, an FC mounted backwards (the model rolls the wrong way on screen) |
| Compass calibration | 30 s rotation in the Calibration tab, check heading vs. a real compass | interference from the ESC/battery leads |
| CG check | balance on two fingertips at the CG marks (section 2): slightly nose-down is right | tail-heavy packs (unrecoverable pitch-up and stall) |
| Pre-arm / failsafe | `status` command shows blocker flags; switch the radio off with props off and watch FAILSAFE engage | link loss handling, wrong `failsafe_procedure` |
| GPS fix | wait for 3D fix and HDOP < 2 before the first RTH flight; home is set at arming [13] | RTH to a wrong home |

## 7. Flight characteristics (800-1000 g, 900 mm wing)

| Quantity | Value |
|---|---|
| AUW | 800-1000 g (default build 825 g) |
| Wing loading | 38-48 g/dm2 (estimate, 21 dm2) |
| Stall | about 9-10 m/s (32-37 km/h) at 825 g; about 10-11 m/s at 1000 g (estimate, CLmax 0.6-0.8) |
| Cruise | 13-17 m/s (45-60 km/h) (estimate; AR Wing listing 10-80+ km/h [18]) |
| Top speed | about 100-120 km/h on 4S 8x6 (estimate) |
| L/D | about 6-8 (unverified) |
| Cruise throttle | 30-45 % |
| Cruise current | 3-6 A on 4S (unverified) |
| Full-throttle current | 25-40 A depending on motor/prop (estimate, section 3) |
| Flight time | 25-45 min cruise on 4S 2200-3300 (ZOHD XL quotes about 40 min on 4S 3300 [20]) |
| Launch | hand throw, wings level, 5-10 deg nose up, into the wind, at 50-70 % throttle or by NAV LAUNCH |
| Motor-out | it is a glider: it glides at about L/D 6-8 and lands on its belly |

## 8. Real failure modes

| Failure | What the pilot sees |
|---|---|
| Reversed elevon (servo or smix sign) | rolls or pitches the wrong way right after the throw, usually straight into the ground |
| FC mounted backwards / wrong `align_board_yaw` | the stabiliser fights the wrong way: the wing rolls over in ANGLE as soon as it leaves the hand; the Configurator model moves the wrong way |
| Tail-heavy CG | pitch-ups, porpoising, a stall it cannot recover from; often an immediate loop into the ground after launch |
| Nose-heavy CG | needs more up-trim and speed, sinks on launch, but it flies |
| Stall at launch | thrown too slow or nose too high: the wing drops a tip and spins in |
| Backwards prop / wrong spin | weak or no thrust, slow climbs; a pusher spinning the wrong way blows air forward into the thrower's hand |
| Over-propped motor (e.g. 2212/1400 with 8x6 on 4S, or a quad motor) | hot motor, ESC thermal cut-out or burnt ESC, sudden motor stop mid-flight |
| BEC brown-out | stalled or binding servos pull amps, FC reboots, video drops and surfaces freeze: a crash |
| Missing capacitor | voltage spikes reset the FC or kill the VTX; noise lines in the video |
| ESC desync | stutter or stop at punch-out, worse with high-KV motors |
| GPS errors | no 3D fix: nav modes blocked (`NAV` blocker); bad home: RTH flies to the wrong place; GPS too near the VTX: lost fix |
| Compass interference (if fitted) | heading wrong, RTH circles or flies away |
| RTH too low | flies home into trees (raise `nav_rth_altitude`) |
| Hatch opening | battery falls out in flight |
| Antennas inside the pod / next to carbon | short range, early failsafe |

## 9. Uncertainties

- No manufacturer CG figure or elevon throw table was found for AR Wing 900 or ZOHD Dart XL; the CG and throw values
  in section 2 are calculated from the original's planform and rules of thumb.
- Motor thrust and current in section 3 come from a simple static prop/motor model with assumed coefficients (Ct,
  Cp, winding resistance), not from a manufacturer thrust table; treat them as +-25 %.
- Part weights marked "(unverified)" are typical retail figures from memory, not checked product pages.
- The pad mapping (motor S1, servos S3/S4) is derived from the INAV 9.1.0 `pwm_mapping.c` logic and the SpeedyBee
  target's timer list; it was not confirmed on hardware or in SpeedyBee's manual.
- Fixed-wing RTH without a compass: confirmed from `imu.c` (GPS course heading) [24]; not flight-tested here.
- Accelerometer/compass calibration step wording is from general INAV knowledge, not from a fetched doc page.

## Verification

Adversarial fact-check, 2026-10-24 14:11-14:20 CDT. Each claim was checked against the source opened during the
check (INAV and Configurator files fetched at tag `9.1.0` from raw.githubusercontent.com, the GitHub releases API, and
retailer spec pages, since no SpeedyBee/Sonicmodell/ZOHD manufacturer page loaded). Geometry was recomputed from the
planform coordinates in section 2.

| # | Claim | Status | Source | Old -> new (corrections) |
|---|---|---|---|---|
| 1 | INAV 9.1.0 is current stable (2026-07-09); 10.0.0-rc1/rc2 are pre-releases; 9.0.1 prior (2026-02-14) | confirmed | https://api.github.com/repos/iNavFlight/inav/releases | |
| 2 | Configurator 9.1.1 latest stable (2026-07-13) | confirmed | https://api.github.com/repos/iNavFlight/inav-configurator/releases | |
| 3 | SpeedyBee F405 WING output timers S1-S11 (TIM4 S1 S2, TIM3 S3 S4, TIM8 S5-S7, TIM2 S8-S10, TIM12 S11) + LED on TIM1 | confirmed | https://github.com/iNavFlight/inav/blob/9.1.0/src/main/target/SPEEDYBEEF405WING/target.c | |
| 4 | One motor -> S1 (S2 also motor-only, same TIM4); servos 1/2 -> S3/S4 | confirmed (from `pwmEnsureEnoughtMotors` / `pwmBuildTimerOutputList` logic; not bench-tested) | https://github.com/iNavFlight/inav/blob/9.1.0/src/main/drivers/pwm_mapping.c | |
| 5 | LED0 PA14 blue, LED1 PA13 green, beeper PC15 inverted; I2C1 PB8 SCL / PB9 SDA with baro, mag, pitot, rangefinder | confirmed | https://github.com/iNavFlight/inav/blob/9.1.0/src/main/target/SPEEDYBEEF405WING/target.h | |
| 6 | Default UARTs: UART1 serial RX CRSF, UART3 GPS, UART6 MSP | confirmed; UART6 use resolved | config.c / target.h [10]; https://www.racedayquads.com/products/speedybee-f405-wing-app-fixed-wing-flight-controller | "unverified which UART the BT module uses" -> UART6 is dedicated to the wireless board |
| 7 | FC BEC voltage | corrected | https://www.racedayquads.com/products/speedybee-f405-wing-app-fixed-wing-flight-controller | header said 5 V 2.4 A -> 5.2 V 2.4 A (3 A peak) |
| 8 | Current sensor 90 A / 215 A, 2-6S (7-36 V), VTX BEC 9 V 1.8 A (12/5 V jumper), servo BEC 4.9 V 4.5 A/5.5 A (6/7.2 V jumper), 11 PWM + LED | confirmed (VTX peak 2.3 A added) | same RaceDayQuads listing; WebSearch summary of fpvfaster.com.au listing agrees | |
| 9 | FC weight in the parts table | corrected | same RaceDayQuads listing | "about 20-30 g (unverified)" -> 8.9 + 11.4 + 4.2 g = 24.5 g |
| 10 | MCU / sensors: STM32F405, ICM-42688-P, SPL06, AT7456E | confirmed (added) | target.h [10]; RaceDayQuads listing | |
| 11 | Configurator "Flying Wing" preset: mmix 1/0/0/0; smix servo1 roll +50, pitch +50; servo2 roll -50, pitch +50; motorstop on low | confirmed | https://github.com/iNavFlight/inav-configurator/blob/9.1.0/js/model.js | |
| 12 | smix syntax, weight -1000..1000, speed 1 = 10 us/s, input IDs 0-11, 14, 29; lowest servo index -> first servo | confirmed | https://github.com/iNavFlight/inav/blob/9.1.0/docs/Mixer.md ; cli.c help string | |
| 13 | mmix weight ranges | corrected | Mixer.md | "weights -1.0..1.0" -> throttle 0.0..1.0, roll/pitch/yaw -1.0..1.0 |
| 14 | `servo <n> <min> <max> <mid> <rate>`, rate -125..125, negative reverses | confirmed | cli.c `cliServo`; https://github.com/iNavFlight/inav/blob/9.1.0/docs/Servo.md | |
| 15 | `timer_output_mode` values | corrected | cli.c `cliTimerOutputMode` | AUTO/MOTORS/SERVOS -> also LED |
| 16 | Mode permanent IDs (ARM 0 ... ANGLE HOLD 64, MIXER PROFILE 2 = 62) | confirmed | https://github.com/iNavFlight/inav/blob/9.1.0/src/main/fc/fc_msp_box.c | |
| 17 | Settings in 5.3 (fw_level_pitch_trim, max_angle_inclination_rll, manual_*_rate, turn-assist gains, nav_rth_altitude 1000 cm, nav_rth_alt_mode values, nav_fw_loiter_radius 7500 cm, failsafe_procedure LAND default, nav_rth_allow_landing NEVER/ALWAYS/FS_ONLY, nav_fw_cruise_speed cm/s); `osd_stats_page` absent | confirmed | https://github.com/iNavFlight/inav/blob/9.1.0/src/main/fc/settings.yaml | |
| 18 | NAV LAUNCH defaults (16 parameters in 5.4) | confirmed, all 16 | settings.yaml | |
| 19 | Nav/cruise defaults in 5.5 | confirmed except one name | settings.yaml | `nav_fw_loiter_direction` (does not exist) -> `fw_loiter_direction` (RIGHT/LEFT/YAW) |
| 20 | Failsafe defaults (delay 5, recovery 5, off 200, stick 50, min_distance 0 / DROP, fw roll -200, pitch 100 = dive, yaw -45), 30 s re-arm lock | confirmed | settings.yaml; https://github.com/iNavFlight/inav/blob/9.1.0/docs/Failsafe.md | |
| 21 | motor_pwm_protocol, pitot_hardware, osd_video_system, platform_type, serialrx_provider value lists | confirmed (the description text of motor_pwm_protocol mentions ONESHOT42 but the lookup table does not contain it) | settings.yaml | |
| 22 | Feature list: no MOTOR_STOP; FW_LAUNCH, RPM_FILTERS, GPS, OSD exist; no `vtx*` CLI command; arming-blocker short names | confirmed | cli.c `featureNames` and command table; https://github.com/iNavFlight/inav/blob/9.1.0/src/main/fc/runtime_config.c | |
| 23 | Mixer settings live in PG_MIXER_PROFILE; fixed-wing autoland since 7.1, needs Safehome; docs say "FAILSAFE" | confirmed | settings.yaml; https://github.com/iNavFlight/inav/blob/9.1.0/docs/Fixed%20Wing%20Landing.md | |
| 24 | Compass optional for fixed-wing nav | confirmed (was unverified) | https://github.com/iNavFlight/inav/blob/9.1.0/src/main/flight/imu.c (`isImuHeadingValid`, GPS course) | |
| 25 | MAC station and CG positions (section 2) | **corrected** | recomputed from the planform (numerical integration) | MAC at y = +-131.6, LE x +75.8; CG 10/15/20/25 % MAC at x +52/+41/+29/+17; marks at x +30..+40 -> whole-wing MAC 242.6 mm at y = +-200, LE x +37.9; CG at x +14/+1.5/-11/-23; marks at x about 0..+5 |
| 26 | Sweep 28.2 deg, quarter-chord sweep 24.1 deg, area 18.66 / 21.06 dm2, AR 3.85, prop TE clearance 12 mm, loiter circle 33 m at 15 m/s and 35 deg | confirmed (recomputed) | arithmetic from section 2 | |
| 27 | Pusher P prop turns CW seen from the front (CCW from behind) | confirmed | APC listing via WebSearch (falcon.com.kw "APC 8 X 5 Sport": reverse/pusher = CW viewed from front) | |
| 28 | AR Wing Classic 900: 900 mm span, 482 mm length, kit 280 g / PNP 400 g, 2206 2300 KV, 30 A ESC, 5x5x3 prop | confirmed; battery corrected | https://www.getfpv.com/sonicmodell-ar-wing-classic-900mm-wingspan-epp-flying-wing-rc-airplane-pnp-version.html ; https://buddyrc.com/products/sonic-modell-ar-wing-classic-pnp (via WebSearch) | "3S 2200" -> "3-4S 1550-2200 mAh" |
| 29 | ZOHD Dart XL Extreme: 1000 mm, 596 mm, 19.8 dm2, 1200 g max, 60.6 g/dm2, 2216 1300 KV, 9x4.5, 4S 3300, 40 min, 25-100+ km/h | confirmed | https://cdn.robotshop.com/media/s/son/rb-son-20/pdf/sonicmodell-zohd-dart-xl-extreme-1000mm-plug--fly-wing-datasheet.pdf (via WebSearch) and GetFPV listing | |
| 30 | FC mounting "not a 30.5 mm stack, taped flat" | unverified | no spec page listed mounting holes | marked (unverified) |
| 31 | "No mode active = ACRO with stabiliser" | unverified (left as marked) | fc_core.c grep inconclusive in time box | |
