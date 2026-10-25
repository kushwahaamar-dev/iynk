# Fact sheet: 7-inch long-range quad with GPS Rescue on Betaflight (Drone Lab Fig. 04, `longrange`)

Status: firmware facts verified against the Betaflight **2026.6.2** source tree (tag `2026.6.2`) and the 2026.6
release notes on 2026-10-24; cell data verified against the Molicel datasheets. Lines marked "(unverified)" could
not be checked in the time box. Sibling sheet `docs/facts/quad5.md` covers the generic Betaflight QuadX facts (motor
table, OSD encoding, VTX table, rates) in more depth; the essentials are repeated here so this file stands alone.

## 0. Header

**Craft class:** 7-inch (178 mm prop) long-range FPV quadcopter, True-X carbon frame, 6S **Li-ion** 21700 pack (or
6S LiPo), low-KV 2806.5/2807 motors, GPS + compass, ExpressLRS 900 MHz control link, Betaflight with GPS Rescue
as the failsafe.

**Real products / reference builds:**

| Reference | What it is | Link |
|---|---|---|
| iFlight Chimera7 Pro V2 (frame kit / BNF) | 7.5" LR frame: **327 mm wheelbase, 6 mm arms**, body 270 x 199 x 34 mm, 2806.5 motors, GPS mount; O3 kit ~175 g w/o TPU, O4 kit listed 355 +/- 5 g [13] | https://shop.iflight.com/Chimera7-Pro-V2-Frame-Kit-Pro1890 |
| Typical 7" DIY LR build | 300-330 mm True-X frame, 4 x 2806.5/2807 1300 KV, 7x3.5-7x4 bi- or tri-blades, 30.5 mm F4/F7 stack, ELRS 900 MHz, M10 GPS + QMC5883L compass, 6S1P 21700 Li-ion | (community norm, see [16][17]) |
| Matek M10Q-5883 (GPS + compass module the figure shows) | u-blox M10 + QMC5883L, 20 x 20 x 12.4 mm, 8 g [12] | https://www.mateksys.com/?portfolio=m10q-5883 |

**What it is and what it is for.** A 7-inch long-range quad trades the punch of a 5-inch freestyle quad for
efficiency: big, low-pitch props turned slowly by low-KV motors, a high-energy-density Li-ion pack instead of a
punchy LiPo, and a GPS + compass so the flight controller knows where home is. It is flown in goggles over valleys,
along ridgelines and out to mountains several kilometres away, cruising at 30-40 % throttle for 15-25 minutes. Two
radio links limit range: the 5.8 GHz video link usually fades first, the control link (ExpressLRS 900 MHz) second.
When the flight controller stops hearing the radio it enters failsafe and, configured with
`failsafe_procedure = GPS-RESCUE`, climbs, turns for home, flies back and lands (or descends where it is if the
sanity checks fail).

## 1. Sources

Firmware (Betaflight tag 2026.6.2, read from source):

1. Betaflight releases (2026.6.2 is the current stable; 2025.12.x and 4.5.x are older lines): https://github.com/betaflight/betaflight/releases
2. `src/main/cli/settings.c` (every `set` name, range, lookup table): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/cli/settings.c
3. `src/main/fc/parameter_names.h`: https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/fc/parameter_names.h
4. `src/main/pg/gps_rescue_multirotor.c` (GPS Rescue defaults): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/pg/gps_rescue_multirotor.c
5. `src/main/flight/gps_rescue_multirotor.c` (phases, sanity checks, return altitude): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/gps_rescue_multirotor.c
6. `src/main/flight/failsafe.c` (failsafe defaults and stage 2): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/failsafe.c
7. `src/main/fc/core.c` (GPS arming check, arming beeps): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/fc/core.c
8. `src/main/fc/runtime_config.c` (arming-disable flag names): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/fc/runtime_config.c
9. `src/main/pg/gps.c`, `src/main/io/gps.c`, `src/main/io/gps.h` (GPS defaults, ready beep, `GPS_MIN_SAT_COUNT`): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/pg/gps.c
10. `src/main/pg/autopilot.c` (`ap_*` defaults used by rescue/pos hold), `src/main/flight/imu.c` (`trust_mag`), `src/main/sensors/battery.c|h` (cell-voltage defaults), `src/main/io/beeper.c` (beeper names), `src/main/cli/cli.c` (commands), `src/main/target/common_post.h` (`ENABLE_RESCUE_PLAN`): same tag.
11. Betaflight 2026.6 release notes (GPS Rescue rebuilt, removed `gps_rescue_*` settings, `trust_mag`): https://betaflight.com/docs/wiki/release/Betaflight-2026-6-Release-Notes

Hardware (manufacturer first):

12. Matek M10Q-5883 product page (M10 + QMC5883L, 9600 baud default, 8 g, align values): https://www.mateksys.com/?portfolio=m10q-5883
13. iFlight Chimera7 Pro V2 listings (327 mm, 6 mm arms, kit masses): https://shop.iflight.com/Chimera7-Pro-V2-Frame-Kit-Pro1890 , https://www.getfpv.com/iflight-chimera7-pro-v2-7-5-lr-frame-kit.html
14. Molicel INR-21700-P42A datasheet (4200 mAh typ / 4000 min, 45 A, 70 g max, 2.5 V): https://www.molicel.com/wp-content/uploads/INR21700P42A-V4-80092.pdf
15. Molicel INR-21700-P45B datasheet v1.2 (4500 / 4300 mAh, 45 A, 70 g max, 15 mOhm DC): https://www.molicel.com/wp-content/uploads/INR21700P45B_1.2_Product-Data-Sheet-of-INR-21700-P45B-80109.pdf
16. Molicel INR-21700-P50B datasheet (5000 / 4850 mAh, 60 A, 71 g max, 12.8 mOhm DC, 260 Wh/kg): https://www.fsaeonline.com/content/Molicel-TDS--INR-21700-P50B-80122.pdf
17. 6S1P pack masses: Flywoo Explorer P45B 6S1P 433.7 g https://www.flywoo.net/products/flywoo-explorer-molicell-p45b-21700-6s1p-4500mah-lionpack-battery ; KiwiQuads P50B 6S1P 455 +/- 2 g https://kiwiquads.co.nz/product/kiwiquads-21700-p50b-6s1p-5000mah-li-ion-pack/ ; DIY P42A 6S1P build ~470 g (forum, low weight of evidence) https://intofpv.com/archive/index.php/thread-22650.html
18. 6S 1800 mAh LiPo masses: CNHL 6S 1800 120C 302 g https://www.onedrone.com/store/cnhl-1800mah-6s-120c.html ; Thunder Power Rampage 6S 1800 291 g https://www.getfpv.com/thunder-power-rampage-1800mah-6s-70c-lipo-battery.html
19. Motor specs: iFlight XING 2806.5 1300 KV 49.5 g, peak 48.3 A https://www.getfpv.com/iflight-xing-2806-5-race-motor-1300kv-1800kv.html ; T-Motor F90 2806.5 1300 KV 46.6 g, peak 45.1 A (60 s), 1059 W https://www.getfpv.com/t-motor-f90-1300kv-1500kv-motor.html
20. Thrust data, 2807 1300 KV on 6S: BrotherHobby SE 2807 1300 KV, HQ 7x3.5x3, 23.7 V: max 2.54 kg at 42.2 A / 1000 W, half throttle 892 g at 9 A https://www.rotorama.com/product/brotherhobby-se-2807-1300kv ; RCinpower EX2807 1300 KV, Gemfan 7040x3, 24 V: 2.48 kg at 36.8 A https://www.rotorama.com/product/rcinpower-ex2807-1300kv
21. ExpressLRS docs (receiver on a full UART, CRSF): https://www.expresslrs.org/quick-start/receivers/configuring-fc/
22. End of BLHeli_32 (support ended 30 June 2024): https://oscarliang.com/end-of-blheli_32 ; ESC Configurator (Bluejay / AM32 / BLHeli_S): https://esc-configurator.com
23. SpeedyBee F405 V4 board doc (named FC pad map): https://betaflight.com/docs/wiki/boards/current/SPEEDYBEEF405V4
24. Drone Lab research: `docs/research/drone-lab-a.md` section 9.4 and Appendix A (what the original shows).

