// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { canonicalize } from "../core/canonical.ts";
import { rng } from "../core/prng.ts";
import { AT } from "./apply/fixtures.testing.ts";
import { HANDLERS, applyBatch } from "./apply/index.ts";
import type { Handler, RejectCode } from "./apply/index.ts";
import { isReject } from "./apply/types.ts";
import type { Op, Project } from "./generated/types.ts";
import { stateHash } from "./hash.ts";
import { checkBatch } from "./semantic.ts";
import { DEFAULT_MIX, generateOp, generateSession, startProject } from "./testing/generators.ts";
import type { GeneratedSession } from "./testing/generators.ts";
import { batchesOf, hashOf, ownerOf, replayFrom, session } from "./testing/harness.ts";

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

let sessions: GeneratedSession[];

beforeAll(() => {
  sessions = SEEDS.map((seed) => generateSession(seed, 200));
});

/** Wires whose net is gone or no longer holds one of their pin ends. */
function danglingWires(state: Project): string[] {
  const members = new Map(state.nets.map((net) => [net.id, new Set(net.connections.map((c) => `${c.c}/${c.p}`))]));
  return state.views.flatMap((view) =>
    view.wires
      .filter((wire) => {
        const net = members.get(wire.net);
        return !net || [wire.from, wire.to].some((end) => end.kind === "pin" && !net.has(`${end.c}/${end.p}`));
      })
      .map((wire) => `${wire.id} in ${view.id}`),
  );
}

/**
 * Walks a session's log batch by batch from its start and reports what is wrong: a batch that does not replay, an
 * inverse that does not give the earlier hash back, a dangling wire, a reject the generator should never cause, or an
 * end state that is not the live one.
 */
function audit(run: GeneratedSession): string[] {
  const problems: string[] = [];
  for (const code of ["invariant", "malformed"] as const) {
    if (run.rejects[code]) problems.push(`${run.rejects[code]} ${code} rejects`);
  }
  let state = run.start;
  for (const batch of batchesOf(run.live.state.history.ops)) {
    const first = batch[0]!;
    const ctx = { author: first.author, at: first.at, invariants: checkBatch };
    const forward = applyBatch(state, batch.map((e) => e.op), ctx);
    if (!forward.ok) {
      problems.push(`seq ${first.seq} (${first.op.k}) replays as ${forward.reject.code}`);
      return problems;
    }
    const back = applyBatch(forward.state, forward.inverse, ctx);
    if (!back.ok) problems.push(`inverse of seq ${first.seq} (${first.op.k}) is ${back.reject.code}: ${back.reject.message}`);
    else if (stateHash(back.state) !== stateHash(state)) problems.push(`inverse of seq ${first.seq} (${first.op.k}) misses the hash`);
    problems.push(...danglingWires(forward.state).map((wire) => `dangling wire ${wire} after seq ${first.seq}`));
    state = { ...forward.state, history: { ...state.history, ops: [...state.history.ops, ...batch] } };
  }
  if (stateHash(state) !== hashOf(run.live)) problems.push("the replay ends in another hash than the live session");
  return problems;
}

describe("replay equals live", () => {
  it.each(SEEDS)("seed %i: the logged ops replay to the live hash", (seed) => {
    const run = sessions[seed - 1]!;
    expect(run.live.state.history.ops.length).toBeGreaterThanOrEqual(150);
    const replayed = replayFrom(run.start, run.live.state.history.ops);
    expect(stateHash(replayed)).toBe(hashOf(run.live));
    expect(replayed.revision).toBe(run.live.revision);
  });

  it("holds for a session that also undoes and redoes", () => {
    const run = generateSession(21, 100);
    for (let i = 0; i < 10; i++) run.live.undo();
    for (let i = 0; i < 4; i++) run.live.redo();
    expect(stateHash(replayFrom(run.start, run.live.state.history.ops))).toBe(hashOf(run.live));
  });
});

describe("inverses and wires", () => {
  it.each(SEEDS)("seed %i: every accepted op is undone by its inverse and leaves no dangling wire", (seed) => {
    expect(audit(sessions[seed - 1]!)).toEqual([]);
  });
});

describe("undo", () => {
  const withoutEdits = { ...DEFAULT_MIX, "source.edit": 0 };

  it.each(SEEDS)("seed %i: undoing everything gives the start hash, redoing gives the end hash", (seed) => {
    const { start, live } = generateSession(seed, 200, withoutEdits);
    const end = hashOf(live);
    let undone = 0;
    while (live.canUndo()) {
      expect(live.undo()?.ok, `undo ${undone}`).toBe(true);
      undone++;
    }
    expect(undone).toBeGreaterThan(100);
    expect(stateHash(live.state)).toBe(stateHash(start));
    while (live.canRedo()) expect(live.redo()?.ok).toBe(true);
    expect(hashOf(live)).toBe(end);
  });

  // The inverse of a source.edit is positioned over the edits that came after it. A later edit that covers the whole
  // range leaves a zero-length range there, and the undo of that later edit does not widen it again, so the first
  // edit is not undone. Remove `.fails` when the session or the inverse handles it.
  it.fails("gives the start hash after an edit that is covered by a later edit is undone twice", () => {
    const live = session(startProject(1));
    const author = ownerOf(live.state);
    const start = hashOf(live);
    const edit = (pos: number, del: number, ins: string): Op => ({
      k: "source.edit",
      id: "src_main",
      baseSeq: live.revision,
      pos,
      del,
      ins,
    });
    expect(live.apply(edit(0, 0, "abc"), author).ok).toBe(true);
    expect(live.apply(edit(0, 3, "Z"), author).ok).toBe(true);
    expect(live.undo()?.ok).toBe(true);
    expect(live.undo()?.ok).toBe(true);
    expect(hashOf(live)).toBe(start);
  });
});

