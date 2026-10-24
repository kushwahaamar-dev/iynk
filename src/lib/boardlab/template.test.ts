import { describe, expect, it } from 'vitest';
import type { ParamChip } from '@/content/schema';
import { applyChip, copyText, mapChips, normalizeParams, renderTemplate, resolveText, setParam } from './template';
import { createBoardLabStore, figureState, initialState } from './store';

const PARAMS: ParamChip[] = [
  { id: 'pin', kind: 'choice', label: 'p.pin', default: 'd13', options: [{ value: 'd13', code: 'LED_BUILTIN', label: 'o.13' }, { value: 'd9', code: '9', label: 'o.9', figureValue: 9 }], figure: { part: 'LED1', key: 'pin' } },
  { id: 'ms', kind: 'number', label: 'p.ms', default: 1000, min: 50, max: 5000, step: 50, unit: 'ms' },
  { id: 'from', kind: 'number', label: 'p.from', default: 0, min: 0, max: 180, step: 1, keepApart: { param: 'to', op: '<', gap: 5 } },
  { id: 'to', kind: 'number', label: 'p.to', default: 180, min: 0, max: 180, step: 1 },
  { id: 'pull', kind: 'toggle', label: 'p.pull', default: false, code: { on: 'INPUT_PULLUP', off: 'INPUT' } },
];

const SRC = '// {{t:lessons.blink.code.setup}}\nvoid setup() { pinMode({{p:pin}}, OUTPUT); pinMode(2, {{p:pull}}); }\nvoid loop() { delay({{p:ms}}); }\n';

describe('templates', () => {
  it('fills text and param slots and records where the chips are', () => {
    const src = resolveText(SRC, (k) => (k === 'lessons.blink.code.setup' ? 'runs once' : 'x'));
    const { code, chips } = renderTemplate(src, PARAMS, normalizeParams(PARAMS, {}));
    expect(code).toContain('// runs once');
    expect(code).toContain('pinMode(LED_BUILTIN, OUTPUT)');
    expect(code).toContain('delay(1000)');
    for (const c of chips) expect(code.slice(c.from, c.to)).toBe({ pin: 'LED_BUILTIN', ms: '1000', pull: 'INPUT' }[c.id]);
  });

  it('re-validates saved values: clamps, snaps to the step, drops bad options and types', () => {
    const v = normalizeParams(PARAMS, { pin: 'd99', ms: 7777, from: 'x', pull: 'yes', to: 3 });
    expect(v.pin).toBe('d13');
    expect(v.ms).toBe(5000);
    expect(v.pull).toBe(false);
    // keepApart: from must stay at least 5 below to.
    expect((v.to as number) - (v.from as number)).toBeGreaterThanOrEqual(5);
    expect(normalizeParams(PARAMS, { ms: 1234 }).ms).toBe(1250);
  });

  it('pushes the other value when a keepApart pair would cross', () => {
    let v = normalizeParams(PARAMS, {});
    v = setParam(PARAMS, v, 'from', 178);
    expect(v.from).toBe(175);
    expect(v.to).toBe(180);
    v = setParam(PARAMS, v, 'to', 20);
    expect(v.to).toBe(20);
    expect(v.from).toBe(15);
  });

  it('keeps chip positions across free edits and drops chips the edit touched', () => {
    const { code, chips } = renderTemplate(SRC, PARAMS, normalizeParams(PARAMS, {}));
    const edited = code.replace('void loop()', '// a note\nvoid loop()');
    const moved = mapChips(chips, code, edited);
    const ms = moved.find((c) => c.id === 'ms')!;
    expect(edited.slice(ms.from, ms.to)).toBe('1000');
    const broken = edited.replace('delay(1000)', 'delay(10x0)');
    expect(mapChips(moved, edited, broken).some((c) => c.id === 'ms')).toBe(false);
    const next = applyChip(edited, moved, PARAMS[1], 250);
    expect(next.code).toContain('delay(250)');
    const pin = next.chips.find((c) => c.id === 'pin')!;
    expect(next.code.slice(pin.from, pin.to)).toBe('LED_BUILTIN');
  });

  it('copies real blank lines without bidi marks', () => {
    expect(copyText('a‏\r\n\r\nb')).toBe('a\n\nb');
  });
});

describe('store', () => {
  const init = () => initialState({ board: 'uno-r3', lesson: 'blink', language: 'arduino-cpp', template: SRC, params: PARAMS, savedValues: { ms: 500 } });

  it('re-renders untouched code when a chip changes, and patches edited code in place', () => {
    const store = createBoardLabStore(init());
    expect(store.getState().code).toContain('delay(500)');
    store.dispatch({ type: 'param/set', id: 'ms', value: 2000 });
    expect(store.getState().code).toContain('delay(2000)');
    store.dispatch({ type: 'code/replace', code: store.getState().code.replace('OUTPUT', 'OUTPUT /* mine */') });
    store.dispatch({ type: 'param/set', id: 'pin', value: 'd9' });
    expect(store.getState().code).toContain('pinMode(9, OUTPUT /* mine */)');
    store.dispatch({ type: 'code/reset' });
    expect(store.getState().code).not.toContain('mine');
    expect(store.getState().edited).toBe(false);
  });

  it('ignores stale run messages and clears the monitor on a new run', () => {
    const store = createBoardLabStore(init());
    store.dispatch({ type: 'serial/append', lines: [{ kind: 'out', text: 'old', t: 1 }] });
    store.dispatch({ type: 'run/start' });
    expect(store.getState().serial.lines).toEqual([]);
    const id = store.getState().run.id;
    store.dispatch({ type: 'run/phase', id: id - 1, status: 'running' });
    expect(store.getState().run.status).toBe('compiling');
    store.dispatch({ type: 'run/phase', id, status: 'uploading' });
    expect(store.getState().run.status).toBe('uploading');
  });

  it('derives the figure state from the store, chips with a figure target included', () => {
    const store = createBoardLabStore(init());
    store.dispatch({ type: 'param/set', id: 'pin', value: 'd9' });
    store.dispatch({ type: 'view/set', view: 'schematic' });
    const fig = figureState(store.getState(), {
      circuit: 'blink',
      failures: [{ id: 'bo', kind: 'brownout', trigger: { by: 'load', rail: '5V', ma: 800 }, figure: { type: 'set', state: { fault: 'brownout' } }, effect: { power: 'resetting', halts: true }, title: 't', symptom: 's', explanation: 'e', fix: 'f' }],
    });
    expect(fig).toMatchObject({ view: 'schematic', circuit: 'blink', params: { LED1: { pin: 9 } }, fault: null });
    store.dispatch({ type: 'fault/trigger', id: 'bo' });
    expect(figureState(store.getState(), { circuit: 'blink', failures: [{ id: 'bo', kind: 'brownout', trigger: { by: 'load', rail: '5V', ma: 800 }, figure: { type: 'set', state: { fault: 'brownout' } }, effect: { power: 'resetting', halts: true }, title: 't', symptom: 's', explanation: 'e', fix: 'f' }] }).fault).toBe('brownout');
  });
});
