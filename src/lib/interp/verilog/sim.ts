import { InterpError, didYouMean, syntaxError, unsupported, type SourcePos } from '../errors';
import type { BoardProfile } from '../profiles';

/**
 * Verilog subset simulator: modules with ANSI or plain port lists, wire/reg
 * vectors up to 32 bits, assign, always @(posedge clk [or posedge rst]),
 * always @*, initial, if/case, blocking and nonblocking assignment, for loops,
 * concatenation, replication, bit and part selects, parameter/localparam with
 * #(.P(v)) overrides, and module instances (flattened). Cycle based: one clock
 * edge per step, then the combinational logic settles.
 */

// Lexer ------------------------------------------------------------------------------

interface Tok {
  k: 'id' | 'num' | 'str' | 'op' | 'eof';
  v: string;
  line: number;
  col: number;
  n?: { value: number; width: number | null };
}

const OPS = ['<<<', '>>>', '===', '!==', '+:', '-:', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '~&', '~|', '~^', '^~', '**',
  '+', '-', '*', '/', '%', '<', '>', '=', '!', '~', '&', '|', '^', '?', ':', ';', ',', '.', '(', ')', '[', ']', '{', '}', '@', '#'];

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  let line = 1;
  let ls = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') {
      line++;
      i++;
      ls = i;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') {
          line++;
          ls = i + 1;
        }
        i++;
      }
      i += 2;
      continue;
    }
    const pos = { line, col: i - ls + 1 };
    if (c === '`') {
      // Compiler directives (`timescale, `default_nettype) do not affect a cycle simulation.
      const m = /^`(\w+)/.exec(src.slice(i));
      if (m && (m[1] === 'define' || m[1] === 'ifdef' || m[1] === 'include')) throw unsupported(`\`${m[1]}`, pos, 'use a parameter or localparam instead');
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[\w$]/.test(src[j])) j++;
      out.push({ k: 'id', v: src.slice(i, j), ...pos });
      i = j;
      continue;
    }
    if (/[0-9']/.test(c)) {
      const m = /^(\d[\d_]*)?\s*'([sS]?)([bBoOdDhH])\s*([0-9a-fA-FxXzZ_?]+)/.exec(src.slice(i));
      if (m) {
        const width = m[1] ? parseInt(m[1].replace(/_/g, ''), 10) : null;
        const base = { b: 2, o: 8, d: 10, h: 16 }[m[3].toLowerCase() as 'b']!;
        const digits = m[4].replace(/_/g, '');
        if (/[xXzZ?]/.test(digits)) throw unsupported('x and z values', pos, 'the simulator is 2-state: use 0 or 1');
        const value = parseInt(digits, base);
        if (width !== null && width > 32) throw unsupported('vectors wider than 32 bits', pos);
        out.push({ k: 'num', v: m[0], ...pos, n: { value: width !== null && width < 32 ? value % 2 ** width : value, width } });
        i += m[0].length;
        continue;
      }
      const d = /^\d[\d_]*/.exec(src.slice(i));
      if (d) {
        out.push({ k: 'num', v: d[0], ...pos, n: { value: parseInt(d[0].replace(/_/g, ''), 10), width: null } });
        i += d[0].length;
        continue;
      }
    }
    if (c === '"') {
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\\' && src[j + 1] === 'n') {
          s += '\n';
          j += 2;
          continue;
        }
        s += src[j++];
      }
      out.push({ k: 'str', v: s, ...pos });
      i = j + 1;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw syntaxError(`unexpected character '${c}'`, pos);
    out.push({ k: 'op', v: op, ...pos });
    i += op.length;
  }
  out.push({ k: 'eof', v: '', line, col: i - ls + 1 });
  return out;
}

// AST -----------------------------------------------------------------------------------

type VExpr =
  | { k: 'num'; p: SourcePos; value: number; width: number | null }
  | { k: 'id'; p: SourcePos; name: string }
  | { k: 'sel'; p: SourcePos; a: VExpr; msb: VExpr; lsb?: VExpr; mode?: '+:' | '-:' }
  | { k: 'un'; p: SourcePos; op: string; a: VExpr }
  | { k: 'bin'; p: SourcePos; op: string; a: VExpr; b: VExpr }
  | { k: 'cond'; p: SourcePos; c: VExpr; a: VExpr; b: VExpr }
  | { k: 'cat'; p: SourcePos; items: VExpr[] }
  | { k: 'rep'; p: SourcePos; n: VExpr; items: VExpr[] };

type VStmt =
  | { k: 'block'; p: SourcePos; body: VStmt[] }
  | { k: 'assign'; p: SourcePos; nb: boolean; lhs: VExpr; rhs: VExpr }
  | { k: 'if'; p: SourcePos; c: VExpr; a: VStmt; b?: VStmt }
  | { k: 'case'; p: SourcePos; e: VExpr; items: { tests: VExpr[] | null; body: VStmt }[] }
  | { k: 'for'; p: SourcePos; init: VStmt; c: VExpr; step: VStmt; body: VStmt }
  | { k: 'display'; p: SourcePos; fmt: string; args: VExpr[] }
  | { k: 'empty'; p: SourcePos };

interface Decl {
  name: string;
  kind: 'input' | 'output' | 'wire' | 'reg' | 'integer';
  msb: VExpr | null;
  lsb: VExpr | null;
  init?: VExpr;
  p: SourcePos;
  isReg: boolean;
}

interface ModuleAst {
  name: string;
  p: SourcePos;
  params: { name: string; value: VExpr; local: boolean }[];
  ports: string[];
  decls: Decl[];
  assigns: { lhs: VExpr; rhs: VExpr; p: SourcePos }[];
  always: { sens: { edge: 'pos' | 'neg' | null; name: string }[] | '*'; body: VStmt; p: SourcePos }[];
  initials: VStmt[];
  instances: { mod: string; name: string; params: { name: string | null; value: VExpr }[]; conns: { port: string | null; e: VExpr | null }[]; p: SourcePos }[];
}

// Parser ---------------------------------------------------------------------------------

