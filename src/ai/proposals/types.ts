import type { Op, Proposal } from "../../project/generated/types.ts";
import type { ApplyResult } from "../../project/session.ts";
import type { DiffLine } from "../diff.ts";
import type { Mode } from "../modes.ts";
import type { RuleFinding } from "./ports.ts";

/** R0 cosmetic, R1 additive, R2 removes or cascades, R3 never proposed. */
export type RiskClass = 0 | 1 | 2 | 3;
export type OpGroup = "core" | "board" | "mech" | "sim" | "meta";
export type ProposalState = Proposal["status"];
export type PipelineCode =
  | "bad_args"
  | "too_many_ops"
  | "too_large"
  | "malformed"
  | "forbidden_op"
  | "mode_blocked"
  | "permission"
  | "tainted"
  | "sealed_item"
  | "dependency_cycle";
/** The closed set of reasons an apply is refused. */
export type RejectCode = Extract<ApplyResult, { ok: false }>["reject"];
export type ProposalKind = "fix" | "scaffold" | "explore";
export type Tier = "T0" | "T1" | "T2" | "T3" | "none";

export interface Step {
  id: string;
  label: string;
  ops: Op[];
  dependsOn?: string[];
}

export interface ProposeOpsArgs {
  title: string;
  kind: ProposalKind;
  rationale: string;
  steps: Step[];
  expects?: { tests?: string[]; rules?: boolean };
}

export interface StageReject {
  stage: "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
  stepId?: string;
  /** Counts within the flattened steps. */
  opIndex?: number;
  code: PipelineCode | RejectCode;
  message: string;
  /** Up to 5 valid ids for an unknown reference. */
  nearest?: string[];
}

/** 1-based lines, in base coordinates. */
export interface SourceSpan {
  sourceId: string;
  fromLine: number;
  toLine: number;
}

export interface TaintInfo {
  classes: ("P" | "X")[];
  sources: string[];
}

export interface PartLine {
  id: string;
  refdes?: string;
  label: string;
  definition?: string;
  tier?: Tier;
}

export interface DiffSummary {
  parts: { added: PartLine[]; removed: PartLine[]; changed: PartLine[] };
  nets: { id: string; name?: string; added: string[]; removed: string[] }[];
  wires: { added: number; removed: number };
  sources: { id: string; path: string; added: number; removed: number; lines: DiffLine[] }[];
  tests: { added: string[]; removed: string[]; changed: string[] };
  faults: { added: string[]; removed: string[]; changed: string[] };
  params: { id: string; from?: unknown; to?: unknown }[];
  cascade: { components: number; wires: number; pins: number; sources: number };
}

type TestState = "pass" | "fail" | "not-run";

export interface DryRunReport {
  atRevision: number;
  ok: boolean;
  rejects: StageReject[];
  diff: DiffSummary;
  /** sha256 of the canonical diff the person is shown. */
  diffHash: string;
  rules?: { added: RuleFinding[]; resolved: RuleFinding[] };
  compile?: { ok: boolean; messages: string[] } | { skipped: string };
  tests?: { id: string; visible: boolean; before: TestState; after: TestState }[];
  run?: { ms: number; limited: boolean };
  /** A new error: compile error, error-level rule, or a test that passed and now fails. */
  failing: boolean;
  tiers: { componentId: string; tier: Tier }[];
}

export interface ProposalRecord {
  proposal: Proposal;
  projectId: string;
  state: ProposalState;
  stepMeta: Record<string, { risk: Exclude<RiskClass, 3>; confirmed: boolean }>;
  threadId: string;
  mode: Mode;
  provider: string;
  model: string;
  /** `peer` only through ingestProposal. */
  origin: "model" | "peer";
  readSet: { id: string; rev: number }[];
  /** Ids the ops create, change or remove. */
  touched: string[];
  sourceSpans: SourceSpan[];
  /** Text of each edited source at base, null when over 512 KiB (then any later edit is an overlap). */
  baseSources: Record<string, string> | null;
  taint: TaintInfo;
  dryRun?: DryRunReport;
  retries: 0 | 1 | 2;
  createdAt: number;
  decidedAt?: number;
  decision?: { accepted: string[]; rejected: string[]; reason?: "stale" | "person"; by: string };
}
