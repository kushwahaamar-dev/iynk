import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Lesson } from '@/content/schema';
import { defaultParams, renderTemplate, resolveText } from '@/lib/boardlab/template';
import { createRun, getProfile, lessonJob, runChecks } from '@/lib/interp';
import board from './esp32-s3-devkitc-1';
import en from '../../i18n/content/en/boards/esp32-s3-devkitc-1.json';

const here = dirname(fileURLToPath(import.meta.url));
const figureSrc = readFileSync(resolve(here, '../../../figures/boards/esp32-s3-devkitc-1.js'), 'utf8');

const text = (key: string): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
  if (typeof v !== 'string') throw new Error(`missing text ${key}`);
  return v;
};

const render = (lesson: Lesson): string => resolveText(renderTemplate(lesson.code.source, lesson.params, defaultParams(lesson.params)).code, text);

describe('esp32-s3-devkitc-1 lessons', () => {
  it('has the four progressive lessons in order', () => {
    expect(board.lessons.map((l) => [l.n, l.level])).toEqual([[1, 'io'], [2, 'input'], [3, 'analog'], [4, 'wireless']]);
  });

  it('gives every lesson a three-question quiz whose answers are among its options', () => {
    for (const l of board.lessons) {
      expect(l.quiz?.questions, l.id).toHaveLength(3);
      for (const q of l.quiz!.questions) {
        expect(q.answer, `${l.id} ${q.id}`).toBeLessThan(q.options.length);
        for (const key of [q.q, q.why, ...q.options]) expect(text(key).length, key).toBeGreaterThan(0);
      }
    }
  });

  for (const lesson of board.lessons) {
    it(`${lesson.id}: the code passes every check through the app check path`, () => {
      const { trace, results } = runChecks(lessonJob(board, lesson, render(lesson)));
      expect(trace.error).toBeNull();
      expect(lesson.checks.filter((_, i) => !results[i].ok).map((c) => c.label)).toEqual([]);
      // the sample lines the docs show are what the run prints (Wi-Fi's IP is random per seed, so match its shape)
      const printed = trace.serial.map((l) => l.text);
      for (const s of lesson.serial.sample) {
        const want = new RegExp('^' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('192\\.168\\.4\\.x', '192\\.168\\.4\\.\\d+'));
        expect(printed.some((p) => want.test(p) || (/^\.+$/.test(s) && p.includes(s)))).toBe(true);
      }
    });
  }

  it('blink on a v1.1 board with the v1.0 pin lights nothing on GPIO38', () => {
    const lesson = board.lessons.find((l) => l.id === 'blink')!;
    const source = render(lesson).replace('RGB_PIN = 38', 'RGB_PIN = 48');
    const run = createRun({ board: 'esp32-s3-devkitc-1', variant: 'v1.1', source });
    run.start();
    run.step(lesson.runMs);
    expect(run.world.pixels.get(38)).toBeUndefined();
    expect(run.world.pixels.get(48)?.length).toBe(1);
    run.stop();
  });
});

describe('esp32-s3-devkitc-1 data matches the figure', () => {
  const arr = (name: string): string[] => {
    const m = new RegExp(`const ${name} = \\[([^\\]]+)\\]`).exec(figureSrc);
    if (!m) throw new Error(`${name} not found in the figure file`);
    return [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
  };

  it('pinout rows follow the figure headers pin by pin', () => {
    for (const [header, nets, labels] of [['J1', arr('J1'), arr('J1L')], ['J3', arr('J3'), arr('J3L')]] as const) {
      const rows = board.pinout.filter((r) => r.header === header);
      expect(rows.map((r) => r.net)).toEqual(nets);
      expect(rows.map((r) => r.label)).toEqual(labels);
      expect(rows.map((r) => r.pin)).toEqual(nets.map((_, i) => String(i + 1)));
    }
  });

  it('every part, control, LED and circuit the content names exists in the figure', () => {
    const ids = new Set([...figureSrc.matchAll(/id: '([A-Z][A-Z0-9]*)'/g)].map((m) => m[1]));
    for (const m of figureSrc.matchAll(/\['(D\d+)', [\d.]+, '/g)) ids.add(m[1]);
    for (const m of figureSrc.matchAll(/chip\('([A-Z]+\d+)'/g)) ids.add(m[1]);
    for (const p of board.figure.parts) expect(ids, p.id).toContain(p.id);
    for (const c of board.controls) expect(ids, c.id).toContain(c.id);
    for (const l of board.leds) expect(ids, l.id).toContain(l.id);
    for (const l of board.lessons) expect(figureSrc, l.id).toMatch(new RegExp(`'?${l.circuit}'?: ledCircuit\\(`));
  });

  it('every failure drives a fault the figure offers or the engine generates', () => {
    const listed = /faults: \[([^\]]+)\]/.exec(figureSrc)![1];
    const own = [...listed.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    const generic = /^(brownout|reverse-polarity:(pin5|pin3)|wrong-voltage:(pin5|pin3):[\d.]+|cold:[A-Z0-9.]+|missing:[A-Z0-9]+)$/;
    for (const f of board.failures) {
      const st = f.figure.type === 'set' ? f.figure.state : {};
      if (typeof st.fault === 'string') expect(own.includes(st.fault) || generic.test(st.fault), f.id).toBe(true);
      if (typeof st.remove === 'string') expect(figureSrc, f.id).toContain(`'${st.remove}'`);
    }
  });

  it('the RGB LED is on GPIO38 for v1.1 and GPIO48 for v1.0, in the figure and the content', () => {
    expect(figureSrc).toContain("net = v10 ? 'GPIO48' : 'GPIO38'");
    expect(board.leds.find((l) => l.id === 'D6')!.drivenBy).toBe('GPIO38');
    expect(board.variants.find((v) => v.id === 'v1.0')!.leds!.find((l) => l.id === 'D6')!.drivenBy).toBe('GPIO48');
    expect(getProfile('esp32-s3-devkitc-1', 'v1.0').leds[0].pin).toBe(48);
  });
});
