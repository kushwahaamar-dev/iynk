import { describe, expect, it } from 'vitest';
import type { WorldInput, WorldModel } from '@/content/schema';
import { runHeadless } from '../headless';

const NO_WORLD: WorldModel = { inputs: [], script: [] };

function run(source: string, runMs = 2000, world: WorldModel = NO_WORLD) {
  const trace = runHeadless({ board: 'microbit-v2', language: 'micropython', source, world, runMs });
  return { trace, out: trace.serial.map((s) => s.text) };
}

/** Each tone the trace saw on a pin: [start ms to the nearest 5 (the program takes a moment to start), Hz], ending with [ms, 0] when the pin falls silent. */
function tones(trace: ReturnType<typeof run>['trace'], net = 'P0') {
  return (trace.pins[net] ?? []).map((s) => [Math.round(s.t / 5) * 5, s.mode === 'tone' ? s.v : 0]);
}

const tilt = (deg: number): WorldInput => ({
  id: 'tilt', quantity: 'tilt-deg', device: { kind: 'mpu6050', address: 0x19 }, pins: [], part: 'U6',
  min: -90, max: 90, step: 1, default: deg, unit: '°', gesture: 'tilt', label: 'tilt',
});

const mic = (level: number): WorldInput => ({
  id: 'mic', quantity: 'level', device: { kind: 'onboard', sensor: 'microphone' }, pins: [], part: 'MIC1',
  min: 0, max: 255, step: 1, default: level, gesture: 'slide', label: 'mic',
});

describe('micro:bit music', () => {
  it('sounds on pin 0 the way Arduino tone() does, so the trace and the figure see it', () => {
    const { trace } = run('import music\nmusic.pitch(440, 500)\n', 1000);
    expect(trace.error).toBeNull();
    expect(trace.pins.P0?.[0]).toMatchObject({ mode: 'tone', v: 440 });
    expect(tones(trace)).toEqual([[0, 440], [500, 0]]);
  });

  it('carries the octave and length from note to note: JUMP_UP is five 125 ms notes', () => {
    const { trace } = run('import music\nmusic.play(music.JUMP_UP)\nmusic.play(["c4:2", "e", "g5"])\n', 2000);
    expect(tones(trace)).toEqual([
      [0, 523], [125, 587], [250, 659], [375, 698], [500, 784],
      [625, 262], [875, 330], [1125, 784], [1375, 0],
    ]);
  });

  it('keeps the carried length across calls until music.reset()', () => {
    const { trace } = run('import music\nmusic.play("c4:8")\nmusic.play("d")\nmusic.reset()\nmusic.play("e")\n', 3000);
    expect(tones(trace)).toEqual([[0, 262], [1000, 294], [2000, 330], [2500, 0]]);
  });

  it('follows set_tempo and reports it with get_tempo', () => {
    const { trace, out } = run('import music\nmusic.set_tempo(bpm=240)\nprint(music.get_tempo())\nmusic.play(["c4:4", "r", "c"])\n', 1000);
    expect(out).toEqual(['(4, 240)']);
    expect(tones(trace)).toEqual([[0, 262], [250, 0], [500, 262], [750, 0]]);
  });

  it('plays on while the program runs with wait=False, and stop() cuts it short', () => {
    const { trace, out } = run('import music\nfrom microbit import sleep\nmusic.play(music.POWER_UP, wait=False)\nprint("free")\nsleep(300)\nmusic.stop()\n', 1500);
    expect(out).toEqual(['free']);
    expect(tones(trace)).toEqual([[0, 392], [125, 523], [250, 659], [300, 0]]);
  });

  it('plays on another pin, or on none', () => {
    const { trace } = run('import music\nfrom microbit import pin1\nmusic.pitch(880, 100, pin=pin1)\nmusic.pitch(440, 100, pin=None)\n', 500);
    expect(tones(trace, 'P1')).toEqual([[0, 880], [100, 0]]);
    expect(trace.pins.P0).toBeUndefined();
  });
});

