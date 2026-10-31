import { LIMITS, NOMINAL_CELL } from "../../core/battery.ts";
import type { CheckId, RobotCheck, RunMetrics } from "../../core/robot-report.ts";
import type { Body, Joint, Track } from "../../project/generated/types.ts";
import { type GearParams, outputTorque, reflectedInertia } from "./gearbox.ts";
import { type MotorParams, paramsFromDescriptor as motorParams } from "./motor.ts";
import { createPack } from "./pack.ts";
import { type ComponentDescriptor, type Project } from "./ports.ts";
import { worldPose } from "./scene.ts";

export interface DutyProfile {
  cruise: number;
  stall: number;
  idle: number;
}

/** What a run of the solver found for the logic rail; RB-C-05 needs it and cannot be a formula. */
export interface SolvedRail {
  minV: number;
  thresholdV: number;
  limitingPart: string;
}

export interface CheckInput {
  doc: Project;
  /** Looks a part up by its definition ref, as the scene builder does. */
  describe(ref: string): ComponentDescriptor | undefined;
  slopeDeg: number;
  /** iynk's margin; 1.5 when absent. */
  marginX?: number;
  supplyV?: number;
  duty?: DutyProfile;
  /** Seconds between two speed readings, for RB-C-09. */
  loopPeriodS?: number;
  /** Speed the robot is meant to hold, for RB-C-09. Half the top speed when absent. */
  targetMps?: number;
  solvedRail?: SolvedRail;
}

const G = 9.81;
const MM = 1e-3;
const DEFAULT_MARGIN = 1.5;
const DEFAULT_DUTY: DutyProfile = { cruise: 0.8, stall: 0.05, idle: 0.15 };
const DEFAULT_LOOP_S = 0.02;
const MIN_ACCEL_MPS2 = 0.2;
const MIN_RUNTIME_MIN = 10;
const ENCODER_NOISE_SHARE = 0.1;
const RUNTIME_STEPS = 200;
const DEG = Math.PI / 180;

type Vec3 = [number, number, number];
type Result = RobotCheck["result"];

interface Wheel {
  jointId: string;
  componentId: string;
  motor: MotorParams;
  gear: GearParams;
  radiusM: number;
  crr: number;
  massKg: number;
}

interface Model {
  wheels: Wheel[];
  /** Driven wheels whose motor has no usable mechanics block. */
  motorGaps: string[];
  nDriven: number;
  massKg: number;
  massGaps: string[];
  cgM: Vec3;
  supplyV: number | undefined;
  vdropV: number;
  driver: { id: string; iMaxA: number } | undefined;
  battery: { id: string; block: NonNullable<NonNullable<ComponentDescriptor["mechanics"]>["battery"]> } | undefined;
}

function partsOf(i: CheckInput): { id: string; part: ComponentDescriptor }[] {
  return i.doc.components.flatMap((c) => {
    const part = i.describe(c.definition.ref);
    return part ? [{ id: c.id, part }] : [];
  });
}

function bodyMassKg(body: Body, i: CheckInput): number | undefined {
  const comp = body.component ? i.doc.components.find((c) => c.id === body.component) : undefined;
  const massG = body.mass_g ?? (comp ? i.describe(comp.definition.ref)?.mechanics?.mass_g : undefined);
  return massG !== undefined && massG > 0 ? massG * 1e-3 : undefined;
}

function bodyCentreM(body: Body, i: CheckInput): Vec3 | undefined {
  try {
    const [x, y, z] = worldPose(i.doc, body.frame, { describe: i.describe, dmath: Math }).position_mm;
    const [cx, cy, cz] = body.com_mm ?? [0, 0, 0];
    return [(x + cx) * MM, (y + cy) * MM, (z + cz) * MM];
  } catch {
    return undefined;
  }
}

