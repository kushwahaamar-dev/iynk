# ESP32-DevKitC V4 (ESP32-WROOM-32E) - fact sheet

## 0. Header

| Field | Value |
|---|---|
| Product modelled | **ESP32-DevKitC V4**, ordering code **ESP32-DevKitC-32E** [1] |
| Manufacturer | Espressif Systems |
| On-board module | **ESP32-WROOM-32E-N4**: ESP32-D0WD-V3, 4 MB quad-SPI flash, no PSRAM, PCB antenna [1][5] |
| Board revision | V4. Schematic title block reads `ESP32_DevKitc_V4`, rev `V4` [3] |
| USB-UART bridge | **CP2102N-A02-GQFN28** (Silicon Labs) per the current official schematic [3] (2020-02-25 issue; the older 2018-06-07 issue shows CP2102N-A01-GQFN28, same footprint). Boards sold since about 2021 are widely reported with a **CH9102F** (WCH) instead (retailer listings and user reports; no Espressif PCN found, unverified; see 3.6) |
| Sister variants (not modelled) | ESP32-DevKitC-32UE (WROOM-32UE, U.FL connector, 18.0 x 19.2 x 3.2 mm module) [1][5]; older boards carried ESP-WROOM-32 or ESP32-WROVER |

**What it is.** A small, breadboard-friendly development board from Espressif. An ESP32-WROOM-32E module (a dual-core Xtensa LX6 SoC at up to 240 MHz with Wi-Fi 802.11 b/g/n and Bluetooth 4.2 BR/EDR + BLE, inside a metal RF shield with a printed antenna) sits at the top of a 27.94 x 48.26 mm blue-black PCB. Its antenna overhangs the top edge by 6.04 mm. Below it are a micro-USB socket, a USB-to-UART bridge, an AMS1117-3.3 LDO, a red "5V power on" LED, two push-buttons (EN = reset, Boot = GPIO0) and a two-transistor auto-program circuit. Two 19-pin, 2.54 mm headers, 25.40 mm apart, bring out almost every module pin [1][2][3].

> **Modelling recommendation.** Model the **official DevKitC V4 (32E)**, because Espressif publishes its schematic, layout and DXF, so every coordinate below comes from those files. It has **no user LED**; only the red power LED, which is wired to 5 V and cannot be driven by code. The Blink lesson should use an **external LED + 220-330 ohm resistor on GPIO23** (or GPIO22/GPIO21/GPIO19/GPIO18; any non-strapping output). Mention the common **"DOIT ESP32 DEVKIT V1" 30-pin clone** with a **blue LED on GPIO2** as an alternative board (see 3.9). Do not build the default lesson on GPIO2: it is a strapping pin that must be low or floating for serial download, so an LED + resistor to GND is harmless, but a pull-up or a push-button on it can stop flashing.

## 1. Sources

