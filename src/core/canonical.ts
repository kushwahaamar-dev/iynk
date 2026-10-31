const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;

/** Thrown for a value the canonical form cannot carry. `path` is a JSON Pointer to it. */
export class CanonicalError extends Error {
  readonly path: string;

  constructor(message: string, path: string) {
    super(message);
    this.name = "CanonicalError";
    this.path = path;
  }
}

const isLowSurrogate = (c: number): boolean => c >= 0xdc00 && c <= 0xdfff;

const pointer = (path: readonly string[]): string =>
  path.map((segment) => "/" + segment.replace(/~/g, "~0").replace(/\//g, "~1")).join("");

/** UTF-8 bytes of a string, written by hand because the portable lib has no `TextEncoder`. Throws `lone_surrogate`. */
export function utf8Encode(s: string): Uint8Array {
  if (LONE_SURROGATE.test(s)) throw new CanonicalError("lone_surrogate", "");
  const out = new Uint8Array(utf8Length(s));
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      c = 0x10000 + ((c - 0xd800) << 10) + (s.charCodeAt(++i) - 0xdc00);
    }
    if (c < 0x80) {
      out[n++] = c;
    } else if (c < 0x800) {
      out[n++] = 0xc0 | (c >> 6);
      out[n++] = 0x80 | (c & 0x3f);
    } else if (c < 0x10000) {
      out[n++] = 0xe0 | (c >> 12);
      out[n++] = 0x80 | ((c >> 6) & 0x3f);
      out[n++] = 0x80 | (c & 0x3f);
    } else {
      out[n++] = 0xf0 | (c >> 18);
      out[n++] = 0x80 | ((c >> 12) & 0x3f);
      out[n++] = 0x80 | ((c >> 6) & 0x3f);
      out[n++] = 0x80 | (c & 0x3f);
    }
  }
  return out;
}

/**
 * Number of UTF-8 bytes of a string. A lone surrogate counts as the three bytes of U+FFFD, so a size check can
 * run before the text is judged; `utf8Encode` is the one that rejects it.
 */
export function utf8Length(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && isLowSurrogate(s.charCodeAt(i + 1))) {
      i++;
      n += 4;
    } else n += 3;
  }
  return n;
}

function scalar(value: unknown, path: string[]): string {
  switch (typeof value) {
    case "string":
      if (LONE_SURROGATE.test(value)) throw new CanonicalError("lone surrogate in a string", pointer(path));
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) throw new CanonicalError("NaN and infinities have no canonical form", pointer(path));
      return Object.is(value, -0) ? "0" : JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    default:
      if (value === null) return "null";
      throw new CanonicalError(`${typeof value} has no canonical form`, pointer(path));
  }
}

const isContainer = (value: unknown): value is object => typeof value === "object" && value !== null;

const sortedKeys = (obj: object): string[] =>
  Object.keys(obj).filter((key) => (obj as Record<string, unknown>)[key] !== undefined).sort();

function writeCanonical(value: unknown, path: string[], out: string[]): void {
  if (!isContainer(value)) {
    out.push(scalar(value, path));
    return;
  }
  if (Array.isArray(value)) {
    out.push("[");
    for (let i = 0; i < value.length; i++) {
      if (i > 0) out.push(",");
      path.push(String(i));
      writeCanonical(value[i], path, out);
      path.pop();
    }
    out.push("]");
    return;
  }
  const record = value as Record<string, unknown>;
  out.push("{");
  sortedKeys(record).forEach((key, i) => {
    if (i > 0) out.push(",");
    out.push(scalar(key, path), ":");
    path.push(key);
    writeCanonical(record[key], path, out);
    path.pop();
  });
  out.push("}");
}

function writePretty(value: unknown, path: string[], indent: string, out: string[]): void {
  if (!isContainer(value)) {
    out.push(scalar(value, path));
    return;
  }
  const inner = indent + "  ";
  if (Array.isArray(value)) {
    if (value.length === 0) {
      out.push("[]");
      return;
    }
    out.push("[\n");
    for (let i = 0; i < value.length; i++) {
      out.push(inner);
      path.push(String(i));
      writePretty(value[i], path, inner, out);
      path.pop();
      out.push(i < value.length - 1 ? ",\n" : "\n");
    }
    out.push(indent, "]");
    return;
  }
  const record = value as Record<string, unknown>;
  const keys = sortedKeys(record);
  if (keys.length === 0) {
    out.push("{}");
    return;
  }
  out.push("{\n");
  keys.forEach((key, i) => {
    out.push(inner, scalar(key, path), ": ");
    path.push(key);
    writePretty(record[key], path, inner, out);
    path.pop();
    out.push(i < keys.length - 1 ? ",\n" : "\n");
  });
  out.push(indent, "}");
}

/**
 * RFC 8785 text of a value: keys sorted by UTF-16 code unit, shortest round-trip numbers, `-0` as `0`, minimal
 * escapes, no whitespace. Object properties holding `undefined` are skipped. `undefined` elsewhere, functions,
 * symbols, bigints, NaN, infinities and lone surrogates throw `CanonicalError`.
 */
export function canonicalize(value: unknown): string {
  const out: string[] = [];
  writeCanonical(value, [], out);
  return out.join("");
}

/** The on-disk form of the same value: two-space indent, one array item per line, LF, one trailing newline. */
export function prettyPrint(value: unknown): string {
  const out: string[] = [];
  writePretty(value, [], "", out);
  out.push("\n");
  return out.join("");
}
