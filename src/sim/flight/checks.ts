import type { EscSI, FcSI, FrameSI, MotorSI, Need, PropSI } from "../../parts/mechanics.ts";
import { CELL_LIMITS, type PackSI } from "./battery.ts";
import type { ClashResult } from "./clash.ts";
import type { EnduranceRange } from "./endurance.ts";
import { isOutOfRange, type OutOfRange } from "./guards.ts";
import { isPositiveDefinite, type MassProps } from "./mass.ts";

export type CheckId =
  | "DB-C-01" | "DB-C-02" | "DB-C-03" | "DB-C-04" | "DB-C-05" | "DB-C-06" | "DB-C-07"
  | "DB-C-08" | "DB-C-09" | "DB-C-10" | "DB-C-11" | "DB-C-12" | "DB-C-13" | "DB-C-14";

export type CheckResult = "ok" | "warn" | "fail" | "info";

export interface BuildCheck {
  id: CheckId;
  result: CheckResult;
  value: number | null;
  limit: number | null;
  unit: string;
  limitingPart: string | null;
  formula: string;
  assumptions: string[];
  tier: "T1";
  cause_id: string | null;
  symptom_id: string | null;
}

export type BuildErrorId = "DB-E-INERTIA" | "DB-E-MIXER" | "DB-E-MIXER-YAW" | "DB-E-FIELD" | "DB-E-CHEMISTRY";

export interface BuildError {
  id: BuildErrorId;
  message_key: string;
  path: string | null;
}

export const THRESHOLDS = Object.freeze({
  minTW: 2.0,
  hoverThrottle: 0.6,
  cgWarn: 0.05,
  cgFail: 0.12,
  yawBalance: 0.05,
  massChipG: 250,
  shortFlightMin: 2,
  clearanceMm: 5,
});

const LIION_CELL_A = 45;
const FULL_CELL_V = { lipo: 4.2, lihv: 4.35, liion: 4.2 } as const;
const IN_PER_M = 39.37;
const RANK_TOLERANCE = 1e-9;

export interface CheckSlot {
  id: string;
  label: string;
  motor: MotorSI;
  prop: PropSI;
  esc: EscSI;
  escLabel: string;
  spin: "cw" | "ccw";
  prop_spin: "cw" | "ccw";
  axis_mm: readonly [number, number];
  z_mm: number;
}

export interface CheckInput {
  auw_n: number;
  auw_g: number;
  slots: ReadonlyArray<CheckSlot>;
  pack: PackSI;
  packLabel: string;
  frame: FrameSI | null;
  fc: FcSI | null;
  flight: {
    model: "flight-game@1" | "multirotor-rigid@1";
    step_hz?: number;
    pid_hz?: number;
    gyroLpfHz?: number;
  };
  full: {
    thrust_n: number;
    i_pack_a: number;
    i_motor_a: readonly number[];
    rpm_noload: readonly number[];
    v_cell_loaded: number;
  };
  hover: { throttle: number; torque_nm: readonly number[] };
  endurance: EnduranceRange | null;
  mass: MassProps | null;
  cg: { fraction: number } | null;
  clash: ClashResult | OutOfRange;
  classMinTW: number;
  makerLimitsExceeded: ReadonlyArray<{ part: string; field: string }>;
  missing: readonly Need[];
}

const spinSign = (s: "cw" | "ccw") => (s === "cw" ? 1 : -1);

function make(id: CheckId, c: Partial<BuildCheck> & Pick<BuildCheck, "result" | "formula" | "unit">): BuildCheck {
  return {
    value: null,
    limit: null,
    limitingPart: null,
    assumptions: [],
    tier: "T1",
    cause_id: null,
    symptom_id: null,
    ...c,
    id,
  };
}

/** The entry with the largest `ratio`; null for an empty list. */
function worstBy<T>(items: readonly T[], ratio: (t: T) => number): T | null {
  let best: T | null = null;
  let bestRatio = -Infinity;
  for (const t of items) {
    const r = ratio(t);
    if (r > bestRatio) {
      best = t;
      bestRatio = r;
    }
  }
  return best;
}

function hoverCheck(i: CheckInput): BuildCheck {
  const tw = i.full.thrust_n / i.auw_n;
  const result = tw < 1 ? "fail" : tw < i.classMinTW ? "warn" : "ok";
  return make("DB-C-01", {
    result,
    value: tw,
    limit: result === "fail" ? 1 : i.classMinTW,
    unit: "ratio",
    formula: "full-throttle thrust at loaded voltage / all-up weight",
    assumptions: [`class minimum ${i.classMinTW} is an iynk default`],
    cause_id: result === "ok" ? null : "thrust-to-weight-low",
  });
}

