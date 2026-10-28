import { utf8Length } from "../core/canonical.ts";
import { LIMITS } from "../core/limits.ts";
import { diag } from "../core/result.ts";
import type { Diagnostic } from "../core/result.ts";
import type { Project } from "./generated/types.ts";

/** A report keeps this many diagnostics; the passes stop collecting at the same number. */
export const MAX_STORED_DIAGNOSTICS = 500;

const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

const escapeSegment = (key: string): string => key.replace(/~/g, "~0").replace(/\//g, "~1");

/**
 * V4 (PDM 9.2): totals the schema cannot say, the canonical size and the UTF-8 bytes of each source. The schema
 * counts source characters, so a source of multi-byte text can pass it and fail here. Reads `doc` defensively: it
 * may be a document that failed the schema.
 */
export function limitDiagnostics(doc: Project, canonicalBytes: number): Diagnostic[] {
  const found: Diagnostic[] = [];
  if (canonicalBytes > LIMITS.canonicalBytes) {
    found.push(
      diag("V4-SIZE", "error", "", `The document is ${canonicalBytes} bytes; the limit is ${LIMITS.canonicalBytes}`),
    );
  }
  const sources: unknown = doc?.sources;
  if (!Array.isArray(sources)) return found;
  sources.forEach((source: unknown, index) => {
    const content = (source as { content?: unknown } | null)?.content;
    if (typeof content !== "string") return;
    const bytes = utf8Length(content);
    if (bytes > LIMITS.sourceBytes) {
      found.push(
        diag("V4-SOURCE", "error", `/sources/${index}/content`, `A source is ${bytes} bytes; the limit is ${LIMITS.sourceBytes}`),
      );
    }
  });
  return found;
}

/**
 * V5 (PDM 9.2): no key named `__proto__`, `constructor` or `prototype` at any depth. Walks with a stack, so depth
 * costs no call stack, and stops after `MAX_STORED_DIAGNOSTICS` findings. `V5-SVG` arrives with asset import in B3.
 */
export function hygieneDiagnostics(value: unknown): Diagnostic[] {
  const found: Diagnostic[] = [];
  const seen = new Set<object>();
  const pending: { node: unknown; path: string }[] = [{ node: value, path: "" }];
  while (pending.length > 0 && found.length < MAX_STORED_DIAGNOSTICS) {
    const { node, path } = pending.pop() as { node: unknown; path: string };
    if (typeof node !== "object" || node === null || seen.has(node)) continue;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach((child: unknown, index) => pending.push({ node: child, path: `${path}/${index}` }));
      continue;
    }
    for (const key of Object.keys(node)) {
      const childPath = `${path}/${escapeSegment(key)}`;
      if (FORBIDDEN_KEYS.has(key)) {
        found.push(diag("V5-KEY", "error", childPath, `The key "${key}" is not allowed`, "Remove the key"));
      }
      pending.push({ node: (node as Record<string, unknown>)[key], path: childPath });
    }
  }
  return found;
}
