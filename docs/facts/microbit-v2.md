# BBC micro:bit V2 (V2.2x): fact sheet

## 0. Header

| Item | Value |
|---|---|
| Product modelled | BBC micro:bit V2, revision **V2.21** (the "V2.2x" family; the PCB is marked `micro:bit PCB V2.21` in the BOM) [2][3] |
| Designer / owner | Micro:bit Educational Foundation (hardware files under `microbit-foundation` on GitHub) [2][3] |
| Application MCU | Nordic **nRF52833-QIAA-R** (U2) [3] |
| Interface MCU | Nordic **nRF52820-QDAA-R** (U5) on V2.2x; a limited run of V2.2x used an nRF52833-QDAA as interface instead; V2.00 used NXP **MKL27Z256VFM4** (KL27) [1][3][4] |
| PCB | 2-layer, **black solder mask, white silkscreen, matte ENIG**, 42 x 52 mm (BOM line 1) [3] |

**What it is.** A 51.6 x 42 mm pocket computer for schools. The front carries a 5 x 5 red LED matrix, two push buttons (A, B), a gold touch-sensitive logo, a microphone activity LED and the gold edge connector with five large rings (0, 1, 2, 3V, GND). The back carries the nRF52833 application processor (Cortex-M4F, 64 MHz, BLE 5.1 radio) that runs the user program, a second nRF52 (the "interface MCU") running Arm DAPLink firmware that provides the USB drive (`MICROBIT`), USB serial and CMSIS-DAP debug, a 3.3 V 300 mA LDO, a magnetic speaker, a MEMS microphone, a combined accelerometer/magnetometer (LSM303AGR), a micro-USB socket, a JST-PH-style battery socket and the reset/power button. Programs are flashed by dragging a `.hex` file onto the `MICROBIT` drive [1][9].

## 1. Sources

Official first.

1. tech.microbit.org "2.2x micro:bit revision" page (source: `microbit-foundation/dev-docs`, file `hardware/2-2-revision.md`): processor, radio, buttons, display, sensors, speaker, microphone, GPIO, power, interface chip, USB, mechanical dimensions. https://tech.microbit.org/hardware/2-2-revision/
2. `microbit-foundation/microbit-v2-hardware` GitHub repo, folder `V2.21/`: schematic PDF `MicroBit_V2.2.1_nRF52820 schematic.PDF` (net names, design notes on the power path, LED and mic drive). https://github.com/microbit-foundation/microbit-v2-hardware
3. Same repo: `V2.21/Bill of Materials MicroBit_V2.2.1.csv`: every part number and designator used below. `V2.00/Bill.of.Materials-BBC-microbit_V2.0.0.csv` for V2.00 differences.
4. tech.microbit.org "2.0 revision" page (`hardware/2-0-revision.md`): V2.00 KL27 interface.
5. tech.microbit.org "Edge connector" page (`hardware/edge-connector.mdx`): ring/pin to MCU mapping, pull resistors, default directions, IO electrical limits.
6. tech.microbit.org "Power supply" page (`hardware/power-supply.md`): power sources, current budget, voltage limits, 3V-ring precautions.
7. tech.microbit.org "I2C" page (`hardware/i2c.mdx`): I2C addresses of motion sensor and interface MCU.
8. micro:bit V2 PCB **assembly drawing** (Avnet, two sheets: TOP and BOTTOM, vector PDF, from the micro:bit hardware/reference-design material, downloaded in an earlier run as `asm/`; text dump `assembly.txt`, word boxes `assembly_bbox.html`). All coordinates in section 2 come from it. Exact drawing revision is not printed legibly in the dump (see section 10).
9. tech.microbit.org "DAPLink interface" page (`firmware/daplink-interface.md`): `MICROBIT` / `MAINTENANCE` drives, virtual files, firmware versions per board revision.
10. `microbit-foundation/spec-power-management` (power-spec.md): LED states, reset-button long press, sleep/off modes.
11. Arm DAPLink source, `source/board/microbitv2/microbitv2.h`, `microbitv2.c`, `nrf52820/microbitv2_pins.h`: reset-button timing, power-LED brightness. https://github.com/ARMmbed/DAPLink
12. CODAL `lancaster-university/codal-microbit-v2` v0.3.5: `model/MicroBitIO.h` (every nRF pin assignment), `LSM303Accelerometer.h` / `LSM303Magnetometer.h` (I2C addresses), `MicroBitRadio.cpp` (TX power table). https://github.com/lancaster-university/codal-microbit-v2
13. MicroPython for micro:bit V2 docs, `microbit-foundation/micropython-microbit-v2` (docs `*.rst`: pin, microphone, speaker, radio, display, music, accelerometer, compass). https://microbit-micropython.readthedocs.io/en/v2-docs/
14. GitHub release lists (fetched by API): micropython-microbit-v2 v2.1.2 (2023-10-30); python-editor-v3 v3.1.15 (2026-10-12); ARMmbed DAPLink v0258 (2023-05-10); pyOCD v0.46.0 (2026-10-19); pxt-microbit tags.
15. Out-of-box program source `OOB_v3.cpp` (microbit-foundation OOB repo, earlier run download).
16. Component datasheets referenced by [1]: Knowles SPU0410LR5H-QB-7 (mic), Jiangsu Huaneng MLT-8530 (speaker), ST LSM303AGR, onsemi NCP114, Infineon BAT60A, Nordic nRF52833/nRF52820 product specs (not re-downloaded this run; values quoted via [1][5][6]).
17. microbit.org user guide pages (saved HTML): "Transfer code to the micro:bit" (MICROBIT drive, "you may see the yellow LED on the back flash"), "Power up" / "meet the micro:bit" (heart greeting, factory program prompts, "hold the reset button until the light goes out (about 4 seconds)"), "Reset your micro:bit". https://microbit.org/get-started/user-guide/
18. MicroPython for micro:bit V2 source, `src/codal_port/microbit_i2c.c` and `src/codal_app/microbithal.cpp` (I2C default pins and bus), plus CODAL `model/MicroBit.cpp` (bus construction). https://github.com/microbit-foundation/micropython-microbit-v2

## 2. Geometry (board frame)

**Frame.** Front (LED/buttons/logo) side viewed from above, edge connector at the **bottom**, logo/USB edge at the top. Origin = bottom-left corner of the outline; +x right, +y up; mm.
The back page of [8] is drawn as seen from behind; its x was mirrored into this frame (x_board = right_edge - X). So a back-side part with a **small x is on the left when you look at the front**, and appears on the right when you turn the board over.

**How the numbers were obtained.** The vector PDF [8] was parsed (pdftotext word boxes + path extraction). Scale = outline bbox width 707.72 pt / 51.60 mm = 13.716 pt/mm, origin at the outline's bottom-left. Values tagged **(outline)** are centres/sizes of drawn component outlines; values tagged **(label)** are the centre of the designator text, which normally sits on or beside the part, so treat as +/-1.5 mm. Nothing here is from photos unless marked "(estimated)".

### 2.1 Outline and mechanics

| Item | Value | Source |
|---|---|---|
| Outline | **51.60 (w) x 42.00 (h) mm** | [1][8] |
| Thickness | **1.6 mm +/- 0.16** | [8] |
| Overall depth | 11.65 mm (front button top to back JST top) | [1] |
| Button height above board (front) | 4.55 mm | [1][8] |
| Speaker height above board (back) | 3.00 mm | [1][8] |
| JST battery connector height (back) | 5.50 mm | [1][8] |
| Dimensions printed on [8] (all decoded) | x: 4.21, 14.37, 25.80, 37.23, 47.39 = ring centres; 5.86 / 45.74 = button A / B centres; 17.80 / 33.80 = outer LED columns; 25.93 = USB centre; 16.27 = reset button SW1 centre; 7.00 = battery connector J2 centre; 1.54 / 50.06 = the two 1 mm round marks (fiducials, inferred). y: 6.86 = ring centres; 20.96 = button centres; 12.00 / 28.00 = bottom / top LED rows. All measured from the bottom-left corner of the outline | [8] |
| Corner radius | **3.00 mm** on all four corners (outline Bezier arcs from (51.60, 39.00) to (48.60, 42.00) etc.; the two bottom corners end at y = 0.13 where they meet the edge-connector edge) | [8] (extracted from the outline path) |
| Edge notches | The bottom edge is **notched under each ring**: a shallow recess 0.74 mm deep, 3.81 mm wide at the edge with a 1.15 mm flat bottom and rounded sides, centred on each ring x (e.g. ring 1: edge cut from x = 12.46 to 16.27, flat from 13.79 to 14.94). They locate crocodile clips | [8] (outline path) |
| Mounting holes | None separate: the 5 ring holes double as mounting/4 mm-plug holes | [1] |
| Edge finish | "Board edge finish to be a straight/flush edge, burrs are not acceptable" (note 8 on [8]) | [8] |
| Solder mask / silk | Black mask, white silk, ENIG (gold) finish on rings, edge fingers and logo | [3] |

