import { Mpu6050 } from '../devices';
import { charPixels, scrollColumns, scrollFrame } from '../font5x5';
import type { Gen } from '../exec';
import {
  EXC, I, PyBound, PyBytes, PyClass, PyDict, PyFunc, PyInstance, PyList, PyModule, PyNative, PyProp, PyRange, PyRt, PyTuple,
  isInt, pyErr, toBig, toNum, truthy, typeName, type NativeFn, type PyValue,
} from './runtime';

/** One published ROS 2 message, for the host's topic monitor. */
export interface RosMessage {
  t: number;
  topic: string;
  type: string;
  data: unknown;
}

const nat = (name: string, fn: NativeFn) => new PyNative(name, fn);
const natGen = (name: string, fn: (a: PyValue[], kw: Record<string, PyValue>) => Gen<PyValue>) => new PyNative(name, fn as NativeFn, true);

function mod(name: string, entries: Record<string, PyValue>): PyModule {
  const m = new PyModule(name);
  for (const [k, v] of Object.entries(entries)) m.dict.set(k, v);
  return m;
}

/** A class whose methods are native; `init` fills `self.native`. */
function nclass(name: string, methods: Record<string, (self: PyInstance, a: PyValue[], kw: Record<string, PyValue>) => PyValue>, props: Record<string, PyProp> = {}, consts: Record<string, PyValue> = {}, bases: PyClass[] = []): PyClass {
  const dict = new Map<string, PyValue>();
  for (const [k, fn] of Object.entries(methods)) dict.set(k, new PyNative(k, (a, kw) => fn(a[0], a.slice(1), kw)));
  for (const [k, p] of Object.entries(props)) dict.set(k, p);
  for (const [k, v] of Object.entries(consts)) dict.set(k, v);
  return new PyClass(name, bases, dict);
}

const ms = (rt: PyRt) => Math.floor(rt.world.now / 1000);

function sleepGen(rt: PyRt, us: number): Gen<null> {
  return (function* () {
    if (us > 0) yield* rt.sleepUntil(rt.world.now + us);
    return null;
  })();
}

/** Pin number from an int, "GP25", "LED", "P0" or a Pin object. */
function pinNo(rt: PyRt, v: PyValue): number {
  if (v instanceof PyInstance && v.native && 'pin' in v.native) return v.native.pin;
  if (isInt(v)) return Number(toBig(v));
  if (typeof v === 'string') {
    const n = rt.world.profile.aliases[v] ?? rt.world.profile.aliases[v.toUpperCase()];
    if (n !== undefined) return n;
    if (/^\d+$/.test(v)) return Number(v);
  }
  throw pyErr('ValueError', `invalid pin ${typeof v === 'string' ? `'${v}'` : rt.repr(v)}`);
}

