import { diag } from "../core/result.ts";
import type { Diagnostic } from "../core/result.ts";
import type {
  Board,
  Check,
  Component,
  ComponentDependency,
  Net,
  Project,
  View,
  WireEnd,
} from "./generated/types.ts";
import { stripOfHole } from "./holes.ts";
import { MAX_STORED_DIAGNOSTICS } from "./limits.ts";

/** The entities a batch changed: objects of the new state that are not the same object in the old one. */
export type Changed = ReadonlySet<object>;

export interface Instance {
  entity: Board | Component;
  path: string;
  dep: ComponentDependency | undefined;
}

/** The holes and the hole-to-strip table of a breadboard view's surface, read from the pinned interface. */
export interface Surface {
  holes: ReadonlySet<string>;
  strips: ReadonlyMap<string, string>;
}

/** What the rules share: indexes built once per call, and the changed set when only a batch is checked. */
export interface Ctx {
  doc: Project;
  changed: Changed | undefined;
  instances: ReadonlyMap<string, Instance>;
  nets: ReadonlyMap<string, Net>;
  sourceIds: ReadonlySet<string>;
  inputIds: ReadonlySet<string>;
  parameterIds: ReadonlySet<string>;
  /** First net of each pin, keyed `c/p`. */
  pinNet: ReadonlyMap<string, string>;
  /** True when a rule should judge an entity: always for a whole document, else when one of `entities` changed. */
  scoped(...entities: unknown[]): boolean;
  /** The pin exists on the instance. An instance whose definition is not pinned cannot be judged and passes. */
  pinOk(component: unknown, pin: unknown): boolean;
  surfaceOf(view: View): Surface | undefined;
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Runs `fn` on each object of an array and skips anything else, so a malformed document is read as far as it goes. */
export function each<T>(value: unknown, fn: (item: T, index: number) => void): void {
  if (!Array.isArray(value)) return;
  value.forEach((item: unknown, index) => {
    if (isRecord(item)) fn(item as T, index);
  });
}

const rows = <T>(value: unknown): T[] => (Array.isArray(value) ? value.filter(isRecord) : []) as T[];

export const pinKey = (c: string, p: string): string => `${c}/${p}`;
export const defKey = (def: { ref: string; version: string }): string => `${def.ref}@${def.version}`;

export function makeCtx(doc: Project, changed?: Changed): Ctx {
  const deps = new Map<string, ComponentDependency>();
  each<ComponentDependency>(doc.dependencies?.components, (dep) => {
    if (isRecord(dep.interface)) deps.set(defKey(dep), dep);
  });

  const instances = new Map<string, Instance>();
  for (const [key, group] of [["boards", doc.boards], ["components", doc.components]] as const) {
    each<Board | Component>(group, (entity, i) => {
      const def = entity.definition;
      const dep = isRecord(def) ? deps.get(defKey(def)) : undefined;
      if (typeof entity.id === "string" && !instances.has(entity.id)) {
        instances.set(entity.id, { entity, path: `/${key}/${i}`, dep });
      }
    });
  }

  const nets = new Map<string, Net>();
  const pinNet = new Map<string, string>();
  each<Net>(doc.nets, (net) => {
    if (typeof net.id !== "string" || nets.has(net.id)) return;
    nets.set(net.id, net);
    each<{ c: string; p: string }>(net.connections, (m) => {
      const key = pinKey(m.c, m.p);
      if (!pinNet.has(key)) pinNet.set(key, net.id);
    });
  });

  const idSet = (value: unknown, field: string): Set<string> => {
    const ids = new Set<string>();
    each<Record<string, unknown>>(value, (item) => {
      const id = item[field];
      if (typeof id === "string") ids.add(id);
    });
    return ids;
  };

  const pinSets = new Map<ComponentDependency, Set<string>>();
  const pinsOf = (dep: ComponentDependency): Set<string> => {
    let pins = pinSets.get(dep);
    if (!pins) {
      pins = idSet(dep.interface.pins, "id");
      pinSets.set(dep, pins);
    }
    return pins;
  };

  const surfaces = new Map<ComponentDependency, Surface | undefined>();
  const surfaceOfDep = (dep: ComponentDependency): Surface | undefined => {
    if (!surfaces.has(dep)) {
      let surface: Surface | undefined;
      try {
        const holes = pinsOf(dep);
        if (holes.size > 0) surface = { holes, strips: stripOfHole(dep.interface) };
      } catch {
        surface = undefined;
      }
      surfaces.set(dep, surface);
    }
    return surfaces.get(dep);
  };

  return {
    doc,
    changed,
    instances,
    nets,
    sourceIds: idSet(doc.sources, "id"),
    inputIds: idSet(doc.simulation?.world?.inputs, "id"),
    parameterIds: idSet(doc.parameters, "id"),
    pinNet,
    scoped: (...entities) =>
      changed === undefined || entities.some((e) => typeof e === "object" && e !== null && changed.has(e)),
    pinOk(component, pin) {
      const inst = typeof component === "string" ? instances.get(component) : undefined;
      if (!inst) return false;
      return inst.dep === undefined || pinsOf(inst.dep).has(pin as string);
    },
    surfaceOf(view) {
      const inst = typeof view.surface === "string" ? instances.get(view.surface) : undefined;
      return inst?.dep && surfaceOfDep(inst.dep);
    },
  };
}

/**
 * Every entity of a document with its JSON Pointer: the objects the rules judge and `checkBatch` compares between
 * two states. A diagnostic belongs to the deepest of these that its path passes through.
 */
export function entityIndex(doc: Project): Map<object, string> {
  const index = new Map<object, string>();
  const add = (value: unknown, path: string) => {
    if (isRecord(value)) index.set(value, path);
  };
  const addAll = (value: unknown, path: string) => each<object>(value, (item, i) => index.set(item, `${path}/${i}`));

  add(doc.access, "/access");
  add(doc.provenance, "/provenance");
  add(doc.guide, "/guide");
  add(doc.history, "/history");
  for (const key of ["actors", "boards", "components", "nets", "sources", "assets", "parameters", "tests"] as const) {
    addAll(doc[key], `/${key}`);
  }
  addAll(doc.dependencies?.components, "/dependencies/components");
  addAll(doc.history?.checkpoints, "/history/checkpoints");
  each<View>(doc.views, (view, i) => {
    const base = `/views/${i}`;
    index.set(view, base);
    for (const key of ["placements", "junctions", "wires", "labels", "groups"] as const) addAll(view[key], `${base}/${key}`);
  });
  each<{ checks?: unknown }>(doc.tests, (test, i) => addAll(test.checks, `/tests/${i}/checks`));
  const sim = doc.simulation;
  for (const key of ["runtimes", "faults", "instruments"] as const) addAll(sim?.[key], `/simulation/${key}`);
  addAll(sim?.world?.inputs, "/simulation/world/inputs");
  addAll(sim?.world?.script, "/simulation/world/script");
  for (const key of ["frames", "bodies", "joints", "mounts"] as const) addAll(doc.mechanical?.[key], `/mechanical/${key}`);
  return index;
}

const RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** Why a source or asset path is not allowed (V3-PATH), or null. */
export function pathProblem(path: string): string | null {
  if (path.startsWith("/")) return "starts with a slash";
  if (path.includes("\\")) return "contains a backslash";
  for (let i = 0; i < path.length; i++) {
    const code = path.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return "contains a control character";
  }
  for (const segment of path.split("/")) {
    if (segment === "") return "has an empty segment";
    if (segment === "." || segment === "..") return `has a "${segment}" segment`;
    if (RESERVED_NAME.test(segment.split(".")[0]!)) return `uses the reserved name ${segment}`;
  }
  return null;
}

const ROTATED_VIEWS: ReadonlySet<string> = new Set(["schematic", "breadboard", "board"]);
const CAUSE_ID = /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)*$/;

