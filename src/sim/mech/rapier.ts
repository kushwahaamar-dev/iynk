import {
  BadScene,
  type BodyId,
  type BodySpec,
  type BodyState,
  type ColliderId,
  type ColliderShape,
  type CombineRule,
  type ContactEvent,
  type JointId,
  type JointMotor,
  type JointSpec,
  type JointState,
  NumericFault,
  PhysicsDiverged,
  type PhysicsBackend,
  type PhysicsWorld,
  type Quat,
  type Ray,
  type RayHit,
  type ReadBack,
  type SceneSpec,
  type Vec3,
} from "./backend.ts";
import { hash2, hashRs13 } from "./hash.ts";
import { dmath, type ClockRate } from "./ports.ts";

export type RapierModule = typeof import("@dimforge/rapier3d-deterministic-compat");
type World = InstanceType<RapierModule["World"]>;
type RigidBody = InstanceType<RapierModule["RigidBody"]>;
type Collider = InstanceType<RapierModule["Collider"]>;
type UnitJoint = InstanceType<RapierModule["UnitImpulseJoint"]>;

const MAX_SPEED_MPS = 100;
const MAX_DISTANCE_M = 10_000;
const TWO_PI = 2 * Math.PI;
/** Groups for colliders that are free to touch everything; the other 15 bits name colliders with exclusions. */
const FREE_GROUP = 0x8000;
const MAX_EXCLUDING = 15;

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

function mul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

const conj = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];

function rotate(q: Quat, v: Vec3): Vec3 {
  const r = mul(mul(q, [v[0], v[1], v[2], 0]), conj(q));
  return [r[0], r[1], r[2]];
}

const asVec = (v: { x: number; y: number; z: number }): Vec3 => [v.x, v.y, v.z];
const asQuat = (q: { x: number; y: number; z: number; w: number }): Quat => [q.x, q.y, q.z, q.w];
const vec = ([x, y, z]: Vec3) => ({ x, y, z });
const rot = ([x, y, z, w]: Quat) => ({ x, y, z, w });
const isFinite3 = (v: readonly number[]): boolean => v.every(Number.isFinite);

interface BodyEntry {
  spec: BodySpec;
  rb: RigidBody;
}

interface JointEntry {
  spec: JointSpec;
  joint: UnitJoint;
  angle: number;
  torque: number;
  pendingTorque: number;
}

export function createRapierBackend(mod: RapierModule): PhysicsBackend {
  return {
    name: "rapier",
    /** The engine can report its version only after load(). */
    get version() {
      return mod.version();
    },
    async load() {
      await mod.init();
      const world = new mod.World({ x: 0, y: 0, z: 0 });
      world.step();
      world.free();
    },
    create: (scene, stepRate) => new RapierWorld(mod, scene, stepRate),
  };
}

class RapierWorld implements PhysicsWorld {
  private readonly world: World;
  private readonly k: number;
  private readonly dt: number;
  private readonly bodies = new Map<BodyId, BodyEntry>();
  private readonly staticBodies = new Map<string, RigidBody>();
  private readonly joints = new Map<JointId, JointEntry>();
  private readonly colliders = new Map<ColliderId, Collider>();
  private readonly colliderIds = new Map<number, ColliderId>();
  private stepCount = 0;
  private freed = false;
  private readonly mod: RapierModule;
  private readonly scene: SceneSpec;

  constructor(mod: RapierModule, scene: SceneSpec, stepRate: ClockRate) {
    this.mod = mod;
    this.scene = scene;
    this.k = scene.lengthScale;
    this.dt = stepRate.num / stepRate.den / 1e9;
    this.world = new mod.World(vec(scale(scene.gravity, this.k)));
    this.world.timestep = this.dt;
    this.world.integrationParameters.numSolverIterations = scene.solverIterations;
    const groups = this.collisionGroups();
    this.buildStatics();
    this.buildBodies(groups);
    this.buildJoints();
  }

