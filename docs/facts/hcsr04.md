# HC-SR04 ultrasonic rangefinder (and HC-SR04P 3.3 V variant): fact sheet

Status: first version written 2026-10-24 14:00 CDT, improved in place 14:00-14:25 CDT against the sources in §1. Anything marked **(unverified)** could not be checked against a primary source inside the time box. **(estimated from ...)** means a position or size read off a drawing or photos, not extracted from design files. There are **no official design files** for the HC-SR04: it is an unbranded Chinese module with many clones, no .brd/.kicad_pcb/centroid file has ever been published by a maker, so all coordinates here are estimates and are labelled as such.

## 0. Header

| field | classic HC-SR04 | HC-SR04P (3.3 V-capable) |
|---|---|---|
| Name | "Ultrasonic Ranging Module HC-SR04" [1] | "HC-SR04-P" wide-voltage ultrasonic ranging module [3] |
| Maker | Unbranded Chinese module; the de-facto reference datasheet is ElecFreaks' [1]; resold by Cytron [2], SparkFun (SEN-15569), Handson (MDU-1014) [4] and countless others | Datasheet published by RCWL (www.i-rcw.com) [3] |
| Revision modelled | The classic three-chip board: EM78P153S MCU + LM324 quad op-amp + MAX232-family transmit driver + 4 MHz crystal [16], netlist from the reverse-engineered schematic "HC-SR04 Ultrasound Echo Locator, Rev 0.1, May 14 2014" [5], layout measured from a photo of a real blue board [23] | Single-chip receiver/driver versions (see §3.6) |
| Part number | none (sold as "HC-SR04") | "HC-SR04-P" / "HC-SR04P" |
| Size | 45 × 20 × 15 mm [1][2][4] | same outline and pinout, "fully compatible with the old HC-SR04 in software and hardware size" [3] |

**What it is.** A 45 × 20 mm board with two 16 mm piezo ultrasonic transducers: **T** (transmitter) on the left and **R** (receiver) on the right, and a 4-pin header `Vcc Trig Echo Gnd`. The host gives Trig a HIGH pulse of at least 10 µs; the module sends a burst of **8 cycles at 40 kHz** from T, then drives Echo HIGH until R hears the reflection (or a timeout expires). The width of the Echo pulse is the round-trip time of flight, so distance = width × speed of sound / 2, which at room temperature is **cm ≈ µs / 58** (inch ≈ µs / 148) [1][2]. Specified range 2-400 cm, ~3 mm resolution, 15° measuring angle, 5 V / 15 mA [1]. The classic module is a 5 V part: its Echo output swings to 5 V and it is not specified below 4.5 V [2]. The HC-SR04P is the drop-in version that runs from 3.0-5.5 V [3].

## 1. Sources

Official / primary first. "Primary" here means the documents the module's makers and first distributors published; there is no silicon-vendor datasheet for the module.

