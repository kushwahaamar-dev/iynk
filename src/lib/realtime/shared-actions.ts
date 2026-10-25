// Which lab-store actions a room shares (H7), per lab. Each store names its
// own: what changes the build is shared and applied in the relay's order;
// camera, tabs, hover, each person's own quiz and everything a client derives
// itself (figure reports, interpreter ticks, check results) stays local.
//
// The keyboard baton (BUILD-PLAN §3.2 item 7): only its holder changes the
// build. Looking around (views, selection) and poking a running sketch are
// free for everyone. Code is special: the holder applies its edits at once
// and the others follow the full text it sends.

import type { LabKind } from "@/components/dock/types";
import type { BoardLabAction } from "@/lib/boardlab/store";
import type { DroneLabAction } from "@/lib/dronelab/store";
import type { BenchAction } from "@/lib/robotics/store";
import type { Action } from "./protocol";

export type LabSync = {
  isShared(type: string): boolean;
  /** Shared actions anyone may send; every other shared action needs the keyboard baton. */
  isFree(type: string): boolean;
  /** Edits to code text, applied at once by the keyboard holder. */
  isCodeEdit(type: string): boolean;
  /**
   * The actions that carry the code of `state` to another screen, given the
   * code edits made since the last send; null when the store's code can't be
   * read as text (the edits then travel as they are, in order).
   */
  codeSync(state: unknown, edits: readonly Action[]): Action[] | null;
  /** A signature of all code in a state, to notice when an applied action changed it. */
  codeKey(state: unknown): string;
  /** Local actions that start, on a joiner, what the host's snapshot had running (a sketch). */
  resume(snapshot: unknown): Action[];
};

/** Dispatched on a joiner with the host's state; each lab store takes the shared fields from it. */
export const HYDRATE = "sync/hydrate";

type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj => (typeof value === "object" && value !== null ? (value as Obj) : {});
const str = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

// The lists name each store's own action types (type-only imports, so no lab's code reaches another's pages).
type Lists<T extends string> = { shared: readonly T[]; free: readonly T[]; code: readonly T[] };

function filters<T extends string>(lists: Lists<T>) {
  const shared = new Set<string>(lists.shared);
  const free = new Set<string>(lists.free);
  const code = new Set<string>(lists.code);
  return {
    isShared: (type: string) => shared.has(type),
    isFree: (type: string) => free.has(type),
    isCodeEdit: (type: string) => code.has(type),
  };
}

const BOARD: Lists<BoardLabAction["type"]> = {
  shared: [
    "code/replace", "code/reset", "param/set", "run/start", "run/stop", "serial/send", "serial/clear", "serial/baud",
    "input/set", "input/request", "view/set", "exploded/set", "part/select", "power/set", "fault/trigger", "fault/clear",
    "variant/set", "assembly/reset",
  ],
  free: ["view/set", "exploded/set", "part/select", "serial/clear", "serial/send", "input/set", "input/request"],
  code: ["code/replace", "code/reset", "param/set"],
};

const ROBOTICS: Lists<BenchAction["type"]> = {
  shared: [
    "step/do", "fault/trigger", "fault/clear", "mode/select", "mode/run", "part/select", "serial/clear",
    "task/edit", "task/reset", "task/solution", "task/run",
  ],
  free: ["part/select", "serial/clear"],
  code: ["task/edit", "task/reset", "task/solution"],
};

const DRONE: Lists<DroneLabAction["type"]> = {
  shared: [
    "design/pick", "figure/button", "select", "sheet", "exploded", "bench/run", "bench/add", "bench/remove",
    "test/run", "cli/run", "cli/clear",
  ],
  // A press inside someone's own figure has already happened there, so refusing the record would only hide it.
  free: ["figure/button", "select", "sheet", "exploded", "cli/clear"],
  code: [],
};

const board: LabSync = {
  ...filters(BOARD),
  codeSync(state) {
    const code = str(obj(state).code);
    return code === undefined ? null : [{ type: "code/replace", code }];
  },
  codeKey: (state) => str(obj(state).code) ?? "",
  resume(snapshot) {
    const status = obj(obj(snapshot).run).status;
    return typeof status === "string" && status !== "stopped" ? [{ type: "run/start" }] : [];
  },
};

const robotics: LabSync = {
  ...filters(ROBOTICS),
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
  resume: () => [],
};

const drone: LabSync = {
  ...filters(DRONE),
  codeSync: () => [],
  codeKey: () => "",
  resume: () => [],
};

const LAB_SYNC: Record<LabKind, LabSync> = { board, robotics, drone };

export function labSync(lab: LabKind): LabSync {
  return LAB_SYNC[lab];
}