function definitionRules(ctx: Ctx): Diagnostic[] {
  const out: Diagnostic[] = [];
  const used = new Set<ComponentDependency>();
  for (const { entity, path, dep } of ctx.instances.values()) {
    if (dep) used.add(dep);
    if (!ctx.scoped(entity)) continue;
    const def = entity.definition;
    if (!dep) {
      const name = isRecord(def) ? defKey(def) : "no definition";
      out.push(diag("V3-DEF", "error", `${path}/definition`, `${entity.id} uses ${name}, which is not in dependencies`));
      continue;
    }
    const known = new Map<string, Record<string, unknown>>();
    each<Record<string, unknown>>(dep.interface.params, (p) => {
      if (typeof p.id === "string") known.set(p.id, p);
    });
    for (const [key, value] of Object.entries(isRecord(entity.params) ? entity.params : {})) {
      const at = `${path}/params/${key}`;
      const param = known.get(key);
      if (!param) out.push(diag("V3-PARAM", "error", at, `${entity.id} sets ${key}, which its part does not declare`));
      if (isRecord(value) && !ctx.parameterIds.has(value.param as string)) {
        out.push(diag("V3-PARAM-REF", "error", at, `${entity.id}.${key} is bound to ${String(value.param)}, which is not a parameter`));
      }
      if (param?.type === "number" && typeof value === "number") {
        const { min, max } = param;
        if ((typeof min === "number" && value < min) || (typeof max === "number" && value > max)) {
          out.push(diag("V3-PARAM-RANGE", "error", at, `${entity.id}.${key} is ${value}, outside ${String(min)} to ${String(max)}`));
        }
      }
    }
  }
  each<ComponentDependency>(ctx.doc.dependencies?.components, (dep, i) => {
    if (!used.has(dep) && ctx.scoped(dep)) {
      out.push(diag("V3-DEP-UNUSED", "warning", `/dependencies/components/${i}`, `Nothing uses ${String(dep.ref)}@${String(dep.version)}`));
    }
  });
  each<{ kind?: string; value?: unknown; min?: unknown; max?: unknown; step?: unknown }>(ctx.doc.parameters, (p, i) => {
    if (p.kind !== "number" || typeof p.value !== "number" || !ctx.scoped(p)) return;
    const at = `/parameters/${i}/value`;
    const { min, max, step } = p;
    if ((typeof min === "number" && p.value < min) || (typeof max === "number" && p.value > max)) {
      out.push(diag("V3-PARAM-RANGE", "error", at, `The value ${p.value} is outside ${String(min)} to ${String(max)}`));
    } else if (typeof step === "number" && step > 0) {
      const steps = (p.value - (typeof min === "number" ? min : 0)) / step;
      if (Math.abs(steps - Math.round(steps)) > 1e-6) {
        out.push(diag("V3-PARAM-RANGE", "error", at, `The value ${p.value} is not on the step of ${step}`));
      }
    }
  });
  return out;
}

