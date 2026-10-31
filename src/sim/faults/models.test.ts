// @vitest-environment node
import { describe, expect, it } from "vitest";
import { evalTrigger, parseTrigger } from "./expr.ts";
import type { Quantities } from "./expr.ts";
import { isCauseId } from "./cause-ids.ts";
import { isSymptomId } from "./symptoms.ts";
import { labelKey, loadFailureModels, modelsFor, validateFailureModel } from "./models.ts";

function byId(id: string) {
  const m = loadFailureModels().find((x) => x.id === id);
  if (!m) throw new Error(`no model ${id}`);
  return m;
}

/** Evaluates a model's trigger; `sustainedNs` is how long it has held, compared with the model's window. */
function burns(id: string, q: { value?: Record<string, number>; peak?: Record<string, number>; avg?: Record<string, number> }, sustainedNs = 0) {
  const m = byId(id);
  const parsed = parseTrigger(m.trigger);
  if (!parsed.ok) throw new Error(m.trigger);
  const quantities: Quantities = { value: (n) => q.value?.[n], peak: (n) => q.peak?.[n], avg: (n) => q.avg?.[n] };
  return evalTrigger(parsed.value, quantities) === true && sustainedNs >= (m.window?.sustainNs ?? 0);
}

describe("the failure models", () => {
  const models = loadFailureModels();

  it("holds seven valid records", () => {
    expect(models).toHaveLength(7);
    for (const m of models) expect(validateFailureModel(m).ok).toBe(true);
  });

  it("versions every id with @1 and resolves every cause and symptom", () => {
    for (const m of models) {
      expect(m.id).toMatch(/@1$/);
      expect(isCauseId(m.causeId)).toBe(true);
      expect(isSymptomId(m.message.symptomId)).toBe(true);
      expect(m.derivation.text).not.toBe("");
    }
  });

  it("is not checked against a reference in any of the seven", () => {
    for (const m of models) expect(labelKey(m)).toBe("faults.fidelity.notChecked");
  });

  it("finds the models of a cause", () => {
    expect(modelsFor("led-no-series-resistor").map((m) => m.id)).toEqual(["failure:led-overcurrent@1"]);
    expect(modelsFor("no-such-cause")).toEqual([]);
  });

  it("says checked once a reference exists", () => {
    const m = { ...byId("failure:led-overcurrent@1"), referenceData: [{ kind: "datasheet" as const, ref: "LED datasheet" }] };
    expect(labelKey(m)).toBe("faults.fidelity.checked");
  });
});

describe("validateFailureModel", () => {
  const good = byId("failure:led-overcurrent@1");

  it("names the path that is wrong", () => {
    const cases: [unknown, string][] = [
      [{ ...good, id: "led" }, "/id"],
      [{ ...good, causeId: "not a cause" }, "/causeId"],
      [{ ...good, trigger: "peak(i) >" }, "/trigger"],
      [{ ...good, message: { symptomId: "nope", i18nKey: "k" } }, "/message/symptomId"],
      [{ ...good, derivation: { sourceIds: [] } }, "/derivation/text"],
      [{ ...good, outcome: { state: "melted", latch: true } }, "/outcome"],
      [{ ...good, threshold: { kind: "random" } }, "/threshold/kind"],
    ];
    for (const [m, path] of cases) expect(validateFailureModel(m)).toEqual({ ok: false, error: { code: "bad-model", path } });
  });

  it("rejects a value that is not an object", () => {
    expect(validateFailureModel(null).ok).toBe(false);
    expect(validateFailureModel([]).ok).toBe(false);
  });
});

describe("the legacy burn decisions", () => {
  const S = 1e9;

  it("burns an LED at 51 mA with imax 20 mA and not at 49 mA", () => {
    const rating = { "rating.imaxAmps": 0.02 };
    expect(burns("failure:led-overcurrent@1", { value: rating, peak: { i: 0.051 } })).toBe(true);
    expect(burns("failure:led-overcurrent@1", { value: rating, peak: { i: 0.049 } })).toBe(false);
  });

  it("burns the LED of the solver at 117.65 mA and not at 40 mA", () => {
    const rating = { "rating.imaxAmps": 0.02 };
    expect(burns("failure:led-overcurrent@1", { value: rating, peak: { i: 0.11765 } })).toBe(true);
    expect(burns("failure:led-overcurrent@1", { value: rating, peak: { i: 0.04 } })).toBe(false);
  });

  it("burns a diode at 1.1 times imax", () => {
    const value = { "rating.imaxAmps": 1, "rating.isurgeAmps": 30 };
    expect(burns("failure:diode-overcurrent@1", { value, avg: { i: 1.1 }, peak: { i: 1.1 } })).toBe(true);
    expect(burns("failure:diode-overcurrent@1", { value, avg: { i: 0.9 }, peak: { i: 0.9 } })).toBe(false);
  });

  it("burns an NPN at tj 151 with the default limits", () => {
    expect(burns("failure:npn-overheat@1", { value: { tj: 151 }, peak: { ic: 0.1 } })).toBe(true);
    expect(burns("failure:npn-overheat@1", { value: { tj: 149 }, peak: { ic: 0.1 } })).toBe(false);
    expect(burns("failure:npn-overheat@1", { value: { tj: 25 }, peak: { ic: 1.6 } })).toBe(true);
  });

  it("burns a TMP36 at -1 V after 3.1 s and not after 2.9 s", () => {
    expect(burns("failure:tmp36-reverse@1", { value: { vs: -1 } }, 3.1 * S)).toBe(true);
    expect(burns("failure:tmp36-reverse@1", { value: { vs: -1 } }, 2.9 * S)).toBe(false);
  });

  it("burns a TMP36 above 7 V", () => {
    expect(burns("failure:tmp36-overvoltage@1", { value: { vs: 7.5 } })).toBe(true);
    expect(burns("failure:tmp36-overvoltage@1", { value: { vs: 5 } })).toBe(false);
  });

  it("burns a potentiometer track after 2.1 s above pmax and not after 1.9 s", () => {
    const value = { "rating.pmaxWatts": 0.1 };
    expect(burns("failure:track-overpower@1", { value, peak: { p: 0.2 } }, 2.1 * S)).toBe(true);
    expect(burns("failure:track-overpower@1", { value, peak: { p: 0.2 } }, 1.9 * S)).toBe(false);
  });

  it("derates the USB rail once the load passes the limit", () => {
    expect(byId("failure:usb-sag@1").outcome).toEqual({ state: "derated", params: { railFactor: 0.42 }, latch: false });
    expect(burns("failure:usb-sag@1", { value: { load: 0.6, "source.ilimAmps": 0.5 } }, 0.6 * S)).toBe(true);
    expect(burns("failure:usb-sag@1", { value: { load: 0.4, "source.ilimAmps": 0.5 } }, 0.6 * S)).toBe(false);
  });

  it("cannot tell without the rating", () => {
    expect(burns("failure:led-overcurrent@1", { peak: { i: 1 } })).toBe(false);
  });
});