  private combineRule(rule: CombineRule): number {
    const { CoefficientCombineRule: R } = this.mod;
    return { average: R.Average, min: R.Min, max: R.Max, multiply: R.Multiply }[rule];
  }

  private shapeDesc(shape: ColliderShape) {
    const { ColliderDesc: C } = this.mod;
    const { k } = this;
    switch (shape.kind) {
      case "box":
        return C.cuboid(shape.halfM[0] * k, shape.halfM[1] * k, shape.halfM[2] * k);
      case "cylinder":
        return C.cylinder(shape.halfHeightM * k, shape.radiusM * k);
      case "sphere":
        return C.ball(shape.radiusM * k);
      case "convex": {
        const desc = C.convexHull(new Float32Array(shape.pointsM.flatMap((p) => scale(p, k))));
        if (!desc) throw new BadScene("a convex collider has no hull");
        return desc;
      }
      case "trimesh":
        return C.trimesh(shape.verticesM.map((x) => x * k), shape.indices);
    }
  }

  /** Pairs that must not collide get their own group bit and a mask without their partners' bits. */
  private collisionGroups(): Map<ColliderId, number> {
    const partners = new Map<ColliderId, Set<ColliderId>>();
    for (const c of this.scene.colliders) {
      for (const other of c.noCollideWith) {
        (partners.get(c.id) ?? partners.set(c.id, new Set()).get(c.id)!).add(other);
        (partners.get(other) ?? partners.set(other, new Set()).get(other)!).add(c.id);
      }
    }
    if (partners.size > MAX_EXCLUDING) throw new BadScene(`more than ${MAX_EXCLUDING} colliders have collision exclusions`);
    const bits = new Map([...partners.keys()].sort().map((id, i) => [id, 1 << i]));
    const groups = new Map<ColliderId, number>();
    for (const c of this.scene.colliders) {
      const excluded = [...(partners.get(c.id) ?? [])].reduce((m, id) => m | (bits.get(id) ?? 0), 0);
      const group = bits.get(c.id) ?? FREE_GROUP;
      groups.set(c.id, ((group << 16) | (0xffff & ~excluded)) >>> 0);
    }
    return groups;
  }

  private buildStatics(): void {
    const { RigidBodyDesc } = this.mod;
    for (const s of this.scene.statics) {
      const rb = this.world.createRigidBody(
        RigidBodyDesc.fixed().setTranslation(...(scale(s.pose.p, this.k) as Vec3)).setRotation(rot(s.pose.q)),
      );
      const desc = this.shapeDesc(s.shape)
        .setFriction(s.friction)
        .setRestitution(s.restitution)
        .setFrictionCombineRule(this.combineRule(this.scene.combine.friction))
        .setRestitutionCombineRule(this.combineRule(this.scene.combine.restitution));
      const collider = this.world.createCollider(desc, rb);
      this.staticBodies.set(s.id, rb);
      this.colliders.set(s.id, collider);
      this.colliderIds.set(collider.handle, s.id);
    }
  }

