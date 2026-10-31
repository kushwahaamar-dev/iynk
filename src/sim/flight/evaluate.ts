import type { Need } from "../../parts/mechanics.ts";
import { CELL_LIMITS, checkPack, packOpen } from "./battery.ts";
import type { Build } from "./build.ts";
import { makerKey } from "./build.ts";
import { runChecks, THRESHOLDS, type BuildCheck, type BuildError, type CheckInput } from "./checks.ts";
import { CLEARANCE_MM, propClash } from "./clash.ts";
import { enduranceRange, toPackModel, USABLE_DEFAULT, type EnduranceRange } from "./endurance.ts";
import { bandAt, type FitRecord, type FitResult } from "./fit.ts";
import { isOutOfRange, type OutOfRange } from "./guards.ts";
import { assemble, cgOffsetFraction, type MassProps } from "./mass.ts";
import {
  dutyForThrust,
  maxThrust,
  rotorOf,
  SEA_LEVEL_AIR,
  solveStatic,
  type Air,
  type Drive,
  type StaticPoint,
} from "./propulsion.ts";

export type OutputId = "thrust" | "current" | "hover" | "endurance" | "mass" | "cg" | "checks";

export interface Band {
  rel: number | null;
  basis: "fit" | "no-fit";
  inside: boolean;
}

export interface BuildOutputs {
  auw_g: number | null;
  thrustPerMotor_g: number | null;
  tw: number | null;
  hoverThrottle: number | null;
  hoverDuty: number | null;
  hoverAmps: number | null;
  maxAmps: number | null;
  endurance: EnduranceRange | null;
  checks: BuildCheck[];
  errors: BuildError[];
  mass: MassProps | null;
  cg: { offset_mm: number; meanArm_mm: number; fraction: number } | null;
  band: Band;
  tier: "T1";
  assumptions: string[];
  blocked: ReadonlyArray<{ output: OutputId; needs: Need[] }>;
}

export interface EvaluateOptions {
  air?: Air;
  classMinTW?: number;
  fast?: boolean;
}

const OUTPUTS: readonly OutputId[] = ["thrust", "current", "hover", "endurance", "mass", "cg", "checks"];
const SOLVED: readonly OutputId[] = ["thrust", "current", "hover", "endurance", "checks"];
const NEEDS_MASS: readonly OutputId[] = ["mass", "cg", "hover", "endurance", "checks"];

/** Fields whose absence blocks fewer outputs than the part they belong to. */
const FIELD_BLOCKS: Readonly<Record<string, readonly OutputId[]>> = {
  "mechanics.motor.i_noload_a": ["current", "hover", "endurance", "checks"],
  "mechanics.battery.capacity_mah": ["endurance", "checks"],
  "mechanics.esc.i_cont_a": ["checks"],
};

const G = 9.80665;
const GRAMS_PER_KG = 1000;
const MM_PER_M = 1000;
const IDLE_A = 0;

/** The outputs a missing field keeps from being shown. */
function blocksOf(path: string): readonly OutputId[] {
  const field = FIELD_BLOCKS[path];
  if (field) return field;
  const part = /^mechanics\.(\w+)(?:\.(\w+))?$/.exec(path);
  if (part) {
    const [, role, name] = part;
    if (name === "mass_g" || role === "frame" || role === "fc") return ["checks"];
    return role === "battery" ? SOLVED : [...SOLVED, "cg"];
  }
  if (path.startsWith("mechanical.mounts")) return ["cg", "checks"];
  if (path.startsWith("mechanical.bodies")) return NEEDS_MASS;
  if (path === "domains.drone.battery") return SOLVED;
  if (path === "domains.drone.motors") return [...SOLVED, "cg"];
  return OUTPUTS;
}

const needOf = (r: OutOfRange): Need => ({ path: r.field, why: `${r.value} is outside ${r.min} to ${r.max}` });

const fitOf = (r: FitRecord): FitResult => ({
  ct0: r.ct0,
  cp0: r.cp0,
  rms_thrust: r.rms_thrust,
  rms_current: r.rms_current,
  band: r.band,
  n: r.rows.length,
  v_range: r.v_range,
  throttle_range: r.throttle_range,
  converged: true,
  iterations: 0,
  warnings: [],
});

