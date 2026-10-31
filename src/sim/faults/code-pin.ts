import { fail, ok } from "../../core/result.ts";
import type { Result } from "../../core/result.ts";
import type { FaultError, FaultOp } from "./types.ts";

type CodePin = Extract<FaultOp, { kind: "code-pin" }>;

const isWordChar = (c: string | undefined) =>
  c !== undefined && /[A-Za-z0-9_.]/.test(c);

/** Index of the first whole-token `token` on the line that is outside quotes and comments. */
function findToken(line: string, token: string): number {
  let quote: string | undefined;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote !== undefined) {
      if (c === "\\") i++;
      else if (c === quote) quote = undefined;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === "/" && line[i + 1] === "/") {
      return -1;
    } else if (
      line.startsWith(token, i) &&
      !isWordChar(line[i - 1]) &&
      !isWordChar(line[i + token.length])
    ) {
      return i;
    }
  }
  return -1;
}

/** Replaces one pin number on one line; the line count never changes, so `#line` markers keep their meaning. */
export function applyCodePin(
  source: string,
  op: CodePin,
): Result<string, FaultError> {
  const lines = source.split("\n");
  const text = lines[op.line - 1];
  const from = String(op.from);
  const at = text === undefined ? -1 : findToken(text, from);
  if (text === undefined || at < 0) {
    return fail({
      code: "no-such-line",
      faultId: "",
      message: `${op.file} line ${op.line} has no ${from} to replace`,
    });
  }
  lines[op.line - 1] =
    text.slice(0, at) + String(op.to) + text.slice(at + from.length);
  return ok(lines.join("\n"));
}
