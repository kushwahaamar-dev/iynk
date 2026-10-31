import { LIMITS } from "../../core/limits.ts";
import type {
  Board,
  Component,
  ComponentDependency,
  DefRef,
  Fault,
  Group,
  Net,
  Op,
  PinRef,
  Project,
  Simulation,
  Source,
  View,
  Wire,
  WireEnd,
} from "../generated/types.ts";
import { validateComponent } from "../generated/validate.mjs";
import {
  allEntityIds,
  asBag,
  findById,
  mergePatch,
  pin,
  pointer,
  reject,
  removeById,
  schemaMessage,
  setOwn,
  sortBy,
  upsertById,
} from "./types.ts";
import type { Applied, Bag, Handler, Reject } from "./types.ts";

export const dependencyOf = (state: Project, definition: DefRef): ComponentDependency | undefined =>
  state.dependencies.components.find((dep) => dep.ref === definition.ref && dep.version === definition.version);

export interface Patch {
  set?: Bag;
  params?: Bag;
}

/** The merge patch that puts back what `patch` overwrote: each touched key gets its old value, or null if it had none. */
function undoPatch(before: Bag, patch: Bag): Bag {
  const undo: Bag = {};
  for (const key of Object.keys(patch)) setOwn(undo, key, before[key] ?? null);
  return undo;
}

/**
 * Applies `set` (limited to `allowed` keys) and `params` merge patches to a board or component. Returns the patched
 * copy and the patches that undo it; the caller checks the copy against its schema.
 */
export function patchInstance<T extends Board | Component>(
  entity: T,
  patch: Patch,
  allowed: readonly string[],
): { next: T; undo: Patch } | Reject {
  const before = asBag(entity);
  const undo: Patch = {};
  let next: Bag = { ...before };
  if (patch.set) {
    const refused = Object.keys(patch.set).find((key) => !allowed.includes(key));
    if (refused !== undefined) return reject("malformed", `set cannot change ${refused}`);
    next = mergePatch(next, patch.set) as Bag;
    undo.set = undoPatch(before, patch.set);
  }
  if (patch.params) {
    const params = mergePatch(before.params ?? {}, patch.params) as Bag;
    next = { ...next };
    if (Object.keys(params).length === 0) delete next.params;
    else next.params = params;
    undo.params = undoPatch(asBag(before.params ?? {}), patch.params);
  }
  return { next: next as unknown as T, undo };
}

const aimsAt = (fault: Fault, id: string): boolean =>
  fault.target.component === id || fault.injectable?.component === id;

const faultNets = (fault: Fault): string[] => [
  ...(fault.target.net === undefined ? [] : [fault.target.net]),
  ...(fault.target.nets ?? []),
];

const pinEnd = (end: WireEnd, id: string): boolean => end.kind === "pin" && end.c === id;

const junctionEnds = (wire: Wire): string[] =>
  [wire.from, wire.to].flatMap((end) => (end.kind === "junction" ? [end.id] : []));

/** JSON Pointers to everything that still names the instance's pins or a net the removal empties (N9). */
function blockers(state: Project, id: string, kind: "board" | "component", emptied: ReadonlySet<string>): string[] {
  const refs: string[] = [];
  state.tests.forEach((test, t) =>
    test.checks.forEach((check, c) => {
      const namesPin =
        "pin" in check &&
        (check.board === id || (check.board === undefined && kind === "board" && state.boards.length === 1));
      if (namesPin || ("net" in check && emptied.has(check.net))) refs.push(pointer("tests", t, "checks", c));
    }),
  );
  state.simulation.faults.forEach((fault, i) => {
    if (!aimsAt(fault, id) && faultNets(fault).some((net) => emptied.has(net))) {
      refs.push(pointer("simulation", "faults", i));
    }
  });
  state.views.forEach((view, v) => {
    view.labels?.forEach((label, l) => {
      if (label.net !== undefined && emptied.has(label.net)) refs.push(pointer("views", v, "labels", l));
    });
    if (view.surface === id) refs.push(pointer("views", v, "surface"));
  });
  return refs;
}

function dropFromNets(nets: readonly Net[], id: string, emptied: ReadonlySet<string>) {
  const created: Op[] = [];
  const connected: Op[] = [];
  const kept: Net[] = [];
  for (const net of nets) {
    if (!net.connections.some((connection) => connection.c === id)) kept.push(net);
    else if (emptied.has(net.id)) created.push({ k: "net.create", net });
    else {
      const connections = net.connections.filter((connection) => connection.c !== id) as Net["connections"];
      for (const connection of net.connections) {
        if (connection.c === id) connected.push({ k: "net.connect", net: net.id, pin: connection });
      }
      kept.push({ ...net, connections });
    }
  }
  return { nets: kept, restore: [...created, ...connected] };
}