## 2. Geometry (craft frame)

Craft frame: **x forward (nose), y left, z up**, origin at the frame centre on the top face of the bottom plate,
units mm.

### 2.1 Frame

| Item | Original (Drone Lab) | Real reference | Use in iynk |
|---|---|---|---|
| Layout | True-X | Chimera7 Pro V2: X layout, body 270 x 199 mm [13] (exact arm geometry unverified) | True-X (square motor pattern) |
| Wheelbase (motor-to-motor diagonal) | 315 mm [24] | Chimera7 Pro V2 327 mm [13]; 7" frames 295-330 mm (unverified range) | **315 mm** (keep the original) |
| Motor offset from centre | +-111.4 mm in x and y [24] | 327 mm -> +-115.6 mm | 315 / 2 / sqrt(2) = **111.37 mm** |
| Adjacent motor spacing | 222.7 mm | 231.2 mm | 7" prop (177.8 mm) leaves 44.9 mm tip gap; 7.5" (190.5 mm) leaves 32.2 mm |
| Arm thickness | 6 mm [24] | 6 mm [13] | 6 mm carbon |
| Arm width | not stated | ~12-14 mm at the root (unverified) | 13 mm |
| Bottom plate (original drawing) | 132 x 52 mm [24] | Chimera7 body 270 x 199 x 34 mm overall [13] | 132 x 52 x 2.5 mm body plate (unverified thickness) |
| Top plate | 124 x 44 mm + GPS mast [24] | 2 mm top plate typical (unverified) | 124 x 44 x 2 mm |
| Stack | 30.5 x 30.5 mm (implied: "as on the 5-inch") | 30.5 x 30.5 mm M3 standard; 20 x 20 M2/M3 on some frames (unverified for Chimera7) | 30.5 x 30.5 mm, M3 |
| Standoff height | not stated | 30-35 mm typical (unverified) | 30 mm |
| Motor mount | not stated | 16 x 16 mm M3 (2806.5/2807 standard, unverified) | 16 x 16 M3 |
| Frame mass | 162 g (frame) + 30 g (top plate, standoffs, mast) [24] | Chimera7 Pro V2 O3 kit ~175 g w/o TPU [13] | plausible |

### 2.2 Motors: Betaflight QUAD X order and spin

Betaflight `mixerQuadX` output order (from `mixer_init.c`, also in quad5.md): M1 rear right, M2 front right,
M3 rear left, M4 front left.

| Motor (BF) | Corner | x (mm) | y (mm) | Spin seen from above, **props in** (default, `yaw_motors_reversed = OFF`) | **Props out** (`yaw_motors_reversed = ON`) |
|---|---|---|---|---|---|
| M1 | rear right | -111.4 | -111.4 | CW | CCW |
| M2 | front right | +111.4 | -111.4 | CCW | CW |
| M3 | rear left | -111.4 | +111.4 | CCW | CW |
| M4 | front left | +111.4 | +111.4 | CW | CCW |

- Props in: the front edge of each front disc moves inwards towards the centre line. Diagonal pairs (M1+M4,
  M2+M3) spin the same way so yaw torque cancels.
- `yaw_motors_reversed` only tells the mixer which way the props spin; physical direction is set in the ESC
  (DShot direction command, ESC Configurator) or by swapping two motor wires.
- Motor z: bell top ~ arm top + 2806.5 bell height. A 2806.5 is ~33.4 mm diameter x ~34.7 mm tall incl. shaft
  (T-Motor F90 dims [19]); stator 28 mm x 6.5 mm. The original draws bell radius 17 mm [24] (33.4 / 2 = 16.7, ok).

### 2.3 Props, camera, battery, GPS, mass

| Item | Value |
|---|---|
| Props | 7 x 3.5 bi-blade (default), 7.5 x 3.7 bi, 7 x 4 tri [24]. Radius 88.9 mm (7") / 95.25 mm (7.5"); the original uses 89 / 95. Bi-blades are the efficient long-range choice; tri-blades grip better but cost efficiency. |
| Prop mass | 7" bi-blade ~7-9 g, tri ~10-12 g (unverified) |
| Camera | front, between the side plates, uptilt **15-25 deg** for LR cruise (original draws 18 deg; build text says 15-20) |
| Battery | 6S1P 21700 bundle strapped on top (Chimera7) or underslung on some frames. Bundle 3 x 2 cells: ~70 x 65 x 44 mm (original dims 70 x 64 x 44 are geometrically correct: 3 x 21.55 = 64.7, 2 x 21.55 = 43.1, cell height 70.15 [16]). Flat 6-in-line packs are ~125 x 70 x 22 mm. |
| GPS puck | at the rear on a mast or on the top plate, as far as possible from the VTX, ESC current loops and battery leads; **mounted flat** (Matek: "Tilting the magnetometer is strongly discouraged!" [12]). Arrow points at the nose. |
| AUW | 900-1100 g with a 6S1P Li-ion pack (original default 925 g) |

