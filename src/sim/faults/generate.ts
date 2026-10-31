import { fail, ok } from "../../core/result.ts";
import type { Failure, Result } from "../../core/result.ts";
import { rng } from "../../core/prng.ts";
import type { Descriptor } from "../../parts/descriptor.ts";
import type { Quantity } from "../../parts/generated/types.ts";
import type { Fault, Op, Project } from "../../project/generated/types.ts";
import { causeMeta } from "./causes.ts";
import type { CauseFamily } from "./causes.ts";
import type { CauseId, NetView, SymptomId } from "./types.ts";

export type GeneratorId =
  | "open-wire"
  | "swap-pins"
  | "wrong-value"
  | "missing-ground"
  | "wrong-pin-in-code"
  | "reverse-part"
  | "part-fault";

export interface FaultCandidate {
  generator: GeneratorId;
  causeId: CauseId;
  symptomIds: SymptomId[];
  family: CauseFamily;
  fault: Fault;
  label: { part?: string; pin?: string; nets?: [string, string] };
}

export interface CandidateOptions {
  families?: CauseFamily[];
}

type FaultKind = Fault["kind"];

const FAULT_LIMIT = 200;
const ID_BODY_MAX = 64;
const VALUE_FACTORS = [10, 0.1] as const;
const COLD_JOINT_PERIOD_MS = 500;
const INPUT_PIN_TYPES: ReadonlySet<string> = new Set(["power_in", "digital_in", "analog_in"]);
const BUS_SIGNALS: Readonly<Record<string, readonly [string, string]>> = { i2c: ["sda", "scl"], uart: ["tx", "rx"] };
const BOARD_PIN_NUMBER = /^(?:D|GPIO|IO|GP)?(\d+)$/i;
const PIN_CALL = /\b(?:digitalWrite|analogWrite|tone)\s*\(\s*([A-Za-z_]\w*|\d+)/g;

const hasElement = (d: Descriptor | undefined, ...elements: string[]): boolean =>
  d?.behaviour.layers.some((l) => l.model.kind === "element" && elements.includes(l.model.element)) ?? false;

const quantity = (q: Quantity | undefined): number | undefined => q?.value ?? q?.typ;

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "-");

interface Draft {
  generator: GeneratorId;
  /** Third and fourth words of the id: the part and the pin, or whatever else tells two candidates apart. */
  key: [string, string];
  causeId: CauseId;
  symptomIds?: SymptomId[];
  kind: FaultKind;
  target: Fault["target"];
  params?: Record<string, unknown>;
  injectable?: Fault["injectable"];
  label: FaultCandidate["label"];
}

function toCandidate(draft: Draft, id: string): FaultCandidate {
  const meta = causeMeta(draft.causeId);
  const fault: Fault = {
    id,
    cause_id: draft.causeId,
    symptom_ids: draft.symptomIds ?? meta?.symptomIds ?? [],
    kind: draft.kind,
    target: draft.target,
    enabled: true,
    ...(draft.params && { params: draft.params }),
    ...(draft.injectable && { injectable: draft.injectable }),
  };
  return {
    generator: draft.generator,
    causeId: draft.causeId,
    symptomIds: fault.symptom_ids,
    // An `x-` cause from a part file has no row in the cause table; wiring is the neutral family for it.
    family: meta?.family ?? "wiring",
    fault,
    label: draft.label,
  };
}

/** `flt_<generator>_<part>_<pin>`, cut so the whole id stays inside the schema's 64 characters after `flt_`. */
function idFor(draft: Draft, taken: Map<string, number>): string {
  const body = [draft.generator, ...draft.key].map(slug).join("_");
  const seen = (taken.get(body) ?? 0) + 1;
  taken.set(body, seen);
  const suffix = seen === 1 ? "" : `_${seen}`;
  return `flt_${body.slice(0, ID_BODY_MAX - suffix.length)}${suffix}`;
}

