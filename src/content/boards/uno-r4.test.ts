// @vitest-environment node
// The UNO R4's content against its built figure (figures/boards/uno-r4.js, both variants) and the app's one check
// path. Every part, header pin, circuit, failure and assembly step the content names must exist in the variant it
// belongs to and do what the prose says, and every lesson's code must pass its own checks (runHeadless +
// evaluateChecks) while an empty sketch must not.
import { describe, expect, it } from 'vitest';
import board from './uno-r4';
import en from '@/i18n/content/en/boards/uno-r4.json';
import type { BuildStep, FailureMode, Lesson } from '@/content/schema';
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

type Report = Record<string, unknown> & {
  status: string;
  boot: string | null;
  fault: { id: string; kind: string; msg: string } | null;
  faults: string[];
  leds: Record<string, number>;
  serial: { n: number; line: string } | null;
  meas?: Record<string, { state?: string }>;
};

/** The built figure page in jsdom, driven the way the host drives it (set patches and toolbar presses). */
async function open(variant: string) {
  // the flat power sheet redraws about 35 times faster in jsdom than the 3D board, and the engine state is the same
  const page = await loadFigure(buildFigure('boards/uno-r4'), { path: '/figures/boards/uno-r4.html', query: `variant=${variant}&view=power` });
  const B = page.bench;
  const doc = page.win.document;
  const report = () => B.report() as Report;
  /** The host's `press` (figures/engine/embed.js): click the toolbar button, then its choice chip. */
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
  /** A failure's state as the failure panel sends it, on a board just plugged in (a restart samples the straps). */
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
  /** An LED over `seconds` of figure time against what the Blink mode drives (1 s on, 1 s off): the on-board L LED,
   *  or the breadboard LED on D13, which a cold header joint reaches through the socket. */
  const missedBlinks = (seconds: number, on: 'DL4' | 'LED1' = 'DL4') => {
    let missed = 0;
    for (let t = 0; t < seconds; t += 0.05) {
      B.advance(0.05);
      const lit = on === 'DL4' ? report().leds.DL4 !== 0 : report().meas?.LED1?.state === 'ok';
      if (B.st.t % 2 < 0.95 && B.st.t % 2 > 0.05 && !lit) missed++;
    }
    return missed;
  };
  return { ...page, B, md: B.md, report, press, send, plugIn, fail, missedBlinks };
}

const VARIANTS = board.variants.map((v) => v.figureVariant);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The variants a failure exists on: every net, part and source its figure state names is on that board. */
function onVariant(f: FailureMode, md: Awaited<ReturnType<typeof open>>['md']): boolean {
  if (f.figure.type !== 'set') return false;
  const { power, fault } = f.figure.state as { power?: string | null; fault?: string | null };
  if (power && !(power in md.power.sources)) return false;
  if (!fault) return true;
  const [kind, a, b] = fault.split(':');
  if (kind === 'short') return [a, b].every((net) => net in md.netPins);
  if (kind === 'missing' || kind === 'reversed') return a in md.byId;
  if (kind === 'cold') return a in md.pins;
  if (kind === 'reverse-polarity' || kind === 'wrong-voltage') return a in md.power.sources;
  return md.def.faults.includes(fault);
}

