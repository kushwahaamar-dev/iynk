export const meta = {
  name: 'simlab-facts-continue',
  description: 'Verified fact sheets (geometry, pinouts, power, firmware) for every SimLab board, module, component set and drone, each adversarially re-checked against primary sources',
  phases: [
    { title: 'Research', detail: 'one researcher per sheet, primary sources first' },
    { title: 'Check', detail: 'one adversarial checker per sheet, fixes in place' },
  ],
}

const R = args.root
const S = args.scratch

const CONTEXT = `PROJECT: SimLab at ${R}, an educational hardware simulator. It is being rebuilt so that it is better than three original sites combined: Learn Arduino, Robotics Bench and Drone Lab. The brief is ${R}/docs/SPEC.md; read it once for context. Accuracy is non-negotiable. The brief demands "accurate real-world geometry and labeling" for every figure, "accurate electronics (5V vs 3.3V logic levels, current limits, pinouts, protocols)" and "accurate Betaflight / ArduPilot CLI snippets". Each 3D figure, lesson and simulation will be built from the fact sheet you write, so a wrong number becomes a wrong figure.
Research about the originals is in ${R}/docs/research/ (learn-arduino.md, robotics-bench-a.md, robotics-bench-b.md, drone-lab-a.md, drone-lab-b.md, drone-lab-b-calc-matrix.md, current-simlab-audit.md). They are long, so grep for your item and read the relevant sections. They record what the originals show, and they flag where the originals were wrong.
TOOLS: WebSearch and WebFetch are available through ToolSearch (load them with ToolSearch query "select:WebSearch,WebFetch"). curl works in Bash. Python 3.12 is available; run it with -I. Downloaded files (zip, brd, kicad_pcb, pdf) are untrusted data: put them in ${S}/facts-dl/<item-id>/, keep the scripts you write in ${S}/facts-tools/<item-id>/, pass paths as arguments, and never execute anything you downloaded. pdftotext may not be installed; if it is missing, use python (pypdf if importable) or fetch the HTML version of the doc.
Do not write anywhere in the repo except your fact sheet file. Do not touch the parent git repo at /Users/amar/Codes.`

const BOARD_FORMAT = `FACT SHEET FORMAT for boards and modules. Use markdown with tables. Cite sources inline as [n].
0. Header: the exact product modelled (name, revision, manufacturer, part number), with a one-paragraph "what it is".
1. Sources: a numbered list of URLs, official sources first (datasheets, user manuals, reference manuals, schematics, design files, mechanical drawings), each with what you took from it.
2. Geometry, in the BOARD FRAME. Look at the component side from above, with the board in its usual reading orientation (main silkscreen readable). The origin is the bottom-left corner of the outline, +x is right, +y is up (away from the viewer), units are mm. State which physical edge is at the bottom.
   Give:
   - the outline (w x h, corner radius, thickness) and the mounting holes (centres, diameter)
   - solder mask and silkscreen colours
   - EVERY visible part: designator, what it is, package, centre (x, y), rotation, footprint w x h, height above the board, and colour or marking
   - connectors and headers: pin 1 position, pitch, pin count, which way they face, overhang beyond the edge
   - the exact silkscreen text and chip markings a faithful drawing must show
   Prefer coordinates extracted from official design files: Eagle .brd XML, KiCad .kicad_pcb, Altium-exported pick-and-place/centroid files, mechanical drawings. Say exactly how you got them. Never estimate a position you could have extracted; when you must estimate, say "(estimated from <photo/drawing>)".
3. Electrical: the MCU/SoC/FPGA (core, clock and clock source, memory); the power tree (every input with its range and protection: diodes, polyfuses, regulators with current limit and dropout, power-path switching); logic level and 5 V tolerance; current limits per pin and in total; ADC (bits, reference, channels); PWM (pins, frequencies); DAC; the USB-serial or debug chip; every LED (designator, colour, net or pin, active level, what drives it); every button and switch (function, pin, active level); on-board sensors.
4. Pinout: every header pin in physical order, with the label as printed, functions, voltage and notes (strapping, flash, input-only, analog-only, 5 V tolerant or not, boot behaviour).
5. Programming: toolchains and current core/firmware versions (October 2026); the upload path and its real console messages (avrdude, esptool, picotool or the UF2 drive, ST-LINK/OpenOCD, Vivado or Quartus); auto-reset; boot behaviour and LED patterns; the factory sketch.
6. Real failure modes. What physically happens on each of these:
   - reverse polarity on each input
   - over-voltage
   - brown-out (BOD thresholds)
   - over-current
   - a cold solder joint
   - 5 V into a 3.3 V pin
   - shorting 5 V to GND
   - beginner traps specific to the board
   For each, say which part protects or fails and what the user would observe (LEDs, heat, resets, smell).
7. Lesson facts. The board will get at least 4 progressive lessons: Blink/I-O, button + sensor, PWM/analog, and one protocol or Wi-Fi lesson. Give the exact pins, LEDs and buttons to use and the correct idiomatic code: Arduino API names and constants, MicroPython API, gpiozero, or Verilog with the real constraint names from the official XDC/QSF. Name libraries and their current versions.
8. Internals for the see-through view: what is really inside the key parts (die, bond wires, quartz blank, RF can contents, regulator, USB bridge, flash), so the cutaway is truthful.
9. Assembly and power-up: how it is manufactured (SMD reflow, through-hole, socketed parts, what goes on last) and what happens at power-up (which LEDs light, enumeration, default program).
10. Uncertainties: everything you could not verify, and why.`

