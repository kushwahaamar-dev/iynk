import { fail, ok } from "../../core/result.ts";
import type { Result } from "../../core/result.ts";
import type { Fault, Pose } from "../../project/generated/types.ts";
import type {
  FaultError,
  FaultErrorCode,
  FaultOp,
  FaultState,
  PinRef,
  SimTime,
} from "./types.ts";

/** What `faultToOps` needs to know about the circuit the fault sits on. */
export interface FaultCtx {
  /** Pins of a part in designator order; empty when the part is unknown. */
  partPins(part: string): PinRef[];
  pinNet(p: PinRef): string | null;
  boardPinsOn(net: string): PinRef[];
  isPolarised(part: string): boolean;
  paramValue(part: string, param: string): number | undefined;
  supplyParam(component: string): { part: string; param: string } | undefined;
  /** `Math.round(s * 1e9)`. */
  secondsToNs(s: number): SimTime;
}

type Params = Record<string, unknown>;
type Step<T> = Result<T, FaultError>;

const DEFAULT_SHORT_OHMS = 0.01;
const DEFAULT_COLD_FRACTION = 0.5;
const DEFAULT_BROWNOUT_FACTOR = 0.6;
const SENSOR_MODES = ["dropout", "stuck", "bias", "noise"] as const;

const failure = (fault: Fault, code: FaultErrorCode, message: string) =>
  fail<FaultError>({ code, faultId: fault.id, message });

const isNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function paramsOf(fault: Fault): Params {
  return isObject(fault.params) ? fault.params : {};
}

function stringParam(fault: Fault, key: string): Step<string> {
  const v = paramsOf(fault)[key];
  if (v === undefined)
    return failure(fault, "missing-param", `${fault.kind} needs params.${key}`);
  if (typeof v !== "string" || v === "")
    return failure(
      fault,
      "bad-param",
      `params.${key} must be a non-empty string`,
    );
  return ok(v);
}

function numberParam(fault: Fault, key: string): Step<number> {
  const v = paramsOf(fault)[key];
  if (v === undefined)
    return failure(fault, "missing-param", `${fault.kind} needs params.${key}`);
  if (!isNumber(v))
    return failure(fault, "bad-param", `params.${key} must be a number`);
  return ok(v);
}

function positiveParam(
  fault: Fault,
  key: string,
  fallback?: number,
): Step<number> {
  if (paramsOf(fault)[key] === undefined && fallback !== undefined)
    return ok(fallback);
  const n = numberParam(fault, key);
  if (!n.ok) return n;
  return n.value > 0
    ? n
    : failure(fault, "bad-param", `params.${key} must be greater than 0`);
}

function pinRefParam(
  fault: Fault,
  value: unknown,
  where: string,
): Step<PinRef> {
  if (
    !isObject(value) ||
    typeof value.c !== "string" ||
    typeof value.p !== "string"
  ) {
    return failure(
      fault,
      "bad-param",
      `${where} must be a pin reference {c, p}`,
    );
  }
  return ok({ part: value.c, pin: value.p });
}

function requireComponent(fault: Fault, ctx: FaultCtx): Step<string> {
  const part = fault.target.component;
  if (part === undefined)
    return failure(
      fault,
      "unknown-target",
      `${fault.kind} needs target.component`,
    );
  if (ctx.partPins(part).length === 0)
    return failure(fault, "unknown-target", `no part ${part} in the circuit`);
  return ok(part);
}

function requirePin(fault: Fault, ctx: FaultCtx): Step<PinRef> {
  const part = requireComponent(fault, ctx);
  if (!part.ok) return part;
  const pin = fault.target.pin;
  if (pin === undefined)
    return failure(fault, "unknown-target", `${fault.kind} needs target.pin`);
  if (!ctx.partPins(part.value).some((p) => p.pin === pin)) {
    return failure(
      fault,
      "unknown-target",
      `part ${part.value} has no pin ${pin}`,
    );
  }
  return ok({ part: part.value, pin });
}

function requireKnownPin(
  fault: Fault,
  ctx: FaultCtx,
  ref: PinRef,
): Step<PinRef> {
  return ctx.partPins(ref.part).some((p) => p.pin === ref.pin)
    ? ok(ref)
    : failure(
        fault,
        "unknown-target",
        `part ${ref.part} has no pin ${ref.pin}`,
      );
}

