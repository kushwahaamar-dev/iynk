// The micro:bit V2 MicroPython runtime: display, buttons, pins, accelerometer, compass, microphone, speaker, the
// edge-connector I2C bus, music and radio.

import { Mpu6050 } from '../devices';
import { charPixels, scrollColumns, scrollFrame } from '../font5x5';
import type { Gen } from '../exec';
import { mod, nat, natGen, nclass, sleepGen } from './native';
import { I, PyBytes, PyInstance, PyList, PyModule, PyRt, PyTuple, pyErr, toBig, toNum, truthy, type PyValue } from './runtime';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

// micro:bit images: 5 rows of brightness digits 0-9.
const IMAGES: Record<string, string> = {
  HEART: '09090:99999:99999:09990:00900', HEART_SMALL: '00000:09090:09990:00900:00000', HAPPY: '00000:09090:00000:90009:09990',
  SMILE: '00000:00000:00000:90009:09990', SAD: '00000:09090:00000:09990:90009', CONFUSED: '00000:09090:00000:09090:90909',
  ANGRY: '90009:09090:00000:99999:90909', ASLEEP: '00000:99099:00000:09990:00000', SURPRISED: '09090:00000:00900:09090:00900',
  YES: '00000:00009:00090:90900:09000', NO: '90009:09090:00900:09090:90009', SQUARE: '99999:90009:90009:90009:99999',
  SQUARE_SMALL: '00000:09990:09090:09990:00000', DIAMOND: '00900:09090:90009:09090:00900', DIAMOND_SMALL: '00000:00900:09090:00900:00000',
  TRIANGLE: '00000:00900:09090:99999:00000', CHESSBOARD: '09090:90909:09090:90909:09090', ARROW_N: '00900:09990:90909:00900:00900',
  ARROW_S: '00900:00900:90909:09990:00900', ARROW_E: '00900:00090:99999:00090:00900', ARROW_W: '00900:09000:99999:09000:00900',
  SKULL: '09990:90909:99999:09990:09990', GHOST: '99999:90909:99999:99999:90909', TARGET: '00900:09990:99099:09990:00900',
  MUSIC_CROTCHET: '00900:00900:00900:99900:99900', BUTTERFLY: '99099:99999:00900:99999:99099', DUCK: '09900:99900:09999:09990:00000',
  HOUSE: '00900:09990:99999:09990:09090', TORTOISE: '00000:09990:99999:09090:00000', SNAKE: '99000:99099:09090:09990:00000',
  GIRAFFE: '99000:09000:09000:09990:09090', RABBIT: '90900:90900:99990:99090:99990', COW: '90009:90009:99999:09990:00900',
  PACMAN: '09999:99090:99900:99990:09999', SWORD: '00900:00900:00900:09990:00900', UMBRELLA: '09990:99999:00900:90900:09900',
  TSHIRT: '99099:99999:09990:09990:09990', ROLLERSKATE: '00099:00099:99999:99999:09090', XMAS: '00900:09990:00900:09990:99999',
};

