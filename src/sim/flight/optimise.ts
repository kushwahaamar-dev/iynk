import type { Descriptor } from "../../parts/descriptor.ts";
import { readBattery, readMotor, readProp, type MotorSI, type PackMech, type PropSI, type Read } from "../../parts/mechanics.ts";
import type { Resolve } from "../../project/domains/drone-semantic.ts";
import { packOpen, type FlyChem, type PackSI } from "./battery.ts";
import type { Build } from "./build.ts";
import { evaluateBuild, type BuildOutputs } from "./evaluate.ts";
import type { FitRecord } from "./fit.ts";
import { checkField, type OutOfRange } from "./guards.ts";
import type { PlacedBody } from "./mass.ts";

export type PriceTable = ReadonlyMap<string, { amount: number; asOf: string; estimate: boolean }>;

export interface Constraints {
  minTW: number;
  minFlightMin: number;
  budget: number | null;
}

export type PartRef = { ref: string; version: string };

export interface Library {
  motors: ReadonlyArray<PartRef>;
  props: ReadonlyArray<PartRef>;
  packs: ReadonlyArray<PartRef>;
}

export type Fail = "budget" | "tw" | "flight" | "check";

export interface Candidate {
  motor: string;
  prop: string;
  pack: string;
  cost: number | null;
  tw: number;
  flightMin: { low: number; typ: number };
  margin: number;
  fails: Fail[];
  unpriced: string[];
}

type Slot = "motor" | "prop" | "pack";

export interface OptimiseResult {
  best: Candidate | null;
  current: Candidate;
  swaps: Array<{ slot: Slot; from: string; to: string }>;
  cheapest: Candidate | null;
  reason: "budget" | "constraints" | "unpriced" | null;
  /** Triples looked at, including the pruned ones. */
  considered: number;
  pruned: number;
  prunedWhy: ReadonlyArray<{ part: string; path: string }>;
}

const DEFAULT_CAP = 20_000;
const SLICE = 25;
const SEC_PER_MIN = 60;
const MM_PER_INCH = 25.4;
const M_PER_INCH = MM_PER_INCH / 1000;
const MIN_FLOOR = 1e-9;
/** Needs and defaults that belong to a part the search replaces. */
const SWAPPED_PATH = /^(mechanics\.(motor|prop|battery)\b|domains\.drone\.battery$)/;
const SLOTS: readonly Slot[] = ["motor", "prop", "pack"];

const keyOf = (p: PartRef): string => `${p.ref}@${p.version}`;

/** The price of a part named by `ref@version`, or by a bare ref when the version is not known. */
function priceOf(prices: PriceTable, key: string): number | null {
  const exact = prices.get(key);
  if (exact) return exact.amount;
  if (key.includes("@")) return null;
  for (const [k, v] of prices) if (k.startsWith(`${key}@`)) return v.amount;
  return null;
}

const packOf = ({ chemistry, ...rest }: PackMech): PackSI => ({ ...rest, chem: chemistry as FlyChem });

type Loaded<T> = { part: PartRef; value: T; descriptor: Descriptor };

function load<T>(
  part: PartRef,
  resolve: Resolve,
  read: (d: Descriptor) => Read<T>,
  why: Array<{ part: string; path: string }>,
): Loaded<T> | null {
  const descriptor = resolve(part);
  if (!descriptor) {
    why.push({ part: keyOf(part), path: "library" });
    return null;
  }
  const got = read(descriptor);
  if (got.ok) return { part, value: got.value, descriptor };
  got.missing.forEach((need) => why.push({ part: keyOf(part), path: need.path }));
  return null;
}

/** Gives the body that carried a replaced part its new mass, scaling its stated inertia with it. */
function reweigh(
  bodies: readonly PlacedBody[],
  changes: ReadonlyArray<{ from: number; to: number; at: readonly [number, number] }>,
): PlacedBody[] {
  const out = bodies.map((b) => ({ ...b }));
  const claimed = new Set<number>();
  for (const { from, to, at } of changes) {
    let hit = -1;
    let nearest = Infinity;
    out.forEach((b, i) => {
      if (claimed.has(i) || Math.abs(b.mass_g - from) > MIN_FLOOR) return;
      const d = Math.hypot(b.position_mm[0] - at[0], b.position_mm[1] - at[1]);
      if (d < nearest) {
        nearest = d;
        hit = i;
      }
    });
    if (hit < 0) continue;
    claimed.add(hit);
    const body = out[hit];
    const scale = to / from;
    body.mass_g = to;
    if (body.inertia_g_mm2) body.inertia_g_mm2 = [body.inertia_g_mm2[0] * scale, body.inertia_g_mm2[1] * scale, body.inertia_g_mm2[2] * scale];
  }
  return out;
}

