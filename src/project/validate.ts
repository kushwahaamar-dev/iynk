import { canonicalize, utf8Length } from "../core/canonical.ts";
import { diag } from "../core/result.ts";
import type { Diagnostic } from "../core/result.ts";
import { parseStrict } from "../core/strict-json.ts";
import { validateProject } from "./generated/validate.mjs";
import type { SchemaError } from "./generated/validate.mjs";
import type { Project } from "./generated/types.ts";
import { canonicalBytes } from "./hash.ts";
import { hygieneDiagnostics, limitDiagnostics, MAX_STORED_DIAGNOSTICS } from "./limits.ts";
import { CURRENT_SCHEMA_VERSION, parseSchemaVersion } from "./migrate.ts";
import { validateRoboticsRefs } from "./apply/domain-robotics.ts";
import { toFileText } from "./normalize.ts";
import { checkAll } from "./semantic.ts";

const FIRST_SHOWN = 20;

/** The outcome of the passes. `doc` is set when the document passed the schema, even if other passes failed. */
export interface ValidationReport {
  ok: boolean;
  errors: number;
  warnings: number;
  /** At most 500, in the order the passes found them. `errors` and `warnings` count every finding. */
  diagnostics: Diagnostic[];
  /** What the recovery view shows: errors first, then warnings. */
  first20: Diagnostic[];
  doc?: Project;
}

interface Findings {
  diagnostics: Diagnostic[];
  doc?: Project;
}

const BRANCH = /^#\/oneOf\/(\d+)\//;
const KIND_MISMATCH = /^#\/oneOf\/(\d+)\/properties\/k\/const$/;

function inside(container: string, path: string): boolean {
  return path === container || path.startsWith(container + "/");
}

/**
 * Ajv tries every branch of a `oneOf`, so one bad op would print an error for each of the 64 `Op` branches. The
 * branch the instance's `k` names is the one with no `k` error. Keep the errors of that branch; when no branch
 * matches, keep one `k` error.
 */
function dropOtherBranches(errors: readonly SchemaError[]): SchemaError[] {
  const excluded = new Map<string, Set<number>>();
  for (const error of errors) {
    const mismatch = KIND_MISMATCH.exec(error.schemaPath);
    if (!mismatch || !error.instancePath.endsWith("/k")) continue;
    const container = error.instancePath.slice(0, -2);
    const branches = excluded.get(container) ?? new Set<number>();
    branches.add(Number(mismatch[1]));
    excluded.set(container, branches);
  }
  if (excluded.size === 0) return [...errors];

  const containerOf = (path: string): string | undefined =>
    [...excluded.keys()].filter((c) => inside(c, path)).sort((a, b) => b.length - a.length)[0];
  const matched = new Set<string>();
  for (const error of errors) {
    const container = containerOf(error.instancePath);
    const branch = BRANCH.exec(error.schemaPath);
    if (container !== undefined && branch && !excluded.get(container)?.has(Number(branch[1]))) matched.add(container);
  }

  const kept: SchemaError[] = [];
  const reported = new Set<string>();
  for (const error of errors) {
    const container = containerOf(error.instancePath);
    if (container === undefined) {
      kept.push(error);
      continue;
    }
    if (error.keyword === "oneOf" && error.schemaPath === "#/oneOf" && error.instancePath === container) continue;
    const branch = BRANCH.exec(error.schemaPath);
    if (!branch) {
      kept.push(error);
    } else if (matched.has(container)) {
      if (!excluded.get(container)?.has(Number(branch[1]))) kept.push(error);
    } else if (KIND_MISMATCH.test(error.schemaPath) && !reported.has(container)) {
      reported.add(container);
      kept.push({ ...error, message: "is not the kind of any known variant" });
    }
  }
  return kept;
}

