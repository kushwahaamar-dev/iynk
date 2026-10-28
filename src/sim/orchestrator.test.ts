// @vitest-environment node
import { describe, expect, it } from "vitest";
import { rng } from "../core/prng.ts";
import { StateHasher } from "./core/hash.ts";
import {
  RANK,
  type DigitalLayer,
  type Engine,
  type EventSink,
  type Phase,
  type PartState,
  type SimEvent,
  type SimNetlist,
  type SimRunOptions,
  type SliceBudget,
} from "./engine.ts";
import { createOrchestrator } from "./orchestrator.ts";
import { before } from "./queue.ts";

type Scripted = Omit<SimEvent, "seq" | "src">;

class FakeEngine implements Engine {
  readonly seen: SimEvent[] = [];
  private sink: EventSink | null = null;
  private script: Scripted[];

  constructor(
    readonly id: string,
    readonly rank: number,
    script: Scripted[] = [],
  ) {
    this.script = [...script].sort((a, b) => a.at - b.at);
  }

  attach(sink: EventSink): void {
    this.sink = sink;
  }

  nextDue(): number | null {
    return this.script[0]?.at ?? null;
  }

  advanceTo(horizon: number): { reached: number; stoppedEarly: boolean } {
    while (this.script.length > 0 && this.script[0].at <= horizon) {
      this.sink?.emit({ ...this.script.shift()!, src: this.id });
    }
    return { reached: horizon, stoppedEarly: false };
  }

  onEvent(e: SimEvent): void {
    this.seen.push(e);
  }

  stateHash(): string {
    return new StateHasher().str(this.id).obj(this.seen.map((e) => [e.at, e.phase, e.rank, e.seq, e.src])).hex();
  }
}

class StuckEngine extends FakeEngine {
  override nextDue(): number | null {
    return 0;
  }
}

class FakeDigital implements DigitalLayer {
  readonly pins: [string, 0 | 1 | "Z", number | undefined, number][] = [];
  load = () => [];
  onPin(pin: string, level: 0 | 1 | "Z", duty: number | undefined, at: number): void {
    this.pins.push([pin, level, duty, at]);
  }
  partStates = (): PartState[] => [];
  stateHash = () => new StateHasher().obj(this.pins).hex();
}

const OPTS: SimRunOptions = {
  seed: 1,
  speed: 0,
  limits: { statements: 400_000, events: 100_000, outputBytes: 65_536 },
  tier: "T1",
};

const NETLIST: SimNetlist = {
  version: 1,
  docHash: "x",
  nets: [{ id: "gnd" }, { id: "n1" }],
  ground: "gnd",
  parts: [{ id: "r1", descriptor: "core.resistor", params: {}, pins: { a: "n1", b: "gnd" }, kind: "resistor" }],
  settings: { seed: 1, toleranceMode: "nominal", analog: { mode: "dc-event", stepNs: 1000 }, speed: 0 },
};

const FOREVER: SliceBudget = { shouldYield: () => false, work: { statements: Infinity, events: Infinity, outputBytes: Infinity } };

const ev = (at: number, phase: Phase, rank: number, kind = "x", payload: unknown = null): Scripted => ({ at, phase, rank, kind, payload });

function loaded(engines: Engine[], digital = new FakeDigital()) {
  const o = createOrchestrator({ engines, digital });
  o.load(NETLIST, OPTS);
  return o;
}

