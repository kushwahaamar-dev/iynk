// copied from src/lib/server/search; the original is deleted in T-B14-06
import { lineCost } from "../../../../src/lib/search/cost.ts";
import type { Offer, PartOffers } from "../../../../src/lib/search/types.ts";

// Turns every store's raw listings for one part into a short, honest list:
// listings that name a different part are dropped ("2306 1700KV" is not the
// "2306 1750KV" asked for), so are accessories priced far under the rest,
// and the cheapest listing for the quantity needed is marked best.

const MAX_OFFERS = 8;

/** Lower case, "1100 mAh" -> "1100mah", "XT-60" -> "xt60". */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/(\d)\s+(mah|kv|mm|s|v|a|g|in|inch)\b/g, "$1$2")
    .replace(/([a-z])[-_](\d)/g, "$1$2")
    .replace(/[^a-z0-9.+]+/g, " ")
    .trim();
}

/** The words that pin a part down: anything with a digit ("2306", "1750kv", "6s", "f405"). */
export function significantTokens(query: string): string[] {
  return [...new Set(normalizeText(query).split(" ").filter((w) => /\d/.test(w) && w.length >= 2))];
}

function matchShare(tokens: string[], title: string): number {
  if (!tokens.length) return 1;
  const words = new Set(normalizeText(title).split(" "));
  const text = ` ${normalizeText(title)} `;
  const hits = tokens.filter((t) => words.has(t) || text.includes(` ${t}`)).length;
  return hits / tokens.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function rankOffers(key: string, query: string, qty: number, raw: Offer[], assumedPack = 1): PartOffers {
  const tokens = significantTokens(query);
  const byUrl = new Map<string, Offer>();
  for (const offer of raw) {
    const seen = byUrl.get(offer.url);
    if (!seen || offer.price < seen.price) byUrl.set(offer.url, offer);
  }
  const unique = [...byUrl.values()];

  // Exact matches when there are any, else listings that match most of the part.
  const scored = unique.map((offer) => ({ offer, share: matchShare(tokens, offer.title) }));
  const exact = scored.filter((s) => s.share === 1);
  const close = scored.filter((s) => s.share >= 0.5);
  let kept = (exact.length ? exact : close).map((s) => s.offer);

  if (kept.length >= 4) {
    const floor = median(kept.map((o) => lineCost(o, qty, assumedPack))) * 0.3;
    kept = kept.filter((o) => lineCost(o, qty, assumedPack) >= floor);
  }

  const cost = (o: Offer) => lineCost(o, qty, assumedPack);
  const offers = kept.sort((a, b) => cost(a) - cost(b)).slice(0, MAX_OFFERS);
  const best = offers.findIndex((o) => o.inStock !== false);
  return best >= 0 ? { key, offers, best } : { key, offers };
}
