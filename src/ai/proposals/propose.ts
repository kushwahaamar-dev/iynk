import { z } from "zod";
import { utf8Length } from "../../core/canonical.ts";
import { newId } from "../../core/ids.ts";
import type { RandomSource } from "../../core/ids.ts";
import type { Op } from "../../project/generated/types.ts";
import type { ToolSpec } from "../adapters/types.ts";
import { hasPlaceholder } from "../context/redact.ts";
import type { Mode } from "../modes.ts";
import type { ProjectPort } from "./ports.ts";
import { OP_GROUPS, classifyOp, createdIds, groupOf } from "./risk.ts";
import type { RiskCtx } from "./risk.ts";
import type { OpGroup, ProposalRecord, ProposeOpsArgs, StageReject } from "./types.ts";

const MAX_STEPS = 12;
const MAX_OPS_PER_STEP = 40;
const MAX_OPS = 120;
const MAX_STEP_BYTES = 32_768;
const MAX_INSERT_BYTES = 8_000;
const MAX_LISTED = 20;

const STEP_ID = /^[a-z][a-z0-9_-]{0,15}$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const opSchema = z.custom<Op>(isObject, { message: "an op is a JSON object with a k" });

const stepSchema = z.strictObject({
  id: z.string().regex(STEP_ID).describe("Lower-case id, up to 16 characters, e.g. s1."),
  label: z.string().min(1).max(80).describe("What this step does, in a few words."),
  ops: z.array(opSchema).min(1).describe("Ops of this step, applied in order as one batch. At most 40."),
  dependsOn: z.array(z.string()).max(11).optional().describe("Ids of steps that must be accepted with this one."),
});

export const proposeOpsArgs: z.ZodType<ProposeOpsArgs> = z.strictObject({
  title: z.string().min(1).max(80),
  kind: z.enum(["fix", "scaffold", "explore"]),
  rationale: z.string().min(1).max(600).describe("Plain text for the person: why this change. No Markdown."),
  steps: z.array(stepSchema).min(1).describe("At most 12 steps, 120 ops in all."),
  expects: z
    .strictObject({
      tests: z.array(z.string()).max(20).optional().describe("Test ids that should pass after the change."),
      rules: z.boolean().optional().describe("True when the rules check should come back clean."),
    })
    .optional(),
});

const OPS_HINT = "One op of the project vocabulary. read_tool_doc with topic ops lists the fields of each kind.";

export function proposeOpsTool(loaded: ReadonlySet<OpGroup>): ToolSpec & { name: "propose_ops" } {
  const kinds = [...loaded].flatMap((group) => OP_GROUPS[group]);
  const parameters = z.toJSONSchema(proposeOpsArgs, {
    io: "input",
    unrepresentable: "any",
    override({ zodSchema, jsonSchema }) {
      if (zodSchema === opSchema) {
        Object.assign(jsonSchema, {
          type: "object",
          properties: { k: { enum: kinds } },
          required: ["k"],
          description: OPS_HINT,
        });
      }
    },
  });
  return {
    name: "propose_ops",
    description:
      "Propose a change to the project as steps of ops. The person sees a card with the result and accepts or rejects it; nothing changes before that. Ops outside the loaded groups need request_ops_group first.",
    parameters,
  };
}

export interface StaticCtx {
  mode: Mode;
  loaded: ReadonlySet<OpGroup>;
  role: ReturnType<ProjectPort["role"]>;
  sealedOpen: boolean;
  /** The result of the mode gate (ProposeGate): false when the ladder or a click still blocks proposals. */
  offered: boolean;
  validateOp(op: unknown): { ok: true } | { ok: false; message: string };
  secretShape(s: string): boolean;
  risk: RiskCtx;
}

export type StaticResult =
  | { ok: true; args: ProposeOpsArgs; stepRisk: Record<string, 0 | 1 | 2> }
  | { ok: false; rejects: StageReject[] };

