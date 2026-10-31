import { CELL_LIMITS, checkPack, NOMINAL_CELL, packOpen, type FlyChem } from "./battery.ts";
import type { Build } from "./build.ts";
import { firstNonFinite, isOutOfRange, type OutOfRange } from "./guards.ts";
import { assemble } from "./mass.ts";
import { dutyForThrust, maxThrust, rotorOf, SEA_LEVEL_AIR, solveStatic, type Air, type Drive, type PackModel } from "./propulsion.ts";

/** The numbers the flight range needs from a build, in the units of `CalcOutputs`. */
export interface BuildFlightOutputs {
  auw: number;
  thrustPerMotor: number;
  motors: number;
  cells: number;
  mah: number;
  hoverThrottle: number;
  hoverAmps: number;
  maxAmps: number;
  chemistry: FlyChem;
  overKv: boolean;
}

const GRAVITY = 9.81;
const GRAMS_PER_KG = 1000;

const missing = (field: string, value = NaN): OutOfRange => ({ error: "out-of-range", field, value, min: 1, max: Infinity });

/**
 * Propulsion numbers on a nominal 3.7 V per cell pack with no sag: the game scales thrust with
 * the pack voltage and applies the sag itself. Unequal motors are flown as equal, at their mean thrust.
 */
export function calcFromBuild(b: Build, opts: { air?: Air } = {}): BuildFlightOutputs | OutOfRange {
  const air = opts.air ?? SEA_LEVEL_AIR;
  const pack = b.pack;
  if (b.slots.length === 0) return missing("slots.length", 0);
  if (!pack) return missing("pack");
  if (!(pack.chem in CELL_LIMITS)) return missing("pack.chemistry");
  const badPack = checkPack(pack);
  if (badPack) return badPack;
  const mass = assemble(b.bodies);
  if (isOutOfRange(mass)) return mass;

  const shared = new Map<string, Drive>();
  const drives: Drive[] = [];
  for (const s of b.slots) {
    const key = `${s.motorRef}|${s.propRef}|${s.escRef}`;
    let drive = shared.get(key);
    if (!drive) {
      const rotor = rotorOf(s.motor, s.prop, air);
      if (isOutOfRange(rotor)) return rotor;
      drive = { rotor, escEff: s.esc.efficiency };
      shared.set(key, drive);
    }
    drives.push(drive);
  }

  const nominal: PackModel = { open_v: () => pack.cells * NOMINAL_CELL, r_ohm: 0, idle_a: 0 };
  const full = maxThrust(drives, 1, nominal);
  if (isOutOfRange(full)) return full;

  const thrustPerMotor = full.motors.reduce((sum, m) => sum + (m.thrust_n / GRAVITY) * GRAMS_PER_KG, 0) / full.motors.length;
  const duty = dutyForThrust(drives, 1, nominal, (mass.mass_g / GRAMS_PER_KG) * GRAVITY);
  let hoverAmps = full.i_pack;
  if (duty !== "unreachable") {
    const hover = solveStatic(drives, duty, 1, nominal);
    if (isOutOfRange(hover)) return hover;
    hoverAmps = hover.i_pack;
  }

  const fullOpen = packOpen(pack, 1);
  const out: BuildFlightOutputs = {
    auw: mass.mass_g,
    thrustPerMotor,
    motors: b.slots.length,
    cells: pack.cells,
    mah: pack.capacity_mah,
    hoverThrottle: Math.sqrt(mass.mass_g / (b.slots.length * thrustPerMotor)),
    hoverAmps,
    maxAmps: full.i_pack,
    chemistry: pack.chem,
    overKv: b.slots.some((s) => s.prop.rpm_max !== undefined && s.motor.kv_rpm_per_v * fullOpen > s.prop.rpm_max),
  };
  return firstNonFinite("result", out) ?? out;
}
