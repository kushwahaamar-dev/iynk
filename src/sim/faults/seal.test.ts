// @vitest-environment node
import { describe, expect, it } from "vitest";
import { blankProject } from "../../project/blank.ts";
import type { Fault, Project } from "../../project/generated/types.ts";
import { isSealed, readDiagnoseSpec, redactForUnrevealed, sealForSharing, type DiagnoseSpec } from "./seal.ts";

const deepFreeze = <T>(v: T): T => {
  if (typeof v === "object" && v !== null) {
    Object.values(v).forEach(deepFreeze);
    Object.freeze(v);
  }
  return v;
};

const spec = (over: Partial<DiagnoseSpec> = {}): DiagnoseSpec => ({
  kind: "injected",
  symptom: { id: "led-stays-dark", text: "The LED never lights." },
  answer: { cause_id: "led-reversed", fault: "flt_zq91", rule: "R-LEDREV" },
  options: [
    { cause_id: "led-reversed", label: "The LED is the wrong way round" },
    { cause_id: "open-connection", label: "A wire is loose" },
    { cause_id: "missing-ground", label: "Ground is missing" },
    { cause_id: "wrong-value", label: "A part has the wrong value" },
  ],
  remedies: [
    { id: "r1", text: "Turn the LED round", correct: true },
    { id: "r2", text: "Add a bigger resistor", correct: false },
  ],
  explanation: "Current only flows one way through an LED, so it stayed dark.",
  review: { status: "reviewed", source: "own-reasoning" },
  ...over,
});

const fault: Fault = {
  id: "flt_zq91",
  cause_id: "led-reversed",
  symptom_ids: [],
  kind: "reversed-part",
  target: { component: "cmp_target" },
  enabled: true,
  note: "secret note",
};

function docWith(s: DiagnoseSpec): Project {
  const faults = s.answer.fault === undefined ? [] : [fault];
  const base = blankProject({ board: "uno", title: "t", locale: "en", actor: "a", now: "2026-01-01T00:00:00Z", id: "prj_seal" });
  return {
    ...base,
    ext: { "x-iynk-guided": { diagnose: s } },
    simulation: { ...base.simulation, faults },
    history: {
      ...base.history,
      ops: faults.map((f, i) => ({
        opId: `o${i}`,
        seq: i + 1,
        base: i,
        author: { actor: "a", kind: "user" as const },
        at: "2026-01-01T00:00:00Z",
        op: { k: "fault.set" as const, fault: f },
      })),
    },
  };
}

describe("redactForUnrevealed", () => {
  it.each([
    ["injected", spec()],
    ["built-wrong", spec({ kind: "built-wrong", answer: { cause_id: "led-reversed", rule: "R-LEDREV" } })],
  ])("leaks nothing of a sealed %s item", (_name, s) => {
    const doc = deepFreeze(docWith(s));
    const json = JSON.stringify(redactForUnrevealed(doc, "observing"));
    for (const secret of ["led-reversed", "flt_zq91", "secret note", "cmp_target", "R-LEDREV", s.explanation]) {
      expect(json).not.toContain(secret);
    }
  });

  it("keeps the option labels and replaces the answer fault", () => {
    const view = redactForUnrevealed(docWith(spec()), "picking");
    expect(JSON.stringify(view)).toContain("A wire is loose");
    expect(view.simulation.faults).toEqual([{ id: "(hidden)" }]);
    expect(view.history.ops).toHaveLength(0);
  });

  it("is the identity once verified or revealed", () => {
    const doc = docWith(spec());
    expect(redactForUnrevealed(doc, "verified")).toBe(doc);
    expect(redactForUnrevealed(doc, "revealed")).toBe(doc);
  });
});

describe("readDiagnoseSpec", () => {
  it("returns null without a spec", () => {
    const doc = { ...docWith(spec()), ext: undefined };
    expect(readDiagnoseSpec(doc)).toEqual({ ok: true, value: null });
    expect(isSealed(doc, "observing")).toBe(false);
  });

  it("rejects three options with a path", () => {
    const s = spec();
    const r = readDiagnoseSpec(docWith({ ...s, options: s.options.slice(0, 3) }));
    expect(r).toEqual({ ok: false, error: { code: "bad-spec", path: "/ext/x-iynk-guided/diagnose/options" } });
  });

  it("rejects two options equal to the answer", () => {
    const s = spec();
    const options = [s.options[0]!, s.options[0]!, s.options[1]!, s.options[2]!];
    expect(readDiagnoseSpec(docWith({ ...s, options })).ok).toBe(false);
  });

  it("rejects a long symptom and an answer fault on a built-wrong item", () => {
    const long = readDiagnoseSpec(docWith(spec({ symptom: { id: "x-s", text: "a".repeat(301) } })));
    expect(long.ok).toBe(false);
    expect(readDiagnoseSpec(docWith(spec({ kind: "built-wrong" }))).ok).toBe(false);
  });
});

describe("sealForSharing", () => {
  it("marks the item and keeps the answer", () => {
    const doc = deepFreeze(docWith(spec()));
    const sealed = sealForSharing(doc);
    expect((sealed.ext as Record<string, { sealed?: boolean }>)["x-iynk-guided"]?.sealed).toBe(true);
    expect(readDiagnoseSpec(sealed).ok).toBe(true);
  });
});
