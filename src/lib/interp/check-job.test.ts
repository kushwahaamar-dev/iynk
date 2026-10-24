// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Check, WorldModel } from '@/content/schema';
import { runChecks, type CheckJob } from './check-job';
import { startChecks } from './check-client';
import { LIMIT_MESSAGE } from './headless';

const BLINK = `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Blink ready");
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("on");
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  Serial.println("off");
  delay(1000);
}
`;

const NO_WORLD: WorldModel = { inputs: [], script: [] };
const job = (source: string, checks: Check[], extra: Partial<CheckJob> = {}): CheckJob => ({
  board: 'uno-r3',
  language: 'arduino-cpp',
  source,
  world: NO_WORLD,
  runMs: 5000,
  logicV: 5,
  checks,
  ...extra,
});

describe('runChecks', () => {
  it('records D13 every 1000 ms of virtual time and the serial lines', () => {
    const { trace } = runChecks(job(BLINK, []));
    expect(trace.error).toBeNull();
    const d13 = trace.pins.D13.filter((e) => e.mode === 'out');
    const ms = (level: number) => d13.filter((e) => e.v === level).map((e) => Math.round(e.t));
    expect(ms(1).slice(0, 3)).toEqual([0, 2000, 4000]);
    expect(ms(0).slice(0, 2)).toEqual([1000, 3000]);
    expect(trace.serial.map((l) => l.text).slice(0, 4)).toEqual(['Blink ready', 'on', 'off', 'on']);
    expect(trace.serial[2].t).toBe(1000);
  });

  it('passes the Blink checks (full period, rising to rising) and fails a sketch that never toggles', () => {
    const checks: Check[] = [
      { kind: 'runs', minMs: 4000, label: 'c1' },
      { kind: 'pin-toggles', pin: 'D13', periodMs: [1900, 2100], minCycles: 2, label: 'c2' },
      { kind: 'pin-level', pin: 'D13', level: 0, atMs: 1500, label: 'c3' },
      { kind: 'serial', match: '^o(n|ff)$', regex: true, minCount: 4, label: 'c4' },
      { kind: 'code', must: ['digitalWrite', 'delay('], mustNot: ['analogWrite'], label: 'c5' },
    ];
    expect(runChecks(job(BLINK, checks)).results.map((r) => r.ok)).toEqual([true, true, true, true, true]);
    const stuck = BLINK.replace('digitalWrite(LED_BUILTIN, LOW);', '');
    expect(runChecks(job(stuck, checks)).results[1].ok).toBe(false);
  });

  it('counts full duty as PWM: analogWrite(255) passes a pwm check at duty 1', () => {
    const source = 'void setup() { pinMode(9, OUTPUT); analogWrite(9, 128); delay(500); analogWrite(9, 255); }\nvoid loop() {}';
    const checks: Check[] = [
      { kind: 'pwm', pin: 'D9', duty: [0.45, 0.55], atMs: 200, label: 'half' },
      { kind: 'pwm', pin: 'D9', duty: [0.99, 1], atMs: 800, label: 'full' },
    ];
    expect(runChecks(job(source, checks, { runMs: 1000 })).results.map((r) => r.ok)).toEqual([true, true]);
  });

  it('reports a compile error with its line instead of running', () => {
    const broken = BLINK.replace('pinMode(LED_BUILTIN, OUTPUT);', 'pinMode(LED_BUILTIN, OUTPUT)');
    const { trace } = runChecks(job(broken, [], { runMs: 1000 }));
    expect(trace.error?.line).toBeGreaterThan(0);
    expect(trace.ms).toBe(0);
  });

  it('feeds a scripted button press into digitalRead', () => {
    const source = 'void setup() { pinMode(2, INPUT); pinMode(13, OUTPUT); }\nvoid loop() { digitalWrite(13, digitalRead(2)); }';
    const world: WorldModel = {
      inputs: [{ id: 'btn', quantity: 'button', device: { kind: 'button', pull: 'external-down', bounceMs: 0 }, pins: ['D2'], part: 'SW1', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'w.btn' }],
      script: [{ t: 500, input: 'btn', value: 1 }, { t: 900, input: 'btn', value: 0 }],
    };
    const check: Check = { kind: 'responds', after: { t: 500, input: 'btn', value: 1 }, pin: 'D13', withinMs: 20, mode: 'out', v: [1, 1], label: 'x' };
    const { trace, results } = runChecks(job(source, [check], { world, runMs: 1200 }));
    expect(results[0].ok).toBe(true);
    const at = (t: number) => [...trace.pins.D13].reverse().find((e) => e.t <= t)?.v;
    expect([at(400), at(600), at(1100)]).toEqual([0, 1, 0]);
  });

  it('measures distance through an HC-SR04 from the world spec', () => {
    const source = `void setup() { Serial.begin(9600); pinMode(9, OUTPUT); pinMode(10, INPUT); }
void loop() {
  digitalWrite(9, LOW); delayMicroseconds(2); digitalWrite(9, HIGH); delayMicroseconds(10); digitalWrite(9, LOW);
  long us = pulseIn(10, HIGH);
  Serial.println(us / 58);
  delay(200);
}`;
    const world: WorldModel = {
      inputs: [{ id: 'sonar', quantity: 'distance-cm', device: { kind: 'hc-sr04' }, pins: ['D9', 'D10'], part: 'U1', min: 2, max: 400, step: 1, default: 30, gesture: 'slide', label: 'w.sonar' }],
      script: [{ t: 600, input: 'sonar', value: 120 }],
    };
    const { trace } = runChecks(job(source, [], { world, runMs: 1200 }));
    const cm = trace.serial.map((l) => Number(l.text));
    expect(cm[0]).toBeGreaterThanOrEqual(29);
    expect(cm[0]).toBeLessThanOrEqual(31);
    expect(cm.at(-1)).toBeGreaterThanOrEqual(118);
  });

  it('stops a run that takes longer than its wall-clock budget with a limit error', () => {
    const busy = 'volatile long x = 0;\nvoid setup() {}\nvoid loop() { for (long i = 0; i < 1000; i++) x += i; }';
    const { trace } = runChecks(job(busy, [], { runMs: 600_000 }), { budgetMs: 30 });
    expect(trace.error?.message).toBe(LIMIT_MESSAGE);
    expect(trace.ms).toBeLessThan(600_000);
  });
});

describe('startChecks without a Worker (tests, server)', () => {
  it('runs the same job after a yield and reports progress up to the end', async () => {
    const fractions: number[] = [];
    const checks: Check[] = [{ kind: 'pin-toggles', pin: 'D13', periodMs: [1900, 2100], minCycles: 1, label: 'c' }];
    const { results } = await startChecks(job(BLINK, checks), (f) => fractions.push(f)).result;
    expect(results[0].ok).toBe(true);
    expect(fractions.length).toBeGreaterThan(5);
    expect(fractions.at(-1)).toBe(1);
  });
});
