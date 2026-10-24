import { InterpError, syntaxError, unsupported, type SourcePos } from '../errors';

// Tokens ----------------------------------------------------------------------

export type TokKind = 'id' | 'num' | 'str' | 'chr' | 'op' | 'eof';
export interface Tok {
  k: TokKind;
  v: string;
  line: number;
  col: number;
  /** Numeric literal details. */
  num?: { value: number; float: boolean; unsigned: boolean; long: number; f32: boolean };
}

const OPS = ['<<=', '>>=', '...', '->', '::', '++', '--', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
  '+', '-', '*', '/', '%', '<', '>', '=', '!', '~', '&', '|', '^', '?', ':', ';', ',', '.', '(', ')', '[', ']', '{', '}'];

export interface Preprocessed {
  tokens: Tok[];
  includes: { name: string; line: number }[];
}

const ESC: Record<string, string> = { n: '\n', t: '\t', r: '\r', '0': '\0', '\\': '\\', "'": "'", '"': '"', a: '\x07', b: '\b', f: '\f', v: '\v' };

/** Tokenise a sketch, handling #include, object-like and simple function-like #define. */
export function lex(src: string): Preprocessed {
  const toks: Tok[] = [];
  const includes: { name: string; line: number }[] = [];
  const defines = new Map<string, { params: string[] | null; body: Tok[] }>();
  let i = 0;
  let line = 1;
  let lineStart = 0;
  const pos = () => ({ line, col: i - lineStart + 1 });

  const lexLine = (text: string, ln: number, col0: number, out: Tok[]) => {
    // Lex a single preprocessor body line (no newlines inside).
    const sub = lexRaw(text, ln, col0);
    out.push(...sub);
  };

  while (i < src.length) {
    const c = src[i];
    if (c === '\n') {
      line++;
      i++;
      lineStart = i;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const start = pos();
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') {
          line++;
          lineStart = i + 1;
        }
        i++;
      }
      if (i >= src.length) throw syntaxError('this /* comment is never closed', start, 'add */ where the comment ends');
      i += 2;
      continue;
    }
    if (c === '#') {
      // A preprocessor line: take it whole (with \ continuations).
      const start = pos();
      let text = '';
      while (i < src.length && src[i] !== '\n') {
        if (src[i] === '\\' && src[i + 1] === '\n') {
          i += 2;
          line++;
          lineStart = i;
          continue;
        }
        text += src[i++];
      }
      const m = /^#\s*(\w+)\s*(.*)$/.exec(text.replace(/\/\/.*$/, '').trim());
      if (!m) throw syntaxError('stray #', start);
      const [, dir, rest] = m;
      if (dir === 'include') {
        const inc = /^[<"]([^>"]+)[>"]/.exec(rest);
        if (!inc) throw syntaxError('#include needs a file name like <Servo.h>', start);
        includes.push({ name: inc[1], line: start.line });
      } else if (dir === 'define') {
        const dm = /^([A-Za-z_]\w*)(\(([^)]*)\))?\s*(.*)$/.exec(rest);
        if (!dm) throw syntaxError('#define needs a name', start);
        const params = dm[2] !== undefined ? dm[3].split(',').map((s) => s.trim()).filter(Boolean) : null;
        const body: Tok[] = [];
        lexLine(dm[4], start.line, start.col, body);
        defines.set(dm[1], { params, body });
      } else if (dir === 'pragma' || dir === 'undef' || dir === 'error' || dir === 'warning') {
        if (dir === 'undef') defines.delete(rest.trim());
      } else {
        throw unsupported(`#${dir}`, start, 'conditional compilation (#if, #ifdef) is not simulated; remove it and keep the code you want');
      }
      continue;
    }
    // Ordinary token: find its extent with the raw lexer on the rest of the line.
    let end = src.indexOf('\n', i);
    if (end < 0) end = src.length;
    const t = lexOne(src, i, line, i - lineStart + 1);
    toks.push(t.tok);
    i = t.next;
  }
  toks.push({ k: 'eof', v: '', line, col: i - lineStart + 1 });

  if (!defines.size) return { tokens: toks, includes };
  // Expand macros (no recursion into the same macro).
  const expand = (input: Tok[], active: Set<string>): Tok[] => {
    const out: Tok[] = [];
    for (let j = 0; j < input.length; j++) {
      const t = input[j];
      const d = t.k === 'id' && !active.has(t.v) ? defines.get(t.v) : undefined;
      if (!d) {
        out.push(t);
        continue;
      }
      const next = new Set(active).add(t.v);
      const relocate = (b: Tok) => ({ ...b, line: t.line, col: t.col });
      if (!d.params) {
        out.push(...expand(d.body.map(relocate), next));
        continue;
      }
      if (input[j + 1]?.v !== '(') {
        out.push(t);
        continue;
      }
      const args: Tok[][] = [[]];
      let depth = 0;
      j += 2;
      for (; j < input.length; j++) {
        const a = input[j];
        if (a.k === 'eof') throw syntaxError(`the macro ${t.v}( is never closed`, t);
        if (a.v === '(' && a.k === 'op') depth++;
        if (a.v === ')' && a.k === 'op') {
          if (depth === 0) break;
          depth--;
        }
        if (a.v === ',' && a.k === 'op' && depth === 0) args.push([]);
        else args[args.length - 1].push(a);
      }
      const body: Tok[] = [];
      for (const b of d.body) {
        const idx = b.k === 'id' ? d.params.indexOf(b.v) : -1;
        if (idx >= 0) body.push(...(args[idx] ?? []));
        else body.push(relocate(b));
      }
      out.push(...expand(body, next));
    }
    return out;
  };
  return { tokens: expand(toks, new Set()), includes };
}