class VParser {
  private i = 0;
  constructor(private t: Tok[]) {}
  private get c(): Tok {
    return this.t[this.i];
  }
  private is(v: string): boolean {
    return (this.c.k === 'op' || this.c.k === 'id') && this.c.v === v;
  }
  private eat(v: string): boolean {
    if (this.is(v)) {
      this.i++;
      return true;
    }
    return false;
  }
  private expect(v: string): Tok {
    if (this.is(v)) return this.t[this.i++];
    const prev = this.t[this.i - 1];
    if (v === ';' && prev) throw syntaxError("expected ';'", { line: prev.line, col: prev.col + prev.v.length });
    throw syntaxError(`expected '${v}' but found ${this.c.k === 'eof' ? 'the end of the file' : `'${this.c.v}'`}`, this.c);
  }
  private ident(): string {
    if (this.c.k !== 'id') throw syntaxError(`expected a name but found '${this.c.v}'`, this.c);
    return this.t[this.i++].v;
  }

  parse(): ModuleAst[] {
    const mods: ModuleAst[] = [];
    while (this.c.k !== 'eof') {
      if (!this.is('module')) throw syntaxError(`expected 'module' but found '${this.c.v}'`, this.c);
      mods.push(this.module());
    }
    if (!mods.length) throw syntaxError('no module found', { line: 1, col: 1 });
    return mods;
  }

  private range(): [VExpr, VExpr] | null {
    if (!this.eat('[')) return null;
    const msb = this.expr();
    this.expect(':');
    const lsb = this.expr();
    this.expect(']');
    return [msb, lsb];
  }

  private module(): ModuleAst {
    const p = this.expect('module');
    const m: ModuleAst = { name: this.ident(), p, params: [], ports: [], decls: [], assigns: [], always: [], initials: [], instances: [] };
    if (this.eat('#')) {
      this.expect('(');
      while (!this.is(')')) {
        this.eat('parameter');
        this.eat('integer');
        this.range();
        const name = this.ident();
        this.expect('=');
        m.params.push({ name, value: this.expr(), local: false });
        if (!this.eat(',')) break;
      }
      this.expect(')');
    }
    if (this.eat('(')) {
      let dir: 'input' | 'output' | null = null;
      let isReg = false;
      let rng: [VExpr, VExpr] | null = null;
      while (!this.is(')')) {
        if (this.is('input') || this.is('output') || this.is('inout')) {
          if (this.is('inout')) throw unsupported('inout ports', this.c);
          dir = this.ident() as 'input' | 'output';
          isReg = false;
          rng = null;
          if (this.eat('wire')) isReg = false;
          if (this.eat('reg')) isReg = true;
          this.eat('signed');
          rng = this.range();
        }
        const np = this.c;
        const name = this.ident();
        m.ports.push(name);
        if (dir) m.decls.push({ name, kind: dir, msb: rng?.[0] ?? null, lsb: rng?.[1] ?? null, p: np, isReg });
        if (!this.eat(',')) break;
      }
      this.expect(')');
    }
    this.expect(';');
    while (!this.is('endmodule')) {
      if (this.c.k === 'eof') throw syntaxError(`module ${m.name} is missing 'endmodule'`, p);
      this.item(m);
    }
    this.i++;
    return m;
  }

  private item(m: ModuleAst): void {
    const c = this.c;
    if (this.is('input') || this.is('output') || this.is('wire') || this.is('reg') || this.is('integer') || this.is('logic')) {
      let kind = this.ident() as Decl['kind'];
      if ((kind as string) === 'logic') kind = 'reg';
      let isReg = kind === 'reg' || kind === 'integer';
      if (this.eat('reg')) isReg = true;
      this.eat('wire');
      this.eat('signed');
      const rng = kind === 'integer' ? null : this.range();
      do {
        const np = this.c;
        const name = this.ident();
        if (this.is('[')) throw unsupported('memories (arrays of registers)', this.c, 'use a case statement as a lookup table');
        const d: Decl = { name, kind, msb: rng?.[0] ?? null, lsb: rng?.[1] ?? null, p: np, isReg };
        if (kind === 'integer') {
          d.msb = { k: 'num', p: np, value: 31, width: null };
          d.lsb = { k: 'num', p: np, value: 0, width: null };
        }
        if (this.eat('=')) {
          const e = this.expr();
          if (isReg) d.init = e;
          else m.assigns.push({ lhs: { k: 'id', p: np, name }, rhs: e, p: np });
        }
        const existing = m.decls.find((x) => x.name === name);
        if (existing) {
          // "output led; reg led;" in the non-ANSI style.
          if (d.isReg) existing.isReg = true;
          if (d.msb) {
            existing.msb = d.msb;
            existing.lsb = d.lsb;
          }
          if (d.init) existing.init = d.init;
          if (kind === 'input' || kind === 'output') existing.kind = kind;
        } else m.decls.push(d);
      } while (this.eat(','));
      this.expect(';');
      return;
    }
    if (this.is('parameter') || this.is('localparam')) {
      const local = this.ident() === 'localparam';
      this.eat('integer');
      this.range();
      do {
        const name = this.ident();
        this.expect('=');
        m.params.push({ name, value: this.expr(), local });
      } while (this.eat(','));
      this.expect(';');
      return;
    }
    if (this.eat('assign')) {
      do {
        const lhs = this.lvalue();
        this.expect('=');
        m.assigns.push({ lhs, rhs: this.expr(), p: c });
      } while (this.eat(','));
      this.expect(';');
      return;
    }
    if (this.eat('always') || this.eat('always_ff') || this.eat('always_comb')) {
      let sens: { edge: 'pos' | 'neg' | null; name: string }[] | '*' = '*';
      if (this.t[this.i - 1].v === 'always_comb') {
        m.always.push({ sens: '*', body: this.stmt(), p: c });
        return;
      }
      this.expect('@');
      if (this.eat('*')) sens = '*';
      else {
        this.expect('(');
        if (this.eat('*')) sens = '*';
        else {
          sens = [];
          do {
            let edge: 'pos' | 'neg' | null = null;
            if (this.eat('posedge')) edge = 'pos';
            else if (this.eat('negedge')) edge = 'neg';
            sens.push({ edge, name: this.ident() });
          } while (this.eat('or') || this.eat(','));
        }
        this.expect(')');
      }
      m.always.push({ sens, body: this.stmt(), p: c });
      return;
    }
    if (this.eat('initial')) {
      m.initials.push(this.stmt());
      return;
    }
    if (this.is('function') || this.is('task') || this.is('generate') || this.is('genvar')) throw unsupported(`'${c.v}'`, c);
    if (c.k === 'id') {
      // Module instance: name #(...) inst ( .port(expr), ... );
      const mod = this.ident();
      const params: { name: string | null; value: VExpr }[] = [];
      if (this.eat('#')) {
        this.expect('(');
        while (!this.is(')')) {
          if (this.eat('.')) {
            const name = this.ident();
            this.expect('(');
            params.push({ name, value: this.expr() });
            this.expect(')');
          } else params.push({ name: null, value: this.expr() });
          if (!this.eat(',')) break;
        }
        this.expect(')');
      }
      const name = this.ident();
      this.expect('(');
      const conns: { port: string | null; e: VExpr | null }[] = [];
      while (!this.is(')')) {
        if (this.eat('.')) {
          const port = this.ident();
          this.expect('(');
          conns.push({ port, e: this.is(')') ? null : this.expr() });
          this.expect(')');
        } else conns.push({ port: null, e: this.expr() });
        if (!this.eat(',')) break;
      }
      this.expect(')');
      this.expect(';');
      m.instances.push({ mod, name, params, conns, p: c });
      return;
    }
    throw syntaxError(`unexpected '${c.v}' in module ${m.name}`, c);
  }

