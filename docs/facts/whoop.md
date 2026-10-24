# Fact sheet: Tiny Whoop 65 mm, 1S brushless, Betaflight (Drone Lab Fig. 02, `whoop`)

Written 2026-10-24. Anything marked "(unverified)" could not be checked against a primary source in the time box.
Betaflight facts come from the **2026.6.2** source tree, read for this sheet. General Betaflight material that
applies unchanged to every quad (full mode-ID table, VTX table syntax, failsafe table, OSD position encoding) is
verified in `docs/facts/quad5.md` section 5. This sheet repeats what a whoop figure or lesson needs.

## 0. Header

**Craft class:** a 65 mm (motor-to-motor diagonal) ducted 1S brushless "Tiny Whoop". It has a one-piece
polypropylene frame with four ducts and four 0702 (or 0802) brushless motors on 31 mm props. One all-in-one (AIO)
"5-in-1" board carries the flight controller, the 4 ESCs, the OSD, an ExpressLRS receiver and an analog 5.8 GHz VTX.
A 14 mm nano camera sits in a thin canopy. A single-cell LiHV pack with a BT2.0 plug slides into a slot under the
frame. Dry weight is 17-23 g, and 23-31 g ready to fly.

Real products it represents:

| Product | Dry weight | Motors | Props | AIO board | Source |
|---|---|---|---|---|---|
| BETAFPV **Air65** (Racing / Freestyle, 2025 revision) | 17.3 g | 0702SE II 27000 KV (Racing), 23000 KV (Freestyle) | GF 1219S 3-blade (Racing), HQ 31 mm Ultralight 3-blade (Freestyle) | Air Brushless FC (5IN1): STM32G473, ICM42688P, 4 x 5 A ESC, ELRS 2.4 GHz, 25-400 mW VTX | [1] |
| BETAFPV **Meteor65** (2022) | 22.83 g | 0802SE 19500 KV | 31 mm 3-blade, 1.0 mm shaft | F4 1S 5A FC (Serial ELRS 2.4G) + separate M03 25-350 mW VTX | [2] |
| Happymodel **Mobula6 2024 V3** | 17.6 g | SE0702 28000 KV (9N12P, 1.46 g) | Gemfan 1208-3 (31 mm, 0.8 in pitch, 0.21 g) | CrazybeeG473 AIO 5-in-1: STM32G473, 5 A ESC (Bluejay 0.21), ELRS 3.x on UART3, OpenVTX on UART4 (PIT/10/25/100/400 mW) | [4] |

Other useful references: Meteor65 Pro (23.01 g, 0802SE 19500 KV, 35 mm props) [3], Air65 II (2026: 0702 25000 /
30000 / 36000 KV, Matrix 5IN1 II FC with 12 A ESCs; 16.6 g Champion, 17.7 g Racing, 17.8 g Freestyle) [7], and the 2S 65 mm Beta65X (26 g, 0802 14000 KV, F4 2S AIO,
two BT2.0 300 mAh packs in series) [5].

**What it is and what it is for:** the Tiny Whoop is the indoor trainer of FPV. The ducts guard the props, so it can
hit walls, furniture and people without doing harm. It weighs about 25 g, roughly five sheets of A4 paper, so a
crash costs almost nothing. It runs the same Betaflight firmware, PID loop and modes (Angle, Acro, turtle) as a
5-inch quad and uses the same goggles and radio, so skills carry over. Pilots fly living-room and office courses,
race in whoop leagues, and use it to keep practising in winter or at night. Its limits: one cell, 3-5 minutes per
pack, heavy voltage sag, and almost no wind tolerance outdoors. It has no GPS, compass or barometer.

## 1. Sources

Manufacturer pages and test data:

1. BETAFPV Air65 (spec block; 3 Jan 2025 upgrade to the 5IN1 FC and 0702SE II; T:W 5.82 / 5.26 / 6.4): https://betafpv.com/products/air65-brushless-whoop-quadcopter
2. BETAFPV Meteor65 2022 (22.83 g; 0802SE 19500 KV 1.88 g; frame 3.25 g; canopy 1.60 g; C03 camera 1.45 g; camera tilt 30 deg default / 20 deg optional; BT2.0 vs PH2.0 at 9 A): https://betafpv.com/products/meteor65-brushless-whoop-quadcopter-1s
3. BETAFPV Meteor65 Pro (23.01 g, 35 mm props, 4.5 min): https://betafpv.com/products/meteor65-pro-brushless-whoop-quadcopter-1s
4. Happymodel Mobula6 2024 V3 (manufacturer page): https://www.happymodel.cn/index.php/2025/12/11/mobula6-2024-v3-1s-65mm-ultra-light-micro-fpv-whoop/
5. BETAFPV catalogue (`https://betafpv.com/products.json`, read 2026-10-24) for these product pages: 0702 II Brushless Motors (weights, max thrust on GF 1219S-3, 4-pack prices) https://betafpv.com/products/0702-ii-brushless-motors ; 0702 Brushless Motors (2026) (max current and power) https://betafpv.com/products/0702-brushless-motors-2026 ; BT2.0 300mAh 1S 30C (8.28 g, 67.3 x 11.8 x 6.1 mm, 4.35 V) https://betafpv.com/products/bt2-0-300mah-1s-30c-battery-8pcs ; BT2.0 450mAh 1S 30C (12.7 g) https://betafpv.com/products/bt2-0-450mah-1s-30c-battery-4pcs ; LAVA 1S 300mAh 75C (8.3 g) https://betafpv.com/products/lava-1s-300mah-75c-battery-5pcs ; Air65 frame (2.67 g, 26 x 26 mm FC holes, 3 x M1.4 motor screws on 6.6 mm, ducts 34.9 mm x 14.5 mm) https://betafpv.com/products/air65-brushless-whoop-frame ; Air65 II frame https://betafpv.com/products/air65-ii-brushless-whoop-frame ; Matrix 1S Brushless FC (5IN1) (MCU, UARTs, BEC, OSD, ESC firmware, 3.92 g) https://betafpv.com/products/matrix-1s-brushless-flight-controller ; F4 1S 5A AIO FC (29 x 29 mm board, 3.13 g, 5 A / 6 A peak) https://betafpv.com/products/f4-1s-5a-aio-brushless-flight-controller ; 31 mm props (4-blade 1.20 g per 4, 3-blade 1.00 g per 4, GF 1219S 0.74 g per 4, GF 1207 0.15 g each); Beta65X Whoop Quadcopter (2S).
6. Oscar Liang, BETAFPV Air65 review (G473 + ICM42688-P; Bluejay 0.19 at 96 kHz, ESC target A-X-5; hover throttle 30-35 %; flight times; PWM-frequency test; BF 4.5.0 settings): https://oscarliang.com/betafpv-air65/
7. BETAFPV Air65 II (2026; 0702 2026 motors; Matrix 5IN1 II; 3-point mount; 6.3:1): https://betafpv.com/products/air65-ii-brushless-whoop-quadcopter
8. Betaflight unified target `BETAFPVG473` (pins, UART roles, current meter, OSD, beeper, LED strip): https://github.com/betaflight/config/blob/master/configs/BEFH/BETAFPVG473/config.h
9. NewBeeDrone FLOW 0702 listing (9 stator slots, 12 rotor poles): https://www.getfpv.com/micro-quadcopters/micro-motors/newbeedrone-flow-0702-dual-ball-bearing-whoop-motor-4pcs.html

Firmware source code (Betaflight tag 2026.6.2):

