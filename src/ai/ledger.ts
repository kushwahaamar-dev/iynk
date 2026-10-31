import type { Totals, UsageStore } from "../local/ai-usage";
import { assertNoContent, type AiLogRow } from "./log";
import type { Price } from "./prices";

export type Caps = {
  dayUSD: number | null;
  monthUSD: number | null;
  sessionUSD: number | null;
  dayTokens: number | null;
  sessionTokens: number | null;
  maxCallsPerMessage: number;
};

export type CallPlan = {
  provider: string;
  model: string;
  privacy: "local" | "cloud";
  price: Price | null;
  packTokensEst: number;
  correction: number;
  maxOutputTokens: number;
  sessionId: string;
};

export type CapName = "dayUSD" | "monthUSD" | "sessionUSD" | "dayTokens" | "sessionTokens";

export type Gate =
  | { ok: true; maxOutputTokens: number; reservationId: string }
  | { ok: false; which: CapName; limit: number; used: number };

export interface ChannelLike {
  postMessage(message: unknown): void;
  onmessage: ((event: { data: unknown }) => void) | null;
}

export interface Ledger {
  check(plan: CallPlan): Promise<Gate>;
  settle(id: string, row: AiLogRow): Promise<void>;
  release(id: string): void;
  totals(): Promise<Totals>;
  roundLimitHit(): boolean;
}

export const DEFAULT_CAPS: Caps = {
  dayUSD: 1,
  monthUSD: 10,
  sessionUSD: 0.5,
  dayTokens: 3_000_000,
  sessionTokens: 500_000,
  maxCallsPerMessage: 8,
};

export const CHANNEL_NAME = "iynk:ai-ledger";

const MIN_OUTPUT_TOKENS = 200;
const PACK_MARGIN = 1.15;
const RESERVATION_TTL_MS = 130_000;
const TOOL_LIMIT_MESSAGES = 3;

type Reservation = { usd: number | null; tokens: number; day: string; sessionId: string | null; at: number };

type Wire = { t: "reserve"; id: string; usd: number | null; tokens: number; day: string } | { t: "release"; id: string };

function isWire(data: unknown): data is Wire {
  if (typeof data !== "object" || data === null) return false;
  const m = data as Record<string, unknown>;
  if (m.t === "release") return typeof m.id === "string";
  return (
    m.t === "reserve" &&
    typeof m.id === "string" &&
    typeof m.day === "string" &&
    typeof m.tokens === "number" &&
    (m.usd === null || typeof m.usd === "number")
  );
}

function inputTokens(plan: CallPlan): number {
  return Math.ceil(plan.packTokensEst * plan.correction * PACK_MARGIN);
}

/** What the call could cost if it ran to its output limit. `usd` is `null` when the money cannot be known or does not apply. */
export function worstCase(plan: CallPlan): { usd: number | null; tokens: number } {
  const input = inputTokens(plan);
  const tokens = input + plan.maxOutputTokens;
  if (!plan.price || plan.privacy === "local") return { usd: null, tokens };
  const inRate = plan.price.cacheWrite ?? plan.price.in;
  return { usd: (input * inRate + plan.maxOutputTokens * plan.price.out) / 1_000_000, tokens };
}

/** A bad value falls back to the default; the Settings form reports it. */
function sanitized(caps: Caps): Caps {
  const pick = (value: number | null, fallback: number | null) =>
    value === null || (Number.isFinite(value) && value >= 0) ? value : fallback;
  return {
    dayUSD: pick(caps.dayUSD, DEFAULT_CAPS.dayUSD),
    monthUSD: pick(caps.monthUSD, DEFAULT_CAPS.monthUSD),
    sessionUSD: pick(caps.sessionUSD, DEFAULT_CAPS.sessionUSD),
    dayTokens: pick(caps.dayTokens, DEFAULT_CAPS.dayTokens),
    sessionTokens: pick(caps.sessionTokens, DEFAULT_CAPS.sessionTokens),
    maxCallsPerMessage: Number.isFinite(caps.maxCallsPerMessage) && caps.maxCallsPerMessage >= 0 ? caps.maxCallsPerMessage : DEFAULT_CAPS.maxCallsPerMessage,
  };
}