/** The widest band of any slot over the operating points; no claim when a slot has no fit. */
function bandOf(b: Build, points: ReadonlyArray<{ v_pack: number; throttle: number }>): Band {
  const none: Band = { rel: null, basis: "no-fit", inside: false };
  if (b.slots.length === 0 || points.length === 0) return none;
  let rel = 0;
  let inside = true;
  for (const slot of b.slots) {
    const record = b.fits.get(slot.id);
    if (!record) return none;
    for (const point of points) {
      const at = bandAt(fitOf(record), point.v_pack, point.throttle);
      if (at.rel === null) return none;
      rel = Math.max(rel, at.rel);
      inside &&= at.inside;
    }
  }
  return { rel, basis: "fit", inside };
}

/** Ratings that a maker states and the build exceeds, read back from the checks that tested them. */
function makerLimits(b: Build, checks: readonly BuildCheck[]): Array<{ part: string; field: string }> {
  const out: Array<{ part: string; field: string }> = [];
  const add = (part: string, role: "motor" | "prop" | "esc" | "battery", field: string) => {
    if (b.makerRated.has(makerKey(part, role))) out.push({ part, field: `mechanics.${role}.${field}` });
  };
  for (const c of checks) {
    if (c.result !== "warn" && c.result !== "fail") continue;
    const slot = b.slots.find((s) => s.id === c.limitingPart);
    if (c.id === "DB-C-03" && c.limitingPart) add(c.limitingPart, "esc", "i_cont_a");
    else if (c.id === "DB-C-04" && c.limitingPart) add(c.limitingPart, "battery", "c_continuous");
    else if (c.id === "DB-C-05" && c.limitingPart) {
      if (c.unit === "rpm" && slot) add(slot.propRef, "prop", "rpm_max");
      else if (slot) add(slot.motorRef, "motor", "v_max");
      else add(c.limitingPart, "esc", "v_max");
    }
  }
  return out;
}

const fieldError = (path: string): BuildError => ({ id: "DB-E-FIELD", message_key: "error.DB-E-FIELD", path });

