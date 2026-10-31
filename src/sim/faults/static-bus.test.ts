// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Descriptor } from "../../parts/descriptor.ts";
import { codeOf, describePart, netlistOf, type PartSpec } from "./circuit.fixture.ts";
import { buildNetView } from "./netlist-view.ts";
import { runRules } from "./rules.ts";
import { BUS_RULES, I2C_LIMITS } from "./static-bus.ts";
import type { CodeFacts } from "./types.ts";

const unoWithBus = (remappable = false) =>
  (id: string): Descriptor | undefined => {
    const d = describePart(id);
    if (!d || d.identity.kind !== "board") return d;
    return {
      ...d,
      power: { outputs: [{ id: "5v", pin: "P5V", nominal: { unit: "V", value: 5 } }] },
      protocols: [{ id: "i2c0", kind: "i2c", role: "master", pins: { sda: "SDA", scl: "SCL" }, params: remappable ? { remappable } : {}, status: "modelled" }],
    };
  };

const withOwnPullups = (id: string): Descriptor | undefined => {
  const d = unoWithBus()(id);
  return d?.identity.category === "display"
    ? { ...d, protocols: d.protocols?.map((p) => ({ ...p, params: { ...p.params, onboard_pullup_ohms: 10_000 } })) }
    : d;
};

const run = (specs: PartSpec[], opts: { ohms?: Record<string, number>; code?: CodeFacts; describe?: (id: string) => Descriptor | undefined } = {}, ids?: string[]) => {
  const net = netlistOf(specs);
  for (const [id, ohms] of Object.entries(opts.ohms ?? {})) {
    const part = net.parts.find((p) => p.id === id);
    if (part) part.params.ohms = ohms;
  }
  const view = buildNetView(net, opts.describe ?? unoWithBus());
  return runRules(BUS_RULES.filter((r) => ids === undefined || ids.includes(r.id)), { view, code: opts.code });
};

const uno = (wires: Record<string, string>): PartSpec => ({ id: "uno", ref: "uno-r3", wires });
const oled = (wires: Record<string, string>): PartSpec => ({ id: "oled", ref: "ssd1306", wires });
const resistor = (id: string, p1: string, p2: string): PartSpec => ({ id, ref: "resistor", wires: { P1: p1, P2: p2 } });

const board = uno({ P5V: "n_5v", GND: "gnd", SDA: "n_sda", SCL: "n_scl" });
const okOled = { VCC: "n_5v", GND: "gnd", SDA: "n_sda", SCL: "n_scl" };
const pullups = [resistor("rsda", "n_sda", "n_5v"), resistor("rscl", "n_scl", "n_5v")];
const clean = [board, oled(okOled), ...pullups];

describe("I2C_LIMITS", () => {
  const rpMax = ({ trNs, cbPf }: (typeof I2C_LIMITS)["standard"]) => (trNs * 1e-9) / (0.8473 * cbPf * 1e-12);

  it("gives the specification ceilings at 100 pF", () => {
    expect(rpMax(I2C_LIMITS.standard)).toBeCloseTo(11802, -1);
    expect(rpMax(I2C_LIMITS.fast)).toBeCloseTo(3541, -1);
  });

  it("passes 4.7 kOhm at standard speed only, and fails 470 kOhm at both", () => {
    expect(4700).toBeLessThan(rpMax(I2C_LIMITS.standard));
    expect(4700).toBeGreaterThan(rpMax(I2C_LIMITS.fast));
    for (const speed of ["standard", "fast"] as const) expect(470_000).toBeGreaterThan(rpMax(I2C_LIMITS[speed]));
  });
});

describe("rule:i2c-roles@1", () => {
  const id = ["rule:i2c-roles@1"];

  it("fires once for a display with SDA and SCL exchanged at the board", () => {
    const { findings } = run([board, oled({ ...okOled, SDA: "n_scl", SCL: "n_sda" }), ...pullups], {}, id);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ causeId: "swapped-pins", symptomId: "i2c-no-ack" });
    expect(findings[0]?.targets.filter((t) => t.kind === "net").map((t) => t.id).sort()).toEqual(["n_scl", "n_sda"]);
  });

  it("fires for one crossed line", () => {
    expect(run([board, oled({ ...okOled, SDA: "n_scl", SCL: "n_x" })], {}, id).findings).toHaveLength(1);
  });

  it("is quiet when the lines match", () => {
    expect(run(clean, {}, id).findings).toEqual([]);
  });

  it("skips a board that gives no roles, and a remappable board", () => {
    const swapped = [board, oled({ ...okOled, SDA: "n_scl", SCL: "n_sda" })];
    const plain = run(swapped, { describe: (d) => describePart(d) }, id);
    expect(plain.findings).toEqual([]);
    expect(plain.skipped["rule:i2c-roles@1"]).toEqual({ "board-roles-unknown": 1 });
    const remap = run(swapped, { describe: unoWithBus(true) }, id);
    expect(remap.findings).toEqual([]);
    expect(remap.skipped["rule:i2c-roles@1"]).toEqual({ "remappable-pins": 1 });
  });
});

