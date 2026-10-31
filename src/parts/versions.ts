import { canonicalize } from "../core/canonical.ts";
import { diag } from "../core/result.ts";
import type { Diagnostic } from "../core/result.ts";
import type { ComponentDependency, Op, Project } from "../project/generated/types.ts";
import { digestOf, versionCompare } from "./descriptor.ts";
import type { Descriptor } from "./descriptor.ts";
import { interfaceOf } from "./pins.ts";
import type { PartRegistry } from "./registry.ts";

export type Bump = "patch" | "minor" | "major";

export interface DescriptorChange {
  path: string;
  change: "added" | "removed" | "changed";
  before?: unknown;
  after?: unknown;
  /** True when the simulation model reads the changed value, so old runs would come out different. */
  readsByModel: boolean;
}

export type Pinned = { found: true; def: Descriptor } | { found: false; reason: "missing" | "digest-mismatch" };

export interface UpgradePlan {
  ref: string;
  from: string;
  to: string;
  bump: Bump;
  changes: DescriptorChange[];
  removedPins: string[];
  addedPins: string[];
  wiresOnRemovedPins: { instance: string; pin: string }[];
  instances: string[];
  ops: Op[];
  blocked?: "pins-removed-in-use" | "not-newer";
}

const RANK: Record<Bump, number> = { patch: 0, minor: 1, major: 2 };

const SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

/** Fields that only describe or document the part; changing them never changes a run. */
const TEXT_PREFIXES = ["/version", "/$schema", "/sources", "/visual", "/changelog", "/identity", "/provenance/modified", "/behaviour/summary"];
const TEXT_LEAVES = new Set(["description", "summary", "rationale", "notes", "name"]);

const RATING_SLOTS = new Set(["manufacturer", "simulation", "measured"]);

