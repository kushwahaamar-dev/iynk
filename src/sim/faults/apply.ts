import { fail, ok } from "../../core/result.ts";
import type { Result } from "../../core/result.ts";
import type { Fault } from "../../project/generated/types.ts";
import type { SimNetlist, SimPart } from "../engine.ts";
import { applyCodePin } from "./code-pin.ts";
export { applyCodePin } from "./code-pin.ts";
import { faultStates, faultToOps } from "./ops.ts";
import type { FaultCtx } from "./ops.ts";
import type {
  FaultError,
  FaultErrorCode,
  FaultOp,
  FaultState,
  PinRef,
  SimTime,
} from "./types.ts";

export interface BaseSetup {
  net: SimNetlist;
  sources: Record<string, string>;
}

export interface EffectiveSetup {
  net: SimNetlist;
  sources: Record<string, string>;
  states: FaultState[];
}

/** What the netlist needs to know about parts, which only the descriptors can say. */
export interface StructuralIds {
  /** Descriptor reference of the resistor a `short` adds, as `SimPart.descriptor` holds it. */
  resistor: string;
  resistanceParam: string;
  /** The two pins a `polarity` op exchanges; undefined when the part has no polarity or supply pins. */
  polarPins(part: string): [string, string] | undefined;
}

export type ApplyCtx = FaultCtx & { ids: StructuralIds };

export const ENGINE_KINDS: ReadonlySet<FaultOp["kind"]> = new Set([
  "stuck",
  "cold-joint",
  "degrade",
  "param",
  "mount",
  "sensor",
  "swap-phase",
]);

const SHORT_PREFIX = "fault_short_";
const RESISTOR_PINS = ["P1", "P2"] as const;

type Step<T> = Result<T, FaultError>;

const failure = (code: FaultErrorCode, message: string) =>
  fail<FaultError>({ code, faultId: "", message });

interface Draft {
  parts: SimPart[];
  at: Map<string, number>;
}

function draftOf(net: SimNetlist): Draft {
  return {
    parts: net.parts.slice(),
    at: new Map(net.parts.map((p, i) => [p.id, i])),
  };
}

function partOf(d: Draft, id: string): Step<SimPart> {
  const i = d.at.get(id);
  return i === undefined
    ? failure("unknown-target", `no part ${id} in the circuit`)
    : ok(d.parts[i]!);
}

function pinNet(d: Draft, ref: PinRef): Step<string | null> {
  const part = partOf(d, ref.part);
  if (!part.ok) return part;
  const net = part.value.pins[ref.pin];
  return net === undefined
    ? failure("unknown-target", `part ${ref.part} has no pin ${ref.pin}`)
    : ok(net);
}

function replace(d: Draft, part: SimPart): void {
  d.parts[d.at.get(part.id)!] = part;
}

function setPins(d: Draft, nets: [PinRef, string | null][]): void {
  for (const [ref, net] of nets) {
    const part = d.parts[d.at.get(ref.part)!]!;
    replace(d, { ...part, pins: { ...part.pins, [ref.pin]: net } });
  }
}

function exchange(d: Draft, a: PinRef, b: PinRef): Step<void> {
  const na = pinNet(d, a);
  if (!na.ok) return na;
  const nb = pinNet(d, b);
  if (!nb.ok) return nb;
  setPins(d, [
    [a, nb.value],
    [b, na.value],
  ]);
  return ok(undefined);
}

function addShort(
  d: Draft,
  a: PinRef,
  b: PinRef,
  ohms: number,
  ids: StructuralIds,
): Step<void> {
  const na = pinNet(d, a);
  if (!na.ok) return na;
  const nb = pinNet(d, b);
  if (!nb.ok) return nb;
  if (na.value === null || nb.value === null) {
    return failure("unknown-target", "a short needs both pins on a net");
  }
  if (na.value === nb.value) return ok(undefined);
  let n = 1;
  while (d.at.has(`${SHORT_PREFIX}${n}`)) n++;
  const id = `${SHORT_PREFIX}${n}`;
  d.at.set(id, d.parts.length);
  d.parts.push({
    id,
    descriptor: ids.resistor,
    params: { [ids.resistanceParam]: ohms },
    pins: { [RESISTOR_PINS[0]]: na.value, [RESISTOR_PINS[1]]: nb.value },
    kind: "resistor",
  });
  return ok(undefined);
}

