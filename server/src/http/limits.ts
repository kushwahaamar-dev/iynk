import { isIP } from "node:net";
import type { Deps } from "../deps.ts";
import type { BucketName } from "./classes.ts";

export type Rule = { limit: number; windowMs: number };

export type Take = { ok: boolean; limit: number; remaining: number; resetSeconds: number; retryAfter: number };

export type Limiter = {
  take(bucket: BucketName, key: string): Take;
  reset(): void;
};

const MINUTE = 60_000;
const HOUR = 3_600_000;
const MAX_KEYS = 10_000;

export const DEFAULT_RULES: Record<BucketName, Rule[]> = {
  "public.read": [{ limit: 120, windowMs: MINUTE }],
  "auth.challenge": [{ limit: 20, windowMs: MINUTE }],
  "auth.token": [{ limit: 20, windowMs: MINUTE }],
  "auth.token.identity": [{ limit: 5, windowMs: MINUTE }],
  "identity.register": [{ limit: 5, windowMs: MINUTE }],
  "pairing.create": [{ limit: 20, windowMs: HOUR }],
  "pairing.guess": [
    { limit: 10, windowMs: MINUTE },
    { limit: 100, windowMs: HOUR },
  ],
  read: [{ limit: 300, windowMs: MINUTE }],
  write: [{ limit: 120, windowMs: MINUTE }],
  compile: [{ limit: 10, windowMs: MINUTE }],
};

const seconds = (ms: number) => Math.max(1, Math.ceil(ms / 1000));

export function createLimiter(deps: Deps, table: Record<BucketName, Rule[]> = DEFAULT_RULES): Limiter {
  const hits = new Map<string, number[]>();

  return {
    take(bucket, key) {
      const rules = table[bucket];
      const now = deps.clock.now();
      const longest = Math.max(...rules.map((rule) => rule.windowMs));
      const mapKey = `${bucket}\0${key}`;
      const stamps = (hits.get(mapKey) ?? []).filter((at) => at > now - longest);
      hits.delete(mapKey);

      let retryMs = 0;
      let tightest: { rule: Rule; used: number; oldest: number } | null = null;
      for (const rule of rules) {
        const inWindow = stamps.filter((at) => at > now - rule.windowMs);
        if (inWindow.length >= rule.limit) {
          const frees = (inWindow[inWindow.length - rule.limit] ?? now) + rule.windowMs - now;
          retryMs = Math.max(retryMs, frees);
        }
        const left = rule.limit - inWindow.length;
        if (tightest === null || left < tightest.rule.limit - tightest.used) {
          tightest = { rule, used: inWindow.length, oldest: inWindow[0] ?? now };
        }
      }
      const binding = tightest ?? { rule: rules[0] as Rule, used: 0, oldest: now };
      const ok = retryMs === 0;
      if (ok) stamps.push(now);
      hits.set(mapKey, stamps);
      if (hits.size > MAX_KEYS) hits.delete(hits.keys().next().value as string);

      return {
        ok,
        limit: binding.rule.limit,
        remaining: ok ? Math.max(0, binding.rule.limit - binding.used - 1) : 0,
        resetSeconds: seconds(binding.oldest + binding.rule.windowMs - now),
        retryAfter: ok ? 0 : seconds(retryMs),
      };
    },
    reset() {
      hits.clear();
    },
  };
}

function parseV6(ip: string): number[] | null {
  let text = ip.split("%")[0] ?? ip;
  const dot = text.lastIndexOf(".");
  if (dot !== -1) {
    const colon = text.lastIndexOf(":");
    const parts = text.slice(colon + 1).split(".").map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part > 255)) return null;
    const [a = 0, b = 0, c = 0, d = 0] = parts;
    text = `${text.slice(0, colon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const groups = (part: string) => (part === "" ? [] : part.split(":").map((group) => parseInt(group, 16)));
  const head = groups(halves[0] ?? "");
  const tail = groups(halves[1] ?? "");
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const all = [...head, ...Array<number>(halves.length === 1 ? 0 : missing).fill(0), ...tail];
  return all.some((group) => Number.isNaN(group)) ? null : all;
}

function normalize(ip: string): string | null {
  const version = isIP(ip.split("%")[0] ?? ip);
  if (version === 0) return null;
  if (version === 4) return ip;
  const groups = parseV6(ip);
  if (groups === null) return null;
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    const hi = groups[6] ?? 0;
    const lo = groups[7] ?? 0;
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return `${groups.slice(0, 4).map((group) => group.toString(16)).join(":")}::/64`;
}

export function addressKey(socketAddr: string, xff: string | null, trustProxy: number): string {
  const socket = normalize(socketAddr) ?? (socketAddr === "" ? "unknown" : socketAddr);
  if (trustProxy <= 0 || xff === null) return socket;
  const entries = xff.split(",").map((entry) => entry.trim());
  if (entries.length < trustProxy) return socket;
  return normalize(entries[entries.length - trustProxy] ?? "") ?? socket;
}
