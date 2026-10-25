# P2-rob-sensors to driver: record the PCA9685's channels in the headless trace

Written 2026-10-25 by P2-rob-sensors. `src/lib/interp/**` outside `python/` and `verilog/` has no wave-B owner, so
this goes to the driver (or whoever owns the interpreter core next).

**What.** `runHeadless` records the board's own pins and Serial. The PCA9685 device the interpreter already models
(`devices.ts`, `Pca9685`; the snapshot carries `pwmDrivers`) never reaches the trace, so a check cannot ask "is
channel 0 sending 1500 µs at 50 Hz?". Shape that would fit the existing checks with no new check kind:

- record each driver channel as a pseudo-pin `PCA<addr>.<ch>` (e.g. `PCA40.0`) in `trace.pins`, with events
  `{ t, v, mode }` written when the sketch changes it: `mode: 'servo'` and `v` = degrees when the frequency is 40-60 Hz
  and the on-time is 0.5-2.5 ms (degrees from the microseconds with the `servoDegrees` mapping `checks.ts` and `headless.ts` already use, 544 µs = 0°, 2400 µs = 180°), else `mode: 'pwm'`
  and `v` = duty (0-1); asleep (MODE1 SLEEP set, the power-up state) or all-off reads `mode: 'out'`, `v: 0`;
- `pinEvents(trace, 'PCA40.0', ctx)` then works unchanged for `servo`, `pwm` and `pin-level` checks.

**Why.** The pca9685 bench's two tasks (`ticks`: microseconds to ticks and `setPWMFreq(50)`; `knob`: a pot steering
the base servo) can only check what the sketch prints (`serial`) and what it contains (`code`). With the channels in
the trace they would check the pulses themselves, e.g. `{ kind: 'servo', pin: 'PCA40.0', deg: [85, 95], atMs: 1200 }`,
and a sketch that prints the right numbers but forgets `setPWMFreq(50)` would fail as it should.

**After it lands** I would add servo checks to `src/content/robotics/pca9685.ts` (both tasks) and a test that the
starter still fails.
