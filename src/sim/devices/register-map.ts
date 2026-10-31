import type { SimTime } from "../core/clock.ts";
import type { BusEvent } from "../bus/index.ts";
import type { I2cDevice } from "../bus/i2c.ts";
import { type ExprAst, evalExpr, exprNames, parseExpr } from "./expr.ts";

export interface RegisterDef {
  addr: number;
  name: string;
  /** Size in bytes, big-endian. */
  width?: number;
  signed?: boolean;
  access: "r" | "w" | "rw";
  reset?: number;
  expr?: string;
  onWrite?: string;
  source?: "datasheet" | "descriptor.calibration" | "measured" | "assumed";
}

export interface DeviceDescriptor {
  id: string;
  bus: "i2c";
  addresses: number[];
  addressSelect?: { pin: string; low: number; high: number };
  requires?: { pins?: Record<string, "high" | "low">; supply?: { pin: string; min: number; max: number } };
  writeMode?: "increment" | "pairs";
  unmapped?: "zero" | "ff" | "nack";
  registers: RegisterDef[];
  state?: { name: string; reset: number }[];
  inputs: { name: string; unit: string; default: number; range: [number, number] }[];
  behaviours: { id: string; kind: "builtin"; ref: string }[];
  calibration?: number[];
  tier: "T1" | "T2";
  registry: string;
}

export interface DeviceContext {
  pin(name: string): "high" | "low" | "floating";
  supplyV(pin: string): number | undefined;
  nowNs(): SimTime;
  onEvent?(e: BusEvent): void;
}

export interface DeviceRuntime {
  regs: Uint8Array;
  state: Record<string, number>;
  inputs: Record<string, number>;
}

export type BehaviourFn = (
  d: DeviceRuntime,
  ev: { kind: "write"; addr: number; value: number } | { kind: "tick"; nowNs: number } | { kind: "input"; name: string },
) => void;

export type RegisterDevice = I2cDevice & { setInput(name: string, v: number): void; runtime: DeviceRuntime };

type Validation = { ok: true; value: DeviceDescriptor } | { ok: false; error: string };

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ON_WRITE = /^behaviour:(.+)$/;
const SOURCES = ["datasheet", "descriptor.calibration", "measured", "assumed"];
const ACCESS = ["r", "w", "rw"];

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isInt = (x: unknown, min: number, max: number): x is number => typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isText = (x: unknown): x is string => typeof x === "string" && x !== "";

function unknownKey(o: Record<string, unknown>, allowed: string[]): string | undefined {
  return Object.keys(o).find((k) => !allowed.includes(k));
}

const span = (r: RegisterDef): number => r.width ?? 1;

function checkRegister(r: unknown, at: number): string | null {
  const where = `register ${at}`;
  if (!isRecord(r)) return `${where}: not an object`;
  const bad = unknownKey(r, ["addr", "name", "width", "signed", "access", "reset", "expr", "onWrite", "source"]);
  if (bad !== undefined) return `${where}: unknown field ${bad}`;
  if (!isInt(r.addr, 0, 255)) return `${where}: addr out of range`;
  if (typeof r.name !== "string" || !IDENT.test(r.name)) return `${where}: bad name`;
  if (r.width !== undefined && !isInt(r.width, 1, 32)) return `${where}: width out of range`;
  if (r.addr + (r.width === undefined ? 1 : (r.width as number)) > 256) return `${where}: runs past 255`;
  if (r.signed !== undefined && typeof r.signed !== "boolean") return `${where}: signed must be a boolean`;
  if (typeof r.access !== "string" || !ACCESS.includes(r.access)) return `${where}: bad access`;
  if (r.reset !== undefined && !isNum(r.reset)) return `${where}: bad reset`;
  if (r.onWrite !== undefined && (typeof r.onWrite !== "string" || !ON_WRITE.test(r.onWrite))) return `${where}: bad onWrite`;
  if (r.source !== undefined && (typeof r.source !== "string" || !SOURCES.includes(r.source))) return `${where}: bad source`;
  if (r.expr !== undefined) {
    if (typeof r.expr !== "string") return `${where}: expr must be text`;
    const parsed = parseExpr(r.expr);
    if (!parsed.ok) return `${where}: expr ${parsed.error} at ${parsed.at}`;
  }
  return null;
}

