import { DT, STEPS, HASH_EVERY, buildScene, motorTarget, StateHasher, summarise } from './common.mjs';

export function runJolt(Jolt, opts = {}) {
  const steps = opts.steps ?? STEPS;
  const sc = buildScene();
  const LAYER_STATIC = 0, LAYER_MOVING = 1;

  const settings = new Jolt.JoltSettings();
  settings.mMaxBodies = 64;
  settings.mMaxBodyPairs = 1024;
  settings.mMaxContactConstraints = 1024;
  const objectFilter = new Jolt.ObjectLayerPairFilterTable(2);
  objectFilter.EnableCollision(LAYER_STATIC, LAYER_MOVING);
  objectFilter.EnableCollision(LAYER_MOVING, LAYER_MOVING);
  const bpStatic = new Jolt.BroadPhaseLayer(0), bpMoving = new Jolt.BroadPhaseLayer(1);
  const bpInterface = new Jolt.BroadPhaseLayerInterfaceTable(2, 2);
  bpInterface.MapObjectToBroadPhaseLayer(LAYER_STATIC, bpStatic);
  bpInterface.MapObjectToBroadPhaseLayer(LAYER_MOVING, bpMoving);
  settings.mObjectLayerPairFilter = objectFilter;
  settings.mBroadPhaseLayerInterface = bpInterface;
  settings.mObjectVsBroadPhaseLayerFilter = new Jolt.ObjectVsBroadPhaseLayerFilterTable(bpInterface, 2, objectFilter, 2);
  const jolt = new Jolt.JoltInterface(settings);
  Jolt.destroy(settings);
  const physics = jolt.GetPhysicsSystem();
  const bi = physics.GetBodyInterface();

  const v3 = (x, y, z) => new Jolt.Vec3(x, y, z);
  const rv3 = (x, y, z) => new Jolt.RVec3(x, y, z);
  const cr = (min) => Math.min(0.02, min * 0.5);

  const shapeOf = (kind, size, density) => {
    let ss;
    if (kind === 'box') ss = new Jolt.BoxShapeSettings(v3(...size), cr(Math.min(...size)));
    else if (kind === 'cyl') ss = new Jolt.CylinderShapeSettings(size[0], size[1], cr(Math.min(size[0], size[1])));
    else ss = new Jolt.SphereShapeSettings(size[0]);
    ss.mDensity = density;
    return ss;
  };
  const create = (shapeSettings, pos, rot, motion, layer, friction) => {
    const shape = shapeSettings.Create().Get();
    const bcs = new Jolt.BodyCreationSettings(shape, rv3(...pos), new Jolt.Quat(...rot), motion, layer);
    bcs.mFriction = friction; bcs.mRestitution = 0; bcs.mAllowSleeping = false;
    const body = bi.CreateBody(bcs);
    Jolt.destroy(bcs);
    bi.AddBody(body.GetID(), Jolt.EActivation_Activate);
    return body;
  };

  create(new Jolt.BoxShapeSettings(v3(...sc.ground.half), 0.05), sc.ground.pos, [0, 0, 0, 1], Jolt.EMotionType_Static, LAYER_STATIC, sc.ground.friction);

  const bodies = sc.bodies.map((b) => {
    let ss = shapeOf(b.kind, b.size, b.density);
    if (b.caster) {
      const compound = new Jolt.StaticCompoundShapeSettings();
      compound.AddShape(v3(0, 0, 0), new Jolt.Quat(0, 0, 0, 1), ss);
      const ball = new Jolt.SphereShapeSettings(b.caster.radius);
      ball.mDensity = b.density;
      compound.AddShape(v3(...b.caster.pos), new Jolt.Quat(0, 0, 0, 1), ball);
      ss = compound;
    }
    return create(ss, b.pos, b.rot, Jolt.EMotionType_Dynamic, LAYER_MOVING, b.caster ? 0 : b.friction);
  });

  const motors = sc.joints.map((j) => {
    const wp = sc.bodies[j.wheel].pos;
    const hs = new Jolt.HingeConstraintSettings();
    hs.mSpace = Jolt.EConstraintSpace_WorldSpace;
    hs.mPoint1 = rv3(...wp); hs.mPoint2 = rv3(...wp);
    hs.mHingeAxis1 = v3(1, 0, 0); hs.mHingeAxis2 = v3(1, 0, 0);
    hs.mNormalAxis1 = v3(0, 1, 0); hs.mNormalAxis2 = v3(0, 1, 0);
    hs.mMotorSettings.mMinTorqueLimit = -j.maxTorque;
    hs.mMotorSettings.mMaxTorqueLimit = j.maxTorque;
    const c = Jolt.castObject(hs.Create(bodies[j.chassis], bodies[j.wheel]), Jolt.HingeConstraint);
    physics.AddConstraint(c);
    c.SetMotorState(Jolt.EMotorState_Velocity);
    return { c, j };
  });

  const hasher = new StateHasher();
  const hashes = [];
  const stepTimes = new Float64Array(steps);
  const snapshot = () => {
    hasher.reset();
    for (const body of bodies) {
      const p = body.GetPosition(), r = body.GetRotation();
      hasher.add(p.GetX(), p.GetY(), p.GetZ(), r.GetX(), r.GetY(), r.GetZ(), r.GetW());
    }
    return hasher.hex();
  };
  for (let s = 0; s < steps; s++) {
    for (const m of motors) m.c.SetTargetAngularVelocity(motorTarget(s, m.j));
    const t0 = performance.now();
    jolt.Step(DT, 1);
    stepTimes[s] = performance.now() - t0;
    if ((s + 1) % HASH_EVERY === 0) hashes.push(snapshot());
  }
  const pos = (b) => { const p = b.GetPosition(); return [p.GetX(), p.GetY(), p.GetZ()].map((v) => +v.toFixed(3)); };
  const out = { engine: 'jolt', hashes, finalHash: hashes[hashes.length - 1], nanWords: hasher.nan, timing: summarise(stepTimes), chassisA: pos(bodies[0]), chassisB: pos(bodies[5]) };
  Jolt.destroy(jolt);
  return out;
}
