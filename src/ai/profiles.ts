import type { Family } from "../protocol/ai-relay.ts";
import type { AdapterCaps } from "./adapters/types.ts";
import type { Quirks } from "./adapters/openai.ts";
import type { Price } from "./prices.ts";

export type ProfileModel = {
  id: string;
  tier?: "fast" | "standard" | "strong";
  contextTokens: number;
  maxOutputTokens: number;
  price?: Price;
};

export type ProviderProfile = {
  id: string;
  label: string;
  family: Family;
  baseUrl: string;
  /** Names the stored key. The profile never holds the key itself. */
  keyId: string | null;
  via: "direct" | "relay" | "auto";
  models: ProfileModel[];
  quirks?: Quirks;
  caps?: AdapterCaps;
  lastConformance?: { at: number; passed: string[]; failed: string[] };
};

const MAX_BASE_URL_LENGTH = 300;
const MAX_MODELS = 50;
const MAX_LABEL_LENGTH = 60;
const MAX_TEXT_LENGTH = 200;
const LOCAL_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost"]);
const ID_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
const ID_PATTERN = /^prf_[0-9a-hjkmnp-tv-z]{10}$/;

export function baseUrlProblem(url: string): string | null {
  if (url.length === 0) return "The address is empty.";
  if (url.length > MAX_BASE_URL_LENGTH) return `The address is longer than ${MAX_BASE_URL_LENGTH} characters.`;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "The address is not a full web address.";
  }
  if (parsed.username !== "" || parsed.password !== "") return "The address must not hold a user name or password.";
  if (parsed.search !== "" || parsed.hash !== "" || url.includes("?") || url.includes("#")) return "The address must not have a query or a fragment.";
  if (parsed.protocol === "https:") return null;
  if (parsed.protocol === "http:" && LOCAL_HOSTS.has(parsed.hostname)) return null;
  return "The address must start with https. Plain http is allowed only for a server on this computer.";
}

