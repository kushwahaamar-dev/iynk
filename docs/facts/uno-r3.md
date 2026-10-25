# Arduino UNO Rev3: fact sheet

## 0. Header

| Field | Value |
|---|---|
| Product | Arduino UNO Rev3 (sold as "Arduino UNO R3") |
| Manufacturer | Arduino S.r.l. (made in Italy) |
| SKU / part number | A000066 [1] |
| Design file modelled | `UNO-TH_Rev3e.brd` / `UNO-TH_Rev3e.sch` (Eagle XML) from the official CAD zip [4]. "TH" = the through-hole DIP variant, Rev3e |
| Main MCU | Microchip (ex-Atmel) ATmega328P-PU, DIP-28, in a DIP-28 socket (element `ZU4`) [4][6] |
| USB-serial MCU | ATmega16U2-MU, QFN-32 (element `U3`) [4] |

**What it is.** The UNO Rev3 is a 68.6 x 53.4 mm (official spec; Eagle outline 68.58 x 53.34), 5 V, 16 MHz 8-bit AVR development board. A socketed ATmega328P runs the user's sketch and is
programmed over USB through a serial bootloader (Optiboot). A second AVR, the ATmega16U2, is a USB-to-UART bridge with its own 16 MHz quartz
crystal; it also pulses the 328P's RESET via DTR so uploads start automatically. Power comes from USB (through a 500 mA PTC fuse and a P-MOSFET
switch) or from a 2.1 mm barrel jack / VIN pin (through a series diode and a 1117-type 5 V LDO); an LMV358 comparator picks the source. A 3.3 V
LDO (LP2985-33, 150 mA) feeds the 3V3 header pin only. It exposes 14 digital I/O (6 PWM), 6 analog inputs, I2C, SPI, UART and two ICSP headers.

## 1. Sources

1. Arduino UNO R3 datasheet / user manual, SKU A000066, "Modified: 21/10/2026" — https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf . Features, operating limits (VIN 6-20 V, USB max 5.5 V, -40..85 °C), production BOM (differs from Eagle values, see §3).
2. Arduino UNO R3 schematic PDF — https://docs.arduino.cc/resources/schematics/A000066-schematics.pdf . Cross-check of the Eagle schematic.
3. Arduino UNO R3 full pinout PDF — https://docs.arduino.cc/resources/pinouts/A000066-full-pinout.pdf . Pin functions.
4. Official CAD files zip (Eagle) — https://docs.arduino.cc/static/6bb7a3ca51ebee82a252f60c0b418787/A000066-cad-files.zip . Contains `UNO-TH_Rev3e.brd` and `UNO-TH_Rev3e.sch`. **All coordinates in §2 and all nets in §3 were extracted from these XML files** with a defusedxml script (element `x,y,rot`, transformed pad positions, `<plain>` layer-20 outline wires and arcs, `<hole>` elements, layer 21/25/26 texts; schematic net/pinref walk).
5. ArduinoCore-avr 1.8.8 `boards.txt`, `platform.txt`, `bootloaders/optiboot/` (optiboot.c, Makefile) — https://raw.githubusercontent.com/arduino/ArduinoCore-avr/1.8.8/ . Upload protocol/speed, fuses, bootloader size, Optiboot LED flashes and watchdog.
6. Microchip ATmega48A/PA/88A/PA/168A/PA/328/P datasheet DS40002061B (2020) — https://ww1.microchip.com/downloads/en/DeviceDoc/ATmega48A-PA-88A-PA-168A-PA-328-P-DS-DS40002061B.pdf . Absolute maximum ratings (40 mA per pin, 200 mA VCC/GND), BOD levels (BODLEVEL 101 = 2.5/2.7/2.9 V).
7. Arduino board package index (`package_index.json`, downloads.arduino.cc) — latest `arduino:avr` 1.8.8 with avr-gcc 7.3.0-atmel3.6.1-arduino7 and avrdude 8.0.0-arduino1.
8. avrdude 8.0 source (`stk500.c`, `arduino.c`, `main.c`, `update.c`), GitHub avrdudes/avrdude — exact console strings for the `arduino` programmer.
9. Arduino-usbserial (LUFA) 16U2 firmware source, ArduinoCore-avr `firmwares/atmegaxxu2/` — TX/RX LED handling.
10. Arduino store product photos — https://store.arduino.cc/cdn/shop/files/A000066_03.front_1200x900.jpg . Colours, production silkscreen (only where noted).
11. Arduino forum topic 1187241 (avrdude 6.3 verbose log from an Uno upload) — https://forum.arduino.cc/t/1187241 . Real-world console output.
12. iynk research notes: `docs/research/learn-arduino.md` §2 (27 parts, 6 callouts) and `docs/research/robotics-bench-a.md` §3 (Fig. 01, 24 parts).
13. element14 product page for Bourns MF-MSMF050-2 — https://sg.element14.com/bourns/mf-msmf050-2/fuse-ptc-reset-15v-500ma-1812/dp/2128216 (and nz/au mirrors). Hold/trip/voltage/time-to-trip.
14. element14 product page for onsemi NCP1117ST50T3G — https://sg.element14.com/onsemi/ncp1117st50t3g/ana-sot223-800ma-ldo/dp/2441623 . Dropout 1.07 V typ, 1.2 V max at 800 mA, 20 V input.

## 2. Geometry (board frame)

**Frame.** Component side up, viewed from above, main silkscreen ("UNO", "Arduino", "www.arduino.cc") readable. Origin = bottom-left corner of
the outline's bounding box, +x right, +y up (away from the viewer), mm. This is exactly the Eagle board coordinate system of [4] (no transform
was needed: the brd outline spans x 0..68.58, y 0..53.34 and the "UNO" text is at R0).

- **Left edge (x = 0):** USB-B jack (top-left) and barrel jack (bottom-left), both overhanging.
- **Bottom edge (y = 0):** POWER header and ANALOG IN header.
- **Top edge (y = 53.34):** the two DIGITAL headers.
- **Right edge:** the stepped "Uno shape", ICSP header for the 328P near it.

### 2.1 Outline, holes, board

| Item | Value | Source |
|---|---|---|
| Bounding box | **68.58 x 53.34 mm** (2.700 x 2.100 in). Official tech specs: length 68.6 mm, width 53.4 mm, weight 25 g (docs.arduino.cc/hardware/uno-rev3, verified) | brd layer 20 [4] |
| Outline path (counter-clockwise from bottom-left) | (1,0) → (65.04,0) → R1 arc → (66.04,1) → (66.04,2.54) → 45° chamfer → (68.58,5.08) → (68.58,37.846) → 45° chamfer → (66.04,40.386) → (66.04,51.816) → 45° chamfer → (64.516,53.34) → (1,53.34) → R1 arc → (0,52.34) → (0,1) → R1 arc → (1,0) | brd layer 20 wires + 3 arcs (curve -90) [4] |
| Corner radius | 1.0 mm at bottom-left, top-left and bottom-right (at x 65.04-66.04); top-right is a 1.524 x 1.524 mm 45° chamfer, not a radius | [4] |
| Right-edge "nose" | the strip x 66.04..68.58 exists only for y 2.54..40.386 (with 45° chamfers at both ends, full width 68.58 for y 5.08..37.846) | [4] |
| Thickness | 1.6 mm (unverified: not stored in the brd; standard FR-4 for this board) | — |
| Mounting holes | 4 x **3.2 mm** drill, non-plated holes at **(13.97, 2.54)**, **(15.24, 50.80)**, **(66.04, 7.62)**, **(66.04, 35.56)** | brd `<hole>` [4] |
| Fiducials | FD1 (6.35, 49.911), FD2 (53.84, 16.741), FD3 (3.73, 3.41), 1.02 mm copper dots | [4] |
| Solder mask | teal: median pixel samples of the store photo at bare-mask spots (48,28), (35,9), (62,40) = **#018985, #19847F, #019390**; use ≈ #018A87 (sampled from photo [10], studio lighting) | [10] |
| Silkscreen | white | [10] |
| Bottom side | blue mask, white silk: Italy map outline, "MADE IN ITALY", "designed by ... tinker it" texts (bNames layer 26 in brd), large Arduino logo; pin labels repeated (production) (partly unverified) | [4][10] |

Note the hole at (13.97, 2.54) sits between the barrel-jack and the POWER header; the hole at (15.24, 50.80) sits just left of the digital
header's SCL pin; the two right holes are on the x = 66.04 line, inside the "nose".

### 2.2 Every placed part (from the brd)

`x,y` = element origin from the brd (for symmetric parts this is the package centre). `rot` is the Eagle rotation (R90 = 90° CCW).
`Footprint w x h` = extents of copper + top silkscreen/documentation (tPlace/tDocu) after rotation, in board x by board y. Heights are from part
datasheets or typical values and are marked when not verified.

