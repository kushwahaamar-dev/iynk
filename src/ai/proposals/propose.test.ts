// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateOp } from "../../project/generated/validate.mjs";
import type { RandomSource } from "../../core/ids.ts";
import { redactSecrets } from "../context/redact.ts";
import { checkStatic, newProposalId, parseRecord, proposeOpsTool } from "./propose.ts";
import type { StaticCtx } from "./propose.ts";
import { OP_GROUPS } from "./risk.ts";
import type { OpGroup } from "./types.ts";

const ALL: ReadonlySet<OpGroup> = new Set(["core", "board", "mech", "sim", "meta"]);

const ctx = (extra: Partial<StaticCtx> = {}): StaticCtx => ({
  mode: "direct",
  loaded: ALL,
  role: "editor",
  sealedOpen: false,
  offered: true,
  validateOp: (op) => (validateOp(op) ? { ok: true } : { ok: false, message: "bad op" }),
  secretShape: (s) => redactSecrets(s).count > 0,
  risk: { knownDef: () => true, sourceText: () => undefined, testExists: () => false, addedInProposal: new Set() },
  ...extra,
});

const LABEL = { k: "label.set", view: "vw_main", label: { id: "lbl_a", text: "hi", x_mm: 0, y_mm: 0 } };
const FIELDS = { title: "t", kind: "fix", rationale: "r" };
const proposal = (steps: unknown) => ({ ...FIELDS, steps });
const oneStep = (ops: unknown[]) => proposal([{ id: "s1", label: "go", ops }]);
const codes = (raw: unknown, c = ctx()) => {
  const result = checkStatic(raw, c);
  return result.ok ? [] : result.rejects.map((r) => r.code);
};

describe("P1", () => {
  it("accepts a small proposal and gives each step its risk", () => {
    const result = checkStatic(oneStep([{ k: "net.delete", id: "net_a" }]), ctx());
    expect(result).toMatchObject({ ok: true, stepRisk: { s1: 2 } });
  });

  it("rejects empty and malformed arguments", () => {
    expect(codes(proposal([]))).toEqual(["bad_args"]);
    expect(codes(oneStep([]))).toEqual(["bad_args"]);
    expect(codes({ ...FIELDS, steps: [{ id: "S1", label: "x", ops: [LABEL] }] })).toEqual(["bad_args"]);
    expect(codes("nope")).toEqual(["bad_args"]);
  });

  it("holds the step, op and size limits", () => {
    const step = (id: string, n: number) => ({ id, label: "x", ops: Array.from({ length: n }, () => LABEL) });
    expect(codes(proposal([step("a", 40), step("b", 40), step("c", 40)]))).toEqual([]);
    expect(codes(proposal([step("a", 41)]))).toEqual(["too_many_ops"]);
    expect(codes(proposal([step("a", 40), step("b", 40), step("c", 40), step("d", 1)]))).toEqual(["too_many_ops"]);
    expect(codes(proposal(Array.from({ length: 13 }, (_, i) => step(`s${i}`, 1))))).toEqual(["too_many_ops"]);
    const fat = { k: "label.set", view: "vw_main", label: { id: "lbl_a", text: "x".repeat(33_000), x_mm: 0, y_mm: 0 } };
    expect(codes(oneStep([fat]))).toEqual(["too_large"]);
    const edit = (n: number) => ({ k: "source.edit", id: "src_a", baseSeq: 0, pos: 0, del: 0, ins: "x".repeat(n) });
    expect(codes(oneStep([edit(8000)]))).toEqual([]);
    expect(codes(oneStep([edit(8001)]))).toEqual(["too_large"]);
  });

  it("rejects repeated step ids, unknown dependencies and cycles", () => {
    const step = (id: string, dependsOn?: string[]) => ({ id, label: "x", ops: [LABEL], dependsOn });
    expect(codes(proposal([step("a"), step("a")]))).toEqual(["bad_args"]);
    expect(codes(proposal([step("a", ["zz"])]))).toEqual(["bad_args"]);
    expect(codes(proposal([step("a", ["a"])]))).toEqual(["dependency_cycle"]);
    expect(codes(proposal([step("a", ["b"]), step("b", ["a"])]))).toEqual(["dependency_cycle"]);
    expect(codes(proposal([step("a"), step("b", ["a"])]))).toEqual([]);
  });
});