function identityBreaks(before: Project, after: Project, op: Op): string[] {
  const named = JSON.stringify(op);
  const breaks: string[] = [];
  const compare = <T extends object>(what: string, was: readonly T[] | undefined, now: readonly T[] | undefined, key: (item: T) => string) => {
    const old = new Map((was ?? []).map((item) => [key(item), item]));
    for (const item of now ?? []) {
      const id = key(item);
      const earlier = old.get(id);
      if (earlier && earlier !== item && !named.includes(`"${id}"`) && canonicalize(earlier) === canonicalize(item)) {
        breaks.push(`${what} ${id} was copied`);
      }
    }
  };
  compare("board", before.boards, after.boards, (b) => b.id);
  compare("component", before.components, after.components, (c) => c.id);
  compare("net", before.nets, after.nets, (n) => n.id);
  compare("source", before.sources, after.sources, (s) => s.id);
  compare("fault", before.simulation.faults, after.simulation.faults, (f) => f.id);
  compare("test", before.tests, after.tests, (t) => t.id);
  compare("view", before.views, after.views, (v) => v.id);
  for (const view of after.views) {
    const earlier = before.views.find((v) => v.id === view.id);
    compare("placement", earlier?.placements, view.placements, (p) => p.c);
    compare("wire", earlier?.wires, view.wires, (w) => w.id);
  }
  return breaks;
}

describe("untouched entities", () => {
  it("stay the same object across 100 generated ops", () => {
    const live = session(startProject(99), 99, 1000);
    const author = ownerOf(live.state);
    const r = rng(99, "identity");
    let accepted = 0;
    const breaks: string[] = [];
    while (accepted < 100) {
      const op = generateOp(live.state, r);
      if (!op) continue;
      const before = live.state;
      const outcome = live.apply(op, author);
      if (!outcome.ok) continue;
      accepted++;
      breaks.push(...identityBreaks(before, live.state, op).map((b) => `${op.k}: ${b}`));
    }
    expect(breaks).toEqual([]);
  });
});

interface Probe {
  code: RejectCode;
  ops: Op[];
  author?: { actor: string; kind: "user" };
  from?: () => Project;
}

const RESISTOR = { ref: "core.resistor", version: "1.0.0" };
const R1_P1 = { c: "cmp_r1", p: "P1" };
const R1_P2 = { c: "cmp_r1", p: "P2" };
const net = (id: string, ...connections: [typeof R1_P1, ...(typeof R1_P1)[]]): Op => ({
  k: "net.create",
  net: { id, connections },
});

const PROBES: Probe[] = [
  { code: "malformed", ops: [{ k: "net.merge", into: "net_a", from: "net_a" }] },
  {
    code: "duplicate_id",
    ops: [{ k: "component.add", component: { id: "cmp_r1", definition: RESISTOR, refdes: "R9" } }],
  },
  { code: "missing_target", ops: [{ k: "component.remove", id: "cmp_nope" }] },
  { code: "missing_pin", ops: [net("net_a", { c: "cmp_r1", p: "NOPE" })] },
  { code: "pin_in_use", ops: [net("net_a", R1_P1), net("net_b", R1_P1)] },
  {
    code: "unknown_definition",
    ops: [{ k: "component.add", component: { id: "cmp_x", definition: { ref: "core.ghost", version: "1.0.0" }, refdes: "X1" } }],
  },
  {
    code: "missing_pin_map",
    ops: [
      net("net_a", R1_P1),
      { k: "component.swap", id: "cmp_r1", definition: { ref: "core.led-5mm", version: "1.0.0" }, pinMap: {} },
    ],
  },
  {
    code: "referenced_by",
    ops: [
      net("net_a", R1_P1),
      {
        k: "fault.set",
        fault: { id: "flt_a", cause_id: "short", symptom_ids: [], kind: "short", target: { net: "net_a" }, enabled: true },
      },
      { k: "net.disconnect", pin: R1_P1 },
    ],
  },
  {
    code: "invariant",
    ops: [
      net("net_a", R1_P1),
      net("net_b", R1_P2),
      { k: "net.rename", id: "net_a", name: "same" },
      { k: "net.rename", id: "net_b", name: "same" },
    ],
  },
  {
    code: "quota",
    ops: [{ k: "source.edit", id: "src_main", baseSeq: 0, pos: 0, del: 0, ins: "x".repeat(70_000) }],
  },
  {
    code: "permission",
    ops: [{ k: "access.grant", actor: "usr_friend", role: "viewer" }],
    author: { actor: "usr_stranger", kind: "user" },
  },
  {
    code: "stale_base",
    ops: [{ k: "source.edit", id: "src_main", baseSeq: 3, pos: 0, del: 0, ins: "x" }],
    from: () => {
      const start = startProject(1);
      return { ...start, revision: 10, history: { ...start.history, baseRevision: 10 } };
    },
  },
];

