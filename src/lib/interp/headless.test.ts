import { describe, expect, it } from 'vitest';
import type { Check } from '@/content/schema';
import { evaluateChecks } from './checks';
import { runHeadless } from './headless';

const sketch = (setup: string) => `#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();
void setup() {
${setup}
}
void loop() {}
`;

const run = (setup: string) => runHeadless({ board: 'nano', language: 'arduino-cpp', source: sketch(setup), world: { inputs: [], script: [] }, runMs: 100 });
const last = (trace: ReturnType<typeof run>, net: string) => trace.pins[net]?.at(-1);

describe('PCA9685 channels in the trace', () => {
  it('records a servo pulse in a 50 Hz frame as degrees, the way the Servo library maps them', () => {
    const trace = run('  pwm.begin();\n  pwm.setPWMFreq(50);\n  pwm.writeMicroseconds(0, 1500);\n  pwm.writeMicroseconds(15, 600);');
    expect(trace.error).toBeNull();
    expect(last(trace, 'PCA40.0')).toMatchObject({ mode: 'servo', v: 93 });
    expect(last(trace, 'PCA40.15')).toMatchObject({ mode: 'servo', v: 5 });
    expect(last(trace, 'PCA40.7')).toMatchObject({ mode: 'out', v: 0 });
  });

  it('records duty outside a servo frame, and a full-on or full-off channel as a level', () => {
    const trace = run('  pwm.begin();\n  pwm.setPWM(0, 0, 1024);\n  pwm.setPin(1, 4095);\n  pwm.setPin(2, 0);');
    // begin() leaves the library's 1 kHz frame: a quarter duty there is PWM, not a servo
    expect(last(trace, 'PCA40.0')).toMatchObject({ mode: 'pwm', v: 0.25 });
    expect(last(trace, 'PCA40.1')).toMatchObject({ mode: 'out', v: 1 });
    expect(last(trace, 'PCA40.2')).toMatchObject({ mode: 'out', v: 0 });
  });

  it('names a board on another address by its own address', () => {
    const trace = runHeadless({
      board: 'nano', language: 'arduino-cpp', world: { inputs: [], script: [] }, runMs: 100,
      source: sketch('  pwm.begin();\n  pwm.setPWMFreq(50);\n  pwm.writeMicroseconds(3, 2400);').replace('Adafruit_PWMServoDriver()', 'Adafruit_PWMServoDriver(0x41)'),
    });
    expect(last(trace, 'PCA41.3')).toMatchObject({ mode: 'servo', v: 180 });
    expect(trace.pins['PCA40.3']).toBeUndefined();
  });

  it('lets a servo check tell a 50 Hz frame from a sketch that forgot setPWMFreq(50)', () => {
    const check: Check = { kind: 'servo', pin: 'PCA40.0', deg: [85, 95], atMs: 50, label: 'x' };
    const ok = run('  pwm.begin();\n  pwm.setPWMFreq(50);\n  pwm.setPWM(0, 0, 307);');
    const noFreq = run('  pwm.begin();\n  pwm.setPWM(0, 0, 307);');
    const ctx = { source: '', board: 'nano' };
    expect(evaluateChecks([check], ok, ctx)[0].ok).toBe(true);
    expect(evaluateChecks([check], noFreq, ctx)[0].ok).toBe(false);
    expect(last(noFreq, 'PCA40.0')?.mode).toBe('pwm');
  });
});

describe('serial output cap', () => {
  it('stops after 1 MB with one marker line', () => {
    const source = `void setup() {
  Serial.begin(2000000);
  for (int i = 0; i < 20000; i++) Serial.println("0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789");
}
void loop() {}`;
    const trace = runHeadless({ board: 'uno-r3', language: 'arduino-cpp', source, world: { inputs: [], script: [] }, runMs: 20_000 });
    expect(trace.error).toBeNull();
    expect(trace.serial.at(-1)?.text).toBe('[output truncated at 1 MB]');
    const total = trace.serial.reduce((n, l) => n + l.text.length + 2, 0);
    expect(total).toBeLessThanOrEqual(1_048_576 + 30);
  });
});
