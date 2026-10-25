# Raspberry Pi 4 Model B and Raspberry Pi 5: fact sheet

Status: first complete version, written 2026-10-24 from official Raspberry Pi design files (DXF, STEP, mechanical drawings,
reduced schematic, product briefs, datasheet, documentation sources). Items marked **(unverified)** could not be checked
against a primary source in the time box. Items marked **(estimated from ...)** are not from a design file.

## 0. Header

| Item | Raspberry Pi 4 Model B | Raspberry Pi 5 |
|---|---|---|
| Manufacturer | Raspberry Pi Ltd (formerly Raspberry Pi (Trading) Ltd), Cambridge, UK; boards built by Sony UK TEC, Pencoed, Wales (silkscreen "Made in the UK") | Raspberry Pi Ltd; built at Sony UK TEC (unverified for every batch) |
| Product / PCB revision modelled | Raspberry Pi 4 Model B, mechanical DXF RP-008342-DS-1 (PCB silkscreen `PCB-R4`), reduced schematic "RPI-4B Rev 4", dated 18 June 2019 [3][4]. Later PCBs (rev 1.4/1.5, PCN "Revision 9 PCB" 2021-10-12 [6]) keep the same outline and connector positions | Raspberry Pi 5 (all RAM sizes share one PCB layout; 2 GB/16 GB use a D0 stepping BCM2712 that is mechanically the same) [8][9] (D0 detail unverified) |
| SoC | Broadcom **BCM2711**, quad Cortex-A72 (Armv8-A, 64-bit) at **1.8 GHz** [1] (boards before rev 1.4 defaulted to 1.5 GHz, unverified) | Broadcom **BCM2712**, quad Cortex-A76 at **2.4 GHz**, 512 KB L2 per core, 2 MB shared L3, crypto extension [8] |
| I/O controller | none (USB 3 via VIA Labs VL805 on PCIe) | Raspberry Pi **RP1** (own silicon, "southbridge") on a PCIe 2.0 x4 link from BCM2712 [13] |
| RAM | 1, 2, 3, 4 or 8 GB LPDDR4 with on-die ECC (product brief: "1GB, 2GB, 3GB, 4GB or 8GB"; the 3 GB variant came later) [1] | LPDDR4X-4267, 1, 2, 4, 8 or 16 GB [8] |
| PMIC | Pi 4: MaxLinear **MxL7704** (5 x 5 mm QFN-32) on original boards, per MaxLinear's 2019 press release [21]; the PMIC whitepaper says "a number of different PMIC devices have been used" over production [7] | Renesas (Dialog) **DA9091** "Gilmour" PMIC, marked with the Renesas/Dialog logo (visible in the official photo next to USB-C) [7][15]; part number confirmed by the official Raspberry Pi 5 launch post [20] (no Pi 5 schematic is published) |
| List price (brief, Oct 2026) | 1GB $35, 2GB $67.50, 3GB $83.75, 4GB $100, 8GB $165 [1] | 1GB $45, 2GB $77.50, 4GB $110, 8GB $175, 16GB $305 [8] |
| Production lifetime | until at least January 2034 [1] | until at least January 2036 [8] |
| Operating temperature | 0 to 50 C [1] | 0 to 70 C [8] |

**What it is.** Both are credit-card-sized (85 x 56 mm) single-board Linux computers. The Pi 4 Model B (2019) puts a
BCM2711 SoC, LPDDR4 RAM, dual-band Wi-Fi/Bluetooth 5.0, Gigabit Ethernet, two USB 3.0 + two USB 2.0 ports, two micro-HDMI
outputs (4Kp60), 2-lane MIPI CSI and DSI connectors, a 3.5 mm 4-pole A/V jack and the standard 40-pin GPIO header on one
board, powered with 5 V / 3 A through USB-C. The Pi 5 (2023) roughly doubles CPU performance with the 2.4 GHz Cortex-A76
BCM2712 and moves almost all I/O (USB, Ethernet MAC, MIPI, GPIO) into Raspberry Pi's own RP1 chip. It drops the A/V jack,
adds a power button, an RTC with a battery connector (J5), a 4-pin PWM fan header, a PCIe 2.0 x1 FFC connector, a 3-pin
UART debug connector, and two 4-lane MIPI camera/display transceivers, and wants 5 V / 5 A over USB-C PD (27 W supply).
Both run Raspberry Pi OS; both are 3.3 V-logic boards whose GPIO pins are **not 5 V tolerant**.

## 1. Sources

Official first. Files were downloaded to the scratchpad (`facts-dl/pi4-pi5/`) and parsed with scripts in `facts-tools/pi4-pi5/` (never executed).

1. Raspberry Pi 4 Model B product brief, https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-product-brief.pdf : spec list, prices, power note (2.5 A OK if USB load < 500 mA), lifetime.
2. Raspberry Pi 4 Model B datasheet (Release 1.1), https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-datasheet.pdf : GPIO DC characteristics (VIL/VIH, VOL/VOH, IOL/IOH, pull resistors), power requirements, SD interface.
3. **Raspberry Pi 4 mechanical drawing DXF, RP-008342-DS-1**, https://pip-assets.raspberrypi.com/categories/545-raspberry-pi-4-model-b/documents/RP-008342-DS-1-raspberry-pi-4-mechanical-drawing.dxf : board outline, holes, every top/bottom part outline (layers PARTS_TOP, PARTS_BOTTOM), every pad (PINS_TOP), the complete top silkscreen text (SILK_TOP). Parsed with `dxf_parse.py` / `dxf_boxes.py`; DXF units are mm and the DXF origin is already the bottom-left corner of the board in the board frame defined in section 2. All Pi 4 coordinates below come from this file unless marked.
4. Raspberry Pi 4 reduced schematics (RP-008345-DS-1), https://pip-assets.raspberrypi.com/categories/545-raspberry-pi-4-model-b/documents/RP-008345-DS-1-raspberry-pi-4-reduced-schematics.pdf : connectors, USB-C CC resistors (two 5K1), LED circuit (D3 red "PWR", D5 green "ACT", Q1/Q2 DMG1012T), J2 RUN/GLOBAL_EN note, PoE header J14.
5. Raspberry Pi 4 mechanical drawing PDF (RP-008343-DS-1) and https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-mechanical-drawing.pdf : cross-check of connector centre dimensions.
6. PCN "Raspberry Pi 4 Revision 9 PCB" (2021-10-12), from pip.raspberrypi.com : later PCB revision exists (content not used for geometry).
7. Whitepaper RP-004340-WP "Extra PMIC features on Raspberry Pi 4, Raspberry Pi 5 and Compute Module 4" (2024-07-09), pip-assets.raspberrypi.com : several PMICs used over production; PMIC ADCs on USB-C CC1/CC2 (later Pi 4, all Pi 5); `vcgencmd measure_temp pmic`, `vcgencmd pmic_read_adc`.
8. Raspberry Pi 5 product brief, https://datasheets.raspberrypi.com/rpi5/raspberry-pi-5-product-brief.pdf : spec list, prices, lifetime, temperature range.
9. **Raspberry Pi 5 STEP model** `rpi-5b_no_graphics.step` (official, from the Raspberry Pi 5 product information portal, with LICENSE.txt), parsed to per-solid bounding boxes and colours (`step_bbox.py` -> `pi5-solids.json`, grouped with `step_groups.py`). Board top surface at z = 1.34 mm in the model. All Pi 5 coordinates below come from this file unless marked.
10. Raspberry Pi 5 mechanical drawing (RP-008347-DS-1), https://pip-assets.raspberrypi.com/categories/892-raspberry-pi-5/documents/RP-008347-DS-1-raspberry-pi-5-mechanical-drawing.pdf : 85 x 56, 58 x 49 hole grid, hole 2.7 mm, 6 mm pad, connector centre dimensions (11.2, 25.8, 39.2 along the bottom edge; 10.2, 29.1, 47 up the right edge).
11. RP-008298-DS-1 "Raspberry Pi 5 PCIe FFC connector standard", pip-assets.raspberrypi.com : 16-pin 0.5 mm pitch FFC, 5 V + GND + single-lane PCIe, PCIE_PWR_EN and PCIE_DET_WAKE pins.
12. RP-008189-DS-1 "Raspberry Pi 3-pin debug connector specification" (also RP-003139-SP) : pin 1 RX (into SoC), pin 2 GND, pin 3 TX (out of SoC); same connector for SWD (SC/SD).
13. RP1 peripherals datasheet, https://datasheets.raspberrypi.com/rp1/rp1-peripherals.pdf : RP1 core clock 200 MHz, peripheral list.
14. Raspberry Pi documentation sources (github.com/raspberrypi/documentation, `documentation/asciidoc/computers/...`, master branch, fetched 2026-10-24): `raspberry-pi/power-supplies.adoc` (4.63 V undervoltage, 3 A/5 A rules, USB current 600 mA/1.6 A), `os/graphics-utilities.adoc` (get_throttled bits), `raspberry-pi/frequency-management.adoc` (80/85 C throttling, fan connector), `configuration/led_blink_warnings.adoc` (LED flash codes, Pi 5 bi-colour LED), `raspberry-pi/power-button.adoc`, `raspberry-pi/rtc.adoc`, `raspberry-pi/gpio-pad-controls.adoc` (16 mA pad design, drive strengths), `os/using-gpio.adoc` (gpiozero examples).
15. Official Raspberry Pi 5 product photo (raspberrypi.com product page image `5.jpg`, 1920 x 1280): colours, markings, which USB stack is blue, LED, JST connectors.
16. ROS 2 documentation (github.com/ros2/ros2_documentation, branch `lyrical`): `Releases/Release-Lyrical-Luth.rst`, `Releases.rst` (Lyrical Luth released **May 22, 2026**, LTS, EOL May 2031), Lyrical platform table (Ubuntu 26.04 "Resolute" Tier 1 amd64/arm64; Ubuntu 24.04 and Debian Trixie Tier 3), rclpy publisher/subscriber tutorial.
17. ros2cli source, `ros2topic/verb/hz.py` and `info.py` (lyrical branch): exact `ros2 topic hz` / `ros2 topic info` output format.
18. teleop_twist_keyboard (ros2 branch `rolling`, same file as `jazzy`), `teleop_twist_keyboard.py`: publishes `cmd_vel`, parameters `stamped` (default False), `frame_id`, `speed` 0.5, `turn` 1.0.
19. iynk research note `docs/research/robotics-bench-b.md` section 8 (Fig. 13) and section 10: what the original Robotics Bench figure shows and its listed bugs.
20. Raspberry Pi news, "Introducing: Raspberry Pi 5!" (2023-09-28), https://www.raspberrypi.com/news/introducing-raspberry-pi-5/ : DA9091 "Gilmour" PMIC with eight switch-mode supplies and a 20 A core supply; BCM2712 16 nm; RP1 on TSMC 40LP; RTC and power button in the PMIC.
21. MaxLinear press release "MaxLinear's MxL7704 PMIC Powers the Raspberry Pi 4" (2019-06-24), https://investors.maxlinear.com/press-releases/detail/373/maxlinears-mxl7704-pmic-powers-the-raspberry-pi-4 : four bucks + 100 mA LDO, 5 x 5 mm QFN-32.
22. Raspberry Pi Linux device trees (branch `rpi-6.12.y`): `arch/arm/boot/dts/broadcom/bcm2711-rpi-4-b.dts` and `arch/arm64/boot/dts/broadcom/bcm2712-rpi-5-b.dts`, https://github.com/raspberrypi/linux : LED GPIOs and polarity, power-button key code, fan cooling levels.

