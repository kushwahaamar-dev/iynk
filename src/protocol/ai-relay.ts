export type RelayUrl = {
  href: string;
  host: string;
  hostname: string;
  protocol: string;
  username: string;
  password: string;
  search: string;
  hash: string;
  pathname: string;
};
declare const URL: new (text: string) => RelayUrl;

export type Family = "anthropic" | "openai-compat";
export type RelayPath = "chat" | "models";
export type RelayProfile = { family: Family; baseUrl: string };
export type RelayRequest = { profile: RelayProfile; path: RelayPath; body: Record<string, unknown> };

export const RELAY_MAX_REQUEST_BYTES = 262_144;
export const RELAY_MAX_RESPONSE_BYTES = 8_388_608;
export const RELAY_TIMEOUT_MS = 120_000;
export const KEY_HEADER = "X-Iynk-Provider-Key";
export const UPSTREAM_STATUS_HEADER = "X-Iynk-Upstream-Status";

const FORWARDED_ERRORS = new Set([400, 401, 403, 404, 413, 422, 429]);
const MAX_BASE_URL_LENGTH = 300;
const ANTHROPIC_VERSION = "2023-06-01";

export function isPassThrough(status: number): boolean {
  return (status >= 200 && status <= 299) || FORWARDED_ERRORS.has(status);
}

export function validProviderKey(key: string): boolean {
  return key.length >= 8 && key.length <= 512 && /^[\x21-\x7E]+$/.test(key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function onlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => key in value);
}

function plainBaseUrl(text: string): boolean {
  if (text.length === 0 || text.length > MAX_BASE_URL_LENGTH) return false;
  try {
    const url = new URL(text);
    return url.username === "" && url.password === "" && url.search === "" && url.hash === "" && !text.includes("?") && !text.includes("#");
  } catch {
    return false;
  }
}

export function parseRelayRequest(raw: unknown): { ok: true; value: RelayRequest } | { ok: false; problem: string } {
  if (!isRecord(raw) || !onlyKeys(raw, ["profile", "path", "body"])) return { ok: false, problem: "The request must have exactly profile, path and body." };
  const { profile, path, body } = raw;
  if (!isRecord(profile) || !onlyKeys(profile, ["family", "baseUrl"])) return { ok: false, problem: "The profile must have exactly family and baseUrl." };
  if (profile["family"] !== "anthropic" && profile["family"] !== "openai-compat") return { ok: false, problem: "The profile family is not supported." };
  const baseUrl = profile["baseUrl"];
  if (typeof baseUrl !== "string" || !plainBaseUrl(baseUrl)) return { ok: false, problem: "The profile baseUrl must be an absolute URL without credentials, query or fragment." };
  if (path !== "chat" && path !== "models") return { ok: false, problem: "The path must be chat or models." };
  if (!isRecord(body)) return { ok: false, problem: "The body must be an object." };
  return { ok: true, value: { profile: { family: profile["family"], baseUrl }, path, body } };
}

export function upstreamTarget(profile: RelayProfile, path: RelayPath): { url: RelayUrl; method: "GET" | "POST" } {
  const url = new URL(profile.baseUrl);
  let base = url.pathname.replace(/\/+$/, "");
  if (profile.family === "anthropic") {
    base = base.replace(/\/v1$/, "");
    url.pathname = `${base}/v1/${path === "chat" ? "messages" : "models"}`;
  } else {
    url.pathname = `${base}/${path === "chat" ? "chat/completions" : "models"}`;
  }
  return { url, method: path === "chat" ? "POST" : "GET" };
}

export function familyHeaders(family: Family, key: string | null, o: { browser: boolean }): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json, text/event-stream" };
  if (family === "openai-compat") {
    if (key !== null) headers["authorization"] = `Bearer ${key}`;
    return headers;
  }
  if (key !== null) headers["x-api-key"] = key;
  headers["anthropic-version"] = ANTHROPIC_VERSION;
  if (o.browser) headers["anthropic-dangerous-direct-browser-access"] = "true";
  return headers;
}
