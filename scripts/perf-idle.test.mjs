import { describe, expect, it } from 'vitest';
import { idlePercent } from './perf-idle.mjs';

const sample = (taskDuration, timestamp) => ({
  metrics: [
    { name: 'TaskDuration', value: taskDuration },
    { name: 'Timestamp', value: timestamp },
  ],
});

describe('idlePercent', () => {
  it('turns busy time over wall time into a percent', () => {
    expect(idlePercent(sample(1.0, 10), sample(1.25, 15))).toBeCloseTo(5);
  });

  it('returns 0 for a zero-length window', () => {
    expect(idlePercent(sample(1, 10), sample(1, 10))).toBe(0);
  });

  it('throws when TaskDuration goes backwards', () => {
    expect(() => idlePercent(sample(2, 10), sample(1, 15))).toThrow(/backwards/);
  });

  it('throws when a metric is missing', () => {
    expect(() => idlePercent({ metrics: [] }, sample(1, 15))).toThrow(/lack/);
  });
});
