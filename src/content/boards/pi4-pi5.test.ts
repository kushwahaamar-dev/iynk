// @vitest-environment node
// The Raspberry Pi 4/5 content against its built figure (figures/boards/pi4-pi5.js, both variants) and the app's one
// check path: every part, header pin, circuit, failure and assembly step the content names must exist on the board it
// belongs to and do what the prose says, and every lesson's code must pass its own checks (runHeadless +
// evaluateChecks) while an empty program must not.
import { describe, expect, it } from 'vitest';
import type { BuildStep, FailureMode, Lesson } from '@/content/schema';
import { BOARDS } from '@/content/ids';
import { defaultParams, renderTemplate, resolveText } from '@/lib/boardlab/template';
import { lessonJob, runChecks, stateMatches } from '@/lib/interp';
import en from '@/i18n/content/en/boards/pi4-pi5.json';
import { buildFigure, loadFigure } from '../../../figures/engine/testkit.mjs';
import board from './pi4-pi5';

const text = (key: string): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
  if (typeof v !== 'string') throw new Error(`missing text ${key}`);
  return v;
};
const code = (lesson: Lesson, values: Record<string, string | number> = {}): string =>
  resolveText(renderTemplate(lesson.code.source, lesson.params, { ...defaultParams(lesson.params), ...values }).code, text);

type Part = { id: string; short: string; name: string; pins?: string[]; group?: string; fixed?: boolean };
type Report = Record<string, unknown> & {
  status: string;
  fault: { id: string; kind: string; msg: string } | null;
  faults: string[];
  leds: Record<string, number>;
  rails: Record<string, number>;
  serial: { n: number; line: string } | null;
};

/** The built figure page in jsdom, driven the way the host drives it (set patches and toolbar presses). */
async function open(variant: string) {
  // the flat power sheet redraws much faster in jsdom than the 3D board, and the engine state is the same
  const page = await loadFigure(buildFigure('boards/pi4-pi5'), { path: '/figures/boards/pi4-pi5.html', query: `variant=${variant}&view=power` });
  const B = page.bench;
  const doc = page.win.document;
  const report = () => B.report() as Report;
  const press = (id: string, choice?: string) => {
    const button = [...doc.querySelectorAll<HTMLElement>('.act[data-id]')].find((e) => e.dataset.id === id);
    if (!button) throw new Error(`${variant}: no button ${id}`);
    const wrap = button.closest('.stepwrap');
    if (choice === undefined || !wrap?.classList.contains('open')) button.click();
    if (choice === undefined) return;
    const chip = wrap && [...wrap.querySelectorAll<HTMLElement>('.chip')].find((e) => e.dataset.id === choice);
    if (!chip) throw new Error(`${variant}: no choice ${choice} in ${id}`);
    chip.click();
  };
  const send = (step: Pick<BuildStep, 'action'>) => {
    if (step.action?.type === 'set') B.accept(step.action.state);
    else if (step.action?.type === 'press') press(step.action.id, step.action.choice);
  };
  const fail = (f: FailureMode) => {
    if (f.figure.type !== 'set') throw new Error(`no set failure ${f.id}`);
    B.accept({ power: null, fault: null });
    B.accept({ power: 'usbc', ...f.figure.state });
    B.advance(1.5);
    return report();
  };
  const parts = B.md.parts as Part[];
  return { ...page, B, md: B.md, parts, report, press, send, fail };
}

const VARIANTS = board.variants.map((v) => v.figureVariant);

