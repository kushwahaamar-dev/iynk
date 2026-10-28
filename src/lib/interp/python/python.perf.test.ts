import { describe, expect, it } from 'vitest';
import { createRun } from '../run';

describe('MicroPython speed', () => {
  it('an endless loop without sleep is cut off by the per-frame budget in under 200 ms', () => {
    const run = createRun({ board: 'pi4-pi5', source: 'n = 0\nwhile True:\n    n += 1\n', language: 'python', budget: 50_000 });
    run.start();
    const t0 = performance.now();
    run.step(16);
    expect(performance.now() - t0).toBeLessThan(200);
  });
});
