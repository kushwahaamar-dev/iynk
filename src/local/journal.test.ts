// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createJournalWriter, journalToOps } from "./journal";
import { createMemoryRepository, emptyRows } from "./memory-repository";
import { fakeTimers } from "./timers.testing";

const edit = (pos: number, ins: string, t = 0) => ({ src: "src_main", pos, del: 0, ins, t });

describe("journal writer", () => {
  it("coalesces edits into one write per 300 ms burst", async () => {
    const repo = createMemoryRepository({ rows: emptyRows() });
    const timers = fakeTimers();
    const append = vi.spyOn(repo.journal, "append");
    const writer = createJournalWriter(repo, timers);

    writer.record("p1", 4, edit(0, "a"));
    timers.advance(200);
    writer.record("p1", 4, edit(1, "b"));
    timers.advance(299);
    expect(append).not.toHaveBeenCalled();
    timers.advance(1);
    await writer.flushNow();

    expect(append).toHaveBeenCalledTimes(1);
    expect(await repo.journal.read("p1")).toMatchObject({ baseRevision: 4, edits: [edit(0, "a"), edit(1, "b")] });
  });

  it("starts a new batch when the base revision changes", async () => {
    const repo = createMemoryRepository({ rows: emptyRows() });
    const timers = fakeTimers();
    const writer = createJournalWriter(repo, timers);

    writer.record("p1", 4, edit(0, "a"));
    writer.record("p1", 5, edit(1, "b"));
    await writer.flushNow();

    expect(await repo.journal.read("p1")).toMatchObject({ baseRevision: 5, edits: [edit(1, "b")] });
  });

  it("flushNow writes a pending batch at once and keeps projects apart", async () => {
    const repo = createMemoryRepository({ rows: emptyRows() });
    const writer = createJournalWriter(repo, fakeTimers());

    writer.record("p1", 1, edit(0, "a"));
    writer.record("p2", 2, edit(0, "b"));
    await writer.flushNow();

    expect((await repo.journal.read("p1"))?.edits).toHaveLength(1);
    expect(await repo.journal.read("p2")).toMatchObject({ baseRevision: 2 });
  });

  it("does nothing when nothing is pending", async () => {
    const repo = createMemoryRepository({ rows: emptyRows() });
    await createJournalWriter(repo, fakeTimers()).flushNow();
    expect(await repo.journal.read("p1")).toBeNull();
  });
});

describe("journalToOps", () => {
  const row = { baseRevision: 7, writtenAt: 1, edits: [edit(0, "ab"), { src: "src_main", pos: 1, del: 1, ins: "", t: 5 }] };

  it("replays as source.edit ops, each based on the revision the one before produced", () => {
    expect(journalToOps(row, { revision: 7 })).toEqual([
      { k: "source.edit", id: "src_main", baseSeq: 7, pos: 0, del: 0, ins: "ab" },
      { k: "source.edit", id: "src_main", baseSeq: 8, pos: 1, del: 1, ins: "" },
    ]);
  });

  it("is stale when the document moved on", () => {
    expect(journalToOps(row, { revision: 8 })).toBe("stale");
  });
});
