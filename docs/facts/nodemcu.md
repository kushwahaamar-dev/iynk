# NodeMCU DevKit v1.0 (ESP-12E / ESP8266EX): fact sheet

## 0. Header

**Product modelled:** NodeMCU DevKit **v1.0**, the board sold as "NodeMCU Amica" (often called "V2"). Designed by the NodeMCU Team (Vowstar / Espressif community), open-source hardware, Altium design files in `github.com/nodemcu/nodemcu-devkit-v1.0` [1]. The PCB file used here is `NODEMCU_DEVKIT_V1.0_OFFSET.PcbDoc`, saved 2015-02-09 from the folder `nodemcu-amica` [1]. The silkscreen date code on the design is **14/02/2015**. Bill of materials dated 2015-05-14 [2].

- MCU module: **Ai-Thinker ESP-12E** (ESP8266EX, 4 MB SPI flash, PCB antenna) [2][5]
- USB-UART: **Silicon Labs CP2102** (QFN-28) [2][7]
- 3.3 V regulator: the design specifies **ON Semi NCP1117ST33T3G** (SOT-223) [2][8]. Commercial Amica boards and clones fit the pin-compatible **AMS1117-3.3**.
- Second variant documented here: **LoLin "NodeMCU V3"** (wider board, **CH340G** USB-UART). It is a clone by WeMos/LoLin, not an official NodeMCU-team revision (see section 2b).

**What it is.** A breadboard-friendly carrier for the ESP8266 Wi-Fi SoC. The ESP-12E module (a 16 x 24 mm metal-shielded module with a meandered PCB antenna) sits at the top of a 25.4 x 48.26 mm PCB. Below it are the 3.3 V LDO, a USB-to-UART bridge with a two-transistor "auto program" circuit, two tactile buttons (RST and FLASH) and a Micro-USB socket at the bottom edge. Two 15-pin 2.54 mm headers on the long edges expose 11 usable GPIOs (D0-D8, RX, TX), the A0 analog input through a 220 k / 100 k divider, the six SPI-flash pins (SD0-SD3, CMD, CLK, do not use), EN, RST, 3V3, GND and VIN. The silkscreen names Arduino-style pins **D0-D8** that do **not** match the GPIO numbers (D4 = GPIO2, etc.), which is the single most common beginner confusion.

**Recommendation for SimLab: model the Amica v1.0 (CP2102, narrow).** It is the official design, its exact geometry is extractable from the published Altium files (every part position, pad and hole below is extracted from the PcbDoc; the only estimates are the ESP-12E body outline and the USB overhang, and they are marked), it fits a standard breadboard leaving one free row on each side, and it has two user LEDs (GPIO2 on the module, GPIO16 on the board). The LoLin V3 is documented in 2b for a variant toggle, but its coordinates are estimated because no official design files exist.

## 1. Sources

