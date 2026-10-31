import { InterpError, didYouMean, type DiagnosticCode, type SourcePos } from '../errors';
import { Exec, PREEMPT, type Gen, type Program } from '../exec';
import { HeapMeter, checkElements, checkString } from '../limits';
import type { World } from '../world';
import { parsePython, type PExpr, type PParam, type PStmt } from './parser';

/** A Python value: None is null, bool is boolean, int is bigint, float is number, str is string, the rest are Py* objects. */
// Python is dynamically typed, so values are checked at run time (typeName, isInt) rather than by TypeScript.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PyValue = any;

// Values ---------------------------------------------------------------------------
// int → bigint, float → number, bool → boolean, None → null, str → string.

export class PyList {
  constructor(public items: PyValue[]) {}
}
export class PyTuple {
  constructor(public items: PyValue[]) {}
}
export class PyBytes {
  constructor(public data: number[]) {}
}
export class PyDict {
  map = new Map<string, [PyValue, PyValue]>();
  get(k: PyValue): PyValue {
    return this.map.get(hashKey(k))?.[1];
  }
  has(k: PyValue): boolean {
    return this.map.has(hashKey(k));
  }
  set(k: PyValue, v: PyValue): void {
    this.map.set(hashKey(k), [k, v]);
  }
  delete(k: PyValue): boolean {
    return this.map.delete(hashKey(k));
  }
  keys(): PyValue[] {
    return [...this.map.values()].map((e) => e[0]);
  }
}
export class PyRange {
  constructor(public start: bigint, public stop: bigint, public step: bigint) {}
}
export class PyClass {
  mro: PyClass[];
  constructor(public name: string, public bases: PyClass[], public dict: Map<string, PyValue>) {
    const seen = new Set<PyClass>();
    this.mro = [this];
    const walk = (c: PyClass) => {
      for (const b of c.bases) {
        if (!seen.has(b)) {
          seen.add(b);
          this.mro.push(b);
          walk(b);
        }
      }
    };
    walk(this);
  }
  lookup(name: string): PyValue {
    for (const c of this.mro) if (c.dict.has(name)) return c.dict.get(name);
    return undefined;
  }
  isSub(other: PyClass): boolean {
    return this.mro.includes(other);
  }
}
export class PyInstance {
  dict = new Map<string, PyValue>();
  /** State for native classes (Pin, Node...). */
  native: PyValue = null;
  constructor(public cls: PyClass) {}
}
export class PyFunc {
  cls: PyClass | null = null;
  constructor(
    public name: string,
    public params: PParam[],
    public defaults: PyValue[],
    public body: PStmt[] | null,
    public closure: Scope,
    public expr: PExpr | null,
    public locals: Set<string>,
    public globalsDecl: Set<string>,
    public nonlocalsDecl: Set<string>,
  ) {}
}
export type NativeFn = (args: PyValue[], kw: Record<string, PyValue>, self?: PyValue) => PyValue;
export class PyNative {
  constructor(public name: string, public fn: NativeFn, public gen = false) {}
}
export class PyBound {
  constructor(public self: PyValue, public fn: PyFunc | PyNative) {}
}
export class PyModule {
  dict = new Map<string, PyValue>();
  constructor(public name: string) {}
}
export class PySuper {
  constructor(public cls: PyClass, public self: PyValue) {}
}

/** A Python exception travelling through the JS stack. */
export class PyRaise {
  constructor(public exc: PyInstance, public pos?: SourcePos) {}
}

export function hashKey(k: PyValue): string {
  if (typeof k === 'bigint') return 'n' + k.toString();
  if (typeof k === 'number') return Number.isInteger(k) ? 'n' + k : 'f' + k;
  if (typeof k === 'boolean') return 'n' + (k ? 1 : 0);
  if (typeof k === 'string') return 's' + k;
  if (k === null) return 'None';
  if (k instanceof PyTuple) return 't(' + k.items.map(hashKey).join(',') + ')';
  if (k instanceof PyList || k instanceof PyDict) throw new TypeError('unhashable');
  return 'o' + objId(k);
}
const ids = new WeakMap<object, number>();
let nextId = 1;
function objId(o: object): number {
  let id = ids.get(o);
  if (!id) {
    id = nextId++;
    ids.set(o, id);
  }
  return id;
}

// Scopes -------------------------------------------------------------------------------

export class Scope {
  vars = new Map<string, PyValue>();
  constructor(
    public parent: Scope | null,
    public globals: Scope | null,
    public fn: PyFunc | null,
  ) {}
}

type Sig = 0 | 1 | 2 | 3;
interface Frame {
  scope: Scope;
  ret: PyValue;
}

// Exceptions -------------------------------------------------------------------------

const exc = (name: string, base: PyClass | null) => new PyClass(name, base ? [base] : [], new Map());
export const BaseException = exc('BaseException', null);
export const Exception = exc('Exception', BaseException);
export const EXC: Record<string, PyClass> = { BaseException, Exception, KeyboardInterrupt: exc('KeyboardInterrupt', BaseException), SystemExit: exc('SystemExit', BaseException) };
for (const n of ['ValueError', 'TypeError', 'NameError', 'AttributeError', 'RuntimeError', 'ZeroDivisionError', 'AssertionError', 'ImportError', 'StopIteration', 'NotImplementedError', 'OverflowError', 'MemoryError']) EXC[n] = exc(n, Exception);
EXC.LookupError = exc('LookupError', Exception);
EXC.KeyError = exc('KeyError', EXC.LookupError);
EXC.IndexError = exc('IndexError', EXC.LookupError);
EXC.OSError = exc('OSError', Exception);
EXC.TimeoutError = exc('TimeoutError', EXC.OSError);
EXC.UnboundLocalError = exc('UnboundLocalError', EXC.NameError);
EXC.ModuleNotFoundError = exc('ModuleNotFoundError', EXC.ImportError);
EXC.RecursionError = exc('RecursionError', EXC.RuntimeError);

export function pyErr(cls: string, msg: string, code?: DiagnosticCode): PyRaise {
  const e = new PyInstance(EXC[cls] ?? Exception);
  e.dict.set('args', new PyTuple([msg]));
  if (code) e.dict.set('code', code);
  return new PyRaise(e);
}

// Conversions --------------------------------------------------------------------------

export const isInt = (v: PyValue): v is bigint | boolean => typeof v === 'bigint' || typeof v === 'boolean';
export const toBig = (v: PyValue): bigint => (typeof v === 'boolean' ? (v ? 1n : 0n) : (v as bigint));
export function toNum(v: PyValue): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'boolean') return v ? 1 : 0;
  throw pyErr('TypeError', `expected a number, got ${typeName(v)}`);
}
export const I = (n: number): bigint => BigInt(Math.trunc(n));

export function typeName(v: PyValue): string {
  if (v === null) return 'NoneType';
  if (typeof v === 'bigint') return 'int';
  if (typeof v === 'number') return 'float';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'string') return 'str';
  if (v instanceof PyList) return 'list';
  if (v instanceof PyTuple) return 'tuple';
  if (v instanceof PyDict) return 'dict';
  if (v instanceof PyBytes) return 'bytes';
  if (v instanceof PyRange) return 'range';
  if (v instanceof PyInstance) return v.cls.name;
  if (v instanceof PyFunc || v instanceof PyNative || v instanceof PyBound) return 'function';
  if (v instanceof PyClass) return 'type';
  if (v instanceof PyModule) return 'module';
  return 'object';
}

export function truthy(v: PyValue): boolean {
  if (v === null || v === false) return false;
  if (v === true) return true;
  if (typeof v === 'bigint') return v !== 0n;
  if (typeof v === 'number') return v !== 0 && !Number.isNaN(v);
  if (typeof v === 'string') return v.length > 0;
  if (v instanceof PyList || v instanceof PyTuple) return v.items.length > 0;
  if (v instanceof PyDict) return v.map.size > 0;
  if (v instanceof PyBytes) return v.data.length > 0;
  if (v instanceof PyRange) return rangeLen(v) > 0;
  return true;
}

