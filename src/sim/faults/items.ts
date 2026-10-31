import { fail, ok, type Result } from "../../core/result.ts";
import { applyBatch } from "../../project/apply/index.ts";
import type { Fault, Project } from "../../project/generated/types.ts";
import { validateValue } from "../../project/validate.ts";
import { isCauseId } from "./cause-ids.ts";
import { causeMeta, type CauseFamily } from "./causes.ts";
import type { CauseId, HintLadder } from "./types.ts";
import type { DiagnoseSpec } from "./seal.ts";

/** A diagnose item as stored: the circuit to start from, the one fault, and what the learner is asked. */
export interface FaultItem {
  id: string;
  /** Id of the converter project that shows the circuit. */
  base: string;
  fault: Fault;
  spec: DiagnoseSpec;
  ladder: HintLadder;
  family: CauseFamily;
  source: { catalogueId?: string; board?: string };
}

export type MaterialiseError = {
  code: "base-mismatch" | "invalid";
  message: string;
};

export type LintId = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";

export interface LintIssue {
  lint: LintId;
  itemId: string;
  message: string;
}

export interface LintContext {
  baseDoc: Project;
  causeTitle(id: CauseId): string;
  /** The text of the correct repair, which the last hint must not give away. */
  fixText: string;
}

/** Things a learner can see or hear without opening the circuit up. A symptom needs at least one. */
export const OBSERVABLE_NOUNS: readonly string[] = [
  "LED",
  "serial",
  "reading",
  "heat",
  "smell",
  "reset",
  "motor",
  "sound",
  "display",
  "nothing",
];

const GUIDED_KEY = "x-iynk-guided";
const MIN_TITLE_WORD = 5;
export const SHARED_RUN = 4;
const LADDER_LEVELS = 3;
const SYSTEM_AUTHOR = { actor: "iynk", kind: "system" } as const;

/** Long words that show up in cause names without giving the cause away. */
const TITLE_STOP_WORDS: ReadonlySet<string> = new Set([
  "wrong",
  "other",
  "there",
  "their",
  "which",
  "where",
  "about",
  "after",
  "before",
  "between",
  "without",
  "through",
]);

export const wordsOf = (text: string): string[] =>
  text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

const escapeRegExp = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const mentions = (text: string, name: string): boolean =>
  new RegExp(
    `(^|[^a-z0-9])${escapeRegExp(name.toLowerCase())}($|[^a-z0-9])`,
  ).test(text.toLowerCase());

export function materialiseItem(
  item: FaultItem,
  baseDoc: Project,
): Result<Project, MaterialiseError> {
  if (baseDoc.id !== item.base) {
    return fail({
      code: "base-mismatch",
      message: `the item is built on ${item.base} but the document is ${baseDoc.id}`,
    });
  }
  const applied = applyBatch(baseDoc, [{ k: "fault.set", fault: item.fault }], {
    author: SYSTEM_AUTHOR,
    at: baseDoc.meta.updatedAt,
  });
  if (!applied.ok)
    return fail({ code: "invalid", message: applied.reject.message });

  const guided = (applied.state.ext as Record<string, object> | undefined)?.[
    GUIDED_KEY
  ];
  const doc: Project = {
    ...applied.state,
    ext: {
      ...applied.state.ext,
      [GUIDED_KEY]: { ...guided, diagnose: item.spec, ladder: item.ladder },
    },
  };
  const report = validateValue(doc);
  if (!report.ok) {
    const first = report.diagnostics.find((d) => d.severity === "error");
    return fail({
      code: "invalid",
      message: first
        ? `${first.code}: ${first.message}`
        : "the document does not validate",
    });
  }
  return ok(doc);
}

/** The refdes, label and part name of the component the fault sits on. */
function faultedPartNames(item: FaultItem, baseDoc: Project): string[] {
  const { component, pin } = item.fault.target;
  const id = component ?? pin?.split("/")[0];
  const part = baseDoc.components.find((c) => c.id === id);
  if (part === undefined) return [];
  const partName = part.definition.ref.split(".").at(-1) ?? "";
  return [
    part.refdes,
    ...(typeof part.label === "string" ? [part.label] : []),
    partName,
  ].filter((n) => n.length > 0);
}