/** Removes the instance's placement, its wires and the junctions and group members that go with them. */
function dropFromView(view: View, id: string, emptied: ReadonlySet<string>): { view: View; restore: Op[] } {
  const placement = view.placements.find((p) => p.c === id);
  const deadWires = view.wires.filter((w) => emptied.has(w.net) || pinEnd(w.from, id) || pinEnd(w.to, id));
  const deadWireIds = new Set(deadWires.map((w) => w.id));
  const liveWires = view.wires.filter((w) => !deadWireIds.has(w.id));
  const hadWire = new Set(deadWires.flatMap(junctionEnds));
  const stillWired = new Set(liveWires.flatMap(junctionEnds));
  const deadJunctions = (view.junctions ?? []).filter(
    (j) => emptied.has(j.net) || (hadWire.has(j.id) && !stillWired.has(j.id)),
  );
  const gone = new Set([...deadWireIds, ...deadJunctions.map((j) => j.id), ...(placement ? [id] : [])]);
  if (gone.size === 0) return { view, restore: [] };

  const changedGroups = (view.groups ?? []).filter((group) => group.members.some((member) => gone.has(member)));
  const next: View = {
    ...view,
    placements: view.placements.filter((p) => p.c !== id),
    wires: liveWires,
  };
  if (view.junctions) next.junctions = view.junctions.filter((j) => !gone.has(j.id));
  if (view.groups) {
    next.groups = view.groups.flatMap((group): Group[] => {
      if (!changedGroups.includes(group)) return [group];
      const members = group.members.filter((member) => !gone.has(member));
      return members.length >= 2 ? [{ ...group, members: members as Group["members"] }] : [];
    });
  }
  const restore: Op[] = [
    ...(placement ? [{ k: "view.place", view: view.id, placement } satisfies Op] : []),
    ...deadJunctions.map((junction): Op => ({ k: "junction.add", view: view.id, junction })),
    ...deadWires.map((wire): Op => ({ k: "wire.add", view: view.id, wire })),
    ...changedGroups.map((group): Op => ({ k: "group.set", view: view.id, group })),
  ];
  return { view: next, restore };
}

/** Deletes the runtime, world inputs (and their script events), faults and instruments that aim at the instance. */
function dropFromSimulation(
  simulation: Simulation,
  id: string,
  kind: "board" | "component",
): { simulation: Simulation; restore: Op[] } {
  const bound = (input: Simulation["world"]["inputs"][number]) =>
    input.component === id || (input.pins?.some((p) => p.c === id) ?? false);
  const runtimes = kind === "board" ? simulation.runtimes.filter((r) => r.board !== id) : simulation.runtimes;
  const goneInputs = simulation.world.inputs.filter(bound);
  const goneIds = new Set(goneInputs.map((input) => input.id));
  const script = simulation.world.script.filter((event) => !goneIds.has(event.input));
  const goneFaults = simulation.faults.filter((fault) => aimsAt(fault, id));
  const goneInstruments = (simulation.instruments ?? []).filter(
    (ins) => ins.target?.component === id || ins.target?.pin?.c === id,
  );
  const goneRuntimes = simulation.runtimes.filter((r) => !runtimes.includes(r));
  if (goneRuntimes.length + goneInputs.length + goneFaults.length + goneInstruments.length === 0) {
    return { simulation, restore: [] };
  }

  const next: Simulation = {
    ...simulation,
    runtimes,
    world: { inputs: simulation.world.inputs.filter((input) => !goneIds.has(input.id)), script },
    faults: simulation.faults.filter((fault) => !goneFaults.includes(fault)),
  };
  if (simulation.instruments) {
    next.instruments = simulation.instruments.filter((ins) => !goneInstruments.includes(ins));
  }
  const restore: Op[] = [
    ...goneRuntimes.map((runtime): Op => ({ k: "runtime.set", runtime })),
    ...goneInputs.map((input): Op => ({ k: "input.set", input })),
    ...(script.length === simulation.world.script.length
      ? []
      : [{ k: "script.set", script: simulation.world.script } satisfies Op]),
    ...goneFaults.map((fault): Op => ({ k: "fault.set", fault })),
    ...goneInstruments.map((instrument): Op => ({ k: "instrument.set", instrument })),
  ];
  return { simulation: next, restore };
}

/**
 * Deletes a board or component and everything that points at it, in one revision (PDM 7.2). The inverse is one batch
 * in dependency order. Sources are put back first, as a remove and add pair, because `source.remove` refuses a
 * firmware entry and the board that names it is not back yet.
 */
