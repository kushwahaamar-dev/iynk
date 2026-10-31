import { InterpError, didYouMean, type SourcePos } from '../errors';
import { Exec, PREEMPT, type Gen, type Program } from '../exec';
import { HeapMeter, checkElements, checkString } from '../limits';
import type { World } from '../world';
import { parseSketch, type Expr, type FuncDecl, type Stmt, type TypeSpec, type Unit } from './parser';
import { T, TypeEnv, isNumeric, tyName, wrapper, type CValue, type Ty } from './types';
import { BUILTINS, CONSTANTS, GLOBAL_OBJECTS, LIBS, charsToString, fmtValue, type Builtin } from './libs';

/** A variable's storage location, passed for reference parameters and &x. */
export interface Ref {
  get(): unknown;
  set(v: unknown): void;
}

interface Frame {
  v: unknown[];
  ret?: unknown;
}

interface CE {
  t: Ty;
  ev: (f: Frame) => CValue;
  /** Present when the expression contains a call that may sleep (delay, user function). */
  gen?: (f: Frame) => Gen<CValue>;
  lv?: { get: (f: Frame) => CValue; set: (f: Frame, v: CValue) => void };
  cv?: number;
  /** Name of the variable when this is a plain identifier. */
  name?: string;
}

/** Statement signal: 0 normal, 1 break, 2 continue, 3 return. */
type Sig = 0 | 1 | 2 | 3;
interface CS {
  sync?: (f: Frame) => Sig;
  gen?: (f: Frame) => Gen<Sig>;
}

interface VarSym {
  kind: 'var';
  t: Ty;
  global: boolean;
  slot: number;
  isConst: boolean;
  cv?: number;
  ref: boolean;
  rtc: boolean;
}
interface FnSym {
  kind: 'fn';
  decl: FuncDecl;
  ret: Ty;
  params: { t: Ty; ref: boolean }[];
  slots: number;
  body?: CS;
  call?: (args: unknown[]) => Gen<unknown>;
}
interface ObjSym {
  kind: 'obj';
  t: Ty;
  name: string;
}
type Sym = VarSym | FnSym | ObjSym;

const MAX_DEPTH = 120;

/**
 * Compiled sketch: a typed closure tree plus the runtime state it runs on.
 * Create with {@link compileSketch}, then drive {@link ArduinoRt.program}.
 */
export class ArduinoRt extends Exec {
  readonly env: TypeEnv;
  readonly G: unknown[] = [];
  readonly includes: Set<string>;
  /** Library and global objects (Serial, Wire, WiFi, Servo instances...). */
  readonly objects = new Map<string, unknown>();
  readonly heap = new HeapMeter();
  randState = 1;
  depth = 0;
  /** Microseconds to sleep before rebooting from deep sleep; -1 when none. */
  wakeAfter = -1;
  rtcSlots: number[] = [];
  initGlobals: () => void = () => {};
  private fns = new Map<string, FnSym>();
  warnings: InterpError[] = [];

  constructor(world: World, includes: Set<string>) {
    super(world, world.profile.opUs || 1);
    this.env = new TypeEnv(world.profile);
    this.includes = includes;
  }

  setFns(fns: Map<string, FnSym>): void {
    this.fns = fns;
  }

  /** Call a user function by name, if the sketch defines it. */
  *callUser(name: string): Gen<void> {
    const f = this.fns.get(name);
    if (f?.call) yield* f.call([]);
  }

  /** setup() once, then loop() for ever, skipping time when loop() is idle. */
  *program(): Program {
    yield* this.callUser('setup');
    if (!this.fns.get('loop')?.call) return;
    while (true) {
      const v0 = this.world.version;
      const fx0 = this.fx;
      const fc0 = this.fineClock;
      const t0 = this.world.now;
      yield* this.callUser('loop');
      if (this.world.version === v0 && this.fx === fx0 && this.world.now - t0 < 1000) this.idle(this.fineClock !== fc0);
      if (this.tick()) yield PREEMPT;
    }
  }

  /** Invoke a function value (ISR, web handler, lambda). */
  invoke(fn: unknown, args: unknown[] = []): Gen<unknown> {
    if (typeof fn !== 'function') throw new InterpError('runtime', 'expected a function here', null);
    return (fn as (a: unknown[]) => Gen<unknown>)(args);
  }

  random(): number {
    // avr-libc random(): Park–Miller "minimal standard" generator, so sequences
    // match a real Uno (the same sequence every boot unless randomSeed() is called).
    let x = this.randState;
    if (x === 0) x = 123459876;
    const hi = Math.trunc(x / 127773);
    const lo = x % 127773;
    x = 16807 * lo - 2836 * hi;
    if (x < 0) x += 0x7fffffff;
    this.randState = x;
    return x % 0x80000000;
  }

  warn(message: string, pos?: SourcePos | null): void {
    const e = new InterpError('runtime', message, pos ?? null);
    this.warnings.push(e);
    this.world.warn(message);
  }
}

export interface CompiledSketch {
  rt: ArduinoRt;
  unit: Unit;
}

/** Headers of the Arduino core and the C library that need no simulated library behind them. */
const KNOWN_BUILTIN_HEADERS = ['Arduino.h', 'stdint.h', 'stdlib.h', 'string.h', 'math.h', 'stdio.h', 'avr/pgmspace.h', 'avr/io.h'];

const LIBRARY_HEADERS: readonly string[] = [
  ...new Set([...Object.values(LIBS).flatMap((l) => l.headers), ...Object.values(GLOBAL_OBJECTS).flatMap((g) => g.headers ?? [])]),
].sort();

export const ALLOWED_HEADERS: ReadonlySet<string> = new Set([...LIBRARY_HEADERS, ...KNOWN_BUILTIN_HEADERS]);

function checkIncludes(unit: Unit): void {
  for (const { name, line } of unit.includes) {
    if (ALLOWED_HEADERS.has(name)) continue;
    throw new InterpError(
      'unsupported',
      `'${name}' is not a library the iynk simulator can run`,
      { line, col: 1 },
      `supported libraries: ${LIBRARY_HEADERS.join(', ')}`,
      { code: 'include.unknown', args: { name } },
    );
  }
}

/** Parse and type-check a sketch for the world's board. Throws InterpError. */
export function compileSketch(source: string, world: World): CompiledSketch {
  const unit = parseSketch(source, Object.keys(LIBS));
  checkIncludes(unit);
  const includes = new Set(unit.includes.map((i) => i.name));
  const rt = new ArduinoRt(world, includes);
  new Compiler(rt, unit).run();
  return { rt, unit };
}

class Compiler {
  private scopes: Map<string, Sym>[] = [new Map()];
  private fn: FnSym | null = null;
  private nGlobals = 0;
  private globalInits: Array<(f: Frame) => void> = [];
  private readonly env: TypeEnv;
  private structs = new Map<string, Ty>();
  private loopDepth = 0;
  private switchDepth = 0;

  constructor(
    private rt: ArduinoRt,
    private unit: Unit,
  ) {
    this.env = rt.env;
  }

  private err(msg: string, p: SourcePos | null, hint?: string): never {
    throw new InterpError('compile', msg, p, hint);
  }

