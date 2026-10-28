import { withAiAuth, withSearchAuth } from "./headers";

export type UsageReading =
  | { kind: "ai"; today: { tokens: number; requests: number }; monthTotal: { tokens: number; requests: number }; cap: number }
  | { kind: "search"; today: number; monthTotal: number; cap: number };

export type UsageResult = { ok: true; data: UsageReading } | { ok: false; code: "no_key" | "off" | "failed" };

/** What the server counted for the saved key of this kind; makes no request when that key is not set. */
export async function fetchUsage(kind: "ai" | "search", signal?: AbortSignal): Promise<UsageResult> {
  const headers = kind === "ai" ? withAiAuth() : withSearchAuth();
  if (!headers) return { ok: false, code: "no_key" };
  try {
    const res = await fetch(`/api/usage?kind=${kind}`, { headers, signal });
    if (res.status === 501) return { ok: false, code: "off" };
    if (!res.ok) return { ok: false, code: "failed" };
    return { ok: true, data: (await res.json()) as UsageReading };
  } catch {
    return { ok: false, code: "failed" };
  }
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** 1234567 reads "1.2M", 950 stays "950". */
export const formatTokens = (n: number) => compact.format(n);
