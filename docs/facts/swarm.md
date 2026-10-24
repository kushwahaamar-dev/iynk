# Fact sheet: Bitcraze Crazyflie 2.1 / 2.1+ swarm (Drone Lab Fig. 11, `swarm`)

Status: written 2026-10-24 from Bitcraze datasheets, the Bitcraze store, and the source code of
crazyflie-firmware 2026.08 and crazyflie-lib-python (cflib) 0.1.34. Anything marked "(unverified)" could not be
checked against a primary source in the time box. Firmware facts come from source code first, docs second.

## 0. Header

**Craft class:** nano quadcopter (sub-30 g), brushed coreless motors driven by on-board MOSFETs, PCB-as-frame, 1S
LiPo, flown autonomously from Python (cflib) over a 2.4 GHz USB radio, positioned indoors by decks (optical flow or
Lighthouse) rather than GPS.

**Real products / reference builds it represents:**

| Reference | What it is | Link |
|---|---|---|
| Bitcraze Crazyflie 2.1+ (current, 2024-08 on) | Kit: 2.1 control board + 250 mAh LiPo + 47-17 props, 29 g, US$240 [1][3][20] | https://www.bitcraze.io/products/crazyflie-2-1-plus/ |
| Bitcraze Crazyflie 2.1 (discontinued 2024-08-19) | Same board, 45 mm "legacy" props, 29 g per datasheet rev 3 [2][3] | https://www.bitcraze.io/products/old-products/crazyflie-2-1/ |
| Bitcraze "Lighthouse swarm bundle" style setup | N x Crazyflie 2.1+ each with a Lighthouse deck, 2+ SteamVR Base Station 2.0, one Crazyradio 2.0, cflib `Swarm` [8][9][10] | https://www.bitcraze.io/documentation/system/positioning/ligthouse-positioning-system/ |

Not to be confused with the **Crazyflie 2.1 Brushless** (2024, separate product, brushless motors + ESCs, own
firmware build `cf21bl`): its motors, props and battery are NOT interchangeable with the 2.1/2.1+ [4][20].

**What it is and what it is for.** The Crazyflie is an open-source research and teaching nano quad. Its 92 mm X-shaped
printed circuit board *is* the frame: copper layers carry power and signals, plastic motor mounts clip onto the four arm
tips and double as landing legs. An STM32F405 runs the estimator (complementary or extended Kalman filter) and the
controllers (PID, Mellinger, INDI, Brescianini, Lee); an nRF51822 runs the radio link and power management. Expansion
"decks" stack on the two 2 x 10 pin headers and are detected automatically by a 1-wire ID chip: the Flow deck v2
(underneath) gives height and velocity over a textured floor; the Lighthouse deck (on top) times the infrared sweeps of
SteamVR base stations so each drone computes its own absolute position. Because every drone knows its position in one
shared frame, a laptop with one Crazyradio can send high-level commands (take off, go to, trajectory) to a whole
swarm; labs use it for swarming, planning and control research.

## 1. Sources

Primary (manufacturer datasheets, store, firmware and library source):

1. Crazyflie 2.1+ datasheet rev 1 (2024-06-19): https://www.bitcraze.io/documentation/hardware/crazyflie_2_1_plus/crazyflie_2_1_plus-datasheet.pdf
2. Crazyflie 2.1 datasheet rev 3 (2021-11-15): https://www.bitcraze.io/documentation/hardware/crazyflie_2_1/crazyflie_2_1-datasheet.pdf
3. Bitcraze blog "Introducing the new Crazyflie 2.1+" (2024-08-19): https://www.bitcraze.io/2024/08/introducing-the-new-crazyflie-2-1/
4. Propellers 47-17 product page: https://www.bitcraze.io/products/propellers-47-17/
5. 250 mAh LiPo battery datasheet rev 1: https://www.bitcraze.io/documentation/hardware/250mah_battery/250mah_battery-datasheet.pdf
6. 350 mAh LiPo battery (store page, specs in description): https://store.bitcraze.io/products/350mah-lipo-battery
7. 4 x 7 mm DC-motor pack (7x16, store page with specs): https://store.bitcraze.io/products/4-x-7-mm-dc-motor-pack-for-crazyflie-2
8. Flow deck v2 datasheet rev 1: https://www.bitcraze.io/documentation/hardware/flow_deck_2/flow_deck_2-datasheet.pdf
9. Lighthouse positioning deck datasheet rev 3: https://www.bitcraze.io/documentation/hardware/lighthouse_deck/lighthouse_deck-datasheet.pdf
10. Crazyradio 2.0 datasheet rev 1: https://www.bitcraze.io/documentation/hardware/crazyradio_2_0/crazyradio_2_0-datasheet.pdf
11. 4 x 7x20 mm DC-motor (thrust upgrade) datasheet rev 1: https://www.bitcraze.io/documentation/hardware/motor_4x_7x20mm/motor_4x_7x20mm-datasheet.pdf
12. Bitcraze blog "Thrust upgrade kit for the Crazyflie 2.1" (2022-10): https://www.bitcraze.io/2022/10/thrust-upgrade-kit-for-the-crazyflie-2-1/
13. crazyflie-firmware releases (2026.08, 2026-08-20): https://github.com/bitcraze/crazyflie-firmware/releases
14. crazyflie-release bundles (2026.10, 2026-10-16, asset `firmware-cf2-2026.10.zip`): https://github.com/bitcraze/crazyflie-release/releases
15. Firmware platform defaults (ARM_LENGTH, CF_MASS, thrust fits, battery thresholds): https://github.com/bitcraze/crazyflie-firmware/blob/2026.08/src/platform/interface/platform_defaults_cf2.h
16. Firmware mixer: https://github.com/bitcraze/crazyflie-firmware/blob/2026.08/src/modules/src/power_distribution_quadrotor.c
17. Firmware `stabilizer.controller` / `stabilizer.estimator` params: https://github.com/bitcraze/crazyflie-firmware/blob/2026.08/src/modules/src/stabilizer.c and `controller/controller.c`, `estimator/estimator.c` (same tag)
18. Firmware supervisor (arming, watchdog, tumble/crash): https://github.com/bitcraze/crazyflie-firmware/blob/2026.08/src/modules/src/supervisor.c , `src/modules/interface/supervisor_state_machine.h`, docs `docs/functional-areas/supervisor/arming.md`
19. Firmware deck drivers: `src/deck/drivers/src/flowdeck_v1v2.c`, `zranger2.c`, `lighthouse.c`; `src/modules/src/range.c`; `src/modules/src/lighthouse/lighthouse_core.c`; `src/drivers/src/motors.c`, `src/drivers/interface/motors.h`; `src/modules/src/health.c`; `src/hal/src/pm_stm32f4.c`; `src/modules/src/commander.c` (all at tag 2026.08)
20. Bitcraze store prices (Shopify JSON, currency USD, read 2026-10-24): https://store.bitcraze.io/products/crazyflie-2-1-plus (and the flow-deck-v2, lighthouse-positioning-deck, crazyradio-2-0, 250mah-lipo-battery, 350mah-lipo-battery product pages)
21. cflib 0.1.34 (2026-09-30) source: https://github.com/bitcraze/crazyflie-lib-python/tree/0.1.34 , files `cflib/crazyflie/swarm.py`, `high_level_commander.py`, `supervisor.py`, `platformservice.py`, `syncCrazyflie.py`, `cflib/positioning/motion_commander.py`, `cflib/utils/reset_estimator.py`
22. cflib official examples at 0.1.34: `examples/step-by-step/sbs_swarm.py`, `examples/autonomy/motion_commander_demo.py`, `examples/autonomy/autonomous_sequence_high_level.py`, `examples/logging/basiclog_sync.py`
23. cfclient 2026.8.1 `pyproject.toml` (entry points `cfclient`, `cfloader`) and `src/cfloader/__init__.py`: https://github.com/bitcraze/crazyflie-clients-python/tree/2026.8.1
24. Getting started with the Crazyflie 2.X (LEDs, front, props, self-test): https://www.bitcraze.io/documentation/tutorials/getting-started-with-crazyflie-2-x/
25. Getting started with the Flow deck (height range 0.2-3.0 m, surface): https://www.bitcraze.io/documentation/tutorials/getting-started-with-flow-deck/
26. Lighthouse positioning system overview (accuracy, base stations, FOV, range): https://www.bitcraze.io/documentation/system/positioning/ligthouse-positioning-system/

