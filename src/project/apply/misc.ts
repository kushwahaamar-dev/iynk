import { LIMITS } from "../../core/limits.ts";
import type {
  Body,
  Domains,
  Frame,
  Joint,
  Mechanical,
  Mount,
  Op,
  PinRef,
  Project,
  Provenance,
} from "../generated/types.ts";
import { validateBody, validateDomains, validateFrame, validateJoint, validateMount } from "../generated/validate.mjs";
import { afterDomainOp } from "./domain-robotics.ts";
import type { RefError } from "./domain-robotics.ts";
import { instanceOf, isRejected, put, take } from "./sim.ts";
import { pathOwner, pathProblem } from "./source.ts";
import { allEntityIds, findById, mergePatch, pointer, reject, schemaMessage, setOwn, upsertBy } from "./types.ts";
import type { Bag, Handler, OpOf, Reject } from "./types.ts";

type Collection = OpOf<"mech.set">["collection"];

/** The caps of `Mechanical` in the schema. */
const MECH_LIMITS: Record<Collection, number> = { frames: 512, bodies: 512, joints: 512, mounts: 2000 };

const MECH_VALIDATORS = {
  frames: validateFrame,
  bodies: validateBody,
  joints: validateJoint,
  mounts: validateMount,
};

const MAX_PARAMETERS = 256;
const MAX_COMPONENT_DEPENDENCIES = 512;
const MAX_THIRD_PARTY = 200;
const MAX_CONTRIBUTORS = 64;

const missing = (what: string, id: string): Reject => reject("missing_target", `${what}: ${id} does not exist`);

function frameProblem(state: Project, frame: Frame): Reject | null {
  const frames = state.mechanical?.frames ?? [];
  if (frame.parent !== "world" && !findById(frames, frame.parent)) return missing("V3-FRAME", frame.parent);
  const seen = new Set<string>();
  for (let at = frame.parent; at !== "world" && !seen.has(at); at = findById(frames, at)?.parent ?? "world") {
    if (at === frame.id) return reject("invariant", `V3-FRAME-CYCLE: ${frame.id} would be its own ancestor`);
    seen.add(at);
  }
  return null;
}

function mechProblem(state: Project, collection: Collection, value: Frame | Body | Joint | Mount): Reject | null {
  const { frames = [], bodies = [] } = state.mechanical ?? {};
  switch (collection) {
    case "frames":
      return frameProblem(state, value as Frame);
    case "bodies": {
      const body = value as Body;
      if (!findById(frames, body.frame)) return missing("V3-BODY", body.frame);
      if (body.component !== undefined && !instanceOf(state, body.component)) return missing("V3-BODY", body.component);
      return null;
    }
    case "joints": {
      const joint = value as Joint;
      const absent = [joint.parent, joint.child].find((id) => !findById(bodies, id));
      if (absent !== undefined) return missing("V3-BODY", absent);
      const drive = joint.drive?.component;
      return drive !== undefined && !instanceOf(state, drive) ? missing("V3-BODY", drive) : null;
    }
    case "mounts": {
      const mount = value as Mount;
      if (!instanceOf(state, mount.component)) return missing("V3-MOUNT", mount.component);
      return findById(frames, mount.frame) ? null : missing("V3-MOUNT", mount.frame);
    }
  }
}

/** The mechanical section with `collection` set to `items`, or no section when all four lists are empty. */
function withCollection(state: Project, collection: Collection, items: { id: string }[]): Project {
  const section = { frames: [], bodies: [], joints: [], mounts: [], ...state.mechanical, [collection]: items };
  const next = { ...state };
  if (Object.values(section).every((list) => list.length === 0)) delete next.mechanical;
  else next.mechanical = section as Mechanical;
  return next;
}

const mechSet: Handler<"mech.set"> = (state, op) => {
  const validate = MECH_VALIDATORS[op.collection];
  if (!validate(op.value)) return reject("malformed", schemaMessage(validate.errors));
  const value = op.value as Frame | Body | Joint | Mount;
  const problem = mechProblem(state, op.collection, value);
  if (problem) return problem;
  const list = (state.mechanical?.[op.collection] ?? []) as { id: string }[];
  const placed = put(list, value, MECH_LIMITS[op.collection], op.collection);
  if (isRejected(placed)) return placed;
  return {
    state: withCollection(state, op.collection, placed.items),
    inverse: [
      placed.previous
        ? { k: "mech.set", collection: op.collection, value: placed.previous }
        : { k: "mech.remove", collection: op.collection, id: value.id },
    ],
  };
};

