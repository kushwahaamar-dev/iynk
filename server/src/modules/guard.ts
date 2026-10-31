import { validProviderKey } from "../../../src/protocol/ai-relay.ts";
import type { ServerConfig } from "../config.ts";
import { ApiError } from "../http/errors.ts";

export type ModuleName = "ai" | "search" | "tools";

const KEY_HEADER = "x-iynk-provider-key";

export function requireEnabled(config: ServerConfig, m: ModuleName): void {
  if (m === "tools") return;
  if (m === "ai" ? config.aiEnable : config.searchEnable) return;
  const flag = m === "ai" ? "IYNK_AI_ENABLE" : "IYNK_SEARCH_ENABLE";
  throw new ApiError(501, "feature_disabled", `${m} is turned off on this server.`, [{ path: `/${flag}` }]);
}

export function providerKey(headers: Headers): { ok: true; key: string } | { ok: false } {
  const key = headers.get(KEY_HEADER);
  return key !== null && validProviderKey(key) ? { ok: true, key } : { ok: false };
}