function sortedNets(fault: Fault): Step<[string, string]> {
  const nets = fault.target.nets;
  if (nets === undefined)
    return failure(fault, "unknown-target", `${fault.kind} needs target.nets`);
  const [a, b] = [...nets].sort();
  return ok([a, b]);
}

const comparePins = (a: PinRef, b: PinRef) =>
  a.part.localeCompare(b.part) || a.pin.localeCompare(b.pin);

function firstPinOn(fault: Fault, ctx: FaultCtx, net: string): Step<PinRef> {
  const [first] = [...ctx.boardPinsOn(net)].sort(comparePins);
  return first
    ? ok(first)
    : failure(fault, "unknown-target", `net ${net} has no pin to short`);
}

function shortPins(fault: Fault, ctx: FaultCtx): Step<[PinRef, PinRef]> {
  const given = paramsOf(fault).pins;
  if (given !== undefined) {
    if (!Array.isArray(given) || given.length !== 2)
      return failure(fault, "bad-param", "params.pins must hold two pins");
    const a = pinRefParam(fault, given[0], "params.pins[0]");
    if (!a.ok) return a;
    const b = pinRefParam(fault, given[1], "params.pins[1]");
    if (!b.ok) return b;
    const ka = requireKnownPin(fault, ctx, a.value);
    if (!ka.ok) return ka;
    const kb = requireKnownPin(fault, ctx, b.value);
    return kb.ok ? ok([ka.value, kb.value]) : kb;
  }
  const nets = sortedNets(fault);
  if (!nets.ok) return nets;
  const a = firstPinOn(fault, ctx, nets.value[0]);
  if (!a.ok) return a;
  const b = firstPinOn(fault, ctx, nets.value[1]);
  return b.ok ? ok([a.value, b.value]) : b;
}

function shortOp(
  fault: Fault,
  ctx: FaultCtx,
  ohms: Step<number>,
): Step<FaultOp[]> {
  if (!ohms.ok) return ohms;
  const pins = shortPins(fault, ctx);
  return pins.ok
    ? ok([
        { kind: "short", a: pins.value[0], b: pins.value[1], ohms: ohms.value },
      ])
    : pins;
}

function boardPinOf(fault: Fault, ctx: FaultCtx, net: string): Step<PinRef> {
  const pins = ctx.boardPinsOn(net);
  return pins.length === 1
    ? ok(pins[0])
    : failure(
        fault,
        "ambiguous-target",
        `net ${net} holds ${pins.length} board pins, need exactly one`,
      );
}

function swapOp(fault: Fault, ctx: FaultCtx): Step<FaultOp[]> {
  if (fault.target.nets !== undefined) {
    const nets = sortedNets(fault);
    if (!nets.ok) return nets;
    const a = boardPinOf(fault, ctx, nets.value[0]);
    if (!a.ok) return a;
    const b = boardPinOf(fault, ctx, nets.value[1]);
    return b.ok ? ok([{ kind: "swap", a: a.value, b: b.value }]) : b;
  }
  const a = requirePin(fault, ctx);
  if (!a.ok) return a;
  const other = paramsOf(fault).with;
  if (other === undefined)
    return failure(
      fault,
      "missing-param",
      "wrong-connection needs target.nets or params.with",
    );
  const b = pinRefParam(fault, other, "params.with");
  if (!b.ok) return b;
  const known = requireKnownPin(fault, ctx, b.value);
  return known.ok ? ok([{ kind: "swap", a: a.value, b: known.value }]) : known;
}

function reversedPartOps(fault: Fault, ctx: FaultCtx): Step<FaultOp[]> {
  const part = requireComponent(fault, ctx);
  if (!part.ok) return part;
  if (ctx.isPolarised(part.value))
    return ok([{ kind: "polarity", part: part.value }]);
  const pins = ctx.partPins(part.value);
  if (pins.length < 2)
    return failure(
      fault,
      "bad-param",
      `part ${part.value} has too few pins to turn round`,
    );
  const ops: FaultOp[] = [];
  for (let i = 0; i < Math.floor(pins.length / 2); i++) {
    ops.push({ kind: "swap", a: pins[i], b: pins[pins.length - 1 - i] });
  }
  return ok(ops);
}

