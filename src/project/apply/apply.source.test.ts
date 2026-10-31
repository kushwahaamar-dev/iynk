// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LIMITS } from "../../core/limits.ts";
import type { Op, OpEnvelope, Project, Source } from "../generated/types.ts";
import { validateOp } from "../generated/validate.mjs";
import { stateHash } from "../hash.ts";
import { accept, ctxFor, deepFreeze, loadExample, monitorAt140, refuse, roundTrip } from "./fixtures.testing.ts";
import { applyBatch } from "./index.ts";

const blink = (): Project => loadExample("uno-blink-d12");

const helper: Source = {
  id: "src_util",
  path: "util.h",
  language: "cpp",
  role: "firmware",
  board: "brd_uno",
  content: "int twice(int x);\n",
};

const textOf = (state: Project, id: string): string => state.sources.find((s) => s.id === id)?.content ?? "";

/** `source.edit` ops already in the room: `seq` follows the project's revision. */
function withTail(state: Project, id: string, edits: { pos: number; del: number; ins: string }[]): Project {
  const copy = structuredClone(state);
  let content = textOf(copy, id);
  edits.forEach((edit, i) => {
    content = content.slice(0, edit.pos) + edit.ins + content.slice(edit.pos + edit.del);
    const envelope: OpEnvelope = {
      opId: `op_tail${i}`,
      seq: state.revision + 1 + i,
      base: state.revision + i,
      author: { actor: "usr_friend", kind: "user" },
      at: "2026-10-28T09:00:00.000Z",
      op: { k: "source.edit", id, baseSeq: state.revision + i, ...edit },
    };
    copy.history.ops.push(envelope);
  });
  (copy.sources.find((s) => s.id === id) as Source).content = content;
  copy.revision = state.revision + edits.length;
  return copy;
}

describe("source.add", () => {
  it("adds a source in order and undoes with a remove", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "source.add", source: helper };
    expect(accept(state, [op]).state.sources.map((s) => s.id)).toEqual(["src_blink", "src_util"]);
    expect(roundTrip(state, [op])).toEqual([{ k: "source.remove", id: "src_util" }]);
  });

  it("turns CRLF and lone CR into LF and leaves other characters alone", () => {
    const content = "a\r\nb\rc\u00e9\u0301\n";
    const out = accept(deepFreeze(blink()), [{ k: "source.add", source: { ...helper, content } }]);
    expect(textOf(out.state, "src_util")).toBe("a\nb\nc\u00e9\u0301\n");
  });

  it("refuses an id in use, a path in use ignoring case, a reserved name and a path that is not NFC", () => {
    const state = deepFreeze(blink());
    refuse(state, [{ k: "source.add", source: { ...helper, id: "src_blink" } }], "duplicate_id");
    refuse(state, [{ k: "source.add", source: { ...helper, path: "Blink.INO" } }], "duplicate_id");
    refuse(state, [{ k: "source.add", source: { ...helper, path: "lib/Aux.txt" } }], "malformed");
    refuse(state, [{ k: "source.add", source: { ...helper, path: "café.h" } }], "malformed");
  });

  it("refuses a path the schema forbids", () => {
    const state = deepFreeze(blink());
    for (const path of ["../x.h", "/x.h", "a/./b.h", "a\\b.h", "a:b.h"]) {
      refuse(state, [{ k: "source.add", source: { ...helper, path } }], "malformed");
    }
  });

  it("refuses a 21st source and an op over the 64 KiB envelope", () => {
    const full = blink();
    full.sources = Array.from({ length: LIMITS.sources }, (_, i) => ({ ...helper, id: `src_f${i}`, path: `f${i}.h` }));
    refuse(deepFreeze(full), [{ k: "source.add", source: helper }], "quota");
    const big = "x".repeat(LIMITS.opEnvelopeBytes);
    refuse(deepFreeze(blink()), [{ k: "source.add", source: { ...helper, content: big } }], "quota");
  });

  it("refuses text with a lone surrogate", () => {
    refuse(deepFreeze(blink()), [{ k: "source.add", source: { ...helper, content: "a\ud800b" } }], "malformed");
  });
});