const fail = (rejects: StageReject[]): StaticResult => {
  if (rejects.length <= MAX_LISTED) return { ok: false, rejects };
  const last = rejects[MAX_LISTED - 1]!;
  const more: StageReject = { stage: last.stage, code: last.code, message: `and ${rejects.length - MAX_LISTED} more` };
  return { ok: false, rejects: [...rejects.slice(0, MAX_LISTED), more] };
};

function issueMessage(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join(".") || "arguments"}: ${issue.message}`)
    .join("; ");
}

function hasCycle(steps: ProposeOpsArgs["steps"]): string | undefined {
  const deps = new Map(steps.map((step) => [step.id, step.dependsOn ?? []]));
  const state = new Map<string, "open" | "done">();
  const visit = (id: string): boolean => {
    if (state.get(id) === "done") return false;
    if (state.get(id) === "open") return true;
    state.set(id, "open");
    if (deps.get(id)!.some(visit)) return true;
    state.set(id, "done");
    return false;
  };
  return steps.find((step) => visit(step.id))?.id;
}

function checkLimits(args: ProposeOpsArgs): StageReject[] {
  const { steps } = args;
  if (steps.length > MAX_STEPS) {
    return [{ stage: "P1", code: "too_many_ops", message: `${steps.length} steps; the limit is ${MAX_STEPS}` }];
  }
  const long = steps.find((step) => step.ops.length > MAX_OPS_PER_STEP);
  if (long) {
    const message = `step ${long.id} has ${long.ops.length} ops; the limit is ${MAX_OPS_PER_STEP}`;
    return [{ stage: "P1", stepId: long.id, code: "too_many_ops", message }];
  }
  const total = steps.reduce((sum, step) => sum + step.ops.length, 0);
  if (total > MAX_OPS) return [{ stage: "P1", code: "too_many_ops", message: `${total} ops; the limit is ${MAX_OPS}` }];
  const bytes = utf8Length(JSON.stringify(steps));
  if (bytes > MAX_STEP_BYTES) {
    return [{ stage: "P1", code: "too_large", message: `the steps are ${bytes} bytes; the limit is ${MAX_STEP_BYTES}` }];
  }
  const rejects: StageReject[] = [];
  let index = 0;
  for (const step of steps) {
    for (const op of step.ops) {
      if (op.k === "source.edit" && utf8Length(String(op.ins)) > MAX_INSERT_BYTES) {
        rejects.push({
          stage: "P1",
          stepId: step.id,
          opIndex: index,
          code: "too_large",
          message: `source.edit inserts more than ${MAX_INSERT_BYTES} bytes; split it into smaller edits`,
        });
      }
      index++;
    }
  }
  return rejects;
}

function checkSteps(args: ProposeOpsArgs): StageReject[] {
  const ids = new Set<string>();
  for (const { id } of args.steps) {
    if (ids.has(id)) return [{ stage: "P1", stepId: id, code: "bad_args", message: `step id ${id} is used twice` }];
    ids.add(id);
  }
  for (const step of args.steps) {
    const unknown = step.dependsOn?.find((dep) => !ids.has(dep));
    if (unknown !== undefined) {
      return [{ stage: "P1", stepId: step.id, code: "bad_args", message: `step ${step.id} depends on unknown step ${unknown}` }];
    }
  }
  const cyclic = hasCycle(args.steps);
  return cyclic === undefined
    ? []
    : [{ stage: "P1", stepId: cyclic, code: "dependency_cycle", message: `step ${cyclic} depends on itself, directly or through other steps` }];
}

function gate(ctx: StaticCtx): StageReject[] {
  const rejects: StageReject[] = [];
  if (ctx.sealedOpen) {
    rejects.push({ stage: "P3", code: "sealed_item", message: "a diagnose item is still sealed; do not propose changes" });
  }
  if (!ctx.offered) {
    rejects.push({ stage: "P3", code: "mode_blocked", message: `proposals are not open in ${ctx.mode} mode yet; explain instead` });
  }
  if (ctx.role !== "owner" && ctx.role !== "editor") {
    rejects.push({ stage: "P4", code: "permission", message: `a ${ctx.role} cannot change this project` });
  }
  return rejects;
}

function leaks(value: unknown, ctx: StaticCtx): boolean {
  if (typeof value === "string") return hasPlaceholder(value) || ctx.secretShape(value);
  if (Array.isArray(value)) return value.some((item) => leaks(item, ctx));
  if (isObject(value)) return Object.values(value).some((item) => leaks(item, ctx));
  return false;
}

/** P1 to P5 on the raw tool arguments. Nothing here reads or changes the document. */
export function checkStatic(raw: unknown, ctx: StaticCtx): StaticResult {
  const parsed = proposeOpsArgs.safeParse(raw);
  if (!parsed.success) return fail([{ stage: "P1", code: "bad_args", message: issueMessage(parsed.error) }]);
  const args = parsed.data;
  const p1 = [...checkLimits(args), ...checkSteps(args)];
  if (p1.length > 0) return fail(p1);
  const blocked = gate(ctx);
  if (blocked.length > 0) return fail(blocked);

  const rejects: StageReject[] = [];
  const stepRisk: Record<string, 0 | 1 | 2> = {};
  const added = new Set<string>();
  let index = 0;
  for (const step of args.steps) {
    let worst: 0 | 1 | 2 = 0;
    for (const op of step.ops) {
      const at = { stepId: step.id, opIndex: index++ };
      const valid = ctx.validateOp(op);
      if (!valid.ok) {
        rejects.push({ stage: "P2", ...at, code: "malformed", message: valid.message });
        continue;
      }
      const risk = classifyOp(op, { ...ctx.risk, addedInProposal: new Set([...ctx.risk.addedInProposal, ...added]) });
      if (risk === 3) {
        rejects.push({ stage: "P3", ...at, code: "forbidden_op", message: `${op.k} with these fields is never proposed; leave it to the person` });
        continue;
      }
      const group = groupOf(op.k);
      if (group !== null && !ctx.loaded.has(group)) {
        rejects.push({ stage: "P3", ...at, code: "mode_blocked", message: `${op.k} is in the ${group} group; load the group with request_ops_group` });
        continue;
      }
      if (leaks(op, ctx)) {
        rejects.push({ stage: "P5", ...at, code: "forbidden_op", message: `${op.k} contains a secret or a redaction placeholder; remove it` });
        continue;
      }
      worst = Math.max(worst, risk) as 0 | 1 | 2;
      for (const id of createdIds(op)) added.add(id);
    }
    stepRisk[step.id] = worst;
  }
  return rejects.length > 0 ? fail(rejects) : { ok: true, args, stepRisk };
}

/** `prp_` and 12 lower-case base32 characters. */
export function newProposalId(rand: RandomSource): string {
  return newId("prp", rand).slice(0, "prp_".length + 12);
}

const STATES: readonly string[] = ["draft", "invalid", "open", "accepted", "partial", "rejected", "stale", "superseded", "expired"];

const isText = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isList = (value: unknown): value is unknown[] => Array.isArray(value);

/** Shape check of a stored row. `null` when the row is not a record or its proposal fails the generated validator. */
export function parseRecord(body: unknown, validateProposal: (p: unknown) => boolean): ProposalRecord | null {
  if (!isObject(body) || !isObject(body.proposal) || !validateProposal(body.proposal)) return null;
  const sound =
    isText(body.projectId) &&
    isText(body.state) &&
    STATES.includes(body.state) &&
    body.state === body.proposal.status &&
    isObject(body.stepMeta) &&
    isText(body.threadId) &&
    isText(body.mode) &&
    isText(body.provider) &&
    isText(body.model) &&
    (body.origin === "model" || body.origin === "peer") &&
    isList(body.readSet) &&
    isList(body.touched) &&
    isList(body.sourceSpans) &&
    (body.baseSources === null || isObject(body.baseSources)) &&
    isObject(body.taint) &&
    (body.retries === 0 || body.retries === 1 || body.retries === 2) &&
    isNumber(body.createdAt);
  return sound ? (body as unknown as ProposalRecord) : null;
}
