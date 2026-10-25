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
