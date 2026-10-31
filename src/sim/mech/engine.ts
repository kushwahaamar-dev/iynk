import type { Arena, Surface } from "../../project/generated/types.ts";
import type { PhysicsFrame } from "../../core/robot-report.ts";
import {
  BadScene,
  NumericFault,
  PhysicsDiverged,
  type BodyState,
  type PhysicsBackend,
  type PhysicsWorld,
  type Pose,
  type SceneSpec,
} from "./backend.ts";
import { createBuffers, type Snapshot } from "./buffers.ts";
import { H_S, type MotorChannel } from "./coupling.ts";
import type { PinSample } from "./driver.ts";
import type { createEncoder } from "./encoder.ts";
import { createFactsSampler, type RobotFacts } from "./facts.ts";
import { hash2 } from "./hash.ts";
import { RANK, StateHasher, clockRate, cyclesToNs, dmath, type Engine, type EventSink, type SimEvent, type SimTime, type SliceBudget } from "./ports.ts";
import type { Sensor, SensorWorld } from "./sensors.ts";

export const STEP_HZ = 240;
const STEP_RATE = clockRate(25_000_000, 6);
const FACTS_EVERY_STEPS = STEP_HZ / 10;
const PHASE_MECH = 4;
/** A ranger with nothing to hear is told a distance past the module's 4 m, which makes it time out. */
const NO_ECHO_CM = 1000;

export interface MechIo {
  /** Driver input pins as the digital layer resolved them at this time. */
  pins(part: string): PinSample;
  /** Motor supply volts from the last solve; 0 if unknown. */
  supplyV(part: string): number;
  setAnalog(part: string, pin: string, volts: number, at: SimTime): void;
  setParam(part: string, key: "distanceCm", value: number, at: SimTime): void;
  driveEdge(part: string, pin: string, level: 0 | 1, at: SimTime): void;
}

/** A motor channel with what the engine needs to report on its wheel. `channel.id` is the driver part id. */
export interface MotorBinding {
  channel: MotorChannel;
  wheelRadiusM: number;
  chassis: string;
}

export interface EncoderBank {
  part: string;
  joint: string;
  encoder: ReturnType<typeof createEncoder>;
  pins: { a: string; b?: string; index?: string };
}

/** `pins` lists the analog pin of each line channel, in channel order; a ranger has none. */
export interface SensorPort {
  sensor: Sensor;
  part: string;
  /** The mount id the sensor's binding names. */
  mount: string;
  pins: string[];
  vLogic: number;
}

export interface MechEngineArgs {
  backend: PhysicsBackend;
  scene: SceneSpec;
  channels: MotorBinding[];
  encoders: EncoderBank[];
  sensors: SensorPort[];
  terrain: { arena: Arena; surfaces: Surface[] };
  io: MechIo;
  stepHz: number;
  id?: string;
}

export type MechFrame = PhysicsFrame;

export type HaltCode = "numeric-fault" | "physics-diverged";

export interface HaltInfo {
  code: HaltCode;
  body: string;
  step: number;
  /** The state of the last step start before the halt. */
  last: Snapshot;
}

export type MechState = "created" | "running" | "halted" | "freed";

type Vec3 = BodyState["p"];

function copySnapshot(s: Snapshot): Snapshot {
  return { atNs: s.atNs, bodies: new Map(s.bodies), joints: new Map(s.joints) };
}

const yawOf = ([x, y, z, w]: BodyState["q"]): number => dmath.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));

function tiltDegOf([x, y, z, w]: BodyState["q"]): number {
  const up: Vec3 = [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)];
  return (dmath.atan2(Math.hypot(up[0], up[1]), up[2]) * 180) / Math.PI;
}

function driverStateOf(pins: PinSample): { cmdSign: -1 | 0 | 1; state: string } {
  if (pins.stby === 0) return { cmdSign: 0, state: "standby" };
  const live = "duty" in pins.pwm ? pins.pwm.duty > 0 : pins.pwm.level === 1;
  if (pins.in1 && pins.in2) return { cmdSign: 0, state: "brake" };
  if (!live || pins.in1 === pins.in2) return { cmdSign: 0, state: "coast" };
  return { cmdSign: pins.in1 ? 1 : -1, state: "run" };
}

