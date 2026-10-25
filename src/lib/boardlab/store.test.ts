import { describe, expect, it } from 'vitest';
import type { ParamChip } from '@/content/schema';
import uno from '@/content/boards/uno-r3';
import { figurePatch, figureSrc, figureState, initialState, reducer, type BoardLabState } from './store';

const PARAMS: ParamChip[] = [
  { id: 'ms', kind: 'number', label: 'p.ms', default: 1000, min: 50, max: 5000, step: 50, unit: 'ms' },
];
const SRC = 'void loop() { delay({{p:ms}}); }\n';

const fresh = (lesson = 'blink') =>
  initialState({ board: 'uno-r3', lesson, language: 'arduino-cpp', template: SRC, params: PARAMS, inputs: { btn: 0 }, view: 'breadboard' });

/** The host's state as it arrives through the room: plain JSON. */
const wire = (s: BoardLabState): unknown => JSON.parse(JSON.stringify(s));

describe('joining a room', () => {
  it("takes the host's code, chips and build, and keeps its own run, pins and checks", () => {
    let host = fresh();
    host = reducer(host, { type: 'param/set', id: 'ms', value: 250 });
    host = reducer(host, { type: 'code/replace', code: `// mine\n${host.code}` });
    host = reducer(host, { type: 'power/set', source: 'barrel' });
    host = reducer(host, { type: 'fault/trigger', id: 'short-5v' });
    host = reducer(host, { type: 'input/set', id: 'btn', value: 1 });
    host = reducer(host, { type: 'view/set', view: 'schematic' });
    host = reducer(host, { type: 'assembly/done', id: 'usb' });
    host = reducer(host, { type: 'run/start' });
    host = reducer(host, { type: 'checks/result', results: [{ ok: true }] });

    const joiner = reducer(fresh(), { type: 'sync/hydrate', state: wire(host) });
    expect(joiner.code).toBe(host.code);
    expect(joiner.chips).toEqual(host.chips);
    expect(joiner.code.slice(joiner.chips[0].from, joiner.chips[0].to)).toBe('250');
    expect(joiner.edited).toBe(true);
    expect(joiner.values).toEqual({ ms: 250 });
    expect([joiner.power, joiner.fault, joiner.view, joiner.inputs.btn, joiner.assembly]).toEqual(['barrel', 'short-5v', 'schematic', 1, ['usb']]);
    // The joiner's own interpreter starts the run (store-sync dispatches run/start after this).
    expect(joiner.run.status).toBe('stopped');
    expect(joiner.checks.status).toBe('idle');
  });

  it('ignores another lesson of the same board, and junk', () => {
    const own = fresh('button');
    expect(reducer(own, { type: 'sync/hydrate', state: wire(fresh()) })).toBe(own);
    expect(reducer(own, { type: 'sync/hydrate', state: null })).toBe(own);
    const odd = reducer(own, { type: 'sync/hydrate', state: { ...wire(own) as object, view: 'moon', values: { ms: 99999 }, chips: [{ id: 'x', from: 0, to: 9e9 }] } });
    expect(odd.view).toBe('breadboard');
    expect(odd.values).toEqual({ ms: 5000 });
    expect(odd.edited).toBe(false);
  });
});

describe('figureState', () => {
  const lessonState = (id: string) => {
    const lesson = uno.lessons.find((l) => l.id === id)!;
    const s = initialState({ board: 'uno-r3', lesson: id, language: 'arduino-cpp', template: lesson.code.source, params: lesson.params, view: 'breadboard' });
    return { s, opts: { circuit: lesson.circuit, failures: uno.failures, inputs: lesson.world.inputs } };
  };

  it("sends each world input's value to its prop, the default until the learner moves it", () => {
    const { s, opts } = lessonState('light');
    expect(figureState(s, opts).params).toEqual({ LED1: { color: 'yellow' }, LAMP: { value: 50 } });
    const bright = reducer(s, { type: 'input/set', id: 'light', value: 800 });
    expect(figurePatch(figureState(s, opts), figureState(bright, opts))).toEqual({ params: { LED1: { color: 'yellow' }, LAMP: { value: 800 } } });
  });

  it("puts the value next to what the chips give the same prop", () => {
    const { s, opts } = lessonState('distance');
    const near = reducer(reducer(s, { type: 'param/set', id: 'obstacle', value: 'car' }), { type: 'input/set', id: 'distance', value: 12 });
    expect(figureState(near, opts).params).toMatchObject({ OBST: { kind: 'car', value: 12 } });
  });

  it('sends no input values without the lesson inputs (the board overview)', () => {
    const { s, opts } = lessonState('light');
    expect(figureState(s, { circuit: opts.circuit, failures: opts.failures }).params).toEqual({ LED1: { color: 'yellow' } });
  });
});

describe('figurePatch', () => {
  it('sends only what changed', () => {
    expect(figurePatch({ view: 'board', power: 'usb', fault: null }, { view: 'schematic', power: 'usb', fault: null })).toEqual({ view: 'schematic' });
    expect(figurePatch({ params: { R1: { ohms: 220 } } }, { params: { R1: { ohms: 220 } } })).toEqual({});
  });

  it("sends the sketch's tone() pitches by net, and {} once they stop", () => {
    const opts = { circuit: 'sound', failures: [] };
    let s = reducer(fresh(), { type: 'run/start' });
    s = reducer(s, { type: 'run/phase', id: s.run.id, status: 'running' });
    const quiet = figureState(s, opts);
    s = reducer(s, { type: 'run/tick', id: s.run.id, vt: 10, pins: { D8: { mode: 'output', value: 1, pwm: false, hz: 262 }, D13: { mode: 'output', value: 1, pwm: false } } });
    const playing = figureState(s, opts);
    expect(figurePatch(quiet, playing)).toEqual({ tones: { D8: 262 } });
    expect(figurePatch(playing, figureState(reducer(s, { type: 'run/stop' }), opts))).toEqual({ tones: {} });
  });

  it('sends a fault with the power it needs, even when the power did not change', () => {
    expect(figurePatch({ power: 'usb', fault: null }, { power: 'usb', fault: 'missing:Y2' })).toEqual({ power: 'usb', fault: 'missing:Y2' });
    expect(figurePatch({ power: 'usb', fault: 'missing:Y2' }, { power: 'usb', fault: null })).toEqual({ power: 'usb', fault: null });
  });

  it('picks the variant in the figure page, which draws its board once at load, and never in a patch', () => {
    expect(figureSrc('/figures/boards/uno-r4.html', 'wifi')).toBe('/figures/boards/uno-r4.html?variant=wifi');
    expect(figureSrc('/figures/boards/esp32-s3-devkitc-1.html', 'v1.0')).toBe('/figures/boards/esp32-s3-devkitc-1.html?variant=v1.0');
    expect(figureSrc('/figures/boards/uno-r3.html', null)).toBe('/figures/boards/uno-r3.html');
    const wifi = initialState({ board: 'uno-r4', lesson: null, variant: 'wifi', language: 'arduino-cpp', template: SRC, params: PARAMS });
    expect(figureState(wifi, { circuit: null, failures: [] })).not.toHaveProperty('variant');
  });
});
