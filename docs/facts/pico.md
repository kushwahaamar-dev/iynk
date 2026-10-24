# Raspberry Pi Pico family: Pico, Pico W, Pico 2, Pico 2 W (fact sheet)

## 0. Header: what is modelled

| Board | Revision modelled | MCU | Wireless | Flash | Regulator (U2) | Maker / part no. |
|---|---|---|---|---|---|---|
| Raspberry Pi Pico | Rev3 (design files "RPI-PICO-R3") | RP2040 (QFN-56 7x7) | none | 2 MB Winbond W25Q16JVUXIQ | Richtek RT6150B-33GQW buck-boost | Raspberry Pi Ltd, SC0915 (Pico datasheet ordering table) |
| Raspberry Pi Pico W | design file "rpi-picow-r3-2.brd" | RP2040 | Infineon CYW43439 (2.4 GHz 802.11n + Bluetooth 5.2) under a metal can, PCB antenna | 2 MB W25Q16JV | Richtek RT6154AGQW buck-boost | SC0918 (unverified) |
| Raspberry Pi Pico 2 | as in "rpi_pico2.step" / Pico 2 datasheet | RP2350A (QFN-60 7x7) | none | 4 MB Winbond W25Q32RV | RT6150 (datasheet text; see section 10) | SC1631 (unverified) |
| Raspberry Pi Pico 2 W | RP-008306-DS-1 schematic | RP2350A | CYW43439 | 4 MB W25Q32RVXHJQ (schematic) | RT6154AGQW (schematic); D1 is a Nexperia PMEG6010ELR Schottky on this board, not MBR120VLS (schematic) | SC1633 (unverified) |

What it is: the Pico family are 51 x 21 x 1 mm single-sided microcontroller modules from Raspberry Pi Ltd. Each carries the Raspberry Pi microcontroller (RP2040 on Pico/Pico W, RP2350 on Pico 2/Pico 2 W), a QSPI flash chip, a 12 MHz crystal, a buck-boost SMPS that makes 3.3 V from 1.8-5.5 V, a micro-USB B socket (USB 1.1 device/host), a BOOTSEL push button, one green user LED, 40 castellated/through-hole pins on a 2.54 mm grid (usable in a breadboard, on a carrier as an SMD module, or with soldered headers) and a 3-pin SWD debug port. The W boards add an Infineon CYW43439 Wi-Fi/Bluetooth chip under an RF shield and a printed antenna at the end opposite USB; on W boards the LED hangs off the wireless chip, not off the MCU. [1][2][3][4]

## 1. Sources

1. Raspberry Pi Pico Datasheet (build 03/07/2026), https://datasheets.raspberrypi.com/pico/pico-datasheet.pdf - mechanical drawing (Fig. 3), pin list, test points, power chain, operating conditions, ADC notes, schematic.
2. Raspberry Pi Pico W Datasheet, https://datasheets.raspberrypi.com/picow/pico-w-datasheet.pdf - mechanical drawing, wireless pin usage (WL_GPIO0-2, GPIO23/24/25/29), RT6154, debug connector position.
3. Raspberry Pi Pico 2 Datasheet, https://datasheets.raspberrypi.com/pico/pico-2-datasheet.pdf - RP2350A, W25Q32RV, RT6150, pin list, mechanical drawing.
4. Raspberry Pi Pico 2 W Datasheet, https://datasheets.raspberrypi.com/picow/pico-2-w-datasheet.pdf - pin list, WL_GPIO usage, RT6154.
5. Pico Rev3 design files zip (RPI-PICO-R3-PUBLIC: Allegro .brd, OrCAD .DSN, schematic PDF, BOM xlsx "RPI-PICO_PCB-R3_BOM-R3-PUBLIC.xlsx", Pico-R3.step), https://pip.raspberrypi.com/documents/RP-008379-DS (zip RPI-PICO-R3-PUBLIC: schematic PDF, .DSN, RPI-PICO-R3a-PUBLIC.brd, BOM xlsx; the STEP is a separate download, RP-008311-DS) - BOM part numbers and package sizes; STEP part placements.
6. Pico W design files (rpi-picow-r3-2.brd, RPI-PICOW-R2.DSN, PicoW.stp), https://pip.raspberrypi.com/documents/RP-008380-DS (zip picow_design_files: rpi-picow-r3-2.brd, RPI-PICOW-R2.DSN; no BOM) and STEP https://pip.raspberrypi.com/documents/RP-008318-DS - STEP part placements with designators. (The previously listed datasheets.raspberrypi.com/picow/picow-design-files.zip returns 404.)
7. Pico 2 STEP (rpi_pico2.step) and Pico 2 Fritzing (RP-008300-DS-1-Pico-2-Fritzing-20240708.zip), https://datasheets.raspberrypi.com/pico/ - board body only (single merged solid), used for outline check.
8. Pico 2 W schematic RP-008306-DS-1, https://pip.raspberrypi.com/documents/RP-008306-DS - part numbers W25Q32RVXHJQ, RT6154AGQW, CYW43439KUBG, ABM8-272-T3, DMG1012T, PMEG6010ELR (D1), 690-005-298-486 (J1), L2 3.3 uH (VREG_LX), 37.4 MHz WL crystal, TP1-TP6.
9. RP2040 Datasheet, https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf - core, clocks, IIOVDD_MAX 50 mA, BOD 0.86 V, GPIO function table, ADC.
10. RP2350 Datasheet (build 01/10/2026), https://datasheets.raspberrypi.com/rp2350/rp2350-datasheet.pdf - cores, 5 V-tolerant GPIO, POR/BOD, errata RP2350-E9, steppings A2/A3/A4.
11. Getting started with Raspberry Pi Pico-series (C/C++) and Raspberry Pi Pico-series Python SDK, https://datasheets.raspberrypi.com/pico/getting-started-with-pico.pdf and https://datasheets.raspberrypi.com/pico/raspberry-pi-pico-python-sdk.pdf - UF2 flow, MicroPython API.
12. Raspberry Pi documentation, Pico-series page, https://www.raspberrypi.com/documentation/microcontrollers/pico-series.html - list of design files, BOOTSEL drive names.
13. Hardware design with RP2040 / RP2350 (minimal design guides), https://datasheets.raspberrypi.com/rp2040/hardware-design-with-rp2040.pdf, https://datasheets.raspberrypi.com/rp2350/hardware-design-with-rp2350.pdf - reference circuit context.
14. arduino-pico core (Earle Philhower), https://github.com/earlephilhower/arduino-pico - Arduino core used for all four boards.
15. MicroPython rp2 port docs, https://docs.micropython.org/en/latest/rp2/quickref.html - machine/rp2 API.