describe("source.remove", () => {
  it("removes a source and takes it off the firmware list of the board that names it", () => {
    const base = accept(blink(), [
      { k: "source.add", source: helper },
      {
        k: "board.set",
        id: "brd_uno",
        firmware: { language: "arduino-cpp", entry: "src_blink", sources: ["src_blink", "src_util"] },
      },
    ]).state;
    const state = deepFreeze(base);
    const out = accept(state, [{ k: "source.remove", id: "src_util" }]);
    expect(out.state.sources.map((s) => s.id)).toEqual(["src_blink"]);
    expect(out.state.boards[0].firmware?.sources).toEqual(["src_blink"]);
    expect(out.inverse).toEqual([
      { k: "source.add", source: helper },
      { k: "board.set", id: "brd_uno", firmware: state.boards[0].firmware },
    ]);
    roundTrip(state, [{ k: "source.remove", id: "src_util" }]);
  });

  it("refuses the entry of a firmware, with a pointer to it, and a missing source", () => {
    const state = deepFreeze(blink());
    expect(refuse(state, [{ k: "source.remove", id: "src_blink" }], "referenced_by").refs).toEqual([
      "/boards/0/firmware/entry",
    ]);
    refuse(state, [{ k: "source.remove", id: "src_none" }], "missing_target");
  });

  it("undoes a remove with an add", () => {
    const state = accept(blink(), [{ k: "source.add", source: helper }]).state;
    expect(roundTrip(deepFreeze(state), [{ k: "source.remove", id: "src_util" }])).toEqual([
      { k: "source.add", source: helper },
    ]);
  });
});

describe("source.rename", () => {
  it("changes the path and undoes it", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "source.rename", id: "src_blink", path: "src/blink.ino" };
    expect(accept(state, [op]).state.sources[0].path).toBe("src/blink.ino");
    expect(roundTrip(state, [op])).toEqual([{ k: "source.rename", id: "src_blink", path: "blink.ino" }]);
  });

  it("refuses a missing source and a reserved name", () => {
    const state = deepFreeze(blink());
    refuse(state, [{ k: "source.rename", id: "src_none", path: "a.ino" }], "missing_target");
    refuse(state, [{ k: "source.rename", id: "src_blink", path: "nul.ino" }], "malformed");
  });

  it("leaves a clash with another path to the batch-end check", () => {
    const state = deepFreeze(accept(blink(), [{ k: "source.add", source: helper }]).state);
    const clash: Op = { k: "source.rename", id: "src_util", path: "BLINK.ino" };
    accept(state, [clash]);
    const invariants = (next: Project) =>
      new Set(next.sources.map((s) => s.path.toLowerCase())).size === next.sources.length
        ? []
        : [{ code: "V3-PATH", severity: "error" as const, path: "/sources", message: "paths clash" }];
    const outcome = applyBatch(state, [clash], ctxFor(undefined, invariants));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reject.code).toBe("invariant");
  });
});

