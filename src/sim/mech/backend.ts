import type { ClockRate } from "./ports.ts";

export type Vec3 = [number, number, number];
/** Unit quaternion as x, y, z, w. */
export type Quat = [number, number, number, number];
export interface Pose {
  p: Vec3;
  q: Quat;
}

export type BodyId = string;
export type JointId = string;
export type ColliderId = string;
export type CombineRule = "average" | "min" | "max" | "multiply";

export interface Ray {
  origin: Vec3;
  /** Unit length. */
  dir: Vec3;
  maxM: number;
}
export interface RayHit {
  toiM: number;
  collider: ColliderId;
  normal: Vec3;
}

export interface BodyState {
  p: Vec3;
  q: Quat;
  v: Vec3;
  w: Vec3;
}
export interface JointState {
  angle: number;
  speed: number;
  torque: number;
}

export interface JointMotor {
  velocity?: number;
  position?: number;
  maxTorque: number;
  damping?: number;
}

/** What the engine reports for the settings the replay record pins. */
export interface ReadBack {
  combine: { friction: CombineRule; restitution: CombineRule };
  solverIterations: number;
  /** False when the engine cannot read the values back and these are the ones the adapter wrote. */
  engineConfirmed: boolean;
}

export interface PhysicsBackend {
  readonly name: "rapier" | "jolt";
  /** Pinned into every replay record. */
  readonly version: string;
  /** Prepares the engine and runs one dummy step: the first step of Rapier stalls 24 to 27 ms. */
  load(): Promise<void>;
  create(scene: SceneSpec, stepRate: ClockRate): PhysicsWorld;
}

export interface PhysicsWorld {
  /** One fixed step; dt comes from the step rate. Throws NumericFault or PhysicsDiverged. */
  step(): void;
  /** The only way iynk applies torque: tau * dt on the child, minus tau * dt on a dynamic parent. */
  applyJointTorqueImpulse(joint: JointId, newtonMetres: number): void;
  setJointMotor(joint: JointId, motor: JointMotor): void;
  body(id: BodyId): BodyState;
  /** `torque` is the torque applied through applyJointTorqueImpulse before the last step. */
  joint(id: JointId): JointState;
  /** Solid ray queries that ignore sensor colliders; null for a miss. */
  castRays(rays: readonly Ray[]): Array<RayHit | null>;
  contacts(): ContactEvent[];
  readBack(): ReadBack;
  /** The RS-13 hash: float32 bits of every body's p and q. Kept to compare with RS-13. */
  hash(): string;
  /** FNV-1a 64 over float64 bits of bodies and joints. This is the one used for checkpoints. */
  hash2(): string;
  snapshot(): Uint8Array;
  restore(bytes: Uint8Array): void;
  free(): void;
}

/** Built by the scene builder; every number is SI and lengthScale is applied inside the adapter only. */
export interface SceneSpec {
  gravity: Vec3;
  lengthScale: 1 | 10;
  sleeping: false;
  ccd: "off" | "auto";
  combine: { friction: CombineRule; restitution: CombineRule };
  solverIterations: number;
  /** Sorted by id. */
  bodies: BodySpec[];
  /** Sorted by body id, then collider id. */
  colliders: ColliderSpec[];
  /** Sorted by id. */
  joints: JointSpec[];
  /** Sorted by id. */
  statics: StaticSpec[];
}

export interface BodySpec {
  id: BodyId;
  pose: Pose;
  massKg: number;
  comM: Vec3;
  inertiaKgM2: Vec3;
  inertiaFrame: Quat;
  linearDamping: number;
  angularDamping: number;
  ccd: boolean;
  v0?: Vec3;
  w0?: Vec3;
}

export type ColliderShape =
  | { kind: "box"; halfM: Vec3 }
  | { kind: "cylinder"; radiusM: number; halfHeightM: number }
  | { kind: "sphere"; radiusM: number }
  | { kind: "convex"; pointsM: Vec3[] }
  | { kind: "trimesh"; verticesM: Float32Array; indices: Uint32Array };

export interface ColliderSpec {
  id: ColliderId;
  body: BodyId;
  shape: ColliderShape;
  localPose: Pose;
  friction: number;
  restitution: number;
  frictionCombine?: CombineRule;
  restitutionCombine?: CombineRule;
  sensor: boolean;
  noCollideWith: ColliderId[];
}

export interface JointSpec {
  id: JointId;
  kind: "fixed" | "revolute" | "prismatic";
  parent: BodyId;
  child: BodyId;
  parentFrame: Pose;
  childFrame: Pose;
  /** Unit vector in the joint frame; ignored for a fixed joint. */
  axis: Vec3;
  /** Radians (revolute) or metres (prismatic); absent means continuous. */
  limits?: { min: number; max: number };
  dampingNmsPerRad: number;
  frictionNm: number;
}

export interface StaticSpec {
  id: string;
  pose: Pose;
  shape: ColliderShape;
  friction: number;
  restitution: number;
  /** Read by line sensors. */
  surface?: string;
}

/** One entry per colliding pair per step, sorted by (a, b) in code-unit order. */
export interface ContactEvent {
  a: ColliderId;
  b: ColliderId;
  /** Deepest contact point in metres; the sensor position for a sensor overlap. */
  point: Vec3;
  /** Unit vector from a to b; zero for a sensor overlap. */
  normal: Vec3;
  /** Normal impulse of the pair over the last step, newton seconds. */
  impulse: number;
}

export class NumericFault extends Error {
  readonly body: BodyId;
  readonly step: number;

  constructor(body: BodyId, step: number) {
    super(`body ${body} has a non-finite state after step ${step}`);
    this.name = "NumericFault";
    this.body = body;
    this.step = step;
  }
}

export class PhysicsDiverged extends Error {
  readonly body: BodyId;
  readonly step: number;

  constructor(body: BodyId, step: number) {
    super(`body ${body} ran away at step ${step}`);
    this.name = "PhysicsDiverged";
    this.body = body;
    this.step = step;
  }
}

export class BadScene extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadScene";
  }
}
