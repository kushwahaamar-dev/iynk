import { sha256Hex } from "../../core/sha256.ts";
import { parseSketch } from "../../lib/interp/arduino/parser.ts";
import type { Expr, Stmt, Unit } from "../../lib/interp/arduino/parser.ts";
import { PROFILES, resolvePin } from "../../lib/interp/profiles.ts";
import type { BoardId, BoardProfile } from "../../lib/interp/profiles.ts";
import type { CodeFact, CodeFacts } from "./types.ts";

type Span = NonNullable<CodeFact<unknown>["span"]>;
type Mode = CodeFacts["pinModes"][number]["value"]["mode"];

interface ParsedFile {
  key: string;
  src: string;
  lineStarts: number[];
  unit: Unit;
}

interface Literal {
  value: number;
  file: string;
  span?: Span;
}

/** Library types the parser must know to read a declaration such as `Adafruit_BME280 bme;`. */
const TYPE_NAMES = [
  "HardwareSerial", "TwoWire", "SPIClass", "SPISettings", "Servo", "AccelStepper", "Adafruit_NeoPixel", "Adafruit_SSD1306",
  "Adafruit_PWMServoDriver", "LiquidCrystal_I2C", "LiquidCrystal", "MPU6050", "Adafruit_BME280", "Adafruit_Sensor", "QTRSensors",
  "WiFiClass", "IPAddress", "WebServer", "ESP8266WebServer", "ArduinoLEDMatrix", "EspClass",
];

/** Argument index of the 7-bit address in `begin()`, by the type of the object it is called on. */
const BEGIN_ADDRESS_ARG: Record<string, number> = { Adafruit_BME280: 0, Adafruit_SSD1306: 1 };

const MODES: ReadonlySet<string> = new Set<Mode>(["INPUT", "OUTPUT", "INPUT_PULLUP"]);
const NOT_ARDUINO = /\.(py|v|sv|vhd|md)$/i;
const CACHE_LIMIT = 16;

const cache = new Map<string, CodeFacts>();

const emptyFacts = (language: CodeFacts["language"]): CodeFacts => ({
  language,
  pinModes: [],
  pinWrites: [],
  pinReads: [],
  i2cAddresses: [],
  unresolved: 0,
});

function lineStartsOf(src: string): number[] {
  const starts = [0];
  for (let i = src.indexOf("\n"); i >= 0; i = src.indexOf("\n", i + 1)) starts.push(i + 1);
  return starts;
}

/** The line with comment and string contents blanked, so a search sees code only. */
function codeOnly(text: string): string {
  let out = "";
  let quote: string | undefined;
  for (let i = 0; i < text.length; i++) {
    const c = text[i] ?? "";
    if (quote !== undefined) {
      if (c === "\\") {
        out += "  ";
        i++;
      } else {
        out += c === quote ? c : " ";
        if (c === quote) quote = undefined;
      }
    } else if (c === "/" && text[i + 1] === "/") {
      return out + " ".repeat(text.length - i);
    } else {
      if (c === '"' || c === "'") quote = c;
      out += c;
    }
  }
  return out;
}

const wholeNumber = (value: number): RegExp => new RegExp(`(?<![\\w.])${value}(?![\\w.])`);

/** Where the decimal literal `value` is written on `line`, or on a `#define` of a name that line uses. */
function locate(file: ParsedFile, line: number, value: number): Span | undefined {
  const lineAt = (n: number): string => file.src.slice(file.lineStarts[n - 1] ?? 0, (file.lineStarts[n] ?? file.src.length + 1) - 1);
  const code = codeOnly(lineAt(line));
  const hit = wholeNumber(value).exec(code);
  if (hit) return { pos: (file.lineStarts[line - 1] ?? 0) + hit.index, len: String(value).length };

  const defined = new RegExp(`^(\\s*#\\s*define\\s+(\\w+)\\s+)(${value})\\s*(?://.*)?$`, "gm");
  const used = new Set(code.match(/\w+/g));
  const matches = [...file.src.matchAll(defined)].filter((m) => used.has(m[2] ?? ""));
  const only = matches.length === 1 ? matches[0] : undefined;
  return only?.index === undefined ? undefined : { pos: only.index + (only[1]?.length ?? 0), len: String(value).length };
}

function exprChildren(e: Expr): Expr[] {
  switch (e.k) {
    case "bin":
    case "assign":
    case "comma":
      return [e.a, e.b];
    case "un":
    case "post":
    case "cast":
    case "member":
      return [e.a];
    case "cond":
      return [e.c, e.a, e.b];
    case "call":
      return [e.fn, ...e.args];
    case "index":
      return [e.a, e.i];
    case "init":
      return e.items;
    case "sizeof":
      return e.a ? [e.a] : [];
    default:
      return [];
  }
}

