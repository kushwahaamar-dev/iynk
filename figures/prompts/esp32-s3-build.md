# Fig. 04 — Build an ESP32-S3-DevKitC-1 (Robotics Bench, Colorfigures prompt)

Make a colourful, hand-inked isometric bench figure of an **Espressif ESP32-S3-DevKitC-1 v1.1** being built from the
bare PCB and brought up, standing on its two header rows on a pale green cutting mat with a 10 mm grid, with a flat
blue cast shadow (`figures/robotics/esp32-s3-build.js`). The board is the Board Lab's DevKitC-1
(`figures/boards/esp32-s3-devkitc-1.js`, Fig. 05): 25.40 x 62.74 mm, near black solder mask, every part where
Espressif's PADS design file puts it: the ESP32-S3-WROOM-1-N8R8 module, the CP2102N bridge, the SGM2212 regulator,
the UART and USB micro-USB ports with a dark cable in the UART port, the SK68XXMINI-HS RGB LED on GPIO38, the red
power LED, the BOOT and RESET buttons, and two 22-pin headers underneath. There is no breadboard: the bench builds the
board itself and opens on the board view.

What it does:

- **Strip to bare PCB, Pick & place SMD, Place a part ▾, Solder joints, Remove a part ▾**: the factory order with its
  refusals. "Unplug the power first: never work on a live board" stops any of it on a live board. Pick and place
  drops all 42 SMD parts, the module, chips, LEDs, buttons, ports, diodes and passives, and reflows them ("Reflow
  done: every SMD joint is soldered"); then **All low parts** fits the two 22-pin headers and the iron solders them.
  "SMD parts first" and "Nothing to solder yet: place a part first" stop anything out of order; the power LED and the
  two Schottkys can go in backwards.
- **Power ▾**: USB in the UART port (the bench's supply), USB in the USB port, the 5V pin or the 3V3 pin, through the
  board's real power tree (a Schottky from each port onto 5 V, the SGM2212, R24 on to the module). Power-up says what
  came on: "3.3 V is up: the red power LED lights and Blink RGB starts".
- **Upload sketch ▾**: the bench's four programs, which match the lesson's sketches line for line. Uploads go over the
  UART port with esptool and take 4 s (Wi-Fi: 7 s), the RGB LED dark meanwhile; each program starts with the ROM
  banner "ESP-ROM:esp32s3-20210327" on the monitor.
  - **Blink RGB**: the RGB LED red at 64 of 255 for 500 ms, off for 500 ms, "blink #0", "blink #1" … once a second.
  - **RGB colour wheel**: round the six-sector wheel once every 4 s, "hue 0 deg", "hue 90 deg", "hue 180 deg", "hue
    270 deg".
  - **Wi-Fi web server**: blue blinking while it joins bench-lab ("Connecting to bench-lab..."), joined at 1.5 s
    ("WiFi connected, IP 192.168.4.42"), then "GET / -> page sent"; from 6 s a phone on the network alternates /on
    and /off every 3 s, and the RGB LED is green while it is on ("GET /on -> LED on", "GET /off -> LED off").
  - **Deep sleep**: awake 1 s in dim blue, "boot #1, sleeping 10 s", 10 s dark, then the ROM banner and "boot #2,
    sleeping 10 s": an 11 s cycle.
- **Press BOOT** and **Press RESET**: with BOOT still down when RESET lets go, every program sits dark in ROM download
  mode ("rst:0x1 (POWERON),boot:0x0 (DOWNLOAD(USB/UART0))", "waiting for download"); RESET on its own brings the
  program back.
- **Break it ▾**: the board's list, which holds the lesson's six faults: R17 left out (the sketch runs, the RGB LED
  stays dark), a cold joint on the UART port (power drops out in bursts and both LEDs blink off with it), reverse
  polarity on the 5V pin (the regulator burns), 5 V on the 3V3 pin (the module is damaged), a motor on the 5 V pin
  (3.3 V sags to 1.4 V in bursts: brown-out) and GPIO0 held low at reset (download mode, the RGB LED dark); then the
  board's other supply, part and cold-joint faults.
- **View ▾**: the board, the schematic and power-tree sheets, the exploded view. **See-through** shows the dies with
  bond wires and the copper paths with moving dots, as on the board page.

State the host reads: `build`, `power`, `status` (`uploading` during an upload), `mode`, `boot`, `exploded`,
`leds.D5`, `leds.D6`, `rails.5V`, `rails.3V3` and the bench's flags `tasks.awake`, `tasks.joining`, `tasks.wifi`,
`tasks.asleep`, which also drive the host's current model. The lesson (17 steps, 6 faults, 4 tasks, 6 quizzes) is
`src/content/robotics/esp32-s3-build.ts`; the facts are `docs/facts/esp32-s3-devkitc-1.md`.

Look: Colorfigures palette (blush accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble,
paper grain. Works on a phone and inside the iynk host (embedded, bare). Upload byte counts are illustrative.