function hoverThrottleCheck(i: CheckInput): BuildCheck {
  const high = i.hover.throttle > THRESHOLDS.hoverThrottle;
  return make("DB-C-02", {
    result: high ? "warn" : "ok",
    value: i.hover.throttle,
    limit: THRESHOLDS.hoverThrottle,
    unit: "fraction",
    formula: "sqrt(weight / full-throttle thrust)",
    cause_id: high ? "hover-throttle-too-high" : null,
  });
}

function escCurrentCheck(i: CheckInput): BuildCheck {
  const rows = i.slots.map((s, k) => ({ slot: s, amps: i.full.i_motor_a[k] }));
  const w = worstBy(rows, (r) => r.amps / r.slot.esc.i_cont_a);
  const burst = w?.slot.esc.i_burst_a;
  const result: CheckResult = !w
    ? "info"
    : burst !== undefined && w.amps > burst
      ? "fail"
      : w.amps > w.slot.esc.i_cont_a
        ? "warn"
        : "ok";
  return make("DB-C-03", {
    result,
    value: w?.amps ?? null,
    limit: !w ? null : result === "fail" ? (burst ?? null) : w.slot.esc.i_cont_a,
    unit: "A",
    limitingPart: w?.slot.escLabel ?? null,
    formula: "largest motor current at full throttle / ESC continuous current (burst current for a fail)",
    cause_id: result === "warn" || result === "fail" ? "esc-overcurrent" : null,
  });
}

function packCurrentCheck(i: CheckInput): BuildCheck {
  const { pack } = i;
  const ah = pack.capacity_mah / 1000;
  const liion = pack.chem === "liion";
  const continuous = liion ? LIION_CELL_A * pack.parallel : pack.c_continuous === undefined ? null : pack.c_continuous * ah;
  const burst = pack.c_burst === undefined ? null : pack.c_burst * ah;
  const amps = i.full.i_pack_a;
  const result: CheckResult =
    continuous === null ? "info" : burst !== null && amps > burst ? "fail" : amps > continuous ? "warn" : "ok";
  const assumptions = liion
    ? [`${LIION_CELL_A} A per parallel cell is an iynk default for Li-ion`]
    : continuous === null
      ? ["the pack states no continuous C rating"]
      : [];
  return make("DB-C-04", {
    result,
    value: amps,
    limit: result === "fail" ? burst : continuous,
    unit: "A",
    limitingPart: i.packLabel,
    formula: liion
      ? `pack current / (${LIION_CELL_A} A x parallel cells)`
      : "pack current / (C rating x capacity in Ah), burst C rating for a fail",
    assumptions,
    cause_id: result === "warn" || result === "fail" ? "battery-overcurrent" : null,
  });
}

interface Rating {
  part: string;
  value: number;
  limit: number;
  unit: string;
}

function ratingCheck(i: CheckInput): BuildCheck {
  const fullV = i.pack.cells * (FULL_CELL_V[i.pack.chem] ?? FULL_CELL_V.lipo);
  const ratings: Rating[] = [];
  i.slots.forEach((s, k) => {
    if (s.prop.rpm_max !== undefined) {
      ratings.push({ part: s.label, value: i.full.rpm_noload[k], limit: s.prop.rpm_max, unit: "rpm" });
    }
    if (s.motor.v_max !== undefined) ratings.push({ part: s.label, value: fullV, limit: s.motor.v_max, unit: "V" });
    if (s.esc.v_max !== undefined) ratings.push({ part: s.escLabel, value: fullV, limit: s.esc.v_max, unit: "V" });
  });
  const w = worstBy(ratings, (r) => r.value / r.limit);
  return make("DB-C-05", {
    result: !w ? "info" : w.value > w.limit ? "fail" : "ok",
    value: w?.value ?? null,
    limit: w?.limit ?? null,
    unit: w?.unit ?? "rpm",
    limitingPart: w?.part ?? null,
    formula: "no-load rpm (kv x full pack voltage) / prop rpm limit; full pack voltage / motor and ESC voltage limit",
    assumptions: w ? [] : ["no part states an rpm or voltage limit"],
  });
}

