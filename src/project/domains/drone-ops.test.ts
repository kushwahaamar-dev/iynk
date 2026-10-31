// @vitest-environment node
import { describe, expect, it } from "vitest";
import { accept, loadExample } from "../apply/fixtures.testing.ts";
import type { Op, Project } from "../generated/types.ts";
import { validateValue } from "../validate.ts";
import {
  blankMultirotor,
  flipToPartsPatch,
  layoutMounts,
  mountOps,
  removeSlotPatch,
  setBatteryPatch,
  setControllerPatch,
  setCoursePatch,
  setFlightPatch,
  slotPatch,
} from "./drone-ops.ts";
import type { DroneData, MountLayout } from "./drone-ops.ts";

const quad = () => loadExample("drone-quad");
const data = (p: Project): DroneData => p.domains!.drone!.data;
const applied = (p: Project, ...ops: Op[]) => accept(p, ops).state;
/** The batch hook leaves history to the session, so history findings are not what these tests look at. */
const errors = (p: Project) => validateValue(p).diagnostics.filter((d) => d.severity === "error" && !d.code.startsWith("V3-HIST"));

describe("drone op builders", () => {
  it("replaces slot m1 and keeps the others", () => {
    const p = quad();
    const slot = { ...data(p).motors![0]!, spin: "cw" as const };
    const next = data(applied(p, slotPatch(data(p), slot)));
    expect(next.motors).toHaveLength(4);
    expect(next.motors![0]).toEqual(slot);
    expect(next.motors!.slice(1)).toEqual(data(p).motors!.slice(1));
    expect(errors(applied(p, slotPatch(data(p), slot)))).toEqual([]);
  });

  it("appends a slot with a new id", () => {
    const p = quad();
    const slot = { ...data(p).motors![0]!, id: "m5", esc_channel: 3 };
    expect(data(applied(p, slotPatch(data(p), slot))).motors!.map((m) => m.id)).toEqual(["m1", "m2", "m3", "m4", "m5"]);
  });

  it("removes a slot", () => {
    const p = quad();
    expect(data(applied(p, removeSlotPatch(data(p), "m4"))).motors!.map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
  });

  it("sets the battery and the controller", () => {
    const p = quad();
    const next = applied(p, setBatteryPatch("cmp_esc"), setControllerPatch("brd_fc"));
    expect(data(next).battery).toBe("cmp_esc");
    expect(errors(next)).toEqual([]);
  });

  it("replaces the flight settings, dropping rates the new model does not use", () => {
    const p = quad();
    const next = applied(p, setFlightPatch({ model: "flight-game@1" }));
    expect(data(next).flight).toEqual({ model: "flight-game@1" });
    expect(errors(next)).toEqual([]);
  });

  it("replaces the course", () => {
    const p = quad();
    const next = applied(p, setCoursePatch({ builtin: "slalom" }));
    expect(data(next).course).toEqual({ builtin: "slalom" });
    expect(errors(next)).toEqual([]);
  });

  it("leaves a multirotor alone when asked to flip it", () => {
    const p = quad();
    expect(data(applied(p, flipToPartsPatch(data(p))))).toEqual(data(p));
  });

  it("flips a legacy craft to a multirotor once its parts are in", () => {
    const p = quad();
    const full = data(p);
    const legacy: DroneData = {
      kind: "legacy-craft",
      thrustSource: "legacy-calc",
      legacy: { contentId: "a", calcModelId: "b", flightModelId: "flight-game@1" },
      flight: { model: "flight-game@1" },
      environment: full.environment,
      course: full.course,
      bench: full.bench,
    };
    const state = { ...p, domains: { drone: { schemaVersion: "1.0", data: legacy } } } as Project;
    const parts: Op = {
      k: "domain.patch",
      domain: "drone",
      patch: { motors: full.motors, battery: full.battery, controller: full.controller, fcParams: full.fcParams },
    };
    expect(() => applied(state, flipToPartsPatch(legacy))).toThrow("motors");
    const next = data(applied(state, parts, flipToPartsPatch(legacy)));
    expect(next.kind).toBe("multirotor");
    expect(next.thrustSource).toBe("parts");
    expect("legacy" in next).toBe(false);
    expect(errors({ ...state, domains: { drone: { schemaVersion: "1.0", data: next } } } as Project)).toEqual([]);
  });

  it("starts a multirotor that needs only its parts", () => {
    const blank = blankMultirotor();
    expect(blank.kind).toBe("multirotor");
    expect(blank.thrustSource).toBe("parts");
    expect(blank.motors).toBeUndefined();
  });
});

describe("layoutMounts and mountOps", () => {
  const COUNTS: Array<[MountLayout, number]> = [["x", 4], ["plus", 4], ["h", 4], ["hex", 6], ["octo", 8]];

  it.each(COUNTS)("%s gives %i distinct mounts at the wheelbase radius with alternating spin", (layout, count) => {
    const mounts = layoutMounts(layout, 220, 5);
    expect(mounts).toHaveLength(count);
    expect(new Set(mounts.map((m) => m.id)).size).toBe(count);
    expect(new Set(mounts.map((m) => m.position_mm.join())).size).toBe(count);
    for (const m of mounts) expect(Math.hypot(m.position_mm[0], m.position_mm[1])).toBeCloseTo(110, 9);
    mounts.forEach((m, k) => expect(m.spin).toBe(k % 2 === 0 ? "ccw" : "cw"));
  });

  it("puts the x quad on the diagonals", () => {
    const [first] = layoutMounts("x", 220, 5);
    expect(first!.position_mm).toEqual([110 * 0.7071067811865476, 110 * 0.7071067811865476, 5]);
  });

  it.each(COUNTS)("mountOps for %s are accepted and keep the document valid", (layout) => {
    const p = quad();
    const ops = mountOps(layoutMounts(layout, 220, 5), "frm_body", () => "cmp_m1");
    const next = applied(p, ...ops);
    expect(next.mechanical!.mounts.filter((m) => m.id.startsWith("mnt_m")).length).toBeGreaterThanOrEqual(ops.length);
    expect(errors(next)).toEqual([]);
  });
});
