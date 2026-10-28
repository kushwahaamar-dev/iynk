import { LIMITS } from "../../core/limits.ts";
import type { Fault, FaultTarget, Net, Op, PinRef, Project, TestCase, View } from "../generated/types.ts";
import { dependencyOf } from "./component.ts";
import { allEntityIds, findById, pin, pointer, reject, removeById, sortBy, upsertBy, upsertById } from "./types.ts";
import type { Handler, OpOf, Reject } from "./types.ts";
import { cut, isPinEnd, junctionEnds, orphanedJunctions } from "./wire.ts";
import type { Gone } from "./wire.ts";

const sortedPins = (pins: readonly PinRef[]) => sortBy(pins, (ref) => pin(ref.c, ref.p)) as Net["connections"];

function pinProblem(state: Project, ref: PinRef): Reject | null {
  const instance = findById(state.boards, ref.c) ?? findById(state.components, ref.c);
  if (!instance) return reject("missing_target", `${ref.c} does not exist`);
  if (!dependencyOf(state, instance.definition)?.interface.pins.some((p) => p.id === ref.p)) {
    return reject("missing_pin", `${ref.c} has no pin ${ref.p}`);
  }
  return null;
}

const netOfPin = (state: Project, ref: PinRef): Net | undefined =>
  state.nets.find((net) => net.connections.some((c) => c.c === ref.c && c.p === ref.p));

const namesNet = (fault: Fault, id: string): boolean =>
  fault.target.net === id || (fault.target.nets?.includes(id) ?? false);

const checkNamesNet = (test: TestCase, id: string): boolean =>
  test.checks.some((check) => "net" in check && check.net === id);

/** JSON Pointers to the checks that name the net. A check cannot be rewritten by a net op, only by `test.set`. */
const checkRefs = (state: Project, id: string): string[] =>
  state.tests.flatMap((test, t) =>
    test.checks.flatMap((check, c) => ("net" in check && check.net === id ? [pointer("tests", t, "checks", c)] : [])),
  );

const faultRefs = (state: Project, id: string): string[] =>
  state.simulation.faults.flatMap((fault, i) => (namesNet(fault, id) ? [pointer("simulation", "faults", i)] : []));

const labelRefs = (state: Project, id: string): string[] =>
  state.views.flatMap((view, v) =>
    (view.labels ?? []).flatMap((label, l) => (label.net === id ? [pointer("views", v, "labels", l)] : [])),
  );

function cutViews(views: View[], gone: (view: View) => Gone): { views: View[]; restore: Op[] } {
  const restore: Op[] = [];
  const next = views.map((view) => {
    const edit = cut(view, gone(view));
    restore.push(...edit.restore);
    return edit.view;
  });
  return { views: next.every((view, i) => view === views[i]) ? views : next, restore };
}

interface Taken {
  state: Project;
  /** Ops that draw again what the removal deleted. */
  restore: Op[];
  died: boolean;
}

/**
 * Removes a pin from its net. Wires with a pin end there are deleted. When the pin was the last member the net dies
 * with its wires and junctions, unless a check, fault or label names it (N9).
 */
function takePin(state: Project, net: Net, ref: PinRef): Taken | Reject {
  const rest = net.connections.filter((c) => !(c.c === ref.c && c.p === ref.p));
  const died = rest.length === 0;
  if (died) {
    const refs = [...checkRefs(state, net.id), ...faultRefs(state, net.id), ...labelRefs(state, net.id)];
    if (refs.length > 0) {
      return reject("referenced_by", `${net.id} would be empty and is still named by ${refs.length} entities`, refs);
    }
  }
  const drawn = cutViews(state.views, (view) => {
    const wires = new Set(
      view.wires
        .filter((w) => (died && w.net === net.id) || isPinEnd(w.from, ref.c, ref.p) || isPinEnd(w.to, ref.c, ref.p))
        .map((w) => w.id),
    );
    const junctions = orphanedJunctions(view, wires);
    if (died) for (const j of view.junctions ?? []) if (j.net === net.id) junctions.add(j.id);
    return { wires, junctions };
  });
  const nets = died
    ? removeById(state.nets, net.id)
    : upsertById(state.nets, { ...net, connections: rest as Net["connections"] });
  return { state: { ...state, nets, views: drawn.views }, restore: drawn.restore, died };
}