/** V2 diagnostics from Ajv errors: code `V2-<keyword>`, path the JSON Pointer of the instance, repeats dropped. */
export function schemaDiagnostics(errors: readonly SchemaError[]): Diagnostic[] {
  const seen = new Set<string>();
  const found: Diagnostic[] = [];
  for (const error of dropOtherBranches(errors)) {
    const extra = typeof error.params.additionalProperty === "string" ? `: ${error.params.additionalProperty}` : "";
    const entry = diag(`V2-${error.keyword}`, "error", error.instancePath, `${error.message ?? "is not valid"}${extra}`);
    const key = `${entry.code}|${entry.path}|${entry.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(entry);
  }
  return found;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function isNewer(value: unknown): value is { schemaVersion: string } {
  const found = isRecord(value) ? parseSchemaVersion(value.schemaVersion) : null;
  const current = parseSchemaVersion(CURRENT_SCHEMA_VERSION);
  return found !== null && current !== null && (found.major - current.major || found.minor - current.minor) > 0;
}

/** Canonical size of a document, or of the raw value when it failed the schema; null when it has no canonical form. */
function sizeOf(value: unknown, valid: boolean): number | null {
  try {
    return valid ? canonicalBytes(value as Project) : utf8Length(canonicalize(value));
  } catch {
    return null;
  }
}

/** V3 diagnostics for the robotics references. Only a document that passed the schema has a shape to read. */
function roboticsDiagnostics(doc: Project): Diagnostic[] {
  return validateRoboticsRefs(doc).map((e) =>
    diag(`V3-ROBOTICS-${e.code.toUpperCase()}`, "error", "/" + e.path.replaceAll(".", "/"), e.message),
  );
}

function check(value: unknown): Findings {
  if (isNewer(value)) {
    const message = `made by a newer iynk, version ${value.schemaVersion}`;
    return { diagnostics: [diag("V0-NEWER", "error", "/schemaVersion", message, "Open it in a newer iynk")] };
  }
  const valid = validateProject(value);
  const diagnostics = valid ? [] : schemaDiagnostics(validateProject.errors ?? []);
  diagnostics.push(...checkAll(value as Project));
  if (valid) diagnostics.push(...roboticsDiagnostics(value));
  const bytes = sizeOf(value, valid);
  diagnostics.push(...limitDiagnostics(value as Project, bytes ?? 0), ...hygieneDiagnostics(value));
  return valid ? { diagnostics, doc: value } : { diagnostics };
}

function assemble({ diagnostics, doc }: Findings): ValidationReport {
  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");
  const stored = diagnostics.slice(0, MAX_STORED_DIAGNOSTICS);
  const report: ValidationReport = {
    ok: errors.length === 0,
    errors: errors.length,
    warnings: warnings.length,
    diagnostics: stored,
    first20: [...errors, ...warnings].slice(0, FIRST_SHOWN),
  };
  if (doc) report.doc = doc;
  return report;
}

/**
 * Runs V0 (newer version), V2 (schema), V3 (references and invariants), V4 (limits) and V5 (hygiene) on a value of unknown origin. Never throws:
 * V3, V4 and V5 run on a document that failed the schema too, so the recovery view gets as many problems as it can.
 */
export function validateValue(value: unknown): ValidationReport {
  return assemble(check(value));
}

/**
 * `parseStrict`, then `validateValue`, then V1: a document that is valid but not byte-equal to what the writer
 * would produce gets the warning `V1-EDITED-OUTSIDE` and still loads.
 */
export function validateText(text: string): ValidationReport {
  const parsed = parseStrict(text);
  if (!parsed.ok) {
    const { code, message, path } = parsed.error;
    return assemble({ diagnostics: [diag("V2-PARSE", "error", path ?? "", `${code}: ${message}`)] });
  }
  const findings = check(parsed.value);
  if (findings.doc && toFileText(findings.doc) !== text) {
    findings.diagnostics.push(
      diag("V1-EDITED-OUTSIDE", "warning", "", "This file was edited outside iynk", "It loads as it is and is rewritten on the next save"),
    );
  }
  return assemble(findings);
}

/** True when the loader must show the recovery view instead of the document. */
export const isFatal = (report: ValidationReport): boolean => !report.ok;