const DRONE_FORMAT = `FACT SHEET FORMAT for drones. Use markdown with tables. Cite sources inline as [n].
0. Header: the craft class, plus 2-3 real products or reference builds it represents (names, links), with a one-paragraph "what it is and what it is for".
1. Sources: a numbered list of URLs, official firmware docs, manufacturer spec pages and test data first.
2. Geometry, in the CRAFT FRAME: x forward (nose), y left, z up, origin at the frame centre on top of the bottom plate, units mm. Give:
   - frame layout, wheelbase (motor-to-motor diagonal), arm length, width and thickness, plates, stack mounting pattern
   - every motor position (x, y) with its number in the firmware's motor order and its spin direction seen from above, for the firmware's default prop direction (and the alternative)
   - prop size, pitch and blade count; camera position and uptilt; battery position; frame mass
   For wings and VTOLs: span, chords, sweep, control surfaces, motor and tilt positions.
3. The original's catalogue, sanity-checked. Take every battery, motor and prop option and every fixed part listed for this craft in the Drone Lab research docs. Check its mass, capacity, KV, thrust and price against real products and manufacturer thrust tables. SimLab keeps the original calculator identical, so do not change the numbers; flag any option whose description is untrue or implausible, and give the real-world figure.
4. Electronics and wiring:
   - FC (MCU, mounting) and ESC (rating, firmware such as BLHeli_32, Bluejay or AM32, protocol such as DShot)
   - receiver (ExpressLRS/CRSF, which UART), video (analog or HD, SmartAudio/Tramp/MSP DisplayPort), GPS/compass (UART/I2C)
   - power connector and the low-ESR capacitor rating, BECs, LEDs, buzzer
   - a typical pad/UART map for one named FC, and wire colours
5. Firmware: the firmware and its current stable version in October 2026 (verify it). Give exact, verified CLI or parameter snippets, each with a source link to official docs or the parameter list/source code, for:
   - initial setup
   - every flight mode and feature this craft uses in the original (see the research docs)
   - failsafes, OSD, VTX table/power, RPM filtering, motor direction reversal (in firmware and in the ESC), accelerometer calibration, arming checks
   Name the arming-blocker flags or pre-arm checks, and the real names and units of parameters that were renamed in recent versions.
6. Safety tests: what a smoke stopper is and how it works; the props-off motor direction test (in which tool); the accelerometer and compass calibration procedure; pre-arm checks; and what each test catches.
7. Flight characteristics: typical hover throttle, AUW, T:W, flight times (hover and aggressive), top speed, current draw. For wings: stall, cruise and L/D. For VTOLs: transition speed. For multi-motor crafts: motor-out behaviour.
8. Real failure modes: desync, brown-outs, a reversed motor or swapped props (flip on take-off), wrong board alignment, a missing capacitor, prop wash, GPS/compass errors, and anything else craft-specific, with what the pilot sees.
9. Uncertainties.`

const NOTES = `ALWAYS: Be precise. Never guess. Prefer primary sources. Where two sources disagree, record both and say which you trust and why. Keep the sheet self-contained, because the people building the figure will read only this file. When done, re-read your sheet once against your sources and fix any slips.`

