import { describe, expect, it, vi } from "vitest";
import type { Finding } from "../../sim/faults/types.ts";
import type { DiagnoseSpec } from "../../sim/faults/seal.ts";
import { createDiagnoseStore } from "./diagnose.ts";

const spec = (kind: DiagnoseSpec["kind"] = "built-wrong"): DiagnoseSpec => ({
  kind,
  symptom: { id: "i2c-no-ack", text: "The sensor never answers." },
  answer: { cause_id: "swapped-pins" },
  options: [
    { cause_id: "swapped-pins", label: "SDA and SCL are swapped" },
    { cause_id: "i2c-missing-pullup", label: "No pull-up resistors" },
    { cause_id: "part-not-powered", label: "The sensor has no power" },
    { cause_id: "open-connection", label: "A wire is loose" },
  ],
  explanation: "The two bus lines trade places.",
  review: { status: "draft", source: "own-reasoning" },
});

function setup(kind?: DiagnoseSpec["kind"]) {
  const append = vi.fn(async () => {});
  const setReadOnly = vi.fn();
  const store = createDiagnoseStore({ log: { append }, setReadOnly, clock: () => 5, applyOps: () => ({ ok: true }), fault: () => undefined });
  store.start({ spec: spec(kind), projectId: "prj_a" });
  return { store, append, setReadOnly };
}

const finding: Finding = { ruleId: "r", causeId: "swapped-pins", symptomId: "i2c-no-ack", severity: "error", targets: [], evidence: [], messageKey: "k", args: {} };

describe("createDiagnoseStore", () => {
  it("locks a built-wrong item and leaves an injected one open", () => {
    expect(setup().setReadOnly).toHaveBeenCalledWith("diagnose");
    expect(setup("injected").setReadOnly).toHaveBeenCalledWith(null);
  });

  it("logs one answer event for a wrong pick and keeps the item open", () => {
    const { store, append } = setup();
    store.setFindings([finding]);
    store.dispatch({ t: "diagnose" });
    store.pick("i2c-missing-pullup", "guess");
    expect(append).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledWith("diagnose.answer", { projectId: "prj_a", cause_id: "i2c-missing-pullup", correct: false, confidence: "guess" });
    expect(store.getState().session?.state).toBe("observing");
    expect(store.getState().session?.notes).toEqual([]);
    expect(store.isSealedUnrevealed()).toBe(true);
  });

  it("unlocks on the right pick and records the fix once the finding is gone", () => {
    const { store, append, setReadOnly } = setup();
    store.setFindings([finding]);
    store.dispatch({ t: "diagnose" });
    store.pick("swapped-pins");
    expect(setReadOnly).toHaveBeenLastCalledWith(null);
    store.setFindings([finding]);
    expect(store.getState().session?.state).toBe("fixing");
    store.setFindings([]);
    expect(store.getState().session?.state).toBe("verified");
    expect(append).toHaveBeenLastCalledWith("diagnosis.record", expect.objectContaining({ projectId: "prj_a", outcome: "clean" }));
    expect(store.isSealedUnrevealed()).toBe(false);
  });

  it("treats showCause before any pick like giving up", () => {
    const { store, append, setReadOnly } = setup();
    store.dispatch({ t: "showCause" });
    expect(store.getState().session).toMatchObject({ state: "revealed", causeVisible: true });
    expect(append).toHaveBeenCalledWith("reveal", { projectId: "prj_a" });
    expect(setReadOnly).toHaveBeenLastCalledWith(null);
    expect(store.isSealedUnrevealed()).toBe(false);
  });

  it("is not sealed before start", () => {
    const store = createDiagnoseStore({ log: { append: async () => {} }, setReadOnly: () => {}, clock: () => 0, applyOps: () => ({ ok: true }), fault: () => undefined });
    expect(store.isSealedUnrevealed()).toBe(false);
  });
});