Secondary:

27. Seeed/Digi-Key copy of the Bitcraze 7x16 motor spec (SKU 316030060): https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/2291/316030060_Web.pdf
28. Bitcraze forum, flow deck height (moderator: 4 m "theoretical", depends on texture/light): https://forum.bitcraze.io/viewtopic.php?p=20784
29. Bitcraze blog, Crazyradio 2.0 swarm-optimised firmware 5.1 (2025-12): https://www.bitcraze.io/2025/12/new-crazyradio-2-0-swarm-optimized-firmware-5-1/
30. Crazyflie 2.0 datasheet ("only weighs 27g", end-of-life): https://www.bitcraze.io/documentation/hardware/crazyflie_2_0/crazyflie_2_0-datasheet.pdf

## 2. Geometry (craft frame)

Craft frame: x forward (nose), y left, z up, origin at the frame centre on the top face of the PCB (the PCB is the
"bottom plate"), units mm. This matches the Crazyflie firmware body frame (x forward, y left, z up) [16].

**Front.** The front is the side with the small antenna "bump"; the two blue LEDs are at the back [24].

### 2.1 Frame

| Item | Value | Source |
|---|---|---|
| Overall size W x H x D | 92 x 92 x 29 mm (motor-to-motor, including motor-mount feet) | [1][2] |
| Wheelbase (motor-to-motor diagonal) | 92 mm (2 x ARM_LENGTH = 2 x 46 mm) | [1][15] |
| Centre-to-motor (ARM_LENGTH) | 46 mm | [15] `#define ARM_LENGTH 0.046f` |
| Motor-to-neighbour (side of square) | 65.05 mm (46 x sqrt 2) | derived [15] |
| Frame | One X-shaped PCB (FR4 assumed, unverified); no carbon plates, no stack | [1] |
| PCB thickness | (unverified) about 1 mm; the original drew 1.2 mm | - |
| Centre body / arm width | (unverified) the original draws a 32 x 32 mm centre and 6.8 mm-wide arms | research doc |
| Expansion headers | Two rows of 10 pins (left and right side), carry VCC 3.0 V, GND, VCOM, VUSB, I2C, SPI, 2 x UART, 4 x GPIO/CS, 1-wire, 2 x nRF51 GPIO; **2 mm pin spacing**, 0.5 mm pins | [1][20] |
| Deck mounting | Decks plug onto the headers: short male connectors for one deck, long male connectors to stack above and below (kit ships 2 short + 2 long). Store "Long Pins (19+2+4mm)": 10 positions, 2 mm spacing, 19 mm pin above / 2 mm plastic / 4 mm below, 0.6 g each, for two decks on top and one below [20] | [1][20] |
| Motor mounts | Plastic, push onto the arm tips; legs are the landing gear; kit ships 6 (2 spare) | [1] |
| Takeoff mass (2.1 and 2.1+, stock battery, no decks) | 29 g | [1][2] |
| Mass used by firmware | `CF_MASS 0.029f` kg (32.5 g with thrust upgrade kit build option) | [15] |
| Max recommended payload | 15 g | [1] |

### 2.2 Motor positions, numbering and spin (firmware default)

Numbering is clockwise seen from above, starting front-right [16]. Positions are derived from ARM_LENGTH = 46 mm on
the 45 deg diagonals: 46 x cos 45 = 32.5 mm [15].

| Motor | Position | x (mm) | y (mm) | Spin seen from above | Prop to fit |
|---|---|---|---|---|---|
| M1 | front-right | +32.5 | -32.5 | CCW | 47-17 (CCW) [4]; legacy 45 mm: "B" marking [24] |
| M2 | rear-right | -32.5 | -32.5 | CW | 47-17R (CW) [4]; legacy: "A" marking [24] |
| M3 | rear-left | -32.5 | +32.5 | CCW | 47-17 (CCW) |
| M4 | front-left | +32.5 | +32.5 | CW | 47-17R (CW) |

How this was verified: the force/torque mixer in `power_distribution_quadrotor.c` [16] is

```
motorForces[0] (M1) = thrust - roll - pitch - yaw
motorForces[1] (M2) = thrust - roll + pitch + yaw
motorForces[2] (M3) = thrust + roll + pitch - yaw
motorForces[3] (M4) = thrust + roll - pitch + yaw
```

