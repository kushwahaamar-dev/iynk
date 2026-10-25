// ESP32-DevKitC content: data invariants, and every lesson's code run through the app's one check path
// (runHeadless + evaluateChecks) on the lesson's world script; wrong code or a wrong world must fail.
import { describe, expect, it } from 'vitest';
import board from './esp32-devkitc';
import en from '@/i18n/content/en/boards/esp32-devkitc.json';
import type { Lesson } from '@/content/schema';
import { defaultParams, renderTemplate, resolveText } from '@/lib/boardlab/template';
import { lessonJob, runChecks } from '@/lib/interp';

const text = (key: string): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
  if (typeof v !== 'string') throw new Error(`missing text ${key}`);
  return v;
};

const render = (l: Lesson): string => resolveText(renderTemplate(l.code.source, l.params, defaultParams(l.params)).code, text);

describe('esp32-devkitc content', () => {
  it('has the fixed ids and at least the four progressive lesson levels', () => {
    expect(board.id).toBe('esp32-devkitc');
    expect(board.lab).toBe('board');
    const levels = new Set<string>(board.lessons.map((l) => l.level));
    for (const lv of ['io', 'input', 'analog', 'wireless']) expect(levels.has(lv)).toBe(true);
    expect(board.lessons.map((l) => l.n)).toEqual(board.lessons.map((_, i) => i + 1));
  });

  it('lists all 38 header pins once, with the silkscreen labels in header order', () => {
    const j2 = board.pinout.filter((r) => r.header === 'J2').map((r) => r.label);
    const j3 = board.pinout.filter((r) => r.header === 'J3').map((r) => r.label);
    expect(j2).toEqual(['3V3', 'EN', 'VP', 'VN', '34', '35', '32', '33', '25', '26', '27', '14', '12', 'GND', '13', 'D2', 'D3', 'CMD', '5V']);
    expect(j3).toEqual(['GND', '23', '22', 'TX', 'RX', '21', 'GND', '19', '18', '5', '17', '16', '4', '0', '2', '15', 'D1', 'D0', 'CLK']);
    const keys = board.pinout.map((r) => `${r.header}.${r.pin}`);
    expect(new Set(keys).size).toBe(38);
  });

  it('marks the input-only, strapping and ADC2 pins the way the datasheet does', () => {
    const row = (net: string) => board.pinout.find((r) => r.net === net)!;
    for (const n of ['GPIO34', 'GPIO35', 'GPIO36', 'GPIO39']) {
      expect(row(n).caps).toContain('input-only');
      expect(row(n).caps).not.toContain('pwm');
    }
    for (const n of ['GPIO0', 'GPIO2', 'GPIO5', 'GPIO12', 'GPIO15']) expect(row(n).caps).toContain('strapping');
    for (const n of ['GPIO0', 'GPIO2', 'GPIO4', 'GPIO12', 'GPIO13', 'GPIO14', 'GPIO15', 'GPIO25', 'GPIO26', 'GPIO27']) {
      expect(row(n).functions.some((f) => f.startsWith('ADC2_'))).toBe(true);
    }
    for (const r of board.pinout) if (r.net.startsWith('GPIO')) expect(r.fiveVoltTolerant).toBe(false);
  });

  it('has every designed failure kind the brief asks for', () => {
    const kinds = new Set(board.failures.map((f) => f.kind));
    for (const k of ['reverse-polarity', 'brownout', 'wrong-voltage', 'cold-solder', 'missing-part', 'boot-strap']) expect(kinds.has(k as never)).toBe(true);
    expect(board.failures.some((f) => f.trigger.by === 'remove-part')).toBe(true);
    expect(board.failures.some((f) => f.trigger.by === 'power-input' && f.trigger.input === 'pin3v3' && f.trigger.volts === 5)).toBe(true);
  });

  it('fails the checks when the code or the world is wrong (the checks are not vacuous)', () => {
    const lesson = (id: string) => board.lessons.find((l) => l.id === id)!;
    const failing = (l: Lesson, source: string) => {
      const { results } = runChecks(lessonJob(board, l, source));
      return l.checks.filter((_, i) => !results[i].ok).map((c) => c.label);
    };
    const blink = lesson('blink');
    expect(failing(blink, render(blink).replace('LED_PIN = 23', 'LED_PIN = 22'))).toContain('lessons.blink.checks.1');
    const web = lesson('web-switch');
    expect(failing(web, render(web).replace('"robotics"', '"robot1cs"'))).toEqual(expect.arrayContaining(['lessons.web-switch.checks.1', 'lessons.web-switch.checks.2']));
    const button = lesson('boot-button');
    expect(failing({ ...button, world: { ...button.world, script: [] } }, render(button))).toContain('lessons.boot-button.checks.1');
    const fade = lesson('fade');
    expect(failing(fade, render(fade).replace(/ledcWrite\(LED_PIN, maxDuty \* i \/ 50\)/g, 'ledcWrite(LED_PIN, maxDuty)'))).toContain('lessons.fade.checks.1');
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
    it(`lesson ${lesson.n} ${lesson.id}: the code passes every check and prints its sample lines`, () => {
      const { trace, results } = runChecks(lessonJob(board, lesson, render(lesson)));
      expect(trace.error).toBeNull();
      expect(lesson.checks.filter((_, i) => !results[i].ok).map((c) => c.label)).toEqual([]);
      const printed = trace.serial.map((s) => s.text);
      for (const want of lesson.serial.sample) {
        if (/[x.]{2,}|\bx\b/.test(want)) continue; // placeholders for addresses and progress dots
        expect(printed).toContain(want);
      }
    });
  }
});
