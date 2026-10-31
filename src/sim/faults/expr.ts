import { fail, ok } from "../../core/result.ts";
import type { Result } from "../../core/result.ts";

export const MAX_TRIGGER_LENGTH = 200;
export const MAX_TRIGGER_DEPTH = 8;

export type Expr =
  | { kind: "num"; value: number }
  | { kind: "name"; name: string }
  | { kind: "peak" | "avg"; name: string }
  | { kind: "default"; name: string; fallback: number }
  | { kind: "neg"; arg: Expr }
  | { kind: "bin"; op: BinOp; left: Expr; right: Expr };

type BinOp = "+" | "-" | "*" | "/" | "<" | "<=" | ">" | ">=" | "==" | "&&" | "||";

export interface Quantities {
  value(name: string): number | undefined;
  peak(name: string): number | undefined;
  avg(name: string): number | undefined;
}

export type BadExpr = { code: "bad-expr"; at: number };

type Token = { text: string; at: number };

const TOKEN = /(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*|&&|\|\||<=|>=|==|[-+*/<>(),])/y;
const NUMBER = /^(\d|\.\d)/;
const NAME = /^[A-Za-z_]/;
const COMPARISONS: readonly string[] = ["<", "<=", ">", ">=", "=="];

function tokenize(src: string): Token[] | BadExpr {
  const tokens: Token[] = [];
  let pos = 0;
  for (;;) {
    while (/\s/.test(src[pos] ?? "")) pos++;
    if (pos >= src.length) return tokens;
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(src);
    if (!m) return { code: "bad-expr", at: pos };
    tokens.push({ text: m[1], at: pos });
    pos = TOKEN.lastIndex;
  }
}

class Parser {
  private i = 0;
  private depth = 0;

  private readonly tokens: Token[];
  private readonly end: number;

  constructor(tokens: Token[], end: number) {
    this.tokens = tokens;
    this.end = end;
  }

  parse(): Expr {
    const e = this.or();
    if (this.i < this.tokens.length) throw this.error();
    return e;
  }

  private error(): BadExpr {
    return { code: "bad-expr", at: this.tokens[this.i]?.at ?? this.end };
  }

  private peekText(): string | undefined {
    return this.tokens[this.i]?.text;
  }

  private expect(text: string): void {
    if (this.peekText() !== text) throw this.error();
    this.i++;
  }

  private enter(): void {
    if (++this.depth > MAX_TRIGGER_DEPTH) throw this.error();
  }

  private or(): Expr {
    let left = this.and();
    while (this.peekText() === "||") {
      this.i++;
      left = { kind: "bin", op: "||", left, right: this.and() };
    }
    return left;
  }

  private and(): Expr {
    let left = this.comparison();
    while (this.peekText() === "&&") {
      this.i++;
      left = { kind: "bin", op: "&&", left, right: this.comparison() };
    }
    return left;
  }

  private comparison(): Expr {
    const left = this.sum();
    const op = this.peekText();
    if (op === undefined || !COMPARISONS.includes(op)) return left;
    this.i++;
    return { kind: "bin", op: op as BinOp, left, right: this.sum() };
  }

  private sum(): Expr {
    let left = this.product();
    for (let op = this.peekText(); op === "+" || op === "-"; op = this.peekText()) {
      this.i++;
      left = { kind: "bin", op, left, right: this.product() };
    }
    return left;
  }

  private product(): Expr {
    let left = this.unary();
    for (let op = this.peekText(); op === "*" || op === "/"; op = this.peekText()) {
      this.i++;
      left = { kind: "bin", op, left, right: this.unary() };
    }
    return left;
  }

  private unary(): Expr {
    if (this.peekText() === "-") {
      this.i++;
      return { kind: "neg", arg: this.unary() };
    }
    return this.primary();
  }

  private primary(): Expr {
    const text = this.peekText();
    if (text === undefined) throw this.error();
    if (NUMBER.test(text)) {
      this.i++;
      return { kind: "num", value: Number(text) };
    }
    if (text === "(") {
      this.i++;
      this.enter();
      const inner = this.or();
      this.expect(")");
      this.depth--;
      return inner;
    }
    if (!NAME.test(text)) throw this.error();
    this.i++;
    if (this.peekText() !== "(") return { kind: "name", name: text };
    return this.call(text);
  }

  private call(fn: string): Expr {
    if (fn !== "peak" && fn !== "avg" && fn !== "default") {
      this.i--;
      throw this.error();
    }
    this.i++;
    this.enter();
    const name = this.tokens[this.i]?.text;
    if (name === undefined || !NAME.test(name)) throw this.error();
    this.i++;
    let result: Expr;
    if (fn === "default") {
      this.expect(",");
      const negative = this.peekText() === "-";
      if (negative) this.i++;
      const fallback = this.peekText();
      if (fallback === undefined || !NUMBER.test(fallback)) throw this.error();
      this.i++;
      result = { kind: "default", name, fallback: negative ? -Number(fallback) : Number(fallback) };
    } else {
      result = { kind: fn, name };
    }
    this.expect(")");
    this.depth--;
    return result;
  }
}

export function parseTrigger(src: string): Result<Expr, BadExpr> {
  if (src.length > MAX_TRIGGER_LENGTH) return fail({ code: "bad-expr", at: MAX_TRIGGER_LENGTH });
  const tokens = tokenize(src);
  if (!Array.isArray(tokens)) return fail(tokens);
  try {
    return ok(new Parser(tokens, src.length).parse());
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e) return fail(e as BadExpr);
    throw e;
  }
}

type Value = number | boolean | undefined;

function evalNode(e: Expr, q: Quantities): Value {
  switch (e.kind) {
    case "num":
      return e.value;
    case "name":
      return q.value(e.name);
    case "peak":
      return q.peak(e.name);
    case "avg":
      return q.avg(e.name);
    case "default":
      return q.value(e.name) ?? e.fallback;
    case "neg": {
      const v = evalNode(e.arg, q);
      return typeof v === "number" ? -v : undefined;
    }
    case "bin":
      return evalBin(e, q);
  }
}

function evalBin(e: Extract<Expr, { kind: "bin" }>, q: Quantities): Value {
  const left = evalNode(e.left, q);
  const right = evalNode(e.right, q);
  if (e.op === "&&") {
    if (left === false || right === false) return false;
    return typeof left === "boolean" && typeof right === "boolean" ? true : undefined;
  }
  if (e.op === "||") {
    if (left === true || right === true) return true;
    return typeof left === "boolean" && typeof right === "boolean" ? false : undefined;
  }
  if (typeof left !== "number" || typeof right !== "number") return undefined;
  switch (e.op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return right === 0 ? undefined : left / right;
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "==":
      return left === right;
  }
}

/** True or false when every quantity the trigger names is known, otherwise undefined: the detector cannot tell. */
export function evalTrigger(e: Expr, q: Quantities): boolean | undefined {
  const v = evalNode(e, q);
  return typeof v === "boolean" ? v : undefined;
}