function lintSymptom(
  item: FaultItem,
  ctx: LintContext,
  issue: (lint: LintId, message: string) => void,
): void {
  const text = item.spec.symptom.text;

  const named = faultedPartNames(item, ctx.baseDoc).find((name) =>
    mentions(text, name),
  );
  if (named !== undefined)
    issue("L1", `the symptom names the faulted part "${named}"`);

  const symptomWords = new Set(wordsOf(text));
  const restated = wordsOf(ctx.causeTitle(item.spec.answer.cause_id)).find(
    (w) =>
      w.length >= MIN_TITLE_WORD &&
      !TITLE_STOP_WORDS.has(w) &&
      symptomWords.has(w),
  );
  if (restated !== undefined)
    issue("L2", `the symptom uses "${restated}" from the name of the cause`);

  if (
    !OBSERVABLE_NOUNS.some((noun) =>
      new RegExp(`\\b${escapeRegExp(noun)}s?\\b`, "i").test(text),
    )
  ) {
    issue("L3", "the symptom holds no observable noun");
  }
}

function lintOptions(
  item: FaultItem,
  issue: (lint: LintId, message: string) => void,
): void {
  const { answer, options } = item.spec;
  const distractors = options.filter((o) => o.cause_id !== answer.cause_id);

  const unknown = distractors.find((o) => !isCauseId(o.cause_id));
  if (unknown !== undefined)
    issue("L4", `${unknown.cause_id} is not a registry cause id`);

  const confusable = new Set<string>(
    causeMeta(answer.cause_id)?.confusableWith ?? [],
  );
  if (distractors.filter((o) => confusable.has(o.cause_id)).length < 2) {
    issue(
      "L4",
      "fewer than two distractors come from the causes it is confused with",
    );
  }
  const stray = distractors.find(
    (o) =>
      !confusable.has(o.cause_id) &&
      causeMeta(o.cause_id)?.family !== item.family,
  );
  if (stray !== undefined)
    issue("L4", `${stray.cause_id} is not in the ${item.family} family`);

  const right = options.filter((o) => o.cause_id === answer.cause_id).length;
  if (right !== 1)
    issue("L5", `${right} options equal the answer; there must be exactly one`);
}

function lintLadder(
  item: FaultItem,
  fixText: string,
  issue: (lint: LintId, message: string) => void,
): void {
  const levels = item.ladder.levels;
  if (levels.length !== LADDER_LEVELS) {
    issue(
      "L7",
      `the ladder has ${levels.length} levels; it needs ${LADDER_LEVELS}`,
    );
    return;
  }
  const fix = wordsOf(fixText);
  const runs = new Set<string>();
  for (let i = 0; i + SHARED_RUN <= fix.length; i++)
    runs.add(fix.slice(i, i + SHARED_RUN).join(" "));
  const last = wordsOf(levels[LADDER_LEVELS - 1].text);
  for (let i = 0; i + SHARED_RUN <= last.length; i++) {
    const run = last.slice(i, i + SHARED_RUN).join(" ");
    if (runs.has(run)) {
      issue("L7", `level 3 repeats the fix: "${run}"`);
      return;
    }
  }
}

/** EDUCATION 6.8, rules L1 to L7. An empty list means the item passes. */
export function lintItem(item: FaultItem, ctx: LintContext): LintIssue[] {
  const issues: LintIssue[] = [];
  const issue = (lint: LintId, message: string) =>
    issues.push({ lint, itemId: item.id, message });

  lintSymptom(item, ctx, issue);
  lintOptions(item, issue);
  if (
    item.spec.review.status === "reviewed" &&
    causeMeta(item.spec.answer.cause_id)?.modelled !== true
  ) {
    issue("L6", "a reviewed item needs a cause the simulator models");
  }
  lintLadder(item, ctx.fixText, issue);
  return issues;
}
