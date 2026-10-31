// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../../core/sha256.ts";
import { applyBatch } from "../../project/apply/index.ts";
import type { Op, Role } from "../../project/generated/types.ts";
import { stateHash } from "../../project/hash.ts";
import { lessonSession } from "../../project/session.testing.ts";
import type { ProjectSession } from "../../project/session.ts";
import { acceptProposal, undoAccept, withDependencies } from "./accept.ts";
import type { AcceptDeps, AcceptSelection } from "./accept.ts";
import type { CheckPort, ProposalStore } from "./ports.ts";
import type { ProposalRecord, ProposeOpsArgs } from "./types.ts";

const relabel = (id: string, label: string): Op => ({ k: "component.set", id, set: { label } });
const USER = { actor: "usr_amar", kind: "user" } as const;

const quietChecks = (): CheckPort => ({
  rules: async () => [],
  compile: async () => ({ skipped: "none" }),
  tests: async () => [],
  run: async () => ({ ms: 0, limited: false }),
});

interface Rig {
  session: ProjectSession;
  deps: AcceptDeps;
  saved: ProposalRecord[];
  logged: string[];
  setRole(role: Role): void;
  failNextCommit(): void;
}

function rig(): Rig {
  const session = lessonSession();
  const saved: ProposalRecord[] = [];
  const logged: string[] = [];
  let role: Role = "owner";
  let race = false;
  const store: ProposalStore = {
    put: async (record) => void saved.push(record),
    get: async () => undefined,
    list: async () => [],
    remove: async () => undefined,
    sweep: async () => 0,
  };
  const project: AcceptDeps["project"] = {
    snapshot: () => ({ state: session.state, revision: session.revision }),
    opsSince: (base) => ({ complete: true, ops: session.state.history.ops.filter((e) => e.seq > base) }),
    commit({ id, ops, author, label }) {
      if (race) {
        race = false;
        return { ok: false, reject: "missing_target", message: "a remote edit removed the target" };
      }
      const result = session.apply(ops, author, { batch: id, label });
      return result.ok ? { ok: true, revision: result.revision } : result;
    },
    undo: () => ({ ok: session.undo()?.ok ?? false }),
    role: () => role,
    actor: () => "usr_amar",
  };
  const deps: AcceptDeps = {
    project,
    dry: {
      project,
      checks: quietChecks(),
      apply: { applyBatch: (state, ops, author) => applyBatch(state, ops, { author, at: "2026-10-28T10:00:00.000Z" }) },
      descriptors: { tier: () => "T0" },
      sha256: sha256Hex,
      visibleTests: () => [],
    },
    store,
    clock: { now: () => 42 },
    log: { record: (row) => void logged.push(row.kind) },
    touchedOf: (op) => ("id" in op && typeof op.id === "string" ? [op.id] : []),
  };
  return {
    session,
    deps,
    saved,
    logged,
    setRole: (next) => void (role = next),
    failNextCommit: () => void (race = true),
  };
}

const ARGS: ProposeOpsArgs = {
  title: "Relabel",
  kind: "fix",
  rationale: "clearer names",
  steps: [
    { id: "s1", label: "Name the resistor", ops: [relabel("cmp_res1", "R-limit")] },
    { id: "s2", label: "Name the LED", ops: [relabel("cmp_led1", "Status")], dependsOn: ["s1"] },
    { id: "s3", label: "Name the button", ops: [relabel("cmp_btn1", "Press")] },
  ],
};

function recordFor(session: ProjectSession, risk2: string[] = []): ProposalRecord {
  const steps = ARGS.steps.map(({ id, label, ops, dependsOn }) => ({ id, label, ops, dependsOn }));
  return {
    proposal: {
      id: "prp_test",
      base: session.revision,
      author: { actor: "usr_amar", model: "model-x" },
      status: "open",
      steps: steps as ProposalRecord["proposal"]["steps"],
    },
    projectId: session.state.id,
    state: "open",
    stepMeta: Object.fromEntries(ARGS.steps.map((s) => [s.id, { risk: risk2.includes(s.id) ? 2 : 1, confirmed: false }])),
    threadId: "thr_a",
    mode: "direct",
    provider: "test",
    model: "model-x",
    origin: "model",
    readSet: [],
    touched: ["cmp_res1", "cmp_led1", "cmp_btn1"],
    sourceSpans: [],
    baseSources: {},
    taint: { classes: [], sources: [] },
    retries: 0,
    createdAt: 1,
  };
}

async function shownHash(r: Rig, rec: ProposalRecord, stepIds: string[]): Promise<string> {
  const { dryRun } = await import("./dryrun.ts");
  return (await dryRun({ ...ARGS, steps: ARGS.steps }, r.deps.dry, { stepIds })).diffHash;
}

const pick = (stepIds: string[], extra: Partial<AcceptSelection> = {}): AcceptSelection => ({
  stepIds,
  confirmed: [],
  anyway: false,
  shownDiffHash: "",
  ...extra,
});

describe("withDependencies", () => {
  it("adds what a picked step depends on, in the original order", () => {
    expect(withDependencies(ARGS, ["s2"])).toEqual({ stepIds: ["s1", "s2"], added: ["s1"] });
    expect(withDependencies(ARGS, ["s3", "s1"])).toEqual({ stepIds: ["s1", "s3"], added: [] });
  });
});

