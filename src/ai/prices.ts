/** USD per million tokens. `null` for a cache field means the provider does not price that kind of token separately. */
export type Price = {
  in: number;
  cacheRead: number | null;
  cacheWrite: number | null;
  out: number;
  asOf: string;
  source: string;
};

export type TokenCounts = {
  inTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outTokens: number;
};

export const PRICE_TABLE_ASOF = "2026-10-26";

const STALE_AFTER_MS = 90 * 24 * 60 * 60 * 1000;
const SOURCE = "platform-options 7.1";

function listed(inUSD: number, cacheRead: number, out: number): Price {
  return { in: inUSD, cacheRead, cacheWrite: null, out, asOf: PRICE_TABLE_ASOF, source: SOURCE };
}

/** Matched against `provider/model id`, first hit wins. */
export const DEFAULT_PRICES: readonly { match: RegExp; price: Price }[] = [
  { match: /sonnet-5[.-]5/i, price: listed(2, 0.1, 10) },
  { match: /haiku-5[.-]5/i, price: listed(0.1, 0.01, 0.5) },
  { match: /opus-5[.-]5/i, price: listed(4, 0.2, 20) },
  { match: /gpt-5[.-]6-terra/i, price: listed(2, 0.2, 12) },
  { match: /gpt-5[.-]4-mini/i, price: listed(0.75, 0.075, 4.5) },
  { match: /gemini-3[.-]8-flash(?!-lite)/i, price: listed(0.75, 0.075, 3.75) },
  { match: /gemini-3[.-]5-flash-lite/i, price: listed(0.3, 0.03, 2.5) },
];

/** The price the person set on the model, else the first default that matches; `null` when neither knows it. */
export function priceFor(model: { id: string; price?: Price }, provider: string): Price | null {
  if (model.price) return model.price;
  const name = `${provider}/${model.id}`;
  return DEFAULT_PRICES.find((entry) => entry.match.test(name))?.price ?? null;
}

export function isStale(p: Price, nowMs: number): boolean {
  const asOf = Date.parse(p.asOf);
  return Number.isNaN(asOf) || nowMs - asOf > STALE_AFTER_MS;
}

/** `inTokens` counts all input, cached or not: the cached share is billed at the cache rate instead. */
export function costUSD(p: Price, u: TokenCounts): number {
  const cacheReadRate = p.cacheRead ?? p.in;
  const cacheWriteRate = p.cacheWrite ?? p.in;
  const plain = Math.max(0, u.inTokens - u.cacheReadTokens - u.cacheWriteTokens);
  return (plain * p.in + u.cacheReadTokens * cacheReadRate + u.cacheWriteTokens * cacheWriteRate + u.outTokens * p.out) / 1_000_000;
}