  private buildBodies(groups: Map<ColliderId, number>): void {
    const { RigidBodyDesc } = this.mod;
    const { k } = this;
    for (const spec of this.scene.bodies) {
      const desc = RigidBodyDesc.dynamic()
        .setTranslation(...(scale(spec.pose.p, k) as Vec3))
        .setRotation(rot(spec.pose.q))
        .setCanSleep(false)
        .setLinearDamping(spec.linearDamping)
        .setAngularDamping(spec.angularDamping)
        .setAdditionalMassProperties(spec.massKg, vec(scale(spec.comM, k)), vec(scale(spec.inertiaKgM2, k * k)), rot(spec.inertiaFrame));
      if (this.scene.ccd === "auto" && spec.ccd) desc.setCcdEnabled(true);
      if (spec.v0) desc.setLinvel(...(scale(spec.v0, k) as Vec3));
      if (spec.w0) desc.setAngvel(vec(spec.w0));
      const rb = this.world.createRigidBody(desc);
      this.bodies.set(spec.id, { spec, rb });
      for (const c of this.scene.colliders) {
        if (c.body !== spec.id) continue;
        const cd = this.shapeDesc(c.shape)
          .setTranslation(...(scale(c.localPose.p, k) as Vec3))
          .setRotation(rot(c.localPose.q))
          .setDensity(0)
          .setFriction(c.friction)
          .setRestitution(c.restitution)
          .setFrictionCombineRule(this.combineRule(c.frictionCombine ?? this.scene.combine.friction))
          .setRestitutionCombineRule(this.combineRule(c.restitutionCombine ?? this.scene.combine.restitution))
          .setSensor(c.sensor)
          .setCollisionGroups(groups.get(c.id) ?? 0xffffffff);
        const collider = this.world.createCollider(cd, rb);
        this.colliders.set(c.id, collider);
        this.colliderIds.set(collider.handle, c.id);
      }
    }
    for (const c of this.scene.colliders) {
      if (!this.bodies.has(c.body)) throw new BadScene(`collider ${c.id} is on unknown body ${c.body}`);
    }
  }

  private buildJoints(): void {
    const { JointData } = this.mod;
    const { k } = this;
    for (const spec of this.scene.joints) {
      const parent = this.bodies.get(spec.parent)?.rb ?? this.staticBodies.get(spec.parent);
      const child = this.bodies.get(spec.child)?.rb;
      if (!parent) throw new BadScene(`joint ${spec.id} has unknown parent ${spec.parent}`);
      if (!child) throw new BadScene(`joint ${spec.id} has unknown child ${spec.child}`);
      const a1 = vec(scale(spec.parentFrame.p, k));
      const a2 = vec(scale(spec.childFrame.p, k));
      const axis1 = vec(rotate(spec.parentFrame.q, spec.axis));
      const axis2 = vec(rotate(spec.childFrame.q, spec.axis));
      const data =
        spec.kind === "fixed"
          ? JointData.fixed(a1, rot(spec.parentFrame.q), a2, rot(spec.childFrame.q))
          : spec.kind === "revolute"
            ? JointData.revoluteWithAxes(a1, a2, axis1, axis2)
            : JointData.prismatic(a1, a2, axis1);
      const joint = this.world.createImpulseJoint(data, parent, child, true) as UnitJoint;
      if (spec.kind !== "fixed") {
        if (spec.limits) joint.setLimits(spec.limits.min * this.lengthFactor(spec), spec.limits.max * this.lengthFactor(spec));
        joint.configureMotorModel(this.mod.MotorModel.ForceBased);
      }
      this.joints.set(spec.id, { spec, joint, angle: 0, torque: 0, pendingTorque: 0 });
    }
  }

  /** Metres to engine units for a joint coordinate: a prismatic joint measures length, a revolute one does not. */
  private lengthFactor(spec: JointSpec): number {
    return spec.kind === "prismatic" ? this.k : 1;
  }

  private alive(): void {
    if (this.freed) throw new Error("the world is freed");
  }

  private jointEntry(id: JointId): JointEntry {
    this.alive();
    const entry = this.joints.get(id);
    if (!entry) throw new BadScene(`unknown joint ${id}`);
    return entry;
  }

  private bodyEntry(id: BodyId): BodyEntry {
    this.alive();
    const entry = this.bodies.get(id);
    if (!entry) throw new BadScene(`unknown body ${id}`);
    return entry;
  }

  step(): void {
    this.alive();
    this.world.step();
    this.stepCount++;
    for (const [id, { rb }] of this.bodies) {
      const p = asVec(rb.translation());
      const q = asQuat(rb.rotation());
      const v = asVec(rb.linvel());
      const w = asVec(rb.angvel());
      if (![p, q, v, w].every(isFinite3)) throw new NumericFault(id, this.stepCount);
      if (Math.hypot(...v) / this.k > MAX_SPEED_MPS || Math.hypot(...p) / this.k > MAX_DISTANCE_M) {
        throw new PhysicsDiverged(id, this.stepCount);
      }
    }
    for (const entry of this.joints.values()) {
      entry.torque = entry.pendingTorque;
      entry.pendingTorque = 0;
      if (entry.spec.kind === "revolute") entry.angle = this.unwrappedAngle(entry);
    }
  }