describe('uno-r4 content against its figure', () => {
  it('names only parts one of the two boards draws, and each board draws its own LEDs, controls and displays', async () => {
    const drawn = new Map<string, Set<string>>();
    for (const variant of VARIANTS) {
      const page = await open(variant);
      drawn.set(variant, new Set(page.md.parts.map((p: { id: string }) => p.id)));
      page.close();
    }
    const either = new Set([...drawn.values()].flatMap((s) => [...s]));
    for (const p of board.figure.parts) expect([...either], p.id).toContain(p.id);
    for (const v of board.variants) {
      const own = drawn.get(v.figureVariant)!;
      for (const l of v.leds ?? board.leds) expect([...own], `${v.id} ${l.id}`).toContain(l.id);
      for (const d of v.displays ?? board.displays) expect([...own], `${v.id} ${d.id}`).toContain(d.id);
      for (const c of board.controls) expect([...own], `${v.id} ${c.id}`).toContain(c.id);
    }
    // the power inputs name the Minima's connectors (the WiFi's USB-C is J1 and its jack J5; the page lists one set)
    for (const input of board.power.inputs.filter((i) => i.connector !== 'header-pin')) expect([...drawn.get('minima')!], input.id).toContain(input.part);
    expect([...drawn.get('minima')!]).not.toContain('M1');
    expect([...drawn.get('wifi')!]).toEqual(expect.arrayContaining(['M1', 'U_LEDMATRIX', 'J6', 'JOFF']));
  });

  it('matches the figure headers pin for pin', async () => {
    const headers: [string, string[], string][] = [
      ['JANALOG', ['JANALOG_P', 'JANALOG_A'], 'minima'],
      ['JDIGITAL', ['JDIGITAL_H', 'JDIGITAL_L'], 'minima'],
      ['ICSP', ['J1'], 'minima'],
      ['SWD', ['J2'], 'minima'],
      ['ESP', ['J6'], 'wifi'],
      ['JOFF', ['JOFF'], 'wifi'],
    ];
    const pages = new Map<string, Awaited<ReturnType<typeof open>>>();
    for (const variant of VARIANTS) pages.set(variant, await open(variant));
    for (const [header, parts, variant] of headers) {
      const md = pages.get(variant)!.md;
      const drawnPins = parts.flatMap((id) => (md.byId[id].pins as string[]).map((n) => n || 'NC'));
      const rows = board.pinout.filter((r) => r.header === header).sort((a, b) => Number(a.pin) - Number(b.pin)).map((r) => r.net);
      // the digital header counts from D0 at the right; the figure lists every header left to right
      expect(header === 'JDIGITAL' ? [...drawnPins].reverse() : drawnPins, header).toEqual(rows);
    }
    expect(pages.get('wifi')!.md.byId.J3.pins).toEqual(pages.get('minima')!.md.byId.J1.pins);
    for (const page of pages.values()) page.close();
  });

  it('has a figure circuit for every wired lesson, keyed by the lesson id, with the parts its callouts and inputs name', async () => {
    const page = await open('minima');
    const circuits = page.md.circuits as Record<string, { parts: { id: string }[] }>;
    expect(board.lessons).toHaveLength(7);
    expect(board.lessons.filter((l) => l.circuit == null).map((l) => l.id)).toEqual(['wifi', 'matrix']);
    for (const l of board.lessons) {
      if (l.circuit != null) {
        expect(l.circuit).toBe(l.id);
        expect(Object.keys(circuits)).toContain(l.id);
      }
      const here = new Set([...board.figure.parts.map((p) => p.id), ...(l.circuit ? circuits[l.circuit].parts.map((p) => p.id) : [])]);
      for (const c of l.callouts) expect([...here], `${l.id} callout`).toContain(c.part);
      for (const i of l.world.inputs) expect([...here], `${l.id} input`).toContain(i.part);
      for (const p of l.params) if ('figure' in p && p.figure) expect([...here], `${l.id} chip`).toContain(p.figure.part);
    }
    page.close();
  });

  it('runs the wifi and matrix lessons on the WiFi only, and the rest on both boards', () => {
    expect(board.variants.map((v) => v.id)).toEqual(['minima', 'wifi']);
    for (const l of board.lessons) expect(l.variants, l.id).toEqual(l.id === 'wifi' || l.id === 'matrix' ? ['wifi'] : []);
  });
});

describe('uno-r4 failures in the figure', () => {
  it('every failure exists on at least one board, and one that exists only on the WiFi says so', async () => {
    const pages = await Promise.all(VARIANTS.map(open));
    for (const f of board.failures) {
      const on = VARIANTS.filter((_, i) => onVariant(f, pages[i].md));
      expect(on.length, f.id).toBeGreaterThan(0);
      if (on.length === 1 && on[0] === 'wifi') expect(text(f.title), f.id).toMatch(/WiFi/);
    }
    expect(VARIANTS.filter((_, i) => onVariant(board.failures.find((f) => f.id === 'esp-download-strap')!, pages[i].md))).toEqual(['wifi']);
    for (const page of pages) page.close();
  });

  for (const variant of VARIANTS) {
    it(`${variant}: every failure changes what the figure reports, the way its effect says`, async () => {
      const page = await open(variant);
      expect(Object.keys(page.md.power.sources)).toEqual(expect.arrayContaining(board.power.inputs.map((i) => i.id)));
      expect(page.plugIn().status).toBe('running');
      for (const f of board.failures.filter((x) => onVariant(x, page.md))) {
        const r = page.fail(f.id);
        const where = `${variant} ${f.id}: ${r.status} ${r.fault?.msg ?? ''}`;
        expect(r.faults.length + (r.fault ? 1 : 0), where).toBeGreaterThan(0);
        if (f.effect.power === 'resetting') expect(r.status, where).toBe('brownout');
        else if (f.effect.halts && f.effect.power === 'off') expect(['no-power', 'fault'], where).toContain(r.status);
        else if (f.effect.halts) expect(r.status, where).toBe('fault');
        else expect(r.status, where).toBe('running');
        if (f.effect.power === 'off' && !f.effect.damages) expect(r.leds.DL3, where).toBe(0);
        for (const part of f.effect.damages ?? []) expect(r.fault?.msg, where).toContain(page.md.byId[part].name);
        if (f.kind === 'boot-strap') expect(r.boot, where).not.toBeNull();
      }
      page.close();
    });
  }

  it('BOOT low halts the RA4M1 in its ROM: ON lit, L dark, no Serial; freeing it and pressing RESET brings the sketch back', async () => {
    const page = await open('minima');
    const r = page.fail('boot-strap');
    expect([r.status, r.boot, r.fault?.kind, r.leds.DL3]).toEqual(['fault', 'rom', 'boot', 1]);
    expect(page.missedBlinks(4)).toBeGreaterThan(30);
    page.B.accept({ fault: null });
    page.press('ctl-pb1');
    await sleep(320);
    page.B.advance(1);
    expect([page.report().status, page.report().boot]).toEqual(['running', null]);
    expect(page.missedBlinks(4)).toBe(0);
    page.close();
  });

  it('ESP_DOWNLOAD low on the WiFi keeps the sketch running but stops Serial and refuses uploads', async () => {
    const page = await open('wifi');
    page.B.accept({ power: 'usb', mode: 'hello' });
    page.B.advance(2.5);
    const before = page.report().serial?.n ?? 0;
    expect(before).toBeGreaterThan(0);
    const r = page.fail('esp-download-strap');
    expect([r.status, r.boot, r.leds.DL3]).toEqual(['running', 'esp-download', 1]);
    const n = page.report().serial?.n ?? 0;
    page.B.advance(3);
    expect(page.report().serial?.n ?? 0).toBe(n);
    page.press('upload', 'heart');
    page.B.advance(4);
    expect(page.report().mode).toBe('hello');
    page.close();
  });

  it('a cold D13 header joint drops the breadboard LED\'s blinks while the sketch and the L LED run on', async () => {
    const page = await open('minima');
    page.plugIn({ circuit: 'blink' });
    expect(page.missedBlinks(6, 'LED1')).toBe(0);
    const r = page.fail('cold-d13');
    expect(r.status).toBe('running');
    expect(page.missedBlinks(6, 'LED1')).toBeGreaterThan(0);
    expect(page.missedBlinks(6)).toBe(0);
    page.close();
  });

  it('with no L3 the board is dead on the jack but runs on USB', async () => {
    const page = await open('minima');
    expect(page.fail('missing-inductor').status).toBe('no-power');
    page.B.accept({ power: 'usb' });
    page.B.advance(1);
    expect([page.report().status, page.report().leds.DL3]).toEqual(['running', 1]);
    page.close();
  });
});