## 2. Geometry (board frame)

**Board frame (both boards).** Component side up, main silkscreen ("Raspberry Pi 4 Model B" / "Raspberry Pi 5") readable,
40-pin GPIO header along the **top** edge, USB/Ethernet ports on the **right** edge. Origin = bottom-left corner of the
outline, +x right, +y up (away from the viewer), mm. **The bottom edge (y = 0) carries USB-C power and the two
micro-HDMI ports** (plus the A/V jack on the Pi 4, the RTC and UART JST connectors on the Pi 5). The left edge (x = 0)
carries the LEDs (Pi 4), the power button/LED and PCIe FFC (Pi 5), the DSI connector (Pi 4) and, on the underside, the
microSD socket. Both design files are natively in this frame (no transform applied).

### 2.1 Outline, holes, colours (both boards)

| Item | Pi 4 | Pi 5 |
|---|---|---|
| Outline | 85.0 x 56.0 mm (DXF BOARD_OUTLINE, 8-vertex closed polyline with arcs) [3] | 85.0 x 56.0 mm (STEP board solid x 0..85, y 0..56) [9][10] |
| Corner radius | **3.0 mm** (DXF outline vertices (3,0)-(82,0)-(85,3)... with bulge 0.41421 = 90 deg arcs) [3] | 3.0 mm (mechanical drawing shows the same outline; STEP corner not measured) [10] |
| Thickness | 1.4 mm nominal (unverified) | STEP board solid z 0.03..1.31 (about 1.3 mm), components sit at z = 1.34 [9] |
| Mounting holes | 4 x, centres (3.5, 3.5), (61.5, 3.5), (3.5, 52.5), (61.5, 52.5); hole diameter 2.7 mm (DXF circle r 1.35); copper/keep-out pad 6.0 mm diameter (r 3.0) [3] | same grid: 58 x 49 mm, Ø2.7 mm holes, 6 mm pads [10] |
| Hole pad finish | bare plated ring, gold-coloured (ENIG) in photos (estimated from product photo) | gold ring with a yellow-green ring around it in the photo (estimated from [15]) |
| Solder mask | green | green; STEP board colour RGB (0, 0.549, 0.286) = #008C49 [9]; photo shows a lighter grass green [15] |
| Silkscreen | white | white |

### 2.2 Raspberry Pi 4 Model B: parts (top side unless stated), from DXF [3]

Centres and sizes are the DXF part-outline bounding boxes. Rotation 0 = long axis along x. Heights are above the PCB top
surface; Pi 4 heights are **(unverified)** (taken from the matching Pi 5 STEP parts or typical datasheet values).

| Ref | Part | Package / type | Centre (x, y) | Footprint w x h | Height | Colour / marking | Notes |
|---|---|---|---|---|---|---|---|
| U1 | BCM2711 SoC | FC-BGA with nickel-plated metal heat spreader | (29.25, 32.5) | 15.0 x 15.0 | ~2.4 (unverified) | silver lid, laser-marked "BROADCOM" / "BCM2711ZPKFSB1G" style text (exact marking unverified) | |
| U? | LPDDR4 SDRAM | FBGA | (44.8, 32.5) | 11.5 x 15.0 | ~1.0 | black, Micron "D9..." or Samsung marking (unverified) | right of SoC |
| U? | VL805 USB 3.0 host controller (VIA Labs) | QFN-68 | (59.5, 24.0) | 8.0 x 8.0 | ~0.9 | black, "VIA VL805" (identified by size/position; unverified) | feeds USB3 J12 and USB2 J11 |
| U? | Gigabit Ethernet PHY Broadcom BCM54213PE | QFN | (58.5, 38.0) | 6.0 x 6.0 | ~0.9 | black (identified by position next to J10; unverified) | |
| U? | Wi-Fi/BT module (Cypress/Infineon CYW43455) under RF can | metal can | (12.0, 42.6) | 10.8 x 13.0 (inner can 10.4 x 12.6) | ~1.7 (Pi 5 can 1.7) | silver can with embossed Raspberry Pi logo (unverified for Pi 4) | chip inside 4.47 x 5.27 at (12.2, 41.5) |
| ANT | PCB/chip antenna area | small part | (1.4, 48.55) | 2.6 x 2.6 | low | (identified by position; unverified) | top-left corner |
| U? | PMIC (MxL7704 on original boards) | QFN-32, 5 x 5 mm [21] | (9.9, 12.2) | 5.0 x 5.0 | ~0.9 | black | next to USB-C |
| - | unidentified 4 x 4 part | | (14.9, 16.1) | 4.0 x 4.0 | | | probably power inductor (unverified) |
| - | unidentified | | (20.0, 8.5) | 3.6 x 4.4 | | | |
| - | unidentified tall part between USB3 and Ethernet | | (67.7, 33.4) | 4.3 x 7.3 | | | |
| D3 | "PWR" LED, red | right-angle side-view SMD LED, lens facing -x (out of the left edge) | (1.1, 7.9) | 0.7 x 1.6 | ~0.6 | clear/red | silkscreen "PWR" at (4.3, 6.6) |
| D5 | "ACT" LED, green | right-angle side-view SMD LED, lens facing -x | (1.1, 11.5) | 0.7 x 1.6 | ~0.6 | clear/green | silkscreen "ACT" at (1.4, 13.4), rotated 90 |
| J1 | USB-C power input "POWER IN" | USB-C receptacle (USB 2.0 data only to SoC, power only in practice) | (11.2, 2.45) | 8.65 x 7.4 | ~3.2 | silver shell | front overhangs bottom edge by 1.25 mm (y = -1.25) |
| J6 | micro-HDMI "HDMI0" | micro-HDMI (type D) receptacle | (26.0, 2.55) | 7.2 x 7.95 | ~3.0 | silver | overhangs bottom edge by 1.43 mm |
| J13 | micro-HDMI "HDMI1" | micro-HDMI (type D) | (39.5, 2.55) | 7.2 x 7.95 | ~3.0 | silver | overhangs 1.43 mm |
| J7 | "A/V" 3.5 mm 4-pole jack (stereo + composite) | through-hole jack | body (54.0, 6.25) | 7.0 x 12.5 body + 6.0 x 2.5 barrel | ~6 (unverified) | black | barrel protrudes to y = -2.5; THT pegs at (50.8,3.5),(57.2,3.5),(51.1,11.5),(54.0,12.2),(56.9,11.5) |
| J3 | "CAMERA" MIPI CSI-2, 2-lane, 15-pin 1.0 mm FFC | vertical FFC connector with latch | (47.025, 11.5) | 3.95 x 22.4 (long axis along y) | ~5.5 | white/beige body, black or brown latch | rotation 90 |
| J4 | "DISPLAY" MIPI DSI, 2-lane, 15-pin 1.0 mm FFC | vertical FFC connector | (3.475, 28.0) | 3.95 x 22.4 (along y) | ~5.5 | white body, latch | rotation 90; silkscreen "DISPLAY" at (8.6, 24.8) rotated 90 |
| J8 | 40-pin GPIO header "GPIO" | 2 x 20 male, 2.54 mm pitch, through-hole | (32.5, 52.5) | 50.8 x 5.0 | 8.5 (pins) | black plastic, gold pins | pin 1 = square pad at (8.37, 51.23) |
| J14 | "PoE" header | 2 x 2 male, 2.54 mm | (61.5, 46.36) | 5.0 x 5.0 | 8.5 | black, gold pins | pin 1 square pad at (60.23, 47.63); pins at x 60.23/62.77, y 45.09/47.63 |
| J2 | "RUN" / "GLOBAL_EN" pads | 3 x 1, 2.54 mm, **unpopulated** | (12.0, 20.5) | 7.6 x 2.0 | 0 | bare pads | pins at x 9.46, 12.0, 14.54 (y 20.5); square pin-1 pad at x 14.54; schematic note "RUN IS 3V3, GLOBAL_EN IS 5V" |
| J10 | "ETHERNET" RJ45 with magnetics and LEDs | THT magjack | (77.3, 45.75) | 21.35 x 15.5 | ~13.5 | silver shell; 2 LEDs (green link, amber/yellow activity: nets LAN_LEDG, LAN_LEDY) | extends to x = 88.0 (3.0 mm overhang); shell pegs around x 68.4..74.7 |
| J12 | "USB3" dual stacked USB-A 3.0 | THT | (79.25, 27.34) | 17.5 x 13.8 | ~16 | **blue** tongues | extends to x = 88.0 (3.0 mm overhang) |
| J11 | "USB2" dual stacked USB-A 2.0 | THT | (79.15, 8.61) | 17.7 x 13.9 | ~16 | **black** tongues | extends to x = 88.0 |
| J? (bottom) | microSD socket (push-pull, no spring eject) | SMD, **bottom side** | (7.41, 28.1) | 11.45 x 12.0 | ~1.4 below board | silver | card protrudes past the left edge to x = -2.27 (inserted card outline 3.95 x 11.0 at (-0.29, 28.0)) |

