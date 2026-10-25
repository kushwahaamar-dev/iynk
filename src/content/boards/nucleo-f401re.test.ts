// @vitest-environment node
// The Nucleo-F401RE's content against its built figure (figures/boards/nucleo-f401re.js) and the app's one check
// path. Every part, header pin, circuit, failure and assembly step the content names must exist in the figure and do
// what the prose says, and every lesson's code must pass its own checks (runHeadless + evaluateChecks) while an empty
// sketch must not.
import { describe, expect, it } from 'vitest';
import board from './nucleo-f401re';
import en from '@/i18n/content/en/boards/nucleo-f401re.json';
import type { BuildStep, Lesson } from '@/content/schema';
import { defaultParams, renderTemplate, resolveText } from '@/lib/boardlab/template';
import { lessonJob, runChecks, stateMatches } from '@/lib/interp';
import { buildFigure, loadFigure } from '../../../figures/engine/testkit.mjs';

const text = (key: string): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
  if (typeof v !== 'string') throw new Error(`missing text ${key}`);
  return v;
};

/** The lesson code as the editor shows it: the chips at `values` (default otherwise), English comments. */
const code = (lesson: Lesson, values: Record<string, string | number> = {}): string =>
  resolveText(renderTemplate(lesson.code.source, lesson.params, { ...defaultParams(lesson.params), ...values }).code, text);
const EMPTY = 'void setup() {\n}\n\nvoid loop() {\n}\n';
const lesson = (id: string): Lesson => board.lessons.find((l) => l.id === id)!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Report = Record<string, unknown> & {
  status: string;
  mode: string;
  build: string;
  missing: string[];
  fault: { id: string; kind: string; part: string; msg: string } | null;
  faults: string[];
  leds: Record<string, number>;
  rails: Record<string, number>;
  controls: Record<string, number>;
  meas?: Record<string, { state?: string }>;
  serial: { n: number; line: string } | null;
};

/** The built figure page in jsdom, driven the way the host drives it (set patches and toolbar presses). */
async function open() {
  // the flat power sheet redraws far faster in jsdom than the 3D board, and the engine state is the same
  const page = await loadFigure(buildFigure('boards/nucleo-f401re'), { path: '/figures/boards/nucleo-f401re.html', query: 'view=power' });
  const B = page.bench;
  const doc = page.win.document;
  const report = () => B.report() as Report;
  /** The host's `press` (figures/engine/embed.js): click the toolbar button, then its choice chip. */
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
  /** A failure's state as the failure panel sends it, on a board just plugged in. */
  const plugIn = (state: Record<string, unknown> = {}) => {
    B.accept({ power: null, fault: null });
    B.accept({ power: 'usb', ...state });
    B.advance(1.5);
    return report();
  };
  const fail = (id: string) => {
    const f = board.failures.find((x) => x.id === id);
    if (f?.figure.type !== 'set') throw new Error(`no set failure ${id}`);
    return plugIn(f.figure.state);
  };
  /** Reports sampled every 50 ms of figure time. */
  const sample = (seconds: number) => {
    const out: Report[] = [];
    for (let t = 0; t < seconds; t += 0.05) {
      B.advance(0.05);
      out.push(report());
    }
    return out;
  };
  /** LD2 against the factory demo's slow rate (0.5 s on, 0.5 s off): samples where it should be lit but is dark. */
  /** LD2, or the breadboard LED on D13, over `seconds` against the Blink program (0.5 s on, 0.5 s off). */
  const missedBlinks = (seconds: number, on: 'LD2' | 'LED1' = 'LD2') => {
    let missed = 0;
    for (let t = 0; t < seconds; t += 0.05) {
      B.advance(0.05);
      const phase = B.st.t % 1;
      const lit = on === 'LD2' ? report().leds.LD2 !== 0 : report().meas?.LED1?.state === 'ok';
      if (phase > 0.05 && phase < 0.45 && !lit) missed++;
    }
    return missed;
  };
  return { ...page, B, md: B.md, report, press, send, plugIn, fail, sample, missedBlinks };
}