With x forward / y left / z up, a positive roll torque needs less thrust on the right (M1, M2), a positive pitch torque
(nose down) less on the front (M1, M4), and a positive (CCW) yaw torque more on the CW-spinning props (M2, M4). The
Bitcraze prop page independently says CCW props go on M1 and M3, CW on M2 and M4 [4]. The original's motor order
(M1 FR CCW, M2 RR CW, M3 RL CCW, M4 FL CW) is correct.

**Alternative ("props-out") direction:** none. The Crazyflie firmware has no reversed-props option, and brushed
motors are not reversed in software; direction is fixed by the polarity of each motor connector on the PCB. The
Bitcraze guide says "It's not important which motor you put where" [24]: all four 7x16 motors are identical, and the
board makes M1/M3 turn CCW and M2/M4 CW. The only user mistake is fitting the wrong prop type on a motor.

**Prop identification:** on the 2.1+, CW props are marked "47-17R" and CCW props "47-17"; on the old 45 mm props, CW
are "A/A1/A2" and CCW are "B/B1/B2". The sharper corner of the blade tip is the trailing side, and the convex face
goes up [24].

### 2.3 Props, battery, decks, mass budget

| Item | Value | Source |
|---|---|---|
| Stock prop (2.1+) | 47-17: 47 mm diameter, 17 mm pitch, 2 blades, PC, 0.3 g, fits 0.8 mm shaft | [4] |
| Legacy prop (2.1) | 45 mm, 2 blades, fits 0.8 mm shaft; "not the stock propeller delivered with the Crazyflie 2.1+"; pitch and mass (unverified) | [20] |
| Prop tip clearance between neighbours | 65.05 - 47 = 18 mm (2.1+); 20 mm with 45 mm props | derived |
| Motor | 7 x 16 mm coreless brushed, 0.8 mm x 3.5 mm shaft, 2.7 g each (with 32 mm wires and Molex PicoBlade 2P) | [7] |
| Battery | 250 mAh 1S LiPo, 7.1 g, 20 x 7 x 30 mm (W x H x D), 20 mm cable, Molex 51005-2P | [5] |
| Battery position | On top of the PCB, between the two header rows; held by the battery holder deck (on the headers) and a foam pad [1][24]. With a top deck (Lighthouse) on long headers it sits sandwiched between the PCB and the deck (unverified, standard Bitcraze photos) | [1][24] |
| Flow deck v2 | Under the PCB, 21 x 28 x 4 mm, 1.6 g; sensors look straight down | [8] |
| Lighthouse deck | On top, 27 x 39 x 3.5 mm, 2.7 g, 4 TS4231 IR receivers, ICE40UP5K FPGA, about 30 mA | [9] |
| Camera | None. No FPV camera; "FPV" in the simulator is a virtual view (the AI-deck is an optional camera deck, not part of this build) | - |
| Battery holder deck | 28 x 28 x 4 mm, 0.4 g, sits on the short header pins over the battery | [20] |
| Mass budget (stock 2.1+, no decks) | 29 g = battery 7.1 + 4 motors 10.8 + 4 props 1.2 + holder deck 0.4 + PCB, mounts, short pins and pad ~9.5 (by difference) | [1][4][5][7][20] |
| Swarm build AUW | 29 + Flow 1.6 + Lighthouse 2.7 + 2 long pin strips 1.2 = about 34.5 g (minus the short pins they replace, not weighed). Normally a swarm drone carries Lighthouse only (~32 g); Flow is for single-drone hover | derived |

## 3. The original's catalogue, sanity-checked

Numbers stay as in the original calculator; this table only says where they are untrue and gives the real figure.
Prices are Bitcraze store prices in USD on 2026-10-24 [20].

### 3.1 Batteries

| key | Original (mAh / g / $) | Real-world check | Verdict |
|---|---|---|---|
| `1s250` (stock) | 250 / 7.1 / 8 | Bitcraze 250 mAh: 7.1 g, 15C, 3.7 V, $6.50 [5][20]. The 2.1+ blog says the kit battery became "1 gram lighter with the same performance and capacity" [3], so a 2.1+ cell may be about 6.1 g (unverified; the 2.1+ datasheet still says 250 mAh) | OK |
| `1s350` | 350 / 9.6 / 10 | Bitcraze 350 mAh (Tattu cell): 9.1 g, 20 x 8 x 33 mm, 15C cont / 30C burst, $12; "hover-time above 10 min"; about 1 mm thicker, may need long (>= 9 mm) headers with decks [6] | Plausible; real is 0.5 g lighter and Bitcraze claims >10 min hover vs the calculator's ~8.9 min |
| `1s450` | 450 / 12.5 / 11 | No Bitcraze 450 mAh pack exists. Generic 1S 450 mAh packs weigh about 11-13 g and are larger than the 20 x 30 mm slot between the headers (both unverified) | Mass plausible, fit doubtful; not an official option |

### 3.2 Motors

| key | Original (KV / g / $) | Real-world check | Verdict |
|---|---|---|---|
| `7x16` (stock) | 14000 / 1.6 / 4 | Bitcraze 7x16: Kv 14 000 rpm/V, rated 4.2 V / 1000 mA, **2.7 g** each, single motor $4.00 or $12.00 per 4 [7][20][27] | KV right, price right; **mass wrong** (2.7 g, not 1.6 g) |
| `7x16hp` "thrust upgrade" | 15500 / 1.7 / 6 | No such Bitcraze part. The real Bitcraze thrust upgrade is a **7 x 20 mm** motor: Kv 13 000 rpm/V (+-15 %), 3.4 V rated, 2.6 A max, 0.75 ohm, 3.6 g, **1 mm shaft**, used with 51 mm HQ props; gives ~80 g max thrust vs ~60 g stock, hover time ~7:00 -> ~6:00 [11][12] | Description untrue: a "7x16 at 15500 KV" is not a real Crazyflie option |
| `8x20` | 12500 / 3.4 / 6 | 8.5 x 20 mm ("8520") brushed motors exist for larger toy quads (mass about 5-6 g, unverified); they do not fit the 7 mm mounts (true). "Draw more than the board's MOSFETs are rated for": MOSFET rating unverified; note the board does drive the 2.6 A 7x20 upgrade motor [11] | Mount-fit warning true; MOSFET claim unverified; 3.4 g is light for an 8520 (unverified) |

### 3.3 Props

