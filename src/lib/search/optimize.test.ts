import { describe, expect, it } from "vitest";
import type { DesignPick, DroneDesign } from "@/content/schema";
import { droneBom } from "./bom";
import { optimize, priceLines, type OptimizeInput } from "./optimize";
import type { PartOffers } from "./types";

// A 5-inch freestyle quad with the catalogue and calculator constants of the quad5 design.
const design: DroneDesign = {
  model: {
    motors: 4,
    thrust: { kind: "krpm", k: 1.06, maxGPerW: 2 },
    flight: { kind: "multirotor", gPerW: 5.4, flyFactor: 0.42 },
    usable: 0.8,
    minTW: 5,
    over: { kind: "kvCells", max: 1750 * 6 * 1.15 },
    propPrice: "pair",
    escAmps: 45,
  },
  fixed: [
    { id: "FRAME", g: 118, price: 39, category: "Mechanical", name: "parts.FRAME.name" },
    { id: "ESC", g: 8, price: 45, category: "Electrical", name: "parts.ESC.name" },
    { id: "FC", g: 7, price: 39, category: "Electrical", name: "parts.FC.name" },
    { id: "CAM", g: 7, price: 25, category: "Electrical", name: "parts.CAM.name" },
    { id: "VTX", g: 9, price: 30, category: "Electrical", name: "parts.VTX.name" },
    { id: "RX", g: 2, price: 18, category: "Electrical", name: "parts.RX.name" },
    { id: "XT60", g: 12, price: 4, category: "Electrical", name: "parts.XT60.name" },
    { id: "TOP", g: 22, price: 8, category: "Mechanical", name: "parts.TOP.name" },
    { id: "STRAP", g: 5, price: 4, category: "Mechanical", name: "parts.STRAP.name" },
  ],
  batts: {
    "6s1100": { cells: 6, mah: 1100, g: 178, price: 38, label: "6S 1100 mAh LiPo" },
    "6s1800": { cells: 6, mah: 1800, g: 282, price: 54, label: "6S 1800 mAh LiPo" },
    "4s1500": { cells: 4, mah: 1500, g: 182, price: 30, label: "4S 1500 mAh LiPo" },
  },
  motors: {
    "2306-1750": { kv: 1750, g: 32, price: 22, label: "2306 1750KV" },
    "2207-1950": { kv: 1950, g: 34, price: 24, label: "2207 1950KV" },
    "2306-2450": { kv: 2450, g: 31, price: 20, label: "2306 2450KV (4S)" },
  },
  props: {
    "5x4.3x3": { pf: 1, eff: 1, g: 4.4, price: 4, label: "5x4.3x3 tri-blade" },
    "5.1x2.5x3": { pf: 0.84, eff: 1.18, g: 4, price: 4, label: "5.1x2.5x3 (efficient)" },
    "5x5x3": { pf: 1.1, eff: 0.88, g: 4.8, price: 4, label: "5x5x3 (aggressive)" },
  },
  default: { batt: "6s1100", motor: "2306-1750", prop: "5x4.3x3" },
  golden: [],
};

const current: DesignPick = design.default;

/** Catalogue prices as "live" prices, with overrides per option. */
function input(overrides: Partial<OptimizeInput> = {}, live: Partial<Record<string, number>> = {}): OptimizeInput {
  const priced = (slot: "batt" | "motor" | "prop", id: string, catalogue: number) => ({
    cost: live[`${slot}:${id}`] ?? catalogue,
    estimate: false,
  });
  return {
    design,
    fixed: { cost: 212, estimate: false },
    options: {
      batt: Object.fromEntries(Object.entries(design.batts).map(([id, b]) => [id, priced("batt", id, b.price)])),
      motor: Object.fromEntries(Object.entries(design.motors).map(([id, m]) => [id, priced("motor", id, m.price * 4)])),
      prop: Object.fromEntries(Object.entries(design.props).map(([id, p]) => [id, priced("prop", id, p.price * 2)])),
    },
    budget: 1000,
    constraints: { minTW: 5, minFlightMin: 4 },
    current,
    ...overrides,
  };
}

