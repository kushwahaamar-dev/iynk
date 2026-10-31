// @vitest-environment node
import { describe, expect, it } from "vitest";
import faults from "@/i18n/messages/en/faults.json";
import { createTranslator } from "@/i18n/translate";
import { ladderFor, namesTheFix, nextLevel, type ResolvedLevel } from "./hints";
import type { Finding, HintLadder } from "./types";

const t = createTranslator("en", faults, "en/faults") as (key: string, args?: Record<string, string | number>) => string;
const say = (l: ResolvedLevel) => (typeof l.text === "string" ? l.text : t(l.text.key, l.text.args));

const finding = (over: Partial<Finding> = {}): Finding => ({
  ruleId: "r",
  causeId: "swapped-pins",
  symptomId: "i2c-no-ack",
  severity: "error",
  targets: [
    { kind: "pin", id: "bme", pin: "SDA" },
    { kind: "net", id: "n_scl" },
  ],
  evidence: [],
  messageKey: "check.found",
  args: {},
  ...over,
});

const reviewed: HintLadder = {
  levels: [
    { text: "Look at the bus.", focus: { nets: ["n_sda", "n_scl"] } },
    { text: "Measure the lines.", probe: { a: "uno.A4", b: "uno.GND" } },
    { text: "Think about the two pins.", focus: { components: ["bme"] } },
  ],
};

const causeIds = Object.keys(faults.cause);

describe("ladderFor", () => {
  it("takes every level from a reviewed item first", () => {
    const [l1, l2, l3] = ladderFor({ item: { ladder: reviewed }, descriptorHints: [{ level: 1, text: "from the part" }], cause: "swapped-pins" });
    expect([l1.text, l2.text, l3.text]).toEqual(["Look at the bus.", "Measure the lines.", "Think about the two pins."]);
    expect([l1, l2, l3].map((l) => l.generated)).toEqual([false, false, false]);
    expect(l1.focus).toEqual({ nets: ["n_sda", "n_scl"] });
    expect(l2.probe).toEqual({ a: "uno.A4", b: "uno.GND" });
  });

  it("falls through to descriptor hints for a level the item lacks or leaves empty", () => {
    const partial: HintLadder = { levels: [{ text: "" }, reviewed.levels[1], reviewed.levels[2]] };
    const [l1] = ladderFor({ item: { ladder: partial }, descriptorHints: [{ level: 1, text: "from the part" }], cause: "swapped-pins" });
    expect(l1).toMatchObject({ text: "from the part", generated: false });
  });

  it("generates what no source has: a two level lesson ladder keeps 1 and 2 and gets a generated 3", () => {
    const [l1, l2, l3] = ladderFor({
      descriptorHints: [
        { level: 1, text: "one" },
        { level: 2, text: "two" },
      ],
      cause: "swapped-pins",
      finding: finding(),
    });
    expect([l1.generated, l2.generated, l3.generated]).toEqual([false, false, true]);
    expect(say(l3)).toBe("Check what pin SDA of bme is connected to.");
  });

  it("points level 1 at the finding's parts and nets, and level 2 at a probe", () => {
    const [l1, l2] = ladderFor({ cause: "swapped-pins", finding: finding(), groundNet: "gnd" });
    expect(l1.focus).toEqual({ components: ["bme"], nets: ["n_scl"] });
    expect(l2.probe).toEqual({ a: "bme.SDA", b: "gnd" });
    expect(say(l2)).toBe("Look at the connections around bme.");
  });

  it("gives a band to the probe when the rule supplied one", () => {
    const [, l2] = ladderFor({ cause: "brownout", finding: finding({ args: { min: 4.5, max: 5.5, unit: "V" } }), groundNet: "gnd" });
    expect(l2.probe?.expect).toEqual({ min: 4.5, max: 5.5, unit: "V" });
  });

  it("says where in words only when the finding has no targets or there is no finding", () => {
    for (const input of [{ finding: finding({ targets: [] }) }, {}]) {
      const [l1, l2, l3] = ladderFor({ cause: "swapped-pins", ...input });
      expect(l1.focus).toBeUndefined();
      expect(l2.probe).toBeUndefined();
      expect([l1, l2, l3].map(say).every((s) => s.trim() !== "")).toBe(true);
    }
  });

  it("fills the power template from the finding's arguments", () => {
    const [, , l3] = ladderFor({ cause: "brownout", finding: finding({ args: { expected: 5, unit: "V" } }) });
    expect(say(l3)).toBe("Check the voltage on n_scl; it should be about 5 V.");
  });

  it.each(causeIds)("level 3 for %s never repeats its fix, with or without a finding", (id) => {
    const fix = t(`cause.${id}.fix`);
    for (const f of [undefined, finding({ args: { value: 10, unit: "ohm", expected: 220 } })]) {
      expect(namesTheFix(say(ladderFor({ cause: id, finding: f })[2]), fix)).toBe(false);
    }
  });
});

describe("namesTheFix", () => {
  it("is true for a shared run of four words, ignoring case and punctuation", () => {
    expect(namesTheFix("Then Add a series resistor, now.", "Add a series resistor between the pin and the LED.")).toBe(true);
  });

  it("is false for three shared words", () => {
    expect(namesTheFix("Add a series wire", "Add a series resistor")).toBe(false);
  });
});

describe("nextLevel", () => {
  it("counts 1, 2, 3 and then stops", () => {
    expect([0, 1, 2, 3].map((n) => nextLevel(n as 0 | 1 | 2 | 3))).toEqual([1, 2, 3, undefined]);
  });
});
