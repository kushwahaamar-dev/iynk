import type { SimTime } from "../core/clock.ts";
import { type SimDiagnostic, simDiag } from "../core/diagnostic.ts";
import { RANK, type EngineSnapshot, type SimEvent, type SimNetlist, type SimPart } from "../engine.ts";
import type { PinElectrical } from "../../lib/interp/profiles.ts";
import { PWL_COMPAT } from "./elements.ts";
import type { Registry } from "../registry/types.ts";
import { UnionFind } from "./graph.ts";
import { type Brownout, type BoardPower, type RailState, createBrownout, droopSource, isLimited, USB_LIMIT } from "./rails.ts";
import { pwmSlices, solve } from "./solve.ts";
import {
  type HonestState,
  type Solved,
  type StateTracker,
  brownOutState,
  brownOutUnknownState,
  createStateTracker,
  floatingInputState,
  noConvergenceState,
  notModelledState,
  partOf,
} from "./states.ts";
import type { Element, ElementId, ElementPin, PartRating, SolveOptions, SolveResult, SourceLimit } from "./types.ts";

export type NetId = string;
export type PartId = string;

/** A board pin's electrical model plus the supply its thresholds are fractions of. */
export interface BoardPin extends PinElectrical {
  logicVolts: number;
}

/** null: the part is not a board. Built from `pinElectrical(profile)` and `profile.logicV`. */
export type PinDirectory = (part: SimPart) => BoardPin | null;

export type Change =
  | { kind: "pin"; element: ElementId; level: 0 | 1 | "Z" }
  | { kind: "pwm"; element: ElementId; duty: number; hz: number }
  | { kind: "source"; element: ElementId; volts: number }
  | { kind: "switch"; element: ElementId; closed: boolean }
  | { kind: "param"; element: ElementId; path: string; value: number }
  | { kind: "motor-speed"; element: ElementId; omegaRadPerS: number };

export interface AnalogStepResult {
  at: SimTime;
  converged: boolean;
  solves: number;
  skippedClean: number;
  events: SimEvent[];
  diagnostics: SimDiagnostic[];
  worstKclAmps: number;
}

export interface LoadReport {
  ok: boolean;
  components: number;
  nodes: number;
  elements: number;
  unmodelled: { part: PartId; reason: string }[];
  diagnostics: SimDiagnostic[];
  modelIds: string[];
}

/** SIMULATION 7.2. */
export interface AnalogSolver {
  load(net: SimNetlist, o: SolveOptions): LoadReport;
  apply(changes: Change[]): void;
  advanceTo(t: SimTime): AnalogStepResult;
  snapshot(): EngineSnapshot;
  restore(s: EngineSnapshot): void;
}

export interface WhatIf {
  extra?: Element[];
  sources?: "live" | "off";
  params?: Record<ElementId, Partial<Element>>;
}

export interface LiveAnalog extends AnalogSolver {
  netVolts(net: NetId): number | null;
  pinVolts(element: ElementId): number | null;
  /** The node a net has in a `whatIf` result, or null for an unknown net. */
  nodeIndex(net: NetId): number | null;
  componentResult(net: NetId): SolveResult | null;
  /** Clears the burnt latch of a part and puts its elements back. */
  repair(partId: PartId): void;
  /** A pure re-solve of the whole circuit. Node numbers in `extra` and `params` are the ones `buildElements` gave. */
  whatIf(o: WhatIf): SolveResult;
}

const MODEL = {
  resistor: "model:resistor.linear@1",
  led: "model:led.pwl@1",
  diode: "model:diode.pwl@1",
  npn: "model:npn.pwl@1",
  source: "model:source.thevenin@1",
  button: "model:button.switch@1",
  pot: "model:pot.linear@1",
  motor: "model:motor.steady@1",
  servo: "model:servo.rule@1",
  coil: "model:stepper-coil.resistive@1",
  buzzer: "model:buzzer.rule@1",
  tmp36: "model:tmp36.rule@1",
} as const;

const ENGINE_ID = "engine:analog-live";
const GROUND = 0;
const JOIN_OHMS = 1e-3;
const OPEN_OHMS = 1e12;
const USB_VOLTS = 5;
const LED_VF: Record<string, number> = { red: 2.0, yellow: 2.1, green: 2.2, blue: 3.0, white: 3.1 };
const RGB_CHANNELS = [["R", 0, 2.0], ["G", 2, 3.1], ["B", 3, 3.1]] as const;
const TRAFFIC_LEDS = [["R", 1, LED_VF.red], ["Y", 2, LED_VF.yellow], ["G", 3, LED_VF.green]] as const;
const BJT_ORDER: Record<string, { c: number; b: number; e: number }> = { EBC: { e: 0, b: 1, c: 2 }, CBE: { c: 0, b: 1, e: 2 } };

