// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { builtinRegistry } from "../../parts/builtin.ts";
import type { Project } from "../../project/generated/types.ts";
import { stateHash } from "../../project/hash.ts";
import { sampleBlinkD12 } from "../../project/samples.ts";
import { createSession } from "../../project/session.ts";
import { seededRandom, steppingClock, USER } from "../../project/session.testing.ts";
import { validateValue } from "../../project/validate.ts";
import { buildSimNetlist } from "../../sim/netlist.ts";
import type { FaultCandidate } from "../../sim/faults/generate.ts";
import { redactForUnrevealed, readDiagnoseSpec } from "../../sim/faults/seal.ts";
import { buildNetView } from "../../sim/faults/netlist-view.ts";
import type { NetView } from "../../sim/faults/types.ts";
import { breakTool, type BreakGesture, type SpecTexts } from "./break.ts";

const registry = builtinRegistry();
const texts: SpecTexts = {
  symptom: (id) => `symptom ${id}`,
  explanation: (id) => `because ${id}`,
  option: (id) => `option ${id}`,
};

const deepFreeze = <T>(v: T): T => {
  if (typeof v === "object" && v !== null) {
    Object.values(v).forEach(deepFreeze);
    Object.freeze(v);
  }
  return v;
};

let doc: Project;
let view: NetView;
let sources: Record<string, string>;
let candidates: FaultCandidate[];

const run = (g: BreakGesture) => breakTool(doc, view, sources, g);
const candidateOps = (g: BreakGesture) => {
  const r = run(g);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};
const sessionOf = () => createSession({ state: doc, clock: steppingClock(), rnd: seededRandom() });

beforeAll(() => {
  const report = validateValue(sampleBlinkD12());
  if (!report.ok || !report.doc) throw new Error("the sample does not validate");
  doc = report.doc;
  const { net } = buildSimNetlist(doc, registry);
  view = buildNetView(net, (id) => {
    const [ref = "", version = ""] = id.split("@");
    return registry.get(ref, version);
  });
  sources = Object.fromEntries(doc.sources.map((s) => [s.path, s.content]));
  candidates = candidateOps({ t: "list" }).candidates ?? [];
});

describe("breakTool", () => {
  it("lists candidates on the sample circuit, including the code pin fault", () => {
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.some((c) => c.causeId === "wrong-pin-in-code")).toBe(true);
  });

  it("filters the list by family", () => {
    const code = candidateOps({ t: "list", families: ["code"] }).candidates ?? [];
    expect(code.length).toBeGreaterThan(0);
    expect(code.every((c) => c.family === "code")).toBe(true);
  });

  it("breaks and restores to the same state hash, with one undo entry per break", () => {
    const candidate = candidates.find((c) => c.causeId === "wrong-pin-in-code")!;
    const session = sessionOf();
    const before = stateHash(session.state);
    expect(session.apply(candidateOps({ t: "break", candidate }).ops, USER).ok).toBe(true);
    expect(session.state.simulation.faults.some((f) => f.id === candidate.fault.id)).toBe(true);
    expect(stateHash(session.state)).not.toBe(before);

    const restore = breakTool(session.state, view, sources, { t: "restore", faultId: candidate.fault.id });
    expect(restore.ok).toBe(true);
    if (restore.ok) expect(session.apply(restore.value.ops, USER).ok).toBe(true);
    expect(stateHash(session.state)).toBe(before);
  });

  it("undo of the break returns the original hash in one step", () => {
    const session = sessionOf();
    const before = stateHash(session.state);
    session.apply(candidateOps({ t: "break", candidate: candidates[0]! }).ops, USER);
    session.undo();
    expect(stateHash(session.state)).toBe(before);
    expect(session.canUndo()).toBe(false);
  });

  it("refuses a fault that is already in the project", () => {
    const session = sessionOf();
    session.apply(candidateOps({ t: "break", candidate: candidates[0]! }).ops, USER);
    const again = breakTool(session.state, view, sources, { t: "break", candidate: candidates[0]! });
    expect(again).toMatchObject({ ok: false, error: { code: "duplicate-fault" } });
  });

  it("turns a stored fault on and off with the same hash as before", () => {
    const session = sessionOf();
    session.apply(candidateOps({ t: "break", candidate: candidates[0]! }).ops, USER);
    const id = candidates[0]!.fault.id;
    const on = session.state;
    const off = breakTool(on, view, sources, { t: "toggle", faultId: id });
    expect(off.ok && off.value.ops).toHaveLength(1);
    if (off.ok) session.apply(off.value.ops, USER);
    expect(session.state.simulation.faults.find((f) => f.id === id)?.enabled).toBe(false);
    const back = breakTool(session.state, view, sources, { t: "toggle", faultId: id });
    if (back.ok) session.apply(back.value.ops, USER);
    expect(stateHash(session.state)).toBe(stateHash(on));
  });

  it("says so when the fault to restore or toggle does not exist", () => {
    expect(run({ t: "restore", faultId: "flt_none" })).toMatchObject({ ok: false, error: { code: "no-candidate" } });
    expect(run({ t: "toggle", faultId: "flt_none" })).toMatchObject({ ok: false, error: { code: "no-candidate" } });
  });

  it("gives the same surprise for the same seed and a candidate that can be applied", () => {
    const a = candidateOps({ t: "surprise", seed: 48213 });
    const b = candidateOps({ t: "surprise", seed: 48213 });
    expect(a.candidate?.fault.id).toBe(b.candidate?.fault.id);
    expect(a.ops).toEqual(b.ops);
    expect(sessionOf().apply(a.ops, USER).ok).toBe(true);
  });

  it("finds no surprise when the family has nothing to offer", () => {
    expect(run({ t: "surprise", seed: 1, families: ["flight"] })).toMatchObject({ ok: false, error: { code: "no-candidate" } });
  });

  describe("for a buddy", () => {
    const candidate = () => candidates.find((c) => c.causeId === "wrong-pin-in-code")!;

    it("carries the spec and the sealed flag, and leaves the original alone", () => {
      const frozen = deepFreeze(structuredClone(doc));
      const r = breakTool(frozen, view, sources, { t: "buddy", candidate: candidate(), texts });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const copy = r.value.sealedDoc!;
      const guided = (copy.ext as Record<string, { sealed?: boolean }>)["x-iynk-guided"];
      expect(guided?.sealed).toBe(true);
      const spec = readDiagnoseSpec(copy);
      expect(spec.ok && spec.value?.answer).toEqual({ cause_id: "wrong-pin-in-code", fault: candidate().fault.id });
      expect(spec.ok && spec.value?.options.length).toBe(5);
      expect(copy.simulation.faults.some((f) => f.id === candidate().fault.id)).toBe(true);
      expect(frozen.simulation.faults).toEqual(doc.simulation.faults);
      expect(r.value.ops).toEqual([]);
    });

    it("hides the answer from the redacted view", () => {
      const r = breakTool(doc, view, sources, { t: "buddy", candidate: candidate(), texts });
      const copy = r.ok ? r.value.sealedDoc! : doc;
      const redacted = redactForUnrevealed(copy, "presented");
      const text = JSON.stringify(redacted);
      expect(text).not.toContain(candidate().fault.id);
      expect(text).not.toContain("because wrong-pin-in-code");
    });

    it("gives the same option order every time", () => {
      const first = breakTool(doc, view, sources, { t: "buddy", candidate: candidate(), texts });
      const second = breakTool(doc, view, sources, { t: "buddy", candidate: candidate(), texts });
      expect(first).toEqual(second);
    });
  });
});