  run(): void {
    const { rt, unit } = this;
    const prof = rt.world.profile;
    // Global objects that every sketch sees (Serial) or that a header brings in.
    for (const [name, g] of Object.entries(GLOBAL_OBJECTS)) {
      if (g.boards && !g.boards(prof)) continue;
      if (g.headers && !g.headers.some((h) => rt.includes.has(h))) continue;
      const lib = LIBS[g.cls];
      rt.objects.set(name, lib.create(rt, [], []));
      this.scopes[0].set(name, { kind: 'obj', t: { k: 'obj', cls: g.cls }, name });
    }
    // Pre-declare every function (the Arduino IDE generates prototypes).
    const fns = new Map<string, FnSym>();
    for (const top of unit.tops) {
      if (top.k !== 'func') continue;
      const prev = fns.get(top.name);
      if (prev && prev.decl.body && top.body) this.err(`${top.name}() is defined twice`, top.p, 'C++ overloading is not simulated: give the functions different names');
      if (prev && !top.body) continue;
      const sym: FnSym = { kind: 'fn', decl: top, ret: this.type(top.ret, top.p), params: top.params.map((p) => ({ t: this.paramType(p.ty, p.dims, p.p), ref: p.ty.ref })), slots: 0 };
      fns.set(top.name, sym);
      this.scopes[0].set(top.name, sym);
    }
    rt.setFns(fns);
    for (const top of unit.tops) {
      if (top.k === 'enum') {
        let next = 0;
        for (const it of top.items) {
          if (it.value) next = this.constEval(it.value);
          this.scopes[0].set(it.name, { kind: 'var', t: this.env.int, global: true, slot: -1, isConst: true, cv: next, ref: false, rtc: false });
          next++;
        }
        if (top.name) this.structs.set(top.name, this.env.int);
      } else if (top.k === 'struct') {
        const fields = new Map<string, Ty>();
        for (const fd of top.fields) fields.set(fd.name, this.arrayType(this.type(fd.ty, fd.p), fd.dims, undefined, fd.p));
        this.structs.set(top.name, { k: 'struct', name: top.name, fields });
      } else if (top.k === 'gdecl') {
        const inits = this.declare(top.decl, true);
        this.globalInits.push(...inits);
      } else if (top.k === 'func' && top.body) {
        this.compileFunction(fns.get(top.name)!, top);
      }
    }
    if (!fns.get('setup')?.decl.body) this.err('the sketch has no setup() function', null, 'every sketch needs void setup() { } and void loop() { }');
    if (!fns.get('loop')?.decl.body) this.err('the sketch has no loop() function', null, 'add void loop() { } even if it stays empty');
    for (const [name, f] of fns) if (!f.decl.body) this.err(`${name}() is declared but never defined`, f.decl.p);
    const inits = this.globalInits;
    const n = this.nGlobals;
    rt.initGlobals = () => {
      const keep = rt.rtcSlots.map((s) => rt.G[s]);
      rt.G.length = 0;
      for (let i = 0; i < n; i++) rt.G.push(0);
      const f: Frame = { v: [] };
      for (const init of inits) init(f);
      rt.rtcSlots.forEach((s, i) => {
        if (keep[i] !== undefined) rt.G[s] = keep[i];
      });
    };
  }

  // Types -----------------------------------------------------------------------

  private type(ts: TypeSpec, p: SourcePos): Ty {
    if (ts.base === 'auto') return T.void; // resolved from the initialiser
    if (ts.ptr > 0) {
      if (ts.base === 'char') return T.cstr;
      if (LIBS[ts.base]) return { k: 'obj', cls: ts.base };
      if (ts.base === 'void') this.err('void pointers are not supported', p);
      this.err(`pointers (${ts.base}*) are not supported, except const char* text and library objects`, p, 'use an array and an index, or a reference parameter (int &x)');
    }
    const named = this.env.named(ts.base);
    if (named) return named;
    const st = this.structs.get(ts.base);
    if (st) return st;
    const lib = LIBS[ts.base];
    if (lib) {
      if (!lib.headers.some((h) => this.rt.includes.has(h))) this.err(`'${ts.base}' needs #include <${lib.headers[0]}>`, p, `add #include <${lib.headers[0]}> at the top of the sketch`);
      if (lib.boards && !lib.boards(this.rt.world.profile)) this.err(`${ts.base} is not available on ${this.rt.world.profile.name}`, p);
      return { k: 'obj', cls: ts.base };
    }
    this.err(`unknown type '${ts.base}'`, p);
  }

  private paramType(ts: TypeSpec, dims: number, p: SourcePos): Ty {
    let t = this.type(ts, p);
    for (let i = 0; i < dims; i++) t = { k: 'array', el: t, n: -1 };
    return t;
  }

  private arrayType(el: Ty, dims: (Expr | null)[], init: Expr | undefined, p: SourcePos): Ty {
    let t = el;
    let total = 1;
    for (let d = dims.length - 1; d >= 0; d--) {
      const de = dims[d];
      let n: number;
      if (de) n = this.constEval(de);
      else if (d === 0 && init?.k === 'init') n = init.items.length;
      else if (d === 0 && init?.k === 'str') n = init.value.length + 1;
      else this.err('this array needs a size', p, 'write the size in the brackets, like int pins[3]');
      if (n <= 0) this.err('array size must be positive', p);
      total *= n;
      checkElements(total, 'array size', p);
      t = { k: 'array', el: t, n };
    }
    this.rt.heap.chargeItems(total, 'this array', p);
    return t;
  }

  private joined(text: string, p: SourcePos): string {
    checkString(text.length, p);
    this.rt.heap.chargeText(text.length, 'this String', p);
    return text;
  }

  private constEval(e: Expr): number {
    const c = this.expr(e);
    if (c.cv === undefined) this.err('this needs a constant value known before the sketch runs', e.p, 'use a number or a const int');
    return c.cv;
  }

  // Scopes ----------------------------------------------------------------------

