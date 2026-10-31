import { diag } from "../core/result.ts";
import type { Diagnostic } from "../core/result.ts";
import type { Descriptor } from "./descriptor.ts";

/** Words a part description must not use (D-007). */
export const BANNED_WORDS: readonly RegExp[] = [
  /\bvalidated\b/i,
  /\bverified against hardware\b/i,
  /\baccurate\b/i,
  /\bexact(ly)?\b/i,
  /\breal\b/i,
];

const pointer = (...segments: (string | number)[]): string =>
  segments.map((s) => "/" + String(s).replace(/~/g, "~0").replace(/\//g, "~1")).join("");

/** `P-COPY` for each line of `what_it_models` and `not_modelled`, in every language, that uses a banned word. */
export function copyCheck(d: Descriptor): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const field of ["what_it_models", "not_modelled"] as const) {
    d.simulation[field].forEach((text, i) => {
      for (const [lang, line] of Object.entries(text)) {
        if (typeof line !== "string") continue;
        for (const banned of BANNED_WORDS) {
          const word = line.match(banned)?.[0];
          if (word) {
            out.push(diag("P-COPY", "error", pointer("simulation", field, i, lang), `the word "${word.toLowerCase()}" may not be used about a part`));
            break;
          }
        }
      }
    });
  }
  return out;
}