10. Releases (2026.6.2 published 2026-09-16, newest non-prerelease on 2026-10-24): https://github.com/betaflight/betaflight/releases
11. `src/main/cli/settings.c` (every `set` name and range): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/cli/settings.c
12. `src/main/flight/mixer_init.c` (crash-flip defaults, `yaw_motors_reversed` default) and `src/main/flight/mixer.c` (crash-flip motor logic): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/mixer_init.c
13. `src/main/fc/core.c` (crash-flip arming, DShot reverse command, upright check): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/fc/core.c
14. `src/main/msp/msp_box.c` (`FLIP OVER AFTER CRASH` = permanent ID 35, offered only with DShot): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/msp/msp_box.c
15. `src/main/sensors/battery.c`, `battery.h`, `current.c` (battery profiles, cell-voltage defaults, current-meter names): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/sensors/battery.c
16. `src/main/fc/runtime_config.c` / `.h` (arming-disable flags and their display names): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/fc/runtime_config.c
17. `src/main/pg/motor.c` (`motor_poles` default 14, `motor_idle` default 550): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/pg/motor.c

Tools and community:

18. ESC Configurator (Bluejay / BLHeli_S / AM32 settings, motor direction): https://esc-configurator.com
19. ExpressLRS "Configuring the FC": https://www.expresslrs.org/quick-start/receivers/configuring-fc/
20. Oscar Liang micro-LiPo test (capacities only; sag shown as graphs): https://oscarliang.com/whoop-toothpick-lipo-battery/
21. Drone Lab research: `docs/research/drone-lab-a.md` section 9.2 (Fig. 02), section 3 (calculator), Appendix A (whoop calc matrix, sim measurements).

## 2. Geometry (craft frame)

Craft frame: x forward (nose, camera side), y left, z up, units mm. Origin: the frame centre, on the top surface of
the frame's centre floor (the moulded deck that the AIO stands on). A whoop has one moulded PP frame, not carbon
plates.

### 2.1 Frame

| Item | Value | Source |
|---|---|---|
| Wheelbase (motor-to-motor diagonal) | **65 mm** | [1][2][4] |
| Motor centres | 32.5 mm from the centre along each diagonal, so **x, y = +-22.98 mm** (use +-23.0) | geometry |
| Motor square side | 45.96 mm | geometry |
| Material | PP (polypropylene), injection-moulded | [5: Air65 frame] |
| Frame mass | Air65 2.67 g; Air65 II 2.65 g; Air65 Champion 2.20 g; Meteor65 3.14-3.25 g | [2][5][7] |
| Duct inner diameter | Air65 34.9 mm; Meteor65 34 mm in the comparison table, but the same page's text says "enlarged from 32mm to 34.9mm" (Meteor65 value 32 or 34 mm, conflicting). 31 mm props, so about 1.5-2 mm tip gap on the Air65 | [5: Air65 frame page] |
| Duct height | Air65 14.5 mm; Meteor65 16 mm | [5] |
| Overall size | Air65 II frame 82.6 x 82.6 x 15.1 mm; Mobula6 2024 complete craft 81 x 81 x 37 mm (with canopy) | [4][5] |
| Arms | none in the 5-inch sense: each motor sits on a round mount inside its duct, held by braces (Air65 II page comparison table: 4 on the Air65 II frame, 6 on the Air65 frame; column order inferred from the listed weights 2.65 g / 2.67 g) | [5] |
| Motor mounting | **3 x M1.4 screws on a 6.6 mm circle** (screws M1.4 x 3 mm; 12 screws per 4 motors) | [5] |
| AIO mounting | 4 holes on a **26 x 26 mm** square (Air65, Matrix 5IN1) or **25.5 x 25.5 mm** (Air65 II frame), on rubber grommets; the F4 1S 5A board itself is 29 x 29 mm | [5] |
| Battery slot | under the centre floor, 11.6 x 6.0 mm cross-section (Air65), battery along x, plug at the rear | [5] |

### 2.2 Motors: Betaflight QUAD X order and spin

Betaflight QuadX output order, from the same mixer table as the 5-inch quad (`mixer_init.c` [12], quad5.md 2.2):

| Motor (BF number) | Corner | x (mm) | y (mm) | Spin from above, **props in** (`yaw_motors_reversed = OFF`, BF default) | Spin, **props out** (`yaw_motors_reversed = ON`) |
|---|---|---|---|---|---|
| M1 | rear right | -22.98 | -22.98 | **CW** | CCW |
| M2 | front right | +22.98 | -22.98 | **CCW** | CW |
| M3 | rear left | -22.98 | +22.98 | **CCW** | CW |
| M4 | front left | +22.98 | +22.98 | **CW** | CCW |

- "Props in" means the front edge of each front prop moves inward toward the camera. Diagonal pairs (M1+M4, M2+M3)
  spin the same way, so their yaw torques cancel.
- The factory direction varies between whoop models. Forum posts say the Meteor65 ships props in (unverified;
  check the factory CLI dump). A generic figure should use the BF default (props in), which matches the original's
  CLI comment.
- `yaw_motors_reversed` only flips the yaw mixing sign; it never changes how a motor spins [12]. Physical spin is
  set in the ESC: Bluejay/AM32 "Motor direction" in ESC Configurator [18] through Betaflight passthrough, or the
  direction dialog in the Betaflight App Motors tab. Swapping two motor wires also works but is impractical on
  plug-in motors, which is why the original says "direction set in Betaflight".
- On the BETAFPVG473 target, the motor outputs are M1 PB0, M2 PB1, M3 PB6, M4 PC13 [8]. Which socket on the board
  each one feeds must be checked with the props-off motor test (section 6).

### 2.3 Props, camera, battery, mass