### 2.2 Front side (top layer) parts

| Designator | What | Package | Centre (x, y) | Footprint w x h | Height | Colour/marking | Source |
|---|---|---|---|---|---|---|---|
| Ring 0 | Edge ring / plated hole, P0 | plated through hole | **(4.21, 6.86)** | pad drawn 4.98 x 4.98, hole 3.98 (4 mm nominal [1]) | flush | gold ENIG, silk "0" | (outline) [8], 4 mm hole [1] |
| Ring 1 | P1 | " | **(14.37, 6.86)** | " | flush | silk "1" | [8] |
| Ring 2 | P2 | " | **(25.80, 6.86)** | " | flush | silk "2" | [8] |
| Ring 3V | 3V supply | " | **(37.23, 6.86)** | " | flush | silk "3V" | [8] |
| Ring GND | Ground | " | **(47.39, 6.86)** | " | flush | silk "GND" | [8] |
| SW2 | Button A | DTSJ-61K-Q-T/R tactile, 6 mm J-lead | **(5.86, 20.96)** (outline; both values are also printed as dimensions on [8]) | 6.00 x 6.50 body; 4 pads 1.28 x 1.48 at (3.61, 17.96), (8.11, 17.96), (3.61, 23.96), (8.11, 23.96) | 4.55 | black round plunger in a square body, silk "A" | (outline) [8]; part [3]; height [1] |
| SW3 | Button B | same | **(45.74, 20.96)** (outline + printed dimension) | 6.00 x 6.50; pads at (43.49, 17.96), (47.99, 17.96), (43.49, 23.96), (47.99, 23.96) | 4.55 | silk "B" | (outline) [8] |
| D2...D50 (even) | 25 matrix LEDs | 0603 red, colourless dome, Everlight 19-217/R6C-AL1M2VY/3T | grid, see 2.2.1 | 0.80 (x) x 1.60 (y), rotation 90 deg | ~0.6 (unverified) | water-clear lens, red when lit | [3][8] |
| LOGO | Touch logo pad (`LOGO` net, P1.04) | copper pad, ENIG | **(25.80, 34.02)** | 8.68 x 4.88 | flush | gold micro:bit "face" logo (two rounded pads in a rounded rectangle outline) | (outline) [8]; net [2][12] |
| D70 | Microphone activity LED | Everlight 48-213/RAC-BP2Q2VY/3C, red **side-view** SMT LED (BOM) | **on the BACK at (35.72, 33.63), rotated 45 deg**, just above-right of the mic U4 (outline 1.73 x 1.73 bounding box; designator D70 printed beside it on the back sheet) | ~1.2 x 0.8 body (estimated from the back render) | - | red when lit. [1] says the indicator is seen "on the front of the board"; how its light reaches the front (hole or slot) is not shown on [8] (unverified) | (outline + rendered back sheet) [8]; [1][3] |
| Mic port | Sound hole for U4 (U4 is a bottom-port mic on the back; the hole goes through the PCB) | plated/drilled hole | **(33.95, 31.82)** (front-sheet circle) | 0.38 mm circle as drawn on [8] | - | small dark hole right of the logo; silk microphone icon beside it (icon unverified) | (outline) [8]; it sits inside the U4 outline on the back (section 2.3) |

Other shapes on the front sheet that are **not** front parts: the USB J3 outline (25.93, 39.57) 8.00 x 4.86 (J3 is on the back, but its shell has **through-board pegs**: two 0.69 mm round holes at (23.51, 37.77) and (28.36, 37.77) and two 0.69 x 1.07 slots at (22.30, 40.42) and (29.55, 40.42), visible as small plated holes on the front); grey keep-out areas (14.75, 38.99) 6.11 x 6.11 and (19.20, 40.68) 2.87 x 2.73, and (5.9, 36.2) 11.7 x 11.7 around J2. Two 1.00 mm circles at **(1.54, 20.95) and (50.05, 20.95)** are almost certainly fiducials (inferred from their size and placement; their x values 1.54 and 50.06 are printed dimensions on [8]); draw them as small bare-copper dots.

#### 2.2.1 LED matrix grid

**LED body centres** from the 25 drawn 0603 body outlines on the front sheet [8] (each 0.80 wide x 1.60 tall, i.e. the long axis runs along y, rotation 90 deg; pads 0.79 x 0.79 at y +/- 0.75 from the centre). Pitch is exactly **4.00 mm** in x and y; the printed dimensions on [8] (17.80, 33.80 for the outer columns, 12.00 and 28.00 for the outer rows) confirm it. **Matrix centre (25.80, 20.00).** (An earlier draft used the designator-label positions, which sit 2 mm above each LED; those are not the LED positions.)

| Row (top to bottom) | LED y | LEDs left to right at x = 17.80, 21.80, 25.80, 29.80, 33.80 |
|---|---|---|
| Row 1 (y index 0) | 28.00 | D2, D4, D6, D8, D10 |
| Row 2 | 24.00 | D12, D14, D16, D18, D20 |
| Row 3 | 20.00 | D22, D24, D26, D28, D30 |
| Row 4 | 16.00 | D32, D34, D36, D38, D40 |
| Row 5 (y index 4) | 12.00 | D42, D44, D46, D48, D50 |

Designator-to-position mapping follows the label order on [8] (labels are 2 mm above each body). Small 0.26 mm dots drawn at (x + 0.16, y + 0.83) of each LED are polarity marks on the drawing (assembly-drawing symbol; not necessarily silkscreen on the real board). MicroPython `display.set_pixel(x, y, b)` uses x = column 0...4 left to right and y = row 0...4 top to bottom, so pixel (0, 0) is the LED at (17.80, 28.00).

### 2.3 Back side (bottom layer) parts

Positions are in the board frame (mirrored from the back sheet). Seen from the back, left and right swap.