describe('pi4-pi5 content against its figure', () => {
  it('matches its ids.ts entry and names the variants like the figure does', async () => {
    expect(BOARDS['pi4-pi5'].languages).toEqual([...new Set(board.lessons.map((l) => l.language))]);
    for (const v of board.variants) {
      const page = await open(v.figureVariant);
      expect(page.md.def.name).toBe(v.name);
      page.close();
    }
  });

  it('names only parts one of the two boards draws, with the pill text the first board prints', async () => {
    const drawn = new Map<string, Map<string, Part>>();
    for (const variant of VARIANTS) {
      const page = await open(variant);
      drawn.set(variant, new Map(page.parts.map((p) => [p.id, p])));
      page.close();
    }
    const either = new Set([...drawn.values()].flatMap((m) => [...m.keys()]));
    expect([...either].filter((id) => !board.figure.parts.some((p) => p.id === id))).toEqual([]);
    for (const p of board.figure.parts) {
      const first = VARIANTS.map((v) => drawn.get(v)!.get(p.id)).find(Boolean);
      expect(first, p.id).toBeDefined();
      expect(first!.short, p.id).toBe(p.short);
    }
    for (const v of board.variants) {
      const own = drawn.get(v.figureVariant)!;
      for (const l of v.leds ?? board.leds) expect([...own.keys()], `${v.id} ${l.id}`).toContain(l.id);
      for (const c of v.controls ?? board.controls) expect([...own.keys()], `${v.id} ${c.id}`).toContain(c.id);
      for (const i of (v.power ?? board.power).inputs) expect([...own.keys()]).toContain(i.part);
    }
  });

  it('matches the 40-pin header pin for pin on both boards', async () => {
    const rows = board.pinout.filter((r) => r.header === 'J8').sort((a, b) => Number(a.pin) - Number(b.pin));
    expect(rows.map((r) => r.pin)).toEqual(Array.from({ length: 40 }, (_, i) => String(i + 1)));
    for (const variant of VARIANTS) {
      const page = await open(variant);
      expect(page.md.byId.J8.pins, variant).toEqual(rows.map((r) => r.net));
      page.close();
    }
    expect(rows.filter((r) => r.label.startsWith('GPIO')).every((r) => r.volts === 3.3 && r.fiveVoltTolerant === false && r.maxCurrentMa === 16)).toBe(true);
    expect(rows.filter((r) => r.label.startsWith('GPIO')).map((r) => r.label).sort()).toEqual(Array.from({ length: 28 }, (_, i) => `GPIO${i}`).sort());
  });

  it('has a figure circuit for every lesson, with the parts its callouts and inputs name', async () => {
    const page = await open('pi5');
    const circuits = page.md.circuits as Record<string, { parts: { id: string }[] }>;
    for (const l of board.lessons) {
      expect(l.circuit, l.id).not.toBeNull();
      expect(Object.keys(circuits), l.id).toContain(l.circuit);
      const here = new Set([...board.figure.parts.map((p) => p.id), ...circuits[l.circuit!].parts.map((p) => p.id)]);
      for (const c of l.callouts) expect([...here], `${l.id} callout`).toContain(c.part);
      for (const i of l.world.inputs) expect([...here], `${l.id} input`).toContain(i.part);
      // a circuit part never shares an id with a board part, or select and faults would hit both
      for (const p of circuits[l.circuit!].parts) expect(page.md.byId[p.id], `${l.circuit} ${p.id}`).toBeUndefined();
    }
    page.close();
  });

  it('runs the same programs the assembly steps pick', async () => {
    const page = await open('pi5');
    const choices = page.B.choices() as Record<string, string[] | null>;
    for (const step of board.assembly) {
      if (step.action?.type !== 'press') continue;
      expect(Object.keys(choices), step.id).toContain(step.action.id);
      if (step.action.choice !== undefined) expect(choices[step.action.id], step.id).toContain(step.action.choice);
    }
    page.close();
  });
});

