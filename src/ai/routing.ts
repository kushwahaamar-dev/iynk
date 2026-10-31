import { z } from "zod";
import type { AiErrorCode } from "./errors.ts";
import type { Mode } from "./modes.ts";

export type Tier = "fast" | "standard" | "strong";
export interface Route {
  profileId: string;
  model: string;
}
export interface RoutesFile {
  version: 1;
  tiers: Record<Tier, Route | null>;
  fallback: Route[];
  source: "user" | "eval";
  updatedAt: string;
}
export type Task = "chat" | "compaction" | "translation" | "conformance" | "eval";

export interface TierSignals {
  thinkHarder: boolean;
  proposalInvalidTwice: boolean;
  p7FailedAfterRepair: boolean;
  /** More than 20 samples across 3 or more nets. */
  traceBig: boolean;
}

export const ROUTES_KEY = "iynk:ai-routes:v1";

const MAX_FALLBACK = 4;

const route = z.object({ profileId: z.string().min(1), model: z.string().min(1) });
const routesFile = z.object({
  version: z.literal(1),
  tiers: z.object({ fast: route.nullable(), standard: route.nullable(), strong: route.nullable() }),
  fallback: z.array(route).max(MAX_FALLBACK),
  source: z.enum(["user", "eval"]),
  updatedAt: z.string(),
});

const FALLBACK_ERRORS: ReadonlySet<AiErrorCode> = new Set([
  "network",
  "upstream_busy",
  "upstream_timeout",
  "upstream_failed",
]);

const NEAREST: Record<Tier, readonly Tier[]> = {
  fast: ["fast", "standard", "strong"],
  standard: ["standard", "fast", "strong"],
  strong: ["strong", "standard", "fast"],
};

function emptyRoutes(): RoutesFile {
  return {
    version: 1,
    tiers: { fast: null, standard: null, strong: null },
    fallback: [],
    source: "user",
    updatedAt: new Date(0).toISOString(),
  };
}

function baseTier(task: Task, mode: Mode): Tier {
  if (task === "compaction" || task === "translation") return "fast";
  if (task === "conformance" || task === "eval") return "standard";
  return mode === "socratic" || mode === "beginner" ? "fast" : "standard";
}

export function tierFor(task: Task, mode: Mode, s: TierSignals): { tier: Tier; escalated: boolean; reason?: string } {
  const tier = baseTier(task, mode);
  if (tier !== "standard" || task !== "chat") return { tier, escalated: false };
  const reason = s.thinkHarder
    ? "think harder"
    : s.proposalInvalidTwice
      ? "proposal invalid twice"
      : s.p7FailedAfterRepair
        ? "P7 failed after repair"
        : mode === "debugging" && s.traceBig
          ? "large trace"
          : undefined;
  return reason ? { tier: "strong", escalated: true, reason } : { tier, escalated: false };
}

export function resolveRoute(file: RoutesFile, tier: Tier): Route | null {
  for (const t of NEAREST[tier]) {
    const r = file.tiers[t];
    if (r) return r;
  }
  return null;
}

export type Attempt<T> = { ok: true; value: T } | { ok: false; error: AiErrorCode; outputBegan: boolean };

const same = (a: Route, b: Route) => a.profileId === b.profileId && a.model === b.model;

export async function callWithFallback<T>(
  file: RoutesFile,
  tier: Tier,
  usable: (r: Route) => boolean,
  attempt: (r: Route) => Promise<Attempt<T>>,
): Promise<
  { ok: true; value: T; route: Route; fellBack: boolean } | { ok: false; error: AiErrorCode; tried: Route[] }
> {
  const primary = resolveRoute(file, tier);
  if (!primary) return { ok: false, error: "not_configured", tried: [] };
  const tried: Route[] = [];
  const queue: Route[] = [primary, ...file.fallback.slice(0, MAX_FALLBACK)];
  let error: AiErrorCode = "internal";
  for (const candidate of queue) {
    if (tried.length > 0 && (tried.some((t) => same(t, candidate)) || !usable(candidate))) continue;
    tried.push(candidate);
    let result: Attempt<T>;
    try {
      result = await attempt(candidate);
    } catch {
      return { ok: false, error: "internal", tried };
    }
    if (result.ok) return { ok: true, value: result.value, route: candidate, fellBack: tried.length > 1 };
    error = result.error;
    if (result.outputBegan || !FALLBACK_ERRORS.has(result.error)) break;
  }
  return { ok: false, error, tried };
}

export function loadRoutes(storage: Pick<Storage, "getItem">): RoutesFile {
  try {
    const raw = storage.getItem(ROUTES_KEY);
    if (!raw) return emptyRoutes();
    const parsed = routesFile.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyRoutes();
  } catch {
    return emptyRoutes();
  }
}

export function saveRoutes(storage: Pick<Storage, "setItem">, f: RoutesFile): boolean {
  try {
    storage.setItem(ROUTES_KEY, JSON.stringify(f));
    return true;
  } catch {
    return false;
  }
}