/** The 5 V pin is the USB port's, which sags past its current limit. */
const RAIL_VOLTS: [RegExp, number, SourceLimit?][] = [[/^P?5V$/, 5, USB_LIMIT], [/^P?3V3$/, 3.3], [/^VIN$/, USB_VOLTS]];
const NOT_SIGNAL = /^(GND\w*|POWER_\d+|NC|IOREF|AREF|RESET\d?|ICSP\w*|MISO2|MOSI2|SCK2|VBUS|EN)$/;

const NODE_FIELDS = {
  R: ["a", "b"], M: ["a", "b"], V: ["a", "b"], D: ["a", "b"], BZ: ["a", "b"],
  POT: ["a", "wiper", "b"], PIN: ["a"], PWM: ["a"], Q: ["c", "b", "e"],
  SV: ["gnd", "vplus", "sig"], TS: ["supplyPos", "supplyNeg", "out"],
} as const satisfies Record<Element["kind"], readonly string[]>;

type NodeFields = Record<string, number>;

const nodesOf = (el: Element): number[] => NODE_FIELDS[el.kind].map((f) => (el as unknown as NodeFields)[f]);

function mapNodes(el: Element, f: (node: number) => number): Element {
  const copy = { ...el } as unknown as NodeFields;
  for (const field of NODE_FIELDS[el.kind]) copy[field] = f(copy[field]);
  return copy as unknown as Element;
}

