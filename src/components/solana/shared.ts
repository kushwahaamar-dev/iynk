import { WalletError } from "@solana/wallet-adapter-base";
import { htmlLang, type Locale } from "@/i18n/config";
import { LAMPORTS_PER_SOL } from "@/lib/solana/config";
import type { SolanaT } from "@/lib/solana/messages";

export function formatSol(lamports: number | bigint, locale: Locale): string {
  const sol = Number(lamports) / LAMPORTS_PER_SOL;
  return new Intl.NumberFormat(htmlLang(locale), { maximumFractionDigits: 4 }).format(sol);
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string };

/** POSTs JSON to one of our routes; errors come back as their `error.code` (H2). */
export async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
  } catch {
    return { ok: false, code: "network" };
  }
  const payload: unknown = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: payload as T };
  const code = (payload as { error?: { code?: unknown } } | null)?.error?.code;
  return { ok: false, code: typeof code === "string" ? code : "generic" };
}

const CODES: Record<string, Parameters<SolanaT>[0]> = {
  network: "errors.network",
  not_passed: "errors.notPassed",
  not_verifiable: "errors.notVerifiable",
  run_mismatch: "errors.runMismatch",
  rate_limited: "errors.rateLimited",
  upstream_failed: "errors.upstream",
  not_configured: "errors.notConfigured",
  faucet_used: "errors.faucetUsed",
  enough_funds: "errors.enoughFunds",
  faucet_dry: "errors.faucetDry",
};

export function errorText(t: SolanaT, code: string): string {
  return t(CODES[code] ?? "errors.generic");
}

/** A wallet or RPC failure in words the learner can act on. */
export function walletErrorText(t: SolanaT, error: unknown): string {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/reject|denied|declined|cancel/i.test(text)) return t("errors.rejected");
  if (/insufficient|0x1\b|debit an account/i.test(text)) return t("errors.noFunds");
  if (error instanceof WalletError) return t("errors.walletFailed");
  if (/fetch|network|timed? ?out|429|503/i.test(text)) return t("errors.upstream");
  return t("errors.generic");
}