export function floatRepr(x: number): string {
  if (Number.isNaN(x)) return 'nan';
  if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
  if (Number.isInteger(x) && Math.abs(x) < 1e16) return x.toFixed(1);
  let s = String(x);
  s = s.replace(/e([+-])(\d)$/, 'e$10$2');
  return s;
}

function rangeLen(r: PyRange): number {
  const n = Number((r.stop - r.start + r.step + (r.step > 0n ? -1n : 1n)) / r.step);
  return Math.max(0, n);
}

// Interpreter -------------------------------------------------------------------------------

const MAX_DEPTH = 100;

/** Python subset interpreter: generator-based statements on the shared virtual clock. */
/** Where the names beginners forget to import come from. */
const IMPORT_HINTS: Record<string, string> = {
  Pin: 'machine', PWM: 'machine', ADC: 'machine', I2C: 'machine', Timer: 'machine', UART: 'machine',
  sleep_ms: 'time', ticks_ms: 'time', display: 'microbit', button_a: 'microbit', button_b: 'microbit', Image: 'microbit',
  LED: 'gpiozero', Button: 'gpiozero', PWMLED: 'gpiozero', Servo: 'gpiozero', Motor: 'gpiozero', DistanceSensor: 'gpiozero',
  Node: 'rclpy.node', Twist: 'geometry_msgs.msg', pause: 'signal',
};

export class PyRt extends Exec {
  readonly builtins = new Map<string, PyValue>();
  readonly modules = new Map<string, () => PyModule>();
  private loaded = new Map<string, PyModule>();
  readonly globals = new Scope(null, null, null);
  readonly heap = new HeapMeter();
  private body: PStmt[];
  depth = 0;
  /** Current line, for tracebacks. */
  line: SourcePos = { line: 0, col: 0 };
  /** Called with a Python value to get its str() (used by print). */
  constructor(world: World, source: string, opUs: number) {
    super(world, opUs);
    this.body = parsePython(source);
    this.globals.globals = this.globals;
    this.globals.vars.set('__name__', '__main__');
  }

  *program(): Program {
    try {
      yield* this.block(this.body, { scope: this.globals, ret: null });
    } catch (e) {
      throw this.toInterpError(e);
    }
  }

  toInterpError(e: unknown): unknown {
    if (e instanceof PyRaise) {
      const name = e.exc.cls.name;
      const msg = excMessage(e.exc);
      const p = e.pos ?? this.line;
      const hint = name === 'NameError' ? (e.exc.dict.get('hint') as string | undefined) : name === 'KeyboardInterrupt' ? undefined : undefined;
      const code = e.exc.dict.get('code') as DiagnosticCode | undefined;
      return new InterpError('runtime', `${name}${msg ? `: ${msg}` : ''}`, p, hint, code && { code });
    }
    return e;
  }

  // Modules ----------------------------------------------------------------------------

  importModule(name: string, p: SourcePos): PyModule {
    const hit = this.loaded.get(name);
    if (hit) return hit;
    const make = this.modules.get(name);
    if (!make) {
      const near = didYouMean(name, this.modules.keys());
      const r = pyErr('ImportError', `no module named '${name}'`);
      r.pos = p;
      r.exc.dict.set('hint', near ? `did you mean '${near}'?` : undefined);
      throw near ? new InterpError('runtime', `ImportError: no module named '${name}'`, p, `did you mean '${near}'?`) : r;
    }
    const m = make();
    this.loaded.set(name, m);
    return m;
  }

  // Statements ---------------------------------------------------------------------------

  *block(body: PStmt[], f: Frame): Gen<Sig> {
    for (const s of body) {
      if (this.tick()) yield PREEMPT;
      this.line = s.p;
      const sig = yield* this.stmt(s, f);
      if (sig) return sig;
    }
    return 0;
  }

  private *loopBody(body: PStmt[], f: Frame): Gen<Sig> {
    const w = this.world;
    const v0 = w.version;
    const fx0 = this.fx;
    const fc0 = this.fineClock;
    const t0 = w.now;
    const sig = yield* this.block(body, f);
    if (w.version === v0 && this.fx === fx0 && w.now - t0 < 1000) this.idle(this.fineClock !== fc0);
    if (this.tick()) yield PREEMPT;
    return sig;
  }

  *stmt(s: PStmt, f: Frame): Gen<Sig> {
    switch (s.k) {
      case 'expr':
        yield* this.evalG(s.e, f);
        return 0;
      case 'assign': {
        const v = yield* this.evalG(s.v, f);
        for (const t of s.targets) this.assign(t, v, f);
        return 0;
      }
      case 'aug': {
        const cur = this.eval(s.t, f);
        const rhs = yield* this.evalG(s.v, f);
        let v: PyValue;
        if (s.op === '+' && cur instanceof PyList) {
          cur.items.push(...this.iter(rhs));
          v = cur;
          this.fx++;
        } else v = this.binop(s.op, cur, rhs, s.p);
        this.assign(s.t, v, f);
        return 0;
      }
      case 'if': {
        if (truthy(this.eval(s.c, f))) return yield* this.block(s.a, f);
        if (s.b) return yield* this.block(s.b, f);
        return 0;
      }
      case 'while': {
        while (truthy(this.eval(s.c, f))) {
          const sig = yield* this.loopBody(s.body, f);
          if (sig === 1) return 0;
          if (sig === 3) return 3;
        }
        if (s.orelse) return yield* this.block(s.orelse, f);
        return 0;
      }
      case 'for': {
        const it = this.eval(s.iter, f);
        for (const v of this.iter(it)) {
          this.assign(s.t, v, f);
          const sig = yield* this.loopBody(s.body, f);
          if (sig === 1) return 0;
          if (sig === 3) return 3;
        }
        if (s.orelse) return yield* this.block(s.orelse, f);
        return 0;
      }
      case 'def': {
        let fn: PyValue = this.makeFunc(s.name, s.params, s.body, null, f);
        for (const d of [...s.decorators].reverse()) fn = this.callSync(this.eval(d, f), [fn], {}, s.p);
        this.setName(s.name, fn, f.scope);
        return 0;
      }
      case 'class': {
        const bases = s.bases.map((b) => {
          const c = this.eval(b, f);
          if (!(c instanceof PyClass)) throw this.err('TypeError', `a class can only inherit from a class, not ${typeName(c)}`, b.p);
          return c;
        });
        const cs = new Scope(f.scope, f.scope.globals, null);
        yield* this.block(s.body, { scope: cs, ret: null });
        const cls = new PyClass(s.name, bases.length ? bases : [], cs.vars);
        for (const v of cs.vars.values()) if (v instanceof PyFunc) v.cls = cls;
        this.setName(s.name, cls, f.scope);
        return 0;
      }
      case 'return':
        f.ret = s.v ? yield* this.evalG(s.v, f) : null;
        return 3;
      case 'pass':
        return 0;
      case 'break':
        return 1;
      case 'continue':
        return 2;
      case 'import':
        for (const n of s.names) {
          const m = this.importModule(n.mod, s.p);
          if (n.as) this.setName(n.as, m, f.scope);
          else {
            const top = n.mod.split('.')[0];
            this.setName(top, n.mod.includes('.') ? this.importModule(top, s.p) : m, f.scope);
          }
        }
        return 0;
      case 'from': {
        const m = this.importModule(s.mod, s.p);
        for (const n of s.names) {
          if (n.name === '*') {
            for (const [k, v] of m.dict) if (!k.startsWith('_')) this.setName(k, v, f.scope);
            continue;
          }
          let v = m.dict.get(n.name);
          if (v === undefined && this.modules.has(`${s.mod}.${n.name}`)) v = this.importModule(`${s.mod}.${n.name}`, s.p);
          if (v === undefined) {
            const near = didYouMean(n.name, m.dict.keys());
            throw new InterpError('runtime', `ImportError: cannot import name '${n.name}' from '${s.mod}'`, s.p, near ? `did you mean '${near}'?` : undefined);
          }
          this.setName(n.as ?? n.name, v, f.scope);
        }
        return 0;
      }
      case 'global':
        return 0;
      case 'try': {
        let sig: Sig = 0;
        try {
          try {
            sig = yield* this.block(s.body, f);
          } catch (e) {
            const r = this.asRaise(e);
            if (!r) throw e;
            let handled = false;
            for (const h of s.handlers) {
              if (h.type) {
                const t = this.eval(h.type, f);
                const types = t instanceof PyTuple ? t.items : [t];
                if (!types.some((c) => c instanceof PyClass && r.exc.cls.isSub(c))) continue;
              }
              if (h.name) this.setName(h.name, r.exc, f.scope);
              handled = true;
              sig = yield* this.block(h.body, f);
              break;
            }
            if (!handled) throw r;
            return sig;
          }
          if (s.orelse && sig === 0) sig = yield* this.block(s.orelse, f);
        } finally {
          if (s.fin) {
            const fs = yield* this.block(s.fin, f);
            if (fs) sig = fs;
          }
        }
        return sig;
      }
      case 'raise': {
        if (!s.e) throw this.err('RuntimeError', 'No active exception to reraise', s.p);
        let v = this.eval(s.e, f);
        if (v instanceof PyClass) v = this.callSync(v, [], {}, s.p);
        if (!(v instanceof PyInstance) || !v.cls.isSub(BaseException)) throw this.err('TypeError', 'exceptions must derive from BaseException', s.p);
        throw new PyRaise(v, s.p);
      }
      case 'assert':
        if (!truthy(this.eval(s.c, f))) throw this.err('AssertionError', s.msg ? this.str(this.eval(s.msg, f)) : '', s.p);
        return 0;
      case 'del':
        for (const t of s.targets) {
          if (t.k === 'name') f.scope.vars.delete(t.id);
          else if (t.k === 'sub') {
            const o = this.eval(t.a, f);
            const k = this.eval(t.i, f);
            if (o instanceof PyDict) o.delete(k);
            else if (o instanceof PyList) o.items.splice(this.index(o.items.length, k, t.p), 1);
          }
        }
        return 0;
      case 'with': {
        const ctx = this.eval(s.ctx, f);
        const enter = this.getAttr(ctx, '__enter__', s.p, true);
        const v = enter !== undefined ? this.callSync(enter, [], {}, s.p) : ctx;
        if (s.as) this.assign(s.as, v, f);
        try {
          return yield* this.block(s.body, f);
        } finally {
          const exit = this.getAttr(ctx, '__exit__', s.p, true);
          if (exit !== undefined) this.callSync(exit, [null, null, null], {}, s.p);
        }
      }
    }
  }