export function installBuiltins(rt: PyRt): void {
  const b = rt.builtins;
  const p = () => rt.line;
  b.set('print', nat('print', (a, kw) => {
    const sep = kw.sep === undefined || kw.sep === null ? ' ' : String(kw.sep);
    const end = kw.end === undefined || kw.end === null ? '\n' : String(kw.end);
    rt.world.print(a.map((x) => rt.str(x)).join(sep) + end);
    return null;
  }));
  b.set('range', nat('range', (a) => {
    const n = a.map((x) => {
      if (!isInt(x)) throw pyErr('TypeError', `'${typeName(x)}' object cannot be interpreted as an integer`);
      return toBig(x);
    });
    if (n.length === 1) return new PyRange(0n, n[0], 1n);
    if (n[2] === 0n) throw pyErr('ValueError', 'range() arg 3 must not be zero');
    return new PyRange(n[0], n[1], n[2] ?? 1n);
  }));
  b.set('len', nat('len', ([x]) => {
    if (typeof x === 'string') return BigInt(x.length);
    if (x instanceof PyList || x instanceof PyTuple) return BigInt(x.items.length);
    if (x instanceof PyDict) return BigInt(x.map.size);
    if (x instanceof PyBytes) return BigInt(x.data.length);
    if (x instanceof PyRange) return BigInt([...rt.iter(x)].length);
    if (x instanceof PyInstance && x.cls.lookup('__len__')) return rt.callSync(x.cls.lookup('__len__'), [x], {}, p());
    throw pyErr('TypeError', `object of type '${typeName(x)}' has no len()`);
  }));
  b.set('int', nat('int', ([x = 0n, base]) => {
    if (typeof x === 'string') {
      const s = x.trim().replace(/_/g, '');
      const bs = base === undefined ? 10 : Number(base);
      const ok = bs === 16 ? /^[-+]?(0x)?[0-9a-f]+$/i : bs === 2 ? /^[-+]?(0b)?[01]+$/i : /^[-+]?\d+$/;
      if (!ok.test(s)) throw pyErr('ValueError', `invalid literal for int() with base ${bs}: '${x}'`);
      const neg = s.startsWith('-');
      const body = s.replace(/^[-+]/, '').replace(/^0[xb]/i, '');
      const v = BigInt(bs === 10 ? body : (bs === 16 ? '0x' : '0b') + body);
      return neg ? -v : v;
    }
    if (typeof x === 'number') {
      if (!Number.isFinite(x)) throw pyErr(Number.isNaN(x) ? 'ValueError' : 'OverflowError', 'cannot convert float to integer');
      return I(x);
    }
    if (isInt(x)) return toBig(x);
    throw pyErr('TypeError', `int() argument must be a string or a number, not '${typeName(x)}'`);
  }));
  b.set('float', nat('float', ([x = 0]) => {
    if (typeof x === 'string') {
      const t = x.trim().toLowerCase();
      if (t === 'inf' || t === '+inf') return Infinity;
      if (t === '-inf') return -Infinity;
      if (t === 'nan') return NaN;
      if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/.test(t)) throw pyErr('ValueError', `could not convert string to float: '${x}'`);
      return parseFloat(t);
    }
    return toNum(x);
  }));
  b.set('str', nat('str', ([x = '']) => rt.str(x)));
  b.set('repr', nat('repr', ([x]) => rt.repr(x)));
  b.set('bool', nat('bool', ([x = false]) => truthy(x)));
  b.set('abs', nat('abs', ([x]) => (isInt(x) ? (toBig(x) < 0n ? -toBig(x) : toBig(x)) : Math.abs(toNum(x)))));
  // Like CPython, the first of several equal extremes wins.
  const minmax = (name: string, op: '<' | '>') => nat(name, (a, kw) => {
    const items = a.length === 1 ? [...rt.iter(a[0])] : a;
    if (!items.length) {
      if (kw.default !== undefined) return kw.default;
      throw pyErr('ValueError', `${name}() arg is an empty sequence`);
    }
    const key = kw.key;
    const k = (v: PyValue) => (key ? rt.callSync(key, [v], {}, p()) : v);
    let best = items[0];
    for (const v of items.slice(1)) if (rt.compare(op, k(v), k(best), p())) best = v;
    return best;
  });
  b.set('min', minmax('min', '<'));
  b.set('max', minmax('max', '>'));
  b.set('max', nat('max', (a, kw) => {
    const items = a.length === 1 ? [...rt.iter(a[0])] : a;
    if (!items.length) {
      if (kw.default !== undefined) return kw.default;
      throw pyErr('ValueError', 'max() arg is an empty sequence');
    }
    const key = kw.key;
    const k = (v: PyValue) => (key ? rt.callSync(key, [v], {}, p()) : v);
    let best = items[0];
    for (const v of items.slice(1)) if (rt.compare('>', k(v), k(best), p())) best = v;
    return best;
  }));
  b.set('round', nat('round', ([x, nd]) => {
    if (isInt(x)) return toBig(x);
    const v = toNum(x);
    if (nd === undefined || nd === null) {
      // Banker's rounding, like Python.
      const r = Math.round(v);
      return I(Math.abs(v % 1) === 0.5 ? 2 * Math.round(v / 2) : r);
    }
    const f = 10 ** Number(toBig(nd));
    return Math.round(v * f) / f;
  }));
  b.set('sum', nat('sum', ([it, start = 0n]) => [...rt.iter(it)].reduce((acc, v) => rt.binop('+', acc, v, p()), start)));
  b.set('enumerate', nat('enumerate', ([it, start = 0n]) => new PyList([...rt.iter(it)].map((v, i) => new PyTuple([toBig(start) + BigInt(i), v])))));
  b.set('zip', nat('zip', (a) => {
    const lists = a.map((x) => [...rt.iter(x)]);
    const n = Math.min(...lists.map((l) => l.length));
    return new PyList(Array.from({ length: n }, (_, i) => new PyTuple(lists.map((l) => l[i]))));
  }));
  b.set('sorted', nat('sorted', ([it], kw) => {
    const items = [...rt.iter(it)];
    rt.sortItems(items, kw.key, truthy(kw.reverse ?? false));
    return new PyList(items);
  }));
  b.set('reversed', nat('reversed', ([it]) => new PyList([...rt.iter(it)].reverse())));
  b.set('list', nat('list', ([it]) => new PyList(it === undefined ? [] : [...rt.iter(it)])));
  b.set('tuple', nat('tuple', ([it]) => new PyTuple(it === undefined ? [] : [...rt.iter(it)])));
  b.set('set', nat('set', ([it]) => {
    const out: PyValue[] = [];
    for (const v of it === undefined ? [] : rt.iter(it)) if (!out.some((x) => rt.eq(x, v))) out.push(v);
    return new PyList(out);
  }));
  b.set('dict', nat('dict', ([src], kw) => {
    const d = new PyDict();
    if (src instanceof PyDict) for (const [k, v] of src.map.values()) d.set(k, v);
    else if (src !== undefined) for (const pair of rt.iter(src)) {
      const [k, v] = [...rt.iter(pair)];
      d.set(k, v);
    }
    for (const [k, v] of Object.entries(kw)) d.set(k, v);
    return d;
  }));
  b.set('bytes', nat('bytes', ([x]) => (x === undefined ? new PyBytes([]) : isInt(x) ? new PyBytes(new Array(Number(toBig(x))).fill(0)) : typeof x === 'string' ? new PyBytes([...x].map((c) => c.charCodeAt(0))) : new PyBytes([...rt.iter(x)].map((v) => Number(toBig(v)) & 255)))));
  b.set('bytearray', b.get('bytes'));
  b.set('isinstance', nat('isinstance', ([v, t]) => {
    const types = t instanceof PyTuple ? t.items : [t];
    return types.some((c) => {
      if (c instanceof PyClass) return v instanceof PyInstance && v.cls.isSub(c);
      if (c instanceof PyNative) return typeName(v) === c.name || (c.name === 'int' && typeof v === 'boolean') || (c.name === 'float' && false);
      return false;
    });
  }));
  b.set('type', nat('type', ([v]) => (v instanceof PyInstance ? v.cls : b.get(typeName(v)) ?? null)));
  b.set('hex', nat('hex', ([x]) => (toBig(x) < 0n ? '-0x' + (-toBig(x)).toString(16) : '0x' + toBig(x).toString(16))));
  b.set('bin', nat('bin', ([x]) => (toBig(x) < 0n ? '-0b' + (-toBig(x)).toString(2) : '0b' + toBig(x).toString(2))));
  b.set('oct', nat('oct', ([x]) => '0o' + toBig(x).toString(8)));
  b.set('ord', nat('ord', ([c]) => BigInt(String(c).charCodeAt(0))));
  b.set('chr', nat('chr', ([n]) => String.fromCharCode(Number(toBig(n)))));
  b.set('divmod', nat('divmod', ([a, c]) => new PyTuple([rt.binop('//', a, c, p()), rt.binop('%', a, c, p())])));
  b.set('pow', nat('pow', ([a, c, m]) => (m === undefined ? rt.binop('**', a, c, p()) : rt.binop('%', rt.binop('**', a, c, p()), m, p()))));
  b.set('any', nat('any', ([it]) => [...rt.iter(it)].some(truthy)));
  b.set('all', nat('all', ([it]) => [...rt.iter(it)].every(truthy)));
  b.set('map', nat('map', ([fn, ...its]) => {
    const lists = its.map((x) => [...rt.iter(x)]);
    const n = Math.min(...lists.map((l) => l.length));
    return new PyList(Array.from({ length: n }, (_, i) => rt.callSync(fn, lists.map((l) => l[i]), {}, p())));
  }));
  b.set('filter', nat('filter', ([fn, it]) => new PyList([...rt.iter(it)].filter((v) => truthy(fn === null ? v : rt.callSync(fn, [v], {}, p()))))));
  b.set('hasattr', nat('hasattr', ([o, n]) => rt.getAttr(o, String(n), p(), true) !== undefined));
  b.set('getattr', nat('getattr', ([o, n, d]) => rt.getAttr(o, String(n), p(), d !== undefined) ?? d));
  b.set('setattr', nat('setattr', ([o, n, v]) => { rt.setAttr(o, String(n), v, p()); return null; }));
  b.set('iter', nat('iter', ([it]) => new PyList([...rt.iter(it)])));
  b.set('id', nat('id', () => BigInt(Math.floor(rt.world.rng.next()))));
  b.set('input', nat('input', () => {
    throw pyErr('OSError', 'input() is not available: there is no keyboard on the board; read the serial monitor with sys.stdin instead');
  }));
  b.set('open', nat('open', () => {
    throw pyErr('OSError', 'the simulated board has no file system');
  }));
  for (const [k, v] of Object.entries(EXC)) b.set(k, v);
  b.set('object', new PyClass('object', [], new Map()));
}