  private frames(spec: JointSpec): { qp: Quat; qc: Quat } {
    const parent = this.bodies.get(spec.parent)?.rb ?? this.staticBodies.get(spec.parent)!;
    const child = this.bodies.get(spec.child)!.rb;
    return {
      qp: mul(asQuat(parent.rotation()), spec.parentFrame.q),
      qc: mul(asQuat(child.rotation()), spec.childFrame.q),
    };
  }

  /** Relative rotation about the joint axis, kept continuous against the previous step. */
  private unwrappedAngle(entry: JointEntry): number {
    const { qp, qc } = this.frames(entry.spec);
    const rel = mul(conj(qp), qc);
    const raw = 2 * dmath.atan2(dot([rel[0], rel[1], rel[2]], entry.spec.axis), rel[3]);
    const delta = raw - entry.angle;
    return entry.angle + delta - TWO_PI * Math.round(delta / TWO_PI);
  }

  applyJointTorqueImpulse(joint: JointId, newtonMetres: number): void {
    const entry = this.jointEntry(joint);
    const { spec } = entry;
    const child = this.bodies.get(spec.child)!.rb;
    const axis = rotate(asQuat(child.rotation()), rotate(spec.childFrame.q, spec.axis));
    const impulse = scale(axis, newtonMetres * this.dt * this.k * this.k);
    child.applyTorqueImpulse(vec(impulse), true);
    this.bodies.get(spec.parent)?.rb.applyTorqueImpulse(vec(scale(impulse, -1)), true);
    entry.pendingTorque += newtonMetres;
  }

  setJointMotor(joint: JointId, m: JointMotor): void {
    const { spec, joint: j } = this.jointEntry(joint);
    if (spec.kind === "fixed") throw new BadScene(`joint ${joint} is fixed and has no motor`);
    const length = this.lengthFactor(spec);
    j.setMotorMaxForce(m.maxTorque * (spec.kind === "revolute" ? this.k * this.k : this.k));
    if (m.position !== undefined) j.configureMotorPosition(m.position * length, m.maxTorque, m.damping ?? 0);
    else if (m.velocity !== undefined) j.configureMotorVelocity(m.velocity * length, m.damping ?? 1);
  }

  body(id: BodyId): BodyState {
    const { rb } = this.bodyEntry(id);
    const { k } = this;
    return {
      p: scale(asVec(rb.translation()), 1 / k),
      q: asQuat(rb.rotation()),
      v: scale(asVec(rb.linvel()), 1 / k),
      w: asVec(rb.angvel()),
    };
  }

  joint(id: JointId): JointState {
    const entry = this.jointEntry(id);
    const { spec } = entry;
    if (spec.kind === "fixed") return { angle: 0, speed: 0, torque: entry.torque };
    const parent = this.bodies.get(spec.parent)?.rb ?? this.staticBodies.get(spec.parent)!;
    const child = this.bodies.get(spec.child)!.rb;
    const { qp } = this.frames(spec);
    const axis = rotate(qp, spec.axis);
    const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    if (spec.kind === "revolute") {
      return { angle: entry.angle, speed: dot(sub(asVec(child.angvel()), asVec(parent.angvel())), axis), torque: entry.torque };
    }
    const anchor = (rb: RigidBody, frame: Vec3): Vec3 => {
      const offset = rotate(asQuat(rb.rotation()), frame);
      const at = asVec(rb.translation());
      return [at[0] + offset[0], at[1] + offset[1], at[2] + offset[2]];
    };
    const separation = sub(anchor(child, spec.childFrame.p), anchor(parent, spec.parentFrame.p));
    const speed = dot(sub(asVec(child.linvel()), asVec(parent.linvel())), axis);
    return { angle: dot(separation, axis) / this.k, speed: speed / this.k, torque: entry.torque };
  }

