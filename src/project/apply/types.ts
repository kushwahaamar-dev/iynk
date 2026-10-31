import type { Diagnostic } from "../../core/result.ts";
import type { Op, OpEnvelope, Project, Timestamp } from "../generated/types.ts";
import type { SchemaError } from "../generated/validate.mjs";

/** The closed list of reasons an op or batch is refused (PDM 7.2). */
export type RejectCode =
  | "malformed"
  | "duplicate_id"
  | "missing_target"
  | "missing_pin"
  | "pin_in_use"
  | "unknown_definition"
  | "missing_pin_map"
  | "referenced_by"
  | "invariant"
  | "quota"
  | "permission"
  | "stale_base"
  | "schema_mismatch";

/** `refs` holds JSON Pointers to every referrer, so a tool can build the ops that clear them. */
export interface Reject {
  code: RejectCode;
  message: string;
  refs?: string[];
}

export type Author = OpEnvelope["author"];

export interface ApplyContext {
  author: Author;
  at: Timestamp;
  /** Batch-end rules. `next` and `prev` share every entity the batch did not change, so a checker can skip them. */
  invariants?: (next: Project, prev: Project) => Diagnostic[];
}

export type ApplyOutcome = { ok: true; state: Project; inverse: Op[] } | { ok: false; reject: Reject };

export type OpOf<K extends Op["k"]> = Extract<Op, { k: K }>;

export interface Applied {
  state: Project;
  inverse: Op[];
}

export type Handler<K extends Op["k"]> = (state: Project, op: OpOf<K>, ctx: ApplyContext) => Applied | Reject;

export type Bag = Record<string, unknown>;

export const asBag = (value: object): Bag => value as Bag;

export const reject = (code: RejectCode, message: string, refs?: string[]): Reject =>
  refs === undefined ? { code, message } : { code, message, refs };

export const isReject = (result: Applied | Reject): result is Reject => "code" in result;

export const pin = (c: string, p: string): string => c + "/" + p;

/** A JSON Pointer to `parts`, with `~` and `/` escaped. */
export const pointer = (...parts: (string | number)[]): string =>
  parts.map((part) => "/" + String(part).replace(/~/g, "~0").replace(/\//g, "~1")).join("");

/** The first schema error as `<pointer> <message>`, for a `malformed` reject. */
export function schemaMessage(errors: SchemaError[] | null): string {
  const first = errors?.[0];
  return first === undefined
    ? "does not match the schema"
    : `${first.instancePath || "/"} ${first.message ?? "is invalid"}`;
}

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Replaces the item with the same key, or inserts it where the key sorts, so a sorted set stays sorted. */
export function upsertBy<T>(items: readonly T[], keyOf: (item: T) => string, item: T): T[] {
  const key = keyOf(item);
  const at = items.findIndex((other) => keyOf(other) >= key);
  if (at === -1) return [...items, item];
  const replaces = keyOf(items[at]) === key;
  return [...items.slice(0, at), item, ...items.slice(replaces ? at + 1 : at)];
}

export const upsertById = <T extends { id: string }>(items: readonly T[], item: T): T[] =>
  upsertBy(items, (other) => other.id, item);

export const removeById = <T extends { id: string }>(items: readonly T[], id: string): T[] =>
  items.filter((item) => item.id !== id);

export const findById = <T extends { id: string }>(items: readonly T[], id: string): T | undefined =>
  items.find((item) => item.id === id);

/** Sorts by the UTF-16 order the canonical form uses. */
export const sortBy = <T>(items: readonly T[], keyOf: (item: T) => string): T[] =>
  [...items].sort((a, b) => compare(keyOf(a), keyOf(b)));

/** Own-property write, so a key named `__proto__` from a document cannot change a prototype. */
export function setOwn(target: Bag, key: string, value: unknown): void {
  Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
}

const isPlainObject = (value: unknown): value is Bag =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** RFC 7396 merge patch: a `null` removes a key, objects merge, anything else replaces. */
export function mergePatch(target: unknown, patch: unknown): unknown {
  if (!isPlainObject(patch)) return patch;
  const out: Bag = {};
  if (isPlainObject(target)) for (const key of Object.keys(target)) setOwn(out, key, target[key]);
  for (const key of Object.keys(patch)) {
    const value = patch[key];
    if (value === null) delete out[key];
    else setOwn(out, key, mergePatch(out[key], value));
  }
  return out;
}

/** Every id that must stay unique across entity kinds (V3-ID-DUP). Test and world-input ids are local and left out. */
export function allEntityIds(state: Project): Set<string> {
  const ids = new Set<string>();
  const add = (items: readonly { id: string }[] | undefined) => items?.forEach((item) => ids.add(item.id));
  add(state.actors);
  add(state.boards);
  add(state.components);
  add(state.nets);
  add(state.views);
  add(state.sources);
  add(state.parameters);
  add(state.assets);
  add(state.simulation.runtimes);
  add(state.simulation.faults);
  add(state.simulation.instruments);
  if (state.mechanical) {
    add(state.mechanical.frames);
    add(state.mechanical.bodies);
    add(state.mechanical.joints);
    add(state.mechanical.mounts);
  }
  for (const view of state.views) {
    add(view.wires);
    add(view.junctions);
    add(view.labels);
    add(view.groups);
  }
  return ids;
}