/** JSON Pointers to what still names the frame or body being removed. */
function mechRefs(state: Project, collection: Collection, id: string): string[] {
  const { frames = [], bodies = [], joints = [], mounts = [] } = state.mechanical ?? {};
  const at = (list: readonly unknown[], name: string, hit: (item: never) => boolean): string[] =>
    list.flatMap((item, i) => (hit(item as never) ? [pointer("mechanical", name, i)] : []));
  if (collection === "frames") {
    return [
      ...at(frames, "frames", (f: Frame) => f.parent === id),
      ...at(bodies, "bodies", (b: Body) => b.frame === id),
      ...at(mounts, "mounts", (m: Mount) => m.frame === id),
    ];
  }
  return collection === "bodies" ? at(joints, "joints", (j: Joint) => j.parent === id || j.child === id) : [];
}

const mechRemove: Handler<"mech.remove"> = (state, op) => {
  const list = (state.mechanical?.[op.collection] ?? []) as { id: string }[];
  const taken = take(list, op.id, `a ${op.collection.slice(0, -1)}`);
  if (isRejected(taken)) return taken;
  const refs = mechRefs(state, op.collection, op.id);
  if (refs.length > 0) return reject("referenced_by", `${op.id} is still used by ${refs.length} other entities`, refs);
  return {
    state: withCollection(state, op.collection, taken.items),
    inverse: [{ k: "mech.set", collection: op.collection, value: taken.previous } as Op],
  };
};

const paramSet: Handler<"param.set"> = (state, op) => {
  const placed = put(state.parameters, op.parameter, MAX_PARAMETERS, "parameters");
  if (isRejected(placed)) return placed;
  return {
    state: { ...state, parameters: placed.items },
    inverse: [
      placed.previous ? { k: "param.set", parameter: placed.previous } : { k: "param.remove", id: op.parameter.id },
    ],
  };
};

/** JSON Pointers to every parameter binding of an instance's `params` that names `id`. */
function bindings(list: readonly { params?: Bag }[], name: string, id: string): string[] {
  return list.flatMap((instance, i) =>
    Object.entries(instance.params ?? {}).flatMap(([key, value]) =>
      typeof value === "object" && value !== null && (value as Bag).param === id
        ? [pointer(name, i, "params", key)]
        : [],
    ),
  );
}

const paramRemove: Handler<"param.remove"> = (state, op) => {
  const taken = take(state.parameters, op.id, "a parameter");
  if (isRejected(taken)) return taken;
  const refs = [
    ...bindings(state.boards, "boards", op.id),
    ...bindings(state.components, "components", op.id),
    ...state.parameters.flatMap((other, i) =>
      other.keepApart?.param === op.id ? [pointer("parameters", i, "keepApart")] : [],
    ),
  ];
  if (refs.length > 0) return reject("referenced_by", `${op.id} is still bound ${refs.length} times`, refs);
  return { state: { ...state, parameters: taken.items }, inverse: [{ k: "param.set", parameter: taken.previous }] };
};

const testSet: Handler<"test.set"> = (state, op) => {
  const ids = new Set<string>();
  for (const check of op.test.checks) {
    if (ids.has(check.id)) return reject("duplicate_id", `V3-CHECK-DUP: ${check.id} appears twice in ${op.test.id}`);
    ids.add(check.id);
  }
  const placed = put(state.tests, op.test, LIMITS.tests, "tests");
  if (isRejected(placed)) return placed;
  return {
    state: { ...state, tests: placed.items },
    inverse: [placed.previous ? { k: "test.set", test: placed.previous } : { k: "test.remove", id: op.test.id }],
  };
};

const testRemove: Handler<"test.remove"> = (state, op) => {
  const taken = take(state.tests, op.id, "a test");
  if (isRejected(taken)) return taken;
  return { state: { ...state, tests: taken.items }, inverse: [{ k: "test.set", test: taken.previous }] };
};

const assetAdd: Handler<"asset.add"> = (state, op) => {
  const { asset } = op;
  if (allEntityIds(state).has(asset.id)) return reject("duplicate_id", `${asset.id} is already used`);
  const bad = pathProblem(asset.path);
  if (bad) return bad;
  const owner = pathOwner(state.assets, asset.path);
  if (owner !== undefined) return reject("duplicate_id", `V3-PATH: ${asset.path} is already the path of ${owner}`);
  const placed = put(state.assets, asset, LIMITS.assets, "assets");
  if (isRejected(placed)) return placed;
  return { state: { ...state, assets: placed.items }, inverse: [{ k: "asset.remove", id: asset.id }] };
};

