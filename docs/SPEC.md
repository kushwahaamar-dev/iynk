# SimLab: the brief

This file holds the user's brief exactly as it was given, then the user's own instruction that came with it, then the few interpretation notes every phase works from. Do not edit the brief section.

## The brief (verbatim)

You are building SimLab — a single, production-ready educational hardware simulator that is strictly better than the three original websites combined:

1. Learn Arduino → https://learn-arduino-red.vercel.app
2. Robotics Engineer → https://robotics-engineer.vercel.app
3. Drone Engineer → https://drone-engineer.vercel.app

Your job is to reverse-engineer every interaction, visual style, lesson structure, calculation, failure mode, and UI pattern from those three sites, then rebuild them into one unified platform that is more complete, more accurate, more interactive, and more educational.

PRIMARY VISUAL ENGINE
Use the Colorfigures skill for every board, component, schematic, wiring diagram, exploded view, and drone.
Install it first if needed:
mkdir -p ~/.claude/skills && curl -fsSL https://april-zhu.com/colorfigures/colorfigures.tar.gz | tar -xz -C ~/.claude/skills
Restart yourself after install.
Every figure must be:
- Hand-inked isometric with subtle wobble and paper texture
- Fully 3D rotatable (drag 360°)
- See-through mode with labeled, animated internal mechanisms that light up as they work
- Exploded view available
- Every pressable part actually functions
- Accurate real-world geometry and labeling
- Self-contained HTML/SVG/JS only
- Color palette: tomato, mustard, mint, cobalt, blush + technical monochrome

BASELINE FROM THE ORIGINAL THREE SITES (must be matched or exceeded)

Learn Arduino baseline:
- Header style: large title + tagline “Explore · Understand · Build”
- Focus on Arduino Uno (ATmega328P)
- Component-level lessons with progress tracking (original showed 0/16)
- Explicit parts: USB Port, Microcontroller, Digital Pins 0–13 (~PWM), Power Jack (7–12V recommended), Power Pins (5V, 3.3V, GND, VIN), Analog Pins A0–A5
- Live code panel with syntax highlighting and a “Try it yourself” Blink example:
  void setup() { pinMode(LED_BUILTIN, OUTPUT); }
  void loop() { digitalWrite(LED_BUILTIN, HIGH); delay(1000); }
- Serial monitor with status (Stopped / Running)
- Scheggled
- Clean, structured layout

Robotics Engineer baseline:
- Boards shown: Arduino Uno R3, ESP32-S3 DevKit, Raspberry Pi 5 (as ROS 2 brain)
- Motor drivers: TB6612FNG (recommended), L298N (with warnings), A4988 (microstepping), PCA9685 (16-channel I²C PWM)
- Sensors: MPU-6050 (IMU + filters + drift), HC-SR04 (time-of-flight), QTR-8RC (line sensor)
- Power: LM2596 buck converter
- Full build workflow: strip to bare PCB → pick & place SMD parts → place parts interactively → solder joints form → plug/unplug USB → upload sketch → exploded view
- Explicit rule: solder DIP socket before inserting ATmega328P (prevents overheating)
- Live status: RUNNING, Pin 13 LOW/HIGH, Powered: ON
- Serial monitor
- Practice task: reaction-timer game using interrupt, debouncing, and millis() instead of delay()
- Quiz questions (examples from original: why analogWrite on pin 13 fails, why solder DIP socket first, cause of reset when motor starts, which chip converts USB to serial)
- Lofi effects / ambient feedback

Drone Engineer baseline:
- At least one full 5-inch freestyle quad (Fig. 01 style)
- Part-by-part build sequence
- Flight controls and Betaflight configuration snippets
- Real-time calculations (weight, thrust, etc.)
- Interactive parts and wiring
- Ability to arm, fly, and test

TARGET: SINGULAR UNIFIED PLATFORM
One Next.js (App Router) app with three interconnected modules under one shared design system, progress tracking (localStorage), multi-language support, dark/light mode, and a home dashboard.

MODULE 1 — BOARD LAB (minimum 12 boards)
Each board is a full Colorfigures figure with the exact interaction style of the original Arduino lessons + robotics build flow.

Required boards:
1. Arduino Uno R3 (ATmega328P) — full original component lessons + build sequence
2. Arduino Uno R4 Minima / WiFi
3. Arduino Nano
4. ESP32 DevKit (dual-core, Wi-Fi + BLE)
5. ESP32-S3 DevKit
6. NodeMCU (ESP8266)
7. Raspberry Pi Pico / Pico 2 / Pico W
8. STM32 Nucleo or Discovery
9. BBC micro:bit
10. Raspberry Pi 4 / 5
11. Digilent Basys 3 (Xilinx Artix-7 FPGA) — switches, LEDs, buttons, 7-segment
12. Terasic DE10-Lite or DE10-Nano