/** Install the board modules. Which ones exist depends on the board. */
export function installModules(rt: PyRt, onRos: (m: RosMessage) => void): void {
  const w = rt.world;
  const prof = w.profile;
  const M = rt.modules;
  const isPico = prof.id === 'pico';
  const isMicrobit = prof.id === 'microbit-v2';
  const isPi = prof.id === 'pi4-pi5';

  // time / utime --------------------------------------------------------------
  const timeMod = () =>
    mod('time', {
      sleep: natGen('sleep', ([s]) => sleepGen(rt, toNum(s) * 1e6)),
      sleep_ms: natGen('sleep_ms', ([v]) => sleepGen(rt, toNum(v) * 1000)),
      sleep_us: natGen('sleep_us', ([v]) => { rt.fineClock++; return sleepGen(rt, toNum(v)); }),
      ticks_ms: nat('ticks_ms', () => BigInt(ms(rt) & 0x3fffffff)),
      ticks_us: nat('ticks_us', () => { rt.fineClock++; return BigInt(Math.floor(w.now) & 0x3fffffff); }),
      ticks_diff: nat('ticks_diff', ([a, b]) => { const d = (Number(toBig(a)) - Number(toBig(b))) & 0x3fffffff; return BigInt(d >= 0x20000000 ? d - 0x40000000 : d); }),
      ticks_add: nat('ticks_add', ([a, b]) => BigInt((Number(toBig(a)) + Number(toBig(b))) & 0x3fffffff)),
      time: nat('time', () => (isPi ? 1_793_000_000 + w.now / 1e6 : BigInt(Math.floor(w.now / 1e6)))),
      monotonic: nat('monotonic', () => w.now / 1e6),
      perf_counter: nat('perf_counter', () => w.now / 1e6),
      time_ns: nat('time_ns', () => BigInt(Math.floor(w.now)) * 1000n),
    });
  M.set('time', timeMod);
  if (!isPi) M.set('utime', timeMod);

  M.set('math', () => mod('math', {
    pi: Math.PI, e: Math.E, inf: Infinity, nan: NaN,
    ...Object.fromEntries(['sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'exp', 'log10', 'fabs'].map((n) => [n, nat(n, ([x]) => {
      const v = toNum(x);
      if (n === 'sqrt' && v < 0) throw pyErr('ValueError', 'math domain error');
      return (Math as PyValue)[n === 'fabs' ? 'abs' : n](v);
    })])),
    log: nat('log', ([x, base]) => (base === undefined ? Math.log(toNum(x)) : Math.log(toNum(x)) / Math.log(toNum(base)))),
    atan2: nat('atan2', ([y, x]) => Math.atan2(toNum(y), toNum(x))),
    pow: nat('pow', ([x, y]) => Math.pow(toNum(x), toNum(y))),
    floor: nat('floor', ([x]) => I(Math.floor(toNum(x)))),
    ceil: nat('ceil', ([x]) => I(Math.ceil(toNum(x)))),
    degrees: nat('degrees', ([x]) => (toNum(x) * 180) / Math.PI),
    radians: nat('radians', ([x]) => (toNum(x) * Math.PI) / 180),
    hypot: nat('hypot', (a) => Math.hypot(...a.map(toNum))),
    isnan: nat('isnan', ([x]) => Number.isNaN(toNum(x))),
  }));
  M.set('random', () => mod('random', {
    random: nat('random', () => w.rng.float()),
    randint: nat('randint', ([a, b]) => toBig(a) + BigInt(Math.floor(w.rng.float() * (Number(toBig(b) - toBig(a)) + 1)))),
    randrange: nat('randrange', ([a, b]) => (b === undefined ? BigInt(Math.floor(w.rng.float() * Number(toBig(a)))) : toBig(a) + BigInt(Math.floor(w.rng.float() * Number(toBig(b) - toBig(a)))))),
    uniform: nat('uniform', ([a, b]) => toNum(a) + w.rng.float() * (toNum(b) - toNum(a))),
    choice: nat('choice', ([seq]) => { const it = [...rt.iter(seq)]; return it[Math.floor(w.rng.float() * it.length)]; }),
    seed: nat('seed', ([s]) => { w.rng.seed(Number(toBig(s ?? 0n))); return null; }),
  }));
  M.set('sys', () => mod('sys', { platform: isPi ? 'linux' : isMicrobit ? 'microbit' : 'rp2', implementation: null, exit: nat('exit', () => { throw pyErr('SystemExit', ''); }) }));
  M.set('struct', () => mod('struct', {
    unpack: nat('unpack', ([fmt, data]) => {
      const f = String(fmt);
      const big = f.startsWith('>') || f.startsWith('!');
      const bytes = (data as PyBytes).data;
      const out: PyValue[] = [];
      let i = 0;
      for (const c of f.replace(/^[<>!=@]/, '')) {
        const size = 'bB'.includes(c) ? 1 : 'hH'.includes(c) ? 2 : 4;
        let v = 0;
        for (let k = 0; k < size; k++) v |= bytes[i + (big ? k : size - 1 - k)] << (8 * (size - 1 - k));
        if (c === 'b') v = (v << 24) >> 24;
        else if (c === 'h') v = (v << 16) >> 16;
        else if (c === 'i' || c === 'l') v |= 0;
        else v >>>= 0;
        out.push(BigInt(v));
        i += size;
      }
      return new PyTuple(out);
    }),
  }));

  // machine (Pico and other MicroPython boards) --------------------------------------
  if (!isPi && !isMicrobit) {
    const Pin = nclass('Pin', {
      __init__: (self, [id, mode, pull], kw) => {
        const pin = pinNo(rt, id);
        if (pin === 64 && !prof.hasWifi) throw pyErr('ValueError', 'invalid pin');
        self.native = { pin };
        const m = mode ?? kw.mode;
        const pl = pull ?? kw.pull;
        applyMode(pin, m, pl);
        if (kw.value !== undefined) w.digitalWrite(pin, truthy(kw.value) ? 1 : 0);
        return null;
      },
      init: (self, [mode, pull], kw) => { applyMode(self.native.pin, mode ?? kw.mode, pull ?? kw.pull); return null; },
      value: (self, [v]) => {
        if (v === undefined) return BigInt(w.level(self.native.pin));
        w.digitalWrite(self.native.pin, truthy(v) ? 1 : 0);
        return null;
      },
      on: (self) => { w.digitalWrite(self.native.pin, 1); return null; },
      off: (self) => { w.digitalWrite(self.native.pin, 0); return null; },
      high: (self) => { w.digitalWrite(self.native.pin, 1); return null; },
      low: (self) => { w.digitalWrite(self.native.pin, 0); return null; },
      toggle: (self) => { w.digitalWrite(self.native.pin, w.level(self.native.pin) ? 0 : 1); return null; },
      irq: (self, [handler, trigger], kw) => {
        const h = handler ?? kw.handler;
        const t = Number(toBig(trigger ?? kw.trigger ?? 12n));
        const edge = t === 4 ? 'falling' : t === 8 ? 'rising' : 'change';
        if (h === null || h === undefined) w.detachInterrupt(self.native.pin);
        else w.attachInterrupt(self.native.pin, edge, () => rt.softQueue.push(() => rt.call(h, [self], {}, rt.line)));
        return null;
      },
    }, {}, { IN: 0n, OUT: 1n, OPEN_DRAIN: 2n, PULL_UP: 1n, PULL_DOWN: 2n, IRQ_FALLING: 4n, IRQ_RISING: 8n });
    const applyMode = (pin: number, mode: PyValue, pull: PyValue) => {
      if (mode === undefined || mode === null) return;
      const m = Number(toBig(mode));
      const pl = pull === undefined || pull === null ? 0 : Number(toBig(pull));
      w.setMode(pin, m === 1 ? 'output' : m === 2 ? 'open_drain' : pl === 1 ? 'input_pullup' : pl === 2 ? 'input_pulldown' : 'input');
    };
    const PWM = nclass('PWM', {
      __init__: (self, [pin], kw) => {
        self.native = { pin: pinNo(rt, pin), freq: Number(toBig(kw.freq ?? 1000n)), duty: 0 };
        w.setMode(self.native.pin, 'output');
        if (kw.duty_u16 !== undefined) setDuty(self, Number(toBig(kw.duty_u16)));
        return null;
      },
      freq: (self, [f]) => { if (f === undefined) return BigInt(self.native.freq); self.native.freq = Number(toBig(f)); setDuty(self, self.native.duty); return null; },
      duty_u16: (self, [d]) => { if (d === undefined) return BigInt(self.native.duty); setDuty(self, Number(toBig(d))); return null; },
      duty_ns: (self, [ns]) => { setDuty(self, Math.round((Number(toBig(ns)) * self.native.freq * 65535) / 1e9)); return null; },
      deinit: (self) => { w.analogWrite(self.native.pin, 0, 65535); return null; },
    });
    const setDuty = (self: PyInstance, d: number) => {
      const v = Math.max(0, Math.min(65535, d));
      self.native.duty = v;
      w.analogWrite(self.native.pin, v, 65535, self.native.freq);
      // A 50 Hz PWM with a 1-2 ms pulse is a servo signal.
      if (self.native.freq <= 400) {
        const st = w.pin(self.native.pin);
        st.servoUs = Math.round((v / 65535) * (1e6 / self.native.freq));
      }
    };
    const ADC = nclass('ADC', {
      __init__: (self, [src]) => {
        let pin = src instanceof PyInstance ? src.native.pin : Number(toBig(src));
        if (isPico && pin >= 0 && pin <= 4 && !(src instanceof PyInstance)) pin = pin === 4 ? 4 + 100 : 26 + pin;
        if (pin !== 104 && !prof.analogPins.includes(pin)) throw pyErr('ValueError', `Pin(${pin}) has no ADC: use GP26, GP27 or GP28`);
        self.native = { pin };
        return null;
      },
      read_u16: (self) => {
        if (self.native.pin === 104) {
          // Internal sensor: 27 °C reads 0.706 V, -1.721 mV/°C.
          const v = 0.706 - (24 - 27) * 0.001721;
          return BigInt(Math.round((v / 3.3) * 4095) << 4);
        }
        const raw = w.analogRead(self.native.pin, 12);
        return BigInt((raw << 4) | (raw >> 8));
      },
      read_uv: (self) => BigInt(Math.round((w.analogRead(self.native.pin, 12) / 4095) * 3.3e6)),
    });
    const I2C = nclass('I2C', {
      __init__: (self) => { self.native = {}; return null; },
      scan: () => new PyList([...w.i2c.keys()].sort((a, b) => a - b).map((a) => BigInt(a))),
      writeto: (_s, [addr, buf]) => { if (!w.i2cWrite(Number(toBig(addr)), bytesOf(buf))) throw pyErr('OSError', '[Errno 5] EIO'); return BigInt(bytesOf(buf).length); },
      readfrom: (_s, [addr, n]) => new PyBytes(w.i2cRead(Number(toBig(addr)), Number(toBig(n)))),
      writeto_mem: (_s, [addr, reg, buf]) => { if (!w.i2cWrite(Number(toBig(addr)), [Number(toBig(reg)), ...bytesOf(buf)])) throw pyErr('OSError', '[Errno 5] EIO'); return null; },
      readfrom_mem: (_s, [addr, reg, n]) => {
        const a = Number(toBig(addr));
        if (!w.i2cWrite(a, [Number(toBig(reg))])) throw pyErr('OSError', '[Errno 5] EIO');
        return new PyBytes(w.i2cRead(a, Number(toBig(n))));
      },
    });
    const bytesOf = (b: PyValue): number[] => (b instanceof PyBytes ? b.data : [...rt.iter(b)].map((x) => Number(toBig(x)) & 255));
    const Timer = nclass('Timer', {
      __init__: (self, _a, kw) => { self.native = { cancel: null }; if (kw.callback !== undefined) startTimer(self, kw); return null; },
      init: (self, _a, kw) => { startTimer(self, kw); return null; },
      deinit: (self) => { self.native.cancel?.(); self.native.cancel = null; return null; },
    }, {}, { PERIODIC: 1n, ONE_SHOT: 0n });
    const startTimer = (self: PyInstance, kw: Record<string, PyValue>) => {
      self.native.cancel?.();
      const periodUs = kw.freq !== undefined ? 1e6 / toNum(kw.freq) : toNum(kw.period ?? 1000n) * 1000;
      const periodic = kw.mode === undefined || toBig(kw.mode) === 1n;
      const cb = kw.callback;
      let live = true;
      const fire = () => {
        if (!live) return;
        rt.softQueue.push(() => rt.call(cb, [self], {}, rt.line));
        if (periodic) w.clock.after(periodUs, fire);
      };
      w.clock.after(periodUs, fire);
      self.native.cancel = () => (live = false);
    };
    M.set('machine', () => mod('machine', {
      Pin, PWM, ADC, I2C, SoftI2C: I2C, Timer,
      freq: nat('freq', () => BigInt(prof.clockHz)),
      reset: nat('reset', () => { throw pyErr('SystemExit', 'machine.reset()'); }),
      unique_id: nat('unique_id', () => new PyBytes([0xe6, 0x61, 0x38, 0x52, 0x83, 0x3a, 0x2c, 0x2f])),
      lightsleep: natGen('lightsleep', ([t]) => sleepGen(rt, toNum(t ?? 0n) * 1000)),
      deepsleep: natGen('deepsleep', ([t]) => sleepGen(rt, toNum(t ?? 0n) * 1000)),
    }));
    if (prof.hasWifi) installNetwork(rt);
  }

  // micro:bit -------------------------------------------------------------------------
  if (isMicrobit) installMicrobit(rt);

  // Raspberry Pi: gpiozero + rclpy -----------------------------------------------------
  if (isPi) {
    installGpiozero(rt);
    installRos(rt, onRos);
    M.set('signal', () => mod('signal', { pause: natGen('pause', function* () { yield Infinity; return null; }) }));
    const rpiGpio = () => {
      if (prof.clockHz > 2e9) throw pyErr('ModuleNotFoundError', 'RPi.GPIO does not work on the Raspberry Pi 5 (its GPIO lives on the RP1 chip); use gpiozero');
      return rt.importModule('RPi.GPIO', rt.line);
    };
    M.set('RPi.GPIO', () => {
      if (prof.clockHz > 2e9) throw pyErr('ModuleNotFoundError', 'RPi.GPIO does not work on the Raspberry Pi 5 (its GPIO lives on the RP1 chip); use gpiozero');
      return makeRpiGpio(rt);
    });
    M.set('RPi', () => mod('RPi', { GPIO: rpiGpio() }));
  }
}