/** First problem in the register table, or null. */
function checkRegisters(regs: RegisterDef[], names: Set<string>, behaviourIds: Set<string>): string | null {
  const owner = new Map<number, string>();
  for (const r of regs) {
    if (names.has(r.name)) return `duplicate name ${r.name}`;
    names.add(r.name);
    for (let a = r.addr; a < r.addr + span(r); a++) {
      if (owner.has(a)) return `register ${r.name} overlaps ${owner.get(a)} at ${a}`;
      owner.set(a, r.name);
    }
    const id = r.onWrite?.match(ON_WRITE)?.[1];
    if (id !== undefined && !behaviourIds.has(id)) return `register ${r.name}: onWrite names undeclared behaviour ${id}`;
  }
  return null;
}

function exprGraph(regs: RegisterDef[], names: Set<string>): { error: string } | { deps: Map<string, string[]> } {
  const deps = new Map<string, string[]>();
  for (const r of regs) {
    if (r.expr === undefined) continue;
    const parsed = parseExpr(r.expr);
    if (!parsed.ok) continue;
    const used = [...exprNames(parsed.ast)];
    const unknown = used.find((n) => !names.has(n));
    if (unknown !== undefined) return { error: `register ${r.name}: expr uses unknown name ${unknown}` };
    deps.set(r.name, used);
  }
  return { deps };
}

function hasCycle(deps: Map<string, string[]>): boolean {
  const done = new Set<string>();
  const walking = new Set<string>();
  const visit = (n: string): boolean => {
    if (walking.has(n)) return true;
    if (done.has(n)) return false;
    walking.add(n);
    const cyclic = (deps.get(n) ?? []).some(visit);
    walking.delete(n);
    done.add(n);
    return cyclic;
  };
  return [...deps.keys()].some(visit);
}

function checkTop(x: Record<string, unknown>): string | null {
  const bad = unknownKey(x, ["id", "bus", "addresses", "addressSelect", "requires", "writeMode", "unmapped", "registers", "state", "inputs", "behaviours", "calibration", "tier", "registry"]);
  if (bad !== undefined) return `unknown field ${bad}`;
  if (!isText(x.id)) return "bad id";
  if (x.bus !== "i2c") return "bus must be i2c";
  if (!Array.isArray(x.addresses) || x.addresses.length === 0 || !x.addresses.every((a) => isInt(a, 0, 127))) return "addresses must be 7-bit";
  if (x.tier !== "T1" && x.tier !== "T2") return "bad tier";
  if (!isText(x.registry)) return "bad registry";
  if (x.writeMode !== undefined && x.writeMode !== "increment" && x.writeMode !== "pairs") return "bad writeMode";
  if (x.unmapped !== undefined && x.unmapped !== "zero" && x.unmapped !== "ff" && x.unmapped !== "nack") return "bad unmapped";
  const sel = x.addressSelect;
  if (sel !== undefined && !(isRecord(sel) && unknownKey(sel, ["pin", "low", "high"]) === undefined && isText(sel.pin) && isInt(sel.low, 0, 127) && isInt(sel.high, 0, 127))) return "bad addressSelect";
  return checkRequires(x.requires);
}

function checkRequires(req: unknown): string | null {
  if (req === undefined) return null;
  if (!isRecord(req) || unknownKey(req, ["pins", "supply"]) !== undefined) return "bad requires";
  const { pins, supply } = req;
  if (pins !== undefined && !(isRecord(pins) && Object.values(pins).every((v) => v === "high" || v === "low"))) return "bad requires.pins";
  if (supply !== undefined && !(isRecord(supply) && unknownKey(supply, ["pin", "min", "max"]) === undefined && isText(supply.pin) && isNum(supply.min) && isNum(supply.max))) return "bad requires.supply";
  return null;
}

