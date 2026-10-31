// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInlinePort } from "@/protocol";
import type { Op } from "@/project/generated/types";
import { classifyImpact } from "@/project/opImpact";
import { sampleBlinkD12 } from "@/project/samples";
import { createSession } from "@/project/session";
import { seededRandom, steppingClock } from "@/project/session.testing";
import { validateValue } from "@/project/validate";
import { createInterpEngine } from "@/sim-host/engines/interp-engine";
import { createSimHandler } from "@/sim-host/handler";
import { createSimHost } from "@/sim-host/host";
import type { SimEv } from "@/sim-host/protocol";
import { INTERP_LANGUAGE } from "@/lib/interp";
import { createDigitalNets } from "@/sim/digital/nets";
import { createDocStore } from "@/studio/stores/doc";
import { createRunStore } from "@/studio/stores/run";
import { createRecordingDoc } from "@/studio/testing/recording-doc";
import { linkSim, type SimHostLike } from "./simLink";

function blinkSession(code?: string) {
  const report = validateValue(sampleBlinkD12());
  const state = report.doc!;
  if (code) state.sources.find((s) => s.role === "firmware")!.content = code;
  return createSession({ state, clock: steppingClock(), rnd: seededRandom() });
}

function fakeHost() {
  const listeners: Array<(e: SimEv) => void> = [];
  const calls: string[] = [];
  const host: SimHostLike & { loads: unknown[] } = {
    loads: [],
    async load(net, opts, program) {
      calls.push("load");
      host.loads.push({ net, opts, program });
      return { diagnostics: [], runId: calls.length };
    },
    async control(op) {
      calls.push(`control:${op}`);
    },
    async input(i) {
      calls.push(`input:${i.kind}`);
    },
    async pause() {
      calls.push("pause");
    },
    async resume() {
      calls.push("resume");
    },
    async step(unit, n) {
      calls.push(`step:${unit}:${n}`);
    },
    async setSpeed(x) {
      calls.push(`speed:${x}`);
    },
    async debug(op) {
      calls.push(`debug:${op.op}`);
    },
    onEvent(fn) {
      listeners.push(fn);
      return () => void listeners.splice(listeners.indexOf(fn), 1);
    },
  };
  const emit = (e: SimEv) => listeners.forEach((fn) => fn(e));
  return { host, calls, emit };
}

const stateEv = (state: Extract<SimEv, { t: "state" }>["state"], limit?: { kind: string; message: string }): SimEv => ({ t: "state", run: 1, state, at: 0, ...(limit ? { limit } : {}) });

function rig() {
  const doc = createRecordingDoc(blinkSession());
  const run = createRunStore();
  const fake = fakeHost();
  const link = linkSim({ doc, run, host: fake.host, impact: classifyImpact });
  return { doc, run, link, ...fake };
}

const moveResistor = (): Op => ({ k: "view.place", view: "vw_bb", placement: { c: "cmp_res1", legs: { P1: "b10", P2: "b14" }, x_mm: 1, y_mm: 2 } }) as Op;

