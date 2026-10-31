"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Op } from "@/project/generated/types";
import { checkDroneDomain, type DroneIssue, type Resolve } from "@/project/domains/drone-semantic";
import type { CraftGeometry } from "@/studio/art/craft";
import type { CommitResult, DocStore } from "@/studio/stores/doc";
import { buildFromProject, type Build } from "@/sim/flight/build";
import type { propClash } from "@/sim/flight/clash";
import { evaluateBuild, type BuildOutputs } from "@/sim/flight/evaluate";
import { isOutOfRange } from "@/sim/flight/guards";
import type { MassProps } from "@/sim/flight/mass";

export type BuildState = "empty" | "partial" | "complete" | "legacy";

export interface DroneBuild {
  build: Build | null;
  out: BuildOutputs | null;
  state: BuildState;
  commit(ops: Op[], label: string): CommitResult;
  issues: DroneIssue[];
}

const IDLE_MS = 300;
const MM_PER_M = 1000;
const NO_MECHANICS = { frames: [], bodies: [], joints: [], mounts: [] };
const FIELDS = "input, select, textarea, [contenteditable='true']";

let pointerDown = false;
let fieldFocused = false;
let settling: ReturnType<typeof setTimeout> | undefined;
const watchers = new Set<() => void>();

const adjusting = (): boolean => pointerDown || fieldFocused || settling !== undefined;
const notify = () => watchers.forEach((watch) => watch());

function settle() {
  clearTimeout(settling);
  settling = setTimeout(() => {
    settling = undefined;
    notify();
  }, IDLE_MS);
  notify();
}

function press() {
  pointerDown = true;
  notify();
}

function release() {
  pointerDown = false;
  settle();
}

function focusIn(ev: Event) {
  fieldFocused = ev.target instanceof Element && ev.target.matches(FIELDS);
  notify();
}

function focusOut() {
  fieldFocused = false;
  settle();
}

const events: ReadonlyArray<[string, (ev: Event) => void]> = [
  ["pointerdown", press],
  ["pointerup", release],
  ["pointercancel", release],
  ["focusin", focusIn],
  ["focusout", focusOut],
];

/** True while a pointer is down or a field has focus, and for 300 ms after. One set of window listeners serves every hook. */
function watchAdjusting(watch: () => void): () => void {
  if (watchers.size === 0) events.forEach(([name, handler]) => window.addEventListener(name, handler, true));
  watchers.add(watch);
  return () => {
    watchers.delete(watch);
    if (watchers.size > 0) return;
    events.forEach(([name, handler]) => window.removeEventListener(name, handler, true));
    clearTimeout(settling);
    settling = undefined;
    pointerDown = false;
    fieldFocused = false;
  };
}

function roleOfBody(id: string): CraftGeometry["bodies"][number]["role"] {
  if (/frame/i.test(id)) return "frame";
  if (/bat/i.test(id)) return "battery";
  if (/cam/i.test(id)) return "camera";
  if (/stack|fc|esc/i.test(id)) return "stack";
  return "other";
}

/** The plain geometry that `craftSvg` draws: rotors at their mounts, the bodies that have a size, the centre of mass. */
export function geometryOf(b: Build, clash: ReturnType<typeof propClash>, mass: MassProps | null): CraftGeometry {
  const touching = new Set(isOutOfRange(clash) ? [] : clash.pairs.flatMap((pair) => [pair.a, pair.b]));
  return {
    motors: b.slots.map((s) => ({
      id: s.id,
      x_mm: s.axis_mm[0],
      y_mm: s.axis_mm[1],
      r_mm: (s.prop.d_m * MM_PER_M) / 2,
      spin: s.spin,
      clash: touching.has(s.id),
    })),
    bodies: b.bodies.flatMap((body) => {
      const { shape } = body;
      if (shape.kind === "mesh") return [];
      const [w_mm, h_mm] = shape.kind === "box" ? shape.size_mm : [2 * shape.radius_mm, 2 * shape.radius_mm];
      return [{ id: body.id, role: roleOfBody(body.id), x_mm: body.position_mm[0], y_mm: body.position_mm[1], w_mm, h_mm, rot_deg: body.rpy_deg[2] }];
    }),
    com_mm: mass ? [mass.com_mm[0], mass.com_mm[1]] : null,
  };
}

function stateOf(kind: string | undefined, build: Build | null, out: BuildOutputs | null): BuildState {
  if (kind === "legacy-craft") return "legacy";
  if (!build) return "empty";
  const picked = build.slots.length > 0 || build.packRef !== "" || build.fcRef !== "";
  if (!picked && build.missing.some((need) => need.path === "domains.drone.motors")) return "empty";
  return out && out.blocked.length === 0 && build.missing.length === 0 ? "complete" : "partial";
}

/** The project's drone build and its numbers. While the person is dragging or typing the numbers come from the fast solve; 300 ms after the last edit they are exact. */
export function useDroneBuild(doc: DocStore, resolve: Resolve): DroneBuild {
  const project = useSyncExternalStore(doc.subscribe, () => doc.getState().state, () => doc.getState().state);
  const view = useMemo(() => ({ ...project, mechanical: project.mechanical ?? NO_MECHANICS, domains: project.domains ?? {} }), [project]);
  const built = useMemo(() => buildFromProject(view, resolve), [view, resolve]);
  const build = "build" in built ? built.build : null;
  const issues = useMemo(() => checkDroneDomain(view, resolve), [view, resolve]);
  const fast = useSyncExternalStore(watchAdjusting, adjusting, () => false);
  const out = useMemo(() => (build ? evaluateBuild(build, { fast }) : null), [build, fast]);

  const commit = useCallback((ops: Op[], label: string) => doc.commit(ops, { label }), [doc]);
  const state = stateOf(project.domains?.drone?.data.kind, build, out);
  return { build, out, state, commit, issues };
}
