# ESP32-S3-DevKitC-1 v1.1 (Espressif) - fact sheet

**Product modelled:** Espressif **ESP32-S3-DevKitC-1 v1.1**, PCB design `ESP32-S3-DevKitC-1_V1.1_20220429` (Espressif task #35632, Rev 1.1, dated 2022-04-29), schematic `SCH_ESP32-S3-DevKitC-1_V1.1_20221130`. Default variant for iynk: **ESP32-S3-DevKitC-1-N8R8** (module ESP32-S3-WROOM-1-N8R8: 8 MB quad flash + 8 MB octal PSRAM, PCB antenna) [1][3].

**What it is.** An entry-level, breadboard-friendly development board: a long narrow black PCB (25.40 mm wide) carrying one ESP32-S3-WROOM-1 (or -1U / -2) module at one end, whose PCB antenna overhangs the board edge, and two **Micro-USB** receptacles at the other end. The left one ("UART") goes through a Silicon Labs **CP2102N** USB-to-UART bridge to UART0; the right one ("USB") goes straight to the ESP32-S3's own full-speed USB (GPIO19/20, USB-Serial-JTAG or USB-OTG). Between them sit an SGM2212-3.3 LDO (5 V to 3.3 V), a red power LED, an addressable RGB LED (SK68XXMINI-HS, a WS2812-protocol part) on **GPIO38**, two auto-program transistors, and BOOT/RESET tact switches. All usable GPIOs come out on two 1x22 2.54 mm headers (J1, J3) [1][2][4].

> **Corrections to common assumptions (and to the original Robotics Bench Fig. 04):**
> - The official v1.1 board has **two Micro-USB (Micro-B) ports, not USB-C** [1][2][4]. The user guide lists "USB 2.0 cable (Standard-A to Micro-B)" [1]. USB-C versions on the market are third-party clones (unverified which), not this product.
> - The LDO is an **SGM2212-3.3XKC3G/TR** (SOT-223), not an AMS1117 [3][4].
> - The RGB LED is an **SK68XXMINI-HS** (3.5 x 3.5 mm, WS2812-compatible protocol) on **GPIO38** on v1.1; GPIO48 was v1.0 [1][3].
> - BOOT is **SW1** (left, next to the UART port) and RESET is **SW2** (right, next to the USB port) [3][4]. Fig. 04 had SW1=RST, SW2=BOOT.
> - The board corner radius is **0.5 mm**, not 1.2 mm [4].

---

## 1. Sources

1. Espressif, *ESP32-S3-DevKitC-1 v1.1 user guide* (esp-dev-kits docs, `docs/en/esp32-s3-devkitc-1/user_guide_v1.1.rst`, master, fetched 2026-10-24; HTML at https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.1.html). Component list, ordering table, power options, J1/J3 pin tables, v1.0 vs v1.1 note, octal-PSRAM note.
2. Espressif, *ESP32-S3-DevKitC-1 Dimensions*, `DXF_ESP32-S3-DevKitC-1_V1.1_20220429.pdf/.dxf` (https://dl.espressif.com/dl/schematics/esp_idf/DXF_ESP32-S3-DevKitC-1_V1.1_20220429.pdf). 25.40 x 62.74 mm, 1.27 mm header edge offsets, 2.54 mm pitch, 8.00 mm last pin to USB edge, silkscreen layer, antenna keep-out "MINI-ANT-TYPEB" beyond the top edge.
3. Espressif, schematic `SCH_ESP32-S3-DevKitC-1_V1.1_20221130.pdf` (and `..._V1.1_20220413`, and v1.0 `SCH_ESP32-S3-DEVKITC-1_V1_20210312C.pdf`) from https://dl.espressif.com/dl/schematics/. Part numbers and values, nets.
4. Espressif, *ESP32-S3-DevKitC-1 Reference Design* zip (https://dl.espressif.com/dl/schematics/ESP32-S3-DevKitC-1_Reference_Design.zip): PADS PowerPCB ASCII `PCB_ESP32-S3-DevKitC-1_V1.1_20220429.asc`, Gerbers + NC drill `Gerber_ESP32-S3-DevKitC-1_V1.1_20220429`, BOM `BOM(V0.3)_ESP32-S3-DevKitC-1_XX_TTNNVV.xlsx`, assembly drawing. **All coordinates below were extracted from the .asc** (parts section: decal, side, rotation, origin; decal pads for footprint extents; `*ROUTE*`/`*SIGNAL*` section for nets; `BOARD` line for the outline) and from the NC drill file for holes, with my own Python parsers.
5. Espressif, *ESP32-S3-WROOM-1 / WROOM-1U datasheet* (https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf). Module variants, 18.0 x 25.5 mm size (1U 18.0 x 19.2), pin table, octal-PSRAM and 1.8 V GPIO47/48 notes, 40 MHz crystal.
6. Espressif, *ESP32-S3 Series Datasheet v2.2* (https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf). Strapping pins, boot modes, VDD_SPI, absolute max ratings, DC characteristics (IOH 40 mA, IOL 28 mA, 45 kOhm pulls), ADC, touch.
7. Espressif, *ESP32-S3-WROOM-2 datasheet* (for the N32R16V variant).
8. Silicon Labs, *CP2102N datasheet* (QFN28 5 x 5 mm, VID 0x10C4 / PID 0xEA60, 3 Mbaud).
9. espressif/arduino-esp32 **3.3.12** (latest release, 2026-09-18): `variants/esp32s3/pins_arduino.h` (`PIN_RGB_LED 48`, `RGB_BUILTIN`, `RGB_BRIGHTNESS 64`, USB VID 0x303A PID 0x1001), `cores/esp32/esp32-hal-rgb-led.h` (`rgbLedWrite`, deprecated `neopixelWrite`), `esp32-hal-ledc.h` (`ledcAttach`, `ledcWrite`), `boards.txt` (`esp32s3` = "ESP32S3 Dev Module").
10. GitHub releases API (2026-10-24): esptool **v5.6.0** (2026-10-15), ESP-IDF **v6.1** (2026-08-27), MicroPython **v1.29.0** (2026-08-24).
11. Espressif annotated photo `ESP32-S3-DevKitC-1_v2-annotated-photo.png` and isometric photos `esp32-s3-devkitc-1-v1.1-isometric.png` (from the docs `_static` folder): colours, chip markings.
12. /Users/amar/Codes/ak/simlab/docs/research/robotics-bench-a.md, section 6 (Fig. 04), for the cross-check.
13. Arduino-ESP32 Boards Manager index https://espressif.github.io/arduino-esp32/package_esp32_index.json (platform 3.3.12 tool dependencies: esptool_py 5.3.1).
14. espressif/esptool v5.6.0 source (`esptool/__init__.py`, `cmds.py`, `loader.py`, `targets/esp32s3.py`): exact console strings.
15. v1.0 design files: `SCH_ESP32-S3-DEVKITC-1_V1_20210312C.pdf`, `DXF_ESP32-S3-DevKitC-1_V1_20210312CB.dxf/.pdf`, `PCB_ESP32-S3-DevKitC-1_V1_20210312CB.pdf` (for the v1.0 vs v1.1 comparison).
16. MicroPython download page https://micropython.org/download/ESP32_GENERIC_S3/ (fetched 2026-10-24): v1.29.0, Octal-SPIRAM build, flash at address 0.
17. SG Micro, *SGM2212 High PSRR, Low Dropout Linear Regulator* datasheet (Rev. A, 2023; distributor copy https://www.endrich.com/Datenbl%C3%A4tter/Aktive%20Komponenten/1690103353.pdf, product page https://sg-micro.com/product/SGM2212). Input range, abs max, dropout, current limit, thermal shutdown, SOT-223 pinout. (Added by the fact-check.)

---

## 2. Geometry (board frame)

**Frame.** Component (top) side up, viewed from above, **USB end at the bottom**, module/antenna end at the top. In this orientation the header labels and "BOOT/RESET/UART/USB" silkscreen read upright (this is also how Espressif draws the dimension drawing [2]). Origin = bottom-left corner of the outline; +x right, +y up (towards the antenna); mm. The PADS design uses exactly this frame (origin at the bottom-left outline corner, top view), so the CAD numbers are used directly [4].

### 2.1 Outline, holes, colours

| Item | Value | Source |
|---|---|---|
| Outline | **25.40 x 62.74 mm** (dimension drawing [2] and the BOM PCB line "62.74*25.4*1.6mm" [4]). The PADS BOARD outline polyline runs (0,0)-(25.40,62.865); the 0.125 mm excess is within one outline line width (0.127 mm) and is ignored. **Use 25.40 x 62.74.** | [2], [4] BOM |
| Corner radius | **0.5 mm** (all four corners, arcs in the BOARD outline) | [4] |
| Thickness | **1.6 mm**, 2 layers, ENIG (immersion gold) finish, 90 Ohm controlled-impedance USB traces | [4] BOM PCB line |
| Layers | 2 copper layers (PADS MAXIMUMLAYER 2) | [4] |
| Mounting holes | **None.** Only plated header holes (44 x d 1.016 mm), 4 x d 0.60 mm Micro-USB peg holes, 8 x d 0.65 mm slotted shell holes, and 0.25 mm vias | [4] drill |
| Solder mask | **Matte black** ("哑光黑色阻焊") | [4] BOM, [11] |
| Silkscreen | **White** ("白色字符") | [4] BOM, [11] |
| Module | ESP32-S3-WROOM-1, 18.0 x 25.5 x 3.1 mm (module PCB 0.8 mm + shield) [5]: silver metal RF shield can with laser-etched label; the antenna end of the module PCB is exposed (dark solder mask over the meander trace) | [5], [11] (see 8) |

**Module overhang.** The module's antenna end sticks out **beyond the top board edge**: module body spans y = 43.65 to 69.15 (25.5 mm long, 18.0 mm wide, x = 3.75 to 21.75), so it overhangs the outline top edge (62.74) by **about 6.4 mm**; the dimension drawing shows the antenna block ("MINI-ANT-TYPEB") outside the board outline [2]. The antenna keep-out in the footprint is x 3.75..21.75, y 62.84..69.15 [4]. Overall length board + module overhang = **~69.15 mm**.

### 2.2 Parts (all on the top side except the headers, which are inserted from the bottom)

Centre = pad-extent centre from the .asc decal. Rotation = PADS rotation (degrees CCW, 0 = decal default). Footprint = pad extent (w along x, h along y in board frame). Heights are the "H" values in Espressif's BOM [4] (or the module datasheet [5]) unless marked otherwise.

| Des | What | Package | Centre (x, y) | Rot | Footprint w x h | Height | Colour / marking |
|---|---|---|---|---|---|---|---|
| U4 | ESP32-S3-WROOM-1-N8R8 module (or variant, see 3.1) | 41-pad castellated module 18.0 x 25.5 | **(12.75, 56.40)** body; pads (12.75, 52.62) | 0 (antenna up) | body 18.0 x 25.5 (pads span x 3.25..22.25, y 43.14..62.10) | 3.1 +/- 0.15 [5] | silver shield, etched "ESP32-S3-WROOM-1", "N8R8", FCC/CE IDs, QR code (estimated from [11]) |
| U3 | CP2102N-A02-GQFN28 USB-UART bridge | QFN-28 5 x 5 mm, 0.5 mm pitch | (13.589, 20.142) | 270 | 5.7 x 5.7 (pads), body 5.0 x 5.0 | 0.8 [4] BOM | black, Silicon Labs logo, "CP2102N", "A02..." date code; pin-1 dot at top-right corner (16.29, 22.74) |
| U2 | SGM2212-3.3XKC3G/TR 3.3 V LDO | SOT-223 | (13.488, 36.373) | 270 | 8.3 x 6.1 (pads) | 1.8 [4] BOM | black, tab (pin 4, VOUT) on the right, three legs on the left |
| D6 | SK68XXMINI-HS addressable RGB LED (WS2812 protocol), DIN = GPIO38 via R17; BOM alternate **Worldsemi WS2812B-Mini-V3** [4] | 3535, 4-pad | (7.493, 29.083) | 270 | 2.8 x 4.8 (pads), body 3.5 x 3.5 | 1.9 [4] BOM | white body, clear lens with a visible die; silk "RGB@IO38" just above it |
| D5 | Red power LED (3V3), series R11 5.1 kOhm | 0603 | (19.101, 34.976) | 270 | 0.9 x 2.5 | 0.6 [4] | pale/white lens when off (estimated from [11]), red when lit; NationStar FC-DA1608HRK-620D; silk "D5" |
| SW1 | **BOOT** button (GPIO0 to GND) NTC013-AT1J-A160T | 4-pad SMD tact | **(7.525, 13.959)** | 180 | pads 5.2 x 2.8, body **4.2 x 3.2** | **2.5** [4] BOM | metal frame, round **black stem** (BOM "Stem Black Color") with copper-coloured ring [11]; 1.57 N operating force; silk "BOOT" above |
| SW2 | **RESET** button (CHIP_PU to GND) NTC013-AT1J-A160T | same | **(17.905, 13.959)** | 180 | same | same | same; silk "RESET" above |
| J2 | Micro-USB B receptacle, **"UART"** (to CP2102N) | 5-pin SMD + 4 through-hole shell pegs | (6.000, 3.662) | 90 | pads 8.2 x 5.27 | 3.0 (alt. part 2.61) [4] BOM | nickel shell (MinLe 1110-205001 or U-wilcome I42-0531-3121); opening faces -y (bottom edge); silk "UART" above |
| J4 | Micro-USB B receptacle, **"USB"** (native ESP32-S3 USB) | same | (19.400, 3.662) | 90 | same | same | silk "USB" above |
| Q1, Q2 | L8050QLT1G NPN (auto-program) | SOT-23 | Q1 (17.780, 29.083), Q2 (12.573, 29.083) | 90 | 2.55 x 3.3 | 1.11 [4] | black, marking "J3Y" (estimated from [11]) |
| D1 | 1N5819HW-7-F Schottky, VBUS(J2) to VCC_5V | SOD-123 | (10.439, 8.950) | 180 | 3.8 x 0.6 | 1.35 [4] | black, cathode band |
| D7 | 1N5819HW-7-F Schottky, VBUSB(J4) to VCC_5V | SOD-123 | (14.884, 8.950) | 0 | 3.8 x 0.6 | 1.35 [4] | black |
| D2, D3, D4 | LESD5D5.0CT1G bidirectional ESD TVS, Vrwm 5.0 V, Vbr 7.8 V, 15 pF [4] (J2: VBUS, D-, D+) | SOD-523 | (4.590, 9.0), (5.994, 9.0), (7.010, 9.0) | 270 | 0.4 x 1.8 | 0.7 [4] | black |
| D8, D9, D10 | LESD5D5.0CT1G bidirectional ESD TVS (J4: VBUSB, GPIO19/D-, GPIO20/D+) | SOD-523 | (17.550, 9.0), (19.070, 9.0), (20.090, 9.0) | 270 | 0.4 x 1.8 | 0.7 [4] | black |
| C3, C15 | C3 10 uF/25 V on VCC_5V; **C15 not fitted** (10 uF NC in schematic, absent from BOM) | 0603 | C3 (12.725, 13.059), C15 (12.725, 14.834) | 0 | 2.5 x 0.9 | 0.8 | tan (C15 empty pads) |
| C7, C8 | LDO input 10 uF/25 V + 0.1 uF | 0603 / 0402 | C7 (7.290, 33.833), C8 (8.306, 35.611) | 180 / 90 | | | tan |
| C9, C10 | LDO output 0.1 uF + 10 uF | 0402 / 0603 | C9 (6.147, 35.611), C10 (7.290, 37.389) | 270 / 180 | | | tan |
| C1, C2 | 3V3 rail: C1 10 uF/25 V (0603), C2 0.1 uF (0402) [4] BOM | 0603 / 0402 | C1 (6.528, 39.675), C2 (7.036, 35.611) | 90 / 270 | | | tan |
| R24 | 0 Ohm link VCC_3V3 -> ESP_3V3 (module + header 3V3 pins; remove to measure module current) [4] BOM | 0603 | (8.179, 39.675) | 90 | | | black, "0" or "000" (unverified) |
| R5, C6 | EN (CHIP_PU) RC: R5 10 kOhm to ESP_3V3, C6 1 uF to GND [4] BOM (tau = 10 ms) | 0402 | R5 (10.465, 40.437), C6 (12.497, 40.437) | | | | |
| R11 | 5.1 kOhm, power LED series | 0402 | (19.101, 38.405) | 270 | | | |
| R17 | 0 Ohm, GPIO38 -> RGB_CTRL (D6 DIN) | 0402 | (8.890, 25.781) | 180 | | | |
| R8, R13 | 0 Ohm, Q1 -> CHIP_PU, Q2 -> GPIO0 | 0402 | R8 (13.970, 25.781), R13 (11.684, 25.781) | 180 | | | |
| R10, R12 | 10 kOhm base resistors (DTR->Q1, RTS->Q2) | 0402 | R10 (16.383, 25.781), R12 (18.669, 25.781) | | | | |
| R7, R9 | 0 Ohm, CP2102N TXD/RXD -> U0RXD / U0TXD | 0402 | R7 (18.669, 21.031), R9 (18.669, 19.761) | 0 | | | |
| R19, R18, C12 | VBUS sense divider for CP2102N pin 8: 22.1 kOhm / 47.5 kOhm, 1 uF | 0402 | R19 (6.731, 20.015), R18 (6.731, 21.031), C12 (8.255, 20.523) | | | | |
| R16 | 1 kOhm, VCC_3V3 -> CP2102N RSTb (pin 9) | 0402 | (6.731, 18.745) | | | | |
| R14 | 10 kOhm, **NC** (not fitted) | 0402 | (6.731, 17.856) | | | | empty pads |
| C11 | 10 uF/25 V, CP2102N VDD/REGIN | 0603 | (7.239, 22.428) | 180 | | | |
| C13, C14 | 0.1 uF on GPIO0 / CHIP_PU, **NC** (not fitted) | 0402 | C13 (6.248, 11.459), C14 (19.075, 11.459) | | | | empty pads |

### 2.3 Headers

| Header | Position | Pin 1 | Pitch / count | Faces | Notes |
|---|---|---|---|---|---|
| J1 (left) | x = **1.27**, pins at y = 61.30 (pin 1) down to 7.96 (pin 22) | **top** (y 61.30, label "3V3"); square pin-1 pad (unverified) | 2.54 mm, 22 pins | Pins point **down** (-z): male header inserted from the bottom, soldered on top | hole d 1.016 mm; outer edge 1.27 mm from board edge [2] |
| J3 (right) | x = **24.13**, y 61.30 (pin 1, "G") to 7.96 (pin 22, "G") | top | 2.54 mm, 22 | down | same |

Pin n is at y = 61.30 - 2.54 (n - 1). Row spacing 22.86 mm (fits a standard breadboard straddling the centre channel, leaving one free row each side on most breadboards - unverified for every breadboard). No overhang: pins sit inside the outline. Header plastic is black, 2.54 mm tall (typical, unverified), pins ~6 mm below the plastic.

USB receptacles: shell front at the bottom edge; the drawing shows the shell lip **~0.5 mm beyond the bottom edge** (estimated from [2]). Opening faces -y.

### 2.4 Silkscreen text (v1.1, from the dimension drawing silk layer [2])

- Left header labels, top to bottom (just inside J1): `3V3, 3V3, RST, 4, 5, 6, 7, 15, 16, 17, 18, 8, 3, 46, 9, 10, 11, 12, 13, 14, 5V, G`
- Right header labels, top to bottom (just inside J3): `G, TX, RX, 1, 2, 42, 41, 40, 39, 38, 37, 36, 35, 0, 45, 48, 47, 21, 20, 19, G, G`
- `RGB@IO38` (just above D6; the v1.0 drawing prints `RGB@IO48` [15]; Espressif's annotated photo shows plain `RGB` [11]), `BOOT` above SW1, `RESET` above SW2, `UART` above J2, `USB` above J4.
- Designators printed: U4, U2, U3, D1-D10, C1-C15, R5-R24, Q1, Q2, SW1, SW2, J2, J4.
- Back side (not drawn in [2]): board name / Espressif logo (unverified).

Chip markings visible: CP2102N with Silicon Labs logo, "CP2102N", a lot code and a date code (photo shows "CP2102N / A01P49 / 2012 A" on an early board [11]; v1.1 BOM specifies the A02 revision); SOT-223 LDO marked with an SGM code (photo shows "MN4 / K2?KC", partly illegible, estimated from [11]); module shield etched "ESP32-S3-WROOM-1" plus variant code.

### 2.5 v1.0 vs v1.1

| | v1.0 (2021-03, "initial") | v1.1 (2022-04 PCB, schematic 2022-11) |
|---|---|---|
| RGB LED data pin | **GPIO48** (net GPIO48 -> R17 -> RGB_CTRL) [15] | **GPIO38** (GPIO38 -> R17 -> RGB_CTRL) [3] |
| Silk next to D6 | `RGB@IO48` [15] | `RGB@IO38` [2] |
| Everything else | Schematic text identical apart from that net and the dates (same CP2102N, SGM2212, SK68XXMINI-HS, buttons, Micro-USB, header pinout) [3][15] | |
| Why | GPIO47/48 are 1.8 V on 1.8 V-PSRAM modules (N16R16VA, WROOM-2-N32R16V), too low to drive the 3.3 V LED's data input [5][9] | |

Both versions are on sale [1]. The pinout image `ESP32-S3_DevKitC-1_pinlayout_v1.1.jpg` is v1.1; `ESP32-S3_DevKitC-1_pinlayout.jpg` is v1.0.

---

## 3. Electrical

### 3.1 Module / SoC

| Item | Value | Source |
|---|---|---|
| SoC | ESP32-S3 (in the module: ESP32-S3R8 for N8R8), Xtensa LX7 **dual-core**, up to **240 MHz**, single-precision FPU, vector instructions; ULP-RISC-V + ULP-FSM co-processors | [5][6] |
| Clock | **40 MHz** crystal inside the module; 32 kHz RTC from internal RC (no external 32 kHz crystal on this board) | [5][3] |
| On-chip memory | 512 KB SRAM, 384 KB ROM, 16 KB RTC SRAM | [6] |
| Radio | 2.4 GHz Wi-Fi 802.11 b/g/n, Bluetooth 5 (LE) (no Classic BT) | [6] |
| Module size | WROOM-1: 18.0 x 25.5 mm; WROOM-1U: 18.0 x 19.2 mm (U.FL connector) | [5] |

**DevKit variants (official ordering table, v1.1 guide)** [1]:

| Board | Module | Flash | PSRAM | Antenna | Status |
|---|---|---|---|---|---|
| ESP32-S3-DevKitC-1-N32R16V | ESP32-S3-WROOM-2-N32R16V | 32 MB (octal) | 16 MB (octal, 1.8 V) | PCB | active |
| **ESP32-S3-DevKitC-1-N8R8** | ESP32-S3-WROOM-1-N8R8 | 8 MB (quad) | 8 MB (octal) | PCB | active |
| ESP32-S3-DevKitC-1U-N8R8 | ESP32-S3-WROOM-1U-N8R8 | 8 MB | 8 MB (octal) | U.FL external | active |
| ESP32-S3-DevKitC-1-N8 | ESP32-S3-WROOM-1-N8 | 8 MB | - | PCB | EOL |
| ESP32-S3-DevKitC-1-N8R2 | ESP32-S3-WROOM-1-N8R2 | 8 MB | 2 MB (quad) | PCB | EOL |
| ESP32-S3-DevKitC-1U-N8 | ESP32-S3-WROOM-1U-N8 | 8 MB | - | U.FL | EOL |
| ESP32-S3-DevKitC-1U-N8R2 | ESP32-S3-WROOM-1U-N8R2 | 8 MB | 2 MB | U.FL | EOL |

"N16R8" (WROOM-1-N16R8: 16 MB quad flash, 8 MB octal PSRAM) is a real module [5] and is common on clone DevKitC-1 boards, but it is **not** in Espressif's DevKitC-1 ordering table [1].

Module variants (WROOM-1 / -1U) [5]: N4, N8, N16 (no PSRAM); H4 (105 C); N4R2, N8R2, N16R2 (2 MB quad PSRAM, -40..85 C); N4R8, N8R8, N16R8 (8 MB **octal** PSRAM, -40..65 C); N16R16VA (16 MB octal PSRAM at **1.8 V**, -40..65 C).

### 3.2 Power tree [3][4]

```
J2 VBUS ("UART")  --D1 1N5819HW (Schottky)--+
                   D2 LESD5D5.0 to GND      |
J4 VBUSB ("USB") --D7 1N5819HW (Schottky)--+--> VCC_5V --+--> J1 pin 21 "5V"
                   D8 LESD5D5.0 to GND                    +--> C3 10uF (C15 NC)
                                                          +--> U2 SGM2212-3.3 VIN (C7 10uF, C8 0.1uF)
U2 VOUT --> VCC_3V3 (C9 0.1uF, C10 10uF, C1, C2) --+--> CP2102N VDD + REGIN (pins 6, 7)
                                                    +--> D6 RGB LED VDD
                                                    +--> D5 red LED via R11 5.1k
                                                    +--> R24 0R --> ESP_3V3 --> module 3V3 + J1 pins 1, 2 "3V3"
```

| Input | Range | Protection | Notes |
|---|---|---|---|
| J2 Micro-USB (UART) | 5 V USB VBUS (4.75-5.25 V) | 1N5819HW Schottky (40 V, 1 A; drop ~0.3-0.45 V at the board's current), 5 V ESD TVS on VBUS/D+/D- | Both USB ports can be connected at once: the two Schottkys OR the supplies, no back-feed between hosts |
| J4 Micro-USB (USB) | 5 V | same (D7, D8-D10) | |
| J1-21 "5V" pin | 5 V nominal (SGM2212 input max 20 V per the BOM [4]; Espressif only specifies 5 V) | **none**: the 5V pin is on VCC_5V **after** the Schottkys, so there is no reverse-polarity protection; the Schottkys do stop back-feed into the USB hosts | Mutually exclusive with 3V3 input [1] |
| J1-1/2 "3V3" pins | 3.0-3.6 V (module recommended 3.0-3.6 V [6]) | **none** | Feeds ESP_3V3 only; through R24 it also back-powers VCC_3V3 (LDO output, CP2102N, LEDs) |

- **LDO**: SGM2212-3.3XKC3G/TR, SOT-223-3, fixed 3.3 V, **input range 2.7-20 V (absolute max 22 V), output 800 mA, dropout (3.3 V version) 390 mV typ / 450 mV max at 800 mA and 25 C (610 mV max over -40..125 C); 240/280 mV at 500 mA**, -40 to +125 C [17]. (Espressif's BOM line quotes "0.42 V at 0.8 A", the older 2018 advance-datasheet figure.) Protection [17]: **output current limit 810 mA min / 1100 mA typ**, **short-circuit (foldback) current 360 mA** with VOUT = 0 V, **thermal shutdown 165 C, 25 C hysteresis**. SOT-223 pinout [17]: pin 1 GND, pin 2 VOUT, pin 3 VIN, **tab = VOUT**. Thermal: SOT-223 theta-JA 117 C/W [17]. With ~0.4 V across the Schottky, USB at 4.75 V still leaves >0.9 V headroom.
- **No polyfuse** on the board: over-current protection relies on the USB host's port limit and the LDO's current limit.
- **Power-on LED D5** (red) is on VCC_3V3: it lights whenever the 3.3 V rail is up, from either USB port or the 5V pin (and also when back-powered from the 3V3 pins).
- Module peak current [5]: Wi-Fi TX 802.11b 1 Mbps @ 20.5 dBm **355 mA**, 802.11g 54 Mbps 297 mA, 802.11n HT20 MCS7 286 mA; Wi-Fi RX ~95-97 mA; BLE TX @ 20 dBm 344 mA. Plan for a 500 mA supply: the ESP32-S3 datasheet (Table 5-2, note 4) says "If you use a single power supply, the recommended output current is 500 mA or more" [6].

### 3.3 Logic levels and limits [6]

| Item | Value |
|---|---|
| GPIO logic | **3.3 V** (VDD3P3_CPU/RTC). VIH >= 0.75 x VDD, VIL <= 0.25 x VDD, VOL <= 0.1 x VDD |
| 5 V tolerance | **Not 5 V tolerant.** Absolute max on any pin is VDD + 0.3 V; power pins -0.3 to 3.6 V |
| GPIO47/48 on 1.8 V modules | On N16R16VA / WROOM-2-N32R16V (VDD_SPI = 1.8 V), GPIO47 and GPIO48 run at **1.8 V** [5][7]. This is why v1.1 moved the RGB LED from GPIO48 to GPIO38 (a 3.3 V-powered LED does not see 1.8 V as a valid high; arduino-esp32's `pins_arduino.h` calls it a "board design bug") [9] |
| Drive | IOH **40 mA** source (VOH >= 2.64 V, at drive strength 3; the default drive strength is 2, about 20 mA, unverified), IOL **28 mA** sink [6] |
| Total | Cumulative IO output current **1500 mA** absolute max [6] (practical limit is the LDO) |
| Pull-ups/downs | internal weak **45 kOhm** pull-up and pull-down on every GPIO [6] |

### 3.4 Strapping pins [6]

| Pin | Default (internal) | Function | On this board |
|---|---|---|---|
| GPIO0 | weak pull-up (1) | 1 = SPI flash boot, 0 (with GPIO46 = 0) = Joint Download Boot (UART0 / USB-Serial-JTAG / USB-OTG) | BOOT button SW1 to GND; Q2 auto-program; header J3-14 |
| GPIO46 | weak pull-down (0) | download needs GPIO46 = 0; GPIO0 = 0 with GPIO46 = 1 is not a listed boot mode (avoid; TRM calls it invalid, unverified here) | J1-14; keep low or floating at reset |
| GPIO45 | weak pull-down (0) | VDD_SPI voltage select (0 = 3.3 V) unless eFuse forces it; on PSRAM modules eFuse fixes it, but driving it high at reset on others can select 1.8 V flash voltage and break boot | J3-15; keep low/floating at reset |
| GPIO3 | floating | JTAG signal source select (only when eFuse configured) | J1-13 |

Latched at reset; changing them afterwards has no effect until the next reset.

### 3.5 Pins not to use

- **GPIO26-32**: connected to the in-module SPI flash/PSRAM; not broken out [1][5].
- **GPIO35, GPIO36, GPIO37**: on octal-PSRAM modules (N8R8, N16R8, N16R16VA, WROOM-2) they are the extra octal data lines and **must not be used**, though the header still has pins labelled 35, 36, 37 [1][5].
- **GPIO19/20**: native USB D-/D+ (J4). Usable as GPIO only if USB is not used.
- **GPIO43/44 (TX/RX)**: UART0 to the CP2102N; Serial monitor and ROM bootloader live here.
- **GPIO38**: drives the RGB LED (also usable as GPIO, but the LED will flicker/react).

### 3.6 ADC, touch, PWM, DAC

- **ADC**: two 12-bit SAR ADCs, 20 channels: ADC1_CH0-CH9 = GPIO1-GPIO10; ADC2_CH0-CH9 = GPIO11-GPIO20 [5][6]. **ADC2 cannot be used while Wi-Fi is on** [6]. Reference: internal ~1.1 V bandgap with attenuation; with 11/12 dB attenuation the usable range is about 0-3.1 V (unverified exact; eFuse-calibrated, use `analogReadMilliVolts()`). Arduino default `analogReadResolution` is 12 bit (0-4095).
- **Touch**: 14 capacitive touch pads TOUCH1-TOUCH14 = GPIO1-GPIO14 [6]. Arduino `touchRead(pin)`; on the S3 the value **rises** when touched (opposite of the original ESP32).
- **PWM (LEDC)**: 8 channels, any output-capable GPIO, up to 14-bit resolution (S3), frequency set per timer (4 timers, unverified count); duty resolution up to 14 bits within a 1 ms period [6]. Arduino 3.x: `ledcAttach(pin, freq, resolution)` then `ledcWrite(pin, duty)` [9]. Also MCPWM (2 units) for motors.
- **DAC**: **none** on ESP32-S3 (the original ESP32 had two 8-bit DACs; S3 does not). Use PWM + RC or an external DAC.
- Other: 3 x UART, 2 x I2C, 4 x SPI (2 usable), 2 x I2S, TWAI (CAN), RMT (used by `rgbLedWrite`), USB-OTG FS, USB-Serial-JTAG, SD/MMC host, LCD/camera interfaces [6].

### 3.7 USB bridge and native USB

| Port | Chip/path | Host sees | Used for |
|---|---|---|---|
| J2 "UART" | **CP2102N-A02-GQFN28** (U3), USB 2.0 full speed, up to 3 Mbaud [1][8] | `Silicon Labs CP210x USB to UART Bridge`, VID **0x10C4**, PID **0xEA60**; macOS `/dev/cu.usbserial-XXXX` or `/dev/cu.SLAB_USBtoUART` (old driver), Linux `/dev/ttyUSB0`, Windows `COMx` | flashing via ROM UART bootloader, `Serial` (UART0, GPIO43/44) |
| J4 "USB" | ESP32-S3 internal USB PHY on **GPIO19 (D-) / GPIO20 (D+)** [1][3] | by default the ROM's **USB-Serial-JTAG**: VID **0x303A**, PID **0x1001** ("USB JTAG/serial debug unit"), `/dev/cu.usbmodemXXXX`, `/dev/ttyACM0` [9] | flashing, serial console, built-in JTAG debugging (OpenOCD), or TinyUSB OTG device (HID, MIDI, MSC) when the sketch enables it |

Auto-program circuit (classic Espressif two-transistor): CP2102N DTR -> R10 10k -> Q1 base, Q1 collector -> R8 0R -> **CHIP_PU (EN)**; RTS -> R12 10k -> Q2 base, Q2 collector -> R13 0R -> **GPIO0**; the emitters are cross-connected (Q1 emitter on RTS, Q2 emitter on DTR), so when DTR and RTS are equal neither transistor conducts and EN/GPIO0 stay high. Truth table on the schematic: `DTR RTS -> EN IO0: 1 1 -> 1 1; 0 0 -> 1 1; 1 0 -> 0 1; 0 1 -> 1 0` [3]. esptool drives this to enter download mode and to reset after flashing.

### 3.8 LEDs, buttons, sensors

| Des | Type | Net / pin | Active level | Driven by |
|---|---|---|---|---|
| D5 | red 0603 power LED | VCC_3V3 via R11 5.1 kOhm (~0.25 mA, dim) | on whenever 3.3 V is present | hard-wired |
| D6 | SK68XXMINI-HS RGB (WS2812 protocol, 24-bit GRB, 800 kHz) | DIN = **GPIO38** (via R17 0R), VDD = 3.3 V, DOUT unconnected | data line, not a level | RMT peripheral (`rgbLedWrite`) |
| SW1 BOOT | tact NTC013-AT1J-A160T | **GPIO0** to GND (C13 NC) | **active low** (pressed = 0), pull-up internal | user |
| SW2 RESET | tact | **CHIP_PU (EN)** to GND, R5/C6 RC | active low; release = chip reset | user |

No on-board sensors besides the SoC's internal temperature sensor (`temperatureRead()` in Arduino, rough).

No user LED on a plain GPIO: `LED_BUILTIN` in the Arduino variant is a virtual pin that maps to the RGB LED (see 7).

---

## 4. Pinout

Physical order, pin 1 at the top (antenna end). Labels as printed on the silkscreen [2]; functions from the user guide [1] and module datasheet [5]; nets verified against the PADS design file [4].

### J1 (left header, x = 1.27)

| # | Silk | Net | Functions | Notes |
|---|---|---|---|---|
| 1 | 3V3 | ESP_3V3 | 3.3 V power | output from LDO via R24, or 3.3 V input |
| 2 | 3V3 | ESP_3V3 | 3.3 V power | |
| 3 | RST | CHIP_PU | EN / reset | pull low to reset; high = run |
| 4 | 4 | GPIO4 | RTC_GPIO4, TOUCH4, ADC1_CH3 | |
| 5 | 5 | GPIO5 | RTC_GPIO5, TOUCH5, ADC1_CH4 | |
| 6 | 6 | GPIO6 | RTC_GPIO6, TOUCH6, ADC1_CH5 | |
| 7 | 7 | GPIO7 | RTC_GPIO7, TOUCH7, ADC1_CH6 | |
| 8 | 15 | GPIO15 | RTC_GPIO15, U0RTS, ADC2_CH4, XTAL_32K_P | |
| 9 | 16 | GPIO16 | RTC_GPIO16, U0CTS, ADC2_CH5, XTAL_32K_N | |
| 10 | 17 | GPIO17 | RTC_GPIO17, U1TXD, ADC2_CH6 | |
| 11 | 18 | GPIO18 | RTC_GPIO18, U1RXD, ADC2_CH7, CLK_OUT3 | |
| 12 | 8 | GPIO8 | RTC_GPIO8, TOUCH8, ADC1_CH7, SUBSPICS1 | Arduino default I2C **SDA** (`SDA = 8`) [9] |
| 13 | 3 | GPIO3 | RTC_GPIO3, TOUCH3, ADC1_CH2 | **strapping** (JTAG source) |
| 14 | 46 | GPIO46 | GPIO46 | **strapping** (boot mode; must be low for download); keep low/floating at reset |
| 15 | 9 | GPIO9 | RTC_GPIO9, TOUCH9, ADC1_CH8, FSPIHD, SUBSPIHD | Arduino default I2C **SCL** (`SCL = 9`) [9] |
| 16 | 10 | GPIO10 | RTC_GPIO10, TOUCH10, ADC1_CH9, FSPICS0, FSPIIO4, SUBSPICS0 | Arduino default SPI SS (`SS = 10`) [9] |
| 17 | 11 | GPIO11 | RTC_GPIO11, TOUCH11, ADC2_CH0, FSPID, FSPIIO5, SUBSPID | default MOSI |
| 18 | 12 | GPIO12 | RTC_GPIO12, TOUCH12, ADC2_CH1, FSPICLK, FSPIIO6, SUBSPICLK | default SCK |
| 19 | 13 | GPIO13 | RTC_GPIO13, TOUCH13, ADC2_CH2, FSPIQ, FSPIIO7, SUBSPIQ | default MISO |
| 20 | 14 | GPIO14 | RTC_GPIO14, TOUCH14, ADC2_CH3, FSPIWP, FSPIDQS, SUBSPIWP | |
| 21 | 5V | VCC_5V | 5 V (after Schottkys) | 5 V out from USB, or 5 V in |
| 22 | G | GND | ground | |

### J3 (right header, x = 24.13)

| # | Silk | Net | Functions | Notes |
|---|---|---|---|---|
| 1 | G | GND | ground | |
| 2 | TX | U0TXD (GPIO43) | U0TXD, CLK_OUT1 | to CP2102N RXD (via R9 0R); `Serial` |
| 3 | RX | U0RXD (GPIO44) | U0RXD, CLK_OUT2 | from CP2102N TXD (via R7 0R) |
| 4 | 1 | GPIO1 | RTC_GPIO1, TOUCH1, ADC1_CH0 | |
| 5 | 2 | GPIO2 | RTC_GPIO2, TOUCH2, ADC1_CH1 | |
| 6 | 42 | GPIO42 | MTMS | JTAG TMS (if JTAG on pins) |
| 7 | 41 | GPIO41 | MTDI, CLK_OUT1 | JTAG TDI |
| 8 | 40 | GPIO40 | MTDO, CLK_OUT2 | JTAG TDO |
| 9 | 39 | GPIO39 | MTCK, CLK_OUT3, SUBSPICS1 | JTAG TCK |
| 10 | 38 | GPIO38 | FSPIWP, SUBSPIWP, **RGB LED** | drives D6 |
| 11 | 37 | GPIO37 | SPIDQS, FSPIQ, SUBSPIQ | **not available on octal-PSRAM boards** |
| 12 | 36 | GPIO36 | SPIIO7, FSPICLK, SUBSPICLK | **not available on octal-PSRAM boards** |
| 13 | 35 | GPIO35 | SPIIO6, FSPID, SUBSPID | **not available on octal-PSRAM boards** |
| 14 | 0 | GPIO0 | RTC_GPIO0 | **strapping**, BOOT button |
| 15 | 45 | GPIO45 | GPIO45 | **strapping** (VDD_SPI) |
| 16 | 48 | GPIO48 | SPICLK_N, SUBSPICLK_N_DIFF | RGB LED on **v1.0** only; 1.8 V on R16V modules |
| 17 | 47 | GPIO47 | SPICLK_P, SUBSPICLK_P_DIFF | 1.8 V on R16V modules |
| 18 | 21 | GPIO21 | RTC_GPIO21 | |
| 19 | 20 | GPIO20 | RTC_GPIO20, U1CTS, ADC2_CH9, CLK_OUT1, **USB_D+** | to J4 |
| 20 | 19 | GPIO19 | RTC_GPIO19, U1RTS, ADC2_CH8, CLK_OUT2, **USB_D-** | to J4 |
| 21 | G | GND | ground | |
| 22 | G | GND | ground | |

All GPIOs 3.3 V, none 5 V tolerant, none input-only (unlike the original ESP32's GPIO34-39).

---

## 5. Programming

**Toolchains (current as of 2026-10-24)** [10][9]:

| Toolchain | Version | Board setting |
|---|---|---|
| Arduino IDE 2.x + **arduino-esp32 core 3.3.12** (Boards Manager "esp32 by Espressif Systems"; built on ESP-IDF 5.5.x, unverified; bundles esptool_py 5.3.1) | 3.3.12 (2026-09-18) | Board **"ESP32S3 Dev Module"** (`esp32:esp32:esp32s3`); for N8R8: *Flash Size* 8MB, *PSRAM* "OPI PSRAM"; *USB CDC On Boot* "Disabled" when using the UART port (Serial on UART0), "Enabled" to get Serial on the native USB port; *USB Mode* "Hardware CDC and JTAG" |
| ESP-IDF | v6.1 (2026-08-27) | `idf.py set-target esp32s3`, `idf.py -p PORT flash monitor` |
| esptool | v5.6.0 (2026-10-15) | `esptool --chip esp32s3 -p PORT write-flash 0x0 firmware.bin` (v5 uses dashes; `write_flash` still accepted) |
| MicroPython | v1.29.0 (2026-08-24), board page ESP32_GENERIC_S3; for N8R8 use the **"Firmware (Support for Octal-SPIRAM)"** build (the "spiram-oct" variant) [16] | flash at address **0**: `esptool.py --baud 460800 write_flash 0 ESP32_GENERIC_S3-SPIRAM_OCT-20260824-v1.29.0.bin` (command as given on the download page; file name confirmed on the download page) |
| PlatformIO | board `esp32-s3-devkitc-1` (unverified current platform version) | |

**Upload path (UART port J2).** esptool opens the CP2102N port, pulses DTR/RTS so Q1/Q2 pull EN low while GPIO0 is low, releases EN, chip boots into ROM download mode, stub uploaded, flash written, then RTS resets the chip. No button presses needed. If auto-reset fails: hold BOOT, tap RESET, release BOOT.

**Upload via native USB (J4).** esptool resets the chip through the USB-Serial-JTAG peripheral (no DTR/RTS transistors involved). If a sketch has crashed or reconfigured GPIO19/20, the port disappears; then hold BOOT, tap RESET to force ROM download mode (port re-appears as 303A:1001).

**Older esptool 4.x wording** (Arduino core 3.0-3.2 era, shown for reference only; core **3.3.12 bundles esptool_py 5.3.1** per the Boards Manager package index, so use the v5 block below):

```
esptool.py v4.8.1
Serial port /dev/cu.usbserial-0001
Connecting....
Chip is ESP32-S3 (QFN56) (revision v0.2)
Features: WiFi, BLE, Embedded PSRAM 8MB (AP_3v3)
Crystal is 40MHz
MAC: f4:12:fa:xx:xx:xx
Uploading stub...
Running stub...
Stub running...
Changing baud rate to 921600
Changed.
Configuring flash size...
Flash will be erased from 0x00000000 to 0x00004fff...
Flash will be erased from 0x00008000 to 0x00008fff...
Flash will be erased from 0x0000e000 to 0x0000ffff...
Flash will be erased from 0x00010000 to 0x00051fff...
Compressed 20208 bytes to 13058...
Writing at 0x00000000... (100 %)
Wrote 20208 bytes (13058 compressed) at 0x00000000 in 0.4 seconds (effective 429.0 kbit/s)...
Hash of data verified.
...
Leaving...
Hard resetting via RTS pin...
```

On S3 the bootloader goes at **0x0** (not 0x1000 as on the original ESP32), partitions at 0x8000, boot_app0 at 0xe000, the app at 0x10000. The MAC prefix shown is an example; byte counts vary. **esptool v5 wording, as printed in the Arduino IDE 2026** (strings verified in the v5.6.0 source [14] and again in the **v5.3.1** source that core 3.3.12 actually bundles: `__init__.py`, `cmds.py`, `loader.py`, `targets/esp32s3.py`, `logger.py`; labels are left-padded to 20 characters; MAC, sizes and times are example values. The Arduino IDE output pane is not a TTY, so esptool's collapsible "stages" do not collapse and every line, including "Verifying written data...", stays visible; in a real terminal some of these lines are erased once the stage succeeds. The per-chunk "Writing at 0x..." progress lines are elided here):

```
esptool v5.3.1
Connecting....
Connected to ESP32-S3 on /dev/cu.usbserial-0001:
Chip type:          ESP32-S3 (QFN56) (revision v0.2)
Features:           Wi-Fi, BT 5 (LE), Dual Core + LP Core, 240MHz, Embedded PSRAM 8MB (AP_3v3)
Crystal frequency:  40MHz
USB mode:           USB-Serial/JTAG          (line only printed when connected over the native USB port J4)
MAC:                f4:12:fa:xx:xx:xx

Uploading stub flasher...
Running stub flasher...
Stub flasher running.
Changing baud rate to 921600...
Changed.

Configuring flash size...
Flash will be erased from 0x00000000 to 0x00004fff...
Flash will be erased from 0x00008000 to 0x00008fff...
Flash will be erased from 0x0000e000 to 0x0000ffff...
Flash will be erased from 0x00010000 to 0x00051fff...
Compressed 20208 bytes to 13058...
Wrote 20208 bytes (13058 compressed) at 0x00000000 in 0.4 seconds (429.0 kbit/s).
Verifying written data...
Hash of data verified.
...
Hard resetting via RTS pin...
```

The chip description is `ESP32-S3 (QFN56) (revision vX.Y)` (ESP32-S3R8 in a WROOM-1-N8R8 reports package 0 = QFN56); the PSRAM vendor suffix is `AP_3v3` or `AP_1v8` (the latter on N16R16VA / WROOM-2-N32R16V). The quad flash in WROOM-1 modules is a separate chip, so no "Embedded Flash" feature is listed.

On failure: `A fatal error occurred: Failed to connect to ESP32-S3: No serial data received.` (wrong port, charge-only cable, or auto-reset not working: use BOOT + RESET).

**Boot (ROM) log on UART0 at 115200 baud after reset** (structure; addresses vary by build):

```
ESP-ROM:esp32s3-20210327
Build:Mar 27 2021
rst:0x1 (POWERON),boot:0x8 (SPI_FAST_FLASH_BOOT)
SPIWP:0xee
mode:DIO, clock div:1
load:0x3fce3808,len:0x...
load:0x403c9700,len:0x...
entry 0x403c98..
```

In download mode (BOOT held while RESET released, or esptool auto-reset): `rst:0x1 (POWERON),boot:0x0 (DOWNLOAD(USB/UART0))` then `waiting for download`. Pressing RESET (EN/CHIP_PU) or an esptool reset through the UART port's RTS line is a chip power-on reset, so it shows `rst:0x1 (POWERON)`; a reset issued over the native USB-Serial-JTAG port shows `rst:0x15 (USB_UART_CHIP_RESET)`; a sketch crash shows e.g. `rst:0xc (RTC_SW_CPU_RST)`. These ROM lines are the well-known ESP32-S3 ROM format; not re-verified against a live board in this run (unverified exact addresses).

**LED behaviour.** Red D5 on as soon as 3.3 V is up. The RGB LED is dark until firmware drives it. **Factory firmware**: Espressif ships the boards with a test firmware (unverified content: commonly reported as the RGB LED cycling colours / a short colour test). Do not rely on it; the iynk default program should be the Blink-RGB lesson.

---

## 6. Real failure modes

| Fault | What physically happens | What the user sees |
|---|---|---|
| Reverse polarity on USB | Not possible with a standard USB cable (keyed Micro-B). | - |
| Reverse polarity on **5V pin** | No protection on VCC_5V. The LDO input is driven negative; current flows from GND through the LDO's parasitic substrate diode into VIN (typical of CMOS LDOs; SGM2212 internals unverified) and the bench supply goes into current limit. The ESD TVS parts (D2/D8) sit on the USB side of the Schottkys, so they are not in this path. If a USB cable is plugged in at the same time, the host's VBUS forward-biases D1/D7 straight into the reversed supply: a dead short on the host port. | nothing lights; supply in current limit; U2 hot; with a stiff supply, U2 can crack/smell burnt and fail short; host may report USB over-current |
| Reverse polarity on **3V3 pin** | Directly reverse-biases the module: ESP32-S3 ESD/substrate diodes conduct; the chip is usually destroyed. | no LEDs, module gets hot fast; dead board |
| Over-voltage on a USB VBUS | The VBUS TVS (D2 or D8, Vbr 7.8 V) starts conducting above about 7.8 V and will burn out if the source can supply current; below that the LDO handles it as below. | TVS hot, may fail short (then that port's VBUS is shorted) |
| Over-voltage on 5V pin (e.g. 9-12 V) | SGM2212 accepts up to 20 V input [4], so 3.3 V stays correct but the LDO dissipates (Vin - 3.3) x I; at 12 V and 150 mA that is 1.3 W in a SOT-223 with little copper -> thermal shutdown/hot. Above its max, the LDO fails, often short, putting Vin on 3.3 V. The 5V header pin and anything wired to it see the over-voltage directly. | board works but U2 very hot; Wi-Fi resets on thermal limit; if U2 fails short: module dies, red LED very bright then dark |
| Over-voltage on 3V3 pin (> 3.6 V) | Exceeds the absolute max; 5 V on 3V3 destroys the module (and back-feeds through R24 into CP2102N and LEDs). | module hot, often permanent damage |
| Brown-out | ESP32-S3 brown-out detector resets the chip when VDD drops below the threshold (default ~2.7 V in IDF/Arduino config; unverified exact level). Typical cause: weak USB port/long cable during Wi-Fi TX (up to ~350 mA peaks). | serial: `Brownout detector was triggered` then a reboot loop; RGB LED flickers; red LED stays on |
| Over-current (load on 3V3 pin) | SGM2212 (800 mA rated; current limit 810 mA min / 1100 mA typ; thermal shutdown at 165 C [17]) folds the rail; module browns out. Host USB port may also cut power (500 mA USB 2.0 budget). | resets, brownout messages, warm LDO; laptop may warn "USB device drawing too much power" |
| Over-current on a GPIO | > 40 mA source / 28 mA sink exceeds ratings; driving an LED with no resistor or a motor directly overheats the pad driver, can kill that GPIO. | LED very bright then GPIO dead (stuck), or chip resets |
| Cold solder joint (headers) | intermittent contact on a header pin: on 3V3/GND = random resets; on a GPIO = flaky sensor readings. On the USB receptacle (hand-soldered clones): intermittent enumeration. | port disconnect/reconnect chimes, random resets when the board is touched |
| 5 V into a 3.3 V GPIO | Exceeds VDD + 0.3 V; current flows through the pin's ESD diode into the 3.3 V rail. With a series resistor > ~10 kOhm it may survive; directly from a 5 V output it can latch up or destroy the pin. | GPIO stops working, chip warm, 3.3 V rail lifted above 3.3 V |
| Shorting 5V to GND | VCC_5V is shorted: USB host port over-current protection cuts power (or the PTC in the host trips); Schottkys carry the short current until the host cuts out; a bench supply goes to current limit. | everything goes dark, PC shows "USB device over current", may need re-plugging |
| Shorting 3V3 to GND | LDO short-circuit foldback limits the current to about 360 mA (with VOUT = 0 V) [17]; with about 4.6 V in that is about 1.7 W in the SOT-223, so thermal shutdown (165 C, 25 C hysteresis [17]) cycles it. | dark, LDO hot, recovers when removed |

**Beginner traps specific to this board:**
1. **RGB_BUILTIN points to GPIO48 in arduino-esp32 3.3.12** (`variants/esp32s3/pins_arduino.h`: `#define PIN_RGB_LED 48`) because the generic "ESP32S3 Dev Module" variant follows v1.0. On a **v1.1** board `rgbLedWrite(RGB_BUILTIN, ...)` and `digitalWrite(LED_BUILTIN, ...)` light nothing. Use **pin 38** explicitly [9].
2. Using GPIO35/36/37 on an N8R8 board crashes PSRAM/flash access (guru meditation or hang).
3. `Serial.print` output appears on only one port: UART port shows it when *USB CDC On Boot* is Disabled; the native USB port shows it when Enabled.
4. Charge-only Micro-USB cables: no port appears.
5. `analogRead` on ADC2 pins (GPIO11-20) returns errors/garbage while Wi-Fi is on.
6. Holding strapping pins (GPIO0 low, GPIO45/46 high) via attached circuits at reset: board boots into download mode or fails to boot.
7. Wide boards: with both 22-pin rows in a breadboard, only one free row remains on each side.
8. Plugging the **UART** port on a v1.1 board and expecting a native USB HID keyboard to work: HID/MIDI only works on the **USB** (J4) port.

---

## 7. Lesson facts

All with Arduino-ESP32 **3.3.12** (board "ESP32S3 Dev Module"); MicroPython **v1.29.0**.

### Lesson 1 - Blink the RGB LED (GPIO38)

```cpp
// ESP32-S3-DevKitC-1 v1.1: the RGB LED is on GPIO38 (v1.0: GPIO48)
const uint8_t RGB_PIN = 38;

void setup() {
  Serial.begin(115200);
}

void loop() {
  rgbLedWrite(RGB_PIN, 64, 0, 0);   // red (0-255 per channel)
  delay(500);
  rgbLedWrite(RGB_PIN, 0, 0, 0);    // off
  delay(500);
}
```

`rgbLedWrite(pin, r, g, b)` is the 3.x API (it reorders to the LED's GRB internally via `rgbLedWriteOrdered`, default order GRB); `neopixelWrite()` still compiles but is marked `[[deprecated("Use rgbLedWrite() instead.")]]` [9]. Brightness 64 matches `RGB_BRIGHTNESS`; 255 is uncomfortably bright at close range.

MicroPython:

```python
from machine import Pin
import neopixel, time
np = neopixel.NeoPixel(Pin(38), 1)
while True:
    np[0] = (64, 0, 0); np.write(); time.sleep(0.5)
    np[0] = (0, 0, 0);  np.write(); time.sleep(0.5)
```

External LED blink: any free GPIO (e.g. GPIO4, J1-4) -> 330 Ohm -> LED -> GND; `pinMode(4, OUTPUT); digitalWrite(4, HIGH);`.

### Lesson 2 - Button + sensor

- BOOT button = **GPIO0**, active low: `pinMode(0, INPUT_PULLUP); if (digitalRead(0) == LOW) ...`. Safe to read after boot (only sampled at reset).
- Touch: `touchRead(4)` on GPIO4 (TOUCH4); value **increases** on touch on the S3. Threshold interrupt: `touchAttachInterrupt(4, isr, threshold)`.
- Analog sensor (potentiometer, LDR): GPIO1-GPIO10 (ADC1, works with Wi-Fi). `analogReadMilliVolts(1)` / `analogRead(1)` (0-4095). Potentiometer between 3V3 and G, wiper to GPIO1 (J3-4).

### Lesson 3 - PWM / analog

```cpp
const uint8_t LED_PIN = 4;          // external LED + 330 Ohm on J1-4
void setup() {
  ledcAttach(LED_PIN, 5000, 8);     // 5 kHz, 8-bit (0-255)
}
void loop() {
  for (int d = 0; d <= 255; d++) { ledcWrite(LED_PIN, d); delay(4); }
  for (int d = 255; d >= 0; d--) { ledcWrite(LED_PIN, d); delay(4); }
}
```

Arduino 3.x replaced `ledcSetup(channel, ...)` + `ledcAttachPin(pin, channel)` with `ledcAttach(pin, freq, bits)` (auto channel) or `ledcAttachChannel(pin, freq, bits, ch)`, and `ledcWrite` now takes the **pin**, not the channel [9]. `analogWrite(pin, value)` also works (uses LEDC, 8-bit). Rainbow on the RGB LED: compute HSV->RGB and call `rgbLedWrite(38, r, g, b)`. Servo: 50 Hz, 14-bit, duty 1-2 ms (ESP32Servo library, unverified current version).

### Lesson 4 - Wi-Fi web server

```cpp
#include <WiFi.h>
#include <WebServer.h>

const char* ssid = "bench-lab";
const char* pass = "password123";
WebServer server(80);
const uint8_t RGB_PIN = 38;

void handleRoot() {
  server.send(200, "text/html",
    "<h1>ESP32-S3</h1><a href='/on'>LED ON</a> <a href='/off'>LED OFF</a>");
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, pass);
  Serial.print("Connecting");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print('.'); }
  Serial.printf("\nConnected, IP %s\n", WiFi.localIP().toString().c_str());
  server.on("/", handleRoot);
  server.on("/on",  [] { rgbLedWrite(RGB_PIN, 0, 64, 0); server.send(200, "text/plain", "on"); });
  server.on("/off", [] { rgbLedWrite(RGB_PIN, 0, 0, 0);  server.send(200, "text/plain", "off"); });
  server.begin();
}

void loop() { server.handleClient(); }
```

`WiFi.h` and `WebServer.h` ship with the core (no separate install). 2.4 GHz networks only. Alternative protocol lesson: I2C on GPIO8 (SDA) / GPIO9 (SCL) with `Wire.begin(8, 9)` (passing pins explicitly avoids depending on variant defaults).

**Cross-check of the original Fig. 04 ("hue 0 deg" bug)** [12]: the original prints `hue ${(k*90) % 360} deg` only when `k % 4 === 0`, so it always prints `hue 0 deg`. Correct behaviour for a 4-s hue cycle printed every second: print `hue (k*90) % 360` on every tick k (0, 90, 180, 270, 0 ...), or print the actual current hue when printing every 4 s (which is always 0 at the cycle start - then say so). Other Fig. 04 errors: USB-C (should be Micro-USB), AMS1117 (SGM2212), RGB GPIO48 / silk "RGB 48" (v1.1: GPIO38 / silk "RGB@IO38"), SW1/SW2 swapped, r 1.2 (0.5), silk "PWR" (not on the board; the LED is just "D5"), CP2102N drawn as a QFP with leads (it is a leadless QFN-28), board length 62.7 (real 62.74) and the ~6.4 mm module/antenna overhang beyond the top edge not modelled.

---

## 8. Internals (see-through view)

| Part | Truthful interior |
|---|---|
| ESP32-S3-WROOM-1 module | A small FR-4 module PCB (18 x 25.5 mm, 0.8 mm thick [5]; layer count unverified) with castellated edge pads (40 signal/GND pads + EPAD 41). Under the **stamped metal RF shield can**: the ESP32-S3 QFN-56 7 x 7 mm chip (on N8R8: ESP32-S3R8, which has the 8 MB octal PSRAM die **stacked in the same package**), a separate **quad SPI NOR flash** chip (8 MB), a **40 MHz quartz crystal** [5] (metal-lid SMD can with a quartz blank inside; package size unverified), RF matching network (tiny L/C), decoupling caps. Flash package and crystal size are unverified (no teardown photo checked). The antenna is a **PCB meander (inverted-F) trace** on the module's exposed end, no components there. WROOM-1U replaces it with a U.FL connector. |
| ESP32-S3 die | silicon die wire-bonded (gold/copper bond wires) to a QFN lead frame with an exposed ground pad; dual LX7 cores, SRAM, Wi-Fi/BT radio and PA on one die. |
| CP2102N | QFN-28: a single die (USB full-speed PHY + UART + internal oscillator, no crystal needed) wire-bonded to a lead frame with exposed pad. Has an internal 5 V-to-3.3 V regulator; on this board REGIN and VDD are both tied to the 3.3 V rail, so the regulator is bypassed. |
| SGM2212 LDO | SOT-223: one die on the large tab (tab = VOUT here, pin 4), pass transistor + bandgap reference + error amplifier (generic LDO structure; SGM2212 internals unverified). Heat goes out through the tab into the copper. |
| SK68XXMINI-HS | 3.5 x 3.5 mm white plastic body, clear epoxy lens over **three LED chips (R, G, B)** plus a tiny **driver IC** (shift register + constant-current PWM) with bond wires, all on a lead frame. |
| Micro-USB receptacle | stamped nickel-plated steel shell, a plastic tongue with 5 gold contacts (VBUS, D-, D+, ID, GND; ID unconnected). |
| 1N5819HW | Schottky die in SOD-123. |
| Tact switches | metal dome contact under a plunger; pressing collapses the dome to short the pads. |

---

## 9. Assembly and power-up

- **Manufacture**: 2-layer FR-4, black mask, white silk. All top-side parts are SMD, **reflowed** in one pass (module, QFN, SOT-223, 0402/0603 passives, LEDs, tact switches, Micro-USB receptacles with through-hole shell pegs soldered by reflow/pin-in-paste, unverified process). The **pin headers** are through-hole, inserted from the **bottom** and wave or hand soldered on top, last; some retail units ship with headers soldered, some variants not (unverified per SKU). The module is pre-programmed with factory test firmware before shipping.
- **Power-up sequence**: USB plugged -> VBUS through Schottky -> VCC_5V -> LDO -> VCC_3V3: **red D5 lights immediately**. CHIP_PU rises through R5/C6 RC (~ms delay) -> ESP32-S3 samples strapping pins (GPIO0 high -> SPI boot) -> ROM log on UART0 and USB-Serial-JTAG -> second-stage bootloader -> app. On the UART port the host enumerates the **CP2102N** (powered regardless of the ESP32 state); on the USB port the host enumerates **303A:1001 USB JTAG/serial debug unit** (from ROM/IDF, unless the app disables it or switches to TinyUSB). RGB LED dark until the application writes it.

---

## 10. Uncertainties

- **Board length**: drawing and BOM say 62.74 mm; the PADS outline polyline spans 62.865 mm (difference ~ one 0.127 mm outline line width). 62.74 used. Component y-coordinates are CAD values from the same origin and are unaffected.
- **SGM2212**: resolved by the fact-check against the SG Micro datasheet [17]: 2.7-20 V input (22 V abs max), 800 mA, dropout 390 mV typ / 450 mV max at 800 mA (25 C), current limit 810 mA min, short-circuit 360 mA, thermal shutdown 165 C. The BOM's 0.42 V dropout is an older figure.
- **Part heights** come from the Espressif BOM "H" fields (verified); 0402/0603 passives 0.35-0.8 mm. Pin-header plastic height (2.54 mm) and pin length are typical values, unverified.
- **Factory firmware** behaviour: not documented by Espressif in the user guide.
- **esptool v5 console strings** were checked in the v5.6.0 source, and the fact-check re-checked them in the bundled **v5.3.1** source (same strings, plus "Verifying written data..." before "Hash of data verified."). The esptool 4.x block and the **ROM boot log / reset-reason codes** come from general knowledge of Espressif output, not from a live board.
- **Colour of the module/marking details and LDO marking**: from Espressif's v1.0-era annotated photo, not a v1.1 photo close-up.
- **USB-C**: no Espressif source shows a USB-C DevKitC-1 v1.1; the original site's USB-C ports are treated as an error.
- Brown-out threshold default level (assumed ~2.7 V) not verified against the current IDF Kconfig.

---

## Verification

Adversarial fact-check, 2026-10-24 14:09-14:17 CDT. Every source below was opened fresh in this pass. The researcher's citations were not taken on trust: the schematic, dimension DXF, user guide, datasheets and source files were downloaded again and parsed with new scripts.

| # | Claim | Status | Source | Old -> new (corrections) |
|---|---|---|---|---|
| 1 | Board outline 25.40 x 62.74 mm, corner radius 0.5 mm | confirmed (DXF BOARD_OUTLINE segments start 0.5 mm in from each corner; outline polyline runs to y 62.865, the dimension line spans 0.127..62.865 = 62.74 and is labelled "62.74mm"; "25.40mm" label) | https://dl.espressif.com/dl/schematics/esp_idf/DXF_ESP32-S3-DevKitC-1_V1.1_20220429.dxf | |
| 2 | Headers J1 x = 1.27, J3 x = 24.13, pin 1 y = 61.30, pin 22 y = 7.96, 2.54 mm pitch, hole d 1.016 | confirmed (44 pad circles d 1.02 at exactly those x/y in the DXF; "1.27mm", "2.54mm", "8.00mm" dimension labels) | same DXF | |
| 3 | Module antenna overhang: keep-out x 3.75..21.75, y 62.84..69.15, "MINI-ANT-TYPEB" outside the outline | confirmed | same DXF | |
| 4 | Two **Micro-USB** ports (not USB-C); cable "Standard-A to Micro-B" | confirmed | https://github.com/espressif/esp-dev-kits/blob/master/docs/en/esp32-s3-devkitc-1/user_guide_v1.1.rst ; schematic text "MICRO USB" x2 | |
| 5 | Left port silk "UART" (J2), right port silk "USB" (J4) | confirmed (DXF silk: UART at x 4.06, USB at x 17.64; J2 x 5.62, J4 x 18.77) | same DXF | |
| 6 | BOOT = SW1 (left, GPIO0 to GND), RESET = SW2 (right, CHIP_PU to GND), both NTC013-AT1J-A160T | confirmed (schematic: SW1 net GPIO0, SW2 net CHIP_PU; DXF silk BOOT x 5.87 / SW1 x 6.76 left, RESET x 16.15 / SW2 x 17.17 right) | https://dl.espressif.com/dl/schematics/SCH_ESP32-S3-DevKitC-1_V1.1_20221130.pdf + DXF | |
| 7 | RGB LED SK68XXMINI-HS on **GPIO38** via R17 0R (v1.0: GPIO48); silk "RGB@IO38" just above D6 | confirmed (schematic GPIO38 -> R17 -> RGB_CTRL; guide "Addressable RGB LED, driven by GPIO38" and the v1.0/v1.1 note; DXF silk RGB@IO38 at y 31.6, D6 label y 29.07) | schematic + user guide + DXF | |
| 8 | LDO part SGM2212-3.3XKC3G/TR (not AMS1117) | confirmed | schematic 20221130 | |
| 9 | SGM2212 ratings and protection | **corrected** | https://www.endrich.com/Datenbl%C3%A4tter/Aktive%20Komponenten/1690103353.pdf (SG Micro datasheet Rev. A) ; https://sg-micro.com/product/SGM2212 | old: "input max 20 V, dropout 0.42 V at 0.8 A; current limit / thermal shutdown unverified" -> new: input 2.7-20 V, abs max 22 V, dropout 390 mV typ / 450 mV max at 800 mA (25 C), 610 mV max over temp; current limit 810 mA min / 1100 typ; short-circuit 360 mA; TSD 165 C / 25 C hysteresis; SOT-223 pin 1 GND, 2 VOUT, 3 VIN, tab VOUT |
| 10 | USB-UART bridge CP2102N-A02-GQFN28; host sees VID 0x10C4 / PID 0xEA60 | confirmed (schematic part number; Linux cp210x driver "USB_DEVICE(0x10C4, 0xEA60) /* Silicon Labs factory default */") | schematic + https://github.com/torvalds/linux/blob/master/drivers/usb/serial/cp210x.c | |
| 11 | Auto-program truth table DTR/RTS -> EN/IO0 (11->11, 00->11, 10->01, 01->10); Q1/Q2 L8050QLT1G, R10/R12 10k | confirmed | schematic 20221130 | |
| 12 | Protection parts 1N5819HW-7-F (D1, D7) VBUS/VBUSB -> VCC_5V; LESD5D5.0CT1G ESD; R24 0R VCC_3V3 -> ESP_3V3; R11 5.1k; R19/R18 22.1k/47.5k | confirmed (part strings and nets present in the schematic text) | schematic 20221130 | |
| 13 | J1 and J3 pin tables (silk, GPIO, functions) | confirmed line by line against the user guide tables and the DXF silk text | user guide v1.1 + DXF | |
| 14 | GPIO35/36/37 unavailable on octal-PSRAM / WROOM-2 boards | confirmed (guide note) | user guide v1.1 | |
| 15 | Ordering table: N32R16V, N8R8, 1U-N8R8 active; N8, N8R2, 1U-N8, 1U-N8R2 EOL; N16R8 not listed | confirmed | https://github.com/espressif/esp-dev-kits/blob/master/docs/en/esp32-s3-devkitc-1/ordering-info.inc | |
| 16 | GPIO DC limits: VIH 0.75 VDD, VIL 0.25 VDD, VOL 0.1 VDD, IOH 40 mA (VOH >= 2.64 V, PAD_DRIVER 3), IOL 28 mA, 45 kOhm pull-up/down, cumulative IO 1500 mA, power pins -0.3..3.6 V | confirmed (Tables 5-1, 5-4) | https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf (v2.2) | |
| 17 | Strapping: GPIO0 weak pull-up, GPIO45/46 weak pull-down, GPIO3 floating; download = GPIO0 0 + GPIO46 0; SPI boot = GPIO0 1 | confirmed (Tables 3-1, 3-3). GPIO0 = 0 with GPIO46 = 1 is not in Table 3-3; the datasheet only mentions an "SPI Download Boot" mode without pin values, so "invalid" stays (unverified) | ESP32-S3 datasheet v2.2 | |
| 18 | "Plan for a 500 mA supply" | confirmed (Table 5-2 note 4, exact wording now quoted) | ESP32-S3 datasheet v2.2 | old: "exact wording not re-found" -> new: quoted datasheet note |
| 19 | Module: WROOM-1 18.0 x 25.5 x 3.1 mm (1U 18.0 x 19.2 x 3.2), 40 MHz crystal, ESP32-S3R8 in N8R8, N8R8 = 8 MB quad flash + 8 MB octal PSRAM at -40..65 C; GPIO47/48 at 1.8 V when VDD_SPI = 1.8 V; Wi-Fi TX 355/297/286 mA, BLE TX 344 mA | confirmed | https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf | |
| 20 | arduino-esp32 3.3.12 (released 2026-09-18): `PIN_RGB_LED 48`, `LED_BUILTIN = SOC_GPIO_PIN_COUNT + PIN_RGB_LED`, `RGB_BRIGHTNESS 64`, USB 0x303A:0x1001, SDA 8 / SCL 9 / SS 10 / MOSI 11 / MISO 13 / SCK 12 | confirmed (variant file at tag 3.3.12; GitHub releases API) | https://github.com/espressif/arduino-esp32/blob/3.3.12/variants/esp32s3/pins_arduino.h | |
| 21 | `rgbLedWrite(pin, r, g, b)`, default GRB order, `neopixelWrite` `[[deprecated("Use rgbLedWrite() instead.")]]`; `ledcAttach(pin, freq, res)`, `ledcAttachChannel(...)`, `ledcWrite(pin, duty)` | confirmed | https://github.com/espressif/arduino-esp32/blob/3.3.12/cores/esp32/esp32-hal-rgb-led.h , .../esp32-hal-ledc.h | |
| 22 | Board menu: "ESP32S3 Dev Module", PSRAM "OPI PSRAM", Flash Size "8MB (64Mb)", USB Mode "Hardware CDC and JTAG", USB CDC On Boot default "Disabled" | confirmed (boards.txt at tag 3.3.12; menu label is "8MB (64Mb)") | https://github.com/espressif/arduino-esp32/blob/3.3.12/boards.txt | |
| 23 | Core 3.3.12 bundles esptool_py 5.3.1; esptool latest v5.6.0 (2026-10-15); ESP-IDF v6.1 (2026-08-27) | confirmed | https://espressif.github.io/arduino-esp32/package_esp32_index.json ; GitHub releases API | |
| 24 | esptool v5 console block strings (banner, "Connected to ESP32-S3 on ...:", 20-char labels, Features list, stub/baud lines, "Wrote ... (... compressed) at 0x... in X seconds (Y kbit/s).", "Hard resetting via RTS pin...") | **corrected** (one line missing) | https://github.com/espressif/esptool/tree/v5.3.1/esptool (`__init__.py`, `cmds.py`, `loader.py`, `logger.py`, `targets/esp32s3.py`) | old: "Wrote ..." directly followed by "Hash of data verified." -> new: "Verifying written data..." inserted between them (printed in v5.3.1; visible in the non-TTY Arduino IDE output) |
| 25 | MicroPython v1.29.0 (2026-08-24), "Firmware (Support for Octal-SPIRAM)", `esptool.py --baud 460800 write_flash 0 ...`, file `ESP32_GENERIC_S3-SPIRAM_OCT-20260824-v1.29.0.bin` | confirmed (the file-name pattern is now confirmed too) | https://micropython.org/download/ESP32_GENERIC_S3/ | |
| 26 | ADC 2 x 12-bit, 20 channels; 14 touch pins; LEDC up to 8 channels, 14-bit within a 1 ms period | confirmed (LEDC timer count 4 still unverified) | ESP32-S3 datasheet v2.2 | |
| 27 | ROM boot log lines, reset-reason codes, brown-out default level, factory firmware behaviour | unverified (no primary source opened in this pass; already flagged in the sheet) | - | |