function buildModel(i: CheckInput): Model {
  const data = i.doc.domains?.robotics?.data;
  const bodies = i.doc.mechanical?.bodies ?? [];
  const joints = i.doc.mechanical?.joints ?? [];
  const parts = partsOf(i);
  const refOf = new Map(i.doc.components.map((c) => [c.id, c.definition.ref]));

  const massGaps: string[] = [];
  let massKg = 0;
  const moment: Vec3 = [0, 0, 0];
  const massOf = new Map<string, number>();
  for (const body of bodies) {
    const m = bodyMassKg(body, i);
    const c = bodyCentreM(body, i);
    if (m === undefined || !c) {
      massGaps.push(body.id);
      continue;
    }
    massOf.set(body.id, m);
    massKg += m;
    for (let k = 0; k < 3; k++) moment[k] += m * c[k];
  }

  const wheels: Wheel[] = [];
  const motorGaps: string[] = [];
  const driven = joints.filter((j) => j.kind === "wheel" && j.drive);
  for (const joint of driven) {
    const componentId = joint.drive!.component;
    const ref = refOf.get(componentId);
    const block = ref === undefined ? undefined : i.describe(ref)?.mechanics?.motor;
    const params = block ? motorParams(block) : undefined;
    const spec = data?.wheels[joint.id];
    if (!block || !params?.ok || !spec) {
      motorGaps.push(componentId);
      continue;
    }
    wheels.push({
      jointId: joint.id,
      componentId,
      motor: params.value,
      gear: {
        ratio: block.gear?.ratio ?? 1,
        efficiency: block.gear?.efficiency ?? 1,
        backdrivable: true,
        jOutKgM2: block.gear?.j_out_kgm2 ?? 0,
      },
      radiusM: spec.radius_mm * MM,
      crr: spec.crr,
      massKg: massOf.get(joint.child) ?? 0,
    });
  }

  const battery = parts.find((p) => p.part.mechanics?.battery);
  const driver = parts.find((p) => p.part.mechanics?.driver);
  const cells = battery?.part.mechanics?.battery?.cells;
  return {
    wheels,
    motorGaps,
    nDriven: driven.length,
    massKg,
    massGaps,
    cgM: massKg > 0 ? [moment[0] / massKg, moment[1] / massKg, moment[2] / massKg] : [0, 0, 0],
    supplyV: i.supplyV ?? (cells ? cells * NOMINAL_CELL : undefined),
    vdropV: driver?.part.mechanics?.driver?.vdrop_v ?? 0,
    driver: driver && { id: driver.id, iMaxA: driver.part.mechanics?.driver?.i_max_a ?? Number.POSITIVE_INFINITY },
    battery: battery && { id: battery.id, block: battery.part.mechanics!.battery! },
  };
}

function open(id: CheckId, unit: string, formula: string, assumptions: string[]): RobotCheck {
  return { id, result: "warn", value: null, unit, limit: null, limitingPart: null, formula, assumptions };
}

/** The reasons a motor-and-mass check cannot be worked out, or none. */
function gapsOf(m: Model, needMass: boolean): string[] {
  const gaps: string[] = [];
  if (m.nDriven === 0) gaps.push("no driven wheels");
  if (m.motorGaps.length > 0) gaps.push(...m.motorGaps.map(() => "no mechanics.motor"));
  if (m.supplyV === undefined) gaps.push("no supply voltage (no mechanics.battery and no supplyV)");
  if (needMass && m.massGaps.length > 0) gaps.push(...m.massGaps.map((id) => `no mass for ${id}`));
  return [...new Set(gaps)];
}

const supplyAtMotor = (m: Model): number => Math.max(0, (m.supplyV ?? 0) - m.vdropV);

function wheelLoadNm(m: Model, w: Wheel, slopeDeg: number): number {
  const t = slopeDeg * DEG;
  return (m.massKg * G * (Math.sin(t) + w.crr * Math.cos(t)) * w.radiusM) / m.nDriven;
}

function stallTorqueAtWheelNm(m: Model, w: Wheel): number {
  const stall = (w.motor.keVsPerRad * supplyAtMotor(m)) / w.motor.rOhm;
  return outputTorque(w.gear, stall, 1);
}

/** Closed form on the linear motor line: the load torque sets the current, the current sets the drop below no-load speed. */
function wheelSpeed(m: Model, w: Wheel, slopeDeg: number): { vMps: number; iA: number } {
  const tauMotor = Math.max(0, wheelLoadNm(m, w, slopeDeg)) / (w.gear.ratio * w.gear.efficiency);
  const iA = tauMotor / w.motor.keVsPerRad + w.motor.iNoLoadA;
  const wMotor = (supplyAtMotor(m) - w.motor.rOhm * iA) / w.motor.keVsPerRad;
  return { vMps: Math.max(0, (w.radiusM * wMotor) / w.gear.ratio), iA };
}

