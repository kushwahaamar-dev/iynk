import type { Descriptor } from "./descriptor.ts";

export interface Need {
  path: string;
  why: string;
}

export type Read<T> = { ok: true; value: T; assumed: string[] } | { ok: false; missing: Need[] };

export interface MotorSI {
  kv_rpm_per_v: number;
  ke_vs_per_rad: number;
  r_ohm: number;
  i0_a: number;
  v_max?: number;
  i_max_a?: number;
  i_burst_a?: number;
  j_kgm2?: number;
  mass_g: number;
}

export interface PropSI {
  d_m: number;
  pitch_m: number;
  blades: number;
  ct0: number;
  cp0: number;
  mass_g: number;
  rpm_max?: number;
  hasAdvanceTables: boolean;
}

export interface EscSI {
  i_cont_a: number;
  i_burst_a?: number;
  channels: number;
  efficiency: number;
  v_max?: number;
  mass_g: number;
}

export interface PackMech {
  cells: number;
  parallel: number;
  capacity_mah: number;
  r_cell_ohm: number;
  chemistry: string;
  ocv_table?: readonly number[];
  c_continuous?: number;
  c_burst?: number;
  mass_g: number;
}

export interface FrameSI {
  mass_g: number;
  wheelbase_mm?: number;
  arm_count?: number;
  prop_max_in?: number;
}

export interface FcSI {
  gyro: string;
  loop_hz_max: number;
  mass_g: number;
}

export type Role = "motor" | "prop" | "esc" | "battery" | "frame" | "fc";

const BLOCK_ROLES = ["prop", "esc", "battery", "frame", "fc"] as const;

const ESC_EFFICIENCY = 0.95;
const SEC_PER_MIN = 60;
const TWO_PI = 2 * Math.PI;

type Block = Record<string, unknown>;

const isPositive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

const blockOf = (d: Descriptor, role: Role): Block | undefined => {
  const block = d.mechanics?.[role];
  return typeof block === "object" && block !== null ? (block as Block) : undefined;
};

/** `block.mass_g`, else `mechanics.mass_g`, else `dimensions.mass` when it is in grams. */
function massOf(d: Descriptor, block: Block): unknown {
  if (block["mass_g"] !== undefined) return block["mass_g"];
  if (d.mechanics?.mass_g !== undefined) return d.mechanics.mass_g;
  const mass = d.dimensions?.mass;
  return mass?.unit === "g" ? (mass.typ ?? mass.value) : undefined;
}

/** Collects the needs and defaults of one block while its fields are read. */
class Reader {
  readonly missing: Need[] = [];
  readonly assumed: string[] = [];

  private readonly d: Descriptor;
  private readonly role: Role;
  readonly block: Block;

  constructor(d: Descriptor, role: Role, block: Block) {
    this.d = d;
    this.role = role;
    this.block = block;
  }

  private path(field: string): string {
    return `mechanics.${this.role}.${field}`;
  }

  need(field: string, why: string): void {
    this.missing.push({ path: this.path(field), why });
  }

  /** A positive number the solve cannot run without. A placeholder 0 comes back when it is missing. */
  required(field: string, why: string): number {
    const v = this.block[field];
    if (isPositive(v)) return v;
    this.need(field, v === undefined ? why : "must be positive");
    return 0;
  }

  mass(): number {
    const v = massOf(this.d, this.block);
    if (isPositive(v)) return v;
    this.need("mass_g", v === undefined ? "the build mass needs it" : "must be positive");
    return 0;
  }

  optional(field: string): number | undefined {
    const v = this.block[field];
    return isPositive(v) ? v : undefined;
  }

  withDefault(field: string, fallback: number): number {
    const v = this.optional(field);
    if (v !== undefined) return v;
    this.assumed.push(this.path(field));
    return fallback;
  }

  text(field: string, why: string): string {
    const v = this.block[field];
    if (typeof v === "string" && v !== "") return v;
    this.need(field, why);
    return "";
  }
}

/** Runs `build` against one block. Its value is only returned when no field was missing. */
function read<T>(d: Descriptor, role: Role, build: (r: Reader) => T): Read<T> {
  const block = blockOf(d, role);
  if (!block) return { ok: false, missing: [{ path: `mechanics.${role}`, why: `the ${role} block is absent` }] };
  const reader = new Reader(d, role, block);
  const value = build(reader);
  return reader.missing.length > 0 ? { ok: false, missing: reader.missing } : { ok: true, value, assumed: reader.assumed };
}

/** Adds each optional field that is set; a missing one stays absent instead of being `undefined`. */
function withOptional<T extends object>(base: T, extra: Record<string, number | undefined>): T {
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, v] of Object.entries(extra)) if (v !== undefined) out[key] = v;
  return out as T;
}

