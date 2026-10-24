# Arduino Nano (classic) fact sheet

## 0. Header

| Field | Value |
|---|---|
| Product modelled | Arduino Nano (classic), SKU **A000005**, board revision **3.3** ("NanoV3.3" design files) [1][2][3], as currently produced (FT232RNL, ST LD1117 regulator per the official photos [4]) |
| Manufacturer | Arduino S.r.l. (design files CC-BY-SA; the original Nano 3.0 layout was by Gravitech) [3][5] |
| MCU | Microchip (Atmel) **ATmega328P**, 16 MHz, 5 V |
| USB bridge | FTDI **FT232RL** (SSOP-28) on genuine boards (current production: the pin-compatible **FT232RNL** [4][12]); WCH **CH340G/CH340C** on most clones |
| USB connector | **Mini-B** (not Micro-B, not USB-C) [2] |
| Outline | 43.18 x 17.78 mm PCB (1.70 x 0.70 in); "45 x 18 mm, 7 g" in Arduino's spec table, which includes the USB overhang [2] |

**Correction to the brief: the MCU package.** The brief says "ATmega328P TQFP-32". On the **current genuine A000005 (Rev 3.3)** the MCU is the **ATmega328P-MU in VQFN-32 (5 x 5 mm, no gull-wing leads)**. The official Eagle file places part `IC3`, package `VQFN32`, value `328P-MUR` [3], and the official product photo shows a leadless QFN marked `ATMEL / M328P / U-TH / ...` [4]. The **TQFP-32 (7 x 7 mm body, 9 x 9 mm over the leads, 0.8 mm pitch)** ATmega328P-AU was used on the **Nano 3.0** (Gravitech layout: part `U1`, package `QFP032`) [5], and it is still on almost every clone. SimLab models the genuine Rev 3.3, so its figure must draw a QFN. If a "clone" variant is ever drawn, it gets the TQFP. Both layouts are given below.

**What it is.** The Nano is Arduino's smallest classic board: a breadboard-friendly 5 V ATmega328P board with the same core as the Uno/Duemilanove. It has two 15-pin rows of 0.1 in pins spaced 0.6 in apart, so it straddles the centre channel of a breadboard like a wide DIP-30. Power comes from USB (through a polyfuse and a Schottky diode) or from VIN (7-12 V nominal, through an LM1117-5.0 LDO). The USB link goes through an FT232RL USB-UART, whose DTR line auto-resets the MCU into the bootloader for uploads. Compared with the Uno it has two extra analog-only inputs (A6, A7), no DC barrel jack, no 16U2 and no op-amp buffer on the D13 LED. The ICSP header is left unpopulated on the genuine board. The **Nano Every** (ATmega4809, Micro-USB), the **Nano ESP32** (ESP32-S3, USB-C) and the Nano 33 / RP2040 family share the footprint but are different boards, and **they are not modelled here**.

## 1. Sources

