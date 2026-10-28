// The one place that says what a pasted key or token may look like. It imports
// nothing, so the browser store and the server's key check share it.

export const SECRET_MIN = 8;
export const SECRET_MAX = 512;

export type SecretProblem = "empty" | "too_long" | "bad_chars";

export type ParsedSecret = { ok: true; value: string } | { ok: false; reason: SecretProblem };

export function parseSecret(raw: string): ParsedSecret {
  const value = raw.trim();
  if (value.length < SECRET_MIN) return { ok: false, reason: "empty" };
  if (value.length > SECRET_MAX) return { ok: false, reason: "too_long" };
  if (!/^[\x21-\x7E]+$/.test(value)) return { ok: false, reason: "bad_chars" };
  return { ok: true, value };
}