1. NodeMCU DevKit v1.0 Altium project, github.com/nodemcu/nodemcu-devkit-v1.0 (files `NODEMCU_DEVKIT_V1.0.PcbDoc`, `NODEMCU_DEVKIT_V1.0_OFFSET.PcbDoc`, `*.SchDoc`, Gerber V1-V4). Board outline, every component origin/rotation/footprint/height, every pad position and net, mounting holes, silkscreen (rendered from Gerber V4). Parsed with a custom OLE/Altium binary reader (scripts in the scratchpad `facts-tools/nodemcu/`: `ole.py`, `altium_bin.py`, `comp_table.py`, `netlist.py`, `outline.py`, `gerber_render.py`).
2. `NODEMCU_DEVKIT_V1.0.PDF` in the same repo: 9-page schematic + BOM (sheets ESP-12 CORE, USB TO UART, POWER, IO CONN, KEY, ADC). All component values, regulator notes, boot-strap notes.
3. `Documents/NODEMCU-DEVKIT-V1.0-INSTRUCTION-EN.pdf` (2015-01-28) in the same repo: official pin-definition table (D-names, GPIO, alternate functions).
4. Espressif, *ESP8266EX Datasheet* v7.1 (0a-esp8266ex_datasheet_en.pdf), espressif.com: core, clocks, I/O electrical table (VIH/VIL/IMAX), ADC (TOUT 0-1.0 V), current consumption, 74880 baud boot log.
5. Ai-Thinker, *ESP-12E WiFi Module* datasheet v1 (and ESP-12F spec): module 16 x 24 x 3 mm, 4 MB SPI flash in SOP-8 208 mil, PCB antenna, pinout.
6. Espressif, *ESP8266 Reset Causes and Common Fatal Exception Causes*: rst cause numbers.
7. Silicon Labs, *CP2102/9 datasheet* rev 1.x: QFN-28 5 x 5 mm, 300 bps-1 Mbps, VBUS/IO 5.8 V max, internal regulator.
8. ON Semiconductor, *NCP1117 datasheet*: 1.0 A, 1.2 V max dropout at 800 mA, Vin max 20 V, current limit + thermal shutdown, RthJA 160 C/W minimum pad.
9. E-Switch / C&K *PTS820* tactile switch datasheet: 4.2 x 3.2 mm SMT, J-lead, top actuated. TS-015 (similar 2.0 mm height part).
10. SS14 Schottky datasheet (1 A, 40 V; Vf about 0.5 V at 1 A).
11. esp8266/Arduino core **3.1.2** source (github.com/esp8266/Arduino, release 2023-03-20, still the latest release in October 2026 per the GitHub releases API): `variants/nodemcu/pins_arduino.h`, `boards.txt` (`nodemcuv2`), `core_esp8266_wiring_pwm.cpp`, `doc/boards.rst` (boot-mode tables), `ESP8266WiFi`, `ESP8266WebServer`, examples Blink and HelloServer.
12. esptool.py as pinned by core 3.1.2 (commit 4fa0bd7, `__version__ = "3.0"`): exact console strings. Standalone esptool latest is **v5.6.0** (2026-10-15, GitHub releases API).
13. MicroPython docs `esp8266/quickref`, `tutorial/intro`, `tutorial/adc`, `tutorial/pwm`, `tutorial/network_basics`; MicroPython latest release **v1.29.0** (2026-08-24, GitHub releases API); firmware page `ESP8266_GENERIC`.
14. WCH *CH340 datasheet* (CH340G SOP-16, needs external 12 MHz crystal) and SparkFun copy.
15. wemos.cc archived 2015 LoLin pages (`wemos_lolin_2015`, `wemos_pin_2015`): LoLin boot-pin notes, "Vin Max 5V!!!" warning.
16. mischianti.org "NodeMCU V3 CH340" pinout image (https://mischianti.org, NodeMCU v3 pinout page): LoLin V3 top-view photo, header labels, VU = "VOUT USB", built-in LED on GPIO2, part placement.
17. zbotic.in "NodeMCU V3 vs V2" (https://zbotic.in/nodemcu-v3-vs-v2-differences-and-which-one-to-buy-in-india/): V3 30.5 x 58.5 mm, CH340G vs CP2102.
18. buyzero.de NodeMCU v3 CH340G listing (https://buyzero.de/products/copy-of-esp32-cam-development-board-inkl-ov2640-kameramodul): 60 x 31 x 13 mm (approximate).
19. Advanced Monolithic Systems, *AMS1117 datasheet* (advanced-monolithic.com/pdf/ds1117.pdf): 15 V abs max input, dropout 1.1/1.3 V at 0.8 A, current limit 0.9/1.1/1.5 A, SOT-223 90 C/W.

## 2. Geometry (board frame) - Amica v1.0, extracted from the PcbDoc [1]

**Frame.** Component side (ESP-12E, regulator, CP2102, buttons) up. Usual reading orientation = antenna end at the top, **Micro-USB connector on the bottom edge**. Origin = bottom-left corner of the outline, +x right, +y up, mm. The Altium file's own origin was translated by (-2579.96 mil, -2073.33 mil) so the outline's lower-left corner is (0, 0); all values were then converted at 0.0254 mm/mil. This puts header J1 (A0 ... VIN) on the **left** and J2 (D0 ... 3V3) on the **right**, which matches the top silkscreen rendered from Gerber V4.

### Outline, holes, colours

| Item | Value | How obtained |
|---|---|---|
| Outline | **25.40 x 48.26 mm** (1000 x 1900 mil) rectangle | Board6 outline vertices [1] |
| Corner radius | **2.286 mm** (90 mil), all four corners | outline arcs [1] |
| Thickness | 1.6 mm (unverified; not stored in the file, standard FR-4) | - |
| Mounting holes | 4 x **dia 2.92 mm**, non-plated, centres (2.29, 2.29), (23.11, 2.29), (2.29, 45.97), (23.11, 45.97) | free pads [1] |
| Hole spacing | 20.82 x 43.68 mm centre-to-centre | computed |
| Layers | 2 copper layers (top/bottom Gerbers only) [1] | Gerber V4 |
| Solder mask | Design file does not set colour. Production Amica boards: **black** mask (most common), also blue seen on some batches (unverified per batch) | photos, unverified |
| Silkscreen | **white** | photos |
| Finish | HASL/ENIG varies (unverified) | - |

### Components (all from the PcbDoc; centre = footprint origin; H = 3D body height stored in the footprint)

Rotation is Altium's, counter-clockwise, in the board frame. "Pads box" is the bounding box of the copper pads, a good proxy for the footprint size.

| Ref | Part (BOM [2]) | Package | Side | Centre x, y | Rot | Pads box w x h | H mm | Colour / marking |
|---|---|---|---|---|---|---|---|---|
| U1 | ESP-12E module, Ai-Thinker | castellated module 16 x 24 | top | pad-array centre (12.70, 32.29); body approx x 4.70-20.70, y 24.0-48.0 (estimated from pad rows + 16 x 24 mm size [5]) | 0 | 16.20 x 16.15 (pads only) | 3.20 | tin-plated steel shield can, laser-etched (see marking table); blue PCB of module with antenna meander exposed above the can |
| U2 | CP2102 USB-UART | QFN-28 5 x 5 mm | top | (13.89, 9.68) | 270 | 6.00 x 6.00 | 1.00 | black, "SILABS CP2102 + date/lot" (marking unverified) |
| U3 | Micro-USB B receptacle (5S, 5 pins + 4 shell tabs) | SMT + THT shell | top | origin (12.70, 4.57); pads box centre (12.70, 3.12) | 180 | 8.76 x 4.28 | 3.00 | nickel shell; opening faces **-y** (bottom edge) |
| U4 | NCP1117ST33T3G (design) / AMS1117-3.3 (production) | SOT-223 | top | (14.00, 19.91) | 180 | 7.80 x 5.50 | 1.80 | black, "AMS1117 3.3" on clones; tab (VOUT) toward +x |
| S1 | Tactile switch **RST** (BOM "KEY_RST/USER") | PTS820 4.2 x 3.2 SMT | top | (6.48, 3.05) | 270 | 1.80 x 5.29 | 2.00 | silver frame, black or brown actuator (unverified colour) |
| S2 | Tactile switch **FLASH** (BOM "KEY_FLASH") | PTS820 | top | (18.92, 3.05) | 270 | 1.80 x 5.29 | 2.00 | as S1 |
| LED1 | **Blue** LED, GPIO16 | 0603 | top | (8.61, 12.01) | 180 | 2.60 x 1.00 | 0.85 | water-clear/blue |
| D1 | Schottky 1N5819/SS14/S4, USB 5 V to VIN | SOD-323 | top | (4.90, 9.78) | 270 | 0.83 x 2.86 | 1.15 | black, cathode band toward -y (pad 2, VDD5V at y 8.66) |
| C2 | 100 uF 6.3 V tantalum TAJB107M006RNJ, 3V3 bulk | case B 3.5 x 2.8 | top | (5.36, 19.91) | 270 | 2.20 x 5.00 | 2.10 | yellow body, brown/black "+" band at the 3V3 (top, +y) end |
| C7 | 10 uF 25 V, 5 V input | 0805 | top | (8.46, 18.34) | 90 | 1.27 x 3.15 | 1.78 (footprint value; real 0805 MLCC about 1.25) | tan MLCC |
| C1 | 100 nF, RST filter | 0402 | top | (3.66, 41.68) | 90 | 0.51 x 1.52 | 0.30 | tan |
| C3 | 10 uF, CP2102 VDD | 0402 | top | (14.36, 14.62) | 90 | | 0.30 | tan |
| C4 | 100 nF, CP2102 VDD | 0402 | top | (12.70, 14.62) | 90 | | 0.30 | tan |
| C5 | 10 uF, VBUS | 0402 | top | (9.42, 9.30) | 270 | | 0.30 | tan |
| C6 | 100 nF, VBUS | 0402 | top | (7.78, 9.30) | 270 | | 0.30 | tan |
| C8 | 10 uF, 3V3 at LDO | 0402 | top | (8.46, 22.21) | 0 | 1.52 x 0.51 | 0.30 | tan |
| R1 | 12 k, GPIO0 pull-up | 0402 | top | (21.74, 33.10) | 270 | | 0.30 | black |
| R2 | 12 k, GPIO2 pull-up | 0402 | top | (21.74, 30.21) | 90 | | 0.30 | black |
| R5 | 12 k, GPIO15 pull-down | 0402 | top | (21.74, 27.33) | 90 | | 0.30 | black |
| R13 | **220 k 1 %**, A0 divider top | 0402 | top | (3.66, 38.79) | 90 | | 0.30 | black |
| R14 | **100 k 1 %**, A0 divider bottom | 0402 | top | (3.66, 35.92) | 90 | | 0.30 | black |
| R3 | 12 k, EN pull-up | 0402 | top | (4.42, 14.61) | 270 | | 0.30 | black |
| R4 | 12 k, RST pull-up | 0402 | top | (6.08, 14.61) | 270 | | 0.30 | black |
| R11 | 470, RST button series | 0402 | top | (7.73, 14.61) | 270 | | 0.30 | black |
| R10 | 0 ohm **not fitted** (GPIO16 to RST node for deep-sleep wake; the instruction PDF [3] calls this position "R3", but the BOM and schematic say R10) | 0402 | top | (9.39, 14.61) | 270 | | 0.30 | empty pads |
| R9 | 470, LED1 series | 0402 | top | (11.04, 14.61) | 90 | | 0.30 | black |
| R6 | 470, CP2102 TXD to ESP RXD0 | 0402 | top | (16.01, 14.61) | 90 | | 0.30 | black |
| R8 | 12 k, VT2 base (from RTS) | 0402 | top | (17.67, 14.61) | 270 | | 0.30 | black |
| R12 | 470, FLASH button series | 0402 | top | (19.32, 14.61) | 90 | | 0.30 | black |
| R7 | 12 k, VT1 base (from DTR) | 0402 | top | (20.98, 14.61) | 90 | | 0.30 | black |
| VT1 | S8050 NPN, drives RST | SOT-23 | top | (20.03, 10.90) | 180 | 2.85 x 3.25 | 1.10 | black, "J3Y" (S8050 SOT-23 code, unverified) |
| VT2 | S8050 NPN, drives GPIO0 | SOT-23 | top | (20.03, 18.24) | 0 | 2.85 x 3.25 | 1.10 | black, "J3Y" (unverified) |
| J1 | 1x15 male header, left | 2.54 mm THT | pins down (body on bottom) | pin 1 (1.27, 41.91), pin 15 (1.27, 6.35) | - | 1.75 x 37.31 | 11.43 total (plastic 2.54 + pin) | black plastic, gold/tin pins |
| J2 | 1x15 male header, right | 2.54 mm THT | pins down | pin 1 (24.13, 41.91), pin 15 (24.13, 6.35) | - | | 11.43 | as J1 |
| Logo1 | NodeMCU logo + OSHW gear | silkscreen | bottom | (12.70, 45.11) | 180 | - | 0 | white |

Note the row of 11 0402 resistors/caps at y = 14.6 between x = 4.4 and 21.0 is visible as a neat horizontal line of tiny parts on the real board.

### Headers

- Pitch **2.54 mm**, 15 pins each, pads 1.75 mm round (pin 10 and 14 of J1, 7 and 14 of J2 are **square**: the GND pins), drill 0.89 mm.
- Row spacing J1 to J2 = **22.86 mm** (0.9"), so on a standard 830-point breadboard straddling the centre channel it leaves **one free hole per row on each side** (computed from [1]).
- Pin 1 of both headers is at the **top** (y = 41.91, the antenna end); pins step down by 2.54 mm to pin 15 at y = 6.35. (Four pads deviate by about 0.1-0.3 mm in the file: J1-7 at y 26.80, J1-10 at 18.92, J2-4 at 34.42, J2-7 at 26.54; treat as 2.54 grid.)
- Headers point **down** (pins inserted from the top, plastic spacer under the board, pins out of the bottom) on factory boards, for breadboard use. No overhang beyond the outline: pad centres 1.27 mm from the long edges.
- Micro-USB: receptacle shell edge flush with / slightly overhanging the bottom edge (y = 0); the pads box reaches y = 0.98 and the shell tabs are at y 1.93. Overhang about 0.5-1 mm (estimated from footprint).

### Silkscreen (top, from Gerber V4 render)

- Left column, beside J1, reading top to bottom, text rotated 90 deg: **A0, RSV, RSV, SD3, SD2, SD1, CMD, SD0, CLK, GND, 3V3, EN, RST, GND, Vin**
- Right column beside J2, top to bottom: **D0, D1, D2, D3, D4, 3V3, GND, D5, D6, D7, D8, RX, TX, GND, 3V3**
- Centre, inside the ESP-12E outline at about y 30-34 mm, so it is **hidden under the module** on an assembled board: white-on-black box **"NODEMCU"**, then **"DEVKIT"**, then inverted box **"14/02/2015"**, then small **"6buE6ZSQ"** (production boards replace part of this; Amica boards commonly print "NodeMCU" logo and "Amica" (unverified per batch)).
- Triangle pin-1 marker at the ESP-12E pad 1 (top-left of the module).
- **RST** above S1 (left of USB), **FLASH** above S2 (right of USB).
- OSHW gear icon to the right of the regulator at about (20.1, 22.3) (estimated from the Gerber V4 render).

### Silkscreen (bottom, Gerber V4)

Viewed from the bottom (so mirrored left-right relative to the top): left column "GPIO16, GPIO5, GPIO4, GPIO0, GPIO2, 3.3V, GND, GPIO14 [HSCLK], GPIO12 [HMISO], GPIO13 [HMOSI], GPIO15 [HCS], GPIO3, GPIO1, GND, 3.3V"; right column "ADC, NC, NC, GPIO10, GPIO9, MOSI, CS, MISO, SCLK, GND, 3.3V, EN, RST, GND, Vin"; OSHW gear "open source hardware"; "NODEMCU" logo and "WWW.NODEMCU.COM"; box "**Vin:5-12V DC / 3V3:OUT@500mA**".

Notes: the bottom silk's MOSI (= SD1, flash DI), CS (= CMD, flash /CS), MISO (= SD0) and SCLK (= CLK) are the correct flash-bus roles; the schematic symbol's net names (SPI_MOSI on SD_CMD, SPI_INT on SD_D1) are the NodeMCU team's odd labels, so ignore them. The bottom silk prints **NC** for J1-2, but the copper connects J1-2 to TOUT (net ADC) [1]; the silk is wrong there. Keep all silkscreen text verbatim on a figure.

### ESP-12E shield-can marking

As read on a LoLin V3 photo [16] (same Ai-Thinker module): "MODEL ESP8266MOD" / "VENDOR AI-THINKER" / "ISM 2.4GHz" / "PA +25dBm" / "802.11b/g/n", a Wi-Fi logo and the FCC mark, text running along the long axis. Exact layout can differ per batch. ESP-12E module PCB is usually **blue** (Ai-Thinker) or black; antenna meander is copper under solder mask at the top 6-7 mm of the module, outside the can.

## 2b. LoLin "NodeMCU V3" (CH340G, wide), estimated geometry

No official design files exist for the LoLin V3. Positions below are **estimated from the mischianti.org top-view pinout photo [16]** by scaling to the 2.54 mm header pitch (14 pitches between A0 and VIN = 493 px, so 35.2 px per 2.54 mm), cross-checked against retailer sizes [17][18].

| Item | Amica v1.0 (official) | LoLin V3 (clone) |
|---|---|---|
| Size | 25.40 x 48.26 mm (extracted) | about **31 x 58 mm** (photo scale gives 30.3 x 57.0; retailers give 30.5 x 58.5 [17], 31 x 60 [18] and 58 x 31 x 13 mm; a Fritzing-forum measurement of a real board gives 31 x 58 mm) |
| Header row spacing | 22.86 mm (0.9") | **27.94 mm** (1.1", 11 pitches, estimated from photo [16]): covers the whole width of a standard breadboard, leaving no free row (use two breadboards side by side) |
| Mounting holes | 4 x 2.92 mm | 4 corner holes (positions/diameter unverified) |
| USB-UART | CP2102 QFN-28, internal oscillator | **CH340G** SOP-16 below the regulator near the USB, + **12.000 MHz** crystal (silver SMD can marked "12.000") [14][16] |
| Regulator | NCP1117 (BOM) / AMS1117-3.3 | **AMS1117-3.3** SOT-223 (marking "AMS1117 3.3" visible in photo [16]) between the two header rows, right of centre |
| Mask / silk | black (usually) | **black** mask, white silk; "Ver 0.1" printed at the top right beside the antenna; LoLin logo/"NodeMcu V3" on the back (unverified) |
| Left header labels, top to bottom | A0, RSV, RSV, SD3, SD2, SD1, CMD, SD0, CLK, GND, 3V3, EN, RST, GND, Vin | **A0, G, VU, S3, S2, S1, SC, S0, SK, G, 3V, EN, RST, G, VIN** [16] |
| Right header labels | D0, D1, D2, D3, D4, 3V3, GND, D5, D6, D7, D8, RX, TX, GND, 3V3 | **D0, D1, D2, D3, D4, 3V, G, D5, D6, D7, D8, RX, TX, G, 3V** [16] |
| VU | not present | pin 3 of the left header: **USB 5 V (VBUS) before the diode** ("VOUT USB" [16]) |
| LEDs | GPIO2 (module, blue) + GPIO16 (board, blue, LED1) | only the **GPIO2 module LED** is documented ("BUILTIN LED" on D4 [16]); no GPIO16 LED shown (a second board LED on some batches is unverified) |
| Buttons | RST (left of USB), FLASH (right) | **RST** left of USB, **FLASH** right, labels printed vertically beside the buttons [16] |
| Bulk caps | 1 tantalum (C2, 100 uF) | 2 yellow tantalum caps left of the regulator [16] |
| Vin note | bottom silk "Vin:5-12V DC" | wemos.cc 2015: "**LoLin's input supply power (Vin), Max 5V!!!**" [15] |
| A0 divider | 220 k / 100 k (extracted) | assumed the same 0-3.2 V divider (unverified; no schematic) |

The two boards share the D-pin to GPIO map, the auto-reset transistor pair (unverified for LoLin) and the ESP-12E module (shield marking visible in [16]: "MODEL ESP8266MOD / VENDOR AI-THINKER / ISM 2.4GHz / PA +25dBm / 802.11b/g/n", Wi-Fi logo and FCC mark).

Recommendation: model the **Amica**. Offer the LoLin as a variant only with these estimated positions flagged.

## 3. Electrical

### SoC (inside ESP-12E) [4][5]

| Item | Value |
|---|---|
| SoC | Espressif **ESP8266EX**, QFN-32 5 x 5 mm |
| Core | Tensilica **L106** 32-bit RISC (Xtensa Diamond Standard 106Micro), **80 MHz** default, **160 MHz** max |
| Clock source | **26 MHz** crystal on the ESP-12E (datasheet allows 24-52 MHz); ROM boot log baud = 26/40 x 115200 = **74880** |
| RAM | with the Wi-Fi stack running in station mode, **heap + data about 50 kB** available to the user [4]. Total on-chip SRAM about 160 kB and 64 kB boot ROM are commonly quoted figures (unverified; not stated in the datasheet text checked). No programmable on-chip flash: the program lives in the external SPI flash [4]. |
| Flash | External SPI flash on the module, **4 MB (32 Mbit)**, SOP-8 208 mil [5]; Arduino board config uses **DIO** mode [11] |
| Supply | 2.5-3.6 V, 3.3 V nominal [4] |
| Wi-Fi | 802.11 b/g/n 2.4 GHz only; TX power 802.11b **+20 dBm** [4] |
| Current [4] | TX 802.11b 11 Mbps +17 dBm **170 mA**; TX 11g 54 Mbps 140 mA; TX 11n MCS7 120 mA; RX 50-56 mA; modem-sleep 15 mA; light-sleep 0.9 mA; **deep-sleep 20 uA**; shut down 0.5 uA (chip only; the board's LDO, CP2102 and LED1 add milliamps, so a NodeMCU never reaches 20 uA) |

### Power tree (schematic sheet POWER [2], nets from PCB [1])

```
USB VBUS (VDDUSB) --D1 SS14 Schottky--> VDD5V == "Vin" pin (J1-15) --> U4 1117-3.3 --> VDD3V3 == "3V3" pins (J1-11, J2-6, J2-15)
                 \--> CP2102 VBUS pin 8 (sense only)
```

| Rail | Source | Notes |
|---|---|---|
| VDDUSB | Micro-USB VBUS | C5 10 uF + C6 100 nF. **No polyfuse, no ESD array** on the board. Not brought out on Amica (LoLin brings it out as **VU**). |
| D1 | **SS14 / 1N5819 / S4** Schottky, SOD-323 | Blocks current from Vin back into the USB host; drops about 0.3-0.45 V, so Vin pin reads about **4.6-4.7 V** when USB-powered. |
| VDD5V ("Vin") | D1 cathode, or external supply on the Vin pin | C7 10 uF 25 V. Schematic note: "Max Supply Voltage: 20V" (NCP1117 abs max) [2]; bottom silk: **"Vin:5-12V DC"**. The official instruction PDF [3], note 8, says (in Chinese) not to feed the board a supply above 5 V and not to connect GPIOs to 5 V peripherals without level shifting, which contradicts the silk. SimLab should teach **5 V on Vin**. Electrically: 5-9 V works; at 12 V the LDO dissipates (12-3.3) x 0.25 A = 2.2 W, too hot for a SOT-223 with this copper (RthJA ~160 C/W minimum pad [8]) and it will reach thermal shutdown. Minimum Vin about **4.5 V** (3.3 V + 1.2 V dropout at 800 mA [8]). |
| VDD3V3 | U4 output | C8 10 uF + C2 100 uF tantalum. Schematic: "Working Output: 3.3V 800mA, Working Current Limit: 1000mA, Voltage Dropout: 1.2V@800mA" [2]. Bottom silk "3V3:OUT@500mA" is the conservative user budget (ESP + CP2102 take ~100-250 mA). |
| AMS1117-3.3 (production part) | | 1 A class; dropout **1.1 V typ / 1.3 V max at 0.8 A**; abs max Vin **15 V**; current limit **0.9 min / 1.1 typ / 1.5 max A**; thermal protection; SOT-223 RthJA 90 C/W; minimum load 5 mA typ / 10 mA max [19]. Minimum Vin for 3.3 V at 0.8 A is therefore 4.6 V, and from USB (about 4.7 V after D1) the rail can sag slightly under heavy Wi-Fi bursts. |
| CP2102 | VDD (pin 6) and REGIN (pin 7) both tied to **VDD3V3** [1] | The CP2102's internal regulator is bypassed; the bridge runs from the board 3.3 V. VBUS (pin 8) only senses USB presence. |

**Power-path:** USB and Vin are OR-ed only by D1. If both USB and an external >5 V supply on Vin are present, D1 is reverse-biased and the external supply powers the board; nothing back-feeds the PC. Feeding 5 V into a **3V3** pin bypasses the regulator (fine at 3.3 V, destructive at 5 V).

### Logic levels [4]

- 3.3 V CMOS. VIL max 0.25 x VIO, VIH min 0.75 x VIO (about 2.5 V at 3.3 V), VOL max 0.1 x VIO, VOH min 0.8 x VIO.
- **Not officially 5 V tolerant.** The datasheet table gives VIH max **3.6 V**. (An Espressif CEO comment in 2016 that inputs survive 5 V is often quoted; it is not in any datasheet, so SimLab must teach "3.3 V only".)
- Max drive per pin: **IMAX = 12 mA** [4]. No total-package figure is published; keep the sum low.
- GPIO6-11 are the SPI flash bus (SD0-SD3, CMD, CLK on J1): never use. In DIO mode GPIO10 (SD3, flash /WP) can sometimes be used as GPIO, but GPIO9 (SD2) is the flash /HOLD pin on the ESP-12E and driving it low freezes the flash and crashes the chip. Teach: **do not use the SD/CMD/CLK pins**.

### ADC (A0) [2][4]

- ESP8266EX has **one 10-bit SAR ADC** on TOUT (pin 6), input range **0-1.0 V**.
- The board adds a divider: **R13 220 k (1 %)** from the **A0** pin (net ADC_EX, J1-1) to TOUT (net ADC), and **R14 100 k (1 %)** from TOUT to GND. Ratio 100/320 = 0.3125, so **A0 = 3.2 V gives 1.0 V at TOUT** = reading 1023. Range on the A0 header pin: **0-3.2 V**.
- Source impedance seen by the ADC is about 69 k (220 k || 100 k); fine for slow signals.
- **J1-2 ("RSV") is wired directly to TOUT (net ADC)** on the v1.0 PCB [1]: it bypasses the divider (0-1.0 V only). J1-3 RSV is unconnected. Teach: use A0, never RSV.
- In the Arduino core `analogRead(A0)` returns 0-1023. `ESP.getVcc()` (needs `ADC_MODE(ADC_VCC)`) measures the 3.3 V rail instead and then A0 is unusable.

### PWM [11]

- **Software PWM** (timer-driven waveform generator) on **any GPIO 0-16, including GPIO16/D0** in core 3.x (`doc/reference.rst`: "may be used on pins 0 to 16"; `core_esp8266_waveform_pwm.cpp` drives GP16O), except the flash pins 6-11. The NodeMCU instruction PDF [3] says GPIO16 has "no pwm"; that applies to the NodeMCU Lua firmware, and MicroPython also excludes Pin(16). Core 3.x defaults: `analogWriteRange` **255** (changed from 1023 in 2.x, "breaking change from 2.x.x" comment in `wiring_pwm.cpp`), `analogWriteFreq` default **1000 Hz**, clamped to **100-60000 Hz**.
- MicroPython: `machine.PWM(pin, freq=..., duty=0..1023)` or `duty_u16`; frequency **1-1000 Hz** (shared by all channels), duty 0-1023, all pins except Pin(16) [13].
- No DAC. I2S output exists on GPIO3/15/2 (advanced, not for lessons).

### USB-serial (U2 CP2102) [2][7]

- QFN-28 5 x 5 mm, internal 48 MHz oscillator, no crystal. 300 bps to 1 Mbps. Driver: Silicon Labs CP210x VCP (built into macOS 10.15+ / Windows 10+ via Windows Update / Linux `cp210x`). Appears as `/dev/cu.SLAB_USBtoUART` (old driver) or `/dev/cu.usbserial-0001` (macOS DriverKit), `COMx`, `/dev/ttyUSB0`. USB VID:PID **10C4:EA60**.
- Wiring: CP2102 pin 25 RXD = ESP **TXD0** (GPIO1); CP2102 pin 26 TXD -> **R6 470 ohm** -> ESP **RXD0** (GPIO3). The 470 ohm lets an external adapter on the RX header pin override the CP2102.
- Pins 1 (DCD), 2 (RI), 23 (CTS), 27 (DSR), 11 (SUSPEND, net ACTIVE) unused; pin 9 RST unconnected.
- LoLin: **CH340G**, SOP-16, 12 MHz crystal, VID:PID **1A86:7523**, needs the WCH driver on older OSes.

### Auto-program circuit (VT1, VT2 S8050) [1][2]

S8050 SOT-23 pinout 1 = B, 2 = E, 3 = C.
- **VT1**: base <- R7 12 k <- **DTR**; emitter = **RTS**; collector = **nRST**.
- **VT2**: base <- R8 12 k <- **RTS**; emitter = **DTR**; collector = **GPIO0**.
- Truth table printed on the schematic (DTR, RTS -> RST, GPIO0): 1,1 -> 1,1; 0,0 -> 1,1; 1,0 -> 0,1; 0,1 -> 1,0. Only one of RST/GPIO0 is ever pulled low, and when DTR and RTS are both asserted nothing is pulled low. Whether opening a serial monitor resets the board depends on how the terminal sequences DTR/RTS (varies; unverified per terminal). esptool's `default_reset` sequence uses it to enter the bootloader.

### LEDs

| LED | Where | Colour | Pin | Active | Driver |
|---|---|---|---|---|---|
| Module LED | on the ESP-12E module PCB outside the can, near the antenna end (position estimated from photos) | **blue** | **GPIO2** (D4, TXD1) | **LOW** | LED + resistor from module VCC to GPIO2 (ESP-12E internal; unverified resistor value) |
| LED1 | board, (8.61, 12.01), left of the CP2102 | **blue** ("This LED SHOULD BLUE or WHITE to make sure enough voltage drop" [2]) | **GPIO16** (D0) | **LOW** | anode via R9 470 ohm to 3V3, cathode to GPIO16 [1] |
| Power LED | **none** on Amica v1.0 | - | - | - | There is no power indicator; a board that "looks dead" may be fine. |
| USB activity | none | - | - | - | CP2102 has no LED pins wired. |

Arduino core: `LED_BUILTIN = 2`, `LED_BUILTIN_AUX = 16` (`variants/nodemcu/pins_arduino.h`) [11]. The GPIO2 LED blinks briefly on boot (GPIO2 carries UART1 TX of the ROM log) and flickers during flashing.

### Buttons [1][2]

| Button | Ref | Silk | Net | Active | Effect |
|---|---|---|---|---|---|
| Reset | S1 | **RST** | S1 -> R11 470 ohm -> **nRST** (also R10 0 ohm NC to GPIO16) | LOW | Resets the ESP8266 (rst cause 2). |
| Flash | S2 | **FLASH** | S2 -> R12 470 ohm -> **GPIO0** (D3) | LOW | Held during reset -> UART download mode. After boot it is a **usable user button** on GPIO0 (D3), with the R1 12 k pull-up (`pinMode(0, INPUT)` or `INPUT_PULLUP`). |

### Strapping pull resistors [1][2]

EN: R3 12 k to 3V3. nRST: R4 12 k to 3V3 + C1 100 nF to GND. GPIO0: R1 12 k up. GPIO2: R2 12 k up. GPIO15: R5 12 k **down**. Schematic note: "On every boot/reset/wakeup, GPIO15 MUST keep LOW, GPIO2 MUST keep HIGH. GPIO0 HIGH -> RUN MODE, LOW -> FLASH MODE. When you need to use the sleep mode, GPIO16 and RST should be connected." [2]

### On-board sensors

None. (The ESP8266 has no Hall/temperature sensor exposed to users; `ESP.getVcc()` is the only internal measurement.)

## 4. Pinout (physical order, top = antenna end = pin 1)

Left header J1 (board left edge, x = 1.27):

| J1 pin | y (mm) | Silk | Net | ESP8266 function | Notes |
|---|---|---|---|---|---|
| 1 | 41.91 | **A0** | ADC_EX | TOUT via 220 k/100 k divider | 0-3.2 V, 10-bit |
| 2 | 39.37 | RSV | ADC (TOUT direct) | TOUT | 0-1.0 V only, bypasses divider. Leave unconnected. LoLin: **G** (GND) [16] |
| 3 | 36.83 | RSV | (none) | - | LoLin: **VU** (USB 5 V before the diode) [16] |
| 4 | 34.29 | SD3 | GPIO10 | SDIO DATA3 / flash /WP (IO2) | flash bus, do not use |
| 5 | 31.75 | SD2 | GPIO9 | SDIO DATA2 / flash /HOLD (IO3) | flash bus, do not use (driving it crashes the chip) |
| 6 | 29.21 | SD1 | SPI_INT (SD_D1) | GPIO8, flash MOSI/DI | flash bus, do not use |
| 7 | 26.80 | CMD | SPI_MOSI (SD_CMD) | GPIO11, flash /CS | flash bus, do not use |
| 8 | 24.13 | SD0 | SPI_MISO (SD_D0) | GPIO7, flash MISO/DO | flash bus, do not use |
| 9 | 21.59 | CLK | SPI_CLK (SD_CLK) | GPIO6, flash SCLK | flash bus, do not use |
| 10 | 18.92 | GND | GND | | square pad |
| 11 | 16.51 | 3V3 | VDD3V3 | | regulator output |
| 12 | 13.97 | EN | EN (CH_PD) | chip enable, 12 k pull-up | LOW = chip off |
| 13 | 11.43 | RST | nRST | external reset, 12 k pull-up | LOW = reset |
| 14 | 8.89 | GND | GND | | square pad |
| 15 | 6.35 | Vin | VDD5V | regulator input | 5 V from USB via D1 (about 4.7 V), or external supply (bottom silk says 5-12 V; the official instruction PDF [3] says never more than 5 V, so teach 5 V) |

(Net names SPI_INT/SPI_MOSI follow the ESP-12E schematic symbol: "SPI_MOSI/SD_CMD" = module pin 9, "SPI_MISO/SD_D0" = pin 10, "SPI_INT/SD_D1" = pin 13 [2]. The board silk SD1/CMD labels are the SDIO names and are what a figure must print.)

Right header J2 (board right edge, x = 24.13):

| J2 pin | y (mm) | Silk | GPIO | Functions | Notes |
|---|---|---|---|---|---|
| 1 | 41.91 | **D0** | GPIO16 | WAKE (to RST for deep sleep), board LED1 | **No interrupts, no I2C/OneWire**; only `INPUT`, `OUTPUT`, `INPUT_PULLDOWN_16`. `analogWrite` PWM does work on D0 in Arduino core 3.x, but not in MicroPython or NodeMCU Lua. Not pulled up. Board LED active-low. |
| 2 | 39.37 | **D1** | GPIO5 | **SCL** (Arduino default) | safe general I/O |
| 3 | 36.83 | **D2** | GPIO4 | **SDA** (Arduino default) | safe general I/O |
| 4 | 34.42 | **D3** | GPIO0 | FLASH button, boot strap | 12 k pull-up; must be HIGH at boot; LOW at reset = download mode |
| 5 | 31.75 | **D4** | GPIO2 | TXD1 (UART1 TX), module LED | 12 k pull-up; **must be HIGH at boot**; outputs ROM log at boot; LED active-low |
| 6 | 29.21 | 3V3 | - | | |
| 7 | 26.54 | GND | - | | square pad |
| 8 | 24.13 | **D5** | GPIO14 | HSPI SCLK | safe |
| 9 | 21.59 | **D6** | GPIO12 | HSPI MISO | safe |
| 10 | 19.05 | **D7** | GPIO13 | HSPI MOSI, RXD2 (UART0 swapped RX), CTS0 | safe |
| 11 | 16.51 | **D8** | GPIO15 | HSPI CS, TXD2 (UART0 swapped TX), RTS0 | 12 k pull-**down**; **must be LOW at boot** (a pull-up or a module that drives it HIGH stops boot) |
| 12 | 13.97 | **RX** | GPIO3 | RXD0 (D9) | wired to CP2102 TXD via 470 ohm; using it as GPIO breaks Serial/upload |
| 13 | 11.43 | **TX** | GPIO1 | TXD0 (D10) | wired to CP2102 RXD; outputs boot log; HIGH at boot |
| 14 | 8.89 | GND | - | | square pad |
| 15 | 6.35 | 3V3 | - | | |

Arduino constants [11]: `D0=16, D1=5, D2=4, D3=0, D4=2, D5=14, D6=12, D7=13, D8=15, D9=3, D10=1`, `SDA=4`, `SCL=5`, `LED_BUILTIN=2`, `LED_BUILTIN_AUX=16`, `A0=17`. Hardware SPI (HSPI, `SPI.h`): SCK D5, MISO D6, MOSI D7, SS D8. `Serial` = UART0 on TX/RX; `Serial1` = TX-only on D4 (GPIO2). `Serial.swap()` moves UART0 to GPIO15 (TX)/GPIO13 (RX).

All GPIO0-15 have optional internal pull-ups (`INPUT_PULLUP`); GPIO16 has only a pull-down. Interrupts (`attachInterrupt`) on GPIO0-15 (not 16).

Pins that glitch at boot (ROM drives them): GPIO1/TX, GPIO3/RX (UART), GPIO2 (ROM log on UART1, toggling), GPIO16 (high at boot), GPIO9/10 (unverified list; based on common community measurements, not a datasheet). Safe for relays/motors at boot: **D1, D2, D5, D6, D7** (GPIO5, 4, 14, 12, 13).

## 5. Programming

### Toolchains (versions checked 2026-10-24 via GitHub releases API)

| Toolchain | Version | Notes |
|---|---|---|
| Arduino IDE 2.x + **esp8266 core** | **3.1.2** (2023-03-20; still latest) | Boards Manager URL `https://arduino.esp8266.com/stable/package_esp8266com_index.json`. Board: **"NodeMCU 1.0 (ESP-12E Module)"** (`nodemcuv2`, `ESP8266_NODEMCU_ESP12E`), flash 4 MB ("4MB (FS:2MB OTA:~1019KB)"), DIO, CPU 80 MHz, upload speed 115200 (menu offers 57600, 115200, 230400/460800 on Linux/macOS, 256000/512000 on Windows, 921600 and 3000000). Bundled tools: xtensa-lx106-elf GCC (10.3 per release notes, unverified), esptool.py **3.0** (via `tools/upload.py`, version string checked in source [12]). |
| PlatformIO | `platform = espressif8266`, `board = nodemcuv2`, `framework = arduino` | |
| MicroPython | **v1.29.0** (2026-08-24) | firmware `ESP8266_GENERIC` (`.bin`), flash at 0x0. |
| esptool (standalone) | **v5.6.0** (2026-10-15) | v5 command is `esptool` (`esptool.py` kept as alias); message format differs from 3.0 (unverified exact v5 strings). |
| NodeMCU Lua firmware | nodemcu-firmware (cloud build), Lua 5.1/5.3 | historical original firmware of the board (unverified current release). |

### Arduino upload console (esptool.py 3.0, strings verified in source [12])

```
esptool.py v3.0
Serial port /dev/cu.usbserial-0001
Connecting....
Chip is ESP8266EX
Features: WiFi
Crystal is 26MHz
MAC: 84:f3:eb:xx:xx:xx
Uploading stub...
Running stub...
Stub running...
Configuring flash size...
Compressed 265584 bytes to 195301...
Writing at 0x00000000... (8 %)
...
Writing at 0x0002c000... (100 %)
Wrote 265584 bytes (195301 compressed) at 0x00000000 in 17.3 seconds (effective 122.8 kbit/s)...
Hash of data verified.

Leaving...
Hard resetting via RTS pin...
```
(byte counts, MAC and time are illustrative). Failure: `A fatal esptool.py error occurred: Failed to connect to ESP8266: Timed out waiting for packet header` (bad cable, charge-only cable, wrong port, or auto-reset not working: hold FLASH, tap RST, release FLASH).

**Auto-reset:** esptool `--before default_reset --after hard_reset` (boards.txt) toggles DTR/RTS through VT1/VT2: RST low with GPIO0 high, then RST high with GPIO0 low -> ROM samples GPIO0 = LOW -> UART download mode. Manual fallback: hold **FLASH**, press and release **RST**, release FLASH.

### Boot behaviour, ROM log at 74880 baud [4][6][11]

The ROM prints at **74880 baud** (26 MHz crystal) on TX (and GPIO2). An Arduino sketch then switches to its own baud (`Serial.begin(115200)`), so the first line looks like garbage at 115200.

Strapping value: `boot mode:(X,Y)`, X = (GPIO15 << 2) | (GPIO0 << 1) | GPIO2:

| GPIO15 | GPIO0 | GPIO2 | X | Mode |
|---|---|---|---|---|
| 0 | 0 | 1 | **1** | UART download (FLASH held) |
| 0 | 1 | 1 | **3** | boot from SPI flash (normal) |
| 1 | x | x | 4-7 | SDIO (not used; board hangs) |
| 0 | x | 0 | 0, 2 | invalid |

rst cause as printed by the ROM [6]: **0** undefined, **1** power reboot (power-on), **2** external reset (RST pin / RST button / auto-reset) **or wake from deep sleep**, **4** hardware WDT reset. Espressif's note: a software reset or software-WDT reset does **not** change the number (after power-on then a software reset it still prints 1). The core's `doc/boards.rst` table lists 3 = software reset as well [11]; trust the Espressif document. The richer reason (`ESP.getResetReason()`: "Power On", "Hardware Watchdog", "Exception", "Software Watchdog", "Software/System restart", "Deep-Sleep Wake", "External System") comes from the SDK at run time.

Normal boot (power-up or RST button, Arduino sketch):
```
 ets Jan  8 2013,rst cause:2, boot mode:(3,6)

load 0x4010f000, len 3424, room 16
tail 0
chksum 0x2e
load 0x3fff20b8, len 40, room 8
tail 0
chksum 0x2b
csum 0x2b
v000xxxxx
~ld
```
(the ROM prints the `load`/`tail`/`chksum` lines while loading the core's eboot bootloader; `csum`, the `v...` version tag and `~ld` come from eboot. Values vary by build: illustrative.)
Download mode (FLASH held during reset):
```
 ets Jan  8 2013,rst cause:2, boot mode:(1,6)

waiting for host
```
(the second number `6`/`7` is the flash-read/SDIO sub-mode and varies; "waiting for host" wording unverified against a capture).

Crash output from the Arduino core postmortem (printed at the sketch's baud): `Exception (28):` ... `--------------- CUT HERE FOR EXCEPTION DECODER ---------------`, or `Soft WDT reset` (software watchdog, rst cause number unchanged) / `wdt reset` with ROM line `rst cause:4` (hardware watchdog).

### Factory firmware

Amica boards historically shipped with **NodeMCU Lua firmware** (prints `NodeMCU x.x.x build ...` and `lua: cannot open init.lua` at 115200 after the 74880 ROM line). Many current clones ship with **AT firmware** or a blink/test sketch; there is no reliable factory sketch (unverified per vendor).

## 6. Real failure modes

| Fault | What happens physically | What the user sees |
|---|---|---|
| **Reverse polarity on Vin** | No reverse protection on Vin. The 1117's output-to-input path and the ESP/CP2102 ESD diodes conduct; the regulator and/or ESP8266 overheat. If USB is plugged in at the same time, D1 (anode on USB VBUS, cathode on Vin) is **forward-biased** and the PC's VBUS is shorted into the reversed supply through D1. | Regulator very hot within seconds, possible burnt smell, board dead afterwards (often the 1117 shorted, putting Vin straight on 3V3 and killing the ESP on the next correct power-up). |
| **Reverse polarity on USB** | Not possible with a standard Micro-USB cable (keyed). With a bad DIY cable: D1 blocks into Vin, but CP2102 VBUS pin 8 (5.8 V max) sees -5 V. | Usually no damage to the regulator path; possible CP2102 damage. |
| **Reverse on a 3V3 pin** | Direct onto the ESP and CP2102 supply, no protection. | Instant failure; chips hot. |
| **Over-voltage on Vin** | 1117 abs max 20 V (NCP1117 [8]) / 15 V (AMS1117 [19]). Between 9 and 12 V it works but dissipates (Vin-3.3) x I and hits thermal shutdown (resets/cycling) under Wi-Fi load. Above abs max the LDO fails, often shorted, sending Vin into the 3.3 V rail. | Hot LDO, random resets when Wi-Fi transmits, then dead board / hot ESP-12. |
| **Brown-out** | ESP8266 has **no configurable BOD**; below about 2.5-2.8 V (datasheet minimum 2.5 V) the RF calibration and flash reads fail. 170 mA Wi-Fi TX bursts through a thin USB cable or weak supply cause dips. | Reboot loops (`rst cause:4` for hardware WDT, or crashes that leave the number unchanged), `wdt reset`, garbage on serial, Wi-Fi connect fails. Fix: shorter/thicker cable, extra 470-1000 uF on 3V3. |
| **Over-current on a GPIO** | IMAX 12 mA per pin; driving an LED without a resistor or a motor directly overloads the output driver. | Pin voltage sags, LED dim; long-term the pin dies (stuck or no longer drives). |
| **Over-current on 3V3** | Drawing >500 mA from 3V3 (servos, LED strips) sags the rail, LDO current-limits (about 1-1.5 A, see the Short 3V3 row) and heats. | Resets, brown-out loops, hot LDO. |
| **Cold solder joint** (common on header pins, USB shell tabs) | Intermittent contact. | USB disconnects when the cable is wiggled; a pin works only when pressed; CP2102 enumerates and drops. |
| **5 V into a 3.3 V GPIO** | Not rated (VIH max 3.6 V). Current flows into the pin's ESD clamp toward 3V3. Often survives briefly at low current, but can damage the pin or back-power the 3V3 rail. | May "work" (misleading) then fail; teach a level shifter or 10 k/20 k divider. |
| **5 V into A0** | 5 V through 220 k/100 k gives 1.56 V at TOUT, above the 1.0 V range. | Reading saturates at 1023; sustained over-range is out of spec (unverified damage threshold). |
| **Short 5 V (Vin) to GND** | When USB-powered, the short is through D1 and the host's VBUS: the PC's USB port current limit (typically ~0.5-2 A) or polyfuse trips. No fuse on the board. D1 (1 A) may overheat. | PC shows "USB device drawing too much power"/port disabled, board resets or goes dark; D1 can fail. |
| **Short 3V3 to GND** | LDO goes into current limit (NCP1117 1.0 min / 1.5 typ / 2.2 max A [8]; AMS1117 0.9 / 1.1 / 1.5 A [19]) and thermal shutdown. | Board dead while shorted, LDO hot; usually recovers. |
| **Beginner traps** | (1) D-numbers vs GPIO numbers (`digitalWrite(4, ...)` drives **D2**, not D4). (2) LEDs are **active-low**: `LOW` = on. (3) Using D3/D4/D8 for inputs with external pull-ups/pull-downs that change the boot mode (board won't boot or won't run the sketch). (4) Using SD0-SD3/CMD/CLK (crash). (5) Charge-only USB cables (no port appears). (6) No CP210x/CH340 driver. (7) Long `delay()` or tight loops without `yield()` trip the software watchdog (`Soft WDT reset`). (8) `analogWrite` range is 0-255 in core 3.x (1023 in 2.x tutorials). (9) GPIO16 cannot do interrupts or I2C (PWM works on it in Arduino core 3.x, but not in MicroPython). (10) Deep sleep needs a wire D0 -> RST, which then blocks USB auto-upload until removed (unverified that it blocks; R10 0 ohm is the designed link). (11) 5 GHz Wi-Fi networks are invisible (2.4 GHz only). | |

## 7. Lesson facts

Pins: LED = **LED_BUILTIN (GPIO2, D4, module LED, active-low)** or **D0 (GPIO16, board LED, active-low)**. Button = **FLASH button on D3 (GPIO0)**, active-low, external 12 k pull-up already present. External button: D5 with `INPUT_PULLUP`. PWM LED: D1/D2/D5-D7 (D0 also works with Arduino `analogWrite`, but not with MicroPython `PWM`, so lessons should avoid it). Analog: **A0**, 0-3.2 V, potentiometer between 3V3 and GND (wiper 0-3.3 V gives full scale at about 3.2 V). I2C: SDA D2, SCL D1.

### Lesson 1: Blink (Arduino, core 3.1.2)

```cpp
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);     // GPIO2, blue LED on the ESP-12E
}
void loop() {
  digitalWrite(LED_BUILTIN, LOW);   // LOW = LED on (active-low)
  delay(1000);
  digitalWrite(LED_BUILTIN, HIGH);  // off
  delay(1000);
}
```
Second LED: `pinMode(D0, OUTPUT)` / `LED_BUILTIN_AUX`. MicroPython:
```python
from machine import Pin
import time
led = Pin(2, Pin.OUT)       # module LED, active-low
while True:
    led.value(not led.value())
    time.sleep(0.5)
```

### Lesson 2: Button + sensor

```cpp
const int BUTTON = D3;      // FLASH button, GPIO0, active-low, 12k pull-up on board
void setup() {
  Serial.begin(115200);
  pinMode(BUTTON, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
}
void loop() {
  bool pressed = digitalRead(BUTTON) == LOW;
  digitalWrite(LED_BUILTIN, pressed ? LOW : HIGH);
  Serial.println(pressed ? "pressed" : "released");
  delay(50);
}
```
Do not hold FLASH while pressing RST (enters download mode). Sensor: DHT11/DHT22 on D5 with "DHT sensor library" (Adafruit, 1.4.x, unverified current version) or a BME280 on I2C D2/D1 (`Wire.begin()` uses SDA=4, SCL=5).

### Lesson 3: PWM / analog

```cpp
void setup() {
  analogWriteRange(255);    // core 3.x default is already 255
  analogWriteFreq(1000);    // default 1 kHz, 100..60000 Hz allowed
}
void loop() {
  int raw = analogRead(A0);            // 0..1023 for 0..3.2 V on the A0 pin
  analogWrite(D5, raw / 4);            // 0..255 duty on GPIO14
  delay(10);
}
```
Voltage conversion: `float v = raw * 3.2 / 1023.0;` (board divider). MicroPython:
```python
from machine import ADC, Pin, PWM
adc = ADC(0)                 # A0, read() returns 0..1024 on ESP8266 MicroPython
pwm = PWM(Pin(14), freq=1000)
pwm.duty(min(adc.read(), 1023))   # duty 0..1023; read() can return 1024
```
(MicroPython `ADC(0).read()` range is 0-1024 per the ESP8266 quickref [13].)

### Lesson 4: Wi-Fi web server (ESP8266WiFi + ESP8266WebServer, bundled with core 3.1.2; library.properties version "1.0")

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

const char* ssid = "your-ssid";
const char* password = "your-password";
ESP8266WebServer server(80);

void handleRoot() { server.send(200, "text/plain", "hello from esp8266!"); }

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  server.on("/", handleRoot);
  server.on("/on",  []() { digitalWrite(LED_BUILTIN, LOW);  server.send(200, "text/plain", "on"); });
  server.on("/off", []() { digitalWrite(LED_BUILTIN, HIGH); server.send(200, "text/plain", "off"); });
  server.begin();
}
void loop() { server.handleClient(); }
```
(pattern of the core's `HelloServer` example). Other APIs: `WiFi.softAP("name", "password")`, `ESP8266mDNS` (`MDNS.begin("esp8266")`), `ESP8266HTTPClient`, `WiFi.RSSI()`. Deep sleep: `ESP.deepSleep(10e6)` with D0 wired to RST.

MicroPython Wi-Fi:
```python
import network
sta = network.WLAN(network.STA_IF)
sta.active(True)
sta.connect("your-ssid", "your-password")
while not sta.isconnected():
    pass
print(sta.ifconfig())
```

## 8. Internals for the see-through view

| Part | What is really inside |
|---|---|
| ESP-12E module | A ~1 mm 4-layer (unverified layer count) PCB, castellated half-holes on three sides (8 + 6 + 8 = 22 pads). Under a stamped tin-plated steel **shield can**: the **ESP8266EX** QFN-32 (5 x 5 mm, die about 2.5 x 2.5 mm (unverified), gold or copper bond wires to the lead frame, exposed ground pad), a **26 MHz** quartz crystal in a small SMD metal-lid package (3.2 x 2.5 mm typical, unverified; AT-cut quartz blank on conductive-epoxy mounts), the **4 MB SPI NOR flash** in SOP-8 208 mil (Winbond W25Q32, GigaDevice GD25Q32, or BergMicro/XMC 25Q32, varies), an RF matching network (a few 0201/0402 inductors and capacitors, pi-network to the antenna), decoupling caps, and the blue LED + resistor on GPIO2. Outside the can, at the top: the **PCB meander inverted-F antenna**, a copper trace under solder mask. |
| ESP8266EX die | Tensilica L106 core, 802.11 b/g/n radio (PA, LNA, balun, RF switch, PLL all on chip), boot ROM and SRAM (about 64 kB and 160 kB, commonly quoted, unverified), SPI flash cache, no on-chip flash [4]. |
| CP2102 | One die in QFN-28: USB 2.0 full-speed transceiver, 48 MHz internal oscillator, UART engine with a 576-byte receive and 640-byte transmit buffer, 1024-byte EEPROM for VID/PID/serial strings [7], 3.45 V internal regulator (bypassed here). |
| CH340G (LoLin) | SOP-16 die with USB FS transceiver and UART; external 12 MHz HC-49 or SMD crystal. |
| 1117-3.3 LDO | SOT-223: bipolar NPN pass transistor (the 1117 family is a quasi-LDO, not a PMOS LDO, hence the 1.1-1.3 V dropout; exact pass topology unverified), bandgap reference, error amplifier, current-limit and thermal-shutdown circuits; the large tab is VOUT and the main heat path. |
| S8050 | small NPN die in SOT-23. |
| SS14 | Schottky metal-silicon barrier die (SOD-323 here). |
| Tantalum C2 | sintered tantalum anode pellet with Ta2O5 dielectric, MnO2 cathode, silver/graphite, moulded yellow epoxy; marked with polarity band. |
| Tactile switches | stainless-steel snap dome over two contacts, plastic actuator, metal frame. |

## 9. Assembly and power-up

- **Manufacture:** 2-layer FR-4 board. All parts on the **top side** are SMD and reflow-soldered (ESP-12E castellated module placed like a large SMD part; the Micro-USB has through-hole shell pegs that are reflowed or hand/wave soldered). The **two 1x15 headers are through-hole and go on last**, inserted from the top with the plastic spacer on the bottom side, wave- or hand-soldered. Some sellers ship the headers loose. No socketed parts.
- **Power-up (USB):** USB 5 V -> D1 -> 1117 -> 3.3 V. CP2102 enumerates (macOS: `/dev/cu.usbserial-*`, VID:PID 10C4:EA60). EN high via R3, RST rises via R4/C1 (~1.2 ms RC (12 k x 100 nF)), the ROM samples GPIO15 = 0 (R5), GPIO0 = 1 (R1), GPIO2 = 1 (R2) -> boot mode 3 -> prints the 74880-baud banner, during which the **module LED on GPIO2 flickers** briefly. No power LED lights. Then the flashed program runs (e.g. NodeMCU Lua prompt, AT firmware, or the last sketch).
- **Flashing:** the module LED on GPIO2 flickers during upload (commonly observed; exact cause unverified).

## 10. Uncertainties

- Board thickness (assumed 1.6 mm), mask colour and the exact production silkscreen (vs the design's 14/02/2015 artwork) vary by manufacturer and batch; not verified from a specific production board.
- Production Amica boards use AMS1117-3.3, not the BOM's NCP1117 (which part a given board carries is visible only on its marking).
- ESP-12E module body outline position is estimated from the footprint pads plus the 16 x 24 mm module size; the pads are extracted.
- LoLin V3: geometry is scaled from one photo [16] plus retailer sizes; the header labels and VU/G positions are read from that photo. Whether some batches add a GPIO16 LED, the hole positions and the LoLin A0 divider are not verified (no design files published; a downloaded "nodemcu-v3-ch340-schematics.pdf" actually shows a CP2102 and was discarded).
- ESP-12E shield-can wording, CP2102 marking, S8050 SOT-23 code "J3Y" and switch actuator colour are from typical photos/memory.
- The exact ROM text in UART download mode ("waiting for host") and the boot-mode second number were not checked against a capture.
- esptool v5 console strings differ from v3.0 and were not extracted.
- No official total-current limit for all GPIOs exists in the ESP8266 datasheet.

## Verification

Adversarial fact-check, 2026-10-24. I opened every source below myself: the official design files (Gerber V4 outline, drill and silkscreen layers, rendered to PNG; the OFFSET PcbDoc header; the schematic/BOM PDF; the instruction PDF), the esp8266/Arduino 3.1.2 source at tag `3.1.2`, the Espressif datasheet and reset-cause note, the regulator and CP2102 datasheets, Linux USB-serial driver tables, MicroPython v1.29.0 source and docs, and the GitHub releases API.

| # | Claim | Status | Source | Old -> new (corrections) |
|---|---|---|---|---|
| 1 | Outline 25.40 x 48.26 mm (1000 x 1900 mil), 90 mil (2.286 mm) corner radius | confirmed | Gerber V4 `.GKO` bbox x -0.5..0.5 in, y -1.45..0.45 in; PcbDoc Board6 vertices R=90mil, https://github.com/nodemcu/nodemcu-devkit-v1.0 | |
| 2 | 4 non-plated mounting holes, dia 2.92 mm, centres 2.29 mm from each edge, 20.82 x 43.68 mm spacing | confirmed | `RoundHoles-NonPlated.TXT` (T5 C0.115 in at X+-0.41, Y-1.36/0.36 in), same repo | |
| 3 | Headers: 15 pins each, 2.54 mm pitch, row spacing 22.86 mm (0.9"), drill 0.89 mm, pad centres 1.27 mm from long edges, pin 1 y 41.91, pin 15 y 6.35 | confirmed | `RoundHoles-Plated.TXT` (T4 C0.035 in, X+-0.45, Y -1.2..0.2 in), same repo | |
| 4 | Top silk labels, left A0 ... Vin and right D0 ... 3V3 in the stated order; RST/FLASH beside the buttons; OSHW gear at about (20.1, 22.3) | confirmed | Gerber V4 `.GTO` rendered; NODEMCU-DEVKIT-V1.0-INSTRUCTION-EN.pdf pin table, same repo | |
| 5 | Centre silk "NODEMCU / DEVKIT / 14/02/2015 / 6buE6ZSQ" placement | corrected | `.GTO` render: the text lies inside the ESP-12E outline (about y 30-34 mm) | "over the ESP-12E keep-out, below the can" -> "inside the module outline, hidden under the module on an assembled board" |
| 6 | Bottom silk GPIO/ADC/NC/MOSI/CS/MISO/SCLK labels and box "Vin:5-12V DC / 3V3:OUT@500mA", "WWW.NODEMCU.COM" | confirmed | Gerber V4 `.GBO` rendered (mirrored) | |
| 7 | Arduino map D0=16 ... D10=1, SDA=4, SCL=5, LED_BUILTIN=2, LED_BUILTIN_AUX=16, A0=17 | confirmed | https://github.com/esp8266/Arduino/blob/3.1.2/variants/nodemcu/pins_arduino.h ; `variants/generic/common.h` | |
| 8 | LED1 blue on GPIO16, active-low (3V3 -> R9 470 ohm -> LED -> GPIO16) | confirmed | NODEMCU_DEVKIT_V1.0.PDF schematic (KEY sheet) + BOM "SMT_LED_0603 BLUE" | |
| 9 | Module LED on GPIO2 active-low | confirmed | https://github.com/esp8266/Arduino/blob/3.1.2/libraries/esp8266/examples/Blink/Blink.ino ("LOW ... active low") | |
| 10 | A0 divider R13 220 k 1 % (ADC_EX to TOUT), R14 100 k 1 % to GND, so 0-3.2 V; TOUT range 0-1.0 V, 10-bit SAR | confirmed | schematic ADC sheet + BOM; ESP8266EX datasheet v7.1 section 4.9, https://www.espressif.com/sites/default/files/documentation/0a-esp8266ex_datasheet_en.pdf | |
| 11 | BOM: U4 NCP1117ST33T3G, U2 CP2102, D1 1N5819/SS14/S4 SOD-323, VT1/VT2 S8050 SOT-23, C2 100 uF TAJB107M006RNJ, C7 10 uF 25 V 0805, R1-R5/R7/R8 12 k, R6/R9/R11/R12 470, R10 0 ohm NC, S1/S2 PTS820, BOM date 2015-05-14 | confirmed | NODEMCU_DEVKIT_V1.0.PDF BOM page | |
| 12 | R10 is the deep-sleep GPIO16-RST link | confirmed (note added) | schematic "Use this resistor only in sleep mode" next to R10 0(NC); instruction PDF note 6 names the position "R3" | note added that the instruction PDF says "R3" |
| 13 | Auto-program truth table (DTR,RTS -> RST,GPIO0): 11->11, 00->11, 10->01, 01->10 | confirmed | schematic USB TO UART sheet | |
| 14 | Schematic regulator notes: 3.3 V 800 mA, limit 1000 mA, max supply 20 V, dropout 1.2 V @ 800 mA | confirmed | schematic POWER sheet | |
| 15 | NCP1117: Vin max 20 V, 1.2 V max dropout at 800 mA, RthJA 160 C/W minimum pad | confirmed | Documents/NCP1117ST33T3G.PDF in the repo (ON Semi) | |
| 16 | LDO current limit "~1 A" (failure-mode table) | corrected | NCP1117 datasheet: 1000 / 1500 / 2200 mA min/typ/max; AMS1117 ds1117.pdf: 900 / 1100 / 1500 mA | "~1 A" -> "NCP1117 1.0/1.5/2.2 A, AMS1117 0.9/1.1/1.5 A" |
| 17 | AMS1117: 15 V abs max, dropout 1.1 typ / 1.3 max V at 0.8 A, current limit 0.9/1.1/1.5 A, SOT-223 90 C/W | confirmed | http://www.advanced-monolithic.com/pdf/ds1117.pdf | |
| 18 | AMS1117 minimum load | corrected | ds1117.pdf "Minimum Load Current 5 typ, 10 max mA" | "needs 5 mA minimum load" -> "5 mA typ / 10 mA max" |
| 19 | Vin input range | corrected (conflict flagged) | instruction PDF note 8: do not supply more than 5 V; bottom silk says 5-12 V | J1-15 note "external 5-12 V in" -> "teach 5 V; silk says 5-12 V, official instruction PDF says max 5 V"; power table gets the same note |
| 20 | ESP8266EX I/O: VIL max 0.25 VIO, VIH min 0.75 VIO, VIH max 3.6 V, VOL 0.1 VIO, VOH 0.8 VIO, IMAX 12 mA | confirmed | ESP8266EX datasheet v7.1, electrical table | |
| 21 | Currents: TX 11b 170 mA, 11g 140, 11n 120, RX 50-56 mA, modem-sleep 15 mA, light-sleep 0.9 mA, deep-sleep 20 uA, shut-down 0.5 uA; TX power 11b +20 dBm | confirmed | ESP8266EX datasheet v7.1 | |
| 22 | Supply 2.5-3.6 V, L106 up to 160 MHz, crystal 24-52 MHz, heap+data about 50 kB in station mode | confirmed | ESP8266EX datasheet v7.1 | |
| 23 | Datasheet version cited as v6.x | corrected | the current PDF is v7.1 | "v6.x" -> "v7.1" |
| 24 | rst cause 0 undefined, 1 power reboot, 2 external reset or deep-sleep wake, 4 hardware WDT; software reset / soft WDT leave it unchanged | confirmed | https://www.espressif.com/sites/default/files/documentation/esp8266_reset_causes_and_common_fatal_exception_causes_en.pdf | |
| 25 | boot mode X = GPIO15,GPIO0,GPIO2 bits; 1 = UART, 3 = flash, 4-7 SDIO, 0/2 invalid; example `rst cause:2, boot mode:(3,6)` | confirmed | https://github.com/esp8266/Arduino/blob/3.1.2/doc/boards.rst | |
| 26 | analogWriteRange default 255 ("breaking change from 2.x.x"), analogWriteFreq default 1000 Hz, clamped 100-60000 Hz | confirmed | https://github.com/esp8266/Arduino/blob/3.1.2/cores/esp8266/core_esp8266_wiring_pwm.cpp | |
| 27 | Software PWM "any GPIO 0-15 (not GPIO16)"; D0 "no PWM"; trap "GPIO16 cannot do PWM" | corrected | `doc/reference.rst` ("may be used on pins 0 to 16"); `core_esp8266_waveform_pwm.cpp` (rejects only pin > 16 and flash pins, drives GP16O) | "0-15, not GPIO16" -> "0-16 incl. GPIO16 in Arduino core 3.x; not in MicroPython (Pin(16) excluded) or NodeMCU Lua" (4 places) |
| 28 | GPIO16: only INPUT/OUTPUT/INPUT_PULLDOWN_16, no interrupts, no I2C | confirmed | `doc/reference.rst`; `core_esp8266_si2c.cpp` uses GPES/GPEC registers (GPIO0-15 only) | |
| 29 | boards.txt: "NodeMCU 1.0 (ESP-12E Module)", ESP8266_NODEMCU_ESP12E, flash_mode dio, `--before default_reset --after hard_reset`, "4MB (FS:2MB OTA:~1019KB)", 80 MHz | confirmed | https://github.com/esp8266/Arduino/blob/3.1.2/boards.txt | |
| 30 | Upload speed menu "57600-921600" | corrected | boards.txt `nodemcuv2.menu.baud.*` | "57600-921600" -> "57600, 115200, 230400/460800 (Linux/macOS), 256000/512000 (Windows), 921600, 3000000" |
| 31 | esptool pinned at commit 4fa0bd7, `__version__ = "3.0"`; console strings incl. "Hard resetting via RTS pin..." and the `upload.py` message "A fatal esptool.py error occurred:" | confirmed | GitHub contents API for `tools/esptool` at 3.1.2; esptool.py at 4fa0bd7; `tools/upload.py` line 69 | |
| 32 | Latest releases: esp8266 core 3.1.2 (2023-03-20), MicroPython v1.29.0 (2026-08-24), esptool v5.6.0 (2026-10-15) | confirmed | GitHub releases API (`/repos/{esp8266/Arduino, micropython/micropython, espressif/esptool}/releases/latest`) | |
| 33 | MicroPython ESP8266: PWM 1-1000 Hz shared, duty 0-1023, not on Pin(16); `ADC(0).read()` 0-1024; `duty_u16` accepted | confirmed | https://github.com/micropython/micropython/blob/master/docs/esp8266/quickref.rst ; `ports/esp8266/machine_pwm.c` at v1.29.0 | |
| 34 | USB VID:PID CP2102 10C4:EA60, CH340 1A86:7523 | confirmed | Linux `drivers/usb/serial/cp210x.c`, `ch341.c` | |
| 35 | CP2102: QFN-28 5 x 5 mm, 300 bps-1 Mbps, 576 B RX / 640 B TX buffers, 1024-byte programmable ROM, 48 MHz internal oscillator, VBUS/IO abs max 5.8 V, pin 26 TXD, pin 7 REGIN | confirmed | Documents/CP2102-9.pdf in the repo (Silicon Labs) | |
| 36 | LoLin V3 header row spacing 27.94 mm (1.1") | confirmed | Fritzing forum measurement, https://forum.fritzing.org/t/nodemcu-v3-parts-library/3422 (independent of the photo scaling) | |
| 37 | LoLin V3 board size | corrected (narrowed) | Fritzing forum measured 31 x 58 mm; az-delivery listing 58 x 31 x 13 mm | "30.5-31 x 57-58.5 mm" -> "about 31 x 58 mm" |
| 38 | ESP-12E module 16 x 24 x 3 mm, 22 castellated pads | confirmed | LCSC C89297 (SMD 16x24 mm), components101 ESP-12E pinout page; PcbDoc pad box 16.2 mm wide | |

Still unverified after this pass (left marked in the body): S8050 marking "J3Y", CP2102 marking text, switch actuator colour, mask colour per batch, board thickness, ROM "waiting for host" text, esptool v5 strings, the LoLin A0 divider and hole positions, and the claim that the bottom silk "NC" at J1-2 is copper-connected to TOUT (I did not re-trace the copper).