/** RPi.GPIO (Raspberry Pi 4 and earlier), with its real constant values. */
function makeRpiGpio(rt: PyRt): PyModule {
  const w = rt.world;
  let numbering: 'BCM' | 'BOARD' | null = null;
  const events = new Map<number, boolean>();
  const lastFire = new Map<number, number>();
  const pin = (v: PyValue): number => {
    if (!numbering) throw pyErr('RuntimeError', 'Please set pin numbering mode using GPIO.setmode(GPIO.BOARD) or GPIO.setmode(GPIO.BCM)');
    const n = Number(toBig(v));
    const bcm = numbering === 'BOARD' ? BOARD_TO_BCM[n] : n;
    if (bcm === undefined || bcm < 0 || bcm > 27) throw pyErr('ValueError', numbering === 'BOARD' ? `The channel sent is invalid on a Raspberry Pi (header pin ${n} is power or ground)` : `GPIO${n} does not exist on the header`);
    return bcm;
  };
  const isOut = (n: number) => w.pin(n).mode === 'output';
  const PWM = nclass('PWM', {
    __init__: (self, [ch, hz]) => {
      self.native = { pin: pin(ch), hz: toNum(hz), dc: 0, on: false };
      if (!isOut(self.native.pin)) throw pyErr('RuntimeError', 'You must setup() the GPIO channel as an output first');
      return null;
    },
    start: (self, [dc]) => {
      Object.assign(self.native, { dc: toNum(dc), on: true });
      w.analogWrite(self.native.pin, self.native.dc, 100, self.native.hz);
      return null;
    },
    ChangeDutyCycle: (self, [dc]) => {
      const d = toNum(dc);
      if (d < 0 || d > 100) throw pyErr('ValueError', 'dutycycle must have a value from 0.0 to 100.0');
      self.native.dc = d;
      if (self.native.on) w.analogWrite(self.native.pin, d, 100, self.native.hz);
      return null;
    },
    ChangeFrequency: (self, [hz]) => {
      self.native.hz = toNum(hz);
      if (self.native.on) w.analogWrite(self.native.pin, self.native.dc, 100, self.native.hz);
      return null;
    },
    stop: (self) => {
      self.native.on = false;
      w.analogWrite(self.native.pin, 0, 100, self.native.hz);
      return null;
    },
  });
  return mod('RPi.GPIO', {
    BCM: 11n, BOARD: 10n, IN: 1n, OUT: 0n, HIGH: 1n, LOW: 0n, PUD_OFF: 20n, PUD_DOWN: 21n, PUD_UP: 22n, RISING: 31n, FALLING: 32n, BOTH: 33n,
    setwarnings: nat('setwarnings', () => null),
    setmode: nat('setmode', ([m]) => {
      numbering = toBig(m) === 11n ? 'BCM' : 'BOARD';
      return null;
    }),
    getmode: nat('getmode', () => (numbering === 'BCM' ? 11n : numbering === 'BOARD' ? 10n : null)),
    setup: nat('setup', ([ch, dir, pud], kw) => {
      const chans = ch instanceof PyList || ch instanceof PyTuple ? ch.items : [ch];
      const d = Number(toBig(dir ?? kw.direction));
      const pull = Number(toBig(pud ?? kw.pull_up_down ?? 20n));
      for (const c of chans) {
        const n = pin(c);
        if (d === 0) {
          w.setMode(n, 'output');
          if (kw.initial !== undefined) w.digitalWrite(n, truthy(kw.initial) ? 1 : 0);
        } else w.setMode(n, pull === 22 ? 'input_pullup' : pull === 21 ? 'input_pulldown' : 'input');
      }
      return null;
    }),
    output: nat('output', ([ch, v]) => {
      const n = pin(ch);
      if (!isOut(n)) throw pyErr('RuntimeError', 'The GPIO channel has not been set up as an OUTPUT');
      w.digitalWrite(n, truthy(v) ? 1 : 0);
      return null;
    }),
    input: nat('input', ([ch]) => BigInt(w.level(pin(ch)))),
    add_event_detect: nat('add_event_detect', ([ch, edge, cb], kw) => {
      const n = pin(ch);
      const e = Number(toBig(edge));
      const bounce = kw.bouncetime === undefined ? 0 : toNum(kw.bouncetime) * 1000;
      const callback = cb ?? kw.callback;
      w.attachInterrupt(n, e === 31 ? 'rising' : e === 32 ? 'falling' : 'change', () => {
        const last = lastFire.get(n) ?? -Infinity;
        if (w.now - last < bounce) return;
        lastFire.set(n, w.now);
        events.set(n, true);
        if (callback) rt.softQueue.push(() => rt.call(callback, [BigInt(ch)], {}, rt.line));
      });
      return null;
    }),
    remove_event_detect: nat('remove_event_detect', ([ch]) => {
      w.detachInterrupt(pin(ch));
      return null;
    }),
    event_detected: nat('event_detected', ([ch]) => {
      const n = pin(ch);
      const hit = events.get(n) ?? false;
      events.set(n, false);
      return hit;
    }),
    cleanup: nat('cleanup', () => {
      for (const [n, p] of w.pins) if (p.mode === 'output') w.setMode(n, 'input');
      return null;
    }),
    PWM,
  });
}

