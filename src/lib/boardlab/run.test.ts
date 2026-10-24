import { describe, expect, it } from 'vitest';
import type { Check, WorldModel } from '@/content/schema';
import type { FigureHandle } from '@/components/figure/protocol';
import { evaluateChecks } from './checks';
import { LessonRunner, runHeadless, type Scheduler } from './run';
import { createBoardLabStore, initialState } from './store';

const BLINK = `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Blink ready");
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("on");
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  Serial.println("off");
  delay(1000);
}
`;

const NO_WORLD: WorldModel = { inputs: [], script: [] };

/** A hand-driven clock: frames and timeouts run only when the test advances time. */
class FakeScheduler implements Scheduler {
  t = 0;
  private seq = 1;
  private frames = new Map<number, (now: number) => void>();
  private timers = new Map<number, { at: number; cb: () => void }>();
  now = () => this.t;
  frame = (cb: (now: number) => void) => {
    const id = this.seq++;
    this.frames.set(id, cb);
    return id;
  };
  cancelFrame = (id: number) => void this.frames.delete(id);
  timeout = (cb: () => void, ms: number) => {
    const id = this.seq++;
    this.timers.set(id, { at: this.t + ms, cb });
    return id;
  };
  clearTimeout = (id: number) => void this.timers.delete(id);
  /** Move real time forward in 16 ms frames, firing due timers and frames. */
  advance(ms: number) {
    const end = this.t + ms;
    while (this.t < end) {
      this.t = Math.min(end, this.t + 16);
      for (const [id, timer] of [...this.timers].sort((a, b) => a[1].at - b[1].at)) {
        if (timer.at <= this.t) {
          this.timers.delete(id);
          timer.cb();
        }
      }
      const frames = [...this.frames];
      this.frames.clear();
      for (const [, cb] of frames) cb(this.t);
    }
  }
}

function fakeFigure() {
  const sent: Record<string, unknown>[] = [];
  const handle = {
    send: (type: string, payload?: { state?: Record<string, unknown> }) => {
      if (type === 'set' && payload?.state) sent.push(payload.state);
    },
    observe: () => () => {},
    isReady: () => true,
    info: () => null,
    focus: () => {},
  } as unknown as FigureHandle;
  return { handle, sent };
}

describe('runHeadless', () => {
  it('toggles D13 every 1000 ms of virtual time and prints its lines', () => {
    const trace = runHeadless({ language: 'arduino-cpp', source: BLINK, board: 'uno-r3', world: NO_WORLD, runMs: 5000, logicV: 5 });
    expect(trace.error).toBeNull();
    const d13 = trace.pins.D13.filter((e) => e.mode === 'out');
    const highs = d13.filter((e) => e.v === 1).map((e) => e.t);
    const lows = d13.filter((e) => e.v === 0).map((e) => e.t);
    expect(highs.slice(0, 3)).toEqual([0, 2000, 4000]);
    expect(lows.slice(0, 2)).toEqual([1000, 3000]);
    expect(trace.serial.map((l) => l.text).slice(0, 4)).toEqual(['Blink ready', 'on', 'off', 'on']);
    expect(trace.serial[2].t).toBe(1000);
  });

  it('passes the Blink checks and fails them for a sketch that never toggles', () => {
    const checks: Check[] = [
      { kind: 'runs', minMs: 4000, label: 'checks.1' },
      { kind: 'pin-toggles', pin: 'D13', periodMs: [900, 1100], minCycles: 2, label: 'checks.2' },
      { kind: 'pin-level', pin: 'D13', level: 0, atMs: 1500, label: 'checks.3' },
      { kind: 'serial', match: '^o(n|ff)$', regex: true, minCount: 4, label: 'checks.4' },
      { kind: 'code', must: ['digitalWrite', 'delay('], mustNot: ['analogWrite'], label: 'checks.5' },
    ];
    const good = runHeadless({ language: 'arduino-cpp', source: BLINK, board: 'uno-r3', world: NO_WORLD, runMs: 5000, logicV: 5 });
    expect(evaluateChecks(checks, good, { source: BLINK }).map((r) => r.ok)).toEqual([true, true, true, true, true]);

    const stuck = BLINK.replace('digitalWrite(LED_BUILTIN, LOW);', '');
    const bad = runHeadless({ language: 'arduino-cpp', source: stuck, board: 'uno-r3', world: NO_WORLD, runMs: 5000, logicV: 5 });
    expect(evaluateChecks(checks, bad, { source: stuck })[1].ok).toBe(false);
  });

  it('reports a compile error with its line instead of running', () => {
    const broken = BLINK.replace('pinMode(LED_BUILTIN, OUTPUT);', 'pinMode(LED_BUILTIN, OUTPUT)');
    const trace = runHeadless({ language: 'arduino-cpp', source: broken, board: 'uno-r3', world: NO_WORLD, runMs: 1000, logicV: 5 });
    expect(trace.error).not.toBeNull();
    expect(trace.error!.line).toBeGreaterThan(0);
    expect(trace.ms).toBe(0);
  });

  it('feeds a scripted button press into digitalRead', () => {
    const source = `void setup() { pinMode(2, INPUT); pinMode(13, OUTPUT); }
void loop() { digitalWrite(13, digitalRead(2)); }`;
    const world: WorldModel = {
      inputs: [{ id: 'btn', quantity: 'button', device: { kind: 'button', pull: 'external-down', bounceMs: 0 }, pins: ['D2'], part: 'SW1', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'world.btn' }],
      script: [{ t: 500, input: 'btn', value: 1 }, { t: 900, input: 'btn', value: 0 }],
    };
    const trace = runHeadless({ language: 'arduino-cpp', source, board: 'uno-r3', world, runMs: 1200, logicV: 5 });
    const check: Check = { kind: 'responds', after: { t: 500, input: 'btn', value: 1 }, pin: 'D13', withinMs: 20, mode: 'out', v: [1, 1], label: 'x' };
    expect(evaluateChecks([check], trace, { source })[0].ok).toBe(true);
    const at = (t: number) => [...trace.pins.D13].reverse().find((e) => e.t <= t)?.v;
    expect(at(400)).toBe(0);
    expect(at(600)).toBe(1);
    expect(at(1100)).toBe(0);
  });
});

