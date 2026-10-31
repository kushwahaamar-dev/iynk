import { LIMITS } from "../../core/limits.ts";
import { rng } from "../../core/prng.ts";
import type { Rng } from "../../core/prng.ts";
import type { RejectCode } from "../apply/index.ts";
import { allEntityIds } from "../apply/types.ts";
import type {
  Component,
  ComponentDependency,
  Fault,
  Net,
  Op,
  PinRef,
  Project,
  View,
  Wire,
} from "../generated/types.ts";
import { normalizeForWrite } from "../normalize.ts";
import type { ProjectSession } from "../session.ts";
import { newProject, ownerOf, seededRandom, session } from "./harness.ts";

export type OpFamily =
  | "component.add"
  | "component.remove"
  | "net.connect"
  | "net.disconnect"
  | "net.merge"
  | "net.split"
  | "view.place"
  | "wire.add"
  | "wire.remove"
  | "net.rename"
  | "source.edit"
  | "fault.set"
  | "component.set"
  | "test.set";

export const OP_FAMILIES: readonly OpFamily[] = [
  "component.add",
  "component.remove",
  "net.connect",
  "net.disconnect",
  "net.merge",
  "net.split",
  "view.place",
  "wire.add",
  "wire.remove",
  "net.rename",
  "source.edit",
  "fault.set",
  "component.set",
  "test.set",
];

export const DEFAULT_MIX: Record<OpFamily, number> = {
  "component.add": 14,
  "component.remove": 4,
  "net.connect": 20,
  "net.disconnect": 6,
  "net.merge": 4,
  "net.split": 4,
  "view.place": 12,
  "wire.add": 10,
  "wire.remove": 4,
  "net.rename": 5,
  "source.edit": 5,
  "fault.set": 4,
  "component.set": 6,
  "test.set": 2,
};

type Interface = ComponentDependency["interface"];

const pins = (type: "passive" | "digital_io" | "ground" | "power_out", ...ids: string[]): Interface["pins"] =>
  ids.map((id) => ({ id, designator: id, type }));

const BOARD: Interface = {
  role: "board",
  pins: [...pins("digital_io", "D2", "D3", "D4", "D5", "D6", "D7"), ...pins("ground", "GND"), ...pins("power_out", "V5")],
  params: [],
};

const RESISTOR: ComponentDependency = {
  ref: "core.resistor",
  version: "1.0.0",
  origin: "builtin",
  interface: {
    role: "part",
    pins: pins("passive", "P1", "P2"),
    params: [{ id: "ohms", type: "number", default: 220, min: 0.001, max: 1_000_000_000, unit: "ohm" }],
  },
};

const LED_COLORS: [string, ...string[]] = ["red", "yellow", "green", "blue", "white"];

const LED: ComponentDependency = {
  ref: "core.led-5mm",
  version: "1.0.0",
  origin: "builtin",
  interface: {
    role: "part",
    pins: pins("passive", "A", "K"),
    params: [{ id: "color", type: "enum", default: "red", values: LED_COLORS }],
  },
};

interface PartKind {
  dependency: ComponentDependency;
  refdesPrefix: string;
  params: (r: Rng) => Record<string, string | number>;
}

const below = (r: Rng, n: number): number => r.next() % n;
const pick = <T>(r: Rng, items: readonly T[]): T => items[below(r, items.length)]!;

const RESISTORS: PartKind = {
  dependency: RESISTOR,
  refdesPrefix: "R",
  params: (r) => ({ ohms: 100 * (1 + below(r, 100)) }),
};
const LEDS: PartKind = { dependency: LED, refdesPrefix: "D", params: (r) => ({ color: pick(r, LED_COLORS) }) };

const SNIPPET_CHARS = [..."abcdefgh ;(){}\n"];
const AT = "2026-10-28T12:00:00.000Z";
const BLINK = "void setup() {\n  pinMode(12, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(12, HIGH);\n  delay(500);\n}\n";

const pinKey = (ref: PinRef): string => `${ref.c}/${ref.p}`;

function withParts(project: Project, components: Component[], parts: ComponentDependency[]): Project {
  return {
    ...project,
    components,
    dependencies: {
      ...project.dependencies,
      components: [...project.dependencies.components, ...parts].sort((a, b) => (a.ref < b.ref ? -1 : 1)),
    },
  };
}

function blank(seed: number): Project {
  return newProject({ title: `Generated ${seed}`, board: BOARD, blink: BLINK, seed, at: AT, rnd: seededRandom(seed) });
}