  private asRaise(e: unknown): PyRaise | null {
    if (e instanceof PyRaise) return e;
    if (e instanceof InterpError) return null;
    if (e instanceof RangeError) return pyErr('RecursionError', 'maximum recursion depth exceeded');
    return null;
  }

  /** Refuses a string past the cap and meters the big ones. */
  textSize(len: number, p?: SourcePos): void {
    checkString(len, p);
    this.heap.chargeText(len, 'this string', p);
  }

  /** Refuses a list or tuple past the cap and meters the big ones. */
  listSize(n: number, p?: SourcePos): void {
    checkElements(n, 'list size', p);
    this.heap.chargeItems(n, 'this list', p);
  }

  err(cls: string, msg: string, p?: SourcePos): PyRaise {
    const r = pyErr(cls, msg);
    r.pos = p ?? this.line;
    return r;
  }

  private setName(name: string, v: PyValue, scope: Scope): void {
    const fn = scope.fn;
    let target = scope;
    if (fn?.globalsDecl.has(name)) target = scope.globals!;
    else if (fn?.nonlocalsDecl.has(name)) {
      let s = scope.parent;
      while (s && !s.vars.has(name)) s = s.parent;
      if (s) target = s;
    }
    const old = target.vars.get(name);
    if (old !== v) {
      target.vars.set(name, v);
      this.fx++;
    }
  }

  assign(t: PExpr, v: PyValue, f: Frame): void {
    switch (t.k) {
      case 'name':
        this.setName(t.id, v, f.scope);
        return;
      case 'attr': {
        const o = this.eval(t.a, f);
        this.setAttr(o, t.name, v, t.p);
        return;
      }
      case 'sub': {
        const o = this.eval(t.a, f);
        const k = this.eval(t.i, f);
        if (o instanceof PyList) {
          const i = this.index(o.items.length, k, t.p);
          if (o.items[i] !== v) this.fx++;
          o.items[i] = v;
        } else if (o instanceof PyDict) {
          if (o.get(k) !== v) this.fx++;
          o.set(k, v);
        } else if (o instanceof PyBytes) {
          o.data[this.index(o.data.length, k, t.p)] = Number(toBig(v)) & 255;
          this.fx++;
        } else if (o instanceof PyInstance && o.cls.lookup('__setitem__')) {
          this.callSync(o.cls.lookup('__setitem__'), [o, k, v], {}, t.p);
        } else throw this.err('TypeError', `'${typeName(o)}' object does not support item assignment`, t.p);
        return;
      }
      case 'tuple':
      case 'list': {
        const items = [...this.iter(v)];
        const star = t.items.findIndex((x) => x.k === 'star');
        if (star < 0) {
          if (items.length !== t.items.length) throw this.err('ValueError', `${items.length > t.items.length ? 'too many' : 'not enough'} values to unpack (expected ${t.items.length}, got ${items.length})`, t.p);
          t.items.forEach((x, i) => this.assign(x, items[i], f));
        } else {
          const after = t.items.length - star - 1;
          t.items.slice(0, star).forEach((x, i) => this.assign(x, items[i], f));
          this.assign((t.items[star] as { a: PExpr }).a, new PyList(items.slice(star, items.length - after)), f);
          t.items.slice(star + 1).forEach((x, i) => this.assign(x, items[items.length - after + i], f));
        }
        return;
      }
    }
    throw this.err('SyntaxError', 'cannot assign to this', t.p);
  }

  // Functions ----------------------------------------------------------------------------

  private makeFunc(name: string, params: PParam[], body: PStmt[] | null, expr: PExpr | null, f: Frame): PyFunc {
    const defaults = params.map((p) => (p.def ? this.eval(p.def, f) : undefined));
    const locals = new Set<string>();
    const g = new Set<string>();
    const nl = new Set<string>();
    if (body) collectLocals(body, locals, g, nl);
    for (const p of params) locals.add(p.name);
    return new PyFunc(name, params, defaults, body, f.scope, expr, locals, g, nl);
  }

  /** Call any callable; generator so user code may sleep. */
  *call(fn: PyValue, args: PyValue[], kw: Record<string, PyValue>, p: SourcePos): Gen<PyValue> {
    if (fn instanceof PyBound) {
      return yield* this.call(fn.fn, [fn.self, ...args], kw, p);
    }
    if (fn instanceof PyNative) {
      try {
        if (fn.gen) return yield* (fn.fn(args, kw) as Gen<PyValue>);
        return fn.fn(args, kw);
      } catch (e) {
        if (e instanceof PyRaise && !e.pos) e.pos = p;
        throw e;
      }
    }
    if (fn instanceof PyFunc) {
      const scope = new Scope(fn.closure, fn.closure.globals ?? this.globals, fn);
      this.bindArgs(fn, args, kw, scope, p);
      if (++this.depth > MAX_DEPTH) {
        this.depth = 0;
        throw this.err('RecursionError', 'maximum recursion depth exceeded', p);
      }
      try {
        if (fn.expr) return this.eval(fn.expr, { scope, ret: null });
        const fr: Frame = { scope, ret: null };
        yield* this.block(fn.body!, fr);
        return fr.ret;
      } finally {
        this.depth--;
      }
    }
    if (fn instanceof PyClass) {
      const inst = new PyInstance(fn);
      if (fn.isSub(BaseException)) inst.dict.set('args', new PyTuple(args));
      const init = fn.lookup('__init__');
      if (init !== undefined) {
        const r = yield* this.call(init, [inst, ...args], kw, p);
        if (r instanceof PyInstance && r !== inst && r.cls === fn) return r;
      } else if (args.length && !fn.isSub(BaseException)) throw this.err('TypeError', `${fn.name}() takes no arguments`, p);
      return inst;
    }
    if (fn instanceof PyInstance) {
      const c = fn.cls.lookup('__call__');
      if (c !== undefined) return yield* this.call(c, [fn, ...args], kw, p);
    }
    throw this.err('TypeError', `'${typeName(fn)}' object is not callable`, p);
  }