describe("rule:i2c-pullup@1", () => {
  const id = ["rule:i2c-pullup@1"];

  it("fires once per line without a pull-up", () => {
    const { findings } = run([board, oled(okOled)], {}, id);
    expect(findings.map((f) => f.targets[0]?.id).sort()).toEqual(["n_scl", "n_sda"]);
    expect(findings[0]).toMatchObject({ causeId: "i2c-missing-pullup", symptomId: "i2c-no-ack" });
  });

  it("counts a resistor to the supply, and a module with its own pull-ups", () => {
    expect(run(clean, {}, id).findings).toEqual([]);
    expect(run([board, oled(okOled)], { describe: withOwnPullups }, id).findings).toEqual([]);
  });

  it("does not count a series resistor between the device and the board", () => {
    const series = [board, oled({ ...okOled, SDA: "n_dsda" }), resistor("rs", "n_dsda", "n_sda"), pullups[1] as PartSpec];
    expect(run(series, {}, id).findings.map((f) => f.targets[0]?.id)).toEqual(["n_dsda", "n_sda"].sort());
  });
});

describe("rule:i2c-pullup-value@1", () => {
  const id = ["rule:i2c-pullup-value@1"];
  const ohms = (value: number) => ({ rsda: value, rscl: value });
  const fast = { ...codeOf({}), wireClock: { value: { hz: 400_000 }, file: "main.ino", line: 1 } };

  it("is quiet at 4.7 kOhm", () => {
    expect(run(clean, { ohms: ohms(4700) }, id).findings).toEqual([]);
  });

  it("fires above Rp_max and states the numbers", () => {
    const { findings } = run(clean, { ohms: ohms(470_000) }, id);
    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({ causeId: "wrong-value", messageKey: "check.i2c-pullup-high", args: { ohms: 470_000, speed: "standard" } });
    expect(findings[0]?.evidence[0]?.value).toContain("470000 ohm");
  });

  it("fires below Rp_min at 5 V", () => {
    const { findings } = run(clean, { ohms: ohms(100) }, id);
    expect(findings.map((f) => f.messageKey)).toEqual(["check.i2c-pullup-low", "check.i2c-pullup-low"]);
    expect(findings[0]?.args.limit).toBe(Math.round((5 - 0.4) / I2C_LIMITS.standard.iolA));
  });

  it("holds the fast limit when the code sets a 400 kHz clock", () => {
    expect(run(clean, { ohms: ohms(4700) }, id).findings).toEqual([]);
    expect(run(clean, { ohms: ohms(4700), code: fast }, id).findings).toHaveLength(2);
    expect(run(clean, { ohms: ohms(3300), code: fast }, id).findings).toEqual([]);
  });

  it("uses the parallel value of two pull-ups", () => {
    const both = [...clean, resistor("rsda2", "n_sda", "n_5v")];
    expect(run(both, { ohms: { rsda: 20_000, rsda2: 20_000, rscl: 4700 } }, id).findings).toEqual([]);
    expect(run(both, { ohms: { rsda: 20_000, rsda2: 100_000, rscl: 4700 } }, id).findings).toHaveLength(1);
  });

  it("counts an on-board pull-up with the resistor", () => {
    const own = { describe: withOwnPullups };
    expect(run(clean, { ...own, ohms: ohms(10_000) }, id).findings).toEqual([]);
    expect(run(clean, { ...own, ohms: ohms(1000) }, id).findings).toHaveLength(2);
  });

  it("skips the minimum when the supply voltage is unknown", () => {
    const { findings, skipped } = run(clean, { ohms: ohms(100), describe: (d) => describePart(d) }, id);
    expect(findings).toEqual([]);
    expect(skipped["rule:i2c-pullup-value@1"]).toEqual({ "unknown-voltage": 2 });
  });

  it("is quiet without a pull-up (that is another rule)", () => {
    expect(run([board, oled(okOled)], {}, id).findings).toEqual([]);
  });
});
