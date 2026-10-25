# Fact sheet: LED + resistor trainer and NPN transistor switch (Robotics Bench Fig. 02 and Fig. 03)

Two custom teaching boards. Neither is a commercial product, so there is no manufacturer, part number or design file: the board
outlines, part positions and silkscreen below are the **original Robotics Bench layouts** (read from its source, see 2.0), and every
**component** on them is a real, catalogue part whose numbers come from manufacturer datasheets. Where the original's physics or
part choice is wrong, this sheet says so and gives the corrected value (section 0.3 lists all corrections in one place).

## 0. Header

| | Fig. 02 "LED + resistor" | Fig. 03 "Transistor switch" |
|---|---|---|
| Product | LED + resistor trainer, custom (iynk rev A, after Robotics Bench `f02`) | Low-side NPN switch board, custom (iynk rev A, after Robotics Bench `f03`) |
| Board | 60 x 40 mm, 1.6 mm FR-4, all through-hole except the USB-C receptacle (see 0.3) | 55 x 40 mm, 1.6 mm FR-4, all through-hole |
| Key parts | Kingbright **WP7113ID** class 5 mm red LED; 1/4 W carbon-film resistors 220 R, 1 k, 10 k (5 %); 0 R wire link; 2 x 4 jumper header; 100 uF electrolytic; slide switch; USB-C power-only receptacle; two test points | **PN2222A** NPN (TO-92, E-B-C) [5]; 1 k base resistor; **1N4007** flyback diode (DO-41) [8]; 1 k + green 5 mm LED indicator; 100 uF electrolytic; 1 x 3 logic header; two 2-way 5 mm screw terminals |
| Off-board, on the mat | a hand-held DMM in series via TP1/TP2, USB-C cable | Arduino Nano (logic, micro/mini USB; see `nano.md`), 4 x AA holder (motor supply), TT gear motor 1:48 with wheel [13] |

**What it is.** Fig. 02 is the first circuit of the course: a regulated 5 V from USB-C goes through a power switch, then through one
of four selectable current-limit paths (220 R, 1 k, 10 k or a bare 0 R link, chosen by a jumper cap on JP1), through a red LED, and
back to ground through a pair of test points where a multimeter is wired **in series** to read the LED current. It teaches
Ohm's law for an LED: I = (V_supply - V_F) / R. Fig. 03 is the second: a 5 V logic pin of an Arduino Nano drives the base of an NPN
transistor through a base resistor; the transistor switches a separate 4 x AA battery's current through a small DC gear motor
connected between battery + and the collector (low-side switch). A 1N4007 across the motor catches the coil's turn-off kick, a
100 uF electrolytic buffers the battery, and a green LED shows when the transistor is on. It teaches "logic drives power", PWM
speed control, shared ground and flyback protection.

### 0.3 Corrections to the original (do not copy these)

| # | Original says | Reality | Use instead |
|---|---|---|---|
| 1 | Fig. 02 bypass row: R = 0.5 ohm, I = 6.0 A, P = 18 W | Nothing on the board is 0.5 ohm; the current is set by the LED's own bulk resistance (order of 10 ohm for a 5 mm indicator LED, unverified), the meter shunt + fuse, the cable and the USB source's current limit. Expect **hundreds of mA**, not amps (estimate, unverified) | Show "no resistor: I is limited only by the LED and the supply, ~0.2-0.5 A (estimate), 10x+ the 30 mA abs max [1]". Never print 6 A |
| 2 | "a red LED wants 5-20 mA" | WP7113ID: DC If **30 mA abs max**, characterised at **10 mA** (V_F 1.9 V typ, 2.3 V max) [1] | "Run a 5 mm red LED at 5-20 mA; never above 30 mA DC" |
| 3 | V_F = 2.0 V flat for every row | V_F falls with current: ~1.9 V at 10 mA [1], ~1.7-1.8 V at 0.3-3 mA (read from the I-V curve in [1], estimated) | Keep 2.0 V for the headline 220 R maths (it is within the 1.9-2.3 V spread); say "about" |
| 4 | Fig. 02 LED pops then works again after re-plugging | A burnt LED stays dead (open bond wire or cracked die), or survives dimmer/discoloured | Keep D1 dead until the part is replaced |
| 5 | Fig. 02 meter never shows OL | A meter in the mA jack (Fluke 87V: mA input fused at 440 mA; its top mA range is 400 mA, range value unverified) would read the real surge; a cheap 200 mA range shows "1" / OL and its fuse may blow | Show the spike, then 0 (LED open) and optionally "fuse blown" |
| 6 | Fig. 03 Q1 is a "2N2222 (TO-92)" | The **2N2222A is a TO-18 metal can** [6][7]; the TO-92 plastic parts are **PN2222A (pins E-B-C)** [5] and onsemi **P2N2222A (pins C-B-E, the reverse!)** [9] | Model **PN2222A, TO-92, E-B-C** and print "PN2222A" / "2N2222A" exactly as chosen |
| 7 | "hFE about 100", "up to 600 mA" | hFE 100-300 at 150 mA, VCE 10 V; **50 min at 150 mA, VCE 1 V**; 40 min at 500 mA [5][7]. IC abs max: PN2222A 1.0 A (intended up to 500 mA) [5], P2N2222A 0.6 A [9], ST 2N2222A 0.6 A [7], Microchip JAN 2N2222A 0.8 A [6] | "hFE is at least 50 when the transistor is nearly saturated; design with a forced gain of 10-20" |
| 8 | Ib 4.3 mA -> Ic 250 mA, "gain x58", saturated | With 4.3 mA the PN2222A is **not** guaranteed saturated at 250 mA (VCE(sat) is specified at IB = IC/10) [5]; VCE will be roughly 0.3-1 V (estimate) and the motor start (stall up to 1.1-1.5 A [13]) is gain-limited | Use **R1 = 330 R** (Ib = 12.6 mA, below the 20 mA recommended pin current) for a solid switch; keep 1 k only to teach "under-driven" behaviour |
| 9 | Fig. 03 D1 reversed = "dead short across the battery" | With D1 reversed the short is battery + -> D1 -> Q1 -> GND, **only while Q1 is on**; Q1 limits it to roughly hFE x Ib | "Motor stops (D1 shunts it to ~0.9 V); Q1 heats; D1 warm" |
| 10 | Q1 reversed "barely switches and overheats" | Reversed TO-92 (E and C swapped) runs in inverse-active mode, inverse beta is very low (typically < 10, unverified): motor barely turns. The E-B junction now sees the battery in reverse when off: VEBO 6.0 V max [5], so a fresh 6.4 V alkaline pack slightly exceeds it | "Motor barely twitches, Q1 warm" (not hot) |
| 11 | No flyback diode "kicks back ~50 V and kills Q1 at the first switch-off" | The collector flies up until something breaks down: PN2222A **BVCEO 40 V, BVCBO 75 V** [5]. A small motor's stored energy (1/2 L I^2) is small, so a single kick often survives; repeated avalanche at 490 Hz PWM degrades and eventually kills it (unverified rate). The 5 V logic side can also be disturbed through the shared ground | "Spike clamped by Q1's breakdown at ~40-75 V; it may survive a few, PWM kills it" |
| 12 | LED1 "not polar" | Every LED is polar (anode long lead, cathode flat) | Make LED1 polar |
| 13 | 4 x AA holder 26 x 22 x 13 mm | One AA cell alone is 49.2-50.5 mm long, 13.5-14.5 mm diameter [10][11]; a 4-cell side-by-side holder is about 62 x 58 x 15 mm (typical, unverified) | Use a realistic holder |
| 14 | USB-C jack "gives 5 V" with no other parts | A USB-C **sink** gets VBUS from a C-to-C cable only if each CC pin has a **5.1 k pull-down (Rd)**; without them a compliant charger never turns VBUS on (USB Type-C spec, not re-read this session) | Add R4/R5 = 5.1 k on CC1/CC2 (or use a USB-A-to-C cable, which always supplies 5 V) |
| 15 | Mode names "Input HIGH / Input LOW" on Fig. 03 | Pin 9 is an **output** (`pinMode(9, OUTPUT)`) | "Pin 9 HIGH", "Pin 9 LOW", "PWM 50 %" |
| 16 | analogWrite(9, 128) = 50 % | 128/255 = **50.2 %** duty at **490.2 Hz** (Timer1, 16 MHz / 64 / 510) on the Nano | Say "about 50 %" |