function scale(
  d: Draft,
  partId: string,
  param: string,
  factor: number,
): Step<void> {
  const part = partOf(d, partId);
  if (!part.ok) return part;
  const current = part.value.params[param];
  if (typeof current !== "number")
    return failure("bad-param", `part ${partId} has no numeric ${param}`);
  replace(d, {
    ...part.value,
    params: { ...part.value.params, [param]: current * factor },
  });
  return ok(undefined);
}

function reverse(d: Draft, partId: string, ids: StructuralIds): Step<void> {
  const part = partOf(d, partId);
  if (!part.ok) return part;
  const pair = ids.polarPins(partId);
  if (pair === undefined)
    return failure(
      "unknown-target",
      `part ${partId} has no polarity to reverse`,
    );
  return exchange(
    d,
    { part: partId, pin: pair[0] },
    { part: partId, pin: pair[1] },
  );
}

function applyOp(d: Draft, op: FaultOp, ids: StructuralIds): Step<void> {
  switch (op.kind) {
    case "open": {
      const net = pinNet(d, op.pin);
      if (!net.ok) return net;
      setPins(d, [[op.pin, null]]);
      return ok(undefined);
    }
    case "swap":
      return exchange(d, op.a, op.b);
    case "short":
      return addShort(d, op.a, op.b, op.ohms, ids);
    case "polarity":
      return reverse(d, op.part, ids);
    case "value":
      return scale(d, op.part, op.param, op.factor);
    default:
      return ok(undefined);
  }
}

/** Applies the structural ops (open, swap, short, polarity, value) to a copy; the input is never changed. */
export function applyStructural(
  net: SimNetlist,
  ops: readonly FaultOp[],
  ids: StructuralIds,
): Step<SimNetlist> {
  const draft = draftOf(net);
  for (const op of ops) {
    const done = applyOp(draft, op, ids);
    if (!done.ok) return done;
  }
  return ok({ ...net, parts: draft.parts });
}

function engineHome(op: FaultOp): string | undefined {
  switch (op.kind) {
    case "stuck":
    case "degrade":
      return op.part;
    case "cold-joint":
      return op.pin.part;
    case "param":
      return op.target;
    case "mount":
      return op.mount;
    case "sensor":
      return op.sensor;
    case "swap-phase":
      return op.motor;
    default:
      return undefined;
  }
}

function attachStates(net: SimNetlist, states: FaultState[]): SimNetlist {
  const byPart = new Map<string, FaultState[]>();
  for (const state of states) {
    const home = engineHome(state.op);
    if (home !== undefined)
      byPart.set(home, [...(byPart.get(home) ?? []), state]);
  }
  if (byPart.size === 0) return net;
  return {
    ...net,
    parts: net.parts.map((p) => {
      const own = byPart.get(p.id);
      return own === undefined
        ? p
        : { ...p, faults: [...(p.faults ?? []), ...own] };
    }),
  };
}

const forFault = <T>(r: Step<T>, faultId: string): Step<T> =>
  r.ok ? r : fail({ ...r.error, faultId });

/**
 * The circuit and sources the run sees once the enabled faults are in, plus the engine-level fault states. Faults
 * apply in document order and the base is never touched, so the stored document stays exactly as the person drew it.
 */
export function applyFaults(
  base: BaseSetup,
  faults: readonly Fault[],
  ctx: ApplyCtx,
  at: SimTime,
): Step<EffectiveSetup> {
  let net = base.net;
  let sources = base.sources;
  const states: FaultState[] = [];
  for (const fault of faults) {
    if (!fault.enabled) continue;
    const ops = faultToOps(fault, ctx);
    if (!ops.ok) return ops;
    for (const op of ops.value) {
      if (op.kind === "code-pin") {
        const source = sources[op.file];
        if (source === undefined) {
          return fail({
            code: "unknown-target",
            faultId: fault.id,
            message: `no source file ${op.file}`,
          });
        }
        const edited = forFault(applyCodePin(source, op), fault.id);
        if (!edited.ok) return edited;
        sources = { ...sources, [op.file]: edited.value };
      } else {
        const next = forFault(applyStructural(net, [op], ctx.ids), fault.id);
        if (!next.ok) return next;
        net = next.value;
      }
    }
    states.push(
      ...faultStates(fault, ops.value, at).filter((s) =>
        ENGINE_KINDS.has(s.op.kind),
      ),
    );
  }
  return ok({ net: attachStates(net, states), sources, states });
}