  callSync(fn: PyValue, args: PyValue[], kw: Record<string, PyValue>, p: SourcePos): PyValue {
    return this.runSync(this.call(fn, args, kw, p));
  }

  private bindArgs(fn: PyFunc, args: PyValue[], kw: Record<string, PyValue>, scope: Scope, p: SourcePos): void {
    const ps = fn.params;
    let ai = 0;
    for (let i = 0; i < ps.length; i++) {
      const prm = ps[i];
      if (prm.star === '*') {
        scope.vars.set(prm.name, new PyTuple(args.slice(ai)));
        ai = args.length;
        continue;
      }
      if (prm.star === '**') {
        const d = new PyDict();
        for (const [k, v] of Object.entries(kw)) if (!ps.some((q) => q.name === k)) d.set(k, v);
        scope.vars.set(prm.name, d);
        continue;
      }
      if (ai < args.length) scope.vars.set(prm.name, args[ai++]);
      else if (prm.name in kw) scope.vars.set(prm.name, kw[prm.name]);
      else if (fn.defaults[i] !== undefined) scope.vars.set(prm.name, fn.defaults[i]);
      else {
        const shown = ps[0]?.name === 'self' ? i : i + 1;
        throw this.err('TypeError', `${fn.name}() missing required argument '${prm.name}'${shown ? '' : ''}`, p);
      }
    }
    if (ai < args.length) {
      const n = ps.filter((x) => !x.star).length;
      throw this.err('TypeError', `${fn.name}() takes ${n} positional argument${n === 1 ? '' : 's'} but ${args.length} were given`, p);
    }
    for (const k of Object.keys(kw)) if (!ps.some((q) => q.name === k) && !ps.some((q) => q.star === '**')) throw this.err('TypeError', `${fn.name}() got an unexpected keyword argument '${k}'`, p);
  }

  // Expressions ---------------------------------------------------------------------------

  /** Evaluate where a call may sleep (statement level): yields instead of blocking. */
  *evalG(e: PExpr, f: Frame): Gen<PyValue> {
    if (e.k === 'call') {
      const fn = this.eval(e.fn, f);
      const { args, kw } = this.args(e, f);
      return yield* this.call(fn, args, kw, e.p);
    }
    return this.eval(e, f);
  }

  private args(e: Extract<PExpr, { k: 'call' }>, f: Frame): { args: PyValue[]; kw: Record<string, PyValue> } {
    const args = e.args.map((a) => this.eval(a, f));
    if (e.star) args.push(...this.iter(this.eval(e.star, f)));
    const kw: Record<string, PyValue> = {};
    for (const k of e.kw) kw[k.name] = this.eval(k.v, f);
    return { args, kw };
  }

  lookup(name: string, f: Frame, p: SourcePos): PyValue {
    let s: Scope | null = f.scope;
    while (s) {
      const v = s.vars.get(name);
      if (v !== undefined || s.vars.has(name)) return v;
      if (s.fn && s.fn.locals.has(name) && !s.fn.globalsDecl.has(name) && !s.fn.nonlocalsDecl.has(name) && s === f.scope) {
        throw this.err('UnboundLocalError', `local variable '${name}' referenced before assignment`, p);
      }
      s = s.parent;
    }
    const g = this.globals.vars.get(name);
    if (g !== undefined || this.globals.vars.has(name)) return g;
    const b = this.builtins.get(name);
    if (b !== undefined) return b;
    const names = new Set<string>([...this.globals.vars.keys(), ...this.builtins.keys()]);
    for (let sc: Scope | null = f.scope; sc; sc = sc.parent) for (const k of sc.vars.keys()) names.add(k);
    const r = this.err('NameError', `name '${name}' isn't defined`, p);
    const from = IMPORT_HINTS[name];
    const near = from ? null : didYouMean(name, names);
    if (from) r.exc.dict.set('hint', `import it first: from ${from} import ${name}`);
    else if (near) r.exc.dict.set('hint', `did you mean '${near}'?`);
    throw r;
  }

  eval(e: PExpr, f: Frame): PyValue {
    switch (e.k) {
      case 'const':
        return e.v;
      case 'name':
        return this.lookup(e.id, f, e.p);
      case 'fstr': {
        let s = '';
        for (const part of e.parts) {
          if ('lit' in part) s += part.lit;
          else {
            let v = this.eval(part.e, f);
            if (part.conv === 'r') v = this.repr(v);
            s += part.spec ? this.format(v, part.spec, e.p) : this.str(v);
          }
        }
        return s;
      }
      case 'list':
        return new PyList(this.items(e.items, f));
      case 'tuple':
        return new PyTuple(this.items(e.items, f));
      case 'set':
        return new PyList(dedupe(this.items(e.items, f)));
      case 'dict': {
        const d = new PyDict();
        e.keys.forEach((k, i) => d.set(this.eval(k, f), this.eval(e.values[i], f)));
        return d;
      }
      case 'comp':
        return this.comp(e, f);
      case 'bin':
        return this.binop(e.op, this.eval(e.a, f), this.eval(e.b, f), e.p);
      case 'un': {
        const v = this.eval(e.a, f);
        if (e.op === 'not') return !truthy(v);
        if (e.op === '-') return isInt(v) ? -toBig(v) : typeof v === 'number' ? -v : this.dunder(v, '__neg__', [], e.p);
        if (e.op === '+') return isInt(v) ? toBig(v) : v;
        if (isInt(v)) return ~toBig(v);
        throw this.err('TypeError', `bad operand type for unary ~: '${typeName(v)}'`, e.p);
      }
      case 'bool': {
        const a = this.eval(e.a, f);
        if (e.op === 'and') return truthy(a) ? this.eval(e.b, f) : a;
        return truthy(a) ? a : this.eval(e.b, f);
      }
      case 'cmp': {
        let left = this.eval(e.items[0], f);
        for (let i = 0; i < e.ops.length; i++) {
          const right = this.eval(e.items[i + 1], f);
          if (!this.compare(e.ops[i], left, right, e.p)) return false;
          left = right;
        }
        return true;
      }
      case 'ifexp':
        return truthy(this.eval(e.c, f)) ? this.eval(e.a, f) : this.eval(e.b, f);
      case 'call': {
        if (e.fn.k === 'name' && e.fn.id === 'super' && !e.args.length) {
          const fn = f.scope.fn;
          if (!fn?.cls) throw this.err('RuntimeError', 'super(): no arguments', e.p);
          const self = f.scope.vars.get(fn.params[0]?.name ?? 'self');
          return new PySuper(fn.cls, self);
        }
        const fn = this.eval(e.fn, f);
        const { args, kw } = this.args(e, f);
        return this.callSync(fn, args, kw, e.p);
      }
      case 'attr':
        return this.getAttr(this.eval(e.a, f), e.name, e.p);
      case 'sub':
        return this.subscript(this.eval(e.a, f), e.i, f, e.p);
      case 'slice':
        throw this.err('SyntaxError', 'a slice is only allowed inside [ ]', e.p);
      case 'lambda':
        return this.makeFunc('<lambda>', e.params, null, e.body, f);
      case 'star':
        throw this.err('SyntaxError', "can't use starred expression here", e.p);
    }
  }

  private items(es: PExpr[], f: Frame): PyValue[] {
    const out: PyValue[] = [];
    for (const x of es) {
      if (x.k === 'star') out.push(...this.iter(this.eval(x.a, f)));
      else out.push(this.eval(x, f));
    }
    return out;
  }

  private comp(e: Extract<PExpr, { k: 'comp' }>, f: Frame): PyValue {
    const scope = new Scope(f.scope, f.scope.globals, null);
    const fr: Frame = { scope, ret: null };
    const out: PyValue[] = [];
    const d = new PyDict();
    const loop = (gi: number): void => {
      if (gi === e.gens.length) {
        if (e.kind === 'dict') d.set(this.eval(e.elt, fr), this.eval(e.val!, fr));
        else out.push(this.eval(e.elt, fr));
        return;
      }
      const g = e.gens[gi];
      for (const v of this.iter(this.eval(g.iter, gi === 0 ? f : fr))) {
        this.assign(g.target, v, fr);
        if (g.ifs.every((c) => truthy(this.eval(c, fr)))) loop(gi + 1);
      }
    };
    loop(0);
    if (e.kind === 'dict') return d;
    return new PyList(e.kind === 'set' ? dedupe(out) : out);
  }