export function createLedger(d: {
  store: UsageStore;
  caps(): Caps;
  now(): number;
  day(): string;
  channel?: ChannelLike;
  random(): number;
}): Ledger {
  const own = new Map<string, Reservation>();
  const foreign = new Map<string, Reservation>();
  const sessions = new Map<string, { usd: number; tokens: number }>();
  let streak = 0;
  let message: { requestId: string; outcome: AiLogRow["outcome"] } | null = null;

  const live = () => {
    const cutoff = d.now() - RESERVATION_TTL_MS;
    for (const pool of [own, foreign]) for (const [id, r] of pool) if (r.at < cutoff) pool.delete(id);
    return [...own.values(), ...foreign.values()];
  };

  if (d.channel) {
    d.channel.onmessage = (event) => {
      if (!isWire(event.data)) return;
      if (event.data.t === "release") foreign.delete(event.data.id);
      else foreign.set(event.data.id, { usd: event.data.usd, tokens: event.data.tokens, day: event.data.day, sessionId: null, at: d.now() });
    };
  }

  const post = (wire: Wire) => d.channel?.postMessage(wire);

  function endMessage() {
    if (message) streak = message.outcome === "tool_limit" ? streak + 1 : 0;
  }

  return {
    async check(plan) {
      const caps = sanitized(d.caps());
      const day = d.day();
      const month = day.slice(0, 7);
      const reserved = live();
      const [today, thisMonth] = await Promise.all([d.store.dayTotals(day), d.store.monthTotals(month)]);
      const session = sessions.get(plan.sessionId) ?? { usd: 0, tokens: 0 };

      const worst = worstCase(plan);
      const input = inputTokens(plan);
      const heldUsd = (match: (r: Reservation) => boolean) => reserved.filter(match).reduce((sum, r) => sum + (r.usd ?? 0), 0);
      const heldTokens = (match: (r: Reservation) => boolean) => reserved.filter(match).reduce((sum, r) => sum + r.tokens, 0);
      const sameDay = (r: Reservation) => r.day === day;
      const sameMonth = (r: Reservation) => r.day.startsWith(month);
      const sameSession = (r: Reservation) => r.sessionId === plan.sessionId;
      const tokensOf = (t: Totals) => t.inTokens + t.outTokens;

      const applicable: { which: CapName; limit: number; used: number; unit: "usd" | "tokens" }[] = [];
      const add = (which: CapName, limit: number | null, used: number, unit: "usd" | "tokens") => {
        if (limit !== null) applicable.push({ which, limit, used, unit });
      };
      if (worst.usd !== null) {
        add("dayUSD", caps.dayUSD, today.usd + heldUsd(sameDay), "usd");
        add("monthUSD", caps.monthUSD, thisMonth.usd + heldUsd(sameMonth), "usd");
        add("sessionUSD", caps.sessionUSD, session.usd + heldUsd(sameSession), "usd");
      } else {
        if (plan.privacy === "cloud") add("dayTokens", caps.dayTokens, tokensOf(today) + heldTokens(sameDay), "tokens");
        add("sessionTokens", caps.sessionTokens, session.tokens + heldTokens(sameSession), "tokens");
      }

      const floor = Math.min(MIN_OUTPUT_TOKENS, plan.maxOutputTokens);
      let maxOutputTokens = plan.maxOutputTokens;
      let binding: (typeof applicable)[number] | null = null;
      for (const cap of applicable) {
        const remaining = cap.limit - cap.used;
        const fits =
          cap.unit === "tokens" || !plan.price
            ? remaining - input
            : (remaining * 1_000_000 - input * (plan.price.cacheWrite ?? plan.price.in)) / plan.price.out;
        if (fits < maxOutputTokens) {
          maxOutputTokens = Math.floor(fits);
          binding = cap;
        }
      }
      if (binding && maxOutputTokens < floor) {
        return { ok: false, which: binding.which, limit: binding.limit, used: binding.used };
      }

      const id = `${d.now().toString(36)}-${Math.floor(d.random() * 2 ** 32).toString(36)}`;
      const fitted = worstCase({ ...plan, maxOutputTokens });
      own.set(id, { usd: fitted.usd, tokens: fitted.tokens, day, sessionId: plan.sessionId, at: d.now() });
      post({ t: "reserve", id, usd: fitted.usd, tokens: fitted.tokens, day });
      return { ok: true, maxOutputTokens, reservationId: id };
    },

    async settle(id, row) {
      assertNoContent(row);
      const held = own.get(id);
      if (held?.sessionId) {
        const session = sessions.get(held.sessionId) ?? { usd: 0, tokens: 0 };
        sessions.set(held.sessionId, { usd: session.usd + (row.costUSD ?? 0), tokens: session.tokens + row.inTokens + row.outTokens });
      }
      if (message?.requestId !== row.requestId) {
        endMessage();
        message = { requestId: row.requestId, outcome: row.outcome };
      } else {
        message.outcome = row.outcome;
      }
      try {
        await d.store.recordCall(row);
      } catch {
        return;
      }
      own.delete(id);
      post({ t: "release", id });
    },

    release(id) {
      if (own.delete(id)) post({ t: "release", id });
    },

    totals: () => d.store.dayTotals(d.day()),

    roundLimitHit: () => streak + (message?.outcome === "tool_limit" ? 1 : 0) >= TOOL_LIMIT_MESSAGES,
  };
}