function sameEnd(a: WireEnd, b: WireEnd): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "pin" && b.kind === "pin") return a.c === b.c && a.p === b.p;
  if (a.kind === "junction" && b.kind === "junction") return a.id === b.id;
  return a.kind === "hole" && b.kind === "hole" && a.surface === b.surface && a.hole === b.hole;
}

function viewRules(ctx: Ctx): Diagnostic[] {
  const out: Diagnostic[] = [];
  each<View>(ctx.doc.views, (view, vi) => {
    const base = `/views/${vi}`;
    const surface = ctx.surfaceOf(view);
    each<{ c: string; rotation_deg?: unknown; legs?: unknown }>(view.placements, (pl, pi) => {
      if (!ctx.scoped(pl)) return;
      const at = `${base}/placements/${pi}`;
      if (!ctx.instances.has(pl.c)) out.push(diag("V3-PLACE", "error", at, `${String(pl.c)} is placed but is not in the document`));
      if (typeof pl.rotation_deg === "number" && pl.rotation_deg % 90 !== 0 && ROTATED_VIEWS.has(view.kind)) {
        out.push(diag("V3-ROT", "warning", `${at}/rotation_deg`, `The rotation ${pl.rotation_deg} is not a multiple of 90`));
      }
      if (!isRecord(pl.legs)) return;
      if (view.kind !== "breadboard") out.push(diag("V3-LEGS", "error", `${at}/legs`, "Legs belong in a breadboard view"));
      for (const [leg, hole] of Object.entries(pl.legs)) {
        if (!ctx.pinOk(pl.c, leg)) out.push(diag("V3-LEG", "error", `${at}/legs/${leg}`, `${String(pl.c)} has no pin ${leg}`));
        if (surface && !surface.holes.has(hole as string)) {
          out.push(diag("V3-HOLE", "error", `${at}/legs/${leg}`, `${String(hole)} is not a hole of the breadboard`));
        }
      }
    });
    each<{ id: string; from: WireEnd; to: WireEnd; net: string }>(view.wires, (wire, wi) => {
      const net = ctx.nets.get(wire.net);
      if (!ctx.scoped(wire)) return;
      const at = `${base}/wires/${wi}`;
      for (const end of ["from", "to"] as const) {
        const e = wire[end];
        if (!isRecord(e)) continue;
        if (e.kind === "pin" && net && !(Array.isArray(net.connections) && net.connections.some((m) => m?.c === e.c && m?.p === e.p))) {
          out.push(diag("V3-WIRE-END", "error", `${at}/${end}`, `${wire.id}: ${String(e.c)}.${String(e.p)} is not a pin of ${wire.net}`));
        } else if (e.kind === "hole") {
          if (e.surface !== view.surface) {
            out.push(diag("V3-WIRE-SURFACE", "error", `${at}/${end}`, `${wire.id}: ${String(e.surface)} is not this view's breadboard`));
          } else if (surface && !surface.holes.has(e.hole)) {
            out.push(diag("V3-HOLE", "error", `${at}/${end}`, `${wire.id}: ${String(e.hole)} is not a hole of the breadboard`));
          }
        }
      }
      if (isRecord(wire.from) && isRecord(wire.to) && sameEnd(wire.from, wire.to)) {
        out.push(diag("V3-WIRE-SELF", "error", at, `${wire.id} joins an end to itself`));
      }
    });
  });
  return out;
}

