# P2-pi: what is still short of perfect

The Raspberry Pi 4/5 board meets the §4 board bar: the figure has board, breadboard, schematic and power views; the
English prose is complete; five gpiozero/rclpy lessons pass the app check path on both boards and at every chip
value; ten failures change the figure; the assembly runs from bare PCB to card on both variants; each lesson has a
three-question quiz; `bom.ts` lists the parts; `figures/prompts/pi4-pi5.md` is the prompt record. The pi5-ros2 bench
passes `probe.mjs` (17/17 steps) and its three tasks pass in the lesson table. These are the gaps left.

1. **Onboard world inputs reach no program.** A `{ kind: 'onboard' }` input (the Pico's chip temperature,
   P2-microbit's `temperature()`) is dropped by `WorldBinding.apply`, outside `python/**`.
   → `P2-pi-to-driver-onboard-inputs.md`.
2. **micro:bit D70 does not light yet.** The runtime drives RUN_MIC (pin 202) while the microphone is in use, but the
   pin reaches the figure as `P202`, not `RUN_MIC`. P2-microbit picks the fix (the answer in
   `P2-microbit-to-P2-pi-microbit-runtime.md` gives both shapes).
3. **micro:bit radio has no peer.** `radio` checks its settings and on/off state, but no world device sends or hears
   messages, so a radio lesson cannot pass checks. It needs a schema device for radio messages (P2-drones-vtol owns
   the schema in wave B) and a binding; nobody owns that in wave B.
4. **Nine micro:bit built-in tunes are missing** (PRELUDE, NYAN, RINGTONE, FUNK, BLUES, WEDDING, FUNERAL, PYTHON,
   CHASE): I could not write their notes with confidence. Using one is an AttributeError.
5. **Unverified numbers in the Pi model**, each a modelling choice the fact sheet does not give:
   - the under-voltage Arm clock (1.5 GHz Pi 5, 600 MHz Pi 4: the firmware's `arm_freq_min`);
   - `brownoutVolts: 3.4`, the 5 V level at which the model resets the board (Raspberry Pi publishes no figure);
   - `ramBytes` shows the 4 GB models of both boards;
   - the micro:bit's I2C error number for a missing address (`EIO`, as on the Pico).
6. **Estimated geometry.** Pi 5 silkscreen positions come from a product photo; the Active Cooler's size and height
   from product photos (no drawing is published); the decoupling capacitors' positions are illustrative on both
   boards (no published file lists them); Pi 4 part heights follow the matching Pi 5 parts (the DXF has none).
7. **Pi 5 Wi-Fi module named generically.** The figure and prose call U5 a Wi-Fi and Bluetooth module; the fact sheet
   gives the Pi 5's chip only as "CYW43455 class, unverified".