function* openWire(view: NetView): Generator<Draft> {
  for (const part of view.parts()) {
    const d = view.descriptor(part);
    if (!d || view.isBoard(part)) continue;
    const onBus = new Set((d.protocols ?? []).flatMap((q) => Object.values(q.pins)));
    for (const { id: pin } of d.pins) {
      const info = view.pin(part, pin);
      if (info?.net == null || !(INPUT_PIN_TYPES.has(info.type ?? "") || onBus.has(pin))) continue;
      yield {
        generator: "open-wire",
        key: [part, pin],
        causeId: "open-connection",
        kind: "open-wire",
        target: { component: part, pin },
        label: { part, pin },
      };
    }
  }
}

function* swapPins(view: NetView): Generator<Draft> {
  const seen = new Set<string>();
  const soleBoardPin = (net: string): boolean => view.pinsOn(net).filter((p) => view.isBoard(p.part)).length === 1;
  for (const part of view.parts()) {
    for (const proto of view.descriptor(part)?.protocols ?? []) {
      const signals = BUS_SIGNALS[proto.kind];
      if (!signals) continue;
      const pins = signals.map((s) => proto.pins[s]);
      const nets = pins.map((p) => (p === undefined ? null : (view.pin(part, p)?.net ?? null)));
      const [a, b] = nets;
      if (a == null || b == null || a === b || !soleBoardPin(a) || !soleBoardPin(b)) continue;
      const pair: [string, string] = a < b ? [a, b] : [b, a];
      if (seen.has(pair.join("\0"))) continue;
      seen.add(pair.join("\0"));
      yield {
        generator: "swap-pins",
        key: [part, pins[0] ?? ""],
        causeId: "swapped-pins",
        kind: "wrong-connection",
        target: { nets: pair },
        label: { nets: pair },
      };
    }
  }
}

function* wrongValue(view: NetView): Generator<Draft> {
  for (const part of view.parts()) {
    const d = view.descriptor(part);
    if (!hasElement(d, "res", "capacitor")) continue;
    for (const param of d?.parameters ?? []) {
      if (param.type !== "number") continue;
      for (const factor of VALUE_FACTORS) {
        yield {
          generator: "wrong-value",
          key: [part, `${param.id}-x${factor}`],
          causeId: "wrong-value",
          kind: "wrong-value",
          target: { component: part },
          params: { parameter: param.id, factor },
          label: { part, pin: param.id },
        };
      }
    }
  }
}

function* missingGround(view: NetView): Generator<Draft> {
  for (const part of view.parts()) {
    if (view.isBoard(part)) continue;
    for (const { id: pin, type } of view.descriptor(part)?.pins ?? []) {
      if (type !== "ground" || view.pin(part, pin)?.net == null) continue;
      yield {
        generator: "missing-ground",
        key: [part, pin],
        causeId: "missing-ground",
        kind: "open-wire",
        target: { component: part, pin },
        label: { part, pin },
      };
    }
  }
}

function* reversePart(view: NetView): Generator<Draft> {
  for (const part of view.parts()) {
    const d = view.descriptor(part);
    if (!d || view.isBoard(part)) continue;
    const isLed = hasElement(d, "led");
    if (!isLed && !d.pins.some((p) => p.polarity !== undefined)) continue;
    yield {
      generator: "reverse-part",
      key: [part, ""],
      causeId: isLed ? "led-reversed" : "reverse-polarity",
      kind: "reversed-part",
      target: { component: part },
      label: { part },
    };
  }
}

interface BoardPin {
  pin: string;
  number: number;
  loaded: boolean;
}

/** The numbered pins of the first board, each marked with whether an LED or buzzer hangs off it (directly or past a resistor). */
function boardPins(view: NetView): { board: string; pins: Map<number, BoardPin> } | undefined {
  const board = view.parts().find((p) => view.isBoard(p));
  if (board === undefined) return undefined;
  const isLoad = (part: string) => hasElement(view.descriptor(part), "led", "buzzer");
  const loadedNet = (net: string): boolean =>
    view.pinsOn(net).some((p) => {
      if (isLoad(p.part)) return true;
      if (!hasElement(view.descriptor(p.part), "res")) return false;
      const other = view.descriptor(p.part)?.pins.find((q) => q.id !== p.pin);
      const across = other && view.pin(p.part, other.id)?.net;
      return across != null && across !== net && view.pinsOn(across).some((q) => isLoad(q.part));
    });
  const pins = new Map<number, BoardPin>();
  for (const { id: pin } of view.descriptor(board)?.pins ?? []) {
    const number = BOARD_PIN_NUMBER.exec(pin)?.[1];
    const net = view.pin(board, pin)?.net;
    if (number === undefined) continue;
    pins.set(Number(number), { pin, number: Number(number), loaded: net != null && loadedNet(net) });
  }
  return { board, pins };
}

