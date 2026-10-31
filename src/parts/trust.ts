import type { Diagnostic } from "../core/result.ts";
import type { Descriptor } from "./descriptor.ts";
import type { Model } from "./generated/types.ts";

export type TrustLevel = "core" | "local" | "imported";

/** Mechanical facts about a part, never a judgement (COMPONENT_SCHEMA 9.10). */
export interface QualityLabels {
  schemaValid: boolean;
  hasTests: boolean;
  testsRun: "not-run" | "pass" | "fail";
  hasReferenceTest: boolean;
  code: boolean;
  permissions: readonly string[];
  thirdPartyContent: boolean;
}

export type CodeGate = { state: "disabled"; reason: "no-sandbox-yet" };

const REFERENCE_KINDS: ReadonlySet<string> = new Set(["datasheet-point", "ngspice-comparison", "bench-measurement"]);

type ExtensionModel = Extract<Model, { kind: "extension" }>;

const extensionModels = (def: Descriptor): ExtensionModel[] =>
  def.behaviour.layers.flatMap((layer) => (layer.model.kind === "extension" ? [layer.model] : []));

export function hasCode(def: Descriptor): boolean {
  return extensionModels(def).length > 0;
}

/** The only word on whether a code part may run. Nothing turns it on until the sandbox has a verdict (RS-15). */
export function codeGate(def: Descriptor): CodeGate | null {
  return hasCode(def) ? { state: "disabled", reason: "no-sandbox-yet" } : null;
}

export function qualityLabels(def: Descriptor, issues: readonly Diagnostic[]): QualityLabels {
  const tests = def.simulation.tests ?? [];
  const permissions = [...new Set(extensionModels(def).flatMap((model) => model.permissions))].sort();
  return {
    schemaValid: issues.every((issue) => issue.severity !== "error"),
    hasTests: tests.length > 0,
    testsRun: "not-run",
    hasReferenceTest: tests.some((test) => REFERENCE_KINDS.has(test.kind)),
    code: hasCode(def),
    permissions,
    thirdPartyContent: def.provenance.third_party_content === true,
  };
}
