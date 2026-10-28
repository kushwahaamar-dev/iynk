import { describe, expect, it } from 'vitest';
import { createRun } from '../run';

const BLINK = `void setup() { pinMode(LED_BUILTIN, OUTPUT); }
void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}`;

describe('Arduino C++ speed', () => {
  it('Blink runs one simulated second in well under a millisecond of wall time (warm)', () => {
    const run = createRun({ board: 'uno-r3', source: BLINK });
    run.start();
    run.step(1000);
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) run.step(1000);
    const perSecond = (performance.now() - t0) / 20;
    expect(perSecond).toBeLessThan(1);
  });

  it('a busy loop hits the per-frame budget in under 100 ms', () => {
    const run = createRun({ board: 'esp32-devkitc', source: 'unsigned long n = 0;\nvoid setup() {}\nvoid loop() { n++; }', budget: 10_000 });
    run.start();
    const t0 = performance.now();
    run.step(16);
    expect(performance.now() - t0).toBeLessThan(100);
  });
});