## 3. The original's catalogue, sanity-checked

iynk keeps the calculator identical; this table only flags descriptions. Calculator: `thrust = 1.6 * pf * krpm^2`,
`V = cells * 3.7`, hover watts `= AUW / (8 * eff)`, 80 % usable capacity, max current at 2 g/W [24].

### 3.1 Batteries

| Original option | Original numbers | Real-world | Verdict |
|---|---|---|---|
| `6S1P Li-ion 4000 mAh` (label `6S1P 21700`) | 4000 mAh, 440 g, $62 | No Molicel cell is 4000 mAh nominal: P42A is **4200 mAh typ / 4000 min**, 45 A, 70 g max [14]; Samsung 40T is 4000 mAh, 35 A (unverified). A 6S1P P42A pack weighs ~430-470 g (forum build ~470 g) [17] | plausible (call it P42A 4200 or "4000 min") |
| `6S1P Li-ion 5000 mAh (P50B)` | 5000 mAh, 468 g, $78 | P50B 5000 typ / 4850 min, **60 A continuous** (rated to an 80 C cell-temperature cut-off), 71 g max [16]; 6S1P pack 455 +/- 2 g [17] | plausible; but the warning "more than one 21700 cell can give (~45 A)" is wrong for P50B (60 A) |
| `6S LiPo 1800 mAh` | 1800 mAh, 292 g, $54, 104 x 36 x 42 | 291-310 g (TP Rampage 291 g, 99 x 46 x 30; CNHL 302 g, 87 x 58 x 34) [18] | plausible |
| (not in the original) P45B 6S1P | - | 4500 mAh typ / 4300 min, 45 A, 70 g max, DC IR 15 mOhm [15]; pack ~434 g [17] | the most common LR cell in 2025-2026 (unverified popularity) |

Cell energy: P42A 15.5 Wh, 230 Wh/kg [14]; P45B 16.2 Wh, 242 Wh/kg [15]; P50B 18.0 Wh, 260 Wh/kg [16]. A 6S
P45B pack: 6 x 16.2 = 97 Wh in ~434 g; a 6S 1800 LiPo: 22.2 x 1.8 = 40 Wh in ~300 g. So Li-ion carries ~1.7x the
energy per gram, and ~2.4x the energy per pack here; "Li-ion more than doubles it" is fair for these two options.

### 3.2 Motors

| Original option | Original numbers | Real-world | Verdict |
|---|---|---|---|
| `2807 1300KV` | 48 g, $28 | 2806.5/2807 1300 KV: XING 2806.5 49.5 g, F90 46.6 g, peak 45-48 A [19]; on 6S with 7" tri: 2.48-2.54 kg max at 37-42 A [20] | correct, the classic 6S 7" motor |
| `3008 1100KV (efficient)` | 56 g, $32 | 3008-class 1100 KV motors exist for 7-8" (unverified specific product and mass); lower KV = lower max thrust, better efficiency at cruise | plausible (unverified) |
| `2807 1700KV (4S motor)` | 47 g, $26 | 1700-1800 KV 2806.5/2807 are sold for 4S 7" (iFlight XING 2806.5 1800 KV listed as the 4S variant [19]); on 6S it overspeeds a 7" prop | correct description |

Calculator thrust check: 2807 1300 KV + 7x3.5x2 gives 1333 g per motor; real 1300 KV motors give 2.1-2.5 kg with
7" **tri**-blades [20]; a bi-blade 7x3.5 gives less, ~1.6-1.9 kg (unverified). So the calculator is
**conservative** on thrust and T:W (5.8:1 vs a real ~6.5-8:1). Max current 120 A (30 A/motor) is in the right range
(real 37-42 A/motor with tri-blades [20]).

### 3.3 Props

