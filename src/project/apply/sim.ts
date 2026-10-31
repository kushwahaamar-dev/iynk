import { LIMITS } from "../../core/limits.ts";
import type { Fault, Instrument, PinRef, Project, Simulation } from "../generated/types.ts";
import { validateSimulation } from "../generated/validate.mjs";
import { dependencyOf } from "./component.ts";
import { asBag, findById, reject, removeById, schemaMessage, upsertById } from "./types.ts";
import type { Bag, Handler, Reject } from "./types.ts";

const MAX_RUNTIMES = 16;

/** Replaces or adds `item` by id. A new item must fit under `limit`. */
export function put<T extends { id: string }>(
  items: readonly T[],
  item: T,
  limit: number,
  what: string,
): { items: T[]; previous: T | undefined } | Reject {
  const previous = findById(items, item.id);
  if (!previous && items.length >= limit) return reject("quota", `a project holds at most ${limit} ${what}`);
  return { items: upsertById(items, item), previous };
}

/** Drops the item with `id`. */
export function take<T extends { id: string }>(
  items: readonly T[],
  id: string,
  what: string,
): { items: T[]; previous: T } | Reject {
  const previous = findById(items, id);
  if (!previous) return reject("missing_target", `${id} is not ${what}`);
  return { items: removeById(items, id), previous };
}

export const isRejected = (result: object): result is Reject => "code" in result;

export const instanceOf = (state: Project, id: string) => findById(state.boards, id) ?? findById(state.components, id);

function pinProblem(state: Project, ref: PinRef): Reject | null {
  const instance = instanceOf(state, ref.c);
  if (!instance) return reject("missing_target", `${ref.c} does not exist`);
  if (!dependencyOf(state, instance.definition)?.interface.pins.some((p) => p.id === ref.p)) {
    return reject("missing_pin", `${ref.c} has no pin ${ref.p}`);
  }
  return null;
}

const withSimulation = (state: Project, changes: Partial<Simulation>): Project => ({
  ...state,
  simulation: { ...state.simulation, ...changes },
});

const simSet: Handler<"sim.set"> = (state, op) => {
  const before = asBag(state.simulation);
  const next: Bag = { ...before };
  if (op.value === null && (op.key === "physics" || op.key === "environment")) delete next[op.key];
  else next[op.key] = op.value;
  if (!validateSimulation(next)) return reject("malformed", schemaMessage(validateSimulation.errors));
  return {
    state: { ...state, simulation: next as unknown as Simulation },
    inverse: [{ k: "sim.set", key: op.key, value: before[op.key] ?? null }],
  };
};

const runtimeSet: Handler<"runtime.set"> = (state, op) => {
  if (!findById(state.boards, op.runtime.board)) {
    return reject("missing_target", `V3-RT: ${op.runtime.board} is not a board`);
  }
  const placed = put(state.simulation.runtimes, op.runtime, MAX_RUNTIMES, "runtimes");
  if (isRejected(placed)) return placed;
  return {
    state: withSimulation(state, { runtimes: placed.items }),
    inverse: [
      placed.previous ? { k: "runtime.set", runtime: placed.previous } : { k: "runtime.remove", id: op.runtime.id },
    ],
  };
};

const runtimeRemove: Handler<"runtime.remove"> = (state, op) => {
  const taken = take(state.simulation.runtimes, op.id, "a runtime");
  if (isRejected(taken)) return taken;
  return {
    state: withSimulation(state, { runtimes: taken.items }),
    inverse: [{ k: "runtime.set", runtime: taken.previous }],
  };
};

const inputSet: Handler<"input.set"> = (state, op) => {
  if (!instanceOf(state, op.input.component)) {
    return reject("missing_target", `V3-INPUT: ${op.input.component} does not exist`);
  }
  for (const ref of op.input.pins ?? []) {
    const problem = pinProblem(state, ref);
    if (problem) return problem;
  }
  const placed = put(state.simulation.world.inputs, op.input, LIMITS.worldInputs, "world inputs");
  if (isRejected(placed)) return placed;
  return {
    state: withSimulation(state, { world: { ...state.simulation.world, inputs: placed.items } }),
    inverse: [placed.previous ? { k: "input.set", input: placed.previous } : { k: "input.remove", id: op.input.id }],
  };
};

