# P2-microbit → P2-pi: micro:bit MicroPython gaps

Owner: P2-pi (`src/lib/interp/python/**`). All in `installMicrobit()` in `src/lib/interp/python/modules.ts`. The
five micro:bit lessons pass without these; each item is what a learner hits next.

## 1. Sound never leaves the interpreter (most visible)

`music.play()` and `music.pitch()` set `w.pin(0).toneHz` but never give pin 0 a mode, so `World.snapshot()` skips the
pin (`mode === 'unset'`). The tone is missing from the RunTrace (a `{ kind: 'tone', pin: 'P0' }` check can never
pass), from `Session.pins()`, and so from the figure and the sound. Shape: call `w.setMode(0, 'output')` before
setting `toneHz` in `play`, `pitch` and `stop`, the way Arduino `tone()` leaves its pin. Check:
`runHeadless({ board: 'microbit-v2', language: 'micropython', source: 'import music\nmusic.pitch(440, 500)\n', … })`
gives `trace.pins.P0` an entry `{ mode: 'tone', v: 440 }`.

## 2. Note lengths do not carry over

MicroPython keeps the previous note's duration when a note has no `:n` (`['c5:1', 'd5', 'e5']` is three 1-tick
notes). `noteLen()` returns 4 for every note without `:n`, so `music.JUMP_UP` lasts 2.1 s instead of 0.6 s and
`music.POWER_UP` 1.9 s instead of about 1 s. Shape: keep the last duration (and octave, which also carries over) in
`play`'s loop. Ticks are 4 per beat at the default 120 bpm, so 1 tick = 125 ms, as now.

## 3. Missing modules and methods the fact sheet's lessons use (`docs/facts/microbit-v2.md` section 7)

- `radio`: `config(group=…, length=…, channel=…, power=…)`, `on()`, `off()`, `send(str)`, `receive()` → str or None,
  `send_bytes`, `receive_bytes`. A loop-back world (messages from a world `network`-style input, or a second board)
  would let a radio lesson pass checks.
- `i2c` (external bus, P20 SDA / P19 SCL, 100 kHz): `init(freq=100000, sda=pin20, scl=pin19)`, `scan()`,
  `read(addr, n)`, `write(addr, buf)`, backed by the same `w.i2c` devices as the Pico's `machine.I2C`, so an MPU-6050
  wired to P19/P20 answers at 0x68. It must not list the on-board LSM303AGR (separate internal bus on V2).
- `compass` (`calibrate()`, `heading()`, `get_field_strength()`), `microphone` (`sound_level()`, `current_event()`;
  using it drives `RUN_MIC` high so the figure's D70 lights), `speaker` (`on()`, `off()`), `pinN.set_analog_period(ms)`
  and `set_analog_period_microseconds(us)`.

## 4. Fixed temperature

`temperature()` always returns 24. Read it from a world input with `device: { kind: 'onboard', sensor:
'temperature' }` when the lesson has one (the Pico's `ADC(4)` lesson uses that device), else 24.

## 5. A starting tilt is lost

`accelerometer` creates its `Mpu6050(0x19)` lazily on the first read, so the host's `session.setInput(tilt, value)`
at compile time (before any read) finds no device and the World panel's starting tilt is ignored until the slider
moves. Create the device when `installMicrobit` runs (or when the binding first applies a `mpu6050` input at 0x19).
