import type { LiveAnalog } from "./live.ts";
import type { Element, ElementId, SolveResult } from "./types.ts";

export type ToleranceMode = "nominal" | "seeded" | "corners";

export interface Tol {
  nominal: number;
  tol?: { kind: "pct" | "abs"; value: number };
  dist?: "uniform" | "normal3";
}

export interface Band {
  band: [number, number];
  method: "corners" | "monte-carlo";
  /** Solves tried, including the ones that did not converge. */
  draws: number;
  skipped: number;
}

export const MAX_CORNER_PARTS = 6;
export const MONTE_CARLO_DRAWS = 32;
const NORMAL_TRIES = 8;

/** FNV-1a over the label, started from the seed. */
function hashSeed(seed: number, label: string): number {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/** One xorshift32 stream per name, so adding a part never moves another part's draws. */
export function toleranceStreams(seed: number): (name: string) => () => number {
  return (name) => {
    let s = hashSeed(seed, name) || 0x2545f491;
    return () => {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 4294967296;
    };
  };
}

/** Half the width of the band, or null when the part states no usable tolerance. */
function halfWidth(t: Tol): number | null {
  if (!t.tol || !(t.tol.value >= 0)) return null;
  if (t.tol.kind === "pct") return t.tol.value <= 50 ? (Math.abs(t.nominal) * t.tol.value) / 100 : null;
  return t.tol.value;
}

export const hasTolerance = (t: Tol): boolean => halfWidth(t) !== null;

export function drawValue(t: Tol, next: () => number): number {
  const half = halfWidth(t);
  if (half === null) return t.nominal;
  if (t.dist !== "normal3") return t.nominal + (2 * next() - 1) * half;
  const sigma = half / 3;
  let offset = 0;
  for (let i = 0; i < NORMAL_TRIES; i++) {
    offset = sigma * Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
    if (Math.abs(offset) <= half) return t.nominal + offset;
  }
  return t.nominal + Math.max(-half, Math.min(half, offset));
}

const ohms = (value: number): Partial<Element> => ({ ohms: value }) as Partial<Element>;

/** Each tolerance part draws once from its own stream `tol:<partId>`. */
export function seededParams(parts: Record<string, Tol>, seed: number, stream: (name: string) => () => number): Record<ElementId, Partial<Element>> {
  const params: Record<ElementId, Partial<Element>> = {};
  for (const [id, t] of Object.entries(parts)) if (hasTolerance(t)) params[id] = ohms(drawValue(t, stream(`tol:${id}`)));
  return params;
}

function cornerParams(ids: string[], parts: Record<string, Tol>, mask: number): Record<ElementId, Partial<Element>> {
  const params: Record<ElementId, Partial<Element>> = {};
  ids.forEach((id, i) => {
    const half = halfWidth(parts[id]) ?? 0;
    params[id] = ohms(parts[id].nominal + (mask & (1 << i) ? half : -half));
  });
  return params;
}

/** On demand only: up to 2^6 corner solves, or 32 Monte Carlo draws. Null when no solve converged. */
export function band(
  live: Pick<LiveAnalog, "whatIf">,
  pick: (r: SolveResult) => number,
  parts: Record<string, Tol>,
  seed: number,
  forceMonteCarlo = false,
): Band | null {
  const ids = Object.keys(parts).filter((id) => hasTolerance(parts[id]));
  if (ids.length === 0) return null;
  const corners = !forceMonteCarlo && ids.length <= MAX_CORNER_PARTS;
  const stream = toleranceStreams(seed);
  const trials: Record<ElementId, Partial<Element>>[] = [];
  if (corners) {
    for (let mask = 0; mask < 2 ** ids.length; mask++) trials.push(cornerParams(ids, parts, mask));
  } else {
    for (let i = 0; i < MONTE_CARLO_DRAWS; i++) {
      const params: Record<ElementId, Partial<Element>> = {};
      for (const id of ids) params[id] = ohms(drawValue(parts[id], stream(`tol:mc:${i}:${id}`)));
      trials.push(params);
    }
  }
  let lo = Infinity;
  let hi = -Infinity;
  let skipped = 0;
  for (const params of trials) {
    const result = live.whatIf({ params });
    if (!result.converged) {
      skipped++;
      continue;
    }
    const value = pick(result);
    lo = Math.min(lo, value);
    hi = Math.max(hi, value);
  }
  if (skipped === trials.length) return null;
  return { band: [lo, hi], method: corners ? "corners" : "monte-carlo", draws: trials.length, skipped };
}