| Item | Value | Source |
|---|---|---|
| Prop diameter | **31 mm** (1.2 in), 1.0 mm press-fit shaft hole (0.8 mm versions exist) | [4][5] |
| Blades | **3-blade is today's standard** (GF 1219S, GF 1208, GF 1207, HQ 31 mm Ultralight); 31 mm 4-blade (about 0.30 g each) and 2-blade versions exist | [1][4][5] |
| Pitch | GF 1208 = 0.8 in [4]; GF 1207 = 0.7 in, 0.15 g [5]; GF 1219S = 1.9 in per retailers (unverified on Gemfan's site), 0.185 g [5]; HQ 1.2 x 1.1 x 3 = 1.1 in [4] | |
| Prop disc in figure | radius 15.5 mm | geometry |
| Prop plane height | z about +8 to +11 mm, at the motor bell top; the 0702 motor is 9.5 mm across x 14 mm tall including the shaft [4] (z unverified) | |
| Motor | 0702: 7 mm stator diameter, 2 mm stator height, 1.0 mm shaft (3.4-4.2 mm long), 9N12P | [4][5] |
| Camera | 14 x 14 mm nano camera, e.g. BETAFPV C03 (1.45 g, 1200TVL, 1/3" CMOS, 2.1 mm lens, 160 deg FOV) or Happymodel Nano5 (155 deg FOV) | [2][4] |
| Camera uptilt | Meteor65 canopy **30 deg default, 20 deg optional**; Air65 camera mount adjustable **25-50 deg**; the original's 20 deg is at the low end | [2][5] |
| Camera position | on the centre line in the canopy nose, about x +12 to +16 mm, z +10 to +14 mm (unverified) | |
| Canopy | thin moulded shell over the AIO that holds the camera (Meteor canopy 1.60 g) | [2] |
| Battery | 1S pack in the slot under the centre, long axis along x, BT2.0 plug at the rear (BT2.0 300 mAh: 67.3 x 11.8 x 6.1 mm) | [5] |
| Mass, no battery | Air65 17.3 g; Mobula6 2024 V3 17.6 g; Meteor65 22.83 g | [1][2][4] |
| Mass, ready to fly | Air65 + LAVA 300 mAh = about 25.6 g; Meteor65 + BT2.0 300 mAh = about 31.1 g | derived from [1][2][5] |

## 3. The original's catalogue, sanity-checked

The calculator stays identical. This section only flags descriptions that are untrue or implausible, with the real
figure.

### 3.1 Batteries

| Original option | Original numbers | Real-world check | Verdict |
|---|---|---|---|
| `1S 300 mAh (BT2.0)` | 7.5 g, $6 | BETAFPV BT2.0 300 mAh 1S 30C: **8.28 g, 4.35 V (LiHV)**, $23.99 for 8 (about $3 each); LAVA 1S 300 mAh 75C: 8.3 g, about $4.40 each [5] | plausible (0.8 g light). Note that BETAFPV's 300 mAh BT2.0 pack is already HV, so "HV" is not what sets it apart from the 450 |
| `1S 450 mAh HV (BT2.0)` | 11 g, $7 | BT2.0 450 mAh 1S 30C: **12.7 g**, 4.35 V, 62 x 15.5 x 6.7 mm, $14.99 for 4 (about $3.75 each) [5] | plausible (1.7 g light). A 450 mAh pack is sold for 75 mm whoops; on a 65 mm it is heavy and sluggish, and 15.5 mm is wider than the Air65's 11.6 mm slot [5] |
| `2S 300 mAh (XT30)` | 16 g, $9 | Real 2S 65 mm whoops (Beta65X 2S, Beta65 Pro 2) run **two BT2.0 300 mAh 1S packs in series** through a "2S whoop cable" (2 x 8.28 = 16.6 g), on a **2S-rated AIO** (F4 2S) with **0802 12000-14000 KV** motors [5] | mass right; **"XT30" is untrue for a 65 mm whoop** (XT30 is for 2S packs on 75 mm+ craft). The reference AIOs are 1S boards (Matrix **1S** 5IN1, F4 **1S** 5A, with a single BT2.0 1S lead [5]; their exact maximum input voltage is unverified), and the 0702 II motors are specified "Input Voltage: 1S" [5] |

### 3.2 Motors

| Original option | Original numbers | Real-world check | Verdict |
|---|---|---|---|
| `0702 25000KV` | 1.9 g, $9 | 0702 (2026) Freestyle 25000 KV: 1.50 g, max 3.86 A, 15.01 W [5]; 0702SE 25000 KV also sold [5] | KV real; **1.9 g is too heavy for an 0702** (1.38-1.59 g); 1.88 g is an 0802SE [2] |
| `0702 23000KV` | 1.9 g, $9 | 0702SE II 23000 KV: 1.45 g, **max thrust 32 g** on GF 1219S-3 (old 0702SE: 1.42 g, 28.3 g); $43.99 per 4 (about $11 each) [5] | KV real; weight high |
| `0702 27000KV` | 1.9 g, $10 | 0702SE II 27000 KV: 1.47 g, **max thrust 35.4 g** (old: 1.44 g, 31.4 g); $43.99 per 4 [5] | KV real; weight high |
| (not offered) | | 0702 II 30000 KV: 1.55 g, 37.2 g thrust; 0702 (2026) 30000 KV 6.03 A max, 36000 KV 7.17 A max [5]; Mobula6 SE0702 28000 KV 1.46 g [4] | for reference |
| Build text "0702, 7 mm stators, ~2 g" | | 7 mm stator diameter and 2 mm stator height: true [4]; mass about 1.5 g | "~1.5 g" is closer |
| Build text "~25,000 KV (~90,000 rpm on 1S)" | | 25000 x 3.7 V = 92,500 rpm unloaded; 105,000 rpm at 4.2 V; loaded rpm is lower | fine as an order of magnitude |
| Build text "two tiny screws each" | | **three** M1.4 screws per motor on 6.6 mm (Air65/Air65 II/Air75 frames) [5] | flag: should be three |
| Warning "2S whoops use ~19000 KV 0802 motors" | | **Wrong.** 0802SE 19500 KV is a **1S** motor (Meteor65 and Meteor65 Pro are 1S) [2][3]. 2S 65 mm whoops used **0802 12000-14000 KV** (Beta65X 2S 14000 KV, Beta65 Pro 2 12000 KV) [5] | correct text: "2S 65 mm whoops use about 12000-14000 KV 0802 motors" |
| Warning "{k} rpm, twice what 0702 windings are made for. They cook in seconds." | | rpm doubles on 2S, and current and power on the same prop rise steeply (about 4-8x), so overheating is real; "seconds" is untested (unverified) | acceptable |

### 3.3 Props

| Original option | Original numbers | Real-world check | Verdict |
|---|---|---|---|
| `31 mm 4-blade` (default) | pf 1.00, eff 1.00, 0.25 g, $1.5 per pair | 31 mm 4-blade: 0.30-0.31 g each (1.20 g per 4) [5]; about $1-2.50 per set of 4 [5] | plausible; but **every current reference whoop ships 3-blade**, so a 4-blade default is dated (keep the numbers) |
| `31 mm 3-blade` | pf .90, eff 1.08, 0.22 g | 0.15-0.25 g each (GF 1207 0.15 g, GF 1219S 0.185 g, GF 1208 0.21 g, generic 0.25 g) [4][5] | plausible |
| `31 mm 2-blade (efficient)` | pf .78, eff 1.20, 0.18 g | 31 mm 2-blade exists (GF 1210 2-blade is recommended for 0702 II racing [5]); weight unverified | plausible |

### 3.4 Fixed parts

| Original part | Original numbers | Real-world check | Verdict |
|---|---|---|---|
| `65 mm ducted frame` | 3.6 g, $6 | 2.20-3.25 g [2][5]; price unverified | plausible, slightly heavy |
| `AIO: F4 FC + 4x5A ESC + ELRS` | 2.6 g, $40 | F4 1S 5A AIO (STM32F411, Betaflight `STM32F411` firmware, 5 A cont./6 A peak): **3.13 g**, $39.99 [5]; Air 1S 5IN1 (the Air65's board, STM32G473, includes the VTX): **3.6 g**; Matrix 1S 5IN1: **3.92 g**, $49.99 [5] | price right; mass about 0.5-1.3 g light. Current boards are G473, not F4 |
| `Nano camera` | 1.6 g, $15 | C03 1.45 g [2]; price unverified | plausible |
| `On-board VTX + antenna` | 0.4 g, $3 | the VTX is on the 5IN1 AIO; the 0.4 g covers the antenna only. A separate M03 VTX adds about 1.6 g (BETAFPV: F4 1S 5A AIO + M03 VTX = 4.74 g, against the F4 board alone at 3.13 g) [5] | plausible as "antenna only" |
| `ELRS antenna` | 0.2 g, $2 | wire or ceramic SMD antenna (the F4 1S 5A ELRS uses a ceramic SMD antenna) [5]; mass unverified | plausible |
| `Canopy` | 1.2 g, $4 | Meteor canopy 1.60 g [2] | plausible |
| `Screws + grommets` | 0.6 g, $2 | metal screws about 0.046 g each, since PEEK saves 0.46 g on a 12-screw build [5] | plausible |
| Dry total | 10.2 g fixed + 4 x 1.9 g + 4 x 0.25 g = **18.8 g** | Air65 17.3 g, Mobula6 17.6 g, Meteor65 22.83 g [1][2][4] | **realistic** |

### 3.5 Calculator outputs vs reality (default 1s300 / 0702-25000 / 31mm-4)

| Output | Original | Real-world | Notes |
|---|---|---|---|
| Thrust per motor | 26.0 g (T:W 3.96) | BETAFPV max thrust (GF 1219S-3): 32 g at 23000 KV, 35.4 g at 27000 KV [5]. BETAFPV quotes T:W 5.26:1 (Freestyle) and 5.82:1 (Racing) for the Air65 [1] | the original is conservative by about 20-35 %; a 4:1 whoop is the low end |
| Hover throttle | 50 % | 30-35 % measured on the Air65 with a fresh 300 mAh pack [6] | too high, because thrust is low |
| Max current | 14 A | 4 x 3.86 A = 15.4 A for 25000 KV (2026 motor); 24 A at 30000 KV; 28.7 A at 36000 KV [5] | right for 25000 KV |
| Hover time | 7.3 min | not published; hover draw about 2-3 A on 300 mAh suggests 5-7 min (unverified) | plausible, slightly optimistic |
| "Freestyle time" | 3.1 min | spec 4 min (Meteor65 [2], Air65 on 260 mAh [1]); 3:40-4:30 at 50-60 % throttle [6] | slightly pessimistic; the label should say "Flying time" |
| Price | $117 | the BNF craft costs about $90-130 (unverified) | plausible |

## 4. Electronics and wiring

### 4.1 Flight controller (AIO)

| Board | MCU | Gyro | ESC | RX | VTX | Weight | Source |
|---|---|---|---|---|---|---|---|
| BETAFPV **Matrix 1S Brushless FC (5IN1)** (1.0 mm PCB, **JST1.25 motor sockets**; Meteor75 Pro board) | STM32G473CEU6 (BETAFPV: 168 MHz) | ICM42688P (BMI270 since 5 Jan 2026) | 4 x 5 A cont. / 8 A peak, Bluejay 0.19 `A_X_5_96KHz`, DShot300/600 | serial ELRS 2.4 GHz (V3.4.3) on UART3 | 5.8 GHz 48 ch, 25/100/200/400 mW/PIT, SmartAudio 2.0 on UART2 | 3.92 g | [5][8] |
| BETAFPV **Air 1S Brushless FC (5IN1)**, the board actually fitted to the Air65 (a different product from the Matrix: 0.8 mm PCB, **no motor connectors, motor wires soldered**) | STM32G473CEU6 (168 MHz) | ICM42688P (SPI) | 5 A cont., Bluejay 0.19 `A_X_5_96KHz`, DShot300/600, 1S input | serial ELRS 2.4 GHz (V3.4.3) | 25/100/200/400 mW/PIT, SmartAudio 2.0 | **3.6 g** (4IN1 version without RX 2.9 g); 26 x 26 mm holes; 5 V 3 A BEC; 16 MB blackbox; factory `Betaflight_4.5.0_BETAFPVG473` | [1][5] |
| BETAFPV F4 1S 5A AIO (ELRS) | STM32F411CEU6 (BETAFPV: 108 MHz) | BMI270 (BETAFPV comparison table on the Matrix page) | 4 x 5 A cont. / 6 A peak (3 s), BLHeli_S `O_H_5_48_REV16_8` factory, DShot150/300/600 | SPI ELRS (ELRS 1.x only), SMD ceramic antenna | none (add M03) | 3.13 g; 8 MB blackbox; 0.8 mm PCB | [5] |
| Happymodel CrazybeeG473 AIO 5-in-1 (Mobula6 2024 V3) | STM32G473CEU6 | ICM42688P or LSM6DSV16X (page lists both) | 5 A / 6 A peak, Bluejay 0.21 `A_X_5_96KHz`, DShot300/600 | ELRS 3.x, CRSF, UART3 | OpenVTX, SmartAudio 2.1, UART4, PIT/10/25/100/400 mW | (unverified) | [4] |
| BETAFPV Matrix 1S 5IN1 II (Air65 II) | STM32G473CEU6 | ICM42688P / ICM42622 / BMI270 / LSM6DSK320X | 12 A cont. / 18 A peak, Bluejay 0.19 `A_X_5_96KHz` | serial ELRS | 400 mW | 4.1 g (solder-free), 3.76 g (solder-required); factory `Betaflight_4.5.3_BETAFPVG473_V2`; FC page lists 26 x 26 mm holes although the Air65 II frame page says 25.5 x 25.5 mm | [5][7] |

- Mounting: four rubber grommets on 26 x 26 mm posts. The Air65 II uses a 3-point mount, which BETAFPV says
  "creates cushioning space during impacts ... lowering the damage rate by up to 80 %"; its tests "indicated that
  removing a rubber grommet could significantly improve impact protection" (which grommet is not stated) [7].
- The gyro chip is mounted rotated, and the target's `GYRO_1_ALIGN CW180_DEG` corrects for it [8]. The user leaves
  `align_board_*` at 0 when the board's arrow points forward.
- Other BETAFPVG473 target facts [8]: firmware is built for `FC_TARGET_MCU STM32G474` (the board's chip is the
  G473); `SYSTEM_HSE_MHZ 0` (no external crystal configured; that the clock then runs from the internal oscillator
  is an interpretation, unverified); gyro on SPI1 (CS PA4, interrupt PC4); OSD MAX7456/AT7456E on SPI2 (CS PB12);
  blackbox flash on SPI3 (CS PB9, `USE_FLASH_M25P16` driver family); `DEFAULT_DSHOT_BITBANG ON`; `BEEPER_INVERTED`.
  Gyro drivers compiled: ICM42688P and BMI270. The LED active level is not stated in the target (unverified).

### 4.2 ESC

- A 4-in-1 ESC on the AIO, 5 A continuous per channel (12 A on the 2026 Matrix 5IN1 II) [5].
- Firmware: **Bluejay** (open BLHeli_S successor for EFM8 "BB51" MCUs), 0.19 or 0.21, target `A_X_5`, 96 kHz PWM
  [4][5][6]. BLHeli_S on the old F4 1S 5A [5]. AM32 runs on ARM-MCU ESCs, but none of the reference boards uses it.
  BLHeli_32 has been end-of-life since 30 June 2024 (quad5.md).
- Protocol: **DShot300** (DShot600 is also supported [5]) with **bidirectional DShot** for the RPM filter (Bluejay
  supports it).
- PWM frequency: Bluejay offers 24 / 48 / 96 kHz. On a 1S 300 mAh pack, Oscar Liang measured 4:00 (96 kHz),
  3:40 (48 kHz) and 2:50 (24 kHz) [6]. BETAFPV warns against flashing ESCs back-to-back too fast, which "can stall
  and burn the FC" [5].

### 4.3 Receiver, video, GPS

- Receiver: ExpressLRS 2.4 GHz built into the AIO, on **UART3** as Serial RX with **CRSF** (target defaults
  `SERIALRX_UART USART3`, `SERIALRX_PROVIDER CRSF` [8]; Mobula6 also UART3 [4]). It is updated over Wi-Fi or
  Betaflight passthrough (target "BETAFPV 2.4GHz AIO RX") [5]. Bind mode: power-cycle 3 times, and the LED
  double-blinks [5].
- Video: analog 5.8 GHz. On the Matrix 5IN1 the VTX is on **UART2** with **SmartAudio 2.0** (target
  `VTX_SMARTAUDIO_UART USART2` [8]); on the Mobula6 it is on UART4 with SmartAudio 2.1 [4]. Powers are 25 / 100 /
  200 / 400 mW plus PIT [5]. BETAFPV recommends 25-100 mW indoors and warns never to power up without the antenna
  (or with power 0) [5]. OSD chip: AT7456E (MAX7456 driver on SPI2) [5][8]. HD whoops use MSP DisplayPort (HDZero,
  DJI O4); for example, the Mobula6 ECO is 23.16 g with HDZero (unverified).
- GPS/compass/baro: **none fitted**. The G473 target compiles barometer and I2C support [8], but the boards list
  only "Sensor: Voltage & Current" [5]. So there is no GPS Rescue, no Position Hold and no real Altitude Hold.

### 4.4 Power

- Connector: **BT2.0** (BETAFPV, 1.0 mm banana pins; pin size unverified). BETAFPV's test with a 300 mAh pack at 9 A
  says BT2.0 "has double the time (about 2 minutes)" of PH2.0 (solid-pin) and "a 0.2v improvement in voltage sag" [2]. Happymodel uses A30 (BT2.0 compatible) [4].
- Pack voltage: 1S LiHV 3.8 V nominal, **4.35 V full**; plain LiPo 3.7 V nominal, 4.20 V full. Never go below
  3.0 V under load; store at 3.8-3.9 V [5]. BETAFPV quotes flight time from 4.35 V to 3.3 V [1].
- BEC: on-board **5 V, 3 A max** on the Matrix 5IN1 [5]. It feeds the camera, VTX and receiver. On a 1S input the 5 V
  rail needs a boost converter, so deep sag can reset the video or the receiver (boost topology unverified).
- Capacitor: 1S AIOs carry only on-board ceramic capacitors; **no separate low-ESR electrolytic** is fitted
  (unverified per board). The 5-inch "35 V 1000 uF" rule does not apply.
- LEDs: two status LEDs (LED0 PC15, LED1 PC14) and a LED-strip output (PB2) on the G473 target [8]. Buzzer: a
  `BEEPER_PIN PA8` output exists [8], but whoops normally fit no buzzer; use the DShot motor beacon
  (`beeper_dshot_beacon_tone` 1-5 [11]).
- Blackbox: on-board SPI flash, "16MB" per BETAFPV on the Matrix and Air 5IN1 (8 MB on the F4 1S 5A) [5]; the target
  uses the `M25P16` driver family on SPI3 [8]. Whether BETAFPV means 16 MB or 16 Mbit (2 MB) is unverified.

### 4.5 Pad / UART map: BETAFPV Matrix 1S Brushless FC (5IN1), target BETAFPVG473 [5][8]

| Function | Hardware | Betaflight |
|---|---|---|
| Battery in | BT2.0 pigtail (red +, black -) | `ADC_VBAT_PIN PA0`, voltage meter ADC |
| Current sensor | on board | `ADC_CURR_PIN PA1`, `current_meter = ADC`, `ibata_scale` default **750** (Oscar Liang changed it to 720 [6]) |
| Motors M1-M4 | 4 x **JST1.25** 3-pin sockets (3 phase wires, no polarity) on the Matrix; on the Air65's Air 5IN1 board the motor wires are **soldered to pads** (no connectors) [5] | PB0, PB1, PB6, PC13 (LED strip PB2 shares the timer map) |
| UART1 | free pads | TX PA9 / RX PA10 |
| UART2 | internal VTX | SmartAudio (TX PA2; RX pin PA3) |
| UART3 | internal ELRS receiver | Serial RX, CRSF (TX PB10 / RX PB11) |
| UART4 | free pads | TX PC10 / RX PC11 |
| I2C1 | pads (baro/mag option) | SCL PA15 / SDA PB7 |
| Camera | 3 wires: 5 V (red), GND (black), video (yellow) (colours unverified per camera) | OSD AT7456E |
| VTX antenna | U.FL or soldered whip | |
| LED strip, beeper | pads | PB2, PA8 |

## 5. Firmware: Betaflight

### 5.1 Version

- Current stable on 2026-10-24: **Betaflight 2026.6.2** (released 2026-09-16); before it 2026.6.1 (2026-08-02) and
  2025.12.5 (2026-06-28) [10]. Betaflight has used calendar versioning since 2025.12; there is no "4.6".
- Factory whoops often ship older firmware (Matrix 5IN1: 4.5.0; 5IN1 II: 4.5.3 `BETAFPVG473_V2`) [5]. Flash the
  matching target (`BETAFPVG473`, `_V2` or `_V3` exist in the config repo [8]) and paste the factory diff before
  changing settings.
- Renames that matter here (details in quad5.md 5.2): `dshot_idle_value` -> `motor_idle` (units 0.01 %, default
  **550** = 5.5 % [17]); `angle_level_strength` -> `angle_p_gain`; `level_limit` -> `angle_limit`; and
  **`crashflip_expo` is gone** (not in 2026.6.2 settings.c [11]).

### 5.2 Initial setup (whoop)

```
# Betaflight 2026.6.2, BETAFPV Matrix 1S 5IN1 (target BETAFPVG473), ELRS on UART3, VTX on UART2
mixer QUADX
set align_board_yaw = 0             # AIO arrow toward the camera
set motor_pwm_protocol = DSHOT300
set dshot_bidir = ON                # bidirectional DShot for the RPM filter
set motor_poles = 12                # 0702/0802 whoop motors are 9N12P; BF default 14 is wrong here
set motor_idle = 700                # 7 %, units 0.01 % (default 550)
set yaw_motors_reversed = OFF       # props in (ON = props out)
serial UART3 64 115200 57600 0 115200   # 64 = Serial RX (target default)
set serialrx_provider = CRSF
serial UART2 2048 115200 57600 0 115200 # 2048 = VTX SmartAudio (target default)
set current_meter = ADC             # NONE / ADC / VIRTUAL / ESC / MSP
set ibata_scale = 750               # target default; calibrate against a charger's mAh
set vbat_max_cell_voltage = 440     # must be above 4.35 V for LiHV (default 430)
set vbat_full_cell_voltage = 435    # LiHV full (default 410)
set vbat_warning_cell_voltage = 330 # default 350; 1S sags, so warn later
set vbat_min_cell_voltage = 320     # default 330
set bat_capacity = 300              # mAh, for the mAh-left OSD and consumption warning
save
```

Checks against the 2026.6.2 source [11][15][17]:
- `vbat_max/full/min/warning_cell_voltage`, `bat_capacity`, `force_battery_cell_count` and `battery_profile_name`
  are **battery-profile** values in 2026.6.2 (`PROFILE_BATTERY_VALUE`). The range is 100-500 (0.01 V).
  Defaults: max 430, full 410, warning 350, min 330, capacity 0 [15].
- `current_meter` lookup: `NONE, ADC, VIRTUAL, ESC, MSP` [15]. Virtual-meter settings are `ibatv_scale` and
  `ibatv_offset` [11].
- `vbat_sag_compensation` (PID profile, 0-150 %) raises motor output as the pack sags, so 1S feel stays consistent
  [11].
- `motor_poles` range 4-255, default 14 [11][17]. 9N12P: Mobula6 SE0702 [4]; NewBeeDrone FLOW 0702 12 poles [9].
- The original's `set vbat_warning_cell_voltage = 330` is valid (range 100-500). Oscar Liang uses min 3.0 V and
  warning 3.2 V on the Air65 [6].
- The `serial` syntax and function bits are as in quad5.md 5.3.

### 5.3 Turtle mode (crash flip)

Mode name **`FLIP OVER AFTER CRASH`**, permanent ID **35** [14]. The mode is listed only when the motor protocol
is DShot [14], because arming with the switch on sends `DSHOT_CMD_SPIN_DIRECTION_REVERSED` to the ESCs [13].

```
aux 2 35 2 1700 2100 0 0          # turtle on AUX3 high: aux <slot> <modeId> <ch, 0 = AUX1> <start> <end> <logic> <linkedTo>
set crashflip_motor_percent = 0   # 0-100, default 0: power to the motors that are not lifting
set crashflip_rate = 0            # 0-250, default 0; units x10 deg/s (35 = no power above 350 deg/s); 0 disables the attenuators
set crashflip_auto_rearm = OFF    # OFF/ON, default OFF; ON = flip back and fly on without disarming
save
```

How it works [12][13]:
- Defaults (2026.6.2): `crashflip_motor_percent = 0`, `crashflip_rate = 0`, `crashflip_auto_rearm = OFF`. A
  RACE_PRO build uses rate 30 and auto re-arm ON [12].
- Procedure: upside down, disarm, flip the turtle switch on, then arm. The motors run reversed. Push the pitch or
  roll stick toward the side that should lift. Stick deflection sets the power, with a 15 % stick deadband;
  motors below 2 % drive are sent the disarm value [12]. With `crashflip_rate` > 0, power fades as the craft
  rotates (about 90 deg with the accelerometer) and as the gyro rate approaches the limit [12].
- The **upside-down arming block (`ANGLE` flag) is skipped while the turtle switch is on** (`!isUpright() &&
  !IS_RC_MODE_ACTIVE(BOXCRASHFLIP)`) [13]. That is why you can arm upside down only in turtle mode.
- Ending it: switch turtle off. With auto re-arm OFF the FC disarms itself and blocks arming with the flag shown as
  **`FLIP_SWITCH`** (`ARMING_DISABLED_CRASHFLIP`) until you move the arm switch to disarm, then re-arm [13][16].
  With auto re-arm ON the motors return to normal direction and you fly on.
- The original's `aux 2 35 1 1700 2100 0 0` is valid syntax: slot 2, mode 35, channel 1 = **AUX2**. On the common
  layout AUX2 is Angle, so give turtle its own switch (AUX3 above).

### 5.4 RPM filter

```
set dshot_bidir = ON
set motor_poles = 12
set rpm_filter_harmonics = 3      # 0-3, default 3 (0 = off)
set rpm_filter_min_hz = 100       # 30-200, default 100
set rpm_filter_weights = 100,60,0 # Oscar Liang's Air65 value [6]; default 100,100,100
save
```
- Ranges and defaults are as verified in quad5.md 5.4. On 1S a whoop motor turns at about 60,000-100,000 rpm, a
  rotation frequency of 1,000-1,700 Hz, so the notches sit far above a 5-inch's. A wrong `motor_poles` puts every
  notch at the wrong frequency (14/12 = 17 % too high).
- If an ESC does not answer bidirectional DShot, arming is blocked with `DSHOT_TELEM` [16].

### 5.5 Modes the original uses

The original offers `alt` ("Altitude hold (easy)"), `angle`, `acro`, `race` (angle + gate timing) and the
`Living room` range, which flies in alt-hold [21]. On a real whoop:

```
aux 0 0 0 1700 2100 0 0      # ARM on AUX1 high
aux 1 1 1 1300 2100 0 0      # ANGLE on AUX2 mid/high (low = acro)
aux 2 35 2 1700 2100 0 0     # turtle on AUX3 high
set angle_limit = 60         # 10-80, default 60
set angle_p_gain = 50        # default 50; Oscar Liang suggests 75-90 "angle strength" on the Air65 [6]
feature AIRMODE
save
```
- **Altitude hold is not a real whoop mode.** Betaflight ALTHOLD (ID 3) needs a barometer and/or GPS, and the
  reference AIOs have neither [5]. Teach the original's "alt" as a simulator aid, and say so on screen.
- Betaflight has no "ACRO" mode: Acro is simply what happens when no self-level mode is active.

### 5.6 OSD (whoop)

- Analog OSD (AT7456E). Typical elements: `osd_vbat_pos` (on 1S, pack voltage = cell voltage), `osd_current_pos`,
  `osd_mah_drawn_pos`, `osd_avg_cell_voltage_pos`, `osd_link_quality_pos`, `osd_flymode_pos`, `osd_warnings_pos`,
  `osd_tim_2_pos` [11]. Position value = `x | y<<5 | 2048` for profile 1 (quad5.md 5.6).
- **Current:** the Matrix/Air 5IN1 has a real ADC current sensor (`current_meter = ADC`, scale 750) [5][8]. Boards
  without one can use `VIRTUAL`, an estimate from throttle. Correctly calibrated, the OSD shows the **real** total
  draw: about 2-3 A at hover and about 15 A at full throttle with 25000 KV motors (4 x 3.86 A max [5]; hover
  figure unverified). The original's OSD showed about half (5.9 A at full throttle against about 11.4 A
  simulated) [21]; that is a bug in the original, not whoop behaviour.

### 5.7 VTX power

- Matrix 5IN1: 25 / 100 / 200 / 400 mW + PIT over SmartAudio 2.0 [5]. Mobula6: PIT / 10 / 25 / 100 / 400 mW over
  SmartAudio 2.1 [4]. Load the factory `vtxtable` and set `vtx_power` to the 25 mW index indoors. Table syntax is
  in quad5.md 5.7.

### 5.8 Failsafe, arming, calibration

- Failsafe: `failsafe_procedure = DROP` (the default) is right for a 25 g whoop. Other defaults as in quad5.md 5.8.
- Arming-disable flags in 2026.6.2, display names [16]: `NOGYRO, FAILSAFE, RXLOSS, NOT_DISARMED, BOXFAILSAFE,
  RUNAWAY, CRASH, THROTTLE, ANGLE, BOOTGRACE, NOPREARM, LOAD, CALIB, CLI, CMS, BST, MSP, PARALYZE, GPS, RESCUE_SW,
  DSHOT_TELEM, REBOOT_REQD, DSHOT_BBANG, NO_ACC_CAL, MOTOR_PROTO, FLIP_SWITCH, ALT_HOLD_SW, POS_HOLD_SW,
  AUTOPILOT_SW, ARM_SWITCH`.
- The flags a whoop pilot meets most:

  | Flag | Cause |
  |---|---|
  | `RXLOSS` | ELRS not bound |
  | `THROTTLE` | throttle not low |
  | `ANGLE` | tilted more than `small_angle` (0-180, default 25 deg), e.g. landed on a cushion, or upside down without turtle |
  | `MSP` | USB plugged in |
  | `DSHOT_TELEM` | an ESC is not answering bidirectional DShot |
  | `FLIP_SWITCH` | after a turtle flip with auto re-arm OFF |
  | `ARM_SWITCH` | arm switch already on |
- Accelerometer: level surface, Setup tab "Calibrate Accelerometer", or the stick command throttle high + yaw left
  + pitch down while disarmed (quad5.md 5.12). There is no compass to calibrate.

## 6. Safety tests

| Test | How | Tool | What it catches |
|---|---|---|---|
| Smoke stopper | An inline current limiter (PTC fuse, incandescent bulb or electronic limiter) in the battery lead for the first power-up; it limits a short to about 1-3 A so nothing burns. On a factory BNF whoop it is rarely used, and BT2.0 smoke stoppers are uncommon (unverified). The original skips it (`noSmoke`), which is reasonable for plug-and-play parts | inline device | shorts, solder bridges, reversed polarity on a re-soldered pigtail |
| Props-off motor test | Props OFF, battery in, Betaflight App Motors tab, accept the warning, raise each slider a little; check M1-M4 positions and spin directions against 2.2 | Betaflight App Motors tab | wrong socket order, wrong spin, a dead ESC channel, a bad motor plug |
| Receiver test | Receiver tab: sticks and switches move the right channels | Receiver tab | channel map, arm/turtle switch |
| Board alignment | tilt the whoop; the Setup tab 3D model must follow | Setup tab | AIO mounted rotated |
| Accelerometer calibration | level surface, Calibrate Accelerometer | Setup tab | drift in Angle mode |
| Pre-arm check | `status` in the CLI, or the Setup tab, shows the arming-disable flags | CLI / Setup tab | see 5.8 |
| VTX antenna check | antenna fitted before power-up, or VTX power 0 / PIT | eyes | burnt VTX [5] |
| Turtle test | upside down on the floor, turtle switch on, arm, push pitch: it must flip | bench | wrong mode channel; analog protocol (turtle needs DShot) |

## 7. Flight characteristics (65 mm 1S, typical)

| Quantity | Typical value | Notes |
|---|---|---|
| AUW | 25-31 g | Air65 + 300 mAh about 25.6 g; Meteor65 + 300 mAh about 31.1 g [1][2][5] |
| T:W | 4-6.4 : 1 | Air65 Freestyle 5.26, Racing 5.82, Champion 6.4; Air65 II Champion 6.3 [1][7] |
| Hover throttle | 30-35 % on a fresh pack | [6] |
| Hover current | about 2-3 A (unverified) | |
| Full-throttle current | about 15 A (25000 KV) to 29 A (36000 KV) | 4 x the per-motor maximum [5]; ESC 5 A/ch (12 A on 5IN1 II) |
| Flight time | about 4 min mixed flying (spec) [1][2]; 3:40-4:30 at 50-60 % throttle [6]; gentle hover about 5-7 min (unverified) | |
| Top speed | about 30-50 km/h (unverified) | |
| Motor out | no redundancy: it spins and drops | |

**1S voltage sag in reality (the original's model was wrong):** the whole path (cell, BT2.0 plug, leads, AIO) has
roughly 40-70 mOhm of resistance (unverified estimate). BETAFPV's own test shows the connector alone is worth
**0.2 V at 9 A** (PH2.0 vs BT2.0) [2]. At 10-15 A the sag is therefore about **0.4-1.0 V**: a fresh 4.35 V LiHV pack
reads about 3.4-3.9 V during a punch and springs back when the throttle comes off. Sag grows as the pack empties,
gets cold or ages. That is why the original's quiz ("4.1 V to 3.4 V, then recovers") is right and its simulation
is wrong: it modelled 0.002 V/A, then halved it again, giving 0.017 V of sag at full throttle [21]. For SimLab:
V = OCV(state of charge) - I x R with R about 0.05 Ohm (unverified), R rising as the pack drains, and a brown-out
when V under load falls below about 3.0 V (unverified threshold).

## 8. Real failure modes

| Failure | Cause | What the pilot sees |
|---|---|---|
| Desync | high KV on too much voltage, a bent bell, a worn bushing, ESC timing | one motor stutters; the whoop tumbles |
| Brown-out | 1S sag on a punch with an old pack or a worn BT2.0 contact | video goes black or rolls, the OSD resets, the receiver drops, the whoop falls |
| Reversed motor / wrong prop | wrong ESC direction, or a CW prop on a CCW motor | flips on take-off, or yaw-spins at arming throttle |
| Wrong board alignment | AIO arrow not forward | instant flip on take-off |
| Wrong motor order | plugs in the wrong sockets | flips on take-off |
| Hair or carpet fibre round a motor shaft | indoor flying | hot motor, weak motor, drift; clean the shaft |
| Cracked duct, bent prop | crashes | vibration, jello, oscillation |
| Prop wash | descending through its own wash | wobble on descent |
| VTX overheating or no antenna | 400 mW on the bench, powered without an antenna | video fades; the VTX is damaged [5] |
| Over-discharge | flying below 3.0 V under load [5] | puffed pack, lost capacity |
| Turtle mode missing | motor protocol not DShot | no `FLIP OVER AFTER CRASH` in the Modes tab [14] |
| Can't re-arm after turtle | auto re-arm OFF, `FLIP_SWITCH` flag | must disarm, then re-arm [13] |
| ESC flashing gone wrong | flashing Bluejay too quickly in a row | a stalled ESC, possibly a burnt FC [5] |
| GPS / compass errors | n/a | no GPS or compass on a whoop |

## 9. Uncertainties

- BETAFPV does not state the battery included in its T:W claims, so the per-motor thrust derived from them is
  approximate. The per-motor max thrust (GF 1219S-3) is BETAFPV's own figure and is the better number.
- No published hover current, internal resistance or top speed: the hover current, sag/R model and top speed are
  estimates (unverified).
- Camera position and prop-plane height in the craft frame are estimates (unverified). Duct size, frame size,
  motor mounting and the FC hole pattern are verified [5].
- (Removed: the earlier claim that the Air Brushless FC (5IN1) is a renamed Matrix 1S FC is false. BETAFPV lists them
  as separate boards: Air 5IN1 3.6 g, 0.8 mm PCB, no motor connectors; Matrix 3.92 g, 1.0 mm PCB, JST1.25 sockets.
  Both run the `BETAFPVG473` target.)
- The factory props-in/props-out setting per product, the camera wire colours, the BEC topology (boost) and the
  absence of an electrolytic capacitor are unverified.
- The GF 1219S pitch (1.9 in) is from retailers, not Gemfan.
- Duct figures disagree between BETAFPV pages: the Air65 frame page gives duct diameter 34.9 mm (Air65) / 34 mm
  (Meteor65) and height 14.5 / 16 mm; the Air65 II frame page gives 33 / 32.3 mm and 3.8 / 4 mm (probably a
  different measurement, e.g. the inner lip diameter and the rim thickness). For a figure, trust the first set (a
  31 mm prop needs a duct over 31 mm, and a 14-16 mm tall duct matches photos); the second set is unexplained.
- BETAFPV pole count is not published; 12 poles is verified for the Mobula6 SE0702 and the NewBeeDrone 0702 [4][9].

## Verification

Adversarial fact-check, 2026-10-24 (14:10-14:30 CDT). Sources were opened directly: BETAFPV product JSON
(`https://betafpv.com/products/<handle>.json`), the Betaflight config repo, the Betaflight 2026.6.2 source tree, the
Happymodel page and Oscar Liang's review.

| # | Claim | Status | Source | Old -> new (corrections) |
|---|---|---|---|---|
| 1 | BETAFPVG473 motor pins M1 PB0, M2 PB1, M3 PB6, M4 PC13 | confirmed | https://raw.githubusercontent.com/betaflight/config/master/configs/BEFH/BETAFPVG473/config.h | |
| 2 | LED0 PC15, LED1 PC14, LED strip PB2, beeper PA8 | confirmed (LED active level not stated in target: unverified) | same config.h | added `BEEPER_INVERTED` |
| 3 | UART pins (1 PA9/PA10, 2 PA2, 3 PB10/PB11, 4 PC10/PC11), I2C1 PA15/PB7, ADC VBAT PA0 / CURR PA1 | confirmed | same config.h | added UART2 RX PA3 |
| 4 | Target defaults: SERIALRX USART3 + CRSF, SmartAudio USART2, current meter ADC, scale 750, `GYRO_1_ALIGN CW180_DEG` | confirmed | same config.h | added SPI/CS map, `FC_TARGET_MCU STM32G474`, `SYSTEM_HSE_MHZ 0` |
| 5 | Air65's "Air Brushless FC (5IN1)" has the same spec as the Matrix 1S 5IN1 (rename) | corrected (claim removed) | https://betafpv.com/products/matrix-1s-brushless-flight-controller ; BETAFPV catalogue `air-brushless-flight-controller` | "same board, renamed" -> separate board: Air 5IN1 3.6 g, 0.8 mm PCB, motor wires soldered (no connectors); Matrix 3.92 g, 1.0 mm PCB, JST1.25 sockets |
| 6 | Matrix 5IN1: STM32G473CEU6, ICM42688P (BMI270 from 5 Jan 2026), 5 A / 8 A peak, Bluejay `A_X_5_96KHz_V0.19`, BEC 5 V 3 A, UART2 VTX / UART3 RX, AT7456E, 26 x 26 mm, 3.92 g, factory BF 4.5.0 | confirmed | https://betafpv.com/products/matrix-1s-brushless-flight-controller | |
| 7 | Separate M03 VTX adds about 0.8 g ("Matrix + M03 = 4.74 g") | corrected | same page, comparison table | 4.74 g is **F4 1S 5A AIO + M03**, so M03 adds about 1.6 g over 3.13 g |
| 8 | F4 1S 5A AIO gyro | corrected | same comparison table; https://betafpv.com/products/f4-1s-5a-aio-brushless-flight-controller | "(unverified)" -> BMI270; ESC firmware `O_H_5_48_REV16_8`; 8 MB blackbox |
| 9 | Blackbox "16 MB" | confirmed as BETAFPV's figure; byte vs bit unverified | Matrix page; config.h (`USE_FLASH_M25P16`) | noted possible 16 Mbit |
| 10 | Matrix 5IN1 II: 12 A / 18 A, 4.1 g, gyro list, factory `4.5.3 BETAFPVG473_V2`; `_V2`/`_V3` targets exist | confirmed | BETAFPV catalogue `matrix-1s-5in1-ii-brushless-flight-controller`; https://github.com/betaflight/config/tree/master/configs/BEFH | added 3.76 g solder-required version |
| 11 | Air65 II: removing the front grommet cut FC damage by about 80 % | corrected | https://betafpv.com/products/air65-ii-brushless-whoop-quadcopter | -> 3-point mount "lowering the damage rate by up to 80 %"; which grommet was removed is not stated |
| 12 | Air65: 17.3 g, 0702SE II 27000/23000 KV, GF 1219S 3B / HQ 31 mm Ultralight, T:W 5.82/5.26, Champion 6.4, 4 min on LAVA 260 (4.35-3.3 V) | confirmed | https://betafpv.com/products/air65-brushless-whoop-quadcopter | |
| 13 | Air65 frame: PP, 2.67 g, 3-M1.4-6.6 mm, 26 x 26 mm, slot 11.6 x 6.0 mm, duct 34.9 / 14.5 mm, camera 25-50 deg | confirmed | https://betafpv.com/products/air65-brushless-whoop-frame | Meteor65 duct flagged: table 34 mm vs text "from 32mm" |
| 14 | Air65 II frame: 2.65 g, 25.5 x 25.5 mm, 82.6 x 82.6 x 15.1 mm | confirmed | https://betafpv.com/products/air65-ii-brushless-whoop-frame | slot there is 11.4 x 6.2 mm |
| 15 | Meteor65: 22.83 g, 0802SE 19500 KV 1.88 g, frame 3.25 g, canopy 1.60 g, tilt 30/20 deg, M03 25-350 mW, BT2.0 vs PH2.0 at 9 A 0.2 V | confirmed | https://betafpv.com/products/meteor65-brushless-whoop-quadcopter-1s | wording changed to BETAFPV's "double the time (about 2 minutes)" |
| 16 | Mobula6 2024 V3: 17.6 g, 81 x 81 x 37 mm, SE0702 28000 KV 9N12P 1.46 g, 9.5 x 14 mm, Gemfan 1208-3 0.21 g, G473CEU6, 5 A/6 A, Bluejay 0.21, RX UART3, VTX UART4 SA 2.1, 155 deg, A30 | confirmed | https://www.happymodel.cn/index.php/2025/12/11/mobula6-2024-v3-1s-65mm-ultra-light-micro-fpv-whoop/ | |
| 17 | 0702SE II / 0702 II thrust (32 / 35.4 / 37.2 g on GF 1219S-3), weights 1.45 / 1.47 / 1.55 g, 1S input; 0702 (2026) 3.86 / 6.03 / 7.17 A | confirmed | https://betafpv.com/products/0702-ii-brushless-motors ; https://betafpv.com/products/0702-brushless-motors-2026 | 2026 page lists 1.59 g (Champion) and 1.50 g |
| 18 | BT2.0 300 mAh: 8.28 g, 67.3 x 11.8 x 6.1 mm, 4.35 V, $23.99 per 8 | confirmed | https://betafpv.com/products/bt2-0-300mah-1s-30c-battery-8pcs | |
| 19 | QuadX order M1 RR, M2 FR, M3 RL, M4 FL; props-in default (`yaw_motors_reversed` default 0); M1/M4 CW, M2/M3 CCW | confirmed (spin derived from the props-in definition) | https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/mixer_init.c | |
| 20 | `motor_idle` default 550 (range 0-2000), `motor_poles` default 14 (4-255), `dshot_bidir`, `DSHOT300` | confirmed | https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/pg/motor.c ; cli/settings.c | |
| 21 | Battery-profile values, range 100-500, defaults max 430 / full 410 / warning 350 / min 330 / capacity 0; `current_meter` NONE/ADC/VIRTUAL/ESC/MSP | confirmed | https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/sensors/battery.c ; battery.h; current.c | |
| 22 | Crash flip: ID 35 "FLIP OVER AFTER CRASH", DShot only; `crashflip_motor_percent` 0-100 / 0, `crashflip_rate` 0-250 / 0 (x10 deg/s), `crashflip_auto_rearm` OFF (RACE_PRO 30 / ON); 15 % stick, 2 % motor deadband; upright check skipped; `FLIP_SWITCH` | confirmed | msp/msp_box.c, flight/mixer.c, fc/core.c, fc/runtime_config.c at tag 2026.6.2 | |
| 23 | `rpm_filter_harmonics` 0-3 / 3, `rpm_filter_min_hz` 30-200 / 100, weights default 100,100,100; `angle_limit` 10-80 / 60; level P 50; `small_angle` 0-180 / 25 | confirmed | pg/rpm_filter.c, cli/settings.c, flight/pid.c, flight/imu.c at 2026.6.2 | |
| 24 | `serial` function bits 64 = RX_SERIAL, 2048 = VTX_SMARTAUDIO; `aux` argument order | confirmed | io/serial.h, cli/cli.c at 2026.6.2 | |
| 25 | Releases: 2026.6.2 (2026-09-16), 2026.6.1 (2026-08-02), 2025.12.5 (2026-06-28) | confirmed | https://api.github.com/repos/betaflight/betaflight/releases | |
| 26 | Oscar Liang Air65: Bluejay 0.19 96 kHz, A-X-5, hover 30 % (Racing) / 35 % (Freestyle), 4:00 / 3:40 / 2:50, scale 750 -> 720, weights 100,60,0, angle 75-90, min 3.0 / warn 3.2 V, BF 4.5.0 | confirmed | https://oscarliang.com/betafpv-air65/ | |