## 1. Sources

1. Kingbright **WP7113ID** datasheet, T-1 3/4 (5 mm) High Efficiency Red, Spec DSAF0012, Rev V.14A, 01/08/2026 — https://www.kingbrightusa.com/images/catalog/SPEC/WP7113ID.pdf — V_F 1.9 typ / 2.3 max at 10 mA, VR 5 V (IR <= 10 uA at 5 V), IF 30 mA DC, IFP 160 mA (1/10 duty, 0.1 ms), PD 75 mW, Tj 125 C, Rth j-a 560 C/W, 627/617 nm, 30 deg diffused, TC of V_F -1.9 mV/C, solder 260 C 3 s at 2 mm.
2. Fluke, "Can you live with the burden?" — https://www.fluke.com/en-us/learn/blog/electrical/can-you-live-with-the-burden — 87V burden: 1.8 mV at 1 mA, 0.18 V at 100 mA (i.e. 1.8 mV/mA on the mA input); 87V DC current accuracy 0.2 %.
3. Fluke 87V specifications (product page / spec sheet mirrors) — https://fluke.com/en-ph/product/electrical-testing/digital-multimeters/fluke-87v , https://www.avionteq.com/Document/Fluke-87V-specification-sheet.pdf — mA/uA input fuse 0.44 A (440 mA) 1000 V FAST, A input fuse 11 A 1000 V; 10 A continuous, 20 A for up to 30 s.
4. IEC 60062 resistor colour code (standard table, from memory; widely reproduced) — digit colours, gold/silver multipliers and tolerances.
5. Fairchild (onsemi) **PN2222A / MMBT2222A / PZT2222A** datasheet Rev. A3, Aug 2010 — https://cdn-shop.adafruit.com/datasheets/PN2222A.pdf — TO-92 pinout **E B C**; VCEO 40 V, VCBO 75 V, VEBO 6.0 V, IC 1.0 A abs max ("collector currents up to 500 mA"); PD 625 mW, derate 5.0 mW/C, Rth j-a 200 C/W, Rth j-c 83.3 C/W; hFE 35/50/75/100-300/50/40 at 0.1/1/10/150 (10 V)/150 (1 V)/500 mA; VCE(sat) 0.3 V @150/15 mA, 1.0 V @500/50 mA; VBE(sat) 0.6-1.2 V @150/15, 2.0 V max @500/50; fT 300 MHz min.
6. Microchip **2N2221A-2N2222A** (JAN/JANTX) datasheet DS00005314A, 2024 — https://docs.rs-online.com/1ce3/A700000013465269.pdf — TO-18 (TO-206AA) drawing: CD 4.52-4.95 mm, CH 4.32-5.33 mm, HD 5.31-5.84 mm, leads 0.41-0.53 mm on a 2.54 mm circle (LC TP), tab TW 0.91-1.17 / TL 0.71-1.22 mm at 45 deg, **lead 1 = emitter, 2 = base, 3 = collector, collector tied to the case**; VCEO 50 V, IC 800 mA (military variant); VCE(sat) 0.3 V @150 mA, 1.0 V @500 mA.
7. STMicroelectronics **2N2219A / 2N2222A** datasheet (1997) — https://cs.umb.edu/cs341/Lab08/2N2222.pdf — "2N2222A in Jedec TO-18 metal case"; VCEO 40 V, VEBO 6 V, IC 0.6 A, Ptot 0.5 W (Tamb 25 C), Rth j-case 83.3 C/W; VCE(sat) 0.3 V / 1 V; hFE 100-300 @150 mA.
8. Vishay **1N4001-1N4007** datasheet, doc 88503, rev 29-Apr-2020 — https://www.vishay.com/docs/88503/1n4001.pdf — 1N4007: VRRM 1000 V, IF(AV) 1.0 A, IFSM 30 A (8.3 ms), VF 1.1 V max at 1.0 A, IR 5 uA at 25 C, CJ 15 pF typ; DO-41 body 4.1-5.2 mm long, 2.0-2.7 mm dia, leads 0.71-0.86 mm, band = cathode. Cross-checked against Diodes Inc DS28002 Rev 11 — https://www.diodes.com/assets/Datasheets/ds28002.pdf.
9. onsemi **P2N2222A** datasheet Rev 7, Jan 2013 — https://fabacademy.org/2021/labs/agrilab/students/antonio-anaya/datasheets/P2N2222A.PDF — TO-92 Case 29 Style 17: **1 = collector, 2 = base, 3 = emitter**; IC 600 mA; same hFE / VCE(sat) table as [5]. Part is obsolete (DigiKey lists PN2222ABU / KSP2222ABU as substitutes).
10. Energizer **E91** (alkaline AA, LR6) datasheet, form E91NA1018 — https://data.energizer.com/pdfs/e91.pdf — 1.5 V nominal, IR **150-300 mohm fresh**, 13.5-14.5 mm dia, 49.2-50.5 mm long, 23 g, capacity curves to 0.8 V.
11. Energizer **NH15-2300** (NiMH AA) datasheet, form NH15-2300GL1118 — https://data.energizer.com/pdfs/nh15-2300.pdf — 1.2 V nominal, 2300 mAh, IR **30 mohm charged / 40 mohm half discharged** (+-20 %), 12 mohm at 1 kHz, 28 g.
12. Rubycon / Panasonic / Nichicon aluminium electrolytic application notes (via search summary): reverse voltage destroys the anode oxide's blocking ability within seconds, generates heat and gas, the pressure vent opens; Panasonic FAQ0012 https://industrial.panasonic.com/sa/faq/faq0012 ; Nichicon/Rubycon technical notes https://www.mouser.com/pdfDocs/al-technical-note_en.pdf. Melcom/Felsic note: about 1.5 V reverse is tolerable only briefly.
13. Adafruit **3777** "DC Gearbox Motor - TT Motor - 200RPM - 3 to 6VDC" — https://www.adafruit.com/product/3777 — rated 3-6 V, gear 1:48, no-load 150 mA +-10 %; measured 150 mA/120 rpm/stall 1.1 A at 3 V, 155 mA/185 rpm/1.2 A at 4.5 V, 160 mA/250 rpm/**1.5 A stall at 6 V**; stall torque 0.4 kg.cm (3 V) / 0.8 kg.cm (6 V); body 70 x 22 x 18 mm; 30.6 g.
14. iynk `docs/facts/nano.md` (this repo) — ATmega328P: 20 mA recommended / 40 mA abs max per pin, 200 mA VCC/GND; D9 = PB1 OC1A, 490 Hz PWM; BOD 2.7 V; Arduino AVR Boards 1.8.8, avrdude 8.0.0-arduino1.
15. Original Robotics Bench source, `03-fig02-led-resistor-trainer.js` and `04-fig03-transistor-switch.js` (session scratchpad `orig/robotics/`), and `docs/research/robotics-bench-a.md` sections 4, 5, 9, 10 — board outlines, holes, part footprints (`uv`), silkscreen, signal paths, modes, failure messages.

