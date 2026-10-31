/** Integer nanoseconds since run start, 0..2^53 (about 104 days). */
export type SimTime = number;

/** Nanoseconds per tick as the reduced fraction num/den. */
export interface ClockRate {
  num: number;
  den: number;
}

export const NS_PER_MS = 1_000_000;

const LIMIT = 2 ** 53;

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

const requireCount = (what: string, n: number): void => {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`${what} must be a non-negative integer, got ${n}`);
};

/** Builds a rate from nanoseconds per tick as num/den, reduced by the greatest common divisor. */
export function clockRate(num: number, den: number): ClockRate {
  if (!Number.isSafeInteger(num) || !Number.isSafeInteger(den) || num <= 0 || den <= 0) {
    throw new RangeError(`a clock rate needs positive integers, got ${num}/${den}`);
  }
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

function checked(result: bigint): number {
  if (result > BigInt(LIMIT)) throw new RangeError("time is past 2^53 ns");
  return Number(result);
}

/** Divides a product that is below 2^53 exactly; `Math.floor(a / b)` can round up near the limit. */
const floorDiv = (a: number, b: number): number => (a - (a % b)) / b;

/** Exact floor(cycles * num / den) in nanoseconds. */
export function cyclesToNs(cycles: number, rate: ClockRate): SimTime {
  requireCount("cycles", cycles);
  const product = cycles * rate.num;
  if (product < LIMIT) return floorDiv(product, rate.den);
  return checked((BigInt(cycles) * BigInt(rate.num)) / BigInt(rate.den));
}

/** Smallest cycle count whose time is at or after `ns`, so a deadline is never missed. */
export function nsToCycles(ns: SimTime, rate: ClockRate): number {
  requireCount("ns", ns);
  const product = ns * rate.den;
  if (product < LIMIT) return floorDiv(product, rate.num) + (product % rate.num === 0 ? 0 : 1);
  const num = BigInt(rate.num);
  return checked((BigInt(ns) * BigInt(rate.den) + num - 1n) / num);
}
