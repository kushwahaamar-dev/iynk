# P2-pi → driver: onboard sensor inputs reach no program

Owner: none in wave B (`src/lib/interp/lesson-world.ts` and `src/lib/interp/world.ts`; P2-pi owns only
`src/lib/interp/python/**`).

**What.** A world input with `device: { kind: 'onboard', sensor: ... }` (schema: `accelerometer`, `compass`,
`temperature`, `light`, `microphone`, `touch`) has `pins: []`, so `WorldBinding.apply` falls to `drivesFor`, which
returns nothing. The value never reaches the run. Today that drops the Pico's `chip` temperature input (lesson
`button`, part U1): the slider moves and `ADC(4)` still reads 24 °C. P2-microbit wants the same for
`microbit.temperature()`.

**Shape.**

```ts
// world.ts, class World
/** Values of the board's own sensors set by world inputs ({ kind: 'onboard' }), by sensor name. */
readonly onboard = new Map<string, number>();

// lesson-world.ts, WorldBinding.apply
case 'onboard':
  this.run.world.onboard.set(d.sensor, value);
  this.run.world.touch();
  return;
```

Then P2-pi (or whoever holds `python/**`) reads `w.onboard.get('temperature') ?? 24` in `microbit.temperature()`
and in the Pico's `ADC(4).read_u16()` (0.706 V at 27 °C, -1.721 mV/°C), and the compass heading and microphone level
the same way. A test: a Pico run with `{ id: 'chip', device: { kind: 'onboard', sensor: 'temperature' }, default: 40 }`
reads `27 - (ADC(4).read_u16() * 3.3 / 65535 - 0.706) / 0.001721` within 1 °C of 40.

## Answer

2026-10-25 00:29 CDT, P2-req-interp (wave B tail), commit `3f92443`. Done, in the shape above.

- `World.onboard` (`src/lib/interp/world.ts`): a `Map` keyed by the schema's onboard sensor names. Units: temperature
  in °C, compass heading in degrees, microphone and light level 0-255 (the units the micro:bit's own API reports),
  touch 1 = touched.
- `WorldBinding.apply` (`lesson-world.ts`) sets it and touches the world, so the live Board Lab run, the headless
  check run and the Robotics task runner all get it. `Run` carries the values over a reset, brown-out recovery or
  deep-sleep wake (`run.ts`, `boot`), like the pin inputs it already replays.
- Readers, each keeping its old default when nothing sets the sensor:
  - Pico `ADC(4)`: `read_u16()` and `read_uv()` from 0.706 V at 27 °C, -1.721 mV/°C (default 24 °C). `read_u16()`
    now scales 12 to 16 bits as MicroPython does (`raw << 4 | raw >> 8`), the same as the other ADC pins.
  - micro:bit: `temperature()` (whole °C, default 24), `compass.heading()` (wraps to 0-359, default 0),
    `microphone.sound_level()` (clamped 0-255, default 0), `display.read_light_level()` (0-255; falls back to the
    old pin-200 voltage), `pin_logo.is_touched()` (an onboard touch input wins over the P201 button path).
  - ESP32 `temperatureRead()` (default 41.5 °C).
- Not done: the micro:bit's `LOUD`/`QUIET` sound events still never fire (their default thresholds aren't in our
  fact sheet, so I didn't invent them). An onboard `accelerometer` input is still unread: the micro:bit's
  accelerometer is the I²C device at 0x19, which an `mpu6050` input with address `0x19` moves (the tilt lesson
  does that).
- Test: `src/lib/interp/lesson-world.test.ts`. A Pico run with `chip` at 40 °C reads 40 ±0.5 °C from
  `27 - (ADC(4).read_u16() * 3.3 / 65535 - 0.706) / 0.001721`, follows the input when the script moves it and reads
  24 °C with no input. The micro:bit readers and the ESP32 reader (across a deep sleep) are tested too.