describe('nucleo-f401re content against its figure', () => {
  it('names only parts the figure draws, and the figure draws every LED, control and power connector', async () => {
    const page = await open();
    const drawn = page.md.parts.map((p: { id: string }) => p.id);
    for (const p of board.figure.parts) expect(drawn, p.id).toContain(p.id);
    for (const l of board.leds) expect(drawn, l.id).toContain(l.id);
    for (const c of board.controls) expect(drawn, c.id).toContain(c.id);
    for (const i of board.power.inputs) expect(drawn, i.id).toContain(i.part);
    expect(Object.keys(page.md.power.sources)).toEqual(board.power.inputs.map((i) => i.id));
    for (const r of board.power.rails) expect(Object.keys(page.md.power.rails), r.name).toContain(r.name);
    page.close();
  });

  it('matches the figure headers pin for pin', async () => {
    const page = await open();
    for (const header of ['CN5', 'CN6', 'CN7', 'CN8', 'CN9', 'CN10', 'CN4']) {
      const drawnPins = (page.md.byId[header].pins as string[]).map((n) => n || 'NC');
      const rows = board.pinout.filter((r) => r.header === header).sort((a, b) => Number(a.pin) - Number(b.pin)).map((r) => r.net);
      expect(drawnPins, header).toEqual(rows);
    }
    page.close();
  });

  it('marks the analog inputs as not 5 V tolerant and every other GPIO as tolerant', () => {
    for (const r of board.pinout.filter((x) => x.caps.includes('digital'))) {
      expect(r.fiveVoltTolerant, `${r.header}.${r.pin}`).toBe(!r.caps.includes('analog-in'));
    }
    expect(board.pinout.find((r) => r.label === 'PC13')?.maxCurrentMa).toBe(3);
  });

  it('has a figure circuit for every lesson, keyed by the lesson id, with the parts its callouts, inputs and chips name', async () => {
    const page = await open();
    const circuits = page.md.circuits as Record<string, { parts: { id: string }[] }>;
    expect(board.lessons.length).toBeGreaterThanOrEqual(4);
    const labels = new Set(board.pinout.map((r) => r.label));
    for (const l of board.lessons) {
      expect(l.circuit).toBe(l.id);
      expect(Object.keys(circuits)).toContain(l.id);
      const here = new Set([...board.figure.parts.map((p) => p.id), ...circuits[l.id].parts.map((p) => p.id)]);
      for (const c of l.callouts) expect([...here], `${l.id} callout`).toContain(c.part);
      for (const i of l.world.inputs) expect([...here], `${l.id} input`).toContain(i.part);
      for (const p of l.params) if ('figure' in p && p.figure) expect([...here], `${l.id} chip`).toContain(p.figure.part);
      for (const p of l.pins) expect([...labels], `${l.id} pin`).toContain(p.pin);
    }
    page.close();
  });
});

