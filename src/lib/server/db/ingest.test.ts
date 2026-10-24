// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createIngestQueue, toRows } from "./ingest";
import type { EventRow } from "./queries";
import { cleanName } from "./schema";

const NOW = Date.parse("2026-10-24T20:00:00Z");
const session = "3f1c2d4e-5b6a-4789-9abc-def012345678";
const lap = (over: Record<string, unknown> = {}) => ({
  ts: NOW - 1000,
  kind: "flight.lap",
  session,
  item: "quad5",
  data: { course: "quad5-bando", timeMs: 42_180, name: "Ada" },
  ...over,
});

describe("toRows", () => {
  it("keeps valid events and counts the rest as dropped", () => {
    const { rows, dropped } = toRows(
      [lap(), { kind: "nope", session, ts: NOW, data: {} }, lap({ session: "short" }), lap({ data: { course: "quad5-bando", timeMs: 12 } })],
      { now: NOW },
    );
    expect(rows).toHaveLength(1);
    expect(dropped).toBe(3);
    expect(rows[0]).toMatchObject({ kind: "flight.lap", session, item: "quad5", room: null, data: { course: "quad5-bando", timeMs: 42_180, name: "Ada" } });
  });

  it("moves timestamps onto the server clock with sentAt", () => {
    // The client's clock runs 5 minutes behind.
    const skewed = NOW - 5 * 60_000;
    const { rows } = toRows([{ ...lap(), ts: skewed - 2000 }], { sentAt: skewed, now: NOW });
    expect(rows[0].ts.getTime()).toBe(NOW - 2000);
  });

  it("pulls future events back to now and drops ones older than a day", () => {
    const { rows, dropped } = toRows([lap({ ts: NOW + 3_600_000 }), lap({ ts: NOW - 25 * 3_600_000 })], { now: NOW });
    expect(rows.map((r) => r.ts.getTime())).toEqual([NOW]);
    expect(dropped).toBe(1);
  });

  it("accepts ISO timestamps, rooms and free-form payloads of other kinds", () => {
    const { rows } = toRows(
      [{ ts: new Date(NOW - 5000).toISOString(), kind: "room.join", session, room: "ab23cd", data: { peers: 3 } }],
      { now: NOW },
    );
    expect(rows[0]).toMatchObject({ kind: "room.join", room: "ab23cd", data: { peers: 3 } });
  });

  it("refuses oversized payloads and malformed counts", () => {
    const big = { blob: "x".repeat(3000) };
    const { rows, dropped } = toRows(
      [
        { ts: NOW, kind: "fault", session, data: big },
        { ts: NOW, kind: "led.blink", session, data: { count: 0 } },
        { ts: NOW, kind: "led.blink", session, data: { count: 25 } },
      ],
      { now: NOW },
    );
    expect(dropped).toBe(2);
    expect(rows[0].data).toEqual({ count: 25 });
  });
});

describe("cleanName", () => {
  it("strips control and bidi characters and caps at 24 code points", () => {
    expect(cleanName("  Ada‮  Lovelace\u0007 ")).toBe("Ada Lovelace");
    expect(cleanName("🚁".repeat(30))).toBe("🚁".repeat(24));
  });
});

const row = (kind: EventRow["kind"] = "fault"): EventRow => ({ ts: new Date(NOW), kind, session, room: null, item: null, data: {} });

describe("createIngestQueue", () => {
  it("writes concurrent requests in one statement and resolves each", async () => {
    vi.useFakeTimers();
    const write = vi.fn(async (_rows: EventRow[]) => {});
    const queue = createIngestQueue(write, { lingerMs: 20 });
    const a = queue.enqueue([row(), row()]);
    const b = queue.enqueue([row("led.blink")]);
    await vi.advanceTimersByTimeAsync(25);
    await expect(Promise.all([a, b])).resolves.toEqual([undefined, undefined]);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][0]).toHaveLength(3);
    vi.useRealTimers();
  });

  it("flushes at once when the batch is full", async () => {
    const write = vi.fn(async (_rows: EventRow[]) => {});
    const queue = createIngestQueue(write, { lingerMs: 10_000, maxRows: 2 });
    await queue.enqueue([row(), row()]);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("rejects every waiting request when the write fails", async () => {
    const queue = createIngestQueue(async () => Promise.reject(new Error("db down")), { lingerMs: 1 });
    const results = await Promise.allSettled([queue.enqueue([row()]), queue.enqueue([row()])]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
  });
});