describe("simLink", () => {
  it("loads the project and then runs it", async () => {
    const { link, run, calls, host, emit } = rig();
    await link.run();
    expect(calls).toEqual(["load", "control:run"]);
    expect(run.getState().phase).toBe("starting");
    emit(stateEv("running"));
    expect(run.getState().phase).toBe("running");
    const { program, opts } = host.loads[0] as { program: { entry: string; files: { path: string }[] }; opts: { speed: number } };
    expect(program.entry).toBe(program.files[0]!.path);
    expect(opts.speed).toBe(1);
  });

  it("ignores a second Run while starting or running", async () => {
    const { link, calls, emit } = rig();
    await link.run();
    emit(stateEv("running"));
    await link.run();
    expect(calls).toEqual(["load", "control:run"]);
  });

  it("turns frames into part states and serial lines with stamps", async () => {
    const { link, run, emit } = rig();
    await link.run();
    emit(stateEv("running"));
    emit({ t: "frame", run: 1, at: 1_000_000_000, pins: { D12: 1 }, parts: [], serial: [{ at: 1_000_000_000, text: "on\n" }] });
    expect(run.getState().frame).toMatchObject({ tNs: 1_000_000_000, pins: { D12: 1 } });
    expect(run.getState().serial).toMatchObject([{ tNs: 1_000_000_000, kind: "out", text: "on" }]);
  });

  it("marks stale for an edit of the code and for a changed parameter, not for a move", async () => {
    const { doc, link, run, emit } = rig();
    await link.run();
    emit(stateEv("running"));
    doc.commit([moveResistor()], { label: "Move" });
    expect(run.getState().stale).toBe(false);
    doc.commit([{ k: "component.set", id: "cmp_res1", params: { ohms: 470 } }], { label: "Value" });
    expect(run.getState().stale).toBe(true);
  });

  it("marks stale when the source is edited", async () => {
    const { doc, link, run, emit } = rig();
    await link.run();
    emit(stateEv("running"));
    const source = doc.getState().state.sources.find((s) => s.role === "firmware")!;
    doc.commit([{ k: "source.edit", id: source.id, baseSeq: 0, pos: 0, del: 0, ins: "// hi\n" }], { label: "Edit" });
    expect(run.getState().stale).toBe(true);
  });

  it("does nothing about edits when no run exists", () => {
    const { doc, run } = rig();
    doc.commit([{ k: "component.set", id: "cmp_res1", params: { ohms: 470 } }], { label: "Value" });
    expect(run.getState().stale).toBe(false);
  });

  it("restarts from the current document and clears the stale mark", async () => {
    const { doc, link, run, emit, host } = rig();
    await link.run();
    emit(stateEv("running"));
    const source = doc.getState().state.sources.find((s) => s.role === "firmware")!;
    doc.commit([{ k: "source.edit", id: source.id, baseSeq: 0, pos: 0, del: 0, ins: "// hi\n" }], { label: "Edit" });
    await link.run();
    expect(host.loads).toHaveLength(2);
    expect((host.loads[1] as { program: { files: { text: string }[] } }).program.files[0]!.text.startsWith("// hi")).toBe(true);
    expect(run.getState().stale).toBe(false);
  });

  it("stops during starting without running the late load", async () => {
    const { link, run, calls, host } = rig();
    let release: () => void = () => {};
    host.load = async () => {
      calls.push("load");
      await new Promise<void>((resolve) => (release = resolve));
      return { diagnostics: [], runId: 1 };
    };
    const pending = link.run();
    link.stop();
    release();
    await pending;
    expect(run.getState().phase).toBe("stopped");
    expect(calls).not.toContain("control:run");
    expect(calls).toContain("control:stop");
  });

  it("shows compile errors and runs nothing", async () => {
    const { link, run, calls, host } = rig();
    host.load = async () => ({ diagnostics: [{ id: "parse", severity: "error", ref: { line: 3 }, text_key: "diag.parse", args: { message: "expected ;" } }], runId: 1 });
    await link.run();
    expect(run.getState()).toMatchObject({ phase: "error", diagnostics: [{ text: "expected ;", line: 3 }] });
    expect(calls).not.toContain("control:run");
  });

  it("maps a limit event to the limit that was hit", async () => {
    const { link, run, emit } = rig();
    await link.run();
    emit(stateEv("running"));
    emit(stateEv("limit", { kind: "limit-exceeded", message: "The code ran more than 400000 statements" }));
    expect(run.getState()).toMatchObject({ phase: "limit", limit: { which: "statements" } });
  });

  it("maps a replaced worker to killed and runs again from the document", async () => {
    const { link, run, emit, host } = rig();
    await link.run();
    emit(stateEv("running"));
    emit(stateEv("limit", { kind: "wall-stall", message: "restarted" }));
    expect(run.getState().phase).toBe("killed");
    await link.run();
    expect(host.loads).toHaveLength(2);
  });

  it("maps halted to error and shows event messages", async () => {
    const { link, run, emit } = rig();
    await link.run();
    emit(stateEv("running"));
    emit({ t: "event", run: 1, event: { kind: "diagnostic", message: "division by zero", at: 5 } });
    emit(stateEv("halted"));
    expect(run.getState()).toMatchObject({ phase: "error", diagnostics: [{ text: "division by zero" }] });
  });

  it("sends serial text and button presses only while running", async () => {
    const { link, run, calls, emit } = rig();
    link.sendSerial("hi\n");
    link.press("cmp_btn", "A", true);
    expect(calls).toEqual([]);
    await link.run();
    emit(stateEv("running"));
    link.sendSerial("hi\n");
    link.press("cmp_btn", "A", true);
    expect(calls.slice(-2)).toEqual(["input:serial", "input:pin"]);
    expect(run.getState().serial.at(-1)).toMatchObject({ kind: "in", text: "hi" });
  });

  it("goes back to idle on reset and ignores late events", async () => {
    const { link, run, calls, emit } = rig();
    await link.run();
    emit(stateEv("running"));
    link.reset();
    emit({ t: "frame", run: 1, at: 5, pins: {}, parts: [], serial: [{ at: 5, text: "late\n" }] });
    expect(run.getState()).toMatchObject({ phase: "idle", serial: [] });
    expect(calls).toContain("control:reset");
  });

  it("shows what the host reports about keeping up", async () => {
    const { link, run, emit } = rig();
    await link.run();
    emit(stateEv("running"));
    emit({ t: "speed.report", run: 1, achieved: 20, behind: true });
    expect(run.getState()).toMatchObject({ behindReal: true, achievedSpeed: 20 });
    emit({ t: "speed.report", run: 1, achieved: 100, behind: false });
    expect(run.getState().behindReal).toBe(false);
    emit({ t: "speed.report", run: 1, achieved: 20, behind: true });
    emit(stateEv("paused"));
    expect(run.getState()).toMatchObject({ phase: "paused", behindReal: false });
  });

  it("pauses, steps and resumes only in the phase that allows it", async () => {
    const { link, run, calls, emit } = rig();
    await link.run();
    emit(stateEv("running"));
    link.step("statement", 1);
    link.pause();
    emit(stateEv("paused"));
    link.pause();
    link.step("statement", 1);
    link.resume();
    expect(calls.filter((c) => /^(pause|resume|step)/.test(c))).toEqual(["pause", "step:statement:1", "resume"]);
    expect(run.getState().phase).toBe("paused");
  });

  it("keeps the chosen speed for the next run and tells the host", async () => {
    const { link, run, calls, host } = rig();
    link.setSpeed(10);
    expect(calls).not.toContain("speed:10");
    await link.run();
    expect((host.loads[0] as { opts: { speed: number } }).opts.speed).toBe(10);
    link.setSpeed(0);
    expect(calls).toContain("speed:0");
    link.reset();
    expect(run.getState().speed).toBe(0);
  });

  it("stops listening on dispose", async () => {
    const { link, run, doc } = rig();
    await link.run();
    link.dispose();
    doc.commit([{ k: "component.set", id: "cmp_res1", params: { ohms: 470 } }], { label: "Value" });
    expect(run.getState().stale).toBe(false);
  });
});

