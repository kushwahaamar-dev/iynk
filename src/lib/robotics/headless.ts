// A headless, deterministic run of a practice task on src/lib/interp's createRun: the world script
// drives the inputs at their virtual times and the result is a RunTrace (src/content/schema.ts).
// Same input, same trace (D14c). Replace with src/lib/interp's own headless run once it exports one
// (docs/requests/ui-robotics.md).

import type { BoardId } from "@/content/ids";
import type { Language, PinMode, RunTrace, WorldInput, WorldModel } from "@/content/schema";
import { createRun, resolvePin, type BoardProfile, type DeviceKind, type PinView, type Run } from "@/lib/interp";

const LANGUAGE = { "arduino-cpp": "arduino", micropython: "python", python: "python", verilog: "verilog" } as const;
const CHUNK_MS = 10;

export type HeadlessRequest = { board: BoardId; language: Language; source: string; world: WorldModel; runMs: number };

/** "D9", "GPIO2", "GP15", "P0", "A0", "13" -> the board's pin number. */
export function pinNumber(profile: BoardProfile, name: string): number | undefined {
  const direct = resolvePin(profile, name);
  if (direct !== undefined) return direct;
  const match = /^(?:D|GPIO|GP|P|IO)(\d+)$/i.exec(name.trim());
  return match ? Number(match[1]) : undefined;
}

type Action = { t: number; apply: (run: Run) => void };

function buttonLevel(device: Extract<WorldInput["device"], { kind: "button" }>, pressed: boolean): 0 | 1 | null {
  switch (device.pull) {
    case "external-down":
      return pressed ? 1 : 0;
    case "external-up":
      return pressed ? 0 : 1;
    case "internal-up":
      return pressed ? 0 : null;
    case "internal-down":
      return pressed ? 1 : null;
  }
}

function inputActions(input: WorldInput, value: number, t: number, previous: number | undefined, profile: BoardProfile): Action[] {
  const pins = input.pins.map((name) => pinNumber(profile, name));
  const pin = pins[0];
  const span = input.max - input.min || 1;
  const fraction = Math.min(1, Math.max(0, (value - input.min) / span));
  const device = input.device;
  switch (device.kind) {
    case "button": {
      if (pin === undefined) return [];
      const level = buttonLevel(device, value !== 0);
      const before = previous === undefined ? null : buttonLevel(device, previous !== 0);
      const out: Action[] = [];
      // A real contact chatters for bounceMs after it moves: new, old, new, old, new.
      if (previous !== undefined && previous !== value && device.bounceMs > 0) {
        const step = device.bounceMs / 4;
        [level, before, level, before].forEach((l, i) => out.push({ t: t + i * step, apply: (run) => run.input(pin, l) }));
        out.push({ t: t + device.bounceMs, apply: (run) => run.input(pin, level) });
      } else {
        out.push({ t, apply: (run) => run.input(pin, level) });
      }
      return out;
    }
    case "switch":
      return pin === undefined ? [] : [{ t, apply: (run) => run.input(pin, value !== 0 ? 1 : 0) }];
    case "pot":
      return pin === undefined ? [] : [{ t, apply: (run) => run.analog(pin, fraction * profile.logicV) }];
    case "linear":
      return pin === undefined ? [] : [{ t, apply: (run) => run.analog(pin, device.voltsAtMin + fraction * (device.voltsAtMax - device.voltsAtMin)) }];
    case "tmp36":
      return pin === undefined ? [] : [{ t, apply: (run) => run.analog(pin, 0.5 + 0.01 * value) }];
    default:
      return [];
  }
}

function timeline(world: WorldModel, profile: BoardProfile, ultrasonic: Map<string, { distanceCm: number }>): Action[] {
  const actions: Action[] = [];
  const last = new Map<string, number>();
  const byId = new Map(world.inputs.map((input) => [input.id, input]));
  const apply = (input: WorldInput, value: number, t: number) => {
    if (input.device.kind === "hc-sr04") {
      actions.push({ t, apply: () => { const s = ultrasonic.get(input.id); if (s) s.distanceCm = value; } });
    } else {
      actions.push(...inputActions(input, value, t, last.get(input.id), profile));
    }
    last.set(input.id, value);
  };
  for (const input of world.inputs) apply(input, input.default, 0);
  for (const event of [...world.script].sort((a, b) => a.t - b.t)) {
    const input = byId.get(event.input);
    if (input) apply(input, event.value, event.t);
  }
  return actions.map((action, i) => ({ action, i })).sort((a, b) => a.action.t - b.action.t || a.i - b.i).map((x) => x.action);
}

