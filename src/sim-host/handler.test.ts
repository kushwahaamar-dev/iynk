// @vitest-environment node
import { describe, expect, it } from "vitest";
import { WorkerError } from "@/protocol";
import type { DigitalLayer, PartState, ProgramImage, SimNetlist, SimRunOptions } from "@/sim/engine";
import { createInterpEngine } from "./engines/interp-engine";
import { createSimHandler, type SimHandlerDeps } from "./handler";
import type { SimEv, SimReq } from "./protocol";

const NET: SimNetlist = {
  version: 1,
  docHash: "test",
  nets: [{ id: "GND" }, { id: "D13" }],
  ground: "GND",
  parts: [{ id: "u1", descriptor: "uno-r3", params: {}, pins: {}, kind: "board" }],
  settings: { seed: 1, toleranceMode: "nominal", analog: { mode: "dc-event", stepNs: 1000 }, speed: 0 },
};

const BLINK = `void setup() { pinMode(13, OUTPUT); }
void loop() { digitalWrite(13, HIGH); delay(500); digitalWrite(13, LOW); delay(500); }
`;

const FAST = `void setup() { pinMode(13, OUTPUT); }
void loop() { digitalWrite(13, HIGH); delay(1); digitalWrite(13, LOW); delay(1); }
`;

const program = (text: string): ProgramImage => ({
  kind: "source",
  language: "arduino-cpp",
  files: [{ path: "main.ino", text }],
  entry: "main.ino",
});

const opts = (over: Partial<SimRunOptions> = {}): SimRunOptions => ({
  seed: 1,
  speed: 0,
  limits: { statements: Infinity, events: Infinity, outputBytes: Infinity },
  tier: "T1",
  endNs: 5_000_000_000,
  ...over,
});

class Led implements DigitalLayer {
  private level: 0 | 1 | "Z" | "X" = 0;
  load() {
    return [];
  }
  onPin(pin: string, level: 0 | 1 | "Z" | "X") {
    if (pin === "D13") this.level = level;
  }
  partStates(): PartState[] {
    return [{ part: "led1", kind: "led", lit: this.level === 1, brightness: this.level === 1 ? 1 : 0, provenance: "approximation", tier: "T0" }];
  }
  stateHash() {
    return String(this.level);
  }
}

function rig(over: Partial<SimHandlerDeps> = {}, wallStepMs = 1) {
  const tasks: Array<() => void> = [];
  let wall = 0;
  const events: SimEv[] = [];
  const handler = createSimHandler({
    diag: false,
    wallMs: () => (wall += wallStepMs),
    schedule: (fn) => void tasks.push(fn),
    makeEngine: (_program, _net, o) => createInterpEngine({ id: "u1", board: "uno-r3", language: "arduino", seed: o.seed }),
    makeDigital: () => new Led(),
    ...over,
  });
  const send = async (msg: SimReq) => handler(msg, (ev) => events.push(ev));
  const drain = (max = 100_000) => {
    let ran = 0;
    for (let task = tasks.shift(); task && ran < max; task = tasks.shift()) {
      task();
      ran++;
    }
    return ran;
  };
  const of = <T extends SimEv["t"]>(t: T) => events.filter((e): e is Extract<SimEv, { t: T }> => e.t === t);
  const lastState = () => of("state").at(-1)?.state;
  const load = (text = BLINK, o = opts()) => send({ t: "load", run: 1, net: NET, opts: o, program: program(text) });
  return { send, drain, tasks, events, of, lastState, load };
}

