import type { PartRegistry } from "./registry.ts";

export type ModelLabel = "modelled" | "partly-modelled" | "not-modelled-yet";

export interface PartEntry {
  ref: string;
  name: string;
  category: string;
  keywords: string[];
  model: ModelLabel;
  /** Body size in mm, for drawing the palette thumbnail. */
  widthMm: number;
  heightMm: number;
}

type Folded = { lang: string; name: string; words: string[]; keywords: string[] };

const SURFACE_TAG = "surface";
const MARKS = /[̀-ͯ]/g;
const SPLIT = /[^\p{L}\p{N}]+/u;

/** Lower case with Latin accents removed. Marks of other scripts (Devanagari vowel signs) are part of the letter and stay. */
function fold(text: string, lang: string): string {
  return text.normalize("NFD").replace(MARKS, "").normalize("NFC").toLocaleLowerCase(lang);
}

const wordsOf = (text: string): string[] => text.split(SPLIT).filter(Boolean);

const folds = new WeakMap<PartEntry, Folded>();

function foldedOf(entry: PartEntry, lang: string): Folded {
  const cached = folds.get(entry);
  if (cached && cached.lang === lang) return cached;
  const keywords = [entry.category, ...entry.keywords].flatMap((k) => wordsOf(fold(k, lang)));
  const folded = { lang, name: fold(entry.name, lang), words: wordsOf(fold(entry.name, lang)), keywords };
  folds.set(entry, folded);
  return folded;
}

/** The parts a palette offers: the newest version of each, except wiring surfaces, which the project adds itself. */
export function buildPartIndex(registry: PartRegistry): PartEntry[] {
  const entries: PartEntry[] = [];
  for (const ref of new Set(registry.list().map((p) => p.ref))) {
    const d = registry.latest(ref);
    if (!d || d.identity.tags?.includes(SURFACE_TAG)) continue;
    const body = d.dimensions?.body ?? d.dimensions?.board;
    entries.push({
      ref,
      name: d.identity.model,
      category: d.identity.category,
      keywords: [...(d.identity.tags ?? []), ...(d.identity.legacy_ids ?? []), ...(d.identity.generic ? [] : [d.identity.manufacturer])],
      model: d.simulation.status,
      widthMm: body?.w ?? 0,
      heightMm: body?.h ?? 0,
    });
  }
  return entries;
}

const byCategoryThenName = (lang: string) => (a: PartEntry, b: PartEntry) => a.category.localeCompare(b.category, lang) || a.name.localeCompare(b.name, lang);

/** Every query word starts some word of `words`. */
const allPrefix = (tokens: string[], words: string[]): boolean => tokens.every((t) => words.some((w) => w.startsWith(t)));

/** 0 exact name, 1 name prefix, 2 name words, 3 keywords; null when the entry does not match. */
function rankOf(folded: Folded, query: string, tokens: string[]): number | null {
  if (folded.name === query) return 0;
  if (folded.name.startsWith(query)) return 1;
  if (allPrefix(tokens, folded.words)) return 2;
  if (allPrefix(tokens, [...folded.words, ...folded.keywords])) return 3;
  return null;
}

/**
 * Entries that match `query`, best first: exact name, name prefix, every query word starting a word of the name, then
 * the same over the category and keywords. Ties go by name. Case and Latin accents do not matter. An empty query
 * lists everything by category.
 */
export function searchParts(index: readonly PartEntry[], query: string, lang: string): PartEntry[] {
  const q = fold(query, lang).trim().replace(/\s+/g, " ");
  if (q === "") return [...index].sort(byCategoryThenName(lang));
  const tokens = wordsOf(q);
  if (tokens.length === 0) return [];
  const ranked: { entry: PartEntry; rank: number }[] = [];
  for (const entry of index) {
    const rank = rankOf(foldedOf(entry, lang), q, tokens);
    if (rank !== null) ranked.push({ entry, rank });
  }
  return ranked.sort((a, b) => a.rank - b.rank || a.entry.name.localeCompare(b.entry.name, lang)).map((r) => r.entry);
}