const netCreate: Handler<"net.create"> = (state, op) => {
  const { net } = op;
  if (state.nets.length >= LIMITS.nets) return reject("quota", `a project holds at most ${LIMITS.nets} nets`);
  if (allEntityIds(state).has(net.id)) return reject("duplicate_id", `${net.id} is already used`);
  const holders = new Map(state.nets.flatMap((n) => n.connections.map((c) => [pin(c.c, c.p), n.id] as const)));
  const listed = new Set<string>();
  for (const ref of net.connections) {
    const key = pin(ref.c, ref.p);
    if (listed.has(key)) return reject("malformed", `${key} is listed twice`);
    listed.add(key);
    const problem = pinProblem(state, ref);
    if (problem) return problem;
    const holder = holders.get(key);
    if (holder !== undefined) return reject("pin_in_use", `${key} is already in ${holder}`);
  }
  return {
    state: { ...state, nets: upsertById(state.nets, { ...net, connections: sortedPins(net.connections) }) },
    inverse: [{ k: "net.delete", id: net.id }],
  };
};

const netConnect: Handler<"net.connect"> = (state, op) => {
  const target = findById(state.nets, op.net);
  if (!target) return reject("missing_target", `${op.net} does not exist`);
  const problem = pinProblem(state, op.pin);
  if (problem) return problem;
  const current = netOfPin(state, op.pin);
  if (current?.id === target.id) return { state, inverse: [] };
  if (target.connections.length >= LIMITS.connectionsPerNet) {
    return reject("quota", `a net holds at most ${LIMITS.connectionsPerNet} pins`);
  }
  const joined = (from: Project): Project => ({
    ...from,
    nets: upsertById(from.nets, {
      ...target,
      connections: sortedPins(upsertBy(target.connections, (c) => pin(c.c, c.p), op.pin)),
    }),
  });
  if (!current) return { state: joined(state), inverse: [{ k: "net.disconnect", pin: op.pin }] };
  if (!op.move) return reject("pin_in_use", `${pin(op.pin.c, op.pin.p)} is already in ${current.id}`);

  const taken = takePin(state, current, op.pin);
  if ("code" in taken) return taken;
  const back: Op = taken.died
    ? { k: "net.create", net: current }
    : { k: "net.connect", net: current.id, pin: op.pin, move: true };
  return {
    state: joined(taken.state),
    inverse: [...(taken.died ? [{ k: "net.disconnect", pin: op.pin } satisfies Op] : []), back, ...taken.restore],
  };
};

const netDisconnect: Handler<"net.disconnect"> = (state, op) => {
  const net = netOfPin(state, op.pin);
  if (!net) return reject("missing_target", `${pin(op.pin.c, op.pin.p)} is in no net`);
  const taken = takePin(state, net, op.pin);
  if ("code" in taken) return taken;
  const back: Op = taken.died ? { k: "net.create", net } : { k: "net.connect", net: net.id, pin: op.pin };
  return { state: taken.state, inverse: [back, ...taken.restore] };
};

const retargetFault = (fault: Fault, from: string, into: string): Fault => {
  const target: FaultTarget = { ...fault.target };
  if (target.net === from) target.net = into;
  if (target.nets) target.nets = target.nets.map((id) => (id === from ? into : id)) as FaultTarget["nets"];
  return { ...fault, target };
};

const retargetTest = (test: TestCase, from: string, into: string): TestCase => ({
  ...test,
  checks: test.checks.map((check) =>
    "net" in check && check.net === from ? { ...check, net: into } : check,
  ) as TestCase["checks"],
});

/** Every wire, junction and label of the view that sits on `from` moves to `into`. */
function retargetView(view: View, from: string, into: string): View {
  const onFrom = (item: { net?: string }) => item.net === from;
  if (!view.wires.some(onFrom) && !view.junctions?.some(onFrom) && !view.labels?.some(onFrom)) return view;
  const move = <T extends { net?: string }>(item: T): T => (onFrom(item) ? { ...item, net: into } : item);
  const next: View = { ...view, wires: view.wires.map(move) };
  if (view.junctions) next.junctions = view.junctions.map(move);
  if (view.labels) next.labels = view.labels.map(move);
  return next;
}

