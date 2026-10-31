// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NumericFault, type BodyState, type PhysicsBackend, type PhysicsWorld, type SceneSpec } from "./backend.ts";
import type { MotorChannel } from "./coupling.ts";
import { createEncoder } from "./encoder.ts";
import { createMechEngine, type MechEngineArgs, type MechIo } from "./engine.ts";
import { clockRate, cyclesToNs, type SimEvent } from "./ports.ts";

const RATE = clockRate(25_000_000, 6);
const TWO_PI = 2 * Math.PI;

const scene = {
  bodies: [{ id: "chassis" }],
  joints: [{ id: "wl" }],
} as unknown as SceneSpec;

interface Fake {
  world: PhysicsWorld;
  steps: () => number;
  impulses: number[];
  failAt: (n: number) => void;
}

function fakeBackend(radS: number): { backend: PhysicsBackend; fake: Fake } {
  let n = 0;
  let failAt = Infinity;
  const impulses: number[] = [];
  const body: BodyState = { p: [0, 0, 0.01], q: [0, 0, 0, 1], v: [0, 0, 0], w: [0, 0, 0] };
  const world = {
    step() {
      n++;
      if (n === failAt) body.p = [NaN, 0, 0];
      if (n === failAt) throw new NumericFault("chassis", n);
    },
    applyJointTorqueImpulse: (_: string, nm: number) => impulses.push(nm),
    body: () => ({ ...body }),
    joint: () => ({ angle: (radS * n) / 240, speed: radS, torque: 0 }),
    castRays: () => [],
    hash2: () => "0",
    free() {},
  } as unknown as PhysicsWorld;
  return {
    backend: { create: () => world } as unknown as PhysicsBackend,
    fake: { world, steps: () => n, impulses, failAt: (x) => (failAt = x) },
  };
}

const channel: MotorChannel = {
  id: "drv",
  joint: "wl",
  begin: () => ({ torqueJointNm: 0.5, supplyA: 0, notes: [] }),
  state: () => ({ iArmA: 0, mode: "algebraic" }),
};

function setup(radS: number, extra: Partial<MechEngineArgs> = {}) {
  const { backend, fake } = fakeBackend(radS);
  const edges: Array<{ pin: string; at: number }> = [];
  const io: MechIo = {
    pins: () => ({ in1: 1, in2: 0, pwm: { level: 1 } }),
    supplyV: () => 7.4,
    setAnalog() {},
    setParam() {},
    driveEdge: (_, pin, __, at) => edges.push({ pin, at }),
  };
  const emitted: Array<Omit<SimEvent, "seq">> = [];
  const engine = createMechEngine({
    backend,
    scene,
    channels: [{ channel, wheelRadiusM: 0.03, chassis: "chassis" }],
    encoders: [
      {
        part: "enc",
        joint: "wl",
        encoder: createEncoder({ countsPerRev: 360, channels: "ab", index: false, onMotorShaft: false, gearRatio: 1 }),
        pins: { a: "A", b: "B" },
      },
    ],
    sensors: [],
    terrain: { arena: {} as never, surfaces: [] },
    io,
    stepHz: 240,
    ...extra,
  });
  engine.attach({ emit: (e) => emitted.push(e) });
  return { engine, fake, emitted, edges };
}

const open = { shouldYield: () => false, work: { statements: Infinity, events: Infinity, outputBytes: Infinity } };

describe("mech engine", () => {
  it("steps on the rational clock without drift", () => {
    const { engine, fake } = setup(0);
    for (let i = 0; i < 10_000; i++) {
      expect(engine.nextDue()).toBe(cyclesToNs(i, RATE));
      engine.advanceTo(cyclesToNs(i + 1, RATE), open);
    }
    expect(fake.steps()).toBe(10_000);
    expect(engine.stepIndex()).toBe(10_000);
    expect(cyclesToNs(10_000, RATE)).toBe(41_666_666_666);
  });

  it("does nothing when the horizon is not past the next step", () => {
    const { engine, fake } = setup(0);
    engine.advanceTo(0, open);
    expect(fake.steps()).toBe(0);
  });

  it("emits every encoder edge once, in order, after the step start", () => {
    const { engine, emitted } = setup(10);
    let now = 0;
    for (let s = 1; s <= 10; s++) {
      now = s * 1e9;
      engine.advanceTo(now, open);
    }
    const a = emitted;
    expect(a).toHaveLength(Math.floor((360 * 100) / TWO_PI));
    for (let i = 1; i < a.length; i++) expect(a[i]!.at).toBeGreaterThanOrEqual(a[i - 1]!.at);
    expect(a[0]!.phase).toBe(4);
    expect(a[0]!.rank).toBe(50);
  });

  it("hands delivered edges to the digital layer", () => {
    const { engine, edges } = setup(0);
    engine.onEvent({ at: 5, phase: 4, rank: 50, seq: 1, src: "x", kind: "encoder-edge", payload: { part: "enc", pin: "A", level: 1 } });
    expect(edges).toEqual([{ pin: "A", at: 5 }]);
  });

  it("applies the channel torque at every step start", () => {
    const { engine, fake } = setup(0);
    engine.advanceTo(cyclesToNs(3, RATE) + 1, open);
    expect(fake.impulses).toEqual([0.5, 0.5, 0.5, 0.5]);
  });

  it("halts on a numeric fault with the body and the last good state", () => {
    const { engine, fake } = setup(0);
    fake.failAt(3);
    expect(() => engine.advanceTo(1e9, open)).toThrow(NumericFault);
    expect(engine.state()).toBe("halted");
    expect(engine.halt()).toMatchObject({ code: "numeric-fault", body: "chassis", step: 2 });
    expect(engine.nextDue()).toBeNull();
    expect(engine.advanceTo(2e9, open).stoppedEarly).toBe(false);
    expect(fake.steps()).toBe(3);
  });

  it("keeps the hash when a frame is taken", () => {
    const { engine } = setup(0);
    engine.advanceTo(1e8, open);
    const before = engine.stateHash();
    engine.frame();
    expect(engine.stateHash()).toBe(before);
  });

  it("refuses another step rate and a joint the scene lacks", () => {
    expect(() => setup(0, { stepHz: 120 })).toThrow(/step_hz/);
    expect(() => setup(0, { channels: [{ channel: { ...channel, joint: "nope" }, wheelRadiusM: 0.03, chassis: "chassis" }] })).toThrow(/joint nope/);
  });

  it("collects a sample every tenth of a second", () => {
    const { engine } = setup(0);
    engine.advanceTo(1e9, open);
    expect(engine.facts().samples.map((s) => s.atNs).slice(0, 2)).toEqual([0, cyclesToNs(24, RATE)]);
    expect(engine.facts().samples).toHaveLength(10);
  });
});
