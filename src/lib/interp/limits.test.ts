// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createRun, type RunOptions } from './run';
import { compileSketch } from './arduino/interp';
import { getProfile } from './profiles';
import { World } from './world';
import { PyRt } from './python/runtime';
import { HeapMeter, MAX_HEAP_BYTES, checkElements, checkString } from './limits';

function python(source: string) {
  const run = createRun({ board: 'pico', source, language: 'python' });
  return drive(run);
}

function arduino(source: string, board: RunOptions['board'] = 'uno-r3') {
  return drive(createRun({ board, source }));
}

function drive(run: ReturnType<typeof createRun>) {
  const errors: { kind: string; text: string }[] = [];
  let serial = '';
  run.on('serial', (t) => (serial += t));
  run.on('error', (e) => errors.push({ kind: e.kind, text: e.format() }));
  run.start();
  for (let t = 0; t < 2000; t += 16) run.step(16);
  return { errors, out: () => serial, run };
}

describe('SA-10 allocation probes', () => {
  it('stops [0] * 10**9 with an uncatchable limit', () => {
    const { errors } = python('try:\n    x = [0] * 10**9\nexcept MemoryError:\n    print("caught")\n');
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe('limit');
    expect(errors[0].text).toContain('1,000,000');
  });

  it('stops an append(bytearray(...)) loop', () => {
    const first = python('keep = []\nkeep.append(bytearray(10000000))');
    expect(first.errors[0]?.kind).toBe('limit');
    const loop = python('keep = []\nwhile True:\n    keep.append(bytearray(900000))');
    expect(loop.errors[0]?.kind).toBe('limit');
    expect(loop.errors[0].text).toContain('64 MiB');
  });

  it('stops int a[2000000000] in Arduino', () => {
    const { errors } = arduino('int a[2000000000];\nvoid setup() {}\nvoid loop() {}');
    expect(errors[0]?.kind).toBe('limit');
    expect(errors[0].text).toContain('1,000,000');
  });

  it('stops String doubling in Arduino', () => {
    const { errors } = arduino('void setup() { String s = "ab"; while (true) { s += s; } }\nvoid loop() {}');
    expect(errors[0]?.kind).toBe('limit');
    expect(errors[0].text).toContain('1,048,576');
  });

  it('lets the next run in the same process work', () => {
    python('x = [0] * 10**9');
    const { out, errors } = python('print(1 + 1)');
    expect(errors).toEqual([]);
    expect(out()).toBe('2\n');
  });
});

describe('boundaries', () => {
  it('treats a zero or negative repeat as empty', () => {
    const { out, errors } = python('print(len([0] * 0), len([0] * -3), len("a" * -1))');
    expect(errors).toEqual([]);
    expect(out()).toBe('0 0 0\n');
  });

  it('accepts a string of exactly 1,048,576 characters and refuses one more', () => {
    expect(python('print(len("a" * 1048576))').out()).toBe('1048576\n');
    expect(python('s = "a" * 1048576\nt = s + "b"').errors[0]?.kind).toBe('limit');
  });

  it('refuses a 2-D array of 1,001,000 elements', () => {
    expect(arduino('int a[1000][1001];\nvoid setup() {}\nvoid loop() {}').errors[0]?.kind).toBe('limit');
  });

  it('refuses "ab" * 600000 on the string cap and [1, 2, 3] * 400000 on the element cap', () => {
    expect(python('x = "ab" * 600000').errors[0]?.text).toContain('a string of 1200000 characters');
    expect(python('x = [1, 2, 3] * 400000').errors[0]?.text).toContain('list size 1200000');
  });

  it('checks Arduino String + as well as +=', () => {
    const { errors } = arduino('void setup() { String s = "ab"; while (true) { s = s + s; } }\nvoid loop() {}');
    expect(errors[0]?.kind).toBe('limit');
  });
});

describe('helpers', () => {
  it('throws a limit error from the check functions', () => {
    expect(() => checkElements(1_000_001, 'array size')).toThrow(/array size 1000001 is over the limit of 1,000,000 elements/);
    expect(() => checkElements(1_000_000, 'array size')).not.toThrow();
    expect(() => checkString(1_048_577)).toThrow(/1,048,576/);
    expect(() => checkString(1_048_576)).not.toThrow();
  });

  it('charges and releases the heap', () => {
    const heap = new HeapMeter();
    heap.charge(MAX_HEAP_BYTES, 'a list');
    expect(() => heap.charge(1, 'a list')).toThrow(/64 MiB/);
    heap.release(100);
    expect(heap.used).toBe(MAX_HEAP_BYTES - 100);
    heap.chargeItems(1024, 'a list');
    heap.chargeText(1024, 'a string');
    expect(heap.used).toBe(MAX_HEAP_BYTES - 100);
  });

  it('gives both runtimes a heap meter', () => {
    const uno = new World(getProfile('uno-r3'));
    expect(compileSketch('void setup() {}\nvoid loop() {}', uno).rt.heap).toBeInstanceOf(HeapMeter);
    const pico = new World(getProfile('pico'));
    expect(new PyRt(pico, 'pass', 1).heap.used).toBe(0);
  });
});

describe('programs under every cap', () => {
  it('runs a list comprehension of 100,000 items', () => {
    const { out, errors } = python('print(len([i for i in range(100000)]))');
    expect(errors).toEqual([]);
    expect(out()).toBe('100000\n');
  });

  it('runs Blink', () => {
    const { errors } = arduino('void setup() { pinMode(LED_BUILTIN, OUTPUT); }\nvoid loop() { digitalWrite(LED_BUILTIN, HIGH); delay(500); digitalWrite(LED_BUILTIN, LOW); delay(500); }');
    expect(errors).toEqual([]);
  });
});