function viewEntry(view: PinView): { v: number; mode: PinMode } | null {
  if (view.servoUs !== undefined && view.servoUs > 0) return { v: Math.round(((view.servoUs - 544) * 180) / (2400 - 544)), mode: "servo" };
  if (view.hz !== undefined && view.hz > 0) return { v: view.hz, mode: "tone" };
  if (view.duty !== undefined) return { v: view.duty, mode: "pwm" };
  return null;
}

export function runHeadless(request: HeadlessRequest): RunTrace {
  const devices: DeviceKind[] = request.world.inputs.some((input) => input.device.kind === "mpu6050") ? ["mpu6050"] : [];
  const run = createRun({ board: request.board, language: LANGUAGE[request.language], source: request.source, devices });
  const trace: RunTrace = { ms: 0, error: null, serial: [], pins: {}, figure: [], inputs: [...request.world.script] };

  const first = run.diagnostics[0];
  if (first) return { ...trace, error: { line: first.line, message: first.message } };

  const nowMs = () => Math.round(run.world.now / 1000);
  let pending = "";
  const offs = [
    run.on("serial", (text) => {
      pending += text;
      let nl = pending.indexOf("\n");
      while (nl !== -1) {
        trace.serial.push({ t: nowMs(), text: pending.slice(0, nl).replace(/\r$/, "") });
        pending = pending.slice(nl + 1);
        nl = pending.indexOf("\n");
      }
    }),
    run.on("pins", (snapshot) => {
      for (const [pin, view] of Object.entries(snapshot.pins)) {
        const entry = viewEntry(view);
        if (!entry) continue;
        const list = (trace.pins[pin] ??= []);
        const prev = list.at(-1);
        if (!prev || prev.v !== entry.v || prev.mode !== entry.mode) list.push({ t: snapshot.t, ...entry });
      }
    }),
    run.on("error", (error) => {
      trace.error ??= { line: error.line, message: error.hint ? `${error.message} (${error.hint})` : error.message };
    }),
  ];

  const ultrasonic = new Map<string, { distanceCm: number }>();
  for (const input of request.world.inputs) {
    if (input.device.kind !== "hc-sr04") continue;
    const [trig, echo] = input.pins.map((name) => pinNumber(run.profile, name));
    if (trig !== undefined && echo !== undefined) ultrasonic.set(input.id, run.attachUltrasonic(trig, echo));
  }

  const actions = timeline(request.world, run.profile, ultrasonic);
  run.start();
  // Step in small chunks so inputs land at their virtual times; a finished or crashed program stops early.
  const advanceTo = (target: number) => {
    let guard = Math.ceil(target / CHUNK_MS) * 4 + 100;
    while (run.status.t < target && guard-- > 0 && !trace.error && (run.status.state === "running" || run.status.state === "sleeping")) {
      run.step(Math.min(CHUNK_MS, target - run.status.t));
    }
  };
  for (const action of actions) {
    if (action.t > request.runMs || trace.error) break;
    advanceTo(action.t);
    action.apply(run);
  }
  advanceTo(request.runMs);
  if (pending) trace.serial.push({ t: nowMs(), text: pending.replace(/\r$/, "") });

  // Digital levels from the world's exact edge trace.
  const finalPins = run.snapshot().pins;
  for (const [us, pin, level] of run.world.trace) {
    const mode: PinMode = finalPins[pin]?.mode === "output" ? "out" : "in";
    (trace.pins[String(pin)] ??= []).push({ t: us / 1000, v: level, mode });
  }
  for (const list of Object.values(trace.pins)) list.sort((a, b) => a.t - b.t);

  for (const off of offs) off();
  run.stop();
  return { ...trace, ms: Math.min(request.runMs, Math.round(run.status.t)) };
}