describe('nucleo-f401re failures in the figure', () => {
  // what each failure does to the board, as its prose says: status, the PWR and COM LEDs, the part it damages
  const expected: Record<string, { status: string | string[]; LD3: number; LD1: number; damages?: string }> = {
    'reverse-vin': { status: 'fault', LD3: 0, LD1: 0, damages: 'U3' },
    'vin-overvoltage': { status: 'fault', LD3: 0, LD1: 0, damages: 'U3' },
    'reverse-e5v': { status: 'fault', LD3: 0, LD1: 0, damages: 'U4' },
    'e5v-overvoltage': { status: 'fault', LD3: 1, LD1: 1, damages: 'U4' },
    'short-5v': { status: 'no-power', LD3: 0, LD1: 0 },
    'short-3v3': { status: 'no-power', LD3: 1, LD1: 1 },
    'jp6-off': { status: 'no-power', LD3: 1, LD1: 1 },
    'jp5-off': { status: 'no-power', LD3: 0, LD1: 1 },
    'cn2-off': { status: 'running', LD3: 1, LD1: 1 },
    'reversed-d4': { status: 'no-power', LD3: 0, LD1: 0 },
    'reversed-c16': { status: 'fault', LD3: 0, LD1: 0, damages: 'C16' },
  };

  it('starts running on every input it lists', async () => {
    const page = await open();
    for (const input of board.power.inputs) {
      const r = page.plugIn({ power: input.id });
      expect([input.id, r.status, r.leds.LD3, r.rails.VDD]).toEqual([input.id, 'running', 1, 3.3]);
    }
    page.close();
  });

  it('every failure changes what the figure reports, the way its prose says', async () => {
    const page = await open();
    expect(board.failures.length).toBeGreaterThanOrEqual(5);
    for (const f of board.failures) {
      const r = page.fail(f.id);
      expect(r.faults.length + (r.fault ? 1 : 0), f.id).toBeGreaterThan(0);
      const want = expected[f.id];
      if (!want) continue; // the time-varying ones have their own tests below
      const where = `${f.id}: ${r.status} ${r.fault?.msg ?? ''}`;
      expect([r.status, r.leds.LD3, r.leds.LD1], where).toEqual([want.status, want.LD3, want.LD1]);
      if (want.damages) expect(r.fault?.msg, where).toContain(page.md.byId[want.damages].name);
      expect(f.effect.damages ?? [], where).toEqual(want.damages ? [want.damages] : []);
      expect(f.effect.halts, where).toBe(want.status !== 'running');
    }
    page.close();
  });

  it('3V3 shorted or JP6 off leaves +5V up but the MCU unpowered; JP5 off kills +5V while the ST-LINK runs', async () => {
    const page = await open();
    let r = page.fail('short-3v3');
    expect([r.rails['5V'], r.rails['3V3'], r.rails.VDD]).toEqual([5, 0, 0]);
    r = page.fail('jp6-off');
    expect([r.rails['3V3'], r.rails.VDD, r.missing]).toEqual([3.3, 0, ['JP6_CAP']]);
    r = page.fail('jp5-off');
    expect([r.rails['3V3_ST'], r.rails['5V']]).toEqual([3.3, 0]);
    page.close();
  });

  it('CN2 caps off: the sketch runs on but uploads are refused', async () => {
    const page = await open();
    page.fail('cn2-off');
    page.press('upload', 'hello');
    page.B.advance(5);
    expect([page.report().status, page.report().mode]).toEqual(['running', 'blink']);
    page.plugIn();
    page.press('upload', 'hello');
    page.B.advance(5);
    expect([page.report().status, page.report().mode]).toEqual(['running', 'hello']);
    page.close();
  });

  it('a servo on 5V browns the MCU out again and again', async () => {
    const page = await open();
    page.fail('brownout');
    const statuses = new Set(page.sample(6).map((r) => r.status));
    expect(statuses).toContain('brownout');
    page.close();
  });

  it('a cracked USB joint cuts the power off and on', async () => {
    const page = await open();
    page.fail('cold-usb');
    const reports = page.sample(6);
    expect(reports.some((r) => r.status === 'no-power' && r.leds.LD1 === 0)).toBe(true);
    expect(reports.some((r) => r.status === 'running')).toBe(true);
    page.close();
  });

  it('a cold D13 joint drops the breadboard LED\'s blinks while the sketch and LD2 run on', async () => {
    const page = await open();
    page.plugIn({ circuit: 'blink' });
    expect(page.missedBlinks(6, 'LED1')).toBe(0);
    const r = page.fail('cold-d13');
    expect(r.status).toBe('running');
    expect(page.missedBlinks(6, 'LED1')).toBeGreaterThan(0);
    expect(page.missedBlinks(6)).toBe(0);
    page.close();
  });
});