/** The project every generated session starts from: the board and four parts, no nets. */
export function startProject(seed: number): Project {
  const part = (id: string, refdes: string, kind: PartKind, params: Component["params"]): Component => ({
    id,
    definition: { ref: kind.dependency.ref, version: kind.dependency.version },
    refdes,
    params,
  });
  const components = [
    part("cmp_d1", "D1", LEDS, { color: "red" }),
    part("cmp_r1", "R1", RESISTORS, { ohms: 220 }),
    part("cmp_r2", "R2", RESISTORS, { ohms: 1000 }),
    part("cmp_r3", "R3", RESISTORS, { ohms: 4700 }),
  ];
  return withParts(blank(seed), components, [LED, RESISTOR]);
}

interface Instance {
  id: string;
  pins: string[];
}

function instancesOf(state: Project): Instance[] {
  const pinsOf = (definition: { ref: string; version: string }): string[] =>
    state.dependencies.components
      .find((dep) => dep.ref === definition.ref && dep.version === definition.version)
      ?.interface.pins.map((p) => p.id) ?? [];
  return [...state.boards, ...state.components].map((entity) => ({
    id: entity.id,
    pins: pinsOf(entity.definition),
  }));
}

/** Every `(instance, pin)` that is in no net, and the net each connected pin is in. */
function pinMap(state: Project, instances: readonly Instance[]) {
  const netOf = new Map<string, Net>();
  for (const net of state.nets) for (const ref of net.connections) netOf.set(pinKey(ref), net);
  const free: PinRef[] = [];
  const all: PinRef[] = [];
  for (const instance of instances) {
    for (const p of instance.pins) {
      const ref = { c: instance.id, p };
      all.push(ref);
      if (!netOf.has(pinKey(ref))) free.push(ref);
    }
  }
  return { netOf, free, all };
}

class Fresh {
  private readonly taken: Set<string>;
  private readonly names: Set<string>;
  private readonly refdes: Set<string>;
  private readonly count: number;
  private readonly r: Rng;

  constructor(state: Project, r: Rng) {
    this.r = r;
    this.count = state.components.length;
    this.taken = allEntityIds(state);
    this.names = new Set(state.nets.flatMap((net) => (net.name === undefined ? [] : [net.name])));
    this.refdes = new Set([...state.boards, ...state.components].map((entity) => entity.refdes));
  }

  id<P extends string>(prefix: P): `${P}_${string}` {
    for (;;) {
      const id = `${prefix}_${this.r.next().toString(36)}` as const;
      if (!this.taken.has(id)) {
        this.taken.add(id);
        return id;
      }
    }
  }

  netName(): string {
    for (;;) {
      const name = `n${this.r.next().toString(36)}`;
      if (!this.names.has(name)) {
        this.names.add(name);
        return name;
      }
    }
  }

  refdesFor(prefix: string): string {
    for (let n = this.count + 1; ; n++) {
      if (!this.refdes.has(prefix + n)) {
        this.refdes.add(prefix + n);
        return prefix + n;
      }
    }
  }
}

interface Ctx {
  state: Project;
  r: Rng;
  fresh: Fresh;
  instances: Instance[];
  pins: ReturnType<typeof pinMap>;
  view: View;
}

type Builder = (c: Ctx) => Op | null;

