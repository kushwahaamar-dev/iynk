import type { Descriptor } from "../../parts/descriptor.ts";
import type { Layer, Model, ParamMap, ParamValue } from "../../parts/generated/types.ts";
import type { BuiltinImpl } from "./builtins.ts";
import { type LogicModel, compileLogic } from "./logic.ts";

/** Code-bearing parts stay off until an RS-15 verdict. `as const` keeps any path from flipping it. */
export const CODE_PARTS_ENABLED = false as const;

export type NoneReason = "declared" | "solver-lacks-element" | "unknown-builtin" | "extension-disabled" | "subcircuit-invalid";

export type ParamScalar = number | string | boolean;

export interface ModelEnv {
  solverElements: ReadonlySet<string>;
  builtins: ReadonlyMap<string, BuiltinImpl>;
  lookupComponent?: (ref: string, version: string) => Descriptor | undefined;
}

export interface ResolvedInstance {
  id: string;
  element?: string;
  component?: string;
  params: Readonly<Record<string, ParamScalar>>;
}

export interface ResolvedNet {
  id: string;
  nodes: readonly string[];
}

export type ResolvedLayer =
  | { kind: "element"; layerId: string; element: string; terminals: Readonly<Record<string, string>>; params: Readonly<Record<string, ParamScalar>> }
  | { kind: "subcircuit"; layerId: string; instances: ResolvedInstance[]; nets: ResolvedNet[] }
  | { kind: "logic"; layerId: string; model: LogicModel }
  | { kind: "builtin"; layerId: string; ref: string; params: Readonly<Record<string, ParamScalar>>; impl: BuiltinImpl }
  | { kind: "none"; layerId: string; reason: NoneReason; detail: string };

export interface ResolveResult {
  layers: ResolvedLayer[];
  runnable: boolean;
}

export class RatingError extends Error {}

type Pick = "min" | "typ" | "max" | "value";

const MAX_DEPTH = 4;
const MAX_INSTANCES = 128;
const COMPONENT_REF = /^(.+)@(\d+\.\d+\.\d+)$/;

/** A number from a rating, read from the slot the model uses. `pick` defaults to `value` when the slot has one, else `typ`. */
export function ratingValue(def: Descriptor, key: string, pick?: Pick): number {
  const rating = def.ratings[key];
  if (rating === undefined) throw new RatingError(`${def.id} has no rating ${key}`);
  const slotName = rating.used_by_model;
  if (slotName === "none") throw new RatingError(`rating ${key} of ${def.id} is not used by the model`);
  const slot = rating[slotName];
  if (slot === undefined) throw new RatingError(`rating ${key} of ${def.id} has no ${slotName} slot`);
  const which = pick ?? (slot.value !== undefined ? "value" : "typ");
  const value = slot[which];
  if (value === undefined) throw new RatingError(`rating ${key} of ${def.id} has no ${which} in its ${slotName} slot`);
  return value;
}

function resolveParam(def: Descriptor, name: string, param: ParamValue, instanceParams: Readonly<Record<string, ParamScalar>>): ParamScalar {
  if (param.value !== undefined) return param.value;
  if (param.from_rating !== undefined) return ratingValue(def, param.from_rating, param.pick);
  if (param.by_parameter !== undefined) {
    const { parameter, map } = param.by_parameter;
    const chosen = instanceParams[parameter] ?? def.parameters?.find((p) => p.id === parameter)?.default;
    if (chosen === undefined) throw new RatingError(`parameter ${parameter} has no value and no default`);
    const key = map[String(chosen)];
    if (key === undefined) throw new RatingError(`parameter ${parameter} has no mapping for ${String(chosen)}`);
    return ratingValue(def, key, param.pick);
  }
  throw new RatingError(`param ${name} has no value, rating or parameter`);
}

function resolveParams(def: Descriptor, params: ParamMap | undefined, instanceParams: Readonly<Record<string, ParamScalar>>): Record<string, ParamScalar> {
  const out: Record<string, ParamScalar> = {};
  for (const [name, param] of Object.entries(params ?? {})) {
    if (param !== undefined) out[name] = resolveParam(def, name, param, instanceParams);
  }
  return out;
}

type SubcircuitModel = Extract<Model, { kind: "subcircuit" }>;