| key | Original (pf / eff / g / $) | Real-world check | Verdict |
|---|---|---|---|
| `45mm` (stock) | 1 / 1 / 0.3 / 2 | Stock on the Crazyflie 2.1 (now "legacy propellers" in the firmware, build option `CONFIG_CRAZYFLIE_LEGACY_PROPELLERS`) [15]; 45 mm, 0.8 mm shaft; spare pack of 4 CW + 4 CCW $6.50 [20]; mass about 0.3 g (unverified) | OK for a 2.1; **not stock on a 2.1+** |
| `47mm` "thrust props" | 1.12 / 0.93 / 0.35 / 3 | Bitcraze 47-17: 0.3 g, pack of 4 CW + 4 CCW $6.00 [20]; "Both flight time and maximum thrust is increased with up to 15 %" [4]; it is the **stock** prop of the 2.1+ [1][3] | **Efficiency direction wrong**: the real 47-17 is more efficient (flight time up), not 7 % less; mass 0.3 g, not 0.35 g |

### 3.4 Fixed parts

| id | Original (g / $) | Real-world check | Verdict |
|---|---|---|---|
| `FRAME` "PCB + motor mounts" | 9.5 / 195 | The bare control board is not sold alone in this form; the 2.1+ kit (board, battery, 4+1 motors, mounts, props, holder deck, headers) is **$240** [20]. ~9.9 g for PCB + mounts + holder deck by mass difference (derived) | Mass plausible; price is an approximation of a kit share |
| `FLOW` Flow deck v2 | 1.6 / 50 | 1.6 g, **$55** [8][20] | Mass right, price low |
| `DECKL` Lighthouse deck | 1.8 / 75 | **2.7 g**, **$95**, 27 x 39 mm (not 30 x 30) [9][20] | Mass and price wrong |
| `HDR` long pin headers | 0.6 / 4 | Kit includes 2 long + 2 short male deck connectors [1]; store Long Pins: 0.6 g and $2.00 **each**, two needed (1.2 g, $4) [20] | Price right; mass is one strip, the build needs two |
| `RADIO` Crazyradio 2.0 | 0 / 35 | 7 g (stays on the laptop, so 0 g on the drone is right), **$43**, nRF52840, 20 dBm PA + LNA, RP-SMA 2 dBi duck antenna [10][20] | Price low; the dongle has a screw-on antenna, not a stub |
| `STRAP` velcro battery strap | 0.2 / 1 | The Crazyflie has **no strap**: the battery sits between the headers under the battery holder deck on a foam pad [1][24] | Part does not exist on the real craft |

### 3.5 Calculator outputs vs reality (default `1s250 / 7x16 / 45mm`)

| Output | Original | Real (best source) |
|---|---|---|
| AUW | 28.4 g (lesson says 27 g) | **29 g** stock [1][2]; ~32 g with Lighthouse, ~34.5 g with Flow + Lighthouse on long pins (derived). 27 g is the **Crazyflie 2.0** figure [30] |
| Max thrust | 13.4 g/motor, 53.6 g total | ~60 g total for the stock 2.1 (45 mm), per Bitcraze [12]; 2.1+ props up to +15 % (~69 g, derived) [3][4]. Firmware caps normalised thrust at `THRUST_MAX 0.12f` N = 12.2 g per motor (2.1+ and legacy) and 0.18 N with the upgrade kit [15] |
| T:W | 1.89 | ~2.1 (60 g / 29 g) for a bare 2.1; ~1.8 with both decks (derived) |
| Hover current | 1.74 A | ~2.1 A: 250 mAh in 7 min is 2.1 A mean [1]; Bitcraze measured ~3.8 g/W at hover (~2.3 A for 33 g) [12]. The original's own live readout says 2.1 A |
| Hover time | 6.9 min | **7 min** stock (datasheet) [1] |
| Hover throttle | 73 % | ~55-65 %: the velocity PID's base thrust is 36000/65535 = 55 % [15] (`PID_VEL_THRUST_BASE 36000`); the 2.1+ thrust fit needs ~2.4 V at the motor for 29 g, ~65 % of a 3.7 V cell (derived from [15]) |

## 4. Electronics and wiring

### 4.1 Flight controller (it is the whole board)

| Item | Value | Source |
|---|---|---|
| Main MCU | STM32F405 (Cortex-M4, 168 MHz, 192 kB SRAM, 1 MB flash): estimator, controllers, decks | [1] |
| Radio / power MCU | nRF51822 (Cortex-M0, 32 MHz, 16 kB SRAM, 128 kB flash): 2.4 GHz radio, BLE, power switch, charger | [1] |
| IMU | Bosch BMI088 (3-axis accel + 3-axis gyro) | [1] |
| Barometer | Bosch BMP388 | [1] |
| EEPROM | 8 kB (stores persistent params, radio address/channel) | [1] |
| Radio | 2.4 GHz ISM, 20 dBm PA, > 1 km LOS with Crazyradio PA; chip antenna + U.FL | [1] |
| USB / charging | micro-USB, on-board LiPo charger 100 / 500 / 980 mA; 40 min charge | [1] |
| Logic level | **3.0 V system** (high = 3.0 V, still 3.3 V compatible); all IO pins 5 V tolerant **except PA5 and the nRF51 pins** | [1] |
| Deck power | VCC 3.0 V max 100 mA; VCOM (unregulated VBAT or VUSB) max 1 A | [1] |
| Buses on headers | I2C 400 kHz, SPI, 2 x UART, 4 x GPIO/CS, 1-wire deck ID | [1] |
| Mounting | None: the board is the frame; IMU orientation fixed at the factory, no board-alignment setting | [1] |

### 4.2 Motor drive (no ESC)

- Each brushed motor is switched by a MOSFET on the PCB, driven by STM32 timer PWM: 8-bit, 84 MHz / 256 =
  **~328 kHz** ("CF2 PWM ripple is filtered better at 328kHz") [19 `motors.h`].
- There is **no ESC, no ESC firmware (BLHeli/Bluejay/AM32), no DShot, no RPM telemetry and no RPM filter** on the
  2.1 / 2.1+. (Those exist only on the Crazyflie 2.1 Brushless / Bolt.)
- The firmware compensates thrust for battery sag using a per-prop cubic thrust-vs-motor-voltage fit
  (`VMOTOR2THRUST0..3` in [15]).
- Motor connectors: Molex PicoBlade 2-pin, 32 mm leads [7]. Wire colours (unverified).

### 4.3 Radio, positioning, other

