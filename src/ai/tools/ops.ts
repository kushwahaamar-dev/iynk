import { z } from "zod";
import { utf8Length } from "../../core/canonical.ts";
import type { Op } from "../../project/generated/types.ts";
import type { ToolSpec } from "../adapters/types.ts";
import type { TrustClass } from "../context/fences.ts";
import type { Mode } from "../modes.ts";
import { netLines } from "../proposals/diffsummary.ts";
import { dryRun } from "../proposals/dryrun.ts";
import type { GateResult } from "../proposals/guard.ts";
import { handleProposeOps, offerFor, staticContext, toolResultFor } from "../proposals/pipeline.ts";
import type { PipelineDeps, PipelineOutcome, PipelineTurn } from "../proposals/pipeline.ts";
import { checkStatic, proposeOpsTool } from "../proposals/propose.ts";
import { OP_GROUPS } from "../proposals/risk.ts";
import type { DryRunReport, OpGroup, ProposeOpsArgs } from "../proposals/types.ts";
import { draftToolDef } from "./buddy-draft.ts";
import type { ToolDef, ToolResult } from "./registry.ts";

const TRY_CALLS_PER_MESSAGE = 3;
const TRY_WALL_MS = 2_000;
const MAX_TRY_OPS = 40;
const MAX_LISTED = 20;
const GROUPS = Object.keys(OP_GROUPS) as OpGroup[];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const tryOpsArgs = z.strictObject({
  ops: z
    .array(z.custom<Op>(isObject, { message: "an op is a JSON object with a k" }))
    .min(1)
    .max(MAX_TRY_OPS)
    .describe(`Ops to try, applied in order as one batch. At most ${MAX_TRY_OPS}.`),
  tests: z.array(z.string()).max(20).optional().describe("Test ids to run after the change."),
});

export const requestOpsGroupArgs = z.strictObject({
  group: z.enum(GROUPS as [OpGroup, ...OpGroup[]]).describe("The op group to load for the next calls."),
});

/** What `runTurn` asks of the proposal side. It stays optional there: without it a turn behaves as before. */
export interface ProposalHook {
  gate(): GateResult;
  loaded(): ReadonlySet<OpGroup>;
  tainted(): boolean;
  ladderBlock(): string;
  run(call: { id: string; name: string; argsJson: string }, ctx: { mode: Mode; round: number }): Promise<ToolResult> | null;
}

export interface OpsSession {
  deps: PipelineDeps;
  /** The message in progress; `run` overrides the mode with the mode of the call. */
  turn(): PipelineTurn;
  loaded: Set<OpGroup>;
  ladderBlock(): string;
  onOutcome?(outcome: PipelineOutcome): void;
}

const fail = (code: Extract<ToolResult, { ok: false }>["code"], message: string): ToolResult => ({ ok: false, code, message });

function json(value: unknown, taint: TrustClass[]): ToolResult {
  const text = JSON.stringify(value);
  return { ok: true, text, bytes: utf8Length(text), taint, truncated: false };
}

const issue = (error: z.ZodError): string => `${error.issues[0].path.join(".") || "arguments"}: ${error.issues[0].message}`;

function hiddenLine(tests: NonNullable<DryRunReport["tests"]>): string | undefined {
  const hidden = tests.filter((test) => !test.visible);
  if (hidden.length === 0) return undefined;
  const passing = hidden.filter((test) => test.after === "pass").length;
  const failing = hidden.filter((test) => test.after === "fail").length;
  return `${hidden.length} hidden checks: ${passing} pass, ${failing} fail`;
}

function summary(report: DryRunReport): Record<string, unknown> {
  const tests = report.tests ?? [];
  return {
    ok: true,
    failing: report.failing,
    netLines: netLines(report.diff).slice(0, MAX_LISTED),
    ...(report.rules
      ? {
          rules: {
            added: report.rules.added.slice(0, MAX_LISTED).map((f) => `${f.severity} ${f.ruleId}: ${f.text}`),
            resolved: report.rules.resolved.length,
          },
        }
      : {}),
    ...(report.compile ? { compile: report.compile } : {}),
    tests: tests.filter((test) => test.visible).slice(0, MAX_LISTED).map(({ id, before, after }) => ({ id, before, after })),
    ...(hiddenLine(tests) ? { hidden: hiddenLine(tests) } : {}),
  };
}