function swapped(base: Build, motor: Loaded<MotorSI>, prop: Loaded<PropSI>, pack: Loaded<PackMech>): Build {
  const records = (prop.descriptor["x_fit"] as FitRecord[] | undefined) ?? [];
  const record = records.find((r) => r.motor === motor.part.ref);
  const fits = new Map<string, FitRecord>();
  const changes: Array<{ from: number; to: number; at: readonly [number, number] }> = [];
  for (const s of base.slots) {
    if (record) fits.set(s.id, record);
    changes.push({ from: s.motor.mass_g, to: motor.value.mass_g, at: s.axis_mm }, { from: s.prop.mass_g, to: prop.value.mass_g, at: s.axis_mm });
  }
  if (base.pack) changes.push({ from: base.pack.mass_g, to: pack.value.mass_g, at: [0, 0] });
  return {
    ...base,
    slots: base.slots.map((s) => ({
      ...s,
      motor: motor.value,
      prop: prop.value,
      motorRef: motor.part.ref,
      propRef: prop.part.ref,
    })),
    pack: packOf(pack.value),
    packRef: pack.part.ref,
    fits,
    missing: base.missing.filter((n) => !SWAPPED_PATH.test(n.path)),
    assumed: base.assumed.filter((path) => !SWAPPED_PATH.test(path)),
    bodies: reweigh(base.bodies, changes),
  };
}

/** The part of an evaluation the search ranks and filters on; null when the build cannot be solved. */
function figures(out: BuildOutputs): { tw: number; low: number; typ: number; checkFails: boolean } | null {
  if (out.tw === null || out.endurance === null) return null;
  return {
    tw: out.tw,
    low: out.endurance.low_s / SEC_PER_MIN,
    typ: out.endurance.typ_s / SEC_PER_MIN,
    checkFails: out.checks.some((c) => c.result === "fail"),
  };
}

function scored(
  ids: { motor: string; prop: string; pack: string },
  f: ReturnType<typeof figures>,
  cost: { total: number | null; unpriced: string[] },
  c: Constraints,
): Candidate {
  const tw = f?.tw ?? 0;
  const low = f?.low ?? 0;
  const fails: Fail[] = [];
  if (c.budget !== null && (cost.total === null || cost.total > c.budget)) fails.push("budget");
  if (tw < c.minTW) fails.push("tw");
  if (low < c.minFlightMin) fails.push("flight");
  if (!f || f.checkFails) fails.push("check");
  return {
    ...ids,
    cost: cost.total,
    tw,
    flightMin: { low, typ: f?.typ ?? 0 },
    margin: Math.min(tw / Math.max(c.minTW, MIN_FLOOR), low / Math.max(c.minFlightMin, MIN_FLOOR)),
    fails,
    unpriced: cost.unpriced,
  };
}

const swapsBetween = (from: Candidate, to: Candidate): OptimiseResult["swaps"] =>
  SLOTS.filter((slot) => from[slot] !== to[slot]).map((slot) => ({ slot, from: from[slot], to: to[slot] }));

const idOf = (c: { motor: string; prop: string; pack: string }): string => `${c.motor}|${c.prop}|${c.pack}`;

/** Most headroom first; then cheaper (unpriced last); then fewer swaps from the current build; then id order. */
const better =
  (current: Candidate) =>
  (a: Candidate, b: Candidate): number =>
    b.margin - a.margin ||
    (a.cost ?? Infinity) - (b.cost ?? Infinity) ||
    swapsBetween(current, a).length - swapsBetween(current, b).length ||
    idOf(a).localeCompare(idOf(b));

/**
 * Searches every motor, prop and pack of the library, each fitted to all slots, for the most margin over the
 * constraints. The frame, controller and ESCs stay as the build has them. Yields progress every 25 triples.
 */