function slowest(m: Model, slopeDeg: number): { vMps: number; limitingPart: string } {
  let out = { vMps: Number.POSITIVE_INFINITY, limitingPart: "" };
  for (const w of m.wheels) {
    const { vMps } = wheelSpeed(m, w, slopeDeg);
    if (vMps < out.vMps) out = { vMps, limitingPart: w.componentId };
  }
  return out.limitingPart ? out : { vMps: 0, limitingPart: "" };
}

/** Top speed on the stated slope; `limitingPart` is the driven motor that runs out first. */
export function topSpeed(i: CheckInput): { vMps: number; limitingPart: string } {
  const m = buildModel(i);
  return gapsOf(m, true).length > 0 ? { vMps: 0, limitingPart: "" } : slowest(m, i.slopeDeg);
}

function driveCheck(m: Model, i: CheckInput, marginX: number): RobotCheck {
  const formula = "tau_a = kt V / R * gear * eta against tau_w = m g (sin t + crr cos t) r / n; pass when tau_a >= tau_w * margin";
  if (m.nDriven === 0) {
    return { id: "RB-C-01", result: "fail", value: null, unit: "ratio", limit: marginX, limitingPart: null, formula, assumptions: ["no driven wheels"], causeId: "motor-stall" };
  }
  const gaps = gapsOf(m, true);
  if (gaps.length > 0) return open("RB-C-01", "ratio", formula, gaps);

  let margin = Number.POSITIVE_INFINITY;
  let limitingPart: string | null = m.wheels[0].componentId;
  for (const w of m.wheels) {
    const need = wheelLoadNm(m, w, i.slopeDeg);
    const ratio = need > 0 ? stallTorqueAtWheelNm(m, w) / need : Number.POSITIVE_INFINITY;
    if (ratio < margin) {
      margin = ratio;
      limitingPart = w.componentId;
    }
  }
  const pass = margin >= marginX;
  return {
    id: "RB-C-01",
    result: pass ? "ok" : "fail",
    value: Number.isFinite(margin) ? margin : null,
    unit: "ratio",
    limit: marginX,
    limitingPart,
    formula,
    assumptions: [`margin ${marginX} is iynk's margin`, `slope ${i.slopeDeg} degrees`, "load shared evenly between driven wheels"],
    ...(pass ? {} : { causeId: "motor-stall" }),
  };
}

function speedCheck(m: Model, i: CheckInput): RobotCheck {
  const formula = "v = r w_motor / gear with w_motor = (V - R i) / ke and i = tau_load / (kt gear eta) + i0";
  const gaps = gapsOf(m, true);
  if (gaps.length > 0) return open("RB-C-02", "m/s", formula, gaps);
  const { vMps, limitingPart } = slowest(m, i.slopeDeg);
  return {
    id: "RB-C-02",
    result: vMps > 0 ? "ok" : "fail",
    value: vMps,
    unit: "m/s",
    limit: null,
    limitingPart,
    formula,
    assumptions: [`slope ${i.slopeDeg} degrees`, `supply ${supplyAtMotor(m).toFixed(2)} V at the motor, after the driver drop`],
  };
}

function wheelInertiaKgM2(w: Wheel): number {
  return 0.5 * w.massKg * w.radiusM * w.radiusM + reflectedInertia(w.motor.jKgM2, w.gear);
}

function accelOf(m: Model): { aMps2: number; limitingPart: string } {
  let drive = 0;
  let inertia = m.massKg;
  let weakest = { share: Number.POSITIVE_INFINITY, part: m.wheels[0].componentId };
  let rolling = 0;
  for (const w of m.wheels) {
    const push = stallTorqueAtWheelNm(m, w) / w.radiusM;
    drive += push;
    rolling += w.crr * (m.massKg * G) / m.nDriven;
    inertia += wheelInertiaKgM2(w) / (w.radiusM * w.radiusM);
    if (push < weakest.share) weakest = { share: push, part: w.componentId };
  }
  return { aMps2: (drive - rolling) / inertia, limitingPart: weakest.part };
}