describe("source.edit", () => {
  const edit = (pos: number, del: number, ins: string, baseSeq = 0): Op => ({
    k: "source.edit",
    id: "src_util",
    baseSeq,
    pos,
    del,
    ins,
  });
  const util = () => {
    const state = accept(blink(), [{ k: "source.add", source: { ...helper, content: "0123456789" } }]).state;
    state.revision = 10;
    state.history.baseRevision = 10;
    state.history.ops = [];
    return state;
  };

  it("inserts, deletes and replaces", () => {
    const state = deepFreeze(util());
    expect(textOf(accept(state, [edit(3, 0, "ab", 10)]).state, "src_util")).toBe("012ab3456789");
    expect(textOf(accept(state, [edit(3, 4, "", 10)]).state, "src_util")).toBe("012789");
    expect(textOf(accept(state, [edit(3, 4, "xy", 10)]).state, "src_util")).toBe("012xy789");
  });

  it("replaces the whole file", () => {
    const state = deepFreeze(util());
    expect(textOf(accept(state, [edit(0, 10, "new\n", 10)]).state, "src_util")).toBe("new\n");
  });

  it("counts offsets in UTF-16 code units", () => {
    const base = accept(util(), [
      { k: "source.add", source: { ...helper, id: "src_emoji", path: "e.txt", content: "a\u{1f600}b" } },
    ]).state;
    const state = deepFreeze(base);
    const op: Op = { k: "source.edit", id: "src_emoji", baseSeq: 10, pos: 3, del: 0, ins: "!" };
    expect(textOf(accept(state, [op]).state, "src_emoji")).toBe("a\u{1f600}!b");
    refuse(state, [{ ...op, pos: 2 } as Op], "malformed");
    refuse(state, [{ k: "source.edit", id: "src_emoji", baseSeq: 10, pos: 1, del: 1, ins: "" }], "malformed");
    expect(
      textOf(
        accept(state, [{ k: "source.edit", id: "src_emoji", baseSeq: 10, pos: 1, del: 2, ins: "" }]).state,
        "src_emoji",
      ),
    ).toBe("ab");
  });

  it("refuses an edit past the end, a lone surrogate and a missing source", () => {
    const state = deepFreeze(util());
    refuse(state, [edit(8, 3, "", 10)], "malformed");
    refuse(state, [edit(11, 0, "", 10)], "malformed");
    refuse(state, [edit(0, 0, "\ud83d", 10)], "malformed");
    refuse(state, [{ k: "source.edit", id: "src_none", baseSeq: 10, pos: 0, del: 0, ins: "" }], "missing_target");
  });

  it("normalises the inserted line ends to LF", () => {
    const state = deepFreeze(util());
    expect(textOf(accept(state, [edit(0, 0, "a\r\nb\r", 10)]).state, "src_util")).toBe("a\nb\n0123456789");
  });

  it("refuses a result over the byte cap", () => {
    const base = util();
    (base.sources.find((s) => s.id === "src_util") as Source).content = "x".repeat(LIMITS.sourceBytes);
    refuse(deepFreeze(base), [edit(0, 0, "y", 10)], "quota");
    accept(deepFreeze(base), [edit(0, 1, "y", 10)]);
  });

  it("refuses a baseSeq older than the retained history", () => {
    refuse(deepFreeze(util()), [edit(0, 0, "a", 9)], "stale_base");
  });

  it("moves the range over one later edit", () => {
    const state = deepFreeze(withTail(util(), "src_util", [{ pos: 0, del: 0, ins: "AAA" }]));
    expect(textOf(accept(state, [edit(5, 2, "-", 10)]).state, "src_util")).toBe("AAA01234-789");
  });

  it("moves the range over three later edits, and keeps the ones at or before baseSeq out", () => {
    const tail = [
      { pos: 0, del: 2, ins: "" },
      { pos: 4, del: 0, ins: "[]" },
      { pos: 20, del: 0, ins: "end" },
    ];
    const base = withTail(util(), "src_util", tail);
    expect(textOf(base, "src_util")).toBe("2345[]6789end");
    const state = deepFreeze(base);
    expect(textOf(accept(state, [edit(6, 1, "X", 10)]).state, "src_util")).toBe("2345[]X789end");
    expect(textOf(accept(state, [edit(1, 1, "Y", 12)]).state, "src_util")).toBe("2Y45[]6789end");
  });

  it("collapses a range that a later edit deleted, and puts an insert at the deletion point", () => {
    const state = deepFreeze(withTail(util(), "src_util", [{ pos: 2, del: 4, ins: "" }]));
    expect(textOf(accept(state, [edit(3, 2, "Z", 10)]).state, "src_util")).toBe("01Z6789");
  });

  it("skips later edits of another file", () => {
    const base = withTail(util(), "src_util", [{ pos: 0, del: 0, ins: "AAA" }]);
    (base.history.ops[0].op as { id: string }).id = "src_blink";
    expect(textOf(accept(deepFreeze(base), [edit(5, 2, "-", 10)]).state, "src_util")).toBe("AAA01-456789");
  });

  it("undoes an edit with an edit at the seq it will get", () => {
    const state = deepFreeze(util());
    const op = edit(3, 4, "xy", 10);
    const inverse = roundTrip(state, [op]);
    expect(inverse).toEqual([{ k: "source.edit", id: "src_util", baseSeq: 11, pos: 3, del: 2, ins: "3456" }]);
    for (const undo of inverse) expect(validateOp(undo)).toBe(true);
  });

  it("undoes a big deletion in pieces that each fit an op", () => {
    const base = util();
    const long = "ab\u{1f600}".repeat(7000);
    (base.sources.find((s) => s.id === "src_util") as Source).content = long;
    const state = deepFreeze(base);
    const inverse = roundTrip(state, [edit(0, long.length, "", 10)]);
    expect(inverse.length).toBeGreaterThan(1);
    for (const undo of inverse) expect(validateOp(undo)).toBe(true);
  });

  it("replays the env monitor history to the recorded hash", () => {
    let state = monitorAt140();
    const envelopes = loadExample("env-monitor-esp32").history.ops;
    expect(envelopes.map((e) => e.op.k)).toEqual(["source.edit", "fault.set"]);
    for (const envelope of envelopes) {
      const out = applyBatch(state, [envelope.op], { author: envelope.author, at: envelope.at });
      if (!out.ok) throw new Error(`${out.reject.code}: ${out.reject.message}`);
      state = out.state;
    }
    expect(state.revision).toBe(142);
    expect(stateHash(state)).toBe("7a31304324cf3343d32b3748cde71c683e2f6caff592a302c90b321b182c2006");
  });
});