  castRays(rays: readonly Ray[]): Array<RayHit | null> {
    this.alive();
    const { k } = this;
    return rays.map((r) => {
      const ray = new this.mod.Ray(vec(scale(r.origin, k)), vec(r.dir));
      const hit = this.world.castRayAndGetNormal(ray, r.maxM * k, true, undefined, undefined, undefined, undefined, (c) => !c.isSensor());
      if (!hit) return null;
      return { toiM: hit.timeOfImpact / k, collider: this.colliderIds.get(hit.collider.handle)!, normal: asVec(hit.normal) };
    });
  }

  contacts(): ContactEvent[] {
    this.alive();
    const ids = [...this.colliders.keys()].sort();
    const events: ContactEvent[] = [];
    for (const a of ids) {
      const ca = this.colliders.get(a)!;
      this.world.contactPairsWith(ca, (cb) => {
        const b = this.colliderIds.get(cb.handle)!;
        if (a < b) this.collectContact(events, a, b, ca, cb);
      });
      this.world.intersectionPairsWith(ca, (cb) => {
        const b = this.colliderIds.get(cb.handle)!;
        if (a < b) events.push({ a, b, point: scale(asVec(ca.translation()), 1 / this.k), normal: [0, 0, 0], impulse: 0 });
      });
    }
    return events.sort((x, y) => (x.a < y.a ? -1 : x.a > y.a ? 1 : x.b < y.b ? -1 : x.b > y.b ? 1 : 0));
  }

  private collectContact(events: ContactEvent[], a: ColliderId, b: ColliderId, ca: Collider, cb: Collider): void {
    this.world.contactPair(ca, cb, (manifold, flipped) => {
      const solver = manifold.numSolverContacts();
      if (solver === 0) return;
      let deepest = 0;
      for (let i = 1; i < solver; i++) if (manifold.solverContactDist(i) < manifold.solverContactDist(deepest)) deepest = i;
      let impulse = 0;
      for (let i = 0; i < manifold.numContacts(); i++) impulse += manifold.contactImpulse(i);
      const point = manifold.solverContactPoint(deepest)!;
      const normal = asVec(manifold.normal());
      events.push({
        a,
        b,
        point: scale(asVec(point), 1 / this.k),
        normal: flipped ? scale(normal, -1) : normal,
        impulse: impulse / this.k,
      });
    });
  }

  readBack(): ReadBack {
    this.alive();
    const first = this.scene.colliders.find((c) => !c.frictionCombine && !c.restitutionCombine);
    const collider = first && this.colliders.get(first.id);
    const name = (rule: number): CombineRule => {
      const { CoefficientCombineRule: R } = this.mod;
      return rule === R.Min ? "min" : rule === R.Max ? "max" : rule === R.Multiply ? "multiply" : "average";
    };
    return {
      combine: collider
        ? { friction: name(collider.frictionCombineRule()), restitution: name(collider.restitutionCombineRule()) }
        : this.scene.combine,
      solverIterations: this.world.integrationParameters.numSolverIterations,
      engineConfirmed: true,
    };
  }

  hash(): string {
    this.alive();
    return hashRs13(this.scene.bodies.map((b) => this.body(b.id)));
  }

  hash2(): string {
    this.alive();
    return hash2(
      this.scene.bodies.map((b) => ({ id: b.id, ...this.body(b.id) })),
      this.scene.joints.map((j) => ({ id: j.id, ...this.joint(j.id) })),
    );
  }

  snapshot(): Uint8Array {
    throw new Error("not-verified");
  }

  restore(): void {
    throw new Error("not-verified");
  }

  free(): void {
    if (this.freed) return;
    this.freed = true;
    this.world.free();
  }
}