describe('LessonRunner', () => {
  function setup(reduceMotion = false) {
    const store = createBoardLabStore(initialState({ board: 'uno-r3', lesson: 'blink', language: 'arduino-cpp', template: BLINK }));
    const sched = new FakeScheduler();
    const figure = fakeFigure();
    let passed = 0;
    const runner = new LessonRunner({
      store,
      board: { id: 'uno-r3', name: 'Arduino Uno', logicV: 5 },
      lesson: { inputs: [], world: NO_WORLD, runMs: 4500, checks: [{ kind: 'pin-toggles', pin: 'D13', periodMs: [900, 1100], minCycles: 2, label: 'c' }] },
      resetControls: ['RESET'],
      figure: () => figure.handle,
      reduceMotion: () => reduceMotion,
      onPassed: () => passed++,
      scheduler: sched,
    });
    const detach = runner.attach();
    return { store, sched, figure, detach, passed: () => passed };
  }

  it('compiles, uploads, then drives the figure and the serial monitor', () => {
    const { store, sched, figure, passed } = setup();
    store.dispatch({ type: 'run/start' });
    expect(store.getState().run.status).toBe('compiling');
    sched.advance(620);
    expect(store.getState().run.status).toBe('uploading');
    sched.advance(620);
    expect(store.getState().run.status).toBe('running');
    expect(store.getState().serial.lines.filter((l) => l.kind === 'sys').map((l) => l.text)).toEqual(['upload.compiling', 'upload.uploading', 'upload.done']);
    // The check run happens right after the upload.
    sched.advance(20);
    expect(store.getState().checks.passed).toBe(true);
    expect(passed()).toBe(1);

    sched.advance(500);
    const pinSets = () => figure.sent.filter((s) => 'pins' in s).map((s) => (s.pins as Record<string, number>).D13);
    expect(pinSets()).toContain(1);
    sched.advance(1000);
    expect(pinSets().slice(-1)[0]).toBe(0);
    const out = store.getState().serial.lines.filter((l) => l.kind === 'out').map((l) => l.text);
    expect(out.slice(0, 3)).toEqual(['Blink ready', 'on', 'off']);
    // The figure never gets more than 30 pin updates a second.
    expect(figure.sent.filter((s) => 'pins' in s).length).toBeLessThanOrEqual(Math.ceil((sched.t / 1000) * 30));
  });

  it('stops: the LED goes dark and the monitor says so', () => {
    const { store, sched, figure } = setup(true);
    store.dispatch({ type: 'run/start' });
    sched.advance(100);
    expect(store.getState().run.status).toBe('running');
    sched.advance(300);
    store.dispatch({ type: 'run/stop' });
    expect(store.getState().run.status).toBe('stopped');
    const last = figure.sent.filter((s) => 'pins' in s).slice(-1)[0];
    expect(last).toEqual({ pins: { D13: 0 } });
    expect(store.getState().serial.lines.slice(-1)[0].text).toBe('upload.stopped');
  });

  it('cancels an upload that is stopped half way, without marking the lesson done', () => {
    const { store, sched, passed } = setup();
    store.dispatch({ type: 'run/start' });
    sched.advance(700);
    store.dispatch({ type: 'run/stop' });
    sched.advance(2000);
    expect(store.getState().run.status).toBe('stopped');
    expect(passed()).toBe(0);
  });

  it('refuses to run on an unplugged board', () => {
    const { store, sched } = setup();
    store.dispatch({ type: 'figure/state', state: { status: 'off' } });
    store.dispatch({ type: 'run/start' });
    sched.advance(2000);
    expect(store.getState().run.status).toBe('stopped');
    expect(store.getState().serial.lines.some((l) => l.text === 'refused.unplugged')).toBe(true);
  });

  it('holds the sketch in reset while RESET is pressed and restarts it at t = 0', () => {
    const { store, sched } = setup(true);
    store.dispatch({ type: 'run/start' });
    sched.advance(100);
    sched.advance(1500);
    expect(store.getState().run.vt).toBeGreaterThan(1000);
    store.dispatch({ type: 'figure/state', state: { status: 'running', controls: { RESET: 1 } } });
    sched.advance(300);
    store.dispatch({ type: 'figure/state', state: { status: 'running', controls: { RESET: 0 } } });
    sched.advance(100);
    expect(store.getState().run.vt).toBeLessThan(300);
    expect(store.getState().serial.lines.some((l) => l.text === 'upload.reset')).toBe(true);
  });

  it('shows a compile error and stays stopped', () => {
    const { store, sched } = setup(true);
    store.dispatch({ type: 'code/replace', code: BLINK.replace('delay(1000);', 'dely(1000);') });
    store.dispatch({ type: 'run/start' });
    sched.advance(500);
    const s = store.getState();
    expect(s.run.status).toBe('stopped');
    expect(s.run.error?.line).toBe(10);
    expect(s.serial.lines.some((l) => l.kind === 'err')).toBe(true);
  });
});
