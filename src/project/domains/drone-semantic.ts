import type { Component } from "../../parts/generated/types.ts";
import type { Body, Frame, Mount } from "../generated/types.ts";
import type { DroneData } from "./drone-ops.ts";

export type DroneIssueCode =
  | "DRN-SLOT-DUP-ID"
  | "DRN-SLOT-MOTOR-ROLE"
  | "DRN-SLOT-PROP-ROLE"
  | "DRN-SLOT-ESC-ROLE"
  | "DRN-ESC-CHANNEL"
  | "DRN-MOUNT-MISSING"
  | "DRN-MOUNT-AXIS"
  | "DRN-BATTERY-ROLE"
  | "DRN-CONTROLLER-ROLE"
  | "DRN-RATE-DIVIDE"
  | "DRN-THRUST-SOURCE";

export interface DroneIssue {
  code: DroneIssueCode;
  path: string;
  message: string;
}

export type Resolve = (ref: { ref: string; version: string }) => Component | undefined;

interface Instance {
  id: string;
  definition: { ref: string; version: string };
}

/** The part of a `Project` these checks read. */
export interface ProjectView {
  mechanical: { frames: readonly Frame[]; bodies: readonly Body[]; mounts: readonly Mount[] };
  components: readonly Instance[];
  boards: readonly Instance[];
  domains: { drone?: { data: DroneData } };
}

const BASE = "/domains/drone/data";

/** Body +z dotted with the mount's thrust axis is cos(pitch) cos(roll) in the URDF convention. */
function thrustDot(rpy_deg: readonly number[]): number {
  const [roll = 0, pitch = 0] = rpy_deg;
  return Math.cos((pitch * Math.PI) / 180) * Math.cos((roll * Math.PI) / 180);
}

/** Structural errors in `domains.drone` that the JSON Schema cannot see. A migrated legacy craft has no parts to check. */
export function checkDroneDomain(p: ProjectView, resolve: Resolve): DroneIssue[] {
  const data = p.domains.drone?.data;
  if (!data) return [];
  const issues: DroneIssue[] = [];
  const add = (code: DroneIssueCode, path: string, message: string) => issues.push({ code, path: BASE + path, message });

  const expected = data.kind === "multirotor" ? "parts" : "legacy-calc";
  if (data.thrustSource !== expected) {
    add("DRN-THRUST-SOURCE", "/thrustSource", `a ${data.kind} craft takes its thrust from ${expected}, not ${data.thrustSource}`);
  }
  const { step_hz, pid_hz } = data.flight;
  if (step_hz !== undefined && pid_hz !== undefined && (pid_hz > step_hz || step_hz % pid_hz !== 0)) {
    add("DRN-RATE-DIVIDE", "/flight/pid_hz", `pid_hz ${pid_hz} must divide step_hz ${step_hz} and not exceed it`);
  }
  if (data.kind === "legacy-craft") return issues;

  const instances = new Map([...p.components, ...p.boards].map((i) => [i.id, i]));
  const descriptorOf = (id: string): { part?: Component; why: string } => {
    const instance = instances.get(id);
    if (!instance) return { why: `${id} is not in the project` };
    const part = resolve(instance.definition);
    return part ? { part, why: "" } : { why: `${instance.definition.ref}: part not in the library` };
  };
  const mismatch = (code: DroneIssueCode, path: string, id: string, role: string, has: (d: Component) => boolean) => {
    const { part, why } = descriptorOf(id);
    if (!part) add(code, path, why);
    else if (!has(part)) add(code, path, `${instances.get(id)?.definition.ref ?? id} is not a ${role}`);
  };

  const mounts = new Map(p.mechanical.mounts.map((m) => [m.id, m]));
  const slotIds = new Set<string>();
  const channels = new Set<string>();
  (data.motors ?? []).forEach((slot, i) => {
    const at = `/motors/${i}`;
    if (slotIds.has(slot.id)) add("DRN-SLOT-DUP-ID", `${at}/id`, `two motor slots are called ${slot.id}`);
    slotIds.add(slot.id);

    mismatch("DRN-SLOT-MOTOR-ROLE", `${at}/motor`, slot.motor, "drone motor", (d) => {
      const motor = d.mechanics?.motor;
      return motor?.kv_rpm_per_v !== undefined || motor?.ke_vs_per_rad !== undefined;
    });
    mismatch("DRN-SLOT-PROP-ROLE", `${at}/prop`, slot.prop, "propeller", (d) => d.mechanics?.prop !== undefined);
    mismatch("DRN-SLOT-ESC-ROLE", `${at}/esc`, slot.esc, "speed controller", (d) => d.mechanics?.esc !== undefined);

    const escBlock = descriptorOf(slot.esc).part?.mechanics?.esc;
    const key = `${slot.esc}:${slot.esc_channel}`;
    if (escBlock && slot.esc_channel >= (escBlock.channels ?? 1)) {
      add("DRN-ESC-CHANNEL", `${at}/esc_channel`, `channel ${slot.esc_channel} does not exist: ${slot.esc} has ${escBlock.channels ?? 1}`);
    } else if (channels.has(key)) {
      add("DRN-ESC-CHANNEL", `${at}/esc_channel`, `channel ${slot.esc_channel} of ${slot.esc} drives another motor already`);
    }
    channels.add(key);

    const mount = mounts.get(slot.mount);
    if (!mount) add("DRN-MOUNT-MISSING", `${at}/mount`, `${slot.mount} is not a mount of this project`);
    else if (thrustDot(mount.pose.rpy_deg) < -1e-12) {
      add("DRN-MOUNT-AXIS", `${at}/mount`, `${slot.mount} points more than 90 degrees away from up`);
    }
  });

  if (data.battery !== undefined) {
    mismatch("DRN-BATTERY-ROLE", "/battery", data.battery, "battery", (d) => d.mechanics?.battery !== undefined);
  }
  if (data.controller !== undefined) {
    mismatch("DRN-CONTROLLER-ROLE", "/controller", data.controller, "flight controller", (d) => d.mechanics?.fc !== undefined);
  }
  return issues;
}