/** Dry-runs ops for the model without making a proposal. `budget` counts the calls left in this message. */
export async function handleTryOps(
  raw: unknown,
  turn: PipelineTurn,
  deps: PipelineDeps,
  budget: { calls: number; wallMs: number },
): Promise<ToolResult> {
  if (budget.calls <= 0) return fail("rate", `At most ${TRY_CALLS_PER_MESSAGE} try_ops calls per message.`);
  budget.calls -= 1;
  const parsed = tryOpsArgs.safeParse(raw);
  if (!parsed.success) return fail("bad_args", issue(parsed.error));
  if (!offerFor(turn, deps).offer) return fail("not_allowed_in_mode", `try_ops is not available in ${turn.mode} mode now.`);

  const args: ProposeOpsArgs = {
    title: "try",
    kind: "explore",
    rationale: "try",
    steps: [{ id: "s1", label: "try", ops: parsed.data.ops }],
    ...(parsed.data.tests ? { expects: { tests: parsed.data.tests } } : {}),
  };
  const checked = checkStatic(args, staticContext(turn, deps));
  if (!checked.ok) {
    return json({ ok: false, rejects: checked.rejects.map(({ stage, code, message }) => ({ stage, code, message })) }, ["P"]);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), budget.wallMs);
  });
  const report = await Promise.race([dryRun(args, deps.dry), timeout]).finally(() => clearTimeout(timer));
  if (report === null) return fail("timeout", `The dry run took longer than ${budget.wallMs} ms.`);
  if (!report.ok) {
    return json({ ok: false, rejects: report.rejects.map(({ stage, code, message }) => ({ stage, code, message })) }, ["P"]);
  }
  return json(summary(report), ["P"]);
}

/** One request per group in a message. The core group is always loaded. */
export function handleRequestOpsGroup(raw: unknown, loaded: Set<OpGroup>): ToolResult {
  const parsed = requestOpsGroupArgs.safeParse(raw);
  if (!parsed.success) return fail("bad_args", issue(parsed.error));
  const { group } = parsed.data;
  if (loaded.has(group)) return fail("rate", `The ${group} group is already loaded in this message.`);
  loaded.add(group);
  return json({ ok: true, group, kinds: OP_GROUPS[group] }, []);
}

const parseJson = (argsJson: string): { ok: true; value: unknown } | { ok: false } => {
  if (argsJson.trim() === "") return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(argsJson) };
  } catch {
    return { ok: false };
  }
};

export function createProposalHook(session: OpsSession): ProposalHook {
  const budget = { calls: TRY_CALLS_PER_MESSAGE, wallMs: TRY_WALL_MS };
  const turnFor = (mode?: Mode): PipelineTurn => ({ ...session.turn(), ...(mode ? { mode } : {}), loaded: session.loaded });

  async function propose(raw: unknown, mode: Mode): Promise<ToolResult> {
    const outcome = await handleProposeOps(raw, turnFor(mode), session.deps);
    session.onOutcome?.(outcome);
    return json(toolResultFor(outcome), ["P"]);
  }

  return {
    gate: () => offerFor(turnFor(), session.deps),
    loaded: () => session.loaded,
    tainted: () => session.turn().taint.classes.includes("X"),
    ladderBlock: session.ladderBlock,
    run(call, ctx) {
      if (call.name !== "propose_ops" && call.name !== "try_ops" && call.name !== "request_ops_group") return null;
      const args = parseJson(call.argsJson);
      if (!args.ok) return Promise.resolve(fail("bad_args", "The arguments are not valid JSON."));
      if (call.name === "propose_ops") return propose(args.value, ctx.mode);
      if (call.name === "try_ops") return handleTryOps(args.value, turnFor(ctx.mode), session.deps, budget);
      return Promise.resolve(handleRequestOpsGroup(args.value, session.loaded));
    },
  };
}

const ALL_MODES: readonly Mode[] = ["socratic", "beginner", "direct", "debugging", "advanced"];

export const OPS_TOOL_DEFS: ToolDef[] = [
  draftToolDef(),
  {
    name: "propose_ops",
    cls: "propose",
    taint: ["P"],
    description: proposeOpsTool(new Set(["core"])).description,
    modes: ALL_MODES,
  },
  {
    name: "request_ops_group",
    cls: "propose",
    taint: [],
    description: "Load another group of op kinds (board, mech, sim or meta) so propose_ops and try_ops accept them. Once per group per message.",
    modes: ALL_MODES,
  },
  {
    name: "try_ops",
    cls: "compute",
    taint: ["P"],
    description:
      "Dry-run up to 40 ops without proposing them: returns why they are refused, or the net changes, new rule findings, compile result and tests. At most 3 per message. Nothing is shown to the person.",
    modes: ALL_MODES,
  },
];

/** Specs of the proposal tools among `names`, with the op kinds of the loaded groups. */
export function opsToolSpecs(names: ReadonlySet<string>, loaded: ReadonlySet<OpGroup>): ToolSpec[] {
  const specs: ToolSpec[] = [];
  if (names.has("propose_ops")) specs.push(proposeOpsTool(loaded));
  if (names.has("try_ops")) {
    specs.push({
      name: "try_ops",
      description: OPS_TOOL_DEFS.find((tool) => tool.name === "try_ops")!.description,
      parameters: z.toJSONSchema(tryOpsArgs, { io: "input", unrepresentable: "any" }) as Record<string, unknown>,
    });
  }
  if (names.has("request_ops_group")) {
    specs.push({
      name: "request_ops_group",
      description: OPS_TOOL_DEFS.find((tool) => tool.name === "request_ops_group")!.description,
      parameters: z.toJSONSchema(requestOpsGroupArgs, { io: "input" }) as Record<string, unknown>,
    });
  }
  return specs;
}
