// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Component } from "../../parts/generated/types.ts";
import { loadExample } from "../apply/fixtures.testing.ts";
import type { Project } from "../generated/types.ts";
import type { DroneData } from "./drone-ops.ts";
import { checkDroneDomain } from "./drone-semantic.ts";
import type { DroneIssueCode, ProjectView, Resolve } from "./drone-semantic.ts";

const PARTS: Record<string, Partial<Component>> = {
  "core.bldc-2306-1750kv": { mechanics: { motor: { r_ohm: 0.05, kv_rpm_per_v: 1750 } } },
  "core.prop-5043-3blade": { mechanics: { prop: { diameter_mm: 127, pitch_mm: 110, ct0: 0.1, cp0: 0.05 } } },
  "core.esc-4in1-55a": { mechanics: { esc: { i_cont_a: 55, channels: 4, protocol: "dshot600" } } },
  "core.battery-lipo-6s-1300": { mechanics: { battery: { cells: 6, capacity_mah: 1300, r_cell_ohm: 0.01 } } },
  "core.fc-f405": { mechanics: { fc: { gyro: "icm42688", loop_hz_max: 8000 } } },
};

const resolve: Resolve = (ref) => PARTS[ref.ref] as Component | undefined;

const quad = () => loadExample("drone-quad");

function view(project: Project): ProjectView {
  const mechanical = project.mechanical ?? { frames: [], bodies: [], joints: [], mounts: [] };
  return { mechanical, components: project.components, boards: project.boards, domains: project.domains ?? {} };
}

const data = (p: Project): DroneData => p.domains!.drone!.data;

const codes = (p: Project, r: Resolve = resolve): DroneIssueCode[] => checkDroneDomain(view(p), r).map((i) => i.code);

describe("checkDroneDomain", () => {
  it("passes the drone quad example", () => {
    expect(checkDroneDomain(view(quad()), resolve)).toEqual([]);
  });

  it("reports a project with no drone domain as clean", () => {
    expect(checkDroneDomain({ ...view(quad()), domains: {} }, resolve)).toEqual([]);
  });

  it("flags a motor slot that points at a battery, at the slot's motor path", () => {
    const p = quad();
    data(p).motors![1]!.motor = "cmp_bat";
    expect(checkDroneDomain(view(p), resolve)).toEqual([
      expect.objectContaining({ code: "DRN-SLOT-MOTOR-ROLE", path: "/domains/drone/data/motors/1/motor" }),
    ]);
  });

  const cases: Array<[DroneIssueCode, (p: Project) => void]> = [
    ["DRN-SLOT-DUP-ID", (p) => { data(p).motors![1]!.id = "m1"; }],
    ["DRN-SLOT-PROP-ROLE", (p) => { data(p).motors![0]!.prop = "cmp_m1"; }],
    ["DRN-SLOT-ESC-ROLE", (p) => { data(p).motors![0]!.esc = "cmp_bat"; }],
    ["DRN-ESC-CHANNEL", (p) => { data(p).motors![0]!.esc_channel = 4; }],
    ["DRN-ESC-CHANNEL", (p) => { data(p).motors![1]!.esc_channel = 0; }],
    ["DRN-MOUNT-MISSING", (p) => { data(p).motors![0]!.mount = "mnt_gone"; }],
    ["DRN-MOUNT-AXIS", (p) => { p.mechanical!.mounts.find((m) => m.id === "mnt_m1")!.pose.rpy_deg = [180, 0, 0]; }],
    ["DRN-BATTERY-ROLE", (p) => { data(p).battery = "cmp_esc"; }],
    ["DRN-CONTROLLER-ROLE", (p) => { data(p).controller = "cmp_rx"; }],
    ["DRN-RATE-DIVIDE", (p) => { data(p).flight = { model: "multirotor-rigid@1", step_hz: 1000, pid_hz: 2000 }; }],
    ["DRN-THRUST-SOURCE", (p) => { data(p).thrustSource = "legacy-calc"; }],
  ];

  it.each(cases)("raises %s", (code, mutate) => {
    const p = quad();
    mutate(p);
    expect(codes(p)).toContain(code);
  });

  it("accepts a pid rate that divides the step rate", () => {
    const p = quad();
    data(p).flight = { model: "multirotor-rigid@1", step_hz: 1000, pid_hz: 500 };
    expect(codes(p)).toEqual([]);
  });

  it("says a part is not in the library when the resolver finds nothing", () => {
    const issues = checkDroneDomain(view(quad()), () => undefined);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((i) => i.message.includes("not in the library"))).toBe(true);
  });

  it("allows a prop spin that differs from the motor spin", () => {
    const p = quad();
    data(p).motors![0]!.prop_spin = "cw";
    expect(codes(p)).toEqual([]);
  });

  it("skips the slot checks of a legacy craft but still checks its thrust source", () => {
    const p = quad();
    const d = data(p);
    d.kind = "legacy-craft";
    d.legacy = { contentId: "a", calcModelId: "b", flightModelId: "flight-game@1" };
    d.motors![0]!.motor = "cmp_bat";
    expect(codes(p)).toEqual(["DRN-THRUST-SOURCE"]);
  });
});