1. ElecFreaks, "Ultrasonic Ranging Module HC-SR04" datasheet (3 pp), https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf (read this run, pdftotext). Took: 5 V, 15 mA, "Working Frequency 40Hz" (sic, a typo for 40 kHz; the timing text says 40 kHz), 2 cm-4 m, "MeasuringAngle 15 degree", 10 µs TTL trigger, 8-cycle 40 kHz burst, µs/58 = cm, µs/148 = inch, 340 m/s, "over 60ms measurement cycle", connect GND first, target ≥ 0.5 m² and smooth, 45 × 20 × 15 mm, pin order Vcc Trig Echo GND.
2. Cytron Technologies, "Product User's Manual - HC-SR04 Ultrasonic Sensor" V1.0, May 2013, https://docs.google.com/document/d/1Y-yZnNhMYy7rwhAgyL_pfa39RsB-x2qR4vP8saG73rE (exported to PDF and read this run). Took: operating voltage 4.5 / 5.0 / 5.5 V (min/typ/max), quiescent 1.5 / 2 / 2.5 mA, working 10 / 15 / 20 mA, 40 kHz, "Effectual Angle: <15°", "Measuring Angle: 30 degree", resolution 0.3 cm, 2-400 cm, "acoustically soft materials like cloth can be difficult to detect", Echo is 5 V, GND first.
3. RCWL, "HC-SR04-P 超声波模块手册" (HC-SR04-P ultrasonic module manual, Chinese), https://baud-dance.com/assets/files/超声波模块手册HC-SR04-P-0e1ddd87b1300664aa168db49c43d8bf.pdf (read this run). Took: 3.0-5.5 V, 2.8 mA at 5 V, 2.2 mA at 3.3 V, range 2-450 cm typ at 5 V (400 min, 600 max), 2-400 cm typ at 3.3 V (350 min, 550 max), min range 2 cm (3 cm max), angle 15° (text: "<15°"), accuracy 1 %, resolution 1 mm, -20 to 80 °C, trigger "at least 10 µs, 40-50 µs works better in practice", 8 × 40 kHz square waves, connect GND first, target ≥ 0.5 m².
4. Handson Technology, "HC-SR04 Ultrasonic Sensor Module User Guide V2.0", SKU MDU-1014, https://mischianti.org/wp-content/uploads/2025/11/Datasheet-HCSR04-modern-architecture.pdf (read this run, page 5 drawing rendered to PNG). Took: 3.3-5 V "second generation" module, quiescent < 2 mA, 15 mA, sensitivity -65 dB min, sound pressure 112 dB, effective angle 15°, 9 g, 2.54 mm header, mechanical drawing (20 mm board height, 15 mm overall height, **40 mm** dimension between the left and right mounting-hole centres), the beam plot "Practical test of performance, Best in 30 degree angle", and a sketch that treats a pulse ≥ 38000 µs as "Out range".
5. Reverse-engineered schematic "HC-SR04 Ultrasound Echo Locator", A4, "Original Version", Rev 0.1, Wednesday May 14 2014 (originally from uglyduck.ath.cx), mirrored at https://mischianti.org/wp-content/uploads/2025/11/Ultrasonic-Sensor-HC-SR04-classic-schema.pdf (rendered and read this run). Took: full netlist of the classic board (§3).
6. Fab Academy 2018, Henk Buursen, week 11, https://fabacademy.org/2018/labs/fablabamsterdam/students/henk-buursen/week11.html. Took: description of the reverse-engineered circuit (MAX232 ±10 V, transducer across two outputs "powered at 20V", MAX232 power cut via Q2 in receive mode, U2C band-pass filter actually peaking near 18 kHz in simulation, U2A + Q1 hysteresis comparator), scope shot of 8 pulses then Echo high; and "the Waag's sensors have a slightly other layout".
7. STMicroelectronics, VL53L0X datasheet DocID029104 Rev 2, https://www.pololu.com/file/0J1187/VL53L0X.pdf (mirror of st.com; read this run). Took: "VL53L0X system FOV is 25degrees", 940 nm VCSEL, up to 2 m, 2.6-3.5 V, I²C address 0x52 (8-bit; 0x29 7-bit).
8. SparkFun forum, "Attaching a Ultrasound HC-SR04 unit", https://community.sparkfun.com/t/attaching-a-ultrasound-hc-sr04-unit/32443 (via search summary). Took: caliper measurement of mounting holes ≈ 2.2 mm (M2), ≈ 42 × 17 mm between hole centres.
9. SparkFun forum, "Problem with cheap (HC-SR04) Ultrasonic Rangefinders", https://community.sparkfun.com/t/problem-with-cheap-hc-sr04-ultrasonic-rangefinders/30457 (via search summary). Took: some clones never drop Echo when no echo returns (stuck HIGH until power cycle).
10. SparkFun forum, "HC-SR04 schematic", https://community.sparkfun.com/t/hc-sr04-schematic/41853 (via search summary). Took: later revisions replaced the MAX232 with an unlabelled buffer IC.
11. Jameco, "Working With Ultrasonic Distance Sensors", https://www.jameco.com/Jameco/Blog/working-with-ultra-sonic-distance-sensors.html (via search summary). Took: hardware timeout ≈ 38 ms, Echo then goes low.
12. Arduino language reference, `pulseIn()`, https://docs.arduino.cc/language-reference/en/functions/advanced-io/pulseIn/ (source https://github.com/arduino/reference-en `Language/Functions/Advanced IO/pulseIn.adoc`, read this run): `pulseIn(pin, value)` / `pulseIn(pin, value, timeout)`, timeout `unsigned long` µs, "default is one second", returns the length in µs "or 0 if no pulse started before the timeout", "Works on pulses from 10 microseconds to 3 minutes". Plus ArduinoCore-avr `cores/arduino/wiring_pulse.c` / `wiring_pulse.S` (read this run): one loop counter (`maxloops`) is shared by waiting for any pulse in progress to end, waiting for the start, and timing the pulse, so on AVR the timeout bounds the **whole** call and a pulse that is still HIGH when the budget runs out also returns 0.
13. ESPHome "Ultrasonic Distance Sensor" docs, https://esphome.io/components/sensor/ultrasonic/ (via search summary). Took: no echo means no pulse, timeout option; a too-long timeout lets the sensor's own timeout look like a valid reading.
14. EM78P153S summary (ELAN/EMC), retailer listing https://bigl.ua/ua/p662500192-em78p153snj-bit-cmos (via search summary): crystal mode DC-20 MHz at 5 V, SOP-14. The ELAN datasheet itself was not read (unverified).
15. Speed of sound in dry air: c = 331.3 · sqrt(1 + T/273.15) m/s ≈ 331.3 + 0.606·T (standard physics; e.g. the linear form used in robotics-bench-b.md §5.9). Values: 0 °C 331.3, 10 °C 337.3, 20 °C 343.2, 25 °C 346.1, 30 °C 349.0 m/s (computed this run).
16. Jim Rowe, "El Cheapo Modules From Asia - Part 2", Silicon Chip, December 2016, https://siliconchip.com.au/Issue/2016/December/El+Cheapo+Modules+From+Asia+-+Part+2 (read this run). Took: PCB 45 × 20 mm; top side = two 16 mm transducers "with a **4MHz crystal** between them"; everything else on the underside is SMD "apart from the 4-pin right-angle header at bottom centre"; IC1 EM78P153S in SOIC-14; IC2 LM324 (all four sections in the receive chain); IC3 "a bus driver IC very similar to the MAX232", its pins 7 and 14 across the transmitter "in bridge mode"; 8 pulses at 40 kHz; trigger ≥ 10 µs; echo width µs = cm / 0.01725; ≥ 60 ms between triggers; "a number of iterations, all bearing the same HC-SR04 label but with various minor circuit and component changes".
17. Wuxi Richen IoT (RCWL), "RCWL-9610 V3.0" single-chip ultrasonic ranging IC datasheet, https://www.mikrocontroller.net/attachment/618319/RCWL-9610-V3.0.pdf (HTTP 403 this run; values via search summary only, (unverified)): 2.8-5.5 V, ~2 mA, needs an external crystal, GPIO (HC-SR04-compatible) output mode among others, up to 6 m.
18. Adafruit product 4007, "Ultrasonic Distance Sensor - 3V or 5V - HC-SR04 compatible - RCWL-1601", https://www.adafruit.com/product/4007 (read this run). Took: 3-5.5 V, "logic level will be the same" as the supply, 2-450 cm (best 10-250 cm), blind spot 2-3 cm, 1 mm resolution, ±0.5 cm, HC-SR04 software compatible but a **different size** (needs mounting changes).
19. MicroPython docs, `machine.time_pulse_us(pin, pulse_level, timeout_us=1000000, /)`, https://docs.micropython.org/en/latest/library/machine.html (read this run). Took: returns -2 on timeout waiting for the pulse to start, -1 on timeout during the pulse.
20. Arduino Library Manager index, https://downloads.arduino.cc/libraries/library_index.json.gz (read this run): **NewPing 1.9.7** is the latest release (teckel12).
21. Adafruit_CircuitPython_HCSR04, https://github.com/adafruit/Adafruit_CircuitPython_HCSR04 (read this run): latest release **0.4.25** (2026-04-23); `HCSR04(trigger_pin, echo_pin, *, timeout=0.1)`, `.distance` in cm, raises `RuntimeError("Timed out")`.
22. UUGear, "HC-SR04 Ultrasound Sensor Module", https://www.uugear.com/product/hc-sr04-ultrasound-sensor-module/ (via search summary): 150 µs-25 ms echo, ≈ 38 ms with no object.
23. Wikimedia Commons, "HC-SR04 ultrasonic distance sensor module pcb.jpg" (back of a classic blue board), https://commons.wikimedia.org/wiki/File:HC-SR04_ultrasonic_distance_sensor_module_pcb.jpg (1280 px version downloaded and measured this run). Took: back-side layout, hole, lead, crystal-lead, header and IC positions (§2 method), the "MAX3232 ESE+1201" driver, designators, "HC-SR04" silk on the back, header body on the back, pin overhang.
24. Wikimedia Commons, "SparkFun HC-SR04 Ultrasonic-Sensor 13959-01a.jpg" (SparkFun product photo, red board), https://commons.wikimedia.org/wiki/File:SparkFun_HC-SR04_Ultrasonic-Sensor_13959-01a.jpg (viewed this run). Took: front side: "T" and "R" silk at the board ends, "VCC Trig Echo GND" over the pin joints, header body behind the board with pins bent down, mesh can tops.
25. mikrocontroller.net, part page "RCWL-9206", https://www.mikrocontroller.net/part/RCWL-9206 (via search summary): no datasheet known, "probably an ultrasonic disc driver", seen with LM324 and RCWL-9300.

