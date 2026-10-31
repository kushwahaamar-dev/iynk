export type ExprAst =
  | { t: "num"; v: number }
  | { t: "name"; n: string }
  | { t: "neg"; a: ExprAst }
  | { t: "bin"; op: BinOp; a: ExprAst; b: ExprAst }
  | { t: "call"; fn: FnName; args: ExprAst[] };

type BinOp = "+" | "-" | "*" | "/" | "<" | "<=" | ">" | ">=" | "==" | "!=";
type FnName = "min" | "max" | "clamp" | "round" | "abs";

export type ParseResult = { ok: true; ast: ExprAst } | { ok: false; error: string; at: number };

const MAX_SOURCE = 200;
const MAX_DEPTH = 16;
const MAX_NODES = 64;

const ARITY: Record<FnName, { min: number; max: number }> = {
  min: { min: 2, max: MAX_NODES },
  max: { min: 2, max: MAX_NODES },
  clamp: { min: 3, max: 3 },
  round: { min: 1, max: 1 },
  abs: { min: 1, max: 1 },
};

const isFn = (s: string): s is FnName => Object.hasOwn(ARITY, s);

type Token = { k: "num"; v: number; at: number } | { k: "name"; v: string; at: number } | { k: "op"; v: string; at: number } | { k: "end"; at: number };

class Reject extends Error {
  readonly reason: string;
  readonly at: number;

  constructor(reason: string, at: number) {
    super(reason);
    this.reason = reason;
    this.at = at;
  }
}

const TOKEN = /(\d+(?:\.\d+)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|(<=|>=|==|!=|[-+*/<>(),])/y;

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let pos = 0;
  for (;;) {
    while (pos < src.length && /\s/.test(src[pos])) pos++;
    if (pos >= src.length) {
      out.push({ k: "end", at: src.length });
      return out;
    }
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(src);
    if (m === null) throw new Reject("unexpected-character", pos);
    if (m[1] !== undefined) out.push({ k: "num", v: Number(m[1]), at: pos });
    else if (m[2] !== undefined) out.push({ k: "name", v: m[2], at: pos });
    else out.push({ k: "op", v: m[3], at: pos });
    pos = TOKEN.lastIndex;
  }
}

class Parser {
  private i = 0;
  private nodes = 0;
  private nest = 0;
  private readonly toks: Token[];

  constructor(toks: Token[]) {
    this.toks = toks;
  }

  private get cur(): Token {
    return this.toks[this.i];
  }

  private isOp(v: string): boolean {
    return this.cur.k === "op" && this.cur.v === v;
  }

  private expectOp(v: string): void {
    if (!this.isOp(v)) throw new Reject(`expected-${v}`, this.cur.at);
    this.i++;
  }

  private node<T extends ExprAst>(n: T, at: number): T {
    if (++this.nodes > MAX_NODES) throw new Reject("too-many-nodes", at);
    return n;
  }

  private nested<T>(at: number, f: () => T): T {
    if (++this.nest > MAX_DEPTH) throw new Reject("too-deep", at);
    const r = f();
    this.nest--;
    return r;
  }

  parse(): ExprAst {
    const ast = this.comparison();
    if (this.cur.k !== "end") throw new Reject("unexpected-token", this.cur.at);
    return ast;
  }

  private comparison(): ExprAst {
    let a = this.sum();
    while (this.cur.k === "op" && ["<", "<=", ">", ">=", "==", "!="].includes(this.cur.v)) {
      const { v, at } = this.cur;
      this.i++;
      a = this.node({ t: "bin", op: v as BinOp, a, b: this.sum() }, at);
    }
    return a;
  }

  private sum(): ExprAst {
    let a = this.product();
    while (this.isOp("+") || this.isOp("-")) {
      const { v, at } = this.cur as { v: string; at: number };
      this.i++;
      a = this.node({ t: "bin", op: v as BinOp, a, b: this.product() }, at);
    }
    return a;
  }