function installNetwork(rt: PyRt): void {
  const w = rt.world;
  const statusCode = () => ({ idle: 0n, connecting: 1n, wrong_password: -3n, no_ssid: -2n, connected: 3n, disconnected: 0n })[w.wifi.status] ?? 0n;
  const WLAN = nclass('WLAN', {
    __init__: (self, [iface]) => { self.native = { active: false, iface: Number(toBig(iface ?? 0n)) }; return null; },
    active: (self, [v]) => { if (v === undefined) return self.native.active; self.native.active = truthy(v); return null; },
    connect: (self, [ssid, key]) => {
      if (!self.native.active) throw pyErr('OSError', 'WLAN is not active: call wlan.active(True) first');
      w.wifiConnect(String(ssid), key === undefined ? null : String(key));
      return null;
    },
    disconnect: () => { w.wifiDisconnect(); return null; },
    isconnected: () => w.wifi.status === 'connected',
    status: (_s, [param]) => (param === 'rssi' ? BigInt(w.wifi.rssi) : statusCode()),
    ifconfig: () => new PyTuple([w.wifi.ip, '255.255.255.0', '192.168.4.1', '192.168.4.1']),
    scan: () => new PyList(w.networks.map((n) => new PyTuple([n.ssid, new PyBytes([0, 0, 0, 0, 0, 0]), BigInt(n.channel), BigInt(n.rssi), n.password === null ? 0n : 3n, 0n]))),
  });
  rt.modules.set('network', () => mod('network', { WLAN, STA_IF: 0n, AP_IF: 1n, STAT_IDLE: 0n, STAT_CONNECTING: 1n, STAT_WRONG_PASSWORD: -3n, STAT_NO_AP_FOUND: -2n, STAT_CONNECT_FAIL: -1n, STAT_GOT_IP: 3n }));
  const Response = nclass('Response', { json: (self) => jsonToPy(JSON.parse(self.native.text)), close: () => null }, {
    text: new PyProp((self) => self.native.text),
    status_code: new PyProp((self) => BigInt(self.native.status)),
    content: new PyProp((self) => new PyBytes([...self.native.text].map((c: string) => c.charCodeAt(0)))),
  });
  const get = natGen('get', function* ([url]) {
    if (w.wifi.status !== 'connected') throw pyErr('OSError', '[Errno 113] EHOSTUNREACH: connect to Wi-Fi first');
    yield* rt.sleepUntil(w.now + 180_000); // a round trip on a home network
    const u = String(url);
    const body = w.web[u] ?? w.web[u.endsWith('/') ? u : u + '/'];
    const r = new PyInstance(Response);
    r.native = { text: body ?? 'Not Found', status: body === undefined ? 404 : 200 };
    return r;
  });
  rt.modules.set('urequests', () => mod('urequests', { get }));
  rt.modules.set('requests', () => mod('requests', { get }));
}

function jsonToPy(v: unknown): PyValue {
  if (v === null) return null;
  if (typeof v === 'number') return Number.isInteger(v) ? BigInt(v) : v;
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return new PyList(v.map(jsonToPy));
  const d = new PyDict();
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) d.set(k, jsonToPy(x));
  return d;
}

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