| Function | Hardware | Bus / notes | Source |
|---|---|---|---|
| Ground link | Crazyradio 2.0 (nRF52840, 64 MHz M4F, 20 dBm PA + LNA, RP-SMA, USB-A, 7 g, 63 x 18 x 8 mm) | Nordic proprietary 1/2 Mbps, 100 channels; also works with older Crazyradio PA | [10] |
| Phone link | BLE from the nRF51 | iOS/Android client | [1] |
| Flow deck v2 | PMW3901 optical flow (best on matt surfaces) + VL53L1x ToF (up to 4 m) | Flow camera on SPI, ToF on I2C (address 0x29, ST default, unverified in driver); 1-wire ID; firmware name `bcFlow2`; forces the Kalman estimator | [8][19] |
| Lighthouse deck | ICE40UP5K FPGA + 4 TS4231 IR receivers | UART + I2C to the Crazyflie; external UART pads are 3 V max; firmware name `bcLighthouse4`; forces Kalman | [9][19] |
| Receiver / VTX / GPS / compass | None | No RC receiver, no video, no GPS, no magnetometer on the board | [1] |
| Power connector | Molex 51005-2P on the battery (pin 1 positive) | Not XT30/XT60; no external low-ESR capacitor is fitted or needed | [5] |
| BEC | On-board regulators | 3.0 V system; an NCP702 regulator is named in the firmware PWM comment | [1][19] |
| LEDs | 4 LEDs, one on each arm (exact position along the arm unverified; the original draws them at 78 % of the arm) | LED1 (M1 arm, front-right) shows red, LED4 (M4 arm, front-left) red and green, LED2 and LED3 (rear arms) blue | [24] |
| Buzzer | None on the board; the firmware can "beep" by driving the motors at audio frequency (`motorsBeep`) | [19] |

**LED codes [24]:** power-on: rear blue LEDs on, LED1 blinks red twice a second; LED1 slow red blink every 2 s =
sensors not yet calibrated (keep it still and level); LED4 flickering red/green = radio traffic; LED1 solid red =
low battery; LED1 five short red pulses repeating = self-test failed; M4 LED five fast green blinks = self-test passed;
rear LEDs blinking about 1 Hz = bootloader; while charging LED3 blinks and LED2 is lit, LED3 solid = charged.

## 5. Firmware: Crazyflie firmware + cflib

### 5.1 Versions (verified 2026-10-24)

| Component | Current stable | Date | Source |
|---|---|---|---|
| crazyflie-firmware (STM32) | **2026.08** | 2026-08-20 | [13] |
| crazyflie2-nrf-firmware | 2026.08 | 2026-08-20 | GitHub releases |
| Release bundle | **2026.10** (only the AI-deck ESP32 firmware changed; Crazyflie firmware identical to 2026.08) | 2026-10-16 | [14] |
| Bundle file for 2.1 / 2.1+ | `firmware-cf2-2026.10.zip` (`firmware-cf21bl-...` is for the Brushless) | | [14] |
| cflib (`pip install cflib`) | **0.1.34**, Python >= 3.10 | 2026-09-30 | [21] |
| cfclient (`pip install cfclient`) | **2026.8.1** | 2026-09-30 | [23] |
| Crazyradio 2.0 firmware | 5.5 | 2026-06-03 | GitHub releases |

### 5.2 Renamed, deprecated or easy-to-get-wrong names

| Thing | Correct current form | Note |
|---|---|---|
| Arming from Python | `cf.supervisor.send_arming_request(True)` | `cf.platform.send_arming_request()` still exists but raises a DeprecationWarning [21] |
| High-level commander enable | not needed | `commander.enHighLevel` is deprecated ("removed after August 2023"), does nothing [19 `commander.c`] |
| Trajectory start | `start_trajectory(id, time_scale=1.0, relative_position=False, relative_yaw=False, reversed=False, group_mask=ALL_GROUPS)` | the keyword is `relative_position`, **not** `relative` [21] |
| `go_to` | `go_to(x, y, z, yaw, duration_s, relative=False, linear=False, group_mask=...)`; x,y,z in m, **yaw in radians** | [21] |
| `takeoff` / `land` | `takeoff(absolute_height_m, duration_s, group_mask, yaw=0.0)`, `land(absolute_height_m, duration_s, ...)` | [21] |
| Client start | `cfclient` (console script) | there is no `cfclient/__main__.py`, so `python -m cfclient` does not work [23] |
| Firmware flasher | `cfloader` ships with **cfclient**, not cflib | [23] |
| Deck present params | `deck.bcFlow2`, `deck.bcLighthouse4` (read-only, 1 = detected) | [19] |

### 5.3 Controller and estimator params [17]

`stabilizer.controller` (uint8): **0 = Auto select (default; resolves to PID), 1 = PID, 2 = Mellinger, 3 = INDI,
4 = Brescianini, 5 = Lee**. (An out-of-tree controller type exists at build time.)

`stabilizer.estimator` (uint8): **0 = Auto select (default), 1 = complementary, 2 = extended Kalman, 3 = unscented
Kalman**. Auto select starts on the complementary filter; the Flow deck and Lighthouse deck drivers declare
`requiredEstimator = StateEstimatorTypeKalman`, so with either deck the Kalman filter is used [19].

Other useful params: `stabilizer.stop` (nonzero turns the motors off) [18]; `lighthouse.systemType` (1 = Lighthouse
V1, 2 = V2), `lighthouse.method` (0 = crossing beam, 1 = sweep in EKF, default 1) [19]; `pm.lowVoltage` and
`pm.criticalLowVoltage` (defaults 3.2 V and 3.0 V) [15][19]; `motion.disable` (nonzero stops feeding flow to the EKF).

Useful log variables: `stateEstimate.x/.y/.z` (m), `stabilizer.roll/.pitch/.yaw` (deg), `range.zrange` (uint16, mm,
Flow deck ToF), `motion.deltaX/.deltaY` (flow), `motion.squal` (surface quality: count of features), `pm.vbat` (V),
`pm.state`, `kalman.varPX/.varPY/.varPZ` (used by `reset_estimators()` to wait for convergence) [19][21].

### 5.4 Initial setup

```
pip install cflib cfclient                  # cflib 0.1.34, cfclient 2026.8.1
cfclient                                    # GUI: Connect -> Bootloader -> "Program" latest release
# or from the shell (warm boot over the radio, default address):
cfloader flash firmware-cf2-2026.10.zip -w radio://0/80/2M/E7E7E7E7E7
```

