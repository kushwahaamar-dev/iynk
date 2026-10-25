# Pololu QTR-8RC Reflectance Sensor Array — fact sheet

Product modelled: **Pololu QTR-8RC Reflectance Sensor Array**, Pololu item **#961**, PCB dev code **IRS02A** (silkscreen "IRS02A", "Pololu ©2008"). Same PCB as the analog QTR-8A (#960); only the populated parts differ [1][2][3]. Pololu files it under "Older QTR Sensors" but still lists it as "Active and Preferred", US$12.95 (page read 2026-10-24) [1].

**What it is.** A passive carrier board, 74.9 × 12.7 mm, with eight infrared reflective object sensors (IR LED plus phototransistor in one 4-lead SMD package) in a straight row at a 9.525 mm (0.375") pitch. There is no microcontroller, no regulator and no indicator LED on the board. Each sensor has its own RC (capacitor discharge) output: the host MCU drives the OUT pin high for at least 10 µs, switches it to input, and times how long the line takes to fall to logic LOW. Bright (white) surface = fast fall (tens of µs); dark (black line) = slow fall (milliseconds). An N-channel MOSFET, gate pulled high, switches all **8 IR LEDs** (wired as 4 series pairs) and lets the host turn them off through the LEDON pin. The board can be snapped along a perforation into a 6-sensor and a 2-sensor module [1][2].

---

## 1. Sources

1. Pololu product page #961 — https://www.pololu.com/product/961 — description, specs (2.95" × 0.5" × 0.125", 3.3–5.0 V, 100 mA, optimal distance 0.125", max 0.375", 3.09 g), LED pairing, MOSFET, read sequence, breaking, included parts, status.
2. Pololu "QTR-8A and QTR-8RC Reflectance Sensor Array User's Guide" (docs 0J12, PDF © 2001–2014) — https://www.pololu.com/docs/0J12 , PDF https://www.pololu.com/docs/pdf/0J12/QTR-8x.pdf — 11×1 / 8×2 connections, 3.3V BYPASS, LEDON pull-up, RC read sequence and timings, mounting distance, #2 screws, breaking procedure, 100 Ω resistor.
3. Pololu dimension diagram "QTR-8x Reflectance Sensor Array", drawing 19 June 2017, dev code irs02a — https://www.pololu.com/file/0J1288/qtr-8x-reflectance-sensor-array-dimensions.pdf — outline 74.9 × 12.7 mm, thickness 1.57 mm, part height 1.5 mm, sensor offsets, hole positions and diameters, perforation position. Rendered to PNG and read.
4. Pololu drill guide DXF — https://www.pololu.com/file/0J925/irs02a02-drill.dxf — **exact hole coordinates** (units inches, top view). Parsed with a Python script (POLYLINE/VERTEX entities, cross markers grouped, bounding-box centres).
5. Pololu 3D model (SolidWorks 2016 STEP AP214, 2017-05-22) — https://www.pololu.com/file/0J1302/qtr-8rc-reflectance-sensor-array.step — a single merged B-rep ("Imported2") with coloured faces; part centres/sizes/heights in §2.3 and §2.5 extracted by clustering faces per colour; board 74.93 × 12.70 × 1.57 mm, board colour RGB (0.80, 0.00, 0.00); confirms [3][4].
6. Pololu schematic image (product page) — https://a.pololu-files.com/picture/0J629.650.png — LED strings, 47 Ω resistors, 3.3 V bypass, MOSFET with 47 kΩ gate pull-up, per-sensor 10 nF + 220 Ω, decoupling 0.1 µF + 1.0 µF on each side of the perforation.
7. Pololu labelled pin photos (bottom side) — https://a.pololu-files.com/picture/0J621.600.jpg (11×1) and https://a.pololu-files.com/picture/0J622.600.jpg (8×2) — pin functions, silkscreen text.
8. Pololu photos — top side https://a.pololu-files.com/picture/0J643.1200.jpg , iso https://a.pololu-files.com/picture/0J615.1200.jpg — colours, sensor orientation, SMD layout (estimates only).
9. Fairchild (onsemi) QRE1113GR datasheet, Jan 2008 — https://www.pololu.com/file/0J117/QRE1113GR.pdf — package 2.90 × 3.60 × 1.70 mm, pinout, 940 nm, IF 50 mA max, VF 1.2/1.6 V at 20 mA, IC(ON) 0.1–0.4 mA, tr/tf 20 µs. Pololu notes they "have since switched to a similar generic unit that has slightly longer range" [1].
10. Pololu QTRSensors Arduino library, v4.0.0 (latest tag, library.properties `version=4.0.0`) — https://github.com/pololu/qtr-sensors-arduino — `QTRSensors.h/.cpp` read for constants and algorithms; `examples/QTRRCExample/QTRRCExample.ino`.
11. Pololu QTR Reflectance Sensor Application Note (docs 0J13, PDF © 2001–2022) — https://www.pololu.com/docs/pdf/0J13/QTR_application_note.pdf — measured QTR-1RC pulse widths at 1/8" and 3/8" (§3), A vs RC.
12. Pololu category "Pololu QTR Reflectance Sensors" — https://www.pololu.com/category/123 — and QTR-MD-08RC product page https://www.pololu.com/product/4248 — current dimmable QTR/QTRX/QTRXL line.
13. iynk research on the original Robotics Bench Fig. 11 — docs/research/robotics-bench-b.md §6 (lines 835–995) — what the original showed; checked against [1]–[10] in §7.5 and §10.

---

## 2. Geometry (board frame)

**Frame.** Component side (the side with the black sensors, the only silkscreen there is "TOP") viewed from above. Reading orientation: the **header/mounting-hole long edge at the bottom (y = 0)**, the **sensor long edge at the top (y = 12.7)**, **sensor 1 at the left**, sensors 7–8 (the snap-off piece) at the right. Origin = bottom-left corner, +x right, +y up, mm. This is exactly the orientation of the drill DXF [4] (DXF in inches, multiply by 25.4). Note: all the useful labels (pin names, sensor numbers) are printed on the **bottom** side, where the view is mirrored (sensor 1 appears on the right) [7].

### 2.1 Outline and stack-up

| item | value | source |
|---|---|---|
| outline | **74.93 × 12.70 mm** (2.950" × 0.500"); drawing rounds to 74.9 × 12.7 | [3][4] |
| corners | square (no radius drawn on the dimension diagram or the DXF outline) | [3][4] |
| PCB thickness | **1.57 mm** (0.062") | [3] |
| tallest SMD part above board | **1.5 mm** (0.059") | [3] |
| total thickness without header | ~3.2 mm (0.125" "maximum thickness") | [1][2] |
| board-edge tolerance / drill tolerance | ±0.3 mm / ±0.1 mm | [3] |
| weight without header | 3.09 g (0.11 oz) | [1] |
| solder mask | **red** (Pololu red, both sides); STEP board colour RGB (0.80, 0, 0) ≈ #CC0000 | [5][8] |
| silkscreen | **white** | [7][8] |
| pad finish | silver/tin (HASL-like, bright silver in photos) | [8] |
| perforation | a column of small vias at **x = 55.88 mm** (2.200"), between sensors 6 and 7, at y = 0.51, 1.27, 2.03, 2.79, 3.56, 4.32, 6.60, 7.37, 8.13, 8.89, 9.65, 10.41, 12.19 mm | [3][4] |

### 2.2 Mounting holes (from DXF [4])

Four plated holes, **Ø 2.18 mm** (0.086"), for #2 screws [2], all at **y = 2.54 mm**:

| hole | x (mm) | y (mm) | note |
|---|---|---|---|
| H1 | 2.54 | 2.54 | left end |
| H2 | 53.34 | 2.54 | 6-sensor piece, left of perforation |
| H3 | 58.42 | 2.54 | 2-sensor piece, right of perforation |
| H4 | 72.39 | 2.54 | right end |

End-to-end spacing H1–H4 = 69.85 mm (drawing: 69.9 [2750 mil]); H1–H2 = 50.80 mm; H3–H4 = 13.97 mm (drawing 14.0 [550]) [3].

### 2.3 Sensors U1…U8 (QRE1113GR or Pololu's generic equivalent)

Centres from the dimension diagram [3]: first sensor centre 4.1 mm [0.162"] from the end, pitch 9.525 mm [0.375"], centre 2.8 mm [0.109"] from the sensor edge. The array is symmetric on the board (2.950 − 7 × 0.375 = 0.325", i.e. 0.1625" margin each end), so x = **4.1275 + 9.525·(n−1) mm**, y = **12.70 − 2.77 ≈ 9.93 mm** from the drawing; the STEP model [5] puts the body centres at **y = 9.92 mm** and x = 4.13, 13.65, 23.18, 32.70, 42.23, 51.75, 61.28, 70.80 (agrees to 0.01 mm). Use y = 9.92.

| sensor | silkscreen no. (bottom side) | x (mm) | y (mm) |
|---|---|---|---|
| U1 | 1 | 4.128 | 9.92 |
| U2 | 2 | 13.653 | 9.92 |
| U3 | 3 | 23.178 | 9.92 |
| U4 | 4 | 32.703 | 9.92 |
| U5 | 5 | 42.228 | 9.92 |
| U6 | 6 | 51.753 | 9.92 |
| U7 | 7 | 61.278 | 9.92 |
| U8 | 8 | 70.803 | 9.92 |

Array centre = 37.465 mm = board centre.

Package (QRE1113GR datasheet [9]): black moulded body **2.90 × 3.60 mm, 1.50–1.70 mm high** (the drawing gives both; the Pololu STEP uses 1.50), 4 gull-wing leads, lead tip-to-tip 4.40–4.80 mm, lead width 0.61 mm nom; two windows (emitter and detector) side by side on top. Pins: 1 anode, 2 cathode (IR LED), 3 collector, 4 emitter (phototransistor). Peak emission 940 nm.
Orientation on this board (from the STEP model [5], confirmed by the top photo [8]): body box **2.8 mm (x) × 3.6 mm (y), 1.50 mm tall** (z 1.57 → 3.07); leads exit **left and right (±x)**, two per side, lead centres at **x = centre ± 1.825 mm, y = 9.02 and 10.82 mm** (i.e. centre ± 0.90), each lead foot 0.85 × 0.55 mm, outer lead-tip span **4.5 mm** in x. The two windows are therefore **stacked along y** (one toward the sensor edge, one toward the board centre). Which window is the emitter: (unverified). Body is matte black; windows dark [8].

### 2.4 Connectors (through-hole, 0.1" pitch, hole Ø 1.02 mm [0.040"], 27 holes total) [3][4][7]

The board ships with a loose 25-pin 0.1" male header strip and a loose 100 Ω through-hole resistor; **nothing is soldered at the factory** [1]. Square pads = GND [7].

**Row A — the 11×1 row, y = 3.81 mm**, x left → right (top view):

| pos | x (mm) | function | pad |
|---|---|---|---|
| A1 | 20.955 | GND | square |
| A2 | 23.495 | VCC | round |
| A3 | 26.035 | LEDON | round |
| A4 | 28.575 | OUT1 (sensor 1) | round |
| A5 | 31.115 | OUT2 | round |
| A6 | 33.655 | OUT3 | round |
| A7 | 36.195 | OUT4 | round |
| A8 | 38.735 | OUT5 | round |
| A9 | 41.275 | OUT6 | round |
| A10 | 43.815 | OUT7 | round |
| A11 | 46.355 | OUT8 | round |

**Row B — second row of the 8×2 option, y = 1.27 mm**, directly below A4…A11:

| pos | x (mm) | function | pad |
|---|---|---|---|
| B1 | 28.575 | LEDON | round |
| B2 | 31.115 | VCC | round |
| B3–B8 | 33.655, 36.195, 38.735, 41.275, 43.815, 46.355 | GND ×6 | square |

So an 8×2 header uses A4…A11 (OUT1–OUT8) plus B1…B8 (LEDON, VCC, GND×6); an 11×1 header uses A1…A11 [2][7].

**2-sensor piece pads, y = 1.27 mm**: x = 61.595 OUT7, 64.135 OUT8, 66.675 VCC, 69.215 GND [4][7]. (OUT7/OUT8 here are the same nets as A10/A11 while the board is whole.)

**3.3V BYPASS** jumper pads: (6.985, 1.27) and (9.525, 1.27) mm, silkscreen "3.3V BYPASS" on the bottom side [4][7].

**Break-off resistor pads** (2-sensor piece): (57.404, 7.239) and (57.404, 9.779) mm, 0.1" apart, vertical. Fit the supplied 100 Ω for 5 V or a wire link for 3.3 V **only after breaking the board** [2][4].

Header facing: user's choice; nothing is fitted at the factory [1]. Because the sensors must face the floor (≈ 3 mm away), a straight header is normally fitted with its plastic body on the **back (silkscreen) side** and pins pointing **−z in the board frame**, i.e. up and away from the floor once mounted (typical practice, not a Pololu statement). Pololu also suggests a right-angle header or soldered wires for a compact install [1]. No overhang beyond the edge (row B pads are 1.27 mm from the bottom edge).

### 2.5 Passives and MOSFET (positions extracted from the Pololu STEP model [5])

**How extracted.** The STEP [5] is one merged solid, but every face carries a colour. A Python script (scratchpad `facts-tools/qtr8rc/step.py`) mapped STYLED_ITEM → face → COLOUR_RGB, collected each face's vertices, and clustered touching faces per colour into bounding boxes. Part types follow from colour + size: dark-grey 2.8 × 3.6 mm boxes = sensors; dark-grey 1.4 × 3.0 mm = SOT-23; orange-tan 1.0 × 0.8 mm bodies with grey 0.3 mm end caps = 0603 capacitors; black 0.85 × 0.95 mm tops with 0.45 mm silver terminals and white-tan sides = 0603 resistors. The sensor centres it gives (4.13, 13.65, 23.18, 32.70, 42.23, 51.75, 61.28, 70.80; y 9.92) match §2.3 to 0.01 mm, which validates the method. Heights are above the board top (z = 1.57 mm in the model). Component **values per position are not in the model**; assignments marked (inferred) come from the schematic [6] plus position.

| iynk id | part | package | centre x, y (mm) | long axis | footprint (mm) | height (mm) | colour | value / role |
|---|---|---|---|---|---|---|---|---|
| Q1 | N-channel MOSFET (LED low-side switch) | SOT-23 | 14.98, 2.49 | y | body 1.4 × 3.0; one lead at (13.99, 2.49), two at (15.97, 1.57) and (15.97, 3.40) | 1.20 (body 0.10–1.20) | black, grey marking patch on top | gate = LEDON with 47 kΩ pull-up [6]; pin roles per lead (unverified) |
| R1 | resistor | 0603 | 7.75, 3.56 | x | 1.75 × 0.95 | 0.65 | black top | 47 Ω shared LED stage (inferred: next to 3.3V BYPASS pads) |
| R2 | resistor | 0603 | 7.75, 5.21 | x | 1.75 × 0.95 | 0.65 | black | 47 Ω shared LED stage (inferred) |
| R3 | resistor | 0603 | 8.89, 10.79 | x | 1.75 × 0.95 | 0.65 | black | 47 Ω, LED string of sensors 1+2 (inferred: sits between the pair) |
| R4 | resistor | 0603 | 12.32, 2.41 | y | 0.95 × 1.75 | 0.65 | black | beside Q1, 47 kΩ gate pull-up (inferred, unverified) |
| R5 | resistor | 0603 | 13.08, 5.59 | x | 1.75 × 0.95 | 0.65 | black | 220 Ω output series (inferred) |
| R6 | resistor | 0603 | 17.91, 3.36 | y | 0.95 × 1.75 | 0.65 | black | 220 Ω (inferred) |
| R7 | resistor | 0603 | 21.46, 6.98 | x | 1.75 × 0.95 | 0.65 | black | 220 Ω (inferred) |
| R8 | resistor | 0603 | 27.94, 7.62 | x | 1.75 × 0.95 | 0.65 | black | 220 Ω (inferred) |
| R9 | resistor | 0603 | 27.94, 10.79 | x | 1.75 × 0.95 | 0.65 | black | 47 Ω, LED string of sensors 3+4 (inferred) |
| R10 | resistor | 0603 | 32.64, 6.60 | x | 1.75 × 0.95 | 0.65 | black | 220 Ω (inferred) |
| R11 | resistor | 0603 | 40.89, 6.73 | x | 1.75 × 0.95 | 0.65 | black | 220 Ω (inferred) |
| R12 | resistor | 0603 | 46.10, 7.87 | y | 0.95 × 1.75 | 0.65 | black | 220 Ω (inferred) |
| R13 | resistor | 0603 | 46.99, 10.79 | x | 1.75 × 0.95 | 0.65 | black | 47 Ω, LED string of sensors 5+6 (inferred) |
| R14 | resistor | 0603 | 61.72, 4.95 | y | 0.95 × 1.75 | 0.65 | black | 220 Ω OUT7/OUT8 (inferred) |
| R15 | resistor | 0603 | 65.15, 8.13 | y | 0.95 × 1.75 | 0.65 | black | 220 Ω OUT7/OUT8 (inferred) |
| R16 | resistor | 0603 | 66.04, 10.79 | x | 1.75 × 0.95 | 0.65 | black | 47 Ω, LED string of sensors 7+8 (inferred) |
| C1 | capacitor | 0603 | 8.00, 7.11 | x | 1.6 × 0.8 | 0.90 | orange-tan body, grey ends | 10 nF / 0.1 µF / 1.0 µF (assignment unverified) |
| C2 | capacitor | 0603 | 10.53, 6.48 | y | 0.8 × 1.6 | 0.90 | tan | (unverified) |
| C3 | capacitor | 0603 | 17.51, 8.13 | y | 0.8 × 1.6 | 0.90 | tan | (unverified) |
| C4 | capacitor | 0603 | 19.29, 9.78 | y | 0.8 × 1.6 | 0.90 | tan | (unverified) |
| C5 | capacitor | 0603 | 37.47, 7.14 | x | 1.6 × 0.8 | 0.90 | tan | (unverified) |
| C6 | capacitor | 0603 | 37.46, 8.93 | x | 1.6 × 0.8 | 0.90 | tan | (unverified) |
| C7 | capacitor | 0603 | 47.88, 7.87 | y | 0.8 × 1.6 | 0.90 | tan | (unverified) |
| C8 | capacitor | 0603 | 52.07, 6.86 | x | 1.6 × 0.8 | 0.90 | tan | (unverified) |
| C9 | capacitor | 0603 | 64.04, 4.95 | y | 0.8 × 1.6 | 0.90 | tan | (unverified) |
| C10 | capacitor | 0603 | 66.94, 8.13 | y | 0.8 × 1.6 | 0.90 | tan | (unverified) |
| C11 | capacitor | 0603 | 67.82, 4.06 | x | 1.6 × 0.8 | 0.90 | tan | (unverified) |
| C12 | capacitor | 0603 | 69.60, 5.97 | x | 1.6 × 0.8 | 0.90 | tan | (unverified) |

Counts check against the schematic [6]: 12 capacitors = 8 × 10 nF + 2 × 0.1 µF + 2 × 1.0 µF ✓ (8 on the 6-sensor piece = 6 RC + 2 decoupling; 4 on the 2-sensor piece = 2 RC + 2 decoupling ✓). Resistors: the schematic needs 8 × 220 Ω + 4 × 47 Ω + 2 × 47 Ω + 1 × 47 kΩ = 15; the model has **16** — one resistor is unaccounted for (unverified; possibly a 0 Ω link or a part shared with the QTR-8A layout).

The four resistors at y = 10.79 sit exactly between sensors 1–2, 3–4, 5–6 and 7–8, which is where each LED–47 Ω–LED series string would put its resistor, so the LED pairs are (1,2), (3,4), (5,6), (7,8) (inferred).

Designators are iynk's; Pololu does not publish reference designators. Photo [8] shows the same layout (red board, black resistors with light 3-digit codes, tan unmarked capacitors). The QTR-8A uses the same PCB with eight black "473" (47 kΩ) resistors where the RC version has its tan capacitors [2].

The STEP's only silkscreen geometry is a white logo patch on the **bottom** (z = 0) around (8.4, 10.0), 3.5 × 3.8 mm (the Pololu logo, (unverified)); the model does not include the text silkscreen.

### 2.6 Silkscreen text to draw

- **Top (component) side**: only "TOP", small, near the bottom edge just right of the header at about x ≈ 48 mm, y ≈ 1 mm (estimated from top photo [8]). No pin labels on top.
- **Bottom side** (mirror view): "IRS02A" and "Pololu ©2008" (printed twice, once on each piece), sensor numbers "1"…"8" each with a "+" style tick (1 at the right when viewed from below), above the header "8 7 6 5 4 3 2 1" then "Vcc" and "GND"; "GND" and "LEDON" along the lower row; "Vcc 8 7" and "GND" on the 2-sensor piece; a box "3.3V BYPASS" around the two bypass pads [7].
- Chip marking on sensors: none visible.

---

## 3. Electrical

| topic | fact | source |
|---|---|---|
| MCU | **none**; passive sensor board | [1] |
| supply | VCC **3.3–5.0 V**, must supply ≥ 100 mA; outputs referenced to GND | [1][2] |
| current | "The LED current is approximately 20–25 mA, making the total board consumption just under 100 mA" (per series pair string, 4 strings) [1]. Schematic estimate at 5 V: (5 − 2×1.2 V)/(47 + 4×23.5 Ω) ≈ 18 mA per string, ≈ 74 mA total — lower than Pololu's figure; trust Pololu's measured 20–25 mA / ~100 mA for the sim, the estimate ignores LED VF spread. LEDs off → ~0 mA | [1][6] |
| protection | **none**: no reverse-polarity diode, no fuse, no regulator | [6] |
| LED wiring | 8 IR LEDs as **4 series pairs** (LED–47 Ω–LED), sensors paired 1+2, 3+4, 5+6, 7+8 (inferred: the four string resistors sit between exactly those pairs in the STEP model, §2.5), the four strings join, then pass through **two 47 Ω in parallel** (the shared stage) to the MOSFET drain; source to GND | [6] |
| 3.3 V operation | short the two **3.3V BYPASS** pads: bypasses the shared resistor stage, raising LED current at 3.3 V. **Never bridge at 5 V** — exceeds LED current rating | [2] |
| LED control | **LEDON**: gate of the N-MOSFET, **pulled up to VCC by 47 kΩ** → LEDs ON when LEDON is high **or floating**; LOW = all LEDs off. Can be PWM'd at high frequency to dim | [2][6] |
| per-sensor output | 10 nF from VCC to the phototransistor collector node; phototransistor emitter to GND; **220 Ω** from node to OUTn | [6] |
| output type | "8 digital I/O-compatible signals that can be read as a timed high pulse"; no ADC needed; all can be read in parallel | [1] |
| logic level | outputs swing 0 V…(what the MCU drove, ≤ VCC); use VCC equal to the MCU's I/O voltage (5 V Uno/Nano, 3.3 V ESP32/Pico with bypass bridged) | [1][2] |
| emitter | 940 nm IR, IF max 50 mA continuous, VF 1.2 V typ / 1.6 V max at 20 mA | [9] |
| detector | NPN phototransistor, VCEO 30 V, IC max 20 mA, IC(ON) 0.10–0.40 mA (IF 20 mA, 1 mm mirror), dark current ≤ 100 nA, tr/tf 20 µs | [9] |
| decoupling | 0.1 µF + 1.0 µF on each side of the perforation | [6] |
| LEDs/buttons | **no visible LEDs** (IR is invisible; a phone camera shows a faint purple-white glow), **no buttons or switches** | [1][6] |
| ADC/PWM/DAC/USB | none on the board | — |

**RC decay timing** [1][2]: charge ≥ 10 µs; strong reflectance (white) → decay "as low as several dozen microseconds"; black → "typically a few milliseconds, but can be several dozen milliseconds in the worst case"; meaningful results within ~1 ms in typical cases → up to **1 kHz** sampling of all 8. Example duty: 100 Hz sampling with LEDs on only 10 % of the time drops average current from 100 mA to 10 mA.

How the RC node actually behaves (from schematic [6]): driving OUT high puts the collector node at the MCU's high level, so the 10 nF has ~0 V across it (both plates near VCC). When the pin goes high-Z, the phototransistor's photocurrent pulls the node down toward GND, charging the capacitor; the pin reads LOW once the node crosses the MCU's V_IL. More reflected IR → more collector current → faster fall.

**Measured RC pulse widths** (Pololu application note [11], QTR-1RC, same sensor and RC circuit, surface = whiteboard-like with 3/4" black electrical tape): at **1/8" (3.2 mm)** height, white → high pulse **120 µs**, black → **2.6 ms**; at **3/8" (9.5 mm)**, white → **780 µs**, black → **10 ms**. Note 2.6 ms exceeds the library's default 2500 µs timeout, so black normally **saturates at 2500** in `read()`. Use these numbers for the simulation's decay model.

**Sensing distance** [1][2]: optimal **3 mm (0.125")**; maximum recommended **9.5 mm (0.375")**; "designed to be used with the board parallel to the surface". The user's guide's 0.25" figure applies to the analog QTR-8A.

---

## 4. Pinout (physical order, 11×1 row A, left → right in the top view)

| pin | label (bottom silk) | function | voltage | notes |
|---|---|---|---|---|
| A1 | GND | ground | 0 V | square pad; 6 more GND pads in row B |
| A2 | Vcc | supply | 3.3–5.0 V | ≥ 100 mA; no protection |
| A3 | LEDON (silk "LEDON" with a leader line) | MOSFET gate, IR emitters on/off | 0…VCC | internally pulled HIGH (47 kΩ); floating = on; LOW = off; PWM-able |
| A4 | 1 | OUT1, sensor 1 | 0…VCC | RC output: drive HIGH ≥10 µs, then input, time to LOW |
| A5 | 2 | OUT2 | same | |
| A6 | 3 | OUT3 | same | |
| A7 | 4 | OUT4 | same | |
| A8 | 5 | OUT5 | same | |
| A9 | 6 | OUT6 | same | |
| A10 | 7 | OUT7 | same | also on the 2-sensor piece pad |
| A11 | 8 | OUT8 | same | also on the 2-sensor piece pad |

None of the pins has strapping/boot meaning; there is no MCU. Do not enable the MCU's internal pull-up on the OUT pins (the library uses `INPUT`, which disables it on AVR) [10].

---

## 5. Programming (host side; the board itself is not programmable)

- **Arduino library: QTRSensors v4.0.0** (Pololu; latest tag as of 2026-10-24, `architectures=*`) [10]. v4 replaced the v3 classes `QTRSensorsRC`/`QTRSensorsAnalog` with one class `QTRSensors`.
- API (v4) [10]: `setTypeRC()`, `setTypeAnalog()`, `setSensorPins(const uint8_t *pins, uint8_t count)` (max `QTRMaxSensors = 31`), `setEmitterPin(uint8_t)`, `setEmitterPins(odd, even)`, `releaseEmitterPins()`, `setTimeout(uint16_t)` (RC, default `QTRRCDefaultTimeout = 2500` µs), `setSamplesPerSensor()` (analog only, default 4), `setDimmable()/setNonDimmable()`, `emittersOn()/emittersOff()`, `calibrate(QTRReadMode mode = QTRReadMode::On)`, `resetCalibration()`, `read()`, `readCalibrated()`, `readLineBlack()`, `readLineWhite()`; public `calibrationOn.minimum[]/maximum[]`, `calibrationOff`. Constant `QTRNoEmitterPin = 255`. Modes `QTRReadMode::Off, On, OnAndOff, OddEven, OddEvenAndOff, Manual`.
- The QTR-8RC is **not dimmable** (no CTRL pulse protocol); after `emittersOn()`/`Off()` the library waits 200 µs for a non-dimmable board (1200 µs for dimmable) [10].
- Upload path: whatever the host board uses (e.g. Uno/Nano via avrdude). No board-specific console messages.
- Official example `QTRRCExample.ino` [10]: sensors on pins 3–10, emitter on 2, `delay(500)`, `LED_BUILTIN` HIGH during calibration, `calibrate()` 400 times ("2.5 ms RC read timeout (default) * 10 reads per calibrate() call = ~25 ms per calibrate() call ... about 10 seconds"), prints calibration min/max, then in `loop()` prints the 8 calibrated values tab-separated and the position, `delay(250)`.
- Factory sketch: none (no MCU).

---

## 6. Real failure modes

| fault | what physically happens | what the user sees |
|---|---|---|
| reverse polarity (VCC↔GND) | no protection diode [6]. The MOSFET body diode conducts, so each LED pair string sees the reversed supply: two LEDs in series share it (VR max 5 V each [9]), so at 5 V they are within rating and simply do not light. Each phototransistor sees reverse emitter–collector voltage (VECO max 5 V [9]). Host I/O pins on OUT/LEDON are pulled through their clamp diodes (220 Ω limits OUT current to ≈ 20 mA). Expected outcome at ≤ 5 V: no light, no readings, usually no damage if brief (calculated from schematic and abs-max ratings, unverified on hardware) | every sensor reads timeout/black; no heat or smell on the sensor board; host may misbehave |
| over-voltage (> 5 V, e.g. 7.4 V LiPo on VCC) | no regulator. LED current rises: per string (V − 2·1.2 V)/(47 + 4·23.5 Ω ≈ 141 Ω) → at 7.4 V ≈ 35 mA per string (vs ~18 mA at 5 V), total ≈ 140 mA; LEDs within 50 mA abs max but hot; at ≥ 9–10 V the 50 mA abs max is exceeded and the LEDs/47 Ω resistors overheat. OUT pins would push > 5 V into the MCU through 220 Ω (calculated; unverified on hardware) | warm board, MCU pins at risk |
| brown-out / low VCC | no BOD on the board. Below ~3.3 V (without bypass) LEDs dim or go out ("using a lower Vcc will decrease the LED brightness or cause them to turn off completely") [2] → less reflection → every sensor reads slow, i.e. **black** | position stuck, all sensors "on line" |
| over-current | the only significant load is the LED array (~100 mA). Bridging 3.3V BYPASS at 5 V removes the shared stage: ≈ (5 − 2.4 V)/47 Ω ≈ 55 mA per string, above the 50 mA rating [9] → LEDs overheat and can burn out [2] (calculation from schematic) | one pair (two sensors) goes dead at once, because LEDs are in series pairs |
| cold solder joint | on a header pin: that sensor reads timeout (2500 = black) or random; on LEDON: floats high (LEDs stay on, fine); on VCC/GND: whole array dead; on one LED of a pair: **both sensors of that pair read black** | one or two sensors stuck at 1000 (calibrated) or noisy |
| 5 V into a 3.3 V pin | if VCC = 5 V and the host is 3.3 V, the RC node can be pulled above 3.3 V by VCC transients coupled through the 10 nF; steady state the node has no DC path to VCC so it decays to GND. Risk moderate; the 220 Ω limits injection current. Pololu's advice is simply VCC = MCU logic voltage and use the bypass at 3.3 V [2] (risk analysis from schematic, unverified) | usually works, occasionally out-of-spec |
| short 5 V to GND | no fuse on this board; the short is on the host's 5 V rail (Arduino USB polyfuse 500 mA, or regulator current limit) | host resets / USB drops; the sensor board does not burn |
| ambient IR | sunlight and incandescent light contain lots of IR → white-like readings everywhere; mitigated by `QTRReadMode::OnAndOff` | erratic positions near windows |
| too high above floor | > 9.5 mm: weak reflection, decay times long for white too, contrast collapses [1] | everything reads dark |

**Beginner traps**
- Mounting it sensors-up (component side must face the floor).
- Not calibrating, or calibrating without sweeping every sensor over both the line and the floor → `readLineBlack()` jumps or sticks.
- Line lost: `readLineBlack()` returns **0 or 7000** (by the last position's side, not 3500), so a P/PD controller turns hard back toward where the line was last seen, which is usually right. But 0/7000 also mean "line exactly under sensor 1/8", so the return value alone cannot tell "lost" from "at the edge"; check the calibrated values (no sensor > 200 = lost) if the robot must stop or search.
- Reading before `setTypeRC()`/`setSensorPins()`.
- Using 2500 µs timeout with 8 sensors means one `read()` can take up to 2.5 ms; `calibrate()` does 10 reads (~25 ms) [10].
- Using pins 0/1 (Uno USB serial) for OUT lines.
- Forgetting the 100 Ω (or wire at 3.3 V) after snapping the board: the 2-sensor piece's LED string has no return path, so sensors 7–8 read black. Once fitted, those two LEDs are wired VCC → LED → 47 Ω → LED → 100 Ω → GND and are **always on**: the 2-sensor piece has no MOSFET and no LEDON pad [2][6].
- Bridging 3.3V BYPASS and then running at 5 V.
- Expecting visible LEDs: the board looks dead to the eye; use a phone camera.

---

## 7. Lesson facts

Host for iynk: Arduino Nano or Uno (5 V, VCC = 5 V, bypass open). Wiring that matches the official example [10]:

| QTR pin | Arduino pin |
|---|---|
| VCC | 5V |
| GND | GND |
| LEDON | D2 |
| OUT1…OUT8 | D3, D4, D5, D6, D7, D8, D9, D10 |

### 7.1 Lesson 1 — Blink / I-O: watch one RC decay

```cpp
const uint8_t OUT1 = 3, LEDON = 2;

void setup() {
  Serial.begin(9600);
  pinMode(LEDON, OUTPUT);
  digitalWrite(LEDON, HIGH);          // IR emitters on (they are on by default anyway)
}

void loop() {
  pinMode(OUT1, OUTPUT);
  digitalWrite(OUT1, HIGH);
  delayMicroseconds(10);              // charge the node >= 10 us
  pinMode(OUT1, INPUT);               // high-Z, no pull-up
  unsigned long t0 = micros();
  while (digitalRead(OUT1) == HIGH && micros() - t0 < 2500) {}
  Serial.println(micros() - t0);      // ~tens of us on white, ~2500 (timeout) on black
  delay(100);
}
```

Then toggle LEDON LOW and show the reading jumps to "black" everywhere — the emitter is the light source.

### 7.2 Lesson 2 — button + sensor: raw `read()` of all eight

```cpp
#include <QTRSensors.h>
QTRSensors qtr;
uint16_t s[8];

void setup() {
  qtr.setTypeRC();
  qtr.setSensorPins((const uint8_t[]){3, 4, 5, 6, 7, 8, 9, 10}, 8);
  qtr.setEmitterPin(2);
  Serial.begin(9600);
}

void loop() {
  qtr.read(s);                        // raw microseconds, 0..2500 (timeout)
  for (uint8_t i = 0; i < 8; i++) { Serial.print(s[i]); Serial.print('\t'); }
  Serial.println();
  delay(250);
}
```

A host push button (e.g. on D12 to GND with `INPUT_PULLUP`) can start calibration.

### 7.3 Lesson 3 — calibrate and `readLineBlack()` (0–7000)

```cpp
void setup() {
  qtr.setTypeRC();
  qtr.setSensorPins((const uint8_t[]){3, 4, 5, 6, 7, 8, 9, 10}, 8);
  qtr.setEmitterPin(2);
  delay(500);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);    // calibrating: sweep the array over line and floor
  for (uint16_t i = 0; i < 400; i++) qtr.calibrate();   // ~10 s
  digitalWrite(LED_BUILTIN, LOW);
  Serial.begin(9600);
}

void loop() {
  uint16_t position = qtr.readLineBlack(s);   // 0 = under sensor 1, 3500 = centred, 7000 = under sensor 8
  for (uint8_t i = 0; i < 8; i++) { Serial.print(s[i]); Serial.print('\t'); }
  Serial.println(position);
  delay(250);
}
```

### 7.4 Lesson 4 — closed loop: PD line follower (PWM to a motor driver)

```cpp
const float Kp = 0.05, Kd = 0.5;      // example gains; tune on the real robot
const int base = 120;
int lastError = 0;

void loop() {
  uint16_t position = qtr.readLineBlack(s);
  int error = (int)position - 3500;
  int turn = Kp * error + Kd * (error - lastError);
  lastError = error;
  setMotors(constrain(base + turn, 0, 255), constrain(base - turn, 0, 255));  // analogWrite() on the driver's PWM pins
}
```

(The Kp = 0.05 matches the original; Kd value is illustrative.) Wi-Fi/protocol variant: on an ESP32 at 3.3 V (bridge 3.3V BYPASS, VCC = 3.3 V), the same library works (`architectures=*`); stream `position` over Wi-Fi/serial.

### 7.5 Exactly what `readLineBlack()` computes (from QTRSensors.cpp v4.0.0 [10])

1. `readCalibrated()`: each raw reading → `(raw − calmin) × 1000 / (calmax − calmin)`, clamped to **0…1000** (RC: 1000 = darkest seen during calibration).
2. For each sensor i (0-based): if value > **200**, the line is "seen" (`onLine = true`); if value > **50**, it is added to the weighted average: `avg += value × i × 1000`, `sum += value`.
3. If no sensor exceeds 200 (**line lost**): return **0** if the last stored position `_lastPosition < (N−1)·1000/2` (= 3500 for 8 sensors), else return **(N−1)·1000 = 7000**. `_lastPosition` is not updated; it starts at 0, so a line never seen since reset reports 0.
4. Otherwise `_lastPosition = avg / sum` (integer division) and return it.
5. `readLineWhite()` does the same with `value = 1000 − value`.
6. `calibrate()` performs **10** `read()`s per call. The stored maximum is raised only to the **minimum** of those 10 readings, and the stored minimum lowered only to their **maximum** (i.e. only if 10 readings in a row were beyond the old limit), which rejects single-sample noise. Stored arrays start at maximum = 0, minimum = timeout (2500).

So 0 = under sensor 1 (U1 at x = 4.128 mm), 1000 per sensor pitch (9.525 mm), 3500 = midpoint between sensors 4 and 5 (x = 37.465 mm), 7000 = under sensor 8.

**Check of robotics-bench-b.md Fig. 11 line math [13]:**
- Sensor centres `4.14 + i·9.525`: close but not exact; real is **4.1275 + i·9.525** on a **74.93 mm** board (array centred). The original's 13.665/61.29 should be **13.653/61.278**; "centred" 37.5 should be **37.465** (that is why the original shows pos 3502 instead of 3500).
- Weighted mean `Σ cᵢ·i·1000 / Σ cᵢ`: matches the library's formula, **but the original omits the two thresholds**: values ≤ 50 must be excluded from the average, and the line counts as lost only when **no sensor exceeds 200** (the original uses Σcᵢ > 0.05 instead).
- Lost-line rule: the original decides 0/7000 by the **current true line position** (`uL < 37.5`); the library uses the **last computed position** (`_lastPosition < 3500`). Fix the sim to use the last output.
- Its example numbers: centred row "786 793" → pos = (786·3000 + 793·4000)/1579 = 3502.2 → 3502 ✓ (both > 200, > 50). Sensor 2 row "1000" alone → 1000 ✓. Quiz "1200 → near sensor 2, left of centre" ✓. Quiz "over black, RC reading is high (slow discharge)" ✓.
- Its "Q1 missing" result (all eight at 1000 → position 3500, error 0) matches the real formula ✓.
- Its sensor response model (1 within 3.5 mm, linear to 0 at 9.5 mm) is a toy; real QRE1113 spot response depends on height (optimal 3 mm) and is smooth (unverified shape; see app note [11]).
- Header: the original's 1×11 order "LEDON, OUT1–OUT8, VCC, GND" at x = 24.8 + 2.54j is **wrong**: real row A is **GND, VCC, LEDON, OUT1…OUT8** at x = 20.955…46.355, y = 3.81, plus an 8-pin row B at y = 1.27.
- Holes: the original has 2 holes at (2.5, 10.5) and (72.5, 10.5) measured from the sensor edge; real has **4** holes Ø 2.18 at x = 2.54, 53.34, 58.42, 72.39, 2.54 mm from the header edge (10.16 mm from the sensor edge).
- The original's corner radius 1.2 mm: real corners are square [3][4].
- Tape: Pololu's own photo shows the QTR-8 on a 3/4" (19 mm) line [2]; the original's 13 mm line is narrower than standard electrical tape (19 mm) but not wrong for a course.

---

## 8. Internals for the see-through view

- **QRE1113GR**: a moulded opaque black (IR-blocking) housing with two cavities separated by a wall (stops direct LED→detector crosstalk). One cavity: a GaAs (or GaAlAs) 940 nm IR LED die (~0.3 mm square), one gold bond wire to the cathode lead frame; the other: a silicon NPN phototransistor die (~0.5 mm) with one bond wire (base left floating, two-terminal). Each cavity is filled with IR-transparent epoxy (visible-light-filtering, dark). Lead frame: 4 gull-wing tin-plated leads [9]. Die sizes (unverified).
- **10 nF capacitors**: multilayer ceramic (MLCC): dozens of interleaved metal electrode layers (typically nickel) in a tan ceramic dielectric block, with nickel-barrier, tin-plated end terminations (generic MLCC construction; dielectric type unverified).
- **Resistors**: thick-film on alumina, black protective glaze, white/yellow 3-digit code.
- **MOSFET**: small N-channel die in SOT-23 with gate/drain/source bond wires; body diode drain–source.
- **PCB**: FR-4 1.57 mm, 2 layers, red mask, white silk; perforation = a row of small vias that weakens the board for snapping [2][3].
- No quartz, no flash, no RF can, no regulator, no USB bridge on this board.

---

## 9. Assembly and power-up

- **Manufacture**: all parts on the component side are SMD, reflow-soldered (sensors, 0603-class passives, SOT-23 MOSFET). The 25-pin header strip and 100 Ω resistor ship **loose** in the bag; the user cuts and solders the header (11×1, 8×2, or right-angle) last, from the side away from the sensors [1][2].
- **Power-up**: apply VCC → the 47 kΩ pull-up turns the MOSFET on → all 8 IR LEDs light at ~18–25 mA per pair string (invisible). Nothing else happens; there is no enumeration or default program. Outputs sit near 0 V until the host charges them. Phone camera view: 8 faint purple-white dots.
- Snapping: score along the via row between sensors 6 and 7 with a hobby knife, bend over a table edge; then fit the 100 Ω (5 V) or a wire (3.3 V) on the 2-sensor piece [2].

---

## 10. Uncertainties

- **SMD part values per position**: centres, sizes and heights in §2.5 are extracted from the STEP [5], but the model carries no values or designators, so which capacitor is 10 nF vs 0.1/1.0 µF, and most resistor roles, are inferred or unknown. The model has 16 resistors where the schematic needs 15.
- **Which QRE1113 window is the emitter** and exact window shapes: not determined.
- **Current sensor part**: Pololu says they switched from the QRE1113GR to "a similar generic unit that has slightly longer range" [1]; its exact datasheet is not published. Package dimensions assumed identical.
- **MOSFET part number** and resistor/capacitor printed codes: not verified.
- **LED pairing** (which physical sensors share a string): the schematic shows pairs but not their indices; (1,2), (3,4), (5,6), (7,8) is inferred from where the four string resistors sit in the STEP model.
- Failure-mode numbers (reverse polarity outcome, over-voltage currents, 5 V into 3.3 V) are calculations from the schematic, not tests.
- **Red mask**: all Pololu photos show red; batches since ~2018 might differ (unverified; the newer QTR-MD/HD line uses black).
- The user's guide PDF is © 2001–2014; it could not be checked whether the web version has newer edits.

---

## 11. Current product line (for context)

- Since **August 2018** Pololu sells dimmable **QTR / QTRX / QTRXL** arrays with **black** PCBs in **HD (4 mm pitch)** and **MD (8 mm pitch)** densities, 1 to 31 sensors, A (analog) and RC (digital) versions; older QTR sensors (QTR-1, QTR-3, QTR-8, introduced before August 2018) are the "Older QTR Sensors" category [12].
- The nearest modern replacement for the QTR-8RC is the **QTR-MD-08RC** (Pololu #4248): 8 sensors, 8 mm pitch, **61.0 × 20.0 × 2.5 mm**, **2.9–5.5 V**, 30 mA full-brightness LED current independent of supply voltage, optimal sensing distance **5 mm**, max **40 mm**, 3.1 g [12]. Its emitters are controlled through a **CTRL** pin that accepts pulses for **32 dimming levels**; larger HD (≥ 5 sensors) and MD (≥ 11 sensors) arrays have separate **CTRL ODD / CTRL EVEN** pins [12]. QTRX variants run the LEDs at ≤ 3.5 mA for low power; QTRXL have a 20 mm optimal range [12].
- QTRSensors v4 supports both: `setDimmable()`, `setDimmingLevel()`, `setEmitterPins(odd, even)` for the new boards; the QTR-8RC uses a single `setEmitterPin()` and is non-dimmable [10].