const assetRemove: Handler<"asset.remove"> = (state, op) => {
  const taken = take(state.assets, op.id, "an asset");
  if (isRejected(taken)) return taken;
  const refs = [
    ...(state.meta.thumbnail === op.id ? [pointer("meta", "thumbnail")] : []),
    ...(state.mechanical?.bodies ?? []).flatMap((body, i) =>
      body.shape?.kind === "mesh" && body.shape.asset === op.id ? [pointer("mechanical", "bodies", i, "shape")] : [],
    ),
  ];
  if (refs.length > 0) return reject("referenced_by", `${op.id} is still used`, refs);
  return { state: { ...state, assets: taken.items }, inverse: [{ k: "asset.add", asset: taken.previous }] };
};

const depKey = (dependency: { ref: string; version: string }): string => `${dependency.ref}\0${dependency.version}`;

const depSet: Handler<"dep.set"> = (state, op) => {
  const { components } = state.dependencies;
  const previous = components.find((dependency) => depKey(dependency) === depKey(op.dependency));
  if (!previous && components.length >= MAX_COMPONENT_DEPENDENCIES) {
    return reject("quota", `a project holds at most ${MAX_COMPONENT_DEPENDENCIES} component dependencies`);
  }
  return {
    state: {
      ...state,
      dependencies: { ...state.dependencies, components: upsertBy(components, depKey, op.dependency) },
    },
    inverse: [
      previous
        ? { k: "dep.set", dependency: previous }
        : { k: "dep.remove", ref: op.dependency.ref, version: op.dependency.version },
    ],
  };
};

const depRemove: Handler<"dep.remove"> = (state, op) => {
  const { components } = state.dependencies;
  const previous = components.find((dependency) => dependency.ref === op.ref && dependency.version === op.version);
  if (!previous) return reject("missing_target", `${op.ref}@${op.version} is not a dependency`);
  const uses = (instance: { definition: { ref: string; version: string } }) =>
    instance.definition.ref === op.ref && instance.definition.version === op.version;
  const refs = [
    ...state.boards.flatMap((board, i) => (uses(board) ? [pointer("boards", i)] : [])),
    ...state.components.flatMap((component, i) => (uses(component) ? [pointer("components", i)] : [])),
  ];
  if (refs.length > 0) return reject("referenced_by", `${op.ref}@${op.version} is still used`, refs);
  return {
    state: {
      ...state,
      dependencies: { ...state.dependencies, components: components.filter((dependency) => dependency !== previous) },
    },
    inverse: [{ k: "dep.set", dependency: previous }],
  };
};

const guideSet: Handler<"guide.set"> = (state, op) => ({
  state: { ...state, guide: op.guide },
  inverse: state.guide ? [{ k: "guide.set", guide: state.guide }] : [],
});

/** An upsert-and-remove step on a keyed list, with the entries that undo it. */
function mergeKeyed<T>(
  items: readonly T[] | undefined,
  keyOf: (item: T) => string,
  upserts: readonly T[],
  removals: readonly string[],
  limit: number,
  what: string,
): { items: T[]; restore: T[]; added: string[] } | Reject {
  const before = items ?? [];
  const find = (key: string) => before.find((item) => keyOf(item) === key);
  const upsertKeys = new Set(upserts.map(keyOf));
  const clash = removals.find((key) => upsertKeys.has(key));
  if (clash !== undefined) return reject("malformed", `${clash} is both set and removed in ${what}`);
  const unknown = removals.find((key) => !find(key));
  if (unknown !== undefined) return reject("missing_target", `${unknown} is not in ${what}`);

  const merged = upserts
    .reduce((list, item) => upsertBy(list, keyOf, item), [...before])
    .filter((item) => !removals.includes(keyOf(item)));
  if (merged.length > limit) return reject("quota", `${what} holds at most ${limit} entries`);
  const restore = [...upsertKeys, ...removals].flatMap((key) => find(key) ?? []);
  return { items: merged, restore, added: [...upsertKeys].filter((key) => !find(key)) };
}

/** Stores a touched list, or no key at all once it is empty, so a list that was never there does not appear. */
function setList<K extends "thirdParty" | "contributors">(
  provenance: Provenance,
  key: K,
  items: NonNullable<Provenance[K]>,
  touched: unknown,
): void {
  if (!touched) return;
  if (items.length > 0) provenance[key] = items;
  else delete provenance[key];
}

