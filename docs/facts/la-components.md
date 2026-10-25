# Board Lab components: fact sheet (Learn Arduino parts + common sensors/actuators)

Status: written 2026-10-24 13:40 CDT and checked against sources until 13:55 CDT. Section 33 lists which primary sources were read this run and which values are from memory. Anything marked **(unverified)** could not be checked against a primary source inside the time box. Numbers marked **[n]** cite the source list in section 1.

## 0. Header

This sheet covers the discrete parts and hobby modules that the Board Lab lessons put on a breadboard next to an Arduino Uno R3 (see `uno-r3.md` for the board itself). It is one sheet with one section per component. For each part it gives: what a faithful breadboard drawing shows (size, pin order, polarity, colour, marking), the electrical facts a simulation needs, the idiomatic Arduino code, and what goes wrong in real life. Most of these parts are generic: many factories make "the same" module with different details. Where that matters, the variant modelled is named and the alternatives are listed.

Conventions used throughout:

- **Part frame**: looking down on the part as it sits in the breadboard, pins in the breadboard, +x right, +y away from the viewer, z up. Units mm. Pin order "left to right" means with the part's marked/front face toward the viewer unless stated.
- 0.1 in = 2.54 mm is the breadboard pitch.
- Uno logic: 5 V CMOS. VIL max 0.3 VCC = 1.5 V, VIH min 0.6 VCC = 3.0 V; pin absolute max 40 mA, recommended ≤ 20 mA; internal pull-up 20–50 kΩ (ATmega328P datasheet, see `uno-r3.md`).

Learn Arduino lesson to part map (from `docs/research/learn-arduino.md` §3):

