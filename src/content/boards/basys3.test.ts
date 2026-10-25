// @vitest-environment node
// The Basys 3 content against its built figure (figures/boards/basys3.js) and the app's one check path: every part,
// header pin, circuit, failure and assembly step the content names must exist in the figure and do what the prose
// says, and every lesson's Verilog must pass its own checks (runHeadless + evaluateChecks) while an empty design fails.
import { describe, expect, it } from 'vitest';
import type { BuildStep, FailureMode, Lesson } from '@/content/schema';
import { BOARDS } from '@/content/ids';
import { defaultParams, renderTemplate, resolveText } from '@/lib/boardlab/template';
import { lessonJob, runChecks, stateMatches } from '@/lib/interp';
import en from '@/i18n/content/en/boards/basys3.json';
import { buildFigure, loadFigure } from '../../../figures/engine/testkit.mjs';
import board from './basys3';

const text = (key: string): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
  if (typeof v !== 'string') throw new Error(`missing text ${key}`);
  return v;
};
const code = (lesson: Lesson, values: Record<string, string | number> = {}): string =>
  resolveText(renderTemplate(lesson.code.source, lesson.params, { ...defaultParams(lesson.params), ...values }).code, text);
const EMPTY = 'module top();\nendmodule\n';

type Part = { id: string; short: string; name: string; pins?: string[] };
type Report = Record<string, unknown> & { status: string; fault: { msg: string } | null; faults: string[]; leds: Record<string, number> };

/** The built figure in jsdom, driven the way the host drives it (set patches and toolbar presses). */
async function open() {
  const page = await loadFigure(buildFigure('boards/basys3'), { path: '/figures/boards/basys3.html', query: 'view=power' });
  const B = page.bench;
  const doc = page.win.document;
  const report = () => B.report() as Report;
  const press = (id: string, choice?: string) => {
    const button = [...doc.querySelectorAll<HTMLElement>('.act[data-id]')].find((e) => e.dataset.id === id);
    if (!button) throw new Error(`no button ${id}`);
    const wrap = button.closest('.stepwrap');
    if (choice === undefined || !wrap?.classList.contains('open')) button.click();
    if (choice === undefined) return;
    const chip = wrap && [...wrap.querySelectorAll<HTMLElement>('.chip')].find((e) => e.dataset.id === choice);
    if (!chip) throw new Error(`no choice ${choice} in ${id}`);
    chip.click();
  };
  const send = (step: Pick<BuildStep, 'action'>) => {
    if (step.action?.type === 'set') B.accept(step.action.state);
    else if (step.action?.type === 'press') press(step.action.id, step.action.choice);
  };
  const fail = (f: Pick<FailureMode, 'figure'>) => {
    if (f.figure.type !== 'set') throw new Error('not a set failure');
    B.accept({ power: null, fault: null });
    B.accept({ power: 'usb', ...f.figure.state });
    B.advance(1.5);
    return report();
  };
  return { ...page, B, md: B.md, parts: B.md.parts as Part[], report, send, fail };
}

/** Every status the figure shows over `n` tenths of a second. */
function statuses(page: Awaited<ReturnType<typeof open>>, n: number): string[] {
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) { page.B.advance(0.1); seen.add(page.report().status); }
  return [...seen];
}