| Designator | What | Package / part | Centre (x, y) | Footprint | Height | Colour/marking | Source |
|---|---|---|---|---|---|---|---|
| J3 | Micro-USB socket, Adam Tech MCR-B-S-RA-SMT-CS5-T/R (BOM description: "USB Connector, Micro USB Type AB SMT RA"; the tech site lists it as "USB micro") | SMT right-angle | **(25.93, 39.57)** (outline) | 8.00 x 4.86; body reaches y = 42.0 (flush with top edge, opening faces +y) | ~2.7 (unverified) | bright metal shell | [3][8] |
| J2 | Battery connector, 2-pin 2.0 mm pitch right-angle SMT. BOM: MTCONN WB200SW-02SR01; tech site: JST S2B-PH-SM4-TB | SMT RA | **(6.98, 37.26)** (outline; 7.00 is also a printed dimension) | 7.90 x 8.60 (outline incl. mounting tabs) | 5.50 | white/cream nylon housing; opening faces +y (top edge) (orientation from product photos, unverified in files) | [1][3][8] |
| SW1 | Reset / power button (BOM: same DTSJ-61K-Q-T/R 6 mm tactile as A/B) | J-lead | **(16.27, 38.86)** (outline; 16.27 is also a printed dimension on [8]) | **6.50 x 6.00** (rotated 90 deg relative to A/B) | ~4.5 (same part as A/B, 4.55 per [1]; unverified on back) | black plunger; seen from the back it is just to the right of the USB socket | (outline) [8], [3] |
| D60 | **Red power LED**, 0603 (same red LED as the matrix) | 0603 | (33.10, 39.95) (outline) | 0.8 x 1.6 (rotated 90 deg) | | red | [3][8]; "red LED (left of the USB connector)" as seen from the back [6] |
| D61 | **Yellow USB LED**, Everlight 19-217/Y5C, 590 nm | 0603 | (20.83, 40.28) (outline) | 0.8 x 1.6 | | yellow (docs also call it "orange") | [3][8][10] |
| R38, R39 | 220 R LED resistors | 0402 | R38 label (34.30, 38.03); R39 label (18.65, 34.07) | | | | [3][8] |
| D62 | PRTR5V0U2F USB ESD | SOT-1088 (unverified) | (21.40, 36.30) (outline 1.50 x 1.00) | | | | [3][8] |
| L5 | USB common-mode choke 90 R, 1210 | 1210 | label (15.33, 30.20) | | | | [3][8] |
| D51 | BAT60JFILM Schottky (USB VBUS to VCOMBINED) | SOD-323 | label (11.79, 41.12) | | | | [2][3][8] |
| D57, D59 | BAT60A Schottky, in series on the battery input | SOD-323 (unverified) | D59 label (4.13, 31.23); D57 not labelled in extracted text | | | | [2][3][8] |
| U3 | NCP114BMX330TCG, 3.3 V 300 mA LDO | XDFN-4 1 x 1 mm (unverified) | label (11.89, 35.43) | | | | [3][8] |
| D1 | BAT54T (keeps LDO Vout <= Vin + 0.3 V when back-powered) | SOT-523 | label (3.31, 26.40) | | | | [2][3][8] |
| U5 | **nRF52820-QDAA** interface MCU | QFN-40 5 x 5 mm | **(10.80, 24.27)**, **rotated 45 deg** (the outline is a diamond with vertices (7.26, 24.26), (10.80, 27.80), (14.34, 24.26), (10.80, 20.73), i.e. a 5.00 mm square turned 45 deg) | 5 x 5 | 0.85 | black, Nordic laser marking `N52820` + variant/date code (marking text unverified) | (outline) [8]; part [1][3] |
| X2 | 32 MHz crystal for U5 (AEL X32M000000S045, 3.2 x 2.5 x 0.6) | 4-pad SMD | (unverified) near U5 | 3.2 x 2.5 | 0.6 | metal lid | [3] |
| U2 | **nRF52833-QIAA** application MCU | aQFN-73 7 x 7 mm | **(39.59, 25.15)**, **rotated 45 deg** (diamond outline, vertices (39.59, 20.20), (34.64, 25.15), (39.59, 30.10), (44.54, 25.15) = 7.00 mm square turned 45 deg; a smaller diamond, 5.27 mm across, marks the centre pad) | 7 x 7 | 0.85 | black, `N52833` + `QIAAxx` + date code (marking text unverified) | (outline) [8]; part [1][3]. The designator label sits outside at (45.61, 24.73) |
| X1 | 32 MHz crystal for U2 | 3.2 x 2.5 4-pad SMD | **(46.10, 19.57)**, rotated 45 deg (outline 3.20 x 2.40) | 3.2 x 2.4 (drawing) / 3.2 x 2.5 (BOM) | 0.6 | metal lid | (outline) [8]; [3] |
| L3, L7, C11 | RF matching (4.7 nH, 4.7 nH, 0.3 pF) to the PCB antenna | 0402 | L3 (43.91, 29.49), L7 (44.84, 30.34) labels | | | | [3][8] |
| Antenna | Printed PCB antenna ("off-chip aerial") | copper trace | top-right corner region (estimated, near (44-51, 30-42); not extracted) | | | | [1] (estimated) |
| U6 | LSM303AGR accel + magnetometer | LGA-12 2 x 2 x 1 mm | **(42.70, 12.08)**, not rotated (2.00 x 2.00 outline) | 2 x 2 | 1.0 | black LGA, tiny ST marking | (outline) [8]; [3] |
| SP1 | MLT-8530 magnetic speaker | SMD, body 8.5 x 8.5 x 3.0 (datasheet name; unverified) | **(25.80, 21.74)**, **rotated 45 deg** (the outline is an 8.0 mm square with chamfered corners turned 45 deg, bounding box 11.31 x 11.31, x 20.14-31.46, y 16.09-27.40). It sits directly behind the LED matrix (matrix centre (25.80, 20.00)) | 8.0 x 8.0 (drawing) | 3.00 | black plastic square with a round sound port | (outline) [8]; [1][3] |
| T2 | BSS816NW N-MOSFET, speaker driver | SOT-323 | label (22.59, 25.12) | | | | [2][3][8] |
| D5 | BAS16LD across the speaker (flyback) | DFN | label (20.21, 27.79) | | | | [2][3][8] |
| U4 | Knowles SPU0410LR5H-QB-7 MEMS mic (bottom port through the PCB) | LGA, 3.76 x 2.95 x 1.1 (datasheet) | **(33.38, 31.26)**, **rotated 45 deg** (outline 3.79 x 3.00, vertices (33.10, 28.86), (30.98, 30.98), (33.66, 33.66), (35.78, 31.54)); the front sound hole (33.95, 31.82) is inside it | 3.79 x 3.00 | ~1.1 | silver metal lid | (outline) [8]; [3] |
| D71, D72, D73, D74 | D5V0H1B2LP bidirectional TVS (edge-ring ESD) | DFN1006 | D71 (36.94, 12.08), D72 (9.17, 32.63), D73 (4.75, 13.23) labels | | | | [3][8] |
| T1, T3, T4, T5, T7 | DTA143Z PNP (T1) and DTC143E NPN (T3-T5, T7) digital transistors (power-path / sensing / interrupt) | SC-75 | T1 (3.11, 21.76), T3 (2.56, 23.93), T4 (2.87, 19.86), T5 (42.11, 15.40), T7 (38.33, 10.73) | | | | [3][8] |
| Battery pads | Two rounded-rectangle pads at the far right of the back (as seen from the back): **upper = GND, lower = 3V** | copper | at small x in the board frame (left edge region) (unverified exact) | | | | [6] |
| TP1-TP21 | Test pads (production test / programming) | round pads | e.g. TP17 (3.35, 33.0), TP19 (21.87, 34.85) | | | | [8] |

### 2.4 Edge connector

- **Front: 25 visible strips, of which 5 are the big rings** (0, 1, 2, 3V, GND) with 4 mm holes for 4 mm banana plugs or crocodile clips [1][5]. The narrow strips are on a **1.27 mm pitch**; the mating socket is an 80-way (40 per side) 1.27 mm edge connector [5].
- The 40 front positions map to the 25 visible strips like this (from the V2 table in [5], one row per 1.27 mm position):
  - each of rings **0, 1, 2 occupies 4 positions** (4 x 1.27 = 5.08 mm wide pad, which matches the ~5 mm ring pad on [8]);
  - **3V and GND occupy 6 positions each**: a narrow **guard strip**, the 4-position ring, and another narrow guard strip ("The 3V and GND rings have guard strips either side of the big rings, to avoid any degradation of device performance due to slipping crocodile clip connections" [5]). The guard strips are the same net as the ring.
  - all other strips are 1 position wide.
- Visible strip order, front, left to right (25): `P3, [RING 0], P4, P5, P6, P7, [RING 1], P8, P9, P10, P11, P12, [RING 2], P13, P14, P15, P16, 3V guard, [RING 3V], 3V guard, P19, P20, GND guard, [RING GND], GND guard` [5]. Position count: 1+4+4+4+5+4+4+6+2+6 = 40.
- **Back**: the five rings are repeated on the back and connected to the front rings; the back small strips are **unconnected** ("Only the pins on the front are connected to signals" [5]).
- There are no pins named P17 or P18 on V2 (the numbers 17/16 in the [5] table are module/schematic pin numbers, not micro:bit pin names).
- The board edge has a 0.74 mm deep, 3.81 mm wide notch under each of the five rings (see 2.1), measured from the outline path on [8].
- No overhang: the edge fingers end at the board edge (y = 0). Ring centres on [8]: x = 4.2, 14.4, 25.8, 37.2, 47.4 mm, y = 6.9 mm (section 2.2).

- **Strip pads, measured on the front sheet [8].** Every narrow strip is drawn as a **0.90 x 5.04 mm** pad from y = 0.28 to y = 5.32 (so it stops 0.28 mm short of the board edge), except the two end strips: P3 at x = 1.03 is 0.88 x 2.98 (y 1.87-4.85) and the right-hand GND guard at x = 50.56 is 0.88 x 2.48 (y 2.12-4.60), shortened by the board corners. Measured strip centres x: P3 1.03; P4 7.38; P5 8.66; P6 9.93; P7 11.20; P8 17.55; P9 18.82; P10 20.09; P11 21.36; P12 22.62; P13 28.98; P14 30.25; P15 31.52; P16 32.78; 3V guard 34.05; 3V guard 40.41; P19 41.67; P20 42.95; GND guard 44.22; GND guard 50.56. They sit on the grid x_n = 1.03 + (n - 1) x 1.27 for positions n = 1...40.
- **Rings, measured [8]:** each ring is drawn as a 4.98 x 4.98 pad around a 3.98 mm hole, centred at y = 6.86 and x = 4.21, 14.37, 25.80, 37.23, 47.39 (these five x values are also printed dimensions on [8]). The 4 grid positions under each ring (and the 6 for 3V/GND) are not drawn as separate strips on [8]: the gold ring area runs down to the edge as one wide finger (as on the real board; finger outline not extracted, estimated from product photos).