export function parseSemver(v: string): { major: number; minor: number; patch: number } {
  const m = SEMVER.exec(v);
  if (m === null) throw new RangeError(`${v} is not a major.minor.patch version`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

const pointer = (...segments: string[]): string =>
  segments.map((s) => "/" + s.replace(/~/g, "~0").replace(/\//g, "~1")).join("");

const same = (a: unknown, b: unknown): boolean => canonicalize(a) === canonicalize(b);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const isKeyed = (v: unknown[]): v is { id: string }[] => v.length > 0 && v.every((x) => isRecord(x) && typeof x.id === "string");

function walk(a: unknown, b: unknown, path: string[], out: Omit<DescriptorChange, "readsByModel">[]): void {
  if (same(a, b)) return;
  const at = pointer(...path);
  if (isRecord(a) && isRecord(b)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(key in b)) out.push({ path: pointer(...path, key), change: "removed", before: a[key] });
      else if (!(key in a)) out.push({ path: pointer(...path, key), change: "added", after: b[key] });
      else walk(a[key], b[key], [...path, key], out);
    }
    return;
  }
  if (Array.isArray(a) && Array.isArray(b) && isKeyed(a) && isKeyed(b)) {
    const left = new Map(a.map((x) => [x.id, x]));
    const right = new Map(b.map((x) => [x.id, x]));
    for (const [id, x] of left) {
      const y = right.get(id);
      if (y === undefined) out.push({ path: pointer(...path, id), change: "removed", before: x });
      else walk(x, y, [...path, id], out);
    }
    for (const [id, y] of right) {
      if (!left.has(id)) out.push({ path: pointer(...path, id), change: "added", after: y });
    }
    return;
  }
  out.push({ path: at, change: "changed", before: a, after: b });
}

function ratingSlotRead(prev: Descriptor, next: Descriptor, segments: string[]): boolean {
  const [, key, field] = segments;
  if (key === undefined) return false;
  const usedBy = [prev, next].map((d) => d.ratings[key]?.used_by_model);
  if (field === "used_by_model") return true;
  if (field === undefined) return false;
  return RATING_SLOTS.has(field) && usedBy.includes(field as "manufacturer" | "simulation" | "measured");
}

function readsByModel(prev: Descriptor, next: Descriptor, c: Omit<DescriptorChange, "readsByModel">): boolean {
  const segments = c.path.split("/").slice(1).map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
  switch (segments[0]) {
    case "pins":
      return segments.length === 2 || segments[2] === "type" || segments[2] === "class";
    case "behaviour":
      return segments[1] === "layers";
    case "ratings":
      if (c.change === "added") return false;
      return segments.length === 2 ? prev.ratings[segments[1] ?? ""]?.used_by_model !== "none" : ratingSlotRead(prev, next, segments);
    case "failure_modes":
      return c.change !== "added" && (segments.length === 2 || segments[2] === "when" || (segments[2] === "effect" && segments[3] === "state"));
    default:
      return false;
  }
}

/** Every difference between two descriptors as a JSON Pointer, with whether the model reads it. Lists with ids are compared by id. */
export function diffDescriptors(prev: Descriptor, next: Descriptor): DescriptorChange[] {
  const raw: Omit<DescriptorChange, "readsByModel">[] = [];
  walk(prev, next, [], raw);
  return raw.map((c) => ({ ...c, readsByModel: readsByModel(prev, next, c) }));
}

function isTextOnly(path: string): boolean {
  if (TEXT_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) return true;
  return TEXT_LEAVES.has(path.slice(path.lastIndexOf("/") + 1));
}

function bumpOf(c: DescriptorChange): { bump: Bump; reason: string } {
  if (c.readsByModel) return { bump: "major", reason: `${c.path} ${c.change}: the model reads it` };
  if (isTextOnly(c.path)) return { bump: "patch", reason: `${c.path} ${c.change}: text only` };
  return { bump: "minor", reason: `${c.path} ${c.change}: nothing reads it yet` };
}

/** The smallest version bump the change between two descriptors needs (CS 4.16), with a reason per change. */
export function classifyChange(prev: Descriptor, next: Descriptor): { bump: Bump; reasons: string[] } {
  let bump: Bump = "patch";
  const reasons: string[] = [];
  for (const change of diffDescriptors(prev, next)) {
    const c = bumpOf(change);
    if (RANK[c.bump] > RANK[bump]) bump = c.bump;
    reasons.push(c.reason);
  }
  return { bump, reasons };
}

/** The lowest version `next` may carry, bumped from `prev.version`. */
export function requiredNextVersion(prev: Descriptor, next: Descriptor): string {
  const { major, minor, patch } = parseSemver(prev.version);
  switch (classifyChange(prev, next).bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

export function checkVersionBump(prev: Descriptor, next: Descriptor): Diagnostic[] {
  if (versionCompare(next.version, prev.version) <= 0) {
    return [diag("P-VERSION-BUMP", "error", "/version", `${next.version} is not above ${prev.version}`, `use ${requiredNextVersion(prev, next)} or higher`)];
  }
  const { bump, reasons } = classifyChange(prev, next);
  const required = requiredNextVersion(prev, next);
  if (versionCompare(next.version, required) >= 0) return [];
  return [diag("P-VERSION-BUMP", "error", "/version", `${next.version} is too small for a ${bump} change (${reasons.join("; ")})`, `use ${required} or higher`)];
}

/** The exact part a project pinned, or why it is unavailable. An unavailable part never stops a project from opening. */
export function resolvePinned(reg: Pick<PartRegistry, "get">, dep: ComponentDependency): Pinned {
  const def = reg.get(dep.ref, dep.version);
  if (def === undefined) return { found: false, reason: "missing" };
  if (dep.origin !== "builtin" && dep.digest !== undefined && digestOf(def) !== dep.digest) {
    return { found: false, reason: "digest-mismatch" };
  }
  return { found: true, def };
}

export function buildDependency(def: Descriptor, origin: "builtin" | "library" | "embedded"): ComponentDependency {
  const dep: ComponentDependency = { ref: def.id, version: def.version, origin, interface: interfaceOf(def) };
  if (origin !== "builtin") dep.digest = digestOf(def);
  if (origin === "embedded") dep.definition = def;
  return dep;
}

/** What upgrading every instance of `from` to `to` would do, as ops the person can review before applying. */
export function planUpgrade(doc: Project, from: Descriptor, to: Descriptor, origin: "library" | "embedded"): UpgradePlan {
  const instances = doc.components
    .filter((c) => c.definition.ref === from.id && c.definition.version === from.version)
    .map((c) => c.id)
    .sort();
  const oldPins = new Set(from.pins.map((p) => p.id));
  const newPins = new Set(to.pins.map((p) => p.id));
  const removedPins = [...oldPins].filter((id) => !newPins.has(id));
  const addedPins = [...newPins].filter((id) => !oldPins.has(id));
  const removed = new Set(removedPins);
  const mine = new Set(instances);
  const wiresOnRemovedPins = doc.nets
    .flatMap((n) => n.connections)
    .filter((ref) => mine.has(ref.c) && removed.has(ref.p))
    .map((ref) => ({ instance: ref.c, pin: ref.p }));

  const plan: UpgradePlan = {
    ref: from.id,
    from: from.version,
    to: to.version,
    bump: classifyChange(from, to).bump,
    changes: diffDescriptors(from, to),
    removedPins,
    addedPins,
    wiresOnRemovedPins,
    instances,
    ops: [],
  };
  if (versionCompare(to.version, from.version) <= 0) return { ...plan, blocked: "not-newer" };
  if (wiresOnRemovedPins.length > 0) return { ...plan, blocked: "pins-removed-in-use" };

  const pinMap = Object.fromEntries([...oldPins].filter((id) => newPins.has(id)).map((id) => [id, id]));
  plan.ops = [
    { k: "dep.set", dependency: buildDependency(to, origin) },
    ...instances.map((id): Op => ({ k: "component.swap", id, definition: { ref: to.id, version: to.version }, pinMap })),
    { k: "dep.remove", ref: from.id, version: from.version },
  ];
  return plan;
}