`cfloader` usage: `flash <file> [targets]`, targets like `stm32-fw`, `nrf51-fw` or `deck-<target>-<type>`; with a
release zip and no targets it flashes everything in the zip; `-w <uri>` warm-boots over the radio [23]. On Linux the
Crazyradio needs udev rules (unverified detail). For a swarm, give each drone a unique address in cfclient
(Connect -> Configure 2.x: channel, data rate, address), e.g. E7E7E7E701...04, all on the same channel when sharing
one radio (the official swarm example comment: "URIs in a swarm using the same radio must also be on the same
channel") [22].

URI format: `radio://<dongle index>/<channel>/<data rate 250K|1M|2M>/<5-byte address hex>`; default
`radio://0/80/2M/E7E7E7E7E7` [22]. Channel range: 0-125 is the usual cflib/cfclient range (2400 + n MHz), while the
Crazyradio 2.0 datasheet says "100 radio channels" [10] (unverified which limit cfclient enforces).

### 5.5 `hover`: one Crazyflie with the Flow deck (MotionCommander)

```python
import time
import cflib.crtp
from cflib.crazyflie import Crazyflie
from cflib.crazyflie.syncCrazyflie import SyncCrazyflie
from cflib.positioning.motion_commander import MotionCommander

URI = 'radio://0/80/2M/E7E7E7E7E7'

cflib.crtp.init_drivers()
with SyncCrazyflie(URI, cf=Crazyflie(rw_cache='./cache')) as scf:
    if scf.cf.param.get_value('deck.bcFlow2') != '1':
        raise RuntimeError('Flow deck v2 not detected')
    scf.cf.supervisor.send_arming_request(True)
    time.sleep(1.0)
    with MotionCommander(scf, default_height=0.5) as mc:   # takes off on enter
        mc.forward(0.5)        # metres, from optical flow
        mc.turn_left(90)       # degrees
        mc.back(0.5)
    # leaving the block lands
```

API facts [21]: `MotionCommander(crazyflie, default_height=0.3)`; default velocity 0.2 m/s, default turn rate 72 deg/s;
it streams velocity setpoints every 0.2 s from a background thread; methods `take_off`, `land`, `forward/back/left/
right/up/down(distance_m, velocity)`, `turn_left/right(angle_degrees, rate)`, `circle_left/right`, `move_distance`,
`start_*`, `stop`. The structure follows the official `motion_commander_demo.py` [22]. `param.get_value()` returns the
value as a string (`value.__str__()` is what is cached), hence the comparison with `'1'` [21 `param.py`].

**Original's hover snippet:** correct apart from missing the arming request (harmless on a stock 2.1/2.1+ because
auto-arming is the default, see 5.9) and no deck check.

### 5.6 `swarm`: four Crazyflies, one radio, Lighthouse (corrected)

```python
import time
import cflib.crtp
from cflib.crazyflie.swarm import CachedCfFactory, Swarm

URIS = [
    'radio://0/80/2M/E7E7E7E701',
    'radio://0/80/2M/E7E7E7E702',
    'radio://0/80/2M/E7E7E7E703',
    'radio://0/80/2M/E7E7E7E704',
]

# one entry per drone, keyed by URI; the list is passed as extra arguments to the function
SLOTS = {
    URIS[0]: [0.6, 0.6],
    URIS[1]: [0.6, -0.6],
    URIS[2]: [-0.6, -0.6],
    URIS[3]: [-0.6, 0.6],
}


def arm(scf):
    scf.cf.supervisor.send_arming_request(True)
    time.sleep(1.0)


def square(scf, x, y):
    hl = scf.cf.high_level_commander
    hl.takeoff(1.0, 2.5)
    time.sleep(3)
    hl.go_to(x, y, 1.0, 0.0, 2.0)   # absolute Lighthouse coordinates (m), yaw in rad
    time.sleep(2.5)
    hl.land(0.0, 2.0)
    time.sleep(2.5)
    hl.stop()


if __name__ == '__main__':
    cflib.crtp.init_drivers()
    with Swarm(URIS, factory=CachedCfFactory(rw_cache='./cache')) as swarm:
        swarm.reset_estimators()          # waits until every Kalman variance has settled
        swarm.parallel_safe(arm)
        swarm.parallel_safe(square, args_dict=SLOTS)
```

API facts [21][22]: `Swarm(uris, factory=_Factory())`, context manager opens/closes all links;
`CachedCfFactory(ro_cache=None, rw_cache=None)`; `sequential(func, args_dict=None)`, `parallel(...)`,
`parallel_safe(...)` (re-raises an exception from any thread); `args_dict` is `{uri: [arg1, arg2, ...]}` and each
call is `func(scf, *args_dict[uri])`; `reset_estimators()` resets each Kalman filter and waits until the spread of the
last 10 `kalman.varPX/PY/PZ` samples (500 ms log) is below 0.001; `get_estimated_positions()` returns each drone's
position. Pattern matches the official `examples/step-by-step/sbs_swarm.py` (arm via `parallel_safe(arm)`, then
take-off, sequence, land).

**Original's swarm snippet errors:** no `import time`; `SLOTS` undefined; no `cflib.crtp.init_drivers()`; never lands
or stops.

### 5.7 `figure8`: uploaded polynomial trajectory (corrected)

```python
import time
from cflib.crazyflie.mem import MemoryElement, Poly4D

def upload_trajectory(cf, trajectory_id, trajectory):
    mem = cf.mem.get_mems(MemoryElement.TYPE_TRAJ)[0]
    mem.trajectory = []
    total = 0.0
    for row in trajectory:            # row: duration, 8 x-coeffs, 8 y, 8 z, 8 yaw
        mem.trajectory.append(Poly4D(row[0], Poly4D.Poly(row[1:9]), Poly4D.Poly(row[9:17]),
                                     Poly4D.Poly(row[17:25]), Poly4D.Poly(row[25:33])))
        total += row[0]
    if not mem.write_data_sync():
        raise RuntimeError('trajectory upload failed')
    cf.high_level_commander.define_trajectory(trajectory_id, 0, len(mem.trajectory))
    return total

duration = upload_trajectory(cf, 1, figure8)
cf.supervisor.send_arming_request(True); time.sleep(1.0)
hl = cf.high_level_commander
hl.takeoff(1.0, 2.0); time.sleep(3.0)
hl.start_trajectory(1, 1.0, relative_position=True)
time.sleep(duration)
hl.land(0.0, 2.0); time.sleep(2); hl.stop()
```