Pi 4 USB stack order (bottom to top on the right edge): USB2 (black) at y 1.65..15.57, USB3 (blue) at y 20.43..34.25,
Ethernet at y 38.0..53.5. Pi 4 bottom-edge order (left to right): USB-C 11.2, HDMI0 26.0, HDMI1 39.5, A/V 54.0, which
matches the mechanical drawing dimensions [5].

**Pi 4 exact silkscreen text (SILK_TOP, position, height, rotation) [3]:**
`Raspberry Pi 4 Model B` (29.9, 47.3) h1.15; `© Raspberry Pi 2018` (31.2, 44.67) h1.15 (DXF text is "c Raspberry Pi 2018",
the c is the copyright sign); `GPIO` (21.0, 47.5); `J8` (5.6, 49.7); `PoE` (58.5, 45.5) rot 90; `J14` (63.5, 49.35);
`ETHERNET` (75.5, 54.0); `J10` (70.8, 54.2); `USB3` (80.5, 19.0); `J12` (74.5, 19.0); `USB2` (80.5, 1.0); `J11` (73.8, 1.0);
`PCB-R4` (78.5, 43.0) rot 90; `PCB MADE` (77.5, 5.0) rot 90; `IN P.R.C.` (79.5, 5.0) rot 90; `A/V` (50.0, 0.6) rot 90;
`J7` (57.9, 5.9); `CAMERA` (42.9, 9.6) rot 90; `J3` (43.0, 21.7); `HDMI1` (35.3, 0.5) rot 90; `J13` (35.9, 7.6);
`HDMI0` (21.8, 0.5) rot 90; `J6` (22.9, 7.6); `POWER IN` (17.6, 0.5) rot 90; `J1` (7.0, 3.1); `PWR` (4.3, 6.6);
`ACT` (1.4, 13.4) rot 90; `DISPLAY` (8.6, 24.8) rot 90; `J4` (0.9, 36.6); `RUN` (8.5, 22.5); `GLOBAL_EN` (11.7, 22.5);
`J2` (16.3, 20.0); `Made in the UK` (29.5, 14.0); `FCC ID: 2ABCB-RPI4B` (20.5, 19.6); `IC: 20953-RPI4B` (20.5, 17.9).
Positions are the DXF text insertion points (left baseline), heights in mm (0.8 for designators, 0.96 or 1.15 for labels).
The large white Raspberry Pi logo and the RAM size tick boxes are not in the DXF (not modelled; check a photo).

### 2.3 Raspberry Pi 5: parts, from STEP [9]

Centres and sizes are STEP solid-group bounding boxes (top view). Height = top z minus 1.34 (board top). Colours: STEP
RGB where given, else from the photo [15].

| Ref | Part | Package / type | Centre (x, y) | Footprint w x h | Height | Colour / marking | Notes |
|---|---|---|---|---|---|---|---|
| U1 | BCM2712 SoC | FC-BGA with metal heat spreader | (33.15, 22.75) | 17.0 x 17.0 | 2.36 | silver lid, laser text "BROADCOM" / "BCM2712..." (photo [15]; exact string unverified) | |
| U? | LPDDR4X SDRAM | FBGA | (33.15, 39.2) | 14.5 x 10.0 | 1.0 | black, Micron marking (unverified) | above (north of) the SoC |
| U? | RP1 I/O controller | BGA | (58.5, 35.1) | 12.0 x 12.0 | 1.2 | black, Raspberry Pi logo + "RP1-C0" (photo [15]) | identified from the photo; STEP colour (0.678,0.71,0.741) |
| U? | Gigabit Ethernet PHY (Broadcom BCM54213PE, unverified) | QFN 6 x 6, **rotated 45 deg** | (64.0, 23.5) | 6 x 6 (8.49 x 8.49 bbox) | 0.85 | black | rotation 45 |
| U? | PMIC DA9091 | package unverified | (11.2, 15.2) | 5.0 x 5.0 | 0.55 | black, Renesas/Dialog logo (photo) | next to USB-C |
| L? x4 | PMIC power inductors | SMD | (6.6, 21.95), (9.1, 21.95), (13.3, 21.95), (15.8, 21.95) | 2.0 x 2.5 each | 1.2 | grey | (identified by shape; unverified) |
| U? | Wi-Fi/BT module (CYW43455 class, unverified) under RF can | metal can | (12.3, 42.7) | 10.8 x 13.0 | 1.7 | silver can | chip inside 4.47 x 5.27 at (12.5, 41.6) |
| D? | Bi-colour (red/green) power/status LED, behind a light guide at the left edge | | (0.96, 13.3) | 1.6 x 4.2 | ~2.3 (z 0.69..2.99) | yellowish (STEP 0.949,0.855,0.475) light pipe | next to the power button |
| SW? | Power button | right-angle tactile switch, actuator facing -x | (1.30, 18.4) | 3.5 x 4.5 | ~3.3 (z 0.89..4.64) | white actuator, silver body | overhangs the left edge by 0.45 mm |
| J? (PCIe) | PCIe 2.0 x1 FFC, 16-pin 0.5 mm pitch (RP-008298 calls it J20 in its figure; unverified as the board designator) | vertical FFC with latch | (2.88, 29.99) | 3.55 x 13.7 (along y) | 3.95 | beige body (1.0,0.922,0.529), dark latch | rotation 90 |
| J? (CAM/DISP 0) | MIPI 4-lane camera/display transceiver, 22-pin 0.5 mm FFC | vertical FFC | (48.88, 8.49) | 3.55 x 16.7 (along y) | 3.95 | beige body, dark latch | rotation 90 |
| J? (CAM/DISP 1) | MIPI 4-lane, 22-pin 0.5 mm FFC | vertical FFC | (55.08, 8.49) | 3.55 x 16.7 | 3.95 | beige, dark latch | rotation 90; which one is 0 vs 1: see silkscreen in photo (unverified) |
| J1? | USB-C power, 5 V / 5 A PD | USB-C receptacle | (11.2, 2.69) | 8.94 x 7.78 | 3.26 | silver shell (marking on shell in photo) | overhangs bottom edge by 1.2 mm |
| J? | micro-HDMI 0 | type D receptacle, THT legs | (25.8, 2.19) | 7.5 x 10.0 | 3.5 | silver | front at y = -2.81 in STEP (model may include an extended shell; mechanical drawing gives centre 25.8) [10] |
| J? | micro-HDMI 1 | type D | (39.2, 2.19) | 7.5 x 10.0 | 3.5 | silver | centre 39.2 [10] |
| J5 | RTC battery "BAT", 2-pin JST-SH 1.0 mm | vertical JST-SH | (19.0, 5.2) | 4.0 x 3.8 | 4.3 | white/beige housing | between USB-C and HDMI0 |
| J? (UART) | "UART" 3-pin debug, JST-SH 1.0 mm | vertical JST-SH | (32.5, 4.4) | 5.0 x 3.8 | 4.3 | white/beige | between the two micro-HDMIs; pinout [12] |
| J? (FAN) | 4-pin PWM fan, JST-SH 1.0 mm | vertical JST-SH | (67.2, 52.0) | 3.8 x 6.0 (along y) | 4.3 | white/beige | upper right, between GPIO header and USB 2.0 stack [14] |
| J2 | power-button pads (add your own NO switch) | 2 pads | between J5 and the bottom board edge [14] | | 0 | bare | exact position (unverified) |
| J8 | 40-pin GPIO header | 2 x 20, 2.54 mm THT | (32.5, 52.5) | 50.8 x 5.08 | 8.54 | black plastic, gold pins | same position as Pi 4: STEP pin centres x 8.37..56.63 step 2.54, rows y 51.23 / 53.77; pin 1 at (8.37, 51.23) |
| J? (PoE) | PoE+ header | 2 x 2, 2.54 mm THT | (61.5, 9.5) | 5.08 x 5.08 | 8.54 | black, gold pins | moved next to Ethernet (Pi 4 had it top-right) |
| J? | Gigabit Ethernet RJ45 magjack with LEDs | THT | (77.25, 10.25) | 21.6 x 17.5 | 13.3 | silver shell; LEDs green and amber/yellow (STEP LED colour 0.667,0.667,0) | **bottom-right** (swapped vs Pi 4); extends to x = 88.05 |
| J? | USB 3.0 dual stack | THT | (79.23, 29.0) | 17.53 x 14.5 | 16.2 | **blue** tongues (photo) | middle of right edge; extends to x = 88.0 |
| J? | USB 2.0 dual stack | THT | (79.06, 47.0) | 17.45 x 14.5 | 16.0 | **black** tongues | top-right; extends to x = 87.78 |
| J? (bottom) | microSD socket | SMD, **bottom side** | (8.12, 28.09) | 11.75 x 11.95 | 1.4 below board | silver | SDR104 capable [8] |
| - | unidentified 4.3 x 7.3 part | | (67.5, 44.0) | 4.3 x 7.3 | 1.9 | grey | between USB 2 and RP1 |

Right-edge order bottom to top on the Pi 5: Ethernet (centre y 10.2), USB 3.0 (29.1), USB 2.0 (47.0); the mechanical
drawing gives exactly these centres [10]. Bottom-edge order: USB-C 11.2, J5 RTC 19.0, HDMI0 25.8, UART 32.5, HDMI1 39.2.

**Pi 5 silkscreen and markings (from the official photo [15]; positions estimated from photo):** `Raspberry Pi 5` (with the
5 in a box) left of the RAM above the SoC; large white `HDMI` logo text above the two micro-HDMI ports; `UART` under the UART
connector; `HAT+ GPIO INTERFACE` near the GPIO header; a RAM-size tick-box column (`1G 2G 4G 8G 16G`, unverified list);
white Raspberry Pi raspberry logo on the left half below the Wi-Fi can; `ETHERNET` near the RJ45; `FAN` near the fan
header, `BAT` near J5, `PCIE` near the PCIe FFC, `CAM/DISP 0` and `CAM/DISP 1` near the MIPI FFCs (exact strings unverified).

