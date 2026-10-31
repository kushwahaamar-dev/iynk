import { utf8Length } from "./canonical.ts";
import { LIMITS } from "./limits.ts";
import { fail, ok } from "./result.ts";
import type { Failure, Result } from "./result.ts";

export interface ParseOptions {
  maxBytes?: number;
  maxDepth?: number;
}

const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;

interface Frame {
  array: boolean;
  keys: Set<string>;
  expectKey: boolean;
  segment: string;
}

const pointer = (frames: readonly Frame[]): string =>
  frames.map((f) => "/" + f.segment.replace(/~/g, "~0").replace(/\//g, "~1")).join("");

const failure = (code: string, message: string, path: string): Result<never, Failure> =>
  fail({ code, message, path });

function decode(literal: string): string | null {
  if (!literal.includes("\\")) return literal.slice(1, -1);
  try {
    return JSON.parse(literal) as string;
  } catch {
    return null;
  }
}

/** One pass over the text for the offences `JSON.parse` lets through. Tolerates bad syntax: the parse that follows reports it. */
function scan(text: string, maxDepth: number): Failure | null {
  const stack: Frame[] = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text.charCodeAt(i);
    if (c === 0x22) {
      let j = i + 1;
      while (j < n && text.charCodeAt(j) !== 0x22) j += text.charCodeAt(j) === 0x5c ? 2 : 1;
      const value = decode(text.slice(i, j + 1));
      const top = stack[stack.length - 1];
      if (value !== null) {
        const isKey = top !== undefined && !top.array && top.expectKey;
        if (isKey) top.segment = value;
        if (LONE_SURROGATE.test(value)) {
          return { code: "lone_surrogate", message: "a string holds a lone surrogate", path: pointer(stack) };
        }
        if (isKey) {
          if (top.keys.has(value)) {
            return { code: "duplicate_key", message: `duplicate key "${value}"`, path: pointer(stack) };
          }
          top.keys.add(value);
        }
      }
      i = j + 1;
      continue;
    }
    const top = stack[stack.length - 1];
    if (c === 0x7b || c === 0x5b) {
      stack.push({ array: c === 0x5b, keys: new Set(), expectKey: c === 0x7b, segment: c === 0x5b ? "0" : "" });
      if (stack.length > maxDepth) {
        return { code: "depth", message: `nesting is deeper than ${maxDepth} levels`, path: pointer(stack.slice(0, -1)) };
      }
    } else if (c === 0x7d || c === 0x5d) {
      stack.pop();
    } else if (top !== undefined) {
      if (c === 0x2c) {
        if (top.array) top.segment = String(Number(top.segment) + 1);
        else top.expectKey = true;
      } else if (c === 0x3a) {
        top.expectKey = false;
      }
    }
    i++;
  }
  return null;
}

/**
 * `JSON.parse` that refuses what two readers could disagree on: text over the byte cap, a BOM, a duplicate key
 * (also through escapes), nesting beyond `maxDepth` and a lone surrogate. `path` is a JSON Pointer to the first
 * offence found in reading order.
 */
export function parseStrict(text: string, opts: ParseOptions = {}): Result<unknown, Failure> {
  const maxBytes = opts.maxBytes ?? LIMITS.canonicalBytes;
  const maxDepth = opts.maxDepth ?? 32;
  const bytes = utf8Length(text);
  if (bytes > maxBytes) return failure("too_large", `${bytes} bytes is over the ${maxBytes} byte limit`, "");
  if (text.charCodeAt(0) === 0xfeff) return failure("bom", "the text starts with a byte order mark", "");
  const offence = scan(text, maxDepth);
  if (offence) return fail(offence);
  try {
    return ok(JSON.parse(text) as unknown);
  } catch (error) {
    return failure("syntax", error instanceof Error ? error.message : "invalid JSON", "");
  }
}