1. ESP32-DevKitC V4 User Guide (esp-dev-kits docs), https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html - functional overview, header tables J2/J3, power options and warning, C15 note, ordering info.
2. ESP32-DevKitC V4 dimensions, https://dl.espressif.com/dl/schematics/esp32_devkitc_v4_dimensions.pdf and the **DXF** source https://dl.espressif.com/dl/schematics/esp32_devkitc_v4_dimensions.dxf - outline 27.94 x 48.26, module 18.00 wide, 6.04 mm antenna overhang, 25.40 row spacing, 1.30/1.29 edge-to-pin, silkscreen; **all pad coordinates in section 2 were extracted from the DXF copper (TOP) layer by script** (`dxf_pads.py`, `match_pads.py`).
3. ESP32-DevKitC V4 schematic, https://dl.espressif.com/dl/schematics/esp32_devkitc_v4_sch.pdf (underscore; the file the user guide links, dated 2020-02-25). The similarly named `esp32_devkitc_v4-sch.pdf` (hyphen) and the 20180607a issue are the older 2018 drawing, which shows CP2102N-A01 and 5% divider resistors - every part value: AMS1117-3.3, BAT760-7, LESD5D5.0CT1G x3, CP2102N-A02-GQFN28, SS8050 x2, R2 2 k + red LED on EXT_5V, C15, 0R on TXD/RXD.
4. ESP32-DevKitC V4 PCB layout PDF, https://dl.espressif.com/dl/schematics/esp32_devkitc_v4_pcb_layout.pdf - designator text placed on pads; used to name each DXF pad (match residual < 0.06 mm).
5. ESP32-WROOM-32E & WROOM-32UE datasheet v2.1, https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.pdf - module size 18.0 x 25.5 x 3.1 mm, 40 MHz crystal, 3.0-3.6 V supply, strapping defaults, part numbers.
6. ESP32 Series datasheet, https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf - DC characteristics (VIH 0.75 VDD, VIL 0.25 VDD, IOH 40 mA, IOL 28 mA), absolute max, ADC/DAC/touch/LEDC.
7. esptool docs, "Boot mode selection", https://docs.espressif.com/projects/esptool/en/latest/esp32/advanced-topics/boot-mode-selection.html - DTR/RTS truth table, strapping, boot log messages.
8. esptool source v5.3.1 and v5.5.0 (github.com/espressif/esptool, files `esptool/__init__.py`, `loader.py`, `cmds.py`, `targets/esp32.py`) - exact console strings for section 5, grepped from the source this run. Latest release is **v5.6.0** (published 2026-10-15, GitHub releases API).
9. arduino-esp32 core (github.com/espressif/arduino-esp32), latest release **3.3.12** (published 2026-09-18, GitHub releases API), `variants/esp32/pins_arduino.h` (TX=1, RX=3, SDA=21, SCL=22, SS=5, MOSI=23, MISO=19, SCK=18, **no LED_BUILTIN**), `boards.txt` (`esp32.build.board=ESP32_DEV`).
10. ESP-IDF "Establish serial connection" guide, https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/establish-serial-connection.html - CP210x/CH9102 drivers, auto-reset.
11. CP2102N (Silicon Labs) - QFN28 5 x 5 mm package, 0.75 mm nominal height (Silicon Labs product page https://www.silabs.com/interface/usb-bridges/usbxpress/device.cp2102n-gqfn28 and RS Components listing 187-1341; the PDF datasheet blocked scripted download). Pin numbers below are from the schematic symbol [3]. On this board the schematic [3] ties CP2102N **VDD (pin 6) and REGIN (pin 7) both to VDD33**, so its internal regulator is not used; VBUS (pin 8) senses USB through R25 22.1 k / R26 47.5 k.
12. AMS1117 datasheet (Advanced Monolithic Systems), http://www.advanced-monolithic.com/pdf/ds1117.pdf - read this run: 1 A output, dropout 1.1 V typ / 1.3 V max at 0.8 A, current limit 900 / 1100 / 1500 mA (min/typ/max), 15 V max input, thermal shutdown at 165 C junction, quiescent 5 mA typ / 11 mA max, 22 uF output cap for stability.
13. ESP-IDF v6.1 Kconfig reference, https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/kconfig-reference.html - `CONFIG_ESP_BROWNOUT_DET_LVL_SEL` levels 0-7 (2.43 to 2.80 V, +/-0.05 V).
14. GitHub releases API (api.github.com/repos/.../releases/latest), queried 2026-10-24: ESP-IDF **v6.1** (2026-08-27), MicroPython **v1.29.0** (2026-08-24), esptool v5.6.0, arduino-esp32 3.3.12.

## 2. Geometry (board frame)

**Frame.** Component side up, silkscreen pin labels readable when the board is turned 90 degrees (they run along the long edges). **The micro-USB edge is at the bottom (y = 0)**; the module and its antenna are at the top. Origin = bottom-left corner of the PCB outline, +x right, +y up, mm. Coordinates were extracted from the DXF by script in this frame (y = 0 at the USB edge: pin 19 lands at y 1.290 exactly as the drawing's 1.29 dimension). The header columns come out at x 1.245 and 26.645, i.e. 1.245 / 1.295 mm from the side edges instead of a symmetric 1.27; treat +/-0.05 mm as the accuracy of every centre below.

### 2.1 Outline

| Item | Value |
|---|---|
| PCB | **27.94 x 48.26 mm** [2] |
| Corner radius | **1.00 mm** (the DXF outline has four 90-degree arcs, bulge 0.4142, between straight edges 25.94 and 46.26 long) [2] |
| Thickness | 1.6 mm (unverified; standard FR-4, not stated by Espressif) |
| Module overhang | the WROOM-32E's antenna end sticks **6.04 mm beyond the top edge** [2]; module spans x 5.00..23.00, y 28.80..54.30 (DXF silkscreen) |
| Overall length incl. module | 54.30 mm |
| Mounting holes | **none** (DXF has no NPTH holes) [2] |
| Solder mask | black (production boards; early V4 boards were dark blue-black). (estimated from product photos) |
| Silkscreen | white |
| Module shield | silver, laser-etched (see 2.5); module PCB is blue/black with exposed gold-plated (ENIG) antenna area at the top (estimated from photos) |

### 2.2 Headers J2 (left) and J3 (right)

| | J2 | J3 |
|---|---|---|
| x of pin column | 1.245 | 26.645 |
| Pin 1 | top, (1.245, 47.010) | top, (26.645, 47.010) |
| Pin 19 | bottom, (1.245, 1.290) | bottom, (26.645, 1.290) |
| Pitch | 2.54 mm, pins count **downwards** (pin n at y = 47.010 - 2.54 (n-1)) | same |
| Pad | round 1.55 mm copper (drill about 1.0 mm, unverified) | same |
| Pin 1 to top edge | 1.25 mm (DXF; the drawing labels this 1.30) | |
| Pin 19 to bottom edge | 1.29 mm [2] | |
| Row-to-row | **25.40 mm** [2] | |
| Fitted header | male 2.54 mm header pins pointing **down** (board plugs into a breadboard, straddling the centre channel: 25.4 mm = 10 rows), black plastic body on the underside, about 2.5 mm body + 6 mm pins below the board (estimated) |
| Overhang | none |

Note: 47.010 - 1.290 = 45.72 = 18 x 2.54. The drawing's 1.30 + 45.72 + 1.29 = 48.31, 0.05 mm more than 48.26; the DXF coordinates are self-consistent with 48.26, so trust the DXF.

### 2.3 Every placed part (centres from DXF pad centroids, rotation = long axis)

| Des | What | Package | Centre (x, y) | Orientation / footprint | Height | Colour / marking |
|---|---|---|---|---|---|---|
| U3 | ESP32-WROOM-32E-N4 module (layout PDF calls the land pattern U3/D2) | 38-pin castellated module 18.0 x 25.5 x 3.1 | (14.00, 41.55) | long axis vertical, antenna up; pins 1-14 down the left side, 15-24 along the bottom, 25-38 up the right side; GND pad 39 under the shield | 3.1 (0.8 PCB + shield) [5] | silver shield, see 2.5 |
| U1 | CP2102N-A02-GQFN28 USB-UART | QFN-28, 5 x 5 mm, 0.5 mm pitch, exposed pad | (14.00, 12.25) | pads span 11.60..16.40 x 9.85..14.65; pin 1 is the right-most pad of the top row at (15.50, 14.65), pins 1-7 run right-to-left along the top edge (0.5 mm pitch), i.e. the pin-1 dot goes at the top-right corner (layout-PDF pad names `U1x1`... matched to DXF pads, residual < 0.01 mm) | 0.75 | black, "CP2102N / A02 / date code" (marking text unverified) |
| U2 | AMS1117-3.3 LDO | SOT-223 | (14.07, 19.18) | pins 1 (GND/ADJ, top), 2 (VOUT), 3 (VIN, bottom) at x 10.92 (y 21.48, 19.18, 16.88), pads 2.05 x 1.55; **tab (pin 4 = VOUT) on the right** at (17.22, 19.18), pad 2.05 x 3.85 | 1.6-1.8 | black, "AMS1117 3.3" + lot code |
| J1 | micro-USB B receptacle (SMD, 5 pins + 4 shell tabs + 2 pegs) | | (13.95, 3.59) | signal pins at y 4.89, x 12.645 (1 VBUS), 13.295 (2 D-), 13.945 (3 D+), 14.595 (4 ID), 15.245 (5 GND); shell tabs at (10.37/17.52, 5.32) and (10.37/17.52, 1.86); locating pegs (11.945/15.945, 4.00). Opening faces **down (-y)**, the metal lip sits at about y = -0.6 (estimated from drawing) | about 2.6 | nickel-silver shell |
| SW2 | **EN** (reset) tactile switch | SMD 2-pad top-actuated tact switch, body about 3 x 6 mm (estimated from drawing; pads 5.0 mm apart) | (6.00, 3.86) | pads at y 1.36 and 6.36, 1.55 x 2.05 | about 1.5-2 (estimated) | silver/black body, silk "EN" above it |
| SW1 | **Boot** (GPIO0) tactile switch | same | (22.00, 3.86) | pads at y 1.36 and 6.36 | same | silk "Boot" above it |
| D1 | red "5V Power On" LED | 0603 (pad size match) | (6.22, 13.12) | vertical | 0.8 | clear/water lens, lights red |
| R2 | 2 k, LED resistor | 0402 | (6.22, 10.29) | vertical | 0.35 | black |
| D3 | BAT760-7 Schottky, VBUS -> EXT_5V | SOD-323 | (9.15, 8.38) | horizontal, pads x 8.09 / 10.20 | 1.0 | black, cathode band (side unverified) |
| D4, D5, D6 | LESD5D5.0CT1G ESD diodes on USB D-/D+/VBUS | SOD-523 | D6 (12.45, 7.87), D4 (13.84, 7.87), D5 (15.24, 7.87) | vertical, pads at y 7.21/8.53 | 0.6 | black |
| Q1, Q2 | SS8050 NPN, auto-program | SOT-23 | Q1 (21.59, 11.56), Q2 (21.59, 19.43) | pads x 20.62..22.56, y +/-1.15 (two pins one side, one the other) | 1.0 | black, "Y1" style marking (unverified) |
| R21, R22 | 10 k base resistors (DTR, RTS) | 0402 | R21 (18.92, 9.91), R22 (18.03, 9.91) | vertical | 0.35 | |
| R17, R18 | 0 ohm links TXD0 / RXD0 | 0402 | R17 (18.92, 14.35), R18 (18.03, 14.35) | vertical | 0.35 | |
| C15 | 0.1 uF on GPIO0 (marked NC on later schematic) | 0402 | (19.30, 6.35) | vertical | 0.5 | Espressif says remove it if the board boots into download mode [1] |
| C14 | 0.1 uF | 0402 | (8.64, 6.35) | vertical | 0.5 | |
| C1 | 22 uF/10 V, LDO input | 0805 (pads 0.97 x 0.86, estimated 0805) | (8.38, 17.40) | vertical | 1.25 | tan/brown MLCC |
| C3 | 22 uF/10 V, LDO output | 0805 | (8.38, 20.96) | vertical | 1.25 | |
| C21, C22 | module 3V3 decoupling: C21 22 uF/10 V, C22 0.1 uF/50 V [3] | 0603 / 0402 (unverified) | C21 (6.22, 20.96), C22 (6.35, 18.54) | | | values read from the schematic text next to the C21/C22 labels |
| R11, C9 | EN RC: 10 k pull-up to 3V3 + 0.1 uF to GND | 0402 | R11 (6.35, 17.53), C9 (6.35, 16.51) | horizontal | | values from schematic; designator mapping (unverified) |
| C19, C20 | CP2102N VDD/REGIN decoupling: C19 0.1 uF/50 V, C20 10 uF/10 V [3] | 0402 | C19 (9.14, 13.84), C20 (9.14, 14.73) | horizontal | | |
| R23, R24 | CP2102N-side resistors: R24 2 k fitted, **R23 10 k marked NC (not fitted)** on the schematic [3] | 0402 | R23 (9.14, 11.81), R24 (9.14, 12.83) | horizontal | | function mapping (unverified) |
| R25, R26 | 22.1 k (1%) / 47.5 k (1%) VBUS sense divider into CP2102N VBUS pin | 0402 | R25 (9.65, 10.29), R26 (8.64, 10.29) | vertical | | |

### 2.3a WROOM-32E module pins (top view, antenna up) [5]

| Side | Pins | Signals in order |
|---|---|---|
| Left (x = 5.0, top to bottom) | 1-14 | GND, 3V3, EN, SENSOR_VP (IO36), SENSOR_VN (IO39), IO34, IO35, IO32, IO33, IO25, IO26, IO27, IO14, IO12 |
| Bottom (left to right) | 15-24 | GND, IO13, **NC x 6 (pins 17-22)**, IO15, IO2. On the older ESP-WROOM-32 pins 17-22 were SD2 (IO9), SD3 (IO10), CMD (IO11), CLK (IO6), SD0 (IO7), SD1 (IO8); the WROOM-32E datasheet marks them NC: "Pins GPIO6 to GPIO11 ... are connected to the SPI flash integrated on the module and are not led out" [5] |
| Right (x = 23.0, bottom to top) | 25-38 | IO0, IO4, IO16, IO17, IO5, IO18, IO19, NC, IO21, RXD0 (IO3), TXD0 (IO1), IO22, IO23, GND |
| Underside | 39 | GND (exposed pad) |

Castellation pitch 1.27 mm. The header order on J2/J3 follows the module order (J2 = left side then the bottom-left flash pins, J3 = right side top-down then the bottom-right pins), which is why the flash pins end up at the bottom of both headers. Module pin order from the WROOM-32E datasheet pin layout [5] (order checked against the J2/J3 tables [1]; pitch 1.27 mm from the datasheet drawing, from memory).

### 2.4 Silkscreen text (exact, from the DXF/drawing [2])

- Left column, beside J2, top to bottom, rotated 90 degrees: `3V3 EN VP VN 34 35 32 33 25 26 27 14 12 GND 13 D2 D3 CMD 5V`
- Right column, beside J3, top to bottom: `GND 23 22 TX RX 21 GND 19 18 5 17 16 4 0 2 15 D1 D0 CLK`
- On the module overhang: `RF Antenna` (on the drawing only; on a real board this area is the module's own antenna, not PCB silk)
- Above the left button: `EN`; above the right button: `Boot`
- Designators are not printed on the top silk (the layout PDF's designator text is an assembly layer) [4].
- **Text orientation** (from the text direction vectors in the layout PDF [4], board frame): pin labels run vertically; the left-column labels read top-to-bottom with the tops of the letters toward the board centre (text rotated 90 deg clockwise), the right-column labels read bottom-to-top, again tops toward the centre (rotated 90 deg counter-clockwise). `EN` and `Boot` are horizontal, readable with USB at the bottom.
- **Back side (bottom silkscreen)**: the layout PDF's bottom-layer page [4] carries `ESP32_DevKitc_V4` (horizontal, mirrored as seen from the top, i.e. readable when the board is flipped) and the same 38 pin labels beside each header column. Espressif logo / CE marks on the back are (unverified).

### 2.5 Module marking (ESP32-WROOM-32E shield, typical laser etch)

`ESPRESSIF` logo, `ESP32-WROOM-32E`, FCC ID `2AC7Z-ESP32WROOM32E`, CE/other cert marks, a QR/data-matrix code and the `N4` variant line. (Exact layout unverified; use a product photo.)

## 3. Electrical

### 3.1 SoC
- ESP32-D0WD-V3 (chip revision v3.0/v3.1), dual-core Xtensa LX6, 80-240 MHz; 520 KB SRAM, 448 KB ROM; 40 MHz crystal inside the module [5][6].
- 4 MB quad-SPI flash inside the module, on GPIO6-11, which are **not brought out of the WROOM-32E** (module pins 17-22 are NC) [5].
- Wi-Fi 802.11 b/g/n 2.4 GHz, Bluetooth v4.2 BR/EDR + BLE [5].

### 3.2 Power tree [1][3]
Three mutually exclusive inputs; Espressif warns: "The power supply must be provided using one and only one of the options above, otherwise the board and/or the power supply source can be damaged." [1]

| Input | Path | Protection |
|---|---|---|
| Micro-USB VBUS (default) | VBUS -> **D3 BAT760-7 Schottky** -> EXT_5V | D3 blocks back-feed from the 5V pin into the PC; D5 ESD diode on VBUS |
| 5V header pin (J2-19) | directly on EXT_5V (after D3) | **none**: no reverse diode, no fuse |
| 3V3 header pin (J2-1) | directly on VDD33 (bypasses the LDO) | none |

- EXT_5V -> **U2 AMS1117-3.3** (VIN pin 3) -> VDD33 (pins 2 + tab 4), with 22 uF in (C1) and 22 uF out (C3) [3]. AMS1117 [12]: 1 A rated; current limit 900 mA min / 1.1 A typ / 1.5 A max; dropout 1.1 V typ, 1.3 V max at 0.8 A (so 3.3 V out needs about 4.4-4.6 V in; from USB, VBUS 5.0 V minus the BAT760 drop (Diodes datasheet: 0.32 V typ at 100 mA, 0.495 V typ / 0.55 V max at 1 A, so about 0.35-0.4 V at a few hundred mA) leaves about 4.6 V, just enough); 15 V absolute max input; thermal shutdown at 165 C junction; 5-11 mA quiescent. Dissipation is (Vin - 3.3) x I: from USB at 300 mA that is about 0.4 W, so the SOT-223 feels warm; above about 500 mA it gets hot.
- The module needs 3.0-3.6 V and a supply able to give **at least 500 mA** (0.5 A minimum, Table 14) [5]. Wi-Fi TX at 802.11b 1 Mbps, 19.5 dBm draws **239 mA average, 379 mA peak**; 802.11g 54 Mbps 190 / 276 mA; RX about 112-118 mA (Table 16) [5].
- The CP2102N is powered from VDD33 (its VDD pin), with VBUS sensed via the 22.1 k / 47.5 k divider [3].
- **No polyfuse** anywhere on the board. Over-current protection is only the PC's USB port limit and the LDO's internal limit.

### 3.3 Logic levels and current
- **3.3 V logic. Not 5 V tolerant** (absolute max on any I/O is VDD + 0.3 V) [6].
- VIH min 0.75 x VDD (2.475 V), VIL max 0.25 x VDD (0.825 V) [6].
- Absolute max supply (VDD3P3, VDD3P3_RTC, VDD3P3_CPU, VDD_SDIO, VDDA): -0.3 to **3.6 V** [6]. Input pin max VDD + 0.3 V (VIH row of Table 5-3) [6].
- IOH (source) **40 mA** per pin at VOH >= 2.64 V with drive strength at maximum, for VDD3P3_CPU / VDD3P3_RTC domain pads; **20 mA** on VDD_SDIO domain pads (GPIO6-11, 16, 17). Datasheet note: per-pin source current falls "from around 40 mA to around 29 mA" as more pins in the same domain source at once (VDD_SDIO: 30 mA down to 10 mA) [6]. IOL (sink) **28 mA** at VOL 0.495 V [6].
- Drive strength per pin (FUN_DRV): 0 = ~5 mA, 1 = ~10 mA, **2 = ~20 mA (default)**, 3 = ~40 mA [6]. Internal pull-up / pull-down: 45 kohm typ (~75 uA) [6].
- **Cumulative IO output current: 1200 mA absolute max** for the chip [6]. In practice the 3V3 rail (AMS1117, about 1 A, and the USB port's 500 mA) is the real limit.
- CHIP_PU (EN) reset: chip shuts down below VIL_nRST 0.6 V [6].
- Good practice for lessons: keep each pin at 12 mA or less and use 220-330 ohm for LEDs.

### 3.4 Peripherals
- **ADC**: two SAR ADCs, 12-bit, 18 channels on the chip. ADC1 = GPIO32-39 (8 ch); **ADC2 = GPIO0, 2, 4, 12-15, 25-27 (10 ch) and cannot be used while Wi-Fi is on** [6]. Default attenuation in Arduino is 11 dB (`ADC_11db`, called `ADC_ATTEN_DB_12` in ESP-IDF 5+) and default resolution 12 bits (0-4095) [9]. At that attenuation the datasheet's calibrated effective range is **150-2450 mV** (total error +/-60 mV); above about 2450 mV (raw ~3000) accuracy gets worse and the reading saturates at 4095 at roughly 3.1 V (saturation point unverified) [6]. Reference is an internal 1.1 V nominal Vref (factory eFuse calibrated on V3 chips).
- **DAC**: 2 x 8-bit, GPIO25 (DAC_1) and GPIO26 (DAC_2) [1][6].
- **Touch**: 10 capacitive channels: T0 GPIO4, T1 GPIO0, T2 GPIO2, T3 GPIO15, T4 GPIO13, T5 GPIO12, T6 GPIO14, T7 GPIO27, T8 GPIO33, T9 GPIO32 [1][6].
- **PWM**: LEDC, 16 channels, up to 20-bit resolution (frequency x 2^bits <= 80 MHz APB clock), any output-capable GPIO; MCPWM x 2 for motors [6].
- UART x 3 (UART0 = GPIO1/3 to the USB bridge), I2C x 2 (Arduino default SDA 21 / SCL 22), SPI: VSPI default SCK 18 / MISO 19 / MOSI 23 / SS 5 [9]; I2S x 2; CAN (TWAI); SD/SDIO; Ethernet MAC; IR (RMT) [6].
- **Hall sensor** existed on the ESP32 die (removed from Arduino core 3.x / ESP-IDF 5 APIs); internal temperature sensor not supported on the original ESP32 in current IDF (unverified).

### 3.5 Auto-program circuit [3][7]
Two SS8050 NPN (Q1, Q2), 10 k base resistors R21 (DTR) / R22 (RTS), cross-coupled: Q1 pulls **EN** low when DTR=1 and RTS=0; Q2 pulls **IO0** low when DTR=0 and RTS=1. Schematic truth table "DTR RTS --> EN IO0": 1 1 -> 1 1; 0 0 -> 1 1; 1 0 -> 0 1; 0 1 -> 1 0 [3]. esptool toggles these to hold GPIO0 low while releasing EN, entering the ROM download mode without pressing a button. EN also has a 10 k pull-up + 0.1 uF RC delay (R11?/C9).

### 3.6 USB-serial chip
- Official schematic: **CP2102N-A02-GQFN28**, USB 2.0 full-speed, up to 3 Mbps [1][3]. VID:PID 10C4:EA60. Windows needs the Silicon Labs CP210x VCP driver on older systems; macOS shows `/dev/cu.SLAB_USBtoUART` (with SiLabs driver) or `/dev/cu.usbserial-XXXX` (Apple driver).
- Later lots: **CH9102F** (WCH, QFN-24), VID:PID 1A86:55D4, port `/dev/cu.wchusbserial*` or `/dev/cu.usbmodem*`; This swap is widely reported (chip-shortage era) but this run found no Espressif PCN or updated schematic for it (unverified). Adafruit calls the CH9102F "near pin-compatible" with the CP2102N; on Linux the kernel driver does not support CTS, which does not matter for auto-reset (DTR/RTS) (learn.adafruit.com/how-to-install-drivers-for-wch-usb-to-serial-chips-ch9102f-ch9102). Pinout and behaviour of the board are unchanged. The ESP-IDF serial guide lists both drivers [10].

### 3.7 LEDs
| Des | Colour | Net | Active | Driven by |
|---|---|---|---|---|
| D1 | red | EXT_5V via R2 2 k to GND | on whenever 5 V is present (USB or 5V pin) | hardware only (about 1.5 mA) |
No user LED. No TX/RX LEDs.

### 3.8 Buttons
| Des | Silk | Net | Active | Function |
|---|---|---|---|---|
| SW2 (left) | EN | EN / CHIP_PU | low | reset (chip power-down while held) |
| SW1 (right) | Boot | IO0 | low | hold Boot, tap EN -> serial download mode; also usable as a user button on GPIO0 after boot (`INPUT_PULLUP`) |

### 3.9 The common clone: "DOIT ESP32 DEVKIT V1" (30-pin)
(all unverified against a primary source; DOIT publishes no schematic)
- 30 pins (2 x 15), row spacing 25.4 mm on most lots (some are 22.86 mm and do not fit a single breadboard), board about 51-52 x 28 mm.
- Same ESP-WROOM-32 / WROOM-32E module, AMS1117-3.3, CP2102 or CH340C bridge, buttons labelled EN and BOOT.
- **Red power LED + blue LED on GPIO2 (active high)**. Board pins: left `EN VP VN D34 D35 D32 D33 D25 D26 D27 D14 D12 D13 GND VIN`, right `D23 D22 TX0 RX0 D21 D19 D18 D5 TX2 RX2 D4 D2 D15 GND 3V3`. GPIO6-11 are not brought out.
- "VIN" pin feeds the AMS1117 input (same as DevKitC 5V).

## 4. Pinout (as printed; from [1], functions from [1][6])

### J2 (left), pin 1 at top (next to the module)

| # | Silk | Function | Notes |
|---|---|---|---|
| 1 | 3V3 | 3.3 V power | LDO output; input only if USB/5V absent |
| 2 | EN | CHIP_PU, reset | pulled up, low = reset |
| 3 | VP | GPIO36, ADC1_CH0, S_VP | **input only**, no pull-ups |
| 4 | VN | GPIO39, ADC1_CH3, S_VN | **input only** |
| 5 | 34 | GPIO34, ADC1_CH6, VDET_1 | **input only** |
| 6 | 35 | GPIO35, ADC1_CH7, VDET_2 | **input only** |
| 7 | 32 | GPIO32, ADC1_CH4, TOUCH9, XTAL_32K_P | |
| 8 | 33 | GPIO33, ADC1_CH5, TOUCH8, XTAL_32K_N | |
| 9 | 25 | GPIO25, ADC2_CH8, **DAC_1** | |
| 10 | 26 | GPIO26, ADC2_CH9, **DAC_2** | |
| 11 | 27 | GPIO27, ADC2_CH7, TOUCH7 | |
| 12 | 14 | GPIO14, ADC2_CH6, TOUCH6, MTMS (JTAG) | outputs a brief signal at boot (secondary sources such as Random Nerd Tutorials; unverified against Espressif) |
| 13 | 12 | GPIO12, ADC2_CH5, TOUCH5, MTDI | **strapping: VDD_SDIO voltage; must be low at reset** (high = 1.8 V flash -> boot fails / flash brown-out) |
| 14 | GND | ground | |
| 15 | 13 | GPIO13, ADC2_CH4, TOUCH4, MTCK | |
| 16 | D2 | (GPIO9, flash SD2 on WROOM-32) | **never use.** On the WROOM-32E these module pins are NC (see note below the table) |
| 17 | D3 | (GPIO10, flash SD3 on WROOM-32) | **never use.** On the WROOM-32E these module pins are NC (see note below the table) |
| 18 | CMD | (GPIO11, flash CMD on WROOM-32) | **never use.** On the WROOM-32E these module pins are NC (see note below the table) |
| 19 | 5V | 5 V (EXT_5V) | after D3; input here has no protection |

### J3 (right), pin 1 at top

| # | Silk | Function | Notes |
|---|---|---|---|
| 1 | GND | ground | |
| 2 | 23 | GPIO23, VSPI MOSI | good Blink pin |
| 3 | 22 | GPIO22, I2C SCL (Arduino default) | |
| 4 | TX | GPIO1, U0TXD | to bridge RXD via R17 0R; prints boot log |
| 5 | RX | GPIO3, U0RXD | from bridge TXD via R18 0R |
| 6 | 21 | GPIO21, I2C SDA (Arduino default) | |
| 7 | GND | ground | |
| 8 | 19 | GPIO19, VSPI MISO | |
| 9 | 18 | GPIO18, VSPI SCK | |
| 10 | 5 | GPIO5, VSPI SS | **strapping** (SDIO timing), pulled up; outputs a brief signal at boot (secondary source, unverified) |
| 11 | 17 | GPIO17, U2TXD | used for PSRAM on WROVER boards [1] |
| 12 | 16 | GPIO16, U2RXD | used for PSRAM on WROVER boards [1] |
| 13 | 4 | GPIO4, ADC2_CH0, TOUCH0 | |
| 14 | 0 | GPIO0, ADC2_CH1, TOUCH1, **Boot** | **strapping: low at reset = download mode**; wired to Boot button, C15, Q2 |
| 15 | 2 | GPIO2, ADC2_CH2, TOUCH2 | **strapping**: must be low/floating for download mode (internal pull-down) |
| 16 | 15 | GPIO15, ADC2_CH3, TOUCH3, MTDO | **strapping**: low at reset silences the ROM boot log on U0TXD; pulled up |
| 17 | D1 | (GPIO8, flash SD1 on WROOM-32) | **never use.** On the WROOM-32E these module pins are NC (see note below the table) |
| 18 | D0 | (GPIO7, flash SD0 on WROOM-32) | **never use.** On the WROOM-32E these module pins are NC (see note below the table) |
| 19 | CLK | (GPIO6, flash CLK on WROOM-32) | **never use.** On the WROOM-32E these module pins are NC (see note below the table) |

**Flash pins (D0-D3, CMD, CLK).** Espressif's user guide [1] labels these GPIO6-11 and says: "The pins D0, D1, D2, D3, CMD and CLK are used internally for communication between ESP32 and SPI flash memory. They are grouped on both sides near the USB connector. Avoid using these pins, as it may disrupt access to the SPI flash memory/SPI RAM." The WROOM-32E datasheet [5] marks module pins 17-22 as NC and says GPIO6-11 "are not led out". The two agree on the rule (never use them); they differ on whether the header pins are wired. Trust the module datasheet for the 32E: on a DevKitC-32E these six header pins should be electrically unconnected (the board PCB still has the traces/pads from the WROOM-32 era). Not checked by continuity test (unverified). For the simulator: draw them, label them, and make them do nothing.

Strapping defaults [5]: GPIO0 pull-up (1 = SPI boot), GPIO2 pull-down, MTDI/GPIO12 pull-down (0 = 3.3 V VDD_SDIO), MTDO/GPIO15 pull-up, GPIO5 pull-up. Boot mode: GPIO0=1 -> run from flash; GPIO0=0 and GPIO2=0 -> serial download. Not broken out: GPIO37/38 (not bonded on WROOM), GPIO20/24/28-31 (do not exist). GPIO 34-39 have no output driver and no internal pull-up/down.

## 5. Programming

- **Arduino**: Boards Manager package "esp32 by Espressif Systems", **3.3.x** (repo `package.json` 3.3.12 at time of research) [9]; board "ESP32 Dev Module" (`esp32:esp32:esp32`), or "ESP32 Wrover Module" for PSRAM boards. Core 3.x is based on ESP-IDF 5.x (3.3.x on the 5.5 line, unverified).
- **ESP-IDF**: latest release **v6.1** (2026-08-27) [14]; v5.5 is the previous stable line and is what Arduino core 3.3 builds on. `idf.py set-target esp32`, `idf.py -p PORT flash monitor` (monitor exits with Ctrl+]).
- **MicroPython**: latest release **v1.29.0** (2026-08-24) [14], board image `ESP32_GENERIC` (micropython.org/download/ESP32_GENERIC), flashed with `esptool --chip esp32 write-flash -z 0x1000 firmware.bin` (offset **0x1000** on the original ESP32).
- **esptool**: latest release **v5.6.0** (2026-10-15) [14]; strings below checked in the 5.3.1 and 5.5.0 sources [8]. Arduino IDE uses the esptool bundled with the core (`tools/esptool_py`), so its version lags the PyPI release. In v5 the commands are hyphenated (`write-flash`, `erase-flash`, `chip-id`); underscores still accepted.

Upload log (esptool v5 strings from source [8]; numbers are illustrative of a DevKitC-32E):
```
esptool v5.x
Serial port /dev/cu.usbserial-0001:
Connecting....
Connected to ESP32 on /dev/cu.usbserial-0001:
Chip type:          ESP32-D0WD-V3 (revision v3.1)
Features:           Wi-Fi, BT, Dual Core + LP Core, 240MHz, Vref calibration in eFuse, Coding Scheme None
Crystal frequency:  40MHz
MAC:                xx:xx:xx:xx:xx:xx

Uploading stub flasher...
Running stub flasher...
Stub flasher running.
Changing baud rate to 921600...
Changed.

Configuring flash size...
Flash will be erased from 0x00001000 to 0x00007fff...
...
Wrote 289456 bytes (162001 compressed) at 0x00010000 in 2.4 seconds (976.3 kbit/s).
Hash of data verified.

Hard resetting via RTS pin...
```
(Every line above is a literal string in esptool v5.3.1 / v5.5.0 source [8], including `Connected to {chip} on {port}:` and the ESP32 feature list `Wi-Fi, BT, Dual Core + LP Core, 240MHz, Vref calibration in eFuse, Coding Scheme None` from `targets/esp32.py` (the "LP Core" is the ULP co-processor). The first line is `esptool v5.x.y`. Byte counts, speed and MAC are illustrative. esptool 4.x printed the older form `Chip is ESP32-D0WD-V3 (revision v3.1)` / `Features: WiFi, BT, Dual Core, 240MHz, VRef calibration in efuse, Coding Scheme None` / `Hard resetting via RTS pin...`; Arduino IDE builds older than core 3.1 show that form.)
If auto-reset fails you see `Connecting......._____.....` then `A fatal error occurred: Failed to connect to ESP32: No serial data received.` Fix: hold **Boot**, start upload, release when "Connecting" appears (or remove C15).

ROM boot log at 115200 baud after reset (flash boot):
```
ets Jul 29 2019 12:21:46
rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
configsip: 0, SPIWP:0xee
...
entry 0x400805xx
```
The first line is the ROM build date. The esptool docs' example [7] shows `ets Jun  8 2016 00:22:57` (rev 0/1 ROM); the rev v3 die in the WROOM-32E prints `ets Jul 29 2019 12:21:46` (seen in user boot logs from WROOM-32E boards, e.g. https://esp32.com/viewtopic.php?p=98039; no Espressif document states it). `boot:0x13` decodes as GPIO_STRAP bits [MTDI, GPIO0, GPIO2, GPIO4, MTDO, GPIO5] = 0,1,0,0,1,1, matching the default pulls [5]; `boot:0x3` is the same with GPIO0 low. `boot:0x13` = strapping value with GPIO0 high (SPI flash boot); `entry 0x...` is the second-stage bootloader entry (exact address varies by build).
In download mode: `rst:0x1 (POWERON_RESET),boot:0x3 (DOWNLOAD_BOOT(UART0/UART1/SDIO_REI_REO_V2))` then `waiting for download`. Brown-out: `Brownout detector was triggered` then a reset loop.

Factory firmware: ships with a test/AT-style firmware that prints a boot log; no LED pattern (no user LED). (exact factory image unverified)

## 6. Failure modes

| Fault | What happens | Observed |
|---|---|---|
| Reverse polarity on 5V pin (5V pin at -V, GND at +V) | No reverse diode on EXT_5V. Paths that conduct: (a) GND -> D5 (LESD5D5.0 on VBUS, forward-biased) -> VBUS -> D3 BAT760 (forward-biased) -> EXT_5V: two diodes in series almost short the supply; (b) the AMS1117 sees negative VIN, so 3V3 is pulled below GND through the regulator and every chip's substrate/ESD diodes; (c) D1 red LED is reverse-biased (no light, LEDs are only rated about 5 V reverse). D3/D5 and the AMS1117 are the parts that usually die; a bench supply goes into current limit. If USB is also plugged in, the PC's VBUS is shorted through D3 (analysis from the schematic [3], not tested) | no red LED, supply current-limits, D3 / U2 hot within seconds, possible burning smell; board may be dead |
| Reverse polarity on 3V3 pin | module ESD diodes conduct, ESP32 and CP2102N fail | hot module, no USB enumeration |
| Reverse on USB | not possible with a keyed micro-B | |
| Over-voltage on 5V pin | AMS1117 tolerates up to 15 V in but dissipates (Vin-3.3) x I; at 12 V and 200 mA = 1.7 W -> thermal shutdown/cycling. C1 is 10 V rated, so >10 V risks the capacitor | hot regulator, resets |
| Over-voltage on 3V3 pin | >3.6 V stresses the module; 5 V on 3V3 kills the ESP32 and flash | chip hot, dead |
| Brown-out | BOD levels (ESP-IDF `CONFIG_ESP_BROWNOUT_DET_LVL_SEL_0..7`): 2.43, 2.48, 2.58, 2.62, 2.67, 2.70, 2.77, 2.80 V, each +/-0.05 V, which Espressif calls estimates [13]; level 0 (2.43 V) is the IDF default and the Arduino core's setting (Arduino setting unverified); Wi-Fi start-up current on a weak USB cable or long breadboard wires sags 3V3 | "Brownout detector was triggered" in the serial monitor, repeated resets as soon as `WiFi.begin()` runs |
| Over-current on a GPIO | ~40 mA source limit; driving a motor or LED without resistor overstresses the pad | pin damaged (stuck or weak), sometimes the whole chip |
| Over-current on 3V3 rail | AMS1117 limit about 1 A, thermal shutdown; USB port limit 500 mA | regulator hot, brown-out resets, PC "USB device drew too much power" |
| Cold solder joint on headers | intermittent contact | flicker, random resets, sensor reads 0/4095 |
| 5 V into a 3.3 V GPIO | exceeds VDD+0.3 V abs max; current flows through the ESD clamp to 3V3 | may "work" for a while, then the pin or chip dies; 3V3 rail can rise; never do it (use a level shifter or divider) |
| Shorting 5V to GND | USB port's over-current protection trips (or PC disconnects the hub); with an unprotected supply the trace/D3 heats; no fuse on the board | red LED off, PC USB warning, board drops off |
| Using GPIO6-11 | in code: `pinMode(6..11)` reconfigures the flash bus pins inside the module | instant crash / Guru Meditation, `flash read err`, reset loop. On a WROOM-32 (older) board, wiring to the D0-D3/CMD/CLK header pins also disturbs the flash; on a WROOM-32E board those header pins are not connected [5] |
| GPIO12 pulled high at boot | VDD_SDIO set to 1.8 V, flash under-powered | boot loop, `flash read err, 1000` |
| GPIO0 held low (button, sensor, C15) | boots to download mode | "waiting for download", sketch does not run |
| ADC2 with Wi-Fi | ADC2 reads fail | `analogRead` returns error/0 on 25/26/27/14/12/13/4/0/2/15 once Wi-Fi is up |
| Two power sources at once (USB + 3V3 pin) | back-feeds the LDO output / the supply | warned against by Espressif [1] |
| Charge-only USB cable | no data lines | board powers (red LED) but no port appears |

## 7. Lesson facts

Hardware: DevKitC V4 on a breadboard. The 25.4 mm (10-hole) row spacing straddles the centre channel but leaves only one free hole per column on one side of a standard 830-point breadboard (unverified per breadboard model); many users put it across two breadboards or use jumper wires.

1. **Blink / digital out** - external LED (anode via 220-330 ohm) on **GPIO23**, cathode to GND.
```cpp
const int LED_PIN = 23;           // DevKitC V4 has no LED_BUILTIN
void setup() { pinMode(LED_PIN, OUTPUT); }
void loop() { digitalWrite(LED_PIN, HIGH); delay(500); digitalWrite(LED_PIN, LOW); delay(500); }
```
MicroPython:
```python
from machine import Pin
import time
led = Pin(23, Pin.OUT)
while True:
    led.value(not led.value()); time.sleep_ms(500)
```
DOIT clone variant: `const int LED_PIN = 2;` (blue LED, active high).

2. **Button + sensor** - use the on-board **Boot button on GPIO0** (`pinMode(0, INPUT_PULLUP)`, pressed = LOW) or an external button on GPIO4/GPIO13 to GND with `INPUT_PULLUP`; touch sensor `touchRead(T0)` = GPIO4 (value drops when touched); analog sensor (pot/LDR) on **GPIO34** (ADC1, input-only, works with Wi-Fi): `analogRead(34)` returns 0-4095, `analogReadMilliVolts(34)` returns calibrated mV.

3. **PWM / analog out** - Arduino core 3.x LEDC API: `ledcAttach(pin, freq, resolution)` and `ledcWrite(pin, duty)` (pin-based; the 2.x `ledcSetup/ledcAttachPin` were removed). Also `analogWrite(pin, 0-255)` works. Example: `ledcAttach(23, 5000, 8); ledcWrite(23, 128);`. DAC: `dacWrite(25, 0-255)` -> 0-~3.3 V on GPIO25/26. MicroPython: `PWM(Pin(23), freq=5000, duty_u16=32768)`, `DAC(Pin(25)).write(128)`.

4. **Wi-Fi / protocol** - `#include <WiFi.h>`, `WiFi.mode(WIFI_STA); WiFi.begin(ssid, pass); while (WiFi.status() != WL_CONNECTED) delay(250); Serial.println(WiFi.localIP());` then a `WebServer` (library bundled with the core) to toggle the GPIO23 LED. I2C option: `Wire.begin()` uses SDA 21 / SCL 22; BLE: `BLEDevice` (bundled; NimBLE-Arduino as alternative). Serial monitor 115200 baud. Use ADC1 pins only once Wi-Fi is on.

## 8. Internals (for the see-through view)

- **WROOM-32E module**: a 4-layer (unverified) module PCB under a stamped metal RF shield. Under the shield: the **ESP32-D0WD-V3 die in a 5 x 5 mm QFN-48** (gold or copper bond wires from the die pads to the lead frame, exposed ground paddle), a **40 MHz quartz crystal** in a 4-pad ceramic SMD can (an AT-cut quartz blank, silver electrodes, sealed under a metal lid), an **8-pin SPI NOR flash** (4 MB, e.g. a GigaDevice/XMC/Zbit WSON/USON die, vendor varies), an RF matching network (small 0201 L/C), and decoupling capacitors [5]. Outside the shield: the **meandered PCB inverted-F antenna** etched in copper at the top end, with no ground copper beneath it (which is why the antenna overhangs the board).
- **CP2102N**: single die with an internal oscillator (no crystal on the board), internal voltage regulator (unused here, VDD and REGIN tied to 3V3 [3]), USB transceiver, UART and a one-time-programmable config/serial-number store; QFN-28 with exposed paddle.
- **AMS1117-3.3**: bipolar linear regulator die on the SOT-223 tab (tab = VOUT, also the heatsink), bandgap reference + PNP/NPN pass transistor, thermal and current limit.
- **BAT760**: Schottky metal-semiconductor junction die in SOD-323.
- **SS8050**: small NPN die in SOT-23.
- **Tactile switches**: stainless dome snapping onto two contacts under a plastic plunger.
- **Micro-USB**: stamped phosphor-bronze contacts in a plastic tongue inside a sheet-metal shell.

## 9. Assembly and power-up

- Manufacture: all top-side parts SMD, reflow soldered (module is a castellated SMD placed like a big chip). Header pins are through-hole, often **shipped loose or wave/hand soldered last**; Espressif sells it with headers fitted (estimated). No socketed parts. Back side has no components (DXF BOTTOM layer has only header pads; verify).
- Power-up via USB: VBUS -> D3 -> EXT_5V, **red LED D1 lights immediately**; AMS1117 brings up 3V3; the PC enumerates the CP2102N ("CP2102N USB to UART Bridge Controller") and creates a serial port; EN RC releases the ESP32 after a few ms; ROM prints the boot log at 115200 baud on TX; the bootloader loads the app from flash at 0x10000.
- Pressing EN: chip resets, log repeats. Holding Boot while tapping EN: `waiting for download`.
- No LED changes on reset or upload (no TX/RX LEDs).

## 10. Uncertainties

- CH9102F changeover: PCN number/date and fraction of boards not verified; the official schematic still shows CP2102N.
- PCB thickness (1.6 mm), solder-mask colour, header drill size: not in Espressif's drawings. (Corner radius is now confirmed as 1.00 mm from the DXF arcs.)
- Designator-to-function for R11/C9, R23/R24, C21/C22 is inferred from schematic values near those labels, not traced.
- CP2102N pin-1 corner comes from matching the layout PDF's pad names to DXF pads (29 of 29 matched); the chip's printed dot was not checked on a photo.
- Header pins D0-D3/CMD/CLK on a DevKitC-32E: the WROOM-32E datasheet says GPIO6-11 are not led out (module pins 17-22 NC), the DevKitC guide still lists them as GPIO6-11. Not checked with a meter.
- CH9102F: a web search this run found no Espressif PCN; the claim rests on retailer listings and user reports (unverified). Model the CP2102N from the schematic.
- ROM banner date for rev v3 silicon (`ets Jul 29 2019 12:21:46`) rests on user boot logs, not an Espressif document; the back-side logo is from memory (unverified).
- AMS1117 figures and BOD levels were re-read this run [12][13]; the BAT760 forward drop is now from the Diodes Inc. datasheet DS30498 (https://www.diodes.com/assets/Datasheets/ds30498.pdf).
- esptool v5 strings were grepped from source; byte counts, timings and MAC in the log are illustrative. Release versions are from the GitHub API on 2026-10-24 [14].
- DOIT DEVKIT V1 clone details have no primary source (no published schematic).
- Module marking layout and back-side silkscreen text not verified against a photo.

## Verification

Adversarial fact-check, 2026-10-24 (14:00-14:10 CDT). Each claim was re-checked against a freshly downloaded primary source; the researcher's own extracted text files were not reused.

| # | Claim | Status | Source | Old -> new (corrections) |
|---|---|---|---|---|
| 1 | PCB 27.94 x 48.26 mm, module 18.00 wide, antenna overhang 6.04, row spacing 25.40, edge-to-pin 1.30 / 1.29 | confirmed | https://dl.espressif.com/dl/schematics/esp32_devkitc_v4_dimensions.pdf (all six numbers in the drawing text) | |
| 2 | Corner radius | corrected | https://dl.espressif.com/dl/schematics/esp32_devkitc_v4_dimensions.dxf (outline LWPOLYLINE arcs, bulge 0.4142 = 90 deg, 1.00 mm chord legs) | "about 1.0 mm, estimated; DXF has no dimension" -> "1.00 mm from the DXF arcs" |
| 3 | Part placement: EN (SW2) left and Boot (SW1) right of J1 at the USB edge; Q1 below Q2 on the right; D1 above R2 on the left; U2 above U1; U3 at the top | confirmed (relative layout; absolute DXF centres not re-derived) | https://dl.espressif.com/dl/schematics/esp32_devkitc_v4_pcb_layout.pdf (designator text positions; SW1-SW2 spacing 16.0 mm matches) | |
| 4 | J2 / J3 header pin order (19 + 19, pin 1 at the module end, J3-7 = GND, flash pins at the USB end) | confirmed | https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html and schematic J2/J3 nets | |
| 5 | WROOM-32E module 18.0 x 25.5 x 3.1 mm (32UE 18.0 x 19.2 x 3.2), ESP32-D0WD-V3, 40 MHz crystal, 3.0-3.6 V | confirmed | https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.pdf (v2.1) | |
| 6 | WROOM-32E module pins 17-22 and 32 are NC; GPIO6-11 "not led out" | confirmed | WROOM-32E datasheet v2.1, pin table and note 2 | |
| 7 | Bridge chip CP2102N-A02-GQFN28; schematic citation | corrected (citation) | https://dl.espressif.com/dl/schematics/esp32_devkitc_v4_sch.pdf (2020-02-25, linked by the user guide) | cited URL `esp32_devkitc_v4-sch.pdf` is the 2018 issue and reads CP2102N-**A01**; values on the sheet match the 2020 `_sch.pdf`; header and source 3 now say so |
| 8 | CH9102F on later lots | unverified | web search found no Espressif PCN (https://www.cnx-software.com/2021/09/14/ch9102f-a-replacement-for-cp2104-usb-to-uart-bridge/ is third-party background only) | already marked unverified |
| 9 | USB IDs CP2102N 10C4:EA60, CH9102 1A86:55D4 | confirmed | Linux drivers/usb/serial/cp210x.c (`USB_DEVICE(0x10C4, 0xEA60)`); https://treexy.com/products/driver-fusion/database/ports-com-lpt-serial/qinheng-electronics-wch/usb-serial-ch9102/ (USB\VID_1A86&PID_55D4) | |
| 10 | CP2102N package QFN28 5 x 5 mm; height | corrected | https://www.silabs.com/interface/usb-bridges/usbxpress/device.cp2102n-gqfn28 ; https://uk.rs-online.com/web/p/usb-interface-ics/1871341 (5 x 5 x 0.75 mm) | height 0.85 -> 0.75 mm; "from memory, unverified" -> sourced |
| 11 | Power parts: AMS1117-3.3, C1/C3 22 uF/10 V, D3 BAT760-7, D4-D6 LESD5D5.0CT1G, R2 2 k + RED LED on EXT_5V, R25 22.1 k / R26 47.5 k (1%), R23 10 k NC, C15 0.1 uF NC, C19 0.1 uF/50 V, C20 10 uF/10 V, CP2102N VDD pin 6 / REGIN pin 7 / VBUS pin 8 | confirmed | esp32_devkitc_v4_sch.pdf (2020) | |
| 12 | C21 / C22 values | corrected | esp32_devkitc_v4_sch.pdf (value text sits in the same columns as the C21 / C22 labels) | "10 uF? / 0.1 uF, values unverified" -> C21 22 uF/10 V, C22 0.1 uF/50 V |
| 13 | Auto-program: Q1/Q2 SS8050, R21/R22 10 k, truth table DTR RTS -> EN IO0 = 11->11, 00->11, 10->01, 01->10 | confirmed | esp32_devkitc_v4_sch.pdf "Auto program" table | |
| 14 | AMS1117: 1 A, dropout 1.1 typ / 1.3 max at 0.8 A, current limit 900 / 1100 / 1500 mA, 15 V max in, 165 C shutdown, Iq 5 / 11 mA, 22 uF output cap, SOT-223 pin 1 GND/ADJ, 2 VOUT, 3 VIN, tab VOUT | confirmed | http://www.advanced-monolithic.com/pdf/ds1117.pdf | |
| 15 | BAT760 forward drop "about 0.3-0.4 V (from memory)" | corrected (refined) | https://www.diodes.com/assets/Datasheets/ds30498.pdf (VF 270 mV max at 10 mA, 320 typ / 350 max at 100 mA, 495 typ / 550 max at 1 A) | "0.3-0.4 V from memory" -> datasheet values |
| 16 | Module supply >= 500 mA; Wi-Fi TX current | corrected | WROOM-32E datasheet v2.1 Tables 14 and 16 | "TX peaks about 240-380 mA" -> 239 mA average / 379 mA peak (802.11b 1 Mbps 19.5 dBm); 240 was the average, not a peak |
| 17 | DC levels: VIH 0.75 VDD, VIL 0.25 VDD, IOH 40 mA (20 mA VDD_SDIO), IOL 28 mA at 0.495 V, 40 -> 29 mA and 30 -> 10 mA derating notes, RPU/RPD 45 k, VIL_nRST 0.6 V, abs max -0.3..3.6 V, cumulative IO 1200 mA, drive strength 0-3 = 5/10/20/40 mA default 2, pull ~75 uA | confirmed | WROOM-32E datasheet Table 15; https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf (v5.3) Tables 5-1, 5-3 and IO_MUX notes | |
| 18 | Strapping defaults GPIO0 up, GPIO2 down, MTDI down, MTDO up, GPIO5 up; GPIO2 must be low/floating for download; MTDO low silences ROM log; MTDI high = 1.8 V VDD_SDIO | confirmed | WROOM-32E datasheet Table "Strapping Pins"; https://docs.espressif.com/projects/esptool/en/latest/esp32/advanced-topics/boot-mode-selection.html | |
| 19 | ADC: Arduino default 11 dB / 12-bit; usable range | corrected | arduino-esp32 `cores/esp32/esp32-hal-adc.h` ("Default is 11db", 12 bit); ESP32 datasheet Table 4-4 (atten 3: 150-2450 mV, +/-60 mV) | "0-~3.1 V usable, nonlinear above 2.5-3.1 V" -> calibrated range 150-2450 mV, saturation near 3.1 V unverified |
| 20 | Touch T0-T9 = GPIO 4, 0, 2, 15, 13, 12, 14, 27, 33, 32; DAC1/2 = 25/26; no LED_BUILTIN; TX 1, RX 3, SDA 21, SCL 22, SS 5, MOSI 23, MISO 19, SCK 18 | confirmed | https://raw.githubusercontent.com/espressif/arduino-esp32/master/variants/esp32/pins_arduino.h | |
| 21 | Arduino core 3.3.12, board "ESP32 Dev Module", `esp32.build.board=ESP32_DEV`, 921600 upload speed option; API `ledcAttach(pin, freq, resolution)`, `ledcWrite(pin, duty)`, `analogWrite`, `analogReadMilliVolts`, `dacWrite(pin, uint8)` | confirmed | arduino-esp32 master `package.json`, `boards.txt`, `cores/esp32/esp32-hal-ledc.h`, `esp32-hal.h`, `esp32-hal-adc.h`, `esp32-hal-dac.h` | |
| 22 | esptool v5 log strings (`Connected to {chip} on {port}:`, `Chip type:`, feature list `Wi-Fi, BT, Dual Core + LP Core, 240MHz, Vref calibration in eFuse, Coding Scheme None`, stub/baud/flash/hash/hard-reset lines, `Wrote N bytes (M compressed) at 0x... in t seconds (x kbit/s).`); latest 5.6.0; v4 forms `Chip is ...`, `WiFi`, `VRef calibration in efuse` | confirmed | https://github.com/espressif/esptool master (`__init__.py` `__version__ = "5.6.0"`, `loader.py`, `cmds.py`, `targets/esp32.py`) and tag v4.8.1 | |
| 23 | Brown-out levels 2.43 / 2.48 / 2.58 / 2.62 / 2.67 / 2.70 / 2.77 / 2.80 V +/-0.05, Espressif calls them estimates | confirmed | https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/kconfig-reference.html | |
| 24 | MicroPython v1.29.0, ESP32_GENERIC, flash offset 0x1000 | confirmed | https://micropython.org/download/ESP32_GENERIC/ ("starting at address 0x1000") | |
| 25 | ROM banner `ets Jul 29 2019 12:21:46` on v3 silicon; `boot:0x13` / `boot:0x3` | unverified (banner, user logs only) / confirmed (boot codes decode from the GPIO_STRAP description) | https://esp32.com/viewtopic.php?p=98039 ; esptool boot-mode docs | wording changed from "from memory" to "user logs" |
| 26 | ADC2 shared with Wi-Fi | confirmed | https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/adc/adc_oneshot.html ("ADC2 is also used by Wi-Fi") | |

Not re-checked (left as the researcher marked them): absolute DXF pad centres in 2.3 (only relative layout re-checked), PCB thickness, solder-mask colour, module marking text, DOIT clone details, GPIO5/GPIO14 boot glitches, factory firmware.