describe("optimize", () => {
  it("tries every combination and never picks an unsafe one", () => {
    const result = optimize(input());
    expect(result.considered).toBe(27);
    // 2306-2450 on 6S spins past the motor's limit: the highest T:W, and ruled out.
    expect(result.best?.pick).not.toMatchObject({ motor: "2306-2450", batt: expect.stringMatching(/^6s/) });
    const overSpin = optimize(input({ constraints: { minTW: 1, minFlightMin: 0 } }));
    expect(overSpin.best?.fails).toEqual([]);
    expect(overSpin.best?.checks.some((c) => c.code === "over-spin")).toBe(false);
  });

  it("picks the most headroom over both limits when the budget allows", () => {
    const { best, current: now, swaps, delta, reason } = optimize(input());
    expect(reason).toBeNull();
    // The 1800 mAh pack with the 1950KV motor and efficient props flies 8.2 min at T:W 10.7.
    expect(best?.pick).toEqual({ batt: "6s1800", motor: "2207-1950", prop: "5.1x2.5x3" });
    expect(best!.margin).toBeGreaterThan(now.margin);
    expect(swaps).toEqual([
      { slot: "batt", from: "6s1100", to: "6s1800" },
      { slot: "motor", from: "2306-1750", to: "2207-1950" },
      { slot: "prop", from: "5x4.3x3", to: "5.1x2.5x3" },
    ]);
    expect(delta?.cost).toBe(370 - 346);
    expect(delta!.flyMin).toBeGreaterThan(2);
  });

  it("trades down to stay under a tight budget and keeps the limits", () => {
    const result = optimize(input({ budget: 340 }));
    expect(result.best).not.toBeNull();
    expect(result.best!.cost).toBeLessThanOrEqual(340);
    expect(result.best!.tw).toBeGreaterThanOrEqual(5);
    expect(result.best!.flyMin).toBeGreaterThanOrEqual(4);
    // The 4S pack and the 2450KV motor (made for 4S) are what fits.
    expect(result.best!.pick).toMatchObject({ batt: "4s1500", motor: "2306-2450" });
    expect(result.upgrade).not.toBeNull();
    expect(result.upgrade!.cost).toBeGreaterThan(340);
    expect(result.upgrade!.margin).toBeGreaterThan(result.best!.margin);
  });

  it("says when the budget is the problem, and what the cheapest good build costs", () => {
    const result = optimize(input({ budget: 200 }));
    expect(result.best).toBeNull();
    expect(result.reason).toBe("budget");
    expect(result.cheapest?.cost).toBe(330);
    expect(result.swaps).toEqual([]);
    expect(result.delta).toBeNull();
  });

  it("says when no build can meet the limits", () => {
    const result = optimize(input({ constraints: { minTW: 50, minFlightMin: 4 } }));
    expect(result.reason).toBe("constraints");
    expect(result.best).toBeNull();
    expect(result.cheapest).toBeNull();
    expect(result.current.fails).toContain("tw");
  });

  it("follows live prices: a motor on sale changes the pick", () => {
    const base = optimize(input({ budget: 352 }));
    const sale = optimize(input({ budget: 352 }, { "motor:2207-1950": 60 }));
    expect(base.best?.pick.motor).not.toBe("2207-1950");
    expect(sale.best?.pick.motor).toBe("2207-1950");
  });

  it("flags builds priced partly from the catalogue", () => {
    const priced = input();
    priced.options.batt["6s1100"] = { cost: 38, estimate: true };
    const result = optimize(priced);
    expect(result.current.estimate).toBe(true);
    expect(result.best?.estimate).toBe(false);
  });

  it("measures headroom on T:W alone when there is no flight-time limit", () => {
    const result = optimize(input({ constraints: { minTW: 5, minFlightMin: 0 } }));
    expect(result.best!.margin).toBeCloseTo(result.best!.tw / 5);
  });

  it("prefers fewer swaps when two picks are equal", () => {
    // Two props with the same numbers and price: the one already fitted stays.
    const tri = design.props["5x4.3x3"];
    const twin = { ...design, props: { "5x4.3x3": tri, "5x4.3x3-b": { ...tri, label: "5x4.3x3 tri-blade (other brand)" } } };
    const base = input({ design: twin, current: { ...current, prop: "5x4.3x3-b" } });
    base.options.prop = { "5x4.3x3": { cost: 8, estimate: false }, "5x4.3x3-b": { cost: 8, estimate: false } };
    const result = optimize({ ...base, budget: 346, constraints: { minTW: 5, minFlightMin: 5 } });
    expect(result.best?.pick).toEqual({ batt: "6s1100", motor: "2306-1750", prop: "5x4.3x3-b" });
    expect(result.swaps).toEqual([]);
  });

  it("refuses to guess a missing price", () => {
    const broken = input();
    delete broken.options.prop["5x5x3"];
    expect(() => optimize(broken)).toThrow(/no price for prop "5x5x3"/);
  });
});

describe("priceLines", () => {
  const lines = droneBom("quad5", design, current);
  const offer = (price: number, pack?: number) => ({
    source: "google_shopping" as const,
    title: "x",
    price,
    currency: "USD",
    url: "https://s.example/x",
    ...(pack ? { pack } : {}),
  });

  it("uses each line's best offer for its quantity, else the catalogue", () => {
    const offers = new Map<string, PartOffers>([
      ["fixed:FRAME", { key: "fixed:FRAME", offers: [offer(30)], best: 0 }],
      ["motor:2207-1950", { key: "motor:2207-1950", offers: [offer(70, 4)], best: 0 }],
      // Props listed singly: four props at $1.50 each.
      ["prop:5x5x3", { key: "prop:5x5x3", offers: [offer(1.5, 1)], best: 0 }],
      // A part with listings but none in stock keeps its estimate.
      ["fixed:ESC", { key: "fixed:ESC", offers: [{ ...offer(10), inStock: false }] }],
    ]);
    const priced = priceLines(lines, offers);
    expect(priced.fixed).toEqual({ cost: 212 - 39 + 30, estimate: true });
    expect(priced.options.motor["2207-1950"]).toEqual({ cost: 70, estimate: false });
    expect(priced.options.motor["2306-1750"]).toEqual({ cost: 88, estimate: true });
    expect(priced.options.prop["5x5x3"]).toEqual({ cost: 6, estimate: false });
    expect(priced.options.prop["5x4.3x3"]).toEqual({ cost: 8, estimate: true });
    expect(Object.keys(priced.options.batt)).toEqual(["6s1100", "6s1800", "4s1500"]);
  });

  it("feeds straight into the optimiser", () => {
    const result = optimize({ design, ...priceLines(lines, new Map()), budget: 400, constraints: { minTW: 5, minFlightMin: 4 }, current });
    expect(result.current.cost).toBe(346);
    expect(result.current.estimate).toBe(true);
  });
});
