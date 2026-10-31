import type { Project, Text, WireColor } from '../generated/types.ts';

export const PLAN_KEY = 'x-iynk-guided';
export const PLAN_VERSION = 1;
export const WIRES_KEY = 'x-iynk-wireables';

export const GUIDED_MODES = ['guided', 'diagnose', 'challenge'] as const;
export type GuidedMode = (typeof GUIDED_MODES)[number];

export const RUNGS = ['lesson', 'demo', 'diagnose', 'partial', 'open', 'capstone'] as const;
export type Rung = (typeof RUNGS)[number];

export const COMPLETE_GATES = ['checks', 'edit', 'quiz', 'goal', 'steps', 'diagnosis'] as const;
export type CompleteGate = (typeof COMPLETE_GATES)[number];

export const GATE_KINDS = ['manual', 'check', 'edit', 'param', 'net', 'part', 'quiz', 'fault', 'legacy-state'] as const;
export type GateKind = (typeof GATE_KINDS)[number];

export type PinAddr = { c: string; p: string };

export type StepGate = { step: number } & (
  | { kind: 'manual' }
  | { kind: 'check'; test: string; check: string }
  | { kind: 'edit'; source: string }
  | { kind: 'param'; parameter: string }
  | { kind: 'net'; connected: [PinAddr, PinAddr] }
  | { kind: 'net'; apart: [PinAddr, PinAddr] }
  | { kind: 'part'; definition: string; min: number }
  | { kind: 'quiz'; quiz: string }
  | { kind: 'fault'; state: 'injected' | 'cleared' }
  | { kind: 'legacy-state'; cond: Record<string, string | number | boolean | null> }
);

/** `ladder` and `diagnose` pass through untouched; the diagnosis code owns them. */
export interface GuidedPlan {
  v: 1;
  mode: GuidedMode;
  rung: Rung;
  skill: string[];
  gates: StepGate[];
  complete: CompleteGate[];
  tests: string[];
  goalTest?: string;
  starterTokensSha256?: string;
  starterSubstanceHash?: string;
  ladder?: unknown;
  diagnose?: unknown;
  partial?: { given: string[] };
  next?: string[];
}

export interface WireableItem {
  part: string;
  supplyVolts: number;
  caution?: Text;
  note: Text;
  connections: { from: string; to: string; color: WireColor }[];
}

export interface WireablesExt {
  v: 1;
  items: WireableItem[];
}

export interface PlanIssue {
  rule: 'schema' | 'G1' | 'G2' | 'G3';
  severity: 'error' | 'warning';
  path: string;
  message: string;
}

export type TemplateKind = 'lesson' | 'tour';

export interface TemplateEntry {
  id: string;
  /** LocalizedText of the project's meta.title, so the gallery loads no file. */
  title: Record<string, string>;
  board: string;
  kind: TemplateKind;
  order: number;
  level: 'intro' | 'io' | 'input' | 'analog' | 'protocol' | 'wireless' | 'project' | null;
  stepCount: number;
  language: 'arduino-cpp' | 'micropython' | 'python' | 'verilog';
  catalogue: { lab: 'board'; id: string; child: string | null };
  load(): Promise<Project>;
}

export class PlanShapeError extends Error {
  readonly key: string;
  constructor(key: string, message: string) {
    super(`${key}: ${message}`);
    this.name = 'PlanShapeError';
    this.key = key;
  }
}

function readExt(project: Project, key: string): Record<string, unknown> | null {
  const raw = (project.ext as Record<string, unknown> | undefined)?.[key];
  if (raw === undefined) return null;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new PlanShapeError(key, 'must be an object');
  const version = (raw as { v?: unknown }).v;
  if (version !== PLAN_VERSION) throw new PlanShapeError(key, `unsupported version ${JSON.stringify(version)}`);
  return raw as Record<string, unknown>;
}

/** The guided plan, or null for a project without one. Throws on a wrong version; run `validatePlan` for the rest. */
export function readPlan(project: Project): GuidedPlan | null {
  return readExt(project, PLAN_KEY) as GuidedPlan | null;
}

/** The wire-it lists, or null for a project without any. Throws on a wrong version; run `validateWireables` for the rest. */
export function readWireables(project: Project): WireablesExt | null {
  return readExt(project, WIRES_KEY) as WireablesExt | null;
}
