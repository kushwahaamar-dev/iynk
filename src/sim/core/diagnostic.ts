import type { PinRef } from "../../project/generated/types.ts";

/** SIMULATION A.2 `Diagnostic`; named apart from the `Diagnostic` of `src/core/result.ts`. */
export interface SimDiagnostic {
  id: string;
  severity: "error" | "warning" | "note";
  ref: { part?: string; pin?: PinRef; net?: string; file?: string; line?: number; column?: number };
  text_key: string;
  args?: Record<string, string | number>;
  hint_key?: string;
}

export type SolveDiagnostic = SimDiagnostic;

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function simDiag(
  id: string,
  severity: SimDiagnostic["severity"],
  ref: SimDiagnostic["ref"],
  args?: SimDiagnostic["args"],
): SimDiagnostic {
  if (id.length > 64 || !KEBAB.test(id)) throw new RangeError(`diagnostic id must be kebab-case and at most 64 characters: ${id}`);
  return args ? { id, severity, ref, text_key: `diag.${id}`, args } : { id, severity, ref, text_key: `diag.${id}` };
}