export function installMicrobit(rt: PyRt): void {
  const w = rt.world;
  w.matrix = { w: 5, h: 5, px: new Array(25).fill(0) };
  const Image = nclass('Image', {
    __init__: (self, [src]) => {
      const s = typeof src === 'string' ? src : '00000:00000:00000:00000:00000';
      const rows = s.split(':').filter(Boolean);
      self.native = { px: rows.flatMap((r) => [...r.padEnd(5, '0')].slice(0, 5).map(Number)), repr: () => `Image('${s}')` };
      return null;
    },
    get_pixel: (self, [x, y]) => BigInt(self.native.px[Number(toBig(y)) * 5 + Number(toBig(x))]),
    set_pixel: (self, [x, y, v]) => { self.native.px[Number(toBig(y)) * 5 + Number(toBig(x))] = Number(toBig(v)); return null; },
    invert: (self) => { const im = new PyInstance(Image); im.native = { px: self.native.px.map((v: number) => 9 - v) }; return im; },
    width: () => 5n,
    height: () => 5n,
  });
  for (const [name, s] of Object.entries(IMAGES)) {
    const im = new PyInstance(Image);
    im.native = { px: s.split(':').flatMap((r) => [...r].map(Number)), repr: () => `Image('${s}:')` };
    Image.dict.set(name, im);
  }
  const show = (px: number[]) => {
    w.matrix!.px = px.map((v) => v / 9);
    w.touch();
  };
  // Frames still queued by show/scroll with wait=False.
  let pending: Array<() => void> = [];
  const cancelAnim = () => {
    for (const c of pending) c();
    pending = [];
  };
  /** Play frames `us` apart; blocks unless wait is false. */
  function* animate(frames: number[][], us: number, wait: boolean): Gen<null> {
    cancelAnim();
    if (!wait) {
      frames.forEach((f, k) => pending.push(w.clock.at(w.now + k * us, () => show(f))));
      return null;
    }
    for (const f of frames) {
      show(f);
      yield* rt.sleepUntil(w.now + us);
    }
    return null;
  }
  const display = new PyInstance(nclass('MicroBitDisplay', {
    show: () => null,
    scroll: () => null,
    clear: () => { cancelAnim(); show(new Array(25).fill(0)); return null; },
    set_pixel: (_s, [x, y, v]) => {
      cancelAnim();
      const i = Number(toBig(y)) * 5 + Number(toBig(x));
      if (i < 0 || i > 24) throw pyErr('ValueError', 'index out of bounds');
      w.matrix!.px[i] = Number(toBig(v)) / 9;
      w.touch();
      return null;
    },
    get_pixel: (_s, [x, y]) => BigInt(Math.round(w.matrix!.px[Number(toBig(y)) * 5 + Number(toBig(x))] * 9)),
    on: () => null,
    off: () => null,
    is_on: () => true,
    read_light_level: () => BigInt(Math.round(clamp(w.onboard.get('light') ?? ((w.pin(200).volts ?? 1.5) / 3.3) * 255, 0, 255))),
  }));
  // show/scroll block for the animation time unless wait=False.
  display.cls.dict.set('show', natGen('show', function* ([, v, delay], kw) {
    const d = toNum(delay ?? kw.delay ?? 400n) * 1000;
    const wait = kw.wait === undefined || truthy(kw.wait);
    if (v instanceof PyInstance && v.native?.px) {
      cancelAnim();
      show(v.native.px);
      return null;
    }
    if (v instanceof PyList || v instanceof PyTuple) {
      const frames = v.items.map((im) => (im instanceof PyInstance && im.native?.px ? im.native.px : charPixels(rt.str(im))));
      return yield* animate(frames, d, wait);
    }
    const text = rt.str(v);
    if (text.length === 1) {
      cancelAnim();
      show(charPixels(text));
      return null;
    }
    // A string shows one character at a time, then the display clears.
    return yield* animate([...[...text].map(charPixels), new Array(25).fill(0)], d, wait);
  }));
  display.cls.dict.set('scroll', natGen('scroll', function* ([, v, delay], kw) {
    const text = rt.str(v);
    const d = toNum(delay ?? kw.delay ?? 150n) * 1000;
    // The text moves one column every `delay` ms, entering from the right.
    const cols = scrollColumns(text);
    const frames = Array.from({ length: cols.length + 1 }, (_, k) => scrollFrame(cols, k));
    return yield* animate(frames, d, kw.wait === undefined || truthy(kw.wait));
  }));
  const button = (pin: number, name: string) => {
    let presses = 0;
    let was = false;
    w.attachInterrupt(pin, 'falling', () => {
      presses++;
      was = true;
    });
    w.setMode(pin, 'input_pullup');
    return new PyInstance(nclass(`MicroBitButton_${name}`, {
      is_pressed: () => w.level(pin) === 0,
      was_pressed: () => { const r = was; was = false; return r; },
      get_presses: () => { const n = presses; presses = 0; return BigInt(n); },
    }));
  };
  // Pins PWM at 50 Hz until set_analog_period changes it (CODAL's default 20 ms period).
  const MicroBitPin = nclass('MicroBitPin', {
    read_digital: (self) => BigInt(w.level(self.native.pin)),
    write_digital: (self, [v]) => {
      const n = self.native.pin;
      self.native.duty = null;
      w.setMode(n, 'output');
      w.digitalWrite(n, truthy(v) ? 1 : 0);
      return null;
    },
    read_analog: (self) => {
      const n = self.native.pin;
      if (!w.profile.analogPins.includes(n)) throw pyErr('ValueError', `pin${n} has no analog input`);
      return BigInt(w.analogRead(n, 10));
    },
    write_analog: (self, [v]) => {
      const duty = Number(toBig(typeof v === 'number' ? I(v) : v));
      if (duty < 0 || duty > 1023) throw pyErr('ValueError', 'value must be between 0 and 1023');
      self.native.duty = duty;
      w.analogWrite(self.native.pin, duty, 1023, 1e6 / self.native.periodUs);
      return null;
    },
    set_analog_period: (self, [period]) => setPeriod(self, toNum(period) * 1000),
    set_analog_period_microseconds: (self, [period]) => setPeriod(self, toNum(period)),
    get_analog_period_microseconds: (self) => BigInt(self.native.periodUs),
    is_touched: (self) => w.level(self.native.pin) === 0,
    set_pull: (self, [p]) => { w.setMode(self.native.pin, toBig(p) === 0n ? 'input_pullup' : toBig(p) === 1n ? 'input_pulldown' : 'input'); return null; },
  }, {}, { PULL_UP: 0n, PULL_DOWN: 1n, NO_PULL: 2n });
  const setPeriod = (self: PyInstance, us: number) => {
    if (us < 256) throw pyErr('ValueError', 'invalid period: the shortest is 256 µs (set_analog_period takes at least 1 ms)');
    self.native.periodUs = Math.round(us);
    if (self.native.duty !== null) w.analogWrite(self.native.pin, self.native.duty, 1023, 1e6 / self.native.periodUs);
    return null;
  };
  const pinObj = (n: number) => {
    const p = new PyInstance(MicroBitPin);
    p.native = { pin: n, periodUs: 20_000, duty: null };
    return p;
  };

  // The LSM303AGR's accelerometer answers at 0x19 on the internal bus. It exists from power-on, so a starting tilt the
  // World panel sets before the program's first read lands on it.
  const found = w.i2c.get(0x19);
  const imu = found instanceof Mpu6050 ? found : new Mpu6050(0x19);
  if (imu !== found) w.addDevice(imu);
  const accel = () => imu.accel;
  const accelerometer = new PyInstance(nclass('MicroBitAccelerometer', {
    get_x: () => BigInt(Math.round(accel().x * 1000)),
    get_y: () => BigInt(Math.round(accel().y * 1000)),
    get_z: () => BigInt(Math.round(-accel().z * 1000)),
    get_values: () => new PyTuple([BigInt(Math.round(accel().x * 1000)), BigInt(Math.round(accel().y * 1000)), BigInt(Math.round(-accel().z * 1000))]),
    current_gesture: () => gesture(),
    was_gesture: (_s, [g]) => gesture() === String(g),
    is_gesture: (_s, [g]) => gesture() === String(g),
  }));
  const gesture = () => {
    const a = accel();
    if (a.z > 0.8) return 'face up';
    if (a.z < -0.8) return 'face down';
    if (a.x > 0.5) return 'right';
    if (a.x < -0.5) return 'left';
    if (a.y > 0.5) return 'down';
    if (a.y < -0.5) return 'up';
    return 'shake';
  };

  // The edge connector's I2C bus (P20 SDA, P19 SCL). On V2 the motion sensor sits on a separate internal bus, so
  // the program never sees it here.
  const external = (addr: number) => {
    const d = w.i2c.get(addr);
    return d !== undefined && d !== imu;
  };
  const bytesOf = (b: PyValue): number[] => (b instanceof PyBytes ? b.data : [...rt.iter(b)].map((x) => Number(toBig(x)) & 255));
  const i2c = new PyInstance(nclass('MicroBitI2C', {
    init: (_s, [freq], kw) => {
      const hz = toNum(freq ?? kw.freq ?? 100_000n);
      if (hz <= 0) throw pyErr('ValueError', 'freq must be positive');
      for (const k of ['sda', 'scl']) {
        if (kw[k] !== undefined && !(kw[k] instanceof PyInstance && kw[k].cls === MicroBitPin)) throw pyErr('TypeError', `${k} must be a pin`);
      }
      return null;
    },
    scan: () => new PyList([...w.i2c.keys()].filter(external).sort((a, b) => a - b).map((a) => BigInt(a))),
    read: (_s, [addr, n]) => {
      const a = Number(toBig(addr));
      if (!external(a)) throw pyErr('OSError', '[Errno 5] EIO');
      return new PyBytes(w.i2cRead(a, Number(toBig(n))));
    },
    write: (_s, [addr, buf]) => {
      const a = Number(toBig(addr));
      if (!external(a) || !w.i2cWrite(a, bytesOf(buf))) throw pyErr('OSError', '[Errno 5] EIO');
      return null;
    },
  }));

  // The LSM303AGR's magnetometer. The simulated board lies flat, its top edge pointing at magnetic north unless a
  // world input turns it, in a field like the Earth's at mid-northern latitudes (48 µT, dipping 60°).
  let calibrated = false;
  const compass = new PyInstance(nclass('MicroBitCompass', {
    calibrate: () => { calibrated = true; return null; },
    is_calibrated: () => calibrated,
    clear_calibration: () => { calibrated = false; return null; },
    heading: () => { calibrated = true; return BigInt(((Math.round(w.onboard.get('compass') ?? 0) % 360) + 360) % 360); },
    get_field_strength: () => 48_000n,
  }));

  // The microphone takes its power from RUN_MIC (nRF P0.20, here pin 202), which also lights the red D70 beside it.
  // The room is quiet unless a world input sets the level.
  const RUN_MIC = 202;
  const micOn = () => {
    w.setMode(RUN_MIC, 'output');
    w.digitalWrite(RUN_MIC, 1);
  };
  const SoundEvent = nclass('SoundEvent', {});
  const soundEvent = (name: string) => {
    const e = new PyInstance(SoundEvent);
    e.native = { repr: () => `SoundEvent('${name}')` };
    return e;
  };
  const LOUD = soundEvent('loud');
  const QUIET = soundEvent('quiet');
  SoundEvent.dict.set('LOUD', LOUD);
  SoundEvent.dict.set('QUIET', QUIET);
  // LOUD and QUIET the way CODAL's level detector makes them: LOUD when the level rises to the LOUD threshold, QUIET
  // when it falls back to the QUIET one, nothing in between. MicroPython hands set_threshold straight to CODAL, on
  // the same 0-255 scale as sound_level() (35 dB = 0, 100 dB = 255), and CODAL starts at 85 dB and 65 dB: about 196
  // and 118 (codal-microbit-v2 MicroBitAudio.cpp, codal-core LevelDetectorSPL.h). The level is read whenever the
  // program uses the microphone, so a clap shorter than the gap between two reads goes unheard.
  const threshold = { loud: 196, quiet: 118 };
  let loud = false;
  let last: PyInstance | null = null;
  let history: PyInstance[] = [];
  const listen = () => {
    micOn();
    const level = Math.round(clamp(w.onboard.get('microphone') ?? 0, 0, 255));
    const event = !loud && level >= threshold.loud ? LOUD : loud && level <= threshold.quiet ? QUIET : null;
    if (event) {
      loud = event === LOUD;
      last = event;
      // kept short, so a program that never reads its events doesn't grow the list without end
      history = [...history, event].slice(-16);
    }
    return level;
  };
  const soundEventArg = (event: unknown) => {
    if (event !== LOUD && event !== QUIET) throw pyErr('TypeError', 'expecting SoundEvent.LOUD or SoundEvent.QUIET');
    return event;
  };
  const microphone = new PyInstance(nclass('MicroBitMicrophone', {
    sound_level: () => BigInt(listen()),
    current_event: () => { listen(); return last; },
    // was_event and get_events clear the history; is_event only looks at its newest entry
    was_event: (_s, [event]) => {
      soundEventArg(event);
      listen();
      const heard = history.includes(event as PyInstance);
      history = [];
      return heard;
    },
    is_event: (_s, [event]) => { soundEventArg(event); listen(); return history.at(-1) === event; },
    get_events: () => {
      listen();
      const events = new PyTuple(history);
      history = [];
      return events;
    },
    set_threshold: (_s, [event, value]) => {
      soundEventArg(event);
      const v = Math.round(clamp(Number(toBig(value)), 0, 255));
      if (event === LOUD) {
        threshold.loud = v;
        if (threshold.quiet >= v) threshold.quiet = v - 1;
      } else {
        threshold.quiet = v;
        if (threshold.loud <= v) threshold.loud = v + 1;
      }
      listen();
      return null;
    },
  }));

  // speaker.off() silences the built-in speaker; the sound still comes out of pin 0.
  let speakerOn = true;
  const speaker = new PyInstance(nclass('MicroBitSpeaker', {
    on: () => { speakerOn = true; return null; },
    off: () => { speakerOn = false; return null; },
    is_on: () => speakerOn,
  }));

  const music = installMusic(rt);
  const radio = installRadio();
  const pins: Record<string, PyInstance> = {};
  for (const n of [0, 1, 2, 3, 4, 8, 9, 10, 12, 13, 14, 15, 16, 19, 20]) pins[`pin${n}`] = pinObj(n);
  const exports = {
    display, Image, music, i2c, compass, microphone, speaker, SoundEvent,
    button_a: button(5, 'A'), button_b: button(11, 'B'),
    pin_logo: new PyInstance(nclass('MicroBitTouchPin', {
      is_touched: () => {
        const touch = w.onboard.get('touch');
        return touch === undefined ? w.level(201) === 0 : touch >= 0.5;
      },
    })),
    accelerometer,
    sleep: natGen('sleep', ([v]) => sleepGen(rt, toNum(v) * 1000)),
    running_time: nat('running_time', () => BigInt(Math.floor(w.now / 1000))),
    temperature: nat('temperature', () => BigInt(Math.round(w.onboard.get('temperature') ?? 24))),
    panic: nat('panic', ([code]) => { throw pyErr('RuntimeError', `panic(${code ?? ''})`); }),
    reset: nat('reset', () => { throw pyErr('SystemExit', 'reset()'); }),
    ...pins,
  };
  rt.modules.set('microbit', () => mod('microbit', exports));
  rt.modules.set('music', () => music);
  rt.modules.set('radio', () => radio);
}