function sourceRules(ctx: Ctx): Diagnostic[] {
  const out: Diagnostic[] = [];
  const { doc } = ctx;
  for (const key of ["sources", "assets"] as const) {
    const seen = new Map<string, number[]>();
    each<{ path: unknown }>(doc[key], (item, i) => {
      if (typeof item.path !== "string") return;
      const folded = item.path.normalize("NFC").toLowerCase();
      seen.set(folded, [...(seen.get(folded) ?? []), i]);
    });
    each<{ path: unknown }>(doc[key], (item, i) => {
      if (typeof item.path !== "string" || !ctx.scoped(item)) return;
      const at = `/${key}/${i}/path`;
      const problem = pathProblem(item.path);
      if (problem) out.push(diag("V3-PATH", "error", at, `The path ${problem}`));
      else if (seen.get(item.path.normalize("NFC").toLowerCase())!.length > 1) {
        out.push(diag("V3-PATH", "error", at, `${item.path} is also used with other capitals`, "Paths are unique ignoring case"));
      }
    });
  }
  const boardIds = new Set<string>();
  each<Board>(doc.boards, (b) => boardIds.add(b.id));
  each<{ board?: string }>(doc.sources, (source, i) => {
    if (source.board !== undefined && !boardIds.has(source.board) && ctx.scoped(source)) {
      out.push(diag("V3-SRC-BOARD", "error", `/sources/${i}/board`, `The board ${source.board} is not in the document`));
    }
  });
  each<Board>(doc.boards, (board, i) => {
    const fw = board.firmware;
    if (!isRecord(fw) || !ctx.scoped(board)) return;
    const at = `/boards/${i}/firmware`;
    const sources: unknown[] = Array.isArray(fw.sources) ? fw.sources : [];
    if (!ctx.sourceIds.has(fw.entry)) out.push(diag("V3-FW", "error", `${at}/entry`, `${board.id}: the entry source ${String(fw.entry)} is missing`));
    if (!sources.includes(fw.entry)) out.push(diag("V3-FW", "error", `${at}/entry`, `${board.id}: the entry is not in its sources`));
    sources.forEach((s, k) => {
      if (!ctx.sourceIds.has(s as string)) out.push(diag("V3-FW", "error", `${at}/sources/${k}`, `${board.id}: the source ${String(s)} is missing`));
    });
  });
  return out;
}