  index(len: number, k: PyValue, p: SourcePos, what = 'list'): number {
    if (!isInt(k)) throw this.err('TypeError', `${what} indices must be integers, not ${typeName(k)}`, p);
    let i = Number(toBig(k));
    if (i < 0) i += len;
    if (i < 0 || i >= len) throw this.err('IndexError', `${what} index out of range`, p);
    return i;
  }

  private subscript(o: PyValue, ie: PExpr, f: Frame, p: SourcePos): PyValue {
    if (ie.k === 'slice') {
      const lo = ie.lo ? this.eval(ie.lo, f) : null;
      const hi = ie.hi ? this.eval(ie.hi, f) : null;
      const st = ie.step ? this.eval(ie.step, f) : null;
      const seq = typeof o === 'string' ? [...o] : o instanceof PyList || o instanceof PyTuple ? o.items : o instanceof PyBytes ? o.data : null;
      if (!seq) throw this.err('TypeError', `'${typeName(o)}' object is not subscriptable`, p);
      const r = sliceIdx(seq.length, lo, hi, st);
      const picked = r.map((i) => seq[i]);
      if (typeof o === 'string') return picked.join('');
      if (o instanceof PyTuple) return new PyTuple(picked);
      if (o instanceof PyBytes) return new PyBytes(picked as number[]);
      return new PyList(picked);
    }
    const k = this.eval(ie, f);
    return this.getItem(o, k, p);
  }

  getItem(o: PyValue, k: PyValue, p: SourcePos): PyValue {
    if (o instanceof PyList) return o.items[this.index(o.items.length, k, p)];
    if (o instanceof PyTuple) return o.items[this.index(o.items.length, k, p, 'tuple')];
    if (typeof o === 'string') return o[this.index(o.length, k, p, 'string')];
    if (o instanceof PyBytes) return BigInt(o.data[this.index(o.data.length, k, p, 'bytes')]);
    if (o instanceof PyRange) {
      const n = rangeLen(o);
      return o.start + BigInt(this.index(n, k, p, 'range object')) * o.step;
    }
    if (o instanceof PyDict) {
      if (!o.has(k)) throw this.err('KeyError', this.repr(k), p);
      return o.get(k);
    }
    if (o instanceof PyInstance && o.cls.lookup('__getitem__')) return this.callSync(o.cls.lookup('__getitem__'), [o, k], {}, p);
    throw this.err('TypeError', `'${typeName(o)}' object is not subscriptable`, p);
  }

  *iter(v: PyValue): Generator<PyValue> {
    if (v instanceof PyList || v instanceof PyTuple) {
      yield* v.items.slice();
      return;
    }
    if (typeof v === 'string') {
      yield* v;
      return;
    }
    if (v instanceof PyRange) {
      for (let i = v.start; v.step > 0n ? i < v.stop : i > v.stop; i += v.step) yield i;
      return;
    }
    if (v instanceof PyDict) {
      yield* v.keys();
      return;
    }
    if (v instanceof PyBytes) {
      for (const b of v.data) yield BigInt(b);
      return;
    }
    if (v instanceof PyInstance && v.native && typeof v.native[Symbol.iterator] === 'function') {
      yield* v.native;
      return;
    }
    throw this.err('TypeError', `'${typeName(v)}' object is not iterable`);
  }

  // Attributes -----------------------------------------------------------------------------

  getAttr(o: PyValue, name: string, p: SourcePos, soft = false): PyValue {
    if (o instanceof PyModule) {
      if (o.dict.has(name)) return o.dict.get(name);
      if (this.modules.has(`${o.name}.${name}`)) return this.importModule(`${o.name}.${name}`, p);
    } else if (o instanceof PyInstance) {
      if (o.dict.has(name)) return o.dict.get(name);
      const v = o.cls.lookup(name);
      if (v !== undefined) return v instanceof PyFunc || v instanceof PyNative ? new PyBound(o, v) : v instanceof PyProp ? v.get(o) : v;
      if (name === '__class__') return o.cls;
    } else if (o instanceof PyClass) {
      const v = o.lookup(name);
      if (v !== undefined) return v;
      if (name === '__name__') return o.name;
    } else if (o instanceof PySuper) {
      const mro = (o.self instanceof PyInstance ? o.self.cls : o.cls).mro;
      const start = mro.indexOf(o.cls) + 1;
      for (const c of mro.slice(start)) {
        if (c.dict.has(name)) {
          const v = c.dict.get(name);
          return v instanceof PyFunc || v instanceof PyNative ? new PyBound(o.self, v) : v;
        }
      }
      if (name === '__init__') return new PyNative('__init__', () => null);
    } else {
      const m = this.methodOf(o, name);
      if (m !== undefined) return m;
    }
    if (soft) return undefined;
    const near = o instanceof PyInstance ? didYouMean(name, [...o.dict.keys(), ...o.cls.mro.flatMap((c) => [...c.dict.keys()])]) : o instanceof PyModule ? didYouMean(name, o.dict.keys()) : undefined;
    const r = this.err('AttributeError', `'${o instanceof PyModule ? `module '${o.name}'` : typeName(o)}' object has no attribute '${name}'`.replace("'module '", "module '").replace("'' object", "' object"), p);
    if (near) r.exc.dict.set('hint', `did you mean '${near}'?`);
    if (near) throw new InterpError('runtime', `AttributeError: ${typeName(o) === 'module' ? `module '${(o as PyModule).name}'` : `'${typeName(o)}' object`} has no attribute '${name}'`, p, `did you mean '${near}'?`);
    throw r;
  }

  setAttr(o: PyValue, name: string, v: PyValue, p: SourcePos): void {
    if (o instanceof PyInstance) {
      const prop = o.cls.lookup(name);
      if (prop instanceof PyProp) {
        if (!prop.set) throw this.err('AttributeError', `can't set attribute '${name}'`, p);
        prop.set(o, v);
        this.fx++;
        return;
      }
      if (o.dict.get(name) !== v) this.fx++;
      o.dict.set(name, v);
      return;
    }
    if (o instanceof PyClass || o instanceof PyModule) {
      o.dict.set(name, v);
      return;
    }
    throw this.err('AttributeError', `'${typeName(o)}' object has no attribute '${name}'`, p);
  }

