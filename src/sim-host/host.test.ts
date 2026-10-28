// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createInlinePort, type RpcPort } from "@/protocol";
import type { DigitalLayer, ProgramImage, SimNetlist, SimRunOptions } from "@/sim/engine";
import { createInterpEngine } from "./engines/interp-engine";
import { createSimHandler } from "./handler";
import { createSimHost } from "./host";
import type { SimEv, SimReq } from "./protocol";

const NET: SimNetlist = {
  version: 1,
  docHash: "test",
  nets: [{ id: "GND" }],
  ground: "GND",
  parts: [{ id: "u1", descriptor: "uno-r3", params: {}, pins: {}, kind: "board" }],
  settings: { seed: 1, toleranceMode: "nominal", analog: { mode: "dc-event", stepNs: 1000 }, speed: 0 },
};

const PROGRAM: ProgramImage = {
  kind: "source",
  language: "arduino-cpp",
  files: [{ path: "main.ino", text: "void setup() { pinMode(13, OUTPUT); }\nvoid loop() { digitalWrite(13, HIGH); delay(10); digitalWrite(13, LOW); delay(10); }\n" }],
  entry: "main.ino",
};

const OPTS: SimRunOptions = {
  seed: 1,
  speed: 0,
  limits: { statements: Infinity, events: Infinity, outputBytes: Infinity },
  tier: "T1",
  endNs: 100_000_000,
};

const quiet: DigitalLayer = { load: () => [], onPin: () => undefined, partStates: () => [], stateHash: () => "" };

function rig() {
  const host = createSimHost({
    makePort: () =>
      createInlinePort(
        createSimHandler({
          diag: false,
          wallMs: () => performance.now(),
          schedule: (fn) => void setTimeout(fn, 0),
          makeEngine: (_p, _n, o) => createInterpEngine({ id: "u1", board: "uno-r3", language: "arduino", seed: o.seed }),
          makeDigital: () => quiet,
        }),
      ),
  });
  const events: SimEv[] = [];
  host.onEvent((e) => events.push(e));
  const until = async (state: string) => {
    const current = () => events.findLast((e) => e.t === "state");
    for (let i = 0; i < 200 && current()?.state !== state; i++) await new Promise((r) => setTimeout(r, 5));
  };
  return { host, events, until };
}

describe("sim host", () => {
  it("loads, runs to done and delivers events", async () => {
    const { host, events, until } = rig();
    const { diagnostics, runId } = await host.load(NET, OPTS, PROGRAM);
    expect(diagnostics).toEqual([]);
    expect(runId).toBe(1);
    await host.control("run");
    await until("done");
    expect(events.at(-1)).toMatchObject({ t: "state", state: "done", run: 1 });
    expect(events.some((e) => e.t === "frame")).toBe(true);
    expect(host.stats).toEqual({ runs: 1, restarts: 0, lastState: "done" });
  });

  it("kill, restart and load works again with a new run", async () => {
    const { host, events, until } = rig();
    await host.load(NET, OPTS, PROGRAM);
    await host.kill();
    expect(host.state).toBe("dead");
    await expect(host.control("run")).rejects.toMatchObject({ kind: "worker_killed" });
    await host.restart();
    expect(host.state).not.toBe("dead");
    await expect(host.control("run")).rejects.toThrow("load a program");
    const { runId } = await host.load(NET, OPTS, PROGRAM);
    expect(runId).toBe(2);
    await host.control("run");
    await until("done");
    expect(events.at(-1)).toMatchObject({ state: "done", run: 2 });
    expect(host.stats.restarts).toBe(1);
  });

  it("reports starting, then ready", async () => {
    const { host } = rig();
    expect(host.state).toBe("starting");
    await host.load(NET, OPTS, PROGRAM);
    expect(host.state).toBe("ready");
  });

  it("drops events of an older run and stops delivering after unsubscribe", async () => {
    let push: (ev: SimEv) => void = () => undefined;
    const port: RpcPort<SimReq, SimEv> = {
      call: async () => ({ v: 1, id: 1, t: "ack", result: { diagnostics: [] } }),
      on: (fn) => {
        push = fn;
        return () => undefined;
      },
      kill: async () => undefined,
      state: "ready",
      dropped: 0,
    };
    const host = createSimHost({ makePort: () => port });
    const seen: SimEv[] = [];
    const off = host.onEvent((e) => seen.push(e));
    await host.load(NET, OPTS, PROGRAM);
    await host.load(NET, OPTS, PROGRAM);
    push({ t: "state", run: 1, state: "done", at: 0 });
    push({ t: "state", run: 2, state: "running", at: 0 });
    expect(seen).toEqual([{ t: "state", run: 2, state: "running", at: 0 }]);
    off();
    push({ t: "state", run: 2, state: "done", at: 0 });
    expect(seen).toHaveLength(1);
  });
});