export function* optimiseIter(
  base: Build,
  lib: Library,
  resolve: Resolve,
  prices: PriceTable,
  c: Constraints,
  opts: { cap?: number } = {},
): Generator<{ done: number; total: number }, OptimiseResult | OutOfRange> {
  const total = lib.motors.length * lib.props.length * lib.packs.length;
  const tooMany = checkField("library", total, { min: 0, max: opts.cap ?? DEFAULT_CAP });
  if (tooMany) return tooMany;

  const why: Array<{ part: string; path: string }> = [];
  const motors = lib.motors.map((p) => load(p, resolve, readMotor, why));
  const props = lib.props.map((p) => load(p, resolve, readProp, why));
  const packs = lib.packs.map((p) => load(p, resolve, readBattery, why));

  const first = base.slots[0];
  const known = (parts: ReadonlyArray<PartRef>, ref: string): string => {
    const hit = parts.find((p) => p.ref === ref);
    return hit ? keyOf(hit) : ref;
  };
  const currentIds = {
    motor: known(lib.motors, first?.motorRef ?? ""),
    prop: known(lib.props, first?.propRef ?? ""),
    pack: known(lib.packs, base.packRef),
  };

  const count = base.slots.length;
  const costOf = (ids: { motor: string; prop: string; pack: string }) => {
    const unpriced: string[] = [];
    const price = (key: string, times: number): number => {
      const amount = priceOf(prices, key);
      if (amount === null) unpriced.push(key);
      return (amount ?? 0) * times;
    };
    const sum = price(ids.motor, count) + price(ids.prop, count) + price(ids.pack, 1);
    return { total: unpriced.length === 0 ? sum + base.slots.reduce((acc, s) => acc + (priceOf(prices, s.escRef) ?? 0), 0) : null, unpriced };
  };

  const current = scored(currentIds, figures(evaluateBuild(base)), costOf(currentIds), c);

  const packFull = (p: Loaded<PackMech>) => packOpen(packOf(p.value), 1);
  const frameMaxM = base.frame?.prop_max_in === undefined ? Infinity : base.frame.prop_max_in * M_PER_INCH;

  const found: Candidate[] = [];
  const built = new Map<string, Build>();
  let pruned = 0;
  let done = 0;
  for (const motor of motors) {
    for (const prop of props) {
      for (const pack of packs) {
        done += 1;
        if (done % SLICE === 0) yield { done, total };
        if (!motor || !prop || !pack) {
          pruned += 1;
          continue;
        }
        const tooFast = motor.value.v_max !== undefined && motor.value.v_max < packFull(pack);
        if (tooFast || prop.value.d_m > frameMaxM) {
          pruned += 1;
          continue;
        }
        const ids = { motor: keyOf(motor.part), prop: keyOf(prop.part), pack: keyOf(pack.part) };
        const build = swapped(base, motor, prop, pack);
        const out = evaluateBuild(build, { fast: true });
        const f = figures(out);
        if (!f) {
          pruned += 1;
          const need = out.blocked.flatMap((b) => b.needs)[0];
          why.push({ part: `${ids.motor}+${ids.prop}+${ids.pack}`, path: need?.path ?? "evaluation" });
          continue;
        }
        built.set(idOf(ids), build);
        found.push(scored(ids, f, costOf(ids), c));
      }
    }
  }

  const order = better(current);
  const exact = (cand: Candidate): Candidate => {
    const build = built.get(idOf(cand));
    return build ? scored({ motor: cand.motor, prop: cand.prop, pack: cand.pack }, figures(evaluateBuild(build)), { total: cand.cost, unpriced: cand.unpriced }, c) : cand;
  };

  const meets = found.filter((cand) => cand.fails.every((f) => f === "budget"));
  const affordable = meets.filter((cand) => cand.fails.length === 0).sort(order);
  let best: Candidate | null = null;
  for (const cand of affordable) {
    const rerun = exact(cand);
    if (rerun.fails.length === 0) {
      best = rerun;
      break;
    }
  }

  const byCost = (a: Candidate, b: Candidate) => (a.cost ?? Infinity) - (b.cost ?? Infinity) || order(a, b);
  const priced = (list: Candidate[]) => list.filter((cand) => cand.cost !== null).sort(byCost)[0];
  const cheap = priced(meets) ?? priced(found.filter((cand) => !cand.fails.includes("check")));

  let reason: OptimiseResult["reason"] = null;
  if (!best) reason = meets.length === 0 ? "constraints" : meets.every((cand) => cand.unpriced.length > 0) ? "unpriced" : "budget";

  const seen = new Set<string>();
  const prunedWhy = why.filter((w) => {
    const key = `${w.part}|${w.path}`;
    return seen.has(key) ? false : (seen.add(key), true);
  });

  return {
    best,
    current,
    swaps: best ? swapsBetween(current, best) : [],
    cheapest: cheap ? exact(cheap) : null,
    reason,
    considered: total,
    pruned,
    prunedWhy,
  };
}

export function optimise(
  base: Build,
  lib: Library,
  resolve: Resolve,
  prices: PriceTable,
  c: Constraints,
  opts?: { cap?: number },
): OptimiseResult | OutOfRange {
  const run = optimiseIter(base, lib, resolve, prices, c, opts);
  for (let step = run.next(); ; step = run.next()) if (step.done) return step.value;
}