describe('pi4-pi5 failures in the figure', () => {
  it('has at least five failures, of the kinds a Pi really suffers', () => {
    expect(board.failures.length).toBeGreaterThanOrEqual(5);
    const kinds = new Set(board.failures.map((f) => f.kind));
    for (const k of ['reverse-polarity', 'wrong-voltage', 'brownout', 'cold-solder', 'missing-part', 'short', 'level-mismatch'] as const) expect(kinds).toContain(k);
  });

  for (const variant of VARIANTS) {
    it(`${variant}: every failure changes what the figure reports, the way its effect says`, async () => {
      const page = await open(variant);
      const healthy = page.fail({ ...board.failures[0], figure: { type: 'set', state: {} } });
      expect(healthy.status).toBe('running');
      for (const f of board.failures) {
        const r = page.fail(f);
        const where = `${variant} ${f.id}: ${r.status} ${r.fault?.msg ?? ''} ${JSON.stringify(r.faults)}`;
        expect(r.faults.length + (r.fault ? 1 : 0) + (r.power !== 'usbc' ? 1 : 0), where).toBeGreaterThan(0);
        if (f.effect.power === 'resetting') expect(r.status, where).toBe('brownout');
        else if (f.effect.halts && f.effect.power === 'off') expect(['no-power', 'fault'], where).toContain(r.status);
        // no card or no RAM: powered, but the SoC has nothing to boot
        else if (f.effect.halts) expect(['powered', 'fault'], where).toContain(r.status);
        else expect(r.status, where).toBe('running');
        if (variant === 'pi5') for (const part of f.effect.damages ?? []) expect(r.fault?.msg, where).toContain(page.md.byId[part].name);
      }
      page.close();
    });
  }

  it('a phone charger flags under-voltage: the health check prints the bits, and the Pi 4 PWR LED goes out', async () => {
    for (const variant of VARIANTS) {
      const page = await open(variant);
      const weak = board.failures.find((f) => f.id === 'weak-charger')!;
      page.fail(weak);
      page.B.accept({ mode: 'health' });
      const lines = new Set<string>();
      for (let i = 0; i < 16; i++) {
        page.B.advance(0.5);
        const s = page.report().serial;
        if (s) lines.add(s.line);
      }
      expect([...lines], variant).toEqual(expect.arrayContaining(['throttled=0x50005', 'hwmon hwmon1: Undervoltage detected!']));
      if (variant === 'pi4') expect(page.report().leds.D3).toBe(0);
      page.B.accept({ power: null, fault: null });
      page.B.accept({ power: 'usbc', mode: 'health' });
      page.B.advance(1);
      if (variant === 'pi4') expect(page.report().leds.D3).toBe(1);
      page.close();
    }
  });

  it('a cold joint on pin 11 drops GPIO17 while blink.py runs on', async () => {
    const page = await open('pi5');
    page.B.accept({ power: null, fault: null });
    page.B.accept({ power: 'usbc', mode: 'blink' });
    const dark = () => {
      let n = 0;
      for (let t = 0; t < 6; t += 0.05) {
        page.B.advance(0.05);
        const o = page.B.outputs() as { pins: Record<string, number> };
        if (page.B.st.t % 2 > 0.05 && page.B.st.t % 2 < 0.95 && !o.pins.GPIO17) n++;
      }
      return n;
    };
    expect(dark()).toBe(0);
    page.B.accept({ fault: 'cold:J8.11' });
    expect(page.report().status).toBe('running');
    expect(dark()).toBeGreaterThan(0);
    page.close();
  });
});

describe('pi4-pi5 assembly', () => {
  for (const variant of VARIANTS) {
    it(`${variant}: the steps complete in order from the panel's own commands`, async () => {
      const page = await open(variant);
      for (const step of board.assembly) {
        expect(Object.keys(step.done).length, step.id).toBeGreaterThan(0);
        page.send(step);
        let done = false;
        for (let i = 0; i < 60 && !done; i++) {
          page.B.advance(0.5);
          done = stateMatches(page.report(), step.done);
        }
        const r = page.report();
        expect(done, `${variant} ${step.id}: ${JSON.stringify({ build: r.build, status: r.status, mode: r.mode, tasks: r.tasks, rails: r.rails, why: r.why })}`).toBe(true);
      }
      expect(page.notes()).toEqual([]);
      expect(page.errors).toEqual([]);
      page.close();
    }, 30_000);
  }
});

