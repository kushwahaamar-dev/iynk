// @vitest-environment node
import { readFileSync } from "node:fs";
import * as rapier from "@dimforge/rapier3d-deterministic-compat";
import { describe, expect, it } from "vitest";
import { INTERP_LANGUAGE } from "@/lib/interp";
import { builtinRegistry } from "@/parts/builtin";
import type { Project } from "@/project/generated/types";
import { createDigitalNets } from "@/sim/digital/nets";
import type { ProgramImage, SimNetlist } from "@/sim/engine";
import { buildSimNetlist } from "@/sim/netlist";
import type { RobotFacts } from "@/sim/mech/facts";
import { createInterpEngine, type InterpEngine } from "./engines/interp-engine";
import { boardIdOf, createSimHandler } from "./handler";
import { nominalRunIo, prepareMech, rangersOf, robotReport, type MechRuntime } from "./mech";
import type { SimEv } from "./protocol";

const registry = builtinRegistry();
const describe_ = (ref: string) => registry.latest(ref);
const RUN_NS = 6_000_000_000;

const template = (name: string): Project => JSON.parse(readFileSync(`content/projects/robots/${name}.project.json`, "utf8")) as Project;

function programOf(doc: Project): ProgramImage {
  const firmware = doc.boards.find((b) => b.firmware)!.firmware!;
  const files = firmware.sources.map((id) => {
    const source = doc.sources.find((s) => s.id === id)!;
    return { path: source.path, text: source.content };
  });
  return { kind: "source", language: firmware.language, files, entry: doc.sources.find((s) => s.id === firmware.entry)!.path };
}

/** The headless path: the same handler, mechanical engine and interpreter the worker builds, with the physics module from npm and a loop that runs the tasks in place. */
async function runRobot(name: string, ns = RUN_NS) {
  const doc = template(name);
  const { net } = buildSimNetlist(doc, registry);
  const tasks: Array<() => void> = [];
  const events: SimEv[] = [];
  let wall = 0;
  let runtime: MechRuntime | null = null;
  let mcu: InterpEngine | null = null;
  const handler = createSimHandler({
    diag: false,
    wallMs: () => (wall += 1),
    schedule: (fn) => void tasks.push(fn),
    makeEngine: (program, n: SimNetlist, o) => {
      const board = n.parts.find((p) => p.kind === "board")!;
      mcu = createInterpEngine({
        id: board.id,
        board: boardIdOf(board.descriptor),
        language: INTERP_LANGUAGE[program.kind === "source" ? (program.language as keyof typeof INTERP_LANGUAGE) : "arduino-cpp"] ?? "arduino",
        seed: o.seed,
        rangers: rangersOf(n),
      });
      return mcu;
    },
    makeDigital: createDigitalNets,
    mech: {
      prepare: async (d, n, onState) => {
        const prepared = await prepareMech(d, n, { loadEngine: () => Promise.reject(new Error("offline")), module: rapier, describe: describe_, onState });
        if (!prepared.ok) return prepared;
        const kit = prepared.value;
        return { ok: true as const, value: { ...kit, start: (runNet, io) => (runtime = kit.start(runNet, io)) } };
      },
      runIo: (n) => nominalRunIo(n, describe_),
      report: (d) => robotReport(d, describe_),
    },
  });
  const send = (msg: Parameters<typeof handler>[0]) => handler(msg, (ev) => events.push(ev));
  const opts = { seed: doc.simulation.seed, speed: 0, limits: { statements: Infinity, events: Infinity, outputBytes: Infinity }, tier: "T1" as const, endNs: ns };
  const loaded = await send({ t: "load", run: 1, net, opts, program: programOf(doc), robot: doc });
  await send({ t: "control", run: 1, op: "run" });
  for (let task = tasks.shift(); task; task = tasks.shift()) task();
  return { doc, loaded, events, runtime: runtime!, mcu: mcu! };
}

const frames = (events: SimEv[]) => events.flatMap((e) => (e.t === "mech_frame" ? [e.frame] : []));

function wheelSpeeds(facts: RobotFacts) {
  const byJoint = new Map<string, number[]>();
  for (const s of facts.samples) byJoint.set(s.joint, [...(byJoint.get(s.joint) ?? []), s.speedRadS]);
  return byJoint;
}

const reportOf = (events: SimEv[]) => events.flatMap((e) => (e.t === "mech_report" ? [e.report] : []))[0]!;
const serialOf = (events: SimEv[]) => events.flatMap((e) => (e.t === "frame" ? e.serial.map((c) => c.text) : [])).join("").split("\n").filter(Boolean);
const chassisAt = (events: SimEv[], seconds: number) => frames(events).find((f) => f.atNs >= seconds * 1e9)!.bodies.bdy_chassis;

describe("robot templates run end to end", () => {
  it("line follower: the array reaches the pins and the motors steer the robot round the oval", async () => {
    const r = await runRobot("line-follower");
    expect(r.loaded).toEqual({ diagnostics: [] });
    expect(r.events.flatMap((e) => (e.t === "mech_status" ? [e.state] : []))).toContain("ready");
    const facts = r.runtime.facts();
    const line = facts.sensors.find((s) => s.kind === "line")!;
    expect(line.samples).toBeGreaterThan(1000);
    expect(line.min!).toBeLessThan(0.1);
    expect(line.max!).toBeGreaterThan(0.8);
    const [left, right] = [...wheelSpeeds(facts).values()];
    expect(Math.max(...left.map((v, i) => Math.abs(v - right[i])))).toBeGreaterThan(5);
    const { run } = reportOf(r.events);
    expect(run!.maxCrossTrackMm).toBeLessThan(40);
    expect(run!.onLineFraction).toBeGreaterThan(0.7);
    expect(run!.progressMm).toBeGreaterThan(2000);
  });

  it("drive base: PWM duty reaches the driver, so it drives 2 s forward then turns left", async () => {
    const r = await runRobot("drive-base");
    expect(serialOf(r.events).at(-1)).toBe("done\r");
    const start = chassisAt(r.events, 0);
    const forward = chassisAt(r.events, 2);
    expect(forward.p[0] - start.p[0]).toBeGreaterThan(0.5);
    expect(Math.abs(forward.p[1] - start.p[1])).toBeLessThan(0.02);
    expect(chassisAt(r.events, 5.9).yawRad).toBeGreaterThan(0.8);
  });

  it("speed control: encoder edges reach the sketch and the loop holds the target", async () => {
    const r = await runRobot("speed-control");
    const lines = serialOf(r.events).filter((l) => l.startsWith("pid "));
    const [, , setpoint, measured] = lines.at(-1)!.trim().split(" ").map(Number);
    expect(setpoint).toBe(0.2);
    expect(Math.abs(measured - 0.2)).toBeLessThan(0.08);
    const counts = r.runtime.facts().samples.flatMap((s) => (s.encoderCount === undefined ? [] : [Math.abs(s.encoderCount)]));
    expect(Math.max(...counts)).toBeGreaterThan(5000);
    expect(reportOf(r.events).loop!.n).toBeGreaterThan(100);
  });
});