function accelCheck(m: Model): RobotCheck {
  const formula = "a = (n tau_a / r - crr m g) / (m + sum(J_w / r^2)), J_w with the wheel disc and the reflected rotor";
  const gaps = gapsOf(m, true);
  if (gaps.length > 0) return open("RB-C-03", "m/s^2", formula, gaps);
  const { aMps2, limitingPart } = accelOf(m);
  return {
    id: "RB-C-03",
    result: aMps2 <= 0 ? "fail" : aMps2 < MIN_ACCEL_MPS2 ? "warn" : "ok",
    value: aMps2,
    unit: "m/s^2",
    limit: MIN_ACCEL_MPS2,
    limitingPart,
    formula,
    assumptions: ["from standstill on the flat, at stall torque", `${MIN_ACCEL_MPS2} m/s^2 is iynk's default floor`],
  };
}

function stallCheck(m: Model): RobotCheck {
  const formula = "i_stall = (V - drop) / R per motor; a driver channel carries one motor, the pack carries all of them at once";
  const gaps = gapsOf(m, false);
  if (gaps.length > 0) return open("RB-C-04", "A", formula, gaps);

  const stalls = m.wheels.map((w) => supplyAtMotor(m) / w.motor.rOhm);
  const total = stalls.reduce((a, b) => a + b, 0);
  const limits: { part: string; demand: number; limit: number }[] = [];
  const assumptions = ["wire and rail rating is not stated by any part and is not checked"];
  if (m.driver) limits.push({ part: m.driver.id, demand: Math.max(...stalls), limit: m.driver.iMaxA });
  else assumptions.push("no mechanics.driver");
  const pack = m.battery?.block;
  if (pack?.c_continuous) {
    limits.push({ part: m.battery!.id, demand: total, limit: (pack.c_continuous * pack.capacity_mah * (pack.parallel ?? 1)) / 1000 });
  } else {
    assumptions.push("no battery c_continuous");
  }
  if (limits.length === 0) return open("RB-C-04", "A", formula, assumptions);

  const tight = limits.reduce((a, b) => (b.limit / b.demand < a.limit / a.demand ? b : a));
  const fails = tight.demand > tight.limit;
  return {
    id: "RB-C-04",
    result: fails ? "fail" : "ok",
    value: tight.demand,
    unit: "A",
    limit: tight.limit,
    limitingPart: tight.part,
    formula,
    assumptions,
    ...(fails ? { causeId: tight.part === m.driver?.id ? "driver-undersized" : "battery-sag-reset" } : {}),
  };
}

function railCheck(solved: SolvedRail | undefined): RobotCheck {
  const formula = "lowest logic rail voltage in a solved run against the logic minimum";
  if (!solved) return open("RB-C-05", "V", formula, ["needs a run"]);
  const fails = solved.minV < solved.thresholdV;
  return {
    id: "RB-C-05",
    result: fails ? "fail" : "ok",
    value: solved.minV,
    unit: "V",
    limit: solved.thresholdV,
    limitingPart: solved.limitingPart,
    formula,
    assumptions: ["taken from a solved run"],
    ...(fails ? { causeId: "battery-sag-reset" } : {}),
  };
}

/** Minutes a constant draw lasts on the pack model, until the cell cut-off or empty. */
function runtimeMin(m: Model, iA: number): number | string {
  const b = m.battery!.block;
  const pack = createPack({
    cells: b.cells,
    parallel: b.parallel ?? 1,
    capacityMah: b.capacity_mah,
    rCellOhm: b.r_cell_ohm,
    ...(b.chemistry && { chemistry: b.chemistry as "lipo" | "lihv" | "liion" }),
    ...(b.ocv_table && { ocvTable: b.ocv_table }),
  });
  if (!pack.ok) return pack.error.message;
  const cutV = b.chemistry && b.chemistry in LIMITS ? b.cells * LIMITS[b.chemistry as keyof typeof LIMITS].cut : 0;
  const stepS = (3.6 * b.capacity_mah * (b.parallel ?? 1)) / iA / RUNTIME_STEPS;
  let t = 0;
  for (let n = 0; n < 2 * RUNTIME_STEPS; n++) {
    pack.value.step(iA, stepS);
    t += stepS;
    if (pack.value.soc() <= 0 || pack.value.terminalV(iA) < cutV) break;
  }
  return t / 60;
}

