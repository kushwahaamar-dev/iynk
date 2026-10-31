// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Descriptor } from "../../parts/descriptor.ts";
import { describePart, netlistOf, type PartSpec } from "./circuit.fixture.ts";
import { buildNetView } from "./netlist-view.ts";
import { runRules } from "./rules.ts";
import { POWER_RULES } from "./static-power.ts";

const withSupply = (id: string): Descriptor | undefined => {
  const d = describePart(id);
  return d?.identity.kind === "board"
    ? { ...d, power: { outputs: [{ id: "5v", pin: "P5V", nominal: { unit: "V", value: 5 } }, { id: "3v3", pin: "P3V3", nominal: { unit: "V", value: 3.3 } }] } }
    : d;
};

const run = (specs: PartSpec[], ids: string[], describe: (id: string) => Descriptor | undefined = withSupply) =>
  runRules(
    POWER_RULES.filter((r) => ids.includes(r.id)),
    { view: buildNetView(netlistOf(specs), describe) },
  );

const uno = (wires: Record<string, string>): PartSpec => ({ id: "uno", ref: "uno-r3", wires });
const led = (wires: Record<string, string>): PartSpec => ({ id: "d1", ref: "led-5mm", wires });
const oled = (wires: Record<string, string>): PartSpec => ({ id: "oled", ref: "ssd1306", wires });
const resistor = (id: string, p1: string, p2: string): PartSpec => ({ id, ref: "resistor", wires: { P1: p1, P2: p2 } });

const blink = [uno({ D13: "n_sig", GND: "gnd" }), resistor("r1", "n_sig", "n_led"), led({ A: "n_led", K: "gnd" })];

describe("rule:led-series@1", () => {
  const id = ["rule:led-series@1"];

  it("fires once for the blink with the resistor removed", () => {
    const { findings } = run([uno({ D13: "n_led", GND: "gnd" }), led({ A: "n_led", K: "gnd" })], id);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      causeId: "led-no-series-resistor",
      symptomId: "led-burnt",
      args: { led: "d1", source: "uno.D13" },
    });
  });

  it("fires for an LED straight across a supply", () => {
    expect(run([uno({ P5V: "n_5v", GND: "gnd" }), led({ A: "n_5v", K: "gnd" })], id).findings).toHaveLength(1);
  });

  it("is quiet with the resistor in place, on either side of the LED", () => {
    expect(run(blink, id).findings).toEqual([]);
    const after = [uno({ D13: "n_led", GND: "gnd" }), led({ A: "n_led", K: "n_k" }), resistor("r1", "n_k", "gnd")];
    expect(run(after, id).findings).toEqual([]);
  });

  it("skips an LED module that has a resistor of its own", () => {
    const withResistor = (id2: string): Descriptor | undefined => {
      const d = withSupply(id2);
      return d?.identity.category === "semiconductor"
        ? { ...d, ratings: { ...d.ratings, series_resistor: { measure: "resistance", role: "characteristic", used_by_model: "none" } } }
        : d;
    };
    const { findings, skipped } = run([uno({ D13: "n_led", GND: "gnd" }), led({ A: "n_led", K: "gnd" })], id, withResistor);
    expect(findings).toEqual([]);
    expect(skipped["rule:led-series@1"]).toEqual({ "on-board-resistor": 1 });
  });

  it("skips an undescribed part", () => {
    const { findings, skipped } = run(blink, id, (d) => (d.startsWith("core.led") ? undefined : withSupply(d)));
    expect(findings).toEqual([]);
    expect(skipped["rule:led-series@1"]).toEqual({ "undescribed-part": 1 });
  });
});

describe("rule:led-polarity@1", () => {
  const id = ["rule:led-polarity@1"];

  it("fires when the anode is on ground and the cathode on the driven net", () => {
    const { findings } = run([uno({ D13: "n_sig", GND: "gnd" }), resistor("r1", "n_sig", "n_led"), led({ A: "gnd", K: "n_led" })], id);
    expect(findings).toHaveLength(0);
    const direct = run([uno({ D13: "n_led", GND: "gnd" }), led({ A: "gnd", K: "n_led" })], id);
    expect(direct.findings).toHaveLength(1);
    expect(direct.findings[0]).toMatchObject({ causeId: "led-reversed", symptomId: "led-dark" });
  });

  it("fires when the anode net is nominally lower than the cathode net", () => {
    const wires = [uno({ P5V: "n_5v", P3V3: "n_3v3", GND: "gnd" }), led({ A: "n_3v3", K: "n_5v" })];
    expect(run(wires, id).findings).toHaveLength(1);
  });

  it("is quiet for a correctly wired LED", () => {
    expect(run(blink, id).findings).toEqual([]);
    expect(run([uno({ P5V: "n_5v", P3V3: "n_3v3", GND: "gnd" }), led({ A: "n_5v", K: "n_3v3" })], id).findings).toEqual([]);
  });

  it("skips an undescribed part", () => {
    const { findings, skipped } = run([uno({ D13: "n_led", GND: "gnd" }), led({ A: "gnd", K: "n_led" })], id, (d) =>
      d.startsWith("core.led") ? undefined : withSupply(d),
    );
    expect(findings).toEqual([]);
    expect(skipped["rule:led-polarity@1"]).toEqual({ "undescribed-part": 1 });
  });
});