/** A factor from `params.factor`, or from `params.value` over the current value of the parameter. */
function factorFor(
  fault: Fault,
  ctx: FaultCtx,
  part: string,
  param: string,
  fallback?: number,
): Step<number> {
  const params = paramsOf(fault);
  if (params.factor !== undefined) return positiveParam(fault, "factor");
  if (params.value !== undefined) {
    const value = numberParam(fault, "value");
    if (!value.ok) return value;
    const current = ctx.paramValue(part, param);
    if (current === undefined || current === 0) {
      return failure(
        fault,
        "bad-param",
        `part ${part} has no non-zero ${param} to scale from`,
      );
    }
    const factor = value.value / current;
    return factor > 0
      ? ok(factor)
      : failure(
          fault,
          "bad-param",
          "params.value must have the sign of the current value",
        );
  }
  return fallback === undefined
    ? failure(
        fault,
        "missing-param",
        `${fault.kind} needs params.factor or params.value`,
      )
    : ok(fallback);
}

function valueOp(fault: Fault, ctx: FaultCtx): Step<FaultOp[]> {
  const part = requireComponent(fault, ctx);
  if (!part.ok) return part;
  const param = stringParam(fault, "parameter");
  if (!param.ok) return param;
  const factor = factorFor(fault, ctx, part.value, param.value);
  return factor.ok
    ? ok([
        {
          kind: "value",
          part: part.value,
          param: param.value,
          factor: factor.value,
        },
      ])
    : factor;
}

function supplyOp(fault: Fault, ctx: FaultCtx): Step<FaultOp[]> {
  const component = fault.target.component;
  if (component === undefined)
    return failure(
      fault,
      "unknown-target",
      `${fault.kind} needs target.component`,
    );
  const supply = ctx.supplyParam(component);
  if (supply === undefined)
    return failure(
      fault,
      "unknown-target",
      `${component} has no supply to change`,
    );
  const fallback =
    fault.kind === "brownout" ? DEFAULT_BROWNOUT_FACTOR : undefined;
  const factor = factorFor(fault, ctx, supply.part, supply.param, fallback);
  return factor.ok
    ? ok([
        {
          kind: "value",
          part: supply.part,
          param: supply.param,
          factor: factor.value,
        },
      ])
    : factor;
}

function levelMismatchOp(fault: Fault, ctx: FaultCtx): Step<FaultOp[]> {
  const params = paramsOf(fault);
  if (typeof params.part !== "string" || typeof params.parameter !== "string") {
    return failure(
      fault,
      "needs-choice",
      "level-mismatch needs params.part and params.parameter",
    );
  }
  if (ctx.partPins(params.part).length === 0)
    return failure(
      fault,
      "unknown-target",
      `no part ${params.part} in the circuit`,
    );
  const factor = factorFor(fault, ctx, params.part, params.parameter);
  return factor.ok
    ? ok([
        {
          kind: "value",
          part: params.part,
          param: params.parameter,
          factor: factor.value,
        },
      ])
    : factor;
}

/** Exactly one of `factor` or `value`, as the `param` op wants. */
function paramChange(
  fault: Fault,
  path: string,
): Step<
  Pick<Extract<FaultOp, { kind: "param" }>, "path" | "factor" | "value">
> {
  const params = paramsOf(fault);
  const hasFactor = params.factor !== undefined;
  const hasValue = params.value !== undefined;
  if (hasFactor === hasValue) {
    return failure(
      fault,
      hasFactor ? "bad-param" : "missing-param",
      `${fault.kind} needs exactly one of params.factor and params.value`,
    );
  }
  if (hasFactor) {
    const factor = positiveParam(fault, "factor");
    return factor.ok ? ok({ path, factor: factor.value }) : factor;
  }
  const value = params.value;
  if (!isNumber(value) && typeof value !== "string")
    return failure(
      fault,
      "bad-param",
      "params.value must be a number or a string",
    );
  return ok({ path, value });
}

function paramOp(
  fault: Fault,
  target: string | undefined,
  path: string,
): Step<FaultOp[]> {
  if (target === undefined)
    return failure(fault, "unknown-target", `${fault.kind} needs a target`);
  const change = paramChange(fault, path);
  return change.ok ? ok([{ kind: "param", target, ...change.value }]) : change;
}

function thermalOp(fault: Fault): Step<FaultOp[]> {
  const path = paramsOf(fault).path;
  if (typeof path !== "string")
    return failure(fault, "needs-choice", "thermal needs params.path");
  return paramOp(fault, fault.target.component, path);
}

