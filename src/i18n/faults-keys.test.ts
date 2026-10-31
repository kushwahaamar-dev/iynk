// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { SYMPTOM_IDS } from "../sim/faults/symptoms";
import { LOCALES } from "./config";
import { messageAt, messageKeys } from "./translate";

const read = (locale: string): unknown => JSON.parse(readFileSync(join(process.cwd(), `src/i18n/messages/${locale}/faults.json`), "utf8"));
const english = read("en");
const has = (key: string) => typeof messageAt(english, key) === "string";

const causeIds = [
  "led-no-series-resistor", "led-reversed", "output-contention", "supply-shorted-to-ground", "floating-input", "part-not-powered", "button-no-pulldown", "open-connection", "swapped-pins", "wrong-value", "missing-ground", "wrong-pin-in-code", "i2c-missing-pullup", "pin-overcurrent", "brownout", "reverse-polarity",
  "bus-device-not-modelled", "library-not-modelled", "x-code.serial-baud-mismatch", "x-code.pin-mode-wrong",
];

const contractKeys = [
  ...["title", "lede", "pick", "surprise", "restore", "forBuddy", "applied", "none", "explain", "undone", "needsDescriptor"].map((k) => `breakIt.${k}`),
  ...["title", "symptomHeading", "pickHeading", "pick", "right", "wrong", "tryAgain", "giveUp", "showCause", "hideCause", "fixHeading", "noEvidence", "sealedInfo", "addNote", "skip", "transferTitle", "state.presented", "state.observing", "state.picking", "state.fixing", "state.verified", "state.revealed"].map((k) => `diagnose.${k}`),
  ...["title", "level.1", "level.2", "level.3", "open", "generated", "locked", "none"].map((k) => `hint.${k}`),
  ...["title", "cause", "symptom", "evidence", "hintLevel", "export", "copy", "logOn", "logOff", "clear", "outcome.clean", "outcome.assisted", "outcome.helped", "outcome.revealed", "empty"].map((k) => `record.${k}`),
  ...["notChecked", "checked", "outside", "modelOnly", "mocked"].map((k) => `fidelity.${k}`),
  ...["title", "run", "none", "found", "skipped"].map((k) => `check.${k}`),
  ...["title", "run", "found", "none", "pins", "noPins"].map((k) => `scan.${k}`),
  ...["pin-level", "net-voltage", "branch-current", "serial-line", "state", "timeline"].map((k) => `evidence.kind.${k}`),
  ...["computed", "approximation", "mocked"].map((k) => `provenance.${k}`),
  ...causeIds.flatMap((id) => ["title", "why", "fix"].map((k) => `cause.${id}.${k}`)),
  ...SYMPTOM_IDS.map((id) => `symptom.${id}`),
  ...["wiring", "power", "code", "bus", "value"].flatMap((family) => [1, 2, 3].map((level) => `hintTemplate.${family}.${level}`)),
];

const componentFiles = [
  ...["BreakIt", "DiagnosePanel", "HintLadder", "DiagnosisRecord", "FaultDock", "TransferQuestion"].map((name) => `src/components/studio/${name}.tsx`),
  "src/components/studio/instruments/I2cScan.tsx",
];

describe("faults namespace", () => {
  test.each(contractKeys)("en has %s", (key) => {
    expect(has(key), `src/i18n/messages/en/faults.json is missing ${key}`).toBe(true);
  });

  test("the fidelity default is the sentence of the contract", () => {
    expect(messageAt(english, "fidelity.notChecked")).toBe("Not checked against hardware. This is what the model says, not what a bench measured.");
  });

  test("component files use only keys that exist", () => {
    const pattern = /\bt\(\s*(["'])([A-Za-z][\w.-]*)\1/g;
    const bad: string[] = [];
    for (const file of componentFiles) {
      const path = join(process.cwd(), file);
      if (!existsSync(path)) continue;
      for (const match of readFileSync(path, "utf8").matchAll(pattern)) {
        const key = match[2];
        if (key.startsWith("faults.") || !has(key)) bad.push(`${file}: ${key}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test.each(LOCALES)("%s has no banned wording", (locale) => {
    const messages = read(locale);
    for (const key of messageKeys(messages)) {
      const value = String(messageAt(messages, key));
      expect(value, `${locale} ${key}`).not.toMatch(/validated|certified|guaranteed|—/i);
    }
  });

  test("level 3 hint templates never name the fix", () => {
    for (const family of ["wiring", "power", "code", "bus", "value"]) {
      const text = String(messageAt(english, `hintTemplate.${family}.3`));
      expect(text, family).not.toMatch(/replace|reconnect|swap back|fix/i);
    }
  });
});