export function roleOf(d: Descriptor): Role | null {
  const motor = blockOf(d, "motor");
  if (motor && d.identity.category === "drone" && (motor["kv_rpm_per_v"] !== undefined || motor["ke_vs_per_rad"] !== undefined)) {
    return "motor";
  }
  return BLOCK_ROLES.find((role) => blockOf(d, role) !== undefined) ?? null;
}

export const readMotor = (d: Descriptor): Read<MotorSI> =>
  read(d, "motor", (r) => {
    const r_ohm = r.required("r_ohm", "the armature resistance sets the current");
    const i0_a = r.required("i_noload_a", "the no-load current sets the idle loss");
    const mass_g = r.mass();
    let kv = r.optional("kv_rpm_per_v");
    let ke = r.optional("ke_vs_per_rad");
    if (kv !== undefined) ke ??= SEC_PER_MIN / (TWO_PI * kv);
    else if (ke !== undefined) kv = SEC_PER_MIN / (TWO_PI * ke);
    else {
      const given = r.block["kv_rpm_per_v"] !== undefined || r.block["ke_vs_per_rad"] !== undefined;
      r.need("kv_rpm_per_v", given ? "must be positive" : "give kv_rpm_per_v or ke_vs_per_rad");
    }
    return withOptional(
      { kv_rpm_per_v: kv ?? 0, ke_vs_per_rad: ke ?? 0, r_ohm, i0_a, mass_g },
      {
        v_max: r.optional("v_max"),
        i_max_a: r.optional("i_max_a"),
        i_burst_a: r.optional("i_burst_a"),
        j_kgm2: r.optional("j_kgm2"),
      },
    );
  });

export const readProp = (d: Descriptor): Read<PropSI> =>
  read(d, "prop", (r) => {
    const diameter_mm = r.required("diameter_mm", "the diameter sets thrust and power");
    const pitch_mm = r.required("pitch_mm", "the pitch is part of the prop size");
    const ct0 = r.required("ct0", "the thrust coefficient sets thrust");
    const cp0 = r.required("cp0", "the power coefficient sets the current");
    const mass_g = r.mass();
    const blades = r.withDefault("blades", 2);
    return withOptional(
      {
        d_m: diameter_mm / 1000,
        pitch_m: pitch_mm / 1000,
        blades,
        ct0,
        cp0,
        mass_g,
        hasAdvanceTables: r.block["ct_vs_j"] !== undefined && r.block["cp_vs_j"] !== undefined,
      },
      { rpm_max: r.optional("rpm_max") },
    );
  });

export const readEsc = (d: Descriptor): Read<EscSI> =>
  read(d, "esc", (r) => {
    const i_cont_a = r.required("i_cont_a", "the continuous rating limits the current");
    const mass_g = r.mass();
    const channels = r.withDefault("channels", 1);
    const efficiency = r.withDefault("efficiency", ESC_EFFICIENCY);
    return withOptional(
      { i_cont_a, channels, efficiency, mass_g },
      { i_burst_a: r.optional("i_burst_a"), v_max: r.optional("v_max") },
    );
  });

export const readBattery = (d: Descriptor): Read<PackMech> =>
  read(d, "battery", (r) => {
    const cells = r.required("cells", "the series count sets the voltage");
    const capacity_mah = r.required("capacity_mah", "the capacity sets the flight time");
    const r_cell_ohm = r.required("r_cell_ohm", "the cell resistance sets the sag");
    const mass_g = r.mass();
    const parallel = r.withDefault("parallel", 1);
    const given = r.block["chemistry"];
    if (typeof given !== "string") r.assumed.push("mechanics.battery.chemistry");
    const ocv = r.block["ocv_table"];
    const pack: PackMech = withOptional(
      { cells, parallel, capacity_mah, r_cell_ohm, chemistry: typeof given === "string" ? given : "lipo", mass_g },
      { c_continuous: r.optional("c_continuous"), c_burst: r.optional("c_burst") },
    );
    return Array.isArray(ocv) ? { ...pack, ocv_table: ocv as number[] } : pack;
  });

export const readFrame = (d: Descriptor): Read<FrameSI> =>
  read(d, "frame", (r) =>
    withOptional(
      { mass_g: r.mass() },
      {
        wheelbase_mm: r.optional("wheelbase_mm"),
        arm_count: r.optional("arm_count"),
        prop_max_in: r.optional("prop_max_in"),
      },
    ),
  );

export const readFc = (d: Descriptor): Read<FcSI> =>
  read(d, "fc", (r) => ({
    gyro: r.text("gyro", "the gyro names the sensor the controller reads"),
    loop_hz_max: r.required("loop_hz_max", "the loop rate limits the controller"),
    mass_g: r.mass(),
  }));

/** 1 when ke and kv agree: ke * kv * 2 pi / 60. */
export function keKvRatio(m: MotorSI): number {
  return (m.ke_vs_per_rad * m.kv_rpm_per_v * TWO_PI) / SEC_PER_MIN;
}
