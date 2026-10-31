import { utf8Encode } from "./canonical.ts";

export interface Rng {
  /** Next unsigned 32-bit integer. */
  next(): number;
  /** Next float in [0, 1). */
  float(): number;
  /** Standard normal draw by Box-Muller from two `float()` draws. */
  gauss(): number;
}

export type RngState = [number, number, number, number];

/** FNV-1a over the UTF-8 bytes of a string, as an unsigned 32-bit integer. */
export function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (const byte of utf8Encode(s)) h = Math.imul(h ^ byte, 0x01000193);
  return h >>> 0;
}

/** SplitMix32: a generator of unsigned 32-bit integers used to spread a seed over the sfc32 state. */
export function splitmix32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
}

class Sfc32 implements Rng {
  a: number;
  b: number;
  c: number;
  d: number;

  constructor(state: RngState) {
    [this.a, this.b, this.c, this.d] = state;
  }

  next(): number {
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    return t >>> 0;
  }

  float(): number {
    return this.next() / 4294967296;
  }

  // Math.log, Math.sqrt and Math.cos may differ in the last bit between engines (A12), so simulation
  // code that must replay bit for bit uses next() and float() only.
  gauss(): number {
    const u = 1 - this.float();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * this.float());
  }
}

/** A named stream: sfc32 seeded from SplitMix32 of `seed XOR fnv1a32(stream)`, so adding a stream never moves another. */
export function rng(seed: number, stream: string): Rng {
  const next = splitmix32((seed ^ fnv1a32(stream)) >>> 0);
  return new Sfc32([next(), next(), next(), next()]);
}

/** The four state words of a generator made by `rng` or `rngFrom`, for a replay to save. */
export function rngState(r: Rng): RngState {
  if (!(r instanceof Sfc32)) throw new TypeError("rngState needs a generator made by rng or rngFrom");
  return [r.a >>> 0, r.b >>> 0, r.c >>> 0, r.d >>> 0];
}

/** A generator that continues from a saved state. */
export function rngFrom(state: RngState): Rng {
  return new Sfc32(state);
}