function installMicrobit(rt: PyRt): void {
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

function installGpiozero(rt: PyRt): void {
  const w = rt.world;
  const used = new Map<number, string>();
  const claim = (pin: number, who: string) => {
    if (pin < 0 || pin > 27) throw pyErr('ValueError', `GPIO${pin} does not exist: the header has GPIO0-GPIO27 (BCM numbering)`);
    if (used.has(pin)) throw pyErr('RuntimeError', `GPIO${pin} is already used by a ${used.get(pin)} (gpiozero PinInUse)`);
    used.set(pin, who);
  };
  const gpio = (v: PyValue): number => {
    if (typeof v === 'string') {
      const m = /^(GPIO|BCM)?(\d+)$/i.exec(v) ?? /^BOARD(\d+)$/i.exec(v);
      if (!m) throw pyErr('ValueError', `invalid pin '${v}'`);
      if (/^BOARD/i.test(v)) return BOARD_TO_BCM[Number(m[1])] ?? -1;
      return Number(m[2]);
    }
    return Number(toBig(v));
  };
  const blinkers = new Map<number, () => void>();
  const stopBlink = (pin: number) => {
    blinkers.get(pin)?.();
    blinkers.delete(pin);
  };
  const out = (cls: string, extra: Record<string, (self: PyInstance, a: PyValue[], kw: Record<string, PyValue>) => PyValue> = {}, props: Record<string, PyProp> = {}, pwm = false) =>
    nclass(cls, {
      __init__: (self, [pin], kw) => {
        const n = gpio(pin ?? kw.pin);
        claim(n, cls);
        self.native = { pin: n, activeHigh: kw.active_high === undefined ? true : truthy(kw.active_high), value: 0, pwm, hz: pwm ? toNum(kw.frequency ?? 100n) : 0 };
        w.setMode(n, 'output');
        if (kw.initial_value !== undefined && truthy(kw.initial_value)) setOut(self, 1);
        else setOut(self, 0);
        return null;
      },
      on: (self) => { stopBlink(self.native.pin); setOut(self, 1); return null; },
      off: (self) => { stopBlink(self.native.pin); setOut(self, 0); return null; },
      toggle: (self) => { stopBlink(self.native.pin); setOut(self, self.native.value ? 0 : 1); return null; },
      blink: (self, [onT, offT, n], kw) => {
        stopBlink(self.native.pin);
        const on = toNum(onT ?? kw.on_time ?? 1n) * 1e6;
        const off = toNum(offT ?? kw.off_time ?? 1n) * 1e6;
        let left = n ?? kw.n;
        let live = true;
        let count = left === undefined || left === null ? Infinity : Number(toBig(left));
        const step = (lit: boolean) => {
          if (!live) return;
          if (lit) {
            if (count-- <= 0) return;
            setOut(self, 1);
            w.clock.after(on, () => step(false));
          } else {
            setOut(self, 0);
            w.clock.after(off, () => step(true));
          }
        };
        step(true);
        blinkers.set(self.native.pin, () => (live = false));
        left = null;
        return null;
      },
      close: (self) => { stopBlink(self.native.pin); used.delete(self.native.pin); return null; },
      ...extra,
    }, {
      is_lit: new PyProp((self) => self.native.value > 0),
      is_active: new PyProp((self) => self.native.value > 0),
      value: new PyProp((self) => (pwm ? self.native.value : BigInt(self.native.value)), (self, v) => { stopBlink(self.native.pin); setOut(self, toNum(v)); }),
      pin: new PyProp((self) => `GPIO${self.native.pin}`),
      ...props,
    });
  const setOut = (self: PyInstance, v: number) => {
    const x = Math.max(0, Math.min(1, v));
    if (!self.native.pwm && x !== 0 && x !== 1) throw pyErr('ValueError', 'a plain LED can only be on (1) or off (0): use PWMLED for brightness');
    self.native.value = x;
    const level = self.native.activeHigh ? x : 1 - x;
    if (self.native.pwm && level > 0 && level < 1) w.analogWrite(self.native.pin, Math.round(level * 255), 255, self.native.hz);
    else w.digitalWrite(self.native.pin, level >= 1 ? 1 : 0);
  };
  const LED = out('LED');
  const PWMLED = out('PWMLED', {
    pulse: (self, [fi, fo], kw) => {
      // Approximate the fade with 20 steps per second.
      stopBlink(self.native.pin);
      const up = toNum(fi ?? kw.fade_in_time ?? 1n) * 1e6;
      const down = toNum(fo ?? kw.fade_out_time ?? 1n) * 1e6;
      let live = true;
      let t = 0;
      const tick = () => {
        if (!live) return;
        const cyc = t % (up + down);
        setOut(self, cyc < up ? cyc / up : 1 - (cyc - up) / down);
        t += 50_000;
        w.clock.after(50_000, tick);
      };
      tick();
      blinkers.set(self.native.pin, () => (live = false));
      return null;
    },
  }, {}, true);
  const Buzzer = out('Buzzer', { beep: (self, [onT, offT]) => { const f = LED.dict.get('blink') as PyNative; return f.fn([self, onT ?? 1n, offT ?? 1n], {}); } });
  const callbacks = (self: PyInstance) => self.native as { pin: number; pullUp: boolean; when_pressed: PyValue; when_released: PyValue; held: number };
  const Button = nclass('Button', {
    __init__: (self, [pin], kw) => {
      const n = gpio(pin ?? kw.pin);
      claim(n, 'Button');
      const pullUp = kw.pull_up === undefined ? true : kw.pull_up === null ? false : truthy(kw.pull_up);
      self.native = { pin: n, pullUp, when_pressed: null, when_released: null, bounce: kw.bounce_time === undefined || kw.bounce_time === null ? 0 : toNum(kw.bounce_time) * 1e6, last: -1e12 };
      w.setMode(n, pullUp ? 'input_pullup' : 'input_pulldown');
      w.attachInterrupt(n, 'change', () => {
        const nat2 = self.native;
        if (w.now - nat2.last < nat2.bounce) return;
        nat2.last = w.now;
        const pressed = (w.level(n) === 0) === nat2.pullUp;
        const cb = pressed ? nat2.when_pressed : nat2.when_released;
        if (cb) rt.softQueue.push(() => rt.call(cb, cbArgs(cb, self), {}, rt.line));
      });
      return null;
    },
    wait_for_press: () => null,
    wait_for_release: () => null,
    close: (self) => { w.detachInterrupt(self.native.pin); used.delete(self.native.pin); return null; },
  }, {
    is_pressed: new PyProp((self) => (w.level(self.native.pin) === 0) === callbacks(self).pullUp),
    is_active: new PyProp((self) => (w.level(self.native.pin) === 0) === callbacks(self).pullUp),
    value: new PyProp((self) => ((w.level(self.native.pin) === 0) === callbacks(self).pullUp ? 1n : 0n)),
    when_pressed: new PyProp((self) => self.native.when_pressed, (self, v) => (self.native.when_pressed = v)),
    when_released: new PyProp((self) => self.native.when_released, (self, v) => (self.native.when_released = v)),
  });
  const pressedNow = (self: PyInstance) => (w.level(self.native.pin) === 0) === self.native.pullUp;
  Button.dict.set('wait_for_press', natGen('wait_for_press', function* ([self, timeout]) {
    const deadline = timeout === undefined || timeout === null ? Infinity : w.now + toNum(timeout) * 1e6;
    while (!pressedNow(self) && w.now < deadline) yield Math.min(deadline, w.now + 1000);
    return pressedNow(self);
  }));
  Button.dict.set('wait_for_release', natGen('wait_for_release', function* ([self]) {
    while (pressedNow(self)) yield w.now + 1000;
    return true;
  }));
  // gpiozero calls a callback with no arguments when it takes none, else with the device (a method's self excluded)
  const cbArgs = (cb: PyValue, self: PyInstance) => {
    const f = cb instanceof PyBound ? cb.fn : cb;
    const required = f instanceof PyFunc ? f.params.filter((p) => !p.def && !p.star).length - (cb instanceof PyBound ? 1 : 0) : 0;
    return required >= 1 ? [self] : [];
  };
  // Servo: 1-2 ms pulses at 50 Hz; value -1..1, AngularServo maps angles.
  const servoSet = (self: PyInstance, v: number) => {
    if (v < -1 || v > 1) throw pyErr('ValueError', 'servo value must be between -1 and 1');
    self.native.value = v;
    const st = w.pin(self.native.pin);
    st.mode = 'output';
    st.servoUs = Math.round((self.native.minUs + (self.native.maxUs - self.native.minUs) * ((v + 1) / 2)));
    w.touch();
  };
  const Servo = nclass('Servo', {
    __init__: (self, [pin], kw) => {
      const n = gpio(pin ?? kw.pin);
      claim(n, 'Servo');
      self.native = { pin: n, value: 0, minUs: toNum(kw.min_pulse_width ?? 0.001) * 1e6, maxUs: toNum(kw.max_pulse_width ?? 0.002) * 1e6, minA: toNum(kw.min_angle ?? -90n), maxA: toNum(kw.max_angle ?? 90n) };
      servoSet(self, 0);
      return null;
    },
    min: (self) => { servoSet(self, -1); return null; },
    mid: (self) => { servoSet(self, 0); return null; },
    max: (self) => { servoSet(self, 1); return null; },
    detach: (self) => { w.pin(self.native.pin).servoUs = 0; w.touch(); return null; },
  }, {
    value: new PyProp((self) => self.native.value, (self, v) => servoSet(self, toNum(v))),
    angle: new PyProp((self) => self.native.minA + ((self.native.value + 1) / 2) * (self.native.maxA - self.native.minA), (self, a) => servoSet(self, ((toNum(a) - self.native.minA) / (self.native.maxA - self.native.minA)) * 2 - 1)),
  });
  const Motor = nclass('Motor', {
    __init__: (self, [fwd, back], kw) => {
      const f = gpio(fwd ?? kw.forward);
      const b = gpio(back ?? kw.backward);
      claim(f, 'Motor');
      claim(b, 'Motor');
      self.native = { f, b, value: 0 };
      w.setMode(f, 'output');
      w.setMode(b, 'output');
      return null;
    },
    forward: (self, [s]) => { motor(self, toNum(s ?? 1n)); return null; },
    backward: (self, [s]) => { motor(self, -toNum(s ?? 1n)); return null; },
    stop: (self) => { motor(self, 0); return null; },
    reverse: (self) => { motor(self, -self.native.value); return null; },
  }, { value: new PyProp((self) => self.native.value, (self, v) => motor(self, toNum(v))), is_active: new PyProp((self) => self.native.value !== 0) });
  const motor = (self: PyInstance, v: number) => {
    if (v < -1 || v > 1) throw pyErr('ValueError', 'motor speed must be between -1 and 1');
    self.native.value = v;
    w.analogWrite(self.native.f, Math.round(Math.max(0, v) * 255), 255, 100);
    w.analogWrite(self.native.b, Math.round(Math.max(0, -v) * 255), 255, 100);
  };
  // DistanceSensor ranges for real: like gpiozero's background thread it sends a 10 µs trigger pulse every 60 ms, times
  // the echo pulse the HC-SR04 sends back (343 m/s, there and back) and keeps the last queue_len readings; distance is
  // their median in metres, capped at max_distance, which is also what a missing echo reads. With partial=False (the
  // default) the first reading waits for a full queue, so the constructor returns after queue_len pings.
  type Sonar = {
    e: number; t: number; max: number; threshold: number; len: number; queue: number[]; live: boolean; rise: number; heard: boolean;
    near: boolean | null; when_in_range: PyValue; when_out_of_range: PyValue;
  };
  const sonar = (self: PyInstance) => self.native as Sonar;
  const median = (q: number[]) => {
    const s = [...q].sort((a, b) => a - b), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const rangeOf = (self: PyInstance) => {
    const n = sonar(self);
    return n.queue.length ? median(n.queue) : n.max;
  };
  const reading = (self: PyInstance, metres: number) => {
    const n = sonar(self);
    n.queue.push(Math.min(n.max, metres));
    if (n.queue.length > n.len) n.queue.shift();
    if (n.queue.length < n.len) return;
    const near = rangeOf(self) < n.threshold;
    if (n.near !== null && near !== n.near) {
      const cb = near ? n.when_in_range : n.when_out_of_range;
      if (cb) rt.softQueue.push(() => rt.call(cb, cbArgs(cb, self), {}, rt.line));
    }
    n.near = near;
  };
  const DistanceSensor = nclass('DistanceSensor', {
    close: (self) => {
      const n = sonar(self);
      n.live = false;
      used.delete(n.e);
      used.delete(n.t);
      return null;
    },
  }, {
    distance: new PyProp((self) => rangeOf(self)),
    value: new PyProp((self) => rangeOf(self) / sonar(self).max),
    in_range: new PyProp((self) => rangeOf(self) < sonar(self).threshold),
    max_distance: new PyProp((self) => sonar(self).max, (self, v) => (sonar(self).max = toNum(v))),
    threshold_distance: new PyProp((self) => sonar(self).threshold, (self, v) => (sonar(self).threshold = toNum(v))),
    when_in_range: new PyProp((self) => sonar(self).when_in_range, (self, v) => (sonar(self).when_in_range = v)),
    when_out_of_range: new PyProp((self) => sonar(self).when_out_of_range, (self, v) => (sonar(self).when_out_of_range = v)),
  });
  DistanceSensor.dict.set('__init__', natGen('__init__', function* ([self, echo, trig], kw) {
    if (!(self instanceof PyInstance)) throw pyErr('TypeError', 'DistanceSensor.__init__ needs an instance');
    const e = gpio(echo ?? kw.echo);
    const t = gpio(trig ?? kw.trigger);
    claim(e, 'DistanceSensor');
    claim(t, 'DistanceSensor');
    const partial = kw.partial !== undefined && truthy(kw.partial);
    const n: Sonar = {
      e, t, max: toNum(kw.max_distance ?? 1n), threshold: toNum(kw.threshold_distance ?? 0.3), len: Math.max(1, Number(toBig(kw.queue_len ?? 9n))),
      queue: [], live: true, rise: -1, heard: true, near: null, when_in_range: null, when_out_of_range: null,
    };
    self.native = n;
    w.setMode(t, 'output');
    w.setMode(e, 'input');
    w.onPinWrite((pin, level) => {
      if (!n.live || pin !== e) return;
      if (level === 1) n.rise = w.now;
      else if (n.rise >= 0) {
        reading(self, ((w.now - n.rise) * 343) / 2 / 1e6);
        n.rise = -1;
        n.heard = true;
      }
    });
    const ping = () => {
      if (!n.live) return;
      if (!n.heard) reading(self, n.max);
      n.heard = false;
      w.digitalWrite(t, 1);
      w.clock.after(10, () => w.digitalWrite(t, 0));
      w.clock.after(60_000, ping);
    };
    ping();
    while (!partial && n.live && n.queue.length < n.len) yield w.now + 1000;
    return null;
  }));
  for (const [name, near] of [['wait_for_in_range', true], ['wait_for_out_of_range', false]] as const) {
    DistanceSensor.dict.set(name, natGen(name, function* ([self, timeout]) {
      const s = self as PyInstance;
      const deadline = timeout === undefined || timeout === null ? Infinity : w.now + toNum(timeout) * 1e6;
      while ((rangeOf(s) < sonar(s).threshold) !== near && w.now < deadline) yield Math.min(deadline, w.now + 1000);
      return (rangeOf(s) < sonar(s).threshold) === near;
    }));
  }
  const RGBLED = nclass('RGBLED', {
    __init__: (self, [r, g, b], kw) => {
      const pins = [gpio(r ?? kw.red), gpio(g ?? kw.green), gpio(b ?? kw.blue)];
      pins.forEach((p) => claim(p, 'RGBLED'));
      self.native = { pins, color: [0, 0, 0] };
      pins.forEach((p) => w.setMode(p, 'output'));
      return null;
    },
    on: (self) => { rgb(self, [1, 1, 1]); return null; },
    off: (self) => { rgb(self, [0, 0, 0]); return null; },
  }, { color: new PyProp((self) => new PyTuple(self.native.color), (self, v) => rgb(self, [...rt.iter(v)].map(toNum))) });
  const rgb = (self: PyInstance, c: number[]) => {
    self.native.color = c;
    self.native.pins.forEach((p: number, i: number) => w.analogWrite(p, Math.round(c[i] * 255), 255, 100));
  };
  rt.modules.set('gpiozero', () => mod('gpiozero', { LED, PWMLED, Buzzer, Button, Servo, AngularServo: Servo, Motor, DistanceSensor, RGBLED }));
}

/** Physical header pin → BCM GPIO number (40-pin header). */
const BOARD_TO_BCM: Record<number, number> = { 3: 2, 5: 3, 7: 4, 8: 14, 10: 15, 11: 17, 12: 18, 13: 27, 15: 22, 16: 23, 18: 24, 19: 10, 21: 9, 22: 25, 23: 11, 24: 8, 26: 7, 27: 0, 28: 1, 29: 5, 31: 6, 32: 12, 33: 13, 35: 19, 36: 16, 37: 26, 38: 20, 40: 21 };

function installRos(rt: PyRt, onRos: (m: RosMessage) => void): void {
  const w = rt.world;
  let inited = false;
  const msgClass = (pkg: string, name: string, fields: Record<string, () => PyValue>) =>
    nclass(name, {
      __init__: (self, _a, kw) => {
        for (const [k, mk] of Object.entries(fields)) self.dict.set(k, kw[k] ?? mk());
        return null;
      },
    }, {}, { _type: `${pkg}/msg/${name}` });
  const Vector3 = msgClass('geometry_msgs', 'Vector3', { x: () => 0.0, y: () => 0.0, z: () => 0.0 });
  const vec = () => {
    const v = new PyInstance(Vector3);
    v.dict.set('x', 0.0);
    v.dict.set('y', 0.0);
    v.dict.set('z', 0.0);
    return v;
  };
  const Twist = msgClass('geometry_msgs', 'Twist', { linear: vec, angular: vec });
  const StringMsg = msgClass('std_msgs', 'String', { data: () => '' });
  const Int32 = msgClass('std_msgs', 'Int32', { data: () => 0n });
  const Float32 = msgClass('std_msgs', 'Float32', { data: () => 0.0 });
  const Bool = msgClass('std_msgs', 'Bool', { data: () => false });
  const toPlain = (v: PyValue): unknown => {
    if (v instanceof PyInstance) return Object.fromEntries([...v.dict].map(([k, x]) => [k, toPlain(x)]));
    if (typeof v === 'bigint') return Number(v);
    return v;
  };
  const subs: { topic: string; cb: PyValue }[] = [];
  const timers: { periodUs: number; next: number; cb: PyValue; live: boolean }[] = [];
  const Publisher = nclass('Publisher', {
    publish: (self, [msg]) => {
      const m = { t: w.now / 1000, topic: self.native.topic, type: self.native.type, data: toPlain(msg) };
      onRos(m);
      for (const s of subs) if (s.topic === m.topic) rt.softQueue.push(() => rt.call(s.cb, [msg], {}, rt.line));
      w.touch();
      return null;
    },
  });
  // The bench prints with RCUTILS_CONSOLE_OUTPUT_FORMAT="[{severity}] [{name}]: {message}" (no timestamp).
  const Logger = nclass('RcutilsLogger', Object.fromEntries(['info', 'warn', 'warning', 'error', 'debug', 'fatal'].map((lvl) => [lvl, (self: PyInstance, [msg]: PyValue[]) => {
    w.print(`[${lvl === 'warning' ? 'WARN' : lvl.toUpperCase()}] [${self.native.name}]: ${rt.str(msg)}\n`);
    return null;
  }])));
  const Parameter = nclass('Parameter', {}, {
    name: new PyProp((self) => self.native.name),
    value: new PyProp((self) => self.native.value),
  });
  const parameter = (name: string, value: PyValue) => {
    const p = new PyInstance(Parameter);
    p.native = { name, value };
    return p;
  };
  const Node = nclass('Node', {
    __init__: (self, [name]) => {
      if (!inited) throw pyErr('RuntimeError', 'rclpy.init() must be called before creating a Node');
      self.native = { name: String(name), params: new Map<string, PyValue>() };
      return null;
    },
    declare_parameter: (self, [name, value]) => {
      const key = rt.str(name);
      if (self.native.params.has(key)) throw pyErr('RuntimeError', `parameter '${key}' has already been declared`);
      self.native.params.set(key, value ?? null);
      return parameter(key, value ?? null);
    },
    get_parameter: (self, [name]) => {
      const key = rt.str(name);
      if (!self.native.params.has(key)) throw pyErr('RuntimeError', `parameter '${key}' is not declared: call declare_parameter first`);
      return parameter(key, self.native.params.get(key) ?? null);
    },
    has_parameter: (self, [name]) => self.native.params.has(rt.str(name)),
    create_publisher: (_self, [type, topic]) => {
      const p = new PyInstance(Publisher);
      p.native = { topic: String(topic).startsWith('/') ? String(topic) : '/' + String(topic), type: type instanceof PyClass ? String(type.dict.get('_type') ?? type.name) : 'msg' };
      return p;
    },
    create_subscription: (_self, [, topic, cb]) => {
      subs.push({ topic: String(topic).startsWith('/') ? String(topic) : '/' + String(topic), cb });
      return null;
    },
    create_timer: (_self, [period, cb]) => {
      const periodUs = toNum(period) * 1e6;
      const t = { periodUs, next: w.now + periodUs, cb, live: true };
      timers.push(t);
      return null;
    },
    get_logger: (self) => {
      const l = new PyInstance(Logger);
      l.native = { name: self.native?.name ?? 'node' };
      return l;
    },
    get_name: (self) => self.native.name,
    destroy_node: () => { timers.forEach((t) => (t.live = false)); return null; },
  });
  const spinGen = function* (once: boolean, timeoutUs: number): Gen<null> {
    const deadline = w.now + timeoutUs;
    while (true) {
      const live = timers.filter((t) => t.live);
      const next = Math.min(...live.map((t) => t.next), deadline);
      if (next === Infinity) {
        yield Infinity;
        continue;
      }
      if (next > w.now) yield next;
      for (const t of live) {
        if (t.next <= w.now) {
          t.next += t.periodUs;
          yield* rt.call(t.cb, [], {}, rt.line);
          if (once) return null;
        }
      }
      if (w.now >= deadline) return null;
    }
  };
  const timeoutOf = (v: PyValue | undefined) => (v === undefined || v === null ? Infinity : toNum(v) * 1e6);
  // One process, one callback queue: every executor runs the same timers and subscriptions in order.
  const executor = (name: string) => {
    const cls = nclass(name, {
      __init__: () => null,
      add_node: () => null,
      remove_node: () => null,
      shutdown: () => { timers.forEach((t) => (t.live = false)); return null; },
    });
    cls.dict.set('spin', natGen('spin', () => spinGen(false, Infinity)));
    cls.dict.set('spin_once', natGen('spin_once', (a, kw) => spinGen(true, timeoutOf(kw.timeout_sec ?? a[1]))));
    return cls;
  };
  rt.modules.set('rclpy', () => mod('rclpy', {
    init: nat('init', () => { inited = true; return null; }),
    ok: nat('ok', () => inited),
    shutdown: nat('shutdown', () => { inited = false; return null; }),
    try_shutdown: nat('try_shutdown', () => { inited = false; return null; }),
    spin: natGen('spin', () => spinGen(false, Infinity)),
    spin_once: natGen('spin_once', (_a, kw) => spinGen(true, timeoutOf(kw.timeout_sec))),
  }));
  rt.modules.set('rclpy.node', () => mod('rclpy.node', { Node }));
  rt.modules.set('rclpy.executors', () => mod('rclpy.executors', { SingleThreadedExecutor: executor('SingleThreadedExecutor'), MultiThreadedExecutor: executor('MultiThreadedExecutor') }));
  rt.modules.set('geometry_msgs', () => mod('geometry_msgs', {}));
  rt.modules.set('geometry_msgs.msg', () => mod('geometry_msgs.msg', { Twist, Vector3 }));
  rt.modules.set('std_msgs', () => mod('std_msgs', {}));
  rt.modules.set('std_msgs.msg', () => mod('std_msgs.msg', { String: StringMsg, Int32, Float32, Bool }));
}