function runtimeCheck(m: Model, i: CheckInput): RobotCheck {
  const formula = "t = battery energy / mean power over the duty profile, on the pack model with sag";
  const gaps = gapsOf(m, true);
  if (!m.battery) gaps.push("no mechanics.battery");
  if (gaps.length > 0) return open("RB-C-06", "min", formula, gaps);

  const duty = i.duty ?? DEFAULT_DUTY;
  let cruiseA = 0;
  let stallA = 0;
  for (const w of m.wheels) {
    cruiseA += wheelSpeed(m, w, i.slopeDeg).iA;
    stallA += supplyAtMotor(m) / w.motor.rOhm;
  }
  const shortest = runtimeMin(m, duty.cruise * cruiseA + duty.stall * stallA);
  const longest = runtimeMin(m, (duty.cruise + duty.stall) * cruiseA);
  if (typeof shortest === "string" || typeof longest === "string") return open("RB-C-06", "min", formula, [String(typeof shortest === "string" ? shortest : longest)]);
  return {
    id: "RB-C-06",
    result: shortest < MIN_RUNTIME_MIN ? "warn" : "ok",
    value: shortest,
    unit: "min",
    limit: MIN_RUNTIME_MIN,
    limitingPart: m.battery!.id,
    formula,
    assumptions: [
      `runtime ${shortest.toFixed(1)} to ${longest.toFixed(1)} min`,
      `profile: ${duty.cruise * 100}% cruise, ${duty.stall * 100}% stall, ${duty.idle * 100}% idle; the long end counts stall time as cruise`,
      "motors only, at constant current",
      `${MIN_RUNTIME_MIN} min is iynk's default floor`,
    ],
  };
}

function tipCheck(m: Model, i: CheckInput): RobotCheck {
  const formula = "atan(half_track / h_cg) against the slope; atan(d_cg_to_axle / h_cg) against the slope plus atan(a / g)";
  const gaps = gapsOf(m, true);
  if (gaps.length > 0) return open("RB-C-07", "deg", formula, gaps);

  const [cgX, cgY, cgZ] = m.cgM;
  const wheelCentres = (i.doc.mechanical?.joints ?? []).filter((j) => j.kind === "wheel").flatMap((j) => {
    const body = i.doc.mechanical?.bodies.find((b) => b.id === j.child);
    const c = body && bodyCentreM(body, i);
    return c ? [c] : [];
  });
  if (wheelCentres.length === 0) return open("RB-C-07", "deg", formula, ["no wheel positions"]);
  const ys = wheelCentres.map((c) => c[1]);
  const xs = wheelCentres.map((c) => c[0]);
  const halfTrackM = (Math.max(...ys) - Math.min(...ys)) / 2;
  const axleX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sideDeg = Math.atan2(halfTrackM - Math.abs(cgY - (Math.max(...ys) + Math.min(...ys)) / 2), cgZ) / DEG;
  const alongDeg = Math.atan2(Math.abs(cgX - axleX), cgZ) / DEG;
  const accelDeg = Math.atan(Math.max(0, accelOf(m).aMps2) / G) / DEG;
  const sideNeed = i.slopeDeg;
  const alongNeed = i.slopeDeg + accelDeg;
  const sideTight = sideDeg - sideNeed < alongDeg - alongNeed;
  const value = sideTight ? sideDeg : alongDeg;
  const limit = sideTight ? sideNeed : alongNeed;

  let high: { id: string; lift: number } | undefined;
  for (const body of i.doc.mechanical?.bodies ?? []) {
    const c = bodyCentreM(body, i);
    const mass = bodyMassKg(body, i);
    if (!c || mass === undefined) continue;
    const lift = mass * c[2];
    if (!high || lift > high.lift) high = { id: body.component ?? body.id, lift };
  }
  const marginX = i.marginX ?? DEFAULT_MARGIN;
  const result: Result = value <= limit ? "fail" : value < limit * marginX ? "warn" : "ok";
  return {
    id: "RB-C-07",
    result,
    value,
    unit: "deg",
    limit,
    limitingPart: high?.id ?? null,
    formula,
    assumptions: [
      "robot frame: x forward, y to the left, z up from the floor",
      "limiting part is the one whose mass times height lifts the centre of gravity most",
      `warns inside the ${marginX} margin`,
    ],
    ...(result === "fail" ? { causeId: "tip-over" } : {}),
  };
}

function descendants(joints: readonly Joint[], root: string): Set<string> {
  const out = new Set([root]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const j of joints) {
      if (out.has(j.parent) && !out.has(j.child)) {
        out.add(j.child);
        grew = true;
      }
    }
  }
  return out;
}