function lexRaw(text: string, line: number, col0: number): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) {
      i++;
      continue;
    }
    if (text[i] === '/' && text[i + 1] === '/') break;
    const t = lexOne(text, i, line, col0 + i);
    out.push(t.tok);
    i = t.next;
  }
  return out;
}

function lexOne(src: string, i: number, line: number, col: number): { tok: Tok; next: number } {
  const c = src[i];
  const p = { line, col };
  if (/[A-Za-z_]/.test(c)) {
    let j = i + 1;
    while (j < src.length && /\w/.test(src[j])) j++;
    return { tok: { k: 'id', v: src.slice(i, j), ...p }, next: j };
  }
  if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
    const m = /^(0[xX][0-9a-fA-F']+|0[bB][01']+|(?:\d[\d']*\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?))([uUlLfF]*)/.exec(src.slice(i));
    if (!m) throw syntaxError('bad number', p);
    const body = m[1].replace(/'/g, '');
    const suf = m[2].toLowerCase();
    let value: number;
    let float = false;
    if (/^0x/i.test(body)) value = parseInt(body.slice(2), 16);
    else if (/^0b/i.test(body)) value = parseInt(body.slice(2), 2);
    else if (/[.eE]/.test(body)) {
      value = parseFloat(body);
      float = true;
    } else if (/^0\d+$/.test(body)) value = parseInt(body, 8);
    else value = parseInt(body, 10);
    if (suf.includes('f') && !float && !/^0x/i.test(body)) {
      if (/^\d+$/.test(body)) throw syntaxError(`"${m[0]}" is not a valid number; write ${body}.0f`, p);
    }
    const num = { value, float, unsigned: suf.includes('u'), long: (suf.match(/l/g) ?? []).length, f32: float && suf.includes('f') };
    return { tok: { k: 'num', v: m[0], ...p, num }, next: i + m[0].length };
  }
  if (c === '"' || c === "'") {
    let j = i + 1;
    let s = '';
    while (j < src.length && src[j] !== c) {
      if (src[j] === '\n') throw syntaxError(c === '"' ? 'this text (string) is missing its closing "' : "this character is missing its closing '", p);
      if (src[j] === '\\') {
        const e = src[j + 1];
        if (e === 'x') {
          const hm = /^[0-9a-fA-F]{1,2}/.exec(src.slice(j + 2));
          s += String.fromCharCode(parseInt(hm?.[0] ?? '0', 16));
          j += 2 + (hm?.[0].length ?? 0);
          continue;
        }
        s += ESC[e] ?? e;
        j += 2;
        continue;
      }
      s += src[j++];
    }
    if (j >= src.length) throw syntaxError(c === '"' ? 'this text (string) is missing its closing "' : "this character is missing its closing '", p);
    if (c === "'" && s.length !== 1) throw syntaxError(`'${s}' is not a single character; use "double quotes" for text`, p);
    return { tok: { k: c === '"' ? 'str' : 'chr', v: s, ...p }, next: j + 1 };
  }
  for (const op of OPS) {
    if (src.startsWith(op, i)) return { tok: { k: 'op', v: op, ...p }, next: i + op.length };
  }
  if (c === '“' || c === '”' || c === '‘' || c === '’') throw syntaxError('curly quotes are not code quotes', p, 'retype the quote with the keyboard\'s " or \' key');
  throw syntaxError(`unexpected character '${c}'`, p);
}

// AST -------------------------------------------------------------------------

export interface TypeSpec {
  /** Canonical base name: "int", "unsigned long", "float", "String", "Servo"... */
  base: string;
  ptr: number;
  isConst: boolean;
  isStatic: boolean;
  isVolatile: boolean;
  rtc: boolean;
  ref: boolean;
}

export type Expr =
  | { k: 'num'; p: SourcePos; value: number; float: boolean; unsigned: boolean; long: number; f32: boolean }
  | { k: 'str'; p: SourcePos; value: string }
  | { k: 'chr'; p: SourcePos; value: number }
  | { k: 'bool'; p: SourcePos; value: boolean }
  | { k: 'id'; p: SourcePos; name: string }
  | { k: 'scope'; p: SourcePos; ns: string; name: string }
  | { k: 'bin'; p: SourcePos; op: string; a: Expr; b: Expr }
  | { k: 'un'; p: SourcePos; op: string; a: Expr }
  | { k: 'post'; p: SourcePos; op: string; a: Expr }
  | { k: 'assign'; p: SourcePos; op: string; a: Expr; b: Expr }
  | { k: 'cond'; p: SourcePos; c: Expr; a: Expr; b: Expr }
  | { k: 'call'; p: SourcePos; fn: Expr; args: Expr[] }
  | { k: 'index'; p: SourcePos; a: Expr; i: Expr }
  | { k: 'member'; p: SourcePos; a: Expr; name: string }
  | { k: 'cast'; p: SourcePos; ty: TypeSpec; a: Expr }
  | { k: 'lambda'; p: SourcePos; params: Param[]; body: Stmt }
  | { k: 'init'; p: SourcePos; items: Expr[] }
  | { k: 'comma'; p: SourcePos; a: Expr; b: Expr }
  | { k: 'sizeof'; p: SourcePos; ty?: TypeSpec; a?: Expr };

export interface Declarator {
  name: string;
  p: SourcePos;
  dims: (Expr | null)[];
  init?: Expr;
  ctorArgs?: Expr[];
}

export interface Param {
  ty: TypeSpec;
  name: string;
  dims: number;
  p: SourcePos;
}

export type Stmt =
  | { k: 'block'; p: SourcePos; body: Stmt[] }
  | { k: 'decl'; p: SourcePos; ty: TypeSpec; decls: Declarator[] }
  | { k: 'expr'; p: SourcePos; e: Expr }
  | { k: 'if'; p: SourcePos; c: Expr; a: Stmt; b?: Stmt }
  | { k: 'while'; p: SourcePos; c: Expr; body: Stmt }
  | { k: 'do'; p: SourcePos; c: Expr; body: Stmt }
  | { k: 'for'; p: SourcePos; init?: Stmt; c?: Expr; u?: Expr; body: Stmt }
  | { k: 'switch'; p: SourcePos; e: Expr; cases: { tests: Expr[] | null; body: Stmt[]; p: SourcePos }[] }
  | { k: 'break'; p: SourcePos }
  | { k: 'continue'; p: SourcePos }
  | { k: 'return'; p: SourcePos; e?: Expr }
  | { k: 'empty'; p: SourcePos };

export interface FuncDecl {
  k: 'func';
  p: SourcePos;
  ret: TypeSpec;
  name: string;
  params: Param[];
  body: Stmt | null;
  isr: boolean;
}

export type Top =
  | FuncDecl
  | { k: 'gdecl'; p: SourcePos; decl: Extract<Stmt, { k: 'decl' }> }
  | { k: 'enum'; p: SourcePos; items: { name: string; value?: Expr; p: SourcePos }[]; name?: string }
  | { k: 'struct'; p: SourcePos; name: string; fields: { ty: TypeSpec; name: string; dims: (Expr | null)[]; p: SourcePos }[] };

export interface Unit {
  tops: Top[];
  includes: { name: string; line: number }[];
}

// Parser ------------------------------------------------------------------------

const BASIC = new Set(['void', 'int', 'char', 'float', 'double', 'bool', 'boolean', 'byte', 'word', 'long', 'short', 'unsigned', 'signed', 'String', 'size_t',
  'int8_t', 'uint8_t', 'int16_t', 'uint16_t', 'int32_t', 'uint32_t', 'int64_t', 'uint64_t', 'auto']);
const QUALS = new Set(['const', 'static', 'volatile', 'inline', 'unsigned', 'signed', 'long', 'short', 'RTC_DATA_ATTR', 'IRAM_ATTR', 'ICACHE_RAM_ATTR', 'PROGMEM', 'constexpr', 'extern', 'register']);

const BIN_PREC: Record<string, number> = {
  '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6, '<': 7, '>': 7, '<=': 7, '>=': 7, '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10,
};

export class Parser {
  private t: Tok[];
  private i = 0;
  /** Type names known so far (library classes, structs, enums). */
  readonly typeNames: Set<string>;

  constructor(tokens: Tok[], typeNames: Iterable<string>) {
    this.t = tokens;
    this.typeNames = new Set(typeNames);
  }

  private get cur(): Tok {
    return this.t[this.i];
  }
  private atEof(): boolean {
    return this.t[this.i].k === 'eof';
  }
  private peek(n = 1): Tok {
    return this.t[Math.min(this.i + n, this.t.length - 1)];
  }
  private is(v: string): boolean {
    const c = this.cur;
    return (c.k === 'op' || c.k === 'id') && c.v === v;
  }
  private eat(v: string): boolean {
    if (this.is(v)) {
      this.i++;
      return true;
    }
    return false;
  }
  private expect(v: string, what?: string): Tok {
    if (this.is(v)) return this.t[this.i++];
    const c = this.cur;
    const prev = this.t[this.i - 1];
    if (v === ';' && prev) {
      // Point at the end of the previous token: that is where the ; is missing.
      throw syntaxError(`expected ';' ${what ?? 'at the end of this line'}`, { line: prev.line, col: prev.col + prev.v.length }, 'every statement ends with a semicolon');
    }
    throw syntaxError(`expected '${v}'${what ? ` ${what}` : ''} but found ${describe(c)}`, c);
  }
  private ident(what: string): Tok {
    const c = this.cur;
    if (c.k !== 'id') throw syntaxError(`expected ${what} but found ${describe(c)}`, c);
    this.i++;
    return c;
  }

  /** True if the tokens here start a type (for declarations and casts). */
  private startsType(at = this.i): boolean {
    const c = this.t[at];
    if (c.k !== 'id') return false;
    if (BASIC.has(c.v) || QUALS.has(c.v)) return true;
    if (this.typeNames.has(c.v)) {
      // "Servo s;" or "Servo(…)" as a constructor call used as a value.
      const n = this.t[at + 1];
      return n.k === 'id' || (n.k === 'op' && (n.v === '*' || n.v === '&') && this.t[at + 2]?.k === 'id');
    }
    if (c.v === 'struct' || c.v === 'enum') return true;
    return false;
  }

  parseType(): TypeSpec {
    const words: string[] = [];
    const ty: TypeSpec = { base: '', ptr: 0, isConst: false, isStatic: false, isVolatile: false, rtc: false, ref: false };
    let named = '';
    while (this.cur.k === 'id') {
      const v = this.cur.v;
      if (v === 'const' || v === 'constexpr') ty.isConst = true;
      else if (v === 'static') ty.isStatic = true;
      else if (v === 'volatile') ty.isVolatile = true;
      else if (v === 'RTC_DATA_ATTR') ty.rtc = true;
      else if (v === 'inline' || v === 'IRAM_ATTR' || v === 'ICACHE_RAM_ATTR' || v === 'PROGMEM' || v === 'extern' || v === 'register') {
        /* attributes with no simulated effect */
      } else if (v === 'struct' || v === 'enum') {
        /* "struct Point p;" */
      } else if (BASIC.has(v)) words.push(v);
      else if (!named && !words.length && this.typeNames.has(v)) named = v;
      else break;
      this.i++;
      if (named && this.is('::')) break;
    }
    while (this.is('*') || this.is('&') || this.is('const')) {
      if (this.eat('*')) ty.ptr++;
      else if (this.eat('&')) ty.ref = true;
      else this.i++;
    }
    if (named) ty.base = named;
    else ty.base = canonical(words);
    if (!ty.base) throw syntaxError(`expected a type but found ${describe(this.cur)}`, this.cur);
    return ty;
  }

  parseUnit(includes: Unit['includes']): Unit {
    const tops: Top[] = [];
    while (this.cur.k !== 'eof') {
      if (this.eat(';')) continue;
      if (this.is('using') || this.is('namespace')) {
        while (!this.is(';') && !this.atEof()) this.i++;
        this.eat(';');
        continue;
      }
      if (this.is('class')) throw unsupported('class definitions', this.cur, 'use plain functions and global variables, or a struct with data only');
      if (this.is('template')) throw unsupported('templates', this.cur);
      if (this.is('typedef')) throw unsupported('typedef', this.cur, 'use the type name directly');
      if (this.is('enum')) {
        tops.push(this.parseEnum());
        continue;
      }
      if (this.is('struct') && this.peek().k === 'id' && this.peek(2).v === '{') {
        tops.push(this.parseStruct());
        continue;
      }
      const start = this.cur;
      if (!this.startsType()) {
        if (start.k === 'id' && this.peek().v === '(') {
          throw syntaxError(`'${start.v}' needs a return type: write "void ${start.v}(…)"`, start, 'functions start with their type, like void setup() or int readSensor()');
        }
        throw syntaxError(`expected a declaration but found ${describe(start)}`, start, start.k === 'id' ? `if ${start.v} is a library type, add its #include line` : undefined);
      }
      const ty = this.parseType();
      const nameTok = this.ident('a name');
      if (this.is('(') && !this.typeNames.has(ty.base) || (this.is('(') && this.looksLikeParams())) {
        tops.push(this.parseFunction(ty, nameTok));
        continue;
      }
      const decl = this.parseDeclRest(ty, nameTok, start);
      tops.push({ k: 'gdecl', p: start, decl });
    }
    return { tops, includes };
  }

  /** After "Type name(", decide between a function and a constructor call. */
  private looksLikeParams(): boolean {
    const n = this.peek();
    return (n.k === 'op' && n.v === ')' && this.peek(2).v === '{') || this.startsType(this.i + 1);
  }

  private parseEnum(): Top {
    const p = this.expect('enum');
    this.eat('class');
    let name: string | undefined;
    if (this.cur.k === 'id') name = this.ident('a name').v;
    if (name) this.typeNames.add(name);
    this.expect('{');
    const items: { name: string; value?: Expr; p: SourcePos }[] = [];
    while (!this.is('}')) {
      const n = this.ident('an enum name');
      const it: { name: string; value?: Expr; p: SourcePos } = { name: n.v, p: n };
      if (this.eat('=')) it.value = this.expr(2);
      items.push(it);
      if (!this.eat(',')) break;
    }
    this.expect('}');
    this.expect(';', 'after the enum');
    return { k: 'enum', p, items, name };
  }

  private parseStruct(): Top {
    const p = this.expect('struct');
    const name = this.ident('a struct name').v;
    this.typeNames.add(name);
    this.expect('{');
    const fields: { ty: TypeSpec; name: string; dims: (Expr | null)[]; p: SourcePos }[] = [];
    while (!this.is('}')) {
      const ty = this.parseType();
      do {
        const n = this.ident('a field name');
        if (this.is('(')) throw unsupported('methods inside a struct', n, 'write a normal function that takes the struct');
        const dims: (Expr | null)[] = [];
        while (this.eat('[')) {
          dims.push(this.is(']') ? null : this.expr());
          this.expect(']');
        }
        fields.push({ ty, name: n.v, dims, p: n });
      } while (this.eat(','));
      this.expect(';', 'after the field');
    }
    this.expect('}');
    this.expect(';', 'after the struct');
    return { k: 'struct', p, name, fields };
  }

  private parseParams(): Param[] {
    const params: Param[] = [];
    this.expect('(');
    if (this.is('void') && this.peek().v === ')') this.i++;
    while (!this.is(')')) {
      const ty = this.parseType();
      let name = '';
      let p: SourcePos = this.cur;
      if (this.cur.k === 'id') {
        const n = this.ident('a parameter name');
        name = n.v;
        p = n;
      }
      let dims = 0;
      while (this.eat('[')) {
        if (!this.is(']')) this.expr();
        this.expect(']');
        dims++;
      }
      if (this.eat('=')) throw unsupported('default parameter values', p);
      params.push({ ty, name, dims, p });
      if (!this.eat(',')) break;
    }
    this.expect(')', 'to close the parameter list');
    return params;
  }

  private parseFunction(ret: TypeSpec, nameTok: Tok): FuncDecl {
    const params = this.parseParams();
    if (this.eat(';')) return { k: 'func', p: nameTok, ret, name: nameTok.v, params, body: null, isr: false };
    if (!this.is('{')) throw syntaxError(`expected '{' to start the body of ${nameTok.v}()`, this.cur);
    const body = this.block();
    return { k: 'func', p: nameTok, ret, name: nameTok.v, params, body, isr: false };
  }

  private parseDeclRest(ty: TypeSpec, nameTok: Tok, start: SourcePos): Extract<Stmt, { k: 'decl' }> {
    const decls: Declarator[] = [];
    let n: Tok = nameTok;
    while (true) {
      const d: Declarator = { name: n.v, p: n, dims: [] };
      while (this.eat('[')) {
        d.dims.push(this.is(']') ? null : this.expr());
        this.expect(']', 'to close the array size');
      }
      if (this.eat('=')) d.init = this.is('{') ? this.initList() : this.expr(2);
      else if (this.is('(')) {
        this.i++;
        d.ctorArgs = [];
        while (!this.is(')')) {
          d.ctorArgs.push(this.expr(2));
          if (!this.eat(',')) break;
        }
        this.expect(')');
      } else if (this.is('{')) d.init = this.initList();
      decls.push(d);
      if (!this.eat(',')) break;
      while (this.eat('*')) {
        /* int *a, *b: pointer marks on later names */
      }
      n = this.ident('a variable name');
    }
    this.expect(';', 'after the declaration');
    return { k: 'decl', p: start, ty, decls };
  }

  private initList(): Expr {
    const p = this.expect('{');
    const items: Expr[] = [];
    while (!this.is('}')) {
      items.push(this.is('{') ? this.initList() : this.expr(2));
      if (!this.eat(',')) break;
    }
    this.expect('}', 'to close the list');
    return { k: 'init', p, items };
  }

  block(): Extract<Stmt, { k: 'block' }> {
    const p = this.expect('{');
    const body: Stmt[] = [];
    while (!this.is('}')) {
      if (this.atEof()) throw syntaxError("a '{' is never closed: add the missing '}'", p);
      body.push(this.stmt());
    }
    this.i++;
    return { k: 'block', p, body };
  }

  stmt(): Stmt {
    const c = this.cur;
    if (c.k === 'op' && c.v === '{') return this.block();
    if (c.k === 'op' && c.v === ';') {
      this.i++;
      return { k: 'empty', p: c };
    }
    if (c.k === 'id') {
      switch (c.v) {
        case 'if': {
          this.i++;
          this.expect('(', 'after if');
          const cond = this.expr();
          this.expect(')', 'to close the if condition');
          const a = this.stmt();
          const b = this.eat('else') ? this.stmt() : undefined;
          return { k: 'if', p: c, c: cond, a, b };
        }
        case 'while': {
          this.i++;
          this.expect('(', 'after while');
          const cond = this.expr();
          this.expect(')', 'to close the while condition');
          return { k: 'while', p: c, c: cond, body: this.stmt() };
        }
        case 'do': {
          this.i++;
          const body = this.stmt();
          this.expect('while', 'after the do body');
          this.expect('(');
          const cond = this.expr();
          this.expect(')');
          this.expect(';', 'after do … while');
          return { k: 'do', p: c, c: cond, body };
        }
        case 'for': {
          this.i++;
          this.expect('(', 'after for');
          let init: Stmt | undefined;
          if (!this.eat(';')) {
            if (this.startsType()) {
              const ty = this.parseType();
              const n = this.ident('a loop variable name');
              if (this.is(':')) throw unsupported('range-based for loops', n, 'use for (int i = 0; i < n; i++)');
              init = this.parseDeclRest(ty, n, c);
            } else {
              init = { k: 'expr', p: this.cur, e: this.expr() };
              this.expect(';', 'after the for initialiser');
            }
          }
          const cond = this.is(';') ? undefined : this.expr();
          this.expect(';', 'after the for condition');
          const u = this.is(')') ? undefined : this.expr();
          this.expect(')', 'to close the for header');
          return { k: 'for', p: c, init, c: cond, u, body: this.stmt() };
        }
        case 'switch': {
          this.i++;
          this.expect('(');
          const e = this.expr();
          this.expect(')');
          this.expect('{');
          const cases: { tests: Expr[] | null; body: Stmt[]; p: SourcePos }[] = [];
          while (!this.is('}')) {
            const cp = this.cur;
            if (this.eat('case')) {
              const test = this.expr(2);
              this.expect(':', 'after the case value');
              const last = cases[cases.length - 1];
              if (last && last.body.length === 0 && last.tests) last.tests.push(test);
              else cases.push({ tests: [test], body: [], p: cp });
            } else if (this.eat('default')) {
              this.expect(':', 'after default');
              cases.push({ tests: null, body: [], p: cp });
            } else {
              if (!cases.length) throw syntaxError('code inside switch must follow a case label', this.cur);
              cases[cases.length - 1].body.push(this.stmt());
            }
          }
          this.i++;
          return { k: 'switch', p: c, e, cases };
        }
        case 'break':
          this.i++;
          this.expect(';', 'after break');
          return { k: 'break', p: c };
        case 'continue':
          this.i++;
          this.expect(';', 'after continue');
          return { k: 'continue', p: c };
        case 'return': {
          this.i++;
          const e = this.is(';') ? undefined : this.expr();
          this.expect(';', 'after return');
          return { k: 'return', p: c, e };
        }
        case 'goto':
          throw unsupported('goto', c);
        case 'try':
        case 'throw':
          throw unsupported('exceptions (try/throw)', c, 'Arduino builds turn exceptions off');
      }
      if (this.startsType()) {
        const ty = this.parseType();
        const n = this.ident('a variable name');
        return this.parseDeclRest(ty, n, c);
      }
    }
    const e = this.expr();
    this.expect(';');
    return { k: 'expr', p: c, e };
  }

  /** Expression with optional minimum level: 0 = comma, 1 = assignment, 2 = no comma. */
  expr(level = 0): Expr {
    let e = this.assign();
    if (level === 0) {
      while (this.is(',')) {
        const p = this.cur;
        this.i++;
        e = { k: 'comma', p, a: e, b: this.assign() };
      }
    }
    return e;
  }

  private assign(): Expr {
    const a = this.ternary();
    const c = this.cur;
    if (c.k === 'op' && ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='].includes(c.v)) {
      this.i++;
      const b = this.is('{') ? this.initList() : this.assign();
      return { k: 'assign', p: c, op: c.v, a, b };
    }
    return a;
  }

  private ternary(): Expr {
    const c = this.binary(1);
    if (this.is('?')) {
      const p = this.cur;
      this.i++;
      const a = this.assign();
      this.expect(':', 'in the ?: expression');
      const b = this.assign();
      return { k: 'cond', p, c, a, b };
    }
    return c;
  }

  private binary(minPrec: number): Expr {
    let a = this.unary();
    while (true) {
      const c = this.cur;
      const prec = c.k === 'op' ? BIN_PREC[c.v] : undefined;
      if (prec === undefined || prec < minPrec) return a;
      this.i++;
      const b = this.binary(prec + 1);
      a = { k: 'bin', p: c, op: c.v, a, b };
    }
  }

  private unary(): Expr {
    const c = this.cur;
    if (c.k === 'op') {
      if (c.v === '!' || c.v === '~' || c.v === '-' || c.v === '+' || c.v === '&' || c.v === '*') {
        this.i++;
        return { k: 'un', p: c, op: c.v, a: this.unary() };
      }
      if (c.v === '++' || c.v === '--') {
        this.i++;
        return { k: 'un', p: c, op: c.v, a: this.unary() };
      }
      if (c.v === '(' && this.startsType(this.i + 1) && !this.typeNames.has(this.peek().v)) {
        this.i++;
        const ty = this.parseType();
        this.expect(')', 'to close the cast');
        return { k: 'cast', p: c, ty, a: this.unary() };
      }
    }
    if (c.k === 'id' && c.v === 'sizeof') {
      this.i++;
      if (this.is('(') && this.startsType(this.i + 1)) {
        this.i++;
        const ty = this.parseType();
        this.expect(')');
        return { k: 'sizeof', p: c, ty };
      }
      return { k: 'sizeof', p: c, a: this.unary() };
    }
    if (c.k === 'id' && (c.v === 'new' || c.v === 'delete')) throw unsupported(`'${c.v}' (dynamic memory)`, c, 'declare the object as a global variable instead');
    return this.postfix(this.primary());
  }

  private postfix(e: Expr): Expr {
    while (true) {
      const c = this.cur;
      if (c.k !== 'op') return e;
      if (c.v === '(') {
        this.i++;
        const args: Expr[] = [];
        while (!this.is(')')) {
          args.push(this.expr(2));
          if (!this.eat(',')) {
            if (!this.is(')')) throw syntaxError(`expected ',' or ')' in the call but found ${describe(this.cur)}`, this.cur);
            break;
          }
        }
        this.expect(')', 'to close the call');
        e = { k: 'call', p: c, fn: e, args };
      } else if (c.v === '[') {
        this.i++;
        const i = this.expr();
        this.expect(']', 'to close the index');
        e = { k: 'index', p: c, a: e, i };
      } else if (c.v === '.' || c.v === '->') {
        this.i++;
        const n = this.ident('a member name');
        e = { k: 'member', p: n, a: e, name: n.v };
      } else if (c.v === '++' || c.v === '--') {
        this.i++;
        e = { k: 'post', p: c, op: c.v, a: e };
      } else return e;
    }
  }

  private primary(): Expr {
    const c = this.cur;
    switch (c.k) {
      case 'num':
        this.i++;
        return { k: 'num', p: c, ...c.num! };
      case 'str': {
        this.i++;
        let value = c.v;
        while (this.cur.k === 'str') value += this.t[this.i++].v; // "a" "b" concatenation
        return { k: 'str', p: c, value };
      }
      case 'chr':
        this.i++;
        return { k: 'chr', p: c, value: c.v.charCodeAt(0) };
      case 'id': {
        this.i++;
        if (c.v === 'true' || c.v === 'false') return { k: 'bool', p: c, value: c.v === 'true' };
        if (c.v === 'F' && this.is('(') && this.peek().k === 'str') {
          // F("text") keeps text in flash; same value here.
          this.i++;
          const s = this.primary();
          this.expect(')');
          return s;
        }
        if (this.is('::')) {
          this.i++;
          const n = this.ident('a name after ::');
          return { k: 'scope', p: c, ns: c.v, name: n.v };
        }
        // Function-style casts and constructors: int(x), String(x), Servo().
        return { k: 'id', p: c, name: c.v };
      }
      case 'op':
        if (c.v === '(') {
          this.i++;
          const e = this.expr();
          this.expect(')', 'to close the bracket');
          return e;
        }
        if (c.v === '[') {
          // Lambda: [] (params) { body } — captures are not needed for globals.
          this.i++;
          while (!this.is(']')) this.i++;
          this.i++;
          const params = this.is('(') ? this.parseParams() : [];
          if (this.eat('->')) this.parseType();
          const body = this.block();
          return { k: 'lambda', p: c, params, body };
        }
        if (c.v === '{') return this.initList();
        break;
      case 'eof':
        throw syntaxError('the sketch ends in the middle of an expression', c);
    }
    throw syntaxError(`unexpected ${describe(c)}`, c);
  }
}

function canonical(words: string[]): string {
  if (!words.length) return '';
  const w = words.filter((x) => x !== 'signed' || words.length === 1);
  const has = (x: string) => w.includes(x);
  const longs = w.filter((x) => x === 'long').length;
  const uns = has('unsigned');
  const rest = w.filter((x) => x !== 'unsigned' && x !== 'long' && x !== 'short' && x !== 'int');
  if (rest.length > 1) return rest.join(' ');
  if (rest.length === 1) {
    const r = rest[0];
    if (r === 'char') return uns ? 'unsigned char' : words.includes('signed') ? 'signed char' : 'char';
    if (r === 'double' && longs) return 'double';
    if (r === 'boolean') return 'bool';
    if (r === 'word') return 'uint16_t';
    if (r === 'signed') return 'int';
    return r;
  }
  if (has('short')) return uns ? 'unsigned short' : 'short';
  if (longs >= 2) return uns ? 'unsigned long long' : 'long long';
  if (longs === 1) return uns ? 'unsigned long' : 'long';
  return uns ? 'unsigned int' : 'int';
}

export function describe(t: Tok): string {
  if (t.k === 'eof') return 'the end of the sketch';
  if (t.k === 'str') return `"${t.v}"`;
  if (t.k === 'num') return `the number ${t.v}`;
  return `'${t.v}'`;
}

export function parseSketch(src: string, typeNames: Iterable<string>): Unit {
  const pre = lex(src);
  const p = new Parser(pre.tokens, typeNames);
  return p.parseUnit(pre.includes);
}

export { InterpError };
