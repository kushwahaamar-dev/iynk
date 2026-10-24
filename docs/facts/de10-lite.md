# Terasic DE10-Lite fact sheet

**Product modelled:** Terasic **DE10-Lite** ("Altera MAX10 Development & Education Board"), manufacturer Terasic Inc. (Hsinchu, Taiwan), schematic revision **B1** (dated 20 January 2017) [2]. FPGA: Intel (Altera) **MAX 10 10M50DAF484C7G** [1][2]. User manual: Terasic "DE10-Lite User Manual", footer date 17 October 2022, listed on the product page as version 1.7 [1][4].

**What it is.** A 97.5 x 80 mm (see section 2 for the caveat) blue teaching board built around a 50K-LE MAX 10 FPGA in a 484-ball FBGA. Everything the student touches is wired straight to FPGA pins: 10 slide switches, 10 red LEDs, 2 debounced push buttons, six common-anode 7-segment digits, a 4-bit-per-colour VGA port, 64 MB of SDRAM, an ADXL345 accelerometer, an Arduino Uno R3 header (with the MAX 10's on-die 12-bit ADC behind the analog pins) and a 2x20 GPIO header. An on-board **USB-Blaster** (the original USB-Blaster design, an FTDI FT245BL plus a MAX II EPM240 CPLD; **not** a USB-Blaster II) on a USB Type-B socket powers and programs the board [1][2]. The board has **no power switch and no barrel jack**: it is powered from the USB-B port, or from an optional 2-pin 5 V header [1][2]. It is programmed only with Intel Quartus Prime (Verilog/VHDL), never with Arduino or MicroPython.

> Corrections to the task brief: the on-board programmer is a USB-Blaster (FT245BL + EPM240T100), not a USB-Blaster II [2][1 sec. 3.1 "USB-Blaster [USB-0]"]. There is no power switch and no DC barrel jack on the DE10-Lite [1 Fig. 1-2][2 sheet 16]; power comes from the USB-B socket or the "5V/GND 2-Pin Header".

---

## 1. Sources

1. Terasic, *DE10-Lite User Manual* (PDF, 74 pages, footer "October 17, 2022"; product page lists it as v1.7, 6,089 KB). Downloaded from the Terasic product page. Used for: features list, every pin table (Tables 3-2 to 3-13), status LEDs (Table 3-1), clock circuit, switch/LED/button polarity, 7-segment polarity, ADC front-end scaling, VGA timing, ADXL345 I2C addresses, factory configuration (sec. 5.1), demos, CFM programming and JP5 (chapter 6), and the annotated top-view photo (Fig. 1-2) used for every position estimate. https://www.terasic.com.tw/cgi-bin/page/archive.pl?Language=English&No=1021 (download link "DE10-Lite User Manual").
2. Terasic, *DE10-Lite schematic*, "terasic_max10_release_b1", Rev B1, 18 sheets, dated 20 Jan 2017 (mirror at University of Florida): https://mil.ufl.edu/3701/docs/DE10/DE10-Lite_Schematic.pdf . Used for: regulators (LTC3612 x2, LTC3025-1 x2), voltage reference (REF3125), over-voltage protection (AO3415, BZX84C5V1), Schottky diodes (PMEG2010AEB), clock generator (CDCE937 + 24 MHz crystal), USB-Blaster parts (FT245BL, EPM240T100, TPD2EUSB30), button debouncer (SN74AUC17), LED and segment resistor values, ADC op-amps (MCP6244), mounting holes MH1-MH4. (Status LED colours are not in the schematic text; checked by the fact-checker.) Text was extracted with pdftotext; component placement on sheets is jumbled in text form, so wiring details are marked where uncertain.
3. Terasic System Builder output `DE10_LITE_Golden_Top.qsf` / `.v` / `.SDC` ("Build by Terasic System Builder", ORIGINAL_QUARTUS_VERSION 15.1.0, created 17 June 2016), as committed unmodified-in-pins in https://github.com/janaite/fpga-de10lite-golden-top (raw files `DE10_LITE_Golden_Top.qsf`, `.v`, `.sdc`). Used for every pin name and I/O standard. All 185 location assignments in this qsf were cross-checked by script against the user manual tables [1]: **185 of 185 agree** (the manual's GSENSOR_INT2 = qsf GSENSOR_INT[2]).
4. Terasic DE10-Lite product page (resources tab): https://www.terasic.com.tw/cgi-bin/page/archive.pl?Language=English&No=1021&PartNo=4 . Used for manual version/date and the existence of 3D-printable top and bottom case files (login-gated, not downloaded).
5. Intel/Altera MAX 10 documentation (MAX 10 FPGA Device Datasheet, MAX 10 Analog to Digital Converter User Guide, MAX 10 FPGA Configuration User Guide), https://www.intel.com/content/www/us/en/products/details/fpga/max/10/docs.html . Used (from prior knowledge, not re-fetched this run) for I/O absolute maximums, ADC and configuration behaviour. Items taken from it are marked "(MAX 10 datasheet, not re-checked)".
6. Altera Solutions Partner listing "MAX 10 Device Family DE10-Lite Board", https://www.altera.com/asap/offering/po-2853/max-10-device-family-de10-lite-board . Form factor "97.5*80.0 mm" (seen in search-engine extract; the page itself returned HTTP 403 to direct fetch).
7. Analog Devices ADXL345 datasheet (Rev. G), https://www.analog.com/media/en/technical-documentation/data-sheets/ADXL345.pdf . Register addresses and package (from prior knowledge, not re-fetched).
8. Altera community forum, "device programming failure" (10M50DAF484, Quartus error 209015 "expected JTAG ID code 0x031050DD ... found 0x00000000"): https://community.altera.com/discussions/fpga-device/device-programming-failure/265099 . Used for the 10M50DA JTAG IDCODE and a real chain-failure message.
9. Quartus Prime Lite 25.1 release report (blog, 2025-11-03, adds USB-Blaster III support): https://zenn.dev/elecoeel/articles/c752181edf6100 ; Intel 24.1std release notes: https://www.intel.com/content/www/us/en/docs/programmable/683593/24-1std/new-features-and-enhancements.html . Used for current Quartus Lite version.

---

## 2. Geometry (board frame)

**Board frame.** Component side up, held as in the manual's top-view photo (Fig. 1-2 of [1]): the **7-segment displays and the slide switches are along the bottom edge**, the 2x20 GPIO header along the top edge, the USB-B socket on the left edge and the VGA D-sub on the right edge. In this orientation the LEDR/SW/KEY labels and the 7-segment digits are upright. (The large "DE10-Lite" logo is printed rotated 90 degrees, reading bottom-to-top, so it cannot be used to define "readable"; the digits and the switch labels define it.) Origin = bottom-left corner of the outline, +x right, +y up, mm.

**How positions were obtained.** Terasic does not publish board CAD (no .brd/.kicad_pcb/centroid file; the 3D case files are login-gated). All x, y values below are **(estimated from the top-view photo, Fig. 1-2 of [1])**: the 800 x 525 px JPEG embedded in the PDF was extracted, the board outline was found by pixel colour (x 193-652 px, y 132-497 px) and scaled to 97.5 x 80.0 mm (0.2124 mm/px in x, 0.2192 mm/px in y). Checks: the SDRAM TSOP-II (22.2 mm body) measures 22 mm; the two Arduino header rows measure 49.1 mm apart (Uno standard 48.26 mm). Expect errors of about +-1.5 mm, and more for tall parts (the photo is slightly oblique, so tall parts such as the GPIO box header appear shifted toward the top edge).

### Outline and holes

| Item | Value | Source |
|---|---|---|
| Outline | **97.5 x 80.0 mm** rectangle | [6]. Photo aspect ratio gives about 98-100 x 80 mm, consistent within error. A third-party page (Cirkit Designer) says 99 x 64 mm; rejected (64 mm contradicts the photo and it also wrongly says USB-Blaster II). |
| Corner radius | small, about 1 mm or square (estimated from photo) (unverified) | photo |
| PCB thickness | 1.6 mm (unverified, typical Terasic) | - |
| Mounting holes | 4 (MH1-MH4 on schematic sheet 16 [2]); plated, gold ring | [2], photo |
| Hole centres | top-left (2.8, 77.8); top-right (94.3, 77.8); bottom-left (13.4, 18.6); bottom-right (82.2, 19.7) (estimated from photo) | photo |
| Hole diameter | about 3.2 mm drill, about 6 mm gold pad ring (estimated from photo) | photo |

Note: the top-left/top-right holes sit very close to the corners (about 3 mm from the side and top edges). The two lower holes are inboard: the bottom-left hole is just above the 7-segment displays, beside the Arduino power header; the bottom-right hole is just above the gap between LEDR3 and LEDR2, right of test points TP1/TP2.

**Colours.** Solder mask: **blue** (Terasic royal blue). Silkscreen: **white**. Pads/holes: gold (ENIG). Headers: black plastic. Slide switches: black body with black lever on a white/grey frame. 7-segment displays: grey/white faces with light segments (red when lit; the displays look grey when off). VGA: HD15 D-sub with a metal shell (insulator colour not visible in the photo; blue is the PC99 VGA colour, unverified for this part). USB-B: metal shell. JP6 power header: white plastic housing.

### Parts (centres estimated from the photo unless stated)

| Ref | What | Package / size | Centre (x, y) mm | Rot | Height | Colour / marking |
|---|---|---|---|---|---|---|
| U5 (schematic "U5x" sub-parts) | MAX 10 FPGA 10M50DAF484C7G | 484-ball FBGA, 23 x 23 mm [5] | (50.8, 43.2) | 0 | about 1.35-2.2 mm (unverified: Arrow's distributor listing for 10M50DAF484 gives 1.35 mm package height; Intel's package drawing not checked) | Black lid, Intel/Altera "MAX 10" logo, marking "10M50DAF484C7G" plus date/lot code |
| U4 (unverified ref) | 64 MB SDRAM, 32M x 16 | TSOP-II 54, 22.2 x 10.2 mm body, long axis along x | (18.5, 38.4) | 0 | 1.2 mm | Black; ISSI IS42S16320D-7TL (unverified part number; manual only says 64MB 32Mx16 [1]) |
| U10 | USB-Blaster CPLD, Altera MAX II EPM240T100 | TQFP-100, 14 x 14 mm body, 16 x 16 mm over leads | (23.6, 58.1) | 0 | 1.2 mm | Black, "MAX II" logo, "EPM240T100..." |
| U2 | USB FIFO FTDI FT245BL | LQFP-32, 7 x 7 mm | near (12, 60) between USB-B and the CPLD (unverified position) | - | 1.4 mm | Black, "FTDI FT245BL" |
| U11 | TI TPD2EUSB30 USB ESD protection | tiny DRT-3 | beside J3 (unverified position) | - | 0.5 mm | - |
| U3 | TI CDCE937 programmable clock generator | TSSOP-20 | near the FPGA (unverified position) | - | 1 mm | - |
| Y1 | 24.00 MHz crystal for U3 | small SMD crystal | next to U3 (unverified position) | - | 0.8 mm | metal lid |
| U? (ADXL345) | 3-axis accelerometer ADXL345 | LGA-14, 3 x 5 x 1 mm [7] | (44.0, 61.6) | 0 (unverified) | 1.0 mm | Grey/black, tiny "345B" style marking (unverified) |
| U6, U7 | LTC3612 3 A synchronous buck (1.2 V and 3.3 V) | 3 x 4 mm QFN (UDC-20) | lower-left area near the SDRAM (unverified position) | - | 0.75 mm | - |
| L5, L6 | 470 nH power inductors (Panasonic) | small SMD | next to U6/U7 | - | about 2 mm | grey |
| C18 (330 uF, 1.2 V rail), C145/C29 (100 uF, 3.3 V rail) | polymer capacitors (Panasonic 2R5TPE330MAZB, 6TPE100MAZB) | SMD tantalum-polymer blocks | near regulators | - | about 2 mm | black |
| REG1, REG2 | LTC3025-1 LDO (2.5 V, 1.8 V) | 2 x 2 mm DFN | - | - | 0.75 mm | - |
| U12 | TI REF3125 2.5 V reference (ADC VREF) | SOT-23 | - | - | 1 mm | - |
| U8, U9 | Microchip MCP6244-E/SL quad op-amp (ADC front end) | SOIC-14 | between FPGA and the Arduino power header, near (60-70, 30) (estimated) | - | 1.5 mm | black |
| U14 | TI SN74AUC17 hex Schmitt-trigger buffer (KEY debounce) | small TSSOP/VSSOP (unverified) | near the buttons (unverified) | - | - | - |
| J3 | USB Type-B receptacle, through-hole, right-angle | about 12 mm wide (y) x 16 mm deep (x), 11 mm tall | (1.1, 57.0); **overhangs the left edge by about 5 mm** (opening faces -x) | - | 11 mm | Nickel shell |
| J1 | 2x5 JTAG header footprint "JTAG to MAX10 (2.5V)", **not populated (DNI)** | 2x5, 2.54 mm | (6.4, 69.9), long axis along x | - | 0 (holes only) | silkscreen "J1" |
| VGA (ref unverified) | 15-pin high-density D-sub, female, right-angle | shell about 31 mm long (along y) | (92.2, 60.7); **face overhangs the right edge by about 7 mm** (opening faces +x) | 90 | about 12.5 mm | metal shell, two hex screw posts (insulator colour unverified) |
| JP1 | 2x20 GPIO box header | 2x20, 2.54 mm; box about 61 x 9 mm | centre about (47.0, 77.8), long axis along x; the two pin rows at y = 79.1 and 76.5, pins from x = 22.9 to 71.2 (19 pitches = 48.26 mm); the black box body (about 18.5 to 77.5 in x) appears to overhang the top edge by about 2 mm (all estimated from photo; may be photo perspective) | 0 | about 9 mm | black shrouded header, key notch; silkscreen "JP1" at the right end, "GPIO" vertical at the right |
| Arduino digital header (JP2 10-pin + JP3 8-pin per schematic sheet 13, unverified split) | female sockets, 1 x 10 and 1 x 8, 2.54 mm | single row along x at y = 68.2, from x = 22.7 (SCL end) to 71.2 (D0 end) | 0 | 8.5 mm | black |
| Arduino power + analog headers (JP7 8-pin power, JP8 6-pin analog A0-A5, unverified split) | female sockets 1 x 8 and 1 x 6 | row along x at y = 19.1, from x = 32.1 to 71.2 (A5 at the right end) | 0 | 8.5 mm | black |
| 1x2 reserved analog header ADC_IN6/7 (designator unverified; JP4 by schematic text proximity) | not mounted [1 sec. 3.7] | - | - | - | holes only |
| JP5 | CONFIG_SEL / BOOT_SEL 2-pin header, **not fitted** ("solder the JP5 2-pin header yourself") [1 ch. 6] | 1x2, 2.54 mm | position unverified (photo shows a small header highlighted near (71, 44)) | - | - | - |
| JP6 | "5V/GND 2-Pin Header" external 5 V input, silkscreen "DC 5V" | 2-pin, white housing | (2.3, 22.6), at the left edge | - | about 6 mm | white |
| HEX5 ... HEX0 | six 7-segment digits, common anode, each with DP | three dual-digit-looking blocks (estimated) spanning x = 0 to 48.2, y = 0 to about 15; digit pitch about 8 mm | left to right: HEX5, HEX4, HEX3, HEX2, HEX1, HEX0 (HEX0 = rightmost, unverified but Terasic convention) | 0 | about 7 mm | grey face, red segments |
| LEDR9 ... LEDR0 | 10 red SMD LEDs | 0603 (unverified) | one row at y = 15.3; x from 49.9 (LEDR9) to 93.3 (LEDR0), pitch about 4.8 mm | 0 | 0.6 mm | red when lit; labels "LEDR9" ... "LEDR0" above each |
| SW9 ... SW0 | 10 slide switches (SPDT), lever moves along y | about 4 x 9 mm | one row, centre y = 6.6, same x as the LED above each (SW9 at x = 49.9 ... SW0 at x = 93.3); the switch bodies reach the bottom edge | 0 | about 5 mm with lever | black; labels "SW9" ... "SW0" |
| KEY0, KEY1 (BTN0, BTN1 on schematic) | 6 x 6 mm tactile push buttons | 6 x 6 mm | upper button (91.8, 29.6), lower button (91.8, 20.8); silkscreen "KEY0" over "KEY1" printed to the left, between the two buttons, so upper = KEY0, lower = KEY1 is the likely reading (unverified) | 0 | about 5 mm | black body, black/grey round plunger |
| D1 "LOAD" (ULED) | LED (colour unverified; green assumed), USB-Blaster active | 0603 | (11.9, 74.5) | - | 0.6 mm | silkscreen "LOAD" |
| D2 "CONF" (CONF_DONE) | LED (colour unverified) | 0603 | (17.8, 74.5) | - | 0.6 mm | silkscreen "CONF" |
| D3 "5V" | LED, **not installed** [1 Table 3-1] | 0603 | (2.8, 45.4) | - | - | pads only, silkscreen "5V" |
| D4 "POWER GOOD" | LED (colour unverified) | 0603 | (4.0, 42.7) | - | 0.6 mm | silkscreen "POWER GOOD" |
| TP1, TP2 | test points | through-hole rings | (74.8, 20.6), (78.0, 20.6) | - | - | silkscreen "TP1", "TP2" |

### Silkscreen a faithful drawing should show
- "DE10-Lite" in large bold italic white letters, rotated 90 degrees (reads bottom to top), left of the FPGA at about (35, 39).
- "terasIC" logo with the tagline under it, at about (44, 26).
- Altera "UNIVERSITY PROGRAM" logo above the FPGA, at about (58, 59).
- Status LED labels "LOAD", "CONF" (top-left), "5V", "POWER GOOD" (left edge).
- "LEDR9" ... "LEDR0" above the LEDs, "SW9" ... "SW0" by the switches, "KEY0", "KEY1" by the buttons.
- "JP1" and "GPIO" by the GPIO header, "J1" by the JTAG footprint, "DC 5V" by JP6, "TP1", "TP2".
- FPGA marking: "MAX 10" logo, "10M50DAF484C7G".

---

## 3. Electrical

### FPGA
- **10M50DAF484C7G**: MAX 10, 50,000 logic elements, 1,638 Kbit M9K RAM, 5,888 Kbit user flash (UFM), 144 18x18 multipliers, 4 PLLs, two ADCs [1]. "DA" = dual-supply (1.2 V core + 2.5 V/3.3 V), analog and flash features; F484 = 484-ball FBGA; C = commercial temperature; 7 = speed grade 7; G = RoHS [5]. (The System Builder qsf contains `DEVICE_FILTER_SPEED_GRADE 6`, a leftover filter; the device line itself is 10M50DAF484C7G [3].)
- Configuration: JTAG (volatile .sof) or internal configuration from the on-chip configuration flash memory (CFM, non-volatile .pof); single or dual compressed images; JP5 selects the boot image for dual-image boot [1 sec. 3.1, ch. 6].
- No hard CPU. Soft CPU = Nios II (Nios V on current Quartus) in Platform Designer (formerly Qsys) [1 sec. 5.2].

### Clocks [1 sec. 3.2][2 sheet 7]
A TI **CDCE937** clock generator (U3), referenced to a **24.00 MHz** crystal (Y1), produces all board clocks: 24 MHz to the USB-Blaster (UBT_CLK_24), **10 MHz ADC_CLK_10** to PLL1/PLL3 (for the ADC), and two **50 MHz** clocks MAX10_CLK1_50 and MAX10_CLK2_50 for user logic. All three FPGA clock inputs are in bank 3B, 3.3-V LVTTL. Terasic warns: "Do not modify the clock generator settings" [1]. The FT245BL also has its own 6 MHz clock (CLK_6MHz net) [2].

### Power tree [2 sheets 16-17][1]
- **Inputs:** (a) USB 5 V from J3 (net VCC5_USB), through Schottky **D6 PMEG2010AEB** (20 V, 1 A) into VCC5; (b) the 2-pin header JP6 ("5V/GND 2-Pin Header", silkscreen "DC 5V"), also through PMEG2010AEB Schottky diodes (D7/D8/D9 on sheet 16; exact diode-to-input wiring not readable from the text extraction). The diodes OR the two sources, so both may be connected (unverified but implied by the diode-OR).
- **Over-voltage protection:** P-MOSFET **Q2 AO3415**, PNP **Q1 HE8550G** and 5.1 V zener **D5 BZX84C5V1** form a cut-off that opens VCC5 when the input exceeds the "Threshold Voltage: 5.4 ~ 5.6 V" printed on the schematic [2].
- **No polyfuse** appears anywhere in the schematic text [2] (unverified that none is fitted). Reverse-polarity protection on the 2-pin header comes only from the series Schottky (see section 6).
- **VCC1P2** (FPGA core): **U6 LTC3612**, synchronous buck, **1.2 V / 3 A**, 2.25 MHz, 1 ms soft start, 470 nH inductor, 330 uF + 100 uF output [2].
- **VCC3P3** (I/O banks, SDRAM, LEDs, switches, headers): **U7 LTC3612**, **3.3 V / 3 A**, 2.25 MHz, 1 ms soft start; VCC3P3_VCCA branch through a 30 ohm/3 A ferrite (L14) [2].
- **VCC2P5** (FPGA VCCA / PLL analog, JTAG bank "JTAG to MAX10 (2.5V)"): **REG1 LTC3025-1** LDO from VCC3P3 (bias from VCC5), **2.5 V / 0.5 A**, 2 ms ramp [2].
- **VCC1P8**: **REG2 LTC3025-1** LDO, **1.8 V / 0.5 A**, 2 ms ramp [2].
- **ADC reference**: **U12 TI REF3125**, 2.5 V [2].
- Power-up sequence printed on the schematic: VCC5 -> VCC2P5, VCC3P3 -> VCC1P2 (the 1.2 V buck is enabled by the 3.3 V regulator's power-good, 3P3_POK) [2].
- Header supply: "Both 5V and 3.3V can provide a total of 5W power" for the GPIO header [1 sec. 3.5]. Practical limit with USB power: the USB port (500 mA from a standard host port = 2.5 W) limits the whole board (inference, not a Terasic figure).

### Logic levels and limits
- All user I/O is **3.3 V** (3.3-V LVTTL in the qsf; KEY[1:0] and ARDUINO_RESET_N use the "3.3 V SCHMITT TRIGGER" standard) [3].
- **Not 5 V tolerant.** MAX 10 absolute-maximum DC input voltage V_I is **-0.5 V to 4.12 V** (MAX 10 datasheet Table 4, "Absolute Maximum Ratings"; same table: DC output current per pin +-25 mA) [5]. The Arduino digital pins are wired directly to FPGA pins [1 sec. 3.6], so 5 V Arduino shields that drive their outputs at 5 V can damage the FPGA. Only the analog pins A0-A5 accept 0-5 V (through the op-amp divider front end).
- Per-pin current: for the 3.3-V LVTTL standard MAX 10 offers only **4 mA or 8 mA** current strength; **8 mA is the maximum** (and the Quartus default, unverified) [MAX 10 GPIO User Guide, "Programmable Current Strength"]. Absolute-maximum DC output current is +-25 mA per pin [5]. The datasheet's 3.3-V LVTTL spec (V_OL 0.45 V / V_OH 2.4 V) is at 4 mA.
- No series resistors on the GPIO header pins are visible in the schematic text (unverified).

### ADC [1 sec. 3.7, 5.6][2 sheet 13]
- MAX 10 dual ADC, 12-bit, up to 1 MSPS accumulative sampling rate per ADC block (shared by the channels it scans) (MAX 10 datasheet ADC table) [5]. The board uses **ADC1** only.
- Arduino **A0-A5 = ADC_IN0-ADC_IN5** on the 1x6 header (JP8); ADC_IN6-ADC_IN7 go to a 1x2 header that is not mounted [1].
- Front end: Microchip **MCP6244** op-amps (U8, U9) buffer each input; the divider makes the ADC voltage **half** of the header voltage, so 0-5.0 V at the header = 0-2.5 V at the ADC [1]. Formula from the manual: `V_in = code / 4095 x 2.5 x 2 = code / 4095 x 5.0` [1].
- Schematic text shows ADC_IN0 -> ADC1IN1, ADC_IN1 -> ADC1IN2, ... (ADC_IN n -> ADC1IN(n+1)) (checked by tracing MCP6244 pin numbers on sheet 13: ADC_IN0 on op-amp D+ pin 12 -> output pin 14 -> R34 -> ADC1IN1; ADC_IN1 on A+ pin 3 -> pin 1 -> R37 -> ADC1IN2; ADC_IN2 -> pin 5/7 -> R36 -> ADC1IN3; ADC_IN3 -> pin 10/8 -> R35 -> ADC1IN4). In the Modular ADC IP, channel 0 is the dedicated ANAIN1 pin and channels 1-8 are ADC1IN1-ADC1IN8, so A0 is Modular ADC **channel 1** (unverified).
- ADC clock: ADC_CLK_10 (10 MHz) must go through PLL1 or PLL3 to the ADC block [1].

### PWM, DAC
- No hardware PWM: PWM is a counter + comparator in HDL on any pin.
- No DAC except the VGA resistor-network DAC (4 bits per colour) [1 sec. 3.8].

### USB-Blaster (programmer) [2 sheet 18][1]
- J3 USB-B -> TPD2EUSB30 ESD -> **FTDI FT245BL** (USB 1.1 full-speed FIFO; EEPROM for the USB descriptors on EEDATA/EESK/EECS) -> **Altera MAX II EPM240T100** CPLD that bit-bangs JTAG to the MAX 10 at 2.5 V. This is the classic USB-Blaster design; Quartus lists it as **"USB-Blaster [USB-0]"** (Windows; Linux shows e.g. "USB-Blaster [1-1]") [1 sec. 3.1]. USB VID:PID 09FB:6001 (Altera USB-Blaster; unverified for this board).
- JTAG chain: one device, the 10M50DA [1 Fig. 3-1, 3-5].
- The 2x5 J1 "JTAG to MAX10 (2.5V)" footprint is unpopulated (DNI) [2].

### LEDs
| Ref | Colour | Name | Driven by | Active | Meaning |
|---|---|---|---|---|---|
| D1 | green (unverified) | ULED, silkscreen "LOAD" | USB-Blaster CPLD | on when lit | "Illuminates when the on-board USB-Blaster is working" [1 Table 3-1]; flickers during programming (unverified) |
| D2 | green (unverified) | CONF_DONE, silkscreen "CONF" | CONF_DONE (via the CPLD net CONF_DONE_DISP) | - | lit when the FPGA is configured [1][2] |
| D3 | (not fitted) | 5V | VCC5 | - | **not installed** [1] |
| D4 | green (unverified) | Power Good | 1P2_POK through a transistor | - | lit when the power system is OK [1][2] |
| LEDR0-LEDR9 | red | user LEDs | FPGA pins (table in section 4) | **active high** | [1]. Series resistor networks RN16-RN18, 330 ohm [2]: about (3.3 - 1.9) / 330 = 4 mA each (inference). |

### Buttons and switches
- **KEY0, KEY1**: tactile buttons (BTN0, BTN1) with 10 k resistors to 3.3 V and 1 uF RC filter capacitors (exact topology not readable from the schematic text), buffered by a **SN74AUC17** hex Schmitt-trigger buffer (U14), so the FPGA sees clean, debounced edges. **Pressed = 0, released = 1 (active low)** [1 Fig. 3-13, 3-14][2]. qsf standard "3.3 V SCHMITT TRIGGER" [3].
- **SW0-SW9**: slide switches, direct to FPGA pins, **not debounced**; UP = 1 (3.3 V), DOWN (toward the board edge) = 0 [1].
- No reset button for the FPGA (the FPGA resets on nCONFIG/power-up). ARDUINO_RESET_N is an Arduino-header signal, read or driven by user logic.

### Sensors and peripherals
- **ADXL345** 3-axis accelerometer (+-2/4/8/16 g, 13-bit full resolution, 3.9 mg/LSB in full-res mode [7]). I2C when GSENSOR_CS_N = 1: address **0x1D** with SDO high (0x3A write / 0x3B read), **0x53** with SDO low (0xA6/0xA7) [1]. SPI 3- or 4-wire when CS_N = 0; Terasic's demos use **3-wire SPI** (set bit SPI in register 0x31 DATA_FORMAT) [1 sec. 5.5]. INT1 and INT2 are wired to the FPGA [3].
- **SDRAM**: 64 MB, 32M x 16, 13 address lines, 2 bank-address lines, 3.3 V LVCMOS signalling [1]. Use the Altera "SDRAM Controller" IP (Platform Designer) [1 sec. 5.2].
- **VGA**: HD15, 4-bit R/G/B resistor DAC, HS/VS direct; 640 x 480 at 60 Hz with a 25 MHz pixel clock [1 Table 3-9/3-10].

---

## 4. Pinout (exact qsf names [3], all cross-checked against the manual [1])

The System Builder top module is `DE10_LITE_Golden_Top` with these ports [3]:

```verilog
module DE10_LITE_Golden_Top(
  input         ADC_CLK_10, MAX10_CLK1_50, MAX10_CLK2_50,
  output [12:0] DRAM_ADDR,  output [1:0] DRAM_BA,
  output        DRAM_CAS_N, DRAM_CKE, DRAM_CLK, DRAM_CS_N,
  inout  [15:0] DRAM_DQ,
  output        DRAM_LDQM, DRAM_RAS_N, DRAM_UDQM, DRAM_WE_N,
  output [7:0]  HEX0, HEX1, HEX2, HEX3, HEX4, HEX5,
  input  [1:0]  KEY,
  output [9:0]  LEDR,
  input  [9:0]  SW,
  output [3:0]  VGA_B, VGA_G, VGA_R,
  output        VGA_HS, VGA_VS,
  output        GSENSOR_CS_N,
  input  [2:1]  GSENSOR_INT,
  output        GSENSOR_SCLK,
  inout         GSENSOR_SDI, GSENSOR_SDO,
  inout  [15:0] ARDUINO_IO,
  inout         ARDUINO_RESET_N,
  inout  [35:0] GPIO
);
```

qsf syntax: `set_location_assignment PIN_A8 -to LEDR[0]` and `set_instance_assignment -name IO_STANDARD "3.3-V LVTTL" -to LEDR[0]` [3]. Global lines: `FAMILY "MAX 10 FPGA"`, `DEVICE 10M50DAF484C7G` [3].

**Slide switches SW[9:0]** (UP = 1, DOWN toward the bottom board edge = 0; not debounced) [1][3]

| qsf name | FPGA pin | I/O standard |
| --- | --- | --- |
| SW[0] | PIN_C10 | 3.3-V LVTTL |
| SW[1] | PIN_C11 | 3.3-V LVTTL |
| SW[2] | PIN_D12 | 3.3-V LVTTL |
| SW[3] | PIN_C12 | 3.3-V LVTTL |
| SW[4] | PIN_A12 | 3.3-V LVTTL |
| SW[5] | PIN_B12 | 3.3-V LVTTL |
| SW[6] | PIN_A13 | 3.3-V LVTTL |
| SW[7] | PIN_A14 | 3.3-V LVTTL |
| SW[8] | PIN_B14 | 3.3-V LVTTL |
| SW[9] | PIN_F15 | 3.3-V LVTTL |

**Red LEDs LEDR[9:0]** (active high: FPGA pin = 1 lights the LED) [1][3]

| qsf name | FPGA pin | I/O standard |
| --- | --- | --- |
| LEDR[0] | PIN_A8 | 3.3-V LVTTL |
| LEDR[1] | PIN_A9 | 3.3-V LVTTL |
| LEDR[2] | PIN_A10 | 3.3-V LVTTL |
| LEDR[3] | PIN_B10 | 3.3-V LVTTL |
| LEDR[4] | PIN_D13 | 3.3-V LVTTL |
| LEDR[5] | PIN_C13 | 3.3-V LVTTL |
| LEDR[6] | PIN_E14 | 3.3-V LVTTL |
| LEDR[7] | PIN_D14 | 3.3-V LVTTL |
| LEDR[8] | PIN_A11 | 3.3-V LVTTL |
| LEDR[9] | PIN_B11 | 3.3-V LVTTL |

**Push buttons KEY[1:0]** (active low: pressed = 0, released = 1; debounced by a Schmitt-trigger buffer) [1][2][3]

| qsf name | FPGA pin | I/O standard |
| --- | --- | --- |
| KEY[0] | PIN_B8 | 3.3 V SCHMITT TRIGGER |
| KEY[1] | PIN_A7 | 3.3 V SCHMITT TRIGGER |
| ARDUINO_RESET_N | PIN_F16 | 3.3 V SCHMITT TRIGGER |

**Clocks** [1][2][3][5]

| qsf name | FPGA pin | Frequency | I/O standard | SDC line in the System Builder project |
| --- | --- | --- | --- | --- |
| MAX10_CLK1_50 | PIN_P11 | 50 MHz | 3.3-V LVTTL | `create_clock -period "50.0 MHz" [get_ports MAX10_CLK1_50]` |
| MAX10_CLK2_50 | PIN_N14 | 50 MHz | 3.3-V LVTTL | `create_clock -period "50.0 MHz" [get_ports MAX10_CLK2_50]` |
| ADC_CLK_10 | PIN_N5 | 10 MHz | 3.3-V LVTTL | `create_clock -period "10.0 MHz" [get_ports ADC_CLK_10]` |

**Seven-segment displays HEX0-HEX5** (common anode; a segment lights when its pin is driven LOW; bit 7 = decimal point). In the qsf each display is an 8-bit bus `HEXn[7:0]`; the manual names them HEXn0..HEXn7 (for example HEX07 = HEX0[7]) [1][3].

| Segment | bit | HEX0 | HEX1 | HEX2 | HEX3 | HEX4 | HEX5 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a | 0 | PIN_C14 | PIN_C18 | PIN_B20 | PIN_F21 | PIN_F18 | PIN_J20 |
| b | 1 | PIN_E15 | PIN_D18 | PIN_A20 | PIN_E22 | PIN_E20 | PIN_K20 |
| c | 2 | PIN_C15 | PIN_E18 | PIN_B19 | PIN_E21 | PIN_E19 | PIN_L18 |
| d | 3 | PIN_C16 | PIN_B16 | PIN_A21 | PIN_C19 | PIN_J18 | PIN_N18 |
| e | 4 | PIN_E16 | PIN_A17 | PIN_B21 | PIN_C20 | PIN_H19 | PIN_M20 |
| f | 5 | PIN_D17 | PIN_A18 | PIN_C22 | PIN_D19 | PIN_F19 | PIN_N19 |
| g | 6 | PIN_C17 | PIN_B17 | PIN_B22 | PIN_E17 | PIN_F20 | PIN_N20 |
| DP | 7 | PIN_D15 | PIN_A16 | PIN_A19 | PIN_D22 | PIN_F17 | PIN_L19 |

**VGA** (4 bits per colour through a resistor-network DAC; all 3.3-V LVTTL) [1][3]

| Signal | bit 0 | bit 1 | bit 2 | bit 3 |
| --- | --- | --- | --- | --- |
| VGA_R[3:0] | PIN_AA1 | PIN_V1 | PIN_Y2 | PIN_Y1 |
| VGA_G[3:0] | PIN_W1 | PIN_T2 | PIN_R2 | PIN_R1 |
| VGA_B[3:0] | PIN_P1 | PIN_T1 | PIN_P4 | PIN_N2 |
| VGA_HS | PIN_N3 |  |  |  |
| VGA_VS | PIN_N1 |  |  |  |

**SDRAM** (all 3.3-V LVTTL) [1][3]

| Signal | FPGA pins (index: pin) |
| --- | --- |
| DRAM_ADDR[12:0] | [0] PIN_U17, [1] PIN_W19, [2] PIN_V18, [3] PIN_U18, [4] PIN_U19, [5] PIN_T18, [6] PIN_T19, [7] PIN_R18, [8] PIN_P18, [9] PIN_P19, [10] PIN_T20, [11] PIN_P20, [12] PIN_R20 |
| DRAM_DQ[15:0] | [0] PIN_Y21, [1] PIN_Y20, [2] PIN_AA22, [3] PIN_AA21, [4] PIN_Y22, [5] PIN_W22, [6] PIN_W20, [7] PIN_V21, [8] PIN_P21, [9] PIN_J22, [10] PIN_H21, [11] PIN_H22, [12] PIN_G22, [13] PIN_G20, [14] PIN_G19, [15] PIN_F22 |
| DRAM_BA[1:0] | [0] PIN_T21, [1] PIN_T22 |
| DRAM_LDQM | PIN_V22 |
| DRAM_UDQM | PIN_J21 |
| DRAM_RAS_N | PIN_U22 |
| DRAM_CAS_N | PIN_U21 |
| DRAM_CKE | PIN_N22 |
| DRAM_CLK | PIN_L14 |
| DRAM_WE_N | PIN_V20 |
| DRAM_CS_N | PIN_U20 |

**ADXL345 accelerometer** (all 3.3-V LVTTL) [1][3]

| Signal | FPGA pin | Function |
| --- | --- | --- |
| GSENSOR_CS_N | PIN_AB16 | CS: 1 = I2C enabled / SPI idle, 0 = SPI |
| GSENSOR_SCLK | PIN_AB15 | SPI SCLK / I2C SCL |
| GSENSOR_SDI | PIN_V11 | SPI SDI (4-wire), SDIO (3-wire), I2C SDA |
| GSENSOR_SDO | PIN_V12 | SPI SDO (4-wire); I2C address select (1 = 0x1D, 0 = 0x53) |
| GSENSOR_INT[1] | PIN_Y14 | INT1 (output of the ADXL345) |
| GSENSOR_INT[2] | PIN_Y13 | INT2 (output of the ADXL345) |

### 2x20 GPIO header JP1 (odd pins one row, even pins the other; 36 I/O + 5V, 3.3V, 2 GND) [1 Fig. 3-18][3]

| Pin | Schematic name | qsf name | FPGA pin | | Pin | Schematic name | qsf name | FPGA pin |
|---|---|---|---|---|---|---|---|---|
| 1 | GPIO_0 | GPIO[0] | PIN_V10 | | 2 | GPIO_1 | GPIO[1] | PIN_W10 |
| 3 | GPIO_2 | GPIO[2] | PIN_V9 | | 4 | GPIO_3 | GPIO[3] | PIN_W9 |
| 5 | GPIO_4 | GPIO[4] | PIN_V8 | | 6 | GPIO_5 | GPIO[5] | PIN_W8 |
| 7 | GPIO_6 | GPIO[6] | PIN_V7 | | 8 | GPIO_7 | GPIO[7] | PIN_W7 |
| 9 | GPIO_8 | GPIO[8] | PIN_W6 | | 10 | GPIO_9 | GPIO[9] | PIN_V5 |
| 11 | 5V | VCC5 | - | | 12 | GND | GND | - |
| 13 | GPIO_10 | GPIO[10] | PIN_W5 | | 14 | GPIO_11 | GPIO[11] | PIN_AA15 |
| 15 | GPIO_12 | GPIO[12] | PIN_AA14 | | 16 | GPIO_13 | GPIO[13] | PIN_W13 |
| 17 | GPIO_14 | GPIO[14] | PIN_W12 | | 18 | GPIO_15 | GPIO[15] | PIN_AB13 |
| 19 | GPIO_16 | GPIO[16] | PIN_AB12 | | 20 | GPIO_17 | GPIO[17] | PIN_Y11 |
| 21 | GPIO_18 | GPIO[18] | PIN_AB11 | | 22 | GPIO_19 | GPIO[19] | PIN_W11 |
| 23 | GPIO_20 | GPIO[20] | PIN_AB10 | | 24 | GPIO_21 | GPIO[21] | PIN_AA10 |
| 25 | GPIO_22 | GPIO[22] | PIN_AA9 | | 26 | GPIO_23 | GPIO[23] | PIN_Y8 |
| 27 | GPIO_24 | GPIO[24] | PIN_AA8 | | 28 | GPIO_25 | GPIO[25] | PIN_Y7 |
| 29 | 3.3V | VCC3P3 | - | | 30 | GND | GND | - |
| 31 | GPIO_26 | GPIO[26] | PIN_AA7 | | 32 | GPIO_27 | GPIO[27] | PIN_Y6 |
| 33 | GPIO_28 | GPIO[28] | PIN_AA6 | | 34 | GPIO_29 | GPIO[29] | PIN_Y5 |
| 35 | GPIO_30 | GPIO[30] | PIN_AA5 | | 36 | GPIO_31 | GPIO[31] | PIN_Y4 |
| 37 | GPIO_32 | GPIO[32] | PIN_AB3 | | 38 | GPIO_33 | GPIO[33] | PIN_Y3 |
| 39 | GPIO_34 | GPIO[34] | PIN_AB2 | | 40 | GPIO_35 | GPIO[35] | PIN_AA2 |

Which end of JP1 is pin 1 is not stated in the manual text and cannot be resolved from the photo (unverified). Terasic GPIO pins 1 and 3 are labelled "Clock_in" on schematic sheet 13 (GPIO_0 and GPIO_2 go to clock-capable FPGA inputs) [2]. Pins are direct FPGA I/O, 3.3 V only, no level shifting.

### Arduino Uno R3 header [1 Table 3-8][3]

| Arduino position | qsf name | FPGA pin | Terasic "specific feature" |
|---|---|---|---|
| D0 | ARDUINO_IO[0] | PIN_AB5 | RXD |
| D1 | ARDUINO_IO[1] | PIN_AB6 | TXD |
| D2 | ARDUINO_IO[2] | PIN_AB7 |  |
| D3 | ARDUINO_IO[3] | PIN_AB8 |  |
| D4 | ARDUINO_IO[4] | PIN_AB9 |  |
| D5 | ARDUINO_IO[5] | PIN_Y10 |  |
| D6 | ARDUINO_IO[6] | PIN_AA11 |  |
| D7 | ARDUINO_IO[7] | PIN_AA12 |  |
| D8 | ARDUINO_IO[8] | PIN_AB17 |  |
| D9 | ARDUINO_IO[9] | PIN_AA17 |  |
| D10 | ARDUINO_IO[10] | PIN_AB19 | SS |
| D11 | ARDUINO_IO[11] | PIN_AA19 | MOSI |
| D12 | ARDUINO_IO[12] | PIN_Y19 | MISO |
| D13 | ARDUINO_IO[13] | PIN_AB20 | SCK |
| SDA (10-pin header, 2nd from the left, left of AREF) | ARDUINO_IO[14] | PIN_AB21 | SDA |
| SCL (10-pin header, leftmost) | ARDUINO_IO[15] | PIN_AA20 | SCL |
| RESET (power header) | ARDUINO_RESET_N | PIN_F16 | active-low reset, 3.3 V Schmitt trigger standard |

Power/analog side (Arduino order, left to right on the bottom row): (NC), IOREF (= 3.3 V), RESET (ARDUINO_RESET_N), 3.3V, 5V, GND, GND, VIN (VIN wiring unverified), then A0-A5 = ADC_IN0-ADC_IN5. The digital 10-pin header order (left to right) is SCL, SDA, AREF, GND, D13 ... D8; what AREF connects to on the DE10-Lite is unverified. Analog side: (0-5 V, halved to the ADC) [1 sec. 3.6, 3.7]. **IOREF is 3.3 V**, telling shields the logic level is 3.3 V [1].

---

## 5. Programming

- **Toolchain:** Intel/Altera **Quartus Prime Lite Edition** (free; MAX 10 is supported in Lite). Terasic's demos were built with Quartus II 15.1/16.0 [1][3]; latest Lite release found: **Quartus Prime Lite 25.1std** (released November 2025 per [9]; 24.1std release notes at [9]); no 2026 Lite release was found (Pro 26.1 exists but Pro does not support MAX 10). Quartus Prime Lite runs on Windows and Linux only (no macOS).
- **New project:** either Terasic **System Builder** (DE10-Lite System CD, generates `.qpf`, `.qsf` with all pins, `.v` top, `.sdc`) [1 ch. 4], or the Quartus New Project Wizard with device **10M50DAF484C7G** and pin assignments imported from the Terasic qsf.
- **Compile messages** (Quartus Prime; exact message IDs from memory, unverified): `Info: Quartus Prime Analysis & Synthesis was successful. 0 errors, N warnings`, then Fitter, Assembler (`Info: Quartus Prime Assembler was successful`), Timing Analyzer, and finally `Info (293000): Quartus Prime Full Compilation was successful. 0 errors, N warnings`. Output: `output_files/<project>.sof` (and `.pof` if internal configuration is set up).
- **Programming over JTAG (volatile):** Tools > Programmer > Hardware Setup > **USB-Blaster [USB-0]** > Auto Detect > select **10M50DA** > Change File (.sof) > tick Program/Configure > Start [1 sec. 3.1]. Progress bar reads "100% (Successful)". Console messages (from memory, unverified): `Info (209060): Started Programmer operation at ...`, `Info (209016): Configuring device index 1`, `Info (209017): Device 1 contains JTAG ID code 0x031050DD` (IDCODE 0x031050DD for the 10M50DA confirmed by [8]), `Info (209007): Configuration succeeded -- 1 device(s) configured`, `Info (209011): Successfully performed operation(s)`, `Info (209061): Ended Programmer operation at ...`. `jtagconfig` prints `1) USB-Blaster [USB-0]` / `031050DD   10M50DA(.|ES)/10M50DC` (unverified).
- Command line: `quartus_pgm -c "USB-Blaster [USB-0]" -m JTAG -o "p;output_files/top.sof"`; for flash: `quartus_pgm -c "USB-Blaster [USB-0]" -m JTAG -o "pv;output_files/top.pof"` (syntax standard Quartus; Terasic's test.bat/program.bat wrap these) (unverified exact Terasic batch contents).
- **Internal flash (non-volatile):** set Assignments > Device > Device and Pin Options > Configuration > Configuration scheme "Internal Configuration", mode "Single Compressed Image" (or "Single Uncompressed Image with Memory Initialization" if M9K init or UFM is needed), compile, program the **.pof** (CFM0) [1 ch. 6]. The design then loads from CFM at every power-up. Dual-image boot needs the Dual Configuration IP and the JP5 header [1].
- A .sof programmed over JTAG is lost at power-off; the factory .pof in flash comes back.
- **No auto-reset, no bootloader, no serial console**: the USB link is JTAG only. A UART for printf needs JTAG UART (Nios) or an external USB-serial on Arduino_IO0/1.
- **Factory design** ("Default", DE10_LITE_Default.sof/.pof) [1 sec. 5.1]: "the 7-segment displays are showing a sequence of characters, and the red LEDs are blinking"; with **SW0 up**, tilting the board makes the LEDs act as a spirit level ("gradienter") using the ADXL345; **pressing KEY0 lights all LEDs and all segments**; a VGA monitor shows a colour picture. Restore with `\Default\demo_batch\program.bat` (programs the CFM) [1].

---

## 6. Real failure modes

| Fault | What happens physically | What the user sees |
|---|---|---|
| Reverse polarity on JP6 (5V/GND header) | The series Schottky (PMEG2010AEB) blocks; nothing powers from JP6 (diode rated 20 V reverse) [2] | Board stays dark (if no USB). No damage at 5 V reversed. |
| Reverse polarity on USB | Not possible with a standard cable (keyed USB-B). | - |
| Over-voltage on 5 V input (e.g. 9 V or 12 V on JP6) | The AO3415/zener OVP opens VCC5 above about 5.4-5.6 V [2]. Above the MOSFET's rating (AO3415: -20 V V_DS, unverified) the protection itself can fail | Board will not power up; POWER GOOD (D4) off. Far over-voltage: hot/burnt MOSFET, smell. |
| Brown-out / weak USB | MAX 10 has a power-on reset (POR) monitor; if VCC drops it resets and reconfigures from CFM when power returns (MAX 10 datasheet, not re-checked) [5]. No user-set BOD threshold as on AVRs. | LEDs and 7-seg blank, CONF LED goes out, design restarts. USB-Blaster drops off (LOAD LED off) if 5 V sags. |
| Over-current on 3.3 V (shorted header pin to GND while driven high, or too many LEDs from header pins) | The LTC3612 has current limit and thermal shutdown (about 3 A+ rated) [2]; a single FPGA pin is limited by its drive strength (8 mA, the maximum 3.3-V LVTTL setting on MAX 10; 4 mA is the only other option) | A shorted output pin just sits low; pin gets warm. Sustained over-current on a pin can damage that I/O cell. |
| Shorting 5 V to GND on the GPIO/Arduino header | Draws from USB through the Schottky diode; no polyfuse on the board [2], so the host port's own current limit (most PCs) trips, or the diode/trace heats | USB device disconnects (Windows "USB device not recognized" / port over-current warning), all LEDs off; release short and replug. |
| 5 V into a 3.3 V FPGA pin (Arduino 5 V shield, 5 V sensor) | Exceeds the MAX 10 absolute maximum (4.12 V); the pin's clamp diode conducts into VCCIO; repeated or sustained it destroys the I/O or latches up | Usually works for a while, then that pin reads stuck, the FPGA gets hot, or configuration fails. No smoke at small currents. |
| More than 5 V on A0-A5 | The front end halves it; above 5 V the ADC saturates at 4095; the op-amp (MCP6244, 3.3 V supply, unverified) clamps | Reading pegged at 4095 / "5.00 V". |
| Cold solder joint (e.g. on a header pin, a slide switch or the USB-B socket) | Intermittent contact | Switch or GPIO bit flickers; USB-Blaster drops out when the cable is moved ("Unable to scan device chain", "JTAG chain broken"). |
| JTAG chain dead (no power to FPGA, bad cable, damaged FPGA) | Programmer reads all zeros | "Error (209015): Can't configure device. Expected JTAG ID code 0x031050DD for device 1, but found JTAG ID code 0x00000000." (wording per [8], approximate) |
| Wrong device chosen in the project | Programmer refuses the .sof | "Error (209025): Can't recognize silicon ID for device 1" or "device doesn't match" style message (unverified wording). |
| No USB-Blaster driver / no udev rule (Linux) | Hardware Setup list empty | "No hardware" in Programmer; `jtagconfig` says "No JTAG hardware available". |

**Beginner traps specific to this board**
- **KEY is active low**: `assign LEDR[0] = KEY[0];` lights the LED when the button is *released*. Use `~KEY[0]`.
- **7-segment is active low** (common anode): a decoder written for active-high segments shows the inverse pattern; all-zeros = "8." with DP.
- Forgetting pin assignments (no qsf): Quartus places I/O randomly and warns "Critical Warning (169085): No exact pin location assignment(s) for N pins" (message ID unverified); nothing lights.
- Leaving unused outputs: Quartus default "unused pins as input tri-stated with weak pull-up" (default for MAX 10, unverified), so undriven HEX segments are dark (pull-up = off for active-low). If a HEX bus is declared but not driven, Quartus ties it to GND and every segment lights.
- Expecting the .sof to survive power-off; it does not (use .pof).
- Using the 50 MHz clock for VGA without dividing: VGA needs 25 MHz (divide by 2 or use a PLL at 25.175 MHz).
- SW are not debounced; using a switch as a clock gives multiple edges.
- 5 V Arduino shields: the digital pins are 3.3 V only.
- Quartus Lite is Windows/Linux only; macOS users need a VM.

---

## 7. Lesson facts (Verilog, real qsf names)

All lessons use the System Builder port names [3]. Clock: `MAX10_CLK1_50` (PIN_P11).

**Lesson 1 - Blink / switches to LEDs**
```verilog
module top(input MAX10_CLK1_50, input [9:0] SW, output [9:0] LEDR);
  reg [25:0] cnt = 0;
  always @(posedge MAX10_CLK1_50) cnt <= cnt + 1'b1;
  assign LEDR[9]   = cnt[25];   // 50 MHz / 2^26 = 0.745 Hz blink
  assign LEDR[8:0] = SW[8:0];   // switch up = LED on
endmodule
```
For exactly 1 Hz: count to 24_999_999 and toggle. The module name must match the qsf TOP_LEVEL_ENTITY (the System Builder `.v` module is DE10_LITE_Golden_Top; note the mirrored qsf in [3] has been edited to `TOP_LEVEL_ENTITY top`, LAST_QUARTUS_VERSION 20.1, so check your own qsf); port names must match the qsf pin names exactly, or the pins stay unassigned.

**Lesson 2 - Button and sensor**
- Button: `assign LEDR[0] = ~KEY[0];` (active low, already debounced by hardware). Edge detection: register KEY, `wire press = key_q & ~KEY[0];` (falling edge = press).
- 7-segment decoder (active low, bit order {DP,g,f,e,d,c,b,a} = HEXn[7:0]):
```verilog
function [6:0] seg7(input [3:0] v); // returns {g,f,e,d,c,b,a}, active low
  case (v)
    4'h0: seg7 = 7'b1000000; 4'h1: seg7 = 7'b1111001; 4'h2: seg7 = 7'b0100100; 4'h3: seg7 = 7'b0110000;
    4'h4: seg7 = 7'b0011001; 4'h5: seg7 = 7'b0010010; 4'h6: seg7 = 7'b0000010; 4'h7: seg7 = 7'b1111000;
    4'h8: seg7 = 7'b0000000; 4'h9: seg7 = 7'b0010000; 4'hA: seg7 = 7'b0001000; 4'hB: seg7 = 7'b0000011;
    4'hC: seg7 = 7'b1000110; 4'hD: seg7 = 7'b0100001; 4'hE: seg7 = 7'b0000110; 4'hF: seg7 = 7'b0001110;
  endcase
endfunction
assign HEX0 = {1'b1, seg7(SW[3:0])};   // DP off (1 = off)
```
- Sensor: ADXL345 via SPI. Terasic's GSensor demo uses 3-wire SPI and reads X-axis data (registers DATAX0 0x32 / DATAX1 0x33) after writing DATA_FORMAT 0x31; POWER_CTL 0x2D bit 3 (Measure) = 1 to start; DEVID register 0x00 reads 0xE5 [7][1 sec. 5.5]. SPI mode 3 (CPOL = 1, CPHA = 1) [ADI AN-1077], max 5 MHz SCLK [7] (5 MHz seen only as a forum quote of the datasheet this run; unverified); read = bit 7 of the address byte set, multi-byte = bit 6 set.

**Lesson 3 - PWM and analog**
- PWM brightness on LEDR from SW:
```verilog
reg [7:0] pwm_cnt;
always @(posedge MAX10_CLK1_50) pwm_cnt <= pwm_cnt + 1'b1; // 50 MHz / 256 = 195 kHz
assign LEDR[0] = (pwm_cnt < {SW[7:0]});
```
- ADC: instantiate the **Modular ADC core** (Intel IP "Modular ADC core", or the "altera_modular_adc" in Platform Designer) with ADC_CLK_10 through an ALTPLL/ALTPLL IP output; read Arduino A0 = channel 1 (unverified mapping, see section 3); volts = code x 5.0 / 4095 [1 sec. 5.6]. Terasic's ADC_RTL demo selects the channel with SW[2:0] and shows the voltage on HEX [1].

**Lesson 4 - Protocol: VGA 640 x 480 @ 60 Hz** [1 Table 3-9, 3-10]
- Pixel clock 25 MHz (divide 50 MHz by 2, or PLL 25.175 MHz).
- Horizontal: sync a = 96, back porch b = 48, visible c = 640, front porch d = 16 -> 800 clocks/line. Vertical: sync 2, back porch 33, visible 480, front porch 10 -> 525 lines. HS and VS are **active low** [1]. RGB must be 0 outside the visible area [1].
- Outputs: VGA_R[3:0], VGA_G[3:0], VGA_B[3:0], VGA_HS, VGA_VS.
- Alternative protocol lesson: ADXL345 SPI (above) or UART TX on ARDUINO_IO[1] (TXD) at 115200 baud (50e6 / 115200 = 434 clocks per bit).

**Tools/IP versions:** Quartus Prime Lite 25.1std [9]; IP: ALTPLL (MAX 10 PLL), Modular ADC core, SDRAM Controller (Platform Designer), JTAG UART. Nios II was deprecated by Intel in favour of Nios V from Quartus 23.x on (unverified for Lite on MAX 10).

---

## 8. Internals (for the see-through view)

- **MAX 10 10M50 (FBGA-484)**: a single silicon die flip-chip/wire-bonded (FBGA uses wire bonds to a laminate substrate under a moulded cap; unverified which for this device) to a BT-laminate substrate with 484 solder balls on a 1.0 mm pitch (22 x 22 array) [5]. On the same die: logic fabric (LABs of 16 LEs), M9K RAM columns, 18x18 multipliers, 4 PLLs, two 12-bit SAR ADC blocks with a temperature-sensing diode, and **on-die flash** (CFM for configuration + UFM for user data). That is why it needs no external configuration flash.
- **SDRAM**: one DRAM die in a 54-pin TSOP-II plastic package, lead frame with gull-wing legs, wire-bonded; 4 internal banks of 8,192 rows x 1,024 columns x 16 bits.
- **USB-Blaster**: FT245BL (USB full-speed transceiver + FIFO + 6 MHz-clocked state machine, descriptors in a small serial EEPROM) talking to an EPM240 MAX II CPLD that shifts JTAG (TCK/TMS/TDI/TDO) to the MAX 10 at 2.5 V.
- **CDCE937**: a PLL clock synthesiser with an EEPROM-stored setup, driven by a **24 MHz quartz crystal** (an AT-cut quartz blank between two electrodes in a sealed metal-lid package).
- **LTC3612 bucks**: each a small QFN with integrated MOSFETs switching at 2.25 MHz into a 470 nH ferrite inductor and polymer capacitors.
- **ADXL345**: a MEMS capacitive proof mass (polysilicon comb structure) and an ASIC in a 3 x 5 mm LGA under a cap.
- **7-segment digits**: each segment is a red LED chip in a reflector cavity behind a diffuser; common anode to 3.3 V, cathodes through 1 k resistor arrays (RN4-RN8, RN22-RN27) to FPGA pins [2] (three 120 ohm arrays RN15/RN19/RN20 also appear on that sheet, next to the SW nets in the text extraction, so they are probably slide-switch series resistors; unverified).
- No RF can (the board has no radio).

---

## 9. Assembly and power-up

- **Manufacture**: SMD reflow of the FPGA (BGA), SDRAM, CPLD, FT245BL, regulators, passives and LEDs; then through-hole: USB-B, VGA D-sub, 2x20 box header, Arduino female headers, slide switches, tactile buttons, 7-segment displays, JP6 (likely selective/wave or hand solder). JP5, J1 and the 1x2 analog header are left unpopulated (DNI) [1][2]. Last: factory test and programming of the default .pof into the CFM [1 sec. 5.1].
- **Power-up** (USB plugged in): 5 V comes up, the 3.3 V and 2.5 V rails ramp (1-2 ms), then 1.2 V; **POWER GOOD (D4)** lights [1][2]. The USB-Blaster enumerates on the host (FT245BL), **LOAD (D1)** lights (USB-Blaster working) [1]. The MAX 10 loads its configuration from internal flash in a few ms; **CONF (D2)** lights; the factory demo starts ("a sequence of characters" on HEX5-HEX0, blinking LEDR; see section 5) [1].

---

## 10. Uncertainties

- **Board dimensions**: 97.5 x 80.0 mm comes from one Altera partner listing seen only through a search extract (page returned 403). The photo is consistent with about 98-100 x 80 mm. Terasic's own manual gives no dimensions; the 3D case files that would confirm it are login-gated.
- **All part positions are estimated from one oblique, 800 px product photo** (+-1.5 mm, worse for tall parts). No CAD or centroid data is published. Corner radius, PCB thickness, hole diameters, connector overhangs are estimates.
- **GPIO JP1 pin-1 end** and the exact Arduino header split (JP2/JP3/JP7/JP8 designators) are unverified.
- **KEY0 vs KEY1 physical order** (upper vs lower) is inferred from silkscreen label order; unverified.
- **HEX0 = rightmost digit** is Terasic convention; not explicitly stated in the extracted text.
- **SDRAM part number** (IS42S16320D-7TL) is not in the schematic text; unverified.
- Positions of U2, U3, U6, U7, U8, U9, U11, U12, U14, Y1 and the ADXL345 designator are unverified.
- Exact JP6 diode wiring and VIN pin wiring on the Arduino power header are not readable from the schematic text extraction.
- ADC_IN n -> ADC1IN(n+1) mapping was checked by op-amp pin-number tracing (fact-check); the Modular ADC channel numbering (A0 = channel 1) is still unverified.
- Quartus message IDs (other than 209015) are from memory, not checked this run. IDCODE 0x031050DD is confirmed only by an Altera forum thread [8]. Quartus Lite 25.1std as latest rests on a blog report [9]; Intel's download page was not checked.
- MAX 10 absolute maximum input voltage (4.12 V) and the 4/8 mA current strength options were checked in the fact-check; whether 8 mA is the Quartus default and the POR behaviour are still unverified.
- Status LED colours (D1, D2, D4) are not stated in the manual or the schematic text; unverified.

---

## Verification

Adversarial fact-check, 24 Oct 2026. Primary sources opened this run: the Terasic DE10-Lite User Manual PDF (footer 17 Oct 2022, product-page version 1.7) downloaded from terasic.com.tw; the Rev B1 schematic PDF (18 sheets) from mil.ufl.edu; the System Builder `DE10_LITE_Golden_Top.qsf/.v/.sdc` from GitHub; and the MAX 10 FPGA Device Datasheet (M10-DATASHEET 2018.06.29). Pins were compared by script: all 222 pins in the sheet's section 4 tables match the qsf, and all 185 manual pin-table entries match the qsf.

| # | Claim | Status | Source | Old -> new (corrections) |
|---|---|---|---|---|
| 1 | FPGA is 10M50DAF484C7G; 50K LE, 1,638 Kbit M9K, 5,888 Kbit UFM, 144 multipliers, 4 PLLs, dual ADC | confirmed | Manual p.5 features list, https://www.terasic.com.tw/cgi-bin/page/archive.pl?Language=English&No=1021 ; qsf `DEVICE 10M50DAF484C7G` | - |
| 2 | Board outline 97.5 x 80.0 mm | confirmed (secondary sources only; Terasic gives no dimensions) | Altera partner listing (search extract) https://www.altera.com/asap/offering/po-2853/max-10-device-family-de10-lite-board ; IPROS listing "97.5x80.0mm" https://mono.ipros.com/en/cg2/Academic%20FPGA%20Board/ ; UBC CPEN211 "98x80mm" https://people.ece.ubc.ca/~lemieux/cpen211.html | - |
| 3 | On-board programmer is the original USB-Blaster (FT245BL + EPM240T100), not USB-Blaster II; Quartus shows "USB-Blaster [USB-0]" | confirmed | Schematic sheet 18 (FT245BL, EPM240T100, TPD2EUSB30) https://mil.ufl.edu/3701/docs/DE10/DE10-Lite_Schematic.pdf ; Manual sec. 3.1 | - |
| 4 | Power from USB-B or a 2-pin 5 V header (JP6); no barrel jack, no switch | confirmed | Manual "5V DC input from USB or external power connector"; schematic sheet 16 (JP6, VCC5_USB, D6 PMEG2010AEB) | - |
| 5 | OVP: AO3415 + HE8550G + BZX84C5V1, threshold 5.4-5.6 V | confirmed | Schematic sheet 16 text "Threshold Voltage : 5.4 ~ 5.6V" | - |
| 6 | Regulators: LTC3612 1.2 V/3 A and 3.3 V/3 A (470 nH, 330 uF/100 uF polymer); LTC3025-1 2.5 V/0.5 A and 1.8 V/0.5 A; REF3125 | confirmed | Schematic sheets 16-17 ("1.2V / 3A", "3.3V / 3A", LTC3612EUDC#TRPBF, "2.5V / 0.5A", "1.8V / 0.5A", LTC3025-1, REF3125, 2R5TPE330MAZB, 6TPE) | - |
| 7 | Clocks: CDCE937 + 24.00 MHz crystal; MAX10_CLK1_50 = PIN_P11, MAX10_CLK2_50 = PIN_N14, ADC_CLK_10 = PIN_N5 (bank 3B, 3.3-V LVTTL); 10 MHz to PLL1/PLL3; SDC lines | confirmed | Manual sec. 3.2 and Table 3-2; schematic sheet 7 (CDCE937PWRG4, "24.00MHz"); golden .sdc | - |
| 8 | LEDR[9:0] pins, active high, 330 ohm arrays RN16-RN18 | confirmed | Manual sec. 3.3 ("driving its associated pin to a high logic level turns the LED on"), Table 3-5; schematic sheet 14 | - |
| 9 | SW[9:0] pins; DOWN (closest to board edge) = 0, UP = 1; not debounced, direct to FPGA | confirmed | Manual sec. 3.3, Table 3-4 | - |
| 10 | KEY0 = PIN_B8, KEY1 = PIN_A7, "3.3 V SCHMITT TRIGGER", active low, debounced (SN74AUC17, 10 k, 1 uF) | confirmed | Manual sec. 3.3, Table 3-3, Fig. 3-13/3-14; schematic sheet 14 (SN74AUC17, R101-R103 10K, 1u) | - |
| 11 | HEX0-HEX5 pins, common anode, segment on = low, bit 7 = DP | confirmed | Manual sec. 3.4 ("common anode", low = on), Table 3-6; qsf | - |
| 12 | Seven-segment decoder table and blink/PWM/UART arithmetic in section 7 | confirmed (checked by hand: all 16 patterns for {g..a} active low; 50e6/2^26 = 0.745 Hz; 50e6/256 = 195 kHz; 50e6/115200 = 434) | derived | - |
| 13 | GPIO JP1 2x20 map incl. pin 11 = 5V, 12 = GND, 29 = 3.3V, 30 = GND; "total of 5W" | confirmed | Manual sec. 3.5, Fig. 3-18 | - |
| 14 | Arduino header ARDUINO_IO[15:0] pins, IOREF = 3.3 V, A0-A5 = ADC_IN0-5 via JP8 | confirmed | Manual sec. 3.6 Table 3-8 ("DC +3.3V (VCC3P3 and IOREF)"), sec. 3.7 | - |
| 15 | ADC front end halves the input: 0-5 V -> 0-2.5 V; V = code/4095 x 5.0 | confirmed | Manual sec. 3.7 and 5.6 | - |
| 16 | ADC_IN n -> ADC1IN(n+1) | confirmed (by MCP6244 pin-number tracing in the schematic text; was "unverified") | Schematic sheet 13 | - |
| 17 | MAX 10 ADC up to 1 MSPS | confirmed, wording refined | MAX 10 datasheet ADC table "Accumulative sampling rate ... 1 MSPS" https://faculty-web.msoe.edu/johnsontimoj/ELE3510/files3510/m10_datasheet.pdf | "1 MSPS per ADC" -> "1 MSPS accumulative per ADC block" |
| 18 | ADXL345 I2C 0x1D (SDO high, 0x3A/0x3B) / 0x53 (SDO low, 0xA6/0xA7); 3-wire SPI in Terasic demo; INT1 = PIN_Y14, INT2 = PIN_Y13 | confirmed | Manual sec. 3.10, sec. 5.5; ADI AN-1077 https://www.analog.com/en/resources/app-notes/an-1077.html (0x53 default, 0x1D alternate; DEVID 0xE5; CPOL = CPHA = 1) | - |
| 19 | ADXL345 max SPI SCLK 5 MHz; 3.9 mg/LSB | unverified (datasheet download timed out; 5 MHz only via a forum quote) | https://forum.arduino.cc/t/arduino-and-adxl345-via-spi/43701 | marked "(unverified)" |
| 20 | MAX 10 absolute-max DC input "about 4.1 V" | corrected (made exact) | MAX 10 datasheet Table 4: V_I -0.5 to 4.12 V; I_OUT +-25 mA per pin | "about 4.1 V" -> "-0.5 V to 4.12 V" |
| 21 | 3.3-V LVTTL "8 mA default ... more possible" | corrected | MAX 10 GPIO User Guide, Programmable Current Strength (3.3 V LVTTL: 8, 4 mA) https://www.intel.com/content/www/us/en/docs/programmable/683751/24-1/programmable-current-strength.html | "8 mA default, more possible" -> "4 or 8 mA only; 8 mA is the maximum" |
| 22 | 64 MB SDRAM 32M x 16, 3.3 V LVCMOS signalling | confirmed | Manual sec. 3.9 | - |
| 23 | SDRAM part IS42S16320D-7TL | unverified (not in manual or schematic text) | - | kept "(unverified)" |
| 24 | VGA 640x480@60, 25 MHz, H 96/48/640/16, V 2/33/480/10; 4-bit DAC; pins | confirmed | Manual Tables 3-9, 3-10, 3-11 | - |
| 25 | Factory demo behaviour (SW0 up = spirit level, KEY0 = all on); restore via \Default\demo_batch\program.bat | confirmed | Manual sec. 5.1 | - |
| 26 | JP5 dual-image boot header, user-soldered; open = image 0, closed = image 1 | confirmed | Manual ch. 6, Table 6-1 | - |
| 27 | 10M50DA JTAG IDCODE 0x031050DD | confirmed | Intel MAX 10 JTAG IDCODE table (dual-supply 10M50, version 0000; via search extract) https://intel.com/content/www/us/en/docs/programmable/683210/current/jtag-idcode.html ; forum https://community.altera.com/discussions/fpga-device/device-programming-failure/265099 | - |
| 28 | Latest Quartus Prime Lite = 25.1std (Nov 2025) | confirmed (no newer Standard/Lite release notes found) | Intel 25.1std release notes https://www.intel.com/content/www/us/en/docs/programmable/683593/25-1std/new-features-and-enhancements.html | - |
| 29 | Status LEDs D1/D2/D4 are green | unverified (colour not in manual Table 3-1 or schematic text) | Manual Table 3-1 | "green" -> "green (unverified)" |
| 30 | FPGA package 23 x 23 mm, 1.0 mm pitch; height about 2.2 mm | 23 x 23 / 1.0 mm confirmed; height unverified | Intel MAX 10 package table (search extract) https://intel.com/content/www/us/en/docs/programmable/683121/current/package-options-and-maximum-user-i-os-46832.html ; Arrow https://www.arrow.com/en/products/10m50daf484i7g/intel.html (1.35 mm) | "about 2.2 mm" -> "about 1.35-2.2 mm (unverified)" |
| 31 | System Builder default TOP_LEVEL_ENTITY DE10_LITE_Golden_Top | corrected (clarified) | golden .v (module DE10_LITE_Golden_Top) vs mirrored qsf (`TOP_LEVEL_ENTITY top`, LAST_QUARTUS_VERSION 20.1) | added a note that the mirrored qsf was edited to `top` |
