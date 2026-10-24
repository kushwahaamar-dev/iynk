# Basys 3 fact sheet

## 0. Header

| Field | Value |
|---|---|
| Product | Basys 3 Artix-7 FPGA Trainer Board |
| Manufacturer | Digilent Inc. (now part of Emerson) |
| FPGA | AMD/Xilinx Artix-7 **XC7A35T-1CPG236C** (Vivado part string `xc7a35tcpg236-1`) [1][3] |
| PCB part number | **PB200-183**, silkscreened on the back with "REV C" on the photographed board [11] |
| Revisions | Master XDC header says "for the Basys3 rev B board" [3]; Reference Manual covers rev C (DOC#: 502-183, "Revised July 10, 2019") [1]; latest public schematic is **Rev D.1** (2/5/2021, Doc# 500-183) [4]. Rev C → Rev D change: Quad-SPI flash IC8 changed from Spansion S25FL032P0XMFI00 to **Macronix MX25L3233FMI-08G** [4][5][10]. Model **Rev D** with the Macronix flash unless the figure is a rev C board. |
| Size | 4.80 × 2.80 in = **121.92 × 71.12 mm** [6][7][8] |

**What it is.** The Basys 3 is Digilent's entry-level FPGA teaching board. A single Artix-7 XC7A35T FPGA sits in the middle of a blue PCB surrounded by the classic Basys user I/O: 16 slide switches and 16 green LEDs along the bottom edge, five push buttons in a plus shape, and a 4-digit red common-anode 7-segment display. Along the top edge are a micro-USB port (power + JTAG programming + USB-UART through an FTDI FT2232HQ), a 12-bit VGA port, and a USB-A host port, served by a PIC24 microcontroller, that accepts one keyboard or mouse (presented to the FPGA as PS/2) or a FAT32 USB stick carrying a bitstream. Four Pmod ports (JA, JB, JC and the analog-capable JXADC) sit on the left and right edges. The FPGA has no non-volatile memory of its own: at power-up it loads its configuration from a 32 Mbit Quad-SPI flash (or is loaded over JTAG/USB stick), and the green DONE LED lights when configuration finishes. Everything is 3.3 V logic; nothing is 5 V tolerant [1][4].

## 1. Sources

Official first. digilent.com pages sit behind a Cloudflare challenge, so web pages were read through Wayback Machine snapshots; the PDFs/ZIPs were downloaded directly.

1. Basys 3 Reference Manual PDF, rev C, revised 2019-07-10, DOC#: 502-183. https://digilent.com/reference/_media/reference/programmable-logic/basys-3/basys3_rm.pdf — features, power table, configuration modes, 7-seg multiplexing guidance, VGA timing, PS/2/HID host, XADC, factory BIST, Pmod drawings.
2. Basys 3 web Reference Manual, https://digilent.com/reference/programmable-logic/basys-3/reference-manual (Wayback snapshot 2025-01-26) — same content as [1] with corrections (JP2 naming); used to cross-check errata.
3. Basys-3-Master.xdc, https://github.com/Digilent/digilent-xdc/blob/master/Basys-3-Master.xdc (latest commit 69d35015d4, 2022-11-22, "Add SPI configuration mode settings") — every pin and port name in sections 3, 4 and 7.
4. Basys 3 schematic Rev D.1 (Altium, 8 sheets, 2021-02-05; sheet 4, USB/FT2232H, is not published), https://digilent.com/reference/_media/reference/programmable-logic/basys-3/basys-3-sch-public-rev-d.pdf — every resistor value, LED/button/switch circuit, power tree, configuration straps, PIC24 connections.
5. Basys 3 schematic Rev C.0 (2014-05-21, 7 pages), https://digilent.com/reference/_media/reference/programmable-logic/basys-3/basys-3_sch.pdf — Spansion flash, rev C differences.
6. Basys 3 mechanical drawing package, https://digilent.com/reference/_media/reference/programmable-logic/basys-3/basys_3_dimensions.zip (Mechanical_Basys3.pdf, Basys3_DXF.DXF) — board outline, mounting holes, every through-hole pad centre (parsed from the DXF PadHoleLayer with a script).
7. Basys 3 STEP model, https://digilent.com/reference/_media/reference/programmable-logic/basys-3/basys3.zip (Basys3.stp) — per-part 3D bounding boxes (centres, footprints, heights) and colours, parsed with a script.
8. Basys 3 resource center, https://digilent.com/reference/programmable-logic/basys-3/start (Wayback) — product dimensions, Vivado support statements.
9. Basys 3 GPIO demo, https://digilent.com/reference/programmable-logic/basys-3/demos/gpio (Wayback 2024-09-08) and https://github.com/Digilent/Basys-3/releases (latest tag GPIO/2024.1-1) — factory demo behaviour and photos.
10. Basys 3 programming guide, https://digilent.com/reference/learn/programmable-logic/tutorials/basys-3-programming-guide/start (Wayback 2024-11-07) — JTAG/flash/USB-stick procedures; Macronix flash supported from Vivado 2017.2.
11. Digilent product photo basys3-frontbackviews.jpg (4320 × 2880, front and back) from the resource center media — silkscreen text, chip markings, colours, bottom-side parts.
12. AMD Adaptive SoC & FPGA design tools downloads, 2026.1 page, https://www.amd.com/en/support/downloads/adaptive-socs-and-fpgas/development-tools/2026-1.html (fetched 2026-10-24) — current Vivado release (2026.1, update 2026.1.1 of Sep 10, 2026), new tiered licensing.
13. Real Vivado logs for Basys 3 designs found on GitHub (code search): a Vivado 2025.1 synthesis `runme.log` (repo Retriever-Attic/Basys3_LED_OnOff), a Vivado 2025.2 implementation `runme.log` for a "blinker" design (repo hossemarino/fpga_blinker…, name truncated in notes), and a Vivado 2019.1 `vivado.log` with Hardware Manager and flash programming (repo KarenOk/SAP-1-Computer) — exact console strings in section 5.
14. FTDI FT2232H datasheet DS_FT2232H, http://www.ftdichip.com/Support/Documents/DataSheets/ICs/DS_FT2232H.pdf (linked from [1]; not re-read this run).
15. Macronix MX25L3233F datasheet, http://www.macronix.com/Lists/Datasheet/Attachments/6744/MX25L3233F,%203V,%2032Mb,%20v1.6.pdf (linked from [1]; not re-read).
16. Microchip PIC24FJ256GB110 family datasheet 39747C, http://ww1.microchip.com/downloads/en/DeviceDoc/39747C.pdf (linked from [1]; not re-read).
17. Lucky Light KW4-281ASB "Super Bright Red Common Anode" 0.28 in 4-digit display spec (W2841C/D, Rev V.2, 2009), via search-result snippet only; the PDF could not be downloaded.
18. Xilinx DS181 (Artix-7 DC/AC data sheet), UG470 (7-series configuration), UG480 (XADC), UG475 (packaging) — values quoted from these are marked "(from <doc>, not re-fetched)".
19. AMD Vivado licensing options page, https://www.amd.com/en/products/software/adaptive-socs-and-fpgas/vivado/vivado-licensing-options.html (fetched 2026-10-24) — 2026.1 tiers: BASIC ($0, annual licence with free renewal, "All 7 Series & low-end UltraScale / UltraScale+ devices"), CORE, PRO, ENTERPRISE, GOLD.
20. Digilent Forum threads on `[DRC NSTD-1]` / `[DRC UCIO-1]` errors (e.g. https://forum.digilent.com/topic/18964-unspecified-io-standard/ , https://forum.digilent.com/topic/1969-problem-with-vivado-bitstream-generation/), seen as search results only — confirm the message IDs and the "Bitgen not run" chain.

## 2. Geometry (board frame)

**Frame.** Component (top) side viewed from above, "BASYS3" silkscreen readable. Origin = bottom-left corner of the outline, +x right, +y up, mm. **The bottom edge is the slide-switch / LED edge**; the top edge carries micro-USB, VGA and USB-A. JA/JXADC are on the left edge, JB/JC on the right edge.

**How coordinates were obtained.** Through-hole pad centres come from the official DXF [6] (PadHoleLayer circles clustered by a script; DXF offset −25.4, −25.4 mm removed). SMD part centres, footprints and heights come from the official STEP model [7] (board centred at the origin in the STEP; +60.96, +35.56 mm added). Heights are above the top surface of the PCB. The DXF and the STEP agree with the drawing's dimensions (hole spacing 4.65 × 2.65 in, hole inset 0.15 in; micro-USB at 1.25 in, VGA at +1.16 in, USB-A at +1.14 in from it) [6]. Positions marked "(estimated from photo [11])" were not in either file.

### 2.1 Board

| Item | Value |
|---|---|
| Outline | 121.92 × 71.12 mm, **square corners** (no arcs in the DXF) [6] |
| Thickness | 1.524 mm in the STEP model [7] (nominal 1.6 mm board is typical; 1.524 = 0.060 in) |
| Mounting holes | 4 plated holes, Ø 3.658 mm (0.144 in), centres (3.81, 3.81), (118.11, 3.81), (3.81, 67.31), (118.11, 67.31) [6] |
| Solder mask | Blue (Digilent Basys blue) [11] |
| Silkscreen | White [11] |
| Feet | 4 clear-blue translucent rubber domes under the corners, Ø 8.7 mm × 3.73 mm [7] |

### 2.2 Top-side parts

| Designator | What | Package | Centre (x, y) | Rot. | Footprint w × h | Height | Colour / marking | Source |
|---|---|---|---|---|---|---|---|---|
| IC7 | FPGA XC7A35T-1CPG236C | CPG236 BGA, 10 × 10 mm, 0.5 mm pitch | (61.00, 42.00) | 0° | 10 × 10 | 1.2 | Black/dark grey lid. Marking (lot codes vary): XILINX logo, "ARTIX™-7", "XC7A35T", "CPG236ABX1409", "D23491A", "1C" speed/temp grade line, "TAIWAN" | [7], marking [11] |
| IC1 | FTDI FT2232HQ USB bridge | QFN-64, 9 × 9 | (31.70, 58.40) | 0° | 9 × 9 | ~0.9 | Black, FTDI logo, "FT2232HQ", date/lot code (e.g. "1225-C") | [7][11] |
| IC2 | Microchip PIC24FJ128GB106-I/MR (USB host) | QFN-64, 9 × 9 | (90.00, 48.40) | 0° | 9 × 9 | ~0.9 | Black, Microchip logo, "PIC24FJ128", "GB106", "-I/MR", date code | [7][11] |
| DISP1 | 4-digit 7-segment, common anode, 0.28 in (KW4-281ASB; alternate TOF-2481BE-N) | 12-pin DIP, 2 × 6, 2.54 mm pitch, rows 7.62 mm apart | (33.0, 26.4) | 0° | 32.2 × 10.2 | ~5.8 | Charcoal/black face, pale grey segments when off, white package sides; segments glow **red**. 4 decimal points; a colon between digits 2 and 3 is moulded but **not wired** (never lights). Pin rows at y 22.59 and 30.21. Silk "DISP1" | [6][7][17][11] |
| SW0–SW15 | User slide switches (SPDT) | Through-hole, 3 pins at 4.0 mm pitch, y 4.8 / 8.8 / 12.8 | SWn: x = 11.40 + 6.6·(15 − n), y = 8.80 (SW15 at x 11.40 on the left, SW0 at x 110.40 on the right) | 0° (slides along y) | body 5.7 × 11.5 | body ~7.5; actuator top ~11.5 | Black body with an amber/tan strip at the top end; black actuator 3.2 × 5.74. **Actuator up (toward the LEDs) = ON = 3.3 V.** Silk "SWn" above, "(pin)" e.g. "(V17)" below, white rectangle around | [6][7][11] |
| LD0–LD15 | User LEDs, green | 0603-class SMD (STEP: 1.15 × 1.95) | LDn: x = 11.46 + 6.6·(15 − n), y = 17.70 (LD15 left, LD0 right) | 90° (long axis along y) | 1.15 × 1.95 | ~0.35 | Pale yellow/white lens when off, **green** when lit. Silk "LDn" above, "(pin)" to the right, e.g. "LD0" "(U16)" | [7][11] |
| BTNU / BTNL / BTNC / BTNR / BTND | User push buttons, SMD tactile (PTA-142-style) | 4-leg SMD | U (90.00, 37.00); L (81.50, 30.00); C (90.00, 30.00); R (98.50, 30.00); D (90.00, 23.00) | U/C/D legs left/right (7.5 × 4.5); L/R legs top/bottom (4.5 × 7.5) | 7.5 × 4.5 | ~3.7 | Black body and black round knob. Silk "BTNU (T18)" right of U, "BTNL (W19)" left of L, "BTNC (U18)" below C, "BTNR (T17)" right of R, "BTND (U17)" left of D | [7][11] |
| BTN PROG | Configuration reset (drives PROGRAM_B low) | 4-leg SMD tactile | (107.50, 65.50) | legs top/bottom | 4.5 × 7.5 | ~3.7 | **Red** knob. Silk "PROG" | [7][11] |
| SW16 | Power switch | Same slide switch, 3 pins at x 20.0, y 59.9 / 63.9 / 67.9 | (20.0, 63.9) | 0° | 5.7 × 11.5 | ~11.5 | Up = ON. Silk "ON" upper right, "OFF" lower right, "POWER" below | [6][7][11] |
| LD20 | Power-good LED, **red** | SMD | (8.80, 65.52) | 0° | — | ~0.35 | Silk "LD20", "POWER" | [7][11] |
| JP2 | Power-source jumper, 1 × 3, 2.54 mm | TH header | (12.0, 66.5); pins y 69.04 (pin 1, square pad, top), 66.5, 63.96 | vertical | — | ~8.5 with shunt | Pin 1 VEXT (top), pin 2 VU (centre), pin 3 VBUS (bottom). Silk "EXT" at the top, "USB" at the bottom, "JP2" below. Factory: blue shunt on the lower pair = **USB** (the STEP model shows it on the upper pair, EXT) | [4][6][11] |
| J6 | External power input, 1 × 2, 2.54 mm | TH header | (20.3, 53.3); pin 1 EXT at (19.03, 53.3), pin 2 GND at (21.57, 53.3) | horizontal | — | ~8.5 | Silk "EXT  GND", "5V Only!", "J6" | [4][6][11] |
| J4 | Micro-USB (Micro_USB_AB_Thru_Hole) "PROG" | TH shell, 4 oblong slots | x 31.70; STEP extent x 27.60–35.80, y 66.42–72.72 | opening faces +y (up, off the top edge) | 8.2 × 6.3 | ~2.7 | Silver shell; **overhangs the top edge by 1.6 mm**. Silk "PROG" (vertical, left), "J4" | [6][7][11] |
| LD17 / LD18 | UART RX / TX activity LEDs | SMD | (38.00, 68.52) / (42.00, 68.52) | 0° | — | ~0.35 | Silk "RX", "TX" below. Colour (unverified; appear yellow-ish/amber in photos) | [7][1] |
| J1 | VGA DB15 HD female, right angle (TE 1-1734530-3) | TH, 15 pins in 3 rows at y 58.46 / 61.00 / 63.54; mount holes Ø 3.175 at (48.506, 61.0) and (73.5, 61.0) | x 61.0; STEP extent x 43.69–78.76, y 55.78–81.83 | opening faces +y | 35.1 × ~26 | 12.6 (STEP top) | Blue-grey/black insert, nickel shell, hex jack posts, board-lock clips; **overhangs the top edge by ~10.7 mm** including jack posts. Silk "VGA", "J1" | [6][7] |
| LD16 | PIC24 "BUSY" LED | SMD | (79.70, 67.52) | 0° | — | ~0.35 | Silk "LD16", "BUSY"; R94 next to it. Colour (unverified) | [7][4] |
| J2 | USB-A host receptacle (Würth 61400416021) | TH, shell holes Ø 2.4 at (83.43, 60.9) and (96.57, 60.9); contacts at x 86.47 / 88.97 / 90.97 / 93.47 | x 90.0; STEP shell x 77.53–102.47, y 57.12–71.32 | opening faces +y | ~14.2 deep | ~7.6 | Silver shell, white or black tongue (unverified). Silk "USB", "J2" | [6][7] |
| JP1 | Programming-mode jumper, 1 × 4, 2.54 mm | TH | (101.5, 64.94); pin 1 top at y 68.75, then 66.21, 63.67, 61.13 | vertical | — | ~8.5 | Silk "1" at the top, "JP1" (left, vertical), "MODE" (right, vertical), and labels "QSPI" / "JTAG" / "USB" beside the three positions. Factory shunt on pins 1–2 = **QSPI** | [4][6][11] |
| LD19 | DONE LED, green | SMD | (112.92, 65.52) | 0° | — | ~0.35 | Silk "LD19", "DONE" | [7][11] |
| JA | Pmod 2 × 6 right-angle female, 2.54 mm | TH, holes at x 7.75 and 10.25, y 45.65 … 58.35 | holes (9.0, 52.0); body centre (4.12, 52.0) | opening faces −x (out of the left edge) | body 12.95 × 15.75 | 5.07 | Black. **Overhangs the left edge by 2.36 mm.** Silk "1" at the bottom, "GND" and "3V3" at the top, "JA" | [6][7][11] |
| JXADC | Pmod 2 × 6 right-angle female | TH, x 7.75 / 10.25, y 22.85 … 35.55 | holes (9.0, 29.2); body centre (4.12, 29.2) | faces −x | body 12.95 × 15.75 | 5.07 | Black, overhangs left edge ~2.4 mm. Silk "JXADC" at the top, "3V3", "GND", "1" at the bottom | [6][7][11] |
| JB | Pmod 2 × 6 right-angle female | TH, holes at x 111.75 and 114.25, y 45.65 … 58.35 | holes (113.0, 52.0); body centre (117.92, 52.0) | faces +x | body 12.95 × 15.75 | 5.07 | Black, **overhangs the right edge by ~2.48 mm**. Silk "1" and "JB" at the top, "GND", "3V3" at the bottom | [6][7][11] |
| JC | Pmod 2 × 6 right-angle female | TH, holes at x 111.75 / 114.25, y 22.85 … 35.55 | holes (113.0, 29.2); body centre (117.92, 29.2) | faces +x | body 12.95 × 15.75 | 5.07 | Silk "1" at the top; "GND", "3V3", "JC" at the bottom | [6][7][11] |
| J5 | FPGA JTAG 1 × 6 (not loaded) | Staggered pads, pin 1 at (2.203, 45.65) … pin 6 at (1.797, 58.35) | (2.0, 52.0) | — | — | pads only | No top silk; "1" marked on the back | [4][6] |
| J3 | PIC24 ICSP 1 × 6 (factory use) | Staggered pads, pin 1 at (120.203, 45.65) … pin 6 at (119.797, 58.35) | (120.0, 52.0) | — | — | pads only | — | [4][6][11] |
| W1 / W3 / W2 | Test points VCC3V3 / VCC1V0 / VCC1V8 | Plated holes | W1 (21.4, 34.5); W3 (28.5, 34.5); W2 (68.7, 26.7) | — | — | flush | Gold. Identity read from back silkscreen (mirrored) | [6][11] |
| Passives | 0402/0603 resistors and capacitors; FPGA decoupling C45–C103 ring IC7 | SMD | around IC7 and along the I/O rows (estimated from photo [11]) | — | — | <0.9 | Beige/brown caps, black resistors | [4][11] |

**Front silkscreen artwork** [11]: large "BASYS3™" logo text; "DIGILENT®" logo with "www.digilentinc.com"; Linear Technology logo; "XILINX | UNIVERSITY PROGRAM" logo; "CLK100MHz (W5)" near the lower left of the FPGA; UL marks "94V-0", date code "1426", "10031-TT-6020" (fabricator codes, vary by lot). Under each switch the FPGA pin in parentheses; beside each LED its pin in parentheses.

### 2.3 Bottom-side parts (see-through view; reflow side 2)

| Designator | What | Position | Source |
|---|---|---|---|
| IC8 | Quad-SPI flash, 32 Mbit. Rev D: Macronix **MX25L3233FMI-08G**; rev C: Spansion **S25FL032P0XMFI00** (photo marking "SPANSION FL032PIF 3310QQ30 A ©08") | SOIC-16 (300 mil), centre (90.67, 30.65) under the button cluster, body hangs 0 to 2.5 mm below the bottom surface of the PCB (STEP) | [4][5][7][11] |
| IC6 | Alternate MLP8 flash footprint (S25FL032P0XNFI00), **never loaded** ("Load either the MLP8 or the SOIC16 package, not both") | near IC8 | [4] |
| IC9 | Microchip **DSC1033CC1-100.0000T** 100 MHz MEMS oscillator, 4-pad, marked "DCP1408 2225" | ≈ (50.7, 26.6) (estimated from photo [11]) | [4][11] |
| IC10 | LTC3633EUFD dual 3 A buck (1.0 V and 3.3 V), QFN, marked "LT 3E 3633", between L1 "1R5" (NR5040T1R5N, 1.5 µH) and L2 "2R2" (NR5040T2R2N, 2.2 µH); bulk caps C113/C114/C119/C120 | lower-left quadrant on the back (estimated from photo [11]) | [4][11] |
| IC11 | LTC3621EMS8E 1.8 V buck, MSOP-8E "LTGDH", with L3 3.3 µH (NRS4018T3R3MDGJ), near W2 | (estimated from photo [11]) | [4][11] |
| IC4 | 4-pad oscillator, also marked "DCP1408 2225", next to R111 and C29; probably the 12 MHz source of net USB_12MHZ (unverified, sheet 4 unpublished) | top centre-right (estimated from photo) | [11] |
| IC3, IC5 | IC3 SOT-23-6 "2PH0"; IC5 small Fairchild QFN — both on the unpublished sheet 4 (identity unverified) | top left (estimated) | [11] |
| Q1, Q2 | Dual PNP transistors driving the 7-seg anodes | near DISP1 | [4] |
| Q3 | FDV301N driving LD20 | — | [4] |
| Q6/Q7 | FDN338P P-FET + FDV301N switching VBUS to the USB-A port | near J2 | [4] |
| D1–D9 | 4-channel TVS/ESD arrays on Pmod lines and JTAG | near each Pmod | [4] |
| X1 | 8 MHz crystal footprint for the PIC24, **not loaded** | — | [4] |
| Silk | "PB200-183", "REV C", CE and WEEE logos, barcode sticker | — | [11] |

### 2.4 Connector pin-1 and orientation summary

- Pmods: 2 rows of 6, 2.54 mm pitch along the edge (DXF hole y spacing 2.540 mm; the two hole columns are 2.50 mm apart in the DXF, x 7.75/10.25 and 111.75/114.25). Pins 1–6 are one row and 7–12 the other; pins 5/11 = GND, 6/12 = 3.3 V. JA and JXADC: pin 1 at the **bottom** (y 45.65 / 22.85), pin 6 at the top. JB and JC: pin 1 at the **top** (y 58.35 / 35.55), pin 6 at the bottom [1][6][11]. For a right-angle header the upper row (pins 1–6, farther from the PCB) uses the hole column farther from the edge (x 10.25 on the left, 111.75 on the right) — the product photo [11] shows the square pin-1 pad of JXADC in the inner column (x 10.25) at the bottom, which agrees.
- JP1 pin 1 at the top; JP2 pin 1 (EXT) at the top; J6 pin 1 (EXT) on the left.
- VGA J1 standard DB15 HD: 3 rows of 5 (pin 1 at the right end of the top row viewed into the socket; standard VGA numbering, not checked on the DXF).
- 7-segment pin 1: bottom-left of DISP1 (standard for this footprint; unverified).

## 3. Electrical

### 3.1 FPGA

| Item | Value | Source |
|---|---|---|
| Device | XC7A35T-1CPG236C: 33,280 logic cells in 5,200 slices (each slice: four 6-input LUTs, 8 flip-flops), 1,800 Kbit block RAM (50 × 36 Kb), 5 clock management tiles (each MMCM + PLL), 90 DSP48E1 slices, XADC, internal clock speeds above 450 MHz | [1] |
| Package | CPG236, 10 × 10 mm, 0.5 mm ball pitch; 106 user I/O on the board's banks 14/15/16/34/35; 2 GTP transceivers (bank 216) unused, tied to GND | [1][4] |
| Clock | **100 MHz** from IC9 DSC1033CC1-100.0000T MEMS oscillator (3.3 V, STBY# tied high) → net CLK100MHZ → **W5** (IO_L12P_T1_MRCC_34, a clock-capable pin). XDC port `clk`, `create_clock -period 10.00` | [3][4] |
| Configuration | 17,536,096-bit bitstream (uncompressed). Modes via JP1: Master SPI x4 from flash, JTAG, Slave Serial from PIC24 | [1][4] |
| Supplies | VCCINT = VCCBRAM = 1.0 V; VCCAUX = 1.8 V; VCCADC from 1.8 V through ferrite FB3; VCCBATT = 1.8 V; all VCCO = 3.3 V | [4] |
| I/O standard | LVCMOS33 on every pin (`IOSTANDARD LVCMOS33` throughout the XDC); CFGBVS pulled to 3.3 V | [3][4] |

### 3.2 Power tree

```
micro-USB J4 VBUS (5 V) ─┐
                         ├─ JP2 (USB / EXT) ── VU ──┬── SW16 power switch → EN
J6 EXT 4.5–5.5 V ────────┘                          ├── LTC3633 ch1 → 1.0 V (VCCINT, VCCBRAM)
                                                    │      └ PGOOD1V0 → LTC3621 RUN → 1.8 V (VCCAUX, VCCADC, 300 mA)
                                                    │                └ PGOOD1V8 → LTC3633 RUN2 → 3.3 V (VCCO, all logic)
                                                    │                                  └ PGOOD → Q3 → LD20 red
                                                    └── Q6 P-FET (on when EN) → J2 USB-A VBUS (unregulated, no fuse)
```

| Input / rail | Range / limit | Protection | Source |
|---|---|---|---|
| USB (J4) | 5 V from host; RM says USB 2.0 ports supply up to 500 mA, enough for most designs | VBUS protection is on unpublished sheet 4 (unknown) | [1][4] |
| EXT (J6, or battery via J6) | **4.5–5.5 V DC, ≥ 1 A (5 W)**; battery 3.6–5.5 V (≥ 4.6 V if the USB host port is used). Silk "5V Only!" | **No reverse-polarity diode, no fuse** on the EXT path; only C27 10 µF/10 V | [1][4] |
| 1.0 V (LTC3633 ch1) | RM Table 2: 2 A max, 0.2–1.3 A typical. Schematic and RM Fig. 2 label it "1A" | Internal current limit of LTC3633 | [1][4] |
| 1.8 V (LTC3621) | 300 mA max, 0.05–0.15 A typical | Internal current limit | [1][4] |
| 3.3 V (LTC3633 ch2) | 2 A max, 0.1–1.5 A typical | Internal current limit; active discharge (Q4/Q5, R180 100 Ω) when 1.8 V not good | [1][4] |
| USB-A VBUS (J2) | = VU, "not regulated" | No current limit or polyfuse; switched by Q6 | [1][4] |

Sequencing: 1.0 V → 1.8 V → 3.3 V by PGOOD chaining; LD20 lights only when the last regulator reports power good [4]. SW16 pulls EN from a VU divider (R182 4.7 K / R184 10 K ≈ 3.4 V) or to GND through R186 10 K [4].

### 3.3 Logic levels and current

- All user I/O is **3.3 V LVCMOS33, not 5 V tolerant** [1][3]. (unverified: an earlier draft cited a Digilent "do not drive Pmod pins above 3.4 V" limit to [1]; that text is not in the rev C reference manual, so treat 3.3 V as the working limit and the DS181 figure below as the absolute maximum.) DS181 absolute maximum for HR I/O input: VCCO + 0.55 V = 3.85 V (from DS181, not re-fetched).
- Default LVCMOS33 drive strength 12 mA (Vivado default; settable 4/8/12/16 mA) (from UG471/DS181, not re-fetched).
- Pmod JA/JB/JC signals pass through **200 Ω series resistors** (R1–R24) with TVS arrays on the connector side; JXADC through **100 Ω** (R154–R161) [4]. A Pmod pin shorted to GND therefore sources at most ≈ 3.3 V / 200 Ω ≈ 16 mA.
- Pmod 3V3 pins: up to **1 A total** from the 3.3 V rail [1].

### 3.4 ADC, PWM, DAC

- **XADC**: dual 12-bit, 1 MSPS ADC inside the FPGA, accessed through the DRP (or the XADC Wizard IP). Monitors on-die temperature and supply rails [1]. Auxiliary inputs on JXADC: XA1 = VAUX6 (J3 P / K3 N), XA2 = VAUX14 (L3 / M3), XA3 = VAUX7 (M2 / M1), XA4 = VAUX15 (N2 / N1) [3][4]. Input range 0–1 V unipolar (from UG480, not re-fetched). Anti-alias filter pads C33–C36 (1 nF) not loaded [1][4]. On-board VREFP/VREFN tied off → internal reference (1.25 V, from UG480, not re-fetched). Temperature: T(°C) = code × 503.975 / 4096 − 273.15 (12-bit code; from UG480, not re-fetched).
- **PWM**: no dedicated PWM hardware; any output pin can carry PWM generated in fabric logic. Frequency is whatever the design counts from the 100 MHz clock.
- **DAC**: none, except the VGA resistor ladder (4 bits per colour, see 3.6).

### 3.5 User I/O circuits

| Item | Circuit | Active level | Source |
|---|---|---|---|
| Switches SW0–SW15 | SPDT pole between VCC3V3 and GND → 10 K series → FPGA | Up = 1 (3.3 V), down = 0 | [4] |
| Buttons BTNU/L/C/R/D | VCC3V3 → button → node → 10 K series → FPGA; 10 K pull-down at the node (R37–R41) | **Active high** (pressed = 1) | [4] |
| LEDs LD0–LD15 | FPGA → 330 Ω → LED (green) → GND | **Active high** (1 = on) ≈ (3.3 − ~2.0) / 330 ≈ 4 mA | [4] |
| 7-segment cathodes CA–CG, DP | FPGA → 100 Ω → cathode | **Active low** (0 = segment on) | [1][4] |
| 7-segment anodes AN0–AN3 | FPGA → 2.2 K → PNP base; emitter 3.3 V, collector → common anode | **Active low** (0 = digit on) | [1][4] |
| LD16 BUSY | VCC3V3 → 470 Ω → LD16 → PIC24 RB0 (PIC sinks) | Active low, driven by PIC24 | [4] |
| LD17 RX / LD18 TX | Driven by the FT2232HQ UART activity (sheet 4) | Flash on traffic | [1] |
| LD19 DONE | DONE pin (200 Ω pull-up) → 100 Ω → LD19 → GND | Lights when DONE is released high = configured | [4] |
| LD20 POWER | VCC3V3 → 680 Ω → LD20 → Q3 (FDV301N, gate = PGOOD) | On when all rails good | [4] |
| PROG button | Pulls PROGRAM_B (4.7 K pull-up) to GND | Press = clear configuration and reload | [1][4] |

7-segment digit mapping: AN3 → Q1A → leftmost digit; AN2 → second; AN1 → third; AN0 → rightmost [4]. Display pins (DISP1): CA 11, CB 7, CC 4, CD 2, CE 1, CF 10, CG 5, DP 3; digit anodes A1 12, A2 9, A3 8, A4 6 [4].

### 3.6 Other interfaces

- **USB-UART/JTAG (IC1 FT2232HQ, J4)**: one channel is the Digilent USB-JTAG programmer, the other a UART to the FPGA. They work independently [1]. UART: FPGA input `RsRx` = B18 (net UART_TXD_IN, data from PC), FPGA output `RsTx` = A18 (UART_RXD_OUT) [3][4]. Names are from the PC's point of view [1]. Appears as a Windows COM port with FTDI VCP drivers [1]. Which FTDI channel is JTAG vs UART: (unverified; sheet 4 not published).
- **USB HID host (IC2 PIC24FJ128GB106, J2)**: after configuration the PIC24 acts as a USB host for **one** keyboard or mouse (no hubs) and presents it to the FPGA as PS/2: `PS2Clk` C17, `PS2Data` B17, both with `PULLUP true` in the XDC (pull-ups required). 11-bit frames, 20–30 kHz clock. Mouse sends 0xAA then ID 0x00 at power-up [1][3]. PIC24 clocked from net USB_12MHZ (OSCI pin 39) via R111; X1 8 MHz not loaded [4].
- **VGA (J1)**: 12-bit colour, 4 bits per channel through a resistor DAC (bit 3 = 510 Ω, bit 2 = 1 K, bit 1 = 2 K, bit 0 = 4 K) into the monitor's 75 Ω for 0–0.7 V; HS/VS through 100 Ω [1][4]. RM Fig. 14 timing at a **25 MHz** pixel clock: horizontal 640 visible / 16 front porch / 96 sync / 48 back porch = 800; vertical 480 / 10 / 2 / 29 = 521 lines [1]. The VESA 640 × 480 @ 60 Hz standard is 25.175 MHz and 525 lines (back porch 33) with negative HS/VS; monitors accept either. Use 525 lines for a "correct" lesson; note the RM's 521.
- **Quad-SPI flash (IC8)**: 32 Mbit, holds the bitstream (~2.2 MB uncompressed, fits) and spare space for user data. FPGA pins: `QspiDB[0..3]` D18, D19, G18, F18; `QspiCSn` K19; CCLK is a dedicated pin reached through the STARTUPE2 primitive [3]. PIC24 can also drive the flash/config lines (RB14 → QSPI_DQ1/DIN, RB15 → CCLK) for USB-stick programming [4].
- **On-board sensors**: none apart from the FPGA's internal XADC temperature and supply monitors [1].

### 3.7 Configuration straps

| Signal | Pin | Board connection | Source |
|---|---|---|---|
| M0 / M1 / M2 | V12 / W11 / U10 | M0 fixed high (1 K); JP1 sets M2 and M1 | [4] |
| JP1 pins | 1 GND, 2 MODE2 (1 K pull-up), 3 VCC3V3, 4 MODE1 (1 K pull-down) | Shunt 1–2 → M[2:0] = 001 Master SPI (**QSPI**, factory); 2–3 → 101 **JTAG** only; 3–4 → 111 Slave Serial (**USB** stick via PIC24) | [4] |
| DONE | U12 | 200 Ω pull-up, LD19 | [4] |
| PROGRAM_B | V10 | 4.7 K pull-up, PROG button | [4] |
| INIT_B | U11 | 4.7 K pull-up | [4] |
| PUDC_B | E18 | 1 K pull-up → I/O pull-ups **disabled** during configuration | [4] |
| CFGBVS | V11 | 4.7 K pull-up (3.3 V config bank) | [4] |
| JTAG | TMS W9, TCK C8, TDI W10, TDO W8 | to FT2232HQ and to unloaded J5 (100 Ω series) | [4] |

## 4. Pinout (from the master XDC [3])

All lines are commented out in the master XDC; the user uncomments the ones used. Exact syntax:

```tcl
set_property -dict { PACKAGE_PIN W5   IOSTANDARD LVCMOS33 } [get_ports clk]
create_clock -add -name sys_clk_pin -period 10.00 -waveform {0 5} [get_ports clk]
set_property -dict { PACKAGE_PIN V17   IOSTANDARD LVCMOS33 } [get_ports {sw[0]}]
set_property -dict { PACKAGE_PIN U18   IOSTANDARD LVCMOS33 } [get_ports btnC]
set_property -dict { PACKAGE_PIN C17   IOSTANDARD LVCMOS33   PULLUP true } [get_ports PS2Clk]
```

The file ends with these lines **active** (not commented):

```tcl
set_property CONFIG_VOLTAGE 3.3 [current_design]
set_property CFGBVS VCCO [current_design]
set_property BITSTREAM.GENERAL.COMPRESS TRUE [current_design]
set_property BITSTREAM.CONFIG.CONFIGRATE 33 [current_design]
set_property CONFIG_MODE SPIx4 [current_design]
```

### 4.1 Switches and LEDs (physical order left → right in the board frame)

| Position (left→right) | Switch | Port | Pin | LED | Port | Pin |
|---|---|---|---|---|---|---|
| 1 | SW15 | `sw[15]` | R2 | LD15 | `led[15]` | L1 |
| 2 | SW14 | `sw[14]` | T1 | LD14 | `led[14]` | P1 |
| 3 | SW13 | `sw[13]` | U1 | LD13 | `led[13]` | N3 |
| 4 | SW12 | `sw[12]` | W2 | LD12 | `led[12]` | P3 |
| 5 | SW11 | `sw[11]` | R3 | LD11 | `led[11]` | U3 |
| 6 | SW10 | `sw[10]` | T2 | LD10 | `led[10]` | W3 |
| 7 | SW9 | `sw[9]` | T3 | LD9 | `led[9]` | V3 |
| 8 | SW8 | `sw[8]` | V2 | LD8 | `led[8]` | V13 |
| 9 | SW7 | `sw[7]` | W13 | LD7 | `led[7]` | V14 |
| 10 | SW6 | `sw[6]` | W14 | LD6 | `led[6]` | U14 |
| 11 | SW5 | `sw[5]` | V15 | LD5 | `led[5]` | U15 |
| 12 | SW4 | `sw[4]` | W15 | LD4 | `led[4]` | W18 |
| 13 | SW3 | `sw[3]` | W17 | LD3 | `led[3]` | V19 |
| 14 | SW2 | `sw[2]` | W16 | LD2 | `led[2]` | U19 |
| 15 | SW1 | `sw[1]` | V16 | LD1 | `led[1]` | E19 |
| 16 | SW0 | `sw[0]` | V17 | LD0 | `led[0]` | U16 |

### 4.2 Buttons (plus shape)

| Button | Port | Pin | Position |
|---|---|---|---|
| Centre | `btnC` | U18 | (90.0, 30.0) |
| Up | `btnU` | T18 | (90.0, 37.0) |
| Left | `btnL` | W19 | (81.5, 30.0) |
| Right | `btnR` | T17 | (98.5, 30.0) |
| Down | `btnD` | U17 | (90.0, 23.0) |

### 4.3 7-segment display

| Port | Pin | Segment / digit | Active |
|---|---|---|---|
| `seg[0]` | W7 | CA (a, top) | low |
| `seg[1]` | W6 | CB (b, upper right) | low |
| `seg[2]` | U8 | CC (c, lower right) | low |
| `seg[3]` | V8 | CD (d, bottom) | low |
| `seg[4]` | U5 | CE (e, lower left) | low |
| `seg[5]` | V5 | CF (f, upper left) | low |
| `seg[6]` | U7 | CG (g, middle) | low |
| `dp` | V7 | DP | low |
| `an[0]` | U2 | AN0, **rightmost** digit | low |
| `an[1]` | U4 | AN1 | low |
| `an[2]` | V4 | AN2 | low |
| `an[3]` | W4 | AN3, **leftmost** digit | low |

So `seg[6:0]` = {g, f, e, d, c, b, a}. Hex patterns (0 = on): 0 `7'b1000000`, 1 `1111001`, 2 `0100100`, 3 `0110000`, 4 `0011001`, 5 `0010010`, 6 `0000010`, 7 `1111000`, 8 `0000000`, 9 `0010000`, A `0001000`, b `0000011`, C `1000110`, d `0100001`, E `0000110`, F `0001110`.

**Multiplexing is mandatory**: the four digits share the cathode lines, so only one digit can show its own pattern at a time. Drive one anode low, put that digit's pattern on the cathodes, rotate through all four. RM guidance: refresh all four digits every **1–16 ms (about 1 kHz to 60 Hz)**; each digit lit 1/4 of the period; flicker becomes visible around **45 Hz** [1]. Driving all anodes low with one pattern shows the same digit four times.

### 4.4 Pmod headers

Physical order: pins 1–6 in one row, 7–12 in the other. Port index mapping from the XDC comments ("Sch name") [3]:

| Pmod pin | JA port / pin | JB port / pin | JC port / pin | JXADC port / pin (XADC pair) |
|---|---|---|---|---|
| 1 | `JA[0]` J1 | `JB[0]` A14 | `JC[0]` K17 | `JXADC[0]` J3 (XA1_P, VAUX6P) |
| 2 | `JA[1]` L2 | `JB[1]` A16 | `JC[1]` M18 | `JXADC[1]` L3 (XA2_P, VAUX14P) |
| 3 | `JA[2]` J2 | `JB[2]` B15 | `JC[2]` N17 | `JXADC[2]` M2 (XA3_P, VAUX7P) |
| 4 | `JA[3]` G2 | `JB[3]` B16 | `JC[3]` P18 | `JXADC[3]` N2 (XA4_P, VAUX15P) |
| 5 | GND | GND | GND | GND |
| 6 | 3V3 | 3V3 | 3V3 | 3V3 |
| 7 | `JA[4]` H1 | `JB[4]` A15 | `JC[4]` L17 | `JXADC[4]` K3 (XA1_N) |
| 8 | `JA[5]` K2 | `JB[5]` A17 | `JC[5]` M19 | `JXADC[5]` M3 (XA2_N) |
| 9 | `JA[6]` H2 | `JB[6]` C15 | `JC[6]` P17 | `JXADC[6]` M1 (XA3_N) |
| 10 | `JA[7]` G3 | `JB[7]` C16 | `JC[7]` R18 | `JXADC[7]` N1 (XA4_N) |
| 11 | GND | GND | GND | GND |
| 12 | 3V3 | 3V3 | 3V3 | 3V3 |

Physical layout in the board frame (Digilent pinout image [8]): JA/JXADC read bottom → top as pin pairs 1/7, 2/8, 3/9, 4/10, 5/11 (GND), 6/12 (3V3). JB/JC read top → bottom 1/7, 2/8, 3/9, 4/10, 5/11 (GND), 6/12 (3V3). Notes: all 3.3 V only; 200 Ω series (JA/JB/JC), 100 Ω (JXADC); JXADC pins work as digital I/O too, but analog use limits them to 0–1 V differential/unipolar inputs; coupled routing may limit digital speed [1][4].

### 4.5 Other ports

| Function | Port | Pin |
|---|---|---|
| VGA red 0–3 | `vgaRed[0..3]` | G19, H19, J19, N19 |
| VGA green 0–3 | `vgaGreen[0..3]` | J17, H17, G17, D17 |
| VGA blue 0–3 | `vgaBlue[0..3]` | N18, L18, K18, J18 |
| VGA sync | `Hsync`, `Vsync` | P19, R19 |
| UART | `RsRx` (in), `RsTx` (out) | B18, A18 |
| PS/2 | `PS2Clk`, `PS2Data` (PULLUP true) | C17, B17 |
| Quad SPI | `QspiDB[0..3]`, `QspiCSn` | D18, D19, G18, F18; K19 |

Power/aux headers: J6 pin 1 EXT (+5 V), pin 2 GND. JP2 pin 1 VEXT, 2 VU, 3 VBUS. JP1 pin 1 GND, 2 MODE2, 3 VCC3V3, 4 MODE1. J5 (not loaded): 1 TMS, 2 TDI, 3 TDO, 4 TCK, 5 GND, 6 VCC3V3. J3 ICSP: 1 MCLR, 2 VCC3V3, 3 GND, 4 PGD2, 5 PGC2, 6 NC [4].

## 5. Programming

### 5.1 Toolchain (October 2026)

- **AMD Vivado Design Suite**. Current release **2026.1** (Lab Solutions dated Jun 23, 2026), with update **2026.1.1** (Sep 10, 2026) [12]. From 2026.1 Vivado uses a new **tiered licensing model**; "Vivado Basic tier license does not support minor releases (for example, 2026.1.1)" [12]. The no-cost **BASIC** tier covers "All 7 Series & low-end UltraScale / UltraScale+ devices" at $0 with an annual licence that needs free renewal, so the XC7A35T needs no paid licence [19]. Recent real Basys 3 logs exist from Vivado 2025.1 and 2025.2 [13].
- Digilent board files (vivado-boards repo) give the board part `digilentinc.com:basys3:part0` (version unverified). Digilent example projects support Vivado up to 2022.1/2024.1 per release tags (GPIO/2024.1-1) [8][9].
- Languages: Verilog, SystemVerilog, VHDL. Constraints: Basys-3-Master.xdc [3].
- Open-source alternative: Yosys + nextpnr-xilinx / F4PGA + openFPGALoader (`openFPGALoader -b basys3 top.bit`) (unverified for current versions).

### 5.2 Vivado flow and real console messages (for the upload animation)

Strings below are copied from real Basys 3 logs [13] (file paths and numbers vary per project).

**Synthesis** (Vivado 2025.1):
```
Command: synth_design -top LED -part xc7a35tcpg236-1
Starting synth_design
INFO: [Synth 8-6157] synthesizing module 'LED' [.../LED.v:23]
INFO: [Synth 8-6155] done synthesizing module 'LED' (0#1) [.../LED.v:23]
Finished RTL Elaboration : Time (s): cpu = 00:00:04 ; elapsed = 00:00:04 . Memory (MB): peak = 2173.812 ; ...
Finished Parsing XDC File [.../Basys-3-Master.xdc]
Start Technology Mapping
Finished Technology Mapping : ...
Synthesis finished with 0 errors, 0 critical warnings and 2 warnings.
synth_design completed successfully
```

**Implementation** (Vivado 2025.2, "blinker"):
```
Command: link_design -top blinker -part xc7a35tcpg236-1
Parsing XDC File [.../Basys-3-Master.xdc]
link_design completed successfully
Command: opt_design
INFO: [Project 1-461] DRC finished with 0 Errors
opt_design completed successfully
Command: place_design
Phase 1 Placer Initialization
place_design completed successfully
Command: phys_opt_design
INFO: [Vivado_Tcl 4-2279] Estimated Timing Summary | WNS= 7.599 | TNS= 0.000 |
phys_opt_design completed successfully
Command: route_design
Starting Routing Task
INFO: [Route 35-416] Intermediate Timing Summary | WNS=7.505  | TNS=0.000  | WHS=0.004  | THS=0.000  |
INFO: [Route 35-16] Router Completed Successfully
route_design completed successfully
```

**write_bitstream**:
```
Command: write_bitstream -force blinker.bit
INFO: [Vivado 12-3199] DRC finished with 0 Errors
Creating bitstream...
Bitstream compression saved 15939488 bits.
Writing bitstream ./blinker.bit...
INFO: [Vivado 12-1842] Bitgen Completed Successfully.
write_bitstream completed successfully
```
("Bitstream compression saved …" appears because the master XDC enables `BITSTREAM.GENERAL.COMPRESS TRUE`.)

**Program device** (Hardware Manager, Vivado 2019.1 log; same messages in current versions):
```
INFO: [Labtools 27-2285] Connecting to hw_server url TCP:localhost:3121
INFO: [Labtools 27-2222] Launching hw_server...
INFO: [Labtoolstcl 44-466] Opening hw_target localhost:3121/xilinx_tcf/Digilent/210183AA64C1A
INFO: [Labtools 27-1435] Device xc7a35t (JTAG device index = 0) is not programmed (DONE status = 0).
program_hw_devices [get_hw_devices xc7a35t_0]
INFO: [Labtools 27-3164] End of startup status: HIGH
```
The target serial ("210183…") is the board's FTDI serial; the device appears as `xc7a35t_0`. "End of startup status: HIGH" = DONE went high = LD19 lights.

**Flash (configuration memory)**: generate a .bin (`write_cfgmem` or "-bin_file" option), Add Configuration Memory Device: rev D (Macronix) `mx25l3233f-spi-x1_x2_x4`; rev C (Spansion) the 32 Mbit `s25fl032p-spi-x1_x2_x4` [10][13]:
```
create_hw_cfgmem -hw_device [lindex [get_hw_devices xc7a35t_0] 0] [lindex [get_cfgmem_parts {mx25l3233f-spi-x1_x2_x4}] 0]
INFO: [Labtools 27-3164] End of startup status: HIGH
INFO: [Labtools 27-2302] Device xc7a35t (JTAG device index = 0) is programmed with a design that has 1 SPI core(s).
Performing Erase Operation...
Erase Operation successful.
Performing Program and Verify Operations...
Program/Verify Operation successful.
INFO: [Labtoolstcl 44-377] Flash programming completed successfully
```

**Common beginner errors** (Vivado wording):
- Forgot to uncomment a pin in the XDC: `ERROR: [DRC NSTD-1] Unspecified I/O Standard: 1 out of 33 logical ports use I/O standard (IOSTANDARD) value 'DEFAULT', instead of a user assigned specific value. …` and `ERROR: [DRC UCIO-1] Unconstrained Logical Port: 1 out of 33 logical ports have no user assigned specific location constraint (LOC). …` (counts vary), then `ERROR: [Vivado 12-1345] Error(s) found during DRC. Bitgen not run.`
- Port name in XDC does not match the HDL (case-sensitive): `WARNING: [Vivado 12-584] No ports matched '<name>'`.
- Using a button as a clock: placer error `[Place 30-574] Poor placement for routing between an IO pin and BUFG` (needs `CLOCK_DEDICATED_ROUTE FALSE`, which is a bad idea).
(NSTD-1, UCIO-1 and "Bitgen not run" are confirmed by many Digilent Forum reports [20]; the exact tail wording of NSTD-1/UCIO-1 and the 12-584 and Place 30-574 lines are from Vivado usage, not copied from a log: unverified.)

### 5.3 Upload paths and timings [1][10]

| Path | JP1 | What happens | Time |
|---|---|---|---|
| JTAG (Hardware Manager → Program Device, .bit) | any (JTAG works in every mode) | Volatile; lost at power-off or PROG press | ~5 s uncompressed |
| Quad-SPI flash (.bin/.mcs) | QSPI to boot from it | Non-volatile; FPGA boots from flash at power-up | programming 1–2 min; boot < 1 s |
| USB stick in J2 | USB | FAT32 stick with one .bit in the root; press PROG or power-cycle; PIC24 loads it (Slave Serial). LD16 solid while loading, slow pulse while waiting for a stick, fast blink on error | a few seconds |

Auto-reset: not applicable; PROG button or `program_hw_devices` reconfigures.

### 5.4 Factory design (BIST / GPIO demo) [1][9]

Loaded in flash at the factory: each switch lights the LED above it; the 7-segment counts 0–9 on all digits once per second; BTNU blanks the first digit, BTNL the second, BTNR the third, BTND the fourth (Digilent does not say whether "first" is the leftmost or rightmost digit: unverified); BTNC blanks the display and resets the counter. UART at 9600 baud 8N1 prints "BASYS3 GPIO/UART DEMO!" at reset or BTNC and "Button press detected!" for other buttons. VGA shows a moving pattern with a USB-mouse cursor. Demo photo shows "5." on all four digits with DPs lit and the colon dark.

## 6. Real failure modes

| Fault | What happens physically | What the user sees |
|---|---|---|
| Reverse polarity on J6 (EXT) | No reverse diode or fuse [4]. Reversed 5 V forward-biases the LTC3633/LTC3621 internal switch body diodes and the ESD structures of everything on VU; current is limited only by the supply. Likely damage to the regulators and possibly the USB-A device | Supply goes into current limit; LD20 stays off; a hot regulator area under the board; smell of burnt epoxy if sustained (expected behaviour, unverified) |
| Reverse polarity on USB | Not possible (keyed micro-USB) | — |
| Over-voltage on J6 (> 5.5 V) | Out of spec [1]. VU feeds the bucks directly (LTC3633 itself tolerates up to 15 V, from LTC3633 datasheet, not re-fetched) but C27 and VIN caps are 10 V parts, and VU passes straight to the USB-A port's VBUS, so a keyboard/mouse sees the over-voltage first. 9–12 V will very likely kill the USB device and stress 10 V caps | Board may run; USB peripheral dies; above ~10 V a cap can short (heat, LD20 off) |
| Brown-out | No BOD on the board. LTC3633 has UVLO (unverified threshold). When VCCINT/VCCAUX sag the FPGA's power-on reset triggers and it loses its configuration; when power returns it reconfigures from flash (QSPI mode) | DONE LED goes off and comes back; design restarts from reset state; on weak USB ports, repeated resets |
| Over-current | Each rail has the regulator's internal current limit (1.0 V and 3.3 V up to 2 A, 1.8 V 300 mA). Pmod 3V3 total 1 A [1]. USB host port typically limits at ~500 mA+ and may shut the port | Board resets or LD20 goes out; Windows "USB device power surge" message |
| Cold solder joint | On a slide switch: input floats (10 K series, no pull) → LED flickers when touched. On a Pmod: intermittent signal. On a BGA ball (rare): random config failures | Flickering LED, DONE not lighting intermittently |
| 5 V into a 3.3 V pin | FPGA pins are not 5 V tolerant; DS181 abs max VCCO + 0.55 V. On Pmods, the 200 Ω series resistor limits the clamp current to roughly (5 − 3.3 − 0.6) / 200 ≈ 5.5 mA, which often saves the pin short-term but is out of spec and pumps current into the 3.3 V rail; on JXADC (100 Ω) ≈ 11 mA | Usually no immediate sign; long-term or with a stiff source, a dead I/O pin or a damaged bank |
| Shorting 5 V to GND | On USB power: the PC port's over-current protection trips; on EXT: the supply's limit. No on-board fuse on EXT; USB VBUS protection unknown (sheet 4) | Board goes dark; PC may disable the port |
| Shorting 3.3 V to GND (e.g. Pmod pin 6 to 5) | LTC3633 current limit / foldback; PGOOD drops | LD20 off, board resets; buck may get warm |
| Beginner traps | (1) XDC lines left commented → NSTD-1/UCIO-1, "Bitgen not run". (2) Forgetting the 7-seg is **active low** for both segments and anodes (everything lit = all zeros). (3) Not multiplexing → same digit on all four. (4) Buttons are **active high** and bounce (debounce ~10–20 ms). (5) JP1 left on USB with no stick → nothing loads, LD16 pulses. (6) JP2 on EXT with no supply → dead board. (7) Programming a .bit with JTAG and expecting it to survive power-off. (8) Choosing the wrong flash part (Spansion vs Macronix) in the cfgmem dialog. (9) Expecting the USB-A port to talk to a PC or accept a hub. (10) Port name case mismatch (`btnc` vs `btnC`). (11) Driving a slide-switch signal as a clock. | — |

## 7. Lesson facts (Verilog, real XDC names)

Uncomment `clk` (W5) and the pins used in each lesson [3].

**Lesson 1 – Blink and switches → LEDs.**
```verilog
module top(input clk, input [15:0] sw, output [15:0] led);
  reg [26:0] cnt = 0;
  always @(posedge clk) cnt <= cnt + 1;
  assign led[15]   = cnt[26];   // 100 MHz / 2^27 = 0.745 Hz blink (1.34 s period)
  assign led[14:0] = sw[14:0];  // switch up = LED on
endmodule
```

**Lesson 2 – Button with debounce + sensor (XADC temperature).** Synchronise `btnC` (U18, active high) with two flip-flops, debounce ~10 ms (1,000,000 clocks), rising-edge detect, count presses on `led`. Sensor: instantiate the XADC Wizard (`xadc_wiz_0`) or the `XADC` primitive in continuous mode reading the on-die temperature (channel 0, DRP address 7'h00); the 12-bit result is bits [15:4] of the DRP word; T(°C) = code × 503.975/4096 − 273.15 (UG480, not re-fetched). Show the code on LEDs or the 7-seg.

**Lesson 3 – PWM and analog.** 8-bit PWM brightness from switches:
```verilog
reg [7:0] pwm = 0;
always @(posedge clk) pwm <= pwm + 1;      // 100 MHz / 256 = 390.6 kHz PWM
assign led[0] = (pwm < sw[7:0]);
```
Analog: read JXADC pin 1/7 (XA1_P J3 / XA1_N K3 = VAUX6) with the XADC Wizard (enable VAUXP6/VAUXN6), 0–1 V input; display the reading as a bar on `led`.

**Lesson 4 – 7-segment multiplexing, then UART.**
```verilog
reg [19:0] refresh = 0;
always @(posedge clk) refresh <= refresh + 1;
wire [1:0] digit = refresh[19:18];         // each digit 2.62 ms, full refresh 10.5 ms (95 Hz)
reg [3:0] an_r; reg [3:0] nib;
always @* case (digit)
  2'd0: begin an_r = 4'b1110; nib = value[3:0];   end // an[0] rightmost
  2'd1: begin an_r = 4'b1101; nib = value[7:4];   end
  2'd2: begin an_r = 4'b1011; nib = value[11:8];  end
  2'd3: begin an_r = 4'b0111; nib = value[15:12]; end // an[3] leftmost
endcase
assign an = an_r; assign dp = 1'b1;          // dp off (active low)
// seg = hex2seg(nib), table in 4.3 (0 = 7'b1000000 ...)
```
UART: transmit on `RsTx` (A18), receive on `RsRx` (B18), 9600 or 115200 baud, 8N1; baud divider = 100,000,000 / 115,200 ≈ 868 clocks per bit (10,417 for 9600). PC side: any terminal on the FTDI COM port. Alternative protocol lesson: VGA 640 × 480 using a 25 MHz pixel enable (divide by 4), `Hsync`/`Vsync`, `vgaRed/Green/Blue[3:0]`; or PS/2 keyboard via `PS2Clk`/`PS2Data`.

No Wi-Fi on this board. No Arduino/MicroPython support (it is an FPGA); soft-cores (MicroBlaze V via Vitis) are possible but out of scope.

## 8. Internals (see-through view)

| Part | What is really inside |
|---|---|
| IC7 XC7A35T, CPG236 | A 28 nm silicon die (TSMC HPL process) mounted on a laminate substrate; wire-bonded chip-scale BGA (CPG = wire-bond chip-scale package per UG475, not re-fetched), 236 solder balls at 0.5 mm pitch under a moulded black lid. The die holds the CLB array, block RAM columns, DSP columns, clock tiles, I/O banks and the XADC in one corner |
| IC9 DSC1033 | **No quartz.** A MEMS silicon resonator die plus a CMOS oscillator/PLL die in a 4-pad plastic/ceramic package. Draw two small dice, not a quartz blank |
| IC1 FT2232HQ | One CMOS die in a QFN-64 with exposed pad, wire-bonded; contains USB 2.0 HS PHY, two MPSSE/UART engines. Needs an external 12 MHz reference and an EEPROM for the Digilent ID (both on unpublished sheet 4) |
| IC2 PIC24FJ128GB106 | 16-bit MCU die with 128 KB flash and USB OTG, QFN-64, wire-bonded |
| IC8 flash | 32 Mbit NOR flash die in SOIC-16, gull-wing leads, wire-bonded lead frame |
| IC10 / IC11 | Monolithic buck regulators with internal power MOSFETs on exposed-pad packages; energy stored in the external shielded inductors L1–L3 (ferrite drums with copper windings) |
| DISP1 | A plastic frame with a reflector cavity per segment; each segment has one small red LED die (GaAsP/AlInGaP, unverified) at the bottom, under diffusing epoxy; a lead frame brings the 12 pins out |
| LEDs | Single LED die on a lead frame under a clear/diffused epoxy lens |
| Slide switches | Plastic housing with a sliding contact bar bridging centre pin to one of two outer pins |
| Tactile buttons | Metal snap dome over two contacts; the knob presses the dome |
| VGA J1 | 15 gold-flashed pin contacts in a plastic insert, steel shell, threaded posts |
| PCB | 4-layer or more FR-4 (layer count unverified) with power planes; BGA fan-out vias under IC7 |

## 9. Assembly and power-up

**Manufacture** (typical for this construction; process details unverified): bottom-side SMD parts (regulators, inductors, flash, oscillator, transistors) are reflowed first; then top-side SMD (FPGA BGA, FT2232HQ, PIC24, LEDs, buttons, passives) reflowed; then through-hole parts (16 + 1 slide switches, 7-segment display, 4 Pmod headers, VGA, USB-A, micro-USB shell, JP1/JP2/J6 headers) soldered by wave or selective solder. Shunts on JP1 (QSPI) and JP2 (USB) and the rubber feet go on last; the factory test design is written into flash, and the PIC24 firmware is loaded through J3.

**Power-up sequence** (factory settings: JP2 = USB, JP1 = QSPI) [1][4]:
1. Plug micro-USB; slide SW16 up to ON.
2. EN rises; 1.0 V comes up, then 1.8 V, then 3.3 V. **LD20 (red) lights** when 3.3 V is good.
3. The FT2232HQ enumerates on the PC (a JTAG interface plus a COM port; Windows name "Digilent USB Device", USB ID 0403:6010 — unverified).
4. FPGA power-on reset; INIT_B goes high; mode pins read 001 (Master SPI); the FPGA clocks the bitstream out of the Quad-SPI flash (< 1 s).
5. DONE goes high → **LD19 (green) lights**; the factory GPIO demo runs: LEDs follow switches, the display counts 0–9, the UART prints "BASYS3 GPIO/UART DEMO!".
6. The PIC24 switches to USB-HID host mode; LD16 indicates PIC24 activity.

## 10. Uncertainties

- Schematic sheet 4 (USB/FT2232H, VBUS protection, IC3/IC4/IC5 identities, the 12 MHz source, the EEPROM, which FTDI channel is JTAG) is not published; everything about it is unverified.
- Bottom-side part positions (IC9, IC10, IC11, IC4, IC3, IC5) are estimated from the product photo [11], not from CAD.
- PCB thickness 1.524 mm comes from the STEP model; Digilent does not state thickness elsewhere; 1.6 mm is also plausible.
- Pmod hole-column ↔ row mapping (which column is pins 1–6) rests on right-angle header geometry plus one photo of the JXADC square pad; JB/JC not checked on a photo.
- 7-segment pin-1 corner and per-digit centres not extracted; the alternate part TOF-2481BE-N colour not verified; KW4-281ASB datasheet only seen as a search snippet. Colon is moulded but unwired (from the schematic: no colon pins).
- Push-button part number (PTA-142 style) and LED part numbers/wavelengths not confirmed; LD16/LD17/LD18 colours unverified.
- TVS/ESD array part numbers unknown.
- DS181, UG480, UG475, UG471 and LTC3633 values (abs max VCCO + 0.55 V, 12 mA default drive, XADC 0–1 V range and temperature formula, LTC3633 15 V VIN max and UVLO) are quoted from memory of those documents, not re-fetched this run.
- Vivado 2026.1: AMD states the free BASIC tier covers all 7 Series devices [19], so the XC7A35T is free; the Basic tier's simulator/ILA limits and Linux availability are only from third-party reports (unverified). Console wording for 12-584/Place 30-574 and the tails of NSTD-1/UCIO-1 are recalled, not copied from a log.
- FT2232H enumeration name/VID:PID not checked.
- Manufacturing order (reflow sides, wave vs selective solder) is typical practice, not documented by Digilent.
- Reverse-polarity and over-voltage outcomes are reasoned from the schematic (no protection parts), not tested.

### Corrections to the originals and to Digilent's own documents

- RM PDF section 1 calls the power-source jumper "JP3"; the web RM and schematic say **JP2** [1][2][4].
- RM PDF section 2.2 is headed "JTAG Programming" but describes Quad SPI [1].
- Web RM heading "LTC3663" should be **LTC3633** [2][4].
- Digilent FAQ says "6 pushbuttons" (5 user + PROG) and "1899 Kb BRAM"; the device has **1,800 Kb** [1][8].
- RM table calls the XADC Pmod "Pmod XDAC" [1].
- RM Fig. 2 labels the 1.0 V rail "1A" while Table 2 gives 2 A [1].
- RM VGA timing uses 521 lines / 25 MHz; VESA 640 × 480 @ 60 Hz is 525 lines / 25.175 MHz [1].
- The official STEP model shows the JP2 shunt on EXT; boards ship with it on **USB** [7][11].
- Master XDC header still says "rev B board" while current boards are rev C/D [3].

### Corrections to the current SimLab (from docs/research/current-simlab-audit.md)

None of the three originals (Learn Arduino, Robotics Bench, Drone Lab) models a Basys 3; the errors to fix are in the current SimLab build:

- Parts were drawn under the PCB (only a USB connector visible from the default view). Every part in 2.2 sits on the top surface (z = 0 is the top of the PCB); only the 2.3 parts are underneath.
- The 5 buttons were drawn in a row. They form a **plus**: BTNU (90, 37), BTNL (81.5, 30), BTNC (90, 30), BTNR (98.5, 30), BTND (90, 23).
- The 7-segment digits were tiny and the ones digit was leftmost. DISP1 is 32.2 × 10.2 mm at (33.0, 26.4); **an[0] is the rightmost digit**, an[3] the leftmost.
- No VGA, Pmod or USB-A was drawn. Draw J1 VGA, J2 USB-A, J4 micro-USB on the top edge and JA/JXADC (left) and JB/JC (right) per 2.2.
- The "Meet the board" lesson was an Arduino `Serial.println` sketch. The Basys 3 has no MCU for the user; lessons are Verilog/VHDL with the XDC port names in section 4.
- "Show a number" used `assign led = sw`. A number on the display needs the multiplexed, **active-low** `seg`/`an` driver of lesson 4.
- "JTAG, not a UART MCU" is half right: the FT2232HQ gives JTAG **and** a USB-UART (`RsRx` B18, `RsTx` A18).
- The FPGA lessons could never be marked done (BoardLab bug B-01); not a hardware fact, listed so the content agent knows.

## Verification

Adversarial fact-check, 2026-10-24. Every row was checked against a primary source I opened myself: the Digilent master XDC fetched again from GitHub raw (byte-identical to the researcher's copy), my own `pdftotext` runs on the Digilent reference manual PDF (rev C, revised July 10, 2019) and on the Rev D.1 and Rev C.0 schematics, my own parse of the official DXF, and the live AMD licensing page. Corrections have already been made in place above.

| # | Claim | Status | Source | Old → new (corrections) |
|---|---|---|---|---|
| 1 | FPGA is XC7A35T-1CPG236C; Vivado part `xc7a35tcpg236-1` | confirmed | RM p.1; Rev C.0 schematic (part text "XC7A35T-1CPG236C"); https://digilent.com/reference/_media/reference/programmable-logic/basys-3/basys3_rm.pdf | — |
| 2 | Board outline 121.92 × 71.12 mm (4.80 × 2.80 in), square corners; 4 holes Ø 3.658 mm at 3.81 mm inset | confirmed | Basys3_DXF.DXF in https://digilent.com/reference/_media/reference/programmable-logic/basys-3/basys_3_dimensions.zip (outline lines 25.4→147.32 × 25.4→96.52, hole r 1.8288 at 29.21/143.51 × 29.21/92.71) | — |
| 3 | VGA J1 mounting holes Ø 3.175 at (48.506, 61.0) and (73.5, 61.0) | confirmed | same DXF (r 1.5875 at 73.906/98.9, 86.4 minus 25.4 offset) | — |
| 4 | 100 MHz clock on W5 (IO_L12P_T1_MRCC_34), `create_clock -add -name sys_clk_pin -period 10.00 -waveform {0 5}` | confirmed | RM §4; schematic ball W5 = IO_L12P_T1_MRCC_34; https://raw.githubusercontent.com/Digilent/digilent-xdc/master/Basys-3-Master.xdc | — |
| 5 | Oscillator IC9 = DSC1033CC1-100.0000T | confirmed | Rev D.1 schematic, https://digilent.com/reference/_media/reference/programmable-logic/basys-3/basys-3-sch-public-rev-d.pdf | — |
| 6 | Switch pins sw[0..15] = V17 V16 W16 W17 W15 V15 W14 W13 V2 T3 T2 R3 W2 U1 T1 R2 | confirmed | master XDC | — |
| 7 | LED pins led[0..15] = U16 E19 U19 V19 W18 U15 U14 V14 V13 V3 W3 U3 P3 N3 P1 L1; LEDs active high through 330 Ω | confirmed | master XDC; RM §8 ("anode-connected to the FPGA via 330 ohm resistors"); 16 × "330" in the schematic | — |
| 8 | Buttons btnC U18, btnU T18, btnL W19, btnR T17, btnD U17; plus-shaped; active high (low at rest), 10 K pull-down (R37 10K) | confirmed | master XDC; RM §8; schematic R37 = 10K | — |
| 9 | 7-seg seg[0..6] = W7 W6 U8 V8 U5 V5 U7, dp V7, an[0..3] = U2 U4 V4 W4; common anode, PNP-driven, anodes **and** cathodes active low | confirmed | master XDC; RM §8.1 ("both the AN0..3 and the CA..G/DP signals are driven low when active") | — |
| 10 | an[0] rightmost, an[3] leftmost | confirmed (schematic net order AN3 → Q1A … AN0 → Q2B; no explicit RM sentence) | Rev D.1 schematic sheet 1 | — |
| 11 | Hex table for `seg[6:0] = {g,f,e,d,c,b,a}`, active low (0–F) | confirmed (recomputed all 16 patterns by hand) | derived from #9 | — |
| 12 | 7-seg refresh 1–16 ms (≈1 kHz–60 Hz), flicker near 45 Hz | confirmed | RM §8.1 | — |
| 13 | Pmod JA/JB/JC/JXADC pin maps (all 32 pins) | confirmed | master XDC | — |
| 14 | JXADC = VAUX6 (J3/K3), VAUX14 (L3/M3), VAUX7 (M2/M1), VAUX15 (N2/N1) | confirmed | schematic ball names IO_L7P_T1_AD6P_35 (J3) … IO_L10N_T1_AD15N_35 (N1); XDC "Sch name = XA1_P…" | — |
| 15 | Pmod series 200 Ω (JA/JB/JC), 100 Ω (JXADC); Pmod VCC/GND up to 1 A | confirmed | schematic (R6, R9, R11, R14 … = 200; R156 = 100); RM §9 ("can deliver up to 1A") | — |
| 16 | "Digilent: do not drive Pmod pins above 3.4 V [1]" | unverified (text absent from the RM PDF and from the web RM snapshot; no other source found) | RM §9; web search | old: cited as Digilent statement [1] → new: marked unverified, 3.3 V working limit |
| 17 | VGA, UART (RsRx B18 in, RsTx A18 out), PS/2 (C17/B17, `PULLUP true`), QSPI (D18 D19 G18 F18, CSn K19) pins | confirmed | master XDC; RM §5 ("B18 and A18 FPGA pins") | — |
| 18 | RM VGA timing: 25 MHz, H 640/16/96/48 = 800, V 480/10/2/29 = 521 | confirmed (RM Fig. 14; VESA 525-line note is standard VESA DMT, not re-fetched) | RM VGA section, Fig. 14 | — |
| 19 | Power: EXT 4.5–5.5 V ≥ 1 A; battery min 3.6 V (4.6 V with USB host); 3.3 V 2 A, 1.0 V 2 A (Fig. 2 says 1A), 1.8 V 300 mA; regulators LTC3633EUFD + LTC3621EMS8E; RM PDF says "JP3" | confirmed | RM §1 Table 2 and Fig. 2; schematic part text LTC3633EUFD#PBF, LTC3621EMS8E#PBF | — |
| 20 | XC7A35T: 33,280 logic cells / 5,200 slices, 1,800 Kbit BRAM, 5 CMTs, 90 DSP, > 450 MHz; bitstream 17,536,096 bits | confirmed | RM overview and §2 | — |
| 21 | Flash: Rev D IC8 MX25L3233FMI-08G, Rev C IC8 S25FL032P0XMFI00 (MLP8 alternate S25FL032P0XNFI00) | confirmed | Rev D.1 and Rev C.0 schematics (my own pdftotext); RM §3 lists both vendors | — |
| 22 | Schematic Rev D.1, Doc# 500-183, 2/5/2021, 8 sheets; RM rev C dated July 10, 2019 | confirmed | schematic title block; RM header | — |
| 23 | PIC24FJ128GB106-I/MR is the USB HID host | confirmed | schematic part text; RM §6 ("PIC24FJ128") | — |
| 24 | USB stick: FAT32, one .bit in root; LD16 slow pulse = waiting, rapid blink = error | confirmed | RM §2.3 | — |
| 25 | Factory test: LEDs follow switches, digits count 0–9 once a second, BTNU/L/R/D blank a digit, BTNC resets, UART 9600 8N1 "BASYS3 GPIO/UART DEMO!" | confirmed, except "first = leftmost" | RM §10; GPIO demo page (Wayback 2024-09-08) | old: "BTNU blanks the first (leftmost) digit" → new: "first digit" with leftmost/rightmost marked unverified |
| 26 | Master XDC ends with active CONFIG_VOLTAGE 3.3 / CFGBVS VCCO / COMPRESS TRUE / CONFIGRATE 33 / CONFIG_MODE SPIx4; header says "rev B board" | confirmed | master XDC | — |
| 27 | cfgmem part names `mx25l3233f-spi-x1_x2_x4` / `s25fl032p-spi-x1_x2_x4` | confirmed for Macronix (string in a real Vivado log); Spansion name consistent with AMD UG908 table (s25fl032p, x1/x2/x4) but exact string unverified | UG908 config-memory tables, https://docs.amd.com/r/en-US/ug908-vivado-programming-debugging/Virtex-UltraScale-Configuration-Memory-Devices | — |
| 28 | Vivado 2026.1 tiered licensing; BASIC tier $0, "All 7 Series & low-end UltraScale / UltraScale+ devices", annual licence with free renewal | confirmed (live page fetched 2026-10-24 14:04 CDT) | https://www.amd.com/en/products/software/adaptive-socs-and-fpgas/vivado/vivado-licensing-options.html | — |
| 29 | Lesson arithmetic: 100 MHz/2^27 = 0.745 Hz; /256 = 390.6 kHz; refresh[19:18] → 2.62 ms per digit, 10.5 ms (95 Hz); 868 / 10,417 clocks per bit | confirmed (recomputed) | arithmetic | — |

Not re-checked this pass (left as the researcher marked them): STEP-derived SMD centres and heights, photo-derived colours and markings, bottom-side positions, DS181/UG480/UG471 values (VCCO + 0.55 V, 12 mA default drive, XADC 0–1 V range and 503.975/4096 temperature formula: these match my own knowledge of those documents but were not re-fetched), Vivado console strings, and the failure-mode reasoning.
