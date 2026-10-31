import { diag } from "../../core/result.ts";
import type { Diagnostic } from "../../core/result.ts";
import { validateDescriptor } from "../../parts/descriptor.ts";
import type { Descriptor, ValidateContext } from "../../parts/descriptor.ts";

type PinType = Descriptor["pins"][number]["type"];
type PinClass = Descriptor["pins"][number]["class"];
type Polarity = NonNullable<Descriptor["pins"][number]["polarity"]>;
type Category = Descriptor["identity"]["category"];
type Kind = Descriptor["identity"]["kind"];
type Tier = Descriptor["simulation"]["tier"];
type SimStatus = Descriptor["simulation"]["status"];
type FallbackRenderer = Descriptor["visual"]["fallback"]["renderer"];
type AssetType = NonNullable<Descriptor["visual"]["assets"]>[number]["media_type"];

type Json = Record<string, unknown>;

export const DRAFT_LIMITS = { pins: 32, parameters: 64, tableRows: 256 } as const;

export type TemplateId = "resistor-like" | "switch" | "led-like" | "truth-table" | "analog-sensor" | "not-modelled";

export interface DraftPin {
  uid: string;
  id: string;
  name: string;
  designator: string;
  type: PinType;
  class: PinClass;
  polarity?: Polarity;
  x: number;
  y: number;
  z?: number;
  /** The descriptor gave this pin no position; x and y are placeholders until the pin is moved. */
  unplaced?: true;
  /** What the descriptor holds on this pin beyond the fields above (a connector, a note, a pull). */
  extra?: Json;
}

export interface DraftGroup {
  id: string;
  kind: "internal-short" | "strip" | "plane";
  pins: string[];
  extra?: Json;
}

export interface DraftAsset {
  path: string;
  mediaType: AssetType;
  sha256: string;
  license: string;
  attribution?: string;
}

export interface PartDraft {
  mode: "form" | "json";
  baseKey?: string;
  /** The part of the id after `local.`. A slug with a dot is a whole id of another namespace. Empty means: derive from the name. */
  slug: string;
  version: string;
  /** The name people see: `identity.model`. */
  name: string;
  manufacturer: string;
  /** The maker's part number: `identity.mpn`. */
  model: string;
  category: Category;
  kind: Kind;
  description: string;
  pins: DraftPin[];
  groups: DraftGroup[];
  body: { w: number; h: number; d: number; accuracy: number };
  fallback: { renderer: FallbackRenderer; label: string; bodyColour: string; showPinLabels: boolean };
  ratings: Record<string, unknown>;
  parameters: unknown[];
  layers: unknown[];
  simulation: {
    tier: Tier;
    status: SimStatus;
    whatItModels: string[];
    notModelled: string[];
    knownGaps: unknown[];
    solverRequires: string[];
  };
  tests: unknown[];
  testFiles: Record<string, string>;
  assets: DraftAsset[];
  license: string;
  authors: string[];
  sources: unknown[];
  template: { id: TemplateId; params: unknown } | null;
  /** Everything in the descriptor that no form field owns, kept so a round trip drops nothing. Form-owned fields in here are ignored. */
  extra: Readonly<Record<string, unknown>>;
  rawJson?: string;
  /** The last descriptor the JSON view held that parsed, returned while the text does not. */
  lastGood?: Descriptor;
  dirty: boolean;
  /** What the last action took out with a pin that other parts of the draft named. */
  lastCascade?: string[];
  /** Why the last action was refused. */
  issue?: Diagnostic;
}

export type DraftAction =
  | { type: "setField"; field: keyof PartDraft; value: unknown }
  | { type: "addPin" }
  | { type: "removePin"; uid: string }
  | { type: "movePin"; uid: string; x: number; y: number }
  | { type: "setPinField"; uid: string; field: keyof DraftPin; value: unknown }
  | { type: "addGroup" }
  | { type: "removeGroup"; id: string }
  | { type: "setGroupPins"; id: string; pins: string[] }
  | { type: "setFallback"; patch: Partial<PartDraft["fallback"]> }
  | { type: "applyPatch"; patch: Partial<PartDraft> }
  | { type: "switchMode"; mode: "form" | "json" }
  | { type: "setRawJson"; text: string }
  | { type: "reset"; draft: PartDraft };