interface Walk {
  env: ModelEnv;
  instances: number;
}

class SubcircuitError extends Error {}

function walkSubcircuit(model: SubcircuitModel, depth: number, path: readonly string[], walk: Walk): void {
  if (depth > MAX_DEPTH) throw new SubcircuitError(`nested deeper than ${MAX_DEPTH} levels`);
  walk.instances += model.instances.length;
  if (walk.instances > MAX_INSTANCES) throw new SubcircuitError(`more than ${MAX_INSTANCES} instances`);
  for (const instance of model.instances) {
    if (instance.element !== undefined) {
      if (!walk.env.solverElements.has(instance.element)) throw new SubcircuitError(`instance ${instance.id}: the solver has no ${instance.element} element`);
      continue;
    }
    const match = COMPONENT_REF.exec(instance.component ?? "");
    if (match === null) throw new SubcircuitError(`instance ${instance.id} needs an element or a pinned id@x.y.z component`);
    const [, id, version] = match;
    if (path.includes(id)) throw new SubcircuitError(`${id} contains itself`);
    const inner = walk.env.lookupComponent?.(id, version);
    if (inner === undefined) throw new SubcircuitError(`instance ${instance.id}: ${id}@${version} is not in the library`);
    for (const layer of inner.behaviour.layers) {
      if (layer.model.kind === "subcircuit") walkSubcircuit(layer.model, depth + 1, [...path, id], walk);
    }
  }
}

function resolveSubcircuit(def: Descriptor, layer: Layer, model: SubcircuitModel, instanceParams: Readonly<Record<string, ParamScalar>>, env: ModelEnv): ResolvedLayer {
  try {
    walkSubcircuit(model, 1, [def.id], { env, instances: 0 });
    return {
      kind: "subcircuit",
      layerId: layer.id,
      instances: model.instances.map((i) => ({ id: i.id, element: i.element, component: i.component, params: resolveParams(def, i.params, instanceParams) })),
      nets: model.nets.map((n) => ({ id: n.id, nodes: n.nodes })),
    };
  } catch (e) {
    if (e instanceof SubcircuitError || e instanceof RatingError) return { kind: "none", layerId: layer.id, reason: "subcircuit-invalid", detail: e.message };
    throw e;
  }
}

function resolveLayer(def: Descriptor, layer: Layer, instanceParams: Readonly<Record<string, ParamScalar>>, env: ModelEnv): ResolvedLayer {
  const model = layer.model;
  const none = (reason: NoneReason, detail: string): ResolvedLayer => ({ kind: "none", layerId: layer.id, reason, detail });
  try {
    switch (model.kind) {
      case "element": {
        if (!env.solverElements.has(model.element)) return none("solver-lacks-element", `the solver has no ${model.element} element yet`);
        const terminals: Record<string, string> = {};
        for (const [terminal, pin] of Object.entries(model.terminals)) if (pin !== undefined) terminals[terminal] = pin;
        return { kind: "element", layerId: layer.id, element: model.element, terminals, params: resolveParams(def, model.params, instanceParams) };
      }
      case "subcircuit":
        return resolveSubcircuit(def, layer, model, instanceParams, env);
      case "logic":
        return { kind: "logic", layerId: layer.id, model: compileLogic(model, def) };
      case "builtin": {
        const impl = env.builtins.get(model.ref);
        if (impl === undefined) return none("unknown-builtin", `${model.ref} is not a behaviour this build ships`);
        return { kind: "builtin", layerId: layer.id, ref: model.ref, params: resolveParams(def, model.params, instanceParams), impl };
      }
      case "extension":
        return none("extension-disabled", "code parts are switched off");
      case "none":
        return none("declared", model.reason.en ?? "");
    }
  } catch (e) {
    if (e instanceof RatingError || e instanceof RangeError) return none("declared", e.message);
    throw e;
  }
}

/** Turns every layer of a descriptor into something the engine can run, or says why it cannot. Never throws for a bad layer. */
export function resolveLayers(def: Descriptor, instanceParams: Readonly<Record<string, ParamScalar>>, env: ModelEnv): ResolveResult {
  const layers = def.behaviour.layers.map((layer) => resolveLayer(def, layer, instanceParams, env));
  return { layers, runnable: layers.some((l) => l.kind !== "none") };
}
