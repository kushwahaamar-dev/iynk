import { describe, expect, it } from "vitest";
import type { Offer } from "@/lib/search/types";
import { normalizeText, rankOffers, significantTokens } from "./rank";

const o = (title: string, price: number, extra: Partial<Offer> = {}): Offer => ({
  source: "google_shopping",
  title,
  price,
  currency: "USD",
  url: `https://shop.example/${encodeURIComponent(title)}/${price}`,
  ...extra,
});

describe("tokens", () => {
  it("normalises units and model codes", () => {
    expect(normalizeText("6S 1100 mAh LiPo, XT-60")).toBe("6s 1100mah lipo xt60");
    expect(significantTokens("2306 1750KV brushless motor")).toEqual(["2306", "1750kv"]);
    expect(significantTokens("Arduino Uno")).toEqual([]);
  });
});

describe("rankOffers", () => {
  it("keeps exact matches and drops listings for a different part", () => {
    const ranked = rankOffers("motor", "2306 1750KV motor", 1, [
      o("EMAX ECO II 2306 1700KV", 18),
      o("T-Motor Velox 2306 1750KV brushless", 22),
      o("iFlight XING2 2306 1750 KV", 25),
    ]);
    expect(ranked.offers.map((x) => x.price)).toEqual([22, 25]);
    expect(ranked.best).toBe(0);
  });

  it("falls back to close matches when nothing matches exactly", () => {
    const ranked = rankOffers("motor", "2306 1750KV motor", 1, [o("Some 2306 motor 1950KV", 20), o("Unrelated prop guard", 2)]);
    expect(ranked.offers.map((x) => x.title)).toEqual(["Some 2306 motor 1950KV"]);
  });

  it("drops accessories priced far under the rest", () => {
    const ranked = rankOffers("batt", "6S 1100mAh LiPo", 1, [
      o("6S 1100mAh LiPo 120C", 38),
      o("6S 1100mAh LiPo XT60", 35),
      o("6S 1100mAh LiPo battery", 41),
      o("6S 1100mAh LiPo strap", 3),
    ]);
    expect(ranked.offers.map((x) => x.price)).toEqual([35, 38, 41]);
  });

  it("prices whole packs for the quantity needed", () => {
    const ranked = rankOffers("motor", "2207 1950KV", 4, [o("2207 1950KV motor", 24), o("2207 1950KV motor 4pcs", 80, { pack: 4 })]);
    expect(ranked.offers[ranked.best!].price).toBe(80);
  });

  it("assumes the caller's pack size when a title doesn't give one", () => {
    const ranked = rankOffers("props", "5x4.3x3 propellers", 4, [o("HQ 5x4.3x3 propellers", 5), o("5x4.3x3 props 1 pair", 3, { pack: 2 })], 4);
    // One set of four at $5 beats two pairs at $3.
    expect(ranked.offers[ranked.best!].price).toBe(5);
  });

  it("never marks an out-of-stock listing best", () => {
    const ranked = rankOffers("servo", "SG90 servo", 1, [o("SG90 servo", 2, { inStock: false }), o("SG90 servo blue", 3)]);
    expect(ranked.best).toBe(1);
    expect(rankOffers("servo", "SG90", 1, [o("SG90", 2, { inStock: false })]).best).toBeUndefined();
  });

  it("keeps the cheaper copy of a listing seen twice, and at most eight", () => {
    const twice = [o("SG90 servo", 4), { ...o("SG90 servo", 3), url: o("SG90 servo", 4).url }];
    expect(rankOffers("s", "SG90", 1, twice).offers).toHaveLength(1);
    const many = Array.from({ length: 12 }, (_, i) => o(`SG90 servo ${i}`, 10 + i));
    expect(rankOffers("s", "SG90 servo", 1, many).offers).toHaveLength(8);
  });

  it("answers an empty list for no listings", () => {
    expect(rankOffers("x", "XT60 connector", 1, [])).toEqual({ key: "x", offers: [] });
  });
});