describe("sim handler", () => {
  it("loads, runs a 5 s blink to done and reports the pin and the led", async () => {
    const r = rig();
    expect(await r.load()).toEqual({ diagnostics: [] });
    expect(r.lastState()).toBe("idle");
    await r.send({ t: "control", run: 1, op: "run" });
    expect(r.lastState()).toBe("running");
    r.drain();
    expect(r.lastState()).toBe("done");
    const frames = r.of("frame");
    const last = frames.at(-1)!;
    expect(last.pins.D13).toBeDefined();
    expect(last.parts[0]).toMatchObject({ part: "led1", kind: "led" });
    expect(frames.some((f) => f.parts[0].kind === "led" && f.parts[0].lit)).toBe(true);
  });

  it("stops pumping slices when a slice yields and continues on the next pump", async () => {
    const r = rig({}, 6);
    await r.load();
    await r.send({ t: "control", run: 1, op: "run" });
    const pumps = r.drain();
    expect(pumps).toBeGreaterThan(1);
    expect(r.lastState()).toBe("done");
  });

  it("stop goes back to idle at time 0 and leaves nothing pumping", async () => {
    const r = rig();
    await r.load();
    await r.send({ t: "control", run: 1, op: "run" });
    r.drain(3);
    await r.send({ t: "control", run: 1, op: "stop" });
    expect(r.lastState()).toBe("idle");
    expect(r.of("state").at(-1)!.at).toBe(0);
    const before = r.events.length;
    r.drain();
    expect(r.events.length).toBe(before);
  });

  it("cancel stops pumping, sets idle and acks", async () => {
    const r = rig();
    await r.load();
    await r.send({ t: "control", run: 1, op: "run" });
    r.drain(2);
    await expect(r.send({ t: "control", run: 1, op: "cancel" })).resolves.toBeUndefined();
    expect(r.lastState()).toBe("idle");
    const before = r.events.length;
    r.drain();
    expect(r.events.length).toBe(before);
  });

  it("pause holds the run and run resumes it", async () => {
    const r = rig();
    await r.load();
    await r.send({ t: "control", run: 1, op: "run" });
    r.drain(2);
    await r.send({ t: "control", run: 1, op: "pause" });
    expect(r.lastState()).toBe("paused");
    r.drain();
    expect(r.lastState()).toBe("paused");
    await r.send({ t: "control", run: 1, op: "run" });
    r.drain();
    expect(r.lastState()).toBe("done");
  });

  it("run twice keeps one pump", async () => {
    const r = rig();
    await r.load();
    await r.send({ t: "control", run: 1, op: "run" });
    await r.send({ t: "control", run: 1, op: "run" });
    expect(r.tasks.length).toBe(1);
  });

  it("refuses diag stall unless the worker was made with diag", async () => {
    const r = rig();
    await expect(r.send({ t: "diag", op: "stall" })).rejects.toMatchObject({ kind: "bad_message" });
  });

  it("steps by ns and by event, and answers other units with a diagnostic", async () => {
    const r = rig();
    await r.load();
    await r.send({ t: "step", run: 1, unit: "ns", n: 2_000_000 });
    expect(r.of("state").at(-1)).toMatchObject({ state: "paused", at: 2_000_000 });
    const before = r.of("state").at(-1)!.at;
    await r.send({ t: "step", run: 1, unit: "event", n: 1 });
    expect(r.of("state").at(-1)!.at).toBeGreaterThanOrEqual(before);
    const reply = (await r.send({ t: "step", run: 1, unit: "statement", n: 1 })) as { diagnostics: Array<{ id: string }> };
    expect(reply.diagnostics.map((d) => d.id)).toEqual(["step-unit-unsupported"]);
  });

  it("rejects a step with n at or below 0", async () => {
    const r = rig();
    await r.load();
    const err: unknown = await r.send({ t: "step", run: 1, unit: "ns", n: 0 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WorkerError);
    expect(err).toMatchObject({ kind: "bad_message" });
  });

  it("posts at most 30 frames per simulated second", async () => {
    const r = rig();
    await r.load(FAST);
    await r.send({ t: "control", run: 1, op: "run" });
    r.drain();
    const frames = r.of("frame");
    expect(frames.length).toBeGreaterThan(100);
    expect(frames.length).toBeLessThanOrEqual(30 * 5 + 2);
  });

  it("splits a burst of serial lines over frames", async () => {
    const r = rig();
    await r.load(`void setup() { Serial.begin(2000000); for (int i = 0; i < 3000; i++) Serial.println(i); }\nvoid loop() { }\n`, opts({ endNs: 1_000_000_000 }));
    await r.send({ t: "control", run: 1, op: "run" });
    r.drain();
    const sizes = r.of("frame").map((f) => f.serial.length);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(500);
    expect(sizes.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(3000);
  });

  it("ignores a request for another run id", async () => {
    const r = rig();
    await r.load();
    expect(await r.send({ t: "control", run: 2, op: "run" })).toEqual({ ignored: true });
    expect(r.lastState()).toBe("idle");
    expect(r.tasks.length).toBe(0);
  });

  it("a new load replaces the run and drops the old pump", async () => {
    const r = rig();
    await r.load();
    await r.send({ t: "control", run: 1, op: "run" });
    await r.send({ t: "load", run: 2, net: NET, opts: opts(), program: program(BLINK) });
    r.drain();
    expect(r.lastState()).toBe("idle");
    expect(r.of("state").at(-1)!.run).toBe(2);
  });

  it("keeps idle after a compile error and refuses to run", async () => {
    const r = rig();
    const reply = (await r.load("void setup() { int x = ; }\nvoid loop() { }\n")) as { diagnostics: Array<{ id: string; severity: string }> };
    expect(reply.diagnostics.some((d) => d.id === "compile-error" && d.severity === "error")).toBe(true);
    expect(r.lastState()).toBe("idle");
    await expect(r.send({ t: "control", run: 1, op: "run" }).catch((e: unknown) => e)).resolves.toMatchObject({ kind: "bad_message" });
  });

  it("maps an interpreter limit to the limit state", async () => {
    const r = rig({ makeEngine: (_program, _net, o) => createInterpEngine({ id: "u1", board: "pico", language: "python", seed: o.seed }) });
    const python: ProgramImage = { kind: "source", language: "python", files: [{ path: "main.py", text: "x = [0] * 10**9\n" }], entry: "main.py" };
    await r.send({ t: "load", run: 1, net: NET, opts: opts({ endNs: undefined }), program: python });
    await r.send({ t: "control", run: 1, op: "run" });
    r.drain();
    const state = r.of("state").at(-1)!;
    expect(state.state).toBe("limit");
    expect(state.limit?.kind).toBe("limit-exceeded");
  });

  it("injects an input into the run", async () => {
    const r = rig();
    await r.load();
    await expect(r.send({ t: "input", run: 1, input: { kind: "pin", target: "D2", value: 1 } })).resolves.toBeUndefined();
  });
});