describe("acceptProposal", () => {
  it("applies every step as one batch that one undo takes back", async () => {
    const r = rig();
    const rec = recordFor(r.session);
    const before = stateHash(r.session.state);
    const shown = await shownHash(r, rec, ["s1", "s2", "s3"]);
    const result = await acceptProposal(rec, pick(["s1", "s2", "s3"], { shownDiffHash: shown }), r.deps);
    expect(result).toMatchObject({ ok: true, state: "accepted", batch: "prp_test" });
    const { ops } = r.session.state.history;
    expect(ops).toHaveLength(3);
    expect(ops.every((e) => e.batch === "prp_test")).toBe(true);
    expect(ops[0]!.author).toMatchObject({ kind: "ai", proposal: "prp_test", model: "model-x" });
    expect(r.saved.at(-1)).toMatchObject({ state: "accepted", decision: { rejected: [] } });
    expect(r.logged).toEqual(["proposal.accepted"]);

    expect(undoAccept(r.deps.project, rec, r.session.undoStackTop())).toEqual({ ok: true });
    expect(stateHash(r.session.state)).toBe(before);
  });

  it("pulls in a dependency and records a partial accept", async () => {
    const r = rig();
    const rec = recordFor(r.session);
    const shown = await shownHash(r, rec, ["s1", "s2"]);
    const result = await acceptProposal(rec, pick(["s2"], { shownDiffHash: shown }), r.deps);
    expect(result).toMatchObject({ ok: true, state: "partial" });
    expect(r.session.state.history.ops).toHaveLength(2);
    expect(r.saved.at(-1)?.decision).toMatchObject({ accepted: ["s1", "s2"], rejected: ["s3"] });
  });

  it("asks for confirmation of a risk 2 step", async () => {
    const r = rig();
    const rec = recordFor(r.session, ["s3"]);
    const result = await acceptProposal(rec, pick(["s3"]), r.deps);
    expect(result).toEqual({ ok: false, reason: "needs_confirm", stepIds: ["s3"] });
    expect(r.session.state.history.ops).toHaveLength(0);
  });

  it("refuses an empty or unknown selection", async () => {
    const r = rig();
    const rec = recordFor(r.session);
    expect(await acceptProposal(rec, pick([]), r.deps)).toMatchObject({ reason: "bad_selection" });
    expect(await acceptProposal(rec, pick(["zz"]), r.deps)).toMatchObject({ reason: "bad_selection" });
  });

  it("refuses as stale when another edit touched the same part, and leaves the document alone", async () => {
    const r = rig();
    const rec = recordFor(r.session);
    r.session.apply(relabel("cmp_res1", "mine"), USER);
    const hash = stateHash(r.session.state);
    const result = await acceptProposal(rec, pick(["s1"]), r.deps);
    expect(result).toMatchObject({ ok: false, reason: "stale", verdict: { reason: "id_overlap" } });
    expect(stateHash(r.session.state)).toBe(hash);
    expect(r.saved.at(-1)?.state).toBe("stale");
  });

  it("refreshes the card when the diff on screen is not the one it would apply", async () => {
    const r = rig();
    const rec = recordFor(r.session);
    const result = await acceptProposal(rec, pick(["s1"], { shownDiffHash: "old" }), r.deps);
    expect(result).toMatchObject({ ok: false, reason: "refreshed" });
    expect(r.session.state.history.ops).toHaveLength(0);
    expect(r.saved.at(-1)?.dryRun).toBeDefined();
  });

  it("holds back a failing proposal until the person insists", async () => {
    const r = rig();
    const rec = recordFor(r.session);
    r.deps.dry.checks.rules = async (state) =>
      state.components.some((c) => c.label === "R-limit")
        ? [{ ruleId: "r1", severity: "error", targets: ["cmp_res1"], text: "bad" }]
        : [];
    const shown = await shownHash(r, rec, ["s1"]);
    expect(await acceptProposal(rec, pick(["s1"], { shownDiffHash: shown }), r.deps)).toEqual({
      ok: false,
      reason: "failing",
    });
    expect(await acceptProposal(rec, pick(["s1"], { shownDiffHash: shown, anyway: true }), r.deps)).toMatchObject({
      ok: true,
    });
  });

  it("leaves the document unchanged when the commit is refused", async () => {
    const r = rig();
    const rec = recordFor(r.session);
    const shown = await shownHash(r, rec, ["s1"]);
    const hash = stateHash(r.session.state);
    r.failNextCommit();
    const result = await acceptProposal(rec, pick(["s1"], { shownDiffHash: shown }), r.deps);
    expect(result).toMatchObject({ ok: false, reason: "apply_rejected", reject: { code: "missing_target" } });
    expect(stateHash(r.session.state)).toBe(hash);
    expect(r.saved).toHaveLength(0);
  });

  it("refuses a viewer", async () => {
    const r = rig();
    r.setRole("viewer");
    const result = await acceptProposal(recordFor(r.session), pick(["s1"]), r.deps);
    expect(result).toMatchObject({ reason: "apply_rejected", reject: { code: "permission" } });
  });
});

describe("undoAccept", () => {
  it("says not_last once something else was done after the accept", async () => {
    const r = rig();
    const rec = recordFor(r.session);
    const shown = await shownHash(r, rec, ["s1"]);
    await acceptProposal(rec, pick(["s1"], { shownDiffHash: shown }), r.deps);
    r.session.apply(relabel("cmp_led1", "later"), USER);
    expect(undoAccept(r.deps.project, rec, r.session.undoStackTop())).toEqual({ ok: false, reason: "not_last" });
  });
});
