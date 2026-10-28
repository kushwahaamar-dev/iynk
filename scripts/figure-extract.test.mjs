// @vitest-environment node
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listItems, loadItem } from './convert-io.mjs';
import { extractBench, extractBoardCircuits, extractBoardHeaders, extractFigure, extractPartLegs } from './figure-extract.mjs';

const items = (lab) => listItems().filter((i) => i.lab === lab).map((i) => i.id);

describe('extractBoardCircuits', () => {
  it.each(items('board'))('%s yields every circuit its lessons use', async (id) => {
    const circuits = await extractBoardCircuits(id);
    const used = loadItem('board', id).data.lessons.map((l) => l.circuit).filter(Boolean);
    expect(Object.keys(circuits).length).toBeGreaterThan(0);
    for (const key of used) expect(circuits).toHaveProperty(key);
  });

  it('finds the 57 circuits the 71 lessons use', async () => {
    let circuits = 0;
    for (const id of items('board')) circuits += Object.keys(await extractBoardCircuits(id)).length;
    expect(circuits).toBe(57);
  });

  it('returns plain data', async () => {
    const { button } = await extractBoardCircuits('uno-r3');
    expect(button.breadboard).toBe('half');
    expect(button.parts.map((p) => p.id)).toEqual(['BTN1', 'RES1', 'RES2', 'LED1']);
    expect(button.wires).toHaveLength(5);
    expect(Object.getPrototypeOf(button)).toBe(Object.prototype);
  });

  it('rejects a board that has no figure', async () => {
    await expect(extractBoardCircuits('no-such-board')).rejects.toThrow('no board figure "no-such-board"');
  });
});

describe('extractBoardHeaders', () => {
  it('keeps the position of every header pin', async () => {
    const headers = await extractBoardHeaders('uno-r3');
    const byId = Object.fromEntries(headers.map((h) => [h.id, h.pins]));
    expect(byId.IOH).toEqual(['SCL', 'SDA', 'AREF', 'GND', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8']);
    expect(byId.POWER[0]).toBe('');
    expect(byId.POWER[4]).toBe('5V');
  });
});

describe('extractFigure', () => {
  it('says what kind of figure a file is', async () => {
    expect((await extractFigure('figures/boards/uno-r3.js')).kind).toBe('board');
    expect((await extractFigure('figures/modules/l298n.js')).kind).toBe('module');
    expect((await extractFigure('figures/robotics/l298n.js')).kind).toBe('bench');
    expect((await extractFigure('figures/parts/led.js')).kind).toBe('part');
  });

  it('rejects a file that registers no figure', async () => {
    await expect(extractFigure('figures/engine/bench.js')).rejects.toThrow('registered no figure');
  });
});

describe('extractPartLegs', () => {
  const files = readdirSync(new URL('../figures/parts/', import.meta.url)).filter((f) => f.endsWith('.js'));

  it('finds legs in 28 of the 29 part files', async () => {
    const legs = await Promise.all(files.map((f) => extractPartLegs(`figures/parts/${f}`)));
    expect(files).toHaveLength(29);
    expect(legs.filter((l) => l.length > 0)).toHaveLength(28);
    expect(await extractPartLegs('figures/parts/breadboard.js')).toEqual([]);
  });

  it('reads legs a regex misses', async () => {
    expect(await extractPartLegs('figures/parts/mpu6050.js')).toEqual(['VCC', 'GND', 'SCL', 'SDA', 'XDA', 'XCL', 'AD0', 'INT']);
  });

  it('rejects a file that is not a part', async () => {
    await expect(extractPartLegs('figures/boards/uno-r3.js')).rejects.toThrow('not a part');
  });
});

describe('extractBench', () => {
  it.each(items('robotics'))('%s extracts', async (id) => {
    const bench = await extractBench(id);
    expect(bench.id).toBe(id);
    expect(bench.wires.every((w) => typeof w.from === 'string' && typeof w.to === 'string')).toBe(true);
  });

  it('reads the mat wires, periph boards and headers of the L298N bench', async () => {
    const bench = await extractBench('l298n');
    expect(bench.board).toBe('l298n');
    expect(bench.wires).toHaveLength(11);
    expect(bench.periph).toHaveLength(4);
    expect(Object.keys(bench.periphHeaders)).toEqual(['NANO']);
    expect(bench.headers.map((h) => h.id)).toContain('J4');
  });

  it('keeps only the circuits a bench adds to its board', async () => {
    expect(Object.keys((await extractBench('uno-r3-build')).circuits)).toEqual(['reaction-timer', 'fade-pwm']);
    expect(Object.keys((await extractBench('transistor-switch')).circuits)).toHaveLength(5);
    expect((await extractBench('esp32-s3-build')).variant).toBeTypeOf('string');
  });
});