function configOp(fault: Fault): Step<FaultOp[]> {
  const params = paramsOf(fault);
  if (params.file !== undefined && params.line !== undefined) {
    const file = stringParam(fault, "file");
    if (!file.ok) return file;
    const line = numberParam(fault, "line");
    if (!line.ok) return line;
    if (!Number.isInteger(line.value) || line.value < 1)
      return failure(
        fault,
        "bad-param",
        "params.line must be a line number from 1",
      );
    const from = numberParam(fault, "from");
    if (!from.ok) return from;
    const to = numberParam(fault, "to");
    return to.ok
      ? ok([
          {
            kind: "code-pin",
            file: file.value,
            line: line.value,
            from: from.value,
            to: to.value,
          },
        ])
      : to;
  }
  if (typeof params.parameter === "string")
    return paramOp(fault, fault.target.component, params.parameter);
  return failure(
    fault,
    "needs-choice",
    "config needs params.file and params.line, or params.parameter",
  );
}

function stuckOp(fault: Fault, ctx: FaultCtx): Step<FaultOp[]> {
  const { pin } = fault.target;
  if (fault.kind === "boot-strap" && pin === undefined) {
    return failure(fault, "needs-choice", "boot-strap needs target.pin");
  }
  const held =
    pin === undefined ? requireComponent(fault, ctx) : requirePin(fault, ctx);
  if (!held.ok) return held;
  const part = typeof held.value === "string" ? held.value : held.value.part;
  const level = numberParam(fault, "level");
  if (!level.ok) return level;
  return ok([
    pin === undefined
      ? { kind: "stuck", part, level: level.value }
      : { kind: "stuck", part, level: level.value, pin },
  ]);
}

function coldJointOp(fault: Fault, ctx: FaultCtx): Step<FaultOp[]> {
  const pin = requirePin(fault, ctx);
  if (!pin.ok) return pin;
  const fraction = positiveParam(fault, "onFraction", DEFAULT_COLD_FRACTION);
  if (!fraction.ok) return fraction;
  if (fraction.value > 1)
    return failure(fault, "bad-param", "params.onFraction must be at most 1");
  const periodMs = positiveParam(fault, "periodMs");
  if (!periodMs.ok) return periodMs;
  return ok([
    {
      kind: "cold-joint",
      pin: pin.value,
      onFraction: fraction.value,
      periodNs: ctx.secondsToNs(periodMs.value / 1000),
    },
  ]);
}

function nsParam(
  fault: Fault,
  ctx: FaultCtx,
  nsKey: string,
  msKey: string,
  required: boolean,
): Step<SimTime | undefined> {
  const params = paramsOf(fault);
  if (params[nsKey] !== undefined) {
    const ns = numberParam(fault, nsKey);
    if (!ns.ok) return ns;
    return Number.isInteger(ns.value) && ns.value >= 0
      ? ok(ns.value)
      : failure(
          fault,
          "bad-param",
          `params.${nsKey} must be a whole number of nanoseconds from 0`,
        );
  }
  if (params[msKey] !== undefined) {
    const ms = numberParam(fault, msKey);
    if (!ms.ok) return ms;
    return ms.value >= 0
      ? ok(ctx.secondsToNs(ms.value / 1000))
      : failure(fault, "bad-param", `params.${msKey} must be 0 or more`);
  }
  return required
    ? failure(
        fault,
        "missing-param",
        `sensor needs params.${nsKey} or params.${msKey}`,
      )
    : ok(undefined);
}

function sensorOp(fault: Fault, ctx: FaultCtx): Step<FaultOp[]> {
  const sensor =
    typeof paramsOf(fault).sensor === "string"
      ? (paramsOf(fault).sensor as string)
      : fault.target.component;
  if (sensor === undefined)
    return failure(
      fault,
      "unknown-target",
      "sensor needs params.sensor or target.component",
    );
  const mode = paramsOf(fault).mode;
  if (mode === undefined)
    return failure(fault, "missing-param", "sensor needs params.mode");
  if (!SENSOR_MODES.some((m) => m === mode))
    return failure(
      fault,
      "bad-param",
      `params.mode must be one of ${SENSOR_MODES.join(", ")}`,
    );
  const atNs = nsParam(fault, ctx, "atNs", "atMs", true);
  if (!atNs.ok) return atNs;
  const durationNs = nsParam(fault, ctx, "durationNs", "durationMs", false);
  if (!durationNs.ok) return durationNs;
  const op: Extract<FaultOp, { kind: "sensor" }> = {
    kind: "sensor",
    sensor,
    mode: mode as (typeof SENSOR_MODES)[number],
    atNs: atNs.value as SimTime,
  };
  if (paramsOf(fault).magnitude !== undefined) {
    const magnitude = numberParam(fault, "magnitude");
    if (!magnitude.ok) return magnitude;
    op.magnitude = magnitude.value;
  }
  if (durationNs.value !== undefined) op.durationNs = durationNs.value;
  return ok([op]);
}