/** Every output the build can answer. A missing field or a failed solve blocks the outputs that need it and nothing else. */
export function evaluateBuild(b: Build, opts: EvaluateOptions = {}): BuildOutputs {
  const air = opts.air ?? SEA_LEVEL_AIR;
  const classMinTW = opts.classMinTW ?? THRESHOLDS.minTW;
  const blocked = new Map<OutputId, Need[]>();
  const errors: BuildError[] = [];

  const block = (outputs: readonly OutputId[], need: Need) => {
    for (const output of outputs) {
      const needs = blocked.get(output) ?? [];
      if (!needs.some((n) => n.path === need.path && n.why === need.why)) needs.push(need);
      blocked.set(output, needs);
    }
  };
  const open = (id: OutputId) => !blocked.has(id);

  b.missing.forEach((need) => block(blocksOf(need.path), need));
  const pack = b.pack;
  if (!pack) block(SOLVED, { path: "domains.drone.battery", why: "no battery is chosen" });
  else if (!(pack.chem in CELL_LIMITS)) {
    block(SOLVED, { path: "mechanics.battery.chemistry", why: `${pack.chem} is not a chemistry the model knows` });
    errors.push({ id: "DB-E-CHEMISTRY", message_key: "error.DB-E-CHEMISTRY", path: "pack.chemistry" });
  } else {
    const bad = checkPack(pack);
    if (bad) block(SOLVED, needOf(bad));
  }

  let mass: MassProps | null = null;
  if (open("mass")) {
    const m = assemble(b.bodies);
    if (isOutOfRange(m)) block(NEEDS_MASS, needOf(m));
    else mass = m;
  }

  let cg: BuildOutputs["cg"] = null;
  if (open("cg") && mass) {
    const c = cgOffsetFraction(mass, b.slots.map((s) => s.axis_mm));
    if (isOutOfRange(c)) block(["cg", "checks"], needOf(c));
    else cg = c;
  }

  let drives: Drive[] | null = null;
  let full: StaticPoint | null = null;
  if (open("thrust") && pack) {
    const shared = new Map<string, Drive>();
    const made: Drive[] = [];
    for (const s of b.slots) {
      const key = `${s.motorRef}|${s.propRef}|${s.escRef}`;
      let drive = shared.get(key);
      if (!drive) {
        const rotor = rotorOf(s.motor, s.prop, air);
        if (isOutOfRange(rotor)) {
          block(SOLVED, needOf(rotor));
          break;
        }
        drive = { rotor, escEff: s.esc.efficiency };
        shared.set(key, drive);
      }
      made.push(drive);
    }
    if (open("thrust")) {
      const top = maxThrust(made, 1, toPackModel(pack, IDLE_A));
      if (isOutOfRange(top)) block(SOLVED, needOf(top));
      else {
        drives = made;
        full = top;
      }
    }
  }

  const fullThrust_n = full ? full.motors.reduce((sum, m) => sum + m.thrust_n, 0) : 0;
  const weight_n = mass ? (mass.mass_g / GRAMS_PER_KG) * G : 0;

  let hoverDuty: number | null = null;
  let hoverPoint: StaticPoint | null = null;
  if (open("hover") && drives && full && pack && weight_n > 0) {
    const duty = dutyForThrust(drives, 1, toPackModel(pack, IDLE_A), weight_n);
    if (duty !== "unreachable") {
      const point = solveStatic(drives, duty, 1, toPackModel(pack, IDLE_A));
      if (isOutOfRange(point)) block(["hover", "endurance", "checks"], needOf(point));
      else {
        hoverDuty = duty;
        hoverPoint = point;
      }
    }
  }

  const band = full
    ? bandOf(b, [{ v_pack: full.v_pack, throttle: 1 }, ...(hoverPoint && hoverDuty !== null ? [{ v_pack: hoverPoint.v_pack, throttle: hoverDuty }] : [])])
    : bandOf(b, []);

  let endurance: EnduranceRange | null = null;
  if (open("endurance") && drives && pack && weight_n > 0) {
    const range = enduranceRange(
      { drives, pack, weight_n, usable: USABLE_DEFAULT, idle_a: IDLE_A, air, ...(opts.fast && { fast: true }) },
      band.rel,
    );
    if (isOutOfRange(range)) block(["endurance"], needOf(range));
    else endurance = range;
  }

  const hoverThrottle = open("hover") && fullThrust_n > 0 && weight_n > 0 ? Math.sqrt(weight_n / fullThrust_n) : null;
  let checks: BuildCheck[] = [];
  if (open("checks") && drives && full && mass && cg && pack && hoverThrottle !== null) {
    const discs = b.slots.map((s) => ({ id: s.id, x_mm: s.axis_mm[0], y_mm: s.axis_mm[1], z_mm: s.z_mm, r_mm: (s.prop.d_m * MM_PER_M) / 2 }));
    const torque = (hoverPoint ?? full).motors.map((m) => m.torque_nm);
    const input: CheckInput = {
      auw_n: weight_n,
      auw_g: mass.mass_g,
      slots: b.slots.map((s) => ({ ...s, label: s.id, escLabel: s.escRef })),
      pack,
      packLabel: b.packRef,
      frame: b.frame,
      fc: b.fc,
      flight: b.flight,
      full: {
        thrust_n: fullThrust_n,
        i_pack_a: full.i_pack,
        i_motor_a: full.motors.map((m) => m.current_a),
        rpm_noload: b.slots.map((s) => s.motor.kv_rpm_per_v * packOpen(pack, 1)),
        v_cell_loaded: full.v_pack / pack.cells,
      },
      hover: { throttle: hoverThrottle, torque_nm: torque },
      endurance,
      mass,
      cg: { fraction: cg.fraction },
      clash: propClash(discs, CLEARANCE_MM),
      classMinTW,
      makerLimitsExceeded: [],
      missing: [],
    };
    const first = runChecks(input);
    const maker = makerLimits(b, first.checks);
    const run = maker.length > 0 ? runChecks({ ...input, makerLimitsExceeded: maker }) : first;
    checks = run.checks;
    errors.push(...run.errors);
  } else {
    const paths = new Set((blocked.get("checks") ?? []).map((n) => n.path));
    paths.forEach((path) => errors.push(fieldError(path)));
  }

  const assumptions = [
    ...b.assumed.map((path) => `${path} uses a default`),
    `${Math.round(USABLE_DEFAULT * 100)} percent of the capacity is flown`,
    `air density ${air.rho_kgm3} kg/m3`,
    "no current is drawn besides the motors",
    ...(band.basis === "no-fit" ? ["no datasheet fit covers every prop, so no error band is claimed"] : []),
  ];

  return {
    auw_g: mass?.mass_g ?? null,
    thrustPerMotor_g: full ? (fullThrust_n / full.motors.length / G) * GRAMS_PER_KG : null,
    tw: open("hover") && fullThrust_n > 0 && weight_n > 0 ? fullThrust_n / weight_n : null,
    hoverThrottle,
    hoverDuty,
    hoverAmps: hoverPoint?.i_pack ?? null,
    maxAmps: open("current") && full ? full.i_pack : null,
    endurance,
    checks,
    errors,
    mass,
    cg,
    band,
    tier: "T1",
    assumptions,
    blocked: OUTPUTS.filter((output) => blocked.has(output)).map((output) => ({ output, needs: blocked.get(output) ?? [] })),
  };
}