How the coordinates were obtained: (a) Pico Rev3 and Pico W part centres were extracted with a STEP assembly reader written for this sheet (walks NEXT_ASSEMBLY_USAGE_OCCURRENCE placements, prints each part's bounding box) from Pico-R3.step [5] and PicoW.stp [6]; the Pico W STEP carries real designators (D1, D2, J1, SH1, SW1, U1, U2, X1). (b) Pico W smaller outlines (flash, capacitors, inductor, Q1, debug connector) were extracted from the vector line art of the Pico W datasheet mechanical drawing [2] and scaled to the 21 x 51 outline. (c) Pico debug pad positions were measured from the dimensioned Pico Rev3 drawing [1] (dimensions 5.7, 1.6, 2.4 read off the drawing). The Allegro .brd files are binary and were not parsed. The Pico 2 STEP is a single merged solid, so Pico 2/Pico 2 W part positions are estimated (see 2.4).

## 2. Geometry (board frame)

Frame for all four boards: component side up, viewed from above, **micro-USB end at the top**, exactly as in the official mechanical drawings and pinout diagrams [1-4]. The **bottom edge is the short edge opposite the USB socket** (on Pico/Pico 2 the SWD pads sit on it; on W boards the antenna end). Origin = bottom-left corner of the board outline, +x right, +y up toward USB, mm. Height z is above the top copper/mask surface.

### 2.1 Outline, holes, pins (identical on all four boards [1-4])

| Item | Value |
|---|---|
| Outline | 21.00 x 51.00 mm rectangle, small corner radius (drawn rounded, radius not dimensioned; about 0.5 mm, estimated from drawing) |
| Thickness | 1.0 mm PCB [1]; STEP board body 1.0 mm (Pico R3), Pico W dielectric 0.87 mm + mask = 0.96 mm [6] |
| Mounting holes | 4 x 2.1 mm (+/-0.05) drilled, unplated (drawing shows plain circles; plating unverified). Centres (4.80, 2.00), (16.20, 2.00), (4.80, 49.00), (16.20, 49.00): 11.4 mm apart in x, 2 mm in from top and bottom edges [1] |
| Main pins | 40, 2.54 mm pitch, 1.0 mm drilled holes, plated, also half-cut castellations on the long edges. Rows 17.78 mm apart, centres x = 1.61 and x = 19.39. Pin rows span 48.26 mm: first/last pin centre y = 49.63 and y = 1.37 [1] |
| Pin pad | castellated pad 1.6 mm tall (along y), oblong to the edge [1] |
| Pin numbering | pin 1 top-left (x 1.61, y 49.63), down the left side to pin 20 (x 1.61, y 1.37); pin 21 bottom-right (x 19.39, y 1.37) up to pin 40 top-right (x 19.39, y 49.63). Left pin n: y = 49.63 - 2.54 (n-1). Right pin n: y = 1.37 + 2.54 (n-21) |
| Micro-USB | 8 mm wide body centred at x = 10.5, overhangs the top edge by 1.3 mm (typ) [1] |
| Solder mask / silk | green mask, white silkscreen, gold (ENIG) pads [photos; colour finish unverified] |
| SMD land pattern for carrier boards | pads 3.2 x 1.6 mm (from the datasheet land-pattern figure numbers 2.20 / 2.54 / 3.80 / 15.58; exact pad dims unverified) [1] |

### 2.2 Raspberry Pi Pico (Rev3) parts

Centres from Pico-R3.step [5] (STEP x = board x, board y = -STEP z, STEP y = height; board top surface at STEP y = 0.5), checked against the Pico drawing [1]. Designators from the BOM [5]; positions of the 0201/0402 passives are not in the STEP and are not listed.

| Ref | Part | Package / size (w x h, mm) | Centre (x, y) | Rot | Height above board | Colour / marking |
|---|---|---|---|---|---|---|
| J1 | Micro-USB B, EDAC 690-005-298-486 | 8.9 x 5.6 (incl. flange), mouth at top | (10.50, 49.20); body y 46.7-52.3 | opening faces +y | 3.2 mm (STEP top 3.68 above PCB centre-plane, bottom 0.16 below top surface: the shell sits slightly into the board edge) | bright nickel steel shell |
| SW1 | BOOTSEL tactile switch, Toneparts TP-1221U-K9K5325 | 3.4 x 4.2 (BOM: "Tact switch 4.2x3.4mm") | (7.00, 39.00) | long side along y | 2.5 mm | black/white plastic body, round plunger (photo) |
| D2 | user LED, green, Avago/Broadcom QSME-C194 | 1.6 x 0.8 (BOM 1.6 x 1.15 x 0.55) | (4.80, 46.20) | long axis along x | 0.6 mm | clear lens, green when lit |
| D1 | Schottky VBUS->VSYS, onsemi MBR120VLSFT1G (20 V 1 A) | SOD-123FL 1.65 x 3.6 | (16.50, 44.40) | long axis along y | 0.95 mm | black, cathode band (toward VSYS) |
| U2 | Richtek RT6150B-33GQW buck-boost | WDFN 2.5 x 2.5 x 0.8 | (13.40, 40.10) | pin-1 dot bottom-right (drawing) | 0.75 mm | black, laser code |
| L1 | 2.2 uH inductor Bourns SRN2512-2R2M | 2.0 x 2.5 (2.5 x 2 x 1.2) | (16.50, 40.10) | long axis along y | 1.2 mm | grey/black |
| C1, C2 | 47 uF 6.3 V X5R Murata GRM21BR60J476ME01L | 0805, 2.0 x 1.25 | (13.40, 42.60) and (13.40, 37.60) | long axis along x | 1.25 mm | tan ceramic |
| U3 | Winbond W25Q16JVUXIQ, 16 Mbit (2 MB) QSPI NOR | USON-8 2 x 3 | (6.70, 31.90) | long axis along y | 0.6 mm | black, "25Q16JV" style laser mark (unverified) |
| Q1 | Diodes Inc. DMG1012T N-MOSFET ("A FET stops leakage through ADC3 pin diode into 3V3 net" [5]) | SOT-523, body about 1.6 x 0.8 | (16.90, 32.70) | 1 lead one side, 2 leads other (drawing) | 0.8 mm | black |
| U1 | RP2040 | QFN-56 7.0 x 7.0 | (10.50, 25.00) | pin-1 dot top-left (drawing) | 0.9 mm | black, Raspberry Pi logo + "RP2-B2" + date/lot lines (marking text unverified) |
| X1 | 12 MHz crystal (BOM: AEL X12M000000S096; datasheet text: Abracon ABM8-272-T3) | 3.2 x 2.5 x 0.6 | (8.20, 16.45) | long axis along x | 0.6 mm | metal lid, ceramic base |
| J2 | SWD debug pads, 3 x plated through-holes 1.0 mm, 2.54 mm pitch, on the bottom edge, castellated like the main pins | pads about 1.5 wide, run from edge to y 2.4 | holes at (7.96, 1.60) SWCLK, (10.50, 1.60) GND, (13.04, 1.60) SWDIO | row along x | flat | gold |
| R7 | 200 ohm 0603 (ADC_AVDD R-C filter, "physically large" so it can be removed) | 1.6 x 0.8 | position not extracted | | | |
| TP1-TP6 | square gold test pads on the **underside**: TP1 GND, TP2 USB DM, TP3 USB DP, TP4 GPIO23/SMPS PS, TP5 GPIO25/LED, TP6 BOOTSEL [1] | about 1.2 x 1.2 | in board-frame coordinates (top view): TP2 (11.8, 49.4), TP3 (9.5, 49.4), TP1 (10.7, 46.3), TP4 (7.9, 42.7), TP5 (7.9, 40.2), TP6 (7.9, 37.7) (estimated from the datasheet underside photo, mirrored) | | flat | gold |
| FID | two round gold dots on the top side, about 1 mm, no mask | | (4.5, 43.1) and (16.2, 5.4) (estimated from datasheet top photo; probably fiducials, unverified) | | | gold |

SWD pad order, left to right seen from the top: **SWCLK, GND, SWDIO**. Verified from the datasheet underside photo, which (mirrored, seen from below) reads SWDIO, GND, SWCLK left to right, and from the top silkscreen "DEBUG" with a small triangle marker under the left (SWCLK) pad [1].

Pico Rev3 top-side appearance (datasheet product photo [1]): green mask, white silk, ENIG gold pins; the 4 mounting holes are unplated with a mask-free pale yellow FR-4 ring around each. Silkscreen on top: "1" and "2" beside pins 1 and 2 (top-left), "39" beside pin 39 (top-right), "LED" under the LED, "USB" under the connector, "BOOTSEL" written vertically (reading bottom to top) to the left of the button, "Raspberry Pi Pico © 2020" written vertically along the left side (reading bottom to top, from y about 5 to y about 25), a large white raspberry logo in the lower centre (about x 7-14, y 6-15), "DEBUG" with a small down triangle just above the SWD pads. RP2040 top marking (laser, light grey): raspberry logo, then "RP2-B0  20/21" and "P64M15.00 TTT" on the photographed sample (B0 = early stepping; current boards carry B2, marked "RP2-B2", unverified exact text). Crystal lid marking "AEL12.0" / "2020". BOOTSEL switch: steel frame, white plastic corners, cream/white oval plunger. Underside silkscreen (photo): pin names beside every pin ("GP0" ... "GP22", "GND", "RUN", "GP26_A0", "GP27_A1", "AGND", "GP28_A2", "ADC_VREF", "3V3", "3V3_EN", "VSYS", "VBUS"), "TP1"-"TP6", "SWDIO GND SWCLK" (vertical), UL mark "OC-136 94V-0 H", date code, CE and FCC logos, and a blank white rectangle (label area) about 6 x 6 mm near the bottom.

### 2.3 Raspberry Pi Pico W parts

Centres from PicoW.stp [6] (native board frame, z up, USB at y = 51) unless marked "(drawing)", which means extracted from the Pico W datasheet vector drawing [2].

| Ref | Part | Size (w x h) | Centre (x, y) | Height | Notes |
|---|---|---|---|---|---|
| J1 | Micro-USB B, FCI/Amphenol 10103594-0001LF | 8.9 x 6.06, y 46.29-52.35 | (10.50, 49.32) | 3.35 mm (bottom 0.8 below top surface) | overhang 1.35 mm |
| D2 | LED (AVAGO QSM series, green) | 1.95 x 0.73 | (4.80, 46.19) | 0.68 | driven by CYW43439 WL_GPIO0 |
| D1 | Schottky MBR120VLS, SOD-123FL | 1.65 x 3.6 | (16.50, 44.40) | 0.98 | |
| U2 | RT6154AGQW buck-boost, WDFN-14 (RT-WDFN-14AL) | 4.0 x 3.0 | (12.77, 40.09) | 0.8 | |
| L1 | inductor | 2.0 x 2.5 | (16.52, 40.11) (drawing) | (unverified) | |
| C | capacitors (47 uF class) | 2.0 x 1.2 | (12.42, 43.57), (12.51, 36.30), (12.51, 34.57) (drawing) | | designators unverified |
| SW1 | BOOTSEL, TP-1221U-K9K5325 | 3.2 x 4.25 | (7.00, 39.00) | 2.5 | |
| U3 | flash W25Q16JV | 3.0 x 2.0 (long axis along x) | (7.20, 34.19) (drawing) | (unverified) | |
| Q1 | SOT-523 FET | 1.8 x 1.8 incl. leads | (17.01, 33.26) (drawing) | | |
| U1 | RP2040 QFN-56 | 7.0 x 7.0 | (10.50, 27.05) | 0.9 | note: 2 mm higher than on Pico |
| X1 | 12 MHz crystal XTAL320X250X100 | 3.2 x 2.5 | (5.81, 20.59) | 0.91 | moved to the left of centre vs Pico |
| J2 | SWD debug: 3 plated holes, 2.54 pitch, outline 7.87 x 2.55 | holes at (11.08, 19.80), (13.62, 19.80), (16.16, 19.80) | (13.64, 19.80) | flat (header can be fitted) | moved off the edge because the antenna occupies the bottom; middle hole is 7.3759 from the right edge [2] |
| SH1 | RF shield can "RF_SHIELD_PICOW" over CYW43439 + RF front end | 12.0 x 10.0 | (10.50, 13.20); x 4.5-16.5, y 8.2-18.2 | 1.7 | plain tinned/nickel steel lid; inside: CYW43439 (about 4.9 x 2.9 outline at (10.29, 13.29), drawing) and passives |
| ANT | printed PCB trace antenna | full width, y about 0 to 8 | bottom end | copper under mask | keep metal, ground planes and fingers away; mounting holes at y = 2 sit inside this zone |

### 2.4 Pico 2 and Pico 2 W

The Pico 2 datasheet mechanical drawing has the same outline, hole, pin and debug-pad dimensions as Pico [3], and the Pico 2 W the same as Pico W [4]. The published Pico 2 STEP [7] is one merged solid (bbox 21.98 x 51.5 x 0.91 including castellations), so per-part centres could not be extracted.
- Pico 2: layout follows Pico Rev3: USB, BOOTSEL, LED top-left, D1/U2/L1 power block top-right, RP2350A in the middle, crystal below it, SWD pads on the bottom edge. Centres measured by the fact-checker from the Pico 2 datasheet Figure 3 rendered at 300 dpi (about 22 px/mm, +/-0.3 mm): D2 LED (4.8, 46.2), SW1 (7.0, 39.0), D1 (16.5, 44.2), U2 (13.4, 40.1), L1 (16.5, 40.1), U3 flash (6.3, 31.9), Q1 (16.8, 32.8), U1 RP2350 (10.5, 25.0), mounting holes as Pico. **Differences from Pico:** the crystal X1 sits at about (7.6, 18.0), i.e. 1.5 mm higher and 0.6 mm further left than on Pico (8.2, 16.45); there is an extra striped 2-terminal part at about (12.5, 32.0) between the flash and Q1, most likely the RP2350 core-regulator inductor (3.3 uH, L2 on the Pico 2 W schematic) (identity unverified).
- Pico 2 W: layout follows Pico W: shield over CYW43439, antenna at bottom, SWD 3-hole connector mid-board above the shield (estimated from the Pico 2 W datasheet drawing).

### 2.5 Visual differences a drawing must show

| Feature | Pico | Pico W | Pico 2 | Pico 2 W |
|---|---|---|---|---|
| MCU marking | raspberry logo + "RP2-B0 20/21 / P64M15.00 TTT" on datasheet photo; production "RP2-B2" (unverified) | RP2040, same style | RP2350A: text above the logo, e.g. "RP2350A0A2 25 / PAKV44.00 / 24" (A0A2 = RP2350A, no in-package flash, stepping A2; later boards A4) | same, photo [4] shows "RP2350A0A2" |
| Metal RF can | no | yes, 12 x 10 x 1.7 mm, lower half | no | yes |
| Antenna keep-out | no | bottom ~8 mm, no copper pour visible | no | yes |
| SWD pads | bottom edge, 3 pads | mid-board, 3 holes at y = 19.8 | bottom edge | mid-board |
| LED | D2 at (4.8, 46.2), GPIO25 | same place, WL_GPIO0 | same, GPIO25 | same, WL_GPIO0 |
| Regulator | RT6150B 2.5 x 2.5 | RT6154A 4 x 3 | RT6150 (per datasheet) | RT6154A |
| Top silkscreen | "Raspberry Pi Pico © 2020" vertical on the left, big raspberry logo lower centre, "LED", "USB", "BOOTSEL", "DEBUG ▼", pin numbers "1", "2", "39" (verified from photo [1], see 2.2) | product name with "W"; "DEBUG" beside the mid-board 3-hole connector (exact text unverified) | "Pico 2" style lettering (unverified) | "Pico 2 W" with the "2" printed as a green numeral in a solid white box; "BOOTSEL" above the button; "DEBUG" written vertically beside the 3 holes, which sit in a white rectangle (verified from product photo [4]) |
| Underside | full pin labels (GP0, GND, VBUS ...) and TP1-TP6 labels (photo; exact text unverified) | | | |

## 3. Electrical

### 3.1 MCU

| | RP2040 (Pico, Pico W) [9] | RP2350A (Pico 2, Pico 2 W) [10] |
|---|---|---|
| Cores | dual Arm Cortex-M0+ | dual Arm Cortex-M33 (FPU, DSP, TrustZone) **or** dual Hazard3 RISC-V (RV32IMAC+), selected at boot; any one core of each pair |
| Clock | rated 133 MHz (datasheet now also allows 200 MHz at 1.15 V core, section 2.15.3) | 150 MHz |
| Clock source | 12 MHz crystal (XOSC) -> PLL; ring oscillator at boot | 12 MHz crystal -> PLL |
| SRAM | 264 KB (6 banks) | 520 KB (10 banks) |
| Flash | external QSPI, XIP with 16 KB cache; 2 MB on board | external QSPI, XIP 16 KB cache; 4 MB on board |
| OTP | none | 8 KB antifuse OTP, signed boot |
| GPIO | 30 (QFN-56), 26 on pins | 30 (QFN-60, A variant), 26 on pins |
| PIO | 2 blocks x 4 state machines | 3 blocks x 4 state machines |
| ADC | 12-bit SAR, 500 ksps, 4 inputs (GPIO26-29) + internal temperature sensor (channel 4) | 12-bit, 500 ksps, 4 inputs GPIO26-29 + temp sensor ch 4 |
| PWM | 8 slices x 2 outputs = 16 channels, any GPIO | 12 slices x 2 = 24 channels on the chip, but slices 8-11 only reach GPIO32-47 (QFN-80). On Pico 2 / Pico 2 W (QFN-60, GPIO0-29) only slices 0-7 are usable and the GPIO-to-slice mapping is the same as RP2040 (GPIO16 = PWM0 A, GPIO32 = PWM8 A in the function table [10]) |
| DAC | none | none |
| USB | USB 1.1 device/host, on-chip PHY | USB 1.1 device/host |
| Core supply | on-chip LDO 1.1 V from 3.3 V | on-chip switching regulator (VREG_LX pin, external 3.3 uH inductor L2 on board per the Pico 2 W schematic [8]); VREG_VIN range 2.7-5.5 V [10] |

There is **no USB-serial bridge chip**: USB goes straight to the MCU. Serial over USB is a CDC-ACM device implemented in firmware (TinyUSB in the SDK, MicroPython REPL). The BOOTSEL USB mass-storage/PICOBOOT device lives in the MCU's mask ROM.

### 3.2 Power tree [1-4]

| Net / pin | Range | Path and protection |
|---|---|---|
| VBUS (pin 40) | 5 V +/-10% | micro-USB pin 1. No polyfuse, no ESD diode array (none in BOM [5]). R10 (5.6k) and R1 (10k) divide/pull it down and feed GPIO24 (Pico/Pico 2) or WL_GPIO2 (W boards) as VBUS sense |
| D1 | | Schottky from VBUS to VSYS (MBR120VLSFT1G on Pico/Pico W per BOM/DSN; PMEG6010ELR on Pico 2 W per its schematic [8]; Pico 2 not verified): VSYS = VBUS minus the diode drop (about 0.3 V). It is the only reverse-feed protection: it stops VSYS back-powering the USB host. It does **not** protect VSYS from reverse polarity |
| VSYS (pin 39) | 1.8 V to 5.5 V | main input to the SMPS. Can be fed directly (battery etc.). VSYS is R-C filtered and divided by 3 (R5 200k / R6 100k / C3) to GPIO29 = ADC3 |
| U2 SMPS | in 1.8-5.5 V, out 3.3 V | RT6150B-33GQW (Pico, Pico 2), RT6154AGQW (Pico W, Pico 2 W); buck-boost, 2.2 uH L1, 47 uF C1/C2. PS pin: GPIO23 (Pico/Pico 2) or WL_GPIO1 (W): low (default) = PFM, high = forced PWM (lower ripple, worse light-load efficiency). Output current capability: RT6150B-33GQW is "800mA" per the Pico R3 BOM [5] (WDFN-10 2.5x2.5, 1 MHz); RT6154A is rated up to 4 A (3 A max load for VIN > 3.6 V at VOUT 3.3 V), switch current limit typ. 5 A at 3.6 V in, WDFN 4x3-14 (Richtek product page / DS6154AB-05). The board-level guidance is still the datasheet's "keep the 3V3 load below 300 mA" |
| 3V3_EN (pin 37) | | SMPS enable, pulled up to VSYS by 100 k. Short to GND to switch off 3.3 V and the MCU |
| 3V3 (pin 36) | 3.3 V out | powers MCU and IO; may power external circuits, **keep load below 300 mA** [1] |
| ADC_VREF (pin 35) | | ADC supply/reference = 3V3 through R7 (200 ohm, 0603) into 2.2 uF; the datasheet text says "201 ohm" [1]. Noisy; an LM4040 3.0 V shunt can be added |
| AGND (pin 33) | | ground reference for GPIO26-29 |
| RUN (pin 30) | | MCU enable/reset, internal pull-up about 50 k to 3.3 V. Short to GND to reset |

Powering options [1]: USB only (VSYS = VBUS - Vf; VBUS and VSYS may be shorted if USB is the only source); VSYS only (1.8-5.5 V); USB and battery together need an external Schottky or the recommended P-MOSFET ideal diode (DMG2305UX) on VSYS.

Operating conditions [1]: -20 to +85 C (incl. self-heating), recommended maximum ambient 70 C.

### 3.3 Logic level, 5 V tolerance, current

| | RP2040 boards | RP2350 boards |
|---|---|---|
| IO voltage | 3.3 V fixed (IOVDD from SMPS) [1] | 3.3 V fixed |
| 5 V tolerant | **No.** Abs. max is IOVDD + 0.5 V. GPIO0-25 and SWD pins can take a voltage while unpowered; ADC pins GPIO26-29 have a diode to IOVDD and must not exceed IOVDD + ~300 mV, and leak into 3V3 if the chip is unpowered [1] | **Yes for the "FT" digital GPIO while powered**: they "tolerate voltages up to 5.5 V, provided IOVDD is powered to 3.3 V", and draw very little current below 3.63 V when IOVDD is 0 V [10]. The ADC pins GPIO26-29 are type "Digital IO / Analogue", not FT: treat them as 3.3 V max. Outputs still only drive 3.3 V |
| Drive strength | programmable 2/4/8/12 mA, default 4 mA [9] | programmable 2/4/8/12 mA, default 4 mA [10] |
| Total | sum of sourced currents from IOVDD bank <= IIOVDD_MAX = 50 mA; sunk <= IIOVSS_MAX = 50 mA [9] | IIOVDD_MAX = 100 mA sourced, IIOVSS_MAX = 100 mA sunk (sum over GPIO + QSPI) [10] |

### 3.4 RP2350-E9 erratum (Pico 2 / Pico 2 W)

Affects RP2350 stepping A2 only; fixed in A3 and A4 [10]. When a Bank 0 GPIO (0-47) is an input with input-enable set and its voltage is between VIL and VIH, the pad sources about 120 uA and latches at about 2.2 V. **The internal pull-down cannot pull it low**, so a floating input with pull-down reads high or stuck. Pull-ups still work. Workarounds: use an external pull-down of 8.2 kohm or less, or clear the pad input enable when the pin is idle. Early Pico 2 boards (2024) carry A2; later boards carry A4 (date of changeover unverified). Lesson code for Pico 2 should use `Pin.PULL_UP` with buttons wired to GND, which works on every stepping.

### 3.5 Board-internal GPIOs

| Signal | Pico / Pico 2 | Pico W / Pico 2 W |
|---|---|---|
| GPIO23 | output: SMPS PS (do not use) | output: WL_ON (CYW43439 power on) |
| GPIO24 | input: VBUS sense (high when USB powered) | CYW43439 SPI data / IRQ |
| GPIO25 | output: user LED (active high, via R3 470 ohm) | CYW43439 SPI CS; when high also enables the GPIO29 VSYS/3 measurement |
| GPIO29 | ADC3 = VSYS/3 | CYW43439 SPI CLK, and ADC3 = VSYS/3 (only while GPIO25 high) |
| WL_GPIO0 | n/a | user LED (active high) |
| WL_GPIO1 | n/a | SMPS PS pin |
| WL_GPIO2 | n/a | VBUS sense |

ADC channels: ADC0 = GPIO26 (pin 31), ADC1 = GPIO27 (pin 32), ADC2 = GPIO28 (pin 34), ADC3 = GPIO29 = VSYS/3 (internal), ADC4 = on-chip temperature sensor. Temperature: T = 27 - (V - 0.706) / 0.001721 (RP2040 datasheet [9]; the RP2350 datasheet section 12.4.6 gives the same formula, sensor on AINSEL 4 on QFN-60 [10]).

### 3.6 LEDs, buttons

| Item | Pico / Pico 2 | W boards |
|---|---|---|
| LED (only LED on board, green) | D2, GPIO25, active high | D2, CYW43439 WL_GPIO0, active high; needs the wireless driver running |
| Power LED | **none** (a powered Pico with no program running shows nothing) | none |
| BOOTSEL SW1 | holds the QSPI flash CS (QSPI_SS) low through a resistor when pressed (R11 1 k, confirmed in R3 schematic/BOM [5]; also 1K in the Pico 2 W schematic [8]), the boot ROM samples it at reset and enters USB boot mode. Also readable at runtime (`rp2.bootsel_button()`, `BOOTSEL` in arduino-pico) | same |
| Reset button | **none**; short RUN (pin 30) to GND | none |
| Sensors | only the on-chip temperature sensor and VSYS/3 | same |

### 3.7 Wireless (W boards)

CYW43439: 2.4 GHz IEEE 802.11b/g/n single-band Wi-Fi, Bluetooth 5.2 (BLE and Classic on Pico W; support level depends on software), connected to the MCU over a 3-wire gSPI (GPIO23 WL_ON, GPIO24 DATA, GPIO25 CS, GPIO29 CLK). On-board printed antenna licensed from ABRACON (formerly ProAnt) (unverified). Driver: cyw43-driver + lwIP in pico-sdk; firmware blob is linked into user code.

## 4. Pinout (physical order, identical on all four boards [1-4])

Default hardware functions per the RP2040/RP2350 function table [9][10]: SPI: GPIO n mod 4 = 0 RX, 1 CSn, 2 SCK, 3 TX; SPI0 on GPIO0-7 and 16-23, SPI1 on GPIO8-15 and 24-29. I2C: n mod 4 = 0 I2C0 SDA, 1 I2C0 SCL, 2 I2C1 SDA, 3 I2C1 SCL. UART: UART0 TX/RX on 0/1, 12/13, 16/17, 28/29; UART1 TX/RX on 4/5, 8/9, 20/21, 24/25. PWM: slice = (n >> 1) mod 8 on RP2040, channel A = even, B = odd. On RP2350 the UARTs can additionally appear on the CTS/RTS pins as "UART aux" (unverified for each pin).

| Pin | Label | Functions | Notes |
|---|---|---|---|
| 1 | GP0 | UART0 TX, I2C0 SDA, SPI0 RX, PWM0A | default UART0 TX for stdio |
| 2 | GP1 | UART0 RX, I2C0 SCL, SPI0 CSn, PWM0B | |
| 3 | GND | | |
| 4 | GP2 | I2C1 SDA, SPI0 SCK, PWM1A | |
| 5 | GP3 | I2C1 SCL, SPI0 TX, PWM1B | |
| 6 | GP4 | UART1 TX, I2C0 SDA, SPI0 RX, PWM2A | SDK default I2C0 SDA (PICO_DEFAULT_I2C_SDA_PIN 4) |
| 7 | GP5 | UART1 RX, I2C0 SCL, SPI0 CSn, PWM2B | SDK default I2C0 SCL |
| 8 | GND | | |
| 9 | GP6 | I2C1 SDA, SPI0 SCK, PWM3A | |
| 10 | GP7 | I2C1 SCL, SPI0 TX, PWM3B | |
| 11 | GP8 | UART1 TX, I2C0 SDA, SPI1 RX, PWM4A | |
| 12 | GP9 | UART1 RX, I2C0 SCL, SPI1 CSn, PWM4B | |
| 13 | GND | | |
| 14 | GP10 | I2C1 SDA, SPI1 SCK, PWM5A | |
| 15 | GP11 | I2C1 SCL, SPI1 TX, PWM5B | |
| 16 | GP12 | UART0 TX, I2C0 SDA, SPI1 RX, PWM6A | |
| 17 | GP13 | UART0 RX, I2C0 SCL, SPI1 CSn, PWM6B | |
| 18 | GND | | |
| 19 | GP14 | I2C1 SDA, SPI1 SCK, PWM7A | |
| 20 | GP15 | I2C1 SCL, SPI1 TX, PWM7B | |
| 21 | GP16 | UART0 TX, I2C0 SDA, SPI0 RX, PWM0A | SDK default SPI0 RX |
| 22 | GP17 | UART0 RX, I2C0 SCL, SPI0 CSn, PWM0B | SDK default SPI0 CSn |
| 23 | GND | | |
| 24 | GP18 | I2C1 SDA, SPI0 SCK, PWM1A | SDK default SPI0 SCK |
| 25 | GP19 | I2C1 SCL, SPI0 TX, PWM1B | SDK default SPI0 TX |
| 26 | GP20 | UART1 TX, I2C0 SDA, SPI0 RX, PWM2A | |
| 27 | GP21 | UART1 RX, I2C0 SCL, SPI0 CSn, PWM2B | |
| 28 | GND | | |
| 29 | GP22 | I2C1 SDA, SPI0 SCK, PWM3A | |
| 30 | RUN | MCU enable / reset, active low | internal ~50 k pull-up |
| 31 | GP26 / ADC0 | ADC0, I2C1 SDA, SPI1 SCK, PWM5A | ADC pin: not 5 V tolerant on any board |
| 32 | GP27 / ADC1 | ADC1, I2C1 SCL, SPI1 TX, PWM5B | |
| 33 | AGND | analog ground | |
| 34 | GP28 / ADC2 | ADC2, UART0 TX, I2C0 SDA, SPI1 RX, PWM6A | |
| 35 | ADC_VREF | ADC reference (3V3 filtered) | |
| 36 | 3V3(OUT) | 3.3 V output | < 300 mA external load |
| 37 | 3V3_EN | SMPS enable, pulled up to VSYS by 100 k | low = off |
| 38 | GND | | |
| 39 | VSYS | 1.8-5.5 V in / out | |
| 40 | VBUS | USB 5 V | 0 V when USB not powered |

Debug: SWCLK, GND, SWDIO (3 pads; dedicated SWD pins on the MCU, not GPIO). Strapping: none on GPIO; boot mode is chosen only by BOOTSEL (QSPI CS). The QSPI flash pins are not on the header.

## 5. Programming

| Path | Detail |
|---|---|
| UF2 drag and drop | Hold BOOTSEL, plug in USB (or hold BOOTSEL and pulse RUN low). The ROM enumerates a "standard 128 MB flash drive", FAT16, named **RPI-RP2** (RP2040 [9] section 2.8.4.1) or **RP2350** (RP2350 [10] section 5.5.1), showing only two files: INFO_UF2.TXT (bootloader description and version) and INDEX.HTM (redirects to raspberrypi.com/device/RP2?version=...). Copy a .uf2; the drive ejects itself, the board reboots and runs the program [11][12]. If no valid program is in flash the ROM always enters this mode, so a blank board appears as the drive without pressing BOOTSEL |
| picotool | `picotool load -x firmware.uf2` (PICOBOOT interface of the same ROM); `picotool info` shows program name/build. Version 2.x (2.1/2.2 in 2025; current October 2026 version unverified) |
| SWD | Raspberry Pi Debug Probe or a second Pico running debugprobe firmware, OpenOCD (Raspberry Pi fork), `openocd -f interface/cmsis-dap.cfg -f target/rp2040.cfg` (or `target/rp2350.cfg`) |
| pico-sdk | C/C++ SDK 2.x (2.0.0 added RP2350, Aug 2024; 2.1.x/2.2.0 in 2025; current October 2026 version unverified). VS Code "Raspberry Pi Pico" extension. Board names `pico`, `pico_w`, `pico2`, `pico2_w` (`-DPICO_BOARD=pico2_w`; `-DPICO_PLATFORM=rp2350-riscv` for RISC-V) |
| MicroPython | separate UF2 per board from micropython.org (RPI_PICO, RPI_PICO_W, RPI_PICO2, RPI_PICO2_W). RP2350 support since v1.24 (Oct 2024); current version unverified. REPL on USB CDC; Thonny or mpremote |
| CircuitPython | supports all four (drive CIRCUITPY) |
| Arduino | arduino-pico core by Earle Philhower (Boards Manager URL `https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json`), supports Pico, Pico W, Pico 2, Pico 2 W; uploads by UF2 (auto-reset via USB 1200-baud touch into BOOTSEL) or picotool. Version 4.x/5.x (current unverified). Also "Arduino Mbed OS RP2040 Boards" (Pico only, no W/2 support) |
| Auto-reset | no DTR circuit. A program built with USB stdio honours the "1200 baud touch": opening the port at 1200 baud reboots into BOOTSEL; picotool can also force a reboot of a running SDK program over USB |
| Factory content | flash is blank from the factory (unverified for every batch), so the first plug-in shows the RPI-RP2 / RP2350 drive and the LED is dark |

## 6. Real failure modes

| Fault | What physically happens |
|---|---|
| Reverse polarity on VSYS | no protection. The RT6150/RT6154 body diodes and the RP2040/RP2350 ESD structures conduct, large current flows; U2 and possibly the MCU are destroyed, the board gets hot quickly, possible burnt smell. D1 does not help (it is between VBUS and VSYS) |
| Reverse polarity on the VBUS pin (supply wired backwards to pin 40/GND) | D1 is then reverse biased, so VSYS and the regulator are isolated from the negative voltage; only the VBUS divider (R10/R1) and the GPIO24 / WL_GPIO2 sense path see it, which can drive that pin below GND through its ESD diode. Damage is possible but less likely than on VSYS (unverified) |
| Over-voltage on VSYS (> 5.5 V) | RT6154 absolute max VIN is -0.2 V to 6 V (Richtek DS6154AB-05); RT6150 about 6 V (unverified exact); above it the regulator fails, often short, and passes VSYS to 3V3, killing the MCU. 9 V or 12 V on VSYS destroys the board |
| Brown-out | RP2040 has a core-supply BOD, nominal 0.86 V on DVDD (1.1 V core) [9]; RP2350 POR threshold 0.957 V nominal and a programmable BOD [10]. Effectively the board resets once VSYS falls below about 1.8 V (SMPS drops out); user sees USB disconnect and the program restart |
| Over-current on a pin | more than 12 mA per pin or 50 mA total (RP2040) makes output voltage sag (VOH drops), the chip warms; dead short of an output to GND at 12 mA setting usually survives briefly but long shorts can damage the pad (unverified) |
| Over-current on 3V3 | above ~300 mA the 3.3 V rail sags, the MCU browns out and resets/USB drops; SMPS has internal current limit and thermal shutdown (Richtek), no fuse |
| Cold solder joint on the header | intermittent: program resets when the board is touched, an I2C device disappears, ADC readings jump. Visible as a dull, balled joint not wetting the castellation |
| 5 V into a 3.3 V pin | RP2040: current flows through the input ESD diode into the 3V3 rail, the pin can be permanently damaged, 3V3 may rise and damage the chip. RP2350: digital GPIOs tolerate 5 V while powered; ADC pins do not. When unpowered, 5 V on an RP2350 GPIO is outside "3.3 V failsafe" |
| Shorting VBUS/VSYS to GND | VBUS short: the USB host's own current limit trips (port shuts off, "USB device drew too much power" on macOS), no fuse on the Pico; D1 may overheat. 3V3 short: SMPS current limit, board does nothing, U2 warms |
| Beginner traps | LED on a W board: `Pin(25)` does nothing; use `Pin("LED")` / `LED_BUILTIN` with the W build. Wrong UF2 (Pico build on a Pico 2 is not accepted: the drive takes it but nothing runs, or it is ignored) (unverified exact behaviour). Charge-only micro-USB cables: no drive appears. Pins labelled on the underside only; counting physical pins vs GP numbers. Using GP23/24/25/29 on a W board breaks Wi-Fi. Floating input with pull-down on early Pico 2 (E9). ADC reads ~0-4095 but MicroPython `read_u16()` gives 0-65535. 3V3_EN tied low by mistake turns the whole board off. Holding BOOTSEL too late (after power-up) has no effect |

## 7. Lesson facts

Pins chosen so all four boards work the same: button on GP14 (pin 19) to GND with internal pull-up; potentiometer wiper on GP26/ADC0 (pin 31), ends to 3V3(OUT) pin 36 and AGND pin 33; external LED on GP15 (pin 20) via 220-330 ohm to GND; I2C0 on GP4 (SDA, pin 6) / GP5 (SCL, pin 7).

### 7.1 Blink

MicroPython (all four, firmware matching the board):
```python
from machine import Pin
import time
led = Pin("LED", Pin.OUT)   # GPIO25 on Pico/Pico 2, WL_GPIO0 on W boards
while True:
    led.toggle()
    time.sleep(0.5)
```
Arduino (arduino-pico): `pinMode(LED_BUILTIN, OUTPUT); digitalWrite(LED_BUILTIN, HIGH);` LED_BUILTIN works on W boards too (core routes it to the CYW43 GPIO). C SDK: `gpio_init(PICO_DEFAULT_LED_PIN)` on Pico/Pico 2; on W boards `cyw43_arch_init()` then `cyw43_arch_gpio_put(CYW43_WL_GPIO_LED_PIN, 1)`.

### 7.2 Button and temperature sensor

```python
from machine import Pin, ADC
btn = Pin(14, Pin.IN, Pin.PULL_UP)   # pressed = 0
temp = ADC(4)                        # on-chip sensor
v = temp.read_u16() * 3.3 / 65535
t = 27 - (v - 0.706) / 0.001721
```
Arduino: `pinMode(14, INPUT_PULLUP); digitalRead(14) == LOW`; `analogReadTemp()` (arduino-pico). BOOTSEL as an input: `rp2.bootsel_button()` returns 1 while pressed (MicroPython); `BOOTSEL` macro in arduino-pico.

### 7.3 PWM and analog

```python
from machine import Pin, PWM, ADC
pot = ADC(26)               # or ADC(0)
pwm = PWM(Pin(15)); pwm.freq(1000)
pwm.duty_u16(pot.read_u16())
```
VSYS voltage: `ADC(29).read_u16() * 3 * 3.3 / 65535` (on W boards the WLAN driver must hold GPIO25 high; with Wi-Fi active it is messy, unverified details). Arduino: `analogReadResolution(12); analogRead(26)`, `analogWrite(15, v)` (default 8-bit range, `analogWriteFreq()`, `analogWriteRange()` in arduino-pico).

### 7.4 Protocol / Wi-Fi

I2C (any board): `from machine import I2C, Pin; i2c = I2C(0, sda=Pin(4), scl=Pin(5), freq=400000); i2c.scan()`. Pins must be a valid pair for that controller (section 4), otherwise MicroPython raises `ValueError: bad SDA pin`.
UART: `UART(0, baudrate=115200, tx=Pin(0), rx=Pin(1))`.
Wi-Fi (Pico W, Pico 2 W):
```python
import network, time
wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect("ssid", "password")
while not wlan.isconnected():
    time.sleep(0.5)
print(wlan.ifconfig()[0])
```
Arduino W: `#include <WiFi.h>`, `WiFi.begin(ssid, pass)`, `WiFi.status() == WL_CONNECTED`. C SDK: `cyw43_arch_enable_sta_mode(); cyw43_arch_wifi_connect_timeout_ms(ssid, pass, CYW43_AUTH_WPA2_AES_PSK, 30000)`.
PIO (signature feature): `rp2.StateMachine(0, prog, freq=2000, set_base=Pin(25))` with an `@rp2.asm_pio(set_init=rp2.PIO.OUT_LOW)` program (blink via PIO; on W boards use an external LED pin since GPIO25 is the wireless CS).

## 8. Internals for the see-through view

| Part | Inside |
|---|---|
| RP2040 / RP2350 QFN | silicon die (RP2040 40 nm, about 2 mm square, unverified), gold or copper bond wires to the lead frame, exposed die paddle on the underside soldered to GND, moulded black epoxy |
| W25Q16JV / W25Q32RV flash | NOR flash die in a USON package, bond wires, exposed pad |
| 12 MHz crystal | AT-cut quartz blank on conductive-epoxy mounts in a ceramic cavity package, seam-sealed metal lid |
| RT6150/RT6154 | buck-boost controller die with four internal switching MOSFETs; external inductor L1 is a ferrite drum wound with copper wire (shielded SRN series) |
| RF can (W boards) | CYW43439 WLBGA/BGA die-size package, its 37.4 MHz crystal (unverified frequency), RF matching network and passives; the can is a stamped tinned-steel lid on a soldered fence |
| USB | no bridge chip: D+/D- go via 27 ohm series resistors (R12, R13) straight to the MCU's USB PHY |
| Micro-USB | 5 contacts (VBUS, D-, D+, ID, GND) in a steel shell, SMD legs and through-hole tabs |

## 9. Assembly and power-up

Manufacture: all parts SMT on the top side only, reflow soldered (single-sided board [1]); castellated edge pins are plated half-holes; no through-hole parts are fitted (headers are optional extras: "Pico H"/"Pico WH"/"Pico 2 WH" variants have factory headers and a 3-pin JST-SH debug connector, unverified for every variant). The W boards' RF can goes through reflow with the rest.

Power-up with a blank flash: SMPS starts, MCU boots from ROM, finds no valid image, enumerates as the **RPI-RP2** / **RP2350** drive (+ PICOBOOT); LED off. With MicroPython: USB CDC serial appears (`/dev/tty.usbmodem*`, COMx), REPL banner `MicroPython v1.x on <date>; Raspberry Pi Pico with RP2040`; LED off until code drives it. There is no power LED, so "nothing lights" is normal.

## 10. Uncertainties

- Pico 2 regulator: the Pico 2 datasheet text names RT6150 [3] (re-checked by the fact-checker: all three mentions say RT6150); no Pico 2 BOM or schematic is published, so the exact suffix is unverified.
- Pico 2 W flash: the datasheet text says W25Q16JV (2 MB) [4], which contradicts its own "4 MB flash"; the schematic [8] shows W25Q32RVXHJQ (4 MB). Trust the schematic. (Re-checked: the Pico 2 W datasheet text and its embedded schematic still say W25Q16JV and MBR120VLS, i.e. they were copied from Pico W; the standalone schematic [8] says W25Q32RVXHJQ and PMEG6010ELR.)
- Pico crystal: BOM [5] lists AEL X12M000000S096; datasheet text says Abracon ABM8-272-T3 [1]. Both are 3.2 x 2.5 mm 12 MHz parts and likely alternates; draw a generic 3.2 x 2.5 metal-lid crystal.
- Pico Q1: BOM says DMG1012T (N-FET); the datasheet mentions DMG2305UX only as the recommended external P-FET for battery OR-ing.
- Pico 2 / Pico 2 W part centres are estimated (merged STEP); chip top markings, silkscreen text, SKU numbers, current software versions (MicroPython, arduino-pico, pico-sdk, picotool) and Richtek current limits/abs max not verified in this run.
- SWD pad order SWCLK-GND-SWDIO: the R3 schematic [5] gives J2 pin 1 = SWCLK, pin 2 = GND, pin 3 = SWDIO; left-to-right placement as seen from the top is from the datasheet photo/pinout (see 2.2).

## Verification

Adversarial fact-check, 2026-10-24. Sources were downloaded fresh by the checker (not the researcher's copies) and read with pdftotext; the mechanical figures were rendered with pdftoppm and measured.

| # | Claim | Status | Source | Old -> new (corrections) |
|---|---|---|---|---|
| 1 | Board 51 x 21 mm, 1 mm thick, single-sided | confirmed | https://datasheets.raspberrypi.com/pico/pico-datasheet.pdf (sec. 2, Fig. 3); same text in Pico W / Pico 2 datasheets | |
| 2 | 4 mounting holes 2.1 mm (+/-0.05), 11.4 mm apart, 4.8 mm from side, 2 mm from top/bottom | confirmed | Pico, Pico W, Pico 2 datasheet Fig. 3 | |
| 3 | Pin rows 17.78 mm apart, 1.61 mm from edge, 48.26 mm pin span, 2.54 pitch, 1 mm holes, USB 8 mm wide overhanging 1.3 mm | confirmed | Pico / Pico 2 datasheet Fig. 3 | |
| 4 | Pico W SWD connector 19.8 mm above bottom edge, 7.3759 mm from right edge; antenna at bottom | confirmed | https://datasheets.raspberrypi.com/picow/pico-w-datasheet.pdf Fig. 3 | |
| 5 | Pico Rev3 part centres (LED 4.8,46.2; SW1 7,39; U1 10.5,25; X1 8.2,16.45; U3 6.7,31.9; SWD pads x 7.96/10.5/13.04) | confirmed (+/-0.3 mm, measured on Fig. 3) | Pico datasheet Fig. 3 at 300 dpi | |
| 6 | Pico 2 part centres "same as Pico within 0.5 mm" | corrected | https://datasheets.raspberrypi.com/pico/pico-2-datasheet.pdf Fig. 3 at 300 dpi | crystal same as Pico -> X1 at about (7.6, 18.0); extra inductor-like part at about (12.5, 32.0) added (see 2.4) |
| 7 | Regulators: RT6150B-33GQW (Pico), RT6154AGQW (Pico W, Pico 2 W), RT6150 (Pico 2 per datasheet) | confirmed | Pico R3 BOM (https://pip.raspberrypi.com/documents/RP-008379-DS); Pico W / 2 / 2 W datasheet text; RP-008306-DS schematic | |
| 8 | Regulator current: "about 1 A (RT6150)", RT6154 higher (unverified) | corrected | Pico R3 BOM; https://www.richtek.com/en/Products/Switching%20Regulators/Buck-Boost%20Converter/RT6154ART6154B.aspx | about 1 A -> RT6150B 800 mA; RT6154A up to 4 A (3 A at VIN > 3.6 V) |
| 9 | RT6150/RT6154 abs max input about 6 V | confirmed for RT6154 (-0.2 to 6 V); RT6150 unverified | https://www.richtek.com/assets/product_file/RT6154A=RT6154B/DS6154AB-05.pdf | |
| 10 | Flash W25Q16JVUXIQ (Pico), W25Q32RV / W25Q32RVXHJQ (Pico 2 / 2 W); crystal ABM8-272-T3 text vs X12M000000S096 BOM | confirmed | Pico datasheet sec. 1; Pico R3 BOM; Pico 2 datasheet; RP-008306-DS schematic | |
| 11 | D1 Schottky is MBR120VLS on all boards | corrected | RP-008306-DS (https://pip.raspberrypi.com/documents/RP-008306-DS); Pico R3 BOM; Pico W DSN strings | MBR120VLS everywhere -> MBR120VLSFT1G on Pico/Pico W, PMEG6010ELR on Pico 2 W (Pico 2 unverified) |
| 12 | 3V3 out: keep load below 300 mA; VSYS 1.8-5.5 V; VBUS 5 V +/-10%; -20 to 85 C, 70 C recommended ambient | confirmed | Pico datasheet sec. 2.1, 2.3 | |
| 13 | 3V3_EN pulled to VSYS by 100 k; RUN ~50 k internal pull-up; VBUS sense R10 5.6 k / R1 10 k; VSYS/3 via R5 200 k / R6 100 k; R7 200 ohm 0603 (text says 201 ohm) | confirmed | Pico datasheet sec. 2.1, 4.3, 4.4; Pico R3 BOM | |
| 14 | Internal GPIOs: GPIO23 PS, GPIO24 VBUS sense, GPIO25 LED, GPIO29 VSYS/3 (Pico/Pico 2); GPIO23 WL_ON, 24 data/IRQ, 25 CS (+ enables VSYS ADC), 29 CLK/ADC3, WL_GPIO0 LED, WL_GPIO1 PS, WL_GPIO2 VBUS (W boards) | confirmed | Pico datasheet sec. 2.1; Pico W datasheet sec. 2.1; pico-sdk boards/pico2_w.h (CYW43_WL_GPIO_LED_PIN 0, SMPS_PIN 1) | |
| 15 | LED active high via R3 470 ohm, green QSME-C194; BOOTSEL via R11 1 k on QSPI_SS | confirmed | Pico R3 BOM + schematic (RP-008379-DS) | R11 "(unverified)" -> confirmed |
| 16 | RP2040 not 5 V tolerant (abs max IOVDD + 0.5 V); RP2350 FT pins tolerate 5.5 V when IOVDD = 3.3 V; default drive 4 mA | confirmed | https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf Table 614/622; https://datasheets.raspberrypi.com/rp2350/rp2350-datasheet.pdf pin-type table | |
| 17 | IO bank totals: RP2040 50 mA; RP2350 (unverified) | corrected | RP2040 / RP2350 datasheet electrical tables | RP2350 unverified -> IIOVDD_MAX 100 mA, IIOVSS_MAX 100 mA |
| 18 | RP2350-E9: A2 only, ~120 uA, ~2.2 V latch, pull-down fails, external pull-down <= 8.2 k, fixed in A3 | confirmed | RP2350 datasheet App. D.5.1 and C.2.1 | |
| 19 | RP2350 PWM "12 slices x 2 = 24 channels" | corrected | RP2350 datasheet GPIO function table (GPIO16 PWM0 A, GPIO32 PWM8 A) | 24 channels -> 24 on chip, but only slices 0-7 (16 channels) on Pico 2 GPIO0-29, same mapping as RP2040 |
| 20 | Clocks / memory: RP2040 133 MHz (200 MHz at 1.15 V), 264 kB SRAM; RP2350 150 MHz, 520 kB in 10 banks, 8 kB OTP; temp formula 27 - (V - 0.706)/0.001721 on both | confirmed | RP2040 datasheet sec. 1, 2.15.3, 4.9.5; RP2350 datasheet sec. 1, 12.4.6 | RP2350 temp formula "unverified" -> confirmed |
| 21 | BOD: RP2040 0.86 V; RP2350 POR 0.957 V nominal | confirmed (RP2350 BOD default 0.946 V nominal also stated) | RP2040 / RP2350 datasheet power sections | |
| 22 | UF2 drive: 128 MB FAT16, RPI-RP2 / RP2350, INFO_UF2.TXT + INDEX.HTM | confirmed | RP2040 datasheet 2.8.4.1; RP2350 datasheet 5.5.1 | |
| 23 | MicroPython: Pin("LED") maps to GPIO25 (RPI_PICO, RPI_PICO2) and EXT_GPIO0 (RPI_PICO_W, RPI_PICO2_W); rp2.bootsel_button() returns 1 when pressed; "bad SDA pin" ValueError | confirmed | https://github.com/micropython/micropython/tree/master/ports/rp2 (boards/*/pins.csv, modrp2.c, machine_i2c.c) | |
| 24 | pico-sdk: PICO_DEFAULT_LED_PIN 25, I2C0 SDA/SCL 4/5, SPI0 16/17/18/19, UART0 0/1; cyw43_arch_wifi_connect_timeout_ms(ssid, pw, auth, timeout), cyw43_arch_gpio_put | confirmed | https://github.com/raspberrypi/pico-sdk src/boards/include/boards/pico.h, pico2_w.h, pico_cyw43_arch/include/pico/cyw43_arch.h | |
| 25 | arduino-pico: BOOTSEL object, analogReadTemp(), analogWrite default 8-bit (255) at 1 kHz, Boards Manager URL | confirmed (note: analogRead default 10-bit) | https://github.com/earlephilhower/arduino-pico docs/bootsel.rst, docs/analog.rst, cores/rp2040/wiring_analog.cpp, README.md | |
| 26 | Pico W antenna licensed from ABRACON (formerly ProAnt); CYW43 crystal 37.4 MHz | confirmed | Pico W datasheet sec. 1; RP-008306-DS schematic | |
| 27 | SWD order SWCLK, GND, SWDIO | confirmed (pin numbering) | R3 schematic J2: pin 1 SWCLK, 3 SWDIO | |
| 28 | Source URLs 5, 6, 8 | corrected | https://www.raspberrypi.com/documentation/microcontrollers/pico-series.html | datasheets.raspberrypi.com zip/pdf links (6 and 8 return 404) -> pip.raspberrypi.com/documents/RP-008379-DS, RP-008380-DS + RP-008318-DS, RP-008306-DS |
| 29 | SW1 body 3.2 x 4.25 mm | corrected | Pico R3 BOM | 3.2 x 4.25 -> 3.4 x 4.2 (Pico W row and STEP-derived heights left as extracted) |
| 30 | SKUs SC0915 (Pico) | confirmed; SC0918, SC1631, SC1633 remain unverified | Pico datasheet ordering table | |

Not re-checked (left as written, flagged where already unverified): Pico W STEP-derived centres and heights, test-pad and fiducial positions, chip top markings, silkscreen text, software version numbers.
