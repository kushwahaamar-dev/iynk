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

## Answer from P2-pi (2026-10-24 ~23:55 CDT)

The micro:bit runtime moved to its own file, `src/lib/interp/python/microbit.ts` (`fc17d6f`); the work below is
`dc116a8`, with tests in `src/lib/interp/python/microbit.test.ts`. The five micro:bit lessons still pass (lesson
table 102/102).

1. **Done.** `music.play`, `pitch` and `stop` put the pin in output mode while it sounds, so
   `runHeadless(... 'import music\nmusic.pitch(440, 500)\n' ...)` gives `trace.pins.P0` `{ mode: 'tone', v: 440 }`
   at 0 ms and `{ mode: 'out', v: 0 }` at 500 ms. `pin=` picks another pin, `pin=None` sounds nowhere.
2. **Done.** Octave and length carry from note to note and across calls until `music.reset()`; one tick is
   60 s / bpm / ticks (125 ms at the default 4 ticks, 120 bpm). `set_tempo(ticks=, bpm=)`, `get_tempo()`,
   `wait=False` (plays on while the program runs; the next music call cuts it) and `loop=True` work. `JUMP_UP` is
   0.625 s, `POWER_UP` 1.125 s. Built-in tunes: DADADADUM, ENTERTAINER, ODE, BIRTHDAY, PUNCHLINE, BADDY, BA_DING,
   WAWAWAWAA, JUMP_UP, JUMP_DOWN, POWER_UP, POWER_DOWN. Not added (I could not write their notes with confidence):
   PRELUDE, NYAN, RINGTONE, FUNK, BLUES, WEDDING, FUNERAL, PYTHON, CHASE; using one is an AttributeError.
3. **Done, with no peers.**
   - `i2c`: `init(freq=100000, sda=pin20, scl=pin19)`, `scan()`, `read(addr, n)`, `write(addr, buf)` on the same
     `w.i2c` devices as the Pico's `machine.I2C`. The on-board accelerometer is never listed or reachable there; an
     MPU-6050 world input at 0x68 answers (`scan()` gives `[104]`, WHO_AM_I reads 0x68). A missing address raises
     `OSError: [Errno 5] EIO` (the micro:bit's exact errno is unverified).
   - `radio`: `on/off/reset/config/send/send_bytes/receive/receive_bytes/receive_full`, `RATE_1MBIT/RATE_2MBIT`.
     Sending or receiving while off raises `ValueError: radio is not enabled`; `config` checks each setting's range
     (length 1-251, channel 0-83, power 0-7, group 0-255) and refuses unknown keywords. No other micro:bit is in
     range, so `receive()` is always `None`: a loop-back needs a world device for radio messages (schema) and a
     binding, which no wave-B section owns. I have not added one.
   - `compass`: `calibrate()`, `is_calibrated()`, `clear_calibration()`, `heading()` (0: the board lies pointing
     north), `get_field_strength()` (48000 nT). `microphone`: `sound_level()` (0, a quiet room),
     `current_event()`, `was_event()`, `is_event()`, `get_events()`, `set_threshold()`, and `SoundEvent.LOUD/QUIET`.
     Any of them drives pin 202 high as RUN_MIC. **For D70 to light**, that pin has to reach the figure as the net
     `RUN_MIC`: today it arrives as `P202`. Either give the figure's D70 `net: 'P202'`, or map pin 202 to `RUN_MIC`
     in the nets Board Lab passes (`pinoutNets`/`boardNets`). `speaker`: `on()`, `off()`, `is_on()` (sound still
     reaches pin 0). Pins: `set_analog_period(ms)` (from 1 ms), `set_analog_period_microseconds(us)` (from 256 µs),
     `get_analog_period_microseconds()`; `write_analog` uses the pin's period (default 20 ms) and refuses values
     outside 0-1023.
4. **Not done: needs a binding outside `python/**`.** `WorldBinding.apply` (`src/lib/interp/lesson-world.ts`) has no
   case for `{ kind: 'onboard' }`, so no onboard value reaches a running program: the Pico's `ADC(4)` lesson input
   is ignored the same way (its runtime also reads a fixed 24 °C). Filed as
   `docs/requests/P2-pi-to-driver-onboard-inputs.md` with the shape; once the binding stores the value on the
   world, `temperature()`, `ADC(4)`, `compass.heading()` and `microphone.sound_level()` read it (a few lines here).
5. **Done.** The accelerometer device (0x19) exists from power-on, so the binding's starting tilt lands before the
   first read (`tilt` default 30° reads `get_y() = 500`, `get_z() = -866`). It also reads only 0x19 now: before, it
   took any MPU-6050 on the bus, so a lesson with one wired to P19/P20 would have moved the on-board accelerometer.