function clashCheck(clash: ClashResult): BuildCheck {
  const worst = clash.worst;
  return make("DB-C-06", {
    result: worst ? "fail" : "ok",
    value: worst?.centre_mm ?? null,
    limit: worst?.needed_mm ?? null,
    unit: "mm",
    limitingPart: worst ? `${worst.a}, ${worst.b}` : null,
    formula: "distance between rotor axes against the two prop radii plus the clearance",
    assumptions: [`clearance ${THRESHOLDS.clearanceMm} mm is an iynk default`],
    cause_id: worst ? "prop-clash" : null,
  });
}

function frameSizeCheck(i: CheckInput, frame: FrameSI): BuildCheck {
  const max = frame.prop_max_in;
  const w = worstBy(i.slots, (s) => s.prop.d_m);
  const inches = w ? w.prop.d_m * IN_PER_M : null;
  const known = max !== undefined && inches !== null;
  return make("DB-C-07", {
    result: !known ? "info" : inches > max ? "fail" : "ok",
    value: inches,
    limit: max ?? null,
    unit: "in",
    limitingPart: w?.label ?? null,
    formula: "largest prop diameter / frame maximum prop size",
    assumptions: max === undefined ? ["the frame states no maximum prop size"] : [],
  });
}

function cgCheck(cg: { fraction: number }): BuildCheck {
  const result = cg.fraction > THRESHOLDS.cgFail ? "fail" : cg.fraction > THRESHOLDS.cgWarn ? "warn" : "ok";
  return make("DB-C-08", {
    result,
    value: cg.fraction,
    limit: result === "fail" ? THRESHOLDS.cgFail : THRESHOLDS.cgWarn,
    unit: "fraction of arm",
    formula: "distance of the centre of mass from the centroid of the motor axes / mean arm length",
    assumptions: ["the 5 and 12 percent limits are iynk estimates"],
    cause_id: result === "ok" ? null : "cg-offset",
  });
}

function flightTimeCheck(e: EnduranceRange): BuildCheck {
  const min = e.low_s / 60;
  return make("DB-C-09", {
    result: min < THRESHOLDS.shortFlightMin ? "warn" : "ok",
    value: min,
    limit: THRESHOLDS.shortFlightMin,
    unit: "min",
    formula: "low end of the hover flight-time range",
  });
}

function sagCheck(i: CheckInput): BuildCheck {
  const lim = CELL_LIMITS[i.pack.chem];
  const v = i.full.v_cell_loaded;
  const result = !lim ? "info" : v < lim.cut ? "fail" : v < lim.low ? "warn" : "ok";
  return make("DB-C-10", {
    result,
    value: v,
    limit: !lim ? null : result === "fail" ? lim.cut : lim.low,
    unit: "V per cell",
    limitingPart: i.packLabel,
    formula: "loaded cell voltage at full throttle / chemistry warning and cut-off voltage",
  });
}

function spinCheck(i: CheckInput): BuildCheck {
  const swapped = i.slots.filter((s) => s.prop_spin !== s.spin);
  if (swapped.length > 0) {
    return make("DB-C-11", {
      result: "fail",
      value: swapped.length,
      limit: 0,
      unit: "props",
      limitingPart: swapped[0].label,
      formula: "props whose spin differs from their motor",
      cause_id: "props-swapped",
    });
  }
  const net = Math.abs(i.slots.reduce((sum, s, k) => sum + spinSign(s.spin) * i.hover.torque_nm[k], 0));
  const total = i.hover.torque_nm.reduce((sum, q) => sum + Math.abs(q), 0);
  const balance = total > 0 ? net / total : 0;
  return make("DB-C-11", {
    result: balance > THRESHOLDS.yawBalance ? "warn" : "ok",
    value: balance,
    limit: THRESHOLDS.yawBalance,
    unit: "fraction",
    formula: "|sum of signed hover torques| / sum of hover torque magnitudes",
    assumptions: ["the 5 percent limit is an iynk estimate"],
  });
}