const netMerge: Handler<"net.merge"> = (state, op) => {
  if (op.into === op.from) return reject("malformed", "a net cannot merge into itself");
  const into = findById(state.nets, op.into);
  const from = findById(state.nets, op.from);
  if (!into) return reject("missing_target", `${op.into} does not exist`);
  if (!from) return reject("missing_target", `${op.from} does not exist`);
  if (into.connections.length + from.connections.length > LIMITS.connectionsPerNet) {
    return reject("quota", `a net holds at most ${LIMITS.connectionsPerNet} pins`);
  }

  const labels = state.views.flatMap((view) =>
    (view.labels ?? [])
      .filter((label) => label.net === from.id)
      .map((label): Op => ({ k: "label.set", view: view.id, label })),
  );
  const faults = state.simulation.faults.filter((fault) => namesNet(fault, from.id));
  const tests = state.tests.filter((test) => checkNamesNet(test, from.id));

  const merged: Net = { ...into, connections: sortedPins([...into.connections, ...from.connections]) };
  const next: Project = {
    ...state,
    nets: upsertById(removeById(state.nets, from.id), merged),
    views: state.views.map((view) => retargetView(view, from.id, into.id)),
  };
  if (faults.length > 0) {
    next.simulation = {
      ...state.simulation,
      faults: state.simulation.faults.map((fault) =>
        faults.includes(fault) ? retargetFault(fault, from.id, into.id) : fault,
      ),
    };
  }
  if (tests.length > 0) {
    next.tests = state.tests.map((test) => (tests.includes(test) ? retargetTest(test, from.id, into.id) : test));
  }

  const rename: OpOf<"net.rename"> = { k: "net.rename", id: from.id };
  if (from.name !== undefined) rename.name = from.name;
  if (from.class !== undefined) rename.class = from.class;
  return {
    state: next,
    inverse: [
      { k: "net.split", net: into.id, into: from.id, pins: from.connections },
      ...(rename.name === undefined && rename.class === undefined ? [] : [rename]),
      ...labels,
      ...faults.map((fault): Op => ({ k: "fault.set", fault })),
      ...tests.map((test): Op => ({ k: "test.set", test })),
    ],
  };
};

/**
 * Which drawn wires follow a split. Wires that meet at a junction are one drawing: if its pins are all on one side
 * the whole drawing goes there, if they are on both sides it is cut away. A junction with no wire is an orphan.
 */
function splitPlan(view: View, netId: string, moving: ReadonlySet<string>) {
  const wires = view.wires.filter((w) => w.net === netId);
  const junctions = (view.junctions ?? []).filter((j) => j.net === netId);
  if (wires.length === 0 && junctions.length === 0) return null;

  const parent = new Map(junctions.map((j) => [j.id, j.id] as const));
  const rootOf = (id: string): string => {
    const up = parent.get(id);
    return up === undefined || up === id ? id : rootOf(up);
  };
  for (const wire of wires) {
    const [first, ...others] = junctionEnds(wire).filter((id) => parent.has(id));
    for (const other of others) parent.set(rootOf(other), rootOf(first));
  }
  const drawingOf = (wire: View["wires"][number]): string => {
    const [first] = junctionEnds(wire).filter((id) => parent.has(id));
    return first === undefined ? wire.id : rootOf(first);
  };

  const sides = new Map<string, Set<"stay" | "move">>();
  const attached = new Set<string>();
  for (const wire of wires) {
    const key = drawingOf(wire);
    const set = sides.get(key) ?? new Set();
    for (const end of [wire.from, wire.to]) {
      if (end.kind === "pin") set.add(moving.has(pin(end.c, end.p)) ? "move" : "stay");
    }
    sides.set(key, set);
    junctionEnds(wire).forEach((id) => attached.add(id));
  }
  const verdict = (key: string) => {
    const set = sides.get(key);
    return set?.has("move") ? (set.has("stay") ? "cut" : "move") : "stay";
  };

  const gone: Gone & { wires: Set<string>; junctions: Set<string> } = { wires: new Set(), junctions: new Set() };
  const moved = { wires: new Set<string>(), junctions: new Set<string>() };
  for (const wire of wires) {
    const outcome = verdict(drawingOf(wire));
    if (outcome === "cut") gone.wires.add(wire.id);
    else if (outcome === "move") moved.wires.add(wire.id);
  }
  for (const junction of junctions) {
    const outcome = attached.has(junction.id) ? verdict(rootOf(junction.id)) : "cut";
    if (outcome === "cut") gone.junctions.add(junction.id);
    else if (outcome === "move") moved.junctions.add(junction.id);
  }
  return { gone, moved };
}