const ITEMS = [
  { id: 'uno-r3', kind: 'board', title: 'Arduino Uno Rev3 (A000066, through-hole ATmega328P-PU in a socket)', notes: `Get the official Eagle design files for the UNO Rev3 from docs.arduino.cc (or the Arduino GitHub hardware repos), parse the .brd XML and extract every element's x, y and rotation. Verify the real clocking from the Rev3 schematic: the HC-49 16 MHz crystal versus the 16 MHz ceramic resonator, and which chip each clocks (ATmega16U2 vs ATmega328P). Also verify:
- the barrel jack's reverse-protection diode (M7) and the 500 mA polyfuse on USB VBUS (what a reversed barrel really does)
- NCP1117ST50 5 V and LP2985-33 3.3 V at 150 mA
- the LMV358: the L LED buffer and the USB/VIN auto-select comparator with the FDN340P MOSFET
- the ICSP headers for 328P and 16U2, RESET, and the LEDs ON/L/TX/RX
- the D7/D8 header gap (160 mil offset), and the 68.6 x 53.4 mm outline with its 4 holes
Reconcile with the parts that Learn Arduino's "Meet the board" (27 parts, 6 callouts: USB Port, Microcontroller, Digital Pins 0-13 (~PWM), Power Jack (7-12V recommended), Power Pins (5V, 3.3V, GND, VIN), Analog Pins A0-A5) and Robotics Bench Fig. 01 (24 parts) show, mapping their names to the real designators. Include the original Uno factory Blink behaviour, avrdude upload messages (stk500v1/arduino programmer at 115200), auto-reset via DTR (100 nF), and BOD.` },
  { id: 'quad5', kind: 'drone', title: '5-inch freestyle FPV quad on Betaflight (Drone Lab Fig. 01)', notes: `Research doc: ${R}/docs/research/drone-lab-a.md, the Fig. 01 quad5 section and Appendix A. Real references: a typical 2025-2026 5-inch freestyle build, e.g. a 225 mm-class frame, 2306/2207 motors, a 30.5 mm F7/F4 stack with a 4-in-1 ESC, an ELRS receiver, DJI O4/O3 or analog VTX, and 6S. Betaflight: verify the current version naming (calendar versions such as 2025.12) and the exact CLI for the following:
- DShot and bidirectional DShot plus the RPM filter, motor_poles
- serial/CRSF setup and VTX tables
- angle/horizon/acro/air mode, small_angle, failsafe, OSD elements, beeper, board alignment
- motor direction reversal (yaw_motors_reversed vs ESC-side reversal), accelerometer calibration
Name the arming-disable flags. Verify the motor order and spin for props-in (default) and props-out. Note the errors the research found in the original's CLI (e.g. no mini_quad setting, osd_timer_1 = ON invalid) and give the correct forms.` },
  { id: 'nano', kind: 'board', title: 'Arduino Nano (classic A000005, ATmega328P TQFP-32)', notes: `Official Eagle files (Nano 3.x) for exact positions. Cover:
- the FT232RL on genuine boards vs CH340 on clones (note the differences), mini-B USB
- the 2 x 15 headers at 0.6 in, the ICSP, the 5 V regulator (which part), the VIN range
- A6/A7 being analog-only, the LEDs, RESET, the ~45 x 18 mm outline
- the Schottky diode from USB, and what the 5V pin does when powered from VIN
Note the Nano Every and Nano ESP32 exist but are not modelled. Robotics Bench uses a Nano on the mat in several figures, so make the geometry exact.` },
  { id: 'uno-r4', kind: 'board', title: 'Arduino UNO R4 Minima (ABX00080) and UNO R4 WiFi (ABX00087)', notes: `Official design files (KiCad or Altium exports) and the datasheets from docs.arduino.cc. Cover:
- the RA4M1 (R7FA4M1AB3CFM: Cortex-M4F at 48 MHz, 256 KB flash, 32 KB SRAM, 8 KB data flash), which runs at 5 V
- the 12-bit DAC on A0, analogReadResolution up to 14 bits, OPAMP, CAN, USB-C, VIN 6-24 V and the regulator
- Minima's SWD header and LEDs
- WiFi: the ESP32-S3-MINI-1 (USB bridge plus Wi-Fi/BLE), the 12 x 8 red LED matrix (Arduino_LED_Matrix library), the Qwiic connector (3.3 V, on Wire1), the OFF pin, ESP header
Give both layouts, with the differences called out, so one figure can switch variants.` },
  { id: 'esp32-devkitc', kind: 'board', title: 'Espressif ESP32-DevKitC V4 (ESP32-WROOM-32E)', notes: `Official Espressif docs and the schematic. The brief says "ESP32 DevKit (dual-core, Wi-Fi + BLE)". The official DevKitC V4 has only a red power LED and no user LED, while the very common 30-pin "DOIT ESP32 DEVKIT V1" clone has a blue LED on GPIO2. Document both, and recommend which to model and how the Blink lesson should work (e.g. an external LED, and why GPIO2 is a strapping pin). Cover:
- CP2102N vs CH9102F, the AMS1117-3.3, EN/BOOT, the 2 x 19 header pinout
- GPIO6-11 (flash: never use), input-only GPIO34-39, strapping pins (0, 2, 5, 12, 15), ADC1 vs ADC2 (Wi-Fi), touch pins, DAC 25/26
- 3.3 V logic, not 5 V tolerant; per-pin current limits
- the esptool upload log and the auto-program circuit
- the dimensions` },
  { id: 'esp32-s3-devkitc-1', kind: 'board', title: 'Espressif ESP32-S3-DevKitC-1 v1.1', notes: `Official Espressif docs, the schematic for v1.1, and the v1.0 differences. Cover:
- module options (ESP32-S3-WROOM-1/1U, N8, N8R8, N16R8, etc.)
- the two USB-C ports: the UART bridge chip (which one on v1.1) and native USB OTG on GPIO19/20
- the RGB WS2812-type LED on GPIO38 (v1.1) vs GPIO48 (v1.0)
- the BOOT (GPIO0) and RST buttons, the LDO, the 2 x 22 header pinout
- strapping pins (0, 3, 45, 46); GPIO35-37 unavailable with octal PSRAM; ADC/touch
- Arduino-ESP32 core 3.x APIs: rgbLedWrite/neopixelWrite, RGB_BUILTIN, ledcAttach/ledcWrite; WiFi/WebServer
- esptool messages and dimensions
Cross-check against robotics-bench-a.md Fig. 04 (its parts and its "hue 0 deg" bug).` },
  { id: 'nodemcu', kind: 'board', title: 'NodeMCU DevKit v1.0 (ESP-12E/ESP8266EX)', notes: `Cover:
- the Amica v2 (CP2102, narrow) vs the LoLin v3 (CH340G, wide): document both and recommend one
- the D0-D8 to GPIO map (16, 5, 4, 0, 2, 14, 12, 13, 15), RX/TX, SD pins
- on-board LEDs: the ESP-12 module LED on GPIO2 and the board LED on GPIO16, both active-low (verify per variant)
- A0 with its divider (which resistors; 0-3.2 V range)
- FLASH and RST buttons, the AMS1117-3.3, the VIN/VU pins
- boot strapping (GPIO0, 2, 15) and what each boot mode prints at 74880 baud
- ESP8266 Arduino core 3.x APIs (ESP8266WiFi, ESP8266WebServer), esptool messages, dimensions` },
  { id: 'pico', kind: 'board', title: 'Raspberry Pi Pico, Pico W, Pico 2, Pico 2 W', notes: `Official datasheets and mechanical drawings. The 51 x 21 mm board has 40 castellated pins at 2.54 mm. Cover:
- the SWD debug pads/header, BOOTSEL, micro-USB, the buck-boost regulator (which part per board), the 12 MHz crystal, the flash chip
- the LED: GP25 on Pico and Pico 2, WL_GPIO0 on CYW43439 for W boards
- VSYS/VBUS/3V3_EN/RUN; ADC0-2 on GP26-28 and the internal ADC channels (VSYS/3 on GP29 etc. per board)
- RP2040 vs RP2350 (Cortex-M33 or Hazard3 RISC-V at 150 MHz, 520 KB SRAM, 4 MB flash on Pico 2), and the RP2350-E9 erratum if relevant to input pull-downs
- fixed pin sets for hardware I2C/SPI/UART
- MicroPython (machine API, rp2), arduino-pico core, BOOTSEL drive names (RPI-RP2 / RP2350), UF2 flow, power-up behaviour
- the visual differences between variants (chip marking, RF shield, antenna keep-out)` },
  { id: 'nucleo-f401re', kind: 'board', title: 'ST NUCLEO-F401RE (MB1136)', notes: `Use UM1724 and the board schematic or design files. Cover:
- the STM32F401RET6 (Cortex-M4F at 84 MHz, 512 KB flash, 96 KB RAM)
- the ST-LINK/V2-1 section (MCU, USB mini-B, LD1 COM bicolour), LD2 (green user LED on PA5/D13), LD3 (red power)
- B1 (blue user button on PC13, active low) and B2 (black reset)
- the ST morpho headers CN7/CN10 and the Arduino Uno V3 headers CN5/CN6/CN8/CN9
- power jumpers (JP5 U5V/E5V and so on), E5V/VIN ranges
- the 3.3 V MCU with 5 V-tolerant (FT) pins, and which pins are not FT
- the HSE source (MCO from ST-LINK at 8 MHz, X3 not fitted), the X2 LSE
- STM32duino names (LED_BUILTIN = PA5, USER_BTN = PC13, Serial = USART2 over the ST-LINK VCP), STM32CubeProgrammer/ST-LINK upload messages
- the 70 x 82.5 mm board outline, including the snap-off ST-LINK part` },
  { id: 'microbit-v2', kind: 'board', title: 'BBC micro:bit V2 (V2.2x)', notes: `Use the official hardware docs at tech.microbit.org and the open-source hardware files on GitHub (microbit-foundation). Cover:
- the nRF52833, and the interface MCU (nRF52820 on V2.2x, KL27 on V2.00)
- the 5 x 5 LED matrix wiring, buttons A/B, the touch logo, the MEMS microphone and its LED, the speaker
- the LSM303AGR (or the newer motion sensor on V2.2x; verify) with its I2C addresses
- the edge connector (25 strips, which are the big rings), the JST-PH battery connector, micro-USB, and the reset/power button behaviour
- dimensions
- the MicroPython for micro:bit V2 API: display, Image, button_a/b, pin_logo, microphone, speaker, music, radio, accelerometer, compass, pins with read_analog/write_analog
- what the drag-and-drop HEX flashing looks like (MICROBIT drive, the yellow LED flashing)` },
  { id: 'pi4-pi5', kind: 'board', title: 'Raspberry Pi 4 Model B and Raspberry Pi 5', notes: `Use the official mechanical drawings and product briefs (85 x 56 mm, holes on a 58 x 49 mm grid). Cover the 40-pin header pinout (BCM numbers, 3.3 V, not 5 V tolerant, current limits) and:
Pi 4:
- BCM2711, the PMIC, 2 x micro-HDMI, USB-C 5 V/3 A, USB, Ethernet, CSI/DSI, the PoE header, the PWR/ACT LEDs
Pi 5:
- BCM2712 at 2.4 GHz, RP1, the DA9091 PMIC, the power button, J5 RTC battery, the fan header
- the PCIe 2.0 x1 FFC, 2 x 4-lane MIPI connectors, the UART debug header
- USB-C 5 V/5 A PD (27 W supply), undervoltage (~4.63 V) and the get_throttled bits (0, 1, 2, 3, 16, 17, 18, 19)
- thermal throttling at 80/85 C, the Active Cooler
Software:
- gpiozero (its default pin factory on Pi 5) and why RPi.GPIO does not work on Pi 5
- ROS 2: which distribution is the current LTS in October 2026 (verify: Jazzy is the 2024 LTS; check whether a 2026 LTS such as Lyrical Luth has shipped, and on which Ubuntu), plus correct rclpy publisher/timer/subscriber code and ros2 CLI output for teleop (/cmd_vel geometry_msgs/msg/Twist)
- boot LED patterns
Cross-check robotics-bench-b.md Fig. 13 (its parts and the errors it lists).` },
  { id: 'basys3', kind: 'board', title: 'Digilent Basys 3 (Artix-7 XC7A35T-1CPG236C)', notes: `Use the Digilent reference manual and the official Basys-3-Master.xdc. Cover:
- the 100 MHz clock on W5
- 16 switches sw[15:0], 16 LEDs led[15:0], 5 buttons (btnC/U/L/R/D) in a plus shape
- the 4-digit common-anode 7-segment: seg[6:0] CA-CG and dp active low, an[3:0] active low; the multiplexing requirement and refresh-rate guidance
- VGA, USB-UART/JTAG via the FT2232HQ, USB-HID host via the PIC24
- 4 Pmods (JA, JB, JC, JXADC), the power switch, JP1 programming-mode and JP2 power-source jumpers
- the DONE LED and power LED, Quad-SPI flash
- board dimensions and part positions (estimate from drawings if no CAD exists; say so)
Give every switch/LED/button/7-seg pin from the master XDC with its exact port names, and the Vivado flow messages (synthesis, implementation, write_bitstream, program device) for the upload animation.` },
  { id: 'de10-lite', kind: 'board', title: 'Terasic DE10-Lite (Intel MAX 10 10M50DAF484C7G)', notes: `Use the Terasic user manual and the System Builder pin assignments (.qsf). Cover:
- the clocks MAX10_CLK1_50, MAX10_CLK2_50 and ADC_CLK_10
- SW[9:0], LEDR[9:0], KEY[1:0] (active low, Schmitt-debounced), HEX0-HEX5 (active low with DP)
- VGA, 64 MB SDRAM, the ADXL345, the Arduino Uno R3 header, the 2 x 20 GPIO header, USB-Blaster II (USB-B), the power input and power switch
- board dimensions and positions
Give every SW/LEDR/KEY/HEX pin with its exact names from the .qsf, the Quartus Prime Lite compile and Programmer messages, and the factory default design behaviour.` },
  { id: 'trainers', kind: 'module', title: 'LED + resistor trainer and NPN transistor switch (Robotics Bench Fig. 02 and 03 custom boards)', notes: `These two are custom teaching boards from the original. Read robotics-bench-a.md Fig. 02 and Fig. 03 fully and verify every real-world component fact they rely on:
- the 5 mm red LED: Vf at 10/20 mA, maximum If, reverse voltage rating, what over-current really does
- resistor values, power ratings, tolerances and colour codes
- multimeter current measurement: series connection, mA/A ranges and fuses, burden voltage
- the 2N2222A (TO-18) and PN2222A (TO-92): pinouts (EBC for TO-92 PN2222A), hFE, Vce(sat) at 150/500 mA, Ic max
- base resistor sizing, the 1N4007 flyback diode and inductive kick
- TT gear motor ratings (voltage, no-load and stall current)
- a 4 x AA pack: alkaline vs NiMH voltage and internal resistance
- the 100 uF electrolytic: polarity and what reversed really does
Give the corrected formulas and numbers the lessons should show.` },
  { id: 'tb6612', kind: 'module', title: 'TB6612FNG dual motor driver breakout (SparkFun ROB-14451/ROB-14450, Pololu #713)', notes: `Use the Toshiba datasheet and the breakout schematics. Cover:
- VM range (recommended and absolute), VCC, output current (average and peak per channel), on-resistance, and the voltage drop at 0.5/1 A
- the PWM frequency limit, STBY, the full truth table (CW/CCW/short brake/stop/standby), internal diodes, thermal shutdown
- the breakout's pinout, dimensions and caps
Reconcile the original's 0.5 V vs 0.2 V drop inconsistency with real data.` },
  { id: 'l298n', kind: 'module', title: 'L298N dual H-bridge module (common red 43 x 43 mm board, Multiwatt15 L298N)', notes: `Use the ST L298 datasheet and the common module's schematic. Cover:
- the 78M05 regulator and its jumper (when it must be removed), the protection diodes (which ones), the bulk caps and their voltage rating (the module's real max input)
- the ENA/ENB jumpers (motors do not run without them or PWM)
- the IN1-IN4 truth table, the current-sense pins
- Vce(sat) high and low per datasheet at 1 A and 2 A, giving the realistic total drop, plus the heat and efficiency compared with the TB6612
- dimensions and part positions
Cover everything the "why not to use it" lesson needs.` },
  { id: 'a4988', kind: 'module', title: 'Pololu A4988 stepper driver carrier (#1182) and a NEMA 17 motor', notes: `Use the Allegro datasheet and the Pololu product page. Cover:
- 15.2 x 20.3 mm, the current-sense resistors (0.068 ohm since 2017, 0.050 ohm earlier), the Vref formula and where to measure Vref
- VMOT 8-35 V, coil current without and with cooling, logic 3-5.5 V
- the MS1-MS3 table, SLEEP/RESET tied together, ENABLE, the 100 uF VMOT capacitor requirement
- why disconnecting a motor while powered destroys the driver, thermal shutdown
- STEP timing minimums, DIR setup
- NEMA 17 typical specs (1.8 deg, 200 steps, rated current, resistance, holding torque, 42 x 42 mm) and wire colours/pairs
Make the microstep timing facts the original got wrong right.` },
  { id: 'pca9685', kind: 'module', title: 'Adafruit 16-channel 12-bit PWM/Servo Driver (PCA9685, #815) with SG90 servos', notes: `Cover:
- dimensions and part positions, the I2C address 0x40 with the A0-A5 jumpers, the 25 MHz internal oscillator and its real tolerance (setOscillatorFrequency calibration)
- the prescale formula and the 50 Hz value, 12-bit ticks and microseconds per tick, the 220 ohm series resistors
- the V+ terminal and its reverse-polarity protection, OE, the capacitor footprint, chaining
- the Adafruit_PWMServoDriver API (begin, setPWMFreq, setPWM, writeMicroseconds, setOscillatorFrequency)
- SG90 pulse range for full travel, stall current, and the brown-out when servos share the Arduino 5 V
Check robotics-bench-b.md Fig. 08's channels (0 and 1) and its arm.` },
  { id: 'mpu6050', kind: 'module', title: 'MPU-6050 on a GY-521 breakout', notes: `Cover:
- dimensions and parts (the LDO marking 662K and which part, the pull-up values and which rail they go to, the LED)
- address 0x68/0x69 via AD0, the ranges and sensitivities (LSB per deg/s and per g)
- the key registers (PWR_MGMT_1, ACCEL_XOUT_H, GYRO_XOUT_H, CONFIG/DLPF, SMPRT_DIV) and the WHO_AM_I value
- gyro bias and drift behaviour, typical noise
- the complementary filter (alpha, time constant tau = alpha*dt/(1-alpha)) and Kalman/Madgwick names
- the product's lifecycle status
- the common Arduino libraries and their APIs (Adafruit_MPU6050, MPU6050 by Electronic Cats/jrowberg), and raw Wire code
Check robotics-bench-b.md Fig. 09's synthetic signals and say what a real filter would show.` },
  { id: 'hcsr04', kind: 'module', title: 'HC-SR04 ultrasonic rangefinder (and the HC-SR04P 3.3 V variant)', notes: `Cover:
- dimensions and part positions for the classic board (EM78P153 + LM324 + MAX232, 12 MHz crystal) and the newer single-chip versions (RCWL-9206 etc.)
- supply, current, 40 kHz burst (8 cycles), range, the beam/measuring angle (15 deg spec vs ~30 deg cone in practice), trigger and echo timing, the timeout on no echo, the measurement cycle
- the speed of sound vs temperature, cm = us/58
- soft targets and angled surfaces
- 3.3 V boards (ECHO divider), pulseIn usage
Correct the original's VL53L0X cone claim, with ST's number.` },
  { id: 'qtr8rc', kind: 'module', title: 'Pololu QTR-8RC reflectance sensor array', notes: `Cover:
- dimensions (75 x 12.7 mm), sensor pitch (9.525 mm), the sensors (QRE1113GR) and their positions, LEDON/CTRL and the MOSFET
- the 3.3/5 V operation, the RC readout method and timings, the optimal sensing distance
- the QTRSensors v4 library API (setTypeRC, setSensorPins, setEmitterPin, calibrate, readLineBlack returning 0-7000)
- what happens when the line is lost, and the current product line (newer QTR-HD/MD variants)
Check robotics-bench-b.md Fig. 11's line-position math.` },
  { id: 'lm2596', kind: 'module', title: 'LM2596S-ADJ buck converter module with 3-digit voltmeter', notes: `Use the TI LM2596 datasheet and the common module's parts (inductor value and current rating, SS34 Schottky, input/output caps and voltage ratings, the 3296 trimmer, the display and its IN/OUT button). Cover:
- input and output ranges, the realistic continuous current with and without a heatsink, the switch current limit, dropout, 150 kHz switching, efficiency curves
- how output voltage depends on the feedback divider
- what a motor stall does to the output, and Arduino brown-out (ATmega328P BOD levels; the real reason a Nano resets)
- buck vs linear heat with worked numbers from a 3S LiPo (12.6/11.1/9.9 V)
Fix the original's two inconsistent heat numbers.` },
  { id: 'la-components', kind: 'module', title: 'Components for the Board Lab lessons (Learn Arduino parts + common sensors/actuators)', notes: `One sheet, one section per component, covering everything Learn Arduino's 16 lessons use (read learn-arduino.md fully) plus the common sensors/actuators SimLab will let learners wire in:
- breadboards: full 830 and half 400; rows, columns, the trench, rails, split rails
- resistors and colour codes; 5 mm LEDs (Vf per colour); the common-cathode RGB LED pinout
- the 6 x 6 tactile button (which pins are joined); the B10K potentiometer; the LDR GL5528 (resistance vs lux, gamma); TMP36 (scale, offset, pinout, supply range)
- the passive piezo vs the active buzzer; TIP120 (Vbe(on), Vce(sat), hFE); 1N4001/4007; a small DC motor
- SG90 (pulse range, 50 Hz); 28BYJ-48 + ULN2003 (real gear ratio 63.68:1, steps per revolution in full and half step, real max RPM at 5 V)
- the capacitive soil moisture sensor v1.2 (output range, the 555 variants issue)
- SSD1306 128x64 I2C (address 0x3C/0x3D, supply, the U8g2/Adafruit_SSD1306 APIs); FSR 402 (force-resistance curve)
- the traffic-light LED module; DHT11/DHT22; the HC-SR501 PIR; the 16x2 I2C LCD (PCF8574 at 0x27/0x3F)
- WS2812B; the relay module (with its flyback and optocoupler); the joystick module; BME280
For each: what a correct breadboard drawing shows (pin order, polarity, size) and the facts a simulation needs. Correct the errors learn-arduino.md lists (28BYJ-48 steps and RPM, heat-lesson text, the I2C 5 V vs 3V3 note, the missing motor flyback diode).` },
  { id: 'whoop', kind: 'drone', title: 'Tiny Whoop 65 mm (Drone Lab Fig. 02)', notes: `Research doc: drone-lab-a.md, the Fig. 02 whoop section. Real references: BetaFPV Meteor65 / Air65, Happymodel Mobula6. Cover:
- 1S BT2.0 300/450 mAh (and HV), 2S options, 0702 motors (KV), 31 mm props, the AIO 5-in-1 FC with ELRS and VTX, weights 20-30 g
- turtle mode / crash flip CLI in current Betaflight
- 1S voltage sag reality (the original's model was wrong), the whoop OSD current` },
  { id: 'cinewhoop', kind: 'drone', title: '3-inch cinewhoop (Drone Lab Fig. 03)', notes: `Research doc: drone-lab-a.md, the Fig. 03 section. Real references: GEPRC CineLog35 V2, iFlight ProTek35. Cover:
- the ducts and their thrust effect, motors (1404/2004 class, KV), 3-inch props, 4S/6S
- DJI O3/O4 Air Unit mass and wiring (MSP DisplayPort OSD), naked GoPro mass
- the Betaflight CLI for the HD OSD (osd_displayport_device, the serial MSP flags), the RPM filter, cine-style rates
- typical AUW and flight times` },
  { id: 'longrange', kind: 'drone', title: '7-inch long-range quad with GPS Rescue (Drone Lab Fig. 04)', notes: `Research doc: drone-lab-a.md, the Fig. 04 section. Real references: iFlight Chimera7, a typical 7-inch DIY build. Cover:
- 6S Li-ion packs (P42A/P45B/P50B: capacity, mass, max current, discharge floor ~2.8-3.0 V/cell) vs LiPo, 2806.5/2807 motors (KV), 7-inch props, M10 GPS + compass
- the Betaflight GPS Rescue parameters in the current version (exact names, units, sanity checks, min sats), failsafe stage 2, the beeper
- real Li-ion behaviour vs the LiPo curve` },
  { id: 'racer', kind: 'drone', title: '5-inch racing quad (Drone Lab Fig. 05)', notes: `Research doc: drone-lab-b.md, the Fig. 05 racing quad section. Real references: a MultiGP-class stretched-X race frame. Cover:
- 4S/6S race packs, 2207 motors (KV), race props
- Betaflight vtxtable with Raceband (exact vtxtable CLI syntax), vtx_band/channel/power, LED_STRIP CLI (led and color commands) for race colours
- MultiGP gate dimensions and race formats, lap timing (transponders/RaceTracker/RotorHazard)
- typical race-tune settings` },
  { id: 'gpscam', kind: 'drone', title: 'GPS camera drone on ArduPilot (F450/X500 class, Drone Lab Fig. 06)', notes: `Research doc: drone-lab-b.md, the Fig. 06 section. Real references: Holybro X500 V2 + Pixhawk 6C, DJI-F450-class builds. ArduPilot Copter: the current stable version (verify). Give exact parameters for:
- FRAME_CLASS/TYPE, FLTMODEn, Loiter/AltHold/RTL/AUTO, RTL_ALT (units), WPNAV_SPEED (renamed?), the fence, battery failsafe (BATT_FS_LOW_ACT etc.), GPS1_TYPE naming
- a 2-axis gimbal (MNT1_* params)
- a 4-waypoint AUTO mission in QGC/MAVProxy format
- pre-arm checks
Correct every param error drone-lab-b.md lists.` },
  { id: 'delivery', kind: 'drone', title: 'Autonomous delivery quad (Pixhawk 6C + Pi 5 companion, Drone Lab Fig. 07)', notes: `Research doc: drone-lab-b.md, the Fig. 07 section. Cover:
- 690 mm folding frame, 15-inch props, 6S 10 Ah
- the companion computer link (MAVLink over serial, mavlink-router), the depth camera for avoidance (ArduPilot OA_TYPE, PRX/AVOID params), LTE telemetry
- a winch (WINCH_TYPE, MAV_CMD_DO_WINCH) or gripper (GRIP_*, SERVOn_FUNCTION 28)
- correct current MAVSDK-Python code (connect, arm, takeoff, mission upload, goto, actions)
- delivery mission phases and safety (geofence, RTL, battery reserve)
Fix the original's dead Loiter-to-RTL switch at the facts level (what real ArduPilot does).` },
  { id: 'agrihex', kind: 'drone', title: 'Agricultural spray hexacopter (Drone Lab Fig. 08)', notes: `Research doc: drone-lab-b.md, the Fig. 08 section. Real references: small 10 L class ag drones (e.g. EFT E410/E610, Hobbywing X8/X9 power systems). Cover:
- hexa X geometry (1.8 m), 30-inch props, 12S/14S packs (mass), a 10 L tank
- the ArduPilot sprayer (SPRAY_ENABLE, SPRAY_PUMP_RATE, SPRAY_PUMP_MIN, SPRAY_SPEED_MIN, SPRAY_SPINNER, SERVOn_FUNCTION 22/23) and how the pump rate scales with ground speed
- RTK (GPS1_TYPE, injection, moving-baseline yaw: correct GPS_TYPE 17/18 meanings), a radar rangefinder (the correct RNGFND1_TYPE for common radars) and surface tracking (SURFTRAK_MODE etc.; TERRAIN_FOLLOW is Plane-only)
- lawn-mower survey missions, real dose-per-area math, mission resume after refill (how ArduPilot does it)` },
  { id: 'wing', kind: 'drone', title: 'FPV flying wing on INAV (900 mm class, Drone Lab Fig. 09)', notes: `Research doc: drone-lab-b.md, the Fig. 09 section. Real references: ZOHD Dart, Sonicmodell AR Wing 900. INAV: the current stable version (verify). Cover:
- platform_type, the current mixer CLI (mmix/smix syntax in this version, mixer profiles), servo reversal
- nav_rth_altitude and nav_fw_loiter_radius (units), launch mode (nav_fw_launch_*), airspeed parameters
- flight modes (ANGLE, NAV LAUNCH, RTH, CRUISE), failsafe
- osd_stats_page and other params the original used (verify each)
- stall and cruise speeds for an 800-1000 g 900 mm wing, CG location for a swept wing, elevon throws
Correct the original's errors.` },
  { id: 'vtol', kind: 'drone', title: 'VTOL tiltrotor QuadPlane, tricopter layout (Drone Lab Fig. 10)', notes: `Research doc: drone-lab-b.md, the Fig. 10 section. ArduPilot Plane QuadPlane tiltrotor: the current stable version. Give exact parameters for:
- Q_ENABLE, Q_FRAME_CLASS (tri), Q_TILT_ENABLE, Q_TILT_TYPE, Q_TILT_MASK, Q_TILT_RATE_UP/DN, Q_TILT_MAX, SERVOn_FUNCTION for tilt servos and motors (41/75/76 etc., verify)
- Q_ASSIST_SPEED (renamed?), Q_RTL_MODE, QHOVER/QLOITER/QRTL, transition (Q_TRANSITION_MS)
- airspeed params (ARSPD_FBW_MIN renamed to AIRSPEED_MIN, TRIM_ARSPD_CM renamed to AIRSPEED_CRUISE in 4.5+; verify)
Real references: tilt-rotor tricopter VTOLs (e.g. Convergence-style, Heewing T1). Cover typical cruise current vs hover current, to settle the original's 1.2 A vs 5 A mismatch.` },
  { id: 'swarm', kind: 'drone', title: 'Bitcraze Crazyflie 2.1 / 2.1+ swarm (Drone Lab Fig. 11)', notes: `Research doc: drone-lab-b.md, the Fig. 11 section. Cover:
- 27 g, 92 mm diagonal, the PCB frame, STM32F405 + nRF51822, 7 x 16 mm coreless motors, 45 mm props, the 250 mAh 1S battery (mass)
- Flow deck v2, Lighthouse deck, Crazyradio 2.0
- the current cflib API (cflib.crtp.init_drivers, SyncCrazyflie, MotionCommander, HighLevelCommander, Swarm with factory and URIs, log configs), param names (stabilizer.controller values)
- correct swarm code (the original lacked import time and SLOTS)
- Flow deck height and texture limits` },
  { id: 'tricopter', kind: 'drone', title: 'Betaflight tricopter with tail servo yaw (Drone Lab Fig. 12)', notes: `Research doc: drone-lab-b.md, the Fig. 12 section. Cover:
- the Betaflight TRI mixer: current support status (verify that Betaflight still supports tricopters and servos in the current version; if not, name the firmware that does, e.g. INAV, and the right CLI)
- the servo CLI (servo/smix), tail servo travel and reversal, the yaw-through-thrust-vectoring physics, the tail motor's yaw coupling
- real tricopter builds (David Windestal's style): geometry and components` },
  { id: 'octo', kind: 'drone', title: 'Heavy-lift octocopter for cinema (Drone Lab Fig. 13)', notes: `Research doc: drone-lab-b.md, the Fig. 13 section. Real references: Freefly Alta X (quad, for comparison), DJI S1000 (octo), Tarot X8/T18. Cover:
- 1360 mm flat octo, 12S (two 6S 16 Ah packs: real mass), 28-30 inch props, motors
- ArduPilot FRAME_CLASS 3 octa (FRAME_TYPE), motor-out handling (what ArduCopter really does: thrust-loss detection, MOT_* params)
- retractable landing gear (LGR_* params and units; LGR_DEPLOY_ALT is in metres), SERVOn_FUNCTION 29
- 3-axis gimbals (MNT1_TYPE values), cinema camera payload masses
- prop-clash geometry check` },
]

