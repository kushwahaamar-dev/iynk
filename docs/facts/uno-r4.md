# Arduino UNO R4 Minima (ABX00080) and UNO R4 WiFi (ABX00087): fact sheet

Status: verified against Arduino's official Altium design files, BOMs, STEP models, datasheets and the Arduino Renesas core, 2026-10-24. Anything marked **(unverified)** could not be checked in the time box. Anything marked **(estimated from ...)** is not in a design file.

## 0. Header: what is modelled

| | UNO R4 Minima | UNO R4 WiFi |
|---|---|---|
| Manufacturer | Arduino S.r.l. (Italy) | Arduino S.r.l. |
| SKU | ABX00080 | ABX00087 |
| Design files used | `ABX00080-cad-files.zip` (Altium `PCB.PcbDoc`, `TOP.SchDoc`, BOM CSV, STEP) [3] | `ABX00087-cad-files.zip` (Altium `PCB.PcbDoc`, `TOP.SchDoc`, `LEDMATRIX.SchDoc`, BOM CSV, STEP) [4] |
| Datasheet revision | "Modified: 21/10/2026" [1] | "Modified: 21/10/2026" [2] |
| Main MCU | Renesas R7FA4M1AB3CFM#AA0 (RA4M1) | same |
| Extra | SWD/JTAG 2x5 1.27 mm header | ESP32-S3-MINI-1-N8 (USB bridge + Wi-Fi 4 + BLE 5), 12 x 8 red LED matrix, Qwiic connector, OFF/VRTC header, ESP header |

What it is: the UNO R4 is the first 32-bit UNO. Both variants keep the classic UNO outline, header positions and **5 V logic**, but replace the ATmega328P with a Renesas RA4M1 (Arm Cortex-M4F, 48 MHz, 256 KB flash, 32 KB SRAM, 8 KB data flash) and the USB-B with USB-C. Power comes from USB-C (5 V) or VIN/barrel jack (6-24 V) through a Renesas ISL854102 buck converter. The Minima is the bare board: native USB on the RA4M1 and an SWD header. The WiFi adds an Espressif ESP32-S3-MINI-1 module, which is both the USB-to-serial bridge (it programs the RA4M1) and the Wi-Fi/Bluetooth radio, plus a charlieplexed 12 x 8 red LED matrix, a 3.3 V Qwiic I2C connector on `Wire1`, a 3.3 V LDO and a 5 V/3.3 V level translator [1][2][3][4].

## 1. Sources

1. Arduino, *UNO R4 Minima datasheet / user manual* ABX00080, modified 21/10/2026. https://docs.arduino.cc/resources/datasheets/ABX00080-datasheet.pdf . Ratings, component list, power tree, pin tables, current consumption.
2. Arduino, *UNO R4 WiFi datasheet* ABX00087, modified 21/10/2026. https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf . Same, plus ESP32-S3, USB bridge, LED matrix pins, Qwiic, OFF/VRTC.
3. Arduino, *ABX00080 CAD files* (Altium PcbDoc + SchDoc + BOM + STEP). https://docs.arduino.cc/resources/cad-files/ABX00080-cad-files.zip . **All Minima coordinates, rotations, footprints, nets and part numbers.**
4. Arduino, *ABX00087 CAD files*. https://docs.arduino.cc/resources/cad-files/ABX00087-cad-files.zip . **All WiFi coordinates, nets, part numbers, LED-matrix grid.**
5. Arduino, *ABX00080 / ABX00087 schematics PDF* and *full pinout PDF*. https://docs.arduino.cc/resources/schematics/ABX00080-schematics.pdf , https://docs.arduino.cc/resources/schematics/ABX00087-schematics.pdf , https://docs.arduino.cc/resources/pinouts/ABX00080-full-pinout.pdf , https://docs.arduino.cc/resources/pinouts/ABX00087-full-pinout.pdf . Cross-check of net names.
6. Arduino Renesas core, https://github.com/arduino/ArduinoCore-renesas : `variants/MINIMA/pins_arduino.h`, `variants/UNOWIFIR4/pins_arduino.h`, `boards.txt`, `cores/arduino/analog.cpp`, `libraries/Arduino_LED_Matrix`, `libraries/WiFiS3`, release list (GitHub API). Pin numbers, LED macros, USB VID/PID, upload tools, ADC behaviour, current release.
7. Renesas, *RA4M1 Group datasheet / User's Manual: Hardware* (R01DS0373, R01UH0887). https://www.renesas.com/en/products/microcontrollers-microprocessors/ra-cortex-m-mcus/ra4m1-32-bit-microcontrollers-48mhz-arm-cortex-m4-and-lcd-controller-and-cap-touch-hmi . Core, memory, peripherals (only general facts used; per-pin electrical limits **(unverified)** in this run).
8. Espressif, *ESP32-S3-MINI-1 datasheet*. https://www.espressif.com/sites/default/files/documentation/esp32-s3-mini-1_mini-1u_datasheet_en.pdf . Module size 15.4 x 20.5 x 2.4 mm, contents.
9. Renesas ISL854102 product page / datasheet. https://www.renesas.com/en/products/power-management/dc-dc-converters/isl854102 . Buck ratings (40 V, 1.2 A per BOM description).

How coordinates were obtained: the Altium `PCB.PcbDoc` of each board (an OLE compound file) was parsed with a small Python reader (no Altium needed). Component records give designator, layer, X/Y, rotation, footprint and height; pad records give pad positions and net names. All coordinates below are shifted so that the bottom-left corner of the board outline is (0, 0) (Altium origin offset 25.4 mm, 25.4 mm removed). The STEP model of each board was parsed for per-part bounding boxes (x, y, z) and colours; STEP and PCB frames agree (U1 centres coincide). BOM CSVs were compared with the PCB to find parts that are placed on the PCB but **not fitted**.

## 2. Geometry (board frame)

Frame: component side up, **USB-C and barrel jack on the left edge (x = 0)**, the 8+6 power/analog header along the **bottom edge**, the 10+8 digital header along the **top edge**. This is the classic UNO reading orientation. Origin is the bottom-left outline corner, +x right, +y up, mm. The design files contain no free silkscreen text on the top layer (labels are drawn as graphics), so silkscreen text orientation could not be extracted; it is the usual UNO orientation with digital labels readable from the bottom edge **(estimated from product photos)**.

### 2.1 Outline, holes, stack-up (identical on both boards) [3][4]

