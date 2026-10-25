# Fig. 13 — Raspberry Pi 5: the ROS 2 brain (Colorfigures prompt)

A Robotics Bench figure on top of Fig. 10's Raspberry Pi 5 (`figures/boards/pi4-pi5.js`, variant pi5): the same
board, part ids and power tree, built up from the bare PCB and run as a robot's ROS 2 computer. Facts and sources:
`docs/facts/pi4-pi5.md` (power, throttling, the fan curve, get_throttled bits).

Add to the board:

- The **Active Cooler**, the last part on after the microSD card: an aluminium base plate on four push pins over the
  SoC, a row of tall fins, a black blower shroud with a round intake and an impeller that turns at the fan's duty, and
  a cable over to the 4-pin FAN connector. Its size and height are estimated from product photos (Raspberry Pi
  publishes no drawing); see-through shows the thermal pad on the SoC.
- **Supplies**: the 27 W USB-C PD supply, a 5 V 2 A phone charger that sags to 4.6 V under load, and the robot's 5 V
  buck converter on GPIO pins 2 and 4.
- **A heat model**: the SoC temperature rises with the program's power and falls through the cooler (about 15 K/W
  bare, 8 K/W with the fan still, 3 K/W flat out). The firmware's fan curve: off below 50 °C, then 30 / 50 / 70 / 100 %
  at 50 / 60 / 67.5 / 75 °C with 5 °C hysteresis. From 80 °C the Arm clock steps down from 2.4 GHz toward 1.5 GHz,
  and from 85 °C the GPU throttles too. Time runs about ten times faster than on a real board so it shows in seconds.
- **get_throttled** as the firmware keeps it: bit 0 under-voltage now (5 V below 4.63 V), bit 2 throttled now,
  bits 16 and 18 since boot; a new boot clears them. The model reports `meas.U1.c`, `meas.U1.ghz`,
  `meas.U4.throttled`, `meas.U4.v` and `meas.COOLER.duty`, and lights the 5 V / CORE / 3V3 paths in see-through.
- **Run a program ▾**: "Boot and check" (the kernel log, then boot_check.py printing live `throttled=`, `temp=` and
  `frequency(0)=` lines), "ROS 2 drive node" (ros2 run, ros2 topic hz /cmd_vel at 10 Hz, ros2 topic echo, and the
  node's own warning every 5 s from 80 °C) and "Supply and heat check" (health.py decoding every set bit). While the
  supply is low the kernel's "Undervoltage detected!" line interleaves.
- **Break it ▾** adds the sagging charger, no cooler and a cold joint on the fan connector (the fan stutters and the
  SoC runs hotter) to the board's own list.

The steps in `src/content/robotics/pi5-ros2.ts` drive it: strip, pick & place, low (micro-HDMI), tall (header, PoE+,
Ethernet, USB), solder, card, cooler, plug in, the drive node, the health check, then the charger, no cooler, the cold
fan joint, motors on the 5 V pins, a reversed and a 12 V supply on those pins, and the exploded view.

Look: Colorfigures palette (mint accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble,
paper grain. Works on a phone and inside the iynk host (embedded, bare).