function targetOrParam(fault: Fault, key: string): string | undefined {
  const v = paramsOf(fault)[key];
  return typeof v === "string" ? v : fault.target.component;
}

function mountOp(fault: Fault): Step<FaultOp[]> {
  const mount = targetOrParam(fault, "mount");
  if (mount === undefined)
    return failure(
      fault,
      "unknown-target",
      "mount needs params.mount or target.component",
    );
  const pose = paramsOf(fault).pose;
  if (pose === undefined)
    return failure(fault, "missing-param", "mount needs params.pose");
  if (!isObject(pose))
    return failure(fault, "bad-param", "params.pose must be a pose object");
  return ok([{ kind: "mount", mount, pose: pose as unknown as Pose }]);
}

function paramKindOp(fault: Fault): Step<FaultOp[]> {
  const path = stringParam(fault, "path");
  return path.ok
    ? paramOp(fault, targetOrParam(fault, "target"), path.value)
    : path;
}

function swapPhaseOp(fault: Fault): Step<FaultOp[]> {
  const motor = targetOrParam(fault, "motor");
  return motor === undefined
    ? failure(
        fault,
        "unknown-target",
        "swap-phase needs params.motor or target.component",
      )
    : ok([{ kind: "swap-phase", motor }]);
}

/** Turns a stored fault into the operations the simulator applies. `enabled` is the caller's filter. */
export function faultToOps(
  fault: Fault,
  ctx: FaultCtx,
): Result<FaultOp[], FaultError> {
  switch (fault.kind) {
    case "reverse-polarity": {
      const part = requireComponent(fault, ctx);
      return part.ok ? ok([{ kind: "polarity", part: part.value }]) : part;
    }
    case "reversed-part":
      return reversedPartOps(fault, ctx);
    case "short":
      return shortOp(
        fault,
        ctx,
        positiveParam(fault, "ohms", DEFAULT_SHORT_OHMS),
      );
    case "overcurrent":
      return paramsOf(fault).ohms === undefined
        ? failure(fault, "needs-choice", "overcurrent needs params.ohms")
        : shortOp(fault, ctx, positiveParam(fault, "ohms"));
    case "missing-part": {
      const part = requireComponent(fault, ctx);
      return part.ok
        ? ok(
            ctx
              .partPins(part.value)
              .map((pin): FaultOp => ({ kind: "open", pin })),
          )
        : part;
    }
    case "open-wire":
    case "floating-input": {
      const pin = requirePin(fault, ctx);
      return pin.ok ? ok([{ kind: "open", pin: pin.value }]) : pin;
    }
    case "wrong-connection":
      return swapOp(fault, ctx);
    case "cold-solder":
      return coldJointOp(fault, ctx);
    case "stuck-level":
    case "boot-strap":
      return stuckOp(fault, ctx);
    case "wrong-value":
      return valueOp(fault, ctx);
    case "wrong-voltage":
    case "brownout":
      return supplyOp(fault, ctx);
    case "level-mismatch":
      return levelMismatchOp(fault, ctx);
    case "thermal":
      return thermalOp(fault);
    case "config":
      return configOp(fault);
    case "param":
      return paramKindOp(fault);
    case "mount":
      return mountOp(fault);
    case "sensor":
      return sensorOp(fault, ctx);
    case "swap-phase":
      return swapPhaseOp(fault);
  }
}

/** The ops of one fault as solver state; ids are `<fault id>#<index>`. */
export function faultStates(
  fault: Fault,
  ops: FaultOp[],
  at: SimTime,
): FaultState[] {
  return ops.map((op, i) => ({
    id: `${fault.id}#${i}`,
    op,
    appliedAt: at,
    causeId: fault.cause_id,
  }));
}