describe('basys3 content against its figure', () => {
  it('matches its ids.ts entry: languages, title and palette', async () => {
    expect(BOARDS.basys3.languages).toEqual(['verilog']);
    expect(board.lessons.every((l) => l.language === 'verilog')).toBe(true);
    const page = await open();
    expect(page.md.def.name).toBe(text('title'));
    expect(page.md.def.pal).toBe(BOARDS.basys3.palette);
    expect(board.power.brownoutVolts).toBe(page.md.def.power.mcu.min);
    page.close();
  });

  it('names exactly the parts the figure draws, with the pill text it prints', async () => {
    const page = await open();
    const drawn = new Map(page.parts.map((p) => [p.id, p]));
    expect(board.figure.parts.map((p) => p.id).sort()).toEqual([...drawn.keys()].sort());
    for (const p of board.figure.parts) expect(drawn.get(p.id)!.short, p.id).toBe(p.short);
    for (const l of board.leds) expect([...drawn.keys()]).toContain(l.id);
    for (const c of board.controls) expect([...drawn.keys()]).toContain(c.id);
    for (const i of board.power.inputs) expect([...drawn.keys()]).toContain(i.part);
    for (const d of board.displays) expect([...drawn.keys()]).toContain(d.id);
    page.close();
  });

  it('matches the Pmod ports and the EXT header pin for pin', async () => {
    const page = await open();
    for (const header of ['JA', 'JB', 'JC', 'JXADC', 'J6']) {
      const rows = board.pinout.filter((r) => r.header === header).sort((a, b) => Number(a.pin) - Number(b.pin));
      expect(rows.map((r) => r.pin), header).toEqual(rows.map((_, i) => String(i + 1)));
      expect(rows.map((r) => r.net), header).toEqual(page.md.byId[header].pins);
    }
    page.close();
  });

  it('puts every signal on its own FPGA ball and every lesson port on a board net', () => {
    const balls = board.pinout.filter((r) => r.fpgaPin).map((r) => r.fpgaPin);
    expect(new Set(balls).size).toBe(balls.length);
    const nets = new Set(board.pinout.map((r) => r.net));
    for (const l of board.lessons) for (const [port, map] of Object.entries(l.code.ports ?? {})) for (const n of map) expect([...nets], `${l.id} ${port}`).toContain(n);
  });

  it('has a figure circuit for every lesson that wires one, with the parts its callouts and inputs name', async () => {
    const page = await open();
    const circuits = page.md.circuits as Record<string, { parts: { id: string }[] }>;
    for (const l of board.lessons) {
      const extra = l.circuit ? circuits[l.circuit]?.parts.map((p) => p.id) : [];
      expect(extra, `${l.id} circuit ${l.circuit}`).toBeDefined();
      const here = new Set([...board.figure.parts.map((p) => p.id), ...extra!]);
      for (const c of l.callouts) expect([...here], `${l.id} callout`).toContain(c.part);
      for (const i of l.world.inputs) expect([...here], `${l.id} input`).toContain(i.part);
    }
    page.close();
  });

  it('wires every lesson pin and wireable to a pin the board has', () => {
    const labels = new Set([...board.pinout.map((r) => r.label), ...board.pinout.map((r) => r.header)]);
    for (const l of board.lessons) for (const p of l.pins) expect([...labels], `${l.id} ${p.pin}`).toContain(p.pin);
    for (const w of board.wireables) for (const c of w.connections) expect([...labels], `${w.part} ${c.from}`).toContain(c.to);
  });
});

describe('basys3 failures in the figure', () => {
  it('has at least five failures, of the kinds a Basys 3 really suffers', () => {
    expect(board.failures.length).toBeGreaterThanOrEqual(5);
    const kinds = new Set(board.failures.map((f) => f.kind));
    for (const k of ['reverse-polarity', 'wrong-voltage', 'brownout', 'short', 'missing-part', 'cold-solder'] as const) expect(kinds).toContain(k);
  });

  it('every failure changes what the figure reports, the way its effect says', async () => {
    const page = await open();
    expect(page.fail({ figure: { type: 'set', state: {} } }).status).toBe('running');
    for (const f of board.failures) {
      const r = page.fail(f);
      const where = `${f.id}: ${r.status} ${r.fault?.msg ?? ''} ${JSON.stringify(r.faults)}`;
      expect(r.faults.length + (r.fault ? 1 : 0), where).toBeGreaterThan(0);
      // a sagging rail dips in and out of reset, so watch it for a few seconds
      if (f.effect.power === 'resetting') expect(statuses(page, 40), where).toContain('brownout');
      else if (f.effect.halts && f.effect.power === 'off') expect(['no-power', 'fault'], where).toContain(r.status);
      else if (f.effect.halts) expect(['powered', 'fault'], where).toContain(r.status);
      else expect(r.status, where).toBe('running');
      for (const part of f.effect.damages ?? []) expect(r.fault?.msg, where).toContain(page.md.byId[part].name);
    }
    page.close();
  });

  it('a cold joint on SW0 makes LD0 flicker by itself in the factory demo', async () => {
    const page = await open();
    const seen = (fault: string | null) => {
      page.B.accept({ power: null, fault: null });
      page.B.accept({ power: 'usb', mode: 'gpio', fault });
      const levels = new Set<number>();
      for (let i = 0; i < 60; i++) { page.B.advance(0.1); levels.add(page.report().leds.LD0); }
      return levels;
    };
    expect([...seen(null)]).toEqual([0]);
    expect([...seen('cold:SW0')].sort()).toEqual([0, 1]);
    page.close();
  });
});