function loopCheck(i: CheckInput, fc: FcSI | null): BuildCheck | null {
  const { flight } = i;
  if (flight.model === "flight-game@1") {
    return make("DB-C-12", {
      result: "ok",
      unit: "Hz",
      formula: "control loop rate / flight controller loop limit",
      assumptions: ["not used by the game model"],
    });
  }
  if (!fc) return null;
  const { pid_hz, gyroLpfHz } = flight;
  if (pid_hz === undefined) {
    return make("DB-C-12", {
      result: "info",
      unit: "Hz",
      formula: "control loop rate / flight controller loop limit",
      assumptions: ["the project sets no control loop rate"],
    });
  }
  const nyquist = pid_hz / 2;
  const tooFast = pid_hz > fc.loop_hz_max;
  const aliased = gyroLpfHz !== undefined && gyroLpfHz >= nyquist;
  return make("DB-C-12", {
    result: tooFast ? "fail" : aliased ? "warn" : "ok",
    value: !tooFast && aliased ? gyroLpfHz : pid_hz,
    limit: !tooFast && aliased ? nyquist : fc.loop_hz_max,
    unit: "Hz",
    formula: "control loop rate / flight controller loop limit; gyro filter cutoff / half the control loop rate",
  });
}

function massNoticeCheck(i: CheckInput): BuildCheck {
  return make("DB-C-13", {
    result: i.auw_g > THRESHOLDS.massChipG ? "info" : "ok",
    value: i.auw_g,
    limit: THRESHOLDS.massChipG,
    unit: "g",
    formula: "all-up weight / 250 g",
    assumptions: ["registration and Remote ID rules may apply where you fly; this is not legal advice"],
  });
}

function makerRatingCheck(i: CheckInput): BuildCheck {
  const first = i.makerLimitsExceeded[0];
  return make("DB-C-14", {
    result: first ? "warn" : "ok",
    value: i.makerLimitsExceeded.length,
    limit: 0,
    unit: "ratings",
    limitingPart: first?.part ?? null,
    formula: "ratings the maker states that this build exceeds",
    assumptions: first ? [`${first.part}: ${first.field}`] : [],
  });
}

/** Rank of the rows by elimination with partial pivoting; entries under 1e-9 of the largest count as zero. */
function rank(rows: number[][]): number {
  const m = rows.map((r) => [...r]);
  const scale = Math.max(0, ...m.flat().map(Math.abs));
  const eps = RANK_TOLERANCE * scale;
  const cols = m[0]?.length ?? 0;
  let r = 0;
  for (let c = 0; c < cols && r < m.length; c++) {
    let pivot = r;
    for (let k = r + 1; k < m.length; k++) if (Math.abs(m[k][c]) > Math.abs(m[pivot][c])) pivot = k;
    if (Math.abs(m[pivot][c]) <= eps) continue;
    [m[r], m[pivot]] = [m[pivot], m[r]];
    for (let k = r + 1; k < m.length; k++) {
      const f = m[k][c] / m[r][c];
      for (let j = c; j < cols; j++) m[k][j] -= f * m[r][j];
    }
    r++;
  }
  return r;
}

const error = (id: BuildErrorId, path: string | null = null): BuildError => ({
  id,
  message_key: `error.${id}`,
  path,
});

function structuralErrors(i: CheckInput): BuildError[] {
  const errors: BuildError[] = [];
  if (!i.mass || !isPositiveDefinite(i.mass.inertia_g_mm2)) errors.push(error("DB-E-INERTIA"));
  const mixer = rank(i.slots.map((s) => [1, s.axis_mm[1], -s.axis_mm[0], spinSign(s.spin)]));
  if (mixer < 3) errors.push(error("DB-E-MIXER"));
  else if (mixer === 3) errors.push(error("DB-E-MIXER-YAW"));
  for (const need of i.missing) errors.push(error("DB-E-FIELD", need.path));
  if (!(i.pack.chem in CELL_LIMITS)) errors.push(error("DB-E-CHEMISTRY", "pack.chemistry"));
  return errors;
}

/** All fourteen checks that the input can answer, and the structural errors. A check never runs on data that is missing. */
export function runChecks(i: CheckInput): { checks: BuildCheck[]; errors: BuildError[] } {
  const errors = structuralErrors(i);
  const checks: BuildCheck[] = [hoverCheck(i), hoverThrottleCheck(i), escCurrentCheck(i), packCurrentCheck(i), ratingCheck(i)];
  if (isOutOfRange(i.clash)) errors.push(error("DB-E-FIELD", i.clash.field));
  else checks.push(clashCheck(i.clash));
  if (i.frame) checks.push(frameSizeCheck(i, i.frame));
  if (i.cg) checks.push(cgCheck(i.cg));
  if (i.endurance) checks.push(flightTimeCheck(i.endurance));
  checks.push(sagCheck(i), spinCheck(i));
  const loop = loopCheck(i, i.fc);
  if (loop) checks.push(loop);
  checks.push(massNoticeCheck(i), makerRatingCheck(i));
  return { checks, errors };
}