  private lvalue(): VExpr {
    if (this.is('{')) {
      const p = this.c;
      this.i++;
      const items: VExpr[] = [];
      do items.push(this.lvalue());
      while (this.eat(','));
      this.expect('}');
      return { k: 'cat', p, items };
    }
    const p = this.c;
    const name = this.ident();
    let e: VExpr = { k: 'id', p, name };
    if (this.eat('[')) e = this.selectRest(e, p);
    return e;
  }

  private selectRest(a: VExpr, p: SourcePos): VExpr {
    const msb = this.expr();
    let e: VExpr;
    if (this.eat(':')) e = { k: 'sel', p, a, msb, lsb: this.expr() };
    else if (this.is('+:') || this.is('-:')) {
      const mode = this.c.v as '+:' | '-:';
      this.i++;
      e = { k: 'sel', p, a, msb, lsb: this.expr(), mode };
    } else e = { k: 'sel', p, a, msb };
    this.expect(']');
    return e;
  }

  private stmt(): VStmt {
    const c = this.c;
    if (this.eat(';')) return { k: 'empty', p: c };
    if (this.eat('begin')) {
      if (this.eat(':')) this.ident();
      const body: VStmt[] = [];
      while (!this.is('end')) {
        if (this.c.k === 'eof') throw syntaxError("'begin' without a matching 'end'", c);
        body.push(this.stmt());
      }
      this.i++;
      return { k: 'block', p: c, body };
    }
    if (this.eat('if')) {
      this.expect('(');
      const cond = this.expr();
      this.expect(')');
      const a = this.stmt();
      const b = this.eat('else') ? this.stmt() : undefined;
      return { k: 'if', p: c, c: cond, a, b };
    }
    if (this.is('case') || this.is('casez') || this.is('casex')) {
      this.i++;
      this.expect('(');
      const e = this.expr();
      this.expect(')');
      const items: { tests: VExpr[] | null; body: VStmt }[] = [];
      while (!this.eat('endcase')) {
        if (this.c.k === 'eof') throw syntaxError("'case' without 'endcase'", c);
        if (this.eat('default')) {
          this.eat(':');
          items.push({ tests: null, body: this.stmt() });
          continue;
        }
        const tests = [this.expr()];
        while (this.eat(',')) tests.push(this.expr());
        this.expect(':');
        items.push({ tests, body: this.stmt() });
      }
      return { k: 'case', p: c, e, items };
    }
    if (this.eat('for')) {
      this.expect('(');
      const init = this.simpleAssign();
      this.expect(';');
      const cond = this.expr();
      this.expect(';');
      const step = this.simpleAssign();
      this.expect(')');
      return { k: 'for', p: c, init, c: cond, step, body: this.stmt() };
    }
    if (c.k === 'id' && (c.v === '$display' || c.v === '$write' || c.v === '$monitor')) {
      this.i++;
      let fmt = '';
      const args: VExpr[] = [];
      if (this.eat('(')) {
        if (this.c.k === 'str') fmt = this.t[this.i++].v;
        while (this.eat(',')) args.push(this.expr());
        this.expect(')');
      }
      this.expect(';');
      return { k: 'display', p: c, fmt: c.v === '$write' ? fmt : fmt + '\n', args };
    }
    if (c.k === 'id' && c.v.startsWith('$')) {
      // $finish, $stop and friends: ignored in a board simulation.
      while (!this.is(';')) this.i++;
      this.i++;
      return { k: 'empty', p: c };
    }
    if (this.is('#')) throw unsupported('# delays', c, 'designs on the board are clocked: count clock cycles instead of using #delays');
    const s = this.simpleAssign();
    this.expect(';');
    return s;
  }

  private simpleAssign(): VStmt {
    const p = this.c;
    const lhs = this.lvalue();
    let nb = false;
    if (this.eat('<=')) nb = true;
    else this.expect('=');
    return { k: 'assign', p, nb, lhs, rhs: this.expr() };
  }

  expr(): VExpr {
    const c = this.bin(0);
    if (this.is('?')) {
      const p = this.c;
      this.i++;
      const a = this.expr();
      this.expect(':');
      return { k: 'cond', p, c, a, b: this.expr() };
    }
    return c;
  }

  private static PREC: Record<string, number> = {
    '||': 1, '&&': 2, '|': 3, '~|': 3, '^': 4, '~^': 4, '^~': 4, '&': 5, '~&': 5, '==': 6, '!=': 6, '===': 6, '!==': 6,
    '<': 7, '<=': 7, '>': 7, '>=': 7, '<<': 8, '>>': 8, '<<<': 8, '>>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10, '**': 11,
  };