function stmtChildren(s: Stmt): { exprs: Expr[]; stmts: Stmt[] } {
  switch (s.k) {
    case "block":
      return { exprs: [], stmts: s.body };
    case "decl":
      return {
        exprs: s.decls.flatMap((d) => [...d.dims.filter((x): x is Expr => x !== null), ...(d.init ? [d.init] : []), ...(d.ctorArgs ?? [])]),
        stmts: [],
      };
    case "expr":
      return { exprs: [s.e], stmts: [] };
    case "if":
      return { exprs: [s.c], stmts: s.b ? [s.a, s.b] : [s.a] };
    case "while":
    case "do":
      return { exprs: [s.c], stmts: [s.body] };
    case "for":
      return { exprs: [s.c, s.u].filter((x): x is Expr => x !== undefined), stmts: [s.init, s.body].filter((x): x is Stmt => x !== undefined) };
    case "switch":
      return { exprs: [s.e, ...s.cases.flatMap((c) => c.tests ?? [])], stmts: s.cases.flatMap((c) => c.body) };
    case "return":
      return { exprs: s.e ? [s.e] : [], stmts: [] };
    default:
      return { exprs: [], stmts: [] };
  }
}

function walkExpr(e: Expr, visit: (e: Expr) => void, onStmt: (s: Stmt) => void): void {
  visit(e);
  if (e.k === "lambda") walkStmt(e.body, visit, onStmt);
  for (const child of exprChildren(e)) walkExpr(child, visit, onStmt);
}

function walkStmt(s: Stmt, visit: (e: Expr) => void, onStmt: (s: Stmt) => void): void {
  onStmt(s);
  const { exprs, stmts } = stmtChildren(s);
  for (const e of exprs) walkExpr(e, visit, onStmt);
  for (const child of stmts) walkStmt(child, visit, onStmt);
}

/** Every statement and expression of a unit, with the function's own names (parameters and locals) when inside one. */
function walkUnit(unit: Unit, visit: (e: Expr, local: ReadonlySet<string>) => void, onStmt: (s: Stmt) => void = () => undefined): void {
  const none: ReadonlySet<string> = new Set();
  for (const top of unit.tops) {
    if (top.k === "gdecl") {
      walkStmt(top.decl, (e) => visit(e, none), onStmt);
    } else if (top.k === "func" && top.body) {
      const local = new Set(top.params.map((p) => p.name));
      walkStmt(top.body, () => undefined, (s) => {
        if (s.k === "decl") for (const d of s.decls) local.add(d.name);
      });
      walkStmt(top.body, (e) => visit(e, local), onStmt);
    }
  }
}

const isId = (e: Expr | undefined, name?: string): e is Extract<Expr, { k: "id" }> =>
  e?.k === "id" && (name === undefined || e.name === name);

function parseAll(sources: Record<string, string>, entry: string[]): ParsedFile[] {
  const files: ParsedFile[] = [];
  const seen = new Set<string>();
  const keyOf = (name: string): string | undefined =>
    Object.keys(sources).find((k) => k === name || k.endsWith(`/${name}`));
  const visit = (key: string): void => {
    const src = sources[key];
    if (src === undefined || seen.has(key)) return;
    seen.add(key);
    let unit: Unit;
    try {
      unit = parseSketch(src, TYPE_NAMES);
    } catch {
      return;
    }
    files.push({ key, src, lineStarts: lineStartsOf(src), unit });
    for (const inc of unit.includes) {
      const next = keyOf(inc.name);
      if (next !== undefined) visit(next);
    }
  };
  for (const key of entry) visit(key);
  return files;
}

/** Global variables with a number literal as initialiser that no statement ever assigns. */
function collectConstants(files: ParsedFile[]): Map<string, Literal> {
  const assigned = new Set<string>();
  for (const f of files) {
    walkUnit(f.unit, (e) => {
      if ((e.k === "assign" || e.k === "post" || (e.k === "un" && (e.op === "++" || e.op === "--"))) && isId(e.a)) assigned.add(e.a.name);
    });
  }
  const out = new Map<string, Literal>();
  for (const f of files) {
    for (const top of f.unit.tops) {
      if (top.k !== "gdecl") continue;
      for (const d of top.decl.decls) {
        const init = d.init;
        if (init?.k !== "num" || init.float || d.dims.length > 0 || top.decl.ty.ptr > 0) continue;
        if (!top.decl.ty.isConst && assigned.has(d.name)) continue;
        const span = locate(f, init.p.line, init.value);
        out.set(d.name, { value: init.value, file: f.key, ...(span ? { span } : {}) });
      }
    }
  }
  return out;
}

function typesOfVariables(files: ParsedFile[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const f of files) {
    walkUnit(f.unit, () => undefined, (s) => {
      if (s.k === "decl") for (const d of s.decls) out.set(d.name, s.ty.base);
    });
  }
  return out;
}

