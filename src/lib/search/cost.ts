import type { Offer } from "./types.ts";

/**
 * What `units` of a part cost from one listing: whole listings, each holding
 * `offer.pack` units when its title says so, else `assumedPack` (props are
 * sold in sets of four, most parts one by one).
 */
export function lineCost(offer: Pick<Offer, "price" | "pack">, units: number, assumedPack = 1): number {
  const pack = offer.pack ?? assumedPack;
  return Math.ceil(units / pack) * offer.price;
}

/** Listings to buy for `units`, by the same rule. */
export function listingsNeeded(offer: Pick<Offer, "pack">, units: number, assumedPack = 1): number {
  return Math.ceil(units / (offer.pack ?? assumedPack));
}

/** Cents-exact sum, so totals never show 0.30000000000000004. */
export function sumMoney(values: number[]): number {
  return Math.round(values.reduce((sum, v) => sum + Math.round(v * 100), 0)) / 100;
}