export function newProfileId(random: () => number): string {
  let id = "prf_";
  for (let i = 0; i < 10; i++) id += ID_ALPHABET[Math.min(31, Math.floor(random() * 32))];
  return id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function text(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function priceOf(raw: unknown): Price | null {
  if (!isRecord(raw)) return null;
  const { in: input, cacheRead, cacheWrite, out, asOf, source } = raw;
  if (!isRate(input) || !isRate(out)) return null;
  if (cacheRead !== null && !isRate(cacheRead)) return null;
  if (cacheWrite !== null && !isRate(cacheWrite)) return null;
  if (!text(asOf, MAX_TEXT_LENGTH) || !text(source, MAX_TEXT_LENGTH)) return null;
  return { in: input, cacheRead, cacheWrite, out, asOf, source };
}

function modelOf(raw: unknown, at: string, problems: string[]): ProfileModel | null {
  if (!isRecord(raw)) {
    problems.push(`${at} is not an object.`);
    return null;
  }
  const before = problems.length;
  if (!text(raw["id"], MAX_TEXT_LENGTH)) problems.push(`${at} needs an id.`);
  if (raw["tier"] !== undefined && !oneOf(raw["tier"], ["fast", "standard", "strong"])) problems.push(`${at} has an unknown tier.`);
  if (!isCount(raw["contextTokens"])) problems.push(`${at} needs a context size above zero.`);
  if (!isCount(raw["maxOutputTokens"])) problems.push(`${at} needs an output limit above zero.`);
  let price: Price | undefined;
  if (raw["price"] !== undefined) {
    price = priceOf(raw["price"]) ?? undefined;
    if (!price) problems.push(`${at} has a price that is not valid. Prices cannot be negative.`);
  }
  if (problems.length > before) return null;
  const model: ProfileModel = {
    id: raw["id"] as string,
    contextTokens: raw["contextTokens"] as number,
    maxOutputTokens: raw["maxOutputTokens"] as number,
  };
  if (raw["tier"] !== undefined) model.tier = raw["tier"] as NonNullable<ProfileModel["tier"]>;
  if (price) model.price = price;
  return model;
}

function quirksOf(raw: unknown): Quirks | null {
  if (!isRecord(raw)) return null;
  if (!oneOf(raw["maxTokensField"], ["max_tokens", "max_completion_tokens"]) || typeof raw["streamUsage"] !== "boolean") return null;
  return { maxTokensField: raw["maxTokensField"], streamUsage: raw["streamUsage"] };
}

function capsOf(raw: unknown): AdapterCaps | null {
  if (!isRecord(raw)) return null;
  const { tools, parallelTools, usageInStream, promptCache, structuredOutput, contextTokens, maxOutputTokens, browserDirect, privacy } = raw;
  if (!oneOf(tools, ["native", "json-text", "none"]) || !oneOf(promptCache, ["explicit", "implicit", "none"])) return null;
  if (!oneOf(browserDirect, ["yes", "no", "unknown"]) || !oneOf(privacy, ["local", "cloud"])) return null;
  if (typeof parallelTools !== "boolean" || typeof usageInStream !== "boolean" || typeof structuredOutput !== "boolean") return null;
  if (!isCount(contextTokens) || !isCount(maxOutputTokens)) return null;
  return { tools, parallelTools, usageInStream, promptCache, structuredOutput, contextTokens, maxOutputTokens, browserDirect, privacy };
}

function conformanceOf(raw: unknown): ProviderProfile["lastConformance"] | null {
  if (!isRecord(raw) || typeof raw["at"] !== "number" || !Number.isFinite(raw["at"])) return null;
  const names = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === "string");
  if (!names(raw["passed"]) || !names(raw["failed"])) return null;
  return { at: raw["at"], passed: raw["passed"] as string[], failed: raw["failed"] as string[] };
}

export function validateProfile(p: unknown): { ok: true; value: ProviderProfile } | { ok: false; problems: string[] } {
  if (!isRecord(p)) return { ok: false, problems: ["The profile is not an object."] };
  const problems: string[] = [];
  if (typeof p["id"] !== "string" || !ID_PATTERN.test(p["id"])) problems.push("The id is not a profile id.");
  if (!text(p["label"], MAX_LABEL_LENGTH)) problems.push(`The label needs 1 to ${MAX_LABEL_LENGTH} characters.`);
  if (!oneOf(p["family"], ["anthropic", "openai-compat"])) problems.push("The family is not supported.");
  if (typeof p["baseUrl"] !== "string") problems.push("The address is missing.");
  else {
    const problem = baseUrlProblem(p["baseUrl"]);
    if (problem) problems.push(problem);
  }
  if (p["keyId"] !== null && !text(p["keyId"], MAX_TEXT_LENGTH)) problems.push("The key id must be text or null.");
  if (!oneOf(p["via"], ["direct", "relay", "auto"])) problems.push("The route must be direct, relay or auto.");

  const models: ProfileModel[] = [];
  if (!Array.isArray(p["models"])) problems.push("The model list is missing.");
  else if (p["models"].length > MAX_MODELS) problems.push(`The model list has more than ${MAX_MODELS} models.`);
  else {
    p["models"].forEach((raw, i) => {
      const model = modelOf(raw, `Model ${i + 1}`, problems);
      if (model) models.push(model);
    });
  }

  const quirks = p["quirks"] === undefined ? undefined : quirksOf(p["quirks"]);
  if (quirks === null) problems.push("The quirks are not valid.");
  const caps = p["caps"] === undefined ? undefined : capsOf(p["caps"]);
  if (caps === null) problems.push("The capabilities are not valid.");
  const lastConformance = p["lastConformance"] === undefined ? undefined : conformanceOf(p["lastConformance"]);
  if (lastConformance === null) problems.push("The last test result is not valid.");

  if (problems.length > 0) return { ok: false, problems };
  const value: ProviderProfile = {
    id: p["id"] as string,
    label: p["label"] as string,
    family: p["family"] as Family,
    baseUrl: p["baseUrl"] as string,
    keyId: p["keyId"] as string | null,
    via: p["via"] as ProviderProfile["via"],
    models,
  };
  if (quirks) value.quirks = quirks;
  if (caps) value.caps = caps;
  if (lastConformance) value.lastConformance = lastConformance;
  return { ok: true, value };
}