describe('nucleo-f401re built-in programs and controls', () => {
  it('the factory demo blinks LD2 and B1 makes it blink faster', async () => {
    const page = await open();
    page.plugIn();
    const edges = (seconds: number) => {
      let n = 0;
      let last = page.report().leds.LD2;
      for (const r of page.sample(seconds)) {
        if (r.leds.LD2 === 1 && last === 0) n++;
        last = r.leds.LD2;
      }
      return n;
    };
    const slow = edges(4);
    page.press('ctl-b1');
    await sleep(320);
    const fast = edges(4);
    expect(slow).toBeGreaterThanOrEqual(3);
    expect(fast).toBeGreaterThan(slow);
    page.close();
  });

  it('the button program lights LD2 while B1 is held, and B2 holds the STM32 in reset', async () => {
    const page = await open();
    page.plugIn();
    page.press('upload', 'button');
    page.B.advance(5);
    expect([page.report().mode, page.report().leds.LD2]).toEqual(['button', 0]);
    page.B.accept({ press: { id: 'B1', down: true } });
    page.B.advance(0.2);
    expect(page.report().leds.LD2).toBe(1);
    page.B.accept({ press: { id: 'B1', down: false } });
    page.B.accept({ press: { id: 'B2', down: true } });
    page.B.advance(0.2);
    expect([page.report().status, page.report().leds.LD3]).toEqual(['reset', 1]);
    page.B.accept({ press: { id: 'B2', down: false } });
    page.B.advance(1);
    expect(page.report().status).toBe('running');
    page.close();
  });
});

describe('nucleo-f401re assembly', () => {
  it("completes in order from the panel's own commands", async () => {
    const page = await open();
    const choices = page.B.choices() as Record<string, string[] | null>;
    for (const step of board.assembly) {
      if (step.action?.type === 'press') {
        expect(Object.keys(choices), step.id).toContain(step.action.id);
        if (step.action.choice !== undefined) expect(choices[step.action.id], step.id).toContain(step.action.choice);
      }
    }
    for (const step of board.assembly) {
      page.send(step);
      await sleep(step.action?.type === 'press' && step.action.id.startsWith('ctl-') ? 320 : 0);
      let done = false;
      for (let i = 0; i < 60 && !done; i++) {
        page.B.advance(0.5);
        done = stateMatches(page.report(), step.done);
      }
      expect(done, `${step.id}: ${JSON.stringify({ build: page.report().build, status: page.report().status, missing: page.report().missing })}`).toBe(true);
    }
    expect(page.notes()).toEqual([]);
    expect(page.errors).toEqual([]);
    page.close();
  }, 30_000);
});

describe('nucleo-f401re lessons through the app check path', () => {
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
    it(`lesson ${l.n} (${l.id}): the code passes its checks and prints its sample lines; an empty sketch fails`, () => {
      const { trace, results } = runChecks(lessonJob(board, l, code(l)));
      expect(trace.error).toBeNull();
      const failed = l.checks.filter((_, i) => !results[i].ok).map((c) => text(c.label));
      expect(failed, trace.serial.slice(0, 8).map((s) => s.text).join('\n')).toEqual([]);
      for (const sample of l.serial.sample) expect(trace.serial.map((s) => s.text), `${l.id} sample`).toContain(sample);
      expect(runChecks(lessonJob(board, l, EMPTY)).results.every((r) => r.ok)).toBe(false);
    });
  }

  it('blink passes at every delay the chips offer: the check follows the code', () => {
    const blink = lesson('blink');
    const on = blink.params.find((p) => p.id === 'on')!;
    if (on.kind !== 'number') throw new Error('on is a number chip');
    for (let ms = on.min; ms <= on.max; ms += on.step) {
      expect(runChecks(lessonJob(board, blink, code(blink, { on: ms, off: ms }))).results.every((r) => r.ok), `${ms} ms`).toBe(true);
    }
  });

  it('reads the knob at the resolution the chip picks and still passes', () => {
    const ub = lesson('user-button');
    const run = (bits: string) => runChecks(lessonJob(board, ub, code(ub, { bits })));
    const twelve = run('12');
    const ten = run('10');
    expect([twelve.trace.serial[0]?.text, ten.trace.serial[0]?.text]).toEqual(['A0=2048 (1.65 V) B1=UP', 'A0=512 (1.65 V) B1=UP']);
    expect(ten.results.every((r) => r.ok)).toBe(true);
  });

  it('uses STM32duino names the interpreter knows, and 115200 baud everywhere', () => {
    for (const l of board.lessons) {
      expect(l.serial.baud, l.id).toBe(115200);
      if (/Serial\.begin/.test(l.code.source)) expect(l.code.source, l.id).toContain('Serial.begin(115200)');
    }
    expect(lesson('user-button').code.source).toContain('USER_BTN');
  });
});