const RESEARCH_SCHEMA = {
  type: 'object',
  properties: {
    sheet_path: { type: 'string' },
    sources: { type: 'integer' },
    key_facts: { type: 'array', items: { type: 'string' }, description: '10-20 most important facts, each with its value' },
    corrections_to_originals: { type: 'array', items: { type: 'string' } },
    uncertainties: { type: 'array', items: { type: 'string' } },
  },
  required: ['sheet_path', 'sources', 'key_facts', 'corrections_to_originals', 'uncertainties'],
}
const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    sheet_path: { type: 'string' },
    checked: { type: 'integer' },
    confirmed: { type: 'integer' },
    corrected: { type: 'integer' },
    unverified: { type: 'integer' },
    corrections: { type: 'array', items: { type: 'string' } },
  },
  required: ['sheet_path', 'checked', 'confirmed', 'corrected', 'unverified', 'corrections'],
}

const results = await pipeline(
  ITEMS,
  item => agent(`${CONTEXT}

${item.kind === 'drone' ? DRONE_FORMAT : BOARD_FORMAT}

${(args.resumed || []).includes(item.id) ? `CONTINUATION: an earlier run of this exact task was interrupted before it wrote the sheet (the machine was paused). Its downloads are in ${S}/facts-dl/${item.id}/ and the scripts it wrote are in ${S}/facts-tools/${item.id}/. Look at them first and reuse them (already-fetched design files, PDFs, extracted coordinates) instead of downloading again. Re-check anything that looks half-finished.

` : ''}YOUR TASK: write the verified fact sheet for: ${item.title}.
File: ${R}/docs/facts/${item.id}.md (create docs/facts if needed).
SPECIFICS:
${item.notes}

${NOTES}`, { label: `facts:${item.id}`, phase: 'Research', schema: RESEARCH_SCHEMA }),
  (res, item) => res && agent(`${CONTEXT}

YOUR TASK: you are the adversarial fact-checker for ${R}/docs/facts/${item.id}.md (${item.title}). It was written by a researcher; assume it contains mistakes.
1. Read the sheet fully.
2. Pick the 25 most consequential claims: those that would make a figure, lesson, simulation or firmware snippet wrong. Typical ones are board dimensions and part positions, the pinout mapping, LED and button pins and their active levels, voltages, current limits and regulator parts, chip names and markings, clock sources, and firmware syntax and parameter names and units.
3. Verify each claim against primary sources you open yourself (WebSearch/WebFetch via ToolSearch, official PDFs, design files, official docs or source code). Do not trust the sheet's citations: open them, and find an independent second source for anything surprising.
4. Edit the sheet in place: correct wrong values, mark values you cannot verify as "(unverified)", and remove claims that are false.
5. Append a "## Verification" section: a table of every checked claim with its status (confirmed / corrected / unverified), the source URL, and for corrections the old and new values.
Keep the original structure. Do not shorten the sheet except to remove false content.`, { label: `check:${item.id}`, phase: 'Check', schema: CHECK_SCHEMA }),
)

const done = results.filter(Boolean)
log(`Fact sheets checked: ${done.length}/${ITEMS.length}`)
return { checked: done, missing: ITEMS.filter((it, i) => !results[i]).map(it => it.id) }
