# ST NUCLEO-F401RE fact sheet

## 0. Header

| Field | Value |
|---|---|
| Product | NUCLEO-F401RE (STM32 Nucleo-64 development board) |
| Manufacturer | STMicroelectronics |
| PCB | MB1136, revision C (design files are "MB1136C"; silkscreen reads `MB1136` / `rev C`). Production boards carry a sticker on the bottom such as `MB1136 C-03`/`C-04`; the board variant is F401RE [1][3][4] |
| Order code | NUCLEO-F401RE [1][2] |
| Target MCU | STM32F401RET6 (U5), LQFP64 [4][6] |
| Debugger | Integrated ST-LINK/V2-1 based on STM32F103CBT6 (U2), LQFP48 [1][4] |

**What it is.** A white 70 x 82.5 mm two-part board. The bottom ~57 mm carries the target STM32F401RET6 (Cortex-M4F, 84 MHz, 512 KB flash, 96 KB SRAM), a blue USER button, a black RESET button, a green user LED, an Arduino Uno V3 compatible set of female headers and two 2x19 male "ST morpho" headers that expose every MCU pin. The top ~24.5 mm, separated by a row of routed slots, is a snap-off ST-LINK/V2-1 programmer/debugger with a USB mini-B connector. Over that one USB cable it gives SWD programming/debug, a virtual COM port (wired to the target's USART2) and a USB mass-storage drive (`NODE_F401RE`) for drag-and-drop programming. It also supplies the target's 8 MHz HSE clock from its MCO pin. [1][2]

## 1. Sources

Official first.

1. UM1724 Rev 17, "STM32 Nucleo-64 boards (MB1136)" user manual, ST. https://www.st.com/resource/en/user_manual/um1724-stm32-nucleo64-boards-mb1136-stmicroelectronics.pdf . Used for power (Tables 6-9, §7.5), LEDs (§7.6), buttons (§7.7), JP6 (§7.8), clocks (§7.9), USART (§7.10), solder bridges (Table 10), Arduino pinout (Table 16), morpho pinout (Table 29) and pre-cut PCB (§7.3). Local copy: `facts-dl/nucleo-f401re/um1724_latest.pdf`/`.txt`.
2. NUCLEO-F401RE product page and data brief DB2196, ST. https://www.st.com/en/evaluation-tools/nucleo-f401re.html . Used for the feature list and drive name.
3. MB1136 board design package (Altium Designer `MB1136.PcbDoc`, `.SchDoc`) "MB1136C", readme v2.1 dated 12-Nov-2024, ST (`mb1136_bdp.zip` from the product page CAD resources). **All coordinates in §2 come from this PcbDoc.** Previous runs parsed the OLE streams `Board6`, `Components6`, `Pads6`, `Tracks6`, `Arcs6`, `Texts6` with Python scripts (`facts-tools/nucleo-f401re/parttable.py`, `pads6.py`, `prims.py`, `texts6.py`) into `pcbdoc/parttable_boardframe.txt` and `pcbdoc/pads_nets_boardframe.txt`, transformed into the board frame below. I extracted the outline (mechanical layer 56/57) and silkscreen texts again in this run.
4. MB1136 manufacturing package (`mb1136_manufacturing.zip`, Gerbers, Excellon drill `drill_drawing_through_holes.exc`, `Pick_Place_for_MB1136.txt/.csv`, assembly drawing PDF) and the BOM package (`mb1136_bom.zip`, BOM for C-03 and C-04 F401RE variants). Used for part numbers and values, the fitted/not-fitted state and mounting hole diameters. The pick-and-place file agrees with the PcbDoc origins: for example U5 is at (850, 750) mil in the design frame, which is (32.46, 24.09) mm in the board frame.
5. MB1136 schematics C-03/C-04/C-05 PDFs (`mb1136_c0x_sch.pdf`). Used for the power tree topology (U3 to D4 to E5V).
6. STM32F401xD/xE datasheet DS10086 Rev 5, ST. https://www.st.com/resource/en/datasheet/stm32f401re.pdf . Used for pin definitions (Table 8, I/O structure FT), absolute maximum ratings (Table 12/13), POR/PDR/BOR thresholds and the PC13-PC15 limits.
7. RM0368 reference manual STM32F401xB/C/D/E (only for the BOR option-byte default; not re-read in this run, see §10).
8. stm32duino Arduino_Core_STM32 releases. https://github.com/stm32duino/Arduino_Core_STM32/releases . Version 3.0.0 is marked latest (published 23 July 2026); 2.12.0 came before it (Dec 2025). Variant: `variants/STM32F4xx/F401R(B-C-D-E)T/variant_NUCLEO_F401RE.h`.
9. STM32CubeProgrammer release note RN0109 and ST community post. https://community.st.com/stm32cubeprogrammer-mcus-30/stm32cubeprogrammer-v2-23-released-166573 . v2.23 (June/July 2026) is the latest I found.
10. Photos used only for colour and orientation checks: ST product-page feature image (`photos/st_feature_large.png`), Zephyr board page photo (https://docs.zephyrproject.org/latest/boards/st/nucleo_f401re/doc/index.html).

## 2. Geometry (board frame)

**Frame.** Component (top) side seen from above, USB mini-B connector at the **top**, MCU section at the bottom, silkscreen readable. The **bottom edge is the short edge opposite the USB connector**, the end of the board with `www.st.com/stm32nucleo` and the ST logo. Origin is at the bottom-left of the outline's bounding box (the left edge x = 0 and the lowest point of the bottom tab y = 0). +x right, +y up, mm.

Transform used: board_x = (x_mil_rel + 427.9528) x 0.0254, board_y = (y_mil_rel + 198.4252) x 0.0254, where x_mil_rel/y_mil_rel are relative to the PcbDoc user origin (2908.2677, 1403.1496) mil. Pick-and-place coordinates (relative to the same user origin) convert the same way.

### 2.1 Outline, slots, holes

Extracted from the routed outline on mechanical layer 56 (layer 57 is identical) [3]:

| Feature | Value |
|---|---|
| Overall size | **70.00 x 82.50 mm** (UM1724 says the same) [1][3] |
| Corners | 4 outer corners rounded, **R = 2.0 mm** (arc centres (2,4), (68,4), (2,80.5), (68,80.5)) |
| Bottom edge | Not straight. The main bottom edge is at y = 2.0. Between x = 11.5 and 48.5 a tab sticks out 2.0 mm to y = 0, with 45° chamfered sides: (11.5,2) to (13.5,0), flat to (46.5,0), then up to (48.5,2). Right of the tab the edge runs at y = 2.0 out to x = 68.0. Left of the tab it runs at y = 2.0 back to x = 2.0. |
| Left/right edges | x = 0 and x = 70, from y = 4.0 to 80.5 (broken at the snap line) |
| Top edge | y = 82.5, x = 2.0 to 68.0 |
| Snap-off line (ST-LINK separation) | Routed slots **1.0 mm wide, from y = 57.0 to 58.0** (centre y = 57.5), with round ends R 0.5. Slots run x = 0 to 16.0, 18.5 to 38.5, 42.12 to 50.45 and 53.5 to 70. **Three bridges** hold the parts together: x = 16.0-18.5, 38.5-42.12 and 50.45-53.5. The left and right slots open onto the board edges. No mouse-bite drill holes are in the drill file at the bridges (unverified by photo). |
| ST-LINK part | y = 58.0 to 82.5 (24.5 mm high) |
| MCU part | y = 0 to 57.0 (57 mm including the 2 mm tab) |
| Thickness | 1.6 mm (unverified, standard FR-4; the PcbDoc stack is a 2-layer board with copper on Top and Bottom only, and no thickness note is in the fabrication files) |
| Copper layers | 2 (top + bottom) [3] |
| Mounting holes | **3 x Ø3.2 mm** (drill tool 0.12598 in), unplated, at **(43.89, 2.50)**, **(10.87, 54.57)** and **(59.13, 53.30)** [4]. The ST-LINK part has none. |
| Other non-component holes | Ø1.0 mm: 2 pegs of CN1 at (44.86, 78.07) and (49.25, 78.07); 2 holes at (32.46, 20.97) and (32.46, 27.19) inside the U5 footprint, hidden under the chip [4] |

### 2.2 Colours

| Item | Colour |
|---|---|
| Solder mask | **White** (both sides) [10] |
| Silkscreen | **Blue** (medium/dark blue ink for all text, outlines, the Nucleo logo and the ST logo), as seen in the ST product photo `st_feature_large.png` and ST's render [10]. The PcbDoc footprint name `NUCLEO_black` does not reflect the ink colour |
| Morpho headers CN7/CN10 | Black plastic, 2x19 **male** pins on 2.54 mm pitch, gold/tin pins, "accessible on both sides of the board": the pins stick out above and below [1] |
| Arduino headers CN5/CN6/CN8/CN9 | Black **female** sockets [1] |
| B1 | Blue plastic cap on a 6x6 mm SMT tact switch (TD-0341X-G01-BLU) [4] |
| B2 | Black plastic cap, same switch (TD-0341X-A00) [4] |
| Jumper caps | Black, on CN2 (2 caps), JP5 (on 1-2), JP6. Two spare caps are parked on the pins of CN11/CN12 that stick out **under** the board [1] |
| ICs | Black epoxy LQFP with laser-etched marking |
| LD2 / LD3 | 0603 SMD LEDs, green (Everlight 19-213SYGC) / red (19-213-R6C) [4] |
| USB CN1 | Mini-B with a **gold-coloured** shell (ST photo). The opening faces the top edge and the shell sticks out past the board edge |
| LD1 | Square white diffuse body, about 3.2 x 2.8 mm, `COM` printed below it. The blue ESD warning triangle logo is to its right, next to CN11 |

### 2.3 Silkscreen text (top side)

Free texts from the PcbDoc TopOverlay. The positions are the text anchor (lower-left corner of the string before rotation), in mm. All are about 1.0 mm high unless noted. [3]

| Text | Anchor (x, y) | Rot | Note |
|---|---|---|---|
| `MB1136` | (8.3, 50.1) | 0 | 1.5 mm high |
| `rev C` | (8.3, 48.2) | 0 | 1.5 mm high |
| `www.st.com/stm32nucleo` | (15.3, 1.9) | 0 | 1.5 mm high, on the bottom tab |
| ST logo (10 mm footprint) | centre (46.68, 8.09) | 0 | bbox (40.84,4.80)-(52.27,10.88) |
| `E5V` | (7.3, 45.2) | 0 | next to CN7 pin 6 |
| `GND` | (7.3, 42.6) | 0 | |
| `USER` | (17.5, 55.1) | 0 | above B1 |
| `RESET` | (49.5, 55.1) | 0 | above B2 |
| `E5V` / `U5V` | (41.6, 46.4) / (51.0, 46.4) | 90 | either end of JP5 |
| `PWR` | (44.4, 44.9) | 0 | JP5 label |
| `IDD` | (33.5, 38.6) | 0 | JP6 label |
| CN6 labels (right of the socket, top to bottom) `IOREF` `NRST` `3V3` `5V` `GND` `GND` `VIN` | x = 12.4; y = 37.6, 34.8, 32.5, 29.7, 27.1, 24.6, 22.1 | 0 | `POWER` vertical at (16.7, 25.9) r90 |
| CN8 labels `A0`..`A5` | x = 12.4; y = 17.0, 14.4, 11.9, 9.4, 6.8, 4.3 | 0 | `AIN` vertical at (15.4, 13.4) r90 |
| CN5 labels (left of the socket, top to bottom) `SCL/D15` `SDA/D14` `AVDD` `GND` `SCK/D13` `MISO/D12` `PWM/MOSI/D11` `PWM/CS/D10` `PWM/D9` `D8` | y = 49.2, 46.4, 43.9, 41.4, 38.8, 36.3, 33.7, 31.2, 28.7, 26.1 | 0 | right-aligned against x ≈ 57 |
| CN9 labels `D7` `PWM/D6` `PWM/D5` `D4` `PWM/D3` `D2` `TX/D1` `RX/D0` | y = 22.1, 19.5, 17.0, 14.4, 11.9, 9.4, 6.8, 4.3 | 0 | |
| `ST-LINK` / `NUCLEO` | (19.3, 73.0) / (27.1, 73.4) | 90 | either side of CN2 |
| `RX` / `TX` | (14.4, 59.7) / (13.7, 62.2) | 0 | CN3 |
| `SWD` | (7.1, 75.4) | 0 | CN4 |
| `GND` | (2.0, 73.4) r0; (65.0, 75.9) r90 | | near CN12 / CN11 |
| `COM` | (58.9, 72.5) | 0 | under LD1 |
| `USB PWR` | (40.6, 74.6) | 90 | near JP1 |

Reference designators (`CN7`, `LD2`, `B1` and so on) are also printed next to most parts. The product name "NUCLEO-F401RE" is **not** in the MB1136 silkscreen. It is on a product sticker (position unverified). The nearest marks are the Nucleo logo artwork at (3.76, 71.08) on the ST-LINK part, bbox (1.09,67.22)-(6.27,73.06), and an ESD logo at (65.48, 70.83) [3].

**Chip markings.** U5, as seen in the ST product photo (`photos/crop_mcu.png`), reads left to right in five lines: `ARM` (logo), `STM32F401`, `RET6U`, then two lot/date lines (for example `GH26C VQ`, `CHN GH 543`, which vary per unit), then the ST logo and the `e3` circle in the lower right. There is a small round pin-1 dimple in the **lower-left** corner and a larger mould dimple in the upper-right. The BOM part is STM32F401RET6U [4]. U2 reads `STM32F103` / `CBT6` plus lot lines (line layout not checked on a photo).

### 2.4 Parts (top side unless noted)

Centre = pad-bounding-box centre from the PcbDoc. Rotation is Altium's, CCW degrees. Footprint w x h is the pad-extent box in the board frame after rotation. Heights are from typical manufacturer data (marked "typ") and are not in the design files. [3][4]

**MCU section (y < 57)**

| Des | Part | Package | Centre (x, y) | Rot | Footprint w x h | Height | Colour / marking |
|---|---|---|---|---|---|---|---|
| U5 | STM32F401RET6 target MCU | LQFP64 10x10 mm body, 0.5 mm pitch | (32.46, 24.09) | 0 | lead tips 13.5 x 13.5 (pads 0.22 x 1.70, rows at x = 26.56 / 38.36 and y = 18.19 / 29.99) | 1.6 max | black, `ARM` / `STM32F401` / `RET6U` / 2 lot lines + ST logo; **pin 1 at (28.71, 18.19)**, see note |
| U3 | LD1117S50TR 5 V LDO (VIN to 5 V) | SOT-223 | (29.35, 45.68) | 180 | 8.5 x 5.7 | 1.8 typ | black, `1117 50` (unverified) |
| U4 | LD39050PU33R 3.3 V 500 mA LDO (+5V to +3V3, MCU supply) | DFN6 3x3 | (45.80, 43.14) | 90 | 3.1 x 2.35 | 1.0 typ | black |
| D4 | STPS2L30A Schottky 2 A 30 V (U3 out to E5V) | SMA (DO-214AC) | (21.03, 47.59) | 180 | 5.5 x 1.6 pads; body 4.3 x 2.6 | 2.3 typ | black with grey cathode band |
| B1 | USER push button (blue) | 6x6 SMT tact, 4 pads | (26.74, 53.30) | 180 | 10.5 x 5.5 pads; body 6 x 6 | ~4.3 with cap (unverified) | blue cap |
| B2 | RESET push button (black) | 6x6 SMT tact | (43.26, 53.30) | 0 | 10.5 x 5.5; body 6 x 6 | ~4.3 with cap (unverified) | black cap |
| LD2 | Green user LED (D13/PA5) | 0603 | (44.53, 39.33) | 0 | 2.2 x 0.8; pad 1 (anode side, to R31) at (45.22, 39.33) | 0.8 | green |
| LD3 | Red PWR LED (+5V present) | 0603 | (22.74, 38.06) | 0 | 2.2 x 0.8 | 0.8 | red |
| JP5 | PWR source selector, 3-pin | 1x3 2.54 | (45.80, 47.59) | 180 | pins at x = 48.34 (pin 1, U5V), 45.80 (2, +5V), 43.26 (3, E5V), y = 47.59 | 2.5 plastic + 6 pin (typ) | black, jumper cap on 1-2 |
| JP6 | IDD (MCU current) jumper | 1x2 2.54 | (34.37, 41.24) | 180 | pin 1 (35.64, 41.24) = +3V3, pin 2 (33.10, 41.24) = VDD | | black, cap fitted |
| X2 | 32.768 kHz LSE crystal, ABS25-32.768KHZ-6-T | 8.0 x 3.8 SMD 4-pad | (20.40, 8.85) | 180 | 7.4 x 4.5 pads | 2.5 typ | metal lid |
| X3 | 8 MHz HSE crystal footprint, **NOT FITTED** | HC-49 THT, 2 holes | (30.56, 9.49) | 180 | holes at (28.02, 9.49) and (33.10, 9.49) | - | empty pads |
| L1 | Ferrite/inductor VDD to VDDA | 0603 | (43.89, 19.01) | 180 | | | |
| CN7 | ST morpho left, 2x19 male | 2.54 pitch | pin 1 (3.25, 50.76) | 270 | odd pins x = 3.25, even pins x = 5.79; rows y = 50.76 (pins 1/2) down to 5.04 (pins 37/38) | ~8.5 above (unverified) | black |
| CN10 | ST morpho right, 2x19 male | 2.54 | pin 1 (64.21, 50.76) | 270 | odd x = 64.21, even x = 66.75; y = 50.76 down to 5.04 | as CN7 | black |
| CN6 | Arduino POWER, 1x8 female | 2.54 | pin 1 (10.87, 40.60) | 270 | pins 1-8 at y = 40.60 down to 22.82 | 8.5 typ | black |
| CN8 | Arduino ANALOG, 1x6 female | 2.54 | pin 1 (10.87, 17.74) | 270 | pins 1-6 at y = 17.74 down to 5.04 | 8.5 typ | black |
| CN5 | Arduino DIGITAL high, 1x10 female | 2.54 | pin 1 (59.13, 26.88) | 90 | pins 1-10 at y = 26.88 up to 49.74 | 8.5 typ | black |
| CN9 | Arduino DIGITAL low, 1x8 female | 2.54 | pin 1 (59.13, 5.04) | 90 | pins 1-8 at y = 5.04 up to 22.82 | 8.5 typ | black |
| SB2 | 3.3 V regulator output bridge (ON) | JP2_SMD | (40.08, 43.14) top | 90 | 1.0 x 2.5 | solder blob | |
| SB3-SB65 except SB1/SB2 | 0 Ω solder bridges (pairs of pads) | JP2_SMD | **bottom side** | | | | not visible from the top |

Note on U5 (verified from the pad table [3]): pin 1 (VBAT) is the **left end of the bottom row** at (28.71, 18.19). Pins 1-16 run left to right along the bottom (pin 16 at (36.21, 18.19)). Pins 17-32 run up the right side (17 at (38.36, 20.34), 32 = VDD at (38.36, 27.84)). Pins 33-48 run right to left along the top (33 at (36.21, 29.99), 48 at (28.71, 29.99)). Pins 49-64 run down the left side (49 = PA14 at (26.56, 27.84), 64 = VDD at (26.56, 20.34)). So the pin-1 dimple is in the **lower-left corner** and the marking reads normally, left to right with the board upright (ST photo; this is ST's usual LQFP marking layout). U2 by contrast has pin 1 at the top of the left side (30.75, 70.02) with pins 1-12 going down (pin 12 at (30.75, 64.52)), the standard view.

Note on LEDs: for an 0603 LED, PcbDoc pad 1 is the net connected to the resistor (anode); pad 2 goes to GND (LD2 pad 2 = GND, LD3 pad 2 = GND) [3].

**ST-LINK section (y > 58)**

| Des | Part | Package | Centre (x, y) | Rot | Footprint | Height | Notes |
|---|---|---|---|---|---|---|---|
| U2 | STM32F103CBT6 (ST-LINK MCU) | LQFP48 7x7, 0.5 mm | (35.00, 67.27) | 270 | 9.5 x 9.5 | 1.6 max | pin 1 at (30.75, 70.02) (upper-left) |
| CN1 | USB mini-B receptacle, Townes MUSB5QS-BM1H6-NLB-E | SMD + 2 pegs + 4 shell tabs | (47.06, 77.77) | 0 | 11.7 x 8.5 pads; silk bbox (43.21,73.30)-(50.91,83.97) | ~4 | **opening faces +y (top edge)** and overhangs the top edge by ~1.5 mm (estimated from silk bbox top at 83.97 vs edge 82.5) |
| LD1 | COM bicolour LED red/green (LE-RGW35280) | 3.2 x 2.8 SMD, 4 pads | (60.40, 76.16) | 270 | 2.6 x 4.5 | ~1.9 | `COM` printed under it |
| U1 | LD3985M33R 3.3 V 150 mA LDO (ST-LINK supply) | SOT-23-5 | (51.51, 66.00) | 270 | | 1.1 | |
| T2 | STS9P3LLH6 P-MOSFET (USB 5 V power switch to target). C-03 and earlier boards fitted STS7PF30L; changed to STS9P3LLH6 in F401RE-C04 (UM1724 Table 35) | SO-8 | (61.04, 62.83) | 180 | 4.4 x 7.4 | 1.75 | |
| T1 | MMBT9013 NPN (drives T2 gate / control) | SOT-23 | (55.95, 66.64) | 270 | | 1.1 | |
| D1, D2, D3 | BAT60JFILM Schottky | SOD-323 | D1 (12.78, 73.62); D2 (51.51, 72.35); D3 (54.69, 62.19) | 180/180/270 | | 1.1 | D2: U5V to ST-LINK supply; D3: E5V to ST-LINK supply; D1: on CN4 pin 1 (VDD_TARGET sense) |
| X1 | 8 MHz crystal for ST-LINK (9SL8000012AFXHF0, 12 pF) | HC-49/S through-hole | (25.48, 65.99) | 90 | holes (25.48, 63.45) and (25.48, 68.53) | ~3.5-4 typ | metal can |
| CN2 | ST-LINK / NUCLEO selector, 1x4 male, 2 jumper caps | 2.54 | pin 1 (22.30, 79.97) | 270 | pins at y = 79.97, 77.43, 74.89, 72.35 | | caps ON = ST-LINK drives the on-board target |
| CN4 | SWD connector, 1x6 male | 2.54 | pin 1 (8.33, 73.62) | 270 | pins down to (8.33, 60.92) | | `SWD` label |
| CN3 | ST-LINK VCP RX/TX header, 1x2 (pin 1 RX, pin 2 TX) | 2.54 | pin 1 (12.14, 60.29) | 90 | pin 2 (12.14, 62.83) | | normally empty |
| JP1 | "USB PWR" 100 mA forcing jumper, 1x2 | 2.54 | pin 1 (33.10, 79.97) | 0 | pin 2 (35.64, 79.97) | | **OFF** by default |
| JP4 | 1x2 footprint, **not fitted** (two empty plated holes, ST photo) | 2.54 | pin 1 (3.25, 60.92) | 90 | pin 2 (3.25, 63.46) | - | function unverified |
| CN11 / CN12 | 2-pin male headers for parking spare jumper caps (silk `GND`) | 2.54 | CN11 pin 1 (66.75, 76.16); CN12 pin 1 (3.25, 76.16) | 90 | second pin y = 78.70 | ~8.5 (typ) | black plastic body on **top** with bare pins (ST photo). The spare caps sit on the pins under the board (UM1724 Table 29 note 1) |
| SB1 | USB power management bypass | 0603 bridge | (64.85, 62.83) top | 90 | | | OFF |

Passives (≈100 R and C, all 0603, mostly on top): coordinates are in `pcbdoc/parttable_boardframe.txt` [3]. Draw them as beige (C) and black (R) 1.6 x 0.8 x 0.5 mm blocks if needed.

### 2.5 Header facing and pin 1

- CN5/CN6/CN8/CN9 female sockets face up (+z), within the outline, no overhang.
- CN7/CN10 male pins point up and also stick out below the board (morpho pins "accessible on both sides") [1].
- The Arduino spacing is confirmed. The CN9 top pin is at y = 22.82 and the CN5 pin 1 is at y = 26.88, a 4.06 mm (160 mil) gap, which is the Uno's D7/D8 offset. CN6 and CN8 are separated by 22.82 - 17.74 = 5.08 mm.
- The Arduino header columns are at x = 10.87 (left) and 59.13 (right), 48.26 mm apart (1.9 in, as on an Uno).

## 3. Electrical

### 3.1 Target MCU STM32F401RET6 [6]

| Item | Value |
|---|---|
| Core | Arm Cortex-M4 with FPU (single precision), DSP instructions, MPU, ART accelerator |
| Max clock | 84 MHz |
| Flash / SRAM | 512 KB / 96 KB |
| Supply | VDD 1.7-3.6 V. The board runs it at 3.3 V from U4 through JP6 |
| ADC | 1 x 12-bit SAR, up to 2.4 MSPS, 16 external channels; VREF+ = VDDA (= AVDD, tied to VDD through L1 and SB57 on the board) |
| DAC | **none** |
| Timers | TIM1 (advanced), TIM2/TIM5 (32-bit), TIM3/TIM4, TIM9/10/11 |
| Comms | 3 x USART (USART1/2/6), 3 x I2C, 4 x SPI (2 with I2S), SDIO, USB 2.0 OTG FS (PA11/PA12 on CN10) |
| Device ID | 0x433 (STM32F401xD/E) |
| Clock source on the board | **HSE = 8 MHz from the ST-LINK MCU's MCO** (STM32F103 PA8) into PH0-OSC_IN, through SB16 and SB50 ON, SB54 ON, SB55 OFF, with R35/R37 removed. This is the default from MB1136 C-02 onwards. **X3 is not fitted** (footprint for an 8 MHz HC-49, 16 pF; C33/C34 20 pF also not fitted) [1][4]. Software must use HSE **bypass** mode. The PLL takes the 8 MHz to 84 MHz |
| LSE | **X2 32.768 kHz** ABS25-32.768KHZ-6-T (6 pF) on PC14/PC15, fitted from C-02 onwards. C-03 and later use the ABS25 and updated C26/C31/C32: C31/C32 changed from 10 pF to **4.3 pF** and C26 from 2.2 to 4.7 µF in C-03 (UM1724 Table 35) [1]; the C-04 BOM also lists C31/C32 = 4.3 pF [4] |
| HSI | 16 MHz internal RC (fallback) |

### 3.2 Power tree [1][3][4][5]

| Input | Where | Range | Path / protection |
|---|---|---|---|
| USB VBUS (U5V) | CN1 mini-B | 5 V USB | (a) To the ST-LINK supply through **D2 BAT60J** to U1 **LD3985M33R** (3.3 V, 150 mA), giving +3V3_ST_LINK. (b) To the target through the **T2 STS9P3LLH6 P-MOSFET switch**. The ST-LINK MCU (via R28/T1) turns it on only after USB enumeration grants 300 mA. Then JP5 pin 1 to pin 2 gives +5V. **SB1 ON** bypasses the switch. **JP1 ON** makes the ST-LINK ask for only 100 mA (and switch on anyway, e.g. on a USB charger). **No polyfuse** on the board; no F designator exists in the design. Budget: board + shield ≤ **300 mA** |
| VIN | CN6 pin 8, CN7 pin 24 | **7-12 V** | Goes **directly** to U3 **LD1117S50TR** (5 V LDO, SOT-223); **no reverse-polarity diode**. U3 output goes through **D4 STPS2L30A** Schottky onto the E5V net. JP5 must be on **2-3**. Input current limit by thermal budget: **800 mA at 7 V, 450 mA for 7 < VIN ≤ 9 V, 250 mA for 9 < VIN ≤ 12 V** [1] |
| E5V | CN7 pin 6 | **4.75-5.25 V**, 500 mA max | To JP5 pin 3, so with JP5 on 2-3 E5V becomes +5V. Also feeds the ST-LINK through **D3 BAT60J**, so the ST-LINK works without USB power. No protection on the E5V to +5V path |
| +3.3V | CN6 pin 4, CN7 pins 12 and 16 | **3.0-3.6 V** | Input allowed only if the ST-LINK part is cut off or SB2 (regulator output) and SB12 (NRST) are OFF. ST-LINK is then unpowered [1] |
| +5V rail | CN6 pin 5, CN7 pin 18 | output | Feeds U4 and LD3 (via R32 1 kΩ). Can power a shield within the input-source limit [1] |
| +3V3 rail | from U4 **LD39050PU33R** (500 mA, low-dropout ~200 mV typ at full load per its datasheet, unverified here) through **SB2** | output, **500 mA max** | Goes to CN6 pin 4, CN7 pins 12/16 and IOREF (CN6 pin 2 is +3V3). Then **JP6 (IDD)** to **VDD** (MCU VDD pins 32/64 and VDD-related caps). VDD is also on CN7 pin 5 |
| AVDD | CN5 pin 8 (AREF position, labelled AVDD), CN10 pin 7 | VDD via L1 and **SB57 ON** (default) | MCU VDDA/VREF+ (U5 pin 13). With SB57 OFF, VREF+ can come from a shield via CN5 pin 8 [1] |
| VBAT | CN7 pin 33 | | MCU VBAT (U5 pin 1), tied to VDD by **SB45 ON** (default) [1] |

Power-up order rule [1]: when using VIN/E5V, set JP5 to 2-3, remove JP1, power the external source, check that LD3 lights, and **then** plug USB.

### 3.3 Logic levels and current limits [6]

- I/O is **3.3 V CMOS** (VDD = 3.3 V). V_IH min ≈ 0.7 VDD and V_IL max ≈ 0.3 VDD (standard FT/TTa; not re-checked in this run).
- **5 V tolerance:** in the F401 pin table **every GPIO is `FT`** (5 V tolerant) in the LQFP64. That includes PA0-PA15, PB0-PB15, PC0-PC15, PD2, PH0, PH1 and NRST. The only `B` pin is BOOT0. Exceptions in the datasheet footnote: **FT is lost "when in analog mode or oscillator mode (for PC14, PC15, PH0 and PH1)"**. So a pin used as an ADC input (A0-A5 and so on) has an absolute maximum of **4.0 V** (DS10086 Table 11 note 2: "When a FT_a pin is used by an analog peripheral such as ADC, the maximum VIN is 4 V"), and it only measures 0 to VDDA (3.3 V); anything above VDDA reads 4095. On this board PH0 is the HSE input (MCO) and PC14/PC15 drive the LSE crystal (oscillator mode), so they are not 5 V tolerant there.
- Absolute max: input on FT pins **VDD + 4.0 V** (so ≤ 4.0 V when the MCU is unpowered); other pins 4.0 V. Injected current on FT pins **-5/+0 mA**, total ±25 mA.
- Current per I/O pin: **±25 mA absolute max** (sink/source). Total sunk by all I/Os **120 mA**, total sourced **120 mA**. ΣIVDD 160 mA. Recommended operating current: ±8 mA for the standard V_OL/V_OH spec, ±20 mA with relaxed V_OL/V_OH (DS10086 "Output driving current" paragraph); PC13-PC15 only ±3 mA.
- **PC13, PC14, PC15** are powered through the backup power switch. They can sink only **3 mA**, at ≤ 2 MHz and 30 pF, and **must not source current (e.g. drive an LED)**. B1 on PC13 is an input, which is fine.
- NRST has an internal pull-up (~40 kΩ). B2 shorts it to GND; C14 (100 nF) is on NRST [3].

### 3.4 Brown-out [6]

| Threshold | Falling | Rising |
|---|---|---|
| POR/PDR | 1.68 V typ (1.60-1.76) | 1.72 V typ (1.64-1.80) |
| BOR level 1 | 2.19 V typ | 2.29 V |
| BOR level 2 | 2.50 V | 2.59 V |
| BOR level 3 | 2.83 V | 2.92 V |
| PVD | programmable 2.04 V (PLS=000, falling) to 3.03 V (PLS=111, falling) | |

Factory option byte BOR_LEV = 11 (BOR **off**, reset only at POR/PDR ~1.7 V) per RM0368 (not re-read in this run, see §10).

### 3.5 ADC / PWM

- ADC: 12-bit, 16 external channels. Arduino pins: A0 = PA0 (ADC1_IN0), A1 = PA1 (IN1), A2 = PA4 (IN4), A3 = PB0 (IN8), A4 = PC1 (IN11), A5 = PC0 (IN10) [1]. Reference = VDDA ≈ 3.3 V. No separate AREF input: the Arduino AREF position (CN5 pin 8) is AVDD.
- PWM on Arduino headers (silkscreen `PWM/`) [1]: D3 = PB3 TIM2_CH2; D5 = PB4 TIM3_CH1; D6 = PB10 TIM2_CH3; D9 = PC7 TIM3_CH2; D10 = PB6 TIM4_CH1; D11 = PA7 TIM1_CH1N. Note that D13 = PA5 (LD2) can also do PWM via TIM2_CH1 (an alternate function of PA5 per DS10086). STM32duino `analogWrite` default frequency is 1 kHz (`PWM_FREQUENCY` 1000), resolution 8-bit (`PWM_RESOLUTION 8`), ADC default 10-bit (`ADC_RESOLUTION 10`), all in cores/arduino/pins_arduino.h on the main branch; changeable with `analogWriteFrequency()`/`analogWriteResolution()`/`analogReadResolution()`.

### 3.6 USB-serial / debug: ST-LINK/V2-1 [1][4]

- U2 STM32F103CBT6 (Cortex-M3, 72 MHz, 128 KB flash), clocked by X1 8 MHz crystal. Its supply is +3V3_ST_LINK from U1.
- USB functions: debug (SWD), **virtual COM port** and **mass storage** (drive `NODE_F401RE`, holding `MBED.HTM` and `DETAILS.TXT`). USB ID 0483:374B (ST-LINK/V2-1).
- VCP: target **USART2, PA2 (TX) / PA3 (RX)**, wired to the ST-LINK by default (SB13, SB14 ON; SB62, SB63 OFF). So **D0/D1 on CN9 are disconnected by default** [1].
- SWD: PA13 (SWDIO), PA14 (SWCLK), NRST (via SB12), SWO on PB3 (via SB15). CN2 jumpers ON = program the on-board target. CN2 OFF = the CN4 SWD header drives an external target. CN4 pinout: 1 VDD_TARGET (sense, via D1), 2 SWCLK, 3 GND, 4 SWDIO, 5 NRST, 6 SWO [1].

### 3.7 LEDs [1][3][4]

| LED | Colour | Driven by | Active level | Notes |
|---|---|---|---|---|
| LD1 COM | red/green bicolour (orange = both) | ST-LINK MCU (net LED_STLINK via R20/R21 100 Ω, R19 0 Ω to +3V3_ST_LINK) | - | Slow red blink: powered, before USB init. Fast red blink: after the first PC communication (enumeration). Steady red: init complete. Green: target comms init OK. Red/green blink: communication with target in progress. Green: finished OK. Orange: communication failure |
| LD2 USER | green | **PA5** → (SB42) D13 net (CN5 pin 6 / CN10 pin 11) → SB21 → R31 **510 Ω** → LD2 → GND | **active HIGH** | ≈ 2.5 mA at 3.3 V (estimated: (3.3 - ~2.0 V)/510 Ω) |
| LD3 PWR | red | **+5V** → R32 **1 kΩ** → LD3 → GND | on whenever +5V is present | ≈ 3 mA. Off if USB enumeration did not grant 300 mA, or JP5 is wrong |

### 3.8 Buttons [1][3]

| Button | Function | Net | Active level | Circuit |
|---|---|---|---|---|
| B1 USER (blue) | user input | **PC13** via SB17 | **active LOW** (pressed = 0) | R30 **4.7 kΩ pull-up to VDD**. C15 100 nF in series with R29 100 Ω from the button node to GND (RC debounce, traced in the PcbDoc netlist) |
| B2 RESET (black) | resets the target | **NRST** | active low | Also on CN6 pin 3 and CN7 pin 14 |

The caps can be pulled off so a shield doesn't hold reset down [1].

### 3.9 Sensors

None on the board.

## 4. Pinout

### 4.1 Arduino headers [1][3]

Physical order. Left column x = 10.87, right column x = 59.13.

**CN6 POWER (left, top to bottom, pin 1 at y = 40.60)**

| Pin | Label printed | Net/MCU | Notes |
|---|---|---|---|
| 1 | (none) | NC | |
| 2 | IOREF | +3V3 | 3.3 V reference |
| 3 | NRST | NRST | reset, active low |
| 4 | 3V3 | +3V3 | output (U4 500 mA) or 3.0-3.6 V input with conditions |
| 5 | 5V | +5V | output |
| 6 | GND | GND | |
| 7 | GND | GND | |
| 8 | VIN | VIN | 7-12 V input to U3 |

**CN8 ANALOG (left, top to bottom, pin 1 at y = 17.74)**

| Pin | Label | MCU | Function |
|---|---|---|---|
| 1 | A0 | PA0 | ADC1_IN0 |
| 2 | A1 | PA1 | ADC1_IN1 |
| 3 | A2 | PA4 | ADC1_IN4 |
| 4 | A3 | PB0 | ADC1_IN8 |
| 5 | A4 | **PC1** (default) or PB9 | ADC1_IN11 (default: SB51 and SB56 ON). For PB9 = I2C1_SDA, set SB46 and SB52 ON and SB51 and SB56 OFF (Table 10 [1]) |
| 6 | A5 | **PC0** (default) or PB8 | ADC1_IN10; PB8 = I2C1_SCL with the same SB change |

**CN5 DIGITAL (right, pin 1 at bottom y = 26.88, going up)**

| Pin | Label | MCU | Function |
|---|---|---|---|
| 1 | D8 | PA9 | (USART1_TX) |
| 2 | PWM/D9 | PC7 | TIM3_CH2 |
| 3 | PWM/CS/D10 | PB6 | TIM4_CH1, SPI CS (software) |
| 4 | PWM/MOSI/D11 | PA7 | TIM1_CH1N, SPI1_MOSI |
| 5 | MISO/D12 | PA6 | SPI1_MISO |
| 6 | SCK/D13 | **PA5** | SPI1_SCK, **LD2** |
| 7 | GND | GND | |
| 8 | AVDD | AVDD | (Uno AREF position) |
| 9 | SDA/D14 | PB9 | I2C1_SDA |
| 10 | SCL/D15 | PB8 | I2C1_SCL |

**CN9 DIGITAL (right, pin 1 at bottom y = 5.04, going up)**

| Pin | Label | MCU | Function |
|---|---|---|---|
| 1 | RX/D0 | PA3 | USART2_RX (**disconnected by default**, goes to the ST-LINK VCP) |
| 2 | TX/D1 | PA2 | USART2_TX (same) |
| 3 | D2 | PA10 | (USART1_RX) |
| 4 | PWM/D3 | PB3 | TIM2_CH2; also SWO |
| 5 | D4 | PB5 | |
| 6 | PWM/D5 | PB4 | TIM3_CH1 |
| 7 | PWM/D6 | PB10 | TIM2_CH3 |
| 8 | D7 | PA8 | (MCO1) |

### 4.2 ST morpho CN7 (left) and CN10 (right) [1]

Pin 1/2 at the top (y = 50.76), pins 37/38 at the bottom (y = 5.04), pitch 2.54. **CN7**: odd pins x = 3.25 (outer column, next to the left edge), even pins x = 5.79 (inner). **CN10**: odd pins x = 64.21 (inner column), even pins x = 66.75 (outer, next to the right edge). All I/O are FT except as noted in §3.3.

| CN7 odd | | CN7 even | | CN10 odd | | CN10 even | |
|---|---|---|---|---|---|---|---|
| 1 | PC10 | 2 | PC11 | 1 | PC9 | 2 | PC8 |
| 3 | PC12 | 4 | PD2 | 3 | PB8 | 4 | PC6 |
| 5 | VDD | 6 | E5V | 5 | PB9 | 6 | PC5 |
| 7 | BOOT0 | 8 | GND | 7 | AVDD | 8 | U5V |
| 9 | - | 10 | - | 9 | GND | 10 | - |
| 11 | - | 12 | IOREF | 11 | PA5 | 12 | PA12 |
| 13 | PA13 (SWDIO) | 14 | RESET | 13 | PA6 | 14 | PA11 |
| 15 | PA14 (SWCLK) | 16 | +3.3V | 15 | PA7 | 16 | PB12 |
| 17 | PA15 | 18 | +5V | 17 | PB6 | 18 | - |
| 19 | GND | 20 | GND | 19 | PC7 | 20 | GND |
| 21 | PB7 | 22 | GND | 21 | PA9 | 22 | PB2 (BOOT1) |
| 23 | PC13 (B1) | 24 | VIN | 23 | PA8 | 24 | PB1 |
| 25 | PC14 (LSE) | 26 | - | 25 | PB10 | 26 | PB15 |
| 27 | PC15 (LSE) | 28 | PA0 | 27 | PB4 | 28 | PB14 |
| 29 | PH0 (HSE/MCO in) | 30 | PA1 | 29 | PB5 | 30 | PB13 |
| 31 | PH1 | 32 | PA4 | 31 | PB3 | 32 | AGND |
| 33 | VBAT | 34 | PB0 | 33 | PA10 | 34 | PC4 |
| 35 | PC2 | 36 | PC1 or PB9 | 35 | PA2 | 36 | - |
| 37 | PC3 | 38 | PC0 or PB8 | 37 | PA3 | 38 | - |

Notes [1][6]:
- BOOT0 is pulled LOW by default. A jumper on CN7 pins 5-7 (VDD to BOOT0) boots the system bootloader.
- U5V rises before +5V.
- PA13/PA14 are SWD and should not be used as I/O while the ST-LINK is attached.
- PC14/PC15 are connected to X2 and not to CN7 unless SB48/SB49 are ON and R34/R36 removed. PH0/PH1 likewise reach CN7 only with SB54/SB55 ON.
- PA2/PA3 are listed on CN10 35/37, but by default (SB62/SB63 OFF) they are **disconnected from both CN9 D0/D1 and CN10 35/37**; they go only to the ST-LINK VCP through SB13/SB14 (UM1724 Table 10).
- PA11/PA12 are the USB OTG FS D-/D+ (no USB connector for the target on the board).
- PB2 = BOOT1.
- PC13 is limited to 3 mA (§3.3).

## 5. Programming

| Toolchain | Version (Oct 2026) | Notes |
|---|---|---|
| Arduino IDE + **STM32duino** (Arduino_Core_STM32) | **3.0.0** (released 23 July 2026; 2.12.0 was Dec 2025) [8] | Boards Manager URL `https://github.com/stm32duino/BoardManagerFiles/raw/main/package_stmicroelectronics_index.json`. Board "Nucleo-64", board part number "Nucleo F401RE". FQBN `STMicroelectronics:stm32:Nucleo_64:pnum=NUCLEO_F401RE` |
| STM32CubeProgrammer | **v2.23** (June/July 2026) [9] | needed for the STM32duino "STM32CubeProgrammer (SWD)" upload method |
| STM32CubeIDE / STM32CubeF4 HAL | current release (exact versions unverified) | |
| PlatformIO | board `nucleo_f401re`, framework `arduino`/`stm32cube`/`zephyr` | upload via ST-LINK (OpenOCD) or mbed drive |
| MicroPython | board `NUCLEO_F401RE` (stm32 port) | flash with ST-LINK; REPL on the VCP (USART2) at 115200 |
| Zephyr | board `nucleo_f401re` [10] | `west flash` uses OpenOCD/STM32CubeProgrammer |
| Mbed OS | **end of life** (Arm announced in 2024 that Mbed would reach end of life in July 2026; date not re-checked) | do not teach it. The `NODE_F401RE` drag-and-drop drive still works, because it is ST-LINK firmware |

**STM32duino names** (variant_NUCLEO_F401RE.h, main branch checked Oct 2026): `LED_BUILTIN` = `LED_GREEN` = `PA5` (= D13); `USER_BTN` = `PC13`; `Serial` = USART2 (`SERIAL_UART_INSTANCE 2`, `PIN_SERIAL_RX` PA3, `PIN_SERIAL_TX` PA2), routed to the ST-LINK VCP; `TIMER_TONE` TIM10, `TIMER_SERVO` TIM11; `Serial1` not defined by default (unverified for 3.0.0). Default clock config (variant_NUCLEO_F401RE.cpp `SystemClock_Config`): **HSI 16 MHz → PLL (M = 8, N = 168, P = 4, Q = 7) → 84 MHz SYSCLK**, APB1 = HCLK/2, APB2 = HCLK/1, flash latency 2. STM32duino does **not** use the ST-LINK MCO/HSE by default, so a sketch keeps running at 84 MHz after the ST-LINK part is snapped off.

**Upload paths:**
1. *Mass Storage*: copy `sketch.bin` to the `NODE_F401RE` drive. LD1 blinks red/green while it flashes, the drive disconnects and reconnects, and the program starts. Errors appear in a `FAIL.TXT` file on the drive.
2. *STM32CubeProgrammer (SWD)*: the IDE runs Arduino_Tools `stm32CubeProg.sh -i swd -b <sketch>.bin ...`, which calls `STM32_Programmer_CLI --connect port=SWD mode=UR --quietMode --download <sketch>.bin 0x8000000 --start 0x8000000` (defaults from platform.txt: `upload.mode=UR`, `upload.address=0x8000000`, `upload.start=0x8000000`, `upload.freq=0` so no `freq=` is added). Representative console output (illustrative; because STM32duino passes `--quietMode` the progress bar is suppressed, and it ends with a `--start` jump rather than a reset; exact text unverified):

```
      -------------------------------------------------------------------
                        STM32CubeProgrammer v2.23.0
      -------------------------------------------------------------------

ST-LINK SN  : 066DFF...
ST-LINK FW  : V2J45M31
Board       : NUCLEO-F401RE
Voltage     : 3.26V
SWD freq    : 4000 KHz
Connect mode: Under Reset
Reset mode  : Hardware reset
Device ID   : 0x433
Revision ID : Rev A
Device name : STM32F401xD/E
Flash size  : 512 KBytes
Device type : MCU
Device CPU  : Cortex-M4

Memory Programming ...
Opening and parsing file: Blink.ino.bin
  File          : Blink.ino.bin
  Size          : 11.20 KB
  Address       : 0x08000000

Erasing memory corresponding to segment 0:
Erasing internal memory sector 0
Download in Progress:
██████████████████████████████████████████████████ 100%

File download complete
Time elapsed during download operation: 00:00:00.512

Verifying ...
Download verified successfully

MCU Reset
Software reset is performed
```
Common failure: `Error: No STM32 target found!` (CN2 jumpers off, JP6 off, or the target held in reset). `Error: No debug probe detected.` (USB cable or driver).

3. OpenOCD: `openocd -f board/st_nucleo_f4.cfg -c "program build.elf verify reset exit"`.

**Auto-reset:** not like the Uno's DTR. The ST-LINK drives NRST over SWD (connect under reset) and resets the target after programming. Opening the VCP does **not** reset the board.

**Boot:** BOOT0 low by default, so it boots from flash at 0x08000000. BOOT0 high (jumper CN7 5-7) boots the ROM system bootloader. It listens on USART1 (PA9/PA10 = D8/D2), I2C, SPI and USB DFU (PA11/PA12) per AN2606 as recalled (unverified). Do **not** teach USART2 on PA2/PA3 as a bootloader port: on the sibling F411 ST documents the bootloader's USART2 on PD5/PD6, which this LQFP64 does not have, so the VCP cannot be assumed to reach the bootloader (unverified for the F401). The target's USB is not wired to a connector on this board anyway.

**Factory program:** the demo blinks LD2. Pressing B1 changes the blink frequency (UM1724 §6.1, "Observe the blinking frequency of LED LD2 at different frequencies, by clicking on the button B1") [1]. Getting-started jumper state: JP1 off, JP5 on U5V, JP6 on, CN2 on [1].

## 6. Failure modes

| Fault | What physically happens | What the user sees |
|---|---|---|
| Reverse polarity on **VIN** | No series diode (netlist: VIN goes only to C16, CN6.8, CN7.24 and U3 pin 3). The LD1117's internal structure and C16 (if polarised) take reverse current. Current is limited only by the supply. U3 can overheat or fail short. D4 blocks the reverse voltage from reaching E5V (cathode at E5V), so +5V/MCU are mostly spared (inferred from topology) | supply hits its current limit, U3 gets hot, maybe a burnt smell; LD3 off |
| Reverse polarity on **E5V** (JP5 2-3) | -5 V lands directly on +5V: U4 input reversed, LD3 reverse-biased, U5V switch body diode... D3 blocks it from the ST-LINK supply. U4 and the MCU are likely damaged (inferred) | LD3 off, high current, U4/U5 hot |
| Reverse on **USB** | not possible with a mini-B cable | |
| VIN over-voltage (>12 V) | LD1117 dissipates (VIN-5)·I. Above 15 V (LD1117 abs max) it can fail. Its thermal shutdown cuts out at high load | U3 very hot, LD3 flickers or turns off (thermal cycling) |
| E5V over-voltage (>5.25 V) | goes straight onto +5V and into U4 (LD39050 abs max VIN 7 V, unverified) and the shield 5 V pins | above ~7 V, U4 dies; 3.3 V rail may rise and kill the MCU |
| Brown-out | MCU resets at PDR ~1.68 V (BOR off by default). U4 dropout means the 3.3 V rail sags when +5V < ~3.5 V. Weak USB ports: T2 switch stays off if 300 mA not granted | LD3 off; LD1 COM still blinks; target dead. Or random resets under load |
| Over-current from USB | no fuse. The host port's own limit trips (typ 500 mA-1 A+). The 300 mA budget is a USB-negotiation rule, not a hard limiter | PC "USB device over current" warning, port shuts down, all LEDs off |
| Over-current on 3.3 V | LD39050 has internal current limit (≥ 500 mA) and thermal shutdown | 3V3 sags, MCU resets, U4 warm |
| Over-current on a pin | > 25 mA abs max; output voltage collapses; long-term damage | LED dim, pin stuck |
| Cold solder joint | Typical on hand-soldered morpho/Arduino headers or the USB mini-B pads (mini-B shell tabs crack on boards that are plugged in often) | intermittent USB enumeration (LD1 keeps slow-blinking red), flaky shield signals |
| 5 V into a 3.3 V pin | FT pins tolerate up to VDD+4 V **while powered and in digital mode**: no damage. In **analog mode** (A0-A5 configured for `analogRead`), or with the MCU unpowered (abs max 4.0 V), current flows through the protection diode into VDD and the pin can be damaged | usually nothing visible; wrong ADC readings; in the worst case a dead pin |
| 5 V shorted to GND | +5V is shorted: from USB, T2 conducts the short until the host port trips; from VIN, U3 current-limits/thermal shuts down; from E5V, the external supply limit | LD3 off, LD1 may reset; PC reports USB over-current; T2/U3 warm |
| 3.3 V shorted to GND | U4 current limit plus thermal shutdown | LD3 still on (it is on +5V), target dead, U4 hot |
| Beginner trap: D0/D1 do nothing | PA2/PA3 go to the ST-LINK VCP, not to the Arduino header (SB62/SB63 OFF) | serial shield on D0/D1 doesn't work; `Serial` prints appear on the PC instead |
| Beginner trap: USB charger | no enumeration, so T2 stays off | LD3 off. Fix: fit JP1 [1] |
| Beginner trap: LED on PC13 | PC13 can't source current | LED doesn't light |
| Beginner trap: JP6 removed | MCU unpowered | LD3 on but no blink; `No STM32 target found` |
| Beginner trap: shield presses B2 | permanent reset [1] | nothing runs; remove the button caps |
| Beginner trap: 5 V shield logic | inputs are fine on FT pins, but outputs are only 3.3 V. 5 V-only parts may not see HIGH (5 V CMOS VIH = 3.5 V) | |
| Beginner trap: snap-off | after cutting off the ST-LINK, power via E5V/VIN or 3.3 V (SB2/SB12 are then irrelevant), and there is no 8 MHz HSE (MCO gone, X3 not fitted). STM32duino sketches are unaffected (they run from HSI). Code configured for HSE bypass (e.g. MicroPython's NUCLEO_F401RE build, or a Cube project set to HSE) fails to start the HSE and hangs or falls back, depending on its error handling | board seems dead after the cut |

## 7. Lesson facts (STM32duino unless noted)

**Lesson 1 Blink / digital out:** LD2 on PA5 (D13), active high.
```cpp
void setup() { pinMode(LED_BUILTIN, OUTPUT); }
void loop() { digitalWrite(LED_BUILTIN, HIGH); delay(500); digitalWrite(LED_BUILTIN, LOW); delay(500); }
```

**Lesson 2 Button + sensor:** B1 on PC13, active low, external 4.7 kΩ pull-up already fitted (use `INPUT`; `INPUT_PULLUP` is harmless). Analog sensor (potentiometer or LDR divider) on A0 = PA0 powered from **3V3** (not 5V).
```cpp
void setup() { pinMode(USER_BTN, INPUT); pinMode(LED_BUILTIN, OUTPUT); Serial.begin(115200); }
void loop() {
  bool pressed = digitalRead(USER_BTN) == LOW;
  digitalWrite(LED_BUILTIN, pressed);
  int raw = analogRead(A0);            // 0..1023 by default (10-bit compat)
  Serial.println(raw);
  delay(100);
}
```
`analogReadResolution(12)` gives 0-4095. `attachInterrupt(digitalPinToInterrupt(USER_BTN), isr, FALLING)` works.

**Lesson 3 PWM / analog out:** no DAC. PWM on D3/D5/D6/D9/D10/D11, or on D13 to dim LD2 (PA5 TIM2_CH1).
```cpp
void loop() { for (int d = 0; d < 256; d++) { analogWrite(LED_BUILTIN, d); delay(4); } }
```
`analogWriteFrequency(20000);` and `analogWriteResolution(12);` are available. For direct timer control there is `HardwareTimer` (STM32duino API).

**Lesson 4 Protocol:** UART over the ST-LINK VCP (`Serial`, USART2, any baud; 115200 typical). Then I2C on D14 = PB9 (SDA) and D15 = PB8 (SCL) with `Wire` (I2C1). Shield pull-ups are required: there are no on-board I2C pull-ups. SPI on D11/D12/D13 = PA7/PA6/PA5 (`SPI`, SPI1) with CS on D10 = PB6. Note that SPI SCK shares PA5 with LD2, so the LED flickers during SPI. The board has **no Wi-Fi or BLE**. A sensor lesson could use, for example, a BME280 breakout at 3.3 V on I2C (Adafruit BME280 Library; the version was not checked).

**Low-power and RTC:** the LSE X2 gives the STM32RTC library a real 32.768 kHz clock (`rtc.setClockSource(STM32RTC::LSE_CLOCK)`), and STM32LowPower works too. Library versions not checked.

**MicroPython** (stm32 port, NUCLEO_F401RE):
```python
from machine import Pin
import time
led = Pin('PA5', Pin.OUT)       # LD2 (board name 'LED_GREEN' or 'D13' also works)
btn = Pin('PC13', Pin.IN)       # B1 (board name 'SW'), active low
while True:
    led.value(btn.value() == 0)
    time.sleep_ms(20)
```
`pyb.LED(1)` maps to LD2 (`MICROPY_HW_LED1 = pin_A5`, the CPU pin PA5). **Do not write `Pin('A5')`**: the board pin table (`pins.csv`) defines the Arduino name `A5` = **PC0**, and board names are looked up before CPU names, so `Pin('A5')` is the A5 header pin, not the LED. REPL is on UART2 (the VCP) at 115200 (`MICROPY_HW_UART_REPL_BAUD`). MicroPython's own clock config for this board uses HSE (ST-LINK MCO) 8 MHz, PLLM 8, PLLN 336, PLLP 4 → 84 MHz.

**STM32Cube HAL names:** `LD2_Pin`/`LD2_GPIO_Port` = GPIO_PIN_5/GPIOA; `B1_Pin` = GPIO_PIN_13/GPIOC; `USART_TX_Pin` PA2 and `USART_RX_Pin` PA3 (CubeMX "Nucleo-F401RE" board selector defaults). `huart2` at 115200 8N1. `HAL_GPIO_TogglePin(LD2_GPIO_Port, LD2_Pin);`

## 8. Internals (for the see-through view)

- **STM32F401RET6 (U5):** LQFP64 with a copper leadframe. A silicon die of a few mm square (exact die size unverified) sits on a die pad. Gold or copper bond wires run to the 64 leads, all inside black epoxy. The die holds the Cortex-M4F core, flash (512 KB) and SRAM (96 KB), the ADC, the regulator (1.2 V core LDO with external VCAP_1 capacitor on pin 31, C-value per DS: 4.7 µF typ, unverified for the board) and the power-on reset.
- **STM32F103CBT6 (U2):** LQFP48, the same construction, with a Cortex-M3. It runs the closed ST-LINK/V2-1 firmware (USB device: CDC-ACM VCP + MSC + debug).
- **X1 8 MHz crystal (HC-49/S):** an AT-cut quartz blank (thin disc) with silver electrodes on both faces, held on spring clips inside a cold-welded metal can, with 2 leads.
- **X2 ABS25 32.768 kHz:** a tuning-fork quartz resonator in a ceramic/metal SMD package with 4 pads (2 used).
- **LD1117 (U3), LD39050 (U4), LD3985 (U1):** linear LDOs. Inside each: a pass transistor (PNP/NPN Darlington for the LD1117, PMOS for the LD39050/LD3985), a bandgap reference, an error amplifier, current limit and thermal shutdown.
- **T2 STS9P3LLH6:** a P-channel trench MOSFET die in SO-8.
- **BAT60J / STPS2L30A:** Schottky metal-silicon junction diodes.
- **USB mini-B:** 5 gold-flashed contacts on a plastic tongue inside a stamped steel shell.
- There is no RF can and no external flash chip on this board.

## 9. Assembly and power-up

- **Manufacture:** the board is 2-layer FR-4 with white mask and **blue** silk (see §2.2). Top-side SMD parts (MCUs, LDOs, passives, LEDs, USB, buttons, crystals) are placed by pick-and-place and reflowed. The bottom side has only solder-bridge pads (0 Ω bridges are solder blobs or 0603 0 Ω, mostly OFF) and a couple of THT items. The through-hole parts (X1 crystal, CN7/CN10 morpho pin headers, CN5/6/8/9 female sockets, CN2/CN4/JP1/JP5/JP6/CN3/CN11/CN12 pin headers) are wave or selective soldered afterwards. Jumper caps and button caps go on last, then the sticker. The ST-LINK firmware is programmed into U2 at test, and the demo is programmed into U5.
- **Power-up (USB):** USB 5 V reaches the ST-LINK through D2 and U1, so LD1 COM **blinks red slowly**. The PC enumerates it (fast red blink, then steady red). The ST-LINK requests 300 mA, and when that is granted T2 turns on, +5V rises, **LD3 PWR turns red** and U4 makes 3.3 V. The target starts the demo and **LD2 blinks green**. The PC sees three things: the VCP (`STMicroelectronics STLink Virtual COM Port`), the `NODE_F401RE` drive, and the ST-LINK debug interface [1].
- **Power-up (VIN/E5V with JP5 2-3):** LD3 lights immediately. LD1 lights as soon as the ST-LINK gets E5V via D3. USB can be plugged in afterwards.

## 10. Uncertainties

1. **Board thickness** 1.6 mm is assumed: the design/fab files give no thickness and the stack-up in the PcbDoc has default mid-layer entries. Standard for ST boards.
2. **Component heights** are typical datasheet values, not from the design files. That covers the header heights (Arduino female 8.5 mm, morpho pin length) and the button height with cap.
3. **CN11/CN12:** the ST photo shows the header bodies on top. That the caps are parked underneath comes from the UM note and was not seen in a bottom photo. **Silkscreen colour** (blue) comes from ST marketing photos and renders, not from a photo of a retail board I took.
4. **U5 marking:** checked on one ST product photo only. Lot and date lines differ from unit to unit.
5. **Mouse bites** at the three snap-off bridges are not in the drill file. Either there are none (plain bridges scored or broken by hand) or they are on another layer. UM §7.3 only says the ST-LINK part "can be cut".
6. **SB numbering on PA5:** the netlist shows SB42 between U5 PA5 and the D13 net, and SB44 also on PA5. The roles of the two were not traced (one is likely the alternate PB13 route used by other Nucleo targets).
7. **USB VID:PID 0483:374B** (ST-LINK/V2-1; OpenOCD `STLINK_V2_1_PID`) and the `NODE_F401RE` drive name (STM32duino boards.txt `node="NODE_F401RE,NUCLEO"`) were confirmed in the fact-check. The ST-LINK FW string `V2J45M31` and the CubeProgrammer console layout are still from memory. Treat the console text as representative.
8. **STM32duino specifics** (`Serial` mapping, PWM/ADC defaults, HSI clock config, FQBN, node name) were re-checked against the main branch of Arduino_Core_STM32 in the fact-check (3.0.0 is the latest release, 23 July 2026). `Serial1` availability was not checked.
9. **System bootloader interfaces** for the F401 (AN2606) were not checked, so USB DFU availability is unconfirmed.
10. **BOR factory default** (off) is from RM0368 knowledge, not re-read.
11. **U2 marking** line split not checked against a close-up photo.
12. **Silkscreen anchors** in §2.3 are Altium text anchor points, not visual centres. Justification and rotation are applied as Altium stores them. A drawing should place each string starting at the anchor.
13. The behaviour under reverse polarity and over-voltage (§6) is inferred from the netlist topology and component ratings, not from a test.

## Verification

Adversarial fact-check, 24 Oct 2026. Sources opened by the checker: UM1724 Rev 17 (ST PDF, metadata author STMICROELECTRONICS, Sept 2025; Figure 5 mechanical drawing rendered and measured), DS10086 Rev 5 (Feb 2026), the ST MB1136 BOM (`MB1136-F401RE-C04_BOM.xlsx` from `mb1136_bom.zip`) and drill/pick-and-place files from `mb1136_manufacturing.zip` (ST product page CAD resources), and the upstream source trees listed below. Short names: UM = https://www.st.com/resource/en/user_manual/um1724-stm32-nucleo64-boards-mb1136-stmicroelectronics.pdf , DS = https://www.st.com/resource/en/datasheet/stm32f401re.pdf , CAD = https://www.st.com/en/evaluation-tools/nucleo-f401re.html#cad-resources .

| # | Claim | Status | Source | Old value -> new value (corrections) |
|---|---|---|---|---|
| 1 | Board outline 70.00 x 82.50 mm | confirmed | UM Fig. 5 | |
| 2 | Arduino columns x = 10.87 / 59.13 (48.26 mm apart); CN7 outer to CN10 outer 63.50 mm; D7/D8 gap 4.06 mm; CN6/CN8 gap 5.08 mm; bottom pin row 3.04 mm above the main bottom edge (y = 5.04) | confirmed | UM Fig. 5 | |
| 3 | Bottom tab flat 33.00 mm (x 13.5-46.5) | confirmed | UM Fig. 5 | |
| 4 | Mounting holes: bottom hole 33.02 mm right of the CN8 column (x = 43.89); top-left hole 13.97 mm above CN6 pin 1; top-right hole 3.56 mm above CN5 pin 10; Ø3.2 mm (drill tool 0.12598 in) | confirmed | UM Fig. 5; CAD drill file | |
| 5 | CN12 pins at 71.12 mm above the bottom pin row and 3.80 mm below the top edge (y = 76.16 / 78.70) | confirmed | UM Fig. 5 | |
| 6 | U5 at (850, 750) mil design frame, rot 0 | confirmed | CAD Pick_Place_for_MB1136.txt | |
| 7 | Arduino header mapping (CN5/6/8/9 incl. A4/A5 = PC1/PC0 or PB9/PB8, D11 TIM1_CH1N, D0/D1 = PA3/PA2) | confirmed | UM Table 16 | |
| 8 | ST morpho CN7/CN10 pinout | confirmed | UM Table 29 | |
| 9 | PA2/PA3 available on CN10 35/37 by default | corrected | UM Table 10 (SB62/SB63) | "on CN10 35/37 but used by the VCP" -> disconnected from CN9 **and** CN10 by default (SB62/SB63 OFF) |
| 10 | LD2 green on PA5 (D13), active HIGH, via SB21, R31 510 Ω | confirmed | UM §7.6, Table 10; CAD BOM | |
| 11 | B1 on PC13 via SB17, active low; R30 4.7 kΩ, R29 100 Ω, C15 100 nF | confirmed (values and SB17); RC topology from the schematic not re-traced | UM §7.7, Table 10; CAD BOM | |
| 12 | LD3 red on +5V via R32 1 kΩ; LD1 COM state sequence | confirmed | UM §7.6; CAD BOM | |
| 13 | VIN 7-12 V on CN6-8/CN7-24; 800 mA at 7 V, 450 mA 7-9 V, 250 mA 9-12 V | confirmed | UM Table 7 | |
| 14 | E5V 4.75-5.25 V, 500 mA, CN7 pin 6; JP5 1-2 = U5V, 2-3 = VIN/E5V | confirmed | UM Table 7, §7.5 | |
| 15 | +3.3V input 3.0-3.6 V only with ST-LINK cut or SB2 + SB12 OFF; U4 500 mA max output | confirmed | UM Table 9, §7.5.4 | |
| 16 | USB budget 300 mA (JP1 OFF) / 100 mA (JP1 ON); USB charger needs JP1 ON | confirmed | UM Table 6, §7.5.1 note | |
| 17 | Parts: U1 LD3985M33R, U2 STM32F103CBT6, U3 LD1117S50TR, U4 LD39050PU33R, U5 STM32F401RET6U, D1-D3 BAT60JFILM, D4 STPS2L30A, T1 MMBT9013, X1 9SL8000012AFXHF0 12 pF, X2 ABS25-32.768KHZ-6-T, X3 not fitted, CN1 MUSB5QS-BM1H6-NLB-E, LD1 LE-RGW35280, LD2/LD3 Everlight 0603, B1/B2 TD-0341X | confirmed | CAD BOM C-04 | |
| 18 | T2 = STS9P3LLH6 | corrected (scope) | UM Table 35; CAD BOM | STS9P3LLH6 (all boards) -> STS9P3LLH6 from F401RE-C04; STS7PF30L on C-03 and earlier |
| 19 | HSE = ST-LINK MCO 8 MHz: SB55 OFF, SB54 ON, SB16/SB50 ON, R35/R37 removed; default from C-02 | confirmed | UM §7.9.1 | |
| 20 | LSE X2 ABS25, C31/C32 4.3 pF | corrected (revision) | UM §7.9.2, Table 35 | "In C-04, C31/C32 are 4.3 pF" -> changed from 10 pF to 4.3 pF (and C26 2.2 -> 4.7 µF) in C-03 |
| 21 | VCP = USART2 PA2/PA3, SB13/SB14 ON, SB62/SB63 OFF | confirmed | UM §7.10 | |
| 22 | CN4 SWD pinout 1 VDD_TARGET, 2 SWCLK, 3 GND, 4 SWDIO, 5 NRST, 6 SWO | confirmed (UM calls pin 6 "Reserved"; SB15 links it to PB3) | UM §7.4 (CN4 table), Table 10 | |
| 23 | Abs max: FT input VDD+4.0 V, other pins 4.0 V; I/O ±25 mA; ΣI/O 120 mA; ΣIVDD 160 mA; injected FT -5/+0 mA, total ±25 mA | confirmed | DS Tables 11/12 | |
| 24 | Analog-mode input limit "≤ VDDA + 0.3 V" | corrected | DS Table 11 note 2 | ≤ VDDA + 0.3 V -> abs max 4.0 V on an FT_a pin used by the ADC; measures 0-VDDA |
| 25 | FT except in analog/oscillator mode (PC14, PC15, PH0, PH1); no TC/TTa pins on LQFP64; BOOT0 is type B | confirmed | DS pin-definition table note 4 | |
| 26 | PC13-PC15: sink ≤ 3 mA, ≤ 2 MHz, 30 pF, must not source; normal I/O ±8 mA / ±20 mA relaxed | confirmed | DS pin-definition table note 2; "Output driving current" | |
| 27 | POR/PDR 1.68/1.72 V; BOR1-3 2.19/2.29, 2.50/2.59, 2.83/2.92 V; PVD 2.04-3.03 V falling | confirmed | DS §6.3.2-6.3.3 (PVD, POR/PDR, BOR tables) | |
| 28 | Device ID 0x433 (F401xD/E) | confirmed | https://github.com/openocd-org/openocd/blob/master/src/flash/nor/stm32f2x.c | |
| 29 | STM32duino `LED_BUILTIN` = PA5, `USER_BTN` = PC13, `Serial` = USART2 PA2/PA3 | confirmed | https://github.com/stm32duino/Arduino_Core_STM32/blob/main/variants/STM32F4xx/F401R(B-C-D-E)T/variant_NUCLEO_F401RE.h | |
| 30 | STM32duino default clock "HSE bypass 8 MHz (ST-LINK MCO) -> PLL -> 84 MHz" | corrected | https://github.com/stm32duino/Arduino_Core_STM32/blob/main/variants/STM32F4xx/F401R(B-C-D-E)T/variant_NUCLEO_F401RE.cpp | HSE bypass -> **HSI 16 MHz**, PLL M8 N168 P4 -> 84 MHz |
| 31 | STM32duino PWM 1 kHz / 8-bit, ADC 10-bit default | confirmed | https://github.com/stm32duino/Arduino_Core_STM32/blob/main/cores/arduino/pins_arduino.h | |
| 32 | STM32duino 3.0.0 released 23 Jul 2026 (2.12.0 16 Dec 2025); board "Nucleo-64"/"Nucleo F401RE"; node `NODE_F401RE` | confirmed | https://github.com/stm32duino/Arduino_Core_STM32/releases ; boards.txt | |
| 33 | CubeProgrammer upload command `-c port=SWD mode=UR -d <file>.bin 0x08000000 -v -rst` | corrected | https://github.com/stm32duino/Arduino_Tools/blob/main/stm32CubeProg.sh ; platform.txt | -> `--connect port=SWD mode=UR --quietMode --download <file>.bin 0x8000000 --start 0x8000000` |
| 34 | STM32CubeProgrammer v2.23 latest (June/July 2026) | confirmed | https://community.st.com/stm32cubeprogrammer-mcus-30/stm32cubeprogrammer-v2-23-released-166573 | |
| 35 | MicroPython `Pin('A5')` = LD2 | corrected | https://github.com/micropython/micropython/blob/master/ports/stm32/boards/NUCLEO_F401RE/pins.csv | `Pin('A5')` (is Arduino A5 = PC0) -> `Pin('PA5')`; `Pin('C13')` -> `Pin('PC13')` |
| 36 | MicroPython `pyb.LED(1)` = LD2, REPL UART2 115200 | confirmed | https://github.com/micropython/micropython/blob/master/ports/stm32/boards/NUCLEO_F401RE/mpconfigboard.h | |
| 37 | ST-LINK/V2-1 USB ID 0483:374B | confirmed | https://github.com/openocd-org/openocd/blob/master/src/jtag/drivers/stlink_usb.c | |
| 38 | OpenOCD `board/st_nucleo_f4.cfg`; PlatformIO `nucleo_f401re`; Zephyr runners stm32cubeprogrammer/openocd/jlink | confirmed | openocd tcl/board; https://github.com/platformio/platform-ststm32/blob/develop/boards/nucleo_f401re.json ; zephyr boards/st/nucleo_f401re/board.cmake | |
| 39 | Mbed EOL July 2026 (announced July 2024) | confirmed | https://www.hackster.io/news/end-of-the-line-for-arm-s-mbed-os-7027e92805e7 | |
| 40 | System bootloader on USART2 PA2/PA3 | corrected -> unverified | AN2606 not opened; ST community F411 answer cites USART2 on PD5/PD6 | claim removed; USART1/I2C/SPI/DFU left as unverified |
| 41 | Silkscreen colour | corrected (§9 internal contradiction) | ST product render (Zephyr page), ST photo crop | §9 "black silk" -> blue, matching §2.2 |
| 42 | U5 marking `STM32F401` / `RET6U`, small pin-1 dimple lower-left | confirmed | ST product photo; CAD BOM part STM32F401RET6U | |
| 43 | Board thickness 1.6 mm | unverified | not in UM or fab files | |
| 44 | LD1117 abs max 15 V, LD39050 abs max 7 V, LD39050 dropout | unverified | regulator datasheets not opened (st.com download blocked from this host) | |
| 45 | CubeMX defaults (`huart2` 115200, pin labels) and CubeProgrammer console text | unverified | not opened | |