describe("rejected ops", () => {
  it.each(PROBES)("$code leaves the state the same object", ({ code, ops, author, from }) => {
    const live = session(from?.() ?? startProject(1));
    const before = live.state;
    const outcome = live.apply(ops, author ?? ownerOf(before));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reject).toBe(code);
    expect(live.state).toBe(before);
    expect(live.revision).toBe(before.revision);
  });

  it("covers every reject code apply can answer, and prints how often each came up", () => {
    const counts: Partial<Record<RejectCode, number>> = {};
    for (const run of sessions) {
      for (const [code, n] of Object.entries(run.rejects) as [RejectCode, number][]) counts[code] = (counts[code] ?? 0) + n;
    }
    const generated = { ...counts };
    for (const { code } of PROBES) counts[code] = (counts[code] ?? 0) + 1;

    console.info("reject codes (20 sessions of 200 proposed ops, plus one probe per code):");
    for (const [code, n] of Object.entries(counts)) {
      console.info(`  ${code.padEnd(20)}${String(n).padStart(4)}  (${generated[code as RejectCode] ?? 0} from the generator)`);
    }

    // schema_mismatch is the room server's answer to a client on another op schema; apply never gives it.
    const every: RejectCode[] = [
      "malformed", "duplicate_id", "missing_target", "missing_pin", "pin_in_use", "unknown_definition",
      "missing_pin_map", "referenced_by", "invariant", "quota", "permission", "stale_base",
    ];
    for (const code of every) expect(counts[code], code).toBeGreaterThan(0);
  });
});

type Table = Record<string, Handler<Op["k"]> | undefined>;

/** Runs `run` with the handler of `kind` swapped for `make(original)`, and puts the original back. */
function withHandler<T>(kind: Op["k"], make: (original: Handler<Op["k"]>) => Handler<Op["k"]>, run: () => T): T {
  const table = HANDLERS as Table;
  const original = table[kind]!;
  table[kind] = make(original);
  try {
    return run();
  } finally {
    table[kind] = original;
  }
}

/** RS-09 mutant: a removal that leaves the views as they were, so wires and placements outlive their part. */
const skipCascade = (original: Handler<Op["k"]>): Handler<Op["k"]> => (state, op, ctx) => {
  const result = original(state, op, ctx);
  return isReject(result) ? result : { ...result, state: { ...result.state, views: state.views } };
};

/** RS-09 mutant: every third add is acknowledged but never lands. */
const skipOp = (original: Handler<Op["k"]>): Handler<Op["k"]> => {
  let calls = 0;
  return (state, op, ctx) => {
    const result = original(state, op, ctx);
    return !isReject(result) && ++calls % 3 === 0 ? { ...result, state } : result;
  };
};

const flagged = (): number[] => SEEDS.filter((seed) => audit(generateSession(seed, 200)).length > 0);

describe("the checks bite (RS-09 mutants)", () => {
  it("pass on the real handlers for the seeds the mutants run on", () => {
    expect(flagged()).toEqual([]);
  });

  it("a skipped cascade leaves a dangling wire that the wire check sees", () => {
    const live = session(startProject(1));
    const author = ownerOf(live.state);
    const wired = [
      net("net_a", R1_P1, { c: "cmp_r2", p: "P1" }),
      { k: "wire.add", view: "vw_main", wire: { id: "wir_a", net: "net_a", from: { kind: "pin", c: "cmp_r1", p: "P1" }, to: { kind: "pin", c: "cmp_r2", p: "P1" } } },
    ] satisfies Op[];
    expect(live.apply(wired, author).ok).toBe(true);

    const remove: Op[] = [{ k: "component.remove", id: "cmp_r1" }];
    const ctx = { author, at: AT };
    const real = applyBatch(live.state, remove, ctx);
    expect(real.ok && danglingWires(real.state)).toEqual([]);

    const mutated = withHandler("component.remove", skipCascade, () => applyBatch(live.state, remove, ctx));
    expect(mutated.ok && danglingWires(mutated.state)).toEqual(["wir_a in vw_main"]);
  });

  it("a skipped cascade is caught in a generated run", () => {
    expect(withHandler("component.remove", skipCascade, flagged).length).toBeGreaterThan(0);
  });

  it("a skipped op is caught in a generated run", () => {
    expect(withHandler("component.add", skipOp, flagged).length).toBeGreaterThan(0);
  });

  it("leaves the real handlers back in place", () => {
    const before = HANDLERS["component.remove"];
    withHandler("component.remove", skipCascade, () => undefined);
    expect(HANDLERS["component.remove"]).toBe(before);
  });
});