describe('pi4-pi5 lessons through the app check path', () => {
  it('runs at least four lessons on both boards, from GPIO basics to a ROS 2 node', () => {
    expect(board.lessons.length).toBeGreaterThanOrEqual(4);
    expect(board.lessons.map((l) => l.n)).toEqual(board.lessons.map((_, i) => i + 1));
    for (const l of board.lessons) expect(l.variants, l.id).toEqual([]);
    for (const level of ['io', 'input', 'analog', 'protocol']) expect(board.lessons.some((l) => l.level === level), level).toBe(true);
  });

  it('names only its own lesson keys in each lesson (a lesson page ships only the prose of that lesson)', () => {
    for (const l of board.lessons) {
      const owners = new Set([...JSON.stringify(l).matchAll(/lessons\.([a-z0-9-]+)\./g)].map((m) => m[1]));
      expect([...owners], l.id).toEqual([l.id]);
    }
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

  it('wires every lesson pin to a header pin', () => {
    const labels = new Set(board.pinout.map((r) => r.label));
    for (const l of board.lessons) for (const p of l.pins) expect([...labels], `${l.id} ${p.pin}`).toContain(p.pin);
    for (const w of board.wireables) for (const c of w.connections) expect([...labels], `${w.part} ${c.from}`).toContain(c.to);
  });

  for (const l of board.lessons) {
    for (const variant of VARIANTS) {
      it(`lesson ${l.n} (${l.id}) on the ${variant}: the code passes its checks and prints its samples; an empty program fails`, () => {
        const { trace, results } = runChecks(lessonJob(board, l, code(l), variant));
        expect(trace.error).toBeNull();
        const failed = l.checks.filter((_, i) => !results[i].ok).map((c) => text(c.label));
        expect(failed, trace.serial.slice(0, 8).map((s) => s.text).join('\n')).toEqual([]);
        for (const sample of l.serial.sample) expect(trace.serial.map((s) => s.text), `${l.id} sample`).toContain(sample);
        expect(runChecks(lessonJob(board, l, 'pass\n', variant)).results.every((r) => r.ok)).toBe(false);
      }, 60_000);
    }
  }

  it('passes at every value each chip offers: the checks follow the code', () => {
    for (const l of board.lessons) {
      for (const p of l.params) {
        const values = p.kind === 'choice' ? p.options.map((o) => o.value)
          : p.kind === 'number' ? Array.from({ length: Math.round((p.max - p.min) / p.step) + 1 }, (_, i) => Math.round((p.min + i * p.step) * 100) / 100) : [];
        for (const v of values) {
          const { results } = runChecks(lessonJob(board, l, code(l, { [p.id]: v })));
          expect(l.checks.filter((_, i) => !results[i].ok).map((c) => text(c.label)), `${l.id} ${p.id}=${v}`).toEqual([]);
        }
      }
    }
  }, 120_000);

  it('counts every bounce as a press with bounce_time=None', () => {
    const button = board.lessons.find((l) => l.id === 'button')!;
    const presses = (bounce: string) => runChecks(lessonJob(board, button, code(button, { bounce }))).trace.serial.filter((s) => s.text.startsWith('pressed')).length;
    expect(presses('50')).toBe(2);
    expect(presses('none')).toBeGreaterThan(2);
  });

  it('refuses RPi.GPIO on the Pi 5 and points at gpiozero', () => {
    const blink = board.lessons.find((l) => l.id === 'blink')!;
    const { trace } = runChecks(lessonJob(board, blink, 'import RPi.GPIO as GPIO\nGPIO.setmode(GPIO.BCM)\n', 'pi5'));
    expect(trace.error?.message).toMatch(/gpiozero/);
  });
});
