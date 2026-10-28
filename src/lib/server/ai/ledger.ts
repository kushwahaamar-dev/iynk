import "server-only";
import { createHash } from "node:crypto";
import { readFileSync, renameSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { env } from "@/lib/server/env";

const DAY_MS = 24 * 60 * 60 * 1000;
const KEEP_DAYS = 62;
const KEEP_MONTHS = 14;

const Day = z.object({ aiTokens: z.number(), aiRequests: z.number(), searches: z.number().optional() });
const Month = z.object({ searches: z.number() });
const State = z.object({
  v: z.literal(1),
  days: z.record(z.string(), z.record(z.string(), Day)),
  months: z.record(z.string(), z.record(z.string(), Month)),
});
type State = z.output<typeof State>;

export type LedgerSummary = {
  day: string;
  month: string;
  ai: { today: { tokens: number; requests: number }; month: { tokens: number; requests: number }; dailyCap: number };
  search: { today: number; month: number; monthlyCap: number };
};

export type Check = { ok: true } | { ok: false; retryAfterSec: number; used: number; cap: number };

export type Ledger = {
  keyId(key: string): string;
  checkAi(keyId: string): Check;
  recordAi(keyId: string, usage: { tokens: number }): Promise<void>;
  checkSearch(keyId: string): Check;
  recordSearch(keyId: string, n?: number): Promise<void>;
  summary(keyId: string): LedgerSummary;
};

const dayOf = (d: Date) => d.toISOString().slice(0, 10);
const monthOf = (d: Date) => d.toISOString().slice(0, 7);
const secondsUntil = (from: Date, to: number) => Math.max(1, Math.ceil((to - from.getTime()) / 1000));

/**
 * Per-key spend, counted by UTC day and month under a salted hash of the key and
 * kept in one JSON file so a restart does not reset the cap. The key is never written.
 */
export function createLedger(opts: { dir: string; aiDailyTokens: number; searchMonthly: number; now?: () => Date }): Ledger {
  const now = opts.now ?? (() => new Date());
  const file = path.join(opts.dir, "usage.json");
  let state: State | null = null;
  let queue: Promise<void> = Promise.resolve();
  let writeWarned = false;

  function load(): State {
    if (state) return state;
    let raw: string;
    try {
      raw = readFileSync(file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.warn("[usage] cannot read the usage file; starting empty");
      return (state = { v: 1, days: {}, months: {} });
    }
    try {
      return (state = State.parse(JSON.parse(raw)));
    } catch {
      const moved = `${file}.bad-${Date.now()}`;
      try {
        renameSync(file, moved);
      } catch {
        // The empty ledger below replaces it on the next write anyway.
      }
      console.warn("[usage] usage file is corrupt; moved it aside and started empty");
      return (state = { v: 1, days: {}, months: {} });
    }
  }

  function prune(s: State, at: Date) {
    const oldestDay = dayOf(new Date(at.getTime() - KEEP_DAYS * DAY_MS));
    for (const day of Object.keys(s.days)) if (day < oldestDay) delete s.days[day];
    const oldestMonth = monthOf(new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() - KEEP_MONTHS, 1)));
    for (const month of Object.keys(s.months)) if (month < oldestMonth) delete s.months[month];
  }

  function persist(): Promise<void> {
    queue = queue.then(async () => {
      const tmp = `${file}.tmp`;
      try {
        await mkdir(opts.dir, { recursive: true, mode: 0o700 });
        await writeFile(tmp, JSON.stringify(state), { mode: 0o600 });
        await rename(tmp, file);
      } catch {
        if (!writeWarned) console.warn("[usage] cannot write the usage file; the cap holds until restart");
        writeWarned = true;
      }
    });
    return queue;
  }

  const dayUse = (s: State, day: string, id: string) => ((s.days[day] ??= {})[id] ??= { aiTokens: 0, aiRequests: 0 });
  const monthUse = (s: State, month: string, id: string) => ((s.months[month] ??= {})[id] ??= { searches: 0 });

  function monthAi(s: State, month: string, id: string) {
    let tokens = 0;
    let requests = 0;
    for (const [day, keys] of Object.entries(s.days)) {
      if (!day.startsWith(month) || !keys[id]) continue;
      tokens += keys[id].aiTokens;
      requests += keys[id].aiRequests;
    }
    return { tokens, requests };
  }

  function refusal(used: number, cap: number, retryAfterSec: number, id: string): Check {
    console.warn(`[usage] cap reached key=${id}`);
    return { ok: false, retryAfterSec, used, cap };
  }

  return {
    keyId: (key) => createHash("sha256").update(`iynk:usage:${key}`).digest("hex").slice(0, 16),

    checkAi(id) {
      const at = now();
      const used = load().days[dayOf(at)]?.[id]?.aiTokens ?? 0;
      if (used < opts.aiDailyTokens) return { ok: true };
      const midnight = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() + 1);
      return refusal(used, opts.aiDailyTokens, secondsUntil(at, midnight), id);
    },

    async recordAi(id, { tokens }) {
      const at = now();
      const s = load();
      const use = dayUse(s, dayOf(at), id);
      use.aiTokens += tokens;
      use.aiRequests += 1;
      prune(s, at);
      console.warn(`[usage] ai key=${id} tokens=${tokens} total=${use.aiTokens}`);
      await persist();
    },

    checkSearch(id) {
      const at = now();
      const used = load().months[monthOf(at)]?.[id]?.searches ?? 0;
      if (used < opts.searchMonthly) return { ok: true };
      const nextMonth = Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1);
      return refusal(used, opts.searchMonthly, secondsUntil(at, nextMonth), id);
    },

    async recordSearch(id, n = 1) {
      const at = now();
      const s = load();
      const today = dayUse(s, dayOf(at), id);
      today.searches = (today.searches ?? 0) + n;
      monthUse(s, monthOf(at), id).searches += n;
      prune(s, at);
      await persist();
    },

    summary(id) {
      const at = now();
      const s = load();
      const day = dayOf(at);
      const month = monthOf(at);
      const today = s.days[day]?.[id];
      return {
        day,
        month,
        ai: {
          today: { tokens: today?.aiTokens ?? 0, requests: today?.aiRequests ?? 0 },
          month: monthAi(s, month, id),
          dailyCap: opts.aiDailyTokens,
        },
        search: { today: today?.searches ?? 0, month: s.months[month]?.[id]?.searches ?? 0, monthlyCap: opts.searchMonthly },
      };
    },
  };
}

export const ledger = createLedger({
  dir: path.resolve(env.IYNK_DATA_DIR),
  aiDailyTokens: env.IYNK_AI_DAILY_TOKENS,
  searchMonthly: env.IYNK_SEARCH_MONTHLY,
});
