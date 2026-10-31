import { utf8Length } from "../../core/canonical.ts";

export type PackProfile = "compact" | "standard" | "extended";

export const BUDGETS: Record<PackProfile, number> = { compact: 8_000, standard: 24_000, extended: 64_000 };

const BYTES_PER_TOKEN = 3.5;
const SAFETY_MARGIN = 1.15;
const SMALL_CONTEXT = 16_000;
const LARGE_CONTEXT = 128_000;

/** Pack text has no tokenizer behind it, so this is a conservative estimate; `correction` is the running ratio of real to estimated input tokens. */
export function estimateTokens(text: string, correction: number): number {
  return Math.ceil(Math.ceil(utf8Length(text) / BYTES_PER_TOKEN) * SAFETY_MARGIN * correction);
}

/** The person's preference, held back by what the model can take: 16k or less is always compact, extended needs 128k. */
export function chooseProfile(model: { contextTokens: number }, pref?: PackProfile): PackProfile {
  if (model.contextTokens <= SMALL_CONTEXT) return "compact";
  if (pref === "extended") return model.contextTokens >= LARGE_CONTEXT ? "extended" : "standard";
  return pref ?? "standard";
}

export class PackTooLarge extends Error {
  constructor(
    readonly tokensEst: number,
    readonly budget: number,
  ) {
    super(`the context pack needs about ${tokensEst} tokens and the budget is ${budget}`);
    this.name = "PackTooLarge";
  }
}