const provenanceSet: Handler<"provenance.set"> = (state, op) => {
  const { provenance } = state;
  const thirdParty = mergeKeyed(
    provenance.thirdParty,
    (entry) => entry.id,
    op.thirdParty ?? [],
    op.remove?.thirdParty ?? [],
    MAX_THIRD_PARTY,
    "provenance.thirdParty",
  );
  if (isRejected(thirdParty)) return thirdParty;
  const contributors = mergeKeyed(
    provenance.contributors,
    (entry) => entry.actor,
    op.contributors ?? [],
    op.remove?.contributors ?? [],
    MAX_CONTRIBUTORS,
    "provenance.contributors",
  );
  if (isRejected(contributors)) return contributors;

  const next: Provenance = { ...provenance };
  setList(next, "thirdParty", thirdParty.items, op.thirdParty || op.remove?.thirdParty);
  setList(next, "contributors", contributors.items, op.contributors || op.remove?.contributors);

  const undo: OpOf<"provenance.set"> = { k: "provenance.set" };
  if (thirdParty.restore.length > 0) undo.thirdParty = thirdParty.restore;
  if (contributors.restore.length > 0) undo.contributors = contributors.restore;
  if (thirdParty.added.length > 0 || contributors.added.length > 0) {
    undo.remove = {};
    if (thirdParty.added.length > 0) undo.remove.thirdParty = thirdParty.added;
    if (contributors.added.length > 0) undo.remove.contributors = contributors.added;
  }
  return { state: { ...state, provenance: next }, inverse: [undo] };
};

const licenseSet: Handler<"license.set"> = (state, op) => ({
  state: { ...state, license: op.license },
  inverse: [{ k: "license.set", license: state.license }],
});

const isBag = (value: unknown): value is Bag => typeof value === "object" && value !== null && !Array.isArray(value);

/** The merge patch that undoes `patch` on `target`: each touched key gets its old value, or null if it had none. */
function reversePatch(target: unknown, patch: Bag): Bag {
  const before = isBag(target) ? target : {};
  const undo: Bag = {};
  for (const key of Object.keys(patch)) {
    const had = before[key];
    const change = patch[key];
    if (change === null) {
      if (had !== undefined) setOwn(undo, key, had);
    } else if (isBag(change) && isBag(had)) {
      setOwn(undo, key, reversePatch(had, change));
    } else {
      setOwn(undo, key, had ?? null);
    }
  }
  return undo;
}

const refsReject = (errors: RefError[]): Reject =>
  reject("invariant", errors.map((e) => `${e.path}: ${e.message}`).join("; "), errors.map((e) => e.path));

const domainSet: Handler<"domain.set"> = (state, op, ctx) => {
  if (ctx.author.kind !== "import" && ctx.author.kind !== "system") {
    return reject("permission", "domain.set is for import and migration; editors use domain.patch");
  }
  const domains = { ...state.domains, [op.domain]: op.value };
  if (!validateDomains(domains)) return reject("malformed", schemaMessage(validateDomains.errors));
  const previous = state.domains?.[op.domain];
  const next = { ...state, domains: domains as Domains };
  const refs = afterDomainOp(next, op);
  if (!refs.ok) return refsReject(refs.errors);
  return {
    state: next,
    inverse: previous ? [{ k: "domain.set", domain: op.domain, value: previous }] : [],
  };
};

const domainPatch: Handler<"domain.patch"> = (state, op) => {
  const current = state.domains?.[op.domain];
  if (!current) return reject("missing_target", `domains.${op.domain} does not exist`);
  const entry = { schemaVersion: current.schemaVersion, data: mergePatch(current.data, op.patch) };
  const domains = { ...state.domains, [op.domain]: entry };
  if (!validateDomains(domains)) return reject("malformed", schemaMessage(validateDomains.errors));
  const next = { ...state, domains: domains as Domains };
  const refs = afterDomainOp(next, op);
  if (!refs.ok) return refsReject(refs.errors);
  return {
    state: next,
    inverse: [{ k: "domain.patch", domain: op.domain, patch: reversePatch(current.data, op.patch) }],
  };
};

export const MISC_HANDLERS = {
  "mech.set": mechSet,
  "mech.remove": mechRemove,
  "param.set": paramSet,
  "param.remove": paramRemove,
  "test.set": testSet,
  "test.remove": testRemove,
  "asset.add": assetAdd,
  "asset.remove": assetRemove,
  "dep.set": depSet,
  "dep.remove": depRemove,
  "guide.set": guideSet,
  "provenance.set": provenanceSet,
  "license.set": licenseSet,
  "domain.set": domainSet,
  "domain.patch": domainPatch,
};