### 2.5 Silkscreen and markings a faithful drawing needs

- **Front**: "A" and "B" by the buttons; "0", "1", "2", "3V", "GND" by the rings; the gold micro:bit face logo (copper area drawn as one 8.68 x 4.88 mm stadium at (25.80, 34.02); the visible logo is the micro:bit "face": a stadium-shaped outline with two round eyes, all gold); a microphone icon near the mic hole (33.95, 31.82) (icon shape unverified). White silk on black mask.
- **Back** (from the rendered back sheet [8]): a block of large grey silkscreen words, reading normally when the board is turned over, centred about (25.6, 32.6) in the board frame (x 20.9-30.3, y 29.7-35.6): **`USB`**, **`BLE ANTENNA`**, **`MICROPHONE`**, **`RESET /` + power symbol**, **`BATTERY`**, one per line, with silk leader lines running from the words to the USB socket, the antenna corner, the mic and the reset button. Other back markings (micro:bit wordmark, version text such as "V2.21", CE/UKCA marks, QR/serial label) exist on real boards but were not on [8] (unverified).
- Chip markings: standard Nordic laser marks (`N52833` / `N52820`, variant code `QIAA` / `QDAA`, date code) and ST marking on the LSM303AGR (exact text unverified).

## 3. Electrical

### 3.1 Processors

| | Application (U2) | Interface (U5) V2.2x | Interface V2.00 |
|---|---|---|---|
| Part | nRF52833-QIAA | nRF52820-QDAA (some V2.2x: nRF52833-QDAA) | NXP MKL27Z256VFM4 |
| Core | Arm Cortex-M4 with FPU, 64 MHz | Cortex-M4 (no FPU), 64 MHz | Cortex-M0+ 48 MHz (unverified clock) |
| Flash / RAM | 512 KB / 128 KB | 256 KB (128 KB reserved for NV storage) / 32 KB | 256 KB / 32 KB (unverified) |
| Clock | 32 MHz crystal X1 | 32 MHz crystal X2 | (n/a) |
| Debug | SWD from the interface MCU | own SWD | own SWD |
[1][3][4]

Radio (nRF52833): BLE 5.1 via Nordic S113 SoftDevice, -93 dBm sensitivity, TX -40 to +4 dBm. micro:bit radio protocol: 1 or 2 Mbit/s, no encryption, 8 power levels 0..7 (CODAL table 0xD8...0x04 = -40, -20, -16, -12, -8, -4, 0, +4 dBm), group 0..255, payload 32 bytes default (MicroPython `radio.config(length=...)` accepts up to 251 bytes; CODAL caps `MICROBIT_RADIO_MAX_PACKET_SIZE` at 250) [12][13]. Note: [1] says power 0 = -30 dBm; the CODAL table value 0xD8 is -40 dBm. Trust the code [12].

Temperature: on-die sensor, 0.25 C steps, +/-5 C uncalibrated [1].

### 3.2 Power tree (V2.21 schematic [2], BOM [3])

```
USB VBUS 5V ----------- D51 BAT60J ----+      (USB D+/D- go through choke L5 and ESD array D62 to U5)
                                        +--> VCOMBINED --> U3 NCP114 3.3V 300mA LDO --> VREG (3.3 V) --> both nRF52s, sensors, LEDs, 3V ring
Battery J2 (2xAAA, "3V DC") -- D59 BAT60A -- D57 BAT60A --+
3V ring / back pads ------------------------------------------------> VREG directly (no protection);  D1 BAT54T keeps Vout <= Vin+0.3 V on U3
```

- VCOMBINED is USB 5 V minus the D51 Schottky drop (about 4.7 V) when USB is connected, otherwise the battery voltage minus two Schottky drops [2] (drop values estimated, not measured).
- D57 is a second BAT60A in series as "secondary reverse current protection in case of D59 failure" (schematic note) [2].
- U3 NCP114: 300 mA max output [1][3]. With a 3 V battery the LDO is in dropout, so VREG is roughly battery voltage minus two Schottky drops (~0.1-0.3 V) (estimated).
- Operating range of the whole board: 1.7 V ... 3.6 V (limit set by LSM303AGR 3.6 V abs max) [6].
- Current: 300 mA total; on-board peripherals budget 90 mA; **max to edge connector 190 mA** [1]. [6] also says 270 mA in one paragraph and 190 mA in another; trust 190 mA (stated twice, and in [1]).
- Battery: 2 x AAA (or 2 x AA) packs, 2-pin 2.0 mm JST-PH-style socket J2 at the top-left of the board frame (top-right as seen from the back). [6] warns that a 4.2 V LiPo exceeds the 3.6 V limit **on V1**, where the battery fed the nRF51 through only one BAT60 diode. On V2, "the battery power goes through the on-board regulator" [6], so a 4.2 V cell on J2 is regulated to 3.3 V by U3 (NCP114 operating input range 1.7-5.5 V per the onsemi product page); the Foundation still documents only 3 V packs for J2, so lessons should use 2 x AAA. A LiPo or any source above 3.6 V on the **3V ring or back pads** bypasses the regulator and is out of range [6].
- When battery-powered on V2, the interface MCU is also powered and the red LED (D60) is lit (dimmer: PWM 100/255 vs 255 on USB) unless the board is asleep [6][11].

### 3.3 Logic levels and IO limits [5]

- 3.3 V logic (VDD ~3.3 V on USB, ~3.0 V on battery). VIL <= 0.3 VDD, VIH >= 0.7 VDD.
- **Not 5 V tolerant**: VIO = -0.3 V ... VDD + 0.3 V; absolute VDD 3.9 V.
- Per-pin drive (nRF52833 figures quoted in [5], section 6.8.3 of the nRF52833 PS): **standard drive 1 mA min / 4 mA max at VDD - 0.4 V**; high drive 6-14 mA (source) / 6-15 mA (sink) at VDD >= 2.7 V. The runtimes use standard drive, so plan on **about 2-4 mA per pin**; drive LEDs through a resistor or a transistor. (The "5 mA" figure that appears in [5] belongs to the V1 nRF51822 table, not V2.) Note 2 in [5]: inductive loads (motor, speaker, piezo) on a pin can exceed the pin voltage limits through back-EMF.

### 3.4 ADC, PWM, touch

- ADC: 10-bit in the runtimes (0...1023) [1]; analog-capable rings/pins: P0, P1, P2, P3, P4, P10 (6 analog inputs) [1][5].
- PWM: any of the 19 GPIO pins, up to 3 simultaneous PWM channels in the runtime [1]; MicroPython `set_analog_period()` minimum 1 ms, `set_analog_period_microseconds()` minimum 256 us [13]; default period **20 ms (50 Hz)**: CODAL creates the PWM with a 50 Hz sample rate (`new NRF52PWM(NRF_PWM0, *pwmSource, 50)`, codal-nrf52 `NRF52Pin.cpp` line 328) [12].
- No DAC.
- Touch: P0, P1, P2 default to **resistive** touch (10 M external pull-ups R7, R8, R9 [3][5]); the logo (P1.04) defaults to **capacitive** touch [13].

### 3.5 USB / interface

- Micro-USB, USB 2.0 Full Speed 12 Mbit/s; composite device: Mass Storage (drive `MICROBIT`), CDC serial, CMSIS-DAP HID + WinUSB, WebUSB [1].
- UART from nRF52833 to interface: TX P0.06, RX P1.08 [12]. Default serial 115200 baud.
- Internal I2C between nRF52833, interface MCU and motion sensor: SCL P0.08, SDA P0.16, interrupt `COMBINED_SENSOR_INT` / data ready P0.25 [12]. Interface MCU addresses 0x70 (management) and 0x72 (storage) [7].

### 3.6 LEDs