const num = (p: SimPart, key: string, fallback: number): number => {
  const v = p.params[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
};

const text = (p: SimPart, key: string, fallback: string): string => {
  const v = p.params[key];
  return typeof v === "string" ? v : fallback;
};

class Builder {
  readonly elements: Element[] = [];
  readonly nodeOf = new Map<NetId, number>();
  nodes: number;

  constructor(net: SimNetlist) {
    this.nodeOf.set(net.ground, GROUND);
    this.nodes = 1;
    for (const n of net.nets) if (!this.nodeOf.has(n.id)) this.nodeOf.set(n.id, this.nodes++);
  }

  /** The node on the part's pin by position, or a private node when the pin is unconnected. */
  leg(part: SimPart, index: number): number {
    const net = Object.values(part.pins)[index];
    return (net == null ? undefined : this.nodeOf.get(net)) ?? this.nodes++;
  }

  named(part: SimPart, pin: string): number {
    const net = part.pins[pin];
    return (net == null ? undefined : this.nodeOf.get(net)) ?? this.nodes++;
  }

  add(el: Element): void {
    this.elements.push(el);
  }

  resistor(id: ElementId, a: number, b: number, ohms: number): void {
    this.add({ id, kind: "R", a, b, ohms });
  }

  led(id: ElementId, a: number, b: number, vf: number, maxAmps: number): void {
    this.add({ id, kind: "D", a, b, modelId: MODEL.led, vf, rdOhms: 0.5, maxAmps });
  }

  npn(id: ElementId, c: number, base: number, e: number, hfe: number, vbe: number, vcesat: number, rating: PartRating): void {
    this.add({ id, kind: "Q", c, b: base, e, polarity: "npn", modelId: MODEL.npn, hfe, hfr: 5, vbe, vcesat, rating });
  }
}

interface PartSpec {
  models: readonly string[];
  /** Adds the part's elements, or returns why it cannot be modelled and adds none. */
  build?: (b: Builder, p: SimPart) => string | void;
}

const noElement: PartSpec = { models: [] };

const sensorResistor: PartSpec = {
  models: [MODEL.resistor],
  build: (b, p) => {
    const ohms = p.params.ohms;
    if (typeof ohms !== "number") return "the part has no resistance value yet";
    b.resistor(p.id, b.leg(p, 0), b.leg(p, 1), ohms);
  },
};

const supply = (volts: number): PartSpec => ({
  models: [MODEL.source],
  build: (b, p) => b.add({ id: p.id, kind: "V", a: b.leg(p, 0), b: b.leg(p, 1), volts: num(p, "volts", volts), rSeriesOhms: PWL_COMPAT.railOhms }),
});

const motor = (ohms: number): PartSpec => ({
  models: [MODEL.motor],
  build: (b, p) => b.add({ id: p.id, kind: "M", a: b.leg(p, 0), b: b.leg(p, 1), ohms: num(p, "ohms", ohms) }),
});

function transistor(
  models: readonly string[],
  hfe: number,
  vbe: number,
  vcesat: number,
  rating: PartRating,
  order: (p: SimPart) => { c: number; b: number; e: number },
): PartSpec {
  return {
    models,
    build: (b, p) => {
      const at = order(p);
      b.npn(p.id, b.leg(p, at.c), b.leg(p, at.b), b.leg(p, at.e), hfe, vbe, vcesat, rating);
    },
  };
}

const flip = (p: SimPart, i: number): number => (p.params.reversed === true ? 2 - i : i);

const SPECS: Record<string, PartSpec> = {
  resistor: { models: [MODEL.resistor], build: (b, p) => b.resistor(p.id, b.leg(p, 0), b.leg(p, 1), num(p, "ohms", 220)) },
  wire: noElement,
  breadboard: noElement,
  led: {
    models: [MODEL.led],
    build: (b, p) => b.led(p.id, b.leg(p, 0), b.leg(p, 1), num(p, "vf", LED_VF[text(p, "color", "red")] ?? LED_VF.red), num(p, "imax", 0.02)),
  },
  "rgb-led": {
    models: [MODEL.led],
    build: (b, p) => {
      const common = b.leg(p, 1);
      const anode = text(p, "common", "cathode") === "anode";
      for (const [channel, leg, vf] of RGB_CHANNELS) {
        const lead = b.leg(p, leg);
        b.led(`${p.id}:${channel}`, anode ? common : lead, anode ? lead : common, vf, 0.02);
      }
    },
  },
  "traffic-light": {
    models: [MODEL.led],
    build: (b, p) => {
      const ground = b.leg(p, 0);
      for (const [channel, leg, vf] of TRAFFIC_LEDS) b.led(`${p.id}:${channel}`, b.leg(p, leg), ground, vf, 0.02);
    },
  },
  "diode-1n4007": {
    models: [MODEL.diode],
    build: (b, p) => b.add({ id: p.id, kind: "D", a: b.leg(p, 0), b: b.leg(p, 1), modelId: MODEL.diode, vf: 0.7, rdOhms: 0.2, maxAmps: 1 }),
  },
  "npn-2n2222": transistor([MODEL.npn], 100, 0.7, 0.2, { icmaxAmps: 0.6, thetaCPerW: 200, tjmaxC: 150 }, (p) => {
    const order = BJT_ORDER[text(p, "pinout", "EBC")] ?? BJT_ORDER.EBC;
    return { c: flip(p, order.c), b: flip(p, order.b), e: flip(p, order.e) };
  }),
  tip120: transistor([MODEL.npn], 1000, 1.3, 0.9, { icmaxAmps: 5, thetaCPerW: 62.5, tjmaxC: 150 }, (p) => ({ b: flip(p, 0), c: 1, e: flip(p, 2) })),
  "lipo-2s": supply(7.4),
  "aa-holder-4": supply(6),
  "push-button": {
    models: [MODEL.button],
    build: (b, p) => {
      const [a1, a2, b1, b2] = [0, 1, 2, 3].map((i) => b.leg(p, i));
      b.resistor(`${p.id}:1-2`, a1, a2, JOIN_OHMS);
      b.resistor(`${p.id}:3-4`, b1, b2, JOIN_OHMS);
      b.resistor(p.id, a1, b1, num(p, "pressed", 0) > 0 ? JOIN_OHMS : OPEN_OHMS);
    },
  },
  potentiometer: {
    models: [MODEL.pot],
    build: (b, p) =>
      b.add({ id: p.id, kind: "POT", a: b.leg(p, 0), wiper: b.leg(p, 1), b: b.leg(p, 2), ohms: num(p, "ohms", 10000), position: num(p, "pos", 0.5), rating: { pmaxWatts: 0.05 } }),
  },
  ldr: sensorResistor,
  fsr402: sensorResistor,
  "soil-moisture": sensorResistor,
  "dc-motor": motor(1.43),
  "tt-motor": motor(4),
  fan: motor(50),
  nema17: {
    models: [MODEL.motor],
    build: (b, p) => {
      const ohms = num(p, "ohms", 1.65);
      b.add({ id: `${p.id}:A`, kind: "M", a: b.leg(p, 0), b: b.leg(p, 1), ohms });
      b.add({ id: `${p.id}:B`, kind: "M", a: b.leg(p, 2), b: b.leg(p, 3), ohms });
    },
  },
  "servo-sg90": {
    models: [MODEL.servo],
    build: (b, p) => b.add({ id: p.id, kind: "SV", gnd: b.leg(p, 0), vplus: b.leg(p, 1), sig: b.leg(p, 2) }),
  },
  "stepper-28byj48": {
    models: [MODEL.coil],
    build: (b, p) => {
      const common = b.leg(p, 4);
      const ohms = num(p, "ohms", 50);
      for (const [i, coil] of ["B", "P", "Y", "O"].entries()) b.resistor(`${p.id}:${coil}`, common, b.leg(p, i), ohms);
    },
  },
  uln2003: {
    models: [MODEL.npn],
    build: (b, p) => {
      const ground = b.leg(p, 4);
      const vcc = b.leg(p, 5);
      for (const n of [1, 2, 3, 4]) {
        const base = b.nodes++;
        const out = b.named(p, `OUT${n}`);
        b.resistor(`${p.id}:R${n}`, b.leg(p, n - 1), base, 2700);
        b.npn(`${p.id}:Q${n}`, out, base, ground, 1000, 1.4, 1, { icmaxAmps: 0.5, thetaCPerW: 70, tjmaxC: 150 });
        b.add({ id: `${p.id}:D${n}`, kind: "D", a: out, b: vcc, modelId: MODEL.diode, vf: 0.7, rdOhms: 0.2, maxAmps: 0.5 });
      }
    },
  },
  "piezo-buzzer": {
    models: [MODEL.buzzer],
    build: (b, p) =>
      b.add({ id: p.id, kind: "BZ", a: b.leg(p, 0), b: b.leg(p, 1), active: text(p, "kind", "passive") === "active", vf: 0.05, rdOhms: 3 / 0.03 }),
  },
  tmp36: {
    models: [MODEL.tmp36],
    build: (b, p) =>
      b.add({ id: p.id, kind: "TS", supplyPos: b.leg(p, 0), out: b.leg(p, 1), supplyNeg: b.leg(p, 2), outVolts: 0.5 + 0.01 * num(p, "tempC", 22), rating: { vabsVolts: 7 } }),
  },
  "hc-sr04": noElement,
  mpu6050: noElement,
  ssd1306: noElement,
  multimeter: noElement,
};

/** Descriptors converted to B2 carry their own name; the catalogue file they replaced is the key of `SPECS`. */
const CATALOGUE_NAME: Record<string, string> = {
  "led-5mm": "led",
  "potentiometer-10k": "potentiometer",
  "push-button-6mm": "push-button",
  "buzzer-piezo": "piezo-buzzer",
};

function catalogueName(descriptorId: string): string {
  const name = descriptorId.replace(/^(part:|core\.)/, "").replace(/@.*$/, "");
  return CATALOGUE_NAME[name] ?? name;
}

/** Descriptor (catalogue file name) to registry model ids. */
export const MODEL_TABLE: Readonly<Record<string, readonly string[]>> = Object.fromEntries(Object.entries(SPECS).map(([name, spec]) => [name, spec.models]));

export function modelIdsOf(descriptorId: string): readonly string[] {
  return MODEL_TABLE[catalogueName(descriptorId)] ?? [];
}

export function pinElementId(boardPartId: string, pinName: string): ElementId {
  return `pin:${boardPartId}:${pinName}`;
}

export interface BoardInput {
  net: NetId;
  vilVolts: number;
  vihVolts: number;
}

export interface BuiltElements {
  elements: Element[];
  nodeOf: ReadonlyMap<NetId, number>;
  nodes: number;
  unmodelled: LoadReport["unmodelled"];
  modelIds: string[];
  /** Every PIN element, by id. */
  boardPins: ReadonlyMap<ElementId, BoardInput>;
}

export function buildElements(net: SimNetlist, pins: PinDirectory): BuiltElements {
  const b = new Builder(net);
  const unmodelled: LoadReport["unmodelled"] = [];
  const modelIds = new Set<string>();
  const boardPins = new Map<ElementId, BoardInput>();

  for (const part of net.parts) {
    const board = pins(part);
    if (board) {
      modelIds.add(MODEL.source);
      for (const [pin, netId] of Object.entries(part.pins)) {
        const node = netId == null ? undefined : b.nodeOf.get(netId);
        if (netId == null || node === undefined || node === GROUND) continue;
        const rail = RAIL_VOLTS.find(([pattern]) => pattern.test(pin));
        if (rail) {
          b.add({
            id: `rail:${part.id}:${pin}`,
            kind: "V",
            a: node,
            b: GROUND,
            volts: rail[1],
            rSeriesOhms: PWL_COMPAT.railOhms,
            ...(rail[2] ? { limit: rail[2] } : {}),
          });
        } else if (!NOT_SIGNAL.test(pin)) {
          const id = pinElementId(part.id, pin);
          b.add({ id, kind: "PIN", a: node, level: "Z", vHighVolts: board.logicVolts, rOutOhms: board.rOutOhms, maxAmps: board.maxAmps });
          boardPins.set(id, { net: netId, vilVolts: board.vilFrac * board.logicVolts, vihVolts: board.vihFrac * board.logicVolts });
        }
      }
      continue;
    }
    const spec = SPECS[catalogueName(part.descriptor)];
    if (!spec) {
      unmodelled.push({ part: part.id, reason: `no analog model for ${part.descriptor}` });
      continue;
    }
    const before = b.elements.length;
    const why = spec.build?.(b, part);
    if (why) {
      b.elements.length = before;
      unmodelled.push({ part: part.id, reason: why });
    } else {
      for (const id of spec.models) modelIds.add(id);
    }
  }
  return { elements: b.elements, nodeOf: b.nodeOf, nodes: b.nodes, unmodelled, modelIds: [...modelIds].sort(), boardPins };
}

interface Component {
  /** Global node of each local node 1..n; local node 0 is ground. */
  nodes: number[];
  elements: Element[];
  dirty: boolean;
  ok: boolean;
  last: SolveResult | null;
}

interface ComponentData {
  elements: Element[];
  dirty: boolean;
  ok: boolean;
  last: (Omit<SolveResult, "v"> & { v: number[] }) | null;
}

const freeze = ({ v, ...rest }: SolveResult): ComponentData["last"] => ({ ...rest, v: Array.from(v) });
const thaw = ({ v, ...rest }: NonNullable<ComponentData["last"]>): SolveResult => ({ ...rest, v: Float64Array.from(v) });

interface SnapshotData {
  at: SimTime;
  components: ComponentData[];
  held: [NetId, 0 | 1][];
  tracker: unknown;
  damaged: [ElementId, Element][];
  floating: ElementId[];
}

interface BoardRail {
  part: PartId;
  net: NetId;
  power: BoardPower;
  detector: Brownout;
  state: RailState;
}

export interface LiveDeps {
  solve: typeof solve;
  pins: PinDirectory;
  registry: Registry;
  /** null: the part is not a board. */
  power: (part: SimPart) => BoardPower | null;
}

/** What a latched part becomes in later solves; null when only the latch and the message apply. */
function openCircuit(el: Element): Element | null {
  if (el.kind === "D") return { id: el.id, kind: "R", a: el.a, b: el.b, ohms: OPEN_OHMS };
  if (el.kind === "Q") return { id: el.id, kind: "R", a: el.c, b: el.e, ohms: OPEN_OHMS };
  return null;
}

class Live implements LiveAnalog {
  private o: SolveOptions | null = null;
  private nodeOf: ReadonlyMap<NetId, number> = new Map();
  private netOf = new Map<number, NetId>();
  private nodeCount = 1;
  private boardPins: ReadonlyMap<ElementId, BoardInput> = new Map();
  private components: Component[] = [];
  private home = new Map<number, { comp: Component; local: number }>();
  private where = new Map<ElementId, { comp: Component; index: number }>();
  private pinBase = new Map<ElementId, ElementPin>();
  private held = new Map<NetId, 0 | 1>();
  private pending: SimDiagnostic[] = [];
  private queued: HonestState[] = [];
  private at: SimTime = 0;
  private tracker: StateTracker;
  private rails: BoardRail[] = [];
  private damaged = new Map<ElementId, Element>();
  private floating = new Set<ElementId>();

  private readonly d: LiveDeps;

  constructor(d: LiveDeps) {
    this.d = d;
    this.tracker = createStateTracker(d.registry);
  }

  load(net: SimNetlist, o: SolveOptions): LoadReport {
    const built = buildElements(net, this.d.pins);
    this.o = o;
    this.nodeOf = built.nodeOf;
    this.netOf = new Map([...built.nodeOf].map(([id, node]) => [node, id]));
    this.nodeCount = built.nodes;
    this.boardPins = built.boardPins;
    this.held = new Map();
    this.pending = [];
    this.at = 0;
    this.tracker = createStateTracker(this.d.registry);
    this.damaged = new Map();
    this.floating = new Set();
    this.partition(built.elements);
    this.queued = built.unmodelled.map((u) => notModelledState(u.part, u.reason, 0));
    this.rails = this.railsOf(net);

    const diagnostics = built.unmodelled.map((u) => simDiag("not-modelled-yet", "warning", { part: u.part }, { reason: u.reason }));
    return {
      ok: !diagnostics.some((x) => x.severity === "error"),
      components: this.components.length,
      nodes: net.nets.length,
      elements: built.elements.length,
      unmodelled: built.unmodelled,
      diagnostics,
      modelIds: built.modelIds,
    };
  }

  apply(changes: Change[]): void {
    for (const change of changes) this.applyOne(change);
  }

  advanceTo(t: SimTime): AnalogStepResult {
    const o = this.o;
    if (!o) throw new Error("LiveAnalog.advanceTo before load");
    const diagnostics = this.pending;
    this.pending = [];
    const states = this.queued;
    this.queued = [];
    let solves = 0;
    let worstKclAmps = 0;
    for (const comp of this.components) {
      if (!comp.dirty) continue;
      const result = this.solveComponent(comp, o);
      comp.dirty = false;
      if (!result.converged && comp.ok) states.push(noConvergenceState(this.d.registry, result, this.localNet(comp, result.residual.worstNode), t));
      comp.ok = result.converged;
      if (result.converged) comp.last = result;
      solves++;
      worstKclAmps = Math.max(worstKclAmps, result.residual.maxKclAmps || 0);
      diagnostics.push(...result.diagnostics.map((x) => this.globalDiag(x, comp)));
    }
    this.at = t;
    const events = this.crossings(t);
    const settled: Solved[] = this.components.flatMap((c) => (c.ok && c.last ? [{ result: c.last, elements: c.elements }] : []));
    states.push(...this.tracker.step(settled, t), ...this.floatingInputs(t));
    this.openBurnt(states);
    for (const rail of this.rails) this.stepRail(rail, t, states, events);
    for (const state of states) events.push({ at: t, phase: 3, rank: RANK.analog, seq: 0, src: ENGINE_ID, kind: "honest-state", payload: state });
    return {
      at: t,
      converged: this.components.every((c) => c.ok),
      solves,
      skippedClean: this.components.length - solves,
      events,
      diagnostics,
      worstKclAmps,
    };
  }

  repair(partId: PartId): void {
    this.tracker.repair(partId);
    for (const [id, original] of [...this.damaged]) {
      if (partOf(id) !== partId) continue;
      const at = this.where.get(id);
      if (at) {
        at.comp.elements[at.index] = original;
        at.comp.dirty = true;
      }
      this.damaged.delete(id);
    }
  }

  snapshot(): EngineSnapshot {
    const data: SnapshotData = {
      at: this.at,
      components: this.components.map((c) => ({
        elements: c.elements.map((el) => ({ ...el })),
        dirty: c.dirty,
        ok: c.ok,
        last: c.last && freeze(c.last),
      })),
      held: [...this.held],
      tracker: this.tracker.snapshot(),
      damaged: [...this.damaged].map(([id, el]) => [id, { ...el }]),
      floating: [...this.floating],
    };
    return { engine: ENGINE_ID, engineVersion: "1", schema: 1, data };
  }

  restore(s: EngineSnapshot): void {
    if (s.engine !== ENGINE_ID || s.schema !== 1) throw new RangeError(`not a ${ENGINE_ID} snapshot: ${s.engine} schema ${s.schema}`);
    const data = s.data as SnapshotData;
    if (data.components.length !== this.components.length) throw new RangeError("the snapshot is of a different circuit");
    this.at = data.at;
    this.held = new Map(data.held);
    this.pending = [];
    this.queued = [];
    this.tracker.restore(data.tracker);
    this.damaged = new Map(data.damaged.map(([id, el]) => [id, { ...el }]));
    this.floating = new Set(data.floating);
    this.rails = this.rails.map((r) => ({ ...r, detector: this.detectorOf(r.power), state: "ok" }));
    data.components.forEach((saved, i) => {
      const comp = this.components[i];
      comp.elements = saved.elements.map((el) => ({ ...el }));
      comp.dirty = saved.dirty;
      comp.ok = saved.ok;
      comp.last = saved.last && thaw(saved.last);
    });
    this.index();
  }

  netVolts(net: NetId): number | null {
    const node = this.nodeOf.get(net);
    if (node === undefined) return null;
    if (node === GROUND) return 0;
    const at = this.home.get(node);
    return at?.comp.ok && at.comp.last ? at.comp.last.v[at.local] : null;
  }

  pinVolts(element: ElementId): number | null {
    const input = this.boardPins.get(element);
    return input ? this.netVolts(input.net) : null;
  }

  nodeIndex(net: NetId): number | null {
    return this.nodeOf.get(net) ?? null;
  }

  componentResult(net: NetId): SolveResult | null {
    const node = this.nodeOf.get(net);
    return (node === undefined ? undefined : this.home.get(node)?.comp.last) ?? null;
  }

  whatIf(o: WhatIf): SolveResult {
    if (!this.o) throw new Error("LiveAnalog.whatIf before load");
    const off = o.sources === "off";
    const elements: Element[] = [];
    for (const comp of this.components) {
      for (const el of comp.elements) {
        const global = mapNodes(el, (n) => (n === GROUND ? GROUND : comp.nodes[n - 1]));
        if (off && global.kind === "PWM") continue;
        elements.push(off && global.kind === "PIN" ? { ...global, level: "Z" } : off && global.kind === "V" ? { ...global, volts: 0 } : global);
      }
    }
    const merged = [...elements, ...(o.extra ?? [])].map((el) => (o.params?.[el.id] ? ({ ...el, ...o.params[el.id] } as Element) : el));
    return this.d.solve({ nodes: this.nodeCount, ground: GROUND, elements: merged }, this.o);
  }

  private detectorOf(power: BoardPower): Brownout {
    return createBrownout({
      thresholdVolts: power.vccMinVolts ?? 0,
      hysteresisVolts: power.hysteresisVolts,
      minDwellNs: power.minDwellNs,
      resetNs: power.resetNs,
    });
  }

  /** One detector per board that states a minimum; a board that does not is said so once. */
  private railsOf(net: SimNetlist): BoardRail[] {
    const rails: BoardRail[] = [];
    for (const part of net.parts) {
      const power = this.d.power(part);
      if (!power) continue;
      const railNet = power.vccMinVolts === null ? null : part.pins[power.mcuRail];
      if (power.vccMinVolts === null) this.queued.push(brownOutUnknownState(part.id, 0));
      else if (railNet) rails.push({ part: part.id, net: railNet, power, detector: this.detectorOf(power), state: "ok" });
    }
    return rails;
  }

  private stepRail(rail: BoardRail, t: SimTime, states: HonestState[], events: SimEvent[]): void {
    const volts = this.netVolts(rail.net);
    if (volts === null) return;
    const next = rail.detector.step(volts, t);
    const entered = next === "reset" && rail.state !== "reset";
    rail.state = next;
    if (!entered) return;
    states.push(brownOutState(this.d.registry, rail.power, { net: rail.net, volts }, t));
    const payload = { part: rail.part, net: rail.net, volts };
    events.push({ at: t, phase: 4, rank: RANK.analog, seq: 0, src: ENGINE_ID, kind: "brownout", payload });
    events.push({ at: t, phase: 4, rank: RANK.analog, seq: 0, src: ENGINE_ID, kind: "reset", payload: { ...payload, reason: "brownout" } });
  }

  /** Solves one component. A source past its current limit sags until it carries exactly the limit. */
  private solveComponent(comp: Component, o: SolveOptions): SolveResult {
    const run = (elements: Element[]) => this.d.solve({ nodes: comp.nodes.length + 1, ground: GROUND, elements, pwmSlices: pwmSlices(elements) }, o);
    let elements = comp.elements;
    let result = run(elements);
    for (const el of comp.elements) {
      if (el.kind !== "V" || !isLimited(el) || !result.converged || (result.branch[el.id]?.amps ?? 0) <= el.limit.amps) continue;
      const withSeries = (ohms: number) => elements.map((x) => (x.id === el.id ? { ...el, rSeriesOhms: ohms } : x));
      const ohms = droopSource(el, (r) => run(withSeries(r)).branch[el.id]?.amps ?? 0);
      elements = withSeries(ohms);
      result = run(elements);
    }
    return result;
  }

  private localNet(comp: Component, node: number): NetId | undefined {
    const global = comp.nodes[node - 1];
    return global === undefined ? undefined : this.netOf.get(global);
  }

  /** The element of a burn-out record is the one its evidence points at; it stays open in later solves. */
  private openBurnt(states: HonestState[]): void {
    for (const state of states) {
      const id = state.kind === "burn-out" ? state.evidence[0]?.ref : undefined;
      const at = id === undefined ? undefined : this.where.get(id);
      const open = at && openCircuit(at.comp.elements[at.index]);
      if (!at || !open) continue;
      this.damaged.set(at.comp.elements[at.index].id, at.comp.elements[at.index]);
      at.comp.elements[at.index] = open;
      at.comp.dirty = true;
    }
  }

  /** A board input on a net that nothing else touches reads noise. Said once per pin. */
  private floatingInputs(t: SimTime): HonestState[] {
    const out: HonestState[] = [];
    for (const [id, input] of this.boardPins) {
      const at = this.where.get(id);
      const pin = at?.comp.elements[at.index];
      if (this.floating.has(id) || !at || pin?.kind !== "PIN" || pin.level !== "Z") continue;
      const others = at.comp.elements.some((el) => el.id !== id && nodesOf(el).includes(pin.a));
      if (others) continue;
      this.floating.add(id);
      const [, board, name] = id.split(":");
      out.push(floatingInputState(this.d.registry, board, name, input.net, t));
    }
    return out;
  }

  /** Splits the circuit into parts that share no node but ground; each is solved on its own. */
  private partition(elements: Element[]): void {
    const groups = new UnionFind();
    const used = elements.map((el) => nodesOf(el).filter((n) => n !== GROUND));
    for (const nodes of used) for (const n of nodes) groups.union(String(nodes[0]), String(n));
    const byRoot = new Map<string, Component>();
    this.components = [];
    this.pinBase = new Map();
    elements.forEach((el, i) => {
      if (used[i].length === 0) return;
      const root = groups.find(String(used[i][0]));
      let comp = byRoot.get(root);
      if (!comp) {
        comp = { nodes: [], elements: [], dirty: true, ok: true, last: null };
        byRoot.set(root, comp);
        this.components.push(comp);
      }
      for (const n of used[i]) if (!comp.nodes.includes(n)) comp.nodes.push(n);
    });
    elements.forEach((el, i) => {
      if (used[i].length === 0) return;
      const comp = byRoot.get(groups.find(String(used[i][0])))!;
      const local = mapNodes(el, (n) => (n === GROUND ? GROUND : comp.nodes.indexOf(n) + 1));
      comp.elements.push(local);
      if (local.kind === "PIN") this.pinBase.set(local.id, local);
    });
    this.index();
  }

  private index(): void {
    this.home = new Map();
    this.where = new Map();
    for (const comp of this.components) {
      comp.nodes.forEach((node, i) => this.home.set(node, { comp, local: i + 1 }));
      comp.elements.forEach((el, index) => this.where.set(el.id, { comp, index }));
    }
  }

  private applyOne(change: Change): void {
    const at = this.where.get(change.element);
    if (!at) {
      this.pending.push(simDiag("unknown-pin", "warning", {}, { element: change.element }));
      return;
    }
    const { comp, index } = at;
    const el = comp.elements[index];
    switch (change.kind) {
      case "pin": {
        const base = this.pinBase.get(change.element);
        if (base) comp.elements[index] = { ...base, level: change.level };
        break;
      }
      case "pwm": {
        const base = this.pinBase.get(change.element);
        if (!(change.duty >= 0 && change.duty <= 1) || !(change.hz > 0)) throw new RangeError(`pwm needs a duty in 0 to 1 and hz above 0, got ${change.duty} and ${change.hz}`);
        if (base) {
          comp.elements[index] = { id: base.id, kind: "PWM", a: base.a, duty: change.duty, hz: change.hz, vHighVolts: base.vHighVolts, rOutOhms: base.rOutOhms, mode: "averaged", maxAmps: base.maxAmps };
        }
        break;
      }
      case "source":
        if (el.kind === "V") comp.elements[index] = { ...el, volts: change.volts };
        break;
      case "switch":
        if (el.kind === "R") comp.elements[index] = { ...el, ohms: change.closed ? JOIN_OHMS : OPEN_OHMS };
        break;
      case "param": {
        const path = change.path === "pos" ? "position" : change.path;
        if (typeof (el as unknown as Record<string, unknown>)[path] === "number") comp.elements[index] = { ...el, [path]: change.value } as Element;
        break;
      }
      case "motor-speed":
        return;
    }
    comp.dirty = true;
  }

  private globalDiag(x: SimDiagnostic, comp: Component): SimDiagnostic {
    if (x.ref.net === undefined) return x;
    const node = comp.nodes[Number(x.ref.net) - 1];
    const net = node === undefined ? undefined : this.netOf.get(node);
    const ref = { ...x.ref };
    if (net === undefined) delete ref.net;
    else ref.net = net;
    return { ...x, ref };
  }

  /** A digital input whose net moves past a threshold; between the two thresholds it keeps its level. */
  private crossings(time: SimTime): SimEvent[] {
    const events: SimEvent[] = [];
    const seen = new Set<NetId>();
    for (const [id, input] of this.boardPins) {
      const at = this.where.get(id);
      const pin = at?.comp.elements[at.index];
      if (seen.has(input.net) || pin?.kind !== "PIN" || pin.level !== "Z") continue;
      const volts = this.netVolts(input.net);
      if (volts === null) continue;
      seen.add(input.net);
      const level = this.held.get(input.net) ?? 0;
      const next = level === 0 && volts >= input.vihVolts ? 1 : level === 1 && volts <= input.vilVolts ? 0 : level;
      if (next === level) continue;
      this.held.set(input.net, next);
      events.push({ at: time, phase: 3, rank: RANK.analog, seq: 0, src: ENGINE_ID, kind: "net-threshold", payload: { net: input.net, level: next, volts } });
    }
    return events;
  }
}

export function createLiveAnalog(d: LiveDeps): LiveAnalog {
  return new Live(d);
}
