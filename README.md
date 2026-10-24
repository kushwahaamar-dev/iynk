# SimLab

One Next.js app for three benches: boards, robots, and drones. The figures are Colorfigures pages. Lessons, quizzes, and the flight sim sit around them. Progress is stored in `localStorage` under `simlab.v1`.

## Run

```bash
cd simlab
npm install
npm run dev
```

Open http://localhost:3000.

The same build, already compiled, is `npm run build` and then `npm start`. No environment variables are required.

## Rebuild a figure

Colorfigures lives in `~/.claude/skills/colorfigures`. The sources are `figures/src/board.html` and `figures/src/drone.html`. The pages in `public/figures/` are the built, self-contained files.

```bash
python3 ~/.claude/skills/colorfigures/scripts/build.py figures/src/board.html public/figures/board.html
python3 ~/.claude/skills/colorfigures/scripts/build.py figures/src/drone.html public/figures/drone.html
```

Board id, module, and variant are query parameters: `/figures/board.html?id=uno-r3&module=tb6612`. Drone id: `/figures/drone.html?id=freestyle-5`.

The parent lab talks to a figure with `postMessage`. The page sends `{ source: "simlab", patch }`. The figure answers `{ source: "simlab-figure", ... }`.

## Colorfigures briefs

These are the briefs the figures were built from.

### Boards — `figures/src/board.html`

A dev board on a desk, mint solder mask, turned all the way around.

- USB 5 V, or 7–12 V on the barrel, through the polyfuse and the regulator, then the crystal releases reset.
- See-through shows the die, bond wires, crystal can, USB-serial bridge, and polyfuse.
- Plug USB, reset, blink the L LED, explode the parts, and switch among the board, a schematic, and a breadboard.
- Failures the lab can drive: reversed barrel, brown-out, a cold joint on the LED pin.
- Boards in the same file: Uno R3, Uno R4 WiFi and Minima, Nano, ESP32 DevKit, ESP32-S3, NodeMCU, Pico / Pico W / Pico 2, Nucleo-F401RE, micro:bit, Pi 5 and Pi 4, Basys 3, DE10-Lite.
- Beside the Uno, the robotics modules: TB6612FNG, L298N, A4988, PCA9685, MPU-6050, HC-SR04, QTR-8RC, LM2596.

### Drones — `figures/src/drone.html`

A quad on a bench. Arms, four motors, props that spin when armed, a stack, XT60 and capacitor, camera, VTX antenna, receiver, battery.

- Build flags show or hide each part. Exploded view lifts the stack.
- See-through shows the gyro and the MCU on the flight controller.
- A wiring sheet is the power, signal, and video path as labeled blocks.
- Shapes: 5-inch freestyle, tiny whoop, 3-inch cinewhoop, 7-inch long range, racer, GPS camera quad, delivery box, spray tank, flying wing, nano quad.

## What the labs do

- Board lab: sixteen Uno lessons, four or more on every other board, a sketch runner (`setup` / `loop`, `delay`, `millis`, serial, `analogWrite`, interrupts), serial monitor, schematic and breadboard views, and failure buttons that change the figure.
- FPGA boards step a small Verilog pattern onto the switches, LEDs, and digits. They do not synthesize a bitstream.
- Robotics: socket-before-chip build, the driver and sensor pages, a reaction timer, a line follower, a two-joint arm.
- Drones: part order, live weight and thrust math, smoke-stopper and motor-direction checks, accelerometer calibration, Betaflight or ArduPilot snippets, and a keyboard flight sim (WASD, arrows, Space, V, Q, R) with on-screen sticks.

Languages: English, Spanish, French, German, Chinese, Hindi. The sketch source stays C or Verilog.