function holdingCheck(i: CheckInput, marginX: number): RobotCheck {
  const formula = "tau = |sum_i (r_i x m_i g) . axis| for the masses beyond the joint, against the servo stall or stepper holding torque";
  const joints = i.doc.mechanical?.joints ?? [];
  const bodies = i.doc.mechanical?.bodies ?? [];
  const refOf = new Map(i.doc.components.map((c) => [c.id, c.definition.ref]));
  const arms = joints.filter((j) => (j.kind === "revolute" || j.kind === "continuous") && j.drive);
  if (arms.length === 0) {
    return { id: "RB-C-08", result: "ok", value: null, unit: "N m", limit: null, limitingPart: null, formula, assumptions: ["no driven arm joints"] };
  }

  let out: RobotCheck | undefined;
  for (const joint of arms) {
    const componentId = joint.drive!.component;
    const ref = refOf.get(componentId);
    const mech = ref === undefined ? undefined : i.describe(ref)?.mechanics;
    const capacity = mech?.servo?.stall_torque_nm ?? mech?.stepper?.holding_torque_nm;
    const parent = bodies.find((b) => b.id === joint.parent);
    const parentC = parent && bodyCentreM(parent, i);
    if (capacity === undefined || !parentC) {
      out = open("RB-C-08", "N m", formula, [capacity === undefined ? "no mechanics.servo or mechanics.stepper" : `no position for ${joint.parent}`]);
      break;
    }
    const pivot: Vec3 = [parentC[0] + joint.origin.position_mm[0] * MM, parentC[1] + joint.origin.position_mm[1] * MM, parentC[2] + joint.origin.position_mm[2] * MM];
    const axis = joint.axis ?? [1, 0, 0];
    const norm = Math.hypot(axis[0], axis[1], axis[2]) || 1;
    let tau = 0;
    for (const body of bodies.filter((b) => descendants(joints, joint.child).has(b.id))) {
      const c = bodyCentreM(body, i);
      const mass = bodyMassKg(body, i);
      if (!c || mass === undefined) continue;
      const weight = mass * G;
      tau += (weight * ((c[0] - pivot[0]) * axis[1] - (c[1] - pivot[1]) * axis[0])) / norm;
    }
    tau = Math.abs(tau);
    const result: Result = tau > capacity ? "fail" : tau * marginX > capacity ? "warn" : "ok";
    const check: RobotCheck = {
      id: "RB-C-08",
      result,
      value: tau,
      unit: "N m",
      limit: capacity,
      limitingPart: componentId,
      formula,
      assumptions: ["joint axis and origin taken in the robot frame, without the joint rotation", `warns inside the ${marginX} margin`],
    };
    if (!out || worstRank(check.result) > worstRank(out.result) || (check.result === out.result && (check.limit ?? 1) / (check.value || 1) < (out.limit ?? 1) / (out.value || 1))) out = check;
  }
  return out!;
}

const worstRank = (r: Result): number => (r === "fail" ? 2 : r === "warn" ? 1 : 0);

function encoderCheck(m: Model, i: CheckInput): RobotCheck {
  const formula = "delta_s = 2 pi r / (counts_per_rev gear); delta_v = delta_s / T against a share of the target speed";
  const encoder = partsOf(i).find((p) => p.part.mechanics?.encoder);
  if (!encoder) return open("RB-C-09", "m/s", formula, ["no mechanics.encoder"]);
  const gaps = gapsOf(m, true);
  if (gaps.length > 0) return open("RB-C-09", "m/s", formula, gaps);

  const wheel = m.wheels[0];
  const periodS = i.loopPeriodS ?? DEFAULT_LOOP_S;
  const target = i.targetMps ?? slowest(m, i.slopeDeg).vMps / 2;
  const deltaS = (2 * Math.PI * wheel.radiusM) / (encoder.part.mechanics!.encoder!.counts_per_rev * wheel.gear.ratio);
  const deltaV = deltaS / periodS;
  const limit = ENCODER_NOISE_SHARE * target;
  return {
    id: "RB-C-09",
    result: deltaV > limit ? "warn" : "ok",
    value: deltaV,
    unit: "m/s",
    limit,
    limitingPart: encoder.id,
    formula,
    assumptions: [
      `speed read every ${periodS * 1000} ms`,
      `target ${target.toFixed(3)} m/s${i.targetMps === undefined ? " (half the top speed)" : ""}`,
      `${ENCODER_NOISE_SHARE * 100}% of the target is the default noise limit`,
      "counts_per_rev is counted on the motor shaft, one count per step",
    ],
  };
}

