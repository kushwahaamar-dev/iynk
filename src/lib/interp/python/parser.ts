import { syntaxError, unsupported, type SourcePos } from '../errors';

/** MicroPython / CPython subset: tokenizer with INDENT/DEDENT and a recursive-descent parser. */
type TK = 'name' | 'num' | 'str' | 'fstr' | 'op' | 'nl' | 'indent' | 'dedent' | 'eof';
interface Tok {
  k: TK;
  v: string;
  line: number;
  col: number;
  num?: { int: boolean; value: string };
  parts?: FPart[];
}
export type FPart = { lit: string } | { src: string; conv?: string; spec?: string; line: number; col: number };

const OPS3 = ['**=', '//=', '>>=', '<<=', '...'];
const OPS2 = ['**', '//', '==', '!=', '<=', '>=', '<<', '>>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '->', ':='];
const OPS1 = '+-*/%<>=()[]{},:.;@&|^~!';

export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  const indents = [0];
  let depth = 0;
  let i = 0;
  let line = 1;
  let lineStart = 0;
  let atLineStart = true;
  while (i < src.length) {
    if (atLineStart && depth === 0) {
      let col = 0;
      let j = i;
      while (j < src.length && (src[j] === ' ' || src[j] === '\t')) {
        col += src[j] === '\t' ? 8 - (col % 8) : 1;
        j++;
      }
      if (j >= src.length || src[j] === '\n' || src[j] === '#' || src[j] === '\r') {
        // Blank or comment line: no indentation change.
        while (j < src.length && src[j] !== '\n') j++;
        i = j + 1;
        line++;
        lineStart = i;
        continue;
      }
      const pos = { line, col: col + 1 };
      if (col > indents[indents.length - 1]) {
        indents.push(col);
        out.push({ k: 'indent', v: '', ...pos });
      } else {
        while (col < indents[indents.length - 1]) {
          indents.pop();
          out.push({ k: 'dedent', v: '', ...pos });
        }
        if (col !== indents[indents.length - 1]) throw syntaxError('this line is not lined up with any block above it', pos, 'Python uses indentation for blocks: use the same number of spaces as the lines around it');
      }
      i = j;
      atLineStart = false;
    }
    const c = src[i];
    const pos = { line, col: i - lineStart + 1 };
    if (c === '\n') {
      if (depth === 0 && out.length && out[out.length - 1].k !== 'nl') out.push({ k: 'nl', v: '', ...pos });
      i++;
      line++;
      lineStart = i;
      atLineStart = true;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      i++;
      continue;
    }
    if (c === '#') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '\\' && src[i + 1] === '\n') {
      i += 2;
      line++;
      lineStart = i;
      continue;
    }
    // Strings, with prefixes r, b, f, rb, fr...
    const sm = /^([rRbBfFuU]{0,2})('''|"""|'|")/.exec(src.slice(i, i + 5));
    if (sm && (sm[1] === '' || /^[a-zA-Z]+$/.test(sm[1]))) {
      const prefix = sm[1].toLowerCase();
      const q = sm[2];
      let j = i + sm[0].length;
      let s = '';
      const raw = prefix.includes('r');
      while (true) {
        if (j >= src.length) throw syntaxError('this text (string) is never closed', pos, `add the closing ${q}`);
        if (src.startsWith(q, j)) break;
        const ch = src[j];
        if (ch === '\n') {
          if (q.length === 1) throw syntaxError('this text (string) is missing its closing quote', pos);
          line++;
          lineStart = j + 1;
        }
        if (ch === '\\' && !raw) {
          const e = src[j + 1];
          const map: Record<string, string> = { n: '\n', t: '\t', r: '\r', '0': '\0', '\\': '\\', "'": "'", '"': '"', a: '\x07', b: '\b', f: '\f', v: '\v', '\n': '' };
          if (e === 'x') {
            s += String.fromCharCode(parseInt(src.slice(j + 2, j + 4), 16));
            j += 4;
            continue;
          }
          if (e === 'u') {
            s += String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16));
            j += 6;
            continue;
          }
          s += e in map ? map[e] : '\\' + e;
          if (e === '\n') {
            line++;
            lineStart = j + 2;
          }
          j += 2;
          continue;
        }
        s += ch;
        j++;
      }
      i = j + q.length;
      if (prefix.includes('f')) out.push({ k: 'fstr', v: s, ...pos, parts: splitF(s, pos) });
      else out.push({ k: 'str', v: s, ...pos });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /\w/.test(src[j])) j++;
      out.push({ k: 'name', v: src.slice(i, j), ...pos });
      i = j;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const m = /^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(\d[\d_]*\.?[\d_]*([eE][+-]?\d+)?|\.\d[\d_]*([eE][+-]?\d+)?))/.exec(src.slice(i))!;
      const t = m[0].replace(/_/g, '');
      const isInt = /^0[xXbBoO]/.test(t) || !/[.eE]/.test(t);
      out.push({ k: 'num', v: m[0], ...pos, num: { int: isInt, value: t } });
      i += m[0].length;
      if (/[jJ]/.test(src[i] ?? '')) throw unsupported('complex numbers', pos);
      continue;
    }
    const three = src.slice(i, i + 3);
    const two = src.slice(i, i + 2);
    let op = '';
    if (OPS3.includes(three)) op = three;
    else if (OPS2.includes(two)) op = two;
    else if (OPS1.includes(c)) op = c;
    if (!op) {
      if (c === '“' || c === '”' || c === '‘' || c === '’') throw syntaxError('curly quotes are not code quotes', pos, 'retype the quote with the keyboard key');
      throw syntaxError(`unexpected character '${c}'`, pos);
    }
    if (op === '!' ) throw syntaxError("'!' is not Python: use 'not'", pos);
    if ('([{'.includes(op)) depth++;
    if (')]}'.includes(op)) depth = Math.max(0, depth - 1);
    out.push({ k: 'op', v: op, ...pos });
    i += op.length;
  }
  const end = { line, col: i - lineStart + 1 };
  if (out.length && out[out.length - 1].k !== 'nl') out.push({ k: 'nl', v: '', ...end });
  while (indents.length > 1) {
    indents.pop();
    out.push({ k: 'dedent', v: '', ...end });
  }
  out.push({ k: 'eof', v: '', ...end });
  return out;
}

function splitF(s: string, pos: SourcePos): FPart[] {
  const parts: FPart[] = [];
  let lit = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '{' && s[i + 1] === '{') {
      lit += '{';
      i += 2;
      continue;
    }
    if (s[i] === '}' && s[i + 1] === '}') {
      lit += '}';
      i += 2;
      continue;
    }
    if (s[i] === '{') {
      if (lit) parts.push({ lit });
      lit = '';
      let depth = 1;
      let j = i + 1;
      let exprEnd = -1;
      let convAt = -1;
      while (j < s.length && depth) {
        const ch = s[j];
        if (ch === '{' || ch === '[' || ch === '(') depth++;
        else if (ch === '}' || ch === ']' || ch === ')') depth--;
        else if (depth === 1 && ch === '!' && s[j + 1] !== '=' && convAt < 0 && exprEnd < 0) convAt = j;
        else if (depth === 1 && ch === ':' && exprEnd < 0) exprEnd = j;
        if (depth) j++;
      }
      if (depth) throw syntaxError("an f-string { is never closed", pos);
      const stop = convAt >= 0 ? convAt : exprEnd >= 0 ? exprEnd : j;
      const src = s.slice(i + 1, stop).trim();
      const part: FPart = { src: src.endsWith('=') ? src.slice(0, -1) : src, line: pos.line, col: pos.col };
      if (src.endsWith('=')) parts.push({ lit: src });
      if (convAt >= 0) part.conv = s[convAt + 1];
      if (exprEnd >= 0) part.spec = s.slice(exprEnd + 1, j);
      if (!part.src) throw syntaxError('empty {} in an f-string', pos);
      parts.push(part);
      i = j + 1;
      continue;
    }
    lit += s[i++];
  }
  if (lit) parts.push({ lit });
  return parts;
}

// AST ---------------------------------------------------------------------------------

export type PExpr =
  | { k: 'name'; p: SourcePos; id: string }
  | { k: 'const'; p: SourcePos; v: unknown }
  | { k: 'fstr'; p: SourcePos; parts: ({ lit: string } | { e: PExpr; conv?: string; spec?: string })[] }
  | { k: 'list'; p: SourcePos; items: PExpr[] }
  | { k: 'tuple'; p: SourcePos; items: PExpr[] }
  | { k: 'dict'; p: SourcePos; keys: PExpr[]; values: PExpr[] }
  | { k: 'set'; p: SourcePos; items: PExpr[] }
  | { k: 'comp'; p: SourcePos; kind: 'list' | 'gen' | 'dict' | 'set'; elt: PExpr; val?: PExpr; gens: { target: PExpr; iter: PExpr; ifs: PExpr[] }[] }
  | { k: 'bin'; p: SourcePos; op: string; a: PExpr; b: PExpr }
  | { k: 'un'; p: SourcePos; op: string; a: PExpr }
  | { k: 'bool'; p: SourcePos; op: 'and' | 'or'; a: PExpr; b: PExpr }
  | { k: 'cmp'; p: SourcePos; ops: string[]; items: PExpr[] }
  | { k: 'ifexp'; p: SourcePos; c: PExpr; a: PExpr; b: PExpr }
  | { k: 'call'; p: SourcePos; fn: PExpr; args: PExpr[]; kw: { name: string; v: PExpr }[]; star?: PExpr }
  | { k: 'attr'; p: SourcePos; a: PExpr; name: string }
  | { k: 'sub'; p: SourcePos; a: PExpr; i: PExpr }
  | { k: 'slice'; p: SourcePos; lo?: PExpr; hi?: PExpr; step?: PExpr }
  | { k: 'lambda'; p: SourcePos; params: PParam[]; body: PExpr }
  | { k: 'star'; p: SourcePos; a: PExpr };

export interface PParam {
  name: string;
  def?: PExpr;
  star?: '*' | '**';
}

export type PStmt =
  | { k: 'expr'; p: SourcePos; e: PExpr }
  | { k: 'assign'; p: SourcePos; targets: PExpr[]; v: PExpr }
  | { k: 'aug'; p: SourcePos; op: string; t: PExpr; v: PExpr }
  | { k: 'if'; p: SourcePos; c: PExpr; a: PStmt[]; b?: PStmt[] }
  | { k: 'while'; p: SourcePos; c: PExpr; body: PStmt[]; orelse?: PStmt[] }
  | { k: 'for'; p: SourcePos; t: PExpr; iter: PExpr; body: PStmt[]; orelse?: PStmt[] }
  | { k: 'def'; p: SourcePos; name: string; params: PParam[]; body: PStmt[]; decorators: PExpr[] }
  | { k: 'class'; p: SourcePos; name: string; bases: PExpr[]; body: PStmt[] }
  | { k: 'return'; p: SourcePos; v?: PExpr }
  | { k: 'pass'; p: SourcePos }
  | { k: 'break'; p: SourcePos }
  | { k: 'continue'; p: SourcePos }
  | { k: 'import'; p: SourcePos; names: { mod: string; as?: string }[] }
  | { k: 'from'; p: SourcePos; mod: string; names: { name: string; as?: string }[] }
  | { k: 'global'; p: SourcePos; names: string[]; nonlocal: boolean }
  | { k: 'try'; p: SourcePos; body: PStmt[]; handlers: { type?: PExpr; name?: string; body: PStmt[]; p: SourcePos }[]; orelse?: PStmt[]; fin?: PStmt[] }
  | { k: 'raise'; p: SourcePos; e?: PExpr }
  | { k: 'assert'; p: SourcePos; c: PExpr; msg?: PExpr }
  | { k: 'del'; p: SourcePos; targets: PExpr[] }
  | { k: 'with'; p: SourcePos; ctx: PExpr; as?: PExpr; body: PStmt[] };

const KEYWORDS = new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield']);

export class PyParser {
  private i = 0;
  constructor(private t: Tok[]) {}

  private get c(): Tok {
    return this.t[this.i];
  }
  private kind(): TK {
    return this.t[this.i].k;
  }
  private isOp(v: string): boolean {
    return this.c.k === 'op' && this.c.v === v;
  }
  private isKw(v: string): boolean {
    return this.c.k === 'name' && this.c.v === v;
  }
  private eatOp(v: string): boolean {
    if (this.isOp(v)) {
      this.i++;
      return true;
    }
    return false;
  }
  private eatKw(v: string): boolean {
    if (this.isKw(v)) {
      this.i++;
      return true;
    }
    return false;
  }
  private expectOp(v: string, hint?: string): Tok {
    if (this.isOp(v)) return this.t[this.i++];
    if (v === ':' ) throw syntaxError(`expected ':' ${hint ?? ''}`.trim(), this.prevEnd(), 'lines that start a block (if, for, while, def, class) end with a colon');
    throw syntaxError(`expected '${v}' but found ${this.desc()}`, this.c, hint);
  }
  private prevEnd(): SourcePos {
    const p = this.t[this.i - 1] ?? this.c;
    return { line: p.line, col: p.col + Math.max(1, p.v.length) };
  }
  private desc(): string {
    const c = this.c;
    if (c.k === 'nl') return 'the end of the line';
    if (c.k === 'eof') return 'the end of the program';
    if (c.k === 'indent') return 'an indented line';
    if (c.k === 'dedent') return 'the end of the block';
    return `'${c.v}'`;
  }
  private name(what = 'a name'): string {
    if (this.c.k !== 'name' || KEYWORDS.has(this.c.v)) throw syntaxError(`expected ${what} but found ${this.desc()}`, this.c);
    return this.t[this.i++].v;
  }

  parseModule(): PStmt[] {
    const body: PStmt[] = [];
    while (this.c.k !== 'eof') {
      if (this.c.k === 'nl') {
        this.i++;
        continue;
      }
      if (this.c.k === 'indent') throw syntaxError('unexpected indent: this line is indented but nothing above opens a block', this.c, 'remove the spaces at the start of the line');
      body.push(...this.stmt());
    }
    return body;
  }

  private block(): PStmt[] {
    this.expectOp(':');
    if (this.c.k !== 'nl') {
      // One-line block: if x: y = 1
      const s = this.simpleLine();
      return s;
    }
    this.i++;
    if (this.kind() !== 'indent') throw syntaxError('expected an indented block after this line', this.t[this.i - 1], 'indent the next line (4 spaces) to put it inside the block');
    this.i++;
    const body: PStmt[] = [];
    while (this.kind() !== 'dedent' && this.kind() !== 'eof') {
      if (this.kind() === 'nl') {
        this.i++;
        continue;
      }
      body.push(...this.stmt());
    }
    if (this.kind() === 'dedent') this.i++;
    return body;
  }

  private stmt(): PStmt[] {
    const c = this.c;
    const p: SourcePos = { line: c.line, col: c.col };
    if (c.k === 'op' && c.v === '@') {
      const decorators: PExpr[] = [];
      while (this.eatOp('@')) {
        decorators.push(this.expr());
        if (this.c.k === 'nl') this.i++;
      }
      const d = this.stmt()[0];
      if (d.k !== 'def') throw syntaxError('a decorator must be followed by def', p);
      d.decorators = decorators;
      return [d];
    }
    if (c.k === 'name') {
      switch (c.v) {
        case 'if': {
          this.i++;
          const cond = this.expr();
          const a = this.block();
          let b: PStmt[] | undefined;
          if (this.isKw('elif')) {
            b = this.stmt();
          } else if (this.eatKw('else')) b = this.block();
          return [{ k: 'if', p, c: cond, a, b }];
        }
        case 'elif':
          // Reached through the if branch above: parse like an if.
          this.t[this.i] = { ...c, v: 'if' };
          return this.stmt();
        case 'else':
          throw syntaxError("'else' without a matching if, for, while or try above it", c, 'check that the else lines up with its if');
        case 'while': {
          this.i++;
          const cond = this.expr();
          const body = this.block();
          const orelse = this.eatKw('else') ? this.block() : undefined;
          return [{ k: 'while', p, c: cond, body, orelse }];
        }
        case 'for': {
          this.i++;
          const t = this.targetList();
          if (!this.eatKw('in')) throw syntaxError("expected 'in' in the for loop", this.c, 'for item in items:');
          const iter = this.exprList();
          const body = this.block();
          const orelse = this.eatKw('else') ? this.block() : undefined;
          return [{ k: 'for', p, t, iter, body, orelse }];
        }
        case 'def': {
          this.i++;
          const name = this.name('a function name');
          this.expectOp('(');
          const params = this.params(')');
          this.expectOp(')');
          if (this.eatOp('->')) this.expr();
          return [{ k: 'def', p, name, params, body: this.block(), decorators: [] }];
        }
        case 'class': {
          this.i++;
          const name = this.name('a class name');
          const bases: PExpr[] = [];
          if (this.eatOp('(')) {
            while (!this.isOp(')')) {
              bases.push(this.expr());
              if (!this.eatOp(',')) break;
            }
            this.expectOp(')');
          }
          return [{ k: 'class', p, name, bases, body: this.block() }];
        }
        case 'try': {
          this.i++;
          const body = this.block();
          const handlers: { type?: PExpr; name?: string; body: PStmt[]; p: SourcePos }[] = [];
          while (this.isKw('except')) {
            const hp = { line: this.c.line, col: this.c.col };
            this.i++;
            let type: PExpr | undefined;
            let name: string | undefined;
            if (!this.isOp(':')) {
              type = this.expr();
              if (this.eatKw('as')) name = this.name();
              else if (this.eatOp(',')) throw syntaxError("use 'except Error as e', not a comma", hp);
            }
            handlers.push({ type, name, body: this.block(), p: hp });
          }
          const orelse = this.eatKw('else') ? this.block() : undefined;
          const fin = this.eatKw('finally') ? this.block() : undefined;
          if (!handlers.length && !fin) throw syntaxError("try needs an 'except' or 'finally' block", p);
          return [{ k: 'try', p, body, handlers, orelse, fin }];
        }
        case 'with': {
          this.i++;
          const ctx = this.expr();
          const as = this.eatKw('as') ? this.targetList() : undefined;
          return [{ k: 'with', p, ctx, as, body: this.block() }];
        }
        case 'async':
        case 'await':
        case 'yield':
          throw unsupported(`'${c.v}'`, c, 'use plain functions and time.sleep()');
      }
    }
    return this.simpleLine();
  }

  /** One or more ;-separated simple statements and the end of line. */
  private simpleLine(): PStmt[] {
    const out: PStmt[] = [this.simple()];
    while (this.eatOp(';')) {
      if (this.c.k === 'nl') break;
      out.push(this.simple());
    }
    if (this.c.k === 'nl') this.i++;
    else if (this.c.k !== 'eof' && this.c.k !== 'dedent') {
      throw syntaxError(`unexpected ${this.desc()} after the statement`, this.c, this.c.k === 'name' ? 'is an operator or a comma missing?' : undefined);
    }
    return out;
  }

  private simple(): PStmt {
    const c = this.c;
    const p: SourcePos = { line: c.line, col: c.col };
    if (c.k === 'name') {
      switch (c.v) {
        case 'pass':
          this.i++;
          return { k: 'pass', p };
        case 'break':
          this.i++;
          return { k: 'break', p };
        case 'continue':
          this.i++;
          return { k: 'continue', p };
        case 'return': {
          this.i++;
          const v = this.c.k === 'nl' || this.isOp(';') || this.c.k === 'eof' ? undefined : this.exprList();
          return { k: 'return', p, v };
        }
        case 'raise': {
          this.i++;
          const e = this.c.k === 'nl' || this.c.k === 'eof' ? undefined : this.expr();
          if (this.eatKw('from')) this.expr();
          return { k: 'raise', p, e };
        }
        case 'global':
        case 'nonlocal': {
          this.i++;
          const names = [this.name()];
          while (this.eatOp(',')) names.push(this.name());
          return { k: 'global', p, names, nonlocal: c.v === 'nonlocal' };
        }
        case 'import': {
          this.i++;
          const names: { mod: string; as?: string }[] = [];
          do {
            let mod = this.name('a module name');
            while (this.eatOp('.')) mod += '.' + this.name();
            names.push({ mod, as: this.eatKw('as') ? this.name() : undefined });
          } while (this.eatOp(','));
          return { k: 'import', p, names };
        }
        case 'from': {
          this.i++;
          let mod = this.name('a module name');
          while (this.eatOp('.')) mod += '.' + this.name();
          if (!this.eatKw('import')) throw syntaxError("expected 'import'", this.c, `from ${mod} import name`);
          const names: { name: string; as?: string }[] = [];
          const paren = this.eatOp('(');
          if (this.eatOp('*')) names.push({ name: '*' });
          else {
            do {
              if (paren && this.isOp(')')) break;
              names.push({ name: this.name(), as: this.eatKw('as') ? this.name() : undefined });
            } while (this.eatOp(','));
          }
          if (paren) this.expectOp(')');
          return { k: 'from', p, mod, names };
        }
        case 'assert': {
          this.i++;
          const cnd = this.expr();
          return { k: 'assert', p, c: cnd, msg: this.eatOp(',') ? this.expr() : undefined };
        }
        case 'del': {
          this.i++;
          const targets = [this.expr()];
          while (this.eatOp(',')) targets.push(this.expr());
          return { k: 'del', p, targets };
        }
        case 'print':
          if (this.t[this.i + 1]?.k === 'str' || (this.t[this.i + 1]?.k === 'name' && !KEYWORDS.has(this.t[this.i + 1].v))) {
            throw syntaxError('print is a function in Python 3: write print(...)', c, 'add brackets: print("hello")');
          }
      }
    }
    const first = this.exprList(true);
    if (this.c.k === 'op' && /^([-+*/%&|^@]|\*\*|\/\/|<<|>>)=$/.test(this.c.v)) {
      const op = this.c.v.slice(0, -1);
      this.i++;
      checkTarget(first);
      return { k: 'aug', p, op, t: first, v: this.exprList() };
    }
    if (this.isOp('=')) {
      const targets = [first];
      let v: PExpr = first;
      while (this.eatOp('=')) {
        v = this.exprList(true);
        targets.push(v);
      }
      targets.pop();
      targets.forEach(checkTarget);
      return { k: 'assign', p, targets, v };
    }
    if (this.isOp(':')) {
      // Annotated assignment: x: int = 5
      this.i++;
      this.expr();
      if (this.eatOp('=')) return { k: 'assign', p, targets: [first], v: this.exprList() };
      return { k: 'pass', p };
    }
    return { k: 'expr', p, e: first };
  }

  private params(close: string): PParam[] {
    const ps: PParam[] = [];
    while (!this.isOp(close)) {
      if (this.eatOp('**')) ps.push({ name: this.name(), star: '**' });
      else if (this.eatOp('*')) {
        if (this.isOp(',')) {
          this.i++;
          continue;
        }
        ps.push({ name: this.name(), star: '*' });
      } else {
        const name = this.name('a parameter name');
        if (this.eatOp(':')) this.expr();
        const def = this.eatOp('=') ? this.expr() : undefined;
        ps.push({ name, def });
      }
      if (!this.eatOp(',')) break;
    }
    return ps;
  }

  private targetList(): PExpr {
    const p = { line: this.c.line, col: this.c.col };
    // Targets stop before 'in', so parse below the comparison level.
    const items = [this.bitOr()];
    while (this.eatOp(',')) {
      if (this.isKw('in') || this.isOp('=')) break;
      items.push(this.bitOr());
    }
    return items.length === 1 ? items[0] : { k: 'tuple', p, items };
  }

  /** Comma-separated expressions; more than one makes a tuple. */
  exprList(allowStar = false): PExpr {
    const p = { line: this.c.line, col: this.c.col };
    const first = allowStar && this.isOp('*') ? this.starred() : this.expr();
    if (!this.isOp(',')) return first;
    const items = [first];
    while (this.eatOp(',')) {
      if (this.c.k === 'nl' || this.isOp('=') || this.isOp(')') || this.c.k === 'eof') break;
      items.push(allowStar && this.isOp('*') ? this.starred() : this.expr());
    }
    return { k: 'tuple', p, items };
  }

  private starred(): PExpr {
    const p = { line: this.c.line, col: this.c.col };
    this.expectOp('*');
    return { k: 'star', p, a: this.orExpr() };
  }

  expr(): PExpr {
    const p = { line: this.c.line, col: this.c.col };
    if (this.eatKw('lambda')) {
      const params = this.params(':');
      this.expectOp(':');
      return { k: 'lambda', p, params, body: this.expr() };
    }
    const a = this.orExpr();
    if (this.isKw('if')) {
      this.i++;
      const c = this.orExpr();
      if (!this.eatKw('else')) throw syntaxError("expected 'else' in the conditional expression", this.c, 'x if condition else y');
      return { k: 'ifexp', p, c, a, b: this.expr() };
    }
    return a;
  }

  private orExpr(): PExpr {
    let a = this.andExpr();
    while (this.isKw('or')) {
      const p = this.c;
      this.i++;
      a = { k: 'bool', p, op: 'or', a, b: this.andExpr() };
    }
    return a;
  }
  private andExpr(): PExpr {
    let a = this.notExpr();
    while (this.isKw('and')) {
      const p = this.c;
      this.i++;
      a = { k: 'bool', p, op: 'and', a, b: this.notExpr() };
    }
    return a;
  }
  private notExpr(): PExpr {
    if (this.isKw('not')) {
      const p = this.c;
      this.i++;
      return { k: 'un', p, op: 'not', a: this.notExpr() };
    }
    return this.comparison();
  }
  private comparison(): PExpr {
    const p = { line: this.c.line, col: this.c.col };
    const first = this.bitOr();
    const ops: string[] = [];
    const items = [first];
    while (true) {
      const c = this.c;
      let op = '';
      if (c.k === 'op' && ['<', '>', '==', '>=', '<=', '!='].includes(c.v)) {
        op = c.v;
        this.i++;
      } else if (this.isKw('in')) {
        op = 'in';
        this.i++;
      } else if (this.isKw('not') && this.t[this.i + 1]?.v === 'in') {
        op = 'not in';
        this.i += 2;
      } else if (this.isKw('is')) {
        this.i++;
        op = this.eatKw('not') ? 'is not' : 'is';
      } else break;
      ops.push(op);
      items.push(this.bitOr());
    }
    if (!ops.length) return first;
    return { k: 'cmp', p, ops, items };
  }
  private binLevel(next: () => PExpr, ops: string[]): PExpr {
    let a = next();
    while (this.c.k === 'op' && ops.includes(this.c.v)) {
      const p = this.c;
      this.i++;
      a = { k: 'bin', p, op: p.v, a, b: next() };
    }
    return a;
  }
  private bitOr = (): PExpr => this.binLevel(this.bitXor, ['|']);
  private bitXor = (): PExpr => this.binLevel(this.bitAnd, ['^']);
  private bitAnd = (): PExpr => this.binLevel(this.shift, ['&']);
  private shift = (): PExpr => this.binLevel(this.arith, ['<<', '>>']);
  private arith = (): PExpr => this.binLevel(this.term, ['+', '-']);
  private term = (): PExpr => this.binLevel(this.factor, ['*', '/', '//', '%', '@']);
  private factor = (): PExpr => {
    const c = this.c;
    if (c.k === 'op' && (c.v === '-' || c.v === '+' || c.v === '~')) {
      this.i++;
      return { k: 'un', p: c, op: c.v, a: this.factor() };
    }
    return this.power();
  };
  private power(): PExpr {
    const a = this.postfix(this.atom());
    if (this.isOp('**')) {
      const p = this.c;
      this.i++;
      return { k: 'bin', p, op: '**', a, b: this.factor() };
    }
    return a;
  }

  private postfix(e: PExpr): PExpr {
    while (true) {
      const c = this.c;
      if (c.k !== 'op') return e;
      if (c.v === '(') {
        this.i++;
        const args: PExpr[] = [];
        const kw: { name: string; v: PExpr }[] = [];
        let star: PExpr | undefined;
        while (!this.isOp(')')) {
          if (this.eatOp('*')) star = this.expr();
          else if (this.eatOp('**')) throw unsupported('**kwargs in a call', this.c);
          else if (this.c.k === 'name' && this.t[this.i + 1]?.v === '=' && this.t[this.i + 1].k === 'op') {
            const name = this.name();
            this.i++;
            kw.push({ name, v: this.expr() });
          } else {
            const a = this.expr();
            if (this.isKw('for')) args.push(this.comprehension(a, 'gen', c));
            else {
              if (kw.length) throw syntaxError('positional argument after a keyword argument', a.p);
              args.push(a);
            }
          }
          if (!this.eatOp(',')) break;
        }
        this.expectOp(')', 'to close the call');
        e = { k: 'call', p: c, fn: e, args, kw, star };
      } else if (c.v === '[') {
        this.i++;
        const idx = this.subscript();
        this.expectOp(']');
        e = { k: 'sub', p: c, a: e, i: idx };
      } else if (c.v === '.') {
        this.i++;
        const p = this.c;
        e = { k: 'attr', p, a: e, name: this.name('an attribute name') };
      } else return e;
    }
  }

  private subscript(): PExpr {
    const p = { line: this.c.line, col: this.c.col };
    const part = (): PExpr | undefined => (this.isOp(':') || this.isOp(']') || this.isOp(',') ? undefined : this.expr());
    const lo = part();
    if (!this.isOp(':')) {
      if (this.isOp(',')) {
        const items = [lo!];
        while (this.eatOp(',')) if (!this.isOp(']')) items.push(this.expr());
        return { k: 'tuple', p, items };
      }
      return lo!;
    }
    this.i++;
    const hi = part();
    let step: PExpr | undefined;
    if (this.eatOp(':')) step = part();
    return { k: 'slice', p, lo, hi, step };
  }

  private comprehension(elt: PExpr, kind: 'list' | 'gen' | 'dict' | 'set', p: SourcePos, val?: PExpr): PExpr {
    const gens: { target: PExpr; iter: PExpr; ifs: PExpr[] }[] = [];
    while (this.eatKw('for')) {
      const target = this.targetList();
      if (!this.eatKw('in')) throw syntaxError("expected 'in'", this.c);
      const iter = this.orExpr();
      const ifs: PExpr[] = [];
      while (this.eatKw('if')) ifs.push(this.orExpr());
      gens.push({ target, iter, ifs });
    }
    return { k: 'comp', p, kind, elt, val, gens };
  }

  private atom(): PExpr {
    const c = this.c;
    const p: SourcePos = { line: c.line, col: c.col };
    switch (c.k) {
      case 'num': {
        this.i++;
        const n = c.num!;
        if (n.int) return { k: 'const', p, v: BigInt(n.value.replace(/^0[oO]/, '0o')) };
        return { k: 'const', p, v: parseFloat(n.value) };
      }
      case 'str':
      case 'fstr': {
        // Adjacent literals join: "a" "b" or f"{x}" "y".
        const parts: ({ lit: string } | { e: PExpr; conv?: string; spec?: string })[] = [];
        let isF = false;
        while (this.c.k === 'str' || this.c.k === 'fstr') {
          const t = this.t[this.i++];
          if (t.k === 'str') parts.push({ lit: t.v });
          else {
            isF = true;
            for (const fp of t.parts!) {
              if ('lit' in fp) parts.push({ lit: fp.lit });
              else {
                const sub = new PyParser(tokenize(fp.src).filter((x) => x.k !== 'nl' && x.k !== 'indent' && x.k !== 'dedent'));
                const e = relocate(sub.expr(), t);
                parts.push({ e, conv: fp.conv, spec: fp.spec });
              }
            }
          }
        }
        if (!isF) return { k: 'const', p, v: parts.map((x) => (x as { lit: string }).lit).join('') };
        return { k: 'fstr', p, parts };
      }
      case 'name': {
        if (c.v === 'True' || c.v === 'False') {
          this.i++;
          return { k: 'const', p, v: c.v === 'True' };
        }
        if (c.v === 'None') {
          this.i++;
          return { k: 'const', p, v: null };
        }
        if (KEYWORDS.has(c.v)) throw syntaxError(`'${c.v}' cannot be used here`, c);
        this.i++;
        return { k: 'name', p, id: c.v };
      }
      case 'op': {
        if (c.v === '(') {
          this.i++;
          if (this.eatOp(')')) return { k: 'tuple', p, items: [] };
          const first = this.isOp('*') ? this.starred() : this.expr();
          if (this.isKw('for')) {
            const g = this.comprehension(first, 'gen', p);
            this.expectOp(')');
            return g;
          }
          if (this.isOp(',')) {
            const items = [first];
            while (this.eatOp(',')) {
              if (this.isOp(')')) break;
              items.push(this.expr());
            }
            this.expectOp(')', 'to close the tuple');
            return { k: 'tuple', p, items };
          }
          this.expectOp(')', 'to close the bracket');
          return first;
        }
        if (c.v === '[') {
          this.i++;
          const items: PExpr[] = [];
          if (this.eatOp(']')) return { k: 'list', p, items };
          const first = this.isOp('*') ? this.starred() : this.expr();
          if (this.isKw('for')) {
            const comp = this.comprehension(first, 'list', p);
            this.expectOp(']');
            return comp;
          }
          items.push(first);
          while (this.eatOp(',')) {
            if (this.isOp(']')) break;
            items.push(this.isOp('*') ? this.starred() : this.expr());
          }
          this.expectOp(']', 'to close the list');
          return { k: 'list', p, items };
        }
        if (c.v === '{') {
          this.i++;
          if (this.eatOp('}')) return { k: 'dict', p, keys: [], values: [] };
          const k0 = this.expr();
          if (this.eatOp(':')) {
            const v0 = this.expr();
            if (this.isKw('for')) {
              const comp = this.comprehension(k0, 'dict', p, v0);
              this.expectOp('}');
              return comp;
            }
            const keys = [k0];
            const values = [v0];
            while (this.eatOp(',')) {
              if (this.isOp('}')) break;
              keys.push(this.expr());
              this.expectOp(':');
              values.push(this.expr());
            }
            this.expectOp('}', 'to close the dict');
            return { k: 'dict', p, keys, values };
          }
          if (this.isKw('for')) {
            const comp = this.comprehension(k0, 'set', p);
            this.expectOp('}');
            return comp;
          }
          const items = [k0];
          while (this.eatOp(',')) {
            if (this.isOp('}')) break;
            items.push(this.expr());
          }
          this.expectOp('}');
          return { k: 'set', p, items };
        }
        if (c.v === '...') {
          this.i++;
          return { k: 'const', p, v: null };
        }
        break;
      }
      case 'indent':
        throw syntaxError('unexpected indent', c, 'remove the spaces at the start of the line');
      case 'nl':
      case 'eof':
        throw syntaxError('the line ends in the middle of an expression', c);
    }
    throw syntaxError(`unexpected ${this.desc()}`, c);
  }
}

function relocate(e: PExpr, at: SourcePos): PExpr {
  const walk = (x: unknown): void => {
    if (!x || typeof x !== 'object') return;
    const o = x as Record<string, unknown>;
    if (o.p && typeof o.p === 'object') o.p = { line: at.line, col: at.col };
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object' && v !== o.p) walk(v);
    }
  };
  walk(e);
  return e;
}

function checkTarget(e: PExpr): void {
  if (e.k === 'name' || e.k === 'attr' || e.k === 'sub') return;
  if (e.k === 'tuple' || e.k === 'list') {
    e.items.forEach((x) => (x.k === 'star' ? checkTarget(x.a) : checkTarget(x)));
    return;
  }
  if (e.k === 'call') throw syntaxError('cannot assign to a function call', e.p, 'did you mean == to compare?');
  throw syntaxError('cannot assign to this', e.p, 'the left side of = must be a name, attribute or item');
}

export function parsePython(src: string): PStmt[] {
  return new PyParser(tokenize(src)).parseModule();
}