### 2.4 Header pin geometry (both boards)

40-pin J8: 2 rows x 20, 2.54 mm pitch. Pin 1 at (8.37, 51.23) (square pad), pin 2 at (8.37, 53.77) (outer row, nearer the
top edge). Odd pins on the inner row y = 51.23, even pins on the outer row y = 53.77; pin n column x = 8.37 + 2.54 x
floor((n-1)/2), so pins 39/40 at x = 56.63 [3]. Pins point up (+z); header does not overhang the edge.

## 3. Electrical

### 3.1 Processors and memory

| | Pi 4 | Pi 5 |
|---|---|---|
| CPU | 4 x Cortex-A72 @ 1.8 GHz, 28 nm (process unverified) [1] | 4 x Cortex-A76 @ 2.4 GHz, 16 nm [8][20] |
| GPU | VideoCore VI @ 500 MHz (unverified), OpenGL ES 3.0 (brief), Vulkan 1.0/1.2 by driver (unverified) [1] | VideoCore VII @ 800 MHz, OpenGL ES 3.1, Vulkan 1.2 [8] |
| Video | 2 x micro-HDMI, up to 4Kp60 (one at a time; dual 4Kp30, unverified); H.265 4Kp60 decode, H.264 1080p60 decode, 1080p30 encode [1] | dual 4Kp60 HDMI with HDR; 4Kp60 HEVC decode; no H.264 hardware encode (unverified) [8] |
| Clock source | 54 MHz crystal oscillator (unverified) | 54 MHz crystal (unverified) |
| Boot ROM / bootloader | SPI EEPROM bootloader (`rpi-eeprom`) [14] | SPI flash bootloader (`rpi-eeprom`) [14] |
| Wireless | 2.4/5 GHz 802.11b/g/n/ac, Bluetooth 5.0, BLE [1] | dual-band 802.11ac, Bluetooth 5.0 / BLE [8] |
| Ethernet | Gigabit (BCM54213PE PHY, unverified), PoE with PoE HAT [1] | Gigabit, PoE+ with PoE+ HAT [8] |
| USB | 2 x USB 3.0 + 2 x USB 2.0 via VL805 on PCIe (unverified) [1] | 2 x USB 3.0 (simultaneous 5 Gbit/s) + 2 x USB 2.0 via RP1 [8] |
| Camera/display | 2-lane MIPI CSI-2 (15-pin 1 mm), 2-lane MIPI DSI (15-pin 1 mm) [1] | 2 x 4-lane MIPI transceivers (camera or display), 22-pin 0.5 mm FFC [8] |
| PCIe | internal only (VL805) | PCIe 2.0 x1 on 16-pin FFC (Gen 3 can be forced, not certified, with `dtparam=pciex1_gen=3` in config.txt [14]) [8][11] |
| RTC | none | RTC in the PMIC; battery on J5 [14] |

### 3.2 Power tree

| | Pi 4 | Pi 5 |
|---|---|---|
| Main input | USB-C 5 V, **3 A** recommended (5.1 V / 3 A official supply). 2.5 A acceptable if USB load < 500 mA [1][2] | USB-C 5 V, **5 A** with USB PD (official **27 W** supply, 5.1 V / 5 A). A 5 V / 3 A supply boots but limits USB [14] |
| CC handling | two 5.1 kΩ pull-downs (5K1) on CC1 and CC2 (Rev 1.2+ schematic) [4]; first Rev 1.1 boards shared one resistor, so e-marked cables did not supply power (unverified, widely reported) | PD negotiation by the PMIC/firmware; PMIC ADC reads CC1/CC2 [7] |
| Other inputs | 5 V on GPIO pins 2/4 (no protection, back-feeds); PoE HAT via J14 [1] | 5 V on GPIO pins 2/4 (set `PSU_MAX_CURRENT` in bootloader config for bench supplies) [14]; PoE+ HAT |
| Regulators | PMIC generates core, 1.8 V, 3.3 V, DDR rails (MxL7704: 4 buck regulators for system, memory, I/O and core + one 100 mA LDO for analogue [21]) | DA9091 PMIC integrates **eight separate switch-mode supplies** generating all rails, including a core supply that can deliver **20 A** to the Cortex-A76 cores [20]; RTC; power button handling |
| USB downstream current | 1.2 A total for all 4 ports [14] | 600 mA total with a 3 A supply, 1.6 A with a 5 A supply (or `usb_max_current_enable=1`) [14] |
| Recommended PSU / max USB load / typical bare-board active current (docs table) | 3.0 A / 1.2 A / 600 mA [14] | 5.0 A / 1.6 A (600 mA with a 3 A supply) / 800 mA [14] |
| Undervoltage | detection below **4.63 V (±5%)** -> kernel log message, throttling [14] | same, 4.63 V (±5%) [14] |
| Protection | no polyfuse on the main input on Pi 4 (unverified); reverse-polarity protection by a MOSFET (unverified) | (unverified) |

On the Pi 4 the red PWR LED is lit by the power-good signal ("POWER OK") and can be turned off by firmware through Q1
(net `PWR_LED_OFF`, firmware GPIO expander line 2, active low in the device tree [22]); the current docs say the red LED is
**off or flickering when there is undervoltage** [14][4].

### 3.3 Logic levels and current limits (GPIO, both boards)

- GPIO bank voltage VDD_IO = **3.3 V**. Inputs are **not 5 V tolerant**: any voltage above 3.3 V (plus about 0.3 V) on a GPIO
  pin forward-biases the pad protection and can destroy the pin or the SoC/RP1 [2][14].
- Pi 4 datasheet DC table [2]: VIL max 0.8 V, VIH min 2.0 V; VOL max 0.4 V at 2 mA (default drive), VOH min VDD_IO - 0.4 V
  at 2 mA; IOL/IOH min 7 mA at max drive strength (16 mA setting) at VO = 0.4 V / 2.3 V; pull-up/pull-down 18 / 47 / 73 kΩ
  (min/typ/max); input leakage 10 µA max at 85 C. Default drive strength 8 mA.
- Pad design [14]: pads are designed for 16 mA; drive strength programmable 2-16 mA in 2 mA steps. "The Raspberry Pi 3.3 V
  supply was designed with a maximum current of ~3 mA per GPIO pin." Practical rule (current docs, all models): **≤ 16 mA per pin, ≤ 50 mA total from
  all GPIO** [14]; drive LEDs with 330 Ω-1 kΩ.
- Pi 5 GPIO comes from RP1 (bank 0). RP1 GPIO are also 3.3 V, not 5 V tolerant [13].
- GPIO2/GPIO3 (pins 3, 5) have fixed **1.8 kΩ pull-ups to 3.3 V** on the board [14] (`gpio-on-raspberry-pi.adoc`).
- 3.3 V pins 1 and 17: shared 3.3 V rail; budget about 500 mA on Pi 4/Pi 5 for HATs (unverified).
- 5 V pins 2 and 4: connected straight to the 5 V input rail (after the input, no fuse).

### 3.4 ADC, PWM, DAC

- **No ADC** on either board's GPIO header (use an MCP3008/ADS1115 over SPI/I2C). Pi 5 PMIC has internal ADCs readable with
  `vcgencmd pmic_read_adc` (rail voltages/currents, CC1/CC2) [7].
- Hardware PWM: two channels on GPIO12/13/18/19 (PWM0 = GPIO12 or 18, PWM1 = GPIO13 or 19) on Pi 4; on Pi 5 RP1 PWM0
  channels on GPIO12 (ch 0), 13 (ch 1), 18 (ch 2), 19 (ch 3) (also GPIO14/15 as ch 2/3, normally used as UART) [13]
  (use `dtoverlay=pwm-2chan`; sysfs `/sys/class/pwm/pwmchip*`).
  gpiozero's `PWMLED` uses software PWM through lgpio (about 100 Hz default `frequency=100`).
- No DAC on either board. Pi 4 has analogue audio on the A/V jack (PWM-derived); Pi 5 has no analogue audio.

### 3.5 USB/serial and debug

- Neither board has a USB-serial bridge. The USB-C port is a power input (Pi 4 USB-C data goes to the SoC USB 2 OTG
  controller for gadget mode). Serial console: Pi 4 on GPIO14 (TXD, pin 8) / GPIO15 (RXD, pin 10), 115200 8N1 (enable with
  `enable_uart=1`). Pi 5: dedicated 3-pin JST-SH **UART** connector, Linux `/dev/ttyAMA10` (the primary UART on Pi 5) [14], 115200 8N1;
  GPIO14/15 on the header are RP1 UART0 (alt function UART0_TX/RX [13]), Linux `/dev/ttyAMA0` (first PL011, `UART0`) [14].
- Debug connector pinout [12] (target view): pin 1 **RX** (into the SoC), pin 2 **GND**, pin 3 **TX** (out of the SoC).
  The Raspberry Pi Debug Probe cable plugs straight in.

### 3.6 LEDs

| Board | LED | Colour | Driven by | Behaviour |
|---|---|---|---|---|
| Pi 4 | D3 "PWR" at (1.1, 7.9) | red | power-good via Q1 DMG1012T, firmware can turn off (`PWR_LED_OFF`) [4] | on when power is good; Linux name `PWR` (`/sys/class/leds/PWR`) |
| Pi 4 | D5 "ACT" at (1.1, 11.5) | green | SoC GPIO 42, active high (device tree `led_act`) [22], via Q2 DMG1012T [4] | flickers with SD activity (`mmc0` trigger); boot error flash codes; series of short flashes after shutdown = safe to unplug [14]; Linux name `ACT` |
| Pi 4 | Ethernet LEDs on J10 | green (link) + amber (activity) | PHY nets LAN_LEDG / LAN_LEDY [4] | |
| Pi 5 | single bi-colour LED next to the power button (0.96, 13.3) | red + green | green `ACT` = BCM2712 AON GPIO 9, active low, default trigger `mmc0`; red `PWR` = RP1 GPIO 44, active low [22] | red when power is first applied; green as firmware starts; stays green while running; **flashes off** for microSD activity; red again after shutdown (standby) [14] |
| Pi 5 | Ethernet LEDs | green + amber | PHY | |

