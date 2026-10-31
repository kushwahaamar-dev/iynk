// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkDescriptor } from "../../../sim/flight/content-rule.ts";
import { isOutOfRange } from "../../../sim/flight/guards.ts";
import { rotorOf, SEA_LEVEL_AIR, solveStatic, type Drive, type PackModel } from "../../../sim/flight/propulsion.ts";
import { validateDescriptor, type Descriptor } from "../../descriptor.ts";
import { readMotor, readProp } from "../../mechanics.ts";

const DIR = new URL("./", import.meta.url);
const NOMINAL_CELL_V = 3.7;

const load = (prefix: string): Descriptor[] =>
  readdirSync(DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".component.json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(new URL(f, DIR), "utf8")) as Descriptor);

const motors = load("motor-");
const props = load("prop-");
const byId = (list: Descriptor[], id: string): Descriptor => {
  const d = list.find((x) => x.id === `core.${id}`);
  if (!d) throw new Error(`no part core.${id}`);
  return d;
};

const PAIRS = [
  { motor: "motor-0802-19000kv", prop: "prop-31mm-2b", cells: 1 },
  { motor: "motor-1104-7500kv", prop: "prop-2-5in-3b", cells: 2 },
  { motor: "motor-1404-4600kv", prop: "prop-3in-3b", cells: 3 },
  { motor: "motor-2004-3000kv", prop: "prop-3in-3b", cells: 4 },
  { motor: "motor-2306-1750kv", prop: "prop-5-1in-3b", cells: 4 },
  { motor: "motor-2807-1300kv", prop: "prop-7in-2b", cells: 6 },
];

const idealPack = (cells: number): PackModel => ({ open_v: () => cells * NOMINAL_CELL_V, r_ohm: 0, idle_a: 0 });

function driveOf(motorId: string, propId: string): Drive {
  const m = readMotor(byId(motors, motorId));
  const p = readProp(byId(props, propId));
  if (!m.ok || !p.ok) throw new Error("part does not read");
  const rotor = rotorOf(m.value, p.value, SEA_LEVEL_AIR);
  if (isOutOfRange(rotor)) throw new Error(`rotor out of range at ${rotor.field}`);
  return { rotor, escEff: 1 };
}

function solved(motorId: string, propId: string, cells: number, duty: number) {
  const point = solveStatic([driveOf(motorId, propId)], duty, 1, idealPack(cells));
  if (isOutOfRange(point)) throw new Error(`solve out of range at ${point.field}`);
  return point;
}

describe("generic drone motors and propellers", () => {
  const all = [...motors, ...props];

  it("ships six of each", () => {
    expect(motors).toHaveLength(6);
    expect(props).toHaveLength(6);
  });

  it("validates every descriptor as core", () => {
    for (const d of all) {
      const check = validateDescriptor(d, { ctx: { trust: "core" } });
      expect(check.ok, d.id).toBe(true);
    }
  });

  it("has unique ids, an estimated price with a date and no content-rule finding", () => {
    expect(new Set(all.map((d) => d.id)).size).toBe(all.length);
    for (const d of all) {
      const price = (d as unknown as { x_price?: { as_of?: string; estimate?: boolean } }).x_price;
      expect(price?.as_of, d.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(price?.estimate, d.id).toBe(true);
      expect(checkDescriptor(d), d.id).toEqual([]);
    }
  });

  it("reads every motor and prop with nothing assumed", () => {
    for (const d of motors) expect(readMotor(d), d.id).toMatchObject({ ok: true, assumed: [] });
    for (const d of props) expect(readProp(d), d.id).toMatchObject({ ok: true, assumed: [] });
  });

  it("gives each pair thrust at full throttle and a current under the motor limit", () => {
    for (const { motor, prop, cells } of PAIRS) {
      const m = readMotor(byId(motors, motor));
      if (!m.ok || m.value.i_max_a === undefined) throw new Error(`${motor} has no i_max_a`);
      const point = solved(motor, prop, cells, 1).motors[0]!;
      expect(point.thrust_n, `${motor} thrust`).toBeGreaterThan(0);
      expect(point.current_a, `${motor} current`).toBeLessThan(m.value.i_max_a);
    }
  });

  it("keeps each motor v_max above the full voltage of the pack it is paired with", () => {
    for (const { motor, cells } of PAIRS) {
      const m = readMotor(byId(motors, motor));
      expect(m.ok && m.value.v_max).toBeGreaterThan(cells * 4.2 - 1e-9);
    }
  });

  it("closes the torque balance of the solve", () => {
    for (const { motor, prop, cells } of PAIRS) {
      expect(solved(motor, prop, cells, 1).residual_nm, motor).toBeLessThan(1e-9);
    }
  });

  it("never lowers thrust when the duty rises", () => {
    for (const d of props) {
      let last = 0;
      for (let duty = 0; duty <= 1.0001; duty += 0.05) {
        const thrust = solved("motor-2306-1750kv", d.id.replace("core.", ""), 4, Math.min(duty, 1)).motors[0]!.thrust_n;
        expect(thrust, `${d.id} at duty ${duty.toFixed(2)}`).toBeGreaterThanOrEqual(last);
        last = thrust;
      }
    }
  });
});
