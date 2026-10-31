// @vitest-environment node
import { describe, expect, it } from "vitest";
import { allEntries, loadRegistry } from "../sim/registry/entries.ts";
import { BANNED_WORDS, validateDescriptor } from "./descriptor.ts";
import type { Descriptor } from "./descriptor.ts";
import { BUILTIN_DESCRIPTORS } from "./builtin.ts";

const ROBOT_PARTS = [
  "core.tt-motor", "core.lipo-2s", "core.tb6612fng-module", "core.l298n-module", "core.qtr-8rc", "core.hc-sr04",
  "core.wheel-65", "core.caster-ball", "core.chassis-2wd", "core.tt-motor-encoder",
];
const EDITED = ROBOT_PARTS.slice(0, 6);
const REFUSED = ["core.dc-gear-motor", "core.battery-lipo-2s", "core.tb6612-module"];

const all = BUILTIN_DESCRIPTORS as Descriptor[];
const byId = new Map(all.map((d) => [d.id, d]));
const part = (id: string): Descriptor => {
  const d = byId.get(id);
  if (!d) throw new Error(`${id} is not a built-in part`);
  return d;
};

describe.each(ROBOT_PARTS)("%s", (id) => {
  const d = part(id);

  it("passes the descriptor checks", () => {
    expect(validateDescriptor(d, { origin: "core" })).toEqual({ ok: true, diagnostics: [] });
  });

  it("gives every mechanics block a source that the descriptor lists", () => {
    const ids = new Set(d.sources.map((s) => s.id));
    for (const [name, block] of Object.entries(d.mechanics ?? {})) {
      if (typeof block !== "object") continue;
      const src = (block as { source?: { src: string } }).source?.src;
      expect(src, `${id} mechanics.${name}`).toBeDefined();
      expect(ids.has(src!), `${id} mechanics.${name} names ${src}`).toBe(true);
    }
  });
});

describe("robot part data", () => {
  it("bumps the six edited parts to 1.0.1 and starts the four new ones at 1.0.0", () => {
    for (const id of EDITED) expect(part(id).version, id).toBe("1.0.1");
    for (const id of ROBOT_PARTS.slice(6)) expect(part(id).version, id).toBe("1.0.0");
  });

  it.each(["core.tt-motor", "core.tt-motor-encoder"])("%s has a stall torque within 20 percent of ke * i_stall * ratio * efficiency", (id) => {
    const motor = part(id).mechanics!.motor!;
    const derived = motor.ke_vs_per_rad! * (motor.v_nominal! / motor.r_ohm) * motor.gear!.ratio * motor.gear!.efficiency;
    expect(Math.abs(motor.torque_stall_nm! - derived) / derived).toBeLessThan(0.2);
    expect(motor.i_stall_a).toBeCloseTo(motor.v_nominal! / motor.r_ohm, 6);
  });

  it("keeps the encoder motor numbers equal to the plain motor", () => {
    expect(part("core.tt-motor-encoder").mechanics!.motor).toEqual(part("core.tt-motor").mechanics!.motor);
    expect(part("core.tt-motor-encoder").mechanics!.encoder!.channels).toBe("ab");
  });

  it("describes the battery as a two-cell lipo pack", () => {
    const battery = part("core.lipo-2s").mechanics!.battery!;
    expect(battery.chemistry).toBe("lipo");
    expect(battery.cells).toBe(2);
  });

  it("describes both drivers as h-bridges and the wheel with a positive diameter", () => {
    for (const id of ["core.tb6612fng-module", "core.l298n-module"]) expect(part(id).mechanics!.driver!.kind).toBe("h-bridge");
    expect(part("core.tb6612fng-module").mechanics!.driver!.decay).toBe("slow");
    expect(part("core.wheel-65").mechanics!.wheel!.diameter_mm).toBeGreaterThan(0);
    expect(part("core.chassis-2wd").mechanics!.mass_g).toBeGreaterThan(0);
  });

  it("reads the line array as a surface sample and the ranger as a ray fan", () => {
    expect(part("core.qtr-8rc").mechanics!.sensor).toMatchObject({ query: "surface-sample", channels: 8 });
    expect(part("core.hc-sr04").mechanics!.sensor!.query).toBe("ray-fan");
  });

  it("creates none of the refused ids and no second line array", () => {
    for (const id of REFUSED) expect(byId.has(id), id).toBe(false);
    expect(all.filter((d) => /qtr-8rc/.test(d.id))).toHaveLength(1);
  });
});

describe("robot registry entries", () => {
  const reg = loadRegistry(allEntries());
  const IDS = [
    "engine:rapier@0.21.0", "model:dc-motor-cycle@1", "model:driver-hbridge@1", "model:gearbox@1", "model:pack-ocv-r@1",
    "model:line-surface-sample@1", "model:ranger-rayfan@1", "model:encoder-quadrature@1", "instrument:pid@1", "instrument:loop-timing@1",
  ];

  it("loads every entry, none above T1, each with modelled and not-modelled text", () => {
    for (const id of IDS) {
      const e = reg.get(id);
      expect(e, id).toBeDefined();
      expect(["T0", "T1"], id).toContain(e!.tier);
      expect(e!.implements.length, id).toBeGreaterThan(0);
      expect(e!.unsupported.length, id).toBeGreaterThan(0);
    }
  });

  it("uses no banned word", () => {
    const pattern = new RegExp(`(?<![\\w-])(${BANNED_WORDS.join("|")})(?![\\w-])`, "i");
    for (const id of IDS) {
      const e = reg.get(id)!;
      for (const p of [...e.implements, ...e.mocked, ...e.unsupported]) expect(p.text, id).not.toMatch(pattern);
    }
  });
});