| Designator | What it is | Package | Centre (x, y) | Rot | Footprint w x h (mm) | Height (mm) | Colour / marking |
|---|---|---|---|---|---|---|---|
| ZU4 | ATmega328P-PU MCU, in DIP-28 socket | DIL28-3 (300 mil) | 46.355, 16.383 | R180 | 37.24 x 9.04 (pads 34.44 x 9.04; pin rows y 20.193 and 12.573) | socket ~4.5 + chip body ~3.4 → top ~8 (estimated, typical) | black epoxy, laser/print "ATMEGA328P-PU", Atmel or Microchip logo, date/lot code; socket black |
| U3 | ATmega16U2-MU USB bridge | MLF32 / QFN-32 5x5 mm | 19.939, 34.671 | R90 | 5.60 x 5.60 | 1.0 (QFN max 1.0) | black, "ATMEGA16U2-MU" (+date code) |
| X2 | USB-B receptacle (through-hole) | PN61729 | 3.81, 38.10 | R270 | 16.00 x 15.52, body x -6.47..9.54, y 30.34..45.86 | ~10.9 (unverified) | nickel-plated steel shell, white/black plastic tongue (estimated from photo) |
| X1 | DC barrel jack 2.1 mm pin / 5.5 mm | POWERSUPPLY_DC-21MM | 5.334, 8.382 | R90 | 15.55 x 11.06, body x -1.87..13.68, y 1.30..12.36 | ~11 (unverified) | black plastic |
| U1 | 5 V LDO NCP1117ST50T3G (Eagle value) | SOT-223 | 7.747, 17.399 | R90 | 8.42 x 6.76 | 1.7 (SOT-223 typ) | black, "1117" type marking (exact marking unverified) |
| U2 | 3.3 V LDO LP2985-33DBVR | SOT-23-5 (DBV) | 21.971, 15.240 | R270 | 3.80 x 3.00 | 1.2 | black, TI code (unverified) |
| U5 | LMV358IDGKR dual op-amp | MSOP-8 / VSSOP-8 (DGK) | 19.05, 20.32 | R90 | 5.43 x 3.40 | 1.1 | black, vendor top-mark code (unverified) |
| T1 | FDN340P P-channel MOSFET (USB power switch) | SOT-23 | 8.128, 26.543 | R270 | 2.92 x 3.05 | 1.0 | black, "340" (unverified) |
| D1 | Reverse-polarity diode, value "M7" (1 A, 1000 V) | SMB (DO-214AA) | 21.59, 2.794 | R180 | 6.80 x 3.91 | ~2.3 | black, white/grey cathode band on the +x (right) end: cathode pad (23.79, 2.794) |
| D2 | Clamp diode RESET→+5V, CD1206-S01575 (1N4148-type) | MiniMELF | 59.436, 27.94 | R270 | 1.80 x 4.80 | 1.6 | glass/black body, cathode band at top (cathode pad (59.436, 29.64)) |
| D3 | Clamp diode RESET2→+5V, CD1206-S01575 | MiniMELF | 13.081, 46.228 | R90 | 1.80 x 4.80 | 1.6 | as D2 |
| F1 | USB polyfuse MF-MSMF050-2, 500 mA hold | 1812 | 4.064, 26.543 | R90 | 3.40 x 5.80 | ~0.85 (unverified) | yellow/olive-green body (estimated from photo) |
| Y1 | 16 MHz quartz crystal for the **16U2** | QS = HC-49/S, through-hole | 18.923, 26.162 | R180 | 7.01 x 4.72 (pads 5.08 mm apart: (21.463, 26.162) and (16.383, 26.162)) | ~3.5-4 (HC-49/S typ 3.5 mm, unverified) | silver metal can, "16.000" + maker code (marking unverified) |
| Y2 | 16 MHz ceramic resonator for the **328P**, CSTCE16M0V53-R0 (Murata) | 3-pad SMD 3.2 x 1.3 | 41.275, 24.892 | R0 | 3.42 x 2.00 | ~1.0 | dark grey body in the store photo (sample #424342 at its centre); marking unreadable in the photo (unverified) |
| PC1 | 47 µF electrolytic on VIN | Panasonic D (6.3 mm can) | 25.527, 9.144 | R90 | 6.60 x 7.80; + pad (25.527, 11.544), - pad (25.527, 6.744) | 5.8 (D-case, unverified) | aluminium can, top looks white/silver in the photo (#F4F4F4), black negative-side marking toward -y (marking side unverified) |
| PC2 | 47 µF electrolytic on +5V | Panasonic D | 18.415, 9.144 | R90 | 6.60 x 7.80; + pad (18.415, 11.544), - (18.415, 6.744) | 5.8 | as PC1 |
| L | "L" LED (D13 indicator) | 0805 chip LED | 27.94, 42.164 | R270 | 3.30 x 1.35 | 0.8 | Eagle value "YELLOW"; unlit it looks pale/clear-white in the photo (sample #EAE1CA); lit it is yellow-orange (lit colour from memory, unverified) |
| TX | TX LED | 0805 | 27.94, 36.576 | R90 | 3.30 x 1.35 | 0.8 | yellow/amber |
| RX | RX LED | 0805 | 27.94, 34.290 | R90 | 3.30 x 1.35 | 0.8 | yellow/amber |
| ON | Power LED | 0805 | 58.42, 36.576 | R270 | 3.30 x 1.35 | 0.8 | lit green; unlit pale (sample #E5DEC6) |
| RESET | Reset pushbutton TS42031-160R-TR-7260 (SMD tact, 5 pads) | TS42 | 6.35, 49.403 | R0 | 10.00 x 5.90 (body ~6 x 3.5 + legs) | ~2.5-3.5 (unverified) | metal frame with a light grey/white round actuator in the store photo (sample #DEDEDA at its centre, #BDBAAB beside it) |
| ICSP | 2x3 male header, 328P ISP | 2X03, 2.54 mm | 64.897, 27.94 | R270 | 5.23 x 7.77 | 8.5 (2.5 plastic + ~6 pin, typical) | black plastic, gold/tin pins |
| ICSP1 | 2x3 male header, 16U2 ISP | 2X03 | 18.288, 46.228 | R180 | 7.77 x 5.23 | 8.5 typical | black |
| JP2 | 2x2 header for 16U2 PB4-PB7, **not mounted** ("NM") | 2X02 | 19.558, 41.148 | R90 | 5.23 x 5.23 | 0 (bare pads) | 4 plated holes |
| IOH | Female header 10-pin (D8-D13, GND, AREF, SDA, SCL) | 1X10, H 8.5 mm | 30.226, 50.80 | R180 | 25.55 x 2.69 | 8.5 (value "10x1F-H8.5") | black plastic |
| IOL | Female header 8-pin (D0-D7) | 1X08, H 8.5 | 54.61, 50.80 | R180 | 20.47 x 2.69 | 8.5 | black |
| POWER | Female header 8-pin (NC, IOREF, RESET, 3V3, 5V, GND, GND, VIN) | 1X08, H 8.5 | 36.83, 2.54 | R0 | 20.47 x 2.69 | 8.5 | black |
| AD | Female header 6-pin (A0-A5) | 1X06, H 8.5 | 57.15, 2.54 | R0 | 15.39 x 2.69 | 8.5 | black |
| RN1 | 4 x 10 kΩ resistor array | CAY16 (1206 4x0603 array) | 27.94, 23.876 | R90 | 2.00 x 3.20 | 0.45 | black, "103" |
| RN2 | 4 x 1 kΩ array | CAY16 | 27.94, 39.37 | R270 | 2.00 x 3.20 | 0.45 | black, "102" |
| RN3 | 4 x 22 Ω array (2 used, USB D+/D-) | CAY16 | 12.827, 36.83 | R90 | 2.00 x 3.20 | 0.45 | black, "220" |
| RN4 | 4 x 1 kΩ array | CAY16 | 58.42, 33.782 | R90 | 2.00 x 3.20 | 0.45 | black, "102" |
| R1 | 1 MΩ across Y1 (16U2 oscillator) | 0603 | 19.05, 29.591 | R0 | 2.68 x 1.10 | 0.45 | black |
| R2 | 1 MΩ across Y2 (328P oscillator) | 0603 | 41.275, 22.733 | R180 | 2.68 x 1.10 | 0.45 | black |
| C9, C11 | 22 pF load caps for Y1 | 0603 | (16.002, 29.591), (22.225, 29.591) | R180, R0 | 2.68 x 1.10 | 0.8 | tan |
| C5 | 100 nF DTR → RESET (auto-reset) | 0603 | 27.94, 29.845 | R0 | 2.68 x 1.10 | 0.8 | tan |
| C1, C2, C4, C6, C7, C10 | 100 nF (C1, C2, C6, C7 = +5V-to-GND decoupling; C4 = AREF-GND; C10 = AVCC-GND after L2) | 0603 | C1 (18.415, 15.367) R270; C2 (12.065, 29.845) R180; C4 (27.94, 44.45) R180; C6 (45.72, 22.86) R0; C7 (27.94, 31.496) R0; C10 (44.323, 10.541) R180 | — | 2.68 x 1.10 (C1 1.10 x 2.68) | 0.8 | tan |
| C3 | 1 µF on +3V3 | 0603 | 25.527, 15.367 | R90 | 1.10 x 2.68 | 0.8 | tan |
| C8 | 1 µF on 16U2 UCAP | 0603 | 12.70, 41.91 | R180 | 2.68 x 1.10 | 0.8 | tan |
| L1 | Ferrite bead BLM21, USB shield ↔ USB ground (UGND) | 0805 | 7.62, 45.085 | R180 | 3.40 x 1.32 | 0.85 | black/grey |
| L2 | 10 µH inductor, +5V → AVCC filter | 0805 | 39.116, 8.128 | R0 | 3.40 x 1.32 | 0.85 | black/grey |
| Z1, Z2 | CG0603MLC-05E varistors, D+ / D- to USB shield (ESD) | 0603 | (12.70, 39.37), (12.70, 33.655) | R180 | 3.00 x 1.00 | 0.8 | grey/tan |
| RESET-EN | Solder jumper (trace) in the auto-reset path; cut to disable auto-reset | SJ, top | 27.94, 27.305 | R0 | 3.45 x 2.18 | 0 | silk outline, label "RESET-EN" (production label unverified) |
| GROUND | Solder jumper UGND ↔ GND | SJ, **bottom** | 11.43, 40.64 | MR0 | 3.45 x 2.18 | 0 | bottom side |
| FD1-FD3 | fiducials | — | see 2.1 | — | 1.02 dia | 0 | bare copper |

There is no separate socket element in the brd: the DIP socket shares the ZU4 footprint (the `DIL28-3` pads). Many test points (TP_*) exist
in the schematic as bare pads (TP_VIN, TP_PWRIN, TP_DTR, TP_CMP, TP_GATE, TP_USBVCC, TP_RESET2, TP_XT1..4, TP_13, TP_LCMD, TP_TX, TP_RX, TP_PB4..7, TP_VUCAP, TP_AREF).

### 2.3 Pin-1 positions and connector details (pads extracted from the brd)

| Part | Pin 1 | Pitch | Pins | Faces | Overhang |
|---|---|---|---|---|---|
| ZU4 (328P) | pad 1 = RESET at **(62.865, 20.193)** (upper-right; notch at +x end, pointing right toward the ICSP header). Pins 1-14 run right→left on y = 20.193 (pin 14 = D8 at (29.845, 20.193)); pins 15-28 run left→right on y = 12.573 (pin 15 = D9 at (29.845, 12.573), pin 28 = A5 at (62.865, 12.573)) | 2.54 mm, rows 7.62 mm apart | 28 | up | — |
| U3 (16U2) | pad 1 = XTAL1 at (18.189, 32.221), pads 1-3 run +x along the bottom edge of the QFN | 0.5 mm | 32 + EP | up | — |
| U1 (NCP1117) | pin 1 GND/ADJ (10.846, 15.088), pin 2 OUT/+5V (10.846, 17.399), pin 3 IN/VIN (10.846, 19.710); tab (OUT, +5V) toward -x (x ≈ 4.6) | 2.3 mm | 3 + tab | up | — |
| U2 (LP2985) | pin 1 IN (+5V) (20.671, 16.190), pin 2 GND (20.671, 15.240), pin 3 ON/OFF (+5V) (20.671, 14.290); pin 4 BYPASS (23.271, 14.290) unconnected, pin 5 OUT +3V3 (23.271, 16.190) | 0.95 mm | 5 | up | — |
| U5 (LMV358) | pin 1 (OUT A = GATE_CMD) at **(21.163, 19.344)**; 2 (-IN A = +3V3) 19.994; 3 (+IN A = CMP) 20.644; 4 GND 21.294, all x = 21.163; pins 8 (V+ = +5V) 19.344 … 5 on x = 16.938 (6 and 7 = L13, 5 = SCK) | 0.65 mm | 8 | up | — |
| T1 (FDN340P) | pad 1 (7.112, 26.518) = drain, net USBVCC; pad 2 (9.144, 27.483) = source, net +5V; pad 3 (9.144, 25.552) = gate, net GATE_CMD (pad numbers from the Eagle package, functions from the schematic gate pins D/S/G) | 1.9 mm | 3 | up | — |
| Y2 | pad 1 XTAL2 (40.275, 24.892), pad 2 GND (41.275), pad 3 XTAL1 (42.275) | 1.0 mm | 3 | up | — |
| ICSP (328P) | pin 1 MISO at **(63.627, 30.480)**; pin 2 +5V (66.167, 30.480); 3 SCK (63.627, 27.940); 4 MOSI (66.167, 27.940); 5 RESET (63.627, 25.400); 6 GND (66.167, 25.400). Octagonal pads, 0.95 mm drill. A "1" silk text sits at (61.25, 29.94) left of pin 1 | 2.54 | 2x3 | up (male, vertical) | none (right column x 66.167 is inside the 68.58 nose) |
| ICSP1 (16U2) | pin 1 MISO2 at **(20.828, 47.498)**; 2 +5V (20.828, 44.958); 3 SCK2 (18.288, 47.498); 4 MOSI2 (18.288, 44.958); 5 RESET2 (15.748, 47.498); 6 GND (15.748, 44.958) | 2.54 | 2x3 | up | none |
| JP2 | 1 PB4 (20.828, 39.878), 2 PB6 (18.288, 39.878), 3 PB5 (20.828, 42.418), 4 PB7 (18.288, 42.418); unpopulated | 2.54 | 2x2 | — | — |
| X2 USB-B | pin 1 VBUS (XUSB) (8.520, 36.850), 2 D- (8.520, 39.350), 3 D+ (6.520, 39.350), 4 GND (UGND) (6.520, 36.850); shield tabs (3.81, 44.10) and (3.81, 32.10), 2.2 mm drill | 2.0 / 2.5 mm | 4 + 2 | opening faces -x (left) | **6.47 mm** beyond x = 0 |
| X1 barrel | pin 2 centre pin = PWRIN at (11.684, 8.306); pins 1 (8.687, 3.302) and 3 (5.690, 8.306) = GND (sleeve/switch); slotted 1.3 mm holes | — | 3 | opening faces -x (left) | **1.87 mm** beyond x = 0 |
| IOL (D0-D7) | pin 1 = **D0 at (63.500, 50.800)**, then D1 60.960, D2 58.420, D3 55.880, D4 53.340, D5 50.800, D6 48.260, **D7 45.720** | 2.54 | 8 | up (female, vertical) | none (top edge at 53.34, header body to 52.15) |
| IOH (D8-SCL) | pin 1 = **D8 at (41.656, 50.800)**, D9 39.116, D10 36.576, D11 34.036, D12 31.496, D13 28.956, GND 26.416, AREF 23.876, SDA 21.336, SCL 18.796 | 2.54 | 10 | up | none |
| POWER | pin 1 = **NC at (27.940, 2.540)**, IOREF 30.480, RESET 33.020, 3V3 35.560, 5V 38.100, GND 40.640, GND 43.180, VIN 45.720 | 2.54 | 8 | up | none |
| AD | pin 1 = **A0 at (50.800, 2.540)**, A1 53.340, A2 55.880, A3 58.420, A4/SDA 60.960, A5/SCL 63.500 | 2.54 | 6 | up | none |

**The D7/D8 gap.** D7 is at x = 45.720 and D8 at x = 41.656: centre-to-centre **4.064 mm = 160 mil**, i.e. 60 mil (1.524 mm) more than the
100 mil pitch. This is the famous off-grid shield spacing. Everything else on the four shield headers is on a 100 mil grid: VIN (45.72) to A0
(50.80) is 200 mil (one empty position). All header pads: 0.85 mm drill, 1.4224 mm "long" (oval) pads.

### 2.4 Silkscreen text (from the brd, layers 21 tPlace / 25 tNames / 26 bNames)

Top side, exact strings and positions (text anchor = lower-left of the text unless rotated):

| Text | Position (x, y) | Size (mm) | Rot | Notes |
|---|---|---|---|---|
| UNO | 40.64, 34.29 | 3.175 | 0 | large |
| Arduino | 40.64, 38.10 | 2.794 | 0 | the board's logo wordmark region; production shows the "∞" ARDUINO logo here (logo is a bitmap layer, `a4_bn_logo2.bmp`) |
| TM | 56.515, 40.005 | 1.016 | 0 | ™ after the logo |
| www.arduino.cc | 32.512, 32.004 | 2.184 | 0 | |
| DIGITAL | 39.152, 44.414 | 1.676 | 0 | production reads "DIGITAL (PWM~)" (production photo; brd has "DIGITAL" plus "[#=PWM]") |
| [#=PWM] | 40.894, 43.053 | 1.118 | 0 | Eagle file; production uses "~" |
| # (PWM marks) | x 34.671, 37.211 (D11, D10, at y 45.339) and 39.624, 48.895, 51.308, 56.388 (D9, D6, D5, D3, at y 46.609) | 1.118 | R90 | production: "~" before 3, 5, 6, 9, 10, 11 |
| 13 12 11 10 9 8 / 7 6 5 4 3 2 1 0 | at y 49.022, x = 28.194, 30.734, 33.274, 35.814, 38.354, 40.894 / 44.958, 47.498, 50.038, 52.578, 55.118, 57.658, 60.198, 62.738 | 1.422 | R270 | numbers next to each digital pin (vertical) |
| TX ▸ / RX ◂ near D1/D0 | "TX" 61.718, 43.446 and "RX" 64.262, 43.434 | 1.422 | R90 | production prints "TX→1" "RX←0" (arrows from photo) |
| AREF, GND (top header) | 23.017, 49.162 and 25.673, 49.137 | 1.422 | R270 | |
| SDA, SCL | 22.322, 53.581 and 19.528, 53.708 | 1.422 | R90 | partly beyond the top edge in the brd; production prints them on the board (unverified exact position) |
| IOREF, RESET, 3V3 | 31.115, 4.445; 33.274, 4.445; 36.068, 4.318 | 1.422 | R90 | production prints "3.3V" (unverified; brd says "3V3") |
| 5V, GND, VIN | 36.957, 4.318; 40.013, 4.305; 44.323, 4.318 | 1.422 | 0 | production "5V GND Vin" (case unverified) |
| POWER | (label in production, left of the power header) | — | — | production photo only |
| ANALOG IN | 50.546, 6.096 | 1.676 | 0 | |
| A0 … A5 | x 49.989, 52.529, 55.069, 57.609, 60.149, 62.689 at y 4.330 | 1.016 | 0 | |
| TX, RX (by the LEDs) | "TX" 31.115, 36.957 (R180); "RX" 29.591, 33.655 | 0.813 | | next to the TX/RX LEDs |
| ON, L, ICSP, RESET labels | part of the LED/header/button library silkscreen; production shows "ON" left of the ON LED, "L" next to the L LED, "ICSP" beside both 2x3 headers, "RESET" next to the button (positions estimated from photo [10]) | | | |
| 1 | 61.246, 29.944 | 1.27 | 0 | pin-1 marker of the 328P ICSP |
| M.Banzi, D.Cuartielles, T.Igoe, G.Martino, D.Mellis | x ≈ -0.58, y 52.705 … 45.974, R180 | 1.143 | R180 | team names; in the brd they sit **outside** the outline (x < 0); on real boards the names appear on the **bottom** side. Do not draw them on top |
| MADE IN ITALY | top layer 21 at (30.988, 56.134)/(43.053, 56.261) is outside the board (y > 53.34, artwork stash); bottom layer 26 at (64.77, 45.085)/(64.135, 42.545), mirrored | 1.778 / 1.422 | | bottom side |
| designed by / tinker it | bottom (layer 26) at (41.529, 44.958), (39.37, 43.18) | 1.422 | MR0 | bottom side |

Chip markings to draw: 328P "ATMEGA328P-PU" (Atmel logo and "ATMEL" on older boards, Microchip on newer), 16U2 "ATMEGA16U2-MU", Y1 can
"16.000" (typical, maker varies), LMV358 top mark (vendor code, unverified). Exact laser text varies with lot and is not in the design files.

## 3. Electrical

### 3.1 MCUs and clocks (schematic nets verified)

| | ATmega328P (ZU4) | ATmega16U2 (U3) |
|---|---|---|
| Core | AVR 8-bit, 16 MHz (rated 20 MHz at 4.5-5.5 V) | AVR 8-bit with full-speed USB |
| Clock source | **Y2, 16 MHz ceramic resonator** Murata CSTCE16M0V53-R0 (built-in load caps), on XTAL1 (pin 9) / XTAL2 (pin 10), R2 1 MΩ across it, centre pad to GND | **Y1, 16 MHz quartz crystal**, HC-49/S through-hole, on XTAL1 / XTAL2(PC0), R1 1 MΩ across, C9 + C11 22 pF to GND |
| Memory | 32 KB flash (32 256 B usable, 512 B Optiboot), 2 KB SRAM, 1 KB EEPROM | 16 KB flash, 512 B SRAM, 512 B EEPROM |
| Firmware | user sketch + Optiboot 4.4 | Arduino-usbserial (LUFA CDC-ACM) + DFU bootloader |

Why two clocks: USB full-speed needs ±0.25 % accuracy, so the 16U2 gets a quartz crystal; the resonator (≈ ±0.5 %) is fine for the 328P. The
production BOM in the datasheet lists Y1 as ECS-160-20-4X-DU [1] (a 16 MHz crystal); Learn Arduino and Robotics Bench both label this correctly.

### 3.2 Power tree (nets from the schematic [4])

```
Barrel X1 centre (PWRIN) ──D1 (M7: A=PWRIN, K=VIN)──► VIN ──┬─ POWER pin 8 "VIN"
                                                           ├─ PC1 47 µF
                                                           ├─ RN1A/RN1B 10k/10k divider → CMP = VIN/2
                                                           └─ U1 NCP1117ST50 IN ─► +5V (OUT + tab)
USB-B VBUS (XUSB) ──F1 500 mA PTC──► USBVCC ──┬─ U3 UVCC (16U2 USB pad supply)
                                             └─ T1 FDN340P (D=USBVCC, S=+5V, G=GATE_CMD) ─► +5V
U5A comparator: +IN = CMP (VIN/2), -IN = +3V3, OUT = GATE_CMD
+5V ─► U2 LP2985-33 (IN, ON/OFF tied to +5V) ─► +3V3 (POWER pin 4 "3V3", C3 1 µF, U5A -IN)
+5V ─► L2 10 µH ─► AVCC (C10 100 nF); +5V also = POWER pin 2 "IOREF" and pin 5 "5V", both ICSP pin 2
```

| Input | Range | Protection | Notes |
|---|---|---|---|
| Barrel jack X1 (2.1 mm centre-positive) | recommended 7-12 V; datasheet limit 6-20 V on VIN [1] | D1 series diode "M7" (1 A/1000 V, ~0.7-1.0 V drop) | Reverse polarity: D1 blocks, board stays dark, nothing is damaged (see §6) |
| VIN header pin | same as VIN net (after D1) | **none**: feeding VIN bypasses D1 | reverse voltage on the VIN pin goes straight into U1 and PC1 |
| USB-B VBUS | 5 V; max 5.5 V [1] | F1 Bourns MF-MSMF050-2 PPTC (1812): **0.5 A hold, 1.0 A trip, 15 V max, 0.15 s to trip at 8 A** [13]; Z1/Z2 varistors on D+/D-; RN3 22 Ω series on D+/D- | USB shield to UGND via L1 ferrite bead; UGND to GND via the GROUND jumper |
| 5V header pin | 5 V regulated in | none (back-feeds +5V directly, bypasses U1 and F1) | |
| 3V3 header pin | output only, 150 mA max (LP2985 rating) | LP2985 current limit / thermal shutdown | |

Auto-select: U5A compares VIN/2 with 3.3 V. If **VIN > 6.6 V**, GATE_CMD goes high (≈ 5 V), the P-MOSFET T1 turns off and USB no longer feeds
+5V; the board runs from U1. If VIN < 6.6 V (or absent), GATE_CMD is low, T1 is on and USB VBUS (through F1) drives +5V. With no USB and
VIN below ~6.6 V the board runs from U1 in dropout (5 V rail sags); T1 is then on, so +5V also back-feeds USBVCC and the USB VBUS pin through F1 (inferred from the nets). The 16U2's UVCC pin always takes USBVCC. T1's body diode points from USBVCC (drain) to +5V (source), so with T1 off USB still cannot be back-fed from U1, and USB could only push current through the diode if +5V fell ~0.7 V below VBUS (inferred from FET polarity).

Regulators:
- **U1** Eagle value **NCP1117ST50T3G** (onsemi, 5.0 V fixed, > 1 A, SOT-223, input up to 20 V; dropout **1.2 V max at 800 mA** (1.07 V typ, unverified); internal current limit, safe-operating-area and thermal shutdown) [14]; numeric current-limit threshold not verified. The datasheet BOM lists **SPX1117M3-L-5** (MaxLinear, same 1117 pinout) [1]; modern boards may carry either.
- **U2** **LP2985-33DBVR** (TI, 3.3 V, **150 mA**, SOT-23-5, dropout at 150 mA: 280 mV typ / 350 mV max on the legacy die, 180 mV typ / 198 mV max on TI's "new chip" die; current limit + thermal shutdown) (TI LP2985 datasheet, verified).

Thermal reality: U1 dissipates (VIN - 5 V) x I. At 12 V and 300 mA that is 2.1 W in a SOT-223 on a small copper pour, which overheats and goes into
thermal shutdown. That is why 7-12 V is "recommended" and why you should not draw much 5 V current from a 12 V jack supply.

### 3.3 Logic levels and current limits (328P datasheet [6])

| Item | Value |
|---|---|
| I/O voltage | 5 V CMOS (VCC = 5 V). VIH ≥ 0.6 VCC = 3.0 V, VIL ≤ 0.3 VCC = 1.5 V (guaranteed datasheet limits for VCC 2.4-5.5 V, Table 30-1; not typical values) |
| 5 V tolerance | yes, it is a 5 V part. Max on any pin except RESET: -0.5 V to VCC + 0.5 V; RESET pin: -0.5 V to +13.0 V (abs. max) |
| 3.3 V sensors | a 3.3 V output (≥ 3.0 V) reads as HIGH on a 5 V Uno only marginally; a 5 V Uno output **into** a 3.3 V device over-drives it (needs a level shifter or divider) |
| Per I/O pin | **40 mA absolute maximum**; design for ≤ 20 mA |
| Total | **200 mA** absolute max through VCC and through GND pins [6] |
| From 5V pin | limited by the source: USB path 500 mA polyfuse (minus board ≈ 50 mA); jack path limited by U1 thermals |
| From 3V3 pin | 150 mA (LP2985) |
| Internal pull-up | 20-50 kΩ (`INPUT_PULLUP`) |

### 3.4 ADC, PWM, DAC

- ADC: 10-bit successive approximation, 6 external channels A0-A5 (PC0-PC5) on the DIP; reference = AVCC (5 V, `DEFAULT`), internal 1.1 V (`INTERNAL`) or the AREF pin (`EXTERNAL`). AREF has C4 100 nF to GND. `analogRead()` returns 0-1023. (A6/A7 exist only on SMD packages, not on this DIP board.)
- PWM (`analogWrite`, 8-bit): **D3, D5, D6, D9, D10, D11**. D5/D6 (Timer0, fast PWM, 16 MHz/64/256) = **976.56 Hz**; D3/D11 (Timer2) and D9/D10 (Timer1), phase-correct 16 MHz/64/510 = **490.20 Hz**.
- No DAC.

### 3.5 USB-serial bridge (U3 ATmega16U2)

- USB D+/D- through RN3 22 Ω; UCAP C8 1 µF; USB IDs: VID 0x2341, PID 0x0043 (UNO R3; boards.txt also lists 2341:0001, 2A03:0043, 2341:0243, 2341:006A) [5].
- UART: 16U2 TXD1 (PD3, net M8RXD) → RN4B 1 kΩ → D0/RX of the 328P (IO0); 328P D1/TX (IO1) → RN4A 1 kΩ → 16U2 RXD1 (PD2, net M8TXD). The 1 kΩ series resistors let a shield drive D0/D1 without fighting the 16U2.
- DTR: 16U2 PD7 (net DTR) → **C5 100 nF** → RESET of the 328P (auto-reset). RN2D 1 kΩ also connects DTR to GND (as extracted from the schematic).
- PB4-PB7 broken out to unpopulated JP2.

### 3.6 LEDs (schematic nets [4])

| LED | Colour | Drive | Active level | Driven by |
|---|---|---|---|---|
| ON | green | +5V → RN4C ∥ RN4D (2 x 1 kΩ = 500 Ω) → anode, cathode GND | lit whenever +5V is present | power rail (≈ 5-6 mA, estimated) |
| L | yellow/amber | **U5B** op-amp as a voltage follower: +IN = D13/SCK, OUT = L13 → RN2A 1 kΩ → anode, cathode GND | HIGH = on | the 328P D13 (PB5) through the buffer, so the LED does not load D13 or the SPI SCK line |
| TX | yellow/amber | +5V → RN2C 1 kΩ → anode, cathode → 16U2 PD5 (TXLED) | LOW = on (16U2 sinks) | 16U2 firmware, data board → PC |
| RX | yellow/amber | +5V → RN2B 1 kΩ → anode, cathode → 16U2 PD4 (RXLED) | LOW = on | 16U2 firmware, data PC → board |

Note on TX/RX (verified in the Arduino-usbserial source [9]): `LEDs_TurnOnLEDs` does `PORTD &= ~mask`, so both LEDs are **active LOW** (LEDS_LED1 = PD5 = TX, LEDS_LED2 = PD4 = RX). **TX** turns on when bytes from the 328P's UART are sent up to the computer (`Serial.print`); **RX** turns on when bytes from the computer are shifted out to the 328P (also during upload, so both flicker while uploading). Each turn-on starts a pulse counter (`TX_RX_LED_PULSE_MS`, decremented on every Timer0 flush tick, a few ms; exact value not in the fetched files; the tick is a Timer0 overflow with `TCCR0B = 1<<CS02`, i.e. 256 x 256 / 16 MHz = 4.096 ms) so the LED stays visible for short bursts.

### 3.7 Buttons, jumpers

- **RESET** button (TS42, SMD tact): pressing shorts the RESET net to GND (pads 3/4 = RESET, 1/2 = GND). RESET has RN1D 10 kΩ pull-up to +5V and D2 clamp to +5V. Active LOW. Also on POWER pin 3 and ICSP pin 5.
- 16U2 reset (RESET2): RN1C 10 kΩ pull-up, D3 clamp, ICSP1 pin 5; no button (short ICSP1 pins 5-6 to reset the 16U2 into DFU).
- **RESET-EN** trace jumper (top, at 27.94, 27.305): cut it to disable auto-reset.
- **GROUND** jumper (bottom): joins USB ground to board ground.

### 3.8 On-board sensors

None (no IMU, temperature sensor exposed, or buttons other than RESET). The 328P has an internal temperature sensor on ADC channel 8 (not exposed by `analogRead`).

## 4. Pinout (physical order)

### Top edge, IOL (right part, pin 1 = rightmost)

| x (mm) | Label printed | 328P port / DIP pin | Functions | Notes |
|---|---|---|---|---|
| 63.500 | 0 (RX←) | PD0 / 2 | RXD, PCINT16 | 1 kΩ to 16U2 TX; leave free during upload |
| 60.960 | 1 (TX→) | PD1 / 3 | TXD, PCINT17 | 1 kΩ to 16U2 RX |
| 58.420 | 2 | PD2 / 4 | INT0 | external interrupt 0 |
| 55.880 | ~3 | PD3 / 5 | OC2B PWM 490 Hz, INT1 | |
| 53.340 | 4 | PD4 / 6 | T0, XCK | |
| 50.800 | ~5 | PD5 / 11 | OC0B PWM 980 Hz | |
| 48.260 | ~6 | PD6 / 12 | OC0A PWM 980 Hz, AIN0 | |
| 45.720 | 7 | PD7 / 13 | AIN1 | then the 160 mil gap |

### Top edge, IOH (left part, pin 1 = rightmost)

| x (mm) | Label | 328P | Functions | Notes |
|---|---|---|---|---|
| 41.656 | 8 | PB0 / 14 | ICP1, CLKO | |
| 39.116 | ~9 | PB1 / 15 | OC1A PWM 490 Hz | |
| 36.576 | ~10 | PB2 / 16 | OC1B PWM, SS | must be OUTPUT for SPI master |
| 34.036 | ~11 | PB3 / 17 | OC2A PWM, MOSI | also ICSP 4 |
| 31.496 | 12 | PB4 / 18 | MISO | also ICSP 1 |
| 28.956 | 13 | PB5 / 19 | SCK, LED_BUILTIN (via U5B buffer to L LED) | also ICSP 3 |
| 26.416 | GND | — | ground | |
| 23.876 | AREF | 21 | ADC reference input | C4 100 nF to GND; never apply >5 V or a voltage while `DEFAULT` reference is selected |
| 21.336 | SDA | PC4 / 27 | I2C data (same net as A4) | |
| 18.796 | SCL | PC5 / 28 | I2C clock (same net as A5) | |

### Bottom edge, POWER (pin 1 = leftmost)

| x | Label | Net | Notes |
|---|---|---|---|
| 27.940 | (unlabelled) | NC | reserved |
| 30.480 | IOREF | +5V | tells shields the I/O voltage (5 V) |
| 33.020 | RESET | RESET | active low; pull to GND to reset |
| 35.560 | 3V3 (3.3V) | +3V3 | 150 mA max |
| 38.100 | 5V | +5V | output (or 5 V input bypassing protection) |
| 40.640 | GND | GND | |
| 43.180 | GND | GND | |
| 45.720 | VIN | VIN | jack voltage minus D1 drop; or input bypassing D1 |

### Bottom edge, ANALOG IN

| x | Label | 328P | Notes |
|---|---|---|---|
| 50.800 | A0 | PC0 / 23 | ADC0, digital 14 |
| 53.340 | A1 | PC1 / 24 | ADC1, D15 |
| 55.880 | A2 | PC2 / 25 | ADC2, D16 |
| 58.420 | A3 | PC3 / 26 | ADC3, D17 |
| 60.960 | A4 | PC4 / 27 | ADC4, SDA |
| 63.500 | A5 | PC5 / 28 | ADC5, SCL |

ATmega328P DIP: 1 PC6/RESET, 7 VCC, 8 GND, 9 XTAL1, 10 XTAL2, 20 AVCC, 21 AREF, 22 GND. No strapping pins; no input-only pins; all I/O
5 V. Boot behaviour: pins are inputs (high-Z) after reset; D13 (L LED) flashes 3 times (6 toggles) during Optiboot on an external reset.

## 5. Programming

- **Toolchain (Oct 2026):** Arduino IDE 2.x or arduino-cli with core **`arduino:avr` 1.8.8** (latest in the package index [7]), which pulls **avr-gcc 7.3.0-atmel3.6.1-arduino7** and **avrdude 8.0.0-arduino1**. FQBN `arduino:avr:uno`.
- **boards.txt [5]:** `upload.protocol=arduino`, `upload.speed=115200`, `upload.maximum_size=32256`, `maximum_data_size=2048`, `build.f_cpu=16000000L`, `build.mcu=atmega328p`, bootloader `optiboot/optiboot_atmega328.hex`, fuses **low 0xFF, high 0xDE, extended 0xFD**, lock 0x0F.
  - low 0xFF: external crystal/resonator, slow rising power, no CKDIV8. high 0xDE: SPIEN on, BOOTSZ = 256 words (512 B), BOOTRST on. extended 0xFD: **BODLEVEL = 101 → 2.7 V**.
- **Upload path:** avrdude's `arduino` programmer opens the 16U2 CDC port and, per `arduino.c` [8], clears DTR/RTS, waits 250 ms, asserts them for 100 µs, clears them and waits 100 ms. The 16U2 drives PD7 (DTR) accordingly; the falling edge through **C5 100 nF** pulls RESET low for a moment (RN1D 10 kΩ recharges it; D2 clamps the overshoot above 5 V) → 328P resets → Optiboot (only runs on an *external* reset, `EXTRF`) flashes L 3 times and waits ~1 s (watchdog) for STK500v1 at 115200 baud → avrdude writes flash → watchdog reset → sketch runs.
- **avrdude 8 command** (platform.txt pattern [5]: `"{cmd.path}" "-C{config.path}" {upload.verbose} {upload.verify} -p{build.mcu} -c{upload.protocol} "-P{serial.port}" -b{upload.speed} -D "-Uflash:w:{build.path}/{build.project_name}.hex:i"`): with verbose upload on and "verify code after upload" on, `avrdude -C.../avrdude.conf -v -patmega328p -carduino -P/dev/cu.usbmodem14101 -b115200 -D -Uflash:w:.../Blink.ino.hex:i`. Verbose off gives `-q -q` (almost no output); verify off adds `-V`. `-D` disables chip erase (Optiboot erases page by page).
- **Console messages (avrdude 8.0 strings [8])**, a verbose, verified upload of Blink looks like this. avrdude 8 no longer prefixes lines with "avrdude:"; its `pmsg_*` messages print without the program name and capitalise the first letter (`MSG2_UCFIRST`), so the old 6.x/7.x lines look different (corrected after reading `main.c`, `update.c`, `avrdude.h` at tag v8.0):
  ```
  Avrdude version 8.0-arduino.1
  Copyright see https://github.com/avrdudes/avrdude/blob/main/AUTHORS

  System wide configuration file is .../avrdude.conf
  Using port            : /dev/cu.usbmodem14101
  Using programmer      : arduino
  ...
  AVR device initialized and ready to accept instructions
  Device signature = 1E 95 0F (ATmega328P)
  Reading 924 bytes for flash from input file Blink.ino.hex
  Writing 924 bytes to flash
  Writing | ################################################## | 100% 0.16 s
  924 bytes of flash written
  Verifying 924 bytes of flash against input file Blink.ino.hex
  Reading | ################################################## | 100% 0.12 s
  924 bytes of flash verified

  Avrdude done.  Thank you.
  ```
  The format strings "%s version %s", "using port            : %s", "using programmer      : %s", "AVR device initialized and ready to accept instructions", "device signature =%s" (bytes printed as " 1E 95 0F"), "reading %d byte%s for %s from input file %s", "writing %d byte%s %sto %s", "%d byte%s of %s written", "verifying %d byte%s of %s against input file %s", "%d byte%s of %s verified" and "%s done.  Thank you." are in the avrdude 8.0 source [8] (first letter upper-cased at print time). The "-arduino.1" version suffix, the part name in brackets after the signature, the timing figures and the Blink byte count (≈ 924 bytes with core 1.8.x) are representative (unverified). avrdude 6.3 (older IDEs) prints "avrdude: ..." prefixed lines and "Using Port : COM4 / Using Programmer : arduino / Overriding Baud Rate : 115200 / AVR Part : ATmega328P" [11].
- **Failure messages:** sync failure (wrong port, no bootloader, D0 loaded, auto-reset broken). avrdude 8.0 (`stk500.c`, `MAX_SYNC_ATTEMPTS 10` [8]) prints, at the Arduino IDE's `-v` level, `Error: programmer is not responding` and `Warning: attempt 1 of 10: not in sync: resp=0x00` … up to `attempt 10 of 10`; with `-vv` or higher the function and file/line are inserted (e.g. `Warning stk500_getsync() stk500.c 127: attempt 1 of 10: ...`). Missing port: `Error: cannot open port /dev/cu.usbmodem14101: No such file or directory` then `Error: unable to open port /dev/cu.usbmodem14101 for programmer arduino` (`ser_posix.c`, `main.c` [8]). The familiar older forms `avrdude: stk500_getsync() attempt 1 of 10: not in sync: resp=0x00`, `avrdude: stk500_recv(): programmer is not responding` and `avrdude: ser_open(): can't open device "COM4"` are avrdude 6.3 (core 1.8.6 and earlier) output, not avrdude 8.
- **ISP alternative:** program the 328P via the ICSP header (e.g. Arduino as ISP, `-cstk500v1 -b19200`, or USBasp); "Burn Bootloader" sets the fuses above and writes Optiboot. The 16U2 can be re-flashed via DFU (short ICSP1 RESET2 to GND) with `dfu-programmer atmega16u2`.
- **Boot LED pattern:** after reset button/DTR: L LED flashes 3 times quickly (6 toggles of ~62.5 ms each, Optiboot `LED_START_FLASHES=3`), then the sketch starts. On power-on reset Optiboot jumps straight to the sketch (no flashes).
- **Factory sketch:** new boards normally arrive with Blink-like test firmware, so the L LED blinks (≈1 s on, 1 s off) as soon as the board is powered (commonly reported; no official statement found, unverified).

## 6. Real failure modes

| Fault | What physically happens | Protecting / failing part | What the user sees |
|---|---|---|---|
| Reversed barrel-jack supply | D1 (M7) is reverse-biased and blocks; VIN stays at 0 V | D1 protects | Nothing: ON LED stays off, no heat. Fix the adapter and it works. (If USB is also plugged in, the board runs from USB normally.) |
| Reversed supply on the VIN pin | no diode in that path: reverse voltage hits PC1 47 µF (25 V electrolytic) and U1 | PC1, U1 fail | U1 gets hot, PC1 can bulge/vent (smell), board may be dead; USB may still power the rest if U1 shorts |
| Reversed supply on the 5V pin | straight across every chip's VCC/GND, the internal ESD/substrate diodes conduct | 328P, 16U2, U5, U2 | heavy current, chips hot within seconds, magic smoke; often a dead 328P (swap it: it is socketed) |
| Over-voltage on jack/VIN > 20 V | U1 above its rating; 25 V PC1 at the limit | U1, PC1 | U1 very hot → thermal shutdown (resets, flicker of ON) or fails short, which puts VIN on +5V and kills the 328P/16U2 |
| 12 V jack, heavy 5 V load | U1 dissipation (VIN-5)·I | U1 thermal limit | U1 too hot to touch, board resets intermittently |
| Over-current on USB | > ~1 A trips F1 (PTC heats, resistance rises) | F1 protects the PC's port | board browns out/turns off; ON LED dims/off; recovers some seconds after the short is removed. The host may also report "USB device drawing too much power" |
| Brown-out | BOD at 2.7 V (2.5-2.9 V) from fuse 0xFD [6] | 328P BOD | MCU held in reset while VCC < VBOT; sketch restarts when power recovers (L blinks restart, Serial prints setup banner again) |
| Over-current on an I/O pin | > 40 mA abs. max (e.g. LED without resistor, motor on a pin) | the pin's output driver | pin voltage sags, chip warms; repeated abuse kills that pin (stuck or weak). 200 mA total on VCC/GND is the package limit |
| Cold solder joint (e.g. on a header or the jack) | intermittent high-resistance contact | — | flickering ON LED, random resets when the cable is touched, sensor reads noisy or 0, shield pins dead |
| 5 V into a 3.3 V device pin | Uno outputs 5 V HIGH; a 3.3 V part's clamp diodes conduct into its 3.3 V rail | the 3.3 V part (and the 150 mA LP2985 rail may be back-fed) | 3.3 V module gets warm, erratic, eventually dies; use a level shifter |
| 3.3 V signal into the Uno | 3.3 V ≥ VIH (3.0 V) | — | usually reads HIGH, but marginal; noisy |
| Shorting 5V to GND (from USB) | full short behind F1 | F1 trips | board dies instantly, ON LED off, F1 warm; recovers after removing the short |
| Shorting 5V to GND (from jack) | U1 into current limit (~1+ A) then thermal shutdown | U1 | U1 hot, ON LED off, D1 warm; recovers when cool |
| Shorting 3V3 to GND | LP2985 current limit / thermal shutdown | U2 | 3V3 at 0 V, rest of the board runs |
| Beginner traps | (1) wiring to D0/D1 blocks uploads (`not in sync`); (2) `analogWrite` on a non-~ pin gives only on/off; (3) LED without resistor; (4) motors/servos from the 5V pin cause brown-out resets; (5) forgetting `pinMode(…, INPUT_PULLUP)` gives a floating button; (6) the 328P in the socket backwards (notch must point right, toward ICSP) cooks it; (7) the L LED glows dimly or looks "on" when D13 is an input (the buffer follows a floating pin); (8) using A4/A5 as analog while also using I2C (same pins as SDA/SCL); (9) wrong board/port selected in the IDE |

## 7. Lesson facts (Arduino API, core 1.8.8)

**Lesson 1, Blink / I-O.** Built-in LED is `LED_BUILTIN` = 13 (L LED, active HIGH).
```cpp
void setup() { pinMode(LED_BUILTIN, OUTPUT); }
void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
```
External LED: D13 or any pin → 220 Ω (to 1 kΩ) → LED anode, cathode to GND. 5 V - 2 V / 220 Ω ≈ 13.6 mA.

**Lesson 2, button + sensor.** Button between D2 and GND with `pinMode(2, INPUT_PULLUP)`; pressed reads `LOW`. Debounce with `millis()` or use `attachInterrupt(digitalPinToInterrupt(2), isr, FALLING)` (interrupts on D2/D3 only). Sensor: potentiometer or LDR divider on A0: `int v = analogRead(A0);` (0-1023), voltage = v * 5.0 / 1023.0. `Serial.begin(9600); Serial.println(v);` (TX LED flickers).

**Lesson 3, PWM / analog out.** `analogWrite(9, value)` with value 0-255 on ~ pins 3, 5, 6, 9, 10, 11 (D9 ≈ 490 Hz, D5/D6 ≈ 980 Hz). Fade an LED on D9; map a pot: `analogWrite(9, analogRead(A0) / 4);` or `map(v, 0, 1023, 0, 255)`. Servo: `#include <Servo.h>` (Servo library 1.2.x, unverified exact current version), `servo.attach(9); servo.write(90);` (note: Servo disables PWM on D9/D10, it uses Timer1).

**Lesson 4, protocol (I2C / SPI / UART).** I2C on A4 = SDA, A5 = SCL (also the SDA/SCL pins by AREF): `#include <Wire.h>`, `Wire.begin(); Wire.beginTransmission(0x27); … Wire.endTransmission();`. Example: 16x2 I2C LCD (`LiquidCrystal_I2C`) or a BMP280/BME280 (note: most BME280 breakouts are 3.3 V; use a module with an on-board regulator/level shifter). SPI: D10 SS, D11 MOSI, D12 MISO, D13 SCK (`#include <SPI.h>`, `SPI.begin()`). UART: `Serial` on D0/D1 shared with USB. No Wi-Fi on this board.

Libraries bundled with core 1.8.8: Wire, SPI, SoftwareSerial, EEPROM, HID. Servo and LiquidCrystal are separate libraries in the Library Manager (versions unverified this run).

## 8. Internals for the see-through view

| Part | What is inside |
|---|---|
| ATmega328P-PU (DIP-28) | a silicon die of a few mm² (≈ 3 x 3 mm, unverified) glued on a copper-alloy lead frame paddle at the centre, gold or copper bond wires fanning out to the 28 lead fingers, all moulded in black epoxy; the die is far smaller than the package. The socket is a plastic frame with 28 stamped phosphor-bronze leaf contacts soldered through the board |
| ATmega16U2-MU (QFN-32) | die on an exposed pad (soldered to GND), bond wires to 32 perimeter lands, no leads |
| Y1 HC-49/S crystal | a thin round/rectangular AT-cut quartz blank with silver electrodes on both faces, held by two spring clips on the lead posts, inside a cold-welded or resistance-welded metal can filled with dry nitrogen or vacuum |
| Y2 ceramic resonator | a piezoelectric ceramic (PZT) element with electrodes plus two built-in load capacitors (hence 3 terminals, centre = GND), in a small ceramic/resin package |
| U1 NCP1117 (SOT-223) | a die with a PNP/NPN pass transistor, bandgap reference, error amp, current limit and thermal sensor; the large tab is the output and the heat path |
| U2 LP2985 | small CMOS/bipolar LDO die, PNP pass element, enable and bypass pins |
| U5 LMV358 | two independent CMOS op-amps on one die; A = power comparator, B = L-LED buffer |
| T1 FDN340P | a vertical trench P-MOSFET die with its body diode |
| F1 PTC | a conductive polymer (carbon-loaded polyethylene) slab between two metal electrodes; heating swells the polymer and breaks the carbon paths (trip) |
| D1 | a silicon PN junction die in a moulded SMB body with a cathode band |
| USB bridge | there is no CH340/FTDI: the bridge is the 16U2 running LUFA firmware |
| Flash | inside the 328P die (32 KB, 512 B at the top used by Optiboot); no external flash |
| Electrolytics PC1/PC2 | rolled aluminium foil + paper soaked in electrolyte, in an aluminium can on a plastic base |

## 9. Assembly and power-up

- Manufacturing: SMD parts (16U2, regulators, op-amp, MOSFET, diodes, resistor arrays, 0603/0805 passives, SMD LEDs, polyfuse, resonator, SMD electrolytics, reset button) are solder-pasted and reflowed first. Through-hole parts then go in: DIP-28 socket, HC-49/S crystal Y1, USB-B jack, barrel jack, 2x3 ICSP headers, the four female shield headers; these are wave- or selective-soldered. The ATmega328P-PU (pre-programmed with Optiboot) is pressed into the socket last. The 16U2 is flashed with its firmware via ICSP1. Test: power-on and run a factory test sketch (unverified).
- Power-up from USB: VBUS → F1 → T1 → +5V; **ON LED** lights at once; 16U2 enumerates as "Arduino Uno" (2341:0043) CDC-ACM port (COMx / /dev/cu.usbmodemXXXX / /dev/ttyACM0); the 328P starts from power-on reset straight into the stored sketch (Optiboot skips on POR). With the factory sketch, L blinks.
- Opening the serial port in the IDE toggles DTR and resets the 328P: L flashes 3 times (Optiboot), then the sketch restarts.
- Power-up from the jack (7-12 V): D1 → VIN → U1 → +5V; ON lights; the comparator turns T1 off. The 16U2's VCC and AVCC are on +5V (only its USB pad supply UVCC is on USBVCC, verified in the schematic), so the 16U2 also runs, but with no USB host there is no enumeration; TX/RX stay dark; the sketch runs from power-on reset.

## 10. Reconciliation with the originals

### Learn Arduino "Meet the board" (27 parts, 6 callouts) [12]

| Learn Arduino name | Real designator | Verdict |
|---|---|---|
| USB-B port | X2 | correct |
| DC power jack ("7-12 V") | X1 | correct (limit 6-20 V) |
| Reset button | RESET | correct |
| ATmega328P | ZU4 (in socket) | correct |
| ICSP header | ICSP | correct |
| ICSP header (USB chip) | ICSP1 | correct |
| 47 µF capacitor (x2) | PC1 (VIN), PC2 (+5V) | correct |
| 16 MHz crystal (USB chip) | Y1 | correct |
| ATmega16U2 | U3 | correct |
| Resettable fuse | F1 | correct (500 mA) |
| 5 V regulator | U1 | correct |
| LMV358 op-amp | U5 | correct (also buffers the L LED) |
| Protection diode | D1 | correct |
| Transistor (3x SOT-23) | **only T1** is a transistor; the other SOT-23-size parts are U2 (LP2985, SOT-23-5) | **wrong count** |
| 16 MHz resonator (328P) | Y2 | correct |
| Ferrite bead "filters noise on the USB supply" | L1 is between USB shield and USB ground; L2 (10 µH) filters AVCC | **description wrong** |
| L LED "wired to pin 13" | L, via U5B buffer + RN2A 1 kΩ | essentially right (it is buffered, not direct) |
| TX / RX / Power LED | TX, RX, ON | correct |
| Resistor (0603, many) | R1, R2 only (1 MΩ); the rest are arrays RN1-RN4 | overstated |
| Capacitor (0603, many) | C1-C11 | correct |
| Resistor network | RN1-RN4 | correct |
| Digital pins 8-13 (+GND, AREF, SDA/SCL) | IOH | correct |
| Digital pins 0-7 | IOL | correct |
| Power pins | POWER | correct (also IOREF, RESET, NC) |
| Analog pins A0-A5 | AD | correct ("0 and 5 V" right for DEFAULT ref) |
| Callout "Power Pins (5V, 3.3V, GND, VIN)" | POWER | incomplete: IOREF and RESET too |

### Robotics Bench Fig. 01 (24 parts) [12]

| RB id | Real | Issue |
|---|---|---|
| U1 ATmega328P, SK1 socket | ZU4 | position ok (29.5-65.06 x 10.8-19 ≈ real 27.7-65.0 x 11.9-20.9); pin 1/notch must be at +x |
| U2 "NCP1117" | **U1** | designator swapped; real centre (7.75, 17.40) |
| U4 "LP2985" | **U2** | designator wrong; real centre (21.97, 15.24) |
| U3 16U2 | U3 | ok (real centre 19.94, 34.67) |
| Y1 crystal | Y1 | ok (real 18.92, 26.16) |
| U5 LMV358 "soic" at (31.5, 30.5) | U5 | **wrong package (MSOP-8) and position: real (19.05, 20.32)** |
| F1 | F1 | ok (real 4.06, 26.54) |
| C1/C2 47 µF | PC2 (18.42, 9.14) / PC1 (25.53, 9.14) | names differ; positions ok |
| LL, LTX, LRX at x 25, y 45.8/43.2/40.6 | L (27.94, 42.16), TX (27.94, 36.58), RX (27.94, 34.29) | y positions too high by 3.6-6 mm |
| LON at (58, 40.6) | ON (58.42, 36.58) | 4 mm too high |
| SW1 | RESET (6.35, 49.40) | ok |
| ICSP1 / ICSP2 | ICSP1 / ICSP | ok |
| J1 USB, J2 barrel | X2, X1 | ok (overhang 6.3/1.8 vs real 6.47/1.87) |
| H1-H4 | IOH, IOL, POWER, AD | ok |
| PCB 68.6 x 53.3, corner radius 2.4 | 68.58 x 53.34, R1 corners + stepped right edge with chamfers | **outline wrong** (rectangle) |
| holes [14,2.5] [15.3,50.7] [66.1,7.6] [66.1,35.5] | (13.97, 2.54) (15.24, 50.80) (66.04, 7.62) (66.04, 35.56), 3.2 mm | ok within 0.1 mm |
| Y2 resonator, D1, T1, L1/L2, RN1-4, Z1/Z2, D2/D3 | — | missing from RB (RB has a generic "RC" passives block) |

## 11. Uncertainties

- **Production vs Eagle BOM.** The Eagle Rev3e file says U1 NCP1117ST50T3G, D1 "M7", U5 LMV358IDGKR (MSOP-8); the 2026 datasheet BOM says U1 SPX1117M3-L-5, D1 CGRA4007-G (SMA package, 1 A/1000 V), U5 "LMV358LIST-A.9", Y1 ECS-160-20-4X-DU, and lists F1 as "Chip Capacitor, High Density" (an obvious BOM typo for the polyfuse). I trust the Eagle file for placement and nets, and treat the datasheet BOM as "parts used in current production may differ". A figure should keep the Eagle package outlines.
- **Silkscreen of production boards** ("DIGITAL (PWM~)", "~", "TX→1", "RX←0", "3.3V", "Vin", "POWER", "ON", "ICSP", "L") is from memory/photos, not extracted; the brd uses "#" and "[#=PWM]" and "3V3"/"VIN". Library-owned silk (ICSP outlines, "ON"/"L" labels) was not extracted.
- Component heights other than the 8.5 mm female headers are typical values, not measured.
- F1 and NCP1117 ratings come from distributor listings of the vendor datasheets [13][14], not the vendor PDFs; the NCP1117 current-limit value and its 1.07 V typical dropout are not verified (the 1.2 V max at 800 mA and 20 V input are). F1 and LP2985 figures were later checked against the Bourns and TI PDFs (see Verification).
- Solder-mask colour is approximate.
- Factory sketch content and the exact Blink byte count are not verified.
- RN2D (1 kΩ DTR-to-GND) is as extracted; its purpose was not confirmed against the PDF schematic.
- Exact library versions (Servo, LiquidCrystal_I2C) were not checked.

## Verification

Adversarial fact-check, 24 Oct 2026. Each claim was checked against a source opened in this pass (the CAD zip was re-downloaded and re-parsed with a fresh script; the core, Optiboot, avrdude and usbserial files were fetched from GitHub at the named tags).

| # | Claim | Status | Source | Old → new (corrections) |
|---|---|---|---|---|
| 1 | Board outline bbox 68.58 x 53.34 mm, origin bottom-left | confirmed | A000066-cad-files.zip, `UNO-TH_Rev3e.brd` layer 20 — https://docs.arduino.cc/static/6bb7a3ca51ebee82a252f60c0b418787/A000066-cad-files.zip | — |
| 2 | Official size quoted in "What it is" | corrected | https://docs.arduino.cc/hardware/uno-rev3/ (page-data: Length 68.6 mm, Width 53.4 mm, Weight 25 g) | "68.6 x 53.3 mm" → "68.6 x 53.4 mm (official; Eagle 68.58 x 53.34)" |
| 3 | 4 mounting holes, 3.2 mm, at (13.97, 2.54), (15.24, 50.80), (66.04, 7.62), (66.04, 35.56) | confirmed | brd `<hole>` elements [4] | — |
| 4 | ZU4 at (46.355, 16.383) R180, pad 1 RESET at (62.865, 20.193), pin 14 (29.845, 20.193), pin 28 (62.865, 12.573); notch toward +x | confirmed | brd package pads transformed [4] | — |
| 5 | Shield header pads: D0 at x 63.5, D7 45.72, D8 41.656 (160 mil gap), POWER and AD rows at y 2.54, IOL/IOH at y 50.8 | confirmed | brd IOL/IOH element pads + nets IO0/IO7/IO8 [4] | — |
| 6 | 328P ICSP pin map 1 MISO (63.627, 30.48), 2 +5V, 3 SCK, 4 MOSI, 5 RESET, 6 GND; ICSP1 pin 1 at (20.828, 47.498) | confirmed | brd pads + signal contactrefs [4] | — |
| 7 | D1 "M7" between PWRIN (anode) and VIN (cathode), cathode pad at +x (23.79, 2.794) | confirmed | brd signals PWRIN/VIN, pads [4] | — |
| 8 | Power auto-select: RN1 10k/10k VIN divider → CMP → U5 pin 3; U5 pin 2 = +3V3; U5 pin 1 = GATE_CMD → T1 pad 3; T1 pad 1 USBVCC, pad 2 +5V; threshold VIN 6.6 V | confirmed | brd nets CMP, GATE_CMD, USBVCC, +3V3 [4] | — |
| 9 | U1 NCP1117ST50T3G pins 1 GND, 2/tab +5V, 3 VIN; U2 LP2985-33DBVR pins 1/3 +5V, 2 GND, 5 +3V3 | confirmed | brd nets [4] | — |
| 10 | NCP1117 dropout 1.07 V typ / 1.2 V max at 800 mA, 20 V max input | corrected (partly unverified) | onsemi NCP1117/D via https://www.mouser.com/pdfDocs/NCP1117-D.pdf (search snippet; PDF fetch timed out) | "1.07 V typ / 1.2 V max" → "1.2 V max (1.07 V typ, unverified)" |
| 11 | LP2985 150 mA, ~280 mV dropout at 150 mA | confirmed, refined | https://www.ti.com/lit/ds/symlink/lp2985.pdf | added: 280 typ/350 max (legacy die), 180 typ/198 max (new die) |
| 12 | F1 MF-MSMF050-2: 0.50 A hold, 1.00 A trip, 15 V max, 0.15 s at 8 A | confirmed | https://www.bourns.com/docs/Product-Datasheets/mf-msmf.pdf | — |
| 13 | VIN limits 6-20 V, USB max 5.5 V, -40..85 °C; nominal 7-12 V; 20 mA per I/O (spec page) | confirmed | https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf ; tech-specs page-data | — |
| 14 | 328P: 40 mA per pin, 200 mA VCC/GND, pins -0.5..VCC+0.5, pull-up 20-50 kΩ, BODLEVEL 101 = 2.5/2.7/2.9 V | confirmed, refined | https://ww1.microchip.com/downloads/en/DeviceDoc/ATmega48A-PA-88A-PA-168A-PA-328-P-DS-DS40002061B.pdf | added RESET abs. max -0.5..13.0 V |
| 15 | VIH 0.6 VCC / VIL 0.3 VCC described as "typical" values | corrected | same Microchip datasheet, Table 30-1 | "typical datasheet values" → "guaranteed min/max limits for VCC 2.4-5.5 V" |
| 16 | LEDs: ON via RN4C∥RN4D from +5V; L via RN2A from L13 (U5B buffer of SCK); TX/RX anodes via RN2 1k to +5V, cathodes to 16U2 PD5 (pin 11, TXLED) / PD4 (pin 10, RXLED), active LOW; RN2D = DTR to GND | confirmed | brd nets N$3, N$1/L13, N$35/N$36, TXLED/RXLED, DTR [4]; `firmwares/atmegaxxu2/arduino-usbserial/Board/LEDs.h` and `Arduino-usbserial.c` at ArduinoCore-avr 1.8.8 | — |
| 17 | UART: 16U2 PD3 (M8RXD) → RN4 → D0; D1 → RN4 → 16U2 PD2 (M8TXD); DTR = 16U2 PD7 → C5 100 nF → RESET | confirmed | brd nets M8RXD/M8TXD/IO0/IO1/DTR/RESET [4] | — |
| 18 | boards.txt: protocol arduino, 115200, max 32256 / 2048, fuses L 0xFF H 0xDE E 0xFD, lock 0x0F, unlock 0x3F, VID/PID 2341:0043 (+0001, 2A03:0043, 0243, 006A); LED_BUILTIN 13; SPI 10/11/12/13 | confirmed | https://raw.githubusercontent.com/arduino/ArduinoCore-avr/1.8.8/boards.txt ; variants/standard/pins_arduino.h | — |
| 19 | Optiboot 4.4, LED_START_FLASHES=3 for atmega328, 62.5 ms per toggle, runs only on EXTRF, 1 s watchdog | confirmed | ArduinoCore-avr 1.8.8 `bootloaders/optiboot/optiboot.c` (OPTIBOOT_MAJVER/MINVER 4/4, line 290 EXTRF, WATCHDOG_1S, TCNT1 = -(F_CPU/(1024*16))) and Makefile line 221 | — |
| 20 | §4 "D13 toggles 3 times" during Optiboot | corrected | optiboot.c `flash_led(LED_START_FLASHES * 2)` | "toggles 3 times" → "flashes 3 times (6 toggles)" |
| 21 | arduino:avr 1.8.8 uses avr-gcc 7.3.0-atmel3.6.1-arduino7 and avrdude 8.0.0-arduino1 | confirmed | https://downloads.arduino.cc/packages/package_index.json | — |
| 22 | avrdude `arduino` auto-reset: DTR/RTS clear, 250 ms, assert 100 µs, clear, 100 ms; 10 sync attempts | confirmed | https://raw.githubusercontent.com/avrdudes/avrdude/v8.0/src/arduino.c , src/stk500.c | — |
| 23 | Verbose avrdude 8 console transcript ("avrdude: AVR device initialized…", "avrdude: device signature = 0x1e950f (probably m328p)", "avrdude done.  Thank you.") | corrected | avrdude v8.0 `src/avrdude.h` (pmsg_* macros lack MSG2_PROGNAME, use MSG2_UCFIRST), `src/main.c` lines 1086-1093, 1413-1418, 1604, 1699, 1859; `src/update.c` lines 514, 531, 571, 620 | old avrdude 6.x-style transcript → avrdude 8 lines without "avrdude:" prefix: "AVR device initialized…", "Device signature = 1E 95 0F (ATmega328P)", "Writing 924 bytes to flash", "924 bytes of flash verified", "Avrdude done.  Thank you." |
| 24 | Failure strings `avrdude: stk500_getsync() attempt 1 of 10…`, `stk500_recv(): programmer is not responding`, `ser_open(): can't open device "COM4"` attributed to avrdude 8 | corrected | avrdude v8.0 `src/stk500.c` lines 79, 127; `src/ser_posix.c` line 390; `src/main.c` line 1450 | → `Warning: attempt 1 of 10: not in sync: resp=0x00`, `Error: programmer is not responding`, `Error: cannot open port …: …`, `Error: unable to open port … for programmer arduino`; the old forms kept, labelled avrdude 6.3 |
| 25 | PWM 976.56 Hz (Timer0 fast PWM /64) on D5/D6, 490.20 Hz phase-correct on D3/D9/D10/D11 | confirmed | ArduinoCore-avr 1.8.8 `cores/arduino/wiring.c` init() (WGM00+WGM01, CS01+CS00; Timer1/2 /64 phase-correct) | — |
| 26 | Production BOM: U1 SPX1117M3-L-5, D1 CGRA4007-G, U5 LMV358LIST-A.9, Y1 ECS-160-20-4X-DU, PC1/PC2 EEE-1EA470WP 25 V, F1 listed as "Chip Capacitor, High Density" | confirmed | A000066 datasheet BOM table (Modified 21/10/2026) | — |
| 27 | USB-B overhang 6.47 mm, barrel 1.87 mm | confirmed (approx.) | brd package geometry [4]; silkscreen-only extents give 6.34 / 1.80 mm, so the copper+doc figure is the outer bound | — |
| 28 | TX/RX LED pulse length | unverified (constant not found), tick added | `Arduino-usbserial.c` line 151 `TCCR0B = (1 << CS02)` | added: tick = 4.096 ms |
| 29 | Heights, mask colour, chip laser markings, factory sketch, Servo/LiquidCrystal versions, Blink byte count | unverified (left as marked in the body) | — | — |