| LED | Colour | Driven by | Behaviour |
|---|---|---|---|
| D2-D50 (25) | red 0603 | nRF52833 rows ROW1-5 = P0.21, P0.22, P0.15, P0.24, P0.19 (anode side, drive high) and columns COL1-5 = P0.28, P0.11, P0.31, P1.05, P0.30 (cathode, sink low) [12][2] | multiplexed by the runtime, 255 brightness steps; also used as a light sensor (reverse-biased) [1] |
| D70 | red side-view | `RUN_MIC` = P0.20 high (through R16 120 R); the same pin powers the mic | on whenever the microphone is in use [1][2] |
| D60 | red | interface MCU (`LED_PWR`, PWM) via R38 220 R | power LED: full on with USB, dimmer on battery, fades/blinks during reset long press, blinking in stand-by [10][11] |
| D61 | yellow (590 nm) | interface MCU (`LED_USB`) via R39 220 R | on when USB-connected to a PC; flashes during HEX transfer [10] |

### 3.7 Buttons and touch

| Control | Pin | Active level | Notes |
|---|---|---|---|
| Button A (SW2) | P0.14 (= edge P5) | low when pressed, external **10 k** pull-up to VREG (R4) | Sources disagree: [1] says "external 4K7"; [5] says e10Ku; the V2.21 schematic shows R4/R5 = 10k next to SW2/SW3 and BTN_A/BTN_B, and the BOM lists R4, R5 among the 10K parts, while the only 4.7 k parts are R1/R2 (external I2C pull-ups) and R55 (speaker driver) [2][3]. **Trust 10 k** (schematic + BOM are the built design). Software debounce 54 ms [1] |
| Button B (SW3) | P0.23 (= edge P11) | low when pressed, external 10 k pull-up (R5) | [2][3][5][12]. Schematic note: "BTN_A and BTN_B ... should not be used as GPIOs" [2] |
| Reset/power (SW1, back) | interface MCU + nRF52833 reset; 10 K pull-up | low when pressed | short press = reset; hold ~2.4 s then release = power off (LED fades); see 5.4 [1][11] |
| Logo touch | P1.04 | capacitive | `pin_logo` [12][13] |

### 3.8 On-board sensors and audio

| Part | Facts |
|---|---|
| LSM303AGR (U6) | 3-axis accel (+/-2/4/8/16 g, 8/10/12-bit) + 3-axis magnetometer, I2C. **Accelerometer 0x19 (8-bit 0x32/0x33), magnetometer 0x1E (0x3C/0x3D)** [1][7][12]. The footprint also accepts NXP FXOS8700CQ (0x1F) and the runtime auto-detects; only one is fitted [1][7]. The V2.21 BOM fits the LSM303AGRTR [3]; no newer motion sensor appears on V2.21. The live tech.microbit.org 2.2x page (checked 2026-10-24) still lists only the LSM303AGR, with the FXOS8700CQ as the alternative footprint ("Only one sensor will ever be placed"); a web search found no official announcement of a different V2.2x motion sensor. **Model the LSM303AGR.** |
| Microphone U4 | Knowles SPU0410LR5H-QB-7 analog MEMS, -38 dB +/-3 dB @ 94 dB SPL, SNR 63 dB, AOP 118 dB SPL, 100 Hz-80 kHz, omni. Powered by `RUN_MIC` P0.20, output AC-coupled to `MIC_IN` P0.05 (AIN3), bias 33K:1K [1][12] |
| Speaker SP1 | MLT-8530 magnetic, 80 dB @ 5 V 10 cm, resonance 2700 Hz, driven by P0.00 through MOSFET T2, flyback D5 [1][2][12]. Sound is mirrored to P0 ring by default in MakeCode/MicroPython (audio goes to pin0 and speaker) |
| Light | via LED matrix, ~10 levels [1] |
| Temperature | nRF52833 die sensor [1] |

## 4. Pinout (edge connector, front, left to right)

From the V2 table in [5], checked against CODAL `MicroBitIO.h` [12]. "Ring" entries are the big holes; everything else is a narrow strip. Pull notation from [5]: e10Mu = external 10 M pull-up, e10Ku = external 10 k pull-up, e4k7u = external 4.7 k pull-up. Functions in brackets in [5] need the default use (display, buttons, I2C) turned off first.

| Strip | Label | nRF52833 pin | Default use / functions | Notes |
|---|---|---|---|---|
| 1 | P3 | P0.31 / AIN7 | **LED column 3**; (GPIO), (analog), (PWM) | turn the display off to use it [5] |
| 2 | **0 (ring)** | P0.02 / AIN0 | GPIO, analog, touch, PWM, UART; audio out by default | e10Mu (R7), resistive touch [3][5] |
| 3 | P4 | P0.28 / AIN4 | **LED column 1**; (GPIO), (analog) | [5] |
| 4 | P5 | P0.14 | **Button A**; (GPIO) | e10Ku, active low [5] |
| 5 | P6 | P1.05 | **LED column 4** | [5] |
| 6 | P7 | P0.11 / TRACEDATA2 | **LED column 2** | [5] |
| 7 | **1 (ring)** | P0.03 / AIN1 | GPIO, analog, touch, PWM, UART | e10Mu (R8) [3][5] |
| 8 | P8 | P0.10 / NFC2 | GPIO, PWM, UART | free [5] |
| 9 | P9 | P0.09 / NFC1 | (GPIO), (PWM), (UART), (NFC1) | use with caution (NFC pin) [5] |
| 10 | P10 | P0.30 / AIN6 | **LED column 5**; (analog) | [5] |
| 11 | P11 | P0.23 | **Button B**; (GPIO) | e10Ku, active low [5] |
| 12 | P12 | P0.12 / TRACEDATA1 | **ACCESSIBILITY** | [5] says it "should not be used for anything else (even though it can be used as a GPIO for testing)" |
| 13 | **2 (ring)** | P0.04 / AIN2 | GPIO, analog, touch, PWM, UART | e10Mu (R9) [3][5] |
| 14 | P13 | P0.17 | GPIO, SPI SCK, PWM, UART | free [5] |
| 15 | P14 | P0.01 / XL2 | GPIO, SPI MISO, PWM, UART | free [5] |
| 16 | P15 | P0.13 | GPIO, SPI MOSI, PWM, UART | free [5] |
| 17 | P16 | P1.02 | GPIO, PWM, UART | free [5] |
| 18 | 3V guard | +V_TGT (VREG) | supply | same net as the 3V ring [5] |
| 19 | **3V (ring)** | +V_TGT (VREG) | 3.3 V out (or 3 V in) | max 190 mA out; powering through it bypasses all protection [1][6] |
| 20 | 3V guard | +V_TGT | supply | [5] |
| 21 | P19 | P0.26 | **external I2C SCL**; (GPIO), (PWM) | e4k7u (R1) [3][5] |
| 22 | P20 | P1.00 / TRACEDATA0 | **external I2C SDA**; (GPIO), (PWM) | e4k7u (R2) [3][5] |
| 23 | GND guard | GND | ground | [5] |
| 24 | **GND (ring)** | GND | ground | [5] |
| 25 | GND guard | GND | ground | [5] |

All pins are 3.3 V logic and **not 5 V tolerant** (VIO max VDD + 0.3 V) [5]. The V2 external I2C (P19/P20) is a separate bus from the internal sensor bus (SCL P0.08, SDA P0.16); on V1 they were shared [7][12][13]. Not on the edge connector: speaker P0.00, mic in P0.05, RUN_MIC P0.20, logo P1.04, rows P0.21/P0.22/P0.15/P0.24/P0.19, UART to interface P0.06 (TX) / P1.08 (RX), sensor interrupt P0.25 [12].

## 5. Programming

### 5.1 Toolchains (October 2026)

- **MicroPython**: micropython-microbit-v2 **v2.1.2** (latest tag, 2023-10-30) [14]; web editor python.microbit.org = python-editor-v3 **v3.1.15** (2026-10-12), which bundles MicroPython 2.1.2 [14].
- **MakeCode**: makecode.microbit.org (pxt-microbit; highest git tag seen on 2026-10-24 is **v9.1.1**; the repo publishes no GitHub releases, so the exact version live on the site is unverified) [14].
- **C++**: CODAL `codal-microbit-v2` v0.3.5 [12].
- **Arduino**: community "nRF5" / Adafruit or Sandeep Mistry core with micro:bit V2 support (version unverified).
- **Debug**: pyOCD v0.46.0 (2026-10-19), OpenOCD with CMSIS-DAP [14].

### 5.2 Drag-and-drop HEX flashing (what the user sees)