export function removeInstance(state: Project, id: string, kind: "board" | "component"): Applied | Reject {
  const instance = kind === "board" ? findById(state.boards, id) : findById(state.components, id);
  if (!instance) return reject("missing_target", `${id} does not exist`);

  const emptied = new Set(
    state.nets.filter((net) => net.connections.every((connection) => connection.c === id)).map((net) => net.id),
  );
  const refs = blockers(state, id, kind, emptied);
  if (refs.length > 0) return reject("referenced_by", `${id} is still named by ${refs.length} other entities`, refs);

  const nets = dropFromNets(state.nets, id, emptied);
  const views = state.views.map((view) => dropFromView(view, id, emptied));
  const sim = dropFromSimulation(state.simulation, id, kind);
  const mounts = state.mechanical?.mounts.filter((mount) => mount.component !== id);
  const orphaned = state.sources.filter((source) => source.board === id);
  const restoreInstance: Op =
    kind === "board"
      ? { k: "board.add", board: instance as Board }
      : { k: "component.add", component: instance as Component };

  const next: Project = {
    ...state,
    nets: nets.nets,
    views: views.map((entry) => entry.view),
    simulation: sim.simulation,
    sources: state.sources.map((source) => {
      if (source.board !== id) return source;
      const cleared: Source = { ...source };
      delete cleared.board;
      return cleared;
    }),
  };
  if (kind === "board") next.boards = removeById(state.boards, id);
  else next.components = removeById(state.components, id);
  if (state.mechanical && mounts && mounts.length !== state.mechanical.mounts.length) {
    next.mechanical = { ...state.mechanical, mounts };
  }

  const inverse: Op[] = [
    ...orphaned.flatMap((source): Op[] => [
      { k: "source.remove", id: source.id },
      { k: "source.add", source },
    ]),
    restoreInstance,
    ...nets.restore,
    ...sim.restore,
    ...(state.mechanical?.mounts ?? [])
      .filter((mount) => mount.component === id)
      .map((mount): Op => ({ k: "mech.set", collection: "mounts", value: mount })),
    ...views.flatMap((entry) => entry.restore),
  ];
  return { state: next, inverse };
}

const componentAdd: Handler<"component.add"> = (state, op) => {
  const { component } = op;
  if (state.components.length >= LIMITS.components) {
    return reject("quota", `a project holds at most ${LIMITS.components} components`);
  }
  if (allEntityIds(state).has(component.id)) return reject("duplicate_id", `${component.id} is already used`);
  const dependency = dependencyOf(state, component.definition);
  if (!dependency || dependency.interface.role === "board") {
    return reject("unknown_definition", `${component.definition.ref}@${component.definition.version} is not a part`);
  }
  return {
    state: { ...state, components: upsertById(state.components, component) },
    inverse: [{ k: "component.remove", id: component.id }],
  };
};

const COMPONENT_SET_KEYS = ["label", "refdes", "locked"];

const componentSet: Handler<"component.set"> = (state, op) => {
  const component = findById(state.components, op.id);
  if (!component) return reject("missing_target", `${op.id} does not exist`);
  const patched = patchInstance(component, op, COMPONENT_SET_KEYS);
  if ("code" in patched) return patched;
  if (!validateComponent(patched.next)) return reject("malformed", schemaMessage(validateComponent.errors));
  return {
    state: { ...state, components: upsertById(state.components, patched.next) },
    inverse: [{ k: "component.set", id: op.id, ...patched.undo }],
  };
};

const componentRemove: Handler<"component.remove"> = (state, op) => removeInstance(state, op.id, "component");

/** Every pin of the component that something else points at. */
function pinsInUse(state: Project, id: string): Set<string> {
  const used = new Set<string>();
  for (const net of state.nets) for (const c of net.connections) if (c.c === id) used.add(c.p);
  for (const view of state.views) {
    for (const placement of view.placements) {
      if (placement.c === id) for (const leg of Object.keys(placement.legs ?? {})) used.add(leg);
    }
    for (const wire of view.wires) {
      for (const end of [wire.from, wire.to]) if (end.kind === "pin" && end.c === id) used.add(end.p);
    }
  }
  for (const fault of state.simulation.faults) {
    if (fault.target.component === id && fault.target.pin !== undefined) used.add(fault.target.pin);
  }
  for (const input of state.simulation.world.inputs) for (const p of input.pins ?? []) if (p.c === id) used.add(p.p);
  for (const ins of state.simulation.instruments ?? []) {
    if (ins.target?.pin?.c === id) used.add(ins.target.pin.p);
  }
  return used;
}