function simulationRules(ctx: Ctx): Diagnostic[] {
  const out: Diagnostic[] = [];
  const sim = ctx.doc.simulation;
  each<{ id: string; board: string }>(sim?.runtimes, (rt, i) => {
    if (ctx.scoped(rt) && !ctx.instances.get(rt.board)?.path.startsWith("/boards/")) {
      out.push(diag("V3-RT", "error", `/simulation/runtimes/${i}/board`, `${rt.id} names ${String(rt.board)}, which is not a board`));
    }
  });
  const inputs = new Map<string, number>();
  each<{ id: string }>(sim?.world?.inputs, (input) => inputs.set(input.id, (inputs.get(input.id) ?? 0) + 1));
  each<{ id: string; component: string; pins?: { c: string; p: string }[] }>(sim?.world?.inputs, (input, i) => {
    if (!ctx.scoped(input)) return;
    const at = `/simulation/world/inputs/${i}`;
    if (inputs.get(input.id)! > 1) out.push(diag("V3-INPUT-DUP", "error", `${at}/id`, `The input id ${input.id} is used twice`));
    if (!ctx.instances.has(input.component)) {
      out.push(diag("V3-INPUT", "error", `${at}/component`, `${input.id}: ${String(input.component)} is not in the document`));
    }
    each<{ c: string; p: string }>(input.pins, (pin, k) => {
      if (!ctx.pinOk(pin.c, pin.p)) out.push(diag("V3-INPUT-PIN", "error", `${at}/pins/${k}`, `${input.id}: ${String(pin.c)}.${String(pin.p)} does not exist`));
    });
  });
  const script = (events: unknown, path: string) =>
    each<{ input: string }>(events, (event, i) => {
      if (ctx.scoped(event) && !ctx.inputIds.has(event.input)) {
        out.push(diag("V3-SCRIPT", "error", `${path}/${i}/input`, `The event names ${String(event.input)}, which is not a world input`));
      }
    });
  script(sim?.world?.script, "/simulation/world/script");
  each<{ script?: unknown }>(ctx.doc.tests, (test, i) => script(test.script, `/tests/${i}/script`));

  each<{ id: string; cause_id: unknown; target: Record<string, unknown>; injectable?: { component: string } }>(sim?.faults, (fault, i) => {
    if (!ctx.scoped(fault)) return;
    const at = `/simulation/faults/${i}`;
    const t = isRecord(fault.target) ? fault.target : {};
    if (typeof fault.cause_id !== "string" || !CAUSE_ID.test(fault.cause_id)) {
      out.push(diag("V3-FAULT-SHAPE", "error", `${at}/cause_id`, `${fault.id}: the cause id is not a dotted lower-case name`));
    }
    if (isRecord(fault.injectable) && !ctx.instances.has(fault.injectable.component)) {
      out.push(diag("V3-FAULT-SHAPE", "error", `${at}/injectable/component`, `${fault.id}: ${String(fault.injectable.component)} is not in the document`));
    }
    if (t.component !== undefined && !ctx.instances.has(t.component as string)) {
      out.push(diag("V3-FAULT", "error", `${at}/target/component`, `${fault.id}: ${String(t.component)} is not in the document`));
    } else if (t.component !== undefined && t.pin !== undefined && !ctx.pinOk(t.component, t.pin)) {
      out.push(diag("V3-FAULT", "error", `${at}/target/pin`, `${fault.id}: ${String(t.component)} has no pin ${String(t.pin)}`));
    }
    const nets: [string, unknown][] = [["net", t.net], ...(Array.isArray(t.nets) ? t.nets.map((n, k): [string, unknown] => [`nets/${k}`, n]) : [])];
    for (const [where, net] of nets) {
      if (net !== undefined && !ctx.nets.has(net as string)) {
        out.push(diag("V3-FAULT", "error", `${at}/target/${where}`, `${fault.id}: the net ${String(net)} is not in the document`));
      }
    }
  });
  return out;
}