- Bounding box **68.58 x 53.34 mm** (2.700 x 2.100 in).
- Outline polygon (from `PcbDoc`, mm): (0,1) up the left edge to (0,52.34), R1 arc to (1,53.34), straight to (64.516,53.34), 45° chamfer to (66.04,51.816), down to (66.04,40.386), chamfer out to (68.58,37.846), down to (68.58,5.08), chamfer in to (66.04,2.54), down to (66.04,1.0), R1 arc to (65.04,0), along the bottom to (1,0), R1 arc to (0,1). So: three rounded corners **R = 1.0 mm** (bottom-left, top-left, bottom-right at x = 66.04) and the classic UNO stepped right edge (the board is only 66.04 wide above y = 40.386 and below y = 2.54).
- Thickness: STEP board body z = 0 to -1.61 mm (WiFi) and -1.69 mm (Minima, includes mask/finish) → **1.6 mm nominal**.
- Mounting holes, **Ø 3.20 mm**, non-plated mounting-hole pads, centres: **(13.97, 2.54)**, **(15.24, 50.80)**, **(66.04, 7.62)**, **(66.04, 35.56)**. Same on both.
- Fiducials (1 mm copper dot in a 2 mm mask opening): Minima (60.50, 34.00) and (2.00, 2.00).
- Solder mask: **Arduino teal** (approx. #008184) with **white** silkscreen **(estimated from product photos; the STEP file uses generic green #008000, which is not the real colour)**. Headers are black plastic.

### 2.2 Shared header geometry (identical X/Y on both boards) [3][4]

| Header | Designator | Pins / pitch | Pin positions | Type, height |
|---|---|---|---|---|
| Power + analog (bottom) | JANALOG | 14, 2.54 mm, one physical strip of 8 + gap + 6 | pin 1 (27.94, 2.54) ... pin 8 (45.72, 2.54); gap; pin 9 (50.80, 2.54) ... pin 14 (63.50, 2.54) | 4UCON 20TW-995 female, black, top at z = 8.5 mm |
| Digital (top) | JDIGITAL | 18, 2.54 mm (10 + 8) | pin 18 = SCL at (18.80, 50.80) ... pin 9 = D8 at (41.66, 50.80); gap (4.06 mm, the famous 160-mil offset); pin 8 = D7 at (45.72, 50.80) ... pin 1 = D0 at (63.50, 50.80) | 4UCON 20TW-994 female, black, top at z = 8.5 mm |
| ICSP (SPI) | Minima **J1**, WiFi **J3** | 2 x 3, 2.54 mm | pin 1 (63.63, 30.48), pin 2 (66.17, 30.48), pin 3 (63.63, 27.94), pin 4 (66.17, 27.94), pin 5 (63.63, 25.40), pin 6 (66.17, 25.40). Centre (64.897, 27.94) | Adam Tech PH2-06-UA male pins, vertical, top z = 8.5 mm |
| Reset button | PB1 | 6 x 6 mm SMD tact, 5 pads | centre (6.35, 49.403); body x 2.25-10.45, y 46.15-52.65, top z = 2.6 mm | TE 1571636-3. STEP colour black body (#181818) with a red part (#c33526) |
| USB-C | Minima **J3**, WiFi **J1** | 16-pos USB 2.0 Type-C receptacle | centre (3.538, 37.866), rot 270; pad A1 at (5.53, 41.50). Body x -0.86 to 5.94, y 33.10-42.64 → **overhangs the left edge by 0.86 mm**; opening faces -x | Hirose CX90B-16P, silver. STEP z -0.45 to 5.59 (the shell itself is about 3.3 mm tall **(unverified)**) |
| Barrel jack | Minima **J4**, WiFi **J5** | 2.1 x 5.5 mm, centre-positive | centre (5.69, 8.306), rot 0; pin 1 pad at (11.89, 8.31). Body x -1.96 to 12.44, y 3.46-12.86 → **overhangs the left edge by 1.96 mm**; opening faces -x | 4UCON 19TW-746, black (#696969 in STEP), top z = 9.8-9.9 mm, the tallest part |

Mounting-hole note: along the bottom edge the order from left is: barrel jack, hole (13.97, 2.54), WiFi-only JOFF (17.78-22.86), then JANALOG from x = 27.94.

### 2.3 UNO R4 Minima: every placed part [3]

Coordinates are the component origin from `PcbDoc` (for 2-pad parts this is the pad midpoint). Height `h` is the Altium model height, or the STEP top z where marked. "NF" = on the PCB but **not fitted** (absent from the BOM and the STEP model). Rotation is Altium rotation (counter-clockwise, degrees).

| Des. | What | Package | Centre (x, y) | Rot | Height | Colour / marking |
|---|---|---|---|---|---|---|
| U1 | MCU Renesas R7FA4M1AB3CFM#AA0 | LQFP-64, 10 x 10 body, 12 x 12 over leads, 0.5 mm pitch | (43.500, 31.500) | 270 | 1.67 (STEP) | black body; pin 1 pad at (47.25, 37.32), i.e. pin-1 dot at the **top-right** corner of the chip. Marking: Renesas logo, "R7FA4M1AB3CFM", date/lot code **(exact lines unverified)** |
| U2 | Buck converter Renesas ISL854102FRZ-T | DFN-12 3 x 4 mm, exposed pad | (9.738, 19.782) | 0 | 1.0 | black |
| L3 | Buck inductor 10 µH, K-WELL PMF42-103MN | 4.5 x 4.5 x 1.8 shielded | (4.836, 17.099) | 270 | 2.05 (STEP) | grey/black |
| C13, C19 | Buck input caps 22 µF 25 V X5R | 0805 | (4.691, 23.708), (4.691, 21.591) | 0, 180 | 0.7 | tan |
| C15-C18 | Buck output caps 22 µF 25 V | 0805 | (8.936, 15.947), (10.886, 15.947), (12.834, 15.962), (14.784, 15.962) | 90 | 0.7 | tan |
| D2 | VIN reverse-polarity Schottky Nexperia PMEG6020AELRX 60 V 2 A | SOD-123FL | (9.738, 25.947) | 180 | 1.0 | black, cathode band |
| D3 | VUSB → +5V Schottky PMEG6020AELRX | SOD-123FL | (9.738, 28.647) | 180 | ~1.0 | black |
| D4 | USB ESD array Nexperia PRTR5V0U2X | SOT-143B | (9.738, 38.366) | 0 | ~1.0 | black |
| C21 | 4.7 nF 1000 V (USB shield to GND) | 0805 | (4.184, 30.978) | 0 | 0.7 | tan |
| R23 | 1 MΩ (shield bleed) | 0402 | (4.559, 29.278) | 0 | 0.5 | |
| R24, R25 | USB-C CC1/CC2 pull-downs 5.1 kΩ (sink, 5 V default) | 0402 | (7.512, 35.391), (7.512, 41.891) | 90, 270 | 0.5 | |
| DL1 | **TX** LED, yellow, Kingbright KPT-1608YC (588 nm) | 0603 | (27.940, 36.576) | 180 | 0.55-1.0 | water-clear lens, yellow when lit |
| DL2 | **RX** LED, yellow, KPT-1608YC | 0603 | (27.940, 34.290) | 180 | 0.55 | same |
| DL4 | **L** (D13) LED, yellow, KPT-1608YC | 0603 | (27.940, 42.164) | 180 | 0.55 | same |
| DL3 | **ON** power LED, green, Broadcom HSMG-C190 (568 nm) | 0603 | (58.420, 36.576) | 180 | 1.0 (STEP) | green |
| R14, R15, R17 | 330 Ω for DL1, DL2, DL4 | 0402 | (30.413, 36.576), (30.420, 34.276), (30.420, 42.164) | 180 | 0.5 | |
| R16 | 330 Ω for DL3 | 0402 | (58.420, 38.066) | 0 | 0.5 | |
| J1 | ICSP 2 x 3 | see 2.2 | (64.897, 27.940) | 90 | 8.5 | black, gold pins |
| J2 | **SWD/JTAG 2 x 5, 1.27 mm**, Adam Tech HPH2-A-10-SGA (male, unshrouded) | 1.27 mm DIL | (61.630, 40.700) | 180 | top z 4.0 (STEP) | pin 1 (square pad) at **(62.27, 38.16)**; odd pins in column x = 62.27, even pins in column x = 61.00; rows y = 38.16, 39.43, 40.70, 41.97, 43.24 |
| J3 | USB-C | see 2.2 | (3.538, 37.866) | 270 | | silver |
| J4 | Barrel jack | see 2.2 | (5.690, 8.306) | 0 | 9.8 | black |
| PB1 | RESET | see 2.2 | (6.350, 49.403) | 0 | 2.6 | |
| L1, L2 | Ferrite beads Murata BLM18PG471SN1D (AVCC/AREF filtering) | 0603 | (52.228, 33.750), (52.228, 32.450) | 180 | 1.3 (model) | black |
| C4, C7, C11 | 4.7 µF 16 V | 0603 | (35.220, 28.300), (35.220, 35.076), (45.538, 40.116) | 0, 0, 270 | 0.8 | |
| C5, C6, C8, C10 | 100 nF | 0402 | (35.638, 27.000), (39.938, 39.666), (51.928, 31.250), (46.938, 39.666) | | 0.5 | |
| C9 | 1 µF | 0402 | (51.928, 34.950) | 0 | 0.5 | |
| R1, R2 | 5.1 kΩ 0603 I2C pull-ups (SCL, SDA to 5 V) | 0603 | (18.796, 44.259), (21.336, 44.259) | 270 | **NF** | not fitted: **no** on-board I2C pull-ups (the WiFi equivalents R4/R5 are also not fitted) |
| R3 | 5.1 kΩ (RESET pull-up) | 0402 | (13.438, 47.166) | 90 | 0.5 | |
| R10, R26 | 100 kΩ 0.1 % / 13.7 kΩ 0.1 % divider | 0402 | (51.928, 28.000), (51.928, 27.000) | | 0.5 | |
| Y1 | 16 MHz crystal 3.2 x 2.5 | SMD-4 | (42.638, 41.551) | 0 | **NF** | **not fitted** (with C1, C3 15 pF NF): the RA4M1 runs from its internal HOCO |
| other NF | C2, C22, C23, R12, R19 | 0402 | see `minima_comps.txt` | | NF | |
| Test points | VIN_TOP1 (6.603, 25.947), BUCK_IN_TOP1 (7.038, 23.682), "1" (14.873, 20.682), bottom: D+ (6.615, 39.40), D- (8.615, 39.40), GND1, GND2, **"LOVE"** (38.045, 23.326, bottom) | 0.8-1.0 mm pads | | | | the "LOVE" test point is an Arduino in-joke on the bottom side |

Remaining 0402 passives (R4-R9, R11, R13, R18, R20-R22, C12, C14, C20) are small parts in the U1 and U2 areas; their exact coordinates are in the extraction file listed in section 10 and need not be drawn individually.

### 2.4 UNO R4 WiFi: every placed part [4]

| Des. | What | Package | Centre (x, y) | Rot | Height | Colour / marking |
|---|---|---|---|---|---|---|
| U1 | MCU R7FA4M1AB3CFM#AA0 | LQFP-64 | **(52.750, 35.853)** | **0** | 1.67 | pin 1 pad at (46.92, 39.60): pin-1 dot at the **top-left** of the chip |
| M1 | **Espressif ESP32-S3-MINI-1-N8** (8 MB flash, metal RF can + PCB antenna) | 15.4 x 20.5 x 2.4 mm module | **(13.100, 21.500)** | 90 | 2.5 (STEP) | body x 0.25-20.90, y 13.72-29.27. Pads span x 6.1-20.1, so the **PCB antenna end is x ≈ 0.25-5.5, at the left board edge** between the barrel jack and USB-C; pad 1 at (7.15, 14.50). Can is silver with laser marking "ESP32-S3-MINI-1" + FCC/CE IDs **(exact text unverified)**; antenna section is the module's own (dark/black) PCB |
| U3 | Buck ISL854102FRZ-T | DFN-12 3 x 4 | (26.825, 22.100) | 90 | 1.0 | |
| L3 | 10 µH PMF42-103MN | 4.5 x 4.5 | (29.508, 17.248) | 0 | 2.05 | |
| U5 | 3.3 V LDO SGMICRO SGM2205-3.3XKC3G (Vin max 20 V, 800 mA) | SOT-223 | (26.325, 10.206) | 270 | 0.6 (Altium model) | black, tab. The STEP bbox for U5 (z to 8.7) is a modelling artefact; draw a normal SOT-223 (about 1.7 mm) **(estimated)** |
| U4 | Level translator TI TXB0108DQSR (5 V ↔ 3.3 V, RA4M1 ↔ ESP32) | 20-pin SON (DQS) 4 x 2 | (18.696, 33.276) | 90 | ~0.8 | |
| U2, U6 | USB D+/D- switches ON Semi NLASB3157DFT2G (route USB to ESP32-S3 or RA4M1) | SC-88 / SOT-363 | (12.525, 39.266), (12.525, 36.466) | 180 | 1.1 | |
| Q1, Q2 | 2N7002K N-MOSFETs, Qwiic I2C level shift (5 V IIC0 ↔ 3.3 V Qwiic) | SOT-23 | (63.270, 20.034), (66.670, 20.034) | 180 | 1.0 | |
| Q3 | 2N7002K, drives the L LED from D13 | SOT-23 | (12.525, 44.066) | 0 | 1.1 | |
| F1 | Bourns MF-MSMF050-2-W2 PTC 500 mA 15 V, **feeds the Qwiic 3.3 V** (+3V3 → +3V3_I2C) | 1812 | (9.125, 32.603) | 270 | 1.4 | marked with Arduino logo "OO" per BOM |
| D1 | VIN reverse-polarity Schottky PMEG6020AELRX | SOD-123FL | (15.395, 8.306) | 270 | ~1.0 | |
| D2 | VUSB → +5V Schottky PMEG6020AELRX | SOD-123FL | (26.396, 30.476) | 90 | ~1.0 | |
| D3 | USB ESD PRTR5V0U2X | SOT-143B | (9.125, 37.866) | 180 | ~1.0 | |
| DL1 | **TX** LED yellow KPT-1608YC | 0603 | (26.416, 36.576) | 0 | 0.55 | |
| DL2 | **RX** LED yellow KPT-1608YC | 0603 | (26.416, 34.290) | 0 | 0.55 | |
| DL4 | **L** LED yellow KPT-1608YC | 0603 | (26.416, 42.164) | 0 | 0.55 | |
| DL3 | **ON** LED green HSMG-C190 | 0603 | **(64.897, 39.553)** | **315** (diagonal) | 1.0 | sits in the right-edge chamfer area, not where the Minima's is |
| U_LEDMATRIX "1"-"96" | 96 red LEDs Corehy XHY-STB0603SR (625 nm, water clear, 42-88 mcd) | 0603 each, rotated 225° (diagonal) | grid: 12 columns x 8 rows, **pitch 2.10 mm** both ways. LED 1 at (34.412, 26.530) top-left; columns x = 34.412 + 2.1·c (c = 0..11, last x = 57.512); rows y = 26.530 - 2.1·r (r = 0..7, last y = 11.830). LED 96 at (57.512, 11.830). Matrix centre (45.962, 19.180); envelope about 25 x 17 mm | 1.0 (STEP) | clear lenses that look white/yellowish off, red on |
| J1 | USB-C | see 2.2 | (3.538, 37.866) | 270 | | |
| J2 | **Qwiic**, JST SM04B-SRSS-TB, 4-pin 1.0 mm, side entry | | (65.420, 14.346) | 270 | 3.0 (STEP) | body x 63.26-68.21, y 11.35-17.35: **opening faces +x, the right board edge**, flush with it (0.37 mm inside). Signal pads at x = 63.48: pin 1 GND (y 12.85), pin 2 3.3 V (13.85), pin 3 SDA (14.85), pin 4 SCL (15.85); mechanical tabs at (67.36, 11.55) and (67.36, 17.15). Natural (white/cream) nylon **(estimated from photos)** |
| J3 | ICSP 2 x 3 | see 2.2 | (64.897, 27.940) | 90 | 8.5 | |
| J5 | Barrel jack | see 2.2 | (5.690, 8.306) | 0 | 9.9 | |
| J6 | **ESP header** 2 x 3, 2.54 mm, PH2-06-UA (fitted per BOM and STEP) | | (18.796, 41.964) | 0 | 8.5 (STEP) | pin 1 (21.34, 43.23), pin 2 (21.34, 40.69), pin 3 (18.80, 43.23), pin 4 (18.80, 40.69), pin 5 (16.26, 43.23), pin 6 (16.26, 40.69) |
| JOFF | **OFF / GND / VRTC** 3-pin 2.54 mm header, 4UCON 21TW-204 | | (20.320, 2.540) | 0 | 8.5-9.5 | pin 1 OFF (17.78, 2.54), pin 2 GND (20.32, 2.54), pin 3 VRTC (22.86, 2.54); on the bottom edge, left of the power header and right of the mounting hole at (13.97, 2.54) |
| JANALOG, JDIGITAL | see 2.2 | | | | | |
| PB1 | RESET | see 2.2 | (6.350, 49.403) | | | |
| L1, L2 | Ferrites BLM18PG471SN1D | 0603 | (45.990, 41.428), (59.510, 41.428) | 0 | 1.3 | |
| SJ1 | Solder jumper, **bottom side**, open by default | 0805-size pads | (10.825, 34.066) | 0 | | bridging it routes USB permanently to the RA4M1 |
| MD | Test point for the RA4M1 MD (boot mode) pin | 0.8 mm | (60.646, 30.176) | | | |
| NF parts | C1, C22, C23, R4, R5, R8, R21, R37, R41, R53-R56 | 0402 | | | NF | |

Totals: Minima has 84 components in the PCB file, 59 designators fitted per the BOM; WiFi has 257 in the PCB file, 201 fitted, 96 of them matrix LEDs (the rest of the difference is test points, fiducials and not-fitted parts) [3][4].

### 2.5 Variant switch: what changes between the two boards

| Feature | Minima | WiFi |
|---|---|---|
| RA4M1 position / rotation | (43.5, 31.5), rot 270 | (52.75, 35.853), rot 0 |
| Buck + inductor | U2 (9.738, 19.782) + L3 (4.836, 17.099), left side under USB | U3 (26.825, 22.1) + L3 (29.508, 17.248), middle |
| 3.3 V source | RA4M1 internal USB LDO (VCC_USB pin), no separate regulator | SGM2205-3.3 LDO U5 (SOT-223) at (26.325, 10.206) |
| ESP32-S3 module | none | M1 at (13.1, 21.5), antenna at left edge |
| LED matrix | none | 12 x 8 at x 34.4-57.5, y 11.8-26.5 |
| TX/RX/L LEDs | x = 27.940, y 36.576 / 34.290 / 42.164 | x = 26.416, same y |
| ON LED | (58.42, 36.576), rot 180 | (64.897, 39.553), rot 315 |
| SWD 2 x 5 1.27 mm | J2 at (61.63, 40.7) | none |
| ESP header 2 x 3 | none | J6 at (18.796, 41.964) |
| OFF/VRTC header | none (pads absent) | JOFF at (20.32, 2.54) |
| Qwiic | none | J2 at right edge (65.42, 14.346) |
| ICSP | J1 | J3 (same position) |
| USB-C / jack designators | J3 / J4 | J1 / J5 |
| Polyfuse | none | F1 on the Qwiic 3.3 V only |
| Digital pin to RA4M1 port mapping | see section 4 (D4-D7 and D10-D13 differ) | |

### 2.6 Silkscreen and labels (both boards)

Not extractable from the design files (drawn as graphics). From Arduino product photos **(estimated from photos; verify against a photo before drawing text)**: top edge labels from left "SCL SDA AREF GND 13 12 ~11 ~10 ~9 8 | 7 ~6 ~5 4 ~3 2 TX▸1 RX◂0" and "DIGITAL (PWM~)"; bottom edge "IOREF RESET 3.3V 5V GND GND VIN" with "POWER", then "A0 A1 A2 A3 A4 A5" with "ANALOG IN"; LED labels "L", "TX", "RX", "ON"; "RESET" by PB1; "ICSP" by the 2 x 3 header; large "UNO" mark with "R4 MINIMA" or "R4 WIFI". The leftmost power-header pin (net MD) is labelled "BOOT" in the Minima datasheet pin table [1]; whether the silkscreen prints it is **(unverified)**. WiFi only: "OFF", "GND", "VRTC" beside JOFF, "ESP" beside J6, and a Qwiic label **(unverified)**.

## 3. Electrical

### 3.1 MCU (both) [1][2][7]

- Renesas **R7FA4M1AB3CFM#AA0**: Arm **Cortex-M4F** (FPU), **48 MHz**, **256 KB code flash**, **32 KB SRAM**, **8 KB data flash** (used as EEPROM), LQFP-64, -40 to 105 °C grade.
- Clock: internal **HOCO 48 MHz**. **No crystal is fitted on either board** (Minima Y1 16 MHz footprint not fitted; WiFi has none). No 32.768 kHz crystal either, so the RTC runs from the internal low-speed oscillator and drifts noticeably (users report minutes per day) **(drift figure unverified)**.
- **VCC = 5 V** (the whole RA4M1 runs at 5 V, so I/O is 5 V logic, as on the UNO R3). Datasheet note: "VDD controls the logic level and is connected to the 5V power rail" [2].
- Peripherals used by the board: 14-bit SAR ADC, 12-bit DAC (DA0 on P014 = A0), OPAMP (A1 +, A2 -, A3 out), CAN controller (needs an external transceiver), USB 2.0 Full-Speed device, RTC, 4 DMA, SCI UARTs, IIC, SPI, GPT timers (PWM), capacitive touch (CTSU).

### 3.2 Power tree [1][2][3][4]

| Input | Range (datasheet) | Path and protection | Notes |
|---|---|---|---|
| USB-C VBUS | 4.8-5.5 V, 5.0 typ | VBUS → Schottky PMEG6020AELRX (Minima D3, WiFi D2, 2 A 60 V) → +5V rail | ~0.3 V drop: "Power via USB supplies about ~4.7 V" to the RA4M1 [1][2]. CC1/CC2 each have a pull-down to GND (Minima R24/R25 5.1 kΩ; WiFi R50/R51, 5.1 kΩ per the WiFi BOM): a plain USB-C sink, default 5 V, no Power Delivery. PRTR5V0U2X ESD array on D+/D-/VBUS. **No polyfuse on USB on either board** (the WiFi F1 is only on the Qwiic 3.3 V). |
| VIN pin / barrel jack | **6-24 V**, 7 V typ | VIN → series Schottky PMEG6020AELRX (Minima D2, WiFi D1) → ISL854102 buck → +5V | Buck: 3-40 V input, **1.2 A** continuous output (Renesas datasheet). Switching frequency is set by its FS pin: 500 kHz internal, or 300 kHz-2 MHz with a resistor; the "2MHz" in the BOM text is the part's maximum, and the frequency actually used on these boards is **(unverified)**. Board limit 24 V comes from the 25 V input caps (22 µF 25 V X5R). Barrel jack is wired to VIN. |
| 5V pin | 5 V | directly on the +5V rail, **no protection** | Feeding 5 V here bypasses both diodes. |
| 3.3V pin | output | Minima: from the RA4M1 **VCC_USB** internal LDO, "not connected to the buck converter" [1]; current limit not stated by Arduino **(unverified, keep it to a few tens of mA)**. WiFi: SGM2205-3.3 LDO from +5V, 800 mA max, shared with the ESP32-S3 (Wi-Fi TX peaks about 350 mA) | |
| IOREF | output | tied to +5V on both boards (net check [3][4]) | |
| VRTC (WiFi) | coin-cell / battery | JOFF pin 3 → RA4M1 VBATT pin (U1 pin 4) with a decoupling cap; keeps only the RTC alive [2][4] | allowed voltage range per RA4M1 VBATT spec **(unverified, about 1.6-3.6 V)** |
| OFF (WiFi) | input | JOFF pin 1 → buck EN (U3 pin 7), pulled up to the buck input by R35 [4] | **Tie OFF to GND to switch off the buck converter.** Only affects VIN/jack power; it does not cut USB power. |

Rated current (Minima, USB-C, factory blink sketch): **29.71 min, 33.39 typ, 36.98 max mA** [1]. WiFi figure not stated in the extracted datasheet text **(unverified)**.

### 3.3 Logic levels and current limits

- RA4M1 I/O at **5 V**; inputs accept 0-5 V. Driving a 3.3 V input from an R4 pin needs a level shifter or divider.
- **8 mA per GPIO** is Arduino's stated safe limit ("can safely handle up to 8 mA") [1][2]. The UNO R3's 20 mA rule does not apply. Total package current limit per RA4M1 datasheet **(unverified in this run)**.
- ESP32-S3 pins (ESP header J6, Qwiic side) are **3.3 V only**. The datasheet warns that ESP32-S3 pins must not touch RA4M1 5 V pins [2].
- Main I2C bus (A4/A5 = SDA/SCL): **no pull-ups fitted on either board** (Minima R1/R2 and WiFi R4/R5, 5.1 kΩ to +5V, are on the PCB but not fitted) [3][4]. The Qwiic bus has its own 3.3 V pull-ups (R9, R11) after the MOSFET level shifter.

### 3.4 ADC, DAC, OPAMP, PWM

- ADC: 14-bit hardware, fixed at the highest resolution; `analogReadResolution(bits)` accepts **8, 10, 12, 14** (and 16, scaled) and only rescales; default is **10 bits** for UNO compatibility [6 analog.cpp]. Reference defaults to the 5 V analog supply (AVCC0, filtered by L1/L2 ferrites); `analogReference()` options in the core: `AR_DEFAULT` (5 V), `AR_INTERNAL` (internal reference, `AR_INTERNAL_VOLTAGE` = 1.43 V), `AR_INTERNAL_1_5V`, `AR_INTERNAL_2_0V`, `AR_INTERNAL_2_5V`, `AR_EXTERNAL` (AREF pin) [6]. Analog inputs on the header: A0-A5 (A4/A5 shared with I2C SDA/SCL).
- DAC: **12-bit on A0** (P014, DA0) [1][2]. `analogWriteResolution(12); analogWrite(DAC, value);` (`DAC` is `#define`d as `A0` in both variants [6]). Output range 0 to about 5 V.
- OPAMP: A1 = non-inverting input (P000 AMP+), A2 = inverting input (P001 AMP-), A3 = output (P002 AMPO) [3][4]. Library `OPAMP`: `OPAMP.begin(OPAMP_SPEED_HIGHSPEED);`.
- PWM (`~` on silkscreen): **D3, D5, D6, D9, D10, D11** (UNO-compatible set). The GPT timers allow `analogWrite()` on more pins in the core **(exact extra list unverified)**. Default PWM frequency **490 Hz** (`DEFAULT_RAW_PERIOD` comments in `cores/arduino/analog.cpp`); default write resolution 8 bits; the maximum useful `analogWriteResolution()` for PWM **(unverified)**.
- CAN: Minima **D4 = CANTX (P103), D5 = CANRX (P102)**; WiFi **D10 = CANTX (P103), D13 = CANRX (P102)**. Confirmed by the core: Minima `PIN_CAN0_TX 4`, `PIN_CAN0_RX 5`; WiFi `PIN_CAN0_TX 10`, `PIN_CAN0_RX 13` [6]. Needs an external transceiver (e.g. SN65HVD230 or MCP2551). Library `Arduino_CAN`: `CAN.begin(CanBitRate::BR_250k)`.

### 3.5 USB / serial / debug

- Minima: RA4M1 **native USB FS** directly on the USB-C. `Serial` is USB CDC; `Serial1` is D0/D1 (P301 RXD2 / P302 TXD2). USB VID:PID **2341:0069**, product "UNO R4 Minima"; in the DFU bootloader it is **2341:0369** (`boards.txt` `minima.pid.1`) [6]. SWD on J2 (SWDIO P108, SWCLK P300) plus a spare UART (pins 7/8: P502 RXD1 / P501 TXD1) [3].
- WiFi: USB-C → NLASB3157 switches U2/U6 → by default to the **ESP32-S3**, which acts as USB-to-serial bridge and programmer for the RA4M1 (UART via the TXB0108 translator; RA4M1 side P109 TXD9 / P110 RXD9). Writing HIGH to **P408** switches USB directly to the RA4M1; in the Arduino core P408 is **digital pin 21** (`variants/UNOWIFIR4/variant.cpp`: "(21) USB switch, drive high for RA4"), so the sketch code is `pinMode(21, OUTPUT); digitalWrite(21, HIGH);`. The datasheet's "D40" is wrong [2][6]. Bridging **SJ1** (bottom) does it permanently [2]. USB IDs: by default the PC sees the **ESP32-S3 bridge** as VID:PID **2341:1002**, product string "UNO WiFi R4 CMSIS-DAP" (bridge firmware `USB.PID(0x1002)`; `boards.txt` `unor4wifi.pid.0=0x1002`). **2341:006D** "UNO R4 WiFi" is the RA4M1's own native-USB ID (`USB_PID` in the variant), seen only when USB is switched to the RA4M1 [6]. `Serial` = USB (through the bridge), `Serial1` = D0/D1; the core defines 3 serial ports on WiFi (`SERIAL_HOWMANY 3`) [6].

### 3.6 LEDs [3][4][6]

| LED | Colour | Minima drive | WiFi drive | Active level |
|---|---|---|---|---|
| ON (DL3) | green | +5V → LED → 330 Ω (R16) → GND | +5V → LED → 330 Ω (R24) → GND | on whenever +5V exists |
| L (DL4) | yellow | **D13 (P111)** → LED → 330 Ω (R17) → GND | +5V → LED → 330 Ω (R25) → **2N7002 Q3 drain**, gate = **D13 (P102)** with 100 kΩ (R52) gate pull-down | active HIGH on both; the WiFi's L LED is buffered and puts no load on D13 |
| TX (DL1) | yellow | +5V → LED → 330 Ω (R14) → **P012** (`LED_TX`, pin 21) | +5V → LED → R22 → **P109** (RA4M1 UART to ESP32) | active LOW; flashes on serial/USB traffic |
| RX (DL2) | yellow | +5V → LED → 330 Ω (R15) → **P013** (`LED_RX`, pin 22) | **+3V3** → LED → R20 ∥ R23 (two 330 Ω in parallel, about 165 Ω) → **ESP_TXD0** (ESP32-S3 UART TX) | active LOW |
| Matrix (WiFi) | red x 96 | | charlieplexed on 11 RA4M1 pins: **P003, P004, P011, P012, P013, P015, P204, P205, P206, P212, P213** [2] | one LED at a time, scanned by a timer interrupt |

LED current: (5 V - about 2.0 V) / 330 Ω ≈ 9 mA for the yellow and green LEDs **(estimated from the resistor values)**.

### 3.7 Buttons and switches

- PB1 RESET: pulls RA4M1 RESET low (active LOW, 5.1 kΩ pull-up R3). Also on JANALOG pin 3, ICSP pin 5, Minima SWD pin 10. **Double-press** enters the bootloader (see 5).
- WiFi: no user button. SJ1 solder jumper as above. OFF pin as above.
- No on-board sensors on either board (the WiFi's ESP32-S3 has an internal temperature sensor, not exposed by Arduino libraries **(unverified)**).

## 4. Pinout (physical order)

### 4.1 JANALOG (bottom edge, left to right) [1][2][3][4]

| Pin | x | Printed label | Net | Function / notes |
|---|---|---|---|---|
| 1 | 27.94 | (blank or BOOT, see 2.6) | MD | RA4M1 MD boot-mode pin (P201). Classic UNO "NC" position. Do not pull low at reset (forces the ROM boot mode) **(behaviour unverified)** |
| 2 | 30.48 | IOREF | +5V | 5 V logic reference |
| 3 | 33.02 | RESET | RESET | active low |
| 4 | 35.56 | 3.3V | +3V3 | see 3.2 |
| 5 | 38.10 | 5V | +5V | |
| 6 | 40.64 | GND | | |
| 7 | 43.18 | GND | | |
| 8 | 45.72 | VIN | VIN | 6-24 V in. Same node as the barrel-jack centre pin, upstream of the reverse-polarity Schottky; when powered from the jack, VIN carries the jack voltage |
| 9 | 50.80 | A0 | P014 | AN09, **DAC** (12-bit) |
| 10 | 53.34 | A1 | P000 | AN00, OPAMP + |
| 11 | 55.88 | A2 | P001 | AN01, OPAMP - |
| 12 | 58.42 | A3 | P002 | AN02, OPAMP out |
| 13 | 60.96 | A4 | P101 | AN21, **SDA** (Wire) |
| 14 | 63.50 | A5 | P100 | AN22, **SCL** (Wire) |

### 4.2 JDIGITAL (top edge, left to right) [3][4]

| x | Label | Minima port | WiFi port | Notes |
|---|---|---|---|---|
| 18.80 | SCL | P100 | P100 | same net as A5 |
| 21.34 | SDA | P101 | P101 | same net as A4 |
| 23.88 | AREF | AREF | AREF | analog reference in |
| 26.42 | GND | | | |
| 28.96 | 13 | **P111** (SCK, GPT3A) | **P102** (SCK RSPCK, CAN RX) | LED_BUILTIN; SPI SCK |
| 31.50 | 12 | P110 (CIPO) | P410 (MISO) | SPI CIPO |
| 34.04 | ~11 | P109 (COPI) | P411 (MOSI) | SPI COPI, PWM |
| 36.58 | ~10 | P112 (CS) | **P103** (SSL, CAN TX) | SPI CS, PWM |
| 39.12 | ~9 | P303 | P303 | PWM (GPT7B) |
| 41.66 | 8 | P304 | P304 | |
| 45.72 | 7 | P107 | P112 | |
| 48.26 | ~6 | P106 | P111 | PWM |
| 50.80 | ~5 | **P102** (CAN RX) | P107 | PWM |
| 53.34 | 4 | **P103** (CAN TX) | P106 | |
| 55.88 | ~3 | P104 (IRQ1) | P105 (IRQ0) | interrupt, PWM |
| 58.42 | 2 | P105 (IRQ0) | P104 (IRQ1) | interrupt |
| 60.96 | TX▸1 | P302 (TXD2) | P302 | `Serial1` TX |
| 63.50 | RX◂0 | P301 (RXD2) | P301 | `Serial1` RX |

All digital pins are 5 V I/O, 8 mA max. The board-level SPI on the ICSP header is the same signal as D11/D12/D13 on each board (Minima ICSP: 1 = P110 CIPO, 3 = P111 SCK, 4 = P109 COPI; WiFi ICSP: 1 = P410, 3 = P102, 4 = P411) [3][4].

### 4.3 ICSP (both): 1 CIPO, 2 +5V, 3 SCK, 4 COPI, 5 RESET, 6 GND [1][2][3][4].

### 4.4 Minima SWD/JTAG J2 (2 x 5, 1.27 mm) [1][3]

| Pin | Datasheet | Design-file net |
|---|---|---|
| 1 | +5V | +5V |
| 2 | SWDIO | P108 SWDIO |
| 3 | GND | GND |
| 4 | SWCLK | P300 SWCLK |
| 5 | GND | GND |
| 6 | NC | no net |
| 7 | RX | P502 (SCI1 RXD) |
| 8 | TX | P501 (SCI1 TXD) |
| 9 | GND | GND |
| 10 | **NC** per datasheet | **RESET** per PCB |

Disagreement on pin 10: trust the design file (RESET), which also matches the standard Cortex 10-pin debug pinout (pin 10 = nRESET). Note the pin 1 is **+5V**, not a VTref at 3.3 V: use a probe that accepts 5 V target voltage.

### 4.5 WiFi only

- ESP header J6: 1 ESP_IO42 (MTMS, JTAG), 2 ESP_IO41 (MTDI, JTAG), 3 ESP_TXD0, 4 ESP_DOWNLOAD (GPIO0, boot strap: low at reset = ROM download mode), 5 ESP_RXD0, 6 GND. **3.3 V only** [2][4].
- JOFF: 1 OFF, 2 GND, 3 VRTC [2][4].
- Qwiic J2: 1 GND, 2 +3.3 V (via 500 mA PTC F1), 3 SDA, 4 SCL. Bus = RA4M1 IIC0 (P401 SDA0, P400 SCL0) level-shifted to 3.3 V by Q1/Q2; Arduino object **`Wire1`** ("The Qwiic I2C bus object is Wire1 and the standard I2C bus object is Wire") [2][4].

## 5. Programming

- IDE/toolchain: Arduino IDE 2.x, Boards Manager package **"Arduino UNO R4 Boards"** (`arduino:renesas_uno`), current release **1.6.0 (2026-06-03)** per the ArduinoCore-renesas GitHub releases list [6]. FQBNs `arduino:renesas_uno:minima` and `arduino:renesas_uno:unor4wifi`. Compiler arm-none-eabi-gcc (bundled). MicroPython also exists for the RA4M1 boards **(unverified for Oct 2026)**.
- Minima upload: `upload.tool=dfu-util` [6]. The board enumerates as a DFU device in its bootloader (TinyUSB based); the IDE prints dfu-util output such as `Opening DFU capable USB device...`, `Download [=========================] 100%`, `Download done.` **(console wording from memory, unverified)**.
- WiFi upload: `upload.tool=bossac`, `upload.protocol=sam-ba`, `use_1200bps_touch=true` [6]. The IDE opens the port at 1200 baud; the ESP32-S3 bridge resets the RA4M1 into its bootloader and bossac writes the flash (`Erase flash`, `Write N bytes to flash (M pages)`, `[====] 100%`, `Done in x seconds`) **(console wording unverified)**.
- Recovery: **double-press RESET** to force the bootloader; the L LED pulses (fades) while it waits **(unverified)**. Then select the port that appears and upload.
- ESP32-S3 firmware (WiFi): the bridge firmware (`uno-r4-wifi-usb-bridge`, an arduino-esp32 sketch per its README) is updated with the IDE's "Firmware Updater" or the `unor4wifi-updater` / espflash tools; ESP_DOWNLOAD (J6 pin 4) to GND during reset puts the ESP32-S3 in ROM download mode for esptool [6 bootloader README]. Latest bridge firmware release: **0.6.0 (2025-05-08)**, GitHub `arduino/uno-r4-wifi-usb-bridge` releases API, checked 2026-10-24 [6].
- Factory sketch: Minima ships with **Blink** (datasheet current note) [1]. WiFi ships with an LED-matrix animation demo **(unverified which)**.

## 6. Failure modes

| Fault | What happens | Protecting / failing part | What the user sees |
|---|---|---|---|
| Reverse polarity on barrel jack / VIN | Series Schottky (Minima D2, WiFi D1, 60 V 2 A) blocks; nothing powers from VIN | Schottky diode | ON LED stays dark; no heat |
| Reverse polarity on the 5V header pin | No protection; RA4M1 (and WiFi ESP32/LDO) see -5 V through the ESD diodes; large current | RA4M1 substrate diodes, LDO | board dead, hot MCU, possible smell; supply current-limits |
| Reverse USB | impossible with USB-C (keyed, CC-negotiated) | | |
| Over-voltage on VIN > 24 V | 25 V input caps exceeded, buck rated 40 V; caps may fail short above about 25-30 V **(threshold estimated)** | C13/C19 22 µF 25 V | possible crack/smoke on input caps, then short on VIN |
| Over-voltage on USB (> 5.5 V, e.g. a bad PD charger at 9-20 V) | Board is a 5 V sink (CC 5.1 kΩ only, no PD), so compliant chargers give 5 V. A non-compliant 9 V+ source goes straight to +5V through the diode | RA4M1 abs max (about 6.5 V **(unverified)**), ESP32 LDO | dead board |
| Brown-out | RA4M1 LVD/POR resets the MCU when VCC sags (LVD0 thresholds set in option bytes) **(threshold values unverified)** | | random resets when servos start on USB power |
| Over-current on a GPIO (> 8 mA, e.g. LED without resistor, motor) | pin voltage collapses, port overheats, can damage the pin driver | RA4M1 port | dim LED, wrong logic levels, dead pin |
| Over-current on 5 V from USB | no polyfuse on the board; host port's current limit trips; Schottky rated 2 A | host USB port, D3/D2 | USB disconnects, "USB device not recognised", board resets |
| Over-current on 5 V from VIN | ISL854102 current limit at about its 1.2 A rating **(limit value unverified)**, then thermal shutdown | buck U2/U3 | 5 V droops, resets, warm buck/inductor |
| Short 5V to GND | on USB: host port limit trips (no on-board fuse); on VIN: buck current-limits/hiccups | host port, buck | ON LED off or flickering, PC complains, warm Schottky |
| Short on Qwiic 3.3 V (WiFi) | F1 500 mA PTC heats and trips | F1 | Qwiic device dies off, recovers after cooling |
| 5 V into the 3.3V pin | Minima: back-drives the RA4M1 internal USB LDO output; WiFi: puts 5 V on the ESP32-S3 (abs max 3.6 V) and the LDO output | RA4M1 USB block / ESP32-S3 | Minima USB may stop enumerating; WiFi loses USB (the bridge is the ESP32), Wi-Fi dead |
| 5 V into an ESP header pin (WiFi) | exceeds ESP32-S3 3.6 V | ESP32-S3 | as above |
| 3.3 V sensor into an R4 input | usually reads HIGH, but the RA4M1 VIH at 5 V VCC may be up to 0.8 VCC (4.0 V) on some ports **(unverified)**: marginal | | flaky reads |
| Cold solder joint (header pin) | intermittent contact | | sensor values jump, works when pressed |
| Cold solder joint on USB-C | intermittent enumeration | | port appears/disappears |

Beginner traps specific to R4:
- 8 mA per pin, not 20 mA; use a transistor/MOSFET for loads.
- 3.3 V pin on the Minima is weak (internal LDO); do not power Wi-Fi modules or servos from it.
- `analogRead()` returns 0-1023 by default even though the ADC is 14-bit: call `analogReadResolution(14)` for 0-16383.
- D13 on the WiFi is P102, which is also CAN RX; on the Minima CAN is D4/D5. Datasheet tables mislabel these (see 10).
- AVR-specific code (direct `PORTB`, `avr/` headers, `Timer1`, `EEPROM` page assumptions) does not compile or behave differently.
- WiFi: the "UNO R4 WiFi" serial port is the ESP32 bridge; if a sketch switches P408 the port changes.
- Neither board has pull-ups fitted on the main I2C bus (A4/A5); modules usually bring their own.
- `Serial` on the WiFi goes through the bridge, so `while(!Serial);` behaves differently from the Minima's native CDC **(unverified)**.

## 7. Lesson facts

Libraries bundled with the core (versions from the core repository [6]): `Arduino_LED_Matrix` 1.1.0, `Arduino_CAN` 1.0, `EEPROM` 1.0, `OPAMP` 1.0.0, `RTC` 1.0, `WiFiS3` (version field "0.0.0" in the repo; ships with core 1.6.0). `ArduinoGraphics` **1.1.5 (2026-03-24)** (separate library, for text on the matrix; GitHub releases API).

1. **Blink / I-O** (both): `pinMode(LED_BUILTIN, OUTPUT); digitalWrite(LED_BUILTIN, HIGH); delay(500);`. `LED_BUILTIN` = 13 (DL4 "L", yellow). Button on D2 with `pinMode(2, INPUT_PULLUP)`, pressed reads `LOW`.
2. **Button + sensor**: potentiometer or LDR divider on A0-A2, `analogReadResolution(14); int v = analogRead(A1); // 0..16383`. Interrupt: `attachInterrupt(digitalPinToInterrupt(2), isr, FALLING);` (D2/D3 are the IRQ pins).
3. **PWM / analog out**: `analogWrite(9, 128);` on a ~ pin (3, 5, 6, 9, 10, 11) for LED fading; true analog with the DAC: `analogWriteResolution(12); analogWrite(DAC, 2048); // ~2.5 V on A0`. A sine-table on A0 makes an audio tone (as in Arduino's DAC tutorial).
4. **Protocol (Minima)**: I2C on `Wire` (A4/A5 or the SDA/SCL pins), `Wire.begin(); Wire.beginTransmission(addr); ... Wire.endTransmission();`. Or CAN with `Arduino_CAN` + transceiver (`#include <Arduino_CAN.h>`, `CAN.begin(CanBitRate::BR_250k)`, `CanMsg msg(CanStandardId(0x20), len, data); CAN.write(msg);`).
5. **Wi-Fi (WiFi)**: `#include "WiFiS3.h"`, `WiFi.begin(ssid, pass);` loop until `WiFi.status() == WL_CONNECTED`, then `WiFi.localIP()`; `WiFiServer server(80); WiFiClient client = server.available();`. `WiFi.firmwareVersion()` vs `WIFI_FIRMWARE_LATEST_VERSION` checks the bridge firmware.
6. **LED matrix (WiFi)**: `#include "Arduino_LED_Matrix.h"`, `ArduinoLEDMatrix matrix;`, `matrix.begin();`, `matrix.loadFrame(LEDMATRIX_HEART_BIG);` (built-in frame from the library's gallery header **(name unverified)**) or a `uint8_t frame[8][12]` drawn with `matrix.renderBitmap(frame, 8, 12);` (a macro for `loadPixels(&frame[0][0], 96)`) [6]; frames as `uint32_t frame[3]` (96 bits) with `matrix.loadFrame(frame)`. Text: `#include "ArduinoGraphics.h"` before the matrix header, then `matrix.beginDraw(); matrix.stroke(0xFFFFFFFF); matrix.textScrollSpeed(50); matrix.textFont(Font_5x7); matrix.beginText(0, 1, 0xFFFFFF); matrix.println(" Hello "); matrix.endText(SCROLL_LEFT); matrix.endDraw();`. Methods present in the library header: `begin, loadFrame, renderFrame, loadPixels, loadSequence/play/next/sequenceDone, autoscroll, clear, on, off, set, setCallback, textScrollSpeed, beginDraw/endDraw/endText` [6]. LED numbering: 0-95 row-major from the top-left (row 0 col 0) to bottom-right, matching the PCB designators 1-96 (LED 1 top-left, LED 96 bottom-right) [2][4] (the library index = designator - 1 **(inferred)**).
7. **Qwiic (WiFi)**: `Wire1.begin();` then use the sensor library with `Wire1` (e.g. `sensor.begin(Wire1)`); 3.3 V device, no level shifting needed by the user.

## 8. Internals for the see-through view

- **RA4M1 LQFP-64**: a silicon die (roughly 4-5 mm square **(unverified)**) glued to a copper lead-frame paddle, gold or copper bond wires fanning out to 64 gull-wing leads, encapsulated in black epoxy, 1.4 mm body + standoff = 1.6-1.7 mm. On-die: Cortex-M4F core, flash, SRAM, ADC/DAC/OPAMP analog block, USB PHY, internal oscillators (no external crystal on these boards).
- **ESP32-S3-MINI-1 (WiFi)**: inside the stamped metal can: the ESP32-S3 SoC (QFN die), an **8 MB quad-SPI flash** die/package (the "-N8"), a **40 MHz crystal**, an RF matching network and decoupling passives on a small 4-layer PCB; the can does **not** cover the meandered **PCB trace antenna** at one end, which on this board points to the left board edge [8].
- **ISL854102 buck**: DFN with exposed pad; inside a controller with **integrated high-side and low-side NMOS** switches (synchronous buck, per the Renesas datasheet) plus a bias LDO; the external parts are the shielded 10 µH inductor (ferrite drum core with copper winding inside a ferrite shield) and ceramic caps.
- **SGM2205 LDO (WiFi)**: pass transistor + bandgap + error amplifier in SOT-223; the tab is the heat path.
- **TXB0108**: 8 bidirectional auto-direction level-shift channels (one-shot edge accelerators).
- **USB-C receptacle**: stamped steel shell, a central plastic tongue with 2 x 12 gold contacts (only USB 2.0 + CC + VBUS used).
- **LEDs**: each 0603 LED is a tiny InGaAlP chip (yellow/red) or InGaN/AlInGaP (green **(unverified)**) on a lead frame with one bond wire, in a clear epoxy lens.
- **Schottky diodes**: metal-semiconductor junction die in a SOD-123FL flat-lead package.
- **PTC F1**: conductive polymer between two metal electrodes; it heats and its resistance jumps when tripped.
- **Crystal**: **none fitted** on either board, so do not draw a quartz can on the R4 (the Minima has an empty 3.2 x 2.5 footprint at (42.638, 41.551)).

## 9. Assembly and power-up

- Manufacturing: double-sided assembly; all SMD parts on the **top** side by reflow (bottom side carries only test points, the WiFi SJ1 jumper pads and silkscreen). Through-hole parts (female headers JANALOG/JDIGITAL, ICSP, WiFi JOFF and J6, barrel jack legs, USB-C shell legs) are soldered after reflow (wave/selective or pin-in-paste) **(process unverified)**. No socketed parts.
- Power-up (USB): VBUS → Schottky → +5V, green **ON** LED lights immediately. Minima: RA4M1 boots the Arduino bootloader then the sketch; enumerates as "UNO R4 Minima" (2341:0069) CDC; factory Blink flashes **L**. WiFi: ESP32-S3 boots the bridge firmware and enumerates as 2341:1002 ("UNO WiFi R4 CMSIS-DAP"; the IDE shows it as "Arduino UNO R4 WiFi" from `boards.txt`); the RA4M1 runs the factory sketch, which animates the LED matrix **(animation content unverified)**; TX/RX flicker on serial traffic.
- Power-up (VIN 7-12 V): buck starts (unless WiFi OFF is grounded), ON LED lights; no USB enumeration.

## 10. Uncertainties and disagreements

- **Datasheet errors (trust the design files)**:
  - WiFi datasheet feature list says "1x CAN (pin D4, D5)" [2], copied from the Minima. The WiFi design file and the WiFi pin table put CAN TX on **D10 (P103)** and CAN RX on **D13 (P102)** [2][4].
  - Minima pin table labels "D5/CANRX0 ... CAN Transmitter (TX)" and "D4/CANTX0 ... CAN Receiver (RX)" [1]; the design file says D4 = P103 CAN0_TX, D5 = P102 CAN0_RX [3].
  - Both pin tables label D0 "D0/TX0"; it is RX0 (P301 RXD2).
  - Minima SWD pin 10 is "NC" in the datasheet but **RESET** in the PCB [3].
  - WiFi datasheet "Getting started" says power is indicated by "LED (DL1)"; DL1 is TX. The power LED is **DL3** (component table and design file).
  - WiFi datasheet section 6.2 calls the USB-switch pin "P408 pin (D40)"; in the Arduino core P408 is digital pin **21** (fact-check 2026-10-24).
  - WiFi datasheet lists a "40 MHz crystal oscillator" as a board feature; that crystal is inside the ESP32-S3 module. The RA4M1 has no crystal.
- Silkscreen text and exact chip markings could not be extracted (graphics, not text, in the PcbDoc). Section 2.6 is from photos and memory.
- Real solder-mask colour (teal) is from photos; the STEP file's green is generic.
- RA4M1 electrical limits (total current, VIH, LVD thresholds, VBATT range, abs max), ISL854102 current-limit value, Minima 3.3 V pin current budget: not checked against the Renesas datasheets in this run.
- Upload console text, double-tap LED behaviour and the factory WiFi sketch: from memory, not re-verified.
- WiFi DL2 (RX) is wired to ESP_TXD0 through two resistors R20/R23 (both fitted); its exact behaviour (which traffic it shows) is inferred from the nets.
- Extraction data (all parts with coordinates) for future checks: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/facts-tools/uno-r4/minima_comps.txt` and `wifi_comps.txt` (coordinates already in the board frame used here).

## Verification

Adversarial fact-check, 2026-10-24 14:02-14:10 CDT. Sources were re-downloaded or opened independently: Arduino datasheets ABX00080/ABX00087 (PDF, "Modified: 21/10/2026"), Arduino schematic PDFs (rendered and read), the BOM CSVs, Gerber outline and NC-drill files inside the official CAD zips (parsed with a fresh script, not the researcher's extraction), ArduinoCore-renesas `main` (`boards.txt`, both variants, `analog.cpp`, LED-matrix, OPAMP and CAN libraries), the `uno-r4-wifi-usb-bridge` firmware source, the GitHub releases API, the Espressif ESP32-S3-MINI-1 datasheet and the Renesas ISL854102 datasheet.

| # | Claim | Status | Source | Old → new (corrections) |
|---|---|---|---|---|
| 1 | Board outline 68.58 x 53.34 mm | confirmed | Gerber `PCB.GM4` in https://docs.arduino.cc/resources/cad-files/ABX00080-cad-files.zip (x 0-68.58, y 0-53.34) | |
| 2 | Mounting holes Ø 3.20 mm at (13.97, 2.54), (15.24, 50.80), (66.04, 7.62), (66.04, 35.56), both boards | confirmed | NC drill `PCB-RoundHoles.TXT` (T08 = 0.12598 in, non-plated), ABX00080 and ABX00087 CAD zips | |
| 3 | JANALOG x 27.94-45.72 + 50.80-63.50; JDIGITAL x 18.80-41.66 + 45.72-63.50 at y 50.80; ICSP 2 x 3 at x 63.63/66.17, y 25.40-30.48 | confirmed | same drill files | |
| 4 | WiFi JOFF pins at x 17.78/20.32/22.86, y 2.54; J6 ESP header pins at x 16.26/18.80/21.34, y 40.69/43.23 | confirmed | ABX00087 drill file | |
| 5 | Minima digital-pin → port map (D2 P105, D3 P104, D4 P103, D5 P102, D10 P112, D11 P109, D12 P110, D13 P111; TX LED P012, RX LED P013) | confirmed | https://github.com/arduino/ArduinoCore-renesas/blob/main/variants/MINIMA/variant.cpp | |
| 6 | WiFi digital-pin → port map (D2 P104, D3 P105, D4 P106, D5 P107, D6 P111, D7 P112, D10 P103, D11 P411, D12 P410, D13 P102; Qwiic P400 SCL / P401 SDA) | confirmed | https://github.com/arduino/ArduinoCore-renesas/blob/main/variants/UNOWIFIR4/variant.cpp | |
| 7 | WiFi USB-switch pin "P408 (D40)" | corrected | variant.cpp line "(21) USB switch, drive high for RA4"; datasheet https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf sec. 6.2 says D40 | P408 = D40 → P408 = core digital pin 21 (datasheet wrong) |
| 8 | WiFi enumerates as USB 2341:006D "UNO R4 WiFi" | corrected | https://github.com/arduino/uno-r4-wifi-usb-bridge/blob/main/UNOR4USBBridge/UNOR4USBBridge.ino (`USB.PID(0x1002)`, "UNO WiFi R4 CMSIS-DAP"); `boards.txt` `unor4wifi.pid.0=0x1002`, `pid.1=0x006D` | 2341:006D → 2341:1002 via the bridge (default); 006D only for RA4M1 native USB |
| 9 | Minima USB 2341:0069, upload `dfu-util`; WiFi upload `bossac`, `sam-ba`, 1200 bps touch | confirmed (added Minima DFU PID 0x0369) | https://github.com/arduino/ArduinoCore-renesas/blob/main/boards.txt | |
| 10 | CAN pins: Minima TX D4 / RX D5; WiFi TX D10 / RX D13 | confirmed | `PIN_CAN0_TX/RX` in both `pins_arduino.h`; WiFi datasheet feature list says D4/D5 (datasheet error, as the sheet says) | |
| 11 | L LED: Minima P111 → DL4 → 330 Ω → GND; WiFi +5V → DL4 → R25 330 Ω → Q3 2N7002 drain, gate P102; both active HIGH | confirmed (added R52 100 kΩ gate pull-down) | https://docs.arduino.cc/resources/schematics/ABX00080-schematics.pdf , https://docs.arduino.cc/resources/schematics/ABX00087-schematics.pdf (page 1, LED block) | |
| 12 | TX/RX LEDs active LOW from +5V (Minima P012/P013; WiFi TX via R22 to P109_SCI9_TXD, RX from +3V3 via R20/R23 to ESP_TXD0); ON LED DL3 HSMG-C190 green, 330 Ω | confirmed (R20 ∥ R23 clarified) | same schematics; BOMs | |
| 13 | LED parts: KPT-1608YC yellow (588 nm) TX/RX/L, HSMG-C190 green (568 nm) ON | confirmed | BOM CSVs in both CAD zips | |
| 14 | Minima 3.3V pin is the RA4M1 VCC_USB internal LDO output, not the buck | confirmed | Minima datasheet sec. "operates on 5 V ... draws power from the VCC_USB pin"; Minima schematic note "VCC_USB is the output of the internal USB LDO providing 3V3" | |
| 15 | WiFi 3.3 V LDO SGM2205-3.3XKC3G, Vin max 20 V, 800 mA; buck ISL854102FRZ-T 40 V 1.2 A, both boards | confirmed | WiFi BOM; ABX00087 datasheet component table; https://www.renesas.com/en/document/dst/isl854102-datasheet | |
| 16 | Buck "2 MHz switching (BOM text)" | corrected | ISL854102 datasheet: 500 kHz internal or 300 kHz-2 MHz set by resistor | "2 MHz switching" → FS-pin set, 2 MHz is the max, board value unverified |
| 17 | ISL854102 internals "integrated high-side MOSFET (unverified)" | corrected | ISL854102 datasheet "Integrated high-side and low-side NMOS devices" | high-side only, unverified → high- and low-side NMOS integrated |
| 18 | VIN 6-24 V (7 V typ), VUSB 4.8-5.5 V, "~4.7 V" via USB, 8 mA per GPIO, double-tap RESET for bootloader | confirmed | both datasheets (Recommended Operating Conditions, Power Options, GPIO note, Board Recovery) | |
| 19 | No I2C pull-ups fitted (Minima R1/R2, WiFi R4/R5); Minima Y1 16 MHz crystal not fitted; no crystal on the WiFi; USB-C CC pull-downs 5.1 kΩ | confirmed (WiFi R50/R51 5.1 kΩ now confirmed) | BOM CSVs (R1/R2/R4/R5/Y1 absent; R24/R25 and R50/R51 = RC0402FR-075K1L 5k1); WiFi schematic has no Y part and uses P212/P213 (EXTAL/XTAL) for the LED matrix | |
| 20 | Qwiic F1 Bourns PTC 500 mA feeding +3V3_I2C | confirmed, part number refined | WiFi schematic page 1, WiFi BOM | MF-MSMF050-2 → MF-MSMF050-2-W2 (15 V, 500 mA) |
| 21 | LED-matrix pins P003 P004 P011 P012 P013 P015 P204 P205 P206 P212 P213; `renderBitmap` = `loadPixels(&b[0][0], rows*cols)`; library 1.1.0 | confirmed | WiFi datasheet sec. 8; `libraries/Arduino_LED_Matrix/src/Arduino_LED_Matrix.h`, `library.properties`; `LEDMATRIX_HEART_BIG` present in `gallery.h` | |
| 22 | ADC: default 10-bit, accepts 8/10/12/14/16; `AR_INTERNAL_VOLTAGE` 1.43 V; references AR_DEFAULT/INTERNAL/1_5V/2_0V/2_5V/EXTERNAL; DAC = A0 | confirmed | `cores/arduino/analog.cpp`, both `pins_arduino.h` | |
| 23 | PWM default 490 Hz | confirmed (was unverified) | `cores/arduino/analog.cpp` `DEFAULT_RAW_PERIOD_*` "490 Hz" | |
| 24 | `OPAMP.begin(OPAMP_SPEED_HIGHSPEED)`; `CAN.begin(CanBitRate::BR_250k)`; `CanMsg msg(CanStandardId(id), len, data)`; text example `beginText(0, 1, 0xFFFFFF)` / `endText(SCROLL_LEFT)` | confirmed | `libraries/OPAMP/src/OPAMP.h`; `libraries/Arduino_CAN/examples/CANWrite`; `libraries/Arduino_LED_Matrix/examples/TextWithArduinoGraphics` | |
| 25 | Versions: core 1.6.0 (2026-06-03), bridge firmware 0.6.0 (2025-05-08), ArduinoGraphics 1.1.5 (2026-03-24) | confirmed | GitHub releases API for arduino/ArduinoCore-renesas, arduino/uno-r4-wifi-usb-bridge, arduino-libraries/ArduinoGraphics | |
| 26 | Bridge firmware "ESP-IDF based" | corrected | bridge README: "This firmware uses arduino-esp32" | ESP-IDF based → arduino-esp32 sketch |
| 27 | ESP32-S3-MINI-1-N8 module 15.4 x 20.5 x 2.4 mm, 8 MB flash, 40 MHz crystal inside | confirmed | https://www.espressif.com/sites/default/files/documentation/esp32-s3-mini-1_mini-1u_datasheet_en.pdf | |
| 28 | Minima USB current 29.71 / 33.39 / 36.98 mA; RA4M1 48 MHz M4F, 256 KB flash, 32 KB SRAM, 8 KB data flash | confirmed | Minima datasheet | |

Not re-checked in this pass and left as the researcher marked them: per-part X/Y of small passives, the WiFi LED-matrix grid coordinates and the U1/M1 positions (from the researcher's PcbDoc parse; header and hole positions from the drill files agree with that parse), silkscreen text, chip markings, solder-mask colour, upload console wording, RA4M1 electrical limits (VIH, total current, VBATT range, LVD thresholds), ISL854102 current-limit value, WiFi current consumption, and the factory WiFi sketch.
