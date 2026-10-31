import type { Family } from "../protocol/ai-relay.ts";

export type AiErrorCode =
  | "not_configured"
  | "no_key"
  | "auth"
  | "bad_model"
  | "context_too_long"
  | "quota"
  | "capped"
  | "network"
  | "relay_denied"
  | "upstream_busy"
  | "upstream_timeout"
  | "upstream_failed"
  | "filtered"
  | "aborted"
  | "internal";

export type AiErrorDetail = { status?: number; retryAfterMs?: number; which?: string };

export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
    readonly detail?: AiErrorDetail,
  ) {
    super(message);
    this.name = "AiError";
  }
}

const MESSAGES: Record<AiErrorCode, string> = {
  not_configured: "No AI provider is set up.",
  no_key: "This provider needs a key.",
  auth: "The provider refused the key.",
  bad_model: "The provider does not know this model.",
  context_too_long: "The conversation is too long for this model.",
  quota: "The provider says the account is out of credit.",
  capped: "The spending cap was reached.",
  network: "The provider could not be reached.",
  relay_denied: "The relay refused the call.",
  upstream_busy: "The provider is busy. Try again in a moment.",
  upstream_timeout: "The provider took too long to answer.",
  upstream_failed: "The provider failed to answer.",
  filtered: "The provider filtered the answer.",
  aborted: "The call was stopped.",
  internal: "Something went wrong inside the app.",
};

export function aiError(code: AiErrorCode, detail?: AiErrorDetail): AiError {
  return new AiError(code, MESSAGES[code], detail);
}

const CONTEXT_WORDS = /context[_ ]length|maximum context|prompt is too long|too many tokens|input is too long|exceeds the (?:model|context)|request too large/i;
const MODEL_WORDS = /model/i;
const MODEL_MISSING_WORDS = /not[_ ]found|does not exist|not supported|invalid|unknown|no such/i;
const BILLING_WORDS = /insufficient[_ ]quota|billing|credit|exceeded your current quota|payment/i;

/** The body is only tested for keywords. Nothing from it reaches the message. */
export function mapUpstream(status: number, bodyText: string, family: Family): AiError {
  const detail = { status };
  if (status === 401 || status === 403) return aiError("auth", detail);
  if (status === 404) return aiError("bad_model", detail);
  if (status === 400 || status === 413 || status === 422) {
    if (CONTEXT_WORDS.test(bodyText)) return aiError("context_too_long", detail);
    if (status !== 413 && MODEL_WORDS.test(bodyText) && MODEL_MISSING_WORDS.test(bodyText)) return aiError("bad_model", detail);
    return aiError("upstream_failed", detail);
  }
  if (status === 429) return aiError(BILLING_WORDS.test(bodyText) ? "quota" : "upstream_busy", detail);
  if (status === 408 || status === 504) return aiError("upstream_timeout", detail);
  if (status === 529 && family === "anthropic") return aiError("upstream_busy", detail);
  return aiError("upstream_failed", detail);
}

/** Turns anything a fetch or a stream can throw into an AiError. */
export function toAiError(error: unknown, signal?: AbortSignal): AiError {
  if (error instanceof AiError) return error;
  if (signal?.aborted) return aiError("aborted");
  if (error instanceof Error && error.name === "AbortError") return aiError("aborted");
  if (error instanceof Error && error.name === "TimeoutError") return aiError("upstream_timeout");
  if (error instanceof TypeError) return aiError("network");
  return aiError("upstream_failed");
}