1. Arduino, *Arduino Nano User Manual / datasheet*, SKU A000005, "Modified 21/10/2026", revision 5 — https://docs.arduino.cc/resources/datasheets/A000005-datasheet.pdf — feature list (ATmega328, 16 MHz, 32 kB flash of which 2 kB is the bootloader, 2 kB SRAM, 1 kB EEPROM), "7-15V unregulated external power supply (pin 30)", "5V regulated external power supply (pin 27)", temperature -40..85 °C. Contains errors (see §10).
2. Arduino docs, Nano product page and tech specs — https://docs.arduino.cc/hardware/nano/ (page-data JSON) — Mini-B USB, built-in LED pin 13, 14 digital / 8 analog / 6 PWM, I2C on A4/A5, I/O voltage 5 V, input voltage (nominal) 7-12 V, 20 mA per I/O pin, weight 7 g, 18 x 45 mm.
3. Arduino, official Eagle design files **NanoV3.3.brd / NanoV3.3.sch** (https://docs.arduino.cc/static/e3c4fe1f9bee7ec63df398422b3257f4/A000005-cad-files.zip, linked from the docs page "CAD files"; schematic PDF https://docs.arduino.cc/resources/schematics/A000005-schematics.pdf, pinout PDF https://docs.arduino.cc/resources/pinouts/A000005-full-pinout.pdf; the 2019 and 2020 archives contain identical element lists) — **all board-frame coordinates in §2**, footprints, values, nets and silkscreen text. Parsed with a Python XML script (`ElementTree`; element x/y/rot, pads, layer-21 text, layer-20 outline, `<hole>`s, signal contactrefs).
4. Arduino official product photos A000005_03.front.jpg, _04.back.jpg, _01.iso.jpg (store, e.g. https://cdn.shopify.com/s/files/1/0438/4735/2471/files/A000005_03.front.jpg) — production silkscreen text, colours, chip marking, USB overhang, unpopulated ICSP.
5. Arduino Nano 3.0 Eagle files (ArduinoNano30Eagle.zip: "Arduino Nano2.brd/.sch"), Nano 3.0 schematic PDF, Nano 3.2 schematic PDF, *Arduino Nano Manual 2.3* (Gravitech BOM) — https://www.arduino.cc/en/uploads/Main/ArduinoNano30Eagle.zip , https://www.arduino.cc/en/uploads/Main/ArduinoNano30Schematic.pdf — the older TQFP layout, UA78M05 regulator, MBR0520 diode, LED colours. The BOM lists an Omron B3U-1000P reset switch (3.0 x 2.5 mm, 150 gf) and the FT232RL.
6. Microchip, *ATmega48A/PA/88A/PA/168A/PA/328/P datasheet* (DS40002061, https://www.microchip.com/en-us/product/ATmega328P) — pin functions, ADC, BOD levels (BODLEVEL 101 = 2.7 V typ, 2.5-2.9 V), absolute maximum ratings (40 mA per pin, 200 mA VCC/GND), port group limits, ADC6/ADC7 analog-only.
7. FTDI, *FT232R datasheet* (DS_FT232R, https://ftdichip.com/products/ft232rl/ ; copy used: https://cdn.sparkfun.com/datasheets/BreakoutBoards/DS_FT232R.pdf) — 3V3OUT "maximum current of 50mA", CBUS0 default TXLED#, CBUS1 default RXLED#, internal EEPROM, 12 MHz internal clock generator (no crystal needed).
8. Texas Instruments, *LM1117 datasheet* (SNOS412, https://www.ti.com/lit/ds/symlink/lm1117.pdf) — 800 mA output, dropout 1.2 V at 800 mA, current limit 800/1200/1500 mA (min/typ/max at VIN-VOUT = 5 V), VIN abs. max 20 V, recommended max 15 V, current limiting and thermal shutdown, SOT-223 RθJA 61.6 °C/W.
9. Bourns, *MF-FSMF series datasheet* (https://www.bourns.com/docs/Product-Datasheets/mffsmf.pdf) — MF-FSMF050X: hold current 0.50 A, trip current 1.00 A, max 6 V, 40 A interrupt.
10. Arduino, **ArduinoCore-avr `boards.txt`** (master, 2026) — https://github.com/arduino/ArduinoCore-avr/blob/master/boards.txt — `nano.*` upload speeds, fuses, maximum sizes, variant `eightanaloginputs`. Latest core release **1.8.8** (published 2026-05-21, GitHub API).
11. Arduino IDE releases — https://github.com/arduino/arduino-ide/releases — latest **2.3.10** (2026-06-09).
12. FTDI, *AN_560 Migrating from FT2xxR to FT2xxRN* (https://ftdichip.com/document/application-notes/) — FT232RL vs FT232RNL differences (relevant to late-production genuine boards).

## 2. Geometry (board frame)

**Frame.** Look at the component (top) side: the side with the MCU, reset button, LEDs and USB connector. Turn it so the silkscreen reads normally: **USB connector on the LEFT, ICSP pads on the right, the digital row (D12…TX1) along the TOP edge and the analog/power row (D13…VIN) along the BOTTOM edge**. This is exactly the Eagle coordinate frame of NanoV3.3.brd, with no transform needed: the outline runs (0,0)–(43.18,17.78) and every layer-21 label is at rot R0 or R270 [3]. The origin is the bottom-left corner of the PCB, below the USB connector. +x points right, +y points up, units are mm. **The physical edge at the bottom is the long edge carrying D13, 3V3, REF, A0–A7, 5V, RST, GND, VIN.**

All coordinates below come from parsing NanoV3.3.brd [3], unless they are marked "(estimated from photo [4])". Bottom-side parts are given in the same top-view frame, as if seen through the board.

### 2.1 Outline, holes, finish

| Item | Value |
|---|---|
| PCB outline | **43.18 x 17.78 mm** rectangle (1700 x 700 mil), four straight layer-20 segments, **square corners (radius 0)** [3] |
| Thickness | 1.6 mm (unverified: the Eagle file does not state it; this is the common Arduino value) |
| Overall incl. USB | about 45.3 x 17.78 mm, because the Mini-B shell overhangs the left edge by about 2.1 mm (estimated from photo [4]); this matches Arduino's "45 x 18 mm" [2] |
| Mounting holes | 4 x non-plated, **drill 1.651 mm**, at **(1.27, 1.27), (41.91, 1.27), (1.27, 16.51), (41.91, 16.51)** [3]. Each is in line with a header row, one pitch beyond its end pin |
| Solder mask | Arduino teal / blue-green (≈ #0E6E7A to #127F86 base, with lighter teal over copper traces) (colour estimated from photo [4]) |
| Silkscreen | white, on both sides |
| Pad finish | silver (HASL-looking) on headers; the fiducials look gold-ish (estimated from photo [4]) |
| Fiducials | top: U$4 (37.52, 4.12) and U$5 (41.88, 14.61); bottom: U$53 (41.58, 3.86) and U$54 (41.88, 14.61); 1.0 mm copper dots [3] |
| Test points (not populated, top) | D− at (1.78, 14.35), D+ at (1.78, 11.81), 1.0 mm pads [3] |

### 2.2 Headers (J1, J2, ICSP J4)

| | J1 (top edge, digital) | J2 (bottom edge, analog/power) |
|---|---|---|
| Row centre y | **16.51** | **1.27** |
| Pins | 15, pitch 2.54 mm, x = 39.37 − 2.54·(k−1) for J1.k / J2.k (k = 1…15), i.e. x from 39.37 down to 3.81 | same |
| Pin 1 (square pad) | J1.1 = **TX1/D1** at (39.37, 16.51) | J2.1 = **VIN** at (39.37, 1.27) |
| Pads | 1.778 mm diameter, drill 0.914 mm; pin 1 square, the rest round [3] | same |
| Row spacing | **15.24 mm = 0.600 in** centre to centre (16.51 − 1.27) | |
| Fitted parts (A000005) | male 1x15 headers soldered on the factory board, **plastic on the BOTTOM side, pins pointing down** into the breadboard; on top only the solder fillets and pin stubs show [4] | same |

Arduino's own pin numbering runs **1–15 along J1 from TX1 (right) to D12 (left), then 16–30 along J2 from D13 (left) to VIN (right)**, so board pin n on J2 = J2.(31 − n) [1][3].

Header heights (estimated, standard 2.54 mm male header; not in the design files): plastic body 2.5 mm thick under the PCB, pins 0.64 mm square, about 6 mm below the plastic, stubs about 1–1.5 mm above the top copper.

**ICSP J4** (2 x 3, 2.54 mm, octagon pads 1.55 mm, drill 1.016 mm, **NOT populated on A000005**: six bare pads in the photo [4]):

| Pin | Signal | Pad centre |
|---|---|---|
| 1 | MISO (D12) | (41.81, 6.35) — silk "1" at (41.22, 4.78) |
| 2 | +5V | (39.27, 6.35) |
| 3 | SCK (D13) | (41.81, 8.89) |
| 4 | MOSI (D11) | (39.27, 8.89) |
| 5 | RESET | (41.81, 11.43) |
| 6 | GND | (39.27, 11.43) |

Silk box from (38.00, 5.08) to (43.08, 12.70); the label "ICSP" at (40.46, 12.95) [3].

### 2.3 Parts, top side (visible in the main view)

Centre = body centre (copper/tPlace bounding-box centre where the Eagle origin is off-centre). Rotation = Eagle rotation. Body size and height come from the package standard (heights unverified unless stated).

| Ref | What | Package | Centre (x, y) | Rot | Body w x h (mm), board axes | Height | Colour / marking |
|---|---|---|---|---|---|---|---|
| IC3 | ATmega328P-MU MCU | VQFN-32, 5 x 5 mm, 0.5 mm pitch, exposed pad | **(15.49, 8.84)** | 225° (sits as a diamond, corners pointing ±x and ±y) | 5.0 x 5.0 rotated 45° (bounding box ≈ 7.07 x 7.07) | 0.9 mm (1.0 max) | matte black. Laser marking read from the photo: `ATMEL` / `M328P` / `U-TH` / `35473D` / `232886R` (the last two lines are a lot/date code) [4]. Pin-1 dot at the **right (+x) corner**; pad 1 at (18.46, 9.33) |
| Y1 | 16 MHz ceramic resonator (3-terminal, built-in load caps) | SMD resonator | **(20.85, 13.21)** | 315° (long axis tilted 45°) | about 3.2 x 1.3 (estimated; part number unverified, typically Murata CSTCE16M0V53) | ≈ 1.0 mm | silver metal lid [4] |
| SW1 | RESET push-button | SMD tact switch (Omron B3U-1000P per BOM [5]) | **(24.51, 8.89)** | 270° | 2.5 (x) x 3.0 (y) body; pads span y 6.41–11.43 | 1.6 mm | silver frame, white/grey actuator; silk "RESET" printed vertically to its left [4] (the Eagle text says "RST" at (26.01, 9.42) R270) |
| TX | TX LED | 0805 chip LED | **(28.96, 13.46)** | 90 (long axis along x) | 2.0 x 1.25 | 0.8 | lit **green** [3] |
| RX | RX LED | 0805 | **(28.96, 10.41)** | 90 | 2.0 x 1.25 | 0.8 | lit **red** [3] |
| PWR | power LED (silk "ON" on the production board, "PWR" in the Eagle file) | 0805 | **(28.96, 7.37)** | 270 | 2.0 x 1.25 | 0.8 | lit **green** [3] (Nano 3.0 used **blue** [5]) |
| L | D13 user LED | 0805 | **(28.96, 4.32)** | 270 | 2.0 x 1.25 | 0.8 | lit **yellow/amber** [3] |
| J3 | USB Mini-B receptacle, 5-pin, SMD with 4 shell tabs | USB-MINI-B | body ≈ **x −2.1…7.1, y 4.99…12.79**, centre ≈ (2.5, 8.89); copper/tabs span x −0.03…7.84, y 3.68…14.10 [3] | opening faces **−x (left)** | ≈ 9.2 (x) x 7.7 (y) (estimated from photo [4]) | ≈ 3.9–4.0 mm (typical receptacle, unverified) | bright nickel shell |
| U$4, U$5 | fiducials | 1 mm Cu dot | (37.52, 4.12), (41.88, 14.61) | | | | gold dot |

**USB Mini-B J3 pads** [3]: 5 signal pads 2.54 x 0.51 mm at x = 7.06 (the rear of the receptacle, inboard) and y = 7.29, 8.09, 8.89, 9.69, 10.49 (0.8 mm pitch). The Eagle library numbers them in reverse of the USB standard: lib 1 (y 7.29) = **GND**, lib 2 = ID (n.c.), lib 3 (y 8.89) = **D+** → FT232RL USBDP pin 15, lib 4 = **D−** → USBDM pin 16, lib 5 (y 10.49) = **VBUS** → F1. Four shell tabs 1.78 x 2.29 mm at (1.11, 4.57), (6.70, 4.57), (6.70, 13.21), (1.11, 13.21) (all GND); two plastic locating-peg holes, drill 0.95 mm, at (4.16, 6.69) and (4.16, 11.09).

**Y1 pads**: (20.15, 13.91), (20.85, 13.21) (middle = GND), (21.56, 12.50). The resonator's long axis runs from upper-left to lower-right. **SW1 pads**: (24.51, 10.92) = GND and (24.51, 6.92) = RESET (the footprint has only these 2 pads).

LED silk labels (layer 21, size 0.81 mm, rotated R270, i.e. turned 90° clockwise so they read top-to-bottom) at x ≈ 31.1–31.4: "TX" (31.24, 14.05), "RX" (31.37, 11.25), "PWR" (31.37, 8.53), "L" (31.12, 4.83) [3]. The production photo adds small arrows next to TX and RX and prints **"ON"** instead of "PWR" [4].

### 2.4 Parts, bottom side (seen only when the board is flipped; coordinates in the top-view frame)

| Ref | What | Package | Centre (x, y) | Orientation | Notes |
|---|---|---|---|---|---|
| IC1 | **FT232RL** USB-UART | SSOP-28, body 10.2 x 5.3 mm, 0.65 mm pitch, ≈ 2.0 mm tall | **(10.38, 8.86)** | pin rows parallel to x; pin 1 at (14.61, 5.31), pin 14 at (6.15, 5.31), pin 15 at (6.15, 12.42), pin 28 at (14.61, 12.42) | the official back photo [4] shows **`FTDI` (logo) / `2535-B` / `U65NTC00` / `FT232RNL`**: current production uses the **FT232RNL**, the drop-in successor of the FT232RL (AN_560 [12]), dated 2025 week 35 |
| IC2 | **LM1117IMPX-5.0** 5 V LDO | SOT-223 | **(33.16, 6.48)** | the 3 leads face +x at x = 36.25 (pin 1 GND at y 8.79, pin 2 OUT at 6.48, pin 3 IN at 4.17); tab (OUT) faces −x at (30.05, 6.48) | the Eagle value is TI LM1117IMPX-5.0, but the official back photo shows an **ST logo, `LD1117` / `05H` / `S.T4`**-style marking, i.e. an **ST LD1117S50** in production (lot code read from the photo, approximate). LD1117: 800 mA, dropout about 1.1 V, **VIN abs. max 15 V** (ST datasheet, not downloaded this session) |
| D1 | **SS1P3L** Schottky, 1 A 30 V (Vishay eSMP) | DO-220AA (SMP) | **(28.58, 12.35)** | cathode (big pad) at (28.58, 11.62) → +5V; anode at (28.58, 13.97) ← VUSB | |
| F1 | **MF-FSMF050X** resettable PTC fuse, 500 mA hold / 1 A trip | 0603 | **(2.08, 4.50)** | pads at x 1.28 and 2.88 | between USB VBUS and VUSB |
| C2 | 4.7 µF 16 V tantalum (VUSB bulk) | TAN-A (3216) | (2.54, 9.02) | | |
| C5 | 4.7 µF 16 V tantalum (+5V bulk) | TAN-A | (32.92, 11.15) | | |
| C1 | 100 nF (AREF to GND) | 0603 | (7.04, 3.02) | | |
| C3 | 1 µF (+5V decoupling) | 0603 | (19.86, 6.12) | | |
| C4 | 100 nF **auto-reset capacitor** (FT232RL DTR# → RESET) | 0603 | (16.81, 6.05) | | |
| C6 | 100 nF (FT232RL 3V3OUT) | 0603 | (4.57, 9.02) | | |
| C7, C8 | 1 µF on +5V (LDO output; the VIN net has **no** input capacitor: it connects only J2.1 and IC2 pin 3) | 0603 | (29.64, 9.27), (28.57, 3.56) | | |
| C9 | 100 nF (VUSB) | 0603 | (31.29, 13.84) | | |
| RP1 | 4 x 1 kΩ array: D0↔FT TXD, D1↔FT RXD, PWR LED, RESET pull-up | CAY16 (1206 4-pack) | (23.62, 5.79) | | |
| RP2 | 4 x 1 kΩ array: L LED (from D13), TX LED, RX LED; the 4th resistor (pins 3/6) is unconnected | CAY16 | (23.62, 12.19) | | |
| U$53, U$54 | fiducials | | (41.58, 3.86), (41.88, 14.61) | | |

### 2.5 Silkscreen text a faithful drawing must show (top)

From the Eagle file [3] (size 0.81 mm vector font, white):

- Top row, centred above the pins at y ≈ 14.53 (text baseline), left to right: `D12 D11 D10 D9 D8 D7 D6 D5 D4 D3 D2 GND RST RX0 TX1`. The text x-starts are 2.77, 5.31, 7.82, 10.77, 13.34, 15.82, 18.39, 20.98, 23.47, 26.04, 28.52, 30.76, 33.30, 35.81, 38.35.
- PWM marks: small `*` (0.51 mm) at y = 15.29 above **D11, D10, D9, D6, D5, D3** (x = 5.41, 7.93, 10.49, 18.11, 20.68, 25.73).
- Bottom row, baseline y = 2.44, left to right: `D13 3V3 REF A0 A1 A2 A3 A4 A5 A6 A7 5V RST GND VIN` (x-starts 2.77, 5.33, 7.85, 10.74, 13.31, 15.82, 18.36, 20.88, 23.44, 25.98, 28.50, 31.04, 33.58, 36.20, 38.71).
- `ARDUINO.CC` at (18.24, 3.84), horizontal, under the MCU.
- `ARDUINO` (1.02 mm, R270) at (35.99, 12.27) and `NANO` (R270) at (34.37, 10.95), vertical (reading top-to-bottom), between the LEDs and the ICSP.
- `ICSP` at (40.46, 12.95); `1` (1.40 mm, R270) at (41.22, 4.78).

**Production-board differences seen in the official photo [4]** (draw these if the figure follows the photo): `3.3V` instead of `3V3`; `ON` instead of `PWR`; `RESET` vertical beside the button; arrows next to `TX`/`RX` and under `RX0`/`TX1`; the two `GND` labels and `VIN`/`TX1` sit in white-filled boxes (inverse silk). **The production top side shows no `ARDUINO.CC`, `ARDUINO` or `NANO` text**: the branding moved to the underside (see below). The underside (photo _04, viewed flipped so USB is on the right) shows: the Arduino infinity logo with `−` `+` and `®`, `ARDUINO`, `NANO` in a white box (over the area at board x ≈ 20–26, y ≈ 9–12), `ARDUINO.CC` printed vertically beside the resistor arrays, the FCC and CE logos, `ROHS COMPLIANT` and `DESIGNED AND ASSEMBLED IN ITALY` along the bottom row. The tantalum caps are yellow, marked `C475` (4.7 µF), and the resistor arrays are black, marked `102` (1 kΩ) [4]. Positions on the back are from the photo (estimated).

### 2.6 Nano 3.0 / clone layout (for reference, not the modelled board)

The Nano 3.0 Gravitech file is drawn portrait (17.78 x 43.18 mm, USB at the bottom, y = 0) [5]. On the top side it has the TQFP ATmega328P (`U1`, QFP032) rotated 45°, the reset button, a 16 MHz resonator, 4 LEDs (RX red, TX green, L amber, PWR blue) and the Mini-B. On the bottom it has the FT232RL, a **UA78M05** regulator (500 mA, SOT-223) and an **MBR0520** Schottky (SOD-123). Typical clones copy this layout but use a **CH340G (SOP-16) plus a 12 MHz crystal** (or a crystal-less CH340C), an **AMS1117-5.0** regulator, often a 16 MHz HC-49 crystal instead of the resonator, and often no polyfuse.

## 3. Electrical

### 3.1 MCU

| Item | Value |
|---|---|
| Part | ATmega328P-MU (VQFN-32) on Rev 3.3 [3][4]; ATmega328P-AU (TQFP-32) on Nano 3.0 and clones [5]. Same die and same pin numbering in both packages |
| Core | 8-bit AVR (RISC, 32 x 8-bit registers, Harvard architecture), about 1 MIPS/MHz → about 16 MIPS [1][6] |
| Clock | **16 MHz ceramic resonator Y1** (3-pin, load caps built in) on XTAL1/XTAL2 (pins 7/8) [3]. A resonator is only about ±0.5 % accurate, so `millis()` drifts by seconds per hour; it is not a quartz crystal |
| Flash | 32 KB; **30 720 bytes usable** (2 KB boot section) [10] |
| SRAM / EEPROM | 2 KB / 1 KB [1][2] |
| Fuses (Arduino defaults) | low **0xFF**, high **0xDA**, extended **0xFD** (BOD at 2.7 V), lock 0x0F [10] |
| Bootloader | Optiboot (`optiboot_atmega328.hex`, 115200 baud) on boards shipped since about 2018; boards before that, and many clones, have the old `ATmegaBOOT_168_atmega328.hex` at **57600 baud**, so in the IDE you pick "ATmega328P (Old Bootloader)" [10] |
| Board variant | `eightanaloginputs` (that is why A6/A7 exist in software), `ARDUINO_AVR_NANO` [10] |

### 3.2 Power tree

Nets from NanoV3.3.brd [3]:

```
USB VBUS (Mini-B) ─ F1 MF-FSMF050X (0.5 A hold / 1.0 A trip) ─ VUSB ─┬─ C2 4.7µF, C9 100nF
                                                                      └─ D1 SS1P3L Schottky (A→K) ─┐
VIN (pin 30) ───────── IC2 LM1117IMPX-5.0 (IN pin 3 → OUT pin 2/tab) ───────────────────────────┤
                                                                                                    ├─ +5V net: MCU VCC/AVCC, FT232RL VCC+VCCIO,
5V pin (pin 27) ───────────────────────────────────────────────────────────────────────────────────┘   PWR LED, ICSP pin 2, C3/C5/C7/C8
+5V → FT232RL internal LDO → 3V3OUT (pin 17) ─ C6 100nF ─ 3V3 pin (pin 17 of the board)
```

| Input | Range | Protection / path | Notes |
|---|---|---|---|
| USB Mini-B | 5 V ± 5 % (host) | **F1 polyfuse** (opens above about 1 A, resets when cooled) and then the **D1 Schottky** | The +5V rail is VBUS − VF(D1) ≈ **4.6–4.8 V** on USB (the drop depends on load; exact VF of the SS1P3L is unverified, ≈0.3–0.45 V). The diode stops a VIN-powered board from back-feeding the PC |
| VIN (pin 30) | **7–12 V nominal** [2]. The datasheet says "7–15 V" [1]. LM1117 abs. max is 20 V, recommended max 15 V [8]. The **production board carries an ST LD1117S50, abs. max 15 V** (photo [4]), so **treat 15 V as the hard limit and 12 V as the practical maximum** | **No reverse-polarity diode on VIN** (none in the Rev 3.3 netlist [3]). LM1117 current limit 0.8–1.5 A (1.2 A typ) and thermal shutdown [8] | Dropout 1.2 V at 800 mA, so the practical minimum is about 6.5–7 V. Dissipation (VIN − 5)·I in a SOT-223 on a tiny board (RθJA ≈ 61.6 °C/W on the TI reference pad, more here): at 12 V each 100 mA costs 0.7 W (+45 °C or more). **Keep the total 5 V load under about 100–150 mA at 12 V** (engineering estimate) |
| 5V pin (pin 27) | 5.0 V ± 5 % regulated, input or output | **No protection**: it connects straight to the +5V net | When the board runs from VIN, **5V is an OUTPUT** carrying the LDO's 5.0 V, for sensors and servos within the LDO budget. When it runs from USB, 5V is an output at about 4.7 V, limited by the 500 mA polyfuse. Feeding 5 V in here bypasses the regulator and the diode. Do not feed it while VIN is also powered |
| 3V3 pin (pin 17) | output only, 3.3 V | from the FT232RL 3V3OUT, **max 50 mA** [7] | The datasheet [1] calls it "another regulator"; it is the FTDI's internal LDO. On CH340 clones the 3V3 pin is usually the CH340's V3 pin (internal regulator decoupling) and can supply only a few mA (unverified, clone-dependent) |

**Power-path selection**: there is no MOSFET or comparator. When USB and VIN are both connected, the LDO output (5.0 V) is higher than VUSB − VF (about 4.7 V), so D1 is reverse-biased and the board runs from VIN. The original arduino.cc Nano page described this as "automatically selected to the highest voltage source" (quoted from memory, unverified). There is no switching circuit and no indication of which source is in use.

### 3.3 Logic levels and current limits

| Item | Value |
|---|---|
| I/O voltage | **5 V** CMOS (VCC = +5V net) [2][6] |
| VIH / VIL at 5 V | VIH min 0.6·VCC = 3.0 V; VIL max 0.3·VCC = 1.5 V [6] (a 3.3 V signal is read as HIGH, but with only 0.3 V of margin) |
| 5 V tolerance | Not applicable: the board is 5 V. **Outputs are 5 V, so they can damage 3.3 V parts** (ESP-01, nRF24 data pins, 3.3 V sensors) without a level shifter or divider. Abs. max on any pin: −0.5 V to VCC + 0.5 V [6] |
| Per-pin current | **20 mA recommended** [2]; **40 mA absolute max** [6] |
| Port-group limits (sink, IOL) | C0–C5 + ADC6/ADC7 ≤ 100 mA; B0–B5 + D5–D7 + XTAL ≤ 100 mA; D0–D4 + RESET ≤ 100 mA [6] (as printed in DS40002061B; ADC6/ADC7 are input-only, so their grouping does not matter on this board) |
| Port-group limits (source, IOH) | C0–C5 + D0–D4 + ADC7 + RESET ≤ 150 mA; B0–B5 + D5–D7 + ADC6 + XTAL ≤ 150 mA [6] |
| Total | **200 mA** through the VCC and GND pins [6] |
| Internal pull-ups | 20–50 kΩ, on all digital pins (not on A6/A7) [6] |

### 3.4 Peripherals

| Function | Detail |
|---|---|
| ADC | 10-bit SAR, **8 channels A0–A7** (A6 = ADC6, A7 = ADC7 exist only in the QFN/TQFP packages and are **analog-input only**). Reference: AVCC (= the +5V rail, so about 4.7 V on USB) by default, `INTERNAL` 1.1 V, or `EXTERNAL` on the REF pin (with C1 100 nF to GND). The ADC clock is 125 kHz (prescaler 128) and a normal conversion takes 13 ADC clocks = **104 µs** [6], so `analogRead()` takes about 105–115 µs including call overhead |
| PWM | 6 pins, marked `*` on the silkscreen: **D3, D11** (Timer2, 490 Hz), **D5, D6** (Timer0, 977 Hz; Timer0 also runs `millis()`), **D9, D10** (Timer1, 490 Hz) [2][3][6] |
| DAC | none (`analogWrite` is PWM) |
| UART | D0 = RX, D1 = TX (USART0). It is **shared with the FT232RL through 1 kΩ resistors** (RP1) [3] |
| I2C | A4 = SDA, A5 = SCL [2]. No on-board pull-ups |
| SPI | D10 SS, D11 MOSI (COPI), D12 MISO (CIPO), D13 SCK. Also on ICSP J4 [2][3] |
| External interrupts | INT0 = D2, INT1 = D3; pin-change interrupts on all D/A0–A5 pins [6] |
| USB bridge | **FT232RL** (genuine): full-speed USB, VID 0x0403, PID 0x6001, an internal 12 MHz oscillator (no crystal), internal EEPROM with serial number, 3V3OUT LDO. CBUS0 = TXLED# and CBUS1 = RXLED# by factory default [7]. **DTR# (pin 2) → C4 100 nF → RESET** gives auto-reset [3]. Clones: **CH340G** (needs a 12 MHz crystal, VID 0x1A86 PID 0x7523, needs the WCH driver on older macOS/Windows) or CH340C (internal oscillator). Their auto-reset is the same DTR → 100 nF → RESET |
| On-board sensors | none |

### 3.5 LEDs and button (Rev 3.3 nets [3])

| Designator | Lit colour | Circuit | Active level | Meaning |
|---|---|---|---|---|
| PWR (silk "ON" on the production board) | green (Nano 3.0: blue [5]) | +5V → 1 kΩ (RP1) → LED → GND | on whenever +5V is present | power |
| L | yellow/amber | **D13 (PB5, MCU pin 17) → 1 kΩ (RP2) → LED → GND**, with no buffer (unlike the Uno R3, whose LED is buffered by an op-amp) | HIGH = on (≈ 3 mA) | user LED, `LED_BUILTIN` = 13. It also flickers on SPI SCK activity |
| TX | green | +5V → LED → 1 kΩ (RP2) → FT232RL **CBUS1 = RXLED#** (pin 22) | low (driven by the FTDI) | flashes when the **Nano sends** serial data to the PC |
| RX | red | +5V → LED → 1 kΩ (RP2) → FT232RL **CBUS0 = TXLED#** (pin 23) | low | flashes when the **PC sends** data to the Nano (including during uploads) |
| SW1 RESET | — | RESET (PC6, MCU pin 29) → switch → GND; pull-up **1 kΩ** to +5V (RP1) [3]; also on header pins 3 and 28 and ICSP 5 | press = LOW = reset | restarts the MCU and enters the bootloader for about 1 s |

The TX and RX LEDs show the **USB-serial bridge's** traffic. They do not flash when D0/D1 talk to another device without the PC.

## 4. Pinout (physical order)

Board pin numbers follow Arduino's convention [1]. "J" refers to the Eagle connector pin [3]. MCU pin = ATmega328P QFN/TQFP pin.

| Pin | Silk (Eagle / photo) | Arduino | MCU pin / port | Functions | Notes |
|---|---|---|---|---|---|
| 1 (J1.1, square) | TX1 | D1 | 31 PD1 | TXD, PCINT17 | goes to the FT232RL RXD through 1 kΩ; used by Serial and uploads |
| 2 (J1.2) | RX0 | D0 | 30 PD0 | RXD, PCINT16 | driven by the FT232RL TXD through 1 kΩ. **Anything wired here can block uploads** |
| 3 (J1.3) | RST | RESET | 29 PC6 | reset, active low | 1 kΩ pull-up; same net as pin 28 |
| 4 (J1.4) | GND | GND | | | |
| 5 (J1.5) | D2 | D2 | 32 PD2 | INT0, PCINT18 | |
| 6 (J1.6) | D3 `*` | D3 | 1 PD3 | **PWM OC2B (490 Hz)**, INT1 | |
| 7 (J1.7) | D4 | D4 | 2 PD4 | T0, XCK | |
| 8 (J1.8) | D5 `*` | D5 | 9 PD5 | **PWM OC0B (977 Hz)**, T1 | |
| 9 (J1.9) | D6 `*` | D6 | 10 PD6 | **PWM OC0A (977 Hz)**, AIN0 | |
| 10 (J1.10) | D7 | D7 | 11 PD7 | AIN1 | |
| 11 (J1.11) | D8 | D8 | 12 PB0 | ICP1, CLKO | |
| 12 (J1.12) | D9 `*` | D9 | 13 PB1 | **PWM OC1A (490 Hz)** | Servo library uses Timer1 → disables PWM on D9/D10 |
| 13 (J1.13) | D10 `*` | D10 | 14 PB2 | **PWM OC1B**, SPI SS | must stay an OUTPUT for SPI master mode |
| 14 (J1.14) | D11 `*` | D11 | 15 PB3 | **PWM OC2A**, SPI MOSI | ICSP 4; `tone()` uses Timer2 → disables PWM on D3/D11 |
| 15 (J1.15) | D12 | D12 | 16 PB4 | SPI MISO | ICSP 1 |
| 16 (J2.15) | D13 | D13 | 17 PB5 | SPI SCK, **LED L** | ICSP 3; the LED + 1 kΩ load means `INPUT_PULLUP` on D13 does not read HIGH reliably |
| 17 (J2.14) | 3V3 / "3.3V" | 3V3 | — | 3.3 V output from FT232RL 3V3OUT | **max 50 mA** |
| 18 (J2.13) | REF | AREF | 20 AREF | ADC reference | 100 nF to GND on board; never feed it while `analogReference(DEFAULT)` is active |
| 19 (J2.12) | A0 | A0 / D14 | 23 PC0 | ADC0, PCINT8 | |
| 20 (J2.11) | A1 | A1 / D15 | 24 PC1 | ADC1 | |
| 21 (J2.10) | A2 | A2 / D16 | 25 PC2 | ADC2 | |
| 22 (J2.9) | A3 | A3 / D17 | 26 PC3 | ADC3 | |
| 23 (J2.8) | A4 | A4 / D18 | 27 PC4 | ADC4, **I2C SDA** | |
| 24 (J2.7) | A5 | A5 / D19 | 28 PC5 | ADC5, **I2C SCL** | |
| 25 (J2.6) | A6 | A6 | 19 ADC6 | **analog input only** | no digital I/O, no pull-up; `digitalRead(A6)` does not work |
| 26 (J2.5) | A7 | A7 | 22 ADC7 | **analog input only** | same |
| 27 (J2.4) | 5V | +5V | 4, 6 VCC, 18 AVCC | 5 V rail | output on VIN/USB; regulated 5 V input |
| 28 (J2.3) | RST | RESET | 29 | | same net as pin 3 |
| 29 (J2.2) | GND | GND | 3, 5, 21 | | |
| 30 (J2.1, square) | VIN | VIN | — | LDO input 7–12 V | no reverse-polarity protection |

There are no strapping pins. There is no external flash: the program lives in the MCU's own flash. PB6/PB7 carry the resonator and are not broken out.

## 5. Programming

| Item | Value (October 2026) |
|---|---|
| IDE | Arduino IDE **2.3.10** (released 2026-06-09) [11]; Arduino CLI; Arduino Cloud Editor [1] |
| Core | **Arduino AVR Boards 1.8.8** (2026-05-21), FQBN **`arduino:avr:nano:cpu=atmega328`** (new bootloader) or **`arduino:avr:nano:cpu=atmega328old`** [10] |
| Toolchain | avr-gcc **7.3.0-atmel3.6.1-arduino7**, avrdude **8.0.0-arduino1** (cores 1.8.7 and later; 1.8.6 used avrdude 6.3.0-arduino17) (package index) |
| MicroPython / CircuitPython | **not available** for the ATmega328P (it has too little flash and RAM). Use C/C++ (Arduino) only |
| Upload command (IDE) | `avrdude -C<conf> -v -patmega328p -carduino -P<port> -b115200 -D -Uflash:w:<sketch>.hex:i` (57600 for the old bootloader) [10] |
| Upload path | PC → USB → FT232RL → DTR# pulses LOW → C4 couples a reset pulse into RESET → the MCU restarts in Optiboot (the L LED flashes briefly) → the STK500v1 protocol over UART at 115200 → flash written → the bootloader times out (about 1 s) and jumps to the sketch |
| Serial port names | FT232RL: macOS `/dev/cu.usbserial-A10xxxxx` (FTDI serial number), Linux `/dev/ttyUSB0`, Windows `COMn` ("USB Serial Port"); it enumerates as **"FT232R USB UART"**, VID:PID 0403:6001 [7]. CH340 clones: `/dev/cu.wchusbserial*` or `/dev/cu.usbserial-*` on macOS, `/dev/ttyUSB0`, VID:PID 1A86:7523 |
| ICSP | 6-pad J4 (unpopulated) or the header pins. Use an external programmer (`-c usbasp`, `-c avrisp`, Arduino-as-ISP) for "Burn Bootloader", which sets fuses L 0xFF, H 0xDA, E 0xFD, unlock 0x3F / lock 0x0F [10] |

**Real console text** (IDE 2.x, Blink, verbose upload off; byte counts vary with the core version):

```
Sketch uses 924 bytes (3%) of program storage space. Maximum is 30720 bytes.
Global variables use 9 bytes (0%) of dynamic memory, leaving 2039 bytes for local variables. Maximum is 2048 bytes.
```

The "Maximum is 30720 / 2048" values are exact [10]. The 924 / 9 counts for Blink are typical and unverified for 1.8.8.

With verbose upload on, a successful upload with avrdude 8 prints (wording from avrdude 8, unverified line by line):

```
avrdude: Version 8.0-arduino.1
...
avrdude: AVR device initialized and ready to accept instructions
avrdude: device signature = 0x1e950f (probably m328p)
avrdude: reading input file .../Blink.ino.hex for flash
avrdude: writing 924 bytes flash ...
Writing | ################################################## | 100% 0.15 s
avrdude: 924 bytes of flash written
avrdude: verifying flash memory against .../Blink.ino.hex
Reading | ################################################## | 100% 0.12 s
avrdude: 924 bytes of flash verified

avrdude done.  Thank you.
```

**Device signature 0x1E950F** = ATmega328P (exact; the ATmega328 non-P is 0x1E9514) [6].

Typical failure (wrong bootloader selected, the board does not reset, a charge-only cable, or something on D0):

```
avrdude: stk500_recv(): programmer is not responding
avrdude: stk500_getsync() attempt 1 of 10: not in sync: resp=0x00
...
avrdude: stk500_getsync() attempt 10 of 10: not in sync: resp=0x00
Failed uploading: uploading error: exit status 1
```

That is the classic avrdude 6.3 wording. avrdude 7/8 prints the same messages with an "error:"/"warning:" tag, e.g. `avrdude stk500_recv() error: programmer is not responding` (unverified exact text).

**Auto-reset side effect**: opening the Serial Monitor or any serial program asserts DTR, which **resets the Nano**, so a sketch restarts every time the monitor is opened.

**Boot behaviour**: on an external reset (button or DTR), Optiboot runs and flashes L **3 times** quickly (`LED_START_FLASHES=3` for the `atmega328` target in the Optiboot Makefile), waits about 1 s for an upload (watchdog `WATCHDOG_1S`), then starts the sketch. On a power-on, brown-out or watchdog reset, Optiboot jumps straight to the sketch (`if (!(ch & _BV(EXTRF))) appStart();` in optiboot.c, ArduinoCore-avr master). The old ATmegaBOOT bootloader waits about 1–2 s on every reset (unverified detail).

**Factory sketch**: genuine boards ship with a test/Blink sketch, so L blinks at 1 Hz on first power-up (unverified; widely reported). Clones also usually ship with Blink.

## 6. Real failure modes

| Event | What physically happens | What protects / what fails | What the user observes |
|---|---|---|---|
| **Reverse polarity on VIN** | There is **no series or reverse diode on VIN** [3]. The LM1117 input is pulled below GND; current flows through the regulator's internal parasitic/ESD structures and its output-to-input path | the LM1117 usually fails (sometimes it fails short and then passes the next correct-polarity input straight onto +5V) | No PWR LED; the regulator gets hot fast; a hot-epoxy smell; a dead board, or a later "5V rail = VIN" fault that kills the MCU and FTDI (unverified sequence, typical LDO failure) |
| **Reverse polarity on the 5V pin** | −5 V straight onto the +5V net: the substrate/ESD diodes of the ATmega328P and FT232RL conduct; the **C5 tantalum is reverse-biased**. If USB is also connected, D1 conducts and VBUS is shorted through F1 | nothing protects the chips; F1 trips if USB is attached | Hot chips, possibly a **cracked or smoking tantalum cap**, a burnt smell, a dead MCU. The PC may report a USB power surge |
| **Reverse polarity on USB** | Not possible with a keyed Mini-B | — | — |
| **Over-voltage on VIN** | 12 V works but heats the LDO; **above 15 V** (LD1117 abs. max, as fitted on production boards) the regulator can be destroyed; the TI LM1117 named in the Eagle file survives up to 20 V [8] | the LM1117 has current limiting and thermal shutdown, but no over-voltage protection | Under load the board **resets periodically** (thermal shutdown cycles), the regulator is too hot to touch. Above 20 V: a dead regulator, possibly a shorted pass device feeding VIN onto +5V |
| **Over-voltage on 5V** | The ATmega328P abs. max VCC is **6.0 V** [6]; there is no clamp | none; D1 stops it reaching USB | Above about 6 V the MCU/FTDI fail; you may see a warm MCU, then nothing |
| **Brown-out** | BOD fuse 0xFD → **VBOT 2.7 V typ (2.5–2.9 V)** [6][10]. Note that the ATmega328P speed grade is 0–10 MHz at 2.7–5.5 V and 0–20 MHz at 4.5–5.5 V, **linear in between** [6], so 16 MHz is in spec only above about **3.8 V** (2.7 + 0.6 × 1.8 V); between about 2.7 V and 3.8 V it runs out of spec and is not held in reset | BOD resets below about 2.7 V | Servos or motors on the USB-powered 5V pin make the rail dip and the board **resets**: L flashes (bootloader), the sketch restarts, the Serial Monitor shows the setup() banner again. Rare EEPROM/flash corruption happens if writes coincide with the brown-out |
| **Over-current on USB** | **F1 MF-FSMF050X**: holds 0.5 A, trips at 1.0 A (max time to trip 0.1 s at 8 A) [9] | the polyfuse goes high-resistance; it resets after the power is removed and it cools | The board goes dark (PWR off) or browns out; it comes back a few seconds or minutes after unplugging. The host may also disable the port ("USB accessory needs too much power") |
| **Over-current on VIN** | LM1117 current limit 0.8–1.5 A [8], then thermal shutdown | LDO | Voltage sag and resets; a very hot SOT-223 on the underside |
| **Over-current on an I/O pin** | Above **40 mA abs max** [6] (e.g. an LED without a resistor, a motor directly on a pin, a pin shorted to GND while HIGH) the output transistor and bond wire overheat | nothing | The pin dies (stuck or weak) while the rest of the chip works; the chip gets warm. Sinking a motor's inductive kick without a flyback diode can latch up or kill the pin |
| **Shorting 5V to GND** | On USB: the full short-circuit current flows through F1 and D1, and **F1 trips** within milliseconds | F1 | PWR LED off, the USB port may reset or complain, the Nano disappears from the port list; it recovers after the short is removed and F1 cools. On VIN: the LDO current-limits at about 1.2 A and then thermal-cycles; the regulator gets very hot |
| **Shorting 3V3 to GND** | Overloads the FT232RL's internal 3V3OUT LDO (50 mA rated) [7] | FTDI internal limiting (unverified) | The USB-serial bridge may drop off the bus or reset; it may damage the FTDI (unverified) |
| **Cold solder joint** | High-resistance or intermittent contact | — | On a **header pin**: the input reads random values, a sensor works only when the board is pressed. On the **Mini-B shell tabs or data pins** (a classic Nano weakness: the receptacle levers off the pads): the port disappears when the cable moves ("USB device not recognized"). On the **resonator Y1**: PWR is on but the sketch never runs and uploads fail with "not in sync". On the **LDO**: the board works on USB but not on VIN |
| **5 V into a 3.3 V device** | The Nano's I/O is 5 V. Driving a 3.3 V part's input (ESP-01, nRF24L01 data pins, many sensors) forces current through that part's input ESD diodes into its 3.3 V rail | nothing on the Nano | The 3.3 V part gets warm, behaves oddly, or dies; it can also back-power the 3.3 V rail. Use a divider or level shifter. A 3.3 V output into the Nano is read as HIGH (VIH = 3.0 V), so it works, with little margin |
| **5 V into the 3V3 pin** | Back-drives the FT232RL 3V3OUT regulator output | none | May damage the FTDI (unverified) |

**Beginner traps specific to the Nano**

1. Choosing the wrong processor: clones and older boards need **"ATmega328P (Old Bootloader)"** (57600). A wrong choice gives `not in sync: resp=0x00`.
2. CH340 clones need the WCH driver on older OS versions; some cheap Mini-B cables are **charge-only**.
3. Anything connected to **D0/D1** (Bluetooth module, GPS) blocks uploads, because it fights the FT232RL through the 1 kΩ resistors.
4. **A6/A7 are analog-only**: `digitalRead(A6)` and `pinMode(A6, INPUT_PULLUP)` do nothing useful.
5. Opening the Serial Monitor **resets the board**.
6. `Servo` (Timer1) disables PWM on D9/D10. `tone()` (Timer2) disables PWM on D3/D11.
7. Powering servos or motors from the 5V pin on USB → brown-out resets, polyfuse trips.
8. A 9 V PP3 battery on VIN lasts only hours, and the LDO wastes (9 − 5)/9 ≈ 44 % as heat.
9. Using D13 as a button input: the L LED + 1 kΩ load fights the internal pull-up.
10. The 3V3 pin gives only 50 mA: an nRF24L01 or ESP8266 browns out.
11. The Mini-B receptacle is held mainly by its solder joints; levering the cable sideways tears the shell tabs and pads off the board.

## 7. Lesson facts

Pins are chosen so they never clash: LED on D9 (PWM), button on D2 (INT0), sensor on A0, I2C on A4/A5. The UART D0/D1 stays free for the Serial Monitor.

### Lesson 1: Blink / digital output

- On-board **L LED = `LED_BUILTIN` = 13**, active HIGH. Optional external LED: D2 → 220–330 Ω → LED anode, cathode → GND.

```cpp
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
```

### Lesson 2: Button + sensor

- Button between **D2 and GND**, `INPUT_PULLUP` (pressed = `LOW`). No external resistor needed.
- Sensor: a 10 kΩ potentiometer (ends to 5V and GND, wiper to **A0**), or an LDR + 10 kΩ divider on A0. `analogRead` returns 0–1023 with reference AVCC (about 4.7 V on USB, 5.0 V on VIN).

```cpp
const int buttonPin = 2;
const int sensorPin = A0;

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  bool pressed = digitalRead(buttonPin) == LOW;
  digitalWrite(LED_BUILTIN, pressed ? HIGH : LOW);

  int raw = analogRead(sensorPin);
  float volts = raw * (5.0 / 1023.0);
  Serial.print(raw);
  Serial.print(" -> ");
  Serial.println(volts, 2);
  delay(100);
}
```

### Lesson 3: PWM / analog

- LED on **D9** (PWM, Timer1, 490 Hz) through 220 Ω. Pot on A0. `analogWrite` takes 0–255.
- Servo variant: signal on D9, **Servo library 1.3.0** (arduino-libraries/Servo, released 2025-11-06). It uses Timer1, so it disables PWM on D10. Power the servo from an external 5 V supply with a common GND, not from the Nano's 5V pin on USB.

```cpp
const int ledPin = 9;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int raw = analogRead(A0);              // 0..1023
  analogWrite(ledPin, map(raw, 0, 1023, 0, 255));
}
```

```cpp
#include <Servo.h>

Servo arm;

void setup() {
  arm.attach(9);                          // 544-2400 us default pulse range
}

void loop() {
  arm.write(map(analogRead(A0), 0, 1023, 0, 180));
  delay(15);
}
```

### Lesson 4: Protocol (I2C)

- I2C: **SDA = A4, SCL = A5**, `Wire` library (bundled with the AVR core). There are no on-board pull-ups; most breakout modules include 4.7–10 kΩ pull-ups to their own VCC. A 0.96 in SSD1306 128 x 64 OLED is usually at address **0x3C**.
- Libraries: **Adafruit SSD1306 2.5.17** (2026-05-29) + **Adafruit GFX 1.13.0** (2026-10-20). Note that a 128x64 frame buffer takes **1024 bytes of the 2048-byte SRAM**, so keep strings in flash with `F("...")`.

```cpp
#include <Wire.h>

void setup() {
  Wire.begin();
  Serial.begin(9600);
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print(F("Found device at 0x"));
      Serial.println(addr, HEX);
    }
  }
}

void loop() {}
```

```cpp
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    for (;;) {}                           // not enough RAM or no display
  }
  display.clearDisplay();
  display.setTextSize(2);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(F("A0:"));
  display.println(analogRead(A0));
  display.display();
}

void loop() {}
```

Other protocol options: UART `Serial` at 9600/115200 through the FT232RL; SPI on D10–D13 (`SPI.h`). There is **no Wi-Fi or Bluetooth** on the classic Nano (the Nano 33 IoT and Nano ESP32 have it; they are not modelled).

## 8. Internals (for the see-through view)

| Part | What is really inside |
|---|---|
| ATmega328P-MU (VQFN-32) | A single CMOS silicon die (size unverified, roughly 3 x 3 mm class) glued with conductive epoxy to a **copper die-attach paddle that is the exposed pad on the underside** (soldered to GND). **Gold (or copper) bond wires**, about 25 µm, run from the die pads to the 32 lead-frame lands around the edge. Black epoxy mould compound, 0.9 mm thick. The die holds the AVR core, 32 KB flash, 2 KB SRAM, 1 KB EEPROM, 10-bit ADC with mux, 3 timers, USART/SPI/TWI, oscillator and BOD. (The TQFP-32 on clones uses the same die with gull-wing leads) |
| Y1 16 MHz resonator | A **PZT (lead-zirconate-titanate) ceramic** vibrating element plus two built-in load capacitors, sealed under a metal cap on a ceramic base, 3 terminals (middle = GND). **It is not a quartz blank** |
| FT232RL (SSOP-28) | One CMOS die: USB 2.0 full-speed transceiver (no external crystal: an internal 12 MHz oscillator multiplied by a PLL), UART engine, 128-byte RX / 256-byte TX buffers, internal EEPROM (VID/PID/serial), CBUS LED drivers, and a 3.3 V LDO (3V3OUT). Bond wires to a lead frame [7] |
| LM1117-5.0 (SOT-223) | Bandgap reference, error amp, **NPN pass transistor** (that is why the dropout is 1.2 V and not 0.3 V), current limit and thermal shutdown. The die sits on the large tab, which is the OUTPUT and the heat sink [8] |
| D1 SS1P3L | A Schottky barrier die (metal on n-silicon) in a flat eSMP moulded package; the cathode is the wide terminal |
| F1 MF-FSMF050X | A conductive polymer loaded with carbon black, sandwiched between two metal foil electrodes. When it heats, the polymer expands, the carbon paths separate and the resistance jumps by orders of magnitude [9] |
| C2/C5 tantalum | A sintered tantalum pellet anode, Ta₂O₅ dielectric, MnO₂ cathode, moulded yellow/black case with a polarity bar at the + (anode) end |
| Mini-B receptacle | A stamped, nickel-plated steel shell; a plastic tongue with 5 gold-flashed spring contacts (VBUS, D−, D+, ID, GND); 4 shell tabs soldered to the PCB |
| PCB | Two-layer FR-4 (top and bottom copper only in the Eagle file: layers 1 and 16 [3]), plated through-holes for the headers, vias between the layers, GND pour (signal `COM` with polygons) |
| Flash memory | No external flash chip: the sketch lives inside the ATmega328P |

## 9. Assembly and power-up

- **Manufacture**: double-sided SMD. The top (MCU, resonator, button, LEDs, USB) and the bottom (FT232RL, LDO, diode, polyfuse, caps, resistor arrays) are each stencilled and **reflowed**. The two 1x15 **through-hole headers go on last** (wave/selective or hand soldering), with the plastic on the bottom. The ICSP is left unpopulated. The bootloader and fuses are programmed through the ICSP pads (pogo-pin fixture), then the test sketch is loaded (process details unverified; inferred from the design and the photos).
- **Power-up from USB**: PWR LED on at once → the FT232RL enumerates ("FT232R USB UART", 0403:6001); on macOS a `/dev/cu.usbserial-…` port appears → the ATmega328P comes out of power-on reset (start-up delay set by the low fuse 0xFF) → Optiboot sees a power-on reset and starts the sketch immediately → the factory Blink makes L blink at 1 Hz. TX/RX stay dark until serial traffic.
- **Power-up from VIN**: identical, minus USB enumeration; the 5V pin becomes a 5.0 V output.
- **Pressing RESET**: L flashes briefly (bootloader), then the sketch restarts about 1 s later.

## 10. Uncertainties

1. **The package on the genuine Rev 3.3 board is QFN, not TQFP.** This is verified from the Eagle file [3] and the official photo [4], and it contradicts the brief's "TQFP-32". Older genuine Nanos (3.0) and clones use the TQFP. Some genuine production batches may differ; not verified.
2. **The regulator and the USB chip in production differ from the Eagle values.** The photo shows an ST LD1117 (Eagle: TI LM1117IMPX-5.0) and an FT232RNL (Eagle: FT232RL). Both are pin-compatible. Because of the LD1117, use **15 V** (not the LM1117's 20 V) as the VIN absolute maximum in simulations.
3. **Silkscreen differs between the Eagle file and the production photo** ("3V3" vs "3.3V", "PWR" vs "ON", the arrows, the inverse GND/VIN boxes). The photo shows a later artwork than the published V3.3 Eagle file. Positions come from the file; the text should follow the photo when the figure claims to show the current board.
4. LED colours: from the Eagle values (TX green, RX red, PWR green, L yellow). They were not confirmed lit on a real Rev 3.3 board. Nano 3.0 used a blue PWR LED.
5. Heights of the parts, PCB thickness (1.6 mm assumed), the resonator part number and size, the USB receptacle body size and the 2.1 mm overhang were estimated from the photo and standard packages, not extracted.
6. The exact avrdude 8.0 message wording, the Blink byte count for core 1.8.8 and the factory test sketch are unverified. (The Optiboot flash count, 3, was verified in the fact-check.)
7. The SS1P3L forward voltage at Nano loads is unverified (≈0.3–0.45 V assumed), so the "4.6–4.8 V on USB" figure is approximate.
8. Datasheet errors in [1], not trusted: it says "Micro-B USB cable" (the board has Mini-B [2][4]), it lists the MCU pins as "Serial Wire Debug" (an ARM term; meaningless here), and its "7–15 V" VIN disagrees with the tech-specs "7–12 V". This sheet uses 7–12 V recommended and 15 V absolute max (LD1117 as fitted).
9. The CH340-clone 3V3 pin capability, the FTDI behaviour on a 3V3 short, and the reverse-polarity failure sequences are typical engineering behaviour, not tested.
10. Bottom-side silkscreen positions were read from the photo, not extracted from the file (the parser read only the top layers).

### Corrections to the originals (Robotics Bench research notes)

- The originals call the Nano's connector **"micro-USB"** and draw a micro plug (robotics-bench-a/b). It is **USB Mini-B** [2][4]. Draw a Mini-B plug: about 6.8 mm wide x 3.0 mm tall at the tip, trapezoidal with bevelled lower corners. That is the same width as a micro plug but noticeably thicker (micro is about 1.8 mm).
- They draw the board **"blue"** on **"gold standoffs"**. The genuine A000005 is **teal/blue-green** with white silk and has no standoffs. Its four 1.651 mm holes are in line with the header rows, and on a mat it sits on its header pins.
- "18 x 43 mm" is right for the PCB (17.78 x 43.18); "45 x 18" includes the USB overhang.
- The **"328P" chip** they draw should be a **5 x 5 mm QFN diamond** (genuine Rev 3.3), not a large TQFP.
- The stepper figure drives STEP/DIR from **Nano pins 0 and 1 (D0/RX, D1/TX)**. That works electrically, but those pins are shared with the USB-serial chip through 1 kΩ, so the wiring disturbs uploads and Serial. A correct figure should use D2/D3 (or any of D2–D12).
- The "green power LED" is correct for Rev 3.3 (Eagle value "Green"), but on the production silk it is labelled **"ON"**.

## Verification

Adversarial fact-check, 2026-10-24 14:03–14:11 CDT. Board-frame claims were re-derived with an independent parser of the official NanoV3.3.brd (fresh download of the CAD zip). Eagle applies the element rotation first and then the mirror for bottom-side parts; that order was confirmed by matching computed pad centres against routed wire endpoints (21 of 24 matches on MR90/MR270 parts with rotate-then-mirror, 3 with the opposite order), and the sheet's bottom-side coordinates use the correct order.

| # | Claim | Status | Source | Old → new (corrections) |
|---|---|---|---|---|
| 1 | PCB outline 43.18 x 17.78 mm, square corners; 4 holes drill 1.651 mm at (1.27,1.27), (41.91,1.27), (1.27,16.51), (41.91,16.51) | confirmed | NanoV3.3.brd in https://docs.arduino.cc/static/e3c4fe1f9bee7ec63df398422b3257f4/A000005-cad-files.zip | |
| 2 | Headers J1/J2 at y 16.51 / 1.27, pin 1 (square) at x 39.37, pin 15 at x 3.81, pads 1.778 mm / drill 0.914 mm | confirmed | NanoV3.3.brd (same zip) | |
| 3 | Full header-to-net mapping (J1.1 D1/TX … J1.15 D12; J2.1 VIN, J2.3 RESET, J2.4 +5V, J2.5–J2.12 A7…A0, J2.13 AREF, J2.14 3V3, J2.15 D13) and MCU pin numbers (e.g. D2 = IC3.32, D3 = IC3.1, A6 = 19, A7 = 22, RESET = 29) | confirmed | NanoV3.3.brd signal contactrefs | |
| 4 | MCU on Rev 3.3 is IC3 `328P-MUR`, package VQFN32, at (15.49, 8.84) R225, pad 1 at (18.46, 9.33); official photo shows a leadless QFN marked ATMEL / M328P | confirmed | NanoV3.3.brd; https://cdn.shopify.com/s/files/1/0438/4735/2471/files/A000005_03.front.jpg | |
| 5 | Nano 3.0 used TQFP `ATMEGA328` QFP032 (U1), UA78M05, MBR0520, LEDs RED_RX / GREEN_TX / L_AMBER / BLUE (PWR) | confirmed | "Arduino Nano2.brd" in https://www.arduino.cc/en/uploads/Main/ArduinoNano30Eagle.zip | |
| 6 | Part positions: Y1 (20.85, 13.21) R315, SW1 pads (24.51, 10.92) GND / (24.51, 6.92) RESET, LEDs at x 28.96 (TX 13.46, RX 10.41, PWR 7.37, L 4.32), J3 Mini-B pads at x 7.06, ICSP pads, IC2 leads at x 36.25 / tab at 30.05, D1 cathode pad 11.62 | confirmed | NanoV3.3.brd (independent pad transform) | |
| 7 | L LED: D13 → RP2 1 kΩ → LED → GND, active HIGH; PWR: +5V → RP1 1 kΩ → LED | confirmed | NanoV3.3.brd nets D13/SCK–RP2.1, RP2.8–L.A, N$3 PWR.A–RP1.3 (RP1.6 = +5V) | |
| 8 | TX LED → RP2 → FT232RL CBUS1 (pin 22, RXLED# = data FT232R → host, i.e. Nano sends); RX LED → RP2 → CBUS0 (pin 23, TXLED# = data host → FT232R); both active low | confirmed | NanoV3.3.brd nets N$8/N$9/N$11/N$29; FT232R datasheet §3 CBUS options, https://cdn.sparkfun.com/datasheets/BreakoutBoards/DS_FT232R.pdf | |
| 9 | RESET pull-up 1 kΩ (RP1.4–RP1.5 to +5V); C4 100 nF between FT232RL DTR# (pin 2) and RESET; RESET also on J1.3, J2.3, ICSP 5 | confirmed | NanoV3.3.brd nets RESET, N$4 | |
| 10 | Power path: VBUS (J3.5) → F1 MF-FSMF050 → VUSB → D1 SS1P3L → +5V; VIN net = only J2.1 + IC2 pin 3 (no reverse diode, no input cap); 3V3 = FT232RL pin 17 + C6 | confirmed | NanoV3.3.brd nets N$26, VUSB, +5V, VIN, 3V3 | |
| 11 | MF-FSMF050X: 0603, 6 V max, 40 A, hold 0.50 A, trip 1.00 A, max time to trip 0.1 s at 8 A | confirmed | https://www.bourns.com/docs/Product-Datasheets/mffsmf.pdf | |
| 12 | LM1117: abs. max VIN 20 V, recommended max 15 V, current limit 800/1200/1500 mA at VIN−VOUT = 5 V, dropout 1.2 V at 800 mA, SOT-223 RθJA 61.6 °C/W | confirmed | https://www.ti.com/lit/ds/symlink/lm1117.pdf (SNOS412Q, Jan 2023) | |
| 13 | Production regulator is an ST LD1117 (photo marking `LD1117 / 05H S.T4`), abs. max DC input 15 V, dropout ≈ 1.1 V typ at 800 mA | confirmed | official back photo https://cdn.shopify.com/s/files/1/0438/4735/2471/files/A000005_04.back.jpg; ST LD1117 datasheet (copy) https://static.rapidonline.com/pdf/82-3064e.pdf | |
| 14 | Production USB chip marked `FTDI / 2535-B / U65NTC00 / FT232RNL` | confirmed | official back photo (as above) | |
| 15 | FT232R 3V3OUT "up to 50 mA"; CBUS0 default TXLED#, CBUS1 default RXLED#; internal 12 MHz oscillator; default VID 0403h; pins TXD 1, DTR# 2, RXD 5, VCCIO 4, USBDP 15, USBDM 16, 3V3OUT 17, VCC 20 | confirmed | https://cdn.sparkfun.com/datasheets/BreakoutBoards/DS_FT232R.pdf | |
| 16 | ATmega328P abs. max: 40 mA per pin, 200 mA VCC/GND, max operating voltage 6.0 V; VIH min 0.6 VCC, VIL max 0.3 VCC (2.4–5.5 V); pull-ups 20–50 kΩ; port-group limits; BODLEVEL 101 = 2.5/2.7/2.9 V | confirmed | Microchip DS40002061B, https://ww1.microchip.com/downloads/aemDocuments/documents/MCU08/ProductDocuments/DataSheets/ATmega48A-PA-88A-PA-168A-PA-328-P-DS-DS40002061B.pdf | |
| 17 | "At 16 MHz the ATmega328P is only specified for 4.5–5.5 V" (§6 brown-out row) | **corrected** | DS40002061B §29.3 Speed Grades ("linear between 2.7 V < VCC < 4.5 V") | old: 16 MHz needs 4.5–5.5 V, out of spec between 2.7 and 4.5 V → new: speed grade is linear from 10 MHz @ 2.7 V to 20 MHz @ 4.5 V, so 16 MHz needs ≥ ≈ 3.8 V; out of spec between ≈ 2.7 and 3.8 V |
| 18 | `analogRead()` "takes about 112 µs [6]" | **corrected** | DS40002061B ("A normal conversion takes 13 ADC clock cycles") | old: ≈ 112 µs cited to the datasheet → new: 13 clocks at 125 kHz = 104 µs per conversion, ≈ 105–115 µs per call with overhead |
| 19 | boards.txt `nano`: variant eightanaloginputs, f_cpu 16 MHz, max 30720 / 2048 bytes, 115200 (optiboot_atmega328.hex) vs 57600 (ATmegaBOOT_168_atmega328.hex, "ATmega328P (Old Bootloader)"), fuses L 0xFF H 0xDA E 0xFD, unlock 0x3F lock 0x0F; avrdude pattern `-p… -carduino -P… -b… -D -Uflash:w:…:i` | confirmed | https://raw.githubusercontent.com/arduino/ArduinoCore-avr/master/boards.txt and platform.txt | |
| 20 | Versions: AVR core 1.8.8 (2026-05-21), IDE 2.3.10 (2026-06-09), Servo 1.3.0 (2025-11-06), Adafruit SSD1306 2.5.17 (2026-05-29), Adafruit GFX 1.13.0 (2026-10-20); core 1.8.7/1.8.8 use avr-gcc 7.3.0-atmel3.6.1-arduino7 + avrdude 8.0.0-arduino1, 1.8.6 used avrdude 6.3.0-arduino17 | confirmed | GitHub releases API (api.github.com/repos/…/releases/latest); https://downloads.arduino.cc/packages/package_index.json | |
| 21 | Optiboot: L flashes on external reset, ≈ 1 s timeout, power-on reset goes straight to the sketch | confirmed, and flash count added | https://github.com/arduino/ArduinoCore-avr/blob/master/bootloaders/optiboot/optiboot.c and Makefile | old: "a few quick flashes; count unverified" → new: 3 flashes (`LED_START_FLASHES=3`) |
| 22 | Tech specs: Mini-B USB, LED pin 13, 14 digital / 8 analog / 6 PWM, I/O 5 V, input 7–12 V nominal, 20 mA per I/O pin, 7 g, 18 x 45 mm; datasheet text "7-15V unregulated external power supply (pin 30)" and the erroneous "Micro-B USB cable" | confirmed | https://docs.arduino.cc/page-data/hardware/nano/page-data.json | |
| 23 | Servo default pulse range 544–2400 µs | confirmed | https://raw.githubusercontent.com/arduino-libraries/Servo/master/src/Servo.h | |
| 24 | Production silkscreen: `3.3V`, `ON`, vertical `RESET`, TX/RX arrows, boxed GND/VIN/TX1; underside ARDUINO / NANO box, ARDUINO.CC vertical, C475 tantalums, `102` arrays, "DESIGNED AND ASSEMBLED IN ITALY" | confirmed | official front/back photos (as above) | |
| 25 | SS1P3L forward voltage (≈ 0.3–0.45 V assumed), hence "+5V ≈ 4.6–4.8 V on USB" | unverified | distributor listings only (VF max 0.45 V at 1 A, e.g. https://octopart.com/part/vishay/SS1P3L); the Vishay PDF could not be fetched | |

Not re-checked in this pass, and left as the researcher marked them: part heights, PCB thickness, USB overhang, resonator part number, LED lit colours on a real board, avrdude 8 message wording, the Blink byte counts, the factory sketch, CH340-clone 3V3 capability and the failure-mode sequences.