describe('uno-r4 assembly', () => {
  for (const variant of VARIANTS) {
    it(`${variant}: the steps complete in order from the panel's own commands`, async () => {
      const page = await open(variant);
      const choices = page.B.choices() as Record<string, string[] | null>;
      for (const step of board.assembly ?? []) {
        if (step.action?.type === 'press') {
          expect(Object.keys(choices), step.id).toContain(step.action.id);
          if (step.action.choice !== undefined) expect(choices[step.action.id], step.id).toContain(step.action.choice);
        }
      }
      for (const step of board.assembly ?? []) {
        page.send(step);
        await sleep(step.action?.type === 'press' && step.action.id.startsWith('ctl-') ? 320 : 0);
        let done = false;
        for (let i = 0; i < 60 && !done; i++) {
          page.B.advance(0.5);
          done = stateMatches(page.report(), step.done);
        }
        expect(done, `${variant} ${step.id}: ${JSON.stringify({ build: page.report().build, status: page.report().status, missing: page.report().missing })}`).toBe(true);
      }
      expect(page.notes()).toEqual([]);
      expect(page.errors).toEqual([]);
      page.close();
    });
  }
});

describe('uno-r4 lessons through the app check path', () => {
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

  it('blink passes at every delay the chip offers: the check follows the code', () => {
    const blink = lesson('blink');
    const wait = blink.params.find((p) => p.id === 'wait')!;
    if (wait.kind !== 'number') throw new Error('wait is a number chip');
    for (let ms = wait.min; ms <= wait.max; ms += wait.step) {
      expect(runChecks(lessonJob(board, blink, code(blink, { wait: ms }))).results.every((r) => r.ok), `${ms} ms`).toBe(true);
    }
  });

  it('the address and network chips with a warning note fail the way the note says', () => {
    const i2c = runChecks(lessonJob(board, lesson('i2c-scan'), code(lesson('i2c-scan'), { address: '0x69' })));
    expect(i2c.trace.serial.map((s) => s.text)).toEqual(expect.arrayContaining(['Found a device at 0x68', 'No answer']));
    const wifi = runChecks(lessonJob(board, lesson('wifi'), code(lesson('wifi'), { ssid: 'Workshop-5G' })));
    expect(wifi.trace.serial.map((s) => s.text).some((s) => s.startsWith('Connected'))).toBe(false);
    expect(wifi.results.every((r) => r.ok)).toBe(false);
  });

  it('prints the ADC reading at the resolution the chip picks', () => {
    const pot = lesson('pot-pwm');
    const first = (bits: string) => runChecks(lessonJob(board, pot, code(pot, { bits }))).trace.serial[0]?.text;
    expect([first('10'), first('12'), first('14')]).toEqual(['A1 = 256  1.25 V', 'A1 = 1024  1.25 V', 'A1 = 4096  1.25 V']);
  });
});
