import { PRESET_HOSTS } from "../../../../src/protocol/ai-presets.ts";

export function buildAllowList(extra: readonly string[]): ReadonlySet<string> {
  return new Set([...PRESET_HOSTS, ...extra].map((host) => host.toLowerCase()));
}

export function checkTarget(
  baseUrl: string,
  allow: ReadonlySet<string>,
  allowPrivate: boolean,
): { ok: true; url: URL; hostAllowed: true } | { ok: false; code: "host_not_allowed" | "scheme_not_allowed" } {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return { ok: false, code: "host_not_allowed" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, code: "scheme_not_allowed" };
  if (!allow.has(url.host)) return { ok: false, code: "host_not_allowed" };
  if (url.protocol === "http:" && !allowPrivate) return { ok: false, code: "scheme_not_allowed" };
  return { ok: true, url, hostAllowed: true };
}