1. Plug in USB: D61 (yellow) lights; a USB drive named **`MICROBIT`** appears containing `DETAILS.TXT`, `MICROBIT.HTM` (and sometimes `MY_DATA.HTM`) [9].
2. Copy a `.hex` (or universal hex) onto the drive. The interface MCU streams it into the nRF52833 flash; the **yellow LED flashes rapidly** during the transfer (about 10 s for a large file; unverified duration).
3. The drive **ejects and remounts by itself** (the file system is virtual; files do not stay on it). Windows/macOS may warn "disk not ejected properly" [9].
4. The target resets and the new program starts.
5. On failure a **`FAIL.TXT`** appears with the reason (e.g. hex parse error) [9]; `ASSERT.TXT` = recovered minor error.
6. WebUSB flashing from the browser (MakeCode or Python Editor) does the same via CMSIS-DAP without the drive copy [1].

Interface firmware: V2.00 ships DAPLink 0255, V2.20 0256, V2.21 0257; 0258-beta3 available. Holding the reset button while plugging in USB enters **`MAINTENANCE`** mode (bootloader) for updating DAPLink [9].

### 5.3 Serial

MicroPython REPL and `print()` appear on the USB CDC serial port at **115200 baud** (8N1) [13]. Ctrl-C interrupts, Ctrl-D soft-resets.

### 5.4 Reset / power button (interface firmware 0257/0258 [10][11])

- Short press: target is held in reset while the button is down and runs again on release.
- Hold: the red LED starts dimming; release after **~2.4 s** (80 x 30 ms) requests power-off; at ~3.6 s (120 x 30 ms) the LED fades out [11]. The user guide words it as "hold the reset button until the light goes out (about 4 seconds) to power off your micro:bit" [17].
- Off mode (battery/USB-bank only): all LEDs off; wake by pressing reset. Stand-by when PC-connected: red LED blinks [10].

### 5.5 Factory program

The factory program is called **"meet the micro:bit"** (formerly "Out of box experience") [17]. microbit.org: "the LED display output will spring into life and, in most cases, will greet you with a heart", then prompts: press A, B and A+B, shake (accelerometer), tilt to "get the 2 dots to meet", try it covered/in the dark (light sensing); the V2 version also uses the speaker and microphone; older versions hide a snake game behind A+B at the heart animation [17]. From the earlier-run source [15]: the V2 program button presses show happy/sad faces with "spring"/"sad" sounds; shake shows sun/moon; holding the logo records sound through the mic and plays it back (exact sequence and which OOB version is flashed at the factory: unverified).

## 6. Real failure modes

| Fault | What happens | What the user sees |
|---|---|---|
| Battery reversed in J2 | The JST-PH housing is keyed, so reversal needs a mis-wired pack. D59 + D57 (BAT60A, in series) block reverse current [2] | Nothing happens; board stays dead; no damage |
| USB reversed | Micro-USB is keyed; not possible | - |
| Reverse supply on the **3V ring** | No protection: VREG goes directly to every chip. Docs require an external diode [6] | ESD/TVS D71-D74 and chip ESD diodes conduct; heavy current, chips (nRF52s, LSM303) get hot and die; possible burnt smell |
| Over-voltage on USB (>5.5 V, bad power bank) | LDO input is rated for it (NCP114 abs max ~6 V, unverified); bigger spikes damage U3 | Docs warn against some USB battery packs [6] |
| Over-voltage on 3V ring (>3.6 V, e.g. LiPo 4.2 V or 5 V) | Bypasses the regulator; LSM303AGR abs max 3.6 V, nRF52 abs max 3.9 V [6]; D1 conducts into the LDO | Board may work briefly then dies; sensors fail first (compass/accelerometer errors) |
| Brown-out | nRF52833 POR/BOR at about 1.7 V (unverified exact); board range 1.7-3.6 V [6] | With weak AAA cells: random resets, dim display, radio drops, speaker sound causes resets |
| Over-current from 3V ring (>190 mA, e.g. many NeoPixels, a motor) | LDO U3 300 mA current limit / thermal shutdown (NCP114 has current limit; exact value unverified) | Resets, display flicker, USB disconnects; LDO gets warm |
| GPIO over-current (more than ~4 mA standard drive, e.g. an LED with no resistor) | pin driver saturates; voltage sags | dim external LED; possible pin damage over time |
| 5 V into a pin | Exceeds VDD+0.3 V; current flows through the pin's ESD diode into VREG, raising the rail | Pin and possibly the whole MCU damaged; rail rises above 3.6 V, sensors stressed |
| 3V (VREG) shorted to GND | Both USB and battery reach VREG only through U3 (USB via D51, battery via D59 + D57, then U3), so the NCP114's internal current limit and thermal shutdown take the fault (limit value unverified). An external supply fed into the 3V ring is not limited by anything on the board | Everything goes dark (red LED off, display off), the USB drive drops out, U3 gets warm; removing the short restores operation. The USB host may also report over-current |
| USB 5 V shorted to GND (damaged cable or VBUS pad) | Nothing on the micro:bit limits it; the PC port's own current limit or polyfuse trips | "USB device drew too much power" style warning on the PC; the board is dead until the short is removed |
| Cold solder joint on a croc-clip/edge connection | intermittent contact | flickering readings, `read_analog` jumps, touch triggers randomly |
| Beginner traps | Using P3/P4/P6/P7/P10 while the display is on (they are LED columns); using P5/P11 (buttons); P0 also carries audio so `music` makes noise on a buzzer/headphones at P0; touching P0 without touching GND (resistive touch); expecting the `.hex` to stay on the `MICROBIT` drive; flashing V1 hex files (V1-only hex fails on V2: use universal hex); compass needs calibration (tilt-to-fill game) first | |

## 7. Lesson facts (MicroPython for micro:bit V2, v2.1.2) [13]

Use `from microbit import *` in every program.

### Lesson 1: Blink / display I-O

```python
from microbit import *
while True:
    display.set_pixel(2, 2, 9)   # x, y in 0..4, brightness 0..9
    sleep(500)                   # milliseconds
    display.set_pixel(2, 2, 0)
    sleep(500)
```

Other: `display.show(Image.HEART)`, `display.scroll("Hello")`, `display.clear()`, `Image("09090:99999:99999:09990:00900")`, `display.read_light_level()` (0-255), `display.on()/off()`.

### Lesson 2: Buttons, touch logo, sensor

```python
from microbit import *
while True:
    if button_a.was_pressed():
        display.show(Image.HAPPY)
    elif button_b.is_pressed():
        display.show(Image.SAD)
    elif pin_logo.is_touched():
        display.scroll(temperature())
    x = accelerometer.get_x()     # milli-g, about -2000..2000
    if accelerometer.was_gesture("shake"):
        display.show(Image.SURPRISED)
    sleep(50)
```

Also `button_a.get_presses()`, `accelerometer.get_values()`, `compass.calibrate()`, `compass.heading()` (integer degrees; the MicroPython docs say "in the range from 0 to 360"), `compass.get_field_strength()`. Microphone: `microphone.sound_level()` (0-255), `microphone.current_event()`, `microphone.was_event(SoundEvent.LOUD)`, `SoundEvent.QUIET`, `microphone.set_threshold(SoundEvent.LOUD, 128)`; using the microphone lights D70.

### Lesson 3: PWM / analog

```python
from microbit import *
pin0.set_analog_period(20)          # ms; minimum 1 ms
while True:
    v = pin1.read_analog()          # 0..1023 (P0, P1, P2, P3, P4, P10 only)
    pin0.write_analog(v)            # duty 0..1023
    sleep(20)
```

Digital: `pin8.write_digital(1)`, `pin8.read_digital()`, `pin8.set_pull(pin8.PULL_UP)`. Sound: `import music; music.play(music.NYAN)`, `music.pitch(440, 500)`, `speaker.off()` (silence built-in speaker, sound still on pin0), `speaker.on()`, `audio.play(Sound.GIGGLE)`. Servo on P0: `pin0.set_analog_period(20); pin0.write_analog(51..102)` for 1-2 ms pulses (approx).

### Lesson 4: Radio (protocol lesson)

```python
from microbit import *
import radio
radio.config(group=23)     # 0..255; defaults: channel 7, power 6, length 32, RATE_1MBIT
radio.on()
while True:
    if button_a.was_pressed():
        radio.send("hello")
    msg = radio.receive()       # str or None
    if msg:
        display.scroll(msg)
```

