import type { Fault, Project, Text } from "../../project/generated/types.ts";

const FAULT_PREFIX = "flt_";
const BENCH_KEY = "x-iynk-bench";

/** The part of `ext["x-iynk-bench"]` the studio reads. */
export type BenchExtView = {
  defaultMode: string;
  concept: boolean;
  tasks: string[];
  faultText: Record<string, { title: Text; symptom: Text; explanation: Text; fix: Text }>;
};

export type BenchFault = { id: string; kind: Fault["kind"]; figure: unknown; enabled: boolean };

export const faultIdOf = (contentId: string): string => `${FAULT_PREFIX}${contentId}`;

const contentIdOf = (fault: Fault): string => fault.id.slice(FAULT_PREFIX.length);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const isText = (v: unknown): v is Text => typeof v === "string" || isRecord(v);

const isFaultText = (v: unknown): boolean =>
  isRecord(v) && ["title", "symptom", "explanation", "fix"].every((key) => isText(v[key]));

export function isLegacyFault(fault: Fault): boolean {
  const params: Record<string, unknown> = fault.params ?? {};
  return params.legacy === true && fault.id.startsWith(FAULT_PREFIX);
}

export function benchExt(project: Project): BenchExtView | null {
  const ext: unknown = (project.ext as Record<string, unknown> | undefined)?.[BENCH_KEY];
  if (!isRecord(ext)) return null;
  const { defaultMode, concept, tasks, faultText } = ext;
  if (typeof defaultMode !== "string" || typeof concept !== "boolean") return null;
  if (!Array.isArray(tasks) || !tasks.every((t) => typeof t === "string")) return null;
  if (!isRecord(faultText) || !Object.values(faultText).every(isFaultText)) return null;
  return { defaultMode, concept, tasks, faultText: faultText as BenchExtView["faultText"] };
}

export function benchFaults(project: Project): BenchFault[] {
  return project.simulation.faults.filter(isLegacyFault).map((fault) => ({
    id: contentIdOf(fault),
    kind: fault.kind,
    figure: (fault.params as Record<string, unknown> | undefined)?.figure,
    enabled: fault.enabled,
  }));
}

export const activeFaultIds = (project: Project): string[] =>
  benchFaults(project)
    .filter((fault) => fault.enabled)
    .map((fault) => fault.id);

export const isConceptBench = (project: Project): boolean => benchExt(project)?.concept === true;