  private lookup(name: string): Sym | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const s = this.scopes[i].get(name);
      if (s) return s;
    }
    return undefined;
  }

  private allNames(): string[] {
    const names = new Set<string>();
    for (const s of this.scopes) for (const k of s.keys()) names.add(k);
    for (const k of Object.keys(BUILTINS)) names.add(k);
    for (const k of Object.keys(CONSTANTS(this.rt.world.profile))) names.add(k);
    return [...names];
  }

  private newSlot(global: boolean): number {
    if (global) return this.nGlobals++;
    return this.fn!.slots++;
  }

  // Declarations ----------------------------------------------------------------

  /** Declare variables; returns initialiser closures to run (globals at boot, locals in place). */
  private declare(d: Extract<Stmt, { k: 'decl' }>, global: boolean): Array<(f: Frame) => void> {
    const out: Array<(f: Frame) => void> = [];
    const scope = this.scopes[this.scopes.length - 1];
    for (const dc of d.decls) {
      if (scope.has(dc.name) && (global || scope.get(dc.name)!.kind === 'var')) this.err(`'${dc.name}' is already declared here`, dc.p, 'pick another name or drop the type to reuse the variable');
      let base = this.type(d.ty, dc.p);
      const isStatic = d.ty.isStatic && !global;
      const g = global || isStatic;
      // Objects: Servo s; AccelStepper w(…); Adafruit_X x = Adafruit_X(…);
      if (base.k === 'obj' && d.ty.ptr === 0) {
        const lib = LIBS[base.cls];
        let argsE: Expr[] = dc.ctorArgs ?? [];
        if (dc.init) {
          if (dc.init.k === 'call' && dc.init.fn.k === 'id' && dc.init.fn.name === base.cls) argsE = dc.init.args;
          else this.err(`initialise ${base.cls} with ${base.cls} ${dc.name}(…)`, dc.p);
        }
        const args = argsE.map((a) => this.expr(a));
        const slot = this.newSlot(g);
        const sym: VarSym = { kind: 'var', t: base, global: g, slot, isConst: false, ref: false, rtc: false };
        scope.set(dc.name, sym);
        const rt = this.rt;
        const create = (f: Frame) => lib.create(rt, args.map((a) => a.ev(f)), args.map((a) => a.t));
        if (g) this.globalInits.push((f) => (rt.G[slot] = create(f)));
        else out.push((f) => (f.v[slot] = create(f)));
        continue;
      }
      if (d.ty.base === 'auto') {
        if (!dc.init) this.err(`'auto ${dc.name}' needs a value`, dc.p);
        base = this.expr(dc.init).t;
        if (base.k === 'void') this.err('cannot store the result of a void function', dc.p);
      }
      const t = dc.dims.length ? this.arrayType(base, dc.dims, dc.init, dc.p) : base;
      if (d.ty.ref) this.err('reference variables are only supported as function parameters', dc.p);
      const slot = this.newSlot(g);
      const sym: VarSym = { kind: 'var', t, global: g, slot, isConst: d.ty.isConst, ref: false, rtc: d.ty.rtc };
      if (d.ty.rtc && global) this.rt.rtcSlots.push(slot);
      let init: ((f: Frame) => unknown) | null = null;
      let initGen: ((f: Frame) => Gen<unknown>) | null = null;
      if (dc.init) {
        if (t.k === 'array') init = this.arrayInit(t, dc.init, dc.p);
        else if (t.k === 'struct') init = this.structInit(t, dc.init, dc.p);
        else {
          const c = this.coerce(this.expr(dc.init), t, dc.init.p);
          if (d.ty.isConst && c.cv !== undefined) sym.cv = c.cv;
          init = c.ev;
          if (c.gen && !g) initGen = c.gen;
        }
      } else {
        const z = zero(t, this.env);
        init = () => z();
      }
      // Declare after compiling the initialiser: "int x = x;" must not see itself.
      scope.set(dc.name, sym);
      const rt = this.rt;
      if (g) {
        const fn = init;
        if (isStatic) {
          // Function statics initialise once, at boot.
          this.globalInits.push((f) => (rt.G[slot] = fn(f)));
        } else this.globalInits.push((f) => (rt.G[slot] = fn(f)));
      } else if (initGen) {
        const ig = initGen;
        (out as unknown as { gen?: (f: Frame) => Gen<void> }[]).push(Object.assign((f: Frame) => void f, {
          gen: function* (f: Frame): Gen<void> {
            f.v[slot] = yield* ig(f);
          },
        }));
      } else {
        const fn = init;
        out.push((f) => (f.v[slot] = fn(f)));
      }
    }
    return out;
  }

  private arrayInit(t: Extract<Ty, { k: 'array' }>, e: Expr, p: SourcePos): (f: Frame) => unknown {
    if (e.k === 'str') {
      if (!(t.el.k === 'int' && t.el.bits === 8)) this.err('only char arrays can be set from text', p);
      if (e.value.length + 1 > t.n) this.err(`"${e.value}" needs ${e.value.length + 1} chars (with the end marker) but the array holds ${t.n}`, p);
      const codes = [...e.value].map((c) => c.charCodeAt(0));
      return () => {
        const a = new Array(t.n).fill(0);
        codes.forEach((c, i) => (a[i] = c));
        return a;
      };
    }
    if (e.k !== 'init') this.err('initialise an array with a list in braces, like {1, 2, 3}', p);
    if (e.items.length > t.n) this.err(`too many values: the array holds ${t.n}`, e.p);
    const items = e.items.map((it) =>
      t.el.k === 'array' ? this.arrayInit(t.el, it, it.p) : t.el.k === 'struct' ? this.structInit(t.el, it, it.p) : this.coerce(this.expr(it), t.el, it.p).ev,
    );
    const z = zero(t.el, this.env);
    return (f) => {
      const a = new Array(t.n);
      for (let i = 0; i < t.n; i++) a[i] = i < items.length ? items[i](f) : z();
      return a;
    };
  }

  private structInit(t: Extract<Ty, { k: 'struct' }>, e: Expr, p: SourcePos): (f: Frame) => unknown {
    if (e.k !== 'init') {
      const c = this.expr(e);
      if (c.t.k !== 'struct' || c.t.name !== t.name) this.err(`expected a ${t.name} value`, p);
      return (f) => cloneValue(c.ev(f));
    }
    const names = [...t.fields.keys()];
    const inits = e.items.map((it, i) => {
      const ft = t.fields.get(names[i]);
      if (!ft) this.err(`too many values for ${t.name}`, it.p);
      return ft.k === 'array' ? this.arrayInit(ft, it, it.p) : this.coerce(this.expr(it), ft, it.p).ev;
    });
    const zs = names.map((n) => zero(t.fields.get(n)!, this.env));
    return (f) => {
      const o: Record<string, unknown> = {};
      names.forEach((n, i) => (o[n] = i < inits.length ? inits[i](f) : zs[i]()));
      return o;
    };
  }

  // Functions ---------------------------------------------------------------------

  private compileFunction(sym: FnSym, d: FuncDecl): void {
    const outer = this.fn;
    this.fn = sym;
    this.scopes.push(new Map());
    const paramSlots: number[] = [];
    d.params.forEach((p, i) => {
      if (!p.name) return;
      const slot = sym.slots++;
      paramSlots.push(slot);
      this.scopes[this.scopes.length - 1].set(p.name, { kind: 'var', t: sym.params[i].t, global: false, slot, isConst: p.ty.isConst, ref: sym.params[i].ref, rtc: false });
    });
    const body = this.stmt(d.body!);
    this.scopes.pop();
    this.fn = outer;
    sym.body = body;
    const rt = this.rt;
    const wrapRet = sym.ret.k === 'void' ? null : this.storer(sym.ret);
    const name = d.name;
    const p = d.p;
    sym.call = function* (args: unknown[]): Gen<unknown> {
      const f: Frame = { v: new Array(sym.slots) };
      for (let i = 0; i < paramSlots.length; i++) f.v[paramSlots[i]] = args[i];
      if (++rt.depth > MAX_DEPTH) {
        rt.depth = 0;
        throw new InterpError('runtime', `${name}() calls itself too deeply: the stack ran out of RAM`, p, 'check the stopping condition of the recursion');
      }
      try {
        if (body.sync) body.sync(f);
        else yield* body.gen!(f);
      } finally {
        rt.depth--;
      }
      return wrapRet ? wrapRet(f.ret ?? 0) : undefined;
    };
  }

  private storer(t: Ty): (v: CValue) => CValue {
    if (t.k === 'struct') return cloneValue;
    return wrapper(t);
  }

  // Statements --------------------------------------------------------------------

  private stmt(s: Stmt): CS {
    const rt = this.rt;
    switch (s.k) {
      case 'empty':
        return { sync: () => 0 };
      case 'block': {
        this.scopes.push(new Map());
        const body = s.body.map((x) => this.stmt(x));
        this.scopes.pop();
        if (!body.length) return { sync: () => 0 };
        return {
          gen: function* (f) {
            for (let i = 0; i < body.length; i++) {
              if (rt.tick()) yield PREEMPT;
              const b = body[i];
              const sig = b.sync ? b.sync(f) : yield* b.gen!(f);
              if (sig) return sig;
            }
            return 0;
          },
        };
      }
      case 'decl': {
        if (this.fn === null) this.err('declaration outside a function', s.p);
        const inits = this.declare(s, false);
        if (inits.some((i) => (i as { gen?: unknown }).gen)) {
          return {
            gen: function* (f) {
              for (const i of inits) {
                const g = (i as { gen?: (f: Frame) => Gen<void> }).gen;
                if (g) yield* g(f);
                else i(f);
              }
              return 0;
            },
          };
        }
        return {
          sync: (f) => {
            for (const i of inits) i(f);
            return 0;
          },
        };
      }
      case 'expr': {
        const e = this.expr(s.e);
        if (e.gen) {
          const g = e.gen;
          return {
            gen: function* (f) {
              yield* g(f);
              return 0;
            },
          };
        }
        const ev = e.ev;
        return {
          sync: (f) => {
            ev(f);
            return 0;
          },
        };
      }
      case 'if': {
        const c = this.cond(s.c);
        const a = this.stmt(s.a);
        const b = s.b ? this.stmt(s.b) : null;
        if (a.sync && (!b || b.sync)) {
          const as = a.sync;
          const bs = b?.sync;
          return { sync: (f) => (c(f) ? as(f) : bs ? bs(f) : 0) };
        }
        return {
          gen: function* (f) {
            const x = c(f) ? a : b;
            if (!x) return 0;
            return x.sync ? x.sync(f) : yield* x.gen!(f);
          },
        };
      }
      case 'while':
      case 'do':
      case 'for': {
        this.scopes.push(new Map());
        const init = s.k === 'for' && s.init ? this.stmt(s.init) : null;
        const c = s.c ? this.cond(s.c) : () => true;
        const u = s.k === 'for' && s.u ? this.expr(s.u).ev : null;
        this.loopDepth++;
        const body = this.stmt(s.body);
        this.loopDepth--;
        this.scopes.pop();
        const testFirst = s.k !== 'do';
        const w = rt.world;
        return {
          gen: function* (f) {
            if (init) {
              if (init.sync) init.sync(f);
              else yield* init.gen!(f);
            }
            let first = true;
            while (true) {
              if ((testFirst || !first) && !c(f)) return 0;
              first = false;
              const v0 = w.version;
              const fx0 = rt.fx;
              const fc0 = rt.fineClock;
              const t0 = w.now;
              const sig = body.sync ? body.sync(f) : yield* body.gen!(f);
              if (sig === 1) return 0;
              if (sig === 3) return 3;
              if (u) u(f);
              if (w.version === v0 && rt.fx === fx0 && w.now - t0 < 1000) rt.idle(rt.fineClock !== fc0);
              if (rt.tick()) yield PREEMPT;
            }
          },
        };
      }
      case 'switch': {
        const e = this.expr(s.e);
        if (e.t.k !== 'int' && e.t.k !== 'bool') this.err('switch needs a whole-number value (int, char, enum)', s.e.p);
        this.switchDepth++;
        this.scopes.push(new Map());
        const cases = s.cases.map((cs) => ({ tests: cs.tests?.map((t) => this.constEval(t)) ?? null, body: cs.body.map((x) => this.stmt(x)) }));
        this.scopes.pop();
        this.switchDepth--;
        const ev = e.ev;
        return {
          gen: function* (f) {
            const v = ev(f);
            let start = cases.findIndex((c) => c.tests?.includes(v));
            if (start < 0) start = cases.findIndex((c) => c.tests === null);
            if (start < 0) return 0;
            for (let i = start; i < cases.length; i++) {
              for (const b of cases[i].body) {
                if (rt.tick()) yield PREEMPT;
                const sig = b.sync ? b.sync(f) : yield* b.gen!(f);
                if (sig === 1) return 0;
                if (sig) return sig;
              }
            }
            return 0;
          },
        };
      }
      case 'break':
        if (!this.loopDepth && !this.switchDepth) this.err('break is only allowed inside a loop or switch', s.p);
        return { sync: () => 1 };
      case 'continue':
        if (!this.loopDepth) this.err('continue is only allowed inside a loop', s.p);
        return { sync: () => 2 };
      case 'return': {
        const fn = this.fn!;
        if (!s.e) {
          if (fn.ret.k !== 'void') this.err(`${fn.decl.name}() must return a ${tyName(fn.ret)} value`, s.p);
          return { sync: () => 3 };
        }
        if (fn.ret.k === 'void') this.err(`${fn.decl.name}() is void, so it cannot return a value`, s.p);
        const e = fn.ret.k === 'struct' ? this.expr(s.e) : this.coerce(this.expr(s.e), fn.ret, s.e.p);
        if (e.gen) {
          const g = e.gen;
          return {
            gen: function* (f) {
              f.ret = yield* g(f);
              return 3;
            },
          };
        }
        const ev = e.ev;
        return {
          sync: (f) => {
            f.ret = ev(f);
            return 3;
          },
        };
      }
    }
  }

  private cond(e: Expr): (f: Frame) => boolean {
    const c = this.expr(e);
    if (e.k === 'assign' && e.op === '=') this.rt.warnings.push(new InterpError('compile', 'this condition assigns with = ; did you mean == ?', e.p));
    return truthy(c);
  }

  // Expressions -------------------------------------------------------------------

  /** Convert an expression to type `to` (implicit conversion on assignment/argument). */
  private coerce(c: CE, to: Ty, p: SourcePos): CE {
    const from = c.t;
    if (to.k === 'string') {
      if (from.k === 'string' || from.k === 'cstr') return { ...c, t: to };
      if (isNumeric(from) || from.k === 'int') {
        const ev = c.ev;
        return { t: to, ev: (f) => fmtValue(ev(f), from, undefined, true) };
      }
      this.err(`cannot turn a ${tyName(from)} into a String`, p);
    }
    if (to.k === 'cstr') {
      if (from.k === 'cstr' || from.k === 'string') return { ...c, t: to };
      if (from.k === 'array' && from.el.k === 'int' && from.el.bits === 8) {
        const ev = c.ev;
        return { t: to, ev: (f) => charsToString(ev(f)) };
      }
      if (from.k === 'int' && c.cv === 0) return { t: to, ev: () => '' };
      this.err(`expected text but got a ${tyName(from)}`, p);
    }
    if (to.k === 'array' || to.k === 'obj' || to.k === 'struct' || to.k === 'fn') {
      if (to.k === 'array' && from.k === 'array') return c;
      if (to.k === 'obj' && from.k === 'obj') return c;
      if (to.k === 'struct' && from.k === 'struct' && from.name === to.name) return c;
      if (to.k === 'fn' && from.k === 'fn') return c;
      this.err(`expected a ${tyName(to)} but got a ${tyName(from)}`, p);
    }
    if (to.k === 'void') return c;
    if (from.k === 'string' || from.k === 'cstr') {
      this.err(`expected a number but got text`, p, from.k === 'string' ? 'use .toInt() or .toFloat()' : 'use atoi() or String(…).toInt()');
    }
    if (from.k === 'obj') {
      // Serial, WiFi client etc. used as a condition behave as true.
      if (to.k === 'bool') return { t: to, ev: () => 1 };
      this.err(`expected a number but got a ${tyName(from)}`, p);
    }
    if (from.k === 'array' || from.k === 'struct' || from.k === 'fn' || from.k === 'void') this.err(`expected a number but got ${from.k === 'void' ? 'nothing (a void function)' : `a ${tyName(from)}`}`, p);
    const w = wrapper(to);
    const ev = c.ev;
    const cv = c.cv !== undefined ? w(c.cv) : undefined;
    if (c.gen) {
      const g = c.gen;
      return { t: to, ev: (f) => w(ev(f)), gen: function* (f) { return w(yield* g(f)); }, cv };
    }
    return { t: to, ev: (f) => w(ev(f)), cv };
  }

  private expr(e: Expr): CE {
    const rt = this.rt;
    const env = this.env;
    switch (e.k) {
      case 'num': {
        let t: Ty;
        if (e.float) t = e.f32 ? T.f32 : env.double;
        else {
          const v = e.value;
          if (e.long >= 2) t = e.unsigned ? T.u64 : T.i64;
          else if (e.long === 1 || v > (env.int.k === 'int' && env.int.bits === 16 ? 32767 : 2147483647)) {
            t = e.unsigned || v > 2147483647 ? (v > 4294967295 ? T.i64 : T.u32) : T.i32;
            if (!e.long && v <= 65535 && env.int.k === 'int' && env.int.bits === 16 && e.unsigned) t = env.uint;
          } else t = e.unsigned ? env.uint : env.int;
        }
        const v = e.float && t.k === 'float' && t.bits === 32 ? Math.fround(e.value) : e.value;
        return { t, ev: () => v, cv: v };
      }
      case 'bool': {
        const v = e.value ? 1 : 0;
        return { t: T.bool, ev: () => v, cv: v };
      }
      case 'chr': {
        const v = e.value;
        return { t: env.char, ev: () => v, cv: v };
      }
      case 'str': {
        const v = e.value;
        return { t: T.cstr, ev: () => v };
      }
      case 'id':
        return this.ident(e.name, e.p);
      case 'scope': {
        const lib = LIBS[e.ns];
        const v = lib?.statics?.[e.name];
        if (v === undefined) this.err(`unknown name ${e.ns}::${e.name}`, e.p);
        return { t: env.int, ev: () => v, cv: v };
      }
      case 'cast': {
        const to = this.type(e.ty, e.p);
        const c = this.expr(e.a);
        if (to.k === 'string' || to.k === 'cstr') return this.coerce(c, to, e.p);
        if (!isNumeric(c.t) && c.t.k !== 'int') this.err(`cannot cast a ${tyName(c.t)} to ${tyName(to)}`, e.p);
        return this.coerce(c, to, e.p);
      }
      case 'sizeof': {
        const t = e.ty ? this.type(e.ty, e.p) : this.expr(e.a!).t;
        const n = env.sizeOf(t);
        return { t: env.sizeT, ev: () => n, cv: n };
      }
      case 'init':
        this.err('a { … } list can only initialise an array or struct', e.p);
        break;
      case 'comma': {
        const a = this.expr(e.a);
        const b = this.expr(e.b);
        return { t: b.t, ev: (f) => (a.ev(f), b.ev(f)) };
      }
      case 'lambda': {
        // Capture-less lambda: compile like a nested void function.
        const decl: FuncDecl = { k: 'func', p: e.p, ret: { base: 'void', ptr: 0, isConst: false, isStatic: false, isVolatile: false, rtc: false, ref: false }, name: 'lambda', params: e.params, body: e.body, isr: false };
        const sym: FnSym = { kind: 'fn', decl, ret: T.void, params: e.params.map((p) => ({ t: this.paramType(p.ty, p.dims, p.p), ref: p.ty.ref })), slots: 0 };
        const savedLoop = this.loopDepth;
        const savedSwitch = this.switchDepth;
        this.loopDepth = 0;
        this.switchDepth = 0;
        this.compileFunction(sym, decl);
        this.loopDepth = savedLoop;
        this.switchDepth = savedSwitch;
        const call = sym.call!;
        return { t: T.fn, ev: () => call };
      }
      case 'un':
        return this.unary(e);
      case 'post':
        return this.incdec(e.a, e.op, true, e.p);
      case 'bin':
        return this.binary(e.op, this.expr(e.a), this.expr(e.b), e.p);
      case 'assign':
        return this.assign(e);
      case 'cond': {
        const c = truthy(this.expr(e.c));
        let a = this.expr(e.a);
        let b = this.expr(e.b);
        let t = a.t;
        if (isNumeric(a.t) && isNumeric(b.t)) {
          t = env.common(a.t, b.t);
          a = this.coerce(a, t, e.p);
          b = this.coerce(b, t, e.p);
        } else if ((a.t.k === 'cstr' || a.t.k === 'string') && (b.t.k === 'cstr' || b.t.k === 'string')) t = a.t.k === 'string' || b.t.k === 'string' ? T.string : T.cstr;
        const ae = a.ev;
        const be = b.ev;
        return { t, ev: (f) => (c(f) ? ae(f) : be(f)) };
      }
      case 'index': {
        const a = this.expr(e.a);
        const i = this.coerce(this.expr(e.i), T.i32, e.i.p);
        const ie = i.ev;
        const ae = a.ev;
        if (a.t.k === 'string' || a.t.k === 'cstr') {
          return { t: env.char, ev: (f) => {
            const s = ae(f) as string;
            const k = ie(f);
            return k >= 0 && k < s.length ? s.charCodeAt(k) : 0;
          } };
        }
        if (a.t.k !== 'array') this.err(`${a.name ?? 'this'} is not an array, so it cannot be indexed with [ ]`, e.p);
        const at = a.t;
        const el = at.el;
        const w = el.k === 'array' || el.k === 'struct' || el.k === 'obj' ? (v: unknown) => v : wrapper(el);
        const name = a.name ?? 'the array';
        const p = e.p;
        const check = (arr: unknown[], k: number) => {
          if (k < 0 || k >= arr.length) {
            throw new InterpError('runtime', `index ${k} is outside ${name} (valid: 0 to ${arr.length - 1})`, p, 'on a real board this reads or overwrites other variables');
          }
        };
        return {
          t: el,
          ev: (f) => {
            const arr = ae(f) as unknown[];
            const k = ie(f);
            check(arr, k);
            return arr[k];
          },
          lv: {
            get: (f) => {
              const arr = ae(f) as unknown[];
              const k = ie(f);
              check(arr, k);
              return arr[k];
            },
            set: (f, v) => {
              const arr = ae(f) as unknown[];
              const k = ie(f);
              check(arr, k);
              const nv = w(v as number);
              if (arr[k] !== nv) {
                arr[k] = nv;
                rt.fx++;
              }
            },
          },
        };
      }
      case 'member': {
        const a = this.expr(e.a);
        if (a.t.k === 'struct') {
          const ft = a.t.fields.get(e.name);
          if (!ft) this.err(`${a.t.name} has no field '${e.name}'`, e.p, didYouMean(e.name, a.t.fields.keys()) ? `did you mean '${didYouMean(e.name, a.t.fields.keys())}'?` : undefined);
          const ae = a.ev;
          const key = e.name;
          const w = ft.k === 'int' || ft.k === 'float' || ft.k === 'bool' ? wrapper(ft) : (v: unknown) => v;
          return {
            t: ft,
            ev: (f) => (ae(f) as Record<string, unknown>)[key],
            lv: {
              get: (f) => (ae(f) as Record<string, unknown>)[key],
              set: (f, v) => {
                const o = ae(f) as Record<string, unknown>;
                const nv = w(v as number);
                if (o[key] !== nv) {
                  o[key] = nv;
                  rt.fx++;
                }
              },
            },
          };
        }
        if (a.t.k === 'obj') {
          const lib = LIBS[a.t.cls];
          const prop = lib.props?.[e.name];
          if (prop) {
            const ae = a.ev;
            const t = env.named(prop.ret) ?? env.int;
            return { t, ev: (f) => prop.get(rt, ae(f)) };
          }
        }
        this.err(`'.${e.name}' must be called, like ${e.name}()`, e.p);
        break;
      }
      case 'call':
        return this.call(e);
    }
    this.err('unsupported expression', e.p);
  }

  private ident(name: string, p: SourcePos): CE {
    const rt = this.rt;
    const s = this.lookup(name);
    if (s) {
      if (s.kind === 'fn') {
        const sym = s;
        return { t: T.fn, ev: () => (args: unknown[]) => sym.call!(args) };
      }
      if (s.kind === 'obj') {
        const obj = rt.objects.get(s.name);
        return { t: s.t, ev: () => obj, name };
      }
      if (s.cv !== undefined) {
        const v = s.cv;
        return { t: s.t, ev: () => v, cv: v, name };
      }
      const slot = s.slot;
      const w = s.t.k === 'int' || s.t.k === 'float' || s.t.k === 'bool' ? wrapper(s.t) : (v: unknown) => v;
      const isConst = s.isConst;
      const ro = (): void => {
        throw new InterpError('compile', `'${name}' is const, so it cannot be changed`, p);
      };
      if (s.ref) {
        return {
          t: s.t, name,
          ev: (f) => (f.v[slot] as Ref).get(),
          lv: { get: (f) => (f.v[slot] as Ref).get(), set: isConst ? ro : (f, v) => { const r = f.v[slot] as Ref; const nv = w(v as number); if (r.get() !== nv) { r.set(nv); rt.fx++; } } },
        };
      }
      if (s.global) {
        const G = rt.G;
        return {
          t: s.t, name,
          ev: () => G[slot],
          lv: { get: () => G[slot], set: isConst ? ro : (_f, v) => { const nv = w(v as number); if (G[slot] !== nv) { G[slot] = nv; rt.fx++; } } },
        };
      }
      return {
        t: s.t, name,
        ev: (f) => f.v[slot],
        lv: { get: (f) => f.v[slot], set: isConst ? ro : (f, v) => { const nv = w(v as number); if (f.v[slot] !== nv) { f.v[slot] = nv; rt.fx++; } } },
      };
    }
    const consts = CONSTANTS(rt.world.profile);
    if (name in consts) {
      const c = consts[name];
      const t = c.t === 'float' ? this.env.double : this.env.named(c.t) ?? this.env.int;
      const v = c.v;
      return { t, ev: () => v, cv: v };
    }
    if (name in BUILTINS) return { t: T.fn, ev: () => { throw new InterpError('compile', `${name} must be called with ( )`, p); } };
    if (name === 'LED_BUILTIN') {
      this.err(`LED_BUILTIN is not defined for ${rt.world.profile.name}: the board has no user LED`, p, rt.world.profile.notes[0]);
    }
    const lib = Object.entries(GLOBAL_OBJECTS).find(([n]) => n === name);
    if (lib && lib[1].headers) this.err(`'${name}' needs #include <${lib[1].headers[0]}>`, p, `add #include <${lib[1].headers[0]}> at the top`);
    const guess = didYouMean(name, this.allNames());
    this.err(`'${name}' was not declared`, p, guess ? `did you mean '${guess}'?` : 'declare it first, like int ' + name + ' = 0;');
  }

  private lvalue(e: Expr): CE {
    const c = this.expr(e);
    if (!c.lv) {
      if (c.cv !== undefined && e.k === 'id') this.err(`'${e.name}' is a constant and cannot be changed`, e.p);
      this.err('this cannot be assigned to', e.p, 'the left side of = must be a variable or array element');
    }
    return c;
  }

  private unary(e: Extract<Expr, { k: 'un' }>): CE {
    if (e.op === '++' || e.op === '--') return this.incdec(e.a, e.op, false, e.p);
    if (e.op === '&') {
      const c = this.expr(e.a);
      if (c.t.k === 'obj' || c.t.k === 'fn' || c.t.k === 'array') return c; // &Wire, &isr, &arr
      if (!c.lv) this.err('& needs a variable', e.p);
      const lv = c.lv;
      return { t: { k: 'obj', cls: '&ref' }, ev: (f) => ({ get: () => lv.get(f), set: (v: unknown) => lv.set(f, v) }) as Ref };
    }
    if (e.op === '*') {
      const c = this.expr(e.a);
      if (c.t.k === 'cstr') {
        const ev = c.ev;
        return { t: this.env.char, ev: (f) => (ev(f) as string).charCodeAt(0) || 0 };
      }
      this.err('pointer dereference (*p) is not supported', e.p);
    }
    const c = this.expr(e.a);
    if (e.op === '!') {
      const tv = truthy(c);
      return { t: T.bool, ev: (f) => (tv(f) ? 0 : 1), cv: c.cv !== undefined ? (c.cv ? 0 : 1) : undefined };
    }
    if (!isNumeric(c.t)) this.err(`'${e.op}' needs a number`, e.p);
    const t = this.env.promote(c.t);
    const cc = this.coerce(c, t, e.p);
    const w = wrapper(t);
    const ev = cc.ev;
    if (e.op === '-') return { t, ev: (f) => w(-ev(f)), cv: cc.cv !== undefined ? w(-cc.cv) : undefined };
    if (e.op === '+') return cc;
    if (t.k !== 'int') this.err('~ needs a whole number', e.p);
    return { t, ev: (f) => w(~ev(f)), cv: cc.cv !== undefined ? w(~cc.cv) : undefined };
  }

  private incdec(target: Expr, op: string, post: boolean, p: SourcePos): CE {
    const c = this.lvalue(target);
    if (!isNumeric(c.t)) this.err(`${op} needs a number variable`, p);
    const lv = c.lv!;
    const d = op === '++' ? 1 : -1;
    const w = wrapper(c.t);
    return {
      t: c.t,
      ev: (f) => {
        const old = lv.get(f);
        const nv = w(old + d);
        lv.set(f, nv);
        return post ? old : nv;
      },
    };
  }

  private assign(e: Extract<Expr, { k: 'assign' }>): CE {
    const target = this.lvalue(e.a);
    const lv = target.lv!;
    const t = target.t;
    if (e.op === '=') {
      if (t.k === 'array') {
        if (e.b.k !== 'init') this.err('arrays cannot be assigned as a whole; copy them element by element', e.p);
        const init = this.arrayInit(t, e.b, e.p);
        return { t, ev: (f) => { const v = init(f); lv.set(f, v); return v; } };
      }
      if (t.k === 'struct') {
        const init = this.structInit(t, e.b, e.p);
        return { t, ev: (f) => { const v = init(f); lv.set(f, v); return v; } };
      }
      if (t.k === 'obj') this.err('library objects cannot be reassigned', e.p);
      const rhs = this.coerce(this.expr(e.b), t, e.b.p);
      const ev = rhs.ev;
      if (rhs.gen) {
        const g = rhs.gen;
        return {
          t,
          ev: (f) => { const v = ev(f); lv.set(f, v); return v; },
          gen: function* (f) { const v = yield* g(f); lv.set(f, v); return v; },
        };
      }
      return { t, ev: (f) => { const v = ev(f); lv.set(f, v); return v; } };
    }
    const op = e.op.slice(0, -1);
    if (t.k === 'string') {
      const rhs = this.expr(e.b);
      if (op !== '+') this.err(`only += works on String`, e.p);
      const rt = rhs.t;
      const ev = rhs.ev;
      return { t, ev: (f) => { const v = this.joined((lv.get(f) as string) + fmtValue(ev(f), rt, undefined, true), e.p); lv.set(f, v); return v; } };
    }
    const cur: CE = { t, ev: (f) => lv.get(f) };
    const res = this.coerce(this.binary(op, cur, this.expr(e.b), e.p), t, e.p);
    const ev = res.ev;
    return { t, ev: (f) => { const v = ev(f); lv.set(f, v); return v; } };
  }

  private binary(op: string, a: CE, b: CE, p: SourcePos): CE {
    const env = this.env;
    if (op === '&&' || op === '||') {
      const ta = truthy(a);
      const tb = truthy(b);
      const cv = a.cv !== undefined && b.cv !== undefined ? (op === '&&' ? (a.cv && b.cv ? 1 : 0) : (a.cv || b.cv ? 1 : 0)) : undefined;
      return op === '&&' ? { t: T.bool, ev: (f) => (ta(f) && tb(f) ? 1 : 0), cv } : { t: T.bool, ev: (f) => (ta(f) || tb(f) ? 1 : 0), cv };
    }
    const textA = a.t.k === 'string' || a.t.k === 'cstr';
    const textB = b.t.k === 'string' || b.t.k === 'cstr';
    if (textA || textB) return this.textOp(op, a, b, p);
    if (!isNumeric(a.t) || !isNumeric(b.t)) {
      const bad = !isNumeric(a.t) ? a.t : b.t;
      this.err(`'${op}' cannot be used with a ${bad.k === 'void' ? 'void result' : tyName(bad)}`, p);
    }
    const shift = op === '<<' || op === '>>';
    const t = shift ? env.promote(a.t) : env.common(a.t, b.t);
    const ca = this.coerce(a, t, p).ev;
    const cb = shift ? this.coerce(b, env.int, p).ev : this.coerce(b, t, p).ev;
    const cmp = ['==', '!=', '<', '>', '<=', '>='].includes(op);
    const fn = cmp ? compare(op) : arith(op, t, p);
    const ev = (f: Frame) => fn(ca(f), cb(f));
    let cv: number | undefined;
    if (a.cv !== undefined && b.cv !== undefined) {
      try {
        cv = ev({ v: [] });
      } catch {
        cv = undefined;
      }
    }
    if (op === '/' && b.cv === 0) this.err('division by zero', p);
    return { t: cmp ? T.bool : t, ev, cv };
  }

  private textOp(op: string, a: CE, b: CE, p: SourcePos): CE {
    const sa = a.t.k === 'string';
    const sb = b.t.k === 'string';
    const ea = a.ev;
    const eb = b.ev;
    if (op === '+') {
      if (!sa && !sb) {
        if (a.t.k === 'cstr' && b.t.k === 'cstr') this.err('two pieces of text cannot be added with +', p, 'make one of them a String: String("a") + "b"');
        this.err('adding a number to a text literal moves a pointer in C++, it does not join text', p, 'wrap the text in String(…) first: String("count: ") + n');
      }
      const ta = a.t;
      const tb = b.t;
      return { t: T.string, ev: (f) => this.joined(fmtValue(ea(f), ta, undefined, true) + fmtValue(eb(f), tb, undefined, true), p) };
    }
    if (['==', '!=', '<', '>', '<=', '>='].includes(op)) {
      const ta = a.t;
      const tb = b.t;
      if (!(ta.k === 'string' || ta.k === 'cstr') || !(tb.k === 'string' || tb.k === 'cstr')) {
        // String == 'c' style comparisons.
        const c = compare(op);
        return { t: T.bool, ev: (f) => c(String(fmtValue(ea(f), ta, undefined, true)) as unknown as number, String(fmtValue(eb(f), tb, undefined, true)) as unknown as number) };
      }
      const c = compare(op);
      return { t: T.bool, ev: (f) => c(ea(f), eb(f)) };
    }
    this.err(`'${op}' does not work on text`, p);
  }

  private call(e: Extract<Expr, { k: 'call' }>): CE {
    const rt = this.rt;
    const env = this.env;
    // Method call: obj.method(…) or str.method(…)
    if (e.fn.k === 'member') {
      const obj = this.expr(e.fn.a);
      const name = e.fn.name;
      if (obj.t.k === 'string' || obj.t.k === 'cstr') {
        const m = LIBS.String.methods[name];
        if (!m) this.err(`String has no method ${name}()`, e.fn.p, didYouMean(name, Object.keys(LIBS.String.methods)) ? `did you mean ${didYouMean(name, Object.keys(LIBS.String.methods))}()?` : undefined);
        const args = e.args.map((a) => this.expr(a));
        const types = args.map((a) => a.t);
        const ret = typeof m.ret === 'function' ? m.ret(types, env) : env.named(m.ret) ?? T.void;
        const oe = obj.ev;
        const lv = obj.lv;
        const evs = args.map((a) => a.ev);
        return {
          t: ret,
          ev: (f) => {
            const self = { v: oe(f) as string };
            const r = positioned(e.p, () => m.fn!(rt, self, evs.map((x) => x(f)), types));
            if (lv && self.v !== oe(f)) lv.set(f, self.v);
            return r;
          },
        };
      }
      if (obj.t.k !== 'obj') this.err(`${obj.name ?? 'this'} is not an object, so .${name}() cannot be called on it`, e.fn.p);
      const lib = LIBS[obj.t.cls];
      const m = lib?.methods[name];
      if (!m) {
        const guess = lib ? didYouMean(name, Object.keys(lib.methods)) : undefined;
        this.err(`${obj.t.cls} has no method ${name}()`, e.fn.p, guess ? `did you mean ${guess}()?` : undefined);
      }
      const args = e.args.map((a) => this.expr(a));
      if (m.min !== undefined && args.length < m.min) this.err(`${obj.t.cls}.${name}() needs at least ${m.min} argument${m.min === 1 ? '' : 's'}`, e.p);
      const types = args.map((a) => a.t);
      const ret = typeof m.ret === 'function' ? m.ret(types, env) : env.named(m.ret) ?? T.void;
      const oe = obj.ev;
      const evs = args.map((a) => a.ev);
      const p = e.p;
      if (m.gen) {
        const mg = m.gen;
        const run = function* (f: Frame): Gen<CValue> {
          try {
            return yield* mg(rt, oe(f), evs.map((x) => x(f)), types);
          } catch (err) {
            throw atCall(err, p);
          }
        };
        return { t: ret, ev: (f) => rt.runSync(run(f)), gen: run };
      }
      const mf = m.fn!;
      if (m.pure) return { t: ret, ev: (f) => positioned(p, () => mf(rt, oe(f), evs.map((x) => x(f)), types)) };
      return { t: ret, ev: (f) => { rt.fx++; return positioned(p, () => mf(rt, oe(f), evs.map((x) => x(f)), types)); } };
    }
    if (e.fn.k !== 'id') this.err('only named functions can be called', e.p);
    const name = e.fn.name;
    const sym = this.lookup(name);
    if (sym?.kind === 'fn') {
      if (e.args.length !== sym.params.length) this.err(`${name}() takes ${sym.params.length} argument${sym.params.length === 1 ? '' : 's'} but got ${e.args.length}`, e.p);
      const args = e.args.map((a, i) => {
        const pt = sym.params[i];
        if (pt.ref) {
          const c = this.lvalue(a);
          const lv = c.lv!;
          return (f: Frame) => ({ get: () => lv.get(f), set: (v: unknown) => lv.set(f, v) }) as Ref;
        }
        if (pt.t.k === 'struct') {
          const c = this.expr(a);
          return (f: Frame) => cloneValue(c.ev(f));
        }
        return this.coerce(this.expr(a), pt.t, a.p).ev;
      });
      const run = function* (f: Frame): Gen<CValue> {
        const vals = args.map((x) => x(f));
        return yield* sym.call!(vals);
      };
      return { t: sym.ret, ev: (f) => rt.runSync(run(f)), gen: run };
    }
    if (sym?.kind === 'var' && sym.t.k === 'fn') {
      const c = this.ident(name, e.p);
      const run = function* (f: Frame): Gen<CValue> {
        return yield* rt.invoke(c.ev(f), []);
      };
      return { t: T.void, ev: (f) => rt.runSync(run(f)), gen: run };
    }
    // Type constructors: String(x), int(x), Servo().
    if (name === 'String') return this.stringCtor(e);
    const asType = env.named(name === 'boolean' ? 'bool' : name === 'word' ? 'uint16_t' : name);
    if (asType && name !== 'cstr') {
      if (e.args.length !== 1) this.err(`${name}(…) takes one value`, e.p);
      return this.coerce(this.expr(e.args[0]), asType, e.p);
    }
    const ctor = LIBS[name];
    if (ctor && !sym) {
      const ty = this.type({ base: name, ptr: 0, isConst: false, isStatic: false, isVolatile: false, rtc: false, ref: false }, e.p);
      const args = e.args.map((a) => this.expr(a));
      return { t: ty, ev: (f) => ctor.create(rt, args.map((a) => a.ev(f)), args.map((a) => a.t)) };
    }
    const b = BUILTINS[name];
    if (!b) {
      if (sym) this.err(`'${name}' is a variable, not a function`, e.p);
      const guess = didYouMean(name, [...Object.keys(BUILTINS), ...this.allNames()]);
      this.err(`'${name}' was not declared`, e.fn.p, guess ? `did you mean ${guess}()?` : undefined);
    }
    return this.builtinCall(name, b, e);
  }

  private stringCtor(e: Extract<Expr, { k: 'call' }>): CE {
    const args = e.args.map((a) => this.expr(a));
    if (args.length === 0) return { t: T.string, ev: () => '' };
    const a = args[0];
    const fmt = args[1];
    const at = a.t;
    const ae = a.ev;
    if (at.k === 'array') return { t: T.string, ev: (f) => charsToString(ae(f)) };
    const fe = fmt?.ev;
    return { t: T.string, ev: (f) => fmtValue(ae(f), at, fe ? fe(f) : undefined, true) };
  }

  private builtinCall(name: string, b: Builtin, e: Extract<Expr, { k: 'call' }>): CE {
    const rt = this.rt;
    const env = this.env;
    if (b.boards && !b.boards(rt.world.profile)) this.err(`${name}() does not exist on ${rt.world.profile.name}`, e.fn.p, b.boardHint);
    if (b.header && !rt.includes.has(b.header)) this.err(`${name}() needs #include <${b.header}>`, e.fn.p);
    if (e.args.length < b.min || e.args.length > b.max) {
      this.err(`${name}() takes ${b.min === b.max ? b.min : `${b.min} to ${b.max}`} argument${b.max === 1 ? '' : 's'} but got ${e.args.length}`, e.p);
    }
    const args = e.args.map((a) => this.expr(a));
    const types = args.map((a) => a.t);
    const ret = typeof b.ret === 'function' ? b.ret(types, env) : env.named(b.ret) ?? T.void;
    const evs = args.map((a, i) => (b.fnArgs?.includes(i) && a.t.k !== 'fn' ? this.err(`argument ${i + 1} of ${name}() must be a function name`, e.args[i].p) : a.ev));
    const fine = b.fineClock;
    const p = e.p;
    if (b.gen) {
      const bg = b.gen;
      const run = function* (f: Frame): Gen<CValue> {
        const vals = evs.map((x) => x(f));
        if (fine) rt.fineClock++;
        return yield* bg(rt, vals, types);
      };
      return { t: ret, ev: (f) => positioned(p, () => rt.runSync(run(f))), gen: run };
    }
    const bf = b.fn!;
    const pure = b.pure;
    let cv: number | undefined;
    if (b.constFold && args.every((a) => a.cv !== undefined)) cv = bf(rt, args.map((a) => a.cv), types) as number;
    return {
      t: ret,
      cv,
      ev: (f) => {
        const vals = evs.map((x) => x(f));
        if (fine) rt.fineClock++;
        if (!pure) rt.fx++;
        return positioned(p, () => bf(rt, vals, types));
      },
    };
  }
}

