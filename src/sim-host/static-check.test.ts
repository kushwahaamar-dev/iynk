// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createInlinePort } from "@/protocol";
import type { DigitalLayer, SimNetlist } from "@/sim/engine";
import { describePart, netlistOf } from "@/sim/faults/circuit.fixture";
import { defaultRules } from "@/sim/faults/rules";
import type { Rule } from "@/sim/faults/types";
import { createInterpEngine } from "./engines/interp-engine";
import { createSimHandler } from "./handler";
import { createSimHost } from "./host";
import type { SimEv } from "./protocol";

const quiet: DigitalLayer = { load: () => [], onPin: () => undefined, partStates: () => [], stateHash: () => "" };

const withOpenPin = (): SimNetlist => netlistOf([
  { id: "uno", ref: "uno-r3", wires: { P5V: "n_5v", GND: "gnd" } },
  { id: "oled", ref: "ssd1306", wires: { GND: "gnd", SDA: "n_sda", SCL: "n_scl" } },
]);

const OPTS = {
  seed: 1,
  speed: 0,
  limits: { statements: Infinity, events: Infinity, outputBytes: Infinity },
  tier: "T1" as const,
  endNs: 20_000_000,
};

const PROGRAM = {
  kind: "source" as const,
  language: "arduino-cpp" as const,
  files: [{ path: "main.ino", text: "void setup() { pinMode(13, OUTPUT); }\nvoid loop() { digitalWrite(13, HIGH); delay(10); }\n" }],
  entry: "main.ino",
};

function rig(rules: () => readonly Rule[] = defaultRules) {
  const host = createSimHost({
    makePort: () =>
      createInlinePort(
        createSimHandler({
          diag: false,
          wallMs: () => performance.now(),
          schedule: (fn) => void setTimeout(fn, 0),
          makeEngine: (_p, _n, o) => createInterpEngine({ id: "uno", board: "uno-r3", language: "arduino", seed: o.seed }),
          makeDigital: () => quiet,
          faults: { describe: describePart, rules },
        }),
      ),
  });
  const events: SimEv[] = [];
  host.onEvent((e) => events.push(e));
  return { host, events };
}

const settle = async (done: () => boolean) => {
  for (let i = 0; i < 200 && !done(); i++) await new Promise((r) => setTimeout(r, 5));
};

describe("host.staticCheck", () => {
  it("round-trips the findings for a netlist with one open pin", async () => {
    const { host } = rig();
    const reply = await host.staticCheck(withOpenPin(), {});
    expect(reply.note).toBeUndefined();
    expect(reply.findings.map((f) => [f.ruleId, f.targets[0]])).toContainEqual(["rule:open-pin@1", { kind: "pin", id: "oled", pin: "VCC" }]);
    expect(structuredClone(reply)).toEqual(reply);
  });

  it("drops the result of a request that a newer one replaced", async () => {
    const { host } = rig();
    const first = host.staticCheck(withOpenPin(), {});
    const second = host.staticCheck(withOpenPin(), {});
    expect((await first).note).toBe("check.skipped");
    expect((await second).findings.length).toBeGreaterThan(0);
  });

  it("reports a rule that throws in errors and still runs the others", async () => {
    const boom: Rule = {
      id: "rule:boom@1",
      layer: "static",
      causeId: "open-connection",
      symptomId: "part-dead",
      needs: [],
      enabled: true,
      check: () => {
        throw new Error("broken rule");
      },
    };
    const { host } = rig(() => [...defaultRules(), boom]);
    const reply = await host.staticCheck(withOpenPin(), {});
    expect(reply.errors).toEqual([{ ruleId: "rule:boom@1", message: "broken rule" }]);
    expect(reply.findings.length).toBeGreaterThan(0);
  });

  it("returns an empty list with a note when the worker is gone", async () => {
    const { host } = rig();
    await host.kill();
    expect(await host.staticCheck(withOpenPin(), {})).toEqual({ findings: [], skipped: {}, errors: [], note: "check.skipped" });
  });
});

describe("findings events", () => {
  it("posts one findings event at run end for a display with a pin open", async () => {
    const { host, events } = rig();
    await host.load(withOpenPin(), OPTS, PROGRAM);
    await host.resume();
    await settle(() => events.some((e) => e.t === "state" && e.state === "done"));
    const posted = events.flatMap((e) => (e.t === "event" && e.event.kind === "findings" ? [e.event.findings] : []));
    expect(posted).toHaveLength(1);
    expect(posted[0].map((f) => f.ruleId)).toContain("rule:open-pin@1");
  });
});