function sensorCheck(i: CheckInput): RobotCheck {
  const formula = "line sensor: height against its range and footprint against the track width; ranger: range_min against parts in the beam";
  const data = i.doc.domains?.robotics?.data;
  const refOf = new Map(i.doc.components.map((c) => [c.id, c.definition.ref]));
  const mounts = new Map((i.doc.mechanical?.mounts ?? []).map((mt) => [mt.id, mt]));
  const bodies = i.doc.mechanical?.bodies ?? [];
  const narrowest = Math.min(...(data?.arena.tracks ?? []).map((t) => t.width_mm));
  if (!data || data.sensors.length === 0) return open("RB-C-10", "mm", formula, ["no sensors"]);

  let out: RobotCheck | undefined;
  const consider = (check: RobotCheck) => {
    if (!out || worstRank(check.result) > worstRank(out.result)) out = check;
  };
  for (const binding of data.sensors) {
    if (binding.query !== "surface-sample" && binding.query !== "ray-fan") continue;
    const ref = refOf.get(binding.component);
    const sensor = ref === undefined ? undefined : i.describe(ref)?.mechanics?.sensor;
    const mount = mounts.get(binding.mount);
    const pick = (key: "range_max_mm" | "range_min_mm" | "footprint_mm" | "beam_deg") => binding.params?.[key] ?? sensor?.[key];
    const base = { id: "RB-C-10" as const, unit: "mm", formula, limitingPart: binding.component };
    if (!sensor || !mount) {
      consider({ ...open("RB-C-10", "mm", formula, [sensor ? `no mount ${binding.mount}` : "no mechanics.sensor"]), limitingPart: binding.component });
      continue;
    }
    let pose: ReturnType<typeof worldPose>;
    try {
      pose = worldPose(i.doc, mount.frame, { describe: i.describe, dmath: Math });
    } catch {
      consider({ ...open("RB-C-10", "mm", formula, [`no frame ${mount.frame}`]), limitingPart: binding.component });
      continue;
    }
    const at = [pose.position_mm[0] + mount.pose.position_mm[0], pose.position_mm[1] + mount.pose.position_mm[1], pose.position_mm[2] + mount.pose.position_mm[2]];

    if (binding.query === "surface-sample") {
      const rangeMax = pick("range_max_mm");
      const footprint = pick("footprint_mm");
      if (rangeMax === undefined) {
        consider({ ...open("RB-C-10", "mm", formula, ["no range_max_mm"]), limitingPart: binding.component });
        continue;
      }
      const wide = footprint !== undefined && Number.isFinite(narrowest) && footprint > narrowest;
      const high = at[2] > rangeMax;
      consider({
        ...base,
        result: high ? "fail" : wide ? "warn" : "ok",
        value: at[2],
        limit: rangeMax,
        assumptions: ["height is the mount height above the floor, without the mount rotation", ...(wide ? [`footprint ${footprint} mm is wider than the ${narrowest} mm track`] : [])],
        ...(high ? { causeId: "sensor-too-high" } : {}),
      });
    } else if (binding.query === "ray-fan") {
      const rangeMin = pick("range_min_mm");
      const beam = pick("beam_deg");
      if (rangeMin === undefined || beam === undefined) {
        consider({ ...open("RB-C-10", "mm", formula, ["no range_min_mm or beam_deg"]), limitingPart: binding.component });
        continue;
      }
      const yaw = (pose.rpy_deg[2] + mount.pose.rpy_deg[2]) * DEG;
      let nearest: { part: string; gap: number } | undefined;
      for (const body of bodies) {
        if (body.frame === mount.frame || body.component === binding.component || !body.shape) continue;
        const c = bodyCentreM(body, i);
        if (!c) continue;
        const dx = c[0] / MM - at[0];
        const dy = c[1] / MM - at[1];
        const dist = Math.hypot(dx, dy);
        const off = Math.abs(Math.atan2(dy, dx) - yaw);
        if (dist === 0 || Math.min(off, 2 * Math.PI - off) > (beam * DEG) / 2) continue;
        const gap = dist - extentMm(body.shape);
        if (!nearest || gap < nearest.gap) nearest = { part: body.component ?? body.id, gap };
      }
      const blocked = nearest && nearest.gap < rangeMin ? nearest : undefined;
      consider({
        ...base,
        limitingPart: blocked ? blocked.part : binding.component,
        result: blocked ? "fail" : "ok",
        value: nearest?.gap ?? null,
        limit: rangeMin,
        assumptions: ["a part is in the beam when its centre is inside the cone; its size is a bounding sphere"],
        ...(blocked ? { causeId: "ranger-beam-blocked" } : {}),
      });
    }
  }
  return out ?? open("RB-C-10", "mm", formula, ["no line or ranger sensor"]);
}