LED flash codes (ACT/green LED: long flashes then short flashes; Pi 4 and Pi 5) [14]:
0L3S generic failure to boot; 0L4S `start*.elf` not found; 0L7S kernel image not found; 0L8S SDRAM failure;
0L9S insufficient SDRAM; 0L10S in HALT state; 1L2S SD card overcurrent; 2L1S partition not FAT; 2L2S failed to read
from partition; 2L3S extended partition not FAT; 2L4S file signature/hash mismatch; 3L1S SPI EEPROM error; 3L2S SPI EEPROM
write protected; 3L3S I2C error; 3L4S secure-boot configuration not valid; 4L3S RP1 not found (Pi 5); 4L4S unsupported
board type; 4L5S fatal firmware error; 4L6S power failure type A; 4L7S power failure type B.

### 3.7 Buttons and switches

- Pi 4: **no buttons**. Reset by shorting J2 RUN to GND (pads unpopulated); GLOBAL_EN (5 V domain) pulled low = full power off [4].
- Pi 5: **power button** at the left edge, (1.30, 18.4) [9]. First power-up boots automatically. Short press with desktop =
  shutdown/reboot/logout dialog (press again = shut down); Lite: single press shuts down; press while halted = restart;
  press and hold = hard power-off. J2 pads accept an external normally-open momentary switch [14]. In software it is a
  `gpio-keys` input event `KEY_POWER` (code 116) on BCM2712 GPIO 20, active low, 50 ms debounce, not a header GPIO pin [22].

### 3.8 On-board sensors

- SoC temperature sensor (`vcgencmd measure_temp`, `/sys/class/thermal/thermal_zone0/temp`); PMIC die temperature
  (`vcgencmd measure_temp pmic`) [7][14]. No IMU or other user sensors.

### 3.9 Thermal management

- Firmware polls the SoC sensor. **80-85 C: Arm cores progressively throttled; at 85 C both Arm cores and GPU throttled** [14].
- Pi 5 fan: 4-pin JST-SH PWM fan header, upper right between the GPIO header and the USB 2.0 ports; firmware controls the
  speed for the official **Active Cooler** (heatsink with spring-loaded push pins in the two dedicated mounting holes next to
  the SoC, thermal pads, blower fan, cable to the fan header) and the Pi 5 case fan. The fan draws from the same current
  limit as USB [14]. Default fan curve [14]: below 50 C off (0%); 50 C 30%; 60 C 50%; 67.5 C 70%; 75 C 100%; 5 C hysteresis on the way down (tunable with `fan_tempN`, `fan_tempN_hyst`, `fan_tempN_speed`). The official case fan draws about 60 mA at 5 V.
- Pi 4 case fan: 5 V from the GPIO header, rated 0.18 A, typically 60 mA [14].

### 3.10 `vcgencmd get_throttled` bits [14]

| Bit | Hex | Meaning |
|---|---|---|
| 0 | 0x1 | Undervoltage detected (now) |
| 1 | 0x2 | Arm frequency capped (now) |
| 2 | 0x4 | Currently throttled |
| 3 | 0x8 | Soft temperature limit active |
| 16 | 0x10000 | Undervoltage has occurred (since boot) |
| 17 | 0x20000 | Arm frequency capping has occurred |
| 18 | 0x40000 | Throttling has occurred |
| 19 | 0x80000 | Soft temperature limit has occurred |

Example: `throttled=0x50005` = undervoltage now + throttled now + both have occurred. `throttled=0x0` = healthy.
(The original Robotics Bench figure omitted bit 18 [19].)

## 4. Pinout (40-pin header J8, both boards, physical order)

All signal pins 3.3 V, not 5 V tolerant. "Alt" functions are the default Raspberry Pi OS / device-tree uses.

| Pin | Label | Function(s) | Pin | Label | Function(s) |
|---|---|---|---|---|---|
| 1 | 3V3 | 3.3 V power | 2 | 5V | 5 V power (input rail, direct) |
| 3 | GPIO2 | I2C1 SDA (1.8 kΩ pull-up on board) | 4 | 5V | 5 V power |
| 5 | GPIO3 | I2C1 SCL (1.8 kΩ pull-up); wakes a halted Pi 4 when pulled low | 6 | GND | ground |
| 7 | GPIO4 | GPCLK0, default 1-Wire (`w1-gpio`) | 8 | GPIO14 | UART TXD |
| 9 | GND | ground | 10 | GPIO15 | UART RXD |
| 11 | GPIO17 | general, SPI1 CE1 | 12 | GPIO18 | PCM CLK, PWM0 |
| 13 | GPIO27 | general | 14 | GND | ground |
| 15 | GPIO22 | general | 16 | GPIO23 | general |
| 17 | 3V3 | 3.3 V power | 18 | GPIO24 | general |
| 19 | GPIO10 | SPI0 MOSI | 20 | GND | ground |
| 21 | GPIO9 | SPI0 MISO | 22 | GPIO25 | general |
| 23 | GPIO11 | SPI0 SCLK | 24 | GPIO8 | SPI0 CE0 |
| 25 | GND | ground | 26 | GPIO7 | SPI0 CE1 |
| 27 | GPIO0 | ID_SD (HAT EEPROM I2C0 SDA, reserved) | 28 | GPIO1 | ID_SC (HAT EEPROM I2C0 SCL, reserved) |
| 29 | GPIO5 | general | 30 | GND | ground |
| 31 | GPIO6 | general | 32 | GPIO12 | PWM0 |
| 33 | GPIO13 | PWM1 | 34 | GND | ground |
| 35 | GPIO19 | PCM FS, PWM1, SPI1 MISO | 36 | GPIO16 | SPI1 CE2 |
| 37 | GPIO26 | general | 38 | GPIO20 | PCM DIN, SPI1 MOSI |
| 39 | GND | ground | 40 | GPIO21 | PCM DOUT, SPI1 SCLK |

Notes: GND pins 6, 9, 14, 20, 25, 30, 34, 39. Pi 4 and Pi 5 header pinout is identical in labels; on the Pi 5 the pins are
RP1 GPIO0-27 (same numbering). Boot behaviour: all pins default to inputs; GPIO0-8 have pull-ups, GPIO9-27 pull-downs at
reset (confirmed for Pi 4 by datasheet Table 5 [2]; unverified for RP1). Pin 5 (GPIO3) shorted to GND wakes a halted Pi 4 (on Pi 5 use the power button) (unverified for
Pi 5). Hardware PWM channels and SPI1 require device-tree overlays. Pi 4 adds extra UARTs/I2C/SPI via overlays (uart2-5,
i2c3-6, spi3-6) (unverified mapping).

PoE header (Pi 4 J14, Pi 5 near Ethernet): carries the 4 Ethernet transformer centre taps (TR0_TAP..TR3_TAP) to the PoE
HAT, which feeds 5 V back on the GPIO 5 V pins [4].

Pi 5 fan header (JST-SH 4-pin, 1.0 mm): pin 1 +5 V (red wire), pin 2 PWM (blue), pin 3 GND (black), pin 4 tach (yellow) [14]. Pi 5 J5: 2-pin JST-SH, battery + and
GND; the official battery is a rechargeable lithium-manganese coin cell (Panasonic ML-2020, unverified part) with a
pre-fitted JST-SH plug and adhesive pad (part number not stated in the docs; Panasonic ML-2020 per retailer listings, unverified).
Charging is **disabled by default**; `dtparam=rtc_bbat_vchg=3000000` in config.txt enables charging at 3.0 V; the charger is
constant-current (3 mA) / constant-voltage, sysfs range 1.3-4.4 V (`/sys/class/rtc/rtc0/charging_voltage*`) [14].

Pi 5 PCIe FFC (16-pin, 0.5 mm): 5 V, GND, PCIe single lane (TX, RX, REFCLK pairs), PERST#, CLKREQ#, PCIE_PWR_EN,
PCIE_DET_WAKE; SH1-SH3 are mechanical only [11] (exact pin numbers unverified).

## 5. Programming and software (October 2026)

- OS: **Raspberry Pi OS** based on **Debian 13 "Trixie"** (64-bit) (Trixie-based release from late 2025; unverified exact
  image date). Flash with **Raspberry Pi Imager**. Config in `/boot/firmware/config.txt`.
- Python GPIO: **gpiozero 2.0.1.post3** (PyPI, uploaded 2026-07-27; preinstalled in Raspberry Pi OS). Its default pin
  factory is **`LGPIOFactory`** (`gpiozero.pins.lgpio`), tried first on every Pi including the Pi 5; fallback order is
  lgpio, rpigpio, pigpio, native (source `gpiozero/devices.py` `_default_pin_factory`; override with env
  `GPIOZERO_PIN_FACTORY`). lgpio 0.2.2.0 talks to `/dev/gpiochip*` through the kernel GPIO character device. **RPi.GPIO does not work on the Pi 5**: it pokes the BCM283x/2711 GPIO registers through
  `/dev/gpiomem` at the SoC's peripheral base, but on the Pi 5 the header GPIO lives in RP1 behind PCIe, at a different
  address with a different register layout, so it fails with "RuntimeError: Cannot determine SOC peripheral base address"
  (unverified exact message). Use gpiozero, lgpio, libgpiod (`gpiod`, `gpioset`/`gpioget`/`gpioinfo`), or the
  `rpi-lgpio` 0.6 drop-in shim (provides the `RPi.GPIO` API on top of lgpio). RPi.GPIO's last release is 0.7.1 (Feb 2022). `pinctrl` replaces `raspi-gpio` on the Pi 5 (and on Pi 4 since Bookworm).