## 2. Geometry (board frame)

### 2.0 How the coordinates were obtained

The original authors place everything in "uv" mm on the top view: u = distance from the board's left edge, v = distance from its
front edge (`robotics-bench-a.md` 2.1). With the **front edge at the bottom** of the drawing, the iynk board frame is simply
**x = u, y = v** (origin bottom-left, +x right, +y up/away from the viewer). Part centres below are the centres of the original
`uv` footprint rectangles ((u0+u1)/2, (v0+v1)/2), footprint = (u1-u0) x (v1-v0); heights are the original `h` values, checked
against the real part sizes (corrections noted). Pad positions are derived from those footprints and standard pitches (stated per
part). These are the canonical layout for iynk; there is no external design file to extract from.

### 2.1 Fig. 02 LED trainer

**Outline**: 60.0 (x) x 40.0 (y) mm, corner radius 2.0 mm, 1.6 mm FR-4. Bottom edge = the front, where the meter sits and the test
points are. USB-C enters from the **left** edge. **Mounting holes** (centres): (3, 3), (57, 3), (3, 37), (57, 37); diameter not given
by the original: use **3.2 mm plated, for M3 on 4 mm standoffs** (standoff height 4 from the original; hole size estimated).
**Colours**: original palette "mint" = green solder mask, white silkscreen, gold (ENIG) or tinned pads (exact hex is an iynk style
choice; use the shared figure palette).

