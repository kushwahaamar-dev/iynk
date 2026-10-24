# Fact sheet: 5-inch freestyle FPV quad on Betaflight (Drone Lab Fig. 01, `quad5`)

Status: verified against Betaflight 2026.6.2 source code and the betaflight.com docs on 2026-10-24, except where a
line says "(unverified)". Firmware facts come from source code first, docs second, community sites last.

## 0. Header

**Craft class:** 5-inch (127 mm prop) freestyle FPV quadcopter, True-X frame, 6S LiPo, Betaflight, flown in Acro
(rate) mode from FPV goggles.

**Real products / reference builds it represents:**

| Reference | What it is | Link |
|---|---|---|
| TBS Source One V5 (5") | Open-source 5" freestyle frame: 226 mm wheelbase, 6 mm arms, 30.5 mm stack [15] | https://oscarliang.com/source-one-v5 |
| SpeedyBee F405 V4 BLS 55A 30x30 stack | F405 FC + 55 A 4-in-1 ESC, the most common budget 5" stack [14] | https://www.speedybee.com/speedybee-f405-v4-bls-55a-30x30-fc-esc-stack/ |
| GEPRC Mark5 (O4 Pro / analog) | Popular 5" freestyle frame/BNF, 225 mm-class (unverified exact figures) | https://geprc.com |

A typical 2025-2026 build: 225 mm-class True-X carbon frame, four 2306/2207 motors at 1700-1950 KV on 6S, a
30.5 x 30.5 mm stack (F4/F7 FC on a 4-in-1 ESC), an ExpressLRS 2.4 GHz receiver, an analog camera + 5.8 GHz VTX
or a DJI O4/O3 (or Walksnail/HDZero) digital air unit, and a 6S 1050-1300 mAh LiPo strapped on top.

**What it is and what it is for.** A 5-inch freestyle quad is the standard "first real FPV build". Four brushless
outrunner motors on carbon arms are driven by a 4-in-1 ESC; a flight controller (gyro + MCU running Betaflight) runs
a PID loop several thousand times a second to turn stick commands into rotation rates. The pilot flies through a
low-latency video link in goggles, normally in Acro mode (sticks command rotation rate, no self-levelling), doing
flips, rolls, dives and gap shots around "bandos" (abandoned buildings). It is built to survive crashes (thick
arms, replaceable parts), carries a large T:W (8-14:1) and flies 3-5 minutes per pack when flown hard.

## 1. Sources

Firmware source code (Betaflight tag 2026.6.2; the local copy of `settings.c` is byte-identical to the tag):

1. Betaflight releases (2026.6.2 published 2026-09-16; 2025.12.5 and 4.5.5 on 2026-06-28): https://github.com/betaflight/betaflight/releases
2. `src/main/cli/settings.c` (every CLI `set` name, range, lookup table): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/cli/settings.c
3. `src/main/fc/parameter_names.h`: https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/fc/parameter_names.h
4. `src/main/flight/mixer_init.c` (QuadX motor table): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/mixer_init.c
5. `src/main/flight/mixer.c` (`yaw_motors_reversed`): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/flight/mixer.c
6. `src/main/fc/runtime_config.c` (arming-disable flag names): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/fc/runtime_config.c
7. `src/main/msp/msp_box.c` (mode names and permanent IDs used by `aux`): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/msp/msp_box.c
8. `src/main/cli/cli.c` (`serial`, `aux` syntax) and `src/main/io/serial.h` (function bitmask): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/cli/cli.c
9. `src/main/fc/rc_controls.c` (stick-command calibrations), `src/main/fc/core.c` (arming checks): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/fc/rc_controls.c
10. `src/main/osd/osd.h`, `osd.c` (timer and position encoding, stats enum): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/osd/osd.h
11. Defaults: `flight/failsafe.c`, `pg/rpm_filter.c`, `flight/imu.c`, `flight/pid.c` + `pid.h`, `pg/motor.c`, `fc/controlrate_profile.c`, `fc/rc.c`, `pg/alt_hold_multirotor.c`, `pg/rx.c` (same tag, same tree).

Official docs (betaflight.com, repo betaflight/betaflight.com):

12. 2025.12 release notes (calendar versioning, board-alignment warning): https://betaflight.com/docs/wiki/release/Betaflight-2025-12-Release-Notes ; 2026.6 notes: https://betaflight.com/docs/wiki/release/Betaflight-2026-6-Release-Notes ; versioning blog: https://betaflight.com/blog/2025/09/01/Calendar-Versioning-Change
13. Guides: Mixer, Reversed motor direction, DShot, DSHOT RPM Filtering, VTX (vtxtable), Failsafe, Modes, Serial, Arming Sequence and Safety, CLI, Buzzer Mute Mode; app tabs Motors, Setup, OSD, VTX, Failsafe: https://betaflight.com/docs/wiki/guides/current/ and https://betaflight.com/docs/wiki/app/
14. SpeedyBee F405 V4 board page (target `SPEEDYBEEF405V4`): https://betaflight.com/docs/wiki/boards/current/SPEEDYBEEF405V4 and the manufacturer page https://www.speedybee.com/speedybee-f405-v4-bls-55a-30x30-fc-esc-stack/

Hardware and community references:

15. Oscar Liang, TBS Source One V5 review (226 mm wheelbase, 6 mm arms, 2 mm top plate): https://oscarliang.com/source-one-v5
16. EMAX ECO II 2306 spec (1700 KV: 30.4 g without silicone wire, 3-6S): https://www.flyingtech.co.uk/product/emax-eco-ii-series-2306-motor-1700kv-1900kv-2400kv/
17. ExpressLRS "Configuring the FC" (Serial RX on a UART, CRSF provider): https://www.expresslrs.org/quick-start/receivers/configuring-fc/
18. End of BLHeli_32 (shutdown announced; article dated 3 June 2024): https://oscarliang.com/end-of-blheli_32
25. SpeedyBee F405 V4 stack manual (EN PDF; FC-ESC pin pairing, BLS 55A ESC firmware): https://store-fhxxhuiq8q.mybigcommerce.com/product_images/img_SpeedyBee_F405_V4_Stack/SpeedyBee_F405_V4_Stack_Manual_EN.pdf
26. Betaflight board config `SPEEDYBEEF405V4` (sensor drivers, UART defaults, motor pins): https://github.com/betaflight/config/blob/master/configs/SPBE/SPEEDYBEEF405V4/config.h
19. ESC Configurator (web tool for Bluejay / BLHeli_S / AM32): https://esc-configurator.com
20. Drone Lab research doc: `docs/research/drone-lab-a.md` section 9.1 and Appendix A (what the original shows).
21. `src/main/fc/core.c` at 2026.6.2 (`accNeedsCalibration()`, `updateArmingStatus()`): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/fc/core.c
22. XT60 gender convention (male on the drone/ESC lead, female on the battery), vendor description: https://www.myfpvstore.com/accessories/xt60-power-connectors-set-of-male-female/
23. T-Motor F60 Pro V spec listing (1750 KV: 34.3 g incl. cable, peak 40.5 A, 1003 W, 6S): https://www.getfpv.com/t-motor-f60-pro-v-motor-1750kv-1950kv-2020kv-2550kv.html
24. Pilot flight-time reports, 5" on 6S 1300 mAh (forum, low weight of evidence): https://intofpv.com/archive/index.php/thread-19195.html

## 2. Geometry (craft frame)

Craft frame: **x forward (nose/camera), y left, z up**, origin at the frame centre on the top face of the bottom
plate, units mm. "Seen from above" = looking down the -z axis.

### 2.1 Frame

| Item | Value | Notes |
|---|---|---|
| Layout | True-X (motors on the corners of a square) | The original says "True-X, 5 mm arms, 225 mm motor to motor" [20]. Stretched-X and squashed-X also exist. |
| Wheelbase (motor-to-motor diagonal) | **225 mm** (class range 220-230; Source One V5 226 mm [15]) | |
| Motor centre radius from frame centre | 225 / 2 = **112.5 mm** | |
| Motor centre offsets | 112.5 / sqrt(2) = **79.55 mm** on x and y | Original uses +-79.5 mm [20]; keep. |
| Arm thickness | **5 or 6 mm** carbon (Source One V5: 6 mm [15]; original: 5 mm) | |
| Arm width | ~12-16 mm at the motor, wider at the root (unverified) | |
| Bottom plate | 2-3 mm carbon (Source One V5: 2.5 mm bottom, 2 mm middle plate [15]) | |
| Top plate | 2 mm carbon (Source One V5 [15]) | carries the battery pad and strap slots |
| Standoffs | M3, about 20-35 mm tall depending on air unit (original draws 30 mm). Source One V5: 30 mm at the front and 22 mm at the rear, 5 mm outer diameter [15] | |
| Stack mounting | **30.5 x 30.5 mm, M3** (FC holes 4 mm for M3 soft-mount grommets [14]); 20 x 20 mm M2/M3 is the small-stack alternative | |
| Motor mounting | **16 x 16 mm, M3** for 2306/2207 (EMAX ECO II 2306: 16 x 16 mm, 12N14P, 28 mm bell diameter, M5 prop shaft [16]) | |
| Frame mass (bare frame incl. top plate, standoffs, hardware) | about 100-130 g (Source One V5: 118 g, 128 g with battery pad [15]; others unverified) | original: 118 g frame + 22 g "top plate + standoffs + screws" (see 3.4) |

### 2.2 Motors: Betaflight QUAD X order and spin

Betaflight's QuadX mixer table, in output order (columns throttle, roll, pitch, yaw) [4]:

```
static const motorMixer_t mixerQuadX[] = {
    { 1.0f, -1.0f,  1.0f, -1.0f },          // REAR_R
    { 1.0f, -1.0f, -1.0f,  1.0f },          // FRONT_R
    { 1.0f,  1.0f,  1.0f,  1.0f },          // REAR_L
    { 1.0f,  1.0f, -1.0f, -1.0f },          // FRONT_L
};
```

| Motor (BF number) | Corner | x (mm) | y (mm) | Spin seen from above, **props in (default, `yaw_motors_reversed = OFF`)** | Spin, **props out (`yaw_motors_reversed = ON`)** |
|---|---|---|---|---|---|
| M1 | rear right | -79.5 | -79.5 | **CW** | CCW |
| M2 | front right | +79.5 | -79.5 | **CCW** | CW |
| M3 | rear left | -79.5 | +79.5 | **CCW** | CW |
| M4 | front left | +79.5 | +79.5 | **CW** | CCW |

- "Props in": the blade tips on the front edge of each front disc move inward, towards the camera/centre line;
  "props out" is the reverse and throws less debris into the camera [13: app Motors tab, Reversed motor direction].
  Check: M2 front right spins CCW, so its front edge moves to +y (left), i.e. inwards. Diagonal pairs (M1+M4,
  M2+M3) share a direction, so yaw torque cancels.
- `yaw_motors_reversed` only tells the mixer the props spin the other way; it does **not** change motor spin.
  Spin is changed in the ESC (DShot direction command or ESC tool) or by swapping two motor wires [13: Reversed
  motor direction].
- Physical ESC pad order may differ from M1-M4: on the SpeedyBee F405 V4 stack the 8-pin harness
  connects FC M1..M4 straight to ESC S1..S4 (the ESC connector lists its pins in reverse order, which is why the
  board doc's table reads S4..S1, but the pairing is M1-S1, M2-S2, M3-S3, M4-S4) [25]. With other ESCs, check. Remap with `resource MOTOR n <pin>` or, in 2025.12+,
  `set motor_output_reordering = ...` (array setting present in 2026.6.2 [2]); the Configurator Motors tab has a
  "Motor remap" wizard (unverified wizard name).

### 2.3 Props, camera, battery, mass

| Item | Value |
|---|---|
| Prop | 5.0-5.1 in diameter (127-130 mm; radius 63.5 mm), pitch 4.3-4.8 in, **3 blades** (tri-blade), e.g. HQ 5x4.3x3, Gemfan 51466 (5.1x4.66x3) (unverified exact pitches) |
| Prop mass | about 4-4.6 g each (unverified) |
| Prop hub | M5 shaft, nut-secured; CW and CCW props are mirror images |
| Prop disc clearance | with 225 mm wheelbase, adjacent motors are 159 mm apart, so 127 mm props leave ~32 mm tip-to-tip |
| Camera | front of the stack, lens near x = +45 to +55 mm, z ~ 20-25 mm, between two side plates; 19 mm "micro" analog camera or DJI O4 Pro / O3 camera |
| Camera uptilt | 25-40 deg typical freestyle, ~30 deg default (original: ~30 deg; lens drawn 60 deg from vertical, i.e. 30 deg up) |
| Battery | on the top plate, centred on x = 0 (slid forward/back to set CG), held by a strap on a grippy pad; XT60 lead to the rear |
| Antennas | VTX antenna (SMA/MMCX/UFL) out the rear; ELRS T-antenna or two dipoles at 90 deg on the rear arms/standoffs |
| AUW (6S 1100-1300) | about 600-700 g with an analog or O4 setup (unverified range; original computes 514 g, see 3.4) |

## 3. The original's catalogue, sanity-checked

The calculator stays identical (Appendix A of [20]). Below: is each description real?

### 3.1 Batteries

| Key | Original | Real-world check | Verdict |
|---|---|---|---|
| `6s1100` | 6S 1100 mAh, 178 g, $38 | 6S 1050-1100 mAh 120-130C LiPos weigh about 170-190 g and cost $30-45 (unverified exact model) | plausible |
| `6s1800` | 6S 1800 mAh, 282 g, $54 | 6S 1800 mAh packs weigh about 270-300 g (unverified) | plausible; heavy for freestyle, more a long-range/cruising pack |
| `4s1500` | 4S 1500 mAh, 182 g, $30 | 4S 1500 mAh 100-120C packs weigh about 165-185 g (unverified) | plausible |

Nominal 3.7 V/cell is used by the calculator (6S = 22.2 V, 4S = 14.8 V); full charge is 4.20 V/cell (25.2 V on 6S),
storage 3.80-3.85 V/cell, land at about 3.5 V/cell resting (Betaflight defaults: `vbat_warning_cell_voltage` 350,
`vbat_min_cell_voltage` 330, `vbat_max_cell_voltage` 430, units 0.01 V [11: sensors/battery.c, battery.h]).

### 3.2 Motors

| Original | Real-world check | Verdict |
|---|---|---|
| `2306 1750KV`, 32 g, $22, "for 6S" | Real 2306 1700-1750 KV motors: EMAX ECO II 2306 1700 KV 30.4 g without wire [16]; T-Motor F60 Pro V 1750 KV 34.3 g with cable, peak 40.5 A / 1003 W (10 s), 6S [23]. $18-30. | correct; the standard 6S choice |
| `2207 1950KV`, 34 g, $24, "for 6S" | 2207 1900-1960 KV 6S motors exist (e.g. EMAX ECO II 2207 1900 KV; unverified mass ~32-35 g) | plausible; punchy, hotter on 6S |
| `2306 2450KV`, 31 g, $20, "for 4S" | 2306 2400-2550 KV motors are 4S motors (unverified mass ~30-33 g) | correct for 4S; on 6S the original rightly warns "over" |

KV x cells test: the original warns when `kv * cells > 12075` (1750 x 6 x 1.15). Real rule of thumb: 1700-1950 KV on
6S, 2300-2600 KV on 4S for 5" (unverified as a single published threshold).

### 3.3 Props

| Original | pf / eff / g | Real-world check | Verdict |
|---|---|---|---|
| `5x4.3x3 tri-blade` | 1.00 / 1.00 / 4.4 g | HQ 5x4.3x3 V1S tri-blade, ~4.3-4.5 g (unverified) | correct, the classic default |
| `5.1x2.5x3 (efficient)` | 0.84 / 1.18 / 4.0 g | Low-pitch 5.1x2.5x3 props exist (e.g. HQ 5.1x2.5x3, unverified) | plausible: less thrust and current, longer flights |
| `5x5x3 (aggressive)` | 1.10 / 0.88 / 4.8 g | 5x5x3 high-pitch props exist (unverified mass) | plausible |

Price "$4" per pair (the calculator multiplies by ceil(4/2) = 2): real props are $3-5 per set of 4 (2 CW + 2 CCW),
so "$4 per pair" is high but harmless.

### 3.4 Fixed parts

| Original | g / $ | Real-world check | Verdict |
|---|---|---|---|
| `5" carbon frame` | 118 / 39 | 5" freestyle frames weigh ~100-130 g and cost $30-90 | plausible |
| `45A 4-in-1 ESC` | 8 / 45 | 30.5 mm 45-55 A 4-in-1 ESCs weigh ~15-25 g; the SpeedyBee BLS 55A is 23.5 g, 45.6 x 44 x 8 mm [14] | light (8 g is about a third of a real 55 A 4-in-1) |
| `F7 flight controller` | 7 / 39 | 30.5 mm FCs weigh 7-11 g; SpeedyBee F405 V4 is 10.5 g [14] | plausible |
| `Analog FPV camera` | 7 / 25 | 19 mm micro analog cameras weigh ~6-9 g | plausible |
| `5.8 GHz VTX + antenna` | 9 / 30 | 20 x 20 analog VTX ~5-8 g + antenna 3-6 g | plausible |
| `ELRS 2.4 GHz receiver` | 2 / 18 | ELRS 2.4 GHz nano receivers weigh ~0.5-2 g with antenna | plausible |
| `XT60 pigtail + low-ESR cap` | 12 / 4 | XT60 + 12 AWG lead + 1000 uF 35 V cap: ~10-15 g | plausible |
| `Top plate + standoffs + screws` | 22 / 8 | a frame kit normally includes these; it double-counts part of the frame mass | flag (kit already includes them) |
| `Battery strap + pad` | 5 / 4 | 3-6 g | plausible |

Wiring-diagram labels: `1000 uF 35 V` is the usual minimum for 6S (25.2 V full); many builders use 50 V on 6S for
margin (unverified as an official rule). `45 A x 4, BLHeli_32`: BLHeli_32 development and new sales ended in
June 2024 (shutdown announced in early June 2024 [18]; the exact cut-off date is unverified); new ESCs ship with **AM32** (32-bit) or **Bluejay** (on BLHeli_S 8-bit hardware). Say
"BLHeli_32 / AM32" or "AM32". `5.8 GHz, 400 mW`: legal power depends on country (EU 25 mW; US needs an amateur
licence) (unverified wording of regulations).

### 3.5 Calculator outputs vs reality (default 6s1100 / 2306-1750 / 5x4.3x3)

| Output | Original | Real-world | Verdict |
|---|---|---|---|
| AUW | 514 g | analog 6S 1100 builds ~550-650 g (unverified) | a little light |
| Thrust per motor | 1600 g | 2306 1750 KV on 6S with 5x4.3x3: ~1.4-1.7 kg peak (unverified; no manufacturer table fetched) | plausible |
| T:W | 12.5:1 | 8-14:1 typical | plausible |
| Hover throttle | 28% | 20-30% typical on 6S | plausible |
| Max current | 144 A | 4 x 35-45 A bursts = 140-180 A (F60 Pro V peak rating 40.5 A per motor [23]) | plausible |
| Hover time | 12.3 min | real 6S 1100-1300 gentle flying ~6-8 min [24] (calculator's 5.4 g/W is optimistic; real 5" systems give ~3.5-4.5 g/W at hover) (unverified) | **optimistic** |
| Freestyle time | 5.2 min | 3-5 min | plausible (upper end) |

The `2306-2450` options on 6S (3136-3449 g per motor, 282-353 A) are not physically achievable; the original
shows the "over" warning for them, which is correct.

## 4. Electronics and wiring

### 4.1 Flight controller

Named example: **SpeedyBee F405 V4** (Betaflight target `SPEEDYBEEF405V4`) [14]:

| Item | Value [14] |
|---|---|
| MCU | STM32F405 (168 MHz Cortex-M4F) |
| IMU (gyro/acc) | ICM-42688-P on SPI1 |
| OSD | AT7456E (MAX7456 clone) on SPI2 |
| Barometer | DPS310 (I2C) |
| Blackbox | microSD (SDSC/SDHC up to 32 GB, FAT16/32) on SPI3 |
| Size, mounting, mass | 41.6 x 39.4 x 7.8 mm, 30.5 x 30.5 mm with 4 mm holes (M3 grommets), 10.5 g |
| Input | 3-6S via the 8-pin ESC harness or BAT pad |
| BECs | 5 V 3 A total; 9 V 3 A total (VTX 9 V rail switchable by PINIO/USER1); 3.3 V 500 mA; 4.5 V USB-powered pad 1 A |
| Motor outputs | M1-M4 on the 8-pin ESC connector, M5-M8 on pads |
| UARTs | 6 (UART4 = onboard Bluetooth MSP at 115200; UART5 RX only = ESC telemetry) |
| LED / buzzer | WS2812 LED pad (+ 4 corner pads), BZ+/BZ- 5 V buzzer |
| Current sensor | from the ESC on the harness; with SpeedyBee BLS 55A use scale 400, offset 0 |

UART/pad map (SpeedyBee F405 V4) [14]:

| UART | Pads | Typical use |
|---|---|---|
| UART1 | T1/R1 (bottom edge, also DJI 6-pin connector pins 3/4) | DJI O3/O4 / Walksnail MSP DisplayPort, or analog VTX SmartAudio/Tramp (TX1) |
| UART2 | T2/R2 (top edge; SBUS pad = UART2 RX) | **ELRS receiver (CRSF)** default receiver UART |
| UART3 | T3/R3 | spare (GPS, second VTX control) |
| UART4 | none | Bluetooth (MSP) |
| UART5 | R5 "TEL" | ESC telemetry (only needed without bidirectional DShot) |
| UART6 | T6/R6 next to 4V5/SDA/SCL | GPS (+ compass on SDA/SCL I2C) |

8-pin ESC harness (FC side, top to bottom): GND, BAT, M1, M2, M3, M4, CUR, TEL; the ESC's connector pins run in
the opposite order (GND, VBAT, S1, S2, S3, S4, CURRENT, N/A as paired with the FC pins), so electrically
GND-GND, BAT-VBAT, M1-S1, M2-S2, M3-S3, M4-S4, CUR-CURRENT, TEL-N/A (the BLS 55A has no ESC telemetry) [25].

DJI 6-pin air-unit connector: 9V, G, T1, R1, G, SBUS(R2) [14].

### 4.2 ESC

| Item | Value |
|---|---|
| Type | 30.5 x 30.5 mm 4-in-1, 45-55 A continuous per channel, 3-6S. Named example: SpeedyBee BLS 55A: 55 A x 4 continuous, 70 A burst (10 s), 3-6S, ships with **BLHeli_S J-H-40** (8-bit; reflashable to Bluejay), ESC telemetry not supported, 1000 uF low-ESR cap in the box, 23.5 g [14][25] |
| Firmware | AM32 (current 32-bit), Bluejay (open source for BLHeli_S hardware), BLHeli_32 (discontinued, June 2024 [18]; "last release 32.10" unverified) |
| Protocol | DShot600 (the firmware default on DShot-capable builds unless the target overrides it [11: pg/motor.c]); bidirectional DShot for RPM telemetry |
| Config tool | ESC Configurator (web, for Bluejay/BLHeli_S/AM32) [19]; BLHeli_32 Suite (legacy) ; passthrough via the FC |

### 4.3 Receiver, video, GPS

- **Receiver:** ExpressLRS 2.4 GHz, CRSF protocol, full-duplex UART (TX and RX both wired), default 420000 baud
  set by the firmware for CRSF (`CRSF_BAUDRATE 420000` in `rx/crsf_protocol.h`; 416666 only when built with
  `USE_CRSF_OFFICIAL_SPEC`). Betaflight: Ports tab "Serial RX" on that UART,
  Receiver tab "Serial (via UART)" + provider CRSF [17]. `serialrx_provider` defaults to CRSF in builds that include
  CRSF [11: pg/rx.c]. Wire RX-pad TX to FC RX2, RX-pad RX to FC TX2, 5 V (or 3.3 V if the receiver needs it), GND.
- **Video, analog:** camera video to FC `CAM` pad, FC `VTX` pad (OSD overlaid by the AT7456E) to the VTX video in;
  VTX control by **SmartAudio** (TBS/most VTXs) or **IRC Tramp** on a UART TX pin.
- **Video, digital:** DJI O4/O3, Walksnail or HDZero: one UART (TX+RX) set to MSP with **MSP DisplayPort**
  (`osd_displayport_device`, Ports tab "VTX (MSP + DisplayPort)"), 9-12 V power, video handled inside the system.
- **GPS/compass (optional on a freestyle 5"):** u-blox M8/M10 GPS on a UART (UART6 on the SpeedyBee), compass on
  the I2C SDA/SCL pads; enables GPS Rescue.

### 4.4 Power

- XT60 connector (yellow). Convention: the **battery carries the female XT60** (recessed sockets, so a loose pack
  is hard to short) and the **quad's pigtail the male XT60** (exposed pins) [22]. Never fit two males.
- 12-14 AWG red (+) / black (-) battery leads.
- Low-ESR electrolytic capacitor across the ESC battery pads: **1000 uF, 35 V min for 6S** (50 V for margin),
  stripe (white band) = negative leg. Absorbs voltage spikes from ESC switching and regen braking, protecting the
  ESC MOSFETs and gyro/BEC electronics; reversed polarity vents/bursts it.
- BECs on the FC: 5 V for receiver, camera, buzzer, LEDs; 9 V for VTX / DJI air unit.
- Buzzer: 5 V active buzzer on BZ+/BZ-; DShot beacon (motors beep) as a lost-quad alarm.
- Wire colours: battery red/black; motor phase wires are all one colour (usually black or red, colour does not
  matter, any order); signal: CRSF/serial typically yellow/white (TX/RX), video yellow, 5 V red, GND black
  (manufacturer-dependent, unverified as a standard).

## 5. Firmware: Betaflight

### 5.1 Version

- Current stable on 2026-10-24: **Betaflight 2026.6.2** (released 2026-09-16) [1]. Previous line: 2025.12.x
  (latest 2025.12.5, 2026-06-28); legacy line 4.5.x (latest 4.5.5, 2026-06-28) [1].
- Naming: from 2025.12 Betaflight uses **calendar versions YYYY.M.PATCH**, a release about every 6 months, and the
  Configurator ("app") shares the firmware version [12]. There is no "4.6"; 4.5 was followed by 2025.12.
- 2025.12 removed user gyro alignment (`gyro_1_sensor_align`, `gyro_1_align_*` no longer exist); only board
  alignment remains: "If [the arrow] is facing forward ... your board alignment should be 0" [12].

### 5.2 Renamed or removed parameters (check every snippet against these)

| Old name (version) | Current name (2026.6.2) | Notes |
|---|---|---|
| `p_level` (3.5) / `angle_level_strength` (4.0-4.4) | **`angle_p_gain`** (4.5+) | 0-200, default 50 [2][11] |
| `i_level` (3.5) | none | no equivalent |
| `level_limit` (<=4.4) | **`angle_limit`** | 10-80 deg, default 60 [2][11] |
| `d_min_roll` (4.3-4.5, the low D) + `d_roll` (the max) | **`d_roll` (base D) + `d_max_roll` (boosted max)** | 2025.12+; defaults d 30/34/0, d_max 40/46/0 (roll/pitch/yaw) [11] |
| `dshot_idle_value` | **`motor_idle`** | renamed in 2025.12 (present as `dshot_idle_value` in 4.5.5, absent in 2026.6.2; PR number #13936 unverified) |
| `failsafe_off_delay` | removed (2025.12+) | |
| `gyro_1_sensor_align`, `gyro_1_align_yaw` | removed (2025.12+) | use `align_board_*` |
| `osd_timer_1`, `osd_timer_2` | never existed; real: **`osd_tim1`, `osd_tim2`** (packed) + `osd_tim_1_pos` | see 5.6 |
| `osd_stat_max_spd` etc. | **`osd_stat_bitmask`** (one 32-bit mask) | see 5.6 |
| `alt_hold_throttle_deadband` | never existed; real: **`alt_hold_deadband`** (2025.12+) | 0-70 % of stick, default 20 |
| `mini_quad` | never existed | the frame type is the mixer: `mixer QUADX` |

### 5.3 Initial setup (CLI, after flashing the target and connecting the Configurator)

```
# Betaflight 2026.6.2, SpeedyBee F405 V4, ELRS on UART2, analog VTX SmartAudio on UART1
mixer QUADX
set align_board_roll = 0
set align_board_pitch = 0
set align_board_yaw = 0            # arrow on the FC facing the nose; 180 if mounted backwards
set motor_pwm_protocol = DSHOT600
set dshot_bidir = ON               # bidirectional DShot, needed for the RPM filter; the stock SpeedyBee BLS 55A
                                   # (BLHeli_S J-H-40) cannot answer it: flash Bluejay first or arming is blocked (DSHOT_TELEM)
set motor_poles = 14               # count the magnets on the bell; 14 on 2306/2207
serial UART2 64 115200 57600 0 115200   # 64 = FUNCTION_RX_SERIAL
set serialrx_provider = CRSF
serial UART1 2048 115200 57600 0 115200 # 2048 = FUNCTION_VTX_SMARTAUDIO
set yaw_motors_reversed = OFF      # props in (ON = props out)
save
```

Source and syntax checks:
- `mixer` is a CLI command (`mixer list` / `mixer <name>`) [8]; QUADX is the default for a quad.
- `serial <port> <functionMask> <mspBaud> <gpsBaud> <telemetryBaud> <blackboxBaud>`; the port is a name (`UART2`)
  in 2025.12+ dumps (`"serial %s %d %ld %ld %ld %ld"`), and the parser still accepts the legacy number (`1` =
  UART2, it adds `SERIAL_PORT_UART1` to legacy ids) [8]. So the original's `serial 1 64 115200 57600 0 115200` is
  **accepted**, but the modern form is `serial UART2 64 ...`.
- Function bits [8]: MSP 1, GPS 2, RX_SERIAL 64, BLACKBOX 128, ESC_SENSOR 1024, VTX_SMARTAUDIO 2048, VTX_TRAMP 8192,
  RCDEVICE 16384, VTX_MSP 131072.
- `motor_pwm_protocol` table, in order [2]: `PWM, ONESHOT125, ONESHOT42, MULTISHOT, BRUSHED, DSHOT150, DSHOT300,
  DSHOT600, PROSHOT1000, DISABLED, DRONECAN`.
- `motor_poles` range 4-255, default 14 [2][11].

### 5.4 RPM filter (bidirectional DShot)

```
set dshot_bidir = ON
set motor_poles = 14
set rpm_filter_harmonics = 3       # 0 disables the RPM filter; range 0-3
set rpm_filter_min_hz = 100        # range 30-200
set rpm_filter_fade_range_hz = 50
set rpm_filter_q = 500
set rpm_filter_lpf_hz = 150
set rpm_filter_weights = 100,100,100
save
```
All values above are the 2026.6.2 defaults [11: pg/rpm_filter.c] and ranges from [2]. Requires ESC firmware with
bidirectional DShot (Bluejay, AM32, BLHeli_32 32.7+, JESC) [13: DSHOT RPM Filtering]. If an ESC does not answer,
Betaflight blocks arming with `DSHOT_TELEM` and the Motors tab shows RPM error rates. `dshot_edt` (lookup values
`OFF`, `ON`, `FORCE` [2]) enables Extended DShot Telemetry (temperature/voltage over the signal wire) [2].

### 5.5 Modes (`aux`)

Syntax [8]: `aux <slot> <modeId> <auxChannel> <start> <end> <logic> <linkedTo>` (the CLI help lists the first six;
`diff`/`dump` print all seven, `"aux %u %u %u %u %u %u %u"`); `modeId` is the permanent ID, `auxChannel` 0 = AUX1
(radio channel 5), ranges 900-2100 us in steps of 25, `logic` 0 = OR, 1 = AND (`MODELOGIC_OR = 0`).

Mode names and permanent IDs (2026.6.2) [7]:

| Mode | ID | | Mode | ID |
|---|---|---|---|---|
| ARM | 0 | | FLIP OVER AFTER CRASH (turtle) | 35 |
| ANGLE | 1 | | PREARM | 36 |
| HORIZON | 2 | | VTX PIT MODE | 39 |
| ALTHOLD | 3 | | PARALYZE | 45 |
| POS HOLD | 11 | | GPS RESCUE | 46 |
| BEEPER | 13 | | ACRO TRAINER | 47 |
| BLACKBOX | 26 | | LAUNCH CONTROL | 49 |
| FAILSAFE | 27 | | BEEPER MUTE | 52 |
| AIR MODE | 28 | | | |

There is no "ACRO" mode: Acro is what the FC does when ANGLE, HORIZON (and ALTHOLD/POS HOLD) are off.

```
aux 0 0 0 1700 2100 0 0     # ARM on AUX1 high
aux 1 1 1 1300 2100 0 0     # ANGLE on AUX2 mid and high (low = acro)
aux 2 2 1 1700 2100 0 0     # (alternative) HORIZON on AUX2 high
aux 3 13 2 1700 2100 0 0    # BEEPER on AUX3 high
aux 4 35 3 1700 2100 0 0    # turtle mode on AUX4 high
```

Mode settings:

```
# Angle (self-level)
set angle_limit = 60          # max tilt in degrees, 10-80, default 60
set angle_p_gain = 50         # self-level strength, 0-200, default 50 (was p_level / angle_level_strength)
set angle_feedforward = 50    # default 50 (0-200)
# Horizon
set horizon_level_strength = 75   # 0-100, default 75 (stored as the PID_LEVEL I term)
set horizon_limit_degrees = 135   # 10-250, default 135
set horizon_limit_sticks = 75     # 10-200, default 75 (stored as the PID_LEVEL D term)
# Acro rates (default rates_type = ACTUAL)
set rates_type = ACTUAL
set roll_rc_rate = 7          # ACTUAL: centre sensitivity / 10 -> 70 deg/s
set roll_srate = 67           # ACTUAL: max rate / 10 -> 670 deg/s at full stick
set roll_expo = 0
set p_roll = 45               # defaults: P 45, I 80, D 30, F 120, D max 40
set d_roll = 30
set d_max_roll = 40
# Air mode (keeps PID authority at zero throttle)
feature AIRMODE               # or an AIR MODE aux switch (ID 28)
# Altitude hold (2025.12+, needs a barometer and/or GPS)
set alt_hold_deadband = 20    # % of stick around hover, 0-70, default 20
set alt_hold_climb_rate = 50  # 0-200, default 50 = 5 m/s max climb/descent (units 0.1 m/s)
save
```

Rates formulas [11: fc/rc.c]:
- ACTUAL: `rate = stick * rc_rate*10 + max(0, srate*10 - rc_rate*10) * expo_curve(stick)`; full stick = `srate * 10`
  deg/s. Default 7/67 = 70 deg/s centre, 670 deg/s max [11: controlrate_profile.c].
- BETAFLIGHT: `rate = 200 * rc_rate/100 * stick / (1 - |stick| * srate/100)`; rc_rate 1.00 and super rate 0.70 give
  200 / 0.3 = **667 deg/s** at full stick.

`small_angle` [2][11]: arming is blocked (`ANGLE` flag) when the craft is tilted more than this many degrees;
range 0-180, default 25 (180 disables the check). `airmode_start_throttle_percent` 0-100.

### 5.6 OSD

- Elements are enabled through `*_pos` settings: value = `x | (y << 5)` plus profile-visibility bits
  (`OSD_PROFILE_BITS_POS 11`, so profile 1 = 0x0800 = 2048) [10]. Example: battery voltage at column 12, row 13 on
  profile 1: `set osd_vbat_pos = 2048 + 12 + 13*32 = 2476`. Common elements: `osd_vbat_pos`,
  `osd_avg_cell_voltage_pos`, `osd_current_pos`, `osd_mah_drawn_pos`, `osd_link_quality_pos`, `osd_rssi_dbm_pos`,
  `osd_flymode_pos`, `osd_warnings_pos`, `osd_crosshairs_pos`, `osd_ah_pos`, `osd_ah_sbar_pos`, `osd_tim_1_pos`,
  `osd_tim_2_pos`, `osd_craft_name_pos`, `osd_throttle_pos` [2].
- Timers: `osd_tim1` / `osd_tim2` are packed: `source | precision << 4 | alarm_minutes << 8` [10]. Sources: 0 ON,
  1 TOTAL_ARMED, 2 LAST_ARMED, 3 ON_OR_ARMED, 4 LAUNCH_TIME; precision 0 SECOND, 1 HUNDREDTHS, 2 TENTHS. Defaults: timer 1 = ON, seconds, alarm 10 -> 2560; timer 2 = TOTAL_ARMED -> 2561 [10].
  Race timer (last armed, hundredths, no alarm): `set osd_tim1 = 18`, then show it: `set osd_tim_1_pos = 2103`
  (x 23, y 1, profile 1).
- Post-flight stats: `osd_stat_bitmask` (uint32) [2]; bit order starts `RTC_DATE_TIME` 0, `TIMER_1` 1, `TIMER_2` 2,
  `MAX_SPEED` 3, ... `END_BATTERY`, `MAX_ALTITUDE` later [10]. To add max speed: OR 8 into the current value
  (`get osd_stat_bitmask` first). Max speed needs a GPS.
- Digital VTX (DJI O3/O4, Walksnail, HDZero): MSP DisplayPort on the air unit's UART; `osd_displayport_device`
  selects the OSD device: `NONE`, `AUTO`, `MAX7456`, `MSP`, `FRSKYOSD`, `FBOSD` (use `MSP` for a digital air unit,
  `MAX7456` or `AUTO` for analog) [2].
- Battery alarms: `osd_cap_alarm` (mAh, 0-20000), `bat_capacity` (mAh) [2].

### 5.7 VTX table and power (analog)

```
vtxtable bands 5
vtxtable channels 8
vtxtable band 1 BOSCAM_A A FACTORY 5865 5845 5825 5805 5785 5765 5745 5725
vtxtable band 2 BOSCAM_B B FACTORY 5733 5752 5771 5790 5809 5828 5847 5866
vtxtable band 3 BOSCAM_E E FACTORY 5705 5685 5665 5645 5885 5905 5925 5945
vtxtable band 4 FATSHARK F FACTORY 5740 5760 5780 5800 5820 5840 5860 5880
vtxtable band 5 RACEBAND R FACTORY 5658 5695 5732 5769 5806 5843 5880 5917
vtxtable powerlevels 3
vtxtable powervalues 14 20 26     # SmartAudio 2.1 takes dBm values
vtxtable powerlabels 25 100 400
set vtx_band = 5
set vtx_channel = 1               # R1 5658 MHz
set vtx_power = 1                 # index into the power table (1 = 25 mW)
set vtx_low_power_disarm = ON     # OFF / ON / UNTIL_FIRST_ARM
save
```
Bands/frequencies and the SmartAudio 2.1 power values are from the Betaflight VTX guide [13: VTX]; use the
manufacturer's table for a specific VTX. Pit mode: aux mode VTX PIT MODE (ID 39), `vtx_pit_mode_freq`.

### 5.8 Failsafe

Defaults (2026.6.2) [11: failsafe.c] and lookup names [2]:

| Setting | Default | Meaning |
|---|---|---|
| `failsafe_delay` | 15 (x 0.1 s = 1.5 s) | Stage 1 time after signal loss before Stage 2 |
| `failsafe_procedure` | `DROP` | Stage 2 action: `AUTO-LAND`, `DROP`, `GPS-RESCUE` |
| `failsafe_throttle` | 1000 | throttle for AUTO-LAND |
| `failsafe_landing_time` | 60 s | AUTO-LAND max time |
| `failsafe_switch_mode` | `STAGE1` | what the FAILSAFE aux switch does: `STAGE1`, `KILL`, `STAGE2` |
| `failsafe_throttle_low_delay` | 100 (x 0.1 s) | disarm straight away if throttle was low this long |
| `failsafe_stick_threshold` | 30 % | stick deflection to take back control from GPS Rescue |
| `failsafe_recovery_delay` | 5 (x 0.1 s = 0.5 s; 1 on RACE_PRO builds) | valid RX data needed before recovery and re-arming |

For freestyle the usual choice is `set failsafe_procedure = DROP` (stop motors and fall) away from people. ELRS
receivers must be set to "No pulses" failsafe so Betaflight sees the loss (unverified ELRS option name; ELRS
default sends no packets on loss).

### 5.9 Beeper

- `beeper` command lists/enables beeper conditions (e.g. `beeper -GYRO_CALIBRATED`), BEEPER aux mode (ID 13) for a
  lost-quad alarm, `beeper_dshot_beacon_tone` 1-5 makes the motors beep via DShot [2]. BEEPER MUTE aux mode (ID 52)
  silences it [7][13: Buzzer Mute Mode].
- Hardware: `beeper_inversion`, `beeper_od`, `beeper_frequency` (0 = active buzzer) [2].

### 5.10 Board alignment

`align_board_roll`, `align_board_pitch`, `align_board_yaw`, each -180..360 degrees [2]. FC arrow forward -> all 0;
arrow backwards -> `align_board_yaw = 180`; rotated 90 deg clockwise (seen from above) -> `align_board_yaw = 90`
(sign convention unverified; check the Setup tab 3D model by tilting the quad).

### 5.11 Motor direction reversal

Two independent things:
1. **Physical spin (ESC side):** (a) Configurator Motors tab, "Motor direction" (sends DShot direction commands with
   props off and a battery plugged in; available when DShot is used) (unverified exact dialog name in 2026.6);
   (b) ESC Configurator / BLHeli_32 Suite / AM32 config: Motor Direction Normal/Reversed per ESC [19]; (c) swap
   any two of the three motor wires.
2. **Mixer expectation (FC side):** `set yaw_motors_reversed = ON` for props out, `OFF` for props in [5][13]. This
   only flips the yaw mixing sign (`if (!yaw_motors_reversed) scaledAxisPidYaw = -scaledAxisPidYaw;` [5]); it never
   changes how a motor spins.

### 5.12 Accelerometer calibration

- Configurator Setup tab, "Calibrate Accelerometer", quad on a level surface (frame level, not the camera); result
  stored in `acc_calibration` (4-value array) [2]. Acc trims: `acc_trim_roll`, `acc_trim_pitch` [2].
- Stick commands (disarmed, roll centred; "pitch low" = pitch stick pulled back towards the pilot) [9]: gyro
  calibration **throttle low + yaw left + pitch low** (`THR_LO + YAW_LO + PIT_LO + ROL_CE`); accelerometer
  **throttle high + yaw left + pitch low**; compass **throttle high + yaw right + pitch low**.
- Gyro calibrates automatically at boot (keep still); `gyro_cal_on_first_arm` option [2].
- Arming-disable flag `NO_ACC_CAL` [6] (`ARMING_DISABLED_ACC_CALIBRATION`, bit 23): set when an accelerometer is
  detected, has never been calibrated, and something uses it: an aux range for ANGLE, HORIZON, ALTHOLD, POS HOLD,
  GPS RESCUE, CAMSTAB, CALIB or ACRO TRAINER; LAUNCH CONTROL with an angle limit; an OSD element that needs the
  accelerometer (e.g. artificial horizon); or `failsafe_procedure = GPS-RESCUE` [21: `accNeedsCalibration()`].

### 5.13 Arming-disable flags (2026.6.2, in bit order) [6]

`NOGYRO, FAILSAFE, RXLOSS, NOT_DISARMED, BOXFAILSAFE, RUNAWAY, CRASH, THROTTLE, ANGLE, BOOTGRACE, NOPREARM, LOAD,
CALIB, CLI, CMS, BST, MSP, PARALYZE, GPS, RESCUE_SW, DSHOT_TELEM, REBOOT_REQD, DSHOT_BBANG, NO_ACC_CAL, MOTOR_PROTO,
FLIP_SWITCH, ALT_HOLD_SW, POS_HOLD_SW, AUTOPILOT_SW, ARM_SWITCH`

Most common on a new build: `RXLOSS` (no receiver link), `THROTTLE` (throttle not low), `ANGLE` (tilted more than
`small_angle`), `ARM_SWITCH` (arm switch already on at boot), `NOT_DISARMED`, `CLI`/`MSP` (Configurator connected),
`BOOTGRACE`, `CALIB` (gyro calibrating), `DSHOT_TELEM` (bidir DShot on but no ESC telemetry), `NOPREARM` (PREARM
mode configured but not on), `RUNAWAY` (runaway takeoff prevention tripped), `ALT_HOLD_SW` / `POS_HOLD_SW` (meaning inferred from the names: arming
with those modes active). The `status` CLI command and the Setup tab list the active flags.

### 5.14 Errors in the original's CLI (and the correct form)

| Original snippet | Problem | Correct (2026.6.2) |
|---|---|---|
| `set alt_hold_throttle_deadband = 15` | no such setting | `set alt_hold_deadband = 15` (2025.12+, needs baro/GPS) |
| `aux 1 ANGLE ...` / `aux 2 ALTHOLD ...` | `aux` takes numeric permanent IDs, not names | `aux 1 1 1 1300 2100 0 0` (ANGLE), `aux 2 3 2 1700 2100 0 0` (ALTHOLD) |
| `set p_level = 50`, `set i_level = 50` | removed after 3.5 | `set angle_p_gain = 50`; no `i_level` |
| `set roll_rc_rate = 100` + `set roll_srate = 70` "~540 deg/s" | default rates are ACTUAL, where this is 1000 deg/s linear; under BETAFLIGHT rates it is 667 deg/s; never 540 | ACTUAL: `set roll_rc_rate = 7`, `set roll_srate = 54` for 540 deg/s (67 = 670 default) |
| `set d_roll = 40` | valid, but since 2025.12 `d_roll` is the base D and `d_max_roll` the peak | `set d_roll = 30`, `set d_max_roll = 40` (defaults) |
| `set osd_timer_1 = ON` | no such setting; timers are packed numbers | `set osd_tim1 = 18` + `set osd_tim_1_pos = 2103` |
| `set osd_stat_max_spd = ON` | no such setting | OR bit 3 (value 8) into `osd_stat_bitmask` |
| `serial 1 64 115200 57600 0 115200` | accepted (legacy id) | `serial UART2 64 115200 57600 0 115200` |
| `set mini_quad = ON` (current SimLab, audit DR-08) | not a Betaflight setting | `mixer QUADX` |
| `set align_board_yaw = 0`, `set motor_pwm_protocol = DSHOT600`, `set yaw_motors_reversed = OFF`, `resource`, `save` | valid | keep |

## 6. Safety tests

| Test | How | Tool | What it catches |
|---|---|---|---|
| **Smoke stopper** | A plug-in fuse/current limiter between battery and quad for the first power-up: usually a resettable PTC fuse or a small incandescent bulb (or a dedicated "smoke stopper" board, e.g. a MOSFET current limiter) in series with the positive lead. If there is a short, the bulb lights / fuse trips and limits current to about 1-3 A, so the ESC/FC does not burn. (Limit figure unverified per product.) | inline device | solder bridges, reversed battery leads, shorted motor wires, frame shorts from bare leads touching carbon |
| **Props-off motor test** | Props OFF, battery on, Configurator Motors tab: enable "I understand the risks", raise each motor slider (or the master) slightly; check that M1..M4 spin in the positions and directions of 2.2 | Betaflight App (Configurator) Motors tab | wrong motor order/remap, reversed spin, dead ESC channel, protocol problems |
| **Receiver test** | Receiver tab: sticks move the right channels (AETR1234), centre 1500, ends ~1000/2000; arm switch on the right AUX | Receiver tab | channel map, endpoints, wrong AUX |
| **Board alignment / 3D model** | Setup tab: tilt the quad nose down/up/roll/yaw; the 3D model must follow | Setup tab | FC mounted rotated, wrong `align_board_*` |
| **Accelerometer calibration** | level surface, "Calibrate Accelerometer" (or stick command) | Setup tab | drift in Angle/Horizon mode, bad horizon line |
| **Compass calibration** (GPS builds) | "Calibrate Magnetometer", rotate the quad on all axes for 30 s; check heading on the OSD/Setup tab | Setup tab | wrong `align_mag`, magnetic interference, GPS Rescue flying away ("toilet bowl") |
| **Failsafe test** | props off, armed, switch the radio off: motors must stop (DROP) or do the set action; Failsafe tab | radio + Motors/OSD | receiver failsafe set to hold last position |
| **Pre-arm checks** | Setup tab / `status` lists arming-disable flags; arm on the bench props off | Setup tab / CLI | see 5.13 |

## 7. Flight characteristics (6S 5" freestyle, typical)

| Quantity | Typical value | Notes |
|---|---|---|
| AUW | 600-700 g with battery (unverified) | analog lighter, DJI O4 + GoPro heavier (750-850 g) |
| T:W | 8-14 : 1 | |
| Hover throttle | 20-30 % | |
| Hover current | ~6-10 A on 6S (130-220 W) (unverified) | |
| Peak current | 120-180 A bursts | ESC 45-55 A per channel |
| Flight time | 3-5 min freestyle on 6S 1050-1300 mAh; 6-8 min gentle | pilot report: 4:30-6:50 on 6S 1300 mAh at ~640 g AUW [24] |
| Top speed | ~120-160 km/h in a full-throttle dive or straight line (unverified) | |
| Max rotation rate | 670 deg/s default rates; freestyle pilots use 600-1000 deg/s | [11] |
| Motor out | a quad has no redundancy: losing one motor or prop gives an immediate uncontrolled yaw spin and fall | |

## 8. Real failure modes

| Failure | Cause | What the pilot sees |
|---|---|---|
| Desync | ESC loses rotor position (high KV on 6S, cheap ESC timing, aggressive throttle punches, damaged motor) | one motor stutters/stops mid-punch; quad flips or drops, "death roll"; Blackbox shows one motor at 100% without RPM |
| Brown-out | voltage sag on punch-outs resets the FC/VTX (weak BEC, bad pack, no cap) | video cuts/rolls, OSD resets, quad falls out of the sky |
| Reversed motor or swapped props | wrong spin direction or CW prop on a CCW motor | flips violently on take-off, or yaw spins; immediately at arming throttle |
| Wrong motor order | ESC pads mapped to the wrong M number | flips on take-off |
| Wrong board alignment | FC arrow not forward and `align_board_yaw` not set | instant flip at take-off (PID corrects the wrong way) |
| Missing / dead capacitor | ESC voltage spikes | gyro noise, video lines, ESC MOSFET death, sometimes fire; reversed cap vents |
| Prop wash | descending into own turbulent air | oscillation/wobble when descending or after flips; tune D/filters, RPM filter |
| Bent prop / bell / bad bearing | crash damage | vibration, hot motors, jello in video, oscillation |
| Gyro noise / no RPM filter | soft-mount failure, loose screws | hot motors, wobbles, "fly-aways" in extreme cases |
| Runaway takeoff | wrong motor order/direction or alignment | quad shoots up/sideways on arming; Betaflight's runaway takeoff prevention disarms it (`RUNAWAY` flag) |
| GPS/compass errors (GPS builds) | wrong `align_mag`, interference, few satellites | GPS Rescue flies away or circles ("toilet bowl") |
| Failsafe misconfigured | receiver holds last values | quad flies away on signal loss instead of dropping |
| LiPo damage | over-discharge below 3.0 V/cell, puncture | puffing, sag, fire risk |
| Video loss | antenna loose, VTX overheating without airflow | static/blackout; VTX can burn without an antenna |

## 9. Uncertainties

- Hardware masses and thrust: no manufacturer thrust table was fetched for 2306 1750 KV / 2207 1950 KV on 6S
  (sites blocked automated access). The thrust, battery and part masses in 3 are ranges from general knowledge,
  marked (unverified).
- Frame figures other than the Source One V5 (wheelbase, arm thickness, top plate) are unverified.
- Hover current and hover time ranges in 3.5 and 7 are unverified estimates.
- Configurator UI names ("Motor direction" dialog, "Motor remap") in the 2026.6 app are unverified.
- The flight-time figures in 7 come from a forum thread [24]; the hover-current range is an estimate.
- No official thrust table: the T-Motor figures [23] are a retailer copy of the spec, not a dyno test.
- Regulatory power limits for 5.8 GHz are country-specific and unverified here.

## Verification

Adversarial fact-check, 2026-10-24, against sources fetched fresh for this check (Betaflight source at tag
2026.6.2 via raw.githubusercontent.com, the betaflight/config board file, the betaflight.com board and VTX docs, the
SpeedyBee product page and stack manual PDF, vendor pages). GH = `https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/`.

| # | Claim | Status | Source | Old -> new (corrections) |
|---|---|---|---|---|
| 1 | Current stable 2026.6.2 (2026-09-16); 2025.12.5 and 4.5.5 on 2026-06-28 | confirmed | https://api.github.com/repos/betaflight/betaflight/releases | |
| 2 | QuadX mixer table, output order REAR_R, FRONT_R, REAR_L, FRONT_L, with the listed coefficients | confirmed | GH `flight/mixer_init.c` L84-89 | |
| 3 | Props-in default spin M1 CW, M2 CCW, M3 CCW, M4 CW; `yaw_motors_reversed` only flips the yaw sign | confirmed | GH `flight/mixer.c` L716-717 (`if (!yaw_motors_reversed) scaledAxisPidYaw = -scaledAxisPidYaw`) | |
| 4 | SpeedyBee F405 V4 8-pin harness maps FC M1..M4 to ESC S4..S1 | **corrected** | SpeedyBee stack manual p.5 and p.18 [25]; betaflight.com SPEEDYBEEF405V4 doc | old: M1..M4 -> S4..S1 ("reversed labels"); new: straight pairing M1-S1 ... M4-S4, BAT-VBAT, CUR-CURRENT, TEL-N/A; only the ESC connector's pin listing order is reversed |
| 5 | `motor_pwm_protocol` lookup order PWM ... PROSHOT1000, DISABLED, DRONECAN | confirmed | GH `cli/settings.c` L315-319 | |
| 6 | DShot600 is the default on DShot-capable builds unless the target overrides | confirmed | GH `pg/motor.c` L56-70 | |
| 7 | Serial function bits MSP 1, GPS 2, RX_SERIAL 64, BLACKBOX 128, ESC_SENSOR 1024, SMARTAUDIO 2048, TRAMP 8192, RCDEVICE 16384, VTX_MSP 131072 | confirmed | GH `io/serial.h` L37-56 | |
| 8 | `serial %s %d %ld %ld %ld %ld` dump format; legacy numeric id + SERIAL_PORT_UART1; `aux` prints 7 fields | confirmed | GH `cli/cli.c` L1270, 1384, 1439 | |
| 9 | Mode permanent IDs (ARM 0, ANGLE 1, HORIZON 2, ALTHOLD 3, POS HOLD 11, BEEPER 13, BLACKBOX 26, FAILSAFE 27, AIR MODE 28, turtle 35, PREARM 36, VTX PIT 39, PARALYZE 45, GPS RESCUE 46, ACRO TRAINER 47, LAUNCH CONTROL 49, BEEPER MUTE 52) | confirmed | GH `msp/msp_box.c` L49-101 | |
| 10 | Arming-disable flag names and order (NO_ACC_CAL = bit 23) | confirmed | GH `fc/runtime_config.c` `armingDisableFlagNames[]` | |
| 11 | RPM filter defaults 3 / 100 / 50 / 500 / 150 / 100,100,100; ranges harmonics 0-3, min_hz 30-200 | confirmed | GH `pg/rpm_filter.c` L33-38; `cli/settings.c` L1970-1973 | |
| 12 | `dshot_edt` values OFF/ON/BEEP/DISARM | **corrected** | GH `cli/settings.c` L163-165 `lookupTableDshotEdt` | old: OFF/ON/BEEP/DISARM; new: OFF/ON/FORCE |
| 13 | Failsafe defaults (delay 15, DROP, throttle 1000, landing 60, STAGE1, low_delay 100, stick 30, recovery 5 / 1 on RACE_PRO) and lookup names | confirmed | GH `flight/failsafe.c` L72-89; `cli/settings.c` L337, 341 | |
| 14 | PID defaults roll P45 I80 D30 F120, pitch D 34, d_max 40/46/0; level `angle_p_gain` 50, `horizon_level_strength` 75 (I), `horizon_limit_sticks` 75 (D), `angle_feedforward` 50; `angle_limit` 60 (10-80), `horizon_limit_degrees` 135 (10-250) | confirmed | GH `flight/pid.h` L64-67; `flight/pid.c` L132-155; `cli/settings.c` L1274-1282 | |
| 15 | Default rates ACTUAL 7 / 67 / expo 0; ACTUAL and BETAFLIGHT formulas; 100/70 -> 1000 deg/s linear (ACTUAL), 667 deg/s (BETAFLIGHT) | confirmed | GH `fc/controlrate_profile.c` L48-57; `fc/rc.c` L190-242 | |
| 16 | `small_angle` default 25 (180 on RACE_PRO), range 0-180 | confirmed | GH `flight/imu.c` L120-129; `cli/settings.c` L1112 | |
| 17 | `alt_hold_deadband` 20 (0-70), `alt_hold_climb_rate` 50 (0-200, 0.1 m/s) | confirmed | GH `pg/alt_hold_multirotor.c` L37-38; `cli/settings.c` L1176-1177 | |
| 18 | Battery defaults warning 350, min 330, max 430 (0.01 V) | confirmed | GH `sensors/battery.c` L115-117; `sensors/battery.h` L35-36 | |
| 19 | OSD position x + (y << 5), profile bit 11; timer packing src + (prec << 4) + (alarm << 8); defaults 2560 / 2561; race timer 18; stat bit order RTC 0, TIMER_1 1, TIMER_2 2, MAX_SPEED 3 | confirmed | GH `osd/osd.h` L67-108, L253-256, L297-308; `osd/osd.c` L326-329 | |
| 20 | Renamed/removed: `dshot_idle_value` -> `motor_idle`, `d_min_roll` gone, `failsafe_off_delay` gone, `gyro_1_sensor_align` gone, `d_max_roll` exists | confirmed (PR #13936 number unverified) | 4.5.5 vs 2026.6.2 `fc/parameter_names.h` and `cli/settings.c` | |
| 21 | SpeedyBee F405 V4: STM32F405, ICM42688P on SPI1, AT7456E/MAX7456 on SPI2, DPS310 on I2C1, SD on SPI3, 41.6 x 39.4 x 7.8 mm, 4 mm holes, 10.5 g, BECs 5 V 3 A / 9 V 3 A / 3.3 V 500 mA / 4.5 V 1 A, 6 UARTs (UART4 BT MSP 115200, UART5 RX ESC telemetry), RX default UART2, current scale 400 | confirmed | SpeedyBee product page [14]; board config [26]; betaflight.com board doc | |
| 22 | DJI 6-pin connector 9V, G, T1, R1, G, SBUS(R2) | confirmed | betaflight.com SPEEDYBEEF405V4 doc | |
| 23 | 4-in-1 ESC mass ~10-16 g | **corrected** | SpeedyBee product page [14] | old: ~10-16 g, verdict "slightly light"; new: ~15-25 g (BLS 55A 23.5 g), verdict "light" |
| 24 | Stack ESC firmware / bidir DShot on the named stack | **corrected (added)** | SpeedyBee product page [14]; manual [25] | old: snippet implied `dshot_bidir = ON` works on the named stack; new: stock BLS 55A runs BLHeli_S J-H-40 without telemetry, flash Bluejay first |
| 25 | BLHeli_32 ended 30 June 2024; last release 32.10 | **unverified** (date) | https://oscarliang.com/end-of-blheli_32 (dated 3 June 2024, gives no 30 June date) | old: "ended 30 June 2024"; new: "ended June 2024 (exact date unverified)"; 32.10 marked unverified |
| 26 | CRSF 420000 baud (was marked unverified) | confirmed | GH `rx/crsf_protocol.h` L33-37; `pg/rx.c` L37-40 (CRSF default provider) | old: "(unverified figure in source)"; new: confirmed, 416666 only with USE_CRSF_OFFICIAL_SPEC |
| 27 | VTX band tables A/B/E/F/R and SmartAudio 2.1 power values 14/20/26 dBm, labels 25/100/400 | confirmed | https://github.com/betaflight/betaflight.com/blob/master/docs/wiki/guides/current/VTX.md L112-152 | |
| 28 | Stick commands: gyro THR_LO+YAW_LO+PIT_LO, acc THR_HI+YAW_LO+PIT_LO, mag THR_HI+YAW_HI+PIT_LO | confirmed | GH `fc/rc_controls.c` L258, 304, 312 | |
| 29 | Source One V5: 226 mm, 6 mm arms, 2 mm top plate; added 2.5 mm bottom plate, 30/22 mm standoffs, 118 g | confirmed (added detail) | https://oscarliang.com/source-one-v5 | old: bottom plate, standoffs, frame mass "(unverified)"; new: Source One V5 figures |
| 30 | 2306 motor: 16 x 16 mm M3 mount, M5 prop shaft, 14 poles, 30.4 g (1700 KV), 2400 KV is 3-4S | confirmed | https://www.flyingtech.co.uk/product/emax-eco-ii-series-2306-motor-1700kv-1900kv-2400kv/ | old: motor mount "(unverified per motor)"; new: confirmed for EMAX ECO II 2306 |
| 31 | XT60: female on the battery, male on the quad | confirmed (single vendor source) | https://www.myfpvstore.com/accessories/xt60-power-connectors-set-of-male-female/ | |

Not re-checked here (left as the researcher marked them): hardware mass/thrust/flight-time ranges in 3 and 7,
Configurator UI dialog names, ELRS failsafe option names, regulatory power limits, and the `PINIO1`/USER1 9 V switch
(the board config sets `PINIO1_CONFIG 129`, `PINIO1_BOX 0`; how that maps to a USER1 switch is unverified).
