import type { Op, Project } from "../generated/types.ts";

export interface RefError {
  path: string;
  code: "unknown-body" | "unknown-joint" | "unknown-surface" | "unknown-mount" | "unknown-component" | "not-a-wheel";
  message: string;
}

const ROOT = "domains.robotics.data";

/** The cross-references the schema cannot see: the robotics domain against `mechanical`, `components` and its own surfaces. */
export function validateRoboticsRefs(doc: Project): RefError[] {
  const data = doc.domains?.robotics?.data;
  if (!data) return [];

  const bodies = new Set((doc.mechanical?.bodies ?? []).map((b) => b.id));
  const joints = new Map((doc.mechanical?.joints ?? []).map((j) => [j.id, j.kind]));
  const mounts = new Set((doc.mechanical?.mounts ?? []).map((m) => m.id));
  const components = new Set(doc.components.map((c) => c.id));
  const surfaces = new Set(data.surfaces.map((s) => s.id));
  const errors: RefError[] = [];

  for (const id of Object.keys(data.bodies)) {
    if (!bodies.has(id)) errors.push({ path: `${ROOT}.bodies.${id}`, code: "unknown-body", message: `${id} is not a body in mechanical` });
  }
  for (const id of Object.keys(data.joints)) {
    if (!joints.has(id)) errors.push({ path: `${ROOT}.joints.${id}`, code: "unknown-joint", message: `${id} is not a joint in mechanical` });
  }
  for (const id of Object.keys(data.wheels)) {
    const kind = joints.get(id);
    if (kind === undefined) {
      errors.push({ path: `${ROOT}.wheels.${id}`, code: "unknown-joint", message: `${id} is not a joint in mechanical` });
    } else if (kind !== "wheel") {
      errors.push({ path: `${ROOT}.wheels.${id}`, code: "not-a-wheel", message: `${id} is a ${kind} joint, not a wheel` });
    }
  }

  const surfaceRef = (path: string, id: string) => {
    if (!surfaces.has(id)) errors.push({ path, code: "unknown-surface", message: `${id} is not in surfaces` });
  };
  surfaceRef(`${ROOT}.arena.floor.surface`, data.arena.floor.surface);
  data.arena.statics.forEach((s, i) => surfaceRef(`${ROOT}.arena.statics.${i}.surface`, s.surface));

  data.sensors.forEach((sensor, i) => {
    if (!mounts.has(sensor.mount)) {
      errors.push({ path: `${ROOT}.sensors.${i}.mount`, code: "unknown-mount", message: `${sensor.mount} is not a mount in mechanical` });
    }
    if (!components.has(sensor.component)) {
      errors.push({ path: `${ROOT}.sensors.${i}.component`, code: "unknown-component", message: `${sensor.component} is not in components` });
    }
  });
  return errors;
}

/** Runs after the generic handler has applied a `domain.patch` or `domain.set`; `state` is the document it produced. */
export function afterDomainOp(
  state: Project,
  op: Extract<Op, { k: "domain.patch" | "domain.set" }>,
): { ok: true } | { ok: false; errors: RefError[] } {
  if (op.domain !== "robotics") return { ok: true };
  const errors = validateRoboticsRefs(state);
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