| Ref | What | Package | Centre (x, y) | Rot | Footprint w x h | Height | Colour / marking |
|---|---|---|---|---|---|---|---|
| J1 | USB-C receptacle, 5 V in (power-only) | USB-C, mid/top-mount, through-hole shell legs | (2.55, 20.0) | opening faces -x | 7.5 x 9.0 (overhangs the left edge by **1.2 mm**) | 3.2 | nickel shell; silk none at the jack (tag "5V IN") |
| SW1 | Slide switch SPDT, POWER | THT 3-pin, 2.54 mm pitch (estimated) | (13.5, 20.0) | lever slides along x | 7.0 x 4.0 | 5.0 (lever top) | black body, white or black lever; silk "ON" at (14, 26) |
| R1 | 220 ohm, 1/4 W, 5 % carbon film | axial, 10.16 mm (0.4") pitch, body ~2.3 x 6.3 mm (typical, unverified) | (29, 33) | along x | 14 x 2 | 2.6 | beige body, **red-red-brown-gold**; silk "220" at (29, 34) |
| R2 | 1 k, 1/4 W, 5 % | axial | (29, 28) | along x | 14 x 2 | 2.6 | **brown-black-red-gold**; silk "1K" at (29, 29) |
| R3 | 10 k, 1/4 W, 5 % | axial | (29, 23) | along x | 14 x 2 | 2.6 | **brown-black-orange-gold**; silk "10K" at (29, 24) |
| JL1 | 0 R wire link (bare tinned wire) | 2 holes, same pitch as R1-R3 | (29, 18) | along x | 14 x 2 | ~1.2-1.5 (arched) | bright tin; silk "NONE" at (29, 19) |
| JP1 | 2 x 4 male header + one 2.54 mm jumper cap | 2.54 mm pitch | (40.54, 19.08) | rows along x | 5.08 x 10.16 | 8.4 (pins); cap 6.1 tall body over the pins | black plastic; cap black. Rows (y): **22.89 = 220, 20.35 = 1K, 17.81 = 10K, 15.27 = NONE**; columns x = 39.27 (resistor side) and 41.81 (LED side, common) |
| C1 | 100 uF electrolytic, radial | 6.3 mm dia, 2.5 mm lead pitch (typical) | (12, 32) | stripe toward -x (design choice) | 6 x 6 | 7.3 in the original; a real 100 uF 16 V general-purpose can is ~11 mm (unverified) | black or blue sleeve, light stripe with "-" marks = negative; silk "+" next to the positive pad |
| D1 | Red 5 mm LED | T-1 3/4, 2.54 mm lead pitch | (48, 23.5) | flat (cathode) toward -x | 5 x 5 (lens 5.0, flange ~5.8) | 12 (body ~8.6 + ~3 mm standoff, estimated) | red diffused lens [1]; silk "D1" at (48, 30.5), "+" at (52.5, 20) beside the anode |
| TP1 | Test point, meter + | 4 mm red test post / loop | (41, 8) | - | 2 x 2 | 4.0 | red |
| TP2 | Test point, meter COM | 4 mm black test post | (46, 8) | - | 2 x 2 | 4.0 | black |
| R4, R5 | **5.1 k CC pull-downs (added in iynk)** | 0603 SMD or axial (if axial, place them near J1) | near J1, e.g. (8, 14) and (8, 26) (iynk choice) | - | - | - | needed for a C-to-C cable (correction 14) |

LED pads (estimated from the footprint): cathode (46.73, 23.5), anode (49.27, 23.5); the "+" silk sits right of the anode.

**Silkscreen text** (all white, original sizes in mm cap height): "LED TRAINER" 3.0 at (30, 37) top centre; "I = V / R" 2.6 at
(29, 4.5); "220", "1K", "10K", "NONE" 1.8 beside the four rows; "D1" 2.0; "+" 2.4 (LED anode); "ON" 1.8 (switch). Add (iynk):
"+" at C1's positive pad, "TP+" / "COM" under TP1/TP2, "5V" near J1.

**Circuit** (original `sig.pwr`): J1 VBUS -> SW1 -> common bus at x = 20 feeding the left end of R1, R2, R3, JL1 -> right ends to JP1
resistor-side pins -> cap -> JP1 common column -> D1 anode -> D1 cathode -> TP1 ... meter ... TP2 -> GND -> J1 GND. C1 across
VBUS-GND after SW1. Design note (iynk): without a meter the loop is open at TP1-TP2, so add a 2-pin "METER" jumper JP2 across
TP1-TP2 (fitted = LED works without a meter; removed = meter in series). (unverified against any real product; iynk design.)

### 2.2 Fig. 03 transistor switch

**Outline**: 55.0 (x) x 40.0 (y) mm, corner radius 2.0 mm, 1.6 mm FR-4. Bottom edge = the front (logic header and battery terminal
there, Nano and battery in front of it on the mat). Motor terminal on the **left** edge. **Mounting holes**: (2.5, 37.5),
(52.5, 37.5), (52.5, 2.5); only three (the logic header occupies the bottom-left corner). Diameter: 3.2 mm (estimated).
Colours as Fig. 02.

| Ref | What | Package | Centre (x, y) | Rot | Footprint w x h | Height | Colour / marking |
|---|---|---|---|---|---|---|---|
| H1 | 1 x 3 male header: GND, 5V, IN | 2.54 mm, vertical | (9.81, 3.27) | row along x | 7.62 x 2.54 | 8.4 | black; pins at x = **7.27 GND, 9.81 5V, 12.35 IN**, y = 3.27; pin 1 = GND (square pad, iynk choice); silk "GND 5V IN" 1.5 at (9.8, 6.4) |
| R1 | Base resistor, 1/4 W 5 % (original 1 k; iynk recommends **330 R**, see 3.2) | axial, 10.16 mm pitch | (21, 11) | along x | 12 x 2 | 2.6 | 1 k: brown-black-red-gold; 330 R: **orange-orange-brown-gold**; silk "1K" (or "330") at (21, 14.2) |
| Q1 | **PN2222A** NPN | TO-92, 3 leads (1.27 mm straight or formed to 2.54 mm) | (32.5, 11.5) | flat face toward -y (front), pins left-to-right **E, B, C** seen from the flat face | 5 x 5 | 8 (body 4.6-5.3 tall + ~3 mm leads; TO-92 dims are typical, the drawing in [5] was not extracted) | pads (1.27 mm straight leads): **E (31.23, 11.5), B (32.5, 11.5), C (33.77, 11.5)** (derived; matches the original base/collector trace ends); black epoxy, laser marking "PN2222A" / logo / date code (exact marking layout unverified) |
| D1 | 1N4007 flyback diode | DO-41 axial, 10.16 mm pitch (estimated) | (18, 23.5) | along x, **band (cathode) toward the battery + side** | 12 x 2 | 2.6 (body 2.0-2.7 dia [8]) | black body, **silver/grey band** at the cathode, white print "1N4007"; silk "1N4007" 1.5 at (18, 21.6) |
| R2 | LED resistor 1 k, 1/4 W 5 % | axial | (22, 32) | along x | 12 x 2 | 2.6 | brown-black-red-gold; silk "1K" at (22, 36) |
| LED1 | Green 5 mm LED, ON indicator | T-1 3/4 | (44.5, 32) | flat toward -x (design choice) | 5 x 5 | 12 | green diffused; polar (correction 12) |
| C1 | 100 uF electrolytic across the battery | radial 6.3 mm, 2.5 mm pitch | (50, 18) | - | 6 x 6 | 7.3 (original) | silk "+" 2.2 at (50, 21.5) on the + pad side |
| J1 | 2-way screw terminal, battery | 5.0 mm pitch (5.08 also common) | (41, 4.5) | wire entries face **-y (front edge)** | 10 x 7 | 10 | green; screws on top; pins **x 38.5 = BATT -, x 43.5 = BATT +**; silk "BATT" at (41, 10), "+" at (46.4, 10) |
| J2 | 2-way screw terminal, motor | 5.0 mm pitch | (4.5, 25) | wire entries face **-x (left edge)** | 7 x 10 | 10 | blue; pins **y 27.5 = MOTOR + (to BATT +), y 22.5 = MOTOR - (to Q1 collector)**; silk "MOTOR" 1.9 at (4.5, 32.6) |

**Silkscreen**: "NPN SWITCH" 3.2 at (27, 37); "GND 5V IN" 1.5 at (9.8, 6.4); "MOTOR" 1.9; "BATT" 1.9; "+" 2.2 at (46.4, 10) and
(50, 21.5); "1K" 1.6 at (21, 14.2) and (22, 36); "1N4007" 1.5 at (18, 21.6). Add (iynk): "E B C" under Q1 and the TO-92 outline
with its flat side; "+" next to LED1's anode; "Q1", "D1", "R1", "R2", "C1" reference designators.

**Circuit** (original `sig.base`, `load`, `ret`): H1.IN -> R1 -> Q1 base. BATT + (J1) -> C1 + -> J2 MOTOR+ ; J2 MOTOR- -> Q1
collector; Q1 emitter -> GND bus -> J1 BATT - and H1 GND (shared ground). D1 cathode to BATT + / MOTOR+, anode to MOTOR- / collector.
LED1 + R2: BATT + -> R2 -> LED1 -> collector node, so LED1 lights when Q1 pulls the collector low (original deco ends at the collector
side; exact LED1 return node is an iynk design choice, unverified in the original). H1 5V is not needed by the circuit (it can feed
nothing or only an optional pull-down); keep it for the lesson on shared ground.

**On the mat** (original): Arduino Nano in front of the board, USB toward the viewer; a 4 x AA holder right of the Nano (use a real
size, about 62 x 58 x 15 mm side-by-side holder, red/black leads, unverified dims); a TT gear motor left of the board, wheel facing
+x (motor body 70 x 22 x 18 mm [13]; wheel about 65 mm dia x 26 mm, yellow hub with black tyre, unverified). Jumpers Nano -> H1:
black GND, red 5V, yellow D9 -> IN.

**Pulldown recommendation (iynk, not in the original)**: a 10 k from base to emitter (or IN to GND) keeps Q1 off while the Nano is
in reset/bootloader (pins are high-impedance inputs then, so the base floats). Unverified as a requirement; standard practice.

## 3. Electrical

### 3.1 Fig. 02

- **Supply**: USB VBUS, nominally 5 V (USB 2.0 host ports 4.75-5.25 V; USB-C sources up to 5.5 V; from the USB specs, not re-read
  this session). No regulator, no polyfuse on the board; protection is the charger's own current limit.
- **LED (WP7113ID class) [1]**: V_F 1.9 V typ / 2.3 V max at 10 mA; ~2.0-2.1 V at 20 mA (from the datasheet I-V curve, estimated);
  IF 30 mA DC max; IFP 160 mA at 1/10 duty, 0.1 ms; VR 5 V (IR <= 10 uA); PD 75 mW; Tj 125 C; Rth j-a 560 C/W.
  Generic hobby 5 mm red LEDs are commonly quoted as V_F 1.8-2.2 V at 20 mA, 20 mA continuous / 30 mA max (vendor listings; unverified).
- **Current per row** (V = 5.00 V; correct formula **I = (V - V_F) / R**, resistor power **P_R = I^2 R = (V - V_F)^2 / R**, LED power P_D = V_F I):

| Row | R (5 %) | V_F used | I | P_R | P_LED | Verdict |
|---|---|---|---|---|---|---|
| 220 | 209-231 ohm | 2.0 V | **13.6 mA** (13.0-14.4 mA over the 5 % tolerance) | **40.9 mW** (1/4 W part: 16 % of rating) | 27 mW | bright, safe |
| 1K | 950-1050 | ~1.8 V at 3 mA (estimated) | **3.0-3.2 mA** | 9.0-10 mW | 6 mW | clearly lit, indicator level |
| 10K | 9.5-10.5 k | ~1.7 V (estimated) | **0.30-0.33 mA** | 0.9-1.1 mW | 0.6 mW | dim but visible (high-efficiency red at 0.3 mA is visible indoors) |
| NONE (0 R link) | ~0 | - | **hundreds of mA (estimate)** | - | > 0.5 W | destroys the LED (see 6) |

  With V_F at its 2.3 V maximum the 220 R row gives 12.3 mA; with USB at 5.25 V and V_F 1.9 V it gives 15.2 mA: always inside 30 mA.
- **Smallest safe resistor**: R_min = (V_max - V_F,min) / I_F,max = (5.25 - 1.8) / 0.030 = 115 ohm -> nearest E12 above: 120 ohm;
  for a 20 mA design: (5 - 2.0)/0.020 = 150 ohm. Quiz value 330 R -> (5 - 2)/330 = **9.1 mA**.
- **C1**: 100 uF across VBUS after SW1. Note: USB 2.0 limits a device's capacitance across VBUS at attach to 10 uF for inrush (USB 2.0
  spec 7.2.4.1, from memory, unverified this session); 100 uF on a charger is fine in practice but is not "USB-compliant".
  Inrush when SW1 closes = limited by the charger and cable resistance; it is not needed for the LED and is there to teach polarity.