function checkLists(x: Record<string, unknown>, names: Set<string>, behaviourIds: Set<string>, isRegistered: (ref: string) => boolean): string | null {
  if (!Array.isArray(x.behaviours)) return "behaviours must be a list";
  for (const b of x.behaviours) {
    if (!isRecord(b) || unknownKey(b, ["id", "kind", "ref"]) !== undefined || !isText(b.id) || b.kind !== "builtin" || !isText(b.ref)) return "bad behaviour";
    if (behaviourIds.has(b.id)) return `duplicate behaviour ${b.id}`;
    behaviourIds.add(b.id);
    if (!isRegistered(b.ref)) return `unknown behaviour ref ${b.ref}`;
  }
  if (!Array.isArray(x.inputs)) return "inputs must be a list";
  for (const i of x.inputs) {
    if (!isRecord(i) || unknownKey(i, ["name", "unit", "default", "range"]) !== undefined) return "bad input";
    if (typeof i.name !== "string" || !IDENT.test(i.name) || typeof i.unit !== "string" || !isNum(i.default)) return "bad input";
    const range = i.range;
    if (!Array.isArray(range) || range.length !== 2 || !isNum(range[0]) || !isNum(range[1]) || range[0] > range[1]) return `input ${i.name}: bad range`;
    if (i.default < range[0] || i.default > range[1]) return `input ${i.name}: default outside range`;
    if (names.has(i.name)) return `duplicate name ${i.name}`;
    names.add(i.name);
  }
  if (x.state !== undefined) {
    if (!Array.isArray(x.state)) return "state must be a list";
    for (const s of x.state) {
      if (!isRecord(s) || unknownKey(s, ["name", "reset"]) !== undefined || typeof s.name !== "string" || !IDENT.test(s.name) || !isNum(s.reset)) return "bad state";
      if (names.has(s.name)) return `duplicate name ${s.name}`;
      names.add(s.name);
    }
  }
  return null;
}

export function validateDescriptor(x: unknown, isRegistered: (ref: string) => boolean = () => true): Validation {
  const fail = (error: string): Validation => ({ ok: false, error });
  if (!isRecord(x)) return fail("not an object");
  const top = checkTop(x);
  if (top !== null) return fail(top);
  const names = new Set<string>();
  const behaviourIds = new Set<string>();
  const lists = checkLists(x, names, behaviourIds, isRegistered);
  if (lists !== null) return fail(lists);
  if (!Array.isArray(x.registers)) return fail("registers must be a list");
  for (let i = 0; i < x.registers.length; i++) {
    const problem = checkRegister(x.registers[i], i);
    if (problem !== null) return fail(problem);
  }
  const regs = x.registers as RegisterDef[];
  const table = checkRegisters(regs, names, behaviourIds);
  if (table !== null) return fail(table);
  const graph = exprGraph(regs, names);
  if ("error" in graph) return fail(graph.error);
  if (hasCycle(graph.deps)) return fail("expr-cycle");
  const calibrated = regs.filter((r) => r.source === "descriptor.calibration").length;
  const cal = x.calibration;
  if (cal !== undefined && !(Array.isArray(cal) && cal.every(isNum))) return fail("bad calibration");
  if (((cal as number[] | undefined)?.length ?? 0) !== calibrated) return fail("calibration length does not match the calibration registers");
  return { ok: true, value: x as unknown as DeviceDescriptor };
}

function encode(v: number, bytes: number): bigint {
  return BigInt.asUintN(bytes * 8, BigInt(Math.trunc(v)));
}

type State = "idle" | "addressed" | "pointer-set" | "streaming";

