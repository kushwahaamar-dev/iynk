import { describe, expect, it } from 'vitest';
import { PROFILES } from './profiles';
import { World } from './world';

const reads = (seed: number, interleave: boolean): number[] => {
  const w = new World(PROFILES['uno-r3'], { seed });
  const a: number[] = [];
  for (let i = 0; i < 100; i++) {
    a.push(w.analogRead(0));
    if (interleave) w.analogRead(1);
  }
  return a;
};

describe('floating analog inputs', () => {
  it('give pin A the same values whether or not pin B is read', () => {
    expect(reads(7, true)).toEqual(reads(7, false));
  });

  it('repeat for one seed, differ between pins, and vary', () => {
    expect(reads(7, false)).toEqual(reads(7, false));
    expect(new Set(reads(7, false)).size).toBeGreaterThan(10);
    const w = new World(PROFILES['uno-r3'], { seed: 7 });
    expect(w.floatNoise(0).next()).not.toBe(w.floatNoise(1).next());
  });
});