function checkRules(ctx: Ctx): Diagnostic[] {
  const out: Diagnostic[] = [];
  const boards = rows<Board>(ctx.doc.boards);
  each<{ checks?: unknown }>(ctx.doc.tests, (test, ti) => {
    const ids = new Map<string, number>();
    each<Check>(test.checks, (check) => ids.set(check.id, (ids.get(check.id) ?? 0) + 1));
    each<Check & Record<string, unknown>>(test.checks, (check, ci) => {
      if (!ctx.scoped(check)) return;
      const at = `/tests/${ti}/checks/${ci}`;
      const label = `${String(check.id)}`;
      if (ids.get(check.id)! > 1) out.push(diag("V3-CHECK-DUP", "error", `${at}/id`, `The check id ${label} is used twice in this test`));
      if (typeof check.pin === "string") {
        const boardId = typeof check.board === "string" ? check.board : boards.length === 1 ? boards[0]!.id : undefined;
        const inst = boardId === undefined ? undefined : ctx.instances.get(boardId);
        const pins = rows<{ id: string; net?: string }>(inst?.dep?.interface.pins);
        if (!inst || (inst.dep && !pins.some((p) => p.id === check.pin || p.net === check.pin))) {
          out.push(diag("V3-CHECK-PIN", "error", `${at}/pin`, `${label}: no board has the pin ${check.pin}`));
        }
      }
      if (typeof check.net === "string" && !ctx.nets.has(check.net)) {
        out.push(diag("V3-CHECK-NET", "error", `${at}/net`, `${label}: the net ${check.net} is not in the document`));
      }
      if (typeof check.source === "string" && !ctx.sourceIds.has(check.source)) {
        out.push(diag("V3-CHECK-SRC", "error", `${at}/source`, `${label}: the source ${check.source} is not in the document`));
      }
      const after = check.after;
      if (check.kind === "responds" && isRecord(after) && !ctx.inputIds.has(after.input as string)) {
        out.push(diag("V3-CHECK-INPUT", "error", `${at}/after/input`, `${label}: ${String(after.input)} is not a world input`));
      }
    });
  });
  return out;
}

function guideRules(ctx: Ctx): Diagnostic[] {
  const { guide } = ctx.doc;
  const source = guide?.starter?.source;
  if (typeof source !== "string" || ctx.sourceIds.has(source) || !ctx.scoped(guide)) return [];
  return [diag("V3-GUIDE", "error", "/guide/starter/source", `The starter source ${source} is not in the document`)];
}