From the official `autonomous_sequence_high_level.py` [22]. **Original's errors:** `define_trajectory` called before the
upload (it must follow `write_data_sync()`); `relative=True` is not a keyword of `start_trajectory` (TypeError; it is
`relative_position=True`); the official example optionally sets `stabilizer.controller` to 2 (Mellinger) for
trajectory tracking.

### 5.8 Logging (Flow height and Kalman position at 100 Hz)

```python
from cflib.crazyflie.log import LogConfig
from cflib.crazyflie.syncLogger import SyncLogger

lg = LogConfig(name='Height', period_in_ms=10)          # 100 Hz
lg.add_variable('range.zrange', 'uint16_t')              # mm, Flow deck ToF
lg.add_variable('stateEstimate.x', 'float')              # m
lg.add_variable('stateEstimate.y', 'float')
lg.add_variable('stateEstimate.z', 'float')
with SyncLogger(scf, lg) as logger:
    for timestamp, data, logconf in logger:
        print(timestamp, data['range.zrange'], data['stateEstimate.z'])
```

Pattern from `basiclog_sync.py` [22]. One log block is limited to one CRTP packet of data (about 26 bytes; this block
is 14 bytes) (packet size unverified).

### 5.9 Arming, failsafes, pre-flight checks (supervisor) [18]

- Supervisor states: NotInitialized, PreFlChecksNotPassed, PreFlChecksPassed, Arming, ReadyToFly, Flying, Landed,
  Reset, WarningLevelOut, ExceptFreeFall, Locked, Crashed.
- Conditions (the "arming blockers" and failsafe triggers): Armed, IsFlying, IsTumbled, CommanderWdtWarning,
  CommanderWdtTimeout, EmergencyStop, IsCrashed, PreflightTimeout, LandingTimeout, DeckFault, RPMatArmingValid,
  SpinupTimeout, MotorsNotResponding.
- **Auto-arming is the default on the Crazyflie 2.0 / 2.1(+)** (brushed, "small, safe platforms"), and idle thrust is 0,
  so the motors do not spin when armed [18 `arming.md`]. Sending `send_arming_request(True)` is still correct and
  required on brushless platforms.
- **Link-loss failsafe (streamed setpoints):** setpoint older than **500 ms** -> WarningLevelOut (level and hold
  thrust); older than **2000 ms** -> motors off [18] (`COMMANDER_WDT_TIMEOUT_STABILIZE M2T(500)`,
  `..._SHUTDOWN M2T(2000)`). A high-level-commander take-off, go_to or trajectory keeps running on board
  without the radio: each stabilizer loop calls `crtpCommanderHighLevelGetSetpoint()` and re-submits it with
  `commanderSetSetpoint(..., COMMANDER_PRIORITY_HIGHLEVEL)`, which refreshes the timestamp, so the watchdog never trips
  [19 `stabilizer.c`, `commander.c`]. A drone that loses the link mid-swarm therefore finishes its last command and
  hovers there (it does not land by itself unless a land command was sent).
- Tumble check: `supervisor.tmblChckEn` (0 disables); crash detection threshold `supervisor.crashDetectGs`; also
  `supervisor.prefltTimeout`, `landedTimeout`, `spinupTimeout` (ms) [18].
- Emergency stop: `cf.supervisor.send_emergency_stop()`; recover with `send_crash_recovery_request()` [21].
- Battery: low warning at 3.2 V sustained for 5 s, critical 3.0 V (`DEFAULT_BAT_LOW_VOLTAGE`, `DEFAULT_BAT_CRITICAL_LOW_VOLTAGE`, `DEFAULT_BAT_LOW_DURATION_TO_TRIGGER_SEC`); `DEFAULT_SYSTEM_SHUTDOWN_TIMEOUT_MIN 5` (system shutdown timeout, exact trigger unverified) [15].

### 5.10 Motor test, direction, calibration

- **Motor direction "reversal":** not possible in firmware or an ESC (there is none); fix a wrong spin by fitting the
  right prop (47-17 on M1/M3, 47-17R on M2/M4). If a motor genuinely turns backwards the board/motor connector is
  faulty (unverified failure case).
- **Individual motor test (props off):** `motorPowerSet.enable = 1` then `motorPowerSet.m1..m4` (0-65535) hands PWM
  straight to each motor; `enable = 2` sends m1 to all; set `enable = 0` afterwards [19 `motors.c`]. The override
  sits inside `motorsSetRatio()`, which the stabilizer calls only when `supervisorAreMotorsAllowedToRun()` is true, so
  the drone must be upright and armed (automatic on a stock 2.1/2.1+); otherwise `motorsStop()` runs [19 `stabilizer.c`].
- **Propeller/motor health test:** `health.startPropTest = 1` spins each motor and measures accelerometer variance
  (`health.motorVarXM1...`) to spot a bad prop or motor; `health.startBatTest = 1` checks battery sag [19 `health.c`].
  cfclient exposes this as the propeller test (unverified UI name).
- **Accelerometer / gyro calibration:** automatic. At power-on the drone must sit still and level; LED1 blinks red
  slowly until the sensors are calibrated [24]. There is no user accelerometer-calibration command (unverified: an
  IMU bias trim exists through params; not needed in normal use). No compass on the board.
- **Board alignment:** not configurable; the IMU is soldered to the frame.

## 6. Safety tests

| Test | How on a Crazyflie | What it catches |
|---|---|---|
| Smoke stopper | **Not used.** A smoke stopper is a resettable fuse or bulb in series with the battery lead that limits current on first power-up so a short burns the fuse instead of the ESC/FC. The Crazyflie is factory-assembled, has no soldering, and its 250 mAh cell has a PCM (protection circuit) [6]; the original correctly sets `noSmoke: true` | Shorts in a hand-soldered power path (not applicable) |
| Power-on self-test | Each motor spins briefly in sequence on power-up; M4 LED 5 fast green = pass, LED1 5 red pulses repeating = fail [24] | Unplugged or dead motor, sensor fault |
| Prop / motor direction check | Visual: on power-up each prop spins in turn; check M1 and M3 turn CCW, M2 and M4 CW, and that the prop marking matches (47-17 CCW, 47-17R CW). Props-off individual test with `motorPowerSet` in cfclient's Parameters tab [19] | Wrong prop type on a motor (flips at take-off) |
| Propeller test | `health.startPropTest` (cfclient, unverified UI) [19] | Chipped/unbalanced prop, worn motor (vibration) |
| Sensor calibration | Keep still and level at power-on until LED1 stops the slow blink [24] | Gyro bias -> yaw drift |
| Positioning check | cfclient flight tab / log `stateEstimate.*`; `swarm.reset_estimators()` waits for the Kalman variance to settle [21] | No Lighthouse lock or no flow (drone will drift or refuse a smooth take-off) |
| Deck detection | cfclient console / `deck.bcFlow2`, `deck.bcLighthouse4` params = 1 [19] | Deck on backwards or headers not seated |
| Pre-arm | Supervisor must reach PreFlChecksPassed; tumbled (upside-down) drones will not arm [18] | Crashed/tumbled drone, deck fault |

