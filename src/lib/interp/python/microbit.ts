// The micro:bit V2 MicroPython runtime: display, buttons, pins, accelerometer and music.

import { Mpu6050 } from '../devices';
import { charPixels, scrollColumns, scrollFrame } from '../font5x5';
import type { Gen } from '../exec';
import { mod, nat, natGen, nclass, sleepGen } from './native';
import { PyInstance, PyList, PyRt, PyTuple, I, pyErr, toBig, toNum, truthy } from './runtime';

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
    read_light_level: () => BigInt(Math.round(((w.pin(200).volts ?? 1.5) / 3.3) * 255)),
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
  const pinObj = (n: number) => new PyInstance(nclass(`MicroBitPin${n}`, {
    read_digital: () => BigInt(w.level(n)),
    write_digital: (_s, [v]) => { w.setMode(n, 'output'); w.digitalWrite(n, truthy(v) ? 1 : 0); return null; },
    read_analog: () => {
      if (!w.profile.analogPins.includes(n)) throw pyErr('ValueError', `pin${n} has no analog input`);
      return BigInt(w.analogRead(n, 10));
    },
    write_analog: (_s, [v]) => { w.analogWrite(n, Number(toBig(typeof v === 'number' ? I(v) : v)), 1023, 50); return null; },
    is_touched: () => w.level(n) === 0,
    set_pull: (_s, [p]) => { w.setMode(n, toBig(p) === 0n ? 'input_pullup' : toBig(p) === 1n ? 'input_pulldown' : 'input'); return null; },
  }, {}, { PULL_UP: 0n, PULL_DOWN: 1n, NO_PULL: 2n }));
  const accelerometer = new PyInstance(nclass('MicroBitAccelerometer', {
    get_x: () => BigInt(Math.round(accel().x * 1000)),
    get_y: () => BigInt(Math.round(accel().y * 1000)),
    get_z: () => BigInt(Math.round(-accel().z * 1000)),
    get_values: () => new PyTuple([BigInt(Math.round(accel().x * 1000)), BigInt(Math.round(accel().y * 1000)), BigInt(Math.round(-accel().z * 1000))]),
    current_gesture: () => gesture(),
    was_gesture: (_s, [g]) => gesture() === String(g),
    is_gesture: (_s, [g]) => gesture() === String(g),
  }));
  let imu = [...w.i2c.values()].find((d) => d.kind === 'mpu6050') as Mpu6050 | undefined;
  const accel = () => {
    if (!imu) {
      imu = new Mpu6050(0x19);
      w.addDevice(imu);
    }
    return imu.accel;
  };
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
  const music = mod('music', {
    play: natGen('play', function* ([tune], kw) {
      const notes = tune instanceof PyList || tune instanceof PyTuple ? tune.items.map(String) : [String(tune)];
      for (const n of notes) {
        const hz = noteHz(n);
        const st = w.pin(0);
        st.toneHz = hz;
        w.touch();
        if (kw.wait !== false) yield* rt.sleepUntil(w.now + 500_000 / 4 * noteLen(n));
      }
      w.pin(0).toneHz = 0;
      w.touch();
      return null;
    }),
    pitch: natGen('pitch', function* ([hz, dur], kw) {
      const st = w.pin(0);
      st.toneHz = Number(toBig(hz));
      w.touch();
      const d = dur === undefined ? -1 : toNum(dur);
      if (d > 0 && kw.wait !== false) {
        yield* rt.sleepUntil(w.now + d * 1000);
        st.toneHz = 0;
        w.touch();
      }
      return null;
    }),
    stop: nat('stop', () => { w.pin(0).toneHz = 0; w.touch(); return null; }),
    set_tempo: nat('set_tempo', () => null),
    BA_DING: new PyList(['b5:1', 'e6:3']), POWER_UP: new PyList(['g4:1', 'c5', 'e5', 'g5:2', 'e5:1', 'g5:3']), JUMP_UP: new PyList(['c5:1', 'd5', 'e5', 'f5', 'g5']),
  });
  const pins: Record<string, PyInstance> = {};
  for (const n of [0, 1, 2, 3, 4, 8, 9, 10, 12, 13, 14, 15, 16, 19, 20]) pins[`pin${n}`] = pinObj(n);
  const exports = {
    display, Image, music,
    button_a: button(5, 'A'), button_b: button(11, 'B'),
    pin_logo: new PyInstance(nclass('MicroBitTouchPin', { is_touched: () => w.level(201) === 0 })),
    accelerometer,
    sleep: natGen('sleep', ([v]) => sleepGen(rt, toNum(v) * 1000)),
    running_time: nat('running_time', () => BigInt(Math.floor(w.now / 1000))),
    temperature: nat('temperature', () => 24n),
    panic: nat('panic', ([code]) => { throw pyErr('RuntimeError', `panic(${code ?? ''})`); }),
    reset: nat('reset', () => { throw pyErr('SystemExit', 'reset()'); }),
    ...pins,
  };
  rt.modules.set('microbit', () => mod('microbit', exports));
  rt.modules.set('music', () => music);
}

function noteHz(n: string): number {
  const m = /^([a-gA-GrR])(#|b)?(\d)?/.exec(n);
  if (!m || m[1].toLowerCase() === 'r') return 0;
  const semis: Record<string, number> = { c: -9, d: -7, e: -5, f: -4, g: -2, a: 0, b: 2 };
  let s = semis[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  s += (Number(m[3] ?? 4) - 4) * 12;
  return Math.round(440 * 2 ** (s / 12));
}
function noteLen(n: string): number {
  const m = /:(\d+)$/.exec(n);
  return m ? Number(m[1]) : 4;
}