// music: a note is NAME[#|b][octave][:ticks]. A note without an octave or a length keeps the previous note's, and
// both carry over between calls until music.reset(), as in MicroPython. One tick lasts 60 s / bpm / ticks-per-beat.
const SEMITONES_FROM_A: Record<string, number> = { c: -9, d: -7, e: -5, f: -4, g: -2, a: 0, b: 2 };

interface MusicState {
  octave: number;
  length: number;
  ticks: number;
  bpm: number;
}
const MUSIC_DEFAULTS: MusicState = { octave: 4, length: 4, ticks: 4, bpm: 120 };

/** One note's frequency (0 for a rest) and length in ticks; updates the carried octave and length. */
function readNote(note: string, st: MusicState): { hz: number; ticks: number } {
  const m = /^([a-gr])(#|b)?(\d)?(?::(\d+))?/i.exec(note.trim());
  if (!m) return { hz: 0, ticks: st.length };
  if (m[3] !== undefined) st.octave = Number(m[3]);
  if (m[4] !== undefined) st.length = Number(m[4]);
  const name = m[1].toLowerCase();
  if (name === 'r') return { hz: 0, ticks: st.length };
  const semis = SEMITONES_FROM_A[name] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (st.octave - 4) * 12;
  return { hz: Math.round(440 * 2 ** (semis / 12)), ticks: st.length };
}

// The short built-in tunes.
const TUNES: Record<string, string[]> = {
  DADADADUM: ['r4:2', 'g', 'g', 'g', 'eb:8', 'r:2', 'f', 'f', 'f', 'd:8'],
  ENTERTAINER: ['d4:1', 'd#', 'e', 'c5:2', 'e4:1', 'c5:2', 'e4:1', 'c5:3', 'c:1', 'd', 'd#', 'e', 'c', 'd', 'e:2', 'b4:1', 'd5:2', 'c:4'],
  ODE: ['e4', 'e', 'f', 'g', 'g', 'f', 'e', 'd', 'c', 'c', 'd', 'e', 'e:6', 'd:2', 'd:8', 'e:4', 'e', 'f', 'g', 'g', 'f', 'e', 'd', 'c', 'c', 'd', 'e', 'd:6', 'c:2', 'c:8'],
  BIRTHDAY: ['c4:3', 'c:1', 'd:4', 'c:4', 'f', 'e:8', 'c:3', 'c:1', 'd:4', 'c:4', 'g', 'f:8', 'c:3', 'c:1', 'c5:4', 'a4', 'f', 'e', 'd', 'a#:3', 'a#:1', 'a:4', 'f', 'g', 'f:8'],
  PUNCHLINE: ['c4:3', 'g3:1', 'f#', 'g', 'g#:3', 'g', 'r', 'b', 'c4'],
  BADDY: ['c3:3', 'r', 'd:2', 'd#', 'r', 'c', 'r', 'f#:8'],
  BA_DING: ['b5:1', 'e6:3'],
  WAWAWAWAA: ['e3:3', 'r:1', 'd#:3', 'r:1', 'd:4', 'r:1', 'c#:8'],
  JUMP_UP: ['c5:1', 'd', 'e', 'f', 'g'],
  JUMP_DOWN: ['g5:1', 'f', 'e', 'd', 'c'],
  POWER_UP: ['g4:1', 'c5', 'e', 'g:2', 'e:1', 'g:3'],
  POWER_DOWN: ['g5:1', 'd#', 'c', 'g4:2', 'b:1', 'c5:3'],
};

function installMusic(rt: PyRt): PyModule {
  const w = rt.world;
  const st: MusicState = { ...MUSIC_DEFAULTS };
  const tickUs = () => 60e6 / st.bpm / st.ticks;
  let timers: Array<() => void> = [];
  let sounding: number | null = null;
  // Like Arduino's tone(), a sounding pin is an output carrying a square wave.
  const tone = (pin: number | null, hz: number) => {
    if (pin === null) return;
    const p = w.pin(pin);
    if (hz > 0) {
      w.setMode(pin, 'output');
      p.duty = null;
    }
    p.toneHz = hz;
    sounding = hz > 0 ? pin : null;
    w.touch();
  };
  const silence = () => {
    for (const cancel of timers) cancel();
    timers = [];
    if (sounding !== null) tone(sounding, 0);
  };
  /** The pin a call sounds on: pin0 by default, none for pin=None. */
  const outPin = (v: PyValue | undefined): number | null => {
    if (v === undefined) return 0;
    if (v === null) return null;
    if (v instanceof PyInstance && typeof v.native?.pin === 'number') return v.native.pin;
    throw pyErr('TypeError', 'expecting a pin');
  };
  const notesOf = (tune: PyValue) => (tune instanceof PyList || tune instanceof PyTuple ? tune.items.map((n) => rt.str(n)) : [rt.str(tune)]);
  // wait=False: the tune plays on while the program runs, until the next music call.
  const background = (pin: number | null, notes: string[], loop: boolean) => {
    timers = [];
    let at = w.now;
    for (const n of notes) {
      const { hz, ticks } = readNote(n, st);
      timers.push(w.clock.at(at, () => tone(pin, hz)));
      at += ticks * tickUs();
    }
    timers.push(w.clock.at(at, () => (loop ? background(pin, notes, loop) : tone(pin, 0))));
  };
  const entries: Record<string, PyValue> = {
    play: natGen('play', function* ([tune, pinArg, waitArg, loopArg], kw) {
      silence();
      const pin = outPin(pinArg !== undefined ? pinArg : kw.pin);
      const notes = notesOf(tune ?? kw.music);
      const loop = truthy(loopArg ?? kw.loop ?? false);
      if (!truthy(waitArg ?? kw.wait ?? true)) {
        background(pin, notes, loop);
        return null;
      }
      do {
        for (const n of notes) {
          const { hz, ticks } = readNote(n, st);
          tone(pin, hz);
          yield* rt.sleepUntil(w.now + ticks * tickUs());
        }
      } while (loop);
      tone(pin, 0);
      return null;
    }),
    pitch: natGen('pitch', function* ([hzArg, durArg, pinArg, waitArg], kw) {
      silence();
      const pin = outPin(pinArg !== undefined ? pinArg : kw.pin);
      const ms = toNum(durArg ?? kw.duration ?? -1n);
      tone(pin, Math.trunc(toNum(hzArg ?? kw.frequency)));
      // A negative duration sounds until music.stop().
      if (ms < 0) return null;
      if (truthy(waitArg ?? kw.wait ?? true)) {
        yield* rt.sleepUntil(w.now + ms * 1000);
        tone(pin, 0);
      } else timers.push(w.clock.after(ms * 1000, () => tone(pin, 0)));
      return null;
    }),
    stop: nat('stop', ([pinArg], kw) => {
      silence();
      tone(outPin(pinArg !== undefined ? pinArg : kw.pin), 0);
      return null;
    }),
    set_tempo: nat('set_tempo', (_a, kw) => {
      const ticks = kw.ticks === undefined ? st.ticks : toNum(kw.ticks);
      const bpm = kw.bpm === undefined ? st.bpm : toNum(kw.bpm);
      if (ticks <= 0 || bpm <= 0) throw pyErr('ValueError', 'ticks and bpm must be positive');
      st.ticks = ticks;
      st.bpm = bpm;
      return null;
    }),
    get_tempo: nat('get_tempo', () => new PyTuple([BigInt(Math.round(st.ticks)), BigInt(Math.round(st.bpm))])),
    reset: nat('reset', () => {
      Object.assign(st, MUSIC_DEFAULTS);
      return null;
    }),
  };
  for (const [name, notes] of Object.entries(TUNES)) entries[name] = new PyList([...notes]);
  return mod('music', entries);
}

// radio: the micro:bit radio protocol's on/off state and settings. No other micro:bit is in range yet, so sends go
// nowhere and nothing arrives.
const RADIO_LIMITS: Record<string, [number, number]> = {
  length: [1, 251], queue: [1, 254], channel: [0, 83], power: [0, 7], address: [0, 0xffffffff], group: [0, 255], data_rate: [0, 1],
};

function installRadio(): PyModule {
  let on = false;
  const live = () => {
    if (!on) throw pyErr('ValueError', 'radio is not enabled');
  };
  return mod('radio', {
    RATE_1MBIT: 0n,
    RATE_2MBIT: 1n,
    on: nat('on', () => { on = true; return null; }),
    off: nat('off', () => { on = false; return null; }),
    reset: nat('reset', () => null),
    config: nat('config', (_a, kw) => {
      for (const [k, v] of Object.entries(kw)) {
        const range = Object.hasOwn(RADIO_LIMITS, k) ? RADIO_LIMITS[k] : null;
        if (!range) throw pyErr('TypeError', `unexpected keyword argument '${k}'`);
        const n = Number(toBig(v));
        if (n < range[0] || n > range[1]) throw pyErr('ValueError', `value out of range for argument '${k}'`);
      }
      return null;
    }),
    send: nat('send', () => { live(); return null; }),
    send_bytes: nat('send_bytes', () => { live(); return null; }),
    receive: nat('receive', () => { live(); return null; }),
    receive_bytes: nat('receive_bytes', () => { live(); return null; }),
    receive_full: nat('receive_full', () => { live(); return null; }),
  });
}