function extentMm(shape: NonNullable<Body["shape"]>): number {
  switch (shape.kind) {
    case "box":
      return Math.hypot(...shape.size_mm) / 2;
    case "cylinder":
      return Math.hypot(shape.radius_mm, shape.height_mm / 2);
    case "sphere":
      return shape.radius_mm;
    default:
      return 0;
  }
}

/** The ten checks of ROBOTICS 6.3, in id order. None of them runs a simulation. */
export function runChecks(i: CheckInput): RobotCheck[] {
  const m = buildModel(i);
  const marginX = i.marginX ?? DEFAULT_MARGIN;
  return [
    driveCheck(m, i, marginX),
    speedCheck(m, i),
    accelCheck(m),
    stallCheck(m),
    railCheck(i.solvedRail),
    runtimeCheck(m, i),
    tipCheck(m, i),
    holdingCheck(i, marginX),
    encoderCheck(m, i),
    sensorCheck(i),
  ];
}

interface Projection {
  crossMm: number;
  alongMm: number;
}

function project(points: readonly (readonly number[])[], closed: boolean, x: number, y: number): Projection {
  const n = closed ? points.length : points.length - 1;
  let best: Projection = { crossMm: Number.POSITIVE_INFINITY, alongMm: 0 };
  let walked = 0;
  for (let k = 0; k < n; k++) {
    const [ax, ay] = points[k];
    const [bx, by] = points[(k + 1) % points.length];
    const len = Math.hypot(bx - ax, by - ay);
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (len * len)));
    const cross = Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay)));
    if (cross < best.crossMm) best = { crossMm: cross, alongMm: walked + t * len };
    walked += len;
  }
  return best;
}

function lengthOf(points: readonly (readonly number[])[], closed: boolean): number {
  let sum = 0;
  const n = closed ? points.length : points.length - 1;
  for (let k = 0; k < n; k++) {
    const [ax, ay] = points[k];
    const [bx, by] = points[(k + 1) % points.length];
    sum += Math.hypot(bx - ax, by - ay);
  }
  return sum;
}

/** Turns a recorded run into text results. `x` and `y` are millimetres in the arena floor frame. */
export function runMetrics(frames: ReadonlyArray<{ atNs: number; x: number; y: number }>, track: Track, widthMm: number): RunMetrics {
  const total = lengthOf(track.points_mm, track.closed);
  if (frames.length === 0 || !(total > 0)) {
    return { maxCrossTrackMm: 0, onLineFraction: 0, laps: 0, progressMm: 0, text: ["No run to measure on this track."] };
  }

  let maxCross = 0;
  let onLine = 0;
  let progress = 0;
  let previous: number | undefined;
  for (const f of frames) {
    const p = project(track.points_mm, track.closed, f.x, f.y);
    maxCross = Math.max(maxCross, p.crossMm);
    if (p.crossMm <= widthMm / 2) onLine++;
    if (previous !== undefined) {
      let step = p.alongMm - previous;
      if (track.closed) step -= total * Math.round(step / total);
      progress += step;
    }
    previous = p.alongMm;
  }

  const laps = track.closed ? Math.max(0, Math.floor(progress / total + 1e-9)) : 0;
  const onLineFraction = onLine / frames.length;
  return {
    maxCrossTrackMm: maxCross,
    onLineFraction,
    laps,
    progressMm: progress,
    text: [
      `Furthest from the line: ${maxCross.toFixed(1)} mm.`,
      `On the line ${(onLineFraction * 100).toFixed(0)}% of the time.`,
      track.closed ? `Progress ${progress.toFixed(0)} mm, ${laps} ${laps === 1 ? "lap" : "laps"} of ${total.toFixed(0)} mm.` : `Progress ${progress.toFixed(0)} mm of ${total.toFixed(0)} mm.`,
    ],
  };
}
