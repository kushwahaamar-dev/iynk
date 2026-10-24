import "server-only";
import { getSql } from "./client";
import { insertEvents, type EventRow } from "./queries";
import { telemetryEvent } from "./schema";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Validates each event on its own and moves it onto the server clock. With
 * `sentAt` (the client's clock when it sent the batch) every timestamp is shifted
 * by the client's skew, so a phone set to the wrong time still lands in "now".
 * Events from the future are pulled back to now; ones older than a day are dropped.
 */
export function toRows(events: readonly unknown[], { sentAt, now }: { sentAt?: number; now: number }): { rows: EventRow[]; dropped: number } {
  const skew = sentAt ? now - sentAt : 0;
  const rows: EventRow[] = [];
  let dropped = 0;
  for (const raw of events) {
    const parsed = telemetryEvent.safeParse(raw);
    if (!parsed.success) {
      dropped++;
      continue;
    }
    const e = parsed.data;
    const ts = Math.min(e.ts + skew, now);
    if (ts < now - DAY_MS) {
      dropped++;
      continue;
    }
    rows.push({ ts: new Date(ts), kind: e.kind, session: e.session, room: e.room ?? null, item: e.item ?? null, data: e.data });
  }
  return { rows, dropped };
}

type Waiter = { rows: readonly EventRow[]; resolve: () => void; reject: (error: unknown) => void };

/**
 * Coalesces concurrent requests into one INSERT: rows wait at most `lingerMs`
 * (or until `maxRows` are queued), then a single statement writes them all and
 * every waiting request learns the outcome. Each request still awaits its own
 * write, so nothing is acknowledged before it is stored.
 */
export function createIngestQueue(
  write: (rows: EventRow[]) => Promise<void>,
  { lingerMs = 25, maxRows = 2000 }: { lingerMs?: number; maxRows?: number } = {},
) {
  let waiting: Waiter[] = [];
  let queued = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function flush(): Promise<void> {
    if (timer) clearTimeout(timer);
    timer = null;
    const batch = waiting;
    waiting = [];
    queued = 0;
    if (batch.length === 0) return;
    try {
      await write(batch.flatMap((w) => w.rows));
      for (const w of batch) w.resolve();
    } catch (error) {
      for (const w of batch) w.reject(error);
    }
  }

  function enqueue(rows: readonly EventRow[]): Promise<void> {
    if (rows.length === 0) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      waiting.push({ rows, resolve, reject });
      queued += rows.length;
      if (queued >= maxRows) void flush();
      else timer ??= setTimeout(() => void flush(), lingerMs);
    });
  }

  return { enqueue, flush };
}

let queue: ReturnType<typeof createIngestQueue> | null = null;

/** Stores validated rows through the shared queue. Throws when the database write fails. */
export function storeEvents(rows: readonly EventRow[]): Promise<void> {
  queue ??= createIngestQueue(async (batch) => {
    const sql = getSql();
    if (!sql) throw new Error("DATABASE_URL is not set");
    await insertEvents(sql, batch);
  });
  return queue.enqueue(rows);
}