  private bin(min: number): VExpr {
    let a = this.unary();
    while (true) {
      const c = this.c;
      const pr = c.k === 'op' ? VParser.PREC[c.v] : undefined;
      if (pr === undefined || pr <= min) return a;
      this.i++;
      a = { k: 'bin', p: c, op: c.v, a, b: this.bin(pr) };
    }
  }

  private unary(): VExpr {
    const c = this.c;
    if (c.k === 'op' && ['!', '~', '-', '+', '&', '|', '^', '~&', '~|', '~^'].includes(c.v)) {
      this.i++;
      return { k: 'un', p: c, op: c.v, a: this.unary() };
    }
    return this.primary();
  }

  private primary(): VExpr {
    const c = this.c;
    if (c.k === 'num') {
      this.i++;
      return { k: 'num', p: c, value: c.n!.value, width: c.n!.width };
    }
    if (c.k === 'id') {
      this.i++;
      let e: VExpr = { k: 'id', p: c, name: c.v };
      while (this.eat('[')) e = this.selectRest(e, c);
      return e;
    }
    if (this.eat('(')) {
      const e = this.expr();
      this.expect(')');
      return e;
    }
    if (this.eat('{')) {
      const first = this.expr();
      if (this.eat('{')) {
        const items: VExpr[] = [];
        do items.push(this.expr());
        while (this.eat(','));
        this.expect('}');
        this.expect('}');
        return { k: 'rep', p: c, n: first, items };
      }
      const items = [first];
      while (this.eat(',')) items.push(this.expr());
      this.expect('}');
      return { k: 'cat', p: c, items };
    }
    throw syntaxError(`unexpected '${c.v || 'end of file'}' in an expression`, c);
  }
}

// Elaboration and simulation -----------------------------------------------------------------

const mask = (w: number) => (w >= 32 ? 0xffffffff : (2 ** w) - 1);
const m32 = (v: number) => v >>> 0;

interface Sig {
  name: string;
  w: number;
  isReg: boolean;
}

type Ev = (s: Float64Array) => number;
interface CExpr {
  ev: Ev;
  w: number;
  cv?: number;
}
type Exec = (s: Float64Array) => void;

/**
 * The clock a design with a `CLK_HZ` parameter runs at in the simulator. Its counters are written against CLK_HZ
 * (`localparam HALF = CLK_HZ / 2`), so the simulator sets CLK_HZ to this rate and clocks the design at it: a 1 Hz
 * blink takes 100 000 cycles instead of 100 million, and simulated time still matches the board's.
 */
export const SIM_CLOCK_HZ = 100_000;

/**
 * How long an LED and the eye average a light that switches (16 ms of simulated time): a multiplexed 7-segment digit
 * and a PWM-dimmed LED show as steady brightness, as they do on the board.
 */
const PERSIST_S = 0.016;

/** A compiled design ready to clock. */
export interface VerilogSim {
  /** The rate the design is clocked at: the board's oscillator, or SIM_CLOCK_HZ for a design with CLK_HZ. */
  readonly clockHz: number;
  readonly cycles: number;
  /** Run `n` clock cycles. */
  run(n: number): void;
  setInput(name: string, value: number): void;
  outputs(): Record<string, number>;
  /** Per output port, per bit: the fraction of recent time it was high (PERSIST_S average). */
  duty(): Record<string, number[]>;
  /** Per digit [a, b, c, d, e, f, g, dp], how brightly it is lit (PERSIST_S average): Basys 3 digits, or DE10-Lite HEX displays. */
  seg7(): number[][];
  /** $display output callback. */
  onPrint: (text: string) => void;
}