interface PinSite {
  file: string;
  line: number;
  from: number;
}

/** Lines holding the number a pin call uses: the call itself for a literal, the declaration for a named constant. */
function pinSites(sources: Record<string, string>): PinSite[] {
  const sites = new Map<string, PinSite>();
  for (const file of Object.keys(sources).sort()) {
    const lines = (sources[file] ?? "").split("\n").map((l) => l.split("//")[0] ?? "");
    lines.forEach((text, i) => {
      for (const [, arg = ""] of text.matchAll(PIN_CALL)) {
        const literal = /^\d+$/.test(arg);
        const declared = literal ? undefined : declarationOf(lines, arg);
        const site = literal ? { file, line: i + 1, from: Number(arg) } : declared && { file, ...declared };
        if (site) sites.set(`${site.file}:${site.line}:${site.from}`, site);
      }
    });
  }
  return [...sites.values()];
}

function declarationOf(lines: string[], name: string): Omit<PinSite, "file"> | undefined {
  const decl = new RegExp(`(?:#define\\s+${name}\\s+|\\b${name}\\s*=\\s*)(\\d+)\\b`);
  for (let i = 0; i < lines.length; i++) {
    const value = decl.exec(lines[i] ?? "")?.[1];
    if (value !== undefined) return { line: i + 1, from: Number(value) };
  }
  return undefined;
}

function* wrongPinInCode(view: NetView, sources: Record<string, string>): Generator<Draft> {
  const board = boardPins(view);
  if (!board) return;
  const otherLoaded = [...board.pins.values()].filter((p) => p.loaded).map((p) => p.number);
  for (const site of pinSites(sources)) {
    const from = board.pins.get(site.from);
    if (!from?.loaded) continue;
    const to =
      otherLoaded.filter((n) => n !== site.from).sort((a, b) => a - b)[0] ??
      [site.from + 1, site.from - 1].find((n) => board.pins.has(n));
    if (to === undefined) continue;
    yield {
      generator: "wrong-pin-in-code",
      key: [board.board, from.pin],
      causeId: "wrong-pin-in-code",
      kind: "config",
      target: { component: board.board },
      params: { file: site.file, line: site.line, from: site.from, to },
      label: { part: board.board, pin: from.pin },
    };
  }
}

type Injectable = NonNullable<Descriptor["injectable_faults"]>[number];

/** PDM 5.11: how a part's declared fault becomes a project fault. Undefined when the entry lacks what the kind needs. */
function mapInjectable(
  entry: Injectable,
  part: string,
): { kind: FaultKind; target: Fault["target"]; params?: Record<string, unknown> } | undefined {
  const pin = entry.target?.pins?.[0];
  const parameter = entry.target?.parameter;
  const value = quantity(entry.value);
  const component = { component: part };
  switch (entry.kind) {
    case "open_pin":
      return pin === undefined ? undefined : { kind: "open-wire", target: { component: part, pin } };
    case "short_pins": {
      const pins = entry.target?.pins;
      return pins?.length === 2
        ? { kind: "short", target: component, params: { pins: pins.map((p) => ({ c: part, p })) } }
        : undefined;
    }
    case "missing_part":
      return { kind: "missing-part", target: component };
    case "reversed_supply":
      return { kind: "reverse-polarity", target: component };
    case "wrong_supply_voltage":
      return value === undefined ? undefined : { kind: "wrong-voltage", target: component, params: { value } };
    case "cold_joint":
      return pin === undefined
        ? undefined
        : { kind: "cold-solder", target: { component: part, pin }, params: { periodMs: COLD_JOINT_PERIOD_MS } };
    case "stuck_level":
      return pin === undefined
        ? undefined
        : { kind: "stuck-level", target: { component: part, pin }, params: { level: value ?? 0 } };
    case "wrong_value":
      return parameter === undefined || value === undefined
        ? undefined
        : { kind: "wrong-value", target: component, params: { parameter, value } };
    case "reversed_part":
      return { kind: "reversed-part", target: component };
    case "floating_pin":
      return pin === undefined ? undefined : { kind: "floating-input", target: { component: part, pin } };
    case "option_removed":
      return parameter === undefined || value === undefined
        ? undefined
        : { kind: "config", target: component, params: { parameter, value } };
    case "overload":
      return value === undefined ? undefined : { kind: "overcurrent", target: component, params: { ohms: value } };
    case "other":
      return parameter === undefined || value === undefined
        ? undefined
        : { kind: "config", target: component, params: { parameter, value } };
  }
}