const SCHEMA_ID = "iynk.component/1";
const NOT_MODELLED_DEFAULT = "Everything this form does not set";
const LABEL_MAX = 24;
const SLUG_MAX = 40;
const STRUCTURAL_CODES = new Set(["P-SCHEMA", "P-SIZE", "P-NEWER"]);

const PIN_OWNED = [["id"], ["name", "en"], ["designator"], ["type"], ["class"], ["polarity"], ["position"]] as const;
const GROUP_OWNED = [["id"], ["kind"], ["pins"]] as const;
const OWNED = [
  ["schema"], ["id"], ["version"], ["sources"], ["pins"], ["groups"], ["ratings"], ["parameters"],
  ["behaviour", "layers"],
  ["identity", "manufacturer"], ["identity", "model"], ["identity", "mpn"], ["identity", "kind"], ["identity", "category"],
  ["identity", "description", "en"],
  ["dimensions", "body"], ["dimensions", "accuracy"],
  ["simulation", "tier"], ["simulation", "status"], ["simulation", "what_it_models"], ["simulation", "not_modelled"],
  ["simulation", "known_gaps"], ["simulation", "solver_requires"], ["simulation", "tests"],
  ["visual", "fallback", "renderer"], ["visual", "fallback", "label"], ["visual", "fallback", "body_colour"],
  ["visual", "fallback", "show_pin_labels"], ["visual", "assets"],
  ["provenance", "license"], ["provenance", "authors"],
] as const;

/** Lists the draft leaves out of the descriptor when they are empty; a source that wrote one out keeps it through `extra`. */
const OPTIONAL_LISTS = [
  ["groups"], ["parameters"], ["simulation", "known_gaps"], ["simulation", "solver_requires"], ["simulation", "tests"],
  ["provenance", "authors"], ["visual", "assets"],
] as const;

const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const isEmpty = (o: Json): boolean => Object.keys(o).length === 0;
const clone = <T>(v: T): T => structuredClone(v);

/** Deletes the leaf at `path`, and any object left empty above it. */
function strip(root: Json, path: readonly string[]): void {
  const [head, ...rest] = path;
  if (rest.length === 0) {
    delete root[head];
    return;
  }
  const child = root[head];
  if (!isObject(child)) return;
  strip(child, rest);
  if (isEmpty(child)) delete root[head];
}

/** Copies from `extra` what `target` does not have, going into objects both hold. `target` wins. */
function fill(target: Json, extra: Json): Json {
  const out: Json = { ...target };
  for (const [key, value] of Object.entries(extra)) {
    if (!(key in out)) out[key] = value;
    else if (isObject(out[key]) && isObject(value)) out[key] = fill(out[key], value);
  }
  return out;
}

function keepEmptyLists(extra: Json, source: Json): void {
  for (const path of OPTIONAL_LISTS) {
    const parent = path.slice(0, -1).reduce<unknown>((node, key) => (isObject(node) ? node[key] : undefined), source);
    const field = path[path.length - 1];
    if (!isObject(parent) || !Array.isArray(parent[field]) || parent[field].length > 0) continue;
    let target = extra;
    for (const key of path.slice(0, -1)) {
      if (!isObject(target[key])) target[key] = {};
      target = target[key] as Json;
    }
    target[field] = [];
  }
}

function remainder(source: object, owned: readonly (readonly string[])[]): Json | undefined {
  const rest = clone(source) as Json;
  for (const path of owned) strip(rest, path);
  return isEmpty(rest) ? undefined : rest;
}

/** Text items hold only their English in the draft; this keeps the other keys of each, by position. */
function textRest(list: readonly Json[]): Json[] | undefined {
  const rest = list.map((t) => Object.fromEntries(Object.entries(t).filter(([key]) => key !== "en")));
  return rest.some((o) => !isEmpty(o)) ? rest : undefined;
}

const texts = (list: readonly string[], rest: unknown): Json[] =>
  list.map((en, i) => ({ ...(Array.isArray(rest) && isObject(rest[i]) ? rest[i] : {}), en }));

const dateOf = (iso: string): string => iso.slice(0, 10);