export function compileVerilog(source: string, profile: BoardProfile, overrides: Record<string, number>): VerilogSim {
  const mods = new VParser(lex(source)).parse();
  const byName = new Map(mods.map((m) => [m.name, m]));
  const used = new Set(mods.flatMap((m) => m.instances.map((i) => i.mod)));
  const tops = mods.filter((m) => !used.has(m.name));
  const top = tops.find((m) => m.name === 'top') ?? tops[tops.length - 1] ?? mods[0];
  const fpga = profile.fpga;
  if (!fpga) throw new InterpError('compile', `${profile.name} is not an FPGA board`, null);

  const sigs: Sig[] = [];
  const index = new Map<string, number>();
  const combs: Exec[] = [];
  const seqs: { edges: { sig: number; edge: 'pos' | 'neg' }[]; run: Exec }[] = [];
  const inits: Exec[] = [];
  const nba: number[] = [];
  let onPrint: (t: string) => void = () => {};

  const newSig = (name: string, w: number, isReg: boolean, p: SourcePos) => {
    if (w > 32) throw unsupported('vectors wider than 32 bits', p);
    if (index.has(name)) throw new InterpError('compile', `'${name.split('.').pop()}' is declared twice`, p);
    index.set(name, sigs.length);
    sigs.push({ name, w, isReg });
    return sigs.length - 1;
  };

  const elaborate = (m: ModuleAst, prefix: string, paramOverrides: Map<string, number>, depth: number): void => {
    if (depth > 16) throw new InterpError('compile', 'modules instantiate each other too deeply', m.p);
    const params = new Map<string, number>();
    const scope = (n: string) => prefix + n;
    const constOf = (e: VExpr): number => {
      const c = compileExpr(e);
      if (c.cv === undefined) throw new InterpError('compile', 'this must be a constant (a number or a parameter)', e.p);
      return c.cv;
    };
    const lookupSig = (name: string, p: SourcePos): number => {
      const i = index.get(scope(name));
      if (i === undefined) {
        const near = didYouMean(name, [...m.decls.map((d) => d.name), ...params.keys()]);
        throw new InterpError('compile', `'${name}' is not declared in module ${m.name}`, p, near ? `did you mean '${near}'?` : `declare it: wire ${name}; or reg ${name};`);
      }
      return i;
    };

    function compileExpr(e: VExpr): CExpr {
      switch (e.k) {
        case 'num': {
          const v = m32(e.value);
          return { ev: () => v, w: e.width ?? 32, cv: v };
        }
        case 'id': {
          if (params.has(e.name)) {
            const v = params.get(e.name)!;
            return { ev: () => v, w: 32, cv: v };
          }
          const i = lookupSig(e.name, e.p);
          return { ev: (s) => s[i], w: sigs[i].w };
        }
        case 'sel': {
          const base = compileExpr(e.a);
          const msb = compileExpr(e.msb);
          if (e.lsb === undefined) {
            if (msb.cv !== undefined) {
              const b = msb.cv;
              return { ev: (s) => (base.ev(s) >>> b) & 1, w: 1 };
            }
            return { ev: (s) => (base.ev(s) >>> msb.ev(s)) & 1, w: 1 };
          }
          const lsb = compileExpr(e.lsb);
          if (e.mode) {
            const width = lsb.cv;
            if (width === undefined) throw new InterpError('compile', 'the width of an indexed part-select must be constant', e.p);
            const mk = mask(width);
            const plus = e.mode === '+:';
            return { ev: (s) => (base.ev(s) >>> (plus ? msb.ev(s) : msb.ev(s) - width + 1)) & mk, w: width };
          }
          if (msb.cv === undefined || lsb.cv === undefined) throw new InterpError('compile', 'part-select bounds must be constant', e.p);
          const lo = lsb.cv;
          const width = msb.cv - lo + 1;
          if (width <= 0) throw new InterpError('compile', 'write part-selects as [msb:lsb], for example led[7:0]', e.p);
          const mk = mask(width);
          return { ev: (s) => (base.ev(s) >>> lo) & mk, w: width };
        }
        case 'un': {
          const a = compileExpr(e.a);
          const w = a.w;
          const mk = mask(w);
          const fold = (fn: Ev, width: number): CExpr => (a.cv !== undefined ? { ev: fn, w: width, cv: fn(new Float64Array(0)) } : { ev: fn, w: width });
          switch (e.op) {
            case '!': return fold((s) => (a.ev(s) ? 0 : 1), 1);
            case '~': return fold((s) => m32(~a.ev(s)) & mk, w);
            case '-': return fold((s) => m32(-a.ev(s)) & mk, w);
            case '+': return a;
            case '&': return fold((s) => ((a.ev(s) & mk) === mk ? 1 : 0), 1);
            case '~&': return fold((s) => ((a.ev(s) & mk) === mk ? 0 : 1), 1);
            case '|': return fold((s) => (a.ev(s) ? 1 : 0), 1);
            case '~|': return fold((s) => (a.ev(s) ? 0 : 1), 1);
            case '^': return fold((s) => parity(a.ev(s)), 1);
            default: return fold((s) => 1 - parity(a.ev(s)), 1);
          }
        }
        case 'bin': {
          const a = compileExpr(e.a);
          const b = compileExpr(e.b);
          const w = Math.max(a.w, b.w);
          const mk = mask(w);
          let fn: Ev;
          let rw = w;
          switch (e.op) {
            case '+': fn = (s) => m32(a.ev(s) + b.ev(s)) & mk; break;
            case '-': fn = (s) => m32(a.ev(s) - b.ev(s)) & mk; break;
            case '*': fn = (s) => m32(Math.imul(a.ev(s), b.ev(s))) & mk; break;
            case '/': fn = (s) => { const d = b.ev(s); return d ? Math.floor(a.ev(s) / d) : 0; }; break;
            case '%': fn = (s) => { const d = b.ev(s); return d ? a.ev(s) % d : 0; }; break;
            case '**': fn = (s) => m32(a.ev(s) ** b.ev(s)) & mk; break;
            case '&': fn = (s) => m32(a.ev(s) & b.ev(s)); break;
            case '|': fn = (s) => m32(a.ev(s) | b.ev(s)); break;
            case '^': fn = (s) => m32(a.ev(s) ^ b.ev(s)); break;
            case '~^': case '^~': fn = (s) => m32(~(a.ev(s) ^ b.ev(s))) & mk; break;
            case '<<': case '<<<': rw = a.w; fn = (s) => { const n = b.ev(s); return n >= 32 ? 0 : m32(a.ev(s) << n) & mask(a.w); }; break;
            case '>>': case '>>>': rw = a.w; fn = (s) => { const n = b.ev(s); return n >= 32 ? 0 : a.ev(s) >>> n; }; break;
            case '==': case '===': rw = 1; fn = (s) => (a.ev(s) === b.ev(s) ? 1 : 0); break;
            case '!=': case '!==': rw = 1; fn = (s) => (a.ev(s) !== b.ev(s) ? 1 : 0); break;
            case '<': rw = 1; fn = (s) => (a.ev(s) < b.ev(s) ? 1 : 0); break;
            case '<=': rw = 1; fn = (s) => (a.ev(s) <= b.ev(s) ? 1 : 0); break;
            case '>': rw = 1; fn = (s) => (a.ev(s) > b.ev(s) ? 1 : 0); break;
            case '>=': rw = 1; fn = (s) => (a.ev(s) >= b.ev(s) ? 1 : 0); break;
            case '&&': rw = 1; fn = (s) => (a.ev(s) && b.ev(s) ? 1 : 0); break;
            default: rw = 1; fn = (s) => (a.ev(s) || b.ev(s) ? 1 : 0); break;
          }
          if (a.cv !== undefined && b.cv !== undefined) {
            const v = fn(new Float64Array(0));
            // Constant arithmetic on parameters is 32-bit, not masked to the operand widths.
            const cv = ['+', '-', '*'].includes(e.op) ? m32(e.op === '+' ? a.cv + b.cv : e.op === '-' ? a.cv - b.cv : Math.imul(a.cv, b.cv)) : v;
            return { ev: () => cv, w: rw, cv };
          }
          return { ev: fn, w: rw };
        }
        case 'cond': {
          const c = compileExpr(e.c);
          const a = compileExpr(e.a);
          const b = compileExpr(e.b);
          return { ev: (s) => (c.ev(s) ? a.ev(s) : b.ev(s)), w: Math.max(a.w, b.w) };
        }
        case 'cat':
        case 'rep': {
          const items = e.items.map(compileExpr);
          for (const [k, it] of items.entries()) if (it.cv !== undefined && e.items[k].k === 'num' && (e.items[k] as { width: number | null }).width === null) throw new InterpError('compile', 'numbers inside { } need a size, like 1\'b0 or 4\'d9', e.items[k].p);
          const total = items.reduce((acc, it) => acc + it.w, 0);
          const n = e.k === 'rep' ? compileExpr(e.n).cv : 1;
          if (n === undefined) throw new InterpError('compile', 'the replication count must be constant', e.p);
          if (total * n > 32) throw unsupported('vectors wider than 32 bits', e.p);
          const one: Ev = (s) => {
            let v = 0;
            for (const it of items) v = v * 2 ** it.w + (it.ev(s) & mask(it.w));
            return v;
          };
          if (n === 1) return { ev: one, w: total };
          return { ev: (s) => { const x = one(s); let v = 0; for (let k = 0; k < n; k++) v = v * 2 ** total + x; return v; }, w: total * n };
        }
      }
    }

    /** Store into an lvalue: returns a writer (s, value, nonblocking). */
    const compileLhs = (e: VExpr, allowReg: boolean | null): { w: number; write: (s: Float64Array, v: number, nb: boolean) => void } => {
      if (e.k === 'cat') {
        const parts = e.items.map((x) => compileLhs(x, allowReg));
        const w = parts.reduce((a, p) => a + p.w, 0);
        return {
          w,
          write: (s, v, nb) => {
            let shift = w;
            for (const p of parts) {
              shift -= p.w;
              p.write(s, Math.floor(v / 2 ** shift) & mask(p.w), nb);
            }
          },
        };
      }
      const base = e.k === 'sel' ? e.a : e;
      if (base.k !== 'id') throw new InterpError('compile', 'only signals can be assigned', e.p);
      if (params.has(base.name)) throw new InterpError('compile', `'${base.name}' is a parameter and cannot be assigned`, e.p);
      const i = lookupSig(base.name, e.p);
      const sig = sigs[i];
      if (allowReg === true && !sig.isReg) throw new InterpError('compile', `'${base.name}' is a wire: inside always it must be declared reg`, e.p, `declare it as reg ${base.name}`);
      if (allowReg === false && sig.isReg && !sig.name.includes('.')) {
        // assign to a reg is illegal in Verilog-2001.
        throw new InterpError('compile', `'${base.name}' is a reg: drive it from an always block, or declare it as a wire to use assign`, e.p);
      }
      let lo = 0;
      let w = sig.w;
      let dyn: Ev | null = null;
      if (e.k === 'sel') {
        const msb = compileExpr(e.msb);
        if (e.lsb === undefined) {
          w = 1;
          if (msb.cv !== undefined) lo = msb.cv;
          else dyn = msb.ev;
        } else {
          const lsb = compileExpr(e.lsb);
          if (msb.cv === undefined || lsb.cv === undefined) throw new InterpError('compile', 'part-select bounds must be constant', e.p);
          lo = lsb.cv;
          w = msb.cv - lo + 1;
        }
      }
      const full = mask(sig.w);
      return {
        w,
        write: (s, v, nb) => {
          const at = dyn ? dyn(s) : lo;
          const mk = mask(w) * 2 ** at;
          const nv = (w === sig.w && at === 0 ? v & full : m32((s[i] & ~mk) | ((v * 2 ** at) & mk))) & full;
          if (nb) nba.push(i, nv, mk);
          else s[i] = nv;
        },
      };
    };

    const compileStmt = (st: VStmt): Exec => {
      switch (st.k) {
        case 'empty':
          return () => {};
        case 'block': {
          const body = st.body.map((x) => compileStmt(x));
          return (s) => {
            for (const b of body) b(s);
          };
        }
        case 'assign': {
          const lhs = compileLhs(st.lhs, true);
          const rhs = compileExpr(st.rhs);
          const nb = st.nb;
          return (s) => lhs.write(s, rhs.ev(s), nb);
        }
        case 'if': {
          const c = compileExpr(st.c);
          const a = compileStmt(st.a);
          const b = st.b ? compileStmt(st.b) : null;
          return (s) => {
            if (c.ev(s)) a(s);
            else if (b) b(s);
          };
        }
        case 'case': {
          const e = compileExpr(st.e);
          const items = st.items.map((it) => ({ tests: it.tests?.map(compileExpr) ?? null, body: compileStmt(it.body) }));
          const def = items.find((x) => x.tests === null);
          return (s) => {
            const v = e.ev(s);
            for (const it of items) if (it.tests && it.tests.some((t) => t.ev(s) === v)) return it.body(s);
            def?.body(s);
          };
        }
        case 'for': {
          const init = compileStmt(st.init);
          const c = compileExpr(st.c);
          const step = compileStmt(st.step);
          const body = compileStmt(st.body);
          return (s) => {
            let guard = 0;
            for (init(s); c.ev(s); step(s)) {
              body(s);
              if (++guard > 4096) throw new InterpError('runtime', 'a for loop ran more than 4096 times', st.p);
            }
          };
        }
        case 'display': {
          const args = st.args.map(compileExpr);
          const fmt = st.fmt;
          return (s) => {
            let k = 0;
            onPrint(fmt.replace(/%(\d*)([dbhxos%])/gi, (_m, _w, f: string) => {
              if (f === '%') return '%';
              const v = args[k++]?.ev(s) ?? 0;
              const base = { d: 10, b: 2, h: 16, x: 16, o: 8 }[f.toLowerCase() as 'd'] ?? 10;
              return v.toString(base);
            }));
          };
        }
      }
    };

    // Parameters: defaults, then overrides (from the parent instance or the host).
    for (const prm of m.params) {
      const v = !prm.local && paramOverrides.has(prm.name) ? paramOverrides.get(prm.name)! : constOf(prm.value);
      params.set(prm.name, m32(v));
    }
    for (const k of paramOverrides.keys()) {
      if (!m.params.some((x) => x.name === k && !x.local)) {
        throw new InterpError('compile', `module ${m.name} has no parameter '${k}'`, m.p, m.params.length ? `parameters: ${m.params.filter((x) => !x.local).map((x) => x.name).join(', ')}` : undefined);
      }
    }
    for (const d of m.decls) {
      const w = d.msb ? constOf(d.msb) - constOf(d.lsb!) + 1 : 1;
      if (d.msb && w <= 0) throw new InterpError('compile', `write the range as [msb:lsb], like [7:0]`, d.p);
      const i = newSig(scope(d.name), w, d.isReg, d.p);
      if (d.init) {
        const init = compileExpr(d.init);
        inits.push((s) => (s[i] = init.ev(s) & mask(w)));
      }
    }
    for (const port of m.ports) if (!m.decls.some((d) => d.name === port)) throw new InterpError('compile', `port '${port}' needs a direction: input or output`, m.p);
    for (const a of m.assigns) {
      const lhs = compileLhs(a.lhs, false);
      const rhs = compileExpr(a.rhs);
      combs.push((s) => lhs.write(s, rhs.ev(s), false));
    }
    for (const al of m.always) {
      if (al.sens === '*' || al.sens.every((x) => x.edge === null)) {
        const body = compileStmt(al.body);
        combs.push(body);
        continue;
      }
      if (al.sens.some((x) => x.edge === null)) throw new InterpError('compile', 'mixing edge and level events in one always block is not synthesizable', al.p);
      const edges = al.sens.map((x) => ({ sig: lookupSig(x.name, al.p), edge: x.edge as 'pos' | 'neg' }));
      seqs.push({ edges, run: compileStmt(al.body) });
    }
    for (const st of m.initials) inits.push(compileStmt(st));
    for (const inst of m.instances) {
      const child = byName.get(inst.mod);
      if (!child) throw new InterpError('compile', `unknown module '${inst.mod}'`, inst.p, didYouMean(inst.mod, byName.keys()) ? `did you mean '${didYouMean(inst.mod, byName.keys())}'?` : undefined);
      const ov = new Map<string, number>();
      const childParams = child.params.filter((x) => !x.local);
      inst.params.forEach((pp, k) => {
        const name = pp.name ?? childParams[k]?.name;
        if (!name) throw new InterpError('compile', `too many parameters for ${inst.mod}`, inst.p);
        ov.set(name, constOf(pp.value));
      });
      const childPrefix = `${prefix}${inst.name}.`;
      elaborate(child, childPrefix, ov, depth + 1);
      inst.conns.forEach((cn, k) => {
        const port = cn.port ?? child.ports[k];
        if (!port || !child.ports.includes(port)) throw new InterpError('compile', `${inst.mod} has no port '${cn.port ?? k}'`, inst.p);
        if (!cn.e) return;
        const decl = child.decls.find((d) => d.name === port)!;
        const ci = index.get(childPrefix + port)!;
        if (decl.kind === 'input') {
          const src = compileExpr(cn.e);
          const w = sigs[ci].w;
          combs.push((s) => (s[ci] = src.ev(s) & mask(w)));
        } else {
          const dst = compileLhs(cn.e, null);
          combs.push((s) => dst.write(s, s[ci], false));
        }
      });
    }
  };

  const topOverrides = new Map(Object.entries(overrides));
  const usesClkHz = top.params.some((p) => p.name === 'CLK_HZ' && !p.local);
  if (usesClkHz && !topOverrides.has('CLK_HZ')) topOverrides.set('CLK_HZ', SIM_CLOCK_HZ);
  const clockHz = topOverrides.get('CLK_HZ') ?? profile.clockHz;
  elaborate(top, '', topOverrides, 0);

  // Check the top ports against the board's pins (the constraints file).
  const boardPorts = new Map(fpga.ports.map((p) => [p.name, p]));
  const topDecls = new Map(top.decls.map((d) => [d.name, d]));
  for (const port of top.ports) {
    const bp = boardPorts.get(port);
    const d = topDecls.get(port)!;
    if (!bp) {
      const near = didYouMean(port, boardPorts.keys());
      throw new InterpError('compile', `the ${profile.name} has no pin called '${port}'`, d.p, near ? `did you mean '${near}'? Board ports: ${[...boardPorts.keys()].join(', ')}` : `board ports: ${[...boardPorts.keys()].join(', ')}`);
    }
    if ((bp.dir === 'in') !== (d.kind === 'input')) throw new InterpError('compile', `'${port}' is an ${bp.dir === 'in' ? 'input' : 'output'} on the ${profile.name}`, d.p);
    const w = sigs[index.get(port)!].w;
    if (w > bp.width) throw new InterpError('compile', `'${port}' is ${w} bits wide but the board has ${bp.width}`, d.p);
  }

  const s = new Float64Array(sigs.length);
  for (const init of inits) init(s);
  const clockIdx = index.get(fpga.clockPort) ?? index.get('clk') ?? index.get('CLK100MHZ') ?? index.get('CLOCK_50');
  const activeLowInputs = new Set(fpga.ports.filter((p) => p.dir === 'in' && p.activeLow).map((p) => p.name));
  // Keys idle high on the DE10-Lite (pull-ups, pressed = 0).
  for (const name of activeLowInputs) {
    const i = index.get(name);
    if (i !== undefined) s[i] = mask(sigs[i].w);
  }

  const applyNba = () => {
    for (let k = 0; k < nba.length; k += 3) {
      const i = nba[k];
      const mk = nba[k + 2];
      s[i] = m32((s[i] & ~mk) | (nba[k + 1] & mk)) & mask(sigs[i].w);
    }
    nba.length = 0;
  };
  const settle = () => {
    for (let iter = 0; iter < 64; iter++) {
      let changed = false;
      for (const c of combs) {
        const before = s.slice();
        c(s);
        if (!changed) for (let k = 0; k < s.length; k++) if (s[k] !== before[k]) { changed = true; break; }
      }
      applyNba();
      if (!changed) return;
    }
    throw new InterpError('runtime', 'combinational loop: the logic never settles (a signal depends on itself without a clock)', null, 'put a register (always @(posedge clk)) in the loop');
  };
  // Last seen value of every signal an always block is sensitive to.
  const prev = new Float64Array(sigs.length);
  const edgeSigs = [...new Set(seqs.flatMap((sq) => sq.edges.map((e) => e.sig)))];
  const due: Exec[] = [];
  const fireEdges = () => {
    for (const sq of seqs) {
      for (const ed of sq.edges) {
        const before = prev[ed.sig] & 1;
        const now = s[ed.sig] & 1;
        if ((ed.edge === 'pos' && !before && now) || (ed.edge === 'neg' && before && !now)) {
          due.push(sq.run);
          break;
        }
      }
    }
    for (const i of edgeSigs) prev[i] = s[i];
    if (!due.length) return false;
    // Every triggered block reads the values from before the edge; <= results land together.
    for (const run of due) run(s);
    due.length = 0;
    applyNba();
    return true;
  };
  /** Settle the logic, then run the blocks whose clock edge arrived (clocks can be derived), until quiet. */
  const propagate = () => {
    for (let iter = 0; iter < 32; iter++) {
      settleFast();
      if (!fireEdges()) return;
    }
    throw new InterpError('runtime', 'clock edges keep triggering each other (a ripple of more than 32 derived clocks)', null);
  };
  // Faster settle: only rerun until stable, comparing a cheap checksum.
  const settleFast = () => {
    for (let iter = 0; iter < 64; iter++) {
      let sum = 0;
      for (let k = 0; k < s.length; k++) sum = (sum * 31 + s[k]) % 2147483647;
      for (const c of combs) c(s);
      applyNba();
      let sum2 = 0;
      for (let k = 0; k < s.length; k++) sum2 = (sum2 * 31 + s[k]) % 2147483647;
      if (sum === sum2) return;
    }
    settle();
  };
  settleFast();
  for (const i of edgeSigs) prev[i] = s[i];

  // Persistence: every output bit and every multiplexed digit segment is averaged over PERSIST_S, run by run (a run is
  // the cycles a value held), so the cost is per change, not per cycle and bit.
  const tau = clockHz * PERSIST_S;
  const fade = (lit: Float64Array | number[], i: number, on: number, cycles: number) => {
    lit[i] = on + (lit[i] - on) * Math.exp(-cycles / tau);
  };
  const outNames = top.decls.filter((d) => d.kind === 'output').map((d) => d.name);
  const tracked = outNames.map((name) => {
    const i = index.get(name)!;
    const w = sigs[i].w;
    return { name, i, w, last: s[i], run: 0, lit: Float64Array.from({ length: w }, (_, b) => (s[i] >>> b) & 1) };
  });
  const persist = (p: (typeof tracked)[number]) => {
    if (!p.run) return;
    for (let b = 0; b < p.w; b++) fade(p.lit, b, (p.last >>> b) & 1, p.run);
    p.run = 0;
  };

  // Basys 3: four digits share the cathodes seg/dp, the active-low anodes an[3:0] pick the digit that shows them.
  const segIdx = index.get('seg');
  const anIdx = index.get('an');
  const dpIdx = index.get('dp');
  const muxed = segIdx !== undefined && anIdx !== undefined;
  const segState = () => (muxed ? s[segIdx] + s[anIdx] * 128 + (dpIdx !== undefined ? s[dpIdx] * 2048 : 2048) : -1);
  const segLit = (key: number, d: number, k: number) => {
    if ((Math.floor(key / 128) >> d) & 1) return 0;
    return k < 7 ? 1 - ((key >> k) & 1) : 1 - (Math.floor(key / 2048) & 1);
  };
  let lastKey = segState();
  let runLen = 0;
  const digits = Array.from({ length: 4 }, (_, d) => Array.from({ length: 8 }, (_, k) => (muxed ? segLit(lastKey, d, k) : 0)));
  const flushRun = () => {
    if (!muxed || !runLen) return;
    for (let d = 0; d < 4; d++) for (let k = 0; k < 8; k++) fade(digits[d], k, segLit(lastKey, d, k), runLen);
    runLen = 0;
  };
  // DE10-Lite: six HEX displays with their own active-low pins (bit 7 = DP).
  const hexPorts = [0, 1, 2, 3, 4, 5].map((k) => tracked.find((p) => p.name === `HEX${k}`));

  let cycles = 0;
  const sim: VerilogSim = {
    clockHz,
    get cycles() {
      return cycles;
    },
    onPrint: () => {},
    run(n: number) {
      onPrint = sim.onPrint;
      for (let k = 0; k < n; k++) {
        if (clockIdx !== undefined) {
          s[clockIdx] = 1;
          propagate();
          s[clockIdx] = 0;
          propagate();
        }
        cycles++;
        for (const p of tracked) {
          if (s[p.i] !== p.last) {
            persist(p);
            p.last = s[p.i];
          }
          p.run++;
        }
        if (muxed) {
          const key = segState();
          if (key !== lastKey) {
            flushRun();
            lastKey = key;
          }
          runLen++;
        }
      }
    },
    setInput(name: string, value: number) {
      const m = /^(\w+)(?:\[(\d+)\])?$/.exec(name);
      if (!m) throw new Error(`bad port name ${name}`);
      const i = index.get(m[1]);
      if (i === undefined) return; // the design does not use this board input
      if (m[2] !== undefined) {
        const b = Number(m[2]);
        s[i] = value ? m32(s[i] | (1 << b)) : m32(s[i] & ~(1 << b));
      } else s[i] = m32(value) & mask(sigs[i].w);
      propagate();
    },
    outputs() {
      const o: Record<string, number> = {};
      for (const n of outNames) o[n] = s[index.get(n)!];
      for (const p of fpga.ports) if (p.dir === 'in' && index.has(p.name)) o[p.name] = s[index.get(p.name)!];
      return o;
    },
    duty() {
      const out: Record<string, number[]> = {};
      for (const p of tracked) {
        persist(p);
        out[p.name] = Array.from(p.lit);
      }
      return out;
    },
    seg7() {
      if (hexPorts.some((p) => p !== undefined)) {
        return hexPorts.map((p) => {
          if (!p) return new Array(8).fill(0);
          persist(p);
          return Array.from({ length: 8 }, (_, k) => (k < p.w ? 1 - p.lit[k] : 0));
        });
      }
      if (!muxed) return [];
      flushRun();
      return digits.map((d) => d.slice());
    },
  };
  return sim;
}

function parity(v: number): number {
  let p = 0;
  let x = v >>> 0;
  while (x) {
    p ^= x & 1;
    x >>>= 1;
  }
  return p;
}
