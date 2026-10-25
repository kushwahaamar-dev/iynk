# Fig. 11 — Crazyflie swarm drone (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of **one drone of a Crazyflie 2.1+ swarm** (crazyflie-firmware 2026.08,
flown from Python with cflib 0.1.34) standing on its four motor mounts on a pale green cutting mat, with a flat blue
cast shadow. The board is the frame: an X-shaped black PCB 92 mm motor to opposite motor (motors at ±32.5 mm, 46 mm
from the centre), x forward. Draw every part where the real drone has it:

- Four **7 x 16 mm coreless motors**: silver cans standing in mint plastic mounts (a foot on the mat, a tube round the
  can, a clip over the arm tip) that are the legs too. A black line on each can top turns while a test spins it.
- The **board**: the black X-shaped PCB with a rounded centre, the antenna bump at the front, the STM32F405 (labelled
  F405), the nRF51822, the IMU, a micro-USB socket and the white battery socket at the back, a power button, two rows
  of ten gold header holes, and four LEDs near the motors: red/green at M1 and M4 (front), blue at M2 and M3 (back).
  Powered, they blink the way the firmware's LED codes say (LED1 slowly until the sensors are calibrated, then twice a
  second; LED4 flickering green with radio traffic).
- The **motor plugs**: a red and a black lead along the top of each arm into a cream PicoBlade socket near the middle.
- Two **long pin strips**: black spacers on the board with ten gold pins each, 19 mm up and 4 mm down.
- The **Flow deck v2** under the board on the pins' bottom ends, its flow camera and range sensor facing the floor.
- A **1S LiPo** on a foam pad between the header rows (250 mAh grey, 350 mAh blue, 450 mAh yellow, sized from the
  calculator), its short red and black lead into the battery socket when plugged.
- The **Lighthouse deck** on the long pins over the battery: 39 x 27 mm, four infrared receivers at the corners, the
  FPGA in the middle and the ID chip at the front, LIGHTHOUSE printed on it (spelt backwards when it is turned round).
- The **Crazyradio 2.0** on the mat beside the drone: a mint USB dongle with its USB plug and cable to the edge of the
  mat, a gold RP-SMA socket and a black duck antenna, or the antenna lying beside it when it was left off.
- **Two-blade props**: 45 mm (stock on the 2.1) or 47-17 (stock on the 2.1+): CCW on M1 and M3, CW on M2 and M4, the
  motors numbered clockwise from the front right as the firmware does.

What it does:

- **Add next part ▾** fits the parts in build order: motors, board, motor plugs, long pins, Flow deck, battery,
  Lighthouse deck, Crazyradio, props. Polarity choices: the Lighthouse deck the right way round or turned round
  (`deck-reversed`), the Crazyradio's antenna screwed on or left off (`radio-no-antenna`), props matched or swapped.
  **Remove**, **Build it for me**, **Take it apart**, **Exploded view** and **Plug / unplug battery** work as on every
  craft. There is no smoke stopper button: a Crazyflie is factory-built and its cell has its own protection board. The
  engine's messages are reworded for a brushed nano drone (a motor that spins the wrong way has its leads crimped the
  wrong way round: each socket's polarity sets the spin).
- The engine's **Check motor direction** (props off, the motor plugs and the board fitted) and **Calibrate sensors**.
- **Crazyradio link** (board and Crazyradio fitted, powered), 2 s: connects to radio://0/80/2M/E7E7E7E701 at 100 %
  link quality, or 23 % with the antenna left off (a failed run).
- **Decks + positioning** (linked, both decks, calibrated), 4 s: the deck parameters read 1 and the Kalman filter
  settles; with the Lighthouse deck turned round, missing, or no Flow deck, it says which deck reads 0.
- **Link-loss (props off)** (linked, motors and plugs fitted, props off), 2.6 s: the motors spin, level and hold after
  0.5 s and stop at 2 s, the way the supervisor's setpoint watchdog does.
- **Light-show LEDs** (linked), 3 s: the board's LEDs go green, red, then blue, as `led.bitmask` 138, 148 and 129 set
  them.
- A check stays passed until a part it ran on is taken off, re-seated or turned round. The SimLab host loads the
  figure with `?fresh=1`, so every check starts unrun there.
- **Wiring sheet**: battery → board (power), board → motor plugs → motors (MOSFET PWM, brushed, two wires each),
  Lighthouse deck → board (UART + I²C), Flow deck → board (SPI + I²C), Crazyradio → board (2.4 GHz, channel 80).
- **Options** from the calculator: battery 1S 250, 350 or 450 mAh; motors 7x16 14000 KV, 7x16 15500 KV or 8x20
  12500 KV (taller cans); props 45 mm or 47-17.
- **See-through** fades the deck and the battery and labels the coreless motors (no ESC), the STM32F405 (estimator and
  control), the nRF51822 (radio and power), the BMI088, the MOSFET PWM at 328 kHz, the Flow deck looking down, the
  Lighthouse receivers and the Crazyradio's nRF52840.

Look: Colorfigures palette, mint by default (the 'pal' pieces follow the swatch the viewer picks), warm paper, heavy
ink silhouette, finer inner lines. It works on a phone (numbered badges and a label list) and inside the SimLab host.