describe("rule:supply-polarity@1", () => {
  const id = ["rule:supply-polarity@1"];
  const board = uno({ P5V: "n_5v", GND: "gnd" });

  it("fires when VCC is on ground and GND on the supply", () => {
    const { findings } = run([board, oled({ VCC: "gnd", GND: "n_5v" })], id);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ causeId: "reverse-polarity", symptomId: "part-hot", args: { part: "oled", pin: "VCC", other: "GND" } });
  });

  it("is quiet when wired the right way round or only half swapped", () => {
    expect(run([board, oled({ VCC: "n_5v", GND: "gnd" })], id).findings).toEqual([]);
    expect(run([board, oled({ VCC: "gnd", GND: "n_x" })], id).findings).toEqual([]);
  });

  it("fires for a polarised part with positive and negative reversed", () => {
    const polarised = (d: string): Descriptor | undefined => {
      const base = withSupply(d);
      return base?.identity.category === "semiconductor"
        ? { ...base, pins: base.pins.map((p) => ({ ...p, polarity: p.id === "A" ? "negative" : "positive" })) as typeof base.pins }
        : base;
    };
    expect(run([uno({ P5V: "n_5v", P3V3: "n_3v3", GND: "gnd" }), led({ A: "n_5v", K: "n_3v3" })], id, polarised).findings).toHaveLength(1);
    expect(run([uno({ P5V: "n_5v", P3V3: "n_3v3", GND: "gnd" }), led({ A: "n_3v3", K: "n_5v" })], id, polarised).findings).toEqual([]);
  });

  it("skips an undescribed part", () => {
    const { skipped } = run([board, oled({ VCC: "gnd", GND: "n_5v" })], id, (d) => (d.startsWith("core.ssd1306") ? undefined : withSupply(d)));
    expect(skipped["rule:supply-polarity@1"]).toEqual({ "undescribed-part": 1 });
  });
});

describe("rule:part-supply@1", () => {
  const id = ["rule:part-supply@1"];
  const board = uno({ P5V: "n_5v", P3V3: "n_3v3", GND: "gnd" });

  it("fires when VCC sits on a net with no source", () => {
    const { findings } = run([board, oled({ VCC: "n_island", GND: "gnd" })], id);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ causeId: "part-not-powered", symptomId: "part-dead", messageKey: "check.part-supply" });
  });

  it("fires when the rail is below the operating minimum", () => {
    const low = (d: string): Descriptor | undefined => {
      const base = withSupply(d);
      return base?.identity.category === "display"
        ? { ...base, ratings: { ...base.ratings, supply_range: { ...base.ratings.supply_range, manufacturer: { unit: "V", min: 4.5, max: 5.5, source: { src: "facts", loc: "test" } } } } as typeof base.ratings }
        : base;
    };
    const { findings } = run([board, oled({ VCC: "n_3v3", GND: "gnd" })], id, low);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ messageKey: "check.part-supply-low", args: { volts: 3.3, min: 4.5 } });
  });

  it("is quiet on a supplied net at or above the minimum, and on a net of unknown voltage", () => {
    expect(run([board, oled({ VCC: "n_5v", GND: "gnd" })], id).findings).toEqual([]);
    expect(run([board, oled({ VCC: "n_3v3", GND: "gnd" })], id).findings).toEqual([]);
    expect(run([board, oled({ VCC: "n_5v", GND: "gnd" })], id, (d) => describePart(d)).findings).toEqual([]);
  });

  it("skips an undescribed part", () => {
    const { skipped } = run([board, oled({ VCC: "n_island", GND: "gnd" })], id, (d) => (d.startsWith("core.ssd1306") ? undefined : withSupply(d)));
    expect(skipped["rule:part-supply@1"]).toEqual({ "undescribed-part": 1 });
  });
});

describe("the clean circuits", () => {
  it("stay quiet", () => {
    const circuits = [
      blink,
      [uno({ P5V: "n_5v", GND: "gnd" }), oled({ VCC: "n_5v", GND: "gnd" })],
    ];
    for (const specs of circuits) {
      expect(run(specs, POWER_RULES.map((r) => r.id)).findings).toEqual([]);
    }
  });
});
