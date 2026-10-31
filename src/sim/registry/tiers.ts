import { TIERS } from "./types.ts";
import type { FidelityEntry, Tier } from "./types.ts";

export const tierRank = (tier: Tier): number => TIERS.indexOf(tier);

export const BANNED_WORDS: readonly string[] = ["validated", "accurate", "exact", "realistic physics", "hardware-accurate", "safe to build"];

const BANNED_PATTERNS = BANNED_WORDS.map((word) => ({ word, pattern: new RegExp(`(?<![\\w-])${word.replace(/[-\s]/g, "[-\\s]")}(?![\\w-])`, "i") }));

/** The banned words found in `text`. */
export function findBanned(text: string): string[] {
  return BANNED_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ word }) => word);
}

export const ID_MODEL = /^([a-z0-9-]+:)?[a-z0-9.-]+@[0-9]+$/;
export const ID_ENGINE = /^engine:[a-z0-9-]+@[0-9]+\.[0-9]+\.[0-9]+$/;

/** Model ids carry the major only; engine ids carry the full semver (RC-54). */
const idPattern = (kind: FidelityEntry["kind"]): RegExp => (kind === "engine" ? ID_ENGINE : ID_MODEL);

const passes = (e: FidelityEntry, kind: FidelityEntry["validation"][number]["kind"]) => e.validation.filter((v) => v.kind === kind && v.status === "pass");

/** A comparison run against an oracle, an analytic result or the interpreter needs a repeatable model; a bench run does not show that. */
const isDeterministic = (e: FidelityEntry): boolean => e.performance.length > 0 || e.validation.some((v) => v.kind !== "bench");

function supportsT1(e: FidelityEntry): boolean {
  return e.unsupported.length > 0 && e.validation.length > 0 && isDeterministic(e);
}

/** Every number is traced to a source; an assumption is allowed only when the entry owns up to it in `knownFailureCases`. */
function supportsT2(e: FidelityEntry): boolean {
  const traced = e.parameterSources.some((p) => p.type === "datasheet" || p.type === "fit" || p.type === "measurement");
  const owned = e.parameterSources.every((p) => p.type !== "assumption" || e.knownFailureCases.some((text) => text.includes(p.param)));
  const reference = [...passes(e, "oracle"), ...passes(e, "analytic")].some((v) => v.date !== "" && v.engineVersion !== "");
  return traced && owned && reference;
}

function supportsT3(e: FidelityEntry): boolean {
  return e.kind === "runtime" && passes(e, "differential").length > 0;
}

/** The highest tier the evidence in the entry supports (SIMULATION 16.3 rule 1). */
export function allowedTier(e: FidelityEntry): Tier {
  if (supportsT3(e)) return "T3";
  if (supportsT2(e)) return "T2";
  return supportsT1(e) ? "T1" : "T0";
}

/** The "checked on a real board" mark. It is never a tier. */
export const CHECKED_ON_REAL_BOARD = (e: FidelityEntry): boolean => passes(e, "bench").length > 0 && e.errorMetrics.length > 0;

/** `false` outside a range that names the quantity, `null` when the entry has no range for it. */
export function inRange(e: FidelityEntry, quantity: string, value: number): boolean | null {
  const ranges = e.operatingRange.filter((r) => r.quantity === quantity);
  if (ranges.length === 0) return null;
  return ranges.some((r) => value >= r.min && value <= r.max);
}

function bannedTexts(e: FidelityEntry): string[] {
  return [e.title, ...[...e.implements, ...e.mocked, ...e.unsupported].map((p) => p.text), ...e.knownFailureCases];
}

/** Problems with one entry; empty means it can be shown. */
export function checkEntry(e: FidelityEntry): string[] {
  const problems: string[] = [];
  if (!idPattern(e.kind).test(e.id)) problems.push(`${e.id}: id does not match ${idPattern(e.kind)}`);
  const allowed = allowedTier(e);
  if (tierRank(e.tier) > tierRank(allowed)) problems.push(`${e.id}: asserts ${e.tier} but the evidence supports ${allowed}`);
  for (const text of bannedTexts(e)) {
    for (const word of findBanned(text)) problems.push(`${e.id}: banned word "${word}" in "${text}"`);
  }
  return problems;
}
