import { autopilot } from "./autopilot";
import { voltageFactor } from "./battery";
import { bodyAxes, clamp, DEG, expo, G, type Vec3 } from "./math";
import { ceilingOf, emit, groundContact, windAt, type SimState } from "./state";
import { vtolTransition } from "./wing";

export function multirotorStep(s: SimState, dt: number) {
  const c = s.craft, calc = s.calc, m = s.mode, st = s.sticks;
  const mass = (calc.auw - s.dropped) / 1000;
  const n = calc.motors;
  const lost = s.motorsOut.length + (s.desyncT > 0 ? 1 : 0);
  const tmax = ((n * calc.thrustPerMotor) / 1000) * G * Math.max(0, (n - lost) / n);
  const kV = s.battery.empty ? 0 : voltageFactor(calc, s.battery.volt);
  const live = s.armed && !s.crashed;
  const auto = live ? autopilot(s) : { pitch: null, roll: null, yawRate: null, climb: null };
  const grounded = s.p[2] <= 0.02 && s.thrust < 0.3 * mass * G;
  const rate = c.acroRate * (m.rateScale ?? 1);
  const limit = m.angleLimit ?? c.angleLimit;
  const e = m.expo ?? 0;

  // a quad has no spare motor: with one out the flight controller cannot hold the attitude
  const uncontrolled = s.motorsOut.length > 0 && n <= 4 && live;
  if (uncontrolled) {
    s.roll += 400 * dt;
    s.yaw += 300 * dt;
  } else if (grounded) {
    s.roll *= 0.8;
    s.pitch *= 0.8;
  } else if (m.attitude === "acro" && auto.pitch === null) {
    s.roll += expo(st.roll, e) * rate * dt;
    s.pitch += expo(st.pitch, e) * rate * dt;
  } else {
    const tp = auto.pitch ?? expo(st.pitch, e) * limit;
    const tr = auto.roll ?? expo(st.roll, e) * limit;
    const k = Math.min(1, c.levelRate * dt);
    s.pitch += (clamp(tp, -limit, limit) - s.pitch) * k;
    s.roll += (clamp(tr, -limit, limit) - s.roll) * k;
  }

  // yaw: props' reaction torque, or the tricopter's tail servo
  // expo shapes roll and pitch only: the CLIs set yaw with no expo (quad5: yaw_rc_rate = yaw_srate = 20)
  const yawCmd = auto.yawRate !== null ? -auto.yawRate / (c.yawRate * (m.rateScale ?? 1)) : st.yaw;
  if (c.tailServo) {
    // Reversed (fitted backwards, or reversed in the mixer): each yaw correction adds to the turn, so in the air the
    // servo runs to its stop the way it is already leaning and the tri pirouettes.
    const want = s.faults.servosReversed && !grounded ? Math.sign(s.servo || yawCmd || 1) : clamp(yawCmd, -1, 1);
    const target = want * c.tailServo.maxDeg;
    const stepMax = c.tailServo.rateDegS * dt;
    s.servo += clamp(target - s.servo, -stepMax, stepMax);
    if (!grounded) s.yaw += -(s.servo / c.tailServo.maxDeg) * c.yawRate * (m.rateScale ?? 1) * dt;
  } else if (!grounded) s.yaw += -yawCmd * c.yawRate * (m.rateScale ?? 1) * dt;

  // throttle
  let cmd = 0;
  if (live) {
    if (m.throttle === "climb" || auto.climb !== null) {
      const stickClimb = Math.abs(st.throttle - 0.5) < 0.05 ? 0 : (st.throttle - 0.5) * 2;
      const climb = auto.climb ?? stickClimb;
      const up = bodyAxes(s.yaw, s.pitch, s.roll).up;
      if (s.p[2] <= 0.02 && climb <= 0 && !s.airborne) cmd = 0;
      else {
        const need = (mass * (G + 3 * (climb * c.climbRate - s.v[2]))) / Math.max(1e-6, tmax * kV) / Math.max(0.4, up[2]);
        cmd = Math.sqrt(clamp(need, 0, 1));
      }
    } else cmd = clamp(st.throttle, 0, 1);
    if (m.task === "rtl" || m.task === "qrtl") {
      if (s.phase === "descend" && s.p[2] <= 0.03 && s.airborne === false) cmd = 0;
    }
  }
  if (!live) s.u = Math.max(0, s.u - 3 * dt);
  else s.u += (cmd - s.u) * Math.min(1, c.spool * dt);

  // faults that show on take-off
  const f = s.u * s.u;
  if (live && s.t > 0.25 && f > 0.05) {
    const flip = s.faults.fcReversed ? "flipFc" : s.faults.propsSwapped ? "flipProps" : s.faults.motorDirUnchecked ? "flipMotor" : null;
    if (flip) {
      s.flipWhy = flip;
      s.roll += 900 * dt * (flip === "flipFc" ? 1 : -1);
      s.pitch += 500 * dt;
    }
  }
  // a pirouette the stick cannot stop: after about 1.5 s at full yaw the tri loses its level and goes over, as hard
  // as a flip (the self-levelling of angle and althold would hold anything gentler)
  if (live && c.tailServo && s.faults.servosReversed && s.airborne) {
    s.pirouette += dt;
    if (s.pirouette > 1.5) {
      s.flipWhy = "flipServo";
      s.roll += 900 * dt;
      s.pitch += 300 * dt;
    }
  }
  if (calc.overKv && live) {
    s.heat += dt * f * 1.6;
    if (s.heat > 9 && s.desyncT <= 0) {
      s.desyncT = 0.4;
      s.heat -= 3;
      emit(s, { type: "desync", motor: Math.min(3, n) });
    }
  }
  s.heat = Math.max(0, s.heat - dt * 0.35);
  if (s.desyncT > 0) {
    s.desyncT -= dt;
    s.roll += 260 * dt;
    s.yaw += 120 * dt;
  }
  if (s.motorsOut.length && live && n > 4) s.yaw += (6 * dt * 4) / n; // less yaw authority: a slow drift

  // forces
  const ceil = ceilingOf(s);
  const fade = s.p[2] > ceil - 3 ? Math.max(0, 1 - (s.p[2] - ceil + 3) / 3) : 1;
  s.thrust = f * tmax * kV * fade;
  let { up } = bodyAxes(s.yaw, s.pitch, s.roll);
  if (c.vtol && s.tilt > 0) {
    // tilted motors push forward; the wing adds lift with airspeed
    const ax = bodyAxes(s.yaw, s.pitch, s.roll);
    const a = s.tilt * 90 * DEG;
    up = [ax.up[0] * Math.cos(a) + ax.fwd[0] * Math.sin(a), ax.up[1] * Math.cos(a) + ax.fwd[1] * Math.sin(a), ax.up[2] * Math.cos(a) + ax.fwd[2] * Math.sin(a)];
  }
  const [wx, wy] = windAt(s);
  const rx = s.v[0] - wx, ry = s.v[1] - wy, rz = s.v[2];
  const rel = Math.hypot(rx, ry, rz);
  const a: Vec3 = [
    (up[0] * s.thrust) / mass - c.drag * rx * (rel + 1),
    (up[1] * s.thrust) / mass - c.drag * ry * (rel + 1),
    (up[2] * s.thrust) / mass - c.drag * rz * (rel + 1) - G,
  ];
  if (c.vtol) vtolTransition(s, a, dt);
  if (c.tailServo && s.thrust > 0) {
    // the tilted tail motor also pushes sideways a little
    const side = (Math.sin(s.servo * DEG) * s.thrust) / 3 / mass;
    const fx = Math.cos(s.yaw * DEG), fy = Math.sin(s.yaw * DEG);
    a[0] += -side * -fy * 0.3;
    a[1] += -side * fx * 0.3;
  }
  for (let i = 0; i < 3; i++) s.v[i] += a[i] * dt;
  for (let i = 0; i < 3; i++) s.p[i] += s.v[i] * dt;
  groundContact(s, false);
}
