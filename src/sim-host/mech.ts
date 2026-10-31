import type { CouplingReport, MechReport, PhysicsFrame, RobotCheck, RobotProblem } from "@/core/robot-report";
import { fail, ok, type Result } from "@/core/result";
import { rng } from "@/core/prng";
import { getProfile } from "@/lib/interp/profiles";
import type { Descriptor } from "@/parts/descriptor";
import type { Project } from "@/project/generated/types";
import { railLevels } from "@/sim/digital/nets";
import type { Engine, PinEventPayload, SimEvent, SimNetlist } from "@/sim/engine";
import { createRapierBackend, type RapierModule } from "@/sim/mech/rapier";
import { runChecks, runMetrics } from "@/sim/mech/checker";
import { H_S, couplingCheck, createMotorChannel, type MotorChannel } from "@/sim/mech/coupling";
import { paramsFromDescriptor as driverParams, type PinSample } from "@/sim/mech/driver";
import { createEncoder } from "@/sim/mech/encoder";
import { STEP_HZ, createMechEngine, type EncoderBank, type MechEngine, type MechIo, type MotorBinding, type SensorPort } from "@/sim/mech/engine";
import { paramsFromDescriptor as motorParams } from "@/sim/mech/motor";
import { sceneHash, buildScene } from "@/sim/mech/scene";
import { createSensor } from "@/sim/mech/sensors";
import { validateRobot } from "@/sim/mech/validate";
import { createLoopTiming } from "@/sim/probe/loop-timing";
import type { LoadEngine } from "./engines/loader";
import pins from "./engines/physics/rapier.manifest.json";

/** One frame per this many mechanical steps: 240 / 8 = 30 frames per simulated second. */
export const FRAME_EVERY_STEPS = 8;

export type MechState = "loading-physics" | "ready" | "failed";

export interface MechRefusal {
  code: "pin-mismatch" | "load-failed" | "invalid-robot";
  message: string;
  expected?: string;
  found?: string;
  problems?: RobotProblem[];
}

/** What the run supplies to the mechanical engine; the digital layer is read through the engine's own pin events. */
export type MechRunIo = Pick<MechIo, "supplyV" | "setAnalog" | "setParam" | "driveEdge">;

export interface MechDeps {
  loadEngine: LoadEngine;
  describe(ref: string): Descriptor | undefined;
  onState(state: MechState, info?: { wireBytes?: number; reason?: string }): void;
}

export interface MechRuntime {
  engine: Engine;
  mech: MechEngine;
  /** The state to show now, as a frame; the chassis sample for the run report is taken here. */
  takeFrame(): PhysicsFrame;
  report(checkpoints: readonly string[]): MechReport;
  free(): void;
}

export interface MechKit extends RobotReport {
  wireBytes: number;
  nets: { pack: string; regulator: string; rail: string };
  /** A fresh world for one run; the caller frees the runtime it replaces. */
  start(net: SimNetlist, io: MechRunIo): MechRuntime;
}

export const needsPhysics = (doc: Project): boolean => doc.domains?.robotics !== undefined && (doc.mechanical?.bodies.length ?? 0) > 0;

const OFFLINE = "physics engine not available offline";

interface Channel {
  motorId: string;
  joint: string;
  chassis: string;
  wheelRadiusM: number;
  motor: Parameters<typeof createMotorChannel>[0]["motor"];
  gear: Parameters<typeof createMotorChannel>[0]["gear"];
  driver: Parameters<typeof createMotorChannel>[0]["driver"];
  /** Board-facing driver pins for this motor. */
  inputs: { in1: string; in2: string; pwm: string; stby?: string };
  encoder?: { counts: number; channels: "a" | "ab"; index: boolean };
}

const CHANNELS = {
  tb6612: {
    stby: "STBY",
    sides: [
      { out: ["A01", "A02"], in: ["AIN1", "AIN2"], pwm: "PWMA" },
      { out: ["B01", "B02"], in: ["BIN1", "BIN2"], pwm: "PWMB" },
    ],
  },
  l298n: {
    stby: undefined,
    sides: [
      { out: ["OUT1", "OUT2"], in: ["IN1", "IN2"], pwm: "ENA" },
      { out: ["OUT3", "OUT4"], in: ["IN3", "IN4"], pwm: "ENB" },
    ],
  },
} as const;

let rapier: RapierModule | null = null;

export interface RobotReport {
  problems: RobotProblem[];
  checks: RobotCheck[];
  coupling: CouplingReport[];
}