describe("simLink with the real simulator", () => {
  const hosts: Array<ReturnType<typeof createSimHost>> = [];
  afterEach(async () => {
    await Promise.all(hosts.splice(0).map((h) => h.kill()));
  });

  const SKETCH = 'void setup() { Serial.begin(9600); pinMode(12, OUTPUT); }\nvoid loop() { digitalWrite(12, HIGH); Serial.println("on"); delay(500); digitalWrite(12, LOW); Serial.println("off"); delay(500); }\n';

  async function blinkRun(): Promise<string[]> {
    let wall = 0;
    const host = createSimHost({
      makePort: () =>
        createInlinePort(
          createSimHandler({
            diag: false,
            wallMs: () => (wall += 2000),
            schedule: (fn) => void setTimeout(fn, 0),
            makeEngine: (program, net, opts) =>
              createInterpEngine({
                id: net.parts.find((p) => p.kind === "board")!.id,
                board: "uno-r3",
                language: INTERP_LANGUAGE[program.language as keyof typeof INTERP_LANGUAGE] ?? "arduino",
                seed: opts.seed,
              }),
            makeDigital: createDigitalNets,
          }),
        ),
    });
    hosts.push(host);
    const run = createRunStore();
    const link = linkSim({ doc: createDocStore(blinkSession(SKETCH)), run, host, impact: classifyImpact });
    await link.run();
    for (let i = 0; i < 2000 && run.getState().serial.length < 5; i++) await new Promise((r) => setTimeout(r, 5));
    link.stop();
    return run.getState().serial.slice(0, 5).map((e) => `${e.tNs} ${e.text}`);
  }

  it("prints five lines with virtual stamps, the same in every run", async () => {
    const first = await blinkRun();
    expect(first.map((l) => l.split(" ")[1])).toEqual(["on", "off", "on", "off", "on"]);
    expect(Number(first[4]!.split(" ")[0])).toBeGreaterThan(1.9e9);
    expect(await blinkRun()).toEqual(first);
  });
});