const BUILDERS: Record<OpFamily, Builder> = {
  "component.add": ({ state, r, fresh }) => {
    if (state.components.length >= LIMITS.components) return null;
    const pinned = [RESISTORS, LEDS].filter((kind) =>
      state.dependencies.components.some((dep) => dep.ref === kind.dependency.ref),
    );
    if (pinned.length === 0) return null;
    const kind = pick(r, pinned);
    const component: Component = {
      id: fresh.id("cmp"),
      definition: { ref: kind.dependency.ref, version: kind.dependency.version },
      refdes: fresh.refdesFor(kind.refdesPrefix),
      params: kind.params(r),
    };
    return { k: "component.add", component };
  },

  "component.remove": ({ state, r }) =>
    state.components.length === 0 ? null : { k: "component.remove", id: pick(r, state.components).id },

  "net.connect": ({ state, r, fresh, pins: { netOf, free, all } }) => {
    if (state.nets.length === 0 || (free.length >= 2 && below(r, 3) === 0)) {
      if (free.length < 2) return null;
      const first = pick(r, free);
      const second = pick(r, free.filter((ref) => ref.c !== first.c || ref.p !== first.p));
      return { k: "net.create", net: { id: fresh.id("net"), connections: [first, second] } };
    }
    const net = pick(r, state.nets);
    const candidates = all.filter((ref) => netOf.get(pinKey(ref)) !== net);
    if (candidates.length === 0) return null;
    const pin = pick(r, candidates);
    return { k: "net.connect", net: net.id, pin, move: netOf.has(pinKey(pin)) };
  },

  "net.disconnect": ({ state, r }) => {
    if (state.nets.length === 0) return null;
    return { k: "net.disconnect", pin: pick(r, pick(r, state.nets).connections) };
  },

  "net.merge": ({ state, r }) => {
    if (state.nets.length < 2) return null;
    const into = pick(r, state.nets);
    return { k: "net.merge", into: into.id, from: pick(r, state.nets.filter((net) => net !== into)).id };
  },

  "net.split": ({ state, r, fresh }) => {
    const wide = state.nets.filter((net) => net.connections.length >= 2);
    if (wide.length === 0) return null;
    const net = pick(r, wide);
    const moving = net.connections.filter((_, i) => i === 0 || below(r, 2) === 0).slice(0, net.connections.length - 1);
    return { k: "net.split", net: net.id, into: fresh.id("net"), pins: moving as [PinRef, ...PinRef[]] };
  },

  "view.place": ({ r, instances, view }) => {
    const instance = pick(r, instances);
    return {
      k: "view.place",
      view: view.id,
      placement: {
        c: instance.id,
        x_mm: below(r, 400) - 200,
        y_mm: below(r, 400) - 200,
        rotation_deg: 90 * below(r, 4),
      },
    };
  },

  "wire.add": ({ state, r, fresh, view }) => {
    const wide = state.nets.filter((net) => net.connections.length >= 2);
    if (wide.length === 0) return null;
    const net = pick(r, wide);
    const from = pick(r, net.connections);
    const to = pick(r, net.connections.filter((ref) => ref !== from));
    const wire: Wire = {
      id: fresh.id("wir"),
      net: net.id,
      from: { kind: "pin", c: from.c, p: from.p },
      to: { kind: "pin", c: to.c, p: to.p },
    };
    return { k: "wire.add", view: view.id, wire };
  },

  "wire.remove": ({ r, view }) =>
    view.wires.length === 0 ? null : { k: "wire.remove", view: view.id, id: pick(r, view.wires).id },

  "net.rename": ({ state, r, fresh }) =>
    state.nets.length === 0 ? null : { k: "net.rename", id: pick(r, state.nets).id, name: fresh.netName() },

  "source.edit": ({ state, r }) => {
    const source = pick(r, state.sources);
    const pos = below(r, source.content.length + 1);
    const del = below(r, Math.min(6, source.content.length - pos + 1));
    const ins = Array.from({ length: 1 + below(r, 8) }, () => pick(r, SNIPPET_CHARS)).join("");
    return { k: "source.edit", id: source.id, baseSeq: state.revision, pos, del, ins };
  },

  "fault.set": ({ state, r, fresh }) => {
    const faults = state.simulation.faults;
    if (faults.length > 0 && (faults.length >= LIMITS.faults || below(r, 3) === 0)) {
      const fault = pick(r, faults);
      return { k: "fault.set", fault: { ...fault, enabled: !fault.enabled } };
    }
    if (state.components.length === 0) return null;
    const fault: Fault = {
      id: fresh.id("flt"),
      cause_id: "gen-cause",
      symptom_ids: [],
      kind: "missing-part",
      target: { component: pick(r, state.components).id },
      enabled: below(r, 2) === 0,
    };
    return { k: "fault.set", fault };
  },

  "component.set": ({ state, r }) => {
    if (state.components.length === 0) return null;
    const component = pick(r, state.components);
    if (below(r, 3) === 0) return { k: "component.set", id: component.id, set: { label: `part ${below(r, 1000)}` } };
    const params = component.definition.ref === RESISTOR.ref ? RESISTORS.params(r) : LEDS.params(r);
    return { k: "component.set", id: component.id, params };
  },

  "test.set": ({ r }) => ({
    k: "test.set",
    test: {
      id: `t${below(r, 8)}`,
      name: `Runs for ${100 * (1 + below(r, 20))} ms`,
      runMs: 1000,
      checks: [{ kind: "runs", id: "c1", label: "Keeps running", minMs: 100 * (1 + below(r, 9)) }],
    },
  }),
};