| Lesson | Parts |
|---|---|
| 1 Meet the board | Uno only (L LED on D13) |
| 2 Blink | 5 mm LED, 220 Ω |
| 3 Button | 6 × 6 tactile button (the original's spec wrongly says 12 mm), 10 kΩ pull-down, LED, 220 Ω |
| 4 Knob | B10K potentiometer, LED, 220 Ω |
| 5 Mix colours | 5 mm RGB LED common cathode, 3 × 220 Ω |
| 6 Sense light | GL5528 LDR, 10 kΩ, LED, 220 Ω |
| 7 Read a sensor | HC-SR04 |
| 8 Make a sound | passive buzzer |
| 9 Mini piano | 8 tactile buttons, passive buzzer, "full-size" breadboard |
| 10 Motor | small DC motor, TIP120, 1 kΩ (+ 1N4001 flyback that the original omits) |
| 11 Sense heat | TMP36, TIP120, 1 kΩ, 5 V fan (+ flyback) |
| 12 Servo | SG90 |
| 13 Spin the wheel | 28BYJ-48 + ULN2003 board, button, 10 kΩ |
| 14 Smart plant | capacitive soil moisture v1.2, SSD1306 128×64 I²C OLED |
| 15 Feel the force | FSR 402, pull-down, SG90, passive buzzer |
| 16 Parking sensor | HC-SR04, traffic-light LED module |

Added for iynk: DHT11/DHT22, HC-SR501 PIR, 16×2 I²C LCD, WS2812B, relay module, joystick module, BME280, active buzzer, 1N4001/4007.

## 1. Sources

Official / primary first.

1. Microchip ATmega328P datasheet (DS40002061B), https://ww1.microchip.com/downloads/en/DeviceDoc/ATmega48A-PA-88A-PA-168A-PA-328-P-DS-DS40002061B.pdf — I/O levels, pin current, pull-ups, BOD.
2. Analog Devices TMP35/TMP36/TMP37 datasheet, https://www.analog.com/media/en/technical-documentation/data-sheets/TMP35_36_37.pdf (returns 404 on 2026-10-24; mirror read: https://cdn.sparkfun.com/datasheets/Sensors/Temp/TMP35_36_37.pdf) — scale, offset, supply, TO-92 pinout.
3. Fairchild (now onsemi) TIP120/TIP121/TIP122 datasheet, Oct 2008, mirror https://cdn-shop.adafruit.com/datasheets/TIP120.pdf (read this run) — ratings, hFE, VCE(sat), VBE(on), pinout 1 B / 2 C / 3 E, R1 ≈ 8 kΩ, R2 ≈ 0.12 kΩ. The onsemi edition is https://www.onsemi.com/download/data-sheet/pdf/tip120-d.pdf (not downloadable this run).
4. Diodes Inc. 1N4001–1N4007 datasheet DS28002, https://www.diodes.com/assets/Datasheets/ds28002.pdf (read this run) — VFM 1.0 V at 1 A, IFSM 30 A, VRRM. onsemi's edition (https://www.onsemi.com/download/data-sheet/pdf/1n4001-d.pdf) specifies VF 1.1 V max (from memory, not re-read).
5. Kiatronics "28BYJ-48 – 5V Stepper Motor" datasheet, mirror https://components101.com/sites/default/files/component_datasheet/28byj48-step-motor-datasheet.pdf (read this run) — rated 5 V, 50 Ω ±7 %, "speed variation ratio 1/64", stride angle 5.625°/64, 100 Hz, pull-in > 600 Hz, pull-out > 1000 Hz, torques. Wire colours and the 8-step sequence come from the two-page version of the same sheet that circulates with a wiring drawing (not re-read this run).
6. Gear-train teardown counts of the 28BYJ-48: teeth 9, 9, 10, 11 driving 32, 22, 26, 31, so (32·22·26·31)/(9·11·9·10) = 63.68395:1, 2037.8864 full steps/rev, 4075.7728 half steps/rev. Arduino forum "Geared Stepper Motor", https://forum.arduino.cc/t/geared-stepper-motor/71308; Solarbotics 28BYJ-48-64 page (lists 63.68395:1 and 2038 steps), https://solarbotics.com/?p=88460.
7. Texas Instruments ULN2003A datasheet, https://www.ti.com/lit/ds/symlink/uln2003a.pdf (read this run) — 500 mA per channel, 50 V, built-in common-cathode clamp diodes, 2.7 kΩ series base resistor, VCE(sat) 0.9 V typ / 1.1 V max at 100 mA and 1.0 V typ / 1.3 V max at 200 mA.
8. TowerPro SG90 datasheet as reproduced at https://www.friendlywire.com/projects/ne555-servo-safe/SG90-datasheet.pdf (read this run) — 9 g, 22.2 × 11.8 × 31 mm, 1.8 kgf·cm, 0.1 s/60°, 4.8 V, dead band 10 µs, 0–55 °C, 1.5 ms centre, pulse cycle ca. 20 ms, pulse width 500–2400 µs, 180°.
9. Arduino Servo library source (`Servo.h`: MIN_PULSE_WIDTH 544, MAX_PULSE_WIDTH 2400, DEFAULT 1500, REFRESH_INTERVAL 20000), https://github.com/arduino-libraries/Servo — Servo API and pulse limits.
10. Senba / Real Chance GL55-series photoresistor datasheet (GL5516…GL5549 table); Senba GL5528 listing at LCSC C125627, https://www.lcsc.com/product-detail/C125627.html; the SparkFun mirror https://cdn.sparkfun.com/datasheets/Sensors/LightImaging/SEN-09088.pdf is image-only (no extractable text). GL5528 row: 10–20 kΩ at 10 lux, 1 MΩ dark, γ 0.6, 20 ms rise / 30 ms decay (confirmed via search summaries of the GL55 table this run; some sellers quote γ 0.65–0.7 or 8–20 kΩ).
11. Interlink Electronics FSR 400 Series data sheet (copy read in the fact-check: https://www.teachengineering.org/content/uconn_/activities/uconn-2662-contractions-calculations-force-resistance-activity/uconn-2662-contractions-calculations-FSR400series-datasheet.pdf) and FSR 402 page, https://www.interlinkelectronics.com/fsr-402 — dimensions, force range, repeatability.
12. Adafruit "Force Sensitive Resistor (FSR)" guide, https://learn.adafruit.com/force-sensitive-resistor-fsr/using-an-fsr (read this run) — force vs resistance table with a 10 kΩ pull-down at 5 V.
13. Solomon Systech SSD1306 datasheet Rev 1.1, https://cdn-shop.adafruit.com/datasheets/SSD1306.pdf — I²C address 0b011110 SA0, controller.
14. Adafruit_SSD1306 library (2.5.17, 2026-05-29) and Adafruit-GFX (1.13.0, 2026-10-20), https://github.com/adafruit/Adafruit_SSD1306 — API. Versions read from the GitHub releases API on 2026-10-24.
15. U8g2 (Arduino release 2.37.1, tag list read 2026-10-24), https://github.com/olikraus/u8g2 — constructor names and API.
16. Aosong DHT11 and AM2302 (DHT22) datasheets, https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf and https://cdn-shop.adafruit.com/datasheets/Digital+humidity+and+temperature+sensor+AM2302.pdf — ranges, protocol, pinout.
17. Adafruit DHT sensor library 1.4.7 (2026-03-03), https://github.com/adafruit/DHT-sensor-library.
18. HC-SR501 PIR module manual (BISS0001), formerly https://www.mpja.com/download/31227sc.pdf (404); the same document was read in the fact-check at https://courses.ece.cornell.edu/ece5990/ECE5725_Spring2020_Projects/May_15_Demo/Smart%20Lock/W_pp445_yl656/datasheet/31227sc.pdf — supply, delay, trigger jumper, range, size, lens, block time, warm-up.
19. NXP PCF8574/PCF8574A datasheet, https://www.nxp.com/docs/en/data-sheet/PCF8574_PCF8574A.pdf (served an HTML page, not the PDF, on 2026-10-24); TI PCF8574 / PCF8574A datasheets read instead, https://www.ti.com/lit/ds/symlink/pcf8574.pdf and https://www.ti.com/lit/ds/symlink/pcf8574a.pdf — address byte L H L L A2 A1 A0 (0x20–0x27) / L H H H A2 A1 A0 (0x38–0x3F).
20. Hitachi HD44780U datasheet — 16×2 character LCD controller, 5 V. hd44780 library by Bill Perry 1.3.2, https://github.com/duinoWitchery/hd44780; LiquidCrystal_I2C (johnrickman/marcoschwartz, tag 1.1.3).
21. Worldsemi WS2812B datasheet (the version hosted by Adafruit), https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf (read this run) — VDD 3.5–5.3 V, VIH 0.7 VDD, T0H 0.4 / T1H 0.8 / T0L 0.85 / T1L 0.45 µs ±150 ns, RES above 50 µs, pins 1 VDD 2 DOUT 3 VSS 4 DIN. The later WS2812B-V5 sheet specifies reset ≥ 280 µs (from memory, not re-read).
22. Adafruit NeoPixel Überguide, https://learn.adafruit.com/adafruit-neopixel-uberguide/best-practices — 300–500 Ω data resistor, ≥ 1000 µF cap, 60 mA/pixel. Adafruit_NeoPixel 1.15.5 (2026-05-12); FastLED 3.10.8 (2026-10-18).
23. Songle SRD relay datasheet, e.g. https://www.circuitbasics.com/wp-content/uploads/2015/11/SRD-05VDC-SL-C-Datasheet.pdf — coil 5 V, 70 Ω, ~71 mA, contacts 10 A.
24. Everlight / Sharp PC817 datasheet — optocoupler on relay modules.
25. Bosch BME280 datasheet (document BST-BME280-DS001-23, rev 1.23, Jan 2022), https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf (read this run) — VDD 1.71–3.6 V, VDDIO 1.2–3.6 V, abs max 4.25 V, address 111011x = 0x76/0x77 by SDO, chip ID 0x60, ranges, accuracy, 3.6 µA at 1 Hz. Adafruit_BME280 2.3.0 (2025-04-30), Adafruit Unified Sensor 1.1.15.
26. Capacitive soil sensor clone faults: atomic14 "Capacitive soil moisture v1.2/v2.0", https://www.atomic14.com/esp32/sensors/capacitive-soil/ (NE555 instead of TLC555, missing 1 MΩ bleed resistor); Soldered docs, https://docs.soldered.com/simple-sensor/capacitive-soil-sensor/how-it-works/ (original design uses TLC555CD); Andreas Spiess's YouTube video on these sensors (episode number not verified; not re-watched; the "missing regulator" and "R4 not grounded" faults are from memory).
27. HC-SR04 user guide (ElecFreaks / Cytron), https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf — 5 V 15 mA, 40 kHz, 2–400 cm, 15°, 10 µs trigger, µs/58 = cm.
28. Arduino language reference: `tone()` (https://docs.arduino.cc/language-reference/en/functions/advanced-io/tone/), `analogWrite()`, `pinMode()`. Arduino AVR core 1.8.8 (2026-05-21).
29. Mabuchi FA-130RA datasheet, https://www.mabuchi-motor.com/ (FA-130RA product page/PDF) — small DC motor currents.
30. IEC 60062 resistor colour code (via e.g. https://en.wikipedia.org/wiki/Electronic_color_code) — colours and tolerance bands.
31. Omron B3F tactile switch datasheet, https://omronfs.omron.com/en_US/ecb/products/pdf/en-b3f.pdf (read this run) — 6 × 6 mm body, 4.3 mm standard height (5 mm, 7.3 mm projected versions), PCB holes 6.5 × 4.5 mm, terminal-arrangement drawing (top view) with 4 3 on one row and 2 1 on the other, 1–2 and 3–4 internally connected; rating 1–50 mA at 3–24 VDC; bounce 5 ms max; operating force 0.98–4.9 N by model.
32. Alps / Alpha RV16 potentiometer data, e.g. https://www.taiwanalpha.com.tw/ (RV16AF-41 series) — 300° total rotation (unverified for the exact part modelled).
33. BusBoard BB830 product page, https://www.busboard.com/BB830 (read this run) — 165.1 × 54.6 × 8.5 mm, 830 tie points (630 terminal + four 50-point rails), red (+) and black (−) rail legend, white ABS with black legend (BB830T transparent), grid references every 5 columns. The page does not say whether rails are split. BB400 page (https://www.busboard.com/BB400) not read this run.
34. AccelStepper 1.64 (2022-11-24) by Mike McCauley, https://www.airspayce.com/mikem/arduino/AccelStepper/ — `AccelStepper::FULL4WIRE`, `HALF4WIRE`, pin order.
35. Learn Arduino teardown, `docs/research/learn-arduino.md` §3 and §9 — what the original shows and its errors.

## 2. Breadboards

### 2.1 Full-size 830 tie-point (BB830-style)

- Tie points: 630 terminal (63 numbered columns × 10 rows a–j) + 200 rail (4 rails × 50) = 830 [33].
- Size: 165.1 × 54.6 × 8.5 mm (BusBoard BB830: 6.5 × 2.2 × 0.3 in) [33]. White ABS body with a black legend (BB830T transparent) [33], adhesive foam back.
- Pitch 2.54 mm everywhere. Columns are numbered 1–63 along the long edge; rows lettered a–e and f–j across the short edge. Numbers are printed every 5 (1, 5, 10, …, 60) and letters at both ends.
- **Terminal strips**: each numbered column is two 5-hole strips: a–e joined, f–j joined. The two halves are separate.
- **Trench (DIP channel)**: the gap between row e and row f. Centre-to-centre e→f is 7.62 mm (0.3 in, three pitches), so a 0.3 in DIP chip straddles it. The trench is ~2.5 mm wide (unverified exact width).
- **Power rails**: two at each long edge, outside the terminal area, marked with a red line (+) and a black (BusBoard [33]) or blue (most clones) line (−). Holes come in groups of 5 with one pitch gap between groups; 10 groups = 50 holes per rail. The rail sits ~1 extra pitch away from row a/j (unverified exact offset).
- **Split rails**: on many 830 boards each rail runs the full length (BusBoard does not say for the BB830 [33]); on some boards each rail is split in the middle (between holes 25 and 26), shown as a break in the red/blue printed line. A simulation must model "rail continuous" vs "rail split" as a board property and show the break in the printed line. Beginner trap: on a split-rail board the right half of the rail is dead until jumpered.
- Top rail pair is commonly ordered (from the edge inward) − then + on the top and + then − on the bottom, but the printing varies by maker; always read the printed line colour.

### 2.2 Half-size 400 tie-point (BB400-style)

- 300 terminal (30 columns × 10 rows) + 100 rail (4 rails × 25, five groups of 5) = 400 [33].
- Size: about 82.5 × 54.6 × 8.5 mm (BusBoard BB400 3.25 × 2.15 × 0.33 in; from memory, unverified this run). Rails continuous (no split) on a 25-hole rail.
- Same row lettering, trench and 7.62 mm e→f spacing.

### 2.3 What Learn Arduino drew (corrections)

- The default "half-size breadboard" in the original has **23 columns and no rails**. No standard board looks like that: a real half board has 30 columns and four rails; a "mini 170" has 17 columns and no rails. iynk should draw a real 400 (30 columns, 4 rails).
- The piano lesson calls a board with "30 columns with + and − rails" a "full-size" breadboard. That is a **half-size 400**. A full 830 has 63 columns.

## 3. Resistors and the colour code

- Lesson values: 220 Ω (LED), 1 kΩ (TIP120 base), 10 kΩ (pull-down, LDR divider), FSR pull-down (param, typically 10 kΩ).
- Package: axial through-hole 1/4 W carbon film: body ≈ 6.0–6.5 mm long × 2.3–2.5 mm diameter, beige/tan body, tinned leads 0.5–0.6 mm (typical, unverified for a specific maker). 1 % metal-film parts are usually blue with 5 bands. Lead bend for a breadboard: 4 holes (10.16 mm) between legs fits a 1/4 W body; the original uses 4-hole span, which is fine.
- Colour code (IEC 60062) [30]: black 0, brown 1, red 2, orange 3, yellow 4, green 5, blue 6, violet 7, grey 8, white 9. Multiplier: same digits as powers of ten, gold ×0.1, silver ×0.01. Tolerance: brown ±1 %, red ±2 %, gold ±5 %, silver ±10 %.
- 4-band (5 %): 220 Ω = red red brown gold; 1 kΩ = brown black red gold; 10 kΩ = brown black orange gold; 330 Ω = orange orange brown gold; 4.7 kΩ = yellow violet red gold.
- 5-band (1 %): 220 Ω = red red black black brown; 1 kΩ = brown black black brown brown; 10 kΩ = brown black black red brown.
- Drawing: bands start near one end; the tolerance band is set slightly apart at the other end. Read from the end with the bands closest to the lead.
- Sim: ideal resistor; power P = I²R; 1/4 W = 250 mW (5 V across 100 Ω = 250 mW, the limit; across 10 Ω it smokes).

## 4. 5 mm LEDs

- Package: T-1¾, 5.0 mm dome, flange ≈ 5.8 mm with a **flat on the cathode side**, body height ≈ 8.6 mm above the flange base (typical), leads 2.54 mm apart, 0.5 mm square. **Anode = longer leg** (by ~1–2 mm on new parts). Inside: the cathode post is the larger "anvil" (reflector cup holding the die); the anode post is the smaller one with the bond wire.
- Absolute max current typically 20–30 mA continuous; design for 10–20 mA (manufacturer datasheets vary; unverified per maker).
- Forward voltage at ~20 mA (typical values; varies by chip):

| Colour | Chip | Vf typ (range) |
|---|---|---|
| Red (620–630 nm) | AlGaInP | 2.0 V (1.8–2.2) |
| Orange/Amber | AlGaInP | 2.0–2.1 V |
| Yellow (590 nm) | AlGaInP | 2.1 V (1.9–2.4) |
| Green, yellow-green (565–570 nm, "classic" GaP) | GaP | 2.1–2.2 V |
| Green, pure/true (520–525 nm) | InGaN | 3.0–3.2 V |
| Blue (465–470 nm) | InGaN | 3.0–3.2 V |
| White | InGaN + phosphor | 3.0–3.3 V |

  The original uses red 2.0, yellow 2.1, green 2.2, blue 3.0, white 3.1; acceptable for a classic GaP green. Say which green it is.
- Current: I = (5 − Vf)/R. 220 Ω red: (5 − 2.0)/220 = 13.6 mA. The original's spec rounds this as "(5 − 2) ÷ 220 ≈ 14 mA": fine. The pin's own output drops a few hundred mV under load (ATmega328P VOH ≥ 4.2 V at 20 mA, VCC = 5 V [1], from memory), so real current is ~12–13 mA.
- Failure: no resistor → the pin's driver limits current (roughly 40–80 mA, approximate, read off the VOH-vs-IOH curve; over the 40 mA abs max): LED very bright, pin and LED stressed, may fail over time. Reverse LED: no light, no damage at 5 V (LED reverse rating usually 5 V).

## 5. RGB LED, 5 mm, common cathode

- Four leads, 2.54 mm pitch. **Longest lead = common cathode**. With the flat of the flange on the left and the leads toward you, the order is: **R, common (−, longest), G, B** (typical for 5 mm diffused common-cathode parts; check the specific datasheet, ordering varies by maker, unverified for a universal claim).
- Vf: R ≈ 2.0 V, G ≈ 3.0–3.2 V, B ≈ 3.0–3.2 V (green here is InGaN). With 220 Ω on each: R ≈ 13.6 mA, G/B ≈ 8–9 mA, so the mix is red-heavy; using ~330 Ω on red balances it (optional lesson point).
- Common-anode variants: the long lead goes to 5 V and colours are active LOW (`analogWrite(pin, 255 - v)`).
- Drive from three PWM pins: Uno ~9, ~10, ~11 (pins 9/10 on Timer1 ≈ 490 Hz; pin 11 on Timer2 ≈ 490 Hz). Do not use `tone()` at the same time: it takes Timer2 and breaks PWM on 3 and 11 [28].

## 6. 6 × 6 mm tactile push button

- The common breadboard part is 6 × 6 mm (body), 4 legs, height 4.3–9.5 mm depending on plunger (Omron standard 4.3 mm, 5 mm and 7.3 mm versions [31]; the original's "12 mm" spec belongs to the larger 12 × 12 switch). Omron B3F is the reference design [31].
- **Terminal spacing 6.5 mm × 4.5 mm** [31]. The legs exit from two opposite sides of the body, two per side, 4.5 mm apart on each side; the two sides are 6.5 mm apart. Omron's top-view drawing numbers them 4 (top-left), 3 (top-right), 2 (bottom-left), 1 (bottom-right), with the 6.5 mm dimension horizontal (between 2 and 1, and between 4 and 3) [31].
- **Internal connection**: pins **1–2** are joined and pins **3–4** are joined (always connected) [31]: each always-connected pair is the two legs that face each other across the 6.5 mm direction, on opposite sides of the body. Pressing the plunger joins pair 1–2 to pair 3–4. Equivalently: the two legs on the **same side** (4.5 mm apart) are the switched pair.
- On a breadboard: straddle the trench with the 6.5 mm direction across it (legs bend to fit 7.62 mm). Then the leg in row e and the leg in row f of the same column are always connected, and **pressing connects the two columns**. This matches the original's wiring (legs at e8/f8 and e10/f10; 5 V on column 8, D2 and the 10 kΩ on column 10). The 4.5 mm spacing is stretched to 5.08 mm (two pitches).
- Beginner trap: only the 6.5 mm direction can straddle the trench (4.5 mm cannot reach 7.62 mm). When the button is pushed in on one side of the trench, the orientation matters: if the two same-side legs (the switched pair, 4.5 mm apart) land in the **same 5-hole column strip**, the breadboard shorts the switch and the input always reads "pressed"; turned 90° the other way it works. The sim should model this from the leg positions, not from a fixed rule.
- Electrical (Omron B3F) [31]: rating 1–50 mA at 3–24 V DC (resistive); **bounce 5 ms max**; operating force 0.98–2.55 N for the common models (the generic clone kit buttons are ~1.6 N, unverified). Standard body height 4.3 mm; the common kit part with a tall round plunger is 7.3–9.5 mm (generic, unverified).
- Wiring options:
  - Pull-down (original lesson 3): button from 5 V to pin, 10 kΩ pin to GND; pressed = HIGH.
  - `INPUT_PULLUP` (piano lesson): button from pin to GND; pressed = LOW. Internal pull-up 20–50 kΩ [1].
- Code: `pinMode(2, INPUT);` `if (digitalRead(2) == HIGH)`. Debounce with `millis()` (≥ 20–50 ms window).
- Drawing: black square body with a round plunger (black, or coloured caps), four silver legs, a small metal frame on top on some versions.

## 7. B10K potentiometer

- "B" = linear taper (Asian marking convention; "A" = audio/log). 10 kΩ ±20 % end to end.
- Common kit part: 16 mm or 9 mm rotary with three legs in a row on 5.0 mm (16 mm pot) or 2.5 mm (9 mm, RK09) pitch, plus mounting tabs; or a blue 3386-style trimmer. A breadboard-friendly kit pot has legs on ~5 mm spacing that fit a 2.54 mm grid with 2-hole spacing (unverified for every kit).
- Pins (shaft toward you, legs down): **1 left (CCW end), 2 middle (wiper), 3 right (CW end)**. Turning clockwise moves the wiper from pin 1 toward pin 3. Wire 1 to GND and 3 to 5 V and the voltage rises clockwise. (The original wires 5V→left, GND→right, so its voltage rises counter-clockwise; either is valid, but state it.)
- Rotation: about **300°** total for 16 mm/9 mm carbon pots [32] (the original says 270°; trimmers are often 240–270°). (unverified for the exact part modelled; use 300° for an RV16/RK09-type pot.)
- Sim: Vwiper = 5 V × θ/θmax; `analogRead(A0)` = floor(1024·V/5), clamped to 0–1023 (ATmega328P: ADC = Vin·1024/Vref [1]).
- Code: `int v = analogRead(A0); analogWrite(9, v / 4);` or `map(v, 0, 1023, 0, 255)`.

## 8. LDR GL5528

- CdS photoresistor, 5 mm class: ceramic disk ≈ 5.1 mm diameter × ~2 mm thick with an epoxy coat, a zig-zag orange-red CdS track between two silver comb electrodes, two leads (non-polar) on ~3.4 mm spacing (unverified exact) [10].
- GL5528 from the GL55 table [10]: light resistance at 10 lux (2856 K): **10–20 kΩ**; dark resistance (measured 10 s after a 10 lux light is switched off): **1 MΩ (minimum)**; **γ (100/10 lux) = 0.6** (some sellers say 0.65–0.7; trust the maker table); rise time 20 ms, decay 30 ms [10]. Peak wavelength 540 nm, max voltage 150 V DC, max power 100 mW, −30 to +70 °C (all confirmed in the fact-check against the GL5528 sheet at https://static.rapidonline.com/pdf/58-0134_v1.pdf, which lists 10–20 kΩ, 1 MΩ, γ 0.6, 20/30 ms for the GL5528).
- Model: R(E) = R10 · (E/10 lux)^(−γ), with R10 = 15 kΩ (mid of range), γ = 0.6. So 100 lux → 3.8 kΩ, 1000 lux → 0.95 kΩ, 1 lux → 60 kΩ. Darkness → clamp at ~1 MΩ (or higher). Add a first-order lag: ~20 ms rising (light on), ~30 ms falling.
- **Correction to the original**: it says "in daylight ≈ 10–20 kΩ". 10–20 kΩ is the value at **10 lux** (a dim room). Daylight (10 000+ lux) gives roughly 100–300 Ω by the γ model.
- Divider: LDR from 5 V to A0, 10 kΩ from A0 to GND: Vout = 5·10k/(10k + R_LDR), brighter → higher reading.
- Note: CdS contains cadmium; RoHS-restricted in the EU. Fine in a simulator.

## 9. TMP36 temperature sensor

- Analog Devices TMP36, TO-92 (also SOT-23-5, SOIC-8) [2].
- Supply **2.7–5.5 V**; quiescent current < 50 µA (Adafruit: 0.05 mA); output 10 mV/°C; **750 mV at 25 °C**; 0.5 V offset (0 °C → 0.5 V); specified −40 to +125 °C (100 mV at −40 °C, 1.75 V at 125 °C), operates to +150 °C with reduced accuracy (2.0 V) [2]. Checked in the fact-check against the ADI datasheet (SparkFun mirror https://cdn.sparkfun.com/datasheets/Sensors/Temp/TMP35_36_37.pdf, since the analog.com URL returns 404) and Adafruit's TMP36 guide (https://learn.adafruit.com/tmp36-temperature-sensor/overview).
- Accuracy ±2 °C typ over temperature, ±0.5 °C typ linearity, ±1 °C typ at +25 °C [2].
- T(°C) = (Vout − 0.5 V) × 100.
- **Pinout (TO-92)**: with the **flat face toward you and the leads down: pin 1 left = +Vs, pin 2 middle = Vout, pin 3 right = GND** [2]. Adafruit's guide confirms left = power, middle = output, right = ground (read this run). The ADI TO-92 drawing is labelled **BOTTOM VIEW** with "PIN 1, +VS; PIN 2, VOUT; PIN 3, GND" [2]; draw from the flat-face-forward description, not by copying the bottom-view drawing.
- Marking on the flat face: "TMP" / "36GZ" plus a date code (typical; unverified exact lines). Body black epoxy, 4.8 mm wide × 4.8 mm tall × 3.7 mm deep (JEDEC TO-92, approximate).
- Reverse-polarity trap: inserting it backwards (GND and +Vs swapped) makes it **very hot within seconds** and destroys it. This is the classic beginner failure: burnt fingers when touching it.
- Code (Uno 5 V reference):
  ```cpp
  int raw = analogRead(A0);
  float volts = raw * (5.0 / 1024.0);
  float tempC = (volts - 0.5) * 100.0;
  ```
  Use `/1024.0` consistently (ATmega datasheet: ADC = Vin·1024/Vref [1]). The resolution is 4.9 mV ≈ 0.49 °C per step; using `analogReference(INTERNAL)` (1.1 V on the Uno) gives 0.11 °C/step but caps the range at 60 °C.
- **Lesson 11 text correction**: the original says the transistor "switches the motor's much larger current"; in lesson 11 it switches the **fan**. The fan is a small brushless DC fan (has its own driver IC) or a brushed motor; either way it needs the flyback diode (§13) and its own supply if it draws > ~200 mA.

## 10. Passive piezo/buzzer vs active buzzer

| | Passive buzzer | Active buzzer |
|---|---|---|
| Inside | a transducer only (piezo disc, or magnetic coil + diaphragm ~16 Ω) | transducer + an oscillator circuit |
| Drive | needs a square wave: `tone(pin, f)` | DC: `digitalWrite(pin, HIGH)` makes one fixed tone |
| Pitch | any, loudest near resonance (~2–4 kHz) | fixed, typically 2.3 ± 0.3 kHz (unverified per part) |
| Look (12 mm round, ~9.5 mm tall) | **green PCB visible on the underside**, no seal | **black epoxy-sealed underside**, often a white "REMOVE SEAL AFTER WASHING" sticker on top |
| Polarity | magnetic types have + marked; a bare piezo is non-polar | **+ marked, longer leg = +** |
| Current at 5 V | piezo ~ few mA; magnetic 16 Ω needs a series resistor or transistor (5 V/16 Ω = 300 mA exceeds a pin!) | ~25–30 mA (unverified per part) |

- Leg spacing on 12 mm buzzers: 7.6 mm (3 pitches). The original's "legs e11 / e14" is 3 pitches: correct.
- `tone(pin, frequency)` / `tone(pin, f, durationMs)` / `noTone(pin)`. On the Uno, `tone()` uses Timer2, so PWM on pins 3 and 11 stops working while a tone plays; minimum frequency 31 Hz; only one tone at a time [28].
- Notes (equal temperament, A4 = 440 Hz): C4 261.63, D4 293.66, E4 329.63, F4 349.23, G4 392.00, A4 440.00, B4 493.88, C5 523.25. The Arduino `pitches.h` uses integers NOTE_C4 262, NOTE_D4 294, NOTE_E4 330, NOTE_F4 349, NOTE_G4 392, NOTE_A4 440, NOTE_B4 494, NOTE_C5 523, NOTE_G6 1568.
- Trap: a passive buzzer given `digitalWrite(HIGH)` makes a click and then silence; an active buzzer given `tone()` makes a rough, buzzy sound.

## 11. TIP120 Darlington transistor

- NPN Darlington, TO-220 [3]. **Pinout (front/label side toward you, leads down): 1 Base (left), 2 Collector (middle), 3 Emitter (right); the metal tab is the Collector.**
- Ratings [3]: VCBO = VCEO 60 V; VEBO 5 V; IC 5 A DC, 8 A pulse; IB 120 mA DC; PC 65 W at TC = 25 °C (infinite heatsink), **2 W free-air at TA = 25 °C**; TJ max 150 °C.
- Characteristics [3]: **hFE ≥ 1000** at VCE = 3 V, IC = 0.5 A and 3 A; **VCE(sat) ≤ 2.0 V at IC = 3 A, IB = 12 mA**; ≤ 4.0 V at IC = 5 A, IB = 20 mA; **VBE(on) ≤ 2.5 V at VCE = 3 V, IC = 3 A**. At lesson currents (100–300 mA) the typical curves give VBE ≈ 1.2–1.4 V and VCE(sat) ≈ 0.7–1.0 V (read off the typical curves, approximate).
- Inside [3]: a monolithic Darlington (driver and output NPN on one die) with **R1 ≈ 8 kΩ** (driver B–E) and **R2 ≈ 0.12 kΩ** (output B–E). The onsemi drawing also shows an **anti-parallel diode from emitter to collector** (unverified this run; Fairchild's drawing shows only R1/R2). That diode protects against reverse C–E voltage only; it is **not** a flyback diode across the motor.
- Base current with 1 kΩ from a 5 V pin: (5 − ~1.3)/1000 ≈ 3.7 mA, enough for ≥ 1 A collector.
- Heat: 200 mA × ~0.9 V ≈ 0.2 W, cool. 1 A × ~1 V = 1 W, warm (free-air rating 2 W). Above that it needs a heatsink.
- Saturation drop matters at 5 V: a 5 V motor through a TIP120 sees only ~4 V. A logic-level MOSFET (IRLZ44N, IRLB8721) is the modern better choice; mention it as an extension.
- Marking: "TIP120" and maker logo on the black epoxy body; the tab has a ~3.6–3.9 mm mounting hole (JEDEC TO-220, approximate).

## 12. 1N4001–1N4007 rectifier diodes

- DO-41 axial; black epoxy body, **silver/grey band at the cathode end** [4]. Body ≈ 4.1–5.2 mm long × 2.0–2.7 mm diameter; leads 0.71–0.86 mm.
- Ratings [4]: IF(AV) 1 A; IFSM 30 A (8.3 ms half sine); VFM ≤ 1.0 V at 1 A (Diodes Inc.); onsemi specifies 1.1 V max; at the 0.1–0.3 A of a lesson motor the drop is ~0.7–0.85 V (typical curve, approximate); IR ≤ 5–10 µA at 25 °C (varies by maker). VRRM: 4001 50 V, 4002 100 V, 4003 200 V, 4004 400 V, 4005 600 V, 4006 800 V, 4007 1000 V. Marking: "1N4007" (or "4007") printed on the body.
- Use as a **flyback diode**: across the motor (or relay coil), cathode (band) to the + supply side, anode to the transistor collector. When the transistor turns off, the inductor current circulates through the diode instead of spiking the collector. The 1N4001 is slow (~µs recovery) but fine for small DC motors at PWM ~490–980 Hz; a Schottky (1N5817/1N5819) is better for PWM (note, not required).
- Use as reverse-polarity protection: in series with a supply input (the Uno itself has an M7 = 1N4007-class diode on the barrel jack; see `uno-r3.md`).

## 13. Small DC motor (lesson 10) and the flyback diode

- Modelled part: "130-size" brushed DC hobby motor (Mabuchi FA-130 class), 3–6 V. FA-130RA at 3 V: no-load ~9100 rpm at ~0.15 A; stall current ~2.1 A [29] (unverified exact values; read the FA-130RA sheet). Kit motors vary widely; assume no-load 0.1–0.25 A and stall 0.5–2 A at 5 V.
- Shape: steel can ~20 mm diameter × 25 mm long (round with two flats, 15 mm across the flats), 2 mm shaft, plastic end cap with two solder tabs (red/black leads often soldered on).
- **Correction to the original**: lesson 10 powers the motor from the Uno's 5 V pin through the TIP120 with **no flyback diode**. A faithful circuit adds a **1N4001 across the motor (band to +5 V)**, and ideally a separate supply for the motor (USB 5 V is behind a 500 mA polyfuse and stall current can exceed it, causing the Uno to brown out and reset). A 0.1 µF ceramic across the motor terminals reduces brush noise.
- What really happens without the diode: at every PWM turn-off the motor inductance drives the collector above 5 V; the TIP120 has 60 V VCEO, so it often survives, but the spikes couple into the Uno's 5 V rail and can reset it or upset the USB connection. With a relay coil and a small transistor the spike kills the transistor.
- Sim: speed ∝ (Vsupply − VCE(sat))·duty − back-EMF model; PWM ~980 Hz on pin 6 (Timer0). Motor will not start below ~20–30 % duty (stiction).

## 14. SG90 micro servo

- TowerPro SG90 [8]: 9 g (10.6 g with lead and plug); dimensions 22.2 × 11.8 × 31 mm on the TowerPro page, 23.1 × 12.2 × 29.0 mm in the second table of the same sheet (the first is the commonly drawn one); mounting-tab span ~32 mm (unverified); stall torque **1.8 kgf·cm at 4.8 V**; speed **0.1 s/60° at 4.8 V**; operating voltage "4.8 V (~5 V)"; dead band 10 µs; 0–55 °C; 3-pole motor, plastic gears, bushing [8].
- Signal: **pulse cycle ca. 20 ms (50 Hz)**; **1.5 ms = centre**; the same sheet gives both "~1 ms / ~2 ms = ±90°" and "pulse width 500–2400 µs, rotational range 180°" [8]. Treat **500–2400 µs ≈ 0–180°** as the real behaviour (individual units vary by ±10° at the ends). The Arduino Servo library maps `write(0..180)` to **544–2400 µs** by default [9].
- Wires (25 cm, JR-style 3-pin female, 2.54 mm): **brown = GND, red = +V (middle), orange = signal**.
- Current: idle ~5–10 mA; moving 100–250 mA; stall ~650–750 mA at 5 V (unverified exact).
- Inside: a small DC motor, plastic (nylon) 4-stage gear train, a 5 kΩ potentiometer on the output shaft, and a control IC (e.g. an AA51880-class chip) (unverified chip name).
- Code:
  ```cpp
  #include <Servo.h>   // Servo 1.3.0
  Servo s;
  void setup() { s.attach(9); }          // or s.attach(9, 500, 2400)
  void loop()  { s.write(0); delay(1000); s.write(180); delay(1000); }
  ```
  On the Uno the Servo library uses Timer1, which **disables `analogWrite()` on pins 9 and 10** (even if the servo is on pin 9, the other pin 10 loses PWM) [9].
- Traps: powering several servos from the Uno 5 V causes brown-out resets; the servo jitters and buzzes at the end stops if driven past its mechanical limit (0.5/2.4 ms on some units hits the stop).

## 15. 28BYJ-48 stepper + ULN2003 driver board

### 15.1 Motor

- 4-phase unipolar permanent-magnet stepper with a built-in gearbox; 28 mm diameter can, 19 mm deep (body), two mounting tabs at 35 mm centres, 5 mm shaft with two flats (3 mm across), offset ~8 mm from the can centre. 5-wire cable to a 5-pin JST-XH-style plug.
- Datasheet [5] (verbatim values): rated voltage 5 V DC; 4 phases; "speed variation ratio 1/64"; "stride angle 5.625°/64"; frequency 100 Hz; DC resistance **50 Ω ±7 % (25 °C)**; idle in-traction frequency > 600 Hz; idle out-traction frequency > 1000 Hz; in-traction torque > 34.3 mN·m (120 Hz); self-positioning torque > 34.3 mN·m; friction torque 600–1200 gf·cm; pull-in torque 300 gf·cm; insulation grade A; temperature rise < 40 K (120 Hz); noise < 35 dB (120 Hz, no load, 10 cm). Mechanical sizes below are typical drawing values (unverified against an official drawing this run).
- Current: 5 V / 50 Ω = 100 mA per energised coil, so 200 mA in full-step two-phase-on mode (wave drive 100 mA).
- **Real gear ratio**: teardown tooth counts 9→32, 11→22, 9→26, 10→31 give (32·22·26·31)/(9·11·9·10) = 567 424 / 8 910 = **63.68395:1**, not 64:1 [6]. Rotor: 32 full steps per rotor revolution (11.25°/step; the datasheet's 5.625° is the half step).
  - **Full step: 32 × 63.68395 = 2037.8864 steps per output revolution** (≈ 2038).
  - **Half step: 64 × 63.68395 = 4075.7728 steps per output revolution** (≈ 4076).
  - Using 2048 (the "64:1" number) over-rotates by 10.1 steps per turn = 0.50 % ≈ 1.8° per turn, so a wheel commanded to "one turn" creeps ahead every turn. This is the original's error (§9.2-4 in `learn-arduino.md`).
  - Note: some batches are reported to be truly 64:1; the 63.68395 figure comes from counting teeth on teardown units [6]. Treat 2037.8864 as the default and say the ratio varies by maker (unverified across all makers).
- **Real speed at 5 V**: the datasheet's pull-in frequency (> 600 Hz) and pull-out frequency (> 1000 Hz) are in its 8-step (half-step) sequence [5], i.e. ~8.8 RPM from standstill and ~14.7 RPM running. In full-step two-phase mode most units start reliably at ~10–15 RPM (340–510 steps/s) and reach ~15–18 RPM with acceleration before stalling (community measurements; unverified, varies unit to unit). **Use 15 RPM as the realistic maximum at 5 V without a ramp; never present 24 RPM (≈ 815 full steps/s) as normal** — the original's default of 24 RPM is above what most units do.
- Wire colours (Fulling/BYJ-series datasheet switching-sequence table, https://wiki.52pi.com/images/3/3a/Stepper-Motor-28BJY-48-Datasheet.pdf, read in the fact-check): wire **1 BLU, 2 PIK, 3 YEL, 4 ORG**, plus **5 Red (common +, both centre taps)**; the order across the 5-pin plug is the common layout (unverified on every batch; makers' colours are not always reliable). On the usual ULN2003 board the plug puts OUT1→Blue (IN1), OUT2→Pink (IN2), OUT3→Yellow (IN3), OUT4→Orange (IN4), with Red on +V (common layout, unverified on every board).
- Datasheet 8-step (half-step, "1-2 phase", CW) sequence, energised wires (pulled low) (confirmed in the fact-check against the Fulling table above): 1: O · 2: O+Y · 3: Y · 4: Y+P · 5: P · 6: P+B · 7: B · 8: B+O. In full-step two-phase mode the pairs are O+Y, Y+P, P+B, B+O.

### 15.2 ULN2003 driver board ("ULN2003 stepper driver module")

- PCB ~35 × 32 mm (unverified), green or blue; a ULN2003AN DIP-16 in the middle; four red LEDs labelled A B C D (they light when the matching output is ON, via 1 kΩ resistors); pins IN1–IN4 on a 1×4 header (0.1 in); power on a 1×2 header "− +" (5–12 V) with an on/off jumper; the white 5-pin JST-XH socket for the motor.
- ULN2003A [7]: 7 Darlington channels, 500 mA peak collector current per channel, 50 V; 2.7 kΩ series base resistor (TTL/5 V CMOS input); **built-in common-cathode clamp diodes to COM** (pin 9), which the board ties to +V: this is the flyback protection for the motor coils. VCE(sat) 0.9 V typ / 1.1 V max at 100 mA, 1.0 V typ / 1.3 V max at 200 mA [7], so a "5 V" coil sees about 4 V.
- Board pin to Uno (original): D8→IN1, D9→IN2, D10→IN3, D11→IN4; driver − to GND, + to 5 V.
- **Pin order in code**: the Arduino `Stepper` library and `AccelStepper::FULL4WIRE` need the coil order **IN1, IN3, IN2, IN4** → `8, 10, 9, 11` for a 28BYJ-48 on a ULN2003 [34].
- Code (AccelStepper 1.64):
  ```cpp
  #include <AccelStepper.h>
  const float STEPS_PER_REV = 2037.8864;  // full step, real 63.68395:1 gearbox
  AccelStepper stepper(AccelStepper::FULL4WIRE, 8, 10, 9, 11);
  long turns = 0;
  void setup() {
    stepper.setMaxSpeed(500);        // steps/s, ≈ 14.7 RPM
    stepper.setAcceleration(300);
  }
  void loop() {
    if (stepper.distanceToGo() == 0) {
      turns++;
      stepper.moveTo(lround(turns * STEPS_PER_REV));  // absolute target: no drift build-up
    }
    stepper.run();
  }
  ```
  `move((long)STEPS_PER_REV)` each turn would truncate to 2037 and lose 0.89 step per turn; always compute absolute targets from the float. For half step use `AccelStepper::HALF4WIRE` with the same pin order and 4075.7728 steps/rev. A wheel of 8 segments is 254.74 full steps per segment, not 256. `Stepper` library: `Stepper s(2038, 8, 10, 9, 11); s.setSpeed(10); s.step(2038);`.
- Disable coils when idle (`stepper.disableOutputs()`) or the motor stays at 200 mA and gets warm (~40 K rise per datasheet).

## 16. Capacitive soil moisture sensor v1.2

- Board: black (sometimes red) FR-4 probe ~98 × 23 mm (unverified, ±2 mm), "Capacitive Soil Moisture Sensor v1.2" silk, a white horizontal line marking the maximum insertion depth, electronics at the top end under no conformal coating. 3-pin JST-PH 2.0 connector labelled **AOUT, VCC, GND** (unverified order on all batches; read the silk).
- Circuit: a 555 timer runs as an astable at ~1.5 MHz (unverified); the probe's copper pad is a capacitor to the soil; an RC filter and peak detector turn the AC amplitude into a DC voltage. A 662K (XC6206 3.3 V LDO) regulator on board (on good units) runs the 555 from 3.3 V.
- Supply 3.3–5.5 V. Output (good unit, 5 V supply): roughly **~2.5–3.0 V in dry air, ~1.2–1.5 V in water**; **wetter → lower voltage**. The original's 2.5 V dry / 1.3 V wet is within range. Each unit must be calibrated (dry/wet readings); typical Uno readings ~520–600 dry, ~260–300 wet (unverified; community figures).
- **The 555 variants issue** [26]:
  1. The original design uses a **TLC555 (TLC555CD, CMOS, runs from 2 V)** [26]; many clones fit an **NE555 (bipolar, needs ≥ 4.5 V)** [26]. With the on-board 3.3 V regulator feeding it, or on a 3.3 V board, an NE555 does not run reliably and the output is stuck or meaningless. Identify by the chip marking ("NE555" vs "TLC555"/"T555"/"555C"). Buyers report receiving "V1.2" boards with the NE555 [26].
  2. Some batches leave out the **3.3 V regulator** (or bridge it), so the output range changes with the supply voltage (from memory of [26], unverified).
  3. Clones omit (or fail to ground, through a missing via) the **1 MΩ bleed resistor** across the output capacitor, so the output does not fall back when moisture changes: readings get stuck or depend on supply [26]. (The designator "R4" is from memory, unverified.)
- Not waterproof: the cut board edges and the top electronics must stay dry; water on the top end corrodes it.
- Code: `int raw = analogRead(A0); int pct = map(raw, DRY, WET, 0, 100); pct = constrain(pct, 0, 100);`.

## 17. SSD1306 0.96" 128×64 I²C OLED module

- Glass panel 0.96" diagonal (active area ~21.7 × 10.9 mm, unverified), on a ~27 × 27 mm PCB (blue or black) with four 2 mm mounting holes; 4-pin 2.54 mm header. **Pin order varies by maker: most are `GND VCC SCL SDA`, some are `VCC GND SCL SDA`** — a classic way to kill one. Read the silk. Monochrome white, blue, or yellow (top 16 rows) + blue ("two colour", really two fixed colour zones).
- Controller SSD1306 [13]: 128 × 64, I²C 7-bit address **0b011110(SA0)**: **0x3C** (SA0 = 0) default, **0x3D** (SA0 = 1). Modules print the 8-bit form "0x78" / "0x7A" next to a resistor you move to change address. The internal charge pump generates the panel voltage (7.5 V VCC from VBAT 3.3–4.2 V) when `SSD1306_SWITCHCAPVCC` is used. (Address format "0 1 1 1 1 0 SA0 R/W#" and the 7.5 V charge-pump figure confirmed in the fact-check against [13].) Note: when `begin()` is given no address, Adafruit_SSD1306 picks 0x3C for 32-row and **0x3D for 64-row** panels, so always pass 0x3C explicitly for the common 128×64 module.
- Module supply **3.3–5 V**: an on-board 3.3 V LDO (662K / XC6206 class) feeds the SSD1306 (VDD 1.65–3.3 V). On most modules the SDA/SCL pull-ups (4.7–10 kΩ) go to the module's VCC pin (unverified, varies).
- **The I²C 5 V vs 3V3 note (correction to the original)**: the original powers the OLED from **3V3** and implies the bus is 3.3 V. On the Uno the I²C pins are 5 V logic and the AVR `Wire` library enables the ATmega's internal pull-ups (to 5 V) in `Wire.begin()`. So the SDA/SCL lines idle near 5 V (or are pulled between the module's 3.3 V pull-ups and the Uno's weak 5 V pull-ups). The SSD1306 datasheet does not rate its I/O for 5 V, but almost all breakout modules survive it in practice. Two honest options for iynk: (a) power the module from **5 V** (it has its own regulator) and say "this module is 5 V tolerant in practice"; (b) keep 3V3 and say the bus is still pulled toward 5 V by the Uno. Either way, do not say the bus is 3.3 V. A level shifter is the strictly correct way.
- RAM: the Adafruit library allocates a 1024-byte frame buffer at `begin()` — half the Uno's 2 KB SRAM; `begin()` returns false if malloc fails.
- Adafruit_SSD1306 2.5.17 + Adafruit GFX 1.13.0:
  ```cpp
  #include <Wire.h>
  #include <Adafruit_GFX.h>
  #include <Adafruit_SSD1306.h>
  Adafruit_SSD1306 display(128, 64, &Wire, -1);   // -1: no reset pin
  void setup() {
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) for (;;);
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println(F("Moisture: 42%"));
    display.display();
  }
  ```
- U8g2 2.37.1 (full buffer; `_1_` page mode uses 128 bytes instead of 1 KB):
  ```cpp
  #include <U8g2lib.h>
  #include <Wire.h>
  U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE);
  void setup() { u8g2.begin(); }
  void loop() {
    u8g2.clearBuffer();
    u8g2.setFont(u8g2_font_ncenB08_tr);
    u8g2.drawStr(0, 10, "Hello");
    u8g2.sendBuffer();
  }
  ```
  U8g2 uses the 8-bit address: `u8g2.setI2CAddress(0x3D * 2)` for 0x3D.
- Uno I²C pins: SDA = A4, SCL = A5 (also duplicated near AREF on the R3).

## 18. FSR 402

- Interlink FSR 402 [11] (Interlink FSR 400 Series data sheet, read in the fact-check): round sensor, **active area Ø14.68 mm** (current Interlink sheet and the Interlink product page "14.7 mm"; older sheets and the 402 Short Tail give Ø12.70 mm), **nominal thickness 0.46 mm**, switch travel 0.15 mm; the family table lists the 402 as "13mm Circle x 56mm", so **overall length ~56 mm**; overall disc diameter ~18.3 mm (unverified); a flat tail ending in two solder tabs / female contacts on 2.54 mm pitch (part numbers exist with no contacts, female contacts, female contacts + housing, or solder tabs). Polymer film, the active disk shows a grey/black printed pattern; non-polar.
- Force range **~0.2 N to 20 N** (≈ 20 g to 2 kg), actuation force ~0.2 N min [11]; non-actuated resistance **> 10 MΩ** [11]; the original's "over 1 MΩ untouched" is consistent (understated).
- Resistance vs force (Adafruit table, 5 V supply, 10 kΩ pull-down) [12]:

| Force | FSR R | V across 10 kΩ |
|---|---|---|
| none | infinite | 0 V |
| 0.2 N (0.04 lb, ~20 g) | 30 kΩ | 1.3 V |
| 1 N (0.22 lb, ~100 g) | 6 kΩ | 3.1 V |
| 10 N (2.2 lb, ~1 kg) | 1 kΩ | 4.5 V |
| 100 N (22 lb, ~10 kg) | 250 Ω | 4.9 V |

  Model: interpolate log R against log F between these points (local exponents ≈ −1.0, −0.78, −0.6), and treat it as open circuit below ~0.2 N (actuation threshold). Interlink quotes force repeatability **±2 % single part** and **±6 % part to part (single batch)**, hysteresis +10 % average [11]; batch to batch the spread is larger.
- Divider (FSR from 5 V to A0, pull-down to GND): V = 5·Rpd/(Rpd + R_fsr); R_fsr = Rpd·(1023 − reading)/reading. With 10 kΩ: 1 N → 3.1 V, 10 N → 4.5 V.
- Accuracy: ±6 % part to part within a batch [11] (more across batches; older Interlink guides quoted up to ±25 %, unverified); drift under constant load; "how hard", not a scale. Bending the tail near the active area damages it; soldering the tabs melts the film (use the crimp/clincher pins).

## 19. Traffic-light LED module

- Generic 4-pin module: a small PCB (≈ 56 × 21 mm, unverified) with three 8 mm (or 5 mm) LEDs, **red, yellow, green**, each with an on-board series resistor (SMD, typically 220–330 Ω, unverified), common cathode to GND. Header labels on the common version: **`R Y G GND`** (the original draws `GND R Y G`; both orders exist, read the silk, unverified which is more common).
- Each LED lights when its pin is HIGH (active HIGH). At 5 V: ~8–12 mA each (unverified, depends on resistor).
- Code: three `pinMode(..., OUTPUT)` and `digitalWrite()`; can be driven directly from Uno pins.

## 20. HC-SR04 ultrasonic sensor (lessons 7 and 16)

- PCB 45 × 20 mm, two 16 mm transmitter/receiver cans ("T" and "R") ~12 mm tall, a crystal between them (frequency varies by clone, unverified), 4-pin header on the bottom edge: **VCC, Trig, Echo, Gnd** [27].
- 5 V, 15 mA working current; 40 kHz; range 2–400 cm; resolution ~3 mm; measuring angle 15° [27].
- Trigger: a ≥ 10 µs HIGH pulse on Trig; module sends 8 × 40 kHz cycles; Echo goes HIGH for the round-trip time. Distance cm = µs/58 (or µs × 0.0343 / 2) [27]. Timeout ~38 ms when nothing returns (unverified across clones).
- Echo is a 5 V output: on 3.3 V boards it needs a divider.
- Code: `digitalWrite(TRIG, LOW); delayMicroseconds(2); digitalWrite(TRIG, HIGH); delayMicroseconds(10); digitalWrite(TRIG, LOW); long us = pulseIn(ECHO, HIGH, 30000); float cm = us / 58.0;`

## 21. DHT11 and DHT22 (AM2302)

| | DHT11 | DHT22 / AM2302 |
|---|---|---|
| Body | **blue**, 15.5 × 12 × 5.5 mm (from memory) | **white**, 25.1 × 15.1 × 7.7 mm (from memory) |
| Supply | 3–5.5 V DC (Aosong DHT11 translated sheet; the D-Robotics/newer sheet says 3.3–5.5 V) | 3.3–5.5 V DC (AM2302 sheet; its electrical table gives 3.3 min / 5 typ / 6 max) |
| Temperature | 0–50 °C, ±2 °C, 1 °C resolution | −40 to 80 °C, ±0.5 °C, 0.1 °C resolution, ±0.2 °C repeatability |
| Humidity | 20–90 % RH, ±5 % | 0–100 % RH, ±2 % RH (max ±5 %), 0.1 % RH resolution |
| Rate | 1 Hz max | the whole read cycle must be ≥ 2 s apart |
| Sensing element | resistive humidity element + NTC | polymer humidity capacitor |

[16] (AM2302 column read from the Adafruit-hosted AM2302 sheet this run; DHT11 column checked in the fact-check against the translated Aosong DHT11 sheet at https://www.circuitbasics.com/wp-content/uploads/2015/11/DHT11-Datasheet.pdf (20–90 % RH ±5 %, 0–50 °C ±2 °C, 1 % / 1 °C resolution, start pulse ≥ 18 ms); body dimensions still from memory; newer DHT11 revisions quote 5–95 % RH and −20 to 60 °C, unverified which revision ships today.) The wired AM2302 (in a black case) has red = VCC, black = GND, yellow = DATA [16].

- Pins (grille toward you, leads down, left to right): **1 VDD, 2 DATA, 3 NC, 4 GND** [16]. 3-pin modules on a small PCB add the 10 kΩ (or 4.7 kΩ) pull-up and often a power LED; their pin order is printed (commonly `S + −` or `+ OUT −`, varies).
- Protocol (single-wire, not Dallas 1-Wire) [16]: host pulls DATA low ≥ 18 ms (DHT11) / 1–10 ms (AM2302), releases and waits 20–40 µs; sensor answers 80 µs low + 80 µs high; then 40 bits: each bit = 50 µs low + 26–28 µs high (0) or 70 µs high (1). Bytes: RH int, RH dec, T int, T dec, checksum (sum of the four, low 8 bits). DHT22 sends 16-bit RH × 10 and 16-bit T × 10 with the sign in bit 15.
- Library: Adafruit "DHT sensor library" 1.4.7 (needs Adafruit Unified Sensor 1.1.15) [17]:
  ```cpp
  #include <DHT.h>
  DHT dht(2, DHT11);          // or DHT22
  void setup() { Serial.begin(9600); dht.begin(); }
  void loop() {
    delay(2000);
    float h = dht.readHumidity();
    float t = dht.readTemperature();   // °C; readTemperature(true) for °F
    if (isnan(h) || isnan(t)) { Serial.println(F("DHT read failed")); return; }
  }
  ```
- Traps: reading faster than 1 Hz (DHT11) / 0.5 Hz (DHT22) returns stale data or NaN; long wires without a pull-up fail.

## 22. HC-SR501 PIR motion sensor

- PCB ~32 × 24 mm, green, with a white **Fresnel dome lens ~23 mm diameter** on the top side; the components (BISS0001 IC, regulator, two orange trim pots, jumper) are on the underside [18].
- Supply **4.5–20 V DC** ("default voltage DC4.5V-20V"; the spec list on the same page says 5–20 V) [18] (on-board HT7133 3.3 V regulator and a series diode on VCC: unverified); quiescent **< 50 µA** [18]; **output HIGH 3.3 V / LOW 0 V** [18] (fine for an Uno digital input: 3.3 V > VIH 3.0 V, but only just).
- Range ~3–7 m (sensitivity pot), cone < 110–120°; **time delay 5 s to ~300 s** (time pot, per the manual's adjustment notes; its spec list says "0.3 → 5 min"); block time after output falls ~2.5 s; warm-up ~1 min (outputs may toggle randomly while it settles) [18].
- Trigger jumper: **H = repeat trigger** (output stays HIGH while motion continues), **L = single trigger** (goes LOW after the delay even if motion continues) [18]. Default jumper position varies by batch (unverified).
- Pins (3-pin header, lens up, header toward you): **VCC, OUT, GND** (silk under the lens on the underside; verify per batch, unverified).
- Pots (lens up, pots at the bottom): left/right roles printed as "Sx" (sensitivity) and "Tx" (time) on many boards (unverified); clockwise increases both: distance pot CW → ~7 m, CCW → ~3 m; delay pot CW → 300 s, CCW → 5 s [18].
- Code: `pinMode(PIR, INPUT); if (digitalRead(PIR) == HIGH) …`.

## 23. 16×2 character LCD with I²C backpack (PCF8574)

- LCD module 80 × 36 mm PCB, mounting holes 2.5–3 mm at 75 × 31 mm (unverified exact), viewing area ~64.5 × 16 mm, 16 characters × 2 lines of 5 × 8 dots, HD44780-compatible controller (often a chip-on-board black blob) [20]. Yellow-green or blue backlight (blue with white text is common). 16-pin header on top edge: VSS VDD V0 RS RW E D0–D7 A K.
- Backpack (soldered behind): PCF8574T (or PCF8574AT), a blue 10 kΩ contrast trimmer, a backlight jumper, and a 4-pin header **GND VCC SDA SCL** [19].
- **Addresses** [19]: PCF8574 = 0x20–0x27, PCF8574A = 0x38–0x3F, selected by A0–A2 solder pads (pulled HIGH by default on backpacks). So the default is **0x27** (PCF8574T) or **0x3F** (PCF8574AT). Run an I²C scanner if unsure.
- Common backpack mapping: P0 = RS, P1 = RW, P2 = E, P3 = backlight, P4–P7 = D4–D7 (4-bit mode) (unverified as universal; the hd44780 library auto-detects it).
- Supply 5 V (the LCD glass needs ~5 V for contrast; 3.3 V versions exist). Backlight ~20–30 mA (unverified). Trap: a blank or row-of-blocks display is almost always the contrast trimmer.
- Libraries: **hd44780 1.3.2** (Bill Perry; auto address and pin-map detection; recommended) [20]; LiquidCrystal_I2C (Frank de Brabander / johnrickman, last tag 1.1.3) is the one most tutorials use.
  ```cpp
  #include <Wire.h>
  #include <LiquidCrystal_I2C.h>
  LiquidCrystal_I2C lcd(0x27, 16, 2);
  void setup() { lcd.init(); lcd.backlight(); lcd.setCursor(0, 0); lcd.print("Hello"); }
  ```
  hd44780 version: `#include <hd44780.h>` `#include <hd44780ioClass/hd44780_I2Cexp.h>` `hd44780_I2Cexp lcd;` `lcd.begin(16, 2);`.

## 24. WS2812B addressable RGB LED

- 5050 package, **5.0 × 5.0 × 1.6 mm**, white body with a clear window over the die and integrated driver IC [21]. Pins: **1 VDD, 2 DOUT, 3 VSS, 4 DIN** (pin 1 marked by a cut corner/notch) [21]. On strips: pads `+5V DIN GND` → `+5V DOUT GND` with arrows showing data direction.
- Supply 3.5–5.3 V [21]. Data input VIH = 0.7 × VDD (3.5 V at 5 V supply) [21], so a 3.3 V MCU is marginal (often works, not guaranteed).
- Protocol [21]: NRZ, **800 kbit/s, 1.25 µs per bit ±600 ns**; T0H 0.4 µs, T0L 0.85 µs, T1H 0.8 µs, T1L 0.45 µs (each ±150 ns); **24 bits per pixel in G-R-B order, MSB first**; each pixel strips its 24 bits and reshapes/forwards the rest on DOUT; reset/latch: low **above 50 µs** in the Adafruit-hosted sheet [21], **≥ 280 µs** in the newer V5 sheet (from memory). Model 300 µs, which is what Adafruit_NeoPixel waits.
- Current: Adafruit's planning figure is **~20 mA per colour, 60 mA per pixel at full white** [22]; real WS2812Bs measure lower (~35–50 mA at full white, unverified); ~1 mA idle per pixel with all LEDs off (unverified).
- Best practice [22]: 300–500 Ω resistor in series with DIN at the first pixel; ≥ 1000 µF electrolytic across + and − at the strip; connect GND first; don't power more than ~8 pixels at full white from the Uno 5 V pin.
- Libraries: Adafruit_NeoPixel 1.15.5; FastLED 3.10.8 [22].
  ```cpp
  #include <Adafruit_NeoPixel.h>
  Adafruit_NeoPixel strip(8, 6, NEO_GRB + NEO_KHZ800);
  void setup() { strip.begin(); strip.setBrightness(50); strip.show(); }
  void loop() { strip.setPixelColor(0, strip.Color(255, 0, 0)); strip.show(); }
  ```
  FastLED: `CRGB leds[8]; FastLED.addLeds<WS2812B, 6, GRB>(leds, 8); leds[0] = CRGB::Red; FastLED.show();`.
- Note: `strip.show()` disables interrupts for ~30 µs per pixel, so `millis()` loses time with long strips and Servo pulses jitter.

## 25. 5 V relay module (1 channel)

- PCB ~50 × 26 mm (unverified) with a blue **Songle SRD-05VDC-SL-C** relay (19 × 15.5 × 15 mm), a 3-way screw terminal **NO, COM, NC** on the high side, a 3-pin header **VCC (DC+), GND (DC−), IN** on the low side, a red power LED and a (green/red) relay LED [23].
- Relay [23]: coil 5 V, **~70 Ω, ~71 mA (0.36 W)**; contacts 10 A 250 VAC / 10 A 30 VDC (rating printed on the can as "10A 250VAC 10A 125VAC 10A 30VDC 10A 28VDC"); SPDT (form C). Operate time ≤ 10 ms, release ≤ 5 ms [23]. Coil data chart: 05 V, 71.4 mA, 70 Ω, about 0.36 W, pull-in 75 % max, drop-out 10 % min [23].
- Driver circuit: an NPN transistor (S8050 / 2N3904 class) switches the coil; **a 1N4148 (or 1N4007) flyback diode across the coil** is on the board; the "with optocoupler" versions add a **PC817** opto between IN and the transistor [24], and many of those are **active LOW** ("low-level trigger": IN LOW = relay ON). High/low trigger is often selectable by a jumper on newer boards. Multi-channel boards have a **JD-VCC / VCC jumper**: remove it and feed JD-VCC separately to get real isolation (with the jumper on, the opto gives no isolation because the grounds are shared).
- Behaviour: click when energising; relay LED lights; COM connects to NO. Current from the Uno pin into IN: ~2–5 mA (opto LED with ~1 kΩ) (unverified).
- Traps: active-low boards switch ON at reset (pins float/INPUT → may read as LOW through the opto LED → relay chatters at boot); fix by `digitalWrite(pin, HIGH)` **before** `pinMode(pin, OUTPUT)`. Never do mains wiring in a beginner lesson; iynk should show only low-voltage loads.

## 26. Joystick module (KY-023 style)

- PCB ~34 × 26 mm (unverified), a PS2-style thumb stick with two **10 kΩ** pots (X and Y) and a push switch under the cap. 5-pin header: **GND, +5V, VRx, VRy, SW** (order printed; common) .
- At rest each axis sits near mid-scale: ~2.5 V → `analogRead` ≈ 500–530 (not exactly 512; calibrate a dead zone). Many units only use ~25–30° of the pots' travel, so the full 0–1023 range is reached only at the corners (unverified).
- SW: shorts to GND when the stick is pressed down; **most modules have no pull-up fitted**, so use `pinMode(SW, INPUT_PULLUP)`; pressed = LOW.
- Note: on many modules VRx/VRy are swapped relative to the silk orientation you would expect; label them in code after testing.
- Code: `int x = analogRead(A0), y = analogRead(A1); bool pressed = digitalRead(2) == LOW;`.

## 27. BME280 (temperature, humidity, pressure)

- Bosch BME280 [25]: 2.5 × 2.5 × 0.93 mm, 8-pin metal-lid LGA with a vent hole. VDD **1.71–3.6 V**, VDDIO 1.2–3.6 V, **absolute maximum 4.25 V on any supply pin** — **not 5 V tolerant**. I²C (up to 3.4 MHz) and SPI (3/4-wire, up to 10 MHz). 7-bit I²C address 111011x: **0x76 (SDO to GND) or 0x77 (SDO to VDDIO)**. **Chip ID register 0xD0 reads 0x60** (BMP280 reads 0x58, from memory).
- Ranges [25]: operating −40…+85 °C, 0–100 % RH, 300–1100 hPa; temperature absolute accuracy **±0.5 °C (0–65 °C)**, ±1.25 °C (−20…0 °C), ±1.5 °C (−40…−20 °C); humidity ±3 % RH (20–80 % RH), response τ63 % = 1 s, hysteresis ±1 % RH; pressure ±1.0 hPa absolute at 0–65 °C (300–1100 hPa), ±1.7 hPa at −20…0 °C [25]. Current 1.8 µA (H+T), 2.8 µA (P+T), **3.6 µA (H+P+T) at 1 Hz**, 0.1 µA sleep.
- Breakouts: (a) the purple 6-pin "GY-BME280" (VCC GND SCL SDA CSB SDO) is **3.3 V only on many versions (no regulator, no level shift)**; (b) Adafruit's (and other "5 V" boards) have a 3.3 V regulator and level shifting and default to 0x77 [25]. **Many cheap "BME280" boards are actually BMP280 (no humidity)**: the chip ID read (0x58) gives it away; the BMP280 package is 2.0 × 2.5 mm vs 2.5 × 2.5 mm square BME280.
- Library: Adafruit_BME280 2.3.0 + Adafruit Unified Sensor 1.1.15:
  ```cpp
  #include <Wire.h>
  #include <Adafruit_BME280.h>
  Adafruit_BME280 bme;
  void setup() { Serial.begin(9600); if (!bme.begin(0x76)) { Serial.println(F("No BME280")); while (1); } }
  void loop() {
    Serial.println(bme.readTemperature());      // °C
    Serial.println(bme.readPressure() / 100.0); // hPa
    Serial.println(bme.readHumidity());         // %RH
    Serial.println(bme.readAltitude(1013.25));  // m, needs sea-level hPa
    delay(1000);
  }
  ```
- Self-heating: in continuous fast mode the reported temperature reads ~1–2 °C high; use forced mode / low rates for weather.

## 28. Cross-cutting electrical facts for the simulator

- Uno 5 V pin from USB: behind a 500 mA resettable polyfuse (F1) on the R3 (see `uno-r3.md`). From the barrel jack, the NCP1117 5 V regulator (1 A max, but thermally limited: at 12 V in, ~ 7 V × I, so ~ 300 mA before it gets very hot).
- Uno 3V3 pin: 150 mA max (LP2985 regulator on the R3).
- ATmega328P: 40 mA abs max per pin; 200 mA total through VCC/GND pins (see [1] and `uno-r3.md`).
- BOD: the Uno fuses set BOD at 2.7 V (typical 2.7 V, 2.5–2.9 V) [1]; a stalled motor or several servos on the 5 V rail can dip VCC and reset the board (the L LED blinks the bootloader pattern, serial reconnects).

## 29. Failure modes, per part (what the user sees)

| Fault | Part | What happens |
|---|---|---|
| LED reversed | LED | Stays dark; no damage at 5 V |
| LED without resistor | LED, pin | Very bright, pin over 40 mA; LED dims or dies over time; the pin may weaken |
| TMP36 backwards | TMP36 | Gets hot within seconds (can burn a finger), reading nonsense, then dead |
| Button rotated 90° | Button | Always "pressed" (strip shorts the columns) |
| Pot with 5 V and GND on wiper and end | Pot | Turning to the end shorts 5 V to GND through the track: hot pot, USB polyfuse may trip (Uno resets) |
| Motor without flyback | TIP120, Uno | Random resets, USB disconnects; transistor usually survives (60 V) |
| Motor stall on USB 5 V | Uno | Polyfuse/PC port limit; brown-out reset; the ON LED dims |
| TIP120 wrong pin order | TIP120 | E/C swapped: motor barely runs; B/C swapped: pin drives the collector load directly, pin overload |
| Servo on 5 V with other loads | Uno | Jitter, brown-out resets when it moves |
| 28BYJ-48 too fast | Stepper | Hums and vibrates, does not turn (stall); LEDs on the ULN2003 board still blink in sequence |
| 28BYJ-48 wrong pin order (8,9,10,11) | Stepper | Jitters back and forth, little or no rotation |
| Soil sensor with NE555 at 3.3 V | Sensor | Constant output, no response to water |
| OLED VCC/GND swapped | OLED | Module dead, regulator/IC destroyed, sometimes warm |
| OLED wrong address | OLED | Blank screen while the sketch runs on (Adafruit `begin()` only returns false if the 1 KB buffer cannot be allocated; it does not confirm the address, checked in Adafruit_SSD1306.cpp); an I²C scanner finds the real 0x3C/0x3D |
| BME280 bare chip board on 5 V | BME280 | Damaged sensor (abs max VDD 4.25 V [25]) |
| 5 V into a 3.3 V device's I/O | BME280/3.3 V modules | Over-voltage through ESD diodes; latch-up or slow death |
| Relay coil straight from a pin | Uno pin | 71 mA > 40 mA abs max: pin damage, relay may not pull in |
| WS2812B without resistor/cap | First pixel | Dead or flickering first pixel after hot-plugging |
| WS2812B many pixels at full white from Uno 5 V | Uno | 60 mA × n: polyfuse trips at ~8+ pixels, colours shift to red/orange as voltage sags |
| DHT read too often | DHT | NaN / stale values |
| PIR during warm-up | PIR | Random triggers for ~1 min |
| Cold solder joint (module headers) | Any module | Intermittent: works when pressed, fails when wiggled; I²C devices drop off the bus; readings jump |
| Shorting 5 V to GND on the breadboard rail | Uno / USB | On USB: polyfuse trips within ~1 s, ON LED goes out, PC may say "USB device drew too much power"; on barrel: regulator current-limits and gets hot |

## 30. Lesson facts summary (pins and code to use)

| Lesson | Pins | Key API |
|---|---|---|
| Blink | D13 (L LED) or LED on D13 via 220 Ω | `pinMode(13, OUTPUT)`, `digitalWrite`, `delay` |
| Button | D2 input with 10 kΩ pull-down, or `INPUT_PULLUP` | `digitalRead`, debounce with `millis()` |
| Knob / PWM | A0 pot, LED on ~9 | `analogRead`, `analogWrite`, `map` |
| RGB | ~9, ~10, ~11 | `analogWrite` (no `tone` at the same time) |
| Light | LDR divider on A0, LED on ~9 | `analogRead`, threshold/hysteresis |
| Sound | D8 passive buzzer | `tone`, `noTone` |
| Motor | ~6 → 1 kΩ → TIP120 base, 1N4001 across motor | `analogWrite(6, duty)` (≈ 980 Hz on pins 5/6) |
| Servo | D9 | `Servo.attach`, `write` (Servo 1.3.0) |
| Stepper | 8, 10, 9, 11 | AccelStepper 1.64 FULL4WIRE, 2037.8864 steps/rev, ≤ 500 steps/s |
| OLED | A4 SDA, A5 SCL, 0x3C | Adafruit_SSD1306 2.5.17 or U8g2 2.37.1 |
| DHT | D2 + 10 kΩ pull-up | DHT sensor library 1.4.7 |
| LCD | A4/A5, 0x27 or 0x3F | hd44780 1.3.2 / LiquidCrystal_I2C |
| WS2812B | D6 via 330 Ω | Adafruit_NeoPixel 1.15.5 / FastLED 3.10.8 |
| BME280 | A4/A5 (via a level-shifted breakout), 0x76/0x77 | Adafruit_BME280 2.3.0 |

## 31. Internals for see-through views

- **LED**: epoxy lens; cathode lead ends in a reflector cup ("anvil") holding a ~0.25–0.3 mm square die; a gold bond wire (~25 µm) arcs from the die top to the anode post ("post"). White LEDs have a yellow phosphor blob in the cup.
- **Resistor**: ceramic rod coated with a carbon (or metal) film; a helical groove cut into the film sets the value; end caps crimp the leads; painted bands over a lacquer coat.
- **Tactile switch**: a domed stainless-steel snap disc sits over a centre contact; the plunger presses the dome, which snaps and bridges the outer ring (strip 1–2) to the centre (strip 3–4).
- **Potentiometer**: a horseshoe carbon track on a phenolic/ceramic wafer between the two end terminals; a metal wiper on the shaft slides on it, connected to the middle terminal.
- **LDR**: ceramic substrate, CdS layer in a serpentine between two interdigitated metal electrodes, epoxy or glass window.
- **TMP36**: a silicon die with a bandgap (ΔVbe) temperature core and an output amplifier, gold-wire bonded to a 3-lead frame inside the TO-92 epoxy.
- **Buzzers**: magnetic type: coil around a pole piece, a thin steel diaphragm over it with a small iron weight, inside a plastic can with a sound hole; piezo type: a brass disc with a ceramic (PZT) layer. Active types add a small PCB oscillator (transistor + resistors) inside.
- **TIP120**: a single silicon die with the two transistors and resistors, soldered to the copper tab (collector), base and emitter bond wires (aluminium) to leads 1 and 3.
- **1N4001**: a glass-passivated silicon PN chip between two lead slugs in the epoxy body.
- **DC motor**: two arc ferrite magnets on the steel can, 3-pole wound armature on the shaft, commutator with two metal-leaf brushes in the end cap.
- **SG90**: motor + 4 nylon spur gears + output shaft with a pot on its base + control PCB.
- **28BYJ-48**: two stator coils with a centre tap (red), claw-pole stator, a 32-step permanent-magnet rotor (8 pole pairs × 4 phases), a 4-stage plastic/metal gear train (9→32, 11→22, 9→26, 10→31) under the top plate.
- **ULN2003**: one die with seven Darlington pairs, base resistors and clamp diodes.
- **OLED**: glass panel with organic layers between ITO rows and metal columns; the SSD1306 is a long chip-on-glass (COG) die bonded along one edge of the glass, with a flex tail folded behind the panel to the PCB.
- **DHT11/22**: a resistive (DHT11) or capacitive (DHT22) humidity element and an NTC thermistor behind the grille, read by a small 8-bit MCU on a PCB inside.
- **HC-SR501**: a pyroelectric sensor (TO-5 metal can with a window and two sensing elements) under the Fresnel lens; BISS0001 handles the signal.
- **WS2812B**: three LED dies (R, G, B) plus a control IC die in one 5050 package, wire bonded.
- **Relay**: coil on an iron core, hinged armature, spring, moving contact between the NC and NO contacts, inside a sealed plastic case.
- **BME280**: MEMS pressure membrane and capacitive humidity element with the ASIC under a metal lid with a small vent hole.

## 32. Assembly and power-up notes

- Discrete parts (LEDs, resistors, buttons, pots, TO-92, TO-220, DO-41) are through-hole; breadboard use needs no solder.
- Modules are SMD-reflowed boards with **through-hole headers soldered by hand or wave** — often loose in the bag (OLED, BME280, joystick come with an unsoldered header). Headers are the most common cold-joint location.
- At power-up: the relay module power LED lights; the HC-SR501 settles for ~1 min; the OLED stays dark until the sketch runs `begin()` (it powers up with the display off); the 16×2 LCD shows a row of solid blocks on line 1 until initialised (contrast set right); WS2812Bs stay off (or show random colours on some clone batches, unverified) until data arrives; DHTs need ~1 s after power before the first read; the ULN2003 board LEDs are all off.

## 33. Uncertainties

- Primary sources that could not be fetched by the original researcher, so the values taken from them were from memory: ADI TMP36 PDF, onsemi TIP120/1N4001 PDFs (the Fairchild TIP120 and Diodes Inc. 1N4001 sheets were read instead), Aosong DHT11 sheet, HC-SR501 manual (404), HC-SR04 user guide, SSD1306 datasheet, NXP PCF8574 datasheet, Songle SRD and PC817 sheets, Interlink FSR 402 sheet, Mabuchi FA-130RA sheet, BusBoard BB400 page, TowerPro wire colours. The fact-check (see Verification) has since read TMP36 (SparkFun mirror), DHT11 (translated Aosong sheet), HC-SR501 manual (Cornell mirror), HC-SR04 guide, SSD1306 datasheet, TI PCF8574/PCF8574A, Songle SRD, Interlink FSR 400 series sheet, the SG90 sheet's wire colours and the Fulling 28BYJ sequence table. Still unread: onsemi TIP120/1N4001, PC817, Mabuchi FA-130RA, BusBoard BB400.
- Read this run: Omron B3F, Kiatronics 28BYJ-48, TI ULN2003A, TowerPro SG90 (friendlywire copy), Fairchild TIP120, Diodes Inc. 1N4001, Worldsemi WS2812B, Bosch BME280, Aosong AM2302, Adafruit FSR table, Adafruit TMP36 guide, BusBoard BB830, GitHub release tags for every library named.
- Exact mechanical dimensions of generic modules (soil sensor, traffic light, relay, joystick, ULN2003 board, PIR) vary by maker; the figures above are typical, marked unverified where I did not find a drawing.
- Pin order of generic modules (traffic light `R Y G GND` vs `GND R Y G`; OLED `GND VCC` vs `VCC GND`; DHT 3-pin boards) varies: draw what the silk of the modelled variant says, and keep the order a property of the part.
- 28BYJ-48 real-world max speed is unit-dependent; the 15 RPM figure is a practical guideline, not a datasheet number.
- Whether every 28BYJ-48 batch is 63.68395:1: teardown counts say yes for the common Kiatronics/Chinese units; a minority of sources claim exactly 64:1 versions exist.
- SG90 stall current and operating voltage ranges are quoted inconsistently by sellers.
- FSR power-law exponent is a fit to four table points.
- WS2812B reset time: 50 µs (old datasheet) vs 280 µs (V5 / WS2812B-2020 and later); libraries already wait ≥ 300 µs.
