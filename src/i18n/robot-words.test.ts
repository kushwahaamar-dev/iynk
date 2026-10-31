// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { LOCALES } from "./config";
import { messageAt, messageKeys } from "./translate";

const read = (locale: string): unknown => JSON.parse(readFileSync(join(process.cwd(), "src/i18n/messages", locale, "robot.json"), "utf8"));

// RA-23: copy never claims more than the models can back up.
const BANNED = ["validated", "certified", "accurate", "realistic", "guaranteed"];

const CAUSES = ["motor-stall", "motor-direction-reversed", "encoder-channel-swapped", "wheel-slip", "driver-undersized", "battery-sag-reset", "sensor-too-high", "sensor-saturated", "ranger-beam-blocked", "tip-over", "loop-too-slow"];
const CHECKS = Array.from({ length: 10 }, (_, i) => `RB-C-${String(i + 1).padStart(2, "0")}`);
const ERRORS = ["TREE", "MASS", "INERTIA", "THIN", "AXIS", "LIMITS", "DRIVE", "WHEEL", "SURFACE", "COUPLING", "SENSOR", "LIMIT"].map((code) => `RB-E-${code}`);
const WARNINGS = ["TUNNEL", "INERTIA-BOX", "ASPECT", "MASSRATIO", "CG", "UNDRIVEN"].map((code) => `RB-W-${code}`);

describe.each(LOCALES)("robot strings in %s", (locale) => {
  const messages = read(locale);

  test("never use a banned word", () => {
    const words = (readFileSync(join(process.cwd(), "src/i18n/messages", locale, "robot.json"), "utf8").toLowerCase().match(/[a-z]+/g) ?? []);
    expect(words.filter((word) => BANNED.includes(word))).toEqual([]);
  });

  test("never use an em dash", () => {
    expect(JSON.stringify(messages)).not.toContain("—");
  });

  test("have a title, question and note for every robot check", () => {
    for (const id of CHECKS) {
      for (const part of ["title", "asks", "note"]) expect(messageAt(messages, `checks.${id}.${part}`), `${id}.${part}`).toBeTypeOf("string");
    }
  });

  test("have a message for every robot problem code", () => {
    const keys = new Set(messageKeys(messages));
    for (const code of [...ERRORS, ...WARNINGS]) {
      expect([...keys].some((key) => key === `problems.${code}` || key.startsWith(`problems.${code}.`)), code).toBe(true);
    }
  });

  test("have a symptom and three hints for each modelled cause", () => {
    for (const id of CAUSES) {
      for (const part of ["symptom", "hint1", "hint2", "hint3"]) expect(messageAt(messages, `cause.${id}.${part}`), `${id}.${part}`).toBeTypeOf("string");
    }
  });
});

test("the sensor problem has both reasons", () => {
  for (const reason of ["unknown-component", "not-a-sensor"]) expect(messageAt(read("en"), `problems.RB-E-SENSOR.${reason}`)).toBeTypeOf("string");
});