describe('basys3 assembly', () => {
  it('runs the programs the assembly steps pick', async () => {
    const page = await open();
    const choices = page.B.choices() as Record<string, string[] | null>;
    for (const step of board.assembly) {
      if (step.action?.type !== 'press') continue;
      expect(Object.keys(choices), step.id).toContain(step.action.id);
      if (step.action.choice !== undefined) expect(choices[step.action.id], step.id).toContain(step.action.choice);
    }
    page.close();
  });

  it('the steps complete in order from the panel\'s own commands', async () => {
    const page = await open();
    for (const step of board.assembly) {
      expect(Object.keys(step.done).length, step.id).toBeGreaterThan(0);
      page.send(step);
      let done = false;
      for (let i = 0; i < 60 && !done; i++) {
        page.B.advance(0.5);
        done = stateMatches(page.report(), step.done);
      }
      const r = page.report();
      expect(done, `${step.id}: ${JSON.stringify({ build: r.build, status: r.status, mode: r.mode, missing: r.missing, leds: r.leds })}`).toBe(true);
    }
    expect(page.notes()).toEqual([]);
    expect(page.errors).toEqual([]);
    page.close();
  });
});

describe('basys3 lessons through the app check path', () => {
  it('runs at least four Verilog lessons, from gates to a multiplexed display', () => {
    expect(board.lessons.length).toBeGreaterThanOrEqual(4);
    expect(board.lessons.map((l) => l.n)).toEqual(board.lessons.map((_, i) => i + 1));
    for (const level of ['intro', 'io', 'input', 'analog', 'project']) expect(board.lessons.some((l) => l.level === level), level).toBe(true);
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

  for (const l of board.lessons) {
    it(`lesson ${l.n} (${l.id}): the code passes its checks; an empty design fails`, () => {
      const { trace, results } = runChecks(lessonJob(board, l, code(l)));
      expect(trace.error).toBeNull();
      expect(l.checks.filter((_, i) => !results[i].ok).map((c) => text(c.label))).toEqual([]);
      expect(runChecks(lessonJob(board, l, EMPTY)).results.every((r) => r.ok)).toBe(false);
    });
  }

  for (const l of board.lessons.filter((x) => x.params.length > 0)) {
    it(`lesson ${l.id} passes at every value each chip offers: the checks follow the code`, () => {
      for (const p of l.params) {
        const values = p.kind === 'number' ? Array.from({ length: Math.round((p.max - p.min) / p.step) + 1 }, (_, i) => p.min + i * p.step)
          : p.kind === 'choice' ? p.options.map((o) => o.value) : [];
        for (const v of values) {
          const { results } = runChecks(lessonJob(board, l, code(l, { [p.id]: v })));
          expect(l.checks.filter((_, i) => !results[i].ok).map((c) => text(c.label)), `${l.id} ${p.id}=${v}`).toEqual([]);
        }
      }
    }, 120_000);
  }

  it('catches a counter without a debouncer: each bouncing press counts more than once', () => {
    const counter = board.lessons.find((l) => l.id === 'counter')!;
    const raw = `module top #(parameter CLK_HZ = 100_000_000) (input clk, input btnC, input btnU, output [15:0] led);
  reg [1:0] s = 2'b00;
  reg [15:0] n = 0;
  always @(posedge clk) begin
    s <= {s[0], btnC};
    if (btnU) n <= 0;
    else if (s[0] & ~s[1]) n <= n + 1;
  end
  assign led = n;
endmodule
`;
    const { trace, results } = runChecks(lessonJob(board, counter, raw));
    expect(trace.error).toBeNull();
    expect(results.every((r) => r.ok)).toBe(false);
  });
});