function mechanicalRules(ctx: Ctx): Diagnostic[] {
  const out: Diagnostic[] = [];
  const mech = ctx.doc.mechanical;
  if (!isRecord(mech)) return out;
  const ids = (value: unknown) => {
    const found = new Set<string>();
    each<{ id: string }>(value, (item) => found.add(item.id));
    return found;
  };
  const frames = ids(mech.frames);
  const bodies = ids(mech.bodies);
  const assets = ids(ctx.doc.assets);
  const parents = new Map<string, unknown>();
  each<{ id: string; parent: unknown }>(mech.frames, (f) => parents.set(f.id, f.parent));

  each<{ id: string; parent: string }>(mech.frames, (frame, i) => {
    if (!ctx.scoped(frame)) return;
    const at = `/mechanical/frames/${i}`;
    if (frame.parent !== "world" && !frames.has(frame.parent)) {
      out.push(diag("V3-FRAME", "error", `${at}/parent`, `${frame.id}: the parent ${String(frame.parent)} is not a frame`));
      return;
    }
    const seen = new Set<string>([frame.id]);
    for (let cur = frame.parent; cur !== "world"; cur = parents.get(cur) as string) {
      if (seen.has(cur)) {
        out.push(diag("V3-FRAME-CYCLE", "error", `${at}/parent`, `${frame.id} leads into a loop of frames`));
        break;
      }
      seen.add(cur);
      if (!parents.has(cur)) break;
    }
  });
  each<{ id: string; frame: string; component?: string; shape?: { kind?: string; asset?: string } }>(mech.bodies, (body, i) => {
    if (!ctx.scoped(body)) return;
    const at = `/mechanical/bodies/${i}`;
    if (!frames.has(body.frame)) out.push(diag("V3-BODY", "error", `${at}/frame`, `${body.id}: ${String(body.frame)} is not a frame`));
    if (body.component !== undefined && !ctx.instances.has(body.component)) {
      out.push(diag("V3-BODY", "error", `${at}/component`, `${body.id}: ${body.component} is not in the document`));
    }
    if (isRecord(body.shape) && body.shape.kind === "mesh" && !assets.has(body.shape.asset as string)) {
      out.push(diag("V3-BODY", "error", `${at}/shape/asset`, `${body.id}: the mesh asset ${String(body.shape.asset)} is not in the document`));
    }
  });
  each<{ id: string; parent: string; child: string; limits?: Record<string, unknown>; drive?: { component: string; pin?: string } }>(
    mech.joints,
    (joint, i) => {
      if (!ctx.scoped(joint)) return;
      const at = `/mechanical/joints/${i}`;
      for (const end of ["parent", "child"] as const) {
        if (!bodies.has(joint[end])) out.push(diag("V3-BODY", "error", `${at}/${end}`, `${joint.id}: ${String(joint[end])} is not a body`));
      }
      const drive = joint.drive;
      if (isRecord(drive)) {
        if (!ctx.instances.has(drive.component)) {
          out.push(diag("V3-BODY", "error", `${at}/drive/component`, `${joint.id}: ${String(drive.component)} is not in the document`));
        } else if (drive.pin !== undefined && !ctx.pinOk(drive.component, drive.pin)) {
          out.push(diag("V3-BODY", "error", `${at}/drive/pin`, `${joint.id}: ${drive.component} has no pin ${String(drive.pin)}`));
        }
      }
      if (isRecord(joint.limits) && joint.limits.effort !== undefined && joint.limits.effort_n !== undefined) {
        out.push(diag("V3-LIMITS", "error", `${at}/limits`, `${joint.id}: limits carries both effort and effort_n`));
      }
    },
  );
  each<{ id: string; component: string; frame: string }>(mech.mounts, (mount, i) => {
    if (!ctx.scoped(mount)) return;
    const at = `/mechanical/mounts/${i}`;
    if (!frames.has(mount.frame)) out.push(diag("V3-MOUNT", "error", `${at}/frame`, `${mount.id}: ${String(mount.frame)} is not a frame`));
    if (!ctx.instances.has(mount.component)) {
      out.push(diag("V3-MOUNT", "error", `${at}/component`, `${mount.id}: ${String(mount.component)} is not in the document`));
    }
  });
  return out;
}

/** V3-TOKEN: a `{{p:` or `{{t:` template token anywhere but `guide.starter` was never filled in. Walks the whole document. */
export function tokenRules(ctx: Ctx): Diagnostic[] {
  const out: Diagnostic[] = [];
  const starter = ctx.doc.guide?.starter;
  const pending: { node: unknown; path: string }[] = [{ node: ctx.doc, path: "" }];
  const seen = new Set<object>();
  while (pending.length > 0 && out.length < MAX_STORED_DIAGNOSTICS) {
    const { node, path } = pending.pop()!;
    if (typeof node === "string") {
      if (node.includes("{{p:") || node.includes("{{t:")) out.push(diag("V3-TOKEN", "error", path, "A template token was never filled in"));
      continue;
    }
    if (typeof node !== "object" || node === null || node === starter || seen.has(node)) continue;
    seen.add(node);
    for (const [key, child] of Object.entries(node)) {
      pending.push({ node: child, path: `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}` });
    }
  }
  return out;
}

/** Rules that read one entity and the interface it is pinned to. Each skips what it cannot read. */
export const ENTITY_RULES: readonly ((ctx: Ctx) => Diagnostic[])[] = [
  definitionRules,
  viewRules,
  sourceRules,
  simulationRules,
  checkRules,
  guideRules,
  mechanicalRules,
];