const netSplit: Handler<"net.split"> = (state, op) => {
  const net = findById(state.nets, op.net);
  if (!net) return reject("missing_target", `${op.net} does not exist`);
  if (state.nets.length >= LIMITS.nets) return reject("quota", `a project holds at most ${LIMITS.nets} nets`);
  if (allEntityIds(state).has(op.into)) return reject("duplicate_id", `${op.into} is already used`);

  const moving = new Set(op.pins.map((ref) => pin(ref.c, ref.p)));
  if (moving.size !== op.pins.length) return reject("malformed", "pins lists a pin twice");
  const members = new Set(net.connections.map((c) => pin(c.c, c.p)));
  const stranger = op.pins.find((ref) => !members.has(pin(ref.c, ref.p)));
  if (stranger) return reject("missing_pin", `${pin(stranger.c, stranger.p)} is not in ${net.id}`);
  const rest = net.connections.filter((c) => !moving.has(pin(c.c, c.p)));
  if (rest.length === 0) return reject("invariant", `a split cannot leave ${net.id} empty`);

  const restore: Op[] = [];
  const views = state.views.map((view) => {
    const plan = splitPlan(view, net.id, moving);
    if (!plan) return view;
    const edit = cut(view, plan.gone);
    restore.push(...edit.restore);
    const follow =
      <T extends { id: string; net: string }>(ids: ReadonlySet<string>) =>
      (item: T): T =>
        ids.has(item.id) ? { ...item, net: op.into } : item;
    const next: View = { ...edit.view, wires: edit.view.wires.map(follow(plan.moved.wires)) };
    if (edit.view.junctions) next.junctions = edit.view.junctions.map(follow(plan.moved.junctions));
    return next;
  });

  const split: Net = { id: op.into, connections: sortedPins(op.pins) };
  const kept: Net = { ...net, connections: rest as Net["connections"] };
  return {
    state: { ...state, nets: upsertById(upsertById(state.nets, kept), split), views },
    inverse: [{ k: "net.merge", into: net.id, from: op.into }, ...restore],
  };
};

const netRename: Handler<"net.rename"> = (state, op) => {
  const net = findById(state.nets, op.id);
  if (!net) return reject("missing_target", `${op.id} does not exist`);
  const next: Net = { ...net };
  const inverse: OpOf<"net.rename"> = { k: "net.rename", id: op.id };
  if (op.name !== undefined) {
    if (op.name !== "" && state.nets.some((other) => other.id !== op.id && other.name === op.name)) {
      return reject("invariant", `N3: another net is already called ${op.name}`);
    }
    if (op.name === "") delete next.name;
    else next.name = op.name;
    inverse.name = net.name ?? "";
  }
  if (op.class !== undefined) {
    next.class = op.class;
    if (net.class !== undefined) inverse.class = net.class;
  }
  return { state: { ...state, nets: upsertById(state.nets, next) }, inverse: [inverse] };
};

const netDelete: Handler<"net.delete"> = (state, op) => {
  const net = findById(state.nets, op.id);
  if (!net) return reject("missing_target", `${op.id} does not exist`);
  const checks = checkRefs(state, op.id);
  if (checks.length > 0) return reject("referenced_by", `${op.id} is still named by a check`, checks);

  const drawn = cutViews(state.views, (view) => ({
    wires: new Set(view.wires.filter((w) => w.net === op.id).map((w) => w.id)),
    junctions: new Set((view.junctions ?? []).filter((j) => j.net === op.id).map((j) => j.id)),
    labels: new Set((view.labels ?? []).filter((l) => l.net === op.id).map((l) => l.id)),
  }));
  const faults = state.simulation.faults.filter((fault) => namesNet(fault, op.id));
  const next: Project = { ...state, nets: removeById(state.nets, op.id), views: drawn.views };
  if (faults.length > 0) {
    next.simulation = {
      ...state.simulation,
      faults: state.simulation.faults.filter((fault) => !faults.includes(fault)),
    };
  }
  return {
    state: next,
    inverse: [{ k: "net.create", net }, ...drawn.restore, ...faults.map((fault): Op => ({ k: "fault.set", fault }))],
  };
};

export const NET_HANDLERS = {
  "net.create": netCreate,
  "net.connect": netConnect,
  "net.disconnect": netDisconnect,
  "net.merge": netMerge,
  "net.split": netSplit,
  "net.rename": netRename,
  "net.delete": netDelete,
};
