import type { DesignPick, DroneDesign } from "@/content/schema";
import { calc, checkLevel, designChecks, type DesignCheck } from "@/lib/drone/calc";
import { designInput } from "@/lib/drone/design";
import { lineCost, sumMoney } from "./cost";
import { SLOTS, type BomLine, type Slot } from "./bom";
import type { PartOffers } from "./types";

// The budget optimiser (HX-CONTRACT H5). Pure: given what every battery,
// motor and prop option costs right now, it runs the drone calculator on
// every combination (27 at most) and returns the build that clears the
// constraints with the most headroom under the budget, plus what it trades.

/** What one line costs: a live price, or the catalogue's when no store had it. */
export type LinePrice = { cost: number; estimate: boolean };

export type Constraints = { minTW: number; minFlightMin: number };

export type OptimizeInput = {
  design: DroneDesign;
  /** All fixed parts together. */
  fixed: LinePrice;
  options: Record<Slot, Record<string, LinePrice>>;
  budget: number;
  constraints: Constraints;
  current: DesignPick;
};

export type Fail = "budget" | "tw" | "flight" | "unsafe";

export type Candidate = {
  pick: DesignPick;
  cost: number;
  /** Some of the cost is the catalogue's estimate. */
  estimate: boolean;
  tw: number;
  flyMin: number;
  auw: number;
  hoverThr: number;
  checks: DesignCheck[];
  fails: Fail[];
  /** Headroom over the tighter constraint: 1 means exactly at the limit. */
  margin: number;
};

export type Swap = { slot: Slot; from: string; to: string };

export type OptimizeResult = {
  /** The pick to build, or null when nothing meets the constraints within the budget. */
  best: Candidate | null;
  current: Candidate;
  swaps: Swap[];
  /** best minus current. */
  delta: { cost: number; tw: number; flyMin: number; auw: number } | null;
  /** The cheapest pick with more headroom than `best`, when it costs more than the budget. */
  upgrade: Candidate | null;
  /** The cheapest pick that meets the constraints, whatever the budget. */
  cheapest: Candidate | null;
  /** Why `best` is null. */
  reason: "budget" | "constraints" | null;
  considered: number;
};

/** Checks that rule a build out whatever the budget. The user's own min T:W stands in for "weak". */
const UNSAFE = (check: DesignCheck) => check.code !== "weak" && checkLevel[check.code] === "danger";

function headroom(tw: number, flyMin: number, { minTW, minFlightMin }: Constraints): number {
  const parts: number[] = [];
  if (minTW > 0) parts.push(tw / minTW);
  if (minFlightMin > 0) parts.push(flyMin / minFlightMin);
  return parts.length ? Math.min(...parts) : tw;
}

export function evaluate(input: OptimizeInput, pick: DesignPick): Candidate {
  const calcInput = designInput(input.design, pick);
  const r = calc(calcInput);
  const prices = [input.fixed, ...SLOTS.map((slot) => {
    const price = input.options[slot][pick[slot]];
    if (!price) throw new Error(`optimize: no price for ${slot} "${pick[slot]}"`);
    return price;
  })];
  const cost = sumMoney(prices.map((p) => p.cost));
  const { minTW, minFlightMin } = input.constraints;
  const checks = designChecks(calcInput, r);
  const fails: Fail[] = [];
  if (checks.some(UNSAFE)) fails.push("unsafe");
  if (r.tw < minTW) fails.push("tw");
  if (r.flyMin < minFlightMin) fails.push("flight");
  if (cost > input.budget) fails.push("budget");
  return {
    pick,
    cost,
    estimate: prices.some((p) => p.estimate),
    tw: r.tw,
    flyMin: r.flyMin,
    auw: r.auw,
    hoverThr: r.hoverThr,
    checks,
    fails,
    margin: headroom(r.tw, r.flyMin, input.constraints),
  };
}

function swapsBetween(from: DesignPick, to: DesignPick): Swap[] {
  return SLOTS.filter((slot) => from[slot] !== to[slot]).map((slot) => ({ slot, from: from[slot], to: to[slot] }));
}

/** Most headroom first; then cheaper; then fewer swaps from the current build; then id order. */
function better(current: DesignPick) {
  return (a: Candidate, b: Candidate) =>
    b.margin - a.margin ||
    a.cost - b.cost ||
    swapsBetween(current, a.pick).length - swapsBetween(current, b.pick).length ||
    `${a.pick.batt}|${a.pick.motor}|${a.pick.prop}`.localeCompare(`${b.pick.batt}|${b.pick.motor}|${b.pick.prop}`);
}

export function optimize(input: OptimizeInput): OptimizeResult {
  const { design } = input;
  const all: Candidate[] = [];
  for (const batt of Object.keys(design.batts)) {
    for (const motor of Object.keys(design.motors)) {
      for (const prop of Object.keys(design.props)) all.push(evaluate(input, { batt, motor, prop }));
    }
  }
  const order = better(input.current);
  const meets = all.filter((c) => c.fails.every((f) => f === "budget"));
  const affordable = meets.filter((c) => c.fails.length === 0).sort(order);
  const best = affordable[0] ?? null;
  const cheapest = [...meets].sort((a, b) => a.cost - b.cost || order(a, b))[0] ?? null;
  const upgrade =
    meets
      .filter((c) => c.fails.includes("budget") && (!best || c.margin > best.margin))
      .sort((a, b) => a.cost - b.cost || order(a, b))[0] ?? null;
  const current = evaluate(input, input.current);
  return {
    best,
    current,
    swaps: best ? swapsBetween(input.current, best.pick) : [],
    delta: best
      ? {
          cost: sumMoney([best.cost, -current.cost]),
          tw: best.tw - current.tw,
          flyMin: best.flyMin - current.flyMin,
          auw: best.auw - current.auw,
        }
      : null,
    upgrade,
    cheapest,
    reason: best ? null : meets.length ? "budget" : "constraints",
    considered: all.length,
  };
}

/**
 * Prices for the optimiser from the BOM and the live offers: each line's
 * best offer for its quantity, else its catalogue estimate.
 */
export function priceLines(
  lines: readonly BomLine[],
  offers: ReadonlyMap<string, PartOffers>,
): Pick<OptimizeInput, "fixed" | "options"> {
  const price = (line: BomLine): LinePrice => {
    const found = offers.get(line.key);
    const offer = found?.best !== undefined ? found.offers[found.best] : undefined;
    if (offer) return { cost: lineCost(offer, line.qty, line.pack), estimate: false };
    return { cost: line.estimate ?? 0, estimate: true };
  };
  const fixedPrices = lines.filter((l) => !l.slot).map(price);
  const options: OptimizeInput["options"] = { batt: {}, motor: {}, prop: {} };
  for (const line of lines) {
    if (line.slot && line.option) options[line.slot][line.option] = price(line);
  }
  return {
    fixed: { cost: sumMoney(fixedPrices.map((p) => p.cost)), estimate: fixedPrices.some((p) => p.estimate) },
    options,
  };
}

/** The cheapest and dearest builds these prices allow, for the budget slider's ends. */
export function costRange({ fixed, options }: Pick<OptimizeInput, "fixed" | "options">): { min: number; max: number } {
  const costs = SLOTS.map((slot) => Object.values(options[slot]).map((p) => p.cost));
  if (costs.some((list) => list.length === 0)) return { min: fixed.cost, max: fixed.cost };
  return {
    min: sumMoney([fixed.cost, ...costs.map((list) => Math.min(...list))]),
    max: sumMoney([fixed.cost, ...costs.map((list) => Math.max(...list))]),
  };
}
