import type { SimTime } from "../core/clock.ts";
import { type SimDiagnostic, simDiag } from "../core/diagnostic.ts";
import { StateHasher } from "../core/hash.ts";
import { UnionFind } from "../analog/graph.ts";
import type { DigitalLayer, PartState, SimNetlist, SimPart } from "../engine.ts";
import { type Logic, type PinDriver, outputContention, resolve } from "./resolve.ts";

/** Board pins that sit on the high rail. */
const POWER_PIN = /^(P?5V|P?3V3|VIN)$/;

const NOT_MODELLED = "needs the solver";

/** DP-1 reads the two ends of these parts by pin id. */
const ENDS = { led: ["A", "K"], buzzer: ["PLUS", "MINUS"] } as const;

type Driver = PinDriver & { duty?: number };

interface PinWrite {
  level: 0 | 1 | "Z";
  duty?: number;
}

interface Signal {
  level: Logic;
  duty: number;
}

interface Closure {
  part: string;
  a: string;
  b: string;
}

/** The layer plus what DP-1 needs beyond `DigitalLayer`: button presses, net levels and run-time diagnostics. */
export type DigitalNets = DigitalLayer & {
  press(part: string, pressed: boolean): void;
  levelOf(net: string): Logic;
  diagnostics(): SimDiagnostic[];
};

/** Level of each rail net: the ground net is low, a net holding a board power pin is high. */
export function railLevels(net: SimNetlist): Map<string, 0 | 1> {
  const rails = new Map<string, 0 | 1>();
  for (const part of net.parts) {
    if (part.kind !== "board") continue;
    for (const [pin, target] of Object.entries(part.pins)) if (target !== null && POWER_PIN.test(pin)) rails.set(target, 1);
  }
  rails.set(net.ground, 0);
  return rails;
}

const connected = (part: SimPart): string[] => [...new Set(Object.values(part.pins).filter((n): n is string => n !== null))];

const effective = (w: PinWrite): Logic => (w.duty === undefined ? w.level : w.duty > 0 ? 1 : 0);

class Nets implements DigitalNets {
  private net: SimNetlist | null = null;
  private groups = new UnionFind();
  private rails = new Map<string, 0 | 1>();
  private fixed = new Map<string, Driver[]>();
  private buttons: Closure[] = [];
  private pinNets = new Map<string, string>();
  private writes = new Map<string, PinWrite>();
  private pressed = new Set<string>();
  private tones = new Map<string, { rise: SimTime | null; hz: number }>();
  private problems: SimDiagnostic[] = [];
  private contended = new Set<string>();

  load(net: SimNetlist): SimDiagnostic[] {
    this.net = net;
    this.groups = new UnionFind();
    this.fixed = new Map();
    this.buttons = [];
    this.pinNets = new Map();
    this.writes = new Map();
    this.pressed = new Set();
    this.tones = new Map();
    this.problems = [];
    this.contended = new Set();
    this.rails = railLevels(net);
    const diagnostics: SimDiagnostic[] = [];

    for (const n of net.nets) this.groups.find(n.id);
    const resistors = net.parts.filter((p) => p.kind === "resistor").map((p) => ({ id: p.id, nets: connected(p) }));
    for (const r of resistors) {
      if (r.nets.length === 2 && !r.nets.some((n) => this.rails.has(n))) this.groups.union(r.nets[0], r.nets[1]);
    }

    for (const [rail, level] of this.rails) this.fix(rail, { id: `rail:${rail}`, level, strength: "strong" });
    for (const r of resistors) {
      const rail = r.nets.filter((n) => this.rails.has(n));
      if (r.nets.length === 2 && rail.length === 1) {
        const other = r.nets.find((n) => n !== rail[0])!;
        this.fix(other, { id: r.id, level: this.rails.get(rail[0])!, strength: "weak" });
      }
    }

    const boardRoots = new Set<string>();
    for (const part of net.parts) {
      if (part.kind !== "board") continue;
      for (const [pin, target] of Object.entries(part.pins)) {
        if (target === null) continue;
        if (!this.pinNets.has(pin)) this.pinNets.set(pin, target);
        boardRoots.add(this.groups.find(target));
      }
    }

    for (const part of net.parts) {
      if (part.kind === "led" || part.kind === "buzzer") {
        if (ENDS[part.kind].some((end) => part.pins[end] == null)) diagnostics.push(simDiag("open-connection", "warning", { part: part.id }));
      } else if (part.kind === "button") {
        const nets = connected(part);
        if (nets.length !== 2) continue;
        const [a, b] = nets;
        this.buttons.push({ part: part.id, a, b });
        const roots = [this.groups.find(a), this.groups.find(b)];
        const driven = roots.some((root) => boardRoots.has(root) || this.railOf(root) !== undefined);
        if (!driven) diagnostics.push(simDiag("inert-button", "note", { part: part.id }));
      }
    }
    return diagnostics;
  }

