/** A success or a failure, so callers branch on `ok` instead of catching. */
export type Result<T, E = Failure> = { ok: true; value: T } | { ok: false; error: E };

/** The default error shape: a stable code, a human message and an optional JSON Pointer. */
export interface Failure {
  code: string;
  message: string;
  path?: string;
}

export type Severity = "error" | "warning";

/** A validation finding (PDM 9.1). `path` is a JSON Pointer into the document. */
export interface Diagnostic {
  code: string;
  severity: Severity;
  path: string;
  message: string;
  hint?: string;
}

/** Wraps a value in a success result. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Wraps an error in a failure result. */
export const fail = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Builds a diagnostic; `hint` is left off the object when absent. */
export function diag(code: string, severity: Severity, path: string, message: string, hint?: string): Diagnostic {
  return hint === undefined ? { code, severity, path, message } : { code, severity, path, message, hint };
}