function renamePins(state: Project, id: string, pinMap: Readonly<Record<string, string>>): Project {
  const rename = (p: string) => pinMap[p] ?? p;
  const renameRef = (ref: PinRef): PinRef => (ref.c === id ? { c: id, p: rename(ref.p) } : ref);
  const renameEnd = (end: WireEnd): WireEnd =>
    end.kind === "pin" && end.c === id ? { ...end, p: rename(end.p) } : end;

  const nets = state.nets.map((net) =>
    net.connections.some((c) => c.c === id)
      ? { ...net, connections: sortBy(net.connections.map(renameRef), (c) => pin(c.c, c.p)) as Net["connections"] }
      : net,
  );
  const views = state.views.map((view) => {
    const touchesView =
      view.placements.some((p) => p.c === id && p.legs) ||
      view.wires.some((w) => pinEnd(w.from, id) || pinEnd(w.to, id));
    if (!touchesView) return view;
    return {
      ...view,
      placements: view.placements.map((placement) => {
        if (placement.c !== id || !placement.legs) return placement;
        const legs: Bag = {};
        for (const [leg, hole] of Object.entries(placement.legs)) setOwn(legs, rename(leg), hole);
        return { ...placement, legs: legs as Record<string, string> };
      }),
      wires: view.wires.map((w) =>
        pinEnd(w.from, id) || pinEnd(w.to, id) ? { ...w, from: renameEnd(w.from), to: renameEnd(w.to) } : w,
      ),
    };
  });
  const sim = state.simulation;
  const simulation: Simulation = {
    ...sim,
    faults: sim.faults.map((fault) =>
      fault.target.component === id && fault.target.pin !== undefined
        ? { ...fault, target: { ...fault.target, pin: rename(fault.target.pin) } }
        : fault,
    ),
    world: {
      ...sim.world,
      inputs: sim.world.inputs.map((input) =>
        input.pins?.some((p) => p.c === id) ? { ...input, pins: input.pins.map(renameRef) as PinRef[] } : input,
      ),
    },
  };
  if (sim.instruments) {
    simulation.instruments = sim.instruments.map((ins) =>
      ins.target?.pin?.c === id ? { ...ins, target: { ...ins.target, pin: renameRef(ins.target.pin) } } : ins,
    );
  }
  return { ...state, nets, views, simulation };
}

const componentSwap: Handler<"component.swap"> = (state, op) => {
  const component = findById(state.components, op.id);
  if (!component) return reject("missing_target", `${op.id} does not exist`);
  const target = dependencyOf(state, op.definition);
  if (!target || target.interface.role === "board") {
    return reject("unknown_definition", `${op.definition.ref}@${op.definition.version} is not a part`);
  }
  const source = dependencyOf(state, component.definition);
  if (!source) {
    return reject("unknown_definition", `${component.definition.ref}@${component.definition.version} is not pinned`);
  }

  const pinMap = op.pinMap as Record<string, string>;
  const unmapped = [...pinsInUse(state, op.id)].filter((p) => !Object.hasOwn(pinMap, p));
  if (unmapped.length > 0) return reject("missing_pin_map", `pinMap has no entry for ${unmapped.sort().join(", ")}`);

  const oldPins = new Set(source.interface.pins.map((p) => p.id));
  const newPins = new Set(target.interface.pins.map((p) => p.id));
  for (const [from, to] of Object.entries(pinMap)) {
    if (!oldPins.has(from)) return reject("missing_pin", `${from} is not a pin of ${component.definition.ref}`);
    if (!newPins.has(to)) return reject("missing_pin", `${to} is not a pin of ${op.definition.ref}`);
  }
  const mapped = Object.values(pinMap);
  if (new Set(mapped).size !== mapped.length) return reject("invariant", "pinMap sends two pins to one pin");

  const known = new Set(target.interface.params.map((param) => param.id));
  const kept: Bag = {};
  const dropped: Bag = {};
  for (const [key, value] of Object.entries(component.params ?? {}))
    setOwn(known.has(key) ? kept : dropped, key, value);
  const swapped: Component = { ...component, definition: op.definition };
  if (component.params) {
    if (Object.keys(kept).length === 0) delete swapped.params;
    else swapped.params = kept as Component["params"];
  }

  const back: Record<string, string> = {};
  for (const [from, to] of Object.entries(pinMap)) setOwn(back, to, from);
  const inverse: Op[] = [{ k: "component.swap", id: op.id, definition: component.definition, pinMap: back }];
  if (Object.keys(dropped).length > 0) inverse.push({ k: "component.set", id: op.id, params: dropped });

  const renamed = renamePins(state, op.id, pinMap);
  return { state: { ...renamed, components: upsertById(renamed.components, swapped) }, inverse };
};

export const COMPONENT_HANDLERS = {
  "component.add": componentAdd,
  "component.set": componentSet,
  "component.remove": componentRemove,
  "component.swap": componentSwap,
};
