// Bench prose: every TextKey a bench uses, resolved on the server into one flat dictionary that the
// client receives as props (primer rule 11). Code templates translate through {{t:key}} tokens.

import type { CodeTemplate, RoboticsContent } from "@/content/schema";

const TOKEN = /\{\{t:([\w.-]+)\}\}/g;

export type BenchTexts = Record<string, string>;

/** Replaces {{t:key}} with translated text; other tokens stay as they are. */
export function renderCode(source: string, texts: BenchTexts): string {
  return source.replace(TOKEN, (whole, key: string) => texts[key] ?? whole);
}

function codeKeys(source: string): string[] {
  return [...source.matchAll(TOKEN)].map((match) => match[1]);
}

const templateKeys = (code: CodeTemplate) => codeKeys(code.source);

/** Every text key the bench page shows, in a stable order without duplicates. */
export function benchTextKeys(bench: RoboticsContent): string[] {
  const keys: string[] = [bench.title, bench.sub, bench.hint, bench.overview, bench.power.label, bench.power.ok];
  for (const part of bench.figure.parts) keys.push(part.name, part.what);
  for (const mode of bench.modes) keys.push(mode.title, ...templateKeys(mode.code));
  for (const step of bench.steps) {
    keys.push(step.title, step.body);
    if (step.refusal) keys.push(step.refusal);
  }
  for (const fault of bench.faults) keys.push(fault.title, fault.symptom, fault.explanation, fault.fix);
  for (const field of bench.status) keys.push(field.label);
  for (const supply of bench.current.supplies) keys.push(supply.label);
  for (const load of bench.current.loads) keys.push(load.label);
  for (const task of bench.tasks) {
    keys.push(task.title, task.brief, ...task.hints, ...templateKeys(task.starter), ...codeKeys(task.solution));
    for (const check of task.checks) keys.push(check.label);
    for (const input of task.world.inputs) keys.push(input.label);
  }
  for (const quiz of bench.quizzes) {
    for (const question of quiz.questions) keys.push(question.q, ...question.options, question.why);
  }
  return [...new Set(keys)];
}

function leaf(tree: unknown, key: string): string | undefined {
  let node: unknown = tree;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** Looks every key up in the item's content JSON; `missing` lists the keys it lacks. */
export function resolveBenchTexts(bench: RoboticsContent, tree: unknown): { texts: BenchTexts; missing: string[] } {
  const texts: BenchTexts = {};
  const missing: string[] = [];
  for (const key of benchTextKeys(bench)) {
    const value = leaf(tree, key);
    if (value === undefined) missing.push(key);
    else texts[key] = value;
  }
  return { texts, missing };
}