Also `radio.send_bytes()`, `radio.receive_bytes()`, `radio.receive_full()` (message, RSSI, timestamp), `radio.off()`. I2C on P19/P20: `i2c.init(freq=100000)`, `i2c.scan()`, `i2c.read(addr, n)`, `i2c.write(addr, buf)`. On V2, MicroPython's `i2c` object is the external bus: `i2c.init()` defaults to `sda=pin20, scl=pin19`, freq 100000 (`microbit_i2c.c`), and the HAL drives CODAL `uBit.i2c`, which is constructed as `i2c(io.P20, io.P19)` while the sensors sit on the separate `_i2c(io.sda, io.scl)` (CODAL `MicroBit.cpp` lines 74-75) [12][18]. So `i2c.scan()` with nothing attached returns `[]`; it does not list the LSM303AGR (0x19/0x1E) or the interface MCU (0x70/0x72).

Libraries: built in (`microbit`, `music`, `radio`, `speech`, `neopixel`, `audio`, `power`, `log`) in MicroPython v2.1.2 [13][14]. MakeCode equivalents: `basic.showIcon(IconNames.Heart)`, `input.onButtonPressed(Button.A, ...)`, `pins.analogReadPin(AnalogPin.P1)`, `radio.setGroup(23)`, `radio.sendString("hello")`.

## 8. Internals for the see-through view

| Part | Truthful contents |
|---|---|
| nRF52833 (aQFN-73) | one silicon die (Cortex-M4F, 512 KB flash, 128 KB RAM, 2.4 GHz radio on the same die), exposed centre paddle, fine gold/copper bond wires to the pads (aQFN), moulded black epoxy |
| nRF52820 (QFN-40) | single die, Cortex-M4, 256 KB flash on die, bond wires, exposed pad |
| X1/X2 32 MHz crystals | 3.2 x 2.5 mm ceramic package with metal lid; inside a small AT-cut quartz blank on two conductive-epoxy mounts |
| RF | No RF shield can on the micro:bit; the antenna is a copper trace on the PCB edge with an L-C matching network (L3, L7, C11) (no metal can) |
| U3 NCP114 LDO | tiny 1 x 1 mm die: pass PMOS, error amp, bandgap reference, current limit |
| LSM303AGR | two MEMS structures (silicon proof mass with comb electrodes for acceleration; AMR magnetic sensor) plus ASIC die in one LGA package |
| Mic U4 | metal can over a MEMS diaphragm die and an amplifier ASIC; acoustic port through the PCB hole |
| Speaker SP1 | magnetic buzzer: coil, permanent magnet, steel diaphragm in a plastic housing (not a cone speaker) |
| Flash | no external flash chip on V2.21; all program and file storage is on-die flash (nRF52833: 512 KB; interface: on-die) [1][3] |
| USB bridge | the interface nRF52820 itself (native USB) acts as the USB bridge; no FTDI/CH340 |

## 9. Assembly and power-up

- **Assembly**: all components SMT on both sides (two reflow passes); LEDs, buttons A/B and logo on the front; everything else on the back. The edge-ring holes are plated through. Notes on [8]: "follow manufacturer's guidelines for soldering the MEMS microphone and speaker", "follow polarity markings", "board edge flush". The speaker and mic are the heat-sensitive parts (placed with care / last reflow side, unverified order). No through-hole parts, no sockets.
- **Programming in production**: test pads (TP1-TP21) used to load DAPLink into the interface MCU and the OOB program into the nRF52833 (unverified procedure).
- **Power-up on USB**: red D60 lights (full), yellow D61 lights when enumerated by the PC; drive `MICROBIT` mounts; the factory program shows a heart and sound (section 5.5).
- **Power-up on battery**: red D60 lights dimmer (PWM 100/255) [11]; yellow stays off; user program runs.

## 10. Uncertainties