  /** Methods of built-in values (str, list, dict, int...). */
  private methodOf(o: PyValue, name: string): PyValue {
    const nat = (fn: (a: PyValue[], kw: Record<string, PyValue>) => PyValue) => new PyNative(name, fn);
    if (typeof o === 'string') {
      switch (name) {
        case 'upper': return nat(() => o.toUpperCase());
        case 'lower': return nat(() => o.toLowerCase());
        case 'strip': return nat(([c]) => (c ? trimChars(o, c, true, true) : o.trim()));
        case 'lstrip': return nat(([c]) => (c ? trimChars(o, c, true, false) : o.trimStart()));
        case 'rstrip': return nat(([c]) => (c ? trimChars(o, c, false, true) : o.trimEnd()));
        case 'split': return nat(([sep, max]) => new PyList(splitPy(o, sep, max)));
        case 'join': return nat(([it]) => [...this.iter(it)].map((x) => { if (typeof x !== 'string') throw this.err('TypeError', `sequence item: expected str instance, ${typeName(x)} found`); return x; }).join(o));
        case 'replace': return nat(([a, b]) => o.split(a).join(b));
        case 'startswith': return nat(([a]) => o.startsWith(a));
        case 'endswith': return nat(([a]) => o.endsWith(a));
        case 'find': return nat(([a]) => BigInt(o.indexOf(a)));
        case 'index': return nat(([a]) => { const i = o.indexOf(a); if (i < 0) throw this.err('ValueError', 'substring not found'); return BigInt(i); });
        case 'count': return nat(([a]) => BigInt(o.split(a).length - 1));
        case 'isdigit': return nat(() => /^\d+$/.test(o));
        case 'isalpha': return nat(() => /^[A-Za-z]+$/.test(o));
        case 'format': return nat((a, kw) => this.strFormat(o, a, kw));
        case 'zfill': return nat(([n]) => (o.startsWith('-') ? '-' + o.slice(1).padStart(Number(n) - 1, '0') : o.padStart(Number(n), '0')));
        case 'center': return nat(([n, c = ' ']) => { const w = Number(n); const pad = Math.max(0, w - o.length); const l = Math.floor(pad / 2); return c.repeat(l) + o + c.repeat(pad - l); });
        case 'ljust': return nat(([n, c = ' ']) => o.padEnd(Number(n), c));
        case 'rjust': return nat(([n, c = ' ']) => o.padStart(Number(n), c));
        case 'encode': return nat(() => new PyBytes([...o].map((c) => c.charCodeAt(0) & 255)));
      }
    }
    if (o instanceof PyList) {
      const it = o.items;
      const touch = () => this.fx++;
      switch (name) {
        case 'append': return nat(([x]) => { it.push(x); touch(); return null; });
        case 'extend': return nat(([x]) => { it.push(...this.iter(x)); touch(); return null; });
        case 'insert': return nat(([i, x]) => { it.splice(Number(i), 0, x); touch(); return null; });
        case 'pop': return nat(([i]) => { if (!it.length) throw this.err('IndexError', 'pop from empty list'); touch(); return i === undefined ? it.pop() : it.splice(this.index(it.length, i, this.line), 1)[0]; });
        case 'remove': return nat(([x]) => { const i = it.findIndex((y) => this.eq(x, y)); if (i < 0) throw this.err('ValueError', 'list.remove(x): x not in list'); it.splice(i, 1); touch(); return null; });
        case 'index': return nat(([x]) => { const i = it.findIndex((y) => this.eq(x, y)); if (i < 0) throw this.err('ValueError', `${this.repr(x)} is not in list`); return BigInt(i); });
        case 'count': return nat(([x]) => BigInt(it.filter((y) => this.eq(x, y)).length));
        case 'clear': return nat(() => { it.length = 0; touch(); return null; });
        case 'copy': return nat(() => new PyList(it.slice()));
        case 'reverse': return nat(() => { it.reverse(); touch(); return null; });
        case 'sort': return nat((_a, kw) => { this.sortItems(it, kw.key, truthy(kw.reverse ?? false)); touch(); return null; });
      }
    }
    if (o instanceof PyTuple) {
      if (name === 'index') return nat(([x]) => BigInt(o.items.findIndex((y) => this.eq(x, y))));
      if (name === 'count') return nat(([x]) => BigInt(o.items.filter((y) => this.eq(x, y)).length));
    }
    if (o instanceof PyDict) {
      switch (name) {
        case 'get': return nat(([k, d = null]) => (o.has(k) ? o.get(k) : d));
        case 'keys': return nat(() => new PyList(o.keys()));
        case 'values': return nat(() => new PyList([...o.map.values()].map((x) => x[1])));
        case 'items': return nat(() => new PyList([...o.map.values()].map((x) => new PyTuple([x[0], x[1]]))));
        case 'pop': return nat(([k, d]) => { if (!o.has(k)) { if (d !== undefined) return d; throw this.err('KeyError', this.repr(k)); } const v = o.get(k); o.delete(k); this.fx++; return v; });
        case 'update': return nat(([other]) => { if (other instanceof PyDict) for (const [k, v] of other.map.values()) o.set(k, v); this.fx++; return null; });
        case 'setdefault': return nat(([k, d = null]) => { if (!o.has(k)) o.set(k, d); return o.get(k); });
        case 'clear': return nat(() => { o.map.clear(); return null; });
        case 'copy': return nat(() => { const n = new PyDict(); for (const [k, v] of o.map.values()) n.set(k, v); return n; });
      }
    }
    if (typeof o === 'bigint' || typeof o === 'boolean') {
      if (name === 'to_bytes') return nat(([n, order = 'big']) => { const len = Number(n); const v = BigInt.asUintN(len * 8, toBig(o)); const bytes = Array.from({ length: len }, (_, i) => Number((v >> BigInt(8 * i)) & 255n)); return new PyBytes(order === 'big' ? bytes.reverse() : bytes); });
      if (name === 'bit_length') return nat(() => BigInt(toBig(o) === 0n ? 0 : (toBig(o) < 0n ? -toBig(o) : toBig(o)).toString(2).length));
    }
    if (typeof o === 'number' && name === 'is_integer') return nat(() => Number.isInteger(o));
    if (o instanceof PyBytes && name === 'decode') return nat(() => String.fromCharCode(...o.data));
    if (o instanceof PyInstance && o.cls.isSub(BaseException) && name === 'args') return o.dict.get('args');
    return undefined;
  }

  sortItems(it: PyValue[], key: PyValue, reverse: boolean): void {
    const keyed = it.map((v) => [key && key !== null ? this.callSync(key, [v], {}, this.line) : v, v] as const);
    keyed.sort((a, b) => (this.compare('<', a[0], b[0], this.line) ? -1 : this.compare('<', b[0], a[0], this.line) ? 1 : 0));
    if (reverse) keyed.reverse();
    keyed.forEach((k, i) => (it[i] = k[1]));
  }

  private dunder(o: PyValue, name: string, args: PyValue[], p: SourcePos): PyValue {
    if (o instanceof PyInstance) {
      const m = o.cls.lookup(name);
      if (m !== undefined) return this.callSync(m, [o, ...args], {}, p);
    }
    throw this.err('TypeError', `unsupported operand type for ${name.replace(/_/g, '')}: '${typeName(o)}'`, p);
  }

  // Operators -------------------------------------------------------------------------------

  binop(op: string, a: PyValue, b: PyValue, p: SourcePos): PyValue {
    if (isInt(a) && isInt(b)) {
      const x = toBig(a);
      const y = toBig(b);
      switch (op) {
        case '+': return x + y;
        case '-': return x - y;
        case '*': return x * y;
        case '/': if (y === 0n) throw this.err('ZeroDivisionError', 'division by zero', p); return Number(x) / Number(y);
        case '//': { if (y === 0n) throw this.err('ZeroDivisionError', 'integer division by zero', p); const q = x / y; return (x % y !== 0n && (x < 0n) !== (y < 0n)) ? q - 1n : q; }
        case '%': { if (y === 0n) throw this.err('ZeroDivisionError', 'integer modulo by zero', p); const r = x % y; return r !== 0n && (r < 0n) !== (y < 0n) ? r + y : r; }
        case '**': return y >= 0n ? x ** y : Math.pow(Number(x), Number(y));
        case '<<': return x << y;
        case '>>': return x >> y;
        case '&': return x & y;
        case '|': return x | y;
        case '^': return x ^ y;
      }
    }
    if ((typeof a === 'number' || isInt(a)) && (typeof b === 'number' || isInt(b))) {
      const x = toNum(a);
      const y = toNum(b);
      switch (op) {
        case '+': return x + y;
        case '-': return x - y;
        case '*': return x * y;
        case '/': if (y === 0) throw this.err('ZeroDivisionError', 'float division by zero', p); return x / y;
        case '//': if (y === 0) throw this.err('ZeroDivisionError', 'float divmod()', p); return Math.floor(x / y);
        case '%': if (y === 0) throw this.err('ZeroDivisionError', 'float modulo', p); return x - y * Math.floor(x / y);
        case '**': return Math.pow(x, y);
      }
      throw this.err('TypeError', `unsupported operand type(s) for ${op}: 'float' and '${typeName(b)}'`, p);
    }
    if (op === '+') {
      if (typeof a === 'string' && typeof b === 'string') {
        this.textSize(a.length + b.length, p);
        return a + b;
      }
      if (a instanceof PyList && b instanceof PyList) {
        this.listSize(a.items.length + b.items.length, p);
        return new PyList([...a.items, ...b.items]);
      }
      if (a instanceof PyTuple && b instanceof PyTuple) {
        this.listSize(a.items.length + b.items.length, p);
        return new PyTuple([...a.items, ...b.items]);
      }
      if (a instanceof PyBytes && b instanceof PyBytes) return new PyBytes([...a.data, ...b.data]);
      if (typeof a === 'string' || typeof b === 'string') throw this.err('TypeError', `can only concatenate str (not "${typeName(typeof a === 'string' ? b : a)}") to str`, p);
    }
    if (op === '*') {
      const [s, n] = isInt(a) ? [b, a] : [a, b];
      if (isInt(n)) {
        const k = Math.max(0, Number(toBig(n)));
        if (typeof s === 'string') {
          this.textSize(s.length * k, p);
          return s.repeat(k);
        }
        if (s instanceof PyList || s instanceof PyTuple) {
          this.listSize(s.items.length * k, p);
          const items = s.items.length ? Array.from({ length: k }, () => s.items).flat() : [];
          return s instanceof PyList ? new PyList(items) : new PyTuple(items);
        }
      }
    }
    if (op === '%' && typeof a === 'string') return this.percentFormat(a, b instanceof PyTuple ? b.items : [b], p);
    if (a instanceof PyInstance) {
      const name = { '+': '__add__', '-': '__sub__', '*': '__mul__', '/': '__truediv__' }[op];
      if (name && a.cls.lookup(name)) return this.dunder(a, name, [b], p);
    }
    throw this.err('TypeError', `unsupported operand type(s) for ${op}: '${typeName(a)}' and '${typeName(b)}'`, p);
  }

