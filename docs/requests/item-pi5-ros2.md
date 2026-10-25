# Requests from item:pi5-ros2 (Robotics Bench Fig. 13, Raspberry Pi 5 with ROS 2)

## For engine:bench (figures/engine/bench.js)

1. **Bench readings in `state` and in the stats.** Accept an optional `readings(st, o)` function on a board, module or
   bench def. The engine calls it after `outputs()` and puts the returned small object (discrete values only: rounded
   numbers, strings, booleans) into the `state` report as `readings`, and accepts an optional `stats(st, o)` that returns
   extra `{label, value, small}` entries appended to the stats while the board runs. Why: the Pi 5 bench shows the CPU
   temperature, the clock (2.4 / 1.5 GHz), the supply volts and the `get_throttled` flags, and the Robotics Lab status
   panel reads them by `StatusField.key` (`readings.cpuC`, `readings.clockGHz`, `readings.supplyV`,
   `readings.throttled`). Other benches need the same (HC-SR04 distance, LM2596 output volts, MPU-6050 angles).
2. **A per-frame hook.** Call an optional `tick(st, dt)` on the def every frame while powered (before `outputs()`), so a
   bench can integrate a model that must survive mode switches (the Pi 5 CPU temperature: the original reset it on every
   mode switch, research §10 #3, checklist RBB-247). Until it exists, pi5-ros2.js integrates inside `out()`.
3. **Variants keep their functions.** `start()` applies `def.variants[vk].patch()` to a JSON clone, which drops every
   function (`modes[*].out`, `serial`, `kind` draw hooks). A bench whose board has variants (pi5-ros2 on `pi4-pi5`) then
   loses its modes. Please clone with functions kept (or apply the patch to the board before `benchToBoard`). Until then
   pi5-ros2.js resolves the Pi 5 variant itself and sets `variants: null` on the bench def.

## For item:pi4-pi5 (figures/boards/pi4-pi5.js)

4. The bench builds on your Pi 5 variant. Please keep these stable (or tell me in this file if they differ): the
   variant key `pi5`; part ids for the USB-C power jack, the PMIC, the BCM2712, the LPDDR4X, the RP1, the bi-colour
   power/status LED, the fan header, the GPIO header J8, the Ethernet jack and the USB 3 stack; the LED nets your Pi 5
   LEDs light from (the bench's modes drive them: power red, status green, Ethernet link and activity). I add the
   Active Cooler (`FAN`, group `last`) and the 27 W / phone-charger supplies on the bench side.

## For interpreters (src/lib/interp, Python on target `linux`)

5. The practice tasks run rclpy nodes headless. The reference solutions use only this subset:
   - `import rclpy`, `from rclpy.node import Node`, `from rclpy.executors import SingleThreadedExecutor`,
     `from geometry_msgs.msg import Twist`, `from std_msgs.msg import Float32`.
   - `rclpy.init()`, `rclpy.spin(node)`, `rclpy.try_shutdown()`; `SingleThreadedExecutor()` with `add_node(node)` and
     `spin()`; `node.destroy_node()`.
   - `Node.__init__(name)` via `super().__init__('drive')`; `create_publisher(T, topic, depth)`,
     `create_subscription(T, topic, callback, depth)`, `create_timer(period_s, callback)`,
     `declare_parameter(name, default)`, `get_parameter(name).value`, `get_logger().info(text)` / `.warn(text)`.
   - Messages: `Twist()` with `linear.x/y/z` and `angular.x/y/z` (floats, default 0.0); `Float32()` with `data`.
   - Delivery: `publisher.publish(msg)` hands a copy to every subscription on that topic (leading `/` ignored, so
     `cmd_vel` and `/cmd_vel` are one topic), callbacks run in the executor at the same virtual time, in creation
     order. Timers fire at `k * period` after `spin()` starts, on the virtual clock.
   - Logger lines go to the serial monitor (and `RunTrace.serial`) as `[INFO] [<node name>]: <text>` (`[WARN]` for
     `.warn`), without the timestamp field, like the ROS 2 tutorials print them.
   - f-strings with `:.2f`, `round()`, `abs()`, `min()`, `max()`, `sum()`, `len()`, lists with `append`/`pop(0)`, and
     classes with `__init__` and methods.
   The test file `src/content/robotics/pi5-ros2.test.ts` runs every reference solution through
   `runHeadless({ language: 'python', source, target: 'linux', world, runMs })` and `evaluateChecks` from
   `src/lib/interp/index.ts` (the seam in docs/requests/ui-robotics.md) and skips while that module is missing.

## Answer from P2-engine (2026-10-24 ~22:05 CDT), engine items (all done in `a45ec96`, extended in `4b4a878`)

1. **Done as one hook.** A bench (or board) def's `model(st, dt)` returns `{ readings, status, stats, meas, report,
   flow, accent }` every frame after the outputs: `readings` go out as `state.readings` (numbers rounded), `stats`
   (`[[label, value]]`) are appended to the stats while powered, `status` is `state.benchStatus` (FIGURES-BENCH §11).
   So the Pi 5 bench returns `readings: { cpuC, clockGHz, supplyV, throttled }` from `model`.
2. **Done.** `model(st, dt)` is that per-frame hook (`dt` on the virtual clock); keep the CPU temperature in `st`
   (for example `st.cpu`), it survives mode switches.
3. **Done.** Variants are applied to the board before the bench merges with it, and the clone keeps functions
   (`copyDef`), so `variants: null` on the bench def can go.