describe("P2 to P5", () => {
  it("rejects an op the validator refuses", () => {
    expect(codes(oneStep([{ k: "net.delete" }]))).toEqual(["malformed"]);
  });

  it.each([
    { k: "access.grant", actor: "usr_a", role: "editor" },
    { k: "access.revoke", actor: "usr_a" },
    { k: "access.set", access: {} },
    { k: "actor.set", actor: {} },
    { k: "actor.remove", id: "usr_a" },
    { k: "license.set", license: {} },
    { k: "asset.add", asset: {} },
    { k: "domain.set", domain: {} },
    { k: "domain.patch", domain: "robotics", patch: {} },
    { k: "provenance.set", provenance: {} },
    { k: "sim.set", key: "solver", value: "x" },
    { k: "meta.set", set: { kind: "bench" } },
    { k: "dep.set", dependency: { ref: "x.y", version: "1.0.0", origin: "library", interface: {} } },
  ])("keeps %j away from the dry run", (bad) => {
    const strict = ctx({
      validateOp: () => ({ ok: true }),
      risk: { knownDef: () => false, sourceText: () => undefined, testExists: () => false, addedInProposal: new Set() },
    });
    expect(codes(oneStep([bad]), strict)).toEqual(["forbidden_op"]);
  });

  it("asks for the group when it is not loaded", () => {
    const core: ReadonlySet<OpGroup> = new Set(["core"]);
    const result = checkStatic(oneStep([{ k: "mech.remove", id: "x" }]), ctx({ loaded: core, validateOp: () => ({ ok: true }) }));
    expect(result).toMatchObject({ ok: false, rejects: [{ code: "mode_blocked", stage: "P3" }] });
  });

  it("blocks by mode gate and sealed items before looking at ops", () => {
    expect(codes(oneStep([LABEL]), ctx({ mode: "beginner", offered: false }))).toEqual(["mode_blocked"]);
    expect(codes(oneStep([LABEL]), ctx({ sealedOpen: true }))).toEqual(["sealed_item"]);
  });

  it.each(["owner", "editor"] as const)("lets a %s through", (role) => {
    expect(codes(oneStep([LABEL]), ctx({ role }))).toEqual([]);
  });

  it.each(["commenter", "viewer"] as const)("stops a %s", (role) => {
    expect(codes(oneStep([LABEL]), ctx({ role }))).toEqual(["permission"]);
  });

  it("rejects a placeholder and a key-shaped string", () => {
    const text = (value: string) => ({ ...LABEL, label: { id: "lbl_a", text: value, x_mm: 0, y_mm: 0 } });
    expect(codes(oneStep([text("[redacted-secret]")]))).toEqual(["forbidden_op"]);
    expect(codes(oneStep([text("sk-abcdefghijklmnopqrstuvwxyz0123")]))).toEqual(["forbidden_op"]);
  });

  it("lists at most 20 rejects and counts the rest", () => {
    const result = checkStatic(oneStep(Array.from({ length: 30 }, () => ({ k: "net.delete" }))), ctx());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejects).toHaveLength(21);
      expect(result.rejects[20]!.message).toBe("and 10 more");
    }
  });

  it("checks 120 ops", () => {
    const step = (id: string) => ({ id, label: "x", ops: Array.from({ length: 40 }, () => LABEL) });
    const started = performance.now();
    const result = checkStatic(proposal([step("a"), step("b"), step("c")]), ctx());
    console.info(`checkStatic, 120 ops: ${(performance.now() - started).toFixed(2)} ms`);
    expect(result.ok).toBe(true);
  });
});

describe("proposeOpsTool", () => {
  it("offers only the kinds of the loaded groups", () => {
    const tool = proposeOpsTool(new Set(["core"]));
    const text = JSON.stringify(tool.parameters);
    expect(text).toContain("component.add");
    expect(text).not.toContain("mech.set");
    expect(JSON.stringify(proposeOpsTool(ALL).parameters)).toContain("mech.set");
    expect(OP_GROUPS.core).not.toContain("mech.set");
  });
});

describe("newProposalId", () => {
  it("matches the schema pattern", () => {
    const rand: RandomSource = { bytes: (n) => Uint8Array.from({ length: n }, (_, i) => i * 37 + 5) };
    const id = newProposalId(rand);
    expect(id).toMatch(/^prp_[a-z0-9][a-z0-9_-]{0,63}$/);
    expect(id).toHaveLength(16);
  });
});

describe("parseRecord", () => {
  const row = {
    proposal: { status: "open" },
    projectId: "prj_a",
    state: "open",
    stepMeta: {},
    threadId: "th",
    mode: "direct",
    provider: "p",
    model: "m",
    origin: "model",
    readSet: [],
    touched: [],
    sourceSpans: [],
    baseSources: null,
    taint: { classes: [], sources: [] },
    retries: 0,
    createdAt: 1,
  };

  it("returns a sound row and refuses the rest", () => {
    expect(parseRecord(row, () => true)).toBe(row);
    expect(parseRecord(row, () => false)).toBeNull();
    expect(parseRecord({ ...row, state: "accepted" }, () => true)).toBeNull();
    expect(parseRecord({ ...row, origin: "x" }, () => true)).toBeNull();
    expect(parseRecord(null, () => true)).toBeNull();
  });
});