export function createMechEngine(a: MechEngineArgs) {
  if (a.stepHz !== STEP_HZ) throw new BadScene(`step_hz ${a.stepHz} is not the ${STEP_HZ} Hz the mechanical engine runs at`);
  const jointIds = new Set(a.scene.joints.map((j) => j.id));
  for (const { channel } of a.channels) if (!jointIds.has(channel.joint)) throw new BadScene(`motor ${channel.id} drives joint ${channel.joint}, which the scene does not have`);
  for (const bank of a.encoders) if (!jointIds.has(bank.joint)) throw new BadScene(`encoder ${bank.part} reads joint ${bank.joint}, which the scene does not have`);

  const id = a.id ?? "mech";
  const world: PhysicsWorld = a.backend.create(a.scene, STEP_RATE);
  const buffers = createBuffers();
  const sampler = createFactsSampler();
  const bodyIds = a.scene.bodies.map((b) => b.id);
  const lastAngle = a.encoders.map((bank) => world.joint(bank.joint).angle);
  const lastReading = new Map<string, unknown>();
  let sink: EventSink | null = null;
  let state: MechState = "created";
  let halted: HaltInfo | null = null;
  let k = 0;

  const capture = (into: Snapshot, atNs: SimTime): void => {
    into.atNs = atNs;
    for (const body of bodyIds) into.bodies.set(body, world.body(body));
    for (const joint of jointIds) into.joints.set(joint, world.joint(joint));
  };
  capture(buffers.next, 0);
  buffers.swap();
  capture(buffers.next, 0);

  const sensorWorld: SensorWorld = {
    pose: (body): Pose => {
      const s = buffers.prev.bodies.get(body);
      if (!s) throw new BadScene(`sensor mount ${body} is not a body of the scene`);
      return { p: s.p, q: s.q };
    },
    castRays: (rays) => world.castRays(rays),
    arena: a.terrain.arena,
    surfaces: a.terrain.surfaces,
  };

  function sampleSensors(t: SimTime): void {
    for (const port of a.sensors) {
      if (!port.sensor.modelled) continue;
      const reading = port.sensor.read(sensorWorld, t);
      if (!reading || lastReading.get(port.sensor.id) === reading) continue;
      lastReading.set(port.sensor.id, reading);
      const start = { part: port.part, binding: port.sensor.id, mount: port.mount };
      if ("channels" in reading) {
        sampler.pushReading(port.sensor.id, { ...start, kind: "line" }, { values: reading.channels });
        reading.channels.forEach((reflectance, i) => {
          const pin = port.pins[i];
          if (pin !== undefined) a.io.setAnalog(port.part, pin, port.vLogic * (1 - reflectance), t);
        });
        sampler.setSensorHeight(port.part, reading.heightMm);
      } else {
        sampler.pushReading(port.sensor.id, { ...start, kind: "ranger" }, { values: reading.distanceMm === null ? [] : [reading.distanceMm], ...(reading.tooClose ? { tooClose: true } : {}) });
        a.io.setParam(port.part, "distanceCm", reading.distanceMm === null ? NO_ECHO_CM : reading.distanceMm / 10, t);
      }
    }
  }

  function applyTorques(t: SimTime): void {
    const sampling = k % FACTS_EVERY_STEPS === 0;
    a.channels.forEach(({ channel, wheelRadiusM, chassis }, i) => {
      const joint = buffers.prev.joints.get(channel.joint)!;
      const pins = a.io.pins(channel.id);
      const supply = a.io.supplyV(channel.id);
      const out = channel.begin(joint.speed, supply, pins, H_S);
      world.applyJointTorqueImpulse(channel.joint, out.torqueJointNm);
      if (!sampling) return;
      const body = buffers.prev.bodies.get(chassis)!;
      const driver = driverStateOf(pins);
      const bank = a.encoders.find((e) => e.joint === channel.joint);
      sampler.push({
        atNs: t,
        joint: channel.joint,
        speedRadS: joint.speed,
        angleRad: joint.angle,
        cmdSign: driver.cmdSign,
        armatureA: channel.state().iArmA,
        torqueNm: out.torqueJointNm,
        surfaceSpeedMps: joint.speed * wheelRadiusM,
        groundSpeedMps: Math.hypot(body.v[0], body.v[1]),
        ...(bank ? { encoderCount: bank.encoder.state().count } : {}),
        tiltDeg: tiltDegOf(body.q),
        driverState: driver.state,
      });
      if (i === 0) sampler.pushSupply(t, supply);
    });
  }

  function emitEdges(t: SimTime, hNs: number): void {
    a.encoders.forEach((bank, i) => {
      const angle = world.joint(bank.joint).angle;
      const edges = bank.encoder.edgesInStep(lastAngle[i], angle, t, hNs);
      lastAngle[i] = angle;
      for (const edge of edges) {
        const pin = bank.pins[edge.channel];
        if (pin === undefined) continue;
        sink?.emit({
          at: edge.atNs,
          phase: PHASE_MECH,
          rank: RANK.mech,
          src: id,
          kind: "encoder-edge",
          payload: { part: bank.part, pin, level: edge.level },
        });
      }
    });
  }

  function step(): void {
    const t = cyclesToNs(k, STEP_RATE);
    const hNs = cyclesToNs(k + 1, STEP_RATE) - t;
    buffers.swap();
    sampleSensors(t);
    applyTorques(t);
    try {
      world.step();
    } catch (err) {
      if (err instanceof NumericFault || err instanceof PhysicsDiverged) {
        state = "halted";
        halted = { code: err instanceof NumericFault ? "numeric-fault" : "physics-diverged", body: err.body, step: k, last: copySnapshot(buffers.prev) };
      }
      throw err;
    }
    capture(buffers.next, t + hNs);
    emitEdges(t, hNs);
    k++;
  }

  const engine: Engine = {
    id,
    rank: RANK.mech,
    // advanceTo(h) takes the steps that start before h, so the step due next is reached when the clock gets to its end.
    nextDue: () => (state === "halted" || state === "freed" ? null : cyclesToNs(k + 1, STEP_RATE)),
    advanceTo(horizon: SimTime, budget: SliceBudget) {
      if (state === "halted" || state === "freed") return { reached: horizon, stoppedEarly: false };
      state = "running";
      while (cyclesToNs(k, STEP_RATE) < horizon) {
        step();
        if (budget.shouldYield() && cyclesToNs(k, STEP_RATE) < horizon) return { reached: cyclesToNs(k, STEP_RATE), stoppedEarly: true };
      }
      return { reached: horizon, stoppedEarly: false };
    },
    onEvent(e: SimEvent) {
      if (e.kind !== "encoder-edge") return;
      const p = e.payload as { part: string; pin: string; level: 0 | 1 };
      a.io.driveEdge(p.part, p.pin, p.level, e.at);
    },
    stateHash() {
      const snap = buffers.prev;
      const bodies = [...snap.bodies].map(([bodyId, s]) => ({ id: bodyId, ...s }));
      const joints = [...snap.joints].map(([jointId, s]) => ({ id: jointId, angle: s.angle, speed: s.speed }));
      return new StateHasher().str(id).int(k).str(hash2(bodies, joints)).hex();
    },
    attach(s: EventSink) {
      sink = s;
    },
  };

  return {
    ...engine,
    frame(): MechFrame {
      const snap = buffers.prev;
      const bodies: MechFrame["bodies"] = {};
      for (const [bodyId, s] of snap.bodies) bodies[bodyId] = { p: [s.p[0], s.p[1], s.p[2]], yawRad: yawOf(s.q) };
      return { atNs: snap.atNs, bodies };
    },
    facts: (): RobotFacts => sampler.facts(),
    stepIndex: () => k,
    state: (): MechState => state,
    halt: (): HaltInfo | null => halted,
    free(): void {
      if (state === "freed") return;
      state = "freed";
      world.free();
    },
  };
}

export type MechEngine = ReturnType<typeof createMechEngine>;