  onPin(pin: string, level: 0 | 1 | "Z", duty: number | undefined, at: SimTime): void {
    const target = this.pinNets.get(pin);
    if (target === undefined) return;
    const write: PinWrite = duty === undefined ? { level } : { level, duty };
    const before = this.writes.get(pin);
    this.writes.set(pin, write);
    if (effective(write) === 1 && (before === undefined || effective(before) !== 1)) this.noteRise(pin, at);
    const drivers = this.driversOf(this.groups.find(target));
    if (!this.contended.has(target)) {
      const contention = outputContention(target, drivers);
      if (contention) {
        this.contended.add(target);
        this.problems.push(contention);
      }
    }
  }

  press(part: string, pressed: boolean): void {
    if (pressed) this.pressed.add(part);
    else this.pressed.delete(part);
  }

  levelOf(net: string): Logic {
    return this.signal(net).level;
  }

  diagnostics(): SimDiagnostic[] {
    return [...this.problems];
  }

  partStates(): PartState[] {
    const states: PartState[] = [];
    for (const part of this.net?.parts ?? []) {
      switch (part.kind) {
        case "board":
        case "resistor":
          break;
        case "led":
          states.push(this.led(part));
          break;
        case "buzzer":
          states.push(this.buzzer(part));
          break;
        case "button":
          states.push({ part: part.id, kind: "button", pressed: this.pressed.has(part.id) });
          break;
        default:
          states.push({ part: part.id, kind: "not-modelled", reason: NOT_MODELLED });
      }
    }
    return states;
  }

  stateHash(): string {
    const h = new StateHasher();
    for (const n of this.net?.nets ?? []) {
      const { level, duty } = this.signal(n.id);
      h.obj([n.id, level, duty]);
    }
    h.obj([...this.pressed].sort());
    h.obj([...this.tones].sort(([a], [b]) => (a < b ? -1 : 1)).map(([pin, t]) => [pin, t.rise, t.hz]));
    return h.hex();
  }

  private led(part: SimPart): PartState {
    const [anode, cathode] = ENDS.led.map((end) => part.pins[end] ?? null);
    const lit = anode !== null && cathode !== null && this.signal(anode).level === 1 && this.signal(cathode).level === 0;
    return { part: part.id, kind: "led", lit, brightness: lit ? this.signal(anode).duty : 0, provenance: "approximation", tier: "T0" };
  }

  private buzzer(part: SimPart): PartState {
    const [plus, minus] = ENDS.buzzer.map((end) => part.pins[end] ?? null);
    const hz = plus === null ? 0 : this.toneAt(plus);
    const on = plus !== null && minus !== null && this.signal(minus).level === 0 && (this.signal(plus).level === 1 || hz > 0);
    return { part: part.id, kind: "buzzer", on, hz: on ? hz : 0, provenance: "approximation", tier: "T0" };
  }

  private fix(net: string, driver: Driver): void {
    const root = this.groups.find(net);
    const list = this.fixed.get(root);
    if (list) list.push(driver);
    else this.fixed.set(root, [driver]);
  }

  private railOf(root: string): 0 | 1 | undefined {
    for (const [rail, level] of this.rails) if (this.groups.find(rail) === root) return level;
    return undefined;
  }

  private driversOf(root: string): Driver[] {
    const out = [...(this.fixed.get(root) ?? [])];
    for (const [pin, write] of this.writes) {
      const target = this.pinNets.get(pin);
      if (target !== undefined && this.groups.find(target) === root) out.push({ id: pin, level: effective(write), strength: "strong", duty: write.duty });
    }
    for (const b of this.buttons) {
      if (!this.pressed.has(b.part)) continue;
      const [ra, rb] = [this.groups.find(b.a), this.groups.find(b.b)];
      const other = root === ra ? rb : root === rb ? ra : undefined;
      const level = other === undefined ? undefined : this.railOf(other);
      if (level !== undefined && this.railOf(root) === undefined) out.push({ id: b.part, level, strength: "strong" });
    }
    return out;
  }

  private signal(net: string): Signal {
    const drivers = this.driversOf(this.groups.find(net));
    const level = resolve(drivers);
    const driver = drivers.find((d) => d.strength === "strong" && d.level === level && d.duty !== undefined);
    return { level, duty: driver?.duty ?? 1 };
  }

  private noteRise(pin: string, at: SimTime): void {
    const tone = this.tones.get(pin) ?? { rise: null, hz: 0 };
    if (tone.rise !== null && at > tone.rise) tone.hz = Math.round(1e9 / (at - tone.rise));
    tone.rise = at;
    this.tones.set(pin, tone);
  }

  private toneAt(net: string): number {
    const root = this.groups.find(net);
    for (const [pin, tone] of this.tones) {
      const target = this.pinNets.get(pin);
      if (target !== undefined && this.groups.find(target) === root && tone.hz > 0) return tone.hz;
    }
    return 0;
  }
}

export function createDigitalNets(): DigitalNets {
  return new Nets();
}