function profileOf(variant: string): BoardProfile | undefined {
  return (PROFILES as Record<string, BoardProfile | undefined>)[variant as BoardId];
}

/**
 * A static pass over the sketches. Only literal arguments become facts: a number, a global constant with a literal
 * value, or a board pin name. Anything else counts in `unresolved` and never produces a fact.
 */
export function extractCodeFacts(sources: Record<string, string>, entry: string[], board: { variant: string }): CodeFacts {
  const cacheKey = sha256Hex(JSON.stringify([board.variant, entry, Object.keys(sources).sort().map((k) => [k, sources[k]])]));
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const first = entry[0];
  const facts = emptyFacts(first !== undefined && NOT_ARDUINO.test(first) ? "unsupported" : "arduino-cpp");
  if (facts.language === "arduino-cpp") fillFacts(facts, parseAll(sources, entry), profileOf(board.variant));

  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  cache.set(cacheKey, facts);
  return facts;
}

function fillFacts(facts: CodeFacts, files: ParsedFile[], profile: BoardProfile | undefined): void {
  const constants = collectConstants(files);
  const variableTypes = typesOfVariables(files);

  for (const file of files) {
    const at = <T>(value: T, e: Expr, span?: Span): CodeFact<T> => ({ value, file: file.key, line: e.p.line, ...(span ? { span } : {}) });

    const numberOf = (e: Expr | undefined, local: ReadonlySet<string>): Literal | undefined => {
      if (e?.k === "num" && !e.float) {
        const span = locate(file, e.p.line, e.value);
        return { value: e.value, file: file.key, ...(span ? { span } : {}) };
      }
      const constant = isId(e) && !local.has(e.name) ? constants.get(e.name) : undefined;
      if (constant && constant.file !== file.key) return { value: constant.value, file: file.key };
      return constant;
    };

    const pinOf = (e: Expr | undefined, local: ReadonlySet<string>): { pin: string; span?: Span } | undefined => {
      const n = numberOf(e, local);
      if (n) return { pin: String(n.value), ...(n.span ? { span: n.span } : {}) };
      if (!isId(e) || local.has(e.name) || !profile) return undefined;
      if (/^[AD]\d+$/.test(e.name)) return { pin: e.name };
      const resolved = resolvePin(profile, e.name);
      return resolved === undefined ? undefined : { pin: String(resolved) };
    };

    walkUnit(file.unit, (e, local) => {
      if (e.k !== "call") return;
      const [a0, a1] = e.args;

      if (isId(e.fn)) {
        const name = e.fn.name;
        if (!["pinMode", "digitalWrite", "analogWrite", "tone", "digitalRead", "analogRead"].includes(name) || !a0) return;
        const pin = pinOf(a0, local);
        if (!pin) {
          facts.unresolved++;
          return;
        }
        if (name === "pinMode") {
          const mode = isId(a1) ? a1.name : "";
          if (MODES.has(mode)) facts.pinModes.push(at({ pin: pin.pin, mode: mode as Mode }, e, pin.span));
        } else if (name === "digitalRead" || name === "analogRead") {
          facts.pinReads.push(at({ pin: pin.pin, fn: name }, e, pin.span));
        } else {
          facts.pinWrites.push(at({ pin: pin.pin, fn: name as "digitalWrite" | "analogWrite" | "tone" }, e, pin.span));
        }
        return;
      }

      if (e.fn.k !== "member" || !isId(e.fn.a)) return;
      const object = e.fn.a.name;
      const method = e.fn.name;

      if (object === "Wire" && method === "begin" && a0 && a1) {
        const sda = pinOf(a0, local);
        const scl = pinOf(a1, local);
        if (!sda || !scl) facts.unresolved++;
        else facts.wireBegin ??= at({ sda: sda.pin, scl: scl.pin }, e);
      } else if (object === "Wire" && method === "setClock") {
        const hz = numberOf(a0, local);
        if (hz) facts.wireClock ??= at({ hz: hz.value }, e);
      } else if (object === "Wire" && method === "beginTransmission") {
        const addr = numberOf(a0, local);
        if (addr) facts.i2cAddresses.push(at({ addr: addr.value }, e));
      } else if (object === "Serial" && method === "begin") {
        const baud = numberOf(a0, local);
        if (baud) facts.serialBegin ??= at({ baud: baud.value }, e);
      } else if (method === "begin") {
        const index = BEGIN_ADDRESS_ARG[variableTypes.get(object) ?? ""];
        const addr = index === undefined ? undefined : numberOf(e.args[index], local);
        if (addr) facts.i2cAddresses.push(at({ addr: addr.value }, e));
      }
    });
  }
}