- **Multimeter in series** [2][3]: red lead in the **mA** jack (not V/ohm), black in COM, rotary on mA DC; meter between TP1 (+, from the
  LED cathode) and TP2 (COM, to GND). Fluke 87V class: mA/uA jack fused **440 mA / 1000 V**, A jack **11 A / 1000 V**, 10 A continuous,
  20 A for 30 s; burden ~**1.8 mV/mA** on the mA input, so at 13.6 mA the meter drops ~24 mV (0.8 % of the 3 V on the resistor:
  negligible); at 100 mA 0.18 V. Budget meters (DT-830 class): 200 mA range fused (typically 200-250 mA glass fuse), **10 A jack
  often unfused** (unverified, varies). Display: positive reading when current enters the mA/red jack; reversed leads show "-13.6".

### 3.2 Fig. 03

- **Logic side**: Arduino Nano (ATmega328P at 5 V, 16 MHz) pin D9 (PB1, OC1A, Timer1, 490.2 Hz PWM) [14]. Per pin: **20 mA
  recommended, 40 mA absolute max**; total VCC/GND 200 mA [14]. VOH >= 4.2 V at 20 mA source, VCC = 5 V (ATmega328P datasheet
  DC characteristics, from memory, unverified this session); near 4.9 V at a few mA.
- **Transistor PN2222A** [5]: VCEO 40 V, VCBO 75 V, VEBO 6.0 V, IC 1.0 A abs max (500 mA intended), PD 625 mW at 25 C (derate 5 mW/C),
  Rth j-a 200 C/W, hFE 100-300 @150 mA/10 V, >= 50 @150 mA/1 V, >= 40 @500 mA/10 V; VCE(sat) <= 0.3 V @150 mA (IB 15 mA),
  <= 1.0 V @500 mA (IB 50 mA); VBE(sat) 0.6-1.2 V @150 mA, <= 2.0 V @500 mA; fT >= 300 MHz.
  **2N2222A (TO-18)** [6][7]: same die family and electrical table; metal can, collector on the case, leads E-B-C counted from the tab;
  ST: IC 0.6 A, Ptot 0.5 W; Microchip JAN: VCEO 50 V, IC 0.8 A.
- **Base resistor sizing (corrected)**: R_B = (V_OH - V_BE(sat)) / I_B with I_B = I_C / beta_forced, beta_forced = 10 (datasheet
  saturation condition) to 20 (practical).
  - Original 1 k: I_B = (5.0 - 0.8) / 1000 = **4.2 mA** (4.3 mA with 0.7 V). Saturates hard only up to ~40-85 mA. At 250 mA it relies on
    hFE (>= 50 at VCE 1 V -> >= 210 mA guaranteed), so VCE sits at a few tenths of a volt to ~1 V (estimate), P_Q up to ~0.25 W.
  - Recommended **330 R**: I_B = (5.0 - 0.85) / 330 = **12.6 mA** (pin current inside 20 mA): beta_forced = 20 at 250 mA, VCE ~0.2-0.4 V
    (estimate between the 150 and 500 mA spec points), P_Q ~ 0.05-0.1 W, cool.
  - From a 3.3 V board: (3.3 - 0.8)/1000 = 2.5 mA (1 k); use 150-220 R there.
  - Stall: TT motor at 6 V stalls at **1.5 A** [13], above the PN2222A's useful range; Q1 then limits the current to hFE x I_B
    (~0.6-1.5 A with 12.6 mA, typical hFE, unverified) with several volts across it -> > 1 W, it overheats within seconds. Teach:
    "a 2222 is fine for a lightly loaded TT motor, use a logic-level MOSFET or a driver (TB6612, Fig. 05) for stall-proof drive".
- **Motor (TT 1:48, 3-6 V) [13]**: no-load 150-160 mA (3-6 V); stall 1.1 A @3 V, 1.2 A @4.5 V, 1.5 A @6 V; 120/185/250 rpm no-load
  at 3/4.5/6 V measured (rated min 90 rpm @3 V, 200 rpm @6 V). A wheel on a bench draws close to no-load; driving a robot ~200-300 mA
  (unverified). Keep "~250 mA running" as an order-of-magnitude figure and say it is load-dependent.