export function slugFor(name: string, existing: ReadonlySet<string>): string {
  let base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (base === "") base = "part";
  if (!/^[a-z]/.test(base)) base = `part-${base}`;
  base = base.slice(0, SLUG_MAX).replace(/-+$/, "");
  let slug = base;
  for (let n = 2; existing.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

export function newDraft(nowIso: string): PartDraft {
  return {
    mode: "form",
    slug: "",
    version: "1.0.0",
    name: "",
    manufacturer: "generic",
    model: "",
    category: "passive",
    kind: "discrete",
    description: "",
    pins: [],
    groups: [],
    body: { w: 10, h: 10, d: 5, accuracy: 0.5 },
    fallback: { renderer: "generic-box", label: "", bodyColour: "#8a8f98", showPinLabels: true },
    ratings: {},
    parameters: [],
    layers: [{ id: "main", domain: "analog", model: { kind: "none", reason: { en: "No model has been chosen for this part yet." } } }],
    simulation: {
      tier: "none",
      status: "not-modelled-yet",
      whatItModels: [],
      notModelled: [NOT_MODELLED_DEFAULT],
      knownGaps: [],
      solverRequires: [],
    },
    tests: [],
    testFiles: {},
    assets: [],
    license: "LicenseRef-local-private",
    authors: [],
    sources: [
      { id: "self", kind: "own-estimate", title: "Written by the person who made this part", reliability: "unverified" },
    ],
    template: null,
    extra: {
      identity: { generic: true, legacy_ids: [], tags: [] },
      provenance: { origin: "local-user", created: dateOf(nowIso), review: { status: "unreviewed" } },
    },
    dirty: false,
  };
}

function pinFrom(p: Descriptor["pins"][number], uid: string): DraftPin {
  const extra = remainder(p, PIN_OWNED);
  return {
    uid,
    id: p.id,
    name: p.name?.en ?? "",
    designator: p.designator ?? "",
    type: p.type,
    class: p.class,
    ...(p.polarity !== undefined && { polarity: p.polarity }),
    x: p.position?.x ?? 0,
    y: p.position?.y ?? 0,
    ...(p.position?.z !== undefined && { z: p.position.z }),
    ...(p.position === undefined && { unplaced: true as const }),
    ...(extra && { extra }),
  };
}

function groupFrom(g: NonNullable<Descriptor["groups"]>[number]): DraftGroup {
  const extra = remainder(g, GROUP_OWNED);
  return { id: g.id, kind: g.kind, pins: [...g.pins], ...(extra && { extra }) };
}

export function draftFromDescriptor(descriptor: Descriptor): PartDraft {
  const d = clone(descriptor);
  const { simulation: sim, visual, provenance, identity } = d;
  const extra = remainder(d, OWNED) ?? {};
  keepEmptyLists(extra, d);
  const textRests: Json = {};
  const modelsRest = textRest(sim.what_it_models);
  const notModelledRest = textRest(sim.not_modelled);
  if (modelsRest) textRests.what_it_models = modelsRest;
  if (notModelledRest) textRests.not_modelled = notModelledRest;
  if (!isEmpty(textRests)) extra.simulation = { ...(isObject(extra.simulation) ? extra.simulation : {}), ...textRests };
  return {
    mode: "form",
    slug: d.id.startsWith("local.") ? d.id.slice("local.".length) : d.id,
    version: d.version,
    name: identity.model,
    manufacturer: identity.manufacturer,
    model: identity.mpn ?? "",
    category: identity.category,
    kind: identity.kind,
    description: identity.description?.en ?? "",
    pins: d.pins.map((p, i) => pinFrom(p, `p${i + 1}`)),
    groups: (d.groups ?? []).map(groupFrom),
    body: { ...(d.dimensions?.body ?? { w: 10, h: 10, d: 5 }), accuracy: d.dimensions?.accuracy ?? 0.5 },
    fallback: {
      renderer: visual.fallback.renderer,
      label: visual.fallback.label,
      bodyColour: visual.fallback.body_colour ?? "",
      showPinLabels: visual.fallback.show_pin_labels ?? false,
    },
    ratings: d.ratings,
    parameters: d.parameters ?? [],
    layers: d.behaviour.layers,
    simulation: {
      tier: sim.tier,
      status: sim.status,
      whatItModels: sim.what_it_models.map((t) => String(t.en)),
      notModelled: sim.not_modelled.map((t) => String(t.en)),
      knownGaps: sim.known_gaps ?? [],
      solverRequires: sim.solver_requires ?? [],
    },
    tests: sim.tests ?? [],
    testFiles: {},
    assets: (visual.assets ?? []).map((a) => ({
      path: a.path,
      mediaType: a.media_type,
      sha256: a.sha256,
      license: a.license,
      ...(a.attribution !== undefined && { attribution: a.attribution }),
    })),
    license: provenance.license,
    authors: provenance.authors ?? [],
    sources: d.sources,
    template: null,
    extra,
    dirty: false,
  };
}

function compose(s: PartDraft, nowIso?: string): Descriptor {
  const sim = s.simulation;
  const simExtra = isObject(s.extra.simulation) ? s.extra.simulation : {};
  const owned: Json = {
    schema: SCHEMA_ID,
    id: idOf(s),
    version: s.version,
    identity: {
      manufacturer: s.manufacturer,
      model: s.name,
      ...(s.model && { mpn: s.model }),
      kind: s.kind,
      category: s.category,
      ...(s.description && { description: { en: s.description } }),
    },
    sources: s.sources,
    pins: s.pins.map(pinOf),
    ...(s.groups.length > 0 && { groups: s.groups.map(groupOf) }),
    dimensions: { body: { w: s.body.w, h: s.body.h, d: s.body.d }, accuracy: s.body.accuracy },
    ratings: s.ratings,
    ...(s.parameters.length > 0 && { parameters: s.parameters }),
    behaviour: { layers: s.layers },
    simulation: {
      tier: sim.tier,
      status: sim.status,
      what_it_models: texts(sim.whatItModels, simExtra.what_it_models),
      not_modelled: texts(sim.notModelled, simExtra.not_modelled),
      ...(sim.knownGaps.length > 0 && { known_gaps: sim.knownGaps }),
      ...(sim.solverRequires.length > 0 && { solver_requires: sim.solverRequires }),
      ...(s.tests.length > 0 && { tests: s.tests }),
    },
    visual: {
      fallback: {
        renderer: s.fallback.renderer,
        label: (s.fallback.label || s.name).slice(0, LABEL_MAX),
        ...(s.fallback.bodyColour && { body_colour: s.fallback.bodyColour }),
        show_pin_labels: s.fallback.showPinLabels,
      },
      ...(s.assets.length > 0 && { assets: s.assets.map(assetOf) }),
    },
    provenance: { license: s.license, ...(s.authors.length > 0 && { authors: s.authors }) },
  };
  const defaults: Json = nowIso ? { provenance: { created: dateOf(nowIso) } } : {};
  return fill(fill(owned, s.extra), defaults) as Descriptor;
}

const idOf = (s: PartDraft): string =>
  s.slug.includes(".") ? s.slug : `local.${s.slug || slugFor(s.name, new Set())}`;

function pinOf(p: DraftPin): Json {
  const owned: Json = {
    id: p.id,
    ...(p.name && { name: { en: p.name } }),
    ...(p.designator && { designator: p.designator }),
    type: p.type,
    class: p.class,
    ...(p.polarity !== undefined && { polarity: p.polarity }),
    ...(!p.unplaced && { position: { x: p.x, y: p.y, ...(p.z !== undefined && { z: p.z }) } }),
  };
  return p.extra ? fill(owned, p.extra) : owned;
}

const groupOf = (g: DraftGroup): Json => {
  const owned: Json = { id: g.id, kind: g.kind, pins: g.pins };
  return g.extra ? fill(owned, g.extra) : owned;
};

const assetOf = (a: DraftAsset): Json => ({
  path: a.path,
  media_type: a.mediaType,
  sha256: a.sha256,
  license: a.license,
  ...(a.attribution !== undefined && { attribution: a.attribution }),
});

type Read = { value: Json } | { issue: Diagnostic };

function readRaw(s: PartDraft): Read {
  let value: unknown;
  try {
    value = JSON.parse(s.rawJson ?? "");
  } catch (e) {
    return { issue: diag("P-SCHEMA", "error", "", `the JSON does not parse: ${e instanceof Error ? e.message : String(e)}`) };
  }
  return isObject(value) ? { value } : { issue: diag("P-SCHEMA", "error", "", "the JSON must be one object, the part descriptor") };
}

/** The descriptor the draft stands for, valid or not. Never throws. */
export function toDescriptor(s: PartDraft, nowIso?: string): Descriptor {
  if (s.mode === "json") {
    const read = readRaw(s);
    return "value" in read ? (read.value as Descriptor) : (s.lastGood ?? compose(s, nowIso));
  }
  return compose(s, nowIso);
}

/** Problems of the draft as it stands: the draft's own limits, then everything the validator finds. */
export function draftIssues(
  s: PartDraft,
  ctx: Pick<ValidateContext, "installed"> & { existingKeys: ReadonlySet<string> },
): Diagnostic[] {
  const d = toDescriptor(s);
  const out: Diagnostic[] = [];
  if (s.mode === "json") {
    const read = readRaw(s);
    if ("issue" in read) out.push(read.issue);
  }

  if (Array.isArray(d.pins)) {
    if (d.pins.length > DRAFT_LIMITS.pins) {
      out.push(diag("P-DRAFT-LIMIT", "error", "/pins", `a part made here holds at most ${DRAFT_LIMITS.pins} pins; this one has ${d.pins.length}`));
    }
    const seen = new Set<string>();
    d.pins.forEach((p, i) => {
      const designator = isObject(p) ? p.designator : undefined;
      if (typeof designator !== "string" || designator === "") return;
      if (seen.has(designator)) out.push(diag("P-DRAFT-DESIGNATOR", "error", `/pins/${i}/designator`, `designator ${designator} is on two pins`));
      seen.add(designator);
    });
  }

  const key = `${d.id}@${d.version}`;
  if (ctx.existingKeys.has(key) && key !== s.baseKey) {
    out.push(diag("P-DRAFT-KEY", "error", "/version", `${key} is already in the library; pick another id or version`));
  }

  out.push(...validateDescriptor(d, { ctx: { trust: "local", installed: ctx.installed } }).diagnostics);
  return out;
}

const retarget = (ids: readonly string[], from: string, to: string | null): string[] =>
  to === null ? ids.filter((id) => id !== from) : ids.map((id) => (id === from ? to : id));

/** Renames a pin id in every place the draft names it, or with `to` null removes it and reports what that took out. */
function rewritePinRefs(s: PartDraft, from: string, to: string | null): { draft: PartDraft; cascade: string[] } {
  const cascade: string[] = [];
  const dropped = (what: string) => {
    if (to === null) cascade.push(what);
  };

  const groups = s.groups.flatMap((g) => {
    if (!g.pins.includes(from)) return [g];
    const pins = retarget(g.pins, from, to);
    if (to !== null) return [{ ...g, pins }];
    dropped(`group ${g.id}`);
    return pins.length >= 2 ? [{ ...g, pins }] : [];
  });

  const layers = s.layers.map((layer) => {
    if (!isObject(layer)) return layer;
    const next: Json = { ...layer };
    for (const field of ["reads", "drives"]) {
      const ids = layer[field];
      if (!Array.isArray(ids) || !ids.includes(from)) continue;
      next[field] = retarget(ids, from, to);
      dropped(`layer ${String(layer.id)} ${field}`);
    }
    const model = layer.model;
    if (isObject(model) && isObject(model.terminals)) {
      const terminals = Object.entries(model.terminals);
      if (terminals.some(([, pin]) => pin === from)) {
        const kept = terminals.flatMap(([name, pin]): [string, unknown][] =>
          pin !== from ? [[name, pin]] : to === null ? [] : [[name, to]],
        );
        next.model = { ...model, terminals: Object.fromEntries(kept) };
        dropped(`layer ${String(layer.id)} terminal`);
      }
    }
    return next;
  });

  const ratings = Object.fromEntries(
    Object.entries(s.ratings).map(([key, rating]) => {
      const scope = isObject(rating) ? rating.scope : undefined;
      if (!isObject(rating) || !isObject(scope) || !Array.isArray(scope.pins) || !scope.pins.includes(from)) return [key, rating];
      dropped(`rating ${key} scope`);
      const others = Object.fromEntries(Object.entries(scope).filter(([name]) => name !== "pins"));
      const pins = retarget(scope.pins, from, to);
      return [key, { ...rating, scope: pins.length > 0 ? { ...others, pins } : others }];
    }),
  );

  return { draft: { ...s, groups, layers, ratings }, cascade };
}

const nextFree = (taken: ReadonlySet<string>, prefix: string): string => {
  let n = taken.size + 1;
  while (taken.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
};

const refuse = (s: PartDraft, code: string, message: string): PartDraft => ({ ...s, issue: diag(code, "error", "", message) });

function apply(s: PartDraft, a: Exclude<DraftAction, { type: "reset" }>): PartDraft {
  switch (a.type) {
    case "setField":
      return { ...s, [a.field]: a.value } as PartDraft;
    case "addPin": {
      if (s.pins.length >= DRAFT_LIMITS.pins) {
        return refuse(s, "P-DRAFT-LIMIT", `a part made here holds at most ${DRAFT_LIMITS.pins} pins`);
      }
      const id = nextFree(new Set(s.pins.map((p) => p.id)), "P");
      const pin: DraftPin = {
        uid: nextFree(new Set(s.pins.map((p) => p.uid)), "p"),
        id,
        name: "",
        designator: id.slice(1),
        type: "passive",
        class: "passive",
        x: s.pins.length * 2.54,
        y: 0,
      };
      return { ...s, pins: [...s.pins, pin] };
    }
    case "removePin": {
      const pin = s.pins.find((p) => p.uid === a.uid);
      if (!pin) return s;
      const { draft, cascade } = rewritePinRefs(s, pin.id, null);
      return { ...draft, pins: s.pins.filter((p) => p.uid !== a.uid), lastCascade: cascade };
    }
    case "movePin":
      return { ...s, pins: s.pins.map((p) => (p.uid === a.uid ? { ...p, x: a.x, y: a.y, unplaced: undefined } : p)) };
    case "setPinField": {
      const pin = s.pins.find((p) => p.uid === a.uid);
      if (!pin) return s;
      const renamed = a.field === "id" && typeof a.value === "string" && a.value !== pin.id;
      const base = renamed ? rewritePinRefs(s, pin.id, a.value as string).draft : s;
      return { ...base, pins: s.pins.map((p) => (p.uid === a.uid ? { ...p, [a.field]: a.value } : p)) };
    }
    case "addGroup":
      return { ...s, groups: [...s.groups, { id: nextFree(new Set(s.groups.map((g) => g.id)), "g"), kind: "internal-short", pins: [] }] };
    case "removeGroup":
      return { ...s, groups: s.groups.filter((g) => g.id !== a.id) };
    case "setGroupPins":
      return { ...s, groups: s.groups.map((g) => (g.id === a.id ? { ...g, pins: a.pins } : g)) };
    case "setFallback":
      return { ...s, fallback: { ...s.fallback, ...a.patch } };
    case "applyPatch":
      return { ...s, ...a.patch };
    case "setRawJson": {
      if (s.mode !== "json") return s;
      const read = readRaw({ ...s, rawJson: a.text });
      return { ...s, rawJson: a.text, ...("value" in read && { lastGood: read.value as Descriptor }) };
    }
    case "switchMode": {
      if (a.mode === s.mode) return s;
      if (a.mode === "json") {
        const d = compose(s);
        return { ...s, mode: "json", rawJson: JSON.stringify(d, null, 2), lastGood: d };
      }
      const read = readRaw(s);
      if ("issue" in read) return { ...s, issue: read.issue };
      const structural = validateDescriptor(read.value).diagnostics.find((x) => STRUCTURAL_CODES.has(x.code));
      if (structural) return { ...s, issue: structural };
      return { ...draftFromDescriptor(read.value as Descriptor), baseKey: s.baseKey, testFiles: s.testFiles, template: s.template };
    }
  }
}

export function reduceDraft(s: PartDraft, a: DraftAction): PartDraft {
  if (a.type === "reset") return a.draft;
  const next = apply({ ...s, issue: undefined, lastCascade: undefined }, a);
  return next.issue ? { ...next } : { ...next, dirty: true };
}