export function createRegisterDevice(d: DeviceDescriptor, ctx: DeviceContext, behaviours: Record<string, BehaviourFn>): RegisterDevice {
  const runtime: DeviceRuntime = {
    regs: new Uint8Array(256),
    state: Object.fromEntries((d.state ?? []).map((s) => [s.name, s.reset])),
    inputs: Object.fromEntries(d.inputs.map((i) => [i.name, i.default])),
  };
  const byName = new Map(d.registers.map((r) => [r.name, r]));
  const owner = new Map<number, RegisterDef>();
  for (const r of d.registers) for (let a = r.addr; a < r.addr + span(r); a++) owner.set(a, r);
  const sampled = d.registers.filter((r) => r.expr !== undefined).map((r) => ({ def: r, ast: (parseExpr(r.expr as string) as { ast: ExprAst }).ast }));
  const exprs = new Map(sampled.map((s) => [s.def.name, s]));
  const handlers = new Map(d.behaviours.map((b) => [b.id, behaviours[b.ref]]));
  const writeMode = d.writeMode ?? "increment";
  const unmapped = d.unmapped ?? "ff";

  const store = (r: RegisterDef, v: number): void => {
    const n = span(r);
    let bits = encode(v, n);
    for (let i = n - 1; i >= 0; i--) {
      runtime.regs[r.addr + i] = Number(bits & 0xffn);
      bits >>= 8n;
    }
  };

  const load = (r: RegisterDef): number => {
    let bits = 0n;
    for (let i = 0; i < span(r); i++) bits = (bits << 8n) | BigInt(runtime.regs[r.addr + i]);
    return Number(r.signed ? BigInt.asIntN(span(r) * 8, bits) : bits);
  };

  let calibrationAt = 0;
  for (const r of d.registers) {
    const v = r.source === "descriptor.calibration" ? d.calibration?.[calibrationAt++] : r.reset;
    if (v !== undefined) store(r, v);
  }

  const sample = (): void => {
    const done = new Map<string, number>();
    const valueOf = (name: string): number | undefined => {
      if (name in runtime.inputs) return runtime.inputs[name];
      if (name in runtime.state) return runtime.state[name];
      const e = exprs.get(name);
      if (e === undefined) {
        const r = byName.get(name);
        return r === undefined ? undefined : load(r);
      }
      const cached = done.get(name);
      if (cached !== undefined) return cached;
      let v = evalExpr(e.ast, valueOf);
      if (!Number.isFinite(v)) {
        ctx.onEvent?.({ atNs: ctx.nowNs(), bus: d.id, kind: "expr-nan", detail: `${e.def.name} did not evaluate to a number` });
        v = e.def.reset ?? 0;
      }
      store(e.def, v);
      v = load(e.def);
      done.set(name, v);
      return v;
    };
    for (const s of sampled) valueOf(s.def.name);
  };

  const refuse = (kind: "part-not-powered" | "open-connection", detail: string): "nack" => {
    ctx.onEvent?.({ atNs: ctx.nowNs(), bus: d.id, kind, detail });
    return "nack";
  };

  const unmetRequirement = (): "nack" | null => {
    const supply = d.requires?.supply;
    if (supply !== undefined) {
      const v = ctx.supplyV(supply.pin);
      if (v === undefined || v < supply.min || v > supply.max) return refuse("part-not-powered", `${supply.pin} is ${v ?? "unconnected"} V, needs ${supply.min} to ${supply.max} V`);
    }
    for (const [pin, level] of Object.entries(d.requires?.pins ?? {})) {
      if (ctx.pin(pin) !== level) return refuse("open-connection", `${pin} is not ${level}`);
    }
    return null;
  };

  const notify = (ev: Parameters<BehaviourFn>[1]): void => {
    for (const fn of handlers.values()) fn?.(runtime, ev);
  };

  const currentAddresses = (): number[] => {
    const sel = d.addressSelect;
    return sel === undefined ? [d.addresses[0]] : [ctx.pin(sel.pin) === "high" ? sel.high : sel.low];
  };

  let state: State = "idle";
  let reading = false;
  let ptr = 0;
  let expectPointer = true;

  const writeByte = (r: RegisterDef | undefined, byte: number): void => {
    if (r === undefined || r.access === "r") return;
    runtime.regs[ptr] = byte;
    const id = r.onWrite?.match(ON_WRITE)?.[1];
    if (id !== undefined) handlers.get(id)?.(runtime, { kind: "write", addr: ptr, value: byte });
  };

  return {
    get addresses() {
      return currentAddresses();
    },

    start(addr7, read) {
      if (!currentAddresses().includes(addr7)) return "nack";
      const unmet = unmetRequirement();
      if (unmet !== null) return unmet;
      notify({ kind: "tick", nowNs: ctx.nowNs() });
      reading = read;
      state = "addressed";
      expectPointer = !read;
      if (read) sample();
      return "ack";
    },

    write(byte) {
      if (state === "idle" || reading) return "nack";
      if (expectPointer) {
        if (unmapped === "nack" && !owner.has(byte)) return "nack";
        ptr = byte;
        state = "pointer-set";
        expectPointer = false;
        return "ack";
      }
      writeByte(owner.get(ptr), byte);
      if (writeMode === "pairs") expectPointer = true;
      else ptr = (ptr + 1) & 0xff;
      state = "streaming";
      return "ack";
    },

    read() {
      if (state === "idle" || !reading) return 0xff;
      state = "streaming";
      const r = owner.get(ptr);
      const byte = r === undefined ? (unmapped === "zero" ? 0 : 0xff) : r.access === "w" ? 0 : runtime.regs[ptr];
      ptr = (ptr + 1) & 0xff;
      return byte;
    },

    stop() {
      state = "idle";
    },

    setInput(name, v) {
      const spec = d.inputs.find((i) => i.name === name);
      if (spec === undefined || Number.isNaN(v)) return;
      runtime.inputs[name] = Math.min(Math.max(v, spec.range[0]), spec.range[1]);
      notify({ kind: "input", name });
    },

    runtime,
  };
}