describe("event order", () => {
  it("delivers events in the order of (at, phase, rank, seq) on 1,000 random schedules", () => {
    const r = rng(0x5eed, "orchestrator-order");
    for (let run = 0; run < 1000; run++) {
      const a: Scripted[] = [];
      const b: Scripted[] = [];
      for (let i = 0, n = 1 + (r.next() % 12); i < n; i++) {
        const e = ev(r.next() % 5, (r.next() % 7) as Phase, [10, 20, 30, 35, 40][r.next() % 5]);
        (r.next() % 2 === 0 ? a : b).push(e);
      }
      const watcher = new FakeEngine("watcher", RANK.probe);
      const o = loaded([new FakeEngine("a", RANK.mcu, a), new FakeEngine("b", RANK.mcu, b), watcher]);
      o.runUntil(10, FOREVER);
      const expected = [...watcher.seen].sort((x, y) => (before(x, y) ? -1 : 1));
      expect(watcher.seen).toEqual(expected);
      expect(watcher.seen).toHaveLength(a.length + b.length);
      expect(new Set(watcher.seen.map((e) => e.seq)).size).toBe(watcher.seen.length);
    }
  });

  it("runs the phases P0 to P6 in order inside one timestamp", () => {
    const phases: Phase[] = [6, 3, 0, 5, 1, 4, 2];
    const watcher = new FakeEngine("watcher", RANK.probe);
    const o = loaded([new FakeEngine("src", RANK.mcu, phases.map((p) => ev(100, p, RANK.mcu))), watcher]);
    o.runUntil(200, FOREVER);
    expect(watcher.seen.map((e) => e.phase)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("orders events of one time, phase and rank by seq", () => {
    const watcher = new FakeEngine("watcher", RANK.probe);
    const script = [1, 2, 3].map((n) => ev(50, 2, RANK.mcu, "x", n));
    const o = loaded([new FakeEngine("src", RANK.mcu, script), watcher]);
    o.runUntil(60, FOREVER);
    expect(watcher.seen.map((e) => e.payload)).toEqual([1, 2, 3]);
  });

  it("keeps RANK.ros between mcu and bus", () => {
    expect(RANK.ros).toBe(35);
    expect(RANK.mcu).toBeLessThan(RANK.ros);
    expect(RANK.ros).toBeLessThan(RANK.bus);
  });
});

describe("checkpoints", () => {
  const script = (id: string): Scripted[] =>
    [200_000_000, 900_000_000, 1_500_000_000, 2_100_000_000].map((at, i) => ev(at, 2, RANK.mcu, "x", `${id}${i}`));

  it("writes one every 1,000 ms of simulated time", () => {
    const o = loaded([new FakeEngine("a", RANK.mcu, script("a"))]);
    o.runUntil(2_500_000_000, FOREVER);
    expect(o.checkpoints.map((c) => c.at)).toEqual([1_000_000_000, 2_000_000_000]);
  });

  it("gives equal hashes when same-rank engines are registered in either order (SA-08)", () => {
    const run = (swap: boolean) => {
      const engines = [new FakeEngine("a", RANK.mcu, script("a")), new FakeEngine("b", RANK.mcu, script("b"))];
      const o = loaded(swap ? engines.reverse() : engines);
      o.runUntil(3_000_000_000, FOREVER);
      return o.checkpoints;
    };
    const first = run(false);
    expect(first).toHaveLength(3);
    expect(run(true)).toEqual(first);
  });

  it("differs when an engine saw another event", () => {
    const run = (withInput: boolean) => {
      const o = loaded([new FakeEngine("a", RANK.mcu, script("a")), new FakeEngine("w", RANK.probe)]);
      if (withInput) o.inject({ kind: "control", target: "run", value: 1 });
      o.runUntil(1_000_000_000, FOREVER);
      return o.checkpoints[0].hash;
    };
    expect(run(false)).toBe(run(false));
    expect(run(true)).not.toBe(run(false));
  });
});

describe("inject", () => {
  it("stamps now and a rising seq and delivers at P0", () => {
    const watcher = new FakeEngine("watcher", RANK.probe);
    const o = loaded([watcher]);
    o.runUntil(5000, FOREVER);
    o.inject({ kind: "pin", target: "btn", value: 1 });
    o.inject({ kind: "analog", target: "pot", value: 0.5 });
    expect(o.inputs.map((i) => [i.at, i.kind, i.target])).toEqual([
      [5000, "pin", "btn"],
      [5000, "analog", "pot"],
    ]);
    expect(o.inputs[1].seq).toBeGreaterThan(o.inputs[0].seq);
    o.runUntil(6000, FOREVER);
    expect(watcher.seen.map((e) => [e.at, e.phase, e.src, e.kind])).toEqual([
      [5000, 0, "host", "pin"],
      [5000, 0, "host", "analog"],
    ]);
  });
});

describe("step", () => {
  const sample = () => [new FakeEngine("a", RANK.mcu, [ev(300_000_000, 2, RANK.mcu), ev(2_400_000_000, 2, RANK.mcu)])];

  it("step('ns') equals runUntil of the same time", () => {
    const a = loaded(sample());
    const b = loaded(sample());
    expect(a.step("ns", 2_500_000_000)).toEqual(b.runUntil(2_500_000_000, FOREVER));
    expect(a.checkpoints).toEqual(b.checkpoints);
    expect(a.now).toBe(b.now);
    expect(a.step("ns", 1_000_000).now).toBe(2_501_000_000);
  });

  it("step('event', 3) delivers exactly three events and stops at the third one's time", () => {
    const watcher = new FakeEngine("watcher", RANK.probe);
    const src = new FakeEngine("src", RANK.mcu, [10, 20, 20, 30, 40].map((at) => ev(at, 2, RANK.mcu)));
    const o = loaded([src, watcher]);
    expect(o.step("event", 3)).toEqual({ reason: "target", now: 20 });
    expect(watcher.seen.map((e) => e.at)).toEqual([10, 20, 20]);
    expect(o.step("event", 1).now).toBe(30);
  });

  it("step('event') on an empty queue goes to the next due time", () => {
    const o = loaded([new FakeEngine("src", RANK.mcu, [ev(7_000_000, 2, RANK.mcu)]), new FakeEngine("w", RANK.probe)]);
    expect(o.step("event", 1).now).toBe(7_000_000);
    expect(o.step("event", 1).reason).toBe("done");
    expect(o.state).toBe("done");
  });

  it("does not support the other units", () => {
    const o = loaded([]);
    for (const unit of ["cycle", "line", "statement"] as const) {
      expect(o.step(unit, 1)).toEqual({ reason: "unsupported", now: 0 });
    }
  });
});

describe("running", () => {
  it("does nothing for a target at or below now", () => {
    const o = loaded([]);
    o.runUntil(1000, FOREVER);
    expect(o.runUntil(500, FOREVER)).toEqual({ reason: "target", now: 1000 });
  });

  it("pauses when the budget asks to yield and resumes from there", () => {
    const o = loaded([]);
    let calls = 0;
    const budget: SliceBudget = { ...FOREVER, shouldYield: () => ++calls === 3 };
    expect(o.runUntil(10_000_000, budget)).toEqual({ reason: "budget", now: 3_000_000 });
    expect(o.state).toBe("paused");
    expect(o.runUntil(10_000_000, FOREVER)).toEqual({ reason: "target", now: 10_000_000 });
  });

  it("pauses when the event limit is reached", () => {
    const src = new FakeEngine("src", RANK.mcu, [1, 2, 3].map((n) => ev(n * 2_000_000, 2, RANK.mcu)));
    const o = loaded([src, new FakeEngine("w", RANK.probe)]);
    const budget: SliceBudget = { ...FOREVER, work: { ...FOREVER.work, events: 2 } };
    expect(o.runUntil(10_000_000, budget).reason).toBe("budget");
    expect(o.now).toBe(4_000_000);
  });

  it("is done at endNs and stays done", () => {
    const o = createOrchestrator({ engines: [], digital: new FakeDigital() });
    o.load(NETLIST, { ...OPTS, endNs: 5_000_000 });
    expect(o.runUntil(9_000_000, FOREVER)).toEqual({ reason: "done", now: 5_000_000 });
    expect(o.state).toBe("done");
    expect(o.runUntil(9_000_000, FOREVER).reason).toBe("done");
  });

  it("halts with no-time-progress when the clock does not move", () => {
    const o = loaded([new StuckEngine("stuck", RANK.mcu)]);
    expect(o.runUntil(1000, FOREVER)).toEqual({ reason: "halted", now: 0 });
    expect(o.state).toBe("halted");
    expect(o.diagnostics.map((d) => d.id)).toEqual(["no-time-progress"]);
    expect(o.runUntil(1000, FOREVER).reason).toBe("halted");
  });

  it("restarts from zero on load", () => {
    const o = loaded([new StuckEngine("stuck", RANK.mcu)]);
    o.runUntil(1000, FOREVER);
    expect(o.load(NETLIST, OPTS).ok).toBe(true);
    expect(o.state).toBe("idle");
    expect(o.now).toBe(0);
    expect(o.diagnostics).toEqual([]);
  });
});

describe("pins", () => {
  it("resolves an MCU pin write at P3 and records the edge", () => {
    const digital = new FakeDigital();
    const write = (at: number, level: 0 | 1) => ev(at, 2, RANK.mcu, "pin", { pin: "D12", level });
    const mcu = new FakeEngine("mcu", RANK.mcu, [write(100, 1), write(200, 1), write(300, 0)]);
    const watcher = new FakeEngine("watcher", RANK.probe);
    const o = loaded([mcu, watcher], digital);
    o.runUntil(1000, FOREVER);
    expect(digital.pins).toEqual([
      ["D12", 1, undefined, 100],
      ["D12", 1, undefined, 200],
      ["D12", 0, undefined, 300],
    ]);
    expect(o.pinEdges()).toEqual([
      { at: 100, net: "D12", level: 1 },
      { at: 300, net: "D12", level: 0 },
    ]);
    expect(watcher.seen.filter((e) => e.phase === 2)).toHaveLength(3);
    expect(watcher.seen.filter((e) => e.phase === 3)).toHaveLength(0);
  });

  it("passes PWM duty to the digital layer", () => {
    const digital = new FakeDigital();
    const mcu = new FakeEngine("mcu", RANK.mcu, [ev(10, 2, RANK.mcu, "pin", { pin: "D9", level: 1, duty: 0.25, hz: 490 })]);
    loaded([mcu], digital).runUntil(100, FOREVER);
    expect(digital.pins).toEqual([["D9", 1, 0.25, 10]]);
  });
});

describe("load", () => {
  const withNet = (patch: Partial<SimNetlist>): SimNetlist => ({ ...NETLIST, ...patch });
  const ids = (net: SimNetlist) => {
    const o = createOrchestrator({ engines: [], digital: new FakeDigital() });
    const result = o.load(net, OPTS);
    return { ok: result.ok, ids: result.diagnostics.map((d) => d.id), state: o.state };
  };

  it("accepts a good netlist and lists the models", () => {
    const o = createOrchestrator({ engines: [], digital: new FakeDigital() });
    expect(o.load(NETLIST, OPTS)).toEqual({ ok: true, diagnostics: [], models: ["core.resistor"] });
  });

  it("rejects an unknown ground net", () => {
    expect(ids(withNet({ ground: "nope" }))).toEqual({ ok: false, ids: ["unknown-ground"], state: "halted" });
  });

  it("rejects duplicate part ids", () => {
    expect(ids(withNet({ parts: [...NETLIST.parts, ...NETLIST.parts] })).ids).toEqual(["duplicate-part"]);
  });

  it("rejects a pin on a missing net", () => {
    const parts = [{ ...NETLIST.parts[0], pins: { a: "ghost", b: null } }];
    expect(ids(withNet({ parts })).ids).toEqual(["missing-net"]);
  });

  it("rejects more than 2,000 parts", () => {
    const parts = Array.from({ length: 2001 }, (_, i) => ({ ...NETLIST.parts[0], id: `r${i}` }));
    expect(ids(withNet({ parts })).ids).toEqual(["netlist-too-large"]);
  });
});

describe("analog hook", () => {
  it("says every analog quantity is not modelled yet", () => {
    const o = loaded([]);
    expect(o.analog.read("n1")).toEqual({ modelled: false, reason: "not modelled yet" });
  });
});