## 2. Geometry (BOARD FRAME)

**Frame.** Look at the transducer side (the front, "component side" for the figure) from above, with the silkscreen readable: transducer **T on the left, R on the right, the 4-pin header on the bottom edge**. Origin = bottom-left corner of the outline, +x right, +y up (away from the viewer, toward the top edge), z out of the front face. Units mm. **The header edge is the bottom edge.**

No design files exist. The coordinates below were **measured from a straight-on photo of the back of a classic blue board** [23] (Wikimedia Commons "HC-SR04 ultrasonic distance sensor module pcb.jpg", 1280 × 853 px; board edges located at the 45 × 20 mm outline, giving 12.4 px/mm on both axes; positions mirrored in x to the front view). Method: pixel coordinates of solder joints, hole centres and IC bodies on a 1000 px downscale, converted with x_front = 45 − (px − 215)/12.44, y = (418 − py)/12.44. Accuracy ±0.5 mm (lens perspective, edge finding by eye). Values that come from drawings or photos of the front only say so.

### 2.1 Outline, holes, colours

| item | value | source |
|---|---|---|
| Outline | 45.0 × 20.0 mm rectangle | [1][2][4][16]; photo [23] |
| Corner radius | square corners (photo [23]) | [23] |
| PCB thickness | 1.6 mm FR-4 (estimated; standard, not stated by any source) | |
| Overall height | 15 mm (board + cans) | [1][2][4] |
| Mounting holes | Ø ≈ 2.0 mm (photo [23]; a caliper report says ≈ 2.2 mm, fits M2 [8]). **The photographed board has only two holes, diagonally opposite**: front-frame centres ≈ **(2.2, 1.9)** (bottom-left, under T) and **(43.2, 18.3)** (top-right, above R) [23]. Other batches (the Handson sketch [4], the ElecFreaks-style boards) show **four** corner holes; for those use (2.2, 1.9), (42.8, 1.9), (2.2, 18.1), (42.8, 18.1) (estimated by symmetry from [23]; ≈ 40.6 × 16.2 mm centre to centre, in line with Handson's "40 mm" [4] and the ≈ 42 × 17 mm caliper reading [8]). Schematic: MH1-MH3 tied to GND, MH4 unconnected [5]. | [4][5][8][23] |
| Solder mask | **blue** (classic; photo [23]). SparkFun's SEN-15569 is **red** with a different layout [24]; some clones are green | [23][24] |
| Silkscreen | **white** | [23][24] |
| Transducer cans | aluminium cylinders, Ø 16 mm [16], with a **silver wire-mesh** grille over a dark inner cloth (photo [24]) | [16][24] |

### 2.2 Front side (transducer side) parts

| ref | what | package | centre (x, y) | rot | footprint w × h | height above board | colour / marking |
|---|---|---|---|---|---|---|---|
| T (MK2 in [5]) | 40 kHz piezo transmitter | 16 mm can, 2 leads 10 mm apart along y | **(9.2, 9.9)** (from its two lead joints on the back [23]) | 0 | Ø 16 | ≈ 12-13 mm (estimated: overall 15 mm [1] minus 1.6 mm PCB) | aluminium can, mesh top; silk **"T"** beside it at the board edge [24] |
| R (MK1 in [5]) | 40 kHz piezo receiver | same | **(34.7, 9.9)** (from its lead joints [23]) | 0 | Ø 16 | same | silk **"R"** beside it [24] |
| Y1 | quartz crystal, **4 MHz** on the classic board per the Silicon Chip teardown [16] (see §3.1) | HC-49/S low-profile, 2 leads 4.9 mm apart | **(22.6, 17.6)** (from its lead joints on the back [23], long axis along x; it sits at the top edge between the can outlines) | 0 | 11.0 × 4.7 | ≈ 3.5 mm | silver can, stamped with the frequency, e.g. "4.000" (marking text (unverified)) |
| J1 | 4-pin male header, 2.54 mm pitch, **right-angle** ("4-pin right-angle header at bottom centre" [16]). **The plastic body sits on the back**, flush with the bottom edge; the pins run in the board plane and stick out **≈ 6.2 mm below the bottom edge** [23], so the module stands upright in a breadboard with the cans facing forward. The front shows only the 4 solder joints with the labels above them [24] | 1 × 4 | pins at **x = 18.7 (Vcc), 21.2 (Trig), 23.8 (Echo), 26.3 (Gnd)**, joints at y ≈ 1.3 [23] | 0 | body 10.16 × 2.5 (on the back) | body 2.5 mm proud of the back | black plastic, tinned pins |
| silk (front) | text | | "Vcc", "Trig", "Echo", "Gnd" above the four pins, left to right [1][4][24]; "T" by the left can, "R" by the right can [24]; the classic blue board also prints "HC-SR04" on the **back** beside the header [23] (whether the front also carries "HC-SR04" varies by batch; Handson's drawing shows it top centre [4]) | | | | white |

Header pin order (left to right, front view): **Vcc, Trig, Echo, Gnd** [1][2][4][24]. The schematic [5] numbers J1 the other way: pin 1 = Gnd, 2 = Echo, 3 = Trig, 4 = Vcc. The figure should label by name, not number.

The original Robotics Bench model put all three ICs and a passive block on the front between the cans; **that is wrong**: the front carries only the two cans, the crystal, the header joints and silkscreen; "All the components on the other side of the PCB are surface-mount types" [16], confirmed by the photo [23].

### 2.3 Back side parts (classic three-chip board)

Coordinates are in the front frame (x as seen from the front), so a back-side part at x ≈ 5 sits behind T. From photo [23] unless marked.

| ref (as printed on [23]) | what | package | centre (x, y) | rot | footprint | height | marking |
|---|---|---|---|---|---|---|---|
| U2 | transmit driver: **MAX3232** on the photographed board ("MAX3232 ESE+1201", i.e. MAX3232ESE+, SOIC-16 narrow, date code 1201); other batches use MAX232/MAX232A [5] or a work-alike [16] | SOIC-16 | **(4.5, 10.1)**, behind T | long axis along y | 6.0 × 9.9 | 1.75 | white laser text "MAX3232 / ESE+1201" (photo [23]) |
| U1 | EM78P153S MCU (by its U1 designator and central position; marking not legible in [23]) | SOIC-14 | **(22.3, 10.1)**, just above the header | long axis along x | 8.65 × 6.0 | 1.75 | marking sanded/illegible |
| U3 | LM324 quad op-amp (receive chain; by elimination and its position behind R; marking illegible) | SOIC-14 | **(40.3, 9.1)**, behind R | long axis along x | 8.65 × 6.0 | 1.75 | faint/illegible |
| Q1, Q2 | two SOT-23 transistors (the schematic's BC847 NPN comparator output and BC857 PNP driver-supply switch [5]; which is which on this board is not legible) | SOT-23 | Q1 **(7.9, 17.9)** near the driver, Q2 **(32.0, 18.1)** near the receiver leads [23] | | 2.9 × 2.4 | 1.0 | small black |
| R1-R21, C1-C16 | 0603 passives; resistors black with 3-digit codes (e.g. "103", "102", "513"), MLCCs tan, each inside a white silk outline with its designator | 0603 | spread over the back, densest behind R | | 1.6 × 0.8 | 0.5-0.8 | |
| silk (back) | "HC-SR04" beside the header (to its right as seen from the back) [23] | | | | | | white |

Designators on real boards do not match the reverse-engineered schematic [5] (there the LM324 is U2 and the MAX232 is U3; on the photographed board the driver is U2). Layout and parts vary between batches ("a slightly other layout" [6]; "a number of iterations" [16]).

### 2.4 Newer single-chip versions

Later HC-SR04 / HC-SR04P boards replace the EM78P153 + LM324 + MAX232 with a dedicated single-chip ultrasonic ranging IC: the RCWL-9610 family from Wuxi Richen IoT (RCWL), 2.8-5.5 V, ~2 mA, external crystal, HC-SR04-compatible GPIO mode [17] (datasheet not readable this run). **RCWL-9206** has no published datasheet; the only reference found is a mikrocontroller.net parts/forum page [25] which calls it "probably an ultrasonic disc driver" and lists it on a board together with an **LM324** and an **RCWL-9300**. So the common "new" HC-SR04 is most likely a three-chip board in which RCWL-9300 (controller, replacing the EM78P153S) and RCWL-9206 (transducer driver, replacing the MAX232) keep the LM324 receive chain (inference from [25], (unverified)); CS100A (Keyestudio modules, 3.3-5 V, 4-300 cm) is another single-chip family (unverified as used on HC-SR04-labelled boards). The HC-SR04P keeps the classic outline and pinout [3]. The front (cans, crystal, header, silkscreen) looks the same; the back shows one ranging IC plus a small transmit driver and far fewer passives (estimated from photos; details (unverified)). Do not confuse it with the Adafruit/RCWL **RCWL-1601**, which is HC-SR04 software compatible but a different size [18].

## 3. Electrical

### 3.1 Classic board block diagram (from schematic [5], read this run)

- **U1 EM78P153S** (ELAN 8-bit OTP microcontroller, SOP-14; RISC, crystal mode DC-20 MHz at 5 V [14]). Pins used: 4 VCC, 11 GND, 5 P65/OSCI and 6 P64/OSCO to the crystal Y1 (with C10, C11 = 22 pF to GND), 7 P63/RST pulled up by R17 10 k, **1 P50 = Trig** (pulled up by R19 10 k), **2 P67 = Echo** (pulled up by R18 10 k), 9 P61 = "Threshold" (sets the comparator threshold), 10 P60/INT = "Signal" (comparator output from the receiver), 12 P53 = "HVOff" (turns the MAX232 supply on/off through Q2), 13 P52 = Tx2 and 14 P51 = Tx1 (40 kHz drive to MAX232 T2IN/T1IN). P62/TCC and P66 unconnected.
- **Clock**: three values are in circulation. Silicon Chip's teardown of a real module: **"a 4MHz crystal"** between the transducers [16]. The 2014 reverse-engineered schematic labels Y1 **27 MHz** [5] (repeated by [6]); that is above the EM78P153S's 20 MHz crystal maximum at 5 V [14], so it is very probably a schematic error. The original Robotics Bench model and this project's brief say **12 MHz**; no source for 12 MHz was found. **Trust 4 MHz** (a hands-on teardown in an edited magazine, and consistent with the MCU's limits); because the module has had "a number of iterations" [16], some batches may differ (unverified). The figure should print "4.000" on Y1 and call it "4 MHz crystal", not 12 MHz. The 40 kHz burst is timed by MCU firmware from this crystal (40 kHz = 4 MHz / 100).
- **Transmitter**: U3 MAX232A in the schematic (a MAX3232ESE+ on the photographed board [23]; on many boards a MAX232 work-alike, "a bus driver IC very similar to the MAX232" [16]; later revisions use an unlabelled buffer [10]) (C13-C17 = 150 nF charge-pump and supply caps). With a MAX232 the charge pump makes about ±10 V from 5 V (a MAX3232, as on the photographed board [23], swings only about ±5.4 V typical (from memory of the TI/Maxim sheet, (unverified)), so roughly half the drive); the transducer T (MK2) is connected **between T1OUT (pin 14) and T2OUT (pin 7)**, driven in antiphase, so it sees about 20 V peak-to-peak [5][6]. MAX232 VCC (pin 16) is fed through **Q2 BC857** (PNP, base via R20 1 k from P53 "HVOff"), so the charge pump runs only just before and during the burst and is off while listening [6].
- **Receiver**: R (MK1) → R14 10 k + C7 10 nF → **U2D** inverting amplifier (R15 62 k / R14 10 k ≈ ×6.2) → R13 6.2 k → **U2C** multiple-feedback band-pass (C3, C4 1 nF, R11 75 k, C2 12 pF, R12 1 k) → R1 10 k + C1 10 nF → **U2B** amplifier (R2 75 k / R1 10 k = ×7.5) → **U2A** comparator with hysteresis (R3 4.53 k, R4 120 k, R7 75 k, R9 120 k, C6 10 nF, R10 3.3 M; threshold set from P61) → **Q1 BC847** → "Signal" into P60/INT. Mid-rail bias 2.5 V from R21/R16 1 k + 1 k, decoupled by C8 1.2 µF + C9 150 nF. C5, C12 1.2 µF supply decoupling [5]. Simulation by [6] puts the U2C filter peak near 18 kHz rather than 40 kHz (so the classic board's filter is mistuned; it still works because the transducer itself is a narrow 40 kHz resonator).
- **Power tree**: one input, VCC pin straight to the 5 V net. **No regulator, no reverse-polarity diode, no polyfuse, no power LED** on the classic board [5]. Supply 4.5-5.5 V, quiescent ~2 mA, 10-20 mA while ranging [2].
- **Logic levels**: Trig is an MCU input with a 10 k pull-up to 5 V (so a floating Trig reads HIGH; it only triggers on a HIGH pulse). Echo is a 5 V CMOS output with a 10 k pull-up, HIGH ≈ VCC. Trig accepts 3.3 V logic in practice (3.3 V > typical VIH ≈ 0.5-0.6 VCC; (unverified) against the EM78P153S datasheet). **Echo must be divided down for a 3.3 V host** (§7.5).
- **No ADC, PWM, DAC, USB-serial, LEDs or buttons** on the module. No on-board sensors besides the transducers.

### 3.2 Timing (all sources agree unless noted)

| quantity | value | source |
|---|---|---|
| Trigger | HIGH pulse ≥ 10 µs on Trig ("10uS TTL pulse") | [1][2] ; HC-SR04P: "≥ 10 µs, 40-50 µs works better" [3] |
| Burst | 8 cycles of 40 kHz (200 µs of sound) from T, starting after the falling edge of Trig | [1][2][3] |
| Echo rises | when the burst has been sent (about 0.2-0.5 ms after Trig falls on classic boards; the exact delay varies by firmware (unverified)) | [1][6] |
| Echo width | round-trip time of flight: **≈ 150 µs (2.6 cm) to ≈ 23.2 ms (400 cm × 58)**; UUGear quotes 150 µs-25 ms [22] | [1][22] + calc |
| Conversion | cm = µs / 58, inch = µs / 148 (both assume ~340 m/s) | [1][2] |
| No echo | Echo falls after a firmware timeout, typically **≈ 38 ms** (Handson's sketch treats ≥ 38 000 µs as "Out range" [4]; Jameco [11]; UUGear "if there is no object detected, you will get about 38ms" [22]); some clones leave Echo stuck HIGH until power-cycled [9] | [4][9][11][22] |
| Measurement cycle | **≥ 60 ms** between triggers so late echoes from the previous ping are not mistaken for the new one | [1][4] |
| Max rate | ≈ 16 pings/s at 60 ms | calc |

Note on 58: 1/58 cm/µs ≈ 0.01724 cm/µs one-way ⇒ c = 2 × 0.01724 × 10⁴ ≈ 345 m/s (25 °C). The datasheet's "340 m/s" gives µs/58.8. µs × 0.0343 / 2 = µs / 58.3 (20 °C). All within 1.5 %.

### 3.3 Speed of sound vs temperature

c(T) = 331.3 · sqrt(1 + T/273.15) m/s ≈ 331.3 + 0.606 T [15].

| T (°C) | c (m/s) | µs per cm (round trip) = 2·10⁴/c |
|---|---|---|
| -10 | 325.2 | 61.5 |
| 0 | 331.3 | 60.4 |
| 10 | 337.3 | 59.3 |
| 20 | 343.2 | 58.3 |
| 25 | 346.1 | 57.8 |
| 30 | 349.0 | 57.3 |
| 40 | 354.7 | 56.4 |

A 10 °C error gives ≈ 1.7 % distance error (1.7 cm at 1 m). Humidity adds < 0.5 % (unverified magnitude). The module does no temperature compensation itself; the host must.

### 3.4 Range, beam and accuracy

| quantity | classic HC-SR04 | HC-SR04P |
|---|---|---|
| Range | 2-400 cm [1][2] | 2-450 cm at 5 V, 2-400 cm at 3.3 V (typ) [3] |
| Resolution | "can reach 3 mm" [1], 0.3 cm [2] | 1 mm, accuracy 1 % [3] |
| Angle | "Measuring Angle 15 degree" [1]; Cytron gives both "Effectual Angle <15°" and "Measuring Angle 30 degree" [2]; Handson's beam plot: "Best in 30 degree angle" [4] | 15° ("<15°") [3] |
| Target | ≥ 0.5 m², as smooth as possible [1][2][3] | same |

**How to read the angle.** The datasheets' 15° is best read as a half-angle (±15° off-axis), which is the same thing as the ~30° full cone the beam plot [4] and Cytron [2] show. In practice a large flat wall is detected over roughly ±15°; a small object (a pen, a chair leg) only within a much narrower cone and only up to 1-2 m. For the simulation: draw a **30° full cone** (±15°), and say the spec is "15°".

### 3.5 Soft and angled targets

- **Soft / absorbent** (foam, cloth, curtains, sofa cushions, fur, clothing): absorb and scatter 40 kHz, the return is below the comparator threshold, Echo times out (no reading) or locks onto something behind [2].
- **Angled hard surfaces** (a wall at > ~15-20° to the beam, a glass bottle, a tilted acrylic sheet): specular reflection sends the echo away from R, so the module sees nothing or a later multipath echo (reads too far). Rounded objects return a weak echo from one small spot.
- **Too close** (< 2 cm): echo arrives while T is still ringing; reading is garbage or ~2-3 cm.
- **Small or thin objects** at distance: below threshold.
- **Two sensors** pinging together, or a second object in the cone: the first echo above threshold wins; cross-talk gives wrong short readings.
- Not affected by light or colour (unlike IR sensors) [2].

### 3.6 HC-SR04P and single-chip versions

- HC-SR04P: 3.0-5.5 V, Echo HIGH ≈ VCC, so at 3.3 V it connects directly to a 3.3 V MCU with no divider [3]. At 5 V supply its Echo is 5 V, so the divider is still needed on a 3.3 V host if you power it from 5 V.
- Current: 2.8 mA at 5 V, 2.2 mA at 3.3 V (typical, "working current") [3] vs 15 mA classic [1].
- Handson's "second generation" MDU-1014 is specified 3.3-5 V too [4].
- The single-chip ASICs (RCWL-9610 family [17]) integrate the receive amplifier, band-pass, comparator and the transmit logic; the transmitter is driven by the chip or an extra buffer at VCC rather than ±10 V, which is one reason the low-voltage versions lose some range (450 cm at 5 V vs 400 cm at 3.3 V [3]) (chip details (unverified)).

## 4. Pinout

| # (left to right, front view) | label printed | function | voltage | notes |
|---|---|---|---|---|
| 1 | Vcc | supply | classic 5 V (4.5-5.5) [2]; P: 3.0-5.5 V [3] | no reverse protection |
| 2 | Trig | trigger input, ≥ 10 µs HIGH starts a ping | TTL | 10 k pull-up to VCC on the classic board [5] |
| 3 | Echo | output, HIGH for the round trip | HIGH ≈ VCC (5 V on classic) | 10 k pull-up [5]; divide for 3.3 V hosts |
| 4 | Gnd | 0 V | | connect first when hot-plugging [1][2][3] |

## 5. Programming

The module has no user firmware; its MCU is factory OTP. The host is programmed instead. Toolchain notes for the host boards are in their own sheets (uno-r3.md, nano.md, esp32-devkitc.md, pico.md).

- Arduino: plain `pulseIn()` (built into every core) or the **NewPing** library by Tim Eckel, latest **1.9.7** [20], `NewPing sonar(TRIG, ECHO, MAX_CM); sonar.ping_cm();`.
- MicroPython: `machine.time_pulse_us(pin, 1, timeout_us)` returns the HIGH time in µs; **-2** if it timed out waiting for the pulse to start, **-1** if it timed out during the pulse [19].
- CircuitPython: `adafruit_hcsr04` 0.4.25 [21], `HCSR04(trigger_pin, echo_pin, *, timeout=0.1)`, `.distance` in cm; raises `RuntimeError("Timed out")` with no echo [21].
- ESPHome: `platform: ultrasonic`, `trigger_pin`, `echo_pin`, `timeout` (meters), `pulse_time` [13].
- gpiozero (Raspberry Pi): `DistanceSensor(echo=24, trigger=23, max_distance=1)`, `.distance` in metres; needs the Echo divider because Pi GPIO is 3.3 V and not 5 V tolerant.

Boot: on power-up the module just waits for a trigger; no LED, no output (Echo LOW).

## 6. Real failure modes

| fault | what physically happens | what the user observes |
|---|---|---|
| Reverse polarity (Vcc/Gnd swapped) | no protection: current flows through the ESD/substrate diodes of U1, U2, U3 from GND to VCC; with a 5 V USB source the ICs heat within seconds and MAX232/EM78 often die (the classic "it got hot and now reads 0") | board warms, chips hot to the touch, possibly a burnt smell; USB host may drop out on over-current; module dead afterwards (often) |
| Over-voltage (e.g. 9-12 V on Vcc) | no regulator: everything sees the full voltage. LM324 survives up to 32 V, MAX232 abs max VCC 6 V (from memory of the TI sheet), EM78P153S abs max ≈ 6-7 V (unverified): MCU/MAX232 fail | dead module, sometimes a cracked IC |
| Low voltage / brown-out | classic: below ~4.5 V the MAX232 drive and receiver gain drop, range shrinks and readings become erratic; at 3.3 V classic boards mostly return nothing or 0 (unverified threshold). EM78P153S has an on-chip LVR/WDT (unverified threshold) | short or zero readings, random timeouts |
| Over-current | the module draws ~15 mA; over-current only happens through a fault (reverse polarity, short) | |
| Cold solder joint on a transducer lead or header pin | open or intermittent transducer: no burst or no echo; intermittent header pin: Echo or Trig drops out | Echo always times out (0 cm), or readings come and go when the board is touched |
| 5 V Echo into a 3.3 V pin | the host pin's clamp diode conducts through the module's 10 k pull-up/driver: about (5 - 3.3 - 0.5) V / 10 k ≈ 0.12 mA via the pull-up alone, more when Echo is actively driven HIGH (MCU output, tens of mA possible); ESP32/Pi pins are not 5 V tolerant; it may work for a while and then degrade the pin | works at first; long-term pin damage; on a Pi can back-power the 3.3 V rail |
| Short 5 V to GND (on the module) | no fuse on the module; the host's USB polyfuse / regulator limits it | host resets, USB disconnects, polyfuse warm |
| Trig left floating | 10 k pull-up holds it HIGH: no rising edge, no pings | always 0 / timeout |
| Beginner traps | (1) swapped Trig/Echo pins in code; (2) `pulseIn` with no timeout blocks up to 1 s per call when nothing is in range; (3) triggering faster than every 60 ms reads previous echoes; (4) integer overflow: on AVR `int` is 16-bit, so `int duration = pulseIn(...)` wraps above 32 767 µs and `duration * 343` in `int` math overflows; store the result in `unsigned long` and compute in `float` (`us / 58.0`) or `long`; (5) treating 0 as "very close" instead of "no echo"; (6) pointing at soft or angled targets; (7) two sensors pinging at once; (8) mounting the cans behind a hole too small or deep (the case wall echoes) | |

## 7. Lesson facts

Pins match the Learn Arduino original (Trig D9, Echo D10) [learn-arduino.md §3.7]; Robotics Bench's sketch also uses `TRIG = 9, ECHO = 10`, although its drawn wires land on other Nano header positions (robotics-bench-b.md §5.3-5.4); do not copy that mismatch.

### 7.1 Ping and print (Arduino)

```cpp
const int TRIG_PIN = 9;
const int ECHO_PIN = 10;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);
}

void loop() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long us = pulseIn(ECHO_PIN, HIGH, 30000UL);  // 30 ms ~ 5 m; 0 = no echo
  if (us == 0) {
    Serial.println("no echo");
  } else {
    float cm = us / 58.0;          // or us * 0.0343 / 2 at 20 C
    Serial.print(cm);
    Serial.println(" cm");
  }
  delay(60);                       // >= 60 ms measurement cycle
}
```

`pulseIn(pin, value, timeout)`: timeout in microseconds (`unsigned long`), default 1 000 000; returns the pulse length in µs, or 0 on timeout [12]. On AVR boards the timeout covers waiting plus the pulse itself [12], so with 30 000 µs a 25 ms echo (≈ 4.3 m) still reads, but one that ends later than 30 ms after the call (wait for Echo to rise included) returns 0. 30 000 µs covers 30000/58 ≈ 517 cm, above the 400 cm spec, and stays below the module's own ~38 ms no-echo timeout so a "no echo" is reported as 0, not as a fake 6.5 m reading [13].

### 7.2 Temperature-compensated distance

```cpp
float cm_from_us(unsigned long us, float tempC) {
  float c = 331.3 + 0.606 * tempC;      // m/s
  return us * c / 20000.0;              // us * (c * 100 cm / 1e6 us) / 2
}
```

### 7.3 Parking sensor (Learn Arduino lesson 16)

GRN if cm > far, YLW if near < cm <= far, RED if cm <= near, `delay(60)` per loop (~15 updates/s) [learn-arduino.md]. Add a passive buzzer with `tone(pin, 2000, 50)` whose repeat interval shrinks with distance.

### 7.4 NewPing

```cpp
#include <NewPing.h>
NewPing sonar(9, 10, 400);          // trig, echo, max cm
void loop() { delay(50); Serial.println(sonar.ping_cm()); }   // 0 = out of range
```

NewPing also supports one-pin mode (Trig and Echo tied together).

### 7.5 3.3 V hosts (ESP32, Pico, Pi)

- Use an HC-SR04P powered from 3.3 V: direct connection [3].
- Or a classic HC-SR04 on 5 V with an Echo divider: **1 kΩ series from Echo, 2 kΩ to GND** (Vout = 5 × 2/3 = 3.33 V), or 10 k / 20 k, or 4.7 k / 10 k (3.4 V). Trig can be driven directly from 3.3 V (works in practice; (unverified) against the EM78P153S VIH spec).
- MicroPython (Pico): 
```python
from machine import Pin, time_pulse_us
import time
# HC-SR04P on 3V3, or a classic HC-SR04 on VBUS with the Echo divider: Pico GPIO is not 5 V tolerant
trig = Pin(3, Pin.OUT, value=0)
echo = Pin(2, Pin.IN)
while True:
    trig.value(1); time.sleep_us(10); trig.value(0)
    us = time_pulse_us(echo, 1, 30000)
    print("no echo" if us < 0 else "%.1f cm" % (us / 58))
    time.sleep_ms(60)
```
- gpiozero: `from gpiozero import DistanceSensor; s = DistanceSensor(echo=24, trigger=23); print(s.distance * 100)`.

### 7.6 VL53L0X comparison (correction of the original)

The original overview says the VL53L0X gives a "narrow beam" with a "35 degree cone". **Wrong.** ST's datasheet: "VL53L0X system FOV is **25 degrees**" [7], with a 940 nm VCSEL and range "up to 2 m" [7]. So the VL53L0X's 25° full field of view is narrower than the HC-SR04's ~30° practical cone, but only somewhat; its real advantages are size, I²C, and no soft-target problem at short range; its weaknesses are 2 m range and sunlight/glass.

## 8. Internals (see-through view)

- **Transducers**: each can holds a piezoceramic disc (PZT) bonded to an aluminium (or sometimes plastic) conical/disc resonator, tuned to 40 ± 1 kHz; the mesh/cloth grille protects it; two leads go through the PCB. T and R look identical; R is matched for receive sensitivity. Nominal for 16 mm 40 kHz pairs: SPL ~112 dB at 10 V (Handson [4]: 112 dB), sensitivity ~-65 dB (V/µbar) [4].
- **Crystal Y1**: HC-49/S metal can with a rectangular AT-cut quartz blank on two spring clips, silver electrodes.
- **EM78P153S**: small CMOS die, OTP EPROM 1 K × 13 bit program, 32 bytes of RAM (unverified), wire-bonded in SOP-14.
- **LM324**: four bipolar op-amps on one die, SOP-14.
- **MAX232 / MAX3232**: CMOS die with two charge pumps (doubler + inverter) and two RS-232 drivers + two receivers (only the two drivers are used here); four external caps (C14, C15 flying; C16, C13 reservoir).
- No RF can, no flash, no regulator, no USB bridge.

## 9. Assembly and power-up

- Manufacture: SMD reflow of the back side (ICs, SOT-23s, 0603/0805 passives), then the through-hole parts: the two transducer cans and the crystal sit on the front and are soldered on the back; the right-angle header sits on the back and is soldered on the front (its four joints are what the front shows under the pin labels) [23][24]. Hand- or selective-soldered (the joints in [23] are hand-finished, with flux residue). No socketed parts. No conformal coat.
- Power-up: no LED; quiescent ~2 mA; Echo LOW; module waits for a Trig pulse. The MAX232 supply is off until a ping (Q2).

## 10. Uncertainties

- No official design files exist. Positions come from one straight-on photo of one batch [23] (±0.5 mm); other batches differ (two vs four mounting holes, MAX232 vs MAX3232 driver, "HC-SR04" on the front or only on the back). Can height (≈ 12-13 mm) was not measured.
- Crystal frequency: 4 MHz (Silicon Chip teardown [16], trusted) vs 27 MHz (2014 reverse-engineered schematic [5], above the MCU's 20 MHz max) vs 12 MHz (original model / brief, no source). The can's printed marking was not seen in a photo this run.
- No-echo timeout ≈ 38 ms from secondary sources; some clones never time out and stay HIGH until power-cycled [9]; other timeout lengths may exist on single-chip versions (unverified).
- RCWL-9610 datasheet blocked (HTTP 403); its figures come from a search summary. RCWL-9206 has no datasheet; its role (transducer driver, with RCWL-9300 + LM324) rests on one forum page [25]. Which IC a given new-version HC-SR04 carries varies by batch.
- Exact Echo-rise delay after Trig not measured.