- C: libgpiod 2.x, lgpio. pigpio does not support the Pi 5 (unverified).
- Bootloader update: `sudo rpi-eeprom-update -a`; status `vcgencmd bootloader_version`.
- Upload path: there is no "upload"; programs run on the Pi. Typical flow: SSH in (`ssh pi@raspberrypi.local`, the user name
  is set in Imager; there is no default `pi`/`raspberry` since 2022), edit, `python3 blink.py`.
- No factory program: boards ship blank (no OS); with no SD card the Pi 4/5 bootloader shows the diagnostics screen on
  HDMI and tries network/USB boot (Pi 5 also NVMe) [14].
- Boot sequence (Pi 5): power LED red -> bootloader in SPI flash runs -> green LED -> reads `config.txt`, loads kernel
  `kernel_2712.img` (the Pi 5 kernel image name in the docs [14]) -> Linux -> desktop or login prompt.

### ROS 2 (October 2026)

- **Current LTS: ROS 2 Lyrical Luth**, released **May 22, 2026**, supported until **May 2031** [16]. Tier 1 platform:
  **Ubuntu 26.04 "Resolute"** (amd64 and arm64, Debian packages). Ubuntu 24.04 Noble and Debian Trixie are Tier 3 for
  Lyrical [16]. So on a Pi 5, run Ubuntu 26.04 Server/Desktop for arm64 to `apt install ros-lyrical-desktop`.
- Previous LTS **Jazzy Jalisco** (May 2024, Ubuntu 24.04, EOL May 2029) is still supported; **Kilted Kaiju** (May 2025) is
  a non-LTS release [16]. Raspberry Pi OS (Trixie) has no Tier 1 ROS 2 binaries: use Ubuntu or Docker.
- Environment: `source /opt/ros/lyrical/setup.bash`.

## 6. Real failure modes

| Fault | What physically happens | What the user observes |
|---|---|---|
| Reverse polarity on USB-C | impossible with a compliant USB-C cable (keyed, VBUS/GND fixed) | nothing |
| Reverse polarity on GPIO 5 V pins (5 V into GND pin and GND into 5 V) | no protection on the header 5 V rail: current flows through the reverse body diodes of the regulators/PMIC and ESD structures | board dead, supply current-limits, possible hot PMIC, smell; often permanent damage (unverified detail) |
| Over-voltage on USB-C (e.g. a 9 V/12 V PD profile forced, or a broken supply) | Pi 4 has no PD negotiation, supplies only give 5 V by default; > 6 V damages the PMIC (PMIC abs max unverified) | dead board, possible burnt PMIC |
| Brown-out / weak supply | below **4.63 V (±5%)**: undervoltage flag (bit 0/16), kernel log "Undervoltage detected!", CPU/GPU throttled; deeper sags reset the board; Pi 5 desktop shows a lightning-bolt / "Low voltage warning" notification (unverified wording); with a 3 A supply the Pi 5 caps USB at 600 mA and prints a warning at boot ("This power supply is not capable of supplying 5A", unverified wording) [14] | random reboots, corrupted SD card, slow system |
| Over-current on USB ports | the USB current limiter (1.2 A Pi 4, 0.6/1.6 A Pi 5) cuts the ports | USB devices drop out; kernel "over-current" messages |
| Cold solder joint (e.g. on a GPIO header pin) | intermittent contact | sensor reads flicker, I2C errors (`Remote I/O error`), works when pressed |
| 5 V into a 3.3 V GPIO | pad ESD diode conducts into the 3.3 V rail; the pin (or the whole SoC/RP1 bank) can be destroyed | pin stuck or dead, board may stop booting; often no visible sign |
| GPIO shorted to GND while driven high | pad delivers > 16 mA, "in due time it will fail" [14] | pin dies after time |
| Shorting 5 V to GND on the header | the supply current-limits or the USB-C supply shuts down; no on-board fuse on the 5 V header rail (unverified); a PD supply may hiccup | board resets/turns off, red LED off; traces can heat up |
| Shorting 3.3 V to GND | PMIC 3.3 V buck current-limits/shuts down | board resets, no boot |
| Overheating | 80-85 C progressive throttling, 85 C GPU too [14] | slower performance, thermometer icon, `throttled=0x...` bits 2/3/18/19 |
| Beginner traps | SD card pulled while writing (corruption); phone charger instead of 5 A supply on Pi 5; using RPi.GPIO on Pi 5; forgetting the BCM vs physical pin numbering (gpiozero uses BCM numbers: `LED(17)` is physical pin 11); connecting a motor directly to a GPIO pin; connecting HATs while powered (resets the Pi 5 PMIC) [14]; wrong FFC cable (Pi 5 uses 22-pin 0.5 mm, Pi 4 15-pin 1 mm); Active Cooler not plugged into the fan header | |

## 7. Lesson facts

Lesson 1: Blink (LED on GPIO17, physical pin 11, with a 330 Ω resistor to GND via pin 9 or 14):

```python
from gpiozero import LED
from time import sleep

led = LED(17)          # BCM 17 = physical pin 11

while True:
    led.on()
    sleep(1)
    led.off()
    sleep(1)
```

On-board LED variant (no wiring): the green LED is a Linux LED class device, not a GPIO; there is no `ACT` constant as in
Arduino. As root: `echo none | sudo tee /sys/class/leds/ACT/trigger` then `echo 1 | sudo tee /sys/class/leds/ACT/brightness`;
restore with `echo mmc0 | sudo tee /sys/class/leds/ACT/trigger`. On the Pi 5 the bi-colour LED appears as two LED devices,
`ACT` (green) and `PWR` (red) [22]. gpiozero cannot drive it.

Lesson 2: button on GPIO27 (pin 13) to GND, internal pull-up (gpiozero `Button` default `pull_up=True`):

```python
from gpiozero import LED, Button
from signal import pause

led = LED(17)
button = Button(27)    # pin 13; other leg to GND

button.when_pressed = led.on
button.when_released = led.off
pause()
```

Sensor: DS18B20 on GPIO4 (1-Wire, `dtoverlay=w1-gpio`, 4.7 kΩ pull-up to 3.3 V), read from
`/sys/bus/w1/devices/28-*/temperature` (millidegrees C), or I2C sensors on pins 3/5 (`sudo i2cdetect -y 1`).

Lesson 3: PWM brightness (software PWM via lgpio) and "analog" input through an MCP3008 on SPI0 (CE0 pin 24):

```python
from gpiozero import PWMLED, MCP3008
from signal import pause

led = PWMLED(18)            # pin 12 (hardware PWM capable; gpiozero uses software PWM)
pot = MCP3008(channel=0)    # value 0.0..1.0
led.source = pot            # brightness follows the potentiometer
pause()
```

Lesson 4 (protocol / ROS 2 teleop on the Pi 5, Lyrical): a publisher at 10 Hz on `/cmd_vel` (`geometry_msgs/msg/Twist`):

```python
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist


class Drive(Node):
    def __init__(self):
        super().__init__('drive')
        self.pub = self.create_publisher(Twist, 'cmd_vel', 10)
        self.timer = self.create_timer(0.1, self.tick)     # 10 Hz

    def tick(self):
        msg = Twist()
        msg.linear.x = 0.2      # m/s
        msg.angular.z = 0.5     # rad/s
        self.pub.publish(msg)


def main():
    rclpy.init()
    node = Drive()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.try_shutdown()


if __name__ == '__main__':
    main()
```

Subscriber:

```python
from geometry_msgs.msg import Twist
...
        self.sub = self.create_subscription(Twist, 'cmd_vel', self.on_cmd, 10)

    def on_cmd(self, msg):
        self.get_logger().info(f'linear.x={msg.linear.x:.2f} angular.z={msg.angular.z:.2f}')
```

Real CLI output (formats from ros2cli source [17]). Logger lines use the rcutils default format
`[{severity}] [{time}] [{name}]: {message}` (rcutils `lyrical` branch `src/logging.c`), e.g.
`[INFO] [1761321600.123456789] [drive]: publishing /cmd_vel at 10 Hz`; the tutorial pages print them without the time
field [16]:

```
$ ros2 run teleop_twist_keyboard teleop_twist_keyboard
This node takes keypresses from the keyboard and publishes them
as Twist/TwistStamped messages. It works best with a US keyboard layout.
---------------------------
Moving around:
   u    i    o
   j    k    l
   m    ,    .
...
currently:	speed 0.50	turn 1.00

$ ros2 topic info /cmd_vel
Type: geometry_msgs/msg/Twist
Publisher count: 1
Subscription count: 1

$ ros2 topic hz /cmd_vel
average rate: 10.000
	min: 0.100s max: 0.100s std dev: 0.00012s window: 12

$ ros2 topic echo /cmd_vel
linear:
  x: 0.2
  y: 0.0
  z: 0.0
angular:
  x: 0.0
  y: 0.0
  z: 0.5
---
```

teleop_twist_keyboard publishes `geometry_msgs/msg/Twist` by default; with `-p stamped:=true` it publishes `TwistStamped`
[18]. Diagnostics commands for lessons: `vcgencmd measure_temp` -> `temp=48.3'C`; `vcgencmd get_throttled` -> `throttled=0x0`;
`vcgencmd measure_clock arm` -> `frequency(0)=2400000000` on Pi 5 (format of the last unverified).

## 8. Internals for the see-through view

- **BCM2711 / BCM2712**: flip-chip silicon die on an organic BGA substrate (green/brown, many layers), solder bumps (no bond
  wires), under a nickel-plated copper heat spreader glued to the substrate with thermal interface material. Balls on the
  underside soldered to the PCB.
- **LPDDR4/LPDDR4X**: stacked DRAM dies, wire-bonded inside a moulded black FBGA package.
- **RP1**: single die (TSMC 40LP process [20]) in a BGA; contains two xHCI USB host controllers (each 1 x USB 3 + 1 x USB 2
  port), Gigabit Ethernet MAC, 2 x MIPI, GPIO bank, UART/SPI/I2C, PWM, PIO, ADC for internal use; internal **dual-core** Cortex-M3
  cluster for platform configuration [13]; core clock clk_sys typically 200 MHz [13].
- **Wi-Fi can**: stamped tin-plated steel shield over the CYW43455 chip, its crystal (37.4 MHz, unverified) and RF
  matching passives; antenna is a PCB/ceramic antenna (Pi 4 at the top-left corner; Pi 5 similar, unverified).