const inputRemove: Handler<"input.remove"> = (state, op) => {
  const { world } = state.simulation;
  const taken = take(world.inputs, op.id, "a world input");
  if (isRejected(taken)) return taken;
  const script = world.script.filter((event) => event.input !== op.id);
  const dropsEvents = script.length !== world.script.length;
  return {
    state: withSimulation(state, { world: { inputs: taken.items, script } }),
    inverse: [
      { k: "input.set", input: taken.previous },
      ...(dropsEvents ? [{ k: "script.set", script: world.script } as const] : []),
    ],
  };
};

/** Time, then input id, then the order given (PDM 6.2). `Array.prototype.sort` is stable. */
const byTime = (a: { t: number; input: string }, b: { t: number; input: string }): number =>
  a.t - b.t || (a.input < b.input ? -1 : a.input > b.input ? 1 : 0);

const scriptSet: Handler<"script.set"> = (state, op) => {
  const { world } = state.simulation;
  const stray = op.script.find((event) => !findById(world.inputs, event.input));
  if (stray)
    return reject("missing_target", `V3-SCRIPT: an event at ${stray.t} ms names ${stray.input}, which is not an input`);
  return {
    state: withSimulation(state, { world: { ...world, script: [...op.script].sort(byTime) } }),
    inverse: [{ k: "script.set", script: world.script }],
  };
};

function faultProblem(state: Project, fault: Fault): Reject | null {
  const { component, pin, net, nets } = fault.target;
  if (component !== undefined) {
    const problem = pin === undefined ? null : pinProblem(state, { c: component, p: pin });
    if (problem) return problem;
    if (!instanceOf(state, component)) return reject("missing_target", `V3-FAULT: ${component} does not exist`);
  }
  for (const id of [...(net === undefined ? [] : [net]), ...(nets ?? [])]) {
    if (!findById(state.nets, id)) return reject("missing_target", `V3-FAULT: ${id} is not a net`);
  }
  if (fault.injectable && !instanceOf(state, fault.injectable.component)) {
    return reject("missing_target", `V3-FAULT-SHAPE: ${fault.injectable.component} does not exist`);
  }
  return null;
}

const faultSet: Handler<"fault.set"> = (state, op) => {
  const problem = faultProblem(state, op.fault);
  if (problem) return problem;
  const placed = put(state.simulation.faults, op.fault, LIMITS.faults, "faults");
  if (isRejected(placed)) return placed;
  return {
    state: withSimulation(state, { faults: placed.items }),
    inverse: [placed.previous ? { k: "fault.set", fault: placed.previous } : { k: "fault.remove", id: op.fault.id }],
  };
};

const faultRemove: Handler<"fault.remove"> = (state, op) => {
  const taken = take(state.simulation.faults, op.id, "a fault");
  if (isRejected(taken)) return taken;
  return {
    state: withSimulation(state, { faults: taken.items }),
    inverse: [{ k: "fault.set", fault: taken.previous }],
  };
};

/** The instruments list, or nothing at all once it is empty, so a document that never had one stays without. */
const withInstruments = (state: Project, items: Instrument[]): Project => {
  const simulation = { ...state.simulation };
  delete simulation.instruments;
  if (items.length > 0) simulation.instruments = items;
  return { ...state, simulation };
};

const instrumentSet: Handler<"instrument.set"> = (state, op) => {
  const placed = put(state.simulation.instruments ?? [], op.instrument, LIMITS.instruments, "instruments");
  if (isRejected(placed)) return placed;
  return {
    state: withInstruments(state, placed.items),
    inverse: [
      placed.previous
        ? { k: "instrument.set", instrument: placed.previous }
        : { k: "instrument.remove", id: op.instrument.id },
    ],
  };
};

const instrumentRemove: Handler<"instrument.remove"> = (state, op) => {
  const taken = take(state.simulation.instruments ?? [], op.id, "an instrument");
  if (isRejected(taken)) return taken;
  return {
    state: withInstruments(state, taken.items),
    inverse: [{ k: "instrument.set", instrument: taken.previous }],
  };
};

export const SIM_HANDLERS = {
  "sim.set": simSet,
  "runtime.set": runtimeSet,
  "runtime.remove": runtimeRemove,
  "input.set": inputSet,
  "input.remove": inputRemove,
  "script.set": scriptSet,
  "fault.set": faultSet,
  "fault.remove": faultRemove,
  "instrument.set": instrumentSet,
  "instrument.remove": instrumentRemove,
};