## 7. Flight characteristics

| Item | Value | Source |
|---|---|---|
| AUW | 29 g stock; ~32 g with Lighthouse; ~34.5 g with Flow + Lighthouse on long pins | [1][8][9][20] derived |
| Max thrust | ~60 g total (2.1, 45 mm props); up to +15 % with 47-17 (~69 g, derived) | [12][4] |
| T:W | ~2.0-2.4 bare; ~1.8-2.0 with decks (derived) | |
| Hover throttle | ~55-65 % (derived, see 3.5) | [15] |
| Hover current | ~2.1-2.3 A at 3.7 V (~8 W) | [1][12] derived |
| Flight time | 7 min stock battery (hover); 350 mAh: "above 10 min" (Bitcraze claim); aggressive flight (unverified) ~4-5 min | [1][6] |
| Typical speeds | MotionCommander default 0.2 m/s; indoor swarms usually 0.5-1 m/s; top speed (unverified) | [21] |
| Flow deck working height | **0.2-3.0 m** in cfclient hover mode (1.0 m for Flow v1); VL53L1x in firmware is set to MEDIUM distance mode, and its noise model rises from 2.5 mm std at 2.5 m to 0.2 m std at 4 m | [25][19 `zranger2.c`] |
| Flow deck texture | Needs a textured, matt, flat floor; "a hard time operating over a blank surface"; tracking affected near walls; the datasheet says the flow sensor "works best on matt surfaces"; 4 m is a theoretical maximum that depends on texture and light | [8][25][28] |
| Lighthouse accuracy | Relative precision better than 1 mm, absolute accuracy better than 10 cm in a 5 x 5 m space; a few cm worse in the corners | [26] |
| Lighthouse limits | V2: 150 deg H x 110 deg V FOV, ~6 m range, ~50 Hz; V1: 120 x 120 deg, max 2 stations, ~30 Hz; firmware supports 4 V2 stations by default (16 in hardware); needs line of sight to at least one station; indoor only (sunlight degrades it); best up to ~50 cm below the station height | [26] |
| Swarm size per radio | Bitcraze has flown 49 drones with 3 Crazyradios (broadcast, mocap); staff guidance ~15 per radio with broadcasts; radio fw 5.1 gives ~1200 packets/s to one drone (unverified exact figure for the swarm case) | [29], forum |
| Motor-out | A quad cannot survive a motor failure: it yaws and flips and falls; the supervisor detects the tumble and cuts the motors | [18] |

## 8. Real failure modes

| Failure | Cause | What the pilot sees |
|---|---|---|
| Wrong prop on a motor | 47-17 and 47-17R swapped | Spins or flips instantly on take-off; supervisor detects tumble and stops motors |
| Worn brushed motor | Brushes and bearings wear; weaker motor | Slow drift towards that corner, higher throttle, propeller test shows high variance; fix by replacing the motor (not the PIDs) [24] |
| Brown-out / low battery | Battery sags under load | LED1 solid red, `pm.state` low; below 3.0 V critical; the drone sinks or cannot climb [15][24] |
| No Flow tracking | Blank, shiny or uniform floor; too dark; above ~3 m | Drifts sideways, `motion.squal` low |
| Height jumps | ToF hits a table edge or another drone | Sudden climb or drop |
| Lighthouse occlusion | No line of sight to any base station; sunlight; geometry not estimated | Position jumps or drift; `reset_estimators()` never returns |
| Radio link loss with streamed setpoints | Range, Wi-Fi interference, too many drones per radio | Levels after 0.5 s, motors off after 2 s [18] |
| Radio link loss with high-level commands | Same | The drone completes its current HL command and keeps holding that setpoint; no automatic landing [19] |
| Prop wash / downwash | Flying one drone above another in a swarm | Lower drone wobbles or drops; keep vertical separation (unverified rule of thumb: > 0.3 m horizontally) |
| Tumbled at arming | Upside down or crashed | Will not arm; must recover via crash-recovery request |
| Deck not detected | Deck on backwards, headers not seated | Console lacks the deck; Kalman not forced; flow/lighthouse missing |
| Thicker battery | 350 mAh pack is ~1 mm thicker | Top deck does not seat on short headers; use long headers [6] |

## 9. Uncertainties

- Mass: datasheets for both 2.1 (rev 3) and 2.1+ say 29 g takeoff; the original's "27 g" is the Crazyflie 2.0
  figure [30]. Trust the 2.1/2.1+ datasheets.
- The 2.1+ blog says the battery became 1 g lighter; the 2.1+ datasheet still lists a "250mAh" pack and the
  store (2026-10-24) sells only the 250 mAh (7.1 g) and 350 mAh (9.1 g) packs; a search engine showed an old "240 mAh"
  store URL that no longer resolves. Exact mass of the 2.1+ kit cell (unverified; between 6.1 and 7.1 g).
- Max thrust: Bitcraze's blog gives ~60 g (stock 2.1) and ~80 g (upgrade kit); the firmware's cubic thrust fits give
  higher values at 3.7-4.2 V at the motor (21-30 g/motor for legacy props) and are extrapolations; the firmware's
  `THRUST_MAX` (0.12 N/motor) is a normalisation cap, not a measurement. Use ~60 g (2.1) / ~69 g (2.1+, derived).
- Legacy 45 mm prop pitch and mass, PCB thickness, motor wire colours, 8520 motor mass, MOSFET current
  rating: unverified.
- The exact cfclient UI label for the propeller test: unverified. "Hovers after the last HL command" is derived from
  source, not observed.
- Battery position with stacked decks taken from the Bitcraze getting-started text plus standard product photos;
  the text itself only says the battery goes between the short header pins under the holder deck.