/** Everything the Problems pane and the robot panels show before a run: the validator, the ten checks and the motor coupling. */
export function robotReport(doc: Project, describe: MechDeps["describe"]): RobotReport {
  const refOf = new Map(doc.components.map((c) => [c.id, c.definition.ref]));
  const coupling = (doc.mechanical?.joints ?? []).flatMap((joint) => {
    const ref = joint.drive ? refOf.get(joint.drive.component) : undefined;
    const block = ref === undefined ? undefined : describe(ref)?.mechanics?.motor;
    const params = block ? motorParams(block) : undefined;
    return joint.drive && params?.ok ? [couplingCheck(params.value, H_S, joint.drive.component).report] : [];
  });
  return { problems: validateRobot(doc, { describe, dmath: Math }), checks: runChecks({ doc, describe, slopeDeg: 0 }), coupling };
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Fetches the engine the first time, checks its WASM against the pin, and keeps the module for later runs. */
async function loadRapier(deps: MechDeps): Promise<Result<{ mod: RapierModule; wireBytes: number }, MechRefusal>> {
  const offer = await deps.loadEngine("rapier");
  if (!offer.ok) return fail({ code: "load-failed", message: offer.reason === "network" ? OFFLINE : offer.detail });
  if (rapier) return ok({ mod: rapier, wireBytes: offer.wireBytes });
  deps.onState("loading-physics", { wireBytes: offer.wireBytes });
  const fetched = await offer.fetchFiles();
  if (!fetched.ok) {
    if (fetched.reason === "integrity") return fail({ code: "pin-mismatch", message: `${fetched.detail} does not match the engine manifest`, expected: pins.pins.wasmSha256 });
    return fail({ code: "load-failed", message: OFFLINE });
  }
  const wasm = fetched.files.find((f) => f.kind === "wasm");
  const script = fetched.files.find((f) => f.kind === "js");
  if (!wasm || !script) return fail({ code: "load-failed", message: "the physics engine is missing a file" });
  const found = await sha256Hex(wasm.bytes);
  if (found !== pins.pins.wasmSha256) {
    return fail({ code: "pin-mismatch", message: "the physics engine WASM is not the pinned build", expected: pins.pins.wasmSha256, found });
  }
  (globalThis as { __IYNK_RAPIER_WASM__?: Uint8Array }).__IYNK_RAPIER_WASM__ = new Uint8Array(wasm.bytes);
  const url = URL.createObjectURL(new Blob([script.bytes], { type: "text/javascript" }));
  try {
    rapier = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as RapierModule;
  } catch (error) {
    return fail({ code: "load-failed", message: error instanceof Error ? error.message : String(error) });
  } finally {
    URL.revokeObjectURL(url);
  }
  return ok({ mod: rapier, wireBytes: offer.wireBytes });
}

/** Resolves every driven wheel to its motor, its driver channel and the board pins that command it. */
function channelsOf(doc: Project, net: SimNetlist, deps: MechDeps): Result<Channel[], MechRefusal> {
  const refOf = new Map(doc.components.map((c) => [c.id, c.definition.ref]));
  const partOf = new Map(net.parts.map((p) => [p.id, p]));
  const radiusMm = (joint: string) => doc.domains?.robotics?.data.wheels[joint]?.radius_mm;
  const drivers = net.parts.flatMap((p) => {
    const ref = refOf.get(p.id);
    const block = ref === undefined ? undefined : deps.describe(ref)?.mechanics?.driver;
    const params = ref === undefined || !block ? undefined : driverParams(ref, block);
    return params?.ok ? [{ part: p, params: params.value }] : [];
  });
  const out: Channel[] = [];
  const refuse = (message: string) => fail<MechRefusal>({ code: "invalid-robot", message });

  for (const joint of doc.mechanical?.joints ?? []) {
    if (!joint.drive) continue;
    const motorId = joint.drive.component;
    const ref = refOf.get(motorId);
    const block = ref === undefined ? undefined : deps.describe(ref)?.mechanics?.motor;
    const params = block ? motorParams(block) : undefined;
    const radius = radiusMm(joint.id);
    if (!block || !params?.ok || radius === undefined) return refuse(`${motorId} cannot drive ${joint.id}`);
    const plus = partOf.get(motorId)?.pins.PLUS;
    const minus = partOf.get(motorId)?.pins.MINUS;
    const found = drivers.flatMap(({ part, params: driver }) =>
      CHANNELS[driver.truth].sides.flatMap((side) => {
        const [a, b] = side.out.map((pin) => part.pins[pin]);
        if (plus == null || minus == null || a == null || b == null) return [];
        if (plus === a && minus === b) return [{ part, driver, side, swap: false }];
        return plus === b && minus === a ? [{ part, driver, side, swap: true }] : [];
      }),
    )[0];
    if (!found) return refuse(`${motorId} is not wired to a motor driver output`);
    const [in1, in2] = found.swap ? [...found.side.in].reverse() : found.side.in;
    const stbyPin = CHANNELS[found.driver.truth].stby;
    const encoder = deps.describe(ref!)?.mechanics?.encoder;
    out.push({
      motorId,
      joint: joint.id,
      chassis: joint.parent,
      wheelRadiusM: radius * 1e-3,
      motor: params.value,
      gear: { ratio: block.gear?.ratio ?? 1, efficiency: block.gear?.efficiency ?? 1, backdrivable: true, jOutKgM2: block.gear?.j_out_kgm2 ?? 0 },
      driver: found.driver,
      inputs: {
        in1: found.part.pins[in1!] ?? "",
        in2: found.part.pins[in2!] ?? "",
        pwm: found.part.pins[found.side.pwm] ?? "",
        ...(stbyPin && found.part.pins[stbyPin] ? { stby: found.part.pins[stbyPin]! } : {}),
      },
      ...(encoder ? { encoder: { counts: encoder.counts_per_rev, channels: encoder.channels ?? "ab", index: encoder.index ?? false } } : {}),
    });
  }
  return ok(out);
}

interface PinState {
  level: 0 | 1;
  duty?: number;
  hz?: number;
}

const isPin = (e: SimEvent): e is SimEvent & { payload: PinEventPayload } =>
  e.kind === "pin" && typeof e.payload === "object" && e.payload !== null && "pin" in e.payload;

function trackerOf(net: SimNetlist) {
  const board = net.parts.find((p) => p.kind === "board");
  const rails = railLevels(net);
  const byPin = new Map<string, PinState>();
  const boardPinOf = new Map<string, string[]>();
  for (const [pin, target] of Object.entries(board?.pins ?? {})) {
    if (target !== null) boardPinOf.set(target, [...(boardPinOf.get(target) ?? []), pin]);
  }
  return {
    record(p: PinEventPayload) {
      byPin.set(p.pin, { level: p.level === 1 ? 1 : 0, ...(p.duty !== undefined && p.hz !== undefined ? { duty: p.duty, hz: p.hz } : {}) });
    },
    signal(netId: string): PinState {
      const rail = rails.get(netId);
      if (rail !== undefined) return { level: rail };
      for (const pin of boardPinOf.get(netId) ?? []) {
        const state = byPin.get(pin);
        if (state) return state;
      }
      return { level: 0 };
    },
  };
}

function ioOf(channels: Channel[], tracker: ReturnType<typeof trackerOf>, run: MechRunIo): MechIo {
  const byMotor = new Map(channels.map((c) => [c.motorId, c.inputs]));
  return {
    pins(motorId): PinSample {
      const inputs = byMotor.get(motorId);
      if (!inputs) return { in1: 0, in2: 0, pwm: { level: 0 } };
      const pwm = tracker.signal(inputs.pwm);
      return {
        in1: tracker.signal(inputs.in1).level,
        in2: tracker.signal(inputs.in2).level,
        pwm: pwm.duty !== undefined && pwm.hz !== undefined ? { duty: pwm.duty, hz: pwm.hz } : { level: pwm.level },
        ...(inputs.stby ? { stby: tracker.signal(inputs.stby).level } : {}),
      };
    },
    ...run,
  };
}

/**
 * Validates the robot, loads the physics engine (once per page), and returns what is needed to start a run on it.
 * The Run bar hears `loading-physics` with the download size before the engine is requested.
 */
export async function prepareMech(doc: Project, net: SimNetlist, deps: MechDeps): Promise<Result<MechKit, MechRefusal>> {
  const sceneDeps = { describe: deps.describe, dmath: Math };
  const report = robotReport(doc, deps.describe);
  const { problems } = report;
  const errors = problems.filter((p) => p.severity === "error");
  if (errors.length > 0) {
    deps.onState("failed", { reason: "invalid-robot" });
    return fail({ code: "invalid-robot", message: `${errors.length} robot errors`, problems });
  }
  const channels = channelsOf(doc, net, deps);
  if (!channels.ok) {
    deps.onState("failed", { reason: channels.error.message });
    return channels;
  }
  const loaded = await loadRapier(deps);
  if (!loaded.ok) {
    deps.onState("failed", { reason: loaded.error.message });
    return loaded;
  }
  const backend = createRapierBackend(loaded.value.mod);
  try {
    await backend.load();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    deps.onState("failed", { reason: message });
    return fail({ code: "load-failed", message });
  }
  const built = buildScene(doc, sceneDeps);
  if (!built.ok) {
    deps.onState("failed", { reason: "invalid-robot" });
    return fail({ code: "invalid-robot", message: built.error.map((e) => e.message).join("; "), problems });
  }
  const { scene } = built.value;
  const data = doc.domains!.robotics!.data;
  const loopPin = (doc.ext as { "x-iynk-robot"?: { loopPin?: string } } | undefined)?.["x-iynk-robot"]?.loopPin;
  const batteryPart = doc.components.find((c) => deps.describe(c.definition.ref)?.mechanics?.battery);
  const nets = { pack: (batteryPart && net.parts.find((p) => p.id === batteryPart.id)?.pins.PLUS) || "", regulator: "", rail: "" };

  deps.onState("ready", { wireBytes: loaded.value.wireBytes });
  return ok({
    ...report,
    wireBytes: loaded.value.wireBytes,
    nets,
    start(runNet, run) {
      const tracker = trackerOf(runNet);
      const board = runNet.parts.find((p) => p.kind === "board");
      const logicV = board ? getProfile(board.descriptor.replace(/^core\./, "").replace(/@.*$/, "") as Parameters<typeof getProfile>[0]).logicV : 5;
      const seeded = (stream: string) => rng(runNet.settings.seed, stream);
      const motors: MotorBinding[] = channels.value.map((c) => ({
        channel: createMotorChannel({ motor: c.motor, gear: c.gear, driver: c.driver, id: c.motorId, joint: c.joint }) satisfies MotorChannel,
        wheelRadiusM: c.wheelRadiusM,
        chassis: c.chassis,
      }));
      const encoders: EncoderBank[] = channels.value.flatMap((c) =>
        c.encoder
          ? [
              {
                part: c.motorId,
                joint: c.joint,
                encoder: createEncoder({ countsPerRev: c.encoder.counts, channels: c.encoder.channels, index: c.encoder.index, onMotorShaft: true, gearRatio: c.gear.ratio }),
                pins: { a: "A", ...(c.encoder.channels === "ab" ? { b: "B" } : {}) },
              },
            ]
          : [],
      );
      const sensors: SensorPort[] = data.sensors.map((binding) => {
        const descriptor = deps.describe(doc.components.find((c) => c.id === binding.component)?.definition.ref ?? "")?.mechanics?.sensor;
        const sensor = createSensor(binding, descriptor, seeded);
        const count = descriptor?.channels ?? 0;
        return { sensor, part: binding.component, pins: Array.from({ length: count }, (_, i) => `OUT${i + 1}`), vLogic: logicV };
      });
      const mech = createMechEngine({
        backend,
        scene,
        channels: motors,
        encoders,
        sensors,
        terrain: { arena: data.arena, surfaces: data.surfaces },
        io: ioOf(channels.value, tracker, run),
        stepHz: STEP_HZ,
      });
      const loop = createLoopTiming();
      const track = data.arena.tracks[0];
      const chassis = motors[0]?.chassis;
      const samples: Array<{ atNs: number; x: number; y: number }> = [];
      const engine: Engine = {
        ...mech,
        onEvent(e) {
          if (isPin(e)) {
            tracker.record(e.payload);
            if (e.payload.pin === loopPin && e.payload.level === 1) loop.push(e.at);
          }
          mech.onEvent(e);
        },
      };
      return {
        engine,
        mech,
        takeFrame() {
          const frame = mech.frame();
          const body = chassis === undefined ? undefined : frame.bodies[chassis];
          if (body) samples.push({ atNs: frame.atNs, x: body.p[0] * 1e3, y: body.p[1] * 1e3 });
          return frame;
        },
        report(checkpoints) {
          return {
            runHash: checkpoints[checkpoints.length - 1] ?? mech.stateHash(),
            sceneHash: sceneHash(scene),
            checkpoints: [...checkpoints],
            run: track ? runMetrics(samples, track, track.width_mm) : null,
            loop: loop.stats().n > 0 ? loop.stats() : null,
          };
        },
        free: () => mech.free(),
      };
    },
  });
}