- Assembly drawing [8] revision: designators match V2.21 BOM for most parts but it also shows C33, R10, R44, L4 that are not in the V2.21 BOM (C33 is in the V2.00 BOM). The board outline, rings, buttons, LED grid, USB and main IC regions are the same across V2.x, so geometry is safe; small-part positions may be V2.00/V2.20.
- Back-side part centres: U2, U5, U4, U6, X1, SP1, J2, J3, SW1, D60, D61, D62, D70 are **outline centres** extracted from the vector drawing [8] (+/-0.05 mm in the drawing's own frame). Smaller passives and transistors (R, C, L, T, D1/D5/D51/D57/D59, D71-D74, TP) are still **label** positions (+/-1.5 mm). No official centroid/pick-and-place file was found in the hardware repo.
- D70 position is from the back sheet; how its light shows on the front is not documented in the files. Front silkscreen strings beyond "A", "B" and the ring labels, and back markings other than the USB / BLE ANTENNA / MICROPHONE / RESET / BATTERY block, were not extracted.
- JST connector part: BOM says MTCONN WB200SW-02SR01, tech site says JST S2B-PH-SM4-TB. Both are 2-pin 2.0 mm PH-style; the BOM is the actual fitted part on V2.21.
- Edge-connector current: 190 mA (two statements) vs 270 mA (one sentence in [6]); 190 mA used.
- Radio power level 0: -30 dBm in [1] vs -40 dBm in CODAL code [12]; code trusted.
- (Resolved this run: default PWM period 20 ms from CODAL; console 115200 baud from the MicroPython uart docs, "calling `uart.init(115200)` is enough to restore the Python console"; button pull-ups are 10 k, see 3.7.) Still open: DAPLink flash duration, nRF52 brown-out threshold, LDO current-limit value: standard values, not re-checked against datasheets this run.
- Factory OOB program contents vary by production batch.
- Button A/B pull-up: [1] says 4K7, the edge-connector page [5], the V2.21 schematic and the BOM say 10 k (R4, R5). 10 k is used; the 4K7 line in [1] looks inherited from older text.
- IO current: the "5 mA per pin" in some micro:bit pages is the nRF51 (V1) figure; V2 uses the nRF52833 values (standard drive 1-4 mA at VDD-0.4 V) quoted in [5].
- V2.2x motion sensor: only the LSM303AGR is documented and fitted in the V2.21 BOM; no newer sensor could be found in official sources on 2026-10-24. If a later board batch changes it, the CODAL auto-detect would hide it from users, so the figure should still show an LGA-12 2 x 2 mm part at U6.
- Edge strip x positions in 2.4 are calculated from the 1.27 mm grid anchored on the five measured ring centres; individual narrow-strip pads were not measured.
- NCP114: 1.7-5.5 V operating input, 300 mA, 135 mV typ dropout at 300 mA, current-limit and thermal-shutdown protection confirmed from the onsemi product page (fact-check run). The 6 V absolute maximum and the current-limit value are still (unverified).

## Verification

Adversarial fact-check run on 2026-10-24 (14:08-14:20 CDT). Each claim below was checked against a source opened in this run (raw files from the official repos, not the sheet's citations). The geometry in section 2 that comes only from the assembly drawing [8] (part centres, notches, corner radius) was not re-derived in this run; only the dimensions that the tech site also prints were re-checked.

| # | Claim | Status | Source | Old -> new (corrections only) |
|---|---|---|---|---|
| 1 | Outline 51.60 x 42.00 mm, depth 11.65 mm, button 4.55 mm, speaker 3.00 mm, JST 5.50 mm | confirmed | https://github.com/microbit-foundation/dev-docs/blob/main/hardware/2-2-revision.md ("Dimensions") | |
| 2 | PCB: 2-layer, black mask, white silk, matte ENIG, 42x52 mm, marked `micro:bit PCB V2.21` | confirmed | https://github.com/microbit-foundation/microbit-v2-hardware/blob/main/V2.21/Bill%20of%20Materials%20MicroBit_V2.2.1.csv (line 1) | |
| 3 | Application MCU nRF52833-QIAA-R (U2): Cortex-M4F, 64 MHz, 512 KB flash, 128 KB RAM | confirmed | 2-2-revision.md; V2.21 BOM | |
| 4 | Interface MCU nRF52820-QDAA-R (U5): Cortex-M4 (no F), 64 MHz, 256 KB flash (128 KB NV), 32 KB RAM; limited run used nRF52833-QDAA | confirmed | 2-2-revision.md; V2.21 BOM | |
| 5 | Edge-connector mapping P0-P16, P19, P20 to nRF pins (P0=P0.02 ... P20=P1.00) | confirmed | https://github.com/lancaster-university/codal-microbit-v2/blob/master/model/MicroBitIO.h lines 223-241; edge-connector.mdx V2 table | |
| 6 | Visible strip order and 40-position count (P3, ring 0, P4-P7, ring 1, P8-P12, ring 2, P13-P16, 3V x6, P19, P20, GND x6); back small strips unconnected | confirmed | https://github.com/microbit-foundation/dev-docs/blob/main/hardware/edge-connector.mdx (V2 table, line 17) | |
| 7 | LED matrix ROW1-5 = P0.21, P0.22, P0.15, P0.24, P0.19; COL1-5 = P0.28, P0.11, P0.31, P1.05, P0.30; rows source (anode), columns sink | confirmed | MicroBitIO.h lines 254-263; V2.21 schematic notes "ROW1-5 are usually outputs that source current", "COL1-5 ... sink current" | |
| 8 | Button A = P0.14 (P5), B = P0.23 (P11), active low, external 10 k pull-up (R4, R5); tech-site "4K7" is wrong | confirmed (10 k) | MicroBitIO.h 244-245; edge-connector.mdx (e10Ku); BOM line 34 (R4, R5 = 10K; 4.7K only R1, R2, R55); 2-2-revision.md line 83 says 4K7 | |
| 9 | Logo P1.04 capacitive by default; P0/P1/P2 resistive with 10 M pull-ups R7/R8/R9 | confirmed | MicroBitIO.h 246; MicroPython pin.rst ("default touch mode for the pins on the edge connector is resistive ... logo pin V2 is capacitive"); BOM line 30 | |
| 10 | Speaker P0.00, MIC_IN P0.05, RUN_MIC P0.20 (powers mic and D70 via R16 120 R), sensor INT P0.25, UART TX P0.06 / RX P1.08 | confirmed | MicroBitIO.h 249-280; schematic note "RUN_MIC ... controllable power supply for microphone ... to power D70"; BOM line 36 | |
| 11 | Internal I2C SCL P0.08 / SDA P0.16, external I2C P19 = P0.26 SCL / P20 = P1.00 SDA, separate buses on V2; MicroPython `i2c.init(freq=100000, sda=pin20, scl=pin19)` | confirmed | MicroBitIO.h 266-271; https://github.com/bbcmicrobit/micropython/blob/v2-docs/docs/i2c.rst | |
| 12 | I2C addresses: accel 0x19, mag 0x1E, interface 0x70 and 0x72 | confirmed | https://github.com/microbit-foundation/dev-docs/blob/main/hardware/i2c.mdx line 29 | |
| 13 | Regulator U3 NCP114BMX330TCG, 3.3 V 300 mA; input up to 5.5 V | confirmed (input range was marked unverified; now sourced) | BOM line 51; https://www.onsemi.com/products/power-management/linear-regulators-ldo/ncp114 (1.7-5.5 V, 300 mA) | "(input up to 5.5 V, unverified)" -> "1.7-5.5 V per onsemi product page" |
| 14 | Power path: D51 BAT60J (USB), D59 + D57 BAT60A in series (battery, D57 secondary protection), D1 BAT54T keeps Vout <= Vin+0.3 V | confirmed | V2.21 schematic notes; BOM lines 14, 15, 17 | |
| 15 | Board range 1.7-3.6 V; 300 mA total, 90 mA peripherals, 190 mA to the edge connector (270 mA in one sentence of [6]) | confirmed | 2-2-revision.md lines 191-194; https://github.com/microbit-foundation/dev-docs/blob/main/hardware/power-supply.md lines 22, 52-62, 77 | |
| 16 | IO limits: VIL 0.3 VDD, VIH 0.7 VDD, VIO max VDD+0.3 V, standard drive 1-4 mA at VDD-0.4 V, high drive 6-14 mA source / 6-15 mA sink | confirmed | edge-connector.mdx lines 228-246 | |
| 17 | Battery pads: upper = GND, lower = 3V, on the far right of the back | confirmed | power-supply.md lines 94-98 | |
| 18 | LEDs: matrix and D60 are red 0603 19-217/R6C; D61 yellow 590 nm; D70 red side-view; R38/R39 220 R; D60 "left of the USB connector" seen from the back | confirmed | BOM lines 23-25, 38; power-supply.md line 85 | |
| 19 | Reset button: release after >= 80 x 30 ms = 2.4 s requests power-off, fade at 120 x 30 ms = 3.6 s; power LED 255 on USB, 100 on battery | confirmed | https://github.com/ARMmbed/DAPLink/blob/main/source/board/microbitv2/microbitv2.h lines 28-37; microbitv2.c lines 170-200 | |
| 20 | Radio: 8 power levels, CODAL table 0xD8...0x04 (-40...+4 dBm); docs say level 0 = -30 dBm | confirmed | https://github.com/lancaster-university/codal-microbit-v2/blob/master/source/MicroBitRadio.cpp line 35; 2-2-revision.md line 67 | |
| 21 | Radio payload "32 bytes default (up to 255)" | corrected | https://github.com/bbcmicrobit/micropython/blob/v2-docs/docs/radio.rst ("up to 251 bytes"); https://github.com/lancaster-university/codal-microbit-v2/blob/master/inc/MicroBitRadio.h ("cannot be larger than 250 bytes") | "up to 255" -> "MicroPython up to 251 bytes; CODAL max 250" |
| 22 | MicroPython radio defaults: channel 7, power 6, length 32, queue 3, group 0, RATE_1MBIT (V2 has RATE_1MBIT / RATE_2MBIT only) | confirmed | radio.rst lines 31-92; MicroBitRadio.h lines 72-74 | |
| 23 | `set_analog_period()` min 1 ms, `set_analog_period_microseconds()` min 256 us; `read_analog()` 0-1023; 6 analog pins; up to 3 PWM channels; 10-bit ADC | confirmed | pin.rst lines 173-195; 2-2-revision.md lines 174-179 | |
| 24 | `display.read_light_level()` 0-255, `microphone.sound_level()` 0-255, `set_threshold` 0-255, `current_event()` exists; `speaker.off()` leaves pin output on | confirmed | display.rst, microphone.rst, speaker.rst (v2-docs) | |
| 25 | `compass.heading()` range "0-359" | corrected | https://github.com/bbcmicrobit/micropython/blob/v2-docs/docs/compass.rst ("in the range from 0 to 360") | "0-359" -> "0 to 360 per the docs" |
| 26 | J3 "Micro-USB B socket" | corrected (wording) | BOM line 50 ("Micro USB Type AB SMT RA", MCR-B-S-RA-SMT-CS5-T/R); 2-2-revision.md ("USB micro") | "Micro-USB B socket" -> "Micro-USB socket" with the BOM wording |
| 27 | DAPLink per revision: V2.00 0255, V2.20 0256, V2.21 0257; 0258-beta3; drives `MICROBIT` / `MAINTENANCE`; `DETAILS.TXT`, `MY_DATA.HTM`, `FAIL.TXT`, `ASSERT.TXT` | confirmed | https://github.com/microbit-foundation/dev-docs/blob/main/firmware/daplink-interface.md lines 61-129 | |
| 28 | Speaker MLT-8530 80 dB @ 5 V 10 cm, 2700 Hz; mic SPU0410LR5H-QB-7 -38 dB +/-3 dB, SNR 63 dB; battery connector JST S2B-PH-SM4-TB (tech site) vs WB200SW-02SR01 (BOM) | confirmed | 2-2-revision.md lines 140-193; BOM lines 12, 28, 45 | |
| 29 | MicroPython v2.1.2 (2023-10-30) is the latest release; CODAL latest tag v0.3.5 | confirmed | https://api.github.com/repos/microbit-foundation/micropython-microbit-v2/releases; https://api.github.com/repos/lancaster-university/codal-microbit-v2/tags | |
| 30 | NCP114 abs max ~6 V and current-limit value; U3 package XDFN-4 | unverified | onsemi datasheet PDF could not be fetched this run | |
| 31 | `microphone` LOUD / QUIET defaults: LOUD at 85 dB and QUIET at 65 dB, about 196 and 118 on the 0-255 scale (35 dB = 0, 100 dB = 255); LOUD fires rising through its threshold, QUIET falling through its own; `was_event()` and `get_events()` clear the history, `is_event()` doesn't; `set_threshold()` clamps to 0-255 and keeps LOUD above QUIET | computed from source, not measured | https://microbit-micropython.readthedocs.io/en/v2-docs/microphone.html; codal-microbit-v2 `MicroBitAudio.cpp` (`LevelDetectorSPL(..., 85.0, 65.0, ...)`); codal-core `LevelDetectorSPL.h` (8-bit scale) | used by `src/lib/interp/python/microbit.ts` (sweep item 16, 2026-10-25) |

Not re-checked in this run, so treat as the researcher's values: all assembly-drawing coordinates in 2.2-2.4 (LED grid, ring centres beyond the tech-site dimensions, notches, corner radius, back-part centres), the mic bias network (33K:1K), the OOB program contents and the HEX transfer duration.