- **Flyback diode 1N4007** [8]: 1000 V, 1 A average, 30 A surge, VF <= 1.1 V at 1 A. At turn-off the coil current (I_motor) keeps
  flowing through D1 and decays; the collector is clamped at V_batt + V_F (~6.5-7 V) instead of flying to Q1's breakdown. It is a
  standard-recovery rectifier (recovery in the microsecond range, exact trr not in [8]; unverified): fine at 490 Hz; for PWM above a
  few kHz a Schottky (1N5819, 1N5817) is better.
- **Inductive kick without D1**: V = L di/dt; with di/dt from a 25 ns transistor turn-off it would be kilovolts, so in practice the
  collector rises until Q1 avalanches (BVCEO 40 V / BVCBO 75 V [5]) and the coil's 1/2 L I^2 is dumped into Q1. TT motor inductance
  is not published (a few hundred uH to ~1-2 mH is typical for this class, unverified): at 0.25 A and 1 mH that is ~31 uJ per switch-off.
- **LED1 + R2**: green LED V_F ~2.0-2.2 V for a GaP/AlGaInP "yellow-green" LED, ~2.8-3.2 V for an InGaN "true green" (typical, unverified);
  I = (V_batt - VCE(sat) - V_F)/1 k = (5.6 - 0.2 - 2.1)/1000 = **3.3 mA** (NiMH fresh) or ~2.5 mA with a true-green LED.
- **C1 100 uF** across the battery: rating >= 10 V (16 V typical); supplies the start-up spike locally and soaks brush noise.
- **4 x AA** [10][11]:

| | Alkaline (Energizer E91) | NiMH (Energizer NH15-2300) |
|---|---|---|
| Cell nominal | 1.5 V | 1.2 V |
| Fresh / just-charged open circuit | ~1.55-1.6 V (typical, unverified) | ~1.35-1.4 V (typical, unverified) |
| End of life | 0.8-1.0 V (datasheet curves run to 0.8 V) | ~1.0 V |
| Pack nominal / fresh | 6.0 V / ~6.3-6.4 V | 4.8 V / ~5.4-5.6 V |
| Internal resistance per cell | **150-300 mohm fresh**, rises as it discharges | **30 mohm charged, 40 mohm half-discharged** |
| Pack IR (4 cells + holder springs) | 0.6-1.2 ohm + contacts | 0.12-0.16 ohm + contacts (holder springs add ~0.05-0.1 ohm, unverified) |
| Sag at 1.5 A stall | 0.9-1.8 V | ~0.2-0.3 V |

  The original's "4 x AA = 4.8-6 V" is right as a nominal range (NiMH to alkaline). A fresh alkaline pack at 6.4 V slightly exceeds a
  reversed PN2222A's 6 V VEBO (correction 10).

## 4. Pinout

### Fig. 02