  eq(a: PyValue, b: PyValue): boolean {
    if ((isInt(a) || typeof a === 'number') && (isInt(b) || typeof b === 'number')) {
      if (isInt(a) && isInt(b)) return toBig(a) === toBig(b);
      return toNum(a) === toNum(b);
    }
    if (typeof a === 'string' || typeof b === 'string') return a === b;
    if ((a instanceof PyList && b instanceof PyList) || (a instanceof PyTuple && b instanceof PyTuple)) {
      return a.items.length === b.items.length && a.items.every((x: PyValue, i: number) => this.eq(x, b.items[i]));
    }
    if (a instanceof PyDict && b instanceof PyDict) return a.map.size === b.map.size && [...a.map.entries()].every(([k, [, v]]) => b.map.has(k) && this.eq(v, b.map.get(k)![1]));
    if (a instanceof PyBytes && b instanceof PyBytes) return a.data.join() === b.data.join();
    if (a instanceof PyInstance && a.cls.lookup('__eq__')) return truthy(this.callSync(a.cls.lookup('__eq__'), [a, b], {}, this.line));
    return a === b;
  }

  compare(op: string, a: PyValue, b: PyValue, p: SourcePos): boolean {
    switch (op) {
      case '==': return this.eq(a, b);
      case '!=': return !this.eq(a, b);
      case 'is': return a === b || (a === null && b === null) || (typeof a === 'boolean' && a === b);
      case 'is not': return !(a === b);
      case 'in':
      case 'not in': {
        let r: boolean;
        if (typeof b === 'string') {
          if (typeof a !== 'string') throw this.err('TypeError', "'in <string>' requires string as left operand", p);
          r = b.includes(a);
        } else if (b instanceof PyDict) r = b.has(a);
        else r = [...this.iter(b)].some((x) => this.eq(a, x));
        return op === 'in' ? r : !r;
      }
    }
    const c = this.cmp3(a, b, p);
    return op === '<' ? c < 0 : op === '>' ? c > 0 : op === '<=' ? c <= 0 : c >= 0;
  }

  private cmp3(a: PyValue, b: PyValue, p: SourcePos): number {
    if ((isInt(a) || typeof a === 'number') && (isInt(b) || typeof b === 'number')) {
      if (isInt(a) && isInt(b)) return toBig(a) < toBig(b) ? -1 : toBig(a) > toBig(b) ? 1 : 0;
      const x = toNum(a);
      const y = toNum(b);
      return x < y ? -1 : x > y ? 1 : 0;
    }
    if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
    if ((a instanceof PyList && b instanceof PyList) || (a instanceof PyTuple && b instanceof PyTuple)) {
      for (let i = 0; i < Math.min(a.items.length, b.items.length); i++) {
        const c = this.cmp3(a.items[i], b.items[i], p);
        if (c) return c;
      }
      return a.items.length - b.items.length;
    }
    throw this.err('TypeError', `'<' not supported between instances of '${typeName(a)}' and '${typeName(b)}'`, p);
  }

  // Text --------------------------------------------------------------------------------------

  str(v: PyValue): string {
    if (typeof v === 'string') return v;
    if (v instanceof PyInstance) {
      const s = v.cls.lookup('__str__');
      if (s !== undefined) return String(this.callSync(s, [v], {}, this.line));
      if (v.cls.isSub(BaseException)) return excMessage(v);
    }
    return this.repr(v);
  }