- **PMIC**: one power-management die with integrated buck MOSFETs; external inductors (the 2.0 x 2.5 grey blocks on the Pi 5)
  and ceramic capacitors around it.
- **Crystals**: quartz blank in a hermetically sealed metal-lid ceramic SMD package (54 MHz main, unverified).
- **USB-C / micro-HDMI / USB-A**: stamped steel shells around plastic tongues with gold-plated contacts.
- **RJ45 magjack**: plastic housing inside a steel shield, ferrite-core isolation transformers (magnetics) and two LEDs.
- **microSD socket**: stamped steel lid over spring contacts (bottom side).
- **Bootloader flash/EEPROM**: small SPI NOR flash in an 8-pin package (Pi 4: 512 KB EEPROM; Pi 5: 2 MB SPI flash, unverified).
- No USB-serial bridge chip (contrast Arduino).

## 9. Assembly and power-up

- Manufacturing: SMD reflow for both sides (bottom-side microSD socket and small passives first, then top side), then
  through-hole parts (GPIO header, PoE header, USB-A stacks, RJ45, A/V jack, micro-HDMI THT legs) by selective/wave or
  intrusive reflow (method unverified). RF can and heat-spreader parts are reflowed. Boards are flashed with the EEPROM
  bootloader and tested at the factory. Nothing is socketed except the microSD card.
- Power-up Pi 4: red PWR LED on immediately; green ACT flickers as the bootloader reads the SD card; HDMI shows the rainbow
  screen only with older firmware (unverified); Linux boots; ACT then follows SD activity.
- Power-up Pi 5: bi-colour LED red, turns green as firmware starts, flashes off with SD activity; Active Cooler fan spins
  briefly at boot then follows the fan curve (unverified). After `sudo shutdown -h now`, LED goes red (standby: about 1 W to 1.4 W
  when off; set `POWER_OFF_ON_HALT=1` with `sudo rpi-eeprom-config -e` to reduce it) [14].

### Cross-check of the original Robotics Bench Fig. 13 [19]

| Item in the original | Correct (this sheet) |
|---|---|
| Separate LED1 red "PWR" and LED2 green "ACT" | Pi 5 has **one bi-colour red/green LED** next to the power button at (0.96, 13.3) [14]; red/green as described in 3.6 |
| "blinking = supply below 4.63 V" | the threshold 4.63 V is right; the Pi 5 does not blink the LED for undervoltage (it logs and throttles) (unverified for LED behaviour) |
| U1 SoC box 21.5..37.5 x 24..40 | (33.15, 22.75), 17 x 17 [9] |
| U2 RAM 41..55 x 26..38 (right of SoC) | RAM is **above** the SoC, (33.15, 39.2), 14.5 x 10 [9] |
| U3 RP1 57..66 x 18..27 | RP1 at (58.5, 35.1), 12 x 12 [9][15]; the chip at (64, 23.5) rotated 45 deg is the Ethernet PHY |
| U4 PMIC 8..15 x 20..27 | PMIC at (11.2, 15.2) 5 x 5, inductors in a row at y = 21.95 [9] |
| U5 Wi-Fi 6..16 x 31..41 | can at (12.3, 42.7), 10.8 x 13 [9] |
| J2 PCIe FFC 0.6..3.6 x 14..30 | (2.88, 29.99), 3.55 x 13.7 [9] |
| J3/J4 CAM0/CAM1 at 45..48 and 49.5..52.5 | (48.88, 8.49) and (55.08, 8.49), 3.55 x 16.7 [9] |
| SW1 power button 0.5..4.5 x 8..12 | (1.30, 18.4), 3.5 x 4.5 [9] |
| J5 RTC at 6..10.5 x 8.5..11.5 | J5 at (19.0, 5.2), between USB-C and HDMI0 [9] |
| J6 fan at 62..69 x 44..47.5 | fan header at (67.2, 52.0), 3.8 x 6.0 [9][14] |
| J1 USB-C 6.7..15.7 x -1.2..6.3 | correct (11.2, 2.69) [9] |
| HDMI 22.3..29.3 and 35.7..42.7 | centres 25.8 and 39.2 [10]: close |
| J8 GPIO 7.1..57.9 x 49.6..54.68 | 7.1..57.9 x 49.96..55.04 [9] |
| J11 Ethernet 66.5..87.5 x 2..17.5 | correct position (77.25, 10.25) |
| J12 USB3 70..87.5 x 21.5..34.6, J13 USB2 38.5..51.6 | correct order (USB3 middle, USB2 top) |
| UART connector, PoE header | missing in the original; UART at (32.5, 4.4), PoE at (61.5, 9.5) |
| get_throttled bit 18 missing | bits 0,1,2,3,16,17,18,19 (section 3.10) |
| "source /opt/ros/jazzy/setup.bash" | Jazzy still works (LTS to 2029) but the current LTS is **Lyrical** (`/opt/ros/lyrical/setup.bash`) on Ubuntu 26.04 |
| "WARNING: CPU at 85.0C, throttling to 1.5 GHz" | not a real message; real symptom: `vcgencmd get_throttled` shows 0x...4/0x...8 bits and `measure_clock arm` drops; no such console line |
| Temperature resets on mode switch | simulation bug, fix |

## 10. Uncertainties

- No Pi 5 schematic is published; Pi 5 part identities (DA9091 package, PHY, inductors, designators other than J2/J5/J20)
  come from the STEP shapes, the official photo and the docs. Designators marked J? are unknown.
- Pi 4 part heights, corner radius and thickness were not extracted (the Pi 4 mechanical PDF stores text as paths); Pi 5
  heights are from the STEP model.
- Pi 4 PMIC: MxL7704 on early boards per MaxLinear's own press release [21]; which PMICs later boards use is not documented ("a range of PMIC devices" [7][14]).
- J2 (Pi 4) pin order: square pad at x 14.54 is pin 1; which pad is RUN, GND or GLOBAL_EN is not confirmed.
- Exact chip markings, the RAM-size tick-box labels and Pi 5 silkscreen strings other than "Raspberry Pi 5", "HDMI", "UART"
  and "HAT+ GPIO INTERFACE" (read from the photo) are unverified.
- Exact RPi.GPIO error message and crystal frequencies remain unverified. gpiozero/lgpio/rpi-lgpio/RPi.GPIO versions, the Pi 5
  fan curve, RP1 process node and the RTC charge parameter were checked in the verification pass below.

## Verification

Adversarial fact-check pass, 2026-10-24 14:08-14:20 CDT. Every source below was opened directly (PDFs downloaded and
text-extracted, the Pi 4 DXF re-parsed with an independent script, doc and device-tree sources fetched raw from GitHub).
Status key: **confirmed** = matches the primary source; **corrected** = the sheet was changed (old -> new); **unverified** =
could not be checked in the time box (also marked in the text).

