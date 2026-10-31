import { DT, STEPS, HASH_EVERY, buildScene, motorTarget, StateHasher, summarise } from './common.mjs';

export async function initRapier(RAPIER) { await RAPIER.init(); }

export function runRapier(RAPIER, opts = {}) {
  const steps = opts.steps ?? STEPS;
  const sc = buildScene();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = DT;

  const gb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...sc.ground.pos));
  world.createCollider(RAPIER.ColliderDesc.cuboid(...sc.ground.half).setFriction(sc.ground.friction), gb);

  const rb = sc.bodies.map((b) => {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(...b.pos)
        .setRotation({ x: b.rot[0], y: b.rot[1], z: b.rot[2], w: b.rot[3] }).setCanSleep(false));
    const shape = b.kind === 'box' ? RAPIER.ColliderDesc.cuboid(...b.size)
      : b.kind === 'cyl' ? RAPIER.ColliderDesc.cylinder(b.size[0], b.size[1])
      : RAPIER.ColliderDesc.ball(b.size[0]);
    world.createCollider(shape.setDensity(b.density).setFriction(b.friction).setRestitution(0), body);
    if (b.caster) {
      const c = RAPIER.ColliderDesc.ball(b.caster.radius).setTranslation(...b.caster.pos)
        .setDensity(b.density).setFriction(0).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setRestitution(0);
      world.createCollider(c, body);
    }
    return body;
  });

  const motors = sc.joints.map((j) => {
    const cb = sc.bodies[j.chassis], wb = sc.bodies[j.wheel];
    const anchor1 = { x: wb.pos[0] - cb.pos[0], y: wb.pos[1] - cb.pos[1], z: wb.pos[2] - cb.pos[2] };
    const data = RAPIER.JointData.revoluteWithAxes(anchor1, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
    const joint = world.createImpulseJoint(data, rb[j.chassis], rb[j.wheel], true);
    joint.configureMotorModel(RAPIER.MotorModel.ForceBased);
    joint.setMotorMaxForce(j.maxTorque);
    return { joint, j };
  });

  const hasher = new StateHasher();
  const hashes = [];
  const stepTimes = new Float64Array(steps);
  const snapshot = () => {
    hasher.reset();
    for (const body of rb) {
      const t = body.translation(), r = body.rotation();
      hasher.add(t.x, t.y, t.z, r.x, r.y, r.z, r.w);
    }
    return hasher.hex();
  };
  for (let s = 0; s < steps; s++) {
    for (const m of motors) m.joint.configureMotorVelocity(motorTarget(s, m.j), m.j.damping);
    const t0 = performance.now();
    world.step();
    stepTimes[s] = performance.now() - t0;
    if ((s + 1) % HASH_EVERY === 0) hashes.push(snapshot());
  }
  const out = {
    engine: 'rapier', hashes, finalHash: hashes[hashes.length - 1], nanWords: hasher.nan,
    timing: summarise(stepTimes),
    chassisA: [...Object.values(rb[0].translation())].map((v) => +v.toFixed(3)),
    chassisB: [...Object.values(rb[5].translation())].map((v) => +v.toFixed(3)),
  };
  world.free();
  return out;
}
