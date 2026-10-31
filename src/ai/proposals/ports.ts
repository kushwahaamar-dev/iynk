import type { Op, OpEnvelope, Project, Role } from "../../project/generated/types.ts";
import type { ApplyResult } from "../../project/session.ts";
import type { ProposalRecord } from "./types.ts";

export interface RuleFinding {
  ruleId: string;
  severity: "error" | "warning" | "note";
  targets: string[];
  text: string;
}

/** Over the project session. `ai` may not import the session's owners, so the wiring passes this in. */
export interface ProjectPort {
  snapshot(): { state: Project; revision: number };
  /** `complete` is false when the retained tail does not reach back to `base`. */
  opsSince(base: number): { complete: boolean; ops: OpEnvelope[] };
  commit(batch: {
    id: string;
    ops: Op[];
    author: { actor: string; kind: "ai"; proposal: string; model: string };
    label: string;
  }): { ok: true; revision: number } | Extract<ApplyResult, { ok: false }>;
  /** Reverts the last committed batch as one step. */
  undo(): { ok: boolean };
  role(): Role;
  actor(): string;
}

/** Rules, compile, tests and runs live in `sim` and `sim-host`; the studio wiring answers for them. */
export interface CheckPort {
  rules(state: Project): Promise<RuleFinding[]>;
  compile(state: Project, sourceIds: string[]): Promise<{ ok: boolean; messages: string[] } | { skipped: string }>;
  tests(
    state: Project,
    ids: string[] | "visible",
  ): Promise<{ id: string; visible: boolean; result: "pass" | "fail" | "not-run" }[]>;
  run(state: Project, limit: { simMs: number; wallMs: number }): Promise<{ ms: number; limited: boolean }>;
}

export interface ProposalStore {
  put(record: ProposalRecord): Promise<void>;
  get(projectId: string, id: string): Promise<ProposalRecord | undefined>;
  list(projectId: string): Promise<ProposalRecord[]>;
  remove(projectId: string, id: string): Promise<void>;
  sweep(projectId: string, now: number, retention: "session" | "project" | "forever"): Promise<number>;
}

type HintLevel = 0 | 1 | 2 | 3;

export interface HintPort {
  sealedItems(): { faultId: string; hintLevel: HintLevel; revealed: boolean }[];
  hintLevel(faultId: string): HintLevel;
  requestHint(faultId: string, level: 1 | 2 | 3): { ok: boolean; level: HintLevel };
  showCause(faultId: string): { ok: boolean };
  /** The project with every unrevealed sealed item removed from view. */
  redact(state: Project): Project;
}

export interface BuddyPort {
  list(): { alias: string; id: string }[];
  setDraft(text: string): void;
  canShareLink(): boolean;
}

export interface ClockPort {
  now(): number;
}

export interface LogPort {
  record(row: { kind: string; proposal?: string; data: Record<string, string | number | boolean> }): void;
}
