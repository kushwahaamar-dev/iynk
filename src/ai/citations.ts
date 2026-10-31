import { parseRef, resolveRef } from "./tools/refs.ts";
import type { Ref } from "./tools/refs.ts";
import type { PartnerSources } from "./sources.ts";

const CITATION = /\[\[([^\][\s]{1,160})\]\]/g;

function tokens(text: string): string[] {
  return [...new Set([...text.matchAll(CITATION)].map((m) => m[1]))];
}

/** The distinct references in `[[...]]` that follow the grammar, in order of first use. */
export function extractRefs(text: string): Ref[] {
  return tokens(text).flatMap((token) => parseRef(token) ?? []);
}

/** `unresolved` holds the tokens that are not valid or that point at nothing in the project. */
export function resolveAll(text: string, s: PartnerSources): { resolved: Ref[]; unresolved: string[] } {
  const resolved: Ref[] = [];
  const unresolved: string[] = [];
  for (const token of tokens(text)) {
    const ref = parseRef(token);
    if (ref && resolveRef(ref, s).ok) resolved.push(ref);
    else unresolved.push(token);
  }
  return { resolved, unresolved };
}