describe('micro:bit sensors and buses', () => {
  it('reads a starting tilt the World panel set before the first read', () => {
    const { out } = run('from microbit import accelerometer\nprint(accelerometer.get_y(), accelerometer.get_z())\n', 100, { inputs: [tilt(30)], script: [] });
    expect(out).toEqual(['500 -866']);
  });

  it('keeps the motion sensor off the edge-connector I2C bus, which finds an MPU-6050 wired to P19/P20', () => {
    const mpu: WorldInput = { ...tilt(0), id: 'mpu', device: { kind: 'mpu6050', address: 0x68 }, part: 'IMU1' };
    const source = `from microbit import i2c, accelerometer
i2c.init(freq=100000)
print(i2c.scan())
i2c.write(0x68, bytes([0x75]))
print(i2c.read(0x68, 1)[0] == 0x68)
print(accelerometer.get_z())
try:
    i2c.read(0x19, 1)
except OSError as e:
    print('internal bus')
`;
    expect(run(source, 100).out[0]).toBe('[]');
    expect(run(source, 100, { inputs: [mpu], script: [] }).out).toEqual(['[104]', 'True', '-1000', 'internal bus']);
  });

  it('powers the microphone from RUN_MIC (pin 202) when the program listens; the room is quiet', () => {
    const { trace, out } = run('from microbit import microphone, SoundEvent\nprint(microphone.sound_level(), microphone.current_event(), SoundEvent.LOUD)\n', 100);
    expect(out).toEqual(["0 None SoundEvent('loud')"]);
    expect(trace.pins.P202?.at(-1)).toMatchObject({ mode: 'out', v: 1 });
  });

  it('hears LOUD when the level rises through 196 and QUIET when it falls back through 118 (CODAL 85 dB and 65 dB)', () => {
    const source = `from microbit import *
print(microphone.current_event(), microphone.was_event(SoundEvent.LOUD))
sleep(150)
print(microphone.current_event(), microphone.is_event(SoundEvent.LOUD))
sleep(100)
print(microphone.current_event(), microphone.is_event(SoundEvent.LOUD))
sleep(100)
print(microphone.current_event(), microphone.get_events())
print(microphone.was_event(SoundEvent.LOUD), microphone.get_events())
`;
    // quiet room, then a clap, then a level between the two thresholds (no event), then quiet again
    const script = [{ t: 100, input: 'mic', value: 220 }, { t: 200, input: 'mic', value: 150 }, { t: 300, input: 'mic', value: 60 }];
    const { trace, out } = run(source, 500, { inputs: [mic(50)], script });
    expect(trace.error).toBeNull();
    expect(out).toEqual([
      'None False',
      "SoundEvent('loud') True",
      "SoundEvent('loud') True",
      "SoundEvent('quiet') (SoundEvent('loud'), SoundEvent('quiet'))",
      'False ()',
    ]);
  });

  it('moves the thresholds with set_threshold, clamped to 0-255, LOUD always above QUIET', () => {
    const source = `from microbit import *
microphone.set_threshold(SoundEvent.LOUD, 100)
print(microphone.was_event(SoundEvent.LOUD))
microphone.set_threshold(SoundEvent.QUIET, 300)
print(microphone.was_event(SoundEvent.QUIET))
`;
    // 150 is under the default LOUD (196) but over 100; QUIET at 255 lifts LOUD to 256, so 150 is quiet again
    expect(run(source, 100, { inputs: [mic(150)], script: [] }).out).toEqual(['True', 'True']);
  });

  it('points north in a 48 µT field, and calibrates on the first heading', () => {
    const { out } = run('from microbit import compass\nprint(compass.is_calibrated(), compass.heading(), compass.get_field_strength(), compass.is_calibrated())\n', 100);
    expect(out).toEqual(['False 0 48000 True']);
  });

  it('switches the speaker off while pin 0 still carries the sound', () => {
    const { trace, out } = run('from microbit import speaker\nimport music\nspeaker.off()\nprint(speaker.is_on())\nmusic.pitch(440, 100)\n', 300);
    expect(out).toEqual(['False']);
    expect(tones(trace)).toEqual([[0, 440], [100, 0]]);
  });

  it('sets a pin PWM period from 1 ms (256 µs) up', () => {
    const source = `from microbit import pin0, pin1
pin1.write_analog(512)
pin0.set_analog_period(1)
pin0.write_analog(256)
print(pin0.get_analog_period_microseconds(), pin1.get_analog_period_microseconds())
for bad in (lambda: pin0.set_analog_period(0), lambda: pin0.set_analog_period_microseconds(100), lambda: pin0.write_analog(2000)):
    try:
        bad()
    except ValueError:
        print('refused')
`;
    const { trace, out } = run(source, 100);
    expect(out).toEqual(['1000 20000', 'refused', 'refused', 'refused']);
    expect(trace.pins.P0?.at(-1)).toMatchObject({ mode: 'pwm', v: 0.25 });
  });
});

describe('micro:bit radio', () => {
  it('needs radio.on(), checks its settings, and hears nothing with no other micro:bit near', () => {
    const source = `import radio
try:
    radio.send('hello')
except ValueError as e:
    print(e)
radio.config(group=23, length=64, power=7)
radio.on()
radio.send('hello')
print(radio.receive(), radio.receive_bytes())
for bad in (lambda: radio.config(channel=99), lambda: radio.config(colour=1)):
    try:
        bad()
    except (ValueError, TypeError) as e:
        print(type(e).__name__)
`;
    const { trace, out } = run(source, 100);
    expect(trace.error).toBeNull();
    expect(out).toEqual(['radio is not enabled', 'None None', 'ValueError', 'TypeError']);
  });
});