| Original option | pf / eff / mass | Real-world | Verdict |
|---|---|---|---|
| `7x3.5 bi-blade` | 1.00 / 1.00 / 8 g | e.g. HQ 7x3.5x2, Gemfan 7035-2 (unverified masses ~7-8 g) | correct, the efficient LR default |
| `7.5x3.7 bi-blade (longer)` | 1.10 / 1.06 / 9 g | 7.5" props fit 7.5"-rated frames (Chimera7 is a 7.5" frame [13]); on a 315 mm frame the tip gap is 32 mm | plausible |
| `7x4 tri-blade (punchy)` | 1.18 / 0.86 / 10.5 g | HQ 7x4x3 (unverified mass); more thrust, lower efficiency | plausible |

### 3.4 Fixed parts

| Original part | Mass, price | Real-world | Verdict |
|---|---|---|---|
| `7" carbon true-X frame` | 162 g, $55 | 160-200 g bare frames (Chimera7 Pro V2 ~175 g [13]) | plausible |
| `50A 4-in-1 ESC`, wiring node `50 A x 4, BLHeli_32` | 10 g, $52 | 30.5 mm 4-in-1 50-55 A ~12-16 g (unverified). **BLHeli_32 was discontinued (support ended 30 June 2024) [22]**; current ESCs ship AM32 or Bluejay/BLHeli_S | flag "BLHeli_32"; say AM32 |
| `F7 flight controller + baro` | 8 g, $45 | 30.5 mm F4/F7/H7 FC 7-10 g (SpeedyBee F405 V4 10.5 g [23]) | plausible |
| `Analog FPV camera` | 7 g | micro analog camera 5-9 g (unverified) | plausible |
| `5.8 GHz 1 W VTX + stubby` | 10 g | 1 W VTX + antenna ~8-15 g (unverified) | plausible |
| `ELRS 900 MHz diversity RX + T-antenna` | 4 g | real, e.g. 900 MHz diversity receivers ~3-6 g (unverified) | plausible |
| `M10 GPS + QMC5883 compass` | 12 g, $24 | Matek M10Q-5883 8 g + cable [12] | plausible |
| `XT60 pigtail + low-ESR cap`, `1000 uF 35 V` | 12 g | 35 V is the minimum for 6S (25.2 V full); 50 V gives margin | ok |
| `Top plate + standoffs + GPS mast` | 30 g | plausible | the mast **leaning back 22 deg** is fine only if the GPS/compass puck itself stays level [12]; draw the puck flat |
| `Battery strap + grip pad` | 6 g | plausible | ok |

### 3.5 Calculator outputs vs reality (default 6s1p4000 / 2807-1300 / 7x3.5x2)

| Output | Original | Real 7" LR on 6S1P Li-ion | Verdict |
|---|---|---|---|
| AUW | 925 g | 900-1100 g | ok |
| T:W | 5.8:1 | ~6-8:1 with 2807 1300 KV (unverified) | conservative |
| Hover throttle | 42 % | ~30-40 % (unverified; depends on pack sag) | plausible |
| Max current | 120 A | 120-170 A full punch (from [20]) | ok; a P42A/P45B pack is rated 45 A, so punch-outs sag hard (the warning is right for those cells) |
| Hover time | 36.9 min | hover ~25-30 min (unverified) | optimistic |
| "Freestyle time" | 15.5 min | cruise 15-25 min on 4000-4500 mAh (unverified) | label should say "Cruise time" |

## 4. Electronics and wiring

### 4.1 Flight controller

- Original: "F7 + baro". Any F405/F722/H743 with a barometer works; GPS Rescue needs an accelerometer, a GPS on a
  full UART (TX+RX), and benefits from a barometer (altitude) and optionally a compass.
- Named example (pad map verified in quad5.md from the board doc [23]): **SpeedyBee F405 V4**, STM32F405, ICM-42688-P,
  DPS310 baro (I2C), AT7456E analog OSD, 30.5 x 30.5 mm (4 mm holes, M3 grommets), 10.5 g, 5 V 3 A + 9 V 3 A BECs.

| UART / bus | Pads (SpeedyBee F405 V4) [23] | Use on this build |
|---|---|---|
| UART1 | T1/R1 | analog VTX SmartAudio (TX1) or DJI/Walksnail MSP DisplayPort |
| UART2 | T2/R2 | **ExpressLRS 900 MHz receiver (CRSF)** |
| UART3 | T3/R3 | spare (the original puts the GPS here: `serial 2 2 ...` = UART3) |
| UART6 | T6/R6 next to 4V5/SDA/SCL | **GPS** (M10) |
| I2C | SDA/SCL | **compass** (QMC5883L) |
| UART5 | R5 "TEL" | ESC telemetry (not needed with bidirectional DShot) |

GPS wiring (Matek M10Q-5883 [12]): `5V` -> FC 4-9 V pad, `RX` -> FC UART **TX**, `TX` -> FC UART **RX**,
`CL` -> FC SCL, `DA` -> FC SDA, `G` -> GND. JST-GH 6-pin. Wire colours are vendor-specific (unverified; common:
red 5 V, black GND, yellow/white TX/RX, green/blue SDA/SCL).

### 4.2 ESC

- 30.5 mm 4-in-1, 45-60 A per channel, 3-6S. Firmware **AM32** (current) or **Bluejay** (BLHeli_S hardware);
  BLHeli_32 discontinued [22]. Protocol DShot300/600 with **bidirectional DShot** for the RPM filter.
- Config tool: ESC Configurator (web) [22] via Betaflight passthrough.

### 4.3 Receiver, video, GPS/compass

- **Receiver:** ExpressLRS 900 MHz (868/915 MHz), CRSF over a full UART (both wires) [21]; `serialrx_provider =
  CRSF`. LR pilots watch **LQ** (link quality %) and **RSSI dBm** on the OSD. ELRS on link loss stops sending
  packets so Betaflight detects the loss (unverified option wording).
- **Video, analog:** camera -> FC CAM pad -> OSD -> FC VTX pad -> 1 W VTX; VTX control by **SmartAudio** on a UART
  TX pad. Digital alternative: DJI O4/O3 on a UART with **MSP DisplayPort**.
- **GPS:** u-blox M10, UBX protocol. Matek M10Q-5883: GPS, GLONASS, Galileo, BeiDou; default **9600 baud**; UBX
  5 Hz with GPS+GAL+BDS+GLO or NMEA 1 Hz; 4-9 V, 13 mA; green PPS LED solid at power-up, **blinks 1 Hz with a 3D
  fix** [12]. Betaflight auto-configures u-blox modules (`gps_auto_config = ON` default [9]) and sets the baud from
  the Ports tab GPS baud (unverified detail of the auto-baud handshake).
- **Compass:** QMC5883L on I2C [12]. Orientation for the Matek module with the FC arrow forward: **compass arrow
  forward -> CW 270 deg flip; arrow backward -> CW 90 deg flip** [12] (`align_mag = CW270FLIP` / `CW90FLIP`;
  the `align_mag` table is `DEFAULT, CW0, CW90, CW180, CW270, CW0FLIP, CW90FLIP, CW180FLIP, CW270FLIP, CUSTOM` [2]).
  In 2026.6 the compass is ignored for heading unless `trust_mag = ON` (default OFF) [10][11].

### 4.4 Power

- XT60: male on the quad pigtail, female on the pack. 12 AWG leads for a 7" (unverified gauge norm; 12-14 AWG).
- Low-ESR capacitor across the ESC battery pads: **1000 uF, 35 V minimum for 6S** (50 V for margin), stripe =
  negative leg. Absorbs ESC switching spikes; long battery leads on a 7" make it more important.
- BECs: 5 V (RX, GPS, camera, buzzer, LED), 9 V (VTX / DJI air unit).
- Buzzer: 5 V active buzzer on BZ+/BZ- (essential on LR: finding a downed quad in grass/trees); DShot beacon as a
  fallback.

## 5. Firmware: Betaflight

### 5.1 Version

- Current stable on 2026-10-24: **Betaflight 2026.6.2** [1] (calendar versioning since 2025.12; there is no 4.6).
- 2026.6 rebuilt GPS Rescue "on top of the new 3D position estimator and the position-hold control code", sharing
  the `ap_position_*` terms with position hold, and added **RESCUE FAIL** and **HEADING N/A** OSD warnings [11].
- 2026.6 also ships an **experimental autopilot / Flight Plan** feature that the release notes say "is not
  flight-ready and must not be armed on a real aircraft" [11]. In source, when a build includes the flight-plan
  engine (`USE_FLIGHT_PLAN`), GPS Rescue is flown as a synthesised flight-plan mission (`ENABLE_RESCUE_PLAN`);
  otherwise the legacy `gps_rescue_multirotor.c` controller runs [10: target/common_post.h]. Which default
  cloud-build targets include `USE_FLIGHT_PLAN` (unverified); this sheet describes the legacy controller.

### 5.2 Renamed or removed parameters (rescue, GPS, compass)

| Old name (version) | Current (2026.6.2) | Notes |
|---|---|---|
| `gps_rescue_throttle_min`, `_max`, `_hover` (4.5) | **`ap_throttle_min`**, **`ap_throttle_max`**, **`ap_hover_throttle`** (2025.12+) | defaults 1100 / 1900 / 1275 (PWM us) [10] |
| `gps_rescue_landing_alt` (4.5) | **`ap_landing_altitude_m`** (2025.12+) | default 4 m, 0-200 [10] |
| `gps_rescue_throttle_p/i/d` (4.5) | **`ap_altitude_p/i/d/f`** (2025.12+) | default 30 each [10]; old-to-new mapping inferred from the names (4.5.2 vs 2025.12.5 `parameter_names.h`) |
| `gps_rescue_max_angle` (4.5, 2025.12) | **`ap_max_angle`** | default 50 deg, 10-70 [10]; `gps_rescue_max_angle` removed in 2026.6 [11] |
| `gps_rescue_velocity_p/i/d`, `gps_rescue_roll_mix`, `gps_rescue_pitch_cutoff`, `gps_rescue_imu_yaw_gain` | removed in 2026.6 [11] | rescue uses `ap_position_*` |
| `gps_rescue_use_mag` (4.5, 2025.12) | removed; **`trust_mag`** (2026.6, default OFF) | compass must be opted in [10][11] |
| `gps_rescue_disarm_threshold` (4.5, 2025.12) | name still in `parameter_names.h` but **not in the 2026.6.2 settings table** [2][3] | `set` will fail |
| `poshold_without_mag` | removed in 2026.6 [11] | |

Note: the 2026.6 release notes say `ap_position_a` was removed [11], but `ap_position_a` is still in the 2026.6.2
settings table [2]. Trust the source for 2026.6.2.

### 5.3 GPS Rescue settings (2026.6.2, legacy controller) [2][4]

| Setting | Default | Range | Units / meaning |
|---|---|---|---|
| `gps_rescue_min_start_dist` | 15 | 5-30 | m. Closer than this to home at rescue start: climb to max(7.5 m, current + initial climb) and come back [5] |
| `gps_rescue_alt_mode` | `MAX_ALT` | `MAX_ALT`, `FIXED_ALT`, `CURRENT_ALT` | how the return altitude is chosen (below) |
| `gps_rescue_initial_climb` | 10 | 0-100 | m added on top of max/current altitude |
| `gps_rescue_ascend_rate` | 750 | 50-2500 | cm/s |
| `gps_rescue_return_alt` | 30 | 5-1000 | m. **Used only with `alt_mode = FIXED_ALT`** [5] |
| `gps_rescue_ground_speed` | 750 | 0-3000 | cm/s (7.5 m/s) on the way home |
| `gps_rescue_descent_dist` | 20 | 5-500 | m from home where descent starts |
| `gps_rescue_descend_rate` | 150 | 25-500 | cm/s, scaled 0.6x-3x with altitude (10-50 m) [5] |
| `gps_rescue_sanity_checks` | `RESCUE_SANITY_FS_ONLY` | `RESCUE_SANITY_OFF`, `_ON`, `_FS_ONLY` | what to do when a check fails |
| `gps_rescue_min_sats` | 8 | 5-50 | satellites needed to arm (home point) |
| `gps_rescue_allow_arming_without_fix` | OFF | OFF/ON | ON = arm without home (rescue unavailable) |
| `gps_rescue_yaw_p` | 20 | 0-200 | yaw gain while rescuing |
| `ap_landing_altitude_m` | 4 | 0-200 | m: below this the landing phase starts (`isBelowLandingAltitude()` in `flight/autopilot_multirotor.c` compares altitude with `100 * ap_landing_altitude_m` cm) |
| `ap_max_angle` | 50 | 10-70 | deg max lean during rescue/pos hold |
| `ap_hover_throttle` | 1275 | 0-1700 | set to your real hover throttle (us) |

Return altitude (`initRescueValues()` [5]): `MAX_ALT` = highest altitude since arming + `initial_climb`;
`FIXED_ALT` = `return_alt`; `CURRENT_ALT` = max(initial_climb, current + initial_climb).

Phases [5]: `INITIALIZE` -> `ATTAIN_ALT` (climb in place) -> `ROTATE` (yaw to home) -> `FLY_HOME` -> `DESCENT`
(from `descent_dist`, slowing proportionally) -> `LANDING` (below `ap_landing_altitude_m`) -> disarm on touchdown.
`PITCH_FORWARD` (force forward pitch to get a heading) when the IMU has no valid heading; `EMERG_DESCENT` (straight
down, no XY control, needs baro/GPS altitude; otherwise disarm); `DO_NOTHING`.

Sanity checks (checked once per second [5]):

| Failure | Trigger |
|---|---|
| `RESCUE_NO_HOME_POINT` | no home fix at rescue start |
| `RESCUE_GPSLOST` | GPS data unhealthy |
| `RESCUE_LOWSATS` | no fix or fewer than **4** sats (`GPS_MIN_SAT_COUNT`, hard-coded [9]) for a net 15 s |
| `RESCUE_STALLED` | climb not following target for 10 s |
| `RESCUE_FLYAWAY` | in FLY_HOME, closing speed < 20 % of target for a net **20 s** |
| PITCH_FORWARD timeout | no heading after 15 s -> emergency descent |
| crash recovery active | disarm |
| at rescue start within 20 cm of home and below landing alt | disarm at once |

With `RESCUE_SANITY_FS_ONLY` (default) a failure during a real RX-loss failsafe triggers emergency descent; with
`_ON` it also does so when rescue was switched on by the aux switch; `_OFF` only if rescue is unavailable [5].
Recovery: during a true RX-loss rescue, regained link + sticks moved more than `failsafe_stick_threshold` (30 %)
hands control back [6].

### 5.4 Initial setup (CLI)

```
# Betaflight 2026.6.2, SpeedyBee F405 V4: ELRS on UART2, GPS on UART6, compass on I2C, SmartAudio on UART1
mixer QUADX
set align_board_yaw = 0                    # FC arrow to the nose; 180 if it points back
set motor_pwm_protocol = DSHOT600
set dshot_bidir = ON
set motor_poles = 14                       # 2806.5/2807 are 12N14P
serial UART2 64 115200 57600 0 115200      # 64 = serial RX
set serialrx_provider = CRSF
serial UART6 2 115200 57600 0 115200       # 2 = GPS, 57600 GPS baud
serial UART1 2048 115200 57600 0 115200    # 2048 = SmartAudio
feature GPS
set gps_provider = UBLOX
set gps_auto_config = ON
set gps_ublox_use_galileo = ON
set mag_hardware = AUTO                    # AUTO = detect (sensors/sensors.c lookup)
set align_mag = CW270FLIP                  # Matek M10Q-5883, puck arrow forward [12]; other modules differ
set trust_mag = ON                         # 2026.6: only after the compass is calibrated and checked
save
```
Checks: `serial <port> <functionMask> <mspBaud> <gpsBaud> <telemetryBaud> <blackboxBaud>`; the legacy numeric
port (`serial 2 ...` = UART3) is still accepted (quad5.md). Function bits: MSP 1, GPS 2, RX_SERIAL 64,
VTX_SMARTAUDIO 2048, VTX_TRAMP 8192, VTX_MSP 131072. `gps_provider` table: `NMEA`, `UBLOX`, `MSP`, `VIRTUAL` [2].
GPS defaults [9]: provider UBLOX, SBAS NONE, auto-config ON, auto-baud OFF, acquire model STATIONARY, flight
model AIRBORNE_4G, update rate 10 Hz, Galileo OFF, `gps_set_home_point_once` OFF.

### 5.5 GPS Rescue / failsafe snippet (corrected version of the original's)

```
set failsafe_procedure = GPS-RESCUE
set failsafe_delay = 15                    # 1.5 s stage 1 before stage 2 (default)
set gps_rescue_min_sats = 8                # arming blocked (flag GPS) below this
set gps_rescue_alt_mode = FIXED_ALT        # needed, or return_alt is ignored
set gps_rescue_return_alt = 45             # m: clear the highest ridge
set gps_rescue_ground_speed = 750          # cm/s
set gps_rescue_descent_dist = 20           # m
set gps_rescue_sanity_checks = RESCUE_SANITY_FS_ONLY
aux 3 46 3 1700 2100 0 0                   # GPS RESCUE mode on AUX4 high (ID 46), to test it
save
```

Modes the original uses: ANGLE (ID 1), ALTHOLD (ID 3, needs baro/GPS), "acro" (no mode active), GPS RESCUE (ID
46), plus ARM (0), BEEPER (13), POS HOLD (11) exists in 2025.12+ (quad5.md 5.5). `aux <slot> <modeId>
<auxChannel> <start> <end> <logic> <linkedTo>`; channel 0 = AUX1.

Failsafe [2][6]:

| Setting | Default | Meaning |
|---|---|---|
| `failsafe_delay` | 15 (x 0.1 s = 1.5 s) | stage 1 duration; range 1-200 (min = `PERIOD_RXDATA_RECOVERY` 100 ms) [2][6] |
| `failsafe_procedure` | `DROP` | stage 2: `AUTO-LAND`, `DROP`, `GPS-RESCUE` (the source comment "auto-landing" is wrong; the value is DROP) |
| `failsafe_landing_time` | 60 s | AUTO-LAND time |
| `failsafe_switch_mode` | `STAGE1` | `STAGE1`, `KILL`, `STAGE2` |
| `failsafe_throttle_low_delay` | 100 (x 0.1 s) | just disarm if throttle was low this long; **skipped when the procedure is GPS-RESCUE** [6] |
| `failsafe_stick_threshold` | 30 % | stick input needed to leave GPS Rescue after the link returns |
| `failsafe_recovery_delay` | 5 (x 0.1 s) | valid data needed to recover |

Stage 1 [src/main/rx/rx.c, same tag]: for the first 300 ms (`MAX_INVALID_PULSE_TIME_MS`) every channel holds its
last good value; then channels take their `rxfail` values until `failsafe_delay` ends. Defaults: roll/pitch/yaw
`AUTO` = centre (`midrc`), throttle `AUTO` = `rx_min_usec` (low), aux channels `HOLD`. So a quad cruising at 35 %
throttle **drops for ~1.2 s** of stage 1 before GPS Rescue starts at stage 2: with the defaults it loses height
before the climb (upper bound in free fall 0.5 x 9.81 x 1.2^2 = ~7 m; less with idle thrust and drag; real loss
unverified). Setting the throttle rxfail to hover (`rxfail 3 s 1400`: syntax `rxfail <channel> <a|h|s> [value]`, channel 3 = throttle in Betaflight's internal
ROLL, PITCH, YAW, THROTTLE order; src/main/cli/cli.c) is a common LR tweak.
Stage 2: the procedure. While rescuing with no link the beeper plays `RX_LOST_LANDING` (SOS) [6].

### 5.6 Battery (Li-ion vs LiPo)

Betaflight defaults [10: battery.h/.c]: `vbat_max_cell_voltage` 430, `vbat_full_cell_voltage` 410,
`vbat_warning_cell_voltage` 350, `vbat_min_cell_voltage` 330 (units 0.01 V, range 100-500), `bat_capacity` 0.
These are LiPo numbers. For Li-ion (unverified community values, cells are rated to 2.5 V [14][15][16]):
```
set vbat_min_cell_voltage = 290            # 2.90 V critical (under load)
set vbat_warning_cell_voltage = 310        # 3.10 V warning
set vbat_full_cell_voltage = 410
set bat_capacity = 4500
save
```
2026.6 has battery profiles (`battery_profile <index>`, `battery_profile_name`) so a Li-ion and a LiPo profile can
coexist [2][10]. Cell count is detected from `vbat_max_cell_voltage`; a deeply discharged pack plugged in can be
mis-detected (`force_battery_cell_count`).

### 5.7 OSD, VTX, RPM filter, motor direction, accelerometer, arming

- **OSD for LR:** `osd_link_quality_pos`, `osd_rssi_dbm_pos`, `osd_gps_sats_pos`, `osd_home_dir_pos`,
  `osd_home_dist_pos`, `osd_altitude_pos`, `osd_gps_speed_pos`, `osd_avg_cell_voltage_pos`, `osd_mah_drawn_pos`,
  `osd_current_pos`, `osd_warnings_pos` (shows RESCUE N/A, RESCUE FAIL, HEADING N/A); all these names are in the
  2026.6.2 settings table [2]; position encoding `x | y << 5 | 2048` for profile 1 (quad5.md 5.6).
- **VTX:** vtxtable as in quad5.md 5.7; 1 W = 30 dBm. A typical 1 W SmartAudio power table (unverified for any
  specific VTX): `vtxtable powerlevels 4`, `vtxtable powervalues 14 20 26 30`, `vtxtable powerlabels 25 100 400 1W`.
  `set vtx_low_power_disarm = ON` keeps it cool on the bench.
- **RPM filter:** `set dshot_bidir = ON`, `set motor_poles = 14`, `rpm_filter_harmonics = 3` (default), needs AM32/
  Bluejay/BLHeli_32 32.7+. No ESC telemetry -> arming flag `DSHOT_TELEM`.
- **Motor direction:** physical spin in the ESC (Configurator Motors tab direction tool or ESC Configurator, or
  swap two motor wires); `yaw_motors_reversed` only tells the mixer.
- **Accelerometer calibration:** Setup tab "Calibrate Accelerometer" on a level surface, or sticks throttle high +
  yaw left + pitch low. Required: `failsafe_procedure = GPS-RESCUE` makes an uncalibrated accelerometer block arming
  (`NO_ACC_CAL`) (quad5.md 5.12).
- **Compass calibration:** Setup tab "Calibrate Magnetometer" (rotate on all axes ~30 s), or sticks throttle high +
  yaw right + pitch low; 2026.6 adds a "Full Cal (auto-align)" tumble that solves hard- and soft-iron [11].
- **Arming-disable flags (2026.6.2) [8]:** `NOGYRO, FAILSAFE, RXLOSS, NOT_DISARMED, BOXFAILSAFE, RUNAWAY, CRASH,
  THROTTLE, ANGLE, BOOTGRACE, NOPREARM, LOAD, CALIB, CLI, CMS, BST, MSP, PARALYZE, GPS, RESCUE_SW, DSHOT_TELEM,
  REBOOT_REQD, DSHOT_BBANG, NO_ACC_CAL, MOTOR_PROTO, FLIP_SWITCH, ALT_HOLD_SW, POS_HOLD_SW, AUTOPILOT_SW, ARM_SWITCH`.
  LR-specific: **`GPS`** = rescue configured but no 3D fix or fewer than `gps_rescue_min_sats` (cleared after the
  first arm since power-up (`WAS_EVER_ARMED`), or with `allow_arming_without_fix`) [7]; **`RESCUE_SW`** = GPS RESCUE switch on at arm [7];
  `NO_ACC_CAL`.

### 5.8 Beeper (GPS-related) [7][9][10]

| Beeper name | When |
|---|---|
| `READY_BEEP` | disarmed, first time a 3D fix with >= `min_sats` is reached ("GPS ready") |
| `ARMING_GPS_FIX` | arming with fix and >= min_sats (home set) |
| `ARMING_GPS_NO_FIX` | arming without (only possible with `allow_arming_without_fix`) |
| `RX_LOST` | link lost |
| `RX_LOST_LANDING` | in GPS Rescue / landing with no link (SOS pattern) |
| `GPS_STATUS` | multi-beep sat count |
| `BAT_LOW`, `BAT_CRIT_LOW` | warning / min cell voltage |

CLI: `beeper list`, `beeper -NAME` to disable one. BEEPER aux mode (ID 13) and DShot beacon for finding the quad.

### 5.9 Errors in the original's CLI

| Original | Problem | Correct (2026.6.2) |
|---|---|---|
| `set gps_rescue_return_alt = 45` alone | ignored: default `gps_rescue_alt_mode = MAX_ALT` [4][5] | add `set gps_rescue_alt_mode = FIXED_ALT` |
| `set align_mag = DEFAULT  # the GPS puck arrow must point at the nose` | `DEFAULT` is the board target's default, not "arrow forward"; for a Matek M10Q-5883 arrow forward = `CW270FLIP` [12] | set per module datasheet, then verify heading in the Setup tab |
| (missing) | 2026.6 ignores the compass unless `trust_mag = ON` [10][11] | add `set trust_mag = ON` after calibration |
| `serial 2 2 57600 57600 0 115200  # UART3 = GPS` | valid (legacy id 2 = UART3, function 2 = GPS, GPS baud 57600) | modern form `serial UART3 2 115200 57600 0 115200` |
| `set gps_rescue_min_sats = 8  # no home point below this` | default already 8; below it **arming is blocked** (`GPS` flag) | keep, fix the comment |
| `set gps_rescue_ground_speed = 750`, `descent_dist = 20`, `sanity_checks = RESCUE_SANITY_FS_ONLY` | valid, all defaults | keep |
| `set align_board_yaw = 0`, `feature GPS`, `set gps_provider = UBLOX`, `set gps_ublox_use_galileo = ON`, `set failsafe_procedure = GPS-RESCUE`, `resource`, `save` | valid | keep |
| Wiring label `50 A x 4, BLHeli_32` | BLHeli_32 discontinued | `AM32` |

### 5.10 The original's rescue demo vs real Betaflight

| Original behaviour [24] | Real Betaflight 2026.6.2 (legacy controller) [5] |
|---|---|
| Return altitude 45 m if > 30 m from home, else 7 m | `MAX_ALT` default: highest altitude since arm + 10 m; `FIXED_ALT`: `return_alt`; closer than `min_start_dist` (15 m): max(7.5 m, current + 10 m). The 7 m close-in value is a good match |
| Climb, then fly home at up to 12 m/s | climb at `ascend_rate` 7.5 m/s, rotate to home, fly at `ground_speed` 7.5 m/s |
| Descend over home at <= 1.2 m/s | descent starts 20 m out, ground speed scaled down with distance; descend rate 1.5 m/s x 0.6-3 with altitude; landing phase below 4 m |
| Reversed compass: flies away at ~12 m/s until it leaves the field | only if `trust_mag = ON`; the `RESCUE_FLYAWAY` check trips after a net 20 s of not closing on home, then with FS_ONLY in a real failsafe: **emergency descent where it is** (RESCUE FAIL) |
| Lands and disarms at home | lands and disarms on touchdown (mechanism in 2026.6.2 unverified) |
| Starts on "link lost" | starts at stage 2, i.e. `failsafe_delay` (1.5 s) after the link is lost; can also be switched on by the GPS RESCUE aux mode (ID 46) |

Quiz check: Q1-Q3 are correct. Q4 ("compass arrow backwards -> flies the wrong way or circles") is correct only when
the compass is trusted (`trust_mag = ON` in 2026.6; `gps_rescue_use_mag` in 4.5/2025.12, unverified default);
with the compass untrusted Betaflight takes heading from GPS course over ground and a reversed puck has no effect.

## 6. Safety tests

| Test | How | Tool | Catches |
|---|---|---|---|
| **Smoke stopper** | resettable fuse / current limiter (or a 12 V bulb) in series between pack and XT60 for the first power-up; a short makes it trip or the bulb glow instead of letting hundreds of amps flow | inline device | solder bridges, reversed polarity, a shorted ESC: saves the ESC and FC |
| **Props-off motor test** | props OFF, pack on, Configurator Motors tab, "I understand the risks", raise each motor; check M1-M4 position and spin against 2.2 | Motors tab | wrong motor order, reversed motor (flip on take-off) |
| **Board alignment** | Setup tab: tilt the quad; the 3D model must follow | Setup tab | wrong `align_board_*` (instant flip/oscillation) |
| **Accelerometer calibration** | level surface, Calibrate Accelerometer | Setup tab | drift in angle/alt hold; `NO_ACC_CAL` |
| **Compass check + calibration** | Calibrate Magnetometer, rotate ~30 s; then point the nose N/E/S/W and compare the heading with a phone compass (must agree to ~10 deg) (unverified tolerance) | Setup tab / OSD | wrong `align_mag`, magnetic interference from the battery leads/VTX: toilet-bowling and wrong-way rescue |
| **GPS fix** | wait for the 3D-fix LED blink, sats >= 8 on the OSD, READY beep | OSD, Setup/GPS tab | bad home point |
| **Failsafe / rescue test** | props off on the bench: arm, switch the radio off, check the OSD shows the failsafe/rescue; in the field: fly out 50-100 m, climb, switch the GPS RESCUE aux mode on (or the radio off) and watch it return; take over with the sticks | radio + OSD | rescue not configured, wrong heading, too-low return altitude |
| **Pre-arm checks** | `status` in the CLI / Setup tab arming flags | CLI | see 5.7 |

## 7. Flight characteristics (typical 7" LR, 6S1P Li-ion)

| Quantity | Value | Notes |
|---|---|---|
| AUW | 900-1100 g | original 925 g |
| T:W | ~5-8:1 | original 5.8:1 |
| Hover throttle | ~30-40 % (unverified) | original 42 % |
| Cruise current | ~8-15 A at 50-80 km/h (unverified) | low-KV + bi-blade + Li-ion |
| Full-throttle current | 120-170 A (from [20]) | far above 45 A P42A/P45B pack rating: big sag |
| Flight time | cruise 15-25 min (4000-5000 mAh Li-ion), hover ~25-30 min; 6S 1800 LiPo ~7-9 min (unverified) | |
| Top speed | ~120-150 km/h (unverified) | not the point of LR |
| Typical range | several km with ELRS 900 MHz; video (5.8 GHz) fades first | |
| Motor-out | a quad cannot survive a motor loss: it spins (yaw) and falls | no redundancy |

**Li-ion vs LiPo curve.** LiPo: 4.20 V full, ~3.7-3.8 V for most of the flight, land at 3.5 V/cell resting,
never below ~3.3 V under load; low internal resistance, 100+ A bursts. Li-ion 21700: 4.20 V full, nominal 3.6 V,
the curve falls more steadily through the flight, usable to ~2.8-3.0 V/cell under load (datasheet discharge cut-off
2.5 V [14][15][16]); DC internal resistance 13-16 mOhm per cell [15][16] so a 6S1P pack sags ~0.1 V/cell per 7 A
(e.g. 45 A x 15 mOhm = 0.68 V per cell). Holding 120 A punches on a 45 A pack overheats the cells. Li-ion also
loses capacity in the cold (unverified magnitude). In iynk the original models all packs with the LiPo curve
(3.3 + 0.9 x soc^0.7) and cuts at 3.2 V [24]: a real Li-ion pack would show ~3.3 V/cell with energy still left.

## 8. Real failure modes

| Failure | Cause | What the pilot sees |
|---|---|---|
| **Desync** | high-KV motor on 6S + 7" prop, too-aggressive ESC timing, voltage sag | a motor stutters/stops on a punch-out, the quad flips or tumbles out of the sky |
| **Brown-out / sag** | Li-ion asked for 100+ A, cold cells | voltage dive on the OSD, ESC/FC reboot at worst, sudden loss of thrust |
| **Reversed motor / swapped props** | wrong ESC direction or prop on the wrong motor | violent flip or spin at take-off |
| **Wrong board alignment** | FC rotated, `align_board_yaw` wrong | immediate flip/oscillation on arming |
| **Missing capacitor** | no low-ESR cap on long 7" battery leads | noisy video, gyro noise, ESC MOSFET failure over time |
| **Prop wash** | descending through its own wake (7" props are big) | wobble on descents and sharp turns |
| **GPS: too few sats / bad home** | arming too early | cannot arm (`GPS` flag); with `allow_arming_without_fix` the rescue is unavailable ("RESCUE N/A" flashes on the OSD [5]); a real failsafe then fails the `NO_HOME_POINT` check and it descends where it is (or drops if there is no altitude source) |
| **Compass misaligned or disturbed** | wrong `align_mag`, puck near the VTX or leads, tilted puck | with `trust_mag = ON`: toilet-bowling in pos hold, rescue heading the wrong way; the FLYAWAY check trips after ~20 s and it descends where it is (RESCUE FAIL) |
| **No heading (no compass)** | `trust_mag = OFF`, quad never flown forward | "HEADING N/A"; rescue pitches forward to learn the heading from GPS course [5][11] |
| **Return altitude too low** | `MAX_ALT` mode below a ridge, or `return_alt` without `FIXED_ALT` | rescue flies into terrain |
| **Video lost before control** | 5.8 GHz is shorter range | black goggles while the quad still flies: rescue only starts on a control failsafe; the pilot can switch GPS RESCUE on by aux |
| **ELRS failsafe set wrong** | receiver outputs hold values | FC never enters failsafe; flies off on the last sticks |

## 9. Uncertainties

- Exact Chimera7 Pro V2 plate sizes, stack pattern and standoff height; arm width.
- Real thrust of a 7x3.5 bi-blade on a 1300 KV 2807 (published data found only for tri-blades [20]).
- 3008 1100 KV motor product and mass; prop masses; camera/VTX/receiver masses.
- Hover throttle, cruise current, flight times and top speed for a 7" LR (community ranges only).
- Li-ion voltage thresholds for Betaflight (2.9/3.1 V) are community practice, not a Betaflight default.
- Whether default Betaflight cloud builds include `USE_FLIGHT_PLAN` (which switches rescue to the new flight-plan
  mission path); the release notes say the autopilot is SITL-only.
- The 1 W VTX power table; how much height a 7" loses during stage 1 with throttle-low rxfail.
- The release notes claim `ap_position_a` was removed, but it is in the 2026.6.2 settings table.
- Touchdown/disarm detection mechanism in 2026.6.2 (the old `gps_rescue_disarm_threshold` is gone).