  repr(v: PyValue): string {
    if (v === null) return 'None';
    if (v === true) return 'True';
    if (v === false) return 'False';
    if (typeof v === 'bigint') return v.toString();
    if (typeof v === 'number') return floatRepr(v);
    if (typeof v === 'string') return v.includes("'") && !v.includes('"') ? `"${v}"` : `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
    if (v instanceof PyList) return `[${v.items.map((x) => this.repr(x)).join(', ')}]`;
    if (v instanceof PyTuple) return v.items.length === 1 ? `(${this.repr(v.items[0])},)` : `(${v.items.map((x) => this.repr(x)).join(', ')})`;
    if (v instanceof PyDict) return `{${[...v.map.values()].map(([k, x]) => `${this.repr(k)}: ${this.repr(x)}`).join(', ')}}`;
    if (v instanceof PyBytes) return `b'${v.data.map((b) => (b >= 32 && b < 127 && b !== 39 && b !== 92 ? String.fromCharCode(b) : `\\x${b.toString(16).padStart(2, '0')}`)).join('')}'`;
    if (v instanceof PyRange) return `range(${v.start}, ${v.stop}${v.step !== 1n ? `, ${v.step}` : ''})`;
    if (v instanceof PyInstance) {
      const r = v.cls.lookup('__repr__');
      if (r !== undefined) return String(this.callSync(r, [v], {}, this.line));
      if (v.cls.isSub(BaseException)) return `${v.cls.name}(${(v.dict.get('args') as PyTuple).items.map((x) => this.repr(x)).join(', ')})`;
      if (v.native?.repr) return v.native.repr();
      return `<${v.cls.name} object>`;
    }
    if (v instanceof PyClass) return `<class '${v.name}'>`;
    if (v instanceof PyFunc) return `<function ${v.name}>`;
    if (v instanceof PyNative || v instanceof PyBound) return `<built-in function ${v instanceof PyNative ? v.name : v.fn.name}>`;
    if (v instanceof PyModule) return `<module '${v.name}'>`;
    return String(v);
  }

  /** format(value, spec): fill, align, sign, width, grouping, precision, type. */
  format(v: PyValue, spec: string, p: SourcePos): string {
    const m = /^(?:(.)?([<>^=]))?([+\- ])?(#)?(0)?(\d+)?([,_])?(?:\.(\d+))?([bcdeEfFgGnosxX%])?$/.exec(spec);
    if (!m) throw this.err('ValueError', `Invalid format specifier '${spec}'`, p);
    const [, fillCh, align, sign, alt, zero, width, group, prec, type] = m;
    let s: string;
    const n = typeof v === 'bigint' || typeof v === 'boolean' || typeof v === 'number';
    if (type && 'eEfFgG%'.includes(type)) {
      const x = toNum(v);
      const pr = prec !== undefined ? Number(prec) : 6;
      if (type === 'f' || type === 'F') s = x.toFixed(pr);
      else if (type === '%') s = (x * 100).toFixed(pr) + '%';
      else if (type === 'e' || type === 'E') s = x.toExponential(pr).replace(/e([+-])(\d)$/, 'e$10$2');
      else s = String(Number(x.toPrecision(Math.max(1, pr))));
      if (type === 'E') s = s.toUpperCase();
    } else if (type && 'bodxXc'.includes(type)) {
      const x = toBig(typeof v === 'number' ? I(v) : v);
      const neg = x < 0n;
      const ax = neg ? -x : x;
      s = type === 'c' ? String.fromCharCode(Number(x)) : ax.toString(type === 'b' ? 2 : type === 'o' ? 8 : type === 'd' ? 10 : 16);
      if (type === 'X') s = s.toUpperCase();
      if (alt && type !== 'd' && type !== 'c') s = '0' + type + s;
      if (neg) s = '-' + s;
    } else if (prec !== undefined && typeof v === 'number') s = v.toFixed(Number(prec));
    else if (prec !== undefined && typeof v === 'string') s = v.slice(0, Number(prec));
    else s = this.str(v);
    if (group && n) {
      const [ip, fp] = s.split('.');
      s = ip.replace(/\B(?=(\d{3})+(?!\d))/g, group) + (fp !== undefined ? '.' + fp : '');
    }
    if (sign === '+' && n && !s.startsWith('-')) s = '+' + s;
    else if (sign === ' ' && n && !s.startsWith('-')) s = ' ' + s;
    const w = width ? Number(width) : 0;
    if (s.length < w) {
      const fill = fillCh ?? (zero ? '0' : ' ');
      const al = align ?? (zero ? '=' : n ? '>' : '<');
      const pad = w - s.length;
      if (al === '<') s = s + fill.repeat(pad);
      else if (al === '>') s = fill.repeat(pad) + s;
      else if (al === '^') s = fill.repeat(Math.floor(pad / 2)) + s + fill.repeat(pad - Math.floor(pad / 2));
      else {
        // Padding goes after the sign and the 0x/0b/0o prefix: f"{255:#06x}" is 0x00ff.
        const sg = (alt ? /^[+\- ]?0[bBoOxX]/ : /^[+\- ]/).exec(s)?.[0] ?? '';
        s = sg + fill.repeat(pad) + s.slice(sg.length);
      }
    }
    return s;
  }

  strFormat(fmt: string, args: PyValue[], kw: Record<string, PyValue>): string {
    let auto = 0;
    return fmt.replace(/\{\{|\}\}|\{([^{}:!]*)(?:!([rs]))?(?::([^{}]*))?\}/g, (m, field: string, conv: string, spec: string) => {
      if (m === '{{') return '{';
      if (m === '}}') return '}';
      let v: PyValue;
      if (field === '') v = args[auto++];
      else if (/^\d+$/.test(field)) v = args[Number(field)];
      else {
        const [base, ...attrs] = field.split('.');
        v = kw[base];
        for (const a of attrs) v = this.getAttr(v, a, this.line);
      }
      if (v === undefined) throw this.err('IndexError', 'Replacement index out of range for positional args tuple');
      if (conv === 'r') v = this.repr(v);
      return spec ? this.format(v, spec, this.line) : this.str(v);
    });
  }

  percentFormat(fmt: string, args: PyValue[], p: SourcePos): string {
    let i = 0;
    const out = fmt.replace(/%([-+ 0#]*)(\d+)?(?:\.(\d+))?([diouxXeEfFgGcrs%])/g, (_m, flags: string, width: string, prec: string, conv: string) => {
      if (conv === '%') return '%';
      const v = args[i++];
      if (v === undefined) throw this.err('TypeError', 'not enough arguments for format string', p);
      let spec = '';
      if (flags.includes('-')) spec += '<';
      if (flags.includes('+')) spec += '+';
      if (flags.includes('0') && !flags.includes('-')) spec += '0';
      if (width) spec += width;
      if (prec) spec += '.' + prec;
      if (conv === 's') return this.format(this.str(v), spec.replace('0', ''), p);
      if (conv === 'r') return this.format(this.repr(v), spec, p);
      if (conv === 'i' || conv === 'u') conv = 'd';
      if (conv === 'd' && typeof v === 'number') return this.format(I(v), spec + 'd', p);
      return this.format(v, spec + conv, p);
    });
    if (i < args.length) throw this.err('TypeError', 'not all arguments converted during string formatting', p);
    return out;
  }
}

/** A property on a native class (value, distance, is_pressed...). */
export class PyProp {
  constructor(
    public get: (self: PyInstance) => PyValue,
    public set?: (self: PyInstance, v: PyValue) => void,
  ) {}
}

export function excMessage(e: PyInstance): string {
  const args = e.dict.get('args');
  if (args instanceof PyTuple) {
    if (args.items.length === 1) return typeof args.items[0] === 'string' ? args.items[0] : String(args.items[0]);
    if (args.items.length > 1) return `(${args.items.join(', ')})`;
  }
  return '';
}

function collectLocals(body: PStmt[], locals: Set<string>, g: Set<string>, nl: Set<string>): void {
  const target = (t: PExpr) => {
    if (t.k === 'name') locals.add(t.id);
    else if (t.k === 'tuple' || t.k === 'list') t.items.forEach((x) => target(x.k === 'star' ? x.a : x));
  };
  for (const s of body) {
    switch (s.k) {
      case 'assign': s.targets.forEach(target); break;
      case 'aug': target(s.t); break;
      case 'for': target(s.t); collectLocals(s.body, locals, g, nl); if (s.orelse) collectLocals(s.orelse, locals, g, nl); break;
      case 'while': collectLocals(s.body, locals, g, nl); if (s.orelse) collectLocals(s.orelse, locals, g, nl); break;
      case 'if': collectLocals(s.a, locals, g, nl); if (s.b) collectLocals(s.b, locals, g, nl); break;
      case 'try':
        collectLocals(s.body, locals, g, nl);
        s.handlers.forEach((h) => { if (h.name) locals.add(h.name); collectLocals(h.body, locals, g, nl); });
        if (s.orelse) collectLocals(s.orelse, locals, g, nl);
        if (s.fin) collectLocals(s.fin, locals, g, nl);
        break;
      case 'with': if (s.as) target(s.as); collectLocals(s.body, locals, g, nl); break;
      case 'def': case 'class': locals.add(s.name); break;
      case 'import': s.names.forEach((n) => locals.add(n.as ?? n.mod.split('.')[0])); break;
      case 'from': s.names.forEach((n) => locals.add(n.as ?? n.name)); break;
      case 'global': s.names.forEach((n) => (s.nonlocal ? nl : g).add(n)); break;
    }
  }
  for (const n of g) locals.delete(n);
  for (const n of nl) locals.delete(n);
}

function dedupe(items: PyValue[]): PyValue[] {
  const seen = new Set<string>();
  return items.filter((x) => {
    const k = hashKey(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function sliceIdx(len: number, lo: PyValue, hi: PyValue, st: PyValue): number[] {
  const step = st === null ? 1 : Number(toBig(st));
  if (step === 0) throw pyErr('ValueError', 'slice step cannot be zero');
  const norm = (v: PyValue, d: number) => {
    if (v === null) return d;
    let i = Number(toBig(v));
    if (i < 0) i += len;
    return step > 0 ? Math.max(0, Math.min(len, i)) : Math.max(-1, Math.min(len - 1, i));
  };
  const a = norm(lo, step > 0 ? 0 : len - 1);
  const b = norm(hi, step > 0 ? len : -1);
  const out: number[] = [];
  for (let i = a; step > 0 ? i < b : i > b; i += step) out.push(i);
  return out;
}

function splitPy(s: string, sep: PyValue, max: PyValue): string[] {
  const m = max === undefined || max === null ? -1 : Number(max);
  if (sep === undefined || sep === null) {
    const parts = s.trim().split(/\s+/).filter(Boolean);
    if (m >= 0 && parts.length > m + 1) return [...parts.slice(0, m), parts.slice(m).join(' ')];
    return parts;
  }
  const parts = s.split(sep);
  if (m >= 0 && parts.length > m + 1) return [...parts.slice(0, m), parts.slice(m).join(sep)];
  return parts;
}

function trimChars(s: string, chars: string, left: boolean, right: boolean): string {
  let a = 0;
  let b = s.length;
  if (left) while (a < b && chars.includes(s[a])) a++;
  if (right) while (b > a && chars.includes(s[b - 1])) b--;
  return s.slice(a, b);
}