| Connector | Pin | Label | Function | Voltage | Notes |
|---|---|---|---|---|---|
| J1 USB-C | VBUS (A4/A9/B4/B9) | 5V | supply in | 4.75-5.5 V | |
| | GND (A1/A12/B1/B12) | - | ground | 0 V | |
| | CC1 (A5), CC2 (B5) | - | 5.1 k to GND each (iynk R4, R5) | - | without them a C-to-C cable gives no VBUS |
| | D+/D- | - | not connected | - | power only |
| JP1 | rows 1-4 (y 22.89, 20.35, 17.81, 15.27) | 220 / 1K / 10K / NONE | cap joins the selected resistor to the LED anode | 5 V side | exactly one cap; two caps put resistors in parallel (e.g. 220 // 1k = 180 ohm -> 16.6 mA) |
| TP1 | - | + (TP+) | LED cathode side of the meter loop | ~0-0.05 V when the meter is in | red probe |
| TP2 | - | COM | GND | 0 V | black probe |

### Fig. 03

| Connector | Position | Label | Function | Voltage | Notes |
|---|---|---|---|---|---|
| H1-1 | x 7.27 | GND | logic ground, joined to battery - | 0 V | **must** be connected to the Nano GND |
| H1-2 | x 9.81 | 5V | Nano 5 V (reference only) | 5 V | not required by the switch circuit |
| H1-3 | x 12.35 | IN | to R1 -> Q1 base | 0 / 5 V logic, PWM 490 Hz | from Nano D9 |
| J1-1 | x 38.5 | BATT - | battery negative, GND bus | 0 V | |
| J1-2 | x 43.5 | BATT + | battery positive, motor +, C1 +, D1 cathode | 4.8-6.4 V | reverse polarity is unprotected (see 6) |
| J2-1 | y 27.5 | MOTOR + | to BATT + | V_batt | |
| J2-2 | y 22.5 | MOTOR - | to Q1 collector | V_batt (off) / ~0.2-1 V (on) | swapping motor leads only reverses rotation |
| Q1 (PN2222A, flat face to you, leads down) | left / middle / right | E / B / C | emitter to GND, base to R1, collector to MOTOR - | | P2N2222A would be C / B / E: check the part |

## 5. Programming

- Fig. 02 has no MCU: no code. Its "The math" panel should show the corrected Python:

```python
# Ohm's law for an LED:  I = (V_supply - V_F) / R
V_supply = 5.0     # volts from USB
V_F      = 2.0     # forward voltage of a red LED at ~10-20 mA (1.9 V typ at 10 mA)
R        = 220     # ohms, red-red-brown-gold

I = (V_supply - V_F) / R       # 0.0136 A = 13.6 mA
P_R = (V_supply - V_F)**2 / R  # 0.0409 W = 40.9 mW in the resistor (1/4 W part)
P_LED = V_F * I                # 27 mW in the LED (75 mW max)
# a 5 mm red LED: run it at 5-20 mA, never above 30 mA DC
```

- Fig. 03: Arduino Nano. IDE 2.x or arduino-cli, core **Arduino AVR Boards 1.8.8**, FQBN `arduino:avr:nano:cpu=atmega328` (or
  `atmega328old` for clones), avrdude **8.0.0-arduino1**, 115200 baud upload (57600 old bootloader); DTR auto-reset through 100 nF.
  Upload console text, boot behaviour and the factory Blink: see `nano.md` sections 5 and 9 (single source of truth). Sketch sizes in
  the original (742 / 806 / 690 bytes) are invented; real sizes come from compiling (unverified).
- During reset/bootloader (about 1 s after DTR) D9 is an input: Q1's base floats unless a pull-down is fitted, the motor may twitch.

## 6. Real failure modes

| Event | Fig. 02 | Fig. 03 |
|---|---|---|
| **Reverse polarity** | Not possible through USB-C (keyed, symmetric). LED inserted backwards: reverse-biased at <= 5 V, within VR 5 V [1]; leakage <= 10 uA, **stays dark, no damage** (at 5.25-5.5 V USB it is slightly over the rating but the resistor limits any leakage; typically survives, unverified). Electrolytic C1 backwards: see C1 row below | Battery leads swapped at J1 (worked through from the schematic in 2.2; estimates): the "BATT+" net sits ~6 V **below** GND. **C1 is reverse-biased: the casualty** (heats, bulges, vents in seconds to minutes depending on the current the pack can give [12]). D1 is not across the battery (its anode is on the collector node, which the motor pulls to the same potential as its cathode), so D1 carries ~0. Q1's base-collector junction becomes forward-biased: D9 -> R1 -> B-C -> motor -> negative rail, ~5-10 mA through the 1 k (safe for the pin); Q1 runs inverse with tiny gain, so **the motor does not turn**. LED1 sees ~0 V, stays dark. Observe: nothing moves, C1 warm, then bulged/vented with an electrolyte smell |
| **Over-voltage** | A non-USB 9-12 V source on the 5 V net: LED current rises ((9 - 2)/220 = 32 mA, just over IF 30 mA); 10 V on a 6.3 V-rated C1 vents it | 6 x AA or a 2S LiPo (8.4 V) on a 3-6 V TT motor: motor runs ~40 % faster, hotter, brush wear; still inside Q1's 40 V; C1 must be rated >= 10 V |
| **Brown-out** | n/a (no MCU); LED just dims with a weak supply | If the motor is wrongly powered from the Nano 5 V pin, its start current sags 5 V and the ATmega328P BOD (2.7 V) or USB polyfuse trips: Nano resets, L LED flashes the bootloader pattern, motor stutters [14]. With the separate pack and shared GND this does not happen |
| **Over-current** | NONE row: LED flashes very bright, its die and bond wires overheat in milliseconds-seconds; usually goes **open (dark for good)**, sometimes dim and discoloured; epoxy may brown and smell; meter fuse (200 mA cheap meter) may blow; the USB charger may fold back | Stall (wheel held): 1.1-1.5 A [13]; Q1 limits it with several volts across -> > 1 W, Q1 too hot to touch in seconds, may fail short (motor then runs full regardless of IN) or open. Motor windings heat. Alkaline pack sags 1-2 V |
| **Cold solder joint** | Intermittent LED (flicker when the board is touched), wrong meter reading; on J1 no power at all | On R1: motor never starts; on D1: no flyback (see "no D1"); on a screw-terminal pin: motor stutters, terminal heats |
| **5 V into a 3.3 V pin** | n/a | n/a on this board (the Nano is 5 V). If a 3.3 V board drives IN, nothing is harmed, Q1 just gets less base current |
| **Shorting 5 V to GND** | Across the USB supply: the charger's current limit / port protection cuts VBUS (charger LED off, laptop "USB device has malfunctioned/power surge" notice); thin traces may heat | H1 5V to GND shorts the Nano 5 V rail: USB polyfuse on the Nano trips, Nano goes dark, recovers after unplugging [14]. Shorting BATT+ to GND: alkaline pack gives several amps (limited by ~1 ohm IR), NiMH tens of amps (limited by ~0.15 ohm): wires and cells get hot quickly, NiMH can melt insulation |
| **Specific traps** | Meter in mA mode **put across the supply** (in parallel) = dead short through the shunt -> fuse blows (440 mA Fluke fuse, or the 200 mA fuse) or, on an unfused 10 A jack, the meter/track burns. Leaving the red lead in the mA jack and then "measuring voltage". Two jumper caps at once (parallel resistors). Electrolytic stripe on the wrong pad | Forgetting the shared GND: base current has no return, **Q1 never turns on** (quiz is right). TO-92 pinout mix-up PN2222A (EBC) vs P2N2222A (CBE) vs BC547 (CBE). Motor on the Nano pin directly: the pin (40 mA abs max) dies. Diode band the wrong way: motor won't run, Q1 hot. Base resistor omitted: pin sources > 40 mA into the B-E junction -> pin and/or B-E junction damaged |
| **C1 reversed (both boards)** | Aluminium oxide only blocks one way; reversed at 5 V the cap passes growing leakage, heats, gasses, **bulges, then the scored vent on top opens** with a hiss/pop and a fishy/acrid electrolyte smell; capacitance lost; possibly short [12]. Timescale seconds to minutes, faster with a stiff supply (unverified timing) | same |
| **No D1 (Fig. 03)** | | Each switch-off, the collector spikes to Q1's breakdown (~40-75 V): a few events usually survive, repeated avalanche in PWM degrades Q1 to leaky/short (unverified rate); the shared GND can glitch the Nano (resets) |
| **D1 reversed (Fig. 03)** | | While Q1 is on: D1 is forward across the motor from BATT+ to the collector, so the motor sees only ~0.9 V and barely turns, and Q1 carries hFE x IB (~0.2-1 A, estimate) at ~5 V: **Q1 hot**, D1 warm. While Q1 is off: nothing flows. |

Note on Fig. 03 reversed battery: the board has no reverse-polarity protection. The path above is worked out from the schematic,
not measured; if the H1 5V wire is also connected nothing extra flows, because 5V goes to no part on this board. A series Schottky
(costs ~0.3-0.5 V of motor voltage) or a P-MOSFET "ideal diode" in the BATT+ line would protect C1.

## 7. Lesson facts

1. **Ohm's law and an LED (Fig. 02, Blink-level I/O)**: pick each JP1 row; predict, then read the meter: 13.6 / 3.0-3.2 / 0.30-0.33 mA.
   Colour codes: **220 = red red brown gold**, **1k = brown black red gold**, **10k = brown black orange gold**, **330 = orange orange
   brown gold** (5 % carbon film, 4 band; digit, digit, multiplier, tolerance) [4]. 5-band 1 % metal film: 220 = red red black black
   brown; 1k = brown black black brown brown; 10k = brown black black red brown. Colour values: black 0, brown 1, red 2, orange 3,
   yellow 4, green 5, blue 6, violet 7, grey 8, white 9; gold x0.1 / +-5 %, silver x0.01 / +-10 %, brown +-1 %, red +-2 %.
2. **Measuring current (Fig. 02)**: break the loop, meter in series (TP1 red, TP2 black), mA jack, mA DC range; burden 1.8 mV/mA on
   a Fluke 87V [2]; never put the meter in current mode across a supply. Quiz: 330 R -> 9.1 mA.
3. **Transistor switch (Fig. 03, digital out)**:

```cpp
const int MOTOR_PIN = 9;          // D9 -> R1 -> Q1 base

void setup() {
  pinMode(MOTOR_PIN, OUTPUT);
}

void loop() {
  digitalWrite(MOTOR_PIN, HIGH);  // ~12.6 mA into the base (330 R): Q1 saturates, motor on
  delay(2000);
  digitalWrite(MOTOR_PIN, LOW);   // Q1 off: the coil current freewheels through D1
  delay(2000);
}
```

4. **PWM speed (Fig. 03)**: `analogWrite(9, value)` with value 0-255, duty = value / 255, 490.2 Hz on D9 (Timer1). `analogWrite(9, 128)`
   = 50.2 %. Motor average voltage ~ duty x V_batt minus VCE(sat); the 490 Hz whine is audible; low duty may not overcome stiction
   (TT motors typically need ~30-40 % at 6 V to start, unverified). Do not use the Servo library at the same time (it takes Timer1 and
   disables PWM on D9/D10) [14]. For silent PWM, Timer1 can be set to ~31 kHz (then use a Schottky flyback).
5. **Protocol lesson (Fig. 03 + Serial, UART)**: speed from the Serial Monitor:

```cpp
const int MOTOR_PIN = 9;

void setup() {
  pinMode(MOTOR_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("speed 0-255?");
}

void loop() {
  if (Serial.available()) {
    int speed = constrain(Serial.parseInt(), 0, 255);
    analogWrite(MOTOR_PIN, speed);
    Serial.print("duty ");
    Serial.print(speed * 100L / 255);
    Serial.println(" %");
  }
}
```

   (Set the Serial Monitor line ending to "No line ending" or parseInt() returns an extra 0 after the timeout; a known Arduino
   behaviour.) No libraries are needed: core only (Arduino AVR Boards 1.8.8).
6. **Button + sensor variant** (if a fourth hardware lesson is wanted on Fig. 03): `pinMode(2, INPUT_PULLUP)` with a button to GND
   switching the motor; the 10 k from Fig. 02 is the classic pull-up value (ATmega328P internal pull-up is 20-50 k, from the datasheet,
   unverified this session).

## 8. Internals (see-through view)

- **5 mm red LED (WP7113ID)**: GaAsP-on-GaP die about 0.25-0.3 mm square (unverified) glued with silver epoxy into the **reflector cup
  on the cathode lead** (the larger "anvil" inside the lens); a single gold bond wire (~25 um, unverified) arcs from the die's top
  pad to the **anode post** (the smaller "post"). Leads are tin-plated steel/copper alloy frame, 0.5 mm square (typical); clear-red
  diffused epoxy dome with a flat on the cathode side. Over-current failure: the bond wire or its ball bond fuses, or the die cracks.
- **Carbon-film resistor**: ceramic rod with a thin carbon film, a **helical groove** laser/diamond-cut through the film sets the
  value; pressed-on metal end caps with the leads welded on; several coats of lacquer, colour bands painted on.
- **0 R link**: just tinned copper wire.
- **Electrolytic 100 uF**: two aluminium foils (etched, anode with a formed Al2O3 dielectric) wound with paper spacers soaked in
  electrolyte, in an aluminium can sealed with a rubber bung; scored vent on top; plastic sleeve with the negative stripe.
- **PN2222A (TO-92)**: a small silicon die (~0.5 mm, unverified) on the **collector** paddle of a copper lead frame (die back =
  collector), two gold/copper bond wires to the base and emitter leads, transfer-moulded black epoxy.
  **2N2222A (TO-18)**: the die on a gold-plated header, collector to the case, two bond wires to the base and emitter posts, glass seals,
  welded nickel/steel can with the tab beside the emitter [6].
- **1N4007**: a glass-passivated silicon P-N junction chip (~1 mm, unverified) between two lead/slug contacts, moulded epoxy DO-41 body,
  the band marks the cathode (N side) [8].
- **TT motor**: a small brushed DC motor (130-size can, unverified) with two ferrite magnets, a 3-pole armature, carbon or metal
  brushes, driving a 1:48 plastic spur-gear train in a yellow two-part gearbox; double-D output shaft (dims unverified).
- **AA cell**: alkaline = zinc gel anode in the centre with a brass current-collector nail, MnO2 cathode ring against the steel can (+
  at the pip); NiMH = wound nickel hydroxide / metal-hydride electrodes with separator, + pip with a reseal vent.
- **Slide switch**: phosphor-bronze slider contacts in a moulded body.

## 9. Assembly and power-up

- All parts are through-hole, hand-soldered (or wave-soldered): lowest first: wire link JL1, resistors, diode (Fig. 03), then the
  header(s), switch, test points, Q1 (leave ~3 mm of lead to avoid overheating the TO-92), electrolytic, LEDs (keep 3 mm between the
  lens base and the PCB as Kingbright requires; solder at <= 260 C for <= 3-5 s [1]), screw terminals, USB-C last (or first if it is the
  SMD-pin version reflowed/hand-soldered with hot air). Jumper cap fitted last.
- Fig. 02 power-up: USB plugged, SW1 ON -> C1 charges (no visible effect), D1 lights at the brightness of the selected row, the meter
  reads the current immediately. No enumeration (no USB data).
- Fig. 03 power-up: Nano USB in -> Nano boots (its own PWR/L LEDs, bootloader ~1 s), then the sketch drives D9. Battery connected ->
  C1 charges (small spark at the terminal is normal with a stiff NiMH pack). With D9 HIGH: LED1 lights, the motor starts with a short
  current spike (up to the stall current for tens of ms), then settles near no-load current.

## 10. Uncertainties

- The two boards are custom: no manufacturer layout exists. Geometry is the original Robotics Bench layout; mounting hole diameter,
  pad positions, LED orientation, H1 pin-1 choice and the LED1 return node are iynk design choices.
- LED V_F at 20 mA, 3 mA and 0.3 mA was read from the shape of the WP7113ID I-V curve, not a table; generic hobby-LED specs come
  from vendor listings.
- No-resistor LED current ("hundreds of mA") is an engineering estimate; it depends on the LED's bulk resistance, the meter, cable
  and charger. Not measured.
- TO-92 body dimensions (about 4.6-5.2 wide, 3.6-4.2 deep, 4.6-5.3 tall) and the exact PN2222A marking were not extracted from [5].
- Budget-meter fuse ratings and burden voltage vary by model; only the Fluke 87V figures are sourced (burden from Fluke's blog).
- USB-C Rd = 5.1 k, USB VBUS ranges and the 10 uF inrush rule are from the USB specs as remembered; not re-read this session.
- TT motor running current under load, inductance, wheel size, inverse beta of a reversed transistor, the rate at which avalanche kills
  Q1, 1N4007 trr, electrolytic venting time and fresh-cell open-circuit voltages are typical values, not sourced.
- 100 uF electrolytic can size (original 6 x 6 x 7.3 mm vs ~6.3 x 11 mm for a 16 V general-purpose part) depends on the series chosen.
- ATmega328P VOH and internal pull-up values are quoted from memory of the datasheet; `nano.md` has the sourced per-pin limits.