// Helpers ------------------------------------------------------------------------

/** An error a library raised without a line gets the line of the call. */
function atCall(err: unknown, p: SourcePos): unknown {
  return err instanceof InterpError && !err.line ? err.at(p) : err;
}

function positioned<R>(p: SourcePos, run: () => R): R {
  try {
    return run();
  } catch (err) {
    throw atCall(err, p);
  }
}

function truthy(c: CE): (f: Frame) => boolean {
  const ev = c.ev;
  if (c.t.k === 'obj' || c.t.k === 'fn') return () => true;
  if (c.t.k === 'string' || c.t.k === 'cstr') return () => true;
  return (f) => !!ev(f);
}

function zero(t: Ty, env: TypeEnv): () => unknown {
  switch (t.k) {
    case 'array': {
      const z = zero(t.el, env);
      return () => Array.from({ length: t.n }, z);
    }
    case 'struct': {
      const zs = [...t.fields].map(([n, ft]) => [n, zero(ft, env)] as const);
      return () => Object.fromEntries(zs.map(([n, z]) => [n, z()]));
    }
    case 'string':
    case 'cstr':
      return () => '';
    default:
      return () => 0;
  }
}

function cloneValue(v: CValue): CValue {
  if (Array.isArray(v)) return v.map(cloneValue);
  if (v && typeof v === 'object' && !('get' in v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cloneValue(x)]));
  return v;
}