/**
 * An op that looks valid for `state`, or null when the chosen family has nothing to act on. `mix` gives family
 * weights and replaces the defaults, so `{ "wire.add": 1 }` draws wires only. Draws only from `r`.
 */
export function generateOp(state: Project, r: Rng, mix?: Partial<Record<OpFamily, number>>): Op | null {
  const weights = mix ?? DEFAULT_MIX;
  const families = OP_FAMILIES.filter((family) => (weights[family] ?? 0) > 0);
  const total = families.reduce((sum, family) => sum + weights[family]!, 0);
  if (total === 0) return null;

  let ticket = below(r, total);
  const family = families.find((f) => (ticket -= weights[f]!) < 0)!;

  const instances = instancesOf(state);
  const view = state.views[0];
  if (!view) return null;
  return BUILDERS[family]({ state, r, fresh: new Fresh(state, r), instances, pins: pinMap(state, instances), view });
}

export interface GeneratedSession {
  start: Project;
  /** The ops the session accepted, in order. */
  ops: Op[];
  /** The session that ran them, with its log in `state.history.ops`. */
  live: ProjectSession;
  /** How often each reject code came back for ops the generator proposed. */
  rejects: Partial<Record<RejectCode, number>>;
  /** Steps where the chosen family had nothing to act on. */
  skipped: number;
}

/** Proposes `steps` ops to a fresh session and keeps the ones it accepts. Same seed, same session. */
export function generateSession(seed: number, steps: number, mix?: Partial<Record<OpFamily, number>>): GeneratedSession {
  const start = startProject(seed);
  const live = session(start, seed, steps);
  const author = ownerOf(start);
  const r = rng(seed, "ops");
  const result: GeneratedSession = { start, ops: [], live, rejects: {}, skipped: 0 };
  for (let i = 0; i < steps; i++) {
    const op = generateOp(live.state, r, mix);
    if (!op) {
      result.skipped++;
      continue;
    }
    const outcome = live.apply(op, author);
    if (outcome.ok) result.ops.push(op);
    else result.rejects[outcome.reject] = (result.rejects[outcome.reject] ?? 0) + 1;
  }
  return result;
}

const padded = (n: number, width: number): string => String(n).padStart(width, "0");

/**
 * A large project for cost runs: `parts` resistors, their pins paired at random into named two-pin nets, and a
 * breadboard view with every part placed and `wires` drawn wires spread over the nets (a net with a second wire gets
 * a parallel one). Ids are zero-padded so they sort the way the document keeps its sets.
 */
export function bigProject(parts: number, wires: number, seed: number): Project {
  const r = rng(seed, "big");
  const width = String(Math.max(parts, wires)).length;
  const components: Component[] = Array.from({ length: parts }, (_, i) => ({
    id: `cmp_r${padded(i, width)}`,
    definition: { ref: RESISTOR.ref, version: RESISTOR.version },
    refdes: `R${i + 1}`,
    params: { ohms: 100 * (1 + below(r, 100)) },
  }));

  const ends: PinRef[] = components.flatMap((c) => [
    { c: c.id, p: "P1" },
    { c: c.id, p: "P2" },
  ]);
  for (let i = ends.length - 1; i > 0; i--) {
    const j = below(r, i + 1);
    [ends[i], ends[j]] = [ends[j]!, ends[i]!];
  }
  const nets: Net[] = [];
  for (let i = 0; i + 1 < ends.length; i += 2) {
    const pair = [ends[i]!, ends[i + 1]!].sort((a, b) => (pinKey(a) < pinKey(b) ? -1 : 1));
    nets.push({ id: `net_n${padded(i / 2, width)}`, name: `N${i / 2}`, connections: pair as Net["connections"] });
  }

  const drawn: Wire[] = [];
  for (let i = 0; nets.length > 0 && i < wires; i++) {
    const net = nets[i % nets.length]!;
    const [from, to] = net.connections;
    drawn.push({
      id: `wir_w${padded(i, width)}`,
      net: net.id,
      from: { kind: "pin", c: from.c, p: from.p },
      to: { kind: "pin", c: to!.c, p: to!.p },
    });
  }

  const base = withParts(blank(seed), components, [RESISTOR]);
  const view: View = {
    id: "vw_main",
    kind: "breadboard",
    name: "Breadboard",
    placements: components.map((c, i) => ({ c: c.id, x_mm: (i % 25) * 20, y_mm: Math.floor(i / 25) * 20 })),
    wires: drawn,
  };
  return normalizeForWrite({ ...base, nets, views: [view] });
}