For every board:
- Accurate pinout and labeled parts (Colorfigures see-through + exploded)
- Step-by-step assembly / power-up sequence matching the original robotics style
- Live code editor (syntax highlighted, editable, “Run” updates the 3D simulation)
- Schematic + breadboard view
- Serial monitor
- Common sensors/actuators that can be wired in
- Deliberate failure modes that actually trigger (reverse polarity, brown-out, wrong voltage, cold solder, etc.)
- At least 4 progressive lessons per board (Blink/I/O, button+sensor, PWM/analog, one protocol or Wi-Fi example)
- Progress tracking identical in spirit to the original “0/16”

FPGA-specific: simple Verilog-style LED chaser or switch-to-LED mapping that visually updates; note that full synthesis is not required.

MODULE 2 — ROBOTICS LAB
Combine and expand the original robotics site.
- Reuse the same board figures
- Motor drivers, sensors, and power stages listed above
- Full interactive build + deliberate break workflows
- Practice tasks (reaction timer, line follower, simple arm, etc.)
- Live status panels, serial output, current draw
- Quizzes that appear after each major step

MODULE 3 — DRONE LAB
Expand the original drone site to at least 8–10 drones:
- 5" freestyle (Betaflight) — must match or exceed the original Fig. 01 depth
- Tiny Whoop, 3" cinewhoop, 7" long-range, racing, GPS/camera (ArduPilot style), delivery, agricultural, flying wing/VTOL, nano/Crazyflie style

For every drone:
- Full part-by-part build (frame → motors → ESC → wiring → FC → VTX → camera → receiver → battery → props)
- Live calculations that update: AUW, thrust:weight, hover throttle %, max current, flight time (hover + aggressive)
- Clickable wiring diagram (Colorfigures)
- Safety tests: smoke stopper, motor direction (props off), accelerometer calibration
- Flight simulator: keyboard (WASD + arrows) or on-screen sticks, Space to arm/disarm, V for FPV, angle vs acro mode, simple gate course
- Accurate Betaflight / ArduPilot CLI snippets

GLOBAL REQUIREMENTS (non-negotiable)
- Single Next.js app, one-click Vercel deploy
- All visuals generated via Colorfigures skill — no hand-drawn SVGs unless the skill fails
- Zero placeholder text, zero broken interactions, zero missing features from the original three sites
- Accurate electronics (5V vs 3.3V logic levels, current limits, pinouts, protocols)
- Shared component library so the same Arduino / ESP32 / Pico figure is reused everywhere
- Progress saved in localStorage
- Multi-language (English + Spanish, French, German, Chinese, Hindi minimum)
- Mobile-friendly (touch rotate, simplified controls)
- Accessibility (keyboard navigation + ARIA)
- README listing every Colorfigures prompt used and exact deploy steps

EXECUTION ORDER
1. Install and verify Colorfigures skill with a test figure.
2. Build shared design system, navigation, and home dashboard.
3. Build Board Lab completely (all 12+ boards + every lesson and failure mode).
4. Build Robotics Lab completely.
5. Build Drone Lab completely.
6. Unify everything, add multi-language, final polish.
7. Deploy to Vercel and return the live URL + full source.

Do not stop. Do not skip any feature present in the original three sites. Do not use placeholders. Iterate on every Colorfigures figure until the see-through internals, labels, animations, and interactions are correct. The final result must be visibly and functionally better than all three original websites combined.

Go.

## The user's own instruction (verbatim)

> A lot of things are wrong here. See everything, cross-reference, cross-check everything, go on a long run. Make sure it is what I want.

## Interpretation notes

- "Scheggled" in the Learn Arduino baseline is read as the schematic toggle: Learn Arduino has a live, auto-generated schematic panel opened with the C key (see `docs/research/learn-arduino.md`). SimLab must have it, and better.
- "Go on a long run" means: work through every phase without stopping for approval between phases, with a verification gate at the end of each phase.
- "Strictly better than the three originals combined" and "zero missing features" mean that every feature in the research docs under `docs/research/` is matched or exceeded, unless `docs/DECISIONS.md` records a deliberate, justified exception. Bugs in the originals are fixed, not copied.
- "All visuals via Colorfigures" includes the schematic, breadboard and wiring views: they use the same hand-inked look (ink filter, wobble, paper grain, the five palettes) and are generated from the same data as the 3D figures.
- The originals are someone else's work. Rebuild them: reuse facts, formulas, constants, timings and teaching messages, but write SimLab's own code. Do not copy their source files, their author watermarks or their credits. The Colorfigures skill is MIT licensed; keep its licence and credit.