function compare(op: string): (a: number, b: number) => number {
  switch (op) {
    case '==': return (a, b) => (a === b ? 1 : 0);
    case '!=': return (a, b) => (a !== b ? 1 : 0);
    case '<': return (a, b) => (a < b ? 1 : 0);
    case '>': return (a, b) => (a > b ? 1 : 0);
    case '<=': return (a, b) => (a <= b ? 1 : 0);
    default: return (a, b) => (a >= b ? 1 : 0);
  }
}

function arith(op: string, t: Ty, p: SourcePos): (a: number, b: number) => number {
  const w = wrapper(t);
  if (t.k === 'float') {
    switch (op) {
      case '+': return (a, b) => w(a + b);
      case '-': return (a, b) => w(a - b);
      case '*': return (a, b) => w(a * b);
      case '/': return (a, b) => w(a / b);
      case '%': throw new InterpError('compile', '% only works on whole numbers', p, 'use fmod(a, b) for decimals');
      default: throw new InterpError('compile', `'${op}' only works on whole numbers, not decimals`, p);
    }
  }
  const signed = t.k === 'int' ? t.signed : true;
  const bits = t.k === 'int' ? t.bits : 32;
  const divZero = () => {
    throw new InterpError('runtime', 'division by zero', p, 'a real board returns garbage or hangs; check the divisor first');
  };
  switch (op) {
    case '+': return (a, b) => w(a + b);
    case '-': return (a, b) => w(a - b);
    case '*':
      if (bits === 32) return signed ? (a, b) => Math.imul(a, b) : (a, b) => Math.imul(a, b) >>> 0;
      if (bits === 64) return (a, b) => w(Number(BigInt(Math.trunc(a)) * BigInt(Math.trunc(b))));
      return (a, b) => w(a * b);
    case '/': return (a, b) => (b === 0 ? divZero() : w(Math.trunc(a / b)));
    case '%': return (a, b) => (b === 0 ? divZero() : w(a % b));
    case '&': return (a, b) => w(bits === 64 ? Number(BigInt(a) & BigInt(b)) : a & b);
    case '|': return (a, b) => w(bits === 64 ? Number(BigInt(a) | BigInt(b)) : a | b);
    case '^': return (a, b) => w(bits === 64 ? Number(BigInt(a) ^ BigInt(b)) : a ^ b);
    case '<<': return (a, b) => (b >= bits ? 0 : bits === 64 ? w(Number(BigInt(a) << BigInt(b))) : w(a << b));
    case '>>': return signed ? (a, b) => w(a >> Math.min(b, 31)) : (a, b) => (b >= 32 ? 0 : w(a >>> b));
  }
  throw new InterpError('compile', `unknown operator ${op}`, p);
}