  private product(): ExprAst {
    let a = this.unary();
    while (this.isOp("*") || this.isOp("/")) {
      const { v, at } = this.cur as { v: string; at: number };
      this.i++;
      a = this.node({ t: "bin", op: v as BinOp, a, b: this.unary() }, at);
    }
    return a;
  }

  private unary(): ExprAst {
    if (!this.isOp("-")) return this.primary();
    const { at } = this.cur;
    this.i++;
    return this.nested(at, () => this.node({ t: "neg", a: this.unary() }, at));
  }

  private primary(): ExprAst {
    const tok = this.cur;
    if (tok.k === "num") {
      this.i++;
      return this.node({ t: "num", v: tok.v }, tok.at);
    }
    if (tok.k === "name") {
      this.i++;
      if (this.isOp("(")) return this.call(tok);
      if (isFn(tok.v) || tok.v in Object.prototype) throw new Reject("reserved-name", tok.at);
      return this.node({ t: "name", n: tok.v }, tok.at);
    }
    if (this.isOp("(")) {
      this.i++;
      const inner = this.nested(tok.at, () => this.comparison());
      this.expectOp(")");
      return inner;
    }
    throw new Reject("unexpected-token", tok.at);
  }

  private call(tok: { v: string; at: number }): ExprAst {
    if (!isFn(tok.v)) throw new Reject("unknown-function", tok.at);
    const fn = tok.v;
    this.i++;
    const args: ExprAst[] = [];
    this.nested(tok.at, () => {
      if (!this.isOp(")")) {
        args.push(this.comparison());
        while (this.isOp(",")) {
          this.i++;
          args.push(this.comparison());
        }
      }
    });
    const close = this.cur.at;
    this.expectOp(")");
    if (args.length < ARITY[fn].min || args.length > ARITY[fn].max) throw new Reject("wrong-argument-count", close);
    return this.node({ t: "call", fn, args }, tok.at);
  }
}

export function parseExpr(src: string): ParseResult {
  if (src.length > MAX_SOURCE) return { ok: false, error: "too-long", at: MAX_SOURCE };
  try {
    return { ok: true, ast: new Parser(tokenize(src)).parse() };
  } catch (e) {
    if (e instanceof Reject) return { ok: false, error: e.reason, at: e.at };
    throw e;
  }
}

/** Every name the expression reads, without duplicates. */
export function exprNames(ast: ExprAst, into = new Set<string>()): Set<string> {
  if (ast.t === "name") into.add(ast.n);
  else if (ast.t === "neg") exprNames(ast.a, into);
  else if (ast.t === "bin") {
    exprNames(ast.a, into);
    exprNames(ast.b, into);
  } else if (ast.t === "call") for (const a of ast.args) exprNames(a, into);
  return into;
}

function evalBinary(op: BinOp, a: number, b: number): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? NaN : a / b;
    case "<":
      return a < b ? 1 : 0;
    case "<=":
      return a <= b ? 1 : 0;
    case ">":
      return a > b ? 1 : 0;
    case ">=":
      return a >= b ? 1 : 0;
    case "==":
      return a === b ? 1 : 0;
    case "!=":
      return a !== b ? 1 : 0;
  }
}

function evalCall(fn: FnName, v: number[]): number {
  switch (fn) {
    case "min":
      return Math.min(...v);
    case "max":
      return Math.max(...v);
    case "clamp":
      return Math.min(Math.max(v[0], v[1]), v[2]);
    case "round":
      return Math.floor(v[0] + 0.5);
    case "abs":
      return Math.abs(v[0]);
  }
}

/** Evaluates to a number; division by zero and unknown names give NaN. */
export function evalExpr(ast: ExprAst, env: (name: string) => number | undefined): number {
  switch (ast.t) {
    case "num":
      return ast.v;
    case "name":
      return env(ast.n) ?? NaN;
    case "neg":
      return -evalExpr(ast.a, env);
    case "bin":
      return evalBinary(ast.op, evalExpr(ast.a, env), evalExpr(ast.b, env));
    case "call":
      return evalCall(
        ast.fn,
        ast.args.map((a) => evalExpr(a, env)),
      );
  }
}
