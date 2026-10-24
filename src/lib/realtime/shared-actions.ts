// Which lab-store actions a room shares (H7), per lab. What changes the build
// is shared and applied in the relay's order; camera, tabs, hover, each
// person's own quiz and everything a client derives itself (figure reports,
// interpreter ticks, check results) stays local. Code is special: one peer
// holds the keyboard and the others follow the full text it sends.

import type { LabKind } from "@/components/dock/types";
import { SHARED_ACTIONS as BOARD_SHARED } from "@/lib/boardlab/store";
import type { Action } from "./protocol";

export type LabSync = {
  isShared(type: string): boolean;
  /** Edits to code text, gated by the keyboard baton. */
  isCodeEdit(type: string): boolean;
  /**
   * The actions that carry the code of `state` to another screen, given the
   * code edits made since the last send; null when the store's code can't be
   * read as text (the edits then travel as they are, in order).
   */
  codeSync(state: unknown, edits: readonly Action[]): Action[] | null;
  /** A signature of all code in a state, to notice when an applied action changed it. */
  codeKey(state: unknown): string;
  /** Rebuilds a host's snapshot on a joiner through the store's own actions. */
  rebuild(snapshot: unknown): Action[];
};

/** Dispatched first with the host's state; a store that handles it needs no rebuild. */
export const HYDRATE = "sync/hydrate";

type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj => (typeof value === "object" && value !== null ? (value as Obj) : {});
const str = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

const BOARD_CODE = new Set(["code/replace", "code/reset", "param/set"]);
const boardShared = new Set<string>(BOARD_SHARED);

const board: LabSync = {
  isShared: (type) => boardShared.has(type),
  isCodeEdit: (type) => BOARD_CODE.has(type),
  codeSync(state) {
    const code = str(obj(state).code);
    return code === undefined ? null : [{ type: "code/replace", code }];
  },
  codeKey: (state) => str(obj(state).code) ?? "",
  rebuild(snapshot) {
    const s = obj(snapshot);
    const out: Action[] = [];
    if (typeof s.variant === "string") out.push({ type: "variant/set", id: s.variant });
    if (typeof s.code === "string") out.push({ type: "code/replace", code: s.code });
    const serial = obj(s.serial);
    if (typeof serial.baud === "number") out.push({ type: "serial/baud", baud: serial.baud });
    for (const [id, value] of Object.entries(obj(s.inputs))) if (typeof value === "number") out.push({ type: "input/set", id, value });
    if ("power" in s) out.push({ type: "power/set", source: str(s.power) ?? null });
    if (typeof s.view === "string") out.push({ type: "view/set", view: s.view });
    if (typeof s.exploded === "boolean") out.push({ type: "exploded/set", on: s.exploded });
    if ("selected" in s) out.push({ type: "part/select", id: str(s.selected) ?? null });
    out.push(typeof s.fault === "string" ? { type: "fault/trigger", id: s.fault } : { type: "fault/clear" });
    if (obj(s.run).status === "running") out.push({ type: "run/start" });
    return out;
  },
};

const ROBOTICS_SHARED = new Set([
  "step/do",
  "fault/trigger",
  "fault/clear",
  "mode/select",
  "mode/run",
  "part/select",
  "serial/clear",
  "task/edit",
  "task/reset",
  "task/solution",
  "task/run",
]);
const ROBOTICS_CODE = new Set(["task/edit", "task/reset", "task/solution"]);

const robotics: LabSync = {
  isShared: (type) => ROBOTICS_SHARED.has(type),
  isCodeEdit: (type) => ROBOTICS_CODE.has(type),
  codeSync(state, edits) {
    const tasks = obj(obj(state).tasks);
    const edited = edits.map((edit) => str(edit.task)).filter((id): id is string => id !== undefined);
    // No edit named a task (the code changed some other way): send them all.
    const ids = new Set(edited.length > 0 ? edited : Object.keys(tasks));
    const out: Action[] = [];
    for (const task of ids) {
      const code = str(obj(tasks[task]).code);
      if (code === undefined) return null;
      out.push({ type: "task/edit", task, code });
    }
    return out;
  },
  codeKey: (state) =>
    Object.entries(obj(obj(state).tasks))
      .map(([id, task]) => `${id}\u0000${str(obj(task).code) ?? ""}`)
      .join("\u0001"),
  rebuild(snapshot) {
    const s = obj(snapshot);
    const out: Action[] = [];
    // Steps are kept in build order; replaying the finished ones walks the joiner's figure there.
    for (const [step, progress] of Object.entries(obj(s.steps))) if (obj(progress).done === true) out.push({ type: "step/do", step });
    const mode = str(obj(s.mode).selected);
    if (mode) out.push({ type: "mode/select", mode });
    for (const [task, session] of Object.entries(obj(s.tasks))) {
      const code = str(obj(session).code);
      if (code !== undefined) out.push({ type: "task/edit", task, code });
    }
    return out;
  },
};

const DRONE_SHARED = new Set([
  "design/pick",
  "figure/button",
  "select",
  "sheet",
  "exploded",
  "bench/run",
  "bench/add",
  "bench/remove",
  "test/run",
  "cli/run",
  "cli/clear",
]);

const drone: LabSync = {
  isShared: (type) => DRONE_SHARED.has(type),
  isCodeEdit: () => false,
  codeSync: () => [],
  codeKey: () => "",
  rebuild(snapshot) {
    const s = obj(snapshot);
    const out: Action[] = [];
    for (const [key, value] of Object.entries(obj(s.pick))) if (typeof value === "string") out.push({ type: "design/pick", key, value });
    if ("sheet" in s) out.push({ type: "sheet", sheet: s.sheet === "wiring" ? "wiring" : null });
    if (typeof s.exploded === "boolean") out.push({ type: "exploded", on: s.exploded });
    if ("sel" in s) out.push({ type: "select", id: str(s.sel) ?? null });
    return out;
  },
};

const LAB_SYNC: Record<LabKind, LabSync> = { board, robotics, drone };

export function labSync(lab: LabKind): LabSync {
  return LAB_SYNC[lab];
}