function* partFaults(doc: Project, view: NetView): Generator<Draft> {
  for (const { id: part } of [...doc.components, ...doc.boards]) {
    for (const entry of view.descriptor(part)?.injectable_faults ?? []) {
      const mapped = mapInjectable(entry, part);
      if (!mapped) continue;
      const pin = mapped.target.pin;
      yield {
        generator: "part-fault",
        key: [part, entry.id],
        causeId: entry.cause_id,
        symptomIds: [...entry.symptom_ids],
        ...mapped,
        injectable: { component: part, id: entry.id },
        label: pin === undefined ? { part } : { part, pin },
      };
    }
  }
}

/** Every fault the generators can make on this project. Parts without a descriptor give none. */
export function listCandidates(
  doc: Project,
  view: NetView,
  sources: Record<string, string>,
  opts: CandidateOptions = {},
): FaultCandidate[] {
  const drafts = [
    ...openWire(view),
    ...swapPins(view),
    ...wrongValue(view),
    ...missingGround(view),
    ...wrongPinInCode(view, sources),
    ...reversePart(view),
    ...partFaults(doc, view),
  ];
  const taken = new Map<string, number>();
  const all = drafts.map((draft) => toCandidate(draft, idFor(draft, taken)));
  const { families } = opts;
  return families ? all.filter((c) => families.includes(c.family)) : all;
}

/** The same seed gives the same candidate whatever order the list arrives in. */
export function pickSurprise(c: readonly FaultCandidate[], seed: number): FaultCandidate | undefined {
  const sorted = [...c].sort((a, b) => (a.fault.id < b.fault.id ? -1 : a.fault.id > b.fault.id ? 1 : 0));
  if (sorted.length === 0) return undefined;
  return sorted[rng(seed, "faults.surprise").next() % sorted.length];
}

export type BreakError = Failure & { code: "duplicate-fault" | "limit" };

export function breakOps(doc: Project, c: FaultCandidate): Result<Op[], BreakError> {
  const { faults } = doc.simulation;
  if (faults.some((f) => f.id === c.fault.id)) {
    return fail({ code: "duplicate-fault", message: `the project already has a fault ${c.fault.id}` });
  }
  if (faults.length >= FAULT_LIMIT) {
    return fail({ code: "limit", message: `a project holds at most ${FAULT_LIMIT} faults` });
  }
  return ok([{ k: "fault.set", fault: c.fault }]);
}

const MADE_BY_GENERATOR = /^flt_(?:open-wire|swap-pins|wrong-value|missing-ground|wrong-pin-in-code|reverse-part|part-fault)_/;

/** Undoes Break it by removing the fault. A fault the author wrote stays in the document and is only switched off. */
export function restoreOps(doc: Project, faultId: string): Op[] {
  const fault = doc.simulation.faults.find((f) => f.id === faultId);
  if (!fault) return [];
  return MADE_BY_GENERATOR.test(faultId)
    ? [{ k: "fault.remove", id: faultId }]
    : [{ k: "fault.set", fault: { ...fault, enabled: false } }];
}