| # | Claim | Status | Source | Old -> new (corrections) |
|---|---|---|---|---|
| 1 | Pi 4 mounting holes (3.5,3.5), (61.5,3.5), (3.5,52.5), (61.5,52.5); hole r 1.35 (Ø2.7), pad r 3.0 (Ø6) | confirmed | DXF RP-008342-DS-1 (https://pip-assets.raspberrypi.com/categories/545-raspberry-pi-4-model-b/documents/RP-008342-DS-1-raspberry-pi-4-mechanical-drawing.dxf), layer 0 circles | |
| 2 | Pi 4 J8 pin 1 square pad at (8.37, 51.23), pin 2 (8.37, 53.77), 2.54 pitch, odd pins on the inner row | confirmed | same DXF, PINS_TOP circles + square pad 7.57..9.17 x 50.43..52.03 | |
| 3 | Pi 4 silkscreen text positions (PWR, ACT, RUN, GLOBAL_EN, HDMI0/1, POWER IN, A/V, CAMERA, DISPLAY, USB2/USB3, PCB-R4, model name) | confirmed | same DXF, SILK_TOP TEXT entities (16 strings re-read, all match) | |
| 4 | Pi 5 drawing: 85 x 56, 58 x 49 hole grid, Ø2.7 holes, 6 mm pads, bottom-edge centres 11.2 / 25.8 / 39.2, right-edge 10.2 / 29.1 / 47; power button y 18.4, LED y 13.3, button overhang 0.45 mm | confirmed | https://datasheets.raspberrypi.com/rpi5/raspberry-pi-5-mechanical-drawing.pdf (text layer) | |
| 5 | Pi 4: 1.8 GHz, RAM 1/2/3/4/8 GB LPDDR4, prices $35 / $67.50 / $83.75 / $100 / $165, 0-50 C, production to Jan 2034 | confirmed | https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-product-brief.pdf | |
| 6 | Pi 5: 2.4 GHz A76, LPDDR4X-4267 1/2/4/8/16 GB, 800 MHz VideoCore VII, PCIe 2.0 x1, prices $45 / $77.50 / $110 / $175 / $305, 0-70 C, production to Jan 2036 | confirmed | https://datasheets.raspberrypi.com/rpi5/raspberry-pi-5-product-brief.pdf | |
| 7 | Pi 4 GPIO DC: VIL ≤ 0.8 V, VIH ≥ 2.0 V, VOL ≤ 0.4 V / VOH ≥ VDD_IO-0.4 V at 2 mA (8 mA default drive), IOL/IOH ≥ 7 mA at 16 mA drive, pulls 18/47/73 kΩ, leakage 10 µA at 85 C | confirmed | https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-datasheet.pdf (GPIO DC table) | |
| 8 | Pi 4 needs 5 V / 3 A; 2.5 A acceptable if USB load < 500 mA | confirmed | Pi 4 datasheet, power section | |
| 9 | Recommended PSU / max USB / bare-board current: Pi 4 3.0 A / 1.2 A / 600 mA; Pi 5 5.0 A / 1.6 A (600 mA on a 3 A supply) / 800 mA | confirmed | https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/raspberry-pi/power-supplies.adoc | |
| 10 | Undervoltage threshold 4.63 V (±5%) | confirmed | power-supplies.adoc | |
| 11 | GPIO current: ≤ 16 mA per pin, ≤ 50 mA all pins combined | corrected | gpio-on-raspberry-pi.adoc and power-supplies.adoc (current docs, all models) | "legacy guidance, unverified for Pi 5" -> stated by the current docs for all models [14] |
| 12 | GPIO2/GPIO3 fixed 1.8 kΩ pull-ups to 3.3 V; GPIO not 5 V tolerant | confirmed | https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/raspberry-pi/gpio-on-raspberry-pi.adoc | (removed "unverified this run") |
| 13 | Pad design 16 mA, drive 2-16 mA, "~3 mA per GPIO pin" 3.3 V supply design, short-circuit "in due time it will fail" | confirmed | gpio-pad-controls.adoc | |
| 14 | `get_throttled` bits 0, 1, 2, 3, 16, 17, 18, 19 and meanings | confirmed | os/graphics-utilities.adoc | |
| 15 | Throttling: Arm progressively throttled 80-85 C; Arm + GPU at 85 C | confirmed | raspberry-pi/frequency-management.adoc | |
| 16 | Pi 5 fan curve <50 C off, 50 C 30%, 60 C 50%, 67.5 C 70%, 75 C 100%, 5 C hysteresis; fan connector upper right between GPIO and USB 2.0; case fan 60 mA; Pi 4 case fan 0.18 A rated / 60 mA typical | confirmed | frequency-management.adoc; device tree `cooling-levels = <0 75 125 175 250>`, `hysteresis = <5000>` in bcm2712-rpi-5-b.dts | |
| 17 | Pi 5 fan connector pinout | corrected | frequency-management.adoc, "Raspberry Pi 5 fan connector pinout" | "5 V, PWM, GND, tach (pin order unverified)" -> pin 1 +5 V red, pin 2 PWM blue, pin 3 GND black, pin 4 tach yellow |
| 18 | LED flash codes (0L3S ... 4L7S, 19 codes) | confirmed | configuration/led_blink_warnings.adoc | |
| 19 | Pi 5 bi-colour LED: red at power-up, green as firmware starts, flashes off for microSD activity, red in standby | confirmed | led_blink_warnings.adoc | |
| 20 | Pi 5 LED drive | corrected | https://github.com/raspberrypi/linux/blob/rpi-6.12.y/arch/arm64/boot/dts/broadcom/bcm2712-rpi-5-b.dts (`led_pwr`, `led_act`) | "firmware / RP1" -> green `ACT` on BCM2712 AON GPIO 9 active low (trigger mmc0); red `PWR` on RP1 GPIO 44 active low; LED names ACT/PWR now confirmed |
| 21 | Pi 4 ACT LED on SoC GPIO 42 | confirmed | https://github.com/raspberrypi/linux/blob/rpi-6.12.y/arch/arm/boot/dts/broadcom/bcm2711-rpi-4-b.dts (`gpios = <&gpio 42 GPIO_ACTIVE_HIGH>`) | was "(unverified)"; now active high, confirmed; PWR LED = expgpio 2 active low |
| 22 | Pi 4 red PWR LED on undervoltage | corrected | led_blink_warnings.adoc ("The red LED is off or flickering when there is undervoltage") | "in older firmware it blinked/went off (unverified for current firmware)" -> off or flickering on undervoltage (current docs) |
| 23 | 3-pin debug connector: pin 1 RX (into target) / SC, pin 2 GND, pin 3 TX (out of target) / SD | confirmed | https://datasheets.raspberrypi.com/debug/debug-connector-specification.pdf | |
| 24 | Pi 5 primary UART = debug header `UART10`, `/dev/ttyAMA10`; header GPIO14/15 = `/dev/ttyAMA0` | confirmed | configuration/interfaces.adoc (UART device-node table); RP1 datasheet GPIO14/15 alt UART0_TX/RX | was "unverified name" for ttyAMA0 |
| 25 | RP1: PCIe 2.0 x4 to BCM2712, clk_sys typically 200 MHz | confirmed | https://datasheets.raspberrypi.com/rp1/rp1-peripherals.pdf | (removed "link width unverified") |
| 26 | RP1 internal Cortex-M3 cores | corrected | RP1 datasheet ("A local dual-core ARM Cortex M3 processor cluster") | "count unverified" -> dual-core |
| 27 | RP1 process | confirmed | https://www.raspberrypi.com/news/introducing-raspberry-pi-5/ ("TSMC's mature 40LP process") | "TSMC 40 nm, unverified" -> TSMC 40LP |
| 28 | RP1 PWM0 on GPIO12, 13, 18, 19 | confirmed | RP1 datasheet function table: GPIO12 PWM0[0], 13 PWM0[1], 18 PWM0[2], 19 PWM0[3] (14/15 also PWM0[2]/[3]) | channel numbers added; "(Pi 5 mapping unverified)" removed |
| 29 | Pi 5 PMIC = Renesas DA9091 "Gilmour" | confirmed | Raspberry Pi 5 launch post (above); second source: The Pi Hut "DA9091 PMIC (5-pack)" replacement listing, https://thepihut.com/products/da9091-pmic-5-pack | |
| 30 | Pi 5 PMIC regulator count | corrected | Raspberry Pi 5 launch post ("integrates eight separate switch-mode power supplies", core supply "capable of providing 20 amps") | "8 buck phases (unverified)" -> eight separate switch-mode supplies, 20 A core supply |
| 31 | Pi 4 PMIC MaxLinear MxL7704 on original boards; 4 bucks + LDO | confirmed | https://investors.maxlinear.com/press-releases/detail/373/maxlinears-mxl7704-pmic-powers-the-raspberry-pi-4 (reprinted by eeNews Europe / EE Power) | package added: QFN-32 5 x 5 mm; LDO 100 mA |
| 32 | BCM2712 process 16 nm | confirmed | Raspberry Pi 5 launch post ("a new 16-nanometer application processor") | (removed "process unverified") |
| 33 | BCM2711 process 28 nm | unverified | not re-checked | |
| 34 | Power button: auto boot on first power, desktop press = dialog / press again, Lite single press = shutdown, press when off = restart, hold = hard off; J2 between RTC connector and board edge takes an NO switch; connecting a HAT can reset the PMIC; `KEY_POWER` | confirmed | raspberry-pi/power-button.adoc; bcm2712-rpi-5-b.dts (`linux,code = <116>; // KEY_POWER`, `gpios = <&gio 20 GPIO_ACTIVE_LOW>`) | "(unverified)" on KEY_POWER removed |
| 35 | RTC battery: J5 (BAT), lithium-manganese rechargeable cell with JST-SH plug, charging disabled by default, `dtparam=rtc_bbat_vchg=3000000` | confirmed | raspberry-pi/rtc.adoc | added CC 3 mA / CV charger and 1.3-4.4 V range |
| 36 | `dtparam=pciex1_gen=3` forces PCIe Gen 3 | confirmed | raspberry-pi/pcie.adoc | |
| 37 | Pi 5 default kernel `kernel_2712.img` (falls back to `kernel8.img`) | confirmed | config_txt/boot.adoc | |
| 38 | Pi 5 off-state draw 1-1.4 W, `POWER_OFF_ON_HALT=1` via `sudo rpi-eeprom-config -e`; `PSU_MAX_CURRENT` for bench supplies | confirmed | power-supplies.adoc; configuration/reference.adoc | |
| 39 | gpiozero 2.0.1.post3 (uploaded 2026-07-27), default factory order lgpio, rpigpio, pigpio, native; lgpio 0.2.2.0; rpi-lgpio 0.6; RPi.GPIO last release 0.7.1 (2022-02-06) | confirmed | https://pypi.org/pypi/gpiozero/json (and RPi.GPIO, rpi-lgpio, lgpio); https://github.com/gpiozero/gpiozero/blob/master/gpiozero/devices.py `_default_pin_factory` | |
| 40 | ROS 2 Lyrical Luth released May 22, 2026, EOL May 2031; Tier 1 Ubuntu 26.04 Resolute amd64 + arm64; Ubuntu 24.04 and Debian Trixie Tier 3; Jazzy (May 23, 2024) EOL May 2029; Kilted Kaiju May 2025 (EOL Dec 2026) | confirmed | https://github.com/ros2/ros2_documentation/blob/rolling/source/Releases.rst; .../Releases/lyrical/supported-platforms.rst | |
| 41 | Header alt functions (GPIO4 GPCLK0, GPIO7/8 SPI0 CE1/CE0, GPIO9-11 SPI0, GPIO12/13 PWM0/1, GPIO14/15 UART, GPIO16-21 SPI1 CE2/CE1/CE0/MISO/MOSI/SCLK, GPIO18-21 PCM, GPIO18/19 PWM0/1) and Pi 4 reset pulls (GPIO0-8 high, 9-27 low) | confirmed | Pi 4 datasheet Table 5 "GPIO Alternate Functions" | "unverified for RP1" kept for the RP1 reset pulls only |
| 42 | Pi 5 part positions from the STEP model (PoE header (61.5, 9.5), UART JST (32.5, 4.4), RTC J5 (19.0, 5.2), fan (67.2, 52.0), SoC/RAM/RP1 boxes) | unverified (partly) | STEP not re-parsed in this pass; consistent with the drawing (#4) and with docs: J5 "to the right of the USB-C" (rtc.adoc), fan "upper right between the GPIO header and USB 2.0" (frequency-management.adoc), J2 "between the RTC battery connector and the board edge" (power-button.adoc) | |
| 43 | 54 MHz main crystal, 37.4 MHz Wi-Fi crystal, exact RPi.GPIO error text, Pi 5 PHY part, 500 mA 3.3 V budget | unverified | not checked; left marked "(unverified)" in the text | |

No claim was found to be false enough to delete. Six values were changed (#11, #17, #20, #22, #26, #30), several "(unverified)"
tags were removed where a primary source now backs the value (#12, #21, #24, #25, #27, #28, #32, #34), and three new
sources were added to section 1 ([20] Raspberry Pi 5 launch post, [21] MaxLinear MxL7704 release, [22] Raspberry Pi Linux
device trees).
